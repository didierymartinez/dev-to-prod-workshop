# Reconstruir con el daemon

[La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md) terminó con una vista `Inline` que no conoce a tus empresas de antes.

## 🎯 El Objetivo

Rearmar cualquier vista desde el diario con una orden de la librería, sin borrar nada a mano: cuando nace, cuando cambia su forma o cuando corriges un `Apply`. Y ensayar esa orden en un test.

## 💥 El dolor: las vistas no se ponen al día solas

En `EmpresaDetalle`, emp-61 está a medias, sin NIT. Borrarla tampoco la rearma. Con tu programa detenido, corre en `psql` `DELETE FROM mt_doc_empresadetalle;`, y luego pregunta con `await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("906100000"))`: también lanza `No existe la empresa`. Ningún daemon corre una vista `Inline`, así que nadie rejuega sus hechos. Quita esa pregunta antes de seguir.

`VistaSuspendida` tiene el mismo problema cuando cambia de forma. Soporte quiere ver el motivo de cada suspensión, y cuántas veces se suspendió cada empresa. Súmale a `VistaSuspendida` un `public string? Motivo { get; set; }` y un `public int Suspensiones { get; set; }`. Que el `Apply` de `EmpresaSuspendida` los actualice: `{ v.Suspendida = true; v.Motivo = e.Motivo; v.Suspensiones++; }`. En tu `Program.cs`, en lugar de los pasos de [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md), suspende emp-64 y lista las suspendidas:

```csharp
await bus.InvokeAsync(new SuspenderEmpresa("emp-64", "cheque devuelto"));
await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));
await using (var q = store.QuerySession())
    foreach (var v in await q.Query<VistaSuspendida>().Where(v => v.Suspendida).OrderBy(v => v.Id).ToListAsync())
        Console.WriteLine($"{v.Id}: motivo={v.Motivo}");
// emp-14: motivo=
// emp-64: motivo=cheque devuelto
// … y una línea por cada una de tus otras suspendidas, sin motivo
```

Solo emp-64 trae su motivo. El daemon sigue desde su cursor: lo que ya proyectó no vuelve a pasar por el `Apply` nuevo. Es el dolor de [Reconstruir la vista](./reconstruir-la-vista.md), ahora en Marten. Allí lo curaste con `Reconstruir()`: borrar la vista y rejugar el diario. A mano serían dos borrados en `psql`: los documentos y su fila de `mt_event_progression`. Y tendrías que apagar el servicio: borrar con el daemon corriendo detiene su shard, como viste en [El daemon](./el-daemon-y-la-consistencia-eventual.md). En producción nadie tiene ese `psql`, y los dos borrados tienen que ir juntos.

Quita la suspensión de tu `Program.cs`; deja la espera y el listado.

## 🔧 Rearmar es una orden, no un DELETE

> 🆕 **Rearmar con la librería.** `await store.BuildProjectionDaemonAsync()` arma un daemon aparte, a demanda, que no corre nada hasta que se lo pides. Se suelta con `using`, no con `await using`: no tiene `DisposeAsync`. Su `RebuildProjectionAsync("VistaSuspendida", CancellationToken.None)` borra los documentos de esa vista y su progreso, rejuega el diario entero por sus `Apply` y vuelve cuando termina. `CancellationToken.None` dice que nadie la va a cancelar. El nombre es el del read model; con uno que no existe, lanza y lista los que hay. Sirve igual para una vista `Inline`: el daemon del servicio no corre esas vistas, y uno aparte rearma cualquiera. Es tu `Reconstruir()`, hecho librería.

> 🆕 **Pausar el daemon del servicio.** El rearmado borra el progreso de la vista. Si el daemon de tu host proyecta mientras tanto, choca con `ProgressionProgressOutOfOrderException`, como tu `ResetAllData` en [El daemon](./el-daemon-y-la-consistencia-eventual.md). `AddAsyncDaemon` registra en el host un `IProjectionCoordinator`, en `JasperFx.Events.Daemon`: `PauseAsync()` detiene ese daemon y `ResumeAsync()` lo reanuda. Así trabaja por dentro tu `ResetAllMartenDataAsync`. Una vista `Inline` no la escribe el daemon sino la transacción de cada hecho, y la pausa no la detiene: un hecho que entra mientras la rearmas puede quedar fuera de su documento. Una `Inline` se rearma sin escrituras.

