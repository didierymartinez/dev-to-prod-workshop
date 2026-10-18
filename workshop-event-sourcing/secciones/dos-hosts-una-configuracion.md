# Dos hosts, una configuración

Ya sigues cada pedido por tu servicio. Ahora aparece otro programa que escribe en el mismo diario.

## 🎯 El Objetivo

Que todo programa que escribe en el diario de Empresas arranque con la misma configuración que tu servicio. Y que cada uno diga solo su papel: si corre el daemon, y si puede cambiar las tablas.

## 💥 El dolor: el worker que cambia planes de noche

Comercial vende cambios de plan, y cada noche deja en una carpeta un archivo con ellos, una línea por empresa: `emp-100;Premium`. Tu servicio no tiene un endpoint para cambiar planes, y el archivo no llega por HTTP. Lo procesa un programa aparte, un *worker*, que usa tus handlers: arranca, lee el archivo y termina. Radicación tiene así, junto a su API, un worker que aplica los pagos que llegan del ERP.

Con tu servicio arrancado en `Development`, da de alta emp-100 a emp-105, como emp-94 en [Seguir una acción](./seguir-una-accion.md):

```bash
for i in 100 101 102 103 104 105; do curl -s -o /dev/null -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-$i\",\"nit\":\"9${i}00000\",\"nombre\":\"Empresa $i\",\"plan\":\"Basico\"}"; done
```

Un compañero escribió el worker hace un tiempo, copiando de tu servicio lo que necesitaba para cambiar un plan. Créalo junto a tus proyectos con `dotnet new console -o Empresas.Worker`, dale tus handlers con `dotnet add Empresas.Worker reference Empresas.Historia`, y pon en su `Program.cs` la copia:

```csharp
// Empresas.Worker/Program.cs: los cambios de plan que manda Comercial, uno por línea
using JasperFx.Events;                           // StreamIdentity
using Marten;
using Microsoft.Extensions.Configuration;        // AddKeyPerFile, GetConnectionString
using Microsoft.Extensions.DependencyInjection;  // GetRequiredService
using Microsoft.Extensions.Hosting;              // Host
using Wolverine;
using Wolverine.Marten;                          // IntegrateWithWolverine

var builder = Host.CreateApplicationBuilder();
builder.Configuration.AddKeyPerFile(builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);
var cadena = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(cadena)) throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    Hechos.Registrar(opts);
})
.UseLightweightSessions()
.IntegrateWithWolverine();
builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();
    opts.Discovery.IncludeAssembly(typeof(CambiarPlanHandler).Assembly);   // tus handlers viven en Empresas.Historia
});

using var host = builder.Build();
await host.StartAsync();
var bus = host.Services.GetRequiredService<IMessageBus>();
foreach (var linea in await File.ReadAllLinesAsync(args[0]))
{
    var campos = linea.Split(';');
    await bus.InvokeAsync(new CambiarPlanDeEmpresa(campos[0], campos[1]));
    Console.WriteLine($"{campos[0]}: plan {campos[1]}");
}
await host.StopAsync();
```

Guarda la línea `emp-100;Premium` en un `cambios.csv`, en la raíz de tu solución. Con tu servicio corriendo, corre el worker desde `Empresas.Worker`, con tu directorio de secretos: `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv`. Imprime `emp-100: plan Premium`. Lo que va después de `--` le llega a tu programa en `args`. En PowerShell, fija antes `$env:DirectorioDeSecretos`. Desde aquí, «corre el worker con `emp-104;Premium`» es poner esa línea en `cambios.csv` y correrlo así. Ahora mira la base:

```sql
SELECT data->>'NuevoPlan' FROM mt_events WHERE stream_id = 'emp-100' AND type = 'plan_cambiado';   -- Premium
SELECT data->>'Plan' FROM mt_doc_empresadetalle WHERE id = 'emp-100';                            -- Basico
SELECT plan FROM plan_de_empresa WHERE nit = '910000000';                                        -- Basico
```

