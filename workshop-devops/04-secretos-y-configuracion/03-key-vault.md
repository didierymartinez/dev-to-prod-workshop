# Lección 4.3 — Un cofre gestionado: Azure Key Vault

> ⏱️ 35 minutos · 🎯 **Al terminar:** tendrás un **Azure Key Vault** —creado con Terraform— como la **fuente de verdad** de tus secretos: cifrado, auditado y rotable. Verás cómo alimentar el `docker secret` del clúster desde el cofre.

---

## 🤔 El problema

El `docker secret` de la lección anterior protege la contraseña **dentro del clúster**. Pero, ¿dónde está la fuente de verdad? Si recreas el clúster, ¿de dónde sale el secreto? ¿Quién puede leerlo y cuándo? ¿Cómo lo rotas en todos lados a la vez? Un `docker secret` no responde eso. Un **cofre gestionado** sí.

---

## 💡 Conceptos

### Qué es Azure Key Vault

**Key Vault** es un servicio de Azure dedicado a **guardar secretos** (y llaves y certificados) de forma profesional:

- **Cifrado** y centralizado: una sola fuente de verdad.
- **Auditoría:** registra quién leyó cada secreto y cuándo.
- **Versiones y rotación:** cambias el valor y queda historial; las apps piden "la última versión".
- **Acceso por identidad:** decides *quién* (qué persona o qué máquina) puede leer cada secreto, sin repartir contraseñas.

### El patrón: el cofre es la fuente de verdad

```
   Azure Key Vault                Clúster Swarm
   (fuente de verdad)             (consumo)
   db-password  ──(se lee al desplegar)──►  docker secret  ──►  contenedores
   • cifrado, auditado, rotable             (montado en /run/secrets)
```

El secreto **vive en Key Vault**. Al desplegar, se **lee del cofre** y se alimenta al `docker secret` del clúster. Así, el clúster nunca es el dueño del secreto: solo recibe una copia para usarlo.

> 🧠 En la Fase 7 (DevSecOps) darás el último paso: que la **app lea directamente** de Key Vault usando una **identidad gestionada** (sin intermediarios). Por ahora, el cofre es la fuente y el `docker secret` el consumo — el mismo patrón que usa el taller avanzado.

---

## 🛠️ Manos a la obra

### Paso 1: Declarar el Key Vault con Terraform

Como toda tu infraestructura es código, el cofre también. En `infra/`, primero agrega el provider `random` (para un nombre único) al bloque `terraform` y un dato para identificarte. Si no lo tienes, en `main.tf`:

```hcl
terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
    random  = { source = "hashicorp/random",  version = "~> 3.0" }   # ← nuevo
  }
}

# Quién eres tú (para darte acceso al cofre)
data "azurerm_client_config" "current" {}

# Sufijo aleatorio: el nombre de un Key Vault es único en todo Azure
resource "random_string" "kv" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_key_vault" "kv" {
  name                = "kv-gestion-${random_string.kv.result}"
  location            = azurerm_resource_group.principal.location
  resource_group_name = azurerm_resource_group.principal.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Te damos permiso a TI para gestionar secretos
  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete"]
  }
}

output "kv_name" {
  value = azurerm_key_vault.kv.name
}
```

Aplica:
```bash
cd infra
terraform init      # descarga el provider random (es nuevo)
terraform apply
```

### Paso 2: Guardar el secreto en el cofre

Con el cofre creado, guarda la contraseña como un secreto:

```bash
KV=$(terraform output -raw kv_name)
az keyvault secret set --vault-name "$KV" --name "db-password" --value "Clave_Servidor_2024"
```

> 🪟 **Windows (PowerShell):** `$KV = terraform output -raw kv_name` y luego el mismo `az keyvault secret set`.

### Paso 3: Leerlo desde el cofre

```bash
az keyvault secret show --vault-name "$KV" --name "db-password" --query value -o tsv
```
Devuelve la contraseña. Cualquiera (o cualquier máquina) **con permiso** puede obtenerla así, y Azure **registra** cada lectura.

### Paso 4: Alimentar el `docker secret` desde el cofre

Este es el patrón completo: el secreto del clúster ya **no** lo escribes a mano, lo **traes del cofre**. En el manager (o desde un script de despliegue):

```bash
# Leer del cofre y crear/rotar el docker secret a partir de ese valor
PASS=$(az keyvault secret show --vault-name "$KV" --name "db-password" --query value -o tsv)
printf "%s" "$PASS" | docker secret create db_password_v2 -
```
Para **rotar** la contraseña en el futuro: la cambias en Key Vault (`az keyvault secret set`), creas un `db_password_v2` desde el cofre, actualizas el stack para usarlo y eliminas el viejo. La fuente de verdad siempre es el cofre.

> 🧠 Por ahora seguimos usando el `db_password` que creaste en 4.2; este paso muestra **de dónde debería venir** en un flujo real. En la Fase 6 (CD avanzado) este "leer del cofre y alimentar el clúster" será un paso automático del pipeline.

### Paso 5: Guardar el avance

```bash
cd ..
git add infra/main.tf
git commit -m "agregar Azure Key Vault como cofre de secretos (Terraform)"
git push
```

---

## ✅ Compruébalo

- [ ] `terraform apply` creó el Key Vault (con su nombre único en el output `kv_name`).
- [ ] Guardaste y leíste el secreto `db-password` con `az keyvault secret set/show`.
- [ ] Entiendes el patrón "cofre = fuente de verdad → docker secret = consumo".
- [ ] Sabes cómo rotarías el secreto (cambiarlo en el cofre y regenerar el secreto del clúster).

---

## 🧠 Lo que aprendiste

- **Azure Key Vault** es un cofre gestionado: cifrado, auditoría, versiones/rotación y acceso por identidad.
- Es la **fuente de verdad**; el `docker secret` del clúster se **alimenta** desde el cofre.
- Lo declaraste con **Terraform** (coherente con tu IaC) y lo operaste con `az keyvault secret`.
- La integración directa app↔cofre (con identidad gestionada) llega en la Fase 7.

---

## 🆘 Si algo salió mal

**`terraform apply` falla pidiendo el provider `random`.**
Agregaste `random` al bloque `required_providers`, así que corre `terraform init` de nuevo para descargarlo.

**`az keyvault secret set` da "Forbidden" / "does not have secrets set permission".**
La `access_policy` te da permiso por tu `object_id`. Asegúrate de estar logueado con la misma cuenta (`az account show`) y de que el `apply` creó la política. (En suscripciones con "RBAC authorization" en vez de access policies, se asigna el rol *Key Vault Secrets Officer* a tu usuario.)

**"Vault name already exists".**
El nombre es global; el `random_string` debería evitar choques. Si pasa, cambia el sufijo (re-aplica para regenerar el `random_string`).

---

**➡️ Siguiente:** [Configuración por entorno](04-configuracion-por-entorno.md)
