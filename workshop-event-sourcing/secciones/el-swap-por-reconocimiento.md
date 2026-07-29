# El swap por reconocimiento

La sección pasada cerró con una frase: *"la salida madura no es armarlo: es reconocer que ya existe hecho y correcto."* Es hora de reconocerlo.

## 🎯 El Objetivo

Reemplazar tu **diario** a mano —la tabla `eventos`, `GetEvents`/`Guardar`, la concurrencia, la rehidratación— por **Marten**, sobre la **misma** Postgres, reconociendo pieza por pieza qué de lo que construiste ya hacía la librería.

## 💥 El dolor: mantener a mano lo que una librería ya resolvió

No hay un dolor nuevo — el dolor es la **suma** de los que ya viviste. Mira lo que llevas escrito a mano, y a qué corresponde. Unas piezas las adoptas **hoy** (el diario); otras las reconoces ahora y las adoptas en las secciones que siguen:

| Lo que construiste a mano | Lo que ya es de la librería | Cuándo lo adoptas |
|---|---|---|
| Tabla `eventos` + `GetEvents`/`Guardar` (SQL crudo) | El **event store** de Marten (`StartStream`, `Append`) | **hoy** |
| `PRIMARY KEY(stream, version)` para la concurrencia | Concurrencia optimista de Marten (integrada) | **hoy** |
| Rehidratar con `AbrirStream<Empresa>(id).Get()` | `AggregateStreamAsync<Empresa>(id)` | **hoy** |
| `seq` + `CorrerProyector()` en bucle + tabla `checkpoint` + la vista `Suspendidas` | El **daemon** async de Marten + una proyección (`mt_event_progression` es su checkpoint) | [El daemon](./el-daemon-y-la-consistencia-eventual.md) |
| `bandeja_salida` + `EntregarPendientes` + el claim | El **outbox** y los transportes de **Wolverine** | [El outbox](./el-outbox.md) |
| El puerto `IEventStore` + el doble en memoria | Todo el motor recogido en una plantilla: `AggregateRoot` + una `MartenUnitOfWork` sobre la sesión + el doble | [La plantilla](./la-plantilla.md) |

Cada fila de la izquierda es código tuyo que mantener, con sus bordes (¿y si el checkpoint se corrompe?, ¿y si dos escritores nacen el mismo stream?). Cada una de la derecha es lo mismo, atómico y probado, sobre la Postgres que ya usas. Construiste la izquierda **para entenderla**; ahora la cambias por la derecha **por alivio**.

## 🔧 Adoptar Marten como tu diario

Marten es una librería de event sourcing sobre Postgres. Hoy adoptas su **event store**: guardar hechos en un stream, rehidratar un agregado, y su concurrencia optimista.

> 🆕 **Marten: tu diario, hecho librería.** `session.Events.StartStream` nace un stream (tu registro); `session.Events.Append` agrega hechos a uno existente; `session.Events.AggregateStreamAsync<Empresa>(id)` **rehidrata** reproduciendo los hechos —tu `AbrirStream(id).Get()`, hecho por otros—. La concurrencia optimista está integrada: `Append(id, versiónEsperada, hecho)` rechaza la escritura si el stream avanzó. Todo sobre la misma Postgres, con `DocumentStore.For(...)` — **sin host ni inyección de dependencias todavía** (eso llega en [El host y la inyección](./el-host-y-la-inyeccion.md)).

> ⚠️ **Marten 9 es async — pero eso no es la consistencia eventual.** *"As of Marten 9.0, only asynchronous data access is supported"*: leer y guardar pasan a `await` porque Marten no bloquea hilos en el I/O, punto. Es fuertemente **consistente**: si guardas un hecho y enseguida rehidratas ese stream, lo ves. La **consistencia eventual** —la vista que va atrás— no vive aquí; vive en el proyector async, que es el **daemon**, y llega en [El daemon](./el-daemon-y-la-consistencia-eventual.md). No confundas "todo es `await`" (I/O) con "la vista tarda" (el daemon).

### Paso 1 · El store (se muestra, no se reta)

Esto es configuración de un paquete nuevo — idioma que aún no puedes adivinar, así que se muestra:

```csharp
using Marten;
using JasperFx.Events;   // StreamIdentity

var store = DocumentStore.For(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;   // tus ids son "emp-7", no Guid
});
```

`DocumentStore.For` te da el store directo, sin host ni DI: justo lo que necesitas para reconocer el diario sin arrastrar aún el andamiaje del servicio.

