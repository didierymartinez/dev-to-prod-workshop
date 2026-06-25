import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, Caption } from "./mechanics";

// Mecanismo de «El diario de una empresa», siguiendo su hilo de descubrimientos:
// (1) la foto se sobrescribe con cada UPDATE (tacha el pasado) vs el diario que anexa;
// (2) AMNESIA: el jefe hace 3 preguntas y la foto responde "ni idea", el diario responde;
// (3) se le pone NOMBRE: Event Sourcing, y cada renglón es un evento.

const OPS = [
  { label: "Registrada — plan Básico", set: { Plan: "Básico", Estado: "activa" } as Partial<Foto>, oldField: null, card: { name: "EmpresaRegistrada", detail: '"Básico"' } },
  { label: "Cambió a plan Premium", set: { Plan: "Premium" } as Partial<Foto>, oldField: "Plan" as const, card: { name: "PlanCambiado", detail: '"Premium"' } },
  { label: "Suspendida — falta de pago", set: { Estado: "Suspendida" } as Partial<Foto>, oldField: "Estado" as const, card: { name: "EmpresaSuspendida", detail: '"falta de pago"' } },
];
type Foto = { Plan: string; Estado: string };
const fotoAt = (i: number): Foto => {
  let f: Foto = { Plan: "—", Estado: "—" };
  for (let k = 0; k <= i; k++) f = { ...f, ...OPS[k].set };
  return f;
};
const OLD_VALUE: Record<string, string> = { Plan: "Básico", Estado: "activa" };

const QA = [
  { q: "¿Desde cuándo es Premium?", diario: "desde el hecho #2" },
  { q: "¿Por qué está suspendida?", diario: "por falta de pago (#3)" },
  { q: "¿Cuántas veces la reactivaron?", diario: "el diario lo cuenta" },
];

const INTRO = 14;
const OP = 52;
const QA_STEP = 46;
const opsEnd = INTRO + OPS.length * OP;
const amnesiaStart = opsEnd + 12;
const amnesiaEnd = amnesiaStart + QA.length * QA_STEP;
const namingStart = amnesiaEnd + 10;
export const DIARIO_VS_FOTO_DURATION = namingStart + 110;

