import { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { ENTRADA } from "../tiempos";

/** Frame (relativo a la lámina) en que empieza cada golpe. */
export const InicioDeGolpes = createContext<number[]>([0]);

const suave = Easing.bezier(0.16, 1, 0.3, 1);

/** Estilo de entrada de un elemento que aparece en el golpe `golpe`. */
export const useAparece = (golpe: number, desplazamiento = 28, retraso = 0) => {
  const frame = useCurrentFrame();
  const inicios = useContext(InicioDeGolpes);
  const ini = inicios[Math.min(golpe, inicios.length - 1)] ?? 0;
  // Con `retraso`, el elemento entra un poco después, pero termina con el golpe:
  // así el presentador nunca se detiene a media animación.
  const p = interpolate(frame, [ini + Math.min(retraso, ENTRADA - 6), ini + ENTRADA], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: suave,
  });
  return {
    opacity: p,
    translate: `0px ${(1 - p) * desplazamiento}px`,
  } as const;
};

/** Progreso 0→1 de la entrada del golpe (para barras, trazos, etc.). */
export const useProgreso = (golpe: number) => {
  const frame = useCurrentFrame();
  const inicios = useContext(InicioDeGolpes);
  const ini = inicios[Math.min(golpe, inicios.length - 1)] ?? 0;
  return interpolate(frame, [ini, ini + ENTRADA * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: suave,
  });
};
