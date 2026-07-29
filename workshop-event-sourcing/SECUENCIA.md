# 🧵 La secuencia — una sola cadena

> **Esto es el taller: una sola secuencia de secciones, de la 1 a la N.** No hay fases, ni bloques, ni
> "primera mitad / segunda mitad", ni un "§1-9 que se deja quieto". Toda sección es **par** de las
> demás: la 3 se edita con el mismo criterio que la 25, y una sección nueva no es "lo que viene después"
> — es una posición más, metida donde su **dolor** nace.
>
> El **orden real** vive en la cadena `⬅️/➡️` de cada archivo; esta lista lo refleja de corrido y le
> suma las posiciones que todavía no se han vivido. Salió del panel de reevaluación (ganó el criterio
> *evidencia-desde-temprano*, que **no mueve ninguna de las secciones ya escritas**: solo teje las
> nuevas donde su dolor las reclama).

## Tres hilos que atraviesan la cadena (no son secciones ni bloques)

Corren a lo largo de toda la secuencia, ganando peso donde un dolor los toca:

- **Evidencia.** Desde que nace el arnés de tests (posición 12), **cada** choque posterior se fija en un test; los `🔨 rómpelo` pasan de "míralo en consola" a "mira el test caer".
- **Criterio.** Desde temprano, cada sección deja **una línea** en `DECISIONES.md`: la decisión que el alumno tomó y por qué. El taller no cambia de motor (dolor → criterio) en una frontera; el criterio se registra en el camino.
- **El monitor.** Una **app companion que damos nosotros** (se descarga y se corre; repo + imagen Docker), que se conecta al Postgres/broker del alumno y **revela paneles al ritmo de las secciones**, hasta tener toda la funcionalidad de CritterWatch. El alumno **no la construye** — construye a mano el motor y los conceptos; la app le da la superficie para *verlos*. Se enciende en paralelo, no al final: línea de tiempo (15) · rezago (24) · fallos (25) · flujo de mensajes (30) · daemon/config (32) · por-cliente (35) · catálogo (cierre). Vive dos eras: paneles nuestros leyendo Postgres directo (15-28), luego converge al **CritterWatch real** tras el swap (29+), cuando ya hay Wolverine + daemon + broker que instrumentar. Plan completo: [`APP-MONITOR-PLAN.md`](APP-MONITOR-PLAN.md).

Y un hilo largo: **el comentario que sobrevive** (posición 37) se **siembra** en las primeras secciones (una línea rara y necesaria, sin comentar) y se **cobra** al final, cuando el alumno vuelve a ese archivo.

---

## La cadena

`✓` = escrita y verificada · `○` = por vivir (una a la vez, desde el dolor, con spike y arnés). El glifo
es **estado en disco**, no una división: cualquier posición se edita o se re-hila igual.

