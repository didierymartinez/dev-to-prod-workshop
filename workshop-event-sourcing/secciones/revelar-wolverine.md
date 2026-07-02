# El gran reveal (2): Wolverine y el commit automático

Marten reemplazó tu almacén ([Revelar Marten](revelar-marten.md)). Falta la otra mitad del Critter Stack: **Wolverine**, que reemplaza dos cosas que hiciste a mano: el **despacho** de comandos ([El despachador](el-despachador.md)) y el contenedor que arma handlers ([Inyección de Dependencias](inyeccion-de-dependencias.md)). Además, te quita el `SaveChangesAsync` de encima.

## 🎯 El Objetivo

Que Wolverine **descubra y ejecute** tus handlers por convención, y que el **guardar** ocurra **solo** al terminar cada comando — sin que el handler lo pida.

## El dolor: dos plomerías que se repiten

1. **Cada handler termina igual:** `await store.SaveChangesAsync(ct);`. Es lo mismo en todos los handlers, repetido a mano. Si un día olvidas la línea, ese comando no persiste.
2. **El despacho lo armas tú:** en [El Command Handler](el-command-handler.md) escribiste el `ICommandHandler<T>`, en [El despachador](el-despachador.md) construiste el despachador que rutea cada comando a su handler por tipo, y en [Inyección de Dependencias](inyeccion-de-dependencias.md) un mini-contenedor que los **construye** (resuelve sus dependencias). Es plomería: encontrar el handler del comando, armarlo y llamarlo.

Wolverine hace ambas: **descubre** tus handlers (sin que registres cada uno) y ejecuta un **middleware** —código que corre antes/después de tu handler sin que el handler lo invoque— alrededor de cada comando, que hace el `SaveChanges` por ti.

## Wolverine descubre tus handlers (la interfaz se vuelve opcional)

Wolverine no necesita tu `ICommandHandler<T>`: encuentra, **por convención**, cualquier clase con un método `Handle`/`HandleAsync`, y le **inyecta las dependencias como parámetros**. Tus handlers se simplifican — y **pierden el `SaveChangesAsync`**:

> 🛠️ **Inténtalo tú.** **🔁 Ajusta** tus handlers de [Revelar Marten](revelar-marten.md): los que implementan `ICommandHandler<T>` con el `IEventStore` por **constructor**. Déjalos **cargar** (o `StartStream`) y **decidir**. **Borra el `await store.SaveChangesAsync(ct)`**. En un momento veremos quién lo llama por ti.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class RegistrarEmpresaHandler(IEventStore store) : ICommandHandler<RegistrarEmpresa>
{
    public Task HandleAsync(RegistrarEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = Empresa.Registrar(cmd.EmpresaId, cmd.Nombre, cmd.Plan);
        store.StartStream(empresa);                       // sin SaveChangesAsync
        return Task.CompletedTask;
    }
}

public class CambiarPlanHandler(IEventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public async Task HandleAsync(CambiarPlanDeEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId, ct)
                      ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}.");
        empresa.CambiarPlan(cmd.NuevoPlan);               // sin SaveChangesAsync
    }
}
```
</details>

> [!NOTE]
> **Wolverine descubre tu `HandleAsync` por convención** — no le hace falta que implementes `ICommandHandler<T>` para encontrarlo (escanea métodos `Handle`/`HandleAsync`). Pero **conservamos** la interfaz de [El Command Handler](el-command-handler.md): documenta la intención y, sobre todo, te deja **probar el handler genéricamente** en [Given-When-Then](given-when-then.md). El `IEventStore` sigue inyectado por **constructor** (vía DI). Quien envía el comando hará `bus.InvokeAsync(comando)` y Wolverine resuelve el handler correcto.

## ¿Y quién llama a `SaveChangesAsync`? Un middleware

Aquí está el regalo. Ese "guardar al final" lo extraemos a un **middleware** que Wolverine corre **alrededor** de cada comando. Wolverine reconoce, por convención, métodos `Before` / `After` / `Finally`. Necesitamos dos pasos extra en el almacén para que el middleware drene; añádelos a tu `MartenUnitOfWork`/`MartenEventStore`:

```csharp
// en MartenUnitOfWork: la unión de todo lo tocado (para limpiar al final)
public IEnumerable<AggregateRoot> AggregateRoots => _iniciados.Union(_modificados);

