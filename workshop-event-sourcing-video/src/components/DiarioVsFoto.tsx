import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, EventCard, Caption } from "./mechanics";

// Mecanismo de «El diario de una empresa»: el contraste en movimiento.
// La FOTO se sobrescribe (UPDATE → el valor viejo se TACHA y se va: el pasado se destruye).
// El DIARIO anexa cada hecho (nada se borra; el estado de hoy se reconstruye).

const OPS = [
  "Registrada — plan Básico",
  "Cambió a plan Premium",
  "Suspendida — falta de pago",
];
const FOTO = [
  { Plan: "Básico", Estado: "activa" },
  { Plan: "Premium", Estado: "activa" },
  { Plan: "Premium", Estado: "Suspendida" },
];
// valor que el UPDATE DESTRUYE en cada beat (null = no había viejo)
const FOTO_OLD: { Plan: string | null; Estado: string | null }[] = [
  { Plan: null, Estado: null },
  { Plan: "Básico", Estado: null },
  { Plan: null, Estado: "activa" },
];
const DIARIO = [
  { name: "EmpresaRegistrada", detail: '"Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
  { name: "EmpresaSuspendida", detail: '"falta de pago"' },
];

export const INTRO = 12;
export const BEAT = 58;
export const HOLD = 70;
export const DIARIO_VS_FOTO_DURATION = INTRO + OPS.length * BEAT + HOLD;

export const DiarioVsFoto: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const beat = t < 0 ? -1 : Math.min(OPS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const applied = beat >= 0 && b >= 30;
  const shownIdx = beat < 0 ? -1 : applied ? beat : beat - 1;
  const foto = shownIdx >= 0 ? FOTO[shownIdx] : { Plan: "—", Estado: "—" };
  const finished = t >= OPS.length * BEAT - 6;

  const fotoRow = (field: "Plan" | "Estado") => {
    const old = beat >= 0 ? FOTO_OLD[beat][field] : null;
    const ghostActive = old !== null && b >= 6 && b <= 40;
    const ghostY = interpolate(b, [8, 38], [0, -54], { easing: EASE, ...clamp });
    const ghostOpacity = interpolate(b, [8, 18, 40], [0, 0.9, 0], clamp);
    const newPop = applied && beat >= 0 ? interpolate(b, [30, 38], [0, 1], clamp) : 1;
    const changedNow = beat >= 0 && b >= 28 && FOTO[beat][field] !== (shownIdx > 0 ? FOTO[shownIdx - 1][field] : null);
    return (
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          borderBottom: `1px solid ${theme.panelBorder}`,
          fontFamily: theme.fontMono,
          fontSize: 32,
        }}
      >
        <span style={{ color: theme.textDim }}>{field}</span>
        <span
          style={{
            color: changedNow ? theme.pain : theme.text,
            fontWeight: 700,
            scale: String(0.9 + newPop * 0.1),
          }}
        >
          {foto[field]}
        </span>
        {ghostActive ? (
          <span
            style={{
              position: "absolute",
              right: 0,
              opacity: ghostOpacity,
              translate: `0px ${ghostY}px`,
              color: theme.pain,
              textDecoration: "line-through",
              fontWeight: 700,
            }}
          >
            {old}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 120,
        padding: "150px 150px 200px",
      }}
    >
      {/* LA FOTO */}
      <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: theme.pain }}>
          📸 La foto — un UPDATE pisa el valor
        </div>
        <div
          style={{
            background: theme.panel,
            border: `2px solid ${theme.pain}55`,
            borderRadius: 18,
            padding: "20px 30px",
          }}
        >
          {fotoRow("Plan")}
          {fotoRow("Estado")}
        </div>
        <div style={{ textAlign: "center", color: theme.pain, fontFamily: theme.fontSans, fontSize: 28, fontWeight: 600, marginTop: 6, opacity: finished ? 1 : 0.5 }}>
          ❓ ¿cómo llegó aquí? — ni idea
        </div>
      </div>

      {/* EL DIARIO */}
      <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", fontFamily: theme.fontSans, fontSize: 28, fontWeight: 700, color: accent }}>
          📔 El diario — anexa, no borra
        </div>
        {DIARIO.map((e, i) => {
          const appearAt = INTRO + i * BEAT + 8;
          const op = interpolate(frame, [appearAt, appearAt + 14], [0, 1], { easing: EASE, ...clamp });
          const x = interpolate(frame, [appearAt, appearAt + 16], [40, 0], { easing: EASE, ...clamp });
          if (frame < appearAt) return <div key={i} style={{ height: 0 }} />;
          return (
            <div key={i} style={{ opacity: op, translate: `${x}px 0px` }}>
              <EventCard index={i + 1} name={e.name} detail={e.detail} accent={accent} state="pending" opacity={1} />
            </div>
          );
        })}
        {finished ? (
          <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 26, fontWeight: 600, marginTop: 8 }}>
            ✔ pasado intacto · el estado de hoy se reconstruye
          </div>
        ) : null}
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "la foto perdió el pasado; el diario lo conserva entero — eso es Event Sourcing"
          : beat >= 0
            ? `▶ ocurre: ${OPS[beat]}`
            : "▶ a cada cosa que pasa…"}
      </Caption>
    </AbsoluteFill>
  );
};
