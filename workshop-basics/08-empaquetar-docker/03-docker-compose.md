# Lección 8.3 — Orquestar con docker compose

> ⏱️ 40 minutos · 🎯 **Al terminar:** levantarás tu API **y** su base de datos juntas con un solo comando, conectadas entre sí, y harás que los datos sobrevivan gracias a un **volumen**. Esto resuelve el misterio que dejó pendiente la Fase 6.

---

## 🤔 El problema

Tu API vive en una caja (Fase 8.2) y necesita otra caja: la base de datos. Levantarlas por separado y conectarlas a mano (con la red correcta, en el orden correcto) es tedioso y fácil de equivocar. Necesitamos describir **todo el conjunto** una vez y levantarlo con un comando.

---

## 💡 Conceptos

### docker compose: varias cajas, un comando

**docker compose** levanta **varios contenedores relacionados** a partir de un archivo `docker-compose.yml`. En él describes cada **servicio** (la API, la base de datos), y Docker:
- los arranca juntos,
- les crea una **red privada** para que se encuentren por su nombre,
- respeta el orden (que la base de datos esté lista antes que la API).

### Volúmenes: datos que sobreviven al contenedor

En la Fase 6 viste que borrar el contenedor de la base de datos borraba los datos. Un **volumen** es un almacenamiento gestionado por Docker que vive **fuera** del contenedor: aunque borres y recrees el contenedor, el volumen (y sus datos) permanece. Es la pieza que faltaba para una base de datos confiable.

---

## 🛠️ Manos a la obra

### Paso 1: Liberar el puerto de la base de datos anterior

En la Fase 6 levantaste un PostgreSQL suelto (`empresas-db`). Para que no choque con el de compose (ambos usan el puerto 5432), detenlo y elimínalo:

```bash
docker rm -f empresas-db
```

### Paso 2: Escribir el `docker-compose.yml`

En la raíz de `gestion-empresas`, crea `docker-compose.yml`:

```yaml
services:

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}     # viene del archivo .env
      POSTGRES_DB: empresasdb
    volumes:
      - empresas_pgdata:/var/lib/postgresql/data   # los datos viven en el volumen
    healthcheck:                                    # forma de saber si la BD ya está lista
      test: ["CMD-SHELL", "pg_isready -U appuser -d empresasdb"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: Dockerfile        # construye tu imagen con el Dockerfile de la lección 8.2
    environment:
      - ConnectionStrings__BaseDatos=Host=db;Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"                 # afuera 5000 → adentro 8080
    depends_on:
      db:
        condition: service_healthy  # espera a que la BD esté lista antes de arrancar

volumes:
  empresas_pgdata:                  # declara el volumen con nombre
```

Desglose de lo importante:
- Dos **servicios**: `db` (PostgreSQL) y `api` (tu app, construida desde el Dockerfile).
- `Host=db` en la connection string: dentro de compose, la API encuentra la base de datos **por el nombre del servicio** (`db`), no por `localhost`. Docker crea la red entre ellos.
- `volumes: empresas_pgdata` → los datos de PostgreSQL se guardan en un volumen que sobrevive a los contenedores.
- `depends_on ... service_healthy` → la API espera a que la base de datos esté **lista** (no solo "arrancada").
- `${DB_PASSWORD}` → la contraseña no está escrita aquí; viene del `.env` (siguiente paso).

### Paso 3: El archivo `.env`

Crea un archivo `.env` en la raíz con la contraseña (no se sube a Git):

```bash
echo "DB_PASSWORD=Clave_Local_2024" > .env
```

> ⚠️ Confirma que `.env` está ignorado por Git. Tu `.gitignore` (Fase 2) ya incluye `*.env`. Verifica con `git status` que **no** aparece.

### Paso 4: Levantar todo con un comando

```bash
docker compose up --build
```

`--build` reconstruye tu imagen de la API antes de levantar. Verás los logs de ambos servicios. Cuando la API esté lista, visita en el navegador:

```
http://localhost:5000/empresas
```

**Funciona: tu API y su base de datos corriendo juntas, en contenedores, con un comando.** (La tabla se crea sola al arrancar, gracias a las migraciones de la Fase 6.)

Para detener todo: `Ctrl+C`, o desde otra terminal `docker compose down`.

### Paso 5: Comprobar la persistencia con el volumen (cerrando el misterio de la Fase 6)

1. Con todo levantado, registra una o dos empresas (por el frontend o Postman).
2. Apaga **y elimina** los contenedores:
   ```bash
   docker compose down
   ```
3. Vuelve a levantarlos:
   ```bash
   docker compose up --build
   ```
4. Consulta `http://localhost:5000/empresas`.

**Tus empresas siguen ahí.** Aunque borraste los contenedores, el **volumen** `empresas_pgdata` conservó los datos. Esto es lo que faltaba en la Fase 6: ahora la base de datos es confiable.

Para borrar **también** los datos (empezar de cero), se usa la bandera `-v`:
```bash
docker compose down -v     # elimina contenedores Y volúmenes (se pierden los datos)
```

### Paso 6: Guardar el avance

```bash
git checkout -b feat/docker-compose
git add docker-compose.yml
git commit -m "agregar docker-compose para levantar API y base de datos juntas"

# Plantilla del .env para que otros sepan qué configurar (sin la contraseña real)
echo "DB_PASSWORD=cambia_esto" > .env.example
git add .env.example
git commit -m "agregar .env.example para el setup local"

git push -u origin feat/docker-compose    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] `docker compose up --build` levanta la API y la base de datos juntas.
- [ ] `http://localhost:5000/empresas` responde con datos.
- [ ] Tras `docker compose down` y volver a `up`, los datos **siguen** (gracias al volumen).
- [ ] Entiendes que `down -v` sí borra los datos, y que `Host=db` conecta por el nombre del servicio.

---

## 🧠 Lo que aprendiste

- **docker compose** levanta varios contenedores relacionados con un comando, en una red común.
- Los servicios se encuentran por su **nombre** (`Host=db`), no por `localhost`.
- Un **volumen** guarda los datos fuera del contenedor: sobreviven a `down`/`up` (pero no a `down -v`).
- La contraseña vive en `.env` (ignorado por Git), no en el `docker-compose.yml`.

---

## 🆘 Si algo salió mal

**"port is already allocated" (5432 o 5000).**
Tienes algo usando ese puerto (quizá el `empresas-db` del Paso 1, u otra app). Detenlo (`docker rm -f empresas-db`) o cambia el mapeo de puertos.

**La API arranca antes que la base de datos y falla.**
El `depends_on ... service_healthy` y el `healthcheck` evitan esto. Verifica que copiaste ambos bloques tal cual.

**Cambié código de la API y no se refleja.**
`docker compose up` reutiliza la imagen anterior. Reconstruye con `docker compose up --build`.

---

**➡️ Siguiente:** [Los comandos de Docker del día a día](04-comandos-del-dia-a-dia.md)
