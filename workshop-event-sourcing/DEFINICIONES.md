# Definiciones de creación — workshop-event-sourcing

> El **contrato** que toda sección (nueva o reformada) debe cumplir. Nace de las correcciones del autor durante la revisión del taller (jul 2026). Lo aplican los agentes de `.claude/agents/` en cada validación.
> Complementa: `METODO.md` (el motor pedagógico ingenuo→dolor→refactor→nombre) y `REPLANTEO.md` (el arco de secciones).
> Cada regla lleva el **caso real** que la originó — el caso es la definición operativa, no un adorno.

---

## A. Redacción (la pluma)

1. **Directo y literal.** Nada de ironía, sarcasmo ni retórica de "proponer-para-tumbar" (presentar una opción solo para descartarla como absurda). Afirmar el hecho.
   *Caso:* "¿La salida? Un despachador por empresa… eso es absurdo" → confundía; se reemplazó por la afirmación directa de la causa y la pieza que falta.
2. **Una idea por frase.** Sujeto-verbo-objeto. Prohibidas las cláusulas apiladas (3+ ideas con guiones/paréntesis, guiones anidados). Si la frase necesita respirar, son dos frases.
   *Caso:* el 🎯 de aplicar-al-levantar apilaba meta + adelanto + definición entre guiones anidados; se partió en frases planas.
3. **El punto se dice una vez.** Sin repetir con otras palabras lo que la frase anterior ya dijo, ni coletillas de cierre que reafirman lo recién dicho.
   *Caso:* "…extraeremos la interfaz para intercambiarlos. Como hoy hay uno solo, aún no hace falta." — la segunda frase era eco; se quitó.
4. **Sin jerga de CS evitable.** Usar el actor que el alumno ya conoce: "el handler", no "el llamador"; "crear", no "instanciar"; "pasarle el store", no "cargar el store"; "tratar/procesar", no "handlear". El vocabulario del **dominio** que se está enseñando (stream, agregado, evento, proyección, Marten…) sí se usa: es consistencia.
5. **Toda palabra aterrizada en su primer uso.** Sin términos vagos que no digan *a qué* y *para qué*.
   *Caso:* "el almacén te lo entrega **conectado**" → ¿conectado a qué, para qué? Se aterrizó: "guarda por dentro dos cosas: la referencia al almacén y el id".
6. **Frases completas.** Sin elipsis que dejen el verbo u objeto colgando.
   *Caso:* "así que todavía no" → ¿todavía no *qué*? Se completó la idea.
7. **Sin meta-referencias hacia atrás.** Nada de "ese X del inicio **es** este método" ni "como decíamos arriba": si obliga a rebobinar para entender la frase, se reescribe para que se entienda sola.
8. **Sin adelantos embutidos.** No mencionar conceptos o secciones aún no vistos dentro de una explicación, como si se conocieran. El único lugar legítimo para adelantar es la 🌱 semilla — y marcada como tal.
   *Caso:* "la misma forma con la que, más adelante, le pedirás la empresa directamente al almacén" en medio de un reto → se quitó.
9. **Ante algo confuso: quitar la causa o convertirlo en reto. Nunca añadir prosa explicativa.** El orden de remedios es: (a) borrar la palabra/frase/prefijo que confunde; (b) pedir al alumno que lo construya; (c) afirmar el hecho en una frase llana.
   *Caso:* el prefijo `InMemory` confundía → no se explicó: se **quitó** (la clase se llama `EventStore` hasta que llega la 2ª implementación).

## B. Estructura de una sección (el método)

1. **Motivar = mostrar en uso (example-first).** Para introducir una pieza, el reto abre con el **ejemplo de uso** — el código que quieres poder escribir + `// la salida esperada` — seguido de "🛠️ haz que ese ejemplo funcione" con pistas, y la solución en `<details>`. El ejemplo ES la motivación; sobra el párrafo que argumenta por qué existe la pieza.
   *Caso:* `AbrirStream` — la prosa del porqué confundió; copiar el ejemplo del checkpoint e intentarlo con las pistas fue lo que funcionó.
2. **Pasos separados, no anidados.** Un reto con dos piezas son dos pasos (`### Paso 1 · …` / `### Paso 2 · …`), cada uno con su reto y su solución — no sub-bullets dentro de un solo 🛠️.
3. **Cada pieza se introduce donde tiene consumidor real.** Si un campo/método/concepto no se usa en la sección donde nace, va donde se consume. Arrastrar piezas "para después" está prohibido.
   *Caso:* el `Id` de `AggregateRoot` nacía en el almacén-por-id pero nadie lo leía hasta el almacén directo → se movió allá.
4. **El nombre cuando gana su sueldo.** Prefijos, interfaces y patrones se bautizan cuando llega lo que los justifica (la 2ª implementación, el segundo caso). Antes, el nombre simple.
   *Casos:* `EventStore` → `InMemoryEventStore` solo cuando llega `MartenEventStore`; `IEventStore` solo cuando el equipo la introduce.
5. **Una idea por sección.** Si una sección acumula 4+ conceptos nuevos, se parte.
   *Caso:* el almacén-en-memoria (id + sobre + versión + concurrencia + delegación) se partió en dos.
