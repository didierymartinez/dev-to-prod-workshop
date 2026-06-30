import fs from "fs";
const SRC = process.argv[2], STEPS = process.argv[3];
const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const sections = data?.result?.sections ?? data?.sections ?? [];
const decode = (s) => {
  let t = s;
  for (let i = 0; i < 2; i++) t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
  return t;
};
// conceptos por número de sección, en orden de paso
const bySection = new Map();
for (const sec of sections) bySection.set(sec.number, sec.steps.map((s) => (s.concepts || []).map(decode)));

const steps = JSON.parse(fs.readFileSync(STEPS, "utf8"));
// agrupa los pasos por su §N (del title) y asigna en orden
const cursor = new Map(); // number -> índice del próximo paso de esa sección
let assigned = 0, withConcepts = 0;
for (const st of steps) {
  const m = st.title.match(/^§(\d+)/);
  if (!m) continue;
  const n = Number(m[1]);
  const list = bySection.get(n);
  const i = cursor.get(n) ?? 0;
  cursor.set(n, i + 1);
  st.concepts = list && list[i] ? list[i] : [];
  assigned++;
  if (st.concepts.length) withConcepts++;
}
fs.writeFileSync(STEPS, JSON.stringify(steps, null, 2));
const total = steps.reduce((a, s) => a + (s.concepts ? s.concepts.length : 0), 0);
const uniq = new Set(steps.flatMap((s) => s.concepts || [])).size;
console.log("pasos:", steps.length, "· con conceptos:", withConcepts, "· conceptos totales:", total, "· únicos:", uniq);
