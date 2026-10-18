# El stream que no para de crecer

Tu consulta (1) de [Observar el motor nuevo](./observar-el-motor-nuevo.md) ordena los streams por largo. Los tuyos tienen pocos hechos. El de una empresa que recibe pagos todos los días no deja de crecer.

## 🎯 El Objetivo

Medir cuánto cuesta cargar una empresa con miles de hechos. Que Marten guarde la empresa ya calculada en la misma transacción de cada hecho, y que tus handlers la lean de ahí sin importar ese largo. Y saber cuándo la salida es otra: acortar el stream o partirlo.

## 💥 El dolor: cada comando rehidrata desde el primer hecho

`AggregateStreamAsync` lee y aplica todos los hechos del stream, desde el primero, cada vez que la llamas. Tus handlers la llaman en cada comando. Con pocos hechos no se nota. Una distribuidora recibe decenas de avisos del banco al día, y cada uno deja un `PagoRegistrado`: en unos años, veinte mil. Créala y mide, en tu `Program.cs`, entre `var app = builder.Build();` y `app.Run();`:

```csharp
var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya

// una distribuidora de acme con veinte mil pagos, cada uno con su referencia del banco
await using (var s = store.LightweightSession("acme"))
{
    Sembrar(s, "emp-60", "906000000", "Distribuidora Andina", "Premium");
    s.Events.Append("emp-60", Enumerable.Range(1, 20_000).Select(i => new PagoRegistrado(10_000, $"BANCO-{i:00000}")));   // BANCO-00001 … BANCO-20000
    await s.SaveChangesAsync();
}

// cuánto cuesta cargarla para decidir
async Task Medir(string id)
{
    await using var s = store.LightweightSession("acme");
    var reloj = System.Diagnostics.Stopwatch.StartNew();   // un cronómetro que corre desde aquí
    var empresa = await s.Events.AggregateStreamAsync<Empresa>(id);
    Console.WriteLine($"{id}: versión {empresa!.Version}, {empresa.Nombre}, cargada en {reloj.ElapsedMilliseconds} ms");
}
await Medir("emp-177");   // la primera carga arma el código de lectura de Marten y tarda más: no cuenta
await Medir("emp-177");
await Medir("emp-60");
```

```
emp-177: versión 3, Lavandería Sur, cargada en 25 ms
emp-177: versión 3, Lavandería Sur, cargada en 1 ms
emp-60: versión 20001, Distribuidora Andina, cargada en 144 ms
```

Tus tiempos y la versión de emp-177 serán otros. La diferencia se mantiene: emp-60 tarda cien veces más, y cada pago la hace más lenta. Cada comando sobre emp-60 paga esa carga antes de decidir. Después de la primera corrida, quita la siembra de emp-60: volver a sembrarla lanza `ExistingStreamIdCollisionException`. Deja `Medir`: la usas en toda la sección.

En la organización pasa lo mismo: una configuración que se rehidrata en cada cálculo, un plan de cuentas con miles de cuentas en un solo stream, un chat que se rehidrata varias veces en cada mensaje, y un `GET` por id que rejuega toda la historia de un tercero.

## 🔧 La empresa ya calculada, guardada con cada hecho

> 🆕 **Un snapshot `Inline`, y el camino que lo lee.** `opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Inline)` le pide a Marten guardar tu `Empresa` como un documento de `mt_doc_empresa`, en la misma transacción de cada hecho que la cambia. Es el snapshot que en [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) construía el daemon, ahora sin daemon y sin rezago. Para cargar, `session.Events.FetchLatest<Empresa>(id)` lee ese documento y no rejuega ningún hecho; sin snapshot registrado, rehidrata como `AggregateStreamAsync`. `LoadAsync<Empresa>(id)` también lee el documento, pero no sabe si va atrasado: `FetchLatest` te da la empresa al día, con cualquier registro. Vive en la `IDocumentSession`, la sesión que reciben tus handlers.

Con cada hecho nuevo, Marten relee ese documento, le aplica el hecho y lo guarda otra vez. En [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) tu `Empresa` se releyó en blanco, y la vista fue otra clase, porque la vista no decide. Este documento es lo que tus handlers cargan para decidir: tiene que ser la `Empresa` misma, y tiene que releerse entera. Sin `Id`, Marten ni siquiera la guarda: la escritura lanza `ArgumentNullException: Value cannot be null. (Parameter 'key')`. Hacer públicos sus setters serviría, pero cualquiera podría cambiar la empresa sin un hecho.

