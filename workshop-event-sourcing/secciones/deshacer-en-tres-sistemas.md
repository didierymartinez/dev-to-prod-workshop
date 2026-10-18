# Deshacer en tres sistemas

Hasta ahora los socios siempre cumplen. Facturación acaba de decir que no.

## 🎯 El Objetivo

Echar atrás una suspensión que otros sistemas ya ejecutaron, sin borrar nada de nadie, y enterarte cuando un socio nunca contesta. Y que una falla pasajera al cobrar no la eche atrás.

## 💥 El dolor: el no llega cuando el otro ya actuó

Facturación tiene una regla suya: a una empresa con **acuerdo de pago** no se le cobra multa, y para el negocio esa empresa no se suspende. Cuando le llega la suspensión de una de esas, contesta que **no**. Pero para entonces Accesos ya cortó sus accesos, y la suspensión tiene que caerse entera.

Preguntarle a Facturación **antes** de suspender, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), reduce los casos, pero no los elimina. El acuerdo puede firmarse entre la pregunta y el cobro: es la carrera de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), entre dos contextos. Y hay "no" que nadie sabe antes, como un medio de pago que rebota. Siempre hace falta saber deshacer.

¿Cómo se deshace? Borrar el hecho no se puede: el diario no se reescribe, ni para corregir la forma ([La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)). Revertir una transacción tampoco: no hay una que abarque a los tres ([El hecho y su anuncio](./el-hecho-y-su-anuncio.md)). Y la base de Accesos es de otro contexto: no la ves, y no debes.

Un no deshace. Una pasarela de pagos que no contestó a tiempo, o una respuesta que solo dice `false`, parecen un no y no lo son.

Y hay otro dolor, más callado: un socio que **nunca contesta**. El estado se queda `EnCurso` para siempre. CosmosLens lo pinta `Vencido`, pero tu sistema no hace nada con eso: nadie lo decidió.

## 🔧 Compensar: cada uno deshace lo suyo, hacia adelante

> 🆕 **Compensar es deshacer con un hecho nuevo, en cada sistema.** Lo que pasó no se borra: se agrega un hecho que anula su efecto. En Empresas, `SuspensionRevertida` deja la empresa activa otra vez. Pero Empresas no puede deshacer lo de Accesos: le **pide** a Accesos que deshaga lo suyo, con un comando (`RestituirAccesosV1`), y Accesos contesta cuando lo hizo (`AccesosRestituidosV1`). Tu `Empresa` lleva la cuenta: la restitución también es una integración que se pide y se confirma.

### Antes de empezar · una empresa limpia

Llegas de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) con la versión esperada en `Anotar` y la política `OnException` que reintenta el choque. Si las quitaste en el 🔨, vuelve a ponerlas. Accesos contesta enseguida, sin pausa, y `RespuestasHandler` ya no tiene las pausas del experimento. Si mantuviste el orden por llave, suma a la misma cola particionada las respuestas nuevas de esta sección: `MultaRechazadaV1` en el Paso 1 y `AccesosRestituidosV1` en el Paso 3, cada una con su `ByMessage` y su `PublishMessage`.

Las empresas de las secciones anteriores arrastran su historia. De tu `Program.cs`, quita el bloque que reactivaba emp-9 y los pasos de la sección anterior, y deja el host, `store` y `bus`. Siembra dos empresas nuevas con tu `Sembrar`: las respuestas leen su localizador.

```csharp
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-11", "901100000", "Panadería Sur", "Basico");
    Sembrar(s, "emp-35", "903500000", "Ferretería Norte", "Basico");   // para el Paso 2 y los 🔨 de los pasos
    await s.SaveChangesAsync();
}
```

