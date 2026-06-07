# Fase 7 — Pruebas y la primera automatización (CI)

> **Meta de la fase:** Que tu código se **revise solo**. Aprenderás a escribir pruebas automáticas (código que verifica que tu código funciona) y a configurar un **pipeline de CI** que las ejecuta en cada cambio que subas a GitHub, avisando si algo se rompió — antes de que llegue a producción.

---

## ¿Por qué ahora, antes de Docker y los servidores?

Porque tu aplicación local ya está **completa** (API + datos + web). Es el momento ideal para ponerle una **red de seguridad** antes de salir al mundo. Así, cuando empieces a desplegar (Fases 9-11), tendrás la tranquilidad de que cada cambio fue verificado automáticamente.

Vamos a dividir la idea en dos:
- **Pruebas:** código que comprueba tu código (Lecciones 7.1 y 7.2).
- **CI (Integración Continua):** que esas pruebas se ejecuten **solas** en cada cambio (Lecciones 7.3 y 7.4).

> Más adelante, en la **Fase 10**, agregaremos la otra mitad: el **CD** (despliegue automático). Por ahora, automatizamos la *verificación*.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [¿Por qué pruebas automáticas?](01-por-que-pruebas.md) | Entender el valor antes del cómo | 20 min |
| 2 | [Tu primera prueba](02-tu-primera-prueba.md) | Escribir y correr pruebas con xUnit | 40 min |
| 3 | [Integración Continua con GitHub Actions](03-integracion-continua.md) | Que las pruebas corran solas en cada cambio | 35 min |
| 4 | [Romper el pipeline a propósito](04-romper-el-pipeline.md) | Ver al "guardián" en acción | 25 min |

---

**➡️ Empieza en:** [¿Por qué pruebas automáticas?](01-por-que-pruebas.md)
