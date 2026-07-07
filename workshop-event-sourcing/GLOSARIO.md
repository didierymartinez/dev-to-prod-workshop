# Glosario de conceptos — Event Sourcing · Marten · C#

> **Solo términos, sin definiciones.** Fuentes: transcripciones (curso Marten + curso ES) · repo real `Cosmos.BuildingBlocks` · doc oficial de Marten.
> **Cobertura = FOTO del 2026-07-07** — el taller está en construcción activa (v7, 14 secciones construidas de ~40 planeadas). La columna de cobertura se re-ejecuta cuando el arco se asiente; el glosario en sí sirve como **checklist** de lo que debe cubrirse.
> **Calificación:** ✅ presente en alguna sección (por grep) · ❌ aún no cubierto (sección no construida, o término no usado todavía). El matiz "de verdad se *explica* vs solo *aparece*" requiere una pasada de `revisor-coherencia` cuando el taller esté estable.

## Resumen por categoría

| Categoría | Términos | ✅ presentes | ❌ ausentes |
| --- | ---: | ---: | ---: |
| C# | 63 | 17 | 46 |
| Event Sourcing | 68 | 36 | 32 |
| Marten | 65 | 23 | 42 |
| Wolverine | 15 | 1 | 14 |
| DDD | 27 | 9 | 18 |
| CQRS/Proyecciones | 66 | 27 | 39 |
| EDA/Mensajería | 52 | 7 | 45 |
| Multi-tenancy | 17 | 2 | 15 |
| Testing | 25 | 9 | 16 |
| Postgres/Infra | 48 | 20 | 28 |
| **TOTAL** | **446** | **151** | **295** |

## C#

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| $type discriminator / JSON converter (System.Text.Json) | ES | Lección API alternativa; deserializar comandos | — | ❌ |
| .NET type (dotnet_type column, serialización) | M | Console demo; tipo para deserializar | — | ❌ |
| 202 Accepted | M · ES | Command API; respuesta a comando | — | ❌ |
| [FromBody] (bind command desde body) | ES | Lección controller | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| [JsonPropertyName] | M | Cap versionado; deserializar prop vieja | — | ❌ |
| AddHostedService | ES | Lección registro de proyecciones | — | ❌ |
| AddHttpContextAccessor | M | program.cs; startup | — | ❌ |
| AggregateStreamAsync (con CancellationToken) | M | Console demo; overloads | el-swap | ✅ |
| AllowOutOfOrderMetadataProperties | M | Domain extensions; STJ config | — | ❌ |
| ASP.NET (controllers, Razor pages) | ES | Lección web project / API | — | ❌ |
| async/await | M · ES | Refactor handlers; ProjectionService Task.Delay | conoce-a-marten · el-despachador · el-swap · tests-de-integracion | ✅ |
| await using | M | Console demo; sesión IAsyncDisposable | conoce-a-marten · tests-de-integracion | ✅ |
| BackgroundService / ExecuteAsync (IHostedService) | ES | Lección ProjectionService | — | ❌ |
| CancellationToken | M | Subscription; cancelar loop | — | ❌ |
| console application / host builder | ES | Lección projections project (program.cs) | — | ❌ |
| controller / [HttpPost] / route / IActionResult | M · ES | Command controller; endpoints async | — | ❌ |
| CreateScope (crear scope de DI manual) | ES | Lección ProjectionService (por batch) | — | ❌ |
| DefaultJsonTypeInfoResolver | M | CommandTypeResolver; pipeline JSON | — | ❌ |
| dependency injection / DI container | M · ES | Command router; resolver handlers; program.cs | — | ❌ |
| dynamic (cast para seleccionar overload) | ES | Lección root entity; EventStream.GetEntity | el-despachador · refactorizando-el-motor | ✅ |
| enum (Carrier / ContainerType: bottles/cans, UPS/FedEx/BPost) | M · ES | Cap versionado y AddShippingLabel | — | ❌ |
| extension method | M · ES | Domain extensions; RegisterDomain/RegisterProjections | — | ❌ |
| generic type constraint (where T : ...) | M · ES | ICommandHandler / EventStream / CommandHandler base | — | ❌ |
| GetTypeInfo (método del resolver) | M | CommandTypeResolver | — | ❌ |
| Guid | M | Console demo; aggregate ID y command ID | conoce-a-marten · el-swap | ✅ |
| HostBuilder / IHost | M | MartenFixture; host real en tests | — | ❌ |
| HttpContext (User.Identity.Name) | M | Command router; username del request | — | ❌ |
| IAsyncDisposable | M | Fixture con host; dispose al final | — | ❌ |
| IDisposable / Dispose | M | MartenFixture; xUnit cleanup | tests-de-integracion | ✅ |
| IgnoreUnrecognizedTypeDiscriminators | M | CommandTypeResolver; poly options | — | ❌ |
| IHttpContextAccessor | M | Cap auditoría; obtener username | — | ❌ |
| immutable command / immutable event | ES | Lección código commands/events | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| IServiceProvider / GetService / GetRequiredService | M · ES | Command router; ProjectionService (crear scope) | — | ❌ |
| JetBrains Rider / Azure Data Studio (tooling) | ES | Intro; ejecutar scripts SQL | — | ❌ |
| JsonDerivedType | M | CommandTypeResolver; tipos derivados | — | ❌ |
| JsonPolymorphismOptions | M | CommandTypeResolver; type discriminator | — | ❌ |
| LINQ (Select, method group, Where) | M · ES | Event store mapear a DatabaseEvent; Query API | concurrencia-optimista | ✅ |
| marker interface (ICommand) | M | Cap auditoría; constraint de comandos | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| method overload / overloading | ES | Lección root entity (Apply por tipo) | — | ❌ |
| MethodInfo / reflection (GetMethod, Invoke) | M · ES | Command router; despacho por reflexión | — | ❌ |
| Microsoft.AspNetCore.Http.Abstractions package | M | Cap auditoría; instalar paquete | — | ❌ |
| Microsoft.Extensions.Hosting | ES | Lección ProjectionService (BackgroundService) | — | ❌ |
| namespace / folder por aggregate (plural) | ES | Lección organización de código | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · el-swap · los-primeros-hechos | ✅ |
| never-ending loop (StoppingToken.CancellationRequested) | ES | Lección ProjectionService (bucle) | — | ❌ |
| NuGet (Microsoft.Extensions.DependencyInjection.Abstractions) | ES | Lección DI setup del dominio | — | ❌ |
| nullable string / nullable property | M | Cap versionado; friendly name nullable | — | ❌ |
| OpenAPI / Swagger UI | ES | Lección API; probar endpoints | — | ❌ |
| polymorphic serialization | M | Cap auditoría; commands con marker interface | conoce-a-marten · persistir-a-mano | ✅ |
| primary constructor | M · ES | Tests; CommandHandler base; CommandRouter | — | ❌ |
| primitive types (en commands/events) | ES | Lección value types (estrategia alternativa) | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| private set / private setters | M · ES | Cap snapshots; root entity value types | el-swap · los-primeros-hechos · refactorizando-el-motor · tests-de-integracion | ✅ |
| record / record type (immutable) | M · ES | Console demo; eventos y agregado inmutables | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · given-when-then · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor · tests-de-integracion | ✅ |
| SignalR client library / JavaScript | ES | Lección UI (beerbox.js, index.html) | — | ❌ |
| static factory methods | M · ES | BoxAggregate; create/apply; BoxCapacity.For | — | ❌ |
| string interpolation ($"...") | ES | Command router (throw no handler) | — | ❌ |
| switch statement / switch expression (por tipo) | ES | Command router (versión hardcoded) | — | ❌ |
| Task / Task.CompletedTask / Task.FromResult | M | CreateBox handler; NullChangeListener | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| TraceIdentifier | M | Cap auditoría; header metadata | — | ❌ |
| type discriminator ($command_type) | M | CommandTypeResolver; $type custom | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| TypeInfoResolver | M | Domain extensions; agregar resolver | — | ❌ |
| UnknownDerivedTypeHandling (fallback base type) | M | CommandTypeResolver | — | ❌ |
| ValueTask | M | ISubscription; Dispose | — | ❌ |
| with expression (previous with { }) | M | BoxAggregate; record inmutable | — | ❌ |

