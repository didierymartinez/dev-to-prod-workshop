// Imprime, por lámina, el frame en que ya entró todo su contenido.
// Lo usa scripts/fotos.sh para renderizar una foto de cada lámina y revisarlas.
import { secciones } from "../src/contenido";
import { ENTRADA, ubicar } from "../src/tiempos";

const pedidas = process.argv.slice(2).map(Number);
for (const s of secciones.filter((x) => pedidas.length === 0 || pedidas.includes(x.numero))) {
  for (const u of ubicar([s])) {
    const ultimo = u.plan.inicios[u.plan.inicios.length - 1];
    const frame = u.desde + ultimo + ENTRADA + 4;
    console.log(`${s.numero}\t${u.indiceEnSeccion + 1}\t${u.lamina.tipo}\t${frame}`);
  }
}
