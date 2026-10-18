# Que el servicio avise

En [Observar el motor nuevo](./observar-el-motor-nuevo.md) le preguntaste al esquema cuánto rezago tiene el daemon, con tu consulta (2). [CosmosLens](./dos-respuestas-ningun-dueno.md) muestra ese mismo número en su panel de rezago.

## 🎯 El Objetivo

Que el propio servicio avise cuando el rezago del daemon pasa de un límite que tú declaras.

## 💥 El dolor: nadie mira de madrugada

Tus consultas y CosmosLens responden cuando alguien mira. Si el daemon se detiene de madrugada, el rezago sube y el servicio sigue respondiendo 200 a cada comando. La vista se atrasa sin un solo error, y te enteras cuando operaciones pregunta por qué.

## 🔧 De mirar a que te avise

El servicio se revisa a sí mismo y publica su estado en una ruta HTTP. Un monitor de tu plataforma le pregunta cada pocos segundos.

> 🆕 **Health checks de ASP.NET Core.** Son comprobaciones que el servicio corre cada vez que alguien pide su estado. `builder.Services.AddHealthChecks()` las registra, `.AddCheck("nombre", check)` agrega una, y `app.MapHealthChecks("/healthz")` publica la ruta. Un check es una clase que implementa `IHealthCheck`, de `Microsoft.Extensions.Diagnostics.HealthChecks`, que viene con el SDK web. Su método `CheckHealthAsync(HealthCheckContext context, CancellationToken ct)` devuelve `HealthCheckResult.Healthy(...)`, `Degraded(...)` o `Unhealthy(...)`, con una descripción. La ruta responde, como texto, el peor resultado de sus checks: con `Healthy` y `Degraded`, código 200; con `Unhealthy`, 503. Por eso un monitor que vigila `Degraded` lee la palabra, no solo el código.

### Paso 1 · El rezago, dentro del servicio

> 🛠️ **Inténtalo tú.** Quiero esto:
>
> ```
> curl http://localhost:5000/healthz
> Healthy        ← el daemon va al día
> Degraded       ← la vista va más de 10 hechos atrás
> ```
>
> Para eso: **(1)** Escribe `RezagoDelDaemon`, un `IHealthCheck` que corre tu consulta (2) con Npgsql, como en [Todo o nada](./todo-o-nada.md), pero con sus versiones async: `OpenAsync` y `ExecuteScalarAsync`. Devuelve `Degraded` si el rezago pasa del umbral. Recibe la cadena y el umbral por su constructor primario. Si tu proyección todavía no tiene fila en `mt_event_progression`, cuenta su progreso como 0, con `coalesce`. Tu `Rezago` de [La respuesta dice cuánto sabe](./la-respuesta-dice-cuanto-sabe.md) da el mismo número con la API de Marten. Aquí corres la (2), la misma que lee CosmosLens: así el aviso y CosmosLens miden igual. **(2)** Regístralo en tu `Program.cs` con `AddHealthChecks().AddCheck(...)`, con un umbral de 10. La cadena la lee tu `AgregarEmpresas`: después de llamarla, `builder.Configuration.GetConnectionString("Postgres")` da la misma. Publica `/healthz` con `.AllowAnonymous()`: el monitor de tu plataforma no tiene token, y tu política por defecto le respondería 401. El umbral es una decisión tuya: cuántos hechos de atraso aceptas antes de avisar. Con 10 lo ves pasar en el taller.
>
> Usa `Degraded`, no `Unhealthy`: con rezago, el servicio sigue aceptando comandos, porque tus decisiones leen el diario, no la vista. Con el 503 de `Unhealthy`, un balanceador como el de [Dos hosts, una configuración](./dos-hosts-una-configuracion.md) sacaría del tráfico un servicio que sí puede trabajar.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/RezagoDelDaemon.cs: la consulta (2), ahora dentro del servicio
using Microsoft.Extensions.Diagnostics.HealthChecks;   // IHealthCheck, HealthCheckResult
using Npgsql;

public class RezagoDelDaemon(string cadena, long umbral) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        await using var c = new NpgsqlConnection(cadena);
        await c.OpenAsync(ct);
        await using var q = c.CreateCommand();
        q.CommandText = "SELECT (SELECT coalesce(max(seq_id), 0) FROM mt_events)"
                      + " - coalesce((SELECT last_seq_id FROM mt_event_progression WHERE name = 'VistaSuspendida:All'), 0)";
        var rezago = (long)(await q.ExecuteScalarAsync(ct))!;

        return rezago > umbral
            ? HealthCheckResult.Degraded($"VistaSuspendida va {rezago} hechos atrás (umbral: {umbral})")
            : HealthCheckResult.Healthy($"rezago: {rezago}");
    }
}
```

```csharp
// Empresas.Historia/Program.cs, después de builder.AgregarEmpresas(...)
var cadena = builder.Configuration.GetConnectionString("Postgres")!;   // la que leyó tu función
builder.Services.AddHealthChecks()
    .AddCheck("rezago", new RezagoDelDaemon(cadena, umbral: 10));     // más de 10 hechos atrás = Degraded

// y junto a tus endpoints
app.MapHealthChecks("/healthz").AllowAnonymous();   // abierta a propósito: muestra solo la palabra; la descripción va al log
```

</details>

> 🔍 **¿Lo lograste?** Con el daemon al día, `curl http://localhost:5000/healthz`, sin token, responde `Healthy`.

### Paso 2 · El daemon apagado

Primero, el monitor. En otra terminal, deja corriendo esta vuelta: le pregunta a `/healthz` cada 5 segundos y escribe la respuesta, como el monitor de tu plataforma.

