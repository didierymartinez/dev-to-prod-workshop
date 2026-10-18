# El daemon y la consistencia eventual

[El proceso tiene dueño](./el-proceso-tiene-dueno.md) cerró con tu read-side apagado desde el swap: tu proyector en bucle leía la tabla `eventos`, y el diario ahora es de Marten. Con él quedaron quietos su checkpoint y la vista `Suspendidas`; es hora de reconocerlos también.

## 🎯 El Objetivo

Mueve tu vista al **daemon** de Marten: el proyector async, hecho librería. Declara la **consistencia eventual** y mide el **rezago** que en [El rezago](./el-rezago.md) mediste a mano. Después, fija la vista en un test que corre el daemon de verdad.

## 💥 El dolor: tu proyector es de Marten, pero tu vista no cabe en tu agregado

Lo que hacía tu `CorrerProyector()` lo hace el **daemon** de Marten, en bucle, solo.

Pero tu `Empresa` no le sirve al daemon como vista. `AggregateStreamAsync` la rehidrataba **rejugando** los hechos en cada lectura, y por eso sus setters **privados** funcionaban. El daemon, en cambio, **construye la vista una vez y la guarda como un documento** (un *snapshot*), y al consultarla la **relee** (la deserializa). Un deserializador no puede tocar setters privados: la vista sale en blanco. Es la semilla que te dejó §31: el modelo de **escritura** (el agregado encapsulado, que decide) y el de **lectura** (un documento que se guarda y se relee) tienen que ser **clases distintas**, como en [La vista por consulta](./la-vista-por-consulta.md).

### Antes de empezar · una empresa limpia

De tu `Program.cs`, quita los pasos de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) y deja el host, `store` y `bus`. Deshaz también lo que dejaste para su escena y su Rómpelo: que el handler de `RevocarAccesosV1` de Accesos vuelva a devolver `AccesosRevocadosV2`, y que `ProcesoDeSuspensionHandler` vuelva a buscar el proceso por el `SuspensionId` del mensaje. Después de `await host.StartAsync()`, siembra una empresa nueva, activa, con tu `Sembrar`:

```csharp
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-14", "901400000", "Papelería Occidente", "Basico");
    await s.SaveChangesAsync();
}
```

Después de la primera corrida, quita la siembra: volver a sembrar emp-14 lanza `ExistingStreamIdCollisionException`.

## 🔧 Una proyección para el daemon

Escribe la vista como un **read model aparte**, un POCO (solo datos y setters públicos), y una **proyección** que el daemon corre.

> 🆕 **La proyección y su `Apply(evento, vista)`.** Como el read model es un POCO, el plegado vive en una `SingleStreamProjection<VistaSuspendida, string>`. Su `Apply` cambia de forma respecto al del agregado (§31): allí `Apply(TEvento)` mutaba `this`; aquí `Apply(TEvento e, VistaSuspendida v)` recibe el hecho **y** el documento a mutar, porque la lógica ya no vive en el documento. El daemon la corre `Async`, en bucle, con `mt_event_progression` como su checkpoint.

> 🆕 **Async vs Inline: la consistencia es una elección.** `Inline` corre la proyección en la **misma** transacción del hecho: sin rezago, pero cada escritura carga con proyectar, y no escala a muchas proyecciones o costosas. `Async` (el daemon) la desacopla: escala y no frena la escritura, **a cambio** de rezago. Elegir `Async` es declarar "acepto consistencia eventual aquí": es criterio, no un dictado.

> 🆕 **Medir el rezago con Marten.** `store.Advanced.FetchEventStoreStatistics().EventSequenceNumber` es el **high-water**, el último `seq` del diario. `store.Advanced.AllProjectionProgress()` da el `.Sequence` de cada **shard**: uno se llama `HighWaterMark` (no es tu proyección), y el de tu vista es `VistaSuspendida:All`. El rezago es high-water menos el `.Sequence` de **tu** shard: tu `FrenteDelDiario() − LeerCursor()` de [El rezago](./el-rezago.md), con la API de la librería.

