# Auditoría: metadata y correlación

Un evento cuenta **qué pasó**: `EmpresaSuspendida("impago")`. Pero el día que audites o depures vas a querer más: **quién** la suspendió, **cuándo**, como parte de **qué operación**, y **disparado por qué**. Eso no va en el payload —es información transversal, no del negocio—, sino en la **metadata** del evento. Marten la lleva por ti… pero apagada por defecto.

## 🎯 El Objetivo

Que cada evento cargue, además de su payload, la **metadata de auditoría** —cuándo, quién (`user_id`), y la correlación/causación que lo encadenan a la operación que lo originó— y saber que hay que **encenderla**.

## 💥 El dolor: el payload no dice quién ni por qué

`EmpresaSuspendida("impago")` no te dice **quién** apretó el botón, ni si fue parte de un proceso masivo de morosos, ni qué comando lo disparó. Meter `UsuarioQueSuspendió` en el `record` sería contaminar el hecho de negocio con algo transversal (y tendrías que hacerlo en **cada** evento). Lo que quieres es una franja de metadata **al lado** del payload, uniforme para todos los eventos.

Marten ya reserva ese espacio (`Timestamp`, `CorrelationId`, `CausationId`, `Headers`), pero la parte opcional viene **apagada**: si no la enciendes, esos valores llegan `null` — y Marten **ni siquiera crea las columnas**.

## 🔧 Encender y poblar la metadata

### Paso 1 · Enciende la captura (es opt-in)

> 🛠️ **Inténtalo tú.** En la config del store, enciende `MetadataConfig` para correlación, causación y headers.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// en la config del DocumentStore:
opts.Events.MetadataConfig.CorrelationIdEnabled = true;   // el hilo de toda la operación
opts.Events.MetadataConfig.CausationIdEnabled   = true;   // qué la causó
opts.Events.MetadataConfig.HeadersEnabled       = true;   // extras: user_id, etc.
```
</details>

> [!NOTE]
> 🆕 **Metadata opt-in.** Los cuatro flags de `MetadataConfig` (`CorrelationIdEnabled`, `CausationIdEnabled`, `HeadersEnabled`, `UserNameEnabled`) están en **`false` por defecto**. Apagados, aunque setees los valores **no se guardan**, y las columnas `correlation_id`/`causation_id`/`headers` **no existen** en `mt_events`. Es auditoría **a propósito**: la enciendes cuando la necesitas (tiene un costo por evento).

### Paso 2 · Pon el quién/por qué en la sesión

La metadata no va en el evento (es transversal): va en la **sesión**, antes de `SaveChangesAsync`. Todo lo que se appende en esa sesión hereda esa metadata.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
await using var session = store.LightweightSession();

session.CorrelationId = "req-9f2c";                 // el hilo de la petición/operación completa
session.CausationId   = "cmd-SuspenderEmpresa";     // el comando que disparó este cambio
session.SetHeader("user_id", "didier@empresa.co");  // QUIÉN lo hizo

session.Events.Append("emp-7", new EmpresaSuspendida("impago reiterado"));
await session.SaveChangesAsync();
```
</details>

> [!NOTE]
> 🆕 **En la sesión, no en el hecho.** `CorrelationId`/`CausationId` son propiedades de la sesión; `SetHeader(clave, valor)` mete extras (aquí `user_id`; en el repo real el usuario viaja como header). Es transversal: lo pones **una vez** por operación y **todos** los eventos de esa sesión lo llevan. La **correlación** es el hilo de la operación entera; la **causación** apunta al comando/mensaje que causó *este* evento — juntas encadenan comando → evento → evento para **trazar** qué pasó y por qué.

### Paso 3 · Léela en cada evento

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using JasperFx.Events;   // IEvent vive aquí en Marten 9 (no en Marten.Events)

var eventos = await query.Events.FetchStreamAsync("emp-7");
foreach (var e in eventos)
{
    Console.WriteLine($"QUÉ    : {e.Data} (v{e.Version})");
    Console.WriteLine($"CUÁNDO : {e.Timestamp:u}");
    Console.WriteLine($"QUIÉN  : {e.Headers?["user_id"]}");
    Console.WriteLine($"POR QUÉ: causa={e.CausationId} correlación={e.CorrelationId}");
}
```
</details>

> 🔍 **¿Lo lograste?** Cada `IEvent` trae el payload (`Data`) **y** su franja de auditoría. En `mt_events` verás las columnas `correlation_id`, `causation_id` y `headers` (un `jsonb` con `{"user_id": "..."}`), más el `timestamp` de siempre. Con la metadata apagada, esas columnas ni aparecen — enciéndela y reaparecen.

---

### El Descubrimiento

Separaste dos cosas que viven en el mismo evento: el **payload** dice *qué pasó* (negocio); la **metadata** dice *cuándo, quién y por qué* (transversal). La pusiste en la **sesión** —una vez por operación, heredada por todos sus eventos— y la **encendiste** a propósito (viene apagada). La **correlación** y la **causación** encadenan comando → evento → evento: la base para **trazar** una operación de punta a punta y **auditar** quién hizo qué.

> [!NOTE]
> 🌱 **Semilla — estos ids viajan.** Correlación y causación no se quedan en la base: cuando un evento cruza a mensajería (EDA), montan en el **sobre** del mensaje para que la traza siga viva entre servicios. Y Wolverine los setea **por ti** en cada handler. Lo verás en el **sobre** de EDA y al revelar Wolverine.

---

## ✅ Compruébalo

- [ ] Encendiste `MetadataConfig` (correlación, causación, headers) — y sabes que sin eso las columnas **no existen**.
- [ ] Seteaste `CorrelationId`/`CausationId`/`SetHeader("user_id", …)` en la **sesión**, no en el evento.
- [ ] Cada `IEvent` leído trae `Timestamp`, `CorrelationId`, `CausationId` y `Headers["user_id"]`.
- [ ] Explicas por qué la metadata va **transversal** (en la sesión, una vez) y no en el payload del hecho.
- [ ] Explicas qué encadenan **correlación** (la operación entera) y **causación** (el comando que causó el evento).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el "quién/por qué" NO va en el `record` del evento sino en la sesión? ¿Qué distingue la correlación de la causación, y para qué sirven juntas?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Auditoría: metadata y correlación" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Además del payload (*qué pasó*), cada evento lleva **metadata** (*cuándo, quién, por qué*) que enciendes en `MetadataConfig` (viene apagada) y pones en la **sesión** (`CorrelationId`/`CausationId`/`SetHeader("user_id")`, heredada por todos sus eventos); la **correlación** y la **causación** encadenan comando → evento para trazar y auditar.

---

[⬅️ Volver: Versionado y upcasting de eventos](./versionado-eventos.md)

[➡️ Siguiente: Suscripciones: reaccionar a los hechos](./suscripciones.md)
