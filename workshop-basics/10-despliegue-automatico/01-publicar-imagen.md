# Lección 10.1 — Publicar la imagen en un registro

> ⏱️ 30 minutos · 🎯 **Al terminar:** entenderás por qué el servidor debe **descargar** una imagen ya construida (en vez de construirla él), y dejarás listo un compose de producción que la usa.

---

## 🤔 El problema

En la Fase 9, el servidor **construía** la imagen con `docker compose up --build`. Eso tiene dos problemas: es lento, y "compilar en producción" no es buena práctica (el servidor debería solo *ejecutar*, no *construir*). Lo profesional es que la imagen se construya **una vez** (en GitHub) y el servidor solo la **descargue** y la corra.

---

## 💡 Conceptos

### El registro de imágenes (GHCR)

Un **registro** es un almacén de imágenes en internet. Construyes la imagen una vez, la **publicas** (push) al registro, y cualquier servidor puede **descargarla** (pull). Usaremos **GitHub Container Registry (GHCR)**, que viene incluido con tu cuenta de GitHub.

```
   GitHub Actions                 GHCR (registro)              Tu servidor
   construye la imagen  ──push──►  ghcr.io/tu-usuario/...  ──pull──►  la ejecuta
   (una vez)                       (guardada, versionada)            (solo descarga)
```

Esto separa el **construir** (caro, una vez, en GitHub) del **ejecutar** (en el servidor, que solo baja la imagen lista). Más rápido y más limpio.

### Etiquetas (tags): qué versión es cada imagen

Una imagen en el registro lleva una **etiqueta** que identifica la versión. Usaremos dos:
- `:latest` → siempre apunta a la última versión.
- `:<sha>` → una etiqueta única por cada commit (su identificador de Git). Sirve para saber exactamente qué versión está corriendo y para volver atrás si hace falta.

---

## 🛠️ Manos a la obra

En esta lección preparas el terreno; el pipeline de la próxima lección hará la publicación real.

### Paso 1: Crear el compose de producción

El `docker-compose.yml` de la Fase 8 **construye** la imagen (`build:`). Para producción queremos que la **descargue** del registro (`image:`). Crea un archivo nuevo, `docker-compose.prod.yml`, en la raíz del proyecto:

```yaml
services:

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: empresasdb
    volumes:
      - empresas_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d empresasdb"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    # En vez de "build", DESCARGA la imagen del registro (reemplaza TU_USUARIO en minúsculas)
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ConnectionStrings__BaseDatos=Host=db;Port=5432;Database=empresasdb;Username=appuser;Password=${DB_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    ports:
      - "5000:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  empresas_pgdata:
```

La única diferencia con el compose de la Fase 8 es el servicio `api`: en lugar de `build:`, ahora dice `image: ghcr.io/...`. El servidor ya no construye; solo descarga.

> 🧠 **Reemplaza `TU_USUARIO`** por tu usuario de GitHub **en minúsculas** (GHCR exige minúsculas en la ruta de la imagen).

### Paso 2: Guardar el avance

```bash
git checkout -b feat/compose-produccion
git add docker-compose.prod.yml
git commit -m "agregar compose de produccion que usa la imagen del registro"
git push -u origin feat/compose-produccion    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] Existe `docker-compose.prod.yml` con el servicio `api` usando `image: ghcr.io/...` (no `build`).
- [ ] Reemplazaste `TU_USUARIO` por tu usuario de GitHub en minúsculas.
- [ ] Puedes explicar por qué conviene que el servidor **descargue** la imagen en vez de construirla.

---

## 🧠 Lo que aprendiste

- Un **registro** (GHCR) guarda imágenes para que cualquier servidor las descargue.
- Separar **construir** (en GitHub, una vez) de **ejecutar** (en el servidor) es más rápido y limpio.
- Las **etiquetas** (`:latest`, `:<sha>`) identifican versiones de la imagen.
- El compose de producción usa `image:` (descargar), no `build:` (construir).

---

## 🆘 Si algo salió mal

**No sé cuál es mi "usuario en minúsculas".**
Es tu nombre de usuario de GitHub, tal cual aparece en la URL de tu perfil, pero todo en minúsculas. Ej: si eres `Maria-Dev`, usa `maria-dev`.

**¿Por qué dos archivos de compose (normal y prod)?**
El `docker-compose.yml` (con `build`) es cómodo para desarrollar en tu máquina. El `docker-compose.prod.yml` (con `image`) es para el servidor, que solo descarga. Es una separación habitual entre desarrollo y producción.

---

**➡️ Siguiente:** [El pipeline de despliegue](02-pipeline-de-despliegue.md)
