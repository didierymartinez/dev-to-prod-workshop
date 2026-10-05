# 🔭 Plan — la Lente: el alumno construye su observador a lo largo del taller

> **Qué cambia.** Hasta hoy el observador era algo que *se le da* al alumno (`SECUENCIA.md`, hilo "El monitor") o algo que *nosotros* construimos (`APP-MONITOR-PLAN.md`, "el alumno no construye el monitor"). Este plan lo invierte: **el alumno construye la Lente**, panel a panel, en la sección donde nace cada concepto.
>
> **La Lente es la herramienta de producción.** No se adopta CritterWatch: lo que se construye en el taller es el **núcleo** de la herramienta que observa los sistemas reales (`cosmos-trace` / CosmosLens). El taller no termina en "reconoce el producto", sino en **"tu código corre en producción"**: el alumno aporta paneles e invariantes a la herramienta del equipo. Cierra el arco *usar → mantener → aportar*. CritterWatch queda solo como referencia de diseño (qué paneles tiene un observador de la Critter Stack).
>
> **Sustituye** el hilo "El monitor" de `SECUENCIA.md` y las secciones del alumno en `APP-MONITOR-PLAN.md` (que siguen valiendo para el producto `cosmos-trace`/CosmosLens).
> **Responde a** `REVISION-PEDAGOGICA.md` §2 (cómo comprobar que aprenden) y §8.2 (falta la traza).

---

## 1. Para qué sirve la Lente: los tres usos

| Uso | Qué hace la Lente | Ejemplo |
|---|---|---|
| **Entendimiento** | Hace visible lo invisible: versiones, rezago, el sobre de cada hecho, quién causó qué. | "Predice qué fila aparece en la Lente cuando suspendas `emp-7`." |
| **Monitoreo** | El mismo binario se apunta a un sistema real del Application Plane, en modo solo lectura. | El rezago de las proyecciones de Contabilidad; dead letters de hoy. |
| **Aprendizaje** | `lente verificar`: chequea **invariantes** sobre la base del alumno. Cada invariante es a la vez evidencia de aprendizaje y una alerta de producción. | "Versiones contiguas por stream", "ningún hecho en el tenant `*DEFAULT*`". |

**La idea que une los tres:** *una invariante = un test de aprendizaje = una alerta de producción.* Lo que el alumno demuestra que entiende es exactamente lo que después vigila en un sistema real.

---

## 2. Decisiones de diseño

1. **El alumno construye la Lente en .NET; nunca escribe React.** Arranca como **consola** (`dotnet run -- stream emp-7`). En §33 se vuelve **web mínima** (minimal API + HTML generado en el servidor). En §34 pasa a **en vivo** con SSE. Lo que el alumno escribe (fuentes, consultas, invariantes) vive en una biblioteca **`CosmosTrace.Core`**; la consola, la web del taller y la app de producción son solo cascarones sobre ese núcleo (ver §5).
2. **Agentless y solo lectura desde el día 1.** La Lente es un proyecto aparte que **no referencia el dominio**: solo SQL, con un rol `lente` que solo tiene `SELECT`. Enseña dos fronteras: observar no muta, y el observador no conoce tus tipos.
3. **La Lente depende de los nombres estables.** Lee `tipo` como texto. Es el cobro natural de §14 *El nombre es un contrato*: si renombras una clase sin nombre estable, la Lente lo delata.
4. **Dos fuentes, una interfaz que nace en el swap.** En la era 1 la Lente lee las tablas del alumno (`eventos`, `checkpoint`, `proyeccion_fallos`, `bandeja_salida`). En la era 2 lee las tablas de Marten y de Wolverine. La interfaz `IFuente` nace en §29, cuando llega la segunda implementación (regla B4: "el nombre cuando gana su sueldo").
5. **El flujo necesita metadatos, construidos a mano primero.** Cada hecho y cada anuncio llevan `correlacion` (la conversación entera) y `causa` (quién lo provocó directamente). Nacen a mano, se reconocen en Marten y Wolverine, y las trazas OpenTelemetry cubren lo que la base no conserva.
6. **La vista de trazas no se reconstruye.** Se usa el **dashboard de Aspire en modo standalone** (un contenedor, receptor OTLP) como visor de trazas. La Lente aporta la vista *de event sourcing*; el id de correlación une las dos.
7. **Cada incremento es corto (10-20 min) y reemplaza un paso actual**, no se suma encima. Los "haz un `SELECT` y mira" de hoy se vuelven "míralo en la Lente". Costo neto estimado: **+3 a 4 h** sobre el taller.
8. **Protocolo de predicción en cada 🔨:** *"🔮 predice qué mostrará la Lente → ▶️ hazlo → 🔭 compara."*

