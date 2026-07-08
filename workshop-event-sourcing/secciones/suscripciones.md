# Suscripciones: reaccionar a los hechos

El daemon ya te construye read models (proyecciones). Pero muchas veces, cuando un hecho ocurre, quieres **hacer algo hacia afuera**: al suspender una empresa, avisar a facturación, mandar un correo, publicar el hecho a otro servicio. Eso no es un read model: es un **efecto**. No debería colgar de la transacción de escritura, porque si el correo falla no querrías deshacer la suspensión. Para eso Marten tiene **suscripciones**: código tuyo al que el daemon le entrega los hechos, con catch-up y reintentos.

## 🎯 El Objetivo

Reaccionar a un tipo de hecho con un **efecto secundario** (avisar/publicar/integrar) vía una **suscripción** que corre en el daemon — desacoplada de la escritura, con catch-up y semántica **al-menos-una-vez**.

## 💥 El dolor: el efecto no cabe en el handler

Si mandas el correo **dentro** del handler, atas dos cosas que no deberían ir juntas: la escritura del evento y una llamada externa lenta y falible. ¿La suspensión falla si el SMTP está caído? ¿Se reintenta el correo o el evento? Y si el servicio de correos estuvo caído una hora, ¿cómo recuperas los avisos que se perdieron? Quieres el efecto **fuera** del write-path: que alguien lea los hechos ya guardados y reaccione, y que si estuvo caído, **se ponga al día**.

## 🔧 La suscripción: el daemon te entrega los hechos

### Paso 1 · La suscripción

Marten te da una clase base para esto, `SubscriptionBase`. Heredas de ella, le pones un `Name` (su identidad, donde guarda su checkpoint), filtras qué hechos te importan con `IncludeType<T>()`, y sobrescribes `ProcessEventsAsync`, al que el daemon te entrega los hechos en **lotes** (`page.Events`, cada uno un `IEvent` con su `Data`).

> 🛠️ **Inténtalo tú.** Escribe esa clase: hereda de `SubscriptionBase`, ponle `Name`, filtra `EmpresaSuspendida` con `IncludeType<T>()`, y en `ProcessEventsAsync` recorre el lote y ejecuta tu efecto.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;                       // IDocumentOperations, IChangeListener, NullChangeListener
using Marten.Subscriptions;         // SubscriptionBase
using JasperFx.Events.Projections;  // EventRange
using JasperFx.Events.Daemon;       // ISubscriptionController

public class EmailAlSuspender : SubscriptionBase
{
    public EmailAlSuspender()
    {
        Name = "EmailAlSuspender";       // identifica su checkpoint en mt_event_progression
        IncludeType<EmpresaSuspendida>();  // solo me entregan estos hechos
    }

    public override Task<IChangeListener> ProcessEventsAsync(
        EventRange page, ISubscriptionController controller,
        IDocumentOperations operations, CancellationToken token)
    {
        foreach (var e in page.Events)
        {
            var hecho = (EmpresaSuspendida)e.Data;
            Console.WriteLine($"[EMAIL] {e.StreamKey} suspendida: {hecho.Motivo}");
            // aquí de verdad: mandar el correo, publicar a un bus, llamar a otro servicio…
        }
        return Task.FromResult(NullChangeListener.Instance);   // sin hook transaccional extra
    }
}
```
</details>

> [!NOTE]
> 🆕 **El lote y el retorno.** Cada `e` de `page.Events` es un `IEvent`: su `Data` es el hecho (`EmpresaSuspendida`), más su metadata (`StreamKey`, versión, …). Devuelves `NullChangeListener.Instance` salvo que necesites un gancho justo antes/después del commit del lote.

### Paso 2 · Regístrala en el daemon

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
builder.Services.AddMarten(opts =>
{
    // …la config de siempre…
    opts.Events.Subscribe(new EmailAlSuspender(), sub => sub.Options.BatchSize = 100);
})
.AddAsyncDaemon(DaemonMode.Solo);   // la suscripción corre en el mismo daemon que las proyecciones async
```
</details>

> [!NOTE]
> 🆕 **`Subscribe(...)` corre en el daemon.** Una suscripción vive donde el daemon (§ [El daemon](daemon-proyecciones.md)): un worker en segundo plano lee el stream y te va entregando lotes. Por eso necesita `AddAsyncDaemon`. `sub.Options` afina el lote (`BatchSize`) y desde dónde empezar (`SubscribeFromPresent()` para saltarte el historial).