## Event Sourcing

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| AddEventType | Docs | events/ registro de tipos de evento | — | ❌ |
| aggregate ID / stream ID | M · ES | Console demo; identidad del stream | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| AggregateStreamAsync (con snapshot / from version) | M · Repo · Docs | Time travel; snapshot repo; live aggregation | el-swap | ✅ |
| AggregateStreamAsync (con timestamp) | M | Time travel por punto en el tiempo | el-swap | ✅ |
| AggregateStreamAsync (con version) | M | Time travel; version 6 | el-swap | ✅ |
| append only | ES | Lección streams; diseño de tabla events | — | ❌ |
| AppendEvent | ES · Repo | IEventStore.AppendEvent + MartenEventStore impl | concurrencia-optimista · el-almacen-por-id | ✅ |
| AppendExclusive | Docs | events/appending.html (bloqueo) | — | ❌ |
| AppendOptimistic | Docs | events/appending.html (concurrencia) | — | ❌ |
| archive stream / archived (flag) | M | Cap versionado y sagas; dejar de fetch | — | ❌ |
| audit log / logging commands (LoggedCommand) | M | Cap auditoría; comando como documento | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| Axon (JVM) | M | Conclusión; framework JVM | — | ❌ |
| backwards compatibility / breaking changes | M · ES | Cap versionado; estrategia de evolución | — | ❌ |
| business events (vs entity updated/deleted) | M | Cap versionado; nombrar eventos de dominio | — | ❌ |
| caching aggregates | ES | Lección lifecycle; escalado | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| checkpoints | M | Progression table; avance de proyección | — | ❌ |
| ConcurrencyException | Docs | command_handler_workflow.html (concurrencia optimista) | concurrencia-optimista · el-swap | ✅ |
| copy and transform stream | M | Cap versionado; martendb.io/scenarios | — | ❌ |
| CRUD system | ES | Lección estado vs comandos vs eventos | — | ❌ |
| deserialize / deserialization (rompe con VO estricto) | ES | Lección value types; upcasting | conoce-a-marten · persistir-a-mano | ✅ |
| entity | ES | Lección procesamiento de comandos | el-swap · tests-de-integracion | ✅ |
| event | ES | Lección commands vs events | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · refactorizando-el-motor | ✅ |
| Event Sourcing | M · ES | Tema central del curso | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| event store / event store (persistencia) | M · ES | Storage de eventos por stream; interfaz IEventStore | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| event stream / stream (event stream) | M · ES | Serie de eventos por agregado; clase EventStream | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor · tests-de-integracion | ✅ |
| event versioning / schema evolution | M | Cap versionado; evolucionar eventos | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor · tests-de-integracion | ✅ |
| eventdriven.io (Oscar) | M | Cap snapshots; artículo de snapshots | — | ❌ |
| EventStoreDB (chosen event store) | M · ES | Conclusión; alternativa de mercado | — | ❌ |
| `EventStream<T> (genérico)` | ES | Lección command handlers; clase EventStream | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-flujo-de-vida · el-swap · refactorizando-el-motor | ✅ |
| ExistsAsync | Repo | IEventStore.ExistsAsync&lt;TAggregateRoot&gt; | — | ❌ |
| failure event / fail reason | ES | Lección código; ShippingLabelFailedToAdd | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| fetch events / locate the aggregate | ES | Lección lifecycle; EventStore.GetEvents | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| FetchForExclusiveWriting | Docs | command_handler_workflow.html (bloqueo) | — | ❌ |
| FetchForWriting | M · Docs | Cap snapshots/concurrencia; scenarios command handler | el-swap | ✅ |
| FetchStreamAsync | M · Docs | Tests then; lectura de stream crudo | tests-de-integracion | ✅ |
| FetchStreamStateAsync | Repo | MartenEventStore.ExistsAsync calls FetchStreamStateAsync | — | ❌ |
| GetAggregateRootAsync | Repo | IAggregateRootReader multiple overloads | — | ❌ |
| GetEntity (rehidratar) | ES | EventStream.GetEntity | — | ❌ |
| identifier (ID de entidad) | ES | Lección streams e identificadores | — | ❌ |
| IEventStore (interfaz de dominio) | ES | GetEvents, AppendEvent, SaveChanges | el-almacen-por-id · el-swap · tests-de-integracion | ✅ |
| IEventStream | Docs | scenarios/command_handler_workflow.html | — | ❌ |
| multi-aggregate command (dos aggregates en un handler) | ES | Lección final (escenarios complejos) | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| no rewriting history (no update scripts) | M | Cap versionado; regla clave | — | ❌ |
| object graph (rehidratación en memoria) | ES | Lección streams; get_entity | — | ❌ |
| optimistic concurrency | M · ES | Cap snapshots; PK aggregateId+sequence; hilos concurrentes | concurrencia-optimista · el-almacen-por-id · el-swap · given-when-then · persistir-a-mano | ✅ |
| past / present / future (through the eyes of time) | ES | Lección 'through the eyes of time' | decidir-el-futuro · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · los-primeros-hechos | ✅ |
| persistence model / communication model (eventos idénticos) | ES | Lección CQRS | — | ❌ |
| QueryableExtensions (ToListAsync/AnyAsync/FirstOrDefaultAsync) | Repo | EventSourcing.Linq.Extensions/QueryableExtensions | — | ❌ |
| rehydrate / reconstruct aggregate | M · ES | AggregateStreamAsync; EventStream; query API GetById | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-flujo-de-vida · el-swap · los-primeros-hechos | ✅ |
| replay events | M · ES | Cap snapshots; reconstruir estado | decidir-el-futuro · el-flujo-de-vida · los-primeros-hechos | ✅ |
| sequence number | ES | Lección streams; StoredEvent; concurrencia | el-diario-de-una-empresa · el-flujo-de-vida · el-swap · los-primeros-hechos · refactorizando-el-motor | ✅ |
| serialization (JSON) event body / event type name | ES | Lección DatabaseEvent (mapeo a BD) | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| side effects | ES | Lección por qué eventos y no comandos | — | ❌ |
| snapshotting | M · ES | Cap snapshots; estado guardado; escalado | concurrencia-optimista · conoce-a-marten · el-swap | ✅ |
| split one event into multiple (upcaster) | M | Cap versionado; bottles-&gt;bottle | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| state / state change | ES | Lección '¿Qué es event sourcing?' | — | ❌ |
| storage pattern / design pattern | ES | Lección '¿Qué es event sourcing?' | — | ❌ |
| StoredEvent (aggregateId, sequence, timestamp, eventData) | ES | Lección command handlers; clase StoredEvent | — | ❌ |
| Stream key / Stream id / StreamIdentity | Docs | events/appending.html (identidad de stream) | el-swap · tests-de-integracion | ✅ |
| stream version | M | Console demo; version 11 del stream | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| StreamAction | Docs | events/appending.html | — | ❌ |
| StreamId (aggregate ID en metadata) | M | Proyecciones/subscriptions; aggregate ID | el-swap · tests-de-integracion | ✅ |
| StreamLockedException | Docs | command_handler_workflow.html (bloqueo exclusivo) | — | ❌ |
| TaskAggregateRootExtensions (Tap/Map) | Repo | EventSourcing.CritterStack/TaskAggregateRootExtensions | — | ❌ |
| time travel (replay a version/timestamp/sequence) | M · ES | Console demo version 6; read API GetBySequence | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| upcasting | M · ES | Cap versionado; convertir eventos viejos | los-primeros-hechos · persistir-a-mano | ✅ |
| version (V1, V2, V3) | ES | Lección '¿Qué es event sourcing?' | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| WriteToAggregate | Docs | scenarios/command_handler_workflow.html | — | ❌ |

