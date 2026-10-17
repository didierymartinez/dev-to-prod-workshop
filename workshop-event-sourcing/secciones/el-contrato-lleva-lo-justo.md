# El contrato lleva lo justo

Facturación ya cobra la multa una sola vez. Ahora quiere cobrarla **según el plan** de la empresa, y el plan no es suyo.

## 🎯 El Objetivo

Que Facturación use el plan de una empresa —un dato que pertenece a otro contexto— sin quedarse con una copia que se desactualiza sin avisar.

## 💥 El dolor: la copia que se quedó en el pasado

La multa depende del plan: Facturación cobra $50.000 a una empresa Básico, $100.000 a una Premium y $200.000 a una Enterprise. Esa tarifa es una regla **de Facturación**, suya. El catálogo `planes` de [¿Merecía event sourcing?](./merecia-event-sourcing.md) es otra cosa: guarda los precios de lista de la plataforma. Lo que no es suyo es el plan de cada empresa: ese lo decide Empresas. Y el anuncio que Facturación recibe, `EmpresaSuspendidaV1(Nit, Motivo)`, no lo trae.

El reflejo es meterlo en el anuncio. Facturación cobra la multa con él y, como ya lo tiene, lo **guarda** junto a la multa. Más adelante le piden cobrar la **mensualidad** de esa empresa, que depende de su plan, y Facturación usa el plan que tiene guardado. (Cuánto vale cada cuota es otra regla de Facturación; aquí lo que importa es de qué plan.)

El problema aparece con el tiempo:

```
1. Suspendes emp-8 (Básico)            → Facturación cobra la multa Básico y guarda el plan
2. emp-8 paga y se reactiva
3. emp-8 cambia a Premium              → PlanCambiado queda en el diario de Empresas (un hecho interno: no se anuncia)
4. Cobras la mensualidad de emp-8      → Facturación lee su copia: Básico
```

Empresas dice Premium y Facturación cobra Básico, sin un solo error. La copia fue correcta el día que llegó y dejó de serlo sin que nadie se enterara, porque su dueño no sabe que existe. Lo vas a provocar en el Paso 3.

## 🔧 Dos preguntas distintas, dos respuestas

El error no es meter el plan en el anuncio. Es usar **para hoy** un dato que llegó **de ayer**. Facturación le hace al plan dos preguntas distintas:

- **¿Qué plan tenía cuando la suspendieron?** Es un hecho del momento y no cambia nunca. Que viaje en el anuncio y que Facturación lo guarde está bien. Preguntarlo después sería peor: si la entrega de la multa se reintentara después del Paso 3, con emp-8 ya en Premium, la multa saldría Premium por una suspensión que fue Básico.
- **¿Qué plan tiene hoy?** Es la verdad viva, y tiene un dueño: Empresas. Esa no se guarda: **se le pregunta al dueño** en el momento en que hace falta.

> 🆕 **Preguntarle al dueño: pedir y esperar la respuesta.** Quien publica un anuncio no espera nada. Quien hace una **consulta** espera la respuesta. Ya usas `bus.InvokeAsync(cmd)` para enviar un comando, y en [El outbox](./el-outbox.md) viste que lo que el handler devuelve **se publica**. La forma con tipo, `await bus.InvokeAsync<TRespuesta>(consulta)`, cambia eso: lo que el handler devuelve, si es del tipo `TRespuesta`, **vuelve a quien preguntó** y no se publica. La consulta y la respuesta son contrato público, como los anuncios: viven en `Contratos`, para que Facturación pregunte sin ver el dominio de Empresas.

### Antes de empezar · una empresa limpia

Tu `emp-7` arrastra la historia de las secciones anteriores (ya está suspendida). Siembra una empresa nueva en tu `Program.cs`, después de `await host.StartAsync()`. Pídele al host el store, como `IDocumentStore`. Basta ese: es el que integraste con Wolverine en [El outbox](./el-outbox.md). Agrega también `using Contratos;` al `Program.cs`: desde aquí usa varios contratos.

