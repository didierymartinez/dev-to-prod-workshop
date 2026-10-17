# 🧩 Tengo una duda — ¿qué sección la resuelve?

El taller es **una sola cadena** ([`SECUENCIA.md`](SECUENCIA.md)), y quien llega de cero la recorre de la 1 en adelante. Pero quien llega con una **duda real** —de una reunión de diseño, de un incidente, de un repo— no tiene por qué empezar en la 1. Esta página es la puerta de entrada por la duda: la buscas en tus palabras, y te dice **dónde se vive** (se rompe y se arregla) y qué te llevas.

Cada número es la posición en la cadena, con enlace a la sección.

> El índice nació de una duda concreta del equipo —el proceso OXP → Impuestos → Contabilidad → ERP— que el taller anterior no cubría. Las posiciones 32–36 y 38 nacieron de ella.

---

## Dudas de un solo agregado

| La duda, como suele sonar | Dónde se vive | Lo que te llevas |
|---|---|---|
| "Si actualizo el registro, ¿pierdo lo que pasó antes?" | ✓ [1](secciones/el-diario-de-una-empresa.md) · ✓ [2](secciones/los-primeros-hechos.md) | Guardar el diario de hechos, no la foto; el estado se reconstruye. |
| "¿La regla va en el handler o en el agregado?" | ✓ [5](secciones/decidir-el-futuro.md) · ✓ [6](secciones/el-command-handler.md) | El agregado decide y emite; el handler solo carga, pide y guarda. |
| "Una acción produce dos hechos y el segundo no ve el primero" | ✓ [10](secciones/un-acto-dos-hechos.md) · ✓ [11](secciones/el-agregado-recuerda.md) | `Emitir` = aplicarse el hecho + acumularlo; un solo guardado. |
| "Dos personas editan lo mismo a la vez y una pisa a la otra" | ✓ [9](secciones/concurrencia-optimista.md) · ✓ [34](secciones/dos-respuestas-a-la-vez.md) · ✓ [45](secciones/el-capstone-fetchforwriting.md) | La versión esperada rechaza el choque; el que pierde recarga y reintenta. |
| "Los tests pasan y el sistema está roto" | ✓ [12](secciones/verde-y-roto.md) · ✓ [22](secciones/el-puerto-propio.md) | Afirmar los hechos emitidos, no el estado; el doble en memoria debe sostener las garantías de producción. |
| "Una caída a mitad de la acción dejó la mitad guardada" | ✓ [15](secciones/todo-o-nada.md) | Una transacción para todos los hechos del acto. |
| "Renombré una clase de evento y la historia ya no carga" | ✓ [14](secciones/el-nombre-es-un-contrato.md) | El nombre persistido es un contrato: estable y elegido a mano. |
| "Agregué un campo al evento y los eventos viejos se leen mal" | ✓ [24](secciones/la-forma-del-hecho-se-congela.md) | Un *upcaster* reconcilia la forma al leer; nunca un `UPDATE` sobre los hechos; no se inventa lo que falta. |
| "Hay que corregir algo que ya pasó" | ✓ [24](secciones/la-forma-del-hecho-se-congela.md) · ✓ [35](secciones/deshacer-en-tres-sistemas.md) | Un hecho correctivo nuevo, nunca reescribir el pasado. |
| "¿Esto merece event sourcing o es un CRUD?" · "¿Los cálculos que repito antes de confirmar son eventos?" | ✓ [21](secciones/merecia-event-sourcing.md) | El criterio: ¿alguien preguntará cómo se llegó aquí? ¿hay una invariante que un `UPDATE` rompería? Un cálculo que se repite antes de decidir no es un hecho; el hecho es la confirmación. |
| "Dos registros con el mismo NIT" · "facturas duplicadas" · "el doble clic creó otro" | ✓ [23](secciones/dos-streams-misma-clave.md) | Unicidad atómica con un localizador (llave de negocio → stream) dentro de la transacción. |

## Dudas de lectura (vistas y proyecciones)

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "¿Cómo consulto 'las suspendidas' sin rejugar todo el diario?" | ✓ [16](secciones/la-vista-de-lectura.md) · ✓ [17](secciones/reconstruir-la-vista.md) | Una vista aparte para el estado de hoy, que se puede borrar y re-derivar. |
| "Registré y no aparece en la lista" · "la validación leyó la vista vieja" | ✓ [19](secciones/el-rezago.md) · ✓ [37](secciones/el-daemon-y-la-consistencia-eventual.md) | La vista va atrás (rezago); no se decide una escritura leyendo una vista asíncrona. |
| "Un evento raro congeló la proyección" | ✓ [20](secciones/el-proyector-tropieza.md) | Apartarlo, dejar rastro y seguir. |
| "Me pidieron otra pregunta y mi vista no sirve" | ✓ [25](secciones/la-vista-por-consulta.md) | El read model se diseña por la consulta, no por el agregado. |
| "¿Quién junta el estado del proceso para mostrarlo?" · "la vista necesita datos de dos streams" | ✓ [38](secciones/el-tablero-cruza-streams.md) | `MultiStreamProjection`: agrupar eventos de varios streams por una llave. |

