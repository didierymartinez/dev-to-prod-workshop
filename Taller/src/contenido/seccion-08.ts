// Fuente: workshop-event-sourcing/taller.md, entrada "8 · El almacén: un cajón por empresa".
import type { Seccion } from "./tipos";

export const seccion08: Seccion = {
  numero: 8,
  titulo: "El almacén: un cajón por empresa",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Un `EventStore` que guarda la historia de cada empresa en **su propio cajón**, por id, y handlers registrados **una sola vez** que sirven a todas.",
    },
    {
      tipo: "planteamiento",
      titulo: "Llega la segunda empresa",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Nace la segunda empresa, con su `stream2`. ¿Registramos otra vez el handler?",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "despachador.Registrar(new SuspenderHandler(stream1));",
            "despachador.Registrar(new SuspenderHandler(stream2));",
          ],
        },
        {
          k: "respuesta",
          texto:
            "Es la misma llave, `typeof(SuspenderEmpresa)`: el segundo pisa al primero, sin dar error.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "No caben dos empresas en un despachador. La causa: el handler está **atado a un stream**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un cajón por empresa",
      tarea:
        "Crea un almacén que guarde los hechos de cada empresa en su propio cajón, rotulado con su id.",
      pasos: [
        "**Al final**: `public class EventStore`, con un `Dictionary<string, List<object>>` privado. La llave es el id.",
        "`GetEvents(string aggregateId)` devuelve el cajón, o una lista vacía si no existe.",
        "`AppendEvent(string aggregateId, object hecho)` crea el cajón si no existe y le agrega el hecho.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nota",
          texto:
            "El handler no llama a `GetEvents` ni a `AppendEvent`. Esos métodos los usa el `EventStream`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un cajón por empresa",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`: el almacén",
          lenguaje: "csharp",
          lineas: [
            "public class EventStore",
            "{",
            "    private readonly Dictionary<string, List<object>> _cajones = new();",
            "",
            "    public List<object> GetEvents(string aggregateId)",
            "        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();",
            "",
            "    public void AppendEvent(string aggregateId, object hecho)",
            "    {",
            "        if (!_cajones.ContainsKey(aggregateId))   // 1ª vez: crea el cajón EN el diccionario",
            "            _cajones[aggregateId] = new();",
            "        _cajones[aggregateId].Add(hecho);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "`_cajones[id]` lanza `KeyNotFoundException` si la llave no existe: por eso `GetEvents` comprueba con `ContainsKey`.",
    },
    {
      tipo: "reto",
      titulo: "El stream delega",
      tarea:
        "`EventStream<T>` deja de guardar su lista: lee y escribe el cajón de una empresa en el almacén.",
      pasos: [
        "En `EventStream<T>`, borra la lista. El constructor recibe `(EventStore store, string aggregateId)` y los guarda en campos.",
        "`Get()` pide `store.GetEvents(id)` y rehidrata con eso.",
        "`Append(hecho)` llama a `store.AppendEvent(id, hecho)`.",
      ],
      logro: {
        items: ["Solo falla el `new EventStream<Empresa>()` de arriba."],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El stream delega",
      piezas: [
        {
          etiqueta: "Reemplaza tu `EventStream<T>`: ya no guarda la lista",
          lenguaje: "csharp",
          lineas: [
            "// 🔁 Reemplaza el EventStream<T> de «El flujo de vida»: ya no guarda la lista; habla con el almacén",
            "public class EventStream<T> where T : AggregateRoot, new()",
            "{",
            "    private readonly EventStore _store;",
            "    private readonly string _aggregateId;",
            "",
            "    public EventStream(EventStore store, string aggregateId)",
            "    {",
            "        _store = store;",
            "        _aggregateId = aggregateId;",
            "    }",
            "",
            "    public T Get()                       // LEER: trae los hechos del cajón y rehidrata",
            "    {",
            "        var entidad = new T();",
            "        entidad.Load(_store.GetEvents(_aggregateId));",
            "        return entidad;",
            "    }",
            "",
            "    public void Append(object hecho)     // ESCRIBIR: al cajón de esta empresa",
            "        => _store.AppendEvent(_aggregateId, hecho);",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El almacén te entrega el stream",
      tarea:
        "Pídele al almacén el stream de un id, en vez de armarlo a mano.",
      pasos: [
        "En `EventStore`: `AbrirStream<T>(string aggregateId)`, con el mismo `where` de `EventStream<T>`, que devuelve `new(this, aggregateId)`.",
        "**Arriba**, cambia todo el código suelto por el ejemplo.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Constructora Andes"],
          tono: "ok",
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "new(this, aggregateId)",
          explicacion:
            "crea el objeto sin repetir el tipo. Dentro de `EventStore`, `this` es el propio almacén.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = new EventStore();",
          'var s = store.AbrirStream<Empresa>("emp-7");',
          's.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
          'Console.WriteLine(store.AbrirStream<Empresa>("emp-7").Get().Nombre);',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El almacén te entrega el stream",
      piezas: [
        {
          etiqueta: "Dentro de `EventStore`",
          lenguaje: "csharp",
          lineas: [
            "// AbrirStream vive en EventStore, así que this = el propio almacén; se lo pasamos al stream para que sepa a quién llamar",
            "public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()",
            "    => new(this, aggregateId);",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El comando dice qué empresa",
      tarea:
        "Que un solo handler sirva a todas las empresas: recibe el almacén y abre la empresa que dice el comando.",
      pasos: [
        "Los comandos ganan el id: `CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan)` y `SuspenderEmpresa(string EmpresaId, string Motivo)`.",
        "Los dos handlers reciben `EventStore store` por constructor, en vez del stream.",
        "En su `Handle`, abren la empresa con `store.AbrirStream<Empresa>(cmd.EmpresaId)`.",
      ],
      logro: { items: ["Compila."] },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El comando dice qué empresa",
      piezas: [
        {
          etiqueta: "Los comandos, con su id",
          lenguaje: "csharp",
          lineas: [
            "// 🔁 el comando ahora dice de QUÉ empresa habla",
            "public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);",
            "public record SuspenderEmpresa(string EmpresaId, string Motivo);",
          ],
        },
        {
          etiqueta: "El handler recibe el almacén y abre la empresa por id",
          lenguaje: "csharp",
          lineas: [
            "// 🔁 el handler recibe el almacén y abre el stream por id",
            "public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>",
            "{",
            "    public void Handle(SuspenderEmpresa cmd)",
            "    {",
            "        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);   // buscar por id",
            "        var empresa = stream.Get();",
            "        var hecho   = empresa.Suspender(cmd.Motivo);",
            "        if (hecho is not null) stream.Append(hecho);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "`CambiarPlanHandler` cambia **igual**: recibe el `EventStore`, abre por `cmd.EmpresaId` y lee `cmd.NuevoPlan`.",
    },
    {
      tipo: "reto",
      titulo: "Un almacén, muchas empresas",
      tarea:
        "Arriba, un almacén y un despachador con los handlers registrados **una vez**, y comandos para dos empresas.",
      pasos: [
        "**Arriba**, cambia el código suelto por el ejemplo.",
        "Sigue el id: `AbrirStream(id)` → `AppendEvent(id, …)` → `_cajones[id]`. Es el mismo string en todo el camino.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["emp-7: suspendida=True"],
          tono: "ok",
        },
        items: ["Los handlers se registran una sola vez, con el `store`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = new EventStore();",
          "var despachador = new Despachador();",
          "despachador.Registrar(new SuspenderHandler(store));",
          "despachador.Registrar(new CambiarPlanHandler(store));",
          'despachador.Enviar(new SuspenderEmpresa("emp-7", "falta de pago"));',
          'despachador.Enviar(new CambiarPlanDeEmpresa("emp-9", "Premium"));',
          'var andes = store.AbrirStream<Empresa>("emp-7").Get();',
          'Console.WriteLine($"emp-7: suspendida={andes.Suspendida}");',
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El almacén guarda un cajón de hechos por id; el stream que entrega lee y escribe el de una empresa; el handler, registrado una vez, la busca por el `EmpresaId` del comando.",
      puntos: [
        {
          termino: "EventStore",
          definicion: "El almacén: un cajón de hechos por id.",
        },
        {
          termino: "EventStream<T>",
          definicion:
            "Lo entrega el almacén con `AbrirStream`. Lee y escribe el cajón de una empresa.",
        },
        {
          termino: "Handler",
          definicion:
            "Recibe el almacén, no un stream: se registra una vez y sirve a todas las empresas.",
        },
      ],
      commit: {
        mensaje: "ES · El almacén: un cajón por empresa",
        preguntas: [
          "¿Por qué atar los handlers a un stream no escalaba a dos empresas?",
          "¿Cómo viaja el mismo id desde `AbrirStream` hasta la llave del cajón?",
        ],
      },
      siguiente: {
        seccion: "9 · Cuando dos escriben a la vez (concurrencia optimista)",
        texto:
          "Ahora muchas peticiones usan el mismo almacén. ¿Qué pasa si dos tocan la misma empresa a la vez?",
      },
    },
  ],
};
