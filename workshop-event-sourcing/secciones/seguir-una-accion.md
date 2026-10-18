# Seguir una acción

Tu borde ya responde con forma, y un error lleva su `traceId`. Ahora toca encontrar qué hizo tu sistema con un pedido.

## 🎯 El Objetivo

Que la respuesta traiga un id, y que con él encuentres lo que el pedido causó: sus hechos en cada stream, con las respuestas de Facturación y Accesos, y sus líneas en el log. Y que el log diga qué se descartó, sin copiar el contenido del pedido.

## 💥 El dolor: el pago que la pantalla dio por bueno

Soporte te escribe: «Registré en ventanilla un pago de 80.000 para emp-94, la pantalla dijo que bien, y no aparece». Da de alta emp-94 a emp-99, como emp-90 en [El borde es un contrato](./el-borde-es-un-contrato.md). Luego repite lo que hizo la pantalla: tenía un error, y mandó la llave del pago anterior.

```bash
for i in 94 95 96 97 98 99; do curl -s -o /dev/null -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-$i\",\"nit\":\"90${i}00000\",\"nombre\":\"Empresa $i\",\"plan\":\"Basico\"}"; done
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/empresas/emp-94/pagos?monto=50000" -H "Idempotency-Key: pago-94-1"   # 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/empresas/emp-94/pagos?monto=80000" -H "Idempotency-Key: pago-94-1"   # 200
curl -s http://localhost:5000/empresas/emp-94/historia   # … un solo pago_registrado, con "monto":50000
```

El pago de 80.000 no está. Tu `RegistrarPagoHandler` vio una referencia repetida y volvió sin hacer nada, como se lo pediste en [Llegó dos veces](./llego-dos-veces.md). Busca en el log de tu servicio qué pasó con ese pedido. Para buscar con `grep`, arráncalo así: `ASPNETCORE_ENVIRONMENT=Development dotnet run 2>&1 | tee servicio.log` (en PowerShell, `| Tee-Object servicio.log`). Hay dos `Request finished … 200`, iguales, y nada dice que el segundo se descartó. La respuesta tampoco le dio a soporte un id para citar. Hasta ahora, para ver qué hacía un handler, le ponías un `Console.WriteLine` y lo quitabas al terminar. En producción no puedes editar el handler cada vez que alguien pregunta. Un orquestador de la organización escribe con `Console.WriteLine` justo donde descarta un mensaje, y nadie puede filtrar esas líneas ni recibir una alerta por ellas.

## 🔧 Paso 1 · El handler deja su línea

> 🆕 **Un logger en el handler.** Un handler recibe `ILogger logger` como un parámetro más, y Wolverine le da uno cuya categoría es el nombre del mensaje: `RegistrarPago`. `ILogger<RegistrarPagoHandler>` no compila: una clase `static` no puede ser argumento de tipo (`error CS0718`). Cada línea lleva un nivel: `LogDebug`, `LogInformation`, `LogWarning` o `LogError`. El texto es una plantilla: `logger.LogWarning("Pago {Referencia} ya registrado", cmd.Referencia)` guarda `Referencia` como un campo con nombre, que un buscador de logs filtra. Con `$"…"`, sería un texto más.