> 🛠️ **Inténtalo tú.** Haz que esto pase: suspendes emp-14 por el bus (`await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"))`) y, al instante, la vista va **atrás** (rezago > 0); esperas, el daemon **alcanza** (rezago 0) y emp-14 aparece en `VistaSuspendida`. Para eso: (1) un read model `VistaSuspendida { Id, Suspendida, Plan }` con setters **públicos**; (2) `public partial class SuspendidasProjection : SingleStreamProjection<VistaSuspendida, string>` (el `partial` es obligatorio: Marten le genera código en una clase compañera) con `Apply(EmpresaRegistrada e, VistaSuspendida v)`, `Apply(PlanCambiado …)` (para que el plan sea el de hoy), `Apply(EmpresaSuspendida …)`, `Apply(EmpresaReactivada …)` y `Apply(SuspensionRevertida …)` (desde [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md), una suspensión revertida también deja a la empresa activa); (3) regístrala `ProjectionLifecycle.Async` y añade `AddAsyncDaemon(DaemonMode.Solo)` al `AddMarten` del host que tienes en el `Program.cs` de `Empresas.Historia` desde [El outbox](./el-outbox.md), sin quitarle Wolverine: el daemon corre en ese host; (4) resta high-water − progreso y velo caer a 0, y consulta el documento con `Query<VistaSuspendida>()`. Y **retira lo viejo**: borra la clase `Suspendidas`, `CorrerProyector`, la tabla `empresas_estado` y la tabla `checkpoint`. `VistaSuspendida`, el daemon y `mt_event_progression` las reemplazan.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
using Marten.Events.Aggregation;    // SingleStreamProjection
using JasperFx.Events.Projections;  // ProjectionLifecycle
using JasperFx.Events.Daemon;       // DaemonMode

public class VistaSuspendida   // read model (POCO): setters públicos, sin comportamiento
{
    public string Id { get; set; }
    public bool Suspendida { get; set; }
    public string Plan { get; set; }
}

public partial class SuspendidasProjection : SingleStreamProjection<VistaSuspendida, string>
{
    public void Apply(EmpresaRegistrada e, VistaSuspendida v) => v.Plan = e.Plan;
    public void Apply(PlanCambiado e, VistaSuspendida v)      => v.Plan = e.NuevoPlan;   // el plan de hoy, no el del registro
    public void Apply(EmpresaSuspendida e, VistaSuspendida v) => v.Suspendida = true;
    public void Apply(EmpresaReactivada e, VistaSuspendida v) => v.Suspendida = false;
    public void Apply(SuspensionRevertida e, VistaSuspendida v) => v.Suspendida = false;
}
```

```csharp
// el daemon corre en un HOST vivo: el mismo del Program.cs de Empresas.Historia (§32).
// Suma la proyección y el daemon a lo que ya tenías.
// AddMarten y AddWolverine: deja los tuyos tal como los tienes; este extracto no trae todas sus líneas.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    Hechos.Registrar(opts);                                                    // §31, sigue
    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);   // nuevo
})
.UseLightweightSessions()
.IntegrateWithWolverine()                    // el outbox de §32, sigue
.AddAsyncDaemon(DaemonMode.Solo);            // nuevo
builder.Services.AddWolverine(opts =>
{
    // … tu configuración de siempre, sin cambios …
});
using var host = builder.Build();
await host.StartAsync();                                     // el daemon arranca aquí y corre en background
var store = host.Services.GetRequiredService<IDocumentStore>();
```

```csharp
// medir el rezago
var stats    = await store.Advanced.FetchEventStoreStatistics();       // .EventSequenceNumber = high-water
var progreso = await store.Advanced.AllProjectionProgress();           // una fila por shard (incluye 'HighWaterMark')
var shard    = progreso.FirstOrDefault(x => x.ShardName == "VistaSuspendida:All");   // el shard de TU proyección
long rezago  = stats.EventSequenceNumber - (shard?.Sequence ?? 0);     // vacío al arrancar (daemon aún sin filas) → 0

