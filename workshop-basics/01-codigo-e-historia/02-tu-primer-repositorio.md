# Lección 1.2 — Tu primer repositorio

> ⏱️ 35 minutos · 🎯 **Al terminar:** habrás creado tu primer repositorio Git, guardado dos commits y visto la historia de tu proyecto. Empezaremos el proyecto que nos acompañará todo el taller: un sistema de **gestión de empresas clientes**.

---

## 🤔 El problema

En la lección anterior entendiste *por qué* existe Git. Ahora vas a usarlo por primera vez. La meta no es construir algo complejo, sino aprender el **ciclo básico de Git** con un ejemplo muy simple: crear un proyecto, hacer un cambio, y guardarlo con su historia.

---

## 💡 Conceptos

### El ciclo de Git en tres pasos

Cada vez que quieras guardar una "fotografía" (commit) de tu trabajo, haces siempre lo mismo:

```
1. Modificas archivos          (trabajas normal)
2. git add                     ("prepara estos cambios para la foto")
3. git commit                  ("toma la foto, con esta nota")
```

El paso 2 puede parecer raro ("¿por qué no toma la foto directo?"). La razón: a veces cambias 5 archivos pero solo quieres guardar 2 en esta foto. `git add` te deja **elegir** qué entra en cada commit. Por ahora agregaremos todo.

### Qué proyecto vamos a construir

A lo largo del taller construirás un **sistema de gestión de empresas clientes**: la aplicación con la que una empresa de software administra a las organizaciones que contratan sus servicios (su nombre, su NIT, el plan que pagan, si están activas).

Hoy empieza de la forma más humilde posible: una carpeta con una nota de texto. Crecerá lección a lección.

---

## 🛠️ Manos a la obra

### Paso 1: Presentarte ante Git (solo la primera vez en tu computador)

Git pone tu nombre en cada commit (recuerda: las fotos dicen quién las tomó). Dile quién eres. Abre la terminal y escribe, reemplazando con tus datos:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@correo.com"
```

- `git config` cambia la configuración de Git.
- `--global` significa "para todos mis proyectos en este computador", no solo uno.

Esto se hace **una sola vez**. Verifica que quedó:

```bash
git config --global user.name
```
Debe imprimir tu nombre.

### Paso 2: Crear la carpeta del proyecto

Ve a tu carpeta `taller` (la de la Fase 0) y crea dentro la carpeta del proyecto:

```bash
cd taller                  # (ajusta la ruta hasta tu carpeta taller)
mkdir gestion-empresas     # crea la carpeta del proyecto
cd gestion-empresas        # entra en ella
```

Ábrela en el editor para trabajar cómodo:
```bash
code .
```

### Paso 3: Convertir la carpeta en un repositorio (`git init`)

Ahora mismo `gestion-empresas` es una carpeta normal. Vamos a darle memoria:

```bash
git init
```

`init` viene de *initialize* (inicializar). Este comando le dice a Git: *"empieza a vigilar esta carpeta y a recordar su historia"*. A partir de ahora, Git observa todo lo que pase aquí.

Verás un mensaje como `Initialized empty Git repository...`. No notarás nada visible: Git creó una carpeta oculta llamada `.git` donde guardará la historia. **No la toques** — es el cerebro de Git.

### Paso 4: Crear el primer archivo

Vamos a crear un archivo que describa el proyecto. Estos archivos se llaman `README` (léeme) y son lo primero que alguien ve al llegar a un proyecto.

En VS Code: clic derecho en el panel de archivos → **New File** → nómbralo `README.md`. Escribe dentro:

```markdown
# Gestión de Empresas

Sistema para administrar las empresas clientes de la plataforma:
su NIT, razón social, plan contratado y estado (activa o inactiva).

## Estado del proyecto

- [ ] Listar empresas
- [ ] API para otros módulos
- [ ] Base de datos
```

Guarda el archivo (Ctrl+S / Cmd+S).

> 💡 La extensión `.md` es **Markdown**, una forma sencilla de dar formato a texto con símbolos: `#` hace un título, `- [ ]` hace una casilla. GitHub lo muestra bonito automáticamente.

