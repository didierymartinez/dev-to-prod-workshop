# Lección 5.1 — Una página que muestra los datos

> ⏱️ 40 minutos · 🎯 **Al terminar:** tendrás una página web con un diseño propio que intenta cargar las empresas desde tu API. Aprenderás a usar `fetch` desde el navegador y descubrirás un obstáculo real que resolverás en la siguiente lección.

---

## 🤔 El problema

Tu API entrega JSON. Perfecto para programas, ilegible para una persona del área comercial. Necesitan una **página** con la información presentada de forma clara. Esa página es un **cliente** de tu API: le pide los datos y los dibuja.

---

## 💡 Conceptos

### Las tres partes de una página web

| Lenguaje | Se encarga de… | Analogía |
|---|---|---|
| **HTML** | La estructura y el contenido | El esqueleto |
| **CSS** | El aspecto (colores, espacios) | La ropa |
| **JavaScript** | El comportamiento (pedir datos, reaccionar) | El cerebro |

### `fetch`: pedir datos desde el navegador

En la Fase 3 pediste datos a una API con Postman. **`fetch`** hace lo mismo, pero desde el JavaScript de tu página: lanza una petición HTTP a una URL y recibe la respuesta. Es Postman, pero programable y automático.

### Servir la página (no abrirla con doble clic)

Una página web se **sirve** desde un pequeño servidor, no se abre con doble clic (eso causa problemas). Usaremos **Live Server**, la extensión de VS Code que instalaste en la Fase 0: sirve tu página en una dirección como `http://127.0.0.1:5500`.

---

## 🛠️ Manos a la obra

Crearemos la página dentro de una carpeta `frontend` en tu proyecto `gestion-empresas`.

### Paso 1: La estructura (HTML)

Crea la carpeta `frontend/` y dentro `index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panel de Empresas Clientes</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>🏢 Panel de Empresas Clientes</h1>
  </header>

  <main>
    <p id="estado">Cargando empresas…</p>
    <div id="listado" class="grid"></div>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

Qué hace lo importante:
- `<link rel="stylesheet" href="styles.css">` conecta el archivo de estilos.
- `<p id="estado">` es donde mostraremos mensajes ("cargando", "error", etc.). El `id` nos deja encontrarlo desde JavaScript.
- `<div id="listado">` es el contenedor vacío donde JavaScript **dibujará** las tarjetas.
- `<script src="app.js">` conecta el archivo de comportamiento (va al final para que el HTML ya exista cuando corra).

### Paso 2: El aspecto (CSS)

Crea `frontend/styles.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f4f6f9; color: #2c3e50; }

