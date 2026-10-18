# 🧩 Tengo una duda — ¿qué sección la resuelve?

El taller es **una sola cadena** ([`SECUENCIA.md`](SECUENCIA.md)), y quien llega de cero la recorre de la 1 en adelante. Pero quien llega con una **duda real** —de una reunión de diseño, de un incidente, de un repo— no tiene por qué empezar en la 1. Esta página es la puerta de entrada por la duda: la buscas en tus palabras, y te dice **dónde se vive** (se rompe y se arregla) y qué te llevas.

Cada número es la posición en la cadena, con enlace a la sección.

> El índice nació de una duda concreta del equipo —el proceso OXP → Impuestos → Contabilidad → ERP— que el taller anterior no cubría. Las posiciones 34–39 y 43 nacieron de ella. Las dudas del borde del servicio, de varios hosts, del broker y de varios clientes llegaron después, con los accionables del Application Plane.

---

## Dudas de un solo agregado

| La duda, como suele sonar | Dónde se vive | Lo que te llevas |
|---|---|---|
| "Si actualizo el registro, ¿pierdo lo que pasó antes?" | ✓ [1](secciones/el-diario-de-una-empresa.md) · ✓ [2](secciones/los-primeros-hechos.md) | Guardar el diario de hechos, no la foto; el estado se reconstruye. |
| "¿La regla va en el handler o en el agregado?" | ✓ [5](secciones/decidir-el-futuro.md) · ✓ [6](secciones/el-command-handler.md) | El agregado decide y emite; el handler solo carga, pide y guarda. |
| "Una acción produce dos hechos y el segundo no ve el primero" | ✓ [10](secciones/un-acto-dos-hechos.md) · ✓ [11](secciones/el-agregado-recuerda.md) | `Emitir` = aplicarse el hecho + acumularlo; un solo guardado. |
| "¿Despacho el `Apply` con `dynamic`?" · "un evento sin `Apply` rompe la carga" | ✓ [3](secciones/refactorizando-el-motor.md) · ✓ [11](secciones/el-agregado-recuerda.md) | Un `switch` por tipo que ignora lo desconocido, y un test por hecho que caza al huérfano; con `dynamic`, toda carga lanza. |
| "Dos personas editan lo mismo a la vez y una pisa a la otra" | ✓ [9](secciones/concurrencia-optimista.md) · ✓ [37](secciones/dos-respuestas-a-la-vez.md) · ✓ [69](secciones/el-capstone-fetchforwriting.md) | La versión esperada rechaza el choque; el que pierde recarga y reintenta. |
| "¿Un lock distribuido (Redis) para que no se pisen?" | ✓ [37](secciones/dos-respuestas-a-la-vez.md) | Un lock con tiempo de vida vence antes de guardar y no protege; la versión esperada va siempre, como red. |
| "El usuario guarda sobre datos que otro ya cambió" · "¿ETag e `If-Match`?" | ✓ [70](secciones/la-version-que-vio-el-usuario.md) | La versión que vio el usuario viaja en el `ETag` y el `If-Match` hasta `FetchForWriting`; 412 si cambió, y comparar en un `if` deja abierta la carrera. |
| "Los tests pasan y el sistema está roto" | ✓ [12](secciones/verde-y-roto.md) · ✓ [22](secciones/el-puerto-propio.md) | Afirmar los hechos emitidos, no el estado; el doble en memoria debe sostener las garantías de producción. |
| "Una caída a mitad de la acción dejó la mitad guardada" | ✓ [15](secciones/todo-o-nada.md) | Una transacción para todos los hechos del acto. |
| "Renombré una clase de evento y la historia ya no carga" | ✓ [14](secciones/el-nombre-es-un-contrato.md) · ✓ [31](secciones/el-swap-por-reconocimiento.md) | El nombre persistido es un contrato: estable y elegido a mano; en Marten, `AddEventType` y `MapEventType`, con un test que fija los alias. |
| "Agregué un campo al evento y los eventos viejos se leen mal" · "¿un Value Object dentro del evento?" | ✓ [26](secciones/la-forma-del-hecho-se-congela.md) | Un *upcaster* reconcilia la forma al leer; nunca un `UPDATE` sobre los hechos; no se inventa lo que falta. El hecho lleva primitivos: rehidratar no valida. |
| "Hay que corregir algo que ya pasó" | ✓ [26](secciones/la-forma-del-hecho-se-congela.md) · ✓ [38](secciones/deshacer-en-tres-sistemas.md) | Un hecho correctivo nuevo, nunca reescribir el pasado. |
| "¿Esto merece event sourcing o es un CRUD?" · "¿Los cálculos que repito antes de confirmar son eventos?" | ✓ [21](secciones/merecia-event-sourcing.md) | El criterio: ¿alguien preguntará cómo se llegó aquí? ¿hay una invariante que un `UPDATE` rompería? Un cálculo que se repite antes de decidir no es un hecho; el hecho es la confirmación. Y lo plano también lleva versión en el `WHERE`. |
| "Dos registros con el mismo NIT" · "facturas duplicadas" · "el doble clic creó otro" | ✓ [23](secciones/dos-streams-misma-clave.md) · ✓ [31](secciones/el-swap-por-reconocimiento.md) | Unicidad atómica con un localizador (llave de negocio → stream) dentro de la transacción; en Marten, un documento con `session.Insert`. |
| "Una regla que cruza muchos agregados" · "la jerarquía cerró un ciclo" · "la inactivación en cascada dejó una filial activa" | ✓ [24](secciones/el-arbol-de-empresas.md) · ✓ [25](secciones/la-rama-entera.md) | Una frontera de consistencia que contenga la regla (el stream del grupo), un recorrido que anota lo visitado, y el acto decidido dentro de esa frontera. |
| "El agregado tarda en cargar porque tiene miles de eventos" · "¿snapshot?" | ✓ [62](secciones/el-stream-que-no-para-de-crecer.md) | Un snapshot `Inline` leído con `FetchLatest`; uno `Async` decide sobre algo viejo; pasado el umbral, acortar o partir el stream. |

