# Tests de integración: validar el swap

El swap dejó tu red de seguridad **roja**: los tests con que [blindaste el motor](given-when-then.md) usaban el `EventStore` en RAM que acabas de borrar. Aquí los revives contra Marten real — y en verde, prueban que el swap **no cambió el comportamiento**.

## 🎯 El Objetivo

Que los mismos escenarios **Given-When-Then** de antes corran **verdes contra Marten + Postgres reales**. Ese verde es la validación del swap.

## Los escenarios no se tocan; la base cambia de motor

Recuerda cómo partiste la base al [blindar el motor](given-when-then.md): el **motor** vivía en `HandlerTest`, y los escenarios (`[Fact]`) solo decían *dado esto, cuando aquello, entonces esto* — sin nombrar el `EventStore`. Ese día llegó. Cambias **solo la base** para que su motor sea Marten; los escenarios corren igual.

### Paso 1 · La base, ahora sobre Marten

> 🛠️ **Inténtalo tú.** **🔁** En `HandlerTest`, reemplaza el `EventStore` en RAM por Marten. Como crear el `DocumentStore` es **caro** (crea el esquema y compila los mapeos la primera vez), ponlo en un **`MartenFixture`** que xUnit cree **una vez** y comparta (vía `IClassFixture`); cada test solo hace `ResetAllData()` sobre un **esquema `test` aparte** (para no pisar tus datos de desarrollo). `Given` siembra con `StartStream` y **recuerda cuántos hechos metió** (para aislar los nuevos), `When` corre el handler `async`, `Then` lee los hechos con `FetchStreamAsync` — todo `async`. **Ojo:** como cada test abre su propia sesión, el handler ya no es una propiedad fija sino `CrearHandler(session)` — un método que lo crea **con** la sesión recién abierta.

> [!NOTE]
> 🆕 **`MartenFixture` + `IDocumentStore`.** Crear el `DocumentStore` es **caro**, y no quieres pagarlo en cada test. Un **fixture** de xUnit es un montaje **compartido**: `IClassFixture<MartenFixture>` hace que xUnit cree **un solo** `MartenFixture` para toda la clase de tests y se lo pase a cada uno por el constructor. Dentro vive el `DocumentStore`, tipado como **`IDocumentStore`** — el mismo que creabas con `DocumentStore.For` en [Conoce a Marten](conoce-a-marten.md), ahora por su interfaz: la fábrica de sesiones, **una sola** para toda la clase de tests.

