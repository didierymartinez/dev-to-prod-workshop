// Fuente: workshop-event-sourcing/taller.md, entrada "40 · El daemon y la consistencia eventual".
import type { Seccion } from "./tipos";

export const seccion40: Seccion = {
  numero: 40,
  titulo: "El daemon y la consistencia eventual",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Mover la vista de suspendidas al **daemon** de Marten, como proyección `Async` con su propio read model; medir el rezago; y fijar la vista en un test con el daemon vivo.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Nuestro proyector en bucle ya existe en Marten: es el **daemon**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Pero nuestra `Empresa`, con setters privados, no le sirve como vista. ¿Por qué?",
        },
        {
          k: "respuesta",
          texto:
            "El daemon guarda la vista como un documento y la relee. Un deserializador no toca setters privados.",
        },
        {
          k: "texto",
          tam: "tenue",
          texto: "Lo ves en el Rómpelo «la vista en blanco».",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una empresa limpia",
      tarea:
        "Deshaz la escena de la sección anterior y siembra una empresa nueva, emp-14.",
      pasos: [
        "Accesos vuelve a devolver `AccesosRevocadosV2`, y `ProcesoDeSuspensionHandler` vuelve a buscar el proceso por el `SuspensionId` del mensaje.",
        "En `Program.cs`, quita los pasos de la sección anterior. Deja host, `store` y `bus`.",
        "Después de `await host.StartAsync()`, la siembra de abajo. Quítala tras la primera corrida.",
      ],
      logro: { items: ["emp-14 existe, activa."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-14", "901400000", "Papelería Occidente", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La vista, aparte",
      tarea:
        "Escribe la vista de suspendidas como un read model aparte del agregado, y la proyección que la arma.",
      pasos: [
        "En `Empresas.Historia`, la clase `VistaSuspendida { Id, Suspendida, Plan }`, con setters **públicos**.",
        "`public partial class SuspendidasProjection : SingleStreamProjection<VistaSuspendida, string>`, con un `Apply` por hecho, como abajo. El `partial` es obligatorio.",
      ],
      logro: { items: ["Compila (`using Marten.Events.Aggregation;`)."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Apply(evento, vista)",
          explicacion: "recibe el hecho **y** el documento que cambia.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public void Apply(EmpresaRegistrada e, VistaSuspendida v)   => v.Plan = e.Plan;",
          "public void Apply(PlanCambiado e, VistaSuspendida v)        => v.Plan = e.NuevoPlan;",
          "public void Apply(EmpresaSuspendida e, VistaSuspendida v)   => v.Suspendida = true;",
          "public void Apply(EmpresaReactivada e, VistaSuspendida v)   => v.Suspendida = false;",
          "public void Apply(SuspensionRevertida e, VistaSuspendida v) => v.Suspendida = false;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El daemon la corre",
      tarea:
        "Registra la proyección como `Async` y prende el daemon en el host de tu `Program.cs`, sin quitar Wolverine.",
      pasos: [
        "En tu `AddMarten`: `opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);`",
        "Después de `.IntegrateWithWolverine()`: `.AddAsyncDaemon(DaemonMode.Solo);`",
        "Corre y consulta con `Query<VistaSuspendida>()`.",
      ],
      logro: {
        items: [
          "La vista trae tus empresas suspendidas: una proyección `Async` nueva recorre el diario entero.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Async · Inline",
          explicacion:
            "elegir `Async` es elegir la **consistencia eventual**: no frena la escritura, a cambio de rezago.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Mide el rezago",
      tarea:
        "Suspende emp-14 y mide cuánto va atrás la vista: al instante, y tras esperar al daemon.",
      pasos: [
        'Suspende emp-14 por el bus: `await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));`',
        "Mide el rezago con el código de abajo.",
        "Espera con `await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));` (`using Marten.Events;`), mide otra vez y consulta la vista.",
      ],
      logro: {
        items: [
          "Al instante, el rezago sale **mayor que 0**; tras esperar, **0**.",
          "emp-14 aparece en `VistaSuspendida`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "WaitForNonStaleProjectionDataAsync",
          explicacion:
            "espera a que todas las proyecciones lleguen al high-water de ese momento, o lanza `TimeoutException`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var stats    = await store.Advanced.FetchEventStoreStatistics();      // high-water",
          "var progreso = await store.Advanced.AllProjectionProgress();",
          'var shard    = progreso.FirstOrDefault(x => x.ShardName == "VistaSuspendida:All");',
          "long rezago  = stats.EventSequenceNumber - (shard?.Sequence ?? 0);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Retira lo viejo",
      tarea:
        "Borra tu proyector a mano y lo que usaba: el daemon y `mt_event_progression` lo reemplazan.",
      pasos: [
        "Borra la clase `Suspendidas` y `CorrerProyector`.",
        "En `psql`, borra las tablas `empresas_estado` y `checkpoint`.",
      ],
      logro: { items: ["Compila y corre sin ellos."] },
    },
    {
      tipo: "reto",
      titulo: "Un host para los tests",
      tarea:
        "Crea un fixture que arranque un host con el daemon vivo, contra `empresas_tests`.",
      pasos: [
        "En `Empresas.Tests/HostConDaemon.cs`, `HostConDaemon : IAsyncLifetime`, con las propiedades `Host`, `Store` y `Bus`.",
        "El builder, con nombre completo: `Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder()`. Lleva lo de tu `AddMarten`, más `AutoApplyTransactions()` e `IncludeAssembly(typeof(SuspenderHandler).Assembly)`.",
        "Y la colección de abajo.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "IAsyncLifetime",
          explicacion:
            "`InitializeAsync()` arranca el host antes del primer test; `DisposeAsync()` lo detiene después del último.",
        },
        {
          k: "nota",
          texto: "`Host` a secas es la propiedad: por eso el builder va con el nombre completo.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[CollectionDefinition("daemon", DisableParallelization = true)]',
          "public class ColeccionDaemon : ICollectionFixture<HostConDaemon> { }",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "VistaSuspendidaTests · el primero",
      piezas: [
        {
          etiqueta: "Dentro de la clase `VistaSuspendidaTests`:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public async Task Suspender_por_el_bus_llega_a_la_vista()",
            "{",
            "    await using (var s = daemon.Store.LightweightSession())",
            "    {",
            '        s.Events.StartStream<Empresa>("emp-14",',
            '            new EmpresaRegistrada("901400000", "Papelería Occidente", "Basico"));',
            "        await s.SaveChangesAsync();",
            "    }",
            '    await daemon.Bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));',
            "    // … sigue en la lámina siguiente",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "VistaSuspendidaTests · el primero, sigue",
      piezas: [
        {
          etiqueta: "El resto del primer test: espera al daemon y afirma.",
          lenguaje: "csharp",
          lineas: [
            "    await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
            "",
            "    await using var q = daemon.Store.QuerySession();",
            "    var vista = Assert.Single(await q.Query<VistaSuspendida>().ToListAsync());",
            '    Assert.Equal("emp-14", vista.Id);',
            "    Assert.True(vista.Suspendida);",
            '    Assert.Equal("Basico", vista.Plan);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "VistaSuspendidaTests · el segundo",
      piezas: [
        {
          etiqueta: "Después del primero: los mismos hechos, repetidos y al revés.",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public async Task Repetir_y_reordenar_hechos_no_duplica_la_vista()",
            "{",
            "    await using (var s = daemon.Store.LightweightSession())",
            "    {",
            '        s.Events.StartStream<Empresa>("emp-20", new EmpresaRegistrada("902000000", "Panadería Sur", "Basico"),',
            '            new EmpresaSuspendida("mora", "susp-20"), new EmpresaSuspendida("mora", "susp-20"));',
            '        s.Events.StartStream<Empresa>("emp-21", new EmpresaRegistrada("902100000", "Ferretería Norte", "Basico"),',
            '            new EmpresaSuspendida("mora", "susp-21"), new EmpresaReactivada());',
            '        s.Events.StartStream<Empresa>("emp-22", new EmpresaRegistrada("902200000", "Droguería Centro", "Basico"),',
            '            new EmpresaReactivada(), new EmpresaSuspendida("mora", "susp-22"));',
            "        await s.SaveChangesAsync();",
            "    }",
            "    // … sigue en la lámina siguiente",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "VistaSuspendidaTests · el segundo, sigue",
      piezas: [
        {
          etiqueta: "El resto del segundo test:",
          lenguaje: "csharp",
          lineas: [
            "    await using (var s = daemon.Store.LightweightSession())",
            "    {",
            '        s.Events.Append("emp-20", new EmpresaSuspendida("mora", "susp-20"));   // una tercera vez',
            "        await s.SaveChangesAsync();",
            "    }",
            "    await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
            "",
            "    await using var q = daemon.Store.QuerySession();",
            "    var vistas = (await q.Query<VistaSuspendida>().ToListAsync()).ToDictionary(v => v.Id);",
            "    Assert.Equal(3, vistas.Count);                // un documento por empresa",
            '    Assert.True(vistas["emp-20"].Suspendida);',
            '    Assert.False(vistas["emp-21"].Suspendida);    // manda el último hecho de cada stream',
            '    Assert.True(vistas["emp-22"].Suspendida);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La vista, en verde",
      tarea: "Corre los dos tests de la vista con el daemon de verdad, varias veces seguidas.",
      pasos: [
        "En `Empresas.Tests/VistaSuspendidaTests.cs`, la clase de abajo (`using Marten;` y `using Marten.Events;`), con los dos tests de las láminas anteriores dentro.",
        "Corre `dotnet test` varias veces seguidas.",
      ],
      logro: { items: ["Todo en verde, cada vez."] },
      tips: [
        {
          k: "nuevo",
          idioma: "ResetAllMartenDataAsync()",
          explicacion: "vacía la base: pausa el daemon antes de borrar y lo reanuda al terminar.",
        },
        {
          k: "nuevo",
          idioma: "DisableParallelization = true",
          explicacion: "la colección corre sola, cuando terminan las demás.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[Collection("daemon")]',
          "public class VistaSuspendidaTests(HostConDaemon daemon) : IAsyncLifetime",
          "{",
          "    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();   // antes de CADA test",
          "    public Task DisposeAsync() => Task.CompletedTask;",
          "    // … los dos tests …",
          "}",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Reactivar, esperar, suspender",
      piezas: [
        {
          etiqueta: "En `Program.cs`, en lugar de la siembra y la suspensión de emp-14:",
          lenguaje: "csharp",
          lineas: [
            "await using (var s = store.LightweightSession())",
            "{",
            '    s.Events.Append("emp-14", new PagoRegistrado(50_000), new EmpresaReactivada());',
            "    await s.SaveChangesAsync();",
            "}",
            "await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));   // la vista parte al día",
            'await bus.InvokeAsync(new SuspenderEmpresa("emp-14", "mora"));',
            "// al instante: mide el rezago y carga la vista",
            "await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));",
            "// tras esperar: mide y carga otra vez",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Leer lo que acabas de escribir",
      tarea:
        "Suspende emp-14 con la vista al día, y lee la vista al instante y tras esperar.",
      pasos: [
        "Pon el bloque de la lámina anterior.",
        'Donde dicen los comentarios, mide el rezago y carga la vista con `LoadAsync<VistaSuspendida>("emp-14")`.',
        "Corre.",
      ],
      logro: {
        terminal: {
          tono: "ok",
          salida: [
            "al instante:  rezago 2        emp-14 Suspendida=False",
            "tras esperar: rezago 0, 2 o 3 emp-14 Suspendida=True",
          ],
        },
        items: ["Esa espera **nunca** decide una escritura: va contra el stream."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La vista en blanco",
      tarea:
        "Usa tu `Empresa`, la de setters privados, como el documento que guarda el daemon.",
      pasos: [
        "Comenta el bloque del rezago: la espera aguarda a **todas** las proyecciones.",
        "En tu `AddMarten`: `opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Async);`. Espera unos segundos y consulta `await s.Query<Empresa>().ToListAsync()`.",
        "Al terminar, quita la línea, y en `psql`: `DELETE FROM mt_event_progression WHERE name = 'Empresa:All';`",
      ],
      logro: {
        items: [
          "Cada empresa sale con valores por defecto, aunque su JSON en `mt_doc_empresa` está completo.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "A espaldas del daemon",
      tarea:
        "Vacía la base de pruebas sin pausar el daemon, y luego quita la espera de los tests.",
      pasos: [
        "En `VistaSuspendidaTests`: `public Task InitializeAsync() => daemon.Store.Advanced.ResetAllData();`. Corre `dotnet test`.",
        'Mira el log detallado: `dotnet test --logger "console;verbosity=detailed"`. Vuelve a `ResetAllMartenDataAsync`.',
        "Quita `WaitForNonStaleProjectionDataAsync` de los dos tests y corre. Vuelve a ponerla.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: [
            "System.TimeoutException : The projection shards (in total of 2)",
            "haven't been completely started within the timeout span",
          ],
        },
        items: [
          "En el log: `ProgressionProgressOutOfOrderException`.",
          "Sin la espera: `Assert.True() Failure`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El proyector es **el daemon**, y el checkpoint es `mt_event_progression`. La consistencia eventual se elige, se mide, y se espera solo donde vale.",
      puntos: [
        {
          termino: "Read model",
          definicion: "La vista, aparte del agregado, con setters públicos: el daemon la guarda y la relee.",
        },
        {
          termino: "Rezago",
          definicion: "High-water menos el `.Sequence` del shard de tu vista.",
        },
        {
          termino: "Esperar la vista",
          definicion: "Vale en un test, o para releer lo propio. Una decisión va contra el stream.",
        },
      ],
      decision:
        "Marca como reemplazadas las líneas de tu proyector y de tu rezago: ahora son el daemon y `mt_event_progression`.",
      commit: {
        mensaje: "ES · El daemon y la consistencia eventual",
        preguntas: [
          "Empareja `FrenteDelDiario() − LeerCursor()` con Marten. ¿Por qué `Async` y no `Inline` para esta vista?",
        ],
      },
      siguiente: {
        seccion: "41 · La vista en la misma transacción",
        texto:
          "`VistaSuspendida` va atrás, y para soporte está bien. Quien le contesta el plan a Facturación necesita una vista que no vaya atrás.",
      },
    },
  ],
};