## Marten

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| .NET transactional document database and event store on PostgreSQL | M · ES | Cap intro; tagline del sitio de Marten | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| [Identity] attribute / identity builder / Id convention | M | Console demo; options.Schema.For Identity | — | ❌ |
| AddAsyncDaemon | M · Repo | program.cs; MartenProjectionStoreExtensions con DaemonMode | — | ❌ |
| AddMarten | M · Docs | program.cs; configuration/hostbuilder.html (DI) | — | ❌ |
| AggregateStreamAsync | M · Repo · Docs | Console demo; MartenEventStore.GetAggregateRootAsync | el-swap | ✅ |
| AgregarConfiguracionMartenComandos | Repo | MartenEventStoreExtensions extension method | — | ❌ |
| AgregarConfiguracionMartenConsultas | Repo | MartenProjectionStoreExtensions extension method | — | ❌ |
| AgregarMartenEventStore | Repo | MartenEventStoreExtensions extension method | — | ❌ |
| AgregarMartenProjectionStore | Repo | MartenProjectionStoreExtensions extension method | — | ❌ |
| AllDocumentsAreMultiTenanted | Repo | MartenEventStore/ProjectionStore Extensions | — | ❌ |
| Append | M · Repo · Docs | Console demo; session.Events.Append | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-flujo-de-vida · el-swap · given-when-then | ✅ |
| async daemon | M | program.cs; corre proyecciones async | — | ❌ |
| base Marten NuGet package | M | Console demo; paquete base | — | ❌ |
| batch size / MaxBatchSize | M | Async projection options; subscriptions | — | ❌ |
| causation ID (session.CausationId) | M | ConfigureSession; enlaza evento a comando | — | ❌ |
| correlation ID (session.CorrelationId) | M | ConfigureSession; cadena de requests | — | ❌ |
| DaemonMode (Solo/HotCold/Disabled) | M · Repo | program.cs; MartenProjectionStoreExtensions HotCold | — | ❌ |
| DatabaseSchemaName | M | MartenFixture; schema único por test run | tests-de-integracion | ✅ |
| DirtyTrackedSession | Docs | documents/sessions.html (creación de sesión) | — | ❌ |
| document collections | M | Query API; queried como tablas de docs | — | ❌ |
| Document metadata | Docs | documents/, events/ (metadata) | — | ❌ |
| DocumentStore | M | Console demo; clase de configuración | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| DocumentStore.For | M · Docs | Console demo; events/quickstart.html bootstrap | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| Eject | Docs | documents/sessions.html (identity map) | — | ❌ |
| EnableCorrelationId / EnableCausationId / Headers | M | MetadataConfig; flags a true | — | ❌ |
| event.Data | M | Subscription; objeto de evento real | — | ❌ |
| EventNamingStyle.SmarterTypeName | Repo | MartenEventStore/ProjectionStore Extensions | el-swap · tests-de-integracion | ✅ |
| EventType(name) mapping / MapEventType | M | Cap versionado; renombrar/mover namespace | — | ❌ |
| `EventUpcaster<TOld,TNew> / Upcast` | M | BoxCreatedUpcaster; options.Events.Upcast&lt;T&gt; | los-primeros-hechos · persistir-a-mano | ✅ |
| FetchLatest | M · Docs | Cap snapshots; scenarios command handler | — | ❌ |
| header dictionary / session.SetHeader | M | ConfigureSession; TraceIdentifier metadata custom | — | ❌ |
| high watermark | M | Cap proyecciones; último evento visto | — | ❌ |
| hopper size (maximum hopper size) | M | Async projection options | — | ❌ |
| IdentityMap | Docs | documents/, events/appending.html | — | ❌ |
| IdentitySession / IdentityMap session | M · Docs | Command handlers; documents/sessions.html | — | ❌ |
| IDocumentSession | M · Docs | Cap auditoría; documents/sessions.html | el-swap · tests-de-integracion | ✅ |
| IDocumentStore | M · Docs | Refactor handlers; raíz de la API | tests-de-integracion | ✅ |
| `IEvent (wrapper) / IEvent<T>` | M | Tests then; proyección con metadata | el-almacen-por-id · el-swap · los-primeros-hechos · tests-de-integracion | ✅ |
| IEventStore (session.Events) | M | Console demo; namespace de event sourcing | el-almacen-por-id · el-swap · tests-de-integracion | ✅ |
| IntegrateWithWolverine | Repo | WolverineExtensions + Marten Extensions | — | ❌ |
| IQuerySession / QuerySession (read-only session) | M · Docs | Query API controller; documents/sessions.html | conoce-a-marten · tests-de-integracion | ✅ |
| LightweightSession | M · Docs | Console demo; documents/sessions.html | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| Load / LoadAsync | M · Docs | Proyección beer count; events/quickstart.html | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · refactorizando-el-motor | ✅ |
| Marten | M · ES | Framework central del curso deep dive | conoce-a-marten · el-swap · given-when-then · persistir-a-mano · tests-de-integracion | ✅ |
| Marten ASP.NET Core package | M | Refactor; paquete de hosting | — | ❌ |
| Marten.Services.Json.Transformations (namespace) | M | Cap versionado; EventUpcaster | — | ❌ |
| martendb.io (documentación) | M | Conclusión; recursos | — | ❌ |
| MartenEventStore | Repo | EventSourcing.CritterStack/Commands/MartenEventStore.cs | — | ❌ |
| MartenProjectionStore | Repo | EventSourcing.CritterStack/Queries/MartenProjectionStore.cs | — | ❌ |
| MartenUnitOfWork | Repo | EventSourcing.CritterStack/UnitOfWork/MartenUnitOfWork.cs | — | ❌ |
| MetadataConfig (options.Events.MetadataConfig) | M | options.Events.MetadataConfig; habilitar | — | ❌ |
| Newtonsoft serializer | M | Domain extensions; opción de serializer | — | ❌ |
| options builder / StoreOptions | M | Config del store; dominio extensions | — | ❌ |
| options.Connection (connection string) | M | Console demo; setup del store | — | ❌ |
| `Query (session.Query<T>)` | M · Repo | IProjectionStore.Query&lt;T&gt;() querySession.Query() | conoce-a-marten · decidir-el-futuro | ✅ |
| SaveChangesAsync | M · Repo · Docs | Console demo; commit de transacción | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| session (unit of work) | M | Console demo; transacción | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| session.Events property | M | Console demo; append/start | — | ❌ |
| session.Insert | M | Cap auditoría; guardar LoggedCommand | — | ❌ |
| `snapshot como proyección (Projections.Snapshot<T>)` | M | Cap snapshots; registrar snapshot | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-swap · persistir-a-mano | ✅ |
| `StartStream / StartStream<T>` | M · Repo · Docs | Console demo; CreateBox handler; appending.html | el-swap · tests-de-integracion | ✅ |
| Store / Delete (operaciones de documento) | M · Docs | documents/sessions.html; operations.Store en proyección | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-swap · given-when-then · persistir-a-mano · tests-de-integracion | ✅ |
| StreamIdentity.AsString | Repo | MartenEventStore/ProjectionStore Extensions | el-swap · tests-de-integracion | ✅ |
| System.Text.Json serializer / UseSystemTextJsonForSerialization | M · Repo | Domain config; MartenEventStore Extensions | — | ❌ |
| TenancyStyle.Conjoined (config Marten) | Repo | MartenEventStore/ProjectionStore Extensions | — | ❌ |