| # | Sección | De qué dolor nace → con qué queda el alumno |
|---|---|---|
| 1 | ✓ [El diario de una empresa](secciones/el-diario-de-una-empresa.md) | Un `UPDATE` destruye el pasado → guardar el **diario** de hechos, no la foto. |
| 2 | ✓ [Los primeros hechos](secciones/los-primeros-hechos.md) | ¿Cómo se escribe un hecho ineditable? → `record` inmutables + replay a mano. |
| 3 | ✓ [Refactorizando el motor](secciones/refactorizando-el-motor.md) | El `foreach` con un `if` por tipo crece feo → `AggregateRoot` + `switch`. |
| 4 | ✓ [El flujo de vida](secciones/el-flujo-de-vida.md) | La historia es una lista pelada que cualquiera ensucia → `EventStream<T>`. |
| 5 | ✓ [Decidir el futuro](secciones/decidir-el-futuro.md) | Nadie vigila las reglas → el agregado **decide** y emite, validando. |
| 6 | ✓ [El Command Handler](secciones/el-command-handler.md) | El ciclo cargar→actuar→guardar suelto en `Program.cs` → un handler por comando. |
| 7 | ✓ [El despachador](secciones/el-despachador.md) | Eliges la clase del handler a mano → `record` por comando + tabla tipo→handler. |
| 8 | ✓ [El almacén por id](secciones/el-almacen-por-id.md) | Un handler atado a un stream → `EventStore` central; el id es la llave. |
| 9 | ✓ [Concurrencia optimista](secciones/concurrencia-optimista.md) | Dos escritores se pisan en silencio → sobre con versión que rechaza el choque. |
| 10 | ✓ [Un acto, dos hechos](secciones/un-acto-dos-hechos.md) | El segundo `decide` decide a ciegas → hace falta que el agregado se aplique lo que decide. |
| 11 | ✓ [El agregado recuerda](secciones/el-agregado-recuerda.md) | La cura: `Emitir` = aplica + acumula; un solo `Append`. Y un hecho huérfano miente en silencio. |
| 12 | ✓ [Verde, y roto](secciones/verde-y-roto.md) | El estado puede pasar verde con el motor roto → afirmar los **hechos emitidos**. *(nace el arnés de tests)* |
| 13 | ✓ [El diario en disco](secciones/el-diario-en-disco.md) | Los tests siembran en RAM; nada sobrevive al reinicio → persistir a disco; se pierde el tipo del hecho. |
| 14 | ✓ [El nombre es un contrato](secciones/el-nombre-es-un-contrato.md) | Renombrar la clase rompe la historia en disco → nombre estable del evento. |
| 15 | ✓ [Todo o nada](secciones/todo-o-nada.md) | Una caída a mitad de acto deja media acción → Postgres a mano (transacción + `PRIMARY KEY`). |
| 16 | ✓ [La vista de lectura](secciones/la-vista-de-lectura.md) | El `SELECT` sobre hechos miente → una vista aparte para consultar el estado de hoy. |
| 17 | ✓ [Reconstruir la vista](secciones/reconstruir-la-vista.md) | La vista cambia de forma y el pasado no se re-ejecuta → borrar y re-derivar del diario. |
| 18 | ○ ¿Merecía event sourcing? | Todo parece un stream → event-sourcear un catálogo plano cuesta ceremonia por cero invariantes ni historia; el criterio para decir *no*. |
| 19 | ○ El puerto propio | La suite arranca Postgres y es lenta → extraer `IEventStore` + un doble en memoria; y ver el hueco que el puerto tapa (concurrencia). *(aquí la `Empresa` gana una invariante de saldo acumulado, para que el hueco duela)* |
| 20 | ○ Dos streams, misma clave | Dos registros del mismo NIT crean dos streams → unicidad atómica con un localizador dentro de la transacción. |
| 21 | ○ La forma del hecho se congela | Un campo nuevo o un rename rompe la lectura del JSONB viejo → forma plana + evolución sin romper la historia. |
| 22 | ○ La vista por consulta | Llega otra pregunta y la vista no sirve → el read model se diseña por la consulta (un documento por pago). |
| **async →** | | *el proyector deja de vivir dentro del handler; empieza a correr por su cuenta* |
| 23 | ○ El proyector se independiza | Mantener la vista dentro del handler es frágil → un proceso aparte que sigue el diario, con **checkpoint** (hasta dónde leyó). *(el async, vivido a mano)* |
| 24 | ○ La vista va atrás | Ese proceso queda rezagado; decidir leyendo una vista atrasada rompe una invariante → **medir el rezago**. Consistencia eventual, sentida. *(monitor: panel 1, el rezago)* |
| 25 | ○ El mismo hecho dos veces | Un replay del proyector duplica el efecto (el saldo se descuenta dos veces) → idempotencia: la proyección se re-aplica sin cambiar nada. *(monitor: panel 2, fallos)* |
| **EDA →** | | *hasta aquí todo vive en un proceso; ahora un hecho tiene que cruzar hacia afuera* |
| 26 | ○ El hecho y su anuncio | Respondes OK y el hecho no se guardó; o anuncias algo y el guardado falla → el hecho y su anuncio comparten transacción o nada. *(vivido con un efecto externo falso: un archivo / una lista que sobrevive al rollback)* |
| 27 | ○ El evento público | Otro contexto necesita enterarse de un hecho; darle tu diario lo acopla todo → le mandas un **evento público** (contrato aparte, plano), distinto del evento interno. *(vivido con un 2º proyecto en la solución que solo referencia los contratos y falla al compilar si el modelo interno cambia)* |
| 28 | ○ El mensaje y la cola | Un método que llama a otro no cruza entre procesos → el anuncio viaja como **mensaje** por una **cola** (transporte). Aquí choca el muro: una cola de verdad no se arma a mano. |
| 29 | ○ El swap por reconocimiento | Reconstruiste proyector + checkpoint + índices + transacción + outbox + cola a mano → **Marten** (el daemon) y **Wolverine** (transportes, outbox) ya hacen todo eso, atómico y correcto; se adopta por alivio, sobre la misma Postgres. |
| 30 | ○ El outbox | Publicar al bus y guardar el hecho son dos escrituras (el dual-write de la 26, ahora con un bus real) → el **outbox** guarda el mensaje en la misma transacción del hecho y lo entrega después. *(paga la deuda de la 26; con Wolverine)* |
| 31 | ○ Llegó dos veces, del transporte | El transporte es *at-least-once*: el mismo mensaje llega dos veces → idempotencia en el consumidor. Es el principio de la 25, ahora contra el bus. *(mucho es criterio: el broker real no se vive con el juguete)* |
| **async de verdad + servicio →** | | *correr todo esto como un servicio real* |
| 32 | ○ El daemon y la consistencia eventual | El proyector async ahora es el **daemon** de Marten → sus modos (Solo / HotCold), y la consistencia eventual como propiedad **declarada**, no accidente. *(monitor: panel, salud de configuración del store)* |
| 33 | ○ El host y la inyección | Para correr handlers + proyecciones + daemon + transportes en un servicio, un **host web + inyección de dependencias** arma y entrega las piezas → paga el "infierno de los `new`" que sembraste en el despachador. |
| 34 | ○ En vivo y serverless | Variantes de entrega: **SSE** para una UI que se actualiza sola; y **serverless**, donde el outbox no aplica igual (`SendInline` y su radio de impacto). *(sobre todo criterio, con el repo real como evidencia)* |
| 35 | ○ El contexto que falta (multi-tenancy) | Falta de qué cliente es la petición y el sistema rellena con un default; el dato queda en el tenant equivocado, sin error → el tenant viaja y se resuelve con *fail-fast*. *(monitor: panel, por cliente)* |
| 36 | ○ Observar el motor nuevo | Con la librería corriendo: qué streams crecen sin techo, el flujo de hechos, qué falló y dónde → más paneles del monitor. |
| 37 | ○ El comentario que sobrevive | Aquella línea rara que sembraste hace secciones vuelve, alguien la "limpia" y el bug regresa → el comentario que nombra el síntoma; y el aporte de vuelta a la librería. |
| 38 | ○ La plantilla | Reunir lo construido en la forma de `Cosmos.BuildingBlocks`: `AggregateRoot` real + unidad de trabajo + almacén + doble de test — y **operarla**. |
| 39 | ○ El capstone: FetchForWriting | Cerrar la deuda plantada en la posición 9 y sentida en la 19: meter la versión esperada en la librería real, con test de conflicto y handoff. |

