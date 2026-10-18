// Fuente: workshop-event-sourcing/taller.md, entrada "48 · El borde es un contrato".
import type { Seccion } from "./tipos";

const alta = (id: string) => [
  'curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" \\',
  `  -d '{"empresaId":"${id}","nit":"909000000","nombre":"Empresa ${id.slice(4)}","plan":"Basico"}'`,
];

export const seccion48: Seccion = {
  numero: 48,
  titulo: "El borde es un contrato",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Errores con forma (**ProblemDetails**, 409 o 500, sin filtrar detalles internos), y una historia por HTTP que **no cambia** cuando renombras un hecho.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Un NIT repetido es un error **del pedido**, no del servidor.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto:
            "Si respondemos 500, la pantalla reintenta algo que nunca va a servir.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El NIT repetido",
      tarea:
        "Da de alta dos empresas con el mismo NIT, como una pantalla con un error de digitación.",
      pasos: [
        "Arranca en `Development`: `ASPNETCORE_ENVIRONMENT=Development dotnet run`.",
        "Da de alta emp-90 (NIT `909000000`) y luego emp-91 con el mismo NIT, con los comandos de abajo.",
      ],
      logro: {
        terminal: {
          salida: [
            "HTTP/1.1 202 Accepted",
            "HTTP/1.1 500 Internal Server Error",
            "JasperFx.DocumentAlreadyExistsException: Document already exists Localizador: 909000000",
          ],
          tono: "error",
        },
        items: ["Y después, el stack de tu código."],
      },
      ejemplo: { lenguaje: "bash", lineas: [...alta("emp-90"), ...alta("emp-91")] },
    },
    {
      tipo: "reto",
      titulo: "La pantalla reintenta",
      tarea:
        "Simula la pantalla: si el servidor falla, reintenta; si el error es del pedido, para.",
      pasos: [
        "Corre el bucle de abajo.",
        "Arranca en `Production`, `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run`, y repite el alta de emp-91.",
      ],
      logro: {
        terminal: {
          salida: ["intento 1: 500", "intento 2: 500", "intento 3: 500"],
          tono: "error",
        },
        items: ["En `Production`, un 500 sin cuerpo."],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "for i in 1 2 3; do",
          '  c=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/empresas \\',
          '    -H "Content-Type: application/json" \\',
          "    -d '{\"empresaId\":\"emp-91\",\"nit\":\"909000000\",\"nombre\":\"Empresa 91\",\"plan\":\"Basico\"}')",
          '  echo "intento $i: $c"; [ "$c" -lt 500 ] && break; sleep 1',
          "done",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El conflicto es un 409",
      tarea:
        "Que un alta repetida responda 409 con un cuerpo de error estándar, y cualquier otra falla 500.",
      pasos: [
        "`builder.Services.AddProblemDetails();` junto a tus servicios, y `app.UseExceptionHandler(…)` después de `builder.Build()`.",
        "409 para `JasperFx.DocumentAlreadyExistsException` (el NIT) y `Marten.Exceptions.ExistingStreamIdCollisionException` (el id).",
        "500 para todo lo demás. Corre otra vez el bucle de la pantalla, en los dos entornos.",
      ],
      logro: {
        terminal: {
          salida: ["409", '{"type":"…","title":"Conflict",', '"status":409,"traceId":"00-…-00"}'],
          tono: "ok",
        },
        items: ["La pantalla muestra `intento 1: 409`, y para."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "409 y 500",
          explicacion:
            "409 dice «choca con lo que ya hay»; 500 dice «falló el servidor». `AddProblemDetails()` da el cuerpo estándar: `type`, `title`, `status`, `traceId`.",
        },
        {
          k: "nuevo",
          idioma: "StatusCodeSelector = ex => …",
          explicacion:
            "en `new ExceptionHandlerOptions { … }`: `UseExceptionHandler` atrapa la excepción y tu función elige el código.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El otro conflicto",
      tarea:
        "Un choque de concurrencia que sigue tras los reintentos también es un conflicto: otro escribió primero.",
      pasos: [
        "Comenta tu política de `ConcurrencyException`. Da de alta emp-92 (NIT `909200000`) y corre los treinta pares de abajo.",
        "Suma `|| ex is JasperFx.ConcurrencyException` al 409 y repite con llaves `d-$k`.",
        "Vuelve a poner la política.",
      ],
      logro: {
        terminal: { salida: ["30 200", "30 500"], tono: "error" },
        items: ["Con llaves `d-$k`, ya no hay 500."],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "for k in $(seq 1 30); do",
          "  for i in 1 2; do",
          '    curl -s -o /dev/null -w "%{http_code}\\n" -X POST \\',
          '      "http://localhost:5000/empresas/emp-92/pagos?monto=100" -H "Idempotency-Key: c-$k" &',
          "  done; wait",
          "done | sort | uniq -c",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El detalle que se escapa",
      tarea:
        "**No lo saltes:** la frase del NIT se usa más adelante. Manda en el 409 el mensaje de la excepción, y mira qué recibe cualquier cliente.",
      pasos: [
        "Cambia tu `AddProblemDetails()` por el de abajo: pone el mensaje de la excepción en `Detail`.",
        "Arranca en `Production` y repite el alta de emp-91.",
      ],
      logro: {
        terminal: {
          salida: ['"detail":"Document already exists Localizador: 909000000"'],
          tono: "error",
        },
        items: [
          "El id repetido entrega el mensaje largo de Marten: qué librería usas y cómo se llama tu documento interno.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddProblemDetails(o =>",
          "    o.CustomizeProblemDetails = c => c.ProblemDetails.Detail = c.Exception?.Message);",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La frase es tuya",
      tarea:
        "Para el NIT repetido, tu propia frase. El mensaje de la excepción, solo en `Development`.",
      pasos: [
        "Cambia tu `AddProblemDetails` por el de abajo.",
        "Repite las dos altas en los dos entornos.",
      ],
      logro: {
        items: [
          "El NIT repetido trae `Ya existe una empresa con ese NIT.` en los dos.",
          "El id repetido trae el mensaje de Marten en `Development`, y en `Production`, ningún `detail`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>",
          "{",
          "    if (c.Exception is JasperFx.DocumentAlreadyExistsException)",
          '        c.ProblemDetails.Detail = "Ya existe una empresa con ese NIT.";',
          "    else if (builder.Environment.IsDevelopment())",
          "        c.ProblemDetails.Detail = c.Exception?.Message;",
          "});",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La historia, cruda",
      tarea:
        "Que soporte vea la historia de una empresa por HTTP, con los hechos tal cual.",
      pasos: [
        "Junto a tus endpoints, el de abajo. `FetchStreamAsync` trae cada hecho en su sobre: `Version`, su clase (`EventType`) y el hecho (`Data`).",
      ],
      logro: { items: ["`curl -s http://localhost:5000/empresas/emp-90/historia` trae sus hechos."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapGet("/empresas/{id}/historia", async (string id, IQuerySession session) =>',
          "    (await session.Events.FetchStreamAsync(id))",
          "        .Select(e => new { e.Version, Tipo = e.EventType.Name, e.Data }));",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La pantalla cuenta los pagos",
      tarea:
        "Paga a emp-90 y cuenta sus pagos en la historia, como lo hace la pantalla de soporte.",
      pasos: ["Corre los dos comandos de abajo."],
      logro: { terminal: { salida: ["1"], tono: "ok" } },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'curl -s -X POST "http://localhost:5000/empresas/emp-90/pagos?monto=50000" \\',
          '  -H "Idempotency-Key: pago-90-1"',
          "curl -s http://localhost:5000/empresas/emp-90/historia | grep -o '\"tipo\":\"PagoRegistrado\"' | wc -l",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Renombra el hecho",
      tarea:
        "Renombra `PagoRegistrado` sin romper el diario, y mira qué le pasa a la pantalla.",
      pasos: [
        "Con el IDE, renombra `PagoRegistrado` a `PagoRecibido`.",
        'En `Hechos.Registrar`, su línea pasa a `opts.Events.MapEventType<PagoRecibido>("pago_registrado");`',
        "Corre `dotnet test`, arranca, y cuenta otra vez los pagos de emp-90.",
      ],
      logro: {
        items: [
          "`dotnet test` pasa.",
          'La historia dice `"tipo":"PagoRecibido"`, y el `grep` de la pantalla cuenta 0. Nada avisó.',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La historia tiene su contrato",
      tarea:
        "Cambia tu endpoint crudo por uno que entregue un tipo propio, con el alias del hecho. Deja `PagoRecibido` en su lugar.",
      pasos: [
        "Declara el `record HechoDeLaHistoria` de abajo. No lleva el NIT ni la referencia del pago.",
        "Cada hecho, con `e.Data switch { … }`: `Tipo` sale de `e.EventTypeName` (el alias) y `Cuando` de `e.Timestamp`. El plan, el motivo y el monto, de los hechos que los tienen.",
        "Si el stream no tiene hechos, 404.",
      ],
      logro: {
        items: [
          'La historia de emp-90 trae `"tipo":"empresa_registrada"` y `"tipo":"pago_registrado"` con `"monto":50000`.',
          "La de emp-999 da 404.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "e.Data switch { PagoRecibido h => …, _ => … }",
          explicacion:
            "un `switch` que devuelve un valor. `_` es la rama de cualquier otro tipo.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public record HechoDeLaHistoria(long Version, string Tipo, DateTimeOffset Cuando,",
          "    string? Plan, string? Motivo, int? Monto);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Deshaz el renombre",
      tarea: "Vuelve a `PagoRegistrado`, y mira que la historia no cambia.",
      pasos: [
        "Vuelve a `PagoRegistrado`, y en `Hechos.Registrar`, a su línea de antes. El `switch` también.",
        "Cambia el `grep` de la pantalla a `'\"tipo\":\"pago_registrado\"'`.",
      ],
      logro: {
        items: [
          'La historia sigue con `"tipo":"pago_registrado"`, y el `grep` cuenta 1.',
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Lo que cruza el borde HTTP **es un contrato**: el error tiene forma, el detalle se queda en el log, y la historia sale por un tipo propio con el alias del hecho.",
      puntos: [
        {
          termino: "ProblemDetails",
          definicion: "El cuerpo estándar de un error: `type`, `title`, `status`, `traceId`.",
        },
        {
          termino: "409 y 500",
          definicion: "Choca con lo que ya hay, o falló el servidor. Solo el 500 se reintenta.",
        },
        {
          termino: "HechoDeLaHistoria",
          definicion: "Lo que el cliente ve de cada hecho: no cambia si renombras la clase.",
        },
      ],
      commit: {
        mensaje: "ES · El borde es un contrato",
        preguntas: [
          "¿Qué hace distinto la pantalla con un 409 y con un 500?",
          "¿Por qué la historia cruda se rompió con un renombre que el diario aguantó?",
        ],
      },
      siguiente: {
        seccion: "49 · Seguir una acción",
        texto:
          "El 409 trae un `traceId`. Búscalo en el log: no está.",
      },
    },
  ],
};
