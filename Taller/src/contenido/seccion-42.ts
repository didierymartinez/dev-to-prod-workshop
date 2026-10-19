// Fuente: workshop-event-sourcing/taller.md, entrada "42 · Reconstruir con el daemon".
import type { Seccion } from "./tipos";

export const seccion42: Seccion = {
  numero: 42,
  titulo: "Reconstruir con el daemon",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Rearmar cualquier vista desde el diario con **una orden de la librería**, pausando el daemon del servicio, y ensayar esa orden en un test.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Le agregamos un campo a una vista. ¿Lo tienen las filas **viejas**?",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Y si borramos la vista, ¿se rearma **sola**?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Borrar no rearma",
      tarea: "Borra la vista `EmpresaDetalle` y pregunta un plan.",
      pasos: [
        "Con tu programa **detenido**, en `psql`: `DELETE FROM mt_doc_empresadetalle;`",
        'En `Program.cs`, pregunta: `await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("906100000"));`. Corre.',
        "Quita esa pregunta.",
      ],
      logro: {
        terminal: { comando: "dotnet run", tono: "error", salida: ["No existe la empresa …"] },
        items: ["Ningún daemon corre una vista `Inline`: nadie recorre sus hechos otra vez."],
      },
    },
    {
      tipo: "reto",
      titulo: "Un campo nuevo",
      tarea:
        "Súmale a `VistaSuspendida` el motivo y la cuenta de suspensiones, y mira qué empresas los tienen.",
      pasos: [
        "En `VistaSuspendida`: `public string? Motivo { get; set; }` y `public int Suspensiones { get; set; }`. El `Apply` de `EmpresaSuspendida`: `{ v.Suspendida = true; v.Motivo = e.Motivo; v.Suspensiones++; }`.",
        "En `Program.cs`, en lugar de los pasos de la sección anterior, el bloque de abajo.",
        "Corre. Luego quita la suspensión; deja la espera y el listado.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["emp-14: motivo=", "emp-64: motivo=cheque devuelto"],
        },
        items: ["Solo emp-64 trae su motivo: el daemon sigue desde su cursor."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-64", "cheque devuelto"));',
          "await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
          "await using (var q = store.QuerySession())",
          "    foreach (var v in await q.Query<VistaSuspendida>().Where(v => v.Suspendida).OrderBy(v => v.Id).ToListAsync())",
          '        Console.WriteLine($"{v.Id}: motivo={v.Motivo}");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La orden",
      tarea:
        "Escribe una orden que rearme una vista desde el diario, con el daemon del servicio en pausa mientras trabaja.",
      pasos: [
        "En `Empresas.Historia`, la clase `static Vistas` con `Rearmar(IHost host, string vista)`: saca `IDocumentStore` e `IProjectionCoordinator` de `host.Services`.",
        "Llama `PauseAsync()`, luego `using var daemon = await store.BuildProjectionDaemonAsync();` y `RebuildProjectionAsync(vista, CancellationToken.None)`.",
        "Llama `ResumeAsync()` en un `finally`.",
      ],
      logro: { items: ["Compila (`using JasperFx.Events.Daemon;`)."] },
      tips: [
        {
          k: "nuevo",
          idioma: "BuildProjectionDaemonAsync()",
          explicacion:
            "arma un daemon aparte. Su `RebuildProjectionAsync` borra documentos y progreso, y recorre el diario otra vez. El nombre es el del read model.",
        },
        {
          k: "nuevo",
          idioma: "IProjectionCoordinator",
          explicacion: "pausa y reanuda el daemon del servicio.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La orden",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/Vistas.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Vistas.cs: rearmar una vista desde el diario, con la librería",
            "using JasperFx.Events.Daemon;                     // IProjectionCoordinator",
            "using Marten;",
            "using Microsoft.Extensions.DependencyInjection;   // GetRequiredService",
            "using Microsoft.Extensions.Hosting;               // IHost",
            "",
            "public static class Vistas",
            "{",
            "    public static async Task Rearmar(IHost host, string vista)",
            "    {",
            "        var store = host.Services.GetRequiredService<IDocumentStore>();",
            "        var coordinador = host.Services.GetRequiredService<IProjectionCoordinator>();",
            "        await coordinador.PauseAsync();                                          // que el daemon del servicio no toque las vistas",
            "        try",
            "        {",
            "            using var daemon = await store.BuildProjectionDaemonAsync();         // un daemon aparte, solo para rearmar",
            "            await daemon.RebuildProjectionAsync(vista, CancellationToken.None);  // borra documentos y progreso, y rehidrata el diario",
            "        }",
            "        finally",
            "        {",
            "            await coordinador.ResumeAsync();                                     // sin esto, ninguna vista Async vuelve a avanzar",
            "        }",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Rearma las dos vistas",
      tarea: "Rearma `EmpresaDetalle` y `VistaSuspendida` con tu host corriendo, y mide cuánto tarda.",
      pasos: [
        "En `Program.cs`, **antes** del listado, el bloque de abajo.",
        "En `psql`: `SELECT data->>'Nit' FROM mt_doc_empresadetalle WHERE id = 'emp-61';`",
        "Después quita las dos llamadas y la medición: rearmar se corre cuando hace falta, no en cada arranque.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["Rearmadas en 640 ms", "Plan de 901100000: Basico", "emp-14: motivo=mora"],
        },
        items: ["Tus milisegundos son los tuyos. emp-61 ya tiene NIT."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var reloj = System.Diagnostics.Stopwatch.StartNew();",
          'await Vistas.Rearmar(host, "EmpresaDetalle");',
          'await Vistas.Rearmar(host, "VistaSuspendida");',
          'Console.WriteLine($"Rearmadas en {reloj.ElapsedMilliseconds} ms");',
          'var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("901100000"));',
          'Console.WriteLine($"Plan de 901100000: {plan.Plan}");',
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "RearmarTests",
      piezas: [
        {
          etiqueta: "Dentro de la clase `RearmarTests`: una empresa suspendida, y la vista al día.",
          lenguaje: "csharp",
          lineas: [
            "    [Fact]",
            "    public async Task Rearmar_rehace_la_vista_y_el_daemon_sigue()",
            "    {",
            "        await using (var s = daemon.Store.LightweightSession())",
            "        {",
            '            s.Events.StartStream<Empresa>("emp-65",',
            '                new EmpresaRegistrada("906500000", "Vidrios Llano", "Basico"),',
            '                new EmpresaSuspendida("mora", "susp-65"));',
            "            await s.SaveChangesAsync();",
            "        }",
            "        // … sigue en la lámina siguiente",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "RearmarTests · rearmar y seguir",
      piezas: [
        {
          etiqueta: "El resto del test: borra la vista, rearma, agrega un hecho después, y afirma.",
          lenguaje: "csharp",
          lineas: [
            "        await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
            "        await using (var s = daemon.Store.LightweightSession())",
            '        { s.Delete<VistaSuspendida>("emp-65"); await s.SaveChangesAsync(); }   // el diario no se toca',
            "",
            '        await Vistas.Rearmar(daemon.Host, "VistaSuspendida");',
            "",
            "        await using (var s = daemon.Store.LightweightSession())",
            '        { s.Events.Append("emp-65", new EmpresaReactivada()); await s.SaveChangesAsync(); }',
            "        await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
            "",
            "        await using var q = daemon.Store.QuerySession();",
            "        var vista = Assert.Single(await q.Query<VistaSuspendida>().ToListAsync());",
            '        Assert.Equal("mora", vista.Motivo);',
            "        Assert.False(vista.Suspendida);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Ensaya la orden",
      tarea:
        "Fija la orden en un test, para que no esté rota el día que la necesites.",
      pasos: [
        "En `Empresas.Tests/RearmarTests.cs`, la clase de abajo con el test de las láminas anteriores. Corre `dotnet test`.",
        "Comenta la llamada a `Rearmar` y corre `dotnet test --filter RearmarTests`. Descoméntala.",
        "Quita el `ResumeAsync` del `finally` y corre otra vez. Devuélvelo.",
      ],
      logro: {
        items: [
          "Con todo: **verde**.",
          "Sin el `Rearmar`, cae en el `Assert.Equal` del motivo.",
          "Sin el `ResumeAsync`, cae con `TimeoutException`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[Collection("daemon")]   // using Marten; using Marten.Events;',
          "public class RearmarTests(HostConDaemon daemon) : IAsyncLifetime",
          "{",
          "    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();",
          "    public Task DisposeAsync() => Task.CompletedTask;",
          "    // … el test …",
          "}",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El borrado a medias",
      tarea: "Borra solo el progreso de la vista, sin sus documentos, y mira las cuentas.",
      pasos: [
        "En el listado, imprime también `suspensiones={v.Suspensiones}`. Corre y anota las cuentas.",
        "Con tu programa detenido, en `psql`: `DELETE FROM mt_event_progression WHERE name = 'VistaSuspendida:All';`. Arranca y lista.",
        'Rearma con `await Vistas.Rearmar(host, "VistaSuspendida");` y lista otra vez.',
      ],
      logro: {
        items: [
          "Cada cuenta sale **al doble**: una vista que suma no aguanta que la recorran encima.",
          "Rearmar las devuelve: borra documentos y progreso juntos.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El reloj en la vista",
      tarea:
        "**No lo saltes**: la sección siguiente parte de aquí. Guarda en la vista desde cuándo está suspendida cada empresa, con el reloj.",
      pasos: [
        "En `VistaSuspendida`: `public DateTimeOffset? SuspendidaDesde { get; set; }`. En el `Apply` de `EmpresaSuspendida`: `v.SuspendidaDesde = DateTimeOffset.UtcNow;`.",
        "Rearma, y en el listado imprime `desde={v.SuspendidaDesde:HH:mm}`.",
      ],
      logro: {
        items: ["Todas salen con la **hora del rearmado**: cuándo la proyectaste, no cuándo pasó."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La hora, del hecho",
      tarea:
        "Que la vista lea la hora del hecho, la que Marten anotó al guardarlo, y no la del reloj.",
      pasos: [
        "Cambia el `Apply`: `Apply(IEvent<EmpresaSuspendida> e, VistaSuspendida v)` (`using JasperFx.Events;`). El motivo sale de `e.Data.Motivo`, y `SuspendidaDesde` de `e.Timestamp`.",
        "Rearma y lista. Rearma otra vez y lista.",
      ],
      logro: {
        items: [
          "Cada una conserva **su** hora, la de su último `empresa_suspendida` en `mt_events`.",
          "Rearmar otra vez da lo mismo.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "IEvent<T>",
          explicacion:
            "el hecho envuelto: va en `e.Data`, y a su lado lo que Marten anotó, como `e.Timestamp`, la hora del commit.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Rearmar es una orden, no un DELETE: pausa, recorre el diario otra vez y reanuda. Solo funciona si la proyección depende **solo de sus hechos**, sin reloj ni llamadas afuera.",
      puntos: [
        {
          termino: "RebuildProjectionAsync",
          definicion: "Borra documentos y progreso juntos, y rehidrata la vista desde el diario.",
        },
        {
          termino: "IProjectionCoordinator",
          definicion: "Pausa el daemon del servicio mientras rearmas.",
        },
      ],
      decision:
        "Rearmar es una orden: `Vistas.Rearmar` pausa, recorre el diario y reanuda, y un test la ensaya. Tarda ___ ms. Mis proyecciones no leen el reloj ni llaman afuera.",
      commit: {
        mensaje: "ES · Reconstruir con el daemon",
        preguntas: [
          "¿Qué vista tuya suma en vez de asignar, qué le pasaría si la recorrieran encima, y qué ve un usuario mientras la rearmas?",
        ],
      },
      siguiente: {
        seccion: "43 · El tablero cruza streams",
        texto:
          "Un tablero de suspensiones con el nombre de cada empresa junta dos tipos de stream, y una proyección por stream no alcanza.",
      },
    },
  ],
};
