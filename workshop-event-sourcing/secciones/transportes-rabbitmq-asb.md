# Transportes reales: RabbitMQ y Azure Service Bus

Tienes el concepto del outbox/inbox ([Outbox e Inbox](outbox-inbox.md)) y los senders ([Senders y el sobre](senders-y-sobre.md)). Falta el último tramo del lado público: conectar tus `IPublicEvent` a un **broker real** para que **otros servicios** los oigan. El equipo usa dos, según el despliegue: **RabbitMQ** (dockerizado) y **Azure Service Bus** (nube). El truco: tu dominio **no cambia** — solo se **configura** a dónde van los hechos públicos.

## 🎯 El Objetivo

Rutear tus eventos públicos a un broker (RabbitMQ o Azure Service Bus) con **outbox durable**, y suscribirte a los de otro servicio con **inbox durable** — solo configuración.

> [!NOTE]
> **Mini-glosario de mensajería** (vienes de Event Sourcing, no de brokers): un **broker** es un servidor de mensajes (RabbitMQ, Azure Service Bus); un **exchange** (RabbitMQ) o **topic** (ASB) es el "buzón" donde **publicas**; una **cola** (*queue*) es de donde un consumidor **lee**; **bind** = atar una cola a un exchange para que reciba sus mensajes; **AutoProvision** = que Wolverine **cree** esos buzones/colas si no existen (cómodo en dev).

## Levantar RabbitMQ (Docker)

Igual que encendiste Postgres en [Docker y PostgreSQL](docker-postgres.md), RabbitMQ se levanta en un contenedor. **Añade un segundo servicio** a tu `docker-compose.yml` (el de [Docker y PostgreSQL](docker-postgres.md), junto a `postgres:`):

```yaml
  rabbitmq:
    image: rabbitmq:4-management        # RabbitMQ 4.x + panel web de administración
    container_name: gestion_rabbitmq
    ports:
      - "5672:5672"                      # AMQP — por aquí habla tu app
      - "15672:15672"                    # panel web — http://localhost:15672 (usuario/clave: guest/guest)
```

Arráncalo (levanta el broker junto al Postgres que ya tenías):

```bash
docker compose up -d
```

Asómate al panel en **http://localhost:15672** (guest / guest): ahí verás, en vivo, los **exchanges** y **colas** que Wolverine cree con `AutoProvision`.

> [!NOTE]
> **¿De dónde sale la conexión `"rabbitmq"`?** El `UseRabbitMqUsingNamedConnection("rabbitmq")` de abajo no trae la URL escrita: la busca en tu configuración, en la sección `ConnectionStrings` (igual que el connection string de Postgres). En `appsettings.json`:
> ```json
> { "ConnectionStrings": { "rabbitmq": "amqp://guest:guest@localhost:5672" } }
> ```

## RabbitMQ: un exchange por servicio

El equipo envuelve la API de Wolverine en tres helpers (idioma/herramienta nueva — te los muestro). Los tres van **dentro del mismo `builder.UseWolverine(options => { … })` de [Revelar Wolverine](revelar-wolverine.md)**, junto al `IncludeAssembly`, el middleware y `AutoApplyTransactions`:

```csharp
// 1) conectar a RabbitMQ y dejar que Wolverine cree exchanges/colas
options.UseRabbitMqUsingNamedConnection("rabbitmq").AutoProvision();

// 2) publicar TODOS tus IPublicEvent a un exchange con el nombre de tu servicio (outbox durable)
options.Policies.UseDurableOutboxOnAllSendingEndpoints();
foreach (var tipo in contratos.GetTypes().Where(t => t.IsAssignableTo(typeof(IPublicEvent))))
    options.PublishMessage(tipo).ToRabbitExchange("gestion-empresas").UseDurableOutbox();

// 3) suscribirte a los eventos de OTRO servicio (inbox durable)
options.ListenToRabbitQueue("gestion-empresas.cola", c => c.BindExchange("facturacion")).UseDurableInbox();
```

Fíjate en la idea: **un exchange por servicio** (no por mensaje). Tu servicio publica todos sus hechos públicos a su exchange; quien quiera oírlos crea una **cola** y la **ata** (`BindExchange`) a ese exchange. El ruteo se descubre **por tipo**: el `foreach` escanea tu **ensamblado de contratos** (el proyecto/`.dll` donde viven tus eventos) y publica cada `IPublicEvent` que encuentre — los privados y los que no marcan nada ([Público vs privado](publico-vs-privado.md)) **no** salen.

