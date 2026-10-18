# El swap por reconocimiento

La sección pasada cerró con una frase: *"la salida madura no es armarlo: es reconocer que ya existe hecho y correcto."* Es hora de reconocerlo.

## 🎯 El Objetivo

Cambiar tu **diario** a mano por **Marten**, sobre la **misma** Postgres, reconociendo en la librería cada pieza que construiste: los hechos, la concurrencia, la rehidratación, el NIT único y los nombres estables.

## 💥 El dolor: mantener a mano lo que una librería ya resolvió

El dolor es la **suma** de los que ya viviste. Esto es lo que llevas escrito a mano, y a qué corresponde en la librería:

| Lo que construiste a mano | Lo que ya es de la librería | Cuándo lo adoptas |
|---|---|---|
| Tabla `eventos` + `GetEvents`/`Guardar` (SQL crudo) | El **event store** de Marten (`StartStream`, `Append`) | **hoy** |
| `PRIMARY KEY(stream, version)` para la concurrencia | Concurrencia optimista de Marten (integrada) | **hoy** |
| Rehidratar con `AbrirStream<Empresa>(id).Get()` | `AggregateStreamAsync<Empresa>(id)` | **hoy** |
| Tabla `localizador` + `GuardarNuevo`, de [Dos streams, la misma clave](./dos-streams-misma-clave.md) | Un **documento** de Marten, `Localizador`, con `session.Insert` en la sesión del `StartStream` | **hoy** |
| El mapa `_porNombre`, de [El nombre del hecho es un contrato](./el-nombre-es-un-contrato.md) | El **alias** de cada hecho: `AddEventType<T>()`, y `MapEventType<T>("alias")` si la clase cambia de nombre | **hoy** |
| El `Upcast(json)` de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md) | El upcaster de Marten, `opts.Events.Upcast<V1, V2>(…)`, o un default en el `record` | cuando cambie la forma de un hecho |
| `seq` + `CorrerProyector()` + tabla `checkpoint` + la vista `Suspendidas` | El **daemon** async de Marten + una proyección | [El daemon](./el-daemon-y-la-consistencia-eventual.md) |
| `bandeja_salida` + `EntregarPendientes` + el claim | El **outbox** de **Wolverine** | [El outbox](./el-outbox.md) |
| El puerto `IEventStore` + el doble en memoria | Una plantilla: `AggregateRoot` + una `MartenUnitOfWork` + el doble | [La plantilla](./la-plantilla.md) y [La plantilla se prueba](./la-plantilla-se-prueba.md) |

Cada fila de la izquierda es código tuyo que mantener, con sus bordes. La de la derecha es lo mismo, probado, sobre la Postgres que ya usas. Construiste la izquierda **para entenderla**; la cambias por la derecha **por alivio**.

Dos filas de **hoy** no se adoptan solas. `StartStream` no escribe el localizador ni mira el NIT: si registras solo con `StartStream`, nacen dos streams con el mismo NIT, como en §23. Y Marten nombra cada hecho por su clase: renombrarla vuelve a romper la historia, como en §14. Las adoptas en los Pasos 4 y 5.

## 🔧 Adoptar Marten como tu diario

> 🆕 **Marten: tu diario, hecho librería.** Marten es una librería de event sourcing sobre Postgres. `session.Events.StartStream` nace un stream; `session.Events.Append` agrega hechos a uno existente; `session.Events.AggregateStreamAsync<Empresa>(id)` **rehidrata** reproduciendo los hechos, como tu `AbrirStream(id).Get()`. La concurrencia optimista está integrada: `Append(id, versión, hecho)` rechaza la escritura si el stream avanzó. Ese número es la versión que tendrá el stream **tras** el append (la leída más los hechos que agregas), como la posición que declaraba tu sobre en [Concurrencia optimista](./concurrencia-optimista.md). El store sale de `DocumentStore.For(...)`, **sin host ni inyección de dependencias** todavía: eso llega en [El host y la inyección](./el-host-y-la-inyeccion.md).

> ⚠️ **Marten 9 es async, y eso no es consistencia eventual.** En Marten 9, leer y guardar son `await`: Marten no bloquea hilos mientras espera a la base. Lo que guardas, lo ves al rehidratar enseguida. La **consistencia eventual**, la vista que va atrás, vive en el **daemon**, que llega en [El daemon](./el-daemon-y-la-consistencia-eventual.md).

