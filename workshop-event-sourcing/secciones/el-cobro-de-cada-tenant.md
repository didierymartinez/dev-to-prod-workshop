# El cobro de cada tenant

Tu cobro corre solo, cada mes, aunque un mes falle. Nadie lo pide, y por eso ningún pedido le pone tenant.

## 🎯 El Objetivo

Que el cobro de cada mes corra una vez por organización, con sus empresas y sus planes. Que la réplica, la reserva y las multas de Facturación separen a las organizaciones, como las separa Marten. Y que un trabajo sin organización falle, en vez de mezclarlas.

## 💥 El dolor: un NIT, dos organizaciones, una fila

Ferretería del Valle, NIT 918000000, es cliente de acme con el plan Basico, y de globex con el Premium. Cada organización numera sus propias empresas, y en las dos es la emp-180. Con tus dos copias corriendo, regístrala en las dos y suspéndela en las dos:

```bash
curl -X POST http://localhost:5000/empresas -H "Authorization: Bearer $ACME" -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-180\",\"nit\":\"918000000\",\"nombre\":\"Ferretería del Valle\",\"plan\":\"Basico\"}"
curl -X POST http://localhost:5000/empresas -H "Authorization: Bearer $GLOBEX" -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-180\",\"nit\":\"918000000\",\"nombre\":\"Ferretería del Valle\",\"plan\":\"Premium\"}"
curl -X POST http://localhost:5000/empresas/emp-180/suspender -H "Authorization: Bearer $ACME"
curl -X POST http://localhost:5000/empresas/emp-180/suspender -H "Authorization: Bearer $GLOBEX"
```

Empresas guarda dos empresas, una en cada tenant. Facturación guarda una:

```sql
SELECT * FROM plan_de_empresa WHERE nit = '918000000';   -- 918000000 | Basico | 1
SELECT periodo FROM mensualidades WHERE nit = '918000000' ORDER BY periodo DESC LIMIT 2;   -- una fila por mes
SELECT suspension_id, monto FROM multas WHERE nit = '918000000';   -- una sola multa: susp-emp-180-2, de 50000 o de 100000
```

El anuncio de globex llegó con la versión 1, y la réplica lo descartó como viejo: para ella, es el mismo NIT. Cada mes, tu cobro pasa una vez por ese NIT y cobra Basico: el Premium de globex nunca se cobra. De las dos multas, queda una. El `SuspensionId` se arma con el id del stream y su versión, y en las dos organizaciones es `susp-emp-180-2`. Tu `ON CONFLICT (suspension_id)` descartó la que llegó segunda como repetida, sea la de acme o la de globex. Ningún error lo dice. La réplica y la reserva tienen por llave el NIT, y las multas el id de la suspensión: los dos se repiten entre tenants, como el NIT en tu localizador. Marten separa sus tablas por tenant, y las que escribes tú con SQL no saben de tenants. Direcciones tiene este error: guarda en un diccionario por código los catálogos que llegan de cada tenant, y el catálogo de uno valida las direcciones de otro.

## 🔧 Paso 1 · La réplica y la multa, con su tenant

El anuncio viaja con su tenant en el sobre, también por el broker: tu `PlanesHandler` lo puede leer del bus que recibe. El pedido de cobrar la multa también lo trae. Las filas de hoy no dicen de qué tenant son, y Facturación no tiene cómo saberlo. Detén tus dos copias. Recrea la réplica con el tenant en la llave, y agrégale el tenant a la llave de `multas`, en tu base y en la de tus tests, que corren tu mismo código. En PowerShell, el `for` es `foreach ($base in "empresas", "empresas_tests") { … }`.

```bash
for base in empresas empresas_tests; do docker exec empresas-db psql -U postgres -d $base -c "DROP TABLE plan_de_empresa;" -c "CREATE TABLE plan_de_empresa(tenant TEXT NOT NULL, nit TEXT NOT NULL, plan TEXT NOT NULL, version BIGINT NOT NULL, PRIMARY KEY (tenant, nit));" -c "ALTER TABLE multas ADD COLUMN tenant TEXT, DROP CONSTRAINT multas_suspension_id_key, ADD UNIQUE (tenant, suspension_id);"; done
```

