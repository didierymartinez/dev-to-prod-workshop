# Lección 3.2 — Consumir una API que ya existe

> ⏱️ 35 minutos · 🎯 **Al terminar:** habrás pedido datos reales a una API pública, primero desde el navegador y luego desde Postman, y entenderás qué es una respuesta JSON.

---

## 🤔 El problema

La mejor forma de entender qué es una API es **usar una**. Hay miles de APIs públicas en internet que entregan datos gratis. Vamos a pedirle datos a una y a observar exactamente qué nos devuelve. Así, cuando construyas la tuya en la Fase 4, sabrás qué estás creando.

---

## 💡 Conceptos

### Un endpoint es una dirección que entrega datos

Una API expone **endpoints**: direcciones (URLs) que, al pedirlas, devuelven datos en vez de una página. Usaremos una API pública de práctica muy conocida, **JSONPlaceholder**, que entrega datos de ejemplo.

Por ejemplo, este endpoint entrega una lista de usuarios:
```
https://jsonplaceholder.typicode.com/users
```

> 🧠 Piensa en estos usuarios como un "ensayo": así como esta API entrega *usuarios*, la API que tú construirás entregará *empresas*. La mecánica es idéntica.

### La respuesta viene en JSON

Lo que la API devuelve es **JSON** — un formato de datos estructurado, legible tanto por programas como por personas. Es el formato en el que viaja casi toda la información por la web.

---

## 🛠️ Manos a la obra

### Paso 1: Consumir la API desde el navegador

La forma más rápida de probar un endpoint de tipo "leer": pégalo en el navegador.

1. Abre una pestaña nueva.
2. Ve a: `https://jsonplaceholder.typicode.com/users`
3. Verás un montón de texto en formato JSON: una lista de 10 usuarios, cada uno con nombre, correo, empresa, etc.

¡Eso es una API respondiendo! El navegador hizo una petición y la API devolvió datos.

Prueba pedir **un solo** usuario, el número 1:
```
https://jsonplaceholder.typicode.com/users/1
```
Ahora ves un único usuario. Fíjate en el patrón: `/users` devuelve todos, `/users/1` devuelve uno específico. **Ese mismo patrón** lo usarás para tus empresas: `/empresas` y `/empresas/{nit}`.

> 💡 Instala la extensión de navegador "JSON Viewer" si quieres ver el JSON con colores y ordenado. No es obligatorio.

### Paso 2: Consumir la API desde Postman

El navegador solo sirve para peticiones simples de lectura. Para trabajar de verdad con APIs se usa **Postman**: una herramienta hecha para enviar peticiones y examinar respuestas en detalle.

1. Instala Postman desde [postman.com/downloads](https://www.postman.com/downloads/) si no lo tienes (puedes usarlo sin crear cuenta, busca la opción "skip" o "lightweight").
2. Ábrelo y crea una petición nueva (botón **New** → **HTTP Request**, o el `+`).
3. En la barra de dirección, escribe: `https://jsonplaceholder.typicode.com/users`
4. Asegúrate de que el método (a la izquierda de la URL) diga **GET**.
5. Pulsa **Send**.

### Paso 3: Leer la respuesta en Postman

Abajo aparece la respuesta. Observa estas tres cosas (son las que siempre revisarás):

- **Body:** los datos que devolvió, en JSON. Es la lista de usuarios.
- **Status:** arriba a la derecha, dirá **200 OK**. El `200` significa "todo salió bien".
- **Time:** cuánto tardó la respuesta (en milisegundos).

Ahora prueba pedir uno solo: cambia la URL a `https://jsonplaceholder.typicode.com/users/1` y pulsa **Send**. Verás un único usuario.

Y prueba pedir uno que **no existe**: `https://jsonplaceholder.typicode.com/users/9999` → **Send**. Fíjate en el **Status**: ahora dice **404 Not Found** ("no encontrado"). El cuerpo viene vacío. La API te está diciendo, en idioma HTTP, que eso no existe.

> 🧠 Acabas de ver dos respuestas distintas: `200` (encontrado) y `404` (no existe). En la próxima lección veremos todos los códigos importantes. Esta es la forma en que las APIs comunican el resultado de cada petición.

### Paso 4: Guardar tus peticiones en una colección

En Postman, guarda estas peticiones en una **Collection** (botón **Save** → crea una colección "Práctica HTTP"). Así las tienes a mano. En la Fase 4 crearás una colección para *tu* API de empresas.

---

## ✅ Compruébalo

- [ ] Viste la lista de usuarios en el navegador pegando la URL de `/users`.
- [ ] En Postman, hiciste un GET a `/users` y obtuviste **200 OK** con datos JSON.
- [ ] Pediste un usuario inexistente (`/users/9999`) y obtuviste **404 Not Found**.
- [ ] Entiendes que `/users` devuelve todos y `/users/1` devuelve uno.

---

## 🧠 Lo que aprendiste

- Una API expone **endpoints** (URLs) que devuelven **datos** (JSON), no páginas.
- El patrón `/recurso` (todos) y `/recurso/id` (uno) es universal — lo usarás con `/empresas`.
- **Postman** es la herramienta para enviar peticiones y examinar respuestas (Body, Status, Time).
- El **código de estado** (200, 404…) comunica el resultado de cada petición.

---

## 🆘 Si algo salió mal

**El navegador me descarga un archivo en vez de mostrar el JSON.**
Algunos navegadores lo hacen. Usa Postman para verlo cómodamente, o instala la extensión "JSON Viewer".

**Postman dice "Could not send request" o error de conexión.**
Revisa tu conexión a internet y que la URL esté bien escrita (sin espacios). JSONPlaceholder es gratuito y a veces tarda; reintenta.

**No quiero crear cuenta en Postman.**
Postman permite usarlo sin cuenta (modo "scratch pad" / "lightweight"). Busca la opción para saltar el registro.

---

**➡️ Siguiente:** [Métodos y códigos de estado](03-metodos-y-codigos.md)
