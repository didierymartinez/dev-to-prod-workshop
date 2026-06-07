# Lección 4.3 — Crear empresas (POST)

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu API podrá **recibir** una empresa nueva por POST, validarla y responder con el código correcto (`201` si se creó, `400` si los datos venían mal).

---

## 🤔 El problema

Listar empresas (GET) es solo la mitad. Una API útil también deja **crear** datos. Para eso recibe información en el cuerpo de la petición, la revisa (¿vienen completos los datos?) y responde según el resultado. Aquí implementas el lado servidor del POST que practicaste en la Fase 3.

---

## 💡 Conceptos

### Recibir datos del cuerpo (body)

En un `POST`, el cliente envía datos en el **body** en JSON (lo viste en la Fase 3). .NET puede tomar ese JSON y convertirlo automáticamente en un objeto C#. Solo tienes que pedirlo como parámetro del endpoint: `(CrearEmpresaRequest req)`.

### Validar antes de guardar

Nunca confíes en que los datos llegan bien. Si falta la razón social o el NIT, la API debe **rechazar** la petición con un `400 Bad Request` y un mensaje claro, en vez de guardar basura.

### Responder con el código correcto

.NET ofrece atajos para responder con el código adecuado:

| Atajo | Código | Cuándo |
|---|---|---|
| `Results.Created(url, dato)` | 201 | Se creó algo nuevo |
| `Results.BadRequest(mensaje)` | 400 | Los datos venían mal |
| `Results.Ok(dato)` | 200 | Todo bien, aquí están los datos |

---

## 🛠️ Manos a la obra

### Paso 1: Agregar el endpoint POST

En `Program.cs`, agrega este endpoint **después** del `GET /empresas` y antes de `app.Run();`:

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

Desglose:
- `(CrearEmpresaRequest req)` → .NET arma `req` automáticamente con el JSON que llegó en el body. Para guardar, usamos el `repo` que creamos en la lección 4.2.
- `string.IsNullOrWhiteSpace(...)` revisa si un texto vino vacío o en blanco.
- `Results.BadRequest(...)` responde **400** con un mensaje. El `new { mensaje = "..." }` crea un pequeño objeto que se convierte en JSON `{ "mensaje": "..." }`.
- `repo.Crear(req)` guarda la empresa (el método que dejamos listo en la lección 4.2).
- `Results.Created(url, dato)` responde **201** e indica en qué dirección quedó el recurso creado.

### Paso 2: Probar el caso exitoso

Reinicia el servidor (`Ctrl+C` y `dotnet run`). Abre **Postman**:

1. Método **POST**, URL `http://localhost:5000/empresas`.
2. Pestaña **Body** → **raw** → **JSON**.
3. Cuerpo:
   ```json
   {
     "razonSocial": "Transportes Andinos S.A.S.",
     "nit": "811334455-6",
     "plan": "Profesional"
   }
   ```
4. **Send**.

Resultado esperado: **201 Created**, y en el cuerpo la empresa nueva. Ahora haz un `GET /empresas`: la nueva empresa aparece en la lista.

### Paso 3: Probar el caso inválido

En Postman, cambia el body para que falte la razón social:
```json
{ "razonSocial": "", "nit": "811334455-6", "plan": "Básico" }
```
**Send**. Resultado esperado: **400 Bad Request** con `{ "mensaje": "La razón social es obligatoria." }`.

> 🧠 Acabas de hacer que tu API **se defienda** de datos malos. Una API que valida es una API confiable. Fíjate cómo el mismo endpoint responde `201` o `400` según el caso — eso es hablar HTTP con propiedad.

### Paso 4: Guardar el avance

```bash
cd ../..
git checkout -b feat/api-crear-empresa
git add .
git commit -m "agregar endpoint POST /empresas con validación"
git push -u origin feat/api-crear-empresa    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] Un POST con datos válidos responde **201** y la empresa aparece luego en el GET.
- [ ] Un POST sin razón social responde **400** con un mensaje claro.
- [ ] Entiendes que los datos del POST llegan en el **body** y .NET los convierte en `req`.

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
Los nombres del JSON deben coincidir con los del `CrearEmpresaRequest` (`razonSocial`, `nit`, `plan`). .NET no distingue mayúscula inicial, pero sí el nombre.

**La empresa creada desaparece al reiniciar el servidor.**
Es lo esperado: está en memoria. En la Fase 6 la guardaremos en una base de datos para que persista.

---

**➡️ Siguiente:** [Buscar y eliminar](04-buscar-y-eliminar.md)
