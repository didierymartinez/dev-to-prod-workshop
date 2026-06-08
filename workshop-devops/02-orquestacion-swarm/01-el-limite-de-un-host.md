# Lección 2.1 — El límite de un solo host

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás por qué una app en una sola máquina no basta para producción, y qué es un orquestador de contenedores. Lección de **conceptos**.

---

## 🤔 El problema

En el básico, tu API corría en una VM con `docker compose`: **un** contenedor, en **una** máquina — y la infraestructura que declaraste en la Fase 1 sigue siendo un solo host. Pregúntate:

- Si llegan muchos usuarios y la VM se satura, ¿cómo repartes la carga? No puedes — solo hay una copia.
- Si el contenedor de la API se cae a las 3 a.m., ¿quién lo levanta? Nadie, hasta que alguien lo note.
- Si esa única VM falla, ¿qué pasa con tu app? Se cae del todo.

Un solo host es un **punto único de falla** y un techo de capacidad. Producción necesita algo mejor.

---

## 💡 Conceptos

### Qué es un orquestador

Un **orquestador de contenedores** es un sistema que ejecuta tus contenedores repartidos en **varias máquinas** y se encarga de mantenerlos vivos y balanceados. Tú le dices *"quiero 3 copias de esta API corriendo siempre"* y él se ocupa: las distribuye entre los nodos, las vigila y, si una cae, la reemplaza.

```
   docker compose                    Orquestador (Swarm)
   ───────────────                   ─────────────────────
   1 contenedor                      N réplicas repartidas en N nodos
   1 máquina                         varias máquinas (un clúster)
   si se cae, se queda caído         si una cae, el orquestador la recrea
   no reparte carga                  reparte las peticiones entre réplicas
```

### El vocabulario que usarás

| Término | Qué es |
|---|---|
| **Clúster** | El conjunto de máquinas (nodos) que trabajan juntas |
| **Nodo** | Cada máquina del clúster |
| **Manager** | Nodo que coordina el clúster y guarda el "estado deseado" |
| **Worker** | Nodo que solo ejecuta las tareas que el manager le asigna |
| **Servicio** | La definición de "quiero N réplicas de esta imagen" |
| **Réplica / tarea** | Cada copia del contenedor que el servicio mantiene corriendo |
| **Self-healing** | Si una réplica muere, el orquestador la recrea automáticamente |
| **Balanceo** | Las peticiones se reparten entre las réplicas |

### Docker Swarm

Hay varios orquestadores; el más conocido es **Kubernetes**. Nosotros usaremos **Docker Swarm**, que viene **integrado en Docker** y es la transición más natural desde `docker compose`: el archivo es casi el mismo, los comandos son familiares, y los conceptos (servicios, réplicas) se aprenden sin la curva empinada de Kubernetes. Es el peldaño correcto para entender la orquestación.

> 🧠 Lo que aprendas aquí —servicios, réplicas, redes overlay, self-healing— son **conceptos universales** de orquestación. Si más adelante saltas a Kubernetes, reconocerás todas estas ideas con otros nombres.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué tres problemas de "un solo host" resuelve un orquestador?
- [ ] ¿Cuál es la diferencia entre un **servicio** y una **réplica**?
- [ ] ¿Qué hace el manager y qué hace un worker?
- [ ] ¿Qué es "self-healing"?

---

## 🧠 Lo que aprendiste

- Una app en un solo host no escala y es un punto único de falla.
- Un **orquestador** corre **réplicas** repartidas en un **clúster** de nodos, reparte la carga y las recupera solas (**self-healing**).
- **Docker Swarm** es el orquestador integrado en Docker; el peldaño natural desde `docker compose`.
- Servicios, réplicas y redes overlay son conceptos **universales** de orquestación.

---

**➡️ Siguiente:** [Crear el clúster](02-crear-el-cluster.md)
