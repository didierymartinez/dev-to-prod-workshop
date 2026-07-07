# Lección 4.1 — Tu primer servidor web

> ⏱️ 30 minutos · 🎯 **Al terminar:** tendrás un servidor que escucha peticiones HTTP y responde, corriendo en tu máquina. Será la base de tu API.

> 🧭 **Cómo se aprende aquí.** No copias y pegas el código clave: te muestro qué quiero que responda el servidor, lo intentas, y **luego** revelo una forma. Antes de abrir el navegador, **predices** qué vas a ver. El commit del final te pregunta el *porqué*, no el *qué*.

---

## 🤔 El problema

En la Fase 3 fuiste el **cliente**: pediste datos a una API. Ahora cambias de lado: vas a crear el **servidor**, el programa que *recibe* peticiones y *responde*. Empezamos por lo más simple: un servidor que responda algo, lo que sea, para confirmar que la conversación HTTP funciona.

---

## 💡 Una API se queda escuchando

En la Fase 2 hiciste una app de **consola**: corre, hace algo y **termina**. Una API es distinta: **se queda escuchando** peticiones, sin terminar, hasta que tú la detengas. .NET tiene una plantilla para esto: `web`. El resto (cómo se define qué responder) lo vas a **descubrir construyéndolo**.

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

Ahora tienes dos proyectos (la consola y la API). Una **solución** (`.sln`) los agrupa para manejarlos juntos. Desde la raíz:

```bash
dotnet new sln -n GestionEmpresas
dotnet sln add src/GestionEmpresas.Api/GestionEmpresas.Api.csproj
dotnet sln add src/GestionEmpresas.Consola/GestionEmpresas.Consola.csproj
```

> 💡 La solución es opcional para que el código funcione, pero es la forma profesional de organizar varios proyectos relacionados, y ayuda a VS Code a entenderlos.

### Paso 3 · Hacer que el servidor responda algo

Abre `src/GestionEmpresas.Api/Program.cs`: trae un ejemplo de la plantilla. Quiero dejarlo mínimo, de modo que al entrar a la dirección raíz `/` responda un texto:

```
API de Gestión de Empresas funcionando 🚀
```

