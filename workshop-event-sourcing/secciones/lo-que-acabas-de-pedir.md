# Lo que acabas de pedir

Tu servicio arranca con la configuración que le llega de afuera. Ahora mira lo que le contesta a quien le pide algo por HTTP.

## 🎯 El Objetivo

Que quien da de alta o suspende una empresa por HTTP sepa dónde seguir su pedido. Que quien lee enseguida una empresa que ya está en el diario reciba «todavía no», y no «no existe». Y que repetir un pago, por si no llegó, no lo registre dos veces.

## 💥 El dolor: «todavía no» y «no existe» dan el mismo 404

Soporte da de alta las empresas desde su pantalla, y la pantalla abre la ficha en cuanto termina el alta. La ficha lleva en qué va la suspensión, y eso solo lo junta el tablero. Agrega a tu `Program.cs` los dos endpoints que usa, y reinicia tu servicio como lo dejaste en [La configuración viene de afuera](./la-configuracion-viene-de-afuera.md). Un parámetro de tipo `record`, como `RegistrarEmpresa`, se lee del cuerpo JSON de la petición.

```csharp
// Empresas.Historia/Program.cs, junto a tus otros endpoints
app.MapPost("/empresas", async (RegistrarEmpresa cmd, IMessageBus bus) =>
{
    await bus.InvokeAsync(cmd);   // tu RegistrarEmpresaHandler, el de La réplica suscrita
    return Results.Ok();
});

app.MapGet("/empresas/{id}", async (string id, IQuerySession session) =>
{
    var ficha = await session.LoadAsync<Tablero>(id);   // la fila del tablero de esa empresa
    return ficha is null ? Results.NotFound() : Results.Ok(ficha);
});
```

Da de alta emp-76 y pide su ficha enseguida, en la misma línea. Luego pide una que no existe:

```bash
curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-76","nit":"907600000","nombre":"Empresa 76","plan":"Basico"}'; curl -i http://localhost:5000/empresas/emp-76
# HTTP/1.1 200 OK            ← el alta
# HTTP/1.1 404 Not Found     ← la ficha
curl -i http://localhost:5000/empresas/emp-999
# HTTP/1.1 404 Not Found
```

Pídela otra vez un segundo después: sale con 200. emp-76 existía desde que el POST respondió: su `empresa_registrada` ya estaba en el diario. La ficha sale del tablero, que es `Async`, y el daemon todavía no la había proyectado. Para la pantalla, «todavía no» y «no existe» son el mismo 404, y no sabe si esperar o rendirse. Y el 200 del POST no le dice dónde mirar. En la consola de la organización pasa igual: su pantalla hace el POST, pide enseguida el GET y recibe 404.

## 🔧 Paso 1 · El POST dice dónde mirar

> 🆕 **`202` y `Location`.** `Results.Accepted(ruta)` responde `202 Accepted`: el pedido se aceptó, y su resultado todavía no está listo. Y pone el header `Location` con la ruta donde el cliente lo sigue. Un `201 Created` diría que el resultado ya está en esa ruta, y con una vista `Async` todavía no lo está. La pantalla podría armar la ruta, porque eligió el id; con `Location` no necesita saber cómo armas tus rutas.

> 🛠️ **Inténtalo tú.** Quiero que tus dos POST contesten así:
>
> ```
> POST /empresas  (emp-77)          →  HTTP/1.1 202 Accepted    Location: /empresas/emp-77
> POST /empresas/emp-77/suspender   →  HTTP/1.1 202 Accepted    Location: /empresas/emp-77
> ```
>
> Haz que funcione en el alta y en tu endpoint de suspender. La suspensión se sigue en la misma ficha: el tablero dice en qué va.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en el alta
return Results.Accepted($"/empresas/{cmd.EmpresaId}");

// en suspender
return Results.Accepted($"/empresas/{id}");
```

```bash
curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-77","nit":"907700000","nombre":"Empresa 77","plan":"Basico"}'
curl -i -X POST http://localhost:5000/empresas/emp-77/suspender
```

</details>

## 🔧 Paso 2 · La ficha distingue «todavía no» de «no existe»

> 🆕 **El diario sabe si existe.** `session.Events.FetchStreamStateAsync(id)` lee del diario la versión de un stream y cuándo nació, sin cargar sus hechos. Devuelve `null` si el stream no existe. El diario no va atrás: lo que el POST escribió ya está ahí cuando respondió.

> 🛠️ **Inténtalo tú.** Quiero que la ficha conteste así:
>
> ```
> POST /empresas (emp-78); GET /empresas/emp-78   →  HTTP/1.1 202 Accepted   {"id":"emp-78","estado":"en proceso"}
> GET /empresas/emp-999                           →  HTTP/1.1 404 Not Found
> GET /empresas/emp-78   (un segundo después)     →  HTTP/1.1 200 OK         {"id":"emp-78", … ,"estado":"activa"}
> ```
>
> Haz que funcione en tu `GET /empresas/{id}`. Si el tablero tiene la ficha, 200 con ella. Si no, pregúntale al diario: si el stream existe, 202 con el estado `en proceso`, que le dice «vuelve a pedir»; si no, 404. `Results.Accepted(value: …)` responde 202 con un cuerpo y sin `Location`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
app.MapGet("/empresas/{id}", async (string id, IQuerySession session) =>
{
    var ficha = await session.LoadAsync<Tablero>(id);
    if (ficha is not null) return Results.Ok(ficha);                     // la vista ya la tiene
    var stream = await session.Events.FetchStreamStateAsync(id);         // ¿existe? lo dice el diario
    return stream is null
        ? Results.NotFound()
        : Results.Accepted(value: new { Id = id, Estado = "en proceso" });   // existe, y la vista no ha llegado
});
```

