# FetchForWriting: recuperar la concurrencia con criterio

Vuelve a la deuda que arrastras. En [Concurrencia optimista](concurrencia-optimista.md) construiste **a mano** el control de versión: cada hecho declaraba su posición, y el almacén rechazaba un `Append` cuya posición ya estaba tomada. Luego, en [el swap](el-swap.md), lo dejaste **fuera** a propósito: tu `MartenEventStore` lee con `AggregateStreamAsync` y añade con `Append`, sin verificar versión (el `WARNING` de esa sección). Es hora de recuperar esa red — pero **bien**, con la herramienta que la doc de Marten recomienda: **`FetchForWriting`**. Este es, exactamente, el cambio que querías hacer con criterio.

## 🎯 El Objetivo

Cambiar cómo escribe tu `MartenEventStore` de *"leer y añadir sin control"* a **`FetchForWriting`**, que recupera la concurrencia optimista — **sin tocar el handler ni la interfaz `IEventStore`**.

## 💥 El dolor: read-modify-write no atómico

Mira el ciclo que dejó el swap: `GetAggregateRootAsync` (lee en la versión N) → el handler decide → `AppendEvent` + `SaveChangesAsync` (escribe). **Entre leer y escribir, nada comprueba que el stream siga en la versión N.** Dos peticiones que leen la misma versión ambas añaden un hecho y ambas guardan — y el diario queda incoherente, en silencio. Es *exactamente* la **actualización perdida** de [Concurrencia optimista](concurrencia-optimista.md), de vuelta: el `Append` suelto es append-only sin guardia de versión.

## 🔧 `FetchForWriting`: leer y controlar en un solo paso

`FetchForWriting<Empresa>(id)` hace dos cosas a la vez: te da el agregado rehidratado (`.Aggregate`) **y captura la versión** en que lo leíste. Añades con `.AppendOne(hecho)`, y al `SaveChangesAsync` Marten **exige** que el stream siga en esa versión. Si otro escribió mientras decidías, **lanza** en vez de sobrescribir.
### Paso 1 · `MartenEventStore` adopta `FetchForWriting`

Lo bonito: el cambio vive **dentro** de `MartenEventStore`. Tu handler sigue pidiendo `GetAggregateRootAsync` → decidir → `AppendEvent` → `SaveChangesAsync`, igual que en [El almacén abstracto](el-almacen-abstracto.md). Ese es el pago de la costura `IEventStore`: cambias el motor de escritura sin tocar el dominio.

> 🛠️ **Inténtalo tú.** **🔁** En `MartenEventStore`: que `GetAggregateRootAsync` use `FetchForWriting` (en vez de `AggregateStreamAsync`) y **recuerde** cómo añadir a *ese* stream; que `AppendEvent` añada por ahí; `SaveChangesAsync` igual.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;
using JasperFx.Events;   // IEventStream<T>

public class MartenEventStore(IDocumentSession session) : IEventStore
{
    private Action<object>? _append;   // cómo añadir al stream que abrí para escritura

    public async Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new()
    {
        var stream = await session.Events.FetchForWriting<T>(id);   // agregado + versión capturada
        _append = evento => stream.AppendOne(evento);               // clausura: recuerda ESTE stream
        return stream.Aggregate;                                    // null si el stream no existe aún
    }

    public void AppendEvent(string id, object evento) => _append!(evento);

    public Task SaveChangesAsync() => session.SaveChangesAsync();   // aquí Marten valida la versión
}
```
</details>

> [!NOTE]
> 🆕 **`FetchForWriting<T>(id)` → `IEventStream<T>`.** Devuelve un *stream para escritura*: `.Aggregate` es el agregado rehidratado (o `null` si no existe todavía — sirve para **crear** también), y por dentro guarda la **versión** con la que lo leíste. `.AppendOne(hecho)` encola un hecho en ese stream. El control de versión se cobra en `SaveChangesAsync`.

> [!NOTE]
> 🆕 **La clausura — el truco del `Despachador`, otra vez.** `FetchForWriting<T>` es genérico, pero `AppendEvent` recibe un `object`. Como en [El despachador](el-despachador.md), capturas el stream en una **clausura** (`_append`) al leer, y la reutilizas al añadir — sin que `MartenEventStore` tenga que ser genérico. *(Aquí guardas un stream, el de la empresa del handler. La plantilla real guarda varios, uno por stream.)*

### Paso 2 · Ahora el choque se nota (de nuevo)

Repite el escenario de dos escritores de [Concurrencia optimista](concurrencia-optimista.md): dos handlers hacen `FetchForWriting` de `emp-7` en la **misma** versión, ambos deciden y añaden, ambos guardan. El **segundo lanza**.

> 🛠️ **Inténtalo tú.** Envuelve el `SaveChangesAsync` (o la llamada al handler) en un `try/catch` de `JasperFx.ConcurrencyException`: al chocar, **recarga, redecide y reintenta** — igual que planteaste a mano en §9.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using JasperFx;   // ConcurrencyException

try
{
    await despachar(comando);   // FetchForWriting → decide → AppendOne → SaveChanges
}
catch (ConcurrencyException)
{
    // otro escribió mientras decidías: el estado que viste ya no es cierto.
    // recarga (FetchForWriting de nuevo trae la versión fresca), redecide, reintenta.
}
```
</details>

