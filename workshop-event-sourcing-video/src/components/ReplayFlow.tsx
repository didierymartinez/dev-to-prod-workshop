import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { theme } from "../theme";

// Animación del MECANISMO de «Los primeros hechos»: el Replay (evolve).
// Se ve la historia recorrerse: cada hecho viaja a la caja Aplicar y el estado
// del agregado Empresa muta DENTRO de su frontera, hecho por hecho.
//
// Buenas prácticas del skill: interpolate() + Easing.bezier (sin spring),
// propiedades CSS individuales (translate/scale) en vez de strings transform.

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const EVENTS = [
  { name: "EmpresaRegistrada", detail: '"Andes", "Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
  { name: "EmpresaSuspendida", detail: '"falta de pago"' },
  { name: "EmpresaReactivada", detail: "" },
  { name: "EmpresaSuspendida", detail: '"incumplimiento"' },
];

type Estado = {
  Nombre: string;
  Plan: string;
  Suspendida: string;
  Reactivaciones: number;
};

const INITIAL: Estado = { Nombre: "—", Plan: "—", Suspendida: "—", Reactivaciones: 0 };

// estado DESPUÉS de aplicar cada hecho (lo que el replay reconstruye)
const STATES: Estado[] = [
  { Nombre: "Andes", Plan: "Básico", Suspendida: "false", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "false", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "true", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "false", Reactivaciones: 1 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "true", Reactivaciones: 1 },
];
// qué campo(s) cambia cada hecho (para resaltar la mutación)
const CHANGED: (keyof Estado)[][] = [
  ["Nombre", "Plan"],
  ["Plan"],
  ["Suspendida"],
  ["Suspendida", "Reactivaciones"],
  ["Suspendida"],
];

export const INTRO = 16;
export const BEAT = 50;
export const HOLD = 64;
export const REPLAY_DURATION = INTRO + EVENTS.length * BEAT + HOLD;

const FIELDS: (keyof Estado)[] = ["Nombre", "Plan", "Suspendida", "Reactivaciones"];

export const ReplayFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const beat = t < 0 ? -1 : Math.min(EVENTS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT; // frame local dentro del beat actual
  const applied = beat >= 0 && b >= 30;
  const shownIdx = beat < 0 ? -1 : applied ? beat : beat - 1;
  const shown = shownIdx >= 0 ? STATES[shownIdx] : INITIAL;
  const finished = t >= EVENTS.length * BEAT - 6;

  // pulso de la caja Aplicar cuando procesa el hecho
  const applyPulse =
    beat >= 0 ? interpolate(b, [22, 30, 42], [0, 1, 0], clamp) : 0;

  const fieldFlash = (f: keyof Estado) =>
    beat >= 0 && CHANGED[beat].includes(f)
      ? interpolate(b, [30, 37, 50], [0, 1, 0], clamp)
      : 0;

  // hecho que "vuela" del stream a la caja Aplicar
  const flyOpacity =
    beat >= 0 ? interpolate(b, [2, 9, 28, 35], [0, 1, 1, 0], clamp) : 0;
  const flyX = interpolate(b, [4, 27], [-160, 0], { easing: EASE, ...clamp });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: "150px 150px 200px",
      }}
    >
      {/* ───────── EL STREAM (la historia) ───────── */}
      <Slot title="El Stream — la historia" color={theme.textDim} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {EVENTS.map((e, i) => {
            const isActive = i === beat;
            const isConsumed = i < beat || (i === beat && applied);
            const opacity = isActive ? 1 : isConsumed ? 0.32 : 0.62;
            const enter = interpolate(frame, [i * 4, i * 4 + 12], [0, 1], clamp);
            return (
              <div
                key={i}
                style={{
                  opacity: opacity * enter,
                  scale: String(isActive ? 1.03 : 1),
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  background: theme.panel,
                  border: `1px solid ${isActive ? accent : theme.panelBorder}`,
                  borderLeft: `5px solid ${isActive ? accent : `${accent}55`}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                }}
              >
                <span
                  style={{
                    color: accent,
                    fontFamily: theme.fontMono,
                    fontSize: 24,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    color: theme.text,
                    fontFamily: theme.fontMono,
                    fontSize: 28,
                  }}
                >
                  {e.name}
                  {e.detail ? (
                    <span style={{ color: theme.syntax.string }}> {e.detail}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </Slot>

      <Arrow color={accent} active={flyOpacity > 0.2} />

      {/* ───────── APLICAR (evolve) ───────── */}
      <Slot title="Aplicar(hecho)" color={accent} width={340}>
        <div
          style={{
            position: "relative",
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: theme.panel,
            border: `2px solid ${accent}`,
            borderRadius: 18,
            scale: String(1 + applyPulse * 0.04),
            boxShadow: `0 0 ${30 + applyPulse * 50}px ${accent}${applyPulse > 0.1 ? "66" : "22"}`,
          }}
        >
          <div style={{ textAlign: "center", padding: 24 }}>
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: 30,
                color: theme.text,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: theme.textDim }}>(estado, hecho)</span>
              <br />
              <span style={{ color: accent, fontSize: 40 }}>↓</span>
              <br />
              <span style={{ color: theme.text }}>nuevo estado</span>
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: theme.fontSans,
                fontSize: 26,
                color: accent,
                fontWeight: 700,
              }}
            >
              evolve
            </div>
          </div>

          {/* el hecho que entra al Aplicar */}
          {flyOpacity > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: 18,
                opacity: flyOpacity,
                translate: `${flyX}px 0px`,
                background: accent,
                color: "#10141F",
                fontFamily: theme.fontMono,
                fontSize: 22,
                fontWeight: 700,
                padding: "10px 16px",
                borderRadius: 10,
                boxShadow: `0 10px 30px ${accent}77`,
              }}
            >
              #{beat + 1}
            </div>
          ) : null}
        </div>
      </Slot>

      <Arrow color={accent} active={applyPulse > 0.2} />

      {/* ───────── EMPRESA (Aggregate Root) — la frontera ───────── */}
      <Slot title="Empresa — Aggregate Root" color={accent} width={560}>
        <div
          style={{
            background: theme.panel,
            border: `3px solid ${accent}`,
            borderRadius: 18,
            padding: "26px 30px",
            boxShadow: `0 0 0 1px ${accent}22, 0 30px 70px rgba(0,0,0,0.4)`,
          }}
        >
          {FIELDS.map((f) => {
            const flash = fieldFlash(f);
            return (
              <div
                key={f}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 14px",
                  borderRadius: 10,
                  background: `${accent}${flash > 0.01 ? "33" : "00"}`,
                  borderBottom: `1px solid ${theme.panelBorder}`,
                }}
              >
                <span
                  style={{
                    color: theme.textDim,
                    fontFamily: theme.fontMono,
                    fontSize: 28,
                  }}
                >
                  {f}
                </span>
                <span
                  style={{
                    color: flash > 0.05 ? accent : theme.text,
                    fontFamily: theme.fontMono,
                    fontSize: 30,
                    fontWeight: 700,
                    scale: String(1 + flash * 0.18),
                  }}
                >
                  {String(shown[f])}
                </span>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 16,
              color: accent,
              fontFamily: theme.fontSans,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            🔒 frontera del agregado — su estado se muta SOLO aquí, vía Aplicar
          </div>
        </div>
      </Slot>

      {/* cursor / pie narrativo (secundario, abajo) */}
      <div
        style={{
          position: "absolute",
          bottom: 96,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: theme.fontSans,
          fontSize: 34,
          color: finished ? accent : theme.textDim,
          fontWeight: 600,
        }}
      >
        {finished
          ? "✔ estado reconstruido: Premium · suspendida · reactivada 1 vez"
          : beat >= 0
            ? `▶ recorriendo la historia — hecho ${beat + 1}/${EVENTS.length}: ${EVENTS[beat].name}`
            : "▶ recorrer el diario y aplicar cada hecho…"}
      </div>
    </AbsoluteFill>
  );
};

const Slot: React.FC<{
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

const Arrow: React.FC<{ color: string; active: boolean }> = ({ color, active }) => (
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
