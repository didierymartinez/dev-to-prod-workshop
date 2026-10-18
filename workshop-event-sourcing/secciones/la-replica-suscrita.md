# La réplica suscrita

Facturación ya cobra la mensualidad con el plan de hoy, porque se lo pregunta a Empresas en el momento. La tabla de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md) nombró otra salida: la réplica suscrita.

## 🎯 El Objetivo

Que Facturación cobre con su propia copia de los planes, que esa copia se entere de cada cambio, y que nunca cobre con un plan que no tiene.

## 💥 El dolor: la copia que no se enteró

Preguntar tiene un precio: si Empresas no responde, el mes no se cobra. Con una copia propia, Facturación cobra aunque Empresas esté caída. Empresas anuncia el plan, y Facturación guarda el último en una tabla suya. Esa copia puede fallar de cuatro formas, y ninguna lanza un error:

- La tabla nace hoy, y emp-8 cambió a Premium antes. Ningún anuncio de ese cambio va a llegar, así que emp-8 no tiene fila.
- Una empresa que no se anuncia al registrarse tampoco tiene fila. Leer una tabla sin fila da `null`, y la mensualidad sale sin plan.
- Si Empresas anuncia el registro y no los cambios de plan, la copia se queda con el plan del primer día.
- Un anuncio viejo que llega tarde, como una reentrega de [Llegó dos veces](./llego-dos-veces.md), pisa el plan nuevo con el viejo.

En la organización ya pasó: un catálogo se siembra sin anunciar nada, un servicio anuncia la creación de una dirección y no sus cambios, y una lista lee solo su copia y da por completo lo que no encontró.

## 🔧 Que el dueño anuncie todo, y que la copia diga cuándo no sabe

### Antes de empezar

De tu `Program.cs`, quita las corridas del proceso mensual de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), y deja el host, `store`, `bus` y tu `Sembrar`. emp-8 sigue activa y en Premium.

### Paso 1 · Empresas anuncia el plan, con su versión

> 🆕 **La versión del stream, en tu `Empresa`.** Con una propiedad `public long Version { get; private set; }`, Marten la reconoce por su nombre y la llena al rehidratar con la versión del stream: cuántos hechos tiene. Solo crece, así que ordena los anuncios de una empresa.

> 🛠️ **Inténtalo tú.** Haz que este test pase en `Empresas.Tests`:
>
> ```csharp
> var alta = RegistrarEmpresaHandler.Handle(new RegistrarEmpresa(id, nit, "Prueba", "Basico"), session);
> await session.SaveChangesAsync();
> var cambio = await CambiarPlanHandler.Handle(new CambiarPlanDeEmpresa(id, "Premium"), session);
>
> Assert.Equal("Premium", cambio.Plan);         // el plan vigente
> Assert.True(cambio.Version > alta.Version);   // la versión solo crece
> ```
>
> Para eso: **(1)** Declara en `Contratos` el anuncio `PlanDeEmpresaV1(Nit, Plan, Version)`, con `Version` de tipo `long` y su `[MessageIdentity]`. No es un `PlanCambiadoV1`: sale también al registrar, y lleva el plan vigente, no lo que cambió. **(2)** Dale `Version` a tu `Empresa`. **(3)** En `Empresas.Historia`, declara el comando `RegistrarEmpresa(EmpresaId, Nit, Nombre, Plan)` y su handler `static`. Que haga lo mismo que tu `Sembrar` y **devuelva** el anuncio con versión 1, porque el stream nace con un hecho. **(4)** Escribe el handler `static` de `CambiarPlanDeEmpresa`, el comando que ya tienes. Rehidrata la empresa y, si está suspendida, lanza tu `ReglaDeNegocioException`, la regla de [Decidir el futuro](./decidir-el-futuro.md). Haz `Append` del `PlanCambiado` con la versión que tendrá el stream, `empresa.Version + 1`, como en [El swap](./el-swap-por-reconocimiento.md), y devuelve el anuncio con esa versión. Si alguien escribió entre tu lectura y tu `Append`, choca, y no sale un anuncio con una versión falsa. **(5)** El test arma su store como tu `SuspenderHandlerTests`. Usa un id y un NIT nuevos en cada corrida, porque el localizador no admite un NIT repetido.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: un solo anuncio para el registro y los cambios
[MessageIdentity("empresas.plan-de-empresa.v1")]
public record PlanDeEmpresaV1(string Nit, string Plan, long Version);

