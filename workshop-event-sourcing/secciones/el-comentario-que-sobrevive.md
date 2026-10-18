# El comentario que sobrevive

Casi todo el motor nuevo está en su sitio. El `readonly` que le quitaste al `HashSet` no es la única línea que **parece** borrable y no lo es.

## 🎯 El Objetivo

Proteger una línea que **carga peso** —si la quitas, algo se cae, pero nada falla al compilar ni en los tests— con un comentario que dice **qué se rompe** sin ella, y con un test que se pone rojo sin ella. Y devolver ese aprendizaje a la librería.

## 💥 El dolor: el comentario que describe la mecánica no frena a nadie

En [El outbox](./el-outbox.md) pusiste esta línea en la config de Wolverine, que hoy vive en tu `AgregarEmpresas`, y hasta la comentaste:

```csharp
opts.Policies.UseDurableLocalQueues();   // el consumidor local también entrega DURABLE (sobrevive reinicios)
```

Ese comentario dice la **mecánica**, casi lo que el nombre del método ya grita. Meses después, alguien hace limpieza. Lee "entrega durable, sobrevive reinicios" y piensa: *"casi nunca reiniciamos, y esto hace un `INSERT` por mensaje; lo quito"*. El commit queda verde: todo compila, los tests pasan. El comentario **no lo detuvo**, porque explicaba lo que la línea hace, no lo que pasa **sin** ella.

Hasta que un despliegue reinicia el servicio en el instante justo: unos pedidos y respuestas del proceso que estaban en la cola local **en memoria** se pierden, sin excepción, sin log, sin dead-letter. A Facturación nunca le llegó el `CobrarMultaV1`, o su `MultaCobradaV2` nunca volvió. La suspensión se queda con Facturación `EnCurso`, y nadie sabe por qué.

## 🔧 Comenta el síntoma, no la mecánica

> 📌 **El principio: comenta el síntoma, no la mecánica.** Un comentario en una línea que carga peso no repite lo que el código dice: dice **qué se rompe si desaparece** y **cómo se nota**, idealmente con el enlace al incidente o issue que lo documentó.

### Paso 1 · La línea del outbox

