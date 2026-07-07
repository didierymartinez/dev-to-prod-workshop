# Lección 1.4 — Ramas y Pull Requests

> ⏱️ 35 minutos · 🎯 **Al terminar:** sabrás trabajar como en un equipo real: crear una rama para tu cambio, proponerlo con un Pull Request y fusionarlo. Es la forma en que se trabaja en *toda* empresa de software.

---

## 🤔 El problema

Hasta ahora has hecho cambios directamente sobre la línea principal del proyecto (llamada `main`). Eso funciona cuando trabajas solo en algo pequeño. Pero en un equipo:

- Si todos cambian `main` al mismo tiempo, se pisan unos a otros.
- Un cambio a medio terminar puede romper lo que ya funcionaba para los demás.
- Nadie revisa el código antes de que entre.

La solución que usa la industria entera: **nadie toca `main` directamente**. Cada cambio se hace aparte y se revisa antes de unirlo.

---

## 💡 Conceptos

### Rama (branch)

Una **rama** es una línea de trabajo paralela. Imagina que `main` es el tronco de un árbol; cuando vas a hacer un cambio, creas una **rama** que sale del tronco, trabajas ahí tranquilo, y cuando está listo y revisado, la unes de vuelta al tronco.

```
main:    ●─────●─────●──────────────●   (siempre estable)
                       \            /
rama:                   ●────●────●      (aquí experimentas)
```

Mientras trabajas en tu rama, `main` queda intacto. Si algo sale mal, descartas la rama y `main` ni se enteró.

### Pull Request (PR)

Cuando tu rama está lista, abres un **Pull Request**: una propuesta que dice *"quiero unir mi rama a `main`, ¿lo revisan?"*. El equipo lo revisa, comenta, y si está bien, lo **fusiona** (merge). En la Fase 7 verás que el PR también puede correr las pruebas automáticamente antes de permitir la fusión.

> 🧠 Aunque trabajes solo, usar ramas y PRs es buena práctica: te obliga a revisar tu propio cambio antes de meterlo, y deja un registro de *por qué* entró cada cosa.

---

## 🛠️ Manos a la obra

### Paso 1: Crear una rama desde VS Code

Abre `gestion-empresas` en VS Code. Mira la **esquina inferior izquierda**: verás el nombre de la rama actual (`main`) junto a un icono de ramas.

1. Haz clic en ese nombre (`main`).
2. En el menú que aparece arriba, elige **"Create new branch..."** (Crear rama nueva).
3. Nómbrala: `docs/agregar-objetivos`. Pulsa Enter.

Listo: ahora estás trabajando en la rama `docs/agregar-objetivos`. La esquina inferior izquierda ahora muestra ese nombre.

> 💡 **Convención de nombres de rama:** se usa un prefijo que indica el tipo de trabajo: `feat/` para funcionalidades, `fix/` para correcciones, `docs/` para documentación. Ej: `feat/listar-empresas`.
>
> 🧠 El comando equivalente (no necesitas escribirlo) sería: `git checkout -b docs/agregar-objetivos`.

### Paso 2: Hacer el cambio en la rama

En el `README.md`, agrega una sección de objetivos al final:

```markdown

## Objetivos del proyecto

Construir el sistema completo de gestión de empresas clientes:
desde el listado hasta una aplicación web desplegada en internet.
```

Guarda. Ve a **Source Control**, escribe el mensaje `documentar los objetivos del proyecto`, y pulsa **✓ Commit**.

### Paso 3: Subir la rama a GitHub

Pulsa **"Publish Branch"** (Publicar rama) en Source Control. Esto sube tu rama nueva a GitHub (sin tocar `main` todavía).

### Paso 4: Abrir el Pull Request

Ve a tu repositorio en github.com. Verás un aviso amarillo: *"docs/agregar-objetivos had recent pushes"* con un botón **"Compare & pull request"**. Haz clic.

1. Verás un título (puedes dejar el del commit) y una caja para describir el cambio. Escribe brevemente qué hiciste y por qué.
2. Pulsa **"Create pull request"**.

Ahora estás viendo el PR: GitHub te muestra **exactamente qué líneas cambiaron** (en verde lo agregado). Así es como un equipo revisa el trabajo antes de aceptarlo.

### Paso 5: Fusionar y limpiar

Como eres el único en este proyecto, revísalo tú mismo y:
1. Pulsa **"Merge pull request"** → **"Confirm merge"**. Tu cambio ya es parte de `main`.
2. GitHub ofrece **"Delete branch"**: acepta. La rama ya cumplió su función.

### Paso 6: Actualizar tu copia local

Ojo a este paso — aquí está la confusión más común. La fusión ocurrió **en GitHub** (el remoto), así que ahora **el remoto va adelante** y tu `main` local está atrasado: le falta la fusión.

> 🔮 **Predice, luego mira.** Antes de sincronizar: *cuando pulses "Sync", ¿en qué dirección viajará la información — tu local subirá a GitHub, o GitHub bajará a tu local?* (Piensa: ¿dónde está el cambio que falta?)

1. En VS Code, vuelve a la rama `main`: clic en el nombre de la rama (abajo a la izquierda) → elige `main`.
2. Pulsa **Sync Changes** (la flechita).

La respuesta: esta vez "Sync" **baja** (pull) la fusión desde GitHub a tu local — **remoto ▶ local**, la dirección contraria a cuando subiste tus commits. Ese es el sentido de "sincronizar": no es "mandar lo mío", es **poner ambos lados de acuerdo**, en la dirección que haga falta. (Es justo lo que confunde a mucha gente: creer que sincronizar siempre sube.)

> 🧠 Acabas de completar el flujo profesional: **rama → cambio → PR → revisión → merge → actualizar**. Lo repetirás en cada lección de aquí en adelante.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Creaste una rama, hiciste un commit en ella y la publicaste.
- [ ] Abriste un Pull Request y viste el resaltado de líneas cambiadas.
- [ ] Fusionaste el PR y tu `main` local ya incluye el cambio.

**Que entendiste:**
- [ ] Puedes explicar para qué sirve una rama y qué es un Pull Request.
- [ ] En el Paso 6, tu predicción de la dirección del "Sync" (remoto ▶ local) coincidió — y entiendes por qué esta vez fue de bajada.

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó / me perdí con las ramas o la dirección · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una **rama** es una línea de trabajo paralela que protege a `main`.
- Un **Pull Request** propone unir tu rama a `main` y permite revisar el cambio.
- El flujo de todo equipo: **rama → commit → push → PR → merge**.
- VS Code lo maneja desde la esquina inferior izquierda (ramas) y el panel Source Control.

---

## 🆘 Si algo salió mal

**Hice el cambio pero seguía en `main`, no en la rama.**
Pasa. Si aún no lo subiste: crea la rama ahora (VS Code la crea llevándose tus cambios actuales) y commitea ahí. `main` no se afecta hasta que hagas push.

**No veo el botón "Compare & pull request" en GitHub.**
Ve a la pestaña **"Pull requests"** del repo → **"New pull request"** → elige tu rama como origen y `main` como destino.

**Después de fusionar, mi VS Code sigue mostrando la rama vieja.**
Cambia a `main` desde la esquina inferior izquierda y pulsa Sync. La rama borrada en GitHub puede seguir apareciendo localmente; no afecta.

---

**➡️ Siguiente fase:** [Fase 2 — Tu primer programa](../02-tu-primer-programa/README.md)
