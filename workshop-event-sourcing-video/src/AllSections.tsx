// Las 5 secciones, una tras otra, en un solo video.
import React from "react";
import { Series } from "remotion";
import { sections } from "./data/sections";
import { totalFrames } from "./scenes";
import { SectionVideo } from "./SectionVideo";

export const AllSections: React.FC = () => (
  <Series>
    {sections.map((s) => (
      <Series.Sequence key={s.slug} durationInFrames={totalFrames(s)}>
        <SectionVideo section={s} />
      </Series.Sequence>
    ))}
  </Series>
);
