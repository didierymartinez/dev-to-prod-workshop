# El nombre del hecho es un contrato

Renombrar una clase es de lo más inocente que haces al programar — el IDE lo hace por ti en un clic. Con tu diario en disco, ese clic puede borrarte el pasado.

## 🎯 El Objetivo

Que renombrar una clase de evento **no** deje ilegible la historia que ya guardaste.

## 💥 El dolor: un refactor te rompe el pasado

Al llevar el diario a disco llenaste a mano el mapa de nombre → clase, y viste que **olvidar** una entrada revienta al leer. Piensas: "listo, me acuerdo de mantenerlo al día". Pero hay una forma de romperlo que "acordarse" no evita.

De dónde salió el `Tipo` que guardaste en disco: de `sobre.EventData.GetType().Name`. O sea, en cada línea quedó escrito el nombre que la clase tenía **ese día**:

```json
{"Version":2,"Tipo":"PlanCambiado","Datos":{"NuevoPlan":"Enterprise"}}
```

Ahora el negocio deja de decir "cambiar plan" y empieza a decir "actualizar plan". Renombras el `record` `PlanCambiado` a `PlanActualizado` (un clic) y, cumplidor, actualizas el mapa para que apunte al nombre nuevo. Los eventos que escribas de hoy en adelante dirán `"PlanActualizado"`. Pero las empresas que ya tenías en disco siguen diciendo `"PlanCambiado"` — el nombre viejo quedó congelado ahí el día que lo escribiste.

> 🔨 **Rómpelo tú.** No hace falta renombrar toda tu base de código para ver el peligro; míralo en un experimento chico. Simula el estado "después del renombre": una línea de diario escrita **ayer** (con el nombre viejo) y un mapa que hoy solo conoce el nombre **nuevo**.
>
> ```csharp
> var lineaDeAyer = "{\"Version\":1,\"Tipo\":\"PlanCambiado\",\"Datos\":{\"NuevoPlan\":\"Enterprise\"}}";
> var mapaDeHoy = new Dictionary<string, Type> { ["PlanActualizado"] = typeof(PlanCambiado) };
>
> var d = JsonSerializer.Deserialize<EnDisco>(lineaDeAyer)!;
> var clase = mapaDeHoy[d.Tipo];   // d.Tipo == "PlanCambiado"; el mapa ya no lo tiene
> ```
>
> ```
> 💥 KeyNotFoundException: The given key 'PlanCambiado' was not present in the dictionary.
> ```
>
> No olvidaste nada: un refactor de rutina dejó ilegible tu pasado, y ni el compilador ni "probar a ojo" te avisaron.

El problema de fondo: el disco es permanente, pero los nombres de tus clases son tuyos y los cambias cuando quieras. **El nombre que escribes en el disco es una promesa que tu código futuro tiene que cumplir** — y `GetType().Name` la ata a algo que no prometiste dejar quieto.

## 🔧 Un nombre estable, aparte del nombre de la clase

Si el daño viene de estampar el nombre de la clase, entonces **no lo estampes**: dale a cada evento un nombre **estable** que tú eliges y **nunca cambias**, separado de cómo se llame la clase. Ese mapa que sentías un estorbo es justo el lugar para fijarlo — declara "este nombre estable ↔ la clase que sea hoy". El día que renombres la clase, cambias solo el `typeof` de esa línea; el nombre estable y toda la historia guardada no se mueven.

En disco, la línea se rotula con el nombre estable, nunca con la clase:

```json
{"Version":2,"Tipo":"plan-cambiado","Datos":{"NuevoPlan":"Enterprise"}}
```

> 🔮 **Predice:** al escribir tienes el TIPO del hecho y tu mapa va nombre→clase. ¿Cómo consigues el nombre estable? ¿Qué te toca hacer con el mapa?

Al **leer** ya tienes lo que necesitas: el mapa va del nombre a la clase. Al **escribir** te falta el otro sentido — tienes el hecho (su tipo) y necesitas su nombre estable. Un `Dictionary` solo sabe buscar por su llave, y tu mapa está llaveado por el **nombre**; con el tipo en mano no puedes preguntarle directo, así que lo **recorres** buscando ese tipo.

> [!NOTE]
> 🆕 **Idioma de C#: recorrer un diccionario.** `foreach (var par in mapa)` te da sus entradas una por una; cada `par` tiene `.Key` (la llave) y `.Value` (el valor). Lo usas para recorrer el mapa hasta encontrar el tipo del hecho y devolver su nombre estable.

