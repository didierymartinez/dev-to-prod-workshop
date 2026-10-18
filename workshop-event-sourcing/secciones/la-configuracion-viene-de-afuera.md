# La configuración viene de afuera

Tu servicio ya lee `PermitirReset` de su configuración. Ahora le toca a lo demás que cambia de un lugar a otro.

## 🎯 El Objetivo

Que el plazo de la suspensión y la cadena de conexión le lleguen al servicio desde afuera del código, con un valor en tu máquina y otro en un despliegue. Y que el servicio no arranque si le falta uno.

## 💥 El dolor: el plazo está escrito en el código

En producción, Accesos tarda más que en tu máquina. Simúlalo: que el handler de `RevocarAccesosV1` espere 6 segundos antes de contestar.

```csharp
// Accesos/AccesosHandler.cs
public static async Task<AccesosRevocadosV2> Handle(RevocarAccesosV1 cmd)
{
    await Task.Delay(6000);   // en producción, Accesos tarda
    return new(cmd.SuspensionId, cmd.Nit);
}
```

Siembra seis empresas activas, de emp-70 a emp-75, como sembraste emp-10 en [El host y la inyección](./el-host-y-la-inyeccion.md): `for (var i = 70; i <= 75; i++) Sembrar(s, $"emp-{i}", $"90{i}00000", $"Empresa {i}", "Basico");`. Borra la siembra tras el primer arranque. Suspende emp-70 por el endpoint, espera unos 8 segundos y mira su proceso:

```sql
SELECT version, type FROM mt_events WHERE stream_id = 'susp-emp-70-2' ORDER BY version;
-- 1 | suspension_solicitada
-- 2 | cobro_de_multa_confirmado
-- 3 | suspension_vencida
-- 4 | revocacion_de_accesos_confirmada
-- 5 | suspension_efectiva
```

El plazo venció a los 5 segundos, y Accesos contestó en el sexto. La suspensión quedó efectiva, pero `suspension_vencida` quedó en el diario: una alarma falsa, que alguien del negocio va a atender. El plazo es el `5.Seconds()` de tu `SuspenderHandler`. Para darle 10 segundos en producción, hay que cambiar el código y compilar otra vez: un mismo binario no puede llevar un plazo distinto en cada lugar donde corre. Un servicio de la organización tiene así, escrito en un endpoint, un tiempo de espera de dos minutos.

## 🔧 Paso 1 · El plazo sale a la configuración

> 🆕 **`appsettings.json` y una clase para cada sección.** La configuración del host junta varias fuentes: el archivo `appsettings.json` de tu proyecto, las variables de entorno y los argumentos de la línea de comandos. Si dos traen la misma clave, gana la que se leyó después, y las variables de entorno se leen después del archivo. La clave `PlazoEnSegundos` de la sección `Suspension` se escribe `Suspension:PlazoEnSegundos`; en una variable de entorno, `Suspension__PlazoEnSegundos`. `builder.Services.AddOptions<T>().BindConfiguration("Suspension")` llena una clase tuya con esa sección, propiedad por propiedad, por su nombre: el handler pide `PlazosDeSuspension`, no una clave suelta. Un handler la recibe como recibe la sesión, como un parámetro más, envuelta en `IOptions<T>` (en `Microsoft.Extensions.Options`). La clase se llena la primera vez que alguien lee `.Value`.

> 🛠️ **Inténtalo tú.** Quiero que el plazo salga de un archivo:
>
> ```
> // Empresas.Historia/appsettings.json
> { "Suspension": { "PlazoEnSegundos": 10 } }
>
> POST /empresas/emp-71/suspender   →   susp-emp-71-2: … revocacion_de_accesos_confirmada, suspension_efectiva   (sin suspension_vencida)
> ```
>
> Haz que funcione: (1) Crea ese `appsettings.json` junto a tu `Program.cs`. (2) Crea una clase `PlazosDeSuspension` para esa sección, con `int PlazoEnSegundos { get; set; }`, y regístrala en tu `Program.cs`, después de `CreateBuilder`. (3) Que tu `SuspenderHandler` la reciba como un parámetro más, y que su `Delay` saque de ahí los segundos en vez del `5.Seconds()`. (4) Tu test de `SuspenderHandler` deja de compilar: ahora el método pide el plazo. Pásaselo con `Options.Create(new PlazosDeSuspension { PlazoEnSegundos = 5 })`, que arma un `IOptions` con el valor que le das. El test no espera el plazo: solo necesita un valor.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/PlazosDeSuspension.cs: la sección "Suspension" de la configuración
public class PlazosDeSuspension
{
    public int PlazoEnSegundos { get; set; }
}

