# Definiciones de creación — workshop-basics

> El **contrato** que toda lección de código (nueva o reformada) debe cumplir. Nace de la retroalimentación de una alumna junior real (Heidy, jul 2026) que llegó a la Fase 2 y reportó: *"copio y pego y todo me funciona, pero no quiero eso, quiero entender"*, *"entiendo lo que hace, pero si me toca armarlo… no soy capaz"*, y frente a `!string.IsNullOrWhiteSpace(nit)`: *"ni puta idea"*.
> Cada regla lleva el **caso real** que la originó — el caso es la definición operativa, no un adorno.
> Hermano mayor: `workshop-event-sourcing/DEFINICIONES.md` (de donde viene el método example-first). Este documento lo adapta al nivel principiante y le suma la sección **C: validar comprensión, no ejecución**.

---

## El principio que rige todo

**Verde ≠ entendí.** Que el programa compile, corra y el PR quede fusionado **no prueba que el alumno entendió** — el copy-paste produce todo eso sin comprensión. Una lección de código no termina cuando "funciona"; termina cuando el alumno puede **predecir, romper y explicar** lo que escribió. Todo lo demás son medios para eso.

---

## A. Redacción (la pluma)

1. **Directo y literal.** Afirmar el hecho. Nada de ironía ni de proponer una opción solo para tumbarla.
2. **Una idea por frase.** Sujeto-verbo-objeto. Si una frase apila 3+ ideas con guiones o paréntesis, son dos frases.
3. **Sin jerga de CS evitable.** "el método", no "el llamador"; "crear", no "instanciar". El vocabulario que **sí** se enseña (método, parámetro, lista, `record`, rama, commit) se usa consistente.
4. **Toda palabra de código aterrizada en su primer uso.** Ningún símbolo entra sin explicarse *la primera vez que aparece* — incluidos los "pequeños": `!`, `?`, `=>`, `&&`, `??`, `is not null`. Si no cabe en una frase, va en una caja `🆕`.
   *Caso:* `!string.IsNullOrWhiteSpace(nit)` apareció con un desglose que saltó el `!` → la alumna: "ni puta idea". Ahora el `!` se lee "por partes" en una caja 🆕.
5. **El calor sobre el error.** Cuando el alumno se traba, el texto lo normaliza explícitamente ("trabarte aquí es esperado, no significa que no tienes bases"). Nunca se asume que "es obvio".
   *Caso:* la alumna concluyó "creo que no tengo buenas bases en programación" por una confusión que era culpa del texto, no suya.

## B. Estructura de una lección de código (el método: ENSEÑAR antes de RETAR)

> ⚠️ **La regla que rige toda la sección.** Este taller es para alguien **sin experiencia**. No se le puede pedir que *intente* escribir sintaxis que no ha visto — solo abriría la solución y copiaría. Por eso el orden es **enseñar primero, retar después**. (El patrón inverso "reto-primero" del taller de event sourcing es para alumnos con base; **aquí no aplica**.)

1. **Worked-example primero: te muestro → te explico → predices.** Para introducir una pieza nueva, el paso abre **mostrando el código completo** (un *ejemplo resuelto*, no un hueco), seguido de **su explicación** con cada símbolo aterrizado (cajas `🆕`), y un **🔮 predice** antes de correrlo. El alumno **aprende viéndolo funcionar**, no adivinándolo.
   *Caso:* la alumna dijo *"si me toca armarlo, no soy capaz"* — porque el reto llegaba antes de la enseñanza. Primero se enseña; recién entonces puede.
2. **El 🛠️ Inténtalo tú va DESPUÉS de enseñar, y es una variación pequeña.** Una vez mostrada y explicada la pieza, el reto pide **aplicar lo recién visto con un cambio acotado** (agrega un dato, cuenta lo contrario, cambia la condición) — nunca "invéntalo de cero". Solución en `<details><summary>👉 Muéstrame una forma de hacerlo</summary>`. El reto prueba **transferencia**, después del aprendizaje.
   *Caso:* lo que la alumna amó de otro taller fue *"me explica, me dice qué hacer, y luego me muestra cómo era"* — el "me explica" va **primero**.
3. **Nada de bloques gigantes para copiar sin más.** El "te muestro" no es "reemplaza 30 líneas por esto y sigue": es un bloque **pequeño por idea**, con su explicación pegada. Si una pieza es grande, se parte.
4. **Una idea por paso; pasos separados, no anidados.** Dos piezas = dos `### Paso N`, cada uno con su enseñanza y su reto.
   *Caso:* la caja "Conceptos" mezclaba *qué es un método* con *consultas sobre listas* → la alumna dedujo, falsamente, "para construir un método necesitas una lista". Se separó.