---

## 3. La Lente sección por sección

Numeración actual de `SECUENCIA.md`. 🆕 = sección nueva · ✏️ = sección modificada.

### Era 0 · sin base de datos (§1-14): no hay Lente
Antes de Postgres no hay nada que observar desde fuera. **Una sola siembra**: en §14, el 🌱 anuncia que *"un observador externo solo verá el nombre estable, nunca tu clase"*.

### Era 1 · esquema a mano (§15-28)

| § | Sección | Incremento de la Lente | Invariante para `lente verificar` |
|---|---|---|---|
| 15 ✏️ | Todo o nada | (Solo se parte la sección, ver revisión §3.4.) Se crea el rol `lente` con `GRANT SELECT`. | — |
| **15b 🆕** | **La lente** | **Dolor:** para saber qué le pasó a `emp-7` escribes un `SELECT` cada vez, y el JSONB no se lee. **Construyes:** el proyecto `Lente` (consola), conexión solo lectura, comando `stream <id>`: línea de tiempo con versión, tipo y datos legibles. | Versiones **contiguas** por stream (1..N, sin huecos). |
| 16-17 ✏️ | Vista de lectura / Reconstruir | Panel **diario vs vista**: estado rejugado del diario junto a la fila de la vista. La divergencia **se ve**, y es la evidencia que motiva `Reconstruir`. | La vista coincide con el rejugado. |
| 18-19 ✏️ | Proyector / Rezago | Panel **rezago** (`frente − checkpoint`) con `--watch`. El `Rezago()` de §19 se muda a la Lente. | `checkpoint ≤ frente`. |
| 20 ✏️ | El proyector tropieza | Panel **fallos**. **Nuevo dolor:** *"¿quién escribió este hecho venenoso, y desde qué comando?"*. No se puede responder. **El sobre gana metadatos:** `cuando`, `causa`, `correlacion`. La Lente los muestra por hecho. | Todo hecho nuevo tiene `correlacion`. Los fallos tienen rastro. |
| 23 ✏️ | Dos streams, misma clave | Comando `nit <nit>`: buscar el stream por el `localizador`. | NIT único. |
| 24 ✏️ | La forma se congela | Panel **formas del hecho**: conteo por `tipo` y forma (con/sin `Nit`). Un mantenedor necesita ver cuántos hechos viejos siguen en disco. | — |
| 25 ✏️ | La vista por consulta | El panel de rezago se generaliza a **N vistas** (una fila por checkpoint): el catálogo de proyecciones. | Todas las vistas `checkpoint ≤ frente`. |
| 26 ✏️ | El hecho y su anuncio | Panel **bandeja de salida**: pendientes y edad del más viejo. El anuncio **hereda** la `correlacion` del hecho y pone el hecho como `causa`. | Ningún anuncio pendiente más viejo que N s. |
| 27 ✏️ | El evento público | **Al dominio se le añade:** Facturación, al recibir `EmpresaSuspendidaV1`, **escribe su propio hecho** (p. ej. `CobroDetenido`) con la misma correlación. Sin ese segundo salto no hay flujo que visualizar. | — |
| 28 ✏️ | El mensaje y la cola | Panel **cola**: reclamados y pendientes. | — |
| **28b 🆕** | **El flujo de un mensaje** | **Dolor:** "Suspendí `emp-7`: ¿Facturación se enteró? ¿Qué hizo?". La respuesta está repartida en cuatro tablas. **Construyes:** `lente flujo <correlacion>`, un **árbol** comando → hecho → anuncio → consumo → hecho, ordenado por `causa`. **Y el mapa estático** `lente rutas`, que lee la tabla tipo→handler de tu `Despachador` (§7) y las suscripciones del consumidor. **Es el panel central de la herramienta.** | Todo anuncio entregado tiene un consumo con la misma correlación. |

### Era 2 · Marten + Wolverine (§29-39)