Las empresas que borraste vuelven con su próximo anuncio; hasta entonces, nadie las cobra. Direcciones, para no esperar, le pide al dueño la lista entera. Las multas no se borran, porque son cobros hechos: las de antes se quedan con el tenant en `null`. `multas_suspension_id_key` es el nombre que Postgres le dio al `UNIQUE` de `suspension_id`.

> 🛠️ **Inténtalo tú.** Quiero esto, después de registrar emp-182 en acme y en globex, con NIT 918200000 y los planes Basico y Premium, y de suspenderla en las dos:
>
> ```sql
> SELECT tenant, nit, plan FROM plan_de_empresa ORDER BY tenant;
> -- acme   | 918200000 | Basico
> -- globex | 918200000 | Premium
> SELECT tenant, suspension_id, monto FROM multas WHERE nit = '918200000' ORDER BY tenant;
> -- acme   | susp-emp-182-2 | 50000
> -- globex | susp-emp-182-2 | 100000
> ```
>
> Haz que funcione: (1) En `Facturacion`, crea una clase `static` `Organizacion` con un método `De(IMessageBus bus)`. Que devuelva el `TenantId` del bus, y que lance `Un trabajo sin tenant no es de nadie.` si `IsDefaultTenant()`, como tu `EnVivo.De`. En un handler, el bus que recibes es el del sobre que se procesa. (2) Que `PlanesHandler` reciba también el `IMessageBus`, y le pase a `Guardar` el tenant que da `Organizacion.De`. (3) Que `Guardar` reciba el tenant y lo ponga en la fila y en el `ON CONFLICT`. (4) Que `Planes.De` lo saque de `Organizacion.De(bus)`, y lo use en su `WHERE` y al guardar. (5) Que el `Handle` de `CobrarMultaV1` reciba también el bus, y ponga el tenant de `Organizacion.De` en la fila de la multa y en su `ON CONFLICT`. Arranca tus dos copias.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/Organizacion.cs: el tenant de lo que se está procesando
using JasperFx.MultiTenancy;   // IsDefaultTenant
using Wolverine;

public static class Organizacion
{
    public static string De(IMessageBus bus) =>
        bus.TenantId.IsDefaultTenant()
            ? throw new InvalidOperationException("Un trabajo sin tenant no es de nadie.")   // ni de todos
            : bus.TenantId!;
}

// Facturacion/Planes.cs: el tenant, en la llave de la réplica
public static void Guardar(IConfiguration config, string tenant, string nit, string plan, long version)
{
    // … como estaba, con el tenant en la fila y en el conflicto
    cmd.CommandText = "INSERT INTO plan_de_empresa(tenant, nit, plan, version) VALUES(@tenant, @nit, @plan, @version) " +
        "ON CONFLICT (tenant, nit) DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version WHERE plan_de_empresa.version < EXCLUDED.version";
    cmd.Parameters.AddWithValue("tenant", tenant);
    // …
}
// en De: var tenant = Organizacion.De(bus); "… WHERE tenant = @tenant AND nit = @nit"; y al final, Guardar(config, tenant, r.Nit, r.Plan, r.Version)

public static class PlanesHandler
{
    public static void Handle(PlanDeEmpresaV1 msg, IConfiguration config, IMessageBus bus) =>
        Planes.Guardar(config, Organizacion.De(bus), msg.Nit, msg.Plan, msg.Version);   // el tenant, del sobre
}

