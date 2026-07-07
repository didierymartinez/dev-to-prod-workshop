# Lección 4.1 — Tu primer servidor web

> ⏱️ 30 minutos · 🎯 **Al terminar:** tendrás un servidor que escucha peticiones HTTP y responde, corriendo en tu máquina. Será la base de tu API.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte**; luego **predices** qué verás antes de abrir el navegador; y al final un **"Ahora tú"** de variación pequeña. No inventas nada de cero.

---

## 🤔 El problema

En la Fase 3 fuiste el **cliente**: pediste datos a una API. Ahora cambias de lado: vas a crear el **servidor**, el programa que *recibe* peticiones y *responde*. Empezamos por lo más simple: un servidor que responda algo, lo que sea, para confirmar que la conversación HTTP funciona.

---

## 💡 Una API se queda escuchando

En la Fase 2 hiciste una app de **consola**: corre, hace algo y **termina**. Una API es distinta: **se queda escuchando** peticiones, sin terminar, hasta que la detengas. .NET tiene una plantilla para esto: `web`.

---

## 🛠️ Manos a la obra

### Paso 1 · Crear el proyecto de API

Ve a la raíz de tu proyecto `gestion-empresas` (donde está la carpeta `src`):

```bash
cd gestion-empresas      # ajusta la ruta
dotnet new web -n GestionEmpresas.Api -o src/GestionEmpresas.Api
```

`dotnet new web` crea el tipo de proyecto más simple para hablar HTTP.

### Paso 2 · Agrupar los proyectos en una "solución"

Ahora tienes dos proyectos (la consola y la API). Una **solución** (`.sln`) los agrupa. Desde la raíz:

```bash
dotnet new sln -n GestionEmpresas
dotnet sln add src/GestionEmpresas.Api/GestionEmpresas.Api.csproj
dotnet sln add src/GestionEmpresas.Consola/GestionEmpresas.Consola.csproj
```

> 💡 La solución es opcional para que el código funcione, pero es la forma profesional de organizar varios proyectos, y ayuda a VS Code a entenderlos.

### Paso 3 · Hacer que el servidor responda algo

**Te muestro.** Abre `src/GestionEmpresas.Api/Program.cs` (trae un ejemplo de la plantilla) y reemplaza su contenido por esta versión mínima:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Un endpoint: responde en la dirección raíz "/"
app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

app.Run();
```

**Te explico:**

> 🆕 **Las piezas de una API mínima.**
> - `WebApplication.CreateBuilder(args)` prepara la app; `builder.Build()` la construye. Es la receta fija de arranque.
> - `app.MapGet("/", () => "...")` define un **endpoint**: *"cuando llegue un **GET** a la dirección `/`, responde esto"*. `MapGet` = "mapea peticiones GET a esta ruta".
> - `() => "..."` es una **función corta sin entradas**: los paréntesis vacíos `()` no reciben nada, y a la derecha de `=>` va lo que devuelve. (Pariente del `e => e.Activa` de la Fase 2, pero ahí recibía un `e`; aquí no recibe nada.)
> - `app.Run()` **arranca el servidor** y lo deja escuchando. Nada después de esta línea corre hasta que lo detengas.

### Paso 4 · Fijar el puerto

Por defecto, .NET elige un puerto **al azar**. Para que coincida con todo el taller (el frontend, Postman y Docker usarán el **5000**), fíjalo: abre `src/GestionEmpresas.Api/Properties/launchSettings.json` y deja la línea `"applicationUrl"` así (si hay más de un perfil, ponlo igual en todos):

```json
"applicationUrl": "http://localhost:5000",
```

> 🧠 `launchSettings.json` solo afecta a `dotnet run` en tu máquina. Solo cambia esa línea. *(Alternativa: arranca con `dotnet run --urls http://localhost:5000`.)* **`localhost`** significa "este mismo computador".

### Paso 5 · Arrancar y probar

```bash
cd src/GestionEmpresas.Api
dotnet run
```

> 🔮 **Predice, luego mira.** Antes de abrir nada: *cuando entres a `http://localhost:5000` en el navegador, ¿qué texto exacto vas a ver?* Escríbelo. Ahora abre esa dirección y compáralo.

En la terminal verás `Now listening on: http://localhost:5000` — tu servidor escuchando. En el navegador verás tu mensaje. Acabas de estar del **otro lado** de la conversación de la Fase 3. Para **detener** el servidor: `Ctrl + C`.

> 🔨 **Rómpelo (y entiende `app.Run()`).** Mueve la línea `app.Run();` para que quede **antes** de `app.MapGet(...)`. **Predice:** ¿el endpoint `/` seguirá respondiendo? Guarda, `dotnet run`, abre `/`, y observa (pista: `app.Run()` se queda escuchando; lo que va después no se ejecuta). Devuelve la línea a su sitio. *(Guarda tu respuesta para el commit.)*

> ✋ **Ahora tú.** Agrega un **segundo** endpoint que responda en `/saludo` con el texto que quieras, e invócalo en el navegador (`http://localhost:5000/saludo`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
app.MapGet("/saludo", () => "¡Hola desde mi API!");
```
(Va antes de `app.Run();`.)
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/primer-servidor
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "primer servidor web con un endpoint GET
>
> - La diferencia entre la app de consola (Fase 2) y esta API es ...
> - app.MapGet(\"/\", ...) hace ...
> - Cuando puse app.Run() antes del MapGet, pasó ..., porque ..."
> ```
> ```bash
> git push -u origin feat/primer-servidor
> ```

Abre el **Pull Request**, fusiónalo y vuelve a `main`.

---

## ✅ Compruébalo

**Que corre:**
- [ ] `dotnet run` muestra "Now listening on: http://localhost:5000".
- [ ] El navegador, en esa dirección, muestra tu mensaje.
- [ ] Tu segundo endpoint `/saludo` responde.

**Que entendiste:**
- [ ] Puedes explicar por qué una API "no termina" como la app de consola.
- [ ] Puedes explicar qué hace `app.MapGet("/", ...)` y qué hace `app.Run()`.
- [ ] Tu predicción del texto coincidió — y entendiste qué pasó al mover `app.Run()`.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer el "Ahora tú" solo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una API se crea con `dotnet new web` y **se queda escuchando** (no termina como la consola).
- `app.MapGet(ruta, () => ...)` define qué responder ante un GET a esa ruta; `() => ...` es una función corta sin entradas.
- `app.Run()` arranca el servidor; escucha en `localhost` (tu máquina) en un puerto.
- Una **solución** (`.sln`) agrupa varios proyectos.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Vuelve al Paso 5: **predice** (🔮) qué responderá el servidor y **rómpelo** (🔨) moviendo `app.Run()`. Entiendes cuando puedes predecir qué pasa si lo cambias.

**"Address already in use" o el puerto está ocupado.**
Ya tienes otro servidor en ese puerto. Deténlo (`Ctrl+C` en su terminal) o usa el puerto que .NET te asigne.

**El navegador dice "no se puede conectar".**
Confirma que el servidor sigue corriendo (no le diste `Ctrl+C`) y que usas el puerto exacto que mostró la terminal.

**`dotnet new web` falló.**
Verifica el SDK con `dotnet --version` (debe ser 8.x) y que estás en la carpeta correcta.

---

**➡️ Siguiente:** [Listar empresas (GET)](02-listar-empresas.md)
