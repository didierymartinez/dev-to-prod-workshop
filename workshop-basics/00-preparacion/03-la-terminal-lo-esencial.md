# Lección 0.3 — La terminal: lo esencial

> ⏱️ 30 minutos · 🎯 **Al terminar:** podrás moverte entre carpetas, crear y ver archivos desde la terminal, sin miedo y sin depender del mouse.

---

## 🤔 El problema

En todo el taller le darás órdenes al computador escribiendo en la terminal. No necesitas ser experto, pero sí manejar con confianza un puñado de comandos. Si los dominas ahora, el resto del taller fluye. Si no, cada lección se sentirá cuesta arriba.

---

## 💡 Conceptos

### La terminal siempre está "parada" en una carpeta

En cada momento, la terminal está "dentro" de una carpeta, llamada el **directorio actual**. Los comandos que escribes actúan sobre esa carpeta. Moverte entre carpetas es como abrir y cerrar carpetas en el explorador, pero con texto.

### Buena noticia: los comandos básicos son casi iguales en los tres sistemas

PowerShell (Windows) entiende muchos de los mismos comandos que macOS y Linux (`cd`, `ls`, `pwd`, `mkdir`…). Donde haya una diferencia, te la señalo.

---

## 🛠️ Manos a la obra

Abre tu terminal (PowerShell en Windows, Terminal en macOS/Linux) y prueba cada comando. La idea es que los **escribas**, no solo los leas.

### Paso 1: ¿Dónde estoy? (`pwd`)

```bash
pwd
```
`pwd` significa *print working directory*. Te muestra la ruta de la carpeta donde estás parado ahora mismo.

### Paso 2: ¿Qué hay aquí? (`ls`)

```bash
ls
```
Lista los archivos y carpetas del directorio actual.

> 🪟 **Windows:** `ls` funciona en PowerShell. Si por alguna razón no, usa `dir` (hace lo mismo).

### Paso 3: Moverme entre carpetas (`cd`)

```bash
cd Documents        # entra a la carpeta Documents
pwd                 # confirma que ahora estás dentro
cd ..               # sube un nivel (a la carpeta que contiene la actual)
```
`cd` significa *change directory*. El `cd ..` (con dos puntos) es muy útil: significa "sube a la carpeta de arriba".

> 💡 **Truco que ahorra errores:** escribe `cd ` y luego **arrastra** una carpeta desde el explorador hasta la terminal. Se pega la ruta completa sola.

### Paso 4: Crear una carpeta (`mkdir`)

Navega hasta donde creaste la carpeta `taller` en la Lección 0.1 y entra en ella:

```bash
cd taller           # (ajusta la ruta hasta donde la creaste)
mkdir practica      # crea una carpeta nueva llamada "practica"
cd practica         # entra en ella
```

### Paso 5: Crear y ver un archivo

Crea un archivo de texto y escribe algo dentro:

**🪟 Windows (PowerShell)**
```powershell
"hola terminal" > nota.txt
```

**🍎 macOS / 🐧 Linux**
```bash
echo "hola terminal" > nota.txt
```

Ahora muestra su contenido (igual en los tres sistemas):
```bash
cat nota.txt        # debe imprimir: hola terminal
```

### Paso 6: Abrir la carpeta actual en VS Code

Este comando lo usarás muchísimo: abre el editor en la carpeta donde estás.

```bash
code .
```
El `.` significa "la carpeta actual". Si no funciona, vuelve a la Lección 0.2 (en Windows, reinstala VS Code marcando "Agregar a PATH").

### Paso 7: Limpia la práctica

```bash
cd ..               # sal de la carpeta practica
```
Puedes borrar la carpeta `practica` desde el explorador. Ya cumplió su propósito.

---

## ✅ Compruébalo

Sin mirar las instrucciones, intenta hacer esto de corrido:

- [ ] Saber en qué carpeta estás (`pwd`).
- [ ] Listar lo que contiene (`ls`).
- [ ] Entrar a una carpeta y volver a salir (`cd carpeta`, `cd ..`).
- [ ] Crear una carpeta (`mkdir`).
- [ ] Abrir VS Code en la carpeta actual (`code .`).

Si puedes hacer los cinco sin consultar, dominaste lo que necesitas. El resto lo aprenderás sobre la marcha.

---

## 🧠 Lo que aprendiste

| Comando | Qué hace |
|---|---|
| `pwd` | Muestra en qué carpeta estás |
| `ls` | Lista archivos y carpetas |
| `cd carpeta` | Entra a una carpeta |
| `cd ..` | Sube un nivel |
| `mkdir nombre` | Crea una carpeta |
| `cat archivo` | Muestra el contenido de un archivo |
| `code .` | Abre VS Code en la carpeta actual |

---

## 🆘 Si algo salió mal

**`code .` no hace nada o da error.**
VS Code no quedó en el PATH. En Windows, reinstálalo marcando "Add to PATH". En macOS, abre VS Code → Cmd+Shift+P → escribe "shell command" → "Install 'code' command in PATH".

**Escribí mal una ruta y dice "no such file or directory".**
Revisa mayúsculas y espacios. Usa el truco de arrastrar la carpeta a la terminal para evitar errores de tipeo.

**Me perdí, no sé en qué carpeta estoy.**
Escribe `pwd` para ubicarte, o `cd ~` (macOS/Linux) / `cd ~` (PowerShell también funciona) para volver a tu carpeta personal y empezar de nuevo.

---

**➡️ Siguiente fase:** [Fase 1 — El código y su historia](../01-codigo-e-historia/README.md)
