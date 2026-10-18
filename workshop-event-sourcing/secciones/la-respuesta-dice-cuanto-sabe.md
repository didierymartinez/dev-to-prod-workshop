# La respuesta dice cuánto sabe

Tu ficha ya distingue «todavía no» de «no existe». Cuando sí tiene la empresa, la entrega tal como está.

## 🎯 El Objetivo

Que cada lectura de una vista diga cuántos hechos le faltan, para que nadie tome una ficha atrasada por la verdad. Y que un listado entregue una página de tamaño fijo y diga si hay más.

## 💥 El dolor: un 200 que va atrás

Da de alta emp-80 con tu `POST /empresas`, como emp-76 en [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md), y pide su ficha hasta que responda 200. Luego suspéndela y pide su ficha enseguida, en la misma línea:

```bash
curl -i -X POST http://localhost:5000/empresas/emp-80/suspender; curl -i http://localhost:5000/empresas/emp-80
# HTTP/1.1 202 Accepted
# HTTP/1.1 200 OK    {"id":"emp-80", … ,"suspension":null, … ,"estado":"activa"}
```

Un segundo después, la ficha dice `efectiva`. La primera respuesta fue un 200 con una empresa activa, y era falsa: el tablero todavía no había proyectado la suspensión. Nada en la respuesta lo decía. `GET /empresas/suspendidas` hace lo mismo: una lista sin emp-80, con 200. Un servicio de impuestos de la organización devuelve así el neto de un período: quien registra un movimiento y consulta enseguida recibe un total incompleto, con 200, sin ningún aviso.

## 🔧 Paso 1 · El rezago viaja en la respuesta

> 🆕 **Un header propio en la respuesta.** Un parámetro `HttpResponse respuesta` en la lambda te da la respuesta en curso, y `respuesta.Headers["X-Rezago"] = "2";` le agrega un header. Un header que empieza con `X-` es tuyo, no de HTTP: el cliente lo lee junto al cuerpo. Va en un header porque cada salida de la ficha (200, 202, 404) tiene otro cuerpo, y el header viaja igual en todas. El rezago ya lo mides desde [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md): high-water menos el progreso del shard de la vista.

> 🛠️ **Inténtalo tú.** Quiero que la ficha y el listado digan cuánto les falta:
>
> ```
> POST /empresas/emp-81/suspender; GET /empresas/emp-81   →  200   X-Rezago: 2   {… ,"estado":"activa"}   (dos: empresa_suspendida y suspension_solicitada)
> GET /empresas/emp-81   (un segundo después)              →  200   X-Rezago: 0   {… ,"estado":"efectiva"}
> GET /empresas/suspendidas                                →  200   X-Rezago: 0   [… ,"emp-81", …]
> ```
>
> emp-81 la das de alta como emp-80. Haz que funcione: (1) Escribe un método `Rezago(store, shard)` que devuelva cuántos hechos le faltan al shard que le nombras. (2) En la ficha, pon en `X-Rezago` el rezago de `Tablero:All`, en todas sus salidas: en el 404 sobra, porque lo decide el diario, pero ponerlo arriba evita repetirlo. (3) En el listado, pon el de `VistaSuspendida:All`. Los dos endpoints piden además el `IDocumentStore` y la `HttpResponse`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, entre tus endpoints, antes de app.Run(): cuántos hechos le faltan a una vista
static async Task<long> Rezago(IDocumentStore store, string shard)
{
    var stats = await store.Advanced.FetchEventStoreStatistics();      // .EventSequenceNumber = high-water
    var progreso = await store.Advanced.AllProjectionProgress();
    return stats.EventSequenceNumber - (progreso.FirstOrDefault(x => x.ShardName == shard)?.Sequence ?? 0);
}

