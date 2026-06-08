# Lección 5.3 — Métricas y dashboards

> ⏱️ 45 minutos · 🎯 **Al terminar:** desplegarás **Prometheus** (con los exporters `cAdvisor` y `node-exporter`) y harás que tu **API exponga sus propias métricas**. Verás en Grafana la **CPU**, la **memoria** y las **peticiones** de tu plataforma en el tiempo.

---

## 🤔 El problema

Los logs te dicen *qué pasó*, pero no *cuánto*. No responden "¿qué réplica consume más memoria?", "¿cuántas peticiones por segundo atendemos?", "¿subió la latencia tras el último despliegue?". Para **tendencias** —y para poder **alertar** en la próxima lección— necesitas **métricas**: números medidos en el tiempo.

---

## 💡 Conceptos

### Prometheus: tira de las métricas (pull)

**Prometheus** no espera a que le manden datos: cada pocos segundos **visita** (*scrape*) una lista de objetivos en su ruta `/metrics`, lee los números y los guarda como **series temporales**. ¿Cómo sabe a quién visitar en un clúster donde las réplicas cambian? Usa el **DNS de Swarm**: `tasks.<servicio>` devuelve la IP de **cada** tarea (réplica) de ese servicio.

### Exporters: métricas que la app no da por sí sola

Un contenedor de PostgreSQL no expone "su CPU" en `/metrics`. Para eso están los **exporters**, pequeños servicios que traducen el estado del sistema a métricas:

- **cAdvisor** — métricas **por contenedor**: CPU, memoria, red, disco de cada uno.
- **node-exporter** — métricas **del host**: CPU, RAM y disco de cada nodo.

Ambos corren en **modo global** (uno por nodo), como Promtail.

### Métricas de la propia API

Además de la infraestructura, quieres métricas de **tu aplicación**: cuántas peticiones atiende, cuánto tardan, cuántas fallan. Para eso, la API expone su propio `/metrics` con la librería `prometheus-net`, y Prometheus la visita como a cualquier otro objetivo.

### Una red que cruza dos stacks

Prometheus (stack `obs`) necesita alcanzar a la API (stack `gestion`). Para eso, **uniremos** la red interna de la app como **red externa** en el stack de observabilidad. Es un patrón común: un servicio de un stack conversando con otro.

---

## 🛠️ Manos a la obra

> 💰 **Recursos:** esta lección suma varios contenedores. Si tus nodos son `Standard_B1s` (1 GB), pueden quedarse cortos. Recomendado: aplica `prod.tfvars` (`Standard_B2s`) de la Fase 4 —`cd infra && terraform apply -var-file=prod.tfvars`— o baja temporalmente la API a 1 réplica: `docker service scale gestion_api=1`.

### Paso 1: Que la API exponga sus métricas

En tu proyecto, agrega la librería y dos líneas. Desde la carpeta de la API:

```bash
dotnet add package prometheus-net.AspNetCore
```

En `src/GestionEmpresas.Api/Program.cs`, arriba con los demás `using`:

```csharp
using Prometheus;
```

Y en la configuración del *pipeline* HTTP (después de construir `app`, junto a tus otros `app.Use...`):

```csharp
app.UseHttpMetrics();   // mide cada petición: cuántas, cuánto tardan, con qué código
app.MapMetrics();       // publica las métricas en /metrics para que Prometheus las lea
```

> 🧠 Esto **convive** con el endpoint `/health` que tu imagen tiene desde la Fase 3: son cosas distintas. `/health` le dice a **Swarm** si debe reiniciar una réplica; `/metrics` le da a **Prometheus** los números. No se pisan.

Republica la imagen (push → tu pipeline del básico, o `docker build` + `docker push` manual y `docker service update --image ... --force gestion_api`), como en la Fase 3.

> 💡 Comprueba en local antes de subir: `curl http://localhost:5000/metrics` debe devolver muchas líneas tipo `http_requests_received_total{...} 5`.

### Paso 2: La configuración de Prometheus

Crea `monitoring/prometheus.yml` con los objetivos a visitar:

```yaml
global:
  scrape_interval: 15s        # cada cuánto recoge métricas

scrape_configs:
  - job_name: prometheus      # se mide a sí mismo
    static_configs:
      - targets: ['localhost:9090']

  - job_name: cadvisor        # métricas por contenedor (un cAdvisor por nodo)
    dns_sd_configs:
      - names: ['tasks.obs_cadvisor']
        type: A
        port: 8080

  - job_name: node            # métricas del host (un node-exporter por nodo)
    dns_sd_configs:
      - names: ['tasks.obs_nodeexporter']
        type: A
        port: 9100

  - job_name: api             # tu aplicación (las 3 réplicas)
    dns_sd_configs:
      - names: ['tasks.gestion_api']
        type: A
        port: 8080
```

> 🧠 `tasks.obs_cadvisor` y `tasks.gestion_api` usan el nombre **completo** del servicio en Swarm: `<stack>_<servicio>`. Por eso desplegamos la observabilidad como stack **`obs`**. El `tasks.` delante hace que el DNS devuelva **todas** las réplicas, no una sola.

### Paso 3: Añadir Prometheus a las fuentes de Grafana

Amplía `monitoring/grafana-datasources.yml` para que Grafana también lea de Prometheus:

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100

  - name: Prometheus          # ← nuevo
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Paso 4: Ampliar el stack de observabilidad

Edita `monitoring/observabilidad.yml`. **Agrega** los tres servicios nuevos (`prometheus`, `cadvisor`, `nodeexporter`), el `config` de Prometheus, y declara la red externa de tu app para que Prometheus la alcance:

