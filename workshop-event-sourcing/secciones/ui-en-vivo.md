# UI en vivo: el hecho llega a la pantalla

El [transporte](transportes.md) ya lleva `EmpresaSuspendida` a otros servicios, como facturación. Pero hay un uso del "efecto hacia afuera" de [Suscripciones](suscripciones.md) más cercano: un operador que mira un panel y quiere ver la suspensión **en el instante**, sin recargar. Ese panel vive en tu propio servicio. Lo alimentas con una **suscripción** —que ya sabe de qué empresa es cada hecho, por su `StreamKey`— y empujas el aviso al navegador con **SignalR**. Es justo lo que sembró el transporte: SignalR montado sobre una suscripción.

> [!NOTE]
> **De dónde sale esta pieza.** Marten te entrega el hecho **hasta la suscripción** — ahí termina la librería. El Hub y el push a la pantalla los pones **tú**: son tu capa de presentación. Esta sección la construye sobre lo que ya tienes (el curso base la enseña con el mismo patrón).

## 🎯 El Objetivo

Que cuando la **suscripción** reciba `EmpresaSuspendida`, lo **empuje** al navegador por SignalR y la pantalla lo muestre **al instante**, sin recargar.

## 💥 El dolor: el polling llega tarde y cuesta caro

Un panel que pregunta "¿algo nuevo?" cada 3 segundos tiene dos problemas: **latencia** (hasta 3 segundos de retraso) y **desperdicio** (99 de cada 100 preguntas responden "nada"). Con miles de paneles abiertos, el servidor se ahoga respondiendo "nada". El hecho **ya está** guardado; solo falta llevarlo del servidor al navegador en el momento en que ocurre, no cuando al navegador se le ocurra preguntar.

## 🔧 De la suscripción a la pantalla

### Paso 1 · El Hub: el canal hacia los navegadores

> 🛠️ **Inténtalo tú.** Crea un **Hub** de SignalR y publícalo en una ruta. Los navegadores se conectarán ahí y se **agruparán** por empresa, para que cada uno reciba solo lo suyo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Microsoft.AspNetCore.SignalR;

public class EmpresasHub : Hub
{
    // el navegador se une al grupo de la empresa que está mirando
    public Task Seguir(string empresaId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, empresaId);
}

// en el arranque:
builder.Services.AddSignalR();
app.MapHub<EmpresasHub>("/hub/empresas");
```
</details>

> [!NOTE]
> 🆕 **SignalR y el Hub.** SignalR mantiene una conexión **abierta** (WebSocket) entre servidor y navegador, para que el servidor pueda **empujar** mensajes cuando quiera —no solo responder preguntas—. Un **Hub** es el punto donde los navegadores se conectan. Un **grupo** junta las conexiones interesadas en lo mismo: aquí, todos los que miran `emp-7` se unen al grupo `"emp-7"`, y un push a ese grupo llega solo a ellos.

### Paso 2 · La suscripción empuja al Hub

El hecho lo entrega una **suscripción** (de [Suscripciones](suscripciones.md)): hereda de `SubscriptionBase`, filtra `EmpresaSuspendida` y corre en el daemon. Su ventaja aquí es que cada evento trae su `StreamKey` —el id de la empresa—, justo lo que necesitas para elegir el grupo.

> 🛠️ **Inténtalo tú.** Escribe una suscripción que reciba `EmpresaSuspendida` y, por cada uno, empuje al grupo de **su** empresa (`e.StreamKey`). El acceso al Hub llega **por el constructor** (`IHubContext<EmpresasHub>`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;                       // IDocumentOperations, NullChangeListener
using Marten.Subscriptions;         // SubscriptionBase
using JasperFx.Events.Projections;  // EventRange
using JasperFx.Events.Daemon;       // ISubscriptionController
using Microsoft.AspNetCore.SignalR;

public class PushDeSuspension : SubscriptionBase
{
    private readonly IHubContext<EmpresasHub> _hub;

    public PushDeSuspension(IHubContext<EmpresasHub> hub)
    {
        _hub = hub;
        Name = "PushDeSuspension";
        IncludeType<EmpresaSuspendida>();
    }

    public override async Task<IChangeListener> ProcessEventsAsync(
        EventRange page, ISubscriptionController controller,
        IDocumentOperations operations, CancellationToken token)
    {
        foreach (var e in page.Events)
        {
            var hecho = (EmpresaSuspendida)e.Data;
            await _hub.Clients
                .Group(e.StreamKey!)                 // el id de la empresa = su grupo
                .SendAsync("empresaSuspendida", hecho.Motivo, token);
        }
        return NullChangeListener.Instance;
    }
}

// en el arranque: Marten inyecta el IHubContext en la suscripción
builder.Services.AddMarten(/* tu config */)
    .AddSubscriptionWithServices<PushDeSuspension>(ServiceLifetime.Singleton)
    .AddAsyncDaemon(DaemonMode.Solo);
```
</details>

