// Fuente: workshop-event-sourcing/taller.md, entrada "45 · La configuración viene de afuera".
import type { Seccion } from "./tipos";

export const seccion45: Seccion = {
  numero: 45,
  titulo: "La configuración viene de afuera",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el plazo y la cadena de conexión lleguen **desde afuera del código** (archivo, variable, user-secrets, `/run/secrets`), y que el servicio **no arranque** si falta uno.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "En producción, Accesos tarda más que en tu máquina.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto:
            "¿Cómo le damos **10 segundos** de plazo allá y **5** aquí, con el mismo binario?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Accesos tarda",
      tarea:
        "Simula que Accesos tarda 6 segundos en contestar, y mira qué le pasa al proceso de suspensión.",
      pasos: [
        "En Accesos, que el `Handle` de `RevocarAccesosV1` haga `await Task.Delay(6000);` antes de contestar.",
        "Siembra emp-70 a emp-75 como sembraste emp-10, con la línea de abajo. Bórrala tras arrancar.",
        "Suspende emp-70, espera unos 8 segundos y consulta su proceso, `susp-emp-70-2`.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT version, type FROM mt_events WHERE stream_id = 'susp-emp-70-2' ORDER BY version;",
          salida: [
            "3 | suspension_vencida",
            "4 | revocacion_de_accesos_confirmada",
            "5 | suspension_efectiva",
          ],
          tono: "error",
        },
        items: [
          "Una alarma falsa: vence antes de que Accesos conteste. El plazo es el `5.Seconds()` del código.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'for (var i = 70; i <= 75; i++) Sembrar(s, $"emp-{i}", $"90{i}00000", $"Empresa {i}", "Basico");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El plazo, en un archivo",
      tarea: "Que el plazo salga de `appsettings.json`, no del código.",
      pasos: [
        'Crea `Empresas.Historia/appsettings.json` con `{ "Suspension": { "PlazoEnSegundos": 10 } }`, y la clase `PlazosDeSuspension` con `int PlazoEnSegundos { get; set; }`.',
        "Tras `CreateBuilder`, registra la clase con la línea de abajo.",
        "`SuspenderHandler` recibe `IOptions<PlazosDeSuspension> plazos`, y el `Delay` usa `TimeSpan.FromSeconds(plazos.Value.PlazoEnSegundos)`. En su test, pásale `Options.Create(new PlazosDeSuspension { PlazoEnSegundos = 5 })`.",
      ],
      logro: {
        items: [
          "Suspende emp-71: `susp-emp-71-2` llega a `suspension_efectiva` sin `suspension_vencida`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "la configuración",
          explicacion:
            "junta el archivo, las variables y los argumentos. Si dos traen la misma clave, gana la última leída.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddOptions<PlazosDeSuspension>()",
          '    .BindConfiguration("Suspension");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La variable gana",
      tarea: "Cambia el plazo sin tocar el archivo ni el código.",
      pasos: [
        "Detén el servicio y arráncalo con `Suspension__PlazoEnSegundos=3 dotnet run`.",
        "Suspende emp-72 y consulta su proceso, `susp-emp-72-2`.",
        "En CosmosLens, pon `PlazoSegundos` en 10 en `procesos.json`.",
      ],
      logro: {
        items: [
          "Vuelve `suspension_vencida`: la variable le ganó al archivo, con el mismo binario.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Suspension__PlazoEnSegundos",
          explicacion:
            "la clave `Suspension:PlazoEnSegundos` del archivo, escrita como variable de entorno.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La sección mal escrita",
      tarea:
        "**No lo saltes:** deja piezas que usan las secciones siguientes. Escribe mal el nombre de la sección y mira qué plazo queda.",
      pasos: [
        'En `appsettings.json`, cambia `"Suspension"` por `"Suspencion"`. Arranca con `dotnet run`, sin la variable.',
        "Suspende emp-73 y consulta su proceso.",
      ],
      logro: {
        items: [
          "El servicio arranca sin quejarse.",
          "emp-73 vence aunque el archivo dice 10: nadie llenó `PlazoEnSegundos`, y vale 0.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Que no arranque",
      tarea:
        "Valida el plazo al arrancar, para que un plazo que no llegó no pase callado.",
      pasos: [
        "En `PlazosDeSuspension`, pon `[Range(1, 300)]` sobre `PlazoEnSegundos` (`using System.ComponentModel.DataAnnotations;`).",
        "Al registro, súmale `.ValidateDataAnnotations()` y `.ValidateOnStart()`. Arranca, todavía con la sección mal escrita.",
        "Corrige la sección. En Accesos, quita el `Task.Delay`: que conteste enseguida.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: [
            "… 'PlazoEnSegundos' with the error:",
            "'The field PlazoEnSegundos must be between 1 and 300.'",
          ],
          tono: "error",
        },
        items: ["No arranca, y el error nombra la clave."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddOptions<PlazosDeSuspension>()",
          '    .BindConfiguration("Suspension")',
          "    .ValidateDataAnnotations()",
          "    .ValidateOnStart();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "En el repo, solo la forma",
      tarea:
        "Que la cadena de conexión también venga de afuera: en el repo, la clave vacía.",
      pasos: [
        'En `appsettings.json`, agrega solo la forma: `"ConnectionStrings": { "Postgres": "" }`.',
        "Tras `CreateBuilder`, agrega la fuente `AddKeyPerFile` y cambia la lectura de `CADENA_POSTGRES` por `GetConnectionString(\"Postgres\")`, con su `?? throw`, como abajo.",
      ],
      logro: {
        items: ["Compila, y en el repo no hay ninguna cadena."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "user-secrets",
          explicacion:
            "guarda un valor en tu carpeta de usuario, fuera del repo. El host lo lee solo en `Development`.",
        },
        {
          k: "nuevo",
          idioma: "AddKeyPerFile",
          explicacion:
            "un directorio donde cada archivo es una clave, con `__` donde la clave lleva `:`. Así llega `/run/secrets`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Configuration.AddKeyPerFile(",
          '    builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);',
          'var cadena = builder.Configuration.GetConnectionString("Postgres")',
          '    ?? throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La cadena, en dos lugares",
      tarea:
        "Guarda la cadena en tus user-secrets y en un archivo por clave, y quítala de tu terminal.",
      pasos: [
        "Dentro de `Empresas.Historia`, corre los comandos de abajo.",
        "Arranca con `ASPNETCORE_ENVIRONMENT=Development dotnet run`.",
        "Arranca con `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run`.",
      ],
      logro: {
        items: [
          "El primero dice `Hosting environment: Development`; el segundo, `Production`.",
          "Los dos arrancan sin `CADENA_POSTGRES`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "dotnet user-secrets init",
          'dotnet user-secrets set "ConnectionStrings:Postgres" "$CADENA_POSTGRES"',
          "mkdir -p ~/secretos-empresas",
          'echo "$CADENA_POSTGRES" > ~/secretos-empresas/ConnectionStrings__Postgres',
          "unset CADENA_POSTGRES",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El vacío",
      tarea:
        "Arranca sin ninguna fuente para la cadena: solo queda la clave vacía del archivo.",
      pasos: [
        "Arranca con `dotnet run`, sin `DirectorioDeSecretos`.",
        "Cambia el `?? throw` por la revisión con `string.IsNullOrWhiteSpace` de abajo, y arranca otra vez.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["System.ArgumentNullException: Value cannot be null. (Parameter 'Host')"],
          tono: "error",
        },
        items: [
          "Tu `?? throw` no saltó: `\"\"` no es `null`. Con la revisión, el error dice qué falta.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var cadena = builder.Configuration.GetConnectionString("Postgres");',
          "if (string.IsNullOrWhiteSpace(cadena))",
          '    throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El socio que lee por su cuenta",
      tarea:
        "Facturación todavía lee `CADENA_POSTGRES` del entorno. Que pida su cadena a la configuración del host.",
      pasos: [
        "Arranca con tu directorio de secretos y suspende emp-74. Mira la última dead letter.",
        "Que `Conexion.Cadena` reciba `IConfiguration config`. Pásalo por los handlers de Facturación y por `Planes.Guardar`, `Planes.De` y `ProcesoMensual.Correr`.",
        "Arranca otra vez y suspende emp-75.",
      ],
      logro: {
        terminal: {
          salida: [
            "facturacion.cobrar-multa.v1 | Falta la variable de entorno CADENA_POSTGRES.",
          ],
          tono: "error",
        },
        items: [
          "emp-74 queda `vencida`; emp-75 queda `efectiva`.",
          "Tus tests todavía leen `CADENA_POSTGRES`: en la terminal de `dotnet test`, fíjala.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Lo que cambia de un lugar a otro entra por la **configuración**. En el repo va solo la forma, lo obligatorio se valida al arrancar, y vacío cuenta como nada.",
      puntos: [
        {
          termino: "Configuración",
          definicion:
            "Archivo, variables, user-secrets, `/run/secrets`: gana la última leída.",
        },
        {
          termino: "ValidateOnStart",
          definicion: "Si falta un valor obligatorio, el servicio no arranca.",
        },
        {
          termino: "Vacío es nada",
          definicion: "`\"\"` no es `null`: revísalo con `string.IsNullOrWhiteSpace`.",
        },
      ],
      commit: {
        mensaje: "ES · La configuración viene de afuera",
        preguntas: [
          "¿Qué pasaba con el plazo con la sección mal escrita?",
          "¿Por qué tu `?? throw` no paró la clave vacía?",
        ],
      },
      siguiente: {
        seccion: "46 · Lo que acabas de pedir",
        texto:
          "El POST responde 200 y nada más. Una pantalla que lee enseguida no distingue «todavía no» de «no existe».",
      },
    },
  ],
};
