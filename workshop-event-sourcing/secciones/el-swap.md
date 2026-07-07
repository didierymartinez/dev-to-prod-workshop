# El swap: tu motor sobre Marten

Ya conoces a Marten: es una base de datos de documentos, y tus eventos son documentos. Ahora haces el swap de verdad — **en tu proyecto real**, no en un juguete aparte. Vas a reemplazar tu almacén casero por Marten **pieza por pieza**, y cada pieza que cambies la verificarás re-corriendo los mismos escenarios de test.

## 🎯 El Objetivo

Que tus handlers reales dejen de hablar con el `EventStore` en RAM y hablen con **Marten** (Postgres de verdad), y borrar el almacén casero — sin cambiar el comportamiento.

### Paso 1 · Instala y configura Marten

```bash
dotnet add package Marten --version 9.2.1
```

En [Conoce a Marten](conoce-a-marten.md) creaste el `DocumentStore` solo con la cadena de conexión. Para trabajar con **eventos**, le añades dos opciones:

```csharp
using Marten;
using JasperFx.Events;   // StreamIdentity, EventNamingStyle

var store = DocumentStore.For(opts =>
{
    opts.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
    opts.Events.StreamIdentity = StreamIdentity.AsString;             // llaves "emp-7", no Guid
    opts.Events.EventNamingStyle = EventNamingStyle.SmarterTypeName;  // guarda el tipo sin ensamblado/namespace
});
```

> [!NOTE]
> 🆕 **La config de eventos.** El `DocumentStore` y la `LightweightSession` ya los conoces de [Conoce a Marten](conoce-a-marten.md). Lo nuevo son dos ajustes para eventos:
> - `StreamIdentity.AsString`: los streams se identifican por **texto** (`"emp-7"`), como los venías usando, no por `Guid`.
> - `EventNamingStyle.SmarterTypeName`: Marten etiqueta cada evento con un **nombre corto** (`empresa_registrada`). Sin esto guardaría un nombre largo atado a la ubicación de la clase en tu código, y el día que muevas o renombres esa clase, los eventos viejos ya no calzarían.

### Paso 2 · El handler habla con Marten

Tu handler dejaba así el ciclo: `AbrirStream → Get → decidir → Append`. Con Marten es el mismo ciclo, con sus comandos:

> 🛠️ **Inténtalo tú.** **🔁** Reescribe `SuspenderHandler`: en vez de recibir el `EventStore`, recibe una `IDocumentSession` de Marten (el contrato que cumple la `LightweightSession` que ya abriste: una sesión para leer y escribir). Rehidrata con `session.Events.AggregateStreamAsync<Empresa>(id)`, decide con el mismo `Suspender(...)`, y si hay hecho, `session.Events.Append(id, hecho)` + `SaveChangesAsync`. El `Handle` se vuelve `async` (Marten habla con Postgres).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🔁 antes recibía EventStore; ahora una sesión de Marten
public class SuspenderHandler(IDocumentSession session) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId);  // ← tu Get()
        var hecho = empresa?.Suspender(cmd.Motivo);                                       // ← tu decide, intacto
        if (hecho is not null)
        {
            session.Events.Append(cmd.EmpresaId, hecho);   // ← tu Append
            await session.SaveChangesAsync();
        }
    }
}
```
</details>

> [!NOTE]
> 🆕 **Los comandos de Marten, uno a uno.**
> - `session.Events.AggregateStreamAsync<Empresa>(id)` — lee el stream y **reconstruye** la `Empresa`. Es tu `stream.Get()`.
> - `session.Events.Append(id, hecho)` — añade el hecho al stream. Es tu `stream.Append(hecho)`.
> - `await session.SaveChangesAsync()` — persiste (aquí espera de verdad: viaja a Postgres). Tu `EventStore` guardaba al instante en RAM; ahora hay que ir hasta la base y esperar.
> - `session.Events.StartStream(id, hecho)` — abre un stream **nuevo** con su primer hecho (es el `Append` del primerísimo evento de una empresa; lo usarás al sembrar).

**`async` se propaga.** La regla de C# que viste en [Conoce a Marten](conoce-a-marten.md): un método que usa `await` dentro debe ser `async` y devolver un `Task`. Tu `SuspenderHandler` llama a Marten y lo `await`ea, así que tu `void Handle` se volvió `async Task HandleAsync`. Y con él cambia el **contrato**: el `ICommandHandler<T>` que declaraste en [El despachador](el-despachador.md) pasa de `void Handle(TCommand)` a `Task HandleAsync(TCommand)`. *(`CambiarPlanHandler` cambia igual, y por lo mismo.)*

Y no para en el handler: quien lo llame tendrá que `await`earlo y volverse `async` también. Tu `Despachador` (de [El despachador](el-despachador.md)) guardaba los handlers como `Action<object>` y su `Enviar` era `void`, y ninguno puede esperar un `Task`. El `Despachador` síncrono **deja de encajar**, así que aquí lo jubilas: en el `Main` (y en los tests) llamas al handler directo con `await`. El despachador asíncrono lo repondrá **Wolverine** más adelante.

### Paso 3 · La `Empresa` habla el idioma de Marten

Tu `Empresa` reconstruía su estado con el `switch Aplicar(object)` que llamaba tu `Load`: ese bucle **rejugaba los eventos uno tras otro, acumulando el estado**. Esa operación —recorrer una secuencia acumulando un resultado— tiene nombre: **fold** (o *aggregation* en la jerga de event sourcing). Marten hace el mismo fold, pero **por convención**: sin que se lo declares, reconoce tus métodos por su nombre (`Apply`) y el tipo del evento que reciben, y rejuega los eventos por ahí. Los `decide` (`Suspender`, `CambiarPlan`…) **no cambian**.

> 🛠️ **Inténtalo tú.** **🔁** En `Empresa`: (1) añade `public string Id { get; set; }` — Marten necesita dónde poner la llave del stream al rehidratar, y esa propiedad es el hueco; (2) reemplaza el `switch Aplicar(object)` por un `Apply(TEvento)` **por tipo** que mute el estado. El `Load`/`Aplicar` de `AggregateRoot` ya no se usan (Marten hace el fold).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Id { get; set; } = "";      // Marten lo llena con la llave del stream
    public string Nombre { get; private set; } = "";
    public string Plan { get; private set; } = "";
    public bool Suspendida { get; private set; }

    // decide (sin cambios): valida y DEVUELVE el hecho
    public EmpresaSuspendida? Suspender(string motivo) => Suspendida ? null : new(motivo);
    public PlanCambiado CambiarPlan(string nuevoPlan) =>
        Suspendida ? throw new ReglaDeNegocioException("empresa suspendida") : new(nuevoPlan);

    // Apply por tipo (Marten los llama al rehidratar) — reemplaza el switch Aplicar
    public void Apply(EmpresaRegistrada e) { Nombre = e.Nombre; Plan = e.Plan; }
    public void Apply(PlanCambiado e)      => Plan = e.NuevoPlan;
    public void Apply(EmpresaSuspendida e) => Suspendida = true;
    public void Apply(EmpresaReactivada e) => Suspendida = false;
}
```
</details>

> [!NOTE]
> 🌱 **¿Y `Create`?** Quizá viste en la doc de Marten un `static Create(EmpresaRegistrada)` para el primer evento. No lo necesitas aquí: tu `Apply(EmpresaRegistrada)` sobre el constructor por defecto ya reconstruye la creación (lo demás que Marten no reconoce, lo ignora). `Create` es la puerta de un modelo más rico —un `AggregateRoot` que **encola sus propios eventos** al decidir (`RaiseAndApply`)— que adoptarás con la plantilla ([El almacén de la plantilla](el-almacen-de-la-plantilla.md)).

### Paso 4 · Borra el almacén casero

Ya nadie lo usa: **borra** `EventStore`, `EventStream` y el `Load`/`Aplicar(object)` de `AggregateRoot`. Al hacerlo, mira qué API de Marten enterró cada pieza:

| Tu pieza casera | La reemplaza |
|---|---|
| `AbrirStream` + `EventStream.Get()` | `session.Events.AggregateStreamAsync<T>(id)` |
| `EventStream.Append(hecho)` | `session.Events.Append(id, hecho)` |
| `AggregateRoot.Load` + `switch Aplicar` | el *fold* de Marten sobre tus `Apply(TEvento)` |
| `EventoAlmacenado` (tu sobre con versión) | las columnas `version`/`type`/`data` de `mt_events` |

