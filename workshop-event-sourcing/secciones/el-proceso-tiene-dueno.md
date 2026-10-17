# El proceso tiene dueño

Tu `Empresa` sabe ahora mucho más que de sí misma.

## 🎯 El Objetivo

Que el proceso de suspender una empresa tenga su propio dueño, con su propio diario y su propio id, y que cada respuesta llegue a la suspensión que le corresponde.

## 💥 El dolor: la respuesta tardía confirma la suspensión equivocada

Mira lo que carga tu `Empresa` desde [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md): el estado de Facturación, el de Accesos, si la suspensión es efectiva, si se revirtió, si venció, si hay accesos por restituir. Nada de eso es la empresa: es el **proceso** de suspenderla. El día que haya otro proceso (reactivarla, cambiarle el plan con aprobación), la empresa cargará con ese también.

Y hay algo peor, que no se ve hasta que pasa. Las respuestas llegan con el NIT, y por el NIT encuentras **la empresa**, no **la suspensión**. Con el código que tienes, esta escena termina así:

```
1. Suspendes emp-12. Los dos socios contestan: la suspensión queda efectiva.
2. emp-12 paga y se reactiva. La vuelves a suspender, y esta vez Accesos no contesta.
3. Llega otra vez, tarde, la respuesta de Accesos a la PRIMERA suspensión: AccesosRevocadosV1("901200000").
```

```
emp-12: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True
diario: … → v8:empresa_suspendida → v9:cobro_de_multa_confirmado → v10:revocacion_de_accesos_confirmada → v11:suspension_efectiva
```

La segunda suspensión quedó **efectiva**, y Accesos nunca cortó nada para ella: la respuesta era de la primera. El transporte entrega *al menos una vez*, como viste en [Llegó dos veces](./llego-dos-veces.md), así que una reentrega tardía va a pasar. Tu filtro de respuestas repetidas no la frena: la segunda suspensión dejó a Accesos otra vez `EnCurso`. La empresa sigue entrando, y tu sistema dice que no puede. Sin un solo error.

Es la pregunta que se hizo el equipo de la organización: *¿hace falta un "proceso de la obligación por pagar"?* Sí, y este es el porqué.

## 🔧 Un dueño, con su diario y su nombre

> 🆕 **El proceso con dueño (*process manager*).** Un proceso que espera respuestas de varios lados se vuelve **alguien**: tiene su propio stream (una suspensión, un stream), su propio id, y es quien decide qué sigue cuando llega cada respuesta. Su id viaja en cada mensaje del proceso, de ida y de vuelta: es la **correlación**. Así una respuesta encuentra la suspensión exacta, no solo la empresa. En la obligación por pagar de la organización, esa correlación ya existe: la obligación le manda a Impuestos y a Contabilidad su propio id, `ReferenciaOrigen = "comercio-{id}"`, y ellos lo devuelven.

Lo mínimo sería poner el `SuspensionId` en los mensajes y que la `Empresa` ignore las respuestas que no son de su suspensión en curso. Pero una respuesta de una suspensión anterior puede traer información real. Si esa suspensión venció sin respuesta, la respuesta dice que Accesos sí cortó: un hecho que hay que anotar, y quizá compensar. Y el estado de esa suspensión ya no existe: el `Apply(EmpresaSuspendida)` de la siguiente lo limpió. No hay dónde anotarla. Con una suspensión por stream, cada instancia conserva su estado.

### Antes de empezar · una empresa limpia

Tu `emp-11` arrastra la historia de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md). De tu `Program.cs`, quita la siembra y los pasos de esa sección, también la línea de `ConAcuerdoDePago`, y deja el host, `store` y `bus`. Siembra una empresa nueva:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-12", new EmpresaRegistrada("901200000", "Taller Oriente", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y el `SuspenderHandler` la lee. Agrégala en `psql`:

```sql
INSERT INTO localizador(nit, stream) VALUES ('901200000', 'emp-12');
```

