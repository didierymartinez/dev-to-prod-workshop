# El tablero cruza streams

Soporte ya no pregunta por una empresa: quiere verlas todas en una pantalla.

## 🎯 El Objetivo

Un tablero con una fila por empresa —su nombre, su plan de hoy y en qué va su suspensión— que se mantenga solo.

## 💥 El dolor: la respuesta está repartida en dos streams

Desde [El proceso tiene dueño](./el-proceso-tiene-dueno.md), lo que soporte quiere saber vive en dos lugares. El nombre y el plan están en el stream de la empresa. El estado de la suspensión está en el stream del proceso, `susp-{empresa}-{versión}`.

El intento natural es sumarle el proceso a la vista que ya tienes: a `VistaSuspendida` un `Estado`, y a `SuspendidasProjection` un `Apply(SuspensionSolicitada e, VistaSuspendida v) => v.Estado = "esperando"`. Compila, y el daemon lo corre. Marten guarda cada tipo de documento en su propia tabla, `mt_doc_` y el nombre del tipo. Con una empresa recién suspendida, la vista queda así:

```sql
SELECT id, data->>'Suspendida', data->>'Estado' FROM mt_doc_vistasuspendida WHERE id LIKE '%emp-13%';
-- emp-13        | true  |
-- susp-emp-13-2 | false | esperando
```

El estado no llegó a `emp-13`: cayó en un documento nuevo, `susp-emp-13-2`, que no es de ninguna empresa. Una `SingleStreamProjection` arma un documento por stream, con el id del stream de donde viene el hecho, y `SuspensionSolicitada` viene del stream del proceso.

Los otros reflejos tienen precio:

- **Juntarlo al consultar:** una vista de las empresas y otra de los procesos, cruzadas en memoria. Para "las que están esperando, ordenadas por nombre", el estado está en una y el nombre en la otra: hay que traer las dos enteras y cruzarlas cada vez que alguien abre la pantalla.
- **Copiar el nombre y el plan en el proceso:** `SuspensionSolicitada` ya lleva el plan, pero es el **del momento**, y si la empresa cambia de plan el proceso no se entera. Es la copia que envejece de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md).

Lo que hace falta es un documento que se alimente de los hechos de los dos streams, y que el daemon lo tenga al día.

## 🔧 Una vista que escucha a varios streams

> 🆕 **La proyección multi-stream.** Una `MultiStreamProjection<TDoc, TId>` arma un documento con hechos de **cualquier** stream. La define su regla de identidad: para cada hecho, dice a qué documento va. Aquí el documento es la empresa. Un hecho del stream de la empresa va a su propio id; uno de un proceso va a la empresa de ese proceso, que se lee en el id del stream (`susp-{empresa}-{versión}`, como lo armaste en [El proceso tiene dueño](./el-proceso-tiene-dueno.md)). La regla se declara una vez, con `Identity<IEvent>(...)`. `IEvent` es el sobre `IEvent<T>` de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md), para un hecho de cualquier tipo. Entre sus metadatos trae el `StreamKey`: el id del stream de donde viene el hecho. Los `Apply` reciben el hecho y el documento, como en [El daemon](./el-daemon-y-la-consistencia-eventual.md).

### Antes de empezar · una empresa limpia

De tu `Program.cs`, quita los pasos de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md) y deja el host, `store` y `bus`. Después de `await host.StartAsync()`, siembra una empresa nueva con tu `Sembrar`:

```csharp
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-13", "901300000", "Librería Centro", "Basico");
    await s.SaveChangesAsync();
}
```

En los pasos, los dos socios contestan. Facturación cobra sin cambios: el NIT nuevo no tiene acuerdo de pago.

### Paso 1 · El tablero

