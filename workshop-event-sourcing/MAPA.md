# 🗺️ Mapa del taller — qué construyes en cada sección (y qué aprendes)

> 📖 ¿Buscas el **panorama como relato** (sin código, de corrido)? → [`NARRATIVA.md`](NARRATIVA.md). Este mapa es la **referencia por sección**: qué construyes y qué aprendes en cada una.

Este taller es **hands-on**: en cada sección **te reto a escribir el código tú mismo** (te describo qué construir, lo intentas, y luego revelo una forma de hacerlo en un bloque `<details>`). Lo que es idioma nuevo de C# —demasiado para inventarlo de cero— **se te muestra** directamente.

## El norte (v7)

El norte del taller es entender la **conexión de cada pieza** de `Cosmos.BuildingBlocks` a fondo —para **usarla, mantenerla y extenderla con criterio**, no por fe en la doc—. Por eso construimos **a mano** un motor de event sourcing: es un **andamio deliberado**. La librería nació sobre la Critter Stack (Marten **9.2.1** / Wolverine **6.1.0**); invertimos el orden a propósito, para que cuando la herramienta te dé algo hecho, sepas exactamente qué hace por debajo, porque lo escribiste tú. El caso emblemático del criterio: decidir si adoptar (o no) `FetchForWriting`.

> **Estado:** la cadena tiene **70 secciones**, todas escritas y verificadas. El **motor a mano** va de §1 a §30; en §31 se adopta Marten/Wolverine **por reconocimiento**, y la cadena sigue —servicio, procesos entre contextos, broker, multi-tenancy, operación— hasta la plantilla y el capstone. El orden real vive en la cadena `⬅️/➡️` de cada archivo; el dolor del que nace cada sección está en [`SECUENCIA.md`](SECUENCIA.md).

---

## Lo construido

Las **70 secciones** del taller, en orden (sigue los ➡️ de cada archivo):

1. **[El diario de una empresa](secciones/el-diario-de-una-empresa.md)** — sección conceptual (sin código): guardar el **diario** de hechos en vez de la **foto** del estado. Aprendes qué es **Event Sourcing** y por qué un `UPDATE` destruye el pasado que el diario conserva.

2. **[Los primeros hechos](secciones/los-primeros-hechos.md)** — escribes los primeros eventos como `record` inmutables y reconstruyes el estado con un `foreach` (el **Replay**). Aprendes que el estado **no se guarda, se reconstruye** (el paso `evolve`), dentro de un **Aggregate Root**.

3. **[Refactorizando el motor](secciones/refactorizando-el-motor.md)** — refactorizas el motor de replay en tres pasos: separar recorrer de aplicar, subirlo a una clase base **`AggregateRoot`**, y rutear por tipo con un `switch`. Aprendes separación de responsabilidades, herencia y **pattern matching** — un motor que crece sin volverse un `if` interminable.

4. **[El flujo de vida (EventStream)](secciones/el-flujo-de-vida.md)** — envuelves la historia de una empresa en un `EventStream<T>` genérico, dueño de su lista, con `Append` (anotar) y `Get` (rehidratar). Aprendes el patrón **Repositorio** y qué es un **Event Stream** (la historia de UNA empresa).

5. **[Decidir el futuro (emitir eventos)](secciones/decidir-el-futuro.md)** — le das a la `Empresa` métodos `decide` (`CambiarPlan`/`Suspender`/`Reactivar`) que **devuelven** el hecho sin tocar el estado, con validación e idempotencia. Aprendes que **decidir ≠ aplicar** y a distinguir lo **inválido** (se rechaza) de lo **redundante** (se ignora).

6. **[El Command Handler](secciones/el-command-handler.md)** — encapsulas el ciclo **cargar → actuar → guardar** en una clase handler **por comando**. Aprendes a sacar la logística del `Program.cs` a una pieza con un solo trabajo (responsabilidad única), dejando la lógica de negocio en el agregado.

7. **[El despachador: dado un comando, encuentra su handler](secciones/el-despachador.md)** — construyes un `Despachador` (tabla `tipo → handler`) que rutea cualquier comando a su handler. Al hacerlo **nacen** el **`record` por comando** (identidad de tipo) y el contrato **`ICommandHandler<T>`** — en su momento de necesidad.

8. **[El almacén: un cajón por empresa](secciones/el-almacen-por-id.md)** — construyes el `EventStore` (un cajón de hechos por id) y haces que el handler abra el stream por el `EmpresaId` del comando. Aprendes el patrón **Event Store** y que **el id es la llave**: handlers registrados una sola vez sirven a todas las empresas.

