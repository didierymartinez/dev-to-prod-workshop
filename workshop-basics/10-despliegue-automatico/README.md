# Fase 10 — Despliegue automático (CD)

> **Meta de la fase:** Eliminar el despliegue manual. A partir de ahora, con solo hacer `push` a GitHub, tu aplicación se **construirá, publicará y desplegará sola** en el servidor. Es la otra mitad de la automatización: el **CD** (Despliegue Continuo), que se suma al **CI** (pruebas) de la Fase 7.

---

## El antes y el después

```
Antes (Fase 9, manual):                  Ahora (Fase 10, automático):
  editar → probar → commit → push           editar → commit → push
  → scp → ssh → compose build               (y ya: GitHub hace el resto)
  (6 pasos, cada vez, a mano)               ✓ corre las pruebas
                                            ✓ construye la imagen
                                            ✓ la publica
                                            ✓ la despliega en el servidor
```

---

## Cómo encaja con lo que ya tienes

- En la **Fase 7** montaste el **CI**: en cada cambio, GitHub corre las pruebas.
- En la **Fase 8** empaquetaste la app en una **imagen** de Docker.
- En la **Fase 9** desplegaste a mano y sentiste el dolor.

Ahora unimos todo: GitHub construirá la imagen, la publicará en un **registro** y le dirá al servidor que descargue la nueva versión — sin que toques el servidor.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Publicar la imagen en un registro](01-publicar-imagen.md) | Preparar la imagen y el compose de producción | 30 min |
| 2 | [El pipeline de despliegue](02-pipeline-de-despliegue.md) | Que GitHub despliegue solo en el servidor | 45 min |
| 3 | [El ciclo completo de punta a punta](03-ciclo-completo.md) | Un cambio que llega solo a producción | 25 min |

---

**➡️ Empieza en:** [Publicar la imagen en un registro](01-publicar-imagen.md)