## Wolverine

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| AddAsyncDaemon (Wolverine integration) | Repo | MartenProjectionStoreExtensions con DaemonMode | — | ❌ |
| AgregarWolverineParaComandosServerless | Repo | EventSourcing.CritterStack/WolverineExtensions serverless | — | ❌ |
| AutoApplyTransactions | Repo | WolverineExtensions policies | — | ❌ |
| DeliveryOptions (TenancyDelivery.Build) | Repo | TenancyDelivery.Build() TenantId + WithHeader | — | ❌ |
| DurabilityMode (Solo/Balanced) | Repo | WolverineExtensions Solo/Balanced modes | — | ❌ |
| ExtensionDiscovery.ManualOnly | Repo | WolverineExtensions serverless pattern | — | ❌ |
| IncludeAssembly | Repo | WolverineExtensions discovery options | el-despachador | ✅ |
| UnitOfWorkMiddleware | Repo | EventSourcing.CritterStack/UnitOfWork/UnitOfWorkMiddleware.cs | — | ❌ |
| UsarWolverineParaComandos / UsarWolverineParaConsultas | Repo | EventSourcing.CritterStack/WolverineExtensions IHostBuilder | — | ❌ |
| UseDurableInboxOnAllListeners | Repo | EventDriven.CritterStack/WolverineExtensions HabilitarInbox | — | ❌ |
| UseDurableOutbox | Repo | EventDriven.CritterStack.RabbitMQ/WolverineExtensions | — | ❌ |
| UseRuntimeCompilation | Repo | WolverineExtensions UsarWolverineParaComandos | — | ❌ |
| WolverineCommandRouter / WolverineQueryRouter | Repo | EventSourcing.CritterStack/Commands+Queries | — | ❌ |
| WolverineMessageContextTenantResolver | Repo | MultiTenancy.CritterStack/WolverineMessageContextTenantResolver.cs | — | ❌ |
| WolverinePublicEventSender / WolverinePrivateEventSender | Repo | EventDriven.CritterStack/Wolverine*EventSender.cs | — | ❌ |

