# Lección 3.3 — Rollback

> ⏱️ 25 minutos · 🎯 **Al terminar:** sabrás volver a la versión anterior cuando un despliegue sale mal — tanto **automáticamente** (si la versión nueva no pasa el health check) como **a mano** (con un comando). Y comprobarás que, gracias a todo lo de esta fase, una mala versión **no tumba el servicio**.

---

## 🤔 El problema

Por más cuidado que tengas, algún día desplegarás una versión rota. La pregunta no es *si* pasará, sino *qué tan rápido* puedes deshacerlo. Sin un plan, vuelves corriendo a buscar la versión anterior, la reconstruyes, la redespliegas… mientras los usuarios sufren. Con un orquestador, volver atrás es **un comando** — o ni siquiera eso.

---

## 💡 Conceptos

### Dos formas de volver atrás

- **Rollback automático:** ya lo dejaste configurado en 3.2 con `failure_action: rollback`. Si durante un despliegue la réplica nueva **no llega a estar sana** (o ni siquiera arranca), Swarm **deshace el cambio solo** y vuelve a la versión anterior. Como además usas `start-first`, las réplicas viejas siguen atendiendo mientras tanto: **el servicio no se cae**.
- **Rollback manual:** con `docker service rollback <servicio>`, vuelves a la **configuración anterior** del servicio cuando tú quieras (por ejemplo, una versión que sí arrancó pero se comporta mal).

Swarm recuerda la **especificación anterior** de cada servicio, por eso puede revertir sin que tú guardes nada.

---

## 🛠️ Manos a la obra

Entra al manager: `ssh azureuser@$(cd infra && terraform output -raw ip_publica)`. Si quieres, deja corriendo el bucle `curl` de la lección 3.2 en otra terminal para ver que el servicio no se cae.

### Paso 1: Provocar un despliegue fallido (rollback automático)

Vamos a intentar desplegar una imagen **que no existe**, simulando una versión rota:

```bash
docker service update --image ghcr.io/TU_USUARIO/gestion-empresas-api:version-rota gestion_api
```

Observa qué pasa:
```bash
docker service ps gestion_api
```
Verás que Swarm **intenta** crear una réplica con esa imagen, **falla** (no puede descargarla / no pasa el health check) y, gracias a `failure_action: rollback`, **revierte solo** a la imagen `:latest` que funcionaba. En el bucle `curl` no verás caídas: las réplicas buenas nunca dejaron de atender (por `start-first`).

> 🧠 Esto es enorme: un despliegue malo **no llegó a producción**. Swarm lo detectó por el health check y deshizo el cambio automáticamente, sin downtime y sin que tú intervinieras.

### Paso 2: Rollback manual

A veces una versión **sí arranca y pasa el health check**, pero descubres que se comporta mal (un bug que el health check no ve). En ese caso, reviertes tú:

```bash
docker service rollback gestion_api
```
Swarm vuelve a la **configuración anterior** del servicio (la que tenías antes del último `update`). Compruébalo con `docker service ps gestion_api`: las réplicas vuelven a la versión previa, también de forma gradual (usa tu `rollback_config`).

### Paso 3: Confirmar que todo quedó sano

```bash
docker service ls
docker ps --filter "name=gestion_api" --format "{{.Names}}\t{{.Status}}"
```
`gestion_api` debe estar en `3/3` y las réplicas `(healthy)`. La app responde con normalidad.

---

## 🧹 Apagar o destruir para no gastar

Al terminar la sesión, apaga los dos nodos del clúster:
```bash
az vm deallocate -g rg-gestion-empresas -n vm-app
az vm deallocate -g rg-gestion-empresas -n vm-worker
```
O destruye todo con Terraform (y recréalo en minutos cuando vuelvas): `cd infra && terraform destroy`.

---

## ✅ Compruébalo

- [ ] Provocaste un despliegue con una imagen inexistente y Swarm **revirtió solo** (rollback automático).
- [ ] El servicio **no se cayó** durante el intento fallido (el bucle `curl` siguió en `200`).
- [ ] Usaste `docker service rollback` para volver a la versión anterior a voluntad.
- [ ] `gestion_api` quedó en `3/3` y `(healthy)`.

---

## 🧠 Lo que aprendiste

- **Rollback automático** (`failure_action: rollback`): si la versión nueva no está sana, Swarm deshace el cambio solo, sin downtime.
- **Rollback manual** (`docker service rollback`): vuelves a la configuración anterior con un comando.
- Health check + `start-first` + rollback = despliegues **seguros**: una mala versión no llega a tumbar el servicio.

---

## 🏁 Cierre de la Fase 3

Tus despliegues ahora son **graduales, verificados y reversibles**: actualizar dejó de dar miedo. Junto con el clúster de la Fase 2, tienes una plataforma que escala, se recupera y se actualiza sin cortes.

Pero mira el comando que repites en cada despliegue: `export DB_PASSWORD="Clave_Servidor_2024"`. La contraseña de la base de datos viaja en **texto plano**, en tu terminal y en el stack. En la próxima fase la guardaremos en un **cofre de secretos**, donde nadie la vea.

---

## 🆘 Si algo salió mal

**Tras la imagen inexistente, el servicio quedó atascado en `0/3` y no revirtió.**
Confirma que el `stack.yml` tiene `failure_action: rollback` dentro de `update_config` (lección 3.2) y que volviste a desplegar el stack tras agregarlo. Como salida de emergencia: `docker service update --image ghcr.io/TU_USUARIO/gestion-empresas-api:latest --force gestion_api`.

**`docker service rollback` dice que no hay versión previa.**
Solo hay algo a lo que volver si hiciste al menos un `update` antes. Tras el rollback automático del Paso 1, el "previo" puede haber cambiado; haz un `update` cualquiera y luego prueba el rollback.

---

**➡️ Siguiente fase:** [Fase 4 — Secretos y configuración](../04-secretos-y-configuracion/README.md)
