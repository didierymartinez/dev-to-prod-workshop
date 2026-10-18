// Fuente: workshop-event-sourcing/taller.md, entrada "7 · El despachador: dado un comando, encuentra su handler".
import type { Seccion } from "./tipos";

const suspendida = {
  comando: "dotnet run",
  salida: ["suspendida"],
  tono: "ok" as const,
};

export const seccion07: Seccion = {
  numero: 7,
  titulo: "El despachador: dado un comando, encuentra su handler",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Construir un `Despachador` que reciba **cualquier** comando y encuentre su handler por el **tipo** del comando, sin `switch` y sin nombrar clases.",
    },
    {
      tipo: "planteamiento",
      titulo: "El que despacha eres tú",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "El comando llega de afuera. Hoy lo llevas tú a su handler, con un `switch`.",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "switch (algo)",
            "{",
            '    case "cambiar plan": new CambiarPlanHandler(stream).Handle(...); break;',
            '    case "suspender":    new SuspenderHandler(stream).Handle(...);   break;',
            "}",
          ],
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Cada comando nuevo es **otra rama**.",
            "Quien despacha queda **atado a todos** los handlers.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un tipo por comando",
      tarea:
        '`"falta de pago"` y `"Premium"` son los dos `string`: no se puede rutear por tipo. Dale a cada comando su propio tipo.',
      pasos: [
        "**Al final**: `public record CambiarPlanDeEmpresa(string NuevoPlan);` y `public record SuspenderEmpresa(string Motivo);`",
        "Cada `Handle` recibe su comando y lee `cmd.NuevoPlan` o `cmd.Motivo`.",
        '**Arriba**, las llamadas pasan a `.Handle(new CambiarPlanDeEmpresa("Premium"))` y `.Handle(new SuspenderEmpresa("falta de pago"))`.',
      ],
      logro: { terminal: suspendida },
      tips: [
        {
          k: "nota",
          texto: "Todavía sin id: hay una sola empresa.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un molde común",
      tarea:
        "El despachador tendrá que llamar a todos los handlers igual. Dales un contrato común.",
      pasos: [
        "**Al final** del `Program.cs`, la interfaz del ejemplo.",
        "Cada handler la implementa: `CambiarPlanHandler(…) : ICommandHandler<CambiarPlanDeEmpresa>`, y lo mismo `SuspenderHandler` con `SuspenderEmpresa`.",
        "Los cuerpos no cambian.",
      ],
      logro: { terminal: suspendida },
      tips: [
        { k: "piensa", texto: "¿Por qué interfaz y no clase abstracta?" },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public interface ICommandHandler<TCommand>",
          "{",
          "    void Handle(TCommand comando);",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La tabla, a mano",
      tarea:
        "Arriba, arma a mano una tabla que va del tipo del comando a la función que lo maneja, y despacha buscando por el tipo.",
      pasos: [
        "**Arriba**, cambia las dos llamadas a `Handle` por el ejemplo. Deja el `var stream` y el `WriteLine`.",
        "Agrega la entrada de `CambiarPlanDeEmpresa`: llave `typeof(CambiarPlanDeEmpresa)`; valor, una lambda que castea el `object` y llama a `Handle`.",
      ],
      logro: {
        terminal: suspendida,
        items: ["El comando llegó a `SuspenderHandler` buscando por su tipo."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var cambiarPlan = new CambiarPlanHandler(stream);",
          "var suspender   = new SuspenderHandler(stream);",
          "var handlers = new Dictionary<Type, Action<object>>();",
          "handlers.Add(typeof(SuspenderEmpresa),",
          "    (object comando) => suspender.Handle((SuspenderEmpresa)comando));",
          "",
          'object comando = new SuspenderEmpresa("falta de pago");',
          "handlers[comando.GetType()](comando);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Llave y cast desalineados",
      tarea:
        "En cada `Add` repites el tipo dos veces, y nada obliga a que coincidan. Desalinéalos a propósito.",
      pasos: [
        "**Reemplaza** tu `Add` de `SuspenderEmpresa` por el del ejemplo: la llave dice un tipo y el cast otro.",
        "Corre `dotnet run`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["InvalidCastException"],
          tono: "error",
        },
        items: ["Compila. El error sale recién **en ejecución**."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Si lo agregas junto al bueno, `Add` falla antes por llave repetida.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "handlers.Add(typeof(SuspenderEmpresa),",
          "    (object comando) => cambiarPlan.Handle((CambiarPlanDeEmpresa)comando));",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Nace el Despachador",
      tarea:
        "Envuelve la tabla en una clase donde la llave, el cast y el handler son **el mismo `T`**, para que no se puedan desalinear.",
      pasos: [
        "**Al final**: `public class Despachador`, con un `Dictionary<Type, Action<object>>` privado.",
        "`Registrar<T>(ICommandHandler<T> handler)` guarda bajo `typeof(T)` la lambda `comando => handler.Handle((T)comando)`.",
        "`Enviar(object comando)` busca por `comando.GetType()` y la llama.",
      ],
      logro: { items: ["Compila."] },
    },
    {
      tipo: "reto",
      titulo: "Despacha con el Despachador",
      tarea:
        "Arriba, cambia la tabla a mano por el `Despachador`: registra cada handler una vez y envía el comando como `object`.",
      pasos: [
        "**Arriba**, cambia la tabla a mano y sus dos handlers por el ejemplo. Deja el `var stream`, su `Append` y el `WriteLine`.",
      ],
      logro: {
        terminal: suspendida,
        items: ["Sin `switch` y sin nombrar la clase."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "No escribiste `<SuspenderEmpresa>` en `Registrar`: C# lo deduce del handler.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var despachador = new Despachador();",
          "despachador.Registrar(new CambiarPlanHandler(stream));",
          "despachador.Registrar(new SuspenderHandler(stream));",
          'object comando = new SuspenderEmpresa("falta de pago");',
          "despachador.Enviar(comando);",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Para rutear cualquier comando nacieron dos piezas cuando hicieron falta: un `record` por comando (un tipo para rutear) y `ICommandHandler<T>` (un molde común).",
      puntos: [
        {
          termino: "Comando",
          definicion:
            "Un `record` por intención. Su tipo es la llave para encontrar su handler.",
        },
        {
          termino: "Interfaz, no clase abstracta",
          definicion: "Los handlers no comparten código; solo un contrato.",
        },
        {
          termino: "Mediador",
          definicion:
            "`Registrar` llena la tabla y `Enviar` rutea. Es un andamio: lo usarás un tramo y luego lo jubilarás.",
        },
      ],
      commit: {
        mensaje: "ES · El despachador",
        preguntas: [
          "¿Qué te obligó a crear el `record` por comando y el contrato?",
          "¿Qué se rompería si los comandos fueran `string`?",
        ],
      },
      siguiente: {
        seccion: "8 · El almacén: un cajón por empresa",
        texto:
          "Cada handler está atado a un stream fijo, o sea a una sola empresa. ¿Qué pasa cuando nace la segunda?",
      },
    },
  ],
};
