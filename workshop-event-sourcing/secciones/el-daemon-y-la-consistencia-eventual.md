# El daemon y la consistencia eventual

[El proceso tiene dueño](./el-proceso-tiene-dueno.md) cerró con tu read-side apagado desde el swap: tu proyector en bucle leía la tabla `eventos`, y el diario ahora es de Marten. Con él quedaron quietos su checkpoint y la vista `Suspendidas`; es hora de reconocerlos también.

## 🎯 El Objetivo

Mueve tu vista al **daemon** de Marten: el proyector async, hecho librería. Declara la **consistencia eventual** y mide el **rezago** que en [El rezago](./el-rezago.md) mediste a mano.

## 💥 El dolor: tu proyector es de Marten, pero tu vista no cabe en tu agregado

Recapitula: tu `CorrerProyector()` leía el diario desde un `checkpoint` y ponía al día la vista `Suspendidas`. Eso —leer los hechos nuevos, aplicarlos a una vista, recordar hasta dónde— es exactamente lo que hace el **daemon** de Marten, en bucle, solo.

Pero al intentar que el daemon mantenga tu `Empresa` como vista, descubres un choque con [El swap por reconocimiento](./el-swap-por-reconocimiento.md). Allí tu `Empresa` (setters **privados**) se rehidrataba *live* con `AggregateStreamAsync`, que **rejuega** los hechos en cada lectura — por eso los setters privados funcionaban. El daemon no rejuega en cada lectura: **construye la vista una vez y la guarda como un documento** (un *snapshot*); cuando consultas, ese documento se **relee** (se deserializa). Y un deserializador no puede tocar setters privados → la vista sale en blanco. Es la semilla que §29 te dejó: *"un snapshot persistido sí exigiría setters públicos, pero eso es cosa del daemon"*. Aquí se cobra: el modelo de **escritura** (el agregado encapsulado, que decide) y el de **lectura** (un documento que se guarda y se relee) tienen que ser **clases distintas** — la separación de [La vista por consulta](./la-vista-por-consulta.md), ahora forzada por la mecánica.

### Antes de empezar · una empresa limpia

De tu `Program.cs`, quita los pasos de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) y deja el host, `store` y `bus`. Deshaz también lo que dejaste para su escena y su Rómpelo: que el handler de `RevocarAccesosV1` de Accesos vuelva a devolver `AccesosRevocadosV2`, y que `ProcesoDeSuspensionHandler` vuelva a buscar el proceso por el `SuspensionId` del mensaje. Después de `await host.StartAsync()`, siembra una empresa nueva, activa:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-14", new EmpresaRegistrada("901400000", "Papelería Occidente", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y el `SuspenderHandler` la lee. Agrégala en `psql`:

```sql
INSERT INTO localizador(nit, stream) VALUES ('901400000', 'emp-14');
```

Después de la primera corrida, quita la siembra: volver a sembrar emp-14 lanza `ExistingStreamIdCollisionException`.

## 🔧 Una proyección para el daemon

Escribe la vista como un **read model aparte** —un POCO: solo datos, setters públicos, sin comportamiento— y una **proyección** que el daemon corre.

> 🆕 **La proyección y su `Apply(evento, vista)`.** Como el read model es un POCO sin comportamiento, el plegado no vive en él: vive en una `SingleStreamProjection<VistaSuspendida, string>`. Y su `Apply` cambia de forma respecto al del agregado (§29): allí era `Apply(TEvento)` que mutaba `this`; aquí es `Apply(TEvento e, VistaSuspendida v)` —recibe el hecho **y** el documento a mutar—, porque la lógica ya no está dentro del documento. El daemon la corre `Async`, en bucle, con `mt_event_progression` como su checkpoint.

> 🆕 **Async vs Inline: la consistencia es una elección.** Marten puede correr la proyección `Inline` (en la **misma** transacción del hecho): mataría el rezago y sería fuerte-consistente — pero cada escritura carga con proyectar, y no escala a muchas proyecciones o costosas. `Async` (el daemon) la desacopla: escala y no frena la escritura, **a cambio** de rezago. Elegir `Async` es declarar "acepto consistencia eventual aquí"; no es un dictado, es criterio.

> 🆕 **Medir el rezago con Marten.** `store.Advanced.FetchEventStoreStatistics().EventSequenceNumber` es el **high-water** (el último `seq` del diario); `store.Advanced.AllProjectionProgress()` te da el `.Sequence` de cada **shard** —incluye uno llamado `HighWaterMark` (no lo confundas con tu proyección) y el de tu vista, `VistaSuspendida:All`—. El rezago es la resta: high-water menos el `.Sequence` de **tu** shard — tu `FrenteDelDiario() − LeerCursor()` de [El rezago](./el-rezago.md), ahora con la API de la librería.

