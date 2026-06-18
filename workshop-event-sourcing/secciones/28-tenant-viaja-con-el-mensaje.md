# 28 · El tenant viaja con el mensaje

En §27 resolviste el tenant de un **header HTTP**. Pero no todo corre dentro de una petición HTTP: cuando Wolverine procesa un mensaje en **segundo plano** (un handler disparado por la cola — el worker del bus/outbox de §22), **no hay `HttpContext`** ni headers que leer. Y ese handler igual necesita saber de qué tenant es. ¿De dónde lo saca?

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

Pero el tenant **sí** llegó: en §21 lo metiste en el **sobre** (`DeliveryOptions { TenantId }`) al publicar. Wolverine lo propaga: del lado receptor, el `IMessageContext` del mensaje **trae** ese `TenantId`. Solo falta un resolver que lo lea **de ahí**.

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

Ahora **el mismo** código de dominio resuelve el tenant tanto en un endpoint HTTP como dentro del daemon — sin saber cuál es. El proxy decide **por presencia de `HttpContext`** (no con `try/catch`, para no ensuciar el log de observabilidad).

> [!NOTE]
> **El hilo del tenant, completo:** al **publicar** (§21) metes el `TenantId` en el sobre (`DeliveryOptions`); Wolverine lo **propaga** al `IMessageContext` del receptor; el `WolverineMessageContextTenantResolver` lo **lee**; y de ahí va a Marten al abrir la sesión por tenant (§26). El `UserId` viaja como un **header** del sobre (`user_id`), porque Wolverine propaga el `TenantId` de forma nativa pero el usuario no — es una extensión del equipo.

> [!NOTE]
> ⚖️ **Este módulo NO diverge de la doc.** A diferencia de la capa de event store (§19), aquí la plantilla usa los caminos **nativos** de Wolverine: `DeliveryOptions.TenantId` → `IMessageContext.TenantId`. Incluso cruzar a **otro** tenant dentro de un handler usa el `IMessageBus.InvokeForTenantAsync(tenantId, …)` documentado. Es `ITenantResolver` + `WolverineMessageContextTenantResolver` + `ProxyTenantResolver` + `AgregarTenantResolverHibrido()`, 1:1.

> [!NOTE]
> 🌱 **Semilla — propagación a través de fronteras asíncronas.** Lo que aprendiste aquí —que el contexto (tenant, usuario) debe **viajar** con el mensaje a través de HTTP → cola → worker, no solo existir en el request— es un patrón central de sistemas distribuidos. Reaparecerá en el taller de microservicios/EDA.

---

## ✅ Compruébalo

- [ ] Un resolver que lee el tenant/usuario del **contexto del mensaje** (Wolverine), para handlers sin HTTP.
- [ ] Un **proxy** `ITenantResolver` que elige la fuente según haya `HttpContext` (HTTP) o no (daemon), sin `try/catch`.
- [ ] Explicas el hilo completo: publicar mete el tenant en el **sobre** → Wolverine lo propaga → el resolver del daemon lo lee → Marten abre la sesión por tenant.
- [ ] Sabes que este módulo usa los caminos **nativos** de Wolverine (`DeliveryOptions.TenantId`/`IMessageContext.TenantId`), a diferencia de la capa de event store.

---

## 🧠 En una frase

Fuera de una petición HTTP (en el daemon) no hay headers, pero el tenant **viajó en el sobre** del mensaje (§21): Wolverine lo propaga al `IMessageContext`, un `WolverineMessageContextTenantResolver` lo lee, y un **proxy** elige —por presencia de `HttpContext`— entre ese resolver y el de headers, dando **una sola** `ITenantResolver` que sirve en HTTP y en segundo plano.

---

[⬅️ Volver: ¿De dónde sale el tenant?](./27-resolver-el-tenant.md)

[➡️ Siguiente: Probar sin base de datos (el TestStore)](./29-teststore.md)
