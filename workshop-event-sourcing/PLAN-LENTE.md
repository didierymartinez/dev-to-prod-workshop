# 🔭 Plan — la Lente: entregada hecha, el alumno aprende a observar

> **La decisión.** La Lente (la app de observabilidad, **CosmosLens** en el repo `cosmos-trace`) **se entrega construida**. El alumno no escribe la herramienta: construye el motor de event sourcing y **aprende a observarlo**. La Lente es además **la herramienta de producción** del equipo; no se adopta CritterWatch, que queda solo como referencia de diseño.
>
> **La condición: entregada, pero no caja negra.** En cada concepto clave el alumno escribe **una consulta a mano** y compara su resultado con lo que muestra la Lente. Si coinciden, entendió; si no, su modelo mental tiene un hueco. **La Lente es la clave de respuestas.** Al final, el alumno abre el código de la Lente, reconoce en él sus consultas y le aporta un panel por PR.
>
> **Sustituye** el hilo "El monitor" de `SECUENCIA.md` y las partes del alumno en `APP-MONITOR-PLAN.md` (que sigue valiendo como plan del producto). **Responde a** `REVISION-PEDAGOGICA.md` §2 (cómo comprobar que aprenden) y §8.2 (falta la traza).

---

## 1. Para qué sirve la Lente

| Uso | Qué hace | Ejemplo |
|---|---|---|
| **Entendimiento** | Hace visible lo invisible: versiones, rezago, causa de cada hecho, el flujo entre sistemas. | "Predice qué fila aparece en la Lente cuando suspendas `emp-7`." |
| **Aprendizaje** | Es la **clave de respuestas**: el alumno compara su consulta a mano con el panel. Y `verificar` comprueba invariantes sobre la base del alumno. | "Tu `Rezago()` dice 3; ¿qué dice la Lente? Si difieren, ¿quién tiene razón?" |
| **Monitoreo** | La misma app, apuntada a un sistema real del Application Plane en modo solo lectura. | Rezago de las proyecciones de Contabilidad; dead letters de hoy. |

**La idea que une los tres:** *una invariante = un test de aprendizaje = una alerta de producción.*

---

## 2. Reglas para que observar no desvíe el event sourcing

1. **La Lente no introduce conceptos; los hace visibles.** En cada sección el orden es: dolor → concepto → código de event sourcing → **🔍 obsérvalo**. La observación ocupa el lugar del 🔍 y del ✅ que ya existen.
2. **El protocolo de observación, siempre igual:** **🔮 predice** qué mostrará la Lente → **▶️ actúa** → **🔭 mira** → **✍️ escribe la consulta a mano** → **⚖️ compara**. La predicción escrita y la consulta propia no se pueden copiar de un `<details>`.
3. **Una consulta a mano por concepto clave, no por sección.** Solo donde el número de la Lente esconde el concepto (versiones, rezago, flujo). Donde el panel es evidente, basta con mirar.
4. **Cada panel muestra la consulta que tiene detrás.** Un botón o una bandera `--sql`. El alumno nunca tiene que confiar en un número que no sabe de dónde sale.
5. **Los paneles se revelan al ritmo del taller.** La Lente se arranca con `--hasta <sección>` y solo muestra los paneles de conceptos ya vistos (regla A8 del contrato: sin adelantos).
6. **Cero ingeniería de la herramienta en el taller.** Web, SSE, trazas, rendimiento, varios sistemas: todo eso es trabajo del equipo sobre `cosmos-trace`, no contenido del alumno.

---

## 3. El recorrido

### Antes de que haya algo persistido (§1-12): sin Lente
Una app externa no puede ver la memoria del proceso del alumno. Aquí el alumno observa con su propio código, como hoy (`foreach`, la consola y desde §12 los tests). Hay dos cambios en el código del alumno que la Lente cobrará después:

| § | Cambio | Por qué |
|---|---|---|
| 10-11 ✏️ | **Sin `causa` todavía** (decisión al implementar, oct 2026): en §10-12 nadie la consumiría y la regla B3 prohíbe arrastrar piezas "para después". El 🔨 de §11 ya se corrigió sin ella: el alumno imprime el diario y ve `EmpresaRegistrada` dos veces. | — |
| 13 ✏️ | **El sobre en disco gana `causa`**: el id del comando que produjo el hecho. Su primer consumidor es la Lente, que se instala en esta misma sección y agrupa los hechos por acto. | Es el dato que, en 28b, permite dibujar el flujo. |

