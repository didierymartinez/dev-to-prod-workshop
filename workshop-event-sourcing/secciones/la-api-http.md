# La API HTTP: el sistema empieza a recibir órdenes

Tu motor decide, rutea y guarda, y está cubierto por tests ([Given-When-Then](given-when-then.md)). Pero solo lo arrancas **tú**, desde un `Program.cs` de demo. Un sistema real recibe órdenes de afuera.

## 🎯 El Objetivo

Exponer el motor por HTTP: **POST** un comando (y responder `202 Accepted`), **GET** una empresa (y devolver su estado en JSON) — con la app corriendo y respondiendo a `curl`.

## 💥 El dolor: nadie de afuera puede hablarle a tu motor

Un frontend, otro servicio, o tú desde la terminal: nadie puede mandarle un `SuspenderEmpresa` ni preguntar cómo quedó `emp-7`. El motor está vivo solo mientras corre tu `Program.cs` de juguete, y muere con él. Le falta una **puerta**: endpoints HTTP que reciban comandos y devuelvan estado.

## 🔧 Minimal API sobre el despachador

Quieres poder manejar tu sistema entero desde `curl` — crear, actuar, consultar:

```bash
# crear una empresa
curl -X POST localhost:5000/api/empresas \
  -H "Content-Type: application/json" \
  -d '{"empresaId":"emp-7","nombre":"Constructora Andes","plan":"Básico"}'
# → 202 Accepted

# suspenderla
curl -X POST localhost:5000/api/empresas/emp-7/suspender \
  -H "Content-Type: application/json" -d '{"motivo":"falta de pago"}'
# → 202 Accepted

# consultar cómo quedó
curl localhost:5000/api/empresas/emp-7
# → {"nombre":"Constructora Andes","plan":"Básico","suspendida":true}
```

Para el `POST` de alta te falta una pieza: un comando que **cree** la empresa. Constrúyelo como los otros handlers.

> 🛠️ **Inténtalo tú (2 pasos).**
> 1. Un comando `RegistrarEmpresa(string EmpresaId, string Nombre, string Plan)` y su `RegistrarEmpresaHandler` (implementa `ICommandHandler<RegistrarEmpresa>`): abre el stream y hace `Append(new EmpresaRegistrada(...))`.
> 2. Una **Minimal API** en `Program.cs`: registra el `EventStore` y el `Despachador` en el contenedor ([Inyección de dependencias](inyeccion-de-dependencias.md)), y expón tres endpoints — `POST /api/empresas` (envía el comando de alta), `POST /api/empresas/{id}/suspender`, y `GET /api/empresas/{id}` (rehidrata con el stream y devuelve su estado).

> [!NOTE]
> 🆕 **Idioma de C#: Minimal API.** `WebApplication.CreateBuilder(args)` arma la app; `app.MapPost("/ruta/{id}", (…) => …)` y `app.MapGet(...)` cablean un endpoint a una función. Los parámetros de esa función se **resuelven solos**: `{id}` viene de la ruta, un parámetro tipo `record` viene del **cuerpo** JSON, y un servicio registrado (tu `Despachador`) viene del **contenedor**. `Results.Accepted()` / `Results.Ok(objeto)` fijan el código HTTP y el cuerpo de la respuesta.

> [!NOTE]
> **¿Por qué `202 Accepted` y no `200 OK`?** El `200` promete *"terminé y aquí está el resultado"*. Pero un comando puede no tener resultado inmediato: el hecho quedó guardado, y lo que se derive de él —las vistas de lectura que construirás con proyecciones— puede tardar un instante en estar listo. `202` dice la verdad: *"recibí tu orden, la acepté"*. Cuando lleguen las proyecciones async, ese `202` cobrará todo su sentido.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// el comando de alta y su handler (como SuspenderHandler, pero crea el stream)
public record RegistrarEmpresa(string EmpresaId, string Nombre, string Plan);

