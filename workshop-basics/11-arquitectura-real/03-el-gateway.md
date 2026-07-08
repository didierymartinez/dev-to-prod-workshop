# Lección 11.3 — El gateway: un único punto de entrada

> ⏱️ 40 minutos · 🎯 **Al terminar:** pondrás un **gateway (nginx)** al frente de todo. Será la única puerta a internet: servirá la página web y enrutará las llamadas a la API. Y, de paso, resolverá el problema de CORS de la Fase 5 — esta vez desde la infraestructura.

---

## 🤔 El problema

Hoy, para usar tu sistema hay que conocer la dirección de la API con su puerto (`http://<IP>:5000`), y el frontend vive en otro origen (lo que causaba CORS en la Fase 5). Falta orden: **una sola dirección**, limpia, que entregue la página y enrute las peticiones — y que sea el único punto expuesto a internet.

---

## 💡 Conceptos

### El reverse proxy (gateway)

Un **gateway** (o *reverse proxy*) es un portero que se para al frente de todo. Recibe **todas** las peticiones en un solo lugar (el puerto 80) y las reparte:

```
                 ┌──────── Gateway nginx (puerto 80) ─────────┐
internet ──:80──►│  ¿qué pidió el navegador?                  │
                 │   "/"          → entrega la página web      │
                 │   "/api/..."   → reenvía a la API (interna) │
                 └──────────────────────────│──────────────────┘
                                             ▼
                                    API (ya no expuesta directamente)
```

Beneficios:
- **Una sola dirección** (`http://<IP>/`) para todo: la web y la API.
- La página y la API quedan en el **mismo origen** → **adiós CORS**.
- La API deja de estar expuesta: solo el gateway habla con ella.
- Es el lugar natural para agregar después HTTPS, un dominio, límites de tráfico, etc.

### Cierra el círculo de la Fase 5

En la Fase 5 resolviste CORS desde el **código** (autorizando el origen en la API). Aquí lo resuelves desde la **infraestructura**: como el gateway sirve la página y la API bajo la **misma dirección**, ya no hay "dos orígenes" y CORS deja de aplicar. Mismo problema, resuelto por el otro lado.

---

## 🛠️ Manos a la obra

### Paso 1: La configuración de nginx

En la raíz de `gestion-empresas`, crea `nginx.conf`:

```nginx
server {
    listen 80;

    # Servir la página web (los archivos estáticos del frontend)
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reenviar todo lo que empiece por /api/ a la API interna
    location /api/ {
        proxy_pass http://api:8080/;
        proxy_set_header Host $host;
    }
}
```

> 🧠 `proxy_pass http://api:8080/` reenvía `/api/empresas` a la API (que en la red de compose se llama `api` y escucha en 8080). El navegador nunca habla directo con la API: siempre pasa por el gateway.

### Paso 2: El frontend usa el mismo origen

> 🧠 **¿De dónde sale el `frontend/`?** Es la carpeta que construiste en la **Fase 5** (`index.html`, `styles.css`, `app.js`), que vive en tu repositorio. Hasta ahora la abrías con Live Server en tu máquina; a partir de esta lección, el **gateway la servirá desde el servidor**, junto a la API. Por eso más abajo (Paso 4) la copiarás al servidor con `scp`.

Como la página y la API estarán bajo la misma dirección, el frontend ya no necesita la URL absoluta. Edita `frontend/app.js` y cambia la primera línea:

```javascript
// Antes: const API_URL = "http://localhost:5000";
const API_URL = "/api";   // mismo origen: el gateway enruta /api a la API
```

El resto del archivo no cambia: `fetch("/api/empresas")` funcionará porque el gateway redirige `/api/` a la API.

### Paso 3: Agregar el gateway al compose de producción

Edita `docker-compose.prod.yml`: agrega el servicio `gateway` y **quita el puerto** de la API (ya no se expone directamente; solo el gateway).

```yaml
services:

  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=${DB_HOST};Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    # (sin "ports": la API ya no se expone al exterior, solo el gateway la alcanza)

  gateway:
    image: nginx:alpine
    ports:
      - "80:80"                                   # el único puerto abierto al mundo
    volumes:
      - ./frontend:/usr/share/nginx/html:ro       # sirve la página
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
```

Sube los cambios (commit + push):

