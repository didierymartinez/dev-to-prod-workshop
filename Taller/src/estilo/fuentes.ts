// Fuentes con @remotion/google-fonts: bloquean el render hasta que cargan,
// así el video sale igual en cualquier máquina. Se cargan al importar el módulo.
import { loadFont as cargarSans } from "@remotion/google-fonts/Inter";
import { loadFont as cargarMono } from "@remotion/google-fonts/JetBrainsMono";

const sans = cargarSans("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});
const mono = cargarMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});

export const familiaSans = sans.fontFamily;
export const familiaMono = mono.fontFamily;
