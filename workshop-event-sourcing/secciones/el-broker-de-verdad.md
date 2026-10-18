# El broker de verdad

Tus hosts comparten configuración y base, y cada uno trata sus mensajes en sus colas locales, dentro de su proceso. Ahora otro equipo quiere escucharte desde el suyo.

## 🎯 El Objetivo

Que un anuncio de Empresas llegue por un broker a otro proceso, lo publique tu servicio o tu worker. Y que un host sin credenciales del broker diga cuál le falta.

## 💥 El dolor: el anuncio que se fue a ninguna parte

Notificaciones le escribe al cliente cuando cambia su plan. Es otro equipo, y corre en su propio proceso, sin tus handlers ni tu base. Tus colas locales viven dentro de tu proceso y no le llegan, como viste en [El mensaje y la cola](./el-mensaje-y-la-cola.md). Hace falta un broker de verdad, y en tu máquina lo levantas con Docker. Su usuario es `guest` y su clave `guest`, solo para tu máquina:

```bash
docker run -d --name empresas-rabbit -p 5672:5672 rabbitmq:4-management
```

> 🆕 **RabbitMQ, visto desde Wolverine.** Un broker recibe cada mensaje en un *exchange*, y lo copia a cada *cola* atada a él: esa atadura es un *binding*. Quien escucha lee de su cola, y dos lectores de una misma cola se reparten sus mensajes, como tus dos consumidores de [El mensaje y la cola](./el-mensaje-y-la-cola.md). Con el paquete `WolverineFx.RabbitMQ`, `opts.UseRabbitMq(f => …)` se conecta, `AutoProvision()` crea al arrancar lo que falta, `opts.PublishMessage<T>().ToRabbitExchange("x")` manda `T` a un exchange, `BindExchange("x").ToQueue("q")` ata una cola y `opts.ListenToRabbitQueue("q")` la escucha. Con una regla de `PublishMessage`, Wolverine manda el mensaje solo a donde dice la regla: deja de entregarlo a tus handlers locales. `builder.Environment.ApplicationName` es el nombre del proyecto que arranca el host.

Agrega el paquete a tu servicio: `dotnet add Empresas.Historia package WolverineFx.RabbitMQ`. Guarda los datos del broker como guardaste tu cadena en [La configuración viene de afuera](./la-configuracion-viene-de-afuera.md). En `appsettings.json`, la forma: `"Broker": { "Host": "", "Usuario": "", "Clave": "" }`. Los valores, en tus user-secrets y en tu directorio de secretos, desde `Empresas.Historia`:

```bash
dotnet user-secrets set "Broker:Host" "localhost"; dotnet user-secrets set "Broker:Usuario" "guest"; dotnet user-secrets set "Broker:Clave" "guest"
echo localhost > ~/secretos-empresas/Broker__Host; echo guest > ~/secretos-empresas/Broker__Usuario; echo guest > ~/secretos-empresas/Broker__Clave
```

En PowerShell, cada archivo con `Set-Content -Path "$HOME/secretos-empresas/Broker__Host" -Value localhost`, y así los otros dos. Luego publica `PlanDeEmpresaV1` al broker, con el nombre de exchange que usan varios servicios de la organización, el del proceso que publica:

```csharp
// Empresas.Historia/Configuracion.cs, al final de tu AddWolverine (con using Wolverine.RabbitMQ;)
var exchange = builder.Environment.ApplicationName;   // el nombre del proceso que publica
opts.UseRabbitMq(f =>
    {
        f.HostName = builder.Configuration["Broker:Host"];
        f.UserName = builder.Configuration["Broker:Usuario"];
        f.Password = builder.Configuration["Broker:Clave"];
    })
    .AutoProvision();
opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitExchange(exchange);
```

Notificaciones es un proyecto aparte, que solo conoce tus contratos: `dotnet new console -o Notificaciones` y `dotnet add Notificaciones reference Contratos`, y agrégale los paquetes `WolverineFx.RabbitMQ` y `WolverineFx.RuntimeCompilation`. Su equipo vio en el broker tu exchange, `Empresas.Historia`, y ató su cola a él:

```csharp
// Notificaciones/Program.cs: otro equipo, otro proceso; le escribe al cliente cuando cambia su plan
using Contratos;
using Microsoft.Extensions.Hosting;
using Wolverine;
using Wolverine.RabbitMQ;

var builder = Host.CreateApplicationBuilder();
builder.Services.AddWolverine(opts =>
{
    opts.UseRabbitMq()                                   // localhost:5672, con el usuario guest
        .AutoProvision()
        .BindExchange("Empresas.Historia").ToQueue("notificaciones.planes");   // el exchange que vio en el broker
    opts.ListenToRabbitQueue("notificaciones.planes");
});
await builder.Build().RunAsync();

public static class PlanDeEmpresaHandler
{
    public static void Handle(PlanDeEmpresaV1 aviso) => Console.WriteLine($"Correo a {aviso.Nit}: tu plan ahora es {aviso.Plan}");
}
```

Arranca tu servicio en `Development` y, en otra terminal, `dotnet run --project Notificaciones`. Da de alta emp-150 por el endpoint, con NIT `915000000`: Notificaciones imprime `Correo a 915000000: tu plan ahora es Basico`. Pero `SELECT plan FROM plan_de_empresa WHERE nit = '915000000';` no trae nada: con la regla, el anuncio ya no va al handler de Facturación, que vive en tu servicio. Dale a Facturación su cola, atada al exchange, como a cualquier interesado: una ruta local también le llegaría, pero cada mensaje tiene una sola ruta, el exchange. En tu función, cambia el `.AutoProvision();` por `.AutoProvision().BindExchange(exchange).ToQueue("facturacion.planes");`, y agrega `opts.ListenToRabbitQueue("facturacion.planes");`.

Reinicia tu servicio y corre tu worker con `emp-150;Premium`. Imprime `emp-150: plan Premium`, y Notificaciones no imprime nada. Ningún log dice que algo falló, y `plan_de_empresa` dice Premium. Mira las ataduras del broker:

```bash
docker exec empresas-rabbit rabbitmqctl list_bindings source_name destination_name
# … y otras con el origen vacío, una por cola:
# Empresas.Historia   notificaciones.planes
# Empresas.Historia   facturacion.planes
# Empresas.Worker     facturacion.planes
```

Tu worker publicó en `Empresas.Worker`, el exchange de su proceso. Tu función ató ahí la cola de Facturación, porque corre también en el worker. La de Notificaciones solo está atada al exchange que su equipo vio. Reconocimiento, otro servicio de la organización, tiene así sus dos hosts: si publica el segundo, el anuncio sale por un exchange al que nadie está suscrito.

## 🔧 Paso 1 · El exchange es del contexto

> 🛠️ **Inténtalo tú.** Quiero que el cambio del worker también llegue a Notificaciones:
>
> ```
> worker: emp-151;Premium   →   Notificaciones: Correo a 915100000: tu plan ahora es Premium
> ```
>
> Haz que funcione: en tu función, cambia el nombre del exchange por el del contexto, `empresas`, y ata a ese la cola de Notificaciones. Reinicia tu servicio y Notificaciones. Da de alta emp-151 por el endpoint, con NIT `915100000`, y corre el worker con su cambio.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs
const string exchange = "empresas";   // el exchange del contexto, igual en todos sus hosts

// Notificaciones/Program.cs
.BindExchange("empresas").ToQueue("notificaciones.planes");   // el exchange del contexto Empresas
```

</details>

> 🔍 **¿Lo lograste?** Notificaciones imprime los dos correos de emp-151, el del alta y el del cambio, y `plan_de_empresa` dice Premium para `915100000`. Los exchanges viejos siguen en el broker, sin nadie que publique en ellos: bórralos con `docker exec empresas-rabbit rabbitmqadmin delete exchange --name Empresas.Historia`, y lo mismo con `Empresas.Worker`.

## 🔧 Paso 2 · La credencial que falta se nombra al arrancar

Quita el archivo `Broker__Clave` de `~/secretos-empresas` y corre el worker. No arranca:

```
Unhandled exception. Wolverine.Transports.BrokerInitializationException: Unable to initialize the Broker rabbitmq in time
 ---> System.ArgumentNullException: Value cannot be null. (Parameter 'password')
