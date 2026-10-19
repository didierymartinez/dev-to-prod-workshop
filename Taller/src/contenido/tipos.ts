// Modelo de la presentación: lo que el GRUPO ve mientras trabaja, no la guía del facilitador.
// El contenido sale de workshop-event-sourcing/taller.md, pasado a la voz del grupo.
//
// Cada sección, en pocas láminas:
//   portada        → número, título y para qué.
//   planteamiento  → el problema: la pregunta y el dolor (se revela por golpes).
//   reto           → UNA pantalla por reto, a la vista mientras trabajan: la tarea en una
//                    frase, los pasos que la detallan, cómo saben que lo lograron, tips y ejemplo.
//   rompelo        → igual que un reto, para el 🔨.
//   codigo         → el código que deben copiar, a todo lo ancho (dentro de un reto o un 🔨).
//   solucion       → "👉 Una forma de hacerlo": cómo queda el resultado del reto anterior,
//                    sacado del <details> de la sección. Va justo después de su reto.
//   aprendizaje    → lo que se llevan y el commit de cierre.
//
// En los textos, `así` se ve como código y **así** en negrita.
// Terminología: "replay" se dice rehidratar, nunca rejugar.

export type TipoLamina =
  | "portada"
  | "planteamiento"
  | "reto"
  | "rompelo"
  | "codigo"
  | "solucion"
  | "aprendizaje";

type Comun = {
  /** Aparece con el bloque anterior, en el mismo golpe. */
  junto?: boolean;
  /** En un planteamiento a dos columnas, la columna del bloque. */
  lado?: "izq" | "der";
};

export type FilaDeClase = {
  texto: string;
  nota?: string;
  tono?: "normal" | "dolor" | "bien" | "tenue";
};

export type Caja = { nombre: string; arriba?: string; filas: FilaDeClase[] };

export type Terminal = {
  comando?: string;
  salida: string[];
  tono?: "ok" | "error";
};

/** Bloques del planteamiento. */
export type Bloque = Comun &
  (
    | {
        k: "texto";
        texto: string;
        tam?: "enorme" | "grande" | "normal" | "tenue";
      }
    | { k: "respuesta"; texto: string }
    | {
        k: "lista";
        items: string[];
        porItem?: boolean;
        marca?: "numero" | "punto" | "pregunta";
      }
    | { k: "tabla"; columnas: string[]; filas: string[][] }
    | { k: "diario"; items: string[]; porItem?: boolean }
    | { k: "clases"; cajas: Caja[]; flecha?: string }
    | { k: "codigo"; lenguaje: "csharp" | "bash" | "sql"; lineas: string[] }
    | {
        k: "terminal";
        comando?: string;
        salida: string[];
        tono?: "ok" | "error";
      }
  );

/** Lo que aparece en la columna de tips de un reto. */
export type Tip =
  | { k: "nuevo"; idioma: string; explicacion: string }
  | { k: "nota"; texto: string }
  | { k: "piensa"; texto: string }
  | { k: "lista"; titulo: string; items: string[] };

export type Logro = {
  /** Lo que deben ver en la terminal. */
  terminal?: Terminal;
  /** Cómo debe quedar un archivo, por zonas. */
  archivo?: { nombre: string; zonas: { etiqueta: string; detalle: string }[] };
  /** Otras comprobaciones. */
  items?: string[];
};

// Una pantalla de reto tiene que caber entera: hasta 3 pasos cortos, hasta 2 tips y un
// solo bloque de código (el ejemplo). Si no cabe, son dos retos.
export type Lamina =
  | { tipo: "portada"; paraQue: string }
  | {
      tipo: "planteamiento";
      titulo?: string;
      dosColumnas?: boolean;
      bloques: Bloque[];
    }
  | {
      tipo: "reto" | "rompelo";
      titulo: string;
      /** La tarea en una o dos frases: qué hay que lograr, antes de los pasos que la detallan. */
      tarea: string;
      pasos: string[];
      logro: Logro;
      tips?: Tip[];
      ejemplo?: { lenguaje: "csharp" | "bash" | "sql"; lineas: string[] };
    }
  | {
      tipo: "codigo";
      /** El reto o 🔨 al que pertenece: le da la etiqueta y el color. */
      de: "reto" | "rompelo";
      titulo: string;
      piezas: {
        etiqueta: string;
        lenguaje: "csharp" | "bash" | "sql";
        lineas: string[];
      }[];
      /** Lo que hacen después de copiarlo. */
      luego?: string;
    }
  | {
      tipo: "solucion";
      /** El reto o 🔨 que resuelve (va justo después de él). */
      de: "reto" | "rompelo";
      /** El título del reto que resuelve. */
      titulo: string;
      /** El código del resultado, por partes: cada una dice dónde va. */
      piezas: {
        etiqueta: string;
        lenguaje: "csharp" | "bash" | "sql";
        lineas: string[];
      }[];
      /** Una línea que explica la solución (opcional). */
      nota?: string;
    }
  | {
      tipo: "aprendizaje";
      idea: string;
      puntos: { termino: string; definicion: string }[];
      decision?: string;
      commit?: { mensaje: string; preguntas: string[] };
      guardar?: string;
      siguiente?: { seccion: string; texto: string };
    };

export type Seccion = {
  numero: number;
  titulo: string;
  laminas: Lamina[];
};
