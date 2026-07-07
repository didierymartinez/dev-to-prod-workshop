# Lección 4.2 — Listar empresas (GET)

> ⏱️ 40 minutos · 🎯 **Al terminar:** tu API tendrá su primer endpoint con datos reales: `GET /empresas` devolverá la lista en JSON. Y aprenderás a mantener el código ordenado separando "los datos" de "los endpoints".

> 🧭 **Cómo se aprende aquí.** Cada pieza la intentas tú antes de ver la solución. Aparecen varias palabras nuevas de C#; cada una tiene su caja `🆕` la primera vez. Antes de abrir el navegador, **predices** qué JSON vas a ver.

---

## 🤔 El problema

Un servidor que solo dice "funcionando" no sirve. Queremos que devuelva las **empresas**, en JSON, igual que la API que consumiste en la Fase 3.

Podríamos escribir la lista de empresas directamente dentro del endpoint. Pero pronto tendremos varios endpoints (listar, crear, eliminar) que trabajan sobre **los mismos** datos. Si cada uno maneja la lista por su cuenta, el código se vuelve un enredo. Mejor poner los datos en **un solo lugar**.

---

## 💡 Separar "los datos" de "los endpoints"

Vamos a dividir el trabajo en dos responsabilidades:

- **Los endpoints** (en `Program.cs`): reciben las peticiones HTTP y responden.
- **Una clase aparte**: guarda y entrega las empresas. A esa clase se le llama, por costumbre en la industria, un **repositorio** — una "bodega": le pides cosas o le entregas cosas, y ella las organiza.

> 🧠 ¿Por qué separar? Cuando un endpoint necesite datos, se los pide al repositorio. Y el día que cambiemos *dónde* se guardan (de la memoria a una base de datos, en la Fase 6), solo tocaremos el repositorio — los endpoints ni se enterarán.

---

## 🛠️ Manos a la obra

### Paso 1 · El modelo Empresa

Dentro de `src/GestionEmpresas.Api/`, crea una carpeta `Models` y dentro el archivo `Empresa.cs`. Quiero una clase que represente una empresa, con sus cuatro datos.

