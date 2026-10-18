# El contrato lleva lo justo

Facturación ya cobra la multa una sola vez. Ahora quiere cobrarla **según el plan** de la empresa, y el plan no es suyo.

## 🎯 El Objetivo

Que Facturación use el plan de una empresa —un dato que pertenece a otro contexto— sin quedarse con una copia que se desactualiza sin avisar.

## 💥 El dolor: la copia que se quedó en el pasado

La multa depende del plan: $50.000 a una empresa Básico, $100.000 a una Premium y $200.000 a una Enterprise. Esa tarifa es una regla **de Facturación**. El catálogo `planes` de [¿Merecía event sourcing?](./merecia-event-sourcing.md) es otra cosa: los precios de lista. Pero el plan de cada empresa lo decide Empresas, y el anuncio que Facturación recibe, `EmpresaSuspendidaV1(Nit, Motivo)`, no lo trae.

El reflejo es meterlo en el anuncio. Facturación cobra la multa con él y lo **guarda** junto a la multa. Más adelante le piden cobrar la **mensualidad** de esa empresa, que depende de su plan, y Facturación usa el plan guardado. El problema aparece con el tiempo:

```
1. Suspendes emp-8 (Básico)            → Facturación cobra la multa Básico y guarda el plan
2. emp-8 paga y se reactiva
3. emp-8 cambia a Premium              → PlanCambiado queda en el diario de Empresas (un hecho interno: no se anuncia)
4. Cobras la mensualidad de emp-8      → Facturación lee su copia: Básico
```

Empresas dice Premium y Facturación cobra Básico, sin un solo error. La copia fue correcta el día que llegó y dejó de serlo sin que nadie se enterara, porque su dueño no sabe que existe. Lo vas a provocar en el Paso 3.

## 🔧 Dos preguntas distintas, dos respuestas

El error no es meter el plan en el anuncio. Es usar **para hoy** un dato que llegó **de ayer**. Facturación le hace al plan dos preguntas distintas:

- **¿Qué plan tenía cuando la suspendieron?** Es un hecho del momento y no cambia: que viaje en el anuncio y Facturación lo guarde está bien. Preguntarlo después sería peor: una multa reintentada tras el cambio a Premium saldría Premium por una suspensión que fue Básico.
- **¿Qué plan tiene hoy?** Es la verdad viva, y su dueño es Empresas. Esa no se guarda: **se le pregunta al dueño** cuando hace falta.

> 🆕 **Preguntarle al dueño: pedir y esperar la respuesta.** Quien publica un anuncio no espera nada; quien hace una **consulta** espera la respuesta. Con `bus.InvokeAsync(cmd)`, lo que el handler devuelve **se publica**, como en [El outbox](./el-outbox.md). Con la forma con tipo, `await bus.InvokeAsync<TRespuesta>(consulta)`, lo que devuelve, si es del tipo `TRespuesta`, **vuelve a quien preguntó** y no se publica. La consulta y la respuesta son contrato público y viven en `Contratos`, para que Facturación pregunte sin ver el dominio de Empresas.

### Antes de empezar · una empresa limpia

Tu `emp-7` ya está suspendida por las secciones anteriores. Siembra una empresa nueva en tu `Program.cs`, después de `await host.StartAsync()`, con el `Sembrar` de [El swap](./el-swap-por-reconocimiento.md): su localizador, que el Paso 4 lee, entra en la misma transacción que su stream. Pídele al host el store como `IDocumentStore`, el que integraste con Wolverine en [El outbox](./el-outbox.md). Agrega también `using Contratos;` al `Program.cs`: desde aquí usa varios contratos.

```csharp
var store = host.Services.GetRequiredService<IDocumentStore>();
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-8", "900800800", "Cooperativa Llanos", "Basico");
    await s.SaveChangesAsync();
}
```

Corre tu `Program.cs` una vez. Después borra el bloque de la siembra y deja el `store`: emp-8 ya existe, y volver a sembrarla lanza `ExistingStreamIdCollisionException`.