</details>

La existencia la dice el diario; la vista responde lo que ya proyectó. `EmpresaDetalle`, que es `Inline`, también es una vista: mientras la rearmas, sale vacía. Lo mismo vale para decidir. Si tu POST de suspender le preguntara al tablero si la empresa existe, le diría 404 a quien acaba de darla de alta. Un servicio de la organización revisa así, contra una vista `Async`, quién es el dueño de una conversación: el dueño de verdad recibe 404 mientras el daemon alcanza.

## 🔨 Rómpelo: esperar al diario

Parece prudente esperar un poco antes de un 404. En tu GET, envuelve la lectura del diario en dos reintentos, a los 150 y a los 350 ms:

```csharp
var stream = await session.Events.FetchStreamStateAsync(id);
foreach (var espera in new[] { 150, 350 })
{
    if (stream is not null) break;
    await Task.Delay(espera);
    stream = await session.Events.FetchStreamStateAsync(id);
}
```

Pide una empresa que no existe y mide cuánto tarda:

```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:5000/empresas/emp-999
# antes:  404 0.003
# ahora:  404 0.51
```

El 404 tarda medio segundo más, y no cambia. Lo que no está en el diario no va a llegar en 350 ms. La espera solo sirve para la vista, y la hace el cliente: tras un 202, vuelve a pedir. Si la hiciera tu servidor, cada pantalla que espera le ocuparía una conexión. El asistente de la organización espera así al leer su diario, y su propio contador dice que el reintento casi nunca encuentra nada. Quita los reintentos.

## 🔧 Paso 3 · El reintento lleva su llave

La pantalla de soporte también registra los pagos que llegan por ventanilla. Si la respuesta tarda y la conexión se corta, la pantalla no sabe si el pago entró, y lo manda otra vez. Agrega el endpoint, con una referencia nueva en cada petición. El `int monto` se lee de la URL: `?monto=50000`.

```csharp
app.MapPost("/empresas/{id}/pagos", async (string id, int monto, IMessageBus bus) =>
{
    await bus.InvokeAsync(new RegistrarPago(id, Guid.NewGuid().ToString(), monto));   // una referencia nueva por petición
    return Results.Ok();
});
```

Manda el mismo pago dos veces, como la pantalla que reintenta, y mira el diario:

```bash
curl -i -X POST "http://localhost:5000/empresas/emp-77/pagos?monto=50000"     # dos veces
```

```sql
SELECT data->>'Referencia' FROM mt_events WHERE stream_id = 'emp-77' AND type = 'pago_registrado';
-- 1b50dcfa-…
-- ee8beddb-…
```

Dos pagos. Tu `RegistrarPagoHandler` ignora una referencia repetida, desde [Llegó dos veces](./llego-dos-veces.md), pero cada petición trae una nueva. El servidor no puede saber que la segunda repite la primera: solo el cliente lo sabe.

> 🆕 **`Idempotency-Key`.** Es un header que el cliente inventa una vez por pago, y repite en cada reintento de ese pago. En la lambda, un parámetro `[FromHeader(Name = "Idempotency-Key")] string? llave` lo lee. `FromHeader` viene de `using Microsoft.AspNetCore.Mvc;`.

