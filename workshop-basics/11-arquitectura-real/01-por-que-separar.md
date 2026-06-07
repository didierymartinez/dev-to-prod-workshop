# Lección 11.1 — ¿Por qué separar y proteger?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás por qué en producción la base de datos vive aparte y oculta, y por qué hay un único punto de entrada. Lección de **conceptos**.

---

## 🤔 El problema

Tu sistema funciona, pero todo —la API y la base de datos— vive en una sola máquina que está expuesta a internet. Funciona para aprender, pero ninguna empresa seria dejaría así sus datos. Veamos por qué, y cómo se organiza de verdad.

---

## 💡 Conceptos

### El riesgo de tener todo junto y expuesto

Tu máquina pública tiene un puerto abierto a internet para que la gente use la app. Pero en esa misma máquina está la base de datos con información sensible (NITs, contactos, contratos). Si un atacante logra entrar por la parte pública, **la base de datos está ahí mismo, a su lado**. Es como guardar la caja fuerte en el mostrador de la tienda.

### La solución: separar en capas

La arquitectura profesional divide el sistema en **capas**, cada una con un nivel de exposición distinto:

```
        Internet
           │
           ▼
   ┌───────────────┐   Capa pública: lo ÚNICO expuesto a internet.
   │    Gateway    │   Recibe todo el tráfico y lo reparte.
   └───────┬───────┘
           │ red privada
           ▼
   ┌───────────────┐   Capa de aplicación: tu API. No habla con internet
   │      API      │   directamente; solo el gateway le pasa peticiones.
   └───────┬───────┘
           │ red privada
           ▼
   ┌───────────────┐   Capa de datos: la base de datos. Sin IP pública.
   │  Base de datos│   Solo la API puede alcanzarla, por la red privada.
   └───────────────┘
```

Cada capa solo habla con la siguiente, por una **red privada**. Si alguien vulnera el gateway, todavía le faltan dos puertas (y un firewall) para llegar a los datos.

### Red privada e IP privada

Las máquinas de tu sistema se comunican entre sí por **IPs privadas** (como `10.0.0.x`) que **no existen en internet**: solo son visibles dentro de tu red virtual en Azure. Una máquina **sin IP pública** es, literalmente, inalcanzable desde fuera — y ahí pondremos la base de datos.

### Principio de mínima exposición

La regla de oro: **exponer lo mínimo**. Solo el gateway necesita estar en internet. La API y la base de datos no — así que las dejamos privadas. Menos puertas abiertas = menos formas de atacar.

### El firewall: quién habla con quién

Aunque la base de datos esté en red privada, agregamos una regla de **firewall** que dice explícitamente: *"al puerto de la base de datos solo puede entrar la máquina de la aplicación"*. Es una segunda barrera (defensa en profundidad): aunque algo más entrara a la red, no podría tocar la base de datos.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué riesgo tiene guardar la base de datos en la misma máquina pública que la API?
- [ ] ¿Qué es una "red privada" y por qué una máquina sin IP pública es más segura?
- [ ] ¿Qué hace el gateway y por qué es el único que mira a internet?

---

## 🧠 Lo que aprendiste

- Tener todo junto y expuesto es un **riesgo de seguridad** y un punto único de entrada.
- La arquitectura en **capas** (gateway → app → datos) separa responsabilidades y niveles de exposición.
- Las capas internas se comunican por **red privada**; la base de datos va **sin IP pública**.
- **Mínima exposición** + **firewall** = defensa en profundidad.

---

**➡️ Siguiente:** [La base de datos en su propia máquina](02-base-de-datos-separada.md)
