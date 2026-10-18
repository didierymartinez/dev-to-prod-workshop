# El tenant viene firmado

Tus tests prueban que acme no ve lo de globex. El tenant sigue llegando en el header `X-Tenant-Id`.

## 🎯 El Objetivo

Que el tenant y el usuario de cada petición salgan de un dato que tu servicio puede verificar, y no de lo que escriba quien llama. Que toda ruta lo exija, y que la pantalla en vivo de cada organización muestre solo lo suyo.

## 💥 El dolor: el tenant lo elige quien llama

Pide la ficha de globex sin decir quién eres, solo con el header:

```bash
curl -H "X-Tenant-Id: globex" http://localhost:5000/empresas/emp-161
# {"id":"emp-161","nombre":"Vidriería Andina","plan":"Premium",…}
```

Cualquiera que alcance tu servicio lee, y escribe, en el tenant que quiera: basta cambiar el header. Contabilidad y Terceros toman así su tenant, de un header libre.

## 🔧 Paso 1 · Un token que tu servicio verifica

> 🆕 **JWT.** Un JWT es un token firmado que viaja en el header `Authorization: Bearer …`. Lleva *claims*, datos con nombre: `sub`, el id del usuario, y los que le agregues, como `tenant`. Los claims van a la vista, firmados, no cifrados. Tu servicio verifica la firma con una clave: si alguien cambia un claim, la firma ya no coincide y el token no vale. Quien tiene la clave emite tokens. En tu máquina eres tú; en producción, solo el proveedor de identidad, y quien llama recibe el suyo. Este *claim* no es el «reclamar una fila» de [El mensaje y la cola](./el-mensaje-y-la-cola.md): misma palabra, otro sentido.

> 🆕 **Tokens de desarrollo: `dotnet user-jwts`.** `dotnet user-jwts create` crea un token para tu proyecto. Guarda la clave en tus user-secrets y escribe en `appsettings.Development.json` cómo validar el token; ese archivo tiene que existir. `--audience` es el servicio al que va el token, `--name` es el `sub`, `--claim` agrega un claim, y `--output token` imprime solo el token. Esos tokens valen solo en `Development`.

Desde la raíz de tu solución, agrega el paquete que valida los tokens y crea uno por organización. Guárdalos en un archivo: así los lees en cada terminal donde los uses. En PowerShell: `Set-Content Empresas.Historia/appsettings.Development.json "{}"` y `$ACME = Get-Content ~/acme.jwt`.

```bash
dotnet add Empresas.Historia package Microsoft.AspNetCore.Authentication.JwtBearer
echo "{}" > Empresas.Historia/appsettings.Development.json
dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0001 --claim tenant=acme --claim email=ana@acme.co --output token > ~/acme.jwt
dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0002 --claim tenant=globex --claim email=gus@globex.co --output token > ~/globex.jwt
ACME=$(cat ~/acme.jwt); GLOBEX=$(cat ~/globex.jwt)   # en cada terminal donde los uses
```

> 🆕 **Autenticación en el host.** Autenticar es saber quién llama. `builder.Services.AddAuthentication().AddJwtBearer()` registra la validación del token, y lee de tu configuración la clave, la audiencia y el emisor. `app.UseAuthentication()` valida el token de cada petición y llena `contexto.User`. `contexto.User.FindFirst("tenant")?.Value` lee un claim, o `null` si no viene.

> 🛠️ **Inténtalo tú.** Quiero esto:
>
> ```
> GET /empresas/emp-161   Authorization: Bearer $ACME   X-Tenant-Id: globex   → 404
> GET /empresas/emp-161   Authorization: Bearer $GLOBEX                       → 200, Vidriería Andina
> ```
>
> Haz que funcione: (1) Antes de `builder.Build()`, registra `AddAuthentication().AddJwtBearer()`. (2) Pon `app.UseAuthentication()` antes de tu `app.Use`. (3) Dentro de tu `app.Use`, toma el tenant del claim `tenant`, y deja de leer el header.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, antes de var app = builder.Build();
builder.Services.AddAuthentication().AddJwtBearer();   // valida el token con lo que escribió user-jwts

// después de app.UseExceptionHandler(...)
app.UseAuthentication();   // valida el token y llena contexto.User
app.Use(async (contexto, siguiente) =>
{
    // … la correlación, como estaba
    var tenant = contexto.User.FindFirst("tenant")?.Value;   // del token firmado; el header ya no cuenta
    if (tenant is not null) bus.TenantId = tenant;
    // … el OnStarting y el await siguiente(), como estaban
});
```

</details>

> 🔍 **¿Lo lograste?** `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ACME" -H "X-Tenant-Id: globex" http://localhost:5000/empresas/emp-161` da `404`: el header no cambia nada. Con el de globex, sin header, su ficha. Ahora falsifica uno: los claims de globex con la firma de acme, `FALSO=$(echo $ACME | cut -d. -f1).$(echo $GLOBEX | cut -d. -f2).$(echo $ACME | cut -d. -f3)`. Con él, `500`, sin la ficha de globex: el log dice `Bearer was not authenticated. Failure message: IDX10517: Signature validation failed`, y la petición siguió sin usuario ni tenant.

