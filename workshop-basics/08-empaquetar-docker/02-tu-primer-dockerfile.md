# Lección 8.2 — Tu primer Dockerfile

> ⏱️ 40 minutos · 🎯 **Al terminar:** habrás escrito la "receta" para empaquetar tu API y construido tu primera imagen de Docker propia.

---

## 🤔 El problema

Para meter tu API en una caja, Docker necesita una **receta**: qué base usar, cómo compilar tu código y cómo arrancarlo. Esa receta es el **Dockerfile**. Vamos a escribirlo para tu API de empresas.

---

## 💡 Conceptos

### El Dockerfile: la receta de la imagen

Un **Dockerfile** es un archivo de texto con instrucciones, una por línea, que Docker ejecuta en orden para construir la imagen: partir de una base, copiar tu código, compilarlo, definir cómo arranca.

### Construcción en dos etapas (multi-stage)

Compilar .NET necesita el **SDK** (grande, ~700 MB). Pero para *ejecutar* la app solo hace falta el **runtime** (mucho más pequeño). Si dejáramos el SDK en la imagen final, sería enorme y con más cosas de las necesarias.

La solución es un **multi-stage build**:
1. **Etapa de compilación:** usa el SDK, compila y publica la app.
2. **Etapa final:** parte de una imagen ligera con solo el runtime y copia **únicamente** el resultado compilado.

Resultado: una imagen final pequeña, rápida de descargar y con menos superficie de ataque.

---

## 🛠️ Manos a la obra

### Paso 1: Escribir el Dockerfile

En la **raíz** de `gestion-empresas` (junto a la carpeta `src`), crea un archivo llamado `Dockerfile` (sin extensión):

```dockerfile
# ── Etapa 1: compilar (usa el SDK, que es grande) ──────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar primero solo el .csproj y restaurar dependencias (aprovecha la caché)
COPY src/GestionEmpresas.Api/GestionEmpresas.Api.csproj src/GestionEmpresas.Api/
RUN dotnet restore src/GestionEmpresas.Api/GestionEmpresas.Api.csproj

# Copiar el resto del código y publicar (compilar para producción)
COPY src/ src/
RUN dotnet publish src/GestionEmpresas.Api/GestionEmpresas.Api.csproj -c Release -o /app/publish --no-restore

# ── Etapa 2: ejecutar (imagen ligera, solo runtime) ────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "GestionEmpresas.Api.dll"]
```

Desglose de las instrucciones clave:
- `FROM ... AS build` → parte de una imagen con el SDK; la llamamos `build`.
- `COPY` el `.csproj` y `RUN dotnet restore` **antes** de copiar todo → así, si solo cambia tu código (no las dependencias), Docker reutiliza la caché y reconstruye más rápido.
- `dotnet publish ... -c Release` → compila la app lista para producción.
- `FROM ...aspnet:8.0 AS runtime` → segunda etapa, imagen ligera con solo el runtime.
- `COPY --from=build /app/publish .` → trae **solo** lo compilado de la etapa anterior (no el SDK).
- `ENV ASPNETCORE_URLS=http://+:8080` → la app escuchará en el puerto 8080 dentro del contenedor.
- `ENTRYPOINT [...]` → el comando que arranca la app cuando el contenedor inicia.

### Paso 2: El `.dockerignore`

Igual que `.gitignore`, el `.dockerignore` evita copiar a la imagen cosas que no deben ir (resultados de compilación, secretos, las pruebas). Crea `.dockerignore` en la raíz:

```
**/bin/
**/obj/
**/appsettings.*.json
tests/
.git/
.github/
.vs/
```

> 🧠 Excluimos `appsettings.*.json` (que tiene tu connection string local) y `tests/` (no se despliega). La configuración de producción llegará por variables de entorno, no dentro de la imagen.

### Paso 3: Construir la imagen

Desde la raíz del proyecto:

```bash
docker build -t gestion-empresas-api .
```

- `docker build` construye la imagen siguiendo el Dockerfile.
- `-t gestion-empresas-api` le pone un **nombre** (tag) a la imagen.
- El `.` final indica que el contexto de construcción es la carpeta actual.

La primera vez tarda (descarga las imágenes base). Cuando termine, verifica que existe:

```bash
docker images gestion-empresas-api
```

Debe aparecer tu imagen en la lista. **Acabas de empaquetar tu aplicación.**

### Paso 4: Probar que la imagen arranca

Ejecuta un contenedor a partir de tu imagen:

```bash
docker run --rm -p 5000:8080 gestion-empresas-api
```

Verás que la app **arranca**, pero enseguida se queja de que **no puede conectarse a la base de datos**. Eso es **esperado y correcto**: la caja de tu API funciona, pero necesita su compañera, la base de datos. Pulsa `Ctrl+C` para detenerla.

> 🧠 Probar la imagen sola confirma que se construyó bien. En la próxima lección uniremos la API y la base de datos con un solo comando usando **docker compose**, y todo funcionará junto.

### Paso 5: Guardar el avance

```bash
git checkout -b feat/dockerfile
git add Dockerfile .dockerignore
git commit -m "agregar Dockerfile multi-stage para empaquetar la API"
git push -u origin feat/dockerfile    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] `docker build -t gestion-empresas-api .` termina sin errores.
- [ ] `docker images gestion-empresas-api` muestra tu imagen.
- [ ] Al correrla con `docker run`, la app arranca y (esperado) reclama la base de datos.
- [ ] Entiendes por qué usamos dos etapas (compilar con SDK, ejecutar con runtime ligero).

---

## 🧠 Lo que aprendiste

- El **Dockerfile** es la receta para construir la imagen de tu app.
- El **multi-stage build** compila con el SDK y deja una imagen final ligera con solo el runtime.
- `docker build -t nombre .` construye la imagen; `docker images` la lista.
- El `.dockerignore` evita meter basura y secretos en la imagen.

---

## 🆘 Si algo salió mal

**"Cannot connect to the Docker daemon".**
Docker Desktop no está abierto. Ábrelo y espera a que arranque.

**El build falla en `dotnet restore` o `publish`.**
Verifica las rutas del `COPY` (deben coincidir con `src/GestionEmpresas.Api/...`) y que el proyecto compile en tu máquina con `dotnet build`.

**El build copia cosas raras o tarda muchísimo.**
Revisa el `.dockerignore`: sin él, Docker intenta copiar `bin/`, `obj/` y `.git/`, que son enormes e innecesarios.

---

**➡️ Siguiente:** [Orquestar con docker compose](03-docker-compose.md)
