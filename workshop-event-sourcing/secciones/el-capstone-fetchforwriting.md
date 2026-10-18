# El capstone: FetchForWriting

La plantilla ya persiste tus dos agregados, y tus handlers deciden con ella.

## 🎯 El Objetivo

Cerrar la deuda de concurrencia: que la plantilla vuelva a escribir con la **versión esperada**, ahora con la herramienta de Marten, y que un test de dos escritores la fije en tu suite.

## 💥 El dolor: dos decisiones sobre el mismo estado viejo, sin conflicto

Tu `MartenUnitOfWork` de [La plantilla](./la-plantilla.md) carga con `FetchLatest` y vuelca con `Append`, pero un `Append` **pelado**, sin versión esperada. Mira qué pasa con dos actos concurrentes sobre una empresa activa, cada uno con su propia unidad de trabajo. `emp-1` no sirve: quedó suspendida en [La plantilla](./la-plantilla.md), y `CambiarPlan` no cambia el plan de una suspendida. Registra `emp-48` con la plantilla, sin suspenderla, y justo después corre los dos actos:

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run()
await using (var s = store.LightweightSession("acme"))   // emp-48 nace activa, en plan Básico
{
    var uow = new MartenUnitOfWork(s);
    var e = Empresa.Registrar("emp-48", "904800000", "Molinos del Valle", "Básico");
    s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });
    uow.Registrar(e);
    await uow.CommitAsync();
}
await using var sa = store.LightweightSession("acme");   // dos actos, cada uno con su sesión y su unidad de trabajo
await using var sb = store.LightweightSession("acme");
var ua = new MartenUnitOfWork(sa);
var ub = new MartenUnitOfWork(sb);
var ea = await ua.Cargar<Empresa>("emp-48");   // A carga: Plan = Básico
var eb = await ub.Cargar<Empresa>("emp-48");   // B carga: Plan = Básico (la MISMA versión)
ea.CambiarPlan("Premium");                     // A decide sobre Básico
eb.CambiarPlan("Enterprise");                  // B decide sobre Básico
await ua.CommitAsync();                         // A entra
await ub.CommitAsync();                         // B entra TAMBIÉN — sin conflicto
```

```sql
SELECT version, type FROM mt_events WHERE stream_id = 'emp-48' ORDER BY version;
-- 1 | empresa_registrada
-- 2 | plan_cambiado
-- 3 | plan_cambiado      ← los DOS cambios de plan
```

Ninguno falló. Las **dos** decisiones se tomaron sobre el mismo estado viejo (`Básico`) y **ambas** entraron: B nunca vio el cambio de A. Con `PlanCambiado`, el daño es un plan pisado. Con una regla en juego, como "no reactivar con deuda", sería una invariante rota en silencio.

Es el dolor de [Concurrencia optimista](./concurrencia-optimista.md), dos escritores en la misma versión, que en [Todo o nada](./todo-o-nada.md) atrapaste con un `PRIMARY KEY(stream, version)` y en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) curaste a mano en un handler. El `Append` pelado de la plantilla **lo dejó volver**. No es [El rezago](./el-rezago.md), donde una **vista** iba atrasada: aquí los dos decidieron desde el diario, y el diario avanzó bajo sus pies.

## 🔧 `FetchForWriting`: la versión esperada, de vuelta en la escritura

La versión esperada ya la pasas a mano: tu `Decidir` de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) le suma a la versión del agregado los hechos que agrega (`proceso.Version + hechos.Length`). Funciona, pero te obliga a **acordarte** en **cada** escritura, y olvidarla es justo el `Append` pelado que reabrió la deuda. En `Volcar` tampoco la puedes pasar: tu `AggregateRoot` no tiene `Version`, y la que importa es la que se leyó al cargar. `FetchForWriting` carga, recuerda esa versión y la valida al guardar, en un solo acto: no queda nada que olvidar.

> 🆕 **`FetchForWriting`: cargar para escribir, con la versión esperada.** `session.Events.FetchForWriting<Empresa>(id)` devuelve un stream que **recuerda** su versión inicial. Su `.Aggregate` es el estado, leído del snapshot como con `FetchLatest`, o `null` si el stream no existe. Decides sobre `.Aggregate`, agregas hechos con `.AppendOne(hecho)` (o `.AppendMany(...)`), y al `SaveChangesAsync` Marten **rechaza** si el stream avanzó desde que lo leíste (`EventStreamUnexpectedMaxEventIdException`).

### Paso 1 · Retrofit del `MartenUnitOfWork`

> 🛠️ **Inténtalo tú.** Quiero que, en tu `Program.cs`, `await ub.CommitAsync();` lance `EventStreamUnexpectedMaxEventIdException`. Antes de volver a correr el escenario, quita el bloque que registra `emp-48`: ya existe. Para eso, cambia `Cargar<T>` para que use `FetchForWriting<T>` en vez de `FetchLatest`. El stream que devuelve es genérico, `IEventStream<T>`, y lo necesitas después, en `Volcar`. Una lista no guarda juntos un `IEventStream<Empresa>` y un `IEventStream<SuspensionDeEmpresa>`, así que guárdalo dentro de una `Action`: `() => stream.AppendMany(agg.SinConfirmar.ToArray())`. La lambda recuerda su stream con su tipo, y lee `SinConfirmar` cuando corre. Guarda el agregado y su `Action` juntos en una lista `_cargados`, en lugar de `_modificados`. La primera línea busca ahora entre `_nuevos` y los agregados de `_cargados`, y la puerta mira `stream.Aggregate`. En `Volcar`, llama a esa `Action` en vez del `Append`; `CommitAsync` sigue siendo `Volcar` más el `SaveChangesAsync`. El camino de **nacer** (`Registrar` → `StartStream`) no cambia; solo el de **crecer** gana la versión esperada.

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
        if (_nuevos.Concat(_cargados.Select(c => c.agg)).FirstOrDefault(a => a.Id == id) is T ya) return ya;   // lo que esta unidad ya rastrea
        var stream = await _s.Events.FetchForWriting<T>(id);   // en vez de FetchLatest: recuerda la versión leída
        var agg = stream.Aggregate ?? throw new AgregadoNoEncontradoException(id);   // la puerta: sin stream, no hay agregado
        _cargados.Add((agg, () => stream.AppendMany(agg.SinConfirmar.ToArray())));   // la lambda captura el stream<T> tipado
        return agg;
    }

    public void Volcar()   // nacer y crecer, a la sesión, sin confirmar: lo llama tu middleware
    {
        foreach (var a in _nuevos) _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());     // nacer: igual que antes
        foreach (var (agg, append) in _cargados) if (agg.SinConfirmar.Count > 0) append();    // crecer: por el stream de FetchForWriting
    }

    public async Task CommitAsync()   // fuera de un handler
    {
        Volcar();
        await _s.SaveChangesAsync();   // valida las versiones esperadas; si un stream avanzó, lanza
        foreach (var a in _nuevos) a.MarcarConfirmados();
        foreach (var (agg, _) in _cargados) agg.MarcarConfirmados();
    }
}
```