### Paso 5: Ver qué nota Git (`git status`)

Antes de guardar, preguntémosle a Git qué está viendo:

```bash
git status
```

Te dirá que hay un archivo "untracked" (sin seguimiento): tu `README.md`. Significa: *"veo este archivo nuevo, pero todavía no me has dicho que lo guarde"*.

> 🧠 `git status` es el comando que más vas a usar. Cuando tengas dudas de en qué estado están las cosas, **pregúntale a Git** con `git status`. Siempre te orienta.

### Paso 6: Preparar y guardar la primera foto (`git add` + `git commit`)

Prepara el archivo para la foto:

```bash
git add README.md
```

Esto pone el `README.md` en el "área de preparación" (los archivos listos para la próxima foto). Si vuelves a correr `git status`, ahora el archivo aparece en verde: listo para guardarse.

Ahora toma la foto, con su nota:

```bash
git commit -m "agregar README con la descripción del proyecto"
```

- `commit` toma la fotografía.
- `-m` introduce el **mensaje** (la nota), entre comillas.

¡Felicitaciones! Acabas de hacer tu primer commit. 🎉

### Paso 7: Hacer un segundo cambio y guardarlo

Para ver el ciclo completo, hagamos otro cambio. En el `README.md`, marca la primera casilla como hecha (cambia `- [ ]` por `- [x]` en "Listar empresas") y guarda.

Repite el ciclo:

```bash
git status                          # Git ve que README.md cambió
git add README.md                   # lo preparas
git commit -m "marcar listado de empresas como planeado"
```

### Paso 8: Ver la historia (`git log`)

Mira las dos fotos que llevas:

```bash
git log --oneline
```

`log` muestra la historia de commits. `--oneline` la resume a una línea por commit. Verás algo como:

```
a3f9d12 marcar listado de empresas como planeado
7b2e1a9 agregar README con la descripción del proyecto
```

Esa es la **historia de tu proyecto**: dos momentos en el tiempo, cada uno con su explicación. Eso es exactamente lo que te faltaba con los archivos `_final_v2`.

---

## ✅ Compruébalo

```bash
git log --oneline
```

- [ ] `git log --oneline` muestra **dos** commits con tus mensajes.
- [ ] `git status` dice "nothing to commit, working tree clean" (no hay cambios pendientes).
- [ ] Puedes explicar qué hace cada uno: `git add` (preparar) y `git commit` (guardar la foto).

Si ves tus dos commits y el árbol está limpio, completaste el ciclo de Git.

---

## 🧠 Lo que aprendiste

| Comando | Qué hace |
|---|---|
| `git config --global user.name/email` | Te presenta ante Git (una sola vez) |
| `git init` | Convierte una carpeta en repositorio (le da memoria) |
| `git status` | Muestra qué cambios hay y en qué estado están |
| `git add archivo` | Prepara un archivo para el próximo commit |
| `git commit -m "mensaje"` | Guarda una fotografía con su explicación |
| `git log --oneline` | Muestra la historia de commits |

El ciclo, siempre: **modificar → `add` → `commit`**.

---

## 🆘 Si algo salió mal

**`git commit` abrió un editor de texto raro en pantalla completa.**
Olvidaste el `-m "mensaje"`. Git abrió su editor para que escribas el mensaje ahí. Si es el editor `vim`, escribe `:q` y Enter para salir, y vuelve a hacer el commit con `-m "tu mensaje"`.

**`git init` dice que ya hay un repositorio.**
No pasa nada: ya estaba inicializado. Continúa con el siguiente paso.

**`git add` dice "pathspec ... did not match".**
Revisa que escribiste bien el nombre del archivo y que estás en la carpeta correcta (`pwd` para confirmar, `ls` para ver que el archivo existe ahí).

**Hice un commit con un mensaje mal escrito.**
Si fue el último commit y aún no lo subiste a internet, puedes corregir el mensaje con: `git commit --amend -m "mensaje corregido"`.

---

**➡️ Siguiente:** [Conectar con GitHub](03-conectar-con-github.md)
