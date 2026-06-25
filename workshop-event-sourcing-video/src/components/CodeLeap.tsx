import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel, Caption } from "./mechanics";

// Descubrimiento genérico: el salto ANTES → DESPUÉS de un concepto (data-driven).
// Marca el hallazgo (el "se debe notar") en vez de pasarlo de largo.

export const CODE_LEAP_DURATION = 220;

export const CodeLeap: React.FC<{
  before: string[];
  after: string[];
  title: string;
  sub: string;
  accent: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeColor?: string;
}> = ({ before, after, title, sub, accent, beforeLabel = "❌ antes — el dolor", afterLabel = "✅ después", beforeColor = theme.pain }) => {
  const frame = useCurrentFrame();
  const beforeIn = interpolate(frame, [8, 26], [0, 1], { easing: EASE, ...clamp });
  const arrowIn = interpolate(frame, [44, 62], [0, 1], { easing: EASE, ...clamp });
  const afterIn = interpolate(frame, [50, 78], [0, 1], { easing: EASE, ...clamp });
  const beforeDim = interpolate(frame, [50, 78], [1, 0.42], { easing: EASE, ...clamp });
  const reveal = interpolate(frame, [88, 120], [0, 1], { easing: EASE, ...clamp });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "150px 100px 200px", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 38, alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: beforeIn * beforeDim, width: 660 }}>
          <CodePanel lines={before} glow={() => 0} accent={beforeColor} width={660} title={beforeLabel} maxFont={26} />
        </div>

        <div style={{ fontSize: 60, color: accent, opacity: arrowIn, scale: String(0.8 + arrowIn * 0.3) }}>→</div>

        <div
          style={{
            opacity: afterIn,
            width: 720,
            scale: String(0.96 + afterIn * 0.04),
            borderRadius: 18,
            boxShadow: `0 0 ${reveal * 64}px ${accent}${reveal > 0.05 ? "55" : "00"}`,
          }}
        >
          <CodePanel lines={after} glow={() => (afterIn > 0.6 ? 0.22 : 0)} accent={accent} width={720} title={afterLabel} maxFont={27} />
        </div>
      </div>

      <div style={{ opacity: reveal, translate: `0px ${(1 - reveal) * 18}px`, marginTop: 32, textAlign: "center" }}>
        <div style={{ fontFamily: theme.fontSans, fontSize: 44, fontWeight: 800, color: accent }}>🎉 {title}</div>
        <div style={{ fontFamily: theme.fontSans, fontSize: 30, color: theme.textDim, marginTop: 8, maxWidth: 1300 }}>{sub}</div>
      </div>

      <Caption color={reveal > 0.5 ? accent : theme.textDim}>
        {reveal > 0.5 ? title : afterIn > 0.4 ? "…y así queda" : "veníamos haciendo esto…"}
      </Caption>
    </AbsoluteFill>
  );
};