> 🛠️ **Inténtalo tú.** Quiero que el reintento no pague otra vez:
>
> ```
> POST /empresas/emp-78/pagos?monto=50000   Idempotency-Key: pago-78-1   →  200
> POST /empresas/emp-78/pagos?monto=50000   Idempotency-Key: pago-78-1   →  200   (un solo pago_registrado, con Referencia pago-78-1)
> POST /empresas/emp-78/pagos?monto=50000   (sin la llave)               →  400
> ```
>
> Haz que funcione: la llave es la referencia del pago. Sin llave, el endpoint no inventa una: responde `Results.BadRequest("Falta el header Idempotency-Key.")`. Con llave, responde `Results.Ok()`: el pago ya está en el diario al responder, y ninguna vista lo sigue.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
app.MapPost("/empresas/{id}/pagos", async (string id, int monto, [FromHeader(Name = "Idempotency-Key")] string? llave, IMessageBus bus) =>
{
    if (string.IsNullOrWhiteSpace(llave)) return Results.BadRequest("Falta el header Idempotency-Key.");
    await bus.InvokeAsync(new RegistrarPago(id, llave, monto));   // la llave del cliente es la referencia
    return Results.Ok();
});
```

```bash
curl -i -X POST "http://localhost:5000/empresas/emp-78/pagos?monto=50000" -H "Idempotency-Key: pago-78-1"
```

</details>

**Dos a la vez:** si la conexión se corta mientras el primer pedido sigue adentro, el reintento llega a la vez. Manda cincuenta pares simultáneos, cada par con su llave, y busca llaves con dos pagos:

```bash
for k in $(seq 1 50); do for i in 1 2; do curl -s -o /dev/null -X POST "http://localhost:5000/empresas/emp-78/pagos?monto=100" -H "Idempotency-Key: par-$k" & done; wait; done
```

```sql
SELECT data->>'Referencia', count(*) FROM mt_events WHERE stream_id = 'emp-78' AND data->>'Referencia' LIKE 'par-%' GROUP BY 1 HAVING count(*) > 1;
```

Suele salir alguna, como `par-8 | 2`. Si no sale ninguna, corre el bucle otra vez, con llaves `par2-$k`. Los dos pedidos cargaron la empresa antes de que el otro guardara, y los dos pasaron `YaRegistro`. Dale a tu `Append` la versión esperada de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), `empresa.Version + 1`: el segundo choca, tu política de `ConcurrencyException` lo reintenta, y `YaRegistro` lo detiene. Repite con llaves `otra-$k`: ninguna sale dos veces.

Tus POST esperan al handler con `InvokeAsync`, y está bien: el handler es corto. Anota el hecho y deja en la cola lo que pide a los socios, en la misma transacción. Si el trabajo largo corriera dentro de la petición, la conexión quedaría abierta minutos, y cada reintento lo correría otra vez. En la organización, un endpoint corre así un OCR y dos llamadas a un modelo de lenguaje. Lo largo va a la cola.

## El Descubrimiento

Un pedido por HTTP se contesta con lo que de verdad pasó: `202` y `Location` dicen «lo recibí, y aquí lo sigues». La lectura distingue «todavía no» de «no existe» preguntándole al diario, que nunca va atrás. La vista responde lo que ya proyectó, y esperar solo sirve para ella. Y como el cliente no sabe si su pedido llegó, el reintento lleva una llave que él inventó: es la referencia de [Llegó dos veces](./llego-dos-veces.md), ahora en el borde HTTP.

> 🌱 Tu ficha ya no dice «no existe» por error. Pero cuando la tiene, la entrega con 200 aunque vaya atrás: justo después de suspender una empresa, todavía dice `activa`. Que la respuesta diga cuán al día está, y si un listado está completo, es [La respuesta dice cuánto sabe](./la-respuesta-dice-cuanto-sabe.md).

## ✅ Compruébalo

- [ ] Con la ficha leída solo del tablero, una empresa recién dada de alta y una que no existe dieron el mismo 404.
- [ ] El alta y la suspensión responden `202 Accepted` con `Location: /empresas/{id}`.
- [ ] La ficha responde 202 `en proceso` si la empresa está en el diario y no en el tablero, y 404 solo si no está en el diario.
- [ ] Con reintentos sobre el diario, el 404 tardó medio segundo más y no cambió.
- [ ] El mismo pago, mandado dos veces con la misma `Idempotency-Key`, deja un solo `pago_registrado`, también si llegan a la vez; sin la llave, 400.

## 🆘 Si algo salió mal

- **El alta responde `415 Unsupported Media Type`:** falta `-H "Content-Type: application/json"` en el `curl`.
- **El alta responde 500:** esa empresa o su NIT ya existen. Usa otra.
- **La ficha responde 202 y nunca 200:** el daemon no proyecta el tablero. Revisa en el log `Started projection agent Tablero:All`.
- **La primera ficha no da 404 en el dolor:** el daemon alcanzó antes de tu GET. Manda los dos `curl` en la misma línea, separados por `;`.
- **En PowerShell, el alta responde 400:** usa `curl.exe` y escapa las comillas del JSON: `-d '{\"empresaId\":\"emp-76\", …}'`.
- **`FromHeader` no compila:** falta `using Microsoft.AspNetCore.Mvc;` en tu `Program.cs`.

## 📓 Registra tu avance

Deja la regla en tu `DECISIONES.md`:

> Un POST que no deja el resultado listo responde `202` con `Location`. Una lectura que la vista aún no tiene pregunta al diario: si el stream existe, «en proceso»; si no, 404. Al diario no se le espera. Un pedido que no es idempotente por sí solo lleva la `Idempotency-Key` del cliente.

> 💭 **Reto:** ¿por qué el diario puede contestar «existe» y el tablero todavía no? ¿Por qué la llave del pago la inventa el cliente y no el servidor?

```bash
git add .
git commit -m "ES · Lo que acabas de pedir" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un pedido cuyo resultado sale de una vista responde `202` con `Location`; la lectura pregunta al diario para distinguir «todavía no» de «no existe», sin esperarlo; y el reintento del cliente lleva su `Idempotency-Key`, que el servidor usa como la referencia del acto.

---

[⬅️ Volver: La configuración viene de afuera](./la-configuracion-viene-de-afuera.md)

[➡️ Siguiente: La respuesta dice cuánto sabe](./la-respuesta-dice-cuanto-sabe.md)
