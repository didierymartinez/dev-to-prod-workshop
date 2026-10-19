// Fuente: workshop-event-sourcing/taller.md, entrada "62 · El stream que no para de crecer".
import type { Seccion } from "./tipos";

const reconstruir = "una vez la reconstrucción de `Empresa`";

export const seccion62: Seccion = {
  numero: 62,
  titulo: "El stream que no para de crecer",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que cargar una empresa con **veinte mil hechos** cueste lo mismo que cargar una con tres: Marten guarda la empresa ya calculada con cada hecho, y los handlers la leen de ahí.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Una distribuidora recibe decenas de avisos del banco al día. En unos años junta **veinte mil** pagos.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Cada comando sobre ella rehidrata **desde el primero**.",
        },
        { k: "respuesta", texto: "¿Cuánto cuesta eso?" },
      ],
    },
    {
      tipo: "reto",
      titulo: "Mide la carga",
      tarea:
        "Crea una empresa con veinte mil pagos y mide cuánto tarda cargarla, contra una con pocos hechos.",
      pasos: [
        "En `Program.cs`, entre `builder.Build()` y `app.Run()`, pega la siembra de emp-60 y la función `Medir` de las dos láminas siguientes.",
        "Arranca una vez.",
        "Quita la siembra de emp-60 y deja `Medir`: la usas en toda la sección.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: [
            "emp-177: … cargada en 1 ms",
            "emp-60: versión 20001, Distribuidora Andina, cargada en 144 ms",
          ],
          tono: "error",
        },
        items: ["Tus números serán otros, pero emp-60 tarda unas **cien veces** más."],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Una distribuidora con veinte mil pagos",
      piezas: [
        {
          etiqueta: "En `Program.cs`, entre `builder.Build()` y `app.Run()`:",
          lenguaje: "csharp",
          lineas: [
            "var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya",
            'await using (var s = store.LightweightSession("acme"))',
            "{",
            '    Sembrar(s, "emp-60", "906000000", "Distribuidora Andina", "Premium");',
            '    s.Events.Append("emp-60", Enumerable.Range(1, 20_000)',
            '        .Select(i => new PagoRegistrado(10_000, $"BANCO-{i:00000}")));   // BANCO-00001 … BANCO-20000',
            "    await s.SaveChangesAsync();",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Cuánto cuesta cargarla",
      piezas: [
        {
          etiqueta: "Después de la siembra:",
          lenguaje: "csharp",
          lineas: [
            "async Task Medir(string id)",
            "{",
            '    await using var s = store.LightweightSession("acme");',
            "    var reloj = System.Diagnostics.Stopwatch.StartNew();   // un cronómetro que corre desde aquí",
            "    var empresa = await s.Events.AggregateStreamAsync<Empresa>(id);",
            '    Console.WriteLine($"{id}: versión {empresa!.Version}, {empresa.Nombre}, "',
            '        + $"cargada en {reloj.ElapsedMilliseconds} ms");',
            "}",
            "",
            'await Medir("emp-177");   // la primera carga tarda más: no cuenta',
            'await Medir("emp-177");',
            'await Medir("emp-60");',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La empresa se relee entera",
      tarea:
        "Prepara tu `Empresa` para guardarse como documento y releerse completa, sin abrir sus setters.",
      pasos: [
        "En `Empresa` (`using System.Text.Json.Serialization;`), `[JsonInclude]` en cada propiedad de setter privado, **menos** `Version`.",
        "También en el `HashSet` de referencias de pago, y quítale el `readonly`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "[JsonInclude]",
          explicacion:
            "deja que el deserializador llene un setter privado o un campo privado, pero no un campo `readonly`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "[JsonInclude] public string Id { get; private set; }",
          "public long Version { get; private set; }",
          '[JsonInclude] public string Nit { get; private set; } = "";',
          "// … el mismo [JsonInclude] en las demás propiedades …",
          "[JsonInclude] private HashSet<string> _referenciasDePago = new();",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa se relee entera",
      piezas: [
        {
          etiqueta:
            "En tu `Empresa` (`using System.Text.Json.Serialization;`): lo que el documento necesita para releerse. Tus `Apply` no cambian.",
          lenguaje: "csharp",
          lineas: [
            "[JsonInclude] public string Id { get; private set; }",
            "public long Version { get; private set; }   // la llena la línea de Metadata",
            '[JsonInclude] public string Nit { get; private set; } = "";',
            "// … el mismo [JsonInclude] en Nombre, Plan, Suspendida, DeudaPendiente, Reactivaciones y ProcesoAbierto …",
            "[JsonInclude] private HashSet<string> _referenciasDePago = new();   // sin readonly: al releer, se vuelve a llenar",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El snapshot Inline",
      tarea:
        "Que Marten guarde la `Empresa` ya calculada en la transacción de cada hecho, con su `Version`.",
      pasos: [
        "En el `AddMarten` de `AgregarEmpresas`, las dos líneas de abajo.",
        "`SnapshotLifecycle` vive en `JasperFx.Events.Projections`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "snapshot Inline · FetchLatest",
          explicacion:
            "guarda la `Empresa` en `mt_doc_empresa` con cada hecho. `session.Events.FetchLatest<Empresa>(id)` la lee sin rehidratar nada.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Inline);",
          "opts.Schema.For<Empresa>().Metadata(m => m.Revision.MapTo(e => e.Version));",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Reconstruye, y mide otra vez",
      tarea:
        "Los streams que ya existían no tienen documento. Arma sus documentos una vez y mide cargando del snapshot.",
      pasos: [
        "Antes de las llamadas a `Medir`, la reconstrucción de abajo.",
        "En `Medir`, carga con `await s.Events.FetchLatest<Empresa>(id)`.",
        "Arranca una vez, y luego **comenta** la reconstrucción.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["emp-60: versión 20001, Distribuidora Andina, cargada en 4 ms"],
          tono: "ok",
        },
        items: [
          "`SELECT mt_version FROM mt_doc_empresa WHERE id = 'emp-60';` da `20001`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "using (var daemon = await store.BuildProjectionDaemonAsync())",
          '    await daemon.RebuildProjectionAsync("Empresa", CancellationToken.None);',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Decidir desde el snapshot",
      tarea:
        "Que los handlers que deciden sobre la `Empresa` la carguen del snapshot. Cambia solo la carga.",
      pasos: [
        "En `SuspenderHandler`, `RegistrarPagoHandler` y `CambiarPlanHandler`, la carga pasa a `await session.Events.FetchLatest<Empresa>(cmd.EmpresaId)`.",
        "Manda **dos veces** el aviso `BANCO-90001`, con el `curl` de abajo, y suspende emp-60 con `$ACME`.",
        "Corre `dotnet test`.",
      ],
      logro: {
        items: [
          "El `count(*)` de `BANCO-90001` en los hechos de emp-60 da **1**.",
          "Suspender emp-60 crea `susp-emp-60-20003`.",
          "`dotnet test` sigue verde.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'curl -X POST "http://localhost:5000/empresas/emp-60/pagos?monto=10000" \\',
          '  -H "Idempotency-Key: BANCO-90001" -H "Authorization: Bearer $ACME"',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Decidir desde el snapshot",
      piezas: [
        {
          etiqueta:
            "En cada handler que decide sobre la `Empresa`: la misma carga, por el camino que lee el snapshot",
          lenguaje: "csharp",
          lineas: [
            "var empresa = await session.Events.FetchLatest<Empresa>(cmd.EmpresaId)",
            '    ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Lo que lee el snapshot",
      tarea:
        "Prueba dos atajos y mira qué se pierde. Hazlo antes de limpiar `Program.cs`.",
      pasos: [
        "Vuelve `Medir` a `AggregateStreamAsync`.",
        "Pon `SnapshotLifecycle.Async` y `LoadAsync` en `RegistrarPagoHandler`. Manda `BANCO-90002` dos veces seguidas.",
        "Después de cada rotura, restaura y corre " + reconstruir + ".",
      ],
      logro: {
        items: [
          "Con `AggregateStreamAsync`, emp-60 pasa otra vez de **100 ms**.",
          "Con `Async`, el segundo aviso da **409** (o 200): leyó una empresa vieja.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Lo que el documento olvida",
      tarea:
        "Quita lo que deja releer la empresa entera, y mira qué pasa con los pagos.",
      pasos: [
        "Quita el `[JsonInclude]` del `Id` y manda `BANCO-90003`.",
        "Vuelve `readonly` el `HashSet` y manda `BANCO-90004` dos veces.",
        "Después de cada rotura, restaura y corre " + reconstruir + ".",
      ],
      logro: {
        items: [
          "Sin `[JsonInclude]` en el `Id`: **500** con `ArgumentNullException: Value cannot be null. (Parameter 'key')`.",
          "Con `readonly`, `BANCO-90004` **entra dos veces**, y `jsonb_array_length(data -> '_referenciasDePago')` da `1`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Limpia el arranque",
      tarea:
        "Quita de `Program.cs` lo que mediste: corre en cada arranque, también en el host de los tests.",
      pasos: [
        "Quita `Medir`, sus llamadas y la reconstrucción comentada.",
        "Corre `dotnet test`.",
      ],
      logro: { items: ["`dotnet test` sigue verde."] },
    },
    {
      tipo: "planteamiento",
      titulo: "Cuando el stream pasa el umbral",
      bloques: [
        {
          k: "terminal",
          comando: "SELECT length(data::text) FROM mt_doc_empresa WHERE id = 'emp-60';",
          salida: ["unos 300.000 bytes"],
        },
        {
          k: "texto",
          texto:
            "Cuando un stream pasa el umbral (`SELECT id, version FROM mt_streams WHERE version > 1000;`), toca elegir:",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "**Acortar**: tramos por mes, con un hecho de cierre.",
            "**Partir**: darle su propio stream a lo que se valida solo, como cada suspensión.",
          ],
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Rehidratar cuesta lo que mide el stream. Un snapshot `Inline` leído con `FetchLatest` lo evita, si el documento **se relee entero**.",
      puntos: [
        {
          termino: "Snapshot Inline",
          definicion: "La empresa ya calculada, guardada en la transacción de cada hecho.",
        },
        {
          termino: "FetchLatest",
          definicion: "Carga del snapshot, al día. Vive en `IDocumentSession`.",
        },
        {
          termino: "Acortar o partir",
          definicion: "Lo que toca cuando un stream pasa el umbral.",
        },
      ],
      decision:
        "Se decide con `FetchLatest` sobre un snapshot `Inline`.",
      commit: {
        mensaje: "ES · El stream que no para de crecer",
        preguntas: [
          "Si dan la misma empresa, ¿por qué `FetchLatest` y no `AggregateStreamAsync`?",
          "¿Por qué `Inline` y no `Async`? ¿Cuándo acortas o partes?",
        ],
      },
      siguiente: {
        seccion: "63 · El comentario que sobrevive",
        texto:
          "El `readonly` del `HashSet`: ponerlo compila, y deja entrar un pago doble.",
      },
    },
  ],
};
