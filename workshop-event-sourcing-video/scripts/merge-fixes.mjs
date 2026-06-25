import fs from "fs";

const FIX_SRC = process.argv[2]; // workflow output file
const JSON_PATH = process.argv[3]; // generated-sections.json

const fixData = JSON.parse(fs.readFileSync(FIX_SRC, "utf8"));
const fixed = fixData?.result?.fixed ?? fixData?.fixed ?? [];

function decode(s) {
  if (typeof s !== "string") return s;
  let t = s;
  for (let i = 0; i < 2; i++) {
    t = t
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
  }
  return t;
}
function walk(o) {
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o)) r[k] = walk(o[k]); return r; }
  return decode(o);
}

const current = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const bySlug = new Map(current.map((s) => [s.slug, s]));
let replaced = 0;
for (const f of walk(fixed)) {
  if (bySlug.has(f.slug)) { bySlug.set(f.slug, f); replaced++; }
}
const merged = [...bySlug.values()].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
fs.writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2));

// chequeos
const blob = JSON.stringify(merged);
const ent = (blob.match(/&(lt|gt|amp|quot|apos|#39|#x27);/g) || []).length;
let longLines = 0, slugsLong = new Set();
for (const s of merged) for (const b of (s.beats || [])) for (const l of (b.code || [])) if (l.length > 72) { longLines++; slugsLong.add(s.number); }
console.log("reemplazadas:", replaced, "/ total:", merged.length);
console.log("entidades HTML restantes:", ent);
console.log("líneas >72 chars restantes:", longLines, longLines ? "en §" + [...slugsLong].join(",§") : "");