Después de la primera corrida, quita la siembra: volver a sembrar emp-12 lanza `ExistingStreamIdCollisionException`. Cada vez que esta sección vuelve a suspender emp-12, antes la reactiva con un `Append` directo, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md). Son dos versiones más en su diario:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-12", new PagoRegistrado(50_000), new EmpresaReactivada());
    await s.SaveChangesAsync();
}
```

Las versiones y los ids de las salidas esperadas suponen que corres cada experimento una vez, en orden.

### Paso 1 · El proceso, en su propio stream

> 🛠️ **Inténtalo tú.** Haz que suspender abra un proceso con su propio id:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-12", "mora"));
> // SELECT id, type FROM mt_streams WHERE id LIKE '%emp-12%';
> //   emp-12        | empresa
> //   susp-emp-12-2 | suspension_de_empresa
> // emp-12: Suspendida=True ProcesoAbierto=susp-emp-12-2
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea la clase `SuspensionDeEmpresa`, con `Id`, `EmpresaId`, `Nit` y `Version`. **Muda** a ella, desde la `Empresa`, todo lo del proceso: los estados de Facturación y Accesos, `Efectiva`, `Revertida`, `Vencida`, sus `Apply` y los métodos que deciden (`ConfirmarCobroDeMulta`, `RechazarCobroDeMulta`, `ConfirmarRevocacionDeAccesos`, `ConfirmarRestitucionDeAccesos`, `RevisarPlazo`). `RevisarPlazo` pierde el `!Suspendida`: el proceso no sabe de la empresa. **(2)** El proceso nace con un hecho propio, `SuspensionSolicitada(EmpresaId, Nit, Plan)`, que deja a los dos socios `EnCurso`. La reversión se parte en dos hechos, uno por stream. En el proceso, `ProcesoRevertido(Razon)`: `RechazarCobroDeMulta` lo emite en vez de `SuspensionRevertida`. En la empresa se queda `SuspensionRevertida`, con su `Apply`, que la deja activa. **(3)** La `Empresa` se queda con lo suyo: `Suspendida`, y de qué proceso viene, `ProcesoAbierto`. Con él, quien mira la empresa llega a su suspensión en curso. Para eso `EmpresaSuspendida` gana el id del proceso: `EmpresaSuspendida(Motivo, SuspensionId)`. Cuando la empresa vuelve a estar activa, por reactivación o por reversión, `ProcesoAbierto` vuelve a `null`. **(4)** En el `SuspenderHandler`, el id es `$"susp-{cmd.EmpresaId}-{empresa.Version + 1}"`: la versión en que nace la suspensión, única para siempre. Anota `EmpresaSuspendida` en la empresa y abre el proceso con `StartStream<SuspensionDeEmpresa>(id, ...)`, en la misma sesión: los dos streams entran en una sola transacción. El plazo que ya devolvía pasa a ser del proceso: `RevisarSuspension(SuspensionId)`, con ese id. **(5)** `RespuestasHandler` y `PlazoHandler` llaman métodos que ya no están en la `Empresa`: quedan obsoletos. Bórralos; el Paso 3 los reemplaza. Los contratos V1 se quedan declarados en `Contratos`; solo se borran sus handlers.

Los `empresa_suspendida` que ya guardaste se leen con `SuspensionId` en `null`, como viste en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md). Ese `null` es la verdad histórica: nacieron antes de que hubiera proceso. La forma se reforma; el proceso no se inventa.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: la empresa vuelve a ser solo la empresa
public record EmpresaSuspendida(string Motivo, string SuspensionId);

public class Empresa
{
    // … Id, Nit, Nombre, Plan, DeudaPendiente, Reactivaciones, Version, como antes …
    public bool Suspendida { get; private set; }
    public string? ProcesoAbierto { get; private set; }

    public void Apply(EmpresaSuspendida e)   { Suspendida = true; DeudaPendiente = true; ProcesoAbierto = e.SuspensionId; }
    public void Apply(EmpresaReactivada e)   { Suspendida = false; Reactivaciones++; ProcesoAbierto = null; }
    public void Apply(SuspensionRevertida e) { Suspendida = false; ProcesoAbierto = null; }
}
```

