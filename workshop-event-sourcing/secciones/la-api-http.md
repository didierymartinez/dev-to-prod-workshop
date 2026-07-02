# La API HTTP: háblale al sistema desde afuera

Tu motor ya guarda muchas empresas por id, numera cada hecho en un sobre y rechaza escrituras que chocan. Pero solo cobra vida cuando **tú** corres `dotnet run`: arranca, ejecuta la secuencia que escribiste en `Main`, y muere. Una empresa real no funciona así — recibe peticiones a toda hora, desde afuera.

## 🎯 El Objetivo

Exponer el sistema por HTTP: **enviar un comando con un `POST`** y **consultar una empresa con un `GET`**, y comprobarlo hablándole con `curl`.

## 💥 El dolor: el sistema vive encerrado en `Main`

Todo lo que construiste —el almacén, el despachador, los handlers— solo se ejecuta dentro de `Main`, en el orden que tú escribiste a mano:

```csharp
// hoy: para suspender una empresa, editas Main y recompilas
var store = new EventStore();
var despachador = new Despachador();
despachador.Registrar(new SuspenderHandler(store));
despachador.Registrar(new CambiarPlanHandler(store));
despachador.Enviar(new SuspenderEmpresa("emp-7", "falta de pago"));
```

Nadie más puede pedirle nada: ni otra app, ni un navegador, ni un `curl`. Para suspender una empresa hay que **editar el código**. Eso no es un sistema; es un script.

## 🔧 Lo que quiero poder hacer

El objetivo, en dos comandos de terminal. Esto es lo que quiero que funcione al final:

```bash
# 1. suspender la empresa emp-7 (un comando, por POST)
curl -i -X POST http://localhost:5000/api/empresas/emp-7/suspender \
     -H "Content-Type: application/json" -d '{"motivo":"falta de pago"}'
# → HTTP/1.1 202 Accepted

# 2. consultar cómo quedó (una lectura, por GET)
curl http://localhost:5000/api/empresas/emp-7
# → {"nombre":"Constructora Andes","plan":"Básico","suspendida":true}
```

Fíjate en el reparto: el **comando** (suspender) va por `POST` y responde **`202 Accepted`** —"recibí tu orden, la procesé"—; la **consulta** va por `GET` y devuelve el estado en JSON. Vamos a hacer que esos dos `curl` respondan.

> [!NOTE]
> 🆕 **Idioma de C#: la Minimal API.** Para atender HTTP, .NET trae la *Minimal API*. Tres piezas nuevas que verás en la solución:
> - `WebApplication.CreateBuilder(args)` → `builder.Build()` — arma la aplicación web (y su **contenedor**, que usamos en el Paso 2).
> - `app.MapPost("ruta", (parámetros) => …)` y `app.MapGet(...)` — conectan una ruta a una función. Los parámetros que declaras (`string id`, un `record` del cuerpo, un servicio) **se rellenan solos**: el id sale de la ruta, el `record` del cuerpo JSON, el servicio del contenedor.
> - `Results.Accepted(...)` (→ 202) y `Results.Ok(objeto)` (→ 200 + el objeto en JSON) — la respuesta HTTP.

### Paso 1 · Convierte el proyecto en una app web

Tu proyecto es de consola. Para que exista `WebApplication`, cámbiale el **SDK** en el `.csproj` (una palabra):

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">   <!-- antes decía: Microsoft.NET.Sdk -->

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

</Project>
```

Eso es todo: el `Sdk.Web` trae el servidor web y las APIs de arriba. Tus clases (`EventStore`, `Empresa`, los handlers) no cambian.

### Paso 2 · Registra tus piezas en el contenedor

La app web trae un **contenedor** que fabrica tus piezas por ti; regístralas ahí en vez de hacer `new` dentro de `Main`.

> 🛠️ **Inténtalo tú.** En `Program.cs`, tras `CreateBuilder`, registra en `builder.Services`: el `EventStore` (uno solo para toda la app → `AddSingleton`), cada handler (`AddSingleton`), y el `Despachador` con una función que le registra los dos handlers que el contenedor fabricó. *(No te preocupes por **cómo** funciona el contenedor por dentro: eso lo abrimos en la próxima sección. Aquí solo lo usas.)*

### Paso 3 · Mapea los endpoints

> 🛠️ **Inténtalo tú.** Tras `builder.Build()`: (1) siembra `emp-7` para tener qué consultar; (2) mapea `POST /api/empresas/{id}/suspender` y `.../cambiar-plan` → arman el comando con el `id` de la ruta y el dato del cuerpo, lo pasan al despachador, y devuelven `202`; (3) mapea `GET /api/empresas/{id}` → abre el stream, rehidrata con `Get()` y devuelve la empresa. Fija el puerto en `app.Run("http://localhost:5000")` para que los `curl` de arriba peguen.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

`Program.cs` completo (tus clases —`EventStore`, `Empresa`, handlers, comandos— siguen en sus archivos, sin cambios):

```csharp
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Paso 2 · registra las piezas en el contenedor (en vez de new en Main)
builder.Services.AddSingleton<EventStore>();                 // UNO solo para toda la app
builder.Services.AddSingleton<SuspenderHandler>();           // el contenedor le inyecta el EventStore
builder.Services.AddSingleton<CambiarPlanHandler>();
builder.Services.AddSingleton<Despachador>(sp =>
{
    var d = new Despachador();
    d.Registrar(sp.GetRequiredService<SuspenderHandler>());  // registrados UNA vez, como en el almacén
    d.Registrar(sp.GetRequiredService<CambiarPlanHandler>());
    return d;
});

