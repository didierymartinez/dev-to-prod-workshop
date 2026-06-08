# Fase 5 — Observabilidad

> **Meta de la fase:** Dejar de estar **ciego** en producción. Le pondrás *ojos* a tu plataforma: **logs centralizados** (ver qué pasó en cualquier servicio o nodo desde un solo lugar), **métricas** (CPU, memoria, peticiones a lo largo del tiempo) y **alertas** (que el sistema te avise antes de que lo note el usuario).

---

## La fragilidad que resolvemos

Tienes un clúster que escala y se recupera, despliegues sin caídas y secretos gestionados. Pero si **ahora mismo** la app va lenta, una réplica se reinicia sola cada pocos minutos, o la base de datos se está quedando sin memoria… ¿cómo te enteras? Hoy: entras por SSH al nodo correcto, corres `docker logs` y adivinas. O peor: te enteras cuando un usuario se queja. Eso no es *operar* un sistema.

En esta fase montas las tres piezas que todo equipo serio tiene en producción, **desplegadas como contenedores en tu propio clúster** (sin instalar nada en tu máquina).

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Estás ciego en producción: los tres pilares](01-los-tres-pilares.md) | Entender logs, métricas y trazas, y por qué centralizar | 20 min |
| 2 | [Logs centralizados](02-logs-centralizados.md) | Ver los logs de todos los servicios y nodos en un panel | 45 min |
| 3 | [Métricas y dashboards](03-metricas-y-dashboards.md) | CPU, memoria y peticiones con Prometheus + Grafana | 45 min |
| 4 | [Health checks y alertas](04-health-checks-y-alertas.md) | Que el sistema te avise solo cuando algo va mal | 40 min |

> Necesitas el clúster Swarm de las fases anteriores con el stack `gestion` desplegado.

> 💰 **Ojo al gasto:** las herramientas de observabilidad consumen recursos. Para esta fase conviene usar nodos un poco más grandes (`prod.tfvars` con `Standard_B2s`, de la Fase 4) o bajar temporalmente las réplicas de la API. Cada lección te lo recuerda, y el cierre te indica cómo **apagar o destruir** al terminar.

---

**➡️ Empieza en:** [Estás ciego en producción: los tres pilares](01-los-tres-pilares.md)
