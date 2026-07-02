# Conocer Marten: el sandbox

Tu motor ya espera sin congelarse ([El tiempo de espera](el-tiempo-de-espera.md)) y Postgres corre en un contenedor ([Docker y PostgreSQL](docker-postgres.md)). Es hora de conocer la herramienta que cruzará el muro de la persistencia por ti: **Marten**.

## 🎯 El Objetivo

Conocer Marten en un **sandbox** —una consola aparte, no tu app—: configurarlo, escribir eventos, y **verlos aparecer en las tablas de Postgres**, antes de tocar una sola línea de tu sistema.

## Adoptar con criterio, no por moda

Antes de escribir una línea de Marten, la pregunta honesta: ¿por qué adoptarlo **ahora**? Porque cumples las cuatro condiciones que separan adoptar de rendirse a la magia:

1. **Sentiste el dolor** — el muro de serializar hechos a mano, la concurrencia, el `object` que hay que recuperar como su tipo ([Docker y PostgreSQL](docker-postgres.md)).
2. **Sabes qué hace** — porque construiste su versión a mano (streams, replay, versión, almacén).
3. **Sabes cómo lo hace** — puedes abrir la caja y entender el mecanismo.
4. **Podrás depurarlo** — si falla en producción, no estás frente a una caja negra.

Adoptar aquí no es cargo-cult: es delegar en expertos un trabajo que **ya dominas**.

## Qué es Marten

Marten es una **base de datos documental + event store sobre PostgreSQL**. Guarda streams de eventos, los rehidrata, lleva la versión y serializa por ti — justo lo que construiste a mano, hecho por gente que lo mantiene en producción. Vamos a verlo en una consola de juguete.

## 🔧 El primer stream con Marten

Quieres poder escribir esto en una consola nueva y **ver los hechos aterrizar en Postgres**:

```csharp
using Marten;
using JasperFx.Events;   // en Marten 9, StreamIdentity vive en este paquete

var store = DocumentStore.For(opts =>
{
    opts.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
    opts.Events.StreamIdentity = StreamIdentity.AsString;   // nuestros ids son string ("emp-7"), no Guid
});

await using var session = store.LightweightSession();

session.Events.StartStream("emp-7", new EmpresaRegistrada("Constructora Andes", "Básico"));
session.Events.Append("emp-7", new PlanCambiado("Premium"), new EmpresaSuspendida("falta de pago"));
await session.SaveChangesAsync();

Console.WriteLine("Guardado. Míralo en mt_events.");
```

> 🛠️ **Inténtalo tú.** (1) Crea una consola aparte (`dotnet new console -o Sandbox.Marten`) y agrégale el paquete `Marten`. (2) Reusa tus records de evento (`EmpresaRegistrada`, `PlanCambiado`, `EmpresaSuspendida`) — cópialos o referencia tu dominio. (3) Escribe ese `Program.cs`, córrelo, y **abre `pgAdmin` o `psql`** contra `gestion_eventstore`: mira las tablas `mt_streams` y `mt_events` que aparecieron solas.

> [!NOTE]
> 🆕 **Las piezas nuevas de Marten.** `DocumentStore.For(...)` configura el store (solo necesita el *connection string*). `store.LightweightSession()` abre una **sesión** = una unidad de trabajo/transacción; nada se guarda hasta `SaveChangesAsync()`. `session.Events.StartStream(id, …)` **abre** un stream nuevo; `Append(id, …)` le suma hechos. `StreamIdentity.AsString` le dice a Marten que tus ids de stream son `string` (su default es `Guid`).

> [!WARNING]
> Marten **crea sus tablas solo**, en tiempo de ejecución, la primera vez que las necesita — comodísimo para desarrollar. En **producción** eso se apaga (migraciones controladas): no quieres que tu app altere el esquema al arrancar. Por ahora, en el sandbox, déjalo hacer.

## 🔍 ¿Lo lograste?

En `mt_events` deberías ver **tres filas** para el stream `emp-7`: `EmpresaRegistrada`, `PlanCambiado`, `EmpresaSuspendida`, cada una con su número de **versión** (1, 2, 3), su **timestamp**, el **JSON** del hecho y el **nombre del tipo .NET** (para deserializar al leer). En `mt_streams`, una fila: el stream `emp-7`, versión 3.

---

### El Descubrimiento

Escribiste **cuatro líneas** y ya tienes un event store operativo sobre Postgres: streams, versión, serialización, transacción. Todo lo que en el motor casero te costó varias secciones, Marten lo trae horneado. Lo reconoces por dentro, porque lo construiste. Este sandbox es solo para conocerlo; en las próximas secciones lo enchufas a tu app de verdad.

> [!NOTE]
> 🌱 **Semilla — lo que sigue.** Aún solo **escribiste** eventos. Falta **reconstruir** la `Empresa` desde ellos: eso es `AggregateStreamAsync` con métodos `Create`/`Apply` por convención, y trae *time-travel* gratis ([Rehidratar con Marten](rehidratar-con-marten.md)). Y luego, el gran paso: reemplazar tu `EventStore` casero por Marten en la app real ([El swap](el-swap.md)).

---

## ✅ Compruébalo

- [ ] Una consola sandbox con el paquete `Marten` que conecta al `gestion_eventstore` de tu contenedor.
- [ ] `StartStream` + `Append` + `SaveChangesAsync` guardan tres hechos en `emp-7`.
- [ ] Ves las tablas `mt_streams` y `mt_events` (con versión, JSON y tipo) en pgAdmin/psql.
- [ ] Explicas las cuatro condiciones para adoptar Marten sin caer en cargo-cult.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Cuáles son las cuatro condiciones para adoptar una herramienta con criterio? ¿Qué conceptos que construiste a mano reconociste en `mt_events`?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Conocer Marten (sandbox)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Marten es un **event store sobre PostgreSQL**: en un sandbox, con `DocumentStore.For` + una sesión + `StartStream`/`Append`/`SaveChangesAsync`, guardas hechos en cuatro líneas y los ves en `mt_events` con versión, JSON y tipo — los mismos conceptos que construiste a mano, ahora horneados, y los adoptas con criterio porque los entiendes por dentro.

---

[⬅️ Volver: El tiempo de espera (async/await)](./el-tiempo-de-espera.md)

[➡️ Siguiente: Rehidratar con Marten](./rehidratar-con-marten.md)
