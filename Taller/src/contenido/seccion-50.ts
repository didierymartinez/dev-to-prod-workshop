// Fuente: workshop-event-sourcing/taller.md, entrada "50 · Dos hosts, una configuración".
import type { Seccion } from "./tipos";

const reparto = (desde: number, hasta: number) => [
  `for i in $(seq ${desde} ${hasta}); do`,
  "  p=$((5000 + i % 2))",
  '  curl -s -o /dev/null -X POST http://localhost:$p/empresas -H "Content-Type: application/json" \\',
  '    -d "{\\"empresaId\\":\\"emp-$i\\",\\"nit\\":\\"9${i}00000\\",\\"nombre\\":\\"Empresa $i\\",\\"plan\\":\\"Basico\\"}"',
  "  curl -s -o /dev/null -X POST http://localhost:$p/empresas/emp-$i/suspender",
  "done",
];

export const seccion50: Seccion = {
  numero: 50,
  titulo: "Dos hosts, una configuración",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que todo programa que escribe en el diario arranque con **una sola función de configuración**, `AgregarEmpresas`, y que cada host diga solo su papel: si corre el daemon y si puede cambiar las tablas.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Comercial deja cada noche un archivo con cambios de plan.",
        },
        {
          k: "texto",
          texto:
            "Un compañero escribió un worker copiando de nuestro servicio lo que necesitaba.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Qué puede salir mal con una copia?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Seis empresas y un worker",
      tarea:
        "Da de alta seis empresas y crea el worker del compañero, con su copia de la configuración.",
      pasos: [
        "Con el servicio en `Development`, da de alta emp-100 a emp-105 con el bucle de abajo.",
        "Junto a tus proyectos: `dotnet new console -o Empresas.Worker` y `dotnet add Empresas.Worker reference Empresas.Historia`.",
        "En `Empresas.Worker/Program.cs`, pega la copia de las dos láminas siguientes.",
      ],
      logro: { items: ["`Empresas.Worker` compila."] },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "for i in 100 101 102 103 104 105; do",
          '  curl -s -o /dev/null -X POST http://localhost:5000/empresas -H "Content-Type: application/json" \\',
          '    -d "{\\"empresaId\\":\\"emp-$i\\",\\"nit\\":\\"9${i}00000\\",\\"nombre\\":\\"Empresa $i\\",\\"plan\\":\\"Basico\\"}"',
          "done",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La copia del compañero (1 de 2)",
      piezas: [
        {
          etiqueta: "`Empresas.Worker/Program.cs`, el principio:",
          lenguaje: "csharp",
          lineas: [
            "using JasperFx.Events; using Marten; using Wolverine; using Wolverine.Marten;",
            "using Microsoft.Extensions.Configuration; using Microsoft.Extensions.DependencyInjection;",
            "using Microsoft.Extensions.Hosting;",
            "var builder = Host.CreateApplicationBuilder();",
            "builder.Configuration.AddKeyPerFile(",
            '    builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);',
            'var cadena = builder.Configuration.GetConnectionString("Postgres");',
            "if (string.IsNullOrWhiteSpace(cadena))",
            '    throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");',
            "builder.Services.AddMarten(opts =>",
            "{",
            "    opts.Connection(cadena);",
            "    opts.Events.StreamIdentity = StreamIdentity.AsString;",
            "    Hechos.Registrar(opts);",
            "}).UseLightweightSessions().IntegrateWithWolverine();",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La copia del compañero (2 de 2)",
      piezas: [
        {
          etiqueta: "A continuación, en el mismo archivo:",
          lenguaje: "csharp",
          lineas: [
            "builder.Services.AddWolverine(opts =>",
            "{",
            "    opts.Policies.AutoApplyTransactions();",
            "    opts.Discovery.IncludeAssembly(typeof(CambiarPlanHandler).Assembly);",
            "});",
            "using var host = builder.Build();",
            "await host.StartAsync();",
            "var bus = host.Services.GetRequiredService<IMessageBus>();",
            "foreach (var linea in await File.ReadAllLinesAsync(args[0]))",
            "{",
            "    var campos = linea.Split(';');",
            "    await bus.InvokeAsync(new CambiarPlanDeEmpresa(campos[0], campos[1]));",
            '    Console.WriteLine($"{campos[0]}: plan {campos[1]}");',
            "}",
            "await host.StopAsync();",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Corre el worker",
      tarea:
        "Cambia el plan de emp-100 con el worker, y mira qué quedó en la base.",
      pasos: [
        "Crea `cambios.csv` en la raíz de tu solución, con la línea `emp-100;Premium`.",
        "Desde `Empresas.Worker`: `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv`.",
        "Mira el plan de emp-100 en `mt_doc_empresadetalle` y en `plan_de_empresa`.",
      ],
      logro: {
        terminal: { salida: ["emp-100: plan Premium"], tono: "ok" },
        items: [
          "Pero `mt_doc_empresadetalle` y `plan_de_empresa` siguen en `Basico`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La columna que se fue",
      tarea:
        "Suspende otra empresa con el servicio, después de que corrió el worker.",
      pasos: [
        "Suspende emp-101 por el endpoint, y busca el error en el log del servicio.",
        "Busca `correlation_id` en el log del worker.",
        "Reinicia el servicio y cuenta los hechos con `correlation_id = 'soporte-95'`.",
      ],
      logro: {
        terminal: {
          salida: ['42703: column "correlation_id" does not exist'],
          tono: "error",
        },
        items: [
          "En el log del worker: `drop column correlation_id`.",
          "Al reiniciar, la columna vuelve, pero vacía: `soporte-95` da 0.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Una sola función",
      tarea:
        "Lleva todo lo que arma Marten y Wolverine a una función que llaman los dos hosts.",
      pasos: [
        "En `Empresas.Historia`, la clase `Configuracion` de abajo. Muda a ella el `AddKeyPerFile`, la cadena con su `throw`, `PlazosDeSuspension`, y tus `AddMarten` y `AddWolverine` enteros.",
        "En `Program.cs` se quedan `AddProblemDetails`, `UseExceptionHandler` y el `app.Use`.",
        "En tu `AddWolverine`, un `IncludeAssembly` de `typeof(Configuracion).Assembly`. Llama `builder.AgregarEmpresas();` en los dos `Program.cs`, y borra la copia del worker.",
      ],
      logro: { items: ["Los dos proyectos compilan, y el worker ya no arma Marten."] },
      tips: [
        {
          k: "nuevo",
          idioma: "IHostApplicationBuilder",
          explicacion:
            "la interfaz común del builder web y del de consola. Un método de extensión sobre ella sirve a los dos.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class Configuracion",
          "{",
          "    public static void AgregarEmpresas(this IHostApplicationBuilder builder) { … }",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El worker, con la función",
      tarea:
        "Corre el worker con la misma configuración que el servicio, y cuenta cuántas veces se arma Marten.",
      pasos: [
        "Corre el worker con `emp-100;Enterprise`: no arranca. Dale su propio `appsettings.json`, con la sección `Suspension` del servicio, y córrelo otra vez.",
        'Desde la raíz de tu solución: `grep -rn "AddMarten" --include=*.cs .`',
      ],
      logro: {
        terminal: { salida: ["emp-100: plan Enterprise"], tono: "ok" },
        items: [
          "Sin `schema update`, y `EmpresaDetalle` y `plan_de_empresa` dicen Enterprise.",
          "El `grep` encuentra `Configuracion.cs` y `HostConDaemon`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Dos copias del servicio",
      tarea:
        "Arranca una segunda copia del servicio, como detrás de un balanceador, y reparte empresas entre las dos.",
      pasos: [
        "En otra terminal, desde `Empresas.Historia`, una segunda copia en el 5001: `dotnet run --urls http://localhost:5001`, con `ASPNETCORE_ENVIRONMENT=Development`.",
        "Corre el reparto de emp-106 a emp-115 de abajo.",
      ],
      logro: {
        terminal: {
          salida: ["ProgressionProgressOutOfOrderException"],
          tono: "error",
        },
        items: ["Cada copia corre su daemon, y las dos proyectan las mismas vistas."],
      },
      ejemplo: { lenguaje: "bash", lineas: reparto(106, 115) },
    },
    {
      tipo: "reto",
      titulo: "El daemon, en una sola copia",
      tarea:
        "Que cada host diga si corre el daemon: el servicio en `HotCold`, el worker en `Disabled`.",
      pasos: [
        "Dale a `AgregarEmpresas` el parámetro `DaemonMode daemon`, y pásalo a `AddAsyncDaemon(daemon)`.",
        "El servicio llama con `DaemonMode.HotCold`, el worker con `DaemonMode.Disabled` (`using JasperFx.Events.Daemon;` en los dos).",
        "Arranca las dos copias y repite el reparto con emp-116 a emp-125. Detén la que dice `Started projection agent`.",
      ],
      logro: {
        items: [
          "Ningún `OutOfOrder`, y solo una copia dice `Started projection agent`. Al detenerla, lo dice la otra.",
          "Deja corriendo solo la copia del 5000.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "DaemonMode",
          explicacion:
            "`Solo` (nadie más), `HotCold` (una copia gana un candado y las otras esperan) y `Disabled` (ninguna vista).",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El worker de ayer",
      tarea:
        "Simula un despliegue a medias: el servicio nuevo junto a un worker de ayer, sin la correlación.",
      pasos: [
        "En `AgregarEmpresas`: `CorrelationIdEnabled = daemon != DaemonMode.Disabled;`",
        "Corre el worker con `emp-103;Premium`, y suspende emp-105.",
        "Reinicia el servicio para recuperar la columna.",
      ],
      logro: {
        terminal: {
          salida: ["alter table public.mt_events drop column correlation_id;"],
          tono: "error",
        },
        items: [
          "Suspender emp-105 da 500. Compartir la función no bastó: cada programa deja las tablas como dice su configuración.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Las tablas tienen dueño",
      tarea:
        "Que solo el servicio pueda cambiar las tablas, y que el worker de ayer falle él, sin tocarlas.",
      pasos: [
        "Dale a `AgregarEmpresas` el parámetro `AutoCreate esquema`, y pásalo a `opts.AutoCreateSchemaObjects` (`using JasperFx;`).",
        "El servicio llama con `AutoCreate.CreateOrUpdate`, el worker con `AutoCreate.None`. Corre otra vez el worker de ayer con `emp-103;Premium`.",
        "Al final, vuelve a `CorrelationIdEnabled = true;`.",
      ],
      logro: {
        terminal: {
          salida: [
            "42883: function public.mt_quick_append_events(…) does not exist",
          ],
          tono: "ok",
        },
        items: ["`\\d mt_events` conserva `correlation_id`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "AutoCreateSchemaObjects",
          explicacion:
            "dice si Marten puede crear y cambiar tablas. Con `None` no las toca: si no coinciden, falla.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Todos los hosts que escriben el mismo diario arrancan con **la misma función**, y cada uno solo dice su papel.",
      puntos: [
        {
          termino: "AgregarEmpresas",
          definicion: "Marten, Wolverine y la configuración, en un solo lugar.",
        },
        {
          termino: "DaemonMode",
          definicion: "`HotCold` en el servicio; `Disabled` en un worker que termina.",
        },
        {
          termino: "AutoCreate",
          definicion: "Solo el dueño cambia las tablas; los demás, `None`.",
        },
      ],
      commit: {
        mensaje: "ES · Dos hosts, una configuración",
        preguntas: [
          "¿Por qué el tablero vio el cambio del worker y `EmpresaDetalle` no?",
          "¿Por qué compartir la función no bastó con el worker de ayer?",
        ],
      },
      siguiente: {
        seccion: "51 · El arnés usa la misma configuración",
        texto:
          "El `grep` encontró otro `AddMarten`: el de `HostConDaemon`. Lo que prueban nuestros tests no es lo que corre.",
      },
    },
  ],
};