### Paso 1 · Facturación cobra según el plan

> 🛠️ **Inténtalo tú.** Haz que esto cobre la multa de una empresa Básico:
>
> ```csharp
> var sobre = new Envelope { Id = Guid.NewGuid() };
> FacturacionHandler.Handle(new EmpresaSuspendidaV2("900800800", "mora", "Basico"), sobre);
> // SELECT * FROM multas → 900800800 | Basico | 50000
> ```
>
> Para eso: **(1)** Declara `EmpresaSuspendidaV2(Nit, Motivo, Plan)` en `Contratos`, al lado del `V1`, con su `[MessageIdentity]`. **(2)** Tu `FacturacionHandler` de [Llegó dos veces](./llego-dos-veces.md) pasa a recibir el `V2`, y el cobro de la multa se vuelve un `INSERT` en una tabla `multas(nit, plan_al_suspender, monto)`, con el monto según la tarifa. El nombre de la columna dice de cuándo es el dato. **(3)** Mete ese `INSERT` y el del dedup por `envelope.Id` en la **misma transacción**, como en [Todo o nada](./todo-o-nada.md): si el dedup entrara sin la multa, la reentrega no la cobraría nunca. **(4)** En tu `Program.cs`, reemplaza la simulación de reentrega de §33 por la llamada del ejemplo.

El `V1` se queda en `Contratos`: un contrato publicado no se borra ni se edita mientras pueda haber mensajes en camino. Aquí no queda ninguno, así que el handler de Facturación pasa directo al `V2`. Hasta el Paso 2, suspender por el bus publica un `V1` que nadie escucha (Wolverine anota `No routes can be determined…`). Por eso el Paso 1 llama al handler directo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos
[MessageIdentity("empresas.empresa-suspendida.v2")]
public record EmpresaSuspendidaV2(string Nit, string Motivo, string Plan);
```

```sql
CREATE TABLE multas(nit TEXT NOT NULL, plan_al_suspender TEXT NOT NULL, monto INT NOT NULL);
```

```csharp
// Facturacion/FacturacionHandler.cs: la tarifa es suya; el plan de la suspensión es un hecho del momento
public static class FacturacionHandler
{
    static readonly Dictionary<string, int> Tarifa = new() { ["Basico"] = 50_000, ["Premium"] = 100_000, ["Enterprise"] = 200_000 };