// Empresas.Historia/Program.cs, después de var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOptions<PlazosDeSuspension>().BindConfiguration("Suspension");

// Empresas.Historia/Handlers.cs (con using Microsoft.Extensions.Options;)
public static async Task<OutgoingMessages> Handle(SuspenderEmpresa cmd, IDocumentSession session, IOptions<PlazosDeSuspension> plazos)
    // … igual que antes, hasta el plazo:
    salida.Delay(new RevisarSuspension(suspensionId), TimeSpan.FromSeconds(plazos.Value.PlazoEnSegundos));

// Empresas.Tests/SuspenderHandlerTests.cs (con using Microsoft.Extensions.Options;)
var plazos = Options.Create(new PlazosDeSuspension { PlazoEnSegundos = 5 });
var salida = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), session, plazos);
```

</details>

> 🔍 **¿Lo lograste?** El diario de `susp-emp-71-2` llega a `suspension_efectiva` sin `suspension_vencida`. Ahora cambia el plazo sin tocar el archivo ni el código. Detén el servicio, arráncalo con `Suspension__PlazoEnSegundos=3 dotnet run` y suspende emp-72: vuelve `suspension_vencida`. En PowerShell, fija antes `$env:Suspension__PlazoEnSegundos="3"`, y al terminar quítala con `Remove-Item Env:Suspension__PlazoEnSegundos`. La variable gana al archivo: cada despliegue fija su plazo, con el mismo binario. CosmosLens no lee tu configuración: en su `procesos.json`, pon `PlazoSegundos` en 10.

## 🔨 Rómpelo: el valor que nunca llegó · no lo saltes

[Dos hosts, una configuración](./dos-hosts-una-configuracion.md) parte de lo que dejas aquí: el plazo validado al arrancar, y Accesos contestando otra vez sin pausa.

Detén el servicio. En `appsettings.json`, escribe mal el nombre de la sección: `"Suspencion"`. Arranca con `dotnet run`, sin la variable: el servicio levanta sin quejarse. Suspende emp-73 y mira su diario: vuelve `suspension_vencida`, aunque tu archivo dice 10. Con la sección mal escrita, nadie llenó `PlazoEnSegundos`, y un `int` sin valor vale 0: el plazo era cero, y nada lo dijo.

No le pongas al plazo un valor por defecto en el código: es otra vez el plazo fijo, escondido. Si falta, el servicio no arranca.

> 🆕 **Validar la configuración al arrancar.** `[Range(1, 300)]`, de `System.ComponentModel.DataAnnotations`, marca qué valores acepta una propiedad. `.ValidateDataAnnotations()` revisa esas marcas cuando llena la clase, y `.ValidateOnStart()` hace que la llene al arrancar el host, antes de la primera petición. Sin `ValidateOnStart`, la revisión llegaría con el primer mensaje que use el plazo, en medio de una suspensión.

```csharp
// Empresas.Historia/PlazosDeSuspension.cs (con using System.ComponentModel.DataAnnotations;)
[Range(1, 300)]   // en segundos: 0 no es un plazo
public int PlazoEnSegundos { get; set; }

// Empresas.Historia/Program.cs
builder.Services.AddOptions<PlazosDeSuspension>()
    .BindConfiguration("Suspension")
    .ValidateDataAnnotations()   // el [Range]
    .ValidateOnStart();          // al arrancar, no en el primer mensaje
