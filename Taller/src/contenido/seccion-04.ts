// Fuente: workshop-event-sourcing/taller.md, entrada "4 · El flujo de vida (EventStream)".
import type { Seccion } from "./tipos";

export const seccion04: Seccion = {
  numero: 4,
  titulo: "El flujo de vida (EventStream)",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Dejar de pasar listas crudas. Un `EventStream<T>` es dueño de la historia y solo deja **anotar** (`Append`) y **leer** la entidad ya reconstruida (`Get`).",
    },
    {
      tipo: "planteamiento",
      titulo: "¿Quién es dueño de la historia?",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var historia = new List<object> { /* los hechos */ };",
            'historia.Add("hola");',
            "var empresa = new Empresa(historia);",
          ],
        },
        {
          k: "respuesta",
          texto: "Compila y corre. Nadie protege la lista.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Y quien quiere la empresa tiene que saber armarla con `new Empresa(historia)`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Quién debería ser dueño de la historia?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un dueño para la historia",
      tarea:
        "Crea `EventStreamDeEmpresa`: una clase que guarda la historia escondida, deja anotar hechos y entrega la `Empresa` ya rehidratada.",
      pasos: [
        "**Al final** del `Program.cs`: `public class EventStreamDeEmpresa`, con su propia `List<object>` privada, que nace vacía.",
        "`Append(object hecho)` agrega el hecho a la lista. `Get()` crea una `Empresa` vacía, le llama `Load` con la lista y la devuelve.",
        "En `Empresa`, quita el constructor que recibía la historia y pon `public Empresa() { }`.",
      ],
      logro: {
        items: [
          "Solo falla el `new Empresa(historia)` de arriba: lo cambias por el stream pronto.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "La historia de una sola empresa es un **Event Stream**. No es el `System.IO.Stream` de C#, que mueve bytes.",
        },
        {
          k: "nota",
          texto:
            "Esta clase es un andamio: más adelante una librería hará este trabajo.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un dueño para la historia",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`: el envoltorio",
          lenguaje: "csharp",
          lineas: [
            "// 🟢 primer intento: un envoltorio solo para Empresa, dueño de su historia",
            "public class EventStreamDeEmpresa",
            "{",
            "    private readonly List<object> _historia = new();   // suya, escondida, nace vacía",
            "",
            "    public void Append(object hecho) => _historia.Add(hecho);   // ANOTAR un hecho nuevo",
            "",
            "    public Empresa Get()                                        // LEER: rehidratar",
            "    {",
            "        var empresa = new Empresa();",
            "        empresa.Load(_historia);   // reproduce los hechos anotados",
            "        return empresa;",
            "    }",
            "}",
          ],
        },
        {
          etiqueta: "En tu `Empresa`, el constructor ya no recibe la historia",
          lenguaje: "csharp",
          lineas: [
            "public class Empresa : AggregateRoot",
            "{",
            "    // … propiedades y el switch Aplicar de «Refactorizando el motor», sin cambios …",
            "    public Empresa() { }   // sin parámetros: el envoltorio la crea vacía y la rehidrata",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "De Empresa a <T>",
      piezas: [
        {
          etiqueta:
            "Con una `Factura` copiarías la clase entera cambiando solo el tipo. **Al final** del `Program.cs`, la versión genérica: «De Empresa» se vuelve `<Empresa>`, y en la clase es `<T>`.",
          lenguaje: "csharp",
          lineas: [
            "public class EventStream<T> where T : AggregateRoot, new()",
            "{",
            "    private readonly List<object> _historia = new();",
            "",
            "    public void Append(object hecho) => _historia.Add(hecho);",
            "",
            "    public T Get()",
            "    {",
            "        var entidad = new T();",
            "        entidad.Load(_historia);",
            "        return entidad;",
            "    }",
            "}",
          ],
        },
      ],
      luego:
        "El `where` exige que `T` sea un `AggregateRoot` (para llamar `.Load`) y tenga un constructor sin parámetros (para `new T()`). Luego borra `EventStreamDeEmpresa`.",
    },
    {
      tipo: "reto",
      titulo: "Anota y lee",
      tarea:
        "Arriba en el `Program.cs`, cambia la lista suelta y el `new Empresa(historia)` por un stream: anota dos hechos y pide la empresa.",
      pasos: [
        "**Arriba**, borra la `historia` y el `new Empresa(historia)`. En su lugar, `var stream = new EventStream<Empresa>();`",
        'Dos `Append`: `new EmpresaRegistrada("Constructora Andes", "Básico")` y `new PlanCambiado("Premium")`.',
        '`var empresa = stream.Get();` e imprime `$"{empresa.Nombre}: plan {empresa.Plan}"`.',
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Constructora Andes: plan Premium"],
          tono: "ok",
        },
        items: [
          "Ya no queda `EventStreamDeEmpresa` ni ningún `new List<object>{ … }`.",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Anota y lee",
      piezas: [
        {
          etiqueta: "**Arriba** en el `Program.cs`, en vez de la lista suelta",
          lenguaje: "csharp",
          lineas: [
            "var stream = new EventStream<Empresa>();",
            'stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));   // anota',
            'stream.Append(new PlanCambiado("Premium"));                            // anota',
            "",
            "var empresa = stream.Get();   // lee: crea y rehidrata",
            'Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}");',
          ],
        },
      ],
      nota: "Quien consume ya no sabe cómo se guarda ni cómo se rehidrata: `Append` para anotar, `.Get()` para recibir la `Empresa`.",
    },
    {
      tipo: "reto",
      titulo: "Lo que exige el where",
      tarea:
        "Comprueba que el compilador hace cumplir las dos condiciones del `where`.",
      pasos: [
        "Escribe `new EventStream<string>()` y mira el error. Luego bórralo.",
        "En `Empresa`, cambia `public Empresa() { }` por `private Empresa() { }`.",
        "Mira el error en `new EventStream<Empresa>()`, y vuelve a `public`.",
      ],
      logro: {
        items: [
          "`new EventStream<string>()` **no compila**.",
          "Con el constructor `private`, sale `CS0310`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "`CS0310`: el `new()` del `where` pide un constructor **público** sin parámetros.",
        },
        {
          k: "nota",
          texto:
            "Si borras el constructor en vez de volverlo privado, compila: C# le da uno vacío a la clase que no declara ninguno.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "El `EventStream<T>` es dueño de la historia: se anota con `Append` y se lee con `Get`, sin listas sueltas.",
      puntos: [
        {
          termino: "Event Stream",
          definicion:
            "La historia de hechos de una sola entidad. No es el `System.IO.Stream` de C#.",
        },
        {
          termino: "Repositorio",
          definicion:
            "Un envoltorio que esconde la lista de eventos y te entrega el objeto. Es el mismo `EventStream<T>`, con otro nombre.",
        },
        {
          termino: "Pregunta abierta",
          definicion:
            "Hoy, ¿quién decide qué hechos se anotan? Nosotros, a mano, y nadie valida nada.",
        },
      ],
      commit: {
        mensaje: "ES · El flujo de vida",
        preguntas: [
          "¿Por qué `new EventStream<string>()` no compila?",
          "Hoy, ¿quién decide qué hechos se anotan?",
        ],
      },
      siguiente: {
        seccion: "5 · Decidir el futuro (emitir eventos)",
        texto:
          "El stream anota lo que le demos. ¿Quién impide suspender dos veces, o cambiar el plan de una empresa suspendida? En la siguiente, decide la empresa.",
      },
    },
  ],
};