// Empresas.Historia: el comando nuevo, junto a los otros, y la versión en tu Empresa
public record RegistrarEmpresa(string EmpresaId, string Nit, string Nombre, string Plan);
public long Version { get; private set; }   // en tu Empresa: Marten la llena al rehidratar
```

```csharp
// Empresas.Historia: registrar y cambiar el plan anuncian el plan vigente (using Contratos; using Marten;)
public static class RegistrarEmpresaHandler
{
    public static PlanDeEmpresaV1 Handle(RegistrarEmpresa cmd, IDocumentSession session)
    {
        session.Insert(new Localizador { Id = cmd.Nit, Stream = cmd.EmpresaId });
        session.Events.StartStream<Empresa>(cmd.EmpresaId, new EmpresaRegistrada(cmd.Nit, cmd.Nombre, cmd.Plan));
        return new PlanDeEmpresaV1(cmd.Nit, cmd.Plan, 1);   // el stream nace con un hecho
    }
}

public static class CambiarPlanHandler
{
    public static async Task<PlanDeEmpresaV1> Handle(CambiarPlanDeEmpresa cmd, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)
            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");
        if (empresa.Suspendida) throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");
        var version = empresa.Version + 1;   // la que tendrá el stream tras el Append
        session.Events.Append(cmd.EmpresaId, version, new PlanCambiado(cmd.NuevoPlan));
        return new PlanDeEmpresaV1(empresa.Nit, cmd.NuevoPlan, version);
    }
}
```

El test es el del ejemplo, en un `[Fact]` `async Task` de una clase nueva, por ejemplo `PlanDeEmpresaTests`. Copia de tu `SuspenderHandlerTests` los `using` y las líneas que arman el `store`, y antes de abrir la sesión crea `var id = $"emp-test-{Guid.NewGuid()}";` y `var nit = $"nit-{Guid.NewGuid()}";`.

</details>

Cambia el `return` para que anuncie `empresa.Version`, la leída, y corre el test: cae, porque el cambio sale con la misma versión que el alta, y una réplica lo descartaría como viejo. Vuelve a anunciar `version`.

### Paso 2 · Facturación guarda solo lo más nuevo

> 🆕 **Un `ON CONFLICT` con condición.** Ya usaste `ON CONFLICT … DO UPDATE` en [La vista de lectura](./la-vista-de-lectura.md). Dos piezas más: `EXCLUDED` es la fila que intentó entrar, y un `WHERE` al final deja actualizar solo si se cumple. `DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version WHERE plan_de_empresa.version < EXCLUDED.version` cambia la fila solo si lo que llega es más nuevo; si no, no hace nada.

> 🛠️ **Inténtalo tú.** Haz que el alta, reentregada tarde, no pise el plan nuevo:
>
> ```csharp
> await bus.InvokeAsync(new RegistrarEmpresa("emp-25", "902500000", "Vidrios del Cauca", "Basico"));
> await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-25", "Premium"));
> await Task.Delay(500);   // los anuncios llegan por la cola, después del commit
> PlanesHandler.Handle(new PlanDeEmpresaV1("902500000", "Basico", 1));   // el alta, otra vez y tarde
> // SELECT * FROM plan_de_empresa → 902500000 | Premium | 2
> ```
>
> Para eso: **(1)** Crea en `psql` la tabla `plan_de_empresa(nit, plan, version)`, con el NIT como `PRIMARY KEY` y la versión `BIGINT`. No la llames `planes`: ese nombre ya es el catálogo de [¿Merecía event sourcing?](./merecia-event-sourcing.md). **(2)** En `Facturacion`, crea una clase `static` `Planes` con un método `Guardar(nit, plan, version)` que haga ese `INSERT … ON CONFLICT` sobre `Conexion.Cadena`. **(3)** Escribe `PlanesHandler`, el handler `static` de `PlanDeEmpresaV1`, que llame a `Guardar`. Wolverine reconoce un handler por el final del nombre de su clase, `Handler` (o `Consumer`): `Planes` no recibe mensajes.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE plan_de_empresa(nit TEXT PRIMARY KEY, plan TEXT NOT NULL, version BIGINT NOT NULL);
```