// consultar el documento que el daemon mantiene (el document store de Marten, no el event store)
await using var s = store.LightweightSession();
var suspendidas = await s.Query<VistaSuspendida>().Where(x => x.Suspendida).Select(x => x.Id).ToListAsync();
```

Tu vista `pagos` de [La vista por consulta](./la-vista-por-consulta.md) es *por hecho* (una fila por evento): pide otra clase de proyección, en el mismo daemon, y queda como ejercicio.

</details>

> 🔍 **¿Lo lograste?** En la primera corrida, el rezago al instante puede salir mayor que el de una suspensión, y la vista trae todas tus empresas suspendidas, no solo emp-14: una proyección `Async` nueva rejuega el diario **entero**. El rezago de un solo acto lo mides en el Rómpelo, con el daemon al día. En CosmosLens, el panel de rezago muestra tu shard, `VistaSuspendida:All`.

> 🆕 **Esperar a que la vista alcance.** Para esperar al daemon sin una pausa fija, Marten trae una espera que termina cuando la vista alcanza: `await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5))`, en `Marten.Events` (agrega `using Marten.Events;`). Al llamarla, anota el high-water de ese momento y espera a que **todas** tus proyecciones lleguen a él. Si no llegan en el plazo, o el daemon no corre, lanza `TimeoutException`.

## 🔨 Rómpelo: el read-your-write, y la vista en blanco

**El rezago:** emp-14 quedó suspendida en el reto. Quita de tu `Program.cs` su siembra y su suspensión, y pon esto en su lugar:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-14", new PagoRegistrado(50_000), new EmpresaReactivada());   // la reactiva, como en El proceso tiene dueño
    await s.SaveChangesAsync();
}
await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));   // la vista parte al día
await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));
// al instante: mide el rezago y carga la vista con LoadAsync<VistaSuspendida>("emp-14")
await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));
// tras esperar: mide y carga otra vez
// al instante:  rezago 2        emp-14 Suspendida=False
// tras esperar: rezago 0, 2 o 3 emp-14 Suspendida=True
```

El rezago al instante son los 2 hechos que el `SuspenderHandler` acaba de escribir: `EmpresaSuspendida` en la empresa y `SuspensionSolicitada`, que abre el proceso. Es el read-your-write roto de [El rezago](./el-rezago.md), ahora con el daemon: escribir al diario es fuerte-consistente, pero la **vista** que el daemon deriva va **atrás**. El bloque reactiva y suspende en cada corrida: si al instante ya sale `rezago 0` con `Suspendida=True`, el daemon alcanzó antes de que midieras, y puedes correrlo otra vez.

Tras esperar, el rezago sale 0, 2 o 3. Las respuestas de Facturación y Accesos anotan 3 hechos en el proceso (`CobroDeMultaConfirmado`, `RevocacionDeAccesosConfirmada` y `SuspensionEfectiva`), en dos transacciones de 1 y 2 hechos, y llegan después de que llamaste la espera. La espera no los cubre: su objetivo quedó fijo al llamarla. Sale 0 si el daemon ya alcanzó las dos transacciones cuando mides, 2 si alcanzó solo la primera, y 3 si ninguna.

Por eso la espera vale en un test, o en una pantalla que vuelve a leer lo que el mismo usuario acaba de escribir. Nunca la uses para decidir una escritura: al terminar la espera, el diario ya pudo avanzar, como muestra ese 3. Esa decisión va contra el stream, con la versión esperada, como en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md).

**La vista en blanco:** intenta usar tu `Empresa` (setters privados) como el read model de un snapshot. Primero comenta el bloque del rezago de arriba, el que llama a `WaitForNonStaleProjectionDataAsync`: la espera aguarda a **todas** las proyecciones, y este snapshot se va a detener. Luego agrega esta línea al `AddMarten`, que le pide al daemon guardar cada `Empresa` como un documento:

```csharp
opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Async);   // SnapshotLifecycle vive en JasperFx.Events.Projections
```

Espera unos segundos a que el daemon lo construya y consulta `await s.Query<Empresa>().ToListAsync()`. Cada empresa sale con valores por defecto (`Id` y `Nombre` vacíos, `Suspendida=False`), aunque su JSON en `mt_doc_empresa` está completo: al releerlo, el deserializador no pudo setear lo privado. Al terminar, quita la línea y borra en `psql` el progreso de ese snapshot, para que no quede un shard detenido: `DELETE FROM mt_event_progression WHERE name = 'Empresa:All';`.

## 🔧 La vista, en un test con el daemon vivo