### Paso 1 · El store (se muestra, no se reta)

Primero, el paquete:

```bash
dotnet add Empresas.Historia package Marten
```

```csharp
using Marten;
using JasperFx.Events;   // StreamIdentity

var store = DocumentStore.For(opts =>
{
    opts.Connection(cadena);                                // tu cadena de siempre, la de CADENA_POSTGRES
    opts.Events.StreamIdentity = StreamIdentity.AsString;   // tus ids son "emp-7", no Guid
});
```

Tu `Program.cs` ya declara un `store`: el `PostgresEventStore` de §23–§30. Renómbralo a `viejo`, donde lo declaras y donde lo usas. Desde aquí, `store` es el de Marten; el `viejo` se va en el Paso 3.

### Paso 2 · Adapta tu `Empresa`

> 🛠️ **Inténtalo tú.** Tu `Empresa` conserva sus propiedades y pierde su base y sus verbos. En vez de tu `Aplicar(object)` con `switch`, escribe un `Apply` por tipo de hecho: `Apply(EmpresaRegistrada e)`, `Apply(PlanCambiado e)`… Marten los **descubre por convención**, en código compilado: es el `Aplicar` por tipo que [Refactorizando el motor](./refactorizando-el-motor.md) descartó por usar `dynamic`. Deja los setters **privados**: Marten rehidrata reproduciendo los hechos, no deserializando propiedades. Añade una propiedad `Id` (string).
>
> Quita también `: AggregateRoot`: sin el `switch`, nadie implementa su `Aplicar(object)` abstracto. Con la base se van los verbos que llaman a `Emitir` (`Registrar`, `CambiarPlan`, `Suspender`, `RegistrarPago`, `Reactivar`): coméntalos. La base y los verbos vuelven en [La plantilla](./la-plantilla.md). Lo que llamaba a esos verbos deja de compilar: lo comentas en el Paso 3.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Id { get; private set; }
    public string Nit { get; private set; }        // sigue guardando lo que ya guardabas
    public string Nombre { get; private set; }
    public string Plan { get; private set; }
    public bool Suspendida { get; private set; }
    public int Reactivaciones { get; private set; }
    // (tu Empresa conserva también DeudaPendiente y su Apply(PagoRegistrado); los omitimos aquí para no alargar)

    public void Apply(EmpresaRegistrada e) { Nit = e.Nit; Nombre = e.Nombre; Plan = e.Plan; }
    public void Apply(PlanCambiado e)      { Plan = e.NuevoPlan; }
    public void Apply(EmpresaSuspendida e) { Suspendida = true; }
    public void Apply(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }
}
```

</details>

### Paso 3 · Escribir, rehidratar, y la concurrencia

> 🛠️ **Inténtalo tú.** Con una sesión (`store.LightweightSession()`), nace un stream con `StartStream`, agrégale hechos con `Append`, rehidrátalo con `AggregateStreamAsync`, y mira la concurrencia optimista rechazar un choque. Para el choque, abre **dos** sesiones que lean la misma versión con `FetchStreamStateAsync`; cada una appendea un hecho con la versión que tendrá el stream tras él. La primera entra y la segunda lanza.
>
> Antes de correr, borra tu diario a mano: la tabla `eventos` (`DROP TABLE eventos;` en `psql`), y `GetEvents` y `Guardar`, de tu `IEventStore` y de tu `PostgresEventStore`. Deja de compilar lo que usaba esos métodos o los verbos del Paso 2: `EventStream` y `AbrirStream`, los handlers de instancia (`SuspenderHandler`, `CambiarPlanHandler`, `PagarDeudaHandler`) y `CorrerProyector`. Coméntalos ya, con `/* … */` o con `#if false` … `#endif`. Comenta también el `Despachador` con su `ICommandHandler<T>`: ya no hay handlers que registrar. Deja la clase `AggregateRoot`: compila sola. En tu `Program.cs`, comenta tu `viejo` y todo lo que lo usa: el registro de emp-7 de §23, el despachador, la entrega de la bandeja y el proyector con sus corridas. La escritura que comentas vuelve en [El outbox](./el-outbox.md), y la lectura en [El daemon](./el-daemon-y-la-consistencia-eventual.md).

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// nacer un stream nuevo (tu registro, menos la fila del localizador) — todo async
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-7",
        new EmpresaRegistrada("900123", "Andes", "Basico"), new EmpresaSuspendida("mora"));
    await s.SaveChangesAsync();
}

