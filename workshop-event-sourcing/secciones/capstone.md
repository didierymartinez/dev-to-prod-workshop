# Capstone — la decisión con criterio

Este es el momento al que apuntó todo el taller. Empezaste con una duda honesta: la doc de Marten recomienda `FetchForWriting`, pero no te sentías capaz de **adoptarlo con criterio** en `Cosmos.BuildingBlocks`. Ahora conoces la librería de punta a punta —el dominio, los adaptadores, la unidad de trabajo, la tenancy, el empaquetado— y construiste a mano cada pieza que hay debajo.

## 🎯 El Objetivo

Como mantenedor, **evaluar y aplicar** `FetchForWriting` al `MartenEventStore` de la plantilla: entender qué gana, qué cambia en su diseño, qué prueba lo respalda, y cómo clasificar la versión.

## 💥 El dolor: ya lo cerraste en el juguete; ahora, en el código real

Este hueco no es nuevo para ti. La actualización perdida de [Concurrencia optimista](concurrencia-optimista.md) —leer en la versión N, escribir sin comprobar que siga en N— la cerraste **dos veces**: a mano en la §9, y con `FetchForWriting` sobre un `MartenEventStore` **de juguete** en [FetchForWriting](fetch-for-writing.md), donde hasta dejaste el test de dos escritores en verde. El capstone es hacerlo en el **código real** —el `MartenEventStore` que reconstruiste en [El almacén de la plantilla](el-almacen-de-la-plantilla.md)—, y es más difícil por **dos razones concretas**:

1. El store real **lee de la sesión de consulta** (`querySession.Events.AggregateStreamAsync`), no de la de escritura. `FetchForWriting` vive en la sesión de **escritura**.
2. La unidad de trabajo maneja **varios** agregados a la vez, no uno. La clausura de un solo stream del juguete se vuelve **una por agregado**.

Ese salto —del juguete de un stream al almacén real de varios— es el capstone.

## 🔧 La decisión con criterio

### Paso 1 · Localiza el hueco en el código real

> 🛠️ **Inténtalo tú.** En el `MartenEventStore` que reconstruiste, señala las dos líneas del hueco: dónde se **lee** la versión (y de qué sesión) y dónde se **escribe** sin comprobarla. Confirma que entre ambas no hay guardia.

```csharp
// lee en versión N, de la sesión de CONSULTA:
querySession.Events.AggregateStreamAsync<T>(id, token: ct).Tap(AddToModifiedAggregateRoots);
// …y al confirmar, añade sin comprobar que el stream siga en N:
session.Events.Append(a.Id, a.UncommittedEvents.ToArray());
```

### Paso 2 · Evalúa (esto es el criterio)

Antes de tocar nada, responde estas preguntas. Ese razonamiento **es** el criterio que viniste a ganar:

- **¿Qué gana?** `FetchForWriting<T>(id)` funde *leer el agregado + capturar la versión + añadir*, y en `SaveChanges` **exige** esa versión (lanza `JasperFx.ConcurrencyException` si otro escribió). Cierra el hueco read-modify-write.
- **¿Qué cambia en el diseño?** Dos cosas. (1) `FetchForWriting` lee de la **sesión de escritura** (`session`), no de la `querySession` de hoy — hay que mover la lectura de rehidratación ahí. (2) El vuelco cambia: en vez de `session.Events.Append(id, …)` al confirmar, añades al **`IEventStream`** que devolvió el fetch (`.AppendOne`) — el objeto *agregado + versión capturada* de [FetchForWriting](fetch-for-writing.md). Y como la unidad de trabajo maneja varios agregados, guardas **un stream por id**.
- **¿Optimista o exclusivo?** `FetchForWriting` es optimista (falla al guardar). `FetchForExclusiveWriting` toma un lock y bloquea al otro. El criterio: **optimista por defecto** —dos escritores sobre la *misma* empresa a la vez son raros, y fallar-y-reintentar es barato—; reserva el **exclusivo** para un stream que **midas** como muy disputado, aceptando su contención.
- **¿A quién toca?** A nadie fuera: el cambio vive **solo** en la vertiente `CritterStack` ([Las dos vertientes](las-dos-vertientes.md)). El dominio y los contratos `Abstractions` no se enteran — el handler sigue pidiendo `GetAggregateRootAsync` → decidir → confirmar.
- **¿Qué prueba lo respalda?** El escenario de dos escritores concurrentes: ambos leen la misma versión, ambos guardan, el segundo debe lanzar `ConcurrencyException`. Sin ese test en verde, no hay evidencia.

### Paso 3 · Aplica, prueba y clasifica

> 🛠️ **Inténtalo tú.** Adopta `FetchForWriting` **dentro** de `MartenEventStore`: lee de la sesión de escritura, recuerda un stream por agregado, y al confirmar añade por ahí. Deja el handler y `IEventStore` intactos. Respalda el cambio con el test de dos escritores que ya escribiste en [FetchForWriting](fetch-for-writing.md) —ahora apuntando al `MartenEventStore` real (Postgres, arnés de [Tests de integración](tests-de-integracion.md))—, y **clasifica** la versión.

<details>
<summary>👉 La forma del cambio (guía, no receta)</summary>