> 🛠️ **Inténtalo tú.** Reemplaza tu comentario de mecánica por uno de síntoma: qué se pierde **sin** la línea y cómo se nota (que no hay error).

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// NO quitar: sin esto la entrega local es en memoria y NO sobrevive a un reinicio →
// se pierden pedidos y respuestas del proceso en silencio (sin excepción ni dead-letter),
// y la suspensión se queda EnCurso. Muro de "El mensaje y la cola".
// (incidente #___  ← el número real cuando exista; en el taller no hay, queda como recordatorio del enlace)
opts.Policies.UseDurableLocalQueues();
```

Tu comentario de [El outbox](./el-outbox.md) describe la **mecánica**, que el nombre ya insinúa. Este nombra el **síntoma** que el nombre esconde, y le da al que limpia una razón para no borrarla.

</details>

### Paso 2 · Las otras líneas silenciosas

> 🛠️ **Inténtalo tú.** Busca en tu código otras líneas así: si las quitas, todo compila y los tests pasan, pero algo se rompe sin avisar. Mira las que pusiste tras un `🔨` que fallaba en silencio, tu `AgregarEmpresas` y lo que quedó en tu `Program.cs`. Escribe el síntoma de cada una.

<details>
<summary>👉 Las que fuiste dejando</summary>

- el `if` de versión del doble fiel en [El puerto propio](./el-puerto-propio.md): sin él, verde falso.
- la idempotencia del consumidor en [Llegó dos veces](./llego-dos-veces.md): sin ella, el mismo mensaje se aplica dos veces en silencio.
- los `IncludeAssembly` de Facturación y Accesos: sin ellos, sus handlers no existen para Wolverine, y el pedido se descarta con un `No routes` en el log.
- el `MultipleHandlerBehavior.Separated` de [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md): sin él, dos handlers del mismo mensaje corren en una sola cadena, y la falla de uno se lleva la respuesta del otro.
- la versión esperada en el `Append` de tu `Decidir` de [El proceso tiene dueño](./el-proceso-tiene-dueno.md) (`proceso.Version + hechos.Length`): sin ella, dos respuestas a la vez deciden sobre el mismo proceso viejo, y la suspensión nunca queda efectiva, sin error. `EventAppendMode.Rich` no la reemplaza: en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) viste que no cierra esa carrera.
- el nombre completo en `OnException<JasperFx.ConcurrencyException>()`, de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md): con el nombre corto, C# elige tu `ConcurrencyException` de [Concurrencia optimista](./concurrencia-optimista.md), y la respuesta que choca cae en dead letters en vez de reintentar.
- el registro de cada vista y el `AddAsyncDaemon` que corre las `Async`, de [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md): en un host sin daemon, una vista `Async` no avanza, y sus consultas responden datos viejos sin un error. Aquí el comentario dice además la decisión y su porqué, como los que escribiste en [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md): `Inline`, porque Facturación cobra con su respuesta; `Async`, porque solo la mira soporte. Y debe coincidir con la línea: si dicen cosas distintas, el próximo que agregue una vista seguirá al comentario.
- el `ResumeAsync` dentro del `finally` de tu `Vistas.Rearmar`, de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md): fuera del `finally`, tus tests pasan, hasta que un rearmado lanza y deja el daemon en pausa. Ninguna vista `Async` vuelve a avanzar, sin error.
- el `Duplicate` de [Observar el motor nuevo](./observar-el-motor-nuevo.md): sin él, la búsqueda por estado recorre la tabla entera, y nadie lo nota hasta que la tabla crece.
- el `HashSet` de referencias sin `readonly`, de [El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md): tu editor sugiere ponerle `readonly`, y con él el documento relee el conjunto vacío. Un pago repetido entra dos veces, sin error.
- la línea `Metadata` de la `Version`, en tu `EmpresaDetalle` de [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md) y en tu `Empresa` de [El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md): sin ella, el documento trae `Version` 0. Un anuncio atrasado pisa la réplica de `Planes.De`, tu `SuspenderHandler` arma un `susp-…-1`, y tus `CambiarPlanHandler` y `RegistrarPagoHandler` chocan con su propia versión esperada.
- el `DefaultTenantUsageEnabled = false` de [El contexto que falta](./el-contexto-que-falta.md), en tu `AgregarEmpresas`: sin él, lo que corre sin tenant, como tu worker o un trabajo de fondo, escribe en `*DEFAULT*` sin un error, y ninguna organización ve su hecho.
- la tenancy conjoined y `AllDocumentsAreMultiTenanted()`, de [El contexto que falta](./el-contexto-que-falta.md): si quitas una, el servicio no arranca. Pero si marcas solo las vistas que nombra el error, el `Localizador` queda compartido entre tenants, y tus tests de un tenant pasan, como en [Probar que aísla](./probar-que-aisla.md). Esa fuga la atrapa tu `DosTenantsTests`.
- el `MapInboundClaims = false` de [El tenant viene firmado](./el-tenant-viene-firmado.md), en tu `Program.cs`: sin él, `sub` llega con el nombre largo de Microsoft, y la política responde 403 a todo token válido. Tus tests van por el bus, y no lo ven.
- la política por defecto de ese mismo `Program.cs`: sin ella, una ruta que no abre sesión responde a cualquiera, sin token, como tu pantalla en vivo antes de la política.
- el `.UseDurableOutbox()` de la regla de `PlanDeEmpresaV1`, de [Lo que el broker no promete](./lo-que-el-broker-no-promete.md): sin él, con el broker caído, el anuncio se descarta tras tres intentos, con una línea `info`, y Facturación cobra el plan viejo.
- el `IRevisioned` de la saga, que viste en la librería en [El proceso tiene dueño](./el-proceso-tiene-dueno.md): sin él, dos respuestas a la vez se pisan y una se pierde, sin excepción ni dead letter.

</details>

## 🔧 Un test que se pone rojo

Un comentario solo frena a quien lo lee. Y `UseDurableLocalQueues` no tiene un 🔨 que la delate: para verla fallar tendrías que reiniciar el servicio en el instante justo. Pero sí puedes preguntarle al host si la tiene. Es la cura que se pidió en un proyecto de la organización que copió a mano un ajuste de concurrencia en sus cuatro hosts: un test que falle si un host no lo aplica.

> 🆕 **`WebApplicationFactory<Program>`: tu host, dentro del test.** Tu `HostConDaemon` arranca con tu `AgregarEmpresas`, pero no con tu `Program.cs`: lo del borde HTTP, como el token y la política por defecto, no está en él. `WebApplicationFactory<Program>`, del paquete `Microsoft.AspNetCore.Mvc.Testing`, arranca tu `Program.cs` entero, de la primera línea a `app.Run()`, con un servidor en memoria en vez de un puerto. Su `Services` es el contenedor de ese host, y `CreateClient()` te da un `HttpClient` que le habla a ese servidor. Desde .NET 10, el `Program` de un proyecto web ya es público, y el proyecto de tests lo ve sin que declares nada. Si heredas de `WebApplicationFactory<Program>`, tu constructor corre antes de que el host arranque. En tu `override` de `ConfigureWebHost`, `builder.ConfigureServices(s => …)` agrega servicios al host. Tu `HostConDaemon` se queda para los tests de la vista: su colección corre aparte, y su reset no vacía la base en medio de estos tests.

Ese constructor es el lugar para cambiar de base. `WebApplicationFactory` arranca en `Development`, y ahí tu host lee tus user-secrets, con la cadena de tu servicio: su daemon y sus agentes trabajarían sobre tu base. Las variables de entorno se leen después de tus user-secrets, y ganan. Fija `ConnectionStrings__Postgres` con la cadena de `empresas_tests`, la base de tus tests desde [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md). Ármala con el mismo `NpgsqlConnectionStringBuilder` de tu `PostgresFixture`. Lo demás es lo que ya hace tu `HostConDaemon`: `DirectorioDeSecretos` en `sin-secretos`, y `DisableAllExternalWolverineTransports()`. Sin eso último, el host del test escucha `facturacion.planes` y le quita anuncios a tu servicio. Como tu `PostgresFixture`, el host va en una colección de xUnit: uno solo para todas las clases que lo usen.

Lo que le preguntas al host es API que no se adivina, así que se muestra. Las tres piezas salen de `app.Services`: `StoreOptions` (la configuración de Marten), `IWolverineRuntime` (Wolverine en marcha) y `HandlerGraph` (los handlers que Wolverine encontró). La política por defecto se pregunta por HTTP.

| Línea | Lo que le preguntas al host |
|---|---|
| `UseDurableLocalQueues()` | `wolverine.Endpoints.LocalQueueForMessageType(typeof(CobrarMultaV1)).Mode == EndpointMode.Durable` |
| `.UseDurableOutbox()` | `wolverine.Endpoints.EndpointFor(new Uri("rabbitmq://exchange/empresas"))?.Mode == EndpointMode.Durable` |
| los dos `IncludeAssembly` | `handlers.CanHandle(typeof(CobrarMultaV1))` y lo mismo con `RevocarAccesosV1` |
| `MultipleHandlerBehavior.Separated` | `wolverine.Options.MultipleHandlerBehavior == MultipleHandlerBehavior.Separated` |
| la política de concurrencia | `((IWithFailurePolicies)wolverine.Options).Failures.Any(r => r.Match.Matches(new EventStreamUnexpectedMaxEventIdException("choque")))` |
| `AddAsyncDaemon` | `marten.Projections.AsyncMode != DaemonMode.Disabled` |
| la política por defecto | `(await app.CreateClient().GetAsync("/empresas/emp-1")).StatusCode == HttpStatusCode.Unauthorized` |

Esos tipos viven en `Wolverine.Runtime` (`IWolverineRuntime`), `Wolverine.Runtime.Handlers` (`HandlerGraph`), `Wolverine.Configuration` (`EndpointMode`), `Wolverine.ErrorHandling` (`IWithFailurePolicies`), `JasperFx.Events` (`EventStreamUnexpectedMaxEventIdException`), `JasperFx.Events.Daemon` (`DaemonMode`) y `System.Net` (`HttpStatusCode`). La política de concurrencia se comprueba con el choque de Marten en la mano: preguntas si alguna regla atrapa esa excepción, no cómo se llama la clase que escribiste. El outbox se pregunta por la dirección de tu exchange: `DisableAllExternalWolverineTransports` no conecta el host al broker, pero la regla sigue ahí, con su modo.

### Paso 3 · Una pregunta por línea

> 🛠️ **Inténtalo tú.** Quiero que la limpieza del 💥 deje esto en `dotnet test`:
>
> ```
> Con error LineasQueCarganPeso.Las_colas_locales_son_durables
>   Mensaje de error:
>    Sin UseDurableLocalQueues, un reinicio pierde pedidos y respuestas en silencio, y la suspensión se queda EnCurso.
> ```
>
> (Si tu sistema está en inglés: `Failed` y `Error Message`.) Para eso: **(1)** Desde `Empresas.Tests`, agrega el paquete: `dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 10.0.13`. **(2)** Crea `HostDePrueba`, que hereda de `WebApplicationFactory<Program>`. Su constructor lee `CADENA_POSTGRES`, como tu `HostConDaemon`, le cambia la base a `empresas_tests`, y fija con `Environment.SetEnvironmentVariable` las variables `ConnectionStrings__Postgres` y `DirectorioDeSecretos`. Su `ConfigureWebHost` apaga los transportes externos. Declara la colección `"host"` con ese fixture, como declaraste `"postgres"`. **(3)** En una clase de la colección `"host"`, escribe un `[Fact]` por fila de la tabla, con `Assert.True(condición, "síntoma")`. El segundo argumento es el mensaje que xUnit muestra cuando la condición es falsa: escribe ahí el síntoma de tu comentario. Con un `[Fact]` por línea, si alguien quita dos, ves los dos rojos. La pregunta por HTTP lleva `await`: su `[Fact]` es `async Task`. **(4)** Corre `dotnet test` en una terminal con `CADENA_POSTGRES` fijada. Puedes dejar tu servicio corriendo: el host del test usa otra base, y no toca el broker.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/HostDePrueba.cs: tu host, arrancado dentro de los tests, contra la base de pruebas
using Microsoft.AspNetCore.Hosting;       // IWebHostBuilder
using Microsoft.AspNetCore.Mvc.Testing;   // WebApplicationFactory
using Npgsql;                             // NpgsqlConnectionStringBuilder
using Wolverine;                          // DisableAllExternalWolverineTransports

public class HostDePrueba : WebApplicationFactory<Program>
{
    public HostDePrueba()
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        var deTests = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;
        Environment.SetEnvironmentVariable("ConnectionStrings__Postgres", deTests);   // gana a tus user-secrets
        Environment.SetEnvironmentVariable("DirectorioDeSecretos", "sin-secretos");   // que no lea los secretos de tu servicio
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureServices(s => s.DisableAllExternalWolverineTransports());   // las reglas del broker, sin conectarse a él
}

[CollectionDefinition("host")]
public class ColeccionHost : ICollectionFixture<HostDePrueba> { }
```

