// Fuente: workshop-event-sourcing/taller.md, entrada "49 · Seguir una acción".
import type { Seccion } from "./tipos";

export const seccion49: Seccion = {
  numero: 49,
  titulo: "Seguir una acción",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que cada pedido lleve un **id de correlación** que aparece en la respuesta, en cada hecho (`mt_events.correlation_id`) y en cada línea del log, y que cada descarte deje su línea **sin copiar el contenido del pedido**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Soporte escribe: «Registré un pago de 80.000 para emp-94, la pantalla dijo que bien, y no aparece».",
        },
        { k: "texto", tam: "enorme", texto: "¿Con qué lo buscas?" },
      ],
    },
    {
      tipo: "reto",
      titulo: "El pago que no aparece",
      tarea:
        "Repite lo que hizo la pantalla: un pago de 80.000 con la llave del pago anterior. Luego búscalo.",
      pasos: [
        "Arranca con `ASPNETCORE_ENVIRONMENT=Development dotnet run 2>&1 | tee servicio.log`, y da de alta emp-94 a emp-99 con el bucle de abajo.",
        'Paga a emp-94 con `?monto=50000` y luego con `?monto=80000`, los dos con `-H "Idempotency-Key: pago-94-1"`.',
        "Mira la historia de emp-94 y busca en `servicio.log` qué pasó con el segundo.",
      ],
      logro: {
        items: [
          "Los dos pagos dan 200, y la historia tiene un solo `pago_registrado`, de 50000.",
          "En el log, dos `Request finished … 200` iguales: nada dice que el segundo se descartó, y la respuesta no da ningún id.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "for i in 94 95 96 97 98 99; do",
          '  curl -s -o /dev/null -X POST http://localhost:5000/empresas -H "Content-Type: application/json" \\',
          '    -d "{\\"empresaId\\":\\"emp-$i\\",\\"nit\\":\\"90${i}00000\\",\\"nombre\\":\\"Empresa $i\\",\\"plan\\":\\"Basico\\"}"',
          "done",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El descarte deja su línea",
      tarea:
        "Que el pago descartado deje una línea en el log, con sus campos con nombre.",
      pasos: [
        "Que `RegistrarPagoHandler` reciba `ILogger logger` como parámetro.",
        "En el `return` de la referencia repetida, antes de volver, la línea de abajo.",
        "Repite el pago de 80000 con la llave `pago-94-1`.",
      ],
      logro: {
        terminal: {
          salida: [
            "warn: RegistrarPago[0]",
            "      Pago pago-94-1 de emp-94 ya registrado: se descarta",
          ],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "ILogger logger",
          explicacion:
            "un parámetro más del handler. `ILogger<…Handler>` no sirve con una clase `static` (`error CS0718`).",
        },
        {
          k: "nuevo",
          idioma: '"Pago {Referencia} …"',
          explicacion:
            "una plantilla con campos, no un `$\"…\"`: `Referencia` queda como un campo que un buscador de logs filtra.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'logger.LogWarning("Pago {Referencia} de {EmpresaId} ya registrado: se descarta",',
          "    cmd.Referencia, cmd.EmpresaId);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Los otros descartes",
      tarea:
        "Que los otros dos `return` que descartan también dejen su línea. Un proceso ya abierto, o un plazo que lo encuentra resuelto, es normal: `Information`.",
      pasos: [
        "En `SuspenderHandler`, la primera línea de abajo. En su test, pásale `NullLogger.Instance`.",
        "En el `Decidir` de `ProcesoDeSuspensionHandler`, la segunda. Sus cinco `Handle` piden el logger y se lo pasan.",
        "Arranca con `Logging__LogLevel__Default=Warning` y repite el pago de 80000.",
      ],
      logro: {
        items: ["Queda el `warn` del pago, y desaparecen los `info`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'logger.LogInformation("{EmpresaId} ya tiene un proceso abierto: no se abre otro",',
          "    cmd.EmpresaId);",
          'log.LogInformation("{SuspensionId}: el mensaje no cambia el proceso, se descarta",',
          "    suspensionId);",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El id entra por el borde",
      piezas: [
        {
          etiqueta:
            "Junto a tu `UseExceptionHandler`: corre antes de cada endpoint. El id de afuera va al bus, y vuelve en la respuesta.",
          lenguaje: "csharp",
          lineas: [
            "app.Use(async (contexto, siguiente) =>",
            "{",
            "    var bus = contexto.RequestServices.GetRequiredService<IMessageContext>();",
            '    var deAfuera = contexto.Request.Headers["X-Correlation-Id"].ToString();',
            "    if (!string.IsNullOrWhiteSpace(deAfuera)) bus.CorrelationId = deAfuera;",
            "    contexto.Response.OnStarting(() =>",
            "    {",
            '        contexto.Response.Headers["X-Correlation-Id"] = bus.CorrelationId;',
            "        return Task.CompletedTask;",
            "    });",
            "    await siguiente();",
            "});",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El id viaja",
      tarea:
        "Que cada pedido diga su id en la respuesta, y que el diario lo guarde en cada hecho que causó.",
      pasos: [
        "En tu `AddMarten`, `opts.Events.MetadataConfig.CorrelationIdEnabled = true;`, y el `app.Use` de la lámina anterior.",
        'Suspende emp-95 con `-H "X-Correlation-Id: soporte-95"`, y emp-96 sin header.',
        "Consulta `mt_events` por `correlation_id`.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT stream_id, type FROM mt_events WHERE correlation_id = 'soporte-95' ORDER BY seq_id;",
          salida: [
            "emp-95        | empresa_suspendida",
            "susp-emp-95-2 | suspension_solicitada",
            "susp-emp-95-2 | … las respuestas de los socios",
          ],
          tono: "ok",
        },
        items: ["emp-95 responde `202` con `X-Correlation-Id: soporte-95`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "CorrelationId",
          explicacion:
            "va en el sobre de cada mensaje. Lo pone Wolverine, y lo copia a todo lo que causa el pedido.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El id en el log",
      tarea:
        "Que la consola escriba, debajo de cada línea, los campos que la acompañan.",
      pasos: [
        'En `appsettings.json`, dentro de `"Logging": { "Console": { … } }`: `"FormatterName": "simple"` y `"FormatterOptions": { "IncludeScopes": true }`.',
        "Suspende emp-97 con `X-Correlation-Id: soporte-97` y, diez segundos después, mira la línea de su plazo.",
      ],
      logro: {
        items: [
          "La línea del plazo, que corre en la cola, no trae ningún id: la petición ya terminó.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un middleware de Wolverine",
      tarea:
        "Que cada línea escrita mientras corre un handler lleve la correlación del mensaje.",
      pasos: [
        "Crea `CorrelacionEnElLog.cs` con la clase de abajo (`using Microsoft.Extensions.Logging;` y `using Wolverine;`).",
        "En tu `AddWolverine`: `opts.Policies.AddMiddleware(typeof(CorrelacionEnElLog));`",
        'Suspende emp-98 con `-H "X-Correlation-Id: soporte-98"` y, diez segundos después, `grep -B1 -A1 "CorrelationId:soporte-98" servicio.log`.',
      ],
      logro: {
        terminal: {
          salida: ["info: RevisarSuspension[0]", "      => CorrelationId:soporte-98"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "static Before",
          explicacion:
            "Wolverine lo corre antes de cada handler. Lo que devuelve (aquí, el scope) lo cierra al terminar.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class CorrelacionEnElLog",
          "{",
          "    public static IDisposable? Before(ILogger logger, Envelope envelope) =>",
          '        logger.BeginScope("CorrelationId:{CorrelationId}", envelope.CorrelationId);',
          "}",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El pago entero en el log",
      tarea:
        "Escribe el comando entero en `Debug` para depurar, y sube el nivel como en un incidente.",
      pasos: [
        'Al principio de `RegistrarPagoHandler`: `logger.LogDebug("Pago recibido: {Pago}", cmd);`',
        "Arranca con `Logging__LogLevel__RegistrarPago=Debug` y paga a emp-96 con los headers `Idempotency-Key: pago-96-1` y `X-Correlation-Id: soporte-96`.",
        "Busca el monto en el diario, y quita la línea de `Debug`.",
      ],
      logro: {
        terminal: {
          salida: [
            "Pago recibido: RegistrarPago { EmpresaId = emp-96,",
            "  Referencia = pago-96-1, Monto = 50000 }",
          ],
          tono: "error",
        },
        items: [
          "El monto ya estaba en el diario: el `pago_registrado` con `correlation_id` `soporte-96`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Una acción se sigue con su **correlación**: entra o nace en el borde, viaja en cada mensaje, y queda en cada hecho y en cada línea del log. El log lleva ids, no el pago.",
      puntos: [
        {
          termino: "Correlación",
          definicion: "El id que ata todo lo que causó un pedido.",
        },
        {
          termino: "Plantilla con campos",
          definicion: "`{Referencia}`: un campo que se filtra, no un texto suelto.",
        },
        {
          termino: "Scope",
          definicion: "Los campos que acompañan cada línea mientras sigue abierto.",
        },
      ],
      commit: {
        mensaje: "ES · Seguir una acción",
        preguntas: [
          "¿Qué encontraste por la correlación en `mt_events`, y qué solo en el log?",
          "¿Por qué el plazo que encuentra el proceso resuelto no es un `Warning`?",
        ],
      },
      siguiente: {
        seccion: "50 · Dos hosts, una configuración",
        texto:
          "Hasta aquí, un solo programa escribe en el diario. Ahora nace otro: un worker que cambia planes de noche.",
      },
    },
  ],
};
