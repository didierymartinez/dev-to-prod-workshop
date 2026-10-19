// Fuente: workshop-event-sourcing/taller.md, entrada "44 · El host y la inyección".
import type { Seccion } from "./tipos";

export const seccion44: Seccion = {
  numero: 44,
  titulo: "El host y la inyección",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Convertir `Empresas.Historia` en una **API web** que recibe comandos por HTTP y entrega las piezas por **inyección de dependencias**, con una sesión fresca por operación.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          texto: "Operaciones no ejecuta nuestro `Program.cs`: manda un `POST`.",
        },
        {
          k: "texto",
          tam: "grande",
          junto: true,
          texto:
            "¿Quién recibe esa petición y arma por dentro **endpoint → bus → handler → sesión**?",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var bus = host.Services.GetRequiredService<IMessageBus>();",
            'await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));',
          ],
        },
        {
          k: "respuesta",
          junto: true,
          texto: "Sirve para probar, no para un servicio.",
        },
        {
          k: "texto",
          tam: "tenue",
          texto:
            "Wolverine ya descubre tus handlers y les da su sesión. Lo que falta es **cómo entra el comando**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Del host de consola al host web",
      tarea:
        "Convierte `Empresas.Historia` en una API web, sin perder ninguna línea de tu `AddMarten` y tu `AddWolverine`.",
      pasos: [
        'En `Empresas.Historia.csproj`, cambia `Sdk="Microsoft.NET.Sdk"` por `Sdk="Microsoft.NET.Sdk.Web"`. Es el mismo proyecto.',
        "En `Program.cs`, arma el host con `WebApplication.CreateBuilder(args)` y pásale tu `AddMarten` y tu `AddWolverine` enteros. Conserva la lectura de `CADENA_POSTGRES` y tu método `Sembrar`.",
        "Saca del `Program.cs` los comandos que disparabas a mano: desde ahora entran por un endpoint. Al final, `app.Run()`.",
      ],
      logro: {
        items: [
          "Compila y `dotnet run` se queda corriendo: no termina.",
        ],
      },
      tips: [
        {
          k: "lista",
          titulo: "Que no se pierda nada",
          items: [
            "`Hechos.Registrar`",
            "las tres proyecciones, con su porqué al lado",
            "la `Metadata` de `EmpresaDetalle`",
            "los dos `IncludeAssembly` (Facturación y Accesos)",
            "`MultipleHandlerBehavior.Separated`",
            "las dos `OnException` y `ScheduledJobPollingTime`",
          ],
        },
        {
          k: "nuevo",
          idioma: "WebApplication.CreateBuilder(args)",
          explicacion:
            "arma un host web. `app.Run()` lo deja vivo, y dentro de él el daemon y Wolverine.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Del host de consola al host web (1 de 2)",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/Program.cs` (`Empresas.Historia.csproj` con Sdk `Microsoft.NET.Sdk.Web`)",
          lenguaje: "csharp",
          lineas: [
            'var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")',
            '    ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");   // la misma línea de Todo o nada',
            "var builder = WebApplication.CreateBuilder(args);   // host WEB",
            "",
            "// AddMarten y AddWolverine: los de tu host de consola, sin perder ninguna línea",
            "builder.Services.AddMarten(opts =>",
            "{",
            "    opts.Connection(cadena);",
            "    opts.Events.StreamIdentity = StreamIdentity.AsString;",
            "    Hechos.Registrar(opts);                                                        // §31",
            "    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);       // Async: solo la mira soporte; sin AddAsyncDaemon no avanza, y no avisa",
            "    opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);   // Inline: Facturación cobra con su respuesta; en Async cobra el plan viejo",
            "    opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);           // Async: la pantalla de soporte tolera ir un instante atrás",
            "    opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));   // la versión de la vista Inline, desde mt_version",
            "})",
            ".UseLightweightSessions()",
            ".IntegrateWithWolverine()          // el outbox de §32",
            ".AddAsyncDaemon(DaemonMode.Solo);  // el daemon de §40",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Del host de consola al host web (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue en `Program.cs`, después de `AddMarten`",
          lenguaje: "csharp",
          lineas: [
            "builder.Services.AddWolverine(opts =>",
            "{",
            "    opts.Policies.AutoApplyTransactions();",
            "    opts.Policies.UseDurableLocalQueues();   // el outbox durable de §32",
            "    // los handlers de los socios: Wolverine solo busca en el ensamblado que arranca el host",
            "    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);",
            "    opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);       // §36",
            "    opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;      // §36",
            "    opts.OnException<JasperFx.ConcurrencyException>()                      // §37: la clase base, con el nombre completo",
            "        .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());",
            "    opts.OnException<TimeoutException>()                                   // §38: lo pasajero se reintenta",
            "        .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());",
            "    opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();          // §38",
            "    // si conservas el orden por llave de §37, también va aquí",
            "});",
            "// + paquete WolverineFx.RuntimeCompilation",
            "",
            "var app = builder.Build();",
            "",
            "// aquí, antes de app.Run(), va la siembra de emp-10 (solo el primer arranque)",
            "// y en cualquier parte del archivo, tu método Sembrar de §31",
            "",
            "app.Run();   // levanta el servidor y lo deja vivo (con el daemon + Wolverine corriendo dentro)",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Siembra emp-10",
      tarea:
        "Siembra una empresa activa, emp-10, para tener a quién suspender por HTTP.",
      pasos: [
        "En `Program.cs`, entre `var app = builder.Build();` y `app.Run();`, el bloque de abajo.",
        "Arranca una vez con `dotnet run` y borra el bloque: en el siguiente arranque, emp-10 ya existe.",
      ],
      logro: {
        items: ["`mt_events` tiene `emp-10 | 1 | empresa_registrada`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = app.Services.GetRequiredService<IDocumentStore>();",
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-10", "901000000", "Transportes Sabana", "Premium");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El primer endpoint",
      tarea:
        "Que un `POST` suspenda una empresa y el hecho quede en el diario, sin escribir un solo `new`.",
      pasos: [
        'Antes de `app.Run()`, `app.MapPost("/empresas/{id}/suspender", …)` con `IMessageBus bus`, que haga `bus.InvokeAsync(new SuspenderEmpresa(id, "mora"))` y devuelva `Results.Ok()`.',
        "Tu `SuspenderHandler` no se toca: ya recibe la sesión por parámetro.",
        "Con el servidor corriendo, `curl -X POST http://localhost:5000/empresas/emp-10/suspender`, y revisa `mt_events`.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT stream_id, version, type FROM mt_events WHERE stream_id = 'emp-10' ORDER BY version;",
          salida: ["emp-10 | 1 | empresa_registrada", "emp-10 | 2 | empresa_suspendida"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: 'app.MapPost("/ruta/{id}", …)',
          explicacion:
            "publica un endpoint. `{id}` se enlaza a `string id`; los demás parámetros los da el contenedor.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El primer endpoint",
      piezas: [
        {
          etiqueta: "`Program.cs`, antes de `app.Run()`",
          lenguaje: "csharp",
          lineas: [
            "// el endpoint: {id} viene de la ruta; IMessageBus lo inyecta el contenedor. Es tu despachador.Enviar, ahora por HTTP.",
            'app.MapPost("/empresas/{id}/suspender", async (string id, IMessageBus bus) =>',
            "{",
            '    await bus.InvokeAsync(new SuspenderEmpresa(id, "mora"));',
            "    return Results.Ok();",
            "});",
          ],
        },
      ],
      nota: "Tu `SuspenderHandler` no aparece porque no cambia. El contenedor le da al endpoint el `IMessageBus`, y Wolverine le abre al handler la sesión de ese mensaje.",
    },
    {
      tipo: "reto",
      titulo: "Las suspendidas, por HTTP",
      tarea:
        "Que soporte pregunte, también por HTTP, qué empresas están suspendidas.",
      pasos: [
        '`app.MapGet("/empresas/suspendidas", …)` con una `IQuerySession` que devuelva los `Id` de `VistaSuspendida` que tienen `Suspendida`.',
        "Llámalo con `curl http://localhost:5000/empresas/suspendidas`.",
      ],
      logro: {
        terminal: {
          comando: "curl http://localhost:5000/empresas/suspendidas",
          salida: ['["emp-10", …]'],
          tono: "ok",
        },
        items: ["Si no sale emp-10, repite en un segundo: la vista es `Async`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "IDocumentSession",
          explicacion:
            "una unidad de trabajo. Va una por petición y una por mensaje, nunca compartida.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Las suspendidas, por HTTP",
      piezas: [
        {
          etiqueta: "`Program.cs`, antes de `app.Run()`",
          lenguaje: "csharp",
          lineas: [
            "// el endpoint de lectura: la IQuerySession la da el contenedor, una fresca por petición",
            'app.MapGet("/empresas/suspendidas", async (IQuerySession session) =>',
            "    await session.Query<VistaSuspendida>().Where(v => v.Suspendida).Select(v => v.Id).ToListAsync());",
          ],
        },
      ],
      nota: "Si emp-10 no sale justo después de suspenderla, el daemon va atrás: la vista es `Async`. Repite en un segundo.",
    },
    {
      tipo: "rompelo",
      titulo: "El new que no está",
      tarea:
        "**No lo saltes:** la sección siguiente parte del entorno del host y de `PermitirReset`. Primero, pide una pieza nueva sin registrarla en ningún lado.",
      pasos: [
        "Agrega `ILogger logger` como parámetro de tu `SuspenderHandler` y suspende una empresa.",
        "Quítalo: tu test de suspender todavía no se lo pasa.",
      ],
      logro: {
        items: [
          "El logger llega sin registrar nada: lo da el contenedor.",
          "De punta a punta, endpoint → handler → sesión → diario, no escribiste ningún `new` de cableado.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La sesión guardada",
      tarea:
        "Reusa la sesión del primer mensaje en los siguientes, y mira qué se pierde.",
      pasos: [
        "En tu `SuspenderHandler`, guarda en un campo `static` la primera `IDocumentSession` que recibas y úsala en las llamadas siguientes.",
        'Siembra `emp-15` (`901500000`, "Panadería Oriente") y `emp-16` (`901600000`, "Lavandería Sur"), plan `Basico`. Suspéndelas por el endpoint, una tras otra, y espera unos segundos.',
        "Al terminar, quita el campo `static`.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT message_type, exception_type FROM wolverine_dead_letters ORDER BY sent_at DESC LIMIT 3;",
          salida: [
            "facturacion.multa-cobrada.v2 | System.InvalidOperationException",
            "accesos.accesos-revocados.v2 | System.InvalidOperationException",
            "RevisarSuspension            | System.InvalidOperationException",
          ],
          tono: "error",
        },
        items: [
          "Las dos dan 200, pero emp-16 se queda en `empresa_registrada`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La sesión propia",
      tarea:
        "Abre tú la sesión en el handler y guarda con tu propio `SaveChangesAsync`, con una falla justo después.",
      pasos: [
        "En tu `SuspenderHandler`, cambia `IDocumentSession session` por `IDocumentStore store` y abre la tuya: `await using var session = store.LightweightSession();`",
        'Antes del `return`, `await session.SaveChangesAsync();` y después `throw new InvalidOperationException("falla después de guardar");`. Siembra `emp-39` (`903900000`, "Papelería Andina") y suspéndela.',
        "Al terminar, quita la falla y devuelve la sesión por parámetro, sin tu `SaveChangesAsync`.",
      ],
      logro: {
        terminal: {
          comando: "curl -X POST http://localhost:5000/empresas/emp-39/suspender",
          salida: ["500"],
          tono: "error",
        },
        items: [
          "Los hechos de emp-39 quedaron en `mt_events`, pero sus pedidos no salieron: `multas` no tiene fila para `903900000`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El reset que viaja",
      tarea:
        "Agrega un endpoint que vacía el diario, sin guarda, y mira en qué entorno corre.",
      pasos: [
        "Crea una base desechable, `empresas_reset`, con las tablas `procesados` y `multas`, y apunta ahí tu `CADENA_POSTGRES`: este endpoint borra.",
        "Antes de `app.Run()`, el endpoint de abajo. Siembra emp-10, suspéndela y llama `curl -X POST http://localhost:5000/dev/reset`. Mira el log del arranque.",
      ],
      logro: {
        terminal: { salida: ["Hosting environment: Production"], tono: "error" },
        items: ["Tu endpoint de desarrollo corría en producción."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapPost("/dev/reset", async (IDocumentStore store) =>',
          "{",
          "    await store.Advanced.Clean.DeleteAllEventDataAsync();",
          "    return Results.Ok();",
          "});",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El reset, solo si lo pides",
      tarea:
        "Que el reset exista solo en desarrollo y si lo prendes con `PermitirReset`. El entorno sale de `ASPNETCORE_ENVIRONMENT` (si falta, vale `Production`) y se pregunta con `IsDevelopment()`.",
      pasos: [
        "Cambia tu `/dev/reset` por el de abajo. Prueba con `dotnet run` y con `ASPNETCORE_ENVIRONMENT=Development PermitirReset=true dotnet run`.",
        "Al terminar, devuelve tu `CADENA_POSTGRES` a tu base.",
      ],
      logro: {
        items: [
          "En `Production`, el reset no existe. Solo responde con `Development` y `PermitirReset=true`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("PermitirReset"))',
          "{",
          '    app.MapPost("/dev/reset", async (IServiceProvider servicios) =>',
          "    {",
          "        await servicios.ResetAllMartenDataAsync();",
          "        return Results.Ok();",
          "    });",
          "}",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El contenedor da cada pieza con su alcance: **una sesión por operación**, nunca compartida ni abierta por el handler.",
      puntos: [
        {
          termino: "Host web",
          definicion:
            "`app.Run()` lo deja vivo, con el daemon y Wolverine.",
        },
        {
          termino: "Inyección de dependencias",
          definicion:
            "Pides la pieza como parámetro y el contenedor te la da.",
        },
        {
          termino: "Unidad de trabajo",
          definicion:
            "La `IDocumentSession`: una por petición y una por mensaje.",
        },
        {
          termino: "Entorno del host",
          definicion:
            "`ASPNETCORE_ENVIRONMENT`; si falta, `Production`.",
        },
      ],
      commit: {
        mensaje: "ES · El host y la inyección",
        preguntas: [
          "¿Qué parte del infierno de los `new` pagó Wolverine y cuál cierra el host web?",
          "¿Qué pasa si guardas la sesión para reusarla?",
        ],
      },
      siguiente: {
        seccion: "45 · La configuración viene de afuera",
        texto:
          "El host sabe en qué entorno corre, pero el plazo sigue siendo un `5.Seconds()` fijo y la cadena una variable leída a mano.",
      },
    },
  ],
};
