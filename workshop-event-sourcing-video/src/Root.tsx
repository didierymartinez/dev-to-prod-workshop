// Registra una composición por sección (+ la combinada). Añadir una sección en
// data/sections.ts crea su composición automáticamente.
import React from "react";
import { Composition } from "remotion";
import { theme } from "./theme";
import { sections } from "./data/sections";
import { totalFrames } from "./scenes";
import { SectionVideo } from "./SectionVideo";
import { AllSections } from "./AllSections";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {sections.map((s) => (
        <Composition
          key={s.slug}
          id={`s${s.number}-${s.slug}`}
          component={SectionVideo}
          durationInFrames={totalFrames(s)}
          fps={theme.fps}
          width={theme.width}
          height={theme.height}
          defaultProps={{ section: s }}
        />
      ))}
      <Composition
        id="todas-las-secciones"
        component={AllSections}
        durationInFrames={sections.reduce((acc, s) => acc + totalFrames(s), 0)}
        fps={theme.fps}
        width={theme.width}
        height={theme.height}
      />
    </>
  );
};
