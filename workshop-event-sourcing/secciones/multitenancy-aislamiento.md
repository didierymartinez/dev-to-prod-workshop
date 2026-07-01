# ¿De quién son estos eventos? (de un cliente a muchos)

Tu almacén guarda streams con la llave = **id del agregado** ([El almacén por id](el-almacen-por-id.md)). Pero la plataforma sirve a **muchas** empresas-cliente, y los datos de una **no** deben mezclarse con los de otra. A cada cliente lo llamamos un **tenant**. Y aquí hay una trampa: ¿qué pasa si dos tenants tienen una empresa con el **mismo** id?

## 🎯 El Objetivo

**Aislar** los datos por tenant: que la llave del stream deje de ser solo el id.

## El dolor: dos clientes, el mismo id, historias que se pisan

```csharp
// el tenant "sinco" y el tenant "acme" registran, cada uno, su "emp-7"
store.StartStream(empresaDeSinco);   // id "emp-7"
store.StartStream(empresaDeAcme);    // id "emp-7" también
// 💥 al cargar "emp-7", ¿de quién es? Se pisaron: la llave (el id) no es única entre tenants
```

El `id` del agregado es único **dentro** de un cliente, pero **no** entre clientes. El aislamiento multi-tenant es una dimensión **ortogonal** al id: la llave real es **`(tenant, id)`**.

## 🔧 Refactor: la llave es (tenant, id)

> 🛠️ **Inténtalo tú.** Cambia la llave de tu almacén de `id` a la tupla `(tenantId, id)`, y pasa el `tenantId` a guardar/cargar. Comprueba que dos empresas con el mismo id, en tenants distintos, **no** se pisan.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class AlmacenMultiTenant
{
    private readonly Dictionary<(string Tenant, string Id), string> _streams = new();
    public int Total => _streams.Count;
    public void Guardar(string tenant, string id, string nombre) => _streams[(tenant, id)] = nombre;
    public string? Cargar(string tenant, string id) => _streams.GetValueOrDefault((tenant, id));
}
```
</details>

Dos empresas "emp-7" en `sinco` y `acme` ahora son **dos** streams distintos: la tupla `(tenant, id)` los separa.

> [!NOTE]
> ⚖️ **Tu tupla `(tenant, id)` es `TenancyStyle.Conjoined` de Marten.** No reimplementas esto: Marten ofrece multi-tenancy *conjoined* — todos los tenants comparten las **mismas tablas**, pero cada fila lleva una columna **`tenant_id`**, exactamente como tu tupla. Se activa con **dos líneas** en tu `AddMarten` ([Revelar Marten](revelar-marten.md)):
> ```csharp
> using JasperFx.MultiTenancy;   // ⚠️ TenancyStyle vive AQUÍ, no en JasperFx.Events
>
> options.Events.TenancyStyle = TenancyStyle.Conjoined;   // dentro del AddMarten(options => { … })
> options.Policies.AllDocumentsAreMultiTenanted();
> ```
> Y el tenant **no se pasa por parámetro** al guardar: se fija al **abrir la sesión** (`store.LightweightSession("sinco")`), y el aislamiento es transparente. (De **dónde** sale ese tenant para abrir la sesión correcta es lo de [Resolver el tenant](resolver-el-tenant.md) y [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md).)

> [!NOTE]
> 🌱 **Semilla — pero, ¿de dónde sale el `tenantId`?** Ahora mismo lo pasas a mano en cada llamada. Eso ensucia todo. En [Resolver el tenant](resolver-el-tenant.md) lo esconderás tras una mini-interfaz ("dime el tenant actual") y, en [El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md), harás que **viaje con el mensaje** cuando no haya una petición HTTP de por medio.

---

## 🔍 Comprueba

```csharp
var store = new AlmacenMultiTenant();
store.Guardar("sinco", "emp-7", "Constructora Andes");
store.Guardar("acme",  "emp-7", "Otra Empresa SA");   // mismo id, otro tenant

Console.WriteLine($"sinco/emp-7 → {store.Cargar("sinco", "emp-7")}");
Console.WriteLine($"acme/emp-7  → {store.Cargar("acme", "emp-7")}");
Console.WriteLine($"streams totales: {store.Total}");
```

> **¿Lo lograste?** Deberías ver `Constructora Andes`, `Otra Empresa SA`, y `streams totales: 2` — **no** 1. La misma `emp-7` coexiste en dos tenants sin pisarse, porque la llave es `(tenant, id)`.

---

## ✅ Compruébalo

- [ ] La llave de tu almacén es `(tenant, id)`, no solo `id`.
- [ ] Dos empresas con el mismo id en tenants distintos dan **dos** streams.
- [ ] Explicas por qué el id es único **dentro** de un tenant pero no entre tenants.
- [ ] Sabes que tu tupla `(tenant, id)` = `TenancyStyle.Conjoined` de Marten (tablas compartidas + columna `tenant_id`), y que el tenant se fija al **abrir la sesión**, no por parámetro.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué la llave de un agregado multi-tenant es `(tenant, id)` y no solo `id`?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Multi-tenancy" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Un sistema multi-cliente necesita una dimensión de aislamiento **ortogonal** al id: la llave real del stream es **`(tenant, id)`** (el id solo es único dentro de un tenant) — justo lo que Marten ofrece como `TenancyStyle.Conjoined` (tablas compartidas con columna `tenant_id`), fijando el tenant al abrir la sesión.

---

[⬅️ Volver: Versionado y upcasting](./versionado-upcasting.md)

[➡️ Siguiente: ¿De dónde sale el tenant? (resolverlo, no pedirlo)](./resolver-el-tenant.md)