app.MapGet("/empresas/{id}", async (string id, IQuerySession session, IDocumentStore store, HttpResponse respuesta) =>
{
    respuesta.Headers["X-Rezago"] = (await Rezago(store, "Tablero:All")).ToString();   // antes de responder, en las tres salidas
    // … la ficha, el diario y el 404, como antes …
});

app.MapGet("/empresas/suspendidas", async (IQuerySession session, IDocumentStore store, HttpResponse respuesta) =>
{
    respuesta.Headers["X-Rezago"] = (await Rezago(store, "VistaSuspendida:All")).ToString();
    return await session.Query<VistaSuspendida>().Where(v => v.Suspendida).Select(v => v.Id).ToListAsync();
});
```

</details>

Con `X-Rezago: 0`, la vista tiene todo lo que el diario tenía al responder. Con más de 0, la pantalla sabe que puede faltarle algo, y vuelve a pedir. Esta es la pantalla, en bash: lo intenta pocas veces, y si el rezago sigue, muestra la ficha con un aviso de que puede faltar lo último. Da de alta emp-82 como emp-80, y córrela en la misma línea que su suspensión:

```bash
curl -s -o /dev/null -X POST http://localhost:5000/empresas/emp-82/suspender; for i in 1 2 3 4 5; do r=$(curl -si http://localhost:5000/empresas/emp-82 | tr -d '\r' | awk -F': ' '/^X-Rezago/{print $2}'); echo "rezago $r"; [ "$r" = 0 ] && break; sleep 0.5; done
# rezago 2
# rezago 5
# rezago 0
```

El rezago puede subir antes de bajar: las respuestas de los socios también son hechos del diario. Una lista vacía con rezago 0 dice «no hay»; con rezago, dice «todavía no sé». El rezago es de toda la vista: también lo suben los hechos de otras empresas. A veces la pantalla vuelve a pedir sin necesidad; es el precio de una señal simple. Ningún servicio de la organización expone hoy el rezago de sus vistas.

## 🔨 Rómpelo: el cero que significa «todavía no»

Soporte quiere ver cuántas veces se ha suspendido cada empresa. `VistaSuspendida` ya lo cuenta en `Suspensiones`. Agrega el endpoint, con un cero cuando la vista no tiene el documento:

```csharp
app.MapGet("/empresas/{id}/suspensiones", async (string id, IQuerySession session) =>
    (await session.LoadAsync<VistaSuspendida>(id))?.Suspensiones ?? 0);   // sin documento, cero
```

Pide la cuenta de una empresa que no existe, y la de una que acabas de suspender. Da de alta emp-83, y cuando su ficha responda 200, suspéndela y pide su cuenta en la misma línea:

```bash
curl -s http://localhost:5000/empresas/emp-999/suspensiones                                                # 0
curl -s -o /dev/null -X POST http://localhost:5000/empresas/emp-83/suspender; curl -s http://localhost:5000/empresas/emp-83/suspensiones   # 0
```

emp-999 no existe, y el `?? 0` dice que nunca se suspendió. emp-83 sí se suspendió, y un segundo después dice 1: su 0 era un documento atrasado, sin ningún aviso. Haz que responda como tu ficha: con el `X-Rezago` de `VistaSuspendida:All`. Sin documento, que el diario decida entre 202 «en proceso» y 404.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
app.MapGet("/empresas/{id}/suspensiones", async (string id, IQuerySession session, IDocumentStore store, HttpResponse respuesta) =>
{
    respuesta.Headers["X-Rezago"] = (await Rezago(store, "VistaSuspendida:All")).ToString();   // un 0 o un 1 también pueden ir atrás
    var vista = await session.LoadAsync<VistaSuspendida>(id);
    if (vista is not null) return Results.Ok(vista.Suspensiones);
    return await session.Events.FetchStreamStateAsync(id) is null
        ? Results.NotFound()
        : Results.Accepted(value: new { Id = id, Estado = "en proceso" });
});
```

</details>

