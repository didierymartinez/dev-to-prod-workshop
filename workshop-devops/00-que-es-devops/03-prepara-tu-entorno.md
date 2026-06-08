# Lección 0.3 — Prepara tu entorno

> ⏱️ 30 minutos · 🎯 **Al terminar:** tendrás instalada y verificada la única herramienta nueva del taller (Terraform), confirmadas las que ya traes del básico, y tu sesión de Azure lista.

---

## 🤔 El problema

Vas a usar una herramienta nueva, **Terraform**, además de las del básico (Git, Docker, Azure CLI). Como siempre, las instalamos **y verificamos** ahora, por sistema operativo, para no atascarnos a mitad de una fase.

---

## 💡 Conceptos

### Qué es Terraform (en una frase, por ahora)

**Terraform** es la herramienta que usaremos para crear infraestructura (servidores, redes) **escribiendo archivos** en lugar de hacer clic o ejecutar comandos sueltos. La conocerás a fondo en la Fase 1; aquí solo la dejamos instalada.

---

## 🛠️ Manos a la obra

> Esta lección está organizada por sistema operativo. Busca el tuyo en el Paso 1.

### Paso 1: Instalar Terraform

**🪟 Windows**
La forma más simple es con el gestor de paquetes **winget** (incluido en Windows 10/11). En PowerShell:
```powershell
winget install HashiCorp.Terraform
```
*(Alternativa: descarga el binario de [developer.hashicorp.com/terraform/install](https://developer.hashicorp.com/terraform/install) y agrégalo al PATH.)*

**🍎 macOS**
Con [Homebrew](https://brew.sh):
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**🐧 Linux (Ubuntu/Debian)**
```bash
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**Verifica (en cualquier sistema)** — abre una terminal **nueva**:
```bash
terraform -version
```
Debe mostrar algo como `Terraform v1.9.x`. El número exacto no importa.

### Paso 2: Confirmar las herramientas del básico

Verifica que sigues teniendo lo demás (deberías, del básico):
```bash
git --version
docker --version
az version
```
Si alguna falta, vuelve a la Fase 0 del taller básico (cada una tiene su guía de instalación por sistema operativo).

### Paso 3: Iniciar sesión en Azure

Terraform creará recursos en tu cuenta de Azure, así que necesita que estés autenticado. Inicia sesión:
```bash
az login
```
Se abrirá el navegador. Al volver, confirma tu suscripción:
```bash
az account show --output table
```

> 🧠 Terraform usará automáticamente esta sesión de Azure CLI para crear recursos. No tendrás que darle credenciales por separado en el taller.

### Paso 4: Ubicar el proyecto

Seguiremos trabajando sobre el proyecto `gestion-empresas` del básico. Ábrelo en VS Code:
```bash
cd ruta/a/gestion-empresas    # ajusta a donde lo tengas
code .
```
Si no lo tienes a mano, puedes clonarlo desde tu GitHub (`git clone <url-de-tu-repo>`).

---

## ✅ Compruébalo

- [ ] `terraform -version` muestra una versión.
- [ ] `git --version`, `docker --version` y `az version` funcionan.
- [ ] `az account show` muestra tu suscripción de Azure (estás autenticado).
- [ ] Tienes el proyecto `gestion-empresas` abierto.

---

## 🧠 Lo que aprendiste

- **Terraform** es la herramienta nueva del taller; ya quedó instalada y verificada.
- Confirmaste Git, Docker y Azure CLI del básico.
- Terraform usará tu sesión de **Azure CLI** (`az login`) para crear recursos.

---

## 🆘 Si algo salió mal

**`terraform -version` dice "command not found".**
Cierra todas las terminales y abre una nueva (las herramientas recién instaladas solo aparecen en terminales abiertas después). En Windows, si persiste, reinicia sesión para refrescar el PATH.

**`winget` no se reconoce (Windows).**
Actualiza "App Installer" desde la Microsoft Store, o descarga Terraform manualmente desde el enlace del Paso 1.

**`az login` no abre el navegador (servidor sin interfaz).**
Usa `az login --use-device-code` y sigue las instrucciones en pantalla.

---

**➡️ Siguiente fase:** [Fase 1 — Infraestructura como Código](../01-infraestructura-como-codigo/README.md)
