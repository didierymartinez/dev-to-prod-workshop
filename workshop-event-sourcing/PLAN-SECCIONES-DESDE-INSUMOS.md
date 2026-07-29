# 📐 Plan y guión — de los insumos a secciones vividas

> ⚠️ **El orden es UNA sola cadena — vive en [`SECUENCIA.md`](SECUENCIA.md).** Las etiquetas "S1–S11" de
> este documento **no son una pista aparte** del taller: son solo claves de detalle para posiciones de esa
> única cadena (S1 = posición 12, S2 = posición 19, …; el mapa está en `SECUENCIA.md`). Las "Partes A-E" y
> los "crecimientos E1-E6" son detalle por sección, no un ordenamiento. No hay bloques ni fases.

> **Qué es esto.** El **guión, el propósito y la planeación** de convertir los 14 insumos de
> [`INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md`](INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md) en secciones reales del
> taller. Es el plano de obra: qué sección nace de cada insumo, qué enseña, cómo se vive el dolor, qué
> hay que añadirle al dominio para que ese dolor sea real, y de qué depende cada una.
>
> **Qué NO es.** No es el orden final de las secciones —eso lo hila la
> [`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md), y lo decides tú—; aquí solo se fijan las
> **dependencias** (qué no puede ir antes de qué). Y no son las secciones escritas: es el guión desde el
> que se escriben, **una a la vez**.
>
> 🏗️ **La revisión completa de la planeación** (principios del aprendiz, cambios definidos en las 16
> secciones existentes, el arco completo de estaciones y el orden de la obra) →
> [`PLAN-DE-OBRA.md`](PLAN-DE-OBRA.md).

## La regla que rige la construcción (no negociable)

Cada sección se construye **viviéndola**: se escribe un *spike* que corre, se choca con el muro deverdad, y solo entonces se redacta. **Nunca en lote.** Generar las 11 de un tirón desde este plan sería
escribir *en reversa desde la respuesta* — exactamente lo que ya obligó a borrar la segunda mitad del
taller **dos veces**. El plan ordena el trabajo; no lo adelanta.

Y cada sección se cierra con el arnés `revisar-seccion`: validador determinista en verde + los tres
lentes (estilo / principiante / técnico) sin ningún `alto` pendiente + el código del `<details>`
spike-verificado contra los paquetes reales.

---

## 🌱 El hallazgo de planear esto: el dominio tiene que crecer

Una sola `Empresa` con cinco eventos **no puede alojar** la mayoría de estos dolores. Nueve de las 14
fichas piden, en su `⚠️ Cuidado de método`, algo que hoy el juguete no tiene. Y varias piden **lo
mismo**. Si cada sección inventa su propio añadido, el dominio se vuelve un collage incoherente. Así que
el crecimiento del dominio es **parte del plan**, no un detalle de cada sección.

Lo elegante: **parte de ese crecimiento ES una lección**. Añadir el catálogo de planes no es andamiaje
para otra cosa — es el cuerpo del insumo #10 ("¿esto merecía event sourcing?"). El dominio crece
*enseñando por qué crece así*.

| Crecimiento | Qué se añade | Nace en (su lección) | Habilita también |
|---|---|---|---|
| **E1 · El catálogo de planes** | Un `Plan` (nombre, precio) como **documento plano, NO event-sourced** | Insumo #10 (el criterio para NO usar ES) | Siembra idempotente por clave natural (#5); la "otra pregunta" del read model (#8) |
| **E2 · Una invariante de estado acumulado** | Regla en `Empresa` que dependa del historial (p.ej. "no aceptar un pago que deje el saldo negativo", o "no suspender dos veces" endurecido) | Insumo #11 (para que el hueco de concurrencia **se vea** mal) | Proyección acumuladora y su replay (#12); el dolor real de #3 |
| **E3 · Materia para agrupar por atributo mutable** | Un segundo eje de consulta: empresas **agrupadas por su plan actual** (mutable) — decisión pendiente: proyección `MultiStream` sobre atributo mutable vs. un segundo stream propio | Insumo #8 (read model por consulta, a fondo) | El caso difícil del *grouper* que la auditoría marcó como *mainstream* (49 usos/8 repos) |
| **E4 · La columna de contexto** | Un `cliente_id` en la tabla de eventos, leído del borde | Insumo #13 (el default silencioso) | — |
| **E5 · Un segundo proyecto que solo referencia contratos** | Un `.csproj` consumidor que compile contra los eventos públicos y **falle** cuando el modelo interno cambia | Insumo #6 (el evento como contrato) | El efecto externo del dual-write (#9) |
| **E6 · El tiempo** | Una línea rara y necesaria, sembrada temprano y **cobrada** varias secciones después | Insumo #1 (el comentario que sobrevive al mantenedor) | — |

> ⚠️ **Tensión a resolver cuando lleguemos a E3, no antes.** El insumo #8 pide "un segundo agregado que
> cruce con `Empresa`", pero el insumo #10 dice que el `Plan` debe ser un catálogo **plano** (si fuera
> un agregado, contradiría su propia lección de "esto no merecía ES"). La salida más limpia parece ser
> enseñar `MultiStream` como **agrupar empresas por su plan actual —un atributo mutable—**, que es
> justo el caso difícil (cuando una empresa cambia de plan, el *grouper* tiene que re-rebanar), y no
> necesita que `Plan` sea un agregado. Se decide viviéndolo, con el spike en la mano.

---

## Cómo leer cada ficha

**Propósito** (qué criterio/idea deja) · **💥 Dolor** (el muro que se vive) · **🎬 Guión** (los beats,
comprimidos) · **🛠️ Qué construye el alumno** · **🔍 Comprueba** · **🧠 Descubrimiento** ·
**🎚️ Sentible** (sí/parcial/no + el caveat de honestidad) · **🧩 Exige del dominio** · **🔗 Relación con
lo que ya existe**.

Las etiquetas **S1…S11** son de trabajo, **no un orden**. El orden lo pone la brújula.

---

# Parte A — Secciones nuevas

## S1 · Testing: "estaba verde y estaba roto" — afirmar el hecho, no el estado
*(insumo #2 · valor alto · sin hogar hoy)*

- **Propósito.** Que el alumno deje de confiar en el verde: en event sourcing el resultado de un comando
  **son los eventos**, y afirmar el estado interno afirma un intermedio que puede mentir.
- **💥 Dolor.** Escribe el test "natural" (muta la `Empresa`, afirma su estado). Borra la línea que
  appendea el evento al store. **Verde.** El sistema está roto y el test no se enteró.
- **🎬 Guión.** gancho ("¿tu motor funciona? demuéstralo") → escribe el test de estado → 🔨 rómpelo
  (borra el `Append`) → sigue verde → 💥 el intermedio miente → 🆕 Given-When-Then que compara la
  **lista de eventos** por equivalencia → rojo cuando falta el `Append` → 🌱 "¿y qué tan real es tu
  motor de mentira?" (puente a S2).
- **🛠️ Qué construye.** Un test que arma un historial (Given), ejecuta un comando (When) y afirma los
  eventos emitidos (Then). Segundo golpe: un test de *rebuild* sembrado, con el guard "la lista
  reconstruida no puede estar vacía", para que no pase vacuamente.
- **🔍 Comprueba.** Rompe una línea *load-bearing* a la vez; si ningún test se pone rojo, la cobertura
  es decorativa.
- **🧠 Descubrimiento.** El test afirma el efecto observable —los hechos—, no el estado que es solo un
  paso intermedio del *replay*.
- **🎚️ Sentible: sí**, entero, con la `Empresa` y (para la variante de fixture) un Postgres. *Caveat:*
  el falso verde por **config divergente entre hosts** necesita dos procesos → va como criterio en S? de
  bordes. Aquí se vive la mitad que importa.
- **🧩 Exige del dominio.** Nada nuevo. (Es la sección más barata y de las de mayor valor.)
- **🔗 Relación.** Primera sección de tests del taller. Es la **puerta natural a S2** (el puerto): para
  testear rápido, el alumno va a querer no levantar Postgres.

## S2 · El puerto propio: probar el dominio sin Postgres — y lo que la abstracción te tapa
*(insumo #11 · valor alto)*

- **Propósito.** Que el alumno viva las dos caras de una abstracción: le devuelve tests rápidos y
  libertad de motor, y le **cobra** todo lo que no dejó pasar por ella. El caso emblemático del taller
  (adoptar o no `FetchForWriting`) nace aquí, sentido.
- **💥 Dolor.** Cada test de una regla arranca Postgres, crea esquema, limpia tablas: minutos, y *flaky*
  cuando el contenedor va lento. Y el agregado empieza con `using Marten;` — cambiar de motor dejó de
  ser opción.
- **🎬 Guión.** dolor de la suite lenta → 🛠️ extrae del motor a mano la **interfaz mínima** que el
  dominio usa (cargar stream, appendear) → dos implementaciones: Postgres y diccionario en memoria →
  mueve los tests de reglas al de memoria, mide el antes/después → 🔨 provoca el hueco: dos "hilos"
  registran un pago sobre la misma empresa; **en memoria pasan los dos, y en Postgres también** → 🌱 "la
  interfaz que cortaste no tiene dónde decir «esperaba la versión 4»".
- **🛠️ Qué construye.** `IEventStore` (o `IDomainStore`) extraído del motor real + un `TestStore` en
  memoria + el mover la suite de reglas a él.
- **🔍 Comprueba.** `grep -r "Marten\|Npgsql" Dominio/` sale vacío; la suite de dominio corre sin
  contenedores. El hueco: dos cargas de la misma empresa, un pago en cada copia, guardar las dos → dos
  eventos, cero error. **Ese verde es el hallazgo.**
- **🧠 Descubrimiento.** La pregunta de mantenimiento no es "¿tengo un puerto?", sino "¿qué capacidad de
  la infraestructura acabo de volver inalcanzable, y quién lo va a notar?".
- **🎚️ Sentible: sí.** *Caveat:* el hueco de concurrencia **solo duele si hay una invariante de estado
  acumulado** (E2). Sin ella, dos escrituras concurrentes no producen nada visiblemente incorrecto y el
  descubrimiento se queda en teoría.
- **🧩 Exige del dominio. E2** (la invariante) para el punchline. La extracción del puerto en sí no
  exige nada.
- **🔗 Relación.** Refactor del motor de §1-9. Deja montado el `TestStore` que S1 y todas las de reglas
  van a usar. Abre el hilo `FetchForWriting` que cierra el capstone.

## S3 · "¿Esto merecía event sourcing?" — el criterio para NO usarlo
*(insumo #10 · valor alto · aquí nace **E1**)*

- **Propósito.** Frenar el "todo es un stream" recién aprendido el motor. El desempate no es
  rendimiento: es **reconstrucción temporal + invariante**.
- **💥 Dolor.** El alumno event-sourcea el catálogo de planes: tres eventos, una proyección, un daemon,
  rezago en los tests, un rebuild que mantener. El catálogo **no tiene ni una invariante ni una sola
  pregunta histórica**. Pagó toda la ceremonia y no cobró nada — y encima sus tests quedaron *flaky*.
- **🎬 Guión.** gancho ("ya tienes el martillo; ¿todo es clavo?") → event-sourcea el catálogo a
  propósito → sufre el rezago en el primer test → cuenta líneas escritas vs. preguntas respondidas → 🔧
  rehazlo como **documento plano** → compara → 🆕 el desempate en tres líneas para dos casos: `Empresa`
  (sí) y catálogo (no).
- **🛠️ Qué construye.** El `Plan` como documento plano (**E1**), y el desempate escrito.
- **🔍 Comprueba.** Dos preguntas ejecutables por candidato: ¿alguien necesita saber **cómo llegó** al
  estado, o basta el estado? ¿hay invariante que un `UPDATE` viole? Si ambas son no, borrar la
  proyección y contar las líneas y la latencia que desaparecen.
- **🧠 Descubrimiento.** Si nadie va a preguntar por el pasado y no hay invariante que proteger, un
  `UPDATE` es la respuesta correcta — y decirlo por escrito es parte del oficio, no una derrota.
- **🎚️ Sentible: sí**, y barato. *Caveat:* el argumento operacional del gateway sin estado (evidencia de
  la org) se menciona, no se convierte en reto.
- **🧩 Exige del dominio.** Es donde **nace E1**. La lección *es* el crecimiento.
- **🔗 Relación.** Contrapeso a todo §1-9. Su `Plan` plano alimenta S4 (clave natural) y S6 (otra
  pregunta).

## S4 · Dos streams con la misma clave — y el segundo clic del usuario
*(insumo #5 · valor alto)*

- **Propósito.** Que "leer antes de escribir" se revele como una **apuesta con ventana**, no una
  garantía; una invariante de conjunto solo la sostiene quien decide de forma atómica: el store.
- **💥 Dolor.** Protege la unicidad del NIT leyendo antes de crear. Dos peticiones simultáneas leen "no
  existe" y **ambas crean**: dos streams, mismo NIT. La concurrencia optimista de §9 no lo salva —
  protege *un* stream, no una clave que aún no tiene stream.
- **🎬 Guión.** unicidad por lectura previa → 🔨 dos registros del mismo NIT en paralelo → dos streams →
  intento con lock en memoria → solo sirve en un proceso → 🆕 localizador (clave→streamId) con índice
  único **dentro de la transacción del append** → una gana, la otra colisiona → 🌱 convertir la colisión
  en "esta empresa ya existe, te devuelvo la que hay" + reenviar el comando dos veces sin ensuciar el
  stream.
- **🛠️ Qué construye.** Un localizador NIT→streamId materializado en la misma transacción, con índice
  único; y la idempotencia del *write side* frente al doble clic.
- **🔍 Comprueba.** Dos escrituras concurrentes del mismo NIT → contar streams da 1 y la perdedora falla
  de forma reconocible. Reentrega: invocar el comando dos veces → el segundo no emite evento nuevo.
- **🧠 Descubrimiento.** Si el segundo intento del usuario no debe crear un hecho nuevo, la idempotencia
  es del *write side*, no un filtro que se le pide a la infraestructura.
- **🎚️ Sentible: casi entero** (NIT + índice único de Postgres). *Caveat:* la reentrega frente a un
  broker *at-least-once* real se **simula** invocando el handler dos veces — decirlo: es simulación
  honesta, no reentrega de verdad.
- **🧩 Exige del dominio.** La siembra idempotente por clave natural se apoya en **E1**.
- **🔗 Relación.** Extiende `el-almacen-por-id` y `concurrencia-optimista`: es el dolor que esos dos
  **no** cubren (clave sin stream todavía).

## S5 · "Lo que escribí ayer no lo puedo cambiar hoy" — la forma del hecho se congela
*(insumo #6 · valor alto)*

- **Propósito.** Que el evento deje de verse como un DTO: es un **registro público e inmutable** que el
  código de mañana tendrá que seguir leyendo.
- **💥 Dolor.** Guarda un evento con un campo de tipo abstracto (o le agrega un campo obligatorio, o
  renombra el record). Nada falla al compilar. Al releer el stream de ayer: el campo llega `null`, o el
  deserializador revienta con un `$type` que ya no existe. El JSONB de ayer no se puede editar.
- **🎬 Guión.** modela `PlanCambiado` con un campo polimórfico → siembra, cierra el proceso → 🔨 renombra
  o mueve la subclase de namespace → reconstruye desde Postgres → revienta → segundo golpe: campo
  obligatorio nuevo sobre eventos viejos → tercero: renombra el record y mira `mt_events.type` → 🆕
  eventos planos, campos opcionales al final, alias decidido a mano.
- **🛠️ Qué construye.** El evento reescrito plano; un alias explícito; y un test de caracterización que
  siembra la forma de "ayer" y exige el mismo estado tras el cambio.
- **🔍 Comprueba.** `SELECT data FROM mt_events` mostrando el `$type` con el nombre CLR viejo. Test de
  caracterización en verde tras renombrar.
- **🧠 Descubrimiento.** El evento se escribe plano, con campos opcionales y nombres que decidiste a
  mano — no los que el compilador te regaló hoy.
- **🎚️ Sentible: sí** (campo polimórfico + rename). *Caveat:* el **evento público como contrato aparte**
  (paquete propio, ACL) necesita un segundo consumidor → se vive en parte con **E5** (un proyecto que
  solo referencia contratos y falla al compilar); la separación de transportes público/interno va como
  criterio.
- **🧩 Exige del dominio.** Para el tramo del contrato-aparte, **E5**.
- **🔗 Relación.** Extiende `el-nombre-es-un-contrato` (que cubre el **nombre**; esta cubre la **forma**
  y abre el **upcasting**).

## S6 · "Pidieron otra pregunta y mi vista no sirve" — el read model se diseña por consulta
*(insumo #8 · valor alto · aquí se decide **E3**)*

- **Propósito.** En el *write side* manda el stream; en el *read side* manda **la pregunta**. La
  identidad del documento es la clave por la que vas a consultar, no la del agregado que lo originó.
- **💥 Dolor.** Tiene `EmpresaVista` con la lista de pagos embebida. Llega "los últimos 20 pagos de todos
  los tenants, paginados hacia atrás": con la lista dentro del documento no hay `WHERE` ni `ORDER BY` —
  toca traer todo y paginar en memoria.
- **🎬 Guión.** escribe la query real **primero** → intenta servirla desde la vista embebida → muro →
  re-llavea: un documento por pago, con `EmpresaId` y un ordinal, alimentado desde el mismo stream →
  🆕 `MultiStream` (1 stream → N documentos) → resiste la tercera proyección fusionando dos preguntas
  donde el acceso lo permita.
- **🛠️ Qué construye.** Una proyección re-llaveada por `PagoId`; y el caso difícil: agrupar empresas
  por su **plan actual (mutable)** — el *grouper* que re-rebana cuando una empresa cambia de plan.
- **🔍 Comprueba.** La consulta paginada se escribe como un solo `Query<PagoVista>()` con
  `Where`+`OrderByDescending`+`Take`, sin traer nada a memoria. Test de materialización con
  `BeEquivalentTo`.
- **🧠 Descubrimiento.** El read model no se diseña por agregado; se diseña por la consulta que va a
  responder.
- **🎚️ Sentible: sí** (los pagos ya dan "1 stream → N documentos"). *Caveat:* el multi-stream a fondo
  (grouper que no consulta el documento que construye, `FanoutMode.BeforeGrouping`) necesita **E3** —
  agrupar por atributo mutable es el único modo de que la restricción del grouper **se sienta** en vez
  de creerse.
- **🧩 Exige del dominio. E3** (resolver la tensión Plan-plano vs. segundo eje). Pagos ya existen.
- **🔗 Relación.** Extiende `la-vista-de-lectura` (que hace *una* vista; esta enseña *por qué otra*, y la
  forma correcta de la otra).

## S7 · "La vista va atrás de lo que acabo de escribir" — quién la construye y cuándo puedo creerla
*(insumo #7 · valor alto · **la brújula ya la designa como el §17 / primer panel Critter Watch**)*

- **Propósito.** El *lifecycle* de una proyección no se elige por costumbre: se elige por **quién la lee
  y qué decide con ella**. Y si toda proyección es asíncrona (como en la librería real), **medir el
  rezago** es la pieza que falta — la auditoría lo confirmó como hueco de plataforma.
- **💥 Dolor.** Registra una empresa y consulta la lista: no está. Refresca y aparece. Peor: pone una
  validación de comando a leer la vista, y con dos comandos seguidos la validación pasa dos veces porque
  la vista no se enteró del primero. Y un test falla 1 de cada 5, sin tocar nada.
- **🎬 Guión.** desacopla la proyección de la escritura (un *updater* con **checkpoint**, a mano) →
  construye la lista como proyección "async" → pone la regla de negocio a leerla → dispara dos comandos
  sin esperar → invariante violada → 🔧 muévela a "inline" y mide qué le costó al commit → 🆕 endpoint
  que responde `202` + recurso de estado en vez de un `404` mentiroso.
- **🛠️ Qué construye.** Un *updater* de proyección con checkpoint (el async por mano); y el contraste
  inline vs. async medido sobre la misma regla.
- **🔍 Comprueba.** Test que appendea y consulta sin esperar: rojo con async, verde con inline. Test de
  topología: recorrer las proyecciones registradas y fallar si alguna del *read-side* decide en async.
- **🧠 Descubrimiento.** Si alguien decide una escritura mirando la vista, no puede ir atrás. Si solo la
  mira un humano, el rezago es gratis y la API debería confesarlo.
- **🎚️ Sentible: parcial.** *Caveat honesto:* la mitad que importa (inline vs. async, read-your-write,
  el *flake*) **sí** se vive con el updater-con-checkpoint por mano. La topología de despliegue (host
  dueño, réplicas `Disabled`, `HotCold`, deploy escalonado) **no** — va como criterio con cita del repo.
  El `202`+push no se "sufre" sin UI: se presenta como decisión de contrato.
- **🧩 Exige del dominio. E2** (una invariante que dependa de la vista, para que "decidir sobre vista
  atrasada" muerda) + construir el *updater* async por mano (infra nueva del taller).
- **🔗 Relación.** Extiende `la-vista-de-lectura`/`reconstruir-la-vista` con el eje **tiempo/quién**.
  Primer panel del norte "Critter Watch".

## S8 · "El mismo hecho llegó dos veces" — reentregas, replays y qué reintentar
*(insumo #12 · valor medio)*

- **Propósito.** Idempotencia no es una pieza que se instala: son **tres decisiones en tres lugares**
  (comando, proyección, manejo de errores).
- **💥 Dolor.** El mismo hecho entra dos veces (reintento, reentrega, replay) y el sistema lo cree dos
  veces: el saldo proyectado se descuenta dos veces. El bug no se ve al escribir; se ve semanas después
  cuando alguien reconstruye la vista y el número sale distinto del que estaba en pantalla.
- **🎬 Guión.** escribe una proyección acumuladora (`Saldo -= pago`) → procesa el mismo evento dos veces
  (reaplica el fold, o reconstruye sin borrar) → número mal → intento "protege la entrada con una lista
  de ids vistos" → esa lista es otro estado que mantener → 🔧 reescribe el fold como **recálculo desde
  una base estable** (`Saldo = Base + Σ ajustes`) → en el *write side*: `Suspender` dos veces, ¿emite el
  segundo un evento?
- **🛠️ Qué construye.** La proyección reescrita como recálculo idempotente; y la decisión de
  idempotencia en el comando.
- **🔍 Comprueba.** `proyectar(eventos) == proyectar(eventos + eventos)` — falla con el acumulador, pasa
  con el recálculo. Y `Suspender` dos veces → un solo `EmpresaSuspendida` en el stream.
- **🧠 Descubrimiento.** La proyección se escribe para que reaplicarla no cambie nada; el replay es quien
  cobra esa disciplina.
- **🎚️ Sentible: parcial.** *Caveat:* la parte de **proyecciones** sí (reaplicar el fold es una llamada
  a un método). La parte de **reentregas de transporte** no: se finge llamando dos veces al handler —
  enseña la forma de la guarda, no el susto. El pipeline de mensajería va como criterio.
- **🧩 Exige del dominio. E2** (el saldo acumulado).
- **🔗 Relación.** Hereda de S6/S7 (ya hay proyecciones) y de `reconstruir-la-vista` (el replay ya se
  vive ahí — aquí se le exige idempotencia).

## S9 · "Faltaba el contexto y el sistema puso un default" — el dato perfecto en el lugar equivocado
*(insumo #13 · valor medio)*

- **Propósito.** En un log inmutable, un default silencioso no es un valor por defecto: es una
  **corrupción de identidad con caducidad infinita**. Vale más un error ruidoso en el borde.
- **💥 Dolor.** Falta un dato de contexto (de qué cliente es la petición) y, en vez de fallar, el sistema
  rellena con cadena vacía. Responde 200, nadie ve un error. El evento queda con la identidad
  equivocada, para siempre. Se descubre semanas después: un cliente ve datos de otro.
- **🎬 Guión.** añade `cliente_id` a la tabla de eventos, léelo de un header con `?? ""` "para no romper
  los tests viejos" → registra dos empresas de dos clientes, una sin el header → lista las del cliente A
  → el evento huérfano no aparece **y no dio error** → 🔧 cambia el fallback por excepción → descubre
  cuántos de sus propios llamados dependían del default sin saberlo.
- **🛠️ Qué construye.** La columna de contexto (**E4**) y el *fail-fast* en el borde (400 que **nombra**
  lo que falta).
- **🔍 Comprueba.** `SELECT ... WHERE cliente_id = '' OR NULL` — cada fila es un dato perdido que ninguna
  API mostrará. Test: petición sin header → 400 que nombra lo que falta, no 200.
- **🧠 Descubrimiento.** Si el dato entrante es dudoso, la duda viaja en el **tipo del resultado**, no en
  un log que nadie lee.
- **🎚️ Sentible: parcial.** *Caveat:* el default silencioso sí (columna + fallback cómodo + consulta SQL
  de la fila fantasma). La multi-tenancy de verdad (JWT, headers falsificables, scopes de DI que el
  framework abre solo) **no** — forzarla convierte el juguete en otra cosa; va como criterio apoyado en
  el hueco ya sentido.
- **🧩 Exige del dominio. E4** (la columna de contexto).
- **🔗 Relación.** Es un **borde**: vive después de que exista más de una vista/consulta por cliente.

## S10 · "Respondí OK y el hecho no existe" — el hecho, su commit y su anuncio: todo o nada
*(insumo #9 · valor alto · la mitad de tienda ya la tiene `todo-o-nada`)*

- **Propósito.** El hecho y su anuncio comparten destino o no comparten nada. Una sola transacción decide
  si ambos existen; cualquier otra cosa es un *dual-write* con una ventana de pérdida.
- **💥 Dolor.** Tres gemelos: (a) muta el agregado, olvida el `Append`, responde 200 sobre un hecho que
  no se escribió; (b) notifica primero y guarda después, el guardado falla y ya hay alguien afuera
  actuando; (c) re-appendea eventos de un `StartStream` y el historial sale **duplicado**.
- **🎬 Guión.** handler a mano, olvida el commit a propósito → 200 mentiroso → 🔧 mete el commit en un
  *middleware* (ya no se puede olvidar) → fuerza el duplicado del `StartStream`, cuenta filas → escenario
  duro: **mata el proceso entre el anuncio y el commit** con un efecto externo falso (un archivo, o un
  `List<string>` que sobreviva al rollback) → ve el mundo desincronizado.
- **🛠️ Qué construye.** Un `UnitOfWork` + *middleware* que commitea; y un efecto externo falso para ver
  el dual-write.
- **🔍 Comprueba.** Tras `StartStream`+commit, contar eventos: los emitidos, no el doble. Test que
  inyecta una excepción entre publicación y commit y exige que **nada** haya salido.
- **🧠 Descubrimiento.** Una sola transacción para el hecho y su anuncio; cualquier otra cosa tiene una
  ventana que un día se abre.
- **🎚️ Sentible: parcial.** *Caveat:* unit of work, el duplicado del `StartStream` y el orden
  publish/commit sí, con un proceso y Postgres. El outbox/inbox durable, el publish en cascada y la
  reentrega *at-least-once* **no** sin broker → efecto externo falso para ver el dual-write; el resto,
  criterio.
- **🧩 Exige del dominio. E5** (el efecto externo / segundo proyecto) para el escenario duro.
- **🔗 Relación.** Extiende `todo-o-nada` (que cubre la atomicidad **dentro del store**; esta añade el
  **anuncio** y el `MartenUnitOfWork` que la memoria ya ubica en el Bloque I / la plantilla).

## S11 · El comentario que sobrevive al mantenedor (y que vuelve a la librería)
*(insumo #1 · valor alto · **transversal**, usa **E6 tiempo**)*

- **Propósito.** El comentario que sirve no explica lo que el código hace: **nombra el problema que
  volverá si lo borras**. Y cuando la causa vive en la librería, el entregable es síntoma + test que
  reproduce + cambio mínimo, en manos de su dueño.
- **💥 Dolor.** Arregla un bug del taller con una línea no obvia, la deja sin comentario. Secciones
  después vuelve al archivo con "simplifica lo que sobre", la borra, los tests siguen **verdes**, y solo
  el bug regresa — con un síntoma que no apunta a la causa.
- **🎬 Guión.** (sembrado temprano) una línea rara y necesaria sin comentar → (cobrado tarde) el archivo
  vuelve con la instrucción de limpiar → 🔨 bórrala, corre los tests: verdes → el bug regresa →
  🆕 reescribe la línea con tres datos: síntoma exacto, causa, cuándo se puede quitar → redacta el
  *handoff* (test que reproduce + parche mínimo) para el dueño de la librería.
- **🛠️ Qué construye.** El comentario-que-nombra-el-síntoma + un `docs/handoff-*.md` con test que
  reproduce.
- **🔍 Comprueba.** Otra persona intenta borrar la línea comentada y se detiene. Y el test que reproduce
  el síntoma **falla en rojo** con la línea borrada — si sigue verde, solo hay prosa.
- **🧠 Descubrimiento.** El criterio que sobrevive al próximo mantenedor está pegado al código y nombra
  el síntoma; cuando la causa es de la librería, se devuelve como aporte, no se parcha en local.
- **🎚️ Sentible: sí**, con **tiempo** (E6). *Caveat:* el pin de versión con condición de salida necesita
  un upgrade real de Marten → criterio explicado apoyado en el pin real del repo.
- **🧩 Exige del dominio. E6** — sembrar la línea rara temprano (candidata natural: el `EventAppendMode`
  / el orden de dos instrucciones en el store, o el `partial` de una proyección) y cobrarla después.
- **🔗 Relación.** No es una sección "de tema"; es un **hilo** que cruza el arco y cierra el círculo del
  norte (usar → mantener → **aportar de vuelta** a `Cosmos.BuildingBlocks`).

---

# Parte B — Enriquecimientos a secciones que ya existen

Los insumos **confirman** varias secciones vividas y aportan un golpe extra. No son secciones nuevas:
son un `🔨 rómpelo` o un test que se injerta.

| Sección existente | Insumo | Qué se le injerta |
|---|---|---|
| `decidir-el-futuro` + `el-agregado-recuerda` | #4 | El `Apply` **puro**: validar dentro del `Apply` → historial ilegible; reloj/`Guid` en `Apply` → estado no determinista; **evento huérfano** (sin `Apply`) ignorado en silencio. Test: rehidratar dos veces y exigir estados idénticos. |
| `concurrencia-optimista` (§9) | #3 | El **test** de N escrituras paralelas (una gana); y el gotcha del default de Marten 9 (`EventAppendMode.Rich`) — este último encaja mejor tras el swap a Marten. El 409-vs-500 y el `ExpectedVersion`→422 esperan a que haya borde HTTP. |
| `todo-o-nada` | #9 | El duplicado del `StartStream` (contar filas) y el `UnitOfWork` — ver **S10**, que es su continuación natural. |
| `el-nombre-es-un-contrato` | #6 | La **forma** (no solo el nombre): campo polimórfico + campo obligatorio nuevo — ver **S5**, su continuación. |

---

# Parte C — Criterio declarado (no son secciones, y está bien)

Honestidad de método: esto **no se puede vivir** con el juguete. Fingirlo sería el error que ya costó
caro. Va como **criterio explicado** —una nota corta anclada al momento donde el alumno ya sintió el
hueco vecino— o fuera del arco, en material de operación.

- **Insumo #14 — segundo proceso / dueño del daemon / config divergente.** No hay reto honesto con un
  proceso. Lo único que sí viaja al taller es **el test de configuración** (construir el store real y
  validar su topología sin base de datos) — cuesta poco y no pide un segundo proceso. Ancla: el momento
  en que el alumno separe lectura de escritura.
- **Las mitades no-sentibles de #7, #9, #12, #13** — topología de despliegue, outbox/inbox durable,
  reentrega de broker real, multi-tenancy con JWT. Cada una va como criterio **pegada a la sección donde
  el alumno ya sintió la mitad sentible**, con cita del repo real.

---

# Parte D — Prerrequisitos y agrupación (esto **no** es el orden final)

El orden lineal lo hila la brújula. Aquí solo se fija **qué no puede ir antes de qué**. Los bloques son
por dependencia, no por secuencia obligada.

```
§1-9 (motor a mano, en pie)
   │
   ├─▶ [Confianza en el motor]     S1 testing · S2 el puerto (+E2)
   │        └ enriquece: Apply puro (#4), test de concurrencia (#3)
   │
   ├─▶ [El dominio crece]          S3 ¿merecía ES? (nace E1) · S4 clave duplicada
   │
   ├─▶ [El hecho se congela]       S5 la forma cambió / upcasting (+E5 parcial)
   │
   ├─▶ [La lectura madura]         S6 read model por consulta (decide E3)
   │                               S7 la vista se atrasa (+E2, updater async)  ← primer panel Critter Watch
   │                               S8 idempotencia / replay (+E2)
   │
   ├─▶ [Los bordes]                S9 default silencioso (+E4)
   │                               S10 dual-write / anuncio (+E5)
   │
   └─▶ [Transversal]              S11 el comentario que sobrevive (+E6, sembrado temprano)

   [Criterio declarado, sin sección propia]  #14 + mitades no-sentibles de #7/#9/#12/#13
```

**Aristas duras (dependencias reales):**
- **S2** necesita **E2** para su punchline; **E2** puede nacer como parte de S2 o justo antes.
- **S3** es donde **nace E1**; **S4** y **S6** se apoyan en E1.
- **S6** obliga a **decidir E3** (la tensión Plan-plano vs. segundo eje) — con el spike en la mano.
- **S7** y **S8** necesitan **E2** (una invariante/saldo que la vista sostenga).
- **S9** necesita **E4**; **S10** necesita **E5**.
- **S11** se **siembra** en las primeras secciones de código y se **cobra** tarde: cruza todo el arco.

**Lo que la brújula decide (no este plan):** el entrelazado fino —por ejemplo si "confianza en el motor"
va entero antes de "el dominio crece", o si S3 se adelanta para frenar el "todo es un stream" apenas
cerrado §9—, y dónde exactamente cae el swap a Marten respecto de estas (varias se pueden vivir **a
mano** y re-vivir tras el swap).

---

# Parte E — Trazabilidad

| Insumo | Sección | Tipo | Sentible | Exige del dominio |
|---|---|---|---|---|
| #2 verde y roto | S1 | nueva | sí | — |
| #11 el puerto | S2 | nueva | sí | E2 (punchline) |
| #10 ¿merecía ES? | S3 | nueva | sí | **nace E1** |
| #5 clave duplicada | S4 | nueva | sí (broker simulado) | E1 |
| #6 la forma congelada | S5 | nueva (extiende el-nombre) | sí | E5 (parcial) |
| #8 read model por consulta | S6 | nueva (extiende la-vista) | sí | **decide E3** |
| #7 la vista se atrasa | S7 | nueva | parcial | E2 + updater async |
| #12 idempotencia/replay | S8 | nueva | parcial | E2 |
| #13 default silencioso | S9 | nueva | parcial | E4 |
| #9 dual-write/anuncio | S10 | nueva (extiende todo-o-nada) | parcial | E5 |
| #1 el comentario | S11 | transversal | sí (con tiempo) | E6 |
| #4 rehidratar no decide | — | enriquece decidir-el-futuro | sí | — |
| #3 dos escritores | — | enriquece concurrencia-optimista | sí | — |
| #14 segundo proceso | — | criterio declarado (+test de config) | no | — |

**Conteo:** 11 secciones nuevas (7 de dolor sentible entero, 4 de sentible parcial con sustituto
honesto) · 3 enriquecimientos a secciones vivas · 1 criterio declarado · 6 crecimientos de dominio
(E1–E6), dos de ellos (E1, E2) que **son** lección.

---

## Cómo se usa este plan

1. La **brújula** ([`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md)) elige la **próxima** sección
   respetando las aristas duras de la Parte D.
2. Se **vive** esa sola sección (spike que corre y choca) y se redacta.
3. Se cierra con `revisar-seccion` (validador + 3 lentes + spike verde).
4. Se **para**. Se vuelve al paso 1.

> Este plan es un mapa de obra, no un contrato de contenido: cada sección puede mover su dolor, su
> dominio o su lugar cuando el spike revele algo que la lectura no anticipó. El código manda sobre el
> plan, igual que el código manda sobre la doc de los repos.
