// Fuente: workshop-event-sourcing/taller.md, entrada "69 · El capstone: FetchForWriting".
import type { Seccion } from "./tipos";

export const seccion69: Seccion = {
  numero: 69,
  titulo: "El capstone: FetchForWriting",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que la plantilla vuelva a escribir con la **versión esperada**, ahora con `FetchForWriting` de Marten, y que un test de dos escritores lo fije en la suite.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Dos personas cargan la misma empresa en Básico.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Una la pasa a Premium, la otra a Enterprise, y las dos guardan.",
        },
        {
          k: "respuesta",
          texto: "Con la plantilla de hoy, ¿cuál de las dos falla?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos escritores",
      tarea:
        "En tu `Program.cs`, dos actos cargan la misma empresa, le cambian el plan y confirman, cada uno con su sesión y su unidad de trabajo.",
      pasos: [
        "Entre `builder.Build()` y `app.Run()`, registra emp-48 con la plantilla (`904800000`, \"Molinos del Valle\", \"Básico\") y su `Localizador`. No la suspendas.",
        "Justo después, los dos actos del código de abajo.",
        "Corre una vez.",
      ],
      logro: {
        items: [
          "Las dos confirman. Ninguna falla.",
          "No uses emp-1: está suspendida, y `CambiarPlan` la rechaza.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await using var sa = store.LightweightSession("acme");   var ua = new MartenUnitOfWork(sa);',
          'await using var sb = store.LightweightSession("acme");   var ub = new MartenUnitOfWork(sb);',
          'var ea = await ua.Cargar<Empresa>("emp-48");   // A carga: Básico',
          'var eb = await ub.Cargar<Empresa>("emp-48");   // B carga: Básico',
          'ea.CambiarPlan("Premium");   eb.CambiarPlan("Enterprise");',
          "await ua.CommitAsync();      await ub.CommitAsync();",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Las dos entraron",
      bloques: [
        {
          k: "terminal",
          comando:
            "SELECT version, type FROM mt_events WHERE stream_id = 'emp-48' ORDER BY version;",
          salida: [
            " 1 | empresa_registrada",
            " 2 | plan_cambiado",
            " 3 | plan_cambiado",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Las dos decidieron sobre Básico, y B nunca vio el cambio de A.",
        },
        {
          k: "respuesta",
          texto:
            "El `Append` sin versión esperada de la plantilla dejó volver la deuda de Concurrencia optimista.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cargar para escribir",
      tarea:
        "Haz que `Cargar` lea con `FetchForWriting`, para que el stream recuerde la versión que leyó.",
      pasos: [
        "Quita de `Program.cs` el bloque que registra emp-48 (ya existe). Deja los dos actos.",
        "En `MartenUnitOfWork`, `Cargar<T>` usa `FetchForWriting<T>` en vez de `FetchLatest`.",
        "`IEventStream<T>` es genérico: guarda el stream dentro de una `Action`, `() => stream.AppendMany(agg.SinConfirmar.ToArray())`.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "FetchForWriting<T>(id)",
          explicacion:
            "un stream que recuerda su versión inicial. `.Aggregate` es el estado (o `null`), `.AppendMany` agrega hechos, y al `SaveChangesAsync` Marten rechaza si el stream avanzó.",
        },
        {
          k: "nota",
          texto:
            "En `Volcar` no puedes pasar la versión a mano: `AggregateRoot` no tiene `Version`, y la que importa es la que se leyó al cargar.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Lo cargado, con su Action",
      tarea:
        "Guarda cada agregado cargado junto a su `Action`, y haz que `Volcar` la llame.",
      pasos: [
        "Una lista `_cargados`, de pares `(agg, append)`, reemplaza a `_modificados`.",
        "La primera línea busca en `_nuevos` y en los agregados de `_cargados`. La puerta mira `stream.Aggregate`.",
        "`Volcar` llama a cada `Action`. Nacer (`StartStream`) no cambia. Corre los dos actos.",
      ],
      logro: {
        items: [
          "`await ub.CommitAsync();` lanza `EventStreamUnexpectedMaxEventIdException`.",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Lo cargado, con su Action (1 de 2)",
      piezas: [
        {
          etiqueta: "Tu `MartenUnitOfWork`: `_cargados` y el `Cargar` con `FetchForWriting`",
          lenguaje: "csharp",
          lineas: [
            "public class MartenUnitOfWork",
            "{",
            "    private readonly IDocumentSession _s;",
            "    private readonly List<AggregateRoot> _nuevos = new();",
            "    private readonly List<(AggregateRoot agg, Action append)> _cargados = new();   // agregado + cómo appendear a SU stream",
            "    public MartenUnitOfWork(IDocumentSession s) => _s = s;",
            "",
            "    public void Registrar(AggregateRoot a) => _nuevos.Add(a);   // nacer: NO cambia",
            "",
            "    public async Task<T> Cargar<T>(string id) where T : AggregateRoot",
            "    {",
            "        if (_nuevos.Concat(_cargados.Select(c => c.agg)).FirstOrDefault(a => a.Id == id) is T ya) return ya;   // lo que esta unidad ya rastrea",
            "        var stream = await _s.Events.FetchForWriting<T>(id);   // en vez de FetchLatest: recuerda la versión leída",
            "        var agg = stream.Aggregate ?? throw new AgregadoNoEncontradoException(id);   // la puerta: sin stream, no hay agregado",
            "        _cargados.Add((agg, () => stream.AppendMany(agg.SinConfirmar.ToArray())));   // la lambda captura el stream<T> tipado",
            "        return agg;",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Lo cargado, con su Action (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue dentro de la clase: `Volcar` y `CommitAsync`",
          lenguaje: "csharp",
          lineas: [
            "    public void Volcar()   // nacer y crecer, a la sesión, sin confirmar: lo llama tu middleware",
            "    {",
            "        foreach (var a in _nuevos) _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());     // nacer: igual que antes",
            "        foreach (var (agg, append) in _cargados) if (agg.SinConfirmar.Count > 0) append();    // crecer: por el stream de FetchForWriting",
            "    }",
            "",
            "    public async Task CommitAsync()   // fuera de un handler",
            "    {",
            "        Volcar();",
            "        await _s.SaveChangesAsync();   // valida las versiones esperadas; si un stream avanzó, lanza",
            "        foreach (var a in _nuevos) a.MarcarConfirmados();",
            "        foreach (var (agg, _) in _cargados) agg.MarcarConfirmados();",
            "    }",
            "}",
          ],
        },
      ],
      nota: "El `SaveChangesAsync` valida todas las versiones de una. Dentro de un handler las valida el de Wolverine, después de tu `Volcar`.",
    },
    {
      tipo: "reto",
      titulo: "El test de dos escritores",
      tarea:
        "Convierte los dos actos en un test que se ponga rojo el día que alguien quite `FetchForWriting`.",
      pasos: [
        "`ConcurrenciaTests` en `Empresas.Tests`, colección `\"host\"`, con `HostDePrueba` y el `IDocumentStore` de `app.Services`. Quita el escenario de `Program.cs`.",
        "Una empresa nueva por corrida (`$\"emp-{Guid.NewGuid():N}\"`) y dos sesiones con su unidad de trabajo: A confirma y B choca.",
        "B recarga en una unidad nueva, ve `Premium`, decide otra vez y confirma.",
      ],
      logro: { items: ["`dotnet test`, desde `Empresas.Tests`, en verde."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Assert.ThrowsAnyAsync<T>",
          explicacion:
            "pasa también si se lanza una clase hija de `T`. Espera la base, con el nombre completo: el corto es tu `ConcurrencyException`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await ua.CommitAsync();                                                               // A entra",
          "await Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>(() => ub.CommitAsync());  // B choca",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El test de dos escritores (1 de 2)",
      piezas: [
        {
          etiqueta: "`Empresas.Tests/ConcurrenciaTests.cs`: la clase y una empresa nueva",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Tests/ConcurrenciaTests.cs: dos escritores sobre el mismo stream, con el store del host",
            "using Marten;",
            "using Microsoft.Extensions.DependencyInjection;",
            "",
            "[Collection(\"host\")]",
            "public class ConcurrenciaTests(HostDePrueba app)",
            "{",
            "    [Fact]",
            "    public async Task Dos_escritores_sobre_la_misma_version_la_segunda_choca()",
            "    {",
            "        var store = app.Services.GetRequiredService<IDocumentStore>();",
            "        var id = $\"emp-{Guid.NewGuid():N}\";   // una empresa nueva en cada corrida: nace en la versión 1",
            "        await using (var s = store.LightweightSession(\"acme\"))",
            "        {",
            "            var uow = new MartenUnitOfWork(s);",
            "            uow.Registrar(Empresa.Registrar(id, \"900\", \"Andes\", \"Basico\"));",
            "            await uow.CommitAsync();",
            "        }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El test de dos escritores (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue dentro del `[Fact]`: los dos escritores, el choque y la recarga",
          lenguaje: "csharp",
          lineas: [
            "        await using var sa = store.LightweightSession(\"acme\");",
            "        await using var sb = store.LightweightSession(\"acme\");",
            "        var ua = new MartenUnitOfWork(sa);",
            "        var ub = new MartenUnitOfWork(sb);",
            "        var ea = await ua.Cargar<Empresa>(id);   // las dos cargan la versión 1",
            "        var eb = await ub.Cargar<Empresa>(id);",
            "        ea.CambiarPlan(\"Premium\");",
            "        eb.CambiarPlan(\"Enterprise\");",
            "",
            "        await ua.CommitAsync();                                                               // A entra",
            "        await Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>(() => ub.CommitAsync());  // B choca",
            "",
            "        await using var sc = store.LightweightSession(\"acme\");   // B recarga y decide sobre el estado nuevo",
            "        var uc = new MartenUnitOfWork(sc);",
            "        var ec = await uc.Cargar<Empresa>(id);",
            "        Assert.Equal(\"Premium\", ec.Plan);                  // ve el cambio de A",
            "        ec.CambiarPlan(\"Enterprise\");",
            "        await uc.CommitAsync();",
            "    }",
            "}",
          ],
        },
      ],
      nota: "La concurrencia optimista no evita el conflicto: lo **detecta** y te obliga a decidir sobre datos frescos.",
    },
    {
      tipo: "reto",
      titulo: "El pago, sobre la plantilla",
      tarea:
        "Pasa `RegistrarPagoHandler` a la plantilla: el cambio que deshiciste en la sección 67.",
      pasos: [
        "`RegistrarPagoHandler` pide la `MartenUnitOfWork` en vez de la sesión.",
        "Conserva su guarda con su `LogWarning` y llama a `empresa.RegistrarPago(cmd.Monto, cmd.Referencia)`, sin su `Append`.",
        "Corre `dotnet test --filter CarreraDelPagoTests`.",
      ],
      logro: {
        items: [
          "`CarreraDelPagoTests` pasa en verde.",
          "`dotnet test` completo, también.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Dentro de un handler no escribes el «recarga y reintenta»: lo hace su política `OnException<JasperFx.ConcurrencyException>`, que vuelve a correr el handler.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Sin la versión en la escritura",
      tarea:
        "Vuelve `Cargar` a leer con `FetchLatest` y a guardar sin versión esperada. La primera línea y la puerta se quedan.",
      pasos: [
        "En `Cargar(id)`: `FetchLatest` en vez de `FetchForWriting`, y la `Action` con `_s.Events.Append(id, agg.SinConfirmar.ToArray())`.",
        "Corre `dotnet test`, y luego `dotnet test --filter CarreraDelPagoTests`.",
        "Restaura `Cargar(id)`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.ThrowsAny() Failure: No exception was thrown"],
        },
        items: [
          "Cae el test de dos escritores de `ConcurrenciaTests`.",
          "`CarreraDelPagoTests` vuelve a dejar dos pagos.",
          "Todo compila y los handlers responden igual: solo los tests lo notan.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "`FetchForWriting` cierra la deuda de concurrencia en todo el ciclo cargar-decidir-guardar, y un test de dos sesiones se pone rojo si alguien lo quita.",
      puntos: [
        {
          termino: "FetchForWriting",
          definicion:
            "Carga, recuerda la versión leída y la valida al guardar, en un solo acto: no queda nada que olvidar.",
        },
        {
          termino: "Test de dos escritores",
          definicion:
            "Quitar la versión esperada no cambia ninguna respuesta. Solo ese test lo nota.",
        },
      ],
      commit: {
        mensaje: "ES · El capstone: FetchForWriting",
        preguntas: [
          "¿Por qué el `Append` sin versión reabrió la deuda de Concurrencia optimista, y cómo la cierra `FetchForWriting`?",
          "¿Por qué preferirlo a pasar la versión al `Append` a mano?",
        ],
      },
      siguiente: {
        seccion: "70 · La versión que vio el usuario",
        texto:
          "Tu test cubre la ventana entre cargar y confirmar. En una pantalla, el usuario ve la empresa y guarda minutos después.",
      },
    },
  ],
};