> 🛠️ **Inténtalo tú.** Quiero que cada `return` que descarta deje su línea:
>
> ```
> POST /empresas/emp-94/pagos?monto=80000  Idempotency-Key: pago-94-1   →  warn: RegistrarPago[0]
>                                                                             Pago pago-94-1 de emp-94 ya registrado: se descarta
> POST /empresas/emp-94/suspender, dos veces                             →  info: SuspenderEmpresa[0]
>                                                                             emp-94 ya tiene un proceso abierto: no se abre otro
> diez segundos después, el plazo de esa suspensión                    →  info: RevisarSuspension[0]
>                                                                             susp-emp-94-3: el mensaje no cambia el proceso, se descarta
> ```
>
> Haz que funcione en los tres handlers que vuelven sin hacer nada: `RegistrarPagoHandler`, `SuspenderHandler` y el `Decidir` de `ProcesoDeSuspensionHandler`: pide el logger en sus cinco `Handle` y pásaselo, porque Wolverine solo les da parámetros a los `Handle`. El nivel dice si alguien tiene que mirar. Una llave repetida es un reintento o un error de la pantalla, y lo segundo hay que verlo: `Warning`. Pedir otra suspensión con un proceso abierto es normal: `Information`. En `Decidir`, el plazo llega diez segundos después de cada suspensión, y casi siempre encuentra el proceso resuelto: `Information`, o el log avisaría en cada suspensión. El `ILogger` viene de `using Microsoft.Extensions.Logging;`. Tu test de `SuspenderHandler` deja de compilar, porque el método pide el logger: pásale `NullLogger.Instance`, de `using Microsoft.Extensions.Logging.Abstractions;`, un logger que no escribe nada.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Handlers.cs (con using Microsoft.Extensions.Logging;)
public static async Task Handle(RegistrarPago cmd, IDocumentSession session, ILogger logger)
    // … como antes, hasta la referencia repetida:
    if (empresa.YaRegistro(cmd.Referencia))
    {
        logger.LogWarning("Pago {Referencia} de {EmpresaId} ya registrado: se descarta", cmd.Referencia, cmd.EmpresaId);
        return;
    }

// en SuspenderHandler, con ILogger logger al final de sus parámetros
if (empresa.ProcesoAbierto is not null)
{
    logger.LogInformation("{EmpresaId} ya tiene un proceso abierto: no se abre otro", cmd.EmpresaId);
    return salida;
}

// Empresas.Historia/ProcesoDeSuspensionHandler.cs (con el mismo using): cada Handle recibe el logger y se lo pasa a Decidir
public static Task<RestituirAccesosV2?> Handle(MultaCobradaV2 m, IDocumentSession s, ILogger log) => Decidir(s, log, m.SuspensionId, p => p.ConfirmarCobroDeMulta(m.CobradaEl));
// … igual en los otros cuatro …
static async Task<RestituirAccesosV2?> Decidir(IDocumentSession session, ILogger log, string suspensionId, Func<SuspensionDeEmpresa, object[]> decidir)
    // … como antes, hasta los hechos:
    if (hechos.Length == 0)
    {
        log.LogInformation("{SuspensionId}: el mensaje no cambia el proceso, se descarta", suspensionId);
        return null;
    }