```

El mensaje dice que el broker tardó, y lo que falta es una clave. Deja el archivo vacío, con `: > ~/secretos-empresas/Broker__Clave` (en PowerShell, `Set-Content -Path "$HOME/secretos-empresas/Broker__Clave" -Value ""`), y corre otra vez: `None of the specified endpoints were reachable`, que habla de la red.

> 🆕 **Una propiedad obligatoria.** `[Required(ErrorMessage = "Falta Broker:Clave.")]`, de `System.ComponentModel.DataAnnotations` como tu `[Range]`, marca una propiedad que no puede faltar. Un `string` vacío también falta: un `= ""` de inicio no cuenta como valor. `builder.Configuration.GetSection("Broker").Get<T>()` llena una clase con esa sección, por nombre, en la línea donde lo llamas, y devuelve `null` si la sección no existe.

> 🛠️ **Inténtalo tú.** Quiero que, sin la clave, el worker diga qué falta antes de intentar conectarse:
>
> ```
> Unhandled exception. Microsoft.Extensions.Options.OptionsValidationException: DataAnnotation validation failed for 'CredencialesDelBroker' members: 'Clave' with the error: 'Falta Broker:Clave.'.
> ```
>
> Haz que funcione: (1) Crea `CredencialesDelBroker`, con `Host`, `Usuario` y `Clave`, cada una obligatoria. (2) Regístrala en `AgregarEmpresas` como tu plazo, con su sección y `ValidateOnStart`: la revisión corre al arrancar, antes de que Wolverine se conecte. (3) Para la conexión, llénala con `Get<CredencialesDelBroker>()`, o una vacía si la sección no existe, y pásale sus propiedades a `UseRabbitMq`; su `f` es la `ConnectionFactory` de RabbitMQ.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/CredencialesDelBroker.cs: la sección "Broker" de la configuración
using System.ComponentModel.DataAnnotations;

public class CredencialesDelBroker
{
    [Required(ErrorMessage = "Falta Broker:Host.")] public string Host { get; set; } = "";
    [Required(ErrorMessage = "Falta Broker:Usuario.")] public string Usuario { get; set; } = "";
    [Required(ErrorMessage = "Falta Broker:Clave.")] public string Clave { get; set; } = "";
}

// Empresas.Historia/Configuracion.cs, junto a tu PlazosDeSuspension
builder.Services.AddOptions<CredencialesDelBroker>()
    .BindConfiguration("Broker")
    .ValidateDataAnnotations()   // los [Required]
    .ValidateOnStart();          // al arrancar, antes de conectarse
var broker = builder.Configuration.GetSection("Broker").Get<CredencialesDelBroker>() ?? new CredencialesDelBroker();

// en tu AddWolverine
opts.UseRabbitMq(f => { f.HostName = broker.Host; f.UserName = broker.Usuario; f.Password = broker.Clave; })
    // … y tu .AutoProvision().BindExchange(…), como estaban
```

</details>

> 🔍 **¿Lo lograste?** Sin el archivo, y con el archivo vacío, el worker dice `… 'Clave' with the error: 'Falta Broker:Clave.'`. Devuelve la clave al archivo y corre otra vez: el cambio pasa. Las tres van juntas a la conexión, y una clase las lee juntas, por nombre: sus marcas dicen cuál falta. Un servicio de la organización recibe sueltas, en tres `string`, las credenciales de cada empresa: invertidas, compila, y autentica con la equivocada.