### Era 1 · el esquema hecho a mano (§13-28)

| § | Qué observa en la Lente | ✍️ Consulta a mano (clave de respuestas) | Invariante de `verificar` |
|---|---|---|---|
| 13 ✏️ | **Instala la Lente** y la apunta a `datos/`. Panel **diario**: línea de tiempo por stream, con versión y causa. 🔮 *"Reinicia tu programa: ¿qué sigue mostrando la Lente?"* | — | Versiones contiguas por stream. |
| 14 ✏️ | **La Lente es un segundo lector de tu disco.** Renombra una clase sin nombre estable: tu programa compila, pero la Lente marca los hechos viejos como *tipo desconocido*. El nombre estable protege a todos los lectores. | — | Todo `tipo` es un nombre conocido. |
| 15 ✏️ | La Lente apuntada a Postgres (tabla `eventos`). 🔮 *"Provoca el choque de versiones: ¿qué fila no llega a la tabla?"* | `SELECT` que encuentra huecos o versiones repetidas → comparar con `verificar`. | (Las anteriores, sobre `eventos`.) Nacimiento único. |
| 16-17 ✏️ | Panel **diario vs vista**: el estado rejugado junto a la fila de la vista. La divergencia de §17 **se ve**, y motiva `Reconstruir`. | La fila de tu vista contra tu replay. | La vista coincide con el rejugado. |
| 18-19 ✏️ | Panel **rezago** (frente − checkpoint), en vivo. | Tu `Rezago()` de §19 **debe dar el mismo número** que la Lente. | `checkpoint ≤ frente`. |
| 20 ✏️ | Panel **fallos**: el hecho que el proyector apartó, **con su `causa`**. *"¿Quién escribió el hecho venenoso?"* ya tiene respuesta. | — | Todo fallo tiene rastro hasta su comando. |
| 24 ✏️ | Panel **formas del hecho**: cuántos hechos con la forma vieja siguen en disco. | Contar los hechos sin `Nit` → decidir si hace falta el upcaster. | — |
| 25 ✏️ | El panel de rezago muestra **una fila por vista**. | — | Todas las vistas `checkpoint ≤ frente`. |
| 26 ✏️ | Panel **bandeja de salida**: pendientes y edad del más viejo. **Nace `correlacion`**, cuando un acto cruza a otro sistema por primera vez. | Cuántos anuncios pendientes hay. | Ningún anuncio pendiente más viejo que N s. |
| 27 ✏️ | **Al dominio se le añade un segundo salto:** Facturación, al recibir `EmpresaSuspendidaV1`, escribe su propio hecho (p. ej. `CobroDetenido`) con la misma correlación. Sin ese salto no hay flujo que ver. | — | — |
| **28b 🆕** | **El flujo de un mensaje.** **Dolor:** "Suspendí `emp-7`: ¿Facturación se enteró? ¿Qué hizo?". La respuesta está repartida en cuatro tablas. Panel **flujo**: el árbol comando → hecho → anuncio → consumo → hecho de una correlación. | **La consulta del flujo**: todo lo que tiene esa `correlacion`, ordenado por `causa`. Es el reto central: si tu árbol coincide con el de la Lente, entendiste el flujo. | Todo anuncio entregado tiene un consumo con la misma correlación. |

### Era 2 · Marten + Wolverine (§29-36)

