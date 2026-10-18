import React, { useMemo } from "react";
import { AbsoluteFill, Series } from "remotion";
import { seccionPorNumero } from "./contenido";
import { color } from "./estilo/tema";
import "./estilo/fuentes";
import { ubicar } from "./tiempos";
import { LaminaVista } from "./vista/LaminaVista";

export type PropsDePresentacion = { secciones: number[] };

// Las láminas de las secciones pedidas, una tras otra.
export const Presentacion: React.FC<PropsDePresentacion> = ({ secciones }) => {
  const laminas = useMemo(() => ubicar(secciones.map(seccionPorNumero)), [secciones]);
  return (
    <AbsoluteFill style={{ background: color.fondo }}>
      <Series>
        {laminas.map((u) => (
          <Series.Sequence
            key={`${u.seccion.numero}-${u.indiceEnSeccion}`}
            durationInFrames={u.plan.duracion}
            name={`${u.seccion.numero}.${u.indiceEnSeccion + 1} ${u.lamina.tipo}`}
          >
            <LaminaVista u={u} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