## Dudas de lectura (vistas y proyecciones)

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "¿Cómo consulto 'las suspendidas' sin rejugar todo el diario?" | ✓ [16](secciones/la-vista-de-lectura.md) · ✓ [17](secciones/reconstruir-la-vista.md) | Una vista aparte para el estado de hoy, que se puede borrar y re-derivar. |
| "Registré y no aparece en la lista" · "la validación leyó la vista vieja" | ✓ [19](secciones/el-rezago.md) · ✓ [40](secciones/el-daemon-y-la-consistencia-eventual.md) | La vista va atrás (rezago); no se decide una escritura leyendo una vista asíncrona; esperar a la vista vale para leer, no para decidir. |
| "Un evento raro congeló la proyección" · "el `Apply` lanza con un evento válido" | ✓ [20](secciones/el-proyector-tropieza.md) | Apartarlo, dejar rastro y seguir; y si lanza tu `Apply`, hacerlo total. |
| "Me pidieron otra pregunta y mi vista no sirve" | ✓ [27](secciones/la-vista-por-consulta.md) | El read model se diseña por la consulta, no por el agregado. |
| "¿Proyección `Inline` o `Async`?" · "el GET por id rehidrata el agregado de escritura" | ✓ [41](secciones/la-vista-en-la-misma-transaccion.md) | `Inline` si alguien lee justo después de escribir, `Async` si es para mostrar; el porqué, escrito junto al registro. |
| "¿Valido la unicidad con un `Any` sobre la vista?" | ✓ [41](secciones/la-vista-en-la-misma-transaccion.md) · ✓ [56](secciones/probar-que-aisla.md) | La vista no es un candado: el índice único del store, en la transacción del hecho, y por tenant. |
| "Registré una proyección `Async` y nunca se llena" | ✓ [41](secciones/la-vista-en-la-misma-transaccion.md) | Sin daemon no avanza, y nada falla: solo un warning al arrancar. |
| "Agregué un campo a la vista y los documentos viejos no lo tienen" · "¿cómo reconstruyo una proyección en Marten?" | ✓ [42](secciones/reconstruir-con-el-daemon.md) | `RebuildProjectionAsync` en un daemon armado a demanda, ensayado en un test; nunca borrar a mano en `psql`. Y sin reloj en el `Apply`. |
| "¿Quién junta el estado del proceso para mostrarlo?" · "la vista necesita datos de dos streams" | ✓ [43](secciones/el-tablero-cruza-streams.md) | `MultiStreamProjection`: agrupar eventos de varios streams por una llave, con una regla barata. |
| "Tenemos proyecciones que nadie consulta" | ✓ [43](secciones/el-tablero-cruza-streams.md) | Cada vista le cuesta trabajo al daemon: la que nadie lee se retira, si otra responde lo mismo. |

