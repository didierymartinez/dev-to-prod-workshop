# Deshacer en tres sistemas

Hasta ahora los socios siempre cumplen. Facturación acaba de decir que no.

## 🎯 El Objetivo

Echar atrás una suspensión que otros sistemas ya ejecutaron, sin borrar nada de nadie, y enterarte cuando un socio nunca contesta.

## 💥 El dolor: el no llega cuando el otro ya actuó

Facturación tiene una regla suya: a una empresa con **acuerdo de pago** no se le cobra multa. Cuando le llega la suspensión de una de esas, no cobra; y como ahora contesta, contesta que **no**. Pero para entonces Accesos ya cortó los accesos de esa empresa. Para el negocio, una empresa con acuerdo de pago no se suspende: la suspensión tiene que caerse entera.

¿Por qué no preguntarle a Facturación **antes** de suspender, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md)? Prevenir reduce los casos, pero no los elimina. El acuerdo puede firmarse entre la pregunta y el cobro: es la carrera de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), ahora entre dos contextos. Y hay "no" que nadie sabe antes, como un medio de pago que rebota al cobrar. Por eso siempre hace falta saber deshacer.

¿Cómo se deshace? Los reflejos no sirven:

- **Borrar el hecho del diario:** no. El diario no se reescribe; es lo primero que aprendiste en [El diario de una empresa](./el-diario-de-una-empresa.md), y en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md) viste que ni para corregir la forma se reescribe el disco.
- **Revertir una transacción:** no hay una que abarque a los tres. Cada uno guardó lo suyo en su momento, en su base. [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) ya te mostró que una transacción no abraza dos sistemas.
- **Entrar a la base de Accesos y devolver los accesos:** es de otro contexto. No la ves, y no debes.

Y hay un segundo dolor, más callado: un socio que **nunca contesta**. El estado se queda `EnCurso` para siempre. CosmosLens lo pinta `Vencido`, pero tu sistema no hace nada con eso: nadie lo decidió.

## 🔧 Compensar: cada uno deshace lo suyo, hacia adelante

> 🆕 **Compensar es deshacer con un hecho nuevo, en cada sistema.** Lo que pasó, pasó: no se borra. Se agrega un hecho que anula su efecto. En Empresas, `SuspensionRevertida` dice que la suspensión ya no va, y la empresa vuelve a estar activa. Pero Empresas no puede deshacer lo de Accesos: le **pide** a Accesos que deshaga lo suyo, con un comando (`RestituirAccesosV1`), y Accesos contesta cuando lo hizo (`AccesosRestituidosV1`). Tu `Empresa` lleva la cuenta: la restitución también es una integración que se pide y se confirma.

### Antes de empezar · una empresa limpia

Llegas de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) con la versión esperada en `Anotar` y la política `OnException` que reintenta el choque. Si las quitaste en el 🔨, vuelve a ponerlas. Accesos contesta enseguida, sin pausa, y `RespuestasHandler` ya no tiene las pausas del experimento. Si mantuviste el orden por llave, suma a la misma cola particionada las respuestas nuevas de esta sección: `MultaRechazadaV1` en el Paso 1 y `AccesosRestituidosV1` en el Paso 2, cada una con su `ByMessage` y su `PublishMessage`. Si no, se procesan en paralelo con las otras.

Las empresas de las secciones anteriores arrastran su historia. De tu `Program.cs`, quita el bloque que reactivaba emp-9 y los pasos de la sección anterior, y deja el host, `store` y `bus`. Siembra una empresa nueva:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-11", new EmpresaRegistrada("901100000", "Panadería Sur", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y la suspensión y las respuestas la leen. Agrégala en `psql`:

```sql
INSERT INTO localizador(nit, stream) VALUES ('901100000', 'emp-11');
```

Corre la siembra una vez y quítala: volver a sembrar emp-11 lanza `ExistingStreamIdCollisionException`. Cada paso vuelve a suspender emp-11, así que su diario crece de paso en paso. Las versiones de las salidas esperadas suponen que corres cada experimento una vez, en orden.