| § | Qué observa | ✍️ Trabajo del alumno | Invariante |
|---|---|---|---|
| 29 ✏️ | La Lente detecta el esquema de Marten y sigue mostrando **los mismos paneles**. | **Mapear cada tabla y columna tuya a la de Marten** (`eventos` → `mt_events`, `tipo` → alias del tipo, `causa` → metadato…). Ese mapa es el inventario "se borra / se conserva" que pedía la revisión. | Las mismas, sobre `mt_*`. |
| 30-31 ✏️ | Bandeja y flujo leen las tablas de envelopes de Wolverine. Panel **reentregas**. | 🔮 Predecir qué tabla de Wolverine gana una fila al cascadear un mensaje. | Ningún envelope saliente atascado. |
| 32 ✏️ | Rezago sobre la tabla de progreso del daemon; fallos sobre los dead letters de proyección. | Tu cálculo de §19 traducido al esquema de Marten **debe coincidir** con la Lente. | `progreso ≤ high-water`. |
| 35 ✏️ | Filtro por tenant. | — | Cero hechos en `*DEFAULT*`. |
| 36 ✏️ | **La Lente sobre un sistema real** del Application Plane (solo lectura). Reglas de alerta = invariantes + umbrales. | Explicar un flujo real de punta a punta con lo que muestra la Lente. | Las del taller, ahora como alertas. |

### Cierre: "La Lente por dentro" (después de §39)
Mismo método que con Marten, aplicado a la herramienta:
1. Abrir el código de la Lente y **encontrar las consultas** que el alumno escribió a mano (rezago, flujo, versiones).
2. Notar qué agrega la versión de producción: paginación, límites de tiempo, varios sistemas, solo lectura garantizada.
3. **Aportar por PR** a `cosmos-trace` un panel o una invariante propia (por ejemplo, la de su agregado del capstone). Es la evaluación del rol de mantenedor de la herramienta.

---

## 4. `verificar`: la evaluación que hoy falta

`verificar` viene en la Lente y corre las invariantes **de los conceptos ya vistos** (`--hasta 26`) contra la base del alumno, con ✅/❌ y el porqué.

1. **Evidencia del sistema, no autodeclarada.** Si el motor viola "versiones contiguas", tiene un error, lo haya copiado o no.
2. **Sabotaje con predicción.** El facilitador (o el alumno) rompe una línea que carga peso. El alumno **predice qué invariante caerá**, corre `verificar` y compara.
3. **Transferencia.** En el capstone, el alumno **escribe una invariante nueva** para su agregado `Contrato` y la propone por PR. Saber qué vigilar es la prueba más fuerte de que entendió.

---

## 5. El contrato de esquema

Como una app externa lee las tablas del alumno, **los nombres pasan a ser un contrato** (la lección de §14, vivida). Se fijan y se documentan en un solo lugar, compartido por el taller y la Lente:

| Origen | Qué lee la Lente | Desde |
|---|---|---|
| `datos/<stream>.log` | Una línea JSON por sobre: `version`, `tipo`, `datos`, `causa` | §13 |
| `eventos` | `seq`, `stream`, `version`, `tipo`, `datos` (jsonb), `causa`, `correlacion`, `cuando`; PK `(stream, version)` | §15 |
| `checkpoint` | `nombre`, `posicion` | §18 |
| `proyeccion_fallos` | `seq`, `proyeccion`, `error`, `cuando` | §20 |
| `bandeja_salida` | `id`, `mensaje`, `correlacion`, `causa`, `entregado`, `cuando` | §26 |
| `mt_*` y tablas de Wolverine | el esquema de la herramienta | §29 |

Los nombres exactos se alinean con los que ya usan las secciones al escribir cada bloque. Un cambio de esquema en el taller obliga a cambiar la Lente, y viceversa: por eso vive en un solo lugar.

---

## 6. Lo que la Lente debe tener (ruta crítica)

La Lente pasa a ser **requisito** para escribir las secciones. Hoy `cosmos-trace` tiene un esqueleto inicial (streams, línea de tiempo y rezago leyendo Postgres). Faltan, por bloque:

| Para escribir | La Lente necesita |
|---|---|
| §13-15 | Adaptador **modo taller**: archivos de `datos/` y tabla `eventos`. Paneles diario y versiones. `verificar` con las primeras invariantes. `--hasta N`. `--sql` en cada panel. Distribución simple para el alumno. |
| §16-25 | Paneles diario vs vista, rezago (N vistas), fallos, formas del hecho. |
| §26-28b | Panel bandeja y **panel flujo** (árbol por correlación). |
| §29-36 | Adaptador Marten + Wolverine. Filtro por tenant. Modo solo lectura sobre sistemas reales. Reglas de alerta. |

