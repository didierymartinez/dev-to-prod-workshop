// Fuente: workshop-event-sourcing/taller.md, entrada "19 · El rezago: ¿cuánto atrás va la vista?".
import type { Seccion } from "./tipos";

export const seccion19: Seccion = {
  numero: 19,
  titulo: "El rezago: ¿cuánto atrás va la vista?",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Medir cuántos hechos le faltan a la vista, y fijar la regla: los comandos **deciden con el diario**, nunca con la vista.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Acabo de suspender a `emp-4`. ¿La vista ya lo sabe?",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'var stream = store.AbrirStream<Empresa>("emp-4");',
            "var emp = stream.Get();",
            'emp.Registrar("Delta", "Básico");',
            'emp.Suspender("falta de pago");',
            "stream.Append(emp);                // el proyector NO ha corrido",
            "",
            'vista.Listar().Contains("emp-4")   // → false',
          ],
        },
        {
          k: "respuesta",
          texto: "`false`. No es un bug: el proyector no ha corrido.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿De qué tamaño es esa ventana?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Mide el rezago",
      tarea:
        "Escribe `Rezago()`: cuántos hechos le faltan a la vista para estar al día con el diario.",
      pasos: [
        "En el código suelto, junto a `LeerCursor()`: `FrenteDelDiario()`, con `SELECT COALESCE(MAX(seq), 0) FROM eventos`.",
        "`long Rezago()`: `FrenteDelDiario()` menos `LeerCursor()`.",
        "Haz un `Append` de 3 hechos sin proyectar e imprime `Rezago()`. Luego corre `CorrerProyector()` e imprímelo otra vez.",
      ],
      logro: {
        terminal: { comando: "dotnet run", tono: "ok", salida: ["3", "0"] },
        items: [
          "`Rezago()` sube con cada `Append` y cae a `0` al proyectar.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto: "Es el **primer panel** de tu monitor.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Mide el rezago",
      piezas: [
        {
          etiqueta: "En el código suelto, junto a `LeerCursor()`",
          lenguaje: "csharp",
          lineas: [
            "long Rezago()",
            "{",
            "    long frente = FrenteDelDiario();   // SELECT COALESCE(MAX(seq), 0) FROM eventos",
            "    long leido  = LeerCursor();        // el de la sección pasada: SELECT ultimo_seq FROM checkpoint WHERE nombre='empresas_estado'",
            "    return frente - leido;",
            "}",
          ],
        },
      ],
      nota: "`FrenteDelDiario()` es un `SELECT` de una línea, con el mismo patrón Npgsql que ya usas.",
    },
    {
      tipo: "rompelo",
      titulo: "Decidir leyendo la vista",
      tarea:
        "**No lo saltes**: es lo central de la sección. Compara dos formas de decidir si una empresa recién suspendida puede reactivarse.",
      pasos: [
        'Registra `emp-5` activa y suspéndela en un solo `Append`: `Registrar("Epsilon", "Básico")` y `Suspender("falta de pago")`. **No** corras el proyector.',
        "Imprime las dos preguntas de abajo.",
      ],
      logro: {
        items: [
          "`pareceReactivable` da `true`: leyendo la vista, la regla la reactivaría. Invariante violada, sin un error.",
          "`estaSuspendida` da `true`: rehidratando el diario, la regla la bloquea.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "La vista **responde preguntas**. Las decisiones van al diario.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'bool pareceReactivable = !vista.Listar().Contains("emp-5");',
          'bool estaSuspendida = store.AbrirStream<Empresa>("emp-5").Get().Suspendida;',
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El rezago no se arregla: **se mide y se respeta**. Quien mira lo tolera; quien decide va al diario.",
      puntos: [
        {
          termino: "Rezago",
          definicion:
            "Frente del diario menos checkpoint: cuántos hechos le faltan a la vista.",
        },
        {
          termino: "Decidir con el diario",
          definicion:
            "Los comandos rehidratan el agregado. La vista puede ir atrás.",
        },
      ],
      decision:
        "Mido el rezago (frente del diario − checkpoint). Los comandos deciden rehidratando el diario, **nunca** leyendo una proyección: la vista puede ir atrás.",
      commit: {
        mensaje: "ES · El rezago: ¿cuánto atrás va la vista?",
        preguntas: [
          "¿Cuándo es gratis el rezago y cuándo es peligroso? Un ejemplo de cada uno con la `Empresa`.",
        ],
      },
      siguiente: {
        seccion: "20 · El proyector tropieza",
        texto:
          "Ese panel asume que el proyector avanza. ¿Y si un hecho lo hace tropezar a mitad del lote?",
      },
    },
  ],
};
