# 🧑‍🏫 Guion del facilitador — Taller de Event Sourcing (presencial)

Este es el **guion para dictar el taller en vivo**. Tú das los **conceptos**; aquí tienes, sección por sección y en orden:

- **🧑‍🏫 Presentas:** los nombres/ideas clave a explicar **antes** del reto (solo el recordatorio — la explicación la das tú).
- **🛠️ Pides que hagan:** el reto de la sección para ir guiando a los asistentes (los micro-pasos están dentro de cada sección).
- **✅ Deben ver:** el resultado o el "ajá" que confirma que el paso quedó.

> Las **soluciones de código completas** están en el `<details>` de cada sección (*"👉 Una forma de hacerlo"*). Tú guías; si alguien se traba, abren el `<details>`.
>
> **Bitácora (📓):** cada sección cierra con un `commit` + `push`; el mensaje del commit es la **reflexión del asistente con sus palabras** (la pregunta está en el bloque "📓 Registra tu avance"). Y en las decisiones de criterio, una línea en `DECISIONES.md`.

> 📸 **Cadena completa: las 39 secciones (1 → 39).** Todos los enlaces resuelven a `secciones/`. El arco va del `UPDATE` que borra el pasado (§1) a un servicio Marten + Wolverine multi-tenant, observado, con outbox durable y concurrencia optimista (§39) — construyendo cada pieza a mano antes de reconocer la herramienta. El observador **CosmosLens** (repo `cosmos-trace`) acompaña desde §19 y se cierra en §36.