```csharp
// Empresas.Historia: el proceso, en su propio stream
public record SuspensionSolicitada(string EmpresaId, string Nit, string Plan);
public record ProcesoRevertido(string Razon);         // la reversión, dentro del proceso; la empresa se queda con su SuspensionRevertida
public record RevisarSuspension(string SuspensionId); // el plazo, ahora del proceso

public class SuspensionDeEmpresa
{
    public string Id { get; private set; } = "";
    public string EmpresaId { get; private set; } = "";
    public string Nit { get; private set; } = "";
    public long Version { get; private set; }
    public EstadoIntegracion Facturacion { get; private set; }
    public EstadoIntegracion Accesos { get; private set; }
    public bool Efectiva { get; private set; }
    public bool Revertida { get; private set; }
    public bool Vencida { get; private set; }

    public void Apply(SuspensionSolicitada e)
    {
        EmpresaId = e.EmpresaId; Nit = e.Nit;
        Facturacion = EstadoIntegracion.EnCurso; Accesos = EstadoIntegracion.EnCurso;
    }
    public void Apply(ProcesoRevertido e) { Revertida = true; }
    // … y los Apply y los métodos que deciden, mudados desde la Empresa, con dos cambios:
    //   RechazarCobroDeMulta emite ProcesoRevertido en vez de SuspensionRevertida,
    //   y RevisarPlazo empieza con if (Efectiva || Revertida) return [];  (sin el !Suspendida) …
}
```

```csharp
// Empresas.Historia: suspender anota en la empresa y abre el proceso, en una transacción
public static async Task<(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)> Handle(
    SuspenderEmpresa cmd, IDocumentSession session)
{
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId);
    if (empresa!.Suspendida) return (null, null);

    var suspensionId = $"susp-{cmd.EmpresaId}-{empresa.Version + 1}";
    var nit = Localizador.NitDe(cmd.EmpresaId);
    session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo, suspensionId));
    session.Events.StartStream<SuspensionDeEmpresa>(suspensionId, new SuspensionSolicitada(cmd.EmpresaId, nit, empresa.Plan));
    return (new EmpresaSuspendidaV2(nit, cmd.Motivo, empresa.Plan),
            new RevisarSuspension(suspensionId).DelayedFor(TimeSpan.FromSeconds(5)));   // el plazo, con el id del proceso
}
```

Una suspensión nueva es un stream nuevo: ya no hay estados que limpiar al empezar.

</details>

Los socios siguen como los dejó [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md), escuchando el anuncio. En el log, el plazo y las respuestas V1 salen sin nadie que las reciba (`No routes can be determined`): sus handlers los borraste. Si conservas el orden por llave de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), las V1 llegan a su cola, y el aviso es `No known handler`.

### Paso 2 · Pedir con la correlación

Hasta aquí, los socios reaccionaban al anuncio público, `EmpresaSuspendidaV2`. Pero ese anuncio es para el mundo: dice que algo pasó, no le pide nada a nadie, y no lleva el id de la suspensión. Ahora el proceso tiene dueño, y el dueño **pide**: le manda a cada socio un comando con la correlación, y cada socio contesta devolviéndola. Pedir también fija a quién espera el dueño: a quien le pidió, no a quien se haya suscrito al anuncio.