> 🛠️ **Inténtalo tú.** (1) Cámbiale las llaves al mapa `_tipos` (queda `_porNombre`): la llave ya no es `GetType().Name`, sino un nombre estable que tú eliges (`"plan-cambiado"` → `typeof(PlanCambiado)`). La clase **no** se renombra; solo cambia lo que usas como llave. (2) Escribe un método `NombreDe(Type)` que **recorra** `_porNombre` y devuelva el nombre estable de ese tipo. (3) En `AppendEvent`, rotula con `NombreDe(sobre.EventData.GetType())` en vez de `GetType().Name`. (4) `GetEvents` no cambia: sigue buscando la clase con `_porNombre[d.Tipo]`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EventStore
{
    // nombre ESTABLE (lo eliges tú, nunca cambia) → la clase que sea hoy
    private static readonly Dictionary<string, Type> _porNombre = new()
    {
        ["empresa-registrada"] = typeof(EmpresaRegistrada),
        ["plan-cambiado"]      = typeof(PlanCambiado),
        ["empresa-suspendida"] = typeof(EmpresaSuspendida),
        ["empresa-reactivada"] = typeof(EmpresaReactivada),
    };

    // Sentido inverso, para escribir: dado el tipo, encuentra su nombre estable.
    private static string NombreDe(Type tipo)
    {
        foreach (var par in _porNombre)          // cada 'par' tiene .Key (nombre) y .Value (tipo)
            if (par.Value == tipo) return par.Key;
        throw new InvalidOperationException($"Evento sin nombre estable: {tipo.Name}");
    }

    // _carpeta, el constructor, RutaDe y AbrirStream: sin cambios.

    public void AppendEvent(string id, EventoAlmacenado sobre)
    {
        if (sobre.Version <= GetEvents(id).Count)
            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada.");

        var enDisco = new EnDisco(sobre.Version, NombreDe(sobre.EventData.GetType()), sobre.EventData);
        File.AppendAllText(RutaDe(id), JsonSerializer.Serialize(enDisco) + Environment.NewLine);
    }

    public List<EventoAlmacenado> GetEvents(string id)
    {
        if (!File.Exists(RutaDe(id))) return new();
        var sobres = new List<EventoAlmacenado>();
        foreach (var linea in File.ReadAllLines(RutaDe(id)))
        {
            var d = JsonSerializer.Deserialize<EnDisco>(linea)!;
            var crudo = (JsonElement)d.Datos;
            var hecho = JsonSerializer.Deserialize(crudo.GetRawText(), _porNombre[d.Tipo])!;
            sobres.Add(new EventoAlmacenado(d.Version, hecho));
        }
        return sobres;
    }
}
```
</details>

## Ahora renombrar es seguro

Vuelve a escribir una empresa y abre su `.log`: el `Tipo` ya no menciona ninguna clase de C#.

```json
{"Version":1,"Tipo":"empresa-registrada","Datos":{"Nombre":"Constructora Andes","Plan":"Básico"}}
{"Version":2,"Tipo":"plan-cambiado","Datos":{"NuevoPlan":"Enterprise"}}
```

Ahora renombra `PlanCambiado` a lo que quieras (el IDE te cambia también el `case` de la `Empresa` y los `new PlanCambiado(...)`); en el mapa tocas solo el `typeof(...)` de esa línea. El nombre `"plan-cambiado"` y toda la historia guardada no se mueven, y las empresas viejas siguen rehidratando.

> **¿Y si dejo las dos llaves en el mapa** —la vieja y la nueva, ambas al tipo de hoy— y no cambio nada más? Para leer, funciona. Pero como seguirías escribiendo `GetType().Name`, **cada** renombre te obliga a acumular otra llave para siempre, y el nombre en disco va cambiando con el tiempo. El nombre estable corta eso de raíz: lo que escribes ya no depende de cómo se llame la clase.

> 🌱 Fíjate dónde vive ese mapa: dentro del `EventStore`. El almacén —que solo debería mover hechos— ahora tiene que **conocer por nombre cada evento del dominio**, y esa lista crece con cada evento nuevo. Y hay algo que el nombre estable no cubre: protege el **nombre** del evento, no su **forma**; el día que un evento gane o pierda un campo, los de disco tendrán la forma vieja. Y un tercero, heredado del diario en disco: pagar-y-reactivar escribe DOS líneas, una por hecho — dos `AppendAllText` seguidos. ¿Qué pasa si el proceso muere entre la primera y la segunda? Dolores para más adelante — el último, para la próxima sección.

---

### El Descubrimiento

Estampar `GetType().Name` en el disco ató tu historia a los nombres de tus clases — y renombrar una clase, un refactor de rutina, dejó ilegibles los eventos viejos **sin un solo aviso**. La cura fue separar dos cosas que parecían una: el **nombre con que un hecho vive en el disco** (estable, un contrato que no cambias) y el **nombre de la clase en tu código** (tuyo, lo refactorizas libre). El mapa que parecía un estorbo resultó ser el lugar donde declaras ese contrato. Lo que persistes no son solo datos: es un acuerdo con tu yo futuro.

---

## ✅ Compruébalo

- [ ] Reproduces el muro con el experimento del 🔨: una línea con el nombre viejo + un mapa con el nombre nuevo lanza `KeyNotFoundException` — **sin** que hayas olvidado nada.
- [ ] Con la cura, abres `datos/emp-7.log`: cada `Tipo` es tu nombre estable (`plan-cambiado`), no `PlanCambiado`.
- [ ] Renombras la clase del evento con el IDE (deja que actualice el `case` y el arnés) y cambias solo el `typeof` del mapa: las empresas guardadas **antes** siguen rehidratando.
- [ ] Explica, con tus palabras, por qué guardar `GetType().Name` ataba la historia al código — y por qué el compilador no te avisó del daño.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿por qué el nombre que un evento tiene en el disco no puede ser, sin más, el nombre de su clase en C#? ¿Qué se rompe, y cuándo?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El nombre del hecho es un contrato" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El nombre con que guardas un evento en el disco es un **contrato permanente**: si es el nombre de la clase (`GetType().Name`), renombrar la clase deja ilegible la historia vieja — por eso se le da a cada evento un **nombre estable**, aparte de la clase, que no cambia aunque refactorices.

---

[⬅️ Volver: El diario en disco (y lo que se queda afuera)](./el-diario-en-disco.md)

[➡️ Siguiente: Todo o nada: el diario en una base de datos real](./todo-o-nada.md)
