# 24 · El lado de lectura: CQRS y proyecciones

Todo lo que llevas es el lado de **escritura**: comandos, agregados, hechos. Pero una app también **lee**: "muéstrame todas las empresas suspendidas", "lista las del plan Premium". Con lo que tienes, para responder eso tendrías que **rehidratar cada stream** (reproducir todos los hechos de **cada** empresa) en **cada** consulta. Para una empresa va bien; para mil, es inviable. Entra **CQRS**: separar la lectura de la escritura.

## 🎯 El Objetivo

Tener un **modelo de lectura** consultable —una **proyección** que se mantiene al día— para responder consultas **sin** reproducir cada stream.

## El dolor: leer reproduciendo todo no escala

```csharp
// "¿cuáles empresas están suspendidas?" — con solo el event store:
foreach (var id in todosLosIds)                 // 💥 miles de streams
{
    var empresa = await store.GetAggregateRootAsync<Empresa>(id);   // reproduce su historial completo
    if (empresa!.Suspendida) ...                                    // …solo para mirar un bool
}
```

Reproducir la película entera de cada empresa solo para mirar un dato es carísimo. La idea de **CQRS** (*Command Query Responsibility Segregation*): el lado de **escritura** guarda hechos (lo que tienes); el lado de **lectura** mantiene un **modelo aparte**, optimizado para consultar. Y ese modelo se construye… **reproduciendo los hechos**, pero **una sola vez** y guardando el resultado: una **proyección**.

## Una proyección: pliega los hechos en un documento consultable

Una **proyección** es un *fold* de los eventos hacia un documento de lectura. Igual que tu `Apply` reconstruye el agregado, una proyección reconstruye una **vista**. Marten las mantiene por ti. Defines el documento de lectura y cómo cada hecho lo actualiza:

```csharp
using Marten.Events.Aggregation;

// el modelo de LECTURA (una tabla/documento consultable, no el agregado)
public class EmpresaResumen
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Plan { get; set; } = "";
    public bool   Suspendida { get; set; }
}

// la proyección: cómo cada hecho actualiza el resumen (mismo estilo que tus Apply)
public class EmpresaResumenProjection : SingleStreamProjection<EmpresaResumen, string>
{
    public void Apply(EmpresaRegistrada e, EmpresaResumen r) { r.Nombre = e.Nombre; r.Plan = e.Plan; }
    public void Apply(PlanCambiado e, EmpresaResumen r)      => r.Plan = e.NuevoPlan;
    public void Apply(EmpresaSuspendida e, EmpresaResumen r) => r.Suspendida = true;
    public void Apply(EmpresaReactivada e, EmpresaResumen r) => r.Suspendida = false;
}
```

La registras en la config de Marten, eligiendo **cuándo** se calcula:

```csharp
using JasperFx.Events.Projections;

options.Projections.Add<EmpresaResumenProjection>(ProjectionLifecycle.Inline);   // o .Async, o .Live
```

Y ahora consultar es **directo**, con LINQ, sin reproducir nada (vía el `Query<T>()` del read store — el `IProjectionStore` que trae la plantilla, que por dentro es `querySession.Query<T>`):

```csharp
var suspendidas = await projectionStore.Query<EmpresaResumen>()
    .Where(e => e.Suspendida)
    .ToListAsync();
```

> [!NOTE]
> **Tres modos: `Live`, `Inline`, `Async` (cuándo se calcula la proyección).**
> - **`Live`**: se calcula **al consultar** (reproduce el stream en el momento). Como tu `GetAggregateRootAsync`; cero almacenamiento extra, pero no escala para listar muchos.
> - **`Inline`**: se actualiza **en la misma transacción** que el evento. La consulta siempre ve lo último (consistencia fuerte), a costo de escribir el resumen en cada comando.
> - **`Async`**: un proceso de fondo (el **async daemon**) actualiza el resumen **poco después**. Escala mejor, pero la lectura puede ir unos milisegundos atrás: **consistencia eventual**.

> [!NOTE]
> ⚖️ **Qué trae la plantilla y qué pones tú.** La capa del equipo expone el **riel** —un `IProjectionStore` con `Query<T>()` (sobre `querySession.Query<T>`) y el `AddAsyncDaemon` para correr el daemon— pero **no trae ninguna proyección concreta**: las defines **tú** y las registras en su hook `Action<ProjectionOptions>`. La maquinaria de proyecciones (`SingleStreamProjection`, los modos) es de **Marten**, desde su doc; la plantilla solo te da dónde enchufarlas. (Y el lado de lectura tiene su propio `IQueryRouter`/`WolverineQueryRouter`, gemelo del de comandos de §17.)

> [!NOTE]
> 🌱 **Semilla — la consistencia eventual es una decisión, no un accidente.** Con `Async`, tu lista puede ir un instante atrasada respecto a la escritura. Eso es normal en CQRS y casi siempre aceptable (un reporte no necesita el milisegundo exacto). Pero nómbralo: si una pantalla **debe** ver su propia escritura al instante, usa `Inline` para esa vista. El **cuándo NO** de CQRS: en un CRUD simple con pocos datos, montar proyecciones es sobreingeniería — consulta el agregado y ya.

---

## ✅ Compruébalo

- [ ] Explicas por qué leer reproduciendo cada stream no escala, y qué resuelve **CQRS**.
- [ ] Defines un `EmpresaResumen` (modelo de lectura) y una `SingleStreamProjection` que lo actualiza con `Apply(evento, resumen)`.
- [ ] La registras con `ProjectionLifecycle.Inline`/`Async`/`Live` y consultas con `Query<EmpresaResumen>().Where(...)`.
- [ ] Explicas los tres modos y cuál da **consistencia fuerte** vs **eventual**.
- [ ] Sabes que la plantilla trae el **riel** (`IProjectionStore`/daemon) pero las proyecciones las defines tú; y dices un caso donde CQRS sería **sobreingeniería**.

---

## 🧠 En una frase

Leer reproduciendo cada stream no escala; **CQRS** separa la lectura con una **proyección** —un fold de los hechos en un documento consultable (`SingleStreamProjection` + `Query<T>` LINQ)— que Marten mantiene en modo `Live`/`Inline`/`Async` (consistencia fuerte vs eventual); la plantilla trae el riel (`IProjectionStore`, daemon) y tú defines las proyecciones.

---

[⬅️ Volver: Serverless (Azure Functions)](./23b-serverless-azure-functions.md)

[➡️ Siguiente: Versionado y upcasting de eventos](./25-versionado-upcasting.md)
