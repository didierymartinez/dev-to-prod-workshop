# Lección 5.3 — Un formulario para registrar

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu página permitirá registrar empresas nuevas con un formulario, enviándolas a la API con un `POST`. Cerrarás el círculo: leer **y** crear datos desde la web.

---

## 🤔 El problema

Tu página ya muestra empresas (un `GET`). Pero el área comercial también necesita **registrar** empresas sin pedirle ayuda a un programador. Para eso agregaremos un formulario que, al enviarse, haga un `POST` a la API — el mismo POST que probaste en Postman, ahora desde la página.

---

## 💡 Conceptos

### Un formulario HTML recoge datos del usuario

Un `<form>` con campos `<input>` permite que el usuario escriba datos. Cuando lo envía, capturamos esos datos con JavaScript y los mandamos a la API.

### `fetch` con método POST

En la lección 5.1 usaste `fetch` para un `GET` (solo pedir). Para **crear**, `fetch` necesita más información: el **método** (`POST`), el tipo de contenido (`JSON`) y el **body** con los datos — exactamente las tres cosas que configuraste en Postman en la Fase 3, ahora en código.

---

## 🛠️ Manos a la obra

### Paso 1: Agregar el formulario al HTML

En `frontend/index.html`, dentro de `<main>` y **antes** del `<p id="estado">`, agrega:

```html
<form id="form-nueva">
  <h3>Registrar empresa</h3>
  <input name="razonSocial" placeholder="Razón social" required>
  <input name="nit" placeholder="NIT" required>
  <select name="plan">
    <option>Básico</option>
    <option>Profesional</option>
    <option>Empresarial</option>
  </select>
  <button type="submit">Registrar</button>
</form>
```

- Cada `<input name="...">` es un campo. El `name` nos servirá para leer su valor.
- `required` evita enviar el formulario con campos vacíos.
- `<select>` es una lista desplegable para el plan.

### Paso 2: Darle estilo al formulario

En `frontend/styles.css`, agrega al final:

```css
#form-nueva {
  background: white; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem;
  display: flex; flex-wrap: wrap; gap: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
#form-nueva h3 { width: 100%; margin-bottom: 0.3rem; }
#form-nueva input, #form-nueva select {
  padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; flex: 1;
}
#form-nueva button {
  padding: 0.5rem 1.5rem; background: #1f3a5f; color: white;
  border: none; border-radius: 6px; cursor: pointer;
}
```

### Paso 3: Enviar el formulario con `fetch` (POST)

En `frontend/app.js`, agrega al final:

```javascript
const form = document.getElementById("form-nueva");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();   // evita que la página se recargue al enviar

  // Leer los valores escritos en el formulario
  const datos = Object.fromEntries(new FormData(form));

  // Enviar a la API con un POST (método + tipo + body, como en Postman)
  const respuesta = await fetch(`${API_URL}/empresas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razonSocial: datos.razonSocial,
      nit: datos.nit,
      plan: datos.plan,
    }),
  });

  if (respuesta.ok) {
    form.reset();          // limpiar el formulario
    cargarEmpresas();      // recargar la lista para ver la nueva empresa
  } else {
    const error = await respuesta.json();
    alert(`No se pudo registrar: ${error.mensaje}`);
  }
});
```

Desglose:
- `evento.preventDefault()` evita el comportamiento por defecto del formulario (recargar la página).
- `new FormData(form)` recoge lo que el usuario escribió; `Object.fromEntries(...)` lo convierte en un objeto cómodo.
- En `fetch`, ahora pasamos un segundo argumento con `method`, `headers` y `body` — las mismas tres cosas de un POST en Postman.
- Si la API responde bien (`respuesta.ok`), limpiamos el formulario y **recargamos la lista** llamando a `cargarEmpresas()` (la función de la lección 5.1). Si no, mostramos el mensaje de error que devuelve la API (recuerda la validación de la Fase 4).

### Paso 4: Probar

Con la API corriendo y la página abierta en Live Server:

1. Llena el formulario (razón social, NIT, plan) y pulsa **Registrar**.
2. La empresa nueva **aparece de inmediato** en el listado de abajo.
3. Prueba el caso de error: deja la razón social vacía → el navegador te obliga a llenarla (`required`). Quítale el `required` mentalmente y manda un NIT pero sin razón social desde un caso límite: verás la alerta con el mensaje de la API (`400`).

> 🧠 Acabas de conectar el formulario de tu página con la validación de tu API. La página propone, la API dispone: si los datos están mal, la API responde `400` y tu página muestra el porqué. Las dos capas trabajando juntas.

### Paso 5: Guardar el avance

```bash
cd ..      # raíz gestion-empresas/
git checkout -b feat/frontend-formulario
git add frontend/
git commit -m "agregar formulario para registrar empresas desde la web"
git push -u origin feat/frontend-formulario    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

Actualiza también el `README.md` del proyecto marcando lo logrado (ya tienes API + página web) y haz su commit + push.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Puedes registrar una empresa desde el formulario y aparece al instante en el listado.
- [ ] Si los datos están incompletos, no se registra (el formulario o la API lo impiden).

**Que entendiste:**
- [ ] Puedes explicar la diferencia entre el `fetch` de un `GET` (solo pedir) y el de un `POST` (method + headers + body).
- [ ] Sabes por qué, tras registrar, hay que llamar a `cargarEmpresas()` para ver el cambio.

> 🔨 **Rómpelo a propósito:** apaga la API (`Ctrl+C`) y trata de registrar una empresa. **Antes, predice:** ¿la página se romperá, o mostrará algún mensaje? Pruébalo, míralo y vuelve a encenderla. Esto muestra que la página **depende** de la API: sin servidor, no hay datos.

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Un `<form>` recoge datos del usuario; JavaScript los captura y los envía.
- `fetch` con `POST` envía datos: necesita `method`, `headers` y `body` (como en Postman).
- Tras crear, recargar la lista refleja el cambio al instante.
- El frontend y la API se reparten el trabajo: la página pide, la API valida y responde.

---

## 🆘 Si algo salió mal

**Al pulsar Registrar, la página se recarga y no pasa nada.**
Falta `evento.preventDefault()` al inicio del manejador del `submit`.

**Da error de CORS otra vez al hacer POST.**
La política de CORS de la lección 5.2 ya cubre POST (`AllowAnyMethod`). Si falla, confirma que reiniciaste la API después de configurar CORS.

**La empresa se registra pero no aparece hasta recargar a mano.**
Asegúrate de llamar a `cargarEmpresas()` dentro del `if (respuesta.ok)`.

---

**➡️ Siguiente fase:** [Fase 6 — Los datos que perduran](../06-datos-que-perduran/README.md)
