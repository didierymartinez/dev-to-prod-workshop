# La versión que vio el usuario

Tu plantilla ya escribe con la versión esperada, y un test de dos escritores lo fija. Ahora el cambio de plan llega desde una pantalla, por HTTP.

## 🎯 El Objetivo

Que un cambio de plan hecho desde una pantalla choque si la empresa cambió desde que el usuario la vio, y que Facturación se entere de cada cambio que entra. Y cerrar el taller con el criterio que le llevas a la librería real.

## 💥 El dolor: guardar sobre lo que ya cambió

Con el servicio corriendo, registra una empresa por `POST /empresas`:

```bash
curl -i -X POST http://localhost:5000/empresas -H "Authorization: Bearer $ACME" -H 'Content-Type: application/json' -d '{"empresaId":"emp-49","nit":"904900000","nombre":"Textiles del Norte","plan":"Basico"}'
# HTTP/1.1 202 Accepted
```

Ana abre la ficha de `emp-49` a las 10:00 y ve Básico, en la versión 1. Mientras lo piensa, Beto la pasa a Premium. A las 10:05, Ana guarda Enterprise. Corre esos dos guardados, cada uno con su sesión:

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run()
async Task GuardarPlan(string plan)   // una pantalla guarda: su sesión y su unidad de trabajo
{
    await using var s = store.LightweightSession("acme");
    var uow = new MartenUnitOfWork(s);
    (await uow.Cargar<Empresa>("emp-49")).CambiarPlan(plan);
    await uow.CommitAsync();
}
await GuardarPlan("Premium");      // 10:03 · Beto
await GuardarPlan("Enterprise");   // 10:05 · Ana, decidido sobre lo que vio a las 10:00
```

```sql
SELECT version, data->>'NuevoPlan' FROM mt_events WHERE stream_id = 'emp-49' ORDER BY version;
-- 1 |
-- 2 | Premium      ← Beto
-- 3 | Enterprise   ← Ana, sobre la versión 1 que vio
SELECT * FROM plan_de_empresa WHERE nit = '904900000';
-- acme | 904900000 | Basico | 1      ← la copia de Facturación
```

Las dos escrituras entraron. Ana decidió sobre la versión 1 y guardó sobre la 2, sin enterarse de Beto. `FetchForWriting` no chocó: validó la versión de la carga de Ana, la de las 10:05. Esa ventana va de cargar a confirmar; la de Ana empezó antes, cuando la pantalla le mostró la empresa. Y Facturación cobraría Básico, porque `Planes.De` responde con su fila. Ninguno de los dos cambios pasó por `CambiarPlanHandler`, el que anuncia `PlanDeEmpresaV1`: es el cambio que nadie oyó de [La réplica suscrita](./la-replica-suscrita.md). Quita el escenario de tu `Program.cs`.

## 🔧 La versión viaja con el usuario, y el cambio se anuncia

> 🆕 **`ETag` e `If-Match`: la versión viaja por HTTP.** El GET devuelve la versión en la cabecera `ETag`, entre comillas: `"2"`. El cliente la manda de vuelta en `If-Match` al guardar. Si ya no coincide, el servidor responde 412 Precondition Failed: la condición que puso el cliente no se cumple. Sin `If-Match`, responde 428 Precondition Required: no sabe sobre qué versión decidió el usuario.

### Paso 1 · El GET devuelve la versión

> 🛠️ **Inténtalo tú.** Quiero esto, con el servicio corriendo:
>
> ```bash
> curl -i -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-49/plan
> # HTTP/1.1 200 OK
> # ETag: "3"
> # {"id":"emp-49","nombre":"Textiles del Norte","plan":"Enterprise"}
> ```
>
> Agrega un `MapGet("/empresas/{id}/plan")`: `/empresas/{id}` ya es la ficha de [Lo que acabas de pedir](./lo-que-acabas-de-pedir.md), y la ficha lee el tablero. Que rehidrate la empresa con `AggregateStreamAsync` desde una `IQuerySession`: para leer basta una sesión de consulta. Lee el diario, no una vista: la versión que importa es la del stream, y una vista puede ir atrasada. Si la empresa no existe, 404. Si existe, pon su `Version` en el `ETag`, con `res.Headers.ETag = …` sobre el `HttpResponse`, como tu `X-Rezago`, y devuelve su id, su nombre y su plan.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, junto a tus endpoints: la versión que vio el usuario sale en el ETag
app.MapGet("/empresas/{id}/plan", async (string id, IQuerySession s, HttpResponse res) =>
{
    var e = await s.Events.AggregateStreamAsync<Empresa>(id);
    if (e is null) return Results.NotFound();
    res.Headers.ETag = $"\"{e.Version}\"";
    return Results.Ok(new { e.Id, e.Nombre, e.Plan });
});
```

