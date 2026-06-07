# Fase 11 — Arquitectura de verdad

> **Meta de la fase:** Separar y proteger las piezas de tu sistema como en una arquitectura de producción real. Pondrás la base de datos en su **propia máquina privada** (invisible desde internet), protegerás el tráfico con un **firewall**, y pondrás un **gateway** como único punto de entrada — que de paso resolverá, desde la infraestructura, el problema de CORS de la Fase 5.

Esta es la fase final y la más densa en infraestructura. Ve con calma, paso a paso. Al terminar, habrás recorrido el ciclo de vida completo del software moderno.

---

## El problema que cierra el taller

Hoy, tu API y tu base de datos viven en la **misma** máquina, expuesta a internet. Eso tiene dos riesgos serios que una arquitectura profesional no acepta:

1. **Seguridad:** la máquina pública guarda, al lado, todos los datos sensibles (NITs, contactos). Si alguien la vulnera, los datos están ahí mismo.
2. **Un solo punto de falla y de entrada:** todo entra y vive en un mismo lugar, sin capas ni orden.

Vamos a arreglarlo con la arquitectura objetivo:

```
                        ┌─────────────────── vm-app (pública) ──────────────────┐
   internet ──:80──►    │  Gateway (nginx)  ──►  API (contenedor, interno)       │
                        └───────────────────────────────────│───────────────────┘
                                                             │ red privada (10.x)
                        ┌──────────── vm-db (PRIVADA, sin IP pública) ───────────┐
                        │                         PostgreSQL                     │
                        └────────────────────────────────────────────────────────┘
```

Solo el **gateway** mira a internet. La API queda interna; la base de datos, en otra máquina **sin IP pública** — imposible de alcanzar desde fuera.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [¿Por qué separar y proteger?](01-por-que-separar.md) | Entender la arquitectura en capas | 20 min |
| 2 | [La base de datos en su propia máquina](02-base-de-datos-separada.md) | BD en red privada + firewall | 45 min |
| 3 | [El gateway: un único punto de entrada](03-el-gateway.md) | nginx al frente; adiós CORS | 40 min |
| 4 | [Cierre del taller](04-cierre.md) | Repaso, próximos pasos y limpieza | 25 min |

---

**➡️ Empieza en:** [¿Por qué separar y proteger?](01-por-que-separar.md)
