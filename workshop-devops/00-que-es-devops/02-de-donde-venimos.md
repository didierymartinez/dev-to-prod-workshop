# Lección 0.2 — De dónde venimos

> ⏱️ 20 minutos · 🎯 **Al terminar:** verás con claridad el estado en que quedó tu aplicación al final del básico y las fragilidades concretas que este taller va a resolver, fase por fase. Lección de **conceptos**.

---

## 🤔 El problema

Para mejorar algo, primero hay que ver con honestidad qué tiene de débil. Tu aplicación del básico **funciona** — pero "funciona" no es lo mismo que "está bien operada". Hagamos un diagnóstico.

---

## 💡 Conceptos

### El estado final del básico

Al terminar el básico, tu app `gestion-empresas` estaba así:

```
   Internet
      │ :80
      ▼
┌──────── vm-app (pública, creada a mano con "az") ────────┐
│   Gateway nginx  ──►  API .NET (contenedor)              │
└──────────────────────────────│───────────────────────────┘
                                │ red privada
┌──────── vm-db (privada, SIN IP pública) ─────────────────┐
│              PostgreSQL (contenedor + volumen)           │
└───────────────────────────────────────────────────────────┘
   Infra creada a mano con "az". Despliegue: GitHub Actions → GHCR → SSH → compose
```

Funciona y se actualiza solo con cada `push`. Lograste muchísimo: incluso separaste la base de datos en su propia máquina privada y pusiste un gateway. Pero mirémoslo con ojos de quien tiene que **operar** esto en serio.

### Las fragilidades (y dónde las resolvemos)

| Lo que quedó frágil | Por qué es un problema | Lo resolvemos en |
|---|---|---|
| La infra se creó **a mano** (`az vm create`, `az ... open-port`…) | No es reproducible: ¿podrías recrearla idéntica en 6 meses? ¿Qué configuración tiene? Si alguien la cambia a mano, nadie se entera | **Fase 1 — IaC con Terraform** |
| Las máquinas son **estáticas**: no hay un clúster | Aunque separaste la BD, las VMs no escalan, no reparten carga ni se recuperan solas si una cae | **Fase 2 — Orquestación (Swarm)** |
| Cada despliegue **tumba la app** un momento | Los usuarios ven errores cada vez que actualizas | **Fase 3 — Despliegues sin downtime** |
| Secretos en archivos **`.env`** en el servidor | Frágiles, fáciles de filtrar, difíciles de rotar | **Fase 4 — Secretos y configuración** |
| Estás **ciego**: solo `docker logs` | No sabes si la app está lenta, saturada o a punto de caerse, hasta que se cae | **Fase 5 — Observabilidad** |
| **Un solo entorno**: despliegas directo a producción | Cualquier error impacta a los usuarios reales de inmediato | **Fase 6 — Entornos y CD avanzado** |
| Nadie revisa **vulnerabilidades** | Puedes estar desplegando imágenes o librerías con fallas de seguridad conocidas | **Fase 7 — DevSecOps** |

### El destino

Al terminar este taller, la misma app se verá así:

```
   Internet
      │
      ▼
   Gateway  ──►  Clúster Swarm (varios nodos, varias réplicas de la API)  ──►  Base de datos
                 • se actualiza sin downtime        • secretos en un cofre
                 • se recupera solo si un nodo cae  • con logs, métricas y alertas
      ▲
      └── todo creado con Terraform (código versionado) y desplegado por un
          pipeline con entornos (staging → prod) y escaneo de seguridad
```

Cada fragilidad, convertida en una práctica profesional.

---

## ✅ Compruébalo

- [ ] Puedes describir cómo quedó tu app al final del básico (qué corre y dónde).
- [ ] Puedes nombrar al menos cuatro fragilidades y qué fase resuelve cada una.
- [ ] Entiendes la diferencia entre "funciona" y "está bien operada".

---

## 🧠 Lo que aprendiste

- Tu app del básico **funciona**, pero tiene fragilidades de **operación**: infra a mano, un solo host, downtime, secretos en archivos, ceguera, un solo entorno, sin escaneo.
- Cada fase de este taller ataca **una** de esas fragilidades.
- El destino: la misma app, operada como en un equipo profesional.

---

**➡️ Siguiente:** [Prepara tu entorno](03-prepara-tu-entorno.md)
