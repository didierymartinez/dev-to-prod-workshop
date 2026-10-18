// Fuente: workshop-event-sourcing/taller.md, entrada "32 · El outbox".
import type { Seccion } from "./tipos";

export const seccion32: Seccion = {
  numero: 32,
  titulo: "El outbox",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el hecho y su anuncio entren en la misma transacción, con entrega durable y reintento, adoptando **Wolverine** como despachador y como outbox.",
    },
    {
      tipo: "planteamiento",
      titulo: "Un outbox correcto, pero incompleto",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Nuestra bandeja era un outbox correcto. Le faltaba:",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "el ack,",
            "el reintento con backoff,",
            "el dead-letter,",
            "sobrevivir reinicios.",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Cuánto tomaría escribir y probar cada pieza?",
        },
        { k: "respuesta", texto: "Hoy la cambiamos por uno terminado." },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La meta",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: ['await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));'],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "El hecho queda en el diario **y** Facturación recibe el anuncio, en una transacción.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "**Wolverine** es tu despachador y tu outbox. `bus.InvokeAsync(cmd)` es tu `Enviar`.",
        },
        {
          k: "texto",
          texto:
            "Encuentra el `Handle` por el tipo del parámetro, y le pasa la `IDocumentSession`.",
        },
        { k: "respuesta", texto: "Publicar es **devolver** el mensaje." },
      ],
    },
    {
      tipo: "reto",
      titulo: "El host de Wolverine",
      tarea:
        "Agrega Wolverine a `Empresas.Historia` y arranca un host mínimo con Marten enrolado en el outbox.",
      pasos: [
        "`dotnet add Empresas.Historia package WolverineFx.Marten`",
        "`dotnet add Empresas.Historia package WolverineFx.RuntimeCompilation`",
        "En `Program.cs`, el host de las dos láminas siguientes.",
      ],
      logro: { items: ["Compila. Desde aquí, el store de Marten es el del host."] },
      tips: [
        {
          k: "nota",
          texto:
            "Wolverine 6 no trae el compilador en el core: sin `RuntimeCompilation`, no arranca.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El host: Marten, enrolado",
      piezas: [
        {
          etiqueta:
            "En `Program.cs`, después de leer `cadena`. Con `using Microsoft.Extensions.Hosting;` y `using Wolverine.Marten;`:",
          lenguaje: "csharp",
          lineas: [
            "var builder = Host.CreateApplicationBuilder(args);",
            "builder.Services.AddMarten(opts =>",
            "{",
            "    opts.Connection(cadena);",
            "    opts.Events.StreamIdentity = StreamIdentity.AsString;",
            "    Hechos.Registrar(opts);",
            "})",
            ".UseLightweightSessions()",
            ".IntegrateWithWolverine();   // enrola Marten en el outbox",
          ],
        },
      ],
      luego: "Sigue en la lámina siguiente.",
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El host: Wolverine",
      piezas: [
        {
          etiqueta:
            "Justo debajo. Con `using Wolverine;` y `using Microsoft.Extensions.DependencyInjection;`:",
          lenguaje: "csharp",
          lineas: [
            "builder.Services.AddWolverine(opts =>",
            "{",
            "    opts.Policies.AutoApplyTransactions();   // el SaveChanges ocurre solo",
            "    opts.Policies.UseDurableLocalQueues();   // la entrega local, durable",
            "    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);",
            "});",
            "using var host = builder.Build();",
            "await host.StartAsync();",
            "var bus = host.Services.GetRequiredService<IMessageBus>();   // tu Enviar",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El handler que devuelve",
      tarea:
        "Reescribe `SuspenderHandler` como un handler `static` de Wolverine: appendea el hecho y **devuelve** el evento público.",
      pasos: [
        "`SuspenderHandler` `static`, con el `Handle` de abajo.",
        "Rehidrata la empresa con la sesión (`?? throw`, no `!`), appendea `EmpresaSuspendida` y devuelve el público con `empresa.Nit`.",
        "Borra los handlers de instancia, el `Despachador` e `ICommandHandler<T>`.",
      ],
      logro: { items: ["Compila, sin `Despachador`."] },
      tips: [
        {
          k: "nota",
          texto:
            "Con `?? throw`, una empresa que no existe falla ahí mismo, con un mensaje que dice qué falta.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static async Task<Contratos.EmpresaSuspendidaV1> Handle(",
          "    SuspenderEmpresa cmd, IDocumentSession session)",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Facturación escucha",
      tarea:
        "Crea en `Facturacion` el handler que recibe el evento público.",
      pasos: [
        "Muda `MundoExterno` de `Empresas.Historia` a `Facturacion`, sin cambios.",
        "En `Facturacion`, `FacturacionHandler`, como abajo: agrega `suspendida NIT {msg.Nit}`.",
      ],
      logro: { items: ["Compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class FacturacionHandler",
          "{",
          "    public static void Handle(EmpresaSuspendidaV1 msg) =>",
          '        MundoExterno.Recibidos.Add($"suspendida NIT {msg.Nit}");',
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Adiós a la bandeja",
      tarea:
        "Borra tu outbox a mano y lo que quedó comentado, y suspende `emp-7` por el bus.",
      pasos: [
        "En `psql`, `DROP TABLE bandeja_salida;`. Borra `EntregarPendientes`, `ReclamarYEntregar` (y su test `ElMensajeYLaCola`, si lo escribiste), `viejo`, `EventStream` y `AbrirStream`.",
        "Borra el bloque de Marten con su `DocumentStore.For`: el store es el del host. `Sembrar` se queda; `CorrerProyector` sigue comentado.",
        "En `Program.cs`, lo de abajo. Corre `dotnet run`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["suspendida NIT 900123"],
          tono: "ok",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));',
          "await Task.Delay(500);   // el anuncio llega después del commit",
          'Console.WriteLine(string.Join("\\n", MundoExterno.Recibidos));',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El anuncio, en un test",
      tarea:
        "Publicar es devolver: prueba el anuncio llamando al handler con una sesión, sin bus ni cola.",
      pasos: [
        "En `Empresas.Tests/SuspenderHandlerTests.cs`, su propio `DocumentStore.For` contra `empresas_tests`, con `StreamIdentity.AsString` y `Hechos.Registrar`.",
        'Siembra con `StartStream` y `SaveChangesAsync` un `$"emp-test-{Guid.NewGuid()}"` con NIT `900555`.',
        "Llama a `SuspenderHandler.Handle` con esa sesión y afirma NIT y motivo, como abajo.",
      ],
      logro: {
        items: [
          "El test pasa.",
          'Si el `return` lleva `cmd.EmpresaId`, cae: `Actual: "emp-test-…"`.',
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var anuncio = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);',
          'Assert.Equal("900555", anuncio.Nit);',
          'Assert.Equal("mora", anuncio.Motivo);',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El nombre del mensaje",
      tarea:
        "Fija en el contrato el nombre con que Wolverine guarda el mensaje.",
      pasos: [
        "`dotnet add Contratos package WolverineFx`",
        "Sobre `EmpresaSuspendidaV1`, el atributo de abajo (`using Wolverine.Attributes;`). Corre `dotnet run`.",
        "En `psql`: `SELECT message_type, status FROM wolverine_incoming_envelopes;`",
      ],
      logro: {
        terminal: {
          salida: ["empresas.empresa-suspendida.v1 | Handled"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "El nombre del mensaje",
          explicacion:
            "también es un contrato. Regla desde hoy: cada contrato nuevo lleva el suyo.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: ['[MessageIdentity("empresas.empresa-suspendida.v1")]'],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Publicar a mano, confirmar a mano",
      tarea:
        "Rompe la atomicidad desde el handler, y mira qué entra y qué no.",
      pasos: [
        "Pídele al `Handle` un `IMessageBus bus`. Publica con `bus.PublishAsync` y lanza justo después.",
        "Ahora pon un `await session.SaveChangesAsync()` a mano y lanza **antes** del `PublishAsync`.",
        "Quita ese `SaveChangesAsync` y deja el handler con su `return`.",
      ],
      logro: {
        items: [
          "Publicar y lanzar: ni hecho ni anuncio.",
          "Con el `SaveChangesAsync` a mano: `emp-7` gana un hecho y el anuncio no sale.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Envuelve el `InvokeAsync` en un `try/catch` que escriba la excepción, para seguir mirando.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Sin la config",
      tarea: "Quita, de a una, las dos líneas que atan el hecho a su anuncio.",
      pasos: [
        "Quita `AutoApplyTransactions()` y corre.",
        "Devuélvela, quita `IntegrateWithWolverine()` y corre.",
        "Devuélvela.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["InvalidServiceLocationException"],
        },
        items: [
          "Sin `AutoApplyTransactions()`: llega el anuncio y no el hecho.",
          "Sin `IntegrateWithWolverine()`: la excepción de arriba, y nada entra.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Publicar es **devolver**: el mensaje entra en la transacción del hecho, con un nombre fijo, y un `SaveChangesAsync` a mano dentro del handler rompe esa atomicidad.",
      puntos: [
        {
          termino: "Wolverine",
          definicion:
            "Tu despachador y tu outbox: `InvokeAsync` es tu `Enviar`, con entrega durable.",
        },
        {
          termino: "Cascading",
          definicion: "Lo que devuelve un handler se publica.",
        },
        {
          termino: "[MessageIdentity]",
          definicion: "El nombre del mensaje en la cola, fijo en el contrato.",
        },
      ],
      decision:
        "El handler no confirma a mano: Wolverine confirma el hecho y sus mensajes juntos, al final. Cada contrato de `Contratos` lleva su `[MessageIdentity]`, y un test afirma el mensaje que devuelve el handler.",
      commit: {
        mensaje: "ES · El outbox",
        preguntas: [
          "¿Qué le faltaba a tu bandeja, y cómo reconoces tu `Despachador` en Wolverine?",
        ],
      },
      siguiente: {
        seccion: "33 · Llegó dos veces",
        texto:
          "El outbox entrega al menos una vez: si cae entre entregar y marcar, Facturación recibe el anuncio dos veces.",
      },
    },
  ],
};
