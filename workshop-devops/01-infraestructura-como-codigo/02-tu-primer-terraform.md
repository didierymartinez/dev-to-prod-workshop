# Lección 1.2 — Tu primer Terraform

> ⏱️ 35 minutos · 🎯 **Al terminar:** habrás escrito tu primer archivo de Terraform y creado un recurso real en Azure (el grupo de recursos) con el ciclo `init` → `plan` → `apply`. Empezarás pequeño para entender el mecanismo.

---

## 🤔 El problema

Entendiste *por qué* IaC. Ahora vamos a usarlo por primera vez, con el recurso más sencillo: el **grupo de recursos** (esa "carpeta" de Azure que ya conoces del básico). La meta no es crear algo complejo, sino aprender el **ciclo de trabajo de Terraform**, que será igual para todo lo demás.

---

## 💡 Conceptos

### Un archivo `.tf` se compone de bloques

Terraform usa archivos con extensión `.tf`. Dentro hay **bloques**, cada uno con un propósito:

- **`terraform { ... }`** — configuración general: qué *providers* (plugins) necesita.
- **`provider "azurerm" { ... }`** — el plugin que sabe hablar con Azure.
- **`resource "tipo" "nombre" { ... }`** — un recurso que quieres que exista (una VM, una red, un grupo de recursos…).

### El ciclo de Terraform: init → plan → apply

Siempre trabajarás con estos tres comandos:

```
terraform init    → descarga los plugins (providers) que tu código necesita. Una vez por proyecto.
terraform plan    → te MUESTRA qué va a crear, cambiar o destruir. No toca nada. Tu red de seguridad.
terraform apply   → ejecuta el plan: crea/cambia los recursos de verdad.
```

> 🧠 **`terraform plan` es tu mejor amigo.** Siempre te dice exactamente qué va a pasar *antes* de que pase. Acostúmbrate a leerlo antes de cada `apply`.

---

## 🛠️ Manos a la obra

### Paso 0: Empezar limpio

Desde ahora, **Terraform es el dueño de tu infraestructura**. Si todavía tienes recursos creados a mano en el básico, bórralos para empezar de cero (y no chocar con nombres repetidos):

```bash
az group delete --name rg-gestion-empresas --yes --no-wait
```
*(Si ya lo habías borrado al final del básico, omite este paso.)*

### Paso 1: Crear la carpeta de infraestructura

Dentro de tu proyecto `gestion-empresas`, crea una carpeta `infra/` (ahí vivirá todo el código de Terraform):

```bash
cd ruta/a/gestion-empresas
mkdir infra
cd infra
```

### Paso 2: Escribir tu primer `main.tf`

Crea el archivo `infra/main.tf` con este contenido:

```hcl
# Qué providers (plugins) necesita este proyecto
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# El plugin para hablar con Azure (usa tu sesión de "az login")
provider "azurerm" {
  features {}
}

# El recurso que queremos que exista: un grupo de recursos
resource "azurerm_resource_group" "principal" {
  name     = "rg-gestion-empresas"
  location = "eastus"
}
```

Desglose:
- **`terraform { required_providers ... }`** → declara que necesitas el provider `azurerm` (Azure), versión 3.x.
- **`provider "azurerm" { features {} }`** → activa el provider. El bloque `features {}` es obligatorio (aunque vaya vacío). Usará automáticamente tu sesión de `az login`.
- **`resource "azurerm_resource_group" "principal" { ... }`** → declara un grupo de recursos. `"azurerm_resource_group"` es el **tipo**; `"principal"` es un **nombre interno** con el que tú te refieres a él dentro de Terraform; `name` y `location` son su configuración real en Azure.

### Paso 3: `init` — preparar el proyecto

```bash
terraform init
```
Terraform descarga el provider de Azure. Verás `Terraform has been successfully initialized!`. Esto crea una carpeta `.terraform/` (los plugins) — no la toques ni la subas a Git.

### Paso 4: `plan` — ver qué hará (sin tocar nada)

```bash
terraform plan
```
Lee la salida: te muestra lo que hará, con un `+` al lado de lo que va a **crear**:

```
  # azurerm_resource_group.principal will be created
  + resource "azurerm_resource_group" "principal" {
      + location = "eastus"
      + name     = "rg-gestion-empresas"
    }
Plan: 1 to add, 0 to change, 0 to destroy.
```

Nada se ha creado todavía: `plan` solo te enseña el futuro.

### Paso 5: `apply` — crearlo de verdad

```bash
terraform apply
```
Te vuelve a mostrar el plan y pide confirmación. Escribe `yes`. En segundos, Terraform crea el grupo de recursos en Azure.

### Paso 6: Comprobar

```bash
az group show --name rg-gestion-empresas --output table
```
Aparece tu grupo de recursos — **creado por Terraform, no a mano**. También puedes verlo en el portal de Azure.

### Paso 7: Versionar (ignorando lo que no debe ir a Git)

El código de Terraform (`main.tf`) **sí** va a Git. Pero hay cosas que **no**: los plugins descargados y, sobre todo, el archivo de *estado* (que puede contener datos sensibles; lo verás en la lección 1.4).

Abre el `.gitignore` de tu proyecto y agrega al final:

```
# Terraform
infra/.terraform/
infra/*.tfstate
infra/*.tfstate.*
```

Ahora guarda el avance:

```bash
cd ..        # raíz del proyecto gestion-empresas
git checkout -b feat/infra-terraform
git add infra/main.tf .gitignore
git commit -m "agregar infraestructura como codigo con Terraform (grupo de recursos)"
git push -u origin feat/infra-terraform    # sube la rama a GitHub
```
Confirma con `git status` que **no** se está subiendo `infra/.terraform/` ni archivos `.tfstate`. Abre el Pull Request, fusiónalo y sincroniza.

---

## ✅ Compruébalo

- [ ] `terraform plan` mostró `1 to add` antes de crear nada.
- [ ] `terraform apply` creó el grupo de recursos.
- [ ] `az group show --name rg-gestion-empresas` lo encuentra.
- [ ] En Git subiste `infra/main.tf` pero **no** la carpeta `.terraform/` ni los archivos `.tfstate`.

---

## 🧠 Lo que aprendiste

- Un archivo `.tf` se arma con bloques: `terraform`, `provider` y `resource`.
- El ciclo de Terraform es **`init`** (preparar) → **`plan`** (ver qué hará) → **`apply`** (hacerlo).
- Terraform usa tu sesión de `az login` para crear recursos en Azure.
- El código (`.tf`) va a Git; la carpeta `.terraform/` y los archivos `.tfstate`, **no**.

---

## 🆘 Si algo salió mal

**`terraform init` falla descargando el provider.**
Revisa tu conexión y que el bloque `required_providers` esté bien escrito. Reintenta `terraform init`.

**`apply` falla con "A resource group with the name already exists".**
Ya existe `rg-gestion-empresas` (del básico). Bórralo (Paso 0) y vuelve a aplicar, o cambia el `name` en `main.tf`.

**"building AzureRM Client: ... please run az login".**
No estás autenticado en Azure. Ejecuta `az login` (lección 0.3) y reintenta.

**No estoy seguro de qué se va a subir a Git.**
Ejecuta `git status` antes del `commit`. Si ves `.terraform/` o `.tfstate`, revisa que agregaste bien las reglas al `.gitignore`.

---

**➡️ Siguiente:** Declarar el servidor *(se construirá tras validar el estilo de estas dos lecciones)*.