```

Arranca otra vez, con la sección todavía mal escrita. El servicio no levanta:

```
Unhandled exception. Microsoft.Extensions.Options.OptionsValidationException: DataAnnotation validation failed for 'PlazosDeSuspension' members: 'PlazoEnSegundos' with the error: 'The field PlazoEnSegundos must be between 1 and 300.'.
```

El error nombra la clase y la clave, no la sección mal escrita: el 0 es la pista de que no llegó. Ahora quita `.ValidateOnStart()` y arranca: levanta. Suspende emp-74: el `curl` responde 500 con el mismo error, y emp-74 sigue activa, porque el handler lanzó antes de guardar. El error llegó con la primera suspensión, no al arrancar. Vuelve a poner `.ValidateOnStart()` y corrige la sección. Y devuélvele a Accesos su respuesta inmediata: `public static AccesosRevocadosV2 Handle(RevocarAccesosV1 cmd) => new(cmd.SuspensionId, cmd.Nit);`.

## 🔧 Paso 2 · La cadena también viene de afuera

Ahora que tienes un `appsettings.json`, la tentación es poner la cadena ahí. Ese archivo va al repo con tu `git push`, y a la imagen del contenedor. Dos servicios de la organización tienen hoy así una clave de almacenamiento con documentos contables, las claves de dos servicios de IA y la contraseña del ERP de un cliente. En el repo va solo la forma de la clave, con el valor vacío: le dice a quien despliega qué clave llenar, y con qué nombre.

El valor de verdad llega de otra fuente. Y en un despliegue con Docker Swarm, un secreto no llega como variable de entorno: llega como un archivo, en `/run/secrets`, como en [Docker secrets](../../workshop-devops/04-secretos-y-configuracion/02-docker-secret.md). Allí lo leías con `File.ReadAllText`; `Environment.GetEnvironmentVariable` no lee archivos.

> 🆕 **Dos fuentes más: user-secrets y un archivo por clave.** `dotnet user-secrets set "clave" "valor"` guarda el valor en un archivo de tu carpeta de usuario, fuera del repo, y el host lo lee solo cuando corre en `Development`. A diferencia de `CADENA_POSTGRES`, que fijabas en cada terminal nueva, queda guardado para el proyecto. `builder.Configuration.AddKeyPerFile(directorio, optional: true)` agrega como fuente un directorio: cada archivo es una clave, con `__` en el nombre donde la clave lleva `:`, y su contenido es el valor. Así está armado `/run/secrets`. Con `optional: true`, un directorio que no existe no es un error. `builder.Configuration.GetConnectionString("Postgres")` lee la clave `ConnectionStrings:Postgres` de la fuente que la tenga.

> 🛠️ **Inténtalo tú.** Quiero que la cadena llegue de afuera en los dos lugares, con `CADENA_POSTGRES` ya fuera de tu terminal:
>
> ```bash
> ASPNETCORE_ENVIRONMENT=Development dotnet run             # → Hosting environment: Development (de tus user-secrets)
> DirectorioDeSecretos=$HOME/secretos-empresas dotnet run   # → Hosting environment: Production (de un archivo, como en Swarm)
> ```
>
> Haz que funcione: (1) En `appsettings.json`, agrega la forma de la clave: `"ConnectionStrings": { "Postgres": "" }`. (2) En tu `Program.cs`, después de `CreateBuilder`, agrega la fuente de archivos: `AddKeyPerFile` sobre `builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets"`. En tu máquina, el directorio lo eliges tú, fuera del repo. (3) Cambia la lectura de `CADENA_POSTGRES` por `GetConnectionString("Postgres")`, con su `?? throw` y un mensaje que nombre la clave. Ahora va después de `CreateBuilder`, porque lee de `builder`. (4) Guarda la cadena en los dos lugares y quítala de la terminal, con los comandos de abajo.

```bash
cd Empresas.Historia                                                      # desde la raíz de tu solución
dotnet user-secrets init                                                  # pone en tu .csproj el id de su carpeta: no es secreto
dotnet user-secrets set "ConnectionStrings:Postgres" "$CADENA_POSTGRES"
mkdir -p ~/secretos-empresas
echo "$CADENA_POSTGRES" > ~/secretos-empresas/ConnectionStrings__Postgres
unset CADENA_POSTGRES                                                     # desde aquí, tu servicio no la lee
```