```csharp
// Empresas.Tests/LineasQueCarganPeso.cs: el host que arma tu Program.cs, preguntado por sus líneas silenciosas
using System.Net;                         // HttpStatusCode
using Contratos;                          // CobrarMultaV1, RevocarAccesosV1
using JasperFx.Events;                    // EventStreamUnexpectedMaxEventIdException
using JasperFx.Events.Daemon;             // DaemonMode
using Marten;                             // StoreOptions
using Microsoft.Extensions.DependencyInjection;
using Wolverine;                          // MultipleHandlerBehavior
using Wolverine.Configuration;            // EndpointMode
using Wolverine.ErrorHandling;            // IWithFailurePolicies
using Wolverine.Runtime;                  // IWolverineRuntime
using Wolverine.Runtime.Handlers;         // HandlerGraph

[Collection("host")]
public class LineasQueCarganPeso(HostDePrueba app)
{
    readonly StoreOptions marten = app.Services.GetRequiredService<StoreOptions>();
    readonly IWolverineRuntime wolverine = app.Services.GetRequiredService<IWolverineRuntime>();
    readonly HandlerGraph handlers = app.Services.GetRequiredService<HandlerGraph>();

    [Fact]
    public void Las_colas_locales_son_durables() =>
        Assert.True(wolverine.Endpoints.LocalQueueForMessageType(typeof(CobrarMultaV1)).Mode == EndpointMode.Durable,
            "Sin UseDurableLocalQueues, un reinicio pierde pedidos y respuestas en silencio, y la suspensión se queda EnCurso.");

    [Fact]
    public void El_anuncio_del_plan_espera_al_broker() =>
        Assert.True(wolverine.Endpoints.EndpointFor(new Uri("rabbitmq://exchange/empresas"))?.Mode == EndpointMode.Durable,
            "Sin UseDurableOutbox, con el broker caído el anuncio del plan se descarta, y Facturación cobra el plan viejo.");

    [Fact]
    public void Facturacion_y_Accesos_tienen_handlers() =>
        Assert.True(handlers.CanHandle(typeof(CobrarMultaV1)) && handlers.CanHandle(typeof(RevocarAccesosV1)),
            "Sin los IncludeAssembly, Facturación y Accesos no tienen handlers, y el pedido se descarta con un No routes.");

    [Fact]
    public void Cada_handler_de_un_mensaje_va_en_su_cola() =>
        Assert.True(wolverine.Options.MultipleHandlerBehavior == MultipleHandlerBehavior.Separated,
            "Sin Separated, dos handlers del mismo mensaje corren en una sola cadena, y la falla de uno se lleva la respuesta del otro.");

    [Fact]
    public void El_choque_de_concurrencia_se_reintenta() =>
        Assert.True(((IWithFailurePolicies)wolverine.Options).Failures.Any(r => r.Match.Matches(new EventStreamUnexpectedMaxEventIdException("choque"))),
            "Sin la política sobre JasperFx.ConcurrencyException, el choque de dos respuestas cae en dead letters en vez de reintentar.");

    [Fact]
    public void El_daemon_corre_las_vistas_Async() =>
        Assert.True(marten.Projections.AsyncMode != DaemonMode.Disabled,
            "Sin AddAsyncDaemon, las vistas Async no avanzan: el rezago crece y ninguna consulta falla.");

    [Fact]
    public async Task Toda_ruta_exige_token() =>
        Assert.True((await app.CreateClient().GetAsync("/empresas/emp-1")).StatusCode == HttpStatusCode.Unauthorized,
            "Sin la política por defecto, una ruta que no abre sesión responde a cualquiera, sin token.");
}
```