## DDD

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| abstract class (AggregateRoot base) | ES | Lección root entity | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · given-when-then · los-primeros-hechos · refactorizando-el-motor · tests-de-integracion | ✅ |
| aggregate | M · ES | BoxAggregate; terminología DDD streams | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor · tests-de-integracion | ✅ |
| aggregate root (root entity) | M · ES | Lección streams y lección root entity | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| AggregateRoot (clase base del repo) | Repo | EventSourcing.Abstractions/AggregateRoot.cs | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · refactorizando-el-motor | ✅ |
| Apply method (overloads por tipo de evento) | ES | Lección root entity; método Apply | — | ❌ |
| BeerSender / box aggregate (dominio de ejemplo) | ES | Lección problem domain; event storm del box | — | ❌ |
| business logic | ES | Lección 'eyes of time' y command handler | — | ❌ |
| clean architecture / ports and adapters (hexagonal) | M · ES | Lección wrap dominio en API; abstraer Marten | — | ❌ |
| ClearUncommittedEvents | Repo | AggregateRoot.ClearUncommittedEvents() method | — | ❌ |
| compensating action / credit note | ES | Lección DDD (ejemplo factura Bélgica) | — | ❌ |
| domain assembly (libre de dependencias) | M | Cap testing; discusión de acoplamiento | — | ❌ |
| domain event | M | Cap versionado; separar evento adicional | — | ❌ |
| Domain-Driven Design (DDD) | M · ES | Recursos; libro de Zimarev; lección DDD y ES | — | ❌ |
| driving port (command router) / driven port (IEventStore) | ES | Lección wrap dominio en API | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · refactorizando-el-motor · tests-de-integracion | ✅ |
| event storming | M · ES | Intro dominio; comandos y eventos del box | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| external vs internal contracts (mapping) | ES | Lección controller (recomendación mapear) | — | ❌ |
| GetPrivateEvents / GetPublicEvents | Repo | AggregateRoot.GetPrivateEvents()/GetPublicEvents() | — | ❌ |
| Id (property del agregado) | Repo | AggregateRoot.Id property | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-despachador · el-diario-de-una-empresa · el-swap · refactorizando-el-motor · tests-de-integracion | ✅ |
| imperative tense (comandos) / past tense (eventos) | ES | Lección commands vs events; modelado | — | ❌ |
| make it impossible to represent invalid state | ES | Lección value types (throw en constructor) | — | ❌ |
| short-lived aggregates | M | Cap versionado; recomendación | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| strict vs loose value types | ES | Lección value types (whiteboard trade-offs) | — | ❌ |
| ubiquitous language | ES | Lección DDD y event storming | — | ❌ |
| UncommittedEvents | Repo | AggregateRoot.UncommittedEvents property | — | ❌ |
| value type / value object / value equality | ES | Lección value types (records como VO) | — | ❌ |
| Version (property del agregado) | Repo | AggregateRoot.Version property | concurrencia-optimista · conoce-a-marten · el-swap · los-primeros-hechos · persistir-a-mano | ✅ |
| view models | ES | Lección event storming (post-its) | — | ❌ |

## CQRS/Proyecciones

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| AgregarWolverineCommandRouter / AgregarWolverineQueryRouter | Repo | EventSourcing.CritterStack/WolverineExtensions | — | ❌ |
| AllProjectionProgress | Docs | async-daemon.html (diagnóstico de progreso) | — | ❌ |
| Apply (convención de proyección) | M · Docs | SingleStreamProjection; métodos por convención | el-swap | ✅ |
| Async projection (ProjectionLifecycle.Async) | M · Docs | Consistencia eventual; background worker | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| AsyncDaemon / IProjectionDaemon | Docs | events/projections/async-daemon.html | — | ❌ |
| batch size (batching de eventos) | ES | Lección OpenBoxProjection / ProjectionService | — | ❌ |
| checkpoint / projection checkpoint | ES | Lección checkpoints; ProjectionService | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| checkpoint repository (GetCheckpoint/SetCheckpoint) | ES | Lección projections prep | — | ❌ |
| command | M · ES | Command side; CreateBox/AddBeer, etc. | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| command API / query API | ES | Lección CQRS; capítulo read side | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| command handler | M · ES | Handlers refactorizados; lifecycle y clase | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| command router / orchestrator | M · ES | Despacho central; cross-cutting concerns | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · refactorizando-el-motor · tests-de-integracion | ✅ |
| command side / query side | ES | Lección CQRS; read side | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| composable command handlers | ES | Lección command router (descomponer comandos) | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| controller / endpoint | M | Query API y Command API | — | ❌ |
| CQRS (Command Query Responsibility Segregation) | M · ES | Arquitectura command/query separados | decidir-el-futuro · el-almacen-por-id · persistir-a-mano | ✅ |
| CQS (Command Query Separation) | ES | Lección CQRS | — | ❌ |
| Create (convención de proyección) | M | SingleStreamProjection; inicia documento | el-swap · persistir-a-mano | ✅ |
| CustomProjection | Docs | events/projections/ | — | ❌ |
| `DeleteEvent<T> / Delete (en proyección)` | M | SingleStreamProjection; box closed | — | ❌ |
| EventProjection (base class) | M · Docs | BeerCountProjection; Project/ProjectAsync | — | ❌ |
| eventual consistency | M | Async projections; pickup posterior | — | ❌ |
| execute (handler) | ES | Lección command handler lifecycle | — | ❌ |
| FetchLatest (read side) | Docs | scenarios/command_handler_workflow.html | — | ❌ |
| FlatTableProjection / Flat Table Projections | M · Docs | Cap proyecciones; escribir a tabla Postgres | — | ❌ |
| GetStream (helper en handler base) | ES | CommandHandler base | — | ❌ |
| Handle / HandleAsync | ES · Repo | ICommandHandler.Handle; IQueryHandler.HandleAsync | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · refactorizando-el-motor · tests-de-integracion | ✅ |
| HighWaterMark | Docs | async-daemon.html (diagnóstico) | — | ❌ |
| HotCold / Solo (DaemonMode) | Docs | async-daemon.html (DaemonMode) | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor · tests-de-integracion | ✅ |
| IAggregateRootReader | Repo | Queries/IAggregateRootReader.cs interface | — | ❌ |
| ICommandHandler / ICommandHandlerAsync | M · Repo | Commands/ICommandHandler.cs interface | el-almacen-por-id · el-despachador · el-swap · given-when-then · tests-de-integracion | ✅ |
| ICommandRouter / IQueryRouter | Repo | Commands/ICommandRouter.cs; Queries/IQueryRouter.cs | — | ❌ |
| IEventStore (interfaz del repo) | Repo | Commands/IEventStore.cs interface | el-almacen-por-id · el-swap · tests-de-integracion | ✅ |
| Inline projection (ProjectionLifecycle.Inline) | M · Docs | Consistencia transaccional ACID; misma transacción | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| InvokeAsync | Repo | ICommandRouter.InvokeAsync&lt;TCommand&gt; | el-despachador | ✅ |
| IProjection (interfaz) | ES · Docs | OpenBoxProjection; events/projections/ base | — | ❌ |
| IProjectionCoordinator | Docs | events/projections/async-daemon.html | — | ❌ |
| IProjectionStore | Repo | Queries/IProjectionStore.cs interface | — | ❌ |
| IQueryHandler | Repo | Queries/IQueryHandler.cs interface | — | ❌ |
| isolation (handlers en aislamiento) | ES | Lección lifecycle; proyecciones | — | ❌ |
| Live projection (ProjectionLifecycle.Live / LiveStreamAggregation) | M · Docs | Cap proyecciones; agregación en memoria | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| `MultiStreamProjection<TDoc,TId>` | M · Docs | BottleInBoxes; compilar múltiples streams | — | ❌ |
| open boxes / unsent boxes (tablas read) | ES | Lección read API tablas; proyecciones | — | ❌ |
| operations.Store | M | EventProjection; guardar documento | — | ❌ |
| `Project<T> / ProjectAsync<T>` | M | EventProjection; lambda evento+operations | — | ❌ |
| projection | M · ES | Preparar datos para query | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| projection name (typeof().Name) | ES | Lección checkpoint (nombre de proyección) | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| projection repository (OpenBoxRepo: create/addBottle/remove) | ES | Lección projections prep | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| ProjectionLifecycle | Docs | events/projections/ (Live/Inline/Async) | — | ❌ |
| Projections.Add / Projections.Snapshot | M · Docs | Setup del store; registrar proyección/snapshot | — | ❌ |
| query model / read model / write model | M · ES | BeerCount; modelos separados | conoce-a-marten · persistir-a-mano | ✅ |
| query shapes (transformar eventos para lectura) | ES | Cierre capítulo read side | — | ❌ |
| read side / read model / read database / read store | M · ES | Query side; proyecciones populan read store | conoce-a-marten · persistir-a-mano | ✅ |
| rebuild projection / RebuildProjectionAsync | M · Docs | Cap proyecciones; reprocesar todo el stream | conoce-a-marten · el-almacen-por-id · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| relevant event types (subset de eventos) | ES | Lección OpenBoxProjection | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| ResolveAsync | Repo | IQueryRouter.ResolveAsync&lt;TQuery,TResult&gt; | — | ❌ |
| scale out projections (una proyección por instancia) | ES | Lección final (escalado proyecciones) | conoce-a-marten · el-almacen-por-id · persistir-a-mano | ✅ |
| ShardName / ShardState | Docs | async-daemon.html (sharding/diagnóstico) | — | ❌ |
| `SingleStreamProjection<T>` | M · Docs | OpenBox projection; documento 1:1 con stream | — | ❌ |
| SnapshotLifecycle | Docs | events/projections/ (Snapshot Inline/Async) | — | ❌ |
| switch case sobre eventData (por tipo de evento) | ES | Lección OpenBoxProjection.Project | — | ❌ |
| ToListAsync (LINQ query) | M | Query API; query de open box | — | ❌ |
| transactional consistency | M | Inline projections; mismo commit | — | ❌ |
| UseIdentityMapForAggregates | Docs | command_handler_workflow.html (opts.Events/Projections) | — | ❌ |
| wait time / delay (stale data, Task.Delay) | ES | Lección OpenBoxProjection / ProjectionService | — | ❌ |
| Where (LINQ) | M | Query API; filtrado sobre documentos | concurrencia-optimista · el-almacen-por-id · el-flujo-de-vida · persistir-a-mano | ✅ |