// en MartenEventStore: appendear una tanda de hechos a un stream
public void AppendEvents(string id, IEnumerable<object> hechos) => session.Events.Append(id, hechos);
```

Y el middleware (te lo muestro; es la pieza clave de la plantilla):

```csharp
public class UnitOfWorkMiddleware(IEventStore eventStore)
{
    // DESPUÉS de que el handler corrió bien: vuelca a la sesión los hechos pendientes
    public void After()
    {
        if (eventStore is not MartenEventStore m) return;
        foreach (var ar in m.ModificadosConCambios)
            m.AppendEvents(ar.Id, ar.UncommittedEvents);
    }

    // PASE LO QUE PASE (haya error o no): limpia los pendientes y el rastreo
    public void Finally()
    {
        if (eventStore is not MartenEventStore m) return;
        foreach (var ar in m.AggregateRoots) ar.ClearUncommittedEvents();
        m.ClearChangeTracker();
    }
}
```

> [!IMPORTANT]
> ⚖️ **Sutileza fiel al código del equipo: el middleware NO comitea.** Tiene `After` (appendea los pendientes a la sesión de Marten) y `Finally` (limpia) — **pero no hay `SaveChangesAsync` ahí dentro**. El commit real lo hace una **política de Wolverine**, `AutoApplyTransactions`, que abre y **comitea la sesión de Marten** por cada mensaje. Middleware = preparar; `AutoApplyTransactions` = confirmar. Por eso, en el camino de Wolverine, tu `MartenEventStore.SaveChangesAsync` **no se llama** (el handler ya no lo invoca): `After()` appendea y `AutoApplyTransactions` comitea — **no se duplica** el append. Tu `SaveChangesAsync` queda para usos **fuera** de Wolverine (tests, serverless); y `After()` solo drena los **modificados** (un agregado nuevo de `StartStream` ya quedó en la sesión al iniciarse).

## Cablear Wolverine

> [!NOTE]
> 🆕 **De consola a app web.** Hasta aquí tu `Program.cs` era una **app de consola** (`new ServiceCollection()`, [Inyección de Dependencias](inyeccion-de-dependencias.md)). Wolverine —y la multi-tenancy por HTTP que viene ([Resolver el tenant](resolver-el-tenant.md))— viven en una **app web**, así que de aquí en adelante el host es un `WebApplicationBuilder` (`var builder = WebApplication.CreateBuilder(args);`, con el SDK `Microsoft.NET.Sdk.Web`). Es el **mismo** contenedor de DI que ya conoces —`builder.Services` es tu `ServiceCollection` de siempre—, solo que con un servidor web y un pipeline HTTP encima. Por eso aparece `builder`.

Todo se enchufa en el arranque. Instala **dos** paquetes:

```bash
dotnet add package WolverineFx.Marten            # Wolverine + integración con Marten
dotnet add package WolverineFx.RuntimeCompilation # el compilador de código en runtime (Reflexión vs codegen)
```

> [!IMPORTANT]
> **¿Por qué un paquete aparte para el codegen?** Desde Wolverine 6, el **núcleo ya no incluye** el compilador de código en caliente: vive en `WolverineFx.RuntimeCompilation`. Si no lo instalas, `UseRuntimeCompilation()` **no existe** y, peor, la app **no arranca** (Wolverine corre en modo dinámico pero sin un compilador Roslyn registrado, y lanza una excepción al iniciar). Con el paquete referenciado, `UseRuntimeCompilation()` queda disponible y registra ese compilador. *(En producción puedes pre-generar el código en disco —ese mismo código— para arrancar sin compilar en caliente.)*

Con eso, el cableado:

```csharp
// `builder` es el WebApplicationBuilder de tu Program.cs. El AddMarten de «Revelar Marten» se MUEVE aquí dentro (a options.Services).
builder.UseWolverine(options =>
{
    options.Discovery.IncludeAssembly(typeof(CambiarPlanHandler).Assembly);  // descubre tus handlers
    options.UseRuntimeCompilation();                                          // genera el código del despacho (Reflexión vs codegen)
    options.Services.AddMarten(/* … config de «Revelar Marten» … */).IntegrateWithWolverine();   // Marten + outbox/inbox
    options.Policies.AddMiddleware<UnitOfWorkMiddleware>();                   // el middleware en cada comando
    options.Policies.AutoApplyTransactions();                                // commit automático por mensaje
});
builder.Services.AddScoped<IEventStore, MartenEventStore>();   // el swap de «Revelar Marten» SIGUE: así Handle(…, IEventStore store) resuelve
```

Esto reemplaza tu [El despachador](el-despachador.md) + [Inyección de Dependencias](inyeccion-de-dependencias.md) (el `ICommandHandler<T>` de [El Command Handler](el-command-handler.md) queda opcional) + el `SaveChangesAsync` de cada handler:
- `Discovery.IncludeAssembly` → encuentra los handlers (adiós mini-contenedor).
- `UseRuntimeCompilation` → genera el código del despacho en el arranque (lo levantamos en [Reflexión vs codegen](reflexion-vs-codegen.md)).
- `IntegrateWithWolverine` → deja que Wolverine guarde sus propios mensajes en la **misma** transacción de Marten (el outbox/inbox; a fondo en [Outbox e Inbox](outbox-inbox.md)).
- `AddMiddleware<UnitOfWorkMiddleware>` + `AutoApplyTransactions` → el guardar, automático.

> [!NOTE]
> 🌱 **Semilla — `IMessageBus` y cómo se invoca.** Donde antes hacías `new SuspenderHandler(store).HandleAsync(...)`, ahora inyectas un `IMessageBus` y haces `await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "falta de pago"))`. Wolverine resuelve el handler, corre el middleware y comitea. (La plantilla esconde este `IMessageBus` tras una pequeña interfaz propia —un *router* de comandos— para que el dominio no dependa de Wolverine directo; no es un dolor que sientas en el taller, sino **convergencia a la plantilla** — **no la construyes aquí**, la reconocerás al abrirla.)

> [!NOTE]
> 🌱 **Semilla — ¿magia? No: código generado ([Reflexión vs codegen](reflexion-vs-codegen.md)).** Wolverine no usa reflexión en cada llamada para encontrar tu `Handle`: **genera código** en el arranque (`UseRuntimeCompilation`) que llama tu handler y tu middleware directo. En [Reflexión vs codegen](reflexion-vs-codegen.md) levantamos esa última magia y miramos el código que genera.

---

## ✅ Compruébalo

- [ ] Tus handlers son clases planas con `Handle(comando, IEventStore store, …)`, **sin** `SaveChangesAsync`.
- [ ] Entiendes que Wolverine los descubre **por convención** (`Discovery.IncludeAssembly`), no por implementar `ICommandHandler<T>`.
- [ ] El `UnitOfWorkMiddleware` tiene `After` (appendea) y `Finally` (limpia), pero **no** comitea — eso lo hace `AutoApplyTransactions`.
- [ ] Sabes nombrar las 4 líneas del cableado y qué hace cada una.
- [ ] Explica por qué el commit "automático" no es magia: es un middleware + una política, corriendo alrededor de cada comando.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Si el middleware no comitea, ¿quién llama a `SaveChanges`? ¿Por qué hay que instalar `WolverineFx.RuntimeCompilation`?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Revelar Wolverine" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

**Wolverine** descubre tus handlers **por convención** (sin tu `ICommandHandler` ni el mini-contenedor) y corre un **middleware** (`After` appendea, `Finally` limpia) más una política **`AutoApplyTransactions`** que comitea la sesión de Marten por cada comando — así el handler queda en *cargar, decidir*, y el *guardar* es automático.

---

[⬅️ Volver: El gran reveal — Marten](./revelar-marten.md)

[➡️ Siguiente: Levanta la última magia (reflexión vs codegen)](./reflexion-vs-codegen.md)