Corre la siembra una vez y quítala: volver a sembrar emp-11 lanza `ExistingStreamIdCollisionException`. Cada paso vuelve a suspender emp-11, y las versiones de las salidas esperadas suponen que corres cada experimento una vez, en orden. El Paso 2 y los 🔨 de los pasos usan emp-35 para no mover esas versiones. En tu `Program.cs`, deja solo la suspensión del experimento que corres: si no, emp-11 se vuelve a suspender y sus versiones se corren.

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
> Los dos socios contestan enseguida: `revocacion_de_accesos_confirmada` puede caer en `v5` o en `v3`, y las dos salidas son buenas.
>
> Para eso: **(1)** Declara en `Contratos` la respuesta negativa, `MultaRechazadaV1(Nit, Razon)`, con su `[MessageIdentity]`, la regla de [El outbox](./el-outbox.md). **(2)** En Facturación, la regla: un conjunto `ConAcuerdoDePago` con los NIT que tienen acuerdo de pago (un `HashSet<string>` estático basta para el taller). Si el NIT está, `FacturacionHandler` no cobra y devuelve `MultaRechazadaV1`. Si no está, cobra y devuelve `MultaCobradaV1`, también en una reentrega, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md). Como ahora devuelve uno de dos tipos, su retorno pasa a `object`: Wolverine publica el mensaje que devuelvas, sea del tipo que sea. **(3)** En tu `Empresa`, `EstadoIntegracion` gana `Rechazado`, y hay dos hechos nuevos: `CobroDeMultaRechazado(Razon)` (Facturación queda `Rechazado`) y `SuspensionRevertida(Razon)` (la empresa vuelve a `Suspendida = false` y queda `Revertida`). Un método `RechazarCobroDeMulta(razon)` los decide, igual que los `Confirmar…`. Dale a cada hecho su línea en `Hechos.Registrar` y su `Assert` en el test de alias. **(4)** En `RespuestasHandler`, un handler de `MultaRechazadaV1`, con la versión esperada como en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). **(5)** Limpia en `Apply(EmpresaSuspendida)` cada estado nuevo que agregues en esta sección: una suspensión nueva empieza de cero.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos
[MessageIdentity("facturacion.multa-rechazada.v1")]
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

// en tu Hechos.Registrar (y un Assert por hecho en el test de alias)
opts.Events.AddEventType<CobroDeMultaRechazado>();
opts.Events.AddEventType<SuspensionRevertida>();

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
    var id = await Localizador.StreamDe(session, msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
        ?? throw new InvalidOperationException($"No existe la empresa {id}");
    Anotar(session, id, empresa, empresa.RechazarCobroDeMulta(msg.Razon));
}
```

</details>

> 🔍 **¿Lo lograste?** La suspensión se revirtió en Empresas. Pero mira `Accesos=Aplicado`: los accesos **siguen cortados**. Empresas deshizo lo suyo; lo de Accesos sigue en pie.

### Paso 2 · Lo que parece un no

Cobrar, en la vida real, es llamar a una pasarela de pagos, que a veces no contesta a tiempo. Simúlala en `FacturacionHandler` con un contador, `public static int Timeouts { get; set; }`. Después de la regla, si `Timeouts` es mayor que cero, réstale uno y lanza `new TimeoutException("la pasarela de pagos no contestó")`.

> 🔨 **Rómpelo tú (un timeout no es un no).** Envuelve el cobro en un `try/catch` que convierte cualquier excepción en un no:
>
> ```csharp
> // Facturacion/FacturacionHandler.cs, después de la regla: solo para el 🔨
> try
> {
>     if (Timeouts > 0) { Timeouts--; throw new TimeoutException("la pasarela de pagos no contestó"); }
>     // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1 …
> }
> catch (Exception ex) { return new MultaRechazadaV1(msg.Nit, ex.Message); }
> ```
>
> Pon `FacturacionHandler.Timeouts = 1;` y suspende emp-35, como suspendiste emp-11:
>
> ```
> emp-35: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True
> ```
>
> emp-35 no tiene acuerdo de pago: la suspensión era legítima, y se cayó porque la pasarela no contestó. `SELECT data->>'Razon' FROM mt_events WHERE stream_id = 'emp-35' AND type = 'suspension_revertida';` devuelve `la pasarela de pagos no contestó`.

> 🛠️ **Inténtalo tú.** Que una falla pasajera se reintente, y que solo la regla conteste que no:
>
> ```csharp
> FacturacionHandler.Timeouts = 1;   // la pasarela falla una vez
> await bus.InvokeAsync(new SuspenderEmpresa("emp-35", "mora"));
> await Task.Delay(2000);
> // emp-35: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True
> ```
>
> Para eso: **(1)** Quita el `try/catch`, y deja que la excepción salga del handler. **(2)** Pídele a Wolverine que reintente la `TimeoutException`: otra `OnException`, con la misma forma que la del choque de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md).
>
> Y si la pasarela no vuelve: reactiva emp-35 con un `Append` de `PagoRegistrado` y `EmpresaReactivada`, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md), pon `Timeouts = 10` y suspéndela otra vez:
>
> ```
> emp-35: Suspendida=True Facturacion=EnCurso Accesos=Aplicado Efectiva=False
> ```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, en AddWolverine, junto a la política del choque
opts.OnException<TimeoutException>()   // lo pasajero se reintenta; si no se recupera, va a dead letters
    .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());
```