## EDA/Mensajería

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| Accepted (202) vs OK | ES | Lección controller; asincronía de proyecciones | — | ❌ |
| AddSubscriptionWithServices | M | program.cs; registrar subscription | — | ❌ |
| AgregarWolverineEventSender | Repo | EventDriven.CritterStack/WolverineExtensions | — | ❌ |
| Azure SignalR service / cloud notification services | ES | Cierre capítulo UI; escalado notificaciones | — | ❌ |
| bi-directional communication | ES | Lección UI (SignalR) | — | ❌ |
| callbacks (async) | M | Cap sagas; respuestas de sistemas externos | — | ❌ |
| command bus | ES | Lección final (temas del curso avanzado) | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| command debounce (idempotencia por command ID) | M | Cap auditoría; prevenir comandos duplicados | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| connection ID / group (por aggregateId) | ES | Lección UI hub (agrupar clientes) | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| correlation IDs / causation ID / conversation IDs (metadata) | M · ES | Cap auditoría; event store mejoras futuras | — | ❌ |
| dead letter queue | M | ShipmentNotifier; error options | — | ❌ |
| error options / error handlers / retries | M | SubscriptionController; retries out of the box | — | ❌ |
| event-driven architecture (EDA) | M | Intro; queues/topics | — | ❌ |
| EventRange | M | ISubscription; batch de eventos | — | ❌ |
| external systems / message bus (integración) | ES | Lección final (inyectar en handlers) | — | ❌ |
| filter por StreamType / EventType | M | Options de subscription; box sent event | — | ❌ |
| HabilitarAzureServiceBus / PublicarEvento | Repo | EventDriven.CritterStack.AzureServiceBus/WolverineExtensions | — | ❌ |
| HabilitarInbox | Repo | EventDriven.CritterStack/WolverineExtensions | — | ❌ |
| HabilitarOutboxParaEventosPublicos / Privados | Repo | EventDriven.CritterStack.RabbitMQ/WolverineExtensions | — | ❌ |
| HabilitarRabbitMq | Repo | EventDriven.CritterStack.RabbitMQ/WolverineExtensions | — | ❌ |
| Hangfire | M | Cap sagas; tareas temporizadas | — | ❌ |
| hub / IHubContext / MapHub | M · ES | EventHubSubscription; push a SignalR | — | ❌ |
| IChangeListener / NullChangeListener | M | Subscription; retorno del método | — | ❌ |
| IEvent (interfaz del repo) | Repo | EventDriven.Abstractions/IEvent.cs interface | el-almacen-por-id · el-swap · los-primeros-hechos · tests-de-integracion | ✅ |
| INotificationService (PublishEvent) | ES | Lección publicar eventos al hub | — | ❌ |
| IPublicEvent / IPrivateEvent | Repo | EventDriven.Abstractions/IPublicEvent.cs; IPrivateEvent.cs | — | ❌ |
| IPublicEventSender / IPrivateEventSender | Repo | EventDriven.Abstractions/I*EventSender.cs | — | ❌ |
| ISubscription / ISubscriptionController | M | EventHubSubscription; ShipmentNotifier | — | ❌ |
| live updates / live dashboarding | ES | Lección UI; cierre capítulo UI | — | ❌ |
| logical processor (comando) / logical publisher (evento) | ES | Lección commands vs events | — | ❌ |
| long polling / regular polling (fallback) | ES | Lección UI (qué es SignalR) | — | ❌ |
| loosely coupled integration | M | ShipmentNotifier; no depender de uptime externo | — | ❌ |
| page.Events | M | Subscription; iterar eventos | — | ❌ |
| Polly | M | ShipmentNotifier; resiliencia (mención) | — | ❌ |
| process manager / long-running process / saga | M | Cap integraciones; add bottle saga | — | ❌ |
| projection-like process / event stream reader (integración salida) | ES | Lección final (retry via checkpoint) | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |
| publish after commit (mensajería tras persistir) | ES | Lección NotificationService | — | ❌ |
| publish/subscribe | ES | Lección commands vs events | — | ❌ |
| PublishAsync | Repo | IPublicEventSender + IPrivateEventSender impls | — | ❌ |
| Quartz | M | Cap sagas; scheduler alternativo | — | ❌ |
| queue / queues and topics / bus | M · ES | Cap integraciones; inter-process comm; peak load | el-despachador | ✅ |
| Redux / state management (front) | ES | Lección patrón UI | — | ❌ |
| retry mechanism (no avanzar checkpoint) | ES | Lección final (integración externa) | — | ❌ |
| SendAsync / Clients.Group.SendAsync | ES | Lección NotificationService | — | ❌ |
| SignalR | M · ES | Hub; notificar UI; AddSignalR | — | ❌ |
| SignalR group / subscribe to aggregate (por stream ID) | M · ES | UI subscribe por aggregate ID | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| single endpoint vs endpoint-por-comando | ES | Lección 'otra forma de hacer la API' | — | ❌ |
| subscription lifecycle (singleton/scoped/transient) | M | program.cs; scope de instancia | — | ❌ |
| subscriptions / subscription | M | SignalR hub; ShipmentNotifier | — | ❌ |
| SuscribirseAServicio | Repo | EventDriven.CritterStack.RabbitMQ/WolverineExtensions | — | ❌ |
| temporal decoupling (queue ante peak load) | ES | Lección final (peak load) | — | ❌ |
| WebSocket | ES | Lección patrón UI (subscribe a aggregates) | — | ❌ |

