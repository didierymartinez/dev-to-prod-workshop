# Lección 1.3 — Declarar el servidor

> ⏱️ 40 minutos · 🎯 **Al terminar:** habrás recreado con Terraform la máquina del básico —con su red, su IP pública y su firewall— pero ahora como código. Verás todas las piezas que `az vm create` armaba "por debajo".

---

## 🤔 El problema

En el básico, una sola línea (`az vm create …`) te dio un servidor. Fue cómodo, pero esa línea escondía mucho: creó una red, una subred, una IP pública, una tarjeta de red, un firewall y la VM, todo de golpe. Con Terraform vamos a declarar **cada pieza explícitamente**. Suena a más trabajo, pero el beneficio es enorme: verás y controlarás exactamente de qué está hecha tu infraestructura.

---

## 💡 Conceptos

### Una VM no está sola: necesita su entorno

Un servidor en la nube necesita varias piezas para funcionar y ser accesible:

```
┌─────────────────────────────────────────────────┐
│  Red virtual (VNet)        — el espacio de red    │
│   └ Subred (Subnet)        — un segmento de la red│
│  IP pública                — su dirección en internet
│  Tarjeta de red (NIC)      — conecta la VM a la red y a la IP
│  Firewall (NSG)            — qué puertos se abren  │
│  Máquina virtual (VM)      — el servidor en sí     │
└─────────────────────────────────────────────────┘
```

`az vm create` creaba todas estas piezas automáticamente. Terraform te pide declararlas — y eso es bueno: nada queda oculto.

### Referencias entre recursos

En Terraform, un recurso puede **referirse a otro** por su nombre interno. Por ejemplo, la tarjeta de red usa `azurerm_subnet.interna.id` para decir "conéctate a esa subred". Terraform entiende estas dependencias y crea las piezas **en el orden correcto** automáticamente.

---

## 🛠️ Manos a la obra

### Paso 1: Agregar la infraestructura de red y la VM

Abre `infra/main.tf` (el que creaste en la lección 1.2) y **agrega** estos recursos después del grupo de recursos:

```hcl
# Red virtual: el espacio de red privado
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-gestion"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name
}

# Subred: un segmento dentro de la red
resource "azurerm_subnet" "interna" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.principal.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# IP pública: la dirección de la VM en internet
resource "azurerm_public_ip" "app" {
  name                = "pip-app"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Firewall (NSG): abre SSH (22) y la app (5000)
resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name

  security_rule {
    name                       = "SSH"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "App"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Tarjeta de red (NIC): conecta la VM a la subred y a la IP pública
resource "azurerm_network_interface" "app" {
  name                = "nic-app"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name

  ip_configuration {
    name                          = "interna"
    subnet_id                     = azurerm_subnet.interna.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.app.id
  }
}

# Asociar el firewall a la tarjeta de red
resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

# La máquina virtual
resource "azurerm_linux_virtual_machine" "app" {
  name                  = "vm-app"
  resource_group_name   = azurerm_resource_group.principal.name
  location              = azurerm_resource_group.principal.location
  size                  = "Standard_B1s"
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.app.id]

  # Usa tu llave SSH pública (la misma del básico)
  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
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

# Mostrar la IP pública al terminar
output "ip_publica" {
  value = azurerm_public_ip.app.ip_address
}
```

Desglose de lo nuevo:
- Cada recurso **se refiere a otros** por su nombre interno (ej: `azurerm_resource_group.principal.name`). Terraform deduce el orden de creación.
- **`file("~/.ssh/id_rsa.pub")`** lee tu llave SSH pública (la que generaste en el básico) directamente del archivo. Si tu llave tiene otro nombre o ruta (p. ej. `~/.ssh/id_ed25519.pub`), ajústala aquí. En la lección 1.5 lo convertiremos en una variable.
- **`output "ip_publica"`** declara un valor que Terraform te mostrará al terminar — útil para conectarte por SSH sin buscar la IP a mano.

### Paso 2: Plan y apply

```bash
cd infra
terraform plan
```
Verás `Plan: 7 to add` (los 7 recursos nuevos). Revísalo y aplica:

```bash
terraform apply
```
Escribe `yes`. En 1-2 minutos, Terraform crea toda la infraestructura. Al final imprime la IP pública:

```
Outputs:
ip_publica = "20.x.x.x"
```

### Paso 3: Comprobar — entrar al servidor

Terraform puede darte el output directamente:

```bash
ssh azureuser@$(terraform output -raw ip_publica)
```
Entras a tu servidor — **creado enteramente por código**. Escribe `exit` para volver.

### Paso 4: Guardar el avance

```bash
cd ..
git add infra/main.tf
git commit -m "declarar la VM y su red con Terraform"
git push
```

---

## ✅ Compruébalo

- [ ] `terraform plan` mostró los 7 recursos a crear antes de aplicar.
- [ ] `terraform apply` creó la VM y su red; el output `ip_publica` apareció.
- [ ] Pudiste entrar con `ssh azureuser@$(terraform output -raw ip_publica)`.
- [ ] Entiendes qué piezas (red, subred, IP, NIC, firewall, VM) componen un servidor.

---

## 🧠 Lo que aprendiste

- Una VM necesita su **entorno**: red, subred, IP pública, tarjeta de red y firewall. `az vm create` los creaba ocultos; Terraform los hace explícitos.
- Los recursos se **refieren entre sí** por su nombre interno, y Terraform deduce el orden.
- `file(...)` lee un archivo (tu llave SSH); `output` te muestra valores al terminar.

---

## 🆘 Si algo salió mal

**`apply` falla: "no such file ~/.ssh/id_rsa.pub".**
No tienes la llave SSH del básico. Genérala con `ssh-keygen -t rsa -b 4096` (acepta los valores por defecto) y reintenta.

**`apply` falla por nombre o cuota.**
Revisa que el grupo de recursos exista (lección 1.2) y que tu suscripción permita crear VMs en esa región.

**No puedo entrar por SSH.**
Verifica que la regla "SSH" (puerto 22) esté en el NSG y que uses `azureuser`. Da un minuto tras el `apply` para que la VM termine de arrancar.

---

**➡️ Siguiente:** [El estado de Terraform](04-el-estado-de-terraform.md)