export const DiarioVsFoto: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const inOps = frame < amnesiaStart;
  const inAmnesia = frame >= amnesiaStart && frame < namingStart;
  const inNaming = frame >= namingStart;

  // estado de la foto durante las ops
  const opIdx = Math.min(OPS.length - 1, Math.max(0, Math.floor((frame - INTRO) / OP)));
  const opB = frame - INTRO - opIdx * OP;
  const fotoApplied = !inOps || opB >= 26;
  const foto = inOps ? fotoAt(fotoApplied ? opIdx : opIdx - 1) : fotoAt(OPS.length - 1);

  const reveal = interpolate(frame, [namingStart + 6, namingStart + 50], [0, 1], { easing: EASE, ...clamp });

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 150, paddingBottom: 160 }}>
      {/* ── arriba: la foto vs el diario ── */}
      <div style={{ display: "flex", gap: 90, alignItems: "flex-start", justifyContent: "center" }}>
        {/* LA FOTO */}
        <div style={{ width: 480, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, color: theme.pain }}>
            📸 La foto — un UPDATE pisa el valor
          </div>
          <div style={{ background: theme.panel, border: `2px solid ${theme.pain}55`, borderRadius: 16, padding: "16px 28px" }}>
            {(["Plan", "Estado"] as (keyof Foto)[]).map((f) => {
              const isChanging = inOps && OPS[opIdx].oldField === f;
              const ghostY = interpolate(opB, [6, 36], [0, -50], { easing: EASE, ...clamp });
              const ghostOp = interpolate(opB, [6, 16, 38], [0, 0.9, 0], clamp);
              return (
                <div key={f} style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${theme.panelBorder}`, fontFamily: theme.fontMono, fontSize: 30 }}>
                  <span style={{ color: theme.textDim }}>{f}</span>
                  <span style={{ color: theme.text, fontWeight: 700 }}>{foto[f]}</span>
                  {isChanging ? (
                    <span style={{ position: "absolute", right: 0, opacity: ghostOp, translate: `0px ${ghostY}px`, color: theme.pain, textDecoration: "line-through", fontWeight: 700 }}>
                      {OLD_VALUE[f]}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {!inOps ? (
            <div style={{ textAlign: "center", color: theme.pain, fontFamily: theme.fontSans, fontSize: 24, fontWeight: 600 }}>
              el pasado se borró con cada UPDATE
            </div>
          ) : null}
        </div>

        {/* EL DIARIO */}
        <div style={{ width: 540, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, color: accent }}>
            📔 El diario — anexa, no borra
          </div>
          {OPS.map((op, i) => {
            const at = INTRO + i * OP + 8;
            const o = interpolate(frame, [at, at + 14], [0, 1], { easing: EASE, ...clamp });
            const x = interpolate(frame, [at, at + 16], [40, 0], { easing: EASE, ...clamp });
            if (frame < at) return <div key={i} style={{ height: 0 }} />;
            return (
              <div key={i} style={{ opacity: o, translate: `${x}px 0px`, display: "flex", gap: 14, alignItems: "baseline", background: theme.panel, border: `1px solid ${accent}44`, borderLeft: `5px solid ${accent}`, borderRadius: 10, padding: "12px 18px", fontFamily: theme.fontMono, fontSize: 24 }}>
                <span style={{ color: accent }}>#{i + 1}</span>
                <span style={{ color: theme.text }}>{op.card.name}<span style={{ color: theme.syntax.string }}> {op.card.detail}</span></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── abajo: amnesia (3 preguntas) o el nombre ── */}
      <div style={{ marginTop: 40, width: 1160, minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
        {inAmnesia
          ? QA.map((qa, i) => {
              const at = amnesiaStart + i * QA_STEP;
              const o = interpolate(frame, [at, at + 16], [0, 1], { easing: EASE, ...clamp });
              if (frame < at) return null;
              return (
                <div key={i} style={{ opacity: o, display: "flex", alignItems: "center", gap: 20, width: "100%", padding: "10px 0" }}>
                  <span style={{ flex: 1, textAlign: "right", fontFamily: theme.fontSans, fontSize: 28, color: theme.text }}>{qa.q}</span>
                  <span style={{ width: 200, textAlign: "center", fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, color: theme.pain }}>📸 ni idea ✗</span>
                  <span style={{ flex: 1, fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, color: accent }}>📔 {qa.diario} ✓</span>
                </div>
              );
            })
          : null}

        {inNaming ? (
          <div style={{ opacity: reveal, translate: `0px ${(1 - reveal) * 18}px`, textAlign: "center", marginTop: 10 }}>
            <div style={{ fontFamily: theme.fontSans, fontSize: 50, fontWeight: 800, color: accent }}>🎉 esto es Event Sourcing</div>
            <div style={{ fontFamily: theme.fontSans, fontSize: 30, color: theme.textDim, marginTop: 10, maxWidth: 1100 }}>
              la fuente de la verdad es el diario (la secuencia de hechos); cada renglón es un <b style={{ color: theme.text }}>evento</b>. La foto se reconstruye; el diario, una vez lo tiras, no vuelve.
            </div>
          </div>
        ) : null}
      </div>

      <Caption color={inNaming ? accent : theme.textDim}>
        {inNaming
          ? "guardar el diario, no la foto: conservas el pasado y reconstruyes el presente"
          : inAmnesia
            ? "la foto tiene AMNESIA: guardó el presente y perdió el pasado — el diario responde todo"
            : `▶ ocurre: ${OPS[opIdx].label}`}
      </Caption>
    </AbsoluteFill>
  );
};
