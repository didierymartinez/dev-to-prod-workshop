# La plantilla dentro del handler

Tu plantilla guarda dos agregados y tiene un README que compila. Pero solo la usan tu `Program.cs` y tus tests: tus handlers siguen escribiendo sus `Append` a mano.

## 🎯 El Objetivo

Usar la plantilla dentro de tus handlers de Wolverine: que el handler solo decida, y que sus hechos y sus mensajes entren en una sola transacción, la que Wolverine confirma al final. Que los handlers que no la usan, como el disparo del cobro del mes, sigan como estaban. Y un test que se ponga rojo si los hechos de un handler dejan de guardarse.

## 💥 El dolor: `CommitAsync` es un commit a mano

Pasa tu `SuspenderHandler` a la plantilla, como enseña `ComoUsarLaPlantilla`: cargar, decidir, registrar lo que nace y confirmar. Es el bloque del segundo agregado de [La plantilla](./la-plantilla.md), ahora dentro del handler:

```csharp
// Empresas.Historia/Handlers.cs: tu SuspenderHandler, con la plantilla
public static async Task<OutgoingMessages> Handle(SuspenderEmpresa cmd, IDocumentSession session, IOptions<PlazosDeSuspension> plazos, ILogger logger)
{
    var salida = new OutgoingMessages();
    var uow = new MartenUnitOfWork(session);
    var empresa = await uow.Cargar<Empresa>(cmd.EmpresaId);                      // Cargar promete una Empresa: sin ?? throw
    // … la guarda de un proceso a la vez, con su log, como la tenías …
    var suspensionId = $"susp-{cmd.EmpresaId}-{empresa.Version + 1}";
    var nit = empresa.Nit;
    empresa.Suspender(cmd.Motivo, suspensionId);                                 // la empresa decide
    uow.Registrar(SuspensionDeEmpresa.Solicitar(suspensionId, cmd.EmpresaId, nit, empresa.Plan));   // el proceso nace
    await uow.CommitAsync();

    // … el anuncio, los pedidos y el plazo en salida, como los tenías …
    return salida;
}
```

Justo después del `CommitAsync`, pon la falla tardía de [El host y la inyección](./el-host-y-la-inyeccion.md): `throw new InvalidOperationException("falla después de confirmar");`. Siembra dos empresas activas, una para esta falla y otra para el Paso 1, entre `var app = builder.Build();` y `app.Run();`. Quita la siembra tras el primer arranque:

```csharp
await using (var s = store.LightweightSession("acme"))
{
    Sembrar(s, "emp-46", "904600000", "Ferretería Andina", "Basico");
    Sembrar(s, "emp-47", "904700000", "Vivero del Sur", "Basico");
    await s.SaveChangesAsync();
}
```

```bash
curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-46/suspender      # → 500
```

```sql
SELECT stream_id, version, type FROM mt_events WHERE stream_id IN ('emp-46', 'susp-emp-46-2') ORDER BY seq_id;
-- emp-46        | 1 | empresa_registrada
-- susp-emp-46-2 | 1 | suspension_solicitada
-- emp-46        | 2 | empresa_suspendida
SELECT count(*) FROM multas WHERE nit = '904600000';   -- 0
```

La petición falló, los hechos quedaron y los pedidos no salieron. Es el commit a mano de [El outbox](./el-outbox.md), aunque no escribiste un `SaveChangesAsync`: está dentro de `CommitAsync`. Lo que devuelves entra al outbox cuando el handler termina, y para entonces tus hechos ya se confirmaron en otra transacción. Ocho repositorios de la organización confirman así. Quitar el `CommitAsync` tampoco sirve: la unidad de trabajo solo pasa los hechos a la sesión dentro de `CommitAsync`. Sin él, los pedidos salen y los hechos no: el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md).

## 🔧 La unidad de trabajo vuelca; Wolverine confirma

Falta un paso que deje los hechos en la sesión sin confirmarla. Un `uow.Volcar()` al final de cada handler bastaría, pero es una línea por handler, y el que la olvide responde 200 sin guardar nada. Ese paso le toca a Wolverine, que ya corre alrededor de cada handler.

