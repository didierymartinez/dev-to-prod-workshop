# Lección 4.1 — Tu primer servidor web

> ⏱️ 30 minutos · 🎯 **Al terminar:** tendrás un servidor que escucha peticiones HTTP y responde, corriendo en tu máquina. Será la base de tu API.

---

## 🤔 El problema

En la Fase 3 fuiste el **cliente**: pediste datos a una API. Ahora cambias de lado: vas a crear el **servidor**, el programa que *recibe* peticiones y *responde*. Empezamos por lo más simple: un servidor que responda algo, lo que sea, para confirmar que la conversación HTTP funciona.

---

## 💡 Conceptos

### Una API es otro tipo de proyecto .NET

En la Fase 2 creaste una app de **consola** (corre, hace algo, termina). Una API es distinta: es un programa que **se queda escuchando** peticiones, sin terminar, hasta que tú lo detengas. .NET tiene una plantilla para esto: `web`.

### Las piezas de una API mínima

Una API en .NET moderna se arma con tres ideas:
- Un **builder** que prepara la aplicación.
- La **app**, que se construye a partir del builder.
- **Endpoints** que defines con `app.MapGet(...)`, `app.MapPost(...)`, etc. — cada uno responde a una URL y un método.

---

## 🛠️ Manos a la obra

### Paso 1: Crear el proyecto de API

Ve a la raíz de tu proyecto `gestion-empresas` (donde está la carpeta `src`):

```bash
cd gestion-empresas      # ajusta la ruta
dotnet new web -n GestionEmpresas.Api -o src/GestionEmpresas.Api
```

`dotnet new web` crea el tipo de proyecto más simple para hablar HTTP.

### Paso 2: Agrupar los proyectos en una "solución"

Ahora tienes dos proyectos (la consola y la API). Una **solución** (`.sln`) los agrupa para manejarlos juntos. Desde la raíz:

```bash
dotnet new sln -n GestionEmpresas
dotnet sln add src/GestionEmpresas.Api/GestionEmpresas.Api.csproj
dotnet sln add src/GestionEmpresas.Consola/GestionEmpresas.Consola.csproj
```

> 💡 La solución es opcional para que el código funcione, pero es la forma profesional de organizar varios proyectos relacionados, y ayuda a VS Code a entenderlos.

### Paso 3: Mirar y simplificar el código

Abre `src/GestionEmpresas.Api/Program.cs`. Trae un ejemplo. Reemplázalo por esta versión mínima y clara:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Un endpoint de prueba: responde en la dirección raíz "/"
app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

app.Run();
```

Desglose:
- `WebApplication.CreateBuilder(args)` prepara la aplicación.
- `builder.Build()` la construye.
- `app.MapGet("/", () => "...")` define un endpoint: *"cuando llegue un **GET** a la dirección `/`, responde este texto"*.
- `app.Run()` **arranca el servidor** y lo deja escuchando.

### Paso 4: Ejecutar el servidor

```bash
cd src/GestionEmpresas.Api
dotnet run
```

Fíjate en la salida. Verás una línea como:
```
Now listening on: http://localhost:5000
```
Ese es **tu servidor**, escuchando en tu máquina en el puerto 5000. (El número puede variar; usa el que te muestre.)

> 🧠 **`localhost`** significa "este mismo computador". El servidor solo es accesible desde tu máquina por ahora. En la Fase 9 lo pondremos en internet.

### Paso 5: Probarlo

Deja el servidor corriendo. Abre el navegador en `http://localhost:5000` (con tu puerto). Verás tu mensaje:
```
API de Gestión de Empresas funcionando 🚀
```

¡Tu primer servidor respondiendo a una petición HTTP! Acabas de estar del otro lado de la conversación de la Fase 3.

Para **detener** el servidor, vuelve a la terminal y pulsa `Ctrl + C`.

---

## ✅ Compruébalo

- [ ] `dotnet run` muestra "Now listening on: http://localhost:..."
- [ ] El navegador, en esa dirección, muestra tu mensaje.
- [ ] Sabes detener el servidor con `Ctrl + C`.
- [ ] Puedes explicar qué hace `app.MapGet("/", ...)` y `app.Run()`.

---

## 🧠 Lo que aprendiste

- Una API se crea con `dotnet new web` y **se queda escuchando** (no termina como la consola).
- `app.MapGet(ruta, ...)` define qué responder ante un GET a esa ruta.
- `app.Run()` arranca el servidor; escucha en `localhost` (tu máquina) en un puerto.
- Una **solución** (`.sln`) agrupa varios proyectos.

---

## 🆘 Si algo salió mal

**"Address already in use" o el puerto está ocupado.**
Ya tienes otro servidor corriendo en ese puerto. Detén el anterior (`Ctrl+C` en su terminal) o usa el puerto que .NET te asigne.

**El navegador dice "no se puede conectar".**
Confirma que el servidor sigue corriendo (no le diste `Ctrl+C`) y que usas el puerto exacto que mostró la terminal.

**`dotnet new web` falló.**
Verifica el SDK con `dotnet --version` (debe ser 8.x) y que estás en la carpeta correcta.

---

**➡️ Siguiente:** [Listar empresas (GET)](02-listar-empresas.md)