> 🛠️ **Inténtalo tú.** Haz que esto pase: suspendes emp-14 por el bus, con `await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"))`, y, al instante, la vista va **atrás** (rezago > 0); esperas, el daemon **alcanza** (rezago 0), y emp-14 aparece al consultar `VistaSuspendida`. Para eso: (1) un read model `VistaSuspendida { Id, Suspendida, Plan }` con setters **públicos**; (2) `public partial class SuspendidasProjection : SingleStreamProjection<VistaSuspendida, string>` (el `partial` es obligatorio: Marten le genera código en una clase compañera) con `Apply(EmpresaRegistrada e, VistaSuspendida v)`, `Apply(PlanCambiado …)` (para que el plan sea el de hoy), `Apply(EmpresaSuspendida …)`, `Apply(EmpresaReactivada …)` y `Apply(SuspensionRevertida …)` (desde [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md), una suspensión revertida también deja a la empresa activa); (3) regístrala `ProjectionLifecycle.Async`, añade `AddAsyncDaemon(DaemonMode.Solo)` al `AddMarten` del host que ya tienes en el `Program.cs` de `Empresas.Historia` desde [El outbox](./el-outbox.md), sin quitarle Wolverine (el daemon corre en ese host); (4) resta high-water − progreso y velo caer a 0, y consulta el documento con `Query<VistaSuspendida>()`. Y **retira lo viejo**: borra la clase `Suspendidas`, `CorrerProyector`, la tabla `empresas_estado` y la tabla `checkpoint` — `VistaSuspendida` + el daemon + `mt_event_progression` las reemplazan.

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
// el daemon corre en un HOST vivo: el mismo del Program.cs de Empresas.Historia (§30).
// Suma la proyección y el daemon a lo que ya tenías.
// AddMarten y AddWolverine: deja los tuyos tal como los tienes; este extracto no trae todas sus líneas.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);   // nuevo
})
.UseLightweightSessions()
.IntegrateWithWolverine()                    // el outbox de §30, sigue
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

Es tu `Rezago()` de [El rezago](./el-rezago.md) —`FrenteDelDiario() − LeerCursor()`— con la API de Marten: el high-water es el frente, el progreso de la proyección es el cursor, `mt_event_progression` es la tabla que Marten administra en vez de tu `checkpoint`. ¿Y tu 2ª vista `pagos` de [La vista por consulta](./la-vista-por-consulta.md), la que era *por hecho* (una fila por evento)? No es una `SingleStreamProjection` (que es *por estado*): se modela con otra clase de proyección por evento — mismo daemon, otra forma; queda como ejercicio.

</details>

> 🔍 **¿Lo lograste?** En la primera corrida, el rezago al instante puede salir mayor que el de una suspensión. Una proyección `Async` nueva empieza desde el principio del diario: el daemon lo rejuega **todo**. Por eso la vista trae todas tus empresas suspendidas, no solo emp-14. El rezago de un solo acto lo mides en una segunda corrida, con el daemon al día: es el Rómpelo. En CosmosLens, el panel de rezago muestra tu shard, `VistaSuspendida:All`.

## 🔨 Rómpelo: el read-your-write, y la vista en blanco

