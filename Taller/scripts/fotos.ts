// Para cada lámina de las secciones pedidas, el frame en que ya entró todo su contenido.
// Lo usa scripts/fotos.mjs para renderizar una foto de cada lámina y revisarlas.
import { secciones } from "../src/contenido";
import { ENTRADA, ubicar } from "../src/tiempos";

export type Foto = { seccion: number; lamina: number; tipo: string; frame: number };

export const listar = (pedidas: number[]): Foto[] =>
  secciones
    .filter((s) => pedidas.length === 0 || pedidas.includes(s.numero))
    .flatMap((s) =>
      ubicar([s]).map((u) => ({
        seccion: s.numero,
        lamina: u.indiceEnSeccion + 1,
        tipo: u.lamina.tipo,
        frame: u.desde + u.plan.inicios[u.plan.inicios.length - 1] + ENTRADA + 4,
      })),
    );
