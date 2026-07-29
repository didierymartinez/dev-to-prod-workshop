# 🌟 Lo que ya se hace bien — insumos para el taller

> **Por qué existe este documento.** La auditoría del Application Plane produjo dos entregables: el
> [análisis](AUDITORIA-APPLICATION-PLANE.md) y el [backlog de arreglos](ACCIONABLES-APPLICATION-PLANE.md).
> Pero ahí lo **bueno** quedaba enterrado en una línea de "no tocar" al pie de cada repo — y resulta que
> **es el material más valioso que tenemos**: son decisiones que ya funcionaron en producción, con el
> porqué escrito y las consecuencias vividas. Eso es exactamente lo que un taller quiere enseñar.
>
> Aquí están **reveladas y expresadas en forma de taller**.
>
> 📐 **¿El plan para convertirlas en secciones?** → [`PLAN-SECCIONES-DESDE-INSUMOS.md`](PLAN-SECCIONES-DESDE-INSUMOS.md):
> el guión, el propósito y la planeación de cada sección (11 nuevas + 3 enriquecimientos + el criterio
> declarado), con el crecimiento de dominio que exigen y las dependencias entre ellas.

## Cómo está expresado cada acierto (y por qué así)

No como "buena práctica a copiar", sino en la forma que el taller usa para que algo se **descubra**:

| Campo | Qué contiene |
|---|---|
| **💥 El dolor que lo hace necesario** | Lo que se rompe si no se hace. Es lo que el alumno tendría que **vivir**. |
| **✅ Lo que hacen bien** | La práctica real en los repos, con evidencia `archivo:línea`, y por qué funciona. |
| **🛠️ El reto** | Qué construiría el alumno, y **cómo provocar el dolor** (matar el proceso, dos sesiones a la vez…). |
| **🔍 Cómo se comprueba** | Algo ejecutable, que se pueda ver. |
| **🧠 El descubrimiento** | La idea que queda. |
| **⚠️ Cuidado de método** | Si el dolor **no** se puede sentir con el dominio de juguete, lo dice sin adornos. |

## ⚠️ La regla de uso (esto no es un temario)

Este documento es **insumo**, no plan. La tentación —y el error que ya costó borrar media segunda mitad
del taller— es convertir "esto lo hacen bien en el repo X" en una sección: eso es **escribir en reversa
desde la respuesta**, y produce el "tour de herramientas" que el método existe para evitar.

Las tres reglas al usar este documento:

1. **El dolor manda.** Un acierto entra al taller **cuando el alumno choca con el problema que lo
   justifica**, no cuando toca el tema. Si el dolor no llega, el acierto no entra (o entra como criterio
   declarado, ver 3).
2. **Lo que no se puede sentir, no se finge.** Varios de estos aciertos resuelven problemas de clúster,
   de varios hosts o de volumen real: con un dominio de juguete en un proceso, **el alumno no puede
   sentirlos**. Cada tema lo dice en su ⚠️.
3. **Criterio declarado > descubrimiento fingido.** Cuando algo no es sentible pero sí importa (y aquí
   hay varios casos), se enseña **honestamente como criterio**: "la organización decidió X en vez de Y,
   por esto" — que además es el norte declarado del taller. Fingir que se descubre es peor que decirlo.

> **Nota sobre la evidencia:** las referencias `archivo:línea` son del `HEAD` de la rama por defecto al
> momento de la auditoría, sin builds ni ejecución. Y la documentación de los repos contradice al código
> en varios casos, así que **el código es la fuente**, no los ADRs ni los READMEs.

---

## Índice — los 14 temas

