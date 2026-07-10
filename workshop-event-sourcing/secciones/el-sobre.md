# El sobre: lo que viaja junto al hecho

En [Público vs privado](publico-privado.md) marcaste `EmpresaSuspendida` como pública: cruza a **facturación**. Pero el hecho llega solo, y del otro lado hace falta algo que el evento no dice: **contexto**. Ese contexto viaja en un **sobre** —el mismo que envolviste en [Concurrencia optimista](concurrencia-optimista.md) para la versión, ahora para la mensajería.

## 🎯 El Objetivo

Envolver cada hecho publicado en un **sobre** que lleve el **cliente** y el **usuario**, y ver que cada dato viaja por un camino distinto según lo que Wolverine ya sabe propagar.

## 💥 El dolor: el hecho solo no basta para el receptor

`EmpresaSuspendida("impago")` llega a facturación desnudo. Facturación no sabe **a qué cliente** pertenece emp-7 (corre para todos), ni **quién** hizo la suspensión (lo necesita para su propio registro). Meter esos datos **dentro** del evento sería un error: no son parte del hecho de negocio, y ensuciarían el contrato público con detalles de infraestructura. El contexto tiene que viajar **al lado** del hecho, no dentro.

## 🔧 El sobre: `DeliveryOptions`

> [!NOTE]
> **Antes de empezar — publicar a mano.** En [El handler por convención](handler-por-convencion.md) publicabas un hecho **devolviéndolo** (cascading): Wolverine lo mandaba solo, desnudo. Para **adjuntarle un sobre** necesitas publicar explícito: pides el bus (`IMessageBus`, el mismo de [Revelar Wolverine](revelar-wolverine.md)) y llamas `bus.PublishAsync(hecho, sobre)`. Es la forma de decir "publica esto **con** este contexto".

### Paso 1 · El cliente viaja en el sobre

> 🛠️ **Inténtalo tú.** Quieres publicar un hecho **con** el cliente pegado, y que el receptor lo lea sin desempacar el evento:
>
> ```csharp
> await bus.PublishAsync(hecho, sobre);   // sobre lleva el cliente
> // en el receptor: context.TenantId  →  "cliente-acme"
> ```
>
> Arma ese `sobre` (`DeliveryOptions`) con el `TenantId`. De dónde salen el cliente y el usuario actuales lo resuelve algo que ya los conoce — llámalo `tenantResolver` por ahora (sabe el cliente **y** el usuario).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Wolverine;   // DeliveryOptions, IMessageBus

var sobre = new DeliveryOptions { TenantId = tenantResolver.TenantId };
await bus.PublishAsync(hecho, sobre);
```
</details>

> [!NOTE]
> 🆕 **`DeliveryOptions` = el sobre del mensaje.** Es un objeto que acompaña al hecho al publicarlo y lleva **metadata de entrega**, no dato de dominio. `TenantId` es un **campo nativo** del sobre: Wolverine lo propaga solo hasta el receptor, donde reaparece como `IMessageContext.TenantId`. No lo pones como texto suelto; ocupa su casilla propia.

### Paso 2 · El usuario viaja como header

El `user_id` que en [Auditoría](auditoria.md) pusiste en la sesión de Marten (`SetHeader("user_id", …)`) ahora tiene que **acompañar al hecho** hasta el otro servicio. El sobre no tiene casilla nativa para el usuario, así que lo agregas como **header**.

> 🛠️ **Inténtalo tú.** **🔁** Al mismo sobre, agrégale el `user_id` como header con `.WithHeader(nombre, valor)`. Usa una constante para el nombre del header (no un string suelto repetido).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public static class TenancyHeaders
{
    public const string UserId = "user_id";   // mismo nombre que en Auditoría
    // El TenantId NO va aquí: Wolverine lo propaga nativo (DeliveryOptions.TenantId).
}

var sobre = new DeliveryOptions { TenantId = tenantResolver.TenantId }
    .WithHeader(TenancyHeaders.UserId, tenantResolver.UserId);

await bus.PublishAsync(hecho, sobre);
```
</details>

> [!NOTE]
> 🆕 **Dos caminos: nativo vs. header.** El `TenantId` viaja en su **casilla nativa** (`DeliveryOptions.TenantId`) porque Wolverine sabe propagarlo y enrutar por él. El `user_id` no tiene casilla nativa, así que viaja como **header** —un par nombre/valor libre en el sobre— igual que un encabezado HTTP. Es la misma idea del `user_id` que pegaste en la sesión de Marten en [Auditoría](auditoria.md): ahí quedaba en el evento guardado; aquí acompaña al mensaje en tránsito.

