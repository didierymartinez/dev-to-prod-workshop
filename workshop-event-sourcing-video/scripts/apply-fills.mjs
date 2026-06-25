import fs from "fs";
const SRC = process.argv[2], JSON_PATH = process.argv[3];
const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const filled = data?.result?.filled ?? data?.filled ?? [];
const decode = (s) => {
  if (typeof s !== "string") return s;
  let t = s;
  for (let i = 0; i < 2; i++) t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
  return t;
};
const g = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
let applied = 0;
for (const f of filled) {
  const s = g.find((x) => x.number === f.number);
  if (s && s.beats[f.beat] && s.beats[f.beat].side) { s.beats[f.beat].side.text = decode(f.text); applied++; }
}
fs.writeFileSync(JSON_PATH, JSON.stringify(g, null, 2));
// re-chequeo de sides vacíos
let bad = 0;
for (const s of g) for (const b of (s.beats || [])) { const sd = b.side; if (!sd) continue;
  if ((sd.kind === "state" && !(sd.rows && sd.rows.length)) || (sd.kind === "list" && !(sd.items && sd.items.length)) || ((sd.kind === "text" || sd.kind === "output") && !(sd.text && sd.text.trim()))) bad++;
}
console.log("aplicados:", applied, "/ esperados:", filled.length, "· sides vacíos restantes:", bad);
