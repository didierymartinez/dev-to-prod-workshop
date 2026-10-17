# El tablero cruza streams

Soporte ya no pregunta por una empresa: quiere verlas todas en una pantalla.

## 🎯 El Objetivo

Un tablero con una fila por empresa —su nombre, su plan de hoy y en qué va su suspensión— que se mantenga solo.

## 💥 El dolor: la respuesta está repartida en dos streams

Desde [El proceso tiene dueño](./el-proceso-tiene-dueno.md), lo que soporte quiere saber vive en dos lugares. El nombre y el plan están en el stream de la empresa. El estado de la suspensión está en el stream del proceso, `susp-{empresa}-{versión}`.

El intento natural es sumarle el proceso a la vista que ya tienes. A `VistaSuspendida` le agregas un `Estado`, y a `SuspendidasProjection` un `Apply(SuspensionSolicitada e, VistaSuspendida v) => v.Estado = "esperando"`. Compila, y el daemon lo corre. Marten guarda cada tipo de documento en su propia tabla: `mt_doc_` y el nombre del tipo. Con una empresa recién suspendida, la vista queda así:

```sql
SELECT id, data->>'Suspendida', data->>'Estado' FROM mt_doc_vistasuspendida WHERE id LIKE '%emp-13%';
-- emp-13        | true  |
-- susp-emp-13-2 | false | esperando
```

El estado no llegó a `emp-13`. Cayó en un documento nuevo, `susp-emp-13-2`, que no es de ninguna empresa. Una `SingleStreamProjection` arma un documento por stream, con el id del stream de donde viene el hecho, y `SuspensionSolicitada` viene del stream del proceso.

Los otros reflejos tienen precio:

- **Juntarlo al consultar:** una vista de las empresas, otra de los procesos, y cruzarlas en memoria. Soporte pide "las que están esperando, ordenadas por nombre". El estado está en una vista y el nombre en la otra, así que no hay una sola consulta que filtre por estado y ordene por nombre a la vez. Hay que traer todas las filas de las dos y cruzarlas a mano, cada vez que alguien abre la pantalla.
- **Copiar el nombre y el plan en el proceso:** `SuspensionSolicitada` ya lleva el plan, pero es el **del momento**. Si la empresa cambia de plan después, el proceso no se entera. Es la copia que envejece de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md).

Lo que hace falta es un documento que se alimente de los hechos de los dos streams, y que el daemon lo tenga al día.

## 🔧 Una vista que escucha a varios streams

> 🆕 **La proyección multi-stream.** Una `MultiStreamProjection<TDoc, TId>` arma un documento con hechos de **cualquier** stream. Lo que la define es su regla de identidad: para cada hecho, dice a qué documento va. Aquí el documento es la empresa. Un hecho del stream de la empresa va a su propio id. Un hecho de un proceso va a la empresa de ese proceso, y la puedes leer en el id del stream: lo armaste así en [El proceso tiene dueño](./el-proceso-tiene-dueno.md), `susp-{empresa}-{versión}`. La regla se declara una vez, con `Identity<IEvent>(...)`. `IEvent` es el envoltorio que Marten le pone a cada hecho: el hecho y sus metadatos, entre ellos el `StreamKey`, el id del stream de donde viene. Los `Apply` tienen la misma forma que en [El daemon](./el-daemon-y-la-consistencia-eventual.md): el hecho y el documento.

### Antes de empezar · una empresa limpia

Tus empresas de antes arrastran la historia de las secciones anteriores. De tu `Program.cs`, quita los pasos de [El daemon](./el-daemon-y-la-consistencia-eventual.md) y deja el host, `store` y `bus`. Después de `await host.StartAsync()`, siembra una empresa nueva:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-13", new EmpresaRegistrada("901300000", "Librería Centro", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y el `SuspenderHandler` la lee. Agrégala en `psql`:

```sql
INSERT INTO localizador(nit, stream) VALUES ('901300000', 'emp-13');
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
> Para eso, en `Empresas.Historia`: **(1)** Crea un read model `Tablero` con setters públicos: `Id` (el de la empresa), `Nombre`, `Plan` y `Suspension` (el id del proceso vigente). Súmale `Facturacion`, `Accesos` y `Estado`, los tres como texto. `Facturacion` y `Accesos` empiezan en `"-"`. `Estado` empieza en `"activa"` y pasa a `"esperando"`, `"efectiva"`, `"revertida"` o `"vencida"`. **(2)** Declara `public partial class TableroProjection : MultiStreamProjection<Tablero, string>`. En su constructor va la regla de identidad. Si el `StreamKey` empieza con `susp-`, la empresa es lo que va entre `susp-` y el último guion; si no, el `StreamKey` es la empresa. Para cortarla sirve un rango de C#: `texto[desde..hasta]` toma desde la posición `desde` hasta antes de `hasta`, y `LastIndexOf('-')` te da la posición del último guion. **(3)** Escribe un `Apply` por cada hecho que mueve el tablero. Del stream de la empresa: `EmpresaRegistrada`, `PlanCambiado` y `EmpresaReactivada`. Del stream del proceso: `SuspensionSolicitada`, los hechos de cada respuesta (`CobroDeMultaConfirmado`, `CobroDeMultaRechazado`, `RevocacionDeAccesosConfirmada`, `RestitucionDeAccesosSolicitada`, `RestitucionDeAccesosConfirmada`) y los del cierre (`SuspensionEfectiva`, `ProcesoRevertido`, `SuspensionVencida`). **(4)** Los `Apply` del proceso reciben el hecho envuelto, `IEvent<T>`, para leer su `StreamKey`. El de `SuspensionSolicitada` lo guarda en `Suspension`: esa es la suspensión vigente. Los demás no hacen nada si su `StreamKey` no es `Suspension`: esa comparación es la guarda. Todas las suspensiones de una empresa caen en su fila. Con la guarda, una respuesta tardía de una suspensión anterior no pisa la vigente. Es la correlación de [El proceso tiene dueño](./el-proceso-tiene-dueno.md): también manda en el lado de lectura. **(5)** Regístrala `Async`, junto a la de [El daemon](./el-daemon-y-la-consistencia-eventual.md). Una pantalla de soporte tolera ir un instante atrás, y el mismo daemon corre las dos.

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
opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);
opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);   // nuevo: el mismo daemon la corre
```

Los hechos que no tienen `Apply` ni le llegan: Marten solo le entrega a la proyección los tipos que maneja. Al tablero no le hace falta `EmpresaSuspendida`: `SuspensionSolicitada` entra en la misma transacción y ya lo mueve.

</details>

> 🔍 **¿Lo lograste?** En `mt_event_progression` aparece un shard nuevo, `Tablero:All`, que avanza junto al de `VistaSuspendida`. Y el rezago del tablero se mide igual que el de [El daemon](./el-daemon-y-la-consistencia-eventual.md): frente del diario menos su progreso. En CosmosLens lo ves en el panel de rezago, con su nombre.
>
> Una proyección `Async` nueva empieza desde el principio del diario: rejuega **todo**. Por eso salen filas de todas tus empresas. Las que suspendiste antes de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) salen como si nunca las hubieras suspendido: `suspension=` vacía, `fact=-` y `acc=-`. Sus hechos de proceso vivían en el stream de la empresa, y la guarda los descarta.

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

Cambia la regla para que cada hecho vaya al documento de **su** stream, sin mapear los procesos a su empresa: `Identity<IEvent>(e => e.StreamKey!)`. El daemon no rejuega lo que ya proyectó, así que rearma el tablero. Con tu programa detenido, borra en `psql` sus documentos y su progreso:

```sql
DELETE FROM mt_doc_tablero;
DELETE FROM mt_event_progression WHERE name = 'Tablero:All';
```