    public static void Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
    {
        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
        using var tx = c.BeginTransaction();   // el dedup y la multa, juntos

        using var dedup = c.CreateCommand();
        dedup.Transaction = tx;
        dedup.CommandText = "INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING";
        dedup.Parameters.AddWithValue("id", envelope.Id);

        if (dedup.ExecuteNonQuery() == 1)
        {
            using var multa = c.CreateCommand();
            multa.Transaction = tx;
            multa.CommandText = "INSERT INTO multas(nit, plan_al_suspender, monto) VALUES(@nit, @plan, @monto)";
            multa.Parameters.AddWithValue("nit", msg.Nit);
            multa.Parameters.AddWithValue("plan", msg.Plan);
            multa.Parameters.AddWithValue("monto", Tarifa[msg.Plan]);
            multa.ExecuteNonQuery();
        }
        tx.Commit();
    }
}
```

Llamar dos veces con el mismo `sobre` deja una sola fila: el dedup de §33 sigue en su sitio.

</details>

### Paso 2 · Empresas anuncia el plan del momento

La llamada del Paso 1 era una prueba directa. Quítala de tu `Program.cs` y vacía las tablas en `psql`: `DELETE FROM multas; DELETE FROM procesados;`.

> 🛠️ **Inténtalo tú.** Haz que suspender por el bus cobre la multa, y que suspender otra vez no cobre nada:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora"));
> await Task.Delay(500);   // la multa llega por la cola, después del commit
> // SELECT * FROM multas → una fila: 900800800 | Basico | 50000
> await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora otra vez"));
> // multas sigue con una fila
> ```
>
> Para eso, en el `SuspenderHandler` de `Empresas.Historia`: **(1)** Tu handler ya rehidrata la empresa para leer su NIT: lee también su plan. **(2)** Devuelve `EmpresaSuspendidaV2` con ese plan, en vez del `V1`. **(3)** Si la empresa ya estaba suspendida, no hagas nada y devuelve `null`: el retorno pasa a `Task<EmpresaSuspendidaV2?>`, y Wolverine no publica un `null`. Sin esa guarda, cada suspensión repetida es un mensaje nuevo que el dedup no junta, y cobraría otra multa. Tras reactivarse, suspender sí vuelve a cobrar, como en §33. **(4)** Tu test de [El outbox](./el-outbox.md) recibe ahora un `EmpresaSuspendidaV2?`: afirma primero `Assert.NotNull(anuncio)`, y súmale `Assert.Equal("Basico", anuncio.Plan)`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: rehidrata para LEER el plan de ese momento
public static class SuspenderHandler
{
    public static async Task<EmpresaSuspendidaV2?> Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)
            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");
        if (empresa.Suspendida) return null;   // ya lo estaba: ni hecho ni anuncio
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));
        return new EmpresaSuspendidaV2(empresa.Nit, cmd.Motivo, empresa.Plan);
    }
}
```

La regla de [Decidir el futuro](./decidir-el-futuro.md) se repite aquí, en el handler, porque los verbos de tu `Empresa` vuelven en [La plantilla](./la-plantilla.md). Y la lectura y la escritura no están atadas: un cambio de plan que llegue entre las dos viaja con el plan de antes, y dos suspensiones simultáneas pueden pasar las dos la guarda. Atarlas es trabajo de la versión esperada.

</details>

### Paso 3 · La mensualidad que lee la copia

Ahora, el reflejo: la mensualidad necesita el plan, y `multas` lo tiene. `CobrarMensualidad` es un comando **interno** de Facturación, no un contrato publicado: vive en `Facturacion`, y su forma puede cambiar sin sacar un `V2`. Lo envía tu `Program.cs`, que hace de proceso mensual, por el bus y no como un método, para tener el reintento que Wolverine le da a todo handler.

> 🆕 **`ExecuteScalar`: un solo valor.** Devuelve la primera columna de la primera fila como `object` (`null` si no hay filas), y se convierte con un cast: `(string?)q.ExecuteScalar()`.

> 🛠️ **Inténtalo tú.** Haz que esto funcione **leyendo la copia**:
>
> ```csharp
> await bus.InvokeAsync(new CobrarMensualidad("900800800"));
> // → "Mensualidad 900800800: Basico"
> ```
>
> Declara `CobrarMensualidad(Nit)` en `Facturacion` y escribe su handler `static`: un `SELECT plan_al_suspender FROM multas WHERE nit = @nit` sobre `Conexion.Cadena`, que deje la línea `Mensualidad {nit}: {plan}` en `MundoExterno.Recibidos`. Después provoca el tiempo con un `Append` directo, como en [El swap](./el-swap-por-reconocimiento.md): el pago (salda la deuda que anotó Empresas, no la multa), la reactivación y el cambio a Premium. Va directo porque reactivar y cambiar el plan no tienen handler en el bus. Respeta tú ese orden: el `Append` directo no revisa la regla de [Decidir el futuro](./decidir-el-futuro.md), que no deja cambiar el plan de una suspendida. Cobra otra vez.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/FacturacionHandler.cs (ya tiene los using de Npgsql y Wolverine)
public record CobrarMensualidad(string Nit);

public static class MensualidadHandler
{
    public static void Handle(CobrarMensualidad cmd)
    {
        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
        using var q = c.CreateCommand();
        q.CommandText = "SELECT plan_al_suspender FROM multas WHERE nit = @nit";
        q.Parameters.AddWithValue("nit", cmd.Nit);
        MundoExterno.Recibidos.Add($"Mensualidad {cmd.Nit}: {q.ExecuteScalar()}");
    }
}
```

