# El arnés usa la misma configuración

Tu servicio y tu worker ya arrancan con `AgregarEmpresas`. Tu `grep` dejó un tercer host con su propia copia: el de tus tests.

## 🎯 El Objetivo

Que tus tests arranquen su host con la misma función que tu servicio, para que un verde hable de tu servicio. Y fijar con un test, por el bus, que diez avisos del mismo pago a la vez dejan un solo pago.

## 💥 El dolor: el test que prueba otra cosa

Un banco reenvía su aviso de pago cuando no recibe respuesta a tiempo, y a veces llegan varios juntos. Tu servicio lo aguanta: la referencia de [Llegó dos veces](./llego-dos-veces.md), la versión esperada y el reintento del choque de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). Fíjalo en un test, con los avisos como llegan en producción: por el bus, diez a la vez, contra Postgres. Va en tu colección `"daemon"`, la de tu `HostConDaemon`, el único host de tus tests con bus:

```csharp
// Empresas.Tests/CarreraDelPagoTests.cs: la carrera de un pago repetido, por el bus, como llega en producción
using Marten;

[Collection("daemon")]
public class CarreraDelPagoTests(HostConDaemon daemon) : IAsyncLifetime
{
    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Diez_avisos_del_mismo_pago_a_la_vez_dejan_un_pago()
    {
        await using (var s = daemon.Store.LightweightSession())
        {
            s.Events.StartStream<Empresa>("emp-146", new EmpresaRegistrada("914600000", "Vidriería Norte", "Basico"));
            await s.SaveChangesAsync();
        }

        var avisos = Enumerable.Range(0, 10).Select(_ => daemon.Bus.InvokeAsync(new RegistrarPago("emp-146", "pago-146-1", 50_000)));
        await Task.WhenAll(avisos);   // los diez responden bien, como en tu servicio

        await using var q = daemon.Store.QuerySession();
        var hechos = await q.Events.FetchStreamAsync("emp-146");
        Assert.Single(hechos, h => h.Data is PagoRegistrado);   // y el diario guarda uno
    }
}
```

Corre `dotnet test --filter CarreraDelPagoTests`, con `CADENA_POSTGRES` fijada: rojo.

```
JasperFx.Events.EventStreamUnexpectedMaxEventIdException : …
```

En `empresas_tests`, `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-146' AND type = 'pago_registrado';` da 1: el diario está bien. Lo que falla son los avisos que chocaron y no reintentaron. Tu servicio sí reintenta. Tu `HostConDaemon` no: armaste su `AddWolverine` en [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) con lo que una vista necesitaba, sin el reintento.

No es la única diferencia. Corre solo `dotnet test --filter Suspender_por_el_bus_llega_a_la_vista`, y en `empresas_tests` mira el proceso de esa suspensión:

```sql
SELECT type FROM mt_events WHERE stream_id = 'susp-emp-14-2' ORDER BY version;
-- suspension_solicitada
-- suspension_vencida
```

Venció enseguida. Sin tu `AddOptions<PlazosDeSuspension>`, `IOptions` entrega la clase con sus valores por defecto, y el plazo es 0, sin error. Tu copia tampoco tiene la correlación, ni el tablero, ni a Facturación y Accesos. Para probar una vista bastaba ese host reducido. Con una copia, ni el rojo ni el verde hablan de tu servicio. Ocho servicios de la organización arman así sus tests, con un `AddMarten` propio, distinto del de producción.

## 🔧 El arnés llama a tu función

> 🆕 **Un valor puesto en la configuración del host.** `builder.Configuration["ConnectionStrings:Postgres"] = deTests;` pone esa clave en la configuración del host, por encima de las fuentes que ya leyó. Una fuente que se agrega después puede ganarle: tu función agrega los archivos de `DirectorioDeSecretos`. Si esa variable sigue fijada en tu terminal, tus tests leerían la cadena de tu servicio, y el reset de cada test vaciaría su base. `builder.Configuration["DirectorioDeSecretos"] = "sin-secretos";` apunta esa fuente a una carpeta que no existe.

> 🛠️ **Inténtalo tú.** Quiero que tu fixture arme el host así:
>
> ```csharp
> var builder = Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder();
> builder.Configuration["DirectorioDeSecretos"] = "sin-secretos";   // que no lea los secretos de tu servicio
> builder.Configuration["ConnectionStrings:Postgres"] = deTests;    // la base de pruebas
> builder.Configuration["Suspension:PlazoEnSegundos"] = "10";       // un plazo que no vence a mitad de un test
> builder.AgregarEmpresas(/* el papel del host de pruebas */);
> ```
>
> Haz que funcione: en el `InitializeAsync` de tu `HostConDaemon`, cambia tu `AddMarten` y tu `AddWolverine` por esas líneas, después de calcular `deTests`. Sin el plazo, tu función no arranca, por `ValidateOnStart`, como le pasó al worker. Elige su papel: el host de pruebas corre el daemon, como único proceso de su base, y es el dueño de sus tablas. Quita los `using` que ya no usa, y agrega el de `AutoCreate`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/HostConDaemon.cs: tu host, armado con la misma función que tu servicio, contra la base de pruebas
using JasperFx;                     // AutoCreate
using JasperFx.Events.Daemon;       // DaemonMode
using Marten;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;                       // NpgsqlConnectionStringBuilder
using Wolverine;

public class HostConDaemon : IAsyncLifetime
{
    // … Host, Store y Bus, como antes

    public async Task InitializeAsync()   // una vez, antes del primer test de la colección
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        var deTests = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;

