// Fuente: workshop-event-sourcing/taller.md, entrada "10 · Un acto de negocio, dos hechos".
import type { Seccion } from "./tipos";

export const seccion10: Seccion = {
  numero: 10,
  titulo: "Un acto de negocio, dos hechos",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Montar una acción que produce **dos hechos** (pagar y reactivar) y chocar con el límite del modelo en que `decide` devuelve el hecho.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Una empresa suspendida por falta de pago paga su deuda. El negocio pide, en un solo acto:",
        },
        {
          k: "lista",
          marca: "numero",
          porItem: true,
          items: ["Registrar el pago.", "Reactivarla."],
        },
        {
          k: "respuesta",
          texto: "La regla: no se reactiva una empresa que todavía debe.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La deuda",
      tarea:
        "Dale a la empresa un hecho nuevo, el pago, y el estado que dice si todavía debe.",
      pasos: [
        "**Al final**: `public record PagoRegistrado(int Monto);`. En `Empresa`, la propiedad `DeudaPendiente { get; private set; }`.",
        "En `Aplicar`, el `case EmpresaSuspendida` pone además `DeudaPendiente = true`.",
        "Un `case PagoRegistrado` nuevo la pone en `false`.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nota",
          texto:
            "Simplificamos: aquí toda suspensión es por mora, así que deja deuda.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La deuda",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`: el hecho nuevo",
          lenguaje: "csharp",
          lineas: ["public record PagoRegistrado(int Monto);"],
        },
        {
          etiqueta: "En `Empresa`: la propiedad",
          lenguaje: "csharp",
          lineas: [
            "// En Empresa (los decide siguen DEVOLVIENDO el hecho):",
            "public bool DeudaPendiente { get; private set; }",
          ],
        },
        {
          etiqueta: "Dentro del `switch` de `Aplicar`",
          lenguaje: "csharp",
          lineas: [
            "case EmpresaSuspendida: Suspendida = true; DeudaPendiente = true; break;",
            "case PagoRegistrado:    DeudaPendiente = false; break;",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Pagar, y la regla de reactivar",
      tarea:
        "El verbo de pagar y la regla en `Reactivar`, al estilo de siempre: cada `decide` devuelve su hecho.",
      pasos: [
        "En `Empresa`: `RegistrarPago(int monto)` devuelve `PagoRegistrado`.",
        "`Reactivar`: si `DeudaPendiente`, lanza `ReglaDeNegocioException` con «No puedes reactivar con deuda pendiente.»",
        "**Al final**, el comando: `public record PagarDeuda(string EmpresaId, int Monto);`",
      ],
      logro: { items: ["Compila."] },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Pagar, y la regla de reactivar",
      piezas: [
        {
          etiqueta: "En `Empresa`: el verbo de pagar y la regla",
          lenguaje: "csharp",
          lineas: [
            "public PagoRegistrado RegistrarPago(int monto) => new(monto);",
            "",
            "public EmpresaReactivada Reactivar()",
            "{",
            "    if (DeudaPendiente)",
            '        throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");',
            "    return new();",
            "}",
          ],
        },
        {
          etiqueta: "**Al final** del `Program.cs`: el comando",
          lenguaje: "csharp",
          lineas: [
            "// El comando (con EmpresaId, como los otros):",
            "public record PagarDeuda(string EmpresaId, int Monto);",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El handler del acto",
      piezas: [
        {
          etiqueta:
            "Viene escrito. Cópialo **al final** del `Program.cs`: carga la empresa, decide los dos hechos y los guarda.",
          lenguaje: "csharp",
          lineas: [
            "public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>",
            "{",
            "    public void Handle(PagarDeuda cmd)",
            "    {",
            "        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);",
            "        var e = stream.Get();",
            "        stream.Append(e.RegistrarPago(cmd.Monto));   // 1) registrar el pago",
            "        stream.Append(e.Reactivar());                 // 2) reactivar",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dispara el acto",
      tarea:
        "Arriba, monta una empresa morosa —registrada y suspendida— y dispara el handler de pagar.",
      pasos: [
        "**Arriba**, cambia el código suelto por el ejemplo. El choque de la sección anterior lanza y corta el programa.",
        "Corre `dotnet run`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "ReglaDeNegocioException: No puedes reactivar con deuda pendiente.",
          ],
        },
        items: ["Lanza, aunque el pago se registró en la línea anterior."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = new EventStore();",
          'var s = store.AbrirStream<Empresa>("emp-7");',
          's.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));',
          's.Append(new EmpresaSuspendida("falta de pago"));',
          'new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));',
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "¿Por qué lanza?",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "¿Qué mira `Reactivar` para decidir, y qué no ha visto?",
        },
        { k: "respuesta", texto: "Mira `e`, y `e` no vio el pago." },
        {
          k: "texto",
          texto:
            "Los `decide` devuelven el hecho, pero no se lo aplican al agregado: `e.DeudaPendiente` sigue en `true`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "No es un error de tu código: es el **límite del modelo**.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Con dos hechos, el segundo `decide` decide a ciegas: el problema está en **quién aplica el hecho**.",
      puntos: [
        {
          termino: "Decidir a ciegas",
          definicion:
            "El segundo `decide` mira un agregado que no vio el primer hecho.",
        },
        {
          termino: "Límite del modelo",
          definicion:
            "Que `decide` devuelva el hecho alcanza con un hecho por acción. Con dos que dependen entre sí, no.",
        },
      ],
      commit: {
        mensaje: "ES · Un acto de negocio, dos hechos",
        preguntas: [
          "¿Qué mira `Reactivar` para decidir, y por qué eso no incluye el pago recién hecho?",
        ],
      },
      siguiente: {
        seccion: "11 · El agregado recuerda lo que decide",
        texto:
          "La cura cambia quién aplica el hecho: que la empresa se lo aplique en el momento de decidir.",
      },
    },
  ],
};