### Paso 3 · Catch-up y "al-menos-una-vez"

Dos comportamientos que definen a una suscripción:

- **Catch-up.** Si la registras cuando ya hay hechos viejos —o si el servicio estuvo caído—, la suscripción **rebobina** y procesa lo que se perdió desde su checkpoint (guardado como `EmailAlSuspender:All` en `mt_event_progression`). No pierdes avisos por haber estado abajo.
- **Al-menos-una-vez.** Si tu `ProcessEventsAsync` **lanza**, el daemon **reintenta el mismo lote** (el checkpoint solo avanza cuando el lote **tuvo éxito**). Eso garantiza que no se salte un hecho — pero significa que tu efecto puede ejecutarse **más de una vez**. Por eso tu efecto debe ser **idempotente** o tolerar la reentrega (mandar el correo dos veces no debería cobrar dos veces).

> 🔍 **¿Lo lograste?** Con el daemon corriendo, suspende un par de empresas: la suscripción imprime `[EMAIL] …` por cada una. Apaga el servicio, suspende otra, vuelve a encender: al arrancar, **procesa la que se perdió** (catch-up). Y `mt_event_progression` muestra `EmailAlSuspender:All` avanzando.

---

### El Descubrimiento

Separaste **reaccionar** de **escribir**. Una **suscripción** —clase que hereda de `SubscriptionBase`, corre en el daemon— recibe los hechos ya guardados y ejecuta tu **efecto hacia afuera** (avisar, publicar, integrar), con **catch-up** (se pone al día si estuvo caída) y **al-menos-una-vez** (reintenta hasta lograrlo; tu efecto tolera reentrega). Es la contraparte de la proyección: la **proyección** construye un read model *dentro* de Marten; la **suscripción** dispara un efecto *fuera*.

> [!NOTE]
> 🌱 **Semilla — la puerta a EDA.** El efecto "hacia afuera" más común es **publicar el hecho a un bus de mensajes** para que otros servicios reaccionen. Hacerlo de forma **fiable** (que el mensaje no se pierda aunque el proceso muera justo después de guardar) es el problema del **outbox**, y quien industrializa suscripción + publicación + outbox es **Wolverine**. Ahí entra el mundo **event-driven**.

> [!NOTE]
> 🌱 **Semilla — el veneno.** Si un hecho hace fallar tu efecto **siempre**, reintentar para siempre atasca la suscripción. Marten puede mandarlo a una **dead-letter queue** (`SkipApplyErrors` → tabla `mt_doc_deadletterevent`) para no bloquear el resto — un ajuste de criterio para producción.

---

## ✅ Compruébalo

- [ ] `EmailAlSuspender : SubscriptionBase` con `Name`, `IncludeType<EmpresaSuspendida>()` y `ProcessEventsAsync` que recorre `page.Events`.
- [ ] La registraste con `opts.Events.Subscribe(...)` y corre bajo `AddAsyncDaemon`.
- [ ] Explicas el **catch-up**: procesa lo que se perdió mientras estuvo caída (checkpoint en `mt_event_progression`).
- [ ] Explicas **al-menos-una-vez** y por qué tu efecto debe ser **idempotente** / tolerar reentrega.
- [ ] Distingues **suscripción** (efecto hacia afuera) de **proyección** (read model adentro).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué mandar el correo dentro del handler es mala idea? ¿Qué te dan el catch-up y el "al-menos-una-vez", y qué te **obligan** a hacer en tu efecto?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Suscripciones: reaccionar a los hechos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una **suscripción** (`SubscriptionBase` + `ProcessEventsAsync`, registrada con `Subscribe` y corriendo en el daemon) recibe los hechos ya guardados y ejecuta un **efecto hacia afuera** (avisar/publicar), con **catch-up** (se pone al día) y **al-menos-una-vez** (reintenta; tu efecto debe tolerar reentrega) — la contraparte de la proyección (read model) y la puerta a EDA.

---

[⬅️ Volver: Auditoría: metadata y correlación](./auditoria.md)

[➡️ Siguiente: Revelar Wolverine: el mediador](./revelar-wolverine.md)
