# Serverless: la plantilla en Azure Functions

Todo lo que llevas montado (Marten + Wolverine + outbox durable, [Revelar Marten](revelar-marten.md) a [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md)) asume un **host largo**: un proceso —tu contenedor— que **nunca se apaga**, siempre escuchando, con hilos de fondo trabajando. Pero hay otro mundo de despliegue muy común: **serverless**. En Azure, las **Azure Functions**: se ejecutan **por invocación**, escalan a cero cuando nadie llama, y **se apagan** entre peticiones. Tu app event-sourced puede vivir ahí — pero si copias la configuración del contenedor, **se rompe**. Veamos por qué, y cómo lo resuelve la plantilla del equipo.

## 🎯 El Objetivo

Entender qué cambia al correr tu sistema en **Azure Functions** (serverless) y configurarlo bien — sobre todo, **sin perder eventos**.

## El dolor: despliegas a una Function y dos cosas fallan

Tomas tu configuración de [Outbox e Inbox](outbox-inbox.md) a [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md) (host largo, `UseDurableOutbox`) y la subes a una Azure Function. Dos sorpresas:

1. **Wolverine ni siquiera arranca.** Estalla al inicializar, intentando descubrir extensiones.
2. Aunque lo arregles, **los eventos publicados nunca llegan.** El comando se procesa, el hecho se guarda en el diario… pero el `EmpresaSuspendida` que publicabas al bus **no sale**. Se queda en la tabla del outbox, para siempre.

### Falla 2 primero: ¿por qué el outbox durable no funciona aquí?

> 🛠️ **Inténtalo tú (sin código).** Recuerda cómo funciona el **outbox durable** ([Outbox e Inbox](outbox-inbox.md)): el evento se guarda en una tabla en la misma transacción, y **un proceso de fondo** lo lee y lo envía al bus, reintentando si hace falta. Ahora piensa: en una función que **se apaga apenas responde**, ¿quién corre ese proceso de fondo?

<details>
<summary>👉 La respuesta</summary>

**Nadie.** El outbox durable parte de que hay un **proceso vivo** (el host largo) ejecutando ese **proceso de fondo** —un *relay*— que vacía la tabla. Una Azure Function **no es ese proceso**: se levanta para atender la invocación y **se apaga** al terminar. El relay nunca corre, así que el evento queda guardado en el outbox y jamás se envía.

La solución no es "arreglar el outbox": es **no usar el outbox durable** en serverless. En su lugar, **enviar el evento *inline*** —dentro de la misma invocación, antes de que la función muera—.
</details>

### Falla 1: por qué no arranca (dotnet-isolated)

Las Azure Functions modernas corren en modo **dotnet-isolated** (el modo .NET por defecto hoy: tu código corre en un proceso **aparte** del host de Functions). En ese modo, **no todas las DLLs del host están disponibles** cuando Wolverine intenta **auto-descubrir** sus extensiones (`[WolverineModule]`) — y el descubrimiento revienta (tropieza con una DLL del host, `Microsoft.Azure.WebJobs`; el detalle no hay que memorizarlo). La solución: **desactivar el auto-descubrimiento** y registrar las extensiones a mano.

## Las tres diferencias serverless

Por eso la plantilla trae **gemelos serverless** de los helpers que ya conoces. Las APIs son nuevas, así que te las muestro (no se inventan):

**1. El host: `AddWolverine(ManualOnly)` en vez de `UseWolverine`.** Una Function configura sus servicios sobre `IServiceCollection` (en su `Program.cs`), no sobre `IHostBuilder`. Y se le dice a Wolverine que **no** descubra extensiones solo:

```csharp
// gemelo serverless de tu UsarWolverineParaComandos (Revelar Wolverine)
builder.Services.AddWolverineRuntimeCompilation();   // del paquete WolverineFx.RuntimeCompilation (Revelar Wolverine); aquí sobre IServiceCollection, no opts.UseRuntimeCompilation()

builder.Services.AddWolverine(ExtensionDiscovery.ManualOnly, options =>   // ← ManualOnly, no auto-descubrimiento
{
    options.Discovery.IncludeAssembly(typeof(SuspenderEmpresa).Assembly);
    options.Services.AgregarConfiguracionMartenComandos(cs, schema, _ => { }, isDev)
                    .IntegrateWithWolverine();
    options.Policies.AddMiddleware<UnitOfWorkMiddleware>();
    options.Policies.AutoApplyTransactions();
    options.Durability.Mode = DurabilityMode.Solo;   // ← Solo, no Balanced
});
```

Fíjate que la parte central es idéntica al host largo: mismo `IncludeAssembly`, `IntegrateWithWolverine`, `UnitOfWorkMiddleware` y `AutoApplyTransactions`. En el host solo cambian tres cosas: usas `AddWolverine(ManualOnly)` en vez de `UseWolverine`, `DurabilityMode.Solo` en vez de `Balanced`, y lo cableas en `IServiceCollection`. El tercer cambio, el envío, viene abajo.