</details>

### Paso 2 · El PUT la trae de vuelta

> 🆕 **La versión esperada, desde el usuario.** `FetchForWriting<T>(id, versionEsperada)` recibe la versión que vio el usuario. Si al cargar el stream ya no está en ella, lanza `JasperFx.ConcurrencyException`. Un stream que no existe está en la versión 0: con 0 no lanza, y su `.Aggregate` llega en `null`. Si otro escribe entre la carga y el guardado, el `SaveChangesAsync` lanza `EventStreamUnexpectedMaxEventIdException`. Son dos tipos, y `JasperFx.ConcurrencyException` atrapa a los dos.

> 🆕 **La petición, en la lambda del endpoint.** Un parámetro `HttpRequest req` te da la petición, y `req.Headers.IfMatch` su cabecera. `MapPut` publica un PUT, como `MapPost` y `MapGet`. `Results.NoContent()` responde 204, y `Results.StatusCode(...)` el código que le pases: `StatusCodes.Status412PreconditionFailed` y `StatusCodes.Status428PreconditionRequired` ya tienen nombre.

> 🛠️ **Inténtalo tú.** Quiero esto, con el `ETag` que te dio tu GET:
>
> ```bash
> curl -i -X PUT http://localhost:5000/empresas/emp-49/plan -H "Authorization: Bearer $ACME" -H 'If-Match: "3"' -H 'Content-Type: application/json' -d '{"plan":"Premium"}'
> # HTTP/1.1 204 No Content
> curl -i -X PUT http://localhost:5000/empresas/emp-49/plan -H "Authorization: Bearer $ACME" -H 'If-Match: "3"' -H 'Content-Type: application/json' -d '{"plan":"Enterprise"}'
> # HTTP/1.1 412 Precondition Failed      ← la misma versión, ya vieja
> ```
>
> Para eso: **(1)** En `MartenUnitOfWork`, agrega otro `Cargar<T>`, con un parámetro más: `long versionVista`. Es como tu `Cargar(id)`, con su puerta, pero le pasa esa versión a `FetchForWriting`. La primera línea no va: el PUT usa una unidad nueva, y lo que vio el usuario se valida siempre contra Postgres. **(2)** Agrega un `MapPut("/empresas/{id}/plan")` que lea `If-Match`, cargue la empresa con la versión vista, cambie el plan y confirme. El valor llega entre comillas: quítaselas antes de convertirlo en número. Sin `If-Match`, 428; si choca, 412. Si la puerta de `Cargar` lanza `AgregadoNoEncontradoException`, responde 404 desde tu `StatusCodeSelector` de [El borde es un contrato](./el-borde-es-un-contrato.md), no en un `catch` del PUT: así vale para todos tus endpoints. El cuerpo es un `record CambioDePlan(string Plan)`, junto a tus comandos, y se lee del JSON como tu `RegistrarEmpresa`. **(3)** La unidad de trabajo usa la `IDocumentSession` que el contenedor le da al endpoint, una por petición, como viste en [El host y la inyección](./el-host-y-la-inyeccion.md): el PUT escribe, así que pide una sesión que escribe. La que registra Marten no tiene tenant, y falla al abrirse: registra la tuya como tu `IQuerySession` de [El contexto que falta](./el-contexto-que-falta.md), con `LightweightSession` y el tenant del bus.
>
> No mandes este cambio por el bus: tu política de reintento de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) lo volvería a correr con la misma versión vista, y chocaría cada vez. Un choque con lo que vio el usuario no se reintenta: se le devuelve, para que vuelva a leer y decida.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en MartenUnitOfWork: la misma carga, con la versión que vio el usuario
public async Task<T> Cargar<T>(string id, long versionVista) where T : AggregateRoot
{
    var stream = await _s.Events.FetchForWriting<T>(id, versionVista);   // la versión esperada es la del usuario
    var agg = stream.Aggregate ?? throw new AgregadoNoEncontradoException(id);
    _cargados.Add((agg, () => stream.AppendMany(agg.SinConfirmar.ToArray())));
    return agg;
}

