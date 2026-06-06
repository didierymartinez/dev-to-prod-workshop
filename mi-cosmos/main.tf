terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = false
    }
  }
}


resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}


data "azurerm_client_config" "current" {}


resource "azurerm_resource_group" "rg" {
  name     = "rg-cosmos-dev-eus-001"
  location = "East US"

  tags = {
    workload    = "cosmos-taller"
    environment = "dev"
    managedBy   = "terraform"
  }
}


resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-cosmos-dev-eus-001"
  address_space       = ["10.40.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  tags = azurerm_resource_group.rg.tags
}

resource "azurerm_subnet" "vm_subnet" {
  name                 = "snet-vms"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.40.1.0/24"]
}

# El "Firewall" que permite entrar por SSH y HTTP
resource "azurerm_network_security_group" "vm_nsg" {
  name                = "nsg-cosmos-dev-eus-001"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = azurerm_resource_group.rg.tags

  security_rule {
    name                       = "AllowSSH"
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
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Vinculamos el Firewall a nuestra Subred
resource "azurerm_subnet_network_security_group_association" "vm_nsg_assoc" {
  subnet_id                 = azurerm_subnet.vm_subnet.id
  network_security_group_id = azurerm_network_security_group.vm_nsg.id
}




variable "ssh_public_key" {
  type        = string
  description = "Llave pública para entrar a la VM"
}

# ===================================================================
# LAB 2: CÓMPUTO BÁSICO — VM y Docker
# ===================================================================

# IP Pública para poder entrar por SSH y ver el servidor web
resource "azurerm_public_ip" "vm_pip" {
  name                = "pip-cosmos-dev-eus-001"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Interfaz de red de la VM
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

# La Máquina Virtual
resource "azurerm_linux_virtual_machine" "vm" {
  name                = "vm-cosmos-dev-eus-001"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_D2s_v3" # 2 vCPU, 8GB RAM - Alta disponibilidad
  admin_username      = "azureuser"

  network_interface_ids = [azurerm_network_interface.vm_nic.id]

  # Autenticación por SSH (usa una variable para evitar errores de ruta)
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

  # Script de pre-instalación: deja Docker listo al arrancar la VM
  # (Veremos el poder de este mecanismo para la automatización en el Lab 4)
  custom_data = base64encode(<<-EOF
    #cloud-config
    package_update: true
    packages:
      - docker.io
    runcmd:
      - systemctl enable --now docker
      - usermod -aG docker azureuser
      # Inicializa el clúster (Single-node Swarm)
      - docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
      # Crea las redes virtuales internas de Cosmos
      - docker network create --driver overlay --attachable oxp-public
      - docker network create --driver overlay --attachable oxp-internal
  EOF
  )
}

# Output para conocer la IP y poder entrar por SSH
output "vm_public_ip" {
  value = azurerm_public_ip.vm_pip.ip_address
}
