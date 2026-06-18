# Capstone: un bounded context de punta a punta

Empezaste con una empresa que tenía **amnesia** ([El diario de una empresa](el-diario-de-una-empresa.md)) y un `foreach` sobre cuatro variables ([Los primeros hechos](los-primeros-hechos.md)). Terminas con un motor de Event Sourcing completo, sobre la Critter Stack, que sabes **construir, explicar y mantener**. Es hora de juntarlo todo — y de revelar el secreto que guardamos todo el taller.

## 🎯 El Objetivo

Integrar **todo** en un bounded context completo de la `Empresa`, y reconocer que lo que construiste **es** la plantilla del equipo.

## El reto final: la Empresa, de punta a punta

> 🛠️ **Inténtalo tú.** Arma un servicio completo de la `Empresa` usando **todo** lo que construiste:
> 1. El agregado `Empresa`: acumula (`Raise`), aplica (`Apply(T)`), lleva su `Version`. ([El agregado que acumula](el-agregado-acumula.md) a [La versión del agregado](la-version-del-agregado.md))
> 2. Persistencia: el Unit of Work y el almacén directo ([El almacén directo](el-almacen-directo.md)) → extraído a `IEventStore` y respaldado por **Marten** con `MartenEventStore` ([Revelar Marten](revelar-marten.md)).
> 3. Comandos y handlers (`ICommandHandler<T>`) descubiertos por **Wolverine**, con el middleware que comitea. ([Revelar Wolverine](revelar-wolverine.md))
> 4. Eventos **públicos** (`IPublicEvent`) a un broker con **outbox** durable; **privados** al bus interno. ([Público vs privado](publico-vs-privado.md) a [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md))
> 5. Una **proyección** (`EmpresaResumen`) para las consultas (CQRS). ([CQRS y proyecciones](cqrs-proyecciones.md))
> 6. **Multi-tenancy**: la sesión por tenant, el `ITenantResolver` híbrido. ([Multi-tenancy](multitenancy-aislamiento.md) a [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md))
> 7. La batería de tests **Given-When-Then** sobre el `TestStore`, sin base de datos. ([El TestStore](teststore.md) a [Given-When-Then](given-when-then.md))
>
> No hay conceptos nuevos: es **ensamblar** lo que ya dominas en un sistema coherente.

## El gran reveal: eso que construiste tiene nombre

Durante 32 secciones evitamos nombrarla. Pero cada pieza que sufriste a mano —el `AggregateRoot` que acumula, el `IEventStore`, el `UnitOfWorkMiddleware`, los `IPublicEvent`, el `ITenantResolver`, el `TestStore`— **es**, casi línea por línea, la plantilla del equipo: **`Cosmos.BuildingBlocks`**.

| Lo que construiste a mano | En `Cosmos.BuildingBlocks` |
|---|---|
| `AggregateRoot` (acumula + `Apply(T)` + `Version`) | `Cosmos.EventSourcing.Abstractions` |
| `IEventStore` + `MartenEventStore` + `MartenUnitOfWork` + `UnitOfWorkMiddleware` | `Cosmos.EventSourcing.CritterStack` |
| eventos `record` + `IEvent`/`IPublicEvent`/`IPrivateEvent` | `Cosmos.EventDriven.Abstractions` |
| senders + el sobre + RabbitMQ/ASB | `Cosmos.EventDriven.CritterStack(.RabbitMQ/.AzureServiceBus)` |
| `ITenantResolver` + `TrustedHeaders`/`ProxyTenantResolver` | `Cosmos.MultiTenancy(.AspNetCore/.CritterStack)` |
| `TestStore` + `CommandHandlerTestBase` (Given-When-Then) | `Cosmos.EventSourcing.Testing.Utilities` |
| el bloque `extension(...)` + el empaquetado NuGet | los `*Extensions.cs` + `Directory.Build.props` |