El gateway del Application Plane valida el token por los servicios que tiene detrás: borra el `X-Tenant-Id` que llega, y escribe el del token. Un servicio así puede confiar en su header solo si nadie lo alcanza sin pasar por el gateway: su puerto de red no se expone.

## 🔧 Paso 2 · Toda ruta exige el token

Sin token, tus rutas responden `500`: tu `app.Use` no pone tenant, y Marten no abre la sesión. Tu pantalla en vivo no abre sesión, y no la frena nada. Abre `curl -N http://localhost:5000/suspensiones/en-vivo`, sin token, y suspende emp-161 con el token de globex:

```bash
curl -X POST -H "Authorization: Bearer $GLOBEX" http://localhost:5000/empresas/emp-161/suspender
# en la terminal del curl -N, sin token:   event: suspension-efectiva   data: {"suspensionId":"susp-emp-161-2","nit":"916000000"}
```

Un anónimo ve las suspensiones de globex. Hasta hoy protegías ruta por ruta sin saberlo: el fail-fast cuidaba las que abren sesión, y la pantalla no abre ninguna. El gateway del Application Plane revisa el tenant dentro de un `if (autenticado)`, y una ruta anónima nueva pasa sin tenant. La regla va al revés: todo exige token, y lo abierto se declara.

> 🆕 **Una política por defecto.** Autorizar es decidir si quien llama puede. `builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(...)` fija la regla de toda ruta que no diga otra, y `app.UseAuthorization()` la aplica. `new AuthorizationPolicyBuilder().RequireAuthenticatedUser().RequireClaim("tenant").RequireClaim("sub").Build()` pide un token válido con esos dos claims (`AuthorizationPolicyBuilder` vive en `Microsoft.AspNetCore.Authorization`). Sin token, `401`: no sé quién eres. Con un token sin `tenant`, `403`: sé quién eres, y no puedes. Abrir una ruta se dice ruta por ruta, con `.AllowAnonymous()`.

