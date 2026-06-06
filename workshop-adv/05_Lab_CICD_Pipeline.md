# Laboratorio 5: Integración Continua — El Almacén y el Pipeline

> **Objetivo:** Implementar el ciclo completo de CI/CD de Cosmos. Crearemos un almacén privado de imágenes (ACR) y configuraremos un Workflow que compile, versione y despliegue nuestra aplicación automáticamente al clúster.

---

## 💡 El Mapa: El Ciclo de Vida del Código
Ya tenemos un Runner (nuestra VM) conectado a GitHub. Ahora necesitamos darle un propósito:

1.  **Registro (ACR)**: Un lugar privado para nuestras imágenes de Docker.
2.  **Workflow**: Las instrucciones que le dicen al Runner qué hacer cuando hay un `push` a `main`.

---

## 📝 Paso 1: El Almacén Privado (ACR)

**Agrega esto a tu `main.tf`**:

```hcl
resource "azurerm_container_registry" "acr" {
  name                = "acrcosmosdeveus${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = false
}

resource "azurerm_role_assignment" "vm_acr_push" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_linux_virtual_machine.vm.identity[0].principal_id
}
```

### 🧠 Desglose del Código: ¿Qué estamos configurando?
*   **`admin_enabled = false`**: 
    Por defecto, Azure Container Registry puede generar un usuario administrador con una contraseña estática. Al deshabilitarlo explícitamente, obligamos al sistema a usar **Role Based Access Control (RBAC)** y Managed Identities. ¡Cortamos de raíz la posibilidad de usar o filtrar contraseñas!
*   **Rol `AcrPush`**: 
    Le asignamos el rol de "AcrPush" al *Service Principal* de nuestra VM. En Azure, el rol `AcrPush` incluye implícitamente los permisos de `AcrPull`. Esto significa que nuestro Runner tiene permiso total para construir la imagen (Push) y luego descargarla para correrla en Docker Swarm (Pull).

---

## 📝 Paso 2: Transversalidad y Reusable Workflows

### 🤔 El Problema de Escalar
En un proyecto pequeño, escribirías la lógica de docker build y deploy directamente en cada repositorio. Pero Cosmos tiene **14 Bounded Contexts** (Contabilidad, Radicación, Entradas, etc.). Si el equipo de Plataforma necesita añadir un paso de seguridad (ej: escanear vulnerabilidades con Trivy), ¿tendrían que modificar 14 repositorios uno por uno? 

### 💡 La Solución Cosmos: Reusable Workflows (`workflow_call`)
Cosmos implementa el patrón de **Centralización Transversal**. Todo el código de "cómo compilar y desplegar" vive en un único repositorio (`ApplicationPlane`). Los repositorios de los Bounded Contexts **no** tienen la lógica de despliegue; simplemente "llaman" al workflow central y le inyectan sus variables específicas (ej: nombre de la app, ACR destino).

Vamos a replicar este patrón creando el "workflow central" y luego el "workflow llamador".

**1. Crea el Reusable Workflow (`.github/workflows/_reusable-deploy.yml`)**:
Este archivo simula estar en el repositorio central de Plataforma.

```yaml
name: "♻️ Reusable: Build & Deploy"

on:
  workflow_call:
    inputs:
      app_name:
        required: true
        type: string

jobs:
  build-and-deploy:
    runs-on: [ self-hosted ]
    
    steps:
      - name: "📦 Checkout"
        uses: actions/checkout@v4

      - name: "🛠️ Docker Build, Tag & Push"
        run: |
          ACR_NAME=$(az acr list --query "[0].name" -o tsv)
          IMAGE_NAME="$ACR_NAME.azurecr.io/${{ inputs.app_name }}"
          TAG="${{ github.run_number }}"
          
          az acr login --name $ACR_NAME
          
          docker build -t $IMAGE_NAME:$TAG -t $IMAGE_NAME:latest .
          docker push $IMAGE_NAME --all-tags

      - name: "🚢 Deploy to Swarm"
        run: |
          docker stack deploy -c stack.yml cosmos --with-registry-auth
```

### 🧠 Desglose del Workflow: ¿Por qué funciona esto?
*   **`on: workflow_call`**: 
    Esto es lo que convierte a este archivo en una "función" que otros repositorios pueden invocar. Define los `inputs` (parámetros) que el repositorio llamador debe enviarle (en este caso, `app_name`).
*   **`runs-on: [ self-hosted ]`**: 
    Instruye a GitHub a NO usar sus servidores públicos, sino enrutar este trabajo directamente a la VM (Runner) que aprovisionamos en el Lab 4.
*   **El misterio del `az acr login` sin contraseña**: 
    ¿Cómo logra el script iniciar sesión en el ACR si nunca le pasamos un secreto? La respuesta está en el Lab 4. Como el Runner se está ejecutando dentro de nuestra VM, y esa VM hizo `az login --identity` al arrancar, el Runner hereda automáticamente la sesión del *Service Principal*. Magia pura de la nube.
*   **`--with-registry-auth`**: 
    Cuando Docker Swarm intenta desplegar la imagen, también necesita autenticación. Este flag toma la sesión actual del runner y la propaga temporalmente a todos los nodos del clúster Swarm para que puedan descargar la imagen.

**2. Crea el Workflow Llamador (`.github/workflows/dev-deploy.yml`)**:
Este es el único archivo que viviría en `Cosmos.Contabilidad`. Solo tiene unas pocas líneas e invoca al maestro.

```yaml
name: "🚀 Cosmos CI/CD: Dev Deploy"

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    # En producción apuntaría a: Cosmos-SincoERP/ApplicationPlane/.github/workflows/_reusable-deploy-swarm.yml@main
    uses: ./.github/workflows/_reusable-deploy.yml
    with:
      app_name: "cosmos-app"
```

---

## 📝 Paso 3: La Aplicación de Prueba (`Dockerfile`)

Crea un `Dockerfile` simple en la raíz de tu repo:

```dockerfile
FROM nginx:alpine
RUN echo "<h1>Cosmos v${GITHUB_RUN_NUMBER}</h1>" > /usr/share/nginx/html/index.html
```

---

## 🔍 Comprobación: El Círculo Completo

1. **Aplica Terraform**: `terraform apply`.
2. **Push**: Haz un `git push` a la rama `main`.
3. **Verifica**:
    - En GitHub Actions verás el pipeline corriendo en **tu VM**.
    - En el Portal de Azure → **ACR** → **Repositories** verás la imagen `cosmos-app`.
    - En el navegador (IP de la VM) verás el mensaje "Cosmos vX".

**🏆 ¡Victoria!** Has automatizado el ciclo de vida completo. El código pasa de tu mano al clúster de forma privada, segura y sin contraseñas.

---

**🤔 Sin embargo, queda una duda:**
Nuestra app es inmanejable si no tiene datos. **¿Cómo conectamos este pipeline con una base de datos que persista aunque la VM muera?**

**➡️ Descúbrelo en el siguiente lab:** Abre `06_Lab_Persistence_DB.md`.