### Paso 1 · El no

> 🛠️ **Inténtalo tú.** Haz que esto pase con una empresa que tiene acuerdo de pago:
>
> ```csharp
> FacturacionHandler.ConAcuerdoDePago.Add("901100000");   // Panadería Sur tiene acuerdo de pago
> await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));
> await Task.Delay(2000);
> // emp-11: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True
> // diario: … → v2:empresa_suspendida → v3:cobro_de_multa_rechazado → v4:suspension_revertida → v5:revocacion_de_accesos_confirmada
> ```
>
> Los dos socios contestan enseguida, así que `revocacion_de_accesos_confirmada` puede caer después del rechazo (en `v5`) o antes (en `v3`). Las dos salidas son buenas.
>
> Para eso: **(1)** Declara en `Contratos` la respuesta negativa, `MultaRechazadaV1(Nit, Razon)`. **(2)** En Facturación, la regla: un conjunto `ConAcuerdoDePago` con los NIT que tienen acuerdo de pago (un `HashSet<string>` estático basta para el taller). Si el NIT está, `FacturacionHandler` no cobra y devuelve `MultaRechazadaV1`. Si no está, cobra y devuelve `MultaCobradaV1`, también en una reentrega, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md). Como ahora devuelve uno de dos tipos, su retorno pasa a `object`: Wolverine publica el mensaje que devuelvas, sea del tipo que sea. **(3)** En tu `Empresa`, `EstadoIntegracion` gana `Rechazado`, y hay dos hechos nuevos: `CobroDeMultaRechazado(Razon)` (Facturación queda `Rechazado`) y `SuspensionRevertida(Razon)` (la empresa vuelve a `Suspendida = false` y queda `Revertida`). Un método `RechazarCobroDeMulta(razon)` los decide, igual que los `Confirmar…`. **(4)** En `RespuestasHandler`, un handler de `MultaRechazadaV1`, con la versión esperada como en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). **(5)** Limpia en `Apply(EmpresaSuspendida)` cada estado nuevo que agregues en esta sección: una suspensión nueva empieza de cero.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos
public record MultaRechazadaV1(string Nit, string Razon);
```

```csharp
// Facturacion/FacturacionHandler.cs: la regla es de Facturación
public static HashSet<string> ConAcuerdoDePago { get; } = new();

public static object Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
{
    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");
    // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1, también en una reentrega …
}
```

```csharp
// Empresas.Historia: los hechos nuevos
public record CobroDeMultaRechazado(string Razon);
public record SuspensionRevertida(string Razon);

public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado, Rechazado }

// en tu Empresa
public bool Revertida { get; private set; }

public void Apply(CobroDeMultaRechazado e) { Facturacion = EstadoIntegracion.Rechazado; }
public void Apply(SuspensionRevertida e)   { Suspendida = false; Revertida = true; }
// y en tu Apply(EmpresaSuspendida), al empezar una suspensión nueva: Revertida = false;

