import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Section, sections } from "../data/sections";

const TOTAL = String(sections.length).padStart(2, "0");

/** Barra de progreso continua + pie con el nombre del taller y el número de sección.
 *  Recibe el total en frames para funcionar igual en la composición por-sección
 *  y dentro de la composición "todas" (donde el frame es local a la sección). */
export const Footer: React.FC<{ section: Section; totalInFrames: number }> = ({
  section,
  totalInFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, totalInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 64px 42px",
          color: theme.textDim,
          fontFamily: theme.fontSans,
          fontSize: 26,
        }}
      >
        <span>Taller · Event Sourcing — Academia de Ingeniería de Software</span>
        <span style={{ color: section.accent, fontWeight: 600 }}>
          {String(section.number).padStart(2, "0")} / {TOTAL}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 6,
          width: `${progress * 100}%`,
          background: section.accent,
          boxShadow: `0 0 18px ${section.accent}88`,
        }}
      />
    </AbsoluteFill>
  );
};
