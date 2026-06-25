import fs from "fs";

const SRC = process.argv[2];
const OUT = process.argv[3];

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
let sections = data?.result?.sections ?? data?.sections ?? data;

function decode(s) {
  if (typeof s !== "string") return s;
  let t = s;
  for (let i = 0; i < 2; i++) {
    t = t
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'");
  }
  return t;
}
function walk(o) {
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === "object") {
    const r = {};
    for (const k of Object.keys(o)) r[k] = walk(o[k]);
    return r;
  }
  return decode(o);
}

sections = walk(sections).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
fs.writeFileSync(OUT, JSON.stringify(sections, null, 2));

const blob = JSON.stringify(sections);
const ent = (blob.match(/&(lt|gt|amp|quot|apos|#39|#x27);/g) || []).length;
console.log("wrote", sections.length, "sections to", OUT);
console.log("numbers:", sections.map((s) => s.number).join(","));
console.log("remaining HTML entities:", ent);
console.log("beats per section:", sections.map((s) => `${s.number}:${(s.beats || []).length}`).join(" "));