> 🛠️ **Inténtalo tú.** Crea la clase `Empresa` con cuatro **propiedades** que se puedan leer y escribir: `Nit` (texto), `RazonSocial` (texto), `Plan` (texto), `Activa` (verdadero/falso). *(Pistas: una propiedad de texto se escribe `public string Nit { get; set; } = "";`; el archivo empieza con su `namespace`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
namespace GestionEmpresas.Api.Models;

public class Empresa
{
    public string Nit { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Plan { get; set; } = "Básico";
    public bool Activa { get; set; } = true;
}
```
</details>

> 🆕 **Clase, propiedades y `namespace`.**
> - `namespace GestionEmpresas.Api.Models;` es el **"apellido" del archivo**: agrupa el código y permite encontrarlo desde otros archivos (con un `using`, que verás en el Paso 3).
> - `public class Empresa { ... }` define una **clase**. Es como el `record` de la Fase 2, pero sus datos **se pueden modificar** después de crearla — lo necesitaremos al editar empresas.
> - `public string Nit { get; set; }` es una **propiedad**: un dato de la empresa que se puede **leer** (`get`) y **escribir** (`set`). El `public` significa que otros archivos pueden usarla.
> - `= "";` y `= true` son **valores por defecto**: con qué empieza la propiedad si nadie la fija.

### Paso 2 · El repositorio (la bodega de datos)

Crea la carpeta `Repositorio` y dentro `EmpresaRepositorio.cs`. Por ahora solo necesita guardar unas empresas y saber **entregarlas todas**.

> 🛠️ **Inténtalo tú.** Crea la clase `EmpresaRepositorio` con una lista interna de tres empresas de ejemplo, y un método `ObtenerTodas()` que las devuelva. *(Pistas: la lista va como dato interno `private readonly List<Empresa> _empresas = [ ... ];`; cada empresa se crea con `new() { Nit = "...", RazonSocial = "...", ... }`; el método devuelve la lista.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using GestionEmpresas.Api.Models;

namespace GestionEmpresas.Api.Repositorio;

// Guarda y entrega las empresas. Por ahora, en una lista en memoria.
public class EmpresaRepositorio
{
    private readonly List<Empresa> _empresas =
    [
        new() { Nit = "900123456-1", RazonSocial = "Constructora del Norte S.A.S.", Plan = "Empresarial", Activa = true },
        new() { Nit = "830456789-2", RazonSocial = "Interprensa Ltda.",             Plan = "Profesional", Activa = true },
        new() { Nit = "901222333-4", RazonSocial = "Consorcio Alquiler S.A.",        Plan = "Básico",      Activa = false },
    ];

    public IEnumerable<Empresa> ObtenerTodas() => _empresas;
}
```
</details>

> 🆕 **La lista interna y `ObtenerTodas`.**
> - `private readonly List<Empresa> _empresas = [ ... ];`: `private` = solo esta clase la ve; `readonly` = la caja no se reemplaza por otra lista; el `_` al inicio es una **convención** para datos internos de una clase. Los corchetes `[ ... ]` crean la lista con sus elementos.
> - `new() { Nit = "...", ... }` crea una `Empresa` y le fija sus propiedades por nombre. El `new()` sin decir el tipo funciona porque la lista ya dijo que contiene `Empresa`.
> - `IEnumerable<Empresa>` como tipo de retorno significa "**una secuencia de empresas que se puede recorrer**". Para ObtenerTodas basta con eso; no hace falta prometer que es exactamente una `List`.

Los demás métodos de la bodega (crear, buscar uno, eliminar) los agregaremos **cuando un endpoint los necesite**, en las lecciones 4.3 y 4.4.

### Paso 3 · Usar el repositorio desde el endpoint

Ahora conecta el repositorio a un endpoint nuevo `GET /empresas`. Al entrar a esa ruta quiero ver las tres empresas en JSON.

> 🛠️ **Inténtalo tú.** En `Program.cs`: crea el repositorio una vez, y agrega el endpoint `GET /empresas` que devuelva `repo.ObtenerTodas()`. Deja también el `/` de saludo. *(Pistas: necesitas `using GestionEmpresas.Api.Repositorio;` arriba; el repositorio se crea con `var repo = new EmpresaRepositorio();`; el endpoint es `app.MapGet("/empresas", () => repo.ObtenerTodas());`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using GestionEmpresas.Api.Repositorio;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Creamos el repositorio una sola vez. Los endpoints lo usarán.
var repo = new EmpresaRepositorio();

app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

// GET /empresas → le pide al repositorio todas las empresas y las devuelve
app.MapGet("/empresas", () => repo.ObtenerTodas());

app.Run();
```
</details>

> 🆕 **`using` y el JSON automático.**
> - `using GestionEmpresas.Api.Repositorio;` **importa** ese "apellido" para poder nombrar `EmpresaRepositorio` sin escribir su ruta completa. Es el par del `namespace` del Paso 2.
> - Cuando un endpoint devuelve un objeto o una lista, .NET lo convierte a **JSON** automáticamente. No tienes que hacer nada: devuelves empresas, el cliente recibe JSON.

### Paso 4 · Probar

```bash
cd src/GestionEmpresas.Api
dotnet run
```

> 🔮 **Predice, luego mira.** Antes de abrir el navegador: *al entrar a `http://localhost:5000/empresas`, ¿cuántas empresas vas a ver y en qué formato?* Escríbelo. Ahora abre esa dirección y compáralo — verás las tres en JSON, **tu propia API entregando datos**.

> 🔨 **Rómpelo (y entiende la conexión endpoint↔repositorio).** En el endpoint, cambia `repo.ObtenerTodas()` por una lista vacía `Array.Empty<object>()`. **Predice:** ¿qué mostrará `/empresas` ahora? Corre y compruébalo. Devuélvelo. *(Guarda tu respuesta para el commit.)*

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/api-listar-empresas
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "endpoint GET /empresas con repositorio en memoria
>
> - Separé los datos (repositorio) de los endpoints porque ...
> - Una 'clase' se diferencia del 'record' de la Fase 2 en que ...
> - Cuando devolví una lista vacía en el endpoint, /empresas mostró ..."
> ```
> ```bash
> git push -u origin feat/api-listar-empresas
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] `http://localhost:5000/empresas` devuelve las 3 empresas en JSON.

**Que entendiste:**
- [ ] Puedes explicar, con tus palabras, por qué los datos van en una clase aparte y no dentro del endpoint.
- [ ] Puedes explicar qué hace el `namespace` de un archivo y el `using` que lo importa.
- [ ] Tu predicción del JSON coincidió, y entendiste qué pasó al devolver una lista vacía.

> 🚦 **Cómo te fue:** 🟢 lo construí solo · 🟡 me costó / abrí la solución antes · 🔴 no me alcanzó. Los 🟡/🔴 son para repasar.

---

## 🧠 Lo que aprendiste

- Conviene **separar** los datos (en una clase aparte, el **repositorio**) de los endpoints (que responden HTTP).
- Una **clase** se parece al `record`, pero sus propiedades `{ get; set; }` se pueden modificar.
- `namespace` le pone "apellido" a un archivo; `using` lo importa desde otro.
- .NET convierte los objetos y listas que devuelve un endpoint a **JSON** solo.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Vuelve al Paso 4: **predice** el JSON antes de abrirlo y **rómpelo** devolviendo una lista vacía. Entiendes la conexión cuando puedes predecir qué muestra el endpoint según lo que le pides al repositorio.

**Error "el tipo o nombre Empresa/EmpresaRepositorio no existe".**
Revisa los `namespace` de los archivos y los `using` arriba de `Program.cs`. Deben coincidir (`GestionEmpresas.Api.Models` y `GestionEmpresas.Api.Repositorio`).

**`/empresas` da error 500.**
Mira la terminal donde corre `dotnet run`: el mensaje de error real aparece ahí. Suele ser un nombre mal escrito en el repositorio.

**Veo el JSON pero sin tildes correctas.**
Es normal y no afecta. .NET escapa algunos caracteres en JSON; los clientes (navegador, Postman) los interpretan bien.

---

**➡️ Siguiente:** [Crear empresas (POST)](03-crear-empresas.md)
