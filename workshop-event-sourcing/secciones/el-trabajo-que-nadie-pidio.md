# El trabajo que nadie pidió

Cada pedido llega a tu servicio con su tenant y su usuario, firmados. El cobro del mes no llega en ningún pedido.

## 🎯 El Objetivo

Que el cobro del mes corra solo, cada mes, sin que nadie lo pida. Que un mes que falla no detenga los siguientes, y que cada mes se cobre una sola vez, aunque tu servicio corra en varias copias. Y saber, mirando la base, cuándo es la próxima vuelta.

## 💥 El dolor: la cadena que se corta

Tu `ProcesoMensual.Correr` cobra el mes de una empresa. Lo llamabas a mano desde tu `Program.cs`, y desde que es un host web nadie lo llama. Un compañero lo hizo recurrente, como el servicio Entradas lee su ERP: un handler cobra el mes y, al terminar, programa la vuelta siguiente. Y al arrancar, el servicio manda la primera vuelta.

> 🆕 **Un servicio de fondo.** Una clase que hereda de `BackgroundService` (de `Microsoft.Extensions.Hosting`) corre su `ExecuteAsync` al arrancar el host, y `builder.Services.AddHostedService<T>()` la registra. El contenedor crea un bus por petición o por mensaje; fuera de ellos, `CreateScope()` te da uno.

Pon en tu solución el código del compañero:

```csharp
// Facturacion/CobroDelMes.cs: el cobro de cada mes, que se reprograma al terminar
using JasperFx.Core;                              // .Seconds()
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;   // CreateScope, GetRequiredService
using Microsoft.Extensions.Hosting;               // BackgroundService
using Microsoft.Extensions.Logging;
using Wolverine;

public record CobrarElMes(DateTimeOffset Mes);   // en el taller, un mes dura 10 segundos

public static class CobroDelMesHandler
{
    public static async Task<DeliveryMessage<CobrarElMes>> Handle(CobrarElMes m, IMessageBus bus, IConfiguration config, ILogger log)
    {
        var periodo = m.Mes.ToString("yyyy-MM-dd HH:mm:ss");
        foreach (var nit in Planes.Nits(config))   // las empresas que Facturación conoce
            await ProcesoMensual.Correr(bus, config, nit, periodo);
        log.LogInformation("Mes {Periodo}: cobrado", periodo);
        return new CobrarElMes(m.Mes.AddSeconds(10)).DelayedFor(10.Seconds());   // al final, la vuelta siguiente
    }
}

public class PrimeraVuelta(IServiceProvider servicios) : BackgroundService   // corre al arrancar el host
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var alcance = servicios.CreateScope();
        await alcance.ServiceProvider.GetRequiredService<IMessageBus>().PublishAsync(new CobrarElMes(DateTimeOffset.UtcNow));
    }
}
```

```csharp
// Facturacion/Planes.cs, dentro de Planes: los NIT de la réplica
public static List<string> Nits(IConfiguration config)
{
    using var c = new NpgsqlConnection(Conexion.Cadena(config)); c.Open();
    using var q = c.CreateCommand();
    q.CommandText = "SELECT nit FROM plan_de_empresa ORDER BY nit";
    using var filas = q.ExecuteReader();
    var nits = new List<string>();
    while (filas.Read()) nits.Add(filas.GetString(0));
    return nits;
}

// Empresas.Historia/Configuracion.cs, al final de AgregarEmpresas, después de tu AddWolverine
builder.Services.AddHostedService<PrimeraVuelta>();   // la primera vuelta del cobro, al arrancar
```

Aquí el borde es un handler: el primero del trabajo, al que nadie espera. Si falla, no deja a nadie esperando, y repetir un mes no le cobra dos veces a nadie, por la reserva de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md). Arranca tu servicio. Cada 10 segundos, su log dice algo así, con otras horas:

```
info: CobrarElMes[0]
      => CorrelationId:…
      Mes 2026-10-18 05:14:48: cobrado
```

Y `SELECT periodo, count(*) FROM mensualidades GROUP BY periodo ORDER BY periodo;` gana un mes por vuelta, con una fila por cada empresa de `plan_de_empresa`.

Ahora un mes falla. Simula que la base no responde durante una vuelta: renombra la tabla de las reservas, espera 15 segundos y devuélvele su nombre.

