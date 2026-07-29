# El capstone: FetchForWriting

La plantilla persiste bien un agregado a la vez. Pero arrastra una deuda desde [Concurrencia optimista](./concurrencia-optimista.md). Es hora de cerrarla con la herramienta real de Marten.

## 🎯 El Objetivo

Cerrar la deuda de concurrencia: meter la **versión esperada** en el camino de escritura de la plantilla con **`FetchForWriting`**, con un test de conflicto — y dejar ese criterio escrito para la librería real.

## 💥 El dolor: dos decisiones sobre el mismo estado viejo, sin conflicto

Tu `MartenUnitOfWork` de [La plantilla](./la-plantilla.md) carga con `AggregateStreamAsync` y guarda con `Append` — pero un `Append` **pelado**, sin versión esperada. Mira qué pasa con dos actos concurrentes sobre `emp-1` (en plan Básico), cada uno con su propia unidad de trabajo:

```csharp
var ea = await ua.Cargar<Empresa>("emp-1");   // A carga: Plan = Básico
var eb = await ub.Cargar<Empresa>("emp-1");   // B carga: Plan = Básico (la MISMA versión)
ea.CambiarPlan("Premium");                    // A decide sobre Básico
eb.CambiarPlan("Enterprise");                 // B decide sobre Básico
await ua.CommitAsync();                        // A entra
await ub.CommitAsync();                        // B entra TAMBIÉN — sin conflicto
```

```
hechos en emp-1 → 3   (registrada + los DOS cambios de plan)
```

Ninguno falló. Las **dos** decisiones se tomaron sobre el mismo estado viejo (`Básico`) y **ambas** entraron — B nunca vio el cambio de A. Con `PlanCambiado`, el daño es un plan pisado. Con una regla de verdad —"no reactivar con deuda"— serían dos actos sobre una empresa que el otro ya cambió, y una invariante rota en silencio.

Es exactamente el dolor de [Concurrencia optimista](./concurrencia-optimista.md) —dos escritores en la misma versión—, el que en [Todo o nada](./todo-o-nada.md) atrapaste con un `PRIMARY KEY(stream, version)`. El `Append` pelado de la plantilla **lo dejó volver**. (Ojo: no es el rezago de [El rezago](./el-rezago.md), donde el problema era una **vista** atrasada y la cura fue decidir desde el diario. Aquí los dos decidieron desde el diario, a la vez — y el diario avanzó bajo sus pies.)

## 🔧 `FetchForWriting`: la versión esperada, de vuelta en la escritura

En [El swap por reconocimiento](./el-swap-por-reconocimiento.md) ya viste una forma de traer la versión esperada: pasársela al `Append` (`Append(id, versión, hecho)`), leyéndola aparte con `FetchStreamStateAsync`. Funciona — pero te obliga a **acordarte** de leer la versión y pasarla en **cada** escritura; olvidarla es justo el `Append` pelado que reabrió la deuda. `FetchForWriting` hace las tres cosas en un solo acto —cargar, recordar la versión, y validar al guardar—, así que no hay nada que olvidar. Por eso es el camino de escritura idiomático.

> 🆕 **`FetchForWriting`: cargar para escribir, con la versión esperada.** `session.Events.FetchForWriting<Empresa>(id)` devuelve un stream con `.Aggregate` (el estado rehidratado) y su versión inicial **recordada**. Decides sobre `.Aggregate`, agregas hechos con `.AppendOne(hecho)` (o `.AppendMany(...)`), y al `SaveChangesAsync` Marten **rechaza** si el stream avanzó desde que lo leíste (`EventStreamUnexpectedMaxEventIdException`). Es la concurrencia optimista de [Concurrencia optimista](./concurrencia-optimista.md), ahora en la librería, sobre el acto entero de cargar-decidir-guardar.

### Paso 1 · Retrofit del `MartenUnitOfWork`