9. **[Cuando dos escriben a la vez (concurrencia optimista)](secciones/concurrencia-optimista.md)** — envuelves cada hecho en un sobre `EventoAlmacenado(Version, …)` y el almacén rechaza un `Append` cuya posición ya está ocupada. Aprendes el dolor de la **actualización perdida** y la **concurrencia optimista** (no bloquear; verificar la versión al guardar).

10. **[Un acto de negocio, dos hechos](secciones/un-acto-dos-hechos.md)** — montas una acción (pagar y reactivar) que produce **dos** hechos y la corres hasta el muro: el segundo `decide` decide a ciegas. Aprendes por qué el modelo en que `decide` **devuelve** el hecho no puede expresar un acto de varios hechos.

11. **[El agregado recuerda lo que decide](secciones/el-agregado-recuerda.md)** — haces que `Emitir` aplique y acumule cada hecho, y que la acción se guarde con **un solo** `Append`. Aprendes los **cambios sin confirmar** del agregado y por qué un hecho huérfano miente en silencio.

12. **[Verde, y roto](secciones/verde-y-roto.md)** — escribes tu primer **test automatizado** del agregado y afirmas los **hechos emitidos**, no solo el estado. Aprendes a distinguir un test que te protege de uno decorativo. *(Nace el arnés de tests.)*

13. **[El diario en disco (y lo que se queda afuera)](secciones/el-diario-en-disco.md)** — persistes la historia de cada empresa en disco para que sobreviva al reinicio. Aprendes que, al serializar, se pierde el **tipo** del hecho.

14. **[El nombre del hecho es un contrato](secciones/el-nombre-es-un-contrato.md)** — le das a cada evento un **nombre estable**, independiente del nombre de su clase. Aprendes que renombrar una clase no puede dejar ilegible la historia ya guardada.

15. **[Todo o nada: el diario en una base de datos real](secciones/todo-o-nada.md)** — pasas el diario a PostgreSQL a mano (transacción + `PRIMARY KEY`), con la cadena de conexión en una variable de entorno. Aprendes **atomicidad** —una acción de varios hechos queda entera o no queda— y que un secreto que tocó git se rota.

16. **[La pregunta que el diario no sabe responder](secciones/la-vista-de-lectura.md)** — creas una **vista de lectura** aparte para responder "¿cuáles están suspendidas ahora?" sin rejugar el diario. Aprendes a separar la lectura de la escritura (**CQRS**).

17. **[Rejugar el diario: reconstruir la vista](secciones/reconstruir-la-vista.md)** — borras la vista y la re-derivas del diario cuando cambia de forma o se desincroniza. Aprendes que una vista es **desechable**: la fuente de la verdad es el diario.

18. **[La vista se mantiene sola](secciones/la-vista-se-mantiene-sola.md)** — construyes un **proyector** que deriva la vista del diario desde un **checkpoint**, y el handler deja de tocarla. Aprendes el **async**, vivido a mano, y por qué mantener la vista en el handler es un dual-write frágil.

19. **[El rezago: ¿cuánto atrás va la vista?](secciones/el-rezago.md)** — mides cuánto atrás va la vista respecto del diario. Aprendes la **consistencia eventual**, sentida, y por qué no se decide leyendo la vista. *(Monitor: rezago.)*

20. **[El proyector tropieza](secciones/el-proyector-tropieza.md)** — apartas a una tabla de fallos el hecho que el proyector no puede digerir, dejas rastro y sigues. Aprendes el **dead-letter**, y que apartar no cura cuando lo que falla es tu `Aplicar`: la cura es un `Aplicar` total. *(Monitor: fallos.)*

21. **[¿Merecía event sourcing?](secciones/merecia-event-sourcing.md)** — creas el catálogo `Plan` como lo que es: una tabla plana, con la versión leída en el `WHERE`. Aprendes el criterio para decirle **no** al event sourcing, y que plano no es sin concurrencia.

22. **[El puerto propio](secciones/el-puerto-propio.md)** — extraes `IEventStore` con dos implementaciones: Postgres y un doble en memoria. Aprendes **puertos y adaptadores** y lo que cobran: el doble debe sostener las garantías de producción o el verde miente.

23. **[Dos streams, la misma clave](secciones/dos-streams-misma-clave.md)** — garantizas un NIT único con un `localizador` (PK del NIT) dentro de la transacción. Aprendes que una invariante **entre** streams necesita su propia reserva atómica, y la idempotencia del doble clic.

