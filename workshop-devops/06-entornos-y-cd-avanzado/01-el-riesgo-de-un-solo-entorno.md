# Lección 6.1 — El riesgo de un solo entorno

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué son los entornos **dev / staging / producción**, por qué no se prueba en producción, y qué significa **promover** un artefacto en vez de reconstruirlo. Lección de **conceptos**.

---

## 🤔 El problema

Mira tu flujo actual: haces `push` a `main`, el pipeline construye la imagen y la despliega… en la única máquina que tienes. Esa máquina, para tus usuarios, **es producción**. Eso significa que:

- Cada cambio se estrena **directo frente al usuario**. Si algo falla, lo descubren ellos.
- No tienes un lugar "igual a producción pero seguro" para probar un cambio arriesgado (una migración de BD, una versión nueva de PostgreSQL, un cambio de configuración).
- "Funciona en mi máquina" no garantiza que funcione con la infraestructura, la red y los datos reales.

Los equipos serios no apuestan así. Tienen **varios entornos** y **promueven** los cambios de uno a otro con control.

---

## 💡 Conceptos

### dev / staging / producción

| Entorno | Dónde | Para qué | Quién lo ve |
|---|---|---|---|
| **dev** (desarrollo) | tu máquina | escribir y probar rápido mientras programas | tú |
| **staging** | en la nube, **igual a prod** | probar el cambio en condiciones reales antes de soltarlo | el equipo |
| **producción** (prod) | en la nube | atender a los usuarios de verdad | tus usuarios |

- **dev** es tu portátil: ciclos rápidos, datos de mentira, sin miedo a romper.
- **staging** es la red de seguridad: una réplica de producción donde el cambio se prueba **de verdad** (misma infraestructura, misma configuración, integraciones reales). Lo que pasa el filtro de staging tiene muchísimas menos probabilidades de explotar en prod.
- **producción** es lo sagrado: ahí no se experimenta.

> 🧠 *"No pruebes en producción."* Staging existe justamente para atrapar lo que dev no puede ver: problemas de configuración real, de infraestructura, de integración. Es barato comparado con una caída frente a los usuarios.

### Paridad de entornos (12-factor, otra vez)

Para que staging sirva, tiene que **parecerse** a producción lo más posible. Si staging usa otra base de datos, otro sistema operativo u otra configuración, deja de ser una prueba fiable. Por eso usaremos **el mismo código de Terraform** y **el mismo `stack.yml`** para los dos: solo cambian unos pocos valores (tamaño de las VMs, nombres). Es el principio de **paridad dev/prod** del manifiesto 12-factor.

### Promover, no reconstruir

Aquí está la idea clave del CD avanzado:

```
   build (una vez)        deploy a staging        (aprobación)        deploy a producción
   imagen :abc123    ───►  la MISMA :abc123   ───►   ✅ tú   ───►   la MISMA :abc123
```

La imagen se **construye una sola vez** y se etiqueta con el identificador del commit (el `sha`). Esa **misma** imagen —el mismo artefacto, bit por bit— es la que se despliega a staging y, si pasa la prueba, la que se **promueve** a producción. No se reconstruye una imagen "para prod": eso introduciría diferencias. Promueves **exactamente** lo que probaste.

### La compuerta de aprobación

Entre staging y producción pones una **compuerta**: una persona (tú, un líder técnico, quien sea) tiene que **aprobar** el paso a prod. El pipeline llega hasta ahí y **espera**. Así, ningún cambio entra a producción sin que un humano diga "sí, adelante". Lo montarás con **GitHub Environments**.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué diferencia hay entre **staging** y **producción**? ¿Por qué no basta con dev?
- [ ] ¿Qué significa **paridad de entornos** y por qué importa para que staging sea útil?
- [ ] ¿Por qué se **promueve** la misma imagen en vez de reconstruir una para producción?
- [ ] ¿Para qué sirve una **compuerta de aprobación** entre staging y prod?

---

## 🧠 Lo que aprendiste

- **dev** (tu máquina) → **staging** (réplica de prod, red de seguridad) → **producción** (los usuarios). No se prueba en prod.
- **Paridad de entornos**: staging debe parecerse a prod (mismo IaC, misma config) para ser una prueba fiable.
- Se **promueve** el mismo artefacto (la imagen con el `sha`) de staging a prod; no se reconstruye.
- Una **compuerta de aprobación** (GitHub Environments) exige el visto bueno de un humano antes de tocar producción.

---

**➡️ Siguiente:** [Crear staging con Terraform](02-crear-staging-con-terraform.md)