> 🛠️ **Inténtalo tú.** Reemplaza el contenido de `Program.cs` por lo mínimo: (1) prepara la app, (2) define **un endpoint** que responda ese texto cuando llegue un **GET** a `/`, y (3) arranca el servidor. *(Pistas: se prepara con `WebApplication.CreateBuilder(args)` y `builder.Build()`; el endpoint se declara con `app.MapGet("/", () => "tu texto");`; se arranca con `app.Run();`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Un endpoint de prueba: responde en la dirección raíz "/"
app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

app.Run();
```
</details>

> 🆕 **Las piezas de una API mínima.**
> - `WebApplication.CreateBuilder(args)` prepara la app; `builder.Build()` la construye. Es la receta fija de arranque.
> - `app.MapGet("/", () => "...")` define un **endpoint**: *"cuando llegue un **GET** a la dirección `/`, responde esto"*. `MapGet` = "mapea peticiones GET a esta ruta".
> - `() => "..."` es una **función corta sin entradas**: los paréntesis vacíos `()` significan que no recibe nada, y a la derecha de `=>` va lo que devuelve. (Es pariente del `e => e.Activa` del 2.3, pero ahí recibía un `e`; aquí no recibe nada.)
> - `app.Run()` **arranca el servidor** y lo deja escuchando. Ninguna línea después de esta corre hasta que detengas el servidor.

### Paso 4 · Fijar el puerto

Por defecto, .NET elige un puerto **al azar** cada vez que arrancas. Para que coincida con **todo el taller** (el frontend, Postman y Docker usarán el **5000**), fíjalo una vez: abre `src/GestionEmpresas.Api/Properties/launchSettings.json` y deja la línea `"applicationUrl"` así (si ves más de un perfil, ponlo igual en todos):

```json
"applicationUrl": "http://localhost:5000",
```

> 🧠 `launchSettings.json` solo afecta a `dotnet run` en tu máquina; al empaquetar con Docker (Fase 8) el puerto se configura aparte. Solo cambia esa línea; no necesitas entender el resto del archivo. *(Alternativa rápida, sin editar el archivo: arranca siempre con `dotnet run --urls http://localhost:5000`.)*

> 🧠 **`localhost`** significa "este mismo computador". El servidor solo es accesible desde tu máquina por ahora. En la Fase 9 lo pondremos en internet.

### Paso 5 · Arrancar y probar

```bash
cd src/GestionEmpresas.Api
dotnet run
```

> 🔮 **Predice, luego mira.** Antes de abrir nada: *cuando entres a `http://localhost:5000` en el navegador, ¿qué texto exacto vas a ver?* Escríbelo. Ahora, con el servidor corriendo, abre esa dirección y compáralo.

En la salida de la terminal verás una línea como `Now listening on: http://localhost:5000` — ese es **tu servidor** escuchando. En el navegador verás tu mensaje. Acabas de estar del **otro lado** de la conversación de la Fase 3.

> 🔨 **Rómpelo (y entiende `app.Run()`).** Mueve la línea `app.Run();` para que quede **antes** de `app.MapGet(...)`. **Antes de correr, predice:** ¿el endpoint `/` seguirá respondiendo? Guarda, `dotnet run`, y abre `/`. Observa qué pasa y por qué (pista: `app.Run()` se queda escuchando; lo que va después no se ejecuta). Devuelve la línea a su sitio. *(Guarda tu respuesta para el commit.)*

Para **detener** el servidor, vuelve a la terminal y pulsa `Ctrl + C`.

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

Abre el **Pull Request**, fusiónalo, y vuelve a `main`.

---

## ✅ Compruébalo

**Que corre:**
- [ ] `dotnet run` muestra "Now listening on: http://localhost:5000".
- [ ] El navegador, en esa dirección, muestra tu mensaje.
- [ ] Sabes detener el servidor con `Ctrl + C`.

**Que entendiste:**
- [ ] Puedes explicar por qué una API "no termina" como la app de consola.
- [ ] Puedes explicar qué hace `app.MapGet("/", ...)` y qué hace `app.Run()`.
- [ ] Tu predicción del texto en el navegador coincidió — y entendiste qué pasó al mover `app.Run()`.

> 🚦 **Cómo te fue** (sé honesto): 🟢 lo construí solo · 🟡 me costó / abrí la solución antes · 🔴 no me alcanzó. Los 🟡/🔴 son para repasar, no para castigarte.

---

## 🧠 Lo que aprendiste

- Una API se crea con `dotnet new web` y **se queda escuchando** (no termina como la consola).
- `app.MapGet(ruta, () => ...)` define qué responder ante un GET a esa ruta; `() => ...` es una función corta sin entradas.
- `app.Run()` arranca el servidor; escucha en `localhost` (tu máquina) en un puerto.
- Una **solución** (`.sln`) agrupa varios proyectos.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Vuelve al Paso 5: **predice** (🔮) qué responderá el servidor antes de abrirlo, y **rómpelo** (🔨) moviendo `app.Run()`. Entiendes algo cuando puedes predecir qué pasa si lo cambias.

**"Address already in use" o el puerto está ocupado.**
Ya tienes otro servidor corriendo en ese puerto. Detén el anterior (`Ctrl+C` en su terminal) o usa el puerto que .NET te asigne.

**El navegador dice "no se puede conectar".**
Confirma que el servidor sigue corriendo (no le diste `Ctrl+C`) y que usas el puerto exacto que mostró la terminal.

**`dotnet new web` falló.**
Verifica el SDK con `dotnet --version` (debe ser 8.x) y que estás en la carpeta correcta.

---

**➡️ Siguiente:** [Listar empresas (GET)](02-listar-empresas.md)