El diario dice Premium, y tu vista `Inline` dice Basico. Marten la escribe en la transacción del hecho, si quien escribe la registra. El worker no la registra. Facturación tampoco se enteró: el log del worker dice `No routes can be determined for Envelope … (Contratos.PlanDeEmpresaV1)`. Sin el `IncludeAssembly` de Facturación, el anuncio no tuvo a quién ir. La próxima mensualidad de emp-100 sale a precio de Basico. Así el worker de Radicación deja desactualizada su vista `Inline` del saldo, y otro proceso decide con ella.

Ahora suspende emp-101 por el endpoint: 500. El log de tu servicio dice `42703: column "correlation_id" does not exist`. Busca en el log del worker: `Executed schema update SQL: alter table public.mt_events drop column correlation_id;`. La copia es de antes de [Seguir una acción](./seguir-una-accion.md), y no tiene tu `CorrelationIdEnabled`. Al escribir su primer hecho, Marten dejó `mt_events` como dice la configuración del worker, y borró la columna. Desde ahí tu servicio no lee ni escribe hechos, y su daemon se detuvo.

Reinicia tu servicio. Su log dice `alter table public.mt_events add column correlation_id varchar NULL;`, y emp-101 se suspende: 202. Pero `SELECT count(*) FROM mt_events WHERE correlation_id = 'soporte-95';` da 0: la columna volvió vacía, y las correlaciones de antes se perdieron. Y `curl http://localhost:5000/empresas/emp-100` dice Premium: el tablero es `Async`, y lo proyecta el daemon de tu servicio, venga de donde venga el hecho.

## 🔧 Paso 1 · Una sola función arma los dos hosts

> 🆕 **Una configuración que reciben todos los hosts.** El `WebApplication.CreateBuilder` de tu servicio y el `Host.CreateApplicationBuilder` de tu worker comparten una interfaz, `IHostApplicationBuilder`: los dos tienen `Configuration` y `Services`. Un método de extensión sobre ella, como el de [El puerto propio](./el-puerto-propio.md), sirve a los dos: `public static void AgregarEmpresas(this IHostApplicationBuilder builder)`.

> 🛠️ **Inténtalo tú.** Quiero que los dos `Program.cs` arranquen así:
>
> ```csharp
> // Empresas.Historia/Program.cs
> var builder = WebApplication.CreateBuilder(args);
> builder.AgregarEmpresas();   // lo que comparten todos tus hosts
> // … tu AddProblemDetails y lo demás, como estaba
>
> // Empresas.Worker/Program.cs
> var builder = Host.CreateApplicationBuilder();
> builder.AgregarEmpresas();   // la misma configuración que tu servicio
> ```
>
> Haz que funcione: (1) Crea en `Empresas.Historia` la clase `static` `Configuracion` con ese método. (2) Muda a él, desde el `Program.cs` de tu servicio, todo lo que arma la configuración, Marten y Wolverine: el `AddKeyPerFile`, la cadena y su `throw`, `PlazosDeSuspension`, tu `AddMarten` y tu `AddWolverine`, enteros. Lo del borde HTTP se queda en `Program.cs`: `AddProblemDetails`, `UseExceptionHandler` y tu `app.Use` de la correlación. (3) Agrega un `IncludeAssembly` con el ensamblado de `Configuracion`: Wolverine busca handlers en el ensamblado que arranca el host, y en el worker ese no es `Empresas.Historia`. (4) Llama `AgregarEmpresas` en los dos `Program.cs`, y borra la copia del worker.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs: lo que todo host de Empresas comparte
// (los using que necesita lo que mudaste: JasperFx.Core, JasperFx.Events, Marten, Wolverine, …)
public static class Configuracion
{
    public static void AgregarEmpresas(this IHostApplicationBuilder builder)
    {
        builder.Configuration.AddKeyPerFile(builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);
        var cadena = builder.Configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(cadena)) throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");
        builder.Services.AddOptions<PlazosDeSuspension>()
            // … como lo tenías, hasta .ValidateOnStart();

