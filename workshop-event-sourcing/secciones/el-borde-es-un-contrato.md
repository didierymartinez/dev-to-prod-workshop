# El borde es un contrato

Tu servicio ya dice cuánto sabe cuando responde bien. Ahora mira qué responde cuando algo sale mal, y qué forma tiene lo que entrega.

## 🎯 El Objetivo

Que un alta con un NIT repetido le diga al cliente «ya existe», con un código que su pantalla sepa tratar y sin contarle nada de tu base. Y que, por HTTP, la historia de una empresa no cambie cuando renombras un hecho.

## 💥 El dolor: un 500 que lo cuenta todo, o nada

Arranca tu servicio en `Development`, con tus user-secrets: `ASPNETCORE_ENVIRONMENT=Development dotnet run`, como en [La configuración viene de afuera](./la-configuracion-viene-de-afuera.md). Da de alta emp-90. Luego da de alta emp-91 con el mismo NIT, como lo haría una pantalla con un error de digitación:

```bash
curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-90","nit":"909000000","nombre":"Empresa 90","plan":"Basico"}'
curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-91","nit":"909000000","nombre":"Empresa 91","plan":"Basico"}'
# HTTP/1.1 202 Accepted
# HTTP/1.1 500 Internal Server Error
# JasperFx.DocumentAlreadyExistsException: Document already exists Localizador: 909000000
#    at Marten.Internal.Sessions.AutoClosingLifetime.ExecuteBatchPagesAsync(…)
#    … y unas treinta líneas más
```

Tu localizador hizo su trabajo: emp-91 no entró. Pero un 500 dice «falló el servidor», y aquí el error es del pedido. El cuerpo es el stack de tu servidor: en `Development`, ASP.NET pone por su cuenta una página de errores para desarrolladores. La pantalla de soporte trata así lo que le responden: si falló el servidor, reintenta; si el error es del pedido, para y avisa. En bash:

```bash
for i in 1 2 3; do c=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-91","nit":"909000000","nombre":"Empresa 91","plan":"Basico"}'); echo "intento $i: $c"; [ "$c" -lt 500 ] && break; sleep 1; done
# intento 1: 500
# intento 2: 500
# intento 3: 500
```

Tres intentos que nunca iban a servir: lo que hay que cambiar es el NIT. Detén el servicio y arráncalo en `Production`, con tu directorio de secretos: `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run`. Repite el alta de emp-91: 500, sin cuerpo. En la organización, un servicio ya traduce el id repetido a 409, y otro tiene un test que exige el 409 y no el 500.

## 🔧 Paso 1 · El conflicto responde 409

> 🆕 **Un error con forma.** `409 Conflict` dice que el pedido choca con el estado actual: antes de repetirlo, el cliente tiene que mirar qué hay. `500` dice que falló el servidor, y reintentar quizá sirve. `builder.Services.AddProblemDetails()` registra un cuerpo de error en JSON con el formato estándar *ProblemDetails*: `type`, `title`, `status` y un `traceId`, el id de esa petición, para que el cliente lo cite. Sin él, `UseExceptionHandler` no tiene con qué escribir ese cuerpo. `app.UseExceptionHandler(new ExceptionHandlerOptions { StatusCodeSelector = ex => … })` atrapa la excepción que escapa de un endpoint, la escribe en el log y responde ese cuerpo, con el código que tu función elige para esa excepción.

> 🛠️ **Inténtalo tú.** Quiero que las dos altas repetidas contesten así, en los dos entornos:
>
> ```
> POST /empresas  (emp-91, con el NIT de emp-90)        →  409  {"type":"…","title":"Conflict","status":409,"traceId":"00-…-00"}
> POST /empresas  (emp-90 otra vez, con NIT 909000009)  →  409
> ```
>
> Haz que funcione: (1) Registra `AddProblemDetails` junto a tus otros servicios. (2) Pon `UseExceptionHandler` después de `var app = builder.Build();`. (3) Que tu función devuelva 409 para las dos excepciones de un alta repetida, y 500 para cualquier otra. El NIT repetido lanza `JasperFx.DocumentAlreadyExistsException`, desde tu localizador. El id repetido lanza `Marten.Exceptions.ExistingStreamIdCollisionException`, desde `StartStream`. `InvokeAsync` relanza en tu endpoint la excepción del handler, sin envolverla. `StatusCodes.Status409Conflict` y `StatusCodes.Status500InternalServerError` ya tienen nombre.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, junto a tus otros servicios
builder.Services.AddProblemDetails();