Deja en tu `Program.cs` solo la espera y la consulta del tablero, y arráncalo. Las filas de emp-13 quedan así:

```
emp-13: Librería Centro plan=Premium suspension= fact=- acc=- estado=activa
susp-emp-13-2:  plan= suspension=susp-emp-13-2 fact=Aplicado acc=Aplicado estado=efectiva
susp-emp-13-6:  plan= suspension=susp-emp-13-6 fact=Aplicado acc=Aplicado estado=efectiva
```

Cada suspensión quedó en un documento huérfano, sin nombre, y la fila de la empresa dice "activa". Nada falló: la proyección hizo exactamente lo que le dijiste. En una multi-stream, decidir a qué documento va cada hecho **es** el diseño de la vista. Vuelve a poner la regla y rearma el tablero con el mismo SQL.

Ahora la guarda. Para verla trabajar hace falta una respuesta tardía que deje hechos: la de una suspensión que todavía esperaba a Accesos. Pon a Accesos en silencio, como en [El proceso tiene dueño](./el-proceso-tiene-dueno.md): que su handler de `RevocarAccesosV1` devuelva `null`. Antes de la espera y la consulta del tablero, suma esto:

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
await Task.Delay(5000);   // que venza el plazo de la -12
// … y la espera y la consulta del tablero:
// emp-13: Librería Centro plan=Premium suspension=susp-emp-13-12 fact=Aplicado acc=EnCurso estado=vencida
```

La respuesta tardía cayó en la `susp-emp-13-9`, que quedó efectiva en su stream. La fila sigue con la `susp-emp-13-12`, que venció esperando a Accesos. Quita ese bloque de tu `Program.cs`: emp-13 ya quedó suspendida. Ahora quita la guarda: que los `Apply` del proceso cambien la fila sin comparar el `StreamKey`. Rearma el tablero y arranca otra vez:

```
emp-13: Librería Centro plan=Premium suspension=susp-emp-13-12 fact=Aplicado acc=Aplicado estado=vencida
```

Accesos nunca confirmó la `susp-emp-13-12`. Ese `acc=Aplicado` es de la respuesta tardía a la `susp-emp-13-9`, que cayó en la misma fila. Vuelve a poner la guarda, rearma el tablero y devuélvele a Accesos su respuesta. La regla decide a qué fila va cada hecho; la correlación decide si le aplica.

## ¿Siempre multi-stream?

No. Si todo lo que el documento necesita viene de **un solo** stream, basta una `SingleStreamProjection`, aunque ese stream tenga varios tipos de hechos. "¿En qué va cada suspensión?", sin el nombre de la empresa, sale entera del stream del proceso. Varios proyectos de la organización lo resuelven así, y les funciona. La multi-stream se paga: cada hecho de los tipos que maneja, venga del stream que venga, pasa por la regla de identidad, y esa regla depende de que el id del stream (o el hecho) diga a qué documento pertenece. Aquí funciona porque decidiste, en el proceso, que su id lleva el de la empresa. Si no lo lleva, la otra salida es que cada hecho del proceso cargue el `EmpresaId`.

## El Descubrimiento

En el lado de lectura manda la pregunta, como en [La vista por consulta](./la-vista-por-consulta.md): si la respuesta está repartida en varios streams, el documento se arma con hechos de todos. Una **proyección multi-stream** lo hace con una regla de identidad, que dice a qué documento va cada hecho; esa regla **es** el diseño, y se apoya en ids que digan a quién pertenecen. Cuando varios procesos caen en el mismo documento, la correlación decide en cada `Apply` si el hecho es del vigente. El daemon la mantiene como a cualquier otra, con su propio progreso y su propio rezago. Es lo que concluyó el equipo de la organización: *en una coreografía bien hecha, la proyección es la que va acumulando*. Contabilidad ya lo hace con su vista del borrador contable, que junta el borrador y sus entregas.

> 🌱 Tus comandos todavía entran por una línea de tu `Program.cs`, como `bus.InvokeAsync(new SuspenderEmpresa(...))`. Un servicio de verdad los recibe desde afuera, por HTTP. Ese host web lo montas en [El host y la inyección](./el-host-y-la-inyeccion.md).

## ✅ Compruébalo

- [ ] `Query<Tablero>()` devuelve una fila por empresa, con su nombre, su plan de hoy y el estado de su suspensión.
- [ ] El shard `Tablero:All` aparece en `mt_event_progression` y su rezago cae a 0.
- [ ] Tras cambiar el plan, el tablero dice el plan nuevo, y cada `SuspensionSolicitada` sigue diciendo el plan con el que nació.
- [ ] Sin el mapeo de procesos a empresas, viste el documento huérfano, y sabes por qué la regla de identidad es el diseño de la vista.
- [ ] Sin la guarda, viste la respuesta tardía de una suspensión anterior pisar la fila de la vigente.
- [ ] Sabes cuándo basta una `SingleStreamProjection`.

## 🆘 Si algo salió mal

- **`MultiStreamProjection` o `IEvent` no compilan:** vienen de `using Marten.Events.Projections;` y `using JasperFx.Events;`.
- **El tablero no tiene el estado de la suspensión:** revisa la regla de identidad. Un proceso cuyo id no empieza con `susp-`, o no lleva la empresa, cae en otro documento.
- **`ArgumentOutOfRangeException` en la regla:** algún stream empieza con `susp-` y no tiene el formato `susp-{empresa}-{versión}`. Revisa cómo arma el id el `SuspenderHandler`.
- **`Suspension` sale vacío y la fila se queda en `esperando`:** el `Apply` de `SuspensionSolicitada` debe recibir `IEvent<SuspensionSolicitada>` y guardar su `StreamKey`; el hecho solo no lo trae. Sin ese id, la guarda descarta todos los demás hechos del proceso.
- **emp-13 se queda en `acc=EnCurso` y `estado=esperando`:** Accesos no contesta. Devuélvele su respuesta, como en *Antes de empezar* de [El daemon](./el-daemon-y-la-consistencia-eventual.md): que su handler de `RevocarAccesosV1` devuelva `AccesosRevocadosV2`.
- **El tablero no cambia tras appendear:** el daemon va atrás. Mira el rezago de `Tablero:All` y espera, o revisa que la proyección esté registrada `Async` y el host con `AddAsyncDaemon`.
- **Cambiaste la regla o la guarda y el tablero sigue igual:** el daemon no rejuega lo que ya proyectó. Rearma el tablero con el SQL del Rómpelo.
- **Al volver a correr tu `Program.cs`:** la siembra lanza `ExistingStreamIdCollisionException` (emp-13 ya existe), y repetir la suspensión del Paso 1 no hace nada (emp-13 ya está suspendida). El bloque del Paso 2, en cambio, abre otra suspensión en cada corrida, y los ids que siguen cambian: búscalos en `mt_streams`. Deja solo lo que quieres repetir.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué pantalla junta datos de dos agregados distintos? Di cuál sería su regla de identidad, y qué tendría que llevar cada id (o cada hecho) para que la regla funcione.

```bash
git add .
git commit -m "ES · El tablero cruza streams (proyección multi-stream)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Cuando la respuesta está repartida en varios streams, una proyección multi-stream arma un documento con hechos de todos; su regla de identidad —a qué documento va cada hecho— es el diseño de la vista, y la correlación decide en cada `Apply` si el hecho es de la suspensión vigente; el daemon la mantiene como a cualquier otra, y el plan de hoy sale de su dueño, no de la copia del momento.

---

[⬅️ Volver: El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md)

[➡️ Siguiente: El host y la inyección](./el-host-y-la-inyeccion.md)
