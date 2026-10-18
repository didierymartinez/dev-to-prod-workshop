// Fuente: workshop-event-sourcing/taller.md, entrada "31 · El swap por reconocimiento".
import type { Seccion } from "./tipos";

export const seccion31: Seccion = {
  numero: 31,
  titulo: "El swap por reconocimiento",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Cambiar el diario a mano por **Marten**, sobre la misma Postgres, y comprobar que hace lo nuestro: hechos, concurrencia, rehidratación, NIT único y nombres estables.",
    },
    {
      tipo: "planteamiento",
      titulo: "Reconocer, pieza por pieza",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Construimos el diario a mano **para entenderlo**.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "Hoy lo cambiamos por una librería, **por alivio**.",
        },
        {
          k: "respuesta",
          texto: "Y vamos a comprobar pieza por pieza que hace lo mismo.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Lo que adoptas hoy",
      bloques: [
        {
          k: "tabla",
          columnas: ["Lo que construiste a mano", "Lo que ya es de la librería"],
          filas: [
            ["`eventos` + `GetEvents`/`Guardar`", "`StartStream`, `Append`"],
            ["`PRIMARY KEY(stream, version)`", "Concurrencia optimista, integrada"],
            ["`AbrirStream<Empresa>(id).Get()`", "`AggregateStreamAsync<Empresa>(id)`"],
            ["`localizador` + `GuardarNuevo`", "Un documento, con `Insert`"],
            ["El mapa `_porNombre`", "`AddEventType` y `MapEventType`"],
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Dos filas no se adoptan solas",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "`StartStream` **no mira el NIT**: nacerían dos streams con el mismo NIT.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Marten **nombra cada hecho por su clase**: renombrarla rompe la historia.",
        },
        {
          k: "respuesta",
          texto: "Las dos las adoptas a mano, hoy.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Lo que adoptas después",
      bloques: [
        {
          k: "tabla",
          columnas: ["A mano", "En la librería"],
          filas: [
            ["`Upcast(json)`", "El upcaster de Marten, cuando cambie la forma de un hecho"],
            ["`CorrerProyector()` + `checkpoint`", "El daemon async + una proyección"],
            ["`bandeja_salida` + `EntregarPendientes`", "El outbox de Wolverine"],
            ["`IEventStore` + el doble", "Una plantilla: `AggregateRoot` + `MartenUnitOfWork`"],
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El store de Marten",
      tarea:
        "Agrega Marten a `Empresas.Historia` y crea su store sobre tu misma cadena de Postgres.",
      pasos: [
        "`dotnet add Empresas.Historia package Marten`",
        "En `Program.cs`, tu `store` de siempre (el `PostgresEventStore`) pasa a llamarse `viejo`, donde lo declaras y donde lo usas.",
        "Debajo, el store de Marten de abajo, con `using Marten;` y `using JasperFx.Events;` arriba del archivo.",
      ],
      logro: { items: ["Compila. Desde aquí, `store` es el de Marten."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Marten",
          explicacion:
            "tu diario hecho librería: `StartStream`, `Append`, `AggregateStreamAsync`, con la concurrencia integrada.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = DocumentStore.For(opts =>",
          "{",
          "    opts.Connection(cadena);",
          '    opts.Events.StreamIdentity = StreamIdentity.AsString;   // tus ids son "emp-7"',
          "});",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Tu Empresa, para Marten",
      tarea:
        "Deja que Marten rehidrate tu `Empresa`: un `Apply` por hecho, sin la clase base.",
      pasos: [
        "En `Empresa`, cambia el `switch` de `Aplicar` por un `Apply(TEvento)` por hecho: `Apply(EmpresaRegistrada e)`, `Apply(PlanCambiado e)`…",
        "Setters **privados**, y una propiedad `Id` (`string`).",
        "Quita `: AggregateRoot` y comenta los verbos que llaman a `Emitir`.",
      ],
      logro: {
        items: [
          "`Empresa` no hereda de nada y tiene un `Apply` por cada hecho.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Marten descubre los `Apply` por convención, en código compilado. La base y los verbos vuelven en La plantilla.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La limpieza",
      tarea:
        "Borra tu diario a mano y comenta todo lo que lo usaba, hasta que `Empresas.Historia` vuelva a compilar.",
      pasos: [
        "En `psql`, `DROP TABLE eventos;`. Borra `GetEvents` y `Guardar` de `IEventStore` y de `PostgresEventStore`.",
        "Comenta lo que deja de compilar: `EventStream`, `AbrirStream`, los handlers de instancia, `CorrerProyector`, el `Despachador` con su `ICommandHandler<T>`.",
        "En `Program.cs`, comenta `viejo` y todo lo que lo usa.",
      ],
      logro: { items: ["`dotnet build` en verde."] },
      tips: [
        {
          k: "nota",
          texto: "Comenta con `/* … */` o con `#if false` … `#endif`.",
        },
        {
          k: "nota",
          texto: "Deja la clase `AggregateRoot`: compila sola.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Escribir y rehidratar",
      tarea:
        "Con Marten, nace `emp-7`, agrégale un hecho y rehidrátala.",
      pasos: [
        "Cada bloque, con su `store.LightweightSession()` y su `await s.SaveChangesAsync()`. El primero, abajo.",
        'Otro bloque: `s.Events.Append("emp-7", new EmpresaReactivada())`.',
        'Otro: `await s.Events.AggregateStreamAsync<Empresa>("emp-7")`, e imprime `Suspendida`, `Reactivaciones` y `Plan`.',
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Suspendida=False Reactivaciones=1 Plan=Basico"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nota",
          texto:
            "En Marten 9 todo es `await`, y eso **no** es consistencia eventual: lo que guardas, lo ves al rehidratar enseguida.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    s.Events.StartStream<Empresa>("emp-7",',
          '        new EmpresaRegistrada("900123", "Andes", "Basico"), new EmpresaSuspendida("mora"));',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El choque",
      tarea:
        "Dos sesiones leen la misma versión de `emp-7` y escriben las dos. Mira a Marten rechazar la segunda.",
      pasos: [
        "Abre dos sesiones, `a` y `b`. Las dos leen con `FetchStreamStateAsync(\"emp-7\")`.",
        "Las dos appendean un hecho con `Version + 1`, como abajo, y guardan: primero `a`, luego `b`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["EventStreamUnexpectedMaxEventIdException"],
        },
        items: ["El primero entra; el segundo lanza: tu `ConcurrencyException`, de Marten."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El número es la versión que tendrá el stream **tras** el append.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var estadoA = await a.Events.FetchStreamStateAsync("emp-7");',
          'a.Events.Append("emp-7", estadoA!.Version + 1, new EmpresaSuspendida("x"));',
          "await a.SaveChangesAsync();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El NIT, en un documento",
      tarea:
        "Reserva el NIT dentro de la transacción del hecho: un documento `Localizador` y el stream, en la misma sesión.",
      pasos: [
        "En `Empresas.Historia`, la clase `Localizador` con `Id` (guarda el NIT) y `Stream`, las dos `string` con `get; set;`.",
        "En `Program.cs`, un método `void Sembrar(...)` que recibe `IDocumentSession session`, `id`, `nit`, `nombre` y `plan`. Anota el `Insert` del localizador y el `StartStream`, **sin** `SaveChangesAsync`.",
        "En `psql`, `DROP TABLE localizador;`.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Documento",
          explicacion:
            "objetos guardados como JSON, con su `Id` como llave. Todo lo anotado entra en **una** transacción al `SaveChangesAsync`.",
        },
        {
          k: "nota",
          texto:
            "`Insert` lanza si el `Id` existe. `Store` sobrescribe **sin avisar**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos empresas, un NIT",
      tarea: "Siembra `emp-17` y `emp-18` con el mismo NIT, una tras otra.",
      pasos: [
        "Corre el código de abajo.",
        "En `psql`: `SELECT id FROM mt_streams WHERE id IN ('emp-17', 'emp-18');`",
        "Comenta los dos bloques: `emp-17` ya existe.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["JasperFx.DocumentAlreadyExistsException"],
        },
        items: ["`emp-18` lanza, y `mt_streams` solo tiene `emp-17`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-17", "901700000", "Vivero Andino", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-18", "901700000", "Vivero Andino", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Los hechos, en un solo lugar",
      tarea:
        "Registra tus cinco hechos en una sola lista, que usen tu `Program.cs` y un test sin base de datos.",
      pasos: [
        "En `Empresas.Historia`, `static class Hechos` con `static void Registrar(StoreOptions opts)`: un `opts.Events.AddEventType<…>()` por cada uno de tus cinco hechos.",
        "Llama `Hechos.Registrar(opts)` dentro del `DocumentStore.For`.",
        "El test de la lámina siguiente, en `Empresas.Tests/NombresDeLosHechos.cs`. Comenta los tests viejos que no compilan.",
      ],
      logro: { items: ["`dotnet test` en verde."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Alias",
          explicacion:
            "Marten guarda un alias por hecho: `PlanCambiado` queda `plan_cambiado`.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Cada hecho conserva su alias",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/NombresDeLosHechos.cs`, con `using Marten;` arriba:",
          lenguaje: "csharp",
          lineas: [
            "public class NombresDeLosHechos",
            "{",
            "    [Fact]",
            "    public void Cada_hecho_conserva_su_alias()",
            "    {",
            "        using var store = DocumentStore.For(opts =>",
            "        {",
            '            opts.Connection("Host=localhost");   // nunca se conecta',
            "            Hechos.Registrar(opts);",
            "        });",
            "        var alias = store.Events.AllKnownEventTypes().ToDictionary(t => t.EventType, t => t.EventTypeName);",
            '        Assert.Equal("empresa_registrada", alias[typeof(EmpresaRegistrada)]);',
            '        Assert.Equal("plan_cambiado",      alias[typeof(PlanCambiado)]);',
            "        // … y una línea igual por cada uno de tus otros hechos",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Sin el + 1",
      tarea:
        "Pásale a `Append` la versión leída, en vez de la que tendrá el stream tras el append.",
      pasos: [
        "Comenta los bloques que nacen `emp-7` y le agregan la reactivación: `emp-7` ya existe.",
        "En las sesiones `a` y `b`, quita el `+ 1`. Envuelve cada `SaveChangesAsync` en un `try`/`catch` que escriba la excepción.",
        "Corre `dotnet run`.",
      ],
      logro: {
        items: [
          "Fallan **los dos**: Marten compara con la versión que dejará el append.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El mismo NIT, a la vez",
      tarea:
        "Registra dos empresas con el mismo NIT al mismo tiempo, cada una en su sesión.",
      pasos: [
        "En `Program.cs`, el código de la lámina siguiente.",
        "Corre `dotnet run`, y comenta el bloque al terminar.",
      ],
      logro: {
        items: [
          "Entra **exactamente una**. Cuál de las dos, cambia de una corrida a otra.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "await Task.WhenAll(a, b)",
          explicacion:
            "espera dos tareas que corren a la vez, y devuelve sus resultados en orden.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Dos registros a la vez",
      piezas: [
        {
          etiqueta:
            "En `Program.cs`. Cada intento, en su sesión; los dos corren a la vez:",
          lenguaje: "csharp",
          lineas: [
            "async Task<string> Intentar(string id)",
            "{",
            "    await using var s = store.LightweightSession();",
            '    Sembrar(s, id, "901800000", "Ópticas del Valle", "Basico");',
            '    try { await s.SaveChangesAsync(); return $"{id}: entró"; }',
            '    catch (JasperFx.DocumentAlreadyExistsException) { return $"{id}: lanzó"; }',
            "}",
            'var resultados = await Task.WhenAll(Intentar("emp-18"), Intentar("emp-19"));',
            'Console.WriteLine(string.Join("\\n", resultados));',
          ],
        },
      ],
      luego: "Corre `dotnet run` y comenta el bloque al terminar.",
    },
    {
      tipo: "rompelo",
      titulo: "Renombra un hecho",
      tarea:
        "Dale a `emp-7` un `PlanCambiado` y luego renombra esa clase.",
      pasos: [
        "Corre una vez el `Append` de abajo y coméntalo.",
        "Con el IDE, renombra `PlanCambiado` a `PlanModificado`. Rehidrata `emp-7`.",
        'En `Hechos.Registrar`, cambia su línea por `opts.Events.MapEventType<PlanModificado>("plan_cambiado");` y rehidrata otra vez.',
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["UnknownEventTypeException"],
        },
        items: ["Con el `MapEventType`, `emp-7` vuelve a cargar con `Plan=Premium`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    s.Events.Append("emp-7", new PagoRegistrado(50_000), new EmpresaReactivada(), new PlanCambiado("Premium"));',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El swap no es rendirse, es **reconocer**: Marten hace lo nuestro, y nos quedamos con el criterio.",
      puntos: [
        {
          termino: "Reconocer",
          definicion:
            "Cada pieza tuya tiene su par en Marten: `StartStream`, `Append`, `AggregateStreamAsync`.",
        },
        {
          termino: "Lo que no se adopta solo",
          definicion:
            "El NIT único (`Insert` en la sesión del hecho) y el nombre estable (`Hechos.Registrar`).",
        },
      ],
      decision:
        "Los hechos se registran en un solo lugar, `Hechos.Registrar`, con un test que fija sus alias; si una clase cambia de nombre, `MapEventType` le conserva el alias del diario. El NIT se reserva con `Insert`, en la misma sesión que el `StartStream`.",
      commit: {
        mensaje: "ES · El swap por reconocimiento",
        preguntas: [
          "Empareja cada pieza tuya con la de Marten. ¿Qué criterio conservas que no tendrías empezando con Marten?",
        ],
      },
      siguiente: {
        seccion: "32 · El outbox",
        texto:
          "Wolverine, hermano de Marten, trae el outbox.",
      },
    },
  ],
};
