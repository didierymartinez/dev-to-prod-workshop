# Lección 9.3 — Moverte en un servidor Linux

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás orientarte y administrar un servidor Linux: ver dónde estás, instalar programas, revisar recursos y permisos. Son los comandos que usarás cada vez que entres a un servidor.

---

## 🤔 El problema

Estás dentro de un servidor Linux por SSH, sin ventanas ni mouse: solo la terminal. Para hacer cualquier cosa —instalar Docker, revisar por qué algo falla, ver el espacio en disco— necesitas un puñado de comandos. Vamos a practicarlos en tu propio servidor.

---

## 💡 Conceptos

### Linux en el servidor

La mayoría de los servidores del mundo usan **Linux** (aquí, Ubuntu). Si vienes de Windows, la idea es la misma —archivos, carpetas, permisos— pero los comandos cambian un poco. Buena parte de lo básico ya lo viste en la Fase 0 (`pwd`, `ls`, `cd`); aquí sumamos lo propio de administrar un servidor.

### `sudo`: hacer cosas de administrador

Instalar programas o tocar configuración del sistema requiere permisos de **administrador**. En Linux, antepones **`sudo`** al comando para ejecutarlo con esos permisos. Es el equivalente a "Ejecutar como administrador" en Windows.

### `apt`: el instalador de programas de Ubuntu

En Ubuntu, los programas se instalan con **`apt`**, el gestor de paquetes. No descargas instaladores de una web: le pides a `apt` el programa por su nombre y él lo baja e instala.

---

## 🛠️ Manos a la obra

Conéctate a tu servidor si no lo estás (`ssh azureuser@$IP`) y prueba cada comando.

### Paso 1: Orientarte

```bash
pwd          # ¿en qué carpeta estoy? → /home/azureuser
ls -la       # listar archivos (incluidos ocultos)
whoami       # qué usuario soy → azureuser
uname -a     # información del sistema (verás "Linux ... Ubuntu")
```

### Paso 2: Revisar los recursos del servidor

Cuando algo va lento o falla, lo primero es mirar los recursos:

```bash
df -h        # espacio en disco (¿está lleno?)
free -h      # memoria RAM disponible
top          # procesos en ejecución y uso de CPU/RAM (pulsa "q" para salir)
```

> 🧠 `df -h` y `free -h` (la `-h` es "human readable", legible para humanos) son tus primeras paradas cuando un servidor se comporta raro: ¿se quedó sin disco?, ¿sin memoria?

### Paso 3: Actualizar la lista de programas e instalar uno

`apt` mantiene una lista de programas disponibles. Conviene actualizarla antes de instalar:

```bash
sudo apt update          # actualiza la lista de paquetes disponibles
```

Fíjate que escribiste **`sudo`**: instalar y tocar el sistema requiere permisos de administrador. Probemos instalando una utilidad pequeña y útil, `curl` (sirve para hacer peticiones HTTP desde la terminal; quizá ya viene instalada):

```bash
sudo apt install -y curl     # instala curl (-y responde "sí" automáticamente)
curl --version               # verifica que quedó
```

> 🧠 Este patrón —`sudo apt update` y luego `sudo apt install -y <programa>`— es como instalarás Docker en la próxima lección.

### Paso 4: Probar tu propia API… que aún no existe

Solo para conectar ideas, pídele al servidor que llame a su propio puerto 5000:

```bash
curl http://localhost:5000/empresas
```

Dará error de conexión: **todavía no hay nada corriendo ahí**. Es lo esperado — en la próxima lección desplegaremos tu app y este mismo comando responderá con datos.

### Paso 5: Salir del servidor

```bash
exit
```
Vuelves a tu máquina. El servidor sigue encendido (y, por ahora, cobrando): al final del bloque lo apagaremos.

---

## ✅ Compruébalo

Sin mirar, intenta:

- [ ] Saber en qué carpeta estás y quién eres (`pwd`, `whoami`).
- [ ] Revisar disco y memoria (`df -h`, `free -h`).
- [ ] Actualizar la lista de paquetes e instalar uno (`sudo apt update`, `sudo apt install -y ...`).
- [ ] Salir del servidor (`exit`) y volver a entrar (`ssh azureuser@$IP`).

---

## 🧠 Lo que aprendiste

| Comando | Para qué |
|---|---|
| `pwd`, `ls -la`, `whoami`, `uname -a` | Orientarte en el servidor |
| `df -h`, `free -h`, `top` | Revisar disco, memoria y procesos |
| `sudo` | Ejecutar como administrador |
| `sudo apt update` / `apt install -y X` | Instalar programas en Ubuntu |
| `exit` | Salir de la sesión SSH |

---

## 🆘 Si algo salió mal

**"Permission denied" al instalar algo.**
Falta `sudo` delante del comando. Instalar requiere permisos de administrador.

**`sudo apt install` falla con errores de red o "could not get lock".**
Ejecuta primero `sudo apt update`. Si dice que otro proceso tiene el "lock", espera unos segundos (Ubuntu a veces actualiza solo al arrancar) y reintenta.

**Quedé "atrapado" en `top`.**
Pulsa la tecla `q` para salir.

---

**➡️ Siguiente:** [Instalar Docker y desplegar a mano](04-desplegar-a-mano.md)