// agregar hechos a un stream existente
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-7", new EmpresaReactivada());
    await s.SaveChangesAsync();
}

// rehidratar (tu AbrirStream(...).Get(), ahora de Marten): reproduce los hechos, respeta tus setters privados
await using (var s = store.LightweightSession())
{
    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-7");
    Console.WriteLine($"Suspendida={e!.Suspendida} Reactivaciones={e.Reactivaciones} Plan={e.Plan}");   // Suspendida=False Reactivaciones=1 Plan=Basico
}
```

```csharp
// concurrencia optimista, integrada: dos escritores leen la misma versión de emp-7
await using var a = store.LightweightSession();
await using var b = store.LightweightSession();
var estadoA = await a.Events.FetchStreamStateAsync("emp-7");   // Version == 3
var estadoB = await b.Events.FetchStreamStateAsync("emp-7");   // Version == 3: la misma

// el número es la versión que tendrá el stream TRAS el append: la leída + los hechos que agregas
a.Events.Append("emp-7", estadoA!.Version + 1, new EmpresaSuspendida("x"));
await a.SaveChangesAsync();   // el primero entra: emp-7 queda en la versión 4

b.Events.Append("emp-7", estadoB!.Version + 1, new EmpresaSuspendida("x"));
await b.SaveChangesAsync();   // el segundo lanza EventStreamUnexpectedMaxEventIdException — tu ConcurrencyException, de Marten
```

</details>

## 🔨 Rómpelo: comprueba que Marten hace lo tuyo

En el Paso 3, el segundo escritor lanza `EventStreamUnexpectedMaxEventIdException`: es tu `ConcurrencyException`, impuesta por Marten. Ahora comenta el bloque que nace `emp-7` y el que le agrega la reactivación: `emp-7` ya existe. Quita el `+ 1` y pásale a `Append` la versión leída. Envuelve cada `SaveChangesAsync` en un `try`/`catch` que escriba la excepción, para que el primer fallo no corte el programa, y vuelve a correr: fallan **los dos**. Marten compara con la versión que dejará el append, no con la que leíste.

## 🔧 El NIT, dentro de la transacción del hecho

> 🆕 **Marten también guarda documentos.** Un documento es un objeto que Marten guarda como JSON, en una tabla propia de su clase: para `Localizador`, la tabla `mt_doc_localizador`. Su propiedad `Id` es la llave, como el `PRIMARY KEY` de tu tabla `localizador`. `session.Insert(doc)` anota el documento en la sesión, como `StartStream` anota el stream. Nada se escribe hasta `SaveChangesAsync`, y entonces todo lo anotado entra en **una** transacción. Si ya hay un documento con ese `Id`, `SaveChangesAsync` lanza `JasperFx.DocumentAlreadyExistsException` y no entra nada: ni el documento, ni el stream, ni sus hechos.

> ⚠️ **`Insert`, no `Store`.** `session.Store(doc)` también guarda un documento, pero si el `Id` ya existe, lo sobrescribe sin avisar: el segundo registro del mismo NIT entra, y quedan dos empresas con ese NIT.

### Paso 4 · El registro, con su NIT

> 🛠️ **Inténtalo tú.** Haz que esto funcione:
>
> ```csharp
> await using (var s = store.LightweightSession())
> {
>     Sembrar(s, "emp-17", "901700000", "Vivero Andino", "Basico");
>     await s.SaveChangesAsync();   // entra: el localizador y el stream, en una transacción
> }
> await using (var s = store.LightweightSession())
> {
>     Sembrar(s, "emp-18", "901700000", "Vivero Andino", "Basico");
>     await s.SaveChangesAsync();   // lanza JasperFx.DocumentAlreadyExistsException: ese NIT ya tiene empresa
> }
> ```
>
> Para eso: **(1)** Crea en `Empresas.Historia` la clase `Localizador`, con dos propiedades `string` con `get; set;`: `Id`, que guarda el NIT, y `Stream`. **(2)** Escribe en tu `Program.cs` un método `void Sembrar(IDocumentSession session, string id, string nit, string nombre, string plan)`. Que anote en esa sesión el `Insert` del localizador y el `StartStream` con el `EmpresaRegistrada`. No llama a `SaveChangesAsync`: lo llama quien lo usa, una vez para los dos. **(3)** Borra tu tabla `localizador` en `psql` (`DROP TABLE localizador;`): el NIT vive ahora en `mt_doc_localizador`, que Marten crea al primer `Insert`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: el localizador de §23, ahora un documento de Marten
public class Localizador
{
    public string Id { get; set; } = "";       // el NIT: la llave del documento
    public string Stream { get; set; } = "";   // el stream de esa empresa
}
```