> [!NOTE]
> 🆕 **`ConcurrencyException` (de `JasperFx`).** El conflicto de versión implícita lanza `EventStreamUnexpectedMaxEventIdException`, que hereda de **`JasperFx.ConcurrencyException`** — atrapa la base y cubres el caso. Es la misma idea que tu `ConcurrencyException` casera de §9: no pisar en silencio, **fallar y reintentar**.

### Paso 3 · Pruébalo (integración)

Como es control de concurrencia real de Postgres, se prueba con un test de **integración** (de los pocos): dos sesiones, `FetchForWriting` del mismo stream en la misma versión, ambas guardan → la segunda debe lanzar `ConcurrencyException`. Con Postgres arriba, `dotnet test` en verde confirma que la red volvió.

---

### El Descubrimiento

Cerraste el círculo. En §9 construiste la concurrencia optimista **a mano** (para *entenderla*); en el swap la dejaste fuera a conciencia; y aquí la recuperas **bien**, con `FetchForWriting` — que **funde leer, capturar la versión y guardarla con guardia** en una operación, cerrando el hueco read-modify-write. Y lo hiciste **dentro de `MartenEventStore`**, sin tocar el handler ni `IEventStore`: el pago de haber puesto la costura. Este es el cambio que empezaste el taller para entender — y ahora lo entiendes **con criterio**. Aplicarlo sobre la librería real, `Cosmos.BuildingBlocks`, es el **capstone final** del taller.

> [!NOTE]
> 🌱 **Semilla — el criterio, en tres decisiones.**
> 1. **Optimista vs. pesimista.** `FetchForWriting` es optimista (falla al guardar si hubo choque). Si un stream es muy disputado, `FetchForExclusiveWriting` toma un **lock** de Postgres y **bloquea** al otro en vez de fallar — a costa de contención.
> 2. **Versión implícita vs. explícita.** `FetchForWriting(id, versionEsperada)` falla **temprano** (en el fetch) si la versión no coincide — ideal cuando el comando trae una versión del cliente (`ETag`/`If-Match`).
> 3. **Crear ≠ modificar.** Dos "crear" el mismo id nuevo lanza `Marten.Exceptions.ExistingStreamIdCollisionException` (no es `ConcurrencyException`): atrápala aparte, es otro caso.

---

## ✅ Compruébalo

- [ ] `MartenEventStore.GetAggregateRootAsync` usa `FetchForWriting<T>(id)` (no `AggregateStreamAsync`) y captura cómo añadir al stream; el handler y `IEventStore` **no cambian**.
- [ ] Explicas el hueco que cerró: *read-modify-write no atómico* (leías en versión N y escribías sin comprobar que siguiera en N).
- [ ] Provocas el choque con dos escritores en la misma versión: el segundo lanza `JasperFx.ConcurrencyException` en `SaveChangesAsync`.
- [ ] Atrapas `ConcurrencyException` y **recargas → redecides → reintentas** (como en §9).
- [ ] Explicas las tres decisiones de criterio: optimista vs. exclusivo, versión implícita vs. explícita, y crear vs. modificar.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué hueco exacto cierra `FetchForWriting` que el `AggregateStreamAsync` + `Append` del swap dejaba abierto? ¿Por qué pudiste hacer el cambio sin tocar el handler? ¿Cuándo elegirías `FetchForExclusiveWriting` en su lugar?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · FetchForWriting: recuperar la concurrencia con criterio" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`FetchForWriting<T>(id)` funde **leer el agregado + capturar su versión + añadir hechos**, y en `SaveChangesAsync` **exige** que el stream siga en esa versión (lanza `JasperFx.ConcurrencyException` si no) — recuperando, dentro de `MartenEventStore` y sin tocar el handler, la concurrencia optimista que construiste a mano en §9 y que el swap había dejado fuera: el cambio que ya puedes llevar a la plantilla **con criterio**.

---

[⬅️ Volver: API + Inyección de dependencias](./api-inyeccion.md)

[➡️ Siguiente: Versionado y upcasting de eventos](./versionado-eventos.md)