## Dudas entre contextos (mensajes, integraciones, procesos)

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "Guardé el hecho pero el mensaje no salió" · "salió el mensaje y el hecho no quedó" · "¿`SaveChangesAsync` y luego publico?" | ✓ [28](secciones/el-hecho-y-su-anuncio.md) · ✓ [32](secciones/el-outbox.md) | El outbox: el mensaje se guarda en la transacción del hecho y se entrega después; un commit a mano dentro del handler vuelve al dual-write. |
| "¿Le mando mi evento interno al otro módulo?" · "¿un contrato con `object Datos`?" | ✓ [29](secciones/el-evento-publico.md) | Un evento público versionado, en un proyecto que no ve tu dominio; un `object` adentro anula ese límite. |
| "¿Por qué no hago la cola con una tabla?" | ✓ [30](secciones/el-mensaje-y-la-cola.md) | Lo que trae una cola (ack, reintento, dead-letter, orden) y por qué no se escribe a mano. |
| "El mismo mensaje llegó dos veces y cobré doble" · "el mismo pago llegó en dos mensajes" | ✓ [33](secciones/llego-dos-veces.md) | Idempotencia en el consumidor: natural, o dedup por la llave que identifica lo repetido (el sobre para la reentrega, la referencia del origen para el acto repetido). |
| "¿Mando la Base en el mensaje? ¿El otro módulo la guarda?" · "el otro contexto tiene una copia vieja" | ✓ [34](secciones/el-contrato-lleva-lo-justo.md) | El contrato lleva identidad y el hecho del momento; la verdad viva se le pregunta a su dueño. |
| "Guardo una copia de los datos de otro módulo: ¿cómo la mantengo al día?" · "la copia no tiene la fila y respondió vacío" | ✓ [35](secciones/la-replica-suscrita.md) | Réplica suscrita: el dueño anuncia cada cambio con una versión que crece, la copia guarda lo más nuevo y, sin fila, pregunta o falla. |
| "El mensaje es enorme" | ✓ [34](secciones/el-contrato-lleva-lo-justo.md) | Mandar una referencia y que el consumidor traiga el detalle (*claim-check*). |
| "Mandé a Impuestos y a Contabilidad: ¿ya respondieron? ¿en qué va?" | ✓ [36](secciones/dos-respuestas-ningun-dueno.md) | Estado por integración (SinSolicitar / EnCurso / Aplicado / Rechazado), derivado de hechos. |
| "El otro sistema manda fechas en texto" · "una fecha ilegible quedó como hoy" | ✓ [36](secciones/dos-respuestas-ningun-dueno.md) | Se lee una vez, en el borde, con formato y cultura fijos; lo ilegible se señala, no se rellena. |
| "Las dos respuestas llegan a la vez y una escritura se rechaza (o se pierde)" · "¿una cola con sesión por la llave?" | ✓ [37](secciones/dos-respuestas-a-la-vez.md) | Tres mecanismos con alcances distintos: versión esperada + reintento, índice único, orden por llave en el transporte. |
| "Hay que devolver o anular algo ya transmitido" · "una respuesta nunca llegó" · "un timeout se tomó como un rechazo" | ✓ [38](secciones/deshacer-en-tres-sistemas.md) | Compensación: un hecho correctivo por sistema; el plazo con un mensaje programado; un no lo da solo una regla, y lo pasajero se reintenta. |
| "¿Saga, orquestador o coreografía?" · "¿necesitamos un 'proceso de OXP'?" | ✓ [39](secciones/el-proceso-tiene-dueno.md) | El proceso como su propio stream; la saga de Wolverine; cuándo un proceso necesita dueño. |
| "Publiqué a RabbitMQ y nadie lo recibió" · "¿cómo nombro exchanges y colas?" | ✓ [52](secciones/el-broker-de-verdad.md) | El exchange lleva el nombre del contexto, igual en todos sus hosts; cada interesado lee de su cola. |
| "¿`AutoProvision` en producción?" · "el consumidor se cayó y perdió mensajes" · "con el broker caído se perdió el anuncio" · "llegó dos veces por dos rutas" | ✓ [53](secciones/lo-que-el-broker-no-promete.md) | La topología la crea la infraestructura; inbox durable al recibir, `UseDurableOutbox()` al enviar, y una sola ruta por mensaje. |
| "La pantalla avisó éxito y después se revirtió" · "¿SSE?" | ✓ [54](secciones/en-vivo-y-serverless.md) | La UI se entera de lo confirmado, con un contrato tipado; el empuje nunca sale de un `Apply`. |
| "En serverless, ¿tengo outbox y daemon?" | ✓ [54](secciones/en-vivo-y-serverless.md) | Sin host de larga vida: proyecciones `Inline` (y alguien que las rearme) y `SendInline`, que envía tras el commit pero pierde el anuncio si ese envío falla; `ServerlessWithOutbox` conserva la bandeja. |