24. **[El árbol de empresas](secciones/el-arbol-de-empresas.md)** — modelas los grupos empresariales con el stream `GrupoEmpresarial` y un recorrido que anota lo visitado. Aprendes que una regla de conjunto ("sin ciclos") necesita una **frontera de consistencia**: el agregado.

25. **[La rama entera](secciones/la-rama-entera.md)** — inactivas una matriz con sus filiales decidiendo el acto **dentro** del stream del grupo. Aprendes que un acto sobre muchas empresas tiene la frontera de la regla que protege, y que el hecho guarda la lista decidida.

26. **[La forma del hecho se congela](secciones/la-forma-del-hecho-se-congela.md)** — escribes un **upcaster** que lee los hechos viejos con la forma de hoy, sin reescribir el disco. Aprendes **versionado de eventos** y por qué el hecho lleva primitivos. *(Nace el arnés de integración contra Postgres.)*

27. **[La vista por consulta](secciones/la-vista-por-consulta.md)** — creas un segundo read model, una fila por pago, con su propio checkpoint. Aprendes que el read-side es un **catálogo de vistas**, cada una diseñada por su pregunta.

28. **[El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md)** — guardas la intención de anunciar en la misma transacción del hecho (`bandeja_salida`) y la entregas aparte, con reintento. Aprendes el **dual-write** y el patrón **outbox**, a mano.

29. **[El evento público](secciones/el-evento-publico.md)** — publicas un **evento público** versionado, desde un proyecto `Contratos` que no ve tu dominio. Aprendes a separar el evento interno del contrato de integración, con un límite de **compilación**.

30. **[El mensaje y la cola](secciones/el-mensaje-y-la-cola.md)** — llevas el anuncio por una **cola** a mano, hasta el *claim* con `FOR UPDATE SKIP LOCKED`. Aprendes qué garantías da una cola y por qué armar el resto a mano es reescribir un broker. **Aquí termina el motor a mano.**

31. **[El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md)** — cambias tu diario por **Marten** sobre la misma Postgres, reconociendo cada pieza que construiste. Aprendes qué reemplaza la librería (streams, concurrencia, rehidratación) y qué no pone sola (el NIT único, los nombres estables).

32. **[El outbox](secciones/el-outbox.md)** — adoptas el **outbox de Wolverine**: el hecho y su mensaje en la misma transacción, con entrega durable. Aprendes que Wolverine es también tu despachador, y que un `SaveChangesAsync` a mano en el handler te devuelve al dual-write.

33. **[Llegó dos veces](secciones/llego-dos-veces.md)** — haces idempotente al consumidor: natural, o deduplicando por la llave que identifica lo repetido. Aprendes que el transporte es **at-least-once** y por qué exactly-once es caro.

34. **[El contrato lleva lo justo](secciones/el-contrato-lleva-lo-justo.md)** — el contrato lleva solo el hecho del momento, y Facturación le **pregunta al dueño** la verdad de hoy (`InvokeAsync<T>`). Aprendes la diferencia entre **anunciar** y **consultar**, y el *claim-check* para cuando el mensaje pesa.

35. **[La réplica suscrita](secciones/la-replica-suscrita.md)** — Facturación mantiene su propia copia de los planes, suscrita a cada cambio, con una versión que solo crece. Aprendes la **réplica suscrita** y las cuatro formas en que una copia falla sin error.

36. **[Dos respuestas, ningún dueño](secciones/dos-respuestas-ningun-dueno.md)** — cada socio responde con un contrato, y Empresas deriva el **estado por integración**. Aprendes a saber si un proceso entre contextos se cumplió, y a leer lo que llega de afuera una sola vez, en el borde. *(Monitor: procesos.)*

37. **[Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md)** — proteges la suspensión de dos respuestas simultáneas con versión esperada + reintento, índice único y orden por llave. Aprendes tres mecanismos de concurrencia de alcance distinto, y por qué un lock con tiempo de vida no protege.

38. **[Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md)** — echas atrás una suspensión ya ejecutada con un hecho nuevo en cada sistema, y vences el plazo con `DelayedFor`. Aprendes **compensación**, el huérfano y que vencer no es fallar.

39. **[El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md)** — le das al proceso su propio stream (`SuspensionDeEmpresa`) con **correlación** en cada pedido y respuesta. Aprendes el **process manager**, la **saga** de Wolverine y el criterio **coreografía vs orquestación**.

40. **[El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md)** — mueves tu vista al **daemon** de Marten y la fijas en un test con el daemon vivo. Aprendes a declarar, medir y operar la consistencia eventual (`Async`, rezago, `DaemonMode`). *(Monitor: rezago.)*