El mensaje de cada `Assert` es el comentario del síntoma, pero ejecutable. El comentario frena al que lee la línea; el test frena también al que no la lee.

</details>

> 🔍 **¿Lo lograste?** `dotnet test`, desde `Empresas.Tests`, pasa en verde: tus tests de antes y estos siete.

## 🔨 Rómpelo: la limpieza, otra vez

Haz la limpieza del 💥: en tu `AgregarEmpresas`, comenta `opts.Policies.UseDurableLocalQueues();` y corre `dotnet test`. Compila, y cae solo `Las_colas_locales_son_durables`, con el síntoma que escribiste. Vuelve a ponerla.

Ahora la otra limpieza tentadora: cambia `OnException<JasperFx.ConcurrencyException>()` por `OnException<ConcurrencyException>()`, el nombre corto. Compila, porque es tu clase de [Concurrencia optimista](./concurrencia-optimista.md). Caen dos: `El_choque_de_concurrencia_se_reintenta`, con `Sin la política sobre JasperFx.ConcurrencyException, …`, y tu `CarreraDelPagoTests`, porque los avisos que chocan ya no se reintentan. Deshazlo. Con cualquiera de las otras líneas de la tabla pasa lo mismo: quitarla compila y deja un rojo que nombra su síntoma.

## El aporte de vuelta a la librería