> 🛠️ **Inténtalo tú.** Haz que esto salga, con el daemon corriendo:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-13", "mora"));
> await Task.Delay(3000);   // que contesten los dos socios y el daemon alcance
> await using (var s = store.LightweightSession())
> {
>     foreach (var t in await s.Query<Tablero>().ToListAsync())
>         Console.WriteLine($"{t.Id}: {t.Nombre} plan={t.Plan} suspension={t.Suspension} fact={t.Facturacion} acc={t.Accesos} estado={t.Estado}");
> }
> // emp-13: Librería Centro plan=Basico suspension=susp-emp-13-2 fact=Aplicado acc=Aplicado estado=efectiva
> // … y una fila por cada una de tus otras empresas
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea un read model `Tablero` con setters públicos: `Id` (el de la empresa), `Nombre`, `Plan` y `Suspension` (el id del proceso vigente). Súmale `Facturacion`, `Accesos` y `Estado`, los tres como texto. `Facturacion` y `Accesos` empiezan en `"-"`. `Estado` empieza en `"activa"` y pasa a `"esperando"`, `"efectiva"`, `"revertida"` o `"vencida"`. **(2)** Declara `public partial class TableroProjection : MultiStreamProjection<Tablero, string>`. En su constructor va la regla de identidad. Si el `StreamKey` empieza con `susp-`, la empresa es lo que va entre `susp-` y el último guion; si no, el `StreamKey` es la empresa. Para cortarla sirve un rango de C#: `texto[desde..hasta]` toma desde la posición `desde` hasta antes de `hasta`, y `LastIndexOf('-')` te da la posición del último guion. **(3)** Escribe un `Apply` por cada hecho que mueve el tablero. Del stream de la empresa: `EmpresaRegistrada`, `PlanCambiado` y `EmpresaReactivada`. Del stream del proceso: `SuspensionSolicitada`, los hechos de cada respuesta (`CobroDeMultaConfirmado`, `CobroDeMultaRechazado`, `RevocacionDeAccesosConfirmada`, `RestitucionDeAccesosSolicitada`, `RestitucionDeAccesosConfirmada`) y los del cierre (`SuspensionEfectiva`, `ProcesoRevertido`, `SuspensionVencida`). **(4)** Los `Apply` del proceso reciben el hecho envuelto, `IEvent<T>`, para leer su `StreamKey`. El de `SuspensionSolicitada` lo guarda en `Suspension`: esa es la suspensión vigente. Los demás no hacen nada si su `StreamKey` no es `Suspension`: esa comparación es la guarda. Todas las suspensiones de una empresa caen en su fila, y la guarda impide que una respuesta tardía de una anterior pise la vigente: es la correlación de [El proceso tiene dueño](./el-proceso-tiene-dueno.md), en el lado de lectura. **(5)** Regístrala `Async`, junto a tus otras dos, con su porqué al lado, como en [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md): una pantalla de soporte tolera ir un instante atrás, y el daemon que corre `VistaSuspendida` la corre también.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: el read model, una fila por empresa
public class Tablero
{
    public string Id { get; set; } = "";          // el id de la empresa
    public string Nombre { get; set; } = "";
    public string Plan { get; set; } = "";
    public string? Suspension { get; set; }        // el id del proceso vigente
    public string Facturacion { get; set; } = "-";
    public string Accesos { get; set; } = "-";
    public string Estado { get; set; } = "activa";
}
```

```csharp
// Empresas.Historia: la proyección que escucha a los dos streams
using JasperFx.Events;              // IEvent
using Marten.Events.Projections;    // MultiStreamProjection

public partial class TableroProjection : MultiStreamProjection<Tablero, string>
{
    public TableroProjection()
    {
        // a qué tablero va cada hecho: los de la empresa, al suyo; los de un proceso, al de su empresa
        Identity<IEvent>(e => e.StreamKey!.StartsWith("susp-") ? EmpresaDe(e.StreamKey!) : e.StreamKey!);
    }

    static string EmpresaDe(string suspensionId) =>
        suspensionId["susp-".Length..suspensionId.LastIndexOf('-')];   // susp-emp-13-2 → emp-13

