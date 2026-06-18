# 22 · El proceso que se cae: Outbox e Inbox

En §21 publicas los hechos públicos con un sender. Pero hay una grieta de fondo: tu handler hace **dos** escrituras a sistemas distintos — guarda el hecho en Postgres (Marten) **y** lo publica al bus. ¿Qué pasa si el proceso **se cae entre las dos**?

## 🎯 El Objetivo

Que un hecho **nunca** quede guardado sin anunciar (ni anunciado sin guardar), y que el receptor no lo procese dos veces: **outbox** transaccional + **inbox** idempotente.

## El dolor: la doble escritura (dual write)

```csharp
await store.SaveChangesAsync(ct);     // 1. el hecho queda en Postgres ✅
// 💥 si el proceso muere AQUÍ…
await sender.PublishAsync(hecho);     // 2. …esto nunca corre → el hecho quedó guardado pero NUNCA se anunció
```

Son **dos** sistemas (la BD y el broker) y no hay forma de escribir en ambos atómicamente: si confirmas la BD y luego el broker está caído o el proceso muere, los datos quedan **inconsistentes**. Al revés es peor: publicar antes de confirmar y que la confirmación falle → anunciaste un hecho que **no pasó**.

El truco clásico: convertir las dos escrituras en **una**. El mensaje a publicar se guarda **en la misma transacción** que el hecho, en una tabla **outbox** ("bandeja de salida"). Luego, un **relay** (un proceso de fondo) lee esa bandeja y publica, **reintentando** hasta lograrlo. Si el proceso muere, el mensaje sigue en la outbox: al revivir, el relay lo envía. Nunca se pierde.

## 🔧 Un outbox (y un inbox) ingenuos

> 🛠️ **Inténtalo tú.** (1) Un almacén que, al guardar un hecho, también **encole su mensaje** en una outbox (misma operación = misma transacción). (2) Un **relay** que drene la outbox publicando al bus y la vacíe. (3) Un **inbox**: un conjunto de ids ya procesados, para que el consumidor **no procese dos veces** el mismo mensaje (idempotencia).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class AlmacenConOutbox
{
    private readonly List<object> _eventos = new();
    private readonly List<(string Id, object Msg)> _outbox = new();
    public int Pendientes => _outbox.Count;           // cuántos mensajes esperan en la bandeja

    public void GuardarConOutbox(object hecho)        // el hecho y su mensaje, en la MISMA operación
    {
        _eventos.Add(hecho);
        _outbox.Add((Guid.NewGuid().ToString(), hecho));
    }

    public void DrenarOutbox(BusEnMemoria bus, Inbox inbox)   // el relay: publica y vacía
    {
        foreach (var (id, msg) in _outbox.ToList())
        {
            if (!inbox.YaProcesado(id)) bus.Publicar(id, msg);   // exactly-once de PROCESAMIENTO: el inbox evita reprocesar
            _outbox.RemoveAll(p => p.Id == id);
        }
    }
}

public class Inbox    // idempotencia del consumidor: ids ya vistos
{
    private readonly HashSet<string> _procesados = new();
    public bool YaProcesado(string id) => !_procesados.Add(id);
}

// el "broker" de juguete: en producción es RabbitMQ / Azure Service Bus (§23)
public class BusEnMemoria
{
    public int Publicados { get; private set; }
    public void Publicar(string id, object msg) => Publicados++;
}
```
</details>

Eso resuelve la doble escritura: el hecho y su anuncio nacen juntos (outbox), y el relay garantiza la entrega **al menos una vez** (*at-least-once*); el inbox evita que "al menos una vez" se vuelva "procesado dos veces".

> [!IMPORTANT]
> **Outbox (productor) e Inbox (consumidor) son las dos mitades.** El **outbox** garantiza que lo que guardaste **se enviará** (aunque el proceso muera). El **inbox** garantiza que lo que llega **se procesa una sola vez** (aunque llegue duplicado, porque *at-least-once* puede entregar repetido). Juntos te dan entrega confiable sin perder ni duplicar efectos.

## Marten + Wolverine ya lo traen

Lo bueno: no escribirás esto en producción. El `IntegrateWithWolverine()` que pusiste en §17 **activa el outbox/inbox transaccional sobre Marten** — el mensaje pendiente se guarda en la **misma transacción** de Marten que tus eventos, y el relay de Wolverine lo envía. Se enciende por política:

```csharp
options.Policies.UseDurableOutboxOnAllSendingEndpoints();   // outbox para todo lo que sale
options.Policies.UseDurableInboxOnAllListeners();           // inbox para todo lo que entra
```

> [!NOTE]
> 🌱 **Semilla — "durable" vs "inline".** `UseDurableOutbox` guarda el mensaje y lo envía con un **relay** durable (sobrevive a caídas). Existe el opuesto, `SendInline()` — enviar **en el acto**, sin outbox — que tiene sentido cuando **no hay** un proceso de fondo que drene: justo el caso **serverless** (Azure Functions), que verás en §23b. Por defecto, en un host largo, quieres el **durable**.

---

## 🔍 Comprueba

```csharp
var almacen = new AlmacenConOutbox();
var bus = new BusEnMemoria();
var inbox = new Inbox();

almacen.GuardarConOutbox(new EmpresaSuspendida("falta de pago"));
Console.WriteLine($"pendientes en outbox: {almacen.Pendientes}");   // 1

almacen.DrenarOutbox(bus, inbox);
almacen.DrenarOutbox(bus, inbox);    // segundo drenado: nada nuevo
Console.WriteLine($"publicados: {bus.Publicados}, pendientes: {almacen.Pendientes}");   // 1, 0
```

> **¿Lo lograste?** Deberías ver `pendientes en outbox: 1`, luego `publicados: 1, pendientes: 0`. El hecho y su mensaje nacieron juntos; el relay lo publicó **una** vez (aunque drenaste dos) y vació la bandeja.

---

## ✅ Compruébalo

- [ ] Explica el problema de la **doble escritura** (BD + broker) y por qué no es atómico.
- [ ] Tu almacén guarda el hecho **y** su mensaje en la misma operación (outbox); un relay lo drena.
- [ ] El **inbox** evita procesar dos veces el mismo mensaje (idempotencia / *exactly-once* de procesamiento).
- [ ] Sabes que `IntegrateWithWolverine` (§17) ya activa esto sobre Marten, y que se enciende con `UseDurableOutbox`/`UseDurableInbox`.
- [ ] Explica cuándo se usa `SendInline` (sin outbox) en vez del durable.

---

## 🧠 En una frase

Guardar el hecho y publicarlo son **dos escrituras** que no pueden ser atómicas (la *doble escritura*); el **outbox** las une —el mensaje se guarda en la misma transacción y un **relay** lo envía, reintentando— y el **inbox** evita procesarlo dos veces, dándote entrega confiable; Marten+Wolverine lo traen con `UseDurableOutbox`/`UseDurableInbox` (activado por `IntegrateWithWolverine`).

---

[⬅️ Volver: Quién se lleva los hechos (senders y el sobre)](./21-senders-y-sobre.md)

[➡️ Siguiente: Transportes reales (RabbitMQ y Azure Service Bus)](./23-transportes-rabbitmq-asb.md)