| § | Sección | Incremento de la Lente | Invariante |
|---|---|---|---|
| 29 ✏️ | El swap | **La Lente cambia de fuente.** Nace `IFuente` con `FuenteArtesanal` y `FuenteMarten`. **El reto central:** mapear cada columna de tus tablas a las de Marten (`eventos` → `mt_events`, `version`, `tipo` → el alias del tipo, `correlacion` → metadato de Marten…). Ese mapa **es** el inventario "se borra / se conserva" que pedía la revisión. Se activan los metadatos de correlación/causación de Marten. | Las mismas de la era 1, ahora sobre `mt_*`. |
| 30-31 ✏️ | Outbox / Llegó dos veces | El panel bandeja lee las tablas de envelopes de Wolverine. El panel flujo usa la correlación del envelope. Panel **reentregas**: intentos por mensaje. | Ningún envelope saliente atascado. |
| 32 ✏️ | El daemon | El panel de rezago lee la tabla de progreso del daemon. Los fallos de proyección leen los dead letters de Marten. | `progreso ≤ high-water` por proyección. |
| 33 ✏️ | El host | **La Lente se vuelve web** (minimal API + HTML). Se añade **OpenTelemetry**, que exporta al dashboard de Aspire standalone. Desde el árbol de flujo, un enlace por correlación abre la traza. | — |
| 34 ✏️ | En vivo y serverless | **La Lente en vivo:** SSE empuja hechos nuevos al navegador. Reemplaza el "tablero de Operaciones" hipotético: el dolor ahora es real, porque tu Lente necesita refrescar sola. | — |
| 35 ✏️ | Multi-tenancy | Filtro por tenant en todos los paneles. **Primera alerta:** hechos en `*DEFAULT*` > 0. | Cero hechos en `*DEFAULT*`. |
| 36 ✏️ | Observar el motor nuevo → **La lente en un sistema real** | Apuntar la Lente (rol solo lectura) a un sistema del Application Plane. **Reglas de alerta** = las invariantes de `lente verificar`, más umbrales: rezago > N, dead letters > 0, outbox con antigüedad > N. **De taller a producción:** el núcleo que escribiste se monta en la app de producción (varios targets, autenticación, secretos); el alumno ve **sus** paneles observando un sistema real. | Corre en modo solo lectura sobre producción. |
| **36b 🆕** | **Listo para producción** | **Dolor:** apuntada a un `mt_events` de millones de filas, la Lente que funcionaba con 20 hechos tarda minutos y carga la base que observa. **Construyes:** consultas paginadas y acotadas en tiempo, índices que **no** se crean en la base observada (solo lectura), límites de tiempo por consulta, varios targets por configuración, secretos fuera del código. **Y el aporte:** abrir un PR a `cosmos-trace` con un panel o una invariante propia. | Ninguna consulta de la Lente excede N ms sobre la base de prueba grande. |
| 37-39 + módulo "La plantilla real" | | La Lente es la **evidencia** de las críticas a la plantilla: medir el rezago real, contar los read models sin versión, observar si la config del read-side coincide con la del write-side. | — |

---

## 4. `lente verificar`: la evaluación que hoy falta

Un comando que corre todas las invariantes **ganadas hasta la sección actual** (`--hasta 26`) contra la base del alumno, y reporta ✅/❌ con el porqué. Resuelve el problema del autor (*"no tengo cómo comprobar que aprenden"*) desde tres ángulos:

1. **Evidencia del sistema, no autodeclarada.** Si el sistema del alumno viola "versiones contiguas", el motor tiene un error, lo haya copiado o no.
2. **Sabotaje con predicción.** El facilitador (o el propio alumno) rompe una línea que carga peso. El alumno **predice qué invariante caerá**, corre `lente verificar` y compara. Acertar la predicción demuestra entendimiento; copiar no ayuda.
3. **Transferencia.** En el capstone, el alumno **escribe una invariante nueva** para su agregado `Contrato` (p. ej. "ningún contrato renovado después de cancelado"). Saber qué vigilar es la prueba más fuerte de que entendió.

**Reutilización:** las invariantes viven en un archivo SQL por invariante (`invariantes/NN-nombre.sql`) que se acumula sección a sección. Ese mismo archivo es la batería de reglas de alerta de §36. No hay dos sistemas.