Hasta aquí compruebas la vista corriendo tu `Program.cs` y leyendo la consola. Fíjala en tests, como el upcaster en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md). Tu `PostgresFixture` no alcanza: la vista la escribe el daemon, que corre dentro de un host. El test necesita un host propio, contra `empresas_tests`.

> 🆕 **Un fixture que arranca un host.** Un fixture también puede implementar `IAsyncLifetime`: xUnit llama a su `InitializeAsync()` una vez antes del primer test de la colección, y a su `DisposeAsync()` una vez después del último. En el primero arrancas el host con `StartAsync()`. En el segundo lo detienes con `StopAsync()` y lo sueltas con `Dispose()`, para que el daemon y Wolverine no sigan corriendo contra la base.

> 🆕 **Vaciar la base con el daemon corriendo.** `await host.ResetAllMartenDataAsync()` (en `Marten`) borra los hechos, los documentos y las filas de `mt_event_progression`, y el diario vuelve a numerar desde 1. Pausa el daemon antes de borrar y lo reanuda al terminar, así el daemon lee su progreso de la base vacía.

> 🆕 **Una colección que corre aparte.** `[CollectionDefinition("daemon", DisableParallelization = true)]` declara la colección `"daemon"`, que xUnit corre sola, cuando terminan las demás. Hace falta porque el reset vacía `empresas_tests` entera. Con `"postgres"` juntaste en una colección todos los tests de esa base; este host es otro fixture, así que va en su propia colección.

> 🛠️ **Inténtalo tú.** Quieres que estos dos tests pasen todas las veces que los corras, con el daemon de verdad:
>
> ```csharp
> // Empresas.Tests/VistaSuspendidaTests.cs
> using Marten;
> using Marten.Events;   // WaitForNonStaleProjectionDataAsync
>
> [Collection("daemon")]
> public class VistaSuspendidaTests(HostConDaemon daemon) : IAsyncLifetime
> {
>     public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();   // antes de CADA test
>     public Task DisposeAsync() => Task.CompletedTask;
>
>     [Fact]
>     public async Task Suspender_por_el_bus_llega_a_la_vista()
>     {
>         await using (var s = daemon.Store.LightweightSession())
>         {
>             s.Events.StartStream<Empresa>("emp-14", new EmpresaRegistrada("901400000", "Papelería Occidente", "Basico"));
>             await s.SaveChangesAsync();
>         }
>         await daemon.Bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));
>
>         await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));
>
>         await using var q = daemon.Store.QuerySession();
>         var vista = Assert.Single(await q.Query<VistaSuspendida>().ToListAsync());
>         Assert.Equal("emp-14", vista.Id);
>         Assert.True(vista.Suspendida);
>         Assert.Equal("Basico", vista.Plan);
>     }
>
>     [Fact]
>     public async Task Repetir_y_reordenar_hechos_no_duplica_la_vista()
>     {
>         await using (var s = daemon.Store.LightweightSession())
>         {
>             s.Events.StartStream<Empresa>("emp-20", new EmpresaRegistrada("902000000", "Panadería Sur", "Basico"),
>                 new EmpresaSuspendida("mora", "susp-20"), new EmpresaSuspendida("mora", "susp-20"));   // el mismo hecho, dos veces
>             s.Events.StartStream<Empresa>("emp-21", new EmpresaRegistrada("902100000", "Ferretería Norte", "Basico"),
>                 new EmpresaSuspendida("mora", "susp-21"), new EmpresaReactivada());
>             s.Events.StartStream<Empresa>("emp-22", new EmpresaRegistrada("902200000", "Droguería Centro", "Basico"),
>                 new EmpresaReactivada(), new EmpresaSuspendida("mora", "susp-22"));                    // los mismos hechos, al revés
>             await s.SaveChangesAsync();
>         }
>         await using (var s = daemon.Store.LightweightSession())
>         {
>             s.Events.Append("emp-20", new EmpresaSuspendida("mora", "susp-20"));   // y una tercera vez, en otra transacción
>             await s.SaveChangesAsync();
>         }
>
>         await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));
>
>         await using var q = daemon.Store.QuerySession();
>         var vistas = (await q.Query<VistaSuspendida>().ToListAsync()).ToDictionary(v => v.Id);
>         Assert.Equal(3, vistas.Count);                // un documento por empresa
>         Assert.True(vistas["emp-20"].Suspendida);
>         Assert.False(vistas["emp-21"].Suspendida);    // manda el último hecho de cada stream
>         Assert.True(vistas["emp-22"].Suspendida);
>     }
> }
> ```
>
> Para eso, crea `HostConDaemon` en `Empresas.Tests`, con `IAsyncLifetime`. **(1)** En `InitializeAsync`, lee `CADENA_POSTGRES` y cámbiale la base a `empresas_tests`, como en tu `PostgresFixture`. **(2)** Arma un host con lo que la vista necesita de tu `Program.cs`. De tu `AddMarten`: la conexión, ahora a la base de pruebas, `StreamIdentity.AsString`, tu `Hechos.Registrar`, la proyección `Async`, `UseLightweightSessions()`, `IntegrateWithWolverine()` y `AddAsyncDaemon(DaemonMode.Solo)`. De tu `AddWolverine`: `AutoApplyTransactions()`, y un `IncludeAssembly` con el ensamblado de tu `SuspenderHandler`, porque Wolverine busca handlers en el ensamblado que arranca el host, y este lo arranca el proyecto de tests. Facturación y Accesos no hacen falta: el test mira tu vista, y sus pedidos se descartan con un `No routes` en el log. **(3)** Guarda el host en una propiedad `Host` y arráncalo. Dentro de la clase, `Host` a secas es esa propiedad: para el builder escribe `Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder()`. Expón también `Store` y `Bus`, sacados de `Host.Services`. **(4)** En `DisposeAsync`, detén el host y suéltalo. **(5)** Declara la colección `"daemon"`, que corre aparte.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/HostConDaemon.cs: un host como el de tu Program.cs, con el daemon vivo, contra la base de pruebas
using JasperFx.Events;              // StreamIdentity
using JasperFx.Events.Daemon;       // DaemonMode
using JasperFx.Events.Projections;  // ProjectionLifecycle
using Marten;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;                       // NpgsqlConnectionStringBuilder
using Wolverine;
using Wolverine.Marten;             // IntegrateWithWolverine

