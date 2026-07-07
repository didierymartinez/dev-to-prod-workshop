# Lección 4.2 — Listar empresas (GET)

> ⏱️ 40 minutos · 🎯 **Al terminar:** tu API tendrá su primer endpoint con datos reales: `GET /empresas` devolverá la lista en JSON. Y mantendrás el código ordenado separando "los datos" de "los endpoints".

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte nueva** (cajas 🆕); luego **predices** el JSON antes de abrir el navegador; y al final un **"Ahora tú"**.

---

## 🤔 El problema

Un servidor que solo dice "funcionando" no sirve. Queremos que devuelva las **empresas**, en JSON, igual que la API que consumiste en la Fase 3.

Podríamos escribir la lista dentro del endpoint. Pero pronto tendremos varios endpoints (listar, crear, eliminar) sobre **los mismos** datos. Si cada uno maneja la lista por su cuenta, el código se enreda. Mejor: los datos en **un solo lugar**.

---

## 💡 Separar "los datos" de "los endpoints"

Dividimos el trabajo en dos responsabilidades:

- **Los endpoints** (en `Program.cs`): reciben las peticiones y responden.
- **Una clase aparte**, el **repositorio**: guarda y entrega las empresas. Como una "bodega": le pides o le entregas cosas, y ella las organiza.

> 🧠 ¿Por qué separar? El día que cambiemos *dónde* se guardan (de la memoria a una base de datos, Fase 6), solo tocaremos el repositorio — los endpoints ni se enteran.

---

## 🛠️ Manos a la obra

### Paso 1 · El modelo Empresa

**Te muestro.** Dentro de `src/GestionEmpresas.Api/`, crea una carpeta `Models` y dentro el archivo `Empresa.cs` con esto:

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

**Te explico:**

> 🆕 **Clase, propiedades y `namespace`.**
> - `namespace GestionEmpresas.Api.Models;` es el **"apellido" del archivo**: agrupa el código para poder encontrarlo desde otros archivos (con un `using`, que verás en el Paso 3).
> - `public class Empresa { ... }` define una **clase**. Es como el `record` de la Fase 2, pero sus datos **se pueden modificar** después de crearla — lo necesitaremos al editar empresas.
> - `public string Nit { get; set; }` es una **propiedad**: un dato que se puede **leer** (`get`) y **escribir** (`set`). `public` = otros archivos la ven.
> - `= "";` y `= true` son **valores por defecto**: con qué empieza la propiedad si nadie la fija.

### Paso 2 · El repositorio (la bodega de datos)

**Te muestro.** Crea la carpeta `Repositorio` y dentro `EmpresaRepositorio.cs`. Por ahora solo necesita guardar unas empresas y saber **entregarlas todas**:

```csharp
using GestionEmpresas.Api.Models;

namespace GestionEmpresas.Api.Repositorio;

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

**Te explico:**

> 🆕 **La lista interna y `ObtenerTodas`.**
> - `private readonly List<Empresa> _empresas = [ ... ];`: `private` = solo esta clase la ve; `readonly` = la caja no se reemplaza por otra lista; el `_` inicial es **convención** para datos internos de una clase. Los corchetes `[ ... ]` crean la lista con sus elementos.
> - `new() { Nit = "...", ... }` crea una `Empresa` y fija sus propiedades por nombre. El `new()` sin decir el tipo funciona porque la lista ya dijo que contiene `Empresa`.
> - `IEnumerable<Empresa>` como tipo de retorno = "**una secuencia de empresas que se puede recorrer**". Basta con eso; no hace falta prometer que es exactamente una `List`.

Los demás métodos de la bodega (crear, buscar uno, eliminar) los agregaremos **cuando un endpoint los necesite**, en 4.3 y 4.4.

### Paso 3 · Usar el repositorio desde el endpoint

**Te muestro.** Reemplaza `Program.cs` por esto (el `/` de saludo sigue, y añadimos `GET /empresas`):

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

**Te explico:**

> 🆕 **`using` y el JSON automático.**
> - `using GestionEmpresas.Api.Repositorio;` **importa** ese "apellido" para nombrar `EmpresaRepositorio` sin su ruta completa. Es el par del `namespace` del Paso 2.
> - Cuando un endpoint devuelve un objeto o una lista, .NET lo convierte a **JSON** automáticamente. Devuelves empresas, el cliente recibe JSON.

> 🔮 **Predice, luego mira.** Arranca (`cd src/GestionEmpresas.Api` y `dotnet run`). Antes de abrir el navegador en `http://localhost:5000/empresas`: *¿cuántas empresas vas a ver y en qué formato?* Ábrelo y compáralo — verás las tres en JSON, **tu propia API entregando datos**.

> 🔨 **Rómpelo (entiende la conexión endpoint↔repositorio).** En el endpoint, cambia `repo.ObtenerTodas()` por `Array.Empty<object>()` (que es, simplemente, "una lista vacía" — solo la usamos para el experimento). **Predice:** ¿qué mostrará `/empresas`? Corre y compruébalo. Devuélvelo. *(Guarda tu respuesta para el commit.)*

> ✋ **Ahora tú.** Agrega un endpoint `GET /empresas/count` que devuelva solo **cuántas** empresas hay. *(Pista: en la Fase 2 usaste `.Count` como propiedad de una lista; sobre una secuencia como la que devuelve `ObtenerTodas()` se usa la versión con paréntesis, `repo.ObtenerTodas().Count()`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
app.MapGet("/empresas/count", () => repo.ObtenerTodas().Count());
```
</details>

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
- [ ] `http://localhost:5000/empresas/count` devuelve `3`.

**Que entendiste:**
- [ ] Puedes explicar por qué los datos van en una clase aparte y no dentro del endpoint.
- [ ] Puedes explicar qué hace el `namespace` de un archivo y el `using` que lo importa.
- [ ] Tu predicción del JSON coincidió, y entendiste qué pasó al devolver una lista vacía.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer el "Ahora tú" solo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Conviene **separar** los datos (el **repositorio**) de los endpoints (que responden HTTP).
- Una **clase** se parece al `record`, pero sus propiedades `{ get; set; }` se pueden modificar.
- `namespace` le pone "apellido" a un archivo; `using` lo importa desde otro.
- .NET convierte a **JSON** solo lo que devuelve un endpoint.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Vuelve al Paso 3: **predice** el JSON y **rómpelo** devolviendo una lista vacía. Entiendes la conexión cuando puedes predecir qué muestra el endpoint según lo que le pides al repositorio.

**Error "el tipo o nombre Empresa/EmpresaRepositorio no existe".**
Revisa los `namespace` de los archivos y los `using` de `Program.cs` (`GestionEmpresas.Api.Models` y `GestionEmpresas.Api.Repositorio`).

**`/empresas` da error 500.**
Mira la terminal donde corre `dotnet run`: el error real aparece ahí. Suele ser un nombre mal escrito.

**Veo el JSON pero sin tildes correctas.**
Es normal. .NET escapa algunos caracteres en JSON; los clientes los interpretan bien.

---

**➡️ Siguiente:** [Crear empresas (POST)](03-crear-empresas.md)