| # | Tema | Valor | ¿Sentible con el juguete? |
|---|---|---|---|
| 1 | ["Alguien va a 'limpiar' esta línea rara y el bug vuelve" — criterio que sobrevive al próximo mantenedor (y que vuelve a la librería)](#1-alguien-va-a-limpiar-esta-línea-rara-y-el-bug-vuelve-criterio-que-sobrevive-al-próximo-mantenedor-y-que-vuelve-a-la-librería) | alto | ✅ sí |
| 2 | ["Estaba verde y estaba roto" — qué afirmo, y contra qué lo corro](#2-estaba-verde-y-estaba-roto-qué-afirmo-y-contra-qué-lo-corro) | alto | ✅ sí |
| 3 | ["¿Cómo sé que no hay dos escritores pisándose?" — y cómo se enteran el usuario y el test](#3-cómo-sé-que-no-hay-dos-escritores-pisándose-y-cómo-se-enteran-el-usuario-y-el-test) | alto | ✅ sí |
| 4 | ["Rehidratar no puede fallar ni decidir" — quién decide y quién solo recuerda](#4-rehidratar-no-puede-fallar-ni-decidir-quién-decide-y-quién-solo-recuerda) | alto | ✅ sí |
| 5 | ["Aparecieron dos streams con la misma clave de negocio" — y el segundo clic del usuario creó otro hecho](#5-aparecieron-dos-streams-con-la-misma-clave-de-negocio-y-el-segundo-clic-del-usuario-creó-otro-hecho) | alto | ✅ sí |
| 6 | ["Lo que escribí ayer no lo puedo cambiar hoy" — el nombre, la forma y el consumidor del hecho quedan congelados](#6-lo-que-escribí-ayer-no-lo-puedo-cambiar-hoy-el-nombre-la-forma-y-el-consumidor-del-hecho-quedan-congelados) | alto | ✅ sí |
| 7 | ["La vista va atrás de lo que acabo de escribir" — quién la construye, cuándo puedo creerla y qué le digo a la UI](#7-la-vista-va-atrás-de-lo-que-acabo-de-escribir-quién-la-construye-cuándo-puedo-creerla-y-qué-le-digo-a-la-ui) | alto | 🟡 parcial |
| 8 | ["Pidieron otra pregunta y mi vista no sirve" — el read model se diseña por consulta, no por agregado](#8-pidieron-otra-pregunta-y-mi-vista-no-sirve-el-read-model-se-diseña-por-consulta-no-por-agregado) | alto | ✅ sí |
| 9 | ["Respondí OK y el hecho no existe (o el mundo oyó algo que no pasó)" — el hecho, su commit y su anuncio, todo o nada](#9-respondí-ok-y-el-hecho-no-existe-o-el-mundo-oyó-algo-que-no-pasó-el-hecho-su-commit-y-su-anuncio-todo-o-nada) | alto | 🟡 parcial |
| 10 | ["¿Y si esto no merecía event sourcing?" — el criterio para NO usarlo (y el desempate correcto)](#10-y-si-esto-no-merecía-event-sourcing-el-criterio-para-no-usarlo-y-el-desempate-correcto) | alto | ✅ sí |
| 11 | ["Quiero probar el dominio sin levantar Postgres" — el puerto propio, y lo que la abstracción te tapa](#11-quiero-probar-el-dominio-sin-levantar-postgres-el-puerto-propio-y-lo-que-la-abstracción-te-tapa) | alto | ✅ sí |
| 12 | ["El mismo hecho llegó dos veces" — reentregas, replays y qué vale la pena reintentar](#12-el-mismo-hecho-llegó-dos-veces-reentregas-replays-y-qué-vale-la-pena-reintentar) | medio | 🟡 parcial |
| 13 | ["Faltaba el contexto y el sistema puso un default" — el dato queda perfecto, en el lugar equivocado, sin un solo error](#13-faltaba-el-contexto-y-el-sistema-puso-un-default-el-dato-queda-perfecto-en-el-lugar-equivocado-sin-un-solo-error) | medio | 🟡 parcial |
| 14 | ["Arranqué un segundo proceso contra el mismo event store" — config divergente, dueño del daemon y escritores en paralelo](#14-arranqué-un-segundo-proceso-contra-el-mismo-event-store-config-divergente-dueño-del-daemon-y-escritores-en-paralelo) | bajo | 🔴 no |

**Lectura rápida:** 11 de 14 temas son de **valor alto**. Nueve tienen un dolor que el alumno **sí** puede vivir con el dominio de juguete; tres solo **en parte**; y uno **no** — ese último se recomienda como *criterio explicado* o fuera del arco, no como descubrimiento fingido.

---
## 1. "Alguien va a 'limpiar' esta línea rara y el bug vuelve" — criterio que sobrevive al próximo mantenedor (y que vuelve a la librería)

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** BuildingBlocks, ControlPlane, ApplicationPlane, Orquestador, Asistente, Radicacion, DatosReferencia, Direcciones, Entradas, Notificaciones, Integraciones

**💥 El dolor que lo hace necesario.** El alumno pelea una tarde con un bug raro, encuentra la línea que lo arregla (un modo de append, un orden de dos instrucciones, una versión pineada) y sigue. Tres semanas después vuelve, la línea le parece ruido y la "limpia" — o el actualizador de dependencias sube la versión. El bug regresa, pero el síntoma no apunta a la causa: `column d.bdata does not exist` al materializar, o dos escrituras concurrentes que pasan sin conflicto. Nada falla al compilar. Nada falla en los tests. El conocimiento existió y se perdió.

**✅ Lo que hacen bien (y por qué funciona).** El criterio vive pegado al código y nombra el SÍNTOMA que reaparece, no la implementación: `Consultas.csproj:16-17` pinea Marten 9.2.1 citando síntoma, issue upstream y condición de desbloqueo; el docstring de `DurabilityMode.MediatorOnly` enlaza el PR del debate; `RadicacionMartenConfiguration.cs:10-20` marca `TODO[building-blocks-team]` con dueño y salida. Y el ciclo se cierra hacia afuera: `docs/handoff-buildingblocks-durabilitymode-consultas.md` va de incidente real → causa raíz → POC → cambio retrocompatible propuesto al dueño.

**🛠️ El reto (cómo lo descubriría el alumno).** Provoca el olvido a propósito. Pídele que arregle un bug real del taller con una línea no obvia, que la deje sin comentario, y que días (o secciones) después le entreguen el archivo con la instrucción "simplifica lo que sobre". Que borre la línea y vuelva a correr los tests: verdes. Solo el bug regresa. Luego que reescriba la línea con tres datos obligatorios: síntoma exacto, causa, y cuándo se puede quitar. Y que redacte el handoff: test que reproduce + parche mínimo, para quien es dueño de la librería.

**🔍 Cómo se comprueba.** Que otra persona (o el alumno de la sección siguiente) intente borrar la línea comentada: si el comentario funciona, se detiene. Segunda comprobación: el test que reproduce el síntoma debe fallar en rojo con la línea borrada — si sigue verde, el criterio no está blindado y solo hay prosa.

**🧠 El descubrimiento.** El comentario que sirve no explica lo que el código hace: nombra el problema que volverá si lo borras. Y cuando la causa vive en la librería, el entregable no es un parche local: es síntoma + test que reproduce + cambio mínimo, en manos de su dueño.

**⚠️ Cuidado de método.** Sentible con el juguete tal cual está. Lo único que hay que añadir es TIEMPO: el dolor solo aparece si el alumno vuelve a un archivo suyo de varias secciones atrás, así que conviene sembrar la línea rara temprano y cobrarla después. El pin de versión con condición de salida sí es medio-no-sentible (necesita un upgrade real de Marten): enseñarlo como criterio explicado apoyado en el pin real del repo, no fingir el descubrimiento.

---

## 2. "Estaba verde y estaba roto" — qué afirmo, y contra qué lo corro

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** BuildingBlocks, ControlPlane, ApplicationPlane, Orquestador, los 4 de ES intensivo, EstructuraOrganizacional, Terceros, Direcciones, Reconocimiento, Entradas

**💥 El dolor que lo hace necesario.** La suite está verde y el sistema no funciona. El test afirmaba el estado del objeto en memoria, no los eventos emitidos, así que el `Append` que falta no se nota. La proyección se probó llamando `Apply` a mano, así que le falta `partial` y revienta solo al arrancar. El rebuild "pasa" porque compara una lista vacía con otra vacía. El test corre contra un doble, y lo que rompe en producción es el esquema, el serializador, el tenant o la transacción — justo lo que el doble no tiene.

**✅ Lo que hacen bien (y por qué funciona).** Afirman el efecto observable: el `TestStore` con Given-When-Then compara los EVENTOS emitidos por equivalencia estructural, y en el borde se afirma lo que llega al otro lado. Corren contra Postgres real con una fixture compartida que confiesa por escrito que replica la config de producción a mano. Un test barato construye el store real y dispara `AssembleAndAssertValidity` sin base de datos. Y blindan lo que casi nadie prueba: rebuild con guard de no-vacío (`LocalizadorRebuildSpecifications`), colisión y fallo al guardar vía decoradores del store.

**🛠️ El reto (cómo lo descubriría el alumno).** Que escriba primero el test "natural": muta la `Empresa`, afirma su estado. Luego que borre la línea que appendea el evento al store. Verde. Ahí reescribe el test para afirmar la lista de eventos: rojo. Segundo golpe: que cambie el serializador o el naming de eventos en la config del test y no en la de producción, y vea la suite pasar mientras el historial ya escrito deja de leerse. Tercero: que escriba un test de rebuild sin datos sembrados y descubra que pasa vacuamente.

**🔍 Cómo se comprueba.** Rompe una línea a la vez y exige que algún test se ponga rojo: si el sabotaje no tiene test que lo delate, la cobertura es decorativa. Y en el test de rebuild, añade el guard "la lista reconstruida no puede estar vacía" — si pasar dependía del vacío, ahí se cae.

**🧠 El descubrimiento.** En event sourcing el resultado de un comando ES la lista de eventos: afirmar el estado interno es afirmar un intermedio. Y una fixture con Postgres real no es lujo, es que los fallos de un event store viven en el esquema, la serialización y la transacción — precisamente donde el doble no existe.

**⚠️ Cuidado de método.** Sentible entero con el juguete: la `Empresa` y un contenedor de Postgres bastan para el falso verde, la fixture compartida y el rebuild vacuo. Lo que NO se siente es el falso verde por config divergente entre HOSTS (necesita dos procesos) ni el daemon multi-nodo: eso se enseña como criterio explicado. Añadir al dominio: un segundo agregado o un segundo lector para que la config compartida tenga a quién desincronizar.

---

## 3. "¿Cómo sé que no hay dos escritores pisándose?" — y cómo se enteran el usuario y el test

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** Terceros, Direcciones, Impuestos, Asistente, Radicacion, EstructuraOrganizacional

**💥 El dolor que lo hace necesario.** Dos peticiones cambian el plan de la misma `Empresa` a la vez. Ambas rehidratan el mismo estado, ambas appendean, las dos responden 200. Un cambio desapareció y nadie lo sabe: ni una excepción, ni un log, ni un test rojo. Peor: el alumno cree estar protegido porque "el event store detecta conflictos", hasta que descubre que el default de Marten 9 (`QuickWithServerTimestamps`) quitó el chequeo de versión implícito del INSERT y su capa de persistencia hace `Append` plano. Y cuando el conflicto SÍ salta, sale como 500 y el cliente no sabe que puede reintentar.

**✅ Lo que hacen bien (y por qué funciona).** `ConcurrenciaRegister.cs:17-18` restaura el chequeo con `EventAppendMode.Rich`, citando la línea exacta de la librería que hace el append plano y el costo medido (~50% de throughput) — mitigación local con dueño y condición de salida. El conflicto se vuelve contrato HTTP probado: un acceptance test exige 409 real, y el mapeo recorre recursivamente el `InnerException` porque Wolverine/Marten anidan la de JasperFx. En EstructuraOrganizacional el ciclo va de punta a punta: `IRevisioned` en el read model → `ExpectedVersion` en el comando → 422.

**🛠️ El reto (cómo lo descubriría el alumno).** Que lance dos sesiones concurrentes sobre la misma `Empresa` (dos tareas, o dos peticiones HTTP disparadas juntas) y cuente los eventos: dos appends, una decisión perdida. Que active `EventAppendMode.Rich` y repita: ahora una lanza. Luego que la deje salir como 500 y pruebe reintentar desde el cliente — no sabe si debe. Que mapee a 409 y descubra, al hacerlo, que la excepción viene envuelta. Cierre: devolver la versión en la lectura y exigirla al escribir.

**🔍 Cómo se comprueba.** Un test que lanza N escrituras paralelas al mismo stream y afirma que exactamente una gana y las demás fallan con la excepción de concurrencia. Y un acceptance test que afirma el código de estado 409 (no 500) — con el nivel de anidamiento de la excepción ejercitado de verdad, no atrapado por un `catch` genérico.

**🧠 El descubrimiento.** "El store lo detecta" no es una garantía: es un default, y los defaults cambian de versión. Detectar el conflicto es la mitad; la otra mitad es que el usuario y el test se enteren — un 409 con la versión esperada es la diferencia entre un reintento y una pérdida silenciosa.

**⚠️ Cuidado de método.** Totalmente sentible: dos tareas contra el mismo stream y un Postgres real bastan. Lo que no cabe en el juguete es la salida alternativa (serializar por partición en el transporte, con `SessionId` por tenant): eso pide broker y topología, y se enseña como criterio comparado — "detectar el conflicto o eliminar al concurrente" — no como descubrimiento. El ciclo hasta 422 pide una lectura que exponga la versión: un endpoint mínimo alcanza.

---

## 4. "Rehidratar no puede fallar ni decidir" — quién decide y quién solo recuerda

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** Impuestos, Asistente, Radicacion, Terceros, Direcciones, ControlPlane, EstructuraOrganizacional

**💥 El dolor que lo hace necesario.** El alumno mete una validación en el `Apply` — parece el sitio natural, "así nadie se la salta". Meses de historial después, un evento viejo ya no cumple la regla nueva y el agregado deja de poder leerse: 500 en producción al rehidratar, y el rebuild de la proyección muere en el shard. Variante gemela: el `Apply` lee `DateTime.UtcNow` o genera un `Guid`, y el mismo stream produce un estado distinto en cada lectura. Y el silencio: un evento sin método `Apply` Marten lo ignora sin decir nada, así que un olvido y una omisión deliberada son indistinguibles.

**✅ Lo que hacen bien (y por qué funciona).** La regla está escrita con el MECANISMO del daño y los tres contextos donde corre `Apply` (append, live aggregation, rebuild), tabulada por severidades (`CLAUDE.md:611-643` en Terceros; siete patrones prohibidos en Impuestos, nacidos de un 500 real, con `ConfiguracionEfectivaEventoHuerfanoTests`). Los no-ops se declaran con la razón escrita en vez de dejar el hueco. Y la decisión vive donde se puede reconstruir: el handler de ControlPlane solo dice "notifica esta confirmación"; el agregado decide si el onboarding terminó.

**🛠️ El reto (cómo lo descubriría el alumno).** Que ponga la validación de "no puedes suspender una empresa ya suspendida" dentro del `Apply`, que grabe un historial con esos eventos, y que endurezca luego la regla. Al releer el stream: excepción al rehidratar, un agregado inmortalmente ilegible. Segundo golpe: que use `DateTime.UtcNow` en un `Apply` y compare dos lecturas del mismo stream. Tercero: que borre un método `Apply` y vea que nada falla — el estado queda mal, en silencio. Cura: `Apply` puros, validación en los métodos de negocio, no-ops explícitos.

**🔍 Cómo se comprueba.** Rehidratar el mismo stream dos veces y exigir estados idénticos (rompe con reloj o `Guid` dentro del `Apply`). Y un test de "evento huérfano": appendear un tipo de evento sin `Apply` y afirmar que el sistema lo denuncia en vez de ignorarlo — es la única forma de que el silencio de la librería no sea tu política por defecto.

**🧠 El descubrimiento.** Rehidratar es recordar, no juzgar: si `Apply` puede fallar, tu historial tiene fecha de caducidad. El que decide es el método de negocio, una sola vez, sobre un estado ya reconstruido — y por eso la invariante vive en el agregado y no en el handler que la copiaría mal.

**⚠️ Cuidado de método.** Sentible de sobra con la `Empresa`: los tres golpes (validar en Apply, reloj en Apply, evento huérfano) se provocan sin infraestructura extra. Para el tell-don't-ask de fan-in hace falta algo que se espere de varios lados — un segundo agregado o un proceso con dos confirmaciones — y el evento de proceso en su propio stream por `ProcessId` pide una operación que cruce dos empresas (una fusión de planes, por ejemplo). Sin eso, el fan-in se explica como criterio.

---

## 5. "Aparecieron dos streams con la misma clave de negocio" — y el segundo clic del usuario creó otro hecho

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** Impuestos, Contabilidad, Asistente, Terceros, EstructuraOrganizacional, Direcciones, DatosReferencia

**💥 El dolor que lo hace necesario.** El alumno protege la unicidad del NIT leyendo antes de escribir: "¿existe ya una empresa con este NIT? no → la creo". Funciona en su máquina. Con dos peticiones simultáneas, las dos leen "no existe" y las dos crean: dos streams distintos, mismo NIT, y ninguna concurrencia optimista lo salva — `FetchForWriting` protege UN stream, no una clave que aún no tiene stream. Variante barata y frecuente: el usuario hace doble clic, o el transporte reentrega el mensaje, y el mismo hecho de negocio queda registrado dos veces en la historia inmutable.

**✅ Lo que hacen bien (y por qué funciona).** Ponen la garantía donde es atómica, no donde es cómoda: 9 proyecciones Inline "Localizador" (clave → streamId) materializadas dentro de la MISMA transacción del append, más índice único por tenant; Contabilidad usa id determinista y traduce `ExistingStreamIdCollisionException` a 409. El pre-check se conserva solo para bajar la frecuencia, y la colisión se convierte en reutilización en vez de error. Descartaron a propósito el stream id compuesto por datos de negocio (ataría la identidad a algo mutable, irreversible en historia inmutable) — salvo en catálogos, donde la clave natural (`CO:110111`) es justamente lo que compra existencia e idempotencia gratis.

**🛠️ El reto (cómo lo descubriría el alumno).** Que implemente la unicidad del NIT con lectura previa y luego dispare dos registros del mismo NIT en paralelo; que consulte los streams y encuentre dos. Que intente arreglarlo con un lock en memoria y note que solo funciona en un proceso. Luego que materialice un localizador NIT→streamId con índice único DENTRO de la transacción del append y repita la carrera: una gana, la otra colisiona. Cierre: que convierta la colisión en "esta empresa ya existe, te devuelvo la que hay" y que reenvíe el mismo comando dos veces sin ensuciar el stream.

**🔍 Cómo se comprueba.** Dos escrituras concurrentes del mismo NIT: contar streams debe dar 1 y la perdedora debe fallar de forma reconocible. Y un test de reentrega: invocar el comando dos veces y afirmar que el segundo no emite evento nuevo — la historia tiene el hecho una sola vez.

**🧠 El descubrimiento.** Leer-antes-de-escribir no es una garantía, es una apuesta con ventana; una invariante de conjunto solo la sostiene quien puede decidir de forma atómica, y ese es el store. Y si el segundo intento del usuario no debe crear un hecho nuevo, la idempotencia es del write side, no un filtro que se le pide a la infraestructura.

**⚠️ Cuidado de método.** Sentible casi entero: la `Empresa` ya tiene una clave de negocio natural (el NIT) y Postgres real da el índice único, así que la carrera, el localizador inline y la reentrega se provocan tal cual. Lo que no se siente es la idempotencia frente a un broker at-least-once real: se puede simular invocando el handler dos veces, pero conviene decirlo — es simulación honesta, no reentrega de verdad. La siembra idempotente por clave natural pide un catálogo pequeño añadido al dominio (planes, por ejemplo).

## 6. "Lo que escribí ayer no lo puedo cambiar hoy" — el nombre, la forma y el consumidor del hecho quedan congelados

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** los 4 fundacionales, Impuestos, Asistente, Contabilidad, ControlPlane, BuildingBlocks, Reconocimiento, Integraciones, Entradas

**💥 El dolor que lo hace necesario.** El alumno guarda un evento con un campo de tipo abstracto (o una interfaz, o un enum que después renombra). Al día siguiente mueve la clase de carpeta, le cambia el nombre al record, o le agrega un campo obligatorio. Nada falla al compilar. Pero al releer el stream de ayer: o el campo llega en `null`, o el deserializador revienta con un `$type` que ya no existe, o el agregado se reconstruye con un plan que nunca tuvo. El JSONB de ayer no se puede editar; el error está en el disco, no en el código.

**✅ Lo que hacen bien (y por qué funciona).** Los 4 repos fundacionales replican en su `CLAUDE.md` la sección "Restricción crítica — Marten + polimorfismo en eventos": prohíben tipos polimórficos como campos de evento, razonándolo desde el `$type` que el serializador bakea en el JSONB. Impuestos y Asistente van más lejos: versionan **por prohibición** (eventos planos, campos nuevos siempre opcionales, cero upcasters). Reconocimiento, cuando el polimorfismo es inevitable, elige los discriminadores JSON a mano para que sobrevivan a un rename. BuildingBlocks fija `EventNamingStyle.SmarterTypeName` explícito y lo blinda con un test de caracterización del upgrade.

**🛠️ El reto (cómo lo descubriría el alumno).** Que modele el evento "plan cambiado" con un campo `Plan` de tipo abstracto (`PlanBasico` / `PlanPro` como subclases). Que registre dos empresas, cierre el proceso, y luego **renombre la subclase o la mueva de namespace**. Que vuelva a levantar y reconstruya el agregado desde Postgres. Segundo golpe: que le agregue un campo obligatorio al evento y relea los eventos viejos. Tercero: que renombre el record del evento y vea qué pasa con el alias guardado en `mt_events.type`.

**🔍 Cómo se comprueba.** Un `SELECT data FROM mt_events` mostrando el `$type` con el nombre CLR viejo dentro del JSON. Y un test de caracterización: sembrar eventos con la forma de "ayer", subir la versión de la librería o renombrar el tipo, y exigir que el agregado reconstruido siga dando el mismo estado.

**🧠 El descubrimiento.** El evento no es un DTO: es un registro público e inmutable que tu código de mañana tendrá que seguir leyendo. Por eso se escribe plano, con campos opcionales al final y nombres que decidiste a mano — no los que el compilador te regaló hoy.

**⚠️ Cuidado de método.** Totalmente sentible con la `Empresa`: basta un campo polimórfico y un rename. Para llegar al acierto del **evento público como contrato aparte** (paquete propio, payload plano, ACL que no deja entrar tipos externos) hace falta un segundo consumidor; con el juguete se puede simular con un segundo proyecto en la solución que solo referencie los contratos y falle al compilar cuando el modelo interno cambia. La separación de transportes (público vs. interno) y el validador de arranque sí requieren broker: enseñarlos como criterio explicado.

## 7. "La vista va atrás de lo que acabo de escribir" — quién la construye, cuándo puedo creerla y qué le digo a la UI

**Valor:** alto · **¿Sentible con el dominio de juguete?** parcial · **Visto en:** Radicacion, Impuestos, Asistente, ControlPlane, BuildingBlocks, EstructuraOrganizacional, Direcciones, Terceros, Integraciones, Orquestador

**💥 El dolor que lo hace necesario.** El alumno registra una empresa y de inmediato consulta la lista: no está. Refresca y aparece. Peor: pone una validación de comando ("no suspender una empresa ya suspendida") a leer la vista, y con dos comandos seguidos la validación pasa dos veces porque la vista todavía no se enteró del primero. Y su test más nuevo falla una vez de cada cinco, sin cambiar nada. El bug no es del código: es de **quién** construye la vista y **cuándo**.

**✅ Lo que hacen bien (y por qué funciona).** Radicacion lo escribe como ADR-007: 3 proyecciones Inline en el host de comandos **porque un reactor DECIDE con ellas**, y 9 Async para la UI. EstructuraOrganizacional (D-ARQ-02) elige Inline a conciencia para tener read-your-write dentro del commit, y anota el precio aunque contradiga su propio estándar. Impuestos usa live aggregation a propósito donde la fidelidad de auditoría manda. ControlPlane fija con un test la regla "ninguna proyección Inline en el read-side" y declara la ausencia de snapshots como decisión medida (streams de 1 a 5 eventos), no como olvido.

**🛠️ El reto (cómo lo descubriría el alumno).** Que construya la lista de empresas como proyección Async y ponga la regla de negocio a leerla. Que dispare dos comandos seguidos sin esperar y vea la invariante violada. Luego que la mueva a Inline y mida qué le costó el commit. Y que exponga un endpoint que responda `202` con un recurso de estado en vez de `200`, para admitir el rezago en el contrato en vez de esconderlo detrás de un `404` mentiroso.

**🔍 Cómo se comprueba.** Un test que appendea y consulta sin esperar: rojo con Async, verde con Inline. Y un test de topología que recorra las proyecciones registradas y falle si alguna del read-side está en Inline — la regla de arquitectura convertida en assert, no en párrafo.

**🧠 El descubrimiento.** El lifecycle de una proyección no se elige por costumbre: se elige por **quién la lee y qué decide con ella**. Si alguien decide una escritura mirándola, no puede ir atrás. Si solo la mira un humano, el rezago es gratis y la API debería confesarlo.

**⚠️ Cuidado de método.** Sentible en la mitad que importa (Inline vs. Async vs. live, read-your-write, el flake del test) con un solo host y el daemon en `Solo`. **No** sentible: la parte de topología de despliegue —daemon en un host dueño, réplicas en `Disabled`, `HotCold`, deploy escalonado proyectando con binario viejo— necesita varios procesos y un clúster; enseñarla como criterio explicado con la cita del repo. El `202` + push tampoco se "sufre" sin una UI: presentarlo como decisión de contrato.

## 8. "Pidieron otra pregunta y mi vista no sirve" — el read model se diseña por consulta, no por agregado

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** Asistente, Radicacion, Integraciones, EstructuraOrganizacional, Impuestos

**💥 El dolor que lo hace necesario.** El alumno tiene una proyección `EmpresaVista` con la lista de pagos embebida. Llega la pregunta nueva: "los últimos 20 pagos de todos los tenants, paginados hacia atrás". Con la lista dentro del documento no hay `WHERE` ni `ORDER BY` posible: le toca traer todos los documentos y paginar en memoria. Y cada evento reescribe el documento completo, que ya pesa. Su reflejo será crear una tercera proyección por cada pregunta nueva, y acabará con N vistas del mismo dato desincronizándose entre sí.

**✅ Lo que hacen bien (y por qué funciona).** Asistente usa `MultiStreamProjection` para su caso **menos** obvio: partir un stream en N documentos (`ChatTurn` keyeado por `TurnId`) porque el frontend pagina con `WHERE conversacion_id AND ordinal < N`. Radicacion re-llavea por `PartidaId`/`PagoId` por la misma razón. EstructuraOrganizacional hace lo contrario cuando conviene: **una sola** `SingleStreamProjection` con varios `Create(IEvent<X>)` sirviendo 5 puertos de dominio, en vez de 5 proyecciones — y verificaron el enrutamiento de Marten en vez de asumirlo. Integraciones resuelve la equivalencia al escribir, no al leer.

**🛠️ El reto (cómo lo descubriría el alumno).** Que escriba la query real primero ("últimos 20 pagos, orden descendente, filtrado por plan") y **después** decida la forma del documento. Que intente servirla desde la vista con lista embebida y toque el muro. Que la re-llavee: un documento por pago, con `EmpresaId` y un ordinal, alimentado desde el mismo stream. Y que resista la tentación de la tercera proyección fusionando dos preguntas en un solo documento donde el patrón de acceso lo permita.

**🔍 Cómo se comprueba.** Que la consulta paginada se pueda escribir como un solo `Query<PagoVista>()` con `Where` + `OrderByDescending` + `Take`, sin traer nada a memoria. Y un test de materialización: sembrar eventos, esperar el shard, y comparar el documento resultante con `BeEquivalentTo`.

**🧠 El descubrimiento.** El stream manda en el write side; en el read side manda **la pregunta**. La identidad del documento es la clave por la que vas a consultar, no la del agregado que lo originó.

**⚠️ Cuidado de método.** Sentible tal cual: los pagos de la `Empresa` ya dan el caso de "1 stream → N documentos". Para el multi-stream a fondo —grouper que escanea el lote y no consulta el documento que está construyendo, `FanoutMode.BeforeGrouping`— hace falta un segundo agregado que cruce con `Empresa` (por ejemplo un `Plan` con su propio stream); vale la pena añadirlo, es el único modo de que la restricción del grouper se sienta en vez de creerse.

## 9. "Respondí OK y el hecho no existe (o el mundo oyó algo que no pasó)" — el hecho, su commit y su anuncio, todo o nada

**Valor:** alto · **¿Sentible con el dominio de juguete?** parcial · **Visto en:** BuildingBlocks, ControlPlane, DatosReferencia, Direcciones, Asistente, Integraciones, Notificaciones, Entradas, Orquestador

**💥 El dolor que lo hace necesario.** Dos fallos gemelos. Uno: el alumno muta el agregado, olvida el `SaveChanges` (o el `Append`), y el endpoint responde `200` sobre un hecho que nunca se escribió. Dos: notifica primero y guarda después; el guardado falla y ya hay alguien afuera actuando sobre un hecho inexistente. Y un tercero, más sutil: al re-appendear los eventos de un stream recién creado con `StartStream`, el historial sale **duplicado**, porque esos eventos ya habían entrado a la sesión al crearla.

**✅ Lo que hacen bien (y por qué funciona).** BuildingBlocks mueve la obligación a un `MartenUnitOfWork` + `UnitOfWorkMiddleware.After()`: en ControlPlane el código de dominio **no tiene ni un** `SaveChangesAsync`. El change tracker mantiene **dos listas separadas** —streams iniciados vs. modificados— con el comentario que explica el duplicado exacto que aparecería si se unificaran. DatosReferencia y Direcciones publican al bus **antes** del único `SaveChangesAsync`, apoyados en `AutoApplyTransactions` + `IntegrateWithWolverine`: el envelope del outbox se commitea en la misma transacción. Asistente hace lo inverso donde el canal es en vivo: captura, guarda, y solo entonces publica al SSE.

**🛠️ El reto (cómo lo descubriría el alumno).** Que escriba un handler a mano, olvide el commit a propósito, y vea el `200` mentiroso. Que meta el commit en un middleware y compruebe que ya no se puede olvidar. Que fuerce el duplicado: `StartStream` y luego re-appendear los mismos eventos, y contar filas en `mt_events`. Y el escenario duro: **matar el proceso entre el anuncio y el commit** (un `Environment.Exit` a mitad, o una excepción inyectada después de publicar) para ver el mundo desincronizado.

**🔍 Cómo se comprueba.** Contar los eventos del stream tras un `StartStream` + commit: exactamente los emitidos, no el doble. Y un test que inyecte una excepción entre publicación y commit y exija que **nada** haya salido: si la publicación está enlistada en la transacción, el rollback se la lleva.

**🧠 El descubrimiento.** El hecho y su anuncio comparten destino o no comparten nada. Una sola transacción decide si ambos existen; cualquier otra cosa es un dual-write con una ventana de pérdida que un día se abre.

**⚠️ Cuidado de método.** Sentible en lo esencial: unit of work, el duplicado del `StartStream`, y el orden publish/commit se sienten con un solo proceso y Postgres. **No** sentible sin broker: el outbox/inbox durable de extremo a extremo, el gotcha del publish en cascada y el reply-uri, y la reentrega at-least-once que exige idempotencia. Sustituto honesto: un "efecto externo" falso (escribir un archivo, o un `List<string>` en memoria que sobreviva al rollback) para que el dual-write se vea; el resto, criterio explicado.

## 10. "¿Y si esto no merecía event sourcing?" — el criterio para NO usarlo (y el desempate correcto)

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** ApplicationPlane, DatosReferencia, Reconocimiento, Entradas, Notificaciones, Integraciones

**💥 El dolor que lo hace necesario.** El alumno acaba de aprender el motor y ahora todo le parece un stream. Event-sourcea el catálogo de planes: tres eventos, una proyección, un daemon, rezago en los tests, un rebuild que mantener. Y el catálogo no tiene ni una invariante ni una sola pregunta histórica que alguien haya hecho jamás. Pagó toda la ceremonia y no cobró nada. Peor todavía: ahora sus tests son flaky por un rezago que él mismo se regaló.

**✅ Lo que hacen bien (y por qué funciona).** DatosReferencia deja la decisión firmada: "CRUD sobre Marten, no ES", anclada al alcance ("no tiene reglas de negocio propias") — cero agregados, cero proyecciones, y como consecuencia buscada, read-after-write inmediato y cero flakiness. Reconocimiento escribe un ADR que **evalúa y descarta** la alternativa "stream por intento" para un registro de OCR. Entradas guarda en Marten un único documento: el cursor de polling. Y el gateway de ApplicationPlane son 167 líneas de YARP con cero Marten y cero Wolverine, de 772 líneas totales ninguna persiste nada.

**🛠️ El reto (cómo lo descubriría el alumno).** Que event-sourcee a propósito el catálogo de planes (o los tipos de documento): eventos, proyección, daemon. Que escriba el primer test de "crear plan y leerlo" y sufra el rezago. Que cuente las líneas que escribió y las preguntas que puede responder gracias a ellas. Y que luego lo rehaga como documento plano y compare. Después, que redacte el desempate en tres líneas para dos casos: la `Empresa` (sí) y el catálogo (no).

**🔍 Cómo se comprueba.** Dos preguntas ejecutables sobre cada candidato: ¿alguien necesita saber **cómo llegó** a este estado, o basta el estado? ¿hay una invariante que un `UPDATE` podría violar? Si ambas son no, borrar la proyección y contar cuántas líneas y cuánta latencia desaparecen.

**🧠 El descubrimiento.** El desempate no es rendimiento: es **reconstrucción temporal**. Si nadie va a preguntar por el pasado y no hay invariante que proteger, un `UPDATE` es la respuesta correcta — y decirlo por escrito es parte del oficio, no una derrota.

**⚠️ Cuidado de método.** Sentible y además barato: solo hace falta un segundo concepto en el dominio que claramente **no** merezca ES (un catálogo de planes con nombre y precio). Añadirlo es buena inversión: da el contraste, y de paso sirve para el reto de la vista por consulta y para el segundo stream del grouper. Lo único no sentible es el argumento operacional del gateway (sin estado propio en producción): mencionarlo como evidencia de la org, no como reto.

## 11. "Quiero probar el dominio sin levantar Postgres" — el puerto propio, y lo que la abstracción te tapa

**Valor:** alto · **¿Sentible con el dominio de juguete?** si · **Visto en:** Impuestos, Asistente, Contabilidad, Radicacion, Terceros, EstructuraOrganizacional, DatosReferencia, Direcciones, ControlPlane, Terceros.Orquestador, Reconocimiento, Entradas

**💥 El dolor que lo hace necesario.** Cada prueba de una regla de negocio ("no se puede cambiar el plan de una empresa suspendida") arranca Postgres, crea el esquema y limpia tablas. La suite tarda minutos, falla cuando el contenedor va lento, y el archivo del agregado empieza con `using Marten;`: cambiar de motor deja de ser una opción. El dolor gemelo llega después: el equipo se acostumbra al fake, el fake nunca choca dos escrituras, y el primer conflicto de concurrencia real aparece en producción con dos pagos registrados sobre la misma empresa.

**✅ Lo que hacen bien (y por qué funciona).** El dominio depende de un `IEventStore`/`IDomainStore` propio y de nada más: en Radicacion, 112 de 1119 archivos usan `IEventStore` y el proyecto de dominio tiene cero referencias a Marten; Contabilidad corre 357 tests unitarios con un `TestStore` en memoria. La única concesión es el source generator de JasperFx.Events, referenciado como Analyzer (`PrivateAssets=all`, `ReferenceOutputAssembly=false`) para que el dispatcher se genere sin arrastrar el runtime. Y el precio está escrito: al tapar `FetchForWriting`, ningún consumidor puede pedir concurrencia optimista.

**🛠️ El reto (cómo lo descubriría el alumno).** Pídele extraer, del motor a mano que ya tiene, la interfaz mínima que su dominio realmente usa (cargar stream, appendear eventos) y escribir dos implementaciones: la de Postgres y una de diccionario en memoria. Luego que mueva sus tests de reglas al store en memoria y mida el antes/después. Cerrado eso, que provoque el hueco: dos "hilos" registrando un pago sobre la misma empresa. En memoria pasan los dos, y en Postgres también, porque la interfaz que él mismo cortó no tiene dónde expresar "esperaba la versión 4".

**🔍 Cómo se comprueba.** `grep -r "Marten\|Npgsql" src/Dominio` debe salir vacío (o solo con el Analyzer), y la suite de dominio debe correr sin contenedores. Para el hueco: un test que carga la misma empresa dos veces, aplica un pago en cada copia y guarda las dos; el stream termina con dos eventos y ningún error. Ese verde es el hallazgo.

**🧠 El descubrimiento.** Una abstracción no es gratis: te devuelve tests rápidos y la libertad de cambiar de motor, y te cobra todo lo que no dejaste pasar por ella. La pregunta de mantenimiento no es "¿tengo un puerto?", sino "¿qué capacidad de la infraestructura acabo de volver inalcanzable, y quién lo va a notar?".

**⚠️ Cuidado de método.** Sentible tal cual: el motor a mano y la tabla de Postgres ya existen, así que la extracción del puerto es un refactor real, no un ejercicio de papel. Para que el hueco de concurrencia duela hace falta que el juguete tenga una invariante que dependa del estado acumulado — "no aceptar un pago que exceda el saldo" o "no suspender dos veces" — y no solo eventos que se apilan. Sin esa invariante, dos escrituras concurrentes no producen nada visiblemente incorrecto y el descubrimiento se queda en teoría.

## 12. "El mismo hecho llegó dos veces" — reentregas, replays y qué vale la pena reintentar

**Valor:** medio · **¿Sentible con el dominio de juguete?** parcial · **Visto en:** Terceros.Orquestador, ControlPlane, Radicacion, DatosReferencia, Direcciones, Integraciones, Reconocimiento

**💥 El dolor que lo hace necesario.** El mismo hecho entra dos veces —un reintento del cliente, una reentrega del transporte, un replay de la proyección— y el sistema lo cree dos veces: la empresa queda suspendida dos veces en el historial, el saldo proyectado se descuenta dos veces, y el cliente recibe dos correos. Peor: el bug no se ve al escribir, se ve semanas después cuando alguien reconstruye la vista y el número sale distinto del que estaba en pantalla. Y la reacción intuitiva —"reintentemos todo con backoff"— convierte un rechazo permanente en ruido eterno en el log.

**✅ Lo que hacen bien (y por qué funciona).** Tres capas distintas. En el write side, guardas por estado: los handlers del process manager de Orquestador retornan si el estado ya avanzó, y ControlPlane combina `ExistsAsync` con un `GetOrCreate` idempotente en el proveedor externo *antes* del commit, para que un commit fallido se reintente sin duplicar nada. En las proyecciones, Radicacion modela `SaldoPorPagar = SaldoBase + AjusteNeto` en vez de `Saldo -= ajuste`: recálculo desde una base estable, no acumulación. Entre servicios, DatosReferencia manda el estado completo con un `Version` monotónico y el consumidor hace upsert-si-más-nuevo. Y Radicacion clasifica: backoff solo para el rezago transitorio, dead-letter directo para el rechazo de negocio, con "un retry nunca triunfaría" escrito al lado.

**🛠️ El reto (cómo lo descubriría el alumno).** Que escriba una proyección acumuladora del saldo de la empresa (`Saldo -= pago`) y luego procese el mismo evento dos veces —basta llamar al fold dos veces, o reconstruir la vista sin borrarla primero—. Después, que intente arreglarlo "protegiendo la entrada" (una lista de ids ya vistos) y descubra que la lista es otro estado más que mantener. La cura sale cuando reescribe el fold como recálculo desde el total. En el write side: que mande `SuspenderEmpresa` dos veces y decida si el segundo emite evento o no.

**🔍 Cómo se comprueba.** Un test que aplica la misma lista de eventos dos veces sobre la vista y compara: `proyectar(eventos) == proyectar(eventos + eventos)`. Con el fold acumulador falla; con el recálculo pasa. Y un test que invoca el comando de suspensión dos veces y afirma que el stream tiene un solo evento `EmpresaSuspendida`.

**🧠 El descubrimiento.** Idempotencia no es una pieza que se instale, son tres decisiones en tres lugares: el comando decide si un hecho ya ocurrido merece un evento nuevo, la proyección se escribe para que reaplicarla no cambie nada, y el manejo de errores tiene que distinguir "vuelve a intentarlo" de "esto nunca va a funcionar". La segunda es la que el replay cobra.

**⚠️ Cuidado de método.** La parte de proyecciones sí se siente con el juguete: reaplicar el fold es una llamada a un método, sin infraestructura. La parte de reentregas NO: sin un transporte de verdad el alumno tiene que fingir el duplicado llamando dos veces al handler, y eso enseña la forma de la guarda pero no el susto. El sustituto honesto es enseñar el pipeline de mensajería como CRITERIO explicado —con el orden efecto-externo-antes-del-commit dicho en palabras— y reservar el descubrimiento para el replay, que el juguete sí puede provocar de verdad.

## 13. "Faltaba el contexto y el sistema puso un default" — el dato queda perfecto, en el lugar equivocado, sin un solo error

**Valor:** medio · **¿Sentible con el dominio de juguete?** parcial · **Visto en:** BuildingBlocks, ApplicationPlane, ControlPlane, Terceros.Orquestador, Reconocimiento, Entradas

**💥 El dolor que lo hace necesario.** Falta un dato de contexto —de qué cliente es esta petición, quién la hizo, qué fecha traía el documento— y en vez de fallar, el sistema rellena: cadena vacía, `*DEFAULT*`, `DateTime.UtcNow`. La escritura funciona, responde 200, nadie ve un error. El evento queda guardado con la identidad equivocada, y como el historial es inmutable, ahí se queda. Se descubre semanas después: un cliente ve datos de otro, o el reporte cuadra en total pero no por empresa. No hay excepción que buscar en los logs, porque nunca hubo una.

**✅ Lo que hacen bien (y por qué funciona).** Fail-fast en el borde y en el arranque, no defaults. El resolver de BuildingBlocks lanza si falta tenant o usuario (no `TryResolve`, no `string.Empty`), y el gateway corta con 400 listando *todos* los claims faltantes de una vez. ApplicationPlane usa una sola lista `propagatedClaims` que cablea validación e inyección juntas —imposible desfasarlas— y remueve el header entrante *antes* de inyectar el del claim, con un test que fija ese orden. `DomainStore` abre siempre `LightweightSession(tenant)` con la trampa escrita al lado. Y cuando el dato entrante viene corrupto, Entradas lo señaliza en el tipo de resultado (`ResultadoMapeoDocumento` con el NIT no parseable) en vez de tragárselo.

**🛠️ El reto (cómo lo descubriría el alumno).** Que añada al juguete una columna `cliente_id` en la tabla de eventos y la lea de un header o de un parámetro, con un fallback cómodo (`?? ""`) porque "así no rompe los tests viejos". Que registre dos empresas de dos clientes distintos, una de ellas sin el header, y luego liste las empresas del cliente A. El evento huérfano no aparece en ninguna lista y tampoco produjo error. Luego que cambie el fallback por una excepción y vea cuántos de sus propios llamados estaban dependiendo del default sin saberlo.

**🔍 Cómo se comprueba.** Una consulta directa a la tabla de eventos filtrando por `cliente_id = ''` o nulo: cada fila ahí es un dato perdido que ninguna API va a mostrar nunca. Y un test que hace la petición sin el header y exige un 400 que nombre lo que falta, no un 200.

**🧠 El descubrimiento.** En un log inmutable, un default silencioso no es un valor por defecto: es una corrupción de identidad con fecha de caducidad infinita. Vale más un error ruidoso en el borde que una escritura impecable en el lugar equivocado — y si el dato entrante es dudoso, la duda viaja en el tipo del resultado, no en un log que nadie lee.

**⚠️ Cuidado de método.** Sentible a medias, y hay que elegir bien la mitad. El default silencioso sí se puede provocar con el juguete: basta un `cliente_id` en la tabla y un fallback cómodo, y el alumno ve la fila fantasma con una consulta SQL. Lo que NO cabe es la multi-tenancy de verdad —resolución desde JWT, headers falsificables, scopes de DI que el framework abre por su cuenta—: eso necesita un borde HTTP autenticado y un framework de mensajería, y forzarlo convierte el juguete en otra cosa. Ese tramo se enseña como criterio explicado, apoyado en el hueco que el alumno ya sintió.

## 14. "Arranqué un segundo proceso contra el mismo event store" — config divergente, dueño del daemon y escritores en paralelo

**Valor:** bajo · **¿Sentible con el dominio de juguete?** no · **Visto en:** BuildingBlocks, Contabilidad, Impuestos, Terceros, EstructuraOrganizacional, Radicacion, ControlPlane

**💥 El dolor que lo hace necesario.** Dos procesos contra la misma base: uno escribe, otro lee. Cada uno configura su store por separado y, con el tiempo, divergen en un detalle —cómo se nombran los eventos, cómo se identifica el stream, qué serializador—. Nada falla al compilar ni al arrancar: el lector simplemente deja de entender lo que el lector escribió, meses después. La variante operativa es peor: dos procesos que ambos creen ser dueños de construir la misma vista se pisan, y en un despliegue escalonado el que gana puede ser el que todavía corre el binario viejo, proyectando con código desactualizado.

**✅ Lo que hacen bien (y por qué funciona).** Una sola función de configuración del store, usada por todos los hosts *y por los tests*: `MartenStoreOptionsExtensions` en BuildingBlocks para los dos stores (comandos y consultas), `ProyeccionesRegister` en Contabilidad y Terceros invocado desde API, MCP y fixtures. Sobre eso, la propiedad del daemon se decide por topología, no por proyección: un host dueño, los demás registran las proyecciones con `DaemonMode.Disabled` para poder leerlas sin procesarlas; ControlPlane elige `HotCold` sabiendo que habrá réplicas. Y donde dos escritores concurrentes eran inevitables, los eliminan en el transporte: una cola con sesiones y `SessionId = TenantId`, declarada en Terraform.

**🛠️ El reto (cómo lo descubriría el alumno).** No hay reto honesto aquí. Con un solo proceso, un solo host y sin daemon, el alumno no puede provocar ninguno de estos fallos: no hay segunda configuración que divergir, no hay agente que reasignar, no hay despliegue escalonado. Cualquier montaje que lo simule (dos `docker run`, dos consolas) le enseñará a operar el simulacro, no a reconocer el problema.

**🔍 Cómo se comprueba.** Lo que sí es comprobable y barato: un test que construya la configuración del store real y valide su topología sin base de datos, y un segundo test que fije una regla de arquitectura ejecutable (por ejemplo, "ninguna vista se construye por dos vías a la vez"). Eso convierte una convención frágil en algo que falla en segundos.

**🧠 El descubrimiento.** La configuración del event store es parte del formato de los datos, no del arranque de un proceso: duplicarla entre hosts es programar una incompatibilidad con retardo. Y "quién construye la vista" es una decisión de despliegue, no un atributo de la proyección.

**⚠️ Cuidado de método.** Dilo sin adornos: este dolor no se puede sentir con el dominio de juguete, y fingirlo sería exactamente el error de escribir en reversa desde la respuesta. Preséntalo como criterio explicado —una advertencia corta anclada al momento en que el alumno separe lectura de escritura, con el síntoma nombrado ("el lector deja de entender lo que el escritor guardó") y el remedio en una frase—, o déjalo fuera del arco y guárdalo para el material de operación. Lo único que vale llevar al taller es el test de configuración: cuesta poco y no requiere ni un segundo proceso.

