# ¿De dónde sale el tenant? Resuélvelo, no lo pidas

En [Multi-tenancy](multitenancy-aislamiento.md) la llave pasó a ser `(tenant, id)`, pero ahora **pasas el `tenantId` a mano** en cada `Guardar`/`Cargar`/comando. Eso ensucia **todas** las firmas y es fácil de olvidar (y olvidarlo = filtrar datos entre clientes). El tenant no debería ser un parámetro que arrastras: debería **resolverse** del contexto.

## 🎯 El Objetivo

Esconder el `tenantId` (y el usuario) tras una pequeña abstracción —"dime el tenant actual"— que se **resuelve** del borde de la petición, en vez de pasarlo por parámetro.

## El dolor: el parámetro `tenantId` por todas partes

```csharp
await store.GetAggregateRootAsync<Empresa>(tenantId, id, ct);   // tenantId aquí…
await sender.PublishAsync(tenantId, evento);                    // …y aquí. Ruido en cada firma, y un olvido filtra datos entre clientes.
```

La salida: una interfaz mínima que responde *"¿cuál es el tenant (y el usuario) de esta operación?"*. La inyectas donde la necesites y dejas de arrastrar el parámetro.

## 🔧 Refactor: un `ITenantResolver`

> 🛠️ **Inténtalo tú.** (1) Define `ITenantResolver` con `TenantId` y `UserId`. (2) Haz una implementación tonta **hardcoded** para empezar. (3) Luego una que lea el tenant/usuario de **headers HTTP confiables** (`X-Tenant-Id`, `X-User-Id`) — y que **lance** si faltan.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface ITenantResolver
{
    string TenantId { get; }
    string UserId { get; }
}

// lee de headers HTTP que un gateway de confianza ya estampó
public class TrustedHeadersTenantResolver(IHttpContextAccessor accessor) : ITenantResolver
{
    public string TenantId => Leer("X-Tenant-Id");
    public string UserId   => Leer("X-User-Id");

    private string Leer(string header)
    {
        var valor = accessor.HttpContext?.Request.Headers[header].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(valor))
            throw new InvalidOperationException($"Falta el header de contexto '{header}'.");
        return valor;
    }
}
```

Y se registra (con el `IHttpContextAccessor` que necesita):

```csharp
services.AddHttpContextAccessor();
services.AddScoped<ITenantResolver, TrustedHeadersTenantResolver>();
```
</details>

> [!NOTE]
> 🆕 **Estás en una app web (idioma nuevo).** Esto corre sobre el host web que montaste al revelar Wolverine ([Revelar Wolverine](revelar-wolverine.md)). Un **header HTTP** es un par clave-valor que acompaña a cada petición (metadatos como `X-Tenant-Id`, aparte del cuerpo). `IHttpContextAccessor` es el servicio de ASP.NET Core que, inyectado en cualquier clase, te entrega la petición en curso (`HttpContext?.Request.Headers`); se habilita con `services.AddHttpContextAccessor()`. Un **gateway** es el servicio que recibe el tráfico de internet **antes** que el tuyo (y que aquí ya autenticó y estampó esos headers).

> [!NOTE]
> **Header "confiable": la app no autentica, confía en quien va delante.** En la arquitectura del equipo, un **gateway** ya autenticó al usuario y **estampó** `X-Tenant-Id`/`X-User-Id` antes de que la petición llegue a tu servicio. Tu app los **lee** como verdad. Por eso, si faltan, **lanzas** (un error fuerte) en vez de asumir un default silencioso: un request sin tenant es un bug de infraestructura, no algo que adivinar.

> [!NOTE]
> ⚖️ **Esto es `ITenantResolver` + `TrustedHeadersTenantResolver` de la plantilla, 1:1.** Misma interfaz (`TenantId`/`UserId`), mismos headers (`X-Tenant-Id`/`X-User-Id`), mismo "lanzar si falta", mismo registro (`AgregarTenantResolverConHeadersConfiables()`). Y conecta con [Multi-tenancy](multitenancy-aislamiento.md): el `ITenantResolver.TenantId` es lo que se le pasa a Marten al abrir la sesión por tenant.

> [!NOTE]
> 🌱 **Semilla — ¿y si NO hay request HTTP?** Un proceso en segundo plano (el daemon que procesa una cola, [Outbox e Inbox](outbox-inbox.md)/[CQRS y proyecciones](cqrs-proyecciones.md)) no tiene `HttpContext` ni headers. ¿De dónde saca el tenant ahí? Lo resuelves en [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md): el tenant **viaja con el mensaje**, y un resolver distinto lo lee del sobre.

---

## ✅ Compruébalo

- [ ] Tienes `ITenantResolver { TenantId; UserId }` y dejaste de pasar `tenantId` por parámetro.
- [ ] Una implementación que lee `X-Tenant-Id`/`X-User-Id` de un header HTTP confiable y **lanza** si faltan.
- [ ] Se registra con `IHttpContextAccessor` + `AddScoped<ITenantResolver, …>`.
- [ ] Explicas qué es un header **confiable** (un gateway lo estampó tras autenticar) y por qué lanzar es mejor que un default.
- [ ] Sabes que el `TenantId` resuelto es lo que abre la sesión por tenant en Marten ([Multi-tenancy](multitenancy-aislamiento.md)).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el tenant se RESUELVE de un header confiable y no se pide como parámetro?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Resolver el tenant" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El tenant no se **pasa** por parámetro, se **resuelve** del contexto: una interfaz `ITenantResolver { TenantId; UserId }` —con una implementación que lee headers HTTP **confiables** (`X-Tenant-Id`/`X-User-Id`) estampados por un gateway, y **lanza** si faltan— que inyectas donde haga falta; es el `ITenantResolver`/`TrustedHeadersTenantResolver` de la plantilla.

---

[⬅️ Volver: Multi-tenancy (aislamiento)](./multitenancy-aislamiento.md)

[➡️ Siguiente: El tenant viaja con el mensaje](./tenant-viaja-con-el-mensaje.md)
