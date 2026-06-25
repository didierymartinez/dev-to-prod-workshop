import React from "react";
import { Easing } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { theme } from "../theme";
import { tokenize } from "../highlight";

// Primitivas compartidas por las animaciones de mecanismo (la "evolución/flujo").
// Buenas prácticas del skill: interpolate() + Easing.bezier (sin spring),
// propiedades CSS individuales (translate/scale).

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Alfa hex de 2 dígitos a partir de 0..1. */
export const hexA = (n: number) =>
  Math.round(Math.max(0, Math.min(1, n)) * 255)
    .toString(16)
    .padStart(2, "0");

/** Renderiza una línea de código C# con resaltado de sintaxis. */
const renderCode = (line: string) =>
  tokenize(line).length === 0
    ? " "
    : tokenize(line).map((tk, j) => (
        <span key={j} style={{ color: tk.kind === "ws" ? undefined : theme.syntax[tk.kind] }}>
          {tk.text}
        </span>
      ));

/** Panel de código real con la(s) línea(s) activa(s) resaltada(s), tamaño medido con fitText.
 *  `glow(idx)` devuelve 0..1 para encender cada línea en sincronía con la animación. */
export const CodePanel: React.FC<{
  lines: string[];
  glow: (idx: number) => number;
  accent: string;
  width?: number;
  title?: string;
  maxFont?: number;
}> = ({ lines, glow, accent, width = 1080, title, maxFont = 25 }) => {
  const PAD = 28;
  const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), "");
  const font = Math.min(
    maxFont,
    Math.floor(
      fitText({
        text: longest || " ",
        withinWidth: width - PAD * 2,
        fontFamily: theme.fontMonoFamily,
        fontWeight: "normal",
      }).fontSize,
    ),
  );
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 12 }}>
      {title ? (
        <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, textAlign: "center" }}>
          {title}
        </div>
      ) : null}
      <div
        style={{
          background: theme.codeBg,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: 16,
          padding: `${PAD - 6}px ${PAD}px`,
          fontFamily: theme.fontMono,
          fontSize: font,
          lineHeight: 1.6,
          whiteSpace: "pre",
        }}
      >
        {lines.map((line, idx) => {
          const g = glow(idx);
          return (
            <div
              key={idx}
              style={{
                background: `${accent}${g > 0.02 ? hexA(g * 0.32) : "00"}`,
                borderLeft: `4px solid ${g > 0.3 ? accent : "transparent"}`,
                borderRadius: 6,
                paddingLeft: 10,
                marginLeft: -10,
              }}
            >
              {renderCode(line)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Columna con título centrado y un slot de contenido (layout en flex, no absoluto). */
export const Slot: React.FC<{
  title: string;
  color: string;
  width: number;
  children: React.ReactNode;
}> = ({ title, color, width, children }) => (
  <div style={{ width, display: "flex", flexDirection: "column", gap: 18 }}>
    <div
      style={{
        color,
        fontFamily: theme.fontSans,
        fontSize: 28,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

/** Flecha de flujo entre columnas; se enciende cuando algo "pasa" por ella. */
export const Arrow: React.FC<{ color: string; active: boolean }> = ({ color, active }) => (
  <div
    style={{
      fontSize: 56,
      color,
      opacity: active ? 1 : 0.3,
      scale: String(active ? 1.15 : 1),
    }}
  >
    →
  </div>
);

export type CardState = "active" | "consumed" | "pending";

/** Tarjeta de un hecho del stream. */
export const EventCard: React.FC<{
  index?: number;
  name: string;
  detail?: string;
  accent: string;
  state: CardState;
  opacity?: number;
}> = ({ index, name, detail, accent, state, opacity = 1 }) => {
  const base = state === "active" ? 1 : state === "consumed" ? 0.32 : 0.62;
  return (
    <div
      style={{
        opacity: base * opacity,
        scale: String(state === "active" ? 1.03 : 1),
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        background: theme.panel,
        border: `1px solid ${state === "active" ? accent : theme.panelBorder}`,
        borderLeft: `5px solid ${state === "active" ? accent : `${accent}55`}`,
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      {index !== undefined ? (
        <span style={{ color: accent, fontFamily: theme.fontMono, fontSize: 24 }}>
          #{index}
        </span>
      ) : null}
      <span style={{ color: theme.text, fontFamily: theme.fontMono, fontSize: 26 }}>
        {name}
        {detail ? <span style={{ color: theme.syntax.string }}> {detail}</span> : null}
      </span>
    </div>
  );
};

/** Caja del agregado: borde grueso = su frontera; el estado se muta solo adentro. */
export const AggregateBox: React.FC<{
  accent: string;
  title: string;
  children: React.ReactNode;
  note?: string;
  width?: number;
}> = ({ accent, title, children, note, width = 540 }) => (
  <div style={{ width, display: "flex", flexDirection: "column", gap: 16 }}>
    <div
      style={{
        color: accent,
        fontFamily: theme.fontSans,
        fontSize: 28,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      {title}
    </div>
    <div
      style={{
        background: theme.panel,
        border: `3px solid ${accent}`,
        borderRadius: 18,
        padding: "24px 28px",
        boxShadow: `0 0 0 1px ${accent}22, 0 30px 70px rgba(0,0,0,0.4)`,
      }}
    >
      {children}
      {note ? (
        <div
          style={{
            marginTop: 16,
            color: accent,
            fontFamily: theme.fontSans,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  </div>
);

/** Pie narrativo (cursor de la animación). */
export const Caption: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 96,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: theme.fontSans,
      fontSize: 34,
      color,
      fontWeight: 600,
      padding: "0 120px",
    }}
  >
    {children}
  </div>
);
