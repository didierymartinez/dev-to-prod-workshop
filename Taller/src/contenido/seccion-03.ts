// Fuente: workshop-event-sourcing/taller.md, entrada "3 · Refactorizando el motor".
import type { Seccion } from "./tipos";

const linea =
  "Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces";
const mismaSalida = {
  comando: "dotnet run",
  salida: [linea],
  tono: "ok" as const,
};

export const seccion03: Seccion = {
  numero: 3,
  titulo: "Refactorizando el motor",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Convertir el `foreach` con `if` en un **motor de rehidratación reutilizable**: una clase base `AggregateRoot` con `Load`, y un `Aplicar` con `switch` por tipo en cada entidad.",
    },
    {
      tipo: "planteamiento",
      dosColumnas: true,
      bloques: [
        {
          k: "clases",
          lado: "izq",
          cajas: [
            {
              nombre: "Empresa",
              filas: [
                { texto: "constructor", tono: "tenue" },
                { texto: "  recorre la historia", tono: "dolor" },
                { texto: "  if (hecho is …)", tono: "dolor" },
                { texto: "  if (hecho is …)", tono: "dolor" },
                { texto: "  if (hecho is …)", tono: "dolor" },
                { texto: "  if (hecho is …)", tono: "dolor" },
              ],
            },
          ],
        },
        {
          k: "texto",
          lado: "der",
          tam: "grande",
          texto:
            "Mañana llega una `Factura` que también se reconstruye de sus hechos.",
        },
        { k: "respuesta", lado: "der", texto: "¿Copiamos este bucle?" },
        {
          k: "texto",
          lado: "der",
          tam: "grande",
          texto: "¿Y con 15 hechos, ponemos 15 `if`?",
        },
        {
          k: "lista",
          lado: "der",
          marca: "punto",
          items: [
            "El constructor **recorre y aplica** a la vez.",
            "El bucle tendría que **copiarse** en cada entidad nueva.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Recorrer, aparte de aplicar",
      tarea:
        "Parte el constructor en dos piezas: una recorre la historia y otra aplica cada hecho.",
      pasos: [
        "En `Empresa`, mueve los cuatro `if` del constructor a un método nuevo, `private void Aplicar(object hecho)`.",
        "El constructor queda solo con el `foreach`, que llama a `Aplicar(hecho)`.",
      ],
      logro: { terminal: mismaSalida },
    },
    {
      tipo: "reto",
      titulo: "El motor, una sola vez",
      tarea:
        "Lleva el recorrido a una clase base que cualquier entidad pueda heredar, y deja en `Empresa` solo cómo aplica sus hechos.",
      pasos: [
        "**Al final** del `Program.cs`: `public abstract class AggregateRoot`, con `public void Load(IEnumerable<object> historia)` (el `foreach`) y `protected abstract void Aplicar(object hecho);`",
        "Haz que `Empresa` herede de ella (`class Empresa : AggregateRoot`). Su `private void Aplicar` pasa a `protected override void Aplicar`.",
        "El constructor de `Empresa` queda `=> Load(historia)`.",
      ],
      logro: {
        terminal: mismaSalida,
        items: ["`new AggregateRoot()` **no compila**."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "abstract class",
          explicacion:
            "base incompleta, solo se hereda. Su método `abstract` no tiene cuerpo: la hija lo implementa con `override`.",
        },
        {
          k: "nuevo",
          idioma: "=>",
          explicacion: "el cuerpo corto, de una sola línea.",
        },
        { k: "piensa", texto: "¿Por qué clase abstracta y no interfaz?" },
      ],
    },
    {
      tipo: "reto",
      titulo: "Del if al switch",
      tarea:
        "Cambia la pila de `if` de `Aplicar` por un `switch` según el tipo del hecho.",
      pasos: [
        "Convierte los `if` de `Aplicar` en un `switch (hecho)`, con un `case` por tipo de hecho.",
        "Cada rama termina en `break;`.",
      ],
      logro: { terminal: mismaSalida },
      tips: [
        {
          k: "nuevo",
          idioma: "case EmpresaRegistrada r:",
          explicacion:
            "entra si el hecho es de ese tipo, y te lo entrega como `r`.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un hecho sin su rama",
      tarea:
        "Agrega un hecho nuevo sin su rama y cambia el `switch` por un enrutado con `dynamic`, para ver qué pasa al cargar.",
      pasos: [
        'Al final del `Program.cs`, el hecho `public record NombreCorregido(string Nuevo);`. Al final de la `historia`, `new NombreCorregido("Constructora Andes S.A.")`. **Sin** su `case`.',
        "Guarda tu versión con `switch` en un archivo aparte, para volver a ella después: `cp Program.cs Program.bak`.",
        "Cambia tu `Load` y tu `switch` por el enrutado con `dynamic` de la lámina siguiente.",
      ],
      logro: { items: ["Compila sin quejas."] },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "El enrutado con dynamic",
      piezas: [
        {
          etiqueta:
            "En tu `AggregateRoot`, este `Load`, y quita el `protected abstract void Aplicar`:",
          lenguaje: "csharp",
          lineas: [
            "public void Load(IEnumerable<object> historia)",
            "{",
            "    foreach (var hecho in historia)",
            "        ((dynamic)this).Aplicar((dynamic)hecho);",
            "}",
          ],
        },
        {
          etiqueta:
            "En tu `Empresa`, en vez del `switch`, un `Aplicar` público por tipo, sin `override`:",
          lenguaje: "csharp",
          lineas: [
            "public void Aplicar(EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }",
            "public void Aplicar(PlanCambiado p)      { Plan = p.NuevoPlan; }",
            "public void Aplicar(EmpresaSuspendida s) { Suspendida = true; }",
            "public void Aplicar(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }",
          ],
        },
      ],
      luego:
        "Luego corre `dotnet run`: lo que ves está en la lámina siguiente.",
    },
    {
      tipo: "rompelo",
      titulo: "Córrelo, y vuelve al switch",
      tarea:
        "Carga la empresa con el `dynamic`, mira el error, y vuelve a tu versión con `switch`, ahora con la rama del hecho nuevo.",
      pasos: [
        "Corre `dotnet run`.",
        "Vuelve a tu versión con `switch`: `cp Program.bak Program.cs` la copia de vuelta sobre tu `Program.cs`. Luego borra `Program.bak`.",
        "En el `switch` de `Aplicar`, agrega la rama `case NombreCorregido n: Nombre = n.Nuevo; break;`",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "RuntimeBinderException: The best overloaded method match for",
            "'Empresa.Aplicar(EmpresaRegistrada)' has some invalid arguments",
          ],
        },
        items: [
          "Con el `dynamic`, **ninguna carga** funciona mientras ese hecho esté en la historia.",
          "De vuelta en el `switch`, carga. Con la rama nueva, sale `Constructora Andes S.A.`",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El motor de rehidratación es igual para toda entidad y vive **una sola vez** en `AggregateRoot`. Lo propio de cada una va en su `switch`.",
      puntos: [
        {
          termino: "Separación de responsabilidades",
          definicion:
            "Recorrer la historia y aplicar un hecho, en piezas separadas.",
        },
        {
          termino: "Clase abstracta, no interfaz",
          definicion:
            "La base lleva código compartido (`Load`) y va a guardar estado. Una interfaz te haría repetir el motor en cada clase.",
        },
        {
          termino: "switch por tipo",
          definicion:
            "Un hecho sin su `case` no rompe la carga. Con `dynamic`, toda carga lanzaba.",
        },
      ],
      decision:
        "Enruto con un `switch`: un hecho sin su `case` no rompe la carga de la empresa. Con `dynamic`, toda carga lanzaba.",
      commit: {
        mensaje: "ES · Refactorizando el motor",
        preguntas: [
          "¿Por qué `Load` vive en la base y `Aplicar` en cada entidad?",
          "¿Qué ganó el `switch`, y qué se habría perdido con `dynamic`?",
        ],
      },
      siguiente: {
        seccion: "4 · El flujo de vida (EventStream)",
        texto: "La historia sigue siendo una `List<object>` suelta.",
      },
    },
  ],
};