```csharp
// Facturacion/FacturacionHandler.cs
public static int Timeouts { get; set; }   // la pasarela simulada: cuántas veces seguidas no contesta

public static object Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
{
    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");   // el único no
    if (Timeouts > 0) { Timeouts--; throw new TimeoutException("la pasarela de pagos no contestó"); }   // sale del handler
    // … el cobro de siempre …
}
```

</details>

> 🔍 **¿Lo lograste?** Con `Timeouts = 1`, el log muestra una `TimeoutException`, y el reintento cobra. Con `Timeouts = 10`, son cuatro intentos, y el mensaje cae en dead letters: `SELECT message_type, exception_type FROM wolverine_dead_letters ORDER BY sent_at DESC LIMIT 1;` muestra `empresas.empresa-suspendida.v2 | System.TimeoutException`. Facturación queda `EnCurso`, y es la verdad: todavía no se sabe.

> 🔨 **Rómpelo tú (un no sin razón).** ¿Y si la pasarela sí cobró, y lo que se perdió fue su respuesta? Mueve la línea del timeout a después de `tx.Commit()`: la multa queda guardada, y el intento falla igual. Wolverine reintenta con el mismo `envelope.Id`, y tu dedup no vuelve a cobrar. Ahora haz que Facturación conteste lo que dice el dedup: guarda `var cobrada = dedup.ExecuteNonQuery() == 1;`, úsalo en el `if`, y al final devuelve `cobrada ? new MultaCobradaV1(msg.Nit, cobradaEl) : new MultaRechazadaV1(msg.Nit, "no se cobró")`. Reactiva emp-35, pon `Timeouts = 1` y suspéndela:
>
> ```
> emp-35: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True
> ```
>
> `SELECT count(*) FROM multas WHERE nit = '903500000';` devuelve 2: la del reto y la de esta suspensión. Empresas revirtió una suspensión cobrada.

Un `bool` tiene dos valores, y la respuesta de un socio tiene tres formas: **lo hice**, **ya estaba hecho** y **no lo hago, por esta razón**. "Ya estaba" es un sí: vuelve a contestar `MultaCobradaV1` en los dos casos, y quita el contador y su línea. Lo que la pasarela todavía no sabe, como un pago pendiente, no es ni un sí ni un no: Facturación no contesta aún, y el estado se queda `EnCurso`. Deja la regla en `DECISIONES.md`: solo una regla del socio contesta que no, y lo pasajero se reintenta.

### Paso 3 · Pedirle a Accesos que deshaga lo suyo

