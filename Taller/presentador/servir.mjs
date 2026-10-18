// Sirve el modo presentación en http://localhost:5640 (o el puerto de PUERTO).
// Vuelve a compilar al guardar un cambio: recarga la página para verlo.
import * as esbuild from "esbuild";

const contexto = await esbuild.context({
  entryPoints: ["presentador/main.tsx"],
  bundle: true,
  outfile: "presentador/www/main.js",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  sourcemap: true,
  logLevel: "info",
});
await contexto.watch();
const { port } = await contexto.serve({
  servedir: "presentador/www",
  port: Number(process.env.PUERTO ?? 5640),
});
console.log(`\nPresentación: http://localhost:${port}\n`);
