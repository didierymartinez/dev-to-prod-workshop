# Lección 2.2 — Tu primera aplicación de consola

> ⏱️ 35 minutos · 🎯 **Al terminar:** habrás instalado .NET, creado un proyecto, y entendido la diferencia práctica entre compilar (`build`) y ejecutar (`run`).

---

## 🤔 El problema

Toda la teoría de la lección anterior se vuelve real cuando ves tu propio programa imprimir algo en pantalla. Vamos a crear el proyecto base de la aplicación y a correrlo por primera vez.

---

## 💡 Conceptos

### Un proyecto .NET es una carpeta con una estructura

Cuando creas un proyecto, .NET genera una carpeta con:
- Un archivo `.csproj` (la "ficha técnica" del proyecto: qué tipo es, qué versión de .NET usa).
- Un archivo `Program.cs` (donde empieza tu código).

No tienes que crear eso a mano: el comando `dotnet new` lo arma por ti.

---

## 🛠️ Manos a la obra

### Paso 1: Instalar y verificar el SDK de .NET

Si no lo instalaste en la Fase 0:
1. Ve a [dot.net/download](https://dotnet.microsoft.com/download/dotnet/8.0).
2. Descarga el **SDK** (no el Runtime) versión **8**, para tu sistema operativo.
3. Instálalo con las opciones por defecto.

Abre una terminal **nueva** y verifica:
```bash
dotnet --version
```
Debe mostrar un número que empieza por `8.` (por ejemplo `8.0.404`). Si lo ves, .NET está listo.

### Paso 2: Crear el proyecto de consola

Abre tu proyecto en la terminal: ve a la carpeta `gestion-empresas` (la que versionaste en la Fase 1).

```bash
cd gestion-empresas      # ajusta la ruta hasta tu proyecto
```

Crea la aplicación de consola dentro de una carpeta `src` (donde guardaremos el código fuente):

```bash
dotnet new console -n GestionEmpresas.Consola -o src/GestionEmpresas.Consola
```

Desglose del comando:
- `dotnet new console` → crea un proyecto del tipo "aplicación de consola".
- `-n GestionEmpresas.Consola` → el **nombre** del proyecto.
- `-o src/GestionEmpresas.Consola` → la carpeta de **salida** donde se crea.

> 💡 `GestionEmpresas.Consola` es el nombre del proyecto. El punto es solo una convención para agrupar nombres; no es una carpeta dentro de otra.

### Paso 3: Mirar lo que se creó

Abre el proyecto en VS Code (`code .`) y mira la carpeta `src/GestionEmpresas.Consola`. Verás:
- `GestionEmpresas.Consola.csproj` → la ficha técnica.
- `Program.cs` → tu código. Ábrelo: ya trae una línea que imprime "Hello, World!".

### Paso 4: Ejecutarlo (`dotnet run`)

En la terminal, entra a la carpeta del proyecto y córrelo:

```bash
cd src/GestionEmpresas.Consola
dotnet run
```

> 🔮 **Predice, luego corre.** Antes de mirar: abriste `Program.cs` y viste una línea que imprime "Hello, World!". *¿Qué crees que aparecerá en pantalla al correr?* Ahora ejecútalo y compáralo con tu predicción.

Verás en pantalla:
```
Hello, World!
```

¡Tu primer programa corriendo! `dotnet run` hizo dos cosas (lo viste en la lección 2.1): **compiló** tu código y luego lo **ejecutó**.

### Paso 5: Hacer tuyo el programa

Abre `Program.cs` y reemplaza su contenido por:

```csharp
Console.WriteLine("Sistema de Gestión de Empresas Clientes");
Console.WriteLine("=======================================");
```

- `Console.WriteLine(...)` es una instrucción que **imprime una línea** de texto en la terminal. El texto va entre comillas.

Guarda y vuelve a ejecutar:
```bash
dotnet run
```

Ahora verás tus dos líneas. Acabas de cambiar el comportamiento del programa con tu propio código.

### Paso 6: Compilar sin ejecutar (`dotnet build`)

Para ver la diferencia entre compilar y ejecutar, prueba solo compilar:

```bash
dotnet build
```

Verás `Build succeeded` (compilación exitosa). No imprimió tus líneas, porque solo **tradujo** el código y revisó que no hubiera errores, sin correrlo.

> 🔨 **Rómpelo a propósito (para aprender a leer errores):** en `Program.cs`, borra el punto y coma `;` del final de la primera línea. **Antes de compilar, predice:** ¿`dotnet build` dirá "éxito" o "error"? Guarda y ejecuta `dotnet build`. Lee el error: te dice el archivo, la línea y que esperaba un `;`. Devuélvelo y vuelve a compilar. Aprender a leer estos mensajes es media batalla.

### Paso 7: Guardar el progreso en Git

Antes de versionar, hay un detalle: al compilar, .NET genera carpetas `bin/` y `obj/` con archivos que **no** deben subirse a Git (son resultados de compilación, se regeneran solos). Vamos a decirle a Git que los ignore.

Crea un archivo `.gitignore` en la raíz del proyecto (`gestion-empresas/`, no dentro de `src`) con este contenido:

```
# Resultados de compilación de .NET
bin/
obj/

# Configuración local con secretos (lo usaremos más adelante)
appsettings.*.json
*.env

# Sistema operativo
.DS_Store
```

> 🧠 El `.gitignore` es la lista de "lo que Git debe ignorar". Cada tecnología tiene archivos que no se versionan; en .NET son `bin/` y `obj/`.

Ahora guarda el avance. Crea una rama, commitea y abre un PR (como en la Fase 1). Desde VS Code (Source Control) o, si prefieres la terminal:

```bash
cd ../..                       # vuelve a la raíz gestion-empresas/
git checkout -b feat/app-consola
git add .
git commit -m "agregar aplicación de consola base e ignorar artefactos de compilación"
git push -u origin feat/app-consola    # sube la rama a GitHub: tu trabajo queda guardado en internet
```
En GitHub, abre el **Pull Request** y fusiónalo; luego vuelve a `main` en VS Code y pulsa **Sync** para actualizar tu copia.

> 💡 **El hábito que te salva el trabajo:** el `commit` guarda en **tu máquina**; el `push` lo sube a **GitHub** (internet). Haz siempre los dos: así, si tu computador falla, tu avance está a salvo y disponible desde cualquier lugar. En VS Code, los botones **Commit** y luego **Sync / Publish Branch** hacen exactamente esto. De aquí en adelante, cada vez que guardes tu avance, **haz también push**.

---

## ✅ Compruébalo

**Que corre:**
- [ ] `dotnet --version` muestra una versión `8.x`.
- [ ] `dotnet run` imprime tus dos líneas de texto.
- [ ] Tu proyecto tiene un `.gitignore` y `bin/`/`obj/` no aparecen en Git (`git status` no los muestra).

**Que entendiste:**
- [ ] Puedes explicar la diferencia entre `dotnet build` (solo compila) y `dotnet run` (compila y ejecuta).
- [ ] Al borrar el `;`, tu predicción ("éxito" o "error") coincidió con lo que dijo `dotnet build`.
- [ ] Puedes explicar por qué `commit` y `push` son dos cosas distintas.

> 🚦 **Cómo te fue** (sé honesto contigo): 🟢 lo hice solo · 🟡 me costó · 🔴 no me alcanzó. Si marcaste 🟡 o 🔴, no pasa nada: relee el paso y vuelve a intentar antes de seguir.

---

## 🧠 Lo que aprendiste

| Comando | Qué hace |
|---|---|
| `dotnet --version` | Verifica que .NET está instalado |
| `dotnet new console -n X -o ruta` | Crea un proyecto de consola |
| `dotnet run` | Compila **y** ejecuta |
| `dotnet build` | Solo compila (traduce y revisa errores) |

- `Console.WriteLine("...")` imprime texto en la terminal.
- `bin/` y `obj/` son artefactos de compilación: van en `.gitignore`.

---

## 🆘 Si algo salió mal

**`dotnet` no se reconoce como comando.**
Abre una terminal nueva (las viejas no ven lo recién instalado). Si persiste, reinicia el computador para que el sistema actualice el PATH.

**`dotnet run` dice que hay errores de compilación.**
Lee el mensaje: indica archivo y línea. Lo más común es una comilla o un `;` faltante. Compáralo con el código de la lección.

**VS Code me pide instalar el "C# Dev Kit" o muestra cosas en rojo.**
Instala la extensión "C# Dev Kit" (Fase 0). Te da autocompletado y resaltado de errores mientras escribes.

---

**➡️ Siguiente:** [Trabajar con datos: las empresas](03-trabajar-con-datos.md)
