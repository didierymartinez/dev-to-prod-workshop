// Fuente: workshop-event-sourcing/taller.md, entrada "36 · Dos respuestas, ningún dueño".
import type { Seccion } from "./tipos";


export const seccion36: Seccion = {
  numero: 36,
  titulo: "Dos respuestas, ningún dueño",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Saber en todo momento si Facturación y Accesos **cumplieron**, dar la suspensión por efectiva solo cuando cumplieron los dos, y verlo en CosmosLens.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Soporte pregunta: ¿emp-8 ya quedó suspendida **de verdad**? ¿Ya no puede entrar?",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "`Suspendida = true` solo dice que Empresas lo **pidió**.",
        },
        { k: "respuesta", texto: "Nadie le contesta a Empresas." },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Un contexto nuevo: Accesos",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Accesos corta los accesos de la empresa. Escucha el mismo `EmpresaSuspendidaV2` que Facturación.",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Si Accesos falla, la empresa **sigue entrando** y nadie se entera.",
            "Los dead letters viven en la base de **otro equipo**.",
            "Y hablan de mensajes, **no de empresas**.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El segundo socio",
      tarea:
        "Crea el contexto `Accesos`, con un handler que corta los accesos de una empresa suspendida, y regístralo en Wolverine.",
      pasos: [
        "Crea el proyecto con los comandos de abajo.",
        "En `Accesos/AccesosHandler.cs`: `AccesosHandler.Handle(EmpresaSuspendidaV2 msg)`, con `await Task.Delay(800)`: lo que tarda un sistema externo.",
        "En tu `AddWolverine`: `opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);` y `opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;`",
      ],
      logro: { items: ["`dotnet run` arranca sin errores."] },
      tips: [
        {
          k: "nuevo",
          idioma: "MultipleHandlerBehavior.Separated",
          explicacion:
            "cada handler de un mismo mensaje, en su propia cola: cada contexto falla por su cuenta.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "dotnet new classlib -o Accesos",
          "dotnet add Accesos reference Contratos",
          "dotnet add Empresas.Historia reference Accesos",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El segundo socio",
      piezas: [
        {
          etiqueta: "`AccesosHandler`, en el proyecto `Accesos`",
          lenguaje: "csharp",
          lineas: [
            "// Accesos/AccesosHandler.cs",
            "using Contratos;",
            "",
            "public static class AccesosHandler",
            "{",
            "    public static async Task Handle(EmpresaSuspendidaV2 msg)",
            "    {",
            "        await Task.Delay(800);   // cortar accesos en un sistema externo toma su tiempo",
            "    }",
            "}",
          ],
        },
        {
          etiqueta: "Dentro de `AddWolverine`, en tu `Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs, dentro de AddWolverine",
            "opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);",
            "opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);",
            "opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;   // cada handler de un mismo mensaje, en su propia cola",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cada socio contesta",
      tarea:
        "Declara las dos respuestas como contrato público, y haz que Accesos devuelva la suya.",
      pasos: [
        'En `Contratos`: `MultaCobradaV1(Nit, DateOnly CobradaEl)`, con `[MessageIdentity("facturacion.multa-cobrada.v1")]`.',
        'Y `AccesosRevocadosV1(Nit)`, con `[MessageIdentity("accesos.accesos-revocados.v1")]`.',
        "Tu `AccesosHandler` **devuelve** `AccesosRevocadosV1` al terminar: responder es publicar.",
      ],
      logro: { items: ["Compila. La respuesta de Facturación va en la pantalla siguiente."] },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Cada socio contesta",
      piezas: [
        {
          etiqueta: "En `Contratos`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos: las respuestas, contrato público como los anuncios",
            '[MessageIdentity("facturacion.multa-cobrada.v1")]',
            "public record MultaCobradaV1(string Nit, DateOnly CobradaEl);   // la fecha viaja como fecha, no como texto",
            '[MessageIdentity("accesos.accesos-revocados.v1")]',
            "public record AccesosRevocadosV1(string Nit);",
          ],
        },
        {
          etiqueta: "Tu `AccesosHandler`, ahora contesta",
          lenguaje: "csharp",
          lineas: [
            "// Accesos/AccesosHandler.cs",
            "using Contratos;",
            "",
            "public static class AccesosHandler",
            "{",
            "    public static async Task<AccesosRevocadosV1> Handle(EmpresaSuspendidaV2 msg)",
            "    {",
            "        await Task.Delay(800);",
            "        return new AccesosRevocadosV1(msg.Nit);   // responde: los accesos quedaron cortados",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La fecha, leída en el borde",
      tarea:
        "Haz que Facturación lea la fecha del cobro, que llega como texto, y conteste `MultaCobradaV1` con esa fecha.",
      pasos: [
        'A `MundoExterno`: `public static string FechaDelCobro = "17/10/2026";`. En `FacturacionHandler`, `LeerFecha(texto)`: la fecha, o `null` si no puede.',
        "Al empezar el `Handle`: `?? throw new FechaNoParseableException(texto)`, una clase con un constructor que recibe el texto. Devuelve `MultaCobradaV1` **siempre**, también en una reentrega.",
      ],
      logro: { items: ["Compila. Sin una fecha legible, Facturación no cobra."] },
      tips: [
        {
          k: "nuevo",
          idioma: "DateOnly",
          explicacion: "una fecha sin hora.",
        },
        {
          k: "nuevo",
          idioma: "DateOnly.TryParseExact",
          explicacion: 'con `(texto, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha)`: ese formato, la misma cultura en toda máquina; `false` si no puede.',
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La fecha, leída en el borde (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Facturacion/FacturacionHandler.cs`, arriba: la fecha del sistema de cobro y la excepción",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: el mismo handler de El contrato lleva lo justo, ahora lee la fecha y contesta",
            "using System.Globalization;   // CultureInfo, DateTimeStyles (junto a los using que ya tiene)",
            "",
            "public static class MundoExterno",
            "{",
            "    public static List<string> Recibidos = new();",
            '    public static string FechaDelCobro = "17/10/2026";   // el sistema de cobro (falso) escribe la fecha como texto: día/mes/año',
            "}",
            "",
            "public class FechaNoParseableException(string texto)",
            '    : Exception($"El sistema de cobro mandó una fecha que no se puede leer: «{texto}»");',
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La fecha, leída en el borde (2 de 2)",
      piezas: [
        {
          etiqueta: "Y en el mismo archivo, tu `FacturacionHandler`",
          lenguaje: "csharp",
          lineas: [
            "public static class FacturacionHandler",
            "{",
            "    // … la Tarifa, como antes …",
            "",
            "    // el borde: lee el texto con su formato y una cultura fija; null si no lo puede leer",
            "    public static DateOnly? LeerFecha(string texto) =>",
            '        DateOnly.TryParseExact(texto, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha)',
            "            ? fecha",
            "            : null;",
            "",
            "    public static MultaCobradaV1 Handle(EmpresaSuspendidaV2 msg, Envelope envelope)",
            "    {",
            "        var cobradaEl = LeerFecha(MundoExterno.FechaDelCobro)",
            "            ?? throw new FechaNoParseableException(MundoExterno.FechaDelCobro);   // sin una fecha legible, no cobra",
            "        // … conexión, transacción, dedup e INSERT en multas, como antes …",
            "        tx.Commit();",
            "        return new MultaCobradaV1(msg.Nit, cobradaEl);   // contesta siempre, también en una reentrega",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Contestar también en la reentrega es a propósito: si el proceso cae tras el commit, una Facturación que callara no contestaría nunca.",
    },
    {
      tipo: "reto",
      titulo: "Las dos respuestas salen",
      tarea: "Suspende emp-8 y mira salir las respuestas de los dos socios.",
      pasos: ["En tu `Program.cs`, el bloque de abajo.", "Corre y mira el log de Wolverine."],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: [
            "No routes can be determined … (Contratos.MultaCobradaV1)",
            "No routes can be determined … (Contratos.AccesosRevocadosV1)",
          ],
        },
        items: ["Salen, pero **nadie las recibe**: el diario de emp-8 termina en `empresa_suspendida`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora"));',
          "await Task.Delay(2000);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El borde, en un test",
      tarea:
        "Fija en un test que `LeerFecha` lee día/mes/año en cualquier máquina y avisa cuando no puede.",
      pasos: ["En `Empresas.Tests`, el archivo `LeerFechaTests.cs` con el test de abajo.", "Corre `dotnet test`."],
      logro: {
        items: [
          'Con la cultura invariante, `"01/02/2026"` da el **1 de febrero**, y `"ayer"` da `null`.',
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "using System.Globalization;",
          "",
          "public class LeerFechaTests",
          "{",
          "    [Fact]",
          "    public void Lee_dia_mes_anio_en_cualquier_maquina_y_avisa_si_no_puede()",
          "    {",
          "        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;",
          '        Assert.Equal(new DateOnly(2026, 2, 1), FacturacionHandler.LeerFecha("01/02/2026"));',
          '        Assert.Null(FacturacionHandler.LeerFecha("ayer"));',
          "    }",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Los estados de los socios",
      tarea:
        "Dale a la empresa un estado por cada socio, que sale de hechos que Empresas anota cuando un socio contesta.",
      pasos: [
        "En `Empresas.Historia`: `enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }`.",
        "Los hechos `CobroDeMultaConfirmado(DateOnly CobradaEl)`, `RevocacionDeAccesosConfirmada()` y `SuspensionEfectiva()`, cada uno con su línea en `Hechos.Registrar` y su `Assert` de alias.",
        "En `Empresa`: `Facturacion` y `Accesos` (`EstadoIntegracion`), `bool Efectiva` y `DateOnly? MultaCobradaEl`.",
      ],
      logro: { items: ["Compila, y tu test de alias pasa."] },
      tips: [
        {
          k: "nuevo",
          idioma: "enum",
          explicacion:
            "un tipo que solo admite esos valores. Sin asignar, vale el primero: `SinSolicitar`.",
        },
        {
          k: "piensa",
          texto:
            "El estado de cada integración (`SinSolicitar`, `EnCurso`, `Aplicado`) sale de hechos: nadie lo actualiza a mano.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Los estados de los socios",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`, los hechos y el `enum`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: lo que Empresas anota cuando un socio responde",
            "public record CobroDeMultaConfirmado(DateOnly CobradaEl);",
            "public record RevocacionDeAccesosConfirmada();",
            "public record SuspensionEfectiva();",
            "",
            "public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }",
          ],
        },
        {
          etiqueta: "En tu `Hechos.Registrar`",
          lenguaje: "csharp",
          lineas: [
            "// en tu Hechos.Registrar (y un Assert por hecho en el test de alias), una línea por hecho nuevo",
            "opts.Events.AddEventType<CobroDeMultaConfirmado>();",
            "opts.Events.AddEventType<RevocacionDeAccesosConfirmada>();",
            "opts.Events.AddEventType<SuspensionEfectiva>();",
          ],
        },
        {
          etiqueta: "En tu `Empresa`, las propiedades nuevas",
          lenguaje: "csharp",
          lineas: [
            "// en tu Empresa (lo de siempre se queda; esto se añade o cambia)",
            "public EstadoIntegracion Facturacion { get; private set; }",
            "public EstadoIntegracion Accesos { get; private set; }",
            "public bool Efectiva { get; private set; }",
            "public DateOnly? MultaCobradaEl { get; private set; }   // null mientras Facturación no conteste",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "En qué va cada socio",
      tarea:
        "Escribe los `Apply` que mueven los estados, e imprime en qué va cada socio de emp-8.",
      pasos: [
        "`Apply(EmpresaSuspendida)` deja los dos socios `EnCurso` y la fecha en `null`. `Apply(EmpresaReactivada)` los devuelve a `SinSolicitar`.",
        "`Apply(CobroDeMultaConfirmado)` guarda la fecha y pasa Facturación a `Aplicado`; los otros dos hechos, igual con lo suyo.",
        "En `Program.cs`, el bloque de abajo.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-8: Facturacion=EnCurso Accesos=EnCurso Efectiva=False MultaCobradaEl="],
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-8");',
          '    Console.WriteLine($"emp-8: Facturacion={e!.Facturacion} Accesos={e.Accesos} " +',
          '        $"Efectiva={e.Efectiva} MultaCobradaEl={e.MultaCobradaEl:yyyy-MM-dd}");',
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "En qué va cada socio",
      piezas: [
        {
          etiqueta: "En tu `Empresa`, los `Apply` nuevos o cambiados",
          lenguaje: "csharp",
          lineas: [
            "public void Apply(EmpresaSuspendida e)",
            "{",
            "    Suspendida = true; DeudaPendiente = true;",
            "    Facturacion = EstadoIntegracion.EnCurso; Accesos = EstadoIntegracion.EnCurso; Efectiva = false; MultaCobradaEl = null;",
            "}",
            "public void Apply(EmpresaReactivada e)",
            "{",
            "    Suspendida = false; Reactivaciones++;",
            "    Facturacion = EstadoIntegracion.SinSolicitar; Accesos = EstadoIntegracion.SinSolicitar; Efectiva = false;",
            "}",
            "public void Apply(CobroDeMultaConfirmado e)        { Facturacion = EstadoIntegracion.Aplicado; MultaCobradaEl = e.CobradaEl; }",
            "public void Apply(RevocacionDeAccesosConfirmada e) { Accesos = EstadoIntegracion.Aplicado; }",
            "public void Apply(SuspensionEfectiva e)            { Efectiva = true; }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La empresa decide",
      tarea:
        "Haz que Empresas anote cada respuesta y dé la suspensión por efectiva cuando contestaron los dos socios.",
      pasos: [
        "En `Empresa`, `ConfirmarCobroDeMulta(DateOnly)` y `ConfirmarRevocacionDeAccesos()` devuelven `object[]`: `[]` si ese socio no estaba `EnCurso`; suman `SuspensionEfectiva` si el **otro** ya está `Aplicado`.",
        "`RespuestasHandler`, con un `Handle` por respuesta: `Localizador.StreamDe`, rehidrata y `Append` de lo que devuelva.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "[] · [a, b]",
          explicacion: "un arreglo vacío, o con dos elementos. `Append` con uno vacío no escribe nada.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa decide (1 de 2)",
      piezas: [
        {
          etiqueta: "En tu `Empresa`, una decisión por respuesta",
          lenguaje: "csharp",
          lineas: [
            "// en tu Empresa: decidir, dada una respuesta, qué hechos ocurren",
            "public object[] ConfirmarCobroDeMulta(DateOnly cobradaEl)",
            "{",
            "    if (Facturacion != EstadoIntegracion.EnCurso) return [];   // reentrega, o nadie lo pidió",
            "    return Accesos == EstadoIntegracion.Aplicado",
            "        ? [new CobroDeMultaConfirmado(cobradaEl), new SuspensionEfectiva()]",
            "        : [new CobroDeMultaConfirmado(cobradaEl)];",
            "}",
            "",
            "public object[] ConfirmarRevocacionDeAccesos()",
            "{",
            "    if (Accesos != EstadoIntegracion.EnCurso) return [];",
            "    return Facturacion == EstadoIntegracion.Aplicado",
            "        ? [new RevocacionDeAccesosConfirmada(), new SuspensionEfectiva()]",
            "        : [new RevocacionDeAccesosConfirmada()];",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa decide (2 de 2)",
      piezas: [
        {
          etiqueta: "`RespuestasHandler`, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: escucha las respuestas y las anota en el diario de la empresa (using Contratos; using Marten;)",
            "public static class RespuestasHandler",
            "{",
            "    public static async Task Handle(MultaCobradaV1 msg, IDocumentSession session)",
            "    {",
            "        var id = await Localizador.StreamDe(session, msg.Nit);",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "        session.Events.Append(id, empresa.ConfirmarCobroDeMulta(msg.CobradaEl));",
            "    }",
            "",
            "    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)",
            "    {",
            "        var id = await Localizador.StreamDe(session, msg.Nit);",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "        session.Events.Append(id, empresa.ConfirmarRevocacionDeAccesos());",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Suspende otra vez",
      tarea:
        "Reactiva emp-8, suspéndela y mira que la suspensión quede efectiva cuando contestan los dos.",
      pasos: [
        "En `Program.cs`, **antes** de suspender, el `Append` de abajo: emp-8 sigue suspendida.",
        "Corre: suspende, espera e imprime.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True MultaCobradaEl=2026-10-17"],
        },
        items: ['Otro `MultaCobradaV1("900800800", new DateOnly(2026, 10, 17))` a mano no agrega hechos.'],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    s.Events.Append("emp-8", new PagoRegistrado(100_000), new EmpresaReactivada());',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "CosmosLens, al lado",
      tarea:
        "Clona CosmosLens, el observador del taller, **fuera** del repo del taller: lee tu Postgres sin tocarlo.",
      pasos: [
        "Desde la carpeta que **contiene** tu repo del taller, no desde adentro, el comando de abajo.",
        "Comprueba que existe `cosmos-trace/src/CosmosTrace.Api/Procesos.cs`.",
      ],
      logro: { items: ["Tienes `cosmos-trace` al lado de tu repo, con `Procesos.cs`."] },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "git clone --branch taller-es-v1 https://github.com/didierymartinez/cosmos-trace",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El proceso, declarado",
      piezas: [
        {
          etiqueta: "La forma de `cosmos-trace/src/CosmosTrace.Api/procesos.json`:",
          lenguaje: "csharp",
          lineas: [
            "{",
            '  "Procesos": [',
            "    {",
            '      "Nombre": "suspension",',
            '      "Titulo": "Suspensión de empresa",',
            '      "Inicia": "<el hecho que la inicia>",',
            '      "Termina": [ "<el hecho que la da por efectiva>" ],',
            '      "Integraciones": [',
            '        { "Nombre": "Facturación", "Aplicado": [ "<el hecho de la multa confirmada>" ], "PlazoSegundos": 30 },',
            '        { "Nombre": "Accesos", "Aplicado": [ "<el hecho de los accesos revocados>" ], "PlazoSegundos": 30 }',
            "      ]",
            "    }",
            "  ]",
            "}",
          ],
        },
      ],
      luego:
        "Llena los cuatro huecos con los alias de `SELECT DISTINCT type FROM mt_events`.",
    },
    {
      tipo: "reto",
      titulo: "Arranca y mira Procesos",
      tarea:
        "Arranca la API y el tablero de CosmosLens, y mira la suspensión de emp-8 en el panel **Procesos**.",
      pasos: [
        "En `cosmos-trace/src/CosmosTrace.Api`, con `CADENA_POSTGRES` fijada **en esa terminal**, el comando de abajo. En PowerShell: `\"$env:CADENA_POSTGRES\"`.",
        "En otra terminal, en `cosmos-trace/web`: `npm install` y `npm run dev` (pide Node LTS).",
        "Abre el tablero y entra a **Procesos**.",
      ],
      logro: { items: ["La última suspensión de emp-8 sale **Completo** en Procesos."] },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "dotnet run --no-launch-profile -- --urls http://localhost:5301 \\",
          '  --ConnectionStrings:Observed "$CADENA_POSTGRES" --Observed:Schema public',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Arranca y mira Procesos",
      piezas: [
        {
          etiqueta: "Tu `procesos.json`, con los cuatro huecos llenos",
          lenguaje: "csharp",
          lineas: [
            "{",
            '  "Procesos": [',
            "    {",
            '      "Nombre": "suspension",',
            '      "Titulo": "Suspensión de empresa",',
            '      "Inicia": "empresa_suspendida",',
            '      "Termina": [ "suspension_efectiva" ],',
            '      "Integraciones": [',
            '        { "Nombre": "Facturación", "Aplicado": [ "cobro_de_multa_confirmado" ], "PlazoSegundos": 30 },',
            '        { "Nombre": "Accesos", "Aplicado": [ "revocacion_de_accesos_confirmada" ], "PlazoSegundos": 30 }',
            "      ]",
            "    }",
            "  ]",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un socio que falla",
      tarea:
        "Haz fallar a Accesos con una empresa nueva, y luego quita las dos colas.",
      pasos: [
        'Que `AccesosHandler` lance antes de responder. Siembra emp-20 (`"902000000"`, "Talleres del Llano", `"Basico"`) y suspéndela.',
        'Quita `Separated` y repite con emp-21 (`"902100000"`, "Cerámicas Altiplano", `"Basico"`).',
        "Al terminar, devuelve `Separated` y quita el `throw`.",
      ],
      logro: {
        items: [
          "emp-20: `Facturacion=Aplicado Accesos=EnCurso Efectiva=False`.",
          "En CosmosLens, `Vencido`, y el dead-letter en **Correlación**.",
          "emp-21: Facturación también queda `EnCurso`, aunque `multas` tiene la fila.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La fecha leída a ciegas",
      tarea:
        "Lee la fecha con la cultura de la máquina y la fecha de hoy si no puede, en un servidor que lee mes/día/año.",
      pasos: [
        "Cuerpo de `LeerFecha`: `DateOnly.TryParse(texto, out var f) ? f : DateOnly.FromDateTime(DateTime.Today)`. Arriba en `Program.cs`: `CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;`.",
        '`FechaDelCobro = "01/02/2026"` y suspende emp-22 (`"902200000"`, "Lácteos del Sur"). Luego `"ayer"`, con emp-23 (`"902300000"`, "Molinos del Norte").',
        'Vuelve a tu `LeerFecha` y repite `"ayer"` con emp-24 (`"902400000"`, "Textiles Oriente"). Al terminar, quita la línea de la cultura y deja `"17/10/2026"`.',
      ],
      logro: {
        items: [
          '`"01/02/2026"` da `2026-01-02`, y `"ayer"`, la fecha de hoy.',
          "Con tu `LeerFecha`: `FechaNoParseableException` en dead letters.",
          "Con la lectura ingenua, `LeerFechaTests` cae.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un acto que depende de otros termina cuando ellos **contestan**, y la empresa decide cuándo cumplieron todos.",
      puntos: [
        {
          termino: "Estado de cada integración",
          definicion: "Cada respuesta se anota como un hecho propio, y de ahí sale `EnCurso` o `Aplicado`.",
        },
        {
          termino: "SuspensionEfectiva",
          definicion: "Un hecho, no una propiedad calculada: pasó, y otros reaccionan a él.",
        },
        {
          termino: "El borde",
          definicion: "El texto de afuera se lee una vez, con formato y cultura fijos. Lo ilegible se señala.",
        },
      ],
      commit: {
        mensaje: "ES · Dos respuestas, ningún dueño",
        preguntas: [
          "¿Qué acto tuyo depende de que otro conteste, con qué estados y qué regla?",
          "¿Por qué `Suspendida = true` no bastaba?",
        ],
      },
      siguiente: {
        seccion: "37 · Dos respuestas a la vez",
        texto:
          "Aquí las respuestas llegaron una detrás de otra, y nada lo garantiza. Si llegan juntas, cada handler lee la empresa antes de que el otro guarde.",
      },
    },
  ],
};