```csharp
// Facturacion/Planes.cs: la réplica de Facturación (using Contratos; using Npgsql;)
public static class Planes
{
    public static void Guardar(string nit, string plan, long version)
    {
        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "INSERT INTO plan_de_empresa(nit, plan, version) VALUES(@nit, @plan, @version) " +
            "ON CONFLICT (nit) DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version " +
            "WHERE plan_de_empresa.version < EXCLUDED.version";   // lo viejo no pisa lo nuevo
        cmd.Parameters.AddWithValue("nit", nit);
        cmd.Parameters.AddWithValue("plan", plan);
        cmd.Parameters.AddWithValue("version", version);
        cmd.ExecuteNonQuery();
    }
}

public static class PlanesHandler
{
    public static void Handle(PlanDeEmpresaV1 msg) => Planes.Guardar(msg.Nit, msg.Plan, msg.Version);
}
```

</details>

La réplica no usa `procesados`. Guardar el mismo anuncio dos veces deja lo mismo, como los efectos naturales de [Llegó dos veces](./llego-dos-veces.md), y el `WHERE` descarta lo atrasado. El `Task.Delay` del ejemplo es el precio de la réplica: un cobro que corra antes de que llegue el anuncio sale con el plan viejo, como la vista de [El rezago](./el-rezago.md). Corre una vez y quita esas líneas de tu `Program.cs`: emp-25 ya existe, y registrarla otra vez lanza `ExistingStreamIdCollisionException`. Tu `Sembrar` sigue sirviendo para empresas de prueba, pero no pasa por un handler: no anuncia nada.

### Paso 3 · Sin fila, se pregunta

Tu réplica nació hoy, vacía, como nace en cada reinicio una copia en memoria. emp-8 cambió a Premium antes, y ningún anuncio de ese cambio va a llegar: `SELECT * FROM plan_de_empresa WHERE nit = '900800800';` no devuelve filas. Una mensualidad que leyera solo esa tabla saldría sin plan.

> 🛠️ **Inténtalo tú.** Haz que esto cobre Premium y deje la fila en la réplica:
>
> ```csharp
> await ProcesoMensual.Correr(bus, "900800800", "2026-12");
> Console.WriteLine(string.Join("\n", MundoExterno.Recibidos));
> // → Mensualidad 900800800: Premium
> // SELECT * FROM plan_de_empresa WHERE nit = '900800800' → 900800800 | Premium | 5
> //   (la versión de emp-8: SELECT version FROM mt_streams WHERE id = 'emp-8';)
> ```
>
> Para eso: **(1)** Dale a `Planes` un método `static async Task<string> De(IMessageBus bus, string nit)`. Que lea el plan en `plan_de_empresa` y, si hay fila, lo devuelva. **(2)** Si no hay fila, que le pregunte a Empresas con `InvokeAsync<PlanActualV1>`, guarde la respuesta con `Guardar` y la devuelva. Pregunta porque Facturación no ve el diario de Empresas: no puede rehidratar la empresa. **(3)** Para guardarla hace falta su versión: sin ella, un anuncio viejo que llegara después pisaría la respuesta. Agrégale a `PlanActualV1` un `long Version`, y que tu `ConsultarPlanHandler` le pase `empresa.Version`. Sigue siendo `V1`: un lector que no conoce el campo lo ignora, y una respuesta que no lo trae se lee con `Version = 0`, un default honesto como la `Referencia = null` de [Llegó dos veces](./llego-dos-veces.md), que pierde contra cualquier anuncio. **(4)** En `ProcesoMensual.Correr`, cambia la pregunta por `Planes.De`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: la respuesta gana la versión
[MessageIdentity("empresas.plan-actual.v1")]
public record PlanActualV1(string Nit, string Plan, long Version);

