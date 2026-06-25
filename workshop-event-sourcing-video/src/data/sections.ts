// Contenido de cada sección del taller, en datos.
// Fiel a los .md de workshop-event-sourcing/secciones/ (objetivo, dolor, código real, "en una frase").
// Para añadir una sección: agrega un objeto a `sections` y aparecerá una composición nueva sola.

export type SectionCode = {
  caption: string;
  filename?: string;
  lines: string[];
};

export type Section = {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string; // hex de 6 dígitos (se le concatena alfa en estilos)
  // Puente con la sección anterior: de dónde venimos → por qué seguimos (hilo narrativo).
  bridge?: string;
  // Descubrimiento grande que esta sección hace "sentir" (salto conceptual marcado).
  discovery?: "loose-to-class" | "ifs-to-switch" | "wrapper-to-generic" | "insert-to-decide";
  // Si el descubrimiento es CONSECUENCIA del mecanismo (p. ej. §2: primero el replay
  // suelto funciona, DESPUÉS se agrupa en la clase) → va después. Por defecto va antes.
  discoveryAfterMechanism?: boolean;
  objetivo: string;
  pain: { title: string; text: string };
  // Mecanismo animado (la "evolución/flujo" del concepto, lo que de verdad enseña).
  mechanism?:
    | "diario-vs-foto"
    | "replay-evolve"
    | "engine-switch"
    | "repository"
    | "decide";
  code?: SectionCode;
  oneLiner: string;
  concepts: string[];
};