En PowerShell, el `set` lleva `"$env:CADENA_POSTGRES"`. El directorio se crea con `New-Item -ItemType Directory -Force "$HOME/secretos-empresas"`, y el archivo con `Set-Content -Path "$HOME/secretos-empresas/ConnectionStrings__Postgres" -Value $env:CADENA_POSTGRES`. La variable se quita con `Remove-Item Env:CADENA_POSTGRES`. Para arrancar, `$env:DirectorioDeSecretos="$HOME/secretos-empresas"` antes de `dotnet run`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs: el principio
var builder = WebApplication.CreateBuilder(args);   // host WEB
builder.Configuration.AddKeyPerFile(builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);   // un archivo por secreto, como en Swarm
var cadena = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");
```

```json
// Empresas.Historia/appsettings.json: en el repo, solo la forma
{
  "Suspension": { "PlazoEnSegundos": 10 },
  "ConnectionStrings": { "Postgres": "" }
}
```

</details>

## 🔨 Rómpelo: el vacío que pasa por valor, y el socio que lee por su cuenta · no lo saltes

[Dos hosts, una configuración](./dos-hosts-una-configuracion.md) parte de lo que dejas aquí: la cadena revisada con `string.IsNullOrWhiteSpace`, y Facturación leyendo su cadena de la configuración del host.

**El vacío:** arranca con `dotnet run`, sin el directorio. Es `Production`, así que no lee tus user-secrets, y `/run/secrets` no existe en tu máquina. Solo queda la clave vacía del archivo:

```
Unhandled exception. System.ArgumentNullException: Value cannot be null. (Parameter 'Host')
```

Tu `?? throw` no saltó: `""` no es `null`. El error sale de Npgsql y habla de un `Host` que tu configuración no tiene. Para tu código, vacío tiene que ser lo mismo que nada. Cambia el `?? throw` por una revisión con `string.IsNullOrWhiteSpace`:

```csharp
var cadena = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(cadena)) throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");
```

Arráncalo igual que antes: ahora el error dice qué falta. El gateway de la organización hace lo contrario con un valor vacío: si falta el identificador que valida el tráfico, apaga la validación y arranca. Un servicio en `Production` sin un valor obligatorio no arranca.

**El socio:** arranca en `Production` con tu directorio de secretos y suspende emp-74 otra vez. A los 10 segundos, el tablero dice `vencida`: Facturación nunca cobró.

```sql
SELECT message_type, exception_message FROM wolverine_dead_letters ORDER BY sent_at DESC LIMIT 1;
-- facturacion.cobrar-multa.v1 | Falta la variable de entorno CADENA_POSTGRES.
```

Tu host leyó el archivo. `Conexion` de Facturación lee el entorno por su cuenta, y ahí ya no hay nada. Que Facturación pida su cadena a la configuración del host donde corre. Usa la misma clave porque en tu máquina comparte la base; con una base propia, tendría la suya. Un handler recibe `IConfiguration config` (de `Microsoft.Extensions.Configuration`) como un parámetro más: Wolverine se lo da, como la sesión.

```csharp
// Facturacion/Conexion.cs (con using Microsoft.Extensions.Configuration;)
public static class Conexion
{
    public static string Cadena(IConfiguration config)
    {
        var cadena = config.GetConnectionString("Postgres");
        return string.IsNullOrWhiteSpace(cadena) ? throw new InvalidOperationException("Falta ConnectionStrings:Postgres.") : cadena;
    }
}

// Facturacion/FacturacionHandler.cs (con el mismo using): un parámetro más, y la cadena desde él
public static object Handle(CobrarMultaV1 msg, IConfiguration config)
    // …
    using var c = new NpgsqlConnection(Conexion.Cadena(config)); c.Open();