> 🛠️ **Inténtalo tú.** emp-12 quedó suspendida en el Paso 1: reactívala con el `Append` de *Antes de empezar*, y haz que suspenderla pida con la correlación:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-12", "mora"));
> await Task.Delay(2000);
> // susp-emp-12-5: suspension_solicitada
> // multas: una fila más de 901200000, por 50000
> // en el log de Wolverine:
> // No routes can be determined for Envelope #… (Contratos.EmpresaSuspendidaV2)
> // No routes can be determined for Envelope #… (RevisarSuspension)
> // No routes can be determined for Envelope #… (Contratos.AccesosRevocadosV2)
> // No routes can be determined for Envelope #… (Contratos.MultaCobradaV2)
> ```
>
> Para eso: **(1)** Declara en `Contratos` los pedidos `CobrarMultaV1(SuspensionId, Nit, Plan)` y `RevocarAccesosV1(SuspensionId, Nit)`, y las respuestas con la correlación: `MultaCobradaV2`, `MultaRechazadaV2`, `AccesosRevocadosV2` y `AccesosRestituidosV2`, cada una con `SuspensionId` y `Nit` (y `Razon` la de rechazo). La restitución también lleva la correlación: `RestituirAccesosV2(SuspensionId, Nit)`. Son versiones nuevas porque la forma cambió; las de antes se retiran cuando no quede nadie que las use. **(2)** Facturación y Accesos dejan de escuchar `EmpresaSuspendidaV2` y atienden los pedidos, contestando con el `SuspensionId` que recibieron. Accesos vuelve a contestar, sin pausa. **(3)** El `SuspenderHandler` ahora devuelve varios mensajes: el anuncio público (para quien quiera saber), los dos pedidos y el plazo. Para devolver varios mensajes y uno programado, Wolverine trae `OutgoingMessages`: una lista a la que le haces `Add(...)` y `Delay(mensaje, tiempo)`.

El id es `susp-emp-12-5` porque la reactivación sumó dos versiones al diario de emp-12. Facturación cobró, y las dos respuestas salen, pero nadie las recibe todavía: su handler llega en el Paso 3. El plazo tampoco tiene handler, y se descarta. El anuncio ya no tiene suscriptores: su `No routes` es esperado, y lo vas a ver en cada suspensión.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: el dueño pide, con la correlación…
public record CobrarMultaV1(string SuspensionId, string Nit, string Plan);
public record RevocarAccesosV1(string SuspensionId, string Nit);
public record RestituirAccesosV2(string SuspensionId, string Nit);
// …y cada socio contesta devolviéndola
public record MultaCobradaV2(string SuspensionId, string Nit);
public record MultaRechazadaV2(string SuspensionId, string Nit, string Razon);
public record AccesosRevocadosV2(string SuspensionId, string Nit);
public record AccesosRestituidosV2(string SuspensionId, string Nit);
```

```csharp
// Facturacion/FacturacionHandler.cs: el mismo cobro, ahora como respuesta a un pedido
public static object Handle(CobrarMultaV1 msg, Envelope envelope)
{
    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV2(msg.SuspensionId, msg.Nit, "tiene acuerdo de pago");
    // … dedup + INSERT en multas, como siempre …
    //   y siempre, también en una reentrega: return new MultaCobradaV2(msg.SuspensionId, msg.Nit);
}
```

```csharp
// Accesos/AccesosHandler.cs
public static AccesosRevocadosV2 Handle(RevocarAccesosV1 cmd) => new(cmd.SuspensionId, cmd.Nit);
public static AccesosRestituidosV2 Handle(RestituirAccesosV2 cmd) => new(cmd.SuspensionId, cmd.Nit);
```

```csharp
// Empresas.Historia: suspender anota, abre el proceso y pide, todo en una transacción
public static class SuspenderHandler
{
    public static async Task<OutgoingMessages> Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        var salida = new OutgoingMessages();
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId);
        if (empresa!.Suspendida) return salida;                                       // ya lo estaba: nada sale

        var suspensionId = $"susp-{cmd.EmpresaId}-{empresa.Version + 1}";
        var nit = Localizador.NitDe(cmd.EmpresaId);
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo, suspensionId));
        session.Events.StartStream<SuspensionDeEmpresa>(suspensionId, new SuspensionSolicitada(cmd.EmpresaId, nit, empresa.Plan));

        salida.Add(new EmpresaSuspendidaV2(nit, cmd.Motivo, empresa.Plan));   // el anuncio, para quien quiera saber
        salida.Add(new CobrarMultaV1(suspensionId, nit, empresa.Plan));        // los pedidos, a quien tiene que hacer algo
        salida.Add(new RevocarAccesosV1(suspensionId, nit));
        salida.Delay(new RevisarSuspension(suspensionId), 5.Seconds());        // el plazo
        return salida;
    }
}
```

</details>

Agregar la correlación cuando el protocolo ya existe te costó versiones nuevas en los dos lados. Por eso va en el contrato desde el primer mensaje.

### Paso 3 · El dueño decide

