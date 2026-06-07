# Lección 4.4 — Buscar y eliminar

> ⏱️ 30 minutos · 🎯 **Al terminar:** tu API estará completa con los cuatro endpoints: agregarás buscar una empresa por su NIT (`GET /empresas/{nit}`) y eliminar (`DELETE`), respondiendo `404` cuando no exista y `204` al eliminar.

---

## 🤔 El problema

Ya puedes listar y crear. Faltan dos operaciones cotidianas: **ver una empresa específica** y **eliminar** una. Ambas comparten un reto nuevo: ¿qué responder cuando la empresa que piden **no existe**? La respuesta correcta en HTTP es `404 Not Found` (lo viste consumiendo en la Fase 3; ahora lo implementas).

---

## 💡 Conceptos

### Parámetros en la ruta

Para pedir *una* empresa, su NIT va en la propia dirección: `/empresas/900123456-1`. Eso se llama un **parámetro de ruta**. En .NET se declara con llaves: `"/empresas/{nit}"`, y luego recibes `nit` como parámetro.

### Responder "no existe" y "hecho, sin contenido"

Dos atajos nuevos:

| Atajo | Código | Cuándo |
|---|---|---|
| `Results.NotFound(mensaje)` | 404 | Lo que pidieron no existe |
| `Results.NoContent()` | 204 | La operación salió bien y no hay nada que devolver (típico de DELETE) |

---

## 🛠️ Manos a la obra

### Paso 1: Endpoint para ver una empresa por NIT

En `Program.cs`, agrega antes de `app.Run();`:

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

Desglose:
- La ruta `"/empresas/{nit}"` captura lo que venga después de `/empresas/` y te lo entrega como `nit`.
- `repo.ObtenerPorNit(nit)` busca; devuelve la empresa o `null` si no hay.
- `empresa is not null ? ... : ...` decide: si existe, `200 OK` con la empresa; si no, `404`.

### Paso 2: Endpoint para eliminar

Agrega también:

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

- `repo.Eliminar(nit)` devuelve `true` si la encontró y eliminó, `false` si no existía.
- Si la eliminó: `204 No Content` (hecho, nada que devolver). Si no existía: `404`.

### Paso 3: Probar todos los casos

Reinicia (`Ctrl+C`, `dotnet run`) y prueba en Postman (o el navegador para los GET):

1. **GET** `http://localhost:5000/empresas/900123456-1` → **200** con Constructora del Norte.
2. **GET** `http://localhost:5000/empresas/000` → **404** con tu mensaje.
3. **DELETE** `http://localhost:5000/empresas/901222333-4` → **204** (sin cuerpo).
4. **GET** `http://localhost:5000/empresas/901222333-4` → **404** (ya la eliminaste).

> 🧠 Tu API ahora responde con el código correcto en cada situación: `200`, `404`, `204`. Eso es exactamente lo que esperaría cualquier otro programa que la consuma. Acabas de construir una API REST completa.

### Paso 4: Guardar el avance

```bash
cd ../..
git checkout -b feat/api-buscar-eliminar
git add .
git commit -m "agregar endpoints GET por NIT y DELETE con manejo de 404"
git push -u origin feat/api-buscar-eliminar    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] `GET /empresas/{nit}` devuelve **200** si existe, **404** si no.
- [ ] `DELETE /empresas/{nit}` devuelve **204** al eliminar, **404** si no existía.
- [ ] Tu API tiene los cuatro endpoints funcionando (listar, ver uno, crear, eliminar).
- [ ] Entiendes qué es un parámetro de ruta (`{nit}`).

---

## 🧠 Lo que aprendiste

- Los **parámetros de ruta** (`{nit}`) capturan parte de la URL como dato.
- `Results.NotFound` (404) para "no existe"; `Results.NoContent` (204) para "hecho, sin contenido".
- Una API REST completa cubre: listar, ver uno, crear, eliminar — con el código de estado correcto en cada caso.

---

## 🆘 Si algo salió mal

**El DELETE no elimina / siempre da 404.**
Verifica que el NIT exista (haz un GET de la lista primero) y que lo escribes idéntico, con guion incluido.

**Al reiniciar vuelven a aparecer las empresas que eliminé.**
Correcto: están en memoria y se reinician con el servidor. La persistencia llega en la Fase 6.

---

**➡️ Siguiente:** [Probar toda la API con Postman](05-probar-con-postman.md)