> 🆕 **Un middleware que corre después del handler.** El de [Seguir una acción](./seguir-una-accion.md) tenía un `Before`; este tiene un método `After`, y se registra igual, con `opts.Policies.AddMiddleware<T>()`. Wolverine llama a ese `After` después de cada handler, antes del `SaveChangesAsync` que pone `AutoApplyTransactions`. Sus parámetros se resuelven como los del handler. Si los dos piden una `MartenUnitOfWork`, Wolverine crea una por mensaje y les pasa la misma a los dos. No la registras en el contenedor: Wolverine ve que su constructor pide una `IDocumentSession` y le pasa la del mensaje, la que enroló en el outbox, abierta con el tenant del sobre. La plantilla no elige tenant: gana el del sobre, como en [El contexto que falta](./el-contexto-que-falta.md). Para cada handler, Wolverine escribe una clase y la compila al arrancar: para eso es `WolverineFx.RuntimeCompilation`. La de `SuspenderEmpresa`, resumida, con tu handler del Paso 1:

```csharp
await using var documentSession = _outboxedSessionFactory.OpenSession(context);   // la sesión del mensaje
var martenUnitOfWork = new MartenUnitOfWork(documentSession);
var outgoing1 = await SuspenderHandler.Handle(suspenderEmpresa, martenUnitOfWork, _optionsOfPlazosDeSuspension, _loggerForMessage);   // tu handler decide
await context.EnqueueCascadingAsync(outgoing1);                                   // lo que devuelve, a los mensajes de la sesión
new UnidadDeTrabajoMiddleware().After(martenUnitOfWork);                          // el middleware vuelca
await documentSession.SaveChangesAsync(cancellation);                             // AutoApplyTransactions confirma hechos y mensajes, una vez
```

### Paso 1 · El handler solo decide

> 🛠️ **Inténtalo tú.** Quiero este `SuspenderHandler`, que no confirma nada, y que sus hechos queden en el diario:
>
> ```csharp
> public static async Task<OutgoingMessages> Handle(SuspenderEmpresa cmd, MartenUnitOfWork uow, IOptions<PlazosDeSuspension> plazos, ILogger logger)
> {
>     var salida = new OutgoingMessages();
>     var empresa = await uow.Cargar<Empresa>(cmd.EmpresaId);   // la unidad de trabajo del mensaje
>     // … la guarda con su log, la decisión, el proceso que nace y la salida, como en el 💥, sin el CommitAsync …
>     return salida;
> }
> ```
>
> Para eso: **(1)** En `MartenUnitOfWork`, saca de `CommitAsync` un método público `Volcar()`, con los `StartStream` y los `Append` y sin `SaveChangesAsync`. `CommitAsync` llama a `Volcar`, confirma y hace `MarcarConfirmados`: es para fuera de un handler, como tu `ComoUsarLaPlantilla`. `Volcar` no marca: la unidad de trabajo se descarta con el mensaje. **(2)** Crea `UnidadDeTrabajoMiddleware`, con un `After` que reciba la `MartenUnitOfWork` y la vuelque. Regístralo en el `AddWolverine` de tu `AgregarEmpresas`, junto a `AutoApplyTransactions()`: tu `HostConDaemon` lo recibe de ahí. **(3)** Cambia tu `SuspenderHandler` por el de arriba: pide la `MartenUnitOfWork` en vez de la sesión, sin el `new` y sin el `CommitAsync`. Deja la falla donde estaba el `CommitAsync`. **(4)** Tu `SuspenderHandlerTests` deja de compilar, porque le pasa la sesión al `Handle`: pásale `new MartenUnitOfWork(session)`, con el plazo y el `NullLogger.Instance` de antes.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/MartenUnitOfWork.cs: CommitAsync, partido en dos
public void Volcar()   // los hechos de lo que rastrea, a la sesión, sin confirmar
{
    foreach (var a in _nuevos)      _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());
    foreach (var a in _modificados) if (a.SinConfirmar.Count > 0) _s.Events.Append(a.Id, a.SinConfirmar.ToArray());
}
public async Task CommitAsync()   // fuera de un handler: confirmas tú
{
    Volcar();
    await _s.SaveChangesAsync();
    foreach (var a in _nuevos.Concat(_modificados)) a.MarcarConfirmados();
}
```

```csharp
// Empresas.Historia/UnidadDeTrabajoMiddleware.cs: después del handler, antes del SaveChangesAsync de Wolverine
public class UnidadDeTrabajoMiddleware
{
    public void After(MartenUnitOfWork uow) => uow.Volcar();
}
```

```csharp
// Empresas.Historia/Configuracion.cs, en el AddWolverine de tu AgregarEmpresas
opts.Policies.AddMiddleware<UnidadDeTrabajoMiddleware>();   // NO quitar: sin esto, un handler con la plantilla responde y no guarda nada
opts.Policies.AutoApplyTransactions();
```

</details>

> 🔍 **¿Lo lograste?** Con la falla puesta, `curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-47/suspender` responde 500, y emp-47 se queda con su `empresa_registrada`: no se confirmó nada. Quita la falla y repite: 202, `empresa_suspendida` en emp-47, `suspension_solicitada` en `susp-emp-47-2` y, en un momento, una fila en `multas` para `904700000`.

### Paso 2 · Un test que lo fija

La línea del middleware carga peso, como las de [El comentario que sobrevive](./el-comentario-que-sobrevive.md): sin ella, tus handlers responden sin error y no guardan nada.

> 🛠️ **Inténtalo tú.** Quiero esto en un test de la colección `"host"`:
>
> ```csharp
> await bus.InvokeForTenantAsync("acme", new SuspenderEmpresa(id, "mora"));   // el handler no confirma nada
> Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);              // el registro y la suspensión
> ```
>
> Para eso: **(1)** Crea `LaPlantillaEnElHandler`, como tu `ComoUsarLaPlantilla`. Registra con la plantilla una empresa nueva de acme en cada corrida, y confírmala con `CommitAsync`: el test no es un handler. **(2)** Manda el comando por el bus, no llames a `Handle`: el middleware y el commit los pone Wolverine alrededor del handler. El `IMessageBus` es *scoped*, como la sesión de un endpoint en [El host y la inyección](./el-host-y-la-inyeccion.md): `app.Services` no te lo da. Abre un alcance con `using var scope = app.Services.CreateScope();` y pídeselo a `scope.ServiceProvider`. **(3)** Suma una línea al README de la plantilla: **Dentro de un handler:** pide la `MartenUnitOfWork` y no llames a `CommitAsync`, que es para fuera de un handler; el ejemplo es `Empresas.Tests/LaPlantillaEnElHandler.cs`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/LaPlantillaEnElHandler.cs: la plantilla dentro de un handler, en tu host
using Marten;
using Microsoft.Extensions.DependencyInjection;
using Wolverine;   // IMessageBus

[Collection("host")]
public class LaPlantillaEnElHandler(HostDePrueba app)
{
    [Fact]
    public async Task El_handler_no_confirma_y_sus_hechos_quedan()
    {
        var store = app.Services.GetRequiredService<IDocumentStore>();
        var id = $"emp-{Guid.NewGuid():N}";
        await using (var s = store.LightweightSession("acme"))   // el dado, fuera de un handler: aquí confirmas tú
        {
            var uow = new MartenUnitOfWork(s);
            uow.Registrar(Empresa.Registrar(id, $"nit-{id}", "Andes", "Basico"));
            await uow.CommitAsync();
        }

        using var scope = app.Services.CreateScope();   // el bus es scoped, como la sesión de un endpoint
        var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();
        await bus.InvokeForTenantAsync("acme", new SuspenderEmpresa(id, "mora"));   // el handler no confirma nada

        await using var q = store.LightweightSession("acme");
        Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);   // el registro y la suspensión
    }
}
```