**El rezago:** emp-14 quedó suspendida en el reto. Quita de tu `Program.cs` su siembra y su suspensión, y pon esto en su lugar:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-14", new PagoRegistrado(50_000), new EmpresaReactivada());   // la reactiva, como en El proceso tiene dueño
    await s.SaveChangesAsync();
}
await Task.Delay(3000);                                          // que el daemon alcance
await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));
// de inmediato, y otra vez tras esperar: mide el rezago y carga la vista con LoadAsync<VistaSuspendida>("emp-14")
// al instante:  rezago 2   emp-14 Suspendida=False
// tras esperar: rezago 0   emp-14 Suspendida=True
```

Justo después de suspender, la vista todavía no lo sabe: el rezago son los hechos que el `SuspenderHandler` acaba de escribir. Espera un instante y vuelve: aparece. Es el read-your-write roto de [El rezago](./el-rezago.md), ahora con el daemon: escribir al diario es fuerte-consistente, pero la **vista** que el daemon deriva va **atrás**. El bloque reactiva y suspende en cada corrida, así que lo puedes repetir.

**La vista en blanco:** intenta usar tu `Empresa` (setters privados) como el read model de un snapshot. Agrega esta línea al `AddMarten`: le pide al daemon guardar cada `Empresa` como un documento.

```csharp
opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Async);   // SnapshotLifecycle vive en JasperFx.Events.Projections
```

Espera unos segundos a que el daemon lo construya y consulta `await s.Query<Empresa>().ToListAsync()`. Cada empresa sale con valores por defecto (`Id` y `Nombre` vacíos, `Suspendida=False`), aunque su JSON en `mt_doc_empresa` está completo: el snapshot persistido se releyó y el deserializador no pudo setear lo privado. Por eso el read model es una clase aparte con setters públicos. Al terminar, quita la línea y borra en `psql` el progreso de ese snapshot, para que no quede un shard detenido: `DELETE FROM mt_event_progression WHERE name = 'Empresa:All';`.

## El Descubrimiento

Tu proyector en bucle es el **daemon**; tu tabla `checkpoint` es `mt_event_progression`; y tu vista es una **proyección** que el daemon mantiene. Al adoptarlo aprendiste algo que el swap del diario no te había forzado: el modelo de **escritura** (el agregado encapsulado, rejugado *live*) y el de **lectura** (un documento que el daemon persiste y **relee**) tienen que ser **clases distintas** — un snapshot releído no puede tener setters privados, y por eso el `Apply` de la proyección recibe `(evento, documento)` en vez de mutar `this`. La consistencia eventual no se fue: la moviste de "accidente que mides con sorpresa" a "propiedad que **eliges** (`Async` vs `Inline`), **declaras**, **mides** (`mt_event_progression`) y **operas** (`DaemonMode`)".

> 🌱 `VistaSuspendida` se alimenta de un solo stream por documento: el de cada empresa. Pero la pregunta que dejó [El proceso tiene dueño](./el-proceso-tiene-dueno.md) —¿en qué va cada suspensión, con el nombre y el plan de su empresa?— junta hechos de **dos** tipos de stream: la empresa y su proceso. Una proyección por stream no la responde. Lo resuelves en [El tablero cruza streams](./el-tablero-cruza-streams.md).

## ✅ Compruébalo

- [ ] La vista es un read model aparte (`VistaSuspendida`, POCO, setters públicos), no tu agregado `Empresa` (setters privados) — y viste la vista salir en blanco al intentar lo segundo.
- [ ] `SuspendidasProjection : SingleStreamProjection<…>` es `partial`, registrada `Async`, y el daemon (en un host vivo) la mantiene sin que llames a ningún `CorrerProyector()`; la consultas con `Query<VistaSuspendida>()`.
- [ ] Mides el rezago (high-water − progreso) y lo ves > 0 tras escribir y 0 cuando el daemon alcanza.
- [ ] Retiraste lo viejo (`Suspendidas`, `CorrerProyector`, `empresas_estado`, `checkpoint`); sabes qué los reemplaza y por qué elegiste `Async` sobre `Inline`.

## 🆘 Si algo salió mal

- **La vista sale en blanco al consultarla:** tu read model tiene setters privados. Un documento que el daemon persiste y relee necesita setters **públicos**; el agregado encapsulado es otra clase.
- **`SingleStreamProjection` no compila:** vive en `Marten.Events.Aggregation`, y la clase debe ser `partial`. Los otros `using` de Marten 9 son poco obvios: `StreamIdentity` → `JasperFx.Events`; `ProjectionLifecycle` → `JasperFx.Events.Projections`; `DaemonMode` → `JasperFx.Events.Daemon`.
- **`progreso[0]` lanza `ArgumentOutOfRangeException` o el rezago sale 0 siempre:** al arrancar la lista está vacía, y su primer elemento suele ser el shard `HighWaterMark`, no tu proyección. Selecciona por nombre (`FirstOrDefault(x => x.ShardName == "VistaSuspendida:All")`) y coalesce el vacío (`?? 0`).
- **El rezago tarda en llegar a 0 y el log repite `High Water agent is stale`:** tu diario tiene un hueco en su secuencia: un `seq` que tomó una transacción que luego se deshizo, como los choques de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). El daemon espera 3 segundos antes de saltarlo. Espera un poco más y vuelve a medir.
- **La vista nunca se llena / el rezago no baja:** ¿registraste `Async` **y** añadiste `AddAsyncDaemon`, **y** el host sigue vivo (`host.StartAsync()` sin que el proceso termine)? Sin daemon corriendo, una proyección async no avanza.
- **No sabes consultar la vista:** es un **documento** de Marten — `await session.Query<VistaSuspendida>()...ToListAsync()` o `LoadAsync<VistaSuspendida>(id)`, no el event store.

## 📓 Registra tu avance

> 💭 **Reto:** en [El rezago](./el-rezago.md) mediste el rezago con `FrenteDelDiario() − LeerCursor()`. Empareja cada mitad con su equivalente de Marten, y explica por qué la vista del daemon va atrás aunque escribir y rehidratar el stream sean fuerte-consistentes. Y: ¿por qué elegirías `Async` sobre `Inline` para esta vista?

```bash
git add .
git commit -m "ES · El daemon y la consistencia eventual" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Tu proyector en bucle es el **daemon** de Marten y tu `checkpoint` es `mt_event_progression`; la vista se vuelve una proyección (un read model POCO de setters públicos, distinto del agregado encapsulado, porque el daemon la persiste como snapshot y la relee), su `Apply` recibe `(evento, documento)`, y la consistencia eventual pasa de accidente a algo que eliges (`Async` vs `Inline`), declaras, mides (el rezago) y operas (`DaemonMode`).

---

[⬅️ Volver: El proceso tiene dueño](./el-proceso-tiene-dueno.md)

[➡️ Siguiente: El tablero cruza streams](./el-tablero-cruza-streams.md)