        builder.Services.AddMarten(opts =>
        {
            // … tu AddMarten entero: la cadena, StreamIdentity, CorrelationIdEnabled, Hechos.Registrar,
            //   las tres proyecciones con su porqué y la línea de Metadata
        })
        .UseLightweightSessions()
        .IntegrateWithWolverine()
        .AddAsyncDaemon(DaemonMode.Solo);

        builder.Services.AddWolverine(opts =>
        {
            // … tu AddWolverine entero, y además:
            opts.Discovery.IncludeAssembly(typeof(Configuracion).Assembly);   // tus handlers, también si arranca otro proyecto
        });
    }
}
```

En el `Program.cs` de tu servicio queda `builder.AgregarEmpresas();` en lugar de todo lo que mudaste. El worker conserva sus `using` de `Wolverine`, `Microsoft.Extensions.DependencyInjection` y `Microsoft.Extensions.Hosting`.

</details>

> 🔍 **¿Lo lograste?** Corre el worker con `emp-100;Enterprise`. No arranca: `OptionsValidationException … PlazoEnSegundos must be between 1 and 300`. Tu función lleva todos tus handlers, también los de Facturación y Accesos, y el `ValidateOnStart` del plazo de la suspensión. Dale al worker su propio `appsettings.json`, con la sección `Suspension` del de tu servicio. En un despliegue, el valor les llega a los dos del mismo lugar: el entorno. Corre otra vez: `emp-100: plan Enterprise`, sin ninguna línea `schema update`. `EmpresaDetalle` y `plan_de_empresa` dicen Enterprise. Reinicia tu servicio y suspende emp-102 con `X-Correlation-Id: soporte-102`: 202, y `SELECT type FROM mt_events WHERE correlation_id = 'soporte-102';` trae sus hechos.

Busca, desde la raíz de tu solución, cuántas veces se arma Marten: `grep -rn "AddMarten" --include=*.cs .` (en PowerShell, `Get-ChildItem -Recurse -Filter *.cs | Select-String AddMarten`). Quedan `Configuracion.cs` y tu `HostConDaemon`. El servicio Entradas tiene dos arranques de Marten y Wolverine, y a uno no lo llama nadie. Quien lee ese cree que así está configurado Marten.

## 🔧 Paso 2 · El daemon, en una sola copia

El log del worker dice `Started projection agent VistaSuspendida:All` y `Tablero:All`: tu worker también corre el daemon. Y en producción tu servicio corre en dos copias, detrás de un balanceador, el que reparte las peticiones entre ellas. Arranca otra en una segunda terminal, desde `Empresas.Historia`: `ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5001` (en PowerShell, fija antes `$env:ASPNETCORE_ENVIRONMENT`). Registra y suspende diez empresas, repartidas entre las dos copias:

```bash
for i in $(seq 106 115); do p=$((5000 + i % 2)); curl -s -o /dev/null -X POST http://localhost:$p/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-$i\",\"nit\":\"9${i}00000\",\"nombre\":\"Empresa $i\",\"plan\":\"Basico\"}"; curl -s -o /dev/null -X POST http://localhost:$p/empresas/emp-$i/suspender; done
```

En el log de una de las dos sale `ProgressionProgressOutOfOrderException: Progression 'Identity: VistaSuspendida:All' is out of order. This may happen when multiple processes try to process the projection`, o lo mismo con `Tablero:All`. Cada copia corre su daemon, y los dos proyectan las mismas vistas. El que llega tarde a guardar su avance falla, y repite un trabajo que el otro ya hizo: las vistas quedan bien, y el log se llena de errores.

> 🆕 **El papel del daemon.** `DaemonMode.Solo` corre las vistas `Async` y supone que nadie más lo hace. `DaemonMode.HotCold` deja que varias copias lo pidan: una gana un candado en Postgres y corre las vistas, las demás esperan, y si la que corre muere, otra toma su lugar. `DaemonMode.Disabled` no corre ninguna.

> 🛠️ **Inténtalo tú.** Quiero que cada host diga su papel al llamar:
>
> ```csharp
> builder.AgregarEmpresas(DaemonMode.HotCold);    // el servicio: el daemon, en una de sus copias
> builder.AgregarEmpresas(DaemonMode.Disabled);   // el worker: corre un rato y termina
> ```
>
> Haz que funcione: dale a `AgregarEmpresas` ese parámetro, y pásaselo a `AddAsyncDaemon`. Los dos `Program.cs` necesitan `using JasperFx.Events.Daemon;`. Con `HotCold`, el worker también pediría el candado: con tu servicio apagado, lo ganaría y correría las vistas mientras dura.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs
public static void AgregarEmpresas(this IHostApplicationBuilder builder, DaemonMode daemon)
    // … como antes, y al final de la cadena de AddMarten:
    .AddAsyncDaemon(daemon);   // cada host dice si corre el daemon
```