> [!NOTE]
> 🆕 **`IAsyncLifetime`, en dos niveles.** Da un *antes*/*después* `async`. El **fixture** lo usa para crear el store **una vez** (`InitializeAsync`) y soltarlo al final. La **base** lo usa para, antes de **cada** test, `await Store.Advanced.ResetAllData()`: borra los datos para que cada test arranque de cero (como el `EventStore` en RAM, que nacía vacío). El `DatabaseSchemaName = "test"` los guarda en un **esquema aparte** (un compartimento con nombre dentro de la misma base), así el borrado no toca lo que sembraste con el `Main`.

> [!NOTE]
> 🆕 **`FetchStreamAsync(id)`.** Lee los hechos de un stream con sus datos: `e.Data` es el hecho pelado (el `record`), lo mismo que antes sacabas con el `.EventData` de tu sobre casero. `Skip(_previos)` descarta los sembrados y deja los que emitió el handler. (Las sesiones ya las conoces de [Conoce a Marten](conoce-a-marten.md): `LightweightSession` lee y escribe —en `Given`/`When`—; `QuerySession` es de solo lectura —en `Then`—.)

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;
using JasperFx.Events;
using AwesomeAssertions;
using Xunit;

// El fixture: xUnit lo crea UNA vez por clase de tests y lo comparte.
// Aquí vive el DocumentStore (caro de crear), no en cada test.
public class MartenFixture : IAsyncLifetime
{
    public IDocumentStore Store { get; private set; } = null!;

    public Task InitializeAsync()                // una vez, antes de todos los tests de la clase
    {
        Store = DocumentStore.For(opts =>
        {
            opts.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
            opts.DatabaseSchemaName = "test";    // esquema aparte: no toca tus datos de desarrollo
            opts.Events.StreamIdentity = StreamIdentity.AsString;
            opts.Events.EventNamingStyle = EventNamingStyle.SmarterTypeName;
        });
        return Task.CompletedTask;
    }

    public Task DisposeAsync() { Store.Dispose(); return Task.CompletedTask; }
}

public abstract class HandlerTest<TCommand> : IClassFixture<MartenFixture>, IAsyncLifetime
{
    protected readonly IDocumentStore Store;     // el store COMPARTIDO, viene del fixture
    protected string AggregateId = "emp-7";
    private int _previos;

    protected HandlerTest(MartenFixture fixture) => Store = fixture.Store;

    protected abstract ICommandHandler<TCommand> CrearHandler(IDocumentSession session);

    public async Task InitializeAsync() => await Store.Advanced.ResetAllData();   // antes de CADA test: de cero
    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task Given(params object[] eventos)
    {
        await using var session = Store.LightweightSession();
        session.Events.StartStream(AggregateId, eventos);
        await session.SaveChangesAsync();
        _previos = eventos.Length;
    }

    protected async Task When(TCommand comando)
    {
        await using var session = Store.LightweightSession();
        await CrearHandler(session).HandleAsync(comando);
    }

    protected async Task Then(params object[] esperados)
    {
        await using var session = Store.QuerySession();
        var stream = await session.Events.FetchStreamAsync(AggregateId);
        stream.Skip(_previos).Select(e => e.Data).Should().BeEquivalentTo(esperados);
    }
}
```
</details>

### Paso 2 · El escenario: igual, solo `async`

El escenario es el **mismo** de antes; cambia una sola cosa, y ya sabes por qué: `async` **se propaga** (lo viste en [el swap](el-swap.md)). Como `Given`/`When`/`Then` ahora hablan con Postgres, son `async`; el `[Fact]` los `await`ea y se vuelve `async Task`.

```csharp
public class SuspenderEmpresaTests(MartenFixture fixture) : HandlerTest<SuspenderEmpresa>(fixture)
{
    protected override ICommandHandler<SuspenderEmpresa> CrearHandler(IDocumentSession session)
        => new SuspenderHandler(session);

    [Fact]
    public async Task Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        await Given(new EmpresaRegistrada("Constructora Andes", "Básico"));   // mismos hechos previos
        await When(new SuspenderEmpresa(AggregateId, "falta de pago"));       // mismo comando
        await Then(new EmpresaSuspendida("falta de pago"));                   // mismo hecho esperado
    }
}
```

El `(fixture)` tras `HandlerTest<…>` **se lo pasa al constructor de la base**, que lo guarda en `Store`.

> 🔍 **¿Lo lograste?** Con el Postgres arriba (`docker compose up -d`), corre `dotnet test`: **verde**. Ese verde ES la validación del swap — Marten hace **exactamente** lo que hacía tu motor casero, probado sobre una base de datos real. Rómpelo a propósito (cambia el motivo esperado) y velo **rojo**: sí vigila.

---

### El Descubrimiento

Los mismos escenarios que blindaron tu motor casero corren ahora **verdes contra Marten + Postgres**. El swap no cambió el comportamiento — está **probado, no supuesto**. Y fíjate qué poco tocaste: **solo la base** cambió de motor (RAM → Marten); los escenarios (el invariante) apenas ganaron `async`. Ese fue el pago de haberlos escrito swappeables.

> [!WARNING]
> **El precio de estos tests.** Necesitan **Docker y Postgres corriendo**. Aunque el `MartenFixture` crea el store una sola vez, cada test **resetea el esquema, siembra y consulta yendo a Postgres**. Son **lentos** — no los corres en cada tecla, como sí hacías con los de RAM. Para un puñado que valide *que Marten está bien cableado*, valen oro. Para las **decenas** de tests de comportamiento que tendrás, son insostenibles. Y a futuro, con **varias** clases de integración: comparten el esquema `test` y podrían pisarse al correr a la vez, así que habrá que darle a cada clase su propio esquema.

> [!NOTE]
> 🌱 **Semilla — recuperar la velocidad.** Vas a querer de vuelta los tests **rápidos, en memoria y sin Postgres** para el comportamiento, y dejar estos pocos de integración para confiar en el cableado. Eso pide una **costura**: si tus handlers dependieran de una abstracción (`IEventStore`) en vez de Marten directo, los tests podrían usar un **doble en memoria** — sin base de datos, sin depender de Marten. Es la próxima sección, y es una pieza de la plantilla ([El almacén abstracto](el-almacen-abstracto.md)).

---

## ✅ Compruébalo

- [ ] Un `MartenFixture` (compartido vía `IClassFixture`) crea el `DocumentStore` **una vez**; la base hace `ResetAllData()` antes de cada test (esquema `test`).
- [ ] `Given`/`When`/`Then` son `async`; el `[Fact]` es `async Task` y los `await`ea.
- [ ] El escenario de `Suspender` es el **mismo** de antes en hechos, comando y hechos esperados — solo ganó `async`.
- [ ] `dotnet test` con Postgres arriba → **verde**; lo rompes a propósito y lo ves **rojo**.
- [ ] Explicas por qué este verde **valida el swap**, y por qué estos tests son **lentos** (Docker, red, limpieza) frente a los de RAM.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué los mismos escenarios de antes pueden validar el swap sin reescribirlos? ¿Qué ganaste y qué **perdiste** al mover el motor de RAM a Postgres en los tests?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Tests de integración: validar el swap" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Revives los escenarios Given-When-Then contra Marten + Postgres reales cambiando **solo la base**: su motor pasa de RAM a un `DocumentStore` que un **`MartenFixture`** crea una vez y comparte, y cada test hace `ResetAllData`. Los `[Fact]` solo ganan `async`. En **verde** prueban que el swap no cambió el comportamiento. El precio: dependen de Docker y son **lentos** — dolor que empuja hacia los tests rápidos en memoria de la próxima sección.

---

[⬅️ Volver: El swap: tu motor sobre Marten](./el-swap.md)

[➡️ Siguiente: El almacén abstracto: tests rápidos sin Postgres](./el-almacen-abstracto.md)
