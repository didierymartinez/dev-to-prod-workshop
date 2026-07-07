# Lección 4.4 — Buscar y eliminar

> ⏱️ 30 minutos · 🎯 **Al terminar:** tu API estará completa con los cuatro endpoints: buscar una empresa por su NIT (`GET /empresas/{nit}`) y eliminar (`DELETE`), respondiendo `404` cuando no exista y `204` al eliminar.

> 🧭 **Cómo se aprende aquí.** Te muestro el código, te explico cada pieza, predices la respuesta, y al final un "Ahora tú".

---

## 🤔 El problema

Ya puedes listar y crear. Faltan dos operaciones cotidianas: **ver una empresa específica** y **eliminar** una. Ambas comparten un reto nuevo: ¿qué responder cuando la empresa que piden **no existe**? La respuesta correcta en HTTP es `404 Not Found` (lo viste consumiendo en la Fase 3; ahora lo implementas).

---

## 💡 Ruta con parámetro, y dos respuestas nuevas

- **Parámetro de ruta:** para pedir *una* empresa, su NIT va en la propia dirección: `/empresas/900123456-1`. En .NET se declara con llaves: `"/empresas/{nit}"`, y recibes `nit` como parámetro.
- **Dos atajos nuevos:** `Results.NotFound(mensaje)` responde **404** ("no existe"); `Results.NoContent()` responde **204** ("hecho, sin nada que devolver" — típico del DELETE).

---

## 🛠️ Manos a la obra

### Paso 1 · Los métodos del repositorio

**Te muestro.** Estos endpoints necesitan **buscar uno** y **eliminar**. Agrega ambos métodos a `Repositorio/EmpresaRepositorio.cs` (dentro de la clase, junto a los otros):

```csharp
public Empresa? ObtenerPorNit(string nit) =>
    _empresas.FirstOrDefault(e => e.Nit == nit);

public bool Eliminar(string nit)
{
    var empresa = ObtenerPorNit(nit);
    if (empresa is null) return false;
    _empresas.Remove(empresa);
    return true;
}
```

**Te explico:**

> 🆕 **Buscar uno y eliminar.**
> - `Empresa? ObtenerPorNit(...)`: devuelve una empresa **o nada** (`Empresa?`, el `?` que viste en la Fase 2). `FirstOrDefault(e => e.Nit == nit)` da la primera que coincide, o `null`.
> - `Eliminar(...)`: busca primero; si no existe (`is null`) devuelve `false`; si existe, la quita con `_empresas.Remove(...)` y devuelve `true`. Ese `true`/`false` le dirá al endpoint si responder 204 o 404.
> - Los agregamos **ahora** porque ahora los consume un endpoint (igual que `Crear` en la 4.3).

### Paso 2 · Endpoint para ver una empresa por NIT

**Te muestro.** En `Program.cs`, antes de `app.Run();`:

```csharp
// GET /empresas/{nit} → una empresa específica
app.MapGet("/empresas/{nit}", (string nit) =>
{
    var empresa = repo.ObtenerPorNit(nit);
    return empresa is not null
        ? Results.Ok(empresa)
        : Results.NotFound(new { mensaje = $"No existe una empresa con NIT {nit}." });
});
```

**Te explico:**

> 🆕 **Parámetro de ruta y el 404.**
> - La ruta `"/empresas/{nit}"` captura lo que venga después de `/empresas/` y te lo entrega como el parámetro `nit`.
> - `empresa is not null ? Results.Ok(empresa) : Results.NotFound(...)`: si la encontró, **200** con la empresa; si no, **404** con un mensaje. Es el ternario `? :` de la Fase 2, decidiendo qué respuesta HTTP devolver.

> 🆕 **`is not null` / `is null`.** `empresa is not null` se lee *"empresa no es nada, sí existe"*; `empresa is null` es *"empresa es nada"*. Lo viste al final de la Fase 2; aquí decide entre responder 200 o 404.

