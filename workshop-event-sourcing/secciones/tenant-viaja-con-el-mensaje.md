# El tenant viaja con el mensaje

En [Resolver el tenant](resolver-el-tenant.md) resolviste el tenant de un **header HTTP**. Pero no todo corre dentro de una petición HTTP: cuando Wolverine procesa un mensaje en **segundo plano** (un handler disparado por la cola), **no hay `HttpContext`** ni headers que leer. Y ese handler igual necesita saber de qué tenant es. ¿De dónde lo saca?

## 🎯 El Objetivo

Que el tenant **viaje con el mensaje** y se resuelva del **sobre** cuando no hay request HTTP — con una sola abstracción que sirve en ambos mundos.

## El dolor: el daemon no tiene request

```csharp
// dentro de un handler disparado por la cola (no por HTTP):
public async Task Handle(EmpresaSuspendida e, ITenantResolver tenant)
{
    var t = tenant.TenantId;   // 💥 si el resolver lee de HttpContext, aquí NO hay → revienta
}
```

Pero el tenant **sí** puede llegar: cuando un evento se publica, se estampa en el **sobre** con `DeliveryOptions { TenantId }`, y Wolverine lo **propaga** — del lado receptor, el `IMessageContext` del mensaje **trae** ese `TenantId`. Solo falta un resolver que lo lea **de ahí**.

> [!NOTE]
> **Cómo se estampa al publicar (el otro extremo del hilo).** Para que el receptor tenga un `TenantId` que leer, quien **publica** debe ponerlo en el sobre. Ojo: en [Transportes](transportes-rabbitmq-asb.md) solo **configuraste el ruteo** (`PublishMessage(...).ToRabbitExchange(...)`), no escribiste ningún `PublishAsync` a mano; los eventos salen **planos** (sin tenant). Quien los estampa es el `WolverinePublicEventSender` de la plantilla, con `DeliveryOptions`. Si publicas a mano, hazlo así:
> ```csharp
> await bus.PublishAsync(evento, new DeliveryOptions { TenantId = tenant.TenantId }.WithHeader("user_id", tenant.UserId));
> ```
> Sin ese `DeliveryOptions.TenantId`, el `IMessageContext.TenantId` del receptor llega **`null`** y el resolver de abajo lanza.

> [!NOTE]
> 🆕 **`IMessageContext` —el contexto del mensaje que Wolverine está procesando ahora; hermano de `IMessageBus`, te da metadatos como el tenant y los headers—.** Donde `IMessageBus` ([Senders y el sobre](senders-y-sobre.md)) es para **publicar** mensajes, `IMessageContext` es para **leer** el que estás manejando: su `TenantId` y su `Envelope.Headers`. Lo inyecta **Wolverine** al correr el handler (lo pides como parámetro o en el constructor y aparece resuelto). Aquí lo usamos para recuperar el `TenantId` del sobre y el header `user_id` que se estampó al publicar (con `.WithHeader("user_id", …)`, como muestra la nota de arriba).

## 🔧 Refactor: un resolver del mensaje + un proxy

> 🛠️ **Inténtalo tú.** (1) Un segundo resolver que lea el tenant/usuario del **contexto del mensaje** (de Wolverine) en vez del HTTP. (2) Un **proxy** que, por una sola abstracción `ITenantResolver`, **elija** el resolver correcto según haya o no un `HttpContext`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// resolver para handlers del daemon: lee del sobre del mensaje (lo propaga Wolverine)
public class WolverineMessageContextTenantResolver(IMessageContext messageContext) : ITenantResolver
{
    public string TenantId => messageContext.TenantId
        ?? throw new InvalidOperationException("El mensaje no se publicó con DeliveryOptions.TenantId.");
    public string UserId => messageContext.Envelope?.Headers.GetValueOrDefault("user_id")
        ?? throw new InvalidOperationException("El mensaje no trae el header user_id.");
}

