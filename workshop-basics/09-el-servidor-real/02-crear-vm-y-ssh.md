# Lección 9.2 — Crear tu máquina en Azure y entrar por SSH

> ⏱️ 35 minutos · 🎯 **Al terminar:** tendrás un servidor Linux real, tuyo, corriendo en Azure, y entrarás en él por SSH desde tu terminal.

---

## 🤔 El problema

Necesitas un servidor. En vez de comprar y configurar un computador físico, vas a crear una máquina virtual en Azure con unos pocos comandos, y conectarte a ella. En minutos tendrás un Linux en internet listo para trabajar.

---

## 💡 Conceptos

### Azure CLI: manejar la nube desde la terminal

**Azure CLI** (el comando `az`) te permite crear y administrar recursos de Azure escribiendo comandos, sin entrar al portal web. Es rápido, repetible y fácil de documentar.

### Grupo de recursos: una carpeta para todo

En Azure, todo vive dentro de un **grupo de recursos**: una especie de carpeta que agrupa lo que creas (la VM, su red, su disco). La ventaja: cuando termines, borras el grupo y **se elimina todo junto**, sin dejar nada cobrando.

### Llaves SSH: entrar sin contraseña

Para conectarte al servidor de forma segura, en vez de una contraseña se usan **llaves SSH**: un par de archivos (una llave pública que va al servidor y una privada que se queda en tu máquina). Azure puede generarlas por ti.

---

## 🛠️ Manos a la obra

> 🪟 **Nota para Windows:** los comandos `az`, `ssh` y `scp` funcionan en **PowerShell**. Donde veas guardar un valor en una variable con `IP=$(...)` (sintaxis de Mac/Linux), en PowerShell se escribe `$IP = (az ... )`. Lo señalo cuando aparezca.

### Paso 1: Iniciar sesión en Azure

```bash
az login
```
Se abrirá el navegador para que inicies sesión. Al volver, confirma tu cuenta:
```bash
az account show --output table
```

### Paso 2: Crear el grupo de recursos

```bash
az group create --name rg-gestion-empresas --location eastus
```
- `--name` → el nombre de la "carpeta".
- `--location eastus` → la región donde vivirá (puedes elegir otra cercana).

### Paso 3: Crear la máquina virtual

```bash
az vm create \
  --resource-group rg-gestion-empresas \
  --name vm-app \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys
```

> 🪟 **Windows (PowerShell):** escribe todo en una sola línea (sin los `\`), o cambia cada `\` por un acento grave `` ` ``.

Desglose:
- `--image Ubuntu2204` → el sistema operativo: Ubuntu (una distribución de Linux muy común en servidores).
- `--size Standard_B1s` → el tamaño: pequeño y económico, suficiente para el taller.
- `--admin-username azureuser` → el usuario con el que entrarás.
- `--generate-ssh-keys` → Azure crea las llaves SSH por ti (si no tienes) y pone la pública en el servidor.

Tarda un par de minutos. Cuando termine, muestra un resumen con la **IP pública** de tu servidor.

> 🧠 **Dónde quedó tu llave (la necesitarás en la Fase 10).** `--generate-ssh-keys` guardó tu **llave privada** en `~/.ssh/id_rsa` (en Windows: `%USERPROFILE%\.ssh\id_rsa`) y la **pública** en `~/.ssh/id_rsa.pub`. La privada es secreta y **nunca** se comparte; en la Fase 10 la usarás para que el despliegue automático entre al servidor. Si `ls ~/.ssh` te muestra otro nombre (p. ej. `id_ed25519`), ese es el tuyo.

### Paso 4: Abrir el puerto de la aplicación

Por defecto el servidor solo deja entrar SSH. Tu API correrá en el puerto **5000** (lo definiste en el `docker-compose.yml` de la Fase 8), así que hay que abrirlo:

```bash
az vm open-port --resource-group rg-gestion-empresas --name vm-app --port 5000
```

### Paso 5: Guardar la IP y conectarte por SSH

Guarda la IP pública en una variable para usarla cómodamente:

```bash
# Mac / Linux:
IP=$(az vm show -g rg-gestion-empresas -n vm-app -d --query publicIps -o tsv)
echo "La IP de tu servidor es: $IP"
```
> 🪟 **Windows (PowerShell):**
> ```powershell
> $IP = az vm show -g rg-gestion-empresas -n vm-app -d --query publicIps -o tsv
> echo "La IP de tu servidor es: $IP"
> ```

Ahora entra al servidor:

```bash
ssh azureuser@$IP
```
La primera vez te preguntará si confías en el servidor: escribe `yes`. ¡Y estás **dentro**! Tu prompt cambia a algo como `azureuser@vm-app:~$`. Eso significa que los comandos que escribas ahora se ejecutan **en el servidor**, no en tu máquina.

Para salir y volver a tu máquina, escribe `exit` (no lo hagas aún; lo usaremos en la próxima lección).

---

## ✅ Compruébalo

- [ ] `az account show` muestra tu cuenta de Azure.
- [ ] `az vm create` terminó y te dio una IP pública.
- [ ] Abriste el puerto 5000 con `az vm open-port`.
- [ ] Entraste al servidor con `ssh` y tu prompt muestra `azureuser@vm-app`.

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- **Azure CLI** (`az`) crea y administra recursos desde la terminal.
- Todo vive en un **grupo de recursos**, que luego borrarás de una vez.
- Creaste una **VM Ubuntu** pequeña y abriste el puerto de tu app.
- Te conectas al servidor por **SSH**: una terminal dentro de la máquina remota.

---

## 🆘 Si algo salió mal

**`az` no se reconoce.**
Falta Azure CLI (Fase 0). Instálalo desde [aka.ms/installazurecli](https://aka.ms/installazurecli) y abre una terminal nueva.

**`az vm create` falla por cuota o región.**
Prueba otra región (`--location westus`, `--location centralus`) o confirma que tu suscripción permite crear VMs.

**`ssh` se queda colgado o da "Connection timed out".**
La VM puede tardar un minuto en estar lista tras crearse. Reintenta. Verifica que usas la IP correcta (`echo $IP`).

**"Permission denied (publickey)".**
La llave SSH no coincide. Asegúrate de haber usado `--generate-ssh-keys` al crear la VM y de conectarte como `azureuser`.

---

**➡️ Siguiente:** [Moverte en un servidor Linux](03-moverte-en-linux.md)
