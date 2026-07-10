# La primera proyección: el lado de lectura (CQRS)

Rehidratar es perfecto para **una** empresa: pides su stream y Marten rejuega sus eventos. Pero *"¿cuáles empresas están suspendidas?"* pide el **otro lado** — y rehidratar no sirve para eso.

## 🎯 El Objetivo

Construir un **read model** —un documento que Marten actualiza con cada evento— y consultarlo con LINQ, rápido y sin rejugar nada.

## 💥 El dolor: preguntar a través de muchos agregados

`AggregateStreamAsync` reconstruye **un** agregado rejugando **sus** eventos. Para *"todas las suspendidas"* tendrías que hacer eso por **cada** empresa y filtrar en memoria. Con mil empresas, mil replays por consulta. Escribir eventos y leerlos eficientemente son dos problemas distintos. Separar el modelo de escritura del de lectura es **CQRS**.

## 🔧 La proyección: un documento por empresa

Una **proyección** escucha los eventos y mantiene un documento al día. Aquí, un `ResumenEmpresa` por empresa (su estado actual), que luego consultas como una tabla normal.

### Paso 1 · El read model y la proyección

> 🛠️ **Inténtalo tú.** (1) Un documento `ResumenEmpresa` (Id, Nombre, Plan, Suspendida). (2) Una proyección que lo **pliega** desde los eventos: hazla heredar de `SingleStreamProjection<ResumenEmpresa, string>` (marcada `partial`), con `Create` para el primer evento y `Apply(evento, doc)` para los demás. (3) Regístrala **inline** con `opts.Projections.Add<...>(ProjectionLifecycle.Inline)`.

> [!NOTE]
> 🆕 **`SingleStreamProjection<TDoc, TId>`.** Pliega los eventos de **un** stream en un documento `TDoc` (aquí `ResumenEmpresa`, con llave `string`). Es la **misma convención** que ya conoces: `Create` para el evento de nacimiento, `Apply` para los demás — pero ahora el `Apply` recibe también el `doc` a mutar (la proyección es aparte del agregado). Debe ser `partial`: Marten 9 le genera código por debajo.

> [!NOTE]
> 🆕 **`ProjectionLifecycle.Inline`.** *Inline* = la proyección corre en la **misma transacción** que el evento: al guardar `EmpresaSuspendida`, el `ResumenEmpresa` queda actualizado **al instante**. Consistente e inmediato — a cambio de sumar ese trabajo a cada escritura. (Hay otro modo, `Async`, que verás enseguida.)

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// el read model: un documento consultable, no un agregado
public class ResumenEmpresa
{
    public string Id { get; set; } = "";      // Marten lo llena con la llave del stream
    public string Nombre { get; set; } = "";
    public string Plan { get; set; } = "";
    public bool Suspendida { get; set; }
}
```

```csharp
using Marten.Events.Aggregation;

// pliega los eventos de un stream en un ResumenEmpresa
public partial class ResumenEmpresaProjection : SingleStreamProjection<ResumenEmpresa, string>
{
    public static ResumenEmpresa Create(EmpresaRegistrada e) => new() { Nombre = e.Nombre, Plan = e.Plan };
    public void Apply(PlanCambiado e, ResumenEmpresa doc)      => doc.Plan = e.NuevoPlan;
    public void Apply(EmpresaSuspendida e, ResumenEmpresa doc) => doc.Suspendida = true;
    public void Apply(EmpresaReactivada e, ResumenEmpresa doc) => doc.Suspendida = false;
}
```

```csharp
using JasperFx.Events.Projections;

// en la config del DocumentStore, junto a StreamIdentity/EventNamingStyle:
opts.Projections.Add<ResumenEmpresaProjection>(ProjectionLifecycle.Inline);
```
</details>

### Paso 2 · Consulta el read model

Rehidratar era para **uno**. Para consultar **muchos**, Marten te da LINQ sobre los documentos.

> 🛠️ **Inténtalo tú.** Quieres responder *"¿cuáles están suspendidas?"* con una consulta, así:
>
> ```csharp
> var suspendidas = await store.Query<ResumenEmpresa>().Where(e => e.Suspendida).ToListAsync();
> ```
>
> Ponlo tras una **costura** `IProjectionStore` —el lado de lectura, gemelo del `IEventStore`— con dos operaciones: `Query<T>()` (consultar read models con LINQ) y `GetAggregateRootAsync<T>(id)` (rehidratar **uno** en vivo, que conservas del lado de escritura). Impleméntala con `MartenProjectionStore(IQuerySession querySession)` (`IQuerySession` es la sesión de **solo lectura** de Marten).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;

public interface IProjectionStore
{
    IQueryable<T> Query<T>() where T : notnull;                              // consultar read models
    Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new();    // rehidratar uno (en vivo)
}

public class MartenProjectionStore(IQuerySession querySession) : IProjectionStore
{
    public IQueryable<T> Query<T>() where T : notnull => querySession.Query<T>();
    public Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new()
        => querySession.Events.AggregateStreamAsync<T>(id);
}
```