6. **Advertir donde nace la tentación, no donde explota.** Si el alumno puede tomar un mal camino con lo que acaba de construir, el aviso va en esa sección.
   *Caso:* llamar `store.AppendEvent(...)` directo desde el handler funciona al principio y se rompe con la concurrencia → el WARNING se puso donde se construye el almacén.
7. **Las 🌱 semillas siembran futuro concreto.** Dicen QUÉ vendrá y enlazan la sección donde ocurre ("nacerán hermanos: uno para producción [Revelar Marten], uno para tests [TestStore]"). No dan mini-lecciones abstractas ("para qué sirve una interfaz").
8. **Toda sección declara el concepto que acuña y quién lo consume.** Si nadie lo consume después, la sección no va (ver la Poda del REPLANTEO).

## C. Hilo y narrativa (el arco)

1. **Evolutivo.** Cada sección nace de un dolor que la anterior dejó a la vista. Prohibido el túnel: no más de ~2 secciones seguidas sin que el proyecto gane una capacidad tocable.
2. **El sistema siempre vivo.** Cada sección deja algo que se puede tocar: un test verde, un `curl` que responde, una fila en la base, un mensaje en la cola.
3. **La evidencia es del sistema, no del texto.** Comprobar mirando la base de datos (`mt_events`, checkpoints), la respuesta HTTP, la cola — no "confía en mí".
4. **El error como maestro.** Provocar la excepción esperada a propósito y arreglarla en vivo enseña más que advertirla en prosa.
5. **El refactor nombra al muerto.** Al reemplazar una pieza casera por la herramienta, decir qué API la sustituye ("tu sobre ≈ el `IEvent` de Marten").
6. **Escaleras de esfuerzo.** Un catálogo de técnicas se ordena de barato a caro, con el criterio de cuándo subir el escalón (versionado: ¿otro evento de negocio? → no-rompedor → upcaster → transformar el stream).
7. **La herramienta se habita, no se lee.** Después de adoptarla, cada tema es una feature del proyecto que el alumno construye con ella (con reto). Config mostrada sin manos = sección incompleta.
8. **Los tests verifican los retos.** Desde que existen (secciones 10-11 del arco), cada reto se comprueba con un test — y los tests sobreviven a los refactores como prueba del desacople.

## D. Formato fijo (dispositivos de una sección)

- `# H1` con título en el idioma del alumno + intro corta que engancha con la sección anterior.
- `## 🎯 El Objetivo` — una frase de logro.
- `## 💥 El dolor` — el problema sentido (el único lugar donde la prosa de motivación es obligatoria).
- `## 🔧 …` — el trabajo, con retos **🛠️ Inténtalo tú** (example-first, regla B1) + solución en `<details><summary>👉 Muéstrame una forma de hacerlo</summary>`.
- `> 🆕 **Idioma de C#…**` — cajas para sintaxis nueva del lenguaje, en su primer uso.
- `> 🔍 **¿Lo lograste?**` — checkpoint intermedio con salida esperada.
- `### El Descubrimiento` — qué se construyó y cómo se llama en el mundo real.
- `> 🌱 **Semilla — …**` — futuro concreto con enlace (regla B7).
- `## ✅ Compruébalo` — checklist auto-verificable.
- `## 📓 Registra tu avance` — reflexión 💭 + commit con la respuesta en palabras del alumno + push.
- `## 🧠 En una frase` — el resumen.
- `[⬅️ Volver: …]` / `[➡️ Siguiente: …]` — la cadena.
- Archivos = slugs sin número bajo `secciones/`; el orden vive en `MAPA.md` y la cadena ⬅️/➡️; las citas entre secciones son enlaces por título.
- **Validación determinista:** `bash tools/validate-workshop.sh workshop-event-sourcing --strict-links` → **0 errores**, siempre, después de cada cambio.

## E. Los agentes y el flujo de validación

| Agente | Lente | Cuándo corre |
|---|---|---|
| **revisor-estilo** (nuevo) | La pluma y el método: reglas A y B de este documento (ironía, redundancia, jerga, meta-refs, teasers, frases apiladas, retos example-first, semillas concretas) | Al terminar **cada sección** |
| **revisor-coherencia** | El hilo entre secciones: progresión, nada usado antes de explicarse, naming/dominio consistente (reglas C) | Al terminar **cada bloque** |
| **revisor-principiante** | La cabeza del alumno: fricción operativa + motivos no demostrados + preguntas ignoradas | En secciones con conceptos nuevos densos, o ante dudas de claridad |
| **verificador-tecnico** | El código: compila (.NET 10, Marten 9, Wolverine), fiel a la doc oficial, buenas prácticas | Al terminar **cada bloque** |
| **verificador-e2e** | Los pasos reales (Docker, Postgres, Rabbit, Azure): los sigue como un alumno | Solo en **hitos** (fin de bloques 4, 7 y 9) — costoso |

**Pipeline por sección:** escribir → validador (0 errores) → `revisor-estilo`.
**Pipeline por bloque:** + `revisor-coherencia` + `verificador-tecnico` (+ `revisor-principiante` si hay dudas).
**Hitos (bloques 4, 7, 9):** + `verificador-e2e` contra infra real.