```bash
docker exec empresas-db psql -U postgres -d empresas -c "ALTER TABLE mensualidades RENAME TO mensualidades_caida;"
# 15 segundos después
docker exec empresas-db psql -U postgres -d empresas -c "ALTER TABLE mensualidades_caida RENAME TO mensualidades;"
```

El log dice `42P01: relation "mensualidades" does not exist`, y `(CobrarElMes) … was moved to the error queue`. Espera otra vuelta: no sale ningún mes más. `SELECT message_type FROM wolverine_dead_letters WHERE message_type = 'CobrarElMes';` tiene el mes que falló. Y `SELECT message_type, execution_time FROM wolverine_incoming_envelopes WHERE status = 'Scheduled';` no tiene ningún `CobrarElMes`: la vuelta siguiente la programaba el mes que falló, y ya no la programa nadie. Nadie cobra el mes siguiente, ni el otro, y no hay más error que el del primer mes. En Entradas, si el ERP está caído cuando se agotan los reintentos, la lectura queda muerta hasta que alguien reinicia el servicio.

Reinicia el tuyo: el log vuelve a decir `cobrado`, porque `PrimeraVuelta` mandó otra vuelta. Arranca otra copia, como en [Dos hosts, una configuración](./dos-hosts-una-configuracion.md): `ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5001`. Y corre tu worker con `emp-177;Premium` y `acme`: lo que cuenta es que arranca. Cuenta:

```sql
SELECT count(*) FROM wolverine_incoming_envelopes WHERE status = 'Scheduled' AND message_type = 'CobrarElMes';   -- 3
SELECT periodo, count(*) FROM mensualidades GROUP BY periodo ORDER BY periodo DESC LIMIT 6;   -- tres meses cada 10 segundos
```

Tus copias y tu worker arrancan con `AgregarEmpresas`, y cada arranque mandó su primera vuelta. La del worker quedó en la base, y la corre una de tus copias. Hay tres cadenas, y cada una cobra su propio periodo: en 10 segundos, que en el taller son un mes, cada empresa paga tres mensualidades. Con meses de verdad, como `"2026-10"`, la reserva frenaría el cobro repetido. Lo que no frena es que cada arranque sume una cadena más, que repite todo el trabajo.

## 🔧 Paso 1 · El disparo, aparte del trabajo

El mes que falló se llevó la vuelta siguiente porque la programaba él. Programarla al principio del handler, o en un `finally`, no lo salva: lo que un handler envía sale solo si termina bien, como el anuncio de [El outbox](./el-outbox.md). Que la programe otro mensaje, un disparo, que no cobra nada: si un mes falla, falla solo el trabajo de ese mes.

> 🛠️ **Inténtalo tú.** Quiero esto en el log, con la tabla renombrada durante una vuelta:
>
> ```
> Mes …:13: cobrado
> (CobrarElMes) … was moved to the error queue      ← el mes que falló
> Mes …:33: cobrado                                ← el siguiente sale igual
> ```
>
> Haz que funcione: (1) Declara `DisparoMensual(DateTimeOffset Mes)` y su handler. Que devuelva dos mensajes, como tu `SuspenderHandler` con su `OutgoingMessages`: el `CobrarElMes` de ese mes, y el `DisparoMensual` del mes siguiente, a 10 segundos. (2) Que `CobroDelMesHandler` ya no devuelva nada. (3) Que `PrimeraVuelta` mande un `DisparoMensual`. Detén tus dos copias y arranca solo la del 5000.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/CobroDelMes.cs
public record DisparoMensual(DateTimeOffset Mes);   // no cobra: programa

public static class DisparoMensualHandler
{
    public static OutgoingMessages Handle(DisparoMensual d)
    {
        var salida = new OutgoingMessages();
        salida.Add(new CobrarElMes(d.Mes));                                              // el trabajo de este mes, en su propio mensaje
        salida.Add(new DisparoMensual(d.Mes.AddSeconds(10)).DelayedFor(10.Seconds()));   // el mes siguiente, pase lo que pase con este
        return salida;
    }
}

