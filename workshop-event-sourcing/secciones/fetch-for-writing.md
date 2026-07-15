# FetchForWriting: recuperar la concurrencia con criterio

En [el swap](el-swap.md) dejaste **fuera** el control de versión a propósito (el `WARNING` de esa sección). Toca recuperar esa red — pero **bien**, con la herramienta que la doc de Marten recomienda: **`FetchForWriting`**. Este es, exactamente, el cambio que querías hacer con criterio.

## 🎯 El Objetivo

Hacer que tu `MartenEventStore` lea y escriba **comprobando la versión** en un solo paso, para que dos escritores simultáneos no se pisen — **sin tocar el handler ni la interfaz `IEventStore`**.

## 💥 El dolor: read-modify-write no atómico

Mira el ciclo que dejó el swap: `GetAggregateRootAsync` (lee en la versión N) → el handler decide → `AppendEvent` + `SaveChangesAsync` (escribe). **Entre leer y escribir, nada comprueba que el stream siga en la versión N.** Dos peticiones que leen la misma versión ambas añaden un hecho y ambas guardan — y el diario queda incoherente, en silencio. Es *exactamente* la **actualización perdida** de [Concurrencia optimista](concurrencia-optimista.md), de vuelta: el `Append` suelto es append-only sin guardia de versión.

## 🔧 `FetchForWriting`: leer y controlar en un solo paso

`FetchForWriting<Empresa>(id)` hace dos cosas a la vez: te da el agregado rehidratado (`.Aggregate`) **y captura la versión** en que lo leíste. Añades con `.AppendOne(hecho)`, y al `SaveChangesAsync` Marten **exige** que el stream siga en esa versión. Si otro escribió mientras decidías, **lanza** en vez de sobrescribir.

### Paso 1 · `MartenEventStore` adopta `FetchForWriting`

Lo bonito: el cambio vive **dentro** de `MartenEventStore`. Tu handler sigue pidiendo `GetAggregateRootAsync` → decidir → `AppendEvent` → `SaveChangesAsync`, igual que en [El almacén abstracto](el-almacen-abstracto.md). Ese es el pago de la costura `IEventStore`: cambias el motor de escritura sin tocar el dominio.

> 🛠️ **Inténtalo tú.** **🔁** En `MartenEventStore`: en `GetAggregateRootAsync`, abre el stream con `FetchForWriting` (en vez de `AggregateStreamAsync`), **guarda en un campo la acción de añadir a ese stream** (una clausura, como en [El despachador](el-despachador.md)) y devuelve `.Aggregate`; `AppendEvent` llama a esa acción; `SaveChangesAsync` no cambia.

> [!NOTE]
> 🆕 **`FetchForWriting<T>(id)` → `IEventStream<T>`.** Devuelve un *stream para escritura*: `.Aggregate` es el agregado rehidratado (o `null` si no existe todavía — sirve para **crear** también), y por dentro guarda la **versión** con la que lo leíste. `.AppendOne(hecho)` encola un hecho en ese stream. El control de versión se cobra en `SaveChangesAsync`.

> [!NOTE]
> 🆕 **`FetchForWriting<T>` es genérico; `AppendEvent` recibe `object`.** El puente entre ambos es el **truco de la clausura** que ya usaste en [El despachador](el-despachador.md): capturas el stream en una clausura (`_append`) al leer, y la reutilizas al añadir — sin que `MartenEventStore` tenga que ser genérico. *(Aquí guardas un stream, el de la empresa del handler; el caso **crear** —`.Aggregate` null— se aprovecha en la plantilla. La plantilla real guarda varios, uno por stream.)*

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

### Paso 2 · Ahora el choque se nota (de nuevo)

Repite el escenario de dos escritores de [Concurrencia optimista](concurrencia-optimista.md): dos sesiones abren `emp-7` con `FetchForWriting` en la **misma** versión, ambas añaden y ambas guardan. El **segundo `SaveChangesAsync` lanza**:

```csharp
await using var s1 = store.LightweightSession();
await using var s2 = store.LightweightSession();
var a = await s1.Events.FetchForWriting<Empresa>("emp-7");   // ambas leen la MISMA versión
var b = await s2.Events.FetchForWriting<Empresa>("emp-7");
a.AppendOne(new EmpresaSuspendida("falta de pago"));
b.AppendOne(new PlanCambiado("Enterprise"));
await s1.SaveChangesAsync();   // entra
await s2.SaveChangesAsync();   // 💥 la versión ya avanzó → ConcurrencyException
```

La cura es la misma de §9: **no pisar en silencio; fallar y reintentar**.

> [!NOTE]
> 🆕 **`ConcurrencyException` (de `JasperFx`).** El conflicto de versión implícita lanza `EventStreamUnexpectedMaxEventIdException`, que hereda de **`JasperFx.ConcurrencyException`** — atrapa la base y cubres el caso. Es la misma idea que tu `ConcurrencyException` casera de §9: no pisar en silencio, **fallar y reintentar**.

> 🛠️ **Inténtalo tú.** Envuelve la ejecución del comando en un **reintento acotado**: al capturar `ConcurrencyException`, vuelve a intentar (cada intento con una **sesión nueva**, así el `FetchForWriting` relee la versión al día), hasta N veces; sal al primer éxito.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using JasperFx;   // ConcurrencyException

for (var intento = 1; intento <= 3; intento++)
{
    await using var session = store.LightweightSession();               // sesión nueva por intento
    var handler = new SuspenderHandler(new MartenEventStore(session));
    try
    {
        await handler.HandleAsync(comando);   // FetchForWriting relee la versión al día → decide → guarda
        break;                                // guardó sin choque → listo
    }
    catch (ConcurrencyException) when (intento < 3)
    {
        // otro escribió mientras decidías; reintenta: la próxima vuelta relee la versión fresca
    }
}
```
</details>

### Paso 3 · Pruébalo (integración)

Como es control de concurrencia real de Postgres, se prueba con un test de **integración** (de los pocos).

> 🛠️ **Inténtalo tú.** Reusa el `MartenFixture` de [Tests de integración](tests-de-integracion.md): en un `[Fact]`, siembra `emp-7`, abre **dos** sesiones, `FetchForWriting` de `emp-7` en ambas (misma versión), `AppendOne` en ambas, guarda la primera, y afirma que la segunda lanza el conflicto con `Assert.ThrowsAnyAsync<ConcurrencyException>` (**`ThrowsAny`**, no `Throws`: lo que se lanza es una **subclase** de `ConcurrencyException`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using JasperFx;   // ConcurrencyException

[Fact]
public async Task Dos_escritores_en_la_misma_version_el_segundo_choca()
{
    await using var s1 = Store.LightweightSession();   // Store viene del MartenFixture
    await using var s2 = Store.LightweightSession();
    s1.Events.StartStream("emp-7", new EmpresaRegistrada("Constructora Andes", "Básico"));
    await s1.SaveChangesAsync();

    var a = await s1.Events.FetchForWriting<Empresa>("emp-7");   // ambas leen la misma versión
    var b = await s2.Events.FetchForWriting<Empresa>("emp-7");
    a.AppendOne(new EmpresaSuspendida("falta de pago"));
    b.AppendOne(new PlanCambiado("Enterprise"));
    await s1.SaveChangesAsync();                                  // entra

    await Assert.ThrowsAnyAsync<ConcurrencyException>(() => s2.SaveChangesAsync());   // 💥
}
```
</details>

Con Postgres arriba, `dotnet test` en verde confirma que la red volvió.

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
