// Sistema visual de la presentación: fondo oscuro tipo editor (el mismo de los videos
// del taller), un color por tipo de lámina y tamaños pensados para proyector.
import { familiaMono, familiaSans } from "./fuentes";
import type { TipoLamina } from "../contenido/tipos";

export const lienzo = { ancho: 1920, alto: 1080, fps: 30 } as const;

export const color = {
  fondo: "#0E1320",
  fondoAbajo: "#161D2E",
  texto: "#E6E9EF",
  tenue: "#9AA5B1",
  muyTenue: "#5B6676",
  panel: "#1A2233",
  borde: "rgba(255,255,255,0.08)",
  codigo: "#0F1626",
  codigoEnLinea: "rgba(255,255,255,0.08)",
} as const;

// Un acento por tipo: el grupo reconoce de un vistazo en qué momento del ciclo está.
export const acento: Record<TipoLamina, string> = {
  portada: "#4ECDC4",
  planteamiento: "#FF6B6B",
  reto: "#4ECDC4",
  rompelo: "#FF8B6B",
  codigo: "#4ECDC4",
  aprendizaje: "#7AA2F7",
};

export const etiqueta: Record<TipoLamina, string> = {
  portada: "",
  planteamiento: "💥 El problema",
  reto: "🛠️ Reto",
  rompelo: "🔨 Rómpelo",
  codigo: "🛠️ Código",
  aprendizaje: "🧠 Lo que te llevas",
};

// Colores que no dependen del tipo de lámina.
export const tono = {
  nuevo: "#C792EA",
  ok: "#6BCB77",
  error: "#FF6B6B",
  piensa: "#FFD166",
} as const;

export const fuente = {
  sans: `${familiaSans}, -apple-system, "Segoe UI", sans-serif`,
  mono: `${familiaMono}, "SF Mono", Menlo, Consolas, monospace`,
} as const;

// En el código, "--" y "=>" se ven tal cual se teclean: sin ligaduras.
export const sinLigaduras = { fontVariantLigatures: "none", fontFeatureSettings: '"liga" 0, "calt" 0' } as const;

// Tamaños para 1920 px de ancho (el doble aprox. de los mínimos para 1080 px).
export const tam = {
  enorme: 112,
  titulo: 84,
  grande: 64,
  cuerpo: 52,
  codigo: 42,
  etiqueta: 34,
  pie: 28,
} as const;

// Márgenes seguros: el contenido importante nunca toca el borde del proyector.
export const margen = { lado: 150, arriba: 110, abajo: 120 } as const;

// Colores de sintaxis.
export const sintaxis = {
  comentario: "#6B7280",
  cadena: "#FFD166",
  numero: "#C792EA",
  clave: "#FF8B6B",
  tipo: "#4ECDC4",
  ident: "#E6E9EF",
  signo: "#9AA5B1",
} as const;