// CobroDelMesHandler: el mismo Handle, ahora async Task y sin el return
// PrimeraVuelta: PublishAsync(new DisparoMensual(DateTimeOffset.UtcNow))
```

</details>

> 🔍 **¿Lo lograste?** El mes que falló queda en `wolverine_dead_letters`, y el siguiente sale cobrado. Las tres vueltas que dejó el dolor corren una última vez y no se reprograman. Ahora arranca la copia del 5001: `SELECT count(*) FROM wolverine_incoming_envelopes WHERE status = 'Scheduled' AND message_type = 'DisparoMensual';` da 2. Cada arranque sigue sumando un disparo.

## 🔧 Paso 2 · Un cron, uno en todo el clúster

Tus copias y tu worker se conectan a la misma base, y Wolverine los conoce a todos: son un *clúster*. Quien programa la vuelta siguiente tiene que ser uno solo en todo el clúster, aunque las copias arranquen y se detengan.

> 🆕 **Mensajes recurrentes de Wolverine.** `opts.Schedules.ScheduleRecurring("cobro-mensual", "*/10 * * * * *", ocurrencia => new CobrarElMes(ocurrencia))`, dentro de tu `AddWolverine`, manda un `CobrarElMes` en cada ocurrencia de un *cron*, una expresión que dice cuándo. Sus seis campos son segundo, minuto, hora, día, mes y día de la semana: `*/10` en el primero es «cada 10 segundos», y `0 0 6 1 * *` sería «el día 1 de cada mes, a las 6». La función recibe la hora de la ocurrencia. Como tu daemon en `HotCold`, el cron lo corre un *agente* en una sola copia: programa la ocurrencia siguiente, y la anota en la tabla `wolverine_recurring_messages`. Si esa copia se detiene, otra toma su lugar, y reiniciar no duplica la ocurrencia. Wolverine no acepta menos de 5 segundos entre ocurrencias, y la primera llega unos 20 segundos después de arrancar.

> 🛠️ **Inténtalo tú.** Quiero tus dos copias corriendo, y esto, también después de correr tu worker:
>
> ```sql
> SELECT count(*) FROM wolverine_incoming_envelopes WHERE status = 'Scheduled' AND message_type = 'CobrarElMes';   -- 1
> SELECT schedule_name, next_occurrence FROM wolverine_recurring_messages;   -- cobro-mensual | la próxima vuelta
> ```
>
> Haz que funcione: (1) Registra el cron en tu `AddWolverine`. (2) Borra `DisparoMensual` con su handler, y `PrimeraVuelta` con su `AddHostedService`: el cron dispara cada vuelta, y un mes que falla no lo detiene. Detén tus dos copias y arráncalas otra vez.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, dentro de tu AddWolverine
opts.Schedules.ScheduleRecurring("cobro-mensual", "*/10 * * * * *", ocurrencia => new CobrarElMes(ocurrencia));   // en el taller, un mes cada 10 segundos
```

En `CobroDelMes.cs` quedan `CobrarElMes` y `CobroDelMesHandler`, sin cambios; sus `using` de `JasperFx.Core`, `DependencyInjection` y `Hosting` ya sobran.

</details>

> 🔍 **¿Lo lograste?** Los disparos que dejaron tus arranques de antes ya no tienen handler: el log dice `No known handler for DisparoMensual`, y Wolverine los descarta. Después, un `cobrado` cada 10 segundos en el log de una sola copia, en segundos redondos: `…:10`, `…:20`. Detén esa copia: unos segundos después, el log de la otra lo dice. Corre tu worker con `emp-177;Basico` y `acme`: cada mes sigue saliendo una sola vez. Renombra la tabla otra vez: ese mes cae a dead letters, y el siguiente sale. Vigila esas dos consultas: si no hay próxima vuelta, nadie cobra el mes siguiente.

## 🔨 Rómpelo: el mes que nadie cobró

Detén tus dos copias, espera 30 segundos y arráncalas otra vez. Medio minuto después, pregunta. Tus horas son otras:

```sql
SELECT DISTINCT periodo FROM mensualidades ORDER BY periodo DESC LIMIT 5;
--  2026-10-18 05:21:50
--  2026-10-18 05:21:40
--  2026-10-18 05:21:30
--  2026-10-18 05:20:40      ← ya estaba programada: corrió tarde, al volver
--  2026-10-18 05:20:30
```

Faltan los meses de 05:20:50 a 05:21:20. La ocurrencia que ya estaba programada corrió al volver. Las que caían sin servicio, y las de los primeros segundos tras arrancar, no corren nunca: el cron no rellena lo perdido. Con un mes de verdad, un servicio caído a las 6 del día 1 deja ese mes sin cobro. Si tu negocio no puede perder un mes, el trabajo cobra todo mes pendiente, no solo el de su ocurrencia, o vigilas los huecos en `mensualidades`. El mes que cayó a dead letters también es un hueco.