> 🛠️ **Inténtalo tú.** Cambia `Cargar<T>` para que use `FetchForWriting<T>` en vez de `AggregateStreamAsync`. El truco: el stream que devuelve es genérico (`IEventStream<T>`) y lo necesitas después, en `CommitAsync`, para appendear — así que captúralo en una **closure** que ya conoce su tipo. El camino de **nacer** (`Registrar` → `StartStream`) no cambia; solo el de **crecer** gana la versión esperada.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public class MartenUnitOfWork
{
    private readonly IDocumentSession _s;
    private readonly List<AggregateRoot> _nuevos = new();
    private readonly List<(AggregateRoot agg, Action append)> _cargados = new();   // agregado + cómo appendear a SU stream
    public MartenUnitOfWork(IDocumentSession s) => _s = s;

    public void Registrar(AggregateRoot a) => _nuevos.Add(a);   // nacer: NO cambia

    public async Task<T> Cargar<T>(string id) where T : AggregateRoot
    {
        var stream = await _s.Events.FetchForWriting<T>(id);   // en vez de AggregateStreamAsync: recuerda la versión leída
        var agg = stream.Aggregate;
        _cargados.Add((agg, () => stream.AppendMany(agg.SinConfirmar.ToArray())));   // la closure captura el stream<T> tipado
        return agg;
    }

    public async Task CommitAsync()
    {
        foreach (var a in _nuevos) _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());     // nacer: igual que antes
        foreach (var (agg, append) in _cargados) if (agg.SinConfirmar.Count > 0) append();    // crecer: por el stream de FetchForWriting
        await _s.SaveChangesAsync();   // valida las versiones esperadas; si un stream avanzó, lanza
        foreach (var a in _nuevos) a.MarcarConfirmados();
        foreach (var (agg, _) in _cargados) agg.MarcarConfirmados();
    }
}
```

La closure resuelve el problema de guardar streams de tipos distintos: en vez de una lista de `IEventStream<T>` (con `T` variando), guardas una `Action` que ya capturó el stream tipado y sabe appendear en él. `FetchForWriting` reemplaza a `AggregateStreamAsync` **solo** en `Cargar`; el `CommitAsync` appendea por cada stream capturado, y el `SaveChangesAsync` valida todas las versiones de una.

</details>

### Paso 2 · El test del conflicto

> 🛠️ **Inténtalo tú.** Reproduce el `🔨` de [Concurrencia optimista](./concurrencia-optimista.md) con tu plantilla: dos `MartenUnitOfWork` (cada una con su sesión) cargan el mismo `emp-1`, ambas cambian el plan, la primera confirma y **la segunda lanza** `EventStreamUnexpectedMaxEventIdException`. Comprueba que el estado quedó consistente (ganó una) y que la que chocó puede recargar y reintentar sobre el estado nuevo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
await using var sa = store.LightweightSession();
await using var sb = store.LightweightSession();
var ua = new MartenUnitOfWork(sa);
var ub = new MartenUnitOfWork(sb);

var ea = await ua.Cargar<Empresa>("emp-1");   // ambas cargan la misma versión
var eb = await ub.Cargar<Empresa>("emp-1");
ea.CambiarPlan("Premium");
eb.CambiarPlan("Enterprise");

await ua.CommitAsync();   // A entra
await ub.CommitAsync();   // 💥 EventStreamUnexpectedMaxEventIdException — el stream avanzó desde que B cargó
```

Cuando B choca, no perdió nada: recarga (`Cargar` otra vez, ahora en la versión de A), vuelve a decidir sobre el estado **nuevo** (ya en Premium) y confirma. La concurrencia optimista no evita el conflicto: lo **detecta** y te obliga a decidir sobre datos frescos, en vez de pisar en silencio. Y `emp-1` queda consistente: `Plan = Premium` (el de A), no una mezcla.

</details>

## 🔨 Rómpelo: con y sin la versión esperada

Corre el ciclo concurrente con el `Append` pelado de [La plantilla](./la-plantilla.md): las dos decisiones entran, sin error (3 hechos, la segunda decidió sobre estado viejo). Cámbialo a `FetchForWriting`: el mismo escenario hace que la segunda **lance**, forzando recargar. Es el mismo `🔨` de [Concurrencia optimista](./concurrencia-optimista.md) —dos escritores en la misma versión— cerrando el círculo: lo que atrapaste a mano con un `PRIMARY KEY` ahora lo atrapa la librería, sobre el acto completo.

## El Descubrimiento — y el cierre

La deuda que plantaste en [Concurrencia optimista](./concurrencia-optimista.md) (dos escritores se pisan) se cierra con **`FetchForWriting`**: la versión esperada, de vuelta en el camino de escritura, atómica, en la librería. Y lo reconoces —no es magia— porque es la concurrencia optimista de §9, que en [Todo o nada](./todo-o-nada.md) se volvió el `PRIMARY KEY(stream, version)` de Postgres, ahora en el camino de escritura de Marten.

