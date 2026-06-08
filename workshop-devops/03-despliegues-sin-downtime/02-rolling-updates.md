# Lección 3.2 — Rolling updates

> ⏱️ 35 minutos · 🎯 **Al terminar:** configurarás el clúster para que actualice las réplicas **de a una**, esperando a que cada nueva esté sana antes de seguir. Comprobarás, con un `curl` en bucle, que la app **nunca deja de responder** durante un despliegue.

---

## 🤔 El problema

Cuando actualizas el servicio, Swarm reemplaza las réplicas viejas por nuevas. Si lo hace **todas a la vez** (o baja la vieja antes de tener lista la nueva), hay un instante sin réplicas disponibles → los usuarios ven errores. Queremos una transición **gradual y sin cortes**.

---

## 💡 Conceptos

### Rolling update: reemplazar de a poco

Un **rolling update** actualiza las réplicas **por tandas**, no todas de golpe. Se controla con `update_config`:

- **`parallelism`** → cuántas réplicas actualizar a la vez (1 = de una en una).
- **`delay`** → cuánto esperar entre tandas.
- **`order`** → el orden de cada reemplazo:
  - `stop-first` (por defecto): baja la vieja y **luego** arranca la nueva → hay un hueco.
  - **`start-first`**: arranca la nueva, espera a que esté **sana**, y **después** baja la vieja → **sin hueco**.

Con `start-first` + el **health check** de la lección anterior, Swarm solo retira una réplica vieja cuando ya hay una nueva *healthy* tomando su lugar. Eso es el despliegue sin downtime.

- **`failure_action`** → qué hacer si una réplica nueva no llega a estar sana: `rollback` (volver atrás solo). Lo aprovecharemos en la próxima lección.

---

## 🛠️ Manos a la obra

### Paso 1: Configurar el rolling update en el stack

En tu `stack.yml`, amplía el bloque `deploy` del servicio `api` con `update_config` (y `rollback_config`, que usaremos en 3.3):

```yaml
  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=db;Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"
    networks:
      - interna
    deploy:
      replicas: 3
      update_config:
        parallelism: 1          # una réplica a la vez
        delay: 10s              # espera entre tandas
        order: start-first      # arranca la nueva antes de bajar la vieja
        failure_action: rollback
      rollback_config:
        parallelism: 1
        order: start-first
```

> 🧠 El bloque de arriba es **solo el servicio `api`**: el resto del `stack.yml` (`db`, la red `interna`, los `volumes`) queda **igual que en la Fase 2**; aquí solo agregas `update_config` y `rollback_config` dentro de su `deploy`.

Vuelve a desplegar el stack para aplicar la configuración:

```bash
scp stack.yml azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
export DB_PASSWORD="Clave_Servidor_2024"
docker stack deploy -c stack.yml gestion
```

### Paso 2: Preparar la prueba de "cero downtime"

Vamos a **golpear la app sin parar** mientras la actualizamos, para ver si en algún momento falla. Desde **tu máquina** (no el manager), abre una terminal y deja corriendo este bucle (ajusta la IP del manager):

```bash
IP=$(cd infra && terraform output -raw ip_publica)
while true; do
  curl -s -o /dev/null -w "%{http_code}" http://$IP:5000/health
  echo "  $(date +%T)"
  sleep 1
done
```
Verás una línea por segundo con `200` (la app responde). Déjalo corriendo.

### Paso 3: Disparar una actualización y observar el rolling

En **otra terminal**, entra al manager y fuerza una actualización del servicio (recrea las réplicas aplicando el `update_config`):

```bash
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
docker service update --force gestion_api
```

Mira cómo se reemplazan **de a una**:
```bash
docker service ps gestion_api
```
Verás réplicas viejas en `Shutdown` y nuevas en `Running`, apareciendo una por una (por el `parallelism: 1` y el `delay: 10s`).

### Paso 4: Comprobar que no hubo downtime

Vuelve a la terminal del bucle `curl`. Durante toda la actualización, **siguió respondiendo `200`** — ni un solo error. Eso es un despliegue **sin downtime**: gracias a `start-first` + el health check, siempre hubo réplicas sanas atendiendo mientras las otras se renovaban.

Cuando termines, detén el bucle con `Ctrl + C`.

### Paso 5: Guardar el avance

```bash
exit
git add stack.yml
git commit -m "configurar rolling updates sin downtime (start-first + health check)"
git push
```

---

## ✅ Compruébalo

- [ ] El `stack.yml` tiene `update_config` con `order: start-first` y `parallelism: 1`.
- [ ] `docker service ps gestion_api` mostró el reemplazo **gradual** de réplicas.
- [ ] El bucle `curl` respondió `200` **sin interrupción** durante toda la actualización.
- [ ] Entiendes por qué `start-first` + health check evitan el corte.

---

## 🧠 Lo que aprendiste

- Un **rolling update** reemplaza réplicas por tandas (`parallelism`, `delay`).
- **`order: start-first`** arranca la nueva (y espera a que esté sana) antes de bajar la vieja → sin hueco.
- Combinado con el **health check**, logras despliegues **sin downtime**.
- `failure_action: rollback` deja preparado el plan B (próxima lección).

---

## 🆘 Si algo salió mal

**El bucle `curl` mostró algún error (000 o 502) durante el update.**
Revisa que `order` sea `start-first` (no `stop-first`) y que las réplicas estén `(healthy)` (lección 3.1). Sin health check, Swarm no sabe cuándo la nueva está lista y puede bajar la vieja antes de tiempo.

**`docker service update --force` no hace nada visible.**
`--force` recrea las réplicas aunque la imagen no cambie; mira `docker service ps gestion_api` para ver el reemplazo. Si fue muy rápido, sube el `delay` para observarlo mejor.

---

**➡️ Siguiente:** [Rollback](03-rollback.md)