```csharp
var store = host.Services.GetRequiredService<IDocumentStore>();
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-8", new EmpresaRegistrada("900800800", "Cooperativa Llanos", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y los Pasos 2 y 4 la leen. Agrégala en `psql`:

```sql
INSERT INTO localizador(nit, stream) VALUES ('900800800', 'emp-8');
```

Corre tu `Program.cs` una vez. Después borra el bloque de la siembra y deja el `store`: emp-8 ya existe, y `StartStream` no la nace dos veces.

### Paso 1 · Facturación cobra según el plan

> 🛠️ **Inténtalo tú.** Haz que esto cobre la multa de una empresa Básico:
>
> ```csharp
> var sobre = new Envelope { Id = Guid.NewGuid() };
> FacturacionHandler.Handle(new EmpresaSuspendidaV2("900800800", "mora", "Basico"), sobre);
> // SELECT * FROM multas → 900800800 | Basico | 50000
> ```
>
> Para eso: **(1)** Declara `EmpresaSuspendidaV2(Nit, Motivo, Plan)` en `Contratos`, al lado del `V1`. **(2)** Tu `FacturacionHandler` de [Llegó dos veces](./llego-dos-veces.md) pasa a recibir el `V2`, y el cobro de la multa se vuelve un `INSERT` en una tabla `multas(nit, plan_al_suspender, monto)`, con el monto según la tarifa. El nombre de la columna dice de cuándo es el dato. **(3)** Mete ese `INSERT` y el del dedup por `envelope.Id` en la **misma transacción**, como en [Todo o nada](./todo-o-nada.md). Si el dedup entrara y la multa no, la reentrega vería el id como procesado y la multa no se cobraría nunca. **(4)** En tu `Program.cs`, reemplaza la simulación de reentrega de §31 por la llamada del ejemplo, sin duplicarla: es la misma idea, ahora con el `V2`.

El `V1` se queda declarado en `Contratos`: un contrato publicado no se borra mientras pueda haber mensajes `V1` en camino, y en producción su handler se conserva hasta que la cola se vacía. En tu taller no queda ninguno en camino, y Facturación era su único consumidor, así que su handler pasa directo al `V2`.

Hasta el Paso 2, lo que suspendas por el bus publica un `V1` que nadie escucha: Wolverine lo anota en su log (`No routes can be determined…`) y lo descarta. Por eso el Paso 1 se prueba llamando al handler directo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos
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

Llamar dos veces con el mismo `sobre` deja una sola fila: el dedup de §31 sigue en su sitio.

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
> Para eso, en el `SuspenderHandler` de `Empresas.Historia`: **(1)** Rehidrata la empresa para leer su plan de ese momento. Rehidratar es `await`, así que el método pasa a `async Task<...>`. **(2)** Devuelve `EmpresaSuspendidaV2` con ese plan, en vez del `V1`. **(3)** Si la empresa ya estaba suspendida, no hagas nada y devuelve `null`: el tipo de retorno lleva `?` (`Task<EmpresaSuspendidaV2?>`) y Wolverine no publica un `null`. Sin esa guarda, cada suspensión repetida cobraría otra multa: son mensajes distintos, y el dedup no los junta. Repetida es la de una empresa que ya estaba suspendida; otra suspensión después de reactivarse sí es un cobro legítimo, como en §31.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: rehidrata para LEER el plan de ese momento
public static class SuspenderHandler
{
    public static async Task<EmpresaSuspendidaV2?> Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId);
        if (empresa!.Suspendida) return null;   // ya lo estaba: ni hecho ni anuncio
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));
        return new EmpresaSuspendidaV2(Localizador.NitDe(cmd.EmpresaId), cmd.Motivo, empresa.Plan);
    }
}
```

La regla de [Decidir el futuro](./decidir-el-futuro.md) se repite aquí, en el handler, en vez de pedírsela a la empresa. Tras [El swap](./el-swap-por-reconocimiento.md), tu `Empresa` es una clase con sus `Apply`: sus verbos, con `Emitir` y `SinConfirmar`, se fueron con `AggregateRoot` y vuelven en [La plantilla](./la-plantilla.md). Además, la lectura y la escritura no están atadas: si un cambio de plan entra justo entre las dos, el anuncio lleva el plan de antes; y dos suspensiones simultáneas podrían pasar las dos la guarda. Atarlas es trabajo de la versión esperada.

</details>

### Paso 3 · La mensualidad que lee la copia