// Facturacion/FacturacionHandler.cs: Handle(CobrarMultaV1 msg, IConfiguration config, IMessageBus bus), como estaba, con el tenant en la fila y en el conflicto
multa.CommandText = "INSERT INTO multas(tenant, suspension_id, nit, plan_al_suspender, monto) VALUES(@tenant, @suspension, @nit, @plan, @monto) ON CONFLICT (tenant, suspension_id) DO NOTHING";
multa.Parameters.AddWithValue("tenant", Organizacion.De(bus));   // el tenant, del sobre
```

</details>

Tu cobro ya no cobra. `SELECT exception_message FROM wolverine_dead_letters WHERE message_type = 'CobrarElMes' ORDER BY sent_at DESC LIMIT 1;` da `Un trabajo sin tenant no es de nadie.`: `Planes.De` pide el tenant, y el sobre del cron no lo trae. Sin tu `throw`, `De` no encontraría fila en `*DEFAULT*` y le preguntaría a Empresas sin tenant. Ahí lanzaría Marten, con la `DefaultTenantUsageDisabledException` que viste con tu worker en [El contexto que falta](./el-contexto-que-falta.md). Entradas tiene este hueco: lee su ERP sin tenant, para todas las organizaciones.

## 🔧 Paso 2 · Un cobro por tenant

El cron no sabe de organizaciones. Entre el cron y el cobro, vuelve a poner un disparo: que recorra las organizaciones y mande un cobro por cada una. En el taller, la lista de organizaciones sale de tu réplica. En producción, la tiene el sistema que da de alta a cada organización.

> 🆕 **`WithTenantId`.** `new CobrarElMes(d.Mes).WithTenantId("acme")` le pone ese tenant al sobre del mensaje que devuelves, como `InvokeForTenantAsync` al que invocas. Su handler corre como si el mensaje viniera de un pedido de acme.

> 🛠️ **Inténtalo tú.** Quiero esto en el log, cada 10 segundos:
>
> ```
> Mes 2026-10-18 05:26:30 de acme: cobrado
> Mes 2026-10-18 05:26:30 de globex: cobrado
> ```
>
> Haz que funcione: (1) Dale a `Planes` un método `Tenants(IConfiguration config)`, como tu `Nits`, que devuelva los tenants distintos de `plan_de_empresa` (`SELECT DISTINCT tenant`): las organizaciones que tienen empresas que cobrar. (2) Declara otra vez `DisparoMensual(DateTimeOffset Mes)`, y que el cron lo mande en lugar del `CobrarElMes`. Su handler devuelve un `CobrarElMes` por cada tenant, con su `WithTenantId`. El disparo lee la lista de todas y no cobra nada: corre sin tenant. (3) Que el log de `CobroDelMesHandler` diga el `bus.TenantId`. Y que `MensualidadHandler`, con el bus y un `ILogger` en su `Handle`, escriba lo que cobra: `log.LogInformation("Mensualidad {Nit} de {Tenant}: {Plan}", cmd.Nit, bus.TenantId, cmd.Plan)`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/Planes.cs: Tenants(IConfiguration config), como Nits, con "SELECT DISTINCT tenant FROM plan_de_empresa ORDER BY tenant"

// Facturacion/CobroDelMes.cs
public record DisparoMensual(DateTimeOffset Mes);   // lo manda el cron, sin tenant
public static class DisparoMensualHandler
{
    public static OutgoingMessages Handle(DisparoMensual d, IConfiguration config)
    {
        var salida = new OutgoingMessages();
        foreach (var tenant in Planes.Tenants(config))
            salida.Add(new CobrarElMes(d.Mes).WithTenantId(tenant));   // un cobro por organización, con su tenant en el sobre
        return salida;
    }
}
// y en CobroDelMesHandler: log.LogInformation("Mes {Periodo} de {Tenant}: cobrado", periodo, bus.TenantId);

// Empresas.Historia/Configuracion.cs: el cron manda el disparo
opts.Schedules.ScheduleRecurring("cobro-mensual", "*/10 * * * * *", ocurrencia => new DisparoMensual(ocurrencia));

// Facturacion/FacturacionHandler.cs (con using Microsoft.Extensions.Logging;)
public static class MensualidadHandler
{
    public static void Handle(CobrarMensualidad cmd, IMessageBus bus, ILogger log)
    {
        MundoExterno.Recibidos.Add($"Mensualidad {cmd.Nit}: {cmd.Plan}");
        log.LogInformation("Mensualidad {Nit} de {Tenant}: {Plan}", cmd.Nit, bus.TenantId, cmd.Plan);   // lo cobrado, a la vista
    }
}
```