// Empresas.Tests/SuspenderHandlerTests.cs (con using Microsoft.Extensions.Logging.Abstractions;)
var salida = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session, plazos, NullLogger.Instance);
```

</details>

El host escribe desde `Information`. Arranca con `Logging__LogLevel__Default=Warning` y repite el pago: queda tu `warn`, y los `info` desaparecen. `Logging:LogLevel:<categoría>` cambia el nivel de una sola categoría.

## 🔧 Paso 2 · Cada pedido lleva su id

Seguir la suspensión de emp-94 por su stream no alcanza. `SELECT type FROM mt_events WHERE stream_id = 'emp-94'` trae su `empresa_suspendida`, y nada más de ella: las respuestas de los socios están en `susp-emp-94-3`, un id que tu 202 no devolvió.

> 🆕 **El `CorrelationId` del sobre.** Cada mensaje de Wolverine lleva en su sobre un `CorrelationId`. No es el `SuspensionId`: ese lo pones tú en el contrato, y ata cada respuesta a su proceso. Este lo pone Wolverine, y ata todo lo que causó un pedido. Wolverine se lo copia a los mensajes que manda un handler, y de ahí a las respuestas de Facturación y Accesos. En una petición HTTP, empieza siendo el id que ASP.NET le da a la petición, de 32 caracteres: el segundo bloque del `traceId` de tu 409 (`00-<este>-…-00`). El bus que recibe tu endpoint es también un `IMessageContext`, y su `CorrelationId` se puede cambiar. Marten lo guarda en la columna `correlation_id` de cada hecho si se lo pides en tu `AddMarten`: `opts.Events.MetadataConfig.CorrelationIdEnabled = true;`.

> 🆕 **Un paso antes de cada endpoint.** `app.Use(async (contexto, siguiente) => { …; await siguiente(); })` corre en cada petición, antes de su endpoint: `contexto` es la petición en curso, `contexto.Request.Headers["X-Correlation-Id"]` lee uno de sus headers, y `siguiente()` le pasa el turno al resto. `contexto.RequestServices.GetRequiredService<IMessageContext>()` te da el mismo bus que recibe el endpoint. `contexto.Response.OnStarting(() => { …; return Task.CompletedTask; })` corre justo antes de enviar la respuesta. Un header puesto ahí sobrevive a tu `UseExceptionHandler`, que limpia los headers antes de escribir un error.

> 🛠️ **Inténtalo tú.** Quiero que el pedido diga su id, y que el diario lo guarde:
>
> ```
> POST /empresas/emp-95/suspender   X-Correlation-Id: soporte-95   →  202   X-Correlation-Id: soporte-95
> POST /empresas/emp-96/suspender                                  →  202   X-Correlation-Id: 8d2bfa093786f9c1fff93ce31559b5e0
>
> SELECT stream_id, type FROM mt_events WHERE correlation_id = 'soporte-95' ORDER BY seq_id;
> -- emp-95        | empresa_suspendida
> -- susp-emp-95-2 | suspension_solicitada
> -- susp-emp-95-2 | … las respuestas de los dos socios, y suspension_efectiva
> ```
>
> Haz que funcione: (1) Activa la correlación en tu `AddMarten`. (2) Agrega un `app.Use` junto a tu `UseExceptionHandler`. Si la petición trae `X-Correlation-Id`, ponlo en el `CorrelationId` del bus: la pantalla de soporte abre un caso con su número, y así el caso y tu sistema comparten id. Si no, deja el que Wolverine ya le puso. (3) Con `OnStarting`, pon el que quedó en el header `X-Correlation-Id` de la respuesta: así también va en un 409.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, en tu AddMarten
opts.Events.MetadataConfig.CorrelationIdEnabled = true;   // mt_events.correlation_id

// junto a tu UseExceptionHandler
app.Use(async (contexto, siguiente) =>
{
    var bus = contexto.RequestServices.GetRequiredService<IMessageContext>();   // el mismo bus que recibe tu endpoint
    var deAfuera = contexto.Request.Headers["X-Correlation-Id"].ToString();
    if (!string.IsNullOrWhiteSpace(deAfuera)) bus.CorrelationId = deAfuera;      // el de quien llama, si lo trae
    contexto.Response.OnStarting(() =>                                           // también en un error
    {
        contexto.Response.Headers["X-Correlation-Id"] = bus.CorrelationId;
        return Task.CompletedTask;
    });
    await siguiente();
});
```

</details>

Busca también por el id de emp-96, el de su traza: sus hechos lo tienen como `correlation_id`. Los hechos de antes de este paso tienen `correlation_id` vacío: Marten no lo inventa hacia atrás. El gateway de la organización no genera ni pasa un id así, y cada servicio que hay detrás tendría que inventar el suyo.

## 🔧 Paso 3 · El id en cada línea del log

Las líneas de tus handlers no dicen de qué pedido son. Con muchos pedidos a la vez, `emp-94 ya tiene un proceso abierto` no te lleva al pedido de soporte. La consola puede escribir, debajo de cada línea, sus *scopes*: los campos que la acompañan. Pídeselo en `appsettings.json`, junto a lo que ya tiene:

```json
"Logging": { "Console": { "FormatterName": "simple", "FormatterOptions": { "IncludeScopes": true } } }
```

Arranca, repite el pago de 80.000 con `X-Correlation-Id: soporte-94c`, y suspende emp-97 con `X-Correlation-Id: soporte-97`. Diez segundos después, mira las dos líneas. La del pago trae `=> SpanId:…, TraceId:… => … RequestPath:/empresas/emp-94/pagos`: el id de la petición, no tu `soporte-94c`. La del plazo de emp-97 no trae nada: corre en la cola, cuando la petición ya terminó. Un scope abierto en tu `app.Use` terminaría con la petición.

> 🆕 **Un middleware de Wolverine.** Es una clase con un método `static Before`, que Wolverine corre antes de cada handler, con los mismos parámetros que puede recibir un handler, como `ILogger` y el `Envelope` del mensaje. Si `Before` devuelve algo que se cierra (`IDisposable`), Wolverine lo cierra al terminar el handler. `logger.BeginScope("CorrelationId:{CorrelationId}", id)` abre un scope: cada línea que se escriba mientras siga abierto lleva ese campo, sea de tu handler, de Marten o de Wolverine. Se registra una vez, en tu `AddWolverine`.