> 🛠️ **Inténtalo tú.** Reactiva emp-12 otra vez y haz que cada respuesta llegue al stream de **su** suspensión:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-12", "mora"));
> await Task.Delay(2000);
> // susp-emp-12-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True
> // emp-12: Suspendida=True ProcesoAbierto=susp-emp-12-8
> ```
>
> Para eso, escribe un handler `static`, `ProcesoDeSuspensionHandler`, con un `Handle` por respuesta (y uno por `RevisarSuspension`). Cada uno rehidrata el proceso por el `SuspensionId` del mensaje, le pide la decisión, y la anota con la versión esperada. Como todos hacen lo mismo con distinto método, júntalos en un `Decidir(session, suspensionId, decidir)` privado que reciba la decisión como función. Su tipo es `Func<SuspensionDeEmpresa, object[]>`: como el `Action` de [El despachador](./el-despachador.md), pero devuelve algo, aquí los hechos. Cada `Handle` le pasa la suya en una lambda: `p => p.ConfirmarCobroDeMulta()`. Dos cosas más: si el proceso se revierte, anota también `SuspensionRevertida` en el stream **de la empresa**, en la misma transacción; y si pidió restituir, devuelve `RestituirAccesosV2`. Si tienes el orden por llave de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), pásalo a las cuatro respuestas V2, con `SuspensionId` como llave: el stream que escriben ahora es el del proceso.
>
> Y prueba la escena del dolor, con esa suspensión como la primera. Pon a Accesos en silencio, como en [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md): que su handler devuelva `null`, con el retorno `AccesosRevocadosV2?`. Reactiva emp-12, suspéndela de nuevo, y entrega a mano la reentrega de la respuesta de Accesos a la primera: `await bus.InvokeAsync(new AccesosRevocadosV2("susp-emp-12-8", "901200000"));`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: el dueño del proceso. Cada respuesta va al stream de SU suspensión.
public static class ProcesoDeSuspensionHandler
{
    public static Task<RestituirAccesosV2?> Handle(MultaCobradaV2 m, IDocumentSession s)       => Decidir(s, m.SuspensionId, p => p.ConfirmarCobroDeMulta());
    public static Task<RestituirAccesosV2?> Handle(MultaRechazadaV2 m, IDocumentSession s)     => Decidir(s, m.SuspensionId, p => p.RechazarCobroDeMulta(m.Razon));
    public static Task<RestituirAccesosV2?> Handle(AccesosRevocadosV2 m, IDocumentSession s)   => Decidir(s, m.SuspensionId, p => p.ConfirmarRevocacionDeAccesos());
    public static Task<RestituirAccesosV2?> Handle(AccesosRestituidosV2 m, IDocumentSession s) => Decidir(s, m.SuspensionId, p => p.ConfirmarRestitucionDeAccesos());
    public static Task<RestituirAccesosV2?> Handle(RevisarSuspension r, IDocumentSession s)    => Decidir(s, r.SuspensionId, p => p.RevisarPlazo());

    static async Task<RestituirAccesosV2?> Decidir(IDocumentSession session, string suspensionId, Func<SuspensionDeEmpresa, object[]> decidir)
    {
        var proceso = await session.Events.AggregateStreamAsync<SuspensionDeEmpresa>(suspensionId);
        var hechos = decidir(proceso!);
        if (hechos.Length == 0) return null;                                              // nada nuevo: una reentrega, o el plazo de un proceso ya resuelto
        session.Events.Append(suspensionId, proceso!.Version + hechos.Length, hechos);

        if (hechos.OfType<ProcesoRevertido>().FirstOrDefault() is ProcesoRevertido revertido)
            session.Events.Append(proceso.EmpresaId, new SuspensionRevertida(revertido.Razon));   // la empresa vuelve a estar activa

        return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV2(suspensionId, proceso.Nit) : null;
    }
}
```

```csharp
// Empresas.Historia/Program.cs, dentro de AddWolverine: si tienes el orden por llave, ahora va por proceso
opts.MessagePartitioning
    .ByMessage<MultaCobradaV2>(m => m.SuspensionId)
    .ByMessage<AccesosRevocadosV2>(m => m.SuspensionId)
    .ByMessage<MultaRechazadaV2>(m => m.SuspensionId)        // el rechazo y la restitución, que sumaste en Deshacer en tres sistemas
    .ByMessage<AccesosRestituidosV2>(m => m.SuspensionId);
opts.PublishMessage<MultaCobradaV2>().ToLocalQueue("respuestas");
opts.PublishMessage<AccesosRevocadosV2>().ToLocalQueue("respuestas");
opts.PublishMessage<MultaRechazadaV2>().ToLocalQueue("respuestas");
opts.PublishMessage<AccesosRestituidosV2>().ToLocalQueue("respuestas");
// la línea de PartitionProcessingByGroupId se queda como estaba
```