</details>

Mira el resto del log de un mes:

```
Mensualidad 918200000 de acme: Basico
Mes 2026-10-18 05:26:30 de acme: cobrado
Mes 2026-10-18 05:26:30 de globex: cobrado
```

Globex dice `cobrado`, y no tiene ninguna `Mensualidad`. `Nits` le da a cada cobro el NIT 918200000 dos veces, una por fila. El cobro de acme reservó el mes, y el de globex chocó con esa reserva: el mismo NIT en el mismo mes. `Correr` entendió que ese mes ya estaba cobrado. Según cuál reserve primero, el que se queda sin cobro puede ser acme.

## 🔧 Paso 3 · La lista y la reserva, con su tenant

Detén tus dos copias y recrea la reserva con el tenant en la llave, en las dos bases. Los meses ya cobrados no se repiten: el cron cobra solo el mes de cada ocurrencia.

```bash
for base in empresas empresas_tests; do docker exec empresas-db psql -U postgres -d $base -c "DROP TABLE mensualidades;" -c "CREATE TABLE mensualidades(tenant TEXT NOT NULL, nit TEXT NOT NULL, periodo TEXT NOT NULL, PRIMARY KEY (tenant, nit, periodo));"; done
```

> 🛠️ **Inténtalo tú.** Quiero esto en el log, cada mes:
>
> ```
> Mensualidad 918200000 de acme: Basico
> Mensualidad 918200000 de globex: Premium
> ```
>
> Haz que funcione: (1) Que `CobroDelMesHandler` saque el tenant de `Organizacion.De(bus)` y se lo pase a `Nits`, que lo usa en su `WHERE`: `Nits` no recibe el bus. (2) Que la reserva de `Correr` lleve el tenant de `Organizacion.De(bus)`, en la fila y en el `ON CONFLICT`. Arranca tus dos copias.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/CobroDelMes.cs, en CobroDelMesHandler
var tenant = Organizacion.De(bus);
foreach (var nit in Planes.Nits(config, tenant))
    await ProcesoMensual.Correr(bus, config, nit, periodo);
log.LogInformation("Mes {Periodo} de {Tenant}: cobrado", periodo, tenant);
// y en Facturacion/Planes.cs: Nits(IConfiguration config, string tenant), con "… WHERE tenant = @tenant ORDER BY nit"

