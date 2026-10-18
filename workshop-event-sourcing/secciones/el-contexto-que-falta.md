# El contexto que falta

Tu pantalla se entera sola de cada suspensión efectiva. Ahora la plataforma la usa una segunda organización.

## 🎯 El Objetivo

Que tu servicio atienda a dos organizaciones en la misma base, cada una con sus empresas. Y que una petición que no dice de cuál organización es falle, en vez de caer en un lugar por defecto.

## 💥 El dolor: dos organizaciones, un solo diario

Acme usa la plataforma desde el principio. Ahora llega globex, otro despacho contable. Cada uno administra **sus** empresas, y una misma empresa puede ser cliente de los dos: Vidriería Andina, NIT 916000000, es cliente de acme y de globex. Con tu servicio arrancado, regístrala para acme y luego para globex:

```bash
curl -s -w "\n" -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-160\",\"nit\":\"916000000\",\"nombre\":\"Vidriería Andina\",\"plan\":\"Basico\"}"    # acme → 202
curl -s -w "\n" -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-161\",\"nit\":\"916000000\",\"nombre\":\"Vidriería Andina\",\"plan\":\"Premium\"}"   # globex → 409
```

Las dos peticiones son iguales: nada en ellas dice de cuál organización son. Globex recibe `409` y `Ya existe una empresa con ese NIT.`, por una empresa que nunca registró. Y `curl http://localhost:5000/empresas/emp-160` le muestra a globex la ficha de acme.

Aclaremos los niveles. Una **`Empresa`** es un stream, lo que llevas todo el taller construyendo. Un **tenant** es la **organización que usa la plataforma**: acme, globex. Cada tenant administra sus streams, y los de un tenant no deben verse desde otro. El `409` no viene de una consulta: viene de la llave del localizador, el NIT, que es una para todas las organizaciones. Un filtro en las consultas no arregla una llave. Marten separa a las organizaciones en el motor con **tenancy**: cada hecho y cada documento llevan su tenant, en su llave, y una sesión abierta para un tenant solo ve lo suyo. Contabilidad e Impuestos guardan así a sus organizaciones, en las mismas tablas.

## 🔧 Paso 1 · Cada hecho y cada documento, con su tenant

> 🆕 **Tenancy conjoined.** `opts.Events.TenancyStyle = TenancyStyle.Conjoined;` (de `JasperFx.MultiTenancy`) guarda todos los tenants en las mismas tablas, con una columna `tenant_id`. La llave de `mt_streams` pasa a ser `(tenant_id, id)`: acme y globex pueden tener cada uno su `emp-1`. `opts.Policies.AllDocumentsAreMultiTenanted();` hace lo mismo con cada documento: tus vistas y tu localizador. La otra forma es una base o un esquema por tenant: más aislamiento físico, y más bases que operar.

Marten no puede cambiar la llave de las tablas que ya tienes: sobre tu base, el primer registro responde `500` con `MartenSchemaException: DDL Execution for 'All Configured Changes' Failed!`, y tus tests caen igual. Crea una base nueva para tu servicio y recrea la de tus tests, las dos con las tablas de Facturación, como en [El arnés usa la misma configuración](./el-arnes-usa-la-misma-configuracion.md):

```bash
docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas;"
docker exec empresas-db psql -U postgres -c "DROP DATABASE empresas_tests WITH (FORCE);" -c "CREATE DATABASE empresas_tests;"
docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas"
docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas_tests"
```

Desde la raíz de tu solución, apunta a la base nueva tu servicio y tu directorio de secretos, como en [La configuración viene de afuera](./la-configuracion-viene-de-afuera.md). En PowerShell, la variable va con `$env:CADENA_POSTGRES = "…"` y el archivo con `Set-Content`, como allá. Si usas CosmosLens, arráncalo con la cadena nueva. Tus empresas de antes se quedan en la base vieja: llevarlas a un tenant es una migración aparte.

```bash
export CADENA_POSTGRES="Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=empresas"
dotnet user-secrets set "ConnectionStrings:Postgres" "$CADENA_POSTGRES" --project Empresas.Historia
echo "$CADENA_POSTGRES" > ~/secretos-empresas/ConnectionStrings__Postgres
```

