import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel, Caption } from "./mechanics";

// Mecanismo de «Decidir el futuro»: el CICLO cargar → actuar → guardar, y la lección sutil
// que el alumno descubre corriendo el código: `decide` NO muta la instancia en memoria.
// Suspender() dos veces sobre el MISMO objeto emite las dos (Suspendida sigue false).
// El no-op (idempotencia) solo aparece tras Append → Get (replay) sobre la entidad RECARGADA.
// "El cambio vive en el diario, no en el objeto."

const EMIT = "#6BCB77";
const REJECT = "#FF5C5C";

const CODE = [
  "public EmpresaSuspendida? Suspender(string motivo)",
  "{",
  "    if (Suspendida) return null;            // idempotencia",
  "    return new EmpresaSuspendida(motivo);   // emite",
  "}",
];

type Beat = {
  tag: string;
  call: string;
  susp: boolean;
  line: number; // línea del método que decide (-1 = no aplica: es Get/Append)
  badge: "reload" | "stale" | "read" | "save" | "none";
  diary: { name: string; dup?: boolean }[];
  note: string;
  color: string;
};

export const INTRO = 12;
export const BEAT = 80;
export const HOLD = 70;

export const DECIDE_DURATION = INTRO + 6 * BEAT + HOLD;

export const DecideFlow: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();

  const BEATS: Beat[] = [
    {
      tag: "1 · CARGAR",
      call: "var empresa = stream.Get();",
      susp: false,
      line: -1,
      badge: "reload",
      diary: [{ name: "EmpresaRegistrada" }],
      note: "Get() rehidrata: el replay reconstruye → Suspendida = false",
      color: accent,
    },
    {
      tag: "2 · ACTUAR (decide)",
      call: 'empresa.Suspender("falta de pago")',
      susp: false,
      line: 3,
      badge: "read",
      diary: [{ name: "EmpresaRegistrada" }],
      note: "Suspendida=false → cae al return: EMITE el hecho. Ojo: la empresa en memoria NO muta.",
      color: EMIT,
    },
    {
      tag: "3 · GUARDAR",
      call: "stream.Append(hecho);",
      susp: false,
      line: -1,
      badge: "save",
      diary: [{ name: "EmpresaRegistrada" }, { name: "EmpresaSuspendida" }],
      note: "el hecho va al diario. Pero la empresa en memoria SIGUE Suspendida=false.",
      color: accent,
    },
    {
      tag: "⚠ LA TRAMPA — misma instancia, sin recargar",
      call: "empresa.Suspender(...)   // otra vez",
      susp: false,
      line: 3,
      badge: "stale",
      diary: [{ name: "EmpresaRegistrada" }, { name: "EmpresaSuspendida" }, { name: "EmpresaSuspendida", dup: true }],
      note: "el objeto está OBSOLETO → Suspendida sigue false → EMITE OTRA VEZ. El diario se suspende dos veces.",
      color: REJECT,
    },
    {
      tag: "5 · LA CURA — recargar primero",
      call: "empresa = stream.Get();",
      susp: true,
      line: -1,
      badge: "reload",
      diary: [{ name: "EmpresaRegistrada" }, { name: "EmpresaSuspendida" }],
      note: "Get() → el replay aplica el hecho guardado → AHORA Suspendida = true",
      color: accent,
    },
    {
      tag: "6 · NO-OP (idempotencia)",
      call: "empresa.Suspender(...)",
      susp: true,
      line: 2,
      badge: "read",
      diary: [{ name: "EmpresaRegistrada" }, { name: "EmpresaSuspendida" }],
      note: "if (Suspendida) return null → NO emite ✓. Funciona porque recargaste: el estado vino del diario.",
      color: theme.textDim,
    },
  ];

  const t = frame - INTRO;
  const beat = t < 0 ? 0 : Math.min(BEATS.length - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const s = BEATS[beat];
  const finished = t >= BEATS.length * BEAT - 6;

  const callIn = interpolate(b, [4, 18], [0, 1], { easing: EASE, ...clamp });
  const lineGlow = (idx: number) =>
    idx === s.line ? interpolate(b, [22, 32, BEAT], [0, 1, 0.7], clamp) : 0;
  const suspFlash = s.badge === "reload" ? interpolate(b, [24, 34, 56], [0, 1, 0], clamp) : 0;

  const suspColor = s.susp ? accent : theme.textDim;
  const badgeText =
    s.badge === "reload"
      ? "⟳ recargada por Get() — estado del diario"
      : s.badge === "stale"
        ? "⚠ obsoleta — no recargada desde el diario"
        : s.badge === "save"
          ? "sin cambios (decide no mutó)"
          : s.badge === "read"
            ? "decide LEE este estado (no lo cambia)"
            : "";
  const badgeColor = s.badge === "stale" ? REJECT : s.badge === "reload" ? accent : theme.textDim;

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 150, paddingBottom: 150 }}>
      {/* lo que se ejecuta ahora */}
      <div
        style={{
          opacity: callIn,
          background: theme.panel,
          border: `2px solid ${s.color}`,
          borderRadius: 12,
          padding: "12px 24px",
          fontFamily: theme.fontMono,
          fontSize: 26,
          color: theme.text,
          marginBottom: 24,
        }}
      >
        <span style={{ color: theme.textDim, fontWeight: 700 }}>{s.tag}: </span>
        {s.call}
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "stretch", justifyContent: "center" }}>
        {/* método Suspender, con la línea que decide encendida */}
        <CodePanel lines={CODE} glow={lineGlow} accent={accent} width={760} title="Suspender() — decide mirando su estado" maxFont={23} />

        {/* empresa en memoria: la protagonista (su Suspendida) */}
        <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 24, fontWeight: 700, textAlign: "center" }}>
            empresa (en memoria)
          </div>
          <div
            style={{
              flex: 1,
              border: `3px solid ${s.badge === "stale" ? REJECT : accent}`,
              borderRadius: 16,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10,
              background: suspFlash > 0.02 ? `${accent}22` : theme.panel,
            }}
          >
            <div style={{ fontFamily: theme.fontMono, fontSize: 24, color: theme.textDim }}>Suspendida</div>
            <div style={{ fontFamily: theme.fontMono, fontSize: 56, fontWeight: 800, color: suspColor, scale: String(1 + suspFlash * 0.12) }}>
              {String(s.susp)}
            </div>
            {badgeText ? (
              <div style={{ marginTop: 8, fontFamily: theme.fontSans, fontSize: 19, fontWeight: 600, color: badgeColor }}>
                {badgeText}
              </div>
            ) : null}
          </div>
        </div>

        {/* el diario (EventStream) */}
        <div style={{ width: 440, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 24, fontWeight: 700, textAlign: "center" }}>
            el diario (stream)
          </div>
          <div style={{ flex: 1, background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {s.diary.map((e, i) => {
              const isLast = i === s.diary.length - 1;
              const op = isLast ? interpolate(b, [26, 44], [0, 1], clamp) : 1;
              const col = e.dup ? REJECT : accent;
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    background: theme.codeBg,
                    border: `1px solid ${col}55`,
                    borderLeft: `5px solid ${col}`,
                    borderRadius: 9,
                    padding: "10px 14px",
                    fontFamily: theme.fontMono,
                    fontSize: 21,
                    color: e.dup ? REJECT : theme.text,
                  }}
                >
                  #{i + 1} {e.name}
                  {e.dup ? "  ⚠ duplicado" : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Caption color={finished ? accent : s.color}>
        {finished
          ? "el cambio vive en el diario, no en el objeto · cada comando: cargar → actuar → guardar (recargar entre comandos)"
          : s.note}
      </Caption>

      <div style={{ marginTop: 10, color: theme.textDim, fontFamily: theme.fontSans, fontSize: 20, textAlign: "center" }}>
        su gemela es la <b style={{ color: accent }}>validación</b>: CambiarPlan <i>lanza</i> si está suspendida — una grita, la otra calla
      </div>
    </AbsoluteFill>
  );
};
