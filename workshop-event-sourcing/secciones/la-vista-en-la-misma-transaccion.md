# La vista en la misma transacción

En [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) elegiste `Async` para `VistaSuspendida`, y la otra forma, `Inline`, quedó sin construir. Mientras tanto, un lector sigue sin vista: el handler que le contesta a Facturación el plan de una empresa.

## 🎯 El Objetivo

Que la pregunta por el plan la conteste una vista que Marten escribe en la misma transacción del hecho, sin ir atrás del diario. Y que cada vista diga en tu código por qué es `Async` o `Inline`.

## 💥 El dolor: la lectura vive en el agregado, y la vista que tienes va atrás

Tu `ConsultarPlanHandler` contesta rehidratando `Empresa`: cada pregunta rejuega la historia entera de la empresa. Mírala en `psql`: `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-14';` cuenta decenas de hechos para contestar un plan, y crece con cada suspensión. Direcciones contesta así su consulta por id, rehidratando el agregado de escritura, y un cambio en ese agregado le cambia la respuesta.

`VistaSuspendida` ya guarda el plan de hoy, y leerla es un solo documento. Mira si sirve. De tu `Program.cs`, quita los pasos de [El daemon](./el-daemon-y-la-consistencia-eventual.md) y deja el host, `store` y `bus`. Después de `await host.StartAsync()`, registra una empresa, cámbiale el plan y lee la vista enseguida:

```csharp
await bus.InvokeAsync(new RegistrarEmpresa("emp-61", "906100000", "Ferretería Llano", "Basico"));
await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5));   // la vista parte al día
await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-61", "Premium"));
await using (var q = store.QuerySession())
{
    var vista = await q.LoadAsync<VistaSuspendida>("emp-61");
    Console.WriteLine($"VistaSuspendida dice: {vista!.Plan}");
}
// VistaSuspendida dice: Basico
```

La empresa ya es Premium, y la vista dice Basico: el daemon todavía no proyecta el `PlanCambiado`. Si `ConsultarPlanHandler` contestara desde ella, Facturación recibiría Basico. `Planes.De` le pregunta a Empresas justo cuando no sabe el plan, y guardaría esa respuesta vieja en su réplica. Si el dueño contesta desde una vista atrasada, preguntarle no compra nada. Quita el registro y la espera tras la primera corrida: volver a registrar emp-61 lanza `ExistingStreamIdCollisionException`.

## 🔧 Una vista que entra con el hecho

La respuesta va en una vista propia, no en `VistaSuspendida`: esa es la de soporte, y si soporte le pide un campo, la respuesta de Facturación no se mueve.

> 🆕 **La proyección `Inline`.** Una proyección registrada con `ProjectionLifecycle.Inline` la corre Marten dentro de tu `SaveChangesAsync`: el documento se escribe en la misma transacción que el hecho. Si el documento no puede entrar, tampoco entra el hecho. No necesita el daemon ni deja fila en `mt_event_progression`. Se escribe igual que la de [El daemon](./el-daemon-y-la-consistencia-eventual.md), con un read model y una `SingleStreamProjection` `partial`.

> 🆕 **La versión, en una vista `Inline`.** `PlanActualV1` lleva la versión de la empresa, desde [La réplica suscrita](./la-replica-suscrita.md). Cuando un handler escribe con versión esperada, la vista `Inline` recibe la versión del hecho. Un `Append` directo no la trae: Marten la calcula en la base al guardar, y la vista la ve en 0. Con 0, la réplica de `Planes.De` deja que cualquier anuncio atrasado la pise. Marten sí guarda la versión junto al documento, en la columna `mt_version`, que llama `Revision`. Con `opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));`, la copia a tu `Version` cada vez que lees el documento.

### Paso 1 · El plan, desde una vista Inline

