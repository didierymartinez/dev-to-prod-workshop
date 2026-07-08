# ¿De dónde sale el tenant?

En [De un cliente a muchos](de-un-cliente-a-muchos.md) abriste la sesión con `"cliente-acme"` escrito a mano. En un servicio real, ¿de dónde sale ese "acme" en **cada** petición? No puedes creerle al cliente si lo pone en el cuerpo (mentiría, o se haría pasar por otro). Y no quieres que cada endpoint lo parsee a su manera. Necesitas un **solo lugar** que responda: "¿quién es el cliente —y el usuario— de esta petición?".

## 🎯 El Objetivo

Resolver el tenant y el usuario de una petición HTTP leyéndolos de **headers confiables** (`X-Tenant-Id` / `X-User-Id`) que pone un gateway, tras una interfaz `ITenantResolver`, y **fallar ruidoso** si faltan.

## 💥 El dolor: adivinar el tenant es una fuga de datos

Imagina que el tenant sale del **cuerpo** de la petición:

```csharp
app.MapPost("/empresas/{id}/suspender", (string id, SuspenderBody body) =>
{
    var tenant = body.TenantId;   // ← el cliente lo dice… y puede mentir
    // abre la sesión de acme aunque quien llama sea de globex
});
```

Cualquiera manda `{"tenantId":"cliente-acme"}` y toca datos de acme. Y si un día el dato **falta**, ¿adivinas un tenant por defecto? Adivinar mal significa **escribir en el cliente equivocado** — la peor falla de un sistema multi-cliente, y silenciosa. El tenant no puede venir de quien no es de fiar, ni resolverse distinto en cada endpoint.

## 🔧 El resolver del tenant

### Paso 1 · La costura: `ITenantResolver`

La caja negra `tenantResolver` de [El sobre](el-sobre.md), ahora real: un contrato con dos datos.

> 🛠️ **Inténtalo tú.** Define la interfaz que el resto del código pedirá para saber el cliente y el usuario actuales.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface ITenantResolver
{
    string TenantId { get; }
    string UserId { get; }
}
```
</details>

> [!NOTE]
> 🆕 **`ITenantResolver` = la costura del tenant.** Un solo contrato —"¿quién es el cliente y el usuario actuales?"— que el resto del código pide por inyección, **sin saber de dónde** sale la respuesta. ¿Por qué una interfaz si hoy habrá una sola implementación? Porque el tenant tiene **más de una fuente** según el contexto (una petición HTTP, o un mensaje del bus), y el consumidor no debe saber cuál lo resolvió. La costura te deja cambiar la fuente sin tocar a quien la usa.

### Paso 2 · Leer de headers confiables

> 🛠️ **Inténtalo tú.** Implementa `TrustedHeadersTenantResolver`: lee `X-Tenant-Id` / `X-User-Id` del `HttpContext` y **lanza** si el header falta o está vacío.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Microsoft.AspNetCore.Http;

public class TrustedHeadersTenantResolver(IHttpContextAccessor accessor) : ITenantResolver
{
    public string TenantId => Leer("X-Tenant-Id");
    public string UserId   => Leer("X-User-Id");

    private string Leer(string header)
    {
        var ctx = accessor.HttpContext
            ?? throw new InvalidOperationException("No hay HttpContext para resolver el tenant.");
        var valor = ctx.Request.Headers[header].FirstOrDefault();
        return string.IsNullOrWhiteSpace(valor)
            ? throw new InvalidOperationException($"Falta el header confiable '{header}'.")
            : valor;
    }
}

// registro:
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantResolver, TrustedHeadersTenantResolver>();
```
</details>

> [!NOTE]
> 🆕 **`IHttpContextAccessor`.** Da acceso a la petición HTTP en curso desde una clase que **no** es el endpoint. Necesitas `AddHttpContextAccessor()` para que exista. El resolver se registra **`Scoped`**: uno por petición, porque el tenant es de la petición.

> [!NOTE]
> 🆕 **Momento-criterio — headers confiables + fallar ruidoso.** Un **gateway** es un proceso que se planta **delante** de tu app: recibe la petición, autentica al usuario, y la reenvía con `X-Tenant-Id` / `X-User-Id` ya validados. (En el taller **lo simulas** poniendo esos headers a mano con `curl`; en producción los pone él.) Dos decisiones de criterio caen de ahí: (1) el tenant sale del gateway, **no** de parsear el token en tu app — separas la autenticación (gateway) de la tenancy (app), y por eso los headers son "confiables" (no los re-validas, confías en él). (2) Si el header **falta**, no adivinas un default: **lanzas**. Un default silencioso escribiría en el cliente equivocado — el peor bug de un multi-tenant.

