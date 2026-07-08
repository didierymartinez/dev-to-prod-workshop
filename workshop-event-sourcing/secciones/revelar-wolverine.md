# Revelar Wolverine: el mediador

Vuelve a [El despachador](el-despachador.md): construiste una tabla `tipo → handler` con `Registrar` (llenarla) y `Enviar` (rutear). Lo jubilaste en el swap (se volvió `async`), y en [API + DI](api-inyeccion.md) volviste a cablear **un handler por endpoint** a mano, y a llamar `SaveChangesAsync` tú mismo. **Wolverine** —la otra mitad de la Critter Stack— industrializa las tres cosas: **descubre** tus handlers (tu `Registrar`), **rutea** los comandos (tu `Enviar`), y **confirma la transacción** por ti. Es el reveal que sembraste en El despachador.

## 🎯 El Objetivo

Reemplazar el cableado manual —el `Despachador` jubilado, el handler-por-endpoint, y el `SaveChanges` a mano— por Wolverine: **discovery** + **`InvokeAsync`** + **`AutoApplyTransactions`**.

## 💥 El dolor: lo que aún cableas a mano

Cada endpoint de [API + DI](api-inyeccion.md) inyecta **su** handler concreto y lo llama; agregar un comando es tocar el arranque. Y cada handler cierra con `await store.SaveChangesAsync()` — plomería repetida que, si olvidas, no persiste. Es justo lo que tu `Despachador` empezó a resolver (rutear por tipo) y lo que un mediador de verdad hace completo.

## 🔧 Wolverine: el mediador industrial

### Paso 1 · Enciende Wolverine

> 🛠️ **Inténtalo tú.** En el host, `UseWolverine`: que descubra los handlers de tu ensamblado (`Discovery.IncludeAssembly`), integre Marten (`IntegrateWithWolverine`), confirme las transacciones solo (`AutoApplyTransactions`), y —clave en Wolverine 6— habilite la compilación en runtime.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Wolverine;
using Wolverine.Marten;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWolverine(opts =>
{
    opts.Discovery.IncludeAssembly(typeof(SuspenderEmpresaHandler).Assembly);  // dónde buscar handlers
    opts.UseRuntimeCompilation();                                              // Wolverine 6: obligatorio (ver nota)

    opts.Services
        .AddMarten(/* tu config de siempre: conexión, StreamIdentity, EventNamingStyle, proyecciones */)
        .UseLightweightSessions()
        .IntegrateWithWolverine();          // ata la sesión de Marten al pipeline de Wolverine

    opts.Policies.AutoApplyTransactions();  // confirma la transacción al terminar cada handler
});

builder.Services.AddScoped<IEventStore, MartenEventStore>();

var app = builder.Build();
```
</details>

> [!NOTE]
> 🆕 **Wolverine 6 no trae el compilador.** Wolverine genera código por debajo; en la 6.x el core **ya no incluye el compilador Roslyn en runtime**, y sin él la app **crashea al arrancar** (`no IAssemblyGenerator registered`). Para desarrollo, añade el paquete **`WolverineFx.RuntimeCompilation`** y llama `opts.UseRuntimeCompilation()`. En producción se prefiere *codegen* estático (generar el código en el build). Es un gotcha de criterio: sin esto, no arranca.

> [!NOTE]
> 🆕 **`IntegrateWithWolverine` + `AutoApplyTransactions`.** `IntegrateWithWolverine()` hace que Wolverine y Marten **compartan la misma sesión** (y prepara el *outbox* durable, que verás en EDA). `AutoApplyTransactions()` hace que Wolverine **confirme esa sesión** al terminar el handler — el `SaveChangesAsync` que llamabas a mano lo hace **él**.

> [!WARNING]
> **Choque de nombres.** La config de Marten usa `using JasperFx.Events;` (ahí viven `StreamIdentity`/`EventNamingStyle`), y ese ensamblado define **su propio `IEventStore`** — colisiona con el tuyo (`CS0104`). Si te pasa, alíaslo (`using IEventStore = TuEspacio.IEventStore;`) o califica los enums (`JasperFx.Events.StreamIdentity.AsString`). Es exactamente el tipo de fricción que un mantenedor de la plantilla debe reconocer.

### Paso 2 · El endpoint invoca por el bus

> 🛠️ **Inténtalo tú.** **🔁** El endpoint ya no inyecta el handler concreto: inyecta el **bus** (`IMessageBus`) y hace `await bus.InvokeAsync(comando)`. Wolverine encuentra y ejecuta el handler.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
app.MapPost("/empresas/{id}/suspender",
    async (string id, SuspenderBody body, IMessageBus bus) =>
    {
        await bus.InvokeAsync(new SuspenderEmpresa(id, body.Motivo));
        return Results.Ok();
    });
```
</details>

