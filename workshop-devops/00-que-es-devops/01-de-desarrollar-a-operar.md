# Lección 0.1 — De "desarrollar" a "operar"

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es DevOps, qué problema resuelve y por qué no es una herramienta ni un cargo, sino una forma de trabajar. Lección de **conceptos**.

---

## 🤔 El problema

En muchas empresas, durante años, hubo dos equipos separados:

- **Desarrollo (Dev):** escribe el código y quiere entregar cambios rápido.
- **Operaciones (Ops):** mantiene los servidores y quiere estabilidad (que nada cambie y se caiga).

Sus objetivos chocan, y aparece el clásico tira y afloja: *"en mi máquina funciona"* (Dev) contra *"tu app me tumba el servidor"* (Ops). El resultado: entregas lentas, despliegues temidos, culpas cruzadas y noches en vela cuando algo falla en producción.

---

## 💡 Conceptos

### Qué es DevOps

**DevOps** es una forma de trabajar que **une desarrollo y operaciones** para entregar software **rápido y de forma confiable**. La idea central: los que construyen el software también se hacen responsables de operarlo, y todo lo posible se **automatiza** para que sea repetible y sin errores humanos.

No es magia ni una sola herramienta: es **cultura + prácticas + herramientas**, en ese orden de importancia.

### Qué NO es DevOps

- **No es un cargo** ("contratemos un DevOps"). Es una forma de trabajar de todo el equipo.
- **No es una sola herramienta.** Terraform, Docker o GitHub Actions *apoyan* DevOps, pero usarlas no te hace "hacer DevOps" si el equipo sigue trabajando en silos.
- **No es solo automatizar.** Automatizar sin colaboración ni medición es solo scripts.

### El ciclo de feedback

DevOps busca acortar el **ciclo de feedback**: el tiempo entre que tienes una idea y que sabes si funcionó en producción. Cuanto más corto y automático sea ese ciclo, más rápido y seguro entregas valor.

```
   idea → código → pruebas → empaquetar → desplegar → observar
     ▲                                                     │
     └──────────────── aprender y corregir ◄───────────────┘
                    (cuanto más rápido este ciclo, mejor)
```

### Los pilares que verás en este taller

| Pilar | Qué significa | Fase |
|---|---|---|
| **Infraestructura como Código** | Los servidores se describen en archivos, no se arman a mano | 1 |
| **Orquestación** | Varios servidores trabajando como uno solo | 2-3 |
| **Gestión de secretos y config** | Las claves viven en un cofre, no en archivos | 4 |
| **Observabilidad** | Saber qué pasa en producción en todo momento | 5 |
| **Automatización (CI/CD)** | El camino a producción es automático y controlado | 6 |
| **Seguridad (DevSecOps)** | La seguridad es parte del pipeline, no un parche al final | 7 |

### Ya hiciste DevOps sin saberlo

En el básico, cuando configuraste CI/CD (las pruebas y el despliegue automáticos) y empaquetaste con Docker, ya estabas aplicando prácticas DevOps. Este taller **formaliza y profundiza** eso: te da el panorama completo y las herramientas que usan los equipos profesionales.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué problema entre "Dev" y "Ops" busca resolver DevOps?
- [ ] ¿Por qué decimos que DevOps no es un cargo ni una sola herramienta?
- [ ] ¿Qué es el "ciclo de feedback" y por qué conviene que sea corto?

---

## 🧠 Lo que aprendiste

- **DevOps** une desarrollo y operaciones para entregar software rápido y confiable.
- Es **cultura + prácticas + herramientas** — no un cargo ni una sola herramienta.
- Su meta es acortar el **ciclo de feedback** mediante la **automatización** y la colaboración.
- En el básico ya practicaste DevOps (CI/CD, Docker); aquí lo llevas al nivel profesional.

---

**➡️ Siguiente:** [De dónde venimos](02-de-donde-venimos.md)