public class HostConDaemon : IAsyncLifetime
{
    public IHost Host { get; private set; } = null!;
    public IDocumentStore Store => Host.Services.GetRequiredService<IDocumentStore>();
    public IMessageBus Bus => Host.Services.GetRequiredService<IMessageBus>();

    public async Task InitializeAsync()   // una vez, antes del primer test de la colección
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        var deTests = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;

        var builder = Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder();   // aquí, Host a secas es la propiedad
        builder.Services.AddMarten(opts =>
        {
            opts.Connection(deTests);
            opts.Events.StreamIdentity = StreamIdentity.AsString;
            Hechos.Registrar(opts);
            opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);
        })
        .UseLightweightSessions()
        .IntegrateWithWolverine()
        .AddAsyncDaemon(DaemonMode.Solo);
        builder.Services.AddWolverine(opts =>
        {
            opts.Policies.AutoApplyTransactions();
            opts.Discovery.IncludeAssembly(typeof(SuspenderHandler).Assembly);   // tus handlers viven en Empresas.Historia
        });

        Host = builder.Build();
        await Host.StartAsync();   // el daemon arranca aquí
    }

    public async Task DisposeAsync()   // una vez, después del último test de la colección
    {
        await Host.StopAsync();
        Host.Dispose();
    }
}

