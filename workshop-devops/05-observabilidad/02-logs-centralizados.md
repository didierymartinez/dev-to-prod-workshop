# Lección 5.2 — Logs centralizados

> ⏱️ 45 minutos · 🎯 **Al terminar:** desplegarás **Loki + Promtail + Grafana** en tu clúster y verás, en un solo panel y con búsqueda, los logs de **todos** los servicios y nodos — sin saltar por SSH de máquina en máquina.

---

## 🤔 El problema

`docker service logs gestion_api` ya junta las 3 réplicas de la API. Está bien para una mirada rápida, pero:

- Es **efímero**: si un contenedor muere, sus logs se van con él.
- No se **busca** bien (¿"dame todos los `ERROR` de la última hora de cualquier servicio"?).
- Te obliga a estar **dentro del servidor**, por SSH.
- No hay **historial** ni forma de comparar "antes y después" de un despliegue.

Necesitas juntar los logs de todo el clúster en un lugar **consultable y persistente**.

---

## 💡 Conceptos

### El patrón: agente → almacén → visor

```
  cada nodo:  [contenedores] → Promtail (agente) ─┐
                                                   ├─► Loki (almacén + búsqueda) ─► Grafana (visor)
  otro nodo:  [contenedores] → Promtail (agente) ─┘
```

- **Promtail** es un agente liviano que corre **en cada nodo** (modo *global*), lee los logs de los contenedores de ese nodo y los **envía** a Loki.
- **Loki** es el almacén: guarda los logs indexados por **etiquetas** (servicio, contenedor) para que los busques rápido.
- **Grafana** es el visor: una interfaz web donde consultas los logs. **Lo reutilizarás** para las métricas en la próxima lección — por eso lo montamos aquí.

### `docker config`: como `docker secret`, pero para lo no sensible

Promtail y Grafana necesitan archivos de configuración. En la Fase 4 aprendiste `docker secret` para datos sensibles. Su primo para **configuración no secreta** es **`docker config`**: archivos que el clúster monta dentro de los contenedores. Aquí los declararemos cómodamente desde el stack con el bloque `configs:` (Swarm crea el `docker config` por ti a partir de un archivo local).

---

## 🛠️ Manos a la obra

> 💡 Trabaja en tu repo `gestion-empresas`, igual que con `stack.yml`.

### Paso 1: Una carpeta para la observabilidad

```bash
mkdir -p monitoring
cd monitoring
```

Aquí vivirán los archivos de configuración y el stack de observabilidad.

### Paso 2: La configuración de Promtail

Promtail necesita saber **de dónde** leer los logs y **a dónde** enviarlos. Crea `monitoring/promtail-config.yml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml          # recuerda hasta dónde ya envió

clients:
  - url: http://loki:3100/loki/api/v1/push   # a dónde manda los logs (Loki)

scrape_configs:
  - job_name: docker
    docker_sd_configs:                     # descubre los contenedores del nodo
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:                       # etiquetas útiles para buscar
      - source_labels: ['__meta_docker_container_name']
        target_label: container
      - source_labels: ['__meta_docker_container_label_com_docker_swarm_service_name']
        target_label: service
```

> 💡 `docker_sd_configs` hace que Promtail **descubra solo** los contenedores del nodo preguntándole al demonio de Docker (`docker.sock`). Las `relabel_configs` convierten metadatos de Docker en etiquetas (`service`, `container`) por las que luego filtrarás en Grafana.

### Paso 3: La fuente de datos de Grafana

Para no configurar Grafana a mano cada vez, la dejamos **declarada** (otra vez: configuración como código). Crea `monitoring/grafana-datasources.yml`:

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### Paso 4: El stack de observabilidad

Crea `monitoring/observabilidad.yml`. Es un stack **aparte** del de tu app (`gestion`); lo desplegaremos con el nombre `obs`:

```yaml
services:

  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    networks: [observabilidad]
    deploy:
      placement: { constraints: [node.role == manager] }

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock   # para descubrir contenedores
    configs:
      - source: promtail_config
        target: /etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    networks: [observabilidad]
    deploy:
      mode: global          # ← un Promtail por NODO, para recoger los logs de todos

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin     # solo para el taller (ver nota)
    configs:
      - source: grafana_datasources
        target: /etc/grafana/provisioning/datasources/datasources.yml
    networks: [observabilidad]
    deploy:
      placement: { constraints: [node.role == manager] }

networks:
  observabilidad:
    driver: overlay

configs:
  promtail_config:
    file: ./promtail-config.yml
  grafana_datasources:
    file: ./grafana-datasources.yml
```

