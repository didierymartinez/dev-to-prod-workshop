import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel, Caption, hexA } from "./mechanics";

// Motor de mecanismo DATA-DRIVEN: una secuencia de beats que cuenta la evolución de un
// concepto (estilo §3/§5). Cada beat: una barra de "qué hacemos", código con la línea
// encendida, un panel lateral (estado/lista/salida/texto) y una nota. Tiempo generoso por
// beat para que dé tiempo a entender cada flujo. Así cada sección del taller es DATA.

export type SideRow = { k: string; v: string };
export type Side = {
  title?: string;
  kind: "state" | "list" | "text" | "output";
  rows?: SideRow[];
  items?: string[];
  text?: string;
  flashKey?: string; // clave de la fila que se resalta en este beat
};
export type Beat = {
  tag: string;
  code?: string[];
  glow?: number[];
  note: string;
  side?: Side;
  badge?: string;
};

export const INTRO = 14;
export const BEAT = 122; // generoso: tiempo para leer el diagrama
export const HOLD = 78;
export const beatsDuration = (n: number) => INTRO + n * BEAT + HOLD;

export const BeatSequence: React.FC<{ accent: string; beats: Beat[] }> = ({ accent, beats }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const i = t < 0 ? 0 : Math.min(beats.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - i * BEAT;
  const beat = beats[i];
  const finished = t >= beats.length * BEAT - 6;

  // Empiezan desde un piso de opacidad (no 0) para que NUNCA quede el centro en blanco
  // al cambiar de beat (antes había ~10 frames vacíos en cada transición).
  const tagIn = interpolate(b, [0, 12], [0.5, 1], { easing: EASE, ...clamp });
  const bodyIn = interpolate(b, [0, 14], [0.4, 1], { easing: EASE, ...clamp });
  const glowAmt = interpolate(b, [26, 42, BEAT], [0, 1, 0.6], clamp);
  const flash = interpolate(b, [42, 56, 88], [0, 1, 0], clamp);
  const badgeIn = beat.badge ? interpolate(b, [46, 66], [0, 1], { easing: EASE, ...clamp }) : 0;

  const hasCode = !!beat.code && beat.code.length > 0;
  const hasSide = !!beat.side;
  const codeW = hasSide ? 1000 : 1320;
  const sideW = hasCode ? 480 : 900;

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 150, paddingBottom: 150 }}>
      {/* qué estamos haciendo (paso) */}
      <div
        style={{
          opacity: tagIn,
          background: theme.panel,
          border: `2px solid ${accent}`,
          borderRadius: 12,
          padding: "12px 26px",
          fontFamily: theme.fontSans,
          fontSize: 28,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 24,
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        <span style={{ color: accent }}>{i + 1}/{beats.length}</span> · {beat.tag}
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "stretch", justifyContent: "center", opacity: bodyIn }}>
        {hasCode ? (
          <CodePanel lines={beat.code!} glow={(idx) => (beat.glow?.includes(idx) ? glowAmt : 0)} accent={accent} width={codeW} />
        ) : null}
        {hasSide ? <SidePanel side={beat.side!} accent={accent} width={sideW} flash={flash} /> : null}
      </div>

      {beat.badge ? (
        <div
          style={{
            opacity: badgeIn,
            translate: `0px ${(1 - badgeIn) * 12}px`,
            marginTop: 22,
            background: `${accent}1A`,
            border: `1px solid ${accent}66`,
            borderRadius: 12,
            padding: "12px 24px",
            fontFamily: theme.fontSans,
            fontSize: 30,
            fontWeight: 800,
            color: accent,
          }}
        >
          {beat.badge}
        </div>
      ) : null}

      <Caption color={finished ? accent : theme.textDim}>{finished ? beats[beats.length - 1].note : beat.note}</Caption>
    </AbsoluteFill>
  );
};

const SidePanel: React.FC<{ side: Side; accent: string; width: number; flash: number }> = ({ side, accent, width, flash }) => {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 12 }}>
      {side.title ? (
        <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 24, fontWeight: 700, textAlign: "center" }}>{side.title}</div>
      ) : null}
      <div
        style={{
          flex: 1,
          background: theme.panel,
          border: `2px solid ${accent}`,
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {side.kind === "state"
          ? (side.rows ?? []).map((r) => {
              const on = side.flashKey === r.k;
              return (
                <div
                  key={r.k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 12px",
                    borderRadius: 9,
                    background: on ? `${accent}${hexA(flash * 0.35)}` : "transparent",
                    borderBottom: `1px solid ${theme.panelBorder}`,
                    fontFamily: theme.fontMono,
                  }}
                >
                  <span style={{ color: theme.textDim, fontSize: 25 }}>{r.k}</span>
                  <span style={{ color: on && flash > 0.05 ? accent : theme.text, fontSize: 26, fontWeight: 700, scale: String(1 + (on ? flash : 0) * 0.16) }}>{r.v}</span>
                </div>
              );
            })
          : null}

        {side.kind === "list"
          ? (side.items ?? []).map((it, k) => (
              <div key={k} style={{ display: "flex", gap: 12, alignItems: "baseline", fontFamily: theme.fontMono, fontSize: 24, color: theme.text }}>
                <span style={{ color: accent }}>•</span>
                <span>{it}</span>
              </div>
            ))
          : null}

        {side.kind === "output" ? (
          <div style={{ fontFamily: theme.fontMono, fontSize: 24, color: theme.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{side.text}</div>
        ) : null}

        {side.kind === "text" ? (
          <div style={{ fontFamily: theme.fontSans, fontSize: 30, color: theme.text, lineHeight: 1.4, textAlign: "center" }}>{side.text}</div>
        ) : null}
      </div>
    </div>
  );
};
