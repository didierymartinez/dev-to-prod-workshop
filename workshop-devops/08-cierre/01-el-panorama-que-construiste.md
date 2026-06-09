# Lección 8.1 — El panorama que construiste

> ⏱️ 25 minutos · 🎯 **Al terminar:** habrás repasado el sistema completo que construiste, verás cómo cada fase resolvió una fragilidad concreta, y confirmarás con un checklist que puedes responder las preguntas que definen a un equipo DevOps.

---

## 🎉 Lo que lograste

Empezaste con una app **desplegada a mano** y la convertiste en una plataforma **operada con criterio**. Mira el salto:

```
Llegaste con:                         Te vas con un sistema que...
  app en 1 servidor, a mano             ✓ se recrea entera desde código (Terraform + workspaces)
  "lo subí por SSH y funciona"          ✓ corre en un clúster que escala y se recupera solo (Swarm)
                                        ✓ se actualiza sin caídas, con rollback (rolling updates)
                                        ✓ guarda sus secretos en un cofre, leídos por identidad
                                        ✓ te cuenta qué pasa adentro (logs, métricas, alertas)
                                        ✓ tiene staging y prod, con promoción y aprobación
                                        ✓ escanea su seguridad en cada cambio (Trivy/Dependabot/CodeQL)
```

---

## 🗺️ El sistema completo, de un vistazo

Todo esto, sobre el mismo proyecto `gestion-empresas`:

```
   GitHub (código + pipeline)
     │  push a main
     ▼
   CD: construir → ESCANEAR (Trivy) → publicar (GHCR) → desplegar staging → ✋aprobar → producción
     │                                                         │                          │
     │                                                         ▼                          ▼
     │                                            ┌─────────────────────┐    ┌─────────────────────┐
     │   Terraform (workspaces)  ───crea───►      │  Clúster Swarm        │    │  Clúster Swarm        │
     │   • rg-...-staging / -prod                 │  STAGING              │    │  PRODUCCIÓN           │
     │   • VM con managed identity                │  api x3 + db          │    │  api x3 + db          │
     │   • Key Vault (secreto db-password)        │  + stack obs          │    │  + stack obs          │
     ▼                                            │  (Loki/Prometheus/    │    │  (Loki/Prometheus/    │
   Azure                                          │   Grafana/Alertmgr)   │    │   Grafana/Alertmgr)   │
                                                  └─────────────────────┘    └─────────────────────┘
```

Cada caja de ese diagrama la construiste tú, entendiendo por qué existe.

> 🧠 En el taller montaste a fondo **un** clúster (y dejaste listo **staging** en la Fase 6). El diagrama muestra el panorama **ideal**: en un equipo real, el mismo stack de observabilidad va idéntico en cada entorno — es la ventaja de tenerlo todo como código.

---

## 🎯 Las preguntas que ahora sabes responder

Cada fase nació de una **fragilidad** y te dejó una respuesta. Compruébate: ¿puedes explicar cada una con tus palabras?

| Pregunta de operación | Cómo la respondes | Fase |
|---|---|---|
| ¿Cómo recreas **toda** tu infraestructura desde cero, igual cada vez? | Infraestructura como código (Terraform) | 1 |
| ¿Qué pasa si una máquina o un contenedor **se cae**? | Orquestación y auto-recuperación (Swarm) | 2 |
| ¿Cómo **actualizas** la app sin que el usuario note una caída? | Rolling updates + rollback | 3 |
| ¿Dónde viven tus **secretos** y cómo evitas repartir contraseñas? | docker secret + Key Vault + managed identity | 4, 7 |
| ¿Cómo sabes **qué pasa dentro** de producción? | Logs, métricas y alertas (observabilidad) | 5 |
| ¿Cómo **pruebas un cambio** antes de que llegue a los usuarios? | Staging + promoción con aprobación | 6 |
| ¿Cómo evitas desplegar una imagen **vulnerable**? | Escaneo en el pipeline (Trivy, Dependabot, CodeQL) | 7 |

Si puedes explicarle estas siete a otra persona, piensas como un ingeniero de operaciones.

---

## ✅ Checklist de egreso del taller

Las habilidades que te llevas:

- [ ] Declaras y versionas infraestructura con **Terraform**, y manejas el **estado** y los **workspaces** para múltiples entornos.
- [ ] Levantas un **clúster Docker Swarm**, despliegas servicios con réplicas y entiendes el self-healing y las redes overlay.
- [ ] Actualizas sin downtime con **rolling updates** y sabes hacer **rollback**.
- [ ] Gestionas **secretos** con `docker secret` y **Azure Key Vault**, y configuras por entorno con `tfvars`.
- [ ] Tienes **observabilidad**: logs centralizados (Loki), métricas (Prometheus/Grafana) y alertas (Alertmanager).
- [ ] Operas **varios entornos** (staging/prod) y **promueves** con una compuerta de aprobación (GitHub Environments).
- [ ] Tu pipeline es **DRY** (workflows reutilizables) y **seguro** (Trivy, Dependabot, CodeQL, secret scanning).
- [ ] Usas **identidades** en vez de credenciales (managed identity) y aplicas **mínimo privilegio**.

---

## 🧠 Lo que aprendiste

- Construiste un sistema **operado de extremo a extremo**: de "lo subí a mano" a infraestructura como código, clúster, observabilidad, entornos y seguridad.
- Cada fase resolvió una **fragilidad** concreta que quedó del básico.
- Sabes responder las **siete preguntas** que definen la operación profesional de un sistema.

---

**➡️ Siguiente:** [Hacia dónde seguir](02-hacia-donde-seguir.md)
