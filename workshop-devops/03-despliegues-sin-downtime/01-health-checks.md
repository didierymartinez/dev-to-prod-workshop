# Lección 3.1 — Health checks: que el clúster sepa si tu app está sana

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu API expondrá un endpoint de salud y tu imagen le dirá a Swarm cómo comprobarlo. Swarm marcará cada réplica como *healthy* o *unhealthy* — la base para actualizar sin downtime.

---

## 🤔 El problema

Swarm sabe si un contenedor **está corriendo**, pero no si la aplicación **dentro** está realmente lista para atender. Una réplica puede estar "arriba" mientras .NET todavía arranca, o puede quedar colgada respondiendo errores. Si Swarm no distingue *corriendo* de *sana*, dos cosas malas pasan:

- Envía tráfico a una réplica que aún no responde (el usuario ve errores).
- Da por **exitoso** un despliegue de una versión rota (porque "el contenedor arrancó").

La solución: que la app **reporte su salud** y que Swarm la **vigile**.

---

## 💡 Conceptos

### Health check: la app se autoexamina

Un **health check** es una comprobación que se repite cada cierto tiempo para responder *"¿está sana esta réplica?"*. Típicamente, pedir un endpoint especial (`/health`) y ver si responde OK. Según el resultado, el contenedor queda marcado como **healthy** o **unhealthy**. (Ya te cruzaste con un `healthcheck` en el básico —sobre la base de datos, con `pg_isready`—; aquí lo llevamos a la **imagen de la API** para que Swarm lo use al desplegar.)

Swarm usa esa marca para todo lo que viene:
- Durante un **rolling update** (próxima lección), espera a que la réplica nueva esté *healthy* **antes** de continuar con la siguiente.
- Si una réplica se vuelve *unhealthy*, la reemplaza.

### Dos piezas

1. **En la app (ASP.NET):** un endpoint `/health` que responde si todo está bien. .NET lo trae listo con `AddHealthChecks()` + `MapHealthChecks("/health")`.
2. **En la imagen (Docker):** la instrucción `HEALTHCHECK`, que define **cómo** comprobar (pedir `/health` con `curl`) y cada cuánto. Swarm la lee de la imagen automáticamente.

---

## 🛠️ Manos a la obra

### Paso 1: Exponer `/health` en la API

En `src/GestionEmpresas.Api/Program.cs`, registra los health checks y mapea el endpoint:

```csharp
// junto a los otros builder.Services.AddX(...)
builder.Services.AddHealthChecks();

var app = builder.Build();

// … (tu UseCors, migraciones, etc.) …

// el endpoint de salud
app.MapHealthChecks("/health");
```

`MapHealthChecks("/health")` hace que `/health` responda `200 Healthy` cuando la app está bien. (Puedes probarlo local: `http://localhost:5000/health`.)

### Paso 2: Enseñarle a la imagen cómo comprobarse

La imagen base de .NET no trae `curl`. Agrégalo y define el `HEALTHCHECK` en tu `Dockerfile` (en la **etapa de runtime**, la final):

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# NUEVO: curl para el health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# NUEVO: cómo Swarm comprueba la salud de cada réplica
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "GestionEmpresas.Api.dll"]
```

Desglose del `HEALTHCHECK`:
- `--interval=10s` → comprueba cada 10 segundos.
- `--timeout=3s` → si la respuesta tarda más de 3s, falla.
- `--start-period=20s` → da 20s de gracia al arrancar (no cuenta fallos mientras .NET despierta).
- `--retries=3` → tras 3 fallos seguidos, marca *unhealthy*.
- `CMD curl -f .../health` → la prueba: pedir `/health`; `-f` hace que `curl` falle si la respuesta no es 200.

### Paso 3: Reconstruir y publicar la imagen

Como Swarm corre imágenes del registro (no construye), hay que **publicar** la versión nueva a GHCR. Dos caminos:

- **Con tu pipeline del básico:** haz `commit` + `push`; el CI reconstruye la imagen y la publica a GHCR.
  ```bash
  git checkout -b feat/health-checks
  git add src/GestionEmpresas.Api/Program.cs Dockerfile
  git commit -m "agregar endpoint /health y HEALTHCHECK a la imagen"
  git push -u origin feat/health-checks   # el CI publica la nueva imagen
  ```
  Fusiona el PR para que la imagen `:latest` quede actualizada; luego vuelve a `main` y sincroniza.
- **O manualmente** desde tu máquina (si prefieres no esperar al CI):
  ```bash
  docker build -t ghcr.io/TU_USUARIO/gestion-empresas-api:latest .
  docker push ghcr.io/TU_USUARIO/gestion-empresas-api:latest
  ```

### Paso 4: Actualizar el servicio en el clúster

Entra al manager y fuerza a que el servicio baje la imagen nueva:

```bash
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
docker service update --image ghcr.io/TU_USUARIO/gestion-empresas-api:latest --force gestion_api
```

### Paso 5: Comprobar la salud

```bash
docker ps --filter "name=gestion_api" --format "{{.Names}}\t{{.Status}}"
```
Tras unos segundos (el `start-period`), cada réplica mostrará **`(healthy)`** en su estado:
```
gestion_api.1...   Up 30 seconds (healthy)
```

Swarm ahora **sabe** cuándo una réplica está realmente lista. Eso es lo que hará posible actualizar sin downtime.

---

## ✅ Compruébalo

- [ ] `http://localhost:5000/health` responde `Healthy` en tu máquina.
- [ ] El `Dockerfile` tiene `curl` y la instrucción `HEALTHCHECK`.
- [ ] Publicaste la imagen nueva y actualizaste el servicio.
- [ ] `docker ps` muestra las réplicas de `gestion_api` como **`(healthy)`**.

---

## 🧠 Lo que aprendiste

- Un **health check** distingue *corriendo* de *sano*; la app se autoexamina por un endpoint (`/health`).
- En **ASP.NET**: `AddHealthChecks()` + `MapHealthChecks("/health")`.
- En la **imagen**: la instrucción `HEALTHCHECK` (con `curl`), que Swarm lee automáticamente.
- Swarm usa la salud para reemplazar réplicas caídas y para actualizar de forma segura (próxima lección).

---

## 🆘 Si algo salió mal

**Las réplicas aparecen `(unhealthy)`.**
Prueba `/health` local primero. Revisa que el `HEALTHCHECK` apunte al puerto interno **8080** (no 5000) y que `curl` quedó instalado. Mira los logs: `docker service logs gestion_api`.

**`docker service update` no baja la imagen nueva.**
Con el tag `:latest`, usa `--force` (lo incluye el comando). Confirma que la imagen nueva sí se publicó (revisa la fecha del paquete en GHCR).

**El health check tarda en pasar a healthy.**
Es normal los primeros ~20s (el `start-period`): .NET necesita arrancar. Si nunca pasa, casi siempre es el puerto o que `/health` no está mapeado.

---

**➡️ Siguiente:** [Rolling updates](02-rolling-updates.md)