> [!NOTE]
> 🆕 **La suscripción con dependencias.** Una suscripción normal se registra con `Subscribe(new …())`. Cuando necesita algo del contenedor —aquí el `IHubContext`— se registra con `AddSubscriptionWithServices<T>(...)`: Marten la **crea desde el contenedor** e inyecta sus dependencias por el constructor, igual que a un handler. El `e.StreamKey` es el id de la empresa (el mismo que usaste como llave del stream), así eliges el grupo sin que el id tenga que viajar dentro del evento.

### Paso 3 · El navegador escucha y pinta

> 🛠️ **Inténtalo tú.** Conéctate al Hub, escucha el evento `"empresaSuspendida"` y únete al grupo de tu empresa con `Seguir`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```javascript
const conn = new signalR.HubConnectionBuilder().withUrl("/hub/empresas").build();

conn.on("empresaSuspendida", (motivo) => {
    mostrarBanner(`Suspendida: ${motivo}`);   // se pinta al instante
});

await conn.start();
await conn.invoke("Seguir", "emp-7");          // me uno al grupo de emp-7
```
</details>

> 🔍 **¿Lo lograste?** Abre la página de `emp-7` en **dos** pestañas. En otra ventana, `POST .../empresas/emp-7/suspender`. Un instante después (el daemon corre la suscripción), las **dos** pestañas muestran el banner de suspensión, sin recargar. El camino completo: comando → evento guardado → la suscripción lo lee con su `StreamKey` → empuja al grupo → pintado en el navegador.

---

### El Descubrimiento

Cerraste el viaje del hecho hasta la pantalla. Una **suscripción** (la de [Suscripciones](suscripciones.md)) lee `EmpresaSuspendida` con su `StreamKey`, y lo empuja por **SignalR** al **grupo** de esa empresa, que lo pinta en vivo. Marten te entregó el hecho hasta la suscripción; el Hub y el push son **tu** capa de presentación. El grupo por empresa hace que cada operador vea solo lo suyo: la identidad enruta el mensaje, igual que el id del stream, ahora hacia conexiones de navegador.

> [!NOTE]
> 🌱 **Semilla — ¿y si no hay un proceso siempre encendido?** Todo esto asume un servicio **corriendo**: un host con su daemon, su suscripción viva, su Hub abierto. Pero parte de la plataforma vive en **Azure Functions**, que se **apagan** entre invocaciones. Ahí el daemon y el outbox durable no encajan igual, y la config cambia. Eso es **serverless**, y lo ves en [Serverless](serverless.md).

---

## ✅ Compruébalo

- [ ] Creaste un `Hub` y lo publicaste con `MapHub` + `AddSignalR`.
- [ ] Los navegadores se unen a un **grupo** por empresa (`Groups.AddToGroupAsync`).
- [ ] Una **suscripción** (`SubscriptionBase`) recibe `EmpresaSuspendida` y empuja al grupo con `IHubContext<T>`, usando `e.StreamKey` como id.
- [ ] La registraste con `AddSubscriptionWithServices<T>(...)` para que Marten le inyecte el `IHubContext`.
- [ ] Explicas por qué el push (WebSocket) le gana al polling, y qué pone la librería frente a qué pones tú.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el push le gana al polling? ¿Por qué la suscripción (y no el payload del evento) es la que sabe de qué empresa es el hecho? ¿Qué pone la librería y qué pones tú?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · UI en vivo: el hecho llega a la pantalla" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una **suscripción** lee `EmpresaSuspendida` con su `StreamKey` y lo **empuja** por **SignalR** (`IHubContext<T>`, `Clients.Group(streamKey).SendAsync(...)`) al grupo de esa empresa, que lo pinta en vivo sin recargar — cerrando el viaje del hecho de comando a pantalla, con el Hub como **tu** capa de presentación sobre lo que la librería entrega.

---

[⬅️ Volver: Transportes reales](./transportes.md)

[➡️ Siguiente: Serverless](./serverless.md)