## Dudas entre contextos (mensajes, integraciones, procesos)

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "Guardé el hecho pero el mensaje no salió" · "salió el mensaje y el hecho no quedó" | ✓ [26](secciones/el-hecho-y-su-anuncio.md) · ✓ [30](secciones/el-outbox.md) | El outbox: el mensaje se guarda en la transacción del hecho y se entrega después. |
| "¿Le mando mi evento interno al otro módulo?" | ✓ [27](secciones/el-evento-publico.md) | Un evento público versionado, en un proyecto que no ve tu dominio. |
| "¿Por qué no hago la cola con una tabla?" | ✓ [28](secciones/el-mensaje-y-la-cola.md) | Lo que trae una cola (ack, reintento, dead-letter, orden) y por qué no se escribe a mano. |
| "El mismo mensaje llegó dos veces y cobré doble" | ✓ [31](secciones/llego-dos-veces.md) | Idempotencia en el consumidor: natural, o dedup por el id del mensaje (no por un dato del negocio). |
| "¿Mando la Base en el mensaje? ¿El otro módulo la guarda?" · "el otro contexto tiene una copia vieja" | ✓ [32](secciones/el-contrato-lleva-lo-justo.md) | El contrato lleva identidad y el hecho del momento; la verdad viva se le pregunta a su dueño. |
| "El mensaje es enorme" | ✓ [32](secciones/el-contrato-lleva-lo-justo.md) | Mandar una referencia y que el consumidor traiga el detalle (*claim-check*). |
| "Mandé a Impuestos y a Contabilidad: ¿ya respondieron? ¿en qué va?" | ✓ [33](secciones/dos-respuestas-ningun-dueno.md) | Estado por integración (SinSolicitar / EnCurso / Aplicado / Rechazado), derivado de hechos. |
| "Las dos respuestas llegan a la vez y una escritura se rechaza (o se pierde)" · "¿una cola con sesión por la llave?" | ✓ [34](secciones/dos-respuestas-a-la-vez.md) | Tres mecanismos con alcances distintos: versión esperada + reintento, índice único, orden por llave en el transporte. |
| "Hay que devolver o anular algo ya transmitido" · "una respuesta nunca llegó" | ✓ [35](secciones/deshacer-en-tres-sistemas.md) | Compensación: un hecho correctivo por sistema; el plazo con un mensaje programado. |
| "¿Saga, orquestador o coreografía?" · "¿necesitamos un 'proceso de OXP'?" | ✓ [36](secciones/el-proceso-tiene-dueno.md) | El proceso como su propio stream; la saga de Wolverine; cuándo un proceso necesita dueño. |
| "En serverless, ¿tengo outbox y daemon?" | ✓ [40](secciones/en-vivo-y-serverless.md) | Sin host de larga vida: proyecciones `Inline` y `SendInline`, que envía tras el commit pero pierde el anuncio si ese envío falla; `ServerlessWithOutbox` conserva la bandeja. |

## Dudas de servicio y operación

| La duda | Dónde se vive | Lo que te llevas |
|---|---|---|
| "¿Cómo entra el comando por HTTP? ¿Por qué la sesión es *scoped*?" | ✓ [39](secciones/el-host-y-la-inyeccion.md) | Host web + inyección; la sesión es una unidad de trabajo por petición. |
| "Un cliente ve datos de otro" · "falta el tenant y no falló" | ✓ [41](secciones/el-contexto-que-falta.md) | Tenancy *conjoined* + fallar fuerte si falta el tenant. |
| "¿Cómo veo qué está pasando, qué se atascó, qué no ha respondido?" | ✓ [19](secciones/el-rezago.md) · ✓ [20](secciones/el-proyector-tropieza.md) · ✓ [33–36](secciones/dos-respuestas-ningun-dueno.md) · ✓ [42](secciones/observar-el-motor-nuevo.md) | Leer el esquema en solo lectura; **CosmosLens** (repo `cosmos-trace`) lo hace por paneles, incluido el panel Proceso entre contextos. |
| "Alguien limpió una línea rara y volvió el bug" | ✓ [43](secciones/el-comentario-que-sobrevive.md) | El comentario nombra el síntoma, no la mecánica; y el aporte va a la librería. |
| "Cada agregado nuevo repite la misma plomería" | ✓ [44](secciones/la-plantilla.md) | La plantilla: `AggregateRoot` + unidad de trabajo + el doble. |

---

## Rutas rápidas

No son otra secuencia: son **qué tramo de la misma cadena** recorrer según de dónde vienes.

| Vienes de… | Recorre | Por qué así |
|---|---|---|
| **Cero en event sourcing** (CRUD, ORM) | De la 1 en adelante, en orden. | Cada sección nace del final de la anterior; saltar deja dolores sin sentir. |
| **Ya trabajas con Marten + Wolverine** (Application Plane) | Lee sin construir 26, 27 y 31 → construye 32–36 y 38 → cierra en 45. | Esas tres traen los dolores que el tramo de procesos da por vividos (dual-write, contrato público, reentrega). El código de partida es el estado al final de 31: los proyectos `Empresas.Historia`, `Contratos` y `Facturacion` con Marten + Wolverine en un host mínimo, armados con los `<details>` de 29–31. |
| **Tienes la duda de OXP** (o una parecida entre módulos) | 32–36 → 38. | Recorren el proceso entero: qué lleva el contrato, el estado de cada integración, la carrera entre respuestas, la compensación, el dueño del proceso y la vista que lo junta. |
| **Revisas diseño** (líder técnico, sin escribir código) | Las de criterio: 21, 27, 31, 34, 36, 40, 43. | Cada una cierra con la decisión y su precio; se leen en 10–15 minutos. |
