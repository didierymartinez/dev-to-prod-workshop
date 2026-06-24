// Ensambla el video de UNA sección: fondo + secuencia de escenas + footer.
import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { theme } from "./theme";
import { Section } from "./data/sections";
import { buildScenes, SceneDesc, totalFrames } from "./scenes";
import { Background } from "./components/Background";
import { Footer } from "./components/Footer";
import {
  TitleScene,
  ObjectiveScene,
  PainScene,
  MechanismScene,
  CodeScene,
  OneLinerScene,
} from "./SceneComponents";

const renderScene = (sc: SceneDesc, section: Section) => {
  const props = { section, durationInFrames: sc.durationInFrames };
  switch (sc.kind) {
    case "title":
      return <TitleScene {...props} />;
    case "objetivo":
      return <ObjectiveScene {...props} />;
    case "pain":
      return <PainScene {...props} />;
    case "mechanism":
      return <MechanismScene {...props} />;
    case "code":
      return <CodeScene {...props} />;
    case "oneliner":
      return <OneLinerScene {...props} />;
  }
};

export const SectionVideo: React.FC<{ section: Section }> = ({ section }) => {
  const scenes = buildScenes(section);
  const total = totalFrames(section);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Background accent={section.accent} />
      <Series>
        {scenes.map((sc, i) => (
          <Series.Sequence key={i} durationInFrames={sc.durationInFrames}>
            {renderScene(sc, section)}
          </Series.Sequence>
        ))}
      </Series>
      <Footer section={section} totalInFrames={total} />
    </AbsoluteFill>
  );
};
