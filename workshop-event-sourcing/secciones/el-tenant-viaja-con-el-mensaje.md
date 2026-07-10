# El tenant viaja con el mensaje

[¿De dónde sale el tenant?](de-donde-sale-el-tenant.md) lo resolvió de un header HTTP. Pero el **daemon** que corre los handlers no atiende peticiones: no hay dónde leer ese header. Y sin embargo el tenant **sí llegó** — en el [sobre](el-sobre.md) del mensaje.

## 🎯 El Objetivo

Resolver el tenant fuera de HTTP leyéndolo del **sobre del mensaje**, y que un **mismo** `ITenantResolver` sirva tanto si atiende HTTP como si corre en el daemon.

## 💥 El dolor: el handler del daemon no tiene HttpContext

El handler que corre en el daemon necesita el tenant para abrir la sesión de Marten en el cliente correcto. `TrustedHeadersTenantResolver` no sirve ahí: no hay petición HTTP. Pero el tenant **viajó** en el sobre (lo pusiste en [El sobre](el-sobre.md)). Necesitas un resolver que lo lea **del mensaje** — y que el código que inyecta `ITenantResolver` no tenga que saber si está atendiendo HTTP o drenando una cola.

## 🔧 Leer el tenant del sobre

### Paso 1 · El resolver de mensajería

Cierra el círculo de [El sobre](el-sobre.md): lo que **estampaste**, ahora lo **lees**.

> 🛠️ **Inténtalo tú.** Implementa `WolverineMessageContextTenantResolver`: lee el `TenantId` de `IMessageContext` y el `user_id` del header del `Envelope`, y **lanza** si faltan.

> [!NOTE]
> 🆕 **`IMessageContext.TenantId` cierra el sobre.** En [El sobre](el-sobre.md) estampaste `DeliveryOptions.TenantId`; Wolverine lo propaga **nativo** hasta el receptor, donde reaparece como `IMessageContext.TenantId`. El `user_id`, que mandaste como **header**, se lee del `Envelope`. Ambos se leen fallando ruidoso si faltan.

> [!NOTE]
> 🆕 **El `Envelope`.** Es el sobre **físico** que Wolverine adjunta a cada mensaje: lleva la metadata de entrega, incluidos los `Headers` donde viaja el `user_id`. Se accede con `?` (`ctx.Envelope?`) porque **fuera** de un mensaje en curso puede no haberlo; si falta el header, el `GetValueOrDefault` devuelve `null` y caes en la excepción de "sin header".

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Wolverine;

public class WolverineMessageContextTenantResolver(IMessageContext ctx) : ITenantResolver
{
    public string TenantId =>
        !string.IsNullOrWhiteSpace(ctx.TenantId)
            ? ctx.TenantId
            : throw new InvalidOperationException("El mensaje llegó sin TenantId en el sobre.");

    public string UserId
    {
        get
        {
            var u = ctx.Envelope?.Headers.GetValueOrDefault(TenancyHeaders.UserId);
            return !string.IsNullOrWhiteSpace(u)
                ? u
                : throw new InvalidOperationException("El mensaje llegó sin header user_id.");
        }
    }
}
```
</details>

### Paso 2 · Un resolver que se adapta: `ProxyTenantResolver`

Quieres inyectar **un** `ITenantResolver` en todas partes y que él decida de dónde leer.

> 🛠️ **Inténtalo tú.** Escribe `ProxyTenantResolver`: si hay `HttpContext`, usa el de headers; si no, el de mensajería.

> [!NOTE]
> 🆕 **`IMessageContext` se inyecta por constructor.** Wolverine registra `IMessageContext` en el contenedor (scoped): puedes pedirlo por el constructor, y te da el del **mensaje en curso**. El proxy lo pide **siempre**, también en una petición HTTP donde no hay mensaje — y es seguro: ahí `HttpContext` no es null, el proxy construye el resolver de headers y **nunca lee** ese `ctx`. Existe, pero no se toca.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Microsoft.AspNetCore.Http;
using Wolverine;

public class ProxyTenantResolver(IMessageContext ctx, IHttpContextAccessor accessor) : ITenantResolver
{
    private readonly ITenantResolver _inner = accessor.HttpContext is not null
        ? new TrustedHeadersTenantResolver(accessor)
        : new WolverineMessageContextTenantResolver(ctx);

    public string TenantId => _inner.TenantId;
    public string UserId => _inner.UserId;
}
```
</details>

> [!NOTE]
> 🆕 **Momento-criterio — proxy, no cadena.** Un intento anterior de la plantilla (`CompositeTenantResolver`) encadenaba varios resolvers con *fallbacks*: probaba uno, si fallaba probaba el siguiente. Se reemplazó por este **proxy**, que decide con **una sola condición** (¿hay `HttpContext`?). El fallback encadenado ensuciaba los logs con excepciones "esperadas" de los intentos fallidos; la pregunta directa no los ensucia.

### Paso 3 · Cablea el proxy

