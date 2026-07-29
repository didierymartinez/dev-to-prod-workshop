# 🏗️ Plan de obra — la revisión completa de la planeación

> ⚠️ **El orden es UNA sola cadena — vive en [`SECUENCIA.md`](SECUENCIA.md).** Las "Fase 1/2/3", las
> "Partes A-E" y las "Obras 0-4" de este documento **no son separaciones del taller**: son solo agrupaciones
> de trabajo para leer los cambios. No existe un "§1-9 aparte" ni una "segunda mitad". Toda sección es par
> de las demás. Este doc queda como **detalle por sección** (los cambios finos sobre lo ya escrito), no como
> un ordenamiento propio.

> **Qué es esto.** La revisión de TODA la planeación del taller contra el norte
> ([`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md)), los 8 movimientos de re-hilado
> ([`COMO-HILAR-EL-FOCO.md`](COMO-HILAR-EL-FOCO.md)) y el objetivo de fondo: que el aprendiz salga
> capaz de **operar y administrar la plantilla** (`Cosmos.BuildingBlocks`). Deja **definido, sección por
> sección, qué se cambia** — con la cita exacta, el texto nuevo y la razón — más las secciones que se
> introducen y el orden de la obra.
>
> **Cómo se hizo:** barrido de las 16 secciones existentes en 8 pares adyacentes (para evaluar también
> las costuras), cada par contra la brújula + los movimientos M1-M8 + los principios P1-P6 de abajo.
> Resultado: **31 cambios quirúrgicos, 0 renombres, 0 reescrituras de cuerpo** (solo 2 tramos de una
> línea). La única sección intacta: `el-flujo-de-vida` — su costura ya es ejemplar.

---

## 1 · Los principios del aprendiz (la espina declarada)

El diagnóstico de `COMO-HILAR-EL-FOCO.md` encontró que el motor del taller **cambia de eje sin avisar**
(de DOLOR a CRITERIO) y por eso la segunda mitad vieja se sentía tour. La corrección de fondo (M2) es
**declarar el relevo**: el taller tiene DOS motores — el dolor te hace construir; el criterio te hace
mantenedor. Estos seis principios son el perfil de egreso, y cada sección sirve al menos a uno:

| # | Principio | El aprendiz puede… | Se gana en |
|---|---|---|---|
| **P1** | **Entiende el motor porque lo construyó** | explicar stream, versión, replay y transacción sin citar a Marten: los escribió a mano | §1-9 + un-acto/el-agregado (ya en pie) |
| **P2** | **Confía solo con evidencia** | afirmar hechos (no estado), sabotear una línea y exigir un rojo, detectar un verde decorativo | S1 (testing), S2 (el doble que miente), los 🔮/🔨 de toda sección |
| **P3** | **Opera la lectura** | elegir el lifecycle por *quién lee y qué decide*; **medir el rezago** (su Critter Watch); reconstruir una vista con procedimiento, no con pánico | la-vista + reconstruir (en pie) → S6, S7, S8 + runbook de rebuild |
| **P4** | **Administra el contrato de los hechos** | alias estable, forma plana, evolución sin romper la historia; y decir "esto no merecía ES" por escrito | el-nombre (en pie) → S3, S5 |
| **P5** | **Protege la escritura** | concurrencia optimista, unicidad atómica, idempotencia, hecho+anuncio todo-o-nada | concurrencia + todo-o-nada (en pie) → S4, S10 |
| **P6** | **Mantiene y extiende la plantilla** | ver la abstracción como **frontera de capacidad**; documentar criterio que sobrevive; devolver aportes | S2, S11 → estación plantilla → **capstone FetchForWriting** |

**"Operar y administrar la plantilla" significa, en concreto:** al final el aprendiz sabe hacer con un
sistema montado sobre la plantilla exactamente lo que la auditoría encontró que hoy nadie hace — medir
el rezago (L6), reconstruir una vista con runbook (L5), fijar el alias de cada evento con un test (L4),
detectar el doble de test que miente (L3), y meter la versión esperada al escribir (L1, el capstone).
**El taller forma al mantenedor que esos huecos necesitan.**

---

## 2 · El instrumento: el Critter Watch del alumno

Lineamientos (de la brújula, intactos): es un artefacto **ligero y del alumno**; gana una pieza cada
pocas secciones; **no se nombra** —ni él ni Marten/Wolverine— hasta que un dolor lo reclame; cada panel
nace de un dolor vivido, jamás de una lista de features.

| Panel | Capacidad de operación que instala | Nace en | Principio |
|---|---|---|---|
| 1 · **Rezago** (checkpoint vs frente del diario) | "¿puedo creer esta vista AHORA?" | S7 — la vista se atrasa | P3 |
| 2 · **Fallos del proyector** (qué hecho rompió qué vista; ¿reintentar o desahuciar?) | triage transitorio vs permanente | S8 — el mismo hecho dos veces | P3/P5 |
| 3 · **Flujo y longitud de streams** (calientes, sin techo) | ver el stream que va a doler *antes* de que duela | estación post-swap | P3/P6 |
| 4 · **Por cliente** (filas huérfanas, actividad por tenant) | ver la fila fantasma antes del reclamo | S9 — el default silencioso | P3/P4 |
| 5 · **Salud de configuración** (topología del store validada sin BD) | el test barato del insumo #14 | estación del swap / plantilla | P6 |

El panel 1 es además **la pieza que le falta a la plataforma real** (auditoría: toda proyección es
async por diseño y nada mide el atraso — aporte L6): el instrumento del alumno no es un juguete
pedagógico, es el prototipo de lo que la librería no tiene.

---

## 3 · Cambios por sección (los 31, con cita y texto)

Leyenda de tipos — **semilla** (cierre que siembra dolor o hilo largo) · **predice** (🔮 de una línea
antes de una aseveración: el obvio vuelve a la boca del alumno, M3) · **micro-decisión** (línea en
📓 Registra: la decisión que el alumno anota — criterio a espina, M2) · **injerto-reto** (un 🔨 que
falta, M8) · **nav** (repuntar enlace) · **tramo** (reescribir UNA línea).

### Fase 1 · El modelo de escritura (patrón oro §1-9 + las dos vividas)

**`el-diario-de-una-empresa`** *(alineación alta · 2 cambios)*
1. **semilla** — tras *"el estado de hoy se **reconstruye**, pero el pasado ya no se pierde. Eso es **Event Sourcing**."* añadir: *"Queda una pregunta incómoda: un diario en prosa no compila. ¿Cómo se escribe un **hecho** en código de modo que nadie —ni tú mismo, dentro de un mes— pueda editarlo? Eso lo resuelves tú, tecla a tecla, en la siguiente sección."* → repara la **costura débil §1→§2** (hoy el cierre resume, no reclama) [M1·P1]
2. **semilla** — tras *"Por eso conviene guardar el diario, no la foto."* añadir: *"(¿Y toda tabla del sistema merece un diario? Guarda esa pregunta: más adelante te tocará responderla por escrito — y decir «no» también será una respuesta profesional.)"* → hilo largo hacia S3; quita el tono de evangelismo ES [M5·P4]

**`los-primeros-hechos`** *(alta · 1)*
3. **predice** — antes de *"Esa secuencia ordenada de hechos tiene nombre: es un **Stream**."*: *"🔮 **Predice:** si mañana pasa algo real con la empresa pero nadie lo anota en esta lista… ¿qué sabrá tu sistema de eso?"* [M3·P1]

**`refactorizando-el-motor`** *(media — la más desalineada del oro · 4)*
4. **semilla** ⚠️deuda-v8 — la 🌱 que dice *"(lo llaman el Aggregate Handler Workflow); lo verás al conocer a Marten (`conoce-a-marten.md`, borrador anterior)"* (nombra a Marten + enlaza sección borrada) se reescribe: *"🌱 Este ciclo lo escribes a mano a propósito. «Cargar la historia → aplicar hecho por hecho» es tan universal que tarde o temprano algo lo hará por ti. Lo construyes ahora para que ese atajo, cuando un muro real lo reclame, no sea magia: sabrás qué hace por debajo, porque lo escribiste."* [brújula·M1/M5]
5. **semilla** ⚠️deuda-v8 — *"a la que el motor convergirá cuando adoptes Marten (`conoce-a-marten.md`, borrador anterior)…"* → *"🌱 Guarda eso sí la forma —un `Aplicar` por tipo—: la volverás a encontrar más adelante, con un enrutador seguro en vez de `dynamic`. Cuando la veas, recuerda que aquí ya decidiste por qué el enrutado en ejecución no te sirve."* [brújula·M5]
6. **semilla** — tras *"Y lo **escribiste tú** — por eso, cuando una librería te lo dé hecho, sabrás exactamente qué hace."* añadir: *"Pero mira cómo lo usas: la historia sigue siendo una `List<object>` pelada que armas a mano y le pasas al constructor. Cualquiera puede reordenarla o meterle basura antes de que llegue. Ese cabo suelto es el siguiente."* → repara la **costura débil →el-flujo-de-vida** [M1]
7. **micro-decisión** — extender la reflexión *"¿Qué ganó el `switch` frente al `if`?"* con: *"…y ¿qué habrías perdido si hubieras elegido el enrutado con `dynamic`?"* — que registre la decisión de mantenedor que ya tomó [M2·P6]

**`el-flujo-de-vida`** *(alta · 0 cambios — costura ejemplar hacia decidir-el-futuro)*

**`decidir-el-futuro`** *(alta · 2)*
8. **nav** ⚠️deuda-v8 — la semilla *"en El agregado de la plantilla (`el-agregado-de-la-plantilla.md`, borrador anterior)"* (borrada en v8) se repunta a *"[El agregado recuerda](secciones/el-agregado-recuerda.md)"* — la sección viva que HOY paga esa deuda [M5·P1]
9. **predice** — antes de *"El agregado es el **guardián de las reglas**, así que la defensa nace **dentro** de la `Empresa`…"*: *"🔮 **Predice:** tienes dos lugares para la guarda: `CambiarPlan` (decide) o el `switch Aplicar` (evolve). ¿Cuál eliges — y qué pasaría al REJUGAR una historia ya archivada si `Aplicar` pudiera rechazar un hecho?"* → primera pata del enriquecimiento **Apply puro** (insumo #4) [M3·P1/P4]

**`el-command-handler`** *(alta · 1)*
10. **semilla** ⚠️deuda-v8 — *"más adelante verás que **Wolverine hace todo eso por ti**…"* se des-nombra: *"más adelante una herramienta hará todo eso por ti: tú escribirás solo la decisión y ella pondrá el cargar y el guardar, y encontrará el handler por su tipo — la adoptarás el día que esta plomería repetida te duela de verdad."* [brújula·P6]

**`el-despachador`** *(media · 4 — todos deuda-v8)*
11. **semilla** — *"🌳 Cosecha — esto es lo que Wolverine hará por ti."* → *"🌳 Cosecha — construiste un mediador: Registrar (tabla tipo→handler) y Enviar (rutear por tipo). El día que una herramienta ofrezca hacerlos por ti, sabrás exactamente qué hace por dentro — y podrás juzgar si lo hace bien."* (quitar el mapeo Discovery/InvokeAsync y el link roto a revelar-wolverine.md) [M1·P6]
12. **semilla** — *"Ahí lo jubilamos: el despachador de verdad lo pone **Wolverine**."* → *"pero llegará un dolor con el que este Despachador sencillo deje de encajar; ese día lo jubilamos — y su reemplazo tendrá que ganarse el puesto."* (quitar también el calendario "cuando el motor se vuelva async, unas secciones adelante") [M1]
13. **tramo** — el checkbox *"Reconoces el mapeo: `Registrar` ≈ el discovery de Wolverine, `Enviar` ≈ `bus.InvokeAsync`"* → *"Explicas qué tendría que darte una herramienta para jubilar tu Despachador: armar la tabla sola (tu Registrar) y rutear por tipo (tu Enviar)."* [M1·P1]
14. **tramo** — el cierre *"…y es justo lo que Wolverine industrializará con discovery + InvokeAsync"* → *"— y el molde con el que, mucho más adelante, reconocerás a cualquier herramienta que ofrezca despachar por ti."* [M1·P6]

**`el-almacen-por-id`** *(media · 3 — todos deuda-v8)*
15. **nav** — quitar los links rotos *"(El swap (`el-swap.md`, borrador anterior))"* y *"(El almacén abstracto (`el-almacen-abstracto.md`, borrador anterior))"*, dejando la frase sin enlaces; la semilla (extraer `IEventStore`) se conserva — es el hilo hacia S2 [P6/P2]
16. **semilla** — *"Pero el almacén de verdad (el que adoptaremos) no te entrega un objeto así…"* → *"🌱 Este EventStream es un andamio. Sirve para ver el ciclo (cargar → escribir), pero míralo bien: ya no guarda nada, solo reenvía. Una pieza que solo reenvía es candidata a sobrar."* ("el que adoptaremos" adelanta la respuesta) [M1]
17. **nav** — *"Lo verás en Proyecciones (`proyecciones.md`, borrador anterior)"* (borrada) → *"Lo verás en [La vista de lectura](secciones/la-vista-de-lectura.md)"* [P3]

**`concurrencia-optimista`** *(alta · 1)*
18. **semilla** — extender *"pero lo has probado leyendo la consola con los ojos, y todo vive en RAM…"* con: *"— y el choque lo provocaste tú, a mano, con dos streams en secuencia. Nadie ha demostrado que con N escrituras de verdad en paralelo solo una gana; esa duda queda abierta —"* → ubica el enriquecimiento del insumo #3 como semilla (único tipo legal en oro); la paga S1 [P2/P5]

**`un-acto-dos-hechos`** *(alta · 1)*
19. **predice** — antes de *"La empresa **acaba de pagar** y aun así `Reactivar` la rechaza por deuda. ¿Por qué?"*: *"🔮 **Predice:** …¿qué mira `Reactivar` para decidir, y qué NO ha visto todavía?"* (el diagnóstico queda como confirmación) [M3·P1]

**`el-agregado-recuerda`** *(alta · 2)*
20. **injerto-reto** 🧪 — tras *"si no los quitara de la lista, el siguiente `Append` los reescribiría."* añadir un 2º 🔨: *"Comenta `case EmpresaReactivada:` en `Aplicar` y corre el arnés del pago. Nada explota — pero al recargar, `Suspendida=True`: el diario TIENE el hecho y el estado lo ignora en silencio. Un hecho sin rama en `Aplicar` es un huérfano: no revienta, miente. Restáuralo."* → el **evento huérfano** del insumo #4 [M8·P2]
21. **micro-decisión** — antes del 💭 de reflexión, que anote: *"`Aplicar` solo asigna estado: no valida, no mira el reloj ni genera ids — el replay lo re-ejecuta N veces y debe dar siempre lo mismo. Las reglas y los datos nuevos viven en los verbos, que corren UNA vez."* → patas 2-3 del **Apply puro** [M2·P1]

### Fase 2 · La persistencia

**`el-diario-en-disco`** *(alta · 2)*
22. **predice** — antes de *"¿Por qué? En RAM, cada sobre llevaba un objeto de C# que **sabía su propia clase**"*: *"🔮 Abre `datos/emp-7.log`: los datos están completos. Antes de seguir: ¿qué sabía cada hecho en RAM que estas líneas ya no dicen? Escribe tu hipótesis."* [M3·P2]
23. **micro-decisión** — antes del 💭: *"Rotulé cada hecho en disco con `GetType().Name`: el nombre de MI clase de C# quedó escrito dentro de la historia persistida."* (sin comentario — solo registrada; la problematiza la sección siguiente) [M2·P4]

**`el-nombre-es-un-contrato`** *(alta · 2)*
24. **semilla** — al final del 🌱 (*"…los de disco tendrán la forma vieja. Dolores para más adelante."*) añadir: *"Y un tercero, heredado del diario en disco: pagar-y-reactivar escribe DOS líneas, una por hecho — dos AppendAllText seguidos. ¿Qué pasa si el proceso muere entre la primera y la segunda?"* → repara la **costura débil →todo-o-nada** (hoy su dolor salta desde dos secciones atrás) [M1·P5]
25. **predice** — antes de *"Un `Dictionary` solo sabe buscar por su llave"*: *"🔮 Predice: al escribir tienes el TIPO del hecho y tu mapa va nombre→clase. ¿Cómo consigues el nombre estable? ¿Qué te toca hacer con el mapa?"* [M3·P1]

**`todo-o-nada`** *(alta · 2)*
26. **injerto-reto** 🧪 — tras *"No tuviste que escribir la verificación: la base la hace."* añadir **Prueba 3 — nacer dos veces**: dos `AbrirStream` de un `emp-9` virgen; ambos `Get()` (versión 0), ambos `Registrar`, ambos `Append` → el segundo choca en la versión 1 (23505): **el PK también protege el nacimiento del stream**. Cierre-pregunta: *"protege el ID del stream… ¿y si dos empresas DISTINTAS llegan con el mismo NIT bajo ids distintos?"* → siembra S4 [M8·P5]
27. **semilla** — tras *"Eso es lo que el archivo no podía darte."* añadir: *"Guarda la letra pequeña de esta garantía: el todo-o-nada cubre lo que viaja DENTRO de la transacción. El día que un acto, además de grabarse, tenga que avisarle a algo que vive FUERA de la base, esa letra pequeña va a doler."* → hilo largo a S10 [M5·P5]

### Fase 3 · El lado de lectura

**`la-vista-de-lectura`** *(alta · 2)*
28. **predice** — tras el SQL y antes del resultado *"Sale **mal**: incluye a `emp-3`…"*: *"🔮 Antes de correrlo: tú mismo sembraste emp-3 con suspensión Y reactivación. ¿Qué ids crees que devuelve este SELECT? ¿Aparece emp-3?"* [M3·P2]
29. **micro-decisión** — en 📓 Registra: *"«Actualizo la vista DENTRO del handler, justo tras el Append — y acepto que son dos escrituras separadas.» Escríbela en tu commit y anota qué riesgo aceptaste con ese «tras»."* → deuda explícita que S7 y S10 cobran [M2·P3/P5]

**`reconstruir-la-vista`** *(alta · 2)*
30. **predice** — antes del resultado vacío de *"Consultas las suspendidas con su plan:"*: *"🔮 La columna existe y Actualizar ya la escribe. Antes de consultar: ¿qué plan esperas ver en emp-2 y emp-4? Pista: ¿CUÁNDO corre Actualizar?"* [M3·P2]
31. **micro-decisión** — en 📓 Registra: *"«Reconstruir = borrar TODO y re-derivar del diario, no parchar las filas incompletas.» Anota el costo que aceptaste (mientras rejuega, la vista está vacía; y el proceso crece con la historia)."* → re-arma la semilla de escala que S7 cobra [M2·P3]

### Las costuras (transiciones entre secciones)

| Costura | Estado | Reparación |
|---|---|---|
| el-diario-de-una-empresa → los-primeros-hechos | 🟡 débil | cambio **1** |
| refactorizando-el-motor → el-flujo-de-vida | 🟡 débil | cambio **6** |
| el-nombre-es-un-contrato → todo-o-nada | 🟡 débil (el dolor salta 2 secciones) | cambio **24** |
| las otras 5 evaluadas | 🟢 fuertes | nada — no tocar |

---

## 4 · El guión reevaluado (panel de 4 guiones + 3 jueces adversariales)

> **Por qué se reevaluó.** El autor cuestionó dos supuestos de la primera versión de este plan: que
> §1-9 fuera piedra intocable (la directriz protegía el **método**, no el texto), y que todo lo nuevo
> fuera **después** de la sección 16 sin validar el guión completo. Se diseñaron **4 guiones
> independientes** con lentes opuestas (causalidad pura · evidencia temprana · mantenedor temprano ·
> mínimo movimiento — la vara de conservación) con libertad total de mover, partir e intercalar,
> incluido §1-9; y **3 jueces adversariales** (método · aprendiz · costo de obra) los atacaron.
> Crudos en scratchpad `plan-obra/panel.json`.

**Lo que la reevaluación confirmó (re-derivado, ya no por decreto):**
- **El orden de §1-9 y el trifásico sobrevivieron en los 4 guiones** — incluida la lente que partió de
  cero ignorando el path actual. Quedan **validados**: se pueden tocar (y se tocan: injertos, semillas,
  un beat nuevo), pero no hay ganancia en moverlos.
- Las costuras fuertes ya diagnosticadas no las rompió ningún guión ganador.

**Lo que la reevaluación tumbó:**
- **"Todo lo nuevo va después de la 16" — falso.** Los 4 guiones movieron **S1 (testing) a la posición
  12**, entre `el-agregado-recuerda` y `el-diario-en-disco`: el arnés nace al cerrar el motor RAM
  (donde nace la primera mentira posible — el huérfano que "no revienta, miente") y acompaña TODO lo
  demás: cada choque posterior se vuelve un test rojo, no una anécdota de consola. P2 deja de ser una
  sección y se vuelve el medio del taller.
- **S7 iba sobrecargada** (5 piezas en una ficha): se parte en **S7a** (el proyector se independiza:
  updater + checkpoint) y **S7b** (la vista va atrás: rezago → 📟 PANEL 1).
- **S8 ya no finge la reentrega**: su dolor nace del **crash real** del updater de S7a (muere entre
  aplicar y guardar el checkpoint → re-aplica al revivir). At-least-once de verdad con un solo proceso:
  la sentibilidad sube de parcial a entera.
- **E2 estaba huérfana** (los jueces lo marcaron 3 veces): se fija — **E2 (invariante de saldo) nace
  dentro de S2**, y queda viva para S7b y S8.
- **`DECISIONES.md` desde §2** (aporte del guión "mantenedor", rescatado por 2 jueces): un archivo que
  el alumno abre en `los-primeros-hechos` y alimenta con cada 📓 micro-decisión — el hogar del relevo
  dolor→criterio desde la primera sección de código. Costo: un beat, cero código.
- **La siembra de S11 cambia de lugar**: sembrarla en el store RAM muere en el swap (código muerto), y
  sembrarla 2 secciones antes del cobro mata la amnesia. Se siembra **en el swap** (la línea real del
  caso de la auditoría: `EventAppendMode.Rich`) y se cobra en **la plantilla** — brecha larga y línea
  que sobrevive.

### El guión sintetizado (chasis: "evidencia desde temprano", ganador 3/3 jueces)

| # | Estación | Estado | Nota |
|---|---|---|---|
| 1-10 | `el-diario` … `un-acto-dos-hechos` | igual | los 31 cambios ya definidos (§3) + beat `DECISIONES.md` en §2 |
| 11 | `el-agregado-recuerda` | modificada | injerto 20 (huérfano) + cierre nuevo: *"nada explotó y tus ojos no lo vieron — ¿qué lo habría visto?"* → semilla directa de S1 |
| 12 | **S1 · verde-y-roto** | nueva ⬆️ | núcleo Given-When-Then sobre el motor RAM completo; el beat de rebuild-con-guard se difiere a la 17 |
| 13 | `el-diario-en-disco` | movida-de-predecesor | cuerpo intacto; S1 cierra con *"nada prueba que el diario sobreviva al reinicio"* — re-siembra el dolor que §11 ya plantó |
| 14 | `el-nombre-es-un-contrato` | modificada | + injerto 🧪: el rename se fija como **test de caracterización** (siembra la forma de ayer, exige el mismo estado) |
| 15 | `todo-o-nada` | modificada | Prueba 3 (cambio 26) queda **en consola** — no cargar la frontera Postgres con la primera fixture xUnit (falla señalada por el juez-aprendiz); fijarla como test se decide al vivir la 16 |
| 16 | `la-vista-de-lectura` | igual | recap-frontera ajustado; sus arneses ya usan el estilo S1 |
| 17 | `reconstruir-la-vista` | modificada | absorbe el beat de S1: **test de rebuild con guard "no puede estar vacía"** (el verde vacuo) 🧪 |
| 18 | **S3 · ¿merecía ES?** | nueva | nace **E1** (catálogo `Plan` plano). ⚠️ **Recorte declarado**: la pata "sufre el rezago en el primer test" NO existe aún (no hay updater) — se difiere como **callback en S7b** (*"y ahora súmale: tu catálogo también va atrás"*). Ver decisión abierta ⬇️ |
| 19 | **S2 · el puerto propio** | nueva | nace **E2** adentro (pedida por el negocio). La "suite lenta" se cobra por **acumulación real** (tests de S1 + caracterización + catálogo), no por decreto |
| 20 | **S4 · clave duplicada** | nueva | cobra la pregunta de la Prueba 3 (dos NIT, ids distintos); usa E1 para la siembra idempotente |
| 21 | **S5 · la forma del hecho** | nueva | cobra la semilla de la 14 |
| 22 | **S6 · la vista por consulta** | nueva | decide **E3** con el spike en la mano |
| 23 | **S7a · el proyector se independiza** | nueva (split) | updater + checkpoint a mano |
| 24 | **S7b · la vista va atrás** | nueva (split) | 📟 **PANEL 1: rezago** — nace el monitor (sin nombre) + callback de S3 |
| 25 | **S8 · el mismo hecho dos veces** | nueva | 📟 PANEL 2 — reentrega REAL: el crash del checkpoint de S7a |
| 26 | **S9 · el default silencioso** | nueva | 📟 PANEL 4 — E4 |
| 27 | **S10 · el hecho y su anuncio** | nueva | E5; extiende la deuda de la 15 |
| 28 | **el swap — por reconocimiento** | rumbo | 📟 PANEL 5 (salud de config) + **siembra S11** (la línea `Rich`, sin comentar) + **cobra la ASINCRONÍA de código**: la API de la librería es async-only (`SaveChangesAsync`, `AggregateStreamAsync`) → el `Handle` síncrono no encaja → **se paga la jubilación del Despachador** sembrada en la 7 |
| 29 | **el host y las dependencias (DI)** | rumbo | el cableado a mano ya son veinte `new` (updater, stores, monitor, handlers) → **infierno de los new**, sembrado en la 7 → nace el host con contenedor: **inyección de dependencias**, tiempos de vida (**Scoped vs Singleton** — la sesión que lee ≠ la que escribe: el bug L2 real de la librería), endpoint mínimo (el 202 de S7b y el 422 del criterio de concurrencia por fin tienen dónde vivir) |
| 30 | **observar el motor nuevo** | rumbo | 📟 PANEL 3 (flujo / longitud de streams) |
| 31 | **S11 · el comentario que sobrevive** | nueva | **cobro**: "simplifica lo que sobre" → el bug vuelve → handoff |
| 32 | **la plantilla** (Bloque I) | rumbo | construirla, **operarla y administrarla** (runbook, tests que blindan, el monitor apuntándole) — la plantilla real ES extensiones de DI (`AgregarConfiguracionMarten…`): sin la 29, esta estación sería magia |
| 33 | **capstone `FetchForWriting`** | rumbo | paga la deuda plantada en §9 y **sentida** en S2 — cierra P5+P6 |

**Hilos largos (el molde FetchForWriting, replicado):** ① versión esperada: §9 → S2 (el puerto no tiene
dónde decirla) → capstone. ② la línea rara: swap → plantilla (S11). ③ el dual-write: 15 → 16 (📓) → S10.
④ **la jubilación del Despachador**: sembrada en la 7 ("llegará un dolor con el que deje de encajar") →
pagada en el swap (28), cuando el mundo se vuelve async. ⑤ **el infierno de los `new`**: sembrado en la 7
→ pagado en el host (29) con DI.

**Asincronía y DI — dónde viven (nota de cobertura):** la asincronía tiene DOS caras y cada una tiene su
estación: la **de sistema** (la vista va detrás del diario, consistencia eventual, rezago) se vive a mano
en S7a/S7b — es el corazón del monitor; la **de código** (`async`/`await`, `Task`, handlers async) se
cobra en el swap (28), donde la API de la librería la vuelve inevitable — no antes, porque el motor a
mano síncrono no la necesita y meterla temprano sería ceremonia sin dolor. La **DI** se siembra en la 7
(el germen de los `new`) y se cobra en el host (29), justo antes de la plantilla — porque la plantilla
real (`Cosmos.BuildingBlocks`) es, en su superficie, pura extensión de DI, y operarla exige entender
contenedor y tiempos de vida (el bug real L2 de la auditoría es un bug de sesiones/lifetimes).

**✅ Decisión tomada (autor, jul 2026):** S3 va en la **18 con recorte declarado** — la pata "sufre el
rezago en el primer test" no se finge (no hay updater aún): se declara y se cobra como **callback en
S7b** (*"y ahora súmale: tu catálogo también va atrás"*). Se descartó la alternativa post-S7b/S8
(sentible completa pero rompía E1 para S4/S6).

**Criterio declarado (sin sección propia, sin cambios):** insumo #14 (solo viaja su test de
configuración) y las mitades no-sentibles de #7/#9/#12/#13, pegadas a donde se sintió la mitad sentible.

---

## 5 · Orden de la obra (fases de aplicación)

| Obra | Qué | Cambios | Estado |
|---|---|---|---|
| **0 · Deuda v8** | des-nombrar Marten/Wolverine + repuntar/quitar links a secciones borradas | **4, 5, 8, 10, 11, 12, 13, 14, 15, 16, 17** (11) | ✅ **APLICADA** (validador 0 err; avisos 42→35 por links reparados; cero nombres de herramienta prematuros). |
| **1 · Costuras** | reparar las 3 transiciones débiles | **1, 6, 24** (3) | ✅ **APLICADA**. |
| **2 · Espina** | predices (M3), micro-decisiones (M2), hilos largos (M5) + beat `DECISIONES.md` en §2 | **2, 3, 7, 9, 18, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31** (15) | ✅ **APLICADA**. |
| **3 · Injertos** 🧪 | los 2 retos nuevos que tocan código | **20, 26** (2) | ✅ **APLICADA y spike-verificada en verde**: huérfano sobre store RAM (normal `Suspendida=False` vs huérfana `Suspendida=True`, hecho en diario, sin explotar); Prueba 3 sobre Postgres real (2º nacimiento → `ConcurrencyException`, emp-9 con 1 fila). Spikes: `scratchpad/spike-huerfano`, `spike-pg-amano`. |
| **4 · Secciones nuevas** | según el guión reevaluado (§4): **la próxima es S1, insertada en la posición 12** (+ costuras §11↔S1↔§13), no al final | — | ⏳ **Pendiente**. Una a la vez, vivida (spike → choque → redacción → `revisar-seccion` → PARAR). El spike de S1 ya existe (`spike-huerfano` demuestra el verde-decorativo). ⚠️ El cierre con el arnés de 3 lentes necesita subagentes (bloqueados por el límite de gasto de la org). |

Tras cada obra: `bash tools/validate-workshop.sh workshop-event-sourcing` en 0 errores. Las obras 0-2 no
ameritan el battery completo; la 3 introduce código y se **spike-verificó** (hecho). Las secciones nuevas
(obra 4) sí requieren el `revisar-seccion` completo antes de darse por cerradas.

---

## 6 · Actualizaciones a los documentos de orientación

- **`CRITTERWATCH-BRUJULA.md`**: añadir los principios P1-P6 como "la espina declarada" (el relevo
  dolor→criterio dicho en voz alta — M2) y el mapa de paneles del §2 de este plan. El resto queda igual.
- **`MAPA.md` / `NARRATIVA.md` / `taller.md`**: los mantiene el autor; cuando se apliquen las obras 0-3
  no cambian (los cambios son internos a las secciones). Al nacer cada sección nueva, se registran como
  hasta ahora.
- **`PLAN-SECCIONES-DESDE-INSUMOS.md`**: sigue siendo la fuente de las fichas S1-S11 y las dependencias
  E1-E6; este plan lo referencia, no lo reemplaza.

---

## 7 · Lo que este plan deliberadamente NO hace

- **No renombra nada.** El barrido lo permitía y ningún par lo pidió: los nombres actuales ya dicen el
  dolor. Renombrar por renombrar es churn.
- **No trata §1-9 como piedra.** La directriz protegía el **método**, no el texto. La reevaluación de §4
  lo puso a prueba con libertad total — y el orden sobrevivió por re-derivación, no por decreto. Se
  toca donde el guión lo pide (injertos 20/26, beat `DECISIONES.md` en §2, cierre nuevo en §11).
- **No reescribe cuerpos enteros.** Los cambios sobre lo existente son semillas, predices,
  micro-decisiones, navs, 3 injertos-reto y 2 beats — el diagnóstico era de costuras y encuadre, no de
  contenido.
- **No trata el guión de §4 como espina rígida.** Es el orden **validado** (panel + jueces), pero la
  regla de la brújula sigue por encima: si al vivir una sección el dolor real apunta a otro lado, manda
  el dolor. Y la decisión abierta (posición de S3) es del autor.
- **No genera las S en lote.** La regla sigue: spike → choque → redacción → arnés → PARAR.