// Empresas.Historia/Dominio.cs, junto a tus comandos
public record CambioDePlan(string Plan);   // el cuerpo del PUT

// Empresas.Historia/Program.cs, junto a tu IQuerySession: la sesión que escribe, en el tenant del bus
builder.Services.AddScoped<IDocumentSession>(s =>
    s.GetRequiredService<IDocumentStore>().LightweightSession(s.GetRequiredService<IMessageContext>().TenantId!));

// la primera línea de tu StatusCodeSelector, antes del 409
ex is AgregadoNoEncontradoException ? StatusCodes.Status404NotFound :   // la puerta de Cargar: ese stream no existe
```

```csharp
// Empresas.Historia/Program.cs, junto a tu MapGet: la versión vuelve en el If-Match, hasta la escritura
app.MapPut("/empresas/{id}/plan", async (string id, CambioDePlan cambio, HttpRequest req, IDocumentSession s) =>
{
    if (!long.TryParse(req.Headers.IfMatch.ToString().Trim('"'), out var versionVista))
        return Results.StatusCode(StatusCodes.Status428PreconditionRequired);   // sin If-Match no sabes sobre qué versión decidió
    var uow = new MartenUnitOfWork(s);
    try
    {
        var e = await uow.Cargar<Empresa>(id, versionVista);
        e.CambiarPlan(cambio.Plan);
        await uow.CommitAsync();
        return Results.NoContent();
    }
    catch (JasperFx.ConcurrencyException)
    {
        return Results.StatusCode(StatusCodes.Status412PreconditionFailed);   // la empresa cambió desde que el usuario la vio
    }
});
```

</details>

> 🔍 **¿Lo lograste?** El primer PUT con la versión del GET responde 204, y el segundo con la misma, 412. Un PUT sin `If-Match` responde 428, y uno con `If-Match: "0"` a `emp-nadie`, 404, como `POST /empresas/emp-nadie/suspender`.

### Paso 3 · El PUT anuncia el plan

Tu PUT tampoco pasa por `CambiarPlanHandler`: la fila de `904900000` en `plan_de_empresa` sigue en `Basico | 1`, y Empresas va en Premium, en la versión 4. Como el PUT no va por el bus, anuncia él. Pídele un `IMessageBus bus` y, antes del `CommitAsync`, publica `PlanDeEmpresaV1` con el NIT, el plan nuevo y la versión que tendrá el stream, como tu `CambiarPlanHandler`. Para ver qué pasa si el commit no llega, pon justo después del `PublishAsync` un `throw new InvalidOperationException("antes del commit");`, y manda el PUT con `If-Match: "4"` y Enterprise. Responde 500 y el diario sigue en la versión 4, pero `plan_de_empresa` dice `Enterprise | 5`: Facturación recibió un plan que Empresas nunca guardó. Fuera de un handler, el `PublishAsync` no espera a tu commit, como viste en [En vivo y serverless](./en-vivo-y-serverless.md). Borra esa fila con `DELETE FROM plan_de_empresa WHERE nit = '904900000';`: sin fila, `Planes.De` le pregunta a Empresas.

> 🆕 **La sesión del endpoint, en el outbox.** Wolverine abre la sesión de cada mensaje con `OutboxedSessionFactory.OpenSession(context)`, como viste en el código que genera para tu handler en [La plantilla dentro del handler](./la-plantilla-dentro-del-handler.md). `OpenSession(bus)` hace lo mismo con el bus de la petición: abre la sesión con el tenant del bus y la enrola en el outbox. Lo que publiques en ese bus con `PublishAsync` se guarda en la transacción de la sesión, y sale cuando el commit pasa. `OutboxedSessionFactory` vive en `Wolverine.Marten.Publishing`.

> 🛠️ **Inténtalo tú.** Quiero que el mismo PUT, con el `throw`, no deje nada en Facturación, y que sin él llegue:
>
> ```bash
> curl -i -X PUT http://localhost:5000/empresas/emp-49/plan -H "Authorization: Bearer $ACME" -H 'If-Match: "4"' -H 'Content-Type: application/json' -d '{"plan":"Enterprise"}'
> # HTTP/1.1 500 Internal Server Error    ← con el throw: SELECT * FROM plan_de_empresa WHERE nit = '904900000'; → sin filas
> # HTTP/1.1 204 No Content               ← sin el throw: → acme | 904900000 | Enterprise | 5
> ```
>
> Para eso, registra tu `IDocumentSession` con `OutboxedSessionFactory`, en vez de `LightweightSession`, con el `IMessageContext` de la petición. En una petición, el contenedor da el mismo objeto como `IMessageContext` y como `IMessageBus`, el que tu middleware llena con el tenant: lo que el PUT publica en su bus entra en la transacción de su sesión.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs: la sesión del endpoint, en el outbox y en el tenant del bus (using Wolverine.Marten.Publishing;)
builder.Services.AddScoped<IDocumentSession>(s =>
    s.GetRequiredService<OutboxedSessionFactory>().OpenSession(s.GetRequiredService<IMessageContext>()));

// en tu MapPut, con IMessageBus bus en sus parámetros: el anuncio, antes del commit
        e.CambiarPlan(cambio.Plan);
        await bus.PublishAsync(new PlanDeEmpresaV1(e.Nit, e.Plan, e.Version + 1));   // la versión que tendrá el stream
        await uow.CommitAsync();                                                     // el hecho y su anuncio, juntos
```

