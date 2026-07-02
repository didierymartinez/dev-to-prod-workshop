# La primera proyección: consultar sin reproducir todo

Tu app corre sobre Marten ([El swap](el-swap.md)) y puedes registrar, suspender y **consultar una** empresa por su id. Pero llega la pregunta que todo negocio hace: *"¿cuáles empresas están suspendidas?"*.

## 🎯 El Objetivo

Un endpoint `GET /api/empresas?estado=suspendida` que liste empresas por estado — con una **proyección** que Marten mantiene al día, sin reproducir cada stream en cada consulta.

## 💥 El dolor: rehidratar uno no sirve para listar todos

`AggregateStreamAsync<Empresa>(id)` reconstruye **un** stream. Para responder "¿cuáles están suspendidas?" tendrías que traer **todos** los ids, rehidratar **cada** empresa y filtrar en memoria. Con diez empresas pasa; con cien mil, es inviable. Consultar **a través de** los streams pide otra cosa: una **vista de lectura** ya calculada, sobre la que puedas hacer un `WHERE`.

Eso es una **proyección**: Marten pliega los hechos en un documento consultable —un **read model**— y lo mantiene al día por ti. Y separa lo que escribe (tu `Empresa`) de lo que se lee (una vista aparte): eso es **CQRS**.

## 🔧 Un read model y su proyección

Quieres poder consultar así, y que la lista salga al instante:

```bash
curl "localhost:5000/api/empresas?estado=suspendida"
# → [{"id":"emp-7","nombre":"Constructora Andes","plan":"Básico","suspendida":true}]
```

### Paso 1 · El read model y su proyección

> 🛠️ **Inténtalo tú.** Un **read model** `EmpresaResumen` (`Id`, `Nombre`, `Plan`, `Suspendida`) con la convención de Marten (`Create`/`Apply`, como la vista del sandbox). Regístralo como proyección **Inline** en `AddMarten`.

### Paso 2 · El endpoint de listado

> 🛠️ **Inténtalo tú.** Un endpoint `GET /api/empresas` que reciba `?estado=` y consulte con `session.Query<EmpresaResumen>()` (con `.Where(e => e.Suspendida)` si piden las suspendidas).

> [!NOTE]
> 🆕 **Proyección, read model, lifecycle.** Una **proyección** deriva un documento (el **read model**) de los hechos. `opts.Projections.Snapshot<EmpresaResumen>(SnapshotLifecycle.Inline)` registra tu tipo con `Create`/`Apply` como documento que Marten mantiene. *(`SnapshotLifecycle` vive en `JasperFx.Events.Projections`: añade ese `using`, como hiciste con `JasperFx.Events` para `StreamIdentity`.)* **Inline** = la vista se actualiza en la **misma transacción** que el evento (consistencia fuerte: apenas guardas el hecho, la vista ya está al día). Luego consultas ese documento con LINQ: `session.Query<EmpresaResumen>().Where(...)` — Marten lo traduce a SQL sobre su tabla `mt_doc_empresaresumen`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// el READ model: una vista para consultar, separada del Empresa de escritura (CQRS)
public record EmpresaResumen
{
    public string Id { get; init; } = "";          // Marten lo llena con el id del stream
    public string Nombre { get; init; } = "";
    public string Plan { get; init; } = "";
    public bool Suspendida { get; init; }

    public static EmpresaResumen Create(EmpresaRegistrada e) => new() { Nombre = e.Nombre, Plan = e.Plan };
    public EmpresaResumen Apply(PlanCambiado e)      => this with { Plan = e.NuevoPlan };
    public EmpresaResumen Apply(EmpresaSuspendida e) => this with { Suspendida = true };
    public EmpresaResumen Apply(EmpresaReactivada e) => this with { Suspendida = false };
}
```

```csharp
// en AddMarten (junto a la conexión y StreamIdentity):
opts.Projections.Snapshot<EmpresaResumen>(SnapshotLifecycle.Inline);
```

```csharp
// el endpoint de listado (IQuerySession = solo lectura)
app.MapGet("/api/empresas", async (string? estado, IQuerySession session) =>
{
    var consulta = session.Query<EmpresaResumen>();
    var lista = estado == "suspendida"
        ? await consulta.Where(e => e.Suspendida).ToListAsync()
        : await consulta.ToListAsync();
    return Results.Ok(lista);
});
```
</details>

## 🔍 ¿Lo lograste?

Con la app corriendo: registra dos empresas, suspende una, y llama `GET /api/empresas?estado=suspendida` — sale **solo** la suspendida, ya filtrada por Postgres, sin reproducir ningún stream. Míralo también en la tabla `mt_doc_empresaresumen`: hay una fila por empresa, actualizada en el mismo instante en que guardaste el hecho (porque la proyección es **Inline**). Y quita el `?estado`: salen todas.

---

### El Descubrimiento

Separaste **escritura** de **lectura** (CQRS): los comandos siguen decidiendo sobre `Empresa` y guardando hechos, y una **proyección Inline** mantiene un read model `EmpresaResumen` consultable con LINQ. Ya no rehidratas todo para responder una pregunta: Marten calculó la vista al guardar cada hecho, y tú solo haces `Query<T>().Where(...)`. Escribir y leer, cada uno con su forma.

> [!NOTE]
> 🌱 **Semilla — cuándo se calcula la vista.** La registraste **Inline** (misma transacción, consistencia fuerte). Pero hay otras opciones: **Async** (un proceso de fondo la actualiza, consistencia eventual, más throughput) y **Live** (se calcula al consultar, sin persistir). Y hay proyecciones que juntan **varios** streams. Eso —los lifecycles, el daemon, y las vistas cross-stream— es la próxima sección ([Lifecycles y el daemon](lifecycles-y-daemon.md)).

---

## ✅ Compruébalo

- [ ] Un read model `EmpresaResumen` (`Create`/`Apply`) registrado con `Projections.Snapshot<…>(SnapshotLifecycle.Inline)`.
- [ ] `GET /api/empresas?estado=suspendida` lista solo las suspendidas; sin el filtro, lista todas.
- [ ] La consulta usa `session.Query<EmpresaResumen>()` (LINQ → SQL), no rehidrata streams.
- [ ] Explicas qué es CQRS aquí (write model `Empresa` vs read model `EmpresaResumen`) y qué significa que la proyección sea **Inline**.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué no puedes responder "¿cuáles están suspendidas?" con `AggregateStreamAsync`? ¿Qué te da una proyección Inline que rehidratar cada stream no?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · La primera proyección" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Para consultar **a través de** los streams (listar por estado) sin rehidratar todo, registras una **proyección Inline**: Marten pliega los hechos en un read model `EmpresaResumen` (separado del `Empresa` de escritura — CQRS) y lo mantiene al día en la misma transacción, y tú lo consultas con `Query<T>().Where(...)` traducido a SQL.

---

[⬅️ Volver: Tests de integración](./tests-de-integracion.md)

[➡️ Siguiente: Lifecycles y el daemon](./lifecycles-y-daemon.md)
