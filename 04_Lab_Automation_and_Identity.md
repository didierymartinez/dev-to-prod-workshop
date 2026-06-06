# Laboratorio 4: Automatización e Identidad — El Runner Seguro

> **Objetivo:** Instalar el agente de GitHub (Runner) en nuestra VM de forma 100% automatizada y segura. Usaremos la Identidad de la VM para rescatar el Token de GitHub del Key Vault, garantizando que el secreto nunca sea revelado.

---

## 💡 El Mapa: Despliegue "Zero Secrets"

### 🤔 El Problema
Para conectar nuestra VM a GitHub, necesitamos un **Personal Access Token (PAT)**. Si ponemos el PAT en el código o lo escribimos manualmente por SSH:
1. Queda expuesto en el historial de comandos.
2. Si la VM muere, hay que repetir el proceso manual.

### 💡 La Solución
Usaremos un **Triángulo de Confianza**:
1. **Managed Identity**: Le da una "cédula" a la VM.
2. **Key Vault**: Guarda el PAT de GitHub.
3. **Cloud-Init**: El script que, al nacer la VM, usa la Identidad para sacar el PAT del Key Vault e instalar el Runner.

---

## 📝 Paso 1: Configurar la Identidad y el Cofre (Terraform)

**Actualiza tu `main.tf`** con los componentes de seguridad y la referencia al script de arranque:

```hcl
variable "github_token" {
  type      = string
  sensitive = true
}

# 1. Reemplaza el bloque de tu VM con este (agregando la Identidad y el Cloud-Init):
resource "azurerm_linux_virtual_machine" "vm" {
  name                = "vm-cosmos-dev-eus-001"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_D2s_v3"
  admin_username      = "azureuser"

  network_interface_ids = [azurerm_network_interface.vm_nic.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }

  identity { type = "SystemAssigned" }

  custom_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
    kv_name = azurerm_key_vault.kv.name
  }))
}


# 2. Key Vault para guardar el PAT
resource "azurerm_key_vault" "kv" {
  name                = "kv-cosmos-dev-eus-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
  }

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_linux_virtual_machine.vm.identity[0].principal_id
    secret_permissions = ["Get"]
  }
}


# 3. El Secreto Físico
resource "azurerm_key_vault_secret" "github_pat" {
  name         = "github-pat"
  value        = var.github_token
  key_vault_id = azurerm_key_vault.kv.id
}
```

### 🧠 Desglose del Código: ¿Qué está pasando aquí?

*   **¿Qué es un *Service Principal* y qué hace `SystemAssigned`?**
    En Azure, las personas reales tienen cuentas de usuario (con email y contraseña) en Azure Active Directory. Pero, ¿qué pasa si un servidor (una VM) necesita leer una base de datos o un Key Vault? No le damos un email y una contraseña, le creamos una cuenta para máquinas llamada **Service Principal**. 
    Al poner `identity { type = "SystemAssigned" }`, le decimos a Azure: *"Crea un Service Principal automáticamente y amárralo a la existencia física de esta VM"*. Si la VM se destruye, la cuenta se destruye. Nadie conoce ni gestiona contraseñas.
*   **`templatefile` y `base64encode`**: 
    El parámetro `custom_data` envía el script de arranque (`cloud-init`) a la máquina. Usamos `templatefile` para inyectar variables de Terraform (como el nombre dinámico del Key Vault) directo en el Bash. Luego usamos `base64encode` porque Azure exige que los scripts de arranque viajen codificados en Base64.
*   **Las dos `access_policy` del Key Vault**: 
    1. La primera política es para **TI** (el humano corriendo Terraform). Te da permisos de `Set` y `Delete` para que puedas crear y destruir el secreto.
    2. La segunda política es para **LA MÁQUINA** (usando el ID del *Service Principal* que acabamos de crear). Solo le damos permiso de `Get`. Así aplicamos el **Principio de Menor Privilegio**: la máquina solo puede leer su contraseña, no borrarla ni modificar el Key Vault.