```csharp
// Accesos/AccesosHandler.cs: en silencio, para la escena
public static AccesosRevocadosV2? Handle(RevocarAccesosV1 cmd) => null;
```

</details>

> 🔍 **¿Lo lograste?** La primera suspensión, completa en su propio stream (el orden de las dos confirmaciones puede variar):
>
> ```
> susp-emp-12-8: suspension_solicitada → cobro_de_multa_confirmado → revocacion_de_accesos_confirmada → suspension_efectiva
> ```
>
> Y tras la reentrega:
>
> ```
> susp-emp-12-8:  Accesos=Aplicado Efectiva=True    ← la reentrega cayó en la primera, que ya tenía a Accesos Aplicado: sin hechos nuevos
> susp-emp-12-11: Accesos=EnCurso  Efectiva=False   ← la segunda sigue esperando a Accesos, como debe
> ```
>
> `ProcesoAbierto` de la empresa es `susp-emp-12-11`. Los procesos de los Pasos 1 y 2, `susp-emp-12-2` y `susp-emp-12-5`, se quedan en `suspension_solicitada`: sus respuestas y sus plazos se perdieron porque nadie los escuchaba. En CosmosLens, cada suspensión es una instancia propia: en tu `procesos.json`, pon `suspension_solicitada` en `Inicia`.

Hay un caso distinto: si la primera hubiera vencido sin respuesta y la de Accesos llegara de verdad tarde, sería un huérfano como el de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md), y su dueño decidiría qué hacer, por ejemplo pedir la restitución.

### Paso 4 · Reconocer: la saga de Wolverine

Lo que acabas de construir tiene nombre en Wolverine: una **saga**. Es una clase que hereda de `Saga`, se crea con un mensaje, maneja las respuestas y se marca terminada. La correlación la toma de una propiedad del mensaje, y tiene sus propios plazos (`TimeoutMessage`). Se muestra para reconocerla, no para construirla:

```csharp
using Wolverine.Persistence.Sagas;   // [SagaIdentityFrom]

public record IniciarSuspension(string SuspensionId, string EmpresaId);
public record PlazoDeSuspension(string SuspensionId) : TimeoutMessage(5.Seconds());

public class SuspensionSaga : Saga, JasperFx.IRevisioned        // ← IRevisioned: ver el ⚠️
{
    public string Id { get; set; } = "";
    public string EmpresaId { get; set; } = "";
    public List<string> Respondieron { get; set; } = new();
    // Version (int) ya viene de Saga: IRevisioned la usa
    // la saga no tiene stream propio: sus hechos caen en el de la empresa, de donde los sacaste en el Paso 1

    public static (SuspensionSaga, PlazoDeSuspension) Start(IniciarSuspension cmd) =>
        (new SuspensionSaga { Id = cmd.SuspensionId, EmpresaId = cmd.EmpresaId }, new PlazoDeSuspension(cmd.SuspensionId));

    public void Handle([SagaIdentityFrom(nameof(MultaCobradaV2.SuspensionId))] MultaCobradaV2 m, IDocumentSession s)         => Registrar("Facturacion", s);
    public void Handle([SagaIdentityFrom(nameof(AccesosRevocadosV2.SuspensionId))] AccesosRevocadosV2 m, IDocumentSession s) => Registrar("Accesos", s);
    public void Handle([SagaIdentityFrom(nameof(PlazoDeSuspension.SuspensionId))] PlazoDeSuspension t, IDocumentSession s)
    {
        s.Events.Append(EmpresaId, new SuspensionVencida("..."));
        MarkCompleted();   // Wolverine borra el documento de la saga
    }

    void Registrar(string socio, IDocumentSession s)
    {
        if (!Respondieron.Contains(socio)) Respondieron.Add(socio);
        if (Respondieron.Count == 2) { s.Events.Append(EmpresaId, new SuspensionEfectiva()); MarkCompleted(); }
    }
}
```