El proxy no sirve hasta que el contenedor lo entregue **como** el `ITenantResolver`. En [¿De dónde sale el tenant?](de-donde-sale-el-tenant.md) registraste el de headers; ahora registras el proxy en su lugar.

> 🛠️ **Inténtalo tú.** **🔁** Cambia el registro para que `ITenantResolver` resuelva al `ProxyTenantResolver` (el de headers pasa a ser una dependencia interna suya).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantResolver, ProxyTenantResolver>();   // 🔁 antes: TrustedHeadersTenantResolver
```
</details>

> [!NOTE]
> 🆕 **La librería lo empaqueta.** En `Cosmos.BuildingBlocks` este registro vive en una extensión, `AgregarTenantResolverHibrido()`, que hace exactamente esto: registra el proxy como el `ITenantResolver` público. Ahora todo el código —endpoints y handlers del daemon— inyecta `ITenantResolver` y obtiene el tenant correcto según dónde corra, sin cambiar una línea.

> 🔍 **¿Lo lograste?** Dos comprobaciones. (1) **Ya observable:** repite el `curl -H "X-Tenant-Id: cliente-acme" …` de la sección anterior — sigue funcionando, porque el proxy ve el `HttpContext` y elige el resolver de headers. (2) **La ruta de mensajería no se ejercita aquí** —esta sección solo corre la ruta HTTP; el resolver de mensajería es una pieza de la plantilla que aún no tiene un consumidor montado—. Así se verificará cuando montes un handler en el daemon: un mensaje publicado con `TenantId = "cliente-acme"` en el sobre hace que, dentro del handler, `ITenantResolver.TenantId` → `"cliente-acme"` (vía el proxy → mensajería); abres la sesión con él y el evento cae en acme — verificable en la columna `tenant_id` de `mt_events`.

> [!NOTE]
> **Caso avanzado — `InvokeForTenantAsync`.** Es una extensión de Wolverine con la que un handler invoca a otro **fijando** un tenant distinto en el sobre interno. Como el proxy lee el sobre **actual**, el handler interno ve ese tenant nuevo, no el del externo. Es una garantía que te evitará un bug el día que encadenes handlers entre tenants; por ahora, basta saber que el proxy siempre resuelve del mensaje en curso.

---

### El Descubrimiento

Cerraste el círculo del tenant. `WolverineMessageContextTenantResolver` lee del sobre lo que estampaste en [El sobre](el-sobre.md) (`IMessageContext.TenantId` nativo + header `user_id`); `ProxyTenantResolver` elige, por presencia de `HttpContext`, entre ese y el de headers, y lo registras como el `ITenantResolver` público. Así **un solo** contrato sirve en HTTP y en el daemon, y el código que lo inyecta nunca sabe cuál está detrás. El tenant viaja ahora de punta a punta: del header HTTP, al sobre del mensaje, a la columna `tenant_id` de Postgres.

> [!NOTE]
> 🌱 **Semilla — el norte, por fin.** Ya viste **todas** las piezas nativas: event sourcing a mano, Marten, proyecciones, el daemon, Wolverine, EDA, y ahora multi-tenancy. Con eso en la mano, la última pregunta del taller: ¿por qué el equipo envolvió todo esto detrás de **abstracciones propias** (`AggregateRoot`, `IEventStore`, `ITenantResolver`…) en vez de usar Marten y Wolverine crudos? Y el capstone: aplicar `FetchForWriting` a la librería real, **con criterio**. Empieza en [Las dos vertientes](las-dos-vertientes.md).

---

## ✅ Compruébalo

- [ ] `WolverineMessageContextTenantResolver` lee `IMessageContext.TenantId` y el header `user_id` del `Envelope`, y lanza si faltan.
- [ ] Explicas cómo esto **cierra** lo que estampaste en El sobre (nativo el tenant, header el usuario).
- [ ] `ProxyTenantResolver` elige por presencia de `HttpContext`, y lo **registraste** como el `ITenantResolver` público (`AgregarTenantResolverHibrido`).
- [ ] Explicas por qué es seguro que el proxy pida `IMessageContext` aun en una petición HTTP.
- [ ] Explicas por qué un **proxy** (una condición) es mejor que una **cadena** de fallbacks (logs sucios).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Cómo llega el tenant a un handler que corre en el daemon, sin HttpContext? ¿Qué gana el proxy frente a una cadena de resolvers con fallbacks?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El tenant viaja con el mensaje" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`WolverineMessageContextTenantResolver` lee del sobre lo que estampaste en El sobre (`IMessageContext.TenantId` nativo + header `user_id`), y `ProxyTenantResolver` —registrado como el `ITenantResolver` público— elige por presencia de `HttpContext` entre ese y el de headers, para que **un solo** contrato sirva en HTTP y en el daemon: el tenant viaja de punta a punta, del header a la columna `tenant_id`.

---

[⬅️ Volver: ¿De dónde sale el tenant?](./de-donde-sale-el-tenant.md)

[➡️ Siguiente: Las dos vertientes](./las-dos-vertientes.md)
