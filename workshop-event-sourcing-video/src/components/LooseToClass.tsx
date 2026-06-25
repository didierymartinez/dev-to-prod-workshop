import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel } from "./mechanics";

// El DESCUBRIMIENTO de «Los primeros hechos», DESPUÉS del replay suelto:
// el estado ya funciona en variables sueltas, pero están expuestas → las AGRUPAMOS
// en la clase Empresa y MOVEMOS el foreach al constructor: se reconstruye a sí misma
// (un Aggregate Root). Se ve la transición antes → después, con el foreach migrando.

const BEFORE = [
  'string nombre = "";   string plan = "";',
  "bool suspendida;      int reactivaciones;",
  "",
  "foreach (var hecho in historia) { /* los if */ }",
];
const AFTER = [
  "public class Empresa : AggregateRoot",
  "{",
  "    public string Nombre { get; private set; }",
  "    public string Plan   { get; private set; }",
  "    public bool   Suspendida { get; private set; }",
  "    public int    Reactivaciones { get; private set; }",
  "",
  "    public Empresa(IEnumerable<object> historia)",
  "    {",
  "        foreach (var hecho in historia) { /* los if */ }",
  "    }",
  "}",
];
const FOREACH_LINE = 9;

export const LOOSE_TO_CLASS_DURATION = 240;

export const LooseToClass: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const beforeIn = interpolate(frame, [8, 24], [0, 1], { easing: EASE, ...clamp });
  const beforeOut = interpolate(frame, [56, 82], [1, 0], { easing: EASE, ...clamp });
  const afterIn = interpolate(frame, [60, 90], [0, 1], { easing: EASE, ...clamp });
  const foreachPulse = interpolate(frame, [96, 108, 170], [0, 1, 0.55], clamp);
  const reveal = interpolate(frame, [116, 146], [0, 1], { easing: EASE, ...clamp });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "150px 120px 200px", flexDirection: "column" }}>
      {/* área del código: antes y después se cruzan en el mismo lugar */}
      <div style={{ position: "relative", width: 1080, height: 470, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", opacity: beforeIn * beforeOut, width: 1000 }}>
          <CodePanel lines={BEFORE} glow={() => 0} accent={theme.textDim} width={1000} title="antes — variables sueltas + foreach suelto" maxFont={28} />
        </div>
        <div style={{ position: "absolute", opacity: afterIn, width: 1000, scale: String(0.97 + afterIn * 0.03), boxShadow: `0 0 ${reveal * 64}px ${accent}${reveal > 0.05 ? "55" : "00"}`, borderRadius: 16 }}>
          <CodePanel
            lines={AFTER}
            glow={(i) => (i === FOREACH_LINE ? foreachPulse : 0)}
            accent={accent}
            width={1000}
            title="después — la clase Empresa (el foreach vive en el constructor)"
            maxFont={26}
          />
        </div>
      </div>

      {/* la revelación */}
      <div style={{ opacity: reveal, translate: `0px ${(1 - reveal) * 18}px`, marginTop: 18, textAlign: "center" }}>
        <div style={{ fontFamily: theme.fontSans, fontSize: 44, fontWeight: 800, color: accent }}>
          🎉 Empresa se reconstruye a sí misma — un Aggregate Root
        </div>
        <div style={{ fontFamily: theme.fontSans, fontSize: 30, color: theme.textDim, marginTop: 8 }}>
          agrupamos las variables y movimos el foreach al constructor — nadie le toca el estado desde fuera
        </div>
      </div>
    </AbsoluteFill>
  );
};