### Paso 3 · Cablea el resolver: la sesión se abre con su tenant

El resolver no sirve de nada hasta que **alguien lo use**. En [De un cliente a muchos](de-un-cliente-a-muchos.md) abriste la sesión con el literal `"cliente-acme"`; ahora ese valor sale del resolver.

> 🛠️ **Inténtalo tú.** **🔁** En el endpoint, inyecta `ITenantResolver` y abre la sesión con **su** `TenantId` en vez del literal.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
app.MapPost("/empresas/{id}/suspender",
    async (string id, SuspenderBody body, IDocumentStore store, ITenantResolver tenant) =>
    {
        await using var session = store.LightweightSession(tenant.TenantId);   // el cliente actual
        // … abrir el stream, decidir, SaveChangesAsync (como en API + DI) …
        return Results.Ok();
    });
```
</details>

> [!NOTE]
> 🆕 **El resolver alimenta la sesión.** Dondequiera que tu código abra la sesión de Marten, ahora pasa `tenant.TenantId` en vez de un literal. Ese es el eslabón que faltaba: el header entra, el resolver lo lee, la sesión se abre en ese cliente. (Con Wolverine no lo cableas endpoint por endpoint: el router mete el tenant en el [sobre](el-sobre.md) y viaja solo — lo ves en la próxima sección.)

> 🔍 **¿Lo lograste?** `curl -H "X-Tenant-Id: cliente-acme" -H "X-User-Id: ana" -X POST .../empresas/emp-7/suspender`: la sesión se abre para acme y la suspensión cae en su tenant. Consulta `emp-7` como `cliente-globex` → **no** está suspendida (ni existe): quedó aislada en acme. El **mismo** curl **sin** `X-Tenant-Id` → `InvalidOperationException`, respuesta 500, **nada** escrito: falla ruidoso, no adivina un cliente.

---

### El Descubrimiento

Le pusiste nombre a la caja negra y **la conectaste**. `ITenantResolver` es la **costura**; `TrustedHeadersTenantResolver` la implementa leyendo headers que un gateway confiable ya validó, y **lanza** si faltan en vez de adivinar. Y la cableaste: la sesión de Marten se abre con `tenant.TenantId`, así que el header de la petición decide en qué cliente escribes. Confiar en el gateway y fallar ruidoso son criterio, no comodidad: separas la autenticación de la tenancy, y te blindas contra el peor bug multi-tenant — escribir en el cliente equivocado.

> [!NOTE]
> 🌱 **Semilla — ¿y cuando no hay petición HTTP?** `TrustedHeadersTenantResolver` necesita un `HttpContext`. Pero el **daemon** que drena el outbox y corre las suscripciones no atiende peticiones HTTP. Cuando un handler corre ahí, ¿de dónde saca el tenant? Del **sobre** del mensaje que le llegó. Lo resuelves en [El tenant viaja con el mensaje](el-tenant-viaja-con-el-mensaje.md).

---

## ✅ Compruébalo

- [ ] Definiste `ITenantResolver` (con `TenantId` y `UserId`) como costura, y explicas por qué interfaz.
- [ ] `TrustedHeadersTenantResolver` lee `X-Tenant-Id` / `X-User-Id` del `HttpContext` y **lanza** si faltan.
- [ ] Lo registraste `Scoped` con `AddHttpContextAccessor()`.
- [ ] **Cablaste** el resolver: la sesión de Marten se abre con `tenant.TenantId`, no con un literal.
- [ ] Explicas qué es un **gateway**, por qué los headers son "confiables", y por qué fallar ruidoso protege de una fuga entre clientes.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el tenant no puede salir del cuerpo de la petición? ¿Por qué es más seguro **lanzar** cuando falta el header que asumir un tenant por defecto?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · ¿De dónde sale el tenant?" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`ITenantResolver` es la costura "¿quién es el cliente y el usuario?"; `TrustedHeadersTenantResolver` la resuelve leyendo los headers `X-Tenant-Id` / `X-User-Id` que un **gateway** confiable ya validó, **lanza** si faltan, y su `TenantId` es lo que abre la sesión de Marten — porque un tenant equivocado es una fuga de datos entre clientes.

---

[⬅️ Volver: De un cliente a muchos](./de-un-cliente-a-muchos.md)

[➡️ Siguiente: El tenant viaja con el mensaje](./el-tenant-viaja-con-el-mensaje.md)
