// Fuente: workshop-event-sourcing/taller.md, entrada "68 · Lo que la unidad de trabajo ya tiene".
import type { Seccion } from "./tipos";

export const seccion68: Seccion = {
  numero: 68,
  titulo: "Lo que la unidad de trabajo ya tiene",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que `Cargar` devuelva lo que la unidad de trabajo **ya cargó o registró** en el mensaje, y que falle con el id cuando el stream no existe, en vez de devolver `null`.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "El banco manda un extracto: todos los avisos de pago del día, en un solo mensaje.",
        },
        { k: "texto", tam: "grande", texto: "Un día, repite una línea." },
        {
          k: "respuesta",
          texto: "Ya tienes la guarda del pago repetido: ¿lo frena?",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El extracto del día",
      piezas: [
        {
          etiqueta:
            "Pega en `Empresas.Historia` el `public record RegistrarExtracto(RegistrarPago[] Avisos);` y su handler:",
          lenguaje: "csharp",
          lineas: [
            "public static class RegistrarExtractoHandler",
            "{",
            "    public static async Task Handle(RegistrarExtracto cmd, MartenUnitOfWork uow, ILogger logger)",
            "    {",
            "        foreach (var aviso in cmd.Avisos)   // cada aviso, como uno suelto: carga, revisa y registra el pago",
            "        {",
            "            var empresa = await uow.Cargar<Empresa>(aviso.EmpresaId);",
            "            if (empresa.YaRegistro(aviso.Referencia))",
            "            {",
            '                logger.LogWarning("Pago {Referencia} de {EmpresaId} ya registrado: se descarta",',
            "                    aviso.Referencia, aviso.EmpresaId);",
            "                continue;",
            "            }",
            "            empresa.RegistrarPago(aviso.Monto, aviso.Referencia);",
            "        }",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La misma línea, dos veces",
      tarea:
        "Escribe un test que mande un extracto con el mismo aviso dos veces, y mira cuántos pagos entran.",
      pasos: [
        "En `LaPlantillaEnElHandler`, lleva la siembra de tu primer test a un método `NuevaEmpresa()` que devuelva el id.",
        "Agrega el test `Un_aviso_repetido_en_el_extracto_entra_una_vez`, con el código de abajo.",
        "Corre `dotnet test`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Expected: 1", "Actual:   2"],
        },
        items: [
          "Cada `Cargar` fue a Postgres y trajo su propia copia, sin el pago de la otra.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var aviso = new RegistrarPago(id, "BANCO-0044", 50000);',
          'await bus.InvokeForTenantAsync("acme", new RegistrarExtracto([aviso, aviso]));',
          "// … con una sesión q de acme:",
          'Assert.Equal(1, (await q.Events.FetchStreamAsync(id)).Count(e => e.EventTypeName == "pago_registrado"));',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Nace y se carga en el mismo mensaje",
      tarea:
        "En `SuspenderHandlerTests`, arma el dado en la unidad de trabajo que le pasas al handler, sin `StartStream` ni `SaveChangesAsync`.",
      pasos: [
        "Cambia el dado por el código de abajo y corre `dotnet test`.",
        "Pon `uow.Volcar();` antes del `Handle` y corre otra vez.",
        "Quita el `Volcar`.",
      ],
      logro: {
        items: [
          "Cae con `System.NullReferenceException` en `SuspenderHandler`.",
          "Con el `Volcar`, el mismo error: `FetchLatest` no ve un `StartStream` que la sesión no confirmó.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var uow = new MartenUnitOfWork(session);",
          'uow.Registrar(Empresa.Registrar(id, "900555", "Prueba", "Basico"));   // dado: nace en esta unidad',
          'var salida = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), uow, plazos, NullLogger.Instance);',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Lo que la unidad ya rastrea",
      tarea:
        "Haz que `Cargar` devuelva primero lo que la unidad de trabajo ya tiene, antes de ir a Postgres.",
      pasos: [
        "Al empezar `Cargar`: si la unidad ya rastrea un agregado con ese id, registrado o cargado, devuélvelo.",
        "No lo agregues otra vez a una lista.",
        "Corre `dotnet test`, sin cambiar los dos tests.",
      ],
      logro: { items: ["Los dos tests pasan."] },
      tips: [
        {
          k: "nota",
          texto:
            "Para devolverlo como `T`, usa `is T`, como el `is ProcesoRevertido revertido` de tu `Decidir`.",
        },
        {
          k: "nota",
          texto:
            "La empresa que sale de memoria tiene `Version` 0: esa la pone Marten al rehidratar.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Lo que la unidad ya rastrea",
      piezas: [
        {
          etiqueta: "**Al empezar** `Cargar`, en `MartenUnitOfWork`",
          lenguaje: "csharp",
          lineas: [
            "// al empezar Cargar, en MartenUnitOfWork: lo registrado o cargado en esta unidad, primero",
            "if (_nuevos.Concat(_modificados).FirstOrDefault(a => a.Id == id) is T ya) return ya;",
          ],
        },
      ],
      nota: "El segundo aviso recibe la misma empresa que el primero, ya con su pago: la guarda lo frena.",
    },
    {
      tipo: "reto",
      titulo: "Un aviso de nadie",
      tarea:
        "Manda un aviso de una empresa que no existe, y mira qué dice el error y qué dice el compilador.",
      pasos: [
        'En `LaPlantillaEnElHandler`, un test que mande por el bus un extracto, `nadie`, con un solo aviso: `new RegistrarPago("emp-nadie", "BANCO-0044", 50_000)`.',
        "Corre `dotnet test`.",
        "Corre `dotnet build Empresas.Historia --no-incremental 2>&1 | grep CS8603`.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: [
            "warning CS8603: Posible tipo de valor devuelto de referencia nulo",
          ],
        },
        items: [
          "El test cae con `NullReferenceException` en `RegistrarExtractoHandler`, y no dice qué faltaba.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto: "En PowerShell, en vez de `grep`: `Select-String CS8603`.",
        },
        {
          k: "piensa",
          texto: "La firma de `Cargar` promete un `T`. ¿Lo cumple?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La puerta",
      tarea:
        "Haz que `Cargar` falle en la puerta, con el id, cuando el stream no existe.",
      pasos: [
        "Declara `AgregadoNoEncontradoException(string id)`, **suelta**, junto a tus otras excepciones, con un mensaje que diga el id.",
        "En `Cargar`: `FetchLatest<T>(id) ?? throw new AgregadoNoEncontradoException(id)`.",
        "El test de `emp-nadie` termina con el código de abajo.",
      ],
      logro: {
        items: [
          "`dotnet test` en verde, con los dos tests nuevos de `LaPlantillaEnElHandler`.",
          "El `grep CS8603` ya no encuentra nada.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Assert.ThrowsAsync",
          explicacion: "el `Assert.Throws` de algo que se espera con `await`.",
        },
        {
          k: "nota",
          texto:
            "Un tipo propio deja que quien llama decida: un endpoint puede responder 404.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await Assert.ThrowsAsync<AgregadoNoEncontradoException>(() => bus.InvokeForTenantAsync("acme", nadie));',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La puerta (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Historia`, suelta, junto a tus otras excepciones",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia, suelta, junto a tus otras excepciones",
            "public class AgregadoNoEncontradoException(string id) : Exception($\"No existe el stream {id}\");",
          ],
        },
        {
          etiqueta: "`Cargar` entero, en `MartenUnitOfWork`",
          lenguaje: "csharp",
          lineas: [
            "// en MartenUnitOfWork: lo que ya rastrea, primero; si el stream no existe, falla aquí",
            "public async Task<T> Cargar<T>(string id) where T : AggregateRoot",
            "{",
            "    if (_nuevos.Concat(_modificados).FirstOrDefault(a => a.Id == id) is T ya) return ya;",
            "    var a = await _s.Events.FetchLatest<T>(id) ?? throw new AgregadoNoEncontradoException(id);",
            "    _modificados.Add(a);",
            "    return a;",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La puerta (2 de 2)",
      piezas: [
        {
          etiqueta: "En `LaPlantillaEnElHandler`: el test de `emp-nadie`",
          lenguaje: "csharp",
          lineas: [
            "// en LaPlantillaEnElHandler",
            "[Fact]",
            "public async Task Cargar_un_stream_que_no_existe_falla_con_su_nombre()",
            "{",
            "    using var scope = app.Services.CreateScope();",
            "    var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();",
            "    var nadie = new RegistrarExtracto([new RegistrarPago(\"emp-nadie\", \"BANCO-0044\", 50_000)]);   // un aviso de una empresa que no existe",
            "    await Assert.ThrowsAsync<AgregadoNoEncontradoException>(() => bus.InvokeForTenantAsync(\"acme\", nadie));",
            "}",
          ],
        },
      ],
      nota: "Tu política de reintento no la toca: solo reintenta el choque de concurrencia y el timeout.",
    },
    {
      tipo: "rompelo",
      titulo: "El ! que calla",
      tarea:
        "Quita la puerta y calla el aviso del compilador con `!`. Mira qué cambia.",
      pasos: [
        "En `Cargar`, deja la primera línea, carga sin la puerta y devuelve `a!`.",
        "Corre el `grep CS8603` y `dotnet test`.",
        "Vuelve a poner la puerta.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            "Assert.Throws() Failure: Exception type was not an exact match",
            "Actual:   typeof(System.NullReferenceException)",
          ],
        },
        items: [
          "El `grep CS8603` queda vacío: el `!` solo calla al compilador.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El README de la librería de la organización enseña ese `!` en su ejemplo.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La puerta sin memoria",
      tarea:
        "Con la puerta puesta, quita solo la primera línea de `Cargar`.",
      pasos: ["Corre `dotnet test`.", "Devuelve la línea."],
      logro: {
        items: [
          "El extracto vuelve a pagar dos veces.",
          "`SuspenderHandlerTests` cae con `AgregadoNoEncontradoException`: «No existe el stream emp-test-…».",
          "Pero esa empresa existe, en la unidad de trabajo.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La unidad de trabajo de un mensaje se ve a sí misma: `Cargar` devuelve lo que ya tiene antes de ir a Postgres. Si el stream no existe, falla en la puerta con su id.",
      puntos: [
        {
          termino: "Identity map",
          definicion:
            "La unidad devuelve el agregado que ya rastrea, registrado o cargado, en vez de traer otra copia.",
        },
        {
          termino: "La puerta",
          definicion:
            "`AgregadoNoEncontradoException` con el id, en vez de un `null` que un `!` solo esconde.",
        },
      ],
      commit: {
        mensaje: "ES · Lo que la unidad de trabajo ya tiene",
        preguntas: [
          "¿Por qué la guarda de Llegó dos veces frena un aviso repetido en dos mensajes, y no en un mismo extracto?",
          "¿Qué diferencia hay entre callar el aviso con `!` y lanzar `AgregadoNoEncontradoException` en `Cargar`?",
        ],
      },
      siguiente: {
        seccion: "69 · El capstone: FetchForWriting",
        texto:
          "El `Append` de `Volcar` no lleva versión esperada. Entre tu `Cargar` y el commit, otro mensaje pudo escribir en el mismo stream.",
      },
    },
  ],
};