Por eso, cuando abras `Cosmos.BuildingBlocks`, no verás una caja negra: verás **tu propio motor**, hecho por el equipo. Lo puedes **leer**, **depurar** y **evolucionar** — y conoces las **[dos vertientes](dos-vertientes.md)** para decidir cuándo plegar una mejora de Marten/Wolverine a la capa propia o seguir el camino nativo.

## Las 7 preguntas que ahora sabes responder

1. ¿Por qué guardar el **diario** (eventos) y no la **foto** (estado)? ([El diario de una empresa](el-diario-de-una-empresa.md))
2. ¿Qué es `evolve`, `decide`, un Aggregate Root, un Event Store, un Unit of Work? ([Los primeros hechos](los-primeros-hechos.md) a [El almacén directo](el-almacen-directo.md))
3. ¿Cómo se mapea tu motor a **Marten** y **Wolverine**, y por qué el reveal fue 1:1? ([Revelar Marten](revelar-marten.md) a [Revelar Wolverine](revelar-wolverine.md))
4. ¿Por qué la plantilla usa su **capa propia** en vez de `FetchForWriting` nativo, y qué cuesta? ([Las dos vertientes](dos-vertientes.md))
5. ¿Cómo viaja un hecho **público** a otro servicio sin perderse (outbox/inbox)? ([Público vs privado](publico-vs-privado.md) a [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md))
6. ¿Cómo se aísla cada **tenant** y de dónde sale en HTTP vs en el daemon? ([Multi-tenancy](multitenancy-aislamiento.md) a [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md))
7. ¿Cómo se **prueba** todo esto sin base de datos? ([El TestStore](teststore.md) a [Given-When-Then](given-when-then.md))

## Hacia dónde seguir

- **Mantén la plantilla al día**: sigue la doc de Marten/Wolverine y traduce sus mejoras a la capa del equipo ([Las dos vertientes](dos-vertientes.md)). Recuerda los puntos donde la plantilla **diverge** (no usa `FetchForWriting`, no hace concurrencia optimista en escritura, los privados pueden ir a broker pese al README).
- **El taller de microservicios/EDA** profundiza el lado público (RabbitMQ/ASB, sagas, dead-letter) que aquí solo cruzaste.
- **El taller de DevOps** cubre el empaquetado/CI-CD ([Empaquetar como NuGet](nuget-empaquetado.md)), los entornos y el despliegue —incluido serverless ([Serverless (Azure Functions)](serverless-azure-functions.md))— a fondo.

> [!NOTE]
> 🌳 **Lo lograste.** Ningún recuadro te dio el motor: lo construiste tú, pieza a pieza, sintiendo cada dolor antes de cada solución. Por eso `Cosmos.BuildingBlocks` ya no es la librería misteriosa del equipo — es algo que entiendes por dentro y puedes sostener. Sigue construyendo.

---

## ✅ Compruébalo

- [ ] Armaste (o esbozaste) un bounded context de la `Empresa` integrando agregado + Marten + Wolverine + EDA + proyección + multi-tenancy + tests.
- [ ] Para cada pieza de `Cosmos.BuildingBlocks`, sabes **qué hace** y **a qué pieza tuya corresponde**.
- [ ] Respondes las **7 preguntas** sin titubear.
- [ ] Sabes cómo **mantener** la plantilla: las dos vertientes, las divergencias con la doc, y dónde profundizar (microservicios, DevOps).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Responde las 7 preguntas, y di a qué pieza de `Cosmos.BuildingBlocks` corresponde cada cosa que construiste.

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git commit --allow-empty -m "ES · Capstone" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El motor de Event Sourcing que construiste a mano —agregado acumulador, `IEventStore`/Marten, Wolverine + middleware, eventos públicos/privados con outbox, proyecciones, multi-tenancy y tests sin BD— **es** `Cosmos.BuildingBlocks`: ahora lo entiendes por dentro, conoces sus dos vertientes y sus divergencias, y estás listo para **sostenerlo y evolucionarlo**.

---

[⬅️ Volver: Empaquetar y publicar como NuGet](./nuget-empaquetado.md)

[🏠 Volver al inicio del taller](../README.md) · [🎓 Índice de la academia](../../README.md)
