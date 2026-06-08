# Lección 1.5 — Variables y reutilización

> ⏱️ 30 minutos · 🎯 **Al terminar:** habrás sacado los valores "quemados" de tu código a **variables**, de modo que cambiar el tamaño de la VM o la región se haga en un solo lugar — y dejes el terreno listo para crear varios entornos (Fase 6).

---

## 🤔 El problema

Tu `main.tf` tiene valores escritos directamente: `"eastus"`, `"Standard_B1s"`, `"~/.ssh/id_rsa.pub"`. Si mañana quieres una VM más grande, o crear un entorno de pruebas en otra región, tendrías que buscar y cambiar esos valores por todo el archivo. Las **variables** resuelven esto: defines el valor una vez y lo usas en muchos lados.

---

## 💡 Conceptos

### Variables: parámetros de tu infraestructura

Una **variable** es un valor con nombre que defines aparte y usas con `var.nombre`. Permite:
- **Cambiar en un solo lugar:** el tamaño de la VM vive en una variable; lo cambias ahí y se refleja en todo.
- **Reutilizar:** el mismo código `.tf`, con distintos valores de variables, crea entornos distintos (dev, staging, prod) sin duplicar nada.

### Dónde van los valores

- **`variables.tf`** — *declaras* qué variables existen (y opcionalmente un valor por defecto).
- **`terraform.tfvars`** — *asignas* valores concretos (Terraform lo lee solo). Útil para valores propios de tu entorno.
- También puedes pasarlos por línea de comandos con `-var`.

---

## 🛠️ Manos a la obra

### Paso 1: Declarar las variables

Crea `infra/variables.tf`:

```hcl
variable "location" {
  description = "Región de Azure donde se crean los recursos"
  type        = string
  default     = "eastus"
}

variable "vm_size" {
  description = "Tamaño de la máquina virtual"
  type        = string
  default     = "Standard_B1s"
}

variable "ssh_public_key_path" {
  description = "Ruta a la llave SSH pública"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
```

Cada variable tiene una **descripción** (para quien lea el código), un **tipo** y un **valor por defecto**.

### Paso 2: Usar las variables en `main.tf`

Reemplaza los valores quemados por referencias `var.*`. Por ejemplo:

- En el grupo de recursos y demás recursos, cambia `location = "eastus"` por:
  ```hcl
  location = var.location
  ```
  *(o mantén `azurerm_resource_group.principal.location` en los que ya lo heredan de ahí; el grupo de recursos sí usa `var.location`.)*

- En la VM:
  ```hcl
  size = var.vm_size
  admin_ssh_key {
    username   = "azureuser"
    public_key = file(var.ssh_public_key_path)
  }
  ```

> 🧠 Fíjate cómo `file(var.ssh_public_key_path)` combina dos cosas que ya conoces: la función `file()` (lección 1.3) leyendo la ruta que ahora viene de una variable.

### Paso 3: (Opcional) Asignar valores propios

Si quieres valores distintos a los `default`, créalos en `infra/terraform.tfvars`:

```hcl
vm_size  = "Standard_B2s"   # una VM un poco más grande
location = "eastus"
```
Terraform lee este archivo automáticamente. Como puede contener datos propios de tu entorno, conviene no subirlo a Git:

```bash
# agrega al .gitignore
echo "infra/terraform.tfvars" >> .gitignore
```

### Paso 4: Comprobar que nada cambió de comportamiento

```bash
cd infra
terraform plan
```
Si tus variables tienen los mismos valores que antes, dirá `No changes`: refactorizaste a variables **sin cambiar** la infraestructura. Si pusiste un `vm_size` distinto en `.tfvars`, el plan mostrará el cambio de tamaño — pruébalo y nota cómo **un solo valor** cambia la VM.

### Paso 5: Guardar el avance

```bash
cd ..
git add infra/variables.tf infra/main.tf .gitignore
git commit -m "parametrizar la infraestructura con variables"
git push
```

---

## ✅ Compruébalo

- [ ] Existe `infra/variables.tf` con `location`, `vm_size` y `ssh_public_key_path`.
- [ ] `main.tf` usa `var.*` en vez de valores quemados.
- [ ] `terraform plan` dice "No changes" (si mantuviste los valores) o muestra solo el cambio que hiciste.
- [ ] Entiendes cómo cambiar el tamaño de la VM en **un solo lugar**.

---

## 🧠 Lo que aprendiste

- Las **variables** sacan los valores quemados a un lugar único: cambias una vez, aplica en todo.
- Se **declaran** en `variables.tf` y se **asignan** en `terraform.tfvars` (o con `-var`).
- Parametrizar prepara el terreno para crear **varios entornos** con el mismo código (Fase 6).

---

## 🆘 Si algo salió mal

**`plan` quiere recrear la VM tras cambiar `vm_size`.**
Cambiar el tamaño puede requerir recrear la VM (Azure no siempre permite redimensionar en caliente). El plan te lo dirá con `-/+`. Es esperado; si solo estás practicando, puedes dejar el tamaño original.

**"Reference to undeclared input variable".**
Usaste `var.algo` sin declararlo en `variables.tf`. Declara la variable o corrige el nombre.

---

**➡️ Siguiente:** [Destruir y recrear](06-destruir-y-recrear.md)