**Prerequisitos del asistente:** .NET 10 SDK (C# 14) · Docker Desktop (para PostgreSQL) · Git + cuenta de GitHub · saber C# básico.

**Proyecto:** una sola solución de C# que va creciendo — el dominio es la `Empresa` (cliente de la plataforma). Al principio todo se acumula en un `Program.cs`; con el tiempo aparecen los proyectos de tests, los contratos y el host.

---


## 1 · El diario de una empresa  ·  📄 [el-diario-de-una-empresa.md](secciones/el-diario-de-una-empresa.md)
🎯 *Imagina que quieres conocer de verdad a una empresa cliente —"Constructora Andes"— y tienes dos opciones:*
**✅ Deben ver:** ¿Qué información, exactamente, destruye un `UPDATE` que el diario conservaría?

## 2 · Los primeros hechos  ·  📄 [los-primeros-hechos.md](secciones/los-primeros-hechos.md)
🎯 *Quieres saber el plan actual de "Constructora Andes" y cuántas veces la han reactivado. La tentación es guardar `Plan = "Premium"` y `Reactivaciones = 2` en variables. Pero eso es la foto: si la sobrescribes, vuelves a perder el pasado.*
**🧑‍🏫 Presentas:** `Idioma de C#: `is Tipo x` (comprueba el tipo y captura)` · `Idioma de C#: `{ get; private set; }``
**🛠️ Pides que hagan:** Recorre `historia` reconstruyendo el estado hasta imprimir esta línea: `Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces`. Para eso declara cuatro variables (`nombre`, `plan`, `suspendida`, `reactivaciones`), recórrela…
**✅ Deben ver:** `dotnet run` imprime el estado reconstruido (`plan Premium`, `reactivada 1 vez/veces`).

## 3 · Refactorizando el motor  ·  📄 [refactorizando-el-motor.md](secciones/refactorizando-el-motor.md)
🎯 *Que el "motor" que lee la historia y reconstruye el estado sea limpio (no un `if` interminable) y reutilizable (que sirva para la `Empresa` hoy y para una `Factura` mañana, sin copiar y pegar).*
**🧑‍🏫 Presentas:** `Idioma de C#: herencia con `abstract` / `protected` / `override`` · `Idioma de C#: cuerpo de expresión (`=>`)` · `Idioma de C#: pattern matching de tipo (`case Tipo x:`)`
**🛠️ Pides que hagan:** En tu `Empresa`, saca la lógica de los cuatro `if` a un método aparte —llámalo `Aplicar(object hecho)`— y deja el constructor con solo el `foreach` llamando a `Aplicar`. Corre `dotnet run`: debe imprimir lo mismo. Cuando lo tengas (o si te…
**✅ Deben ver:** `dotnet run` imprime lo mismo que en la sección anterior (`plan Premium`, `reactivada 1 vez/veces`): refactorizaste sin cambiar el comportamiento.

## 4 · El flujo de vida (EventStream)  ·  📄 [el-flujo-de-vida.md](secciones/el-flujo-de-vida.md)
🎯 *Dejar de manosear listas crudas. Queremos un envoltorio que encapsule la historia de una empresa —que sea su dueño— y exponga las dos operaciones del diario: leerlo (rehidratar la empresa) y anotar un hecho nuevo. Que el consumidor solo…*
**🧑‍🏫 Presentas / 💬 discute:** El día que tengas una `Factura` event-sourced, copiarías `EventStreamDeEmpresa` entero cambiando `Empresa` por `Factura`. La mecánica —ser dueño de la lista, anotar hechos, crear el agregado vacío y…
**🛠️ Pides que hagan:** Crea una clase `EventStreamDeEmpresa` con su propia `List<object>` escondida (nace vacía). Dale dos métodos: `Append(object hecho)` que anote un hecho nuevo en esa lista, y `Get()` que cree una `Empresa` vacía y la rehidrate llamando a…
**✅ Deben ver:** `dotnet run` imprime `Constructora Andes: plan Premium`, con los hechos anotados por `Append` y la empresa obtenida vía `.Get()` (sin `new Empresa(historia)`…

## 5 · Decidir el futuro (emitir eventos)  ·  📄 [decidir-el-futuro.md](secciones/decidir-el-futuro.md)
🎯 *Que la `Empresa` emita sus propios hechos —protegiendo sus reglas— en vez de que se los insertemos por la fuerza con `Append`.*
**🧑‍🏫 Presentas:** `Idioma de C#: el tipo anulable `T?`` · `Idioma de C#: el constructor primario`
**🛠️ Pides que hagan:** La meta es que pedirle una decisión a la empresa devuelva el hecho, sin tocar su estado: `PlanCambiado h = empresa.CambiarPlan("Enterprise");`. Añade a tu `Empresa` tres métodos así: `CambiarPlan(string nuevoPlan)` → un `PlanCambiado`;…
**✅ Deben ver:** `dotnet run` muestra el plan cambiado tras `CambiarPlan` + `Append` + recargar (sobre un solo `EventStream`).

## 6 · El Command Handler  ·  📄 [el-command-handler.md](secciones/el-command-handler.md)
🎯 *Encapsular ese "cargar → actuar → guardar" en una pieza con un solo trabajo, para que el resto del programa solo diga *"ejecuta esta intención"* y no sepa de streams.*
**🧑‍🏫 Presentas:** `Idioma de C#: el constructor primario`
**🛠️ Pides que hagan:** Crea `EmpresaCommandHandlers` que reciba el `EventStream<Empresa>` por constructor. Dale un método por operación, con sus parámetros sueltos —`CambiarPlan(string nuevoPlan)` y `Suspender(string motivo)`—: cada uno carga (`Get`), pide a la…
**✅ Deben ver:** Moviste el ciclo "cargar → actuar → guardar" del `Program.cs` a una clase handler por comando (`CambiarPlanHandler`, `SuspenderHandler`), cada una con su…

## 7 · El despachador: dado un comando, encuentra su handler  ·  📄 [el-despachador.md](secciones/el-despachador.md)
🎯 *Construir un solo punto que reciba un comando cualquiera y encuentre y ejecute su handler por el tipo del comando —sin un `switch`, sin nombrar clases—. Y descubrir, en el camino, las dos piezas que ese punto exige.*
**🧑‍🏫 Presentas / 💬 discute:** Piensa en lo que viene: el comando llega de afuera (el cuerpo de una petición HTTP, un mensaje de una cola) y alguien tiene que mandarlo a su handler. Hoy ese alguien eres tú, con un `switch` que…
**🛠️ Pides que hagan:** (1) Crea un `record` por comando: `CambiarPlanDeEmpresa(string NuevoPlan)` y `SuspenderEmpresa(string Motivo)`. (2) 🔁 Cambia cada handler para que su `Handle` reciba su comando (en vez del `string`) y lea los datos de ahí (`cmd.NuevoPlan`,…
**✅ Deben ver:** Cada comando es un `record` propio, y los handlers reciben su comando (`Handle(CambiarPlanDeEmpresa)`), no un `string`.

## 8 · El almacén: un cajón por empresa  ·  📄 [el-almacen-por-id.md](secciones/el-almacen-por-id.md)
🎯 *Un único almacén que custodie la historia de cualquier empresa por su id; y que el handler reciba ese almacén (no un stream fijo) y abra la empresa que el comando indique. Handlers registrados una vez, sirviendo a todas las empresas.*
**🧑‍🏫 Presentas:** `Idioma de C# que verás en la solución`
**🛠️ Pides que hagan:** Crea la clase `EventStore` con un `Dictionary<string, List<object>>` (la llave = el id). Dale dos métodos donde el id es un parámetro: `GetEvents(string aggregateId)` que devuelve la lista de ese cajón (o una vacía si no existe), y…
**✅ Deben ver:** `dotnet run` escribe y lee dos empresas distintas (`emp-7`, `emp-9`) siempre a través del stream, nunca tocando el `store` directo.

## 9 · Cuando dos escriben a la vez (concurrencia optimista)  ·  📄 [concurrencia-optimista.md](secciones/concurrencia-optimista.md)
🎯 *Que dos escrituras simultáneas sobre la misma empresa no se pisen sin que nadie se entere: detectar el choque y rechazarlo.*
**🧑‍🏫 Presentas:** `Idioma de C#: `.Select(...)``
**🛠️ Pides que hagan:** (1) 🔁 El `EventStore` ahora guarda `List<EventoAlmacenado>` (sobres). En `AppendEvent(id, EventoAlmacenado sobre)`, antes de aceptar, comprueba: si esa posición ya está tomada (`sobre.Version <= cajon.Count`), crea y lanza una…
**✅ Deben ver:** Con una empresa y un escritor, `Append` sigue funcionando: los hechos entran en versiones 1, 2, 3…

## 10 · Un acto de negocio, dos hechos  ·  📄 [un-acto-dos-hechos.md](secciones/un-acto-dos-hechos.md)
🎯 *Montar una acción de negocio que produce dos hechos y ver, corriéndola, por qué el modelo en que `decide` devuelve el hecho no la puede expresar. Aquí llegamos hasta el muro; arreglarlo es lo que sigue.*
**🧑‍🏫 Presentas / 💬 discute:** Una empresa morosa está suspendida por falta de pago. Cuando paga su deuda, el negocio pide dos cosas en el mismo acto: registrar el pago y reactivarla. Con una regla: no puedes reactivar una empresa…
**🛠️ Pides que hagan:** > 1. Un hecho nuevo `PagoRegistrado(int Monto)` (`int` por simplicidad; el tipo del monto no es el tema de hoy).
**✅ Deben ver:** Montaste `PagoRegistrado`, `DeudaPendiente`, `RegistrarPago` y la regla en `Reactivar`.

## 11 · El agregado recuerda lo que decide  ·  📄 [el-agregado-recuerda.md](secciones/el-agregado-recuerda.md)
🎯 *Que una acción pueda producir varios hechos —donde el segundo ve lo que hizo el primero— y que se guarden con una sola llamada.*
**🧑‍🏫 Presentas:** `IReadOnlyList<T>`
**🛠️ Pides que hagan:** Es un cambio de modelo: primero la maquinaria en `AggregateRoot` (que compila sola), y luego el volteo de la `Empresa`, el `EventStream` y los handlers, que van juntos.
**✅ Deben ver:** El `PagarDeudaHandler` corre sin excepción; al recargar, la empresa queda `Suspendida=False`, `DeudaPendiente=False`.

## 12 · Verde, y roto  ·  📄 [verde-y-roto.md](secciones/verde-y-roto.md)
🎯 *Escribir tu primer test automatizado del agregado —que lo compruebe sin que tengas que mirar la consola— y salir sabiendo distinguir un test que de verdad te protege de uno que solo pasa aunque el motor esté roto.*
**🧑‍🏫 Presentas:** `xUnit — el arnés de pruebas de .NET`
**🛠️ Pides que hagan:** Escribe un segundo test con la misma preparación (`Load` de una empresa registrada), que la suspenda igual, y que al final afirme que entre sus hechos sin confirmar hay un `EmpresaSuspendida`. Tienes `empresa.SinConfirmar` (la lista que…
**✅ Deben ver:** `dotnet test` corre los dos tests y los ves reportados, sin mirar ninguna consola del programa.

## 13 · El diario en disco (y lo que se queda afuera)  ·  📄 [el-diario-en-disco.md](secciones/el-diario-en-disco.md)
🎯 *Que la historia de cada empresa sobreviva a apagar y volver a prender: que al arrancar de nuevo, rehidratar dé el mismo estado que dejaste antes de cerrar.*
**🧑‍🏫 Presentas:** `Idioma de C#: leer y escribir un archivo de texto` · `Idioma de C#: `System.Text.Json`` · `Deserializar hacia `object` te da un `JsonElement`` · `El nombre del tipo, y volver del `JsonElement` a la clase`
**🛠️ Pides que hagan:** Cambia solo las tripas de `EventStore` (deja igual `EventStream`, los handlers y la `Empresa`). Como ahora escribe a un archivo, el almacén necesita saber en qué carpeta: recíbela por constructor y crea la carpeta ahí mismo — eso obliga a…
**✅ Deben ver:** Corres el arnés "sembrar si está vacío", y vuelves a correr sin borrar `datos`: la segunda vez rehidrata al estado que dejaste (no a vacío), sin volver a…

## 14 · El nombre del hecho es un contrato  ·  📄 [el-nombre-es-un-contrato.md](secciones/el-nombre-es-un-contrato.md)
🎯 *Que renombrar una clase de evento no deje ilegible la historia que ya guardaste.*
**🧑‍🏫 Presentas:** `Idioma de C#: recorrer un diccionario`
**🛠️ Pides que hagan:** (1) Cámbiale las llaves al mapa `_tipos` (queda `_porNombre`): la llave ya no es `GetType().Name`, sino un nombre estable que tú eliges (`"plan-cambiado"` → `typeof(PlanCambiado)`). La clase no se renombra; solo cambia lo que usas como…
**✅ Deben ver:** Reproduces el muro con el experimento del 🔨: una línea con el nombre viejo + un mapa con el nombre nuevo lanza `KeyNotFoundException` — sin que hayas olvidado…

## 15 · Todo o nada: el diario en una base de datos real  ·  📄 [todo-o-nada.md](secciones/todo-o-nada.md)
🎯 *Que una acción de varios hechos sea todo o nada: si algo revienta a la mitad, no queda media acción grabada en el diario.*
**🧑‍🏫 Presentas:** `Idioma de C#: Npgsql y la transacción`
**🛠️ Pides que hagan:** El `EventStream` cambia solo en `Append` (el `Get()` queda igual); el `EventStore` se reescribe por dentro; la `Empresa`, los handlers y el sobre `EventoAlmacenado` no se tocan (el sobre ahora es la fila). (1) En el constructor del store,…
**✅ Deben ver:** `docker exec empresas-db pg_isready -U postgres` responde *accepting connections*.

## 16 · La pregunta que el diario no sabe responder  ·  📄 [la-vista-de-lectura.md](secciones/la-vista-de-lectura.md)
🎯 *Responder "¿cuáles empresas están suspendidas ahora?" sin rejugar el diario entero en cada consulta.*
**🧑‍🏫 Presentas:** `SQL: `INSERT ... ON CONFLICT ... DO UPDATE` (upsert)`
**🛠️ Pides que hagan:** (1) Crea la tabla `empresas_estado(id TEXT PRIMARY KEY, suspendida BOOL NOT NULL)`. (2) Escribe una proyección `Suspendidas` con dos métodos: `Actualizar(id, empresa)` que hace el upsert del estado actual de esa empresa, y `Listar()` que…
**✅ Deben ver:** El `SELECT` ingenuo sobre `eventos` incluye una empresa que ya se reactivó; explica por qué (los hechos dicen lo que pasó, no el estado actual).

## 17 · Rejugar el diario: reconstruir la vista  ·  📄 [reconstruir-la-vista.md](secciones/reconstruir-la-vista.md)
🎯 *Poder rellenar la vista con lo que ya pasó —cuando le cambies la forma o se desincronice— sin volver a ejecutar nada del pasado.*
**🧑‍🏫 Presentas:** `SQL: vaciar una tabla y añadirle una columna`
**🛠️ Pides que hagan:** (1) Añade la columna `plan` a `empresas_estado` con el `ALTER TABLE`, y que `Actualizar` la escriba también (el agregado ya tiene `Plan`). (2) La proyección recibe ahora el `EventStore` por constructor —lo necesita para leer el diario—;…
**✅ Deben ver:** Tras el `ALTER TABLE`, consultas las suspendidas y su `plan` sale en blanco; explicas por qué (la vista se actualiza cuando algo pasa, y a esas empresas no les…

## 18 · La vista se mantiene sola  ·  📄 [la-vista-se-mantiene-sola.md](secciones/la-vista-se-mantiene-sola.md)
🎯 *Poner la vista al día derivándola del diario —con un proceso que recuerda hasta dónde leyó— de modo que el handler ya no tenga que tocarla. (Correrlo solo, en bucle, viene después; aquí lo corres tú.)*
**🧑‍🏫 Presentas:** `BIGSERIAL`: un contador que Postgres lleva por ti · `Checkpoint: un marcador de posición guardado`
**🛠️ Pides que hagan:** Añade a `eventos` una columna `seq BIGSERIAL`, para que cada hecho reciba un número global creciente al insertarse. La llave `(stream, version)` se queda (sigue protegiendo el orden por empresa y la concurrencia); `seq` es además, para…
**✅ Deben ver:** Tras sembrar los 4 hechos (que solo hacen `Append`) y antes de correr el proyector, la vista está vacía: los handlers ya no la tocan.

## 19 · El rezago: ¿cuánto atrás va la vista?  ·  📄 [el-rezago.md](secciones/el-rezago.md)
🎯 *Medir cuánto atrás va la vista respecto del diario —tu primer instrumento para ver el sistema respirar— y entender por qué, con ese rezago, no puedes decidir leyendo la vista.*
**🧑‍🏫 Presentas / 💬 discute:** Un comando suspende una empresa (que registras activa para la prueba), y consultas la vista de inmediato, sin correr el proyector:
**🛠️ Pides que hagan:** Escribe un `Rezago()` que devuelva cuántos hechos le faltan a la vista, y pruébalo: haz `Append` de unos hechos sin correr el proyector y míralo subir; corre el proyector y míralo caer a `0`. >
**✅ Deben ver:** `Rezago()` da la distancia en hechos: sube al appendear, baja a `0` al proyectar.

## 20 · El proyector tropieza  ·  📄 [el-proyector-tropieza.md](secciones/el-proyector-tropieza.md)
🎯 *Que un hecho que el proyector no sabe aplicar no congele toda la vista: apartarlo, dejar rastro, y seguir — con una lista de los apartados que le diga a tu monitor qué se atascó y dónde.*
**🧑‍🏫 Presentas:** `Tabla de apartados (el "dead-letter" del proyector)`
**🛠️ Pides que hagan:** Crea la tabla `proyeccion_fallos(seq BIGINT PRIMARY KEY, stream TEXT, error TEXT, cuando TIMESTAMPTZ DEFAULT now())`. Endurece tu `CorrerProyector()`: por cada hecho, rodea el `store.AbrirStream<Empresa>(stream).Get()` +…
**✅ Deben ver:** Inyecta el hecho de tipo desconocido con el `INSERT` de arriba, en medio de dos empresas sanas. El proyector ingenuo (sin `try/catch`) truena: el checkpoint se…

## 21 · ¿Merecía event sourcing?  ·  📄 [merecia-event-sourcing.md](secciones/merecia-event-sourcing.md)
🎯 *El criterio para decidir cuándo no usar event sourcing — y crear el catálogo de planes como lo que de verdad es: una tabla plana.*
**🧑‍🏫 Presentas / 💬 discute:** El negocio necesita un catálogo de planes: los planes a los que una empresa puede suscribirse, con su precio (Básico, Premium, Enterprise). Con lo que sabes, el reflejo es event-sourcearlo. Empiezas…
**🛠️ Pides que hagan:** En `psql`, sobre la misma base donde vive tu diario, crea el catálogo como una tabla plana `planes(codigo TEXT PRIMARY KEY, nombre TEXT, precio INT)`. Insértale Básico, Premium y Enterprise; sube el precio de Premium con un `UPDATE`; y…
**✅ Deben ver:** El catálogo `planes` responde "qué planes hay y a qué precio" con un solo `SELECT`, y cambiar un precio es un `UPDATE` — sin eventos ni proyección.

## 22 · El puerto propio  ·  📄 [el-puerto-propio.md](secciones/el-puerto-propio.md)
🎯 *Extraer un puerto —la interfaz mínima que tu dominio usa del almacén— con dos implementaciones: la de Postgres para producción y una en memoria para probar rápido. Y ver, de paso, qué te cobra la abstracción.*
**🧑‍🏫 Presentas:** `Un puerto es una interfaz que el dominio posee` · `Un método de extensión`
**🛠️ Pides que hagan:** Declara `IEventStore` con los dos métodos que tu almacén usa por dentro: `List<EventoAlmacenado> GetEvents(string id)` y `void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)`. Haz que tu almacén de Postgres la implemente —solo…
**✅ Deben ver:** `IEventStore` tiene los dos métodos, `AbrirStream<T>` es una extensión sobre la interfaz, y `PostgresEventStore` + `InMemoryEventStore` la implementan;…

## 23 · Dos streams, la misma clave  ·  📄 [dos-streams-misma-clave.md](secciones/dos-streams-misma-clave.md)
🎯 *Garantizar que no existan dos empresas con el mismo NIT, aun con dos registros simultáneos — una invariante que vive entre streams, no dentro de uno.*
**🧑‍🏫 Presentas:** `El localizador (clave de negocio → stream)`
**✅ Deben ver:** Sin el localizador: dos registros del mismo NIT (ids distintos) dejan dos streams — la concurrencia optimista no lo impide.

## 24 · La forma del hecho se congela  ·  📄 [la-forma-del-hecho-se-congela.md](secciones/la-forma-del-hecho-se-congela.md)
🎯 *Leer sin romperse un hecho viejo cuya forma ya no coincide con la de hoy — y ver por qué la solución nunca es un `UPDATE` a los hechos ya escritos.*
**🧑‍🏫 Presentas:** `Cómo construye un `record` System.Text.Json` · `Un *upcaster*: viejo JSON → evento actual` · `Mirar un JSON sin fijar su forma`
**🛠️ Pides que hagan:** En `PostgresEventStore.GetEvents`, ramifica por `tipo`: si es `"empresa-registrada"`, en vez del `JsonSerializer.Deserialize(...)` genérico llama a un `Upcast(json)`; los demás tipos siguen igual. El `Upcast` inspecciona el JSON con…
**✅ Deben ver:** Deserializar directo el JSON viejo (sin `Nit`) deja `Nit = null` y no lanza — y sabes por qué (STJ construye el `record` por su constructor y pone el default a…

## 25 · La vista por consulta  ·  📄 [la-vista-por-consulta.md](secciones/la-vista-por-consulta.md)
🎯 *Responder "¿cuánto ha pagado cada empresa?" — una pregunta que ni tu vista de estado ni el agregado saben responder — con un read model diseñado por esa consulta.*
**🧑‍🏫 Presentas:** `Varios read models sobre el mismo diario, cada uno con su checkpoint`
**🛠️ Pides que hagan:** Haz que este reporte funcione: >
**✅ Deben ver:** `CorrerProyectorPagos()` la primera vez inserta tantas filas como hechos `pago-registrado` hay; corrido de nuevo, aplica 0 (checkpoint al día).

## 26 · El hecho y su anuncio  ·  📄 [el-hecho-y-su-anuncio.md](secciones/el-hecho-y-su-anuncio.md)
🎯 *Que tu anuncio al mundo de afuera nunca mienta: si el hecho no ocurrió, nada se anuncia; si ocurrió, el anuncio llega — aunque tarde.*
**🧑‍🏫 Presentas:** `La bandeja de salida (*outbox*)`
**🛠️ Pides que hagan:** Recuerda que desde [El puerto propio](secciones/el-puerto-propio.md) `Guardar` vive en `IEventStore` con dos implementaciones. Añade el parámetro `anuncios` a `Guardar` en la interfaz; el `PostgresEventStore` inserta cada anuncio en…
**✅ Deben ver:** Versión ingenua + caída antes del `Commit`: `MundoExterno` tiene el anuncio y la suspensión no está en el diario — el fantasma.

## 27 · El evento público  ·  📄 [el-evento-publico.md](secciones/el-evento-publico.md)
🎯 *Anunciar un hecho al mundo de afuera con un contrato propio —plano y estable— que no ate a ese mundo a la forma privada de tu dominio, ni a tus identificadores internos.*
**🧑‍🏫 Presentas:** `El evento público es un contrato versionado, en un proyecto que no ve tu dominio`
**✅ Deben ver:** El proyecto `Contratos` no referencia tu dominio; `Dominio` referencia `Contratos` (para traducir); `Facturacion` referencia solo `Contratos`.

## 28 · El mensaje y la cola  ·  📄 [el-mensaje-y-la-cola.md](secciones/el-mensaje-y-la-cola.md)
🎯 *Ver qué garantías da una cola —un transporte entre procesos— que una llamada a un método no da. Y por qué armar esas garantías a mano termina siendo reescribir un sistema de mensajería completo.*
**🧑‍🏫 Presentas:** `Una cola es un transporte con garantías, no una tabla que sondeas`
**🛠️ Pides que hagan:** Reescribe la entrega de tu `EntregarPendientes` (en `PostgresEventStore`) para que reclame de a una: en vez de leer todo, toma una fila con `FOR UPDATE SKIP LOCKED LIMIT 1`, la procesa y la marca, todo en una transacción. Arranca dos de…
**✅ Deben ver:** Con dos consumidores sin claim, el mismo mensaje se entrega dos veces (ambos lo leen antes de marcar).

## 29 · El swap por reconocimiento  ·  📄 [el-swap-por-reconocimiento.md](secciones/el-swap-por-reconocimiento.md)
🎯 *Reemplazar tu diario a mano —la tabla `eventos`, `GetEvents`/`Guardar`, la concurrencia, la rehidratación— por Marten, sobre la misma Postgres, reconociendo pieza por pieza qué de lo que construiste ya hacía la librería.*
**🧑‍🏫 Presentas:** `Marten: tu diario, hecho librería`
**🛠️ Pides que hagan:** Tu `Empresa` casi no cambia. En [Refactorizando el motor](secciones/refactorizando-el-motor.md) dejaste una semilla: *"un `Aplicar` por tipo… la volverás a encontrar, con un enrutador seguro en vez de `dynamic`"*. Esta es la cosecha: en vez de tu…
**✅ Deben ver:** Marten guarda (`StartStream`/`Append`) y rehidrata (`AggregateStreamAsync`) tu `Empresa` con `Apply` por tipo y setters privados — sin tu tabla `eventos` ni tu…

## 30 · El outbox  ·  📄 [el-outbox.md](secciones/el-outbox.md)
🎯 *Pagar la deuda del dual-write de [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md): que el hecho y su anuncio entren en la misma transacción, con entrega durable y reintento. Lo da el outbox de Wolverine, sin tu bucle de `SELECT ... SKIP…*
**🧑‍🏫 Presentas:** `Wolverine es tu despachador *y* tu outbox`
**🛠️ Pides que hagan:** Logra que esto funcione: >
**✅ Deben ver:** Un handler `static` que appendea un hecho y devuelve el evento público entrega ambos atómicamente: el hecho al diario y el mensaje al consumidor…

## 31 · Llegó dos veces  ·  📄 [llego-dos-veces.md](secciones/llego-dos-veces.md)
🎯 *Que el consumidor no haga daño cuando el mismo mensaje le llega dos veces — porque con un transporte real, eso pasa tarde o temprano.*
**🧑‍🏫 Presentas:** `Idempotente = repetirlo no cambia el resultado` · `El id del mensaje: el `Envelope` de Wolverine`
**🛠️ Pides que hagan:** Clasifica el efecto: cobrar una multa acumula, así que dedup. Una tabla `procesados(mensaje_id PRIMARY KEY)`. En el consumidor, recibe el `Envelope`, y `INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT DO NOTHING` con…
**✅ Deben ver:** El consumidor ingenuo, ante el mismo mensaje entregado dos veces (mismo `envelope.Id`), cobra doble.

## 32 · El daemon y la consistencia eventual  ·  📄 [el-daemon-y-la-consistencia-eventual.md](secciones/el-daemon-y-la-consistencia-eventual.md)
🎯 *Mueve tu vista al daemon de Marten: el proyector async, hecho librería. Declara la consistencia eventual y mide el rezago que en [El rezago](secciones/el-rezago.md) mediste a mano.*
**🧑‍🏫 Presentas:** `La proyección y su `Apply(evento, vista)`` · `Async vs Inline: la consistencia es una elección` · `Medir el rezago con Marten`
**🛠️ Pides que hagan:** Haz que esto pase: appendeas una suspensión y, al instante, la vista va atrás (rezago > 0); esperas, el daemon alcanza (rezago 0), y la empresa aparece al consultar `VistaSuspendida`. Para eso: (1) un read model `VistaSuspendida { Id,…
**✅ Deben ver:** La vista es un read model aparte (`VistaSuspendida`, POCO, setters públicos), no tu agregado `Empresa` (setters privados) — y viste la vista salir en blanco al…

## 33 · El host y la inyección  ·  📄 [el-host-y-la-inyeccion.md](secciones/el-host-y-la-inyeccion.md)
🎯 *Montar el host de servicio —una API web (ASP.NET Core)— que recibe comandos por HTTP y arma y entrega las piezas por inyección de dependencias, cerrando el "infierno de los `new`" que sembraste en [El despachador](secciones/el-despachador.md).*
**🧑‍🏫 Presentas:** `ASP.NET Core minimal API + inyección de dependencias` · `Una `IDocumentSession` es una unidad de trabajo, y por eso va *scoped*`
**🛠️ Pides que hagan:** Quiero llamar el endpoint y que el hecho quede en el diario, sin escribir un solo `new`: >
**✅ Deben ver:** Un `POST` al endpoint despacha el comando por `IMessageBus` (inyectado) y el hecho queda en el diario — sin que construyas el handler con `new` ni lo registres…

## 34 · En vivo y serverless  ·  📄 [en-vivo-y-serverless.md](secciones/en-vivo-y-serverless.md)
🎯 *Ver dos variantes de entrega más allá del pedir-y-responder: una UI que se entera sola cuando algo cambia (SSE); y serverless, donde no hay un host de larga vida y el daemon y el outbox no aplican igual.*
**🧑‍🏫 Presentas:** `SSE (Server-Sent Events): el servidor empuja por una conexión abierta` · `La fuente del stream es un `Channel``
**🛠️ Pides que hagan:** (1) Declara un `Channel<string> _canal` compartido. (2) El productor: donde una empresa se suspende (tu handler de `EmpresaSuspendidaV1`, o la proyección), `_canal.Writer.TryWrite(id)`. (3) El consumidor: un `GET /suspensiones/en-vivo` que…
**✅ Deben ver:** El endpoint SSE responde `content-type: text/event-stream`; abierto con `curl -N`, empuja un evento cada vez que el productor escribe al `_canal`, sin que el…

## 35 · El contexto que falta  ·  📄 [el-contexto-que-falta.md](secciones/el-contexto-que-falta.md)
🎯 *Que el tenant —la organización dueña de la petición— viaje con cada operación, y que el sistema falle fuerte si falta, en vez de rellenarlo con un valor por defecto.*
**🧑‍🏫 Presentas:** `Tenancy conjoined + fail-fast`
**🛠️ Pides que hagan:** (1) Configura `TenancyStyle.Conjoined` (de `JasperFx.MultiTenancy`) y `DefaultTenantUsageEnabled = false`. (2) Escribe `emp-1` en el tenant `acme` y confirma que una sesión de `globex` no la ve (rehidratar → null). (3) Intenta abrir una…
**✅ Deben ver:** Distingues tenant (la organización que usa la plataforma) de `Empresa` (un stream dentro del tenant).

## 36 · Observar el motor nuevo  ·  📄 [observar-el-motor-nuevo.md](secciones/observar-el-motor-nuevo.md)
🎯 *Observar el motor —qué streams crecen, cuánto rezago tiene el daemon ahora, cómo fluyen los hechos, qué falló— leyendo su esquema en solo lectura, sin instrumentar la app. Y reconocer que esas mismas consultas son las que el monitor del…*
**🧑‍🏫 Presentas:** `Observabilidad agentless: leer el esquema de la librería, read-only`
**🛠️ Pides que hagan:** Con tu servicio corriendo (varios streams, alguno más largo), abre una sesión SQL de solo lectura contra su Postgres y responde cuatro preguntas: (1) ¿qué streams crecen? `mt_streams` por `version`. (2) ¿cuánto rezago? el `last_seq_id` de…
**✅ Deben ver:** Respondes "¿qué stream crece más?" con un `SELECT` de solo lectura sobre `mt_streams` (por `version`), sin tocar tu app.

## 37 · El comentario que sobrevive  ·  📄 [el-comentario-que-sobrevive.md](secciones/el-comentario-que-sobrevive.md)
🎯 *Proteger una línea que carga peso —si la quitas, algo se cae, pero nada falla al compilar ni en los tests— con un comentario que dice qué se rompe sin ella; y devolver ese aprendizaje a la librería.*
**🧑‍🏫 Presentas / 💬 discute:** En [El outbox](secciones/el-outbox.md) pusiste esta línea en la config de Wolverine, y hasta la comentaste:
**🛠️ Pides que hagan:** Reemplaza tu comentario de mecánica por uno de síntoma: no "entrega durable", sino qué pasa sin la línea (qué se pierde) y cómo se nota (que no hay error). Que el próximo que limpie lea el riesgo antes de tocarla.
**✅ Deben ver:** Identificas al menos dos líneas cuya ausencia falla en silencio (no rompe compilación ni tests), y sabes el síntoma de cada una.

## 38 · La plantilla  ·  📄 [la-plantilla.md](secciones/la-plantilla.md)
🎯 *Recoger lo construido en una plantilla —`AggregateRoot` + unidad de trabajo sobre Marten + un doble de test— de modo que un agregado nuevo no repita la plomería, y operarla con la `Empresa`.*
**🧑‍🏫 Presentas:** `La plantilla: `AggregateRoot` + `MartenUnitOfWork` + el doble`
**🛠️ Pides que hagan:** (1) Escribe `AggregateRoot` base (con `SinConfirmar`, `Emitir`, `MarcarConfirmados`, y una propiedad `Id`). (2) Haz que `Empresa` lo herede: sus verbos (`Registrar`, `Suspender`) aplican el hecho a sí mismos (`Apply(h)`) y lo emiten…
**✅ Deben ver:** `AggregateRoot` base tiene `SinConfirmar`, `Emitir`, `MarcarConfirmados`, `Id`; `Empresa` lo hereda y solo aporta sus `Apply` y sus verbos.

## 39 · El capstone: FetchForWriting  ·  📄 [el-capstone-fetchforwriting.md](secciones/el-capstone-fetchforwriting.md)
🎯 *Cerrar la deuda de concurrencia: meter la versión esperada en el camino de escritura de la plantilla con `FetchForWriting`, con un test de conflicto — y dejar ese criterio escrito para la librería real.*
**🧑‍🏫 Presentas:** `FetchForWriting`: cargar para escribir, con la versión esperada
**🛠️ Pides que hagan:** Cambia `Cargar<T>` para que use `FetchForWriting<T>` en vez de `AggregateStreamAsync`. El truco: el stream que devuelve es genérico (`IEventStream<T>`) y lo necesitas después, en `CommitAsync`, para appendear — así que captúralo en una…
**✅ Deben ver:** Con el `Append` pelado de la plantilla, dos actos concurrentes sobre el mismo stream ambos entran (sin conflicto), cada uno decidiendo sobre estado viejo.