// Empresas.Historia: en ConsultarPlanHandler
return new PlanActualV1(q.Nit, empresa.Plan, empresa.Version);
```

```csharp
// Facturacion/Planes.cs: el único lugar donde Facturación saca el plan de hoy (using Wolverine; por IMessageBus)
public static async Task<string> De(IMessageBus bus, string nit)
{
    using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
    using var q = c.CreateCommand();
    q.CommandText = "SELECT plan FROM plan_de_empresa WHERE nit = @nit";
    q.Parameters.AddWithValue("nit", nit);
    var plan = (string?)q.ExecuteScalar();
    if (plan is not null) return plan;   // la réplica lo sabe

    var r = await bus.InvokeAsync<PlanActualV1>(new ConsultarPlanV1(nit));   // no lo sabe: le pregunta al dueño
    Guardar(r.Nit, r.Plan, r.Version);
    return r.Plan;
}
```

```csharp
// Facturacion/ProcesoMensual.cs: dentro de Correr, después de reservar el mes
var plan = await Planes.De(bus, nit);
await bus.InvokeAsync(new CobrarMensualidad(nit, plan));
```

</details>

Quien en Facturación necesite el plan de hoy lo pide a `Planes.De`; nadie más lee `plan_de_empresa` con su propio `SELECT`.

## 🔨 Rómpelo: la empresa que nadie anunció, el cambio que nadie oyó y el anuncio atrasado

**La empresa que nadie anunció.** Siembra emp-26 con tu `Sembrar`, que no anuncia: `Sembrar(s, "emp-26", "902600000", "Cerámicas del Huila", "Basico")`, en una sesión con su `SaveChangesAsync`. Comenta tu `ConsultarPlanHandler`, como si Empresas estuviera caída, y cobra diciembre a dos empresas. Primero `ProcesoMensual.Correr(bus, "902500000", "2026-12")` y la impresión de `MundoExterno.Recibidos`: sale `Mensualidad 902500000: Premium` sin preguntarle a nadie, y eso es lo que compra la réplica. Después `ProcesoMensual.Correr(bus, "902600000", "2026-12")`: falla con `IndeterminateRoutesException`, porque sin fila `De` pregunta y nadie responde. `De` no guarda nada, la reserva del mes se deshace y el próximo cobro vuelve a preguntar. Por eso `RegistrarEmpresa` anuncia: una empresa que nadie anunció depende de que Empresas responda en su primer cobro.

Vuelve a poner el handler, quita la siembra y haz que `De` confíe en su tabla: cambia `if (plan is not null) return plan;` por `return plan!;`. Cobra otra vez diciembre a emp-26: sale `Mensualidad 902600000: `, un cobro sin plan, y diciembre quedó reservado. Así falla una copia que lee solo lo que tiene. Devuelve el `if` y cobra enero, `"2027-01"`: sale `Basico`, y `plan_de_empresa` gana la fila de `902600000`.

**El cambio que nadie oyó.** Cambia el plan de emp-25 con un `Append` directo, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md): `s.Events.Append("emp-25", new PlanCambiado("Enterprise"))`. Empresas dice Enterprise, `plan_de_empresa` sigue en `Premium | 2`, y `ProcesoMensual.Correr(bus, "902500000", "2027-01")` cobra Premium. La pregunta no lo salva, porque hay fila. Un cambio que no pasa por el handler no se anuncia. Quita el `Append` y cambia el plan por el bus: `await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-25", "Basico"));`. Llegado el anuncio, `plan_de_empresa` queda en `Basico | 4`, igual que Empresas.

**El anuncio atrasado.** Quita el `WHERE` de `Guardar` y entrega dos anuncios de un NIT de prueba, el nuevo primero: `PlanesHandler.Handle(new PlanDeEmpresaV1("999", "Premium", 2));` y después `PlanesHandler.Handle(new PlanDeEmpresaV1("999", "Basico", 1));`. `plan_de_empresa` dice `999 | Basico | 1`: el viejo pisó al nuevo. Vuelve a poner el `WHERE`, borra esa fila (`DELETE FROM plan_de_empresa WHERE nit = '999';`) y repite: queda `Premium | 2`.

## El Descubrimiento