> [!NOTE]
> 🆕 **Momento-criterio — por qué `DeliveryOptions.TenantId` y no un método suelto.** Un intento anterior en la plantilla usó `WithTenantId(...)`, una extensión global de Wolverine — y **no** funcionó. `WithTenantId` opera sobre el **enrutamiento** del envío, pero **no escribe el `TenantId` en el sobre que viaja** hasta el receptor, así que del otro lado llegaba vacío. `DeliveryOptions.TenantId` sí lo estampa en el sobre. Saber *por qué* uno funciona y el otro no —dónde queda escrito el dato— es criterio de mantenedor, no un detalle.

### Paso 3 · Centralizar el sobre en un helper

Cada evento público que publiques repite el mismo armado: `TenantId` + `user_id`. Si mañana agregas un tercer dato al contexto, tendrías que tocarlo en cada `PublishAsync`. Extráelo a un solo lugar.

> 🛠️ **Inténtalo tú.** **🔁** Saca el armado del sobre a un helper `TenancyDelivery.Build(tenantResolver)` que devuelva el `DeliveryOptions` listo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
internal static class TenancyDelivery
{
    public static DeliveryOptions Build(ITenantResolver tenantResolver) =>
        new DeliveryOptions { TenantId = tenantResolver.TenantId }
            .WithHeader(TenancyHeaders.UserId, tenantResolver.UserId);
}

// ahora el sender solo dice:
await bus.PublishAsync(hecho, TenancyDelivery.Build(tenantResolver));
```
</details>

> [!NOTE]
> 🆕 **Un solo armador de sobres.** `TenancyDelivery.Build` es el único lugar que sabe qué lleva el sobre. Comandos, consultas y eventos lo usan igual, así no divergen en lo que propagan.

> 🔍 **¿Lo lograste?** Todavía no hay un servicio receptor cableado (llega con el [transporte](transportes.md)), así que la comprobación es **conceptual**: el sobre que arma `TenancyDelivery.Build` lleva el `TenantId` en su casilla nativa y el `user_id` en un header. Cuando exista el receptor, lo desempacará sin tocar el evento: `context.TenantId` → el cliente, y `context.Envelope.Headers["user_id"]` → el usuario. El hecho (`EmpresaSuspendida`) viaja **limpio**, con el contexto al lado.

---

### El Descubrimiento

Envolviste el hecho publicado en un **sobre** (`DeliveryOptions`) que lleva **contexto**, no dominio: el **cliente** (`TenantId`, en casilla nativa que Wolverine propaga) y el **usuario** (`user_id`, como header manual). Es el mismo patrón del sobre `EventoAlmacenado(Version, …)` de [Concurrencia optimista](concurrencia-optimista.md): un envoltorio con metadata alrededor del dato. Y reusa el `user_id` de [Auditoría](auditoria.md): lo que ahí quedó en el evento guardado, aquí acompaña al mensaje en vuelo. Y lo centralizaste en `TenancyDelivery.Build`, para que cada publicación arme el sobre igual.

> [!NOTE]
> 🌱 **Semilla — ¿de dónde sale el cliente?** Aquí `tenantResolver` fue una caja negra que "sabe" el cliente y el usuario actuales. ¿Quién lo sabe, y cómo? En una petición HTTP sale de un header (`X-Tenant-Id`); en el daemon que drena la cola, sale del propio sobre del mensaje que acaba de llegar. Eso es **multi-tenancy**, y el sobre que armaste aquí es justo el vehículo. Lo construyes en [De dónde sale el tenant](de-donde-sale-el-tenant.md).

---

## ✅ Compruébalo

- [ ] Publicas el hecho con `bus.PublishAsync(hecho, sobre)` y explicas por qué es explícito (para adjuntar el sobre), no por cascading.
- [ ] El `sobre` (`DeliveryOptions`) lleva `TenantId`.
- [ ] El `user_id` viaja como **header** (con una constante para el nombre), no como campo nativo.
- [ ] Explicas por qué `TenantId` va nativo (Wolverine lo propaga/rutea) y `user_id` va como header.
- [ ] Centralizaste el armado en `TenancyDelivery.Build` y explicas qué evita (que cada publish diverja).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el cliente y el usuario viajan en el sobre y no dentro del evento? ¿Qué diferencia hay entre el camino del `TenantId` y el del `user_id`, y por qué?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El sobre: lo que viaja junto al hecho" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Cada hecho publicado viaja en un **sobre** (`DeliveryOptions`) con **contexto** —el cliente en la casilla nativa `TenantId` (que Wolverine propaga) y el usuario como **header** `user_id` (el mismo de Auditoría)— armado en un solo lugar (`TenancyDelivery.Build`): el mismo patrón de sobre-con-metadata de [Concurrencia optimista](concurrencia-optimista.md), ahora para la mensajería.

---

[⬅️ Volver: Público vs privado](./publico-privado.md)

[➡️ Siguiente: Outbox e Inbox](./outbox-inbox.md)