Si el `SaveChangesAsync` choca, el anuncio se descarta con la transacción, y el PUT responde 412. Tus tests no ven el broker: `HostDePrueba` no se conecta a él.

</details>

### Paso 4 · Los tests del 412, del 404 y del 409

> 🆕 **Un PUT con cabecera, desde el test.** `app.CreateClient()` te da un `HttpClient` contra el servidor en memoria del host. Llega sin token, y tu política responde 401: dale el de acme como a tu `Pantalla` de [El tenant viene firmado](./el-tenant-viene-firmado.md), con `http.DefaultRequestHeaders.Authorization = new("Bearer", token)`. Lee el token de la variable `ACME`, fijada con `export ACME=$(cat ~/acme.jwt)` en la terminal de `dotnet test` (en PowerShell, `$env:ACME = Get-Content ~/acme.jwt`). Así el test pasa por la misma validación que tu servicio. La respuesta del GET trae su `ETag` en `Headers.ETag`, como un `EntityTagHeaderValue` (de `System.Net.Http.Headers`); `new EntityTagHeaderValue("\"0\"")` arma uno a mano. `new HttpRequestMessage(HttpMethod.Put, url)` arma una petición: su `Content` es el cuerpo (`JsonContent.Create(objeto)`, de `System.Net.Http.Json`), y `Headers.IfMatch.Add(etag)` le agrega la cabecera. `http.SendAsync(peticion)` la envía, y su `StatusCode` es un `HttpStatusCode` (de `System.Net`).

