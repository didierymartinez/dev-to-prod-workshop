# Lección 9.4 — Instalar Docker y desplegar a mano

> ⏱️ 40 minutos · 🎯 **Al terminar:** tu aplicación estará corriendo en el servidor, accesible desde internet con su IP pública. La habrás desplegado paso a paso, a mano.

---

## 🤔 El problema

Tienes un servidor vacío y una aplicación empaquetada con Docker (Fase 8). Falta unirlos: poner Docker en el servidor, llevar tu proyecto allí y levantarlo. Lo haremos manualmente para ver cada pieza.

---

## 💡 Conceptos

### El servidor solo necesita Docker

Gracias a Docker (Fase 8), el servidor **no** necesita tener .NET ni PostgreSQL instalados: solo **Docker**. Tu `docker-compose.yml` levantará la API y la base de datos en contenedores, igual que en tu máquina. Ese es el premio de haber empaquetado todo.

### Llevar el proyecto al servidor con `scp`

Para que el servidor pueda construir y correr tu app, necesita los archivos del proyecto (el `Dockerfile`, el `docker-compose.yml` y el código `src/`). Los copiaremos con **`scp`** (Secure Copy): el primo de SSH que copia archivos a una máquina remota. *Esto es, literalmente, "copiar archivos al servidor" — la forma manual de desplegar.*

---

## 🛠️ Manos a la obra

### Paso 1: Instalar Docker en el servidor

Entra al servidor (`ssh azureuser@$IP`) e instálalo con el script oficial:

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Para poder usar Docker sin escribir `sudo` cada vez, agrega tu usuario al grupo `docker`:

```bash
sudo usermod -aG docker azureuser
```

Este cambio toma efecto al reabrir la sesión. Sal y vuelve a entrar:

```bash
exit
ssh azureuser@$IP
```

Verifica que Docker quedó y que tu usuario puede usarlo:

```bash
docker --version
docker ps        # no debe pedir sudo ni dar error de permisos
```

> 🧠 El servidor ahora tiene Docker y nada más. No instalamos .NET ni PostgreSQL: los contenedores los traen consigo. Eso es lo que hace a Docker tan cómodo para desplegar.

### Paso 2: Copiar tu proyecto al servidor (desde tu máquina)

Abre **otra terminal en tu máquina** (no la del servidor), ubícate en la raíz de `gestion-empresas` y crea la carpeta destino y copia lo necesario:

```bash
# Crear la carpeta en el servidor
ssh azureuser@$IP "mkdir -p ~/gestion-empresas"

# Copiar el Dockerfile, el compose y el código fuente
scp -r docker-compose.yml Dockerfile src azureuser@$IP:~/gestion-empresas/
```

> 🪟 **Windows (PowerShell):** los mismos comandos funcionan; recuerda que `$IP` debe estar definido en esa terminal (vuelve a ejecutar el `az vm show ...` de la lección 9.2 si abriste una terminal nueva).

> 🧠 No copiamos el `.env` (tiene la contraseña local) ni las pruebas: el `.env` del servidor lo creamos aparte, en el siguiente paso.

### Paso 3: Configurar y levantar en el servidor

Vuelve a la terminal del servidor (la del SSH), entra a la carpeta y crea su archivo `.env`:

```bash
cd ~/gestion-empresas

# Crear el .env del servidor con la contraseña de la base de datos
echo "DB_PASSWORD=Clave_Servidor_2024" > .env
```

Levanta todo (la API y la base de datos), construyendo la imagen en el servidor:

```bash
docker compose up -d --build
```

`-d` lo deja corriendo en segundo plano. La primera vez tarda (descarga imágenes base y construye). Cuando termine, comprueba:

```bash
docker compose ps        # ambos servicios (api y db) deben estar "Up"
docker compose logs api  # revisa que la API arrancó bien (Ctrl+C para salir de los logs)
```

### Paso 4: ¡Verlo desde internet!

Desde tu navegador (en cualquier computador), visita — usando la IP pública de tu servidor:

```
http://<IP>:5000/empresas
```

**Tu API responde desde un servidor real, en internet.** Ya no depende de tu máquina: aunque cierres tu portátil, ahí sigue. 🎉

> 💡 También puedes probarlo desde el propio servidor: `curl http://localhost:5000/empresas` (recuerda que en la lección 9.3 ese mismo comando fallaba porque no había nada; ahora responde).

---

## ✅ Compruébalo

- [ ] `docker --version` funciona en el servidor y `docker ps` no pide `sudo`.
- [ ] Copiaste el proyecto con `scp` y existe `~/gestion-empresas` en el servidor.
- [ ] `docker compose ps` muestra `api` y `db` en estado *Up*.
- [ ] `http://<IP>:5000/empresas` responde con datos desde el navegador.

---

## 🧠 Lo que aprendiste

- El servidor solo necesita **Docker**; los contenedores traen el resto.
- **`scp`** copia archivos a un servidor remoto: la forma manual de llevar tu proyecto.
- `docker compose up -d --build` levanta tu app en el servidor, igual que en tu máquina.
- Tu aplicación ya vive en **internet**, accesible por la IP pública.

---

## 🆘 Si algo salió mal

**`docker ps` pide sudo o da "permission denied".**
No reabriste la sesión tras el `usermod`. Haz `exit` y `ssh` de nuevo (el cambio de grupo aplica al reconectar).

**`http://<IP>:5000` no responde desde el navegador.**
Revisa: (1) que abriste el puerto 5000 (`az vm open-port`, lección 9.2); (2) que `docker compose ps` muestra la API *Up*; (3) que usas la IP correcta (`echo $IP`).

**`scp` da "No such file or directory".**
Ejecútalo desde la raíz de `gestion-empresas` (donde están `docker-compose.yml`, `Dockerfile` y `src/`). Verifica con `ls` que están ahí.

**La API arranca pero da error de base de datos.**
Confirma que creaste el `.env` en el servidor con `DB_PASSWORD` (Paso 3) y que el `docker-compose.yml` usa `Host=db`.

---

**➡️ Siguiente:** [El dolor del despliegue manual](05-el-dolor-manual.md)