```csharp
// Empresas.Historia/Program.cs: el registro con su NIT, en una sola sesión
void Sembrar(IDocumentSession session, string id, string nit, string nombre, string plan)
{
    session.Insert(new Localizador { Id = nit, Stream = id });                            // reserva el NIT
    session.Events.StartStream<Empresa>(id, new EmpresaRegistrada(nit, nombre, plan));   // y nace el stream
}
```

Es tu `GuardarNuevo` de [Dos streams, la misma clave](./dos-streams-misma-clave.md): la `PRIMARY KEY` es el `Id` del documento, y la transacción la abre `SaveChangesAsync`. Desde aquí, toda empresa nueva nace con `Sembrar`, también en las secciones que siguen.

</details>

> 🔍 **¿Lo lograste?** El segundo `SaveChangesAsync` lanza, y emp-18 no existe. Míralo en `psql`:
>
> ```sql
> SELECT id, data FROM mt_doc_localizador;
> -- 901700000 | {"Id": "901700000", "Stream": "emp-17"}
> SELECT id FROM mt_streams WHERE id IN ('emp-17', 'emp-18');
> -- emp-17
> ```
>
> Después, comenta los dos bloques: emp-17 ya existe, y volver a sembrarla lanza `ExistingStreamIdCollisionException`.

## 🔨 Rómpelo: dos registros del mismo NIT, a la vez

El Paso 4 registró uno tras otro. En producción, dos peticiones con el mismo NIT llegan a la vez, y ninguna ve la escritura de la otra antes de escribir la suya.

> 🆕 **Idioma de C#: `Task.WhenAll`.** `await Task.WhenAll(a, b)` espera a que terminen dos tareas que corren a la vez. Devuelve un arreglo con el resultado de cada una, en el orden en que las pasaste.

```csharp
// dos registros del mismo NIT, cada uno en su sesión, a la vez
async Task<string> Intentar(string id)
{
    await using var s = store.LightweightSession();
    Sembrar(s, id, "901800000", "Ópticas del Valle", "Basico");
    try { await s.SaveChangesAsync(); return $"{id}: entró"; }
    catch (JasperFx.DocumentAlreadyExistsException) { return $"{id}: lanzó DocumentAlreadyExistsException"; }
}
var resultados = await Task.WhenAll(Intentar("emp-18"), Intentar("emp-19"));
Console.WriteLine(string.Join("\n", resultados));
// emp-18: lanzó DocumentAlreadyExistsException
// emp-19: entró          (cuál de las dos entra cambia de una corrida a otra)
```

Entra exactamente una. emp-18 está libre, porque el Paso 4 no dejó nada de ella. Compruébalo en `psql`:

```sql
SELECT data FROM mt_doc_localizador WHERE id = '901800000';
-- {"Id": "901800000", "Stream": "emp-19"}     (el stream de la que entró)
SELECT stream_id, type FROM mt_events WHERE stream_id IN ('emp-18', 'emp-19');
-- emp-19 | empresa_registrada
```

La que perdió no dejó ni stream ni hecho, y esta vez no escribiste la transacción. Comenta el bloque al terminar: correrlo de nuevo lanza `ExistingStreamIdCollisionException` por la que entró.

## 🔧 El nombre del hecho, en Marten

En [El nombre del hecho es un contrato](./el-nombre-es-un-contrato.md) separaste el nombre que va al disco del nombre de la clase. Marten también guarda los dos. Mira el diario de emp-7:

```sql
SELECT version, type, mt_dotnet_type FROM mt_events WHERE stream_id = 'emp-7' ORDER BY version;
-- 1 | empresa_registrada | EmpresaRegistrada, Empresas.Historia
-- 2 | empresa_suspendida | EmpresaSuspendida, Empresas.Historia
-- …
```

> 🆕 **Cómo nombra Marten un hecho.** En `type` va el **alias**: por defecto, el nombre de la clase en minúsculas y con guion bajo (`PlanCambiado` queda `plan_cambiado`). En `mt_dotnet_type` va el tipo de .NET: la clase con su namespace y, tras la coma, su ensamblado. Al leer, Marten busca el alias entre los hechos **registrados**; si el hecho no está registrado, busca el tipo de .NET. Renombrar la clase rompe las dos búsquedas. Moverla de namespace cambia su tipo de .NET, y rompe la lectura si el hecho no está registrado. En los dos casos, Marten lanza `UnknownEventTypeException`.
>
> `opts.Events.AddEventType<T>()` registra un hecho con su alias por defecto: moverlo de namespace ya no rompe nada. `opts.Events.MapEventType<T>("alias")` lo registra con el alias que le das, para cuando la clase cambia de nombre y el diario no. Es tu mapa `_porNombre`, en la config de Marten.

### Paso 5 · Los hechos, en un solo lugar

> 🛠️ **Inténtalo tú.** Haz que este test pase, sin base de datos:
>
> ```csharp
> [Fact]
> public void Cada_hecho_conserva_su_alias()
> {
>     using var store = DocumentStore.For(opts =>
>     {
>         opts.Connection("Host=localhost");   // nunca se conecta: leer los alias no toca la base
>         Hechos.Registrar(opts);
>     });
>     var alias = store.Events.AllKnownEventTypes().ToDictionary(t => t.EventType, t => t.EventTypeName);
>
>     Assert.Equal("plan_cambiado", alias[typeof(PlanCambiado)]);
>     // … y una línea igual por cada uno de tus otros hechos
> }
> ```
>
> Para eso: **(1)** En `Empresas.Historia`, crea una clase `static` `Hechos` con un método `static void Registrar(StoreOptions opts)` que haga `opts.Events.AddEventType<…>()` por cada uno de tus cinco hechos. `StoreOptions` es el tipo del `opts` que recibe `DocumentStore.For` (`using Marten;`). **(2)** En tu `Program.cs`, llama `Hechos.Registrar(opts)` dentro del `DocumentStore.For`: el `Program` y el test usan la misma lista. **(3)** En `Empresas.Tests`, escribe el test con un `Assert` por hecho; su archivo también lleva `using Marten;`. `AllKnownEventTypes()` devuelve los hechos que el store conoce, cada uno con su tipo (`EventType`) y su alias (`EventTypeName`); solo salen los registrados. **(4)** Tus tests de antes usan lo que comentaste en los Pasos 2 y 3: coméntalos también, para que `dotnet test` corra.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: los hechos que Marten conoce, en un solo lugar
using Marten;

public static class Hechos
{
    public static void Registrar(StoreOptions opts)
    {
        opts.Events.AddEventType<EmpresaRegistrada>();
        opts.Events.AddEventType<PlanCambiado>();
        opts.Events.AddEventType<EmpresaSuspendida>();
        opts.Events.AddEventType<EmpresaReactivada>();
        opts.Events.AddEventType<PagoRegistrado>();
    }
}
```

```csharp
// Empresas.Historia/Program.cs: tu store del Paso 1, con la lista
var store = DocumentStore.For(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    Hechos.Registrar(opts);   // los mismos hechos que vigila el test
});
```

```csharp
// Empresas.Tests/NombresDeLosHechos.cs
using Marten;

