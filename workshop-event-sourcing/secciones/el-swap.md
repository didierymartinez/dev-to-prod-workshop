# El swap: Marten reemplaza tu almacén

En el sandbox comprobaste que Marten escribe ([Conocer Marten](conocer-marten.md)) y rehidrata ([Rehidratar con Marten](rehidratar-con-marten.md)) por ti. Es hora del paso grande: **sacar el `EventStore` casero de tu app real y poner a Marten en su lugar** — sin cambiar lo que la API responde.

## 🎯 El Objetivo

Que los handlers de tu app hablen con **Marten** (`IDocumentSession`) en vez del almacén en RAM; borrar el motor casero; y que los mismos `curl` de [La API HTTP](la-api-http.md) sigan respondiendo — ahora contra Postgres, sobreviviendo a un reinicio.

## 💥 El dolor: el sandbox no es tu app

Marten funciona… en una consola de juguete. Tu app real sigue corriendo sobre el `EventStore` en RAM: se muere en cada reinicio y te espera el muro de serializar a mano ([Docker y PostgreSQL](docker-postgres.md)). Ya tienes todo para cruzarlo: el motor casero te dio el mapa mental, y Marten hace cada pieza por ti.

## 🔧 Paso 1 · Enchufar Marten en el `Program.cs`

`AddMarten` registra el store y, con él, un `IDocumentSession` **por petición** (scoped). Como la sesión es scoped, el `Despachador` —que la usa a través de sus handlers— también pasa a **scoped** (antes era singleton con el `EventStore` en RAM).

```csharp
using Marten;
using JasperFx.Events;   // StreamIdentity (Marten 9)

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Marten")!);
    opts.Events.StreamIdentity = StreamIdentity.AsString;   // tus ids son "emp-7", no Guid
});

builder.Services.AddScoped(sp =>                            // el despachador, ahora por petición
{
    var session = sp.GetRequiredService<IDocumentSession>();
    var despachador = new Despachador();
    despachador.Registrar(new RegistrarEmpresaHandler(session));
    despachador.Registrar(new SuspenderHandler(session));
    despachador.Registrar(new CambiarPlanHandler(session));
    return despachador;
});

var app = builder.Build();
// … los MapPost/MapGet no cambian: siguen recibiendo el Despachador y devolviendo 202/JSON …
app.Run("http://localhost:5000");
```

*(Pon la cadena de [Docker y PostgreSQL](docker-postgres.md) en `appsettings.json` bajo `ConnectionStrings:Marten`.)*

## 🔧 Paso 2 · La `Empresa` adopta la convención de Marten

Marten rehidrata llamando un `Apply` **por tipo de hecho** (lo que probaste con `EmpresaVista`). Tu `Empresa` casera lo hacía con un `switch Aplicar(object)`; ahora expone un `Apply` público por hecho. Sus **decisiones no cambian** (siguen devolviendo el hecho).

> 🛠️ **Inténtalo tú.** Reescribe `Empresa`: quita la base `AggregateRoot` casera y su `Aplicar(object)`, y pon un `public void Apply(TEvento)` por cada hecho (Marten los llama al plegar el stream). Deja intactos los métodos de decisión (`Suspender`, `CambiarPlan`, …) que devuelven el hecho.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida { get; private set; }

    // Marten rehidrata llamando estos por tipo (antes: Load + switch Aplicar)
    public void Apply(EmpresaRegistrada e) { Nombre = e.Nombre; Plan = e.Plan; }
    public void Apply(PlanCambiado e)      => Plan = e.NuevoPlan;
    public void Apply(EmpresaSuspendida e) => Suspendida = true;
    public void Apply(EmpresaReactivada e) => Suspendida = false;

    // las decisiones no cambian: validan y DEVUELVEN el hecho
    public EmpresaSuspendida? Suspender(string motivo) => Suspendida ? null : new(motivo);
    public PlanCambiado CambiarPlan(string nuevoPlan) =>
        Suspendida ? throw new ReglaDeNegocioException("No se cambia el plan de una suspendida.") : new(nuevoPlan);
}
```
</details>

## 🔧 Paso 3 · Los handlers hablan con Marten

`EventStore store` → `IDocumentSession session`. Tu `AbrirStream(...).GetAsync()` es `AggregateStreamAsync<Empresa>(id)`; tu `Append` es `session.Events.Append(id, hecho)`; tu commit es `session.SaveChangesAsync()`.

```csharp
public class SuspenderHandler(IDocumentSession session) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId, token: ct)
                      ?? throw new InvalidOperationException($"No existe {cmd.EmpresaId}.");
        var hecho = empresa.Suspender(cmd.Motivo);
        if (hecho is not null) session.Events.Append(cmd.EmpresaId, hecho);
        await session.SaveChangesAsync(ct);
    }
}