public object[] RechazarCobroDeMulta(string razon)
{
    if (Facturacion != EstadoIntegracion.EnCurso) return [];   // reentrega, o nadie lo pidió
    return [new CobroDeMultaRechazado(razon), new SuspensionRevertida(razon)];
}
```

```csharp
// Empresas.Historia, en RespuestasHandler
public static async Task Handle(MultaRechazadaV1 msg, IDocumentSession session)
{
    var id = Localizador.StreamDe(msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
    Anotar(session, id, empresa!, empresa!.RechazarCobroDeMulta(msg.Razon));
}
```

</details>

> 🔍 **¿Lo lograste?** La suspensión se revirtió en Empresas. Pero mira `Accesos=Aplicado`: su confirmación también llegó, y los accesos **siguen cortados**. Empresas deshizo lo suyo; lo de Accesos sigue en pie.

### Paso 2 · Pedirle a Accesos que deshaga lo suyo

Para deshacer lo de Accesos, Empresas le manda un **comando**, `RestituirAccesosV1`, y no un anuncio como `SuspensionRevertidaV1`. Un anuncio no espera respuesta ni sabe a quién le llega. Aquí Empresas necesita que **ese** socio deshaga **eso** y le confirme, porque lleva la cuenta de la restitución. Con un anuncio, Accesos tendría que deducir "revertida, entonces restituyo", y quedaría acoplado al proceso de Empresas.

> 🛠️ **Inténtalo tú.** Que la reversión termine también en Accesos:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));
> await Task.Delay(2000);
> // emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True
> // diario: … → v6:empresa_suspendida → v7:revocacion_de_accesos_confirmada → v8:cobro_de_multa_rechazado → v9:suspension_revertida → v10:restitucion_de_accesos_solicitada → v11:restitucion_de_accesos_confirmada
> ```
>
> Llegas del Paso 1 con emp-11 revertida (`Suspendida=False`): se puede volver a suspender. Su NIT sigue en `ConAcuerdoDePago`. Para que Accesos corte **antes** de que llegue el no, dale una pausa al rechazo: revisar el acuerdo toma su tiempo. En `FacturacionHandler`, pon `await Task.Delay(800)` antes de devolver `MultaRechazadaV1`. Para poder esperar, el handler pasa a `async Task<object>`.
>
> Para eso: **(1)** En `Contratos`, el comando `RestituirAccesosV1(Nit)` y su respuesta `AccesosRestituidosV1(Nit)`. **(2)** En Accesos, un handler de `RestituirAccesosV1` que restituya los accesos y conteste `AccesosRestituidosV1`. **(3)** En tu `Empresa`, `EstadoIntegracion` gana `Restituyendo` y `Restituido`, con dos hechos: `RestitucionDeAccesosSolicitada()` y `RestitucionDeAccesosConfirmada()`. **(4)** Si Accesos ya está `Aplicado` cuando llega el no, `RechazarCobroDeMulta` agrega `RestitucionDeAccesosSolicitada`. Si ese hecho sale entre los decididos, el handler **devuelve** `RestituirAccesosV1`: `hechos.OfType<RestitucionDeAccesosSolicitada>().Any()` te dice si está. **(5)** Un `ConfirmarRestitucionDeAccesos()` en tu `Empresa`, que devuelva `RestitucionDeAccesosConfirmada` solo si Accesos está `Restituyendo`, y un handler de `AccesosRestituidosV1` que anote lo que decida.
>
> Y el caso al revés, el **huérfano**: si el no de Facturación llega **antes** que la confirmación de Accesos, la suspensión ya está revertida cuando Accesos confirma que cortó. Para provocarlo, mueve la pausa: quítasela al rechazo de Facturación y devuélvele a Accesos su pausa de 800 ms. Haz que esto pase:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));
> await Task.Delay(2000);
> // emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True
> // diario: … → v12:empresa_suspendida → v13:cobro_de_multa_rechazado → v14:suspension_revertida → v15:revocacion_de_accesos_confirmada → v16:restitucion_de_accesos_solicitada → v17:restitucion_de_accesos_confirmada
> ```
>
> Para eso, `ConfirmarRevocacionDeAccesos` también pide la restitución cuando la suspensión ya está revertida, y el handler de `AccesosRevocadosV1` devuelve `RestituirAccesosV1`, igual que el del rechazo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos
public record RestituirAccesosV1(string Nit);
public record AccesosRestituidosV1(string Nit);
```

```csharp
// Facturacion/FacturacionHandler.cs: el rechazo, con su pausa (para el huérfano, quítala)
public static async Task<object> Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
{
    if (ConAcuerdoDePago.Contains(msg.Nit))
    {
        await Task.Delay(800);   // revisar el acuerdo toma su tiempo
        return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");
    }
    // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1, también en una reentrega …
}
```