> 🆕 **`[JsonInclude]`, de `System.Text.Json.Serialization`.** Un atributo que se pone sobre una propiedad de setter privado, o sobre un campo privado: el deserializador lo llena al releer. Un campo `readonly` no: solo se asigna al crear el objeto, y el deserializador lo deja como nace.

La `Version` necesita otra cosa. Al rehidratar, Marten la llena por su nombre; en el documento, como en tu `EmpresaDetalle` de [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md), queda en 0. Tus `CambiarPlanHandler` y `RegistrarPagoHandler` usan `empresa.Version + 1` como versión esperada, y tu `SuspenderHandler` arma con ella el id del proceso: con 0, los tres se rompen. La cura es la que ya conoces: `opts.Schema.For<Empresa>().Metadata(m => m.Revision.MapTo(e => e.Version))`.

> ⚠️ **Los streams que nacieron antes del snapshot no tienen documento.** Con `Inline`, Marten aplica cada hecho nuevo sobre el documento que encuentra, y si no hay, lo arma solo con ese hecho: una empresa sin nombre ni plan. Por eso, antes de usar el snapshot, rearma `Empresa` una vez, con la orden de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md):
>
> ```csharp
> // una vez: los documentos de Empresa, rehechos desde el diario
> using (var daemon = await store.BuildProjectionDaemonAsync())
>     await daemon.RebuildProjectionAsync("Empresa", CancellationToken.None);
> ```
>
> Va sin la pausa de tu `Vistas.Rearmar`: corre antes de `app.Run()`, cuando el daemon del servicio todavía no arrancó.

### Paso 1 · Cargar del snapshot

> 🛠️ **Inténtalo tú.** Quiero que `Medir` cargue emp-60 en pocos milisegundos, con su versión y su nombre:
>
> ```
> emp-60: versión 20001, Distribuidora Andina, cargada en 4 ms
> ```
>
> Para eso: **(1)** En tu `Empresa`, marca con `[JsonInclude]` cada propiedad de setter privado, salvo `Version`, y el `HashSet` de referencias; quítale al `HashSet` su `readonly`. **(2)** En el `AddMarten` de tu `AgregarEmpresas`, registra el snapshot `Inline` de `Empresa` y su línea de `Metadata`. **(3)** Pon la reconstrucción antes de tus llamadas a `Medir`. **(4)** En `Medir`, carga con `FetchLatest`. Corre una vez, y después comenta la reconstrucción: rejuega el diario entero en cada arranque, y en el 🔨 la vuelves a usar.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en tu Empresa (using System.Text.Json.Serialization;): lo que el documento necesita para releerse. Tus Apply no cambian.
[JsonInclude] public string Id { get; private set; }
public long Version { get; private set; }   // la llena la línea de Metadata
[JsonInclude] public string Nit { get; private set; } = "";
// … el mismo [JsonInclude] en Nombre, Plan, Suspendida, DeudaPendiente, Reactivaciones y ProcesoAbierto …
[JsonInclude] private HashSet<string> _referenciasDePago = new();   // sin readonly: al releer, se vuelve a llenar
```

```csharp
// Empresas.Historia/Configuracion.cs, en el AddMarten de tu AgregarEmpresas
opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Inline);                 // la empresa ya calculada, en la transacción de cada hecho
opts.Schema.For<Empresa>().Metadata(m => m.Revision.MapTo(e => e.Version));   // su Version, desde mt_version
```

```csharp
// Empresas.Historia/Program.cs, en Medir
var empresa = await s.Events.FetchLatest<Empresa>(id);   // lee el documento: no rejuega
```

`SnapshotLifecycle` vive en `JasperFx.Events.Projections`, el mismo `using` de tu `ProjectionLifecycle`.

</details>

> 🔍 **¿Lo lograste?** En `psql`, `SELECT mt_version FROM mt_doc_empresa WHERE id = 'emp-60';` responde `20001`: el documento llega hasta el último hecho del stream.

### Paso 2 · Decidir desde el snapshot

> 🛠️ **Inténtalo tú.** Quiero que el banco pueda avisar dos veces el mismo pago, que entre una sola vez, y que el segundo aviso no rehidrate a emp-60:
>
> ```bash
> curl -X POST "http://localhost:5000/empresas/emp-60/pagos?monto=10000" -H "Idempotency-Key: BANCO-90001" -H "Authorization: Bearer $ACME"
> curl -s -o /dev/null -w '%{time_total}\n' -X POST "http://localhost:5000/empresas/emp-60/pagos?monto=10000" -H "Idempotency-Key: BANCO-90001" -H "Authorization: Bearer $ACME"   # el banco avisa otra vez
> # 0.010      ← solo cargar emp-60 rehidratando costaba 144 ms
> # SELECT count(*) FROM mt_events WHERE stream_id = 'emp-60' AND data ->> 'Referencia' = 'BANCO-90001';  → 1
> ```
>
> Para eso, carga con `FetchLatest` en cada handler que decide sobre la `Empresa`: `SuspenderHandler`, `RegistrarPagoHandler` y `CambiarPlanHandler`. Cambia solo la carga: su logger, su plazo y su versión esperada se quedan como están. El banco avisa por tu endpoint de pagos de [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md), con su referencia en `Idempotency-Key`. La guarda de pagos ahora pregunta al `HashSet` que sale del documento: si no se relee, el segundo aviso entra.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en cada handler que decide sobre la Empresa: la misma carga, por el camino que lee el snapshot
var empresa = await session.Events.FetchLatest<Empresa>(cmd.EmpresaId)
    ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");
```

