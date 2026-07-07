# Lección 6.4 — Interfaces e inyección de dependencias

> ⏱️ 40 minutos · 🎯 **Al terminar:** habrás reorganizado tu repositorio usando una **interfaz** y la **inyección de dependencias**, de modo que en la próxima lección puedas cambiar de "memoria" a "base de datos" tocando **una sola línea**. Tu API seguirá funcionando exactamente igual.

---

## 🤔 El problema

Estás a punto de hacer un cambio grande: que las empresas se guarden en PostgreSQL en vez de en memoria. Eso significa que tendrás **dos** repositorios:

- El de **memoria** (el actual, `EmpresaRepositorio`).
- Uno nuevo de **base de datos** (lo crearás en 6.5).

Surge la pregunta: ¿cómo hago que la API use el de base de datos **sin reescribir todos los endpoints**? Y más: la herramienta que usaremos para la base de datos (EF Core) **exige** una forma concreta de entregar el repositorio. Dos buenas razones para aprender, justo ahora, dos técnicas que usarás el resto de tu vida como desarrollador.

> 🧠 Fíjate que este es el momento correcto: no aprendimos esto antes "porque sí", sino **cuando aparece el problema que resuelve**. Así es como se entiende de verdad.

---

## 💡 Conceptos

### 1. La interfaz: un contrato

Una **interfaz** define **qué** se puede hacer, **sin decir cómo**. Es un contrato.

Piénsalo como el **rol** de "encargado de empresas": quien ocupe ese rol debe saber *obtener todas, buscar una, crear y eliminar*. No importa **quién** lo haga ni **cómo** — si cumple el contrato, sirve.

```
        IEmpresaRepositorio  (el contrato / rol)
        • ObtenerTodas()
        • ObtenerPorNit()
        • Crear()
        • Eliminar()
              ▲                    ▲
              │ lo cumple          │ lo cumple
   EmpresaRepositorioMemoria   EmpresaRepositorioDb
     (guarda en memoria)        (guarda en PostgreSQL)
```

Tus endpoints trabajarán con el **contrato** (`IEmpresaRepositorio`), no con una implementación concreta. Así, da igual quién esté detrás: memoria o base de datos.

### 2. La inyección de dependencias: que te lo entreguen

Hasta ahora, en tu `Program.cs` creabas el repositorio tú mismo: `var repo = new EmpresaRepositorio();`. El problema: los endpoints quedan "amarrados" a esa clase concreta.

Con la **inyección de dependencias (DI)** le das la vuelta: en un solo lugar **registras** *"cuando alguien necesite un `IEmpresaRepositorio`, entrégale esta implementación"*. Luego cada endpoint simplemente **pide** un `IEmpresaRepositorio`, y la aplicación se lo **entrega** (lo "inyecta").

> Analogía: un electrodoméstico no se suelda a la central eléctrica; tiene un **enchufe estándar**. Le da igual de dónde viene la luz. La interfaz es el enchufe; la DI es el sistema que conecta el aparato a la fuente que tú elijas. ¿Quieres cambiar la fuente? Cambias un cable en el tablero, no el electrodoméstico.

El beneficio que verás en 6.5: cambiar de memoria a base de datos será cambiar **una línea** de registro. Los endpoints ni se enteran.

---

## 🛠️ Manos a la obra

Este es un **refactor**: reorganizamos el código sin cambiar lo que hace. Al final, la API responde igual que antes.

### Paso 1: Extraer la interfaz

Abre `src/GestionEmpresas.Api/Repositorio/EmpresaRepositorio.cs`. Vamos a (1) agregar la interfaz y (2) renombrar la clase a `EmpresaRepositorioMemoria` y hacer que cumpla el contrato. Déjalo así:

```csharp
using GestionEmpresas.Api.Models;

namespace GestionEmpresas.Api.Repositorio;

// 1. EL CONTRATO: qué sabe hacer cualquier repositorio de empresas
public interface IEmpresaRepositorio
{
    IEnumerable<Empresa> ObtenerTodas();
    Empresa? ObtenerPorNit(string nit);
    Empresa Crear(CrearEmpresaRequest req);
    bool Eliminar(string nit);
}

// 2. UNA IMPLEMENTACIÓN: la de memoria (la que ya tenías), ahora "cumpliendo" el contrato
public class EmpresaRepositorioMemoria : IEmpresaRepositorio
{
    private readonly List<Empresa> _empresas =
    [
        new() { Nit = "900123456-1", RazonSocial = "Constructora del Norte S.A.S.", Plan = "Empresarial", Activa = true },
        new() { Nit = "830456789-2", RazonSocial = "Interprensa Ltda.",             Plan = "Profesional", Activa = true },
        new() { Nit = "901222333-4", RazonSocial = "Consorcio Alquiler S.A.",        Plan = "Básico",      Activa = false },
    ];

    public IEnumerable<Empresa> ObtenerTodas() => _empresas;
    public Empresa? ObtenerPorNit(string nit) => _empresas.FirstOrDefault(e => e.Nit == nit);

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

Lo único que cambió: agregamos la `interface IEmpresaRepositorio` y la clase ahora se llama `EmpresaRepositorioMemoria` y declara `: IEmpresaRepositorio` (promete cumplir el contrato). El cuerpo es idéntico.

### Paso 2: Registrar la dependencia y ajustar los endpoints

Abre `Program.cs`. Haremos tres cambios:

```csharp
using GestionEmpresas.Api.Repositorio;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontend", policy =>
        policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
              .AllowAnyHeader().AllowAnyMethod());
});

