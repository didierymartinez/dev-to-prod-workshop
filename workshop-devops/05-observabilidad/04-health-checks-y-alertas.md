# Lección 5.4 — Health checks y alertas

> ⏱️ 40 minutos · 🎯 **Al terminar:** distinguirás un **health check** (el clúster se cura solo) de una **alerta** (un humano recibe un aviso). Definirás reglas de alerta en Prometheus, las enrutarás con **Alertmanager** y dispararás una alerta de verdad — antes de que un usuario note el problema.

---

## 🤔 El problema

Ya tienes logs y métricas. Pero alguien tiene que estar **mirando** el dashboard para darse cuenta de que algo va mal. A las 3 de la mañana nadie mira. Quieres lo contrario: que el sistema **te avise solo** cuando un síntoma cruza un umbral —la API caída, la memoria al 95%, los errores disparados— **antes** de que el usuario lo sufra.

---

## 💡 Conceptos

### Health check ≠ alerta

Son cosas distintas y complementarias:

| | **Health check** (Fase 3) | **Alerta** (esta lección) |
|---|---|---|
| Quién actúa | El **orquestador** (Swarm) | Un **humano** (o un canal) |
| Qué hace | Reinicia el contenedor enfermo / no le manda tráfico | Te **notifica** para que investigues |
| Alcance | Un contenedor, aquí y ahora | Tendencias y síntomas del sistema |
| Ejemplo | `/health` falla → Swarm reinicia esa réplica | "todas las réplicas caídas 1 min" → te llega un mensaje |

El health check es **auto-recuperación local y automática**; la alerta es **comunicación con las personas**. Necesitas ambas: el health check arregla lo que puede solo; la alerta te llama cuando hace falta una cabeza humana.

### Cómo alerta Prometheus

```
  Prometheus evalúa reglas  ──(alerta en estado "firing")──►  Alertmanager  ──►  Slack / email / etc.
  (¿se cumple la condición                                    (agrupa, evita
   por X tiempo?)                                              repetir, enruta)
```

- En **Prometheus** defines **reglas**: una condición sobre métricas (`up == 0`) que debe mantenerse un tiempo (`for: 1m`). Mientras se cumple, la alerta pasa de *inactive* → *pending* → **firing**.
- **Alertmanager** recibe las alertas *firing*, las **agrupa**, evita spam y las **enruta** a un receptor (Slack, email, PagerDuty…).

### Buenas alertas

Pocas y **accionables**. Alerta sobre **síntomas que sufre el usuario** (la API no responde, la latencia se disparó, suben los errores 5xx) más que sobre causas internas (CPU al 80% puede ser perfectamente normal). Una alerta que salta sin que nadie deba hacer nada acaba ignorándose.

---

## 🛠️ Manos a la obra

### Paso 1: Definir las reglas de alerta

Crea `monitoring/alert-rules.yml`:

```yaml
groups:
  - name: gestion-empresas
    rules:
      - alert: ApiCaida
        expr: up{job="api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Una réplica de la API no responde"
          description: "Prometheus no logra recoger métricas de una réplica de la API hace más de 1 minuto."

      - alert: MemoriaContenedorAlta
        expr: container_memory_usage_bytes{container_label_com_docker_swarm_service_name="gestion_api"} > 400e6
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Memoria alta en la API"
          description: "Un contenedor de la API supera los 400 MB hace más de 2 minutos."
```

> 🧠 `up` es una métrica que Prometheus genera solo: vale `1` si pudo recoger el `/metrics` del objetivo y `0` si no. `up{job="api"} == 0` significa "no consigo hablar con una réplica de la API".

> 💡 El umbral de memoria (`400e6` = 400 MB) es **ilustrativo**: ajústalo a lo que sea normal en tu caso. Para la prueba de esta lección usaremos `ApiCaida`, que es determinista.

### Paso 2: La configuración de Alertmanager

Crea `monitoring/alertmanager.yml`. Para el taller usamos un receptor sencillo y dejamos **comentado** cómo se conectaría Slack o email en un caso real:

```yaml
route:
  receiver: 'equipo'
  group_wait: 10s
  repeat_interval: 1h

receivers:
  - name: 'equipo'
    # En un entorno real, aquí enrutas a tu canal. Ejemplos:
    # slack_configs:
    #   - api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
    #     channel: '#alertas'
    # email_configs:
    #   - to: 'guardia@tuempresa.com'
    #     from: 'alertas@tuempresa.com'
    #     smarthost: 'smtp.tuempresa.com:587'
```

> 💡 Con el receptor "vacío" la alerta igual **se ve** en la interfaz de Alertmanager y Prometheus; lo que no hace es enviar el mensaje externo. Así pruebas el flujo sin necesitar credenciales de Slack/SMTP. Descomenta un bloque cuando tengas un canal real.

### Paso 3: Conectar Prometheus con las reglas y Alertmanager

Amplía `monitoring/prometheus.yml` añadiendo, **arriba** (junto a `global:`), estos dos bloques:

```yaml
rule_files:
  - /etc/prometheus/alert-rules.yml

alerting:
  alertmanagers:
    - dns_sd_configs:
        - names: ['tasks.obs_alertmanager']
          type: A
          port: 9093
```

(Los `scrape_configs` de la lección anterior se quedan igual, debajo.)

### Paso 4: Ampliar el stack con Alertmanager y montar las reglas

En `monitoring/observabilidad.yml`, **agrega** el servicio `alertmanager`, y monta el archivo de reglas dentro de Prometheus añadiendo un `config` a su lista:

```yaml
  prometheus:
    image: prom/prometheus:v2.48.0
    ports:
      - "9090:9090"
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
      - source: alert_rules            # ← nuevo: monta las reglas dentro de Prometheus
        target: /etc/prometheus/alert-rules.yml
    networks: [observabilidad, interna]
    deploy:
      placement: { constraints: [node.role == manager] }

  alertmanager:                        # ← servicio nuevo
    image: prom/alertmanager:v0.26.0
    ports:
      - "9093:9093"
    configs:
      - source: alertmanager_config
        target: /etc/alertmanager/alertmanager.yml
    networks: [observabilidad]
    deploy:
      placement: { constraints: [node.role == manager] }
```

Y en el bloque `configs:` del final, **añade** los dos nuevos:

```yaml
configs:
  # ... promtail_config, grafana_datasources, prometheus_config (se quedan) ...
  alert_rules:
    file: ./alert-rules.yml
  alertmanager_config:
    file: ./alertmanager.yml
```

### Paso 5: Redesplegar

```bash
scp -r monitoring azureuser@$(cd infra && terraform output -raw ip_publica):~/
ssh azureuser@$(cd infra && terraform output -raw ip_publica)
cd monitoring
docker stack deploy -c observabilidad.yml obs
exit
```

### Paso 6: Disparar una alerta de verdad

Necesitarás **dos terminales** en tu máquina:

1. **El túnel** — déjalo abierto y no escribas nada más en él. Cierra el túnel de la lección anterior (Ctrl+C) y abre este, que cubre Grafana, Prometheus y Alertmanager a la vez:
   ```bash
   ssh -L 3000:localhost:3000 -L 9090:localhost:9090 -L 9093:localhost:9093 azureuser@$(cd infra && terraform output -raw ip_publica)
   ```
2. **Una sesión SSH normal al manager** (en **otra** terminal), donde provocarás el fallo bajando la API a cero réplicas:
   ```bash
   ssh azureuser@$(cd infra && terraform output -raw ip_publica)
   docker service scale gestion_api=0
   ```

> 💡 Cada lección de esta fase amplió el túnel con más `-L`. Por eso conviene **cerrar el anterior y abrir el nuevo** con todos los puertos que necesitas; si no, perderías acceso a Grafana (3000) o a Prometheus (9090).

Observa el flujo, sin tocar nada más:

1. **Prometheus** (http://localhost:9090) → menú **Alerts**. `ApiCaida` pasa de *inactive* a **pending** (cuenta el `for: 1m`) y luego a **firing** (rojo).
2. **Alertmanager** (http://localhost:9093) → la alerta `ApiCaida` aparece listada. (Si hubieras configurado Slack/email, el mensaje habría salido aquí.)

**Restaura el servicio** y verás la alerta resolverse sola:

```bash
docker service scale gestion_api=3
```

En un par de minutos `ApiCaida` vuelve a *inactive*. Acabas de comprobar el ciclo completo: síntoma → regla → alerta → (notificación).

### Paso 7: Guardar el avance

```bash
git add monitoring/
git commit -m "observabilidad: alertas con reglas de prometheus y alertmanager"
git push
```

---

## ✅ Compruébalo

- [ ] Sabes explicar la diferencia entre un **health check** (Swarm reinicia) y una **alerta** (avisa a una persona).
- [ ] `monitoring/prometheus.yml` tiene `rule_files` y `alerting` apuntando a Alertmanager.
- [ ] Al hacer `docker service scale gestion_api=0`, la alerta `ApiCaida` llega a **firing** en Prometheus y aparece en Alertmanager.
- [ ] Al restaurar (`=3`), la alerta se **resuelve** sola.

---

## 🧠 Lo que aprendiste

- **Health check** = auto-recuperación automática y local (Swarm); **alerta** = aviso a un humano sobre un síntoma. Son complementarios.
- En **Prometheus** defines reglas (`expr` + `for`): la alerta va de *inactive* → *pending* → **firing**.
- **Alertmanager** recibe las alertas *firing*, las agrupa y las enruta a Slack/email/etc.
- Las buenas alertas son **pocas y accionables**, basadas en **síntomas del usuario**.

---

## 🏁 Cierre de la Fase 5

Ya no estás ciego. Tu plataforma ahora **te habla**:

- **Logs** centralizados (Loki + Promtail) — qué pasó, buscable desde un solo panel.
- **Métricas** (Prometheus + exporters + `/metrics` de la API) — CPU, memoria y peticiones en el tiempo, en dashboards de Grafana.
- **Alertas** (reglas + Alertmanager) — el sistema te avisa antes de que el usuario sufra.

Pero fíjate en algo: **todo esto lo probaste contra producción directamente**. Cada cambio de imagen, cada `docker service scale`, fue sobre el único entorno que tienes. Un equipo serio no ensaya en producción: prueba primero en un entorno **igual pero aparte** (*staging*) y solo **promueve** a producción cuando está seguro. Eso es lo que montarás en la próxima fase.

---

## 🧹 Apagar o destruir para no gastar

La observabilidad consume recursos; no la dejes encendida sin necesidad.

```bash
# Quitar solo el stack de observabilidad (deja la app):
docker stack rm obs

# O apagar las máquinas hasta la próxima sesión:
cd infra && terraform destroy        # (o "az vm deallocate" los nodos)
```

Como siempre, lo recreas en minutos con `terraform apply` y vuelves a desplegar.

---

## 🆘 Si algo salió mal

**La alerta nunca pasa a `firing`.**
Revisa en Prometheus **Status → Rules**: deben aparecer tus reglas. Si no, no se montó `alert-rules.yml` o falta `rule_files` en `prometheus.yml`. Recuerda que `for: 1m` hace que tarde un minuto en `pending` antes de `firing`.

**Prometheus no entrega las alertas a Alertmanager.**
En Prometheus, **Status → Runtime & Build / Configuration**, confirma el bloque `alerting`. El destino es `tasks.obs_alertmanager:9093` y ambos deben estar en la red `observabilidad`.

**Alertmanager no envía a Slack/email.**
Es lo esperado con el receptor de ejemplo (vacío): la alerta **se ve** en la UI pero no sale. Descomenta y completa un `slack_configs` o `email_configs` con datos reales para recibir el mensaje.

---

**➡️ Siguiente fase:** [Fase 6 — Entornos y CD avanzado](../06-entornos-y-cd-avanzado/README.md)
