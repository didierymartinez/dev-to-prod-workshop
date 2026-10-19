// Fuente: workshop-event-sourcing/taller.md, entrada "37 · Dos respuestas a la vez".
import type { Seccion } from "./tipos";

export const seccion37: Seccion = {
  numero: 37,
  titulo: "Dos respuestas a la vez",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que dos respuestas que llegan al mismo tiempo **no se pisen**, con la versión esperada y su reintento, y con el orden por llave.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Los dos socios van a contestar, y la suspensión **no** va a quedar efectiva.",
        },
        { k: "respuesta", texto: "Sin que salga un solo error." },
        {
          k: "texto",
          tam: "grande",
          texto: "Vamos a abrir esa ventana a propósito.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una empresa limpia",
      tarea:
        "Deja el código como lo pide esta sección y siembra una empresa nueva, emp-9: tu emp-8 ya está suspendida.",
      pasos: [
        'Si dejaste el Rómpelo anterior: vuelve a poner `MultipleHandlerBehavior.Separated`, quita el `throw` de `AccesosHandler`, deja `LeerFecha` con `TryParseExact`, `FechaDelCobro` en `"17/10/2026"`, y quita la línea de la cultura.',
        "En tu `Program.cs`, quita los pasos de la sección anterior. Deja host, `store` y `bus`.",
        "Después de `await host.StartAsync()`, la siembra de abajo.",
      ],
      logro: { items: ["Corre sin errores, y emp-9 existe."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-9", "900900900", "Ferretería Norte", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Abre la ventana",
      tarea:
        "Haz que las dos respuestas lleguen casi juntas, y que cada handler muestre qué leyó del otro socio.",
      pasos: [
        "En `AccesosHandler`, quita la pausa de 800 ms: Accesos contesta enseguida.",
        "En `RespuestasHandler`, una pausa **entre leer y guardar**: `await Task.Delay(300)` en el de la multa y `await Task.Delay(600)` en el de los accesos.",
        "Justo después de rehidratar, la traza de abajo en cada handler.",
      ],
      logro: { items: ["Compila. La suspensión, en la pantalla siguiente."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'Console.WriteLine($"Facturación leyó: Accesos={empresa.Accesos}");         // la multa',
          'Console.WriteLine($"Accesos     leyó: Facturacion={empresa.Facturacion}");  // los accesos',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Suspende emp-9",
      tarea: "Suspende emp-9 con la ventana abierta y mira en qué quedó.",
      pasos: ["Después de la siembra, el bloque de abajo.", "Corre."],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["emp-9: Facturacion=Aplicado Accesos=Aplicado Efectiva=False"],
        },
        items: [
          "El diario termina en `revocacion_de_accesos_confirmada`.",
          "Ningún dead letter nuevo: no hubo error.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-9", "mora"));',
          "await Task.Delay(2000);",
          "await using (var s = store.LightweightSession())",
          "{",
          '    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-9");',
          '    Console.WriteLine($"emp-9: Facturacion={e!.Facturacion} Accesos={e.Accesos} Efectiva={e.Efectiva}");',
          "}",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Contra dos escritores",
      bloques: [
        {
          k: "tabla",
          columnas: ["Mecanismo", "Qué protege"],
          filas: [
            ["Versión esperada", "Un stream que existe: el que escribe tarde choca, y reintenta"],
            ["Índice único", "Una creación: dos registros con la misma llave"],
            ["Orden por llave", "Evita el choque: los de una llave, en fila"],
            ["Lock con tiempo de vida", "No protege: si vence antes de guardar, entra otro"],
          ],
        },
        {
          k: "respuesta",
          texto: "Hoy van el primero y el tercero.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La versión esperada",
      tarea:
        "Haz que el `Append` de cada respuesta choque si alguien escribió en la empresa después de que la leíste.",
      pasos: [
        "En `Program.cs`, borra la siembra y deja el bloque de abajo, que reactiva emp-9, antes de suspender: cada corrida empieza por él.",
        "Suma `v{empresa.Version}` a las dos trazas.",
        "En `RespuestasHandler`, un método común `Anotar(session, id, empresa, hechos)`: sin hechos no escribe; con hechos, `Append(id, empresa.Version + hechos.Length, hechos)`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["EventStreamUnexpectedMaxEventIdException"],
        },
        items: ["El segundo choca, y su respuesta cae en dead letters."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    s.Events.Append("emp-9", new PagoRegistrado(50_000), new EmpresaReactivada());',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La versión esperada (1 de 2)",
      piezas: [
        {
          etiqueta: "Tu `RespuestasHandler`, en `Empresas.Historia`: la multa",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: las respuestas, ahora con la versión esperada",
            "public static class RespuestasHandler",
            "{",
            "    public static async Task Handle(MultaCobradaV1 msg, IDocumentSession session)",
            "    {",
            "        var id = await Localizador.StreamDe(session, msg.Nit);",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            '        Console.WriteLine($"Facturación leyó v{empresa.Version}: Accesos={empresa.Accesos}");',
            "        await Task.Delay(300);   // la ventana, solo para el experimento",
            "        Anotar(session, id, empresa, empresa.ConfirmarCobroDeMulta(msg.CobradaEl));",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La versión esperada (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue: los accesos, y el `Anotar` común",
          lenguaje: "csharp",
          lineas: [
            "    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)",
            "    {",
            "        var id = await Localizador.StreamDe(session, msg.Nit);",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            '        Console.WriteLine($"Accesos     leyó v{empresa.Version}: Facturacion={empresa.Facturacion}");',
            "        await Task.Delay(600);   // la ventana, solo para el experimento",
            "        Anotar(session, id, empresa, empresa.ConfirmarRevocacionDeAccesos());",
            "    }",
            "",
            "    // los dos handlers anotan igual: con la versión esperada",
            "    static void Anotar(IDocumentSession session, string id, Empresa empresa, object[] hechos)",
            "    {",
            "        if (hechos.Length == 0) return;                                        // reentrega: nada que anotar",
            "        session.Events.Append(id, empresa.Version + hechos.Length, hechos);    // la versión que tendrá tras el append",
            "    }",
            "}",
          ],
        },
      ],
      nota: "El número que recibe `Append` es la versión que tendrá el stream **después** de agregar: la leída más los hechos que agregas.",
    },
    {
      tipo: "reto",
      titulo: "Que el choque se reintente",
      tarea:
        "Dile a Wolverine que el choque se reintenta: el que choca vuelve a leer la empresa y decide de nuevo.",
      pasos: [
        "En tu `AddWolverine`, la política de abajo. Arriba: `using Wolverine.ErrorHandling;` y `using JasperFx.Core;`.",
        "Va sobre la clase base y con el **nombre completo**: el nombre corto es tu propio `ConcurrencyException`. Corre.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: [
            "Accesos     leyó v12: Facturacion=Aplicado",
            "emp-9: … Efectiva=True",
          ],
        },
        items: ["Un `fail:` en el log, y el reintento entra.", "El diario termina en `suspension_efectiva`, sin dead letters nuevos."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.OnException<JasperFx.ConcurrencyException>()",
          "    .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La cola por llave",
      piezas: [
        {
          etiqueta:
            "En tu `AddWolverine` (arriba, `using Wolverine.Configuration;`): el grupo de cada respuesta es su NIT, y las dos van a una cola local con tres carriles.",
          lenguaje: "csharp",
          lineas: [
            "opts.MessagePartitioning",
            "    .ByMessage<MultaCobradaV1>(m => m.Nit)",
            "    .ByMessage<AccesosRevocadosV1>(m => m.Nit);",
            'opts.PublishMessage<MultaCobradaV1>().ToLocalQueue("respuestas");',
            'opts.PublishMessage<AccesosRevocadosV1>().ToLocalQueue("respuestas");',
            'opts.LocalQueue("respuestas").PartitionProcessingByGroupId(PartitionSlots.Three);',
          ],
        },
      ],
      luego: "Un NIT cae siempre en el mismo carril, y un carril procesa un mensaje a la vez.",
    },
    {
      tipo: "reto",
      titulo: "El orden por llave",
      tarea:
        "En vez de detectar el choque, evítalo: que las respuestas de un mismo NIT pasen en fila.",
      pasos: [
        "Quita la versión esperada (vuelve al `Append` sin versión) y la política. Deja las pausas.",
        "En tu `AddWolverine`, la configuración de la lámina anterior.",
        "Corre.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: [
            "Facturación leyó v17: Accesos=EnCurso",
            "Accesos     leyó v18: Facturacion=Aplicado",
            "emp-9: … Efectiva=True",
          ],
        },
        items: ["La segunda lee con la primera anotada: sin choque."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Partir por llave",
          explicacion: "los mensajes de un mismo NIT pasan en fila.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Los dos, juntos",
      tarea:
        "Vuelve a poner la versión esperada y la política de reintento, **junto** al orden por llave.",
      pasos: [
        "En `Anotar`, de nuevo `Append(id, empresa.Version + hechos.Length, hechos)`.",
        "En tu `AddWolverine`, de nuevo `OnException<JasperFx.ConcurrencyException>()` con su `RetryWithCooldown`.",
      ],
      logro: { items: ["Corre, y la suspensión queda efectiva."] },
      tips: [
        {
          k: "piensa",
          texto:
            "El orden por llave solo ordena lo que pasa por su cola. La versión esperada la comprueba la base, venga de donde venga.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un lock que vence",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Historia`, solo para el Rómpelo: imita un lock externo que se suelta solo al vencer.",
          lenguaje: "csharp",
          lineas: [
            "public static class Candado",
            "{",
            "    static readonly SemaphoreSlim _uno = new(1, 1);   // un solo pase: un handler a la vez",
            "",
            "    public static async Task Tomar(TimeSpan vida)",
            "    {",
            "        await _uno.WaitAsync();                                   // espera a que esté libre, y lo toma",
            "        _ = Task.Delay(vida).ContinueWith(_ => _uno.Release());   // al pasar la vida, lo suelta solo",
            "    }",
            "}",
          ],
        },
      ],
      luego:
        "Luego, en la primera línea de los dos handlers de `RespuestasHandler`: `await Candado.Tomar(TimeSpan.FromMilliseconds(200));`",
    },
    {
      tipo: "rompelo",
      titulo: "El lock no protege",
      tarea:
        "Cambia el orden por llave por un lock que vence antes que las pausas, y mira quién atrapa el choque.",
      pasos: [
        "Quita el orden por llave. Deja la versión esperada y la política.",
        "Agrega la clase `Candado` y tómalo en los dos handlers, como en la lámina anterior.",
        "Corre. Al terminar, quita el lock.",
      ],
      logro: {
        items: [
          "Las dos trazas `leyó` muestran **la misma versión**: el lock venció durante la pausa.",
          "La versión esperada atrapa el choque igual: un `fail:`, el reintento, y `Efectiva=True`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Sin reintento, sin nada",
      tarea:
        "Quita la protección de a una pieza, y mira cómo falla cada vez.",
      pasos: [
        "Quita la política `OnException`. Deja la versión esperada. Corre.",
        "Quita también la versión esperada. Corre.",
        "Al terminar, quita pausas y trazas. Deja la versión esperada y la política.",
      ],
      logro: {
        items: [
          "Sin `OnException`: la respuesta de Accesos cae en dead letters, y CosmosLens la pinta `Vencido`.",
          "Sin nada: vuelve el dolor, **sin un error**.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La versión esperada va **siempre**, como red. El orden por llave se suma cuando el choque es frecuente. Un lock que vence **no protege**.",
      puntos: [
        {
          termino: "Versión esperada",
          definicion:
            "`empresa.Version + hechos.Length`: el que escribe sobre una versión vieja choca, y el reintento vuelve a leer.",
        },
        {
          termino: "Orden por llave",
          definicion:
            "Los mensajes de un mismo NIT, en fila. Con un broker, sesiones.",
        },
        {
          termino: "Lock con tiempo de vida",
          definicion: "Puede vencer antes de que el handler guarde.",
        },
      ],
      commit: {
        mensaje: "ES · Dos respuestas a la vez",
        preguntas: [
          "¿Qué stream tuyo recibe escrituras de dos lados, y qué lo protege hoy?",
        ],
      },
      siguiente: {
        seccion: "38 · Deshacer en tres sistemas",
        texto:
          "Hasta aquí los socios siempre cumplen. ¿Y si Facturación rechaza la multa cuando Accesos ya cortó los accesos?",
      },
    },
  ],
};
