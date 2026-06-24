// Carga de fuentes con @remotion/google-fonts (recomendado por el skill):
// es type-safe y BLOQUEA el render hasta que la fuente está lista → render reproducible
// entre máquinas y medición de texto (fitText) fiable. Se llama a nivel de módulo.
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const sans = loadSans("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const fontFamilySans = sans.fontFamily;
export const fontFamilyMono = mono.fontFamily;
