import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, Arrow, Caption } from "./mechanics";

// Mecanismo de «Decidir el futuro»: el agregado DECIDE mirando su estado.
// Tres caminos animados: emite el hecho (✔), lo rechaza (validación), o no-op (idempotencia).
// Clave: decide ≠ apply — decide PRODUCE el hecho; evolve lo aplica después.

const EMIT = "#6BCB77";
const REJECT = "#FF5C5C";

type Outcome = { kind: "emit" | "reject" | "noop"; label: string; tag: string; color: string };
const BEATS: {
  intent: string;
  state: { Plan: string; Suspendida: string };
  outcome: Outcome;
}[] = [
  {
    intent: 'CambiarPlan("Enterprise")',
    state: { Plan: "Premium", Suspendida: "false" },
    outcome: { kind: "emit", label: 'PlanCambiado("Enterprise")', tag: "✔ emite el hecho", color: EMIT },
  },
  {
    intent: 'CambiarPlan("Enterprise")',
    state: { Plan: "Premium", Suspendida: "true" },
    outcome: { kind: "reject", label: "throw ReglaDeNegocioException", tag: "✖ rechazado — validación", color: REJECT },
  },
  {
    intent: 'Suspender("otro motivo")',
    state: { Plan: "Premium", Suspendida: "true" },
    outcome: { kind: "noop", label: "return null", tag: "∅ no-op — idempotencia", color: theme.textDim },
  },
];

export const INTRO = 10;
export const BEAT = 80;
export const HOLD = 56;
export const DECIDE_DURATION = INTRO + BEATS.length * BEAT + HOLD;

export const DecideFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const beat = t < 0 ? 0 : Math.min(BEATS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const scenario = BEATS[beat];
  const finished = t >= BEATS.length * BEAT - 6;

  const intentOpacity = interpolate(b, [4, 22], [0, 1], { easing: EASE, ...clamp });
  const intentX = interpolate(b, [4, 22], [-40, 0], { easing: EASE, ...clamp });
  const evalPulse = interpolate(b, [26, 36, 50], [0, 1, 0.3], clamp);
  const decisiveFlash = interpolate(b, [26, 34, 52], [0, 1, 0.2], clamp);
  const outcomeOpacity = interpolate(b, [42, 60], [0, 1], { easing: EASE, ...clamp });
  const outcomeX = interpolate(b, [42, 60], [-30, 0], { easing: EASE, ...clamp });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "150px 120px 200px",
      }}
    >
      {/* INTENCIÓN (comando) */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: theme.textDim }}>
          La intención (comando)
        </div>
        <div
          style={{
            opacity: intentOpacity,
            translate: `${intentX}px 0px`,
            background: theme.panel,
            border: `2px solid ${accent}`,
            borderRadius: 14,
            padding: "22px 24px",
            textAlign: "center",
            fontFamily: theme.fontMono,
            fontSize: 30,
            color: theme.text,
          }}
        >
          {scenario.intent}
        </div>
      </div>

      <Arrow color={accent} active={b >= 20 && b < 44} />

      {/* EMPRESA DECIDE */}
      <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: accent }}>
          Empresa decide — mira su estado
        </div>
        <div
          style={{
            background: theme.panel,
            border: `3px solid ${accent}`,
            borderRadius: 18,
            padding: "22px 26px",
            scale: String(1 + evalPulse * 0.03),
            boxShadow: `0 0 ${18 + evalPulse * 40}px ${accent}${evalPulse > 0.1 ? "55" : "22"}`,
            fontFamily: theme.fontMono,
          }}
        >
          <StateRow k="Plan" v={scenario.state.Plan} flash={0} />
          <StateRow k="Suspendida" v={scenario.state.Suspendida} flash={decisiveFlash} accent={accent} />
        </div>
        <div style={{ textAlign: "center", color: theme.textDim, fontFamily: theme.fontSans, fontSize: 23, marginTop: 4 }}>
          decide: <b style={{ color: accent }}>produce</b> el hecho · no muta el estado
        </div>
      </div>

      <Arrow color={scenario.outcome.color} active={b >= 40} />

      {/* RESULTADO */}
      <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: theme.textDim }}>
          El resultado
        </div>
        <div
          style={{
            opacity: outcomeOpacity,
            translate: `${outcomeX}px 0px`,
            background: `${scenario.outcome.color}1A`,
            border: `2px solid ${scenario.outcome.color}`,
            borderRadius: 14,
            padding: "22px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: theme.fontMono, fontSize: 26, color: theme.text, marginBottom: 12 }}>
            {scenario.outcome.label}
          </div>
          <div style={{ fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: scenario.outcome.color }}>
            {scenario.outcome.tag}
          </div>
        </div>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "decidir ≠ aplicar: decide produce (o no) el hecho; evolve lo aplica después"
          : scenario.outcome.kind === "emit"
            ? "▶ activa → CambiarPlan emite el hecho"
            : scenario.outcome.kind === "reject"
              ? "▶ suspendida → CambiarPlan es inválido: se rechaza (grita)"
              : "▶ ya suspendida → Suspender es redundante: no-op (calla)"}
      </Caption>
    </AbsoluteFill>
  );
};

const StateRow: React.FC<{ k: string; v: string; flash: number; accent?: string }> = ({
  k,
  v,
  flash,
  accent,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 12px",
      borderRadius: 10,
      background: accent ? `${accent}${flash > 0.02 ? "33" : "00"}` : "transparent",
      borderBottom: `1px solid ${theme.panelBorder}`,
    }}
  >
    <span style={{ color: theme.textDim, fontSize: 28 }}>{k}</span>
    <span
      style={{
        color: accent && flash > 0.05 ? accent : theme.text,
        fontSize: 30,
        fontWeight: 700,
        scale: String(1 + flash * 0.16),
      }}
    >
      {v}
    </span>
  </div>
);