```csharp
// Empresas.Historia/Program.cs (ve CobrarMensualidad y MundoExterno porque referencia a Facturacion)
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-8", new PagoRegistrado(50_000), new EmpresaReactivada(), new PlanCambiado("Premium"));
    await s.SaveChangesAsync();
}
await bus.InvokeAsync(new CobrarMensualidad("900800800"));
Console.WriteLine(string.Join("\n", MundoExterno.Recibidos));
```

</details>

Sale `Mensualidad 900800800: Basico` con emp-8 ya en Premium: el dolor, en tu base. Y una empresa que nunca fue suspendida no tiene fila en `multas`, así que su mensualidad sale sin plan. El nombre `plan_al_suspender` avisaba de cuándo era el dato, pero un nombre documenta, no impide. Lo que lo impide es que la mensualidad **no lea** `multas`.

### Paso 4 · Empresas responde la consulta

Quita de tu `Program.cs` las suspensiones del Paso 2 y el `Append` del Paso 3. El `Append` ya corrió (emp-8 está activa y en Premium), y las suspensiones la multarían de nuevo, ahora Premium.

> 🛠️ **Inténtalo tú.** Haz que esto devuelva el plan de **hoy**:
>
> ```csharp
> var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("900800800"));
> // plan.Plan == "Premium"
> ```
>
> Para eso: **(1)** Declara en `Contratos` la consulta `ConsultarPlanV1(Nit)` y su respuesta `PlanActualV1(Nit, Plan)`, cada una con su `[MessageIdentity]`. **(2)** Tu `Localizador` de [El swap](./el-swap-por-reconocimiento.md) tiene el NIT como llave. Dale un método `static` `StreamDe(IQuerySession session, string nit)` que lo traiga con `await session.LoadAsync<Localizador>(nit)` (`null` si no existe) y devuelva su `Stream`. `IQuerySession` es la sesión de Marten que solo lee; la `IDocumentSession` de tus handlers también lo es, así que `StreamDe` les sirve a los dos. **(3)** Que `StreamDe` **lance** si el NIT no tiene documento, con `?? throw`: con un id `null`, Marten no filtra por stream y respondería un plan inventado, como verás en el 🔨. **(4)** En `Empresas.Historia`, escribe un handler `static` de `ConsultarPlanV1` que pida `IQuerySession`, porque responder una consulta no escribe nada. Busca el stream con `StreamDe`, rehidrata la empresa y **devuelve** `PlanActualV1`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: la consulta y su respuesta, planas como los anuncios
[MessageIdentity("empresas.consultar-plan.v1")]
public record ConsultarPlanV1(string Nit);
[MessageIdentity("empresas.plan-actual.v1")]
public record PlanActualV1(string Nit, string Plan);
```

```csharp
// Empresas.Historia: en tu clase Localizador, la lectura de NIT a stream (using Marten;)
public static async Task<string> StreamDe(IQuerySession session, string nit) =>
    (await session.LoadAsync<Localizador>(nit))?.Stream
        ?? throw new InvalidOperationException($"El NIT {nit} no está en el localizador");