> 🛠️ **Inténtalo tú.** Haz que la pregunta conteste el plan nuevo, con su versión, sin esperar a nadie. Este bloque reemplaza el cambio de plan y la lectura de antes:
>
> ```csharp
> await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-61", "Enterprise"));
> var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("906100000"));
> Console.WriteLine($"Plan de 906100000: {plan.Plan} (versión {plan.Version})");
> // Plan de 906100000: Enterprise (versión 3)      (la tuya: SELECT version FROM mt_streams WHERE id = 'emp-61';)
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea un read model `EmpresaDetalle` con setters públicos: `Id`, `Plan` y `Version`, un `long`. **(2)** Crea `EmpresaDetalleProjection`, como tu `SuspendidasProjection`, con un `Apply` para `EmpresaRegistrada` y otro para `PlanCambiado`, que guardan el plan. **(3)** En el `AddMarten` de tu `Program.cs`, regístrala `ProjectionLifecycle.Inline`, junto a la de [El daemon](./el-daemon-y-la-consistencia-eventual.md), y agrega la línea de `Metadata`. **(4)** Que `ConsultarPlanHandler` cargue `EmpresaDetalle` en vez de rehidratar, y conteste con su plan y su versión.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: el read model que contesta el plan
using Marten.Events.Aggregation;    // SingleStreamProjection

public class EmpresaDetalle
{
    public string Id { get; set; } = "";
    public string Plan { get; set; } = "";
    public long Version { get; set; }   // la llena Marten al leer, desde mt_version
}

public partial class EmpresaDetalleProjection : SingleStreamProjection<EmpresaDetalle, string>
{
    public void Apply(EmpresaRegistrada e, EmpresaDetalle d) => d.Plan = e.Plan;
    public void Apply(PlanCambiado e, EmpresaDetalle d)      => d.Plan = e.NuevoPlan;
}
```

```csharp
// Empresas.Historia/Program.cs, dentro de AddMarten
opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);
opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);             // nuevo
opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));     // nuevo
```

```csharp
// ConsultarPlanHandler: la respuesta sale de la vista, no del agregado
var detalle = await session.LoadAsync<EmpresaDetalle>(await Localizador.StreamDe(session, q.Nit))
    ?? throw new InvalidOperationException($"No existe la empresa del NIT {q.Nit}");
return new PlanActualV1(q.Nit, detalle.Plan, detalle.Version);
```

</details>

> 🔍 **¿Lo lograste?** Sale `Enterprise` al instante: el documento entró con el hecho. `SELECT name FROM mt_event_progression;` no tiene fila de `EmpresaDetalle`, porque el daemon no la corre. Ahora comenta la línea de `Metadata` y, en lugar del cambio por el bus, cambia el plan con un `Append` directo, `s.Events.Append("emp-61", new PlanCambiado("Premium"))` en una sesión con su `SaveChangesAsync`, y pregunta: `(versión 0)`. Devuelve la línea y repite con otro plan: la versión sale bien.

## 🔨 Rómpelo: la vista no es un candado · no lo saltes

[Reconstruir con el daemon](./reconstruir-con-el-daemon.md) parte de lo que dejas aquí: el `Nit` de `EmpresaDetalle`, y tu `ReservaDelNitTests`.

Súmale a `EmpresaDetalle` un `Nit`, y que el `Apply` de `EmpresaRegistrada` lo guarde: `{ d.Nit = e.Nit; d.Plan = e.Plan; }`. Con el NIT en la vista, es tentador usarla para la unicidad: mirar si el NIT ya existe antes de registrar. Así lo hacen Terceros y EstructuraOrganizacional. Pruébalo en un test, con tu `HostConDaemon` de [El daemon](./el-daemon-y-la-consistencia-eventual.md): el reset de cada test deja la base de pruebas limpia. Primero, en el `AddMarten` del fixture, agrega las dos líneas de `EmpresaDetalle`, como en tu `Program.cs`. Luego escribe este test:

```csharp
// Empresas.Tests/ReservaDelNitTests.cs
using Marten;

[Collection("daemon")]
public class ReservaDelNitTests(HostConDaemon daemon) : IAsyncLifetime
{
    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    async Task<bool> Registrar(string id, string nit)   // registra mirando la vista, sin localizador
    {
        await using var s = daemon.Store.LightweightSession();
        if (await s.Query<EmpresaDetalle>().AnyAsync(d => d.Nit == nit)) return false;   // ese NIT ya tiene empresa
        s.Events.StartStream<Empresa>(id, new EmpresaRegistrada(nit, "Ópticas Llano", "Basico"));
        try { await s.SaveChangesAsync(); return true; }
        catch (JasperFx.DocumentAlreadyExistsException) { return false; }   // lo que lanza el store si rechaza al segundo
    }

    [Fact]
    public async Task Dos_registros_del_mismo_NIT_a_la_vez_dejan_una_empresa()
    {
        var entraron = await Task.WhenAll(Registrar("emp-62", "906200000"), Registrar("emp-63", "906200000"));
        Assert.Single(entraron, entro => entro);   // exactamente un true
    }
}
```

