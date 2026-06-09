# Lección 2.3 — De compose a stack

> ⏱️ 40 minutos · 🎯 **Al terminar:** habrás desplegado tu app al clúster como un **stack**, con **3 réplicas** de la API repartidas entre los nodos. Verás la diferencia entre un *servicio* y un *contenedor*.

---

## 🤔 El problema

Tienes un clúster, pero vacío: la app aún no corre en él. En el básico la levantabas con `docker compose up` en **un** host. En Swarm se despliega de otra forma —como un **stack**— que sí entiende de réplicas y nodos.

---

## 💡 Conceptos

### Del compose al stack

Un **stack** es casi el mismo archivo que tu `docker-compose`, pero con una sección nueva: **`deploy:`**, donde dices cuántas **réplicas** quieres de cada servicio y dónde deben correr. Se despliega con `docker stack deploy` (en vez de `docker compose up`).

### Servicio ≠ contenedor

Esta es la idea central de la orquestación:

- Un **servicio** es la *declaración* del estado deseado: "quiero 3 réplicas de la API". No es algo que corre; es lo que pides.
- Una **réplica** (o **tarea**) es cada *contenedor real* que Swarm crea para cumplir ese servicio.

Tú administras **servicios** (subes/bajas réplicas, actualizas la imagen); Swarm se encarga de los contenedores.

### El estado va anclado a un nodo

La API **no tiene estado** (cada réplica es intercambiable) → perfecta para replicar. La base de datos **sí tiene estado** (sus datos en un volumen) → no se replica a la ligera. Por eso la dejaremos en **1 réplica anclada al manager** (donde vive su volumen). Replicar bases de datos es un tema avanzado aparte.

---

## 🛠️ Manos a la obra

### Paso 1: Crear el archivo del stack

En la raíz de tu proyecto `gestion-empresas`, crea `stack.yml` (reemplaza `TU_USUARIO` en minúsculas por tu usuario de GitHub):

```yaml
services:

  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=db;Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"
    deploy:
      replicas: 3            # ← 3 copias de la API

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: empresasdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]   # ← la BD vive en el manager

volumes:
  pgdata:
```

Es básicamente un `docker compose` (API + base de datos, juntas y sin gateway — la **versión simple** de la Fase 1) con una sección nueva: **`deploy:`** (réplicas y ubicación). El gateway y la separación de la base de datos llegarán en fases posteriores.

### Paso 2: Llevar el stack al manager

Desde tu máquina, copia el archivo al manager (desde donde se administra el clúster):

```bash
scp stack.yml azureuser@$(cd infra && terraform output -raw ip_publica):~/
```

### Paso 3: Desplegar el stack

Entra al manager y despliega:

```bash
ssh azureuser@$(cd infra && terraform output -raw ip_publica)

# La contraseña de la BD, por ahora como variable de entorno (en la Fase 4 será un secreto)
export DB_PASSWORD="Clave_Servidor_2024"

# Desplegar el stack con el nombre "gestion"
docker stack deploy -c stack.yml gestion
```

> 💡 El `export` solo dura en **esta** terminal. Si cierras la sesión SSH y vuelves a entrar, repítelo antes de cualquier `docker stack deploy` (si no, la contraseña iría vacía).

Swarm crea los servicios. La API (imagen pública en GHCR) y PostgreSQL se descargan y arrancan.

### Paso 4: Ver los servicios y sus réplicas

```bash
docker service ls
```
Verás tus servicios con sus réplicas:
```
NAME           MODE         REPLICAS   IMAGE
gestion_api    replicated   3/3        ghcr.io/.../gestion-empresas-api:latest
gestion_db     replicated   1/1        postgres:16-alpine
```
`3/3` significa "3 de 3 réplicas corriendo". Mira **en qué nodos** están repartidas:
```bash
docker service ps gestion_api
```
Verás las 3 tareas, algunas en `vm-app` (manager) y otras en `vm-worker`. **Swarm repartió la carga solo.**

### Paso 5: Probar la app

El puerto publicado (5000) es accesible desde **cualquier** nodo del clúster (gracias al *routing mesh*, que verás en la próxima lección). Prueba desde tu navegador:

```
http://<IP-pública-del-manager>:5000/empresas
```
Responde — servido por alguna de las 3 réplicas. (También funcionaría con la IP del worker.)

### Paso 6: Guardar el avance

```bash
exit
git add stack.yml
git commit -m "agregar stack de Swarm con 3 replicas de la API"
git push
```

---

## ✅ Compruébalo

- [ ] `docker service ls` muestra `gestion_api` con `3/3` réplicas y `gestion_db` con `1/1`.
- [ ] `docker service ps gestion_api` muestra las réplicas repartidas entre los dos nodos.
- [ ] `http://<IP>:5000/empresas` responde.
- [ ] Puedes explicar la diferencia entre un **servicio** (lo que declaras) y una **réplica/contenedor** (lo que corre).

---

## 🧠 Lo que aprendiste

- Un **stack** es un compose con una sección `deploy:` (réplicas, ubicación); se lanza con `docker stack deploy`.
- Un **servicio** es el estado deseado ("3 réplicas"); las **réplicas/tareas** son los contenedores reales que Swarm crea.
- Lo **sin estado** (la API) se replica fácil; lo que tiene **estado** (la BD) se ancla a un nodo con `placement`.
- Swarm **reparte** las réplicas entre los nodos por ti.

---

## 🆘 Si algo salió mal

**`gestion_api` se queda en `0/3` y no arranca.**
Mira el detalle: `docker service ps gestion_api --no-trunc`. Causas comunes: la imagen no es accesible (¿hiciste público el paquete en GHCR en el básico?) o un error en la connection string.

**"image could not be accessed" / "denied".**
La imagen de GHCR es privada. Hazla pública (como en el básico, Fase 10) o usa `docker stack deploy ... --with-registry-auth` tras `docker login ghcr.io`.

**La app no responde en el puerto 5000.**
Confirma que el firewall abre el 5000 (regla "App" de la Fase 1) y que `docker service ls` muestra `3/3`. Dale un minuto a que las réplicas terminen de arrancar.

---

**➡️ Siguiente:** [Redes overlay](04-redes-overlay.md)