```csharp
// Accesos/AccesosHandler.cs
public static AccesosRestituidosV1 Handle(RestituirAccesosV1 msg) => new(msg.Nit);   // restituye los accesos y lo confirma
```

```csharp
// Empresas.Historia
public record RestitucionDeAccesosSolicitada();
public record RestitucionDeAccesosConfirmada();

public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado, Rechazado, Restituyendo, Restituido }

// en tu Empresa
public void Apply(RestitucionDeAccesosSolicitada e) { Accesos = EstadoIntegracion.Restituyendo; }
public void Apply(RestitucionDeAccesosConfirmada e) { Accesos = EstadoIntegracion.Restituido; }

public object[] RechazarCobroDeMulta(string razon)
{
    if (Facturacion != EstadoIntegracion.EnCurso) return [];
    var hechos = new List<object> { new CobroDeMultaRechazado(razon), new SuspensionRevertida(razon) };
    if (Accesos == EstadoIntegracion.Aplicado) hechos.Add(new RestitucionDeAccesosSolicitada());   // ya cortó: hay que restituir
    return hechos.ToArray();
}

public object[] ConfirmarRevocacionDeAccesos()
{
    if (Accesos != EstadoIntegracion.EnCurso) return [];
    if (Revertida) return [new RevocacionDeAccesosConfirmada(), new RestitucionDeAccesosSolicitada()];   // el huérfano: llegó tarde
    return Facturacion == EstadoIntegracion.Aplicado
        ? [new RevocacionDeAccesosConfirmada(), new SuspensionEfectiva()]
        : [new RevocacionDeAccesosConfirmada()];
}

public object[] ConfirmarRestitucionDeAccesos() =>
    Accesos == EstadoIntegracion.Restituyendo ? [new RestitucionDeAccesosConfirmada()] : [];
```

```csharp
// Empresas.Historia, en RespuestasHandler: el que decide pedir la restitución, la envía
public static async Task<RestituirAccesosV1?> Handle(MultaRechazadaV1 msg, IDocumentSession session)
{
    var id = Localizador.StreamDe(msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
    var hechos = empresa!.RechazarCobroDeMulta(msg.Razon);
    Anotar(session, id, empresa, hechos);
    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;
}

public static async Task<RestituirAccesosV1?> Handle(AccesosRevocadosV1 msg, IDocumentSession session)
{
    var id = Localizador.StreamDe(msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
    var hechos = empresa!.ConfirmarRevocacionDeAccesos();
    Anotar(session, id, empresa, hechos);
    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;
}

public static async Task Handle(AccesosRestituidosV1 msg, IDocumentSession session)
{
    var id = Localizador.StreamDe(msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
    Anotar(session, id, empresa!, empresa!.ConfirmarRestitucionDeAccesos());
}
```

El hecho de la solicitud y el comando a Accesos salen en la **misma** transacción, por el outbox de [El outbox](./el-outbox.md): o se pidió y se anotó, o ninguna de las dos.

</details>

### Paso 3 · El socio que nunca contesta

Para el silencio no hay respuesta que escuchar. Lo que hay es un **plazo**: un mensaje que Empresas se envía a sí misma, para dentro de un rato, y que al llegar revisa si los dos contestaron.

> 🆕 **Un mensaje programado.** Si el handler devuelve el mensaje con `.DelayedFor(TimeSpan)`, Wolverine lo programa para dentro de ese tiempo. `DelayedFor` envuelve tu mensaje en un `DeliveryMessage<T>`: el mensaje y cuándo entregarlo. Wolverine lo guarda en `wolverine_incoming_envelopes` con estado `Scheduled`, en la **misma** transacción del hecho: si la suspensión no se guarda, el plazo tampoco existe. Sobrevive a un reinicio. Y no llega en el segundo exacto, sino en la siguiente revisión: Wolverine revisa los programados cada 5 segundos por defecto (`opts.Durability.ScheduledJobPollingTime`).

