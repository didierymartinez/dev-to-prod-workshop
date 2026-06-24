// Ayudantes de animación reutilizables.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// El skill: preferir interpolate() + Easing.bezier sobre spring().
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Envuelve una escena: entrada (fade-in) y salida (fade-out) automáticas sobre el fondo. */
export const Scene: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ durationInFrames, children, style }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], clamp);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    clamp,
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), ...style }}>
      {children}
    </AbsoluteFill>
  );
};

/** Aparece desde abajo, con entrada suave (ease-out). */
export const FadeUp: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 26, children, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], { easing: EASE, ...clamp });
  const ty = interpolate(frame, [delay, delay + 18], [y, 0], { easing: EASE, ...clamp });
  // Propiedad CSS individual `translate` (editable en Studio), no string transform.
  return (
    <div style={{ opacity, translate: `0px ${ty}px`, ...style }}>{children}</div>
  );
};

/** Chip de etiqueta de escena (p. ej. "🎯 El objetivo"). */
export const Label: React.FC<{
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ color, children, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 26px",
      borderRadius: 999,
      background: `${color}1A`,
      border: `1px solid ${color}55`,
      color,
      fontFamily: theme.fontSans,
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: 0.3,
      ...style,
    }}
  >
    {children}
  </div>
);
