import { fontFamilySans, fontFamilyMono } from "./fonts";

export const theme = {
  fps: 30,
  width: 1920,
  height: 1080,

  bgTop: "#0E1320",
  bgBottom: "#11192B",
  text: "#E6E9EF",
  textDim: "#9AA5B1",
  panel: "#0F1626",
  panelBorder: "rgba(255,255,255,0.08)",

  accent: "#4ECDC4",
  add: "#6BCB77", // líneas nuevas
  del: "#FF6B6B", // líneas que se van

  fontSans: `${fontFamilySans}, -apple-system, "Segoe UI", sans-serif`,
  fontMono: `${fontFamilyMono}, "SF Mono", Menlo, monospace`,
  fontMonoFamily: fontFamilyMono,

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
