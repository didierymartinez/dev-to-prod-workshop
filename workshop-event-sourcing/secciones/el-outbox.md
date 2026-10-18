# El outbox

En [El swap por reconocimiento](./el-swap-por-reconocimiento.md), Marten se llevó tu diario, pero tu `bandeja_salida` sigue siendo tuya. Marten tiene un hermano para eso.

## 🎯 El Objetivo

Pagar la deuda del dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md): que el hecho y su anuncio entren en la **misma transacción**, con entrega durable y reintento, sin tu bucle de `SELECT ... SKIP LOCKED`.

## 💥 El dolor: tu outbox a mano es correcto, pero incompleto

Tu `bandeja_salida`, escrita en la transacción del hecho, y `EntregarPendientes`, que reclama filas con `FOR UPDATE SKIP LOCKED`, son un outbox de verdad. Pero [El mensaje y la cola](./el-mensaje-y-la-cola.md) te mostró el muro: le faltan el reintento con backoff, el dead-letter del mensaje envenenado, el orden y sobrevivir reinicios. Cada uno es otra pieza que escribir y probar.

## 🔧 Adoptar el outbox de Wolverine

> 🆕 **Wolverine es tu despachador *y* tu outbox.** Wolverine, la librería hermana de Marten para mensajería, es la herramienta que anunció [El despachador](./el-despachador.md): trae el outbox hecho, con reintento y dead-letter. `bus.InvokeAsync(cmd)` es tu `Enviar`. Wolverine descubre el `Handle` por el **tipo del parámetro**, como tu `Dictionary<Type, handler>`, e **inyecta** la `IDocumentSession` como parámetro del método, en vez de tu `new Handler(store)`. Por eso los handlers son clases `static` con un método `Handle`. Y publicar un mensaje es **devolverlo**: Wolverine trata el valor de retorno de un handler como un mensaje a publicar (*cascading*), lo guarda en su outbox en la transacción del hecho, y lo despacha tras el commit.

> ⚠️ **Tres cosas de arranque.** (1) Wolverine llega en dos paquetes para `Empresas.Historia`: **`WolverineFx.Marten`**, la integración con Marten, y **`WolverineFx.RuntimeCompilation`**, porque Wolverine 6 no trae el compilador en el core. (2) Wolverine corre en un **host**, que procesa los mensajes en segundo plano. Aquí lo montas mínimo en el `Program.cs` de `Empresas.Historia`, y se muestra porque es idioma nuevo; el host completo llega en [El host y la inyección](./el-host-y-la-inyeccion.md). (3) Wolverine solo busca handlers en el ensamblado que arranca el host. Los de `Facturacion` los ve si se lo dices con `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)`; sin esa línea, un mensaje publicado no llega a nadie.