```csharp
// Empresas.Historia/Program.cs, en tu AddWolverine
opts.Policies.AddMiddleware(typeof(CorrelacionEnElLog));

// Empresas.Historia/CorrelacionEnElLog.cs
using Microsoft.Extensions.Logging;
using Wolverine;   // Envelope

public static class CorrelacionEnElLog
{
    public static IDisposable? Before(ILogger logger, Envelope envelope) =>
        logger.BeginScope("CorrelationId:{CorrelationId}", envelope.CorrelationId);   // en cada línea, mientras corre el handler
}
```

Arranca y suspende emp-98 con `X-Correlation-Id: soporte-98`. Diez segundos después, busca el id:

```bash
grep -B1 -A1 "CorrelationId:soporte-98" servicio.log
# info: Wolverine.Runtime.WolverineRuntime[107]
#       => … => RequestPath:/empresas/emp-98/suspender … => CorrelationId:soporte-98
#       No routes can be determined for Envelope #… (Contratos.EmpresaSuspendidaV2)
# --
# info: RevisarSuspension[0]
#       => CorrelationId:soporte-98
#       susp-emp-98-2: el mensaje no cambia el proceso, se descarta
```

La primera línea es de Wolverine, en la petición: avisa que nadie escucha tu anuncio. La segunda es tu plazo, en la cola.

Un socio que falla también deja el id. Pon `MundoExterno.FechaDelCobro = "2026-10-17";` después de `builder.Build()`: es una fecha que Facturación no sabe leer. Arranca y suspende emp-99 con `X-Correlation-Id: soporte-99`. Wolverine manda el cobro a sus dead letters, y su línea lleva el id: `Envelope #…/CorrelationId=soporte-99 (Contratos.CobrarMultaV1) … was moved to the error queue`. Quita la línea de `FechaDelCobro`. Y el `traceId` de [El borde es un contrato](./el-borde-es-un-contrato.md) ya se encuentra: repite sin header el alta de emp-91, y el `X-Correlation-Id` de su 409 es el `TraceId` del scope de la línea `fail: Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware[1]`. Para ver los campos con nombre, arranca con `Logging__Console__FormatterName=json` y repite el pago de 80.000: la línea trae `"Referencia":"pago-94-1","EmpresaId":"emp-94"`, y su `CorrelationId` entre los scopes.

## 🔨 Rómpelo: el pago entero en el log

Para depurar un pago, alguien escribe el comando entero en `Debug`, un nivel que el servicio no muestra. Ponlo al principio de tu `RegistrarPagoHandler`: `logger.LogDebug("Pago recibido: {Pago}", cmd);`. Un día hay un incidente, y alguien sube el nivel de ese handler. Arranca con `Logging__LogLevel__RegistrarPago=Debug` y registra un pago de emp-96:

```bash
curl -s -o /dev/null -X POST "http://localhost:5000/empresas/emp-96/pagos?monto=50000" -H "Idempotency-Key: pago-96-1" -H "X-Correlation-Id: soporte-96"
```

```
dbug: RegistrarPago[0]
      => … => CorrelationId:soporte-96
      Pago recibido: RegistrarPago { EmpresaId = emp-96, Referencia = pago-96-1, Monto = 50000 }
```

El monto queda en la consola, y de ahí en cada sistema que guarda los logs, que lee más gente que la base y sin sus permisos. Un servicio de integraciones de la organización deposita así los NIT de sus proveedores, sus cuentas y sus montos cada vez que alguien sube el nivel. El log no necesita el pago: el hecho ya está en el diario, y la correlación lo encuentra.

```sql
SELECT type, data->>'Monto' FROM mt_events WHERE correlation_id = 'soporte-96';   -- pago_registrado | 50000
```

Quita la línea de `Debug`.

