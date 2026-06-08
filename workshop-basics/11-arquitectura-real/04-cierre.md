# Lección 11.4 — Cierre del taller

> ⏱️ 25 minutos · 🎯 **Al terminar:** habrás repasado todo lo que construiste, confirmado que puedes responder las preguntas clave, sabrás hacia dónde seguir, y dejarás todo limpio para no gastar.

---

## 🎉 Lo que lograste

Empezaste con un programa que solo corría en tu terminal. Mira dónde estás ahora:

```
Empezaste:                           Terminaste:
  un programa en tu máquina            un sistema profesional que...
  "funciona en mi máquina"             ✓ está versionado en Git
                                       ✓ expone una API por HTTP
                                       ✓ tiene una página web
                                       ✓ guarda datos en una base de datos
                                       ✓ está empaquetado con Docker
                                       ✓ se prueba solo (CI)
                                       ✓ se despliega solo al hacer push (CD)
                                       ✓ vive en servidores reales, en capas, protegido
```

Pasaste de *"copio archivos al servidor y rezo"* a un **flujo profesional y automático**, entendiendo cada pieza por dentro. Eso no es un cambio de herramientas: es un cambio de mentalidad.

---

## 🎯 Las 7 preguntas que ahora puedes responder

Estas 7 preguntas resumen lo esencial del taller. Compruébate: ¿puedes responder cada una con tus palabras?

1. **¿Qué es una API y por qué dos programas se "hablan" por HTTP?** → Fases 3 y 4.
2. **¿Cómo una página web muestra datos que vienen de otro programa?** → Fase 5 (`fetch`).
3. **¿Por qué los datos no pueden vivir dentro de la aplicación?** → Fase 6 (efímero vs persistente).
4. **¿Qué pasa realmente cuando "subes algo a un servidor" y cómo se hace bien?** → Fases 9 y 10.
5. **¿Por qué Docker acaba con el "en mi máquina funciona"?** → Fase 8.
6. **¿Por qué la base de datos vive en una máquina separada y sin acceso a internet?** → Fase 11.
7. **¿Qué hace un gateway y por qué hay un solo punto de entrada?** → Fase 11.

Si puedes explicar las 7 a otra persona, dominaste el ciclo de vida del software moderno.

---

## ✅ Checklist de egreso del taller

Las habilidades que te llevas:

- [ ] Versionas tu trabajo con Git: commits con propósito, ramas, Pull Requests, y push a GitHub.
- [ ] Construyes una API REST y entiendes los métodos y códigos de estado HTTP.
- [ ] Muestras datos de una API en una página web, y sabes qué es CORS y cómo resolverlo.
- [ ] Conectas una aplicación a una base de datos, lees una connection string y versionas el esquema con migraciones.
- [ ] Escribes pruebas automáticas y montas un pipeline de CI que las corre solas.
- [ ] Empaquetas una app con Docker y la levantas con `docker compose`.
- [ ] Creas un servidor en la nube, entras por SSH y administras un Linux básico.
- [ ] Automatizas el despliegue (CD): un push lleva tu cambio a producción solo.
- [ ] Separas las capas (gateway / app / datos) en una arquitectura segura y privada.

---

## 🧭 Hacia dónde seguir

Este taller te dio una **base completa y transversal**. Ahora tienes el criterio para elegir en qué profundizar:

- **Frontend:** frameworks modernos (React, Vue, Angular), TypeScript, diseño de interfaces.
- **Backend:** arquitecturas avanzadas, microservicios, colas de mensajes, seguridad y rendimiento.
- **Datos:** SQL avanzado, modelado, análisis de datos, *data warehousing*, *business intelligence*.
- **DevOps / Nube:** **orquestación de contenedores en varias máquinas** (Docker Swarm y, más allá, Kubernetes — el paso natural después de `docker compose` cuando necesitas réplicas y alta disponibilidad), infraestructura como código (Terraform), observabilidad, CI/CD avanzado, seguridad en la nube.
- **Inteligencia artificial:** uso de APIs de modelos, RAG, agentes.

Ninguno te será ajeno: en este taller tocaste un poco de todos. Elige el que más te haya gustado y profundiza — ya sabes cómo encaja en el panorama completo.

### Buenos hábitos para seguir creciendo

- **Construye, no solo veas.** Por cada hora de video, una de teclado.
- **Rompe cosas a propósito.** El error es el mejor profesor (lo hiciste en varias lecciones).
- **Documenta en GitHub.** Cada proyecto en tu perfil cuenta como carta de presentación.
- **Lee los errores y la documentación**, aunque estén en inglés. Es parte del oficio.

---

## 🧹 Limpieza final (¡importante para no gastar!)

Ya terminaste. Si no vas a seguir usando los servidores, **bórralos** para no seguir pagando. Como todo vive en un grupo de recursos, se elimina de una sola vez (ambas VMs, la red, los discos, todo):

```bash
az group delete --name rg-gestion-empresas --yes --no-wait
```

> 🧠 Esa es una de las grandes ventajas del grupo de recursos: borrarlo elimina **todo** lo que contiene. Cero recursos olvidados cobrando en tu cuenta.

Verifica que ya no existe:
```bash
az group exists --name rg-gestion-empresas    # debe responder "false"
```

> 💡 Tu **código** sigue a salvo en GitHub (lo subiste en cada lección). Borrar los servidores no borra tu trabajo: puedes volver a desplegarlo cuando quieras repitiendo las Fases 9-11.

---

## 🏆 Felicitaciones

Recorriste el ciclo de vida completo del software moderno: del editor a producción, con pruebas y despliegue automáticos, en una arquitectura segura. Lo hiciste **entendiendo cada pieza**, no copiando y pegando.

El mejor momento para aprender esto fue hace un año. El segundo mejor momento fue ahora. **Sigue construyendo.**

---

**🔚 Fin del taller.** ¿Quieres repasar el panorama completo? Vuelve al [README principal](../README.md).