// después de var app = builder.Build();
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = ex =>
        ex is JasperFx.DocumentAlreadyExistsException                   // el NIT ya está en el localizador
        || ex is Marten.Exceptions.ExistingStreamIdCollisionException   // el id ya tiene su stream
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status500InternalServerError,                 // lo demás es una falla del servidor
});
```

</details>

En `Development` ya no ves el stack en la respuesta: tu `UseExceptionHandler` atrapa la excepción antes que la página de errores. El stack sigue en el log, en la línea `fail: Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware[1]`. Corre otra vez la pantalla: `intento 1: 409`, y para.

**El otro conflicto.** En [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md), los pares de pagos con la misma llave no dejaron ningún pago repetido: el segundo de cada par choca, y tu política de `ConcurrencyException` lo reintenta. Si el choque sigue tras los reintentos, también es un conflicto: otro escribió primero. Para verlo, comenta un momento tu política de `ConcurrencyException`, da de alta emp-92 con el NIT 909200000 y manda treinta pares:

```bash
for k in $(seq 1 30); do for i in 1 2; do curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/empresas/emp-92/pagos?monto=100" -H "Idempotency-Key: c-$k" & done; wait; done | sort | uniq -c
#   30 200
#   30 500
```

Los que chocan responden 500. Agrega `|| ex is JasperFx.ConcurrencyException` a tu 409 y repite, con llaves `d-$k`: ahora responden 409, y ninguno 500. La cuenta puede variar. Para la pantalla, este 409 no es un «no»: el pago entró, por el otro pedido del par. Repetido con su llave, responde 200, y `YaRegistro` no lo registra dos veces. Vuelve a poner la política. Un `try`/`catch` en el alta también daría 409, pero solo ahí: este choque sale del endpoint de pagos. Una sola función cubre todos tus endpoints.

## 🔨 Rómpelo: el detalle que se escapa · no lo saltes

[El contexto que falta](./el-contexto-que-falta.md) parte de lo que dejas aquí: tu frase en el 409, «Ya existe una empresa con ese NIT.», y el detalle de la excepción solo en `Development`.

El 409 dice `Conflict`, y la pantalla quiere mostrar por qué. Lo más corto es mandarle el mensaje de la excepción. Así lo hace un servicio de la organización con todos sus errores. `CustomizeProblemDetails` corre antes de escribir cada cuerpo de error, y `c.Exception` es la excepción que atrapó tu `UseExceptionHandler`:

```csharp
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c => c.ProblemDetails.Detail = c.Exception?.Message);
```

Arranca en `Production` y repite las dos altas:

```
{"type":"…","title":"Conflict","status":409,"detail":"Document already exists Localizador: 909000000","traceId":"…"}
{"type":"…","title":"Conflict","status":409,"detail":"Stream #emp-90 already exists in the database. StartStream requires a new id; to add events to an existing stream use Append (which starts the stream if missing) or FetchForWriting, …","traceId":"…"}
```

Cualquier cliente aprende qué librería usas, cómo se llama tu documento interno y qué métodos tiene tu código. En aquel servicio, la misma línea le entrega a cualquier cliente las cadenas de conexión de Npgsql. El detalle es para ti, y ya está en el log: déjalo solo en `Development`. Para el usuario, escribe tú la frase. `builder.Environment` es el mismo `app.Environment`, antes de `Build()`:

```csharp
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
{
    if (c.Exception is JasperFx.DocumentAlreadyExistsException)
        c.ProblemDetails.Detail = "Ya existe una empresa con ese NIT.";   // tu frase, para quien usa la pantalla
    else if (builder.Environment.IsDevelopment())
        c.ProblemDetails.Detail = c.Exception?.Message;                   // en tu máquina, el detalle te ayuda; en un despliegue, se queda en el log
});
```

Repite en los dos entornos. El NIT repetido trae tu frase en los dos. El id repetido trae el mensaje de Marten en `Development`, y en `Production`, ningún `detail`.

## 🔧 Paso 2 · La historia sale por su propio contrato

Soporte quiere ver la historia de una empresa. Agrega el endpoint, que entrega los hechos tal cual. `FetchStreamAsync`, el de [El tablero cruza streams](./el-tablero-cruza-streams.md), trae cada hecho en su sobre `IEvent`, con su `Version`, su clase (`EventType`) y el hecho (`Data`):

```csharp
app.MapGet("/empresas/{id}/historia", async (string id, IQuerySession session) =>
    (await session.Events.FetchStreamAsync(id)).Select(e => new { e.Version, Tipo = e.EventType.Name, e.Data }));
