// Fuente: workshop-event-sourcing/taller.md, entrada "52 · El broker de verdad".
import type { Seccion } from "./tipos";

export const seccion52: Seccion = {
  numero: 52,
  titulo: "El broker de verdad",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que `PlanDeEmpresaV1` llegue por **RabbitMQ** a otro proceso, Notificaciones, por el exchange del contexto (`empresas`), lo publique el servicio o el worker. Y que un host sin credenciales del broker **diga cuál le falta**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Notificaciones es otro equipo, en otro proceso, sin nuestros handlers ni nuestra base.",
        },
        {
          k: "texto",
          texto: "Nuestras colas locales viven dentro de nuestro proceso.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Cómo le llega el aviso de un cambio de plan?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El broker en tu máquina",
      tarea:
        "Levanta RabbitMQ con Docker, y deja en el repo solo la forma de sus datos de conexión.",
      pasos: [
        "`docker run -d --name empresas-rabbit -p 5672:5672 rabbitmq:4-management`. Usuario y clave `guest`, solo en tu máquina.",
        "`dotnet add Empresas.Historia package WolverineFx.RabbitMQ`.",
        'En `appsettings.json`, la forma: `"Broker": { "Host": "", "Usuario": "", "Clave": "" }`.',
      ],
      logro: { items: ["`docker ps` muestra `empresas-rabbit`."] },
      tips: [
        {
          k: "nuevo",
          idioma: "exchange, cola y binding",
          explicacion:
            "el broker recibe cada mensaje en un exchange y lo copia a cada cola atada a él. Esa atadura es un binding.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Los datos del broker, afuera",
      tarea:
        "Guarda los valores del broker como guardaste la cadena: en tus user-secrets y en tu directorio de secretos.",
      pasos: ["Desde `Empresas.Historia`, corre los comandos de abajo."],
      logro: {
        items: [
          "Las tres claves `Broker:…` están en tus user-secrets y en `~/secretos-empresas`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'dotnet user-secrets set "Broker:Host" "localhost"',
          'dotnet user-secrets set "Broker:Usuario" "guest"',
          'dotnet user-secrets set "Broker:Clave" "guest"',
          "echo localhost > ~/secretos-empresas/Broker__Host",
          "echo guest > ~/secretos-empresas/Broker__Usuario",
          "echo guest > ~/secretos-empresas/Broker__Clave",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Publica al broker",
      tarea:
        "Que el servicio mande `PlanDeEmpresaV1` a un exchange de RabbitMQ, con el nombre del proceso que publica.",
      pasos: [
        "En `AgregarEmpresas`, al final de tu `AddWolverine`, el código de abajo (`using Wolverine.RabbitMQ;`).",
        "`AutoProvision()` crea al arrancar lo que falta. Con la regla `PublishMessage`, el mensaje va solo al exchange: deja de ir a tus handlers locales.",
      ],
      logro: { items: ["El servicio arranca y se conecta al broker."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var exchange = builder.Environment.ApplicationName;",
          "opts.UseRabbitMq(f =>",
          "{",
          '    f.HostName = builder.Configuration["Broker:Host"];',
          '    f.UserName = builder.Configuration["Broker:Usuario"];',
          '    f.Password = builder.Configuration["Broker:Clave"];',
          "}).AutoProvision();",
          "opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitExchange(exchange);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Notificaciones",
      tarea:
        "Crea el proceso del otro equipo: solo conoce tus contratos, y lee de su propia cola.",
      pasos: [
        "`dotnet new console -o Notificaciones` y `dotnet add Notificaciones reference Contratos`, más los paquetes `WolverineFx.RabbitMQ` y `WolverineFx.RuntimeCompilation`.",
        "En `Notificaciones/Program.cs`, pega el código de la lámina siguiente.",
        "Arranca el servicio en `Development` y, en otra terminal, `dotnet run --project Notificaciones`.",
      ],
      logro: {
        items: ["Notificaciones arranca y escucha `notificaciones.planes`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: 'BindExchange("x").ToQueue("q")',
          explicacion:
            'ata una cola a un exchange. `ListenToRabbitQueue("q")` la escucha.',
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El Program.cs de Notificaciones",
      piezas: [
        {
          etiqueta:
            "Su equipo vio en el broker tu exchange, `Empresas.Historia`, y ató su cola a él:",
          lenguaje: "csharp",
          lineas: [
            "using Contratos; using Microsoft.Extensions.Hosting;",
            "using Wolverine; using Wolverine.RabbitMQ;",
            "var builder = Host.CreateApplicationBuilder();",
            "builder.Services.AddWolverine(opts =>",
            "{",
            "    opts.UseRabbitMq().AutoProvision()",
            '        .BindExchange("Empresas.Historia").ToQueue("notificaciones.planes");',
            '    opts.ListenToRabbitQueue("notificaciones.planes");',
            "});",
            "await builder.Build().RunAsync();",
            "public static class PlanDeEmpresaHandler {",
            "    public static void Handle(PlanDeEmpresaV1 aviso) =>",
            '        Console.WriteLine($"Correo a {aviso.Nit}: tu plan ahora es {aviso.Plan}");',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El alta llega; Facturación, no",
      tarea:
        "Da de alta una empresa y mira quién recibió el anuncio. Luego dale a Facturación su propia cola.",
      pasos: [
        "Da de alta emp-150 (NIT `915000000`), y consulta su fila en `plan_de_empresa`.",
        'En tu función, cambia el `.AutoProvision();` por `.AutoProvision().BindExchange(exchange)` `.ToQueue("facturacion.planes");`',
        'Agrega `opts.ListenToRabbitQueue("facturacion.planes");`',
      ],
      logro: {
        terminal: {
          salida: ["Correo a 915000000: tu plan ahora es Basico"],
          tono: "ok",
        },
        items: [
          "Pero `plan_de_empresa` no trae nada: con la regla, el anuncio ya no va al handler de Facturación.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El cambio del worker",
      tarea: "Cambia un plan con el worker, y mira a dónde fue el anuncio.",
      pasos: [
        "Reinicia el servicio y corre el worker con `emp-150;Premium`.",
        "Mira las ataduras del broker: `docker exec empresas-rabbit rabbitmqctl list_bindings source_name destination_name`.",
      ],
      logro: {
        terminal: {
          salida: [
            "Empresas.Historia   notificaciones.planes",
            "Empresas.Historia   facturacion.planes",
            "Empresas.Worker     facturacion.planes",
          ],
          tono: "error",
        },
        items: [
          "Notificaciones no imprime nada, y ningún log falla. El worker publicó en el exchange de su proceso.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El exchange es del contexto",
      tarea:
        "Que todos los hosts de Empresas publiquen en el mismo exchange, el del contexto: `empresas`.",
      pasos: [
        'En tu función, `const string exchange = "empresas";`. En Notificaciones, `.BindExchange("empresas")`.',
        "Reinicia los dos. Da de alta emp-151 (NIT `915100000`) y corre el worker con `emp-151;Premium`.",
        "Borra los exchanges viejos con los comandos de abajo.",
      ],
      logro: {
        items: [
          "Notificaciones imprime los dos correos de emp-151: el del alta y el del cambio.",
          "`plan_de_empresa` dice Premium para `915100000`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "docker exec empresas-rabbit rabbitmqadmin delete exchange --name Empresas.Historia",
          "docker exec empresas-rabbit rabbitmqadmin delete exchange --name Empresas.Worker",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La clave que falta",
      tarea: "Corre el worker sin la clave del broker, y mira qué dice.",
      pasos: [
        "Quita el archivo `~/secretos-empresas/Broker__Clave` y corre el worker.",
        "Déjalo vacío, con `: > ~/secretos-empresas/Broker__Clave`, y corre otra vez.",
      ],
      logro: {
        terminal: {
          salida: [
            "BrokerInitializationException: Unable to initialize the Broker rabbitmq in time",
            " ---> … (Parameter 'password')",
          ],
          tono: "error",
        },
        items: [
          "Con el archivo vacío: `None of the specified endpoints were reachable`. Ninguno de los dos dice qué falta.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Las credenciales, en una clase",
      tarea: "Que el worker diga qué falta antes de intentar conectarse.",
      pasos: [
        "Crea `CredencialesDelBroker` con `Host`, `Usuario` y `Clave`, cada una obligatoria, como abajo.",
        'Regístrala en `AgregarEmpresas`, como tu plazo: `BindConfiguration("Broker")`, `ValidateDataAnnotations()`, `ValidateOnStart()`.',
        "En `UseRabbitMq`, léela con `Get<CredencialesDelBroker>() ?? new()`. Corre el worker sin la clave; luego devuélvela.",
      ],
      logro: {
        terminal: {
          salida: ["… 'Clave' with the error: 'Falta Broker:Clave.'"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "[Required(ErrorMessage = …)]",
          explicacion:
            'marca una propiedad obligatoria; `GetSection("Broker").Get<T>()` llena la clase.',
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public class CredencialesDelBroker",
          "{",
          '    [Required(ErrorMessage = "Falta Broker:Host.")] public string Host { get; set; } = "";',
          '    [Required(ErrorMessage = "Falta Broker:Usuario.")] public string Usuario { get; set; } = "";',
          '    [Required(ErrorMessage = "Falta Broker:Clave.")] public string Clave { get; set; } = "";',
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Las credenciales, en una clase",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/CredencialesDelBroker.cs`: la sección \"Broker\" de la configuración",
          lenguaje: "csharp",
          lineas: [
            "using System.ComponentModel.DataAnnotations;",
            "",
            "public class CredencialesDelBroker",
            "{",
            '    [Required(ErrorMessage = "Falta Broker:Host.")] public string Host { get; set; } = "";',
            '    [Required(ErrorMessage = "Falta Broker:Usuario.")] public string Usuario { get; set; } = "";',
            '    [Required(ErrorMessage = "Falta Broker:Clave.")] public string Clave { get; set; } = "";',
            "}",
          ],
        },
        {
          etiqueta: "`Empresas.Historia/Configuracion.cs`, junto a tu `PlazosDeSuspension`",
          lenguaje: "csharp",
          lineas: [
            "builder.Services.AddOptions<CredencialesDelBroker>()",
            '    .BindConfiguration("Broker")',
            "    .ValidateDataAnnotations()   // los [Required]",
            "    .ValidateOnStart();          // al arrancar, antes de conectarse",
            'var broker = builder.Configuration.GetSection("Broker").Get<CredencialesDelBroker>() ?? new CredencialesDelBroker();',
          ],
        },
        {
          etiqueta: "En tu `AddWolverine`",
          lenguaje: "csharp",
          lineas: [
            "opts.UseRabbitMq(f => { f.HostName = broker.Host; f.UserName = broker.Usuario; f.Password = broker.Clave; })",
            "    // … y tu .AutoProvision().BindExchange(…), como estaban",
          ],
        },
      ],
      nota: "Las tres van juntas a la conexión, y una clase las lee juntas, por nombre: sus marcas dicen cuál falta.",
    },
    {
      tipo: "reto",
      titulo: "Los tests, sin broker",
      tarea:
        "Que los tests tengan la sección `Broker`, pero que no se conecten a él.",
      pasos: [
        "Corre `dotnet test`: cae con `Falta Broker:Host.`.",
        "En `HostConDaemon`, pon las tres claves del broker en la configuración, como la cadena.",
        "Después de `AgregarEmpresas`, `builder.Services.DisableAllExternalWolverineTransports();`",
      ],
      logro: { items: ["`dotnet test` vuelve a verde."] },
    },
    {
      tipo: "aprendizaje",
      idea: "Un anuncio que cruza procesos sale al **exchange del contexto**, igual en todos sus hosts, y cada interesado lo lee de su cola. Las credenciales son una clase que se valida al arrancar.",
      puntos: [
        {
          termino: "Exchange, cola, binding",
          definicion:
            "Se publica al exchange; cada interesado lee su cola atada.",
        },
        {
          termino: "El exchange del contexto",
          definicion: "`empresas`, no el nombre del proceso que publica.",
        },
        {
          termino: "CredencialesDelBroker",
          definicion: "Se llena por nombre, y sus marcas dicen cuál falta.",
        },
      ],
      commit: {
        mensaje: "ES · El broker de verdad",
        preguntas: [
          "¿Por qué Facturación recibió el cambio del worker y Notificaciones no?",
          "¿Qué decía el error sin la clave, y qué dice ahora?",
        ],
      },
      siguiente: {
        seccion: "53 · Lo que el broker no promete",
        texto:
          "Notificaciones confía en su cola porque `AutoProvision` la crea al arrancar. Con un nombre mal escrito, arranca en verde y no recibe nada.",
      },
    },
  ],
};
