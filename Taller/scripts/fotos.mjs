// Renderiza una foto (PNG, a media escala) de cada lámina, ya con todo su contenido,
// en out/fotos/. Empaqueta una sola vez y usa un solo navegador.
// Al final lista las pantallas que no caben ni reducidas ("[taller] … no cabe").
//
// Uso: node scripts/fotos.mjs [número de sección ...]     (sin números: todas)
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import * as esbuild from "esbuild";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pedidas = process.argv.slice(2).map(Number).filter(Number.isFinite);

await esbuild.build({
  entryPoints: [path.join(raiz, "scripts/fotos.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(raiz, "out/fotos.cjs"),
  logLevel: "warning",
});
const { listar } = createRequire(import.meta.url)(path.join(raiz, "out/fotos.cjs"));
const fotos = listar(pedidas);

const carpeta = path.join(raiz, "out/fotos");
mkdirSync(carpeta, { recursive: true });
const dos = (n) => String(n).padStart(2, "0");
for (const n of new Set(fotos.map((f) => f.seccion))) {
  // las de antes, por si cambió la numeración
  for (const f of readdirSync(carpeta)) if (f.startsWith(`seccion-${dos(n)}-`)) rmSync(path.join(carpeta, f));
}

const serveUrl = await bundle({ entryPoint: path.join(raiz, "src/index.ts"), rspack: true });
const navegador = await openBrowser("chrome");
const avisos = [];
const composiciones = new Map();
try {
  for (const f of fotos) {
    const id = `seccion-${dos(f.seccion)}`;
    const inputProps = { secciones: [f.seccion] };
    if (!composiciones.has(id)) {
      composiciones.set(id, await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: navegador }));
    }
    const salida = path.join(carpeta, `${id}-${dos(f.lamina)}-${f.tipo}.png`);
    await renderStill({
      composition: composiciones.get(id),
      serveUrl,
      inputProps,
      frame: f.frame,
      output: salida,
      scale: 0.5,
      puppeteerInstance: navegador,
      onBrowserLog: (log) => {
        if (log.text.includes("[taller]")) avisos.push(`${path.basename(salida)}: ${log.text}`);
      },
    });
    console.log(path.relative(raiz, salida));
  }
} finally {
  await navegador.close({ silent: true });
}

if (avisos.length) {
  console.log(`\n${avisos.length} pantalla(s) no caben:`);
  for (const a of avisos) console.log(`  ${a}`);
  process.exitCode = 1;
}
