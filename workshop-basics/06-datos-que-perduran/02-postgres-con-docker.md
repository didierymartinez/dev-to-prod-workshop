# Lección 6.2 — Levantar PostgreSQL con Docker

> ⏱️ 35 minutos · 🎯 **Al terminar:** tendrás una base de datos PostgreSQL corriendo en tu máquina, levantada con un solo comando, gracias a Docker. Conocerás los pocos comandos de Docker que se usan a diario.

---

## 🤔 El problema

Necesitamos PostgreSQL corriendo. Instalarlo "a la antigua" implica un instalador, configurar usuarios, servicios del sistema… y queda distinto en cada máquina. Hay una forma mucho más limpia y reproducible: **Docker**.

---

## 💡 Conceptos

### Docker, en una frase (por ahora)

**Docker** permite ejecutar programas dentro de "cajas" llamadas **contenedores**, sin instalarlos en tu sistema. Alguien ya empaquetó PostgreSQL en una **imagen** (una caja lista para usar); tú solo la descargas y la ejecutas. Cuando termines, la borras sin dejar rastro en tu computador.

> 🧠 Por ahora solo vamos a **ejecutar** una caja que otros hicieron (PostgreSQL). En la **Fase 8** aprenderás a fondo qué es Docker y crearás tus *propias* cajas. Aquí lo usamos como un atajo limpio para tener una base de datos.

### Imagen vs contenedor

- **Imagen:** la plantilla, la caja sellada lista para usar (ej: `postgres:16`).
- **Contenedor:** una copia de esa imagen **en ejecución**. De una imagen puedes arrancar varios contenedores.

Es como una receta (imagen) y los platos que cocinas con ella (contenedores).

---

## 🛠️ Manos a la obra

### Paso 1: Instalar Docker Desktop

Si no lo instalaste en la Fase 0:

- **🪟 Windows / 🍎 macOS:** descarga **Docker Desktop** de [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) e instálalo con las opciones por defecto. En Windows puede pedirte activar WSL2; acepta lo que sugiera el instalador.
- **🐧 Linux:** instala Docker Engine siguiendo [docs.docker.com/engine/install](https://docs.docker.com/engine/install/).

**Importante:** abre **Docker Desktop** y espera a que diga que está corriendo (el ícono de la ballena estable). Docker debe estar **abierto** para que los comandos funcionen.

Verifica en una terminal nueva:
```bash
docker --version
```
Debe mostrar una versión (ej. `Docker version 27.x`).

### Paso 2: Levantar PostgreSQL con un comando

Este único comando descarga PostgreSQL y lo deja corriendo:

```bash
docker run -d \
  --name empresas-db \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=Clave_Local_2024 \
  -e POSTGRES_DB=empresasdb \
  -p 5432:5432 \
  postgres:16-alpine
```

> 🪟 **En Windows (PowerShell):** el salto de línea es con comilla invertida `` ` `` en vez de `\`, o escribe todo en una sola línea. Lo más simple: ponlo todo seguido sin saltos.

Desglose de las partes (son las que usarás siempre):

| Parte | Qué significa |
|---|---|
| `docker run` | descarga (si hace falta) y ejecuta una imagen |
| `-d` | en segundo plano (*detached*): no bloquea la terminal |
| `--name empresas-db` | un nombre para referirte al contenedor luego |
| `-e POSTGRES_USER=...` | variables de configuración que la imagen de Postgres entiende (usuario, contraseña, base de datos) |
| `-p 5432:5432` | conecta el puerto 5432 de tu máquina con el del contenedor (así tu API podrá conectarse) |
| `postgres:16-alpine` | la imagen a usar: PostgreSQL versión 16, variante "alpine" (ligera) |

La primera vez tarda un poco (descarga la imagen). Cuando termine, **PostgreSQL está corriendo**.

### Paso 3: Los comandos de Docker que de verdad usarás

No necesitas memorizar decenas de comandos. Estos cinco cubren el día a día:

```bash
docker ps                      # ver qué contenedores están corriendo
docker logs empresas-db        # ver los mensajes (logs) del contenedor
docker stop empresas-db        # detenerlo (sin borrarlo)
docker start empresas-db       # volver a arrancarlo
docker rm -f empresas-db       # borrarlo por completo
```

Ejecuta `docker ps`: debe aparecer `empresas-db` con estado *Up* (arriba). Eso confirma que tu base de datos está viva.

> 🧠 **Foco:** Docker tiene muchísimos comandos, pero en la práctica diaria usarás sobre todo `run`, `ps`, `logs`, `stop/start` y `rm`. Domínalos y vas bien; el resto lo buscarás cuando lo necesites.

---

## ✅ Compruébalo

- [ ] `docker --version` muestra una versión y Docker Desktop está abierto/corriendo.
- [ ] `docker ps` muestra el contenedor `empresas-db` con estado *Up*.
- [ ] Entiendes la diferencia entre **imagen** (plantilla) y **contenedor** (ejecución).
- [ ] Sabes detener (`docker stop`) y arrancar (`docker start`) el contenedor.

---

## 🧠 Lo que aprendiste

- **Docker** ejecuta programas en **contenedores** sin instalarlos en tu sistema.
- **Imagen** = plantilla; **contenedor** = imagen en ejecución.
- Levantaste PostgreSQL con un solo `docker run`, con usuario, contraseña, base de datos y puerto.
- Los comandos del día a día: `run`, `ps`, `logs`, `stop`/`start`, `rm`.

---

## 🆘 Si algo salió mal

**"Cannot connect to the Docker daemon" o "docker: command not found".**
Docker Desktop no está abierto o no está instalado. Ábrelo y espera a que arranque; luego reintenta.

**"port is already allocated" (puerto 5432 ocupado).**
Ya tienes algo usando el 5432 (quizá otro Postgres). Detenlo, o cambia el mapeo a `-p 5433:5432` (recuerda usar 5433 al conectar luego).

**Borré el contenedor sin querer.**
No hay problema: vuelve a ejecutar el `docker run` del Paso 2. (Ojo: por ahora, borrar el contenedor borra sus datos — eso lo resolveremos con "volúmenes" en la Fase 8.)

---

**➡️ Siguiente:** [Conectarte y mirar la base de datos](03-conectarte-y-mirar.md)