```yaml
services:

  # ... loki, promtail y grafana de la lección anterior se quedan igual ...

  prometheus:
    image: prom/prometheus:v2.48.0
    ports:
      - "9090:9090"
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
    networks: [observabilidad, interna]    # ← en ambas redes: ve a los exporters y a la API
    deploy:
      placement: { constraints: [node.role == manager] }

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.2
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks: [observabilidad]
    deploy:
      mode: global                          # uno por nodo

  nodeexporter:
    image: prom/node-exporter:v1.7.0
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
    networks: [observabilidad]
    deploy:
      mode: global                          # uno por nodo
```

Y al final del archivo, **añade** el `config` nuevo y la **red externa**:

```yaml
networks:
  observabilidad:
    driver: overlay
  interna:                  # ← la red de tu app (stack "gestion"), referenciada como externa
    external: true
    name: gestion_interna

configs:
  promtail_config:
    file: ./promtail-config.yml
  grafana_datasources:
    file: ./grafana-datasources.yml
  prometheus_config:        # ← nuevo
    file: ./prometheus.yml
```

> 🧠 `external: true` con `name: gestion_interna` le dice a Swarm: *"no crees esta red, usa la que ya existe del stack `gestion`"*. Así Prometheus comparte red con la API y puede visitar `tasks.gestion_api`.

### Paso 5: Redesplegar

```bash
scp -r monitoring azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
cd monitoring
docker stack deploy -c observabilidad.yml obs
docker stack services obs        # ahora también prometheus, cadvisor y nodeexporter
```

### Paso 6: Ver las métricas

Amplía tu túnel SSH para alcanzar también Prometheus (en otra terminal local):

```bash
ssh -L 3000:localhost:3000 -L 9090:localhost:9090 azureuser@$(cd infra && terraform output -raw ip_publica)
```

1. **Prometheus** (http://localhost:9090) → menú **Status → Targets**. Todos deben aparecer **UP**: `prometheus`, `cadvisor`, `node`, `api` (este último con 3 endpoints, uno por réplica).
2. **Grafana** (http://localhost:3000) → **Dashboards → New → Import**. Importa por **ID** dos tableros de la comunidad:
   - `1860` → *Node Exporter Full* (CPU, RAM, disco del host). Elige la fuente **Prometheus**.
   - `14282` → *cAdvisor* (CPU y memoria por contenedor). Elige **Prometheus**.
3. Para ver **peticiones**, en Grafana → **Explore** → fuente **Prometheus** → consulta:
   ```promql
   rate(http_requests_received_total[1m])
   ```
   Mientras tanto, en otra terminal lanza tráfico: `for i in $(seq 1 50); do curl -s http://<IP>:5000/empresas > /dev/null; done`. Verás la línea **subir**.

   > 🪟 **Windows (PowerShell):** el bucle es `1..50 | ForEach-Object { curl http://<IP>:5000/empresas | Out-Null }`.

### Paso 7: Guardar el avance

```bash
exit
git add monitoring/ src/GestionEmpresas.Api/
git commit -m "observabilidad: metricas con prometheus, exporters y /metrics en la API"
git push
```

---

## ✅ Compruébalo

- [ ] En Prometheus, **Status → Targets** muestra `cadvisor`, `node` y `api` en **UP**.
- [ ] Importaste los dashboards `1860` y `14282` y ves CPU/memoria reales.
- [ ] La consulta `rate(http_requests_received_total[1m])` **sube** cuando lanzas peticiones a `/empresas`.
- [ ] Entiendes por qué Prometheus está en las redes `observabilidad` **e** `interna`.

---

## 🧠 Lo que aprendiste

- **Prometheus** recoge métricas haciendo *scrape* (pull) de `/metrics`, y descubre las réplicas por DNS de Swarm (`tasks.<stack>_<servicio>`).
- Los **exporters** (cAdvisor por contenedor, node-exporter por host) dan métricas de infraestructura sin tocar la app.
- Tu **API** expone sus propias métricas (`prometheus-net`: `UseHttpMetrics` + `MapMetrics`) → peticiones, latencia, errores.
- Una red **externa** (`external: true`) permite que un stack alcance los servicios de otro.
- **Grafana** grafica todo; los dashboards de la comunidad se importan por **ID**.

---

## 🆘 Si algo salió mal

**Un target sale DOWN en Prometheus.**
Casi siempre es el nombre DNS o la red. Verifica: el servicio está desplegado (`docker stack services obs` / `gestion`), el nombre es `tasks.<stack>_<servicio>` y el puerto es el **interno** del contenedor (cAdvisor 8080, node-exporter 9100, API 8080). Para `api`, Prometheus debe estar en la red `interna`.

**`/metrics` de la API devuelve 404.**
Faltó `app.MapMetrics();` o el paquete `prometheus-net.AspNetCore`, o no republicaste la imagen. Comprueba que el servicio bajó la nueva: `docker service update --image ghcr.io/TU_USUARIO/gestion-empresas-api:latest --force gestion_api`.

**`network gestion_interna not found`.**
La red externa solo existe si el stack `gestion` está desplegado y su red se llama así (`<stack>_<red>`). Confírmalo con `docker network ls | grep interna`.

**Los contenedores se reinician o el nodo va lentísimo (memoria).**
La observabilidad pesa. Usa `Standard_B2s` (`terraform apply -var-file=prod.tfvars`) o baja la API a 1 réplica durante esta fase (`docker service scale gestion_api=1`).

---

**➡️ Siguiente:** [Health checks y alertas](04-health-checks-y-alertas.md)
