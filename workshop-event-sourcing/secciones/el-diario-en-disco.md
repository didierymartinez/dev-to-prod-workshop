# El diario en disco (y lo que se queda afuera)

Cerraste §9 con un motor completo. Faltaba ver qué pasa cuando lo apagas y lo vuelves a abrir.

## 🎯 El Objetivo

Que la historia de cada empresa **sobreviva a apagar y volver a prender**: que al arrancar de nuevo, rehidratar dé el mismo estado que dejaste antes de cerrar.

## 💥 El dolor: al reiniciar, el diario se esfuma

Tu `EventStore` guarda los sobres en un `Dictionary` — y un diccionario vive en **RAM**. Corres el programa, registras "Constructora Andes", le cambias el plan, la suspendes. En pantalla, todo bien. Cierras. Vuelves a correr:

```csharp
var store  = new EventStore();
var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"{empresa.Nombre}: {empresa.Plan}");   // ": "  ← vacío
```

El diario de "emp-7" **no existe**: nació y murió con el proceso anterior. Un sistema real no puede olvidar todo cada vez que se reinicia.

## 🔧 La cura obvia: escribir cada hecho en un archivo

Si el `Dictionary` se borra al cerrar, escribe los hechos donde **queden**: un archivo por empresa (`emp-7.log`). Cada vez que anotas un sobre, lo agregas como una línea; al abrir el stream, lees las líneas de vuelta. Las dos puertas de afuera del almacén (`GetEvents` / `AppendEvent`) siguen igual — lo que cambia es de dónde salen y a dónde van los hechos.

Para eso necesitas dos cosas nuevas: leer/escribir un archivo, y convertir cada sobre a **texto** (para escribirlo) y de vuelta (para leerlo).

> [!NOTE]
> 🆕 **Idioma de C#: leer y escribir un archivo de texto.**
> - `Path.Combine(carpeta, "emp-7.log")` arma la ruta sin pelearte con las barras.
> - `Directory.CreateDirectory(carpeta)` crea la carpeta si no existe (no falla si ya está).
> - `File.Exists(ruta)` te dice si el archivo ya está.
> - `File.ReadAllLines(ruta)` devuelve un `string[]`, una entrada por línea.
> - `File.AppendAllText(ruta, texto)` agrega texto al final (crea el archivo si no existe).
> - `Environment.NewLine` es el salto de línea del sistema — lo añades para que cada sobre quede en su propia línea.

> [!NOTE]
> 🆕 **Idioma de C#: `System.Text.Json`.** `JsonSerializer.Serialize(algo)` convierte un objeto en una cadena JSON; `JsonSerializer.Deserialize<T>(cadena)` hace el camino inverso. Viene en .NET (`using System.Text.Json;`). Un detalle: `Deserialize<T>` puede devolver `null`, y el `!` al final (`Deserialize<T>(linea)!`) le dice al compilador "confía, aquí no será null" para que no te avise.

> 🛠️ **Inténtalo tú.** Cambia **solo** las tripas de `EventStore` (deja igual `EventStream`, los handlers y la `Empresa`). Como ahora escribe a un archivo, el almacén necesita saber **en qué carpeta**: recíbela por constructor y crea la carpeta ahí mismo — eso obliga a cambiar tus `new EventStore()` por `new EventStore("datos")`. En `AppendEvent`, serializa el sobre y **agrégalo como una línea** al archivo de ese id (mantén la verificación de versión de §9: lee lo que ya hay antes de aceptar). En `GetEvents`, si el archivo existe, lee cada línea y **deserialízala** de vuelta a `EventoAlmacenado`; si no, devuelve una lista vacía.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Text.Json;

public class EventStore
{
    private readonly string _carpeta;

    public EventStore(string carpeta)
    {
        _carpeta = carpeta;
        Directory.CreateDirectory(_carpeta);
    }

    private string RutaDe(string id) => Path.Combine(_carpeta, id + ".log");

    public List<EventoAlmacenado> GetEvents(string id)
    {
        if (!File.Exists(RutaDe(id))) return new();
        return File.ReadAllLines(RutaDe(id))
                   .Select(linea => JsonSerializer.Deserialize<EventoAlmacenado>(linea)!)
                   .ToList();
    }

    public void AppendEvent(string id, EventoAlmacenado sobre)
    {
        if (sobre.Version <= GetEvents(id).Count)   // misma regla de §9
            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada.");

        File.AppendAllText(RutaDe(id), JsonSerializer.Serialize(sobre) + Environment.NewLine);
    }