### Paso 1 · La orden

> 🛠️ **Inténtalo tú.** Haz que esto rearme las dos vistas con tu host corriendo. Va en tu `Program.cs`, antes del listado:
>
> ```csharp
> var reloj = System.Diagnostics.Stopwatch.StartNew();
> await Vistas.Rearmar(host, "EmpresaDetalle");
> await Vistas.Rearmar(host, "VistaSuspendida");
> Console.WriteLine($"Rearmadas en {reloj.ElapsedMilliseconds} ms");
> var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("901100000"));
> Console.WriteLine($"Plan de 901100000: {plan.Plan}");
> // … y tu listado. Salida:
> // Rearmadas en 640 ms
> // Plan de 901100000: Basico
> // emp-14: motivo=mora
> // emp-64: motivo=cheque devuelto
> // … y tus otras suspendidas, ya con su motivo
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea la clase `static` `Vistas` y su método `Rearmar`, que recibe el host y el nombre de la vista. Saca de `host.Services` el `IDocumentStore` y el `IProjectionCoordinator`. **(2)** Pausa el coordinador, arma el daemon a demanda y rearma. **(3)** Reanuda el coordinador en un `finally`, el bloque que corre aunque el rearmado lance: si no, una falla deja tu servicio sin proyectar ninguna vista `Async`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Vistas.cs: rearmar una vista desde el diario, con la librería
using JasperFx.Events.Daemon;                     // IProjectionCoordinator
using Marten;
using Microsoft.Extensions.DependencyInjection;   // GetRequiredService
using Microsoft.Extensions.Hosting;               // IHost

public static class Vistas
{
    public static async Task Rearmar(IHost host, string vista)
    {
        var store = host.Services.GetRequiredService<IDocumentStore>();
        var coordinador = host.Services.GetRequiredService<IProjectionCoordinator>();
        await coordinador.PauseAsync();                                          // que el daemon del servicio no toque las vistas
        try
        {
            using var daemon = await store.BuildProjectionDaemonAsync();         // un daemon aparte, solo para rearmar
            await daemon.RebuildProjectionAsync(vista, CancellationToken.None);  // borra documentos y progreso, y rejuega el diario
        }
        finally
        {
            await coordinador.ResumeAsync();                                     // sin esto, ninguna vista Async vuelve a avanzar
        }
    }
}
```

</details>

> 🔍 **¿Lo lograste?** emp-61 ya tiene su NIT: `SELECT data->>'Nit' FROM mt_doc_empresadetalle WHERE id = 'emp-61';`. En `SELECT name, last_seq_id FROM mt_event_progression;`, `VistaSuspendida:All` vuelve al último `seq_id` de `mt_events`. Los milisegundos son lo que tarda rejugar el diario entero, y crecen con él. Mientras dura, la vista que rearmas sale vacía y luego a medias, y las demás vistas `Async` de tu host se quedan quietas por la pausa. Quita de tus pasos las dos llamadas a `Rearmar` y la medición: rearmar se corre cuando hace falta, no en cada arranque.

### Paso 2 · Ensaya la orden en un test

Una orden que solo corres el día que la necesitas puede estar rota ese día. Fíjala en un test. Tu `HostConDaemon` ya registra el daemon, y con él el coordinador:

```csharp
// Empresas.Tests/RearmarTests.cs
using Marten;
using Marten.Events;   // WaitForNonStaleProjectionDataAsync

[Collection("daemon")]
public class RearmarTests(HostConDaemon daemon) : IAsyncLifetime
{
    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Rearmar_rehace_la_vista_y_el_daemon_sigue()
    {
        await using (var s = daemon.Store.LightweightSession())
        {
            s.Events.StartStream<Empresa>("emp-65", new EmpresaRegistrada("906500000", "Vidrios Llano", "Basico"),
                new EmpresaSuspendida("mora", "susp-65"));
            await s.SaveChangesAsync();
        }
        await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));
        await using (var s = daemon.Store.LightweightSession())
        {
            s.Delete<VistaSuspendida>("emp-65");   // Delete borra el documento de la vista; el diario no se toca
            await s.SaveChangesAsync();
        }

        await Vistas.Rearmar(daemon.Host, "VistaSuspendida");

        await using (var s = daemon.Store.LightweightSession())
        {
            s.Events.Append("emp-65", new EmpresaReactivada());   // un hecho después de rearmar
            await s.SaveChangesAsync();
        }
        await daemon.Host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));   // el daemon del host siguió

        await using var q = daemon.Store.QuerySession();
        var vista = Assert.Single(await q.Query<VistaSuspendida>().ToListAsync());   // el rearmado la sacó del diario
        Assert.Equal("mora", vista.Motivo);
        Assert.False(vista.Suspendida);
    }
}
```

