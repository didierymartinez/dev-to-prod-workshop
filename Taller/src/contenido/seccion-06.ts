// Fuente: workshop-event-sourcing/taller.md, entrada "6 · El Command Handler".
import type { Seccion } from "./tipos";

const suspendida = {
  comando: "dotnet run",
  salida: ["suspendida"],
  tono: "ok" as const,
};

export const seccion06: Seccion = {
  numero: 6,
  titulo: "El Command Handler",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Sacar el ciclo **cargar → actuar → guardar** del `Program.cs` a una clase **handler** por comando.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La empresa decide. ¿Quién la carga, le presenta la orden y guarda el hecho?",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var empresa = stream.Get();",
            'var hecho = empresa.CambiarPlan("Enterprise");',
            "stream.Append(hecho);",
            "",
            "var orden2 = stream.Get();",
            'var suspension = orden2.Suspender("falta de pago");',
            "if (suspension is not null) stream.Append(suspension);",
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "Hoy, en el arranque del programa. Cada operación nueva repite ahí el trío.",
        },
        {
          k: "respuesta",
          texto:
            "Un secretario: el **Command Handler**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un secretario para la empresa",
      tarea:
        "Que el arranque del programa solo cree un handler y le pida cada operación.",
      pasos: [
        "**Arriba**, cambia la demo anterior por el uso del ejemplo.",
        "**Al final**: `public class EmpresaCommandHandlers(EventStream<Empresa> stream)`, con `CambiarPlan(string nuevoPlan)` y `Suspender(string motivo)`.",
        "Cada método hace `Get`, pide la decisión y hace `Append`. En `Suspender`, si el hecho es `null`, no guarda nada.",
      ],
      logro: { terminal: suspendida },
      tips: [
        {
          k: "nuevo",
          idioma: "class X(EventStream<Empresa> stream)",
          explicacion:
            "constructor primario: `stream` queda disponible en todos los métodos.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var stream = new EventStream<Empresa>();",
          'stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
          "var handlers = new EmpresaCommandHandlers(stream);",
          'handlers.CambiarPlan("Premium");',
          'handlers.Suspender("falta de pago");',
          'Console.WriteLine(stream.Get().Suspendida ? "suspendida" : "activa");',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un secretario para la empresa",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`: el handler",
          lenguaje: "csharp",
          lineas: [
            "public class EmpresaCommandHandlers(EventStream<Empresa> stream)",
            "{",
            "    public void CambiarPlan(string nuevoPlan)",
            "    {",
            "        var empresa = stream.Get();                       // 1. cargar (rehidratar)",
            "        stream.Append(empresa.CambiarPlan(nuevoPlan));     // 2+3. actuar y guardar",
            "    }",
            "",
            "    public void Suspender(string motivo)",
            "    {",
            "        var empresa = stream.Get();",
            "        var hecho   = empresa.Suspender(motivo);",
            "        if (hecho is not null) stream.Append(hecho);       // null = ya suspendida → no guardamos",
            "    }",
            "}",
          ],
        },
      ],
      nota: "El `if (hecho is not null)` respeta la idempotencia: la regla la pone la `Empresa`; el handler solo la **obedece**.",
    },
    {
      tipo: "reto",
      titulo: "Un handler por comando",
      tarea:
        "`EmpresaCommandHandlers` es un súper-secretario: hoy 2 operaciones, mañana 20. Pártelo en una clase por comando.",
      pasos: [
        "Borra `EmpresaCommandHandlers`. **Al final**, `CambiarPlanHandler` y `SuspenderHandler`: cada uno recibe el stream por constructor y tiene un `Handle(...)` con sus parámetros sueltos.",
        '**Arriba**, cambia las llamadas: `new CambiarPlanHandler(stream).Handle("Premium");` y `new SuspenderHandler(stream).Handle("falta de pago");`',
      ],
      logro: {
        terminal: suspendida,
        items: ["Ya no existe `EmpresaCommandHandlers`."],
      },
      tips: [
        { k: "piensa", texto: "¿Quién eligió qué clase crear?" },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un handler por comando",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`, en vez de `EmpresaCommandHandlers`",
          lenguaje: "csharp",
          lineas: [
            "public class CambiarPlanHandler(EventStream<Empresa> stream)",
            "{",
            "    public void Handle(string nuevoPlan) =>",
            "        stream.Append(stream.Get().CambiarPlan(nuevoPlan));",
            "}",
            "",
            "public class SuspenderHandler(EventStream<Empresa> stream)",
            "{",
            "    public void Handle(string motivo)",
            "    {",
            "        var hecho = stream.Get().Suspender(motivo);",
            "        if (hecho is not null) stream.Append(hecho);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Para ejecutar uno, **tú** eliges la clase y la llamas a mano: `new SuspenderHandler(stream).Handle(\"falta de pago\");`",
    },
    {
      tipo: "aprendizaje",
      idea: "El agregado tiene la lógica pura. El handler, una capa delgada por comando, hace la logística.",
      puntos: [
        {
          termino: "Command Handler",
          definicion:
            "El que atiende una orden: carga la empresa, le pide la decisión y guarda el hecho.",
        },
        {
          termino: "El handler obedece",
          definicion:
            "El `if (hecho is not null)` cumple una regla de la `Empresa`. Quien decide es ella.",
        },
      ],
      commit: {
        mensaje: "ES · El Command Handler",
        preguntas: [
          "¿Por qué el handler obedece el `null` en vez de decidir él?",
          "¿Qué gana un handler por comando frente al súper-secretario?",
        ],
      },
      siguiente: {
        seccion: "7 · El despachador: dado un comando, encuentra su handler",
        texto:
          "Hoy elegimos a mano qué handler crear. Pero el comando va a llegar de afuera: una petición HTTP, una cola.",
      },
    },
  ],
};