```csharp
// store = tu IProjectionStore (un MartenProjectionStore que envuelve una QuerySession de Marten)
// "¿cuáles empresas están suspendidas?" — una consulta SQL, sin rejugar nada
var suspendidas = await store.Query<ResumenEmpresa>()
    .Where(e => e.Suspendida)
    .ToListAsync();
```
</details>

> [!NOTE]
> 🆕 **`IProjectionStore` — el lado de lectura.** Es el gemelo del `IEventStore`: aquel **escribe** eventos; este **lee**. `Query<T>()` consulta los read models como una tabla (LINQ → SQL), y `GetAggregateRootAsync` sigue disponible para rehidratar **uno** en vivo (con *time travel*: una versión o fecha). Escribir por un lado, leer por otro: eso es **CQRS**.

### Paso 3 · Pruébalo (integración)

Una proyección es **maquinaria de Marten** — no la corre el `TestStore` en memoria. Así que se prueba con un test de **integración** (de los pocos): siembras eventos, la proyección *inline* llena el documento, y consultas.

> 🔍 **¿Lo lograste?** Con Postgres arriba: `StartStream` de una empresa + `EmpresaSuspendida` + `SaveChangesAsync`; luego `store.Query<ResumenEmpresa>().Where(e => e.Suspendida)` (vía tu `IProjectionStore`) devuelve esa empresa. Mira la tabla `mt_doc_resumenempresa` en psql: hay una fila por empresa, actualizada. No rejugaste nada para consultar.

---

### El Descubrimiento

Construiste el **lado de lectura**. La agregación en vivo (`GetAggregateRootAsync`) sirve para **un** agregado; una **proyección** mantiene un **read model** consultable para preguntar a través de **muchos**, sin rejugar. Los pusiste tras `IProjectionStore`, gemelo del `IEventStore` — escribir y leer, separados: **CQRS**. Y la registraste *inline*: el read model queda consistente en la misma transacción que el evento.

> [!NOTE]
> 🌱 **Semilla — inline no siempre conviene.** *Inline* suma el trabajo de la proyección a **cada escritura**, y con muchas proyecciones eso pesa. El modo **`Async`** las corre en un **daemon** (un worker en segundo plano) que las alimenta después: la escritura no espera, a cambio de **consistencia eventual** (el read model va un pelín atrás). Ese daemon es justo lo que un monitor tipo **Critter Watch** vigila. Lo construyes en [El daemon de proyecciones](daemon-proyecciones.md).

> [!NOTE]
> 🌱 **Semilla — sigue pendiente la concurrencia.** Nada de esto verifica versión al escribir. La red de [concurrencia optimista](concurrencia-optimista.md) se recupera con **`FetchForWriting`** — el momento de adoptar esa mejora con criterio.

---

## ✅ Compruébalo

- [ ] `ResumenEmpresa` es un documento (Id, Nombre, Plan, Suspendida); `ResumenEmpresaProjection` es `partial : SingleStreamProjection<ResumenEmpresa, string>` con `Create` + `Apply(evento, doc)`.
- [ ] La registraste con `opts.Projections.Add<...>(ProjectionLifecycle.Inline)`.
- [ ] `IProjectionStore.Query<ResumenEmpresa>().Where(e => e.Suspendida)` responde con una consulta, **sin** rehidratar cada empresa.
- [ ] Explicas el dolor que resuelve (consultar a través de muchos agregados) y qué es **CQRS** (escribir por un lado, leer por otro).
- [ ] Explicas *inline* vs *async*: consistencia inmediata vs. no bloquear la escritura (consistencia eventual).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué no basta con rehidratar para responder *"¿cuáles empresas están suspendidas?"*? ¿Qué mantiene la proyección, y qué ganas al consultarla en vez de rejugar eventos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · La primera proyección: el lado de lectura" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Para consultar a través de **muchos** agregados sin rejugar sus eventos, construyes un **read model** con una `SingleStreamProjection` (que pliega los eventos en un documento, *inline* = misma transacción) y lo consultas con LINQ tras `IProjectionStore` —el gemelo de lectura del `IEventStore`—: eso es **CQRS**, y abre la puerta al daemon `async` (y a monitorearlo).

---

[⬅️ Volver: El almacén abstracto: tests rápidos sin Postgres](./el-almacen-abstracto.md)

[➡️ Siguiente: El daemon de proyecciones](./daemon-proyecciones.md)