</details>

> 🔍 **¿Lo lograste?** Suspende emp-60 con `curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-60/suspender`. `SELECT id FROM mt_streams WHERE id LIKE 'susp-emp-60-%';` responde `susp-emp-60-20003`: tu handler leyó la versión del documento. Tu `HostConDaemon` arranca con tu `AgregarEmpresas`: tus tests también cargan del snapshot, y siguen verdes.

## 🔨 Rómpelo: tres formas de perder el snapshot

**El camino que no lo lee.** En `Medir`, vuelve a cargar con `AggregateStreamAsync`. El documento sigue en `mt_doc_empresa`, al día, y la carga de emp-60 vuelve a pasar de 100 ms: `AggregateStreamAsync` rehidrata siempre. Registrar el snapshot no basta; lo aprovecha quien carga con `FetchLatest`. Vuelve a `FetchLatest`.

**El snapshot que llega tarde.** Un snapshot `Async` pesa menos en cada escritura: lo escribe el daemon, después. Pruébalo en un handler que decide. Cambia el registro a `SnapshotLifecycle.Async`, y en `RegistrarPagoHandler` carga el documento tal como está: `await session.LoadAsync<Empresa>(cmd.EmpresaId)`. Reinicia, espera unos segundos a que el daemon alcance, y manda dos veces el aviso `BANCO-90002`, uno tras otro:

```bash
for i in 1 2; do curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/empresas/emp-60/pagos?monto=10000" -H "Idempotency-Key: BANCO-90002" -H "Authorization: Bearer $ACME"; done
# 200
# 409      ← o 200, si el daemon alcanzó a tiempo
```

El `count(*)` de esa referencia da 1. El segundo aviso leyó el documento antes de que el daemon le aplicara el primer pago, y decidió sobre una empresa vieja. Tu versión esperada lo atrapó: el log dice `EventStreamUnexpectedMaxEventIdException`, y tu política lo reintentó. Si el daemon alcanzó durante los reintentos, el aviso responde 200; si no, el banco recibe un 409 por un aviso que debía responder 200. Sin la versión esperada, ese pago habría entrado dos veces. Es el read-your-write roto de [El rezago](./el-rezago.md), ahora en la escritura.

Con `FetchLatest`, el snapshot `Async` no se equivoca: completa el documento con los hechos que el daemon todavía no aplicó. Pero los rejuega en cada carga, y si el daemon se detiene, los pendientes crecen sin techo. Con `Inline` no pasa ninguna de las dos cosas. `Inline` cura el atraso, no la carrera: dos avisos que llegan a la vez los sigue cuidando tu versión esperada. Vuelve a `Inline` y a `FetchLatest`. Descomenta la reconstrucción, arranca una vez y vuelve a comentarla: rehace desde el diario los documentos que escribió el daemon, y borra su progreso, `Empresa:All`.