// CAMBIO 1: registrar la dependencia (en vez de "var repo = new ...")
//   "cuando alguien pida un IEmpresaRepositorio, entrégale un EmpresaRepositorioMemoria"
builder.Services.AddSingleton<IEmpresaRepositorio, EmpresaRepositorioMemoria>();

var app = builder.Build();

app.UseCors("PermitirFrontend");

app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");

// CAMBIO 2: cada endpoint ahora PIDE el repositorio (IEmpresaRepositorio repo); la app lo inyecta
app.MapGet("/empresas", (IEmpresaRepositorio repo) => repo.ObtenerTodas());

app.MapGet("/empresas/{nit}", (string nit, IEmpresaRepositorio repo) =>
    repo.ObtenerPorNit(nit) is Empresa e
        ? Results.Ok(e)
        : Results.NotFound(new { mensaje = $"No existe la empresa con NIT {nit}." }));

app.MapPost("/empresas", (CrearEmpresaRequest req, IEmpresaRepositorio repo) =>
{
    if (string.IsNullOrWhiteSpace(req.RazonSocial))
        return Results.BadRequest(new { mensaje = "La razón social es obligatoria." });
    if (string.IsNullOrWhiteSpace(req.Nit))
        return Results.BadRequest(new { mensaje = "El NIT es obligatorio." });

    var creada = repo.Crear(req);
    return Results.Created($"/empresas/{creada.Nit}", creada);
});

app.MapDelete("/empresas/{nit}", (string nit, IEmpresaRepositorio repo) =>
    repo.Eliminar(nit)
        ? Results.NoContent()
        : Results.NotFound(new { mensaje = $"No existe la empresa con NIT {nit}." }));

app.Run();
```

Los tres cambios respecto a la Fase 4:
1. **Quitamos** `var repo = new EmpresaRepositorio();`.
2. **Agregamos** la línea `AddSingleton<IEmpresaRepositorio, EmpresaRepositorioMemoria>()` (el registro).
3. Cada endpoint ahora **recibe** `IEmpresaRepositorio repo` como parámetro; la aplicación se lo inyecta.

> 🧠 `AddSingleton` significa "crea una sola instancia y compártela". Para datos en memoria es lo adecuado. En la próxima lección, al usar base de datos, cambiaremos a `AddScoped` (uno por petición) — la lección lo explicará. Lo importante: el **registro** es el único lugar donde se decide *qué* implementación se usa.

### Paso 3: Comprobar que todo sigue igual

> 🔮 **Predice, luego corre.** Hiciste un cambio estructural grande (interfaz + inyección). *¿La API responderá **distinto** que antes, o **idéntico**?* Piensa tu respuesta, luego arranca y pruébala.

```bash
cd src/GestionEmpresas.Api
dotnet run
```

Prueba tu API (Postman o el frontend): `GET /empresas`, crear, eliminar… **funciona idéntico a antes.** No cambiamos el comportamiento; cambiamos la estructura para que sea fácil de extender. Ese es el objetivo de un refactor.

> 🔨 **Rómpelo (y entiende la DI).** Comenta (con `//`) la línea `builder.Services.AddSingleton<IEmpresaRepositorio, EmpresaRepositorioMemoria>();`. **Predice:** ¿qué pasará al pedir `GET /empresas`? Corre y compruébalo (verás `Unable to resolve service for type IEmpresaRepositorio`). Reactiva la línea. Eso muestra que el **registro** es lo que conecta el contrato con su implementación. *(Guarda tu respuesta para el commit.)*

### Paso 4: Guardar el avance

```bash
cd ../..
git checkout -b refactor/interfaz-e-inyeccion
git add .
git commit -m "introducir IEmpresaRepositorio e inyección de dependencias"
git push -u origin refactor/interfaz-e-inyeccion    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Tu API responde **igual que antes** (GET, POST, DELETE con sus códigos).
- [ ] Existe la interfaz `IEmpresaRepositorio` y `EmpresaRepositorioMemoria` la implementa.
- [ ] En `Program.cs` hay **una** línea que registra qué implementación usar, y los endpoints **piden** el repositorio.

**Que entendiste:**
- [ ] Puedes explicar, con la analogía del enchufe, qué es una interfaz y qué es la inyección de dependencias.
- [ ] Tu predicción (¿la API cambia tras el refactor?) coincidió, y sabes qué pasó al comentar el registro.

> 🚦 **Cómo te fue:** 🟢 lo entendí y podría explicárselo a alguien · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una **interfaz** es un contrato: define *qué* se hace, no *cómo*. Permite tener varias implementaciones intercambiables.
- La **inyección de dependencias** hace que la app **entregue** la implementación registrada, en vez de que cada endpoint la cree.
- Cambiar de implementación = cambiar **una línea** de registro. Lo verás en acción en la próxima lección.
- Un **refactor** mejora la estructura sin cambiar el comportamiento.

---

## 🆘 Si algo salió mal

**Error: "EmpresaRepositorio no existe" o "no implementa el miembro de la interfaz".**
Asegúrate de renombrar la clase a `EmpresaRepositorioMemoria`, que diga `: IEmpresaRepositorio`, y que tenga los cuatro métodos del contrato con la misma firma.

**Error en los endpoints: "no se encuentra repo".**
Cada endpoint que use `repo` debe declararlo en sus paréntesis: `(IEmpresaRepositorio repo)` (junto a sus otros parámetros, como `string nit`).

**"Unable to resolve service for type IEmpresaRepositorio".**
Falta la línea `builder.Services.AddSingleton<IEmpresaRepositorio, EmpresaRepositorioMemoria>();` antes de `builder.Build()`.

---

**➡️ Siguiente:** [Conectar la API a PostgreSQL](05-conectar-la-api.md)