```

```csharp
// Empresas.Historia: responde, porque es el dueño del plan (using Contratos; using Marten;)
public static class ConsultarPlanHandler
{
    public static async Task<PlanActualV1> Handle(ConsultarPlanV1 q, IQuerySession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(await Localizador.StreamDe(session, q.Nit))
            ?? throw new InvalidOperationException($"No existe la empresa del NIT {q.Nit}");
        return new PlanActualV1(q.Nit, empresa.Plan);
    }
}
```

</details>

### Paso 5 · Facturación pregunta desde su borde

Facturación pregunta desde su **borde**: el punto de entrada que inicia el trabajo, fuera de cualquier handler; aquí, su proceso mensual. Preguntar dentro de `MensualidadHandler` funciona, pero la guía de Wolverine pide no invocar un handler desde otro: ese handler quedaría esperando a Empresas, y un fallo de la consulta repetiría la mensualidad entera. En el borde, el fallo le llega a quien disparó el proceso, y él decide si reintenta el mes.

> 🛠️ **Inténtalo tú.** Haz que esto cobre el plan de **hoy**:
>
> ```csharp
> await ProcesoMensual.Correr(bus, "900800800");
> // → "Mensualidad 900800800: Premium"
> ```
>
> Para eso: **(1)** En `Facturacion`, crea `ProcesoMensual` con un método `Correr(IMessageBus bus, string nit)`. Intenta primero leer el plan ahí mismo, con `AggregateStreamAsync<Empresa>`: no compila, porque `Facturacion` no ve `Empresa` ni Marten. Un `SELECT` a `mt_events` sí compila, pero es el acople de [El evento público](./el-evento-publico.md), ahora en SQL. **(2)** Que `Correr` pregunte con `InvokeAsync<PlanActualV1>` y envíe `CobrarMensualidad` con el plan de la respuesta. **(3)** Cambia `CobrarMensualidad` a `(Nit, Plan)`: su handler deja de leer `multas` y usa el plan que le llega. **(4)** En tu `Program.cs`, llama a `ProcesoMensual.Correr` en vez de enviar `CobrarMensualidad`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/ProcesoMensual.cs: el borde de Facturación
using Contratos;
using Wolverine;

public static class ProcesoMensual
{
    public static async Task Correr(IMessageBus bus, string nit)
    {
        var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // pregunta al dueño, en el momento
        await bus.InvokeAsync(new CobrarMensualidad(nit, plan.Plan));
    }
}
```

```csharp
// Facturacion/FacturacionHandler.cs: el handler ya no busca el plan; lo recibe
public record CobrarMensualidad(string Nit, string Plan);

public static class MensualidadHandler
{
    public static void Handle(CobrarMensualidad cmd) => MundoExterno.Recibidos.Add($"Mensualidad {cmd.Nit}: {cmd.Plan}");
}
```

```csharp
// Empresas.Historia/Program.cs: dispara el proceso mensual
await ProcesoMensual.Correr(bus, "900800800");
Console.WriteLine(string.Join("\n", MundoExterno.Recibidos));
```

</details>

> 🔍 **¿Lo lograste?** La mensualidad sale `Premium`, y `multas` sigue diciendo `plan_al_suspender = Basico`. Las dos cosas son ciertas: así era el plan el día de la suspensión, y así es hoy. Te protege que quien dispara la mensualidad pregunta en ese momento, y nadie guarda la respuesta.

### Paso 6 · Un mes, un solo cobro

Nada impide que el proceso mensual corra dos veces el mismo mes: alguien lo relanza tras una caída, o dos copias del servicio lo disparan a la vez. Llama a `ProcesoMensual.Correr` dos veces seguidas: sale `Mensualidad 900800800: Premium` dos veces. El dedup de [Llegó dos veces](./llego-dos-veces.md) no las junta, porque cada corrida envía un `CobrarMensualidad` nuevo, con su propio `envelope.Id`. Lo que se repite no es el mensaje: es el mes. La llave de este acto es la pareja NIT y mes.