Ahora corre `dotnet test`. Cae con `Falta Broker:Host.`: tus tests llaman a tu función, y la función pide la sección `Broker`. Que tus tests tengan la sección, pero que no se conecten: si escucharan `facturacion.planes`, se repartirían los anuncios con tu servicio. En tu `HostConDaemon`, pon los tres valores en la configuración, como la cadena, y después de `AgregarEmpresas` agrega `builder.Services.DisableAllExternalWolverineTransports();`. Wolverine arma las reglas del broker y no envía ni escucha nada en él: en tus tests, `PlanDeEmpresaV1` no sale a ninguna parte. Va solo en el host de pruebas. El viaje por el broker ya no lo prueban tus tests: lo pruebas tú, con el contenedor. `dotnet test` vuelve a verde.

## El Descubrimiento

Un mensaje que cruza procesos va por un **broker**: sale a un exchange, y cada interesado lo lee de su cola atada a él. El exchange lleva el nombre del **contexto** que publica, igual en todos sus hosts: con el nombre del proceso, a dónde llega un anuncio depende de quién lo publica, y puede salir por un exchange que nadie escucha, sin un error. La regla `PublishMessage` decide a dónde va un mensaje, y solo ahí: también tus consumidores de adentro se suscriben con su cola. Las credenciales del broker son una clase tuya, que se llena por nombre y se valida al arrancar, como tu plazo. Tus tests llevan la misma configuración, sin conectarse al broker.

> 🌱 Notificaciones confía en su cola: `AutoProvision` la crea al arrancar, y el broker la guarda aunque se reinicie. En [Lo que el broker no promete](./lo-que-el-broker-no-promete.md), un nombre mal escrito arranca en verde y no recibe nada, y una caída a la mitad se lleva correos que el broker ya entregó.

## ✅ Compruébalo

- [ ] Con la regla, Facturación dejó de recibir el plan hasta tener su cola.
- [ ] Con el exchange del proceso, el alta llegó a Notificaciones, y el cambio del worker no; `list_bindings` mostró por qué.
- [ ] Con el exchange `empresas` en todos los hosts, los dos anuncios llegan, y Facturación sigue al día por su cola.
- [ ] Sin la clave, o con ella vacía, el worker dice `Falta Broker:Clave.` en vez de `Unable to initialize the Broker rabbitmq in time`.
- [ ] Tus tests arman la sección `Broker`, no se conectan al broker y pasan en verde.

## 🆘 Si algo salió mal

- **Notificaciones no arranca: `no IAssemblyGenerator (Roslyn) is registered`:** le falta el paquete `WolverineFx.RuntimeCompilation`, como a tu servicio.
- **`ACCESS_REFUSED` o `None of the specified endpoints were reachable`:** el contenedor no está arriba, o `Broker:Usuario` y `Broker:Clave` no son `guest`. `docker ps` dice si corre.
- **El worker no encuentra el broker:** corre en `Production`, sin tus user-secrets. Revisa los tres archivos `Broker__…` en tu directorio de secretos.
- **`rabbitmqadmin delete exchange` falla con `not found`:** ese exchange no existe; quizá ya lo borraste.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Lo que cruza procesos va por RabbitMQ, al exchange del contexto, `empresas`, el mismo en todos sus hosts; cada interesado lee de su cola atada a él, también Facturación, que vive adentro. Las credenciales del broker son una clase que se llena por nombre y se valida al arrancar. Mis tests llevan esa sección y no se conectan al broker.

> 💭 **Reto:** ¿por qué Facturación recibió el cambio del worker y Notificaciones no? ¿Qué decía el error sin la clave, y qué dice ahora?

```bash
git add .
git commit -m "ES · El broker de verdad" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un anuncio que cruza procesos sale al exchange del contexto, igual en todos sus hosts, y cada interesado lo lee de su cola; lo que un host necesita para conectarse es una clase que se llena por nombre y se valida al arrancar.

---

[⬅️ Volver: El arnés usa la misma configuración](./el-arnes-usa-la-misma-configuracion.md)

[➡️ Siguiente: Lo que el broker no promete](./lo-que-el-broker-no-promete.md)