> 🛠️ **Inténtalo tú.** En tu `ConcurrenciaTests`, fija lo que acabas de ver con `curl`: una empresa nace por `POST /empresas`, el GET da su versión, el primer PUT con ella responde 204, y el segundo con la misma responde 412. En otro test, el PUT con `If-Match: "0"` a `emp-nadie` responde 404. Y fija lo que exige un test de la organización, el de [El borde es un contrato](./el-borde-es-un-contrato.md): de dos altas con el mismo NIT, la segunda responde 409, no 500. Usa un id y un NIT nuevos en cada corrida. Lleva a métodos de la clase lo que repites: el cliente con su token, el alta y el PUT.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/ConcurrenciaTests.cs, dentro de la clase, junto a tu test de dos escritores
// (arriba, using System.Net; using System.Net.Http.Headers; using System.Net.Http.Json;)
HttpClient Cliente()   // el host en memoria, con el token de acme
{
    var http = app.CreateClient();
    http.DefaultRequestHeaders.Authorization = new("Bearer", Environment.GetEnvironmentVariable("ACME"));
    return http;
}

[Fact]
public async Task El_PUT_sobre_una_version_vieja_responde_412()
{
    var http = Cliente();
    var id = $"emp-{Guid.NewGuid():N}";
    await Alta(http, id, $"nit-{Guid.NewGuid():N}");                            // nace en la versión 1
    var etag = (await http.GetAsync($"/empresas/{id}/plan")).Headers.ETag!;   // lo que vio el usuario: "1"
    Assert.Equal(HttpStatusCode.NoContent, (await CambiarPlan(http, id, etag, "Premium")).StatusCode);
    Assert.Equal(HttpStatusCode.PreconditionFailed, (await CambiarPlan(http, id, etag, "Enterprise")).StatusCode);   // la misma versión, ya vieja
}

[Fact]
public async Task El_PUT_sobre_una_empresa_que_no_existe_responde_404() =>   // "0": la versión de un stream que no existe
    Assert.Equal(HttpStatusCode.NotFound, (await CambiarPlan(Cliente(), "emp-nadie", new EntityTagHeaderValue("\"0\""), "Premium")).StatusCode);

[Fact]
public async Task El_NIT_repetido_responde_409()   // con un 500, la pantalla reintentaría
{
    var http = Cliente();
    var nit = $"nit-{Guid.NewGuid():N}";
    Assert.Equal(HttpStatusCode.Accepted, (await Alta(http, $"emp-{Guid.NewGuid():N}", nit)).StatusCode);
    Assert.Equal(HttpStatusCode.Conflict, (await Alta(http, $"emp-{Guid.NewGuid():N}", nit)).StatusCode);   // el mismo NIT, otra empresa
}

static Task<HttpResponseMessage> Alta(HttpClient http, string id, string nit) =>
    http.PostAsync("/empresas", JsonContent.Create(new RegistrarEmpresa(id, nit, "Andes", "Basico")));