> 🛠️ **Inténtalo tú.** En el `AddMarten` de tu `AgregarEmpresas`, agrega las dos líneas de la tenancy, después de la de `StreamIdentity`. Arranca tu servicio y registra emp-160 con el mismo `curl` del dolor. Luego mira dónde quedó, con `docker exec -it empresas-db psql -U postgres -d empresas`:
>
> ```sql
> SELECT tenant_id, id FROM mt_streams;
> -- *DEFAULT* | emp-160
> ```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, con using JasperFx.MultiTenancy; para TenancyStyle
opts.Events.StreamIdentity = StreamIdentity.AsString;
opts.Events.TenancyStyle = TenancyStyle.Conjoined;   // cada hecho, con su tenant: mt_events.tenant_id
opts.Policies.AllDocumentsAreMultiTenanted();        // cada documento también: las vistas y el localizador
```

</details>

El registro respondió `202`, como siempre. El hecho quedó en `*DEFAULT*`, el tenant que Marten usa cuando nadie le dice cuál. Tu servicio todavía no sabe de qué organización es la petición.

## 🔧 Paso 2 · La petición dice de qué tenant es

Por ahora, el tenant llega en un header de la petición, `X-Tenant-Id`, como en Contabilidad. Lo escribe quien llama.

> 🆕 **El tenant, en el bus.** El bus de la petición lleva un `TenantId`, como lleva la `CorrelationId` que le pusiste en [Seguir una acción](./seguir-una-accion.md). Wolverine lo copia al sobre de todo lo que la petición invoca o envía. Y abre la sesión de cada handler con el tenant de su sobre.

> 🛠️ **Inténtalo tú.** En tu `app.Use` de la correlación, lee el header `X-Tenant-Id` y, si trae algo, ponlo en `bus.TenantId`. Repite los dos registros del dolor, con `-H "X-Tenant-Id: acme"` y `-H "X-Tenant-Id: globex"`: los dos dan `202`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, dentro de tu app.Use, junto a la correlación
var tenant = contexto.Request.Headers["X-Tenant-Id"].ToString();
if (!string.IsNullOrWhiteSpace(tenant)) bus.TenantId = tenant;   // de qué organización es la petición
```

</details>

Ahora pide la empresa de globex, como globex: `curl -H "X-Tenant-Id: globex" http://localhost:5000/empresas/emp-161`. Responde `404`. El registro quedó en globex, y la lectura no: tu endpoint recibe la `IQuerySession` del contenedor, y la que registra Marten se abre sin tenant, en `*DEFAULT*`.

## 🔧 Paso 3 · Las consultas, con su tenant

> 🆕 **Tu propia `IQuerySession`.** `builder.Services.AddScoped<IQuerySession>(s => …)` registra la tuya; la `s` es el contenedor, al que le pides lo que necesitas. Si va después de `AgregarEmpresas`, el contenedor usa la tuya, la última registrada, y crea una por petición. `store.QuerySession(tenant)` abre una sesión que solo ve ese tenant. Los handlers no la usan: Wolverine les abre la suya con el tenant del sobre.

> 🛠️ **Inténtalo tú.** Quiero esto:
>
> ```
> GET /empresas/emp-161   X-Tenant-Id: globex   → 200, Vidriería Andina, Premium
> GET /empresas/emp-160   X-Tenant-Id: globex   → 404
> ```
>
> Haz que funcione: después de `builder.AgregarEmpresas(...)`, registra tu `IQuerySession`. Pídele al contenedor el `IDocumentStore` y el `IMessageContext`, y abre la sesión con el `TenantId` de ese bus.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs, después de builder.AgregarEmpresas(...)
builder.Services.AddScoped<IQuerySession>(s =>
    s.GetRequiredService<IDocumentStore>().QuerySession(s.GetRequiredService<IMessageContext>().TenantId!));   // las consultas, en el tenant del bus