Hay un segundo movimiento, y cierra el arco **usar** la librería → **mantenerla** (observarla, en [Observar el motor nuevo](./observar-el-motor-nuevo.md)) → **aportar**. Que tengas que poner "NO quitar" sobre `UseDurableLocalQueues()` es una señal: su ausencia falla **en silencio**. Eso se **devuelve** a la librería: un issue en el repo de Wolverine que nombra el síntoma que viviste, con tu caso concreto. Aquí solo **formulas** el issue; abrirlo de verdad, en la pestaña *Issues* del repo en GitHub, es opcional.

No todo default que no te gusta merece un issue. El no-durable **podría** ser a propósito, porque durable es más lento (un `INSERT` por mensaje). Lo que lo hace reportable es que **falla en silencio**, y por eso la petición justa quizá no sea "hazlo durable por defecto", sino "al menos advierte cuando la cola local no es durable".

Tu segundo caso trae evidencia. En [El proceso tiene dueño](./el-proceso-tiene-dueno.md) viste que la documentación de Wolverine dice que las sagas sobre Marten traen la comprobación de versión. Con sesiones ligeras y una `Saga` simple sin `IRevisioned`, dos respuestas a la vez se pisan en silencio. Ese issue no pide cambiar un default: muestra la diferencia entre la documentación y lo que pasa, con el código mínimo que la reproduce.