</details>

> 🔍 **¿Lo lograste?** Arranca las dos copias y repite el reparto con emp-116 a emp-125: ningún `OutOfOrder`, y solo una copia dice `Started projection agent`. Detén esa copia: unos segundos después, el log de la otra lo dice. Corre el worker con `emp-104;Premium`: su log dice `Warning: The async daemon is disabled`, y el plan cambia. Deja corriendo solo la del 5000.

## 🔧 Paso 3 · Las tablas, de un solo dueño

Un despliegue no cambia todos los programas a la vez: por un rato, el servicio nuevo corre junto al worker de ayer. Simula un worker de ayer, que todavía no tenía la correlación. En `AgregarEmpresas`, cambia tu línea por `opts.Events.MetadataConfig.CorrelationIdEnabled = daemon != DaemonMode.Disabled;`, para que solo el worker la pierda, y córrelo con `emp-103;Premium`. Su log vuelve a decir `alter table public.mt_events drop column correlation_id;`, y suspender emp-105 vuelve al 500. Compartir la función no alcanza: cada programa deja las tablas como dice su configuración, y en un despliegue conviven dos. Reinicia tu servicio para recuperar la columna.

> 🆕 **El papel del esquema.** `opts.AutoCreateSchemaObjects` dice si Marten puede crear y cambiar tablas. Con `AutoCreate.CreateOrUpdate`, el valor que tenías sin escribirlo, las deja como dice su configuración. Con `AutoCreate.None` no las toca: si no coinciden con su configuración, falla.

> 🛠️ **Inténtalo tú.** Quiero que el worker de ayer falle él, sin tocar tus tablas:
>
> ```csharp
> builder.AgregarEmpresas(DaemonMode.HotCold, AutoCreate.CreateOrUpdate);   // el servicio: el único dueño de las tablas
> builder.AgregarEmpresas(DaemonMode.Disabled, AutoCreate.None);            // el worker de ayer: 42883 … mt_quick_append_events … does not exist
> ```
>
> Haz que funcione: dale a `AgregarEmpresas` ese segundo parámetro, y pásaselo a `opts.AutoCreateSchemaObjects`. Los dos `Program.cs` necesitan `using JasperFx;`. Con la línea del worker de ayer todavía puesta, córrelo con `emp-103;Premium`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs (con using JasperFx; para AutoCreate)
public static void AgregarEmpresas(this IHostApplicationBuilder builder, DaemonMode daemon, AutoCreate esquema)
    // … y en tu AddMarten:
    opts.AutoCreateSchemaObjects = esquema;   // solo el dueño crea y cambia tablas