## El Descubrimiento

Un trabajo que se reprograma al terminar muere en su primer fallo, porque la vuelta siguiente dependía de que esa saliera bien. La cura separa el **disparo** del **trabajo**: el disparo no toca nada que falle, y el mes que falla queda en dead letters sin cortar la cadena. Y quien programa la vuelta siguiente es uno solo: una primera vuelta en cada arranque suma una cadena por copia, por worker y por reinicio. Un **cron** con un agente único en el clúster resuelve las dos cosas: se declara en la configuración, programa una sola ocurrencia a la vez, y sobrevive a la copia que lo corre. Tu `DelayedFor` del disparo y tu `PrimeraVuelta` eran ese agente, hecho a mano. La guía de Wolverine dice que su cron existe por esto: la cadena que se reprograma sola muere para siempre con el primer sobre que se descarta. El cron salta lo que se perdió con el servicio caído, y eso también se decide: cobrar lo pendiente, o vigilar los huecos.

> 🌱 Tu cobro corre sin pedido, y por eso sin tenant: el sobre de cada ocurrencia no dice de qué organización es. Cobra los NIT de una réplica que tampoco lo sabe, y acme y globex pueden tener el mismo NIT. Cada organización, con sus empresas y su cobro: [El cobro de cada tenant](./el-cobro-de-cada-tenant.md).

## ✅ Compruébalo

- [ ] Con la cadena que se reprograma al final, un mes que falló dejó sin vuelta programada a todos los siguientes, y solo un arranque la revivió.
- [ ] Con dos copias y el worker, viste tres cadenas y tres mensualidades cada 10 segundos.
- [ ] Con el disparo aparte, el mes que falló quedó en dead letters y el siguiente se cobró.
- [ ] Con el cron, hay un solo `CobrarElMes` programado, y cada mes sale una vez aunque corran dos copias y el worker. Si detienes la copia que lo corre, sigue la otra.
- [ ] Viste el cron saltarse los meses del servicio caído, y sabes qué decidir para un cobro que no puede perder un mes.

## 🆘 Si algo salió mal

- **`BackgroundService` o `CreateScope` no compilan:** faltan `using Microsoft.Extensions.Hosting;` y `using Microsoft.Extensions.DependencyInjection;` en `CobroDelMes.cs`.
- **Con el cron, no sale ningún `cobrado`:** espera unos 20 segundos tras arrancar; el agente del cron se asigna a una copia primero.
- **El servicio no arranca, con `ArgumentException: '*/2 * * * * *' fires more often than every 5 seconds`:** el cron pide 5 segundos o más entre ocurrencias.
- **Todo cobro lanza `42P01 … mensualidades` sin que renombres nada:** te faltó devolverle el nombre a la tabla: `ALTER TABLE mensualidades_caida RENAME TO mensualidades;`.
- **El worker lanza `ReglaDeNegocioException`:** esa empresa está suspendida. emp-177 no lo está.
- **`ProcesoMensual.Correr` no compila con esos argumentos:** usa el orden de tu firma; aquí es `(bus, config, nit, periodo)`.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Un trabajo recurrente separa el disparo del trabajo: el fallo de un mes no corta la cadena. Lo dispara el cron de Wolverine (`ScheduleRecurring`), con un agente único en el clúster: ni las copias ni los reinicios lo duplican. El cron no rellena lo que se perdió con el servicio caído, y la reserva del mes evita cobrarlo dos veces.

> 💭 **Reto:** ¿por qué el mes que falló se llevó a los siguientes en la cadena del compañero, y no en la tuya? ¿Qué trabajo de tu sistema corre solo, cada cierto tiempo, y qué pasaría si fallara una vez?

```bash
git add .
git commit -m "ES · El trabajo que nadie pidió (disparo aparte del trabajo, cron con un agente en el clúster)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un trabajo recurrente no depende del éxito de cada vuelta: un disparo que no falla manda el trabajo aparte, y lo programa un cron con un agente único en el clúster, que ni las copias ni los reinicios duplican y que no rellena lo que se perdió con el servicio caído.

---

[⬅️ Volver: El tenant viene firmado](./el-tenant-viene-firmado.md)

[➡️ Siguiente: El cobro de cada tenant](./el-cobro-de-cada-tenant.md)