public class NombresDeLosHechos
{
    [Fact]
    public void Cada_hecho_conserva_su_alias()
    {
        using var store = DocumentStore.For(opts =>
        {
            opts.Connection("Host=localhost");   // nunca se conecta: leer los alias no toca la base
            Hechos.Registrar(opts);
        });
        var alias = store.Events.AllKnownEventTypes().ToDictionary(t => t.EventType, t => t.EventTypeName);

        Assert.Equal("empresa_registrada", alias[typeof(EmpresaRegistrada)]);
        Assert.Equal("plan_cambiado",      alias[typeof(PlanCambiado)]);
        Assert.Equal("empresa_suspendida", alias[typeof(EmpresaSuspendida)]);
        Assert.Equal("empresa_reactivada", alias[typeof(EmpresaReactivada)]);
        Assert.Equal("pago_registrado",    alias[typeof(PagoRegistrado)]);
    }
}
```

Desde aquí, cada hecho nuevo gana su línea en `Hechos.Registrar`. Sin ella, Marten lo guarda igual, pero el día que lo muevas de namespace su historia deja de cargar.

</details>

> 🔍 **¿Lo lograste?** `dotnet test`, desde `Empresas.Tests`, pasa en verde, y tu `Program.cs` corre como antes.

## 🔨 Rómpelo: renombra un hecho

emp-7 todavía no tiene un `PlanCambiado`. Dale uno con un `Append` directo. Antes van el pago y la reactivación: el `Append` directo no revisa tus reglas, así que el orden lo cuidas tú.

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-7", new PagoRegistrado(50_000), new EmpresaReactivada(), new PlanCambiado("Premium"));
    await s.SaveChangesAsync();
}
await using (var s = store.LightweightSession())
{
    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-7");
    Console.WriteLine($"emp-7: Plan={e!.Plan}");   // emp-7: Plan=Premium
}
```

Corre una vez y comenta el `Append`. Los tres hechos llevan los alias de siempre (`pago_registrado`, `empresa_reactivada`, `plan_cambiado`): `AddEventType` no cambia el alias por defecto.

**Sin el alias.** Renombra `PlanCambiado` a `PlanModificado` con el IDE: cambian también su `Apply`, su línea en `Hechos.Registrar` y el test. Corre: rehidratar emp-7 lanza `UnknownEventTypeException`, tu `KeyNotFoundException` de §14. El diario dice `plan_cambiado`, y ningún hecho registrado lleva ese alias. `dotnet test` cae también: `PlanModificado` se registra como `plan_modificado`.

**Con el alias.** En `Hechos.Registrar`, cambia la línea de ese hecho por `opts.Events.MapEventType<PlanModificado>("plan_cambiado");`. emp-7 vuelve a cargar con `Plan=Premium`, y el test pasa: la clase cambió de nombre, el alias del diario no.

**Sin registro.** Deshaz el renombre: vuelve a `PlanCambiado` y a su `AddEventType`. Ahora muévelo a un namespace, sin cambiarle el nombre: `namespace Empresas.Planes { public record PlanCambiado(string NuevoPlan); }`, con `using Empresas.Planes;` en cada archivo que lo use. Corre: emp-7 carga, porque el alias sigue siendo `plan_cambiado`. Comenta su `AddEventType` y corre otra vez: lanza `UnknownEventTypeException`, porque sin registro Marten lo busca por su tipo de .NET, que cambió. Por eso se registran todos los hechos, y no solo el que cambia de nombre. Al terminar, sácalo del namespace y deja su `AddEventType`.

> ⚠️ **Tu upcaster no se adopta hoy.** Tu `Upcast(json)` de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md) no tiene qué leer: tu diario en Marten nace sin hechos de forma vieja. Cuando cambie la forma de un hecho, prueba primero un default honesto en el último parámetro del `record` (`string Notas = ""`). Si no basta, Marten pide dos líneas: `opts.Events.Upcast<V1, V2>("alias_viejo", f)`, donde `f` convierte un V1 en V2, y `opts.Events.MapEventTypeWithSchemaVersion<V2>(2)`. Sin la segunda, los hechos nuevos se guardan con el alias viejo, pasan también por el upcaster y pierden el dato nuevo, sin un error.

## El Descubrimiento

El swap no es rendirse: es **reconocer**. Construiste a mano el diario, la concurrencia y la rehidratación para **entender qué hace falta**, y ese **criterio** no se pierde con el swap: sabes qué protege la concurrencia optimista porque la armaste con un `PRIMARY KEY`. El mismo criterio te avisó de dos piezas que Marten no pone por su cuenta. El NIT único volvió a la transacción del hecho con un documento e `Insert`. El nombre estable volvió a una lista, `Hechos.Registrar`, que un test vigila. El reconocimiento sigue con Wolverine (§32), el daemon (§40) y la plantilla (§64).