Corre `dotnet test`: verde. Comenta la llamada a `Rearmar` y corre `dotnet test --filter RearmarTests`: cae en el `Assert.Equal` del motivo. El daemon no rejuega lo que ya proyectó, y el documento renace a medias, solo con la reactivación. Descoméntala. Ahora quita el `ResumeAsync` del `finally` y corre `dotnet test --filter RearmarTests`: cae con `TimeoutException`. El rearmado salió bien, pero el daemon del host quedó en pausa, y la reactivación nunca llega a la vista. Devuélvelo.

## 🔨 Rómpelo: el borrado a medias

Tu `Suspensiones` suma, y tu orden del Paso 1 le dio a cada empresa su cuenta. En el listado imprime también `suspensiones={v.Suspensiones}`:

```
emp-14: motivo=mora suspensiones=13      (tu cuenta depende de cuántas veces la suspendiste)
```

Ahora el atajo a medias. Con tu programa detenido, borra en `psql` solo el progreso, sin los documentos: `DELETE FROM mt_event_progression WHERE name = 'VistaSuspendida:All';`. Arranca y lista otra vez: cada cuenta sale al doble, `emp-14: motivo=mora suspensiones=26`. El daemon rejugó el diario encima de los documentos que ya estaban, y cada suspensión sumó otra vez. Una vista que asigna, como `Suspendida = true`, aguanta eso; una que suma, no. Rearma con tu orden: vuelve a su cuenta, porque `RebuildProjectionAsync` borra los documentos y el progreso juntos. En la marcha normal no pasa: el daemon escribe los documentos y su progreso en la misma transacción. Asistente tiene dos vistas que suman costos y tokens, sin forma de rearmarlas.

## 🔨 Rómpelo 2: el reloj en la vista · no lo saltes

[El tablero cruza streams](./el-tablero-cruza-streams.md) parte de lo que dejas aquí: el `Apply` que recibe el hecho envuelto, `IEvent<T>`, y tu `SuspendidaDesde`.

Soporte quiere saber también desde cuándo está suspendida cada una. Súmale a `VistaSuspendida` un `public DateTimeOffset? SuspendidaDesde { get; set; }`, y en el `Apply` de `EmpresaSuspendida`, `v.SuspendidaDesde = DateTimeOffset.UtcNow;`. Rearma, y en tu listado imprime `desde={v.SuspendidaDesde:HH:mm}`, en UTC. Todas las suspendidas salen con la hora del rearmado: la vista dice cuándo la proyectaste, no cuándo pasó. En Asistente, la facturación de cada período sale de la fecha en que proyecta el daemon. Con el daemon caído dos días, todo el consumo va al día del arranque; con un rearmado, a hoy.

> 🆕 **El hecho con sus metadatos: `IEvent<T>`.** Un `Apply` puede recibir el hecho envuelto: `Apply(IEvent<EmpresaSuspendida> e, VistaSuspendida v)`. Es tu sobre de [Concurrencia optimista](./concurrencia-optimista.md): el hecho va en `e.Data`, y a su lado lo que Marten anotó al guardarlo. `e.Timestamp` es la hora del commit, la columna `timestamp` de `mt_events`. `IEvent` vive en `JasperFx.Events`.

Cambia ese `Apply`: que reciba `IEvent<EmpresaSuspendida>`, lea el motivo de `e.Data.Motivo` y guarde `e.Timestamp`. Rearma: cada suspendida vuelve a la hora de su último `empresa_suspendida` en `mt_events` (para emp-64, `SELECT max(timestamp) FROM mt_events WHERE stream_id = 'emp-64' AND type = 'empresa_suspendida';`), y rearmar otra vez da lo mismo. Una proyección es función de sus hechos: no lee el reloj ni llama afuera.

## El Descubrimiento