> 🔍 **¿Lo lograste?** En un `Main` mínimo: crea el `store`, abre una sesión, siembra `emp-7` (`session.Events.StartStream("emp-7", new EmpresaRegistrada("Constructora Andes","Básico"))` + `SaveChangesAsync`), corre `await new SuspenderHandler(session).HandleAsync(new SuspenderEmpresa("emp-7","falta de pago"))`, y consulta `mt_events` en psql. Verás **dos filas** (`empresa_registrada`, `empresa_suspendida`). Tu app persiste de verdad, de punta a punta, sobre Marten.

---

### El Descubrimiento

Tu motor casero corre ahora sobre **Marten**: los handlers usan una `IDocumentSession` (`AggregateStreamAsync` para leer, `Append` para escribir, `SaveChangesAsync` para persistir), la `Empresa` reconstruye por convención (`Apply` por tipo), y el `EventStore`/`EventStream` en RAM **ya no existen**. Cada pieza casera murió nombrando a la de Marten que la reemplaza. Y asumes, consciente, un costo: Marten entró a tu dominio (tus handlers y tu `Empresa` ya hablan su idioma). Eso se llama **lock-in**: quedas amarrado a Marten, y cambiarlo después costaría caro. Aquí es una decisión, no un accidente.

Pero tu red de seguridad está **roja**: los tests con que [blindaste el motor](given-when-then.md) usaban el `EventStore` en RAM que acabas de borrar. La próxima sección los revive contra Marten real — y ahí se prueba que el swap no cambió el comportamiento.

> [!WARNING]
> **La [concurrencia optimista](concurrencia-optimista.md) quedó temporalmente fuera.** El swap con `Append` **no verifica la versión** — tu `ConcurrencyException` no la perdiste, pero Marten la resuelve distinto. La recuperas con **`FetchForWriting`** más adelante, cuando la adoptes con criterio. Por ahora: un escritor por stream.

> [!NOTE]
> 🌱 **Semilla — aún es Marten "desnudo".** Usas `IDocumentSession` directo, sin abstracción. Cuando el equipo decidió **abstraer** (`IEventStore`) —para testear sin BD y controlar el Unit of Work— nacieron las piezas de la plantilla. Verás por qué, con datos, en [El almacén abstracto](el-almacen-abstracto.md).

---

## ✅ Compruébalo

- [ ] `SuspenderHandler` recibe una `IDocumentSession` y usa `AggregateStreamAsync`/`Append`/`SaveChangesAsync`; es `async`.
- [ ] Explicas por qué `Handle` se volvió `async` (llama a Marten y lo `await`ea) y por qué eso **jubila** tu `Despachador` síncrono (async se propaga; `Action<object>`/`void` no esperan un `Task`).
- [ ] `Empresa` tiene `Id` + un `Apply(TEvento)` por tipo; el `switch Aplicar` y el `Load` se borraron.
- [ ] Borraste `EventStore`/`EventStream` caseros y sabes qué API de Marten reemplazó cada pieza.
- [ ] El `Main` mínimo persiste un `EmpresaSuspendida`: `mt_events` muestra las dos filas.
- [ ] Explicas el **lock-in** que aceptaste (Marten entró a tu dominio, a propósito) y por qué la concurrencia optimista quedó pendiente hasta `FetchForWriting`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Mapea cada pieza casera a su reemplazo de Marten. ¿Qué **lock-in** aceptaste al hacer el swap, y por qué dejó fuera la concurrencia optimista?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El swap: tu motor sobre Marten" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El swap reemplaza tu almacén casero por Marten **en el proyecto real**, pieza por pieza: los handlers usan `IDocumentSession` (`AggregateStreamAsync`/`Append`/`SaveChangesAsync`), la `Empresa` reconstruye por convención (`Apply` por tipo), y borras `EventStore`/`EventStream` nombrando qué API de Marten los reemplaza — asumiendo el **lock-in** (Marten entró a tu dominio) y dejando la concurrencia optimista pendiente para `FetchForWriting`.

---

[⬅️ Volver: Conoce a Marten: una base de datos de documentos](./conoce-a-marten.md)

[➡️ Siguiente: Tests de integración: validar el swap](./tests-de-integracion.md)