---

## 5. Del taller a producción: una sola herramienta

### 5.1 Arquitectura: un núcleo, varios cascarones

```
CosmosTrace.Core            ← lo que el alumno construye en el taller
  ├─ Fuentes                  IFuente: FuenteArtesanal (solo taller) · FuenteMarten · FuenteWolverine
  ├─ Paneles (consultas)      stream · rezago · fallos · bandeja · flujo · rutas · formas · tenants
  └─ Invariantes              invariantes/NN-nombre.sql  (= tests de aprendizaje = reglas de alerta)

Cascarones sobre el núcleo:
  Lente (consola)           ← taller, §15b-§32
  Lente web + SSE           ← taller, §33-§34
  CosmosLens (producción)   ← API + UI + alertas + varios targets + autenticación
```

- **Un solo lugar para cada consulta.** El SQL de un panel vive en el núcleo; no hay una versión "del taller" y otra "de producción". Así no se repite la deriva entre documentos que ya tiene el repo.
- **La `FuenteArtesanal` solo existe para el taller.** En producción no hay tablas `eventos` hechas a mano. Se mantiene en el núcleo porque es la que permite que el alumno vea el cambio de fuente en §29, pero producción solo registra `FuenteMarten` y `FuenteWolverine`.
- **La implementación de referencia del taller vive en `cosmos-trace`.** Los checkpoints por hito son etiquetas de ese repo. Cuando el alumno termina, su código y el de producción son el mismo proyecto.

### 5.2 Lo que producción exige y el taller debe enseñar

| Requisito de producción | Dónde se enseña |
|---|---|
| **Solo lectura garantizada** (rol con `SELECT`, nunca escribir en la base observada) | §15b, desde el primer día |
| **Nombres estables** (la Lente lee `tipo` como texto) | §14 → §15b |
| **Correlación y causación** en todos los hechos y mensajes | §20 → §26 → §29-30 |
| **Consultas que no tumban la base observada** (paginación, ventanas de tiempo, límite por consulta) | 36b 🆕 |
| **Varios sistemas a la vez** (cada BC con su esquema; el read-side con stores nombrados) | 36b + módulo "La plantilla real" |
| **Tenancy** (filtrar y alertar por tenant) | §35 |
| **Secretos y autenticación** de la UI | 36b (lo mínimo); el resto es del cascarón de producción |
| **Alertas** = invariantes + umbrales | §36 |
| **Trazas** para lo que la base no conserva | §33 |

### 5.3 El punto que más pesa: el flujo en los sistemas reales

Según `AMPLIACION-MARTEN.md`, en ControlPlane **la reacción entre módulos no pasa por Wolverine**: viaja por **topics de Azure Service Bus** consumidos por **Azure Functions** (`[ServiceBusTrigger]`). Consecuencia para producción:
- Las tablas de envelopes de Wolverine **no muestran** ese flujo.
- El flujo entre módulos solo se puede reconstruir si **la correlación viaja en el mensaje de Service Bus** y se graba como metadato en `mt_events` del módulo que lo recibe. Lo complementan las trazas OTel de Functions y del SDK de Service Bus.
- **Es una decisión sobre la plantilla, no sobre la Lente:** si `Cosmos.BuildingBlocks` no propaga la correlación, ninguna herramienta podrá dibujar el flujo. Es el primer aporte concreto de un mantenedor que construyó la Lente, y conecta los objetivos 2 y 3.

El spike (fase 1) debe verificarlo **contra un sistema real**, no solo contra el juguete del taller.

## 6. Plan de ejecución

