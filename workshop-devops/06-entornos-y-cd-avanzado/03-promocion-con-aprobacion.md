# Lección 6.3 — Promoción con aprobación

> ⏱️ 45 minutos · 🎯 **Al terminar:** tu pipeline construirá la imagen **una vez**, la desplegará a **staging** automáticamente y **esperará tu aprobación** para promover la **misma** imagen a **producción** — desplegando de verdad sobre tu clúster Swarm con `docker stack deploy`.

---

## 🤔 El problema

Tu pipeline del básico desplegaba directo a un único servidor con `docker compose` — y eso ya no encaja: ahora corres un **clúster Swarm** y tienes **dos entornos**. Quieres el flujo profesional:

```
  build (una vez) → desplegar a staging → ⏸ esperar aprobación → desplegar la MISMA imagen a producción
```

Y que el despliegue, en cada entorno, haga lo que hasta ahora hacías a mano: `docker stack deploy` en el manager correcto.

---

## 💡 Conceptos

### GitHub Environments

Un **Environment** de GitHub es un entorno **nombrado** (`staging`, `production`) al que un job del pipeline se asocia. Te da dos cosas que necesitamos:

- **Reglas de protección**, como **revisores obligatorios**: el job que apunta a ese entorno **no arranca** hasta que una persona aprueba. Esa es tu compuerta.
- **Secretos por entorno**: cada entorno guarda **sus propios** valores. Así, la IP y la llave de staging son distintas de las de producción, y un job solo ve las de su entorno.

### Promover la misma imagen

La imagen se etiqueta con el `sha` del commit. Los dos despliegues —staging y prod— usan **esa misma etiqueta**, no `:latest` reconstruido. Para lograrlo, tu `stack.yml` tomará la etiqueta de una variable (`IMAGE_TAG`) que el pipeline fija al `sha`. Mismo `sha` en los dos = mismo artefacto probado.

---

## 🛠️ Manos a la obra

### Paso 1: Crear los entornos en GitHub

En tu repositorio: **Settings → Environments → New environment**.

1. Crea **`staging`** (sin reglas: el despliegue a staging es automático).
2. Crea **`production`** y, dentro, activa **Required reviewers** → agrégate a ti mismo. (Opcional: "Wait timer", "Deployment branches: only `main`".)

Ahora cualquier job con `environment: production` quedará **en pausa** hasta que alguien apruebe.

### Paso 2: Secretos por entorno

En la Fase 10 del básico guardaste `VM_HOST`/`VM_USER`/`VM_SSH_KEY` como secretos **del repositorio**. Ahora los movemos a secretos **de entorno** (cada entorno los suyos). En **Settings → Environments → `staging` → Environment secrets** (y luego igual en `production`), crea:

| Secreto | Valor en `staging` | Valor en `production` |
|---|---|---|
| `MANAGER_HOST` | IP del manager de staging (de la lección 6.2) | IP del manager de producción |
| `MANAGER_USER` | `azureuser` | `azureuser` |
| `SSH_KEY` | tu llave privada SSH completa | tu llave privada SSH completa |

> 🧠 El **mismo nombre** de secreto (`MANAGER_HOST`) tiene un **valor distinto** en cada entorno. El job de staging lee el de staging; el de producción, el de producción. GitHub elige según el `environment:` del job. (Puedes borrar ya los viejos `VM_*` del repositorio.)

### Paso 3: Que el `stack.yml` use la etiqueta de imagen variable

En tu `stack.yml`, cambia la imagen de la API para que tome la etiqueta de una variable (con `latest` como respaldo):

```yaml
  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:${IMAGE_TAG:-latest}   # ← antes: :latest
```

`docker stack deploy` sustituye `${IMAGE_TAG}` por el valor que haya en el entorno al desplegar. Si no hay ninguno (un despliegue manual tuyo), usa `latest`.

### Paso 4: Reescribir el pipeline

Reemplaza tu `.github/workflows/deploy.yml` del básico por esta versión (el viejo job de `docker compose` ya no aplica en Swarm):

