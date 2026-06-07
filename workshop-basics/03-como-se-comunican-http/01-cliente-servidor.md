# Lección 3.1 — Cliente y servidor: qué pasa al abrir una página

> ⏱️ 25 minutos · 🎯 **Al terminar:** entenderás el modelo petición–respuesta que mueve todo internet, y lo verás ocurrir en vivo en tu propio navegador.

---

## 🤔 El problema

Usas internet todos los días, pero ¿qué pasa *realmente* cuando escribes una dirección y aparece una página? Entender esto es la base para todo lo que sigue: las APIs, el frontend, los servidores. Sin esta imagen mental, el resto son comandos sueltos.

---

## 💡 Conceptos

### Cliente y servidor

Casi todo en internet funciona con dos actores:

- **Cliente:** quien *pide* algo. Tu navegador es un cliente. También lo será tu página web y tu app.
- **Servidor:** quien *responde*. Es un computador, encendido siempre, que espera peticiones y entrega respuestas.

```
   CLIENTE                                    SERVIDOR
 (tu navegador)                          (un computador remoto)
      │                                          │
      │  ── 1. Petición: "dame la página" ──→    │
      │                                          │  (busca o arma
      │                                          │   la respuesta)
      │  ←── 2. Respuesta: "aquí está" ────────  │
      │                                          │
```

Este ida y vuelta — **petición** y **respuesta** — se llama el modelo **request/response**. Ocurre millones de veces por segundo en todo el mundo.

### HTTP: el idioma de esa conversación

Para que cliente y servidor se entiendan, hablan un idioma común: **HTTP** (HyperText Transfer Protocol). Es un conjunto de reglas sobre cómo se escribe una petición y cómo se escribe una respuesta. La "s" de **HTTPS** significa que esa conversación va **cifrada** (segura), para que nadie en el camino la lea.

### Qué pasa al escribir una dirección (paso a paso)

Cuando escribes `https://ejemplo.com` y das Enter:

1. **DNS:** el nombre `ejemplo.com` se traduce a una dirección numérica (IP), como buscar un nombre en una agenda para obtener el número de teléfono.
2. **Conexión:** tu navegador (cliente) se conecta a ese servidor.
3. **Petición:** el navegador envía una petición HTTP: *"dame la página principal"*.
4. **Respuesta:** el servidor responde con el contenido (el HTML de la página) y un **código** que dice si todo salió bien.
5. **Render:** el navegador dibuja eso en pantalla.

> 🧠 Una **API** hace lo mismo, pero en vez de devolver una página para que la veas, devuelve **datos** (normalmente en JSON) para que **otro programa** los use. Misma conversación, distinto contenido.

---

## 🛠️ Manos a la obra

Vamos a *ver* el modelo petición–respuesta sucediendo de verdad, usando una herramienta que ya tienes: tu navegador.

### Paso 1: Abrir las herramientas de desarrollador

1. Abre tu navegador (Chrome o Edge van bien) y ve a cualquier sitio, por ejemplo `https://example.com`.
2. Pulsa **F12** (o clic derecho → "Inspeccionar"). Se abre el panel de desarrollo.
3. Ve a la pestaña **Network** (Red).
4. Con el panel abierto, **recarga** la página (F5).

### Paso 2: Observar las peticiones

Verás aparecer una lista de **peticiones**: cada fila es una conversación cliente–servidor que tu navegador acaba de tener para armar esa página.

Haz clic en la primera fila (suele ser el documento principal). A la derecha verás detalles:
- **Request URL:** a qué dirección se pidió.
- **Request Method:** el tipo de petición (verás `GET` — lo estudiamos en la lección 3.3).
- **Status Code:** el código de respuesta (verás `200`, que significa "todo bien").
- **Response:** lo que el servidor devolvió.

> 🧠 Acabas de ver, con tus ojos, el modelo petición–respuesta. Cada página que abres son decenas de estas conversaciones HTTP ocurriendo en un instante.

---

## ✅ Compruébalo

Responde con tus palabras y confirma en pantalla:

- [ ] ¿Quién es el "cliente" y quién el "servidor" cuando abres una página?
- [ ] En la pestaña Network, ¿puedes señalar la **URL**, el **método** y el **código de estado** de una petición?
- [ ] ¿En qué se parece y en qué se diferencia una API de una página web normal?

---

## 🧠 Lo que aprendiste

- Internet funciona con **clientes** que piden y **servidores** que responden: el modelo **petición–respuesta**.
- **HTTP** es el idioma de esa conversación; **HTTPS** es la versión cifrada.
- Una **API** usa la misma conversación, pero devuelve **datos** (JSON) en vez de una página.
- La pestaña **Network** del navegador te deja ver todo esto en vivo.

---

## 🆘 Si algo salió mal

**No veo nada en la pestaña Network.**
Abre el panel (F12) **antes** de recargar, y recarga con F5 con la pestaña Network activa.

**Me aparecen muchísimas filas y me abruma.**
Es normal: una página moderna hace muchas peticiones (imágenes, estilos, scripts). Concéntrate solo en la primera fila (el documento). El resto lo entenderás con el tiempo.

---

**➡️ Siguiente:** [Consumir una API que ya existe](02-consumir-una-api.md)
