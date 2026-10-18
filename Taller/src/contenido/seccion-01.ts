// Fuente: workshop-event-sourcing/taller.md, entrada "1 · El diario de una empresa".
import type { Seccion } from "./tipos";

export const seccion01: Seccion = {
  numero: 1,
  titulo: "El diario de una empresa",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "La diferencia entre guardar la **foto** (el estado de hoy) y guardar el **diario** (todo lo que pasó). Y tu repo, listo para llevar tu avance.",
    },
    {
      tipo: "planteamiento",
      titulo: "¿Cómo llegó a estar suspendida?",
      bloques: [
        {
          k: "tabla",
          columnas: ["Id", "Nombre", "Plan", "Estado"],
          filas: [["7", "Constructora Andes", "Premium", "Suspendida"]],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "La dejaron así dos `UPDATE`: `SET Plan='Premium'` y `SET Estado='Suspendida'`.",
        },
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "Mi jefe pregunta: ¿desde cuándo es Premium?",
            "¿Por qué está suspendida?",
            "¿Cuántas veces la reactivamos?",
          ],
        },
        {
          k: "respuesta",
          texto: "«Ni idea». Cada `UPDATE` borró lo que había antes.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "El diario",
      dosColumnas: true,
      bloques: [
        {
          k: "diario",
          lado: "izq",
          porItem: true,
          items: [
            "Registrada con plan Básico",
            "Cambió a plan Premium",
            "Suspendida por falta de pago",
          ],
        },
        {
          k: "texto",
          lado: "der",
          tam: "enorme",
          texto: "Léelo de corrido: ¿cómo está hoy?",
        },
        { k: "respuesta", lado: "der", texto: "Premium, suspendida." },
        {
          k: "texto",
          lado: "der",
          texto:
            "Y además sabes **desde cuándo**, **por qué** y **cuántas veces**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Arranca tu bitácora",
      tarea:
        "Crea tu repo de bitácora en GitHub y haz tu primer commit, con tu respuesta en el mensaje.",
      pasos: [
        "Crea en GitHub un repo **vacío**, sin README, y copia su URL.",
        "En tu carpeta de trabajo, corre los comandos de abajo. Cambia `<tu URL>` por la de tu repo.",
        "Cambia `<tu respuesta>` por **tu respuesta**, con tus palabras.",
      ],
      logro: { items: ["Tu primer commit se ve en GitHub."] },
      tips: [
        {
          k: "piensa",
          texto:
            "Tu respuesta: ¿qué destruye un `UPDATE` que el diario conserva?",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "git init",
          'git commit --allow-empty -m "ES · El diario de una empresa" -m "<tu respuesta>"',
          "git remote add origin <tu URL>",
          "git branch -M main      # por si tu git creó la rama como master",
          "git push -u origin main",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El estado de hoy se **reconstruye** leyendo el diario, y el pasado ya no se pierde.",
      puntos: [
        {
          termino: "Event Sourcing",
          definicion: "Guardar los hechos como la fuente de la verdad.",
        },
        { termino: "Evento", definicion: "Cada renglón del diario." },
      ],
      guardar:
        "¿Toda tabla merece un diario? Lo responderás por escrito más adelante, y «no» también es una respuesta válida.",
      siguiente: {
        seccion: "2 · Los primeros hechos",
        texto:
          "Un diario en prosa no compila. ¿Cómo escribimos un hecho en C# que nadie pueda editar?",
      },
    },
  ],
};