> 🛠️ **Inténtalo tú.** Logra que esto funcione:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
> // el hecho quedó en el diario Y facturación recibió el anuncio — atómico, sin bandeja_salida
> ```
>
> Para eso: **(1)** enrola el outbox en la config (abajo). **(2)** En `Empresas.Historia`, escribe el handler `static` de suspender: appendea `EmpresaSuspendida` a la sesión y **devuelve** el evento público, con su nombre completo `Contratos.EmpresaSuspendidaV1`, como en [El evento público](./el-evento-publico.md). Este `SuspenderHandler` `static` **reemplaza** al de instancia. Borra los tres handlers de instancia que comentaste en [El swap](./el-swap-por-reconocimiento.md): aquí solo suspender pasa por el bus. Borra el `Despachador` y `ICommandHandler<T>`: Wolverine es tu despachador, y una clase `static` no implementa interfaces. El NIT ya no sale de `NitDe`: el handler recibe la `IDocumentSession`, no tu `IEventStore`. Rehidrata la empresa con la sesión y lee su `Nit`; por el `await`, el `Handle` pasa a `async Task<…>`. Si la empresa no existe, `AggregateStreamAsync` devuelve `null`: falla ahí mismo con `?? throw` y un mensaje que diga qué falta. Un `!` la convertiría en un `NullReferenceException` más abajo, lejos de la causa. **(3)** En el proyecto `Facturacion` (que solo ve `Contratos`), crea `FacturacionHandler`, un handler consumidor `static` de `EmpresaSuspendidaV1` que deje una marca observable. Para eso, muda `MundoExterno` a `Facturacion`: nació en `Empresas.Historia` (§28), que `Facturacion` no ve. **(4)** Borra `bandeja_salida` (`DROP TABLE bandeja_salida;` en `psql`), `EntregarPendientes` y el `ReclamarYEntregar` de [El mensaje y la cola](./el-mensaje-y-la-cola.md), con su test `ElMensajeYLaCola` si lo tienes. **(5)** En tu `Program.cs`, borra el bloque de [El swap](./el-swap-por-reconocimiento.md): el `DocumentStore.For`, el `StartStream` de `emp-7`, el choque de dos escritores y los experimentos del NIT y del nombre. Desde aquí, el store es el del host, y su config llama a tu `Hechos.Registrar(opts)`. Deja el método `Sembrar`: con él siembras las empresas de las secciones que siguen. Borra también lo demás que comentaste allá: tu `viejo` y lo que lo usaba, `EventStream` y `AbrirStream`. `CorrerProyector` sigue comentado hasta [El daemon](./el-daemon-y-la-consistencia-eventual.md).

<details>
<summary>👉 Una forma de hacerlo</summary>

```bash
dotnet add Empresas.Historia package WolverineFx.Marten
dotnet add Empresas.Historia package WolverineFx.RuntimeCompilation
```

```csharp
// Empresas.Historia/Program.cs (la composición raíz): el outbox de Wolverine sobre Marten, en un host mínimo (el real, con DI, es §44)
using Microsoft.Extensions.DependencyInjection;   // GetRequiredService
using Microsoft.Extensions.Hosting;               // Host
using Wolverine;                                  // AddWolverine, IMessageBus
using Wolverine.Marten;                           // IntegrateWithWolverine
// (+ los using de Marten de §31)

var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
    ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");   // la misma línea de Todo o nada
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    Hechos.Registrar(opts);                                       // los hechos, en un solo lugar (§31)
})
.UseLightweightSessions()
.IntegrateWithWolverine();                                        // enrola Marten en el outbox
builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();       // el SaveChanges (hecho + salientes) ocurre solo
    opts.Policies.UseDurableLocalQueues();       // el consumidor local también entrega DURABLE (sobrevive reinicios)
    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);   // los handlers de Facturacion: Wolverine solo busca en el ensamblado que arranca el host
});

using var host = builder.Build();
await host.StartAsync();
var bus = host.Services.GetRequiredService<IMessageBus>();        // el "Enviar" de tu despachador
```

```csharp
// Empresas.Historia: el handler es static, Handle por convención; la sesión llega inyectada como parámetro (using Marten; para IDocumentSession)
public static class SuspenderHandler
{
    public static async Task<Contratos.EmpresaSuspendidaV1> Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)
            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");   // el NIT lo sabe la empresa
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));            // el hecho
        return new Contratos.EmpresaSuspendidaV1(empresa.Nit, cmd.Motivo);   // cascading: al outbox, en la transacción del hecho
    }
}

// Facturacion/FacturacionHandler.cs: vive en Facturacion, que solo ve Contratos (using Contratos;)
public static class MundoExterno { public static List<string> Recibidos = new(); }   // mudado aquí desde Empresas.Historia, sin cambios

