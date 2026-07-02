# Los primeros hechos

En la sección anterior decidimos guardar el **diario** de la empresa, no su foto. Ahora escribimos los primeros renglones de ese diario en C# — y, leyéndolos, recalculamos cómo está la empresa hoy. Esta sección la **haces tú**: te reto a escribir cada pieza y luego te muestro una forma de hacerla.

## 🎯 El Objetivo

Quieres saber el **plan actual** de "Constructora Andes" y **cuántas veces** la han reactivado. La tentación es guardar `Plan = "Premium"` y `Reactivaciones = 2` en variables. Pero eso es la **foto**: si la sobrescribes, vuelves a perder el pasado.

La pregunta de esta sección: **¿cómo recalculo el estado de hoy leyendo el diario, en vez de guardarlo?**

## Manos al teclado

Para esto solo necesitas **.NET** — ni base de datos ni librerías todavía. Crea un proyecto de consola y vacía el `Program.cs`:

```bash
dotnet new console -n Empresas.Historia
cd Empresas.Historia
dotnet new gitignore          # ignora bin/ y obj/ — sin esto, tus commits subirían binarios
```

> 💡 **Dónde queda cada cosa (y desde dónde corres los comandos).** El repo Git lo iniciaste en [El diario de una empresa](el-diario-de-una-empresa.md), en tu carpeta de trabajo; el proyecto acaba de nacer **dentro**, en `Empresas.Historia/`. De aquí en adelante corre `dotnet run` **dentro** de la carpeta del proyecto, y los `git add`/`commit`/`push` desde donde está el `.git`. El `.gitignore` que acabas de crear evita que `bin/`/`obj/` (binarios de compilación) ensucien tu bitácora.

Listo. A anotar hechos.

> 💡 **Cómo vas a organizar este `Program.cs`.** Irás acumulando todo en este archivo a lo largo del taller. Dos reglas para que siempre compile: **(1)** el **código suelto** (los `var`, los `Console.WriteLine`) va **arriba**; las **clases y `record`** (`Empresa`, los eventos) van **al final**. **(2)** Cuando una sección evolucione una clase que ya escribiste, lo verás marcado con 🔁 **reemplaza** — sustituye la versión anterior, no la dupliques.

## Escribir los hechos

El primer renglón del diario: la empresa se registró. ¿Cómo lo represento? La forma obvia sería una clase con propiedades. Pero piensa qué es un hecho: algo que **ya pasó**. Y lo que ya pasó **no se cambia**. Si dentro de un mes alguien pudiera tomar "registrada con plan Básico" y editarlo a "Premium", estaría **falsificando la historia**.

Necesitamos algo que el compilador **no nos deje mutar**. En C# eso es un `record`. Como es la primera vez que lo usamos, aquí va escrito; **créalo** al final de tu `Program.cs`:

```csharp
public record EmpresaRegistrada(string Nombre, string Plan);
public record PlanCambiado(string NuevoPlan);
public record EmpresaSuspendida(string Motivo);
public record EmpresaReactivada();
```

Un `record` nos da, sin escribir más, justo lo que un hecho necesita: es **inmutable** (prueba `evento.Plan = "otro"` y no compila — el pasado queda en piedra) y se compara **por su contenido**, no por referencia. No usamos `record` porque esté de moda: lo usamos porque un hecho **exige** esas dos cosas.

> [!NOTE]
> 🌱 **Semilla — los eventos son para siempre.** `EmpresaRegistrada` quedará escrito en el diario por años. ¿Qué pasa el día que el negocio quiera añadirle un campo `Sector`? No puedes editar el pasado. Ese problema tiene nombre y solución —*versionado de eventos / upcasting*— y lo veremos a fondo más adelante. Por ahora quédate con la idea: **un evento es un contrato inmutable con el futuro**; nómbralo y modélalo con cuidado.

> [!NOTE]
> 🌱 **Semilla — más adelante algunos eventos llevarán una marca.** Hoy son `record` pelados, y para los hechos **internos** de nuestro diario eso basta. Pero el día que un hecho deba **salir** hacia otros servicios (no solo vivir en nuestra historia), lo marcaremos con una interfaz —un `IEvent` "público"— para distinguir lo interno de lo que se publica. Lo veremos al llegar a la mensajería; por ahora, un `record` limpio.

