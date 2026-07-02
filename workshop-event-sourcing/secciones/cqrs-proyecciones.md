# El lado de lectura: CQRS y proyecciones

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

Una **proyección** pliega la lista de eventos en un solo documento de lectura, igual que el replay. Igual que tu `Apply` reconstruye el agregado, una proyección reconstruye una **vista**. Marten las mantiene por ti. Defines el documento de lectura y cómo cada hecho lo actualiza:

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
public partial class EmpresaResumenProjection : SingleStreamProjection<EmpresaResumen, string>
{
    public void Apply(EmpresaRegistrada e, EmpresaResumen r) { r.Nombre = e.Nombre; r.Plan = e.Plan; }
    public void Apply(PlanCambiado e, EmpresaResumen r)      => r.Plan = e.NuevoPlan;
    public void Apply(EmpresaSuspendida e, EmpresaResumen r) => r.Suspendida = true;
    public void Apply(EmpresaReactivada e, EmpresaResumen r) => r.Suspendida = false;
}
```

> [!NOTE]
> ⚖️ **`partial` no es opcional (Marten 9.10+).** La proyección se declara **`partial`** porque el **generador de código** de Marten/JasperFx crea en compilación el *dispatcher* que enruta cada evento a su `Apply`. Sin `partial` **compila, pero revienta al arrancar** con `InvalidProjectionException` (*"a projection subclass that uses convention methods DOES need to be declared 'partial'"*). Versiones más viejas de Marten no lo exigían — es un endurecimiento de la serie 9.x.

La registras en la config de Marten, eligiendo **cuándo** se calcula:

```csharp
using JasperFx.Events.Projections;

options.Projections.Add<EmpresaResumenProjection>(ProjectionLifecycle.Inline);   // o .Async, o .Live
```

Y ahora consultar es **directo**, con LINQ, sin reproducir nada. Abres una sesión de solo-lectura con `store.QuerySession()`. Aquí `store` es el **`IDocumentStore`** de Marten que te inyecta el contenedor, **no** tu `IEventStore`. Esa sesión (`IQuerySession`) expone `Query<T>()` sobre cualquier documento, incluido tu modelo de lectura:

```csharp
await using var querySession = store.QuerySession();

var suspendidas = await querySession.Query<EmpresaResumen>()
    .Where(e => e.Suspendida)
    .ToListAsync(CancellationToken.None);   // helper async sobre la consulta LINQ (ver Extension members)
```

> [!NOTE]
> ⚖️ **La plantilla lo envuelve.** Aquí usamos la sesión cruda de Marten para que veas la API real; en el código del equipo no llamas a `querySession.Query<T>` directo, sino al `IProjectionStore` que lo envuelve (ver la nota *Qué trae la plantilla* más abajo).

> [!NOTE]
> **Tres modos: `Live`, `Inline`, `Async` (cuándo se calcula la proyección).**
> - **`Live`**: se calcula **al consultar** (reproduce el stream en el momento). Como tu `GetAggregateRootAsync`; cero almacenamiento extra, pero no escala para listar muchos.
> - **`Inline`**: se actualiza **en la misma transacción** que el evento. La consulta siempre ve lo último (consistencia fuerte), a costo de escribir el resumen en cada comando.
> - **`Async`**: un proceso de fondo (el **async daemon**) actualiza el resumen **poco después**. Escala mejor, pero la lectura puede ir unos milisegundos atrás: **consistencia eventual**.

> [!NOTE]
> ⚖️ **Qué trae la plantilla y qué pones tú.** La capa del equipo expone el **riel** —un `IProjectionStore` con `Query<T>()` (sobre `querySession.Query<T>`) y el `AddAsyncDaemon` para correr el daemon— pero **no trae ninguna proyección concreta**: las defines **tú** y las registras en su hook `Action<ProjectionOptions>`. La maquinaria de proyecciones (`SingleStreamProjection`, los modos) es de **Marten**, desde su doc; la plantilla solo te da dónde enchufarlas. *(Y el lado de lectura tiene su propio router de consultas —simétrico al `ICommandRouter` de [Revelar Wolverine](revelar-wolverine.md)—: un wrapper para que el dominio no toque `IQuerySession` directo. Como aquel, **no se justifica con un dolor del taller ni lo construyes aquí**; es convergencia a la plantilla.)*

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

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué una proyección no es 'la verdad' sino una vista? ¿Qué ganas separando lectura de escritura?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · CQRS y proyecciones" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Leer reproduciendo cada stream no escala; **CQRS** separa la lectura con una **proyección** —un fold de los hechos en un documento consultable (`SingleStreamProjection` + `Query<T>` LINQ)— que Marten mantiene en modo `Live`/`Inline`/`Async` (consistencia fuerte vs eventual); la plantilla trae el riel (`IProjectionStore`, daemon) y tú defines las proyecciones.

---

[⬅️ Volver: Serverless (Azure Functions)](./serverless-azure-functions.md)

[➡️ Siguiente: Versionado y upcasting de eventos](./versionado-upcasting.md)
