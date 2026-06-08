# Lección 1.4 — El estado de Terraform

> ⏱️ 25 minutos · 🎯 **Al terminar:** entenderás qué es el "estado" (state) de Terraform, por qué es la pieza más importante y delicada, y por qué nunca se toca a mano ni se sube a Git.

---

## 🤔 El problema

Hazte esta pregunta: cuando ejecutas `terraform plan` y dice *"no changes"*, ¿cómo sabe Terraform que ya creó tu VM y que no hace falta crearla otra vez? Tu archivo `.tf` dice "quiero una VM", pero no dice "ya existe". Algo tiene que **recordar** qué se creó realmente. Eso es el **estado**.

---

## 💡 Conceptos

### Qué es el estado (state)

Cuando hiciste `apply`, Terraform creó un archivo: **`terraform.tfstate`**. Es el **registro de todo lo que Terraform creó** y cómo se corresponde con los recursos reales en Azure (sus identificadores, su configuración actual).

```
   Tu código (.tf)          Estado (.tfstate)            Azure (real)
   "quiero una VM así"  ←→  "creé esta VM, su id es X" ←→  la VM de verdad
```

Para calcular el `plan`, Terraform compara **tres cosas**: lo que pediste (`.tf`), lo que cree haber creado (`.tfstate`) y lo que hay realmente en Azure. Con eso decide qué crear, cambiar o destruir.

### Por qué es delicado

- **Es la fuente de verdad de Terraform.** Si lo pierdes, Terraform "olvida" qué administraba y podría intentar recrear cosas que ya existen.
- **Puede contener datos sensibles** (claves, contraseñas que algún recurso generó). Por eso **nunca** se sube a Git — ya lo excluiste en el `.gitignore` (lección 1.2).
- **No se edita a mano.** Es un JSON que Terraform gestiona; tocarlo lo corrompe.

### El estado en equipo (para más adelante)

En tu máquina, el estado vive en un archivo local. Pero si **varias personas** administran la misma infraestructura, ese archivo debe ser **compartido y protegido** para que no se pisen. Para eso se usa un **backend remoto** (por ejemplo, un Azure Storage), que guarda el estado en la nube y lo "bloquea" mientras alguien lo usa. En este taller trabajamos con estado local (más simple); ten presente que en un equipo real se usa remoto.

---

## 🛠️ Manos a la obra

### Paso 1: Ver qué administra Terraform

Desde `infra/`:

```bash
terraform state list
```
Lista todos los recursos que Terraform tiene bajo su control (los que creaste en 1.2 y 1.3):

```
azurerm_resource_group.principal
azurerm_virtual_network.vnet
azurerm_linux_virtual_machine.app
...
```

### Paso 2: Ver el detalle de un recurso

```bash
terraform show
```
Muestra el estado completo (todo lo que Terraform sabe de cada recurso). Es de **solo lectura**: para mirar, no para editar.

### Paso 3: Comprobar que el estado coincide con la realidad

```bash
terraform plan
```
Como no has cambiado nada, dirá:
```
No changes. Your infrastructure matches the configuration.
```
Eso significa que las tres cosas coinciden: tu código, el estado y Azure. Terraform no tiene nada que hacer.

### Paso 4: Confirmar que el estado NO está en Git

```bash
cd ..
git status
```
No debe aparecer `infra/terraform.tfstate` ni `infra/.terraform/`. Si aparecen, revisa las reglas del `.gitignore` (lección 1.2).

---

## ✅ Compruébalo

- [ ] `terraform state list` muestra todos tus recursos.
- [ ] `terraform plan` dice "No changes" (código, estado y Azure coinciden).
- [ ] `git status` confirma que el `.tfstate` **no** se sube a Git.
- [ ] Puedes explicar qué pasaría si pierdes o editas a mano el estado.

---

## 🧠 Lo que aprendiste

- El **estado** (`terraform.tfstate`) es el registro de lo que Terraform creó; lo usa para calcular qué cambiar.
- Es **delicado**: fuente de verdad, puede tener secretos, no se edita a mano ni se sube a Git.
- En equipo, el estado se guarda en un **backend remoto** (compartido y bloqueado).
- `terraform state list` y `terraform show` te dejan inspeccionarlo (solo lectura).

---

## 🆘 Si algo salió mal

**`terraform plan` quiere recrear cosas que ya existen.**
Probablemente Terraform perdió el estado (borraste `terraform.tfstate` o estás en otra carpeta). Asegúrate de ejecutar siempre desde `infra/`, donde vive el estado.

**Vi el `.tfstate` en `git status`.**
Agrega `infra/*.tfstate` y `infra/*.tfstate.*` al `.gitignore` (lección 1.2) y, si ya lo habías subido, quítalo del seguimiento con `git rm --cached infra/terraform.tfstate`.

---

**➡️ Siguiente:** [Variables y reutilización](05-variables-y-reutilizacion.md)
