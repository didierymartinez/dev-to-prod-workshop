// Fuente: workshop-event-sourcing/taller.md, entrada "54 · En vivo y serverless".
import type { Seccion } from "./tipos";

export const seccion54: Seccion = {
  numero: 54,
  titulo: "En vivo y serverless",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que una pantalla se entere **sola** (SSE) y solo de lo **confirmado**, con un contrato tipado en `Contratos`. Y reconocer qué cambia en serverless, sin daemon ni outbox de fondo.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Una petición HTTP pregunta **una vez** y se va.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "¿Y si la pantalla quiere **enterarse sola** en cuanto algo pasa?",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Y si no hay un host que viva para siempre?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La cola y su productor",
      tarea:
        "Crea en `Empresas.Historia` una cola en memoria y un handler que escriba en ella el NIT de cada empresa suspendida.",
      pasos: [
        "En `Empresas.Historia`, un archivo nuevo con la cola `EnVivo` y el productor `EnVivoHandler`, como abajo.",
        "El productor **no** va en `SuspenderHandler`, que corre antes del commit, ni en un `Apply`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Channel<string>",
          explicacion:
            "una cola en memoria: el productor escribe y el iterador lee con `ReadAllAsync`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "using System.Threading.Channels;",
          "using Contratos;",
          "",
          "public static class EnVivo",
          "{ public static readonly Channel<string> Canal = Channel.CreateUnbounded<string>(); }",
          "",
          "public static class EnVivoHandler",
          "{ public static void Handle(EmpresaSuspendidaV2 anuncio) => EnVivo.Canal.Writer.TryWrite(anuncio.Nit); }",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El endpoint que empuja",
      tarea:
        "Publica `GET /suspensiones/en-vivo`: lee la cola y le empuja cada NIT a quien tenga la conexión abierta.",
      pasos: [
        "En `Program.cs`, el endpoint y su `Leer`, como abajo (`using System.Runtime.CompilerServices;`).",
        "En una terminal, `curl -N http://localhost:5000/suspensiones/en-vivo`: queda abierta.",
        "Desde otra terminal, suspende emp-90.",
      ],
      logro: {
        terminal: {
          salida: ["event: suspension", "data: 909000000"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "SSE",
          explicacion:
            "el servidor empuja eventos por una conexión abierta (`text/event-stream`).",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapGet("/suspensiones/en-vivo", (CancellationToken ct) =>',
          '    TypedResults.ServerSentEvents(Leer(ct), eventType: "suspension"));',
          "static async IAsyncEnumerable<string> Leer([EnumeratorCancellation] CancellationToken ct)",
          "{",
          "    await foreach (var nit in EnVivo.Canal.Reader.ReadAllAsync(ct))",
          "        yield return nit;",
          "}",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "La pantalla dijo «suspendida» antes de tiempo",
      bloques: [
        {
          k: "texto",
          texto:
            'Entre `builder.Build()` y `app.Run()`: `FacturacionHandler.ConAcuerdoDePago.Add("904000000");` (**se queda**). Reinicia, da de alta emp-40 a emp-45 y, con el `curl -N` abierto, suspende emp-40.',
        },
        {
          k: "texto",
          tam: "grande",
          texto: "La pantalla avisa al instante: `data: 904000000`.",
        },
        {
          k: "terminal",
          comando: "curl http://localhost:5000/empresas/emp-40",
          salida: [
            '"facturacion":"Rechazado","accesos":"Restituido","estado":"revertida"',
          ],
          tono: "error",
        },
        {
          k: "respuesta",
          texto: "La pantalla avisó lo que **se pidió**, no lo que **pasó**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Avisa lo confirmado",
      tarea:
        "Que la pantalla avise solo las suspensiones que quedaron efectivas, con un contrato nuevo que publica el proceso.",
      pasos: [
        "En `Contratos`, el record `SuspensionEfectivaV1` de abajo.",
        "`ProcesoDeSuspensionHandler` lo devuelve cuando decide `SuspensionEfectiva`. El retorno pasa a `Task<OutgoingMessages>` en `Decidir` y en los cinco `Handle`. Conserva el `ILogger` y el descarte.",
        "`EnVivoHandler` escucha `SuspensionEfectivaV1` en vez de `EmpresaSuspendidaV2`. Suspende emp-41 y otra vez emp-40.",
      ],
      logro: {
        terminal: {
          salida: ["event: suspension", "data: 904100000"],
          tono: "ok",
        },
        items: ["emp-40 no muestra nada, y queda `revertida`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[MessageIdentity("empresas.suspension-efectiva.v1")]',
          "public record SuspensionEfectivaV1(string SuspensionId, string Nit);",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El empuje en la proyección",
      tarea:
        "Empuja el aviso desde el `Apply` del tablero en vez del handler del contrato, y rearma el tablero.",
      pasos: [
        "Deja vacío el cuerpo de tu `Handle(SuspensionEfectivaV1 aviso)`.",
        "En el `Apply(IEvent<SuspensionEfectiva> …)` del tablero, agrega `EnVivo.Canal.Writer.TryWrite(e.StreamKey!);`",
        "Antes de `app.Run()`, `await Vistas.Rearmar(app, \"Tablero\");`. Arranca y abre el `curl -N`.",
      ],
      logro: {
        items: [
          "Sin que nadie suspenda, llega un aviso por cada `suspension_efectiva` del diario.",
          "Deshazlo: quita las dos líneas y devuélvele el cuerpo al `Handle`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La pantalla de soporte",
      tarea:
        "Haz la pantalla como otro programa, que solo conoce `Contratos`, y que imprima cada aviso que le llega.",
      pasos: [
        "Desde la raíz: `dotnet new console -o Pantalla` y `dotnet add Pantalla reference Contratos`. Pega en `Pantalla/Program.cs` el código de abajo.",
        "Cierra el `curl -N`: el canal le da cada aviso a **un solo lector**.",
        "Con el servicio arriba, `dotnet run --project Pantalla`, y suspende emp-42.",
      ],
      logro: {
        terminal: {
          salida: ["NIT 904200000: suspendida"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "SseParser.Create(stream).EnumerateAsync()",
          explicacion:
            "recorre los eventos que llegan; cada uno trae su `EventType` y su `Data`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "using System.Net.ServerSentEvents;",
          "using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };",
          'await using var flujo = await http.GetStreamAsync("http://localhost:5000/suspensiones/en-vivo");',
          "await foreach (var item in SseParser.Create(flujo).EnumerateAsync())",
          '    if (item.EventType == "suspension")',
          '        Console.WriteLine($"NIT {item.Data}: suspendida");',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El nombre que nadie fija",
      tarea:
        "Como el aviso ya es de lo confirmado, renombra el evento solo en el servicio.",
      pasos: [
        'En el endpoint, cambia el literal `"suspension"` por `"suspension-efectiva"`.',
        "Arranca el servicio y la pantalla, y suspende emp-43.",
      ],
      logro: {
        items: [
          "Todo compila.",
          "emp-43 queda `efectiva`, y la pantalla **no muestra nada**, sin error.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El contrato fija nombre y forma",
      tarea:
        "Que el nombre del evento y la forma del aviso vivan en `Contratos`, donde los leen el servicio y la pantalla.",
      pasos: [
        "En `SuspensionEfectivaV1`, la constante `Tipo` de abajo.",
        "El canal pasa a `Channel<SuspensionEfectivaV1>`, y `EnVivoHandler` escribe el `aviso` entero.",
        "En el endpoint, `eventType: SuspensionEfectivaV1.Tipo`, y `Leer` devuelve `IAsyncEnumerable<SuspensionEfectivaV1>`: viaja como JSON.",
      ],
      logro: {
        terminal: {
          salida: [
            "event: suspension-efectiva",
            'data: {"suspensionId":"susp-emp-44-2","nit":"904400000"}',
          ],
          tono: "ok",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[MessageIdentity("empresas.suspension-efectiva.v1")]',
          "public record SuspensionEfectivaV1(string SuspensionId, string Nit)",
          "{",
          '    public const string Tipo = "suspension-efectiva";',
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La pantalla lee el contrato",
      tarea:
        "Que la pantalla compare con `SuspensionEfectivaV1.Tipo` y lea el aviso como el record, para que un cambio de forma no compile.",
      pasos: [
        "En `Pantalla/Program.cs`, el `foreach` de abajo (`using System.Text.Json;` y `using Contratos;`). Suspende emp-44.",
        "Renombra en el contrato `Nit` a `NitEmpresa`, y compila la pantalla.",
        "Devuélvele su nombre.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run --project Pantalla",
          salida: ["NIT 904400000: suspendida"],
          tono: "ok",
        },
        items: ["Con `NitEmpresa`, la pantalla da `error CS1061`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await foreach (var item in SseParser.Create(flujo).EnumerateAsync())",
          "{",
          "    if (item.EventType != SuspensionEfectivaV1.Tipo) continue;",
          "    var aviso = JsonSerializer.Deserialize<SuspensionEfectivaV1>(",
          "        item.Data, JsonSerializerOptions.Web)!;",
          '    Console.WriteLine($"NIT {aviso.Nit}: suspendida");',
          "}",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Serverless: no hay host que viva para siempre",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Una Function despierta con cada mensaje y muere al terminar. Sin un proceso de larga vida:",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "No corre el daemon: las proyecciones van `Inline`.",
            "No hay outbox de fondo: se publica con `SendInline`, que **pierde la atomicidad** del outbox.",
            "`ServerlessWithOutbox` guarda el mensaje con el hecho, pero alguien tiene que correr `RunDurabilityPassAsync`.",
            "El plazo programado **no vence solo**.",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Sin daemon, ¿quién rearma?",
      tarea:
        "Deja tu servicio como quedaría en una Function, sin daemon, y haz que tu orden de rearmar sirva igual.",
      pasos: [
        "En `AgregarEmpresas`, las tres proyecciones `Inline`; en `Program.cs`, `DaemonMode.Disabled`. Antes de `app.Run()`, `await Vistas.Rearmar(app, \"Tablero\");` y arranca.",
        "En `Vistas.Rearmar`, pide el coordinador con `GetService`, y pausa o reanuda solo si no es `null`.",
        "Al terminar: vuelve a `HotCold` con las dos `Async`, rearma las dos y anota en `DECISIONES.md` quién rearma cada vista `Inline`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "No service for type 'JasperFx.Events.",
            "Daemon.IProjectionCoordinator'",
            "has been registered",
          ],
        },
        items: ["Con `GetService`, el tablero se rearma sin daemon."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "SSE avisa lo **confirmado**, con un contrato tipado, desde el handler de ese contrato y nunca desde un `Apply`.",
      puntos: [
        {
          termino: "SSE",
          definicion:
            "El servidor empuja eventos por una conexión abierta.",
        },
        {
          termino: "Contrato tipado",
          definicion:
            "Nombre y forma del aviso en `Contratos`: un cambio no compila, en vez de romper en silencio.",
        },
        {
          termino: "Serverless",
          definicion:
            "Proyecciones `Inline`, que alguien tiene que prever cómo rearmar, y `SendInline`, que pierde la atomicidad del outbox.",
        },
      ],
      commit: {
        mensaje: "ES · En vivo y serverless",
        preguntas: [
          "¿Por qué la pantalla escucha `SuspensionEfectivaV1` y no `EmpresaSuspendidaV2`?",
          "En serverless, ¿qué se pierde con `SendInline`, y quién rearma una vista `Inline`?",
        ],
      },
      siguiente: {
        seccion: "55 · El contexto que falta",
        texto:
          "Todo asume una sola organización. La plataforma la usan varias a la vez, y cada petición tiene que decir de cuál es.",
      },
    },
  ],
};