El `SaveChangesAsync` valida todas las versiones de una. Dentro de un handler las valida el de Wolverine, después de tu `Volcar`.

Tu `ProcesoDeSuspensionHandler` no usa la unidad de trabajo: su `Decidir` sigue pasando la versión al `Append` (`proceso.Version + hechos.Length`). Esa línea sigue cargando peso, como anotaste en [El comentario que sobrevive](./el-comentario-que-sobrevive.md).

</details>

### Paso 2 · El test del conflicto

Hasta aquí, cada choque lo provocabas en tu `Program.cs` y lo mirabas en la consola. Este se queda en tu suite: un test que se pone rojo el día que alguien quite `FetchForWriting`.

> 🆕 **`Assert.ThrowsAnyAsync<T>`: también una clase hija.** Tu `Assert.ThrowsAsync<T>` de [Lo que la unidad de trabajo ya tiene](./lo-que-la-unidad-de-trabajo-ya-tiene.md) pasa solo si se lanza exactamente `T`. `Assert.ThrowsAnyAsync<T>` pasa también si se lanza una clase que hereda de `T`. Aquí esperas la base, `JasperFx.ConcurrencyException`, como tu política de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md): el choque llega como una clase hija. Va con el nombre completo, porque el corto es tu `ConcurrencyException` de [Concurrencia optimista](./concurrencia-optimista.md).