> 🛠️ **Inténtalo tú.** Haz que esto cobre una sola vez:
>
> ```csharp
> await ProcesoMensual.Correr(bus, "900800800", "2026-10");
> await ProcesoMensual.Correr(bus, "900800800", "2026-10");   // el mismo mes, otra vez
> // → "Mensualidad 900800800: Premium", una sola vez
> ```
>
> Para eso: **(1)** Crea en `psql` la tabla `mensualidades(nit, periodo)` con `PRIMARY KEY (nit, periodo)`, como el `localizador` de [Dos streams, la misma clave](./dos-streams-misma-clave.md) con el NIT. **(2)** `Correr` recibe el mes como un texto que sirve de llave, `periodo` (`"2026-10"`). Antes de preguntar el plan, reserva el mes con `INSERT … ON CONFLICT (nit, periodo) DO NOTHING`. Si no insertó ninguna fila, ese mes ya tiene su cobro: no hagas nada más. **(3)** Haz la reserva dentro de una transacción, y confírmala después de enviar `CobrarMensualidad`: si la pregunta o el envío fallan, la reserva se deshace y el mes queda libre. **(4)** En tu `Program.cs`, pasa el mes en cada llamada.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```sql
CREATE TABLE mensualidades(nit TEXT NOT NULL, periodo TEXT NOT NULL, PRIMARY KEY (nit, periodo));
```

```csharp
// Facturacion/ProcesoMensual.cs: el borde reserva el mes antes de cobrarlo
using Contratos;
using Npgsql;
using Wolverine;

public static class ProcesoMensual
{
    public static async Task Correr(IMessageBus bus, string nit, string periodo)
    {
        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
        using var tx = c.BeginTransaction();
        using var reserva = c.CreateCommand();
        reserva.Transaction = tx;
        reserva.CommandText = "INSERT INTO mensualidades(nit, periodo) VALUES(@nit, @periodo) ON CONFLICT (nit, periodo) DO NOTHING";
        reserva.Parameters.AddWithValue("nit", nit);
        reserva.Parameters.AddWithValue("periodo", periodo);
        if (reserva.ExecuteNonQuery() == 0) return;   // ese mes ya tiene su cobro

        var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // pregunta al dueño, en el momento
        await bus.InvokeAsync(new CobrarMensualidad(nit, plan.Plan));
        tx.Commit();   // la reserva queda solo si el cobro salió
    }
}
```

</details>

Corre las dos llamadas otra vez: no sale ninguna mensualidad, porque octubre ya tiene la suya. Si dos corridas del mismo mes van a la vez, la segunda espera en su `INSERT` a que la primera confirme, y después no inserta nada: decide la `PRIMARY KEY`. Es la idea de [Llegó dos veces](./llego-dos-veces.md) del lado de quien envía.

## 🔨 Rómpelo: el precio de preguntar, la llave que no existe y la constante que parece un dato

**Nadie responde.** Comenta el handler de `ConsultarPlanV1` y corre el proceso mensual de un mes que todavía no cobraste, por ejemplo `"2026-11"`. **Falla** en la pregunta: `IndeterminateRoutesException: Could not determine any valid subscribers or local handlers for message type Contratos.ConsultarPlanV1`. La reserva de noviembre se deshace con la transacción, y ese mes queda libre. Con Empresas en otro proceso, el síntoma cambia: `TimeoutException` a los 5 segundos si está caído, o `WolverineRequestReplyException` enseguida si está arriba sin ese handler. Ese es el precio de preguntar.

**Un NIT que no existe.** Quita el `?? throw` de `StreamDe` y pregunta por un NIT que no está, `ConsultarPlanV1("000000000")`. No falla: responde un plan. Con un stream `null`, Marten no filtra por stream y rehidrata una "empresa" con los hechos de **todas** tus empresas mezclados. Vuelve a poner el `throw`.

**La constante que parece un dato.** ¿Y si el anuncio no trae el plan, como el `V1`? El reflejo es rellenarlo con una constante. Dale a `FacturacionHandler` un segundo `Handle`, para el `V1`, que llame al del `V2` con un plan fijo:

```csharp
public static void Handle(EmpresaSuspendidaV1 msg, Envelope envelope) =>
    Handle(new EmpresaSuspendidaV2(msg.Nit, msg.Motivo, "Basico"), envelope);   // el plan que "casi siempre" es
```