**Lo que no se relee.** Quita el `[JsonInclude]` del `Id`, reinicia y manda un aviso con la llave `BANCO-90003`: responde 500, y el log dice `ArgumentNullException: Value cannot be null. (Parameter 'key')`. Al guardar el pago, Marten releyó el documento sin `Id`. Vuelve a ponerlo.

El `Id` falla fuerte. El `readonly` no: tu editor te va a sugerir devolvérselo al `HashSet` (la regla IDE0044: el campo nunca se reasigna). Hazlo, reinicia y manda dos veces el aviso con la llave `BANCO-90004`: entran dos. Compila, y el `[JsonInclude]` sigue ahí. Pero al releer, el campo `readonly` queda vacío. Mira el documento:

```sql
SELECT jsonb_array_length(data -> '_referenciasDePago') FROM mt_doc_empresa WHERE id = 'emp-60';
--  1        ← antes del aviso, 20002
```

Cada hecho nuevo releyó el conjunto vacío y guardó solo su propia referencia. Un pago viejo, como `BANCO-00007`, también entraría otra vez. Quita el `readonly` y corre otra vez la reconstrucción, como antes: el documento se rehace desde el diario. Los pagos dobles se quedan en el diario, porque son hechos. Se corrigen con otro hecho, como una devolución, no borrándolos.

## 🔧 Cuando el snapshot no basta: acortar o partir

Quita de tu `Program.cs` `Medir` y sus llamadas, que corren en cada arranque, y la reconstrucción comentada.

El snapshot hace barata la carga, pero el stream sigue creciendo. `SELECT length(data::text) FROM mt_doc_empresa WHERE id = 'emp-60';` da unos 300.000 bytes, casi todos referencias de pago. Marten reescribe ese documento con cada hecho nuevo, y la reconstrucción rejuega el stream entero. Cuando un stream pasa de cierto largo, la pregunta cambia: ¿la regla necesita toda esa historia?

- **Acortar: el mismo agregado, en tramos.** Al cerrar el mes, un hecho de cierre lleva el saldo, y el mes siguiente abre su propio stream. Es el caso de emp-60: su guarda de pagos solo necesita un tramo, porque un banco no repite avisos de hace un año.
- **Partir: lo que se valida solo es su propio agregado.** Ya lo hiciste en [El proceso tiene dueño](./el-proceso-tiene-dueno.md): cada suspensión vive en su stream (`susp-emp-60-20003`), no en el de la empresa. En la organización, un plan de cuentas guarda miles de cuentas en un solo stream, y cada cuenta se valida sola. Si la regla mira todo a la vez, como el "sin ciclos" de tu `GrupoEmpresarial` en [El árbol de empresas](./el-arbol-de-empresas.md), no se parte: el stream se queda entero, y si lo llevas a Marten, un snapshot lo sostiene.
- **El umbral.** Ponle un umbral a tu consulta (1) para saber cuándo decidir: `SELECT id, version FROM mt_streams WHERE version > 1000;`. El 1.000 es decisión tuya, como el 10 del rezago. Cada stream que aparece pide una de las tres salidas: snapshot, acortar o partir. Para que el servicio avise solo, conviértela en un health check como tu `RezagoDelDaemon`: la misma consulta, un umbral declarado y `Degraded`.

Para leer por id lo que muestra una pantalla, el snapshot no es la herramienta: guarda el estado con que la empresa decide, con sus 300 KB de referencias. Una vista `Inline` hecha para esa lectura, como tu `EmpresaDetalle`, responde sin rehidratar, y la pantalla no depende del agregado.

## El Descubrimiento

Rehidratar cuesta lo que mide el stream. Un **snapshot `Inline`** guarda el agregado ya calculado en la misma transacción de cada hecho, y **`FetchLatest`** lo lee: la carga deja de depender del largo. Para decidir, `Inline` y no `Async`: un snapshot atrasado decide sobre algo viejo, o rejuega los hechos que le faltan. El snapshot es derivado, como toda vista: si sale mal, se rehace desde el diario. Y tiene un precio: tu `Empresa` ahora sabe que se guarda como JSON. Lo pagas visible: el atributo va junto al campo que protege. Un snapshot hace barato un stream largo, pero no lo hace corto: cuando pasa tu umbral, decides si acortarlo o partirlo.