public static class FacturacionHandler
{
    public static void Handle(EmpresaSuspendidaV1 msg) => MundoExterno.Recibidos.Add($"suspendida NIT {msg.Nit}");   // marca observable, como en §28
}
```

```csharp
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
// el handler corre, Wolverine commitea hecho+mensaje juntos, y entrega el mensaje después (async)
await Task.Delay(500);   // el anuncio llega por la cola local, después del commit
Console.WriteLine(string.Join("\n", MundoExterno.Recibidos));   // → suspendida NIT 900123
```

- **El cuerpo, simplificado:** el handler rehidrata la empresa solo para leer su NIT, y appendea el hecho directo para enfocar el outbox. Pedirle la decisión a la empresa es `FetchForWriting`, y llega en [El capstone](./el-capstone-fetchforwriting.md).
- **El consumidor corre en el mismo proceso:** que el mensaje **viaje** a otra máquina es configurar un transporte de Wolverine hacia un broker; [En vivo y serverless](./en-vivo-y-serverless.md) lo discute con Azure Service Bus.
- **Dónde queda el mensaje:** Wolverine lo guarda, dentro de la transacción de Marten, en tablas que crea solo: `wolverine_incoming_envelopes` para el consumidor **local**, o `wolverine_outgoing_envelopes` cuando va a un broker, si esa ruta lo pide (lo ves en [Lo que el broker no promete](./lo-que-el-broker-no-promete.md)). Sin `UseDurableLocalQueues`, la entrega local es en memoria y no sobrevive un reinicio.

</details>

### El anuncio, en un test

Publicar es devolver, así que el anuncio se prueba sin bus ni cola: llamas al handler con una sesión y afirmas lo que devuelve.

> 🛠️ **Inténtalo tú.** Haz que este test pase en `Empresas.Tests`:
>
> ```csharp
> var anuncio = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);
>
> Assert.Equal("900555", anuncio.Nit);   // el NIT de la empresa, no su id de stream
> Assert.Equal("mora", anuncio.Motivo);
> ```
>
> Para eso, el test crea su propio `DocumentStore.For`, con `StreamIdentity.AsString` y tu `Hechos.Registrar`. La cadena apunta a tu base de pruebas, `empresas_tests`, como tu `PostgresFixture` de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md). Abre una sesión, siembra una empresa con `StartStream` y confírmala con `SaveChangesAsync`. Usa un id nuevo en cada corrida, `$"emp-test-{Guid.NewGuid()}"`, para no chocar con la anterior. Después llama al handler con esa misma sesión. Un test que usa `await` se declara `async Task`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// Empresas.Tests/SuspenderHandlerTests.cs
using JasperFx.Events;   // StreamIdentity
using Marten;
using Npgsql;            // NpgsqlConnectionStringBuilder

public class SuspenderHandlerTests
{
    [Fact]
    public async Task Suspender_anuncia_el_nit_de_la_empresa_y_el_motivo()
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        var pruebas = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;
        await using var store = DocumentStore.For(opts =>
        {
            opts.Connection(pruebas);   // la base de pruebas, no la de tu servicio
            opts.Events.StreamIdentity = StreamIdentity.AsString;
            Hechos.Registrar(opts);
        });
        var id = $"emp-test-{Guid.NewGuid()}";   // un stream nuevo en cada corrida
        await using var session = store.LightweightSession();
        session.Events.StartStream<Empresa>(id, new EmpresaRegistrada("900555", "Prueba", "Basico"));
        await session.SaveChangesAsync();

        var anuncio = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session);

        Assert.Equal("900555", anuncio.Nit);
        Assert.Equal("mora", anuncio.Motivo);
    }
}
```

</details>

Después del handler nadie llama a `SaveChangesAsync`: la suspensión no queda escrita, y el test no la necesita. Ahora cambia el `return` del handler para que lleve `cmd.EmpresaId` en vez de `empresa.Nit`. El programa corre igual, y Facturación recibiría un id de stream donde espera un NIT, pero el test cae: `Expected: "900555"`, `Actual: "emp-test-…"`. Devuelve el `return` a `empresa.Nit`.

### El nombre del mensaje

> 🆕 **El nombre del mensaje también es un contrato.** Wolverine guarda cada mensaje con un nombre, en la columna `message_type` de sus tablas, y con ese nombre busca el handler que lo atiende. Si no le das otro, es el nombre completo de la clase: `Contratos.EmpresaSuspendidaV1`. Es [El nombre es un contrato](./el-nombre-es-un-contrato.md), ahora en la cola: si renombras o mueves el `record`, los mensajes ya guardados, o los que manda otro servicio, dejan de encontrar su handler, y ningún build falla. El atributo `[MessageIdentity("…")]` fija ese nombre en el contrato, se llame como se llame la clase. Vive en `Wolverine.Attributes`, del paquete `WolverineFx`.

> 🛠️ **Inténtalo tú.** Haz que el nombre cambie:
>
> ```sql
> SELECT message_type, status FROM wolverine_incoming_envelopes;
> -- Contratos.EmpresaSuspendidaV1  | Handled   (el de antes)
> -- empresas.empresa-suspendida.v1 | Handled   (el de ahora)
> ```
>
> Ponle a `EmpresaSuspendidaV1` un `[MessageIdentity]` con un nombre que diga de quién es, qué pasó y su versión, y corre tu `Program.cs` otra vez. Wolverine conserva un rato los mensajes ya entregados (`status = 'Handled'`), así que verás el de antes y el de ahora.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```bash
dotnet add Contratos package WolverineFx
```

