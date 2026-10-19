// Fuente: workshop-event-sourcing/taller.md, entrada "39 · El proceso tiene dueño".
import type { Seccion } from "./tipos";

const reactivar12 = [
  "await using (var s = store.LightweightSession())",
  "{",
  '    s.Events.Append("emp-12", new PagoRegistrado(50_000), new EmpresaReactivada());',
  "    await s.SaveChangesAsync();",
  "}",
];

export const seccion39: Seccion = {
  numero: 39,
  titulo: "El proceso tiene dueño",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Darle al proceso de suspender **su propio stream y su propio id**, y que ese id viaje en cada pedido y en cada respuesta. Así una respuesta tardía cae en la suspensión correcta.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Una respuesta tardía de la **primera** suspensión puede confirmar la **segunda**.",
        },
        {
          k: "respuesta",
          texto: "Accesos nunca cortó nada para ella, y el sistema dice que sí.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Las respuestas traen el NIT, y el NIT encuentra **la empresa**, no **la suspensión**.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La escena",
      bloques: [
        {
          k: "lista",
          marca: "numero",
          porItem: true,
          items: [
            "Suspendes emp-12. Los dos socios contestan: queda efectiva.",
            "emp-12 paga y se reactiva. La vuelves a suspender, y Accesos **no contesta**.",
            "Llega tarde la respuesta de Accesos a la **primera**: `AccesosRevocadosV2`.",
          ],
        },
        {
          k: "terminal",
          tono: "error",
          salida: ["emp-12: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True"],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto: "La vas a provocar ya con la cura puesta.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una empresa limpia",
      tarea:
        "Deja vencer lo que quedó pendiente de la sección anterior y siembra una empresa nueva, emp-12.",
      pasos: [
        "En `Program.cs`, quita la línea de `ConAcuerdoDePago` y los pasos de la sección anterior. Arranca una vez con solo `await Task.Delay(5000);`.",
        'Siembra **una vez** emp-12: `Sembrar(s, "emp-12", "901200000", "Taller Oriente", "Basico")`, en una sesión con su `SaveChangesAsync`.',
        "Desde la segunda suspensión de emp-12, antes de cada una, el `Append` de abajo, que la reactiva.",
      ],
      logro: {
        items: [
          "Si quedó un plazo esperando, vence: `plazo vencido para emp-11: ya resuelta`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto: "Los ids de las salidas suponen correr cada experimento una vez, en orden.",
        },
      ],
      ejemplo: { lenguaje: "csharp", lineas: reactivar12 },
    },
    {
      tipo: "reto",
      titulo: "El proceso, en su clase",
      tarea:
        "Saca de la `Empresa` todo lo que es del proceso de suspenderla, a una clase nueva con su propio stream.",
      pasos: [
        "En `Empresas.Historia`, la clase `SuspensionDeEmpresa`, con `Id`, `EmpresaId`, `Nit` y `Version`.",
        "Muda a ella los estados de socios, `MultaCobradaEl`, `Efectiva`, `Revertida`, `Vencida`, sus `Apply` y los métodos que deciden. `RevisarPlazo` pierde el `!Suspendida`.",
        "Hechos `SuspensionSolicitada(EmpresaId, Nit, Plan)` y `ProcesoRevertido(Razon)`, que `RechazarCobroDeMulta` emite en vez de `SuspensionRevertida`; los dos en `Hechos.Registrar`.",
      ],
      logro: { items: ["La `Empresa` ya no tiene estados de socios."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Process manager",
          explicacion:
            "el proceso tiene su stream y su id; ese id viaja de ida y vuelta, y eso es la **correlación**.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El proceso, en su clase (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`: los hechos, el plazo y `SuspensionDeEmpresa`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: el proceso, en su propio stream",
            "public record SuspensionSolicitada(string EmpresaId, string Nit, string Plan);",
            "public record ProcesoRevertido(string Razon);         // la reversión, dentro del proceso; la empresa se queda con su SuspensionRevertida",
            '[MessageIdentity("RevisarSuspension")]                // el nombre fijo de Deshacer en tres sistemas se queda (using Wolverine.Attributes;)',
            "public record RevisarSuspension(string SuspensionId); // el plazo, ahora del proceso",
            "// en tu Hechos.Registrar (y un Assert por hecho en el test de alias): AddEventType<SuspensionSolicitada>() y AddEventType<ProcesoRevertido>()",
            "",
            "public class SuspensionDeEmpresa",
            "{",
            '    public string Id { get; private set; } = "";',
            '    public string EmpresaId { get; private set; } = "";',
            '    public string Nit { get; private set; } = "";',
            "    public long Version { get; private set; }",
            "    public EstadoIntegracion Facturacion { get; private set; }",
            "    public EstadoIntegracion Accesos { get; private set; }",
            "    public DateOnly? MultaCobradaEl { get; private set; }",
            "    public bool Efectiva { get; private set; }",
            "    public bool Revertida { get; private set; }",
            "    public bool Vencida { get; private set; }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El proceso, en su clase (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue `SuspensionDeEmpresa`: sus `Apply`, y lo que se muda",
          lenguaje: "csharp",
          lineas: [
            "    public void Apply(SuspensionSolicitada e)",
            "    {",
            "        EmpresaId = e.EmpresaId; Nit = e.Nit;",
            "        Facturacion = EstadoIntegracion.EnCurso; Accesos = EstadoIntegracion.EnCurso;",
            "    }",
            "    public void Apply(ProcesoRevertido e) { Revertida = true; }",
            "    // … y los Apply y los métodos que deciden, mudados desde la Empresa, con dos cambios:",
            "    //   RechazarCobroDeMulta emite ProcesoRevertido en vez de SuspensionRevertida,",
            "    //   y RevisarPlazo empieza con if (Efectiva || Revertida) return [];  (sin el !Suspendida) …",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Suspender abre el proceso",
      tarea:
        "Que la empresa guarde solo el id de su suspensión en curso, y que suspender abra el stream del proceso.",
      pasos: [
        "La `Empresa` se queda con `Suspendida` y `ProcesoAbierto`. `EmpresaSuspendida` pasa a `(Motivo, SuspensionId)`. `ProcesoAbierto` vuelve a `null` con la reactivación y con `SuspensionRevertida`.",
        'En `SuspenderHandler`, el id es `$"susp-{cmd.EmpresaId}-{empresa.Version + 1}"`, con `StartStream<SuspensionDeEmpresa>` en la misma sesión. El plazo pasa a `RevisarSuspension(SuspensionId)`, con su `[MessageIdentity("RevisarSuspension")]`.',
        "Borra `RespuestasHandler` y `PlazoHandler`. Suspende emp-12.",
      ],
      logro: {
        items: [
          "`mt_streams` muestra `emp-12 | empresa` y `susp-emp-12-2 | suspension_de_empresa`.",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Suspender abre el proceso (1 de 2)",
      piezas: [
        {
          etiqueta: "Tu `Empresa`, solo con lo suyo",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: la empresa vuelve a ser solo la empresa",
            "public record EmpresaSuspendida(string Motivo, string SuspensionId);",
            "",
            "public class Empresa",
            "{",
            "    // … Id, Nit, Nombre, Plan, DeudaPendiente, Reactivaciones, Version y las referencias de pago con su YaRegistro, como antes …",
            "    public bool Suspendida { get; private set; }",
            "    public string? ProcesoAbierto { get; private set; }",
            "",
            "    public void Apply(EmpresaSuspendida e)   { Suspendida = true; DeudaPendiente = true; ProcesoAbierto = e.SuspensionId; }",
            "    public void Apply(EmpresaReactivada e)   { Suspendida = false; Reactivaciones++; ProcesoAbierto = null; }",
            "    public void Apply(SuspensionRevertida e) { Suspendida = false; ProcesoAbierto = null; }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Suspender abre el proceso (2 de 2)",
      piezas: [
        {
          etiqueta: "Tu `SuspenderHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: suspender anota en la empresa y abre el proceso, en una transacción",
            "public static async Task<(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)> Handle(",
            "    SuspenderEmpresa cmd, IDocumentSession session)",
            "{",
            "    var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)",
            '        ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
            "    if (empresa.Suspendida) return (null, null);",
            "",
            '    var suspensionId = $"susp-{cmd.EmpresaId}-{empresa.Version + 1}";',
            "    var nit = empresa.Nit;",
            "    session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo, suspensionId));",
            "    session.Events.StartStream<SuspensionDeEmpresa>(suspensionId, new SuspensionSolicitada(cmd.EmpresaId, nit, empresa.Plan));",
            "    return (new EmpresaSuspendidaV2(nit, cmd.Motivo, empresa.Plan),",
            "            new RevisarSuspension(suspensionId).DelayedFor(TimeSpan.FromSeconds(5)));   // el plazo, con el id del proceso",
            "}",
          ],
        },
      ],
      nota: "Una suspensión nueva es un stream nuevo: ya no hay estados que limpiar al empezar.",
    },
    {
      tipo: "reto",
      titulo: "Pedir con la correlación",
      tarea:
        "Que Empresas les **pida** a los socios con el id de la suspensión, y que ellos contesten devolviéndolo.",
      pasos: [
        "En `Contratos`, los pedidos `CobrarMultaV1(SuspensionId, Nit, Plan)`, `RevocarAccesosV1(SuspensionId, Nit)` y `RestituirAccesosV2(SuspensionId, Nit)`.",
        "Y las respuestas `MultaCobradaV2`, `MultaRechazadaV2`, `AccesosRevocadosV2` y `AccesosRestituidosV2`, con `SuspensionId`. Todos con su `[MessageIdentity]`.",
        "Facturación y Accesos dejan de escuchar `EmpresaSuspendidaV2` y atienden los pedidos. Accesos contesta sin pausa.",
      ],
      logro: { items: ["Compila."] },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pedir con la correlación (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Contratos`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos: el dueño pide, con la correlación…",
            '[MessageIdentity("facturacion.cobrar-multa.v1")]',
            "public record CobrarMultaV1(string SuspensionId, string Nit, string Plan);",
            '[MessageIdentity("accesos.revocar-accesos.v1")]',
            "public record RevocarAccesosV1(string SuspensionId, string Nit);",
            '[MessageIdentity("accesos.restituir-accesos.v2")]',
            "public record RestituirAccesosV2(string SuspensionId, string Nit);",
            "// …y cada socio contesta devolviéndola",
            '[MessageIdentity("facturacion.multa-cobrada.v2")]',
            "public record MultaCobradaV2(string SuspensionId, string Nit, DateOnly CobradaEl);   // la fecha, como en la V1",
            '[MessageIdentity("facturacion.multa-rechazada.v2")]',
            "public record MultaRechazadaV2(string SuspensionId, string Nit, string Razon);",
            '[MessageIdentity("accesos.accesos-revocados.v2")]',
            "public record AccesosRevocadosV2(string SuspensionId, string Nit);",
            '[MessageIdentity("accesos.accesos-restituidos.v2")]',
            "public record AccesosRestituidosV2(string SuspensionId, string Nit);",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pedir con la correlación (2 de 2)",
      piezas: [
        {
          etiqueta: "En tu `FacturacionHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: el mismo cobro, ahora como respuesta a un pedido",
            "public static object Handle(CobrarMultaV1 msg, Envelope envelope)",
            "{",
            '    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV2(msg.SuspensionId, msg.Nit, "tiene acuerdo de pago");',
            "    var cobradaEl = LeerFecha(MundoExterno.FechaDelCobro)",
            "        ?? throw new FechaNoParseableException(MundoExterno.FechaDelCobro);   // la fecha, leída en el borde como para la V1",
            "    // … dedup + INSERT en multas, como siempre …",
            "    return new MultaCobradaV2(msg.SuspensionId, msg.Nit, cobradaEl);       // siempre, también en una reentrega",
            "}",
          ],
        },
        {
          etiqueta: "En tu `AccesosHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Accesos/AccesosHandler.cs",
            "public static AccesosRevocadosV2 Handle(RevocarAccesosV1 cmd) => new(cmd.SuspensionId, cmd.Nit);",
            "public static AccesosRestituidosV2 Handle(RestituirAccesosV2 cmd) => new(cmd.SuspensionId, cmd.Nit);",
          ],
        },
      ],
      nota: "La correlación va en el contrato desde el primer mensaje: agregarla después te costó versiones nuevas en los dos lados.",
    },
    {
      tipo: "reto",
      titulo: "Suspender pide",
      tarea:
        "Que suspender devuelva el anuncio, los dos pedidos y el plazo, todo en la misma transacción.",
      pasos: [
        "`SuspenderHandler` devuelve `OutgoingMessages`: `Add(...)` para el anuncio y los pedidos, y `Delay(mensaje, 5.Seconds())` para el plazo.",
        "Tu test busca el anuncio con `OfType<EmpresaSuspendidaV2>().FirstOrDefault()`.",
        "Reactiva emp-12 y suspéndela.",
      ],
      logro: {
        items: [
          "`susp-emp-12-5: suspension_solicitada`.",
          "En el log, los `No routes can be determined` esperados: nadie recibe aún las respuestas.",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Suspender pide (1 de 2)",
      piezas: [
        {
          etiqueta: "Tu `SuspenderHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: suspender anota, abre el proceso y pide, todo en una transacción",
            "public static class SuspenderHandler",
            "{",
            "    public static async Task<OutgoingMessages> Handle(SuspenderEmpresa cmd, IDocumentSession session)",
            "    {",
            "        var salida = new OutgoingMessages();",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
            "        if (empresa.Suspendida) return salida;                                        // ya lo estaba: nada sale",
            "",
            '        var suspensionId = $"susp-{cmd.EmpresaId}-{empresa.Version + 1}";',
            "        var nit = empresa.Nit;",
            "        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo, suspensionId));",
            "        session.Events.StartStream<SuspensionDeEmpresa>(suspensionId, new SuspensionSolicitada(cmd.EmpresaId, nit, empresa.Plan));",
            "",
            "        salida.Add(new EmpresaSuspendidaV2(nit, cmd.Motivo, empresa.Plan));   // el anuncio, para quien quiera saber",
            "        salida.Add(new CobrarMultaV1(suspensionId, nit, empresa.Plan));        // los pedidos, a quien tiene que hacer algo",
            "        salida.Add(new RevocarAccesosV1(suspensionId, nit));",
            "        salida.Delay(new RevisarSuspension(suspensionId), 5.Seconds());        // el plazo",
            "        return salida;",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Suspender pide (2 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/SuspenderHandlerTests.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Tests/SuspenderHandlerTests.cs: el anuncio, entre los mensajes que salen (arriba: using Contratos;)",
            'var salida = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);',
            "",
            "var anuncio = salida.OfType<EmpresaSuspendidaV2>().FirstOrDefault();",
            "Assert.NotNull(anuncio);",
            'Assert.Equal("900555", anuncio.Nit);',
            'Assert.Equal("Basico", anuncio.Plan);',
            'Assert.Equal("mora", anuncio.Motivo);',
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Cien a la vez",
      tarea:
        "Publica cien mensajes a la vez desde un handler, con `Task.WhenAll` sobre el bus.",
      pasos: [
        "En `Empresas.Historia`, solo para el Rómpelo, el handler de abajo, con `public record PublicarCien();` y `public record Eco(int N);`.",
        "En `Program.cs`: `await bus.InvokeAsync(new PublicarCien());` y cuenta enseguida en `wolverine_incoming_envelopes`.",
        "Al terminar, borra `CienHandler` y sus dos mensajes.",
      ],
      logro: {
        items: [
          "Salen los 100, sin error. Pero el `MessageContext` **no se comparte** entre tareas.",
          "Varios mensajes salen por `OutgoingMessages`, o con un `await` detrás de otro.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class CienHandler",
          "{",
          "    public static async Task Handle(PublicarCien cmd, IDocumentSession session, IMessageBus bus) =>",
          "        await Task.WhenAll(Enumerable.Range(1, 100)",
          "            .Select(n => bus.PublishAsync(new Eco(n)).AsTask()));",
          "",
          "    public static void Handle(Eco e) { }",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El mismo pedido, en otro sobre",
      tarea:
        "Que el mismo pedido cobre una sola multa, en los sobres que lleguen: la llave es el acto, no el sobre.",
      pasos: [
        "En `psql`: `ALTER TABLE multas ADD COLUMN suspension_id TEXT UNIQUE;`",
        "El `INSERT` en `multas` lleva el `SuspensionId` y termina en `ON CONFLICT (suspension_id) DO NOTHING`.",
        "Quita el dedup por `procesados` y el `Envelope`. Prueba con el bloque de abajo.",
      ],
      logro: {
        items: [
          "Una sola multa con `suspension_id = 'susp-emp-12-5'`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.PublishAsync(new CobrarMultaV1("susp-emp-12-5", "901200000", "Basico"));',
          'await bus.PublishAsync(new CobrarMultaV1("susp-emp-12-5", "901200000", "Basico"));',
          "await Task.Delay(1000);",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El mismo pedido, en otro sobre",
      piezas: [
        {
          etiqueta: "En `psql`",
          lenguaje: "sql",
          lineas: [
            "ALTER TABLE multas ADD COLUMN suspension_id TEXT UNIQUE;   -- las multas de antes quedan en null",
          ],
        },
        {
          etiqueta: "Tu `FacturacionHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: la llave es el acto, no el sobre",
            "public static object Handle(CobrarMultaV1 msg)",
            "{",
            '    if (ConAcuerdoDePago.Contains(msg.Nit)) return new MultaRechazadaV2(msg.SuspensionId, msg.Nit, "tiene acuerdo de pago");',
            "    var cobradaEl = LeerFecha(MundoExterno.FechaDelCobro)",
            "        ?? throw new FechaNoParseableException(MundoExterno.FechaDelCobro);",
            "",
            "    using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "    using var multa = c.CreateCommand();",
            '    multa.CommandText = "INSERT INTO multas(suspension_id, nit, plan_al_suspender, monto) "',
            '                      + "VALUES(@suspension, @nit, @plan, @monto) ON CONFLICT (suspension_id) DO NOTHING";',
            '    multa.Parameters.AddWithValue("suspension", msg.SuspensionId);',
            '    multa.Parameters.AddWithValue("nit", msg.Nit);',
            '    multa.Parameters.AddWithValue("plan", msg.Plan);',
            '    multa.Parameters.AddWithValue("monto", Tarifa[msg.Plan]);',
            "    multa.ExecuteNonQuery();                                              // 0 filas: esa suspensión ya tenía su multa",
            "    return new MultaCobradaV2(msg.SuspensionId, msg.Nit, cobradaEl);      // siempre, también si ya estaba cobrada",
            "}",
          ],
        },
      ],
      nota: "El acto repetido se reconoce por la referencia que le dio su origen, el `SuspensionId`, no por el `envelope.Id`.",
    },
    {
      tipo: "reto",
      titulo: "El dueño decide",
      tarea:
        "Que cada respuesta, y el plazo, lleguen al stream de **su** suspensión, y que el proceso decida qué sigue.",
      pasos: [
        "`ProcesoDeSuspensionHandler`, con un `Handle` por respuesta y otro por `RevisarSuspension`, todos por un `Decidir(session, suspensionId, Func<SuspensionDeEmpresa, object[]>)`.",
        "Si revierte, anota `SuspensionRevertida` en el stream de la empresa; si pidió restituir, devuelve `RestituirAccesosV2`.",
        "En `procesos.json`, `Inicia` pasa a `suspension_solicitada`. Reactiva emp-12 y suspéndela.",
      ],
      logro: {
        items: ["`susp-emp-12-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True`"],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Func<T, R>",
          explicacion:
            "una función que recibe un `T` y devuelve un `R`. Aquí, el proceso y sus hechos: `p => p.ConfirmarCobroDeMulta(m.CobradaEl)`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El dueño decide (1 de 3)",
      piezas: [
        {
          etiqueta: "`ProcesoDeSuspensionHandler`, en `Empresas.Historia`: un `Handle` por mensaje",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: el dueño del proceso. Cada respuesta va al stream de SU suspensión.",
            "public static class ProcesoDeSuspensionHandler",
            "{",
            "    public static Task<RestituirAccesosV2?> Handle(MultaCobradaV2 m, IDocumentSession s)       => Decidir(s, m.SuspensionId, p => p.ConfirmarCobroDeMulta(m.CobradaEl));",
            "    public static Task<RestituirAccesosV2?> Handle(MultaRechazadaV2 m, IDocumentSession s)     => Decidir(s, m.SuspensionId, p => p.RechazarCobroDeMulta(m.Razon));",
            "    public static Task<RestituirAccesosV2?> Handle(AccesosRevocadosV2 m, IDocumentSession s)   => Decidir(s, m.SuspensionId, p => p.ConfirmarRevocacionDeAccesos());",
            "    public static Task<RestituirAccesosV2?> Handle(AccesosRestituidosV2 m, IDocumentSession s) => Decidir(s, m.SuspensionId, p => p.ConfirmarRestitucionDeAccesos());",
            "    public static Task<RestituirAccesosV2?> Handle(RevisarSuspension r, IDocumentSession s)    => Decidir(s, r.SuspensionId, p => p.RevisarPlazo());",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El dueño decide (2 de 3)",
      piezas: [
        {
          etiqueta: "Sigue: el `Decidir` común",
          lenguaje: "csharp",
          lineas: [
            "    static async Task<RestituirAccesosV2?> Decidir(IDocumentSession session, string suspensionId, Func<SuspensionDeEmpresa, object[]> decidir)",
            "    {",
            "        var proceso = await session.Events.AggregateStreamAsync<SuspensionDeEmpresa>(suspensionId)",
            '            ?? throw new InvalidOperationException($"No existe la suspensión {suspensionId}");',
            "        var hechos = decidir(proceso);",
            "        if (hechos.Length == 0) return null;                                              // nada nuevo: una reentrega, o el plazo de un proceso ya resuelto",
            "        session.Events.Append(suspensionId, proceso.Version + hechos.Length, hechos);",
            "",
            "        if (hechos.OfType<ProcesoRevertido>().FirstOrDefault() is ProcesoRevertido revertido)",
            "            session.Events.Append(proceso.EmpresaId, new SuspensionRevertida(revertido.Razon));   // la empresa vuelve a estar activa",
            "",
            "        return hechos.OfType<RestitucionDeAccesosSolicitada>().Any() ? new RestituirAccesosV2(suspensionId, proceso.Nit) : null;",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El dueño decide (3 de 3)",
      piezas: [
        {
          etiqueta: "Dentro de `AddWolverine`, si tienes el orden por llave",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs, dentro de AddWolverine: si tienes el orden por llave, ahora va por proceso",
            "opts.MessagePartitioning",
            "    .ByMessage<MultaCobradaV2>(m => m.SuspensionId)",
            "    .ByMessage<AccesosRevocadosV2>(m => m.SuspensionId)",
            "    .ByMessage<MultaRechazadaV2>(m => m.SuspensionId)        // el rechazo y la restitución, que sumaste en Deshacer en tres sistemas",
            "    .ByMessage<AccesosRestituidosV2>(m => m.SuspensionId);",
            'opts.PublishMessage<MultaCobradaV2>().ToLocalQueue("respuestas");',
            'opts.PublishMessage<AccesosRevocadosV2>().ToLocalQueue("respuestas");',
            'opts.PublishMessage<MultaRechazadaV2>().ToLocalQueue("respuestas");',
            'opts.PublishMessage<AccesosRestituidosV2>().ToLocalQueue("respuestas");',
            "// la línea de PartitionProcessingByGroupId se queda como estaba",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La escena, con la cura",
      tarea:
        "Provoca la respuesta tardía de la primera suspensión, y mira que no toque la segunda.",
      pasos: [
        "Accesos en silencio: su handler devuelve `null` (retorno `AccesosRevocadosV2?`).",
        "Reactiva emp-12 y suspéndela.",
        "Entrega a mano la respuesta tardía de abajo.",
      ],
      logro: {
        items: [
          "`susp-emp-12-8` sigue `Efectiva=True`, sin hechos nuevos.",
          "`susp-emp-12-11: Accesos=EnCurso Efectiva=False`: sigue esperando, como debe.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: ['await bus.InvokeAsync(new AccesosRevocadosV2("susp-emp-12-8", "901200000"));'],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La escena, con la cura",
      piezas: [
        {
          etiqueta: "En tu `AccesosHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Accesos/AccesosHandler.cs: en silencio, para la escena",
            "public static AccesosRevocadosV2? Handle(RevocarAccesosV1 cmd) => null;",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Reconocer: la saga de Wolverine",
      piezas: [
        {
          etiqueta:
            "Se reconoce, no se construye. ⚠️ Sin `IRevisioned`, dos respuestas a la vez se pisan, sin error.",
          lenguaje: "csharp",
          lineas: [
            "public class SuspensionSaga : Saga, JasperFx.IRevisioned   // ← IRevisioned: ver abajo",
            "{",
            "    public static (SuspensionSaga, PlazoDeSuspension) Start(IniciarSuspension cmd) =>",
            "        (new SuspensionSaga { Id = cmd.SuspensionId, EmpresaId = cmd.EmpresaId },",
            "         new PlazoDeSuspension(cmd.SuspensionId));",
            "    public void Handle([SagaIdentityFrom(nameof(MultaCobradaV2.SuspensionId))] MultaCobradaV2 m,",
            '        IDocumentSession s) => Registrar("Facturacion", s);',
            "    public void Handle([SagaIdentityFrom(nameof(AccesosRevocadosV2.SuspensionId))] AccesosRevocadosV2 m,",
            '        IDocumentSession s) => Registrar("Accesos", s);',
            "    void Registrar(string socio, IDocumentSession s)",
            "    {",
            "        if (!Respondieron.Contains(socio)) Respondieron.Add(socio);",
            "        if (Respondieron.Count < 2) return;",
            "        s.Events.Append(EmpresaId, new SuspensionEfectiva());",
            "        MarkCompleted();",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Coreografía u orquestación",
      bloques: [
        {
          k: "tabla",
          columnas: ["", "Coreografía", "Orquestación"],
          filas: [
            ["Quién empuja", "Cada socio reacciona", "Un dueño pide"],
            ["El estado", "En la `Empresa`, uno por empresa", "Un stream por instancia"],
            ["Bueno cuando", "No hay resultado conjunto", "Hay reglas, plazos, compensaciones"],
          ],
        },
        {
          k: "respuesta",
          texto: "¿Alguien pregunta «en qué va»? Necesita dueño.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Sin correlación",
      tarea:
        "Busca el proceso por la empresa, no por el id que trae el mensaje, y entrega otra vez la respuesta tardía.",
      pasos: [
        "En `ProcesoDeSuspensionHandler`, busca el proceso con el `ProcesoAbierto` de la empresa, en vez del `SuspensionId` del mensaje.",
        'Sin reactivar ni suspender, entrega otra vez a mano `AccesosRevocadosV2("susp-emp-12-8", "901200000")`.',
        "Al terminar, vuelve a buscar por el `SuspensionId` del mensaje.",
      ],
      logro: {
        items: [
          "`susp-emp-12-11` queda `Accesos=Aplicado Efectiva=True`: **en falso**.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un acto largo",
      piezas: [
        {
          etiqueta:
            "En `Program.cs`, solo para el Rómpelo: suspender en un solo acto, que guarda la apertura y deja los pasos para el final.",
          lenguaje: "csharp",
          lineas: [
            "await using (var s = store.LightweightSession())",
            "{",
            '    var empresa = await s.Events.AggregateStreamAsync<Empresa>("emp-36")',
            '        ?? throw new InvalidOperationException("No existe la empresa emp-36");',
            '    var id = $"susp-emp-36-{empresa.Version + 1}";',
            '    s.Events.Append("emp-36", new EmpresaSuspendida("mora", id));',
            '    s.Events.StartStream<SuspensionDeEmpresa>(id, new SuspensionSolicitada("emp-36", empresa.Nit, empresa.Plan));',
            "    await s.SaveChangesAsync();                                     // la apertura, guardada",
            "",
            "    var pasos = new List<object>();                                 // los pasos, en memoria hasta el final",
            "    var cobro = await bus.InvokeAsync<MultaCobradaV2>(new CobrarMultaV1(id, empresa.Nit, empresa.Plan));",
            "    pasos.Add(new CobroDeMultaConfirmado(cobro.CobradaEl));",
            '    throw new InvalidOperationException("el proceso muere aquí, antes de preguntarle a Accesos");',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "El dueño que muere",
      tarea:
        "**No lo saltes**: las secciones siguientes parten de lo que dejas aquí. Deja morir un acto largo a la mitad.",
      pasos: [
        'Siembra emp-36: `Sembrar(s, "emp-36", "903600000", "Imprenta Central", "Basico")`. Pon el bloque de la lámina anterior, arranca y deja que muera.',
        "Quita el bloque y la siembra. Arranca otra vez con `await Task.Delay(7000);` y mira emp-36, sus procesos y sus multas.",
        "Sácala a mano: un `Append` a `\"emp-36\"` de `PagoRegistrado(50_000)` y `EmpresaReactivada()`.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: [
            "emp-36:        Suspendida=True ProcesoAbierto=susp-emp-36-2",
            "susp-emp-36-2: suspension_solicitada",
            "multas:        susp-emp-36-2 | 50000",
          ],
        },
        items: ["Facturación cobró, el proceso no lo sabe, y **no hay plazo** que lo venza."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La misma caída, con tu handler",
      tarea:
        "Suspende emp-36 con tu `SuspenderHandler` y corta el programa en seco, con Accesos en silencio.",
      pasos: [
        "En `Program.cs`, el bloque de abajo. Arranca.",
        "Quítalo. Arranca otra vez con `await Task.Delay(7000);` y mira emp-36 y su proceso.",
      ],
      logro: {
        items: [
          "`susp-emp-36-5` termina en `cobro_de_multa_confirmado → suspension_vencida`.",
          "El cobro y el plazo **sobreviven**: un hecho por paso.",
          "Pero emp-36 sigue con `ProcesoAbierto=susp-emp-36-5`: atada al proceso vencido.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-36", "mora"));',
          "await Task.Delay(1000);",
          "Environment.Exit(1);   // la caída",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El plazo cierra el proceso",
      tarea:
        "Que, al vencer, el plazo deje la empresa libre de proceso: sigue suspendida, pero se puede reintentar.",
      pasos: [
        "En `SuspenderHandler`, `if (empresa.Suspendida)` pasa a `if (empresa.ProcesoAbierto is not null)`.",
        "El hecho `ProcesoCerrado(SuspensionId)`, con su línea y su `Assert`. Su `Apply` deja `ProcesoAbierto` en `null` solo si es el suyo. `Decidir` lo anota en la empresa si los hechos traen `SuspensionVencida`.",
        "Reactiva emp-36, suspéndela con Accesos en silencio y espera 7 segundos.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: ["emp-36: Suspendida=True ProcesoAbierto="],
        },
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El plazo cierra el proceso",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: la empresa se entera de que su proceso se cerró",
            "public record ProcesoCerrado(string SuspensionId);",
            "// en tu Hechos.Registrar (y un Assert en el test de alias): AddEventType<ProcesoCerrado>()",
            "",
            "// en tu Empresa",
            "public void Apply(ProcesoCerrado e) { if (ProcesoAbierto == e.SuspensionId) ProcesoAbierto = null; }   // solo si es el suyo",
          ],
        },
        {
          etiqueta: "En tu `SuspenderHandler`",
          lenguaje: "csharp",
          lineas: [
            "// SuspenderHandler: un proceso abierto a la vez",
            "if (empresa.ProcesoAbierto is not null) return salida;",
          ],
        },
        {
          etiqueta: "En `Decidir`, junto a la reversión",
          lenguaje: "csharp",
          lineas: [
            "// ProcesoDeSuspensionHandler, en Decidir, junto a la reversión",
            "if (hechos.OfType<SuspensionVencida>().Any())",
            "    session.Events.Append(proceso.EmpresaId, new ProcesoCerrado(suspensionId));   // venció: el proceso se cierra y suelta la empresa",
          ],
        },
      ],
      nota: "Cerrar no decide nada: solo suelta la empresa, y qué hacer con lo vencido lo sigue decidiendo alguien.",
    },
    {
      tipo: "aprendizaje",
      idea: "Un proceso que espera varias respuestas **es alguien**: tiene stream e id, y ese id viaja de ida y vuelta y es la llave de lo que pide.",
      puntos: [
        {
          termino: "Process manager",
          definicion: "El dueño del proceso: pide, decide paso a paso, compensa y vence.",
        },
        {
          termino: "Correlación",
          definicion: "El `SuspensionId`, en cada pedido y en cada respuesta.",
        },
        {
          termino: "Saga",
          definicion: "Lo mismo en Wolverine, como documento. Necesita `IRevisioned`.",
        },
      ],
      decision:
        "Una multa por `SuspensionId`: la llave es el acto. Correlaciono por el id del proceso, y su plazo lo cierra. Un proceso terminado se queda ___ meses.",
      commit: {
        mensaje: "ES · El proceso tiene dueño",
        preguntas: [
          "¿Qué proceso tuyo espera respuestas de varios lados, quién es su dueño y qué correlación viaja en sus mensajes?",
        ],
      },
      siguiente: {
        seccion: "40 · El daemon y la consistencia eventual",
        texto:
          "Las vistas siguen apagadas desde el swap. En Marten, las corre el daemon.",
      },
    },
  ],
};