export const sections: Section[] = [
  {
    number: 1,
    slug: "el-diario-de-una-empresa",
    title: "El diario de una empresa",
    subtitle: "Guardar el diario, no la foto",
    emoji: "📔",
    accent: "#FFB454",
    objetivo:
      "Tu jefe pregunta: «¿cómo llegó esta empresa a estar suspendida?». La foto del estado actual se encoge de hombros. Para responder, necesitas el diario de todo lo que pasó.",
    pain: {
      title: "El UPDATE borra el pasado",
      text: "Cada UPDATE pisa el valor anterior: guardas el presente y, al hacerlo, pierdes la historia. Tu empresa queda con amnesia.",
    },
    mechanism: "diario-vs-foto",
    oneLiner:
      "Guardar el diario de hechos (eventos), en vez de la foto del estado, conserva toda la historia: el estado de hoy se reconstruye, pero el pasado ya no se pierde. Eso es Event Sourcing.",
    concepts: ["Event Sourcing", "Evento", "El diario vs la foto"],
  },
  {
    number: 2,
    slug: "los-primeros-hechos",
    title: "Los primeros hechos",
    subtitle: "Reconstruir el estado, no guardarlo",
    emoji: "⏪",
    accent: "#4ECDC4",
    mechanism: "replay-evolve",
    discovery: "loose-to-class",
    discoveryAfterMechanism: true,
    bridge:
      "Ya decidimos guardar el diario, no la foto. Pero, ¿cómo recalculo el estado de hoy en código —leyendo esos hechos— en vez de guardarlo?",
    objetivo:
      "¿Cómo recalculo el estado de hoy leyendo el diario, en vez de guardarlo? Recorriendo los hechos de principio a fin y acumulando.",
    pain: {
      title: "Guardar el estado es volver a la foto",
      text: "Guardar Plan = «Premium» en una variable vuelve a perder el pasado. El estado hay que derivarlo de los hechos, no almacenarlo.",
    },
    code: {
      caption:
        "Un hecho es un record inmutable (el pasado en piedra). El Replay recorre los hechos y acumula el estado: ese paso (estado, hecho) → nuevo estado es evolve.",
      filename: "Program.cs",
      lines: [
        "// un hecho es un record inmutable: el pasado queda en piedra",
        "public record EmpresaRegistrada(string Nombre, string Plan);",
        "public record PlanCambiado(string NuevoPlan);",
        "public record EmpresaSuspendida(string Motivo);",
        "",
        "// Replay: recorrer los hechos y acumular el estado (evolve)",
        "foreach (var hecho in historia)",
        "{",
        "    if (hecho is EmpresaRegistrada r) { nombre = r.Nombre; plan = r.Plan; }",
        "    if (hecho is PlanCambiado p)      { plan = p.NuevoPlan; }",
        "    if (hecho is EmpresaSuspendida)   { suspendida = true; }",
        "}",
      ],
    },
    oneLiner:
      "Un hecho es un record inmutable; una secuencia ordenada de hechos es un Stream (la fuente de la verdad); recorrerlo aplicando cada hecho —el paso evolve— es el Replay. Reconstruir, no guardar.",
    concepts: ["record (inmutable)", "Stream", "Replay", "evolve", "Aggregate Root"],
  },
  {
    number: 3,
    slug: "refactorizando-el-motor",
    title: "Refactorizando el motor",
    subtitle: "Un motor de replay reutilizable",
    emoji: "⚙️",
    accent: "#C792EA",
    mechanism: "engine-switch",
    bridge:
      "Reconstruir funcionó con un foreach lleno de ifs. Pero ese if crece feo: un hecho nuevo es otro if, y con una Factura copiarías todo el bucle. Vamos a domarlo.",
    objetivo:
      "Que el motor que lee la historia y reconstruye el estado sea limpio (no un if interminable) y reutilizable: que sirva para la Empresa hoy y para una Factura mañana, sin copiar y pegar.",
    pain: {
      title: "El if que crece feo",
      text: "Un if por cada hecho; y el día que tengas una Factura, copiarías todo el bucle. La mecánica común —recorrer— debe vivir una sola vez.",
    },
    code: {
      caption:
        "El motor (Load) vive una vez en una clase base abstracta; cada hija enruta sus propios hechos con un switch por tipo (pattern matching), no con un if que crece.",
      filename: "Program.cs",
      lines: [
        "public abstract class AggregateRoot",
        "{",
        "    // el motor genérico: se escribe UNA vez; toda hija lo hereda",
        "    public void Load(IEnumerable<object> historia)",
        "    {",
        "        foreach (var hecho in historia) Aplicar(hecho);",
        "    }",
        "    protected abstract void Aplicar(object hecho);",
        "}",
        "",
        "public class Empresa : AggregateRoot",
        "{",
        "    protected override void Aplicar(object hecho)",
        "    {",
        "        switch (hecho)",
        "        {",
        "            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;",
        "            case PlanCambiado p:      Plan = p.NuevoPlan;                break;",
        "            case EmpresaSuspendida:   Suspendida = true;                break;",
        "        }",
        "    }",
        "}",
      ],
    },
    oneLiner:
      "El motor de replay es igual para toda entidad, así que vive una sola vez en una clase base abstracta AggregateRoot; lo propio de cada una —cómo aplica sus hechos— se resuelve con un switch por tipo.",
    concepts: [
      "Separación de responsabilidades",
      "Herencia (clase abstracta)",
      "Pattern matching",
      "AggregateRoot",
    ],
  },
  {
    number: 4,
    slug: "el-flujo-de-vida",
    title: "El flujo de vida",
    subtitle: "El Repositorio: dueño de la historia",
    emoji: "📦",
    accent: "#6BCB77",
    mechanism: "repository",
    discovery: "wrapper-to-generic",
    bridge:
      "Ya tienes un motor de replay limpio. Pero para «despertar» a la empresa todavía le pasas a mano una lista cruda de hechos. Vamos a encapsularla.",
    objetivo:
      "Dejar de manosear listas crudas: un envoltorio que sea dueño de la historia de una empresa y exponga solo dos puertas — «anota esto» (Append) y «dame la empresa» (Get).",
    pain: {
      title: "Un envoltorio por cada agregado",
      text: "El día que tengas una Factura, copiarías EventStreamDeEmpresa entero. Lo único que cambia es el tipo → un genérico lo parametriza.",
    },
    code: {
      caption:
        "EventStream<T> genérico: dueño de la lista escondida, Append para anotar y Get para instanciar y rehidratar. Es el patrón Repositorio.",
      filename: "Program.cs",
      lines: [
        "public class EventStream<T> where T : AggregateRoot, new()",
        "{",
        "    private readonly List<object> _historia = new();   // dueño de su historia",
        "",
        "    public void Append(object hecho) => _historia.Add(hecho);   // ESCRIBIR",
        "",
        "    public T Get()                                              // LEER",
        "    {",
        "        var entidad = new T();",
        "        entidad.Load(_historia);   // reproduce la historia",
        "        return entidad;",
        "    }",
        "}",
      ],
    },
    oneLiner:
      "La historia de una empresa se envuelve en un EventStream<T> genérico (un Repositorio) dueño de la lista de hechos: anotas con Append y lees con Get (que instancia y rehidrata), sin que la lista cruda ande suelta.",
    concepts: ["Repositorio", "Event Stream", "Genéricos con restricción"],
  },
  {
    number: 5,
    slug: "decidir-el-futuro",
    title: "Decidir el futuro",
    subtitle: "El agregado decide y emite",
    emoji: "🧭",
    accent: "#FF8B6B",
    mechanism: "decide",
    discovery: "insert-to-decide",
    bridge:
      "Ya lees y escribes la historia con el stream. Pero los hechos los fabricas a mano desde afuera, sin que nadie vigile las reglas. ¿Quién decide que la empresa puede cambiar?",
    objetivo:
      "Que la Empresa emita sus propios hechos —protegiendo sus reglas— en vez de que se los insertemos por la fuerza con Append. La empresa decide; no le insertan hechos.",
    pain: {
      title: "¿Y si la misma orden llega dos veces?",
      text: "CambiarPlan emite sin mirar el estado: se suspende dos veces, o se cambia el plan de una suspendida. La defensa nace dentro del agregado, antes de emitir.",
    },
    code: {
      caption:
        "decide (gemela de evolve): el agregado decide y devuelve el hecho —sin tocar el estado—; rechaza lo inválido (validación) e ignora lo redundante (idempotencia).",
      filename: "Program.cs",
      lines: [
        "public PlanCambiado CambiarPlan(string nuevoPlan)",
        "{",
        "    // VALIDACIÓN: operación inválida → se RECHAZA (es un error)",
        "    if (Suspendida)",
        '        throw new ReglaDeNegocioException("...");',
        "    return new PlanCambiado(nuevoPlan);",
        "}",
        "",
        "public EmpresaSuspendida? Suspender(string motivo)",
        "{",
        "    // IDEMPOTENCIA: válida pero redundante → NO-OP (no es error)",
        "    if (Suspendida) return null;",
        "    return new EmpresaSuspendida(motivo);",
        "}",
      ],
    },
    oneLiner:
      "El agregado decide (estado + intención → hecho) protegiendo sus reglas y solo emite el hecho; el EventStream lo guarda; el estado cambia al aplicarlo. Rechazar lo inválido es validación; ignorar lo redundante, idempotencia.",
    concepts: ["decide", "Patrón Decider", "Validación", "Idempotencia"],
  },
];
