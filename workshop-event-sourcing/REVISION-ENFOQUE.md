# 🔍 Revisión de enfoque — diagnóstico + registro de validaciones

> Documento vivo. Tiene dos partes: **(A)** el diagnóstico base del quiebre de enfoque desde §10 (2026-07-15), y **(B)** el **registro de validaciones por sección** — cada vez que se construye/edita una sección, se valida y se deja evidencia aquí abajo.

---

## 📋 Protocolo de validación por sección

Cada vez que Didier termina o modifica una sección, se valida contra **el workshop que se esté aplicando** con estos tres criterios (los tres deben pasar):

**1. ¿Hay guía?** (método hands-on)
- ¿Hay un **reto** ("te reto a construir X") seguido de la revelación en `<details>`?
- El idioma nuevo (C#/infra que sería demasiado inventar) se **muestra** — pero rotulado como excepción declarada ("esto se muestra, no se reta"), no colado sin aviso.
- El lector puede intentarlo **antes** de ver la solución.

**2. ¿No queda ningún concepto suelto?**
- Cada término/símbolo/tipo nuevo se explica en contexto o se enlaza al `GLOSARIO`.
- Las semillas / forward-refs **cierran** o quedan registradas conscientemente (no IOUs dispersos).
- Los **dolores** abiertos en secciones previas se cobran (no regresiones silenciosas).
- Los links de navegación (`➡️`/`⬅️`) resuelven.

**3. ¿Sirve al propósito principal?** (el norte v7)
- Mueve el **hilo conductor** (la Empresa) — no se va a un ejemplo desechable.
- Introduce **por necesidad** (naive → dolor → refactor → nombre), no "porque toca".
- Aporta al norte: *entender/usar/mantener/extender `Cosmos.BuildingBlocks` con criterio* (construir la magia antes de adoptarla).
- No **adelanta el clímax** (no nombra la plantilla antes del capstone).

**Salida:** cada validación deja una entrada en la sección **(B) Registro** con veredicto por criterio (✅/🟡/🔴), evidencia concreta (archivo + frase/línea) y acciones sugeridas. **Disparador:** cuando Didier diga que terminó una sección (o la señale/pegue), corro esta validación y anoto aquí.

---

# (A) Diagnóstico base — ¿por qué se siente que pierde foco desde §10?

> Análisis crítico de la narrativa/enfoque de las secciones **9→14**. Verificado contra los archivos reales (`secciones/`) y los documentos de diseño (`MAPA`, `NARRATIVA`, `METODO`, `REPLANTEO`). Fecha: 2026-07-15.

## Tesis (dónde está el quiebre real)

El enfoque **no se rompe en §10**, sino que **§10 es el umbral y §11 (`conoce-a-marten`) es donde se cae.** Hasta §9 el taller es *"la biografía de la Empresa construida por ti"*: cada sección añade una capacidad al motor y nace del dolor de la anterior. Desde §10 ninguna sección vuelve a mover a la Empresa **como negocio** — §10 pone tests alrededor, §11 conoce una herramienta, §13 pone tests de integración, §14 mete una abstracción. El género cambia de *"construyo Event Sourcing"* a *"cableo la infraestructura alrededor del motor"*.

El punto exacto de fractura es **§11**, donde convergen **tres rupturas a la vez**:

1. **Se abandona el ejemplo único.** Marten se demuestra con una `Nota` desechable — el texto dice literal *"Usa una `Nota` simple para el experimento —no tu `Empresa`"*. El hilo conductor se suelta justo donde el lector más necesita continuidad.
2. **Se invierte el método.** Dato duro: §11 tiene **0 retos `<details>`**, cuando §10 tiene 4, §14 tiene 3 y §12 tiene 2. Pasa de *RETA→intenta→revela* a *copia esta config / míralo* (docker-compose, `DocumentStore`, `Nota`).
3. **El dolor se cuenta, no se siente.** §11 muestra el `switch(type)` de deserialización y dice *"no lo escribas —es justo lo que Marten te ahorrará"*. El "muro tocable" que el propio `REPLANTEO.md` pedía (que el lector escriba el INSERT + `switch` a mano y lo sufra en `psql`) no existe. Se rompe el principio "levanta la magia construyendo la mini-versión antes de adoptarla".

Debajo hay una **decisión estructural**: se revela Marten sobre un motor que **aún no ha convergido** a su forma de producción (sigue con `decide`-devuelve-hecho, sin acumulador `Raise`, sin `Version` en el agregado, sin Unit of Work). Por eso §12 y §14 tienen que aplazar la convergencia canónica como una **cascada de IOUs** ("lo adoptas con la plantilla más adelante"), y el lector cierra §14 arrastrando más promesas que certezas.

## Tabla por sección (9–14)

| Sec | Qué funciona | Dónde se debilita el enfoque | Sev. |
|-----|--------------|------------------------------|------|
| **9 · concurrencia-optimista** | Método impecable: dolor (*lost update*) → sobre `EventoAlmacenado`+versión → nombre. Empresa 100% al centro. Es el "antes" sano. | Solo un cabo sano sembrado: "en producción no lo escribes a mano". | 🟢 |
| **10 · given-when-then** | Dolor real ("probar a ojo no avisa"), refactor Given→When→Then paso a paso, cada uno verde. Prepara el swap. | **Primer género "meta":** la Empresa no gana comportamiento; se aprende xUnit/base `abstract`/`params`/AwesomeAssertions. Es el **umbral** donde empieza el "tour de herramientas". | 🟡 |
| **11 · conoce-a-marten** | El giro (*un evento **es** un documento*) es potente y bien contado; la tabla fila-vs-hecho es nítida. | **La fractura.** Abandona la Empresa (`Nota`), invierte el método (**0 retos**), cuenta el dolor en vez de hacerlo sentir, mete Docker+Marten+JSONB+`async/await` de golpe. El `await` entra "porque toca" (*"todavía no cambia nada que notes"*). | 🔴 |
| **12 · el-swap** | Vuelve la Empresa y el hands-on (2 retos). Mapeo casero→Marten explícito y honesto; buen `[!WARNING]` del lock-in. | Swap sobre motor **no convergido** → no es 1:1 con la plantilla. **Suelta la concurrencia de §9** ("un escritor por stream") — se siente regresión. Mucha API Marten seguida. | 🟡 |
| **13 · tests-de-integracion** | Cobra la promesa de §10: los mismos escenarios validan el swap cambiando "solo la base". Honesto sobre el precio. | La Empresa no se mueve; andamiaje otra vez. **Copia-config densa** (`MartenFixture`, `IAsyncLifetime`, `ResetAllData`, esquema `test`) — poco construible. | 🟡 |
| **14 · el-almacen-abstracto** | Recupera el método (dolor→`IEventStore`→`TestStore`, 3 retos). Cierra la pirámide de pruebas. | **Nombra `Cosmos.BuildingBlocks`** por primera vez (gasta el clímax del capstone). Deja una **pila de IOUs** (`Raise`, `UncommittedEvents`, `UnitOfWorkMiddleware`, `Version`-al-agregado, `FetchForWriting`, proyecciones). Motor queda "medio-canónico". | 🟡 |

## Patrones transversales

1. **La Empresa deja de moverse.** Desde §10, 4 de 5 secciones son andamiaje; ninguna añade comportamiento de negocio. La última decisión de la Empresa fue §5.
2. **El método se invierte donde entra herramienta externa.** Correlación exacta: §11 y §13 (Docker/Marten/fixtures) = copia-config; §12 y §14 (tu código) = conservan el reto. Medible en el conteo de `<details>`.
3. **Dolor contado, no sentido** (§11): se muestra el `switch(type)` con un "no lo escribas", sin el muro tocable que pedía el REPLANTEO.
4. **Cascada de "lo adoptas más adelante":** concurrencia/`FetchForWriting` (×3), acumulador/`Raise`, UoW, `StartStream`, `Version`, proyecciones. Más promesas colgando que arcos cerrados.
5. **Se revela antes de converger** (raíz estructural). `METODO.md` §6-4b y `NARRATIVA.md` exigen converger a la forma de producción **antes** del reveal (para que el swap sea 1:1); lo construido sigue `REPLANTEO.md` v7 (revelar simple, converger al final). **Es una contradicción entre tus propios documentos de diseño.**

## Recomendaciones priorizadas

Distingo **NARRATIVA** (re-contar sin mover), **ORDEN** (mover), **ALCANCE** (partir/añadir/quitar).

**P1 · NARRATIVA — mantener el hilo de la Empresa en §11.** (alto impacto, bajo costo)
Sustituir la `Nota` desechable por algo atado a la Empresa (una nota/un mini read-model de la Empresa). Es la fuga más visible del hilo conductor; elimina el "aquí ya no hablamos de tu empresa".

**P2 · ALCANCE — partir §11.** (a) "El muro" **tocable** (el lector escribe INSERT + `switch(type)` contra Postgres y lo sufre); (b) "Marten guarda documentos" (Docker + JSONB + el giro); mover `async/await` al swap, donde el `await` sea real. Baja la carga de golpe, restaura el dolor-sentido y el hands-on. (El REPLANTEO v7 ya planeaba Marten repartido, no en una sola sección.)

**P3 · NARRATIVA — rotular "se muestra, no se reta".** En §11/§13, marcar los bloques de config como *"idioma/infra nuevo → se muestra"* (la excepción declarada del método), para que el lector sepa que no dejó de construir por descuido sino por regla. Costo casi nulo.

**P4 · ORDEN/ALCANCE — resolver converger-antes-vs-después** (la decisión de fondo):
- **Opción A (fiel a METODO/NARRATIVA):** insertar convergencia (acumulador `Raise`, `Version` al agregado, store-directo/UoW) **entre §10 y el reveal**, para que el swap sea 1:1 y §14 casi no prometa nada. Costo: +2-3 secciones antes de Marten (retrasa el premio de la BD real).
- **Opción B (aceptar el diferido v7, ya):** al cierre de §14, una mini "estado del motor" que **agrupe y nombre** el "todavía-falta" (concurrencia, `Raise`, UoW, proyecciones) como roadmap consciente, en vez de semillas dispersas.
- **Recomendación:** hacer **B ya** (barato, quita la sensación de cabos sueltos) y evaluar **A** si el norte es fidelidad al método.

**P5 · NARRATIVA — no nombrar `Cosmos.BuildingBlocks` en §14.** Mantenerlo implícito ("las piezas que una librería madura trae hechas") hasta el capstone; nombrarlo tan pronto gasta el clímax final.

**P6 · NARRATIVA — reencuadrar la pérdida de concurrencia en §12** como decisión de ingeniería con fecha de recobro explícita (no "quedó fuera", que suena a regresión).

**P7 · Higiene — re-sincronizar `NARRATIVA.md`.** Hoy narra un arco **distinto** al construido (su §9 es async, §11 Docker, etc.), mientras `MAPA.md` sí coincide con las 14 reales. Quien use NARRATIVA como norte se desengancha. Marcarla "arco previsto v6 — ver REPLANTEO v7" o reescribirla. (Nota: el `➡️` de §14 a `proyecciones.md` **sí resuelve** — el archivo existe; lo que falta es actualizar el MAPA, que aún lista proyecciones como "planeada".)

## Qué NO tocar

**El testing se queda en §10.** Given-When-Then está bien *antes* de Marten porque §13 lo cobra (los mismos escenarios validan el swap): es andamiaje deliberado, no un desvío. El problema no es la posición de §10 sino que es el **umbral de género** y **§11 lo rompe**. A lo sumo, aligerar §10 partiéndolo en "probar el motor crudo" + "destilar Given-When-Then".

---

### Resumen en una línea
No pierdes el enfoque por el testing (§10); lo pierdes en **§11**, donde a la vez sueltas el ejemplo, cambias el método a copia-config y cuentas el dolor en vez de hacerlo sentir — todo porque revelas Marten antes de converger el motor. Arreglar §11 (P1+P2) recupera el 80% del enfoque.

---

# (B) Registro de validaciones por sección

> Cada entrada = una validación con el [protocolo](#-protocolo-de-validación-por-sección). Formato: fecha · sección · veredicto por criterio · evidencia · acciones. Las 🟡/🔴 son deuda pendiente.

**Estado heredado del diagnóstico base (A), al 2026-07-15:**

| Sec | Guía | Sin conceptos sueltos | Sirve al propósito | Global |
|-----|------|----------------------|--------------------|--------|
| 9 · concurrencia-optimista | ✅ | ✅ | ✅ | ✅ |
| 10 · given-when-then | ✅ | ✅ | 🟡 (umbral "meta") | 🟡 |
| 11 · conoce-a-marten | 🔴 (0 retos) | 🟡 (dolor contado) | 🔴 (`Nota` ≠ Empresa) | 🔴 |
| 12 · el-swap | ✅ | 🟡 (suelta concurrencia §9) | 🟡 (motor no convergido) | 🟡 |
| 13 · tests-de-integracion | 🟡 (copia-config) | ✅ | 🟡 (andamiaje) | 🟡 |
| 14 · el-almacen-abstracto | ✅ | 🟡 (pila de IOUs) | 🟡 (nombra la plantilla) | 🟡 |

**Plantilla de entrada (copiar para cada nueva validación):**

```
### [YYYY-MM-DD] §N · nombre-seccion — veredicto: ✅/🟡/🔴
- **Guía:** <hallazgo + evidencia (archivo/línea/frase)>
- **Conceptos sueltos:** <términos sin explicar, semillas sin cerrar, links rotos, dolores no cobrados>
- **Propósito:** <mueve la Empresa? necesidad vs "porque toca"? aporta al norte? adelanta el clímax?>
- **Acciones:** <cambios sugeridos, clasificados NARRATIVA / ORDEN / ALCANCE>
```

<!-- NUEVAS VALIDACIONES DEBAJO DE ESTA LÍNEA -->

