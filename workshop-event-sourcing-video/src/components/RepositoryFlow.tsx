import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, Arrow, Caption } from "./mechanics";

// Mecanismo de «El flujo de vida»: el Repositorio (EventStream<T>).
// Append(hecho) deja caer un hecho en la lista ESCONDIDA; Get() la recorre con
// Load y SALE una Empresa rehidratada. El consumidor nunca toca la lista cruda.

const APPENDS = [
  { name: "EmpresaRegistrada", detail: '"Andes","Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
];

export const INTRO = 12;
export const APPEND = 46;
const GET_GAP = 26;
const GET_DUR = 74;
export const HOLD = 50;
export const GET_START = INTRO + APPENDS.length * APPEND + GET_GAP;
export const REPOSITORY_DURATION = GET_START + GET_DUR + HOLD;

export const RepositoryFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const inAppendPhase = frame < GET_START;
  const getActive = frame >= GET_START;
  const getPulse = getActive
    ? interpolate(frame, [GET_START, GET_START + 16, GET_START + 52], [0, 1, 0.35], clamp)
    : 0;
  const emerge = interpolate(frame, [GET_START + 22, GET_START + 62], [0, 1], { easing: EASE, ...clamp });
  const finished = frame >= GET_START + GET_DUR - 6;

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 46,
        padding: "150px 130px 200px",
      }}
    >
      {/* CONSUMIDOR */}
      <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: theme.textDim }}>
          El consumidor
        </div>
        <Op label="Append(hecho)" accent={accent} active={inAppendPhase} />
        <Op label=".Get()" accent={accent} active={getActive} />
        <div style={{ color: theme.textDim, fontFamily: theme.fontSans, fontSize: 23, textAlign: "center", marginTop: 6 }}>
          solo dos puertas — nunca toca la lista
        </div>
      </div>

      <Arrow color={accent} active={inAppendPhase} />

      {/* EVENTSTREAM<T> — el repositorio con la lista escondida */}
      <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: accent }}>
          EventStream&lt;T&gt; — Repositorio
        </div>
        <div
          style={{
            position: "relative",
            background: theme.panel,
            border: `3px solid ${accent}`,
            borderRadius: 18,
            padding: "22px 24px",
            minHeight: 300,
            scale: String(1 + getPulse * 0.03),
            boxShadow: `0 0 ${20 + getPulse * 50}px ${accent}${getPulse > 0.1 ? "55" : "22"}`,
          }}
        >
          <div style={{ color: theme.textDim, fontFamily: theme.fontSans, fontSize: 22, marginBottom: 14 }}>
            🔒 lista escondida (private _historia)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {APPENDS.map((e, i) => {
              const landAt = INTRO + i * APPEND;
              const op = interpolate(frame, [landAt + 4, landAt + 26], [0, 1], { easing: EASE, ...clamp });
              const x = interpolate(frame, [landAt + 4, landAt + 26], [-260, 0], { easing: EASE, ...clamp });
              if (frame < landAt + 2) return <div key={i} style={{ height: 0 }} />;
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    translate: `${x}px 0px`,
                    background: theme.codeBg,
                    border: `1px solid ${accent}55`,
                    borderLeft: `5px solid ${accent}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontFamily: theme.fontMono,
                    fontSize: 24,
                    color: theme.text,
                  }}
                >
                  {e.name}
                  {e.detail ? <span style={{ color: theme.syntax.string }}> {e.detail}</span> : null}
                </div>
              );
            })}
          </div>
          {getActive ? (
            <div style={{ marginTop: 16, color: accent, fontFamily: theme.fontMono, fontSize: 22, opacity: getPulse > 0.05 ? 1 : 0.5 }}>
              Get() → Load() recorre la lista…
            </div>
          ) : null}
        </div>
      </div>

      <Arrow color={accent} active={emerge > 0.1} />

      {/* EMPRESA REHIDRATADA (sale por Get) */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 16, opacity: emerge }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: accent }}>
          Empresa rehidratada
        </div>
        <div
          style={{
            translate: `${(1 - emerge) * -40}px 0px`,
            background: theme.panel,
            border: `3px solid ${accent}`,
            borderRadius: 18,
            padding: "22px 26px",
            fontFamily: theme.fontMono,
          }}
        >
          <Row k="Nombre" v="Andes" dim={theme.textDim} />
          <Row k="Plan" v="Premium" dim={theme.textDim} />
          <Row k="Suspendida" v="false" dim={theme.textDim} />
        </div>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "Append para anotar, Get para rehidratar — la lista cruda nunca sale: eso es el Repositorio"
          : getActive
            ? "▶ .Get() — instancia y reproduce la historia escondida"
            : "▶ Append(hecho) — el hecho cae en la lista, sin que el consumidor la vea"}
      </Caption>
    </AbsoluteFill>
  );
};

const Op: React.FC<{ label: string; accent: string; active: boolean }> = ({ label, accent, active }) => (
  <div
    style={{
      background: active ? `${accent}22` : theme.panel,
      border: `2px solid ${active ? accent : theme.panelBorder}`,
      borderRadius: 12,
      padding: "16px 20px",
      textAlign: "center",
      fontFamily: theme.fontMono,
      fontSize: 28,
      color: active ? accent : theme.textDim,
      fontWeight: 700,
      scale: String(active ? 1.03 : 1),
    }}
  >
    {label}
  </div>
);

const Row: React.FC<{ k: string; v: string; dim: string }> = ({ k, v, dim }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: `1px solid ${theme.panelBorder}`,
    }}
  >
    <span style={{ color: dim, fontSize: 26 }}>{k}</span>
    <span style={{ color: theme.text, fontSize: 28, fontWeight: 700 }}>{v}</span>
  </div>
);