> 🛠️ **Inténtalo tú.** Registra esa política antes de `builder.Build()`, y pon `app.UseAuthorization()` después de tu `app.Use`. Sin token, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/empresas/emp-161` y el `curl -N` de la pantalla deben dar `401`. Y con el token de acme, la ficha de emp-160 da `403`.

> 🆕 **Los claims, con su nombre.** `AddJwtBearer()` renombra por defecto algunos claims a nombres largos de Microsoft: `sub` llega como `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`, y `RequireClaim("sub")` no lo encuentra. `AddJwtBearer(o => o.MapInboundClaims = false)` los deja con el nombre que traen.

Ponle esa opción: con el token de acme, `200`. Crea un token sin tenant, `SIN=$(dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0009 --output token)`: con él, `403`. Tu `/dev/reset`, si lo prendes, también pide token. Y tu `Pantalla` recibe `401`: que mande el token que le pases, `http.DefaultRequestHeaders.Authorization = new("Bearer", args[0]);` después de crear el `HttpClient`, y córrela con `dotnet run --project Pantalla -- $ACME`.

## 🔧 Paso 3 · Cada pantalla, su organización

Con la pantalla de acme abierta, registra y suspende otra empresa de globex, con su token:

```bash
curl -X POST http://localhost:5000/empresas -H "Authorization: Bearer $GLOBEX" -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-171\",\"nit\":\"917100000\",\"nombre\":\"Marquetería Sur\",\"plan\":\"Basico\"}"
curl -X POST -H "Authorization: Bearer $GLOBEX" http://localhost:5000/empresas/emp-171/suspender
# la pantalla de acme:   NIT 917100000: suspendida
```

Hay un solo canal para todas las organizaciones, y la pantalla de acme muestra lo de globex. Notificaciones tiene este error: si falta el destino, envía a todos.

> 🆕 **Un canal por tenant.** `ConcurrentDictionary<string, Channel<…>>` (de `System.Collections.Concurrent`) es un diccionario que varios hilos usan a la vez: `GetOrAdd(tenant, _ => Channel.CreateUnbounded<…>())` devuelve el canal de ese tenant, y lo crea la primera vez. Un handler recibe el `IMessageContext` de su mensaje, con el `TenantId` del sobre. Si al sobre le faltó el tenant, ahí dice `*DEFAULT*`, no `null`: `tenant.IsDefaultTenant()` (de `JasperFx.MultiTenancy`) es `true` para `null`, vacío o `*DEFAULT*`. Un endpoint recibe el `ClaimsPrincipal` (de `System.Security.Claims`), el mismo `contexto.User`.

> 🛠️ **Inténtalo tú.** Quiero dos pantallas, una con cada token, y que cada una muestre solo lo suyo:
>
> ```
> globex suspende emp-174   →   pantalla de globex: NIT 917400000      pantalla de acme: nada
> acme suspende emp-173     →   pantalla de acme:   NIT 917300000      pantalla de globex: nada
> ```
>
> Haz que funcione: (1) En `EnVivo`, cambia el canal por un método `De(string? tenant)` que devuelva el canal de ese tenant, y que lance si `tenant.IsDefaultTenant()`: un aviso sin tenant no va a nadie, ni a todos. (2) Que `EnVivoHandler` reciba también el `IMessageContext` y escriba en `EnVivo.De(mensaje.TenantId)`. (3) Que el endpoint reciba el `ClaimsPrincipal` y lea `EnVivo.De` con el claim `tenant`. (4) Registra emp-173 para acme y emp-174 para globex, NIT 917300000 y 917400000, y prueba con dos pantallas.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/EnVivo.cs, con using System.Collections.Concurrent; using JasperFx.MultiTenancy; using Wolverine;
public static class EnVivo
{
    static readonly ConcurrentDictionary<string, Channel<SuspensionEfectivaV1>> _porTenant = new();

    public static Channel<SuspensionEfectivaV1> De(string? tenant) =>
        tenant.IsDefaultTenant()
            ? throw new InvalidOperationException("Un aviso sin tenant no va a nadie.")   // ni a todos
            : _porTenant.GetOrAdd(tenant!, _ => Channel.CreateUnbounded<SuspensionEfectivaV1>());
}

public static class EnVivoHandler
{
    public static void Handle(SuspensionEfectivaV1 aviso, IMessageContext mensaje) => EnVivo.De(mensaje.TenantId).Writer.TryWrite(aviso);
}

// Program.cs: el tenant de la pantalla sale del token; la política garantiza que el claim viene
app.MapGet("/suspensiones/en-vivo", (ClaimsPrincipal usuario, CancellationToken ct) =>
    TypedResults.ServerSentEvents(Leer(usuario.FindFirst("tenant")!.Value, ct), eventType: SuspensionEfectivaV1.Tipo));

static async IAsyncEnumerable<SuspensionEfectivaV1> Leer(string tenant, [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var aviso in EnVivo.De(tenant).Reader.ReadAllAsync(ct))
        yield return aviso;
}
```

</details>

Si un aviso llega sin tenant, el handler lanza y el aviso queda en `wolverine_dead_letters`, con `Un aviso sin tenant no va a nadie.`: a la vista, en vez de perderse o de llegar a todos.

## 🔧 Paso 4 · Quién lo hizo

`SELECT stream_id, type FROM mt_events WHERE stream_id = 'emp-171';` dice qué pasó, pero no quién lo hizo. El gateway del Application Plane manda como id del usuario su email, y los servicios lo graban en la historia. Si el email cambia, la historia queda a nombre de alguien que ya no existe. El `sub` no cambia; el email es solo para mostrar.

> 🆕 **El usuario en el sobre y en el hecho.** El bus lleva un `UserName`, como su `TenantId`; aquí guarda el `sub`. `opts.EnableRelayOfUserName = true;`, en tu `AddWolverine`, lo copia al sobre de todo lo que la petición invoca o envía. `opts.Events.MetadataConfig.UserNameEnabled = true;`, en tu `AddMarten`, le da a `mt_events` la columna `user_name`, y Marten la llena con el usuario de la sesión, que Wolverine toma del sobre.

> 🛠️ **Inténtalo tú.** Pon las dos líneas en `AgregarEmpresas`. En tu `app.Use`, pon en `bus.UserName` el claim `sub`. Reinicia, y registra y suspende emp-175 con el token de acme y `-H "X-Correlation-Id: soporte-175"`. Debe salir:
>
> ```sql
> SELECT stream_id, tenant_id, user_name, type FROM mt_events WHERE correlation_id = 'soporte-175' ORDER BY seq_id;
> -- emp-175        | acme | u-0001 | empresa_registrada
> -- emp-175        | acme | u-0001 | empresa_suspendida
> -- susp-emp-175-2 | acme | u-0001 | suspension_solicitada
> -- susp-emp-175-2 | acme | u-0001 | cobro_de_multa_confirmado
> -- …
> ```