```csharp
// Contratos/Contratos.cs
using Wolverine.Attributes;   // MessageIdentity

namespace Contratos;

[MessageIdentity("empresas.empresa-suspendida.v1")]   // el nombre en la cola: no cambia aunque la clase cambie
public record EmpresaSuspendidaV1(string Nit, string Motivo);
```

</details>

Desde aquí, una regla: **cada contrato nuevo de `Contratos` lleva su `[MessageIdentity]`**. Con él, mover un contrato de carpeta o de namespace deja de romper a quien lo escucha.

## 🔨 Rómpelo: atómico, el commit a mano, y qué pasa sin la config

**Atómico:** con cascading no puedes lanzar después de publicar, porque publicar es el `return`. Para verlo, publica a mano. Pídele al `Handle` también un `IMessageBus bus` (`using Wolverine;`), que Wolverine inyecta igual que la sesión. Después del `Append`, haz `await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1(empresa.Nit, cmd.Motivo))`, y justo después lanza una excepción. Envuelve el `InvokeAsync` de tu `Program.cs` en un `try/catch` que escriba la excepción, para que el programa siga y puedas mirar `MundoExterno.Recibidos`. El hecho no entra al diario, `MundoExterno.Recibidos` queda vacío y `wolverine_incoming_envelopes` no guarda ninguna fila nueva: el outbox y los hechos comparten la unidad de trabajo de Marten. Quita la excepción y el acto entra entero; el anuncio sale dos veces, una por el `PublishAsync` y otra por el `return`. Al terminar, deja el handler como estaba, con el `return`.

**El commit a mano:** varios repos de la organización confirman dentro del handler, con su propio `await session.SaveChangesAsync()`, y publican después. Pruébalo: vuelve a pedirle al `Handle` el `IMessageBus bus`, y conserva el `try/catch` de tu `Program.cs`. Después del `Append`, llama `await session.SaveChangesAsync()` y lanza una excepción justo después. Deja el `PublishAsync` debajo del `throw`: es el proceso que cae entre el commit y el anuncio, y el compilador avisa con `CS0162` que no se alcanza. Antes de correr, cuenta los hechos de emp-7: `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-7';`. Después hay uno más, pero `MundoExterno.Recibidos` queda vacío y `wolverine_incoming_envelopes` no guarda ninguna fila nueva: el anuncio no salió, y no va a salir. Es el dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) al revés. La cura es quitar código: sin tu `SaveChangesAsync`, `AutoApplyTransactions` confirma el hecho y el mensaje juntos, al final del handler. La misma falla tiene otra cara: si un handler confirma a mano un registro de éxito, y un `catch` escribe otro de fallo cuando algo truena después, un solo intento deja dos registros. Lo arregla lo mismo: nada se confirma a mitad del handler. Al terminar, deja el handler como estaba, con el `return`.

**Sin el commit automático:** quita `AutoApplyTransactions()`. Nadie llama a `SaveChanges`: el anuncio llega a `MundoExterno.Recibidos`, pero el hecho **no** entra al diario de `emp-7`. Es el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md).

**Sin la integración:** vuelve a poner `AutoApplyTransactions()` y quita `IntegrateWithWolverine()`. Wolverine no sabe armar la `IDocumentSession` que pide tu handler: el `InvokeAsync` lanza `InvalidServiceLocationException` (*"Found service locations while generating code for Message Handler for SuspenderEmpresa"*), y no hay ni hecho ni anuncio. Esas dos líneas de config atan el hecho a su anuncio.

## El Descubrimiento

Tu `bandeja_salida` (§28) y el claim con `SKIP LOCKED` (§30) eran un outbox correcto en su núcleo e incompleto en el muro. **Wolverine** es ese outbox terminado: el mensaje comparte la transacción del hecho, y la entrega es durable, con reintento y dead-letter. Y es también tu **despachador** de [El despachador](./el-despachador.md), hecho librería. Publicar es *devolver* un mensaje; la atomicidad viene de que Wolverine y Marten comparten la unidad de trabajo.

Dos criterios salen de aquí. Al outbox solo entra lo que sale del handler antes del commit: lo que devuelve, o lo que publica con el `IMessageBus` que Wolverine le inyecta. Un commit a mano dentro del handler, o un envío por otro camino después del commit, vuelve al dual-write. Y la mensajería se monta con el primer mensaje que de verdad cruza: el paquete, la config y las tablas de Wolverine llegaron hoy, con `EmpresaSuspendidaV1`, no antes.