> 🌱 Hoy dejaste una línea que carga peso sin que se note: el `readonly` que le quitaste al `HashSet`. Ponerlo de vuelta compila, tu editor lo sugiere, y deja entrar un pago doble sin un error. La próxima sección protege líneas así con un comentario que nombra el síntoma y con un test que se pone rojo: [El comentario que sobrevive](./el-comentario-que-sobrevive.md).

## ✅ Compruébalo

- [ ] Mides la carga de una empresa: con `AggregateStreamAsync`, emp-60 tarda más de cien veces lo que emp-177.
- [ ] Con el snapshot `Inline` y `FetchLatest`, emp-60 carga en pocos milisegundos, con su versión y su nombre, y `mt_doc_empresa` tiene su documento con el `mt_version` de su stream.
- [ ] El mismo aviso del banco, dos veces, deja un solo `PagoRegistrado`, y el segundo responde sin rehidratar.
- [ ] Sabes por qué el snapshot de quien decide es `Inline`: con `Async`, `LoadAsync` decide sobre algo atrasado, y `FetchLatest` rejuega los pendientes.
- [ ] Sabes qué necesita el documento para releerse (`[JsonInclude]` sin `readonly`, la `Version` por `Metadata`), y que un documento mal guardado se rehace con la reconstrucción.
- [ ] Ante un stream que pasa tu umbral, sabes elegir entre snapshot, acortar y partir.

## 🆘 Si algo salió mal

- **`ArgumentNullException: Value cannot be null. (Parameter 'key')` al guardar un hecho:** el documento se releyó sin `Id`. Falta el `[JsonInclude]` en el `Id` de tu `Empresa`.
- **`NullReferenceException` en `Medir`, o tu handler responde `No existe la empresa`:** ese stream no tiene documento. Corre la reconstrucción.
- **La versión sale `0`, el `SuspenderHandler` arma un `susp-…-1`, o un pago o un cambio de plan responden 409:** falta la línea de `Metadata` de `Empresa`, y la versión esperada choca con la del stream.
- **`FetchLatest` no compila:** vive en `session.Events` de una `IDocumentSession`; una `IQuerySession` no lo tiene.
- **El mismo aviso del banco entra dos veces con el snapshot puesto:** tu `HashSet` sigue `readonly`, o le falta `[JsonInclude]`. Corrígelo y corre otra vez la reconstrucción.
- **`ExistingStreamIdCollisionException` al arrancar:** te faltó quitar la siembra de emp-60.
- **`DefaultTenantUsageDisabledException` en la siembra o en `Medir`:** la sesión va con su tenant: `store.LightweightSession("acme")`.

## 📓 Registra tu avance

En tu `DECISIONES.md`, deja la decisión de hoy:

> La `Empresa` se carga para decidir con `FetchLatest`, sobre un snapshot `Inline`: un `Async` leído con `LoadAsync` decide atrasado, y con `FetchLatest` rejuega los pendientes. El documento se relee entero (`[JsonInclude]` sin `readonly`, la `Version` por `Metadata`), y si sale mal se reconstruye desde el diario. Un stream de más de 1.000 hechos pide una decisión: snapshot, acortar o partir.

> 💭 **Reto:** `FetchLatest` y `AggregateStreamAsync` devuelven la misma empresa: ¿por qué tus handlers usan la primera? ¿Por qué el snapshot de quien decide es `Inline` y no `Async`? Y ante un stream que no para de crecer, ¿cuándo te basta el snapshot, y cuándo lo acortas o lo partes?

```bash
git add .
git commit -m "ES · El stream que no para de crecer (snapshot Inline + FetchLatest + acortar o partir)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Rehidratar cuesta lo que mide el stream; un snapshot `Inline`, leído con `FetchLatest`, mantiene el agregado al día con cada hecho, en la misma transacción, si el documento se relee entero. El snapshot no acorta el stream: cuando un stream pasa tu umbral, decides si acortarlo o partirlo.

---

[⬅️ Volver: Que el servicio avise](./que-el-servicio-avise.md)

[➡️ Siguiente: El comentario que sobrevive](./el-comentario-que-sobrevive.md)