Para deshacer lo de Accesos, Empresas le manda un **comando**, `RestituirAccesosV1`, y no un anuncio como `SuspensionRevertidaV1`. Un anuncio no espera respuesta ni sabe a quién le llega, y Empresas necesita que **ese** socio deshaga **eso** y le confirme, porque lleva la cuenta de la restitución.

> 🛠️ **Inténtalo tú.** Que la reversión termine también en Accesos:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));
> await Task.Delay(2000);
> // emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True
> // diario: … → v6:empresa_suspendida → v7:revocacion_de_accesos_confirmada → v8:cobro_de_multa_rechazado → v9:suspension_revertida → v10:restitucion_de_accesos_solicitada → v11:restitucion_de_accesos_confirmada
> ```
>
> emp-11 llega del Paso 1 revertida (`Suspendida=False`): se puede volver a suspender. Su NIT sigue en `ConAcuerdoDePago`. Para que Accesos corte **antes** de que llegue el no, dale una pausa al rechazo: en `FacturacionHandler`, pon `await Task.Delay(800)` antes de devolver `MultaRechazadaV1`. Para poder esperar, el handler pasa a `async Task<object>`.
>
> Para eso: **(1)** En `Contratos`, el comando `RestituirAccesosV1(Nit)` y su respuesta `AccesosRestituidosV1(Nit)`, cada uno con su `[MessageIdentity]`. **(2)** En Accesos, un handler de `RestituirAccesosV1` que restituya los accesos y conteste `AccesosRestituidosV1`. **(3)** En tu `Empresa`, `EstadoIntegracion` gana `Restituyendo` y `Restituido`, con dos hechos: `RestitucionDeAccesosSolicitada()` y `RestitucionDeAccesosConfirmada()`, cada uno con su línea en `Hechos.Registrar` y su `Assert` en el test de alias. **(4)** Si Accesos ya está `Aplicado` cuando llega el no, `RechazarCobroDeMulta` agrega `RestitucionDeAccesosSolicitada`. Si ese hecho sale entre los decididos, el handler **devuelve** `RestituirAccesosV1`: `hechos.OfType<RestitucionDeAccesosSolicitada>().Any()` te dice si está. **(5)** Un `ConfirmarRestitucionDeAccesos()` en tu `Empresa`, que devuelva `RestitucionDeAccesosConfirmada` solo si Accesos está `Restituyendo`, y un handler de `AccesosRestituidosV1` que anote lo que decida.
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
[MessageIdentity("accesos.restituir-accesos.v1")]
public record RestituirAccesosV1(string Nit);
[MessageIdentity("accesos.accesos-restituidos.v1")]
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

// en tu Hechos.Registrar (y un Assert por hecho en el test de alias)
opts.Events.AddEventType<RestitucionDeAccesosSolicitada>();
opts.Events.AddEventType<RestitucionDeAccesosConfirmada>();

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
    var id = await Localizador.StreamDe(session, msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
        ?? throw new InvalidOperationException($"No existe la empresa {id}");
    var hechos = empresa.RechazarCobroDeMulta(msg.Razon);
    Anotar(session, id, empresa, hechos);
    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;
}

public static async Task<RestituirAccesosV1?> Handle(AccesosRevocadosV1 msg, IDocumentSession session)
{
    var id = await Localizador.StreamDe(session, msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
        ?? throw new InvalidOperationException($"No existe la empresa {id}");
    var hechos = empresa.ConfirmarRevocacionDeAccesos();
    Anotar(session, id, empresa, hechos);
    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;
}

public static async Task Handle(AccesosRestituidosV1 msg, IDocumentSession session)
{
    var id = await Localizador.StreamDe(session, msg.Nit);
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
        ?? throw new InvalidOperationException($"No existe la empresa {id}");
    Anotar(session, id, empresa, empresa.ConfirmarRestitucionDeAccesos());
}
```