// proxy: una sola ITenantResolver, dos fuentes — elige por presencia de HttpContext
public class ProxyTenantResolver(IMessageContext messageContext, IHttpContextAccessor accessor) : ITenantResolver
{
    private readonly ITenantResolver _real = accessor.HttpContext is not null
        ? new TrustedHeadersTenantResolver(accessor)              // hay request HTTP → headers
        : new WolverineMessageContextTenantResolver(messageContext); // no → el sobre del mensaje
    public string TenantId => _real.TenantId;
    public string UserId   => _real.UserId;
}
```

Se registra el **híbrido** como `ITenantResolver`:

```csharp
services.AddHttpContextAccessor();
services.AddScoped<ITenantResolver, ProxyTenantResolver>();
```
</details>

Ahora **el mismo** código de dominio resuelve el tenant tanto en un endpoint HTTP como dentro del daemon — sin saber cuál es. El proxy decide **por presencia de `HttpContext`**, no con `try/catch`.

> [!NOTE]
> **El hilo del tenant, completo:** al **publicar** se mete el `TenantId` en el sobre (`DeliveryOptions`, como en la nota de arriba); Wolverine lo **propaga** al `IMessageContext` del receptor; el `WolverineMessageContextTenantResolver` lo **lee**; y de ahí va a Marten al abrir la sesión por tenant ([Multi-tenancy](multitenancy-aislamiento.md)). El `UserId` viaja como un **header** del sobre (`user_id`), porque Wolverine propaga el `TenantId` de forma nativa pero el usuario no — es una extensión del equipo.

> [!NOTE]
> ⚖️ **Este módulo NO diverge de la doc.** A diferencia de la capa de event store ([Las dos vertientes](dos-vertientes.md)), aquí la plantilla usa los caminos **nativos** de Wolverine: `DeliveryOptions.TenantId` → `IMessageContext.TenantId`. Incluso cruzar a **otro** tenant dentro de un handler usa el `IMessageBus.InvokeForTenantAsync(tenantId, …)` documentado. Es `ITenantResolver` + `WolverineMessageContextTenantResolver` + `ProxyTenantResolver` + `AgregarTenantResolverHibrido()`, 1:1.

> [!NOTE]
> 🌱 **Semilla — propagación a través de fronteras asíncronas.** Lo que aprendiste aquí —que el contexto (tenant, usuario) debe **viajar** con el mensaje a través de HTTP → cola → worker, no solo existir en el request— es un patrón central de sistemas distribuidos. Reaparecerá en el taller de microservicios/EDA.

---

## ✅ Compruébalo

- [ ] Un resolver que lee el tenant/usuario del **contexto del mensaje** (Wolverine), para handlers sin HTTP.
- [ ] Un **proxy** `ITenantResolver` que elige la fuente según haya `HttpContext` (HTTP) o no (daemon), sin `try/catch`.
- [ ] Explicas el hilo completo: publicar mete el tenant en el **sobre** → Wolverine lo propaga → el resolver del daemon lo lee → Marten abre la sesión por tenant.
- [ ] Sabes que este módulo usa los caminos **nativos** de Wolverine (`DeliveryOptions.TenantId`/`IMessageContext.TenantId`), a diferencia de la capa de event store.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Cuando no hay un HTTP request (un daemon de fondo), ¿cómo llega el tenant al handler?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El tenant viaja con el mensaje" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Fuera de una petición HTTP (en el daemon) no hay headers, pero el tenant **viajó en el sobre** del mensaje ([Senders y el sobre](senders-y-sobre.md)): Wolverine lo propaga al `IMessageContext`, un `WolverineMessageContextTenantResolver` lo lee, y un **proxy** elige —por presencia de `HttpContext`— entre ese resolver y el de headers, dando **una sola** `ITenantResolver` que sirve en HTTP y en segundo plano.

---

[⬅️ Volver: ¿De dónde sale el tenant?](./resolver-el-tenant.md)

[➡️ Siguiente: Probar sin base de datos (el TestStore)](./teststore.md)