| Fase | Qué | Salida | Cómo se valida |
|---|---|---|---|
| **0 · Decisiones** | Confirmar las 5 decisiones abiertas de §7. | Este documento aprobado. | El autor. |
| **1 · Spike técnico** | Verificar, contra un sistema real además del juguete, y contra las versiones que se fijen (Marten 9.x / Wolverine): metadatos de correlación y causación de Marten y su propagación desde Wolverine; nombres de las tablas de progreso, de dead letters de proyección y de envelopes de Wolverine; *source names* de OTel; cómo obtener el mapa mensaje → handler de Wolverine; dashboard de Aspire standalone. | Un `SPIKE-LENTE.md` con cada punto ✅/❌ y el código que lo prueba. | `verificador-tecnico`. **Requiere entorno con .NET 10 y Docker.** |
| **2 · Implementación de referencia** | Recorrer el taller de punta a punta construyendo motor + Lente, y publicar **checkpoints por hito** con ambos. Se aprovecha para corregir las erratas de la revisión §4. | `checkpoints/hito-N/` con solución completa, Lente e `invariantes/`. | `dotnet test` + `lente verificar --hasta N` en verde en cada hito. |
| **3 · Escritura** | Las 2 secciones nuevas (15b, 28b) y las ~20 modificadas, en orden, cada una por `revisar-seccion`. Actualizar `SECUENCIA.md` (hilo "La Lente"), `MAPA.md` y `taller.md`; marcar en `APP-MONITOR-PLAN.md` qué quedó sustituido. | Secciones en la rama. | Validador 0 errores + los 4 revisores. |
| **4 · Piloto observado** | Una persona hace los hitos 3-5 **sola**. El autor observa sin ayudar y registra: sección, minuto, `<details>` abierto, pregunta, resultado de `lente verificar`. | Mapa de fricción con datos. | Comparar con los pilotos anteriores. |

**Orden sugerido para la fase 3** (cada bloque deja algo usable):
1. **15b + 16-20:** la Lente nace, con rezago, fallos y metadatos. Ya sirve como evidencia y para `verificar`.
2. **26-28b:** el flujo hecho a mano: el panel central de la herramienta.
3. **29-32:** la Lente cambia de fuente. Es el reconocimiento.
4. **33-36b:** web, en vivo, tenant, sistema real y listo para producción.

---

## 7. Decisiones abiertas (del autor)

| # | Decisión | Recomendación |
|---|---|---|
| 1 | Alcance de la UI que construye el alumno: consola → HTML del servidor + SSE, **sin React**. | ✅ Así. El alumno construye el núcleo; la UI de producción es un cascarón aparte. |
| 2 | Dónde nacen los metadatos de correlación y causación. | **§20** (el hecho venenoso: "¿quién lo escribió?"). Es el primer dolor real. §26 los propaga. |
| 3 | Añadir al dominio un segundo salto (Facturación escribe su propio hecho). | ✅ Sin él no hay flujo que ver. Cambio pequeño en §27. |
| 4 | Visor de trazas: dashboard de Aspire standalone frente a uno propio. | **Aspire standalone.** No se reconstruye un almacén de trazas. |
| 5 | ¿La Lente va en el **núcleo** o en una rama opcional? | **Núcleo.** Es el instrumento de evidencia y de evaluación de todo el taller, no un extra. |
| 6 | ¿La UI de producción (CosmosLens) la construye el equipo, o es la web del taller endurecida? | **El equipo**, sobre el mismo núcleo. La web del taller es didáctica; producción necesita autenticación, varios targets e historia. |
| 7 | ¿Propagar la correlación por Service Bus en `Cosmos.BuildingBlocks`? | ✅ Es requisito para ver el flujo entre módulos en producción (§5.3). Decidirlo con evidencia del spike. |

---

## 8. Riesgos

- **Más largo.** +3-4 h sobre ~25 h. Mitigación: cada incremento reemplaza un paso de "haz `SELECT` y mira"; aplicar las fusiones de la revisión §3.4.
- **API de Marten/Wolverine no verificada.** Todos los nombres de tablas y metadatos de la era 2 son **a verificar** en la fase 1; no se escribe la era 2 antes del spike.
- **El flujo histórico no está en la base.** Un mensaje ya procesado puede no quedar en las tablas de Wolverine. Por eso el flujo de la era 2 se arma con metadatos en `mt_events` + trazas, no solo con tablas de envelopes.
- **Dos verdades del observador.** Si la Lente de referencia y CosmosLens divergen, se repite la deriva entre documentos. Mitigación: un solo núcleo (§5.1).
- **Código del taller en producción.** Lo que escribe un alumno no entra a producción sin revisión: el aporte es un **PR** a `cosmos-trace` (36b), con tests y la batería de invariantes en verde.
- **El flujo entre módulos puede no ser observable hoy.** Si la correlación no viaja por Service Bus, el panel de flujo solo funcionará dentro de un módulo hasta que la plantilla cambie (§5.3).
