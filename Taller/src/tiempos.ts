// Tiempos de la presentación.
//
// Cada lámina avanza por "golpes". Un golpe = ENTRADA frames de animación + una pausa
// de lectura. En el video renderizado la pausa corre sola; en modo presentación
// (presentador/) el reproductor se detiene al terminar la entrada y espera tu flecha.
//
// Golpes por tipo:
//   portada        1
//   planteamiento  uno por bloque (o por ítem, si la lista va `porItem`)
//   reto, rompelo  1: la pantalla de trabajo aparece entera
//   aprendizaje    2: lo que te llevas, y luego el cierre (decisión y commit)
import type { Bloque, Lamina, Seccion } from "./contenido/tipos";

export const ENTRADA = 18; // 0,6 s a 30 fps

const textoDeBloque = (b: Bloque): string[] => {
  switch (b.k) {
    case "texto":
    case "respuesta":
      return [b.texto];
    case "lista":
    case "diario":
      return b.porItem ? b.items : [b.items.join(" ")];
    case "tabla":
      return [[...b.columnas, ...b.filas.flat()].join(" ")];
    case "clases":
      return [
        b.cajas
          .map((c) => `${c.nombre} ${c.filas.map((f) => f.texto).join(" ")}`)
          .join(" "),
      ];
    case "codigo":
      return [b.lineas.join(" ")];
    case "terminal":
      return [`${b.comando ?? ""} ${b.salida.join(" ")}`];
  }
};

export type PlanDeLamina = {
  /** Golpe en que aparece cada bloque del planteamiento (en listas por ítem, el del primero). */
  golpeDeBloque: number[];
  /** Frame (relativo a la lámina) en que empieza cada golpe. */
  inicios: number[];
  duracion: number;
};

const pausaDeLectura = (texto: string, min = 60, max = 240): number =>
  Math.min(max, Math.max(min, Math.round(30 + texto.length * 2)));

/** Texto que se lee en cada golpe: sirve para calcular la pausa del video. */
const textosPorGolpe = (
  l: Lamina,
): { textos: string[]; golpeDeBloque: number[] } => {
  switch (l.tipo) {
    case "portada":
      return { textos: [l.paraQue], golpeDeBloque: [] };
    case "reto":
    case "rompelo":
      return {
        textos: [
          [
            l.titulo,
            l.tarea,
            ...l.pasos,
            ...(l.logro.items ?? []),
            ...(l.tips ?? []).map((t) =>
              t.k === "nuevo"
                ? t.explicacion
                : t.k === "lista"
                  ? t.items.join(" ")
                  : t.texto,
            ),
          ].join(" "),
        ],
        golpeDeBloque: [],
      };
    case "codigo":
    case "solucion":
      return {
        textos: [
          [
            l.titulo,
            ...l.piezas.flatMap((x) => [x.etiqueta, ...x.lineas]),
            (l.tipo === "codigo" ? l.luego : l.nota) ?? "",
          ].join(" "),
        ],
        golpeDeBloque: [],
      };
    case "aprendizaje":
      return {
        textos: [
          [l.idea, ...l.puntos.map((p) => `${p.termino} ${p.definicion}`)].join(
            " ",
          ),
          [
            l.decision ?? "",
            ...(l.commit?.preguntas ?? []),
            l.guardar ?? "",
            l.siguiente?.texto ?? "",
          ].join(" "),
        ],
        golpeDeBloque: [],
      };
    case "planteamiento": {
      const textos: string[] = [];
      const golpeDeBloque: number[] = [];
      let g = -1;
      l.bloques.forEach((b, i) => {
        if (i === 0 || !b.junto) g++;
        golpeDeBloque.push(g);
        textoDeBloque(b).forEach((t, j) => {
          if (j > 0) g++;
          textos[g] = `${textos[g] ?? ""} ${t}`;
        });
      });
      return { textos, golpeDeBloque };
    }
  }
};

export const planDeLamina = (l: Lamina): PlanDeLamina => {
  const { textos, golpeDeBloque } = textosPorGolpe(l);
  const trabajo =
    l.tipo === "reto" ||
    l.tipo === "rompelo" ||
    l.tipo === "codigo" ||
    l.tipo === "solucion";
  const inicios: number[] = [];
  let t = 0;
  for (const texto of textos) {
    inicios.push(t);
    // En una pantalla de trabajo el video se queda más: es lo que el grupo mira mientras hace.
    t +=
      ENTRADA +
      (trabajo ? pausaDeLectura(texto, 150, 300) : pausaDeLectura(texto));
  }
  return { golpeDeBloque, inicios, duracion: t };
};

export type LaminaUbicada = {
  seccion: Seccion;
  lamina: Lamina;
  indiceEnSeccion: number;
  totalEnSeccion: number;
  /** En un reto: su número y cuántos retos tiene la sección. */
  reto?: { numero: number; total: number };
  desde: number;
  plan: PlanDeLamina;
};

/** Todas las láminas de las secciones, una tras otra, con su frame de inicio. */
export const ubicar = (secciones: Seccion[]): LaminaUbicada[] => {
  const salida: LaminaUbicada[] = [];
  let desde = 0;
  for (const seccion of secciones) {
    const totalRetos = seccion.laminas.filter((l) => l.tipo === "reto").length;
    let reto = 0;
    seccion.laminas.forEach((lamina, i) => {
      const plan = planDeLamina(lamina);
      if (lamina.tipo === "reto") reto++;
      salida.push({
        seccion,
        lamina,
        indiceEnSeccion: i,
        totalEnSeccion: seccion.laminas.length,
        // la solución lleva el número del reto que resuelve
        reto:
          lamina.tipo === "reto" ||
          (lamina.tipo === "solucion" && lamina.de === "reto")
            ? { numero: reto, total: totalRetos }
            : undefined,
        desde,
        plan,
      });
      desde += plan.duracion;
    });
  }
  return salida;
};

export const duracionTotal = (secciones: Seccion[]): number =>
  ubicar(secciones).reduce((s, l) => s + l.plan.duracion, 0);

export type Parada = {
  /** Frame global donde empieza la animación del golpe. */
  inicio: number;
  /** Frame global donde el golpe ya terminó de entrar: ahí se detiene el presentador. */
  fin: number;
  seccion: number;
  lamina: number;
  golpe: number;
  primeraDeSeccion: boolean;
};

/** Las paradas del modo presentación: una por golpe. */
export const paradas = (secciones: Seccion[]): Parada[] =>
  ubicar(secciones).flatMap((u) =>
    u.plan.inicios.map((ini, golpe) => ({
      inicio: u.desde + ini,
      fin: u.desde + ini + ENTRADA,
      seccion: u.seccion.numero,
      lamina: u.indiceEnSeccion,
      golpe,
      primeraDeSeccion: u.indiceEnSeccion === 0 && golpe === 0,
    })),
  );
