// Fuente: workshop-event-sourcing/taller.md, entrada "5 · Decidir el futuro (emitir eventos)".
import type { Seccion } from "./tipos";

export const seccion05: Seccion = {
  numero: 5,
  titulo: "Decidir el futuro (emitir eventos)",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que la `Empresa` **decida** y devuelva sus propios hechos, protegiendo sus reglas, y armar el ciclo **cargar → actuar → guardar**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Quién decide si una empresa puede cambiar de plan?",
        },
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "¿Un `new PlanCambiado` suelto en el `Program.cs`?",
            "¿O la empresa?",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La empresa decide",
      tarea:
        'Que pedirle algo a la empresa **devuelva** el hecho, sin tocar su estado: `PlanCambiado h = empresa.CambiarPlan("Enterprise");`',
      pasos: [
        "En `Empresa`, tres métodos: `CambiarPlan(string nuevoPlan)` → `PlanCambiado`, `Suspender(string motivo)` → `EmpresaSuspendida`, `Reactivar()` → `EmpresaReactivada`.",
        "Ninguno asigna una propiedad: solo crea el hecho y lo devuelve.",
      ],
      logro: {
        items: [
          "Compila.",
          "`CambiarPlan` no tiene ninguna línea que asigne `Plan`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "La empresa decide y **devuelve** el hecho. No guarda la lista (eso es del stream) y no toca sus propiedades.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa decide",
      piezas: [
        {
          etiqueta: "En tu `Empresa`, los tres métodos",
          lenguaje: "csharp",
          lineas: [
            "public class Empresa : AggregateRoot",
            "{",
            "    // … propiedades y el switch Aplicar de «Refactorizando el motor», sin cambios …",
            "",
            "    public PlanCambiado      CambiarPlan(string nuevoPlan) => new(nuevoPlan);",
            "    public EmpresaSuspendida Suspender(string motivo)      => new(motivo);",
            "    public EmpresaReactivada Reactivar()                   => new();",
            "}",
          ],
        },
      ],
      nota: "`CambiarPlan` no toca `Plan`: el estado cambia solo cuando el hecho se **aplica** al rehidratar. Decidir y aplicar son dos cosas separadas.",
    },
    {
      tipo: "reto",
      titulo: "Cargar, actuar, guardar",
      tarea:
        "Arriba en el `Program.cs`, cambia la demo anterior por el ciclo: cargar la empresa, pedirle que decida y guardar el hecho que devuelve.",
      pasos: [
        "**Arriba**, borra la demo anterior (el stream con sus dos `Append` y el `WriteLine`) y escribe el ciclo del ejemplo.",
        "Corre `dotnet run`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["[después] plan Enterprise"],
          tono: "ok",
        },
        items: [
          "El objeto `empresa` que cargaste no cambió: el cambio vive en el diario, y aparece al recargar.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var stream = new EventStream<Empresa>();",
          'stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
          "var empresa = stream.Get();                      // cargar",
          'var hecho = empresa.CambiarPlan("Enterprise");   // actuar',
          "stream.Append(hecho);                            // guardar",
          "var verificacion = stream.Get();                 // recargar",
          'Console.WriteLine($"[después] plan {verificacion.Plan}");',
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Tres tipos de mensaje",
      bloques: [
        {
          k: "tabla",
          columnas: ["Tipo", "Qué es", "Lo reciben", "¿Se rechaza?", "Ejemplo"],
          filas: [
            ["Comando", "intención", "1 handler", "Sí", "CambiarPlan"],
            ["Evento", "un hecho ocurrido", "0..N", "No", "PlanCambiado"],
            ["Query", "pregunta", "1, y responde", "No aplica", "ObtenerEmpresa"],
          ],
        },
        {
          k: "texto",
          texto:
            "Por ahora, la intención es un **método** de la empresa (`CambiarPlan`).",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La misma orden, dos veces",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var orden1 = stream.Get();",
            'stream.Append(orden1.Suspender("falta de pago"));',
            "",
            "var orden2 = stream.Get();",
            'stream.Append(orden2.Suspender("falta de pago"));',
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "Doble clic, o la red reintenta. Cada orden carga, actúa y guarda.",
        },
        {
          k: "respuesta",
          texto:
            "El diario queda con **dos** suspensiones. Y nada impide cambiar el plan de una empresa suspendida.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "¿Dónde va la guarda?",
      bloques: [
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "¿En `CambiarPlan`, que decide?",
            "¿O en el `switch` de `Aplicar`, que aplica el hecho al rehidratar?",
          ],
        },
        {
          k: "respuesta",
          texto: "En `CambiarPlan`.",
        },
        {
          k: "texto",
          tam: "grande",
          junto: true,
          texto:
            "Si `Aplicar` rechazara hechos, una historia ya guardada no se podría rehidratar.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Las guardas",
      tarea:
        "La empresa protege sus reglas **antes** de emitir: cambiar el plan de una suspendida es un error; suspender una ya suspendida no emite nada.",
      pasos: [
        "**Al final** del `Program.cs`, con las demás clases, la excepción del ejemplo.",
        "En `CambiarPlan`: si `Suspendida`, lanza una `ReglaDeNegocioException` con «No se puede cambiar el plan de una empresa suspendida.»",
        "`Suspender` pasa a devolver `EmpresaSuspendida?`, y devuelve `null` si ya está `Suspendida`.",
      ],
      logro: { items: ["Compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "class X(string mensaje)",
          explicacion:
            "constructor primario: el parámetro va en la cabecera de la clase, sin campo ni constructor aparte. `: Exception(mensaje)` se lo pasa a la base.",
        },
        {
          k: "nuevo",
          idioma: "EmpresaSuspendida?",
          explicacion: "el valor puede ser `null`: aquí, «no emití ningún hecho».",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Las guardas",
      piezas: [
        {
          etiqueta: "En tu `Empresa`, reemplaza esos dos métodos",
          lenguaje: "csharp",
          lineas: [
            "public PlanCambiado CambiarPlan(string nuevoPlan)",
            "{",
            "    // (a) VALIDACIÓN — la operación es inválida → se RECHAZA (es un error)",
            "    if (Suspendida)",
            '        throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");',
            "",
            "    return new PlanCambiado(nuevoPlan);",
            "}",
            "",
            "public EmpresaSuspendida? Suspender(string motivo)",
            "{",
            "    // (b) IDEMPOTENCIA — operación válida pero redundante → NO-OP (no es un error)",
            "    if (Suspendida)",
            "        return null;   // ya está suspendida: no emitimos un hecho duplicado",
            "",
            "    return new EmpresaSuspendida(motivo);",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Recarga antes de cada orden",
      tarea:
        "Manda la orden de suspender dos veces, recargando la empresa antes de cada una, y no guardes el `null`.",
      pasos: [
        "**Debajo** del ciclo, escribe las dos órdenes del ejemplo.",
        "`suspension` lleva otro nombre porque `hecho` ya existe en el ciclo.",
      ],
      logro: {
        items: [
          "La segunda orden, recargada, devuelve `null`: queda **un solo** `EmpresaSuspendida`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var orden1 = stream.Get();",
          'stream.Append(orden1.Suspender("falta de pago"));',
          "",
          "var orden2 = stream.Get();",
          'var suspension = orden2.Suspender("falta de pago");',
          "if (suspension is not null) stream.Append(suspension);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Que la validación grite",
      tarea:
        "La empresa del demo ya quedó suspendida. Pídele cambiar de plan y mira cómo lo rechaza.",
      pasos: [
        '**Al final** del código de arriba, agrega `stream.Get().CambiarPlan("Premium");` y corre `dotnet run`.',
        "Después quita esa línea.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "ReglaDeNegocioException: No se puede cambiar el plan de una empresa suspendida.",
          ],
        },
        items: [
          "Sin esa línea, vuelve a imprimir `[después] plan Enterprise`.",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "La trampa: una sola instancia",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var otra = new EventStream<Empresa>();",
            'otra.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
            "var e = otra.Get();",
            'otra.Append(e.Suspender("x"));',
            'otra.Append(e.Suspender("x"));',
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "Otra empresa, activa: la del demo ya quedó suspendida. Una sola carga y dos órdenes.",
        },
        {
          k: "respuesta",
          texto:
            "La guarda no dispara: `decide` no modificó `e`, que sigue con `Suspendida = false`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "La idempotencia sale de **recargar** antes de cada orden.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Así se va a probar (solo para leer)",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "// Construir(...) = new Empresa() y Load con esos hechos",
            'var activa     = Construir(new EmpresaRegistrada("Constructora Andes", "Básico"));',
            'var suspendida = Construir(new EmpresaRegistrada("Constructora Andes", "Básico"),',
            '                           new EmpresaSuspendida("falta de pago"));',
            "",
            'activa.Suspender("falta de pago").Should().BeOfType<EmpresaSuspendida>();',
            'suspendida.Suspender("otro motivo").Should().BeNull();',
            'var act = () => suspendida.CambiarPlan("Enterprise");',
            "act.Should().Throw<ReglaDeNegocioException>();",
          ],
        },
        {
          k: "texto",
          texto:
            "**Dado** una historia → **cuando** actúas → **entonces** verificas el hecho.",
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto: "Todavía no hay proyecto de pruebas: solo mira la forma.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "El agregado decide y emite; el stream guarda; el estado cambia al aplicar, al rehidratar. Lo inválido se rechaza y lo redundante se ignora.",
      puntos: [
        {
          termino: "decide",
          definicion: "Estado + intención → hechos. Con `evolve`, forma el **patrón Decider**.",
        },
        {
          termino: "Validación",
          definicion: "Orden inválida → excepción. **Grita**.",
        },
        {
          termino: "Idempotencia",
          definicion: "Orden redundante → no emite. **Calla**.",
        },
      ],
      commit: {
        mensaje: "ES · Decidir el futuro",
        preguntas: [
          "¿Qué pasa al llamar `CambiarPlan` sobre una empresa suspendida?",
          "¿Por qué `CambiarPlan` no toca `Plan`?",
        ],
      },
      siguiente: {
        seccion: "6 · El Command Handler",
        texto:
          "El ciclo cargar → actuar → guardar quedó suelto en el `Program.cs`. Le damos una pieza con un solo trabajo.",
      },
    },
  ],
};