[CollectionDefinition("daemon", DisableParallelization = true)]
public class ColeccionDaemon : ICollectionFixture<HostConDaemon> { }
```

El reset corre antes de cada test, y cada uno parte de una base vacía: por eso el primero puede afirmar `Assert.Single`. El segundo fija lo que la vista promete: un documento por stream, por más veces que llegue un hecho, y en cada uno manda el último hecho de su stream.

</details>

> 🔍 **¿Lo lograste?** Corre `dotnet test` varias veces seguidas: tus tests de antes y estos dos pasan en verde cada vez.

## 🔨 Rómpelo 2: vaciar la base a espaldas del daemon

`store.Advanced.ResetAllData()` hace el mismo borrado, pero sin pausar el daemon. En `VistaSuspendidaTests`, cambia el `InitializeAsync` por `public Task InitializeAsync() => daemon.Store.Advanced.ResetAllData();` y corre `dotnet test`. Los dos tests de la vista caen a los 5 segundos:

```
System.TimeoutException : The projection shards (in total of 2) haven't been completely started within the timeout span
```

La causa está en el log del host. Míralo con `dotnet test --logger "console;verbosity=detailed"`:

```
JasperFx.Events.Daemon.ProgressionProgressOutOfOrderException: Progression 'Identity: VistaSuspendida:All' is out of order. This may happen when multiple processes try to process the projection
```

El daemon siguió corriendo mientras borrabas, y recordaba hasta qué hecho había proyectado. Marten anota su avance actualizando la fila de `VistaSuspendida:All` en `mt_event_progression` solo si todavía dice lo que el daemon recuerda: tu [Concurrencia optimista](./concurrencia-optimista.md), aplicada al progreso. El borrado se llevó esa fila, la actualización no la encuentra, el shard se detiene y la espera vence. `ResetAllMartenDataAsync` lo evita porque pausa el daemon mientras borra. Vuelve a ponerlo.

**Sin la espera.** Quita `WaitForNonStaleProjectionDataAsync` de los dos tests y corre. Cae `Suspender_por_el_bus_llega_a_la_vista`, con `Assert.True() Failure`: el test leyó la vista antes de que el daemon proyectara la suspensión. El otro pasa o cae según quién llegue primero. Vuelve a poner la espera.

## El Descubrimiento

Tu proyector en bucle es el **daemon**, tu `checkpoint` es `mt_event_progression`, y tu vista es una **proyección** con su propio read model, aparte del agregado. La consistencia eventual pasó de "accidente que mides con sorpresa" a "propiedad que **eliges** (`Async` vs `Inline`), **declaras**, **mides** y **operas** (`DaemonMode`)". Y la vista se prueba con el daemon de verdad: es tu arnés de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md), con un host adentro, un reset que pausa el daemon y la espera antes de afirmar.

> 🌱 `VistaSuspendida` va atrás, y para soporte eso está bien. Pero un lector todavía no lee ninguna vista: el `ConsultarPlanHandler` que le contesta a Facturación rehidrata el agregado, y Facturación cobra con su respuesta. Una vista que no va atrás del diario, `Inline`, la construyes en [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md).

## ✅ Compruébalo

- [ ] La vista es un read model aparte (`VistaSuspendida`, POCO, setters públicos), y viste salir en blanco tu `Empresa` de setters privados al usarla como snapshot.
- [ ] `SuspendidasProjection` es `partial`, registrada `Async`, y el daemon la mantiene sin ningún `CorrerProyector()`; la consultas con `Query<VistaSuspendida>()`.
- [ ] Mides el rezago (high-water − progreso): > 0 tras escribir, 0 cuando el daemon alcanza. Lo esperas con `WaitForNonStaleProjectionDataAsync`, no con una pausa fija, y sabes por qué esa espera no sirve para decidir una escritura.
- [ ] Retiraste `Suspendidas`, `CorrerProyector`, `empresas_estado` y `checkpoint`; sabes qué los reemplaza y por qué elegiste `Async` sobre `Inline`.
- [ ] `VistaSuspendidaTests` pasa en verde cada vez, con el daemon vivo en `HostConDaemon` contra `empresas_tests`, y el host se detiene al terminar la colección.
- [ ] Con `ResetAllData()`, los tests de la vista caen con `TimeoutException`, y sabes por qué.
- [ ] En tu `DECISIONES.md`, las líneas de tu proyector y de tu rezago con checkpoint quedaron marcadas como reemplazadas.

## 🆘 Si algo salió mal

- **Con el snapshot de `Empresa` puesto, la espera lanza `TimeoutException` y el log dice `Subscription Empresa:All failed … ArgumentNullException (Parameter 'key')`:** el shard del snapshot se detuvo, y la espera lo aguarda. Comenta la espera mientras haces ese 🔨, y al terminar quita el snapshot y borra su progreso.
- **`SingleStreamProjection` no compila:** vive en `Marten.Events.Aggregation`, y la clase debe ser `partial`. Los otros `using` de Marten 9: `StreamIdentity` → `JasperFx.Events`; `ProjectionLifecycle` → `JasperFx.Events.Projections`; `DaemonMode` → `JasperFx.Events.Daemon`.
- **`progreso[0]` lanza `ArgumentOutOfRangeException` o el rezago sale 0 siempre:** al arrancar la lista está vacía, y su primer elemento suele ser el shard `HighWaterMark`. Busca tu shard por nombre y usa `?? 0` para el vacío, como en la solución.
- **El rezago tarda unos segundos en llegar a 0 y el log repite `High Water agent is stale`:** el diario tiene un hueco: un `seq` que una escritura tomó y nunca confirmó, como la de un programa que se cayó a mitad de escribir. El daemon espera unos 3 segundos y lo salta (el log dice `skipping the event sequence range`); espera y vuelve a medir. Los choques de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) no dejan hueco: no gastan `seq`, y si una escritura que falla gasta uno, Marten lo rellena con un evento `tombstone` (en el stream `mt_tombstone`).
- **La espera lanza `TimeoutException` y el log repite `before the sequence gap`:** una transacción abierta todavía podría llenar el hueco, por ejemplo un `psql` con `BEGIN` sin cerrar, y mientras siga abierta el daemon no lo salta. Ciérrala con `COMMIT` o `ROLLBACK`.
- **La vista nunca se llena, el rezago no baja, o los tests caen con `TimeoutException : The projection shards … haven't been completely started`:** ¿registraste `Async`, añadiste `AddAsyncDaemon(DaemonMode.Solo)` (también en el host del fixture), y el host sigue vivo? Sin daemon corriendo, una proyección async no avanza. En los tests, el reset debe ser `ResetAllMartenDataAsync` (el 🔨 2).
- **`error CS0738: … no tiene el tipo de valor devuelto coincidente de 'ValueTask'`:** tu proyecto de tests usa xUnit v3 (`xunit.v3`); este taller escribe para xUnit 2, el de `dotnet new xunit`. En v3, `InitializeAsync` y `DisposeAsync` devuelven `ValueTask`, en el fixture y en la clase de tests: `public async ValueTask InitializeAsync() => await daemon.Host.ResetAllMartenDataAsync();`, y `ValueTask.CompletedTask` en vez de `Task.CompletedTask`.
- **`IndeterminateRoutesException : Could not determine any valid subscribers or local handlers for message type SuspenderEmpresa`:** al `AddWolverine` del fixture le falta el `IncludeAssembly` con el ensamblado de tu `SuspenderHandler`.
- **`The following constructor parameters did not have matching fixture data: HostConDaemon daemon`:** a la clase de tests le falta `[Collection("daemon")]`, con el mismo nombre que el `[CollectionDefinition]` de `ColeccionDaemon`.
## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, marca como reemplazadas la línea de [La vista se mantiene sola](./la-vista-se-mantiene-sola.md) y la de [El rezago](./el-rezago.md): el proyector y el checkpoint eran tuyos, y ahora son el daemon y `mt_event_progression`. Deja la decisión de hoy:

> El daemon mantiene mi vista; `mt_event_progression` es su checkpoint, y el rezago es high-water − progreso. Esperar la vista vale en un test o para releer lo propio; una decisión va contra el stream, nunca contra la vista. Mis tests de vistas corren el daemon de verdad, y lo pausan para vaciar la base (`ResetAllMartenDataAsync`).

> 💭 **Reto:** en [El rezago](./el-rezago.md) mediste el rezago con `FrenteDelDiario() − LeerCursor()`. Empareja cada mitad con su equivalente de Marten, y explica por qué la vista del daemon va atrás aunque escribir y rehidratar el stream sean fuerte-consistentes. Y: ¿por qué elegirías `Async` sobre `Inline` para esta vista?

```bash
git add .
git commit -m "ES · El daemon y la consistencia eventual" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Tu proyector en bucle es el **daemon** de Marten y tu `checkpoint` es `mt_event_progression`; la vista es una proyección sobre un read model aparte, de setters públicos, porque el daemon la guarda y la relee; la consistencia eventual pasa de accidente a algo que eliges (`Async` vs `Inline`), mides (el rezago) y esperas solo donde vale; y la vista se prueba con el daemon vivo, con un reset que lo pausa para vaciar la base.

---

[⬅️ Volver: El proceso tiene dueño](./el-proceso-tiene-dueno.md)

[➡️ Siguiente: La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md)
