// Sistema de diseño compartido por todos los videos.
// Hereda la "voz" del taller: tono cálido, fondo oscuro tipo editor, emojis por sección.
import { fontFamilySans, fontFamilyMono } from "./fonts";

export const theme = {
  // Lienzo
  fps: 30,
  width: 1920,
  height: 1080,

  // Colores base
  bg: "#0E1320",
  bgGradientTop: "#0E1320",
  bgGradientBottom: "#161D2E",
  text: "#E6E9EF",
  textDim: "#9AA5B1",
  pain: "#FF6B6B",

  // Paneles / código
  panel: "#1A2233",
  panelBorder: "rgba(255,255,255,0.08)",
  codeBg: "#0F1626",

  // Tipografía: fuentes de Google Fonts cargadas vía @remotion/google-fonts
  // (render reproducible). Con fallback del sistema por si acaso.
  fontSans: `${fontFamilySans}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  fontMono: `${fontFamilyMono}, "SF Mono", Menlo, Consolas, "Courier New", monospace`,
  // Familia mono "pura" (sin fallback) para medir con fitText/measureText.
  fontMonoFamily: fontFamilyMono,

  // Colores de sintaxis para el resaltador de C#
  syntax: {
    comment: "#6B7280",
    string: "#FFD166",
    number: "#C792EA",
    keyword: "#FF8B6B",
    type: "#4ECDC4",
    ident: "#E6E9EF",
    punct: "#9AA5B1",
  } as const,
};

export type Theme = typeof theme;