El hecho de la solicitud y el comando a Accesos salen en la **misma** transacción, por el outbox de [El outbox](./el-outbox.md): o se pidió y se anotó, o ninguna de las dos.

</details>

> 🔨 **Rómpelo tú (un comando con dos oyentes).** Un comando que se publica le llega a cada handler que lo declare. El equipo de Accesos estrena un portal y, mientras migra, le da su propio handler a `RestituirAccesosV1`. El portal nuevo falla:
>
> ```csharp
> // Accesos/PortalNuevoHandler.cs: solo para el 🔨
> using Contratos;
>
> public static class PortalNuevoHandler
> {
>     public static AccesosRestituidosV1 Handle(RestituirAccesosV1 msg) =>
>         throw new InvalidOperationException("el portal nuevo no responde");
> }
> ```
>
> `bus.PreviewSubscriptions(mensaje)` te dice a quién le llegaría un mensaje: devuelve un sobre por destino, sin enviar nada. Míralo, mete el NIT de emp-35 en `ConAcuerdoDePago` y suspéndela, con las pausas como las dejó el huérfano:
>
> ```csharp
> foreach (var sobre in bus.PreviewSubscriptions(new RestituirAccesosV1("903500000")))
>     Console.WriteLine(sobre.Destination);
> // local://accesoshandler/
> // local://portalnuevohandler/
> // emp-35: Facturacion=Rechazado Accesos=Restituido Revertida=True
> ```
>
> Y `wolverine_dead_letters` tiene una fila nueva: `accesos.restituir-accesos.v1 | System.InvalidOperationException`. Empresas contó una confirmación y dio la restitución por hecha. En el portal nuevo los accesos siguen cortados, y el estado no lo dice.

Un comando tiene **un** destinatario: el que lo confirma. Si dos sistemas tienen que deshacer, son dos integraciones, cada una con su comando, su confirmación y su estado, como Facturación y Accesos. Si alguien solo quiere enterarse, escucha un anuncio, que admite muchos oyentes. Borra `PortalNuevoHandler` y vuelve a mirar `PreviewSubscriptions`: un solo destino, `local://accesos.restituir-accesos.v1/`, porque con un solo handler la cola lleva el nombre del mensaje. Deja la regla en `DECISIONES.md`.

### Paso 4 · El socio que nunca contesta

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
> Llegas del huérfano con emp-11 revertida. Esta vez Facturación debe cobrar: quita las líneas que meten los NIT en `ConAcuerdoDePago`. Para que Accesos calle, que su handler devuelva `null`; su retorno pasa a `AccesosRevocadosV1?`.
>
> Para eso: **(1)** Un mensaje interno `RevisarSuspension(EmpresaId)` y un hecho `SuspensionVencida(Faltan)`, con su línea en `Hechos.Registrar` y su `Assert` en el test de alias. El plazo espera en la base con su nombre, y un mensaje que espera en la base lleva su `[MessageIdentity]`, como los contratos de [El outbox](./el-outbox.md). Dale `[MessageIdentity("RevisarSuspension")]` y fija ese nombre en el test de alias: `Assert.Equal("RevisarSuspension", typeof(RevisarSuspension).ToMessageTypeName());`, con `using Wolverine.Util;`. **(2)** El `SuspenderHandler` devuelve **dos** cosas, el anuncio y el plazo programado, en una tupla de C#, que junta dos valores en uno: `(a, b)`. Wolverine publica cada uno que no sea `null`. El retorno pasa a `(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)`. El plazo es `new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5))`. Si la empresa ya estaba suspendida, devuelve `(null, null)`. Tu test de [El outbox](./el-outbox.md) deja de compilar: saca el anuncio de la tupla con `var (anuncio, _) = await SuspenderHandler.Handle(...)`: el `_` descarta el segundo valor, el plazo. **(3)** Un `RevisarPlazo()` en la `Empresa`: si la suspensión ya es efectiva o ya se revirtió, o si la empresa ya no está suspendida, nada; si no, `SuspensionVencida` con los socios que faltan. **(4)** Un handler de `RevisarSuspension` que anote, con la versión esperada, lo que devuelva `RevisarPlazo()`, y que imprima la línea `plazo vencido para …`. **(5)** Para no esperar de más en el taller: `opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();`.