> 🛠️ **Inténtalo tú.** Haz que Accesos no conteste nunca y que, a los 5 segundos, esto pase solo:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));
> await Task.Delay(7000);   // el plazo, más la revisión
> // plazo vencido para emp-11: VENCIDA
> // emp-11: Facturacion=Aplicado Accesos=EnCurso Vencida=True
> // diario: … → v18:empresa_suspendida → v19:cobro_de_multa_confirmado → v20:suspension_vencida
> ```
>
> Llegas del huérfano con emp-11 revertida. Esta vez Facturación debe cobrar: quita la línea que mete el NIT en `ConAcuerdoDePago`. Para que Accesos calle, que su handler devuelva `null`; su retorno pasa a `AccesosRevocadosV1?`.
>
> Para eso: **(1)** Un mensaje interno `RevisarSuspension(EmpresaId)` y un hecho `SuspensionVencida(Faltan)`. **(2)** El `SuspenderHandler` devuelve **dos** cosas: el anuncio y el plazo programado. Para devolver dos, usa una tupla de C#, que junta dos valores en uno: `(a, b)`. Wolverine publica cada uno que no sea `null`. El retorno pasa a `(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)`. El plazo es `new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5))`. Si la empresa ya estaba suspendida, devuelve `(null, null)`. **(3)** Un `RevisarPlazo()` en la `Empresa`: si la suspensión ya es efectiva o ya se revirtió, o si la empresa ya no está suspendida, nada; si no, `SuspensionVencida` con los socios que faltan. **(4)** Un handler de `RevisarSuspension` que anote, con la versión esperada, lo que devuelva `RevisarPlazo()`, y que imprima la línea `plazo vencido para …`. **(5)** Para no esperar de más en el taller: `opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();`.

Vencer no es fallar: la respuesta de Accesos todavía puede llegar. `SuspensionVencida` no deshace nada por su cuenta. Deja en el diario que el plazo se cumplió sin respuesta, para que alguien decida: reintentar, llamar al otro equipo o compensar. Esa decisión es del negocio, no del reloj.

¿Qué gana frente al `Vencido` que ya pintaba CosmosLens? El `Vencido` de CosmosLens es la opinión de un observador, con su propia configuración. `SuspensionVencida` es un hecho de tu diario, con fecha, al que el dominio y otros sistemas pueden reaccionar: por ejemplo, la respuesta a soporte puede decir "vencida" y no solo "suspendida". Para que los dos digan lo mismo, el `PlazoSegundos` de Facturación y de Accesos en tu `procesos.json` debe ser el mismo del `DelayedFor`: cámbialo de 30 a 5.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia
public record RevisarSuspension(string EmpresaId);
public record SuspensionVencida(string Faltan);

// en tu Empresa
public bool Vencida { get; private set; }
public void Apply(SuspensionVencida e) { Vencida = true; }
// y en tu Apply(EmpresaSuspendida), al empezar una suspensión nueva: Vencida = false;

public object[] RevisarPlazo()
{
    if (Efectiva || Revertida || !Suspendida) return [];   // ya se resolvió: el plazo no tiene nada que hacer
    var faltan = new List<string>();
    if (Facturacion == EstadoIntegracion.EnCurso) faltan.Add("Facturacion");
    if (Accesos == EstadoIntegracion.EnCurso) faltan.Add("Accesos");
    return [new SuspensionVencida(string.Join(",", faltan))];
}
```

```csharp
// Empresas.Historia: suspender anuncia y programa el plazo, en la misma transacción
public static async Task<(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)> Handle(
    SuspenderEmpresa cmd, IDocumentSession session)
{
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId);
    if (empresa!.Suspendida) return (null, null);
    session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));
    return (new EmpresaSuspendidaV2(Localizador.NitDe(cmd.EmpresaId), cmd.Motivo, empresa.Plan),
            new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5)));
}

public static class PlazoHandler
{
    public static async Task Handle(RevisarSuspension r, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(r.EmpresaId);
        var hechos = empresa!.RevisarPlazo();
        Console.WriteLine($"plazo vencido para {r.EmpresaId}: {(hechos.Length == 0 ? "ya resuelta" : "VENCIDA")}");
        if (hechos.Length > 0) session.Events.Append(r.EmpresaId, empresa.Version + hechos.Length, hechos);
    }
}
```