41. **[La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md)** — creas una proyección **`Inline`**, que Marten escribe en la transacción del hecho. Aprendes a elegir, y dejar escrito, el ciclo de vida de cada vista, y que una vista no es un candado.

42. **[Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md)** — rearmas cualquier vista con `RebuildProjectionAsync` en un daemon armado a demanda, y lo ensayas en un test. Aprendes que rearmar solo sirve si la proyección es función de sus hechos.

43. **[El tablero cruza streams](secciones/el-tablero-cruza-streams.md)** — construyes un tablero con una **`MultiStreamProjection`** que junta la empresa y su proceso. Aprendes la **regla de identidad** de una vista multi-stream y la guarda de correlación. *(Monitor: rezago del tablero.)*

44. **[El host y la inyección](secciones/el-host-y-la-inyeccion.md)** — montas un host web (ASP.NET Core) que recibe comandos por HTTP y arma las piezas por **inyección de dependencias**. Aprendes el ciclo de vida de la sesión: una `IDocumentSession` por operación.

45. **[La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md)** — sacas el plazo y la cadena de conexión del código a la configuración del host, validada al arrancar. Aprendes `appsettings.json`, user-secrets, variables de entorno y `ValidateOnStart`.

46. **[Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md)** — respondes `202` + `Location`, distingues «todavía no» de «no existe» y aceptas un `Idempotency-Key`. Aprendes a contestar por HTTP un pedido que se resuelve después.

47. **[La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md)** — cada lectura de una vista dice cuántos hechos le faltan (`X-Rezago`), y los listados van en páginas de tamaño fijo. Aprendes a mostrar la consistencia eventual en la respuesta.

48. **[El borde es un contrato](secciones/el-borde-es-un-contrato.md)** — devuelves errores con forma (`ProblemDetails`, 409, `traceId`) y la historia por un tipo propio. Aprendes que la respuesta HTTP es un contrato que no cuenta tu interior.

49. **[Seguir una acción](secciones/seguir-una-accion.md)** — propagas un `X-Correlation-Id` por Wolverine y Marten, y logueas con propiedades nombradas, sin el payload. Aprendes **correlación** y logs con los que se sigue un pedido.

50. **[Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md)** — extraes una función de configuración que llaman todos los hosts, y cada uno declara solo su papel. Aprendes a correr varios procesos sobre el mismo diario (quién corre el daemon, quién es dueño de las tablas).

51. **[El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md)** — arrancas el host de los tests con la misma función que el servicio y fijas un test de aceptación por el bus. Aprendes que un verde solo habla de tu servicio si el arnés lleva su configuración.

52. **[El broker de verdad](secciones/el-broker-de-verdad.md)** — llevas los anuncios por RabbitMQ (en Docker) a otro proceso, con el exchange del **contexto**. Aprendes exchanges, colas y bindings, y a validar las credenciales del broker al arrancar.

53. **[Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md)** — verificas tu cola al arrancar, usas **inbox** y outbox durables y una sola ruta por mensaje. Aprendes qué no garantiza un broker y quién crea la topología.

54. **[En vivo y serverless](secciones/en-vivo-y-serverless.md)** — empujas a una pantalla, con **SSE**, lo confirmado y no lo pedido, y razonas **serverless**, sin un host de larga vida. Aprendes qué cambia del daemon y del outbox cuando no hay host. *(Serverless va como criterio.)*

55. **[El contexto que falta](secciones/el-contexto-que-falta.md)** — atiendes a dos organizaciones en la misma base con **tenancy conjoined**, y fallas si una petición no trae tenant. Aprendes **multi-tenancy** y que el sobre lleva el tenant a cada handler. *(Monitor: por cliente.)*

56. **[Probar que aísla](secciones/probar-que-aisla.md)** — corres los tests con un tenant y agregas uno de **dos tenants** que caza la fuga. Aprendes a declarar cada reserva por tenant.

57. **[El tenant viene firmado](secciones/el-tenant-viene-firmado.md)** — sacas el tenant y el usuario de un **JWT** firmado, con un borde que cierra por defecto. Aprendes a confiar solo en lo que puedes verificar, y un canal en vivo por tenant.

58. **[El trabajo que nadie pidió](secciones/el-trabajo-que-nadie-pidio.md)** — programas el cobro del mes con un **cron** de Wolverine y separas el disparo del trabajo. Aprendes trabajos recurrentes con un agente único en el clúster.

59. **[El cobro de cada tenant](secciones/el-cobro-de-cada-tenant.md)** — el disparo recorre los tenants y manda un trabajo por cada uno. Aprendes que toda llave que nace de un dato de otro contexto lleva el tenant.