```csharp
// una entrada por agregado: cómo añadir a SU stream (la clausura del juguete, ahora ×N)
private readonly Dictionary<string, Action<object>> _append = new();
// (StartStream, para un agregado NUEVO, sigue igual; AppendEvents ahora enruta por _append[id], no por session.Events.Append)

public async Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct) where T : AggregateRoot
{
    var stream = await session.Events.FetchForWriting<T>(id, ct);  // sesión de ESCRITURA + versión capturada
    _append[id] = evento => stream.AppendOne(evento);              // recuerda ESTE stream
    AddToModifiedAggregateRoots(stream.Aggregate);
    return stream.Aggregate;                                       // null si el stream es nuevo → sirve para crear
}

public Task SaveChangesAsync(CancellationToken ct)
{
    foreach (var a in UncommitedModifiedAggregateRoots)
        foreach (var hecho in a.UncommittedEvents) _append[a.Id](hecho);   // AppendOne al stream de cada uno
    // …limpiar el rastro…
    return session.SaveChangesAsync(ct);   // aquí Marten valida la versión de cada stream
}
```

*(Como `FetchForWriting` devuelve `.Aggregate == null` para un stream inexistente y `.AppendOne` lo crea, puede cubrir también el camino del agregado nuevo — ¿unificas `StartStream` con esto, o lo dejas aparte? Otra decisión de criterio.)*
</details>

> [!NOTE]
> 🆕 **Clasificar este cambio (criterio de [Empaquetar y publicar](empaquetar-y-publicar.md)).** ¿Mayor, menor o parche? El comportamiento observable **cambia**: donde antes dos escritores concurrentes se pisaban en silencio, ahora el segundo **lanza** `ConcurrencyException`. Por SemVer honesto, un cambio de comportamiento del que un consumidor podía depender es **mayor** — aunque es defendible como **parche de seguridad** si nadie razonablemente dependía del pisado silencioso. Lo importante no es el número, sino que **argumentes cuál y por qué**: esa es la promesa de riesgo que la versión le hace al consumidor.

> 🔍 **¿Lo lograste?** El test de dos escritores pasa a **verde**: dos sesiones hacen `FetchForWriting` de `emp-7` en la misma versión, ambas añaden y guardan, y la segunda lanza `JasperFx.ConcurrencyException` en vez de sobrescribir. El handler y `IEventStore` no cambiaron ni una línea. La red que construiste a mano en la §9 volvió — ahora en la librería real, y **sabes por qué**.

---

### El Descubrimiento

Lo hiciste. Evaluaste un cambio real sobre `Cosmos.BuildingBlocks` —`FetchForWriting`— sopesando qué gana (cerrar el hueco read-modify-write), qué cambia en su diseño (leer de la sesión de escritura, un stream por agregado en la unidad de trabajo), qué alternativa existe (exclusivo vs. optimista, y cuándo cada una), a quién toca (solo la vertiente `CritterStack`, no el dominio) y qué prueba lo respalda (los dos escritores). Y clasificaste la versión argumentando el riesgo. Eso —no la línea de código, sino el **razonamiento**— es el criterio que viniste a ganar. Ya no adoptas la mejora por fe en la doc: la adoptas porque **entiendes cada pieza que toca**, porque las construiste todas.

> [!NOTE]
> 🌱 **El camino que sigue.** Este taller era la **llave**: entender la conexión de cada pieza de `Cosmos.BuildingBlocks`. Con ella abres lo que viene en la academia: **usar** la librería para construir las apps del ERP, **desplegarlas** en Azure sobre el DevOps que ya montaste, y —el sueño— construir un **Critter Watch** propio que vigile el daemon, el rezago de proyecciones y el outbox de tus servicios. Nada de eso se hace con criterio sin lo que acabas de recorrer.

---

## ✅ Compruébalo

- [ ] Localizaste el hueco read-modify-write en el `MartenEventStore` real (leer de `querySession`, `Append` sin guardia).
- [ ] Evaluaste el cambio: qué gana, qué cambia (sesión de escritura, un stream por agregado), optimista vs. exclusivo **y cuándo cada uno**, a quién toca.
- [ ] Aplicaste `FetchForWriting` **dentro** de `MartenEventStore`, sin tocar el handler ni `IEventStore`.
- [ ] El test de dos escritores queda en verde (el segundo lanza `ConcurrencyException`).
- [ ] Clasificaste la versión **argumentando** por qué el cambio de comportamiento la hace mayor (o defendiendo el parche).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de **todo el taller**):

> 💭 Antes no te sentías capaz de adoptar `FetchForWriting` con criterio. ¿Qué sabes ahora que no sabías? Nombra tres piezas que **construiste a mano** y que te dejan entender —y defender— este cambio.

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Capstone — la decisión con criterio" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El capstone es evaluar y aplicar `FetchForWriting` sobre el `MartenEventStore` real —qué gana (cierra el hueco de la §9), qué cambia (lee de la sesión de escritura, un stream por agregado), optimista vs. exclusivo, a quién toca (solo `CritterStack`), qué prueba lo respalda (dos escritores) y cómo clasificar la versión—: el **razonamiento**, no la línea de código, es el criterio que ganaste construyendo cada pieza a mano.

---

[⬅️ Volver: Empaquetar y publicar](./empaquetar-y-publicar.md)
