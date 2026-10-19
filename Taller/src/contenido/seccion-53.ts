// Fuente: workshop-event-sourcing/taller.md, entrada "53 · Lo que el broker no promete".
import type { Seccion } from "./tipos";

const rabbit = "docker exec empresas-rabbit rabbitmqadmin";

export const seccion53: Seccion = {
  numero: 53,
  titulo: "Lo que el broker no promete",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que la topología la cree la infraestructura y la app no arranque si falta su cola; que Notificaciones no pierda avisos si se cae (**inbox durable**); que el servicio no pierda anuncios con el broker caído (**outbox durable**); y que cada aviso tenga **un solo camino**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "El broker guarda lo que tiene en sus colas.",
        },
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "¿Y si una cola está mal escrita?",
            "¿Si el consumidor se cae a la mitad?",
            "¿Si el broker está caído cuando publicamos?",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La cola mal escrita",
      tarea:
        "Simula un despliegue con un error: Notificaciones escucha una cola con el nombre mal escrito.",
      pasos: [
        'En Notificaciones, cambia solo `ListenToRabbitQueue("notificaciones.planes")` por `"notificaciones.plane"`, sin la `s`. Deja su `BindExchange`.',
        "Arráncala, y corre el worker con `emp-151;Enterprise`.",
        "Mira las colas: `docker exec empresas-rabbit rabbitmqctl list_queues name messages`.",
      ],
      logro: {
        terminal: {
          salida: ["notificaciones.planes   1", "notificaciones.plane    0"],
          tono: "error",
        },
        items: [
          "Arranca sin quejarse, no imprime ningún correo y no da ningún error.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "topologia.sh",
      piezas: [
        {
          etiqueta:
            "La topología de Empresas, como la crea la infraestructura antes de desplegar. Guárdalo en la raíz de tu solución:",
          lenguaje: "bash",
          lineas: [
            `${rabbit} declare exchange --name empresas --type fanout --durable true`,
            `${rabbit} declare exchange --name wolverine-dead-letter-queue \\`,
            "  --type fanout --durable true",
            `${rabbit} declare queue --name wolverine-dead-letter-queue \\`,
            "  --durable true",
            `${rabbit} declare binding --source wolverine-dead-letter-queue \\`,
            '  --destination-type queue --destination wolverine-dead-letter-queue --routing-key ""',
            "for cola in facturacion.planes notificaciones.planes; do",
            `  ${rabbit} declare queue --name $cola --durable true \\`,
            "    --arguments '{\"x-dead-letter-exchange\":\"wolverine-dead-letter-queue\"}'",
            `  ${rabbit} declare binding --source empresas \\`,
            '    --destination-type queue --destination $cola --routing-key ""',
            "done",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La topología, de la infraestructura",
      tarea:
        "Que el exchange, las colas y sus ataduras los cree un script, y que el servicio solo los cree en tu máquina.",
      pasos: [
        "Guarda el script de la lámina anterior como `topologia.sh`, y córrelo con `bash topologia.sh` (en Windows, desde Git Bash o WSL).",
        "En `AgregarEmpresas`, guarda en `rabbit` lo que devuelve `UseRabbitMq`, y pide `AutoProvision()` solo en `Development`, como abajo.",
      ],
      logro: { items: ["El servicio arranca en `Development`."] },
      tips: [
        {
          k: "nuevo",
          idioma: "la topología",
          explicacion:
            "en un despliegue la crea la infraestructura. Sin `AutoProvision`, la app no crea nada, y no arranca si falta su cola.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var rabbit = opts.UseRabbitMq(f => { … });",
          'rabbit.BindExchange(exchange).ToQueue("facturacion.planes");',
          "if (builder.Environment.IsDevelopment()) rabbit.AutoProvision();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Notificaciones no crea nada",
      tarea:
        "Que Notificaciones no cree su cola: si no existe, que no arranque.",
      pasos: [
        "Borra la cola vacía que dejó `AutoProvision`, con el comando de abajo.",
        "A Notificaciones quítale `AutoProvision()` y su `BindExchange`, y arráncala con el nombre todavía mal escrito.",
        "Corrige el nombre y arráncala otra vez.",
      ],
      logro: {
        terminal: {
          salida: ["NOT_FOUND - no queue 'notificaciones.plane' in vhost '/'"],
          tono: "ok",
        },
        items: [
          "Con el nombre bien: `Correo a 915100000: tu plan ahora es Enterprise`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [`${rabbit} delete queue --name notificaciones.plane`],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Notificaciones no crea nada",
      piezas: [
        {
          etiqueta: "`Notificaciones/Program.cs`, en su `AddWolverine`",
          lenguaje: "csharp",
          lineas: [
            "opts.UseRabbitMq();                                                   // la topología la crea la infraestructura",
            'opts.ListenToRabbitQueue("notificaciones.plane");                     // todavía mal escrita',
          ],
        },
      ],
      nota: "Notificaciones termina al arrancar, y su log dice qué cola falta.",
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Varios correos a la vez, y una caída",
      piezas: [
        {
          etiqueta: "En `Notificaciones/Program.cs`, la cola, para tratar varios avisos a la vez:",
          lenguaje: "csharp",
          lineas: ['opts.ListenToRabbitQueue("notificaciones.planes").BufferedInMemory();'],
        },
        {
          etiqueta: "Y el handler: mandar un correo tarda, y con `CAER=si` el proceso muere en el quinto.",
          lenguaje: "csharp",
          lineas: [
            "public static class PlanDeEmpresaHandler",
            "{",
            "    static int enviados;",
            "    public static async Task Handle(PlanDeEmpresaV1 aviso)",
            "    {",
            "        await Task.Delay(1000);",
            '        if (Environment.GetEnvironmentVariable("CAER") == "si" && Interlocked.Increment(ref enviados) == 5)',
            '            Environment.FailFast("Notificaciones se cayó");',
            '        Console.WriteLine($"Correo a {aviso.Nit}: tu plan ahora es {aviso.Plan}");',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Se cayó con los avisos en la mano",
      tarea:
        "Haz caer a Notificaciones a mitad de los correos, y mira cuáles se salvan.",
      pasos: [
        "Con el código de la lámina anterior, arranca `CAER=si dotnet run --project Notificaciones`.",
        "Pon veinte cambios en `cambios.csv` con el comando de abajo, y corre el worker.",
        "Arranca Notificaciones otra vez, sin `CAER`.",
      ],
      logro: {
        terminal: {
          salida: ["Process terminated. Notificaciones se cayó"],
          tono: "error",
        },
        items: [
          "La cola queda en 0, y al rearrancar no sale ningún correo más: se perdieron.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'for i in $(seq 1 10); do echo "emp-151;Basico"; echo "emp-151;Premium"; done > cambios.csv',
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Guardado antes de tratarlo",
      piezas: [
        {
          etiqueta:
            "En `Notificaciones/Program.cs` (`using Microsoft.Extensions.Configuration;` y `using Wolverine.Postgresql;`):",
          lenguaje: "csharp",
          lineas: [
            "var builder = Host.CreateApplicationBuilder();",
            "builder.Configuration.AddKeyPerFile(",
            '    builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);',
            'var cadena = builder.Configuration.GetConnectionString("Postgres");',
            "if (string.IsNullOrWhiteSpace(cadena))",
            '    throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");',
            "builder.Services.AddWolverine(opts =>",
            "{",
            '    opts.PersistMessagesWithPostgresql(cadena, "notificaciones");',
            "    opts.Durability.Mode = DurabilityMode.Solo;",
            "    opts.UseRabbitMq();",
            '    opts.ListenToRabbitQueue("notificaciones.planes").UseDurableInbox();',
            "});",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El inbox durable",
      tarea:
        "Que Notificaciones guarde cada aviso en Postgres antes de confirmarlo al broker, y que la misma caída no pierda ninguno.",
      pasos: [
        "Agrega a Notificaciones los paquetes `WolverineFx.Postgresql` y `Microsoft.Extensions.Configuration.KeyPerFile`, y el código de la lámina anterior.",
        "Arranca con `CAER=si DirectorioDeSecretos=$HOME/secretos-empresas dotnet run --project Notificaciones` y repite los veinte cambios.",
        "Arranca otra vez, sin `CAER`.",
      ],
      logro: {
        items: [
          "Tras la caída, `notificaciones.wolverine_incoming_envelopes` tiene los veinte, en `Incoming`.",
          "Sin `CAER`: `Recovered … incoming envelopes from storage`, y veinte correos. Alguno repetido: es lo esperado.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "UseDurableInbox()",
          explicacion:
            "guarda cada aviso en Postgres antes de confirmarlo al broker. Si el proceso muere, al volver retoma los que no terminó.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El broker caído",
      tarea:
        "Publica un anuncio con el broker detenido, y mira qué queda de él cuando vuelve.",
      pasos: [
        "`docker stop empresas-rabbit`, y da de alta emp-152 (NIT `915200000`).",
        "`docker start empresas-rabbit`, y espera en el log `RabbitMQ connection is recovered successfully`.",
        "Busca `915200000` en `plan_de_empresa`, y cuenta las filas de `wolverine_outgoing_envelopes`.",
      ],
      logro: {
        terminal: {
          salida: [
            "Discarding message Envelope … (Contratos.PlanDeEmpresaV1)",
            "  … after 3 attempts",
          ],
          tono: "error",
        },
        items: [
          "El alta dio 202, pero `plan_de_empresa` no tiene nada para `915200000`, y la tabla da 0.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El outbox durable",
      tarea:
        "Que, con el broker detenido, el anuncio espere en vez de perderse.",
      pasos: [
        "En `AgregarEmpresas`, agrega `.UseDurableOutbox()` al final de la regla de `PlanDeEmpresaV1`.",
        "Reinicia el servicio, detén el broker y da de alta emp-153 (NIT `915300000`). Cuenta las filas de `wolverine_outgoing_envelopes`.",
        "Arranca el broker.",
      ],
      logro: {
        terminal: {
          salida: ["Correo a 915300000: tu plan ahora es Basico"],
          tono: "ok",
        },
        items: [
          "Con el broker detenido, la tabla da 1. Cuando vuelve, sale el correo y la tabla vuelve a 0.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "UseDurableOutbox()",
          explicacion:
            "guarda el mensaje en la transacción del hecho, y lo envía cuando el broker está.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Dos caminos, dos correos",
      tarea:
        "Por si un día se pierde la atadura, manda el aviso también directo a la cola de Notificaciones.",
      pasos: [
        'En `AgregarEmpresas`, junto a la regla del exchange: `opts.PublishMessage<PlanDeEmpresaV1>()` `.ToRabbitQueue("notificaciones.planes");`',
        "Corre el worker con `emp-151;Enterprise`.",
        "Quita esa regla.",
      ],
      logro: {
        items: [
          "Notificaciones imprime el mismo correo dos veces.",
          "Cada mensaje tiene una sola ruta. La atadura la vuelve a declarar `topologia.sh`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El broker guarda sus colas y nada más. Quien envía **guarda antes de enviar**, quien recibe **guarda antes de confirmar**, y cada mensaje va por **un solo camino** a un consumidor que tolera la repetición.",
      puntos: [
        {
          termino: "Topología",
          definicion: "La crea la infraestructura; `AutoProvision`, solo en tu máquina.",
        },
        {
          termino: "Inbox durable",
          definicion: "Guardado antes del ack: una caída no se lo lleva.",
        },
        {
          termino: "Outbox durable",
          definicion: "Guardado con el hecho: sale cuando el broker vuelve.",
        },
      ],
      commit: {
        mensaje: "ES · Lo que el broker no promete",
        preguntas: [
          "¿Por qué la cola durable no salvó los correos?",
          "¿Dónde estaba el plan de emp-153 con el broker caído, y por qué el de emp-152 no estaba en ninguna parte?",
        ],
      },
      siguiente: {
        seccion: "54 · En vivo y serverless",
        texto:
          "La pantalla de soporte todavía tiene que volver a pedir para enterarse. Ahora se entera sola, y miramos qué pasa sin un host siempre vivo.",
      },
    },
  ],
};
