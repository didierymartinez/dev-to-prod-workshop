import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { theme } from "../theme";
import { tokenize } from "../highlight";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const PER_LINE = 6; // frames de separación entre líneas al aparecer
const FADE = 14;

/** Ventana de editor con código C# resaltado que se revela línea por línea. */
export const CodeBlock: React.FC<{
  lines: string[];
  filename?: string;
  accent: string;
}> = ({ lines, filename = "Program.cs", accent }) => {
  const frame = useCurrentFrame();

  // Tamaño de fuente: se MIDE la línea más larga con fitText (@remotion/layout-utils)
  // para que quepa exacta a lo ancho; luego se acota por alto y por un máximo estético.
  // (La fuente mono ya está cargada vía @remotion/google-fonts, así que la medición es fiable.)
  const BLOCK_W = 1560;
  const PAD_X = 36;
  const CODE_H = 640; // alto disponible para el texto del código
  const LH = 1.55;
  const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), "");
  const fitted = fitText({
    text: longest || " ",
    withinWidth: BLOCK_W - PAD_X * 2,
    fontFamily: theme.fontMonoFamily,
    fontWeight: "normal",
  });
  const byHeight = CODE_H / (lines.length * LH);
  const fontSize = Math.max(16, Math.min(35, Math.floor(Math.min(fitted.fontSize, byHeight))));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: BLOCK_W,
        margin: "0 auto",
        borderRadius: 18,
        background: theme.codeBg,
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px ${accent}22`,
        overflow: "hidden",
      }}
    >
      {/* barra de ventana estilo mac */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 22px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: `1px solid ${theme.panelBorder}`,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 999, background: "#FF5F56" }} />
        <span style={{ width: 14, height: 14, borderRadius: 999, background: "#FFBD2E" }} />
        <span style={{ width: 14, height: 14, borderRadius: 999, background: "#27C93F" }} />
        <span
          style={{
            marginLeft: 14,
            color: theme.textDim,
            fontFamily: theme.fontMono,
            fontSize: 24,
          }}
        >
          {filename}
        </span>
      </div>

      {/* código */}
      <div
        style={{
          padding: `26px ${PAD_X}px`,
          fontFamily: theme.fontMono,
          fontSize,
          lineHeight: LH,
          whiteSpace: "pre",
        }}
      >
        {lines.map((line, i) => {
          const start = 10 + i * PER_LINE;
          const opacity = interpolate(frame, [start, start + FADE], [0, 1], {
            easing: EASE,
            ...clamp,
          });
          const x = interpolate(frame, [start, start + FADE], [-14, 0], {
            easing: EASE,
            ...clamp,
          });
          const tokens = tokenize(line);
          return (
            <div
              key={i}
              style={{ opacity, translate: `${x}px 0px`, minHeight: fontSize * LH }}
            >
              {tokens.length === 0
                ? " "
                : tokens.map((t, j) => (
                    <span
                      key={j}
                      style={{
                        color:
                          t.kind === "ws" ? undefined : theme.syntax[t.kind],
                        fontStyle: t.kind === "comment" ? "italic" : undefined,
                      }}
                    >
                      {t.text}
                    </span>
                  ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
