import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { EASE, clamp, CodePanel, Caption } from "./mechanics";

// Mecanismo de «Refactorizando el motor»: el HILO de 3 refactors encadenados.
// El código evoluciona paso a paso (izquierda) mientras la SALIDA no cambia (derecha):
// refactorizar cambia la forma, no el comportamiento. En el refactor 2 nace el Aggregate Root.

type Beat = { tag: string; code: string[]; glow: number[]; note: string; reuse: boolean; color: string };

export const INTRO = 12;
export const BEAT = 92;
export const HOLD = 76;
const N = 4;
export const ENGINE_SWITCH_DURATION = INTRO + N * BEAT + HOLD;

export const EngineSwitch: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();

  const BEATS: Beat[] = [
    {
      tag: "punto de partida — el if que crece",
      code: [
        "public Empresa(IEnumerable<object> historia)",
        "{",
        "    foreach (var hecho in historia)",
        "    {",
        "        if (hecho is EmpresaRegistrada r) { Nombre=r.Nombre; Plan=r.Plan; }",
        "        if (hecho is PlanCambiado p)      { Plan=p.NuevoPlan; }",
        "        if (hecho is EmpresaSuspendida)   { Suspendida=true; }",
        "        if (hecho is EmpresaReactivada)   { Suspendida=false; Reactivaciones++; }",
        "    }",
        "}",
      ],
      glow: [4, 5, 6, 7],
      note: "el constructor recorre Y aplica; cada hecho nuevo es otro if, y con una Factura copiarías todo el bucle.",
      reuse: false,
      color: theme.pain,
    },
    {
      tag: "refactor 1 · separar «recorrer» de «aplicar»",
      code: [
        "public Empresa(IEnumerable<object> historia)",
        "{",
        "    foreach (var hecho in historia)",
        "        Aplicar(hecho);              // recorrer",
        "}",
        "",
        "private void Aplicar(object hecho)   // aplicar (aparte)",
        "{",
        "    if (hecho is EmpresaRegistrada r) { Nombre=r.Nombre; Plan=r.Plan; }",
        "    if (hecho is PlanCambiado p)      { Plan=p.NuevoPlan; }",
        "    // …",
        "}",
      ],
      glow: [3, 6],
      note: "responsabilidad única: el foreach solo recorre; Aplicar tiene la lógica de cada hecho.",
      reuse: false,
      color: accent,
    },
    {
      tag: "refactor 2 · el motor sube a la base 🎉 nace el Aggregate Root",
      code: [
        "public abstract class AggregateRoot",
        "{",
        "    public void Load(IEnumerable<object> historia)   // el motor, UNA vez",
        "    {",
        "        foreach (var hecho in historia) Aplicar(hecho);",
        "    }",
        "    protected abstract void Aplicar(object hecho);",
        "}",
        "",
        "public class Empresa : AggregateRoot",
        "{",
        "    public Empresa(IEnumerable<object> h) => Load(h);",
        "    protected override void Aplicar(object hecho) { /* los ifs */ }",
        "}",
      ],
      glow: [0, 1, 2, 3, 4, 5, 6, 7],
      note: "el motor Load se escribe UNA vez en la base; Empresa —y mañana Factura— lo heredan y solo aportan su Aplicar.",
      reuse: true,
      color: accent,
    },
    {
      tag: "refactor 3 · del if encadenado al switch por tipo",
      code: [
        "protected override void Aplicar(object hecho)",
        "{",
        "    switch (hecho)",
        "    {",
        "        case EmpresaRegistrada r: Nombre=r.Nombre; Plan=r.Plan; break;",
        "        case PlanCambiado p:      Plan=p.NuevoPlan; break;",
        "        case EmpresaSuspendida:   Suspendida=true; break;",
        "        case EmpresaReactivada:   Suspendida=false; Reactivaciones++; break;",
        "    }",
        "}",
      ],
      glow: [2, 3, 4, 5, 6, 7, 8],
      note: "los if → un switch por tipo (pattern matching): un case por hecho, tipado y fácil de crecer.",
      reuse: true,
      color: accent,
    },
  ];

  const t = frame - INTRO;
  const beat = t < 0 ? 0 : Math.min(N - 1, Math.floor(t / BEAT));
  const b = t < 0 ? 0 : t - beat * BEAT;
  const s = BEATS[beat];
  const finished = t >= N * BEAT - 6;

  const tagIn = interpolate(b, [4, 18], [0, 1], { easing: EASE, ...clamp });
  const codeIn = interpolate(b, [8, 24], [0, 1], { easing: EASE, ...clamp });
  const glowAmt = interpolate(b, [22, 34, BEAT], [0, 1, 0.55], clamp);
  const reuseIn = s.reuse ? interpolate(b, [30, 48], [0, 1], { easing: EASE, ...clamp }) : 0;

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 150, paddingBottom: 150 }}>
      {/* qué refactor estamos haciendo */}
      <div
        style={{
          opacity: tagIn,
          background: theme.panel,
          border: `2px solid ${s.color}`,
          borderRadius: 12,
          padding: "12px 26px",
          fontFamily: theme.fontSans,
          fontSize: 28,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 24,
        }}
      >
        <span style={{ color: s.color }}>{beat + 1}/{N}</span> · {s.tag}
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "stretch", justifyContent: "center", opacity: codeIn }}>
        {/* el código que EVOLUCIONA */}
        <CodePanel
          lines={s.code}
          glow={(i) => (s.glow.includes(i) ? glowAmt : 0)}
          accent={s.color === theme.pain ? theme.pain : accent}
          width={1020}
          title="el motor (evoluciona paso a paso)"
        />

        {/* la salida que NO cambia */}
        <div style={{ width: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: accent, fontFamily: theme.fontSans, fontSize: 24, fontWeight: 700, textAlign: "center" }}>
            la salida — no cambia
          </div>
          <div style={{ background: theme.panel, border: `2px solid ${accent}`, borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 14 }}>
            <div style={{ fontFamily: theme.fontMono, fontSize: 23, color: theme.text, lineHeight: 1.5 }}>
              Constructora Andes:
              <br />
              plan <span style={{ color: accent }}>Premium</span>, suspendida,
              <br />
              reactivada <span style={{ color: accent }}>1</span> vez
            </div>
            <div style={{ fontFamily: theme.fontSans, fontSize: 20, color: theme.textDim }}>
              ✓ refactorizar cambia la forma, no el comportamiento
            </div>
            {/* reutilización: aparece al nacer el Aggregate Root */}
            <div style={{ opacity: reuseIn, marginTop: 6, background: `${accent}1A`, border: `1px solid ${accent}66`, borderRadius: 10, padding: "12px 14px", fontFamily: theme.fontSans, fontSize: 21, color: accent, fontWeight: 600 }}>
              ♻ Empresa · Factura · Pedido → heredan AggregateRoot
            </div>
          </div>
        </div>
      </div>

      <Caption color={finished ? accent : theme.textDim}>
        {finished ? "tres refactors, mismo resultado: un motor de replay reutilizable y tipado" : s.note}
      </Caption>
    </AbsoluteFill>
  );
};
