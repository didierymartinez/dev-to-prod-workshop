// Fuente: workshop-event-sourcing/taller.md, entrada "16 · La pregunta que el diario no sabe responder".
import type { Seccion } from "./tipos";

export const seccion16: Seccion = {
  numero: 16,
  titulo: "La pregunta que el diario no sabe responder",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Listar las empresas suspendidas hoy con un `SELECT` simple, gracias a una **tabla aparte** (un read model) que se actualiza al escribir.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "Operaciones quiere el listado de suspendidas.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Tienes Postgres delante. ¿Qué `SELECT` escribirías?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cuatro empresas, cuatro historias",
      tarea:
        "Vacía el diario y siembra cuatro empresas: una activa, dos suspendidas y una que se suspendió y volvió.",
      pasos: [
        'Vacía la tabla `eventos`: `docker exec empresas-db psql -U postgres -c "TRUNCATE eventos"`. Si no, sale también `emp-7`, de la sección anterior.',
        "Arriba en el `Program.cs`, debajo de donde creas el `store`, copia el helper `sembrar` y sus llamadas, de la lámina siguiente.",
        "Corre **una vez** y comenta las llamadas a `sembrar`: cada corrida las vuelve a anexar al diario.",
      ],
      logro: {
        items: ["Las suspendidas de verdad son `emp-2` y `emp-4`."],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El helper sembrar",
      piezas: [
        {
          etiqueta:
            "Arriba en el `Program.cs`, debajo de `var store = …`: el helper, que abre el stream, hace el acto y guarda.",
          lenguaje: "csharp",
          lineas: [
            "void sembrar(string id, Action<Empresa> hacer)",
            "{",
            "    var s = store.AbrirStream<Empresa>(id); var e = s.Get(); hacer(e); s.Append(e);",
            "}",
          ],
        },
        {
          etiqueta: "Y debajo, las cuatro empresas. `emp-3` se suspende y, en otro acto, paga y vuelve:",
          lenguaje: "csharp",
          lineas: [
            'sembrar("emp-1", e => e.Registrar("Andes", "Básico"));',
            'sembrar("emp-2", e => { e.Registrar("Beta", "Premium"); e.Suspender("falta de pago"); });',
            'sembrar("emp-3", e => { e.Registrar("Gamma", "Básico"); e.Suspender("falta de pago"); });',
            'sembrar("emp-3", e => { e.RegistrarPago(500); e.Reactivar(); });',
            'sembrar("emp-4", e => { e.Registrar("Delta", "Enterprise"); e.Suspender("falta de pago"); });',
          ],
        },
      ],
      luego:
        "Corre **una vez** y comenta las llamadas a `sembrar`.",
    },
    {
      tipo: "planteamiento",
      titulo: "El SELECT que miente",
      bloques: [
        {
          k: "codigo",
          lenguaje: "sql",
          lineas: [
            "SELECT DISTINCT stream FROM eventos WHERE tipo = 'empresa-suspendida';",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Antes de correrlo: ¿aparece `emp-3`?",
        },
        {
          k: "terminal",
          salida: ["emp-2, emp-3, emp-4"],
          tono: "error",
        },
        { k: "respuesta", texto: "Está mal: `emp-3` volvió." },
        {
          k: "texto",
          texto:
            "El hecho dice lo que **pasó una vez**, no lo que es **verdad hoy**. «Estar suspendida» sale de toda la historia de la empresa.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Rehidratar todas",
      tarea:
        "Lista las suspendidas rehidratando cada empresa del diario, para ver su estado de hoy.",
      pasos: [
        "En tu `EventStore`, `List<string> TodosLosStreams()`: `SELECT DISTINCT stream FROM eventos ORDER BY stream`.",
        "Arriba en el `Program.cs`, el recorrido de abajo, e imprime `suspendidas`.",
      ],
      logro: {
        items: [
          "Da bien: `emp-2`, `emp-4`.",
          "Pero rehidrata el diario de **cada** empresa, por una sola pregunta.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var suspendidas = new List<string>();",
          "foreach (var id in store.TodosLosStreams())",
          "    if (store.AbrirStream<Empresa>(id).Get().Suspendida)",
          "        suspendidas.Add(id);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Una tabla para leer",
      tarea:
        "Crea una vista: una tabla aparte con el estado de hoy de cada empresa, para leerla con un `SELECT` simple.",
      pasos: [
        "Al final del `Program.cs`, la clase `Suspendidas(string cadena)`. Su constructor crea la tabla `empresas_estado`: `id TEXT PRIMARY KEY`, `suspendida BOOL NOT NULL`.",
        "`Actualizar(string id, Empresa e)`: el upsert de `e.Suspendida` en la fila de ese `id`.",
        "`List<string> Listar()`: `SELECT id FROM empresas_estado WHERE suspendida ORDER BY id`.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "ON CONFLICT(id) DO UPDATE",
          explicacion:
            "el upsert: `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` mete la fila si no existe y la cambia si existe, sin preguntar antes.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Los handlers la mantienen",
      tarea:
        "Cada vez que un handler guarda un hecho que cambia la suspensión, actualiza también la vista.",
      pasos: [
        "`SuspenderHandler` y `PagarDeudaHandler` reciben también la vista por constructor. En cada uno, después de `stream.Append(e)`: `vista.Actualizar(cmd.EmpresaId, e)`.",
        "Arriba en el `Program.cs`: `var vista = new Suspendidas(cadena);`, con la misma `cadena` del store, y pásala a los dos handlers.",
        "Imprime `vista.Listar()` y corre.",
      ],
      logro: { items: ["`vista.Listar()` sale **vacío**."] },
      tips: [
        {
          k: "piensa",
          texto:
            "¿Por qué sale vacío, si el diario tiene dos suspendidas?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La siembra también proyecta",
      tarea:
        "La siembra escribió al diario sin llamar `Actualizar`. Haz que proyecte, y vuelve a sembrar todo.",
      pasos: [
        "Dentro de `sembrar`, después de `s.Append(e)`: `vista.Actualizar(id, e);`. Con las llamadas viejas aún comentadas, siembra `emp-5` suspendida.",
        'Borra las dos tablas: `docker exec empresas-db psql -U postgres -c "DROP TABLE eventos, empresas_estado"`. Los constructores las vuelven a crear.',
        "Descomenta la siembra, corre **una vez** y vuelve a comentarla.",
      ],
      logro: {
        items: [
          "Con `emp-5`: `vista.Listar()` da `emp-5`.",
          "Al resembrar, da las suspendidas correctas, sin rehidratar nada. `emp-3` no aparece.",
          "Suspende una empresa: aparece. Registra su pago: desaparece.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El diario sirve para **escribir**. Para leer el estado de hoy, una tabla derivada que se puede borrar y reconstruir.",
      puntos: [
        {
          termino: "Read model (proyección)",
          definicion:
            "Una vista derivada de los hechos, con la forma que una pregunta necesita.",
        },
        {
          termino: "Upsert",
          definicion:
            "`INSERT ... ON CONFLICT DO UPDATE`: mete la fila o la cambia, en una sentencia.",
        },
      ],
      decision:
        "Actualizo la vista DENTRO del handler, justo tras el `Append`, y acepto que son dos escrituras separadas.",
      commit: {
        mensaje: "ES · La pregunta que el diario no sabe responder",
        preguntas: [
          "¿Por qué «está suspendida» no sale de un `SELECT` sobre `eventos`, y sí de una tabla aparte?",
        ],
      },
      siguiente: {
        seccion: "17 · Reconstruir la vista rehidratando el diario",
        texto:
          "Operaciones pide el plan en la vista. Y las empresas que ya existen no volverán a pasar por un handler.",
      },
    },
  ],
};
