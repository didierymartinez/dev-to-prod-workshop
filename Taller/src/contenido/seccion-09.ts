// Fuente: workshop-event-sourcing/taller.md, entrada "9 · Cuando dos escriben a la vez (concurrencia optimista)".
import type { Seccion } from "./tipos";

export const seccion09: Seccion = {
  numero: 9,
  titulo: "Cuando dos escriben a la vez (concurrencia optimista)",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Numerar cada hecho con su **versión** y rechazar la escritura que llega tarde: **concurrencia optimista**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Dos peticiones cargan Constructora Andes al mismo tiempo. Una la suspende. La otra le cambia el plan mirando una empresa que ya no está activa.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Quién se entera?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La actualización perdida",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'var a = store.AbrirStream<Empresa>("emp-7");',
            'var b = store.AbrirStream<Empresa>("emp-7");',
            "a.Get(); b.Get();",
            'a.Append(new EmpresaSuspendida("falta de pago"));',
            'b.Append(new PlanCambiado("Enterprise"));',
          ],
        },
        { k: "respuesta", texto: "Las dos entran sin error." },
        {
          k: "texto",
          tam: "grande",
          texto:
            "B decidió sobre un estado viejo: es una **actualización perdida**, y nadie se enteró.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Numera cada hecho",
      tarea:
        "Cada hecho dice qué posición cree ocupar en la historia de su empresa: su **versión**. Si esa posición ya está tomada, alguien escribió primero, y se rechaza.",
      pasos: [
        "**Al final**, el sobre y la excepción del ejemplo.",
        "`EventStore` guarda `List<EventoAlmacenado>`, y `GetEvents` devuelve los sobres.",
        "`AppendEvent(id, EventoAlmacenado sobre)`: si `sobre.Version <= cajon.Count`, lanza `ConcurrencyException` con el mensaje del ejemplo.",
      ],
      logro: {
        items: ["Solo falla `EventStream<T>`, que aún envía el hecho sin sobre."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El sobre no lleva el id: el cajón ya es de una empresa.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public record EventoAlmacenado(int Version, object EventData);",
          "public class ConcurrencyException(string mensaje) : Exception(mensaje);",
          "",
          '$"La versión {sobre.Version} ya está ocupada (el cajón va en {cajon.Count}). " +',
          '"Alguien escribió mientras trabajabas — recarga la empresa y reintenta."',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Numera cada hecho",
      piezas: [
        {
          etiqueta: "Reemplaza tu `EventStore`: guarda sobres y valida la versión",
          lenguaje: "csharp",
          lineas: [
            "// 🔁 EventStore: ahora guarda sobres y valida la versión antes de aceptar",
            "public class EventStore",
            "{",
            "    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();",
            "",
            "    public List<EventoAlmacenado> GetEvents(string aggregateId)",
            "        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();",
            "",
            "    public void AppendEvent(string aggregateId, EventoAlmacenado sobre)",
            "    {",
            "        if (!_cajones.ContainsKey(aggregateId))",
            "            _cajones[aggregateId] = new();",
            "        var cajon = _cajones[aggregateId];",
            "",
            "        if (sobre.Version <= cajon.Count)   // esa posición ya está ocupada → alguien escribió primero",
            "            throw new ConcurrencyException(",
            '                $"La versión {sobre.Version} ya está ocupada (el cajón va en {cajon.Count}). " +',
            '                "Alguien escribió mientras trabajabas — recarga la empresa y reintenta.");',
            "",
            "        cajon.Add(sobre);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El stream numera",
      tarea:
        "El stream recuerda en qué versión cargó la empresa y numera cada hecho que agrega.",
      pasos: [
        "En `EventStream<T>`, un campo `private int _version;`.",
        "`Get`: guarda `_version = sobres.Count` y pasa a `Load` los hechos sin sobre.",
        "`Append`: hace `_version++` y envía `new EventoAlmacenado(_version, hecho)`.",
      ],
      logro: {
        items: ["Con un solo escritor, los hechos entran en las versiones 1, 2, 3."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "sobres.Select(s => s.EventData)",
          explicacion: "devuelve solo el hecho de cada sobre.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El stream numera (1 de 2)",
      piezas: [
        {
          etiqueta: "Reemplaza tu `EventStream<T>`: al leer, desenvuelve y recuerda la versión",
          lenguaje: "csharp",
          lineas: [
            "// 🔁 EventStream: numera cada hecho con el sobre; desenvuelve al leer",
            "public class EventStream<T> where T : AggregateRoot, new()",
            "{",
            "    private readonly EventStore _store;",
            "    private readonly string _aggregateId;",
            "    private int _version;                 // cuántos hechos había cuando cargué",
            "",
            "    public EventStream(EventStore store, string aggregateId)",
            "    {",
            "        _store = store;",
            "        _aggregateId = aggregateId;",
            "    }",
            "",
            "    public T Get()",
            "    {",
            "        var entidad = new T();",
            "        var sobres  = _store.GetEvents(_aggregateId);",
            "        entidad.Load(sobres.Select(s => s.EventData));   // desenvuelve: solo el hecho",
            "        _version = sobres.Count;                          // recuerda la posición en que cargué",
            "        return entidad;",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El stream numera (2 de 2)",
      piezas: [
        {
          etiqueta: "Y, en la misma clase, el `Append`: numera cada hecho con el sobre",
          lenguaje: "csharp",
          lineas: [
            "    public void Append(object hecho)",
            "    {",
            "        _version++;                                       // este hecho ocupa la siguiente posición",
            "        _store.AppendEvent(_aggregateId, new EventoAlmacenado(_version, hecho));",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos escritores, otra vez",
      tarea:
        "Repite el choque sobre un almacén limpio. Ahora la escritura que llega tarde se rechaza.",
      pasos: [
        "**Arriba**, cambia el código suelto por el ejemplo.",
        "`a` y `b` cargan en la versión 1. `a` escribe la 2; `b` también trae la 2.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "ConcurrencyException: La versión 2 ya está ocupada (el cajón va en 2)…",
          ],
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = new EventStore();",
          'store.AbrirStream<Empresa>("emp-7")',
          '     .Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
          'var a = store.AbrirStream<Empresa>("emp-7");',
          'var b = store.AbrirStream<Empresa>("emp-7");',
          "a.Get(); b.Get();",
          'a.Append(new EmpresaSuspendida("falta de pago"));',
          'b.Append(new PlanCambiado("Enterprise"));',
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La versión es el detector de choques: no bloquea, verifica al guardar.",
      puntos: [
        {
          termino: "Versión",
          definicion:
            "La posición de cada hecho en la historia de su empresa: 1.º, 2.º…",
        },
        {
          termino: "Actualización perdida",
          definicion:
            "Decidir sobre un estado viejo y escribir sin que nadie se entere.",
        },
        {
          termino: "Concurrencia optimista",
          definicion:
            "No bloquea a nadie: verifica la versión al guardar. Si hay choque, se recarga, se vuelve a decidir y se reintenta.",
        },
      ],
      commit: {
        mensaje: "ES · Concurrencia optimista",
        preguntas: [
          "Con dos streams de la misma empresa, ¿qué excepción salta y por qué?",
          "¿Qué habría pasado sin la versión?",
        ],
      },
      siguiente: {
        seccion: "10 · Un acto de negocio, dos hechos",
        texto:
          "El motor decide, valida y versiona. Pero todas sus acciones producen un solo hecho. ¿Hay alguna que produzca dos?",
      },
    },
  ],
};