Repite con emp-84, dada de alta como emp-83: emp-999 responde 404, y la cuenta de emp-84 enseguida, 0 con `X-Rezago` mayor que 0.

## 🔧 Paso 2 · El listado tiene tope

`GET /empresas/suspendidas` devuelve todas las suspendidas, y hoy son unas quince. Un servicio de la organización tiene decenas de miles de registros por cliente, y su listado los carga todos en memoria para una sola respuesta. Siéntelo sin sembrar miles de empresas: pon antes de `app.Run()` estas veinte mil filas falsas, escritas directo en la vista, y arranca una vez. Con el servicio arriba, mide; quita el bloque antes del próximo arranque.

```csharp
// solo para medir: documentos falsos, que no salen del diario
await using (var s = app.Services.GetRequiredService<IDocumentStore>().LightweightSession())
{
    for (var i = 0; i < 20_000; i++) s.Store(new VistaSuspendida { Id = $"falsa-{i}", Suspendida = true });
    await s.SaveChangesAsync();
}
```

Mide el listado:

```bash
curl -s -o /dev/null -w "%{size_download} bytes\n" http://localhost:5000/empresas/suspendidas
# 269026 bytes
```

La respuesta crece con tus datos, no con lo que la pantalla muestra. Y la pantalla la vuelve a pedir cada vez que ve rezago.

> 🆕 **Una página con `ToPagedListAsync`.** `ToPagedListAsync(pagina, tamaño)`, de `using Marten.Pagination;`, trae solo esa página de la consulta. La lista que devuelve sabe además su número (`PageNumber`) y si hay otra página (`HasNextPage`). Una página necesita un orden fijo: sin `OrderBy`, la base puede devolver las filas en cualquier orden, y dos páginas pueden repetir filas. Y la página es por posición: si la vista cambia entre dos pedidos, una fila se repite o se salta. Para la pantalla de soporte, basta.

