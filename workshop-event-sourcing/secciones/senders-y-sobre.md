# Quién se lleva los hechos: senders y el sobre

En [Público vs privado](publico-vs-privado.md) marcaste qué hechos son públicos y cuáles privados, y el agregado los **separa** (`GetPublicEvents`/`GetPrivateEvents`). Pero separarlos no es enviarlos. ¿**Quién** se lleva los públicos al mundo, y los privados al bus interno? Y cuando llegan al otro lado, ¿cómo sabe el receptor **de quién** y de **qué empresa-cliente** vienen, sin que ensuciemos el evento con esos datos?

## 🎯 El Objetivo

Dos **enviadores** —uno para hechos públicos, otro para privados— y un **sobre** que lleva los metadatos de contexto (tenant, usuario) **sin tocar** el evento.

## El dolor: el evento es limpio; el contexto, ¿dónde va?

Tu `EmpresaSuspendida(string Motivo)` es un contrato limpio: solo el motivo. Pero el servicio que lo recibe necesita saber **de qué empresa-cliente (tenant)** y **qué usuario** lo originó. Si metes `TenantId`/`UserId` dentro del `record`, ensucias el contrato público y lo acoplas a tu infraestructura. La salida: envolver el evento en un **sobre** (*envelope*) que lleva esos metadatos **por fuera** — el evento viaja **dentro**, intacto.

## 🔧 Los dos enviadores

> 🛠️ **Inténtalo tú.** Define `IPublicEventSender` y `IPrivateEventSender`, cada uno con `PublishAsync(params I…Event[])` y una sobrecarga `PublishAsync(string groupId, params I…Event[])`. Y escribe un enviador **en memoria** que solo **acumule** lo enviado (llámalo `TestPublicEventSender`: te sirve para inspeccionar ahora y es el **doble de test** que reusarás tal cual en [Given-When-Then](given-when-then.md)).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IPublicEventSender
{
    Task PublishAsync(params IPublicEvent[] eventos);
    Task PublishAsync(string groupId, params IPublicEvent[] eventos);   // groupId = orden FIFO por grupo
}
public interface IPrivateEventSender
{
    Task PublishAsync(params IPrivateEvent[] eventos);
    Task PublishAsync(string groupId, params IPrivateEvent[] eventos);
}

// en memoria: acumula lo enviado (para inspeccionar / para tests)
public class TestPublicEventSender : IPublicEventSender
{
    private readonly List<IPublicEvent> _enviados = new();
    public IReadOnlyList<IPublicEvent> Enviados => _enviados.AsReadOnly();
    public Task PublishAsync(params IPublicEvent[] eventos)               { _enviados.AddRange(eventos); return Task.CompletedTask; }
    public Task PublishAsync(string groupId, params IPublicEvent[] eventos) { _enviados.AddRange(eventos); return Task.CompletedTask; }
}
```
</details>

> [!NOTE]
> **¿Por qué DOS enviadores y no uno?** Porque van por **caminos distintos**: los públicos salen a un **broker externo** (RabbitMQ, Azure Service Bus) para que otros servicios los oigan; los privados viajan por un **bus interno** del mismo servicio. Separarlos en `GetPublicEvents`/`GetPrivateEvents` ([Público vs privado](publico-vs-privado.md)) y en dos senders deja esa decisión explícita. Y el `groupId` pide **orden FIFO** dentro de un grupo (p. ej. todos los hechos de `emp-7` en orden), cuando importa.

## 🔧 El sobre: metadatos sin ensuciar el evento

> 🛠️ **Inténtalo tú.** Modela un `Sobre` que envuelva el evento con sus metadatos de contexto: el `Payload` (el evento), el `TenantId`, el `UserId` y un `GroupId` opcional.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public record Sobre(object Payload, string TenantId, string? UserId = null, string? GroupId = null);
```
</details>

El evento sigue limpio; el contexto viaja en el sobre. Al publicar, se **estampa** el tenant/usuario actual en el sobre — y se **re-lee** en cada publicación (porque una cadena de handlers podría cambiar de contexto).

> [!NOTE]
> 🌱 **Semilla — tu `Sobre` es el `DeliveryOptions` de Wolverine.** Cuando reveles los transportes ([Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md)), no construirás el sobre a mano: Wolverine trae `DeliveryOptions { TenantId, GroupId }` y un `.WithHeader("user_id", …)`. La capa del equipo centraliza eso en un helper (`TenancyDelivery.Build`) y sus enviadores reales —`WolverinePublicEventSender`/`WolverinePrivateEventSender`— publican con `IMessageBus.PublishAsync(evento, sobre)`. *De dónde sale el tenant/usuario* lo **resuelve** un `ITenantResolver` (que los senders reciben inyectado); lo construirás en [Resolver el tenant](resolver-el-tenant.md) a [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md).

---

## 🔍 Comprueba

```csharp
var emp = Empresa.Registrar("emp-7", "Constructora Andes", "Básico");
emp.Suspender("falta de pago");

var sender = new TestPublicEventSender();
await sender.PublishAsync("grupo-emp-7", emp.GetPublicEvents());
Console.WriteLine($"enviados al bus público: {sender.Enviados.Count} " +
                  $"({string.Join(",", sender.Enviados.Select(e => e.GetType().Name))})");
```

> **¿Lo lograste?** Deberías ver:
> ```
> enviados al bus público: 1 (EmpresaSuspendida)
> ```
> El agregado separó el hecho público ([Público vs privado](publico-vs-privado.md)) y el sender lo publicó; el `groupId` pidió orden para ese stream. El `EmpresaRegistrada` (no público) no salió.

---

## ✅ Compruébalo

- [ ] Tienes `IPublicEventSender`/`IPrivateEventSender` con `PublishAsync(params …)` y la sobrecarga con `groupId`.
- [ ] Un `TestPublicEventSender` que acumula lo enviado (lo reusarás en tests, [Given-When-Then](given-when-then.md)).
- [ ] Un `Sobre` que lleva `Payload` + `TenantId`/`UserId`/`GroupId`, dejando el evento limpio.
- [ ] Explica por qué hay **dos** senders (público→broker externo, privado→bus interno) y para qué el `groupId`.
- [ ] Explica por qué los metadatos van en el **sobre** y no dentro del evento.

---

## 📓 Registra tu avance

```bash
git add . && git commit -m "ES · Senders y el sobre" \
  -m "Con mis palabras: además del evento, ¿qué viaja en el sobre (DeliveryOptions)? ¿Por qué el TenantId y el user_id?"
git push
```

---

## 🧠 En una frase

Los hechos que salen los llevan **dos enviadores** (`IPublicEventSender`/`IPrivateEventSender`, por caminos distintos: broker externo vs bus interno, con `groupId` para orden FIFO), y los **metadatos de contexto** (tenant, usuario) viajan en un **sobre** que envuelve el evento sin ensuciarlo — el `DeliveryOptions` de Wolverine que revelarás en [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md).

---

[⬅️ Volver: Dos tipos de hecho (público vs privado)](./publico-vs-privado.md)

[➡️ Siguiente: El proceso que se cae (Outbox/Inbox)](./outbox-inbox.md)