> 🔮 **Predice, luego mira.** Reinicia y abre en el navegador `http://localhost:5000/empresas/900123456-1`. *¿200 o 404?* Ahora abre `http://localhost:5000/empresas/000`. *¿200 o 404?* Compruébalo.

> 🔨 **Rómpelo (y entiende el ternario).** Invierte las dos ramas del ternario: pon `Results.NotFound(...)` donde va `Results.Ok(empresa)` y viceversa. **Predice:** ¿qué responderá ahora `/empresas/900123456-1` (que SÍ existe)? Corre, míralo, y deshaz el cambio. *(Guarda tu respuesta para el commit.)*

### Paso 3 · Endpoint para eliminar

**Te muestro.** Agrega también:

```csharp
// DELETE /empresas/{nit} → elimina una empresa
app.MapDelete("/empresas/{nit}", (string nit) =>
{
    var eliminada = repo.Eliminar(nit);
    return eliminada
        ? Results.NoContent()
        : Results.NotFound(new { mensaje = $"No existe una empresa con NIT {nit}." });
});
```

**Te explico:**

> 🆕 **`MapDelete` y el 204.** `repo.Eliminar(nit)` devuelve `true` si la encontró y eliminó, `false` si no existía. Si la eliminó: `Results.NoContent()` → **204** (hecho, nada que devolver). Si no: **404**.

> 🔮 **Predice, luego Send.** En Postman: **DELETE** a `http://localhost:5000/empresas/901222333-4`. *¿Qué código esperas, y traerá cuerpo?* Envía (debe ser **204**, sin cuerpo). Ahora haz **GET** de ese mismo NIT. *¿200 o 404 ahora?* Compruébalo.

> ✋ **Ahora tú.** Prueba eliminar una empresa que **no existe** (`DELETE /empresas/000`). Predice el código y confírmalo. Explica por qué es ese y no 204.

<details>
<summary>👉 ¿Qué debería pasar?</summary>

Responde **404**: `repo.Eliminar("000")` devuelve `false` (no la encontró), así que el endpoint cae en `Results.NotFound(...)`.
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/api-buscar-eliminar
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "endpoints GET por NIT y DELETE con manejo de 404
>
> - Un parámetro de ruta {nit} sirve para ...
> - Cuando pido una empresa que no existe, respondo 404 porque ...
> - El DELETE responde 204 y no 200 porque ..."
> ```
> ```bash
> git push -u origin feat/api-buscar-eliminar
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] `GET /empresas/{nit}` devuelve **200** si existe, **404** si no.
- [ ] `DELETE /empresas/{nit}` devuelve **204** al eliminar, **404** si no existía.
- [ ] Tu API tiene los cuatro endpoints (listar, ver uno, crear, eliminar).

**Que entendiste:**
- [ ] Puedes explicar qué es un parámetro de ruta (`{nit}`).
- [ ] Tus predicciones de 200/404/204 coincidieron, y sabes qué disparó cada código.
- [ ] Entiendes por qué el DELETE usa 204 y no 200.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer el "Ahora tú" solo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Los **parámetros de ruta** (`{nit}`) capturan parte de la URL como dato.
- `Results.NotFound` (404) para "no existe"; `Results.NoContent` (204) para "hecho, sin contenido".
- Una API REST completa cubre: listar, ver uno, crear, eliminar — con el código correcto en cada caso.

---

## 🆘 Si algo salió mal

**El DELETE no elimina / siempre da 404.**
Verifica que el NIT exista (haz un GET de la lista primero) y que lo escribes idéntico, con guion incluido.

**Al reiniciar vuelven a aparecer las empresas que eliminé.**
Correcto: están en memoria y se reinician con el servidor. La persistencia llega en la Fase 6.

---

**➡️ Siguiente:** [Probar toda la API con Postman](05-probar-con-postman.md)