**El adaptador modo taller no debe ensuciar la herramienta de producción:** va en un ensamblado aparte que producción no carga.

### El punto que más pesa en producción: el flujo entre módulos
Según `AMPLIACION-MARTEN.md`, en ControlPlane los mensajes entre módulos **no pasan por Wolverine**: viajan por Azure Service Bus y los consumen Azure Functions. Por eso las tablas de Wolverine no muestran ese flujo. Para dibujarlo, **la correlación tiene que viajar en el mensaje de Service Bus** y guardarse como metadato en `mt_events` del módulo que lo recibe; las trazas OpenTelemetry lo complementan. Si `Cosmos.BuildingBlocks` no propaga la correlación, ninguna herramienta podrá mostrar ese flujo. Es una decisión de la plantilla y un aporte natural de mantenedor.

---

## 7. Plan de ejecución

| Fase | Qué | Depende de |
|---|---|---|
| **0 · Decisiones** | Confirmar las decisiones de §8. | — |
| **1 · Spike técnico** | Verificar contra la versión que se fije, y contra un sistema real: metadatos de correlación y causación de Marten y su propagación desde Wolverine y Service Bus; nombres de tablas de progreso, dead letters y envelopes. Resultado en `SPIKE-LENTE.md`. Requiere .NET 10, Docker y acceso de solo lectura a un sistema real. | 0 |
| **2a · Arreglar §1-12** | ✅ **Hecho** (oct 2026): erratas de la revisión, el 🔨 de §11, predicciones en los ✅, checkpoints compilados (`checkpoints/`). | 0 |
| **2b · Lente para la era 1** | En `cosmos-trace`: lo que pide la fila §13-28b de la tabla de §6. | 1 |
| **3 · Escribir §13-36 por bloques** | Cada bloque cuando su panel exista, y cada sección por `revisar-seccion`. Actualizar `SECUENCIA.md`, `MAPA.md` y `taller.md`. | 2b |
| **4 · Piloto observado** | Una persona hace los hitos **sola**; el autor anota sección, minuto, `<details>` abierto, predicciones acertadas y resultado de `verificar`. | 3 |

---

## 8. Decisiones abiertas

| # | Decisión | Recomendación |
|---|---|---|
| 1 | ¿Desde dónde se usa la Lente: §13 (archivos) o §15 (Postgres)? | **§13.** Cuesta un adaptador de archivos pequeño, pero da el mejor momento de §14: la Lente como segundo lector que se rompe con un renombre. |
| 2 | ¿Dónde nacen los metadatos? | `causa` en **§13** (con la Lente, su primer consumidor); `correlacion` en **§26**. |
| 3 | ¿Agregar el segundo salto al dominio (Facturación escribe su propio hecho)? | ✅ Sin él no hay flujo que observar. |
| 4 | ¿Cómo se distribuye la Lente al alumno? | Un **`dotnet tool`** (lee archivos locales sin montar volúmenes) o un contenedor para la era 2. A decidir con el spike. |
| 5 | ¿Dónde vive el adaptador modo taller? | En un **ensamblado aparte**, para que producción no lo cargue. |
| 6 | ¿Propagar la correlación por Service Bus en `Cosmos.BuildingBlocks`? | Decidir con la evidencia del spike (§6). |

---

## 9. Riesgos

- **Caja negra.** Si el alumno solo mira números, no aprende de dónde salen. Mitigación: consulta a mano en cada concepto clave, `--sql` en cada panel y el cierre "La Lente por dentro".
- **La Lente es la ruta crítica.** Las secciones §13 en adelante no se pueden escribir hasta que exista su panel. Mitigación: la fase 2a (arreglar §1-12) avanza en paralelo.
- **Contrato de esquema rígido.** Cambiar un nombre en el taller rompe la Lente. Mitigación: un solo documento de esquema compartido (§5), y cada cambio pasa por los dos.
- **API de Marten y Wolverine sin verificar.** Nada de la era 2 se escribe antes del spike.
- **El flujo entre módulos puede no ser observable hoy** (§6). El panel de flujo funcionaría solo dentro de un módulo hasta que la plantilla propague la correlación.
