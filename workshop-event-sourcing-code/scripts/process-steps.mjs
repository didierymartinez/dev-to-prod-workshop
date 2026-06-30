import fs from "fs";
const SRC = process.argv[2], OUT = process.argv[3];
const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const sections = (data?.result?.sections ?? data?.sections ?? []).slice().sort((a, b) => a.number - b.number);

const decode = (s) => {
  if (typeof s !== "string") return s;
  let t = s;
  for (let i = 0; i < 2; i++) t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
  return t.replace(/\\n/g, "\n");
};

const steps = [];
for (const sec of sections) for (const st of (sec.steps || [])) {
  steps.push({ title: decode(st.title), code: (st.code || []).map(decode) });
}
fs.writeFileSync(OUT, JSON.stringify(steps, null, 2));

// validaciones
let longLines = 0, tallSteps = 0, maxLines = 0, maxLen = 0;
for (const st of steps) {
  if (st.code.length > 16) { tallSteps++; }
  maxLines = Math.max(maxLines, st.code.length);
  for (const l of st.code) { if (l.length > 78) longLines++; maxLen = Math.max(maxLen, l.length); }
}
console.log("pasos totales:", steps.length, "· de", sections.length, "secciones");
console.log("máx líneas en un paso:", maxLines, "· pasos >16 líneas:", tallSteps);
console.log("línea más larga:", maxLen, "chars · líneas >78:", longLines);
console.log("títulos:", steps.map((s) => s.title.split(" · ")[0]).join(" "));