</details>

### Paso 3 · El middleware, solo donde se pide

`dotnet test` pasa en verde, y tus `curl` responden lo esperado. Pero, desde el Paso 1, el log de tu servicio muestra una excepción cada 10 segundos, y el cron de [El cobro de cada tenant](./el-cobro-de-cada-tenant.md) no cobra. `SELECT count(*) FROM wolverine_dead_letters WHERE message_type = 'DisparoMensual';` suma uno en cada vuelta, y su `exception_message` dice `Default tenant *DEFAULT* usage is disabled`. Las líneas `at …` de la excepción pasan por `OutboxedSessionFactory.OpenSession`, dentro de la clase que Wolverine escribió para el disparo, y no llegan al `Handle` de tu `DisparoMensualHandler`.

Tu middleware corre en todos los handlers, también en los que no usan la plantilla, y su `After` pide una `MartenUnitOfWork`. Para crearla, Wolverine abre la sesión del mensaje antes de llamar al handler, con el tenant del sobre. Hasta el Paso 1, nada pedía una sesión en el disparo, y Wolverine no la abría. El disparo no trae tenant, porque reparte un cobro por tenant, y sin tenant tu Marten lanza: es el fail-fast de [El contexto que falta](./el-contexto-que-falta.md). Tu `CorrelacionEnElLog` también corre en todos los handlers y no rompe nada: pide el logger y el sobre, no una sesión.