El orden de las respuestas puede cambiar. Facturación y Accesos contestaron fuera de tu petición, y sus hechos llevan el mismo tenant, el mismo usuario y la misma correlación: tu borde pone las tres en el bus, en un solo lugar. El gateway del Application Plane propaga así el tenant y el usuario, en una sola lista; la correlación es la que le falta. Ahora Ana cambia de email: crea otro token de acme como el primero, con el mismo `--name u-0001` y `--claim tenant=acme`, pero con `--claim email=ana.perez@acme.co`, y registra emp-177, NIT 917700000. `SELECT stream_id, type FROM mt_events WHERE user_name = 'u-0001';` trae emp-175 y emp-177: la historia sigue a nombre de Ana.

## 🔨 Rómpelo: el grupo que pide la pantalla

Notificaciones deja que el navegador diga a qué grupo se une. Hazlo en tu endpoint: que reciba también `string grupo`, que llega de la query string, y que lea `EnVivo.De(grupo)`. Cierra las dos pantallas: el canal le da cada aviso a un solo lector. Abre `curl -N -H "Authorization: Bearer $ACME" "http://localhost:5000/suspensiones/en-vivo?grupo=globex"`. Con el token de globex, registra y suspende emp-176, NIT 917600000: el token de acme oye a globex. La política exige un token, y el token no decide nada. Devuélvele el claim.

## El Descubrimiento

El tenant decide qué datos ve una petición, así que no puede salir de algo que escribe quien llama. Sale de un **claim firmado**: el servicio verifica el token, y del token toma el tenant y el usuario. El borde es **fail-closed**: toda ruta exige token, y abrir una es explícito. La pantalla en vivo deriva su canal del claim, y un aviso sin tenant no va a nadie. La historia guarda el `sub`, que no cambia; el email es para mostrar. Tus tests invocan el bus, no HTTP: el borde lo pruebas con peticiones.

> 🌱 Cada pedido trae su tenant y su usuario, firmados. El cobro del mes no lo trae ningún pedido: tu `ProcesoMensual` corre solo si alguien lo llama, y hoy no lo llama nadie. Hacerlo correr solo, cada mes, sin que un mes que falla corte los siguientes: [El trabajo que nadie pidió](./el-trabajo-que-nadie-pidio.md).

## ✅ Compruébalo

- [ ] Con solo el header, cualquiera leyó la ficha de globex; con el token de acme, el header `globex` da `404`, y un token falsificado no trae nada.
- [ ] Sin token, toda ruta da `401`, también la pantalla en vivo; con un token sin `tenant`, `403`.
- [ ] La pantalla de acme mostró una suspensión de globex con un solo canal; con un canal por tenant, cada pantalla ve lo suyo.
- [ ] Los hechos de emp-175 y de su proceso llevan `user_name = u-0001`, el tenant y la correlación; con el email nuevo, emp-177 también.
- [ ] Con el grupo de la query string, el token de acme oyó a globex.

## 🆘 Si algo salió mal

- **`dotnet user-jwts create` dice `Could not determine the project's URL`:** falta `--audience empresas`. Si dice `Could not find file … appsettings.Development.json`, crea el archivo con `{}`.
- **Todo da `401` con un token, y el log dice `The signature key was not found`:** el servicio corre en `Production`, o arrancó desde otra carpeta y no leyó `appsettings.Development.json`. Arráncalo con `ASPNETCORE_ENVIRONMENT=Development dotnet run`, desde `Empresas.Historia`.
- **Con token, todo da `403`:** te faltó `MapInboundClaims = false`, y `sub` llegó con el nombre largo.
- **`Unable to find the required services … AddAuthorization`:** pusiste `app.UseAuthorization()` sin registrar la política.
- **La `Pantalla` lanza `IndexOutOfRangeException`:** le falta el token: `dotnet run --project Pantalla -- $ACME`, con `ACME` leído en esa terminal.
- **`user_name` sale vacío en los hechos del proceso:** falta `EnableRelayOfUserName = true`, y el usuario no viajó en el sobre.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> El tenant y el usuario salen del token firmado, nunca de un header. Toda ruta exige token con `tenant` y `sub`, y abrir una es explícito. La pantalla en vivo deriva su canal del claim, y un aviso sin tenant lanza. La historia guarda el `sub`; el email es para mostrar.

> 💭 **Reto:** ¿por qué el tenant no puede salir de un header, aunque solo tu pantalla lo mande? ¿Qué ruta de tu sistema dejarías abierta, y cómo te asegurarías de que no quede abierta otra sin querer?

```bash
git add .
git commit -m "ES · El tenant viene firmado (claim firmado, fail-closed, en vivo por tenant, el actor)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El tenant y el usuario salen de un token firmado que el servicio verifica, no de un header que escribe quien llama; toda ruta lo exige salvo las que se abren a propósito, la pantalla en vivo escucha solo el tenant de su token, y la historia guarda el `sub`, que no cambia.

---

[⬅️ Volver: Probar que aísla](./probar-que-aisla.md)

[➡️ Siguiente: El trabajo que nadie pidió](./el-trabajo-que-nadie-pidio.md)
