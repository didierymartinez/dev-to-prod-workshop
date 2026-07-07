# Lección 4.3 — Crear empresas (POST)

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu API podrá **recibir** una empresa nueva por POST, validarla y responder con el código correcto (`201` si se creó, `400` si los datos venían mal).

> 🧭 **Cómo se aprende aquí.** Te muestro el código, te explico cada pieza, predices el código de respuesta, y al final un "Ahora tú".

---

## 🤔 El problema

Listar (GET) es la mitad. Una API útil también deja **crear** datos: recibe información en el cuerpo de la petición, la revisa (¿vienen completos los datos?) y responde según el resultado. Aquí implementas el lado servidor del POST que practicaste en la Fase 3.

---

## 💡 Recibir, validar, responder

Tres ideas en juego:
- **Recibir del body:** en un `POST` el cliente manda datos en el **body** en JSON. .NET los convierte solos en un objeto C# si los pides como parámetro.
- **Validar antes de guardar:** nunca confíes en que los datos llegan bien. Si falta el NIT o la razón social, la API debe **rechazar** con `400 Bad Request`, no guardar basura.
- **Responder con el código correcto:** `Results.Created` (201) al crear, `Results.BadRequest` (400) si algo falta, `Results.Ok` (200) para lo normal.

---

## 🛠️ Manos a la obra

### Paso 1 · Preparar el modelo de entrada y el método del repositorio

Lo que el cliente envía al crear **no es** una `Empresa` completa: es solo lo que él conoce (razón social, NIT, plan). Le damos su propia forma.

**Te muestro.** En `Models/Empresa.cs`, agrega debajo de la clase `Empresa`:

```csharp
// Lo que el cliente envía al crear (sin nada que ponga el servidor)
public record CrearEmpresaRequest(string RazonSocial, string Nit, string Plan);
```

Y en `Repositorio/EmpresaRepositorio.cs`, agrega el método `Crear` dentro de la clase (junto a `ObtenerTodas`):

```csharp
public Empresa Crear(CrearEmpresaRequest req)
{
    var empresa = new Empresa { Nit = req.Nit, RazonSocial = req.RazonSocial, Plan = req.Plan };
    _empresas.Add(empresa);
    return empresa;
}
```

**Te explico:**

> 🆕 **`CrearEmpresaRequest` y `Crear`.**
> - `CrearEmpresaRequest` es un `record` (como los de la Fase 2): describe **lo que llega** en el POST. No incluye `Activa` porque eso lo decide el servidor (por defecto `true`).
> - `Crear(...)` arma una `Empresa` con los datos recibidos, la mete en la lista con `_empresas.Add(...)`, y la devuelve. Agregamos este método **ahora** porque **ahora** un endpoint lo va a usar — no antes.

### Paso 2 · El endpoint POST

**Te muestro.** En `Program.cs`, agrega este endpoint después del `GET /empresas` y antes de `app.Run();`:

```csharp
// POST /empresas → registra una empresa nueva
app.MapPost("/empresas", (CrearEmpresaRequest req) =>
{
    // Validación: los datos obligatorios deben venir
    if (string.IsNullOrWhiteSpace(req.RazonSocial))
        return Results.BadRequest(new { mensaje = "La razón social es obligatoria." });

    if (string.IsNullOrWhiteSpace(req.Nit))
        return Results.BadRequest(new { mensaje = "El NIT es obligatorio." });

    // Si todo está bien, crear y responder 201
    var creada = repo.Crear(req);
    return Results.Created($"/empresas/{creada.Nit}", creada);
});
```

**Te explico:**

> 🆕 **El endpoint que recibe y responde.**
> - `app.MapPost("/empresas", (CrearEmpresaRequest req) => ...)`: `MapPost` atiende peticiones **POST**. .NET arma `req` **automáticamente** con el JSON del body.
> - `string.IsNullOrWhiteSpace(...)` (lo viste en la Fase 2) revisa si un texto vino vacío. Si falta algo, `return Results.BadRequest(...)` responde **400** con un mensaje. El `new { mensaje = "..." }` es un objeto que se vuelve el JSON `{ "mensaje": "..." }`.
> - `repo.Crear(req)` guarda; `Results.Created(url, dato)` responde **201** e indica dónde quedó el recurso.

> 🔮 **Predice, luego Send.** Reinicia (`Ctrl+C`, `dotnet run`). En Postman: **POST** a `http://localhost:5000/empresas`, Body → raw → JSON:
> ```json
> { "razonSocial": "Transportes Andinos S.A.S.", "nit": "811334455-6", "plan": "Profesional" }
> ```
> Antes de Send: *¿qué código esperas — 200, 201 u otro?* Envía y compáralo (debe ser **201**). Luego haz `GET /empresas`: la nueva empresa aparece.

> 🔨 **Rómpelo (provoca el 400).** Cambia el body para que la razón social venga vacía: `{ "razonSocial": "", "nit": "811334455-6", "plan": "Básico" }`. **Predice:** ¿qué código y qué mensaje? Envía y compruébalo (**400** con tu mensaje). *(Guárdalo para el commit.)*

> ✋ **Ahora tú.** Agrega una tercera validación: que el `Plan` tampoco venga vacío, respondiendo 400 con un mensaje propio.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
if (string.IsNullOrWhiteSpace(req.Plan))
    return Results.BadRequest(new { mensaje = "El plan es obligatorio." });
```
(Va junto a las otras validaciones, antes de `repo.Crear`.)
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/api-crear-empresa
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "endpoint POST /empresas con validación
>
> - Los datos del POST llegan en el ... y .NET los convierte en req porque ...
> - Validar antes de guardar sirve para ...
> - Un POST válido responde 201 y uno sin razón social responde ..., porque ..."
> ```
> ```bash
> git push -u origin feat/api-crear-empresa
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Un POST con datos válidos responde **201** y la empresa aparece luego en el GET.
- [ ] Un POST sin razón social (o sin plan) responde **400** con un mensaje claro.

**Que entendiste:**
- [ ] Puedes explicar de dónde saca .NET el objeto `req` (del **body** JSON del POST).
- [ ] Tus predicciones del código (201 vs 400) coincidieron, y sabes qué disparó cada una.
- [ ] Entiendes por qué el método `Crear` se agregó al repositorio en esta lección y no antes.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer el "Ahora tú" solo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- En un `POST`, los datos llegan en el **body**; pedir `(CrearEmpresaRequest req)` los convierte solos.
- **Validar** antes de guardar evita datos basura; se responde `400` si algo falta.
- `Results.Created` (201) y `Results.BadRequest` (400) responden con el código correcto.

---

## 🆘 Si algo salió mal

**El POST responde 400 aunque mando datos correctos.**
Revisa que en Postman elegiste **Body → raw → JSON** y que el JSON está bien formado (comillas dobles, sin coma final). Un JSON inválido nunca llega a tu código.

**Mando "razonSocial" pero llega vacío.**
Los nombres del JSON deben coincidir con los del `CrearEmpresaRequest` (`razonSocial`, `nit`, `plan`).

**La empresa creada desaparece al reiniciar el servidor.**
Es lo esperado: está en memoria. En la Fase 6 la guardaremos en una base de datos.

---

**➡️ Siguiente:** [Buscar y eliminar](04-buscar-y-eliminar.md)