### Paso 2 · Adapta tu `Empresa`

> 🛠️ **Inténtalo tú.** Tu `Empresa` casi no cambia. En [Refactorizando el motor](./refactorizando-el-motor.md) dejaste una semilla: *"un `Aplicar` por tipo… la volverás a encontrar, con un enrutador seguro en vez de `dynamic`"*. Esta es la cosecha: en vez de tu `Aplicar(object)` con `switch`, escribe un método `Apply(EmpresaRegistrada e)`, `Apply(PlanCambiado e)`, `Apply(EmpresaSuspendida e)`… uno por tipo, que Marten **descubre por convención** (el enrutador seguro, compilado, sin `dynamic`). Deja los setters **privados** —la encapsulación de [Decidir el futuro](./decidir-el-futuro.md) se queda: el agregado sigue siendo tuyo—; Marten rehidrata reproduciendo los hechos, no deserializando propiedades. Añade una propiedad `Id` (string).

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Id { get; private set; }
    public string Nit { get; private set; }        // sigue guardando lo que ya guardabas
    public string Nombre { get; private set; }
    public string Plan { get; private set; }
    public bool Suspendida { get; private set; }
    public int Reactivaciones { get; private set; }
    // (tu Empresa conserva también DeudaPendiente y su Apply(PagoRegistrado); los omitimos aquí para no alargar)

    public void Apply(EmpresaRegistrada e) { Nit = e.Nit; Nombre = e.Nombre; Plan = e.Plan; }
    public void Apply(PlanCambiado e)      { Plan = e.NuevoPlan; }
    public void Apply(EmpresaSuspendida e) { Suspendida = true; }
    public void Apply(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }
}
```

Los `Apply` son la forma que descartaste en §3 por usar `dynamic`; Marten los llama por el tipo del hecho, en código compilado. Conserva las propiedades que tu `Empresa` ya tenía — solo cambia el `switch` por métodos.

</details>

### Paso 3 · Escribir, rehidratar, y la concurrencia

> 🛠️ **Inténtalo tú.** Consigue esto contra Marten, con una sesión (`store.LightweightSession()`): nacer un stream con `StartStream` (el registro), agregar hechos con `Append`, rehidratar con `AggregateStreamAsync`, y ver la concurrencia optimista rechazar un choque. Y borra tu tabla `eventos`, `GetEvents` y `Guardar`: Marten los tiene.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// nacer un stream nuevo (tu registro) — todo async
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-7",
        new EmpresaRegistrada("900123", "Andes", "Basico"), new EmpresaSuspendida("mora"));
    await s.SaveChangesAsync();
}

// agregar hechos a un stream existente
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-7", new EmpresaReactivada());
    await s.SaveChangesAsync();
}

// rehidratar (tu AbrirStream(...).Get(), ahora de Marten): reproduce los hechos, respeta tus setters privados
await using (var s = store.LightweightSession())
{
    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-7");   // e.Suspendida == false, e.Reactivaciones == 1
}
```

```csharp
// concurrencia optimista, integrada: espero una versión; si el stream avanzó, choca
var estado = await s.Events.FetchStreamStateAsync("emp-7");
s.Events.Append("emp-7", estado.Version, new EmpresaSuspendida("x"));   // otro que espere la MISMA versión
await s.SaveChangesAsync();   // el segundo lanza EventStreamUnexpectedMaxEventIdException — tu ConcurrencyException, de Marten
```

No hay tabla `eventos` ni `GetEvents`/`Guardar` que mantengas: el diario es de Marten. Ojo: tu proyector, la medición de rezago y la vista `pagos` leían esa tabla `eventos`, así que **quedan inoperantes** hasta que los migres — se mudan al **daemon** de Marten en [El daemon](./el-daemon-y-la-consistencia-eventual.md), y tu `bandeja_salida` a **Wolverine** en [El outbox](./el-outbox.md). (Por eso borras `eventos` ahora pero el read-side a mano se retira del todo en §32.)

</details>

## 🔨 Rómpelo: comprueba que Marten hace lo tuyo

Nace `emp-7` con un registro + una suspensión, agrégale una reactivación, y rehidrata → `Suspendida == false`, `Reactivaciones == 1`, `Plan == "Basico"` (el replay que escribiste a mano lo hace `AggregateStreamAsync`, y tus setters privados siguen intactos). Luego reproduce tu prueba de concurrencia de [Concurrencia optimista](./concurrencia-optimista.md): dos escrituras que esperan la misma versión → la segunda lanza `EventStreamUnexpectedMaxEventIdException`. Es tu `ConcurrencyException`, ahora impuesta por Marten — no la escribiste, pero sabes exactamente qué protege.