> 🛠️ **Inténtalo tú.** Quiero esto otra vez en el log, cada 10 segundos: `Mes … de acme: cobrado` y `Mes … de globex: cobrado`. Para eso, aplica el middleware solo en los handlers que reciben una `MartenUnitOfWork`. `AddMiddleware<UnidadDeTrabajoMiddleware>(chain => …)` recibe un filtro, y el middleware entra solo donde la función da `true`. `chain` es lo que Wolverine arma para un mensaje, y `chain.Handlers` son sus `Handle`. El `Method` de cada uno es su método, como el que te da `GetMethod` en [La plantilla se prueba](./la-plantilla-se-prueba.md), y su `GetParameters()` da sus parámetros, cada uno con su `ParameterType`. Filtra por el parámetro, no por el mensaje: así lo recibe el próximo handler que pida la unidad de trabajo, y no el próximo trabajo sin tenant.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, en el AddWolverine de tu AgregarEmpresas: el mismo AddMiddleware, con un filtro
opts.Policies.AddMiddleware<UnidadDeTrabajoMiddleware>(chain =>   // NO quitar: sin esto, un handler con la plantilla responde y no guarda nada
    chain.Handlers.Any(h => h.Method.GetParameters().Any(p => p.ParameterType == typeof(MartenUnitOfWork))));   // sin el filtro, el cron deja de cobrar sin un error: su disparo, sin tenant, cae a dead letters
