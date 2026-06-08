# Lección 2.4 — Redes overlay

> ⏱️ 30 minutos · 🎯 **Al terminar:** entenderás cómo los servicios se comunican entre nodos distintos a través de una **red overlay**, y dejarás la base de datos en una red **interna** (no expuesta a internet), mientras la API sigue accesible.

---

## 🤔 El problema

Tus 3 réplicas de la API están repartidas en dos máquinas, y la base de datos vive en el manager. Pero la API dice `Host=db` para conectarse… ¿cómo encuentra a `db` si están en **máquinas distintas**? Y además: no queremos que la base de datos sea accesible desde fuera. Las **redes overlay** resuelven ambas cosas.

---

## 💡 Conceptos

### La red overlay: una red que abarca todo el clúster

Una **red overlay** es una red virtual que se extiende por **todos los nodos** del clúster. Los servicios conectados a ella se encuentran **por su nombre** (`db`, `api`), sin importar en qué máquina física estén. Swarm se encarga de enrutar el tráfico entre nodos por debajo. Es como la red privada que `docker compose` creaba en un host, pero ahora a través de varias máquinas.

### Routing mesh: el puerto que responde en cualquier nodo

Cuando un servicio **publica** un puerto (la API publica el 5000), Swarm activa el **routing mesh**: ese puerto responde en **cualquier** nodo del clúster, y Swarm reparte la petición a alguna réplica viva. Por eso `http://<cualquier-nodo>:5000` funciona, esté o no una réplica en ese nodo exacto.

### Interno vs expuesto

- Un servicio **expuesto** publica un puerto (`ports:`) → accesible desde fuera. La API.
- Un servicio **interno** no publica puertos: solo es alcanzable por otros servicios en la misma red overlay. La base de datos. Así, nadie desde internet puede tocar la BD directamente.

---

## 🛠️ Manos a la obra

### Paso 1: Definir una red overlay interna en el stack

Edita tu `stack.yml` para crear una red overlay **interna** y conectar ambos servicios a ella. La API publica el 5000; la base de datos **no publica nada** (solo vive en la red interna):

```yaml
services:

  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=db;Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"          # expuesta (routing mesh)
    networks:
      - interna
    deploy:
      replicas: 3

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: empresasdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - interna              # solo en la red interna: NO publica puertos
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]

networks:
  interna:
    driver: overlay          # red que abarca todo el clúster

volumes:
  pgdata:
```

Lo nuevo: la sección `networks:` (la red overlay `interna`) y que cada servicio declara `networks: [interna]`. La API encuentra a `db` por nombre **a través de la overlay**, aunque estén en nodos distintos. La BD no tiene `ports:`, así que es invisible desde fuera.

### Paso 2: Volver a desplegar

Copia el stack actualizado y vuelve a desplegar (Swarm aplica solo los cambios):

```bash
scp stack.yml azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
export DB_PASSWORD="Clave_Servidor_2024"
docker stack deploy -c stack.yml gestion
```

### Paso 3: Comprobar

- La app sigue respondiendo: `http://<IP-del-manager>:5000/empresas` (la API encontró a la BD por la overlay, cruzando nodos).
- La red overlay existe:
  ```bash
  docker network ls | grep gestion
  ```
  Verás la red `gestion_interna` con driver `overlay`.
- La base de datos **no** es accesible desde fuera: no hay ningún puerto 5432 publicado. Solo la API (en la misma red interna) puede hablarle.

### Paso 4: Guardar el avance

```bash
exit
git add stack.yml
git commit -m "definir red overlay interna; aislar la base de datos"
git push
```

---

## ✅ Compruébalo

- [ ] La app responde aunque las réplicas y la BD estén en nodos distintos (la overlay las conecta).
- [ ] `docker network ls` muestra la red `gestion_interna` con driver `overlay`.
- [ ] La base de datos **no** publica ningún puerto (no es accesible desde internet).
- [ ] Puedes explicar qué es el *routing mesh* y la diferencia entre un servicio expuesto y uno interno.

---

## 🧠 Lo que aprendiste

- Una **red overlay** conecta servicios **a través de los nodos**; se encuentran por su nombre.
- El **routing mesh** hace que un puerto publicado responda en cualquier nodo del clúster.
- Los servicios **expuestos** publican puertos; los **internos** (como la BD) solo viven en la red overlay, invisibles desde fuera.

---

## 🆘 Si algo salió mal

**La API ya no encuentra la BD ("could not connect to host db").**
Asegúrate de que **ambos** servicios declaren `networks: [interna]` y que la sección `networks:` esté al final del archivo. Vuelve a desplegar.

**`docker network ls` no muestra la red.**
Swarm crea la red al desplegar el stack que la usa. Confirma que el `deploy` no dio error (`docker service ls`).

---

**➡️ Siguiente:** [Escalar y auto-recuperar](05-escalar-y-recuperar.md)
