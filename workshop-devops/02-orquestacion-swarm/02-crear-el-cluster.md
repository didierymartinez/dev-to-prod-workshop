# Lección 2.2 — Crear el clúster

> ⏱️ 40 minutos · 🎯 **Al terminar:** tendrás un clúster Docker Swarm de **dos nodos** (un manager y un worker), creados con Terraform y unidos en un solo clúster listo para recibir tu app.

---

## 🤔 El problema

Un clúster necesita **varias máquinas**. En la Fase 1 declaraste una sola VM. Ahora ampliaremos esa infraestructura —con Terraform, lo que ya sabes— para tener un segundo nodo, y uniremos ambos en un clúster Swarm.

---

## 💡 Conceptos

### Manager y worker

- El **manager** coordina el clúster: guarda el "estado deseado" (qué servicios y cuántas réplicas) y reparte el trabajo. Desde él administras todo.
- Los **workers** solo ejecutan las tareas que el manager les asigna.

Para el taller usamos **un manager + un worker** (suficiente para ver la orquestación). En producción se usan varios managers (para tolerancia a fallos) y varios workers.

### Cómo se forma un clúster

1. En el futuro manager: `docker swarm init` → crea el clúster y te da un **token de unión**.
2. En cada worker: `docker swarm join --token <token> <ip-del-manager>:2377` → se une al clúster.

Los nodos se comunican por unos puertos específicos de Swarm, que abriremos en el firewall **solo dentro de la red privada**.

---

## 🛠️ Manos a la obra

### Paso 1: Abrir los puertos de Swarm en el firewall

En `infra/main.tf`, dentro del bloque `azurerm_network_security_group.app` (el firewall de la Fase 1), **agrega** estas dos reglas junto a las que ya tienes (SSH y App). Solo permiten tráfico **dentro de la red virtual** (`VirtualNetwork`), no desde internet:

```hcl
  security_rule {
    name                       = "Swarm-TCP"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["2377", "7946"]   # gestión del clúster + comunicación entre nodos
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "Swarm-UDP"
    priority                   = 210
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Udp"
    source_port_range          = "*"
    destination_port_ranges    = ["7946", "4789"]   # comunicación entre nodos + red overlay
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
```

### Paso 2: Declarar el segundo nodo (worker)

También en `infra/main.tf`, **agrega** el worker (su IP pública para SSH, su tarjeta de red, la asociación al firewall y la VM). Es el mismo patrón de la VM de la Fase 1:

```hcl
# IP pública del worker
resource "azurerm_public_ip" "worker" {
  name                = "pip-worker"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Tarjeta de red del worker
resource "azurerm_network_interface" "worker" {
  name                = "nic-worker"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name
  ip_configuration {
    name                          = "interna"
    subnet_id                     = azurerm_subnet.interna.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.worker.id
  }
}

# El worker usa el MISMO firewall que el manager
resource "azurerm_network_interface_security_group_association" "worker" {
  network_interface_id      = azurerm_network_interface.worker.id
  network_security_group_id = azurerm_network_security_group.app.id
}

# La VM worker
resource "azurerm_linux_virtual_machine" "worker" {
  name                  = "vm-worker"
  resource_group_name   = azurerm_resource_group.principal.name
  location              = azurerm_resource_group.principal.location
  size                  = var.vm_size
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.worker.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(var.ssh_public_key_path)
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
}

# IPs útiles para los siguientes pasos
output "ip_publica_worker" {
  value = azurerm_public_ip.worker.ip_address
}
output "ip_privada_manager" {
  value = azurerm_network_interface.app.private_ip_address
}
```

> 🧠 El manager es la VM `vm-app` de la Fase 1 (su recurso interno es `azurerm_linux_virtual_machine.app`). Aquí solo agregamos el worker; reutilizamos sus variables (`var.vm_size`, `var.ssh_public_key_path`) de la Fase 1.

Aplica los cambios:
```bash
cd infra
terraform apply
```

### Paso 3: Instalar Docker en ambos nodos

> 💡 Los comandos `terraform` y `ssh` de esta lección se ejecutan **desde la carpeta `infra/`** (donde vive tu estado de Terraform). Si abriste una terminal nueva, haz `cd infra` primero — si no, `terraform output` no encontrará el estado.

