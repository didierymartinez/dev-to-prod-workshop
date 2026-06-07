# Lección 4.2 — Listar empresas (GET)

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu API tendrá su primer endpoint con datos reales: `GET /empresas` devolverá la lista en JSON. Y aprenderás a mantener el código ordenado separando "los datos" de "los endpoints".

---

## 🤔 El problema

Un servidor que solo dice "funcionando" no sirve. Queremos que devuelva las **empresas**, en JSON, igual que la API que consumiste en la Fase 3.

Podríamos escribir la lista de empresas directamente dentro del endpoint. Pero pronto tendremos varios endpoints (listar, crear, eliminar) que trabajan sobre **los mismos** datos. Si cada uno maneja la lista por su cuenta, el código se vuelve un enredo. Mejor poner los datos en **un solo lugar**.

---

## 💡 Conceptos

### Separar "los datos" de "los endpoints"

Vamos a dividir el trabajo en dos responsabilidades:

- **Los endpoints** (en `Program.cs`): reciben las peticiones HTTP y responden.
- **Una clase aparte**: se encarga de guardar y entregar las empresas.

A esa clase encargada de los datos se le suele llamar un **"repositorio"**. Es solo un **nombre** muy común en la industria para "el lugar donde se guardan y se piden los datos" — como una bodega: tú le pides cosas o le entregas cosas, y ella se encarga de organizarlas. No tiene más misterio por ahora.

> 🧠 ¿Por qué separar? Porque cuando un endpoint necesite datos, simplemente se los pide al repositorio. Y el día que cambiemos *dónde* se guardan (de la memoria a una base de datos, en la Fase 6), solo tocaremos el repositorio — los endpoints ni se enterarán.

---

## 🛠️ Manos a la obra

### Paso 1: El modelo Empresa

Dentro de `src/GestionEmpresas.Api/`, crea una carpeta `Models` y dentro el archivo `Empresa.cs`:

```csharp
namespace GestionEmpresas.Api.Models;

public class Empresa
{
    public string Nit { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Plan { get; set; } = "Básico";
    public bool Activa { get; set; } = true;
}

// Lo que el cliente envía al crear: no incluye nada que genere el servidor
public record CrearEmpresaRequest(string RazonSocial, string Nit, string Plan);
```

- `namespace` es como el "apellido" del archivo: agrupa el código y permite encontrarlo desde otros archivos.
- `Empresa` es una **clase** con propiedades (similar al `record` de la Fase 2, pero sus datos se pueden modificar, lo que necesitaremos luego).
- `CrearEmpresaRequest` describe lo que llega en un POST (sin estado interno; eso lo pone el servidor). Lo usaremos en la lección 4.3.

### Paso 2: El repositorio (la clase de los datos)

Crea la carpeta `Repositorio` y dentro `EmpresaRepositorio.cs`:

```csharp
using GestionEmpresas.Api.Models;

namespace GestionEmpresas.Api.Repositorio;

// Se encarga de guardar y entregar las empresas. Por ahora, en una lista en memoria.
public class EmpresaRepositorio
{
    private readonly List<Empresa> _empresas =
    [
        new() { Nit = "900123456-1", RazonSocial = "Constructora del Norte S.A.S.", Plan = "Empresarial", Activa = true },
        new() { Nit = "830456789-2", RazonSocial = "Interprensa Ltda.",             Plan = "Profesional", Activa = true },
        new() { Nit = "901222333-4", RazonSocial = "Consorcio Alquiler S.A.",        Plan = "Básico",      Activa = false },
    ];

    public IEnumerable<Empresa> ObtenerTodas() => _empresas;

    public Empresa? ObtenerPorNit(string nit) =>
        _empresas.FirstOrDefault(e => e.Nit == nit);

    public Empresa Crear(CrearEmpresaRequest req)
    {
        var empresa = new Empresa { Nit = req.Nit, RazonSocial = req.RazonSocial, Plan = req.Plan };
        _empresas.Add(empresa);
        return empresa;
    }

    public bool Eliminar(string nit)
    {
        var empresa = ObtenerPorNit(nit);
        if (empresa is null) return false;
        _empresas.Remove(empresa);
        return true;
    }
}
```

