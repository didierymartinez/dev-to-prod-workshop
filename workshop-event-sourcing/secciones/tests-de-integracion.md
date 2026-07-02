# Tests de integración: la gramática sobrevive al motor

El swap ([El swap](el-swap.md)) borró tu `EventStore` casero — y tus tests Given-When-Then ([Given-When-Then](given-when-then.md)) hablaban con él. Ya no compilan. Vamos a migrarlos.

## 🎯 El Objetivo

Los **mismos** tests `Given/When/Then`, ahora contra Postgres real, aislados en un **schema propio por corrida** que se crea al empezar y se borra al terminar.

## 💥 El dolor: ¿mockear Marten? No

Tu handler ya no habla con un almacén en RAM que puedas sembrar a mano: habla con Marten, que se apoya en Postgres. Tienes dos caminos:

- **Mockear Marten** — como **no** lo abstrajiste (el elefante de [El swap](el-swap.md)), tendrías que simular decenas de métodos. Falso, frágil y poco fiel.
- **Probar en integración** contra un Postgres real — más lento y exige la base corriendo, pero prueba **de verdad**: del handler a la tabla, con el comportamiento idéntico al de producción.

El equipo de Marten recomienda lo segundo, y es lo que haremos. La **gramática** `Given/When/Then` no cambia; cambia el **motor** debajo.

## 🔧 Un fixture con schema propio, y la base sobre Marten

Cada corrida de tests crea su **propio schema** en la base (aislado de tus datos reales) y lo **borra** al terminar. Y lo crea **una sola vez por corrida** —no por clase— con `ICollectionFixture`.

### Paso 1 · El fixture: un schema propio por corrida

> 🛠️ **Inténtalo tú.** Un `MartenFixture` que abra un `DocumentStore` con un `DatabaseSchemaName` **único** (p. ej. `"test_" + Guid`), y que en `DisposeAsync` haga `DROP SCHEMA … CASCADE`. Compártelo con `ICollectionFixture` (un solo store para toda la corrida).

### Paso 2 · La base: la gramática sobre Marten

> 🛠️ **Inténtalo tú.** Reescribe la base `HandlerTest<TCommand>`: `Given` siembra con `StartStream` (sesión propia + `SaveChangesAsync`), `When` corre el handler real con una sesión, `Then` lee con `FetchStreamAsync` y compara los hechos **nuevos** (desde el corte). Cada test usa un `EmpresaId` **único** para no pisar a otro en el schema compartido.

> [!NOTE]
> 🆕 **Piezas nuevas.** `opts.DatabaseSchemaName = "test_…"` mete todas las tablas de Marten en un schema aparte — así los tests no tocan tus datos. `ICollectionFixture<T>` (con `[CollectionDefinition]`/`[Collection]`) crea el fixture **una vez por corrida** y lo comparte entre clases (vs `IClassFixture`, uno **por clase** — 5 clases = 5 stores = lento). `session.Events.FetchStreamAsync(id)` devuelve los hechos crudos del stream (cada uno un `IEvent`; su `.Data` es el hecho).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;
using JasperFx.Events;
using Npgsql;
using Xunit;

// UNA vez por corrida: un schema propio que se borra al final
public class MartenFixture : IAsyncLifetime   // xUnit invoca el DisposeAsync de IAsyncLifetime (el de IAsyncDisposable NO, en fixtures)
{
    private const string Cadena = "Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd";
    private readonly string _schema = "test_" + Guid.NewGuid().ToString("n")[..8];
    public IDocumentStore Store { get; }

    public MartenFixture() => Store = DocumentStore.For(opts =>
    {
        opts.Connection(Cadena);
        opts.Events.StreamIdentity = StreamIdentity.AsString;
        opts.DatabaseSchemaName = _schema;                 // aislado de tus datos reales
    });

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()                       // aquí se borra el schema al terminar la corrida
    {
        Store.Dispose();
        await using var conn = new NpgsqlConnection(Cadena);
        await conn.OpenAsync();
        await new NpgsqlCommand($"DROP SCHEMA IF EXISTS {_schema} CASCADE", conn).ExecuteNonQueryAsync();
    }
}

[CollectionDefinition("marten")]
public class MartenCollection : ICollectionFixture<MartenFixture>;
```

```csharp
// la gramática de siempre, ahora sobre Marten
[Collection("marten")]
public abstract class HandlerTest<TCommand>(MartenFixture fixture)
{
    protected readonly IDocumentStore Store = fixture.Store;
    protected readonly string EmpresaId = "emp-" + Guid.NewGuid().ToString("n")[..8];  // único por test
    private int _yaEstaban;