> [!NOTE]
> 🆕 **`IMessageBus.InvokeAsync(comando)` = tu `Enviar`.** Le das el comando y Wolverine **rutea al handler que lo maneja** — el gemelo industrial del `Despachador.Enviar` que escribiste a mano (que buscaba por `comando.GetType()`). El endpoint ya no conoce el handler; solo el comando.

### Paso 3 · El `SaveChanges` desaparece

Con `AutoApplyTransactions`, tu handler puede appendear el hecho y **no llamar `SaveChangesAsync`** — Wolverine confirma la sesión de Marten al terminar. La plomería que repetías en cada handler se fue.

> 🔍 **¿Lo lograste?** Con Postgres arriba y `emp-7` sembrada, `dotnet run` y `curl -X POST .../empresas/emp-7/suspender -d '{"Motivo":"impago"}'` → el `EmpresaSuspendida` queda en `mt_events`. Y fíjate en lo que **no** hiciste: no cableaste el handler en el endpoint (lo halló Wolverine) ni llamaste `SaveChanges` (lo hizo `AutoApplyTransactions`).

---

### El Descubrimiento

Wolverine es tu `Despachador`, **industrializado y completo**: `Discovery.IncludeAssembly` es tu `Registrar` (escanea el ensamblado y arma la tabla `tipo → handler` sola), `IMessageBus.InvokeAsync` es tu `Enviar` (rutea por tipo), y `AutoApplyTransactions` + `IntegrateWithWolverine` cierran el `SaveChanges` que hacías a mano. Todo lo que construiste como andamio para *entender* el ruteo, ahora lo pone la herramienta — y sabes exactamente qué hace por debajo porque lo escribiste tú.

> [!NOTE]
> 🌱 **Semilla — el handler todavía tiene interfaz.** Tu handler sigue implementando `ICommandHandler<T>` (de El despachador). Wolverine **no la necesita**: descubre el método por convención. En la próxima sección la borras. Y hay más: un handler que **devuelve** un evento hace que Wolverine lo **publique** — la puerta a EDA.

---

## ✅ Compruébalo

- [ ] `UseWolverine` con `Discovery.IncludeAssembly`, `IntegrateWithWolverine()`, `AutoApplyTransactions()` y `UseRuntimeCompilation()` (+ el paquete `WolverineFx.RuntimeCompilation`).
- [ ] Explicas el mapeo: `Discovery` ≈ tu `Registrar`, `InvokeAsync` ≈ tu `Enviar`.
- [ ] El endpoint inyecta `IMessageBus` y hace `InvokeAsync(comando)` — ya no cablea el handler.
- [ ] El handler **no** llama `SaveChangesAsync`; `AutoApplyTransactions` confirma la sesión.
- [ ] Reconoces los dos gotchas de criterio: `RuntimeCompilation` obligatorio en Wolverine 6, y la colisión `IEventStore` con `JasperFx.Events`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Mapea cada pieza de tu `Despachador` casero a su equivalente en Wolverine. ¿Qué hace `AutoApplyTransactions` que antes hacías a mano?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Revelar Wolverine: el mediador" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

**Wolverine** industrializa tu `Despachador`: `Discovery.IncludeAssembly` (≈ `Registrar`) descubre los handlers, `IMessageBus.InvokeAsync` (≈ `Enviar`) rutea el comando, e `IntegrateWithWolverine` + `AutoApplyTransactions` confirman la sesión de Marten por ti — con dos gotchas de criterio: `WolverineFx.RuntimeCompilation` es obligatorio en la 6.x, y `IEventStore` colisiona con el de `JasperFx.Events`.

---

[⬅️ Volver: Suscripciones: reaccionar a los hechos](./suscripciones.md)

[➡️ Siguiente: El handler por convención](./handler-por-convencion.md)