static Task<HttpResponseMessage> CambiarPlan(HttpClient http, string id, EntityTagHeaderValue etag, string plan)
{
    var put = new HttpRequestMessage(HttpMethod.Put, $"/empresas/{id}/plan") { Content = JsonContent.Create(new CambioDePlan(plan)) };
    put.Headers.IfMatch.Add(etag);
    return http.SendAsync(put);
}
```

</details>

> 🔍 **¿Lo lograste?** `dotnet test` pasa en verde, con los cuatro tests de `ConcurrenciaTests`.

## 🔨 Rómpelo: la versión en un `if`, y el anuncio después del commit

**La versión en un `if`.** Prueba la forma que usa un proyecto de la organización: el PUT carga sin la versión vista y la compara en memoria.

```csharp
var e = await uow.Cargar<Empresa>(id);                                                              // carga sin la versión vista…
if (e.Version != versionVista) return Results.StatusCode(StatusCodes.Status412PreconditionFailed);   // …y la compara en un if
e.CambiarPlan(cambio.Plan);
```

Corre `dotnet test`: en verde, también el test del 412, porque debajo sigue `FetchForWriting(id)`, que valida al guardar la versión que leyó. Ahora quita `FetchForWriting` de tu `Cargar(id)`: vuelve a `FetchLatest` y al `Append` pelado, como en el 🔨 de [El capstone: FetchForWriting](./el-capstone-fetchforwriting.md). Corre otra vez. El test del 412 sigue en verde: manda sus dos PUT en fila, y el `if` del segundo ve la versión que dejó el primero. La carrera es de dos PUT a la vez, y la reproduce tu test de dos escritores, que cae: sus dos unidades de trabajo cargan la misma versión antes de que una confirme. Dos PUT a la vez cargarían así: los dos pasarían el `if`, porque ninguno ha escrito todavía, y los dos harían su `Append`. El `if` no protege la ventana entre comparar y escribir; la protege la versión esperada dentro de la escritura. Restaura `Cargar(id)` y el PUT: con la versión del usuario en `FetchForWriting`, queda una sola comprobación, la de Marten.

**El anuncio después del commit.** En tu PUT, pasa el `PublishAsync` debajo del `CommitAsync`, y cambia `emp-49` a `Basico` con `If-Match: "5"`. Responde 204, y el PUT no lanza nada. Pero `plan_de_empresa` sigue en `Enterprise | 5`: la sesión ya confirmó su transacción, y lo que publicas después se queda en ella sin que nadie la vuelva a confirmar. Devuelve el `PublishAsync` antes del `CommitAsync`, con un comentario que nombre el síntoma, como en [El comentario que sobrevive](./el-comentario-que-sobrevive.md): `// antes del CommitAsync: después, el anuncio no sale y nada falla`. Cambia `emp-49` a `Premium` con `If-Match: "6"`: la fila queda en `Premium | 7`.

## El Descubrimiento — y el cierre

La versión que vio el usuario sale en el `ETag` del GET, vuelve en el `If-Match` del PUT y entra a `FetchForWriting` como la versión esperada. Son las peticiones condicionales de HTTP: 412 si la condición del cliente ya no se cumple, 428 si no puso ninguna. Un choque con esa versión vuelve al usuario, que relee y decide; no se reintenta. Y como el PUT no pasa por un handler, anuncia él, con la sesión del outbox: el hecho y su anuncio entran en la misma transacción, como dentro de un handler.

El criterio para la librería real lo viviste en los 🔨 de [El capstone: FetchForWriting](./el-capstone-fetchforwriting.md) y de esta sección. Sin `FetchForWriting`, todo compila y la API responde igual. Un `if` que compara versiones, sin `FetchForWriting` debajo, pasa el test del 412 y deja abierta la carrera. Un anuncio después del commit se pierde sin un error. Eso le llevas a `Cosmos.BuildingBlocks`: que su camino de escritura use `FetchForWriting` con la versión del usuario, y que cada anuncio salga en la transacción de su hecho, con un test o un comentario que nombre el síntoma. Ese criterio cierra el arco: **usar** la librería, **mantenerla** con criterio, **aportar** de vuelta.

Y con esto cierras el recorrido. Empezaste con un `UPDATE` que destruía el pasado y un diario de hechos en una lista en memoria; terminaste con Marten y Wolverine corriendo un servicio observado, con outbox durable, procesos con dueño, concurrencia optimista de la pantalla a la escritura y cada organización aislada por un tenant firmado. No adoptaste ninguna pieza a ciegas: la construiste a mano hasta donde el juguete lo permitió, y **reconociste** la herramienta cuando llegó. Te llevas el **por qué** de cada pieza, y cuándo no usarla: el criterio que mantiene viva una librería como `Cosmos.BuildingBlocks`.

