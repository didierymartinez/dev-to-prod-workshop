// Fuente: workshop-event-sourcing/taller.md, entrada "58 · El trabajo que nadie pidió".
import type { Seccion } from "./tipos";

const renombrar = [
  "docker exec empresas-db psql -U postgres -d empresas \\",
  '  -c "ALTER TABLE mensualidades RENAME TO mensualidades_caida;"',
  "# 15 segundos después",
  "docker exec empresas-db psql -U postgres -d empresas \\",
  '  -c "ALTER TABLE mensualidades_caida RENAME TO mensualidades;"',
];

export const seccion58: Seccion = {
  numero: 58,
  titulo: "El trabajo que nadie pidió",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el cobro del mes corra **solo** y **una sola vez** en todo el clúster, que un mes que falla no detenga los siguientes, y que la próxima vuelta se vea en la base.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Un compañero hizo recurrente el cobro: cobra el mes y, **al terminar**, programa la vuelta siguiente.",
        },
        {
          k: "respuesta",
          texto: "¿Qué pasa el día que un mes falla?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El código del compañero",
      tarea:
        "Pega tal cual el cobro recurrente del compañero y arranca el servicio.",
      pasos: [
        "Pega el código de las **tres láminas siguientes**: `CobroDelMes.cs` en dos partes, y el método `Nits` de `Planes`.",
        "Arranca el servicio y mira el log.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mes 2026-10-18 05:14:48: cobrado"],
          tono: "ok",
        },
        items: ["Sale un `cobrado` cada 10 segundos, con otras horas."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "BackgroundService",
          explicacion:
            "corre su `ExecuteAsync` al arrancar el host. Fuera de una petición, `CreateScope()` te da un bus.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "CobroDelMes.cs · el cobro que se reprograma",
      piezas: [
        {
          etiqueta:
            "En `Facturacion/CobroDelMes.cs`, con `using JasperFx.Core;`, `Microsoft.Extensions.Configuration`, `.DependencyInjection`, `.Hosting`, `.Logging` y `Wolverine`:",
          lenguaje: "csharp",
          lineas: [
            "public record CobrarElMes(DateTimeOffset Mes);   // en el taller, un mes dura 10 segundos",
            "",
            "public static class CobroDelMesHandler",
            "{",
            "    public static async Task<DeliveryMessage<CobrarElMes>> Handle(",
            "        CobrarElMes m, IMessageBus bus, IConfiguration config, ILogger log)",
            "    {",
            '        var periodo = m.Mes.ToString("yyyy-MM-dd HH:mm:ss");',
            "        foreach (var nit in Planes.Nits(config))",
            "            await ProcesoMensual.Correr(bus, config, nit, periodo);",
            '        log.LogInformation("Mes {Periodo}: cobrado", periodo);',
            "        return new CobrarElMes(m.Mes.AddSeconds(10))",
            "            .DelayedFor(10.Seconds());   // al final, la vuelta siguiente",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "CobroDelMes.cs · la primera vuelta",
      piezas: [
        {
          etiqueta: "Al final de `Facturacion/CobroDelMes.cs`:",
          lenguaje: "csharp",
          lineas: [
            "public class PrimeraVuelta(IServiceProvider servicios) : BackgroundService",
            "{",
            "    protected override async Task ExecuteAsync(CancellationToken ct)",
            "    {",
            "        using var alcance = servicios.CreateScope();",
            "        await alcance.ServiceProvider.GetRequiredService<IMessageBus>()",
            "            .PublishAsync(new CobrarElMes(DateTimeOffset.UtcNow));",
            "    }",
            "}",
          ],
        },
        {
          etiqueta:
            "En `Empresas.Historia/Configuracion.cs`, al final de `AgregarEmpresas`, después de tu `AddWolverine`:",
          lenguaje: "csharp",
          lineas: ["builder.Services.AddHostedService<PrimeraVuelta>();"],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Los NIT de la réplica",
      piezas: [
        {
          etiqueta: "En `Facturacion/Planes.cs`, dentro de `Planes`:",
          lenguaje: "csharp",
          lineas: [
            "public static List<string> Nits(IConfiguration config)",
            "{",
            "    using var c = new NpgsqlConnection(Conexion.Cadena(config)); c.Open();",
            "    using var q = c.CreateCommand();",
            '    q.CommandText = "SELECT nit FROM plan_de_empresa ORDER BY nit";',
            "    using var filas = q.ExecuteReader();",
            "    var nits = new List<string>();",
            "    while (filas.Read()) nits.Add(filas.GetString(0));",
            "    return nits;",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Un mes falla",
      bloques: [
        {
          k: "texto",
          texto: "Renombra la tabla de las reservas y devuélvele su nombre:",
        },
        { k: "codigo", lenguaje: "bash", junto: true, lineas: renombrar },
        {
          k: "terminal",
          tono: "error",
          salida: [
            '42P01: relation "mensualidades" does not exist',
            "(CobrarElMes) … was moved to the error queue",
          ],
        },
        {
          k: "respuesta",
          texto: "Y no sale ningún mes más.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Tres cadenas",
      bloques: [
        {
          k: "lista",
          marca: "numero",
          items: [
            "Reinicia el servicio.",
            "Desde `Empresas.Historia`, arranca otra copia en el 5001 (abajo).",
            "Corre el worker con `emp-177;Premium` y `acme`.",
          ],
        },
        {
          k: "codigo",
          lenguaje: "sql",
          junto: true,
          lineas: ["ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5001"],
        },
        {
          k: "codigo",
          lenguaje: "sql",
          lineas: [
            "SELECT count(*) FROM wolverine_incoming_envelopes",
            "WHERE status = 'Scheduled' AND message_type = 'CobrarElMes';   -- 3",
          ],
        },
        {
          k: "respuesta",
          texto:
            "Cada empresa paga **tres** mensualidades cada 10 s.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El disparo, aparte del trabajo",
      tarea:
        "Que la vuelta siguiente la programe un disparo que no cobra nada: si un mes falla, falla solo ese mes.",
      pasos: [
        "En `Facturacion/CobroDelMes.cs`, `public record DisparoMensual(DateTimeOffset Mes);` y su handler de abajo.",
        "`CobroDelMesHandler` ya no devuelve nada (`async Task`, sin el `return`), y `PrimeraVuelta` publica un `DisparoMensual`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class DisparoMensualHandler",
          "{",
          "    public static OutgoingMessages Handle(DisparoMensual d) => new()",
          "    {",
          "        new CobrarElMes(d.Mes),                                              // el trabajo de este mes",
          "        new DisparoMensual(d.Mes.AddSeconds(10)).DelayedFor(10.Seconds()),   // el mes siguiente",
          "    };",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un mes falla solo",
      tarea:
        "Comprueba que el mes que falla ya no se lleva a los siguientes. Y mira qué pasa con dos copias.",
      pasos: [
        "Detén las dos copias y arranca **solo** la del 5000.",
        "Renombra la tabla otra vez, y devuélvele su nombre 15 segundos después.",
        "Arranca la copia del 5001 y cuenta los `DisparoMensual` en `Scheduled`.",
      ],
      logro: {
        items: [
          "El mes que falló va a dead letters, y el siguiente sale `cobrado`.",
          "Con las dos copias, el `count(*)` de `DisparoMensual` da **2**: cada arranque suma un disparo.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un cron, uno en todo el clúster",
      tarea:
        "Que el cobro lo dispare un cron de Wolverine, que corre en una sola copia y no se duplica con arranques.",
      pasos: [
        "En `AddWolverine`, el `ScheduleRecurring` de abajo.",
        "Borra `DisparoMensual`, su handler, `PrimeraVuelta` y su `AddHostedService`.",
        "Detén las dos copias y arráncalas otra vez. Al principio sale `No known handler for DisparoMensual`: es normal.",
      ],
      logro: {
        items: [
          "Desde unos 20 s tras arrancar, un `cobrado` cada 10 s en segundos redondos (`…:10`, `…:20`), en **una sola** copia.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "ScheduleRecurring",
          explicacion:
            "un mensaje por cada ocurrencia de un cron de seis campos (el primero, los segundos; mínimo 5 entre ocurrencias). Lo corre un agente en una sola copia.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'opts.Schedules.ScheduleRecurring("cobro-mensual", "*/10 * * * * *",',
          "    ocurrencia => new CobrarElMes(ocurrencia));",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La próxima vuelta, en la base",
      tarea:
        "Con las dos copias corriendo, comprueba que hay una sola vuelta programada y que se ve la próxima.",
      pasos: [
        "Corre el worker con `emp-177;Basico` y `acme`.",
        "Corre las dos consultas de abajo.",
        "Detén la copia que dice `cobrado`.",
      ],
      logro: {
        items: [
          "La primera consulta da **1**.",
          "La segunda da `cobro-mensual` con la próxima vuelta.",
          "Al detener esa copia, **sigue la otra**.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "SELECT count(*) FROM wolverine_incoming_envelopes",
          "  WHERE status = 'Scheduled' AND message_type = 'CobrarElMes';",
          "SELECT schedule_name, next_occurrence FROM wolverine_recurring_messages;",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El mes que nadie cobró",
      tarea: "Apaga el servicio un rato y mira qué meses se cobraron.",
      pasos: [
        "Detén las dos copias, espera 30 segundos y arráncalas otra vez.",
        "Medio minuto después: `SELECT DISTINCT periodo FROM mensualidades ORDER BY periodo DESC LIMIT 5;`",
      ],
      logro: {
        items: ["**Faltan meses**: el cron no rellena lo que se perdió."],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "Si el negocio no puede perder un mes, ¿cobras todo mes pendiente, o vigilas los huecos?",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Un trabajo que se reprograma al terminar **muere en su primer fallo**. El disparo va aparte, y un cron con agente único no se duplica.",
      puntos: [
        {
          termino: "Disparo y trabajo",
          definicion:
            "El disparo programa la vuelta siguiente y no toca nada que falle.",
        },
        {
          termino: "Cron con agente único",
          definicion:
            "Una sola copia programa cada ocurrencia; si se detiene, otra toma su lugar.",
        },
        {
          termino: "Lo perdido",
          definicion: "El cron no rellena lo que se perdió con el servicio caído.",
        },
      ],
      decision:
        "Un trabajo recurrente separa el disparo del trabajo, y lo dispara el cron de Wolverine, con un agente único en el clúster.",
      commit: {
        mensaje: "ES · El trabajo que nadie pidió",
        preguntas: [
          "¿Por qué el mes que falló se llevó a los siguientes en la cadena del compañero, y no en la tuya?",
          "¿Qué trabajo tuyo corre solo, y qué pasa si falla una vez?",
        ],
      },
      siguiente: {
        seccion: "59 · El cobro de cada tenant",
        texto:
          "El cobro corre sin pedido, y por eso sin tenant.",
      },
    },
  ],
};
