// Fuente: workshop-event-sourcing/taller.md, entrada "59 · El cobro de cada tenant".
import type { Seccion } from "./tipos";

export const seccion59: Seccion = {
  numero: 59,
  titulo: "El cobro de cada tenant",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el cobro de cada mes corra **una vez por organización**, con sus empresas y sus planes, y que las tablas SQL de Facturación separen a las organizaciones como Marten.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          texto:
            "Ferretería del Valle (emp-180, NIT 918000000): **Basico** en acme, **Premium** en globex. Con las dos copias corriendo, regístrala y suspéndela con `$ACME` y con `$GLOBEX`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Empresas guarda dos empresas. ¿Cuántas filas guarda Facturación?",
        },
        {
          k: "terminal",
          comando: "SELECT * FROM plan_de_empresa WHERE nit = '918000000';",
          salida: ["918000000 | Basico | 1"],
          tono: "error",
        },
        {
          k: "respuesta",
          texto:
            "Una fila y una multa: el Premium de globex **nunca se cobra**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Las tablas, con su tenant",
      tarea:
        "Recrea la réplica con el tenant en la llave, y agrégale el tenant a la llave de `multas`, en tu base y en la de tus tests.",
      pasos: [
        "Detén las dos copias.",
        "Corre el `for` de la lámina siguiente.",
      ],
      logro: {
        items: [
          "`plan_de_empresa` tiene `PRIMARY KEY (tenant, nit)`.",
          "`multas` tiene la columna `tenant` y `UNIQUE (tenant, suspension_id)`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Las multas no se borran, porque son cobros hechos: las de antes se quedan con el tenant en `null`.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La réplica y las multas, por tenant",
      piezas: [
        {
          etiqueta:
            "En las dos bases (en PowerShell: `foreach ($base in \"empresas\", \"empresas_tests\") { … }`):",
          lenguaje: "bash",
          lineas: [
            "for base in empresas empresas_tests; do docker exec empresas-db psql -U postgres -d $base \\",
            '  -c "DROP TABLE plan_de_empresa;" \\',
            '  -c "CREATE TABLE plan_de_empresa(tenant TEXT NOT NULL, nit TEXT NOT NULL, plan TEXT NOT NULL,',
            '      version BIGINT NOT NULL, PRIMARY KEY (tenant, nit));" \\',
            '  -c "ALTER TABLE multas ADD COLUMN tenant TEXT, DROP CONSTRAINT multas_suspension_id_key,',
            '      ADD UNIQUE (tenant, suspension_id);"; done',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El tenant de lo que se procesa",
      tarea:
        "Crea en `Facturacion` una pieza que dé el tenant del sobre que se está procesando, o lance si no lo trae.",
      pasos: [
        "En `Facturacion/Organizacion.cs`, la clase `Organizacion` de abajo (`using JasperFx.MultiTenancy;` y `using Wolverine;`).",
        "En un handler, el bus que recibe es el del sobre que se procesa.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class Organizacion",
          "{",
          "    public static string De(IMessageBus bus) =>",
          "        bus.TenantId.IsDefaultTenant()",
          '            ? throw new InvalidOperationException("Un trabajo sin tenant no es de nadie.")',
          "            : bus.TenantId!;",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Cada escritura, con su tenant",
      tarea:
        "Que la réplica y las multas guarden el tenant de `Organizacion.De(bus)` en la fila y en su `ON CONFLICT`.",
      pasos: [
        "`PlanesHandler` recibe el `IMessageBus` y le pasa el tenant a `Guardar`, que lo pone en la fila y en `ON CONFLICT (tenant, nit)`.",
        "`Planes.De` saca el tenant de `Organizacion.De(bus)`, y lo usa en su `WHERE` y al llamar a `Guardar`.",
        "El `Handle` de `CobrarMultaV1` recibe el bus, y pone el tenant en la multa y en `ON CONFLICT (tenant, suspension_id)`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nota",
          texto:
            "Si sale `42P10` (no unique constraint matching the ON CONFLICT), la llave y el `ON CONFLICT` no nombran las mismas columnas.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una fila por organización",
      tarea:
        "Registra una empresa con el mismo NIT en las dos organizaciones y comprueba que Facturación guarda las dos.",
      pasos: [
        "Arranca las dos copias.",
        "Registra emp-182 (NIT 918200000) con `$ACME` en Basico y con `$GLOBEX` en Premium.",
        "Suspéndela con los dos tokens.",
      ],
      logro: {
        terminal: {
          comando: "SELECT tenant, nit, plan FROM plan_de_empresa ORDER BY tenant;",
          salida: ["acme   | 918200000 | Basico", "globex | 918200000 | Premium"],
          tono: "ok",
        },
        items: [
          "`multas` tiene `susp-emp-182-2` por 50000 en acme y por 100000 en globex.",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "El cobro dejó de cobrar",
      bloques: [
        {
          k: "codigo",
          lenguaje: "sql",
          lineas: [
            "SELECT exception_message FROM wolverine_dead_letters",
            "WHERE message_type = 'CobrarElMes' ORDER BY sent_at DESC LIMIT 1;",
          ],
        },
        {
          k: "terminal",
          junto: true,
          salida: ["Un trabajo sin tenant no es de nadie."],
          tono: "error",
        },
        {
          k: "respuesta",
          texto: "`Planes.De` pide el tenant, y el sobre del cron **no lo trae**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un cobro por tenant",
      tarea:
        "Que el cron mande un disparo que recorre las organizaciones y manda un `CobrarElMes` por cada una, con su tenant en el sobre.",
      pasos: [
        "En `Planes`, `Tenants(IConfiguration config)`, como tu `Nits`, con `SELECT DISTINCT tenant FROM plan_de_empresa ORDER BY tenant`.",
        "En `Facturacion/CobroDelMes.cs`, otra vez `DisparoMensual` y su handler, de la lámina siguiente.",
        "En el `ScheduleRecurring` de `AgregarEmpresas`: `ocurrencia => new DisparoMensual(ocurrencia)`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "WithTenantId(\"acme\")",
          explicacion:
            "le pone ese tenant al sobre del mensaje que devuelves. Su handler corre como si viniera de un pedido de acme.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Un disparo que recorre las organizaciones",
      piezas: [
        {
          etiqueta: "En `Facturacion/CobroDelMes.cs`:",
          lenguaje: "csharp",
          lineas: [
            "public record DisparoMensual(DateTimeOffset Mes);   // lo manda el cron, sin tenant",
            "",
            "public static class DisparoMensualHandler",
            "{",
            "    public static OutgoingMessages Handle(DisparoMensual d, IConfiguration config)",
            "    {",
            "        var salida = new OutgoingMessages();",
            "        foreach (var tenant in Planes.Tenants(config))",
            "            salida.Add(new CobrarElMes(d.Mes).WithTenantId(tenant));   // un cobro por organización",
            "        return salida;",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El log dice el tenant",
      tarea:
        "Que los logs del cobro y de cada mensualidad digan de qué organización son.",
      pasos: [
        "En `CobroDelMesHandler`, el log dice el `bus.TenantId`, como en la primera línea de abajo.",
        "`MensualidadHandler` recibe el `IMessageBus` y un `ILogger` (`using Microsoft.Extensions.Logging;`), y escribe lo que cobra, como en la segunda.",
        "Arranca las dos copias.",
      ],
      logro: {
        items: [
          "Cada 10 s, el log dice `Mes 2026-10-18 05:26:30 de acme: cobrado`.",
          "Y `Mes 2026-10-18 05:26:30 de globex: cobrado`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'log.LogInformation("Mes {Periodo} de {Tenant}: cobrado", periodo, bus.TenantId);',
          'log.LogInformation("Mensualidad {Nit} de {Tenant}: {Plan}", cmd.Nit, bus.TenantId, cmd.Plan);',
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Globex dice «cobrado», y no paga",
      bloques: [
        {
          k: "terminal",
          salida: [
            "Mensualidad 918200000 de acme: Basico",
            "Mes 2026-10-18 05:26:30 de acme: cobrado",
            "Mes 2026-10-18 05:26:30 de globex: cobrado",
          ],
          tono: "error",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Globex no tiene ninguna `Mensualidad`.",
        },
        {
          k: "respuesta",
          texto:
            "Chocó con la reserva de acme: el mismo NIT en el mismo mes.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La reserva, con su tenant",
      tarea:
        "Recrea `mensualidades` con el tenant en la llave, y que la lista de NIT y la reserva usen el tenant del sobre.",
      pasos: [
        "Detén las dos copias y corre el `for` de abajo.",
        "`CobroDelMesHandler` saca el tenant de `Organizacion.De(bus)` y se lo pasa a `Nits(config, tenant)`, que filtra con `WHERE tenant = @tenant`.",
        "La reserva de `Correr` lleva el tenant de `Organizacion.De(bus)` en la fila y en el `ON CONFLICT`. Arranca las dos copias.",
      ],
      logro: {
        items: [
          "Cada mes, `Mensualidad 918200000 de acme: Basico`.",
          "Y `Mensualidad 918200000 de globex: Premium`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "for base in empresas empresas_tests; do docker exec empresas-db psql -U postgres -d $base \\",
          '  -c "DROP TABLE mensualidades;" \\',
          '  -c "CREATE TABLE mensualidades(tenant TEXT NOT NULL, nit TEXT NOT NULL, periodo TEXT NOT NULL,',
          '      PRIMARY KEY (tenant, nit, periodo));"; done',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La guarda que rellena",
      tarea:
        "Quita la guarda que lanza y el tenant del disparo, y mira qué cobra.",
      pasos: [
        "En `Organizacion.De`, cambia el `throw` por `=> bus.TenantId!;`.",
        "En `DisparoMensualHandler`, quita el `.WithTenantId(tenant)`. Reinicia y espera una vuelta.",
        "Devuélvele a `De` su `throw` y al disparo su `WithTenantId`.",
      ],
      logro: {
        terminal: {
          salida: [
            "Mes … de *DEFAULT*: cobrado",
            "Mes … de *DEFAULT*: cobrado",
          ],
          tono: "error",
        },
        items: ["No sale ninguna `Mensualidad`: nadie pagó, y no hubo error."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un trabajo que nadie pidió **no trae tenant**. Su disparo recorre las organizaciones y manda uno por cada una con `WithTenantId`. Lo que toca datos de una organización toma el tenant del sobre, o lanza.",
      puntos: [
        {
          termino: "WithTenantId",
          definicion: "Le pone el tenant al sobre del mensaje que devuelves.",
        },
        {
          termino: "La llave lleva el tenant",
          definicion:
            "Toda llave que nace de un dato de otro contexto (el NIT, el id de un stream) lleva el tenant.",
        },
      ],
      decision:
        "El disparo manda un trabajo por organización, con `WithTenantId`. La réplica, la reserva y las multas llevan el tenant en su llave.",
      commit: {
        mensaje: "ES · El cobro de cada tenant",
        preguntas: [
          "Si el `SuspensionId` fuera un `Guid`, ¿quitarías el tenant de la llave de `multas`?",
          "¿Quién decide cómo se arma ese id?",
        ],
      },
      siguiente: {
        seccion: "60 · Observar el motor nuevo",
        texto:
          "Para saber la próxima vuelta o qué mes falló, leíste tablas de Wolverine. Todo el estado del servicio vive en tablas así.",
      },
    },
  ],
};
