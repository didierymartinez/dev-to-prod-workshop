import { seccion01 } from "./seccion-01";
import { seccion02 } from "./seccion-02";
import { seccion03 } from "./seccion-03";
import type { Seccion } from "./tipos";

// Las secciones de la presentación, en el orden del taller.
export const secciones: Seccion[] = [seccion01, seccion02, seccion03];

export const seccionPorNumero = (n: number): Seccion => {
  const s = secciones.find((x) => x.numero === n);
  if (!s) throw new Error(`No hay láminas para la sección ${n}`);
  return s;
};
