// Fuente: workshop-event-sourcing/taller.md, entrada "38 · Deshacer en tres sistemas".
import type { Seccion } from "./tipos";

const suspender11 = [
  'await bus.InvokeAsync(new SuspenderEmpresa("emp-11", "mora"));',
  "await Task.Delay(2000);",
];

export const seccion38: Seccion = {
  numero: 38,
  titulo: "Deshacer en tres sistemas",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Echar atrás una suspensión que otros ya ejecutaron, con **un hecho nuevo en cada sistema**; no confundir una falla pasajera con un no; y ponerle plazo al socio que no contesta.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Facturación dice que **no**: la empresa tiene acuerdo de pago.",
        },
        { k: "respuesta", texto: "Pero Accesos ya cortó." },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Cómo se deshace?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Lo que no se puede",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "**Borrar** el hecho: el diario no se reescribe.",
            "**Revertir**: no hay una transacción entre los tres.",
            "Tocar la base de Accesos: **no es nuestra**.",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Y un dolor más callado: un socio que **nunca contesta** deja `EnCurso` para siempre.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos empresas limpias",
      tarea:
        "Deja el código listo para esta sección y siembra dos empresas nuevas: emp-11 y emp-35.",
      pasos: [
        "Comprueba: la versión esperada en `Anotar`, la política `OnException` del choque, y Accesos sin pausa.",
        "En `Program.cs`, quita el bloque que reactivaba emp-9 y los pasos de la sección anterior. Deja host, `store` y `bus`.",
        "Corre la siembra de abajo **una vez** y quítala.",
      ],
      logro: { items: ["emp-11 y emp-35 existen."] },
      tips: [
        {
          k: "nota",
          texto:
            "Las versiones de las salidas suponen correr cada experimento una vez, en orden, con **solo** su suspensión en el `Program.cs`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-11", "901100000", "Panadería Sur", "Basico");',
          '    Sembrar(s, "emp-35", "903500000", "Ferretería Norte", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Facturación dice que no",
      tarea:
        "Dale a Facturación su regla: a una empresa con acuerdo de pago no le cobra, y contesta que no, con la razón.",
      pasos: [
        'En `Contratos`: `MultaRechazadaV1(Nit, Razon)`, con `[MessageIdentity("facturacion.multa-rechazada.v1")]`.',
        "En `FacturacionHandler`: `public static HashSet<string> ConAcuerdoDePago { get; } = new();`",
        "Su `Handle` devuelve `object`: el rechazo si el NIT está en `ConAcuerdoDePago`; si no, `MultaCobradaV1`, como siempre.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nota",
          texto: "Wolverine publica el mensaje que devuelvas, sea del tipo que sea.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Facturación dice que no",
      piezas: [
        {
          etiqueta: "En `Contratos`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos",
            '[MessageIdentity("facturacion.multa-rechazada.v1")]',
            "public record MultaRechazadaV1(string Nit, string Razon);",
          ],
        },
        {
          etiqueta: "En tu `FacturacionHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: la regla es de Facturación",
            "public static HashSet<string> ConAcuerdoDePago { get; } = new();",
            "",
            "public static object Handle(EmpresaSuspendidaV2 msg, Envelope envelope)",
            "{",
            '    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");',
            "    // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1, también en una reentrega …",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Empresas revierte",
      tarea:
        "Haz que Empresas anote el rechazo y revierta la suspensión con un hecho nuevo, sin borrar nada.",
      pasos: [
        "`EstadoIntegracion` gana `Rechazado`. Hechos `CobroDeMultaRechazado(Razon)` y `SuspensionRevertida(Razon)` (deja `Suspendida = false` y `Revertida = true`), con su línea en `Hechos.Registrar` y su `Assert` de alias.",
        "En `Empresa`, `RechazarCobroDeMulta(razon)`; su handler en `RespuestasHandler`, con `Anotar`. `Apply(EmpresaSuspendida)` limpia cada estado nuevo.",
        "En `Program.cs`, el bloque de abajo, e imprime emp-11.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-11: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True"],
        },
        items: ["Pero `Accesos=Aplicado`: los accesos **siguen cortados**."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: ['FacturacionHandler.ConAcuerdoDePago.Add("901100000");', ...suspender11],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Empresas revierte (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`: los hechos, su registro y el `enum`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: los hechos nuevos",
            "public record CobroDeMultaRechazado(string Razon);",
            "public record SuspensionRevertida(string Razon);",
            "",
            "// en tu Hechos.Registrar (y un Assert por hecho en el test de alias)",
            "opts.Events.AddEventType<CobroDeMultaRechazado>();",
            "opts.Events.AddEventType<SuspensionRevertida>();",
            "",
            "public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado, Rechazado }",
          ],
        },
        {
          etiqueta: "En tu `Empresa`",
          lenguaje: "csharp",
          lineas: [
            "// en tu Empresa",
            "public bool Revertida { get; private set; }",
            "",
            "public void Apply(CobroDeMultaRechazado e) { Facturacion = EstadoIntegracion.Rechazado; }",
            "public void Apply(SuspensionRevertida e)   { Suspendida = false; Revertida = true; }",
            "// y en tu Apply(EmpresaSuspendida), al empezar una suspensión nueva: Revertida = false;",
            "",
            "public object[] RechazarCobroDeMulta(string razon)",
            "{",
            "    if (Facturacion != EstadoIntegracion.EnCurso) return [];   // reentrega, o nadie lo pidió",
            "    return [new CobroDeMultaRechazado(razon), new SuspensionRevertida(razon)];",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Empresas revierte (2 de 2)",
      piezas: [
        {
          etiqueta: "En tu `RespuestasHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia, en RespuestasHandler",
            "public static async Task Handle(MultaRechazadaV1 msg, IDocumentSession session)",
            "{",
            "    var id = await Localizador.StreamDe(session, msg.Nit);",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "    Anotar(session, id, empresa, empresa.RechazarCobroDeMulta(msg.Razon));",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un timeout no es un no",
      tarea:
        "Simula una pasarela de pagos que no contesta a tiempo, y convierte esa falla en un no.",
      pasos: [
        "En `FacturacionHandler`, el contador `public static int Timeouts { get; set; }`.",
        "Después de la regla, el `try/catch` de abajo.",
        "`FacturacionHandler.Timeouts = 1;` y suspende emp-35, como a emp-11 (sin meterla en `ConAcuerdoDePago`).",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["emp-35: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True"],
        },
        items: ["Se revirtió por `la pasarela de pagos no contestó`, y la suspensión era legítima."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "try",
          "{",
          '    if (Timeouts > 0) { Timeouts--; throw new TimeoutException("la pasarela de pagos no contestó"); }',
          "    // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1 …",
          "}",
          "catch (Exception ex) { return new MultaRechazadaV1(msg.Nit, ex.Message); }",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Lo pasajero se reintenta",
      tarea:
        "Que una falla pasajera de la pasarela se reintente, y que solo la regla conteste que no.",
      pasos: [
        "Quita el `try/catch`: la `TimeoutException` sale del handler.",
        "En tu `AddWolverine`, junto a la política del choque, la de abajo.",
        "`Timeouts = 1;` y suspende emp-35 otra vez.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-35: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True"],
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.OnException<TimeoutException>()",
          "    .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Lo pasajero se reintenta",
      piezas: [
        {
          etiqueta: "Dentro de `AddWolverine`, en tu `Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs, en AddWolverine, junto a la política del choque",
            "opts.OnException<TimeoutException>()   // lo pasajero se reintenta; si no se recupera, va a dead letters",
            "    .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());",
          ],
        },
        {
          etiqueta: "En tu `FacturacionHandler`, sin el `try/catch`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs",
            "public static int Timeouts { get; set; }   // la pasarela simulada: cuántas veces seguidas no contesta",
            "",
            "public static object Handle(EmpresaSuspendidaV2 msg, Envelope envelope)",
            "{",
            '    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");   // el único no',
            '    if (Timeouts > 0) { Timeouts--; throw new TimeoutException("la pasarela de pagos no contestó"); }   // sale del handler',
            "    // … el cobro de siempre …",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un no sin razón",
      tarea:
        "La pasarela sí cobró y se perdió su respuesta. Haz que Facturación conteste lo que dice el dedup.",
      pasos: [
        "Mueve la línea del timeout a **después** de `tx.Commit()`.",
        'Guarda `var cobrada = dedup.ExecuteNonQuery() == 1;`, úsalo en el `if`, y al final devuelve `cobrada ? new MultaCobradaV1(msg.Nit, cobradaEl) : new MultaRechazadaV1(msg.Nit, "no se cobró")`.',
        "Reactiva emp-35 con un `Append` de `PagoRegistrado` y `EmpresaReactivada`, `Timeouts = 1;` y suspéndela.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["emp-35: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True"],
        },
        items: ["`multas` tiene 2 filas de `903500000`: Empresas revirtió una suspensión **cobrada**."],
      },
    },
    {
      tipo: "reto",
      titulo: "Ya estaba hecho es un sí",
      tarea:
        "Deja a Facturación con tres respuestas claras: lo hice, ya estaba hecho (un sí) y no lo hago, por esta razón.",
      pasos: [
        "Facturación vuelve a contestar `MultaCobradaV1` en los dos casos del dedup.",
        "Quita el contador `Timeouts` y su línea.",
        "En tu `DECISIONES.md`: solo una regla del socio contesta que no, y lo pasajero se reintenta.",
      ],
      logro: { items: ["Solo la regla de `ConAcuerdoDePago` contesta que no."] },
    },
    {
      tipo: "reto",
      titulo: "El comando de restituir",
      tarea:
        "Prepara la compensación en Accesos: un comando para restituir los accesos, y su confirmación.",
      pasos: [
        "En `Contratos`: el comando `RestituirAccesosV1(Nit)` y la respuesta `AccesosRestituidosV1(Nit)`, cada uno con su `[MessageIdentity]`.",
        "En Accesos, un handler de `RestituirAccesosV1` que contesta `AccesosRestituidosV1`.",
        "`EstadoIntegracion` gana `Restituyendo` y `Restituido`. Hechos `RestitucionDeAccesosSolicitada()` y `RestitucionDeAccesosConfirmada()`, con su línea y su `Assert`.",
      ],
      logro: { items: ["Compila, y tu test de alias pasa."] },
      tips: [
        {
          k: "piensa",
          texto:
            "Compensar es deshacer con un hecho nuevo, en cada sistema. Empresas no deshace lo de Accesos: se lo **pide**.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El comando de restituir",
      piezas: [
        {
          etiqueta: "En `Contratos`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos",
            '[MessageIdentity("accesos.restituir-accesos.v1")]',
            "public record RestituirAccesosV1(string Nit);",
            '[MessageIdentity("accesos.accesos-restituidos.v1")]',
            "public record AccesosRestituidosV1(string Nit);",
          ],
        },
        {
          etiqueta: "En `Accesos/AccesosHandler.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Accesos/AccesosHandler.cs",
            "public static AccesosRestituidosV1 Handle(RestituirAccesosV1 msg) => new(msg.Nit);   // restituye los accesos y lo confirma",
          ],
        },
        {
          etiqueta: "En `Empresas.Historia`: los hechos, su registro y el `enum`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia",
            "public record RestitucionDeAccesosSolicitada();",
            "public record RestitucionDeAccesosConfirmada();",
            "",
            "// en tu Hechos.Registrar (y un Assert por hecho en el test de alias)",
            "opts.Events.AddEventType<RestitucionDeAccesosSolicitada>();",
            "opts.Events.AddEventType<RestitucionDeAccesosConfirmada>();",
            "",
            "public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado, Rechazado, Restituyendo, Restituido }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Pedir la restitución",
      tarea:
        "Que el no de Facturación, si Accesos ya cortó, termine con los accesos restituidos.",
      pasos: [
        "`RechazarCobroDeMulta` suma la solicitud si Accesos ya está `Aplicado`. Su handler devuelve `RestituirAccesosV1` si `hechos.OfType<RestitucionDeAccesosSolicitada>().Any()`.",
        "En `Empresa`, `ConfirmarRestitucionDeAccesos()`, y el handler de `AccesosRestituidosV1`, con `Anotar`.",
        "En el rechazo de Facturación, `await Task.Delay(800)` antes de devolver (`async Task<object>`). Suspende emp-11.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True"],
        },
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pedir la restitución (1 de 3)",
      piezas: [
        {
          etiqueta: "En tu `FacturacionHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: el rechazo, con su pausa (para el huérfano, quítala)",
            "public static async Task<object> Handle(EmpresaSuspendidaV2 msg, Envelope envelope)",
            "{",
            "    if (ConAcuerdoDePago.Contains(msg.Nit))",
            "    {",
            "        await Task.Delay(800);   // revisar el acuerdo toma su tiempo",
            '        return new MultaRechazadaV1(msg.Nit, "tiene acuerdo de pago");',
            "    }",
            "    // … el cobro de siempre: dedup + INSERT en multas, y devuelve MultaCobradaV1, también en una reentrega …",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pedir la restitución (2 de 3)",
      piezas: [
        {
          etiqueta: "En tu `Empresa`",
          lenguaje: "csharp",
          lineas: [
            "// en tu Empresa",
            "public void Apply(RestitucionDeAccesosSolicitada e) { Accesos = EstadoIntegracion.Restituyendo; }",
            "public void Apply(RestitucionDeAccesosConfirmada e) { Accesos = EstadoIntegracion.Restituido; }",
            "",
            "public object[] RechazarCobroDeMulta(string razon)",
            "{",
            "    if (Facturacion != EstadoIntegracion.EnCurso) return [];",
            "    var hechos = new List<object> { new CobroDeMultaRechazado(razon), new SuspensionRevertida(razon) };",
            "    if (Accesos == EstadoIntegracion.Aplicado) hechos.Add(new RestitucionDeAccesosSolicitada());   // ya cortó: hay que restituir",
            "    return hechos.ToArray();",
            "}",
          ],
        },
        {
          etiqueta: "Y, también en tu `Empresa`, la confirmación",
          lenguaje: "csharp",
          lineas: [
            "public object[] ConfirmarRestitucionDeAccesos() =>",
            "    Accesos == EstadoIntegracion.Restituyendo ? [new RestitucionDeAccesosConfirmada()] : [];",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pedir la restitución (3 de 3)",
      piezas: [
        {
          etiqueta: "En tu `RespuestasHandler`: el rechazo pide la restitución",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia, en RespuestasHandler: el que decide pedir la restitución, la envía",
            "public static async Task<RestituirAccesosV1?> Handle(MultaRechazadaV1 msg, IDocumentSession session)",
            "{",
            "    var id = await Localizador.StreamDe(session, msg.Nit);",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "    var hechos = empresa.RechazarCobroDeMulta(msg.Razon);",
            "    Anotar(session, id, empresa, hechos);",
            "    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;",
            "}",
          ],
        },
        {
          etiqueta: "Y el handler de la confirmación",
          lenguaje: "csharp",
          lineas: [
            "public static async Task Handle(AccesosRestituidosV1 msg, IDocumentSession session)",
            "{",
            "    var id = await Localizador.StreamDe(session, msg.Nit);",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "    Anotar(session, id, empresa, empresa.ConfirmarRestitucionDeAccesos());",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El huérfano",
      tarea:
        "Que el no llegue **antes** que la confirmación de Accesos, y que esa confirmación tardía también se compense.",
      pasos: [
        "Quita la pausa del rechazo, y dale a Accesos su pausa de 800 ms.",
        "`ConfirmarRevocacionDeAccesos` pide la restitución si la suspensión ya está `Revertida`; su handler devuelve `RestituirAccesosV1`, igual que el del rechazo.",
        "Suspende emp-11.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True"],
        },
        items: ["La misma salida, en los dos órdenes."],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El huérfano",
      piezas: [
        {
          etiqueta: "En tu `Empresa`",
          lenguaje: "csharp",
          lineas: [
            "public object[] ConfirmarRevocacionDeAccesos()",
            "{",
            "    if (Accesos != EstadoIntegracion.EnCurso) return [];",
            "    if (Revertida) return [new RevocacionDeAccesosConfirmada(), new RestitucionDeAccesosSolicitada()];   // el huérfano: llegó tarde",
            "    return Facturacion == EstadoIntegracion.Aplicado",
            "        ? [new RevocacionDeAccesosConfirmada(), new SuspensionEfectiva()]",
            "        : [new RevocacionDeAccesosConfirmada()];",
            "}",
          ],
        },
        {
          etiqueta: "En tu `RespuestasHandler`",
          lenguaje: "csharp",
          lineas: [
            "public static async Task<RestituirAccesosV1?> Handle(AccesosRevocadosV1 msg, IDocumentSession session)",
            "{",
            "    var id = await Localizador.StreamDe(session, msg.Nit);",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {id}");',
            "    var hechos = empresa.ConfirmarRevocacionDeAccesos();",
            "    Anotar(session, id, empresa, hechos);",
            "    return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV1(msg.Nit) : null;",
            "}",
          ],
        },
      ],
      nota: "El hecho de la solicitud y el comando a Accesos salen en la **misma** transacción, por el outbox: o se pidió y se anotó, o ninguna de las dos.",
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un comando con dos oyentes",
      piezas: [
        {
          etiqueta: "En `Accesos/PortalNuevoHandler.cs`, solo para el Rómpelo: un portal nuevo que falla.",
          lenguaje: "csharp",
          lineas: [
            "using Contratos;",
            "",
            "public static class PortalNuevoHandler",
            "{",
            "    public static AccesosRestituidosV1 Handle(RestituirAccesosV1 msg) =>",
            '        throw new InvalidOperationException("el portal nuevo no responde");',
            "}",
          ],
        },
        {
          etiqueta: "En `Program.cs`: a quién le llegaría el comando, sin enviar nada.",
          lenguaje: "csharp",
          lineas: [
            'foreach (var sobre in bus.PreviewSubscriptions(new RestituirAccesosV1("903500000")))',
            "    Console.WriteLine(sobre.Destination);",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Dos destinos, una confirmación",
      tarea:
        "Con el portal nuevo, mira a quién le llega `RestituirAccesosV1` y qué dice el estado.",
      pasos: [
        "Agrega `PortalNuevoHandler` y el `foreach` de la lámina anterior.",
        'Mete `"903500000"` en `ConAcuerdoDePago` y suspende emp-35.',
        "Al terminar, borra `PortalNuevoHandler`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "local://accesoshandler/",
            "local://portalnuevohandler/",
            "emp-35: Facturacion=Rechazado Accesos=Restituido Revertida=True",
          ],
        },
        items: ["Dice `Restituido` con un portal fallando."],
      },
    },
    {
      tipo: "reto",
      titulo: "El socio que calla",
      tarea:
        "Haz que Accesos no conteste nunca, y declara el mensaje del plazo y el hecho de que venció.",
      pasos: [
        "Quita las líneas que meten los NIT en `ConAcuerdoDePago`. El handler de Accesos devuelve `null` (retorno `AccesosRevocadosV1?`).",
        '`RevisarSuspension(EmpresaId)`, con `[MessageIdentity("RevisarSuspension")]`, porque espera en la base. El hecho `SuspensionVencida(Faltan)`, con su línea y su `Assert`.',
        'En el test de alias: `Assert.Equal("RevisarSuspension", typeof(RevisarSuspension).ToMessageTypeName());` (`using Wolverine.Util;`).',
      ],
      logro: { items: ["Compila, y tu test de alias pasa."] },
      tips: [
        {
          k: "nuevo",
          idioma: "DelayedFor",
          explicacion:
            "`.DelayedFor(TimeSpan)` programa el mensaje: Wolverine lo guarda como `Scheduled`, en la misma transacción del hecho.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El socio que calla",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia",
            '[MessageIdentity("RevisarSuspension")]   // espera en la base: su nombre es un contrato (using Wolverine.Attributes;)',
            "public record RevisarSuspension(string EmpresaId);",
            "public record SuspensionVencida(string Faltan);",
            "// en tu Hechos.Registrar (y un Assert por hecho en el test de alias): opts.Events.AddEventType<SuspensionVencida>();   (RevisarSuspension es un mensaje, no un hecho)",
            '// y en el test de alias, el nombre del plazo: Assert.Equal("RevisarSuspension", typeof(RevisarSuspension).ToMessageTypeName());',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Suspender programa el plazo",
      tarea:
        "Que suspender devuelva dos cosas: el anuncio y el plazo programado para dentro de 5 segundos.",
      pasos: [
        "`SuspenderHandler` devuelve la tupla `(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)`; `(null, null)` si ya estaba suspendida.",
        "El plazo: `new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5))`.",
        "En tu test de `SuspenderHandler`: `var (anuncio, _) = await SuspenderHandler.Handle(...)`.",
      ],
      logro: { items: ["`dotnet test` en verde."] },
      tips: [
        {
          k: "nuevo",
          idioma: "(a, b)",
          explicacion: "una tupla junta dos valores en uno. Wolverine publica cada uno que no sea `null`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Suspender programa el plazo",
      piezas: [
        {
          etiqueta: "Tu `SuspenderHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: suspender anuncia y programa el plazo, en la misma transacción",
            "public static async Task<(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)> Handle(",
            "    SuspenderEmpresa cmd, IDocumentSession session)",
            "{",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
            "    if (empresa.Suspendida) return (null, null);",
            "    session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));",
            "    return (new EmpresaSuspendidaV2(empresa.Nit, cmd.Motivo, empresa.Plan),",
            "            new RevisarSuspension(cmd.EmpresaId).DelayedFor(TimeSpan.FromSeconds(5)));",
            "}",
          ],
        },
        {
          etiqueta: "En `Empresas.Tests/SuspenderHandlerTests.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Tests/SuspenderHandlerTests.cs: el anuncio sale de la tupla; los Assert quedan igual",
            'var (anuncio, _) = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El plazo vence",
      tarea:
        "Que, al llegar el plazo, Empresas anote que venció si todavía falta un socio.",
      pasos: [
        "En `Empresa`, `RevisarPlazo()`: nada si ya es efectiva, revertida o no está suspendida; si no, `SuspensionVencida` con los que faltan. `PlazoHandler` lo anota e imprime `plazo vencido para …`.",
        "En `AddWolverine`: `opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();`. En `procesos.json`, `PlazoSegundos` pasa a 5.",
        "Suspende emp-11 y espera 7 segundos: `await Task.Delay(7000);`",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["plazo vencido para emp-11: VENCIDA"],
        },
        items: ["emp-11 queda `Vencida=True`."],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El plazo vence (1 de 2)",
      piezas: [
        {
          etiqueta: "En tu `Empresa`",
          lenguaje: "csharp",
          lineas: [
            "// en tu Empresa",
            "public bool Vencida { get; private set; }",
            "public void Apply(SuspensionVencida e) { Vencida = true; }",
            "// y en tu Apply(EmpresaSuspendida), al empezar una suspensión nueva: Vencida = false;",
            "",
            "public object[] RevisarPlazo()",
            "{",
            "    if (Efectiva || Revertida || !Suspendida) return [];   // ya se resolvió: el plazo no tiene nada que hacer",
            "    var faltan = new List<string>();",
            '    if (Facturacion == EstadoIntegracion.EnCurso) faltan.Add("Facturacion");',
            '    if (Accesos == EstadoIntegracion.EnCurso) faltan.Add("Accesos");',
            '    return [new SuspensionVencida(string.Join(",", faltan))];',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El plazo vence (2 de 2)",
      piezas: [
        {
          etiqueta: "`PlazoHandler`, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "public static class PlazoHandler",
            "{",
            "    public static async Task Handle(RevisarSuspension r, IDocumentSession session)",
            "    {",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(r.EmpresaId)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {r.EmpresaId}");',
            "        var hechos = empresa.RevisarPlazo();",
            '        Console.WriteLine($"plazo vencido para {r.EmpresaId}: {(hechos.Length == 0 ? "ya resuelta" : "VENCIDA")}");',
            "        if (hechos.Length > 0) session.Events.Append(r.EmpresaId, empresa.Version + hechos.Length, hechos);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Vencer no es fallar: `SuspensionVencida` no deshace nada, deja en el diario que el plazo se cumplió sin respuesta.",
    },
    {
      tipo: "rompelo",
      titulo: "El plazo que pierde su nombre",
      tarea:
        "Renombra `RevisarSuspension` con un plazo esperando en la base, sin su `[MessageIdentity]`, y luego con él.",
      pasos: [
        "Suspende emp-35 con `Task.Delay(1000)`: el programa termina y el plazo queda `Scheduled`.",
        "Quita el atributo y renombra el record a `RevisarPlazoDeSuspension` (también en los handlers). Corre solo con una espera de 5 segundos.",
        'Ponle `[MessageIdentity("RevisarSuspension")]` a la clase renombrada y repite las dos corridas (reactiva emp-35 antes). Al final, vuelve al nombre `RevisarSuspension`, con el atributo.',
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["info: … No known handler for RevisarSuspension#…"],
        },
        items: [
          "Sin atributo: ni excepción ni dead letter. emp-35 espera para siempre.",
          "Con el atributo: `plazo vencido para emp-35: VENCIDA`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La compensación también falla",
      tarea:
        "Haz que el rechazo pida la restitución y que Accesos falle al restituir.",
      pasos: [
        'Accesos vuelve a devolver `AccesosRevocadosV1`, con su pausa de 800 ms. Mete `"901100000"` en `ConAcuerdoDePago`.',
        "Reactiva emp-11 con un `Append` de `PagoRegistrado(50_000)` y `EmpresaReactivada()`.",
        "Que el handler de `RestituirAccesosV1` lance una excepción, y suspende emp-11.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["emp-11: Facturacion=Rechazado Accesos=Restituyendo Revertida=True"],
        },
        items: ["El comando cae en dead letters, y el estado lo **dice**."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Entre sistemas no se revierte: **se compensa**. Al silencio se le pone un plazo con nombre fijo.",
      puntos: [
        {
          termino: "Compensar",
          definicion: "Un hecho nuevo en cada sistema. Lo del otro se le pide con un comando, a un destinatario.",
        },
        {
          termino: "Un no",
          definicion: "Solo lo da una regla del socio, con su razón. Lo pasajero se reintenta.",
        },
        {
          termino: "Plazo",
          definicion: "Un mensaje programado: al vencer deja constancia, y no decide solo.",
        },
      ],
      decision:
        "Solo una regla del socio contesta que no, y lo pasajero se reintenta. Un comando tiene un destinatario: el que lo confirma.",
      commit: {
        mensaje: "ES · Deshacer en tres sistemas",
        preguntas: [
          "¿Qué acto ejecutado por otro sistema tendrías que poder deshacer, y qué lo compensa en cada lado?",
        ],
      },
      siguiente: {
        seccion: "39 · El proceso tiene dueño",
        texto:
          "Mira la `Empresa`: estados de socios, restitución, plazo, reversión. Nada de eso es la empresa: es el proceso de suspenderla.",
      },
    },
  ],
};