Vencer no es fallar: la respuesta de Accesos todavía puede llegar. `SuspensionVencida` no deshace nada: deja en el diario que el plazo se cumplió sin respuesta, para que el negocio decida si reintenta, llama al otro equipo o compensa. El `Vencido` de CosmosLens es la opinión de un observador; `SuspensionVencida` es un hecho de tu diario, con fecha, al que el dominio y otros sistemas pueden reaccionar. Para que los dos digan lo mismo, cambia el `PlazoSegundos` de Facturación y de Accesos en tu `procesos.json` de 30 a 5, el tiempo del `DelayedFor`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia
[MessageIdentity("RevisarSuspension")]   // espera en la base: su nombre es un contrato (using Wolverine.Attributes;)
public record RevisarSuspension(string EmpresaId);
public record SuspensionVencida(string Faltan);
// en tu Hechos.Registrar (y un Assert por hecho en el test de alias): opts.Events.AddEventType<SuspensionVencida>();   (RevisarSuspension es un mensaje, no un hecho)
// y en el test de alias, el nombre del plazo: Assert.Equal("RevisarSuspension", typeof(RevisarSuspension).ToMessageTypeName());

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
    var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)
        ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");
    if (empresa.Suspendida) return (null, null);
    session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));
    return (new EmpresaSuspendidaV2(empresa.Nit, cmd.Motivo, empresa.Plan),
            new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5)));
}

