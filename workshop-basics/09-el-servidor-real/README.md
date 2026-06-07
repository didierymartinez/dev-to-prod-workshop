# Fase 9 — Tu primer servidor en la nube

> **Meta de la fase:** Sacar tu aplicación de tu máquina y ponerla en un **servidor real** en internet, accesible para cualquiera. Lo harás **a mano**: crearás el servidor, entrarás por SSH y desplegarás paso a paso. Vas a *sentir* el trabajo manual — para que en la Fase 10 entiendas por qué automatizarlo lo cambia todo.

---

## ¿Por qué a mano primero?

Porque entender qué pasa "por dentro" de un despliegue te hace mejor profesional. Muchos despliegan copiando archivos a un servidor sin saber bien qué ocurre. Aquí lo harás consciente: verás el servidor, sus comandos, dónde viven los archivos y cómo se mantiene la app viva. Solo **después** de sentirlo, lo automatizaremos (Fase 10).

> 💰 **Aviso de costos:** esta fase usa una máquina pequeña en Azure (serie B, la más económica). Si la apagas al terminar cada sesión (te enseño cómo), el costo del taller es de pocos dólares. La última lección y la Fase 11 te recuerdan apagar y, al final, borrar todo.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [¿Qué es un servidor en la nube?](01-que-es-un-servidor.md) | Entender qué vas a alquilar y por qué | 20 min |
| 2 | [Crear tu máquina en Azure y entrar por SSH](02-crear-vm-y-ssh.md) | Un servidor Linux tuyo, en internet | 35 min |
| 3 | [Moverte en un servidor Linux](03-moverte-en-linux.md) | Los comandos para administrarlo | 30 min |
| 4 | [Instalar Docker y desplegar a mano](04-desplegar-a-mano.md) | Tu app corriendo en el servidor | 40 min |
| 5 | [El dolor del despliegue manual](05-el-dolor-manual.md) | Sentir por qué hay que automatizar | 25 min |

> Necesitarás **Azure CLI** instalado (Fase 0) y una cuenta de Azure.

---

**➡️ Empieza en:** [¿Qué es un servidor en la nube?](01-que-es-un-servidor.md)
