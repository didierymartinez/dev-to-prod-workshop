import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { clamp, CodePanel, Caption } from "./mechanics";

// Mecanismo de «Los primeros hechos» — PASO 1 del hilo: el Replay (evolve) sobre
// VARIABLES SUELTAS. Cada hecho del stream enciende su `if` real y muta la variable.
// Así obtenemos el estado final… pero las variables quedan sueltas y expuestas.
// (El salto a la clase Empresa viene DESPUÉS, en la escena de descubrimiento.)

const EVENTS = [
  { name: "EmpresaRegistrada", detail: '"Andes","Básico"' },
  { name: "PlanCambiado", detail: '"Premium"' },
  { name: "EmpresaSuspendida", detail: '"falta de pago"' },
  { name: "EmpresaReactivada", detail: "" },
  { name: "EmpresaSuspendida", detail: '"incumplimiento"' },
];

const CODE = [
  "foreach (var hecho in historia)",
  "{",
  "    if (hecho is EmpresaRegistrada r) { nombre = r.Nombre; plan = r.Plan; }",
  "    if (hecho is PlanCambiado p)      { plan = p.NuevoPlan; }",
  "    if (hecho is EmpresaSuspendida)   { suspendida = true; }",
  "    if (hecho is EmpresaReactivada)   { suspendida = false; reactivaciones++; }",
  "}",
];
const EVENT_TO_LINE = [2, 3, 4, 5, 4];

type Estado = { nombre: string; plan: string; suspendida: string; reactivaciones: number };
const INITIAL: Estado = { nombre: "—", plan: "—", suspendida: "—", reactivaciones: 0 };
const STATES: Estado[] = [
  { nombre: "Andes", plan: "Básico", suspendida: "false", reactivaciones: 0 },
  { nombre: "Andes", plan: "Premium", suspendida: "false", reactivaciones: 0 },
  { nombre: "Andes", plan: "Premium", suspendida: "true", reactivaciones: 0 },
  { nombre: "Andes", plan: "Premium", suspendida: "false", reactivaciones: 1 },
  { nombre: "Andes", plan: "Premium", suspendida: "true", reactivaciones: 1 },
];
const CHANGED: (keyof Estado)[][] = [
  ["nombre", "plan"],
  ["plan"],
  ["suspendida"],
  ["suspendida", "reactivaciones"],
  ["suspendida"],
];
const FIELDS: (keyof Estado)[] = ["nombre", "plan", "suspendida", "reactivaciones"];

export const INTRO = 20;
export const BEAT = 58;
export const HOLD = 80;
export const REPLAY_DURATION = INTRO + EVENTS.length * BEAT + HOLD;

export const ReplayFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame - INTRO;
  const beat = t < 0 ? -1 : Math.min(EVENTS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const applied = beat >= 0 && b >= 32;
  const shownIdx = beat < 0 ? -1 : applied ? beat : beat - 1;
  const shown = shownIdx >= 0 ? STATES[shownIdx] : INITIAL;
  const finished = t >= EVENTS.length * BEAT - 6;

  const glow = (idx: number) => {
    if (beat < 0) return 0;
    if (idx === EVENT_TO_LINE[beat]) return interpolate(b, [14, 24, BEAT], [0, 1, 0.7], clamp);
    if (idx === 0) return interpolate(b, [2, 10, 24], [0, 0.7, 0.2], clamp); // foreach: recorre
    return 0;
  };
  const fieldFlash = (f: keyof Estado) =>
    beat >= 0 && CHANGED[beat].includes(f) ? interpolate(b, [30, 38, 52], [0, 1, 0], clamp) : 0;

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 150, paddingBottom: 150 }}>
      {/* STREAM (arriba) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {EVENTS.map((e, i) => {
          const active = i === beat;
          const consumed = i < beat || (i === beat && applied);
          return (
            <div
              key={i}
              style={{
                opacity: active ? 1 : consumed ? 0.34 : 0.62,
                scale: String(active ? 1.06 : 1),
                background: theme.panel,
                border: `1px solid ${active ? accent : theme.panelBorder}`,
                borderTop: `4px solid ${active ? accent : `${accent}55`}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontFamily: theme.fontMono,
                fontSize: 19,
                color: active ? theme.text : theme.textDim,
              }}
            >
              <span style={{ color: accent }}>#{i + 1}</span> {e.name}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 34, alignItems: "stretch", justifyContent: "center" }}>
        {/* CÓDIGO (centro): el foreach suelto, con la línea activa */}
        <CodePanel lines={CODE} glow={glow} accent={accent} width={1120} title="el foreach que reconstruye (evolve)" />

        {/* ESTADO en VARIABLES SUELTAS (derecha) */}
        <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 26, fontWeight: 700, textAlign: "center" }}>
            el estado — 4 variables sueltas
          </div>
          <div style={{ background: theme.panel, border: `2px dashed ${accent}88`, borderRadius: 16, padding: "18px 22px", flex: 1 }}>
            {FIELDS.map((f) => {
              const flash = fieldFlash(f);
              return (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 12px",
                    borderRadius: 9,
                    background: `${accent}${flash > 0.01 ? "33" : "00"}`,
                    borderBottom: `1px solid ${theme.panelBorder}`,
                    fontFamily: theme.fontMono,
                  }}
                >
                  <span style={{ color: theme.textDim, fontSize: 26 }}>{f}</span>
                  <span style={{ color: flash > 0.05 ? accent : theme.text, fontSize: 27, fontWeight: 700, scale: String(1 + flash * 0.16) }}>
                    {String(shown[f])}
                  </span>
                </div>
              );
            })}
            <div style={{ marginTop: 12, color: theme.textDim, fontFamily: theme.fontSans, fontSize: 20, fontWeight: 600 }}>
              ⚠️ sueltas y expuestas — cualquiera las pisa
            </div>
          </div>
        </div>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished
          ? "el estado salió de correr cada hecho por su línea (evolve)… pero las variables están sueltas →"
          : beat >= 0
            ? `▶ hecho ${beat + 1}/${EVENTS.length}: ${EVENTS[beat].name} → su if corre → muta la variable`
            : "▶ recorremos la historia aplicando cada hecho sobre variables sueltas…"}
      </Caption>
    </AbsoluteFill>
  );
};