```bash
while true; do curl -s http://localhost:5000/healthz; echo; sleep 5; done
# en PowerShell: while ($true) { curl.exe -s http://localhost:5000/healthz; ""; Start-Sleep 5 }
```

Ahora apaga el daemon: en tu `Program.cs`, llama `AgregarEmpresas` con `DaemonMode.Disabled`, el papel de tu worker. Siembra tres empresas activas de acme con tu `Sembrar`, entre `var app = builder.Build();` y `app.Run();`. Sus planes van escritos como en tu tarifa de Facturación; si no, el cobro lanza `KeyNotFoundException`.

```csharp
var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya
await using (var s = store.LightweightSession("acme"))   // la siembra, con su tenant
{
    Sembrar(s, "emp-30", "903000000", "Ferretería Centro", "Basico");
    Sembrar(s, "emp-31", "903100000", "Droguería Norte", "Premium");
    Sembrar(s, "emp-32", "903200000", "Papelería Sur", "Basico");
    await s.SaveChangesAsync();
}
```

Arranca, suspende las tres y espera unos segundos a que contesten los socios:

```bash
curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-30/suspender
curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-31/suspender
curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-32/suspender
```

Tu consulta (2) dice cuánto va atrás la vista:

```
 frente | proyeccion | rezago
--------+------------+--------
     72 |         54 |     18
```

Tu frente y tu proyección son otros números; el rezago sale 18. Cada empresa sembrada es 1 hecho, y cada suspensión suma 5: la suspensión, el proceso que nace, las dos respuestas de los socios y la `SuspensionEfectiva`. Tu monitor cambia de palabra, a `Degraded`, y el log del servicio dice por qué:

```
warn: Microsoft.Extensions.Diagnostics.HealthChecks.DefaultHealthCheckService[103]
      => SpanId:…, TraceId:… => … => RequestPath:/healthz … => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckLogScope
      Health check rezago with status Degraded completed after 15.3144ms with message 'VistaSuspendida va 18 hechos atrás (umbral: 10)'
```

Quita la siembra: las tres ya existen.

> 🔨 **Rómpelo tú (sin el check).** Comenta la línea `.AddCheck(...)`, cierra el `AddHealthChecks()` con `;` y reinicia, con el daemon todavía apagado. La ruta existe, pero no comprueba nada: tu monitor escribe `Healthy` con la vista 18 hechos atrás. Sin un check, `/healthz` solo dice que el servicio contesta. Descomenta `.AddCheck(...)`, quita el `;` y reinicia: vuelve `Degraded`.

Vuelve a `DaemonMode.HotCold` y reinicia. El daemon alcanza el frente en unos segundos, y tu monitor vuelve a escribir `Healthy`. Detén la vuelta con Ctrl+C.

## El Descubrimiento

Una consulta responde solo cuando alguien la corre. Un **health check** la corre dentro del servicio, cada vez que un monitor pregunta, y se degrada sobre un umbral que tú declaraste. Es `Degraded` y no `Unhealthy` porque el rezago atrasa la vista, no las decisiones: el servicio sigue en el tráfico. El health check dice cómo está el rezago ahora. Su historia en el tiempo es una **métrica**, que un tablero grafica; OpenTelemetry es el estándar para publicarla. Diagnosticar desde afuera no reemplaza que el servicio avise desde adentro: tus consultas y CosmosLens dicen por qué, y `/healthz` avisa que hay que mirar.

> 🌱 Tu `RezagoDelDaemon` vigila cuántos hechos le faltan a la vista. Tu consulta (1) de [Observar el motor nuevo](./observar-el-motor-nuevo.md) mide otro número, el largo de cada stream, pero no lo que ese largo cuesta. Cada comando sobre una empresa la rehidrata desde su primer hecho, y una empresa que recibe pagos todos los días junta miles. La próxima sección mide esa carga y la hace barata: [El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md).

## ✅ Compruébalo

- [ ] `/healthz` responde sin token: `Healthy` con el daemon al día y `Degraded` cuando el rezago pasa de 10.
- [ ] Sin el check, `/healthz` responde `Healthy` aunque el daemon esté apagado y la vista vaya 18 hechos atrás.
- [ ] Sabes por qué el rezago es `Degraded` y no `Unhealthy`.

## 🆘 Si algo salió mal

- **`IHealthCheck` no compila:** agrega `using Microsoft.Extensions.Diagnostics.HealthChecks;`.
- **`/healthz` responde `Healthy` con el daemon apagado:** el check no está registrado (revisa el `.AddCheck(...)`), o tu rezago todavía no pasa del umbral.
- **`/healthz` dice `Degraded` con el daemon al día:** el `name` de tu consulta no está en `mt_event_progression`, y el `coalesce` cuenta su progreso como 0; lístalos con `SELECT name FROM mt_event_progression`.
- **`/healthz` responde 404 o 401:** te faltó `app.MapHealthChecks("/healthz")`, o su `.AllowAnonymous()`.

## 📓 Registra tu avance

> 💭 **Reto:** ¿qué te avisa `/healthz` que tus consultas no te avisan? ¿Por qué el rezago es `Degraded` y no `Unhealthy`? ¿Y por qué `/healthz` responde sin token?

```bash
git add .
git commit -m "ES · Que el servicio avise (health check del rezago + /healthz sin token)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un health check pone tu consulta del rezago dentro del servicio: responde `Degraded` sobre el umbral que declaraste sin que nadie mire, y el servicio sigue en el tráfico.

---

[⬅️ Volver: Observar el motor nuevo](./observar-el-motor-nuevo.md)

[➡️ Siguiente: El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md)