</details>

> 🔍 **¿Lo lograste?** Mientras esperas, `SELECT status, message_type, execution_time FROM wolverine_incoming_envelopes WHERE status = 'Scheduled'` muestra el plazo esperando su turno. En CosmosLens, busca `emp-11` en **Correlación**, porque el plazo lleva el id de la empresa y no el NIT: aparece como mensaje **programado**.

## 🔨 Rómpelo: la compensación también falla

Llegas del Paso 3 con emp-11 suspendida y vencida, Accesos en silencio, el rechazo de Facturación sin pausa y el NIT fuera de `ConAcuerdoDePago`. Prepara el rechazo otra vez. Devuélvele a Accesos su respuesta: que vuelva a devolver `AccesosRevocadosV1`, con su pausa de 800 ms. Vuelve a meter el NIT en `ConAcuerdoDePago`. Y reactiva emp-11 con un `Append` directo, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md):

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-11", new PagoRegistrado(50_000), new EmpresaReactivada());
    await s.SaveChangesAsync();
}
```

Ahora haz que el handler de `RestituirAccesosV1` en Accesos lance una excepción, y suspende emp-11. El no llega primero. Cuando Accesos confirma, Empresas pide la restitución, como en el huérfano. Ahí se queda:

```
emp-11: Facturacion=Rechazado Accesos=Restituyendo Revertida=True
diario: … → v23:empresa_suspendida → v24:cobro_de_multa_rechazado → v25:suspension_revertida → v26:revocacion_de_accesos_confirmada → v27:restitucion_de_accesos_solicitada
```

El comando cae en dead letters: `wolverine_dead_letters` tiene una fila nueva, `RestituirAccesosV1` con su `InvalidOperationException`. Compensar es otra integración, con sus propias fallas. Ahora tu sistema lo **sabe**: el estado lo dice. En CosmosLens, busca el NIT `901100000` en **Correlación**, porque el comando lleva el NIT y no el id de la empresa: aparece como mensaje muerto. Pero nadie lo arregla solo. Compensar no garantiza volver al principio: garantiza saber en qué punto quedó cada uno.

Para que el panel **Procesos** muestre la restitución, agrégala a tu `procesos.json` como una integración más. Su `"Solicitado"` dice qué hecho la pide; antes de ese hecho, sale `SinSolicitar`.

```json
{ "Nombre": "Restitución de accesos", "Solicitado": [ "restitucion_de_accesos_solicitada" ],
  "Aplicado": [ "restitucion_de_accesos_confirmada" ], "PlazoSegundos": 30 }