// el de alta abre el stream:
public class RegistrarEmpresaHandler(IDocumentSession session) : ICommandHandler<RegistrarEmpresa>
{
    public async Task HandleAsync(RegistrarEmpresa cmd, CancellationToken ct = default)
    {
        session.Events.StartStream<Empresa>(cmd.EmpresaId, new EmpresaRegistrada(cmd.Nombre, cmd.Plan));
        await session.SaveChangesAsync(ct);
    }
}
```

*(`CambiarPlanHandler` cambia igual. Y el `GET` de la API: `await session.Events.AggregateStreamAsync<Empresa>(id)`.)*

## 🔧 Paso 4 · Borra el motor casero

Ya no lo usa nadie. Bórralo nombrando qué de Marten lo reemplaza:

| Tu pieza casera | La reemplaza |
|---|---|
| `EventStore` (el `Dictionary` de cajones) | el `IDocumentSession` + Postgres |
| `EventStream<T>` / `AbrirStream` / `GetAsync` | `session.Events.AggregateStreamAsync<T>` |
| el sobre `EventoAlmacenado` + versión | el `IEvent` de Marten (en `mt_events`) |
| `AggregateRoot` + `Load` + `switch Aplicar` | la convención `Apply(TEvento)` de Marten |

> [!NOTE]
> ⚖️ **El elefante: Marten entró en tu dominio.** Tu `Empresa` ahora tiene métodos `Apply` con la forma que Marten espera, y tus handlers dependen de `IDocumentSession`. Normalmente el dominio se mantiene libre de dependencias de infraestructura; aquí dejamos entrar a Marten **a propósito**, porque abstraer cada cosa que vamos a demostrar añadiría fricción sin valor didáctico. Es una decisión **consciente**: ¿Marten es "para siempre" o reemplazable? Si dudas, abstrae. El equipo tomó el otro camino —poner una abstracción propia delante de Marten— y verás por qué en [Las dos vertientes](dos-vertientes.md).

## 🔍 ¿Lo lograste?

`dotnet run` y los tres `curl` de [La API HTTP](la-api-http.md) responden **igual** (202 / 202 / el JSON). Pero ahora abre `mt_events` en Postgres: ahí están los hechos de `emp-7`. **Apaga la app, vuélvela a levantar, y haz el `GET` otra vez**: la empresa sigue ahí. Cruzaste el muro — tu sistema persiste de verdad, sobre Marten, y la API ni se enteró.

---

### El Descubrimiento

Reemplazaste tu event store casero por Marten **sin reescribir la API**: los handlers cargan con `AggregateStreamAsync`, deciden igual que siempre, y guardan con `session.Events.Append` + `SaveChangesAsync`. Cada pieza que sufriste a mano tiene su equivalente en el framework — y lo reconoces porque lo construiste. El motor casero cumplió su misión: te enseñó qué hace Marten por dentro.

> [!NOTE]
> 🌱 **Semilla — tus tests se rompieron, y está bien.** Los tests Given-When-Then ([Given-When-Then](given-when-then.md)) hablaban con el `EventStore` casero, que acabas de borrar. En la próxima sección los **migras a integración**: la misma gramática `Given/When/Then`, ahora contra un Postgres real ([Tests de integración](tests-de-integracion.md)). La gramática sobrevive; cambia el motor debajo.

---

## ✅ Compruébalo

- [ ] `AddMarten` con `StreamIdentity.AsString`; el `Despachador` es **scoped** (usa el `IDocumentSession` por petición).
- [ ] `Empresa` tiene un `Apply` público por hecho (Marten los llama); sus decisiones no cambiaron.
- [ ] Los handlers usan `AggregateStreamAsync` + `session.Events.Append` + `SaveChangesAsync`; borraste el `EventStore`/`EventStream`/`AggregateRoot` caseros.
- [ ] Los tres `curl` responden igual, los hechos están en `mt_events`, y la empresa **sobrevive a un reinicio**.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué pieza de Marten reemplazó a cada pieza casera (almacén, stream, sobre, `Aplicar`)? ¿Qué significa "dejar entrar Marten al dominio" y cuándo NO lo harías?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El swap a Marten" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Reemplazaste el `EventStore` casero por **Marten** en la app real —handlers sobre `IDocumentSession` (`AggregateStreamAsync` para cargar, `Events.Append` + `SaveChangesAsync` para guardar), `Empresa` con `Apply` por convención, el despachador scoped— y la API responde igual pero ahora persiste en Postgres; dejaste entrar Marten al dominio como **decisión consciente**.

---

[⬅️ Volver: Rehidratar con Marten](./rehidratar-con-marten.md)

[➡️ Siguiente: Tests de integración](./tests-de-integracion.md)
