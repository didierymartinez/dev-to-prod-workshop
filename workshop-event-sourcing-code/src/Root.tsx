import React from "react";
import { Composition } from "remotion";
import { theme } from "./theme";
import { CodeEvolution, EVO_DURATION } from "./CodeEvolution";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="evolucion-del-codigo"
      component={CodeEvolution}
      durationInFrames={EVO_DURATION}
      fps={theme.fps}
      width={theme.width}
      height={theme.height}
    />
  );
};