    // del stream de la empresa
    public void Apply(EmpresaRegistrada e, Tablero t) { t.Nombre = e.Nombre; t.Plan = e.Plan; }
    public void Apply(PlanCambiado e, Tablero t)      { t.Plan = e.NuevoPlan; }
    public void Apply(EmpresaReactivada e, Tablero t) { t.Estado = "activa"; }

    // del stream del proceso: SuspensionSolicitada fija cuál es la suspensión vigente…
    public void Apply(IEvent<SuspensionSolicitada> e, Tablero t)
    {
        t.Suspension = e.StreamKey; t.Facturacion = "EnCurso"; t.Accesos = "EnCurso"; t.Estado = "esperando";
    }
    // …y los demás solo cuentan si vienen de ella: la correlación
    public void Apply(IEvent<CobroDeMultaConfirmado> e, Tablero t)         { if (e.StreamKey == t.Suspension) t.Facturacion = "Aplicado"; }
    public void Apply(IEvent<CobroDeMultaRechazado> e, Tablero t)          { if (e.StreamKey == t.Suspension) t.Facturacion = "Rechazado"; }
    public void Apply(IEvent<RevocacionDeAccesosConfirmada> e, Tablero t)  { if (e.StreamKey == t.Suspension) t.Accesos = "Aplicado"; }
    public void Apply(IEvent<RestitucionDeAccesosSolicitada> e, Tablero t) { if (e.StreamKey == t.Suspension) t.Accesos = "Restituyendo"; }
    public void Apply(IEvent<RestitucionDeAccesosConfirmada> e, Tablero t) { if (e.StreamKey == t.Suspension) t.Accesos = "Restituido"; }
    public void Apply(IEvent<SuspensionEfectiva> e, Tablero t)             { if (e.StreamKey == t.Suspension) t.Estado = "efectiva"; }
    public void Apply(IEvent<ProcesoRevertido> e, Tablero t)               { if (e.StreamKey == t.Suspension) t.Estado = "revertida"; }
    public void Apply(IEvent<SuspensionVencida> e, Tablero t)              { if (e.StreamKey == t.Suspension) t.Estado = "vencida"; }
}
```

```csharp
// Empresas.Historia/Program.cs, dentro de AddMarten
opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);       // Async: solo la mira soporte; sin AddAsyncDaemon no avanza, y no avisa
opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);   // Inline: Facturación cobra con su respuesta; en Async cobra el plan viejo
opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);           // nuevo · Async: la pantalla de soporte tolera ir un instante atrás
opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));
```

Los hechos que no tienen `Apply` ni le llegan: Marten solo le entrega a la proyección los tipos que maneja. Al tablero no le hace falta `EmpresaSuspendida`: `SuspensionSolicitada` entra en la misma transacción y ya lo mueve.

</details>

> 🔍 **¿Lo lograste?** En `mt_event_progression` aparece un shard nuevo, `Tablero:All`, que avanza junto al de `VistaSuspendida`; su rezago se mide como en [El daemon](./el-daemon-y-la-consistencia-eventual.md), y CosmosLens lo muestra en el panel de rezago. Como toda proyección `Async` nueva, rejuega el diario entero: por eso salen filas de todas tus empresas. Las que suspendiste antes de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) salen sin suspensión (`suspension=` vacía, `fact=-` y `acc=-`): sus hechos de proceso vivían en el stream de la empresa, y la guarda los descarta.

### Paso 2 · El plan de hoy, no el del momento

> 🛠️ **Inténtalo tú.** emp-13 paga, se reactiva y pasa a Premium. Suspéndela otra vez y consulta el tablero:
>
> ```csharp
> await using (var s = store.LightweightSession())
> {
>     s.Events.Append("emp-13", new PagoRegistrado(50_000), new EmpresaReactivada(), new PlanCambiado("Premium"));
>     await s.SaveChangesAsync();
> }
> await bus.InvokeAsync(new SuspenderEmpresa("emp-13", "mora otra vez"));
> await Task.Delay(3000);
> // … y la consulta del tablero del Paso 1:
> // emp-13: Librería Centro plan=Premium suspension=susp-emp-13-6 fact=Aplicado acc=Aplicado estado=efectiva
> ```
>
> Quita de tu `Program.cs` la siembra de *Antes de empezar* y la suspensión del Paso 1: emp-13 ya existe y ya está suspendida. Este bloque va en su lugar. El id termina en `-6` porque emp-13 iba en la versión 5: registro, suspensión, pago, reactivación y cambio de plan. Al lado, consulta en `psql` el plan que guardó cada proceso al nacer:
>
> ```sql
> SELECT stream_id, data->>'Plan' FROM mt_events
> WHERE type = 'suspension_solicitada' AND stream_id LIKE 'susp-emp-13-%' ORDER BY seq_id;
> -- susp-emp-13-2 | Basico
> -- susp-emp-13-6 | Premium
> ```

Cada proceso guarda el plan **del momento** en que nació, y está bien: es un hecho. El tablero muestra el plan **de hoy**, porque lo toma del stream de la empresa, que es su dueño. Es la regla de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), ahora en el lado de lectura.

## 🔨 Rómpelo: la regla y la guarda son el diseño

Cambia la regla para que cada hecho vaya al documento de **su** stream, sin mapear los procesos a su empresa: `Identity<IEvent>(e => e.StreamKey!)`. El daemon no rejuega lo que ya proyectó, así que rearma el tablero con tu orden de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md). Deja en tu `Program.cs` solo la espera y la consulta del tablero, y antes de ellas:

```csharp
await Vistas.Rearmar(host, "Tablero");   // el nombre del read model
```

Deja esa línea mientras dure este 🔨: cada cambio a la regla o a la guarda pide rearmar, y así cada arranque rearma. Arranca. Las filas de emp-13 quedan así:

```
emp-13: Librería Centro plan=Premium suspension= fact=- acc=- estado=activa
susp-emp-13-2:  plan= suspension=susp-emp-13-2 fact=Aplicado acc=Aplicado estado=efectiva
susp-emp-13-6:  plan= suspension=susp-emp-13-6 fact=Aplicado acc=Aplicado estado=efectiva
```

Cada suspensión quedó en un documento huérfano, sin nombre, y la fila de la empresa dice "activa". Nada falló: en una multi-stream, decidir a qué documento va cada hecho **es** el diseño de la vista. Vuelve a poner la regla.

Ahora la guarda. Para verla trabajar hace falta una respuesta tardía que deje hechos: la de una suspensión que todavía esperaba a Accesos. Pon a Accesos en silencio, como en [El proceso tiene dueño](./el-proceso-tiene-dueno.md): que su handler de `RevocarAccesosV1` devuelva `null`. Entre el rearmado y la espera, suma esto:

```csharp
for (var i = 0; i < 2; i++)   // dos veces: paga, se reactiva y la suspendes (susp-emp-13-9 y susp-emp-13-12)
{
    await using (var s = store.LightweightSession())
    {
        s.Events.Append("emp-13", new PagoRegistrado(50_000), new EmpresaReactivada());
        await s.SaveChangesAsync();
    }
    await bus.InvokeAsync(new SuspenderEmpresa("emp-13", "mora"));
}
await bus.InvokeAsync(new AccesosRevocadosV2("susp-emp-13-9", "901300000"));   // llega tarde la respuesta a la primera
await Task.Delay(7000);   // que venza el plazo de la -12, más la revisión
// … y la espera y la consulta del tablero:
// emp-13: Librería Centro plan=Premium suspension=susp-emp-13-12 fact=Aplicado acc=EnCurso estado=vencida
```

La respuesta tardía cayó en la `susp-emp-13-9`, que quedó efectiva en su stream. La fila sigue con la `susp-emp-13-12`, que venció esperando a Accesos. Quita ese bloque de tu `Program.cs`: emp-13 ya quedó suspendida. Ahora quita la guarda: que los `Apply` del proceso cambien la fila sin comparar el `StreamKey`. Arranca otra vez, y el tablero se rearma sin ella:

```
emp-13: Librería Centro plan=Premium suspension=susp-emp-13-12 fact=Aplicado acc=Aplicado estado=vencida
```

Accesos nunca confirmó la `susp-emp-13-12`. Ese `acc=Aplicado` es de la respuesta tardía a la `susp-emp-13-9`, que cayó en la misma fila. Vuelve a poner la guarda y devuélvele a Accesos su respuesta. La regla decide a qué fila va cada hecho; la correlación decide si le aplica.

**El `Id` lo pone la regla.** Soporte busca por NIT, y la tentación es que el tablero vaya por NIT. Pon `t.Id = e.Nit;` en el `Apply` de `EmpresaRegistrada` y arranca: el tablero se rearma, y la fila sigue siendo `emp-13`. Marten le pone a cada documento el id de la regla de identidad, y pisa el tuyo. Tu línea no hace nada y miente: quien la lea cree que el tablero va por NIT. Quítala: el id del documento se decide en un solo lugar, la regla.

**La regla que va a la base.** Tu regla no toca la base: lee el id del stream. Si el id del proceso no llevara la empresa, la tentación es buscarla en el proceso mismo, que la tiene en su primer hecho. Pruébalo en lugar de tu `Identity`. El daemon lee los hechos en lotes: `CustomGrouping` recibe una sesión y los hechos del lote, y con `grupos.AddEvent(id, hecho)` dices a qué documento va cada uno. `FetchStreamAsync` trae los hechos de un stream, cada uno con su `Data`:

```csharp
// TableroProjection, en el constructor, en lugar de Identity: solo para el 🔨
CustomGrouping(async (session, hechos, grupos) =>
{
    var leidos = 0;
    foreach (var e in hechos)
    {
        if (!e.StreamKey!.StartsWith("susp-")) { grupos.AddEvent(e.StreamKey!, e); continue; }
        var proceso = await session.Events.FetchStreamAsync(e.StreamKey!);   // el proceso entero
        leidos += proceso.Count;
        grupos.AddEvent(((SuspensionSolicitada)proceso[0].Data).EmpresaId, e);
    }
    Console.WriteLine($"regla: {hechos.Count} hechos en el lote, {leidos} leídos de la base");
});
```

Arranca: el tablero se rearma igual, y cada línea `regla:`, una por lote, dice cuántos hechos traía el lote y cuántos leyó de la base. Cada hecho de un proceso leyó su proceso entero. Los de emp-13 (`SELECT stream_id, count(*) FROM mt_events WHERE stream_id LIKE 'susp-emp-13-%' GROUP BY stream_id;`) tienen 4, 4, 4 y 3 hechos: dentro del total, esos 15 hechos cuestan 57 lecturas (4×4 + 4×4 + 4×4 + 3×3). Un proceso de n hechos cuesta n×n, en cada lote y en cada rearmado, y crece con la historia. Vuelve a poner tu `Identity` y arranca una vez más: tu regla lee cero, porque la llave viaja en el id. Luego quita la línea de `Rearmar`: rearmar se corre cuando hace falta, no en cada arranque.

## ¿Siempre multi-stream?

No. Si todo lo que el documento necesita viene de **un solo** stream, basta una `SingleStreamProjection`, aunque ese stream tenga varios tipos de hechos: "¿en qué va cada suspensión?", sin el nombre de la empresa, sale entera del stream del proceso. Varios proyectos de la organización lo resuelven así. La multi-stream se paga: cada hecho de los tipos que maneja pasa por la regla de identidad, y la regla depende de que el id del stream, o el hecho, diga a qué documento pertenece. Aquí lo dice porque decidiste que el id del proceso lleva el de la empresa. Si no lo lleva, que la llave viaje en el hecho: que cada hecho del proceso cargue el `EmpresaId`. Si no queda más remedio que ir a la base, lee poco: busca primero en el lote, donde la `SuspensionSolicitada` suele venir porque el proceso nació hace poco, y para los procesos de lotes anteriores lee solo el primer hecho, con `FetchStreamAsync(id, version: 1)`.

## ¿Quién consulta cada vista?

Cada vista `Async` registrada es un shard que el daemon trabaja en cada lote: `SELECT name, last_seq_id FROM mt_event_progression;` muestra `VistaSuspendida:All` en el mismo punto que `Tablero:All`. El daemon le pasa cada hecho nuevo y escribe sus documentos, los lea alguien o no, y desde que quitaste el listado de soporte nadie lee `VistaSuspendida`. Una vista sin quien la lea cuesta trabajo y no responde nada: o alguien la consulta, o se retira.

Antes de retirarla, revisa que su reemplazo responda lo mismo para todos tus datos. Aquí no. El tablero no trae el motivo ni la cuenta de suspensiones que soporte pidió en [Reconstruir con el daemon](./reconstruir-con-el-daemon.md). Y una empresa que suspendiste antes de [El proceso tiene dueño](./el-proceso-tiene-dueno.md), y no reactivaste, sale `activa` en el tablero (lo viste en el Paso 1), y `VistaSuspendida` la tiene suspendida, porque lee el `EmpresaSuspendida` del stream de la empresa. Búscalas:

```sql
SELECT v.id FROM mt_doc_vistasuspendida v JOIN mt_doc_tablero t ON t.id = v.id
WHERE v.data->>'Suspendida' = 'true' AND t.data->>'Estado' = 'activa';
-- cada fila es una empresa suspendida que el tablero no ve
```

"¿Está suspendida?" y "¿en qué va su suspensión?" son dos preguntas: `VistaSuspendida` se queda, y le falta quien la lea. Si nadie la necesitara, se retiraría entera: su línea en el `AddMarten`, su modelo, su proyección y, con el programa detenido, su tabla y su fila de progreso (`DROP TABLE mt_doc_vistasuspendida; DELETE FROM mt_event_progression WHERE name = 'VistaSuspendida:All';`). Aquí sí va SQL, porque retirar no es rearmar: tu orden rejuega una vista registrada, y de una vista retirada solo quedan su tabla y su progreso, sin nada que rejugar. Sin el `DELETE`, el panel de rezago vería atrasada, para siempre, una vista que ya no existe. Deja la decisión en `DECISIONES.md`:

```markdown
- El tablero cruza streams: VistaSuspendida se queda, porque responde «¿está suspendida?» también para las empresas de antes del proceso. Toda vista tiene quien la lea; la que no, se retira entera: registro, modelo, tabla y progreso.
```

## El Descubrimiento

En el lado de lectura manda la pregunta, como en [La vista por consulta](./la-vista-por-consulta.md): si la respuesta está repartida en varios streams, el documento se arma con hechos de todos. Una **proyección multi-stream** lo hace con una regla de identidad que dice a qué documento va cada hecho. Esa regla **es** el diseño, y corre por cada hecho, así que tiene que ser barata: la llave viaja en el id o en el hecho. Cuando varios procesos caen en el mismo documento, la correlación decide en cada `Apply` si el hecho es del vigente. El daemon la mantiene como a cualquier otra, con su progreso y su rezago, y cada vista le cuesta trabajo: la que nadie lee se retira, si otra responde lo mismo. Es lo que concluyó el equipo de la organización: *en una coreografía bien hecha, la proyección es la que va acumulando*. Impuestos tiene los dos problemas: cinco vistas que nadie consulta, y una regla que lee la historia entera de cada stream.

> 🌱 Tus comandos todavía entran por una línea de tu `Program.cs`, como `bus.InvokeAsync(new SuspenderEmpresa(...))`. Un servicio de verdad los recibe desde afuera, por HTTP, y por ahí también le preguntan. Ese host web lo montas en [El host y la inyección](./el-host-y-la-inyeccion.md), y ahí `VistaSuspendida` gana quien la lea.

## ✅ Compruébalo

- [ ] `Query<Tablero>()` devuelve una fila por empresa, con su nombre, su plan de hoy y el estado de su suspensión.
- [ ] El shard `Tablero:All` aparece en `mt_event_progression` y su rezago cae a 0.
- [ ] Tras cambiar el plan, el tablero dice el plan nuevo, y cada `SuspensionSolicitada` sigue diciendo el plan con el que nació.
- [ ] Sin el mapeo de procesos a empresas, viste el documento huérfano, y sabes por qué la regla de identidad es el diseño de la vista.
- [ ] Sin la guarda, viste la respuesta tardía de una suspensión anterior pisar la fila de la vigente.
- [ ] Sabes que el `Id` del documento lo pone la regla (asignarlo en un `Apply` miente), y viste la regla que va a la base leer n×n hechos por proceso, frente a cero de la tuya.
- [ ] Sabes cuándo basta una `SingleStreamProjection`.
- [ ] Sabes qué le cuesta al daemon una vista que nadie lee, por qué `VistaSuspendida` se queda, y cómo se retira una vista entera; dejaste la decisión en `DECISIONES.md`.

## 🆘 Si algo salió mal

- **`MultiStreamProjection` o `IEvent` no compilan:** vienen de `using Marten.Events.Projections;` y `using JasperFx.Events;`.
- **El tablero no tiene el estado de la suspensión, o la regla lanza `ArgumentOutOfRangeException`:** un proceso cuyo id no tiene el formato `susp-{empresa}-{versión}` cae en otro documento o rompe el corte. Revisa la regla y cómo arma el id el `SuspenderHandler`.
- **`Suspension` sale vacío y la fila se queda en `esperando`:** el `Apply` de `SuspensionSolicitada` debe recibir `IEvent<SuspensionSolicitada>` y guardar su `StreamKey`, que el hecho solo no trae. Sin ese id, la guarda descarta los demás hechos del proceso.
- **emp-13 se queda en `acc=EnCurso` y `estado=esperando`:** Accesos no contesta. Que su handler de `RevocarAccesosV1` vuelva a devolver `AccesosRevocadosV2`, como en *Antes de empezar* de [El daemon](./el-daemon-y-la-consistencia-eventual.md).
- **El tablero no cambia tras appendear, o tras cambiar la regla o la guarda:** tras appendear, el daemon va atrás: mira el rezago de `Tablero:All` y espera, o revisa que la proyección esté registrada `Async` y el host con `AddAsyncDaemon`. Tras cambiar la regla o la guarda, el daemon no rejuega lo que ya proyectó: rearma el tablero con `await Vistas.Rearmar(host, "Tablero");`.
- **La consulta de las suspendidas que el tablero no ve no devuelve filas:** en tu base no queda ninguna empresa suspendida de antes de [El proceso tiene dueño](./el-proceso-tiene-dueno.md). Las dos preguntas siguen siendo distintas, aunque hoy den lo mismo.
- **Al volver a correr tu `Program.cs`:** la siembra lanza `ExistingStreamIdCollisionException` (emp-13 ya existe), y repetir la suspensión del Paso 1 no hace nada (emp-13 ya tiene su proceso abierto). El bloque del Paso 2 abre otra suspensión en cada corrida, y los ids que siguen cambian: búscalos en `mt_streams`. Deja solo lo que quieres repetir.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué pantalla junta datos de dos agregados distintos? Di cuál sería su regla de identidad, y qué tendría que llevar cada id (o cada hecho) para que la regla funcione.

```bash
git add .
git commit -m "ES · El tablero cruza streams (proyección multi-stream)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Cuando la respuesta está repartida en varios streams, una proyección multi-stream arma un documento con hechos de todos; su regla de identidad es el diseño de la vista y tiene que ser barata; la correlación decide en cada `Apply` si el hecho es de la suspensión vigente; el plan de hoy sale de su dueño, no de la copia del momento; y una vista que nadie lee se retira solo si otra responde lo mismo.

---

[⬅️ Volver: Reconstruir con el daemon](./reconstruir-con-el-daemon.md)

[➡️ Siguiente: El host y la inyección](./el-host-y-la-inyeccion.md)