Corre solo este test, `dotnet test --filter ReservaDelNitTests`: cae con `Assert.Single() Failure: The collection contained 2 matching items`. Los dos miraron la vista antes de que el otro escribiera: es la carrera de [El swap](./el-swap-por-reconocimiento.md), ahora con una vista. Mirar no reserva nada.

> 🆕 **Un índice único sobre un documento.** `opts.Schema.For<EmpresaDetalle>().UniqueIndex(d => d.Nit);` le pide a Marten un índice único de Postgres sobre el `Nit` de `mt_doc_empresadetalle`: una regla de la tabla, no una tabla aparte como tu localizador. Como la vista es `Inline`, entra en la transacción del hecho. Si otro documento ya tiene ese NIT, `SaveChangesAsync` lanza `JasperFx.DocumentAlreadyExistsException`, como tu localizador, y no entra nada.

Agrega esa línea al `AddMarten` del fixture y corre otra vez: verde. Ahora cambia, en el fixture, `EmpresaDetalleProjection` a `Async`: rojo otra vez. Los dos registros entran: el daemon escribe el documento después, fuera de su transacción. El índice lo rechaza entonces, cuando los dos hechos ya están en el diario, y esa vista se detiene. Con un índice sobre una vista, la unicidad depende de que la vista sea `Inline`. Vuelve a ponerla `Inline`.

Tu NIT ya tenía una reserva: el localizador que inserta tu `RegistrarEmpresaHandler`, desde [El swap](./el-swap-por-reconocimiento.md). El índice es otra, con la misma garantía: el store rechaza al segundo en la transacción del hecho. Una sobra. El taller sigue con el localizador, porque no depende del ciclo de vida de ninguna vista. Quita el índice del fixture, y que `Registrar` registre con tu handler, en lugar de mirar la vista y abrir el stream: `RegistrarEmpresaHandler.Handle(new RegistrarEmpresa(id, nit, "Ópticas Llano", "Basico"), s);`. Cambia también su comentario: ya no mira la vista. El test sigue verde, y ahora vigila la reserva que usas.

## 🔨 Rómpelo 2: la vista Async sin daemon · no lo saltes

[Reconstruir con el daemon](./reconstruir-con-el-daemon.md) parte de lo que dejas aquí: emp-64, registrada.

En tu `Program.cs`, comenta la línea `.AddAsyncDaemon(DaemonMode.Solo);` y pon su `;` al final de `.IntegrateWithWolverine()`. En lugar del bloque del Paso 1, pon este:

```csharp
await bus.InvokeAsync(new RegistrarEmpresa("emp-64", "906400000", "Panadería Llano", "Basico"));
await Task.Delay(3000);   // de sobra para que un daemon proyecte
await using (var q = store.QuerySession())
{
    var detalle = await q.LoadAsync<EmpresaDetalle>("emp-64");
    var vista = await q.LoadAsync<VistaSuspendida>("emp-64");
    Console.WriteLine($"EmpresaDetalle: {detalle?.Plan ?? "(no existe)"}   VistaSuspendida: {vista?.Plan ?? "(no existe)"}");
}
// EmpresaDetalle: Basico   VistaSuspendida: (no existe)
```

La vista `Inline` está; la `Async` no existe, y nada falla. El único aviso es una línea al arrancar, `Warning: The async daemon is disabled`, que en un servidor nadie lee. La guía de EstructuraOrganizacional dice `Async`, y su host de comandos no corre el daemon: la próxima vista que alguien registre siguiendo la guía quedará vacía. Descomenta el `AddAsyncDaemon`, quita el `;` que pusiste tras `.IntegrateWithWolverine()`, quita el `RegistrarEmpresa` de emp-64 y corre otra vez: el daemon proyecta emp-64, y la vista dice `Basico`.

## 🔧 El ciclo de vida, escrito