Tu `Reconstruir()` de [Reconstruir la vista](./reconstruir-la-vista.md) es `RebuildProjectionAsync`: borra la vista y su progreso juntos, rejuega el diario y vuelve. Corre en un daemon armado a demanda, y por eso rearma también lo que el daemon del servicio no corre, como las vistas `Inline`. Con el daemon vivo, la orden lo pausa mientras trabaja, como el reset de [El daemon](./el-daemon-y-la-consistencia-eventual.md), y un test la ensaya antes de que haga falta. Y rearmar solo sirve si la proyección es función de sus hechos: puede sumar si se rearma entera, y la hora sale del hecho, nunca del reloj. Hoy, ninguna de las vistas de los once servicios con event sourcing de la organización tiene un camino de vuelta ensayado.

> 🌱 `VistaSuspendida` y `EmpresaDetalle` se alimentan cada una del stream de una empresa. La pregunta que dejó [El proceso tiene dueño](./el-proceso-tiene-dueno.md) —¿en qué va cada suspensión, con el nombre y el plan de su empresa?— junta hechos de **dos** tipos de stream, y una proyección por stream no la responde. Lo resuelves en [El tablero cruza streams](./el-tablero-cruza-streams.md).

## ✅ Compruébalo

- [ ] Borrar `EmpresaDetalle` en `psql` no la rearmó, y el motivo nuevo solo apareció en la suspensión nueva.
- [ ] `Vistas.Rearmar` rearma una vista `Async` y una `Inline` con el host corriendo, pausando y reanudando su daemon.
- [ ] `RearmarTests` pasa; sin el rearmado, el documento renace a medias, y sin el `ResumeAsync`, cae con `TimeoutException`.
- [ ] Borrando solo el progreso, viste duplicarse `Suspensiones`; con tu orden, volvió a su cuenta.
- [ ] Con `DateTimeOffset.UtcNow`, el rearmado le puso a todo su propia hora; con `e.Timestamp`, cada suspensión conserva la suya.

## 🆘 Si algo salió mal

- **`No registered projection matches the name …`:** el nombre es el del read model, `VistaSuspendida` o `EmpresaDetalle`, no el de la clase de la proyección. El mensaje lista los que hay. Si tu `ResumeAsync` no está en el `finally`, esa excepción deja el daemon en pausa.
- **`No service for type 'JasperFx.Events.Daemon.IProjectionCoordinator'`:** el host no registra el daemon. Revisa el `AddAsyncDaemon` del host, también el del fixture.
- **Tras rearmar, la vista no avanza con hechos nuevos:** el coordinador quedó en pausa. Revisa que `ResumeAsync` esté en el `finally`.
- **La espera lanza `TimeoutException` y el log dice `ProgressionProgressOutOfOrderException`:** dos daemons proyectaron la misma vista: rearmaste sin pausar, o con otra copia de tu programa corriendo. Detén la otra y rearma otra vez.
- **`IEvent<EmpresaSuspendida>` no compila:** falta `using JasperFx.Events;`, y el motivo ahora se lee de `e.Data.Motivo`.

## 📓 Registra tu avance

Deja el procedimiento en tu `DECISIONES.md`:

> Rearmar una vista es una orden, no un DELETE: `Vistas.Rearmar` pausa el daemon del servicio, rejuega el diario y lo reanuda, y un test la ensaya. La corro cuando nace una vista, cuando cambia su forma y cuando corrijo un `Apply`; una `Inline`, sin escrituras. Tarda lo que tarda rejugar el diario (hoy, ___ ms), y mientras tanto esa vista sale vacía o a medias, y las demás `Async` se quedan quietas. Mis proyecciones no leen el reloj ni llaman afuera.

> 💭 **Reto:** ¿qué vista de tu sistema suma en vez de asignar? ¿Qué le pasaría si alguien rejugara el diario encima de sus documentos? Y: ¿qué vería un usuario mientras la rearmas?

```bash
git add .
git commit -m "ES · Reconstruir con el daemon" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Rearmar una vista es tu orden: pausa el daemon del servicio y corre `RebuildProjectionAsync` en un daemon armado a demanda, que borra documentos y progreso juntos y rejuega el diario; sirve para `Async` e `Inline`, un test la ensaya, y solo funciona si la proyección es función de sus hechos, sin reloj ni llamadas afuera.

---

[⬅️ Volver: La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md)

[➡️ Siguiente: El tablero cruza streams](./el-tablero-cruza-streams.md)