5. **Cada pieza se introduce donde tiene consumidor real.** No se adelantan conceptos "para después". Un `Where`/`FirstOrDefault` se enseña en el paso donde se usa, no en un bloque teórico al inicio.
6. **Cajas `🆕`** para sintaxis nueva del lenguaje, en su primer uso, con anatomía visual cuando ayuda (etiquetar las partes de una firma, leer una condición "de adentro hacia afuera").
7. **Advertir donde nace la tentación o la confusión**, no después. Si una pieza suele malinterpretarse (el `!`, un método sin parámetros), el aviso va justo ahí.

## C. Validar comprensión, no ejecución (lo propio de este taller)

Estos dispositivos son **obligatorios** en toda lección de código. Son las señales que el copy-paste no puede falsificar.

1. **🔮 Predice, luego corre.** Antes de cada `dotnet run` (o `curl`, o request) relevante, el alumno **predice** la salida. Si su modelo mental está mal, la predicción diverge de la realidad y **él mismo lo ve**. Costo cero, señal alta.
   *Caso:* el método sin parámetros del Paso 1 hace que el alumno prediga "¿necesitó una lista?" y compruebe que no — mata la falsa creencia en vivo.
2. **🔨 Rómpelo a propósito.** Al menos una vez por lección, el alumno **cambia o borra una pieza**, predice qué se daña, y lo observa. Entiende algo de verdad cuando puede predecir qué pasa si lo cambia.
   *Caso:* "quita el `!`, presiona Enter sin escribir, ¿qué pasa?" ataca justo el símbolo que no entendió. (Este dispositivo ya existía suelto en 2.2 como "rompe el `;`"; ahora es regla.)
3. **📓 El commit explica el PORQUÉ, no el QUÉ.** El mensaje del commit **no** describe la acción ("hice un método que filtra"); responde una **pregunta de comprensión concreta con las palabras del alumno**, e incluye su predicción y si acertó. Aquí es donde el mentor valida — leyendo la explicación, no el diff.
   *Caso:* el commit real de la alumna decía "hice la prueba de crear un metodo que filtre por plan" — describe la acción, no revela el modelo mental (que estaba roto). El repo estaba todo verde.
4. **🎯 Adapta, no copies.** El reto principal de cada lección incluye un giro que la solución mostrada **no** responde directo (mostrar *inactivas* en vez de activas, otro plan, salida distinta). Pegar el `<details>` da el resultado equivocado; hay que modificar.
5. **🚦 Autocalificación honesta.** Al cierre, el alumno marca 🟢 *lo construí solo* / 🟡 *me costó / abrí la solución antes* / 🔴 *no me alcanzó*. Los 🟡/🔴 son señal de qué repasar, no de fracaso.
6. **✅ Compruébalo parte en dos:** *"que corre"* (comportamiento observable) y *"que entendiste"* (puedo escribir de memoria la firma / explicar el símbolo / mi predicción coincidió). La segunda lista es la que importa.

## D. Formato fijo (dispositivos de una lección)

- `# Lección N.M — Título` + línea `⏱️ … · 🎯 Al terminar: …`.
- (Lecciones de código) `> 🧭 Cómo se aprende aquí` la primera vez que el patrón entra en una fase.
- `## 🤔 El problema` — la pregunta concreta que la lección responde.
- `## 💡 …` — el concepto mínimo, **una idea**, decoplado de lo que no es (regla B3). En lecciones puramente conceptuales (p. ej. 2.1), esta es la sección principal.
- `## 🛠️ Manos a la obra` — `### Paso N`, cada uno **enseña primero** (te muestro el código + cajas `🆕` + 🔮 predice) y **luego** un **🛠️ Inténtalo tú** de variación + `<details>` (regla B). El 🔨 rómpelo va tras el reto (regla C).
- `### Paso final · Guardar el avance` — rama + commit **de comprensión** (C3) + push + PR.
- `## ✅ Compruébalo` — en dos partes (D6→C6) + 🚦 autocalificación (C5).
- `## 🧠 Lo que aprendiste` — resumen en viñetas.
- `## 🆘 Si algo salió mal` — errores comunes, **incluyendo** una entrada "copié y funciona pero no entiendo" que remite a 🔮/🔨.
- `➡️ Siguiente` al pie.
- **Validación determinista:** `bash tools/validate-workshop.sh workshop-basics --strict-links` → **0 errores**, tras cada cambio.
- **El código se compila de verdad** antes de dar por buena una lección (ensamblar las soluciones de los `<details>` y correr `dotnet`).

## E. Alcance del contrato

Aplica a las lecciones **con código**: Fases 2 (programa), 4 (API), 5 (frontend), 6 (base de datos), 7 (pruebas/CI). Las lecciones de **Git/infra/concepto** (Fase 1, partes de 0, 8, 9, 10, 11) usan 🔮 y 🔨 donde tengan una acción con resultado observable (p. ej. "predice qué rama trae el `sync`, luego míralo"), pero no necesitan `<details>` de código.