```

</details>

> 🔍 **¿Lo lograste?** Reinicia tu servicio. En menos de medio minuto, el log vuelve a decir `cobrado`, una vez por tenant, y `SELECT tenant, max(periodo) FROM mensualidades GROUP BY tenant;` avanza cada 10 segundos. Los disparos que fallaron se quedan en dead letters: son meses sin cobrar, y su `count(*)` deja de crecer. `dotnet test` sigue en verde.

## 🔨 Rómpelo: el middleware que falta, y la versión que no llega · no lo saltes

[El capstone: FetchForWriting](./el-capstone-fetchforwriting.md) parte de lo que dejas aquí: el paso de tu `RegistrarPagoHandler` a la plantilla, que ahí repites, y por qué hoy se deshace.

**El middleware que falta.** Quita el `AddMiddleware` de tu `AgregarEmpresas`. Todo compila, y en `dotnet test` cae tu test nuevo, con `Expected: 2` y `Actual: 1`. Cae también `VistaSuspendidaTests`: tu `HostConDaemon` arranca con la misma función. El handler corrió sin error, y nadie volcó su unidad de trabajo: el mismo silencio que un `Volcar` olvidado. Con el middleware es un solo `AddMiddleware`, y este test lo vigila. Devuélvelo con su filtro, pero después de `AutoApplyTransactions()`: verde. En Wolverine 6, los `After` corren antes del `SaveChangesAsync` en cualquier orden de registro, y este test te avisa si una versión cambia eso. La librería de la organización depende de ese orden, y ningún test lo prueba. Si quitas solo el filtro, `dotnet test` sigue en verde: al filtro lo cuida su comentario, no un test.

**La versión que no llega.** Tu `RegistrarPagoHandler` parece el siguiente. Pásalo a la plantilla: que pida la `MartenUnitOfWork` en vez de la sesión, cargue con `uow.Cargar`, conserve su guarda con su `LogWarning` y, en vez de su `Append`, llame a `empresa.RegistrarPago(cmd.Monto, cmd.Referencia)`. Corre `dotnet test --filter CarreraDelPagoTests`, solo: con la suite completa, la carrera puede no darse. Cae `Diez_avisos_del_mismo_pago_a_la_vez_dejan_un_pago`, con `Assert.Single() Failure: The collection contained 2 matching items`.

Tu `Append` llevaba la versión esperada de [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md), `empresa.Version + 1`. El de `Volcar` no lleva ninguna: dos avisos cargaron la misma versión, y los dos pagos entraron. Deshazlo. `RegistrarPagoHandler` se queda con su sesión, como tu `ProcesoDeSuspensionHandler`, hasta que la plantilla lleve la versión esperada.

## El Descubrimiento

Dentro de un handler, la unidad de trabajo es la del mensaje. Wolverine la crea con la sesión que enroló en el outbox, tu handler decide, el middleware vuelca y `AutoApplyTransactions` confirma los hechos y los mensajes en una transacción. El middleware entra solo donde un handler pide la unidad de trabajo: crearla abre una sesión, y una sesión pide un tenant que no todo mensaje trae. Del handler salieron el `new` y el `CommitAsync`. Es el `UnitOfWorkMiddleware` de `Cosmos.BuildingBlocks`, el middleware anunciado en [Decidir el futuro](./decidir-el-futuro.md). `CommitAsync` se queda para donde no hay un mensaje: tu `Program.cs` y tus tests.

> 🌱 Ahora que nadie confirma a mitad del mensaje, el mensaje entero es una sola unidad de trabajo. Si dos pasos del mismo mensaje cargan la misma empresa, cada uno recibe su copia, y ninguna ve lo que decidió la otra: es [Lo que la unidad de trabajo ya tiene](./lo-que-la-unidad-de-trabajo-ya-tiene.md).

## ✅ Compruébalo

- [ ] Con un `CommitAsync` dentro del handler y una falla después, viste los hechos guardados sin sus pedidos; sabes por qué es un `SaveChangesAsync` a mano.
- [ ] `SuspenderHandler` recibe la `MartenUnitOfWork` y no confirma nada. Con la falla puesta no queda ningún hecho; sin ella quedan los hechos y la multa.
- [ ] `CommitAsync` es `Volcar` más el `SaveChangesAsync`, y solo lo llaman tu `Program.cs` y tus tests.
- [ ] Con el middleware en todos los handlers, el cron dejó de cobrar sin que cayera un test, y sus disparos fueron a dead letters. Con el filtro, cobra otra vez por tenant.
- [ ] `LaPlantillaEnElHandler` cae si quitas el `AddMiddleware`, y pasa con él antes o después de `AutoApplyTransactions()`.
- [ ] Con tu `RegistrarPagoHandler` sobre la plantilla, `CarreraDelPagoTests` cayó con dos pagos: el `Append` de `Volcar` no lleva versión esperada.
- [ ] Tu README dice cómo se usa la plantilla dentro de un handler, y señala el test que lo prueba.

## 🆘 Si algo salió mal

- **`EmptyEventStreamException: A new event stream ('susp-…') cannot be started without any events`:** quedó un `CommitAsync` en el handler. Ese `CommitAsync` confirma, y luego el middleware vuelve a abrir el stream que nace, ya sin hechos. Quítalo.
- **El handler responde y el diario no cambia:** el handler crea su propia `new MartenUnitOfWork(session)`, y nadie la vuelca: el middleware solo vuelca la que Wolverine le pasa al handler. Pide la unidad de trabajo como parámetro.
- **Con el filtro, el log sigue diciendo `DefaultTenantUsageDisabledException` en `DisparoMensual`:** tu filtro da `true` en todos los handlers, o el servicio no se reinició. Debe dar `true` solo si un parámetro de un `Handle` es una `MartenUnitOfWork`.
- **`Cannot resolve scoped service 'Wolverine.IMessageBus' from root provider`:** le pediste el bus a `app.Services`. Pídeselo a un `app.Services.CreateScope()`.
- **Tus tests caen al arrancar el host con `ExistingStreamIdCollisionException`:** quedó la siembra de emp-46 y emp-47 en tu `Program.cs`, y el host del test la corre en cada arranque. Quítala.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- La plantilla dentro del handler: el handler recibe la `MartenUnitOfWork` y no confirma; `UnidadDeTrabajoMiddleware` la vuelca, solo en los handlers que la piden, y `AutoApplyTransactions` confirma hechos y mensajes juntos. Sin ese filtro, el disparo del cron, que no trae tenant, cae a dead letters. `CommitAsync`, solo fuera de un handler. `LaPlantillaEnElHandler` lo fija. Un handler cuyo `Append` lleva versión esperada se queda con su sesión mientras la plantilla no la lleve.
```

> 💭 **Reto:** la sesión de tu handler es la que Wolverine enroló en el outbox. ¿Por qué, entonces, un `CommitAsync` dentro del handler parte en dos la transacción del mensaje? Y: ¿qué cambió de lugar para que el handler ya no tenga que llamar a nada? ¿Por qué tu cron dejó de cobrar, si su handler no usa la plantilla?

```bash
git add .
git commit -m "ES · La plantilla dentro del handler (el handler decide; el middleware vuelca; Wolverine confirma)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Dentro de un handler, el handler solo decide: Wolverine le da una unidad de trabajo con la sesión del mensaje, un middleware la vuelca solo donde se pide y `AutoApplyTransactions` confirma hechos y mensajes juntos; un `CommitAsync` ahí es un commit a mano, y un test en el host se pone rojo si falta el middleware.

---

[⬅️ Volver: El README que compila](./el-readme-que-compila.md)

[➡️ Siguiente: Lo que la unidad de trabajo ya tiene](./lo-que-la-unidad-de-trabajo-ya-tiene.md)