> Las filas `async →` / `EDA →` / `async de verdad + servicio →` **no son bloques ni fases**: son solo
> pistas de lectura para ti sobre qué hilo pesa en ese tramo. La cadena sigue siendo una sola, y cada
> posición nace del final de la anterior.
>
> **Una decisión de diseño que tomé aquí, y puedes redirigir:** el **núcleo** de EDA se vive **a mano
> antes del swap** (el dual-write con un efecto falso, el evento público con un 2º proyecto, el intento
> de cola que choca contra el muro), y la **maquinaria** de EDA (outbox durable, reentrega, transportes
> reales) se vive **después del swap**, ya con Wolverine — porque un broker de verdad no se arma a mano.
> Es el mismo método de siempre (constrúyelo a mano → reconoce la herramienta), aplicado a EDA. Si
> prefieres otro reparto, se re-hila aquí.
>
> Las posiciones 18-39 son el **rumbo**, no un guion fijo: se viven una a la vez, y si al correr el
> código el dolor real apunta a otro lado, manda el dolor — se re-hila la cadena, no se defiende este mapa.
>
> **Honestidad de sentibilidad:** con un dominio de juguete en un proceso, el núcleo de cada dolor se
> vive de verdad, pero varias piezas de EDA (broker *at-least-once* real, serverless, multi-tenancy con
> JWT) **no se pueden sentir** — van como **criterio explicado**, con los repos del Application Plane
> como evidencia (el cross-módulo real es 100% broker). Está marcado arriba en cada fila que aplica.

---

## Cómo se avanza

Una sección a la vez: se **vive** (spike que corre y choca contra el código real de esa posición), se
escribe, se cierra con el arnés `revisar-seccion` (validador + estilo + principiante + técnico), y se
para. La siguiente nace del final concreto de la anterior. El detalle por sección (el dolor completo,
qué construye, qué exige del dominio) vive en [`PLAN-SECCIONES-DESDE-INSUMOS.md`](PLAN-SECCIONES-DESDE-INSUMOS.md);
los cambios finos sobre las secciones ya escritas, en [`PLAN-DE-OBRA.md`](PLAN-DE-OBRA.md). Ambos son
**detalle por sección** de esta única cadena — no otro ordenamiento.