> 🧠 **`mode: global`** es nuevo: en vez de N réplicas en cualquier nodo, Swarm corre **exactamente una** instancia de Promtail **por nodo**. Es justo lo que necesita un agente que recoge los logs locales de cada máquina.

> 🔒 La contraseña de Grafana va aquí en claro **solo para el taller**. En un entorno real sería un `docker secret` (como la de la BD en la Fase 4).

### Paso 5: Desplegar el stack `obs`

Copia la carpeta `monitoring/` al manager y despliega desde allí (el `docker stack deploy` lee los archivos de los `configs:` desde el disco local):

```bash
cd ..
scp -r monitoring azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
cd monitoring
docker stack deploy -c observabilidad.yml obs
docker stack services obs        # loki 1/1, grafana 1/1, promtail 2/2 (uno por nodo)
```

> 🪟 **Windows (PowerShell):** `scp -r` y `ssh` funcionan igual. Guarda la IP en una variable si prefieres: `$IP = (cd infra; terraform output -raw ip_publica)`.

### Paso 6: Ver los logs en Grafana

Grafana **no** está expuesto a internet (tu NSG solo abre 22, 80, 5000 y los puertos de Swarm). Eso es lo correcto: **no se exponen los tableros al mundo**. Lo alcanzas con un **túnel SSH** desde tu máquina. Abre **otra** terminal local:

```bash
ssh -L 3000:localhost:3000 azureuser@$(cd infra && terraform output -raw ip_publica)
```

Deja esa terminal abierta y entra en tu navegador a **http://localhost:3000** (usuario `admin`, contraseña `admin`).

1. Menú izquierdo → **Explore**.
2. Arriba, elige la fuente **Loki**.
3. En el campo de consulta escribe: `{service="gestion_api"}` y pulsa **Run query**.
4. Genera tráfico para ver líneas nuevas: en otra terminal, `curl http://<IP>:5000/empresas` varias veces.

Verás los logs de las **3 réplicas** de la API juntos, etiquetados, con búsqueda. Prueba `{service="gestion_db"}` para los de PostgreSQL, o `{service="gestion_api"} |= "GET"` para filtrar por texto.

### Paso 7: Guardar el avance

```bash
exit       # salir del SSH del manager (el túnel puedes cerrarlo cuando termines)
git add monitoring/
git commit -m "observabilidad: logs centralizados con loki, promtail y grafana"
git push
```

---

## ✅ Compruébalo

- [ ] `docker stack services obs` muestra `loki`, `grafana` y `promtail` (este último con tantas réplicas como nodos).
- [ ] Entras a Grafana por el túnel SSH (`http://localhost:3000`).
- [ ] La consulta `{service="gestion_api"}` en Explore muestra logs de la API.
- [ ] Al hacer `curl` a `/empresas`, aparecen **líneas nuevas** en la consulta.

---

## 🧠 Lo que aprendiste

- El patrón de logs centralizados: **agente** por nodo (Promtail) → **almacén** con búsqueda (Loki) → **visor** (Grafana).
- **`mode: global`** corre un contenedor por nodo — ideal para agentes que recogen datos locales.
- **`docker config`** monta configuración (no sensible) en los contenedores, como `docker secret` hace con los secretos.
- Expones los tableros por **túnel SSH**, no abriéndolos a internet.
- En Grafana consultas y filtras logs por etiquetas (`{service="..."}`) y por texto (`|= "..."`).

---

## 🆘 Si algo salió mal

**Promtail no arranca o no envía nada.**
Revisa que montaste `/var/run/docker.sock` y que el servicio está en `mode: global`. Mira sus logs: `docker service logs obs_promtail`.

**Grafana no encuentra la fuente Loki.**
La fuente se provisiona desde `grafana-datasources.yml` con la URL `http://loki:3100` (nombre del servicio en la red `observabilidad`). Confirma que el archivo se montó: en Grafana, **Connections → Data sources** debería listar **Loki**. Si lo editas, redepliega: `docker stack deploy -c observabilidad.yml obs`.

**La consulta no devuelve logs.**
Prueba primero `{container=~".+"}` (cualquier contenedor). Si ahí ves logs pero `{service="gestion_api"}` no, revisa la etiqueta: el nombre del servicio en Swarm es `gestion_api` (stack `gestion` + servicio `api`).

**No puedo abrir `localhost:3000`.**
Asegúrate de que el túnel SSH (`-L 3000:localhost:3000`) sigue abierto en otra terminal y que Grafana corre en el **manager** (tiene la restricción de `placement`).

---

**➡️ Siguiente:** [Métricas y dashboards](03-metricas-y-dashboards.md)