> 🌱 Marten se llevó el diario, pero tu `bandeja_salida` y su entrega reclamada siguen siendo tuyas. Marten tiene un hermano, **Wolverine**, con un outbox durable en la misma transacción del hecho: [El outbox](./el-outbox.md).

## ✅ Compruébalo

- [ ] Marten guarda (`StartStream`/`Append`) y rehidrata (`AggregateStreamAsync`) tu `Empresa` con `Apply` por tipo y setters **privados**, sin tu tabla `eventos`.
- [ ] Dos escritores leen la misma versión y le pasan a `Append` la leída + 1: el primero entra y el segundo lanza `EventStreamUnexpectedMaxEventIdException`. Con la versión leída, sin el `+ 1`, fallan los dos.
- [ ] `Sembrar` anota en una sesión el `Localizador` (con `Insert`, no `Store`) y el `StartStream`: un NIT repetido lanza `JasperFx.DocumentAlreadyExistsException` y no deja ni stream ni hecho. Con dos registros a la vez del mismo NIT, entra exactamente uno.
- [ ] Tus hechos se registran en un solo lugar, `Hechos.Registrar`, que usan tu `Program.cs` y un test verde sin base de datos.
- [ ] Renombrar `PlanCambiado` sin `MapEventType` deja ilegible a emp-7 (`UnknownEventTypeException`), y con `MapEventType<PlanModificado>("plan_cambiado")` vuelve a cargar. Moverlo de namespace solo la rompe si el hecho no está registrado.
- [ ] Sabes qué reemplaza en Marten a tu upcaster de §26, y qué pasa si falta `MapEventTypeWithSchemaVersion`.

## 🆘 Si algo salió mal

- **Marten no descubre tus `Apply`:** deben ser métodos de instancia `Apply(TEvento)` en la clase, y la clase necesita una propiedad `Id` (`string`, con `StreamIdentity.AsString`).
- **`NotSupportedException: only asynchronous data access is supported`:** quedó un `.ToList()`/`.Single()` síncrono. En Marten 9 todo es `await ...Async()`.
- **`ExistingStreamIdCollisionException`:** ese stream ya existe. `StartStream` es para nacer; comenta cada bloque que nace un stream después de su primera corrida.
- **Los dos escritores lanzan `EventStreamUnexpectedMaxEventIdException`:** le pasaste a `Append` la versión leída. Marten espera la leída `+ 1` si agregas un hecho, `+ 2` si agregas dos.
- **El test lanza `KeyNotFoundException`:** ese hecho no está en la lista. Revisa que el test llame a `Hechos.Registrar` y que `Registrar` tenga una línea por hecho.
- **`UnknownEventTypeException` al rehidratar:** el diario tiene un alias que ningún hecho registrado lleva, y el tipo de .NET guardado ya no existe. Si renombraste la clase, regístrala con `MapEventType` y el alias viejo. Si la moviste de namespace, regístrala con `AddEventType`.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, marca como reemplazada la línea de [El diario en disco](./el-diario-en-disco.md) sobre `GetType().Name`, y deja la decisión de hoy:

> Los hechos se registran en un solo lugar, `Hechos.Registrar`, con un test que fija sus alias; si una clase cambia de nombre, `MapEventType` le conserva el alias del diario. El NIT se reserva con `Insert`, en la misma sesión que el `StartStream`.

> 💭 **Reto:** empareja cada pieza de tu diario a mano con su equivalente en Marten, y para la concurrencia explica qué borde (edge case) cuidabas a mano y Marten ya cuida. ¿Qué criterio conservas después del swap que no tendrías si hubieras empezado con Marten?

```bash
git add .
git commit -m "ES · El swap por reconocimiento (adoptar Marten como diario)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El swap no es rendirse sino reconocer: tu diario a mano (hechos, concurrencia, rehidratación, NIT único y nombres estables) existe en **Marten**, probado, sobre la misma Postgres; lo adoptas por alivio y conservas el criterio de saber qué hace y por qué.

---

[⬅️ Volver: El mensaje y la cola](./el-mensaje-y-la-cola.md)

[➡️ Siguiente: El outbox](./el-outbox.md)