> 🌱 El outbox entrega **al menos una vez** (*at-least-once*): si el proceso cae después de entregar y antes de marcar la entrega, Wolverine reintenta, y el mismo `EmpresaSuspendidaV1` le llega a facturación **dos veces**. Que el consumidor no haga daño con eso es el próximo dolor: [Llegó dos veces](./llego-dos-veces.md).

## ✅ Compruébalo

- [ ] Un handler `static` que appendea un hecho y **devuelve** el evento público entrega ambos atómicamente: el hecho al diario y el mensaje a `MundoExterno.Recibidos`, sin tu `bandeja_salida`.
- [ ] Si el handler lanza después de publicar con `bus.PublishAsync`, ni el hecho ni el anuncio persisten.
- [ ] Con un `SaveChangesAsync` a mano y un `throw` antes del `PublishAsync`, el hecho queda en el diario y el anuncio no sale. Sabes por qué la cura es quitar ese `SaveChangesAsync`.
- [ ] Un test llama a `SuspenderHandler.Handle` con una sesión, afirma el NIT y el motivo del anuncio que devuelve, y cae si el `return` lleva el id del stream.
- [ ] `EmpresaSuspendidaV1` lleva `[MessageIdentity("empresas.empresa-suspendida.v1")]`, y `wolverine_incoming_envelopes.message_type` muestra ese nombre.
- [ ] Sin `AutoApplyTransactions()` vuelve el fantasma de §28: el anuncio sale y el hecho no se guarda. Sin `IntegrateWithWolverine()`, Wolverine no genera el handler (`InvalidServiceLocationException`): no hay ni hecho ni anuncio.

## 🆘 Si algo salió mal

- **`InvalidOperationException: ... no IAssemblyGenerator (Roslyn) is registered`:** falta el paquete `WolverineFx.RuntimeCompilation`, obligatorio en Wolverine 6; al referenciarlo se registra solo. Si escribiste `opts.UseRuntimeCompilation()` sin el paquete, esa línea no compila (`CS1061`).
- **El mensaje no llega al consumidor:** ¿**devolviste** el evento público desde el handler, o solo lo construiste? Lo que se devuelve se publica. ¿O falta `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)` en el `AddWolverine`? Sin ella, lo publicado no llega a nadie, y un `InvokeAsync` directo lanza `IndeterminateRoutesException`.
- **El anuncio llega pero el hecho no está en el diario:** falta `opts.Policies.AutoApplyTransactions()`.
- **`InvalidServiceLocationException: Found service locations while generating code for Message Handler for SuspenderEmpresa`:** falta `.IntegrateWithWolverine()` tras el `AddMarten(...)`.
- **`MessageIdentity` no compila en `Contratos` (`CS0246`):** falta el paquete en ese proyecto, `dotnet add Contratos package WolverineFx`, o el `using Wolverine.Attributes;`.
- **El test lanza `Falta la variable de entorno CADENA_POSTGRES.`:** la terminal donde corres `dotnet test` no tiene la variable. Fíjala ahí también.

## 📓 Registra tu avance

Primero, deja en tu `DECISIONES.md` la decisión de hoy:

> El handler no confirma a mano: Wolverine confirma el hecho y sus mensajes juntos, al final. Cada contrato de `Contratos` lleva su `[MessageIdentity]`, y un test afirma el mensaje que devuelve el handler.

> 💭 **Reto:** tu `bandeja_salida` + `EntregarPendientes` + el claim de §30 hacían casi lo que hace el outbox de Wolverine. ¿Qué de ese "casi" te faltaba, y cómo reconoces en Wolverine también a tu `Despachador` de §7?

```bash
git add .
git commit -m "ES · El outbox (Wolverine: despachador + outbox durable)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

**Wolverine** termina tu outbox a mano y es tu despachador hecho librería: publicar es *devolver* un mensaje, que entra en la transacción del hecho con un nombre fijo (`[MessageIdentity]`), y un `SaveChangesAsync` a mano dentro del handler deshace esa atomicidad.

---

[⬅️ Volver: El swap por reconocimiento](./el-swap-por-reconocimiento.md)

[➡️ Siguiente: Llegó dos veces](./llego-dos-veces.md)
