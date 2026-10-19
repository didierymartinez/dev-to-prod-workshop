// Fuente: workshop-event-sourcing/taller.md, entrada "67 · La plantilla dentro del handler".
import type { Seccion } from "./tipos";

export const seccion67: Seccion = {
  numero: 67,
  titulo: "La plantilla dentro del handler",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Usar la plantilla dentro de los handlers de Wolverine: el handler **solo decide**, y sus hechos y sus mensajes entran en **una sola transacción**, la que Wolverine confirma al final.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "La plantilla confirma con `CommitAsync`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Dentro de un handler ya confirma Wolverine, al final del mensaje.",
        },
        {
          k: "respuesta",
          texto:
            "Si el handler llama a `CommitAsync`, ¿cuántas transacciones hay?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El handler con CommitAsync",
      tarea:
        "Pasa tu `SuspenderHandler` a la plantilla, como en `ComoUsarLaPlantilla`, con una falla justo después de confirmar.",
      pasos: [
        "En `SuspenderHandler`: `var uow = new MartenUnitOfWork(session);`, `uow.Cargar<Empresa>(cmd.EmpresaId)` sin `?? throw`, `empresa.Suspender(cmd.Motivo, suspensionId)` y `uow.Registrar(SuspensionDeEmpresa.Solicitar(…))`.",
        "Luego `await uow.CommitAsync();` y, justo después, `throw new InvalidOperationException(\"falla después de confirmar\");`",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
    },
    {
      tipo: "reto",
      titulo: "Dos empresas activas",
      tarea:
        "Siembra dos empresas activas de acme: emp-46 para ver la falla, y emp-47 para más adelante.",
      pasos: [
        "En `Program.cs`, entre `builder.Build()` y `app.Run()`, el código de abajo.",
        "Arranca el servicio una vez y quita la siembra.",
      ],
      logro: { items: ["El servicio arranca con emp-46 y emp-47 sembradas."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await using (var s = store.LightweightSession("acme"))',
          "{",
          '    Sembrar(s, "emp-46", "904600000", "Ferretería Andina", "Basico");',
          '    Sembrar(s, "emp-47", "904700000", "Vivero del Sur", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Mira lo que quedó",
      tarea:
        "Suspende emp-46 y mira qué quedó en el diario y qué en Facturación.",
      pasos: [
        'Corre `curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-46/suspender`.',
        "En `psql`: `SELECT stream_id, version, type FROM mt_events` `WHERE stream_id IN ('emp-46', 'susp-emp-46-2')` `ORDER BY seq_id;`",
        "Y `SELECT count(*) FROM multas WHERE nit = '904600000';`",
      ],
      logro: {
        items: [
          "`curl` responde `500`.",
          "En el diario: `empresa_registrada`, `suspension_solicitada` y `empresa_suspendida`.",
          "En `multas`: `0`.",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Los hechos quedaron, los pedidos no",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "`CommitAsync` es un `SaveChangesAsync` a mano.",
            "Lo que el handler devuelve entra al outbox **después**, en otra transacción.",
            "Quitar el `CommitAsync` tampoco sirve: la unidad pasa los hechos a la sesión dentro de él.",
          ],
        },
        {
          k: "respuesta",
          texto: "Sin él, saldrían los pedidos sin los hechos.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Lo que Wolverine escribe por ti",
      piezas: [
        {
          etiqueta:
            "La clase que Wolverine genera para `SuspenderEmpresa`, resumida:",
          lenguaje: "csharp",
          lineas: [
            "await using var documentSession = _outboxedSessionFactory.OpenSession(context);   // la sesión del mensaje",
            "var martenUnitOfWork = new MartenUnitOfWork(documentSession);",
            "var outgoing1 = await SuspenderHandler.Handle(suspenderEmpresa, martenUnitOfWork, …);   // tu handler decide",
            "await context.EnqueueCascadingAsync(outgoing1);           // lo que devuelve, a los mensajes de la sesión",
            "new UnidadDeTrabajoMiddleware().After(martenUnitOfWork);  // el middleware vuelca",
            "await documentSession.SaveChangesAsync(cancellation);     // confirma hechos y mensajes, una vez",
          ],
        },
      ],
      luego:
        "Para llegar ahí: la unidad de trabajo vuelca sin confirmar, y un middleware la vuelca después de cada handler.",
    },
    {
      tipo: "reto",
      titulo: "Volcar, sin confirmar",
      tarea:
        "Parte el `CommitAsync` de tu `MartenUnitOfWork` en dos: pasar los hechos a la sesión, y confirmar.",
      pasos: [
        "Saca de `CommitAsync` un método público `Volcar()`: los `StartStream` y los `Append`, sin `SaveChangesAsync` y sin marcar.",
        "`CommitAsync` queda en `Volcar()`, el `SaveChangesAsync` y `MarcarConfirmados`.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
      tips: [
        {
          k: "nota",
          texto:
            "`CommitAsync` es para fuera de un handler: tu `Program.cs` y tus tests.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Volcar, sin confirmar",
      piezas: [
        {
          etiqueta: "En `MartenUnitOfWork`: `Volcar` y el `CommitAsync` que lo usa",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/MartenUnitOfWork.cs: CommitAsync, partido en dos",
            "public void Volcar()   // los hechos de lo que rastrea, a la sesión, sin confirmar",
            "{",
            "    foreach (var a in _nuevos)      _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());",
            "    foreach (var a in _modificados) if (a.SinConfirmar.Count > 0) _s.Events.Append(a.Id, a.SinConfirmar.ToArray());",
            "}",
            "public async Task CommitAsync()   // fuera de un handler: confirmas tú",
            "{",
            "    Volcar();",
            "    await _s.SaveChangesAsync();",
            "    foreach (var a in _nuevos.Concat(_modificados)) a.MarcarConfirmados();",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El middleware que vuelca",
      tarea:
        "Haz que Wolverine vuelque la unidad de trabajo después de cada handler, antes de confirmar.",
      pasos: [
        "En `Empresas.Historia`, la clase `UnidadDeTrabajoMiddleware` con `public void After(MartenUnitOfWork uow) => uow.Volcar();`",
        "Regístralo en el `AddWolverine` de `AgregarEmpresas`, junto a `AutoApplyTransactions()`: `opts.Policies.AddMiddleware<UnidadDeTrabajoMiddleware>();`",
        "Ponle encima su comentario `// NO quitar: …`, con el síntoma.",
      ],
      logro: { items: ["`Empresas.Historia` compila con el middleware registrado."] },
      tips: [
        {
          k: "nuevo",
          idioma: "middleware con After",
          explicacion:
            "Wolverine lo llama después de cada handler y antes del `SaveChangesAsync` de `AutoApplyTransactions`.",
        },
        {
          k: "nota",
          texto:
            "Si el handler y el middleware piden una `MartenUnitOfWork`, Wolverine crea una por mensaje, con la sesión del mensaje, y les pasa la misma. No la registras en el contenedor.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El middleware que vuelca",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/UnidadDeTrabajoMiddleware.cs`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/UnidadDeTrabajoMiddleware.cs: después del handler, antes del SaveChangesAsync de Wolverine",
            "public class UnidadDeTrabajoMiddleware",
            "{",
            "    public void After(MartenUnitOfWork uow) => uow.Volcar();",
            "}",
          ],
        },
        {
          etiqueta: "`Empresas.Historia/Configuracion.cs`, en el `AddWolverine` de tu `AgregarEmpresas`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Configuracion.cs, en el AddWolverine de tu AgregarEmpresas",
            "opts.Policies.AddMiddleware<UnidadDeTrabajoMiddleware>();   // NO quitar: sin esto, un handler con la plantilla responde y no guarda nada",
            "opts.Policies.AutoApplyTransactions();",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El handler solo decide",
      tarea:
        "Haz que `SuspenderHandler` pida la unidad de trabajo del mensaje, y que no confirme nada.",
      pasos: [
        "`SuspenderHandler` pide `MartenUnitOfWork uow` en vez de la sesión: sin el `new` y sin el `CommitAsync`. La falla queda donde estaba el `CommitAsync`.",
        "`SuspenderHandlerTests` deja de compilar: pásale `new MartenUnitOfWork(session)`.",
        "Suspende emp-47 con `curl`, con la falla y sin ella.",
      ],
      logro: {
        items: [
          "Con la falla: `500`, y emp-47 solo tiene `empresa_registrada`.",
          "Sin la falla: `202`, `empresa_suspendida` en emp-47 y `suspension_solicitada` en `susp-emp-47-2`.",
          "En un momento, una fila en `multas` para `904700000`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un test que lo fija",
      tarea:
        "Escribe un test que mande el comando por el bus y compruebe que sus hechos quedaron. Y dilo en el README.",
      pasos: [
        "`LaPlantillaEnElHandler` en la colección `\"host\"`. El dado: una empresa nueva de acme, registrada con la plantilla y `CommitAsync` (el test no es un handler).",
        "El comando va por el bus, no por `Handle`, como en el código de abajo.",
        "Suma al README: **Dentro de un handler:** pide la `MartenUnitOfWork` y no llames a `CommitAsync`. El ejemplo es `Empresas.Tests/LaPlantillaEnElHandler.cs`.",
      ],
      logro: { items: ["`dotnet test` en verde."] },
      tips: [
        {
          k: "nota",
          texto:
            "⚠️ `IMessageBus` es scoped: `using var scope = app.Services.CreateScope();` y pídeselo a `scope.ServiceProvider`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeForTenantAsync("acme", new SuspenderEmpresa(id, "mora"));',
          "Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un test que lo fija (1 de 2)",
      piezas: [
        {
          etiqueta: "`Empresas.Tests/LaPlantillaEnElHandler.cs`: la clase y el dado",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Tests/LaPlantillaEnElHandler.cs: la plantilla dentro de un handler, en tu host",
            "using Marten;",
            "using Microsoft.Extensions.DependencyInjection;",
            "using Wolverine;   // IMessageBus",
            "",
            "[Collection(\"host\")]",
            "public class LaPlantillaEnElHandler(HostDePrueba app)",
            "{",
            "    [Fact]",
            "    public async Task El_handler_no_confirma_y_sus_hechos_quedan()",
            "    {",
            "        var store = app.Services.GetRequiredService<IDocumentStore>();",
            "        var id = $\"emp-{Guid.NewGuid():N}\";",
            "        await using (var s = store.LightweightSession(\"acme\"))   // el dado, fuera de un handler: aquí confirmas tú",
            "        {",
            "            var uow = new MartenUnitOfWork(s);",
            "            uow.Registrar(Empresa.Registrar(id, $\"nit-{id}\", \"Andes\", \"Basico\"));",
            "            await uow.CommitAsync();",
            "        }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un test que lo fija (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue dentro del `[Fact]`: el comando por el bus, y sus hechos",
          lenguaje: "csharp",
          lineas: [
            "        using var scope = app.Services.CreateScope();   // el bus es scoped, como la sesión de un endpoint",
            "        var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();",
            "        await bus.InvokeForTenantAsync(\"acme\", new SuspenderEmpresa(id, \"mora\"));   // el handler no confirma nada",
            "",
            "        await using var q = store.LightweightSession(\"acme\");",
            "        Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);   // el registro y la suspensión",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "El cron no cobra",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Todo está verde. Pero el log muestra una excepción cada 10 segundos, y el cron no cobra.",
        },
        {
          k: "terminal",
          comando:
            "SELECT count(*) FROM wolverine_dead_letters WHERE message_type = 'DisparoMensual';",
          salida: ["Default tenant *DEFAULT* usage is disabled"],
          tono: "error",
        },
        {
          k: "texto",
          texto:
            "Suma uno por vuelta. El middleware corre en **todos** los handlers, y para crear la unidad de trabajo Wolverine abre una sesión con el tenant del sobre.",
        },
        { k: "respuesta", texto: "El disparo no trae tenant." },
      ],
    },
    {
      tipo: "reto",
      titulo: "El middleware, solo donde se pide",
      tarea:
        "Aplica el middleware solo en los handlers que reciben una `MartenUnitOfWork`.",
      pasos: [
        "Cambia el registro por `AddMiddleware<UnidadDeTrabajoMiddleware>(chain => …)`: el middleware entra donde la función da `true`.",
        "El filtro: algún `h` de `chain.Handlers` tiene, en `h.Method.GetParameters()`, un `p` con `p.ParameterType == typeof(MartenUnitOfWork)`.",
        "Reinicia el servicio.",
      ],
      logro: {
        items: [
          "El log vuelve a decir `Mes … de acme: cobrado` y `Mes … de globex: cobrado`.",
          "`SELECT tenant, max(periodo) FROM mensualidades GROUP BY tenant;` avanza cada 10 segundos.",
          "`dotnet test` en verde. Los disparos fallidos se quedan en dead letters: son meses sin cobrar.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "Filtra por el parámetro, no por el mensaje: así entra en el próximo handler que pida la unidad de trabajo, y no en el próximo trabajo sin tenant.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El middleware, solo donde se pide",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/Configuracion.cs`: el mismo `AddMiddleware`, con un filtro",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Configuracion.cs, en el AddWolverine de tu AgregarEmpresas: el mismo AddMiddleware, con un filtro",
            "opts.Policies.AddMiddleware<UnidadDeTrabajoMiddleware>(chain =>   // NO quitar: sin esto, un handler con la plantilla responde y no guarda nada",
            "    chain.Handlers.Any(h => h.Method.GetParameters().Any(p => p.ParameterType == typeof(MartenUnitOfWork))));   // sin el filtro, el cron deja de cobrar sin un error: su disparo, sin tenant, cae a dead letters",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "El middleware que falta",
      tarea:
        "Quita el middleware y mira quién lo nota. Luego devuélvelo.",
      pasos: [
        "Quita el `AddMiddleware` de tu `AgregarEmpresas` y corre `dotnet test`.",
        "Devuélvelo con su filtro, ahora **después** de `AutoApplyTransactions()`, y corre `dotnet test`.",
        "Quita solo el filtro y corre `dotnet test`. Vuelve a ponerlo.",
      ],
      logro: {
        items: [
          "Sin el middleware, compila y cae tu test nuevo: `Expected: 2` / `Actual: 1`.",
          "Cae también `VistaSuspendidaTests`.",
          "Después de `AutoApplyTransactions()`: verde.",
          "Sin el filtro también hay verde: al filtro lo cuida su comentario.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La versión que no llega",
      tarea:
        "No lo saltes: la sección 69 repite este paso. Pasa `RegistrarPagoHandler` a la plantilla y mira la carrera del pago.",
      pasos: [
        "`RegistrarPagoHandler` pide la `MartenUnitOfWork`, carga con `uow.Cargar`, conserva su guarda con su `LogWarning` y llama a `empresa.RegistrarPago(cmd.Monto, cmd.Referencia)` en vez del `Append`.",
        "Corre `dotnet test --filter CarreraDelPagoTests`, solo.",
        "Deshaz el cambio: la sección 69 lo retoma.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test --filter CarreraDelPagoTests",
          tono: "error",
          salida: [
            "Assert.Single() Failure: The collection contained 2 matching items",
          ],
        },
        items: ["El `Append` de `Volcar` no lleva versión esperada."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Dentro de un handler, el handler solo decide. El middleware vuelca la unidad de trabajo del mensaje, y Wolverine confirma hechos y mensajes juntos.",
      puntos: [
        {
          termino: "Volcar",
          definicion:
            "Pasa los hechos a la sesión, sin confirmar. `CommitAsync` es `Volcar` más el `SaveChangesAsync`.",
        },
        {
          termino: "Middleware con After",
          definicion:
            "Corre después del handler y antes del commit de Wolverine. Va solo donde se pide la unidad de trabajo.",
        },
      ],
      commit: {
        mensaje: "ES · La plantilla dentro del handler",
        preguntas: [
          "Si la sesión del handler ya está en el outbox, ¿por qué un `CommitAsync` dentro del handler parte la transacción en dos?",
          "¿Qué cambió de lugar para que el handler no llame a nada? ¿Por qué el cron dejó de cobrar, si su handler no usa la plantilla?",
        ],
      },
      siguiente: {
        seccion: "68 · Lo que la unidad de trabajo ya tiene",
        texto:
          "Si dos pasos del mismo mensaje cargan la misma empresa, cada uno recibe su copia.",
      },
    },
  ],
};
