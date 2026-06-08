# Lección 6.4 — Pipelines reutilizables

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu lógica de despliegue dejará de estar duplicada. La extraerás a un **workflow reutilizable** que staging y producción **invocan** con un parámetro, en vez de copiar y pegar los mismos pasos.

---

## 🤔 El problema

Mira el pipeline de la lección anterior: `desplegar-staging` y `desplegar-produccion` son **casi idénticos** — los mismos pasos de `scp` y `docker stack deploy`, cambiando solo el entorno. Eso huele a problema:

- Si cambias **cómo** se despliega (un comando, una opción), tienes que tocar **dos sitios** y mantenerlos en sincronía.
- Si mañana tienes un segundo proyecto, repetirías **todo** el bloque otra vez.

El principio **DRY** (*Don't Repeat Yourself*) no es solo para tu código C#: también vale para tus pipelines.

---

## 💡 Conceptos

### Workflows reutilizables (`workflow_call`)

GitHub Actions permite que un workflow **llame** a otro. El workflow reutilizable declara `on: workflow_call` y define qué **entradas** (`inputs`) y **secretos** necesita; el que lo llama lo invoca con `uses:` y le pasa los valores. Defines la lógica de despliegue **una vez** y la usas para cuantos entornos quieras.

```
  deploy.yml (orquesta)                deploy-stack.yml (reutilizable)
  ├─ construir-publicar
  ├─ desplegar-staging ──────uses─────► entorno: staging
  └─ desplegar-produccion ───uses─────► entorno: production
```

### Hacia workflows de organización

El siguiente nivel —el que verás en el **taller avanzado**— es poner ese workflow reutilizable en un **repositorio central** de la organización, para que **todos** los proyectos lo invoquen (`uses: mi-org/.github/workflows/deploy-stack.yml@v1`). Un solo lugar define "cómo desplegamos aquí", y todos lo heredan. Por ahora lo dejamos dentro del mismo repo, que es el mismo concepto a menor escala.

---

## 🛠️ Manos a la obra

### Paso 1: El workflow reutilizable

Crea `.github/workflows/deploy-stack.yml`. Es la lógica de despliegue, **parametrizada** por entorno y etiqueta de imagen:

```yaml
name: "Desplegar stack (reutilizable)"

on:
  workflow_call:
    inputs:
      entorno:
        required: true
        type: string
      image_tag:
        required: true
        type: string

jobs:
  desplegar:
    runs-on: ubuntu-latest
    environment: ${{ inputs.entorno }}     # ← el entorno (y su aprobación) sale del input
    steps:
      - uses: actions/checkout@v4
      - name: "Copiar el stack al manager"
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "stack.yml"
          target: "~/"
      - name: "Desplegar el stack"
        uses: appleboy/ssh-action@v1.0.3
        env:
          IMAGE_TAG: ${{ inputs.image_tag }}
        with:
          host: ${{ secrets.MANAGER_HOST }}
          username: ${{ secrets.MANAGER_USER }}
          key: ${{ secrets.SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            export IMAGE_TAG=$IMAGE_TAG
            docker stack deploy -c ~/stack.yml gestion
```

> 🧠 El `environment:` se fija con `${{ inputs.entorno }}`. Cuando el que llama lo invoque con `entorno: production`, este job apuntará al entorno `production` y **disparará su compuerta de aprobación** — exactamente como antes, pero definido una sola vez.

### Paso 2: El pipeline que lo orquesta

Reescribe `.github/workflows/deploy.yml` para que **construya** y luego **llame** al reutilizable dos veces:

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
    uses: ./.github/workflows/deploy-stack.yml    # ← llama al reutilizable
    with:
      entorno: staging
      image_tag: ${{ github.sha }}
    secrets: inherit                              # le pasa los secretos del entorno

  desplegar-produccion:
    needs: desplegar-staging
    uses: ./.github/workflows/deploy-stack.yml
    with:
      entorno: production
      image_tag: ${{ github.sha }}
    secrets: inherit
```

Fíjate qué corto quedó: cada job de despliegue es ahora **tres líneas** (`uses` + `with` + `secrets`). Toda la lógica vive en un solo archivo.

> 🧠 `secrets: inherit` pasa los secretos al workflow reutilizable. Como su job declara el `environment`, GitHub resuelve los secretos **de ese entorno** (la IP/llave de staging o de prod, según corresponda).

### Paso 3: Probar que nada cambió (salvo el código)

```bash
git add .github/workflows/deploy-stack.yml .github/workflows/deploy.yml
git commit -m "CD: extraer el despliegue a un workflow reutilizable"
git push
```

En **Actions** verás el mismo comportamiento de antes: build → staging automático → producción esperando aprobación. La diferencia es que ahora **no hay duplicación**: el "cómo se despliega" está en un solo sitio.

---

## ✅ Compruébalo

- [ ] Existe `.github/workflows/deploy-stack.yml` con `on: workflow_call`.
- [ ] `deploy.yml` invoca al reutilizable con `uses:` para staging y para producción.
- [ ] El pipeline se comporta igual: staging automático, producción con aprobación.
- [ ] Si cambias un paso del despliegue, lo cambias en **un solo** archivo.

---

## 🧠 Lo que aprendiste

- Un **workflow reutilizable** (`on: workflow_call`) define la lógica una vez; otros la invocan con `uses:` pasando `inputs` y `secrets`.
- El `environment:` se puede parametrizar (`${{ inputs.entorno }}`), así la **misma** lógica sirve para staging y para prod, con su compuerta incluida.
- `secrets: inherit` entrega los secretos (incluidos los del entorno) al workflow llamado.
- El siguiente nivel es un workflow **central de la organización** que todos los proyectos reutilizan (taller avanzado).

---

## 🏁 Cierre de la Fase 6

Tu entrega ya es de equipo profesional:

- **Entornos aislados** (staging y prod) desde un mismo código de Terraform, con workspaces.
- **Promoción** del mismo artefacto, con una **compuerta de aprobación** antes de producción.
- Un pipeline **DRY**, con la lógica de despliegue en un workflow reutilizable.

Pero queda una pregunta incómoda: **¿es segura la imagen que estás desplegando?** Nadie revisa si tiene vulnerabilidades conocidas, ni si tus dependencias están al día. Y para entrar a los servidores sigues repartiendo **llaves SSH** y contraseñas donde podrías usar **identidades**. En la próxima fase le metes **seguridad al pipeline**: escaneo de imágenes y dependencias, e identidades en vez de credenciales.

---

## 🧹 Apagar o destruir para no gastar

Tienes **dos clústeres** encendidos: límpialos.

```bash
cd infra
terraform workspace select staging && terraform destroy -var-file=staging.tfvars
terraform workspace select prod    && terraform destroy -var-file=prod.tfvars
```

Los workspaces se conservan (puedes recrear los recursos cuando vuelvas con `terraform apply`).

---

## 🆘 Si algo salió mal

**`error parsing called workflow ... not found`.**
La ruta en `uses:` debe ser relativa al repo: `./.github/workflows/deploy-stack.yml`. Confirma el nombre exacto del archivo y que está en `main`.

**El workflow reutilizable no ve los secretos.**
Te faltó `secrets: inherit` en el job que lo llama, o el secreto no existe en el **entorno** correcto (`staging`/`production`).

**Producción dejó de pedir aprobación.**
El `environment:` del reutilizable se fija con `${{ inputs.entorno }}`. Verifica que el job que llama pasa `entorno: production` y que ese entorno conserva su **revisor obligatorio**.

---

**➡️ Siguiente fase:** [Fase 7 — Seguridad (DevSecOps)](../07-seguridad-devsecops/README.md)