> ⚠️ **La saga sobre Marten, sin `IRevisioned`, pierde respuestas en silencio.** Con una `Saga` simple, dos respuestas que llegan a la vez leen el mismo estado, y la segunda pisa a la primera. Queda una sola en `Respondieron`, sin excepción ni dead letter. La saga vence esperando una respuesta que sí llegó. Es tu carrera de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), dentro de la librería. Declarar `JasperFx.IRevisioned` enciende la versión esperada en el documento de la saga, y el choque sale como `JasperFx.ConcurrencyException`. Tu política de reintento no la atrapa: atrapa `EventStreamUnexpectedMaxEventIdException`, que es hija de `JasperFx.ConcurrencyException`, y la saga lanza la base. Para la saga, reintenta la base, `opts.OnException<JasperFx.ConcurrencyException>()…`, que cubre las dos. La documentación de Wolverine dice que las sagas sobre Marten traen esa comprobación; con sesiones ligeras y una `Saga` simple, no es así.

La saga y tu proceso hacen lo mismo, con una diferencia de fondo: **dónde vive el estado**. La saga es un **documento** de Marten: una fila con el estado de hoy en JSON, en su tabla `mt_doc_suspensionsaga`, que se sobrescribe en cada cambio y se borra al terminar. Tu proceso es un **stream**: guarda cada respuesta como un hecho, para siempre. Con el documento sabes en qué va; con el stream sabes además cómo llegó ahí, CosmosLens lo lee sin tocarte, y lo puedes proyectar. La saga te ahorra piezas: la correlación, el plazo y el cierre vienen hechos. Sirve cuando basta saber en qué va.

En la organización, la librería común no expone la saga de Wolverine. Por eso el orquestador de terceros reimplementó un proceso a mano, como documento, y tiene la misma carrera sin protección. Exponerla en la librería, con `IRevisioned` de serie, es un aporte con dueño claro.

## Coreografía u orquestación

Desde [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md), los socios reaccionaban al anuncio, sin que nadie les pidiera nada: eso es **coreografía**. El estado del proceso lo llevaba un rastreador dentro del agregado de otro, la `Empresa`. En [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md) ya diste el primer paso de orquestación: le pediste a Accesos la restitución con un comando. Pero lo pediste sin dueño. Ahora hiciste **orquestación**: un dueño pide, espera, decide y compensa, con un stream por suspensión.

| | Coreografía | Orquestación |
|---|---|---|
| Quién empuja | Cada socio reacciona a un hecho | Un dueño pide a cada socio |
| Dónde vive el estado del proceso | En el agregado de otro (tu `Empresa`): uno por empresa, no por instancia | En el dueño: un stream por instancia |
| Bueno cuando | Los socios son independientes y a nadie le importa el resultado conjunto | Hay un resultado conjunto con reglas, plazos o compensaciones |
| Lo que cuesta | Responder "¿en qué va?" exige un rastreador aparte, y nadie es dueño de "¿qué hago si uno falla?" | El dueño conoce a sus socios y sus contratos |

La señal para pasar a orquestación es una pregunta: si alguien necesita saber **en qué va** el proceso, o **qué hacer si uno falla**, el proceso necesita dueño. En la obligación por pagar de la organización, el propio equipo llegó a esa conclusión. Hoy es coreografía: dos ramas en paralelo, y ninguna pieza guarda el estado. El dueño natural es la propia obligación por pagar.

## 🔨 Rómpelo: sin correlación

Llegas con emp-12 suspendida: `susp-emp-12-11` espera a Accesos, que sigue en silencio, y su plazo ya venció. Haz que `ProcesoDeSuspensionHandler` busque el proceso por el NIT, con el `ProcesoAbierto` de la empresa, en vez de por el `SuspensionId` del mensaje. Esta vez no reactives ni suspendas: entrega otra vez a mano la misma reentrega, `AccesosRevocadosV2("susp-emp-12-8", "901200000")`. Vuelve el dolor: `susp-emp-12-11` queda `Accesos=Aplicado Efectiva=True`, sin que Accesos haya cortado nada para ella. Una respuesta solo sabe a qué pregunta contesta si lleva la marca de la pregunta.

## El Descubrimiento