```

Registra un pago de emp-90 y pide su historia. La pantalla de soporte cuenta los pagos con un `grep`:

```bash
curl -s -X POST "http://localhost:5000/empresas/emp-90/pagos?monto=50000" -H "Idempotency-Key: pago-90-1"
curl -s http://localhost:5000/empresas/emp-90/historia
# [{"version":1,"tipo":"EmpresaRegistrada","data":{"nit":"909000000",…}},{"version":2,"tipo":"PagoRegistrado","data":{"monto":50000,"referencia":"pago-90-1"}}]
curl -s http://localhost:5000/empresas/emp-90/historia | grep -o '"tipo":"PagoRegistrado"' | wc -l   # 1
```

**Renombra el hecho.** Desde [El swap por reconocimiento](./el-swap-por-reconocimiento.md) sabes renombrar un hecho sin romper el diario. Renombra `PagoRegistrado` a `PagoRecibido` con el IDE, y en `Hechos.Registrar` cambia su línea por `opts.Events.MapEventType<PagoRecibido>("pago_registrado");`. `dotnet test` pasa. Arranca y pide la historia: el pago sigue ahí, con su `data`, pero dice `"tipo":"PagoRecibido"`, y el `grep` de la pantalla cuenta 0. Nada avisó: el diario y tus tests leen el alias, y la pantalla lee el nombre de tu clase. Y `data` es la forma interna de tu hecho: el día que cambie, la pantalla recibe la forma nueva. Un servicio de la organización entrega así la historia de sus terceros, con el nombre de la clase, y otro entrega el `Data` crudo de sus hechos: cualquier refactor rompe a sus clientes.

> 🛠️ **Inténtalo tú.** Quiero que la historia salga así, y que un renombre no la cambie:
>
> ```
> GET /empresas/emp-90/historia   →  [{"version":1,"tipo":"empresa_registrada","cuando":"2026-10-17T…","plan":"Basico","motivo":null,"monto":null},
>                                     {"version":2,"tipo":"pago_registrado","cuando":"…","plan":null,"motivo":null,"monto":50000}]
> GET /empresas/emp-999/historia  →  404
> ```
>
> Haz que funcione en lugar de tu endpoint crudo, con `PagoRecibido` todavía en su lugar: (1) Declara un `record HechoDeLaHistoria` con los campos del ejemplo: lo que el cliente ve de cada hecho. No lleva el NIT ni la referencia del pago: lo que no sale, ningún cliente llega a usarlo. (2) El `Tipo` es el alias del diario, `e.EventTypeName`, que no cambia cuando renombras la clase. `Cuando` es el `Timestamp` del sobre. (3) Para elegir por el tipo del hecho sirve un `switch` que devuelve un valor: `e.Data switch { PagoRecibido h => …, _ => … }`. Es la forma corta del `switch` de tu `Aplicar` de [Refactorizando el motor](./refactorizando-el-motor.md), y `_` es la rama de cualquier otro. Cada rama devuelve el mismo tipo, tu `HechoDeLaHistoria`: tu contrato, escrito en una línea. Llena el plan de `EmpresaRegistrada` y de `PlanCambiado`, el motivo de `EmpresaSuspendida` y el monto del pago; los demás hechos salen solo con su tipo. (4) Si el stream no tiene hechos, 404.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia, junto a tus comandos: el contrato de la historia, aparte de tus hechos
public record HechoDeLaHistoria(long Version, string Tipo, DateTimeOffset Cuando, string? Plan, string? Motivo, int? Monto);

// Empresas.Historia/Program.cs
app.MapGet("/empresas/{id}/historia", async (string id, IQuerySession session) =>
{
    var hechos = await session.Events.FetchStreamAsync(id);
    if (hechos.Count == 0) return Results.NotFound();
    return Results.Ok(hechos.Select(e => e.Data switch
    {
        EmpresaRegistrada h => new HechoDeLaHistoria(e.Version, e.EventTypeName, e.Timestamp, h.Plan, null, null),
        PlanCambiado h      => new HechoDeLaHistoria(e.Version, e.EventTypeName, e.Timestamp, h.NuevoPlan, null, null),
        EmpresaSuspendida h => new HechoDeLaHistoria(e.Version, e.EventTypeName, e.Timestamp, null, h.Motivo, null),
        PagoRecibido h      => new HechoDeLaHistoria(e.Version, e.EventTypeName, e.Timestamp, null, null, h.Monto),
        _                   => new HechoDeLaHistoria(e.Version, e.EventTypeName, e.Timestamp, null, null, null),
    }));
});
```