```

</details>

Sin header, `TenantId` es `null`: el `!` solo calla al compilador, y Marten abre la sesión en `*DEFAULT*`. `SELECT tenant_id, data->>'Stream' FROM mt_doc_localizador WHERE id = '916000000';` muestra el NIT tres veces: en acme, en globex, y en `*DEFAULT*` el del Paso 1. En CosmosLens, la lista de Streams muestra el tenant de cada stream.

## 💥 El default silencioso

Mira otra vez `mt_streams`:

```sql
SELECT tenant_id, id FROM mt_streams WHERE id LIKE 'emp-16%' ORDER BY created;
-- *DEFAULT* | emp-160
-- acme      | emp-160
-- globex    | emp-161
```

La fila de `*DEFAULT*` es el registro del Paso 1. Respondió `202`, y ninguna organización la ve: para acme, ese hecho no existe. Quien llame sin el header hace lo mismo hoy. Registra emp-162 sin `X-Tenant-Id`: `202`, y cae en `*DEFAULT*`. Un contexto que falta y que el sistema rellena solo no se nota hasta que alguien pregunta por un dato que "desapareció".

## 🔧 Paso 4 · Sin tenant, falla

> 🆕 **Fail-fast.** `opts.Advanced.DefaultTenantUsageEnabled = false;` apaga el tenant por defecto: abrir una sesión sin tenant lanza `DefaultTenantUsageDisabledException`, en vez de caer en `*DEFAULT*`.

> 🛠️ **Inténtalo tú.** Agrega esa línea junto a las de la tenancy, reinicia, y registra emp-163 sin `X-Tenant-Id`:
>
> ```
> 500   "detail": "Default tenant *DEFAULT* usage is disabled. Ensure to create a session by explicitly passing a non-default tenant in the method arg or SessionOptions."
> ```
>
> Wolverine abrió la sesión del handler con el tenant del sobre, `*DEFAULT*`, y Marten lanzó antes de que corriera el handler: `SELECT count(*) FROM mt_streams WHERE id = 'emp-163';` da 0. Un `GET` sin header da el mismo `500`, desde tu `IQuerySession`.

Una siembra con `store.LightweightSession()` también lanza: desde aquí, una siembra abre `store.LightweightSession("acme")`. Corre ahora tu worker con `emp-160;Premium`. Lanza la misma excepción: no corre en una petición, y nadie le dice el tenant. El archivo de Comercial tampoco lo dice.

> 🆕 **`bus.InvokeForTenantAsync(tenant, comando)`.** Invoca el comando con ese tenant en el sobre, sin petición de por medio.

> 🛠️ **Inténtalo tú.** Comercial manda un archivo por organización. Que el worker reciba el tenant como segundo argumento, `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv acme`, y que invoque con él. Debe imprimir `emp-160: plan Premium`, y `curl -H "X-Tenant-Id: acme" http://localhost:5000/empresas/emp-160` debe decir `Premium`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Worker/Program.cs
var tenant = args[1];   // la organización del archivo
foreach (var linea in await File.ReadAllLinesAsync(args[0]))
{
    var campos = linea.Split(';');
    await bus.InvokeForTenantAsync(tenant, new CambiarPlanDeEmpresa(campos[0], campos[1]));
    Console.WriteLine($"{campos[0]}: plan {campos[1]}");
}
```

</details>

### El tenant viaja en el sobre

Suspende emp-160 de acme: `curl -X POST http://localhost:5000/empresas/emp-160/suspender -H "X-Tenant-Id: acme"`. Facturación y Accesos contestan, y cada respuesta llega al proceso con el tenant acme:

```sql
SELECT tenant_id, type FROM mt_events WHERE stream_id = 'susp-emp-160-3' ORDER BY version;
-- acme | suspension_solicitada
-- acme | cobro_de_multa_confirmado
-- acme | revocacion_de_accesos_confirmada
-- acme | suspension_efectiva
```

El orden de las dos respuestas del medio puede cambiar. Diez segundos después corre el plazo, sin ninguna petición: tu log dice `susp-emp-160-3: el mensaje no cambia el proceso, se descarta`, y `wolverine_dead_letters` sigue sin filas de `RevisarSuspension`. Esos handlers corren fuera de tu petición: abren su sesión con el tenant del sobre.

## 🔨 Rómpelo: la petición dice acme, el sobre dice globex

En tu `MapPost("/empresas", ...)`, cambia `bus.InvokeAsync(cmd)` por `bus.InvokeForTenantAsync("globex", cmd)`. Registra emp-164, NIT 916400000, con `-H "X-Tenant-Id: acme"`: `202`. `SELECT tenant_id FROM mt_streams WHERE id = 'emp-164';` da `globex`. El handler corrió dentro de la petición de acme, y escribió en globex: Wolverine abrió su sesión con el tenant del sobre. La librería de la organización lo resuelve al revés: su store le pide el tenant a una pieza que mira primero la petición HTTP, y con este mismo pedido escribe en acme. Con Wolverine, gana el del sobre. Devuelve tu `InvokeAsync`.

Ahora comenta `opts.Policies.AllDocumentsAreMultiTenanted();` y arranca. No arranca:

```
JasperFx.Events.Projections.InvalidProjectionException: Tenancy storage style mismatch between the events (Conjoined) and the aggregate type VistaSuspendida (Single)
```