Ahora, el reflejo. La mensualidad necesita el plan, y `multas` lo tiene.

`CobrarMensualidad` es un comando **interno** de Facturación, no un contrato publicado: vive en `Facturacion`, y puedes cambiarle la forma sin sacar un `V2`. Aquí lo envía tu `Program.cs`, que hace las veces del proceso mensual de Facturación. Va por el bus, y no como un método, para tener lo que Wolverine le da a todo handler: el reintento, la dead-letter cuando viaja por una cola, y mañana un envío programado cada mes.

> 🆕 **`ExecuteScalar`: un solo valor.** Devuelve la primera columna de la primera fila como `object` (`null` si no hay filas), y se convierte con un cast: `(string?)q.ExecuteScalar()`.

> 🛠️ **Inténtalo tú.** Haz que esto funcione **leyendo la copia**:
>
> ```csharp
> await bus.InvokeAsync(new CobrarMensualidad("900800800"));
> // → "Mensualidad 900800800: Basico"
> ```
>
> Declara `CobrarMensualidad(Nit)` en `Facturacion` y escribe su handler `static`: un `SELECT plan_al_suspender FROM multas WHERE nit = @nit` sobre `Conexion.Cadena`, y deja la línea `Mensualidad {nit}: {plan}` en `MundoExterno.Recibidos`. Después provoca el tiempo: con un `Append` directo, como en [El swap](./el-swap-por-reconocimiento.md), registra el pago, la reactivación y el cambio a Premium, en ese orden. Va directo porque, desde [El outbox](./el-outbox.md), solo suspender pasa por el bus. El pago salda la deuda que Empresas anotó al suspender, no la multa de Facturación. El `Append` directo no revisa reglas: respeta tú el orden, porque la regla de [Decidir el futuro](./decidir-el-futuro.md) no deja cambiar el plan de una suspendida. Cobra otra vez.

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

Sale `Mensualidad 900800800: Basico`, y emp-8 ya es Premium. Ahí está el dolor, en tu base. Y otro síntoma del mismo error: una empresa que nunca fue suspendida no tiene fila en `multas`, así que su mensualidad sale sin plan. La columna se llamaba `plan_al_suspender` y te avisaba de cuándo era el dato, pero no te detuvo: un nombre documenta, no impide. Lo que lo impide es que la mensualidad **no lea** `multas`.

### Paso 4 · Empresas responde la consulta

Quita de tu `Program.cs` las suspensiones del Paso 2 y el `Append` del Paso 3. El `Append` ya corrió: emp-8 está activa y en Premium, y repetirlo solo le suma hechos a su diario. Las suspensiones, con emp-8 activa, la multarían de nuevo, ahora Premium.

