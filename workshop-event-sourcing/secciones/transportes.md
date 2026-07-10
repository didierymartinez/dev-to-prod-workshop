# Transportes reales: RabbitMQ y Azure Service Bus

Tienes el [sobre](el-sobre.md), el [outbox y el inbox](outbox-inbox.md). Falta el **cable**: por dónde viaja de verdad `EmpresaSuspendida` desde tu servicio hasta facturación, que corre en **otro proceso** y quizás en otra máquina. Ese cable es un **transporte**: un broker de mensajes. La plantilla soporta dos —**RabbitMQ** y **Azure Service Bus**— y elegir y configurar cada uno trae decisiones de criterio: quién crea las colas, y qué pasa cuando publicas un evento que **olvidaste** rutear.

## 🎯 El Objetivo

Conectar un transporte real (RabbitMQ y Azure Service Bus) para que un hecho publicado **salga del proceso** y llegue a otro servicio.

## 💥 El dolor: sin transporte, "publicar" no sale de casa

Hasta ahora el bus fue abstracto: el outbox guardaba el saliente, pero ¿saliente **hacia dónde**? Sin un transporte configurado, Wolverine no tiene a dónde mandar el hecho — y (esto es clave) **no falla**: lo deja en una cola **local, en memoria**, dentro de tu mismo proceso. Facturación nunca lo ve. El mensaje "se publicó"… a nadie.

## 🔧 Los dos transportes

### Paso 1 · Levanta RabbitMQ y conéctalo

Primero necesitas el broker corriendo. Añade el servicio a tu `docker-compose.yml` (junto al de Postgres de [Persistir a mano](persistir-a-mano.md)) y levántalo con `docker compose up -d`:

```yaml
  rabbitmq:
    image: rabbitmq:management      # incluye el panel de administración
    ports:
      - "5672:5672"     # el broker (AMQP)
      - "15672:15672"   # el panel web
```

El panel queda en `localhost:15672`, usuario/clave `guest`/`guest`.

> [!NOTE]
> 🆕 **Cómo rutea un broker.** Un mensaje entra por un **exchange** (el buzón de entrada del broker), que lo reparte hacia una o más **colas**, donde el mensaje espera hasta que alguien lo lee. El conjunto de exchanges y colas es la **topología**. Un servicio publica a su exchange; los consumidores leen de sus colas.

> 🛠️ **Inténtalo tú.** Conecta RabbitMQ por su connection string con nombre, y deja que Rabbit **cree su propia topología** (exchanges y colas) al arrancar.

> [!NOTE]
> 🆕 **Transporte, connection string con nombre y `AutoProvision`.** Un **transporte** es el broker por donde viajan los mensajes entre procesos. `rabbitConnectionStringName` no es la URL cruda: es el **nombre** de una entrada en tu `appsettings.json` (`"ConnectionStrings": { "rabbit": "amqp://guest:guest@localhost" }`), para no incrustar credenciales en el código. `AutoProvision()` le dice a Wolverine: si el exchange o la cola no existen en Rabbit, **créalos** al arrancar. Cómodo en desarrollo y donde el servicio es dueño de su topología: enciendes y funciona.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
opts.UseRabbitMqUsingNamedConnection(rabbitConnectionStringName)
    .AutoProvision();   // Rabbit crea exchanges/colas que faltan, al arrancar
```
</details>

> 🔍 **¿Lo lograste?** Con RabbitMQ arriba y el panel abierto (`localhost:15672`), suspende `emp-7` con el `curl` de [Revelar Wolverine](revelar-wolverine.md). En el panel ves aparecer el **exchange** de tu servicio y un mensaje pasando por él: el `EmpresaSuspendida` **salió del proceso**. Compáralo con antes de configurar el transporte, cuando el mensaje se quedaba en memoria y el panel no mostraba nada.

### Paso 2 · Azure Service Bus, que recibe su topología

En producción sobre Azure, el transporte es **Azure Service Bus** — y aquí el diseño se **invierte**: la topología (tópicos, suscripciones) **no** la crea el servicio, la declara **Terraform**. El servicio solo se conecta a lo que ya existe.

> 🛠️ **Inténtalo tú.** Conecta Azure Service Bus **sin** auto-provision, y apaga las *system queues*.

> [!NOTE]
> 🆕 **Momento-criterio — `SystemQueuesAreEnabled(false)`.** Por defecto Wolverine crea unas colas de sistema por nodo para el patrón **request/response** (mando un mensaje y **espero contestación**: la respuesta vuelve por esa cola). Un EDA es **pub/sub de una sola vía**: publicas un hecho y sigues, nadie te contesta — así que la cola de respuesta **sobra**. Y en ASB **sin** permisos de auto-provision, intentar crearla **rompía el arranque** de las variantes dockerizadas. La plantilla las apaga, y lo blinda con un test guardrail que verifica que **todos** los helpers de ASB las dejen en `false`. El contraste con Rabbit es la lección: Rabbit se arma solo (`AutoProvision`), ASB recibe su topología de afuera.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
opts.UseAzureServiceBus(serviceBusConnectionString)
    // Sin AutoProvision: la topología la declara Terraform, no el servicio.
    // EDA pub/sub es one-way: Wolverine no puede crear sus system/response
    // queues por-nodo, y no las necesita.
    .SystemQueuesAreEnabled(false);
```
</details>