`VistaSuspendida` guarda un documento por stream, como `EmpresaDetalle`, y el stream ya tiene tenant. Su documento tiene que llevarlo también: si no, dos `emp-1` de dos tenants caerían en el mismo documento. Descoméntala.

## El Descubrimiento

Un **contexto que falta**, el tenant, es un bug traicionero: si el sistema lo rellena con un valor por defecto, no hay error, solo datos que quedan en la organización equivocada. La cura no es acordarse siempre. Es **fail-fast**: que la falta del tenant sea un error en la puerta (`DefaultTenantUsageEnabled = false`). La tenancy conjoined separa a las organizaciones en la misma base, con el tenant en la llave. El tenant viaja: el borde lo pone en el bus, el sobre lo lleva a cada handler, también a los que corren sin petición, y una consulta abre su sesión con él. Lo que no nace en una petición, como tu worker, lo dice con `InvokeForTenantAsync`.

> 🌱 Tu `HostConDaemon` arranca con `AgregarEmpresas`: ya corre con tenancy y con fail-fast, y no lo tocaste. Lo que no sabes es si tus tests siguen verdes, ni si alguno prueba que acme no ve lo de globex: [Probar que aísla](./probar-que-aisla.md).

## ✅ Compruébalo

- [ ] Distingues **tenant** (la organización que usa la plataforma) de **`Empresa`** (un stream dentro del tenant).
- [ ] Sin tenancy, globex recibió `409` por el NIT de acme y vio la ficha de acme.
- [ ] Con la tenancy y sin header, el registro dio `202` y quedó en `*DEFAULT*`.
- [ ] Con `X-Tenant-Id` en el bus y tu `IQuerySession`, acme y globex registran el mismo NIT, y cada uno ve solo su empresa.
- [ ] Con `DefaultTenantUsageEnabled = false`, un registro sin header da `500` y no deja nada; tu worker invoca con `InvokeForTenantAsync`.
- [ ] El proceso de emp-160, con las respuestas de Facturación y Accesos y el plazo, quedó entero en acme, y un `InvokeForTenantAsync("globex", …)` dentro de una petición de acme escribió en globex.

## 🆘 Si algo salió mal

- **Un registro responde `500` con `MartenSchemaException: DDL Execution … Failed!`, y el log dice `42710: constraint "fkey_mt_events_stream_id_tenant_id" … already exists`:** tu servicio sigue en la base vieja. Revisa `dotnet user-secrets list --project Empresas.Historia`.
- **`TenancyStyle` no compila:** vive en `JasperFx.MultiTenancy`.
- **Todo da `500` con `Default tenant *DEFAULT* usage is disabled`, también con el header:** tu `app.Use` no pone `bus.TenantId`, o tu `IQuerySession` no lo lee del bus.
- **Con el header, globex sigue sin ver su empresa:** tu `IQuerySession` va antes de `AgregarEmpresas`, y gana la de Marten.
- **El worker lanza `IndexOutOfRangeException`:** le falta el tenant después del archivo: `dotnet run -- ../cambios.csv acme`.
- **El worker lanza `Falta ConnectionStrings:Postgres.` o `MartenSchemaException`:** revisa `DirectorioDeSecretos` y `~/secretos-empresas/ConnectionStrings__Postgres`.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Empresas es multi-tenant con tenancy conjoined: hechos y documentos llevan su tenant, y sin tenant Marten lanza (`DefaultTenantUsageEnabled = false`). El borde pone el tenant en el bus; los handlers lo toman del sobre, y las consultas abren su sesión con él. Un proceso sin petición lo dice con `InvokeForTenantAsync`.

> 💭 **Reto:** ¿por qué un tenant que falta y se rellena con un valor por defecto es más peligroso que uno que lanza un error? ¿Por qué el handler del plazo toma el tenant del sobre y no de una petición?

```bash
git add .
git commit -m "ES · El contexto que falta (tenancy conjoined, el tenant en el bus, fail-fast)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un tenant que falta es peligroso cuando el sistema lo rellena con un valor por defecto, porque deja el hecho en la organización equivocada sin error; la cura es la tenancy **conjoined**, que separa a las organizaciones en la misma base con el tenant en la llave, más **fail-fast**, con el tenant puesto una vez en el borde y llevado por el sobre a cada handler.

---

[⬅️ Volver: En vivo y serverless](./en-vivo-y-serverless.md)

[➡️ Siguiente: Probar que aísla](./probar-que-aisla.md)