**2. La durabilidad: `Solo` en vez de `Balanced`.** `Balanced` (el del host largo) asume **varias instancias persistentes coordinándose** entre sí para repartirse el trabajo de fondo. En serverless cada instancia va **sola y se apaga**: no hay nada que coordinar, así que `DurabilityMode.Solo` (un solo nodo, sin coordinación).

**3. El envío: `SendInline()` en vez de `UseDurableOutbox()`.** Y, en Azure Service Bus, además se apagan unas **colas de control internas** que Wolverine usa con un host largo y que en serverless no tienen sentido (`SystemQueuesAreEnabled(false)`):

```csharp
// dockerizado (Transportes (RabbitMQ y ASB)):                          // serverless:
options.HabilitarAzureServiceBus(cs);           options.HabilitarAzureServiceBusParaServerLess(cs);   // SystemQueuesAreEnabled(false)
options.PublicarEvento<EmpresaSuspendida>("empresas");   options.PublicarEventoServerless<EmpresaSuspendida>("empresas");   // SendInline()
```

`SendInline()` envía el evento **en el acto**, durante la invocación, sin pasar por el outbox durable — porque aquí no hay quién lo vacíe después.

## Lado a lado

| | Host largo (Docker, [Revelar Marten](revelar-marten.md) a [Transportes (RabbitMQ y ASB)](transportes-rabbitmq-asb.md)) | Serverless (Azure Functions) |
|---|---|---|
| Cableado | `UseWolverine` sobre `IHostBuilder` | `AddWolverine(ExtensionDiscovery.ManualOnly)` sobre `IServiceCollection` |
| Descubrir extensiones | automático | **manual** (`ManualOnly`: dotnet-isolated rompe el auto) |
| Durabilidad | `Balanced` (nodo persistente, relay de fondo) | `Solo` (instancia efímera) |
| Publicar un evento | `PublicarEvento` → `UseDurableOutbox()` | `PublicarEventoServerless` → `SendInline()` |
| Colas de sistema | activas | `SystemQueuesAreEnabled(false)` |
| Helper de host | `UsarWolverineParaComandos` | `AgregarWolverineParaComandosServerless` |

Lo demás —tu dominio, tus handlers, tu `IEventStore`/Marten, tus `Apply(T)`— **no cambia**. Solo cambia *cómo se hospeda y cómo salen los eventos*.

> [!IMPORTANT]
> ⚖️ **El tradeoff — y cuándo NO ir serverless.** `SendInline` te quita la **red de seguridad** del outbox durable: con el outbox, el evento se guarda en la misma transacción y un relay lo reenvía **aunque el proceso se caiga** (entrega *at-least-once* a prueba de crashes). Con `SendInline`, el envío ocurre en la invocación y **no hay relay que reintente**: si el bus está caído o la función muere a mitad, ese evento se **pierde**. Para eventos **críticos** (de los que no puedes perder ni uno), un **host largo con outbox durable** es más seguro. Serverless brilla para cargas intermitentes y *scale-to-zero*; paga el precio de una entrega de eventos menos garantizada.

> [!NOTE]
> 🌱 **Semilla — la durabilidad es del taller de DevOps/infra.** El "host largo vs serverless", el *scale-to-zero* y el costo por ejecución son decisiones de **despliegue** más que de event sourcing. Aquí solo te interesa que tu código event-sourced **funciona en ambos** cambiando la configuración del borde, no el dominio. El cómo desplegar una Function en Azure (con Terraform/CI) es terreno del taller de DevOps.

---

## ✅ Compruébalo

Esta sección no se "corre" sin una Azure Function real (cuesta y excede el taller). Asegúrate de **entenderla**:

- [ ] Explica, en una frase, por qué el **outbox durable** no entrega eventos en una Azure Function.
- [ ] Di las **tres** diferencias de configuración serverless (`ManualOnly`, `Solo`, `SendInline`) y la razón de cada una.
- [ ] Explica por qué `AddWolverine(ManualOnly)` evita el crash de arranque en **dotnet-isolated**.
- [ ] Nombra un caso donde **NO** elegirías serverless para publicar eventos (y por qué).
- [ ] ¿Qué parte de tu código (dominio, handlers, `Apply`) **cambia** al pasar a serverless? *(Respuesta: ninguna; solo la configuración del host y del envío.)*

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el outbox durable NO funciona en una Azure Function, y qué se usa en su lugar?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git commit --allow-empty -m "ES · Serverless (Azure Functions)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una **Azure Function es efímera**: no tiene proceso de fondo que vacíe el **outbox durable** ni clúster que coordinar, y en **dotnet-isolated** el auto-descubrimiento de Wolverine falla — por eso la plantilla ofrece gemelos serverless (`AddWolverine(ManualOnly)` + `DurabilityMode.Solo` + `SendInline()`) que cambian **solo el hospedaje y el envío**, no tu dominio, a cambio de una entrega de eventos menos garantizada.

---

[⬅️ Volver: Diseñar con eventos (las decisiones que el broker no toma por ti)](./disenar-con-eventos.md)

[➡️ Siguiente: El lado de lectura (CQRS)](./cqrs-proyecciones.md)
