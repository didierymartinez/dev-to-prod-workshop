import React from "react";
import { Composition, Folder } from "remotion";
import { secciones } from "./contenido";
import { lienzo } from "./estilo/tema";
import { Presentacion } from "./Presentacion";
import { duracionTotal } from "./tiempos";

const id = (n: number) => `seccion-${String(n).padStart(2, "0")}`;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Secciones">
      {secciones.map((s) => (
        <Composition
          key={s.numero}
          id={id(s.numero)}
          component={Presentacion}
          durationInFrames={duracionTotal([s])}
          fps={lienzo.fps}
          width={lienzo.ancho}
          height={lienzo.alto}
          defaultProps={{ secciones: [s.numero] }}
        />
      ))}
    </Folder>
    <Composition
      id="taller"
      component={Presentacion}
      durationInFrames={duracionTotal(secciones)}
      fps={lienzo.fps}
      width={lienzo.ancho}
      height={lienzo.alto}
      defaultProps={{ secciones: secciones.map((s) => s.numero) }}
    />
  </>
);