Llámalo a mano por emp-8, que hoy es Premium: `FacturacionHandler.Handle(new EmpresaSuspendidaV1("900800800", "mora"), new Envelope { Id = Guid.NewGuid() });`. `multas` gana una fila `900800800 | Basico | 50000`. Debía ser Premium, de 100.000, y nada la distingue de un cobro legítimo: es plausible y falsa. En la organización pasó con un libro contable: el consumidor rellenó `Libro = 1`, y los ajustes de otro libro caen en el principal. La cura: el dato que el receptor necesita viaja en el contrato como campo requerido, como el `Plan` del `V2`, y el borde lo traduce sin valor por defecto (`Tarifa[msg.Plan]` lanza si no conoce el plan). Borra ese `Handle`.

## Llevar, preguntar o replicar

Preguntar tiene un precio: Facturación **depende de que Empresas responda** en el momento de cobrar. Es alto si preguntas a cada rato o el dueño cae seguido. La otra salida es una **réplica suscrita**: Empresas anuncia el plan de cada empresa, y Facturación mantiene su propia copia. Es una copia que **se entera** de los cambios, pero puede ir atrás, como la vista de [El rezago](./el-rezago.md): justo tras un cambio de plan, puede cobrar una vez el plan viejo. Si eso no se tolera, se pregunta.

| Lo que Facturación necesita | Qué hacer | Lo que cuesta |
|---|---|---|
| El dato **como era** en un hecho | Que viaje en el anuncio; guárdalo con su nombre (`plan_al_suspender`) | Nada: un hecho del momento no envejece |
| El dato **como es hoy**, de vez en cuando | Preguntarle al dueño desde el borde (`InvokeAsync<T>`) | Dependes de que el dueño responda en ese momento |
| El dato **como es hoy**, todo el tiempo | Réplica suscrita a sus cambios | Puede ir atrás (consistencia eventual); más piezas |

> 🆕 **Cuando el mensaje pesa: el tiquete en vez del abrigo.** Es criterio, para reconocerlo: tus mensajes cortos no lo necesitan. Si el dato del momento es grande (las 300 líneas de una factura, un PDF), el anuncio pasa el tamaño máximo que acepta el broker. El patrón *claim-check* funciona como un guardarropa: al enviar, el contenido se guarda aparte y el mensaje lleva solo el tiquete, con el que quien lo recibe lo retira. Sigue siendo el contenido **del momento**. En Wolverine: una propiedad marcada con `[Blob]` y `opts.UseClaimCheck(...)` para decir dónde guardar.

## El Descubrimiento

Un dato de otro contexto se lleva, se pregunta o se replica, según **de cuándo** es. El hecho del momento viaja en el anuncio y se guarda con un nombre que dice su fecha. La verdad de hoy se le pregunta al dueño desde el borde, o se replica si preguntar cuesta demasiado. Nunca valen la copia huérfana, que nadie actualiza, ni la constante que rellena un dato que le falta al contrato. Y un acto que el borde dispara, como el cobro del mes, se reserva por su llave antes de enviarse, porque el sobre es nuevo en cada corrida. Impuestos, un módulo de la organización, lo hace así con la base de un impuesto, que puede corregirse después de confirmada: quien la necesita la pide con la consulta de Impuestos, en vez de copiarla.

> 🌱 Preguntar ata cada cobro a que Empresas responda en ese momento. La tercera fila de la tabla, la réplica suscrita, quita esa atadura, pero esa copia también se queda atrás sin un error: con una empresa que nadie anunció, con un cambio que nadie oyó o con un anuncio que llega tarde. La construyes, y la rompes, en [La réplica suscrita](./la-replica-suscrita.md).

## ✅ Compruébalo

