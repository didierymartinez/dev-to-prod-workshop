// Fuente: workshop-event-sourcing/taller.md, entrada "2 · Los primeros hechos".
import type { Seccion } from "./tipos";

const linea =
  "Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces";

export const seccion02: Seccion = {
  numero: 2,
  titulo: "Los primeros hechos",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Escribir los hechos de Constructora Andes en C# y calcular su estado de hoy **leyéndolos**, sin guardarlo en ningún lado.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Quiero el plan actual y cuántas veces la reactivamos.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            'Si guardo `Plan = "Premium"` en una variable, vuelvo a tener la **foto**.',
        },
        {
          k: "texto",
          texto:
            "Y si un hecho fuera una clase con `set`, ¿qué impide que alguien cambie «registrada con plan Básico» por «Premium» dentro de un mes?",
        },
        { k: "respuesta", texto: "Nada. Eso es falsificar la historia." },
        {
          k: "texto",
          tam: "grande",
          texto:
            "¿Cómo calculo el estado **desde el diario**, con hechos que el compilador no deje modificar?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Los cuatro hechos",
      tarea:
        "Crea el proyecto y escribe los cuatro hechos de la empresa como `record`: tipos que nadie puede editar.",
      pasos: [
        "En tu carpeta de trabajo, donde hiciste `git init`: `dotnet new console -n Empresas.Historia`, `cd Empresas.Historia` y `dotnet new gitignore`.",
        "Borra lo que trae el `Program.cs` y escribe **al final** los cuatro `record` de abajo.",
      ],
      logro: {
        items: [
          'Si intentas cambiar un hecho ya creado (`hecho.Plan = "x"`), **no compila**.',
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "record",
          explicacion: "inmutable, y se compara por su contenido.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public record EmpresaRegistrada(string Nombre, string Plan);",
          "public record PlanCambiado(string NuevoPlan);",
          "public record EmpresaSuspendida(string Motivo);",
          "public record EmpresaReactivada();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Calcula el estado leyendo el diario",
      tarea:
        "Crea una lista e inserta los hechos en el orden lógico en que ocurrieron. Recórrelos y, según el tipo de cada hecho, cambia el valor de las variables. Muestra en consola el estado final.",
      pasos: [
        "**Arriba** en el `Program.cs`: `var historia = new List<object> { … }` con los cinco hechos de los tips, en ese orden.",
        "Cuatro variables (`nombre`, `plan`, `suspendida`, `reactivaciones`) y un `foreach` que, según el **tipo** de cada hecho, cambie la que toque.",
        "Después del `foreach`, imprime las cuatro con `Console.WriteLine`, como en la línea de abajo.",
      ],
      logro: {
        terminal: { comando: "dotnet run", salida: [linea], tono: "ok" },
      },
      tips: [
        {
          k: "lista",
          titulo: "La historia, en orden",
          items: [
            '`EmpresaRegistrada` · "Básico"',
            '`PlanCambiado("Premium")`',
            '`EmpresaSuspendida` · "falta de pago"',
            "`EmpresaReactivada`",
            '`EmpresaSuspendida` · "incumplimiento de contrato"',
          ],
        },
        {
          k: "nuevo",
          idioma: "hecho is EmpresaRegistrada r",
          explicacion:
            "comprueba el tipo y te entrega el hecho convertido en `r`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una clase dueña de la empresa",
      tarea:
        "Mueve las variables y el recorrido a una clase `Empresa` que se reconstruye sola desde la historia y no deja cambiar su estado desde afuera.",
      pasos: [
        "**Al final** del `Program.cs`, la clase `Empresa`, con las cuatro variables como propiedades `{ get; private set; }`.",
        "Su constructor recibe `IEnumerable<object> historia` y corre el mismo `foreach`.",
        "**Arriba**, cambia las variables y el `foreach` por `var empresa = new Empresa(historia);` e imprime sus propiedades.",
      ],
      logro: {
        terminal: { comando: "dotnet run", salida: [linea], tono: "ok" },
        items: [
          'Agrega `new PlanCambiado("Enterprise")` al final de la historia: sale Enterprise, **sin tocar la rehidratación**.',
          'Escribe `empresa.Plan = "Enterprise"`: **no compila**.',
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "{ get; private set; }",
          explicacion:
            "se lee desde afuera; se escribe solo dentro de la clase.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "No guardamos el estado: lo **reconstruimos** rehidratando hechos inmutables.",
      puntos: [
        {
          termino: "Stream",
          definicion:
            "La secuencia ordenada de hechos: la única fuente de la verdad. Lo que nadie anota, el sistema no lo sabe.",
        },
        {
          termino: "Rehidratar",
          definicion:
            "Recorrer los hechos para reconstruir el estado (en inglés, replay).",
        },
        {
          termino: "evolve",
          definicion: "Cada vuelta: `(estado, hecho) → nuevo estado`.",
        },
        {
          termino: "Aggregate Root",
          definicion:
            "La clase dueña de la coherencia, y el único punto para cambiarla.",
        },
      ],
      decision:
        "Los hechos son `record` inmutables: nadie —ni yo— puede editar el pasado; el estado se reconstruye rehidratándolos.",
      commit: {
        mensaje: "ES · Los primeros hechos",
        preguntas: [
          '¿Qué dice el compilador ante `evento.Plan = "x"`, y por qué un hecho no debe poder cambiar?',
        ],
      },
      siguiente: {
        seccion: "3 · Refactorizando el motor",
        texto:
          "El constructor tiene cuatro `if`. Cada hecho nuevo será otro, y una `Factura` copiaría el bucle entero.",
      },
    },
  ],
};
