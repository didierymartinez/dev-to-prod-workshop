# Lección 1.3 — Conectar con GitHub

> ⏱️ 30 minutos · 🎯 **Al terminar:** tu proyecto vivirá también en internet (GitHub), a salvo y listo para compartir. Lo harás desde VS Code, sin pelear con comandos.

---

## 🤔 El problema

Tus commits hasta ahora viven **solo en tu computador**. Si el disco se daña, si pierdes el portátil, o si quieres trabajar desde otra máquina, no hay forma de recuperarlos. Y nadie más puede ver ni colaborar en tu código.

Necesitas una copia en internet. Para eso existe **GitHub**.

---

## 💡 Conceptos

### Local y remoto

- Tu repositorio **local** es el que está en tu carpeta (lo creaste con `git init`).
- Un repositorio **remoto** es una copia en un servidor de internet. El más popular es **GitHub**.

Tú trabajas en local y, cuando quieres, **sincronizas** con el remoto:

| Acción | Qué hace | Palabra técnica |
|---|---|---|
| Subir tus commits al remoto | Empuja tu trabajo a GitHub | **push** |
| Bajar cambios del remoto | Trae lo que haya nuevo en GitHub | **pull** |

> 💡 **Buenas noticias:** VS Code hace todo esto con botones. Aprenderás los nombres (`push`, `pull`) porque los verás en todas partes, pero rara vez tendrás que escribirlos.

---

## 🛠️ Manos a la obra

### Paso 1: Crear una cuenta en GitHub

Si no tienes una, ve a [github.com](https://github.com) y regístrate (es gratis). Usa un correo y un nombre de usuario profesionales: este perfil es parte de tu carta de presentación como desarrollador.

### Paso 2: Publicar tu proyecto desde VS Code

Abre tu proyecto `gestion-empresas` en VS Code (`code .` desde su carpeta, o Archivo → Abrir carpeta).

1. En la barra de la izquierda, haz clic en el icono de **Source Control** (parece una bifurcación de ramas, o pulsa `Ctrl+Shift+G`).
2. Verás un botón azul: **"Publish to GitHub"** (Publicar en GitHub).
3. La primera vez, VS Code te pedirá **iniciar sesión en GitHub**. Acepta; se abrirá el navegador para autorizar. Confirma y vuelve a VS Code.
4. VS Code te preguntará si publicar como repositorio **privado** o público. Elige **"Publish to GitHub private repository"** (privado: es buena costumbre no exponer todo al mundo por defecto).

Eso es todo. VS Code creó el repositorio en GitHub y subió tus commits.

> 🧠 **¿Qué hizo VS Code "bajo el capó"?** Lo mismo que harías con estos comandos — te los muestro solo para que reconozcas qué pasó, **no necesitas escribirlos**:
> ```bash
> git remote add origin https://github.com/TU_USUARIO/gestion-empresas.git
> git push -u origin main
> ```
> `remote add origin` registra la dirección del repositorio remoto (lo apoda `origin`). `push` sube tus commits.

### Paso 3: Verlo en GitHub

Abre tu navegador en `github.com/TU_USUARIO/gestion-empresas`. Deberías ver:
- Tu `README.md` mostrado con formato bonito en la página principal.
- Una pestaña **Commits** con los dos commits que hiciste en la lección anterior, con tu nombre y la fecha.

### Paso 4: Hacer un cambio y sincronizarlo

Veamos el flujo completo de trabajo diario. En el `README.md`, agrega una línea al final:

```markdown

## Equipo

- Tú (desarrollador)
```

Guarda. Ahora en VS Code:
1. Ve a **Source Control**. Verás `README.md` en la lista de cambios.
2. Escribe un mensaje en la casilla de arriba: `documentar la sección de equipo`.
3. Pulsa el botón **✓ Commit**. (Si te pregunta por "Stage", acepta guardar todo.)
4. Pulsa **Sync Changes** (o la flechita ↑) para subirlo a GitHub.

Recarga la página de GitHub: tu cambio ya está ahí.

> 🧠 En VS Code, **Commit** guarda la foto localmente y **Sync / push** la sube. Son los dos pasos que ya conoces, ahora con botones.

---

## ✅ Compruébalo

- [ ] Tu repositorio `gestion-empresas` aparece en tu cuenta de GitHub.
- [ ] El `README.md` se ve con formato en la página principal del repo.
- [ ] El cambio de la sección "Equipo" aparece en GitHub después de sincronizar.
- [ ] Puedes explicar qué es un *remoto* y qué hacen *push* y *pull*.

---

## 🧠 Lo que aprendiste

- **GitHub** es la copia de tu proyecto en internet: respaldo + base para colaborar.
- **push** sube tus commits; **pull** baja los de otros.
- VS Code hace todo con botones: **Publish to GitHub**, **Commit**, **Sync Changes**.

---

## 🆘 Si algo salió mal

**No aparece "Publish to GitHub", solo "Publish Branch".**
Significa que VS Code no está conectado a tu cuenta. Ve al icono de la cuenta (abajo a la izquierda) → inicia sesión en GitHub, y reintenta.

**Me pide usuario y contraseña al hacer push y la contraseña no funciona.**
GitHub ya no acepta tu contraseña normal para esto. La forma fácil es dejar que VS Code maneje el inicio de sesión (como en el Paso 2). Si insistes en la terminal, necesitarás un "token" — pero no hace falta para este taller.

**Subí sin querer algo que no debía.**
Por eso en la Fase 2 crearemos un archivo `.gitignore` que le dice a Git qué nunca subir (archivos compilados, contraseñas). Por ahora, en este proyecto de solo texto, no hay riesgo.

---

**➡️ Siguiente:** [Ramas y Pull Requests](04-ramas-y-pull-requests.md)
