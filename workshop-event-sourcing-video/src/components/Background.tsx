import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/** Fondo oscuro con dos resplandores del color de acento y una rejilla sutil. */
export const Background: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 900], [0, 26]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${theme.bgGradientTop} 0%, ${theme.bgGradientBottom} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(1000px 560px at ${18 + drift}% -12%, ${accent}26, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(820px 560px at ${92 - drift}% 112%, ${accent}1C, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "66px 66px",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 42%, black, transparent 78%)",
          maskImage:
            "radial-gradient(circle at 50% 42%, black, transparent 78%)",
        }}
      />
    </AbsoluteFill>
  );
};