Un proceso que espera respuestas de varios lados es **alguien**: un *process manager*, con su propio stream y su propio id. El id viaja en cada pedido y vuelve en cada respuesta, la **correlación**, y es lo único que permite que una respuesta tardía o repetida caiga en la suspensión correcta. El dueño pide (orquestación), decide con la versión esperada, compensa y vence; la empresa vuelve a ser solo la empresa. Wolverine lo trae como **saga**, un documento que guarda el estado de hoy; tu proceso es un stream, que además guarda la historia. Y la decisión de fondo no es de herramienta: es si el proceso necesita dueño, y eso lo dice la pregunta "¿en qué va?".

> 🌱 Ahora los datos de una suspensión están repartidos en dos streams: el nombre en `emp-12`, el estado en `susp-emp-12-…`. Para un tablero de todas las suspensiones, con el nombre de cada empresa, necesitas una vista que se alimente sola de los dos. Y tu read-side quedó apagado desde el swap: las vistas que se mantienen solas, en Marten, las corre el **daemon**. Lo adoptas en [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md).

## ✅ Compruébalo

- [ ] Suspender abre un stream `susp-{empresa}-{versión}` de tipo `suspension_de_empresa`, y la empresa guarda su `ProcesoAbierto`.
- [ ] La `Empresa` ya no tiene estados de integración, plazo ni reversión: viven en `SuspensionDeEmpresa`.
- [ ] Facturación y Accesos atienden pedidos con `SuspensionId` y contestan devolviéndolo.
- [ ] Una respuesta tardía de una suspensión anterior cae en esa suspensión y no toca la abierta.
- [ ] Con un rechazo, el proceso se revierte y la empresa recibe `SuspensionRevertida` en la misma transacción.
- [ ] Sabes decir qué es una saga de Wolverine, por qué necesita `IRevisioned`, y en qué se diferencia de tu proceso como stream.
- [ ] Sabes cuándo un proceso pide orquestación en vez de coreografía.

## 🆘 Si algo salió mal

- **Las respuestas no llegan al proceso y no hay ni dead letters:** Wolverine solo descubre clases cuyo nombre termina en `Handler` (o `Consumer`). `ProcesoDeSuspension` no se descubre; `ProcesoDeSuspensionHandler`, sí. Lo que nadie maneja se descarta con un aviso en el log (`No routes can be determined`).
- **Tras el Paso 1 no compila (`"Empresa" no contiene una definición para "RevisarPlazo"`, y otros así):** quedaron `RespuestasHandler` o `PlazoHandler`, que llaman métodos que se mudaron al proceso. Bórralos: el Paso 3 los reemplaza.
- **Suspender falla con `EventStreamUnexpectedMaxEventIdException` (`Unexpected starting version number for event stream 'emp-12', expected -1 but was -1`), aunque nadie escribió a la vez:** el id del proceso se repitió, y `StartStream` chocó con un stream que ya existe. El mensaje nombra el stream de la empresa, no el del proceso, y tu política de reintento lo repite en vano. Usa la versión en que nace la suspensión (`empresa.Version + 1`), no un id fijo ni un contador propio.
- **La empresa no vuelve a quedar activa tras un rechazo:** el `Decidir` debe anotar `SuspensionRevertida` también en el stream de la empresa, no solo `ProcesoRevertido` en el del proceso.
- **`OutgoingMessages` o `5.Seconds()` no compilan:** vienen de `using Wolverine;` y `using JasperFx.Core;`.
- **Facturación sigue cobrando con el anuncio:** quedó su handler de `EmpresaSuspendidaV2`. Ahora atiende `CobrarMultaV1`; si dejas los dos, cobra dos veces.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué proceso espera respuestas de varios lados? ¿Quién es hoy su dueño, y qué correlación viaja en sus mensajes? Si no tiene dueño, di qué pregunta queda sin respuesta.

```bash
git add .
git commit -m "ES · El proceso tiene dueño (process manager + correlación)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un proceso que espera respuestas de varios lados es alguien: un *process manager* con su propio stream y su propio id, que viaja en cada pedido y vuelve en cada respuesta (la correlación); el dueño pide, decide, compensa y vence, la empresa vuelve a ser solo la empresa, y la saga de Wolverine es lo mismo como documento, con `IRevisioned` para no perder respuestas.

---

[⬅️ Volver: Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md)

[➡️ Siguiente: El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md)