    protected abstract ICommandHandler<TCommand> Handler(IDocumentSession session);

    protected async Task Given(params object[] pasado)
    {
        await using var s = Store.LightweightSession();
        s.Events.StartStream<Empresa>(EmpresaId, pasado);
        await s.SaveChangesAsync();
        _yaEstaban = pasado.Length;
    }

    protected async Task When(TCommand comando)
    {
        await using var s = Store.LightweightSession();
        await Handler(s).HandleAsync(comando);
    }

    protected async Task Then(params object[] esperados)
    {
        await using var s = Store.QuerySession();
        var nuevos = (await s.Events.FetchStreamAsync(EmpresaId)).Skip(_yaEstaban).Select(e => e.Data);
        Assert.Equal(esperados, nuevos);
    }
}
```

```csharp
// el test: idéntico a antes en forma; solo cambia de qué hereda y que es async
public class SuspenderTests(MartenFixture fixture) : HandlerTest<SuspenderEmpresa>(fixture)
{
    protected override ICommandHandler<SuspenderEmpresa> Handler(IDocumentSession s) => new SuspenderHandler(s);

    [Fact]
    public async Task Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        await Given(new EmpresaRegistrada("Constructora Andes", "Básico"));
        await When(new SuspenderEmpresa(EmpresaId, "falta de pago"));
        await Then(new EmpresaSuspendida("falta de pago"));
    }
}
```
</details>

## 🔍 ¿Lo lograste?

Con el contenedor de Postgres corriendo, `dotnet test` vuelve a **verde** — pero ahora cada test siembra, ejecuta el handler real y lee los hechos **desde Postgres**, en su propio schema, que se borra al terminar. La regla que pruebas es la misma que en [Given-When-Then](given-when-then.md); lo que cambió es que el motor debajo ahora es Marten de verdad.

Prueba el valor extra: rompe algo de infraestructura a propósito (quita el `SaveChangesAsync` de un handler). El **unit test** casero no lo notaba; el de integración **falla** — porque ejercita del handler a la base, no solo la lógica.

---

### El Descubrimiento

La gramática `Given/When/Then` **sobrevivió** al cambio de motor: los tests se leen igual, pero ahora corren contra Postgres real, aislados en un schema por corrida, y son **más anchos** —atrapan errores de infraestructura, no solo de lógica—. Ese es el pago de tener el dominio desacoplado del almacenamiento: cambias el motor y la especificación sigue en pie.

> [!NOTE]
> 🌱 **Semilla — el costo, y cómo recuperarlo.** La integración es fiel pero **necesita Postgres** y es más lenta. Más adelante, la capa del equipo trae un `TestStore` que corre la **misma** gramática **sin base de datos** —rápido y determinista— para el grueso de los tests, dejando la integración para lo que de verdad la necesita ([El TestStore](teststore.md)). Fidelidad vs velocidad: tendrás las dos.

---

## ✅ Compruébalo

- [ ] Un `MartenFixture` con `DatabaseSchemaName` único que hace `DROP SCHEMA … CASCADE` al terminar, compartido con `ICollectionFixture`.
- [ ] La base `HandlerTest<TCommand>` async: `Given` siembra con `StartStream`, `When` corre el handler con una sesión, `Then` compara con `FetchStreamAsync`.
- [ ] Cada test usa un `EmpresaId` único; `dotnet test` pasa contra el Postgres del contenedor.
- [ ] Explicas por qué integración (no mocks) y por qué `ICollectionFixture` (uno por corrida) en vez de `IClassFixture` (uno por clase).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué probar en integración y no mockeando Marten? ¿Qué gana un test de integración sobre uno unitario, y qué cuesta?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Tests de integración" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Como el swap borró el almacén casero, los tests `Given/When/Then` migran a **integración**: un `MartenFixture` con schema propio por corrida (creado y borrado solo), la misma gramática async sobre Postgres real (`StartStream` para sembrar, `FetchStreamAsync` para afirmar) — más fiel y más ancha que un unit test, a cambio de necesitar la base y algo de velocidad.

---

[⬅️ Volver: El swap — Marten reemplaza tu almacén](./el-swap.md)

[➡️ Siguiente: La primera proyección](./la-primera-proyeccion.md)
