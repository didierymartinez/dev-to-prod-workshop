// Fuente: workshop-event-sourcing/taller.md, entrada "35 · La réplica suscrita".
import type { Seccion } from "./tipos";

export const seccion35: Seccion = {
  numero: 35,
  titulo: "La réplica suscrita",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que Facturación cobre con **su propia copia** de los planes, que esa copia se entere de cada cambio, y que nunca cobre con un plan que no tiene.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Si Empresas se cae, hoy el mes **no se cobra**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Con una copia propia, Facturación cobra igual.",
        },
        {
          k: "respuesta",
          texto: "Pero esa copia puede fallar de cuatro formas, y ninguna lanza un error.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Cuatro formas de fallar, sin error",
      bloques: [
        {
          k: "lista",
          marca: "numero",
          porItem: true,
          items: [
            "La tabla nace hoy, y emp-8 cambió de plan **antes**.",
            "Una empresa que no se anunció no tiene fila: `null`.",
            "Se anuncia el registro, pero **no los cambios**.",
            "Un anuncio viejo **pisa** al nuevo.",
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          texto: "Las vas a provocar en el Rómpelo.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La versión en el anuncio",
      tarea:
        "Dale a tu `Empresa` la versión de su stream, y haz que registrar una empresa anuncie su plan con esa versión.",
      pasos: [
        "En tu `Program.cs`, quita las corridas del proceso mensual: deja host, `store`, `bus` y `Sembrar`. A tu `Empresa`, `public long Version { get; private set; }`.",
        'En `Contratos`: `PlanDeEmpresaV1(Nit, Plan, long Version)`, con `[MessageIdentity("empresas.plan-de-empresa.v1")]`.',
        "En `Empresas.Historia`, el comando `RegistrarEmpresa(EmpresaId, Nit, Nombre, Plan)` y su `RegistrarEmpresaHandler`: hace lo de tu `Sembrar` y devuelve el anuncio con versión 1.",
      ],
      logro: { items: ["Compila, y el anuncio sale con versión 1: el stream nace con un hecho."] },
      tips: [
        {
          k: "nuevo",
          idioma: "public long Version { get; private set; }",
          explicacion:
            "Marten la llena al rehidratar con la versión del stream. Solo crece.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La versión en el anuncio",
      piezas: [
        {
          etiqueta: "En `Contratos`, el anuncio; en `Empresas.Historia`, el comando y la `Version` de tu `Empresa`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos: un solo anuncio para el registro y los cambios",
            '[MessageIdentity("empresas.plan-de-empresa.v1")]',
            "public record PlanDeEmpresaV1(string Nit, string Plan, long Version);",
            "",
            "// Empresas.Historia: el comando nuevo, junto a los otros, y la versión en tu Empresa",
            "public record RegistrarEmpresa(string EmpresaId, string Nit, string Nombre, string Plan);",
            "public long Version { get; private set; }   // en tu Empresa: Marten la llena al rehidratar",
          ],
        },
        {
          etiqueta: "El handler del registro, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia: registrar y cambiar el plan anuncian el plan vigente (using Contratos; using Marten;)",
            "public static class RegistrarEmpresaHandler",
            "{",
            "    public static PlanDeEmpresaV1 Handle(RegistrarEmpresa cmd, IDocumentSession session)",
            "    {",
            "        session.Insert(new Localizador { Id = cmd.Nit, Stream = cmd.EmpresaId });",
            "        session.Events.StartStream<Empresa>(cmd.EmpresaId, new EmpresaRegistrada(cmd.Nit, cmd.Nombre, cmd.Plan));",
            "        return new PlanDeEmpresaV1(cmd.Nit, cmd.Plan, 1);   // el stream nace con un hecho",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cambiar el plan también anuncia",
      tarea:
        "Haz que cambiar el plan anuncie el plan vigente con una versión mayor que la del registro.",
      pasos: [
        "`CambiarPlanHandler`, para `CambiarPlanDeEmpresa`: `ReglaDeNegocioException` si está suspendida; `Append` con `empresa.Version + 1`; devuelve el anuncio con esa versión.",
        "En `Empresas.Tests`, una clase nueva, `PlanDeEmpresaTests`, armada como `SuspenderHandlerTests`, con id y NIT nuevos por `Guid`, y el test de abajo.",
        "Cambia el `return` para que anuncie `empresa.Version`, la leída: el test **cae**. Vuelve a la versión nueva.",
      ],
      logro: { items: ["El test pasa, y cae si el cambio anuncia la versión leída."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var alta = RegistrarEmpresaHandler.Handle(new RegistrarEmpresa(id, nit, "Prueba", "Basico"), session);',
          "await session.SaveChangesAsync();",
          'var cambio = await CambiarPlanHandler.Handle(new CambiarPlanDeEmpresa(id, "Premium"), session);',
          'Assert.Equal("Premium", cambio.Plan);',
          "Assert.True(cambio.Version > alta.Version);",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Cambiar el plan también anuncia",
      piezas: [
        {
          etiqueta: "El handler del cambio de plan, en `Empresas.Historia`",
          lenguaje: "csharp",
          lineas: [
            "public static class CambiarPlanHandler",
            "{",
            "    public static async Task<PlanDeEmpresaV1> Handle(CambiarPlanDeEmpresa cmd, IDocumentSession session)",
            "    {",
            "        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)",
            '            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");',
            '        if (empresa.Suspendida) throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");',
            "        var version = empresa.Version + 1;   // la que tendrá el stream tras el Append",
            "        session.Events.Append(cmd.EmpresaId, version, new PlanCambiado(cmd.NuevoPlan));",
            "        return new PlanDeEmpresaV1(empresa.Nit, cmd.NuevoPlan, version);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Si alguien escribió entre tu lectura y tu `Append`, choca, y no sale un anuncio con una versión falsa.",
    },
    {
      tipo: "reto",
      titulo: "La réplica guarda lo más nuevo",
      tarea:
        "Haz que Facturación guarde en una tabla suya el último plan de cada empresa, sin que un anuncio viejo pise uno nuevo.",
      pasos: [
        "En `psql`, la tabla `plan_de_empresa(nit PRIMARY KEY, plan, version BIGINT)`. No la llames `planes`: ese nombre ya es tu catálogo.",
        "En `Facturacion`, la clase `Planes` con `Guardar(nit, plan, version)`: un `INSERT … ON CONFLICT (nit) DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version WHERE plan_de_empresa.version < EXCLUDED.version`.",
        "`PlanesHandler`, el handler de `PlanDeEmpresaV1`, que llama a `Guardar`.",
      ],
      logro: { items: ["Compila. La prueba va en la pantalla siguiente."] },
      tips: [
        {
          k: "nuevo",
          idioma: "EXCLUDED · WHERE",
          explicacion:
            "`EXCLUDED` es la fila que intentó entrar. El `WHERE` final deja actualizar solo si es más nueva.",
        },
        {
          k: "nota",
          texto: "La clase que recibe mensajes termina en `Handler`: `Planes` no recibe nada.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La réplica guarda lo más nuevo (1 de 2)",
      piezas: [
        {
          etiqueta: "En `psql`",
          lenguaje: "sql",
          lineas: [
            "CREATE TABLE plan_de_empresa(nit TEXT PRIMARY KEY, plan TEXT NOT NULL, version BIGINT NOT NULL);",
          ],
        },
        {
          etiqueta: "`Planes`, en `Facturacion`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/Planes.cs: la réplica de Facturación (using Contratos; using Npgsql;)",
            "public static class Planes",
            "{",
            "    public static void Guardar(string nit, string plan, long version)",
            "    {",
            "        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            '        cmd.CommandText = "INSERT INTO plan_de_empresa(nit, plan, version) VALUES(@nit, @plan, @version) " +',
            '            "ON CONFLICT (nit) DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version " +',
            '            "WHERE plan_de_empresa.version < EXCLUDED.version";   // lo viejo no pisa lo nuevo',
            '        cmd.Parameters.AddWithValue("nit", nit);',
            '        cmd.Parameters.AddWithValue("plan", plan);',
            '        cmd.Parameters.AddWithValue("version", version);',
            "        cmd.ExecuteNonQuery();",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La réplica guarda lo más nuevo (2 de 2)",
      piezas: [
        {
          etiqueta: "Y su handler, en el mismo `Planes.cs`",
          lenguaje: "csharp",
          lineas: [
            "public static class PlanesHandler",
            "{",
            "    public static void Handle(PlanDeEmpresaV1 msg) => Planes.Guardar(msg.Nit, msg.Plan, msg.Version);",
            "}",
          ],
        },
      ],
      nota: "La réplica no usa `procesados`: guardar el mismo anuncio dos veces deja lo mismo, y el `WHERE` descarta lo atrasado.",
    },
    {
      tipo: "reto",
      titulo: "El alta llega tarde",
      tarea:
        "Registra y cambia de plan una empresa nueva por el bus, y entrega a mano su alta otra vez, tarde.",
      pasos: [
        "En tu `Program.cs`, el bloque de abajo.",
        "Córrelo **una vez** y quita esas líneas: registrar emp-25 otra vez lanza `ExistingStreamIdCollisionException`.",
      ],
      logro: {
        items: ["`SELECT * FROM plan_de_empresa` → `902500000 | Premium | 2`"],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new RegistrarEmpresa("emp-25", "902500000", "Vidrios del Cauca", "Basico"));',
          'await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-25", "Premium"));',
          "await Task.Delay(500);   // los anuncios llegan por la cola",
          'PlanesHandler.Handle(new PlanDeEmpresaV1("902500000", "Basico", 1));   // el alta, tarde',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Sin fila, se pregunta",
      tarea:
        "Que Facturación saque el plan de hoy de su réplica y, si no tiene fila, se lo pregunte a Empresas y lo guarde.",
      pasos: [
        "`Planes.De(IMessageBus bus, string nit)`: con fila, devuelve el plan; sin fila, pregunta con `InvokeAsync<PlanActualV1>`, guarda la respuesta y la devuelve.",
        "`PlanActualV1` gana `long Version` (sigue siendo `V1`), y tu `ConsultarPlanHandler` le pasa `empresa.Version`.",
        'Tu `ProcesoMensual.Correr` usa `Planes.De`. En `Program.cs`: `await ProcesoMensual.Correr(bus, "900800800", "2026-12");`',
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mensualidad 900800800: Premium"],
          tono: "ok",
        },
        items: [
          "`plan_de_empresa` gana `900800800 | Premium | 5`: la versión de `mt_streams`.",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Sin fila, se pregunta (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Contratos`, y en tu `ConsultarPlanHandler`",
          lenguaje: "csharp",
          lineas: [
            "// Contratos: la respuesta gana la versión",
            '[MessageIdentity("empresas.plan-actual.v1")]',
            "public record PlanActualV1(string Nit, string Plan, long Version);",
            "",
            "// Empresas.Historia: en ConsultarPlanHandler",
            "return new PlanActualV1(q.Nit, empresa.Plan, empresa.Version);",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Sin fila, se pregunta (2 de 2)",
      piezas: [
        {
          etiqueta: "En `Planes`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/Planes.cs: el único lugar donde Facturación saca el plan de hoy (using Wolverine; por IMessageBus)",
            "public static async Task<string> De(IMessageBus bus, string nit)",
            "{",
            "    using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();",
            "    using var q = c.CreateCommand();",
            '    q.CommandText = "SELECT plan FROM plan_de_empresa WHERE nit = @nit";',
            '    q.Parameters.AddWithValue("nit", nit);',
            "    var plan = (string?)q.ExecuteScalar();",
            "    if (plan is not null) return plan;   // la réplica lo sabe",
            "",
            "    var r = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // no lo sabe: le pregunta al dueño",
            "    Guardar(r.Nit, r.Plan, r.Version);",
            "    return r.Plan;",
            "}",
          ],
        },
        {
          etiqueta: "En `ProcesoMensual.Correr`",
          lenguaje: "csharp",
          lineas: [
            "// Facturacion/ProcesoMensual.cs: dentro de Correr, después de reservar el mes",
            "var plan = await Planes.De(bus, nit);",
            "await bus.InvokeAsync(new CobrarMensualidad(nit, plan));",
          ],
        },
      ],
      nota: "Quien en Facturación necesite el plan de hoy lo pide a `Planes.De`; nadie más lee `plan_de_empresa` con su propio `SELECT`.",
    },
    {
      tipo: "rompelo",
      titulo: "La empresa que nadie anunció",
      tarea:
        "Con Empresas sin contestar, cobra a una empresa con fila en la réplica y a otra sin fila. Luego haz que la réplica confíe en su tabla.",
      pasos: [
        'Siembra emp-26 con `Sembrar` (no anuncia): `"emp-26", "902600000", "Cerámicas del Huila", "Basico"`. Comenta tu `ConsultarPlanHandler`.',
        'Cobra `"2026-12"` a `"902500000"` y luego a `"902600000"`.',
        "Devuelve el handler, quita la siembra, cambia `if (plan is not null) return plan;` por `return plan!;` y cobra otra vez a emp-26. Al terminar, devuelve el `if`.",
      ],
      logro: {
        items: [
          "emp-25 cobra `Premium` sin preguntarle a nadie.",
          "emp-26 falla con `IndeterminateRoutesException`.",
          "Con `return plan!;` sale `Mensualidad 902600000: `, **sin plan**.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El cambio que nadie oyó",
      tarea:
        "Cambia un plan sin pasar por el handler, y deja que un anuncio viejo llegue después del nuevo.",
      pasos: [
        'Un `Append` directo de `PlanCambiado("Enterprise")` a emp-25, y cobra `"2027-01"`. Luego quita el `Append`.',
        'Quita el `WHERE` de `Guardar` y entrega a mano `PlanDeEmpresaV1("999", "Premium", 2)` y después `("999", "Basico", 1)`.',
        "Vuelve a poner el `WHERE` y borra esa fila: `DELETE FROM plan_de_empresa WHERE nit = '999';`.",
      ],
      logro: {
        items: [
          "Empresas dice Enterprise; la réplica sigue en `Premium | 2`, y cobra Premium.",
          "Sin el `WHERE`: `999 | Basico | 1`. El viejo pisó al nuevo.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El dueño anuncia **cada cambio** con una versión que solo crece. La réplica guarda solo lo más nuevo, y sin fila **pregunta o falla**.",
      puntos: [
        {
          termino: "Réplica suscrita",
          definicion: "Una copia que el dueño mantiene al día con sus anuncios. Va atrás mientras el anuncio viaja.",
        },
        {
          termino: "Versión del stream",
          definicion: "Cuántos hechos tiene: solo crece, y ordena los anuncios de una empresa.",
        },
        {
          termino: "Sin fila",
          definicion: "Se pregunta al dueño o se falla. Nunca se cobra con un vacío.",
        },
      ],
      decision:
        "El dueño anuncia cada cambio, también el registro, con una versión que solo crece; la réplica guarda lo más nuevo, y sin fila pregunta o falla. Solo `Planes.De` saca el plan de hoy.",
      commit: {
        mensaje: "ES · La réplica suscrita",
        preguntas: [
          "¿Qué dato replicarías, qué anuncio lo mantiene, qué versión lo ordena y qué hace tu copia sin fila?",
        ],
      },
      siguiente: {
        seccion: "36 · Dos respuestas, ningún dueño",
        texto:
          "Suspender ahora pide que Facturación cobre y que Accesos corte. ¿Cumplieron los dos?",
      },
    },
  ],
};
