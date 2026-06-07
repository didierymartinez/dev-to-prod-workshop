# Lección 11.2 — La base de datos en su propia máquina

> ⏱️ 45 minutos · 🎯 **Al terminar:** tu base de datos vivirá en una segunda máquina **sin IP pública**, conectada a la app por una red privada y protegida por un firewall. Será inalcanzable desde internet — a propósito.

---

## 🤔 El problema

Hoy la base de datos corre como un contenedor **dentro** de `vm-app`, la máquina pública. Vamos a sacarla a su propia máquina, `vm-db`, que no tendrá IP pública: solo `vm-app` podrá hablarle, por la red privada.

> 🧠 **Nota sobre los datos:** al mover la base de datos a una máquina nueva, esta empieza **vacía** (las tablas se recrean solas con las migraciones al arrancar la API). Migrar datos entre bases es un tema aparte que excede el taller; aquí partimos limpios en la nueva base.

---

## 💡 Conceptos

### Misma red, dos máquinas

Cuando creaste `vm-app` (Fase 9), Azure le creó una **red virtual privada (VNet)**. Si ponemos `vm-db` en **la misma VNet**, las dos máquinas se ven por IPs privadas, sin pasar por internet.

### Jump host: entrar a una máquina sin puerta a la calle

Como `vm-db` no tendrá IP pública, no puedes hacerle SSH directo. Entrarás **saltando** a través de `vm-app` (que sí es pública). Ese patrón se llama *jump host* (o bastión): usas una máquina accesible como trampolín hacia las privadas.

---

## 🛠️ Manos a la obra

Asegúrate de tener `vm-app` encendida (`az vm start -g rg-gestion-empresas -n vm-app`) y su IP pública en `$IP` (lección 9.2).

### Paso 1: Ubicar la red de vm-app

```bash
# Mac / Linux (en Windows usa $VNET = az ...)
VNET=$(az network vnet list -g rg-gestion-empresas --query "[0].name" -o tsv)
SUBNET=$(az network vnet list -g rg-gestion-empresas --query "[0].subnets[0].name" -o tsv)
echo "Red: $VNET / Subred: $SUBNET"
```

### Paso 2: Crear vm-db SIN IP pública, en la misma red

```bash
az vm create \
  --resource-group rg-gestion-empresas \
  --name vm-db \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --vnet-name "$VNET" \
  --subnet "$SUBNET" \
  --public-ip-address ""
```

El `--public-ip-address ""` es la clave: **vm-db no tendrá dirección de internet**. Nadie desde fuera puede alcanzarla.

Obtén las IPs **privadas** de ambas máquinas:

```bash
IP_APP_PRIV=$(az vm show -g rg-gestion-empresas -n vm-app -d --query privateIps -o tsv)
IP_DB_PRIV=$(az vm show -g rg-gestion-empresas -n vm-db -d --query privateIps -o tsv)
echo "App (privada): $IP_APP_PRIV   |   BD (privada): $IP_DB_PRIV"
```

### Paso 3: El firewall — solo la app puede hablarle a la BD

Aunque `vm-db` ya es invisible desde internet, agregamos una regla explícita: al puerto de PostgreSQL (5432) solo puede entrar la IP privada de `vm-app`.

```bash
az network nsg rule create \
  --resource-group rg-gestion-empresas \
  --nsg-name vm-dbNSG \
  --name PermitirPostgresDesdeApp \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 5432 \
  --source-address-prefixes "$IP_APP_PRIV"
```

### Paso 4: Montar PostgreSQL en vm-db (vía jump host)

Entra a `vm-db` saltando a través de `vm-app`:

```bash
ssh -J azureuser@$IP azureuser@$IP_DB_PRIV
```
- `-J azureuser@$IP` → "salta primero por vm-app (pública)"; luego conecta a `vm-db` por su IP privada.

Ya dentro de `vm-db`, instala Docker (igual que en la Fase 9) y levanta PostgreSQL con su volumen:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser
exit
```
Vuelve a entrar (`ssh -J azureuser@$IP azureuser@$IP_DB_PRIV`) y arranca la base:

```bash
docker run -d --name empresas-db \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=Clave_Servidor_2024 \
  -e POSTGRES_DB=empresasdb \
  -v empresas_pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine

docker ps        # confirma que está "Up"
exit             # salir de vm-db (vuelves a tu máquina)
```

### Paso 5: Apuntar la app a la base de datos remota

Ahora la API (en `vm-app`) debe conectarse a la base de datos de `vm-db`, no a una local. En tu máquina, edita `docker-compose.prod.yml`: **quita el servicio `db` y el volumen**, y deja que la API use la variable `DB_HOST`:

```yaml
services:

  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=${DB_HOST};Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"
```

> 🧠 La base de datos ya no es un servicio de este compose: vive en otra máquina. La API la encuentra por la IP privada que pondremos en `DB_HOST`.

Sube el cambio (recuerda: commit + push):

```bash
git checkout -b feat/base-de-datos-separada
git add docker-compose.prod.yml
git commit -m "separar la base de datos: la API se conecta a vm-db por red privada"
git push -u origin feat/base-de-datos-separada
```
Abre el PR y fusiónalo a `main`. (Esto dispara el CD, que actualizará la imagen — pero falta que el servidor tenga el compose nuevo y el `DB_HOST`; lo hacemos ahora.)

### Paso 6: Actualizar el servidor de la app

Copia el `docker-compose.prod.yml` actualizado a `vm-app` y configura el destino de la base de datos:

```bash
# Desde tu máquina (raíz del proyecto)
scp docker-compose.prod.yml azureuser@$IP:~/gestion-empresas/

# Entra a vm-app y reconfigura
ssh azureuser@$IP
cd ~/gestion-empresas

# Detener lo anterior (la BD vieja en vm-app deja de usarse)
docker compose -f docker-compose.prod.yml down

# Apuntar el .env a la base de datos remota (reemplaza por la IP privada real de vm-db)
cat > .env <<EOF
DB_HOST=<IP_PRIVADA_DE_VM_DB>
DB_PASSWORD=Clave_Servidor_2024
EOF

# Levantar la API conectada a la BD remota
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f api   # verifica que conecta (Ctrl+C para salir)
```

> 💡 Reemplaza `<IP_PRIVADA_DE_VM_DB>` por el valor de `$IP_DB_PRIV` que viste en el Paso 2.

Visita `http://<IP>:5000/empresas`. La app funciona — pero ahora los datos viven en **otra máquina**, en la red privada.

---

## ✅ Compruébalo

- [ ] `vm-db` existe y **no tiene IP pública** (`az vm show -g rg-gestion-empresas -n vm-db -d --query publicIps` devuelve vacío).
- [ ] La API responde en `http://<IP>:5000/empresas`, conectada a la base de datos remota.
- [ ] Desde tu máquina **no puedes** conectarte a la base de datos directamente (no hay IP pública a la cual apuntar) — esa es la protección.
- [ ] Entiendes qué es un *jump host* y por qué entraste a `vm-db` a través de `vm-app`.

> 💥 **Comprueba la protección (rompe y arregla):** borra la regla del firewall con `az network nsg rule delete -g rg-gestion-empresas --nsg-name vm-dbNSG -n PermitirPostgresDesdeApp` y reinicia la API (`docker compose ... up -d` en vm-app). En los logs verás que ya **no puede conectarse** a la base de datos. Vuelve a crear la regla (Paso 3). Así compruebas que el firewall es lo que autoriza el tráfico.

---

## 🧠 Lo que aprendiste

- Pusiste la base de datos en su **propia máquina** (`vm-db`), en la misma **red privada** que la app.
- `vm-db` **no tiene IP pública**: es inalcanzable desde internet.
- Un **jump host** te deja administrar máquinas privadas saltando por una pública.
- El **firewall** (regla NSG) autoriza solo el tráfico de la app hacia la base de datos.

---

## 🆘 Si algo salió mal

**La API no conecta a la base de datos.**
Revisa: (1) que `DB_HOST` en el `.env` de vm-app sea la **IP privada** de vm-db; (2) que PostgreSQL esté *Up* en vm-db (`docker ps` allí); (3) que la regla del firewall (Paso 3) exista.

**`ssh -J` falla.**
Verifica que `$IP` (pública de vm-app) y `$IP_DB_PRIV` (privada de vm-db) sean correctas, y que vm-app esté encendida (es tu trampolín).

**El CD falla al desplegar tras este cambio.**
El pipeline solo hace `pull` + `up`; necesita que el `.env` (con `DB_HOST`) y el `docker-compose.prod.yml` actualizado ya estén en vm-app (Paso 6). Confírmalo.

---

**➡️ Siguiente:** [El gateway: un único punto de entrada](03-el-gateway.md)
