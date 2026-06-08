# Lección 4.2 — Secretos del clúster (docker secret)

> ⏱️ 40 minutos · 🎯 **Al terminar:** la contraseña de la base de datos dejará de viajar como variable de entorno. La guardarás como un **secreto de Swarm**, que se monta como un archivo en memoria dentro de los contenedores que lo necesitan — invisible para el resto.

---

## 🤔 El problema

Hoy la contraseña va en el entorno (`Password=${DB_PASSWORD}`), visible con `docker service inspect`. Swarm tiene una forma mejor: los **secretos**. Se guardan cifrados en el clúster y se entregan **solo** a los servicios autorizados, montados como un archivo en `/run/secrets/` — nunca en una variable de entorno.

---

## 💡 Conceptos

### Cómo funciona un `docker secret`

- Creas el secreto una vez: `docker secret create`. Swarm lo guarda **cifrado**.
- En el stack, declaras qué servicios pueden usarlo. Swarm lo **monta como un archivo** dentro de esos contenedores, en `/run/secrets/<nombre>`, en un sistema de archivos **en memoria** (no toca el disco).
- La app (o PostgreSQL) **lee el archivo**, no una variable de entorno.

Resultado: la contraseña no aparece en el `inspect`, ni en el historial, ni en el YAML. Solo existe, en claro, dentro de los contenedores que la necesitan.

---

## 🛠️ Manos a la obra

### Paso 1: Crear el secreto en el clúster

Entra al manager y crea el secreto con la contraseña de la base de datos:

```bash
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
printf "Clave_Servidor_2024" | docker secret create db_password -
docker secret ls
```
`docker secret ls` lo muestra (solo el nombre y la fecha — **nunca** el valor). Ya está guardado cifrado en el clúster.

### Paso 2: Que la API lea la contraseña del secreto

Tu API hoy arma la connection string con la contraseña que viene del entorno. Cámbiala para que, **si hay un secreto montado**, lea la contraseña de ahí. En `src/GestionEmpresas.Api/Program.cs`, donde registras el `DbContext`:

```csharp
// La contraseña viene del secreto del clúster (montado en /run/secrets) si existe;
// si no (en tu máquina, sin Swarm), de la configuración local de siempre.
var connectionString = File.Exists("/run/secrets/db_password")
    ? $"Host=db;Port=5432;Database=empresasdb;Username=appuser;Password={File.ReadAllText("/run/secrets/db_password").Trim()}"
    : builder.Configuration.GetConnectionString("BaseDatos");

builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connectionString));
```

Desglose:
- En el **clúster**, el secreto está en `/run/secrets/db_password`; lo leemos y componemos la connection string.
- En **tu máquina** (sin Swarm, sin ese archivo), seguimos usando `appsettings.Development.json` como hasta ahora — local no cambia.

Republica la imagen (push → tu pipeline del básico, o `docker build` + `docker push` manual), como hiciste en la Fase 3.

### Paso 3: Ajustar el stack para usar el secreto

Edita tu `stack.yml`: declara el secreto como **externo** (lo creaste a mano), móntalo en `api` y en `db`, y **quita** la contraseña del entorno. PostgreSQL sabe leer su contraseña de un archivo con `POSTGRES_PASSWORD_FILE`:

```yaml
services:

  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:latest
    environment:
      - ASPNETCORE_ENVIRONMENT=Production    # ← ya NO va la contraseña aquí
    secrets:
      - db_password                          # ← monta el secreto en /run/secrets/db_password
    ports:
      - "5000:8080"
    networks: [interna]
    deploy:
      replicas: 3
      update_config: { parallelism: 1, delay: 10s, order: start-first, failure_action: rollback }
      rollback_config: { parallelism: 1, order: start-first }

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_DB: empresasdb
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password   # ← lee la contraseña del archivo
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [interna]
    deploy:
      replicas: 1
      placement: { constraints: [node.role == manager] }

networks:
  interna:
    driver: overlay

volumes:
  pgdata:

secrets:
  db_password:
    external: true      # creado con "docker secret create", no en este archivo
```

> 🧠 Es el **mismo `stack.yml`** de la Fase 3; lo nuevo es: el bloque `secrets:` al final, el `secrets: [db_password]` en cada servicio, el `POSTGRES_PASSWORD_FILE` en `db`, y que quitamos la contraseña del `environment` de `api`. (Compactamos `update_config`/`networks` en una línea por brevedad — es YAML equivalente al de la Fase 3.)

### Paso 4: Desplegar — ya sin el `export`

Copia el stack y despliega. **Fíjate que ya no hace falta `export DB_PASSWORD`:**

```bash
scp stack.yml azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
docker stack deploy -c stack.yml gestion      # sin exportar ninguna contraseña
```

### Paso 5: Comprobar que la contraseña ya no se ve

La app debe seguir respondiendo (`http://<IP>:5000/empresas`). Y ahora:

```bash
# La contraseña YA NO está en las variables de entorno del servicio:
docker service inspect gestion_api --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
# (no aparece ninguna Password=...)

# El secreto SÍ está montado como archivo dentro del contenedor:
CID=$(docker ps -q --filter "name=gestion_api" | head -1)
docker exec $CID cat /run/secrets/db_password    # muestra la contraseña, solo desde dentro
```

La contraseña salió del entorno y del YAML. Vive cifrada en el clúster y solo se monta donde hace falta. 🎉

### Paso 6: Guardar el avance

```bash
exit
git add stack.yml src/GestionEmpresas.Api/Program.cs
git commit -m "usar docker secret para la contraseña de la base de datos"
git push
```

---

## ✅ Compruébalo

- [ ] `docker secret ls` muestra `db_password` (sin revelar el valor).
- [ ] La app responde tras desplegar **sin** `export DB_PASSWORD`.
- [ ] `docker service inspect gestion_api` **no** muestra la contraseña en el entorno.
- [ ] El secreto está montado en `/run/secrets/db_password` dentro del contenedor.

---

## 🧠 Lo que aprendiste

- Un **`docker secret`** se guarda cifrado en el clúster y se **monta como archivo** (`/run/secrets/…`) solo en los servicios autorizados.
- La app y PostgreSQL leen la contraseña **del archivo** (`POSTGRES_PASSWORD_FILE`, `File.ReadAllText`), no del entorno.
- La contraseña desaparece del `inspect`, del historial y del YAML.

---

## 🆘 Si algo salió mal

**`secret not found` al desplegar.**
El secreto se declara `external: true`, así que debes crearlo **antes** con `docker secret create` (Paso 1). Verifica con `docker secret ls`.

**La API no conecta a la BD tras el cambio.**
Confirma que la imagen nueva (con el código que lee `/run/secrets/db_password`) se republicó y que el servicio la bajó (`docker service update --image ... --force gestion_api`). Revisa logs: `docker service logs gestion_api`.

**No puedo cambiar un secreto existente.**
Los secretos son inmutables: para "rotar" creas uno nuevo (`db_password_v2`), actualizas el stack para usarlo y eliminas el viejo. Lo automatizaremos mejor con Key Vault (próxima lección).

---

**➡️ Siguiente:** [Un cofre gestionado: Azure Key Vault](03-key-vault.md)