Los proyectos de tu organización que hacen esto bien dejan el síntoma pegado al código, con un `TODO[dueño]` (una nota dirigida al equipo que mantiene la librería) y el enlace al issue. El comentario y el test protegen tu código; el issue protege a todos los que usan la librería con ese default.

## ✅ Compruébalo

- [ ] Identificas al menos dos líneas cuya ausencia falla **en silencio** (no rompe compilación ni tests), y sabes el síntoma de cada una.
- [ ] Tu comentario nombra **qué se rompe y cómo se ve**, no lo que el código ya dice por su nombre.
- [ ] Tu `HostDePrueba` arranca tu `Program.cs` contra `empresas_tests`, sin tus secretos y sin el broker: `dotnet test` pasa con el broker detenido, y la base de tu servicio no cambia.
- [ ] Si quitas `UseDurableLocalQueues`, `UseDurableOutbox`, un `IncludeAssembly`, `Separated`, la política de concurrencia, el daemon o la política por defecto, cae el `[Fact]` de esa línea, con su síntoma como mensaje.
- [ ] Sabes formular el aporte de vuelta: el título del issue y el síntoma concreto, y por qué "al menos advierte" puede ser mejor petición que "cambia el default".

## 🆘 Si algo salió mal

- **Crees que con un broker que guarda sus colas en disco esta línea sobra:** `UseDurableLocalQueues` hace durable la bandeja de entrada (el *inbox*) de tus colas locales: Wolverine guarda cada mensaje en `wolverine_incoming_envelopes` hasta que su handler termina. El disco del broker protege los mensajes que el broker todavía tiene, no los que tu servicio ya recibió y no terminó. Esos solo los protege un inbox durable en quien los recibe.
- **El test cae con `InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.`:** fija `CADENA_POSTGRES` en la terminal donde corres `dotnet test`.
- **El test cae con `3D000: database "empresas_tests" does not exist`:** falta la base de pruebas. Créala como en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md).
- **El test cae con `ExistingStreamIdCollisionException`:** tu `Program.cs` todavía siembra una empresa entre `var app = builder.Build();` y `app.Run();`, y el host del test la corre en cada arranque: la segunda corrida choca. Quita la siembra.
- **`dotnet test` tarda y cae con `Unable to initialize the Broker rabbitmq in time`:** falta `DisableAllExternalWolverineTransports()` en el `ConfigureWebHost` de tu `HostDePrueba`, y el host del test intenta conectarse al broker.
- **`WebApplicationFactory`, `IWebHostBuilder`, `HandlerGraph` o `IWithFailurePolicies` no compilan:** falta el paquete `Microsoft.AspNetCore.Mvc.Testing` en `Empresas.Tests`, o un `using` (`Microsoft.AspNetCore.Hosting`, `Wolverine.Runtime.Handlers`, `Wolverine.ErrorHandling`).

## 📓 Registra tu avance

> 💭 **Reto:** elige una línea de tu código cuya ausencia falle en silencio. Escribe (a) el comentario del síntoma que la protege, (b) el `Assert` que la protege en tu test y (c) el título del issue que abrirías en Marten o Wolverine si su default fue el que te obligó a ponerla. ¿Qué tienen en común?

```bash
git add .
git commit -m "ES · El comentario que sobrevive (nombrar el síntoma + el test que lo protege + aportar upstream)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una línea que carga peso y cuya ausencia falla en silencio necesita un comentario que nombre el **síntoma** (qué se rompe y cómo se ve), no la mecánica que el nombre ya grita. Un test que le pregunta al host si la tiene, con el síntoma como mensaje, la protege también del que no lee. Y cuando esa línea existe porque un **default** de la librería falla callado, el mismo síntoma se devuelve como un issue upstream: usar, mantener, aportar.

---

[⬅️ Volver: El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md)

[➡️ Siguiente: La plantilla](./la-plantilla.md)
