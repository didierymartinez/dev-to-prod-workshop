# Lección 9.1 — ¿Qué es un servidor en la nube?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es un servidor, qué significa "la nube" y por qué vas a alquilar una máquina virtual en vez de comprar un computador. Lección de **conceptos**.

---

## 🤔 El problema

Toda tu aplicación vive en `localhost` — tu propia máquina. Si cierras el portátil, nadie puede usarla. Para que esté disponible **siempre** y para **cualquiera**, tiene que vivir en un computador que nunca se apaga y que esté en internet: un **servidor**.

---

## 💡 Conceptos

### Qué es un servidor

Un **servidor** es, simplemente, un computador encendido todo el tiempo, conectado a internet, cuyo trabajo es **responder peticiones** (las de tu API, por ejemplo). No tiene pantalla ni teclado: lo manejas de forma remota.

### Qué es "la nube"

"La nube" no es nada mágico: son **centros de datos** (edificios llenos de servidores) de empresas como Microsoft (Azure), Amazon (AWS) o Google. En vez de comprar un computador físico y tenerlo en tu casa, **alquilas** uno de esos servidores por horas. Pagas solo por lo que usas y lo puedes apagar cuando quieras.

### Máquina virtual (VM)

No alquilas un computador físico entero: alquilas una **máquina virtual (VM)** — una "porción" de un servidor real que se comporta como un computador independiente, con su propio sistema operativo. Puedes crear una en minutos y destruirla cuando termines.

```
   Servidor físico real (en un centro de datos de Azure)
   ┌───────────────────────────────────────────────┐
   │   VM        VM        VM        VM   ...        │
   │  (tuya)   (otro)    (otro)    (otro)            │
   └───────────────────────────────────────────────┘
        ▲
        └── tú alquilas y administras solo esta
```

### IaaS, PaaS, SaaS (en una frase cada uno)

Verás estas siglas; esta es la idea, sin profundizar:

- **IaaS** (Infraestructura como servicio): te dan la **máquina** y tú instalas todo. Es lo que usaremos: una VM donde pones Docker y tu app. Máximo control.
- **PaaS** (Plataforma como servicio): te dan un entorno donde solo subes tu código y la plataforma se encarga del servidor. Menos control, más comodidad.
- **SaaS** (Software como servicio): software ya hecho que usas por internet (Gmail, el propio GitHub). No administras nada.

> 🧠 Usaremos **IaaS** (una VM) porque es la mejor forma de **entender** qué pasa en un servidor: lo verás y tocarás todo. En tu carrera, según el caso, elegirás entre dar más control (IaaS) o más comodidad (PaaS).

### Cómo lo administras: SSH

Como el servidor no tiene pantalla, te conectas a él de forma remota por **SSH** (Secure Shell): una conexión segura que te da una terminal **dentro** del servidor, como si estuvieras sentado frente a él. Lo usarás en la próxima lección.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué es un servidor y en qué se diferencia de tu portátil?
- [ ] ¿Qué significa "alquilar una máquina virtual en la nube"?
- [ ] ¿Por qué usaremos una VM (IaaS) en este taller en vez de una opción más cómoda (PaaS)?

> 🚦 **Cómo te fue:** 🟢 lo entendí y puedo explicarlo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Un **servidor** es un computador siempre encendido y en internet que responde peticiones.
- "La nube" es alquilar servidores ajenos por horas; alquilas una **máquina virtual (VM)**.
- **IaaS** (la VM) da control total y es ideal para aprender; **PaaS**/**SaaS** dan más comodidad y menos control.
- Al servidor te conectas de forma remota por **SSH**.

---

**➡️ Siguiente:** [Crear tu máquina en Azure y entrar por SSH](02-crear-vm-y-ssh.md)