public class RegistrarEmpresaHandler(EventStore store) : ICommandHandler<RegistrarEmpresa>
{
    public void Handle(RegistrarEmpresa cmd) =>
        store.AbrirStream<Empresa>(cmd.EmpresaId).Append(new EmpresaRegistrada(cmd.Nombre, cmd.Plan));
}
```

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<EventStore>();               // el almacén vive mientras viva la app
builder.Services.AddSingleton(sp =>                        // el despachador, con sus handlers registrados
{
    var store = sp.GetRequiredService<EventStore>();
    var despachador = new Despachador();
    despachador.Registrar(new RegistrarEmpresaHandler(store));
    despachador.Registrar(new SuspenderHandler(store));
    despachador.Registrar(new CambiarPlanHandler(store));
    return despachador;
});

var app = builder.Build();

app.MapPost("/api/empresas", (RegistrarEmpresa cmd, Despachador despachador) =>
{
    despachador.Enviar(cmd);
    return Results.Accepted($"/api/empresas/{cmd.EmpresaId}");
});

app.MapPost("/api/empresas/{id}/suspender", (string id, SuspenderBody body, Despachador despachador) =>
{
    despachador.Enviar(new SuspenderEmpresa(id, body.Motivo));
    return Results.Accepted();
});

app.MapGet("/api/empresas/{id}", (string id, EventStore store) =>
{
    var empresa = store.AbrirStream<Empresa>(id).Get();     // rehidrata desde sus hechos
    return Results.Ok(new { empresa.Nombre, empresa.Plan, empresa.Suspendida });
});

app.Run("http://localhost:5000");

public record SuspenderBody(string Motivo);
```

*(El `EventStore` es **singleton**: si fuera por-petición, cada `curl` hablaría con un almacén vacío. El endpoint de consulta usa el **stream** para rehidratar, no toca el `store` directo — la regla de [El almacén: un cajón por empresa](el-almacen-por-id.md).)*
</details>

## 🔍 ¿Lo lograste?

Corre `dotnet run` y lanza los tres `curl` de arriba, en orden. Deberías ver **`202`** en los dos `POST`, y el `GET` devolver `{"nombre":"Constructora Andes","plan":"Básico","suspendida":true}`. Acabas de manejar tu motor de eventos por la red — la misma empresa, creada, suspendida y consultada, sin tocar el código.

---

## Lo que construiste

El motor dejó de ser un `Program.cs` de demo: es un **servicio** que recibe comandos por HTTP y devuelve estado. El `POST` entrega el comando al despachador y responde `202` (aceptado, no necesariamente terminado); el `GET` rehidrata la empresa desde sus hechos y la sirve en JSON. Desde aquí, cada capacidad nueva del taller será algo que puedes **tocar con un `curl`**.

> [!NOTE]
> 🌱 **Semilla — el viaje en el tiempo, casi gratis.** Tu `GET` devuelve el estado **actual**. Pero como la empresa se reconstruye de sus hechos, podrías pedir *cómo era en la versión 3* rehidratando solo hasta ese hecho. Hoy tu stream no lo ofrece; cuando reveles Marten, `AggregateStreamAsync(id, version)` te lo dará **de fábrica** ([Rehidratar con Marten](rehidratar-con-marten.md)).

---

## ✅ Compruébalo

- [ ] `POST /api/empresas` crea una empresa (comando `RegistrarEmpresa` + handler) y responde `202`.
- [ ] `POST /api/empresas/{id}/suspender` la suspende vía el despachador y responde `202`.
- [ ] `GET /api/empresas/{id}` rehidrata con el stream y devuelve `nombre`, `plan` y `suspendida` en JSON.
- [ ] Explicas por qué el `EventStore` es **singleton** y por qué un comando responde `202`, no `200`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué un comando responde `202 Accepted` en vez de `200 OK`? ¿Por qué el `GET` puede reconstruir la empresa sin guardar su estado en ninguna tabla?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · La API HTTP" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una **Minimal API** convierte tu motor en un servicio: los `POST` entregan comandos al despachador y responden **`202 Accepted`** (aceptado, no terminado), y el `GET` **rehidrata** la empresa desde sus hechos y la sirve en JSON — el sistema, por fin, recibe órdenes de afuera.

---

[⬅️ Volver: De `new` al contenedor (Inyección de Dependencias)](./inyeccion-de-dependencias.md)

[➡️ Siguiente: Persistencia real (Docker y PostgreSQL)](./docker-postgres.md)
