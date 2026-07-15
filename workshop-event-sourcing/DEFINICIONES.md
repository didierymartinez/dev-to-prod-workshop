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

- `# H1` con título en el idioma del alumno + **intro corta (1-2 frases): un gancho con la sección anterior, NO un re-enunciado del 💥 dolor ni del 🎯**. *Caso: el intro de Given-When-Then repetía «verificabas a ojo, no avisa» (el dolor) y «red de seguridad» (el objetivo) → se recortó a un gancho.*
- `## 🎯 El Objetivo` — una frase de logro **en términos que el alumno YA conoce**: no nombres un concepto/API/sección que llega después como si se supiera; descríbelo en llano. *Caso: el 🎯 nombraba «Given/When/Then», «Marten» y «el swap» antes de que existieran → se reescribió como «dado/cuando/entonces» y «cambiar el motor por debajo».*
- `## 💥 El dolor` — el problema sentido (el único lugar donde la prosa de motivación es obligatoria).
- `## 🔧 …` — el trabajo, con retos **🛠️ Inténtalo tú** (example-first, regla B1) + solución en `<details><summary>👉 Muéstrame una forma de hacerlo</summary>`.
- `> 🆕 **Idioma de C#…**` — cajas para sintaxis nueva del lenguaje, en su primer uso. **El título lista solo idioma genuinamente NUEVO**, nunca recaps: si algo ya se ganó (herencia, un patrón ya visto), va en el cuerpo como "ya la conoces", no en el título. *Caso: "🆕 `params object[]` **y herencia**" → herencia no era nueva; quedó "🆕 `params object[]`" + herencia como recap.*
- `> 🔍 **¿Lo lograste?**` — checkpoint intermedio con salida esperada.
- `### El Descubrimiento` — qué se construyó y cómo se llama en el mundo real.
- `> 🌱 **Semilla — …**` — futuro concreto con enlace (regla B7).
- `## ✅ Compruébalo` — checklist auto-verificable.
- `## 📓 Registra tu avance` — reflexión 💭 + commit con la respuesta en palabras del alumno + push.
- `## 🧠 En una frase` — el resumen.
- `[⬅️ Volver: …]` / `[➡️ Siguiente: …]` — la cadena.
- Archivos = slugs sin número bajo `secciones/`; el orden vive en `MAPA.md` y la cadena ⬅️/➡️; las citas entre secciones son enlaces por título.
- **Validación determinista:** `bash tools/validate-workshop.sh workshop-event-sourcing --strict-links` → **0 errores**, siempre, después de cada cambio.

## F. El reto (🛠️) — cómo se escribe una instrucción intentable

El reto es donde más se rompe la pedagogía. Un reto es una **instrucción para que el alumno lo intente**, no el resumen de la solución ni una lista de piezas a transcribir. Checklist:

1. **Example-first (= B1).** Abre con la **línea/uso** que el alumno quiere lograr (`Given(new EmpresaRegistrada(...))`); luego "haz que funcione". La meta se ve antes que la mecánica.
2. **Verbos concretos, no vagos ni metáforas de andamiaje.** Di QUÉ hacer con verbos de acción ("**crea** una clase", "**dale** una propiedad", "**abre** el stream de `AggregateId`", "**recorre** los hechos y haz `Append`", "**guarda** cuántos había"), nunca "un método que **siembre**" / "que haga X", y **nunca metáforas** que el alumno no sabe ejecutar: prohibido "**sube** el sembrado a una base" (¿subir?), "la base **guarda** el `EventStore`" (¿guardar?). *Casos: "`Given(...)` que siembre" no decía sembrar qué ni dónde; "sube el sembrado a una base" / "la base guarda el EventStore" se reescribieron como "crea una clase `HandlerTest`… dale una propiedad para el `EventStore`".*
3. **Cada pieza de la solución, pedida o explicada ANTES.** Si el `<details>` usa `_previos`, `AggregateId`, `params`, un campo o un `using`, el reto (o una 🆕 previa) lo **nombra y motiva**. Cero sorpresas en la solución. *Caso: `_previos` y `AggregateId` aparecían en la solución sin que el reto los pidiera.*
4. **No sobre-prescribas.** No impongas estructura ni una firma exacta cuando **da igual** (archivo nuevo vs. mismo archivo, `params` vs. `object[]`): deja la decisión libre, o di el porqué. *Caso: "en un archivo nuevo `HandlerTest.cs`" imponía separar archivos sin necesidad.*
5. **La guía va ANTES del `<details>`, nunca después.** La 🆕 que explica una API/concepto **nuevo o inguessable** precede al reto. Si la explicación llega tras la solución, el alumno solo puede **copiar**. *Caso emblemático (auditoría de 11 retos): las 🆕 de `MetadataConfig`, la reflexión del `TestStore`, `MapPost`, `SubscriptionBase`… venían tras el `<details>`.*
6. **Idioma nuevo se MUESTRA, no se reta (= D/🆕).** Si la API es inguessable (flags de config, el andamiaje de un host, minimal API), **muéstrala**; reta solo lo que el alumno puede intentar por patrón. Si aparece reflexión/`dynamic`, enmárcalo con honestidad ("es la maquinaria que el framework esconde").
7. **Un miembro `abstract` se anuncia junto a su `override`.** Añadir un miembro abstracto a una base sin implementarlo en la subclase **no compila**; el reto pide **ambas** ediciones antes de correr. *Caso: `abstract Handler` en el Paso 3 de Given-When-Then.*
8. **Evolutivo, una pieza por paso (= B2).** No entregues una clase/base entera de golpe: constrúyela o transfórmala **un miembro por paso**, verde en cada uno; el alumno ve la pieza **emerger** de lo que ya tenía. *Caso: `HandlerTest` se tiraba completa; se rehízo extrayendo Given → When → Then, uno por paso.*
9. **Idioma nuevo en el reto: nómbralo INLINE con su propósito.** Si el reto debe mencionar una sintaxis nueva de C#, va **pegada a su intención**, no como orden cruda ni partida en un 🆕 que la explique después. Forma buena: "un método que reciba **uno o varios** hechos —para eso usa `params`: `Given(params object[] eventos)`—". El 🆕 luego **amplía** el mecanismo ("`params` empaqueta en el array los sueltos"); no es la primera aparición huérfana. *Caso: el reto de `Given` osciló entre orden cruda (`Given(params object[])` a secas) e intención-sin-sintaxis; quedó en propósito + sintaxis inline.*
10. **No adelantes `<T>` ni `abstract`.** Un parámetro de tipo genérico, o el modificador `abstract` de una clase, se declaran en el **paso donde nace el miembro que los obliga** (el `When`/`Handler` que necesitan `<TCommand>`; el miembro `abstract` que obliga a la clase `abstract`), no en un paso anterior "por si acaso" — ni siquiera para decir "aún no lo lleva". *Caso: `HandlerTest<TCommand>` y `abstract` estaban en el Paso 2 (que solo tiene `Given`); se movieron al Paso 3, donde nacen `When`/`Handler`.*

## E. Los agentes y el flujo de validación

| Agente | Lente | Cuándo corre |
|---|---|---|
| **revisor-estilo** | La pluma y el método: reglas A, B y **F** (ironía, redundancia, jerga, meta-refs, teasers, frases apiladas, **retos: example-first, verbos concretos (sin metáforas de andamiaje "sube X a la base"), sin sobre-prescribir, guía-antes-del-`<details>`, idioma-nuevo inline con su propósito, sin adelantar `<T>`/`abstract`, título 🆕 = solo lo nuevo, arranque=gancho**, semillas concretas) | Al terminar **cada sección** |
| **revisor-coherencia** | El hilo entre secciones: progresión, nada usado antes de explicarse, naming/dominio consistente (reglas C) | Al terminar **cada bloque** |
| **revisor-principiante** | La cabeza del alumno: fricción + motivos no demostrados + **conceptos asumidos / usados antes de ganarse** + **guía tras la solución** + **piezas sorpresa en el `<details>`** + preguntas ignoradas | Al terminar **cada sección** con conceptos nuevos |
| **verificador-tecnico** | El código: compila (.NET 10, Marten 9, Wolverine), fiel a la doc oficial, buenas prácticas | Al terminar **cada sección** con código nuevo |
| **verificador-e2e** | Los pasos reales (Docker, Postgres, Rabbit, Azure): los sigue como un alumno | Solo en **hitos** — costoso |

**Pipeline por sección: el skill `revisar-seccion`** — corre validador + `revisor-estilo` + `revisor-principiante` + `verificador-tecnico` sobre la sección y consolida los hallazgos. Es la forma estándar de cerrar cada sección (reemplaza correr los agentes a mano).
**Pipeline por bloque:** + `revisor-coherencia` sobre el bloque.
**Hitos:** + `verificador-e2e` contra infra real.