> 🛠️ **Inténtalo tú.** Haz que esto devuelva el plan de **hoy**:
>
> ```csharp
> var plan = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1("900800800"));
> // plan.Plan == "Premium"
> ```
>
> Para eso: **(1)** Declara en `Contratos` la consulta `ConsultarPlanV1(Nit)` y su respuesta `PlanActualV1(Nit, Plan)`. **(2)** El localizador guarda NIT y stream, y hasta hoy solo lo leías de stream a NIT (`NitDe`). Añade al helper `Localizador` la lectura inversa, de NIT a stream: `StreamDe(nit)`, con `SELECT stream FROM localizador WHERE nit = @nit`. **(3)** Que `StreamDe` **lance** si el NIT no tiene fila. Para eso, `?? throw` lanza cuando lo de su izquierda es `null`. Con un id `null`, Marten no filtra por stream y respondería un plan inventado; lo ves en el 🔨. **(4)** En `Empresas.Historia`, escribe un handler `static` de `ConsultarPlanV1`. Pide `IQuerySession`, la sesión de Marten que solo lee: responder una consulta no escribe nada. Así el handler lo declara (su `Events` no tiene `Append`), y con `AutoApplyTransactions` no queda nada que confirmar. Busca el stream con `StreamDe`, rehidrata la empresa y **devuelve** `PlanActualV1`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: la consulta y su respuesta, planas como los anuncios
public record ConsultarPlanV1(string Nit);
public record PlanActualV1(string Nit, string Plan);
```

```csharp
// Empresas.Historia: el helper del localizador (NitDe y su cadena siguen aquí)
public static string StreamDe(string nit)
{
    using var c = new NpgsqlConnection(cadena); c.Open();
    using var q = c.CreateCommand();
    q.CommandText = "SELECT stream FROM localizador WHERE nit = @nit";
    q.Parameters.AddWithValue("nit", nit);
    return (string?)q.ExecuteScalar()
        ?? throw new InvalidOperationException($"El NIT {nit} no está en el localizador");
}
```

```csharp
// Empresas.Historia: responde, porque es el dueño del plan (using Contratos; using Marten;)
public static class ConsultarPlanHandler
{
    public static async Task<PlanActualV1> Handle(ConsultarPlanV1 q, IQuerySession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(Localizador.StreamDe(q.Nit));
        return new PlanActualV1(q.Nit, empresa!.Plan);
    }
}
```

</details>

### Paso 5 · Facturación pregunta desde su borde

¿Desde dónde pregunta Facturación? Desde su **borde**: el punto de entrada que inicia el trabajo, fuera de cualquier handler. En Facturación es su proceso mensual. El borde pregunta, y le pasa la respuesta al handler.

¿Y por qué no preguntar dentro de `MensualidadHandler`, pidiéndole `IMessageBus`? Funciona, pero la guía de Wolverine pide no invocar un handler desde dentro de otro. Esto no lo vas a sentir en un solo proceso; es criterio. Con Empresas en otro proceso, el handler de la mensualidad quedaría bloqueado esperando la respuesta. Y si la consulta fallara, el reintento de Wolverine repetiría la mensualidad entera. En el borde, si la pregunta falla, el error le llega a quien disparó el proceso, y decide él: reintentar el mes o avisar.

> 🛠️ **Inténtalo tú.** Haz que esto cobre el plan de **hoy**:
>
> ```csharp
> await ProcesoMensual.Correr(bus, "900800800");
> // → "Mensualidad 900800800: Premium"
> ```
>
> Para eso: **(1)** En `Facturacion`, crea `ProcesoMensual` con un método `Correr(IMessageBus bus, string nit)`. Antes de preguntar, intenta leer el plan ahí mismo, con `AggregateStreamAsync<Empresa>`: no compila, porque `Facturacion` no ve `Empresa` ni Marten. Un `SELECT` a `mt_events` desde Facturación sí compila, pero la ata al esquema interno de otro contexto: es el acople de [El evento público](./el-evento-publico.md), ahora en SQL. Y en producción esa base ni siquiera es la suya. Preguntar es la única salida que respeta el límite. **(2)** Que `Correr` pregunte con `InvokeAsync<PlanActualV1>` y envíe `CobrarMensualidad` con el plan de la respuesta. **(3)** Cambia `CobrarMensualidad` a `(Nit, Plan)`: su handler deja de leer `multas` y usa el plan que le llega. **(4)** En tu `Program.cs`, llama a `ProcesoMensual.Correr` en vez de enviar `CobrarMensualidad`.

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

> 🔍 **¿Lo lograste?** La mensualidad sale `Premium`, y `multas` sigue diciendo `plan_al_suspender = Basico`. Las dos cosas son ciertas: así era el plan el día de la suspensión, y así es hoy. Lo que te protege no es el handler: es que quien dispara la mensualidad pregunta en ese momento, y nadie guarda la respuesta.

## 🔨 Rómpelo: el precio de preguntar, y la llave que no existe

**Nadie responde.** Comenta el handler de `ConsultarPlanV1` (como si Empresas no estuviera) y corre el proceso mensual. **Falla** en la pregunta: `IndeterminateRoutesException: Could not determine any valid subscribers or local handlers for message type Contratos.ConsultarPlanV1`. Nadie responde, y Facturación no puede cobrar. Con Empresas en otro proceso cambia el síntoma. Si Empresas está caído, la espera vence a los 5 segundos (`TimeoutException`). Si está arriba sin ese handler, falla enseguida (`WolverineRequestReplyException`). Esa es la cuenta de preguntar: Facturación ahora **depende de que Empresas responda** en el momento de cobrar.

**Un NIT que no existe.** Quita el `?? throw` de `StreamDe` y pregunta por un NIT que no está, `ConsultarPlanV1("000000000")`. No falla: responde un plan. Con un stream `null`, Marten no filtra por stream, rehidrata una "empresa" con los hechos de **todas** tus empresas mezclados, y tu consulta miente sin un solo error. Vuelve a poner el `throw`.

Ese precio de preguntar es alto si preguntas a cada rato o si el dueño cae seguido. Entonces la otra salida es una **réplica suscrita**: Empresas anuncia `PlanCambiadoV1`, y Facturación se suscribe y mantiene su propia tabla de planes. Es una copia que **se entera** de los cambios, y Facturación la trata como una vista que puede ir atrás, igual que la de [El rezago](./el-rezago.md): justo después de un cambio de plan, puede cobrar una vez el plan viejo. Si eso no se tolera, se pregunta.

| Lo que Facturación necesita | Qué hacer | Lo que cuesta |
|---|---|---|
| El dato **como era** en un hecho | Que viaje en el anuncio; guárdalo con su nombre (`plan_al_suspender`) | Nada: un hecho del momento no envejece |
| El dato **como es hoy**, de vez en cuando | Preguntarle al dueño desde el borde (`InvokeAsync<T>`) | Dependes de que el dueño responda en ese momento |
| El dato **como es hoy**, todo el tiempo | Réplica suscrita a sus cambios | Puede ir atrás (consistencia eventual); más piezas |

> 🆕 **Cuando el mensaje pesa: el tiquete en vez del abrigo.** Esto es criterio: con tus mensajes cortos no lo vas a necesitar, pero conviene reconocerlo. Si el dato del momento es grande —las 300 líneas de una factura, un PDF—, meterlo en el anuncio infla el mensaje hasta que el transporte lo rechaza: los brokers tienen un tamaño máximo por mensaje. El patrón *claim-check* lo resuelve como un guardarropa: el contenido pesado se guarda en un almacén aparte, el mensaje viaja solo con el tiquete, y quien lo recibe retira el contenido con él. Como se guarda una copia al enviar, el contenido sigue siendo **el del momento**; preguntarle al dueño, en cambio, te da el de hoy. Wolverine lo trae hecho: una propiedad marcada con `[Blob]` y `opts.UseClaimCheck(...)` para decir dónde guardar.

## El Descubrimiento

Un dato de otro contexto se lleva, se pregunta o se replica, y lo decide **de cuándo** es el dato. El hecho del momento viaja en el anuncio y se guarda con un nombre que dice su fecha. La verdad de hoy se le pregunta a su dueño, desde el borde, al precio de depender de él. Si se pregunta tanto que ese precio duele, se replica, suscrita a los cambios y sabiendo que puede ir atrás. Lo único que nunca vale es la copia huérfana: correcta el día que llegó, vieja desde el siguiente, y sin nadie que lo sepa.

Lo mismo pasa en Impuestos, un módulo de la organización que calcula impuestos. Al confirmar, congela la **base** de un impuesto, el monto sobre el que se calcula, pero puede corregirla después con un hecho nuevo (un desgravamen). La base al confirmar es como tu `plan_al_suspender`; el registro con sus correcciones es como el plan de hoy. Por eso quien la necesita después la pide por referencia, con la consulta que Impuestos ya ofrece, en vez de guardar una copia que no se enteraría de la corrección.

> 🌱 Hasta aquí, cada anuncio es de ida: Facturación cobra y nadie le pregunta si pudo. Pero suspender una empresa ya no es solo anotarlo: Facturación tiene que cobrar y otro sistema tiene que cortarle los accesos, y Empresas necesita saber si **los dos lo hicieron**. Cuando un acto espera respuestas de otros, aparece algo que todavía no tienes: el estado de cada integración. Lo armas en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md).

## ✅ Compruébalo

- [ ] `multas` guarda `plan_al_suspender` con el plan del día de la suspensión, y sigue diciendo `Basico` después del cambio de plan. Sabes por qué eso es correcto.
- [ ] Suspender dos veces deja **una** multa: el handler no hace nada con una empresa ya suspendida.
- [ ] Viste la mensualidad que lee `multas` cobrar `Basico` con la empresa ya en Premium.
- [ ] `ProcesoMensual`, en `Facturacion`, pregunta con `InvokeAsync<PlanActualV1>` y la mensualidad cobra `Premium`, sin leer `multas`. Sabes por qué leer `Empresa` desde ahí no compila.
- [ ] Sabes decir qué pasa con lo que un handler devuelve cuando lo invocas con `InvokeAsync<T>` (vuelve a quien preguntó) y cuando lo invocas sin tipo (se publica).
- [ ] `ConsultarPlanV1` y `PlanActualV1` viven en `Contratos`; `Facturacion` sigue sin referenciar `Empresas.Historia`.
- [ ] Viste la consulta, con `StreamDe` sin el `throw`, responder un plan para un NIT que no existe, y sabes por qué.
- [ ] Con el handler de `ConsultarPlanV1` comentado, la mensualidad falla, y sabes nombrar ese precio (dependencia en el momento) y la alternativa (réplica suscrita).
- [ ] Sabes decir qué es un *claim-check* y por qué conserva el dato del momento.

## 🆘 Si algo salió mal

- **`InvokeAsync` no te da la respuesta:** usa la forma con tipo, `InvokeAsync<PlanActualV1>(consulta)`. La forma sin tipo ejecuta el handler y **publica** lo que devuelve; no te lo entrega.
- **`NullReferenceException` en `plan.Plan`:** el handler de la consulta devuelve otro tipo (o nada). `InvokeAsync<PlanActualV1>` no falla por eso: te entrega `null`, y lo que el handler sí devolvió se publica como mensaje. Revisa que devuelva `PlanActualV1`.
- **`IndeterminateRoutesException` aunque el handler existe:** Wolverine solo busca handlers en el proyecto que arranca el host (`Empresas.Historia`). Revisa que tu config conserve la línea de [El outbox](./el-outbox.md), `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)`: sin ella, los handlers de `Facturacion` no existen para Wolverine.
- **Tu `Program.cs` no compila tras el Paso 1 (no se puede convertir `EmpresaSuspendidaV1` en `EmpresaSuspendidaV2`):** es la simulación de reentrega de §31. Reemplázala por la llamada del Paso 1.
- **`CS0246` con `EmpresaSuspendidaV2`, `ConsultarPlanV1` o `PlanActualV1`:** a tu `Program.cs` le falta `using Contratos;`. Agrégalo, como en *Antes de empezar*.
- **`KeyNotFoundException` en `Tarifa[msg.Plan]`:** el plan viene escrito distinto a la llave de la tarifa (por ejemplo, `"Básico"` con tilde y la tarifa en `"Basico"`). Usa la misma escritura que guardan tus hechos.
- **`multas` sale vacía justo después de suspender:** la multa llega por la cola, después del commit. Espera un instante y vuelve a consultar.
- **`StreamDe` lanza `InvalidOperationException`:** ese NIT no tiene fila en el localizador. Siembra la fila como en *Antes de empezar*.
- **Al volver a correr tu `Program.cs`:** la siembra lanza `ExistingStreamIdCollisionException` (emp-8 ya existe). La llamada directa del Paso 1 cobra de nuevo en cada corrida, porque crea un sobre nuevo cada vez: bórrala. Las suspensiones del Paso 2 no cobran mientras emp-8 siga suspendida, pero tras el Paso 3 está activa, y cobran otra multa, ahora Premium. Deja solo lo que quieres repetir, por ejemplo el proceso mensual.
- **Quieres meter el plan en `EmpresaSuspendidaV1`:** no lo edites: un contrato publicado no se cambia. El `V2` va al lado.

## 📓 Registra tu avance

> 💭 **Reto:** da un dato de otro contexto que tu sistema deba **llevar** en el anuncio y otro que deba **preguntar**, y explica qué pasaría si guardaras el segundo como si fuera el primero.

```bash
git add .
git commit -m "ES · El contrato lleva lo justo (hecho del momento vs verdad de hoy)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El dato de otro contexto que necesitas **como era** viaja en el anuncio y se guarda con su fecha en el nombre; el que necesitas **como es hoy** se le pregunta al dueño desde el borde (`InvokeAsync<T>`, cuya respuesta vuelve y no se publica) o se replica suscrito a sus cambios; y la copia que nadie actualiza es la única que nunca vale.

---

[⬅️ Volver: Llegó dos veces](./llego-dos-veces.md)

[➡️ Siguiente: Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md)