```

Cada `Conexion.Cadena` que quede deja de compilar, y el compilador te los lista. Dale `IConfiguration config` también a `PlanesHandler`, y pásaselo a `Planes.Guardar`, `Planes.De` y `ProcesoMensual.Correr`, que lo reciben de quien los llama. Arranca otra vez con tu directorio y suspende emp-75: queda `efectiva`, y `SELECT count(*) FROM multas WHERE nit = '907500000';` da 1. Tus tests todavía leen `CADENA_POSTGRES` por su cuenta: en la terminal de `dotnet test`, fíjala.

## El Descubrimiento

Lo que cambia de un lugar a otro sale del código y entra por la **configuración** del host. En el repo queda la forma, con valores vacíos. El valor de verdad llega de user-secrets en tu máquina, de una variable de entorno o de un archivo de `/run/secrets` en un despliegue, y la última fuente gana. Lo obligatorio se **valida al arrancar**: con un `throw` en `Program.cs` si se lee ahí, y con una clase tuya y `ValidateOnStart` si lo lee un handler. Si falta, o si está vacío, el servicio no levanta y dice qué falta. Y todo el código del proceso lee de esa misma configuración, también los socios que corren dentro de él. Si un valor real ya llegó a un commit, se rota, como en [Todo o nada](./todo-o-nada.md).

> 🌱 Tu servicio ya arranca con lo que necesita. Le falta contestarle bien a quien le pide algo: el POST de suspender responde 200 y no dice nada más, y una pantalla que lee enseguida no distingue "todavía no" de "no existe". Eso es [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md).

## ✅ Compruébalo

- [ ] Con Accesos lento y el plazo en el código, viste `suspension_vencida` en una suspensión que quedó efectiva.
- [ ] El plazo sale de `appsettings.json`, y `Suspension__PlazoEnSegundos` lo cambia sin compilar.
- [ ] Con la sección mal escrita, el servicio no arranca, y el error nombra `PlazoEnSegundos`. Sin `ValidateOnStart`, el error llegó con la primera suspensión.
- [ ] En el repo, `ConnectionStrings:Postgres` está vacía. Tu servicio arranca en `Development` con tus user-secrets, y en `Production` con un archivo.
- [ ] Sin ninguna fuente, el error dice `Falta ConnectionStrings:Postgres.`, no `Parameter 'Host'`.
- [ ] Facturación cobra con la cadena de la configuración del host, sin `CADENA_POSTGRES` en la terminal del servicio.

## 🆘 Si algo salió mal

- **El plazo sigue en 5 o en 0 aunque el archivo diga 10:** `appsettings.json` tiene que estar junto al `Program.cs` de `Empresas.Historia`. Revisa también que no quedó fijada en tu terminal una `Suspension__PlazoEnSegundos`: la variable gana.
- **`dotnet run` dice `Hosting environment: Development` sin pedirlo:** tu editor creó un `Properties/launchSettings.json`. Arranca con `dotnet run --no-launch-profile`.
- **En PowerShell, «El vacío» arranca sin error:** las `$env:` quedan puestas en la terminal. Quítalas antes: `Remove-Item Env:ASPNETCORE_ENVIRONMENT, Env:PermitirReset, Env:DirectorioDeSecretos -ErrorAction Ignore`.
- **En `Development` no encuentra la cadena:** corre `dotnet user-secrets list` dentro de `Empresas.Historia`. La clave lleva `:`, no `__`.
- **En `Production` no la encuentra con el directorio:** el archivo se llama `ConnectionStrings__Postgres`, con dos guiones bajos, y la variable `DirectorioDeSecretos` lleva la ruta completa.
- **El test de `SuspenderHandler` no compila:** `Options.Create` viene de `using Microsoft.Extensions.Options;`.

## 📓 Registra tu avance

Deja la regla en tu `DECISIONES.md`:

> La configuración viene de afuera. En el repo, `appsettings.json` lleva la forma, con los secretos vacíos. El valor llega de user-secrets en Development y de `/run/secrets` en un despliegue. Lo obligatorio se valida al arrancar: con un `throw` en `Program.cs`, o con una clase y `ValidateOnStart` si lo lee un handler. Si falta o está vacío, el servicio no arranca. Un secreto que tocó git se rota.

> 💭 **Reto:** ¿qué pasaba con el plazo cuando la sección estaba mal escrita, y por qué el servicio no lo notaba? ¿Por qué tu `?? throw` no paró la clave vacía?

```bash
git add .
git commit -m "ES · La configuración viene de afuera" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El plazo y la cadena salen del código a la configuración del host, que en el repo lleva solo la forma y recibe el valor de user-secrets, del entorno o de un archivo de `/run/secrets`; lo obligatorio se valida al arrancar, vacío cuenta como nada, y todo el proceso lee de esa misma configuración.

---

[⬅️ Volver: El host y la inyección](./el-host-y-la-inyeccion.md)

[➡️ Siguiente: Lo que acabas de pedir](./lo-que-acabas-de-pedir.md)