## El Descubrimiento

El swap no es rendirse: es **reconocer**. Construiste a mano el diario, la concurrencia y la rehidratación no para producirlos, sino para **entender qué hace falta** — y ahora reconoces cada uno en Marten y lo adoptas, atómico y correcto, sobre la misma Postgres. Ganaste algo que no se pierde con el swap: el **criterio**. Sabes qué protege la concurrencia optimista porque la armaste con un `PRIMARY KEY`; sabes por qué rehidratar puede ser caro porque lo hiciste a mano; reconociste el `Apply` por tipo de [§3](./refactorizando-el-motor.md) en la convención de Marten. Adoptar la librería sin ese criterio es magia; adoptarla con él es ingeniería. Y el reconocimiento sigue: el proyector es su **daemon** (§32), tu outbox es **Wolverine** (§30), y todo el motor se recoge en una plantilla —`AggregateRoot` + una unidad de trabajo sobre Marten + el doble en memoria— (§38).

> 🌱 Marten se llevó el diario. Pero tu `bandeja_salida` y su entrega reclamada —el outbox y la cola que empezaste a mano en [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) y [El mensaje y la cola](./el-mensaje-y-la-cola.md)— siguen siendo tuyas. Marten tiene un hermano, **Wolverine**, para exactamente eso: un outbox durable en la misma transacción del hecho, sin el bucle de `SELECT ... SKIP LOCKED` que ibas a escribir. Adoptarlo paga la deuda del dual-write que dejaste pendiente: [El outbox](./el-outbox.md).

## ✅ Compruébalo

- [ ] Marten guarda (`StartStream`/`Append`) y rehidrata (`AggregateStreamAsync`) tu `Empresa` con `Apply` por tipo y setters **privados** — sin tu tabla `eventos` ni tu `GetEvents`.
- [ ] La concurrencia optimista integrada rechaza dos escrituras que esperan la misma versión (`EventStreamUnexpectedMaxEventIdException`) — sin que escribieras la verificación.
- [ ] Tu código de diario ahora es `async` (Marten 9 no da acceso síncrono) — y sabes decir por qué eso es I/O no bloqueante, **no** la consistencia eventual (esa es el daemon, §32).
- [ ] Sabes emparejar cada pieza (diario, concurrencia, rehidratar) con su equivalente en Marten, y cuál se adopta ahora y cuál en §30/§32/§38.

## 🆘 Si algo salió mal

- **Marten no descubre tus `Apply`:** deben ser métodos de instancia `Apply(TEvento)` en la clase (no el `Aplicar(object)` con `switch`), y la clase necesita una propiedad `Id` (`string`, con `StreamIdentity.AsString`).
- **`NotSupportedException: only asynchronous data access is supported`:** quedó un `.ToList()`/`.Single()` síncrono. En Marten 9 todo es `await ...Async()`.
- **Setters privados y rehidratar:** funcionan — `AggregateStreamAsync` reconstruye reproduciendo los hechos (llama tus `Apply`), no deserializando propiedades. (Un *snapshot* persistido sí exigiría setters públicos, pero eso es cosa del daemon en §32.)
- **`StartStream` falla porque el stream ya existe:** `StartStream` es para nacer; a un stream existente se le hace `Append`.

## 📓 Registra tu avance

> 💭 **Reto:** empareja cada pieza de tu diario a mano con su equivalente en Marten, y para la concurrencia explica qué borde (edge case) cuidabas a mano y Marten ya cuida. ¿Qué criterio conservas después del swap que no tendrías si hubieras empezado con Marten?

```bash
git add .
git commit -m "ES · El swap por reconocimiento (adoptar Marten como diario)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El swap no es rendirse sino reconocer: tu diario a mano —event store, concurrencia optimista, rehidratación— existe en **Marten**, atómico y probado, sobre la misma Postgres (y ahora async, que es I/O no bloqueante, no la consistencia eventual del daemon); lo adoptas por alivio y conservas el criterio de saber qué hace y por qué — y el reconocimiento sigue con el daemon (§32) y Wolverine (§30).

---

[⬅️ Volver: El mensaje y la cola](./el-mensaje-y-la-cola.md)

[➡️ Siguiente: El outbox](./el-outbox.md)
