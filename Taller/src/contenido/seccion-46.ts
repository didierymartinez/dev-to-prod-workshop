// Fuente: workshop-event-sourcing/taller.md, entrada "46 · Lo que acabas de pedir".
import type { Seccion } from "./tipos";

const consultaPares =
  "SELECT data->>'Referencia', count(*) FROM mt_events WHERE stream_id = 'emp-78' AND data->>'Referencia' LIKE 'par-%' GROUP BY 1 HAVING count(*) > 1;";

const bucle = (llave: string) => [
  "for k in $(seq 1 50); do",
  "  for i in 1 2; do",
  '    curl -s -o /dev/null -X POST "http://localhost:5000/empresas/emp-78/pagos?monto=100" \\',
  `      -H "Idempotency-Key: ${llave}-$k" &`,
  "  done; wait",
  "done",
];

export const seccion46: Seccion = {
  numero: 46,
  titulo: "Lo que acabas de pedir",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el POST diga dónde seguir el pedido (**202** y `Location`), que la ficha distinga **«todavía no»** de **«no existe»**, y que un pago repetido con su `Idempotency-Key` no se registre dos veces.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La pantalla de soporte da de alta una empresa y abre su ficha enseguida.",
        },
        { k: "respuesta", texto: "Recibe 404." },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿La empresa **no existe**, o **todavía no está**?",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El alta y la ficha",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Historia/Program.cs`, junto a tus otros endpoints:",
          lenguaje: "csharp",
          lineas: [
            'app.MapPost("/empresas", async (RegistrarEmpresa cmd, IMessageBus bus) =>',
            "{",
            "    await bus.InvokeAsync(cmd);",
            "    return Results.Ok();",
            "});",
            "",
            'app.MapGet("/empresas/{id}", async (string id, IQuerySession session) =>',
            "{",
            "    var ficha = await session.LoadAsync<Tablero>(id);",
            "    return ficha is null ? Results.NotFound() : Results.Ok(ficha);",
            "});",
          ],
        },
      ],
      luego:
        "Un `record` como parámetro, como `RegistrarEmpresa cmd`, se lee del cuerpo JSON de la petición.",
    },
    {
      tipo: "reto",
      titulo: "La ficha, enseguida",
      tarea:
        "Da de alta emp-76 y pide su ficha en el mismo instante. Luego pide una empresa que no existe.",
      pasos: [
        "Corre el alta y la ficha de emp-76 con el comando de abajo: es una sola línea.",
        "Pide `curl -i http://localhost:5000/empresas/emp-999`.",
        "Un segundo después, pide otra vez la ficha de emp-76.",
      ],
      logro: {
        terminal: {
          salida: ["HTTP/1.1 200 OK", "HTTP/1.1 404 Not Found"],
          tono: "error",
        },
        items: [
          "emp-999 da el mismo 404.",
          "Un segundo después, emp-76 da 200: el tablero es `Async`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "curl -i -X POST http://localhost:5000/empresas -H \"Content-Type: application/json\" \\",
          '  -d \'{"empresaId":"emp-76","nit":"907600000","nombre":"Empresa 76","plan":"Basico"}\'; \\',
          "  curl -i http://localhost:5000/empresas/emp-76",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El POST dice dónde mirar",
      tarea:
        "Que tus dos POST respondan 202 y digan, en `Location`, dónde seguir el pedido.",
      pasos: [
        'En el alta, `return Results.Accepted($"/empresas/{cmd.EmpresaId}");`',
        'En suspender, `return Results.Accepted($"/empresas/{id}");`',
        "Prueba con el alta de emp-77 (NIT `907700000`).",
      ],
      logro: {
        terminal: {
          salida: ["HTTP/1.1 202 Accepted", "Location: /empresas/emp-77"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Results.Accepted(ruta)",
          explicacion:
            "responde `202 Accepted` y pone `Location`. No es un 201: con una vista `Async`, el resultado todavía no está.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Todavía no, o no existe",
      tarea:
        "Que la ficha le pregunte al diario cuando el tablero todavía no tiene la empresa.",
      pasos: [
        "En el `GET /empresas/{id}`: si el tablero la tiene, 200 con la ficha.",
        'Si no, pregunta al diario. Si el stream existe, `Results.Accepted(value: new { Id = id, Estado = "en proceso" })`; si no, `Results.NotFound()`.',
        "Prueba con el alta de emp-78 y su ficha enseguida, y con emp-999.",
      ],
      logro: {
        terminal: {
          salida: ['HTTP/1.1 202 Accepted   {"id":"emp-78","estado":"en proceso"}'],
          tono: "ok",
        },
        items: ["emp-999 da 404."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "FetchStreamStateAsync(id)",
          explicacion:
            "en `session.Events`: dice si el stream existe, sin cargar sus hechos. Si no existe, devuelve `null`.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Esperar al diario",
      tarea:
        "Espera un poco antes de responder 404, y mide cuánto tarda una empresa que no existe.",
      pasos: [
        "Mide cuánto tarda emp-999 con el `curl` de «Lo logras cuando».",
        "En tu GET, envuelve `FetchStreamStateAsync` en dos reintentos, de 150 y 350 ms, como abajo. Mide otra vez.",
        "El 404 no cambia: tras un 202, la espera la hace el cliente. Quita los reintentos.",
      ],
      logro: {
        terminal: {
          comando:
            'curl -s -o /dev/null -w "%{http_code} %{time_total}\\n" http://localhost:5000/empresas/emp-999',
          salida: ["404 0.003   →   404 0.51"],
          tono: "error",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var stream = await session.Events.FetchStreamStateAsync(id);",
          "foreach (var espera in new[] { 150, 350 })",
          "{",
          "    if (stream is not null) break;",
          "    await Task.Delay(espera);",
          "    stream = await session.Events.FetchStreamStateAsync(id);",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El endpoint de pagos",
      tarea:
        "Que soporte registre pagos por HTTP, con una referencia nueva en cada petición.",
      pasos: [
        "Junto a tus endpoints, el de abajo.",
        "El `int monto` se lee de la URL: `?monto=50000`.",
      ],
      logro: { items: ["Compila y arranca."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapPost("/empresas/{id}/pagos", async (string id, int monto, IMessageBus bus) =>',
          "{",
          "    await bus.InvokeAsync(new RegistrarPago(id, Guid.NewGuid().ToString(), monto));",
          "    return Results.Ok();",
          "});",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El mismo pago, dos veces",
      tarea:
        "Manda el mismo pago dos veces, como una pantalla que reintenta, y mira el diario.",
      pasos: [
        'Manda dos veces: `curl -i -X POST "http://localhost:5000/empresas/emp-77/pagos?monto=50000"`.',
        "Consulta las referencias de los `pago_registrado` de emp-77.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT data->>'Referencia' FROM mt_events WHERE stream_id = 'emp-77' AND type = 'pago_registrado';",
          salida: ["1b50dcfa-…", "ee8beddb-…"],
          tono: "error",
        },
        items: [
          "Dos pagos. Tu handler ignora una referencia repetida, pero cada petición trae una nueva.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La llave la inventa el cliente",
      tarea:
        "Que la referencia del pago sea la `Idempotency-Key` del cliente, y que sin ella no se pague.",
      pasos: [
        'En el endpoint de pagos, el parámetro `[FromHeader(Name = "Idempotency-Key")] string? llave` (`using Microsoft.AspNetCore.Mvc;`). La llave es la referencia.',
        'Sin llave: `Results.BadRequest("Falta el header Idempotency-Key.")`.',
        'Manda dos pagos a emp-78 con `-H "Idempotency-Key: pago-78-1"`, y uno sin llave.',
      ],
      logro: {
        items: [
          "Los dos pagos con `pago-78-1` dejan un solo `pago_registrado`.",
          "Sin llave, 400.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Idempotency-Key",
          explicacion:
            "un header que el cliente inventa una vez por pago y repite en cada reintento de ese pago.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos a la vez",
      tarea:
        "Manda cincuenta pares de pagos simultáneos a emp-78, cada par con su llave, y busca llaves con dos pagos.",
      pasos: [
        "Corre el bucle de abajo, y luego la consulta de llaves repetidas.",
        "Si no sale ninguna, corre el bucle otra vez, con llaves `par2-$k`.",
      ],
      logro: {
        terminal: { comando: consultaPares, salida: ["par-8 | 2"], tono: "error" },
      },
      ejemplo: { lenguaje: "bash", lineas: bucle("par") },
    },
    {
      tipo: "reto",
      titulo: "La versión esperada",
      tarea:
        "Que el segundo pedido del par choque con el primero, y el reintento lo detenga.",
      pasos: [
        "En el `Append` de tu `RegistrarPagoHandler`, pasa la versión esperada: `empresa.Version + 1`.",
        "Repite el bucle con llaves `otra-$k`, y la consulta con `LIKE 'otra-%'`.",
      ],
      logro: { items: ["Ninguna llave sale dos veces."] },
      ejemplo: { lenguaje: "bash", lineas: bucle("otra") },
    },
    {
      tipo: "aprendizaje",
      idea: "Un pedido se contesta con lo que de verdad pasó. La existencia la dice el **diario**, que nunca va atrás. El reintento lleva la **llave del cliente**.",
      puntos: [
        {
          termino: "202 y Location",
          definicion: "«Lo recibí, y aquí lo sigues». El resultado todavía no está.",
        },
        {
          termino: "FetchStreamStateAsync",
          definicion: "El diario dice si existe; la vista, solo lo que ya proyectó.",
        },
        {
          termino: "Idempotency-Key",
          definicion: "La llave que el cliente inventa: es la referencia del pago.",
        },
      ],
      commit: {
        mensaje: "ES · Lo que acabas de pedir",
        preguntas: [
          "¿Por qué el diario dice «existe» y el tablero todavía no?",
          "¿Por qué la llave del pago la inventa el cliente?",
        ],
      },
      siguiente: {
        seccion: "47 · La respuesta dice cuánto sabe",
        texto:
          "Cuando la ficha sí tiene la empresa, la entrega con 200 aunque vaya atrás: justo después de suspender, todavía dice `activa`.",
      },
    },
  ],
};