```yaml
name: "CD — Construir, desplegar y promover"

on:
  push:
    branches: [ main ]

env:
  IMAGEN: ghcr.io/${{ github.repository_owner }}/gestion-empresas-api

jobs:
  construir-publicar:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: "Iniciar sesión en GHCR"
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: "Construir y publicar la imagen"
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGEN }}:latest
            ${{ env.IMAGEN }}:${{ github.sha }}

  desplegar-staging:
    needs: construir-publicar
    runs-on: ubuntu-latest
    environment: staging                 # ← entorno de GitHub (sin aprobación)
    steps:
      - uses: actions/checkout@v4
      - name: "Copiar el stack al manager de staging"
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "stack.yml"
          target: "~/"
      - name: "Desplegar el stack en staging"
        uses: appleboy/ssh-action@v1.0.3
        env:
          IMAGE_TAG: ${{ github.sha }}
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          envs: IMAGE_TAG                 # pasa IMAGE_TAG a la sesión remota
          script: |
            export IMAGE_TAG=$IMAGE_TAG
            docker stack deploy -c ~/stack.yml gestion

  desplegar-produccion:
    needs: desplegar-staging              # solo tras un staging exitoso
    runs-on: ubuntu-latest
    environment: production               # ← EXIGE tu aprobación (Paso 1)
    steps:
      - uses: actions/checkout@v4
      - name: "Copiar el stack al manager de producción"
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "stack.yml"
          target: "~/"
      - name: "Desplegar el stack en producción"
        uses: appleboy/ssh-action@v1.0.3
        env:
          IMAGE_TAG: ${{ github.sha }}    # ← la MISMA imagen que probó staging
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            export IMAGE_TAG=$IMAGE_TAG
            docker stack deploy -c ~/stack.yml gestion
```

Desglose:
- **`construir-publicar`** publica la imagen con dos etiquetas: `latest` y el `sha`.
- **`desplegar-staging`** copia el `stack.yml` al manager de staging y despliega fijando `IMAGE_TAG` al `sha`. Como es el entorno `staging` (sin reglas), corre solo.
- **`desplegar-produccion`** hace lo mismo contra el manager de prod, **con el mismo `sha`**. Pero al ser el entorno `production`, GitHub lo **detiene** hasta que apruebes.

### Paso 5: Probar la promoción

Sube los cambios (asegúrate de que el clúster de **staging** está levantado y con Swarm listo):

```bash
git add stack.yml .github/workflows/deploy.yml
git commit -m "CD: desplegar a staging y promover a produccion con aprobacion"
git push
```

En la pestaña **Actions**, abre la ejecución:
1. `construir-publicar` → verde.
2. `desplegar-staging` → verde. Comprueba `http://<IP-staging>:5000/empresas`.
3. `desplegar-produccion` → aparece **Waiting** / *Review deployments*. Pulsa **Review deployments**, marca `production` y **Approve and deploy**.
4. Tras aprobar, prod despliega la **misma** imagen. Comprueba `http://<IP-produccion>:5000/empresas`.

> 💰 Para que el despliegue a producción funcione, el clúster de **prod** debe estar levantado (su `terraform apply` y su Swarm listo). Si lo destruiste para ahorrar, recréalo **antes** de aprobar — o deja la aprobación pendiente sin gastar.

---

## ✅ Compruébalo

- [ ] Existen los entornos `staging` y `production`; este último con **revisor obligatorio**.
- [ ] Cada entorno tiene sus secretos `MANAGER_HOST`/`MANAGER_USER`/`SSH_KEY`.
- [ ] El push despliega a staging **solo**, y producción queda **esperando aprobación**.
- [ ] Tras aprobar, producción recibe la **misma** imagen (`sha`) que staging.

---

## 🧠 Lo que aprendiste

- Los **GitHub Environments** dan **reglas de protección** (revisor obligatorio = tu compuerta) y **secretos por entorno**.
- El pipeline **promueve** la misma imagen (`sha`) de staging a prod; no reconstruye.
- El despliegue al clúster se automatizó: `scp` del `stack.yml` + `docker stack deploy` por SSH, con `IMAGE_TAG` fijado al `sha`.
- Un job con `environment: production` **se pausa** hasta que un humano aprueba.

---

## 🆘 Si algo salió mal

**Producción no pide aprobación; despliega directo.**
Falta el **Required reviewer** en el entorno `production` (Paso 1), o el job no tiene `environment: production`.

**Falla el SSH/SCP ("permission denied", "handshake failed").**
Revisa los secretos del **entorno** correcto: `SSH_KEY` debe ser la llave privada completa (BEGIN/END) y `MANAGER_HOST` la IP **actual** de ese manager (si recreaste el clúster, cambió).

**La imagen no se actualiza en el clúster.**
Confirma que `stack.yml` usa `:${IMAGE_TAG:-latest}` y que el job pasa `envs: IMAGE_TAG`. Si la imagen es **privada**, en el manager haz `docker login ghcr.io` y despliega con `docker stack deploy -c ~/stack.yml gestion --with-registry-auth` (o hazla pública, como en el básico).

**`docker stack deploy` dice que no encuentra el secreto de la BD.**
Cada entorno es un clúster nuevo: recuerda crear el `docker secret db_password` (Fase 4) en **ese** clúster antes del primer despliegue.

---

**➡️ Siguiente:** [Pipelines reutilizables](04-pipelines-reutilizables.md)
