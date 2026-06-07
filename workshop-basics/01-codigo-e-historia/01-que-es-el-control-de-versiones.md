# Lección 1.1 — ¿Qué es el control de versiones?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué problema resuelve Git y por qué todos los equipos de software lo usan. Es una lección de **conceptos**: no escribirás comandos todavía.

---

## 🤔 El problema

Imagina esta situación, que le pasa a todo el mundo:

Trabajas en un documento importante. Lo guardas como `informe.docx`. Haces cambios y, por si acaso, guardas otra copia: `informe_v2.docx`. Luego `informe_v2_final.docx`. Después `informe_v2_final_ESTE_SI.docx`. Una semana más tarde:

- ¿Cuál era la versión buena?
- Borraste un párrafo hace tres días y ahora lo necesitas. ¿Dónde quedó?
- Un compañero también editó el archivo. ¿Cómo juntan los dos cambios sin pisarse?

Con código, este problema es **mucho** peor: un proyecto tiene decenas de archivos, varias personas tocándolos, y un cambio pequeño puede romper todo. Necesitas poder responder, en cualquier momento: *¿qué cambió, cuándo y quién lo hizo?* — y poder **volver atrás** si algo sale mal.

---

## 💡 Conceptos

### El control de versiones es una "máquina del tiempo" para tu proyecto

Un **sistema de control de versiones** guarda fotografías de todo tu proyecto a lo largo del tiempo. Cada vez que terminas un cambio que vale la pena, le tomas una foto. Después puedes:

- Ver la lista de todas las fotos, con su fecha y quién las tomó.
- Comparar dos fotos para ver exactamente qué cambió.
- **Volver** a cualquier foto anterior si algo se dañó.
- Juntar el trabajo de varias personas sin pisarse.

La herramienta que hace esto, y que usa prácticamente toda la industria, se llama **Git**.

### Tres palabras que vas a usar siempre

| Palabra | Qué significa | Analogía |
|---|---|---|
| **Repositorio** (repo) | La carpeta de tu proyecto, pero con memoria: Git registra su historia | Un álbum de fotos del proyecto |
| **Commit** | Una de esas fotografías: una versión guardada con fecha, autor y una nota | Una foto con su descripción |
| **Mensaje de commit** | La nota que explica *por qué* hiciste ese cambio | El pie de foto |

### Git no es lo mismo que GitHub

Esto confunde a todo el mundo al principio, así que aclarémoslo de una vez:

- **Git** es el programa que corre **en tu computador** y guarda la historia localmente.
- **GitHub** es un sitio **en internet** donde puedes subir esa historia para guardarla a salvo y compartirla con otros.

> Analogía: **Git** es la cámara con la que tomas las fotos. **GitHub** es la nube donde subes el álbum para que no se pierda y otros lo vean. Puedes usar Git sin GitHub, pero juntos son el estándar del trabajo en equipo.

### ¿Qué hace a un commit *bueno*?

Un commit no es solo guardar: es guardar **con una explicación clara**. Compara:

| Mensaje pobre 😕 | Mensaje útil 🙂 |
|---|---|
| `cambios` | `agregar listado de empresas` |
| `arreglo` | `corregir error cuando el archivo no existe` |
| `asdf` | `documentar cómo ejecutar el proyecto` |

El mensaje útil le habla a tu "yo" del futuro (y a tus compañeros) y dice **qué problema resuelve** ese cambio. Cuando algo falle dentro de seis meses, un buen historial te dirá exactamente dónde mirar.

---

## ✅ Compruébalo

No hay comandos en esta lección. Compruébalo respondiendo, en tus propias palabras (en voz alta o en tu libreta):

- [ ] ¿Qué problema resuelve el control de versiones? Da un ejemplo de tu propia vida (no tiene que ser de código).
- [ ] ¿Cuál es la diferencia entre Git y GitHub?
- [ ] ¿Qué es un *commit* y qué hace que un mensaje de commit sea bueno?

Si puedes explicar los tres sin volver a leer, entendiste lo esencial.

---

## 🧠 Lo que aprendiste

- El control de versiones es una **máquina del tiempo** para tu proyecto: guarda fotos (commits) que puedes consultar y revertir.
- **Git** vive en tu máquina; **GitHub** vive en internet. Juntos son el estándar de la industria.
- Un buen **mensaje de commit** explica *por qué* cambiaste algo, no solo *qué*.

---

**➡️ Siguiente:** [Tu primer repositorio](02-tu-primer-repositorio.md) — ahora sí, manos al teclado.