    // AbrirStream no cambia respecto a §8.
    public EventStream<T> AbrirStream<T>(string id) where T : AggregateRoot, new() => new(this, id);
}
```
</details>

## Corre, escribe… y al leer de vuelta, la empresa miente

Registras la empresa, le cambias el plan a "Enterprise" y la suspendes, usando el stream como siempre:

```csharp
var store = new EventStore("datos");
var s = store.AbrirStream<Empresa>("emp-7");
s.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
s.Append(new PlanCambiado("Enterprise"));
s.Append(new EmpresaSuspendida("falta de pago"));
```

Abre el archivo `datos/emp-7.log`: los hechos **están ahí**.

```json
{"Version":1,"EventData":{"Nombre":"Constructora Andes","Plan":"Básico"}}
{"Version":2,"EventData":{"NuevoPlan":"Enterprise"}}
{"Version":3,"EventData":{"Motivo":"falta de pago"}}
```

Ahora pide la empresa de vuelta — `Get` la rehidrata leyendo el disco, igual que haría la próxima vez que arranques:

```csharp
var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"{empresa.Nombre}: {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}");
// Obtenido : ": , activa"   ← ¡vacío! (esperado: Constructora Andes: Enterprise, suspendida)
```

No explota. No avisa. Devuelve una empresa que **parece** válida y es mentira — justo el error que "probar a ojo" (como venías haciendo en §9) no atrapa.

¿Por qué? En RAM, cada sobre llevaba un objeto de C# que **sabía su propia clase** (`PlanCambiado`, `EmpresaSuspendida`…). Al escribirlo a disco solo quedó **texto**, y la clase se quedó afuera: `{"NuevoPlan":"Enterprise"}` no dice en ninguna parte que sea un `PlanCambiado`.

> [!NOTE]
> 🆕 **Deserializar hacia `object` te da un `JsonElement`.** Tu sobre es `EventoAlmacenado(int Version, object EventData)`: el hecho entra como `object`. Cuando `Deserialize` no sabe a qué clase concreta volver (porque el destino es `object`), no adivina: te entrega un **`JsonElement`** — un árbol de propiedades crudas, sin tipo de C#. Compruébalo: `sobre.EventData.GetType().Name` imprime `JsonElement`, no `PlanCambiado`. Por eso el `switch` de tu replay —que rutea `case PlanCambiado`, `case EmpresaSuspendida`…— **no reconoce ninguno**, y la empresa se queda en su estado inicial.

El diario en disco **olvidó de qué habla**.

## 🔧 Guardar también el tipo de cada hecho

Si el problema es que el texto no dice qué clase es, **escríbelo tú**: junto a los datos, guarda el nombre del tipo. Al leer, ese nombre te dice a qué clase deserializar. En disco, cada línea pasa a verse así:

```json
{"Version":2,"Tipo":"PlanCambiado","Datos":{"NuevoPlan":"Enterprise"}}
```

> [!NOTE]
> 🆕 **El nombre del tipo, y volver del `JsonElement` a la clase.**
> - `hecho.GetType().Name` te da el nombre de la clase como texto (`"PlanCambiado"`) — eso guardas en `Tipo`.
> - Al leer, los `Datos` llegan como `JsonElement` (son un `object`, ya lo viste). Su `.GetRawText()` te devuelve el texto JSON crudo de esos datos.
> - `JsonSerializer.Deserialize(texto, unType)` deserializa a un tipo que decides **en ejecución** (no fijo con `<T>`), devolviendo `object` — justo lo que necesitas, porque la clase depende de lo que diga cada línea.

> 🛠️ **Inténtalo tú.** (1) Define un `record EnDisco(int Version, string Tipo, object Datos)` para representar una línea; úsalo **tanto al escribir como al leer**, así los nombres siempre calzan. (2) Al **escribir**, arma un `EnDisco` con la versión, `sobre.EventData.GetType().Name` y los datos del hecho, y serialízalo. (3) Necesitas un **mapa de nombre → clase** (`"PlanCambiado"` → `typeof(PlanCambiado)`); llénalo a mano con tus eventos. *(Podrías rutear con un `switch` sobre el nombre; el diccionario hace lo mismo y deja más a la vista el fallo de olvidar un evento.)* (4) Al **leer**, deserializa la línea a `EnDisco`, saca el texto de `Datos` con `.GetRawText()`, busca la clase en el mapa y deserializa a ella. Reconstruye el `EventoAlmacenado(Version, hecho)` ya tipado.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Text.Json;

// Una línea del archivo: datos + el tipo que los rotula. Datos entra como object
// (al leer volverá como JsonElement, igual que el EventData de tu sobre).
public record EnDisco(int Version, string Tipo, object Datos);

public class EventStore
{
    private readonly string _carpeta;

    // El desarrollador lista a mano cada tipo de evento que existe:
    private static readonly Dictionary<string, Type> _tipos = new()
    {
        ["EmpresaRegistrada"] = typeof(EmpresaRegistrada),
        ["PlanCambiado"]      = typeof(PlanCambiado),
        ["EmpresaSuspendida"] = typeof(EmpresaSuspendida),
        ["EmpresaReactivada"] = typeof(EmpresaReactivada),
    };

    public EventStore(string carpeta)
    {
        _carpeta = carpeta;
        Directory.CreateDirectory(_carpeta);
    }

    private string RutaDe(string id) => Path.Combine(_carpeta, id + ".log");

    public List<EventoAlmacenado> GetEvents(string id)
    {
        if (!File.Exists(RutaDe(id))) return new();
        var sobres = new List<EventoAlmacenado>();
        foreach (var linea in File.ReadAllLines(RutaDe(id)))
        {
            var d = JsonSerializer.Deserialize<EnDisco>(linea)!;
            var crudo = (JsonElement)d.Datos;                          // Datos es object → JsonElement
            var hecho = JsonSerializer.Deserialize(crudo.GetRawText(), _tipos[d.Tipo])!;
            sobres.Add(new EventoAlmacenado(d.Version, hecho));
        }
        return sobres;
    }

    public void AppendEvent(string id, EventoAlmacenado sobre)
    {
        if (sobre.Version <= GetEvents(id).Count)
            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada.");

        var enDisco = new EnDisco(sobre.Version, sobre.EventData.GetType().Name, sobre.EventData);
        File.AppendAllText(RutaDe(id), JsonSerializer.Serialize(enDisco) + Environment.NewLine);
    }

    public EventStream<T> AbrirStream<T>(string id) where T : AggregateRoot, new() => new(this, id);
}
```
</details>