- [ ] Viste la mensualidad que lee `multas` cobrar `Basico` con la empresa ya en Premium, y sabes por qué `plan_al_suspender = Basico` sí es correcto en `multas`.
- [ ] Suspender dos veces deja **una** multa: el handler no hace nada con una empresa ya suspendida.
- [ ] `ProcesoMensual`, en `Facturacion`, pregunta con `InvokeAsync<PlanActualV1>` y la mensualidad cobra `Premium` sin leer `multas`. Sabes por qué leer `Empresa` desde ahí no compila.
- [ ] Sabes decir qué pasa con lo que un handler devuelve cuando lo invocas con `InvokeAsync<T>` (vuelve a quien preguntó) y sin tipo (se publica).
- [ ] `EmpresaSuspendidaV2`, `ConsultarPlanV1` y `PlanActualV1` viven en `Contratos` con su `[MessageIdentity]`, y `Facturacion` sigue sin referenciar `Empresas.Historia`.
- [ ] `ProcesoMensual.Correr` dos veces con el mismo mes cobra **una** mensualidad, y sabes por qué el dedup por sobre no bastaba.
- [ ] En el 🔨 viste la consulta sin el `throw` responder un plan para un NIT que no existe, y la mensualidad fallar sin el handler de `ConsultarPlanV1`. Sabes nombrar ese precio (dependencia en el momento) y la alternativa (réplica suscrita).
- [ ] Viste el `V1` rellenado con un plan fijo dejar una multa `Basico` para una empresa Premium, y sabes la cura: el dato requerido en el contrato, y la tarifa sin valor por defecto.
- [ ] Sabes decir qué es un *claim-check* y por qué conserva el dato del momento.

## 🆘 Si algo salió mal

- **`InvokeAsync` no te da la respuesta, o `plan.Plan` lanza `NullReferenceException`:** usa la forma con tipo, `InvokeAsync<PlanActualV1>(consulta)`, y revisa que el handler devuelva `PlanActualV1`. Si devuelve otro tipo, recibes `null` y lo devuelto se publica.
- **`IndeterminateRoutesException` aunque el handler existe:** Wolverine solo busca handlers en el proyecto que arranca el host (`Empresas.Historia`). Revisa que tu config conserve `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)`, de [El outbox](./el-outbox.md).
- **`CS0246` con un contrato, o `MessageIdentity` no compila:** a tu `Program.cs` le falta `using Contratos;`, o al archivo de `Contratos`, `using Wolverine.Attributes;` (y al proyecto, el paquete `WolverineFx`, como en [El outbox](./el-outbox.md)).
- **`KeyNotFoundException` en `Tarifa[msg.Plan]`:** el plan viene escrito distinto a la llave de la tarifa (por ejemplo, `"Básico"` con tilde). Usa la misma escritura que guardan tus hechos.
- **Al volver a correr tu `Program.cs`:** la siembra lanza `ExistingStreamIdCollisionException`, y la llamada directa del Paso 1 cobra en cada corrida (crea un sobre nuevo): borra las dos. Tras el Paso 3, las suspensiones del Paso 2 cobran otra multa, ahora Premium. Deja solo lo que quieres repetir y, desde el Paso 6, usa un mes nuevo para ver otra mensualidad.
- **El mismo mes se cobra dos veces, o un mes que falló no se cobra nunca:** revisa el orden de `Correr`. Reserva primero, envía solo si el `INSERT` insertó una fila, y confirma la reserva después del `InvokeAsync` de `CobrarMensualidad`.

## 📓 Registra tu avance

> 💭 **Reto:** da un dato de otro contexto que tu sistema deba **llevar** en el anuncio y otro que deba **preguntar**, y explica qué pasaría si guardaras el segundo como si fuera el primero.

```bash
git add .
git commit -m "ES · El contrato lleva lo justo (hecho del momento vs verdad de hoy)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El dato de otro contexto que necesitas **como era** viaja en el anuncio y se guarda con su fecha en el nombre; el que necesitas **como es hoy** se le pregunta al dueño desde el borde (`InvokeAsync<T>`) o se replica suscrito a sus cambios; la copia que nadie actualiza y la constante que rellena un dato faltante nunca valen; y un acto que se repite, como el cobro del mes, se reserva por su llave antes de enviarse.

---

[⬅️ Volver: Llegó dos veces](./llego-dos-veces.md)

[➡️ Siguiente: La réplica suscrita](./la-replica-suscrita.md)