> 🔍 **¿Lo lograste?** ASB vive en la nube, así que aquí no hay panel local que mirar: la comprobación es de **arranque**. Con la topología ya declarada por Terraform y `SystemQueuesAreEnabled(false)`, el host levanta limpio. Si las dejaras encendidas, al arrancar Wolverine intentaría **crear** su cola de sistema en ASB, no tendría permiso (la app no provisiona), y el host **fallaría con una excepción de permisos** — justo el bug que el `false` evita.

### Paso 3 · El evento huérfano y el validador que nació y murió

*(Este "paso" no trae código que escribir: es una decisión de criterio del historial de la plantilla — léela.)*

Aquí está el filo del criterio. El bucle de [Público vs privado](publico-privado.md) rutea los `IPublicEvent` que encuentra **en el ensamblado que escanea**. Pero un evento puede quedar **sin ruta**: si vive en otro ensamblado que el bucle no mira, si el servicio que lo publica no aplicó esa política de ruteo, o si marcaste privado uno que debía salir. Un `IPublicEvent` sin ruta **no explota**: cae a la cola local en memoria (`local://` = la cola del propio proceso, frente a una ruta **externa** que apunta al broker). Y por esa cola el `TenantId` **no viaja**: la cola en memoria se salta el pipeline de entrega donde Wolverine reinyecta el tenant en el sobre (ese mecanismo lo construyes en [El tenant viaja con el mensaje](el-tenant-viaja-con-el-mensaje.md); por ahora basta con que llega **nulo**). Así, los handlers que dependen del [sobre](el-sobre.md) fallan **en silencio**: el síntoma parece un bug del resolver de tenant cuando en realidad es **ruteo faltante**.

La plantilla intentó atrapar esto **en código**: un `EventoRoutingValidator` que, al arrancar, enumeraba todos los `IPublicEvent`/`IPrivateEvent` concretos y exigía que cada uno tuviera una ruta **externa** (no `local://`). Si faltaba, tiraba una excepción con la lista de huérfanos. Se añadió con esa intención… y **se retiró tres versiones después**.

> [!NOTE]
> 🆕 **Por qué se retiró (y qué lo reemplazó).** Rompía el arranque de los servicios **consumidores**. Un consumidor referencia el ensamblado de contratos de otro servicio solo para **manejar** sus eventos — no los publica. El validador los veía sin ruta de publicación y los marcaba como huérfanos, **obligando a declarar rutas falsas**. No había forma automática de distinguir "olvidé rutear mi evento" de "solo consumo el evento de otro". La conclusión con criterio: **el código no podía decidirlo**, así que la regla bajó de validador a **convención documentada** — *"nada de EDA en memoria"*— con el porqué escrito al lado. A veces mantener bien una librería es **quitar** un guardrail que estorba más de lo que protege.

---

### El Descubrimiento

Conectaste el cable real. **RabbitMQ** se arma solo (`AutoProvision`): el servicio es dueño de su topología. **Azure Service Bus** la recibe de **Terraform** y apaga las system queues (`SystemQueuesAreEnabled(false)`) porque en un pub/sub de una vía no se necesitan y romperían el arranque dockerizado. Y viste el filo: un evento **sin ruta** no falla — cae a una cola local donde el `TenantId` no viaja, y el fallo aparece disfrazado de otra cosa. La plantilla intentó blindarlo con un validador, lo retiró porque castigaba a los consumidores, y lo dejó como **regla documentada**. Ese arco —validar en código → el guardrail estorba → degradar a convención— **es** el criterio de mantenedor que persigue el taller.

> [!NOTE]
> 🌱 **Semilla — el hecho llega, ¿y luego?** El transporte entrega el hecho a un servicio consumidor. Un uso muy visible: **empujarlo a una pantalla en vivo** para que un operador vea la suspensión al instante, sin recargar. Eso se hace con una tecnología de push (SignalR) montada sobre una suscripción. Lo ves en [UI en vivo](ui-en-vivo.md).

---

## ✅ Compruébalo

- [ ] Configuraste RabbitMQ con `AutoProvision()` y explicas qué provisiona y cuándo conviene.
- [ ] Configuraste Azure Service Bus **sin** auto-provision y con `SystemQueuesAreEnabled(false)`, y explicas por qué.
- [ ] Explicas el **contraste**: Rabbit se arma solo; ASB recibe su topología de Terraform.
- [ ] Explicas por qué un evento **sin ruta** es un bug **silencioso** (cae a memoria, el `TenantId` no propaga).
- [ ] Cuentas el arco del `EventoRoutingValidator` (añadido → retirado → regla documentada) y por qué es una decisión de criterio.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué Rabbit usa `AutoProvision` y ASB no? ¿Por qué un evento sin ruta es peligroso justamente por **no** fallar? ¿Qué te enseña que la plantilla haya **retirado** un validador en vez de arreglarlo?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Transportes reales: RabbitMQ y Azure Service Bus" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Un **transporte** (RabbitMQ, que se arma solo con `AutoProvision`; o Azure Service Bus, que recibe su topología de Terraform y apaga las system queues) es el cable por donde el hecho sale del proceso — y un evento **sin ruta** no falla sino que cae a una cola local donde el `TenantId` no viaja, el bug silencioso que la plantilla intentó atrapar con un validador y terminó dejando como **regla documentada**.

---

[⬅️ Volver: Outbox e Inbox](./outbox-inbox.md)

[➡️ Siguiente: UI en vivo](./ui-en-vivo.md)