public static class PlazoHandler
{
    public static async Task Handle(RevisarSuspension r, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(r.EmpresaId)
            ?? throw new InvalidOperationException($"No existe la empresa {r.EmpresaId}");
        var hechos = empresa.RevisarPlazo();
        Console.WriteLine($"plazo vencido para {r.EmpresaId}: {(hechos.Length == 0 ? "ya resuelta" : "VENCIDA")}");
        if (hechos.Length > 0) session.Events.Append(r.EmpresaId, empresa.Version + hechos.Length, hechos);
    }
}
```

```csharp
// Empresas.Tests/SuspenderHandlerTests.cs: el anuncio sale de la tupla; los Assert quedan igual
var (anuncio, _) = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);
```

</details>

> 🔍 **¿Lo lograste?** Mientras esperas, `SELECT status, message_type, execution_time FROM wolverine_incoming_envelopes WHERE status = 'Scheduled'` muestra el plazo esperando su turno. En CosmosLens, busca `emp-11` en **Correlación**, porque el plazo lleva el id de la empresa y no el NIT: aparece como mensaje **programado**.

> 🔨 **Rómpelo tú (el plazo que pierde su nombre).** Sin `[MessageIdentity]`, `RevisarSuspension` viaja con el nombre de su clase, y con ese nombre espera en la base mientras corre el plazo. Pasa en un despliegue: la versión nueva arranca con plazos que guardó la vieja. Suspende emp-35 con una espera de 1000 ms en vez de 7000: el programa termina antes del plazo, y el plazo queda `Scheduled` en la base. Quítale el atributo a `RevisarSuspension` y renombra el record a `RevisarPlazoDeSuspension`, también en `SuspenderHandler` y en `PlazoHandler`. Arranca otra vez, solo con una espera de 5 segundos y la consulta de emp-35:
>
> ```
> info: … No known handler for RevisarSuspension#…
> emp-35: Facturacion=Aplicado Accesos=EnCurso Vencida=False
> ```
>
> El plazo llegó con su nombre viejo, y ningún handler lo reconoce. Wolverine lo marca `Handled` y sigue: ni excepción ni dead letter. emp-35 espera para siempre, y nadie se entera. Ponle a la clase renombrada `[MessageIdentity("RevisarSuspension")]`: el nombre que ya está en la tabla, el que llevan los plazos que esperan. Repite las dos corridas. En la primera, reactiva emp-35, suspéndela y espera 1000 ms. En la segunda, solo la espera de 5 segundos:
>
> ```
> plazo vencido para emp-35: VENCIDA
> ```
>
> Vuelve al nombre `RevisarSuspension` y deja el atributo: es lo que te deja renombrar la clase sin perder los plazos que esperan. Con el renombre sin atributo, tu test de alias también cae: fija ese nombre.

## 🔨 Rómpelo: la compensación también falla

Llegas del Paso 4 con emp-11 suspendida y vencida, Accesos en silencio, el rechazo de Facturación sin pausa y los NIT fuera de `ConAcuerdoDePago`. Prepara el rechazo otra vez. Devuélvele a Accesos su respuesta: que vuelva a devolver `AccesosRevocadosV1`, con su pausa de 800 ms. Vuelve a meter el NIT de emp-11 en `ConAcuerdoDePago`. Y reactiva emp-11 con un `Append` directo, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md):

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

El comando cae en dead letters: `wolverine_dead_letters` tiene una fila nueva, `accesos.restituir-accesos.v1 | System.InvalidOperationException`. Compensar es otra integración, con sus propias fallas, y tu sistema lo **sabe**: el estado lo dice. En CosmosLens, busca el NIT `901100000` en **Correlación**, porque el comando lleva el NIT y no el id de la empresa: aparece como mensaje muerto. Nadie lo arregla solo: compensar no garantiza volver al principio, garantiza saber en qué punto quedó cada uno.

Para que el panel **Procesos** muestre la restitución, agrégala a tu `procesos.json` como una integración más. Su `"Solicitado"` dice qué hecho la pide; antes de ese hecho, sale `SinSolicitar`.

```json
{ "Nombre": "Restitución de accesos", "Solicitado": [ "restitucion_de_accesos_solicitada" ],
  "Aplicado": [ "restitucion_de_accesos_confirmada" ], "PlazoSegundos": 30 }