## Dudas del borde del servicio (HTTP)

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "¿Cómo entra el comando por HTTP? ¿Por qué la sesión es *scoped*?" · "¿abro mi propia sesión en el handler?" | ✓ [44](secciones/el-host-y-la-inyeccion.md) | Host web + inyección; una sesión por petición y una por mensaje, nunca compartida ni abierta por el handler. |
| "¿Dejo un endpoint para limpiar la base?" | ✓ [44](secciones/el-host-y-la-inyeccion.md) | Solo en Development y con un valor que lo prende; el diario no se borra. |
| "¿Dónde pongo la cadena de conexión y las claves?" · "subí una contraseña al repo" | ✓ [15](secciones/todo-o-nada.md) · ✓ [45](secciones/la-configuracion-viene-de-afuera.md) | Fuera del código: user-secrets, variables de entorno o `/run/secrets`; en el repo solo la forma; lo que tocó git se rota. |
| "El servicio arrancó sano y falló en el primer pedido por un valor que faltaba" · "un plazo fijo en el código" | ✓ [45](secciones/la-configuracion-viene-de-afuera.md) | Lo obligatorio se valida al arrancar (`ValidateOnStart`), y vacío cuenta como nada. |
| "Hice el POST y el GET da 404" · "no veo lo que acabo de pedir" | ✓ [46](secciones/lo-que-acabas-de-pedir.md) | `202` + `Location`; el diario dice si existe, para responder «en proceso» en vez de «no existe». |
| "El cliente reintenta el POST y se duplicó" | ✓ [46](secciones/lo-que-acabas-de-pedir.md) | El reintento lleva una `Idempotency-Key` que el servidor usa como la referencia del acto. |
| "La respuesta dice 200 y está desactualizada" · "un total incompleto con 200" · "el listado no tiene tope" | ✓ [47](secciones/la-respuesta-dice-cuanto-sabe.md) | La respuesta dice cuánto sabe (`X-Rezago`), un vacío no es un cero, y el listado va en páginas de tamaño fijo. |
| "Un duplicado responde 500" · "el error le muestra al cliente el stack" · "expongo la historia de eventos por HTTP" | ✓ [48](secciones/el-borde-es-un-contrato.md) | `ProblemDetails`: 409 para el conflicto, el `traceId` al cliente y el detalle al log; la historia sale por un tipo propio con el alias del hecho. |
| "El usuario dice que no pasó nada: ¿cómo sigo su pedido?" · "¿qué logueo?" | ✓ [49](secciones/seguir-una-accion.md) | Un `X-Correlation-Id` que viaja en cada mensaje y queda en cada hecho; un Warning en cada descarte; ids en el log, no el payload. |

## Dudas de varios procesos y de varios clientes

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "Tengo una API y un worker que escriben en el mismo store" · "un host migró el esquema y rompió al otro" | ✓ [50](secciones/dos-hosts-una-configuracion.md) | Una sola función de configuración para todos los hosts; cada uno dice su papel: quién corre el daemon y quién es dueño de las tablas. |
| "Los tests pasan y producción falla con la misma regla" · "la fábrica de tests arma su propio store" | ✓ [51](secciones/el-arnes-usa-la-misma-configuracion.md) | El arnés arranca con la misma función que el servicio, y un test de aceptación por el bus protege la configuración. |
| "Un cliente ve datos de otro" · "falta el tenant y no falló" | ✓ [55](secciones/el-contexto-que-falta.md) | Tenancy *conjoined* + fallar fuerte si falta el tenant; el sobre lleva el tenant a cada handler. |
| "¿Cómo pruebo que un cliente no ve los datos de otro?" · "el índice único choca entre clientes" | ✓ [56](secciones/probar-que-aisla.md) | Un test de dos tenants que comparten un dato, con la configuración del servicio; toda reserva, por tenant. |
| "¿De dónde saco el tenant? ¿Basta el header `X-Tenant-Id`?" · "la pantalla en vivo de un cliente ve lo de otro" | ✓ [57](secciones/el-tenant-viene-firmado.md) | Del claim de un token firmado; el borde es fail-closed; un canal en vivo por tenant; la historia guarda el `sub`. |
| "Un job que se reprograma solo dejó de correr" · "el job corre una vez por réplica" | ✓ [58](secciones/el-trabajo-que-nadie-pidio.md) | Separar el disparo del trabajo, y un cron con un agente único en el clúster. |
| "El job de fondo no tiene tenant" · "una tabla propia mezcla los datos de dos clientes" | ✓ [59](secciones/el-cobro-de-cada-tenant.md) | Un trabajo por tenant, con el tenant en el sobre; toda llave que nace de un dato de otro contexto lleva el tenant. |

