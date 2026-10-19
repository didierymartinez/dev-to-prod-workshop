// Fuente: workshop-event-sourcing/taller.md, entrada "34 · El contrato lleva lo justo".
import type { Seccion } from "./tipos";

export const seccion34: Seccion = {
  numero: 34,
  titulo: "El contrato lleva lo justo",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que Facturación cobre con el plan correcto. El plan **del momento** viaja en el anuncio; el plan **de hoy** se le pregunta a Empresas cuando hace falta.",
    },
    {
      tipo: "planteamiento",
      titulo: "¿Qué cobra el mes que viene?",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La multa vale 50.000, 100.000 o 200.000 según el plan, y el plan lo decide **Empresas**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Si lo metemos en el anuncio y Facturación lo **guarda**, ¿qué cobra el mes que viene?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La copia se queda atrás",
      bloques: [
        {
          k: "diario",
          porItem: true,
          items: [
            "Suspendes emp-8 (Básico): Facturación guarda el plan",
            "emp-8 paga y se reactiva",
            "emp-8 cambia a Premium",
            "La mensualidad lee la copia: **Básico**",
          ],
        },
        {
          k: "respuesta",
          texto: "Empresas dice Premium; Facturación cobra Básico. Lo vas a provocar.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una empresa limpia",
      tarea:
        "Siembra una empresa nueva, emp-8, para las pruebas de esta sección: tu emp-7 ya está suspendida.",
      pasos: [
        "En tu `Program.cs`, **justo después** de `await host.StartAsync()`, el bloque de abajo. Suma `using Contratos;` arriba.",
        "Córrelo **una vez**.",
        "Borra el bloque de la siembra y deja la línea del `store`: volver a sembrar emp-8 lanza `ExistingStreamIdCollisionException`.",
      ],
      logro: { items: ["emp-8 existe, con plan Basico, y el `store` se queda en tu `Program.cs`."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = host.Services.GetRequiredService<IDocumentStore>();",
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-8", "900800800", "Cooperativa Llanos", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Cobrar según el plan",
      tarea:
        "Haz que Facturación cobre la multa según el plan que trae un anuncio nuevo, el `V2`, y la guarde en una tabla `multas`.",
      pasos: [
        'En `Contratos`, al lado del `V1`: `EmpresaSuspendidaV2(Nit, Motivo, Plan)`, con `[MessageIdentity("empresas.empresa-suspendida.v2")]`. En `psql`, la tabla `multas(nit, plan_al_suspender, monto)`.',
        "Tu `FacturacionHandler` pasa a recibir el `V2`, con su `Tarifa`. El dedup por `envelope.Id` y el `INSERT` en `multas`, en **una sola transacción**.",
        "En tu `Program.cs`, cambia tu simulación de reentrega (las dos llamadas con el mismo sobre) por la llamada directa de abajo.",
      ],
      logro: {
        items: ["`SELECT * FROM multas` → `900800800 | Basico | 50000`"],
      },
      tips: [
        {
          k: "lista",
          titulo: "La tarifa, de Facturación",
          items: ["`Basico` · 50.000", "`Premium` · 100.000", "`Enterprise` · 200.000"],
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "FacturacionHandler.Handle(",
          '    new EmpresaSuspendidaV2("900800800", "mora", "Basico"),',
          "    new Envelope { Id = Guid.NewGuid() });",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Cobrar según el plan (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Contratos`, al lado del `V1`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos",
            '[MessageIdentity("empresas.empresa-suspendida.v2")]',
            "public record EmpresaSuspendidaV2(string Nit, string Motivo, string Plan);",
          ],
        },
        {
          etiqueta: "En `psql`",
          lenguaje: "sql",
          lineas: [
            "CREATE TABLE multas(nit TEXT NOT NULL, plan_al_suspender TEXT NOT NULL, monto INT NOT NULL);",
          ],
        },
        {
          etiqueta: "Tu `FacturacionHandler`, en `Facturacion`: la tarifa y el dedup",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: la tarifa es suya; el plan de la suspensión es un hecho del momento",
            "public static class FacturacionHandler",
            "{",
            '    static readonly Dictionary<string, int> Tarifa = new() { ["Basico"] = 50_000, ["Premium"] = 100_000, ["Enterprise"] = 200_000 };',
            "",
            "    public static void Handle(EmpresaSuspendidaV2 msg, Envelope envelope)",
            "    {",
            "        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "        using var tx = c.BeginTransaction();   // el dedup y la multa, juntos",
            "",
            "        using var dedup = c.CreateCommand();",
            "        dedup.Transaction = tx;",
            '        dedup.CommandText = "INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING";',
            '        dedup.Parameters.AddWithValue("id", envelope.Id);',
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Cobrar según el plan (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue el mismo `Handle`: la multa, en la misma transacción",
          lenguaje: "csharp",
          lineas: [
            "        if (dedup.ExecuteNonQuery() == 1)",
            "        {",
            "            using var multa = c.CreateCommand();",
            "            multa.Transaction = tx;",
            '            multa.CommandText = "INSERT INTO multas(nit, plan_al_suspender, monto) VALUES(@nit, @plan, @monto)";',
            '            multa.Parameters.AddWithValue("nit", msg.Nit);',
            '            multa.Parameters.AddWithValue("plan", msg.Plan);',
            '            multa.Parameters.AddWithValue("monto", Tarifa[msg.Plan]);',
            "            multa.ExecuteNonQuery();",
            "        }",
            "        tx.Commit();",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Llamar dos veces con el mismo `sobre` deja una sola fila: el dedup de §33 sigue en su sitio.",
    },
    {
      tipo: "reto",
      titulo: "Empresas anuncia el plan",
      tarea:
        "Haz que suspender por el bus cobre la multa con el plan del momento, y que suspender otra vez no cobre nada.",
      pasos: [
        "Quita la llamada directa del `Program.cs`. En `psql`, vacía: `DELETE FROM multas; DELETE FROM procesados;`.",
        "Tu `SuspenderHandler` devuelve `EmpresaSuspendidaV2?` con el plan de la empresa, y `null` si ya estaba suspendida.",
        "En tu test de `SuspenderHandler`: `Assert.NotNull(anuncio)` y que el plan sea `Basico`.",
      ],
      logro: {
        items: [
          "Dos suspensiones de emp-8 dejan **una sola** fila en `multas`: `900800800 | Basico | 50000`.",
        ],
      },
      tips: [{ k: "nota", texto: "Wolverine no publica un `null`." }],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora"));',
          "await Task.Delay(500);",
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora otra vez"));',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Empresas anuncia el plan",
      piezas: [
        {
          etiqueta: "Tu `SuspenderHandler`, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: rehidrata para LEER el plan de ese momento",
            "public static class SuspenderHandler",
            "{",
            "    public static async Task<EmpresaSuspendidaV2?> Handle(SuspenderEmpresa cmd, IDocumentSession session)",
            "    {",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
            "        if (empresa.Suspendida) return null;   // ya lo estaba: ni hecho ni anuncio",
            "        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));",
            "        return new EmpresaSuspendidaV2(empresa.Nit, cmd.Motivo, empresa.Plan);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "La regla de **Decidir el futuro** se repite aquí, en el handler: los verbos de tu `Empresa` vuelven en **La plantilla**.",
    },
    {
      tipo: "reto",
      titulo: "La mensualidad lee la copia",
      tarea:
        "Cobra la mensualidad de emp-8 con el plan que Facturación guardó en `multas`.",
      pasos: [
        "En `Facturacion`, el comando `CobrarMensualidad(Nit)` y su `MensualidadHandler`: lee `SELECT plan_al_suspender FROM multas` y deja `Mensualidad {nit}: {plan}` en `MundoExterno.Recibidos`.",
        "En tu `Program.cs`, cobra por el bus con la línea de abajo, e imprime `MundoExterno.Recibidos`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mensualidad 900800800: Basico"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "ExecuteScalar()",
          explicacion: "devuelve un solo valor: la primera columna de la primera fila.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: ['await bus.InvokeAsync(new CobrarMensualidad("900800800"));'],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La mensualidad lee la copia",
      piezas: [
        {
          etiqueta: "El comando y su handler, en `Facturacion`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs (ya tiene los using de Npgsql y Wolverine)",
            "public record CobrarMensualidad(string Nit);",
            "",
            "public static class MensualidadHandler",
            "{",
            "    public static void Handle(CobrarMensualidad cmd)",
            "    {",
            "        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "        using var q = c.CreateCommand();",
            '        q.CommandText = "SELECT plan_al_suspender FROM multas WHERE nit = @nit";',
            '        q.Parameters.AddWithValue("nit", cmd.Nit);',
            '        MundoExterno.Recibidos.Add($"Mensualidad {cmd.Nit}: {q.ExecuteScalar()}");',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Pasa el tiempo",
      tarea:
        "Haz que emp-8 pague, se reactive y cambie a Premium, y cobra la mensualidad otra vez.",
      pasos: [
        "En tu `Program.cs`, **debajo** del cobro, el `Append` directo de abajo. Va directo porque reactivar y cambiar el plan no tienen handler en el bus.",
        "Debajo del `Append`, la misma línea del cobro, otra vez. Corre.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mensualidad 900800800: Basico", "Mensualidad 900800800: Basico"],
          tono: "error",
        },
        items: ["Con emp-8 ya en Premium: el dolor, en tu base."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    s.Events.Append("emp-8", new PagoRegistrado(50_000),',
          '        new EmpresaReactivada(), new PlanCambiado("Premium"));',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pasa el tiempo",
      piezas: [
        {
          etiqueta: "Tu `Program.cs`, desde el `Append`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs (ve CobrarMensualidad y MundoExterno porque referencia a Facturacion)",
            "await using (var s = store.LightweightSession())",
            "{",
            '    s.Events.Append("emp-8", new PagoRegistrado(50_000), new EmpresaReactivada(), new PlanCambiado("Premium"));',
            "    await s.SaveChangesAsync();",
            "}",
            'await bus.InvokeAsync(new CobrarMensualidad("900800800"));',
            'Console.WriteLine(string.Join("\\n", MundoExterno.Recibidos));',
          ],
        },
      ],
      nota: "El nombre `plan_al_suspender` avisaba de cuándo era el dato, pero un nombre documenta, no impide.",
    },
    {
      tipo: "reto",
      titulo: "Empresas responde la consulta",
      tarea:
        "Haz que Empresas conteste cuál es el plan **de hoy** de una empresa, a quien se lo pregunte por el bus.",
      pasos: [
        "Quita del `Program.cs` las dos suspensiones y el `Append` a emp-8. En `Contratos`: `ConsultarPlanV1(Nit)` y `PlanActualV1(Nit, Plan)`, cada uno con su `[MessageIdentity]`.",
        "En tu `Localizador`, `static StreamDe(IQuerySession session, string nit)`: lo trae con `LoadAsync` y devuelve su `Stream`, con `?? throw` si el NIT no está.",
        "`ConsultarPlanHandler`, que pide `IQuerySession`: busca el stream con `StreamDe`, rehidrata la empresa y **devuelve** `PlanActualV1`.",
      ],
      logro: { items: ["`plan.Plan` es `Premium`."] },
      tips: [
        {
          k: "nuevo",
          idioma: "InvokeAsync<TRespuesta>",
          explicacion:
            "lo que el handler devuelve vuelve a quien preguntó, y no se publica.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var plan = await bus.InvokeAsync<PlanActualV1>(",
          '    new ConsultarPlanV1("900800800"));',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Empresas responde la consulta (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Contratos`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos: la consulta y su respuesta, planas como los anuncios",
            '[MessageIdentity("empresas.consultar-plan.v1")]',
            "public record ConsultarPlanV1(string Nit);",
            '[MessageIdentity("empresas.plan-actual.v1")]',
            "public record PlanActualV1(string Nit, string Plan);",
          ],
        },
        {
          etiqueta: "En tu clase `Localizador`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: en tu clase Localizador, la lectura de NIT a stream (using Marten;)",
            "public static async Task<string> StreamDe(IQuerySession session, string nit) =>",
            "    (await session.LoadAsync<Localizador>(nit))?.Stream",
            '        ?? throw new InvalidOperationException($"El NIT {nit} no está en el localizador");',
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Empresas responde la consulta (2 de 2)",
      piezas: [
        {
          etiqueta: "El handler de la consulta, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: responde, porque es el dueño del plan (using Contratos; using Marten;)",
            "public static class ConsultarPlanHandler",
            "{",
            "    public static async Task<PlanActualV1> Handle(ConsultarPlanV1 q, IQuerySession session)",
            "    {",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(await Localizador.StreamDe(session, q.Nit))",
            '            ?? throw new InvalidOperationException($"No existe la empresa del NIT {q.Nit}");',
            "        return new PlanActualV1(q.Nit, empresa.Plan);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Preguntar desde el borde",
      tarea:
        "Que el proceso mensual de Facturación le pregunte el plan a Empresas y cobre con la respuesta, sin leer `multas`.",
      pasos: [
        "En `Facturacion`, `ProcesoMensual.Correr(IMessageBus bus, string nit)`. Intenta primero leer ahí con `AggregateStreamAsync<Empresa>`: **no compila**.",
        "`Correr` pregunta con `InvokeAsync<PlanActualV1>` y envía `CobrarMensualidad(nit, plan.Plan)`. El handler deja de leer `multas` y usa el plan que le llega.",
        'En tu `Program.cs`, en vez de enviar `CobrarMensualidad`: `await ProcesoMensual.Correr(bus, "900800800");`',
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mensualidad 900800800: Premium"],
          tono: "ok",
        },
        items: ["`multas` sigue en `Basico`: así era el plan el día de la suspensión."],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Preguntar desde el borde (1 de 2)",
      piezas: [
        {
          etiqueta: "`ProcesoMensual`, en `Facturacion`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/ProcesoMensual.cs: el borde de Facturación",
            "using Contratos;",
            "using Wolverine;",
            "",
            "public static class ProcesoMensual",
            "{",
            "    public static async Task Correr(IMessageBus bus, string nit)",
            "    {",
            "        var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // pregunta al dueño, en el momento",
            "        await bus.InvokeAsync(new CobrarMensualidad(nit, plan.Plan));",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Preguntar desde el borde (2 de 2)",
      piezas: [
        {
          etiqueta: "El comando y su handler, en `Facturacion`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/FacturacionHandler.cs: el handler ya no busca el plan; lo recibe",
            "public record CobrarMensualidad(string Nit, string Plan);",
            "",
            "public static class MensualidadHandler",
            "{",
            '    public static void Handle(CobrarMensualidad cmd) => MundoExterno.Recibidos.Add($"Mensualidad {cmd.Nit}: {cmd.Plan}");',
            "}",
          ],
        },
        {
          etiqueta: "En tu `Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs: dispara el proceso mensual",
            'await ProcesoMensual.Correr(bus, "900800800");',
            'Console.WriteLine(string.Join("\\n", MundoExterno.Recibidos));',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un mes, un solo cobro",
      tarea:
        "Que correr el proceso mensual dos veces el mismo mes cobre una sola mensualidad.",
      pasos: [
        "En `psql`, la tabla `mensualidades(nit, periodo)` con `PRIMARY KEY (nit, periodo)`.",
        "`Correr(bus, nit, periodo)` reserva el mes con `INSERT … ON CONFLICT DO NOTHING`, dentro de una transacción. Si no insertó, no hace nada más.",
        "Confirma la transacción **después** de enviar `CobrarMensualidad`.",
      ],
      logro: {
        items: [
          "Las dos llamadas de abajo dan **una sola** `Mensualidad 900800800: Premium`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await ProcesoMensual.Correr(bus, "900800800", "2026-10");',
          'await ProcesoMensual.Correr(bus, "900800800", "2026-10");',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un mes, un solo cobro (1 de 2)",
      piezas: [
        {
          etiqueta: "En `psql`",
          lenguaje: "sql",
          lineas: [
            "CREATE TABLE mensualidades(nit TEXT NOT NULL, periodo TEXT NOT NULL, PRIMARY KEY (nit, periodo));",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un mes, un solo cobro (2 de 2)",
      piezas: [
        {
          etiqueta: "`ProcesoMensual`, en `Facturacion`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/ProcesoMensual.cs: el borde reserva el mes antes de cobrarlo",
            "using Contratos;",
            "using Npgsql;",
            "using Wolverine;",
            "",
            "public static class ProcesoMensual",
            "{",
            "    public static async Task Correr(IMessageBus bus, string nit, string periodo)",
            "    {",
            "        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "        using var tx = c.BeginTransaction();",
            "        using var reserva = c.CreateCommand();",
            "        reserva.Transaction = tx;",
            '        reserva.CommandText = "INSERT INTO mensualidades(nit, periodo) VALUES(@nit, @periodo) ON CONFLICT (nit, periodo) DO NOTHING";',
            '        reserva.Parameters.AddWithValue("nit", nit);',
            '        reserva.Parameters.AddWithValue("periodo", periodo);',
            "        if (reserva.ExecuteNonQuery() == 0) return;   // ese mes ya tiene su cobro",
            "",
            "        var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // pregunta al dueño, en el momento",
            "        await bus.InvokeAsync(new CobrarMensualidad(nit, plan.Plan));",
            "        tx.Commit();   // la reserva queda solo si el cobro salió",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Si dos corridas del mismo mes van a la vez, la segunda espera en su `INSERT` y no inserta nada: decide la `PRIMARY KEY`.",
    },
    {
      tipo: "rompelo",
      titulo: "El precio de preguntar",
      tarea:
        "Deja a Facturación sin quien conteste, pregunta por un NIT que no existe, y rellena con una constante el plan que le falta al `V1`.",
      pasos: [
        'Comenta el handler de `ConsultarPlanV1` y cobra `"2026-11"`. Luego devuélvelo.',
        'Quita el `?? throw` de `StreamDe` y pregunta por `"000000000"`. Luego vuelve a ponerlo.',
        'A `FacturacionHandler`, un `Handle` del `V1` que llama al del `V2` con plan fijo `"Basico"`. Llámalo a mano por emp-8. Luego bórralo.',
      ],
      logro: {
        terminal: {
          salida: ["IndeterminateRoutesException: Could not determine any valid", "subscribers or local handlers for message type Contratos.ConsultarPlanV1"],
          tono: "error",
        },
        items: [
          "La reserva de noviembre se deshace.",
          'Por `"000000000"` responde un plan **inventado**.',
          "`multas` gana `900800800 | Basico | 50000` para una empresa Premium.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El dato **como era** viaja en el anuncio. El **de hoy** se le pregunta al dueño, o se replica. Nunca la copia huérfana ni la constante.",
      puntos: [
        {
          termino: "Llevar",
          definicion: "El dato como era: en el anuncio, con su fecha en el nombre.",
        },
        {
          termino: "Preguntar",
          definicion: "El de hoy, a veces: al dueño, desde el borde.",
        },
        {
          termino: "Replicar",
          definicion: "El de hoy, todo el tiempo: una copia suscrita.",
        },
        {
          termino: "Claim-check",
          definicion: "El mensaje lleva un tiquete; el contenido grande, aparte.",
        },
      ],
      commit: {
        mensaje: "ES · El contrato lleva lo justo",
        preguntas: [
          "Un dato que lleves en el anuncio y otro que preguntes: ¿qué pasa si guardas el segundo como el primero?",
        ],
      },
      siguiente: {
        seccion: "35 · La réplica suscrita",
        texto:
          "Preguntar ata cada cobro a que Empresas conteste. Una réplica suscrita quita esa atadura, pero también se puede quedar atrás sin un error.",
      },
    },
  ],
};