// Facturacion/ProcesoMensual.cs, en Correr
var tenant = Organizacion.De(bus);
// …
reserva.CommandText = "INSERT INTO mensualidades(tenant, nit, periodo) VALUES(@tenant, @nit, @periodo) ON CONFLICT (tenant, nit, periodo) DO NOTHING";
reserva.Parameters.AddWithValue("tenant", tenant);
```

</details>

> 🔍 **¿Lo lograste?** `SELECT tenant, nit, periodo FROM mensualidades ORDER BY periodo DESC LIMIT 4;` trae acme y globex en cada mes, y cada una paga el plan de su fila. Con tus dos copias, cada mes sale una vez por tenant.

## 🔨 Rómpelo: la guarda que rellena

En `Organizacion.De`, cambia el `throw` por el tenant que venga: `public static string De(IMessageBus bus) => bus.TenantId!;`. En tu `DisparoMensualHandler`, quita el `.WithTenantId(tenant)`. Reinicia y espera una vuelta:

```
Mes 2026-10-18 05:31:10 de *DEFAULT*: cobrado
Mes 2026-10-18 05:31:10 de *DEFAULT*: cobrado
```

El log dice `cobrado` dos veces, y no sale ninguna `Mensualidad`. `Nits` buscó las empresas de `*DEFAULT*`, no encontró ninguna, y nadie pagó. Es el default silencioso de [El contexto que falta](./el-contexto-que-falta.md), ahora en tus propias tablas. Devuélvele a `De` su `throw` y al disparo su `WithTenantId`.

## El Descubrimiento

Un trabajo que nadie pidió no trae tenant: el sobre del cron no lo tiene. Si toca Marten, Marten lanza; si toca tus propias tablas, mezcla a las organizaciones, o no hace nada, sin un error. La cura tiene dos partes. El disparo recorre las organizaciones y manda un trabajo por cada una, con el tenant en el sobre (`WithTenantId`): cada trabajo corre como si viniera de un pedido de la suya. Y toda llave que nace de un dato de otro contexto, como el NIT o el id de un stream, lleva el tenant: esos datos son únicos dentro de una organización, no entre ellas. Lo que toca datos de una organización toma el tenant del sobre, o lanza. El disparo, que las recorre a todas, corre sin tenant.

> 🌱 Para saber si tu cobro tenía próxima vuelta, o qué mes falló, leíste tablas de Wolverine. Todo el estado de tu servicio vive así, en tablas de Postgres. El día que operaciones pregunte por qué una vista va atrasada, o qué mensaje falló, la respuesta está en esas tablas, leídas desde afuera: [Observar el motor nuevo](./observar-el-motor-nuevo.md).

## ✅ Compruébalo

- [ ] Con el mismo NIT y el mismo id en acme y en globex, `plan_de_empresa` guardó una sola fila, `multas` una sola multa, y el cobro pasó una vez por ese NIT.
- [ ] Con el tenant en la llave de la réplica y de `multas`, hay una fila por organización, y el cobro sin tenant cae a dead letters con `Un trabajo sin tenant no es de nadie.`
- [ ] Con `WithTenantId` y la reserva sin tenant, las dos organizaciones dijeron `cobrado`, y solo una pagó.
- [ ] Con la reserva por tenant, cada mes se cobra una vez por organización, con su plan.
- [ ] Sin la guarda y sin `WithTenantId`, el log dijo `cobrado` y nadie pagó.

## 🆘 Si algo salió mal

- **`IsDefaultTenant` no compila:** falta `using JasperFx.MultiTenancy;`.
- **`42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`:** la llave de la tabla y tu `ON CONFLICT` no nombran las mismas columnas.
- **`23502: null value in column "tenant"`:** una escritura todavía no pone el tenant en su fila.
- **`PlanesHandler` cae a dead letters con `Un trabajo sin tenant no es de nadie.`:** llegó un anuncio sin tenant. Quien cambió el plan no usó `InvokeForTenantAsync`, o no traía token.
- **El log no dice ningún `cobrado`:** tu réplica está vacía tras recrearla. Registra empresas, o cambia sus planes con tu worker, para que se anuncien.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Un trabajo de fondo recorre las organizaciones y manda uno por cada una, con el tenant en el sobre (`WithTenantId`). Lo que toca datos de una organización toma el tenant del sobre, o lanza. La réplica, la reserva y las multas de Facturación llevan el tenant en su llave: `(tenant, nit)`, `(tenant, nit, periodo)` y `(tenant, suspension_id)`.

> 💭 **Reto:** si Empresas armara el `SuspensionId` con un `Guid`, que no se repite entre organizaciones, ¿quitarías el tenant de la llave de `multas`? ¿Quién decide cómo se arma ese id?

```bash
git add .
git commit -m "ES · El cobro de cada tenant (un trabajo por organización, el tenant en la llave)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un trabajo que nadie pidió no trae tenant: su disparo recorre las organizaciones y manda un trabajo por cada una con el tenant en el sobre, lo que toca datos de una organización toma el tenant de su sobre o lanza, y toda llave que nace de un dato de otro contexto lleva el tenant.

---

[⬅️ Volver: El trabajo que nadie pidió](./el-trabajo-que-nadie-pidio.md)

[➡️ Siguiente: Observar el motor nuevo](./observar-el-motor-nuevo.md)