Desglose:
- `private readonly List<Empresa> _empresas = [ ... ];` → una lista con tres empresas de ejemplo, guardada dentro del repositorio. El `_` al inicio del nombre es una convención para datos internos de la clase.
- Los cuatro métodos (`ObtenerTodas`, `ObtenerPorNit`, `Crear`, `Eliminar`) son las cosas que la "bodega" sabe hacer. En esta lección usaremos solo `ObtenerTodas`; los demás los activaremos en las lecciones 4.3 y 4.4, pero los dejamos listos.

### Paso 3: Usar el repositorio desde el endpoint

Abre `Program.cs` y reemplázalo por:

```csharp
using GestionEmpresas.Api.Repositorio;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Creamos el repositorio una sola vez. Los endpoints lo usarán.
var repo = new EmpresaRepositorio();

app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

// GET /empresas → le pide al repositorio todas las empresas y las devuelve en JSON
app.MapGet("/empresas", () => repo.ObtenerTodas());

app.Run();
```

Desglose:
- `var repo = new EmpresaRepositorio();` → crea el repositorio una vez, al arrancar. Es nuestra "bodega" de empresas.
- En el endpoint, `() => repo.ObtenerTodas()` → cuando llegue un GET a `/empresas`, le pide al repositorio la lista y la devuelve.
- .NET convierte esa lista a **JSON** automáticamente.

> 🧠 Fíjate lo directo que es: **creas el repositorio, y los endpoints lo usan.** Sin magia. Más adelante (Fase 6), cuando guardemos los datos en una base de datos de verdad, mejoraremos esta conexión y aprenderás dos técnicas profesionales (interfaces e inyección de dependencias) — pero las verás *cuando resuelvan un problema real*, no antes.

### Paso 4: Probar

```bash
cd src/GestionEmpresas.Api
dotnet run
```

Abre el navegador en `http://localhost:5000/empresas` (con tu puerto). Verás las tres empresas en JSON — **tu propia API entregando datos**, igual que la de práctica de la Fase 3, pero hecha por ti.

### Paso 5: Guardar el avance

```bash
cd ../..
git checkout -b feat/api-listar-empresas
git add .
git commit -m "agregar API con endpoint GET /empresas y repositorio en memoria"
git push -u origin feat/api-listar-empresas    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] `http://localhost:5000/empresas` devuelve las 3 empresas en JSON.
- [ ] Entiendes la separación: el **repositorio** guarda los datos, el **endpoint** responde a la petición.
- [ ] Puedes explicar, con tus palabras, por qué conviene tener los datos en una clase aparte y no dentro del endpoint.

---

## 🧠 Lo que aprendiste

- Conviene **separar** los datos (en una clase aparte) de los endpoints (que responden HTTP).
- A la clase encargada de los datos se le llama **repositorio** — es solo un nombre, como una "bodega" de datos.
- Creas el repositorio una vez y los endpoints lo usan; .NET convierte los objetos a **JSON** solo.

---

## 🆘 Si algo salió mal

**Error "el tipo o nombre Empresa/EmpresaRepositorio no existe".**
Revisa los `namespace` de los archivos y los `using` arriba de `Program.cs`. Deben coincidir (`GestionEmpresas.Api.Models` y `GestionEmpresas.Api.Repositorio`).

**`/empresas` da error 500.**
Mira la terminal donde corre `dotnet run`: el mensaje de error real aparece ahí. Suele ser un nombre mal escrito en el repositorio.

**Veo el JSON pero sin tildes correctas.**
Es normal y no afecta. .NET escapa algunos caracteres en JSON; los clientes (navegador, Postman) los interpretan bien.

---

**➡️ Siguiente:** [Crear empresas (POST)](03-crear-empresas.md)