## Dudas de operación y de la plantilla

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "¿Cómo veo qué está pasando, qué se atascó, qué no ha respondido?" | ✓ [19](secciones/el-rezago.md) · ✓ [20](secciones/el-proyector-tropieza.md) · ✓ [36–39](secciones/dos-respuestas-ningun-dueno.md) · ✓ [60](secciones/observar-el-motor-nuevo.md) | Leer el esquema en solo lectura; **CosmosLens** (repo `cosmos-trace`) lo hace por paneles, incluido el panel Proceso entre contextos. |
| "Declaré un índice y las consultas siguen lentas" | ✓ [60](secciones/observar-el-motor-nuevo.md) | Lo declarado se comprueba contra la base, con `pg_indexes` y `EXPLAIN`. |
| "Nadie se entera de que el daemon se detuvo" · "¿un health check del rezago?" | ✓ [61](secciones/que-el-servicio-avise.md) | Un health check que se degrada sobre un umbral declarado; su historia, como métrica. |
| "Alguien limpió una línea rara y volvió el bug" | ✓ [63](secciones/el-comentario-que-sobrevive.md) | El comentario nombra el síntoma, no la mecánica; un test le pregunta al host si tiene la línea; y el aporte va a la librería. |
| "Cada agregado nuevo repite la misma plomería" | ✓ [64](secciones/la-plantilla.md) | La plantilla: `AggregateRoot` + unidad de trabajo. |
| "¿Cómo pruebo los agregados sin base de datos, y cómo sé que el doble no miente?" · "¿`Apply` privados?" | ✓ [65](secciones/la-plantilla-se-prueba.md) | Un doble que rehidrata con lo que ve Marten (los `Apply` públicos), fijado por un test de contrato contra Postgres. |
| "El README de la librería no coincide con el código" | ✓ [66](secciones/el-readme-que-compila.md) | Un README sin código ni versiones, que dice cuándo no usarla y señala un ejemplo que es un test. |
| "La unidad de trabajo confirma por su cuenta dentro del handler" | ✓ [67](secciones/la-plantilla-dentro-del-handler.md) | Dentro de un handler confirma Wolverine; un middleware vuelca la unidad de trabajo, y un test lo vigila. |
| "`Cargar` devuelve null y revienta lejos" · "dos pasos del mismo mensaje cargan la misma entidad" | ✓ [68](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) | La unidad de trabajo devuelve lo que ya tiene, y falla en la puerta si el stream no existe. |

---

## Rutas rápidas

No son otra secuencia: son **qué tramo de la misma cadena** recorrer según de dónde vienes.

| Vienes de… | Recorre | Por qué así |
|---|---|---|
| **Cero en event sourcing** (CRUD, ORM) | De la 1 en adelante, en orden. | Cada sección nace del final de la anterior; saltar deja dolores sin sentir. |
| **Ya trabajas con Marten + Wolverine** (Application Plane) | Lee sin construir 28, 29 y 33 → construye 34–39 y 43. El tramo 64–70 (la plantilla y el capstone) parte del servicio de 44–63: recórrelo en orden si vas a mantener la librería. | Esas tres traen los dolores que el tramo de procesos da por vividos (dual-write, contrato público, reentrega). El código de partida es el estado al final de 33: los proyectos `Empresas.Historia`, `Contratos` y `Facturacion` con Marten + Wolverine en un host mínimo, armados con los `<details>` de 31–33. |
| **Tienes la duda de OXP** (o una parecida entre módulos) | 34–39 → 43. | Recorren el proceso entero: qué lleva el contrato, la copia suscrita, el estado de cada integración, la carrera entre respuestas, la compensación, el dueño del proceso y la vista que lo junta. |
| **Llevas un servicio a producción** | 44–53 → 57 → 60–61. | El borde (configuración, `202`, errores, correlación), varios hosts con una configuración, el broker de verdad, el tenant firmado, y observar y alertar. Cada una parte del código de la anterior. |
| **Atiendes a varias organizaciones** | 55–59. | El tenant que falta, la prueba de que aísla, el tenant firmado y el trabajo de fondo por tenant. |
| **Revisas diseño** (líder técnico, sin escribir código) | Las de criterio: 21, 24, 29, 33, 37, 39, 41, 53, 54, 62, 63. | Cada una cierra con la decisión y su precio; se leen en 10–15 minutos. |