## Multi-tenancy

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| AgregarTenantResolverConHeadersConfiables | Repo | MultiTenancy.AspNetCore/TenancyExtensions | — | ❌ |
| AgregarTenantResolverHibrido | Repo | MultiTenancy.CritterStack/TenancyExtensions | — | ❌ |
| Conjoined / Single (TenancyStyle) | Docs | multitenancy.html (TenancyStyle) | given-when-then | ✅ |
| default tenant / tenant | M | Console demo; campo de tenant en stream | — | ❌ |
| expected version (overload FetchForWriting/append) | M | Cap concurrencia; FetchForWriting/append | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| ForTenant | Docs | multitenancy.html (sesión por tenant) | — | ❌ |
| ITenancy | Docs | multitenancy.html (interfaz) | — | ❌ |
| ITenantResolver | Repo | MultiTenancy/ITenantResolver.cs interface | — | ❌ |
| MultiTenantedDatabases | Docs | multitenancy.html (config DB por tenant) | — | ❌ |
| ProxyTenantResolver | Repo | MultiTenancy.CritterStack/ProxyTenantResolver.cs | — | ❌ |
| TenancyDelivery | Repo | EventSourcing.CritterStack/TenancyDelivery.cs internal | — | ❌ |
| TenancyHeaders | Repo | MultiTenancy/TenancyHeaders.cs static class | — | ❌ |
| TenancyStyle | Docs | configuration/multitenancy.html (Conjoined/Single) | — | ❌ |
| TenantId (property del resolver) | Repo | ITenantResolver.TenantId property | — | ❌ |
| TenantIdStyle | Docs | multitenancy.html (CaseSensitive/Lower/Upper) | — | ❌ |
| TrustedHeadersTenantResolver | Repo | MultiTenancy.AspNetCore/TrustedHeadersTenantResolver.cs | — | ❌ |
| UserId (property del resolver) | Repo | ITenantResolver.UserId property | — | ❌ |

## Testing

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| [CollectionDefinition] / [Collection] / ICollectionFixture | M | Marten collection; compartir fixture en test run | — | ❌ |
| [Theory] / test data | M | AddShippingLabel tests; casos parametrizados | — | ❌ |
| ambient aggregate ID | ES | Lección base test (overload sin ID) | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-flujo-de-vida · los-primeros-hechos | ✅ |
| And (test builder) | Repo | CommandHandlerTestBase.And() method | — | ❌ |
| assertion / be equivalent to (property-by-property) | ES | Lección base test (Then); comparación de object graph | given-when-then · tests-de-integracion | ✅ |
| base test for command handlers / aggregate test base class | ES | Lección clases de test provistas (BoxTest) | concurrencia-optimista · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| CommandHandlerAsyncTest / CommandHandlerTest | Repo | EventSourcing.Testing.Utilities/CommandHandler*Test.cs | — | ❌ |
| CommandHandlerTestBase | Repo | EventSourcing.Testing.Utilities/CommandHandlerTestBase.cs | — | ❌ |
| exercise / homework (implementar handlers restantes) | ES | Cierres de capítulos (dominio incompleto) | — | ❌ |
| fixture (setup/teardown) | M | MartenFixture; schema create/drop | tests-de-integracion | ✅ |
| FluentAssertions (Should, BeEquivalentTo) | M · ES | Tests; asserts y comparación de eventos | — | ❌ |
| Given / When / Then | M · ES · Repo | Tests; CommandHandlerTestBase.Given/Then; When/WhenAsync | concurrencia-optimista · decidir-el-futuro · el-command-handler · el-swap · given-when-then · persistir-a-mano · tests-de-integracion | ✅ |
| IClassFixture | M | Tests; fixture por clase | tests-de-integracion | ✅ |
| integration tests (recomendación equipo Marten) | M | Cap testing; DB real | — | ❌ |
| mocking framework (no necesario) | M · ES | Cap testing; unit tests con abstracción | — | ❌ |
| previous events / new events (colecciones) | ES | Lección TestStore | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-flujo-de-vida · given-when-then | ✅ |
| refactor tests for readability (product owner) | ES | Lección refactor de tests | — | ❌ |
| SpecFlow / Cucumber / Gherkin (evitados) | ES | Lección refactor; cierre de capítulo testing | — | ❌ |
| test naming convention (If_box_empty_then...) | ES | Lección primer test | — | ❌ |
| TestPublicEventSender / TestPrivateEventSender | Repo | EventSourcing.Testing.Utilities/Test*EventSender.cs | — | ❌ |
| TestStore (in-memory IEventStore) | ES · Repo | Lección clases de test; EventSourcing.Testing.Utilities/TestStore.cs | given-when-then | ✅ |
| ThenIsPublishedPublicly / ThenIsPublishedPrivately | Repo | CommandHandlerTestBase methods | — | ❌ |
| unit test / test runner | M · ES | Lección primer test; enfoque alternativo | — | ❌ |
| WaitForNonStaleProjectionDataAsync | M · Docs | OpenBoxTest; async-daemon.html esperar datos frescos | — | ❌ |
| xUnit / [Fact] | M · ES | Fixtures; primer test (AddBeerHandlerTest) | given-when-then · tests-de-integracion | ✅ |

