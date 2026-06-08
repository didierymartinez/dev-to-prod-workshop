# Lección 2.5 — Escalar y auto-recuperar

> ⏱️ 30 minutos · 🎯 **Al terminar:** verás las dos superpotencias de un orquestador: **escalar** (subir o bajar réplicas con un comando) y **auto-recuperarse** (Swarm recrea solo cualquier réplica que muera). Este es el pago de toda la fase.

---

## 🤔 El problema

Montaste un clúster con réplicas. Pero, ¿de verdad escala y se recupera solo? La única forma de confiar en ello es **provocarlo**: subir la escala y luego **matar** una réplica a propósito para ver qué hace Swarm.

---

## 💡 Conceptos

### Escalar es cambiar un número

Como el servicio solo declara "cuántas réplicas quiero", **escalar** es cambiar ese número. Swarm crea o elimina réplicas para cumplirlo, repartiéndolas entre los nodos. Sin reinstalar nada, sin downtime.

### Self-healing: Swarm vigila el estado deseado

Swarm compara constantemente el **estado deseado** (3 réplicas) con el **real**. Si una réplica muere (un fallo, un nodo que se apaga), nota la diferencia y **crea una nueva** para volver a 3. No hace falta que nadie intervenga.

---

## 🛠️ Manos a la obra

Entra al manager: `ssh azureuser@$(cd infra && terraform output -raw ip_publica)`.

### Paso 1: Escalar hacia arriba

```bash
docker service scale gestion_api=5
```
Swarm crea 2 réplicas más. Verifica:
```bash
docker service ls          # gestion_api ahora 5/5
docker service ps gestion_api   # 5 tareas repartidas entre manager y worker
```
Tu API pasó de 3 a 5 copias **con un comando**, sin tocar las máquinas.

### Paso 2: Escalar hacia abajo

```bash
docker service scale gestion_api=3
```
Vuelve a 3. Swarm elimina las réplicas sobrantes. Así de fácil se ajusta la capacidad a la demanda.

### Paso 3: Provocar un fallo (self-healing)

Vamos a **matar una réplica** y ver si Swarm la revive. Primero, encuentra una réplica corriendo en el manager:

```bash
docker ps --filter "name=gestion_api" --format "{{.ID}}  {{.Names}}"
```
Copia el ID de un contenedor y **mátalo** (simula un fallo):
```bash
docker rm -f <ID_DEL_CONTENEDOR>
```
Ahora observa qué hace Swarm:
```bash
docker service ps gestion_api
```
Verás la tarea que mataste como `Failed`/`Shutdown` y, justo al lado, una **nueva tarea `Running`** que Swarm creó automáticamente para volver a 3 réplicas. Y:
```bash
docker service ls          # vuelve a mostrar 3/3
```

**Nadie intervino. Swarm detectó la baja y la repuso solo.** Eso es self-healing.

### Paso 4 (opcional): Apagar un nodo entero

Si quieres ver una recuperación más dramática, desde tu máquina apaga el worker:
```bash
az vm deallocate -g rg-gestion-empresas -n vm-worker
```
En el manager, `docker service ps gestion_api` mostrará que las réplicas que vivían en el worker se **recrean en el manager** para mantener el total. Al volver a encender el worker (`az vm start …`), Swarm puede volver a repartir. La app **nunca dejó de responder**.

---

## 🧹 Apagar o destruir para no gastar

Tienes dos VMs encendidas. Al terminar la sesión, apágalas:
```bash
az vm deallocate -g rg-gestion-empresas -n vm-app
az vm deallocate -g rg-gestion-empresas -n vm-worker
```
O, como ya tienes IaC, destruye todo (y recréalo en minutos cuando vuelvas):
```bash
cd infra && terraform destroy
```

---

## ✅ Compruébalo

- [ ] Escalaste `gestion_api` a 5 y de vuelta a 3 con `docker service scale`.
- [ ] Mataste una réplica y `docker service ps` mostró que Swarm creó una nueva sola.
- [ ] `docker service ls` volvió a `3/3` sin que intervinieras.
- [ ] Apagaste las VMs o destruiste la infra al terminar.

---

## 🧠 Lo que aprendiste

- **Escalar** es cambiar el número de réplicas (`docker service scale`); Swarm las crea/elimina y reparte.
- **Self-healing**: Swarm mantiene el estado deseado; si una réplica (o un nodo) cae, repone las réplicas solo.
- Tu app ahora **escala y se recupera sola** — lo que un solo host nunca podría.

---

## 🏁 Cierre de la Fase 2

Pasaste de una app en un host a un **clúster** que reparte la carga, escala con un comando y se recupera de fallos sin intervención. Esa es la esencia de la orquestación.

Pero queda una grieta: cuando despliegues una **versión nueva** de la API, ¿qué pasa con los usuarios mientras se actualiza? ¿Hay un corte? En la próxima fase haremos que las actualizaciones ocurran **sin downtime**, y que se puedan **revertir** si algo sale mal.

---

## 🆘 Si algo salió mal

**Maté una réplica pero no veo que se recree.**
Dale unos segundos y vuelve a correr `docker service ps gestion_api`. Swarm reacciona en cuestión de segundos; la tarea vieja queda como `Shutdown` y aparece una nueva `Running`.

**Tras apagar el worker, las réplicas no se mueven.**
Si el worker se apaga "sucio", Swarm tarda un poco en marcarlo como caído (`Down`). Espera ~30 s y revisa `docker node ls` y `docker service ps`.

---

**➡️ Siguiente fase:** [Fase 3 — Despliegues sin downtime](../03-despliegues-sin-downtime/README.md)