## Ahora sí sobrevive al reinicio

Para probar que sobrevive de verdad, necesitas **escribir en una corrida y leer en otra**. Un truco simple: siembra los hechos **solo si el diario está vacío**, y luego rehidrata siempre.

```csharp
var store = new EventStore("datos");

// Si la empresa aún no tiene nombre, es que el diario está vacío → la sembramos.
if (store.AbrirStream<Empresa>("emp-7").Get().Nombre == "")
{
    var s = store.AbrirStream<Empresa>("emp-7");
    s.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
    s.Append(new PlanCambiado("Enterprise"));
    s.Append(new EmpresaSuspendida("falta de pago"));
}

var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}");
```

Corre una vez (siembra e imprime) y **vuelve a correr sin borrar `datos`**: la segunda vez **no** siembra —el diario ya no está vacío— y aun así imprime `Constructora Andes: plan Enterprise, suspendida`. Los hechos sobrevivieron al proceso anterior.

> 🌱 Ese **mapa de nombre → clase** lo llenas a mano. Agrega un evento a la `Empresa` —reactivarla con un `EmpresaReactivada`—, olvida ponerlo en el mapa, reinicia, y al leer el diario:
>
> ```
> 💥 KeyNotFoundException: The given key 'EmpresaReactivada' was not present in the dictionary.
> ```
>
> La historia en disco depende de una lista que mantienes sincronizada a mano con cada evento que inventas. Olvidas uno y deja de leerse. Ese dolor es el que abre lo que sigue.

---

### El Descubrimiento

Cambiar el `Dictionary` por un archivo hizo que el diario **sobreviva al reinicio** — pero destapó algo que la RAM te ocultaba: en memoria, cada hecho era un objeto que **sabía su clase**; en disco solo hay **texto**, y el tipo se queda afuera a menos que lo escribas. Sin él, deserializar hacia `object` devuelve un `JsonElement` sin tipo, el replay no rutea, y la empresa rehidrata mal **en silencio**. La cura fue guardar el **nombre del tipo** junto a los datos y usarlo al leer. Persistir un event source no es solo "guardar los datos": es guardar **de qué hecho** son.

---

## ✅ Compruébalo

- [ ] Corres el arnés "sembrar si está vacío", y **vuelves a correr sin borrar `datos`**: la segunda vez rehidrata al estado que dejaste (no a vacío), sin volver a sembrar.
- [ ] Abres `datos/emp-7.log` y ves una línea por hecho, cada una con su `Tipo`.
- [ ] Explica, con tus palabras, por qué la primera versión (sin `Tipo`) rehidrataba mal **sin lanzar ningún error**.
- [ ] Agregas un evento nuevo y **olvidas** registrarlo en el mapa: al leer, revienta. Explica por qué.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** en RAM nunca tuviste que guardar el tipo de cada hecho, pero en disco sí. ¿Qué cambió entre RAM y disco que lo hizo necesario?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El diario en disco" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Persistir el diario en un archivo lo hace **sobrevivir al reinicio**, pero al pasar de objetos en RAM a texto en disco el **tipo de cada hecho se pierde** — hay que guardarlo junto a los datos para que el replay pueda rutear, o la empresa rehidrata mal y en silencio.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

➡️ *Siguiente: el mapa de nombre → clase que llenas a mano se rompe en cuanto olvidas un evento (o renombras uno). Ese es el próximo dolor — se vive a continuación, sin plano por delante ([método](../CRITTERWATCH-BRUJULA.md)).*
