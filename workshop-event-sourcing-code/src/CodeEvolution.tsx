import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { theme } from "./theme";
import { tokenize } from "./highlight";
import { steps } from "./steps";

// ---- diff por líneas (LCS) ----
type DiffOp = { type: "keep" | "del" | "add"; text: string };
function diffLines(a: string[], b: string[]): DiffOp[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const res: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { res.push({ type: "keep", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { res.push({ type: "del", text: a[i] }); i++; }
    else { res.push({ type: "add", text: b[j] }); j++; }
  }
  while (i < m) res.push({ type: "del", text: a[i++] });
  while (j < n) res.push({ type: "add", text: b[j++] });
  return res;
}

const TRANSITIONS = steps.slice(1).map((s, i) => diffLines(steps[i].code, s.code));

// ---- tiempos ----
const HOLD0 = 80;
const TRANS = 46;
const HOLD = 96;
const LH = 1.62;
export const EVO_DURATION = HOLD0 + (steps.length - 1) * (TRANS + HOLD) + 40;

// ---- tamaño de fuente POR PASO: cada paso tan grande como quepa (a lo ancho la línea más
// larga, a lo alto el diff más alto de su ciclo). Así los pasos cortos se ven grandes y los
// largos encogen lo justo, en vez de un único tamaño global diminuto. ----
const BLOCK_W = 1300; // ventana de código (izquierda)
const COL_W = 470; // columna de conceptos (derecha)
const CODE_H = 760;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function fontForStep(i: number): number {
  const lines = i === 0 ? steps[0].code : [...steps[i].code, ...TRANSITIONS[i - 1].map((d) => d.text)];
  const count = i === 0 ? steps[0].code.length : Math.max(steps[i].code.length, TRANSITIONS[i - 1].length);
  const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), "");
  // resta padding (64) + columna del gutter +/- + margen → ancho real del código
  const byW = fitText({ text: longest, withinWidth: BLOCK_W - 130, fontFamily: theme.fontMonoFamily, fontWeight: "normal" }).fontSize;
  const byH = CODE_H / (count * LH);
  return Math.max(20, Math.min(40, Math.floor(Math.min(byW, byH))));
}

type Row = { text: string; kind: "keep" | "del" | "add"; f: number; op: number };

export const CodeEvolution: React.FC = () => {
  const frame = useCurrentFrame();

  // ¿en qué paso estamos y qué filas renderizar?
  let stepIndex: number;
  let stepLocalFrame: number; // frames transcurridos dentro del paso actual
  let rows: Row[];
  if (frame < HOLD0) {
    stepIndex = 0;
    stepLocalFrame = frame;
    rows = steps[0].code.map((text) => ({ text, kind: "keep", f: 1, op: 1 }));
  } else {
    const t = frame - HOLD0;
    const cyc = TRANS + HOLD;
    const k = Math.min(steps.length - 1, Math.floor(t / cyc) + 1);
    const local = t - (k - 1) * cyc;
    stepIndex = k;
    stepLocalFrame = local;
    if (local < TRANS) {
      const p = interpolate(local, [0, TRANS], [0, 1], { easing: EASE, ...clamp });
      rows = TRANSITIONS[k - 1].map((d) =>
        d.type === "keep"
          ? { text: d.text, kind: "keep" as const, f: 1, op: 1 }
          : d.type === "del"
            ? { text: d.text, kind: "del" as const, f: 1 - p, op: 1 - p }
            : { text: d.text, kind: "add" as const, f: p, op: p },
      );
    } else {
      rows = steps[k].code.map((text) => ({ text, kind: "keep" as const, f: 1, op: 1 }));
    }
  }

  const fontSize = fontForStep(stepIndex);
  const lineH = fontSize * LH;
  const blockFade = interpolate(frame, [0, 16], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.bgTop}, ${theme.bgBottom})` }}>
      {/* sutil glow */}
      <AbsoluteFill style={{ background: `radial-gradient(1100px 600px at 50% -10%, ${theme.accent}14, transparent 60%)` }} />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 54, padding: "80px 70px 100px" }}>
        <div style={{ width: BLOCK_W, opacity: blockFade }}>
          {/* título del paso */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <span style={{ width: 13, height: 13, borderRadius: 999, background: "#FF5F56" }} />
            <span style={{ width: 13, height: 13, borderRadius: 999, background: "#FFBD2E" }} />
            <span style={{ width: 13, height: 13, borderRadius: 999, background: "#27C93F" }} />
            <span style={{ marginLeft: 12, color: theme.accent, fontFamily: theme.fontSans, fontSize: 30, fontWeight: 700 }}>
              {steps[stepIndex].title}
            </span>
          </div>

          {/* ventana de código */}
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: 18,
              padding: "28px 32px",
              boxShadow: `0 30px 90px rgba(0,0,0,0.5), 0 0 0 1px ${theme.accent}1A`,
              fontFamily: theme.fontMono,
              fontSize,
              minHeight: CODE_H + 56,
            }}
          >
            {rows.map((r, idx) => {
              const tint = r.kind === "del" ? theme.del : r.kind === "add" ? theme.add : null;
              const sign = r.kind === "del" ? "−" : r.kind === "add" ? "+" : " ";
              return (
                <div
                  key={idx}
                  style={{
                    height: lineH * r.f,
                    overflow: "hidden",
                    opacity: r.op,
                    display: "flex",
                    alignItems: "flex-start",
                    background: tint ? `${tint}1F` : "transparent",
                    borderLeft: `3px solid ${tint ?? "transparent"}`,
                    borderRadius: 4,
                  }}
                >
                  <span style={{ width: fontSize * 1.3, minWidth: fontSize * 1.3, height: lineH, color: tint ?? theme.textDim, opacity: tint ? 0.9 : 0.35, textAlign: "center" }}>
                    {sign}
                  </span>
                  <span style={{ height: lineH, whiteSpace: "pre", lineHeight: `${lineH}px` }}>
                    {tokenize(r.text).length === 0
                      ? " "
                      : tokenize(r.text).map((tk, j) => (
                          <span key={j} style={{ color: tk.kind === "ws" ? undefined : theme.syntax[tk.kind] }}>
                            {tk.text}
                          </span>
                        ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* columna de CONCEPTOS que se descubren en este paso (solo el nombre) */}
        <div style={{ width: COL_W, alignSelf: "stretch", paddingTop: 84, opacity: blockFade }}>
          {(steps[stepIndex].concepts ?? []).length > 0 ? (
            <div style={{ color: theme.textDim, fontFamily: theme.fontSans, fontSize: 22, fontWeight: 700, letterSpacing: 1.5, marginBottom: 22 }}>
              CONCEPTOS QUE APARECEN
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 13, alignItems: "flex-start" }}>
            {(steps[stepIndex].concepts ?? []).map((c, i) => {
              const start = (stepIndex === 0 ? 12 : TRANS + 4) + i * 6;
              const ap = interpolate(stepLocalFrame, [start, start + 16], [0, 1], { easing: EASE, ...clamp });
              return (
                <div
                  key={c + i}
                  style={{
                    opacity: ap,
                    translate: `${(1 - ap) * 22}px 0px`,
                    maxWidth: COL_W,
                    background: `${theme.accent}1A`,
                    border: `1px solid ${theme.accent}66`,
                    borderLeft: `4px solid ${theme.accent}`,
                    borderRadius: 10,
                    padding: "11px 18px",
                    fontFamily: theme.fontSans,
                    fontSize: 26,
                    fontWeight: 600,
                    color: theme.accent,
                    lineHeight: 1.25,
                  }}
                >
                  {c}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
