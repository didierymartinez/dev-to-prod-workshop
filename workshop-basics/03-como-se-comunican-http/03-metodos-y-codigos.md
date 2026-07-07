# Lección 3.3 — Métodos y códigos de estado

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás los cuatro métodos HTTP que usarás siempre y los códigos de estado más importantes. Es el vocabulario que necesitas para construir tu API en la Fase 4.

---

## 🤔 El problema

Ya pediste datos con `GET`. Pero las aplicaciones también **crean**, **modifican** y **eliminan** datos. HTTP tiene una palabra para cada intención, y un sistema de códigos para responder. Dominar este vocabulario es lo que separa "tocar una API a ciegas" de "entender qué pasa".

---

## 💡 Conceptos

### Los métodos HTTP: la intención de la petición

El **método** dice *qué quieres hacer*. Son cuatro los que usarás el 99% del tiempo:

| Método | Intención | Ejemplo con empresas |
|---|---|---|
| `GET` | **Leer** (nunca cambia nada) | "dame la lista de empresas" |
| `POST` | **Crear** algo nuevo | "registra esta empresa nueva" |
| `PUT` | **Modificar** algo existente | "actualiza el plan de esta empresa" |
| `DELETE` | **Eliminar** | "elimina esta empresa" |

> 🧠 Detalle importante: `GET` solo lee, jamás modifica. Por eso es seguro abrir un GET en el navegador, pero no un POST. Respetar esta regla es parte de hacer buenas APIs.

### Los códigos de estado: el resultado de la petición

La respuesta siempre trae un **código de estado**: un número de 3 cifras que resume cómo salió todo. Se agrupan por su primer dígito:

| Rango | Significa | Los que más verás |
|---|---|---|
| **2xx** | Éxito | `200 OK` (aquí están tus datos) · `201 Created` (se creó) · `204 No Content` (hecho, sin nada que devolver) |
| **4xx** | Error del **cliente** (pediste mal) | `400 Bad Request` (tu petición venía mal) · `404 Not Found` (no existe) |
| **5xx** | Error del **servidor** (falló del otro lado) | `500 Internal Server Error` (algo reventó en el servidor) |

> 🧠 La distinción 4xx vs 5xx es clave para resolver problemas: un `4xx` significa que **tú** (el cliente) hiciste algo mal; un `5xx` significa que **el servidor** falló. Saber de qué lado está el problema te ahorra horas.

---

## 🛠️ Manos a la obra

Vamos a provocar varios métodos y códigos usando Postman contra la API de práctica. (JSONPlaceholder *simula* las operaciones de escritura: no guarda de verdad, pero responde como lo haría una API real, perfecto para aprender.)

### Paso 1: GET → 200

En Postman, método **GET**, URL `https://jsonplaceholder.typicode.com/posts/1` → **Send**.
Resultado: **200 OK** con los datos de la publicación 1.

### Paso 2: POST → 201 (crear)

1. Cambia el método a **POST**.
2. URL: `https://jsonplaceholder.typicode.com/posts`
3. Ve a la pestaña **Body** → elige **raw** → en el desplegable de la derecha elige **JSON**.
4. Escribe en el cuerpo:
   ```json
   { "title": "Mi primera publicación", "body": "Hola", "userId": 1 }
   ```
> 🔮 **Predice, luego Send.** Antes de pulsar **Send**: acabas de *crear* algo (no leer). *¿El Status será `200` como en un GET, o un código distinto para "creé algo nuevo"?* Pulsa Send y compáralo.

5. **Send**.

Resultado: **201 Created**. La API responde que creó el recurso y te devuelve el nuevo objeto con un `id`. Ese `201` es el código estándar para "creé algo nuevo" — distinto del `200` de leer.

> 🧠 Fíjate en lo que hiciste: en un `POST` **envías datos** en el *body* (cuerpo) de la petición. En un `GET` no envías cuerpo, solo pides. Esa diferencia la usarás al construir tu API.

### Paso 3: PUT → 200 (modificar) y DELETE → 200 (eliminar)

- **PUT** a `https://jsonplaceholder.typicode.com/posts/1` con un body JSON (como el anterior) → responde **200**, simulando que actualizó.
- **DELETE** a `https://jsonplaceholder.typicode.com/posts/1` (sin body) → responde **200**, simulando que eliminó.

### Paso 4: Provocar un 404

**GET** a `https://jsonplaceholder.typicode.com/posts/99999` → **404 Not Found**. No existe.

### Paso 5: Anota el mapa mental

En tu libreta, completa esta tabla con tus palabras. Es la que tendrás en la cabeza al construir tu API:

```
GET    /empresas        → 200  (lista de empresas)
GET    /empresas/{nit}  → 200 si existe / 404 si no
POST   /empresas        → 201  (empresa creada)  [envía body]
PUT    /empresas/{nit}  → 200  (empresa actualizada) [envía body]
DELETE /empresas/{nit}  → 204  (eliminada, sin contenido)
```

---

## ✅ Compruébalo

**Que corre:**
- [ ] Provocaste un `200`, un `201` y un `404` desde Postman.
- [ ] Hiciste un POST enviando datos en el **body** en formato JSON.

**Que entendiste:**
- [ ] Tu predicción del código del POST (`201`, no `200`) coincidió, y sabes por qué difiere del GET.
- [ ] Puedes decir, de memoria, qué hacen `GET`, `POST`, `PUT`, `DELETE`.
- [ ] Sabes la diferencia entre un error `4xx` (culpa del cliente) y uno `5xx` (culpa del servidor).

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Los cuatro métodos: **GET** (leer), **POST** (crear), **PUT** (modificar), **DELETE** (eliminar).
- En `POST`/`PUT` se envían datos en el **body**; `GET` solo pide.
- Códigos: **2xx** éxito, **4xx** error del cliente, **5xx** error del servidor.
- Los más comunes: `200`, `201`, `204`, `400`, `404`, `500`.

---

## 🆘 Si algo salió mal

**Mi POST devolvió 400 o un error raro.**
Revisa que en **Body** elegiste **raw** + **JSON**, y que el JSON esté bien escrito (comillas dobles, sin coma final). Un JSON mal formado produce un `400`.

**¿Por qué la API de práctica no "recuerda" lo que creé?**
JSONPlaceholder solo *simula* las escrituras para practicar. Tu API de la Fase 4 sí guardará de verdad (en memoria primero, luego en base de datos).

---

**➡️ Siguiente fase:** [Fase 4 — Construir tu propia API](../04-construir-tu-api/README.md)