El registro dice `Inline` o `Async`, pero no por qué. Escríbelo al lado, con lo que se rompe si alguien lo cambia:

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, dentro de AddMarten
opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);       // Async: solo la mira soporte; sin AddAsyncDaemon no avanza, y no avisa
opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);   // Inline: Facturación cobra con su respuesta; en Async cobra el plan viejo
```

</details>

Radicación lo escribe en una decisión de arquitectura: tres vistas `Inline`, que un proceso lee enseguida, y nueve `Async`, para la pantalla. Terceros tiene la `Inline` correcta, pero su comentario y su guía dicen `Async`: el siguiente que registre una vista seguirá la guía.

## El Descubrimiento

Una vista `Inline` es tu vista de [La vista de lectura](./la-vista-de-lectura.md), la que el handler actualizaba, pero sin el dual-write: Marten la escribe en la misma transacción del hecho. El ciclo de vida se elige por quién lee y cuándo: `Inline` si alguien la lee justo después de escribir, como Facturación al cobrar; `Async` si es para mostrar. Ninguna sirve para decidir una escritura: eso va contra el stream. La lectura sale de una vista, no del agregado. Una vista tampoco es un candado. El candado es un índice único del store, en la transacción del hecho: tu localizador, o un índice sobre una vista mientras sea `Inline`.

> 🌱 Mira emp-61: `SELECT data->>'Nit' FROM mt_doc_empresadetalle WHERE id = 'emp-61';` sale vacío. Le sumaste el NIT a la vista, y el documento de emp-61 no lo tiene. Pregunta el plan de una empresa de antes, `901100000`: `ConsultarPlanHandler` lanza `No existe la empresa del NIT 901100000`, y hasta la siguiente sección Facturación no puede preguntar por ella. Llenar `EmpresaDetalle` con la historia, y rearmar cualquier vista cuando cambie su forma, es [Reconstruir con el daemon](./reconstruir-con-el-daemon.md).

## ✅ Compruébalo

- [ ] Justo después de un cambio de plan, viste a `VistaSuspendida` con el plan viejo.
- [ ] `EmpresaDetalle` es `Inline`: la pregunta contesta el plan nuevo al instante, con su versión, y no hay fila suya en `mt_event_progression`.
- [ ] Sin la línea de `Metadata`, un `Append` directo dejó la versión en 0.
- [ ] Mirando la vista antes de registrar, `ReservaDelNitTests` cae: entran los dos. Con el índice único sobre la vista `Inline`, pasa; con la vista `Async`, vuelve a caer.
- [ ] Quitaste el índice, y el test pasa registrando con tu `RegistrarEmpresaHandler`.
- [ ] Sin `AddAsyncDaemon`, viste la vista `Async` vacía y la `Inline` al día, sin un error.
- [ ] Cada registro de tu `AddMarten` dice al lado por qué es `Inline` o `Async`.

## 🆘 Si algo salió mal

- **`EmpresaDetalleProjection` no compila:** falta `using Marten.Events.Aggregation;`, donde vive `SingleStreamProjection`, o la clase no es `partial`, como la de [El daemon](./el-daemon-y-la-consistencia-eventual.md).
- **`AnyAsync` no existe sobre la consulta:** falta `using Marten;` en el archivo del test.
- **El test pasa sin el índice:** los dos registros no coincidieron esa vez. Corre otra vez.
- **El test con el índice sigue en rojo:** pusiste la línea en tu `Program.cs` y no en el `AddMarten` del fixture, o el fixture registra la vista `Async`.
- **Al arrancar, `MartenSchemaException` con `could not create unique index "mt_doc_empresadetalle_uidx_nit"`:** la tabla ya tiene dos documentos con el mismo NIT, y Postgres no crea el índice sobre ellos. En la base de pruebas, el reset los borra antes de crearlo. En tu base, no pongas el índice: el taller no lo usa.
- **`VistaSuspendida dice: Premium` en el dolor:** el daemon proyectó antes de la lectura. Pasa pocas veces. Para verlo de nuevo, cambia a otro plan y corre otra vez.
- **No compila al devolver el daemon:** quedó un `;` al final de `.IntegrateWithWolverine()`. El `;` va solo al final de `.AddAsyncDaemon(DaemonMode.Solo)`.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Una vista es `Inline` si alguien la lee justo después de escribir (`EmpresaDetalle`, con la que Facturación cobra), y `Async` si es para mostrar (`VistaSuspendida`); el porqué va al lado de cada registro. Ninguna decide una escritura. El NIT se reserva en el localizador: un índice sobre una vista protege solo mientras la vista sea `Inline`.

> 💭 **Reto:** ¿qué vista de tu sistema lee alguien justo después de escribir, y cuál solo se muestra? ¿Qué le pasaría a cada una si alguien cambiara su ciclo de vida?

```bash
git add .
git commit -m "ES · La vista en la misma transacción" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una vista `Inline` se escribe en la misma transacción del hecho y no va atrás, y por eso responde a quien lee justo después de escribir; una `Async` va atrás y solo avanza con un daemon; la vista no es un candado, el índice del store sí; y el porqué de cada ciclo de vida queda escrito junto a su registro.

---

[⬅️ Volver: El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md)

[➡️ Siguiente: Reconstruir con el daemon](./reconstruir-con-el-daemon.md)
