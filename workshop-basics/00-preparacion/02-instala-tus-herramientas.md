# Lección 0.2 — Instala tus herramientas

> ⏱️ 40 minutos · 🎯 **Al terminar:** tendrás Git y VS Code instalados y verificados (lo mínimo para empezar), y sabrás cómo instalar el resto cuando llegue su fase.

---

## 🤔 El problema

Cada herramienta se instala distinto en Windows, macOS y Linux. Y peor: a veces crees que algo quedó instalado, pero no quedó bien, y lo descubres en mitad de una lección. Aquí instalamos **y verificamos** cada cosa, para que eso no te pase.

> Esta lección está organizada por sistema operativo. **Busca tu sistema** en cada paso y sigue solo esas instrucciones.

---

## 💡 Conceptos

### ¿Qué es una terminal?

La **terminal** (o "consola", o "línea de comandos") es una ventana donde le escribes órdenes al computador con texto, en lugar de hacer clic. Vas a usarla en todo el taller. Cada sistema trae la suya:

- **Windows:** se llama **PowerShell**. Búscala en el menú de inicio escribiendo "PowerShell".
- **macOS:** se llama **Terminal**. Está en Aplicaciones → Utilidades, o búscala con Spotlight (Cmd+Espacio → "Terminal").
- **Linux:** se llama **Terminal**. Normalmente con Ctrl+Alt+T.

> 🧠 **Cómo verificar que algo está instalado:** casi todas las herramientas responden a `--version`. Si escribes el nombre del programa seguido de `--version` y te muestra un número, está instalado. Si dice "no se reconoce el comando" o "command not found", no lo está (o hay que reabrir la terminal).

---

## 🛠️ Manos a la obra

### Paso 1: Instala Git

**Git** es la herramienta que guarda la historia de tu código. La usarás desde la Fase 1.

**🪟 Windows**
1. Ve a [git-scm.com/download/win](https://git-scm.com/download/win) y descarga el instalador.
2. Ejecútalo. Acepta todas las opciones por defecto (siguiente, siguiente…). Son las correctas.

**🍎 macOS**
1. Abre la Terminal y escribe `git --version`.
2. Si no lo tienes, macOS te ofrecerá instalar las "herramientas de desarrollador". Acepta. (Alternativa: instala [Homebrew](https://brew.sh) y luego `brew install git`.)

**🐧 Linux (Ubuntu/Debian)**
```bash
sudo apt update && sudo apt install -y git
```

**Verifica (en cualquier sistema):** abre una terminal **nueva** y escribe:
```bash
git --version
```
Debe responder algo como `git version 2.43.0`. El número exacto no importa.

---

### Paso 2: Instala Visual Studio Code

**VS Code** es el editor donde escribirás el código. Es gratuito y funciona igual en los tres sistemas.

1. Ve a [code.visualstudio.com](https://code.visualstudio.com) y descarga la versión para tu sistema.
2. Instálalo con las opciones por defecto.
   - **🪟 Windows:** durante la instalación, **marca la casilla** "Agregar a PATH" y "Abrir con Code" — te facilitan la vida después.
3. Ábrelo una vez para confirmar que arranca.

**Instala dos extensiones** (icono de cuadritos en la barra izquierda de VS Code, o Ctrl+Shift+X):
- Busca **"C# Dev Kit"** e instálala (la necesitarás desde la Fase 2).
- Busca **"Live Server"** e instálala (la necesitarás en la Fase 5).

---

### Paso 3: Lo demás, cuando llegue su fase

Estas herramientas **no las necesitas todavía**. Cada fase te recuerda instalarlas. Si prefieres dejar todo listo de una vez, aquí están los enlaces; si no, sigue adelante y vuelve después.

| Herramienta | Cuándo | Dónde conseguirla |
|---|---|---|
| **.NET SDK 8** | Fase 2 | [dot.net/download](https://dotnet.microsoft.com/download/dotnet/8.0) — elige "SDK", no "Runtime" |
| **Postman** | Fase 3 | [postman.com/downloads](https://www.postman.com/downloads/) |
| **Docker Desktop** | Fase 6 | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Azure CLI** | Fase 9 | [aka.ms/installazurecli](https://aka.ms/installazurecli) |

> 💡 **Sobre .NET:** asegúrate de descargar el **SDK** (incluye todo lo necesario para *crear* programas), no solo el "Runtime" (que solo sirve para *ejecutarlos*). En la Fase 2 lo verificamos.

---

## ✅ Compruébalo

Abre una terminal **nueva** (importante: nueva, para que reconozca lo recién instalado) y ejecuta:

```bash
git --version
```

- [ ] `git --version` muestra un número de versión.
- [ ] VS Code abre correctamente.
- [ ] En VS Code aparecen instaladas las extensiones "C# Dev Kit" y "Live Server".

Si los tres están ✅, estás listo para la Fase 1. (.NET, Postman, Docker y Azure los verificaremos cuando lleguen.)

---

## 🧠 Lo que aprendiste

- Qué es la terminal y cómo se llama en tu sistema.
- Cómo instalar Git y VS Code, y cómo **verificar** una instalación con `--version`.
- Qué herramientas faltan y en qué fase las necesitarás.

---

## 🆘 Si algo salió mal

**`git --version` dice "command not found" o "no se reconoce".**
Cierra **todas** las terminales y abre una nueva. Los programas recién instalados solo aparecen en terminales abiertas *después* de instalarlos. Si persiste en Windows, reinicia el computador (a veces el PATH necesita reiniciar sesión).

**El instalador de Windows me pidió "reiniciar" — ¿es necesario?**
Sí, hazlo. Algunas herramientas necesitan reiniciar para quedar disponibles en la terminal.

**No sé si tengo Windows de 64 bits o ARM, etc.**
La mayoría de instaladores detectan tu sistema automáticamente y te ofrecen la versión correcta. Descarga la opción que te resalten por defecto.

---

**➡️ Siguiente:** [La terminal: lo esencial](03-la-terminal-lo-esencial.md)