> 🛠️ **Inténtalo tú.** Convierte en un test el escenario del 💥, con estas dos líneas en el centro:
>
> ```csharp
> await ua.CommitAsync();                                                               // A entra
> await Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>(() => ub.CommitAsync());  // B choca
> ```
>
> Para eso: **(1)** En `Empresas.Tests`, crea `ConcurrenciaTests` en la colección `"host"` y recibe tu `HostDePrueba`, como tu test de [El comentario que sobrevive](./el-comentario-que-sobrevive.md). Pídele el `IDocumentStore` a `app.Services`: el test usa la configuración de tu `Program.cs`, contra `empresas_tests`, y sus sesiones van en acme. Quita de tu `Program.cs` el escenario del 💥: el host del test también corre lo que hay entre `var app = builder.Build();` y `app.Run();`. **(2)** Registra con la plantilla una empresa nueva en cada corrida, con un id único (`$"emp-{Guid.NewGuid():N}"`). Así volver a correr no choca, y el test no depende de lo que haya en la base. **(3)** Abre dos sesiones, con una unidad de trabajo cada una: las dos cargan la empresa y le cambian el plan; A confirma y B choca. **(4)** B recarga en una unidad de trabajo nueva, ve el plan de A, decide de nuevo y confirma.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/ConcurrenciaTests.cs: dos escritores sobre el mismo stream, con el store del host
using Marten;
using Microsoft.Extensions.DependencyInjection;

[Collection("host")]
public class ConcurrenciaTests(HostDePrueba app)
{
    [Fact]
    public async Task Dos_escritores_sobre_la_misma_version_la_segunda_choca()
    {
        var store = app.Services.GetRequiredService<IDocumentStore>();
        var id = $"emp-{Guid.NewGuid():N}";   // una empresa nueva en cada corrida: nace en la versión 1
        await using (var s = store.LightweightSession("acme"))
        {
            var uow = new MartenUnitOfWork(s);
            uow.Registrar(Empresa.Registrar(id, "900", "Andes", "Basico"));
            await uow.CommitAsync();
        }

        await using var sa = store.LightweightSession("acme");
        await using var sb = store.LightweightSession("acme");
        var ua = new MartenUnitOfWork(sa);
        var ub = new MartenUnitOfWork(sb);
        var ea = await ua.Cargar<Empresa>(id);   // las dos cargan la versión 1
        var eb = await ub.Cargar<Empresa>(id);
        ea.CambiarPlan("Premium");
        eb.CambiarPlan("Enterprise");

        await ua.CommitAsync();                                                               // A entra
        await Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>(() => ub.CommitAsync());  // B choca

        await using var sc = store.LightweightSession("acme");   // B recarga y decide sobre el estado nuevo
        var uc = new MartenUnitOfWork(sc);
        var ec = await uc.Cargar<Empresa>(id);
        Assert.Equal("Premium", ec.Plan);                  // ve el cambio de A
        ec.CambiarPlan("Enterprise");
        await uc.CommitAsync();
    }
}
```

Cuando B choca, no perdió nada: recarga (`Cargar` otra vez, ahora en la versión de A), vuelve a decidir sobre el estado **nuevo** (ya en Premium) y confirma. En un handler de Wolverine no escribes ese "recarga y reintenta": es tu política `OnException<JasperFx.ConcurrencyException>` de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), que vuelve a correr el handler entero. Atrapa este choque porque `EventStreamUnexpectedMaxEventIdException` hereda de `JasperFx.ConcurrencyException`. La concurrencia optimista no evita el conflicto: lo **detecta** y te obliga a decidir sobre datos frescos, en vez de pisar en silencio.

</details>

> 🔍 **¿Lo lograste?** `dotnet test`, desde `Empresas.Tests`, pasa en verde.

### Paso 3 · `RegistrarPagoHandler`, sobre la plantilla

> 🛠️ **Inténtalo tú.** Quiero `dotnet test --filter CarreraDelPagoTests` en verde con tu `RegistrarPagoHandler` sobre la plantilla. Repite el cambio que deshiciste en [La plantilla dentro del handler](./la-plantilla-dentro-del-handler.md): que pida la `MartenUnitOfWork`, conserve su guarda con su `LogWarning` y llame al verbo, sin su `Append`.

> 🔍 **¿Lo lograste?** `CarreraDelPagoTests` pasa: el aviso que cargó una versión vieja choca al guardar, se reintenta y encuentra la referencia.

## 🔨 Rómpelo: sin la versión en la escritura

Vuelve tu `Cargar(id)` a cargar con `FetchLatest` y a guardar con el `Append` pelado, como antes. La primera línea y la puerta se quedan.

```csharp
public async Task<T> Cargar<T>(string id) where T : AggregateRoot
{
    if (_nuevos.Concat(_cargados.Select(c => c.agg)).FirstOrDefault(a => a.Id == id) is T ya) return ya;
    var agg = await _s.Events.FetchLatest<T>(id) ?? throw new AgregadoNoEncontradoException(id);   // sin FetchForWriting
    _cargados.Add((agg, () => _s.Events.Append(id, agg.SinConfirmar.ToArray())));                // el Append pelado
    return agg;
}
```

Corre `dotnet test`. Cae el test de dos escritores:

```
Con error ConcurrenciaTests.Dos_escritores_sobre_la_misma_version_la_segunda_choca
  Mensaje de error:
   Assert.ThrowsAny() Failure: No exception was thrown