var app = builder.Build();

// Paso 3.1 · siembra una empresa para tener qué consultar
var store = app.Services.GetRequiredService<EventStore>();
store.AbrirStream<Empresa>("emp-7").Append(new EmpresaRegistrada("Constructora Andes", "Básico"));

// Paso 3.2 · comandos: POST → arma el comando → despachador → 202 Accepted
app.MapPost("/api/empresas/{id}/suspender", (string id, MotivoBody body, Despachador despachador) =>
{
    despachador.Enviar(new SuspenderEmpresa(id, body.Motivo));
    return Results.Accepted($"/api/empresas/{id}");
});

app.MapPost("/api/empresas/{id}/cambiar-plan", (string id, PlanBody body, Despachador despachador) =>
{
    despachador.Enviar(new CambiarPlanDeEmpresa(id, body.NuevoPlan));
    return Results.Accepted($"/api/empresas/{id}");
});

// Paso 3.3 · consulta: GET → rehidrata → JSON
app.MapGet("/api/empresas/{id}", (string id, EventStore store) =>
{
    var empresa = store.AbrirStream<Empresa>(id).Get();
    return Results.Ok(empresa);
});

app.Run("http://localhost:5000");   // puerto fijo, para que los curl peguen

// los datos que cada POST recibe en el cuerpo (lo que el comando necesita además del id)
record MotivoBody(string Motivo);
record PlanBody(string NuevoPlan);
```
</details>

> [!NOTE]
> **Un endpoint solo traduce.** Mira el `MapPost`: no tiene lógica de negocio. Toma el `id` de la ruta y el dato del cuerpo, arma el **comando** y se lo pasa al **despachador** — el mismo que construiste en [El despachador](el-despachador.md). La API es una **puerta de entrada**: convierte una petición HTTP en un comando y deja que el motor haga el resto. Por eso el `POST` no espera un resultado del dominio: responde `202 Accepted` ("acepté la orden"), no `200 OK` con datos.

> 🔍 **¿Lo lograste?** Arranca la app con `dotnet run` (déjala corriendo) y, en **otra terminal**, lanza los dos `curl` del objetivo. El primero debe responder `202 Accepted`; el segundo, el JSON con `"suspendida":true`. Si es así, tu motor ya atiende peticiones desde afuera — sin que nadie edite el código.

---

### El Descubrimiento

Sacaste el sistema de `Main` y lo pusiste detrás de una **API HTTP**: los comandos entran por `POST` y responden `202 Accepted`, las consultas salen por `GET` en JSON. El endpoint no decide nada: **traduce** la petición en un comando y se lo entrega al despachador. Y para armar las piezas dejaste de usar `new` a mano: las **registraste en el contenedor** que trae la app web.

Ese contenedor hizo algo curioso: cuando pediste un `SuspenderHandler`, supo que su constructor necesita un `EventStore` y **se lo inyectó**. ¿Cómo? Por ahora es una caja negra que funciona. En la próxima sección la abrimos: verás que no es magia.

> [!NOTE]
> 🌱 **Semilla — estos endpoints se volverán `async`.** Hoy el `POST` llama al despachador y responde al instante, porque todo vive en RAM. Cuando el almacén hable con una **base de datos real** (unas secciones más), cada operación será una **espera** de red — y estos métodos pasarán a `async` para no congelar el servidor. Lo haremos en [El tiempo de espera](el-tiempo-de-espera.md), justo antes de que la espera sea real.

> [!NOTE]
> 🌱 **Semilla — de sembrar a registrar.** Hoy sembramos `emp-7` a mano para tener qué consultar. La operación que **crea** una empresa (un `RegistrarEmpresa`) es otro endpoint más, con el mismo patrón: un `POST` que arma su comando. Lo tendrás en el capstone, cuando montes un contexto de punta a punta.

---

## ✅ Compruébalo

- [ ] Cambiaste el `.csproj` a `Microsoft.NET.Sdk.Web` y el proyecto compila.
- [ ] `dotnet run` levanta la app en `http://localhost:5000` y queda escuchando.
- [ ] Un `POST` a `/api/empresas/emp-7/suspender` responde **`202 Accepted`**.
- [ ] Un `GET` a `/api/empresas/emp-7` devuelve el JSON con `"suspendida":true`.
- [ ] Explica por qué el endpoint responde `202` (aceptó el comando) y no `200` con datos, y qué hace realmente (traducir HTTP → comando → despachador).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 El endpoint no tiene lógica de negocio. ¿Qué hace entonces, y por qué un comando responde `202 Accepted` en vez de `200 OK` con datos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · La API HTTP" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una **Minimal API** saca el sistema de `Main`: un `POST` **traduce** la petición en un comando y se lo pasa al despachador (respondiendo `202 Accepted`), un `GET` rehidrata la empresa y la devuelve en JSON; y las piezas se **registran en el contenedor** de la app en vez de armarse con `new`.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

[➡️ Siguiente: El contenedor por dentro (inyección de dependencias)](./el-contenedor-por-dentro.md)
