import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, Slot, Arrow, EventCard, AggregateBox, Caption } from "./mechanics";

// Mecanismo de «Refactorizando el motor»: el switch que enruta por TIPO.
// Cada hecho enciende su `case` y dispara la mutación que le toca en el agregado.
// El motor (Load) vive UNA vez en la base AggregateRoot; Empresa/Factura lo heredan.

const EVENTS = [
  { name: "EmpresaRegistrada", detail: '"Andes","Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
  { name: "EmpresaSuspendida", detail: '"falta de pago"' },
  { name: "EmpresaReactivada", detail: "" },
];
const CASES = [
  { match: "case EmpresaRegistrada", mut: "Nombre, Plan" },
  { match: "case PlanCambiado", mut: "Plan" },
  { match: "case EmpresaSuspendida", mut: "Suspendida" },
  { match: "case EmpresaReactivada", mut: "Suspendida, Reactivaciones" },
];
type Estado = { Nombre: string; Plan: string; Suspendida: string; Reactivaciones: number };
const INITIAL: Estado = { Nombre: "—", Plan: "—", Suspendida: "—", Reactivaciones: 0 };
const STATES: Estado[] = [
  { Nombre: "Andes", Plan: "Básico", Suspendida: "false", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "false", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "true", Reactivaciones: 0 },
  { Nombre: "Andes", Plan: "Premium", Suspendida: "false", Reactivaciones: 1 },
];
const CHANGED: (keyof Estado)[][] = [
  ["Nombre", "Plan"],
  ["Plan"],
  ["Suspendida"],
  ["Suspendida", "Reactivaciones"],
];
const FIELDS: (keyof Estado)[] = ["Nombre", "Plan", "Suspendida", "Reactivaciones"];

export const INTRO = 16;
export const BEAT = 52;
export const HOLD = 60;
export const ENGINE_SWITCH_DURATION = INTRO + EVENTS.length * BEAT + HOLD;

export const EngineSwitch: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const beat = t < 0 ? -1 : Math.min(EVENTS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const applied = beat >= 0 && b >= 30;
  const shownIdx = beat < 0 ? -1 : applied ? beat : beat - 1;
  const shown = shownIdx >= 0 ? STATES[shownIdx] : INITIAL;
  const finished = t >= EVENTS.length * BEAT - 6;

  const caseGlow = (i: number) =>
    i === beat ? interpolate(b, [4, 16, 44], [0, 1, 0.55], clamp) : 0;
  const fieldFlash = (f: keyof Estado) =>
    beat >= 0 && CHANGED[beat].includes(f)
      ? interpolate(b, [30, 37, 50], [0, 1, 0], clamp)
      : 0;

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 60,
      }}
    >
      {/* nota de reutilización (secundaria, arriba) */}
      <div
        style={{
          fontFamily: theme.fontSans,
          fontSize: 26,
          color: theme.textDim,
          marginBottom: 28,
        }}
      >
        el motor <span style={{ color: accent, fontWeight: 700 }}>Load()</span> vive una vez en la base{" "}
        <span style={{ color: accent, fontWeight: 700 }}>AggregateRoot</span> — Empresa, Factura… lo heredan
      </div>

      <div
        style={{
          flexDirection: "row",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
        }}
      >
        {/* STREAM */}
        <Slot title="El Stream" color={theme.textDim} width={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {EVENTS.map((e, i) => (
              <EventCard
                key={i}
                index={i + 1}
                name={e.name}
                detail={e.detail}
                accent={accent}
                state={i === beat ? "active" : i < beat || (i === beat && applied) ? "consumed" : "pending"}
                opacity={interpolate(frame, [i * 4, i * 4 + 12], [0, 1], clamp)}
              />
            ))}
          </div>
        </Slot>

        <Arrow color={accent} active={beat >= 0 && b < 30} />

        {/* SWITCH (Aplicar por tipo) */}
        <Slot title="switch (hecho) — enruta por tipo" color={accent} width={520}>
          <div
            style={{
              background: theme.codeBg,
              border: `2px solid ${accent}`,
              borderRadius: 16,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {CASES.map((c, i) => {
              const g = caseGlow(i);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: `${accent}${g > 0.02 ? "33" : "00"}`,
                    border: `1px solid ${g > 0.4 ? accent : "transparent"}`,
                    fontFamily: theme.fontMono,
                    fontSize: 23,
                  }}
                >
                  <span style={{ color: g > 0.3 ? accent : theme.text }}>{c.match}</span>
                  <span style={{ color: theme.textDim }}>→ {c.mut}</span>
                </div>
              );
            })}
          </div>
        </Slot>

        <Arrow color={accent} active={applied} />

        {/* AGGREGATE */}
        <AggregateBox
          accent={accent}
          title="Empresa — Aggregate Root"
          width={460}
          note="🔒 frontera: se muta solo aquí"
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
                  padding: "12px 12px",
                  borderRadius: 10,
                  background: `${accent}${flash > 0.01 ? "33" : "00"}`,
                  borderBottom: `1px solid ${theme.panelBorder}`,
                  fontFamily: theme.fontMono,
                }}
              >
                <span style={{ color: theme.textDim, fontSize: 26 }}>{f}</span>
                <span
                  style={{
                    color: flash > 0.05 ? accent : theme.text,
                    fontSize: 28,
                    fontWeight: 700,
                    scale: String(1 + flash * 0.16),
                  }}
                >
                  {String(shown[f])}
                </span>
              </div>
            );
          })}
        </AggregateBox>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "un case por tipo, tipado y seguro — el if que crecía feo, domado"
          : beat >= 0
            ? `▶ hecho ${beat + 1}/${EVENTS.length}: ${EVENTS[beat].name} → enciende su case`
            : "▶ cada hecho entra al switch…"}
      </Caption>
    </AbsoluteFill>
  );
};