```

Y a Facturación agrégale su rechazo: `"Rechazado": [ "cobro_de_multa_rechazado" ]`.

## El Descubrimiento

Entre varios sistemas no hay transacción que revertir: cada uno guardó lo suyo en su momento. Deshacer es **compensar**: cada sistema anula su propio efecto con un hecho nuevo, y quien lleva el proceso pide cada compensación como una integración más, que se solicita y se confirma. Las respuestas pueden llegar en cualquier orden, y una confirmación tardía de algo que ya se revirtió (el huérfano) también se compensa. Al silencio se le responde con un plazo: un mensaje programado, durable y atómico con el hecho, que al vencer deja constancia y no decide solo.

En los proyectos de la organización conviven las tres caras. Impuestos lo hace bien: deshace con un desgravamen, un registro nuevo que apunta al original, y nunca borra. El orquestador de terceros deja una dirección huérfana cuando aborta: su compensación es parcial, y está anotada como pendiente. Y el adaptador de contabilidad hacia el ERP no tiene operación para deshacer: lo que no ofrece deshacer, no se puede compensar. Por eso la operación inversa se pide en el contrato desde el principio, no el día que hace falta.

> 🌱 Mira tu `Empresa`: estado de cada integración, restitución, plazo, reversión. Nada de eso es la empresa: es el **proceso** de suspenderla. Y si mañana hay otro proceso (reactivarla, cambiarle el plan con aprobación), la empresa carga con todos. Además, si se suspende dos veces, ¿de cuál suspensión es una respuesta que llega tarde? El proceso necesita ser alguien: [El proceso tiene dueño](./el-proceso-tiene-dueno.md).

## ✅ Compruébalo

- [ ] Sabes decir por qué preguntarle a Facturación antes de suspender no quita la necesidad de deshacer.
- [ ] Con una empresa con acuerdo de pago, Facturación contesta `MultaRechazadaV1` y Empresas anota `CobroDeMultaRechazado` y `SuspensionRevertida`, sin borrar el `EmpresaSuspendida`.
- [ ] Si Accesos ya había cortado, la reversión le pide `RestituirAccesosV1` y termina en `restitucion_de_accesos_confirmada`.
- [ ] Sabes por qué la restitución es un comando y no un anuncio.
- [ ] Si el no llega antes que la confirmación de Accesos (el huérfano), la restitución se pide igual.
- [ ] Con Accesos en silencio, el plazo programado deja `SuspensionVencida` con los socios que faltan, y lo viste esperar como `Scheduled`.
- [ ] Sabes decir por qué vencer no es fallar, quién decide qué hacer con una suspensión vencida, y qué gana `SuspensionVencida` frente al `Vencido` de CosmosLens.
- [ ] Con la restitución fallando, el estado queda `Restituyendo` y el comando en dead letters.

## 🆘 Si algo salió mal

- **Suspender no hace nada (ni hecho nuevo ni respuestas):** la empresa ya estaba suspendida, y tu `SuspenderHandler` no la vuelve a suspender. Reactívala con el `Append` directo del 🔨.
- **En el Paso 2 sale `Accesos=Aplicado` y no `Restituido`:** el no llegó antes que la confirmación de Accesos, y sin el huérfano nadie pide la restitución. Revisa que la pausa esté en el rechazo de Facturación y no en Accesos.
- **La restitución no se pide:** revisa que el handler **devuelva** `RestituirAccesosV1` cuando entre los hechos decididos está `RestitucionDeAccesosSolicitada`, y que Accesos tenga el handler de ese comando.
- **`FacturacionHandler` no compila al devolver `MultaRechazadaV1`:** su retorno era `MultaCobradaV1`; con dos tipos posibles, pásalo a `object`.
- **El plazo no llega nunca:** revisa que el `SuspenderHandler` devuelva la tupla y que el segundo elemento sea el `DelayedFor(...)`. Y espera un poco más que el plazo: se dispara en la siguiente revisión.
- **El plazo llega y marca vencida una suspensión que sí se resolvió:** `RevisarPlazo` debe mirar `Efectiva` y `Revertida` antes de decidir.
- **`DeliveryMessage` no compila:** viene de `using Wolverine;`.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué acto ya ejecutado por otro sistema tendrías que poder deshacer? Di qué hecho nuevo lo compensa en cada lado, y qué pasa si uno de los sistemas no ofrece cómo deshacerlo.

```bash
git add .
git commit -m "ES · Deshacer en tres sistemas (compensación + plazo)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Entre sistemas no hay transacción que revertir: se compensa, cada sistema anula su efecto con un hecho nuevo y quien lleva el proceso pide cada compensación como una integración más; y al silencio se le pone un plazo, un mensaje programado que al vencer deja constancia y no decide solo.

---

[⬅️ Volver: Dos respuestas a la vez](./dos-respuestas-a-la-vez.md)

[➡️ Siguiente: El proceso tiene dueño](./el-proceso-tiene-dueno.md)
