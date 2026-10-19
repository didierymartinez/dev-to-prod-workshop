// Fuente: workshop-event-sourcing/taller.md, entrada "41 · La vista en la misma transacción".
import type { Seccion } from "./tipos";

export const seccion41: Seccion = {
  numero: 41,
  titulo: "La vista en la misma transacción",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que la pregunta por el plan la conteste una vista `Inline`, escrita **en la misma transacción del hecho**, y que cada registro diga en el código por qué es `Inline` o `Async`.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "`ConsultarPlanHandler` rehidrata la historia **entera** de la empresa para contestar un plan.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Y si contesta desde `VistaSuspendida`, que ya tiene el plan?",
        },
        { k: "respuesta", texto: "Probemos justo después de un cambio." },
      ],
    },
    {
      tipo: "reto",
      titulo: "La vista va atrás",
      tarea:
        "Mira cuánto cuesta contestar rehidratando, y qué dice `VistaSuspendida` justo después de un cambio de plan.",
      pasos: [
        "En `psql`: `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-14';`",
        "En `Program.cs`, quita los pasos de la sección anterior (deja host, `store` y `bus`) y pon el bloque de abajo.",
        "Tras la primera corrida, quita el registro y la espera: volver a registrar emp-61 lanza `ExistingStreamIdCollisionException`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["VistaSuspendida dice: Basico"],
        },
        items: ["Decenas de hechos para un plan. Y la empresa ya es Premium."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new RegistrarEmpresa("emp-61", "906100000", "Ferretería Llano", "Basico"));',
          "await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
          'await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-61", "Premium"));',
          "await using (var q = store.QuerySession())",
          "{",
          '    var vista = await q.LoadAsync<VistaSuspendida>("emp-61");',
          '    Console.WriteLine($"VistaSuspendida dice: {vista!.Plan}");',
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Una vista que entra con el hecho",
      tarea:
        "Crea una vista propia para el plan, que Marten escriba dentro de tu `SaveChangesAsync`.",
      pasos: [
        "En `Empresas.Historia`, el read model `EmpresaDetalle { Id, Plan, long Version }`, con setters públicos.",
        "`EmpresaDetalleProjection`, `partial`, con un `Apply` de `EmpresaRegistrada` y otro de `PlanCambiado`, que guardan el plan.",
        "En tu `AddMarten`, las dos líneas de abajo.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "ProjectionLifecycle.Inline",
          explicacion:
            "Marten la escribe dentro de tu `SaveChangesAsync`: no va atrás, no usa el daemon y no deja fila en `mt_event_progression`.",
        },
        {
          k: "nuevo",
          idioma: "Metadata(m => m.Revision.MapTo(…))",
          explicacion:
            "un `Append` directo no le pasa la versión; esta línea copia `mt_version` a tu `Version`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);",
          "opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Una vista que entra con el hecho (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`: el read model y su proyección",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: el read model que contesta el plan",
            "using Marten.Events.Aggregation;    // SingleStreamProjection",
            "",
            "public class EmpresaDetalle",
            "{",
            '    public string Id { get; set; } = "";',
            '    public string Plan { get; set; } = "";',
            "    public long Version { get; set; }   // la llena Marten al leer, desde mt_version",
            "}",
            "",
            "public partial class EmpresaDetalleProjection : SingleStreamProjection<EmpresaDetalle, string>",
            "{",
            "    public void Apply(EmpresaRegistrada e, EmpresaDetalle d) => d.Plan = e.Plan;",
            "    public void Apply(PlanCambiado e, EmpresaDetalle d)      => d.Plan = e.NuevoPlan;",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Una vista que entra con el hecho (2 de 2)",
      piezas: [
        {
          etiqueta: "Dentro de `AddMarten`, en tu `Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs, dentro de AddMarten",
            "opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);",
            "opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);             // nuevo",
            "opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));     // nuevo",
          ],
        },
      ],
      nota: "Un `Append` directo no le trae la versión a la vista `Inline`: la línea de `Metadata` la copia de `mt_version`.",
    },
    {
      tipo: "reto",
      titulo: "Contestar desde la vista",
      tarea:
        "Que `ConsultarPlanHandler` conteste desde `EmpresaDetalle`, sin rehidratar, justo después de un cambio.",
      pasos: [
        "`ConsultarPlanHandler` carga `EmpresaDetalle` con `LoadAsync` y `Localizador.StreamDe`, y contesta con su plan y su versión.",
        "En `Program.cs`, en lugar del cambio y la lectura de antes, el bloque de abajo.",
        "En `psql`: `SELECT name FROM mt_event_progression;`",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["Plan de 906100000: Enterprise (versión 3)"],
        },
        items: [
          "Al instante. Tu versión: `SELECT version FROM mt_streams WHERE id = 'emp-61';`",
          "`mt_event_progression` no tiene fila de `EmpresaDetalle`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-61", "Enterprise"));',
          'var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("906100000"));',
          'Console.WriteLine($"Plan de 906100000: {plan.Plan} (versión {plan.Version})");',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Contestar desde la vista",
      piezas: [
        {
          etiqueta: "En tu `ConsultarPlanHandler`, en vez de rehidratar",
          lenguaje: "csharp",
          lineas: [
            "// ConsultarPlanHandler: la respuesta sale de la vista, no del agregado",
            "var detalle = await session.LoadAsync<EmpresaDetalle>(await Localizador.StreamDe(session, q.Nit))",
            '    ?? throw new InvalidOperationException($"No existe la empresa del NIT {q.Nit}");',
            "return new PlanActualV1(q.Nit, detalle.Plan, detalle.Version);",
          ],
        },
      ],
      nota: "Sale el plan nuevo al instante: el documento entró con el hecho, y el daemon no lo corre.",
    },
    {
      tipo: "reto",
      titulo: "La versión, sin Metadata",
      tarea: "Mira qué versión contesta la vista si un `Append` directo cambia el plan y falta la línea `Metadata`.",
      pasos: [
        'Comenta la línea `Metadata`. En vez del cambio por el bus, un `Append` directo: `s.Events.Append("emp-61", new PlanCambiado("Premium"))`, con su `SaveChangesAsync`. Pregunta.',
        "Devuelve la línea y repite con otro plan.",
      ],
      logro: {
        items: [
          "Sin `Metadata`, sale `(versión 0)`.",
          "Con ella, la versión sale bien.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El ciclo de vida, escrito",
      tarea:
        "Al lado de cada registro, escribe por qué es `Async` o `Inline`, y qué se rompe si alguien lo cambia.",
      pasos: ["En tu `AddMarten`, un comentario al lado de cada registro, como abajo."],
      logro: { items: ["Cada registro dice su porqué."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);",
          "    // Async: solo la mira soporte; sin AddAsyncDaemon no avanza, y no avisa",
          "opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);",
          "    // Inline: Facturación cobra con su respuesta; en Async cobra el plan viejo",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "ReservaDelNitTests",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/ReservaDelNitTests.cs` (`using Marten;`):",
          lenguaje: "csharp",
          lineas: [
            '[Collection("daemon")]',
            "public class ReservaDelNitTests(HostConDaemon daemon) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "",
            "    async Task<bool> Registrar(string id, string nit)   // registra mirando la vista, sin localizador",
            "    {",
            "        await using var s = daemon.Store.LightweightSession();",
            "        if (await s.Query<EmpresaDetalle>().AnyAsync(d => d.Nit == nit)) return false;",
            '        s.Events.StartStream<Empresa>(id, new EmpresaRegistrada(nit, "Ópticas Llano", "Basico"));',
            "        try { await s.SaveChangesAsync(); return true; }",
            "        catch (JasperFx.DocumentAlreadyExistsException) { return false; }",
            "    }",
            "    // … el test, en la lámina siguiente …",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "ReservaDelNitTests · el test",
      piezas: [
        {
          etiqueta: "Dentro de la clase, después de `Registrar`: dos registros del mismo NIT, a la vez.",
          lenguaje: "csharp",
          lineas: [
            "    [Fact]",
            "    public async Task Dos_registros_del_mismo_NIT_a_la_vez_dejan_una_empresa()",
            "    {",
            '        var entraron = await Task.WhenAll(Registrar("emp-62", "906200000"), Registrar("emp-63", "906200000"));',
            "        Assert.Single(entraron, entro => entro);   // exactamente un true",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La vista no es un candado",
      tarea:
        "**No lo saltes**: la sección siguiente usa este `Nit` y este test. Usa la vista para no repetir un NIT, con dos registros a la vez.",
      pasos: [
        "Suma `Nit` a `EmpresaDetalle`; el `Apply` de `EmpresaRegistrada`: `{ d.Nit = e.Nit; d.Plan = e.Plan; }`.",
        "En el `AddMarten` de tu `HostConDaemon`, las dos líneas de `EmpresaDetalle`, como en tu `Program.cs`.",
        "Agrega `ReservaDelNitTests` y corre `dotnet test --filter ReservaDelNitTests`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test --filter ReservaDelNitTests",
          tono: "error",
          salida: ["Assert.Single() Failure: The collection contained 2 matching items"],
        },
        items: ["Los dos miraron la vista antes de que el otro escribiera."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El candado es un índice",
      tarea:
        "Ponle a la vista un índice único, cámbiale el ciclo de vida, y deja el test vigilando la reserva que usas.",
      pasos: [
        "En el `AddMarten` del fixture: `opts.Schema.For<EmpresaDetalle>().UniqueIndex(d => d.Nit);`. Corre. Luego, en el fixture, la vista `Async`. Corre.",
        "Vuelve a `Inline` y quita el índice.",
        '`Registrar` registra con tu handler: `RegistrarEmpresaHandler.Handle(new RegistrarEmpresa(id, nit, "Ópticas Llano", "Basico"), s);`. Cambia su comentario.',
      ],
      logro: {
        items: [
          "Con el índice y la vista `Inline`: **verde**. Con la vista `Async`: **rojo**.",
          "Con tu `RegistrarEmpresaHandler`: verde, y vigila tu localizador.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "UniqueIndex(d => d.Nit)",
          explicacion:
            "un índice único de Postgres sobre el documento; con la vista `Inline`, entra en la transacción del hecho.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La vista Async sin daemon",
      tarea:
        "**No lo saltes**: la sección siguiente usa emp-64. Apaga el daemon y registra una empresa.",
      pasos: [
        "En `Program.cs`, comenta `.AddAsyncDaemon(DaemonMode.Solo);` (el `;` pasa a `.IntegrateWithWolverine()`) y pon el bloque de abajo en lugar del anterior.",
        "Corre y mira la primera línea del log.",
        "Devuelve `AddAsyncDaemon`, quita el registro de emp-64 y corre otra vez.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["EmpresaDetalle: Basico   VistaSuspendida: (no existe)"],
        },
        items: [
          "Solo un `Warning: The async daemon is disabled`. Con el daemon de vuelta, la vista dice `Basico`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new RegistrarEmpresa("emp-64", "906400000", "Panadería Llano", "Basico"));',
          "await Task.Delay(3000);",
          "await using (var q = store.QuerySession())",
          "{",
          '    var detalle = await q.LoadAsync<EmpresaDetalle>("emp-64");',
          '    var vista = await q.LoadAsync<VistaSuspendida>("emp-64");',
          '    Console.WriteLine($"EmpresaDetalle: {detalle?.Plan ?? "(no existe)"}   VistaSuspendida: {vista?.Plan ?? "(no existe)"}");',
          "}",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "`Inline` si alguien la lee **justo después** de escribir; `Async` si es para mostrar. Ninguna decide una escritura, y el candado es un índice del store.",
      puntos: [
        {
          termino: "Vista Inline",
          definicion: "Entra en la misma transacción del hecho: no va atrás.",
        },
        {
          termino: "Vista Async",
          definicion: "Va atrás, y solo avanza con un daemon corriendo.",
        },
        {
          termino: "El candado",
          definicion: "Un índice único del store: tu localizador, o uno sobre una vista `Inline`.",
        },
      ],
      decision:
        "`Inline` si alguien la lee justo después de escribir; `Async` si es para mostrar. El porqué, al lado del registro. El NIT, en el localizador.",
      commit: {
        mensaje: "ES · La vista en la misma transacción",
        preguntas: [
          "¿Qué vista tuya se lee justo después de escribir y cuál solo se muestra? ¿Y si alguien les cambia el ciclo de vida?",
        ],
      },
      siguiente: {
        seccion: "42 · Reconstruir con el daemon",
        texto:
          "emp-61 no tiene NIT en `EmpresaDetalle`. Hay que rearmar las vistas.",
      },
    },
  ],
};