header { background: #1f3a5f; color: white; padding: 1.5rem 2rem; }
header h1 { font-size: 1.6rem; }

main { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
#estado { color: #888; margin-bottom: 1rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
.card {
  background: white; border-radius: 10px; padding: 1.2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07); border-left: 4px solid #1f3a5f;
}
.card .nit { font-size: 0.75rem; color: #aaa; }
.card .razon { font-size: 1.1rem; font-weight: 600; margin: 0.3rem 0; }
.card .plan { display: inline-block; font-size: 0.8rem; padding: 0.15rem 0.6rem;
  border-radius: 999px; background: #e8eef6; color: #1f3a5f; }
.card .estado { font-size: 0.85rem; margin-top: 0.5rem; font-weight: 600; }
.activa { color: #2e7d32; } .inactiva { color: #b0306b; }
.card.off { opacity: 0.6; border-left-color: #b0306b; }
```

No te preocupes por memorizar el CSS. Lo importante: define cómo se ven el encabezado y las tarjetas (`.card`).

### Paso 3: El comportamiento (JavaScript con `fetch`)

Crea `frontend/app.js`:

```javascript
// La dirección de tu API (ajusta el puerto si el tuyo es distinto)
const API_URL = "http://localhost:5000";

const estado = document.getElementById("estado");
const listado = document.getElementById("listado");

async function cargarEmpresas() {
  try {
    // Pedir los datos a la API (igual que un GET en Postman, pero desde la página)
    const respuesta = await fetch(`${API_URL}/empresas`);
    if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

    const empresas = await respuesta.json();   // convertir el JSON en datos usables
    estado.textContent = `${empresas.length} empresas`;
    dibujar(empresas);
  } catch (error) {
    estado.textContent = `❌ No se pudieron cargar: ${error.message}`;
    console.error(error);
  }
}

function dibujar(empresas) {
  listado.innerHTML = "";
  for (const e of empresas) {
    const card = document.createElement("div");
    card.className = `card ${e.activa ? "" : "off"}`;
    card.innerHTML = `
      <div class="nit">NIT ${e.nit}</div>
      <div class="razon">${e.razonSocial}</div>
      <span class="plan">${e.plan}</span>
      <div class="estado ${e.activa ? "activa" : "inactiva"}">
        ${e.activa ? "● Activa" : "○ Inactiva"}
      </div>`;
    listado.appendChild(card);
  }
}

cargarEmpresas();
```

Qué hace lo importante:
- `fetch(`${API_URL}/empresas`)` hace el GET a tu API.
- `await respuesta.json()` convierte el JSON recibido en algo que JavaScript puede usar.
- `dibujar(...)` crea una tarjeta por empresa y la mete en el `<div id="listado">`.
- El `try/catch` muestra un mensaje si algo falla (igual que en la Fase 2).

### Paso 4: Ver la página

1. Asegúrate de que tu API esté corriendo: en una terminal, dentro de `src/GestionEmpresas.Api`, ejecuta `dotnet run`.
2. En VS Code, clic derecho sobre `frontend/index.html` → **"Open with Live Server"**.
3. Se abrirá el navegador en `http://127.0.0.1:5500/...`.

Verás el **encabezado azul** y tu diseño… pero las tarjetas **no cargan**: aparece "❌ No se pudieron cargar".

### Paso 5: Diagnosticar (no es un fracaso, es el siguiente tema)

Abre las herramientas del navegador (**F12**) → pestaña **Console**. Verás un error rojo que menciona **CORS** y "blocked by CORS policy".

> 🧠 **Esto es esperado y es bueno que pase.** Tu página está bien hecha y tu `fetch` está funcionando — de hecho, *intentó* llamar a la API. Lo que ocurre es que el navegador **bloquea** la respuesta por una regla de seguridad llamada CORS. Es uno de los obstáculos más comunes del desarrollo web, y lo resolverás en la siguiente lección.

Confírmalo en la pestaña **Network** (F12 → Network → recarga): verás la petición a `/empresas` marcada en rojo. La petición salió; el navegador no dejó usar la respuesta.

### Paso 6: Guardar el avance

```bash
cd ..      # ve a la raíz gestion-empresas/ (ajusta según dónde estés)
git checkout -b feat/frontend-pagina
git add frontend/
git commit -m "agregar página web que consume la API de empresas"
git push -u origin feat/frontend-pagina    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] La página muestra el encabezado y tu diseño al abrirla con Live Server.
- [ ] En la consola (F12) ves un error que menciona **CORS**.
- [ ] En la pestaña Network ves que la petición a `/empresas` **sí se hizo** (aunque fue bloqueada).
- [ ] Entiendes que tu página y tu `fetch` están bien; falta autorizar el acceso (lo harás en 5.2).

---

## 🧠 Lo que aprendiste

- Una página web son tres piezas: **HTML** (estructura), **CSS** (aspecto), **JavaScript** (comportamiento).
- **`fetch`** pide datos a una API desde el navegador, como Postman pero automático.
- Las páginas se **sirven** (Live Server), no se abren con doble clic.
- Diagnosticar con **F12 → Console/Network** es una habilidad clave: el error de CORS no es un fallo tuyo, es el siguiente tema.

---

## 🆘 Si algo salió mal

**No veo ni el encabezado, la página está en blanco.**
Revisa que `index.html`, `styles.css` y `app.js` estén en la **misma carpeta** `frontend/` y bien escritos los nombres. Abre F12 → Console para ver errores de JavaScript.

**El error no menciona CORS sino "Failed to fetch" / "connection refused".**
Tu API no está corriendo o usa otro puerto. Arráncala (`dotnet run`) y ajusta `API_URL` en `app.js` al puerto correcto.

**Live Server no aparece al hacer clic derecho.**
Instala la extensión "Live Server" (Fase 0) y reinicia VS Code.

---

**➡️ Siguiente:** [El obstáculo de CORS](02-el-obstaculo-cors.md)