```

</details>

> 🔍 **¿Lo lograste?** El worker cae en su primer cambio con `42883: function public.mt_quick_append_events(…) does not exist`: `mt_quick_append_events` es la función de Postgres con que Marten agrega hechos, y la del worker de ayer ya no existe. `\d mt_events` en `psql` sigue mostrando `correlation_id`, y suspender emp-103 da 202. Devuelve tu línea a `CorrelationIdEnabled = true;`. Cinco programas de un servicio de la organización cambian hoy el mismo esquema al arrancar, cada uno con su configuración. Tu servicio también cambia de versión, y su copia vieja convive con la nueva: en producción, también él iría con `None`, y las tablas las cambiaría un paso del despliegue, una vez. En tu máquina, el dueño es tu servicio.

## El Descubrimiento

Un contexto puede correr en varios procesos: el servicio, sus copias, un worker. Todos escriben el mismo diario, y todos tienen que verlo igual. Por eso su configuración es **una función** que todos llaman: los hechos y sus alias, las proyecciones con su ciclo de vida, la metadata y las políticas de Wolverine. Una vista `Inline` la corre quien escribe, así que va en todo host que escribe; una `Async` la corre el daemon, donde esté. Lo único que cambia de un host a otro es su **papel**, y se dice al llamar: `HotCold` en el que corre las vistas, aunque tenga copias, y `Disabled` en el resto; `CreateOrUpdate` en el único dueño de las tablas, y `None` en los demás. Lo que es del borde HTTP se queda en el host web.

> 🌱 Tu `grep` encontró un `AddMarten` más: el de tu `HostConDaemon`, que arma los tests con otra copia de tu configuración. Lo que tus tests prueban no es lo que corre, y en [El arnés usa la misma configuración](./el-arnes-usa-la-misma-configuracion.md) un test de aceptación lo deja a la vista.

## ✅ Compruébalo

- [ ] Con su copia, el worker cambió el plan en el diario y dejó `EmpresaDetalle` y la réplica de Facturación en Basico.
- [ ] El worker borró `correlation_id`, tu servicio respondió 500 hasta reiniciarlo, y las correlaciones de antes se perdieron.
- [ ] Con `AgregarEmpresas`, el worker falló sin la sección `Suspension`, y con ella su cambio llegó a `EmpresaDetalle` y a Facturación sin cambiar las columnas de `mt_events`.
- [ ] Con dos copias `Solo`, viste `ProgressionProgressOutOfOrderException`; con `HotCold`, una sola copia corre las vistas, y otra toma su lugar si la detienes.
- [ ] El worker de ayer borró la columna con `CreateOrUpdate`; con `AutoCreate.None`, falló él, y `mt_events` siguió con su columna.

## 🆘 Si algo salió mal

- **`AgregarEmpresas` no existe en el worker:** falta la referencia a `Empresas.Historia`, o la clase `Configuracion` no es `static`.
- **El worker lanza `Falta ConnectionStrings:Postgres.`:** corre en `Production`, sin tus user-secrets. Fija `DirectorioDeSecretos` con la ruta completa.
- **El worker no lee su `appsettings.json`:** córrelo desde la carpeta `Empresas.Worker`; lee el archivo de la carpeta donde arranca.
- **En Windows, el worker no compila mientras corre tu servicio (`MSB3027`, el archivo está en uso):** el servicio tiene abierta la DLL de `Empresas.Historia`. Detenlo, compila, y arráncalo otra vez.
- **No sale ningún `OutOfOrder` con dos copias `Solo`:** los dos daemons no coincidieron esa vez. Repite el reparto con otras diez empresas.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Todo host de Empresas arranca con `AgregarEmpresas`: hechos, proyecciones, metadata y políticas, en un solo lugar. Cada host dice su papel al llamarla. El servicio corre el daemon en `HotCold` y es el único dueño de las tablas en mi máquina; el worker va con `Disabled` y `AutoCreate.None`. Una vista `Inline` va en todo host que escribe. Lo del borde HTTP queda en el host web.

> 💭 **Reto:** ¿por qué el tablero vio el cambio del worker y `EmpresaDetalle` no? ¿Por qué compartir la función no bastó con el worker de ayer, y qué lo impide ahora?

```bash
git add .
git commit -m "ES · Dos hosts, una configuración" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Todos los hosts que escriben el mismo diario arrancan con la misma función de configuración, y cada uno solo dice su papel: quién corre el daemon y quién es el dueño de las tablas.

---

[⬅️ Volver: Seguir una acción](./seguir-una-accion.md)

[➡️ Siguiente: El arnés usa la misma configuración](./el-arnes-usa-la-misma-configuracion.md)