        var builder = Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder();   // aquí, Host a secas es la propiedad
        builder.Configuration["DirectorioDeSecretos"] = "sin-secretos";   // que no lea los secretos de tu servicio
        builder.Configuration["ConnectionStrings:Postgres"] = deTests;    // la base de pruebas, por la clave que lee tu función
        builder.Configuration["Suspension:PlazoEnSegundos"] = "10";       // un plazo que no vence a mitad de un test
        builder.AgregarEmpresas(DaemonMode.Solo, AutoCreate.CreateOrUpdate);   // el único daemon de su base, y dueño de sus tablas

        Host = builder.Build();
        await Host.StartAsync();   // el daemon arranca aquí
    }

    // … DisposeAsync, como antes
}
```

</details>

> 🔍 **¿Lo lograste?** `dotnet test` pasa en verde, `CarreraDelPagoTests` incluido. Repite el test de la suspensión y su consulta: ya no sale `suspension_vencida`.

Mira ahora las dead letters: `SELECT message_type, exception_message FROM wolverine_dead_letters;` en `empresas_tests` trae `facturacion.cobrar-multa.v1 | 42P01: relation "multas" does not exist`. Facturación corre ahora en tus tests, como en tu servicio. Sus tablas las creaste a mano, fuera de Marten, y `AutoCreate` no las conoce. Cópialas de tu base, sin filas: `pg_dump -s` saca la forma de las tablas que nombra cada `-t`, y `psql` la crea en la base de pruebas.

```bash
docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas_tests"
```

Esa forma también es una copia: si cambias una de esas tablas, cópiala otra vez. Borra las dead letters de `empresas_tests` (`DELETE FROM wolverine_dead_letters;`) y corre `dotnet test` otra vez: Facturación ya no deja ninguna. Si aparece una de `RevisarSuspension`, mira "Si algo salió mal".

## 🔨 Rómpelo: la limpieza que el test ve

Alguien limpia `AgregarEmpresas` y piensa que la política del choque sobra, porque el handler ya escribe con versión esperada. Comenta las dos líneas de `OnException<JasperFx.ConcurrencyException>()` y corre `dotnet test`: cae `CarreraDelPagoTests`, con el mismo `EventStreamUnexpectedMaxEventIdException` del dolor. Antes, ese rojo salía de tu copia. Ahora sale porque tu servicio perdió la línea: en producción, nueve de cada diez avisos responderían 409. Como tus tres hosts llaman a la misma función, ese rojo vale para los tres. Descoméntalas.

## El Descubrimiento

Tu host de pruebas es un host más del contexto, y arranca con la misma función: lo único suyo es su papel y sus valores, como su base y su plazo. Así un verde dice que lo que corre funciona, y un rojo, que lo que corre se rompió. Un test de aceptación prueba la regla como la trata el servicio: por el bus, varios pedidos a la vez, contra Postgres. Y prueba también la configuración: quitar una línea de la función tumba el test.

> 🌱 Tus hosts comparten la configuración y la base, y cada uno trata sus mensajes en sus colas locales, dentro de su proceso. El día que otro equipo quiera escucharte desde el suyo, el anuncio de un plan tiene que cruzar entre procesos, y en [El broker de verdad](./el-broker-de-verdad.md) se pierde sin un error.

## ✅ Compruébalo

- [ ] Con la copia, `CarreraDelPagoTests` cayó por la política que faltaba, y el plazo de la suspensión fue 0.
- [ ] Tu `HostConDaemon` arma el host con `AgregarEmpresas(DaemonMode.Solo, AutoCreate.CreateOrUpdate)`, su propia base y sin tus secretos, y `dotnet test` pasa.
- [ ] Facturación corre en tus tests: sin sus tablas dejó dead letters, y con ellas no.
- [ ] Sin la política del choque en tu función, cae `CarreraDelPagoTests`.

## 🆘 Si algo salió mal

- **`OptionsValidationException … PlazoEnSegundos` al arrancar los tests:** falta la clave `Suspension:PlazoEnSegundos` en la configuración del fixture.
- **`Falta ConnectionStrings:Postgres.`:** la clave va antes de llamar `AgregarEmpresas`, que la lee en esa línea.
- **Aparece `RevisarSuspension … No existe la suspensión` en las dead letters de pruebas:** un test suspendió, y su plazo venció después de que otro test vació la base. No viene de Facturación.
- **Tu servicio perdió sus empresas después de `dotnet test`:** el fixture leyó la cadena de tu servicio. Revisa la línea de `DirectorioDeSecretos` del fixture.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Mis tests arrancan su host con `AgregarEmpresas`, como el servicio y el worker; el fixture solo pone su base, su plazo y su papel, y no lee los secretos del servicio. Un test de aceptación, por el bus y contra Postgres, fija que diez avisos del mismo pago dejan uno: si alguien quita la política del choque, cae.

> 💭 **Reto:** ¿por qué tu copia daba un rojo que tu servicio no tenía? ¿Qué otra línea de tu función tumbaría `CarreraDelPagoTests` si alguien la quitara?

```bash
git add .
git commit -m "ES · El arnés usa la misma configuración" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El host de tus tests es un host más del contexto y arranca con la misma función, con su base y su papel; por eso su verde y su rojo hablan de lo que corre, y un test de aceptación por el bus protege también la configuración.

---

[⬅️ Volver: Dos hosts, una configuración](./dos-hosts-una-configuracion.md)

[➡️ Siguiente: El broker de verdad](./el-broker-de-verdad.md)