60. **[Observar el motor nuevo](secciones/observar-el-motor-nuevo.md)** — lees en solo lectura el esquema de Marten y Wolverine (streams, rezago, dead letters, crons) y compruebas lo declarado con `pg_indexes` y `EXPLAIN`. Aprendes observabilidad **agentless**: lo que hace CosmosLens por paneles.

61. **[Que el servicio avise](secciones/que-el-servicio-avise.md)** — agregas un **health check** que responde `Degraded` cuando el rezago pasa un umbral, y su métrica. Aprendes que diagnosticar desde afuera no reemplaza avisar desde adentro.

62. **[El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md)** — mides cuánto cuesta rehidratar un stream largo y lo curas con un **snapshot `Inline`** leído con `FetchLatest`. Aprendes cuándo la salida es otra: acortar o partir el stream.

63. **[El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md)** — proteges las líneas que cargan peso con un comentario que nombra el **síntoma** y un test que le pregunta al host si la tiene. Aprendes a cerrar el ciclo usar → mantener → aportar.

64. **[La plantilla](secciones/la-plantilla.md)** — recoges la plomería en `AggregateRoot` + `MartenUnitOfWork`: `Cosmos.BuildingBlocks` en miniatura. Aprendes a que un agregado nuevo solo declare sus hechos y sus reglas.

65. **[La plantilla se prueba](secciones/la-plantilla-se-prueba.md)** — pruebas las reglas en memoria con un doble que rehidrata como Marten, fijado por un **test de contrato**. Aprendes a probar una librería sin verdes falsos.

66. **[El README que compila](secciones/el-readme-que-compila.md)** — le das a la plantilla un README sin lo que envejece, con un ejemplo que es un test. Aprendes **documentación ejecutable**.

67. **[La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md)** — usas la plantilla en los handlers de Wolverine, con un **middleware** que vuelca la unidad de trabajo. Aprendes a que hechos y mensajes entren en una sola transacción.

68. **[Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md)** — le das a `Cargar` un identity map propio y una falla en la puerta si el stream no existe. Aprendes por qué cada carga desde Postgres no ve lo pendiente.

69. **[El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md)** — llevas la versión esperada a la plantilla con **`FetchForWriting`**, y un test de dos escritores la fija. Aprendes a cerrar la deuda de concurrencia de la 9 con la herramienta, a la vista.

70. **[La versión que vio el usuario](secciones/la-version-que-vio-el-usuario.md)** — llevas la versión del `ETag` del GET al `If-Match` del PUT, hasta `FetchForWriting` (412 si cambió, 428 si no la manda). Aprendes concurrencia optimista **de punta a punta**, y cierras el taller con el criterio que le llevas a la librería real.

---

## Cómo se reescribió la segunda mitad (replanteo v8)

Lo que iba después de §9 en la versión anterior del taller (persistencia con Marten, proyecciones, daemon, servicio/DI, Wolverine, EDA, multi-tenancy, la plantilla y el capstone) **se borró a propósito**: estaba escrito *en reversa* desde `Cosmos.BuildingBlocks` —la respuesta ya conocida—, y por eso se sentía un **tour de herramientas** en vez del descubrimiento **vivido** de §1-9. Se **reescribió sección a sección**, desde el dolor que deja la anterior, hasta las 70 de arriba. Documentos que guiaron la reescritura:

- [`COMO-HILAR-EL-FOCO.md`](COMO-HILAR-EL-FOCO.md) — diagnóstico del foco de las 39 secciones + los movimientos de re-hilado.
- [`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md) — el norte y las estaciones de la continuación (dolor → observador → descubrimiento).
- [`AMPLIACION-MARTEN.md`](AMPLIACION-MARTEN.md) — la profundidad de Marten anclada al repo real `Cosmos.ControlPlane`.

> **Nada se perdió.** Las secciones de la versión anterior viven en el historial de git (`git checkout 1948ab0 -- workshop-event-sourcing/secciones/<archivo>.md`) — como **referencia**, no como base sobre la que construir.

---

## Cómo calificar mientras lo haces

En cada sección, intenta los retos **antes** de abrir el `<details>`, ejecuta, y anota tu resultado:
- `✅ entendí` — pude construirlo solo con la guía.
- `🟡 me costó` — lo saqué, pero con esfuerzo / abrí la solución antes de tiempo.
- `🔴 no entendí` — la guía no me alcanzó para intentarlo.

Las que marques 🟡/🔴 son candidatas a reforzar (más pista en el reto, partir la sección, o un ejemplo extra).
