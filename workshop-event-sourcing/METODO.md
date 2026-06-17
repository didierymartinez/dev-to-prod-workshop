# Método del taller de Event Sourcing — brief para construir (criterios)

> Este documento es la **instrucción para quien construya el taller** (humano o agente). Captura el método del taller viejo (`eventsourcing-workshops-basics/secciones/`), que es el que queremos reproducir, con la narrativa cambiada a la `Empresa` de `gestion-empresas` y el stack actualizado (.NET 10 / C# 14, Marten 8, Wolverine 5). **No es un libro: es una guía que lleva a la persona paso a paso, enseñando por descubrimiento.**

---

## 1. La idea rectora

**Se aprende por descubrimiento, no por exposición.** El alumno **construye** algo ingenuo, **siente** su límite, lo **evoluciona**, y solo entonces se le **nombra** el patrón. El currículo (qué debe saber, qué evolucionó a qué patrón) lo conocemos **nosotros**; el alumno lo descubre como si lo dedujera él. Nunca se anuncia "ahora viene la teoría de X".

**El código es el protagonista; el texto solo conecta.** Cada idea se muestra como código que **cambia entre un bloque y el siguiente**. El aprendizaje vive en el *diff*, no en el párrafo. El texto explica el *porqué* del cambio, breve.

---

## 2. El motor pedagógico: ingenuo → dolor → refactor(es) → nombre

Cada concepto sigue este arco. **Clave que faltaba en mi intento:** el refactor casi nunca es un solo paso — son **varios refactors escalonados** en la misma sección, cada uno disparado por un dolor nuevo, subiendo el nivel poco a poco.

```
🟢 ingenuo   → la solución obvia (a veces fea a propósito)
💥 dolor     → "esto crece feo / se repite / no se puede probar / borra el pasado"
🔧 refactor 1 → resuelve ESE dolor … y revela el siguiente
💥 dolor 2   → "y ahora esto otro"
🔧 refactor 2 → … y así, escalando
🏷️ nombre    → recién aquí: "esto que hiciste se llama X" (Apply, AggregateRoot, evolve…)
```

**Ejemplo real (§04 del viejo, a imitar):** el `if` dentro del constructor → (refactor 1) se extrae a un método `Aplicar` → "si llega otra entidad copiarías esto" → (refactor 2) se sube a una **clase base abstracta** con el motor `Load` → "ese `if` sigue siendo rudimentario" → (refactor 3) se elimina el `if` con ruteo por tipo. Tres saltos, tres dolores, en una sección. **Cada salto, justificado.** (En nuestra versión, el refactor de ruteo va a `switch` por tipo, no a `dynamic` — ver §8.)

**Regla del nombre:** el patrón se nombra **al final del refactor**, no antes. "Acabas de escribir, sin saberlo, un `evolve`."

---

## 3. Anatomía de una sección (dispositivos disponibles, no plantilla rígida)

El viejo NO usa marcadores fijos; usa un **repertorio** de recursos según haga falta:

- **`🎯 El Objetivo`** — abre con una **pregunta concreta del negocio** que aún no se sabe responder ("¿cómo sé qué edad tiene hoy sin guardar `Edad=34`?"). Motiva antes de codificar.
- **Cuerpo = código que evoluciona** — bloques de código consecutivos donde cada uno mejora al anterior; prosa mínima entre ellos explicando el porqué.
- **Cajas `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]`** — explican una **mecánica de C# o un porqué justo cuando aparece**: p. ej. "¿por qué clase abstracta y no interfaz?" con su consecuencia concreta (tendrías que copiar el bucle), o "cómo funciona `dynamic`". Nunca teoría adelantada: la nota explica lo que el lector **acaba de tocar**.
- **`> 🌱 Semilla`** — ancla un concepto avanzado que el alumno **acaba de rozar**, con su nombre técnico, para cosecharlo (🌳) más adelante. Es repetición espaciada. Puede mencionar que se verá a fondo después, pero su valor es **anclar el nombre**, no aplazar.
- **Tablas** — para **recapitular** ("lo que ya construiste", §11b), para **el dolor** ("lo que costaría mantener esto a mano"), o para **mapear** ("tu pieza → su equivalente en el framework").
- **`### El Descubrimiento`** — cierre que **nombra el patrón/lección** recién vivida en una frase memorable.
- **Navegación** `⬅️ / ➡️` al pie.

Una sección típica = 🎯 pregunta → código que evoluciona con sus cajas → 🌱 semilla(s) → El Descubrimiento → siguiente.

---

## 4. Técnicas de aprendizaje a usar deliberadamente

1. **Descubrimiento guiado:** el alumno "deduce" la solución; nosotros diseñamos el camino para que la deduzca.
2. **Repetición espaciada:** 🌱 semilla (plantar nombre) → reaparición → 🌳 cosecha (explicación a fondo). Mantener un mapa de semillas/cosechas.
3. **Consolidación con tablas de recap** en los puntos bisagra ("esto es todo lo que ya sabes").
4. **Metáforas con propósito y sostenidas:** el "diario vs foto", "escrito en piedra", "rehidratar", "el cartero interno". Una metáfora por concepto, reutilizada.
5. **Humor cálido como recordación:** toques memorables ("tu empresa tiene amnesia", "el `UPDATE` es un borrón y cuenta nueva, literal") — el humor es **técnica de retención**, no relleno; siempre al servicio del concepto.
6. **Nombrar SIEMPRE después de hacer:** primero la experiencia, luego la etiqueta.
7. **Comparar opciones por su consecuencia concreta:** no "usa clase abstracta"; sino "si usaras interfaz, **tendrías que copiar el bucle en cada clase**; por eso, abstracta".
8. **Levantar la magia:** mostrar lo que el framework hace por dentro (el SQL de Marten, el código que Wolverine genera) para que nada sea caja negra.

---

## 5. Reglas duras (lo que el agente NO debe hacer)

- **NO** secciones de teoría/conceptos por adelantado. Hay **un solo** arranque conceptual (la metáfora inicial). El resto, descubrimiento.
- **NO** glosario ni "esto es pre–event sourcing". Los fundamentos de C# (records, switch, genéricos, delegados, async, DI, extension members…) **se descubren cuando un problema los pide**, no en una fase rotulada "fundamentos".
- **NO** instalar ni nombrar una herramienta antes de necesitarla. **Solo .NET** hasta que un dolor pida más. Docker entra cuando toca persistir (Postgres). La plantilla `Cosmos.BuildingBlocks` **no se nombra explícitamente** (ver §8).
- **NO** "lo verás en la sección X" como aplazamiento. La única forma permitida de mirar al futuro es la **semilla 🌱** (anclar un nombre con propósito).
- **NO** introducir una construcción del lenguaje sin un para qué inmediato. (El error del `with`: se mencionó sin que nada lo necesitara → se siente vacío. Solo introducir `with` cuando `evolve` necesite devolver un estado nuevo inmutable.)
- **NO** un solo refactor tímido: escalar varios pasos hasta el patrón maduro (§2).
- **Al adoptar un framework**, meter una **sección-bisagra** (como §11b): recap de lo hecho a mano → tabla de dolor de mantenerlo → qué es cada herramienta, qué reemplaza **de lo tuyo** y **cómo lo hace** → principio anti-cargo-cult ("lo adoptas porque sentiste la necesidad, sabes qué hace, cómo, y puedes depurarlo").
- **GUIAR A HACER, NO SOLO MOSTRAR (regla dura, aprendida del build-along — el taller es hands-on, no un artículo).** Cada sección debe **mandar al alumno construir**. En concreto: **(a)** cada bloque de código va precedido de su **acción explícita** — *crea el archivo `X.cs` con…* / *🔁 reemplaza tu clase `Y` por esta (y borra la anterior)* / *añade este método a `Z` — la clase queda así, completa*; nunca un bloque "huérfano" que el alumno no sepa dónde poner ni si reemplaza algo. **(b)** los bloques 🔁 muestran el **tipo COMPLETO** redefinido (o se dice exactamente qué fundir), nunca fragmentos que omitan miembros existentes. **(c)** **instalar paquetes explícitamente** cuando hagan falta (`dotnet add package …`; un `dotnet new console` no trae DI, etc.). **(d)** nada que se muestre pero no se pueda ejecutar sin avisar (pruebas con paquete no instalado → instalarlo o marcar "léelo, no lo ejecutes aún"). **(e)** **sin código huérfano**: lo que una versión reemplaza, se manda **borrar**. **(f) RETA a fabricar el código, no lo dictes — el corazón del estilo hands-on.** Ciclo: **RETA → INTENTA → REVELA → EJECUTA → COMPRUEBA**. Por defecto, describe en **prosa** QUÉ construir (NO el código) y **rétalo a intentarlo** — ej.: *"crea una clase `Empresa`, mete las variables como propiedades, y en el constructor recibe la historia y corre el `foreach`. **Ve e inténtalo.**"*— y **solo después revela** la solución en un `<details>` colapsable (`<summary>👉 Muéstrame una forma de hacerlo</summary>`), framing de "una forma" (su intento válido puede diferir). Cierra el paso/sección con **🔍 Compruébalo**: ejecutar → **revelar el resultado esperado** → *"¿lo lograste?"* (que corra y observe **antes** de ver la respuesta; no spoilear). El alumno **fabrica el concepto** antes de verlo. **EXCEPCIÓN (no frustrar):** idiomas demasiado nuevos para inventar de cero (genéricos con restricciones `where T:…,new()`, reflexión, `dynamic`, async/await, el contenedor de DI, el store/factory) → ahí SÍ se **muestra** el código con su acción explícita (crear/reemplazar/ejecutar). **Criterio:** si un alumno que entendió lo anterior PODRÍA escribirlo, **rétalo**; si no, **muéstralo** (pero igual con acción + ejecutar + comprobar). Patrón: **🛠️ Inténtalo tú** (el reto en prosa) → `<details>` (la solución) → **🔍 Compruébalo** (ejecuta + resultado esperado + ¿lo lograste?). Criterio de aceptación: el **build-along** (§9) no debe encontrar huecos de accionabilidad.

---

## 6. El arco macro (orden, heredado del viejo, con narrativa Empresa)

Construir el motor **a mano**, luego revelar el framework, luego profundizar:

1. **Arranque** (1 sección concepto): diario vs foto, sobre la `Empresa`. Nombra "Event Sourcing".
2. **Motor a mano** (varias secciones, puro .NET): hechos como `record` → replay/`evolve` → `AggregateRoot` (con sus refactors escalonados) → `EventStream` → `EventoAlmacenado`+`Version` → `IEventStore`/almacén en memoria → `decide` (reglas que emiten eventos) → `CommandHandler` (cargar→decidir→guardar) → `async` (sentir el dolor de bloquear) → DI (de `new` a contenedor).
3. **Persistencia real**: Docker + PostgreSQL + JSONB (aquí, y no antes, entra Docker).
4. **Bisagra de adopción** (estilo §11b): por qué/qué/cómo de Marten + Wolverine.
4b. **Convergencia a la forma de producción** (refactor guiado, OBLIGATORIO antes de revelar — sale de la auditoría de alineación con la plantilla): lleva el motor a mano a la forma exacta del canon, para que la revelación sea renombrar/intercambiar 1:1 y no un rediseño. Concretamente: el `AggregateRoot` pasa a **acumular** sus hechos (`_uncommittedEvents` + un `Raise/Emitir` que aplica y encola) en vez de que `decide` los devuelva; `Aplicar(object)+switch` → métodos **`Apply(TipoConcreto)`** hallados por reflexión; la **`Version` migra del stream al agregado**; y se **elimina el `EventStream`-ventana**, sustituido por un store-directo con las firmas del canon (`GetAggregateRootAsync<T>(id, ct)` / `AppendEvent(id, evt)` / `StartStream(ar)` / `SaveChangesAsync(ct)`). Cada paso es su propia lección de descubrimiento (el dolor que motiva cada forma de producción). Las semillas de §02/§05/§06 ya anticipan esta inversión.
5. **Revelar Marten** (reemplaza tu store **ya convergido**; mapeo 1:1; muestra `mt_events` y el SQL).
6. **Revelar Wolverine** (reemplaza tu enrutamiento; handlers por convención).
7. **Outbox/Inbox** transaccional (el "mensajero muerto").
8. **CQRS y proyecciones** (live/inline/async daemon; cuándo NO).
9. **Decider + Aggregate Handler Workflow** (A-Frame; el corazón).
10. **Versionado/upcasting**, **testing sin mocks (given-when-then)**, **reflexión vs codegen** (levantar la última magia), **middleware**, **anti-corruption layer**, **envelope/contexto**, **dos bounded contexts**.
11. **Capstone**: reconstruir un bounded context de la `Empresa` de punta a punta.

---

## 7. Adaptaciones obligatorias para NUESTRO taller

- **NUMERACIÓN Y GRANULARIDAD (instrucción explícita del usuario): el entendimiento manda, no un conteo fijo.** Se puede **renumerar** y **crear secciones intermedias** libremente: si un concepto necesita su propia sección para entenderse **al detalle**, se crea — UNA idea por sección, sin amontonar. Preferir más secciones cortas y nítidas que una densa. Al insertar/renumerar: actualizar los enlaces ⬅️/➡️ de las vecinas y el README, y correr el validador (caza enlaces rotos). Se puede usar sufijo (`NNb-…`, como el viejo `11b`) para insertar sin renumerar en cascada, o renumerar de corrido cuando deje la secuencia más clara. Zonas que casi seguro se parten en VARIAS secciones: la **convergencia 4b** (AggregateRoot acumulador / `Apply` por tipo / `Version` al agregado / store-directo — cada una su lección), y **revelar Marten + anatomía de BuildingBlocks + las dos vertientes** (no caben en una sola).
- **Narrativa:** la biografía de la **`Empresa`** (registrada → cambió de plan → suspendida → reactivada…), no la persona "Jhon". Sin personajes; la empresa es el hilo.
- **Stack:** **.NET 10 / C# 14**, Marten 8.23, Wolverine 5.18 (lo que usa la plantilla).
- **`switch` en vez de `dynamic`:** el viejo rutea eventos con `((dynamic)this).Apply(...)`. Su propia auto-crítica (`REVISION-CRITICA.md`) lo marca como problemático (costo del DLR, `RuntimeBinderException`). Nosotros evolucionamos el `if` a un **`switch` expression con patrones de tipo** (tipado, sin reflexión), y dejamos `dynamic` solo como mención. Mantener el **método** (refactor escalonado), mejorar la **técnica**.
- **La plantilla, implícita + como canon:** `Cosmos.BuildingBlocks` **no se nombra**. Pero lo que el taller enseña debe ser **compatible** con ella. Procedimiento: al llegar a cada concepto de Marten/Wolverine, **leer la plantilla y la doc oficial**; lo que aparezca en **ambos** se vuelve **fundamento obligatorio**; donde la plantilla **diverja** de la doc oficial, **evidenciarlo** (caja de nota: "la plantilla hace X; la doc recomienda Y") — útil para mantenerla al día.
- **ANCLAJE A LA PLANTILLA (regla dura, aprendida a la mala — el norte es DOMINAR la plantilla):** *implícita ≠ sin guiar.* CADA pieza que el alumno construye **a mano** (evento, sobre, store, stream, handler, id, versión, identidad…) se diseña haciendo **ingeniería inversa DESDE su contraparte real** en la plantilla/Marten, para que la "revelación" posterior sea **renombrar/intercambiar (1:1)**, NO un rediseño. Antes de escribir cualquier abstracción a mano, responder: *¿qué forma tiene esto en la plantilla/Marten, y cómo hago que lo mío converja ahí — sin nombrarla?* Ejemplos del modelo correcto (ya aplicados): el stream se **obtiene del store** (`store.AbrirStream` ↔ `FetchForWriting`/`AggregateStreamAsync`), no se construye con `new`; el **id del stream es la llave**, separado del payload del evento (los eventos no llevan id); `IEventStore` se extrae **al hacer el swap** a Marten (2ª implementación). **Si una sección a mano no mapea 1:1 a la plantilla, está mal diseñada — rehacerla, no parchearla.** Chequeo por sección: "¿esta abstracción se convierte en su equivalente de la plantilla con solo cambiar nombres/quitar el andamiaje?"
- **DOS VERTIENTES DE PERSISTENCIA — enseñar AMBAS, evidenciar el porqué de cada una, habilitar el MANTENIMIENTO (mandato para las secciones de revelar-Marten y anatomía-de-BuildingBlocks):** hay dos caminos reales para cargar/guardar un agregado, y el aprendiz —que mantiene la plantilla— debe dominar los dos y el puente:
  - **NATIVO (Marten/Wolverine = lo que dice la doc del creador, el camino recomendado/optimizado):** `FetchForWriting<T>(id)` → devuelve un `IEventStream<T>` (trae el agregado, anexas hechos, concurrencia optimista incluida); el `[Aggregate]` de Wolverine lo auto-cablea con inbox/outbox durable; lectura con `AggregateStreamAsync`/`FetchLatest`.
  - **LA PLANTILLA (lo que el equipo usa y soporta):** una **capa propia** sobre las APIs de bajo nivel de Marten — `IEventStore`/`MartenEventStore` que usa `AggregateStreamAsync`+`AppendEvent`+`StartStream` (**NO** `FetchForWriting`, verificado: 0 ocurrencias) + `AggregateRoot` OO acumulador con **eventos públicos/privados** + `MartenUnitOfWork` + `UnitOfWorkMiddleware`.
  - **POR QUÉ la plantilla eligió su capa (las razones, con evidencia):** (1) **testeo sin BD** — existe un `TestStore` en memoria que implementa `IEventStore`; (2) **separación público/privado** (`GetPublicEvents`/`GetPrivateEvents`) para rutear integración (RabbitMQ/ASB), que el nativo no da; (3) **portabilidad/uniformidad** (el dominio depende de sus abstracciones, no de Marten) + control del UoW/multi-tenancy.
  - **QUÉ CUESTA (los trade-offs, decirlos honestamente):** más código propio que mantener y mantener **correcto** (la concurrencia optimista ahora es responsabilidad de ellos, no de `FetchForWriting`); posible **costo de rendimiento** (replay vivo con `AggregateStreamAsync` si no agregan snapshots); y **divergencia del camino recomendado** → seguirle el paso a la doc del creador cuesta más (hay que traducir mentalmente). 
  - **CÓMO enseñarlo:** mostrar el nativo, mostrar el de la plantilla, **contrastar lado a lado** en una caja ("Marten recomienda X; la plantilla hace Y porque Z; cuesta W"), y cerrar orientando al **mantenimiento**: cómo decidir si plegar una mejora futura de Marten a la capa propia o migrar a lo nativo. La convergencia 4b apunta a la forma de la **plantilla** (no a `FetchForWriting`).
- **`AggregateRoot` OO de la plantilla:** al construir el `AggregateRoot` a mano, llegar a la **misma forma** que usa la plantilla (clase mutable con `Apply` por tipo + lista de eventos no confirmados + separación de eventos públicos/privados), de modo que el alumno, sin que se lo digan, esté construyendo justo lo que mantendrá.

---

## 8. Cobertura: qué de lo PLANEADO no cubre el viejo / queda incompleto / está desligado

Comparando el viejo (`secciones/`, lo realmente escrito) contra lo que necesitamos (PLAN v2 + inventario de `Cosmos.BuildingBlocks`):

### Cubierto y sólido (reusar el método tal cual, con narrativa Empresa)
Eventos `record`, replay/`evolve`, `AggregateRoot`, `EventStream`, almacén en memoria, `decide`, `CommandHandler`, async, DI, Docker/Postgres/JSONB, bisagra de adopción, Marten (store), Wolverine (mediador), Outbox, CQRS/proyecciones, Decider+Aggregate Handler, versionado/upcasting, testing sin mocks, reflexión vs codegen, middleware, ACL, envelope, dos bounded contexts.

### NO cubierto (existe en el PLAN/plantilla, falta escribir)
- **C# 14 extension members** (`extension(X){}`) — es la firma de TODOS los `*Extensions.cs` de la plantilla; el viejo no lo trata. **Debe descubrirse** (de método de extensión clásico → bloque `extension`).
- **Eventos públicos vs privados** (`IEvent`/`IPublicEvent`/`IPrivateEvent`) y sus **senders** — núcleo de la plantilla; el viejo solo roza "domain vs integration" en el Outbox.
- **Transportes concretos:** RabbitMQ (outbox/inbox duradero, `ToRabbitExchange`, `ListenToRabbitQueue`) y **Azure Service Bus** (serverless, `SendInline` vs `UseDurableOutbox`). El viejo no los construye.
- **Multi-tenancy** (`ITenantResolver`, `InvokeForTenantAsync`, `DeliveryOptions.TenantId`, Marten `TenancyStyle.Conjoined`) — horneado en la plantilla; el viejo no lo enseña.
- **La capa propia de la plantilla:** `IEventStore`/`MartenEventStore`, `MartenUnitOfWork` + `UnitOfWorkMiddleware` (After/Finally) + `AutoApplyTransactions`, los routers, `Tap`/`Map`, `Linq.Extensions`. El viejo enseña el Aggregate Handler **nativo** (FetchForWriting), no la capa que la plantilla construyó encima.
- **El paquete de testing de la plantilla** (`TestStore`, `CommandHandlerTest(Base/Async)`, `TestPublic/PrivateEventSender`, given-when-then con xUnit v3 + AwesomeAssertions). El viejo enseña el *concepto* de testing sin mocks, no este paquete concreto.
- **Mantener/publicar los paquetes NuGet** (versionado por `.csproj`, directiva `publish(...)`, pre-release, empaquetado). Ausente en el viejo.
- **Snapshots, rebuild de proyecciones, subscriptions, sagas/process managers, dead-letter queues, observabilidad (OpenTelemetry)** — listados como 💡 en el ROADMAP viejo pero **nunca escritos**.

### Incompleto / desligado en el viejo (corregir al reconstruir)
- **El capstone (§17, plantilla Cosmos) está a mitad del taller** (entre §14 y §18) → usa `[Aggregate]`/`FetchForWriting`/`IPublicEvent` **antes** de explicarlos. **Desligado.** En el nuestro, el capstone va al final.
- **Saltos de hilo narrativo:** de "Jhon" a `OrdenDeCompra` (Cosmos) en §17. En el nuestro, una sola narrativa (`Empresa`) de principio a fin.
- **Referencias colgantes:** §15 y §16 enlazadas pero inexistentes. (Validar enlaces desde el día 1.)
- **Dos workshops solapados** (`fundamentals-workshop/` + `secciones/`) re-enseñan lo mismo (records, DI, comando, CQRS, outbox). En el nuestro, **un solo flujo** con los fundamentos disueltos en el descubrimiento.
- **CloudEvents** se cita en los READMEs de la plantilla pero **no está en su código** → tratarlo como estándar opcional, no como "lo que hace la plantilla".
- **Ejemplos de README de la plantilla desactualizados** (`Save`/`GetByIdAsync` no existen; la API real es `StartStream`/`AppendEvent`/`Query<T>`) → usarlo como **ejercicio de mantenimiento** (parte de "estar al día con la doc").

---

## 9. Cómo se construye (proceso)

1. Una sección a la vez, siguiendo el arco (§6).
2. Cada sección: arranca con la pregunta, evoluciona el código, nombra al final, siembra semillas.
3. Validar con `tools/validate-workshop.sh` + agentes (coherencia, técnico que ejecuta `dotnet build`, principiante).
4. En las secciones de Marten/Wolverine, ejecutar el contraste plantilla ↔ doc oficial y dejar las cajas de divergencia.
5. Mantener el mapa de semillas 🌱 → cosechas 🌳 para la repetición espaciada.
6. **CALIFICACIÓN JUNIOR (paso de flujo fijo, pedido por el usuario):** cada sección la **califica el agente `revisor-principiante`** leyéndola en orden como novato (✅ entendí / 🟡 me costó / 🔴 no entendí + fricciones + ¿refuerzo?), y su veredicto se **registra en `MAPA.md`** (panel de calificación junior). Esa calificación del agente **se suma a la del propio usuario** (que hace el taller y marca). Con ambas se decide: reforzar, partir, añadir ejemplo, o seguir. La calificación del agente supera al pre‑juicio de "Refuerzo" del MAPA donde difieran (es lectura real, no estimación).
7. **BUILD-ALONG (paso de flujo fijo, pedido por el usuario — la prueba de fuego de la guía):** un agente (`verificador-e2e`) hace de **alumno literal**: levanta el proyecto y lo va **construyendo siguiendo SOLO lo que el texto ordena**, y reporta cada **hueco de accionabilidad** (código sin decir dónde va / qué borrar / qué instalar / ejecutar / qué observar) y cada error de compilación. Es más potente que leer (§9.6) y que compilar-el-estado-final (verificador-técnico): **solo construir de verdad** caza bugs como un `using` sin su `dotnet add package` (caso real: §09 no mandaba instalar `Microsoft.Extensions.DependencyInjection`). Resultados al `MAPA.md`. Una sección no se da por buena hasta que el build-along la construya sin huecos.

---

## 10. Lente junior — checklist obligatorio al crear cada sección

> Destilado del agente `revisor-principiante` (lee como un novato que se defiende con el PC pero **no** con desarrollo: no conoce la jerga, no "rellena huecos", hace exactamente lo que dice la sección). En vez de revisar al final, **se construye cumpliéndolo desde el inicio**. Antes de dar una sección por hecha, verificar cada punto:

1. **Cero jerga sin estrenar.** Ningún término técnico (stream, replay, agregado, clase abstracta, pattern matching, `switch` expression, daemon, provider, outbox…) aparece sin nombrarse/explicarse **en el momento en que se usa**. Nunca antes (teoría adelantada), nunca después (usado sin explicar).
2. **Cada comando dice DÓNDE y QUÉ se ve.** En qué carpeta se ejecuta y cuál es la **salida esperada** (un `// imprime …` o un "deberías ver X"). El novato no adivina el contexto ni si le funcionó.
3. **Sin "simplemente/obviamente" ni saltos sin puente.** Nada de "ahora solo añade X" sin el cómo exacto. Si un paso sube de nivel, hay un puente.
4. **Código completo y ubicado.** Cada bloque es ejecutable o dice **qué reemplaza** ("sustituye el cuerpo del método por…"); no se asume que el novato rellena los huecos.
5. **Comprobación clara.** Cada sección deja una forma concreta de saber si salió bien (correr y ver tal salida; `✅ Compruébalo`).
6. **Sin supuestos no enseñados.** No se pide un archivo, credencial o paso que no se haya preparado antes dentro del propio taller.
7. **Comparar por consecuencia, no por dogma.** No "usa una clase abstracta"; sino "si usaras interfaz, **tendrías que copiar el bucle en cada clase**; por eso, abstracta". El novato entiende el porqué, no obedece.
8. **Evolución sin romper al alumno.** Cuando una sección **modifica un tipo ya escrito** (cambia una firma, agrega un campo a un `record`, reescribe una clase): (a) **mostrar el tipo redefinido completo** —no describirlo solo en prosa—; (b) marcarlo con 🔁 **"reemplaza tu X anterior por esta (no la dupliques)"**; (c) nombrar **qué bloque viejo borrar** (el `var …`/`new X(...)` que quedó huérfano). Y cuidar el orden del `Program.cs`: **código suelto arriba, declaraciones de tipo al final**. *(Esta familia de fricciones —firmas que cambian sin avisar, un `record` con campo nuevo que nunca se muestra— rompió al alumno en la validación de §04-05.)*

Regla operativa: al terminar una sección, **releerla con esta lente** (o pasar el agente `revisor-principiante`) y cerrar cada fricción **antes** de avanzar a la siguiente.

---

## 11. Lente de rigor técnico (validación contra la doc oficial)

> Destilado de `REVISION-CRITICA.md` del viejo (que lo validó contra la doc de Microsoft C#, Marten y Wolverine). Filosofía: **"si parece magia, falta una sección."** El objetivo es que el alumno *entienda el mecanismo*, no que *use la plantilla*. Exigir en cada sección:

1. **Desarmar la magia, no describirla.** Si algo "simplemente funciona" (un contenedor de DI, un dispatch por tipo, el outbox, un mediador), construir su **mini-versión a mano** antes de adoptar la del framework. Sale sabiendo *cómo*, no solo *usar*.
2. **Siempre el tradeoff y el "cuándo NO".** Ningún patrón es gratis ni absoluto: nombrar su costo y cuándo no usarlo (Repository sobre un ORM que ya es Unit of Work; CQRS en un CRUD simple; `dynamic`).
3. **Checkpoint de comprensión.** Una sección no está lista si el alumno solo sabe la *sintaxis*: debe poder **explicar el mecanismo**. El `✅ Compruébalo` incluye un "explica por qué/cómo", no solo "corre y ve".
4. **Corrección técnica — nada obsoleto ni medias verdades.** Precisiones obligatorias (errores reales que el viejo cometió y NO debemos repetir):
   - **records:** la inmutabilidad es **superficial** — un `record` con una `List` deja mutar su contenido, y `with` hace copia superficial. `record class` (referencia, igualdad por valor) ≠ `readonly record struct` (value object real). *(Sembrar 🌱 cuando un evento lleve una colección.)*
   - **interfaces:** desde **C# 8** pueden tener **métodos por defecto**; la diferencia real con `abstract class` es **estado de instancia + herencia única**, NO "la interfaz no tiene código". *(Ya corregido en §03.)*
   - **`dynamic`:** usa el DLR, hace boxing, y revienta en **runtime** (`RuntimeBinderException`) sin error de compilación; más lento → preferir `switch` tipado.
   - **DI:** separar **DIP / IoC / DI / contenedor**; el contenedor = registro + reflexión + recursión (de ahí el **mini-contenedor**); trampas: *captive dependency* (Scoped dentro de Singleton), *service locator* como anti-patrón, *composition root*.
   - **async:** compila a una **máquina de estados**; en ASP.NET Core/Functions **no hay SynchronizationContext** → `.Result` causa **starvation de hilos**, no deadlock; `CancellationToken` en todas las APIs; `ConfigureAwait(false)` en librerías; `async void` peligroso.
   - **eventos:** **Domain** (privado, mismo contexto) vs **Integration** (público, cruza el bus) — es el `IPrivateEvent`/`IPublicEvent` de la plantilla.
   - **agregado:** **una transacción = un agregado**; dimensionar por invariantes (no agregados gigantes); evitar el modelo anémico.
   - **CQRS:** la **consistencia eventual** es una consecuencia; el read model/proyección es ciudadano de primera; nombrar el "cuándo NO".
   - **mensajería:** entrega **at-least-once** → el consumidor necesita **idempotencia/dedup**; **Inbox** además de Outbox.
   - **event sourcing:** **concurrencia optimista** por versión de stream (dos comandos al mismo stream → conflicto de versión).
5. **Levantar la última magia del framework:** al llegar a Marten/Wolverine, mostrar el SQL que emite Marten y el **código que genera Wolverine** (`codegen`) — y por qué generan código en vez de usar reflexión por llamada (rendimiento + inspeccionable).

> `REVISION-NARRATIVA.md` del viejo aporta validaciones **estructurales** (capstone a mitad de camino, referencias colgantes §15/§16, dos workshops solapados) — ya recogidas en §8 de este documento.