> 🛠️ **Inténtalo tú.** Quiero el listado así:
>
> ```
> GET /empresas/suspendidas            →  {"empresas":["emp-10","emp-12", … 50 en total],"pagina":1,"hayMas":true}
> GET /empresas/suspendidas?pagina=2   →  {"empresas":[…],"pagina":2,"hayMas":true}
> ```
>
> Haz que funcione: un parámetro `int? pagina` que llegue de la query, con 1 si no viene. Ordena por `Id` y trae una página de 50. El tamaño lo fija el servidor: un cliente que pudiera pedir cien mil volvería a traerlo todo. El listado deja de ser una lista sola: quien lo lee es tu propia pantalla, y cambia contigo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs (con using Marten.Pagination;)
app.MapGet("/empresas/suspendidas", async (int? pagina, IQuerySession session, IDocumentStore store, HttpResponse respuesta) =>
{
    respuesta.Headers["X-Rezago"] = (await Rezago(store, "VistaSuspendida:All")).ToString();
    var p = await session.Query<VistaSuspendida>()
        .Where(v => v.Suspendida)
        .OrderBy(v => v.Id)                          // un orden fijo, sobre la llave del documento
        .Select(v => v.Id)
        .ToPagedListAsync(pagina ?? 1, 50);          // el tamaño lo pone el servidor
    return new { Empresas = p, Pagina = p.PageNumber, HayMas = p.HasNextPage };
});
```

</details>

Ahora mide otra vez: unos 600 bytes, aunque la vista tenga veinte mil. El orden va por `Id`, la llave del documento, que ya tiene índice. Compáralo en `psql`, con las falsas todavía ahí:

```sql
EXPLAIN SELECT id FROM mt_doc_vistasuspendida ORDER BY id LIMIT 50;                        -- Index Only Scan using pkey_mt_doc_vistasuspendida_id
EXPLAIN SELECT id FROM mt_doc_vistasuspendida ORDER BY data->>'SuspendidaDesde' LIMIT 50;  -- Sort … Seq Scan: ordena la tabla entera
```

Para ordenar por otro campo, como `SuspendidaDesde`, ese campo necesita su índice, en tu `AddMarten`: `opts.Schema.For<VistaSuspendida>().Index(x => x.SuspendidaDesde);`.

Ahora saca las falsas como en [Reconstruir con el daemon](./reconstruir-con-el-daemon.md): pon `await Vistas.Rearmar(app, "VistaSuspendida");` antes de `app.Run()` (`app` es tu host), arranca una vez y quita la línea. El rearmado rejuega el diario, y en el diario no hay ninguna `falsa-`: `SELECT count(*) FROM mt_doc_vistasuspendida WHERE id LIKE 'falsa-%';` da 0.

## El Descubrimiento

Una respuesta de una vista dice cuánto sabe. `X-Rezago` dice cuántos hechos del diario le faltan a la vista: con 0, la respuesta está al día; con más, el cliente sabe que puede faltar algo y vuelve a pedir. Un documento que la vista no tiene no es un cero: es «en proceso» o «no existe», y eso lo dice el diario. Y un listado trae una página de tamaño fijo, con un orden sobre un campo con índice, y dice si hay más. Así la respuesta no crece con los datos.

> 🌱 Cuando algo sale mal, tu servicio todavía responde 500. Un alta con un NIT repetido le llega a la pantalla como una falla del servidor, con el stack de tu código. Qué forma tiene un error, y qué forma tiene lo que entregas de tu diario, es [El borde es un contrato](./el-borde-es-un-contrato.md).

## ✅ Compruébalo

- [ ] Justo después de suspender, la ficha dijo `activa` con 200 y sin aviso.
- [ ] La ficha y el listado llevan `X-Rezago`: más de 0 justo después de escribir, 0 cuando el daemon alcanza.
- [ ] La cuenta de suspensiones ya no responde 0 para un documento que la vista no tiene.
- [ ] Con veinte mil filas en la vista, el listado pesó cientos de KB; con la página, menos de 1 KB, y dice si hay más.
- [ ] Tras rearmar `VistaSuspendida`, no queda ninguna `falsa-`.

## 🆘 Si algo salió mal

- **`X-Rezago` sale siempre igual al high-water:** el nombre del shard no coincide. Mira los nombres en `SELECT name FROM mt_event_progression;`: son `Tablero:All` y `VistaSuspendida:All`.
- **`ToPagedListAsync` no compila:** falta `using Marten.Pagination;`.
- **El listado repite empresas entre páginas:** falta el `OrderBy`, o la vista cambió entre las dos páginas.
- **Un segundo después, la ficha dice `esperando`:** los socios todavía no contestan. Pídela otra vez.
- **Tras rearmar siguen las `falsa-`:** el rearmado no corrió. Revisa que la línea esté antes de `app.Run()`, y que el nombre sea `VistaSuspendida`.

## 📓 Registra tu avance

Deja la regla en tu `DECISIONES.md`:

> Toda lectura de una vista lleva `X-Rezago` (high-water menos el progreso de su shard). Un documento que la vista no tiene no se responde como cero. Un listado trae una página de tamaño fijo, que pone el servidor, ordenada por un campo con índice, y dice si hay más.

> 💭 **Reto:** ¿por qué una lista vacía con rezago 0 y una con rezago 3 no dicen lo mismo? ¿Por qué el tamaño de la página no lo elige el cliente?

```bash
git add .
git commit -m "ES · La respuesta dice cuánto sabe" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una lectura de una vista dice cuánto sabe: `X-Rezago` con los hechos que le faltan, «en proceso» en vez de un cero para lo que aún no tiene, y en un listado una página de tamaño fijo, ordenada sobre un índice, que dice si hay más.

---

[⬅️ Volver: Lo que acabas de pedir](./lo-que-acabas-de-pedir.md)

[➡️ Siguiente: El borde es un contrato](./el-borde-es-un-contrato.md)