## ✅ Compruébalo

- [ ] El GET de `/empresas/{id}/plan` devuelve la versión en el `ETag`. El PUT con esa versión en `If-Match` responde 204; con una versión vieja, 412; sin `If-Match`, 428; con `If-Match: "0"` a una empresa que no existe, 404, desde tu `StatusCodeSelector`.
- [ ] Un cambio de plan por el PUT llega a `plan_de_empresa`, con su versión. Sabes por qué el anuncio va antes del `CommitAsync` y en la sesión del outbox.
- [ ] Tus tests, con el token de acme, fijan el 412, el 404 y el 409 del NIT repetido, y `dotnet test` pasa en verde.
- [ ] Sabes por qué un `if` que compara la versión en memoria pasa el test del 412 y no cierra la carrera de dos escritores, y sabes formular el criterio que le llevas a la librería.

## 🆘 Si algo salió mal

- **El PUT con la versión vieja responde 409, no 412:** atrapaste `EventStreamUnexpectedMaxEventIdException`. Al cargar con una versión vieja, `FetchForWriting` lanza la base misma, `JasperFx.ConcurrencyException`, y un `catch` de la clase hija no la atrapa: la responde tu `StatusCodeSelector`, como todo choque. Atrapa la base.
- **El PUT sobre una empresa que no existe responde 412, no 404:** `FetchForWriting(id, versión)` no encuentra esa versión, y lanza `JasperFx.ConcurrencyException`, como con una versión vieja. Para HTTP es correcto: la condición del `If-Match` no se cumple. Solo `If-Match: "0"` llega a la puerta de tu `Cargar(id, versionVista)`, porque para un stream que no existe la versión 0 es la correcta. Si ahí responde 500, falta `AgregadoNoEncontradoException` en tu `StatusCodeSelector`.
- **El PUT responde 500, y el log dice `Default tenant *DEFAULT* usage is disabled`:** el endpoint recibe la `IDocumentSession` de Marten, sin tenant. Registra la tuya después de `AgregarEmpresas`, como tu `IQuerySession`.
- **`plan_de_empresa` no cambia tras el PUT:** el `PublishAsync` va después del `CommitAsync`, o el `If-Match` no es la versión del GET. Si la versión anunciada no es mayor que la guardada, el `WHERE` de `Guardar` la descarta.
- **Tus tests HTTP reciben 401:** `ACME` no está fijada en la terminal de `dotnet test`, o le falta el `export`.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- La versión que vio el usuario: viaja en `If-Match` y es la versión esperada; si choca, 412, sin reintento. El PUT anuncia el plan antes del `CommitAsync`, con la sesión del outbox.
```

> 💭 **Reto (el último):** ¿por qué un choque con la versión que vio el usuario responde 412 en vez de reintentarse? ¿Por qué el `if` que compara versiones no basta? Y: ¿por qué el anuncio del PUT va en la sesión del outbox, antes del commit? Ese es el criterio que le llevas a la librería.

```bash
git add .
git commit -m "ES · La versión que vio el usuario (ETag, If-Match y el anuncio en la transacción del hecho)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La versión que vio el usuario viaja en el `ETag` y el `If-Match` hasta `FetchForWriting`, su choque vuelve al usuario como un 412, y el cambio se anuncia en la transacción de su hecho. Usar la versión esperada de la pantalla a la escritura, y fijar cada línea que falla en silencio es el criterio de mantenedor que le llevas a `Cosmos.BuildingBlocks`: usar, mantener, aportar.

---

[⬅️ Volver: El capstone: FetchForWriting](./el-capstone-fetchforwriting.md)