Una falla lleva los datos al log aunque no subas ningún nivel. Repite el alta de emp-91 y mira su `fail: RegistrarEmpresa[0]`. Wolverine copia el comando entero: `Invocation of RegistrarEmpresa { EmpresaId = emp-91, Nit = 909000000, Nombre = Empresa 91, Plan = Basico } failed!`. La excepción de Marten trae el NIT: `Document already exists Localizador: 909000000`. El log de errores lleva datos del negocio: dale los mismos permisos que a la base.

## El Descubrimiento

Una acción se sigue con un solo id, la **correlación**. Entra por el borde en `X-Correlation-Id`, o nace con la traza de la petición, y vuelve en la respuesta. Wolverine la lleva en el sobre de cada mensaje que causa el pedido, y Marten la graba en cada hecho: un `SELECT` por `correlation_id` encuentra lo que el pedido escribió en cada stream. Lo que no escribió nada lo cuenta el log. Cada `return` que descarta deja su línea, con un nivel que dice si alguien tiene que mirar, y un middleware le pone a cada línea la correlación. El log lleva ids, no el pago: el pago está en el diario.

> 🌱 Hasta aquí, un solo programa escribe en tu diario. En [Dos hosts, una configuración](./dos-hosts-una-configuracion.md) nace otro: un worker que cambia planes de noche, con su propia copia de tu configuración, y que deja a tu servicio sin poder escribir.

## ✅ Compruébalo

- [ ] El pago con la llave repetida respondió 200 y no dejó ninguna línea; ahora deja un `warn` con su referencia y su empresa.
- [ ] Cada respuesta trae `X-Correlation-Id`: el que mandó el cliente o el de la traza, también en un 409.
- [ ] `SELECT … WHERE correlation_id = 'soporte-95'` trae hechos de `emp-95` y de `susp-emp-95-2`.
- [ ] Sin el middleware, la línea del plazo no traía ningún id; con él, las líneas de tus handlers llevan `=> CorrelationId:…`, y el cobro que falló dejó el id en su línea de dead letters.
- [ ] Con `Debug`, el pago entero llegó al log; sin esa línea, el log lleva ids y el monto se encuentra en `mt_events` por la correlación.

## 🆘 Si algo salió mal

- **`error CS0718` en un handler:** pediste `ILogger<…Handler>`, y una clase `static` no puede ser argumento de tipo. Pide `ILogger` a secas.
- **`correlation_id` sale vacío:** falta `CorrelationIdEnabled = true` en tu `AddMarten`, o el hecho es de antes de ponerlo.
- **El 409 no trae `X-Correlation-Id`:** el header va dentro de `OnStarting`, no antes de `siguiente()`.
- **Las líneas no traen `=> CorrelationId`:** falta `IncludeScopes` en `appsettings.json`, o `AddMiddleware` en tu `AddWolverine`.
- **No sale ningún scope, ni el `TraceId`:** falta `"FormatterName": "simple"`; sin él, la consola no lee `FormatterOptions`.
- **No ves la línea de `Debug`:** la variable es `Logging__LogLevel__RegistrarPago`, con dos guiones bajos; la categoría es el nombre del mensaje.

## 📓 Registra tu avance

Deja la regla en tu `DECISIONES.md`:

> Cada pedido lleva un `X-Correlation-Id`: el de quien llama o el de la traza, y vuelve en la respuesta. Wolverine lo lleva en cada mensaje, Marten lo graba en cada hecho, y un middleware lo pone en cada línea del log. Cada `return` que descarta deja una línea: `Warning` si alguien tiene que mirar, `Information` si es el camino normal. El log lleva ids, no el contenido del pedido: el contenido está en el diario.

> 💭 **Reto:** ¿qué encontraste por la correlación en `mt_events`, y qué solo en el log? ¿Por qué el plazo que encuentra el proceso resuelto no es un `Warning`?

```bash
git add .
git commit -m "ES · Seguir una acción" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una acción se sigue con su correlación: entra o nace en el borde, viaja en cada mensaje, queda en cada hecho y en cada línea del log; cada descarte deja su línea con el nivel que merece, y el log lleva ids, porque el dato ya está en el diario.

---

[⬅️ Volver: El borde es un contrato](./el-borde-es-un-contrato.md)

[➡️ Siguiente: Dos hosts, una configuración](./dos-hosts-una-configuracion.md)