## Postgres/Infra

| Término | Fuente(s) | Dónde se aborda | Cobertura (§) | Calif. |
| --- | --- | --- | --- | :---: |
| .NET type / JSON data / JSONB (data column) | M · Docs | Console demo; payload del evento; almacenamiento subyacente | conoce-a-marten · persistir-a-mano | ✅ |
| ACID transactions | M | Console demo; inline projection consistente | — | ❌ |
| AddAsyncDaemon (host) | Docs | async-daemon.html, configuration/hostbuilder.html | — | ❌ |
| AddMarten (DI) / AddMartenStore | Docs | configuration/hostbuilder.html (DI) | — | ❌ |
| ApplyAllDatabaseChangesOnStartup | Docs | configuration/hostbuilder.html (migración) | — | ❌ |
| appsettings.json / IConfiguration / ConfigurationBuilder | M · ES | MartenFixture; leer connection string | — | ❌ |
| auto-create tables at runtime / AutoCreateSchemaObjects | M · Docs | Console demo; advertencia producción; DDL automático | persistir-a-mano · tests-de-integracion | ✅ |
| byte array checkpoint (rowversion 64-bit) | ES | Lección ProjectionService (GetCheckpoint) | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| clustered key read (command side) | ES | Lección final (perfil de acceso) | decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-swap · given-when-then · los-primeros-hechos · tests-de-integracion | ✅ |
| connection string | M · ES | Console demo y program.cs; app settings | — | ❌ |
| CREATE SCHEMA / DROP SCHEMA ... CASCADE | M | MartenFixture; setup/teardown de tests | persistir-a-mano · tests-de-integracion | ✅ |
| Dapper | M · ES | Sistema viejo; event store repositorios read | — | ❌ |
| database clustering / read replicas | ES | Lección final (escalar lecturas) | — | ❌ |
| `DatabaseEvent (mapeo StoredEvent<->fila)` | ES | Lección event store | — | ❌ |
| DatabaseSchemaName (config) | Docs | events/, configuration (esquema) | tests-de-integracion | ✅ |
| DbConnection factory / connection pool / pooling=true | M · ES | Lección event store; appsettings connection string | — | ❌ |
| Docker container (postgres image) / docker run | M | Setup; --name -p 5432 --restart unless-stopped | — | ❌ |
| functions (Marten SQL functions) | M | Console demo; funciones generadas | — | ❌ |
| GetConnectionString | M | program.cs; sacar conn string | — | ❌ |
| insert / select SQL statements / transaction (BeginTransaction/Commit) | ES | Lección event store SaveChanges (Dapper) | conoce-a-marten · decidir-el-futuro · el-flujo-de-vida · persistir-a-mano | ✅ |
| IServiceCollection | M · Docs | program.cs; configuration/hostbuilder.html (DI) | — | ❌ |
| ISessionFactory | Docs | configuration/hostbuilder.html (BuildSessionsWith) | — | ❌ |
| IsolationLevel | Docs | documents/sessions.html (SessionOptions) | — | ❌ |
| Microsoft.Extensions.Configuration.Json package | M | MartenFixture; leer appsettings.json | — | ❌ |
| mt_ (prefijo de objetos Marten) | M | Console demo; tablas prefijadas | conoce-a-marten · el-swap | ✅ |
| mt_doc_ (tabla de documento, ej mt_doc_beer_count) | M | Proyección; tabla por tipo de documento | conoce-a-marten | ✅ |
| mt_events | M | Console demo; tabla de eventos | el-swap | ✅ |
| mt_streams | M | Console demo; tabla de streams | — | ❌ |
| normalized relational database | ES | Lección estado vs eventos | — | ❌ |
| Npgsql / NpgsqlConnection | M | MartenFixture; create/drop schema | persistir-a-mano | ✅ |
| OpenSession / SessionOptions | Docs | documents/sessions.html (SessionOptions) | — | ❌ |
| page splits / concurrent writes | ES | Lección diseño de tabla events | — | ❌ |
| pgAdmin | M | Setup; herramienta de administración | — | ❌ |
| port 5432 | M | Setup; mapeo de puerto Postgres | — | ❌ |
| Postgres / PostgreSQL | M · ES · Docs | Base de datos bajo Marten | conoce-a-marten · el-swap · given-when-then · persistir-a-mano · tests-de-integracion | ✅ |
| primary key (aggregateId + sequenceNumber) / unique constraint (stream_id + version) | M · ES | Console demo; CREATE TABLE events; concurrencia | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-despachador · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| progression table | M | Cap proyecciones; tracking del demon | — | ❌ |
| public schema | M | Console demo; tablas de Marten | persistir-a-mano · tests-de-integracion | ✅ |
| RavenDB | M | Historia de Marten; DB reemplazada | conoce-a-marten | ✅ |
| scaling / stateless query API | ES | Lección final (escalado query side) | — | ❌ |
| schema injection attacks warning | M | Console demo; deshabilitar en prod | persistir-a-mano · tests-de-integracion | ✅ |
| sequence (generación de IDs de eventos) | M | Console demo; sequence en Postgres | el-diario-de-una-empresa · el-flujo-de-vida · el-swap · los-primeros-hechos · refactorizando-el-motor | ✅ |
| SQL Server / LocalDB | ES | Intro; connection strings; event store | — | ❌ |
| StoreOptions (config) | Docs | configuration/hostbuilder.html (config) | — | ❌ |
| timestamp / rowversion column (SQL Server) | ES | Lección event store; usado en proyecciones | concurrencia-optimista · conoce-a-marten · el-almacen-por-id · el-despachador · el-flujo-de-vida · el-swap · los-primeros-hechos · persistir-a-mano · refactorizando-el-motor | ✅ |
| unit of work / SaveChanges (commit transaction) | ES | Lección command handlers; dapper insert | conoce-a-marten · el-swap · tests-de-integracion | ✅ |
| UseLightweightSessions | Docs | configuration/hostbuilder.html | — | ❌ |
| UUID column (event id) | M | Console demo; id único de evento | concurrencia-optimista · conoce-a-marten · decidir-el-futuro · el-almacen-por-id · el-command-handler · el-diario-de-una-empresa · el-flujo-de-vida · el-swap · given-when-then · los-primeros-hechos · persistir-a-mano · tests-de-integracion | ✅ |