## El orden importa: un Stream

Una suspensión antes de un registro no tendría sentido. Los hechos van **en el orden en que ocurrieron**. Escribe la historia de "Constructora Andes" (arriba, en el código suelto):

```csharp
var historia = new List<object>
{
    new EmpresaRegistrada("Constructora Andes", "Básico"),
    new PlanCambiado("Premium"),
    new EmpresaSuspendida("falta de pago"),
    new EmpresaReactivada(),
    new EmpresaSuspendida("incumplimiento de contrato"),
};
```

Esa secuencia ordenada de hechos tiene nombre: es un **Stream**. Y no es "una lista más": es la **única fuente de la verdad**. Si un hecho no está en el stream, para tu sistema **nunca pasó**.

## Revivir el pasado

¿Cómo sé cómo está la empresa **hoy**? No lo tengo guardado en ningún lado: lo **reconstruyo** leyendo el diario de principio a fin y acumulando.

> 🛠️ **Inténtalo tú.** Declara cuatro variables (`nombre`, `plan`, `suspendida`, `reactivaciones`), recorre `historia` con un `foreach`, y según el **tipo** de cada hecho actualiza la variable que toque (registrada → nombre y plan; plan cambiado → plan; suspendida → suspendida=true; reactivada → suspendida=false y +1 reactivación). Al final imprime el estado. *(Pista: `if (hecho is EmpresaRegistrada r) { … r.Nombre … }` te da el hecho ya convertido en `r`.)* Corre `dotnet run`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
string nombre = "";
string plan = "";
bool suspendida = false;
int reactivaciones = 0;

foreach (var hecho in historia)
{
    if (hecho is EmpresaRegistrada r) { nombre = r.Nombre; plan = r.Plan; }
    if (hecho is PlanCambiado p)      { plan = p.NuevoPlan; }
    if (hecho is EmpresaSuspendida)   { suspendida = true; }
    if (hecho is EmpresaReactivada)   { suspendida = false; reactivaciones++; }
}

Console.WriteLine($"{nombre}: plan {plan}, {(suspendida ? "suspendida" : "activa")}, reactivada {reactivaciones} vez/veces");
```
</details>

> 🔍 **¿Lo lograste?** Al correr deberías ver:
> ```
> Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces
> ```
> Fíjate: **ninguna** de esas respuestas estaba guardada. El plan "Premium", el estado "suspendida", el conteo… **todo salió de reproducir los hechos**. A ese proceso —leer los eventos uno por uno para reconstruir el estado— la industria lo llama **Replay** (o *rehidratar* el estado).

> [!NOTE]
> 🌱 **Semilla — esa receta tiene nombre: `evolve`.** No escribiste una función aparte: escribiste un `foreach` (el **Replay** que recién nombramos). Pero fíjate en **cada vuelta** del bucle: tomas el estado que llevas y un hecho, y produces el estado siguiente. Ese **paso** —`(estado, hecho) → nuevo estado`— es lo que en Event Sourcing se llama **`evolve`** (su gemela, `decide`, aparecerá cuando emitamos hechos). En [Refactorizando el motor](refactorizando-el-motor.md) le daremos forma de **método propio** (lo llamaremos `Aplicar`); las librerías de verdad reusan *exactamente* esta receta. Y es **pura**: cada paso depende solo del estado y el hecho que recibe —no toca base de datos, ni red, ni reloj—, así que el estado siempre se recalcula igual y se prueba sin mocks ni infraestructura.

## De variables sueltas a una clase dueña de la empresa

Quieres agrupar esas variables sueltas en un objeto `Empresa` que **se reconstruya solo** y **proteja su estado**. En concreto, quieres poder escribir esto:

```csharp
var empresa = new Empresa(historia);
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}, reactivada {empresa.Reactivaciones} vez/veces");
// Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces

// …y que esto NI SIQUIERA compile — nadie le cambia el plan desde fuera:
empresa.Plan = "Enterprise";   // ❌ error de compilación
```

> 🛠️ **Inténtalo tú.** Crea una clase `Empresa`: mete las cuatro variables como **propiedades** (de solo-lectura desde fuera: `{ get; private set; }`), y en el **constructor** recibe `IEnumerable<object> historia` y corre adentro el mismo `foreach` que acabas de escribir. Luego, arriba, **reemplaza** las variables sueltas por `var empresa = new Empresa(historia);` e imprime su estado. **Ve e inténtalo**, y luego te muestro una forma:

> [!NOTE]
> 🆕 **Idioma de C#: `{ get; private set; }`.** Una propiedad que se **lee** desde cualquier parte pero solo se **escribe** dentro de su propia clase. El `get;` es público; el `private set;` deja la asignación reservada al código de `Empresa` (su constructor, en este caso). Por eso de afuera puedes hacer `empresa.Plan`, pero `empresa.Plan = "X"` no compila. Es el equivalente a escribir un campo privado con una propiedad de solo lectura, en una sola línea — y es justo lo que protege la coherencia del agregado.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    // La empresa se reconstruye a sí misma leyendo su historia
    public Empresa(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
        {
            if (hecho is EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
            if (hecho is PlanCambiado p)      { Plan = p.NuevoPlan; }
            if (hecho is EmpresaSuspendida)   { Suspendida = true; }
            if (hecho is EmpresaReactivada)   { Suspendida = false; Reactivaciones++; }
        }
    }
}
```

Y arriba, en vez de las variables sueltas:

```csharp
var empresa = new Empresa(historia);
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}, reactivada {empresa.Reactivaciones} vez/veces");
```
</details>

> 🔍 **¿Lo lograste?** Corre `dotnet run`: la empresa se reconstruye igual (misma salida de arriba), pero ahora el estado vive **dentro** de un objeto que lo protege — y `empresa.Plan = "X"` ni siquiera compila.

Esa clase que es **dueña** de la coherencia de la empresa, y el **único punto autorizado** para tocarla, tiene un nombre en diseño de dominio: **Aggregate Root** (raíz del agregado). Nadie le cambia el plan a `Empresa` por fuera; se lo pide a `Empresa`. (La frontera del agregado se estudia en [El almacén directo](el-almacen-directo.md); por ahora, quédate con el nombre.)

> [!NOTE]
> 🌱 Mira ese `foreach` con cuatro `if (hecho is …)` dentro del constructor. Funciona hoy, pero **crecerá feo**: cada hecho nuevo es otro `if`, y el día que tengas una `Factura` además de la `Empresa`, copiarías todo este bucle. En la próxima sección lo vamos a **sentir doler** y lo evolucionaremos paso a paso — el código nos pedirá una forma mejor.

---

### El Descubrimiento

No guardaste el estado: lo **reconstruiste** a partir de los hechos. Un `record` por hecho (inmutable, el pasado en piedra), un **Stream** ordenado como fuente de la verdad, y un **Replay** que pliega esos hechos en el estado de hoy. Cada **paso** de ese pliegue —tomar el estado y un hecho para producir el siguiente, `(estado, hecho) → nuevo estado`— se llama **`evolve`**, y vive dentro de un **Aggregate Root**.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime el estado reconstruido (`plan Premium`, `reactivada 1 vez/veces`).
- [ ] Agrega `new PlanCambiado("Enterprise")` al final de `historia` y vuelve a correr: el estado refleja "Enterprise" **sin que toques el replay**.
- [ ] Toma el primer hecho con `if (historia[0] is EmpresaRegistrada r)` e intenta `r.Plan = "X"`: observa que **no compila**: el pasado no se edita.
- [ ] Explica con tus palabras por qué un hecho se modela como `record` y no como una clase mutable.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** intenta `evento.Plan = 'x'` sobre un `record`. ¿Qué dice el compilador, y por qué un hecho del pasado no debe poder cambiar?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Los primeros hechos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Un **hecho** es un `record` inmutable; una secuencia ordenada de hechos es un **Stream** (la fuente de la verdad); y recorrer ese stream aplicando cada hecho —el paso `evolve`— para recalcular el estado es el **Replay**. Reconstruir, no guardar.

---

[⬅️ Volver: El diario de una empresa](./el-diario-de-una-empresa.md)

[➡️ Siguiente: Refactorizando el motor](./refactorizando-el-motor.md)
