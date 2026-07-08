# De un cliente a muchos: aislar los datos por tenant

El [sobre](el-sobre.md) viene cargando un `TenantId`, y [Serverless](serverless.md) cerró preguntando qué es un cliente. Aquí lo respondes. Hoy tu almacén tiene **una** base para todos: `emp-7` es `emp-7`, global. Pero la plataforma es **multi-cliente**: `cliente-acme` y `cliente-globex` pueden tener cada uno **su** `emp-7`, y ninguno debe ver jamás los datos del otro. El cliente —el **tenant**— tiene que volverse parte de la llave.

## 🎯 El Objetivo

Que Marten **aísle** los datos por cliente: la llave pasa de `id` a `(tenant, id)`, en una sola base.

## 💥 El dolor: una sola base mezcla a todos los clientes

`AggregateStreamAsync<Empresa>("emp-7")` trae LA emp-7, la única que hay. Si dos clientes tienen su propia emp-7, sus eventos caen en el **mismo** stream y se contaminan: acme termina viendo hechos de globex. Podrías darle una base a cada cliente, pero con miles de clientes son miles de bases que crear, migrar y operar. Necesitas que "emp-7" signifique "emp-7 **de acme**" **dentro** de una sola base.

## 🔧 Multi-tenancy Conjoined

### Paso 1 · Marca todo como multi-tenant

> 🛠️ **Inténtalo tú.** En tu `AddMarten`, di que los **eventos** y los **documentos** (proyecciones) son multi-tenant estilo *conjoined*.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using JasperFx.MultiTenancy;   // TenancyStyle

opts.Events.TenancyStyle = TenancyStyle.Conjoined;   // el tenant entra en la llave de los eventos
opts.Policies.AllDocumentsAreMultiTenanted();        // …y en la de todos los documentos (proyecciones)
```
</details>

> [!NOTE]
> 🆕 **`TenancyStyle.Conjoined`.** Todos los tenants comparten el **mismo esquema y las mismas tablas**; Marten agrega una columna `tenant_id` y la mete en la llave. "Conjoined" = conviven en una base, discriminados por esa columna. La alternativa —una base o esquema por tenant— da aislamiento **físico** pero multiplica la operación. (Gotcha: `TenancyStyle` vive en `JasperFx.MultiTenancy`, no en un namespace de Marten.)

### Paso 2 · Abre la sesión CON el tenant

La llave dejó de ser `id`; ahora es `(tenant, id)`. Por eso ya no abres una sesión "a secas": la abres **para un tenant**, y todo lo que leas o escribas en ella queda marcado con él.

> 🛠️ **Inténtalo tú.** **🔁** Abre la sesión pasándole el tenant.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
await using var session = store.LightweightSession("cliente-acme");   // escribe como acme
await using var qs = store.QuerySession("cliente-acme");              // lee solo lo de acme
```
</details>

> [!NOTE]
> 🆕 **Sesión por tenant.** `LightweightSession(tenantId)` / `QuerySession(tenantId)`: Marten estampa el tenant en cada escritura y filtra cada lectura por él. No pones `WHERE tenant_id = …` a mano — la sesión lo hace. Aquí el tenant `"cliente-acme"` es un **literal**.

### Paso 3 · Compruébalo: dos clientes, misma id, streams distintos

> [!NOTE]
> **Ojo — esto cambia el esquema.** Activar Conjoined agrega la columna `tenant_id` a `mt_events` y a los documentos. Parte de una **base limpia** (o deja que Marten recree el esquema): tus datos viejos de `emp-7` sin tenant no aparecerán bajo ningún cliente, y está bien. Esa es la "migración" del trade-off — en el taller se resuelve recreando el esquema, no a mano.

> 🔍 **¿Lo lograste?** Con Postgres arriba, siembra la misma id en un solo tenant y comprueba que el otro no la ve (reusa el arnés de [Tests de integración](tests-de-integracion.md)):
>
> ```csharp
> // sembrar emp-7 SOLO en cliente-acme
> await using (var s = store.LightweightSession("cliente-acme"))
> {
>     s.Events.StartStream<Empresa>("emp-7", new EmpresaRegistrada(/* … */));
>     await s.SaveChangesAsync();
> }
>
> // acme la ve; globex NO (nunca la creó): misma id, aislada por tenant
> await using var acme = store.QuerySession("cliente-acme");
> (await acme.Events.AggregateStreamAsync<Empresa>("emp-7")).Should().NotBeNull();
> await using var globex = store.QuerySession("cliente-globex");
> (await globex.Events.AggregateStreamAsync<Empresa>("emp-7")).Should().BeNull();
> ```
>
> La misma id, aislada por cliente. Y en `mt_events` verás la columna `tenant_id` discriminando los streams.

---

### El Descubrimiento

El tenant entró en la llave. `TenancyStyle.Conjoined` + `AllDocumentsAreMultiTenanted` hacen que Marten agregue una columna `tenant_id` a eventos y documentos, todo en **una** base; abres la sesión con el tenant y Marten aísla lecturas y escrituras solo. "emp-7 de acme" y "emp-7 de globex" son streams distintos. Es aislamiento **lógico**: una base compartida, no una pared física. Esa es la decisión con criterio: una migración en vez de mil, a cambio de que el código **siempre** abra la sesión con el tenant correcto.

> [!NOTE]
> 🌱 **Semilla — ¿de dónde sale "cliente-acme"?** Aquí lo pasaste a mano. En una petición HTTP real, ese "acme" tiene que salir de la petición misma —sin que el cliente pueda mentir y hacerse pasar por otro—. Ese es el **resolver del tenant**, y lo construyes en [¿De dónde sale el tenant?](de-donde-sale-el-tenant.md).

---

## ✅ Compruébalo

- [ ] Configuraste `opts.Events.TenancyStyle = TenancyStyle.Conjoined` y `opts.Policies.AllDocumentsAreMultiTenanted()`.
- [ ] Abres la sesión con el tenant (`LightweightSession(tenantId)` / `QuerySession(tenantId)`).
- [ ] Explicas qué significa *conjoined* (una base, columna `tenant_id` en la llave) frente a una base por tenant.
- [ ] Comprobaste el **aislamiento**: la misma id en dos tenants son dos historias distintas.
- [ ] Explicas el trade-off del aislamiento **lógico** (una migración vs. mil, a costa de disciplina del código).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué gana y qué cede *conjoined* frente a una base por cliente? ¿Por qué abrir la sesión con el tenant es lo que hace el aislamiento, y qué pasaría si un día olvidas pasarlo?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · De un cliente a muchos: aislar los datos por tenant" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`TenancyStyle.Conjoined` + `AllDocumentsAreMultiTenanted` meten una columna `tenant_id` en la llave de eventos y documentos, todo en **una** base; abres la sesión **con** el tenant (`LightweightSession(tenantId)`) y Marten aísla lecturas y escrituras solo — la misma id en dos clientes son dos historias distintas: aislamiento **lógico**, una migración en vez de mil.

---

[⬅️ Volver: Serverless](./serverless.md)

[➡️ Siguiente: ¿De dónde sale el tenant?](./de-donde-sale-el-tenant.md)
