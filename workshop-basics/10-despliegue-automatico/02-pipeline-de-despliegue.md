# Lección 10.2 — El pipeline de despliegue

> ⏱️ 45 minutos · 🎯 **Al terminar:** tendrás un pipeline que, en cada `push` a `main`, construye la imagen, la publica en GHCR y la despliega en tu servidor — sin que toques el servidor.

---

## 🤔 El problema

Quieres que GitHub haga, automáticamente, lo que tú hiciste a mano en la Fase 9: construir, publicar y desplegar. Para eso, GitHub necesita dos cosas: permiso para **publicar** la imagen (lo tiene de forma nativa) y una forma de **entrar a tu servidor** para decirle que se actualice (se la daremos con una llave SSH guardada de forma segura).

---

## 💡 Conceptos

### Secretos del repositorio

GitHub Actions puede guardar **secretos**: valores sensibles (como la llave para entrar a tu servidor) cifrados, que el pipeline usa sin que aparezcan en el código ni en los logs. Nunca pongas una llave o contraseña directamente en el workflow: va en los secretos.

### Las dos mitades del CD

Nuestro pipeline tendrá dos trabajos encadenados:
1. **Construir y publicar:** compila la imagen y la sube a GHCR.
2. **Desplegar:** entra al servidor por SSH y le ordena descargar la imagen nueva y reiniciar.

---

## 🛠️ Manos a la obra

### Paso 1: Guardar los secretos en GitHub

GitHub necesita entrar a tu servidor. Para eso usaremos tu llave SSH privada. En tu repositorio de GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Crea estos tres:

| Nombre del secreto | Valor |
|---|---|
| `VM_HOST` | la IP pública de tu servidor (`echo $IP`) |
| `VM_USER` | `azureuser` |
| `VM_SSH_KEY` | tu llave privada SSH completa (ver abajo) |

Para obtener la llave privada:
```bash
# Mac / Linux:
cat ~/.ssh/id_rsa
```
> 🪟 **Windows (PowerShell):** `Get-Content $HOME\.ssh\id_rsa`

Copia **todo** el contenido (desde `-----BEGIN...` hasta `-----END...`) y pégalo como valor de `VM_SSH_KEY`.

> ⚠️ En una empresa se usa una **llave de despliegue dedicada** (no tu llave personal), y la imagen se mantiene privada con un token. Para el taller, usamos tu llave y haremos la imagen pública, para no desviarnos. Nunca compartas tu llave privada.

### Paso 2: Crear el workflow de despliegue

Crea `.github/workflows/deploy.yml`:

```yaml
name: "CD — Construir y desplegar"

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
      packages: write           # permiso para publicar la imagen en GHCR
    steps:
      - uses: actions/checkout@v4

      - name: "Iniciar sesión en GHCR"
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # token automático, no lo configuras tú

      - name: "Construir y publicar la imagen"
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGEN }}:latest
            ${{ env.IMAGEN }}:${{ github.sha }}

  desplegar:
    needs: construir-publicar      # solo despliega si la imagen se publicó bien
    runs-on: ubuntu-latest
    steps:
      - name: "Desplegar en el servidor por SSH"
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd ~/gestion-empresas
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
```

Desglose:
- **`construir-publicar`**: descarga el código, inicia sesión en GHCR (con `GITHUB_TOKEN`, que GitHub provee solo) y publica la imagen con sus etiquetas.
- **`desplegar`** (`needs: construir-publicar`): entra a tu servidor con la llave SSH guardada y ejecuta `pull` + `up -d` con el compose de producción. El servidor solo **descarga** la imagen nueva.

### Paso 3: Preparar el servidor para el compose de producción

Tu servidor todavía corre el compose de la Fase 9 (que construía). Cámbialo al de producción. Enciende la VM si está apagada (`az vm start ...`), toma su IP, y:

```bash
# Desde tu máquina, copia el compose de producción al servidor
scp docker-compose.prod.yml azureuser@$IP:~/gestion-empresas/

# Entra al servidor y detén el compose anterior (conserva los datos del volumen)
ssh azureuser@$IP
cd ~/gestion-empresas
docker compose down
```
El `.env` con `DB_PASSWORD` ya existe en el servidor (lo creaste en la Fase 9). Sal del servidor: `exit`.

### Paso 4: Disparar el pipeline

Sube el workflow. El `push` a `main` lo activa:

```bash
git checkout -b ci/agregar-cd
git add .github/workflows/deploy.yml
git commit -m "agregar pipeline de despliegue automatico (CD)"
git push -u origin ci/agregar-cd
```
Abre el Pull Request, fusiónalo a `main` (eso dispara el CD), y ve a la pestaña **Actions**.

### Paso 5: Hacer pública la imagen (la primera vez)

El trabajo **construir-publicar** creará la imagen en GHCR. La primera vez, el paquete es **privado**, así que el servidor no podrá descargarlo y el trabajo **desplegar** fallará. Soluciónalo:

1. En GitHub, ve a tu perfil → pestaña **Packages** → abre `gestion-empresas-api`.
2. **Package settings** → **Change visibility** → **Public**.

Vuelve a **Actions**, abre la ejecución y pulsa **Re-run jobs** (o haz un pequeño push). Ahora el trabajo **desplegar** descargará la imagen y la levantará en el servidor.

> 🧠 En una empresa, la imagen se queda **privada** y el servidor se autentica con un token. La hacemos pública solo para simplificar el taller.

### Paso 6: Comprobar

Cuando ambos trabajos estén en verde, visita `http://<IP>:5000/empresas`. La app está corriendo desde la imagen que **GitHub construyó y desplegó solo**. No tocaste el servidor.

---

## ✅ Compruébalo

- [ ] Configuraste los tres secretos (`VM_HOST`, `VM_USER`, `VM_SSH_KEY`).
- [ ] El workflow `deploy.yml` se ejecutó: ambos trabajos (construir-publicar y desplegar) en verde.
- [ ] La imagen aparece en tus **Packages** de GitHub (y la hiciste pública).
- [ ] `http://<IP>:5000/empresas` responde, servido por la imagen desplegada automáticamente.

---

## 🧠 Lo que aprendiste

- Los **secretos** de GitHub guardan valores sensibles (como tu llave SSH) de forma segura.
- El CD tiene dos trabajos: **construir-publicar** (imagen → GHCR) y **desplegar** (SSH → `pull` + `up`).
- El servidor solo **descarga** la imagen; ya no construye nada.
- La visibilidad del paquete decide si el servidor puede bajarlo sin autenticarse.

---

## 🆘 Si algo salió mal

**El trabajo "desplegar" falla con "denied" o "manifest unknown" al hacer pull.**
La imagen sigue privada. Hazla **pública** (Paso 5) y vuelve a ejecutar.

**Falla la conexión SSH desde el workflow ("handshake failed" / "permission denied").**
Revisa que `VM_SSH_KEY` contenga la llave **privada completa** (con las líneas BEGIN/END) y que `VM_HOST` sea la IP actual del servidor (si reiniciaste la VM, pudo cambiar; actualiza el secreto).

**"port is already allocated" al desplegar.**
El compose de la Fase 9 sigue corriendo. Hiciste `docker compose down` en el Paso 3 para liberarlo; verifica que se ejecutó en el servidor.

---

**➡️ Siguiente:** [El ciclo completo de punta a punta](03-ciclo-completo.md)