```

Y a Facturación agrégale su rechazo: `"Rechazado": [ "cobro_de_multa_rechazado" ]`.

## El Descubrimiento

Entre varios sistemas no hay transacción que revertir. Deshacer es **compensar**: cada sistema anula su propio efecto con un hecho nuevo, y quien lleva el proceso pide cada compensación como una integración más. Una confirmación tardía de algo ya revertido (el huérfano) también se compensa. Al silencio se le responde con un plazo: un mensaje programado, durable y atómico con el hecho, que al vencer deja constancia y no decide solo.

Y un no se cuida, porque deshace. Solo una regla del socio lo contesta, con su razón. Lo pasajero se reintenta, y "ya estaba hecho" es un sí. Un comando tiene un destinatario, el que lo confirma. Y el nombre de un mensaje que espera en la base es un contrato, como el alias de un hecho.

En la organización se ven las dos confusiones del no: un `catch` que vuelve definitivo un rechazo pasajero de la nube, y un `bool` que no distingue "ya estaba" de "no se puede". Impuestos compensa bien, con un desgravamen que apunta al original. El adaptador de contabilidad hacia el ERP no tiene operación para deshacer, y lo que no ofrece deshacer no se puede compensar: la operación inversa se pide en el contrato desde el principio.

> 🌱 Mira tu `Empresa`: estado de cada integración, restitución, plazo, reversión. Nada de eso es la empresa: es el **proceso** de suspenderla. Y si se suspende dos veces, ¿de cuál suspensión es una respuesta que llega tarde? El proceso necesita ser alguien: [El proceso tiene dueño](./el-proceso-tiene-dueno.md).

## ✅ Compruébalo

- [ ] Sabes decir por qué preguntarle a Facturación antes de suspender no quita la necesidad de deshacer.
- [ ] Con una empresa con acuerdo de pago, Facturación contesta `MultaRechazadaV1` y Empresas anota `CobroDeMultaRechazado` y `SuspensionRevertida`, sin borrar el `EmpresaSuspendida`.
- [ ] Un timeout de la pasarela se reintenta y, si no se recupera, cae en dead letters con Facturación `EnCurso`.
- [ ] Sabes decir por qué "ya estaba cobrada" es un sí, y qué se pierde cuando la respuesta sale de un `bool`.
- [ ] La reversión le pide `RestituirAccesosV1` a Accesos y termina en `restitucion_de_accesos_confirmada` en los dos órdenes: si Accesos ya había cortado, y si confirma después del no (el huérfano).
- [ ] Con dos handlers de `RestituirAccesosV1`, el estado dijo `Restituido` con un portal fallando; sabes por qué la restitución es un comando con un destinatario y no un anuncio.
- [ ] Con Accesos en silencio, el plazo programado deja `SuspensionVencida` con los socios que faltan, y lo viste esperar como `Scheduled`.
- [ ] Tu test de suspender saca el anuncio de la tupla, y sigue en verde.
- [ ] Sabes decir por qué vencer no es fallar, y qué gana `SuspensionVencida` frente al `Vencido` de CosmosLens.
- [ ] Sin `[MessageIdentity]`, renombrar `RevisarSuspension` con un plazo pendiente lo dejó sin handler y sin error; con el atributo el plazo venció, y tu test de alias fija su nombre.
- [ ] Con la restitución fallando, el estado queda `Restituyendo` y el comando en dead letters.

## 🆘 Si algo salió mal

- **Suspender no hace nada (ni hecho nuevo ni respuestas):** la empresa ya estaba suspendida, y tu `SuspenderHandler` no la vuelve a suspender. Reactívala con el `Append` directo del 🔨.
- **Con `Timeouts = 1`, el mensaje cae directo en dead letters:** falta la `OnException<TimeoutException>()`.
- **En el Paso 3 sale `Accesos=Aplicado` y no `Restituido`:** revisa que la pausa esté en el rechazo de Facturación y no en Accesos, que el handler **devuelva** `RestituirAccesosV1` cuando entre los hechos decididos está `RestitucionDeAccesosSolicitada`, y que Accesos tenga el handler de ese comando.
- **El plazo no llega nunca:** revisa que el segundo elemento de la tupla sea el `DelayedFor(...)`, y espera un poco más que el plazo: se dispara en la siguiente revisión.
- **`DeliveryMessage` no compila:** viene de `using Wolverine;`. `[MessageIdentity]` viene de `using Wolverine.Attributes;`.
- **Con el atributo puesto, el plazo renombrado tampoco vence:** el nombre del atributo debe ser el de la tabla, letra por letra. Míralo con `SELECT DISTINCT message_type FROM wolverine_incoming_envelopes;`.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué acto ya ejecutado por otro sistema tendrías que poder deshacer? Di qué hecho nuevo lo compensa en cada lado, y qué pasa si uno de los sistemas no ofrece cómo deshacerlo.

```bash
git add .
git commit -m "ES · Deshacer en tres sistemas (compensación + plazo)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Entre sistemas no hay transacción que revertir: se compensa, cada sistema anula su efecto con un hecho nuevo y quien lleva el proceso pide cada compensación como un comando a un destinatario; un no lo da solo una regla, con su razón, y lo pasajero se reintenta; y al silencio se le pone un plazo, un mensaje programado con nombre fijo que al vencer deja constancia y no decide solo.

---

[⬅️ Volver: Dos respuestas a la vez](./dos-respuestas-a-la-vez.md)

[➡️ Siguiente: El proceso tiene dueño](./el-proceso-tiene-dueno.md)
