# Laboratorio 2: Cómputo Básico — La VM y el Motor de Docker

> **Objetivo:** Ejecutar nuestra primera aplicación en la nube de Azure usando contenedores. Aprenderemos por qué Docker es la solución al problema de "en mi máquina funciona" y cómo desplegar una imagen pública en segundos.

---

## 📝 Paso 1: El Servidor (Virtual Machine)

### 🤔 El Problema
Necesitamos un lugar donde ejecutar código. Podríamos usar servicios PaaS (como App Service), pero Cosmos utiliza **Virtual Machines** para tener control total sobre la red y el orquestador (Docker Swarm).

### 💡 La Solución
Crearemos una **VM Linux (Ubuntu)**. Para que sea accesible en este laboratorio inicial, le asignaremos una **IP Pública** y abriremos el puerto **80 (HTTP)**. 

> ⚠️ **Nota de Seguridad**: En el Lab 7 eliminaremos la IP pública y cerraremos el puerto 80 al mundo, dejando que solo Front Door pueda entrar. Por ahora, lo dejamos abierto para entender la base.

### 🚀 Paso 0: Preparación de Accesos
Para poder entrar a tu servidor en Azure, necesitas una "llave digital" (SSH Key). Vamos a crear una nueva ahora mismo:

1. **Genera la llave** ejecutando esto en tu terminal:
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
   ```
2. **Crea tu archivo de variables** llamado `terraform.tfvars` en la carpeta `mi-cosmos/`:
   ```bash
   # Copia el contenido de tu llave pública al archivo de variables
   echo "ssh_public_key = \"$(cat ~/.ssh/id_rsa.pub)\"" > terraform.tfvars
   ```

### 🚀 Ejecución

**Agrega esto a tu `main.tf`** (incluyendo la variable al principio para que Terraform sepa recibir la llave):

```hcl
variable "ssh_public_key" {
  type        = string
  description = "Llave pública para entrar a la VM"
}

# 1. IP Pública
resource "azurerm_public_ip" "vm_pip" {
  name                = "pip-cosmos-dev-eus-001"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

# 2. Interfaz de Red (NIC)
resource "azurerm_network_interface" "vm_nic" {
  name                = "nic-cosmos-dev-eus-001"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vm_subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.vm_pip.id
  }
}

# 3. La Máquina Virtual
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
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  custom_data = base64encode(<<-EOF
    #cloud-config
    package_update: true
    packages:
      - docker.io
    runcmd:
      - systemctl enable --now docker
      - usermod -aG docker azureuser
  EOF
  )
}

output "vm_public_ip" {
  value = azurerm_public_ip.vm_pip.ip_address
}
```

### 🧠 Desglose del Código: El Primer Servidor

*   **¿Por qué `Standard_D2s_v3`?**: 
    Es un SKU equilibrado: 2 CPUs virtuales y 8 GB de RAM. En Cosmos, elegimos la serie "D" porque ofrece un rendimiento consistente para microservicios .NET, a diferencia de la serie "B" (Burstable) que puede ralentizarse si hay mucha carga.
*   **NIC e IP Pública**: 
    La NIC es el cable de red virtual. Al conectarle una `public_ip`, le estamos dando una cara al mundo. Recuerda: esto es solo para el taller; en producción, el "Zero Public IP" es la regla y accederíamos vía Bastion o VPN.
*   **Custom Data (Cloud-Init)**: 
    Este bloque es magia de automatización. En lugar de entrar por SSH a instalar Docker manualmente, le pasamos estas instrucciones a Azure. Azure las ejecuta justo en el "primer respiro" de la máquina, garantizando que cuando tú entres por primera vez, Docker ya esté listo para trabajar.
*   **`base64encode`**: 
    Azure exige que el script de arranque viaje codificado para evitar que caracteres especiales rompan la comunicación entre Terraform y la nube.


Aplica los cambios:

```bash
terraform apply -var-file=terraform.tfvars
```

---

## 📝 Paso 2: El Primer Contenedor (`docker run`)

### 🤔 El Problema
Ya tenemos la VM. Podríamos instalar Nginx con `apt-get install nginx`, pero eso modificaría el sistema operativo. Si mañana queremos cambiar la versión de Nginx o instalar otra app que choque con sus librerías, tendremos un problema.

### 💡 La Solución
Usamos **Docker**. Docker nos permite bajar una "imagen" (un paquete con todo lo necesario) y correrla en un "contenedor" (un proceso aislado).

### 🚀 Ejecución

1. Entra a tu VM por SSH:
   ```bash
   SSH_IP=$(terraform output -raw vm_public_ip)
   ssh azureuser@$SSH_IP
   ```

> [!TIP]
> **¿Error "REMOTE HOST IDENTIFICATION HAS CHANGED"?**
> Si recreaste la VM y te da este error, ejecuta: `ssh-keygen -R <IP_DE_LA_VM>` para limpiar la identidad antigua en tu computadora.
2. Ejecuta un servidor web Nginx:
   ```bash
   # Descarga y corre la imagen pública de nginx
   docker run -d -p 80:80 --name mi-web nginx:alpine
   ```
3. Verifica que está corriendo:
   ```bash
   docker ps
   ```

### 🔍 Comprobación
Abre tu navegador y ve a `http://<IP_PUBLICA_DE_LA_VM>`. Deberías ver la página de bienvenida de Nginx.

---

---

**🏆 ¡Felicidades!** Has desplegado tu primer recurso y has corrido un contenedor en la nube.

**🤔 Sin embargo, queda una duda:**
Ya vimos que podemos correr una app con un comando, pero... **¿Qué pasa si el contenedor falla a las 3 AM? ¿Quién lo reinicia? ¿Y si necesitamos 10 copias de la misma app para soportar un pico de tráfico?**

**➡️ Descúbrelo en el siguiente lab:** Abre `03_Lab_Orchestration.md`.