Las VMs vienen vacías. Instala Docker en **cada** nodo (igual que en el básico). Primero el **manager**:

```bash
ssh azureuser@$(terraform output -raw ip_publica)        # entra al manager (vm-app)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser
exit
```
Repite en el **worker**:
```bash
ssh azureuser@$(terraform output -raw ip_publica_worker)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser
exit
```

> 🧠 Instalar Docker en cada nodo a mano es repetitivo. En un entorno real se automatiza con un **script de arranque** (cloud-init) en el propio Terraform, para que cada VM nazca con Docker. Lo dejamos como mejora; aquí el foco es Swarm.

### Paso 4: Iniciar el clúster en el manager

Primero, en **tu máquina** (no dentro de la VM), obtén la **IP privada** del manager —la necesitarás en el comando de abajo— y anótala:

```bash
cd infra
terraform output -raw ip_privada_manager      # ej: 10.0.1.4 — cópiala
```

Ahora entra al manager y crea el clúster, anunciando esa IP privada (por la que los nodos se hablan):

```bash
ssh azureuser@$(terraform output -raw ip_publica)
docker swarm init --advertise-addr <IP_PRIVADA_MANAGER>   # pega la IP que anotaste, ej: 10.0.1.4
```

> 💡 Esa IP privada (`10.0.x.x`) vive **dentro** de la red de Azure; por eso la consultas con Terraform desde tu máquina, no dentro de la VM (allí no tienes Terraform).
La salida te da el comando para unir workers, con un **token**. Cópialo completo; se ve así:
```
docker swarm join --token SWMTKN-1-xxxx... <IP_PRIVADA_MANAGER>:2377
```

### Paso 5: Unir el worker al clúster

Sin cerrar el manager, abre **otra terminal**, entra al worker y pega el comando de unión:

```bash
ssh azureuser@$(terraform output -raw ip_publica_worker)
docker swarm join --token SWMTKN-1-xxxx... <IP_PRIVADA_MANAGER>:2377
```
Debe responder `This node joined a swarm as a worker.`

### Paso 6: Comprobar el clúster

Vuelve a la terminal del **manager** y lista los nodos:

```bash
docker node ls
```
Verás **dos** nodos, ambos `Ready` y `Active`, con el manager marcado como `Leader`:
```
ID        HOSTNAME    STATUS   AVAILABILITY   MANAGER STATUS
abc...*   vm-app      Ready    Active         Leader
def...    vm-worker   Ready    Active
```

¡Tienes un clúster! 🎉

### Paso 7: Guardar el avance

```bash
cd ..   # (en tu máquina) raíz del proyecto
git add infra/main.tf
git commit -m "agregar nodo worker y reglas de red para el clúster Swarm"
git push
```

---

## ✅ Compruébalo

- [ ] `terraform apply` creó el worker y las reglas de red de Swarm.
- [ ] Instalaste Docker en ambos nodos (`docker --version` funciona en cada uno).
- [ ] `docker swarm init` en el manager y `docker swarm join` en el worker funcionaron.
- [ ] `docker node ls` (en el manager) muestra los **dos** nodos en `Ready`.

---

## 🧠 Lo que aprendiste

- Un clúster Swarm tiene un **manager** (coordina) y **workers** (ejecutan).
- Se forma con `docker swarm init` (manager) y `docker swarm join` (workers), por el puerto 2377.
- Los nodos necesitan puertos propios de Swarm abiertos **dentro de la red privada** (2377, 7946, 4789).
- Ampliaste tu infraestructura Terraform para sumar un nodo — IaC y orquestación trabajando juntas.

---

## 🆘 Si algo salió mal

**`docker node ls` dice "this node is not a swarm manager".**
Lo ejecutaste en el worker. Los comandos de administración van en el **manager**.

**El worker no se une / "timeout".**
Revisa que usaste la **IP privada** del manager (no la pública) y que las reglas `Swarm-TCP/UDP` están en el firewall (Paso 1) y aplicadas (`terraform apply`).

**"docker: permission denied" tras instalar Docker.**
No reabriste la sesión SSH tras el `usermod -aG docker`. Haz `exit` y entra de nuevo.

---

**➡️ Siguiente:** [De compose a stack](03-de-compose-a-stack.md)