</details>

Ahora deshaz el renombre: vuelve a `PagoRegistrado` y a su `AddEventType`. La historia sale igual, con `"tipo":"pago_registrado"`. Cambia el `grep` de la pantalla a ese tipo: cuenta 1. Pasar a `HechoDeLaHistoria` rompió a la pantalla una vez, hoy; desde aquí, ningún renombre la obliga. Tu hecho puede cambiar de nombre, o de forma con su upcaster; el cliente solo ve `HechoDeLaHistoria`, y si su forma cambia, lo decides tú, en un solo lugar.

## El Descubrimiento

Lo que sale por HTTP es un contrato, también cuando algo sale mal. Un error tiene forma: un *ProblemDetails*, con 409 cuando el pedido choca con lo que ya hay y 500 cuando falla el servidor. El cliente recibe el código y el `traceId`; el detalle de la excepción va al log, y a la respuesta solo en `Development`. Y lo que entregas de tu diario sale por un tipo tuyo, con el alias del hecho y los campos que elegiste: es la lección de [El evento público](./el-evento-publico.md), en HTTP.

> 🌱 Tu 409 trae un `traceId`. Cuando un cliente te lo mande, búscalo en tu log: no está. Y si el pedido terminó bien pero el resultado no es el que el cliente esperaba, la respuesta no le dio ningún id. Seguir un pedido por tus handlers, por Facturación y por Accesos es [Seguir una acción](./seguir-una-accion.md).

## ✅ Compruébalo

- [ ] Antes de la cura, un NIT repetido respondió 500: con el stack en `Development` y sin cuerpo en `Production`, y la pantalla reintentó tres veces.
- [ ] Un NIT o un id repetidos responden 409 con un ProblemDetails, y un choque que sigue tras los reintentos, también.
- [ ] El NIT repetido trae tu frase. Otro error no trae `detail` en `Production`, y en `Development` trae el mensaje de la excepción.
- [ ] Con la clase del hecho renombrada, la historia cruda cambió su `tipo`; la historia con `HechoDeLaHistoria` no cambió.
- [ ] `GET /empresas/emp-999/historia` responde 404.

## 🆘 Si algo salió mal

- **El alta repetida sigue en 500:** `UseExceptionHandler` va después de `builder.Build()`, y la línea `fail: Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware[1]` del log dice qué excepción llegó. Compárala con las de tu función.
- **`UseExceptionHandler` lanza al arrancar:** falta `builder.Services.AddProblemDetails();`.
- **El 409 no trae `detail` en `Development`:** el servicio corre en `Production`. Mira `Hosting environment` en el log.
- **La historia no compila tras deshacer el renombre:** el `switch` todavía dice `PagoRecibido`. El IDE lo renombra con todo lo demás.

## 📓 Registra tu avance

Deja la regla en tu `DECISIONES.md`:

> Todo error sale como ProblemDetails. Un pedido que choca con el estado actual (un NIT o un id repetidos, un choque de concurrencia que sigue tras los reintentos) responde 409; lo demás, 500. El detalle de la excepción va al log, y a la respuesta solo en `Development`; para el usuario, una frase escrita por ti. Lo que se entrega del diario sale por un tipo propio, con el alias del hecho.

> 💭 **Reto:** ¿qué hace distinto la pantalla con un 409 y con un 500? ¿Por qué la historia cruda se rompió con un renombre que el diario y tus tests aguantaron?

```bash
git add .
git commit -m "ES · El borde es un contrato" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Lo que cruza el borde HTTP es un contrato: un conflicto responde 409 con un ProblemDetails que no cuenta nada de tu base, el detalle se queda en el log, y la historia sale por un tipo propio con el alias del hecho, que no cambia cuando cambia tu clase.

---

[⬅️ Volver: La respuesta dice cuánto sabe](./la-respuesta-dice-cuanto-sabe.md)

[➡️ Siguiente: Seguir una acción](./seguir-una-accion.md)
