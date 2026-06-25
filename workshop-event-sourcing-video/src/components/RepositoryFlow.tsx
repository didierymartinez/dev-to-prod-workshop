import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel, Caption } from "./mechanics";

// Mecanismo de «El flujo de vida»: el Repositorio (EventStream<T>) con código sincronizado.
// Append(hecho) (línea encendida) mete el hecho en la lista escondida; Get()→Load() (líneas
// encendidas) la recorre y SALE una Empresa rehidratada. El consumidor nunca toca la lista.

const CODE = [
  "public void Append(object hecho)",
  "    => _historia.Add(hecho);",
  "",
  "public T Get()",
  "{",
  "    var entidad = new T();",
  "    entidad.Load(_historia);",
  "    return entidad;",
  "}",
];
const APPENDS = [
  { name: "EmpresaRegistrada", detail: '"Andes","Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
];

export const INTRO = 14;
export const APPEND = 48;
const GET_GAP = 28;
const GET_DUR = 84;
export const HOLD = 56;
export const GET_START = INTRO + APPENDS.length * APPEND + GET_GAP;
export const REPOSITORY_DURATION = GET_START + GET_DUR + HOLD;

export const RepositoryFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const appendActive = frame < GET_START;
  const getActive = frame >= GET_START;
  const emerge = interpolate(frame, [GET_START + 24, GET_START + 66], [0, 1], { easing: EASE, ...clamp });
  const finished = frame >= GET_START + GET_DUR - 6;

  const glow = (idx: number) => {
    if (idx === 0 || idx === 1) {
      return appendActive
        ? interpolate(frame, [INTRO, INTRO + 10], [0, 0.7], clamp)
        : interpolate(frame, [GET_START, GET_START + 16], [0.7, 0], clamp);
    }
    if (idx >= 3 && idx <= 8) {
      const base = getActive ? interpolate(frame, [GET_START, GET_START + 18, GET_START + GET_DUR], [0, 0.6, 0.4], clamp) : 0;
      return idx === 6 ? Math.min(1, base * 1.5) : base; // Load() más fuerte
    }
    return 0;
  };

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 44, paddingTop: 150, paddingBottom: 160, paddingLeft: 90, paddingRight: 90 }}>
      {/* CÓDIGO: la clase EventStream<T>, con la línea activa */}
      <CodePanel lines={CODE} glow={glow} accent={accent} width={760} title="EventStream<T> — el Repositorio" />

      {/* VISUAL: la lista escondida + la Empresa que sale por Get */}
      <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 24, color: theme.textDim }}>
          {appendActive ? "Append → cae en la lista escondida" : "Get() → Load() recorre y rehidrata"}
        </div>
        <div
          style={{
            background: theme.panel,
            border: `3px solid ${accent}`,
            borderRadius: 16,
            padding: "18px 22px",
          }}
        >
          <div style={{ color: theme.textDim, fontFamily: theme.fontSans, fontSize: 20, marginBottom: 12 }}>
            🔒 private _historia (escondida)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {APPENDS.map((e, i) => {
              const landAt = INTRO + i * APPEND;
              const op = interpolate(frame, [landAt + 4, landAt + 26], [0, 1], { easing: EASE, ...clamp });
              const x = interpolate(frame, [landAt + 4, landAt + 26], [-200, 0], { easing: EASE, ...clamp });
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
                    padding: "11px 15px",
                    fontFamily: theme.fontMono,
                    fontSize: 22,
                    color: theme.text,
                  }}
                >
                  {e.name}
                  {e.detail ? <span style={{ color: theme.syntax.string }}> {e.detail}</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Empresa rehidratada que sale */}
        <div style={{ opacity: emerge, translate: `${(1 - emerge) * 30}px 0px`, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 40, color: accent }}>↓</span>
          <div style={{ background: theme.panel, border: `2px solid ${accent}`, borderRadius: 14, padding: "14px 20px", fontFamily: theme.fontMono, fontSize: 24, color: theme.text }}>
            new Empresa → <span style={{ color: accent }}>Plan: Premium</span>
          </div>
        </div>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "Append para anotar, Get para rehidratar — la lista cruda nunca sale: eso es el Repositorio"
          : getActive
            ? "▶ .Get() → new T() + Load() reproduce la historia escondida"
            : "▶ Append(hecho) → _historia.Add(hecho), sin que el consumidor la vea"}
      </Caption>
    </AbsoluteFill>
  );
};