> [!NOTE]
> **Para verlo dar la vuelta tú solo** (sin un segundo servicio): ata la cola a tu **propio** exchange — `ListenToRabbitQueue("gestion-empresas.cola", c => c.BindExchange("gestion-empresas"))`. Publica un `IPublicEvent`, y en el panel (**http://localhost:15672**) verás el exchange y la cola; tu propio handler de ese evento lo **consumirá**. (El ejemplo de arriba ata a `"facturacion"` para enseñar el caso real: suscribirte a **otro** servicio.)

> [!IMPORTANT]
> **La regla de oro: nada de EDA "in-memory".** Si publicas un `IPublicEvent` que **no tiene ruta** declarada a un broker, Wolverine no falla: lo manda a una **cola local en memoria**… y ahí muere (otro servicio nunca lo ve, y el `TenantId` del sobre **no se propaga**). Es un **bug silencioso**. Por eso siempre declara la ruta de tus eventos públicos — si marcaste algo `IPublicEvent`, dale su `ToRabbitExchange`/`ToAzureServiceBusTopic`.

## Azure Service Bus: topics

En la nube, el equipo usa Azure Service Bus. Mismo patrón, con *topics* en vez de exchanges:

```csharp
options.UseAzureServiceBus("AsbConnection");   // "AsbConnection" = conexión nombrada (de ConnectionStrings), igual que "rabbitmq"
options.PublishMessage<EmpresaSuspendida>().ToAzureServiceBusTopic("empresas").UseDurableOutbox();
```

> [!NOTE]
> ⚖️ **Una divergencia del README del equipo.** El README dice que los eventos **privados** se despachan "en memoria, local". Pero el código permite rutearlos a RabbitMQ igual que los públicos (`HabilitarOutboxParaEventosPrivados`). La verdad operativa: **el destino lo decide la configuración (qué rutas declaras), no el tipo del evento**. Un `IPrivateEvent` sin ruta a broker se queda local; con ruta, sale. Tenlo presente al mantener la plantilla: el README va por detrás del código.

> [!NOTE]
> 🌱 **Semilla — serverless cambia el envío ([Serverless (Azure Functions)](serverless-azure-functions.md)).** Todo esto asume un **host largo** con outbox durable. En **Azure Functions** (serverless) no hay un proceso que drene el outbox, así que se envía `SendInline()` (sin outbox) y se usan los gemelos `…ParaServerLess`. Ya lo tienes a fondo en [Serverless (Azure Functions)](serverless-azure-functions.md). *(Y este lado público es el puente al taller de microservicios/EDA.)*

---

## ✅ Compruébalo

- [ ] Levantaste RabbitMQ (`docker compose up -d`) y en **http://localhost:15672** (guest/guest) ves el exchange `gestion-empresas` y la cola atada que creó `AutoProvision`.
- [ ] Sabes rutear tus `IPublicEvent` a un **exchange** de RabbitMQ (un exchange por servicio) con `ToRabbitExchange` + `UseDurableOutbox`.
- [ ] Sabes **suscribirte** a otro servicio con `ListenToRabbitQueue` + `BindExchange` + `UseDurableInbox`.
- [ ] Sabes el equivalente en Azure Service Bus (`ToAzureServiceBusTopic` + `UseDurableOutbox`).
- [ ] Explicas la regla **"nada de EDA in-memory"**: un público sin ruta cae a cola local y se pierde (bug silencioso).
- [ ] Explicas por qué "privado vs público" no decide solo el destino: lo decide la **ruta** que declaras.

---

## 🧠 En una frase

Conectar tus hechos públicos a un broker es **solo configuración**: en **RabbitMQ**, publicar cada `IPublicEvent` a un **exchange por servicio** (`ToRabbitExchange` + `UseDurableOutbox`) y suscribirse con `ListenToRabbitQueue`/`BindExchange`/`UseDurableInbox`; en **Azure Service Bus**, lo mismo con *topics* — y la regla de oro es que **todo público tenga ruta**, porque sin ella Wolverine lo manda a una cola local y se pierde en silencio.

---

[⬅️ Volver: El proceso que se cae (Outbox/Inbox)](./outbox-inbox.md)

[➡️ Siguiente: Serverless — la plantilla en Azure Functions (complemento de despliegue)](./serverless-azure-functions.md)

> Si despliegas en contenedores (no serverless), puedes **saltar [Serverless (Azure Functions)](serverless-azure-functions.md)** e ir directo a [CQRS y proyecciones](./cqrs-proyecciones.md) — pero léela cuando toques Azure Functions.