Una **réplica suscrita** es una copia que el dueño mantiene al día con sus anuncios, y funciona con tres reglas. El dueño anuncia cada cambio, también el registro, con el estado vigente y una versión que solo crece. La réplica guarda un anuncio solo si es más nuevo, así que uno repetido o atrasado no la daña. Y cuando no tiene fila lo dice: le pregunta al dueño o falla, nunca cobra con un vacío. Un solo lugar, `Planes.De`, saca el plan de hoy. A cambio de no depender del dueño en cada cobro, la copia va atrás mientras el anuncio viaja. DatosReferencia, un módulo de la organización, publica así sus catálogos: un anuncio por catálogo con su versión, y quien lo recibe guarda solo lo más nuevo.

> 🌱 Hasta aquí, cada anuncio es de ida: nadie le contesta a Empresas. Pero suspender ya no es solo anotarlo: Facturación cobra, otro sistema corta los accesos, y Empresas necesita saber si **los dos lo hicieron**. Eso pide algo que todavía no tienes, el estado de cada integración, y lo armas en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md).

## ✅ Compruébalo

- [ ] `PlanDeEmpresaV1(Nit, Plan, Version)` vive en `Contratos` con su `[MessageIdentity]`, y sale al registrar y al cambiar el plan por el bus.
- [ ] Tu test afirma el plan vigente y una versión mayor tras el cambio, y cae si el cambio sale con la versión leída.
- [ ] El alta reentregada tarde no pisa `Premium` en `plan_de_empresa`. Sin el `WHERE`, sí.
- [ ] emp-8, que nadie anunció, cobra Premium: `Planes.De` preguntó y guardó la respuesta con su versión.
- [ ] Con Empresas caída, cobraste a una empresa con fila y viste fallar a una sin fila. Viste el cobro sin plan cuando `De` confía en su tabla, y un `Append` directo dejar atrás a la réplica.

## 🆘 Si algo salió mal

- **`Version` siempre vale 0:** la propiedad debe llamarse `Version` y ser `long` (o `int`).
- **`plan_de_empresa` no cambia tras `CambiarPlanDeEmpresa`:** el handler tiene que **devolver** el anuncio, porque lo que no se devuelve no se publica. Si lo devuelve, revisa que su versión sea mayor que la guardada.
- **`No routes can be determined … (Contratos.PlanDeEmpresaV1)` en el log:** Wolverine no encontró tu handler. Su clase debe terminar en `Handler` y vivir en `Facturacion`, que ya registras con `IncludeAssembly`.
- **`relation "planes" already exists`:** ese nombre es tu catálogo. La réplica es `plan_de_empresa`.
- **`ExistingStreamIdCollisionException` o `DocumentAlreadyExistsException` al registrar:** ese id o ese NIT ya existen. Quita el `RegistrarEmpresa` tras la primera corrida, y en el test genera el NIT con un `Guid`.
- **`ReglaDeNegocioException` al cambiar el plan:** la empresa está suspendida. Reactívala antes, o usa otra.
- **`ProcesoMensual.Correr` no cobra nada:** ese mes ya está reservado. Usa un mes nuevo.

## 📓 Registra tu avance

Primero, deja en tu `DECISIONES.md` la decisión de hoy:

> Una réplica suscrita: el dueño anuncia cada cambio, también el registro, con el estado vigente y una versión que solo crece; la réplica guarda solo lo más nuevo, y sin fila pregunta al dueño o falla. `Planes.De` es el único lugar donde Facturación saca el plan de hoy.

> 💭 **Reto:** ¿qué dato de otro contexto replicarías en tu sistema en vez de preguntarlo? Di qué anuncio lo mantiene al día, qué versión lo ordena y qué hace tu copia cuando no tiene fila.

```bash
git add .
git commit -m "ES · La réplica suscrita (anunciar todo, guardar lo más nuevo, declarar la ausencia)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una réplica suscrita se mantiene al día si el dueño anuncia cada cambio, también el registro, con el estado vigente y una versión que solo crece, y si la copia guarda solo lo más nuevo; cuando no tiene fila, le pregunta al dueño o falla, nunca responde con un vacío, y a cambio de no depender del dueño en cada cobro, va atrás mientras el anuncio viaja.

---

[⬅️ Volver: El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md)

[➡️ Siguiente: Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md)