Expected: typeof(JasperFx.ConcurrencyException)
```

Las dos decisiones entraron sobre el mismo estado viejo, sin error, y ahora un rojo lo nombra. Con `dotnet test --filter CarreraDelPagoTests` cae también: el aviso repetido vuelve a dejar dos pagos. Sin `FetchForWriting`, todo compila y tus handlers responden igual: solo los tests lo notan. Restaura `Cargar(id)` y corre otra vez: tus tests, en verde.

## El Descubrimiento

La deuda de [Concurrencia optimista](./concurrencia-optimista.md) se cierra con **`FetchForWriting`**: la versión esperada, de vuelta en el camino de escritura de Marten. Es la que construiste a mano en esa sección, y que en [Todo o nada](./todo-o-nada.md) se volvió el `PRIMARY KEY(stream, version)` de Postgres. Quitarla no cambia ninguna respuesta. Por eso vive en `Cargar`, con un test de dos sesiones que se pone rojo si alguien la quita.

> 🌱 Tu test cubre la ventana entre cargar y confirmar. La de una pantalla es más larga: el usuario ve la empresa y guarda minutos después. Si otro escribió en medio, `FetchForWriting` valida la versión de la carga que hace el guardado, no la que vio el usuario. Llevarla hasta la escritura es [La versión que vio el usuario](./la-version-que-vio-el-usuario.md).

## ✅ Compruébalo

- [ ] Con `FetchForWriting` en `Cargar`, tu test de dos escritores pasa: la segunda confirmación lanza, y `Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>` la atrapa por la base. Con el `Append` pelado, cae con `No exception was thrown`.
- [ ] El camino de **nacer** sigue igual; solo **crecer** ganó la versión esperada, y tras el choque B ve el plan de A.
- [ ] Tu `RegistrarPagoHandler` ya usa la plantilla, y `CarreraDelPagoTests` sigue en verde.
- [ ] Sabes por qué `FetchForWriting` vive en `Cargar`, fijado con un test: quitarlo compila y no cambia ninguna respuesta.

## 🆘 Si algo salió mal

- **`CambiarPlan` lanza `No se puede cambiar el plan de una empresa suspendida`:** cargaste una empresa suspendida, como `emp-1`, y tu verbo conserva la regla de [Decidir el futuro](./decidir-el-futuro.md). Usa `emp-48`, que nace activa en el 💥. Los tests no tienen este problema: cada uno registra una empresa nueva.
- **`UnidadDeTrabajoMiddleware` no compila (`CS1061`, no hay `Volcar`):** reescribiste la unidad de trabajo sin `Volcar`. `CommitAsync` es `Volcar` más el `SaveChangesAsync`.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- El capstone: FetchForWriting: la plantilla carga con `FetchForWriting`, y un test de dos sesiones lo fija. `RegistrarPagoHandler` ya la usa.
```

> 💭 **Reto:** explica por qué el `Append` pelado de la plantilla reabrió la deuda de [Concurrencia optimista](./concurrencia-optimista.md), y cómo `FetchForWriting` la cierra sobre el acto completo. Y: ¿por qué preferirlo sobre pasar la versión al `Append` a mano, como en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) y en [El proceso tiene dueño](./el-proceso-tiene-dueno.md)?

```bash
git add .
git commit -m "ES · El capstone: FetchForWriting (la versión esperada, de vuelta en la plantilla)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El `Append` pelado de la plantilla reabrió la deuda de concurrencia, y **`FetchForWriting`** la cierra trayendo la versión esperada al ciclo cargar-decidir-guardar entero, con un test de dos sesiones que se pone rojo si alguien la quita.

---

[⬅️ Volver: Lo que la unidad de trabajo ya tiene](./lo-que-la-unidad-de-trabajo-ya-tiene.md)

[➡️ Siguiente: La versión que vio el usuario](./la-version-que-vio-el-usuario.md)
