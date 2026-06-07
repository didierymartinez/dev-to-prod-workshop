# Lección 8.4 — Los comandos de Docker del día a día

> ⏱️ 20 minutos · 🎯 **Al terminar:** tendrás una chuleta razonada de los pocos comandos de Docker que de verdad se usan, organizados por lo que quieres lograr. No es una lista para memorizar: es para entender **cuándo** usar cada uno.

---

## 🤔 El problema

Docker tiene decenas de comandos, y buscar en internet a veces abruma con opciones que nunca necesitarás. La verdad práctica es que el trabajo diario se hace con **un puñado**. Aquí están, agrupados por intención.

---

## 💡 La chuleta razonada

### 🏗️ Construir y levantar tu aplicación

| Quiero… | Comando |
|---|---|
| Construir mi imagen desde el Dockerfile | `docker build -t gestion-empresas-api .` |
| Levantar todo (API + BD) en primer plano | `docker compose up --build` |
| Levantar todo en segundo plano (sin bloquear la terminal) | `docker compose up -d --build` |

> 🧠 `-d` (*detached*) deja todo corriendo en segundo plano y te devuelve la terminal. Útil cuando ya sabes que funciona y quieres seguir trabajando.

### 👀 Ver qué está corriendo

| Quiero… | Comando |
|---|---|
| Ver los contenedores activos | `docker ps` |
| Ver los servicios de mi compose | `docker compose ps` |
| Ver las imágenes que tengo | `docker images` |

### 📜 Ver los logs (lo primero cuando algo falla)

| Quiero… | Comando |
|---|---|
| Ver los logs de la API, en vivo | `docker compose logs -f api` |
| Ver los logs de la base de datos | `docker compose logs -f db` |
| Ver los logs de un contenedor suelto | `docker logs -f <nombre>` |

> 🧠 La bandera `-f` (*follow*) muestra los logs en tiempo real. `Ctrl+C` para dejar de seguirlos (no detiene el contenedor).

### 🔧 Entrar a un contenedor

| Quiero… | Comando |
|---|---|
| Abrir una terminal dentro de un contenedor | `docker compose exec api sh` |
| Entrar al cliente de PostgreSQL | `docker compose exec db psql -U appuser -d empresasdb` |

> 🧠 `exec` ejecuta algo **dentro** de un contenedor que ya corre. Lo usaste en la Fase 6 para mirar la base de datos.

### ⏯️ Detener y arrancar

| Quiero… | Comando |
|---|---|
| Detener todo sin borrar nada | `docker compose stop` |
| Volver a arrancar lo detenido | `docker compose start` |
| Apagar y **eliminar** contenedores y red (conserva los datos del volumen) | `docker compose down` |
| Apagar y borrar **también** los datos (volúmenes) | `docker compose down -v` |

> ⚠️ `down -v` borra los datos. Úsalo solo cuando quieras empezar de cero a propósito.

### 🧹 Limpiar espacio

| Quiero… | Comando |
|---|---|
| Borrar imágenes, contenedores y caché sin usar | `docker system prune` |

> 🧠 Con el tiempo Docker acumula imágenes viejas que ocupan disco. `docker system prune` libera espacio (te pide confirmación). Úsalo de vez en cuando.

---

## 🛠️ Manos a la obra

No hay código nuevo. Practica la chuleta sobre tu propio proyecto:

1. Levanta en segundo plano: `docker compose up -d --build`.
2. Comprueba que corre: `docker compose ps`.
3. Mira los logs de la API un momento: `docker compose logs -f api` (luego `Ctrl+C`).
4. Entra a la base de datos y cuenta las empresas:
   ```bash
   docker compose exec db psql -U appuser -d empresasdb -c 'SELECT count(*) FROM "Empresas";'
   ```
5. Apaga todo conservando los datos: `docker compose down`.

---

## ✅ Compruébalo

- [ ] Levantaste el proyecto en segundo plano y lo viste con `docker compose ps`.
- [ ] Seguiste los logs de la API con `logs -f` y supiste salir con `Ctrl+C`.
- [ ] Entraste a la base de datos con `exec ... psql`.
- [ ] Sabes la diferencia entre `down` (conserva datos) y `down -v` (los borra).

---

## 🧠 Lo que aprendiste

- El trabajo diario con Docker se hace con pocos comandos, agrupados por intención: **construir/levantar**, **ver**, **logs**, **entrar**, **detener**, **limpiar**.
- `-d` corre en segundo plano; `-f` sigue los logs en vivo; `exec` entra a un contenedor activo.
- `down` conserva los volúmenes; `down -v` borra los datos.

---

## 🏁 Cierre de la Fase 8

Tu aplicación ya está **empaquetada y reproducible**: cualquiera con Docker puede levantarla igual con un comando. Tienes una imagen lista para viajar a un servidor.

Ahora sí, el gran salto: sacar la aplicación de tu máquina y ponerla en un **servidor real**, accesible desde internet.

---

**➡️ Siguiente fase:** [Fase 9 — Tu primer servidor en la nube](../09-el-servidor-real/README.md)