```bash
git checkout -b feat/gateway
git add nginx.conf docker-compose.prod.yml frontend/app.js
git commit -m "agregar gateway nginx: punto unico de entrada y fin del CORS"
git push -u origin feat/gateway
```
Abre el PR y fusiónalo a `main`.

> 💡 Como ahora todo queda en el mismo origen, la política de **CORS** que pusiste en la Fase 5 ya **no es necesaria**. Puedes quitarla de `Program.cs` (o dejarla, ya no estorba). Quitarla es la prueba de que entendiste el problema: lo resolviste por código y ahora por infraestructura.

### Paso 4: Abrir el puerto 80 y llevar los archivos al servidor

```bash
# Abrir el puerto web en vm-app
az vm open-port --resource-group rg-gestion-empresas --name vm-app --port 80 --priority 200

# Copiar el frontend, la config de nginx y el compose actualizado a vm-app
scp -r frontend nginx.conf docker-compose.prod.yml azureuser@$IP:~/gestion-empresas/
```

> 🧠 El gateway sirve el `frontend/` como archivos; por eso lo copiamos al servidor. El pipeline de CD actualiza la **imagen de la API**; el frontend y la config del gateway se llevan con `scp` (en un proyecto más avanzado, también se automatizarían).

### Paso 5: Desplegar y comprobar

```bash
ssh azureuser@$IP
cd ~/gestion-empresas
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps     # api y gateway "Up"
exit
```

Abre en el navegador, **sin número de puerto**:

```
http://<IP>
```

Verás el **panel de empresas** servido directamente, cargando los datos **sin error de CORS** (compruébalo en F12 → Console: limpio). La petición va a `http://<IP>/api/empresas` — el **mismo origen** que la página. 🎉

> 🧠 **¿Y la API en el puerto 5000?** Ya no responde: `http://<IP>:5000` no abre. El único que habla con la API es el gateway. Menos puertas abiertas = más seguro.

---

## 🌐 Opcional: dominio y HTTPS

Para no escribir un número de IP, el siguiente paso natural sería:
1. Registrar un **dominio** y apuntar un registro `A` a la IP de `vm-app`.
2. Agregar **HTTPS** con un certificado gratuito de [Let's Encrypt](https://letsencrypt.org/) en nginx.

Tu sistema pasaría de `http://<IP>` a `https://empresas.tudominio.com`. Lo dejamos como reto para profundizar.

---

## ✅ Compruébalo

> 🔮 **Predice, luego compruébalo.** Pusiste un gateway delante. *¿Qué esperas ahora: que `http://<IP>` (puerto 80) muestre el panel? ¿que `http://<IP>:5000` siga respondiendo o no? ¿habrá error de CORS?* Escribe tus tres respuestas antes de probar.

- [ ] `http://<IP>` (puerto 80) muestra el panel de empresas con datos.
- [ ] En F12 → Console no hay error de CORS (la página y la API son el mismo origen).
- [ ] `http://<IP>:5000` ya **no** responde (la API no está expuesta directamente).
- [ ] Puedes explicar qué hace un gateway y cómo resuelve CORS desde la infraestructura.

> 🚦 **Cómo te fue:** 🟢 acerté las predicciones y entendí el gateway · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Un **gateway (reverse proxy)** es el único punto de entrada: sirve la web y enruta `/api` a la API.
- Pone la página y la API en el **mismo origen** → CORS deja de ser necesario.
- La API queda **interna**: solo el gateway la alcanza (menos exposición, más seguridad).
- Cerraste el círculo de la Fase 5: el mismo problema, resuelto por código y por infraestructura.

---

## 🆘 Si algo salió mal

**`http://<IP>` no abre.**
Revisa que abriste el puerto 80 (`az vm open-port ... --port 80`) y que el servicio `gateway` está *Up* (`docker compose -f docker-compose.prod.yml ps`).

**La página carga pero los datos no (error en consola).**
Verifica el `nginx.conf` (`proxy_pass http://api:8080/`) y que `frontend/app.js` use `API_URL = "/api"`. Confirma que copiaste `frontend/` y `nginx.conf` al servidor (Paso 4).

**"502 Bad Gateway" al entrar.**
El gateway no encuentra la API. Asegúrate de que el servicio `api` esté *Up* y que ambos estén en el mismo `docker-compose.prod.yml`.

---

**➡️ Siguiente:** [Cierre del taller](04-cierre.md)