---

## 📝 Paso 2: El Script Maestro (`cloud-init.yaml`)

Crea el archivo `cloud-init.yaml`. Este script es el que hace la magia de **obtener el secreto sin que tú intervengas**:

```yaml
#cloud-config
package_update: true
packages:
  - docker.io
  - curl
  - jq

runcmd:
  # 1. Preparar Docker y Swarm (Conservado del Lab 3)
  - systemctl enable --now docker
  - usermod -aG docker azureuser
  - docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
  - docker network create --driver overlay --attachable oxp-public
  - docker network create --driver overlay --attachable oxp-internal
  
  # 2. Instalar Azure CLI (necesario para interactuar con Key Vault)
  - curl -sL https://aka.ms/InstallAzureCLIDeb | bash
  
  # 3. Autenticación Zero Secrets
  - |
    for i in {1..12}; do
      az login --identity && break || sleep 10
    done

  
  # 4. Rescate del secreto desde el Key Vault
  # Nota cómo usamos la variable inyectada por Terraform (${kv_name}).
  - GITHUB_TOKEN=$(az keyvault secret show --name github-pat --vault-name ${kv_name} --query value -o tsv)
  
  # 5. Descarga e Instalación silenciosa del Runner
  - mkdir /home/azureuser/actions-runner && cd /home/azureuser/actions-runner
  - curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
  - tar xzf ./runner.tar.gz
  - chown -R azureuser:azureuser /home/azureuser/actions-runner
  
  - sudo -u azureuser ./config.sh --url https://github.com/Cosmos-SincoERP --token $GITHUB_TOKEN --name vm-cosmos-dev-eus-001 --unattended --replace

  
  # 6. Registrar como servicio del sistema (para que sobreviva reinicios)
  - ./svc.sh install
  - ./svc.sh start
```

### 🧠 Desglose del Script: La Magia del Cloud-Init

*   **El Loop de `az login --identity`**: 
    Este es el núcleo de Zero Secrets. La VM le dice a Azure "déjame entrar porque yo soy esta máquina física". El login se hace sin credenciales. ¿Por qué el loop (`for i in {1..12}`)? Porque cuando Terraform crea la VM, el *Service Principal* puede tardar un par de minutos en propagarse globalmente por los servidores de Microsoft. El loop reintenta pacientemente en lugar de fallar.
*   **`az keyvault secret show`**: 
    La máquina descarga su propio secreto usando la variable `${kv_name}` que Terraform inyectó previamente con el `templatefile`.
*   **`sudo -u azureuser` y `--unattended`**: 
    Por razones estrictas de seguridad, GitHub no permite que su Runner se instale siendo el súper administrador (`root`). Por eso usamos `sudo -u` para ejecutarlo como el usuario estándar. El flag `--unattended` es vital en la nube: evita que el instalador se pause esperando a que presiones "Y/N" en el teclado.

---


## 🔍 Comprobación: Runner Online

1. **Asegúrate de tener el PAT** en `terraform.tfvars`.
2. **Aplica**: `terraform apply -var-file=terraform.tfvars`.
3. **Verifica**: Ve a GitHub → Organization Settings → Actions → Runners.
4. **Propósito cumplido**: Si el Runner aparece **Online**, has logrado configurar un agente de CI/CD en la nube **sin que el token de seguridad haya sido revelado en ningún log o terminal.**

---

**🏆 ¡Victoria!** Tu infraestructura es ahora una extensión segura de tu proceso de desarrollo.

**🤔 Sin embargo, queda una duda:**
Ya tenemos al "obrero" conectado, pero... **¿Dónde guardará las imágenes que compile? ¿Cómo automatizamos que al hacer Push se despliegue la app en el Swarm?**

**➡️ Descúbrelo en el siguiente lab:** Abre `05_Lab_CICD_Pipeline.md`.