Aquí está el criterio que corona el taller: hay formas de que `FetchForWriting` quede **implícito** —escondido tras un atributo que "hace la magia"—, y el diferenciador de mantenedor es no perder de vista **qué garantiza el camino de escritura**. Usarlo visible, sabiendo que valida la versión, es lo que evita que alguien deje un `Append` pelado que reabra la deuda sin darse cuenta. Ese criterio —que el camino de escritura pase por `FetchForWriting`, no escondido— es el que le falta a una plantilla que se adopta a ciegas, y es lo que llevas de vuelta a `Cosmos.BuildingBlocks`. Cierra el arco entero: **usar** la librería, **mantenerla** con criterio, **aportar** de vuelta.

Y con esto cierras el recorrido. Empezaste con un `UPDATE` que destruía el pasado y un diario de hechos en una lista en memoria; terminaste con Marten y Wolverine corriendo un servicio multi-tenant, observado, con outbox durable y concurrencia optimista. En cada paso no adoptaste una pieza a ciegas: la construiste a mano hasta donde el juguete lo permitió, y **reconociste** la herramienta cuando llegó. Lo que te queda no es saber usar una librería de event sourcing, sino saber **por qué** hace cada cosa, y cuándo no usarla. Ese criterio es el que mantiene viva una librería como `Cosmos.BuildingBlocks`.

## ✅ Compruébalo

- [ ] Con el `Append` pelado de la plantilla, dos actos concurrentes sobre el mismo stream **ambos entran** (sin conflicto), cada uno decidiendo sobre estado viejo.
- [ ] Con `FetchForWriting` en `Cargar`, el mismo escenario —con **dos `MartenUnitOfWork`**— hace que la segunda confirmación lance `EventStreamUnexpectedMaxEventIdException`.
- [ ] El camino de **nacer** (`Registrar`/`StartStream`) sigue igual; solo **crecer** ganó la versión esperada, y `emp-1` queda consistente tras el choque.
- [ ] Sabes formular el criterio: que el camino de escritura de la plantilla real use `FetchForWriting` **visible**, y por qué esconderlo pierde la garantía de vista.

## 🆘 Si algo salió mal

- **La segunda confirmación no lanza:** seguiste usando `AggregateStreamAsync` + `Append` pelado en `Cargar`; debe pasar por `FetchForWriting` para que la versión esperada se valide.
- **No sabes dónde guardar el stream de `FetchForWriting` (es genérico):** no guardes el `IEventStream<T>` en una lista; guarda una `Action` (closure) que ya capturó el stream tipado y appendea en él. Es el truco del retrofit.
- **`FetchForWriting` no existe / firma distinta:** es `session.Events.FetchForWriting<T>(id)` (async), devuelve un stream con `.Aggregate`, `.AppendOne(...)` y `.AppendMany(...)`; `using JasperFx.Events` y Marten al día.
- **Tras el conflicto no sabes qué hacer:** recarga (`Cargar` otra vez), vuelve a decidir sobre el estado nuevo y confirma. Detectar el conflicto es el punto; resolverlo es recargar-y-reintentar.

## 📓 Registra tu avance

> 💭 **Reto (el último):** explica por qué el `Append` pelado de la plantilla reabrió la deuda de §9, y cómo `FetchForWriting` la cierra sobre el acto completo. Y: ¿por qué preferirlo sobre pasar la versión al `Append` a mano (lo de §29)? Ese es tu criterio de handoff a la librería.

```bash
git add .
git commit -m "ES · El capstone: FetchForWriting (cierra la deuda de concurrencia)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El `Append` pelado de la plantilla reabrió la deuda de §9 —dos actos deciden sobre el mismo estado viejo y ambos entran, sin conflicto—; **`FetchForWriting`** la cierra trayendo la versión esperada al ciclo cargar-decidir-guardar entero (rechaza si el stream avanzó, `EventStreamUnexpectedMaxEventIdException`), preferible a pasar la versión a mano porque no hay nada que olvidar — y usarlo **visible** en el camino de escritura es el criterio de mantenedor que llevas de handoff a `Cosmos.BuildingBlocks`: usar, mantener, aportar.

---

[⬅️ Volver: La plantilla](./la-plantilla.md)
