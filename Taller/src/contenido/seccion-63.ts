// Fuente: workshop-event-sourcing/taller.md, entrada "63 · El comentario que sobrevive".
import type { Seccion } from "./tipos";

export const seccion63: Seccion = {
  numero: 63,
  titulo: "El comentario que sobrevive",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Proteger las líneas cuya ausencia falla **en silencio** con dos cosas: un comentario que dice qué se rompe sin ellas, y un test que se pone rojo si alguien las quita.",
    },
    {
      tipo: "planteamiento",
      titulo: "La limpieza",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Meses después, alguien hace limpieza y encuentra esta línea en tu `AgregarEmpresas`:",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          junto: true,
          lineas: [
            "opts.Policies.UseDurableLocalQueues();   // el consumidor local también entrega DURABLE (sobrevive reinicios)",
          ],
        },
        {
          k: "texto",
          texto:
            "«Casi nunca reiniciamos», piensa, y la quita. Todo compila y los tests pasan.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Qué lo habría frenado?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Sin esa línea",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Un reinicio en el instante justo pierde los pedidos y respuestas que estaban en la cola local, **en memoria**.",
            "No hay excepción, ni log, ni dead letter.",
            "La suspensión se queda con Facturación en `EnCurso`, y nadie sabe por qué.",
          ],
        },
        {
          k: "respuesta",
          texto:
            "El comentario dice lo que la línea hace, no lo que pasa **sin** ella.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Comenta el síntoma",
      tarea:
        "Reescribe el comentario de `UseDurableLocalQueues()` en tu `AgregarEmpresas`: que diga qué se pierde sin la línea, y que no hay error.",
      pasos: [
        "Borra el comentario de hoy, el que dice la mecánica.",
        "Encima de la línea, escribe uno que empiece por `// NO quitar:` y diga qué se rompe sin ella y cómo se nota.",
      ],
      logro: {
        items: [
          "Tu comentario nombra el **síntoma**: qué se pierde, que no hay error y dónde se queda la suspensión.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "📌 La regla: comenta el **síntoma**, no la mecánica. La mecánica ya la dice el nombre del método.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Las otras líneas silenciosas",
      tarea:
        "Busca en tu código otras líneas así: si las quitas, todo compila y los tests pasan, pero algo se rompe sin avisar. Escribe el síntoma de cada una.",
      pasos: [
        "Mira las que pusiste después de un 🔨 que fallaba en silencio.",
        "Revisa tu `AgregarEmpresas` y lo que quedó en tu `Program.cs`.",
        "Al lado de cada línea, anota su síntoma: qué se rompe y cómo se nota.",
      ],
      logro: {
        items: [
          "Tienes al menos dos líneas que fallan en silencio, cada una con su síntoma.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto: "Tienes 5 minutos. Después, las repasamos juntos.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Las que fuiste dejando",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Sin `MultipleHandlerBehavior.Separated`, la falla de un handler se lleva la respuesta del otro.",
            "Con el nombre corto en `OnException<ConcurrencyException>()`, C# elige tu clase, y el choque cae en dead letters en vez de reintentar.",
            "Sin `MapInboundClaims = false`, la política responde 403 a todo token válido.",
            "Con `readonly` en el `HashSet` de referencias, un pago repetido entra dos veces.",
          ],
        },
        {
          k: "respuesta",
          texto: "Ninguna falla al compilar ni en los tests.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El host dentro del test",
      tarea:
        "Crea en `Empresas.Tests` un host de prueba que arranque tu `Program.cs` entero, contra la base `empresas_tests`, sin tus secretos y sin el broker.",
      pasos: [
        "Desde `Empresas.Tests`: `dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 10.0.13`.",
        "`HostDePrueba : WebApplicationFactory<Program>`: su constructor toma `CADENA_POSTGRES`, la apunta a `empresas_tests` (`NpgsqlConnectionStringBuilder`) y fija `ConnectionStrings__Postgres` y `DirectorioDeSecretos=sin-secretos` con `Environment.SetEnvironmentVariable`.",
        'Su `ConfigureWebHost` llama `DisableAllExternalWolverineTransports()`. Declara la colección `"host"` con ese fixture.',
      ],
      logro: {
        items: [
          '`Empresas.Tests` compila con tu `HostDePrueba` y la colección `"host"`.',
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "WebApplicationFactory",
          explicacion:
            "arranca tu `Program.cs` entero en memoria; `CreateClient()` le habla por HTTP.",
        },
        {
          k: "nota",
          texto:
            "Las variables de entorno ganan a tus user-secrets: el host no toca la base de tu servicio.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Lo que le preguntas al host",
      piezas: [
        {
          etiqueta:
            "Al principio de tu clase de tests, las tres piezas, sacadas de `app.Services`:",
          lenguaje: "csharp",
          lineas: [
            "readonly StoreOptions marten = app.Services.GetRequiredService<StoreOptions>();",
            "readonly IWolverineRuntime wolverine = app.Services.GetRequiredService<IWolverineRuntime>();",
            "readonly HandlerGraph handlers = app.Services.GetRequiredService<HandlerGraph>();",
          ],
        },
        {
          etiqueta: "Una pregunta por cada línea que carga peso:",
          lenguaje: "csharp",
          lineas: [
            "// UseDurableLocalQueues()",
            "wolverine.Endpoints.LocalQueueForMessageType(typeof(CobrarMultaV1)).Mode == EndpointMode.Durable",
            "// .UseDurableOutbox()",
            'wolverine.Endpoints.EndpointFor(new Uri("rabbitmq://exchange/empresas"))?.Mode == EndpointMode.Durable',
            "// los dos IncludeAssembly",
            "handlers.CanHandle(typeof(CobrarMultaV1)) && handlers.CanHandle(typeof(RevocarAccesosV1))",
          ],
        },
      ],
      luego: "Sigue en la lámina siguiente: cuatro preguntas más.",
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Lo que le preguntas al host (sigue)",
      piezas: [
        {
          etiqueta: "Las otras cuatro preguntas:",
          lenguaje: "csharp",
          lineas: [
            "// MultipleHandlerBehavior.Separated",
            "wolverine.Options.MultipleHandlerBehavior == MultipleHandlerBehavior.Separated",
            "// la política de concurrencia",
            "((IWithFailurePolicies)wolverine.Options).Failures",
            '    .Any(r => r.Match.Matches(new EventStreamUnexpectedMaxEventIdException("choque")))',
            "// AddAsyncDaemon",
            "marten.Projections.AsyncMode != DaemonMode.Disabled",
            "// la política por defecto",
            '(await app.CreateClient().GetAsync("/empresas/emp-1")).StatusCode == HttpStatusCode.Unauthorized',
          ],
        },
      ],
      luego:
        "Luego escribe un `[Fact]` por pregunta, en la pantalla siguiente.",
    },
    {
      tipo: "reto",
      titulo: "Una pregunta por línea",
      tarea:
        "Escribe un test por cada línea que carga peso: le pregunta al host si la tiene, y si no, muestra el síntoma.",
      pasos: [
        'En `Empresas.Tests`, la clase `LineasQueCarganPeso(HostDePrueba app)`, con `[Collection("host")]` y las tres piezas de `app.Services`.',
        'Un `[Fact]` por pregunta, con `Assert.True(condición, "síntoma")`. El de HTTP lleva `await`: es `async Task`.',
        "Corre `dotnet test` desde `Empresas.Tests`, con `CADENA_POSTGRES` fijada.",
      ],
      logro: {
        items: [
          "`dotnet test` en verde: tus tests de antes y los **siete** nuevos.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El segundo argumento de `Assert.True` es el mensaje que sale cuando falla: escribe ahí el síntoma de tu comentario.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "[Fact]",
          "public void Las_colas_locales_son_durables() =>",
          "    Assert.True(",
          "        wolverine.Endpoints.LocalQueueForMessageType(typeof(CobrarMultaV1)).Mode == EndpointMode.Durable,",
          '        "Sin UseDurableLocalQueues, un reinicio pierde pedidos y respuestas en silencio, "',
          '        + "y la suspensión se queda EnCurso.");',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La limpieza, otra vez",
      tarea:
        "Haz las dos limpiezas tentadoras y mira qué test cae con cada una.",
      pasos: [
        "En tu `AgregarEmpresas`, comenta `opts.Policies.UseDurableLocalQueues();` y corre `dotnet test`. Vuelve a ponerla.",
        "Cambia `OnException<JasperFx.ConcurrencyException>()` por el nombre corto, `OnException<ConcurrencyException>()`, y corre `dotnet test`.",
        "Deshaz el cambio del nombre.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            "Mensaje de error:",
            " Sin UseDurableLocalQueues, un reinicio pierde pedidos y respuestas en silencio, y la suspensión se queda EnCurso.",
          ],
        },
        items: [
          "Sin la línea, compila y cae **solo** `Las_colas_locales_son_durables`.",
          "Con el nombre corto, compila y caen `El_choque_de_concurrencia_se_reintenta` y `CarreraDelPagoTests`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El aporte de vuelta",
      tarea:
        "Formula el título de un issue para Wolverine sobre `UseDurableLocalQueues()`, sin abrirlo.",
      pasos: [
        "Nombra el síntoma que viviste: sin la línea, se pierden mensajes y no hay error.",
        "Pide lo justo. El default no durable puede ser a propósito: durable es más lento.",
      ],
      logro: {
        items: ["Tienes el título del issue, con su síntoma concreto."],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "¿Por qué «al menos advierte cuando la cola local no es durable» es mejor petición que «cambia el default»?",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Una línea que carga peso lleva un comentario con su **síntoma**, y un test que le pregunta al host si la tiene.",
      puntos: [
        {
          termino: "Línea que carga peso",
          definicion:
            "Si la quitas, todo compila y los tests pasan, pero algo se rompe en silencio.",
        },
        {
          termino: "Test del host",
          definicion:
            "Su mensaje es el síntoma. El comentario frena al que lee; el test, también al que no lee.",
        },
        {
          termino: "Usar, mantener, aportar",
          definicion:
            "Si la línea existe por un default de la librería que falla callado, el síntoma se devuelve como issue.",
        },
      ],
      commit: {
        mensaje: "ES · El comentario que sobrevive",
        preguntas: [
          "Elige una línea que falle en silencio y escribe su comentario de síntoma, su `Assert` y el título del issue. ¿Qué tienen en común?",
        ],
      },
      siguiente: {
        seccion: "64 · La plantilla",
        texto:
          "Casi todo el motor nuevo está en su sitio. Ahora toca reunirlo en una forma reusable, la de `Cosmos.BuildingBlocks`.",
      },
    },
  ],
};
