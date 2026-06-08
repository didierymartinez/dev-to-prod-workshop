# Lección 6.5 — Conectar la API a PostgreSQL

> ⏱️ 45 minutos · 🎯 **Al terminar:** tu API guardará las empresas en PostgreSQL de verdad. Verás el premio del refactor anterior: cambiar de memoria a base de datos toca **una línea** de registro; los endpoints no cambian.

---

## 🤔 El problema

Tienes PostgreSQL corriendo (6.2) y tu código preparado con interfaz + inyección de dependencias (6.4). Falta lo principal: una implementación del repositorio que, en vez de una lista en memoria, lea y escriba en la base de datos.

---

## 💡 Conceptos

### EF Core: el traductor entre objetos y tablas

Escribir SQL a mano para cada operación es tedioso y propenso a errores. **Entity Framework Core (EF Core)** es un **ORM**: traduce automáticamente entre tus objetos C# (`Empresa`) y las filas de una tabla SQL. Tú trabajas con objetos; EF Core genera el SQL por ti.

### DbContext: el puente con la base de datos

El **`DbContext`** es la clase que representa tu conexión a la base de datos y sus tablas. Un `DbSet<Empresa>` dentro de él equivale a la tabla `Empresas`.

### Migraciones: crear la tabla a partir de tu modelo

Para crear la tabla `Empresas` no escribiremos SQL a mano: EF Core la genera a partir de tu modelo, mediante una **migración**. En esta lección generaremos solo la primera, para que la tabla exista y la API funcione. **Las migraciones son un tema importante por sí mismas** — qué son, cómo versionan la base de datos y cómo se usan para evolucionarla sin perder datos — así que tienen su propia lección a continuación (6.6). Por ahora, basta saber que es "el comando que crea la tabla".

---

## 🛠️ Manos a la obra

### Paso 1: Instalar EF Core y el conector de PostgreSQL

En la carpeta del proyecto de la API:

```bash
cd src/GestionEmpresas.Api
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
```

Y la herramienta de línea de comandos de EF (una sola vez en tu máquina):

```bash
dotnet tool install --global dotnet-ef
```

### Paso 2: El DbContext

Crea la carpeta `Data` y dentro `src/GestionEmpresas.Api/Data/AppDbContext.cs`:

```csharp
using GestionEmpresas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionEmpresas.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Empresa> Empresas => Set<Empresa>();   // la tabla "Empresas"

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Empresa>(e =>
        {
            e.HasKey(x => x.Nit);                                  // el NIT identifica cada empresa
            e.Property(x => x.RazonSocial).IsRequired().HasMaxLength(200);
            e.Property(x => x.Plan).IsRequired().HasMaxLength(50);
        });
    }
}
```

- `DbSet<Empresa> Empresas` le dice a EF Core que habrá una tabla de empresas.
- `OnModelCreating` afina detalles: el NIT es la llave primaria; la razón social es obligatoria y máximo 200 caracteres.

### Paso 3: La implementación de base de datos del repositorio

Crea `src/GestionEmpresas.Api/Repositorio/EmpresaRepositorioDb.cs`:

```csharp
using GestionEmpresas.Api.Data;
using GestionEmpresas.Api.Models;

namespace GestionEmpresas.Api.Repositorio;

// Cumple el MISMO contrato que la versión en memoria, pero usando la base de datos
public class EmpresaRepositorioDb(AppDbContext db) : IEmpresaRepositorio
{
    public IEnumerable<Empresa> ObtenerTodas() =>
        db.Empresas.OrderBy(e => e.RazonSocial).ToList();

    public Empresa? ObtenerPorNit(string nit) =>
        db.Empresas.FirstOrDefault(e => e.Nit == nit);

    public Empresa Crear(CrearEmpresaRequest req)
    {
        var empresa = new Empresa { Nit = req.Nit, RazonSocial = req.RazonSocial, Plan = req.Plan };
        db.Empresas.Add(empresa);
        db.SaveChanges();          // ← esto escribe en PostgreSQL
        return empresa;
    }

    public bool Eliminar(string nit)
    {
        var empresa = ObtenerPorNit(nit);
        if (empresa is null) return false;
        db.Empresas.Remove(empresa);
        db.SaveChanges();
        return true;
    }
}
```

Fíjate: implementa `IEmpresaRepositorio` (el mismo contrato de 6.4), pero por dentro usa `db` (el DbContext) en lugar de una lista. `SaveChanges()` confirma los cambios en la base de datos.

### Paso 4: La connection string (sin secretos en el código)

Crea `src/GestionEmpresas.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "BaseDatos": "Host=localhost;Port=5432;Database=empresasdb;Username=appuser;Password=Clave_Local_2024"
  }
}
```

> ⚠️ Este archivo **ya está ignorado por Git** (la regla `appsettings.*.json` del `.gitignore` que creaste en la Fase 2). Por eso la contraseña no llegará a GitHub. Comprueba con `git status` que **no** aparece — es normal y a propósito: lo ignoramos para que la contraseña nunca se suba.

### Paso 5: El cambio clave en `Program.cs`

Aquí está el premio. En `Program.cs` solo vas a **agregar** el registro del DbContext y **cambiar una línea** (la que decide qué repositorio usar). **No reemplaces todo el archivo**: tus endpoints de la lección 6.4 se quedan intactos — abajo, el `// …` marca dónde siguen, sin tocarlos.

```csharp
using GestionEmpresas.Api.Data;
using GestionEmpresas.Api.Repositorio;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontend", policy =>
        policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
              .AllowAnyHeader().AllowAnyMethod());
});

// NUEVO: registrar la conexión a la base de datos
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("BaseDatos")));

// EL CAMBIO DE UNA LÍNEA:
//   antes:  AddSingleton<IEmpresaRepositorio, EmpresaRepositorioMemoria>()
//   ahora:
builder.Services.AddScoped<IEmpresaRepositorio, EmpresaRepositorioDb>();

var app = builder.Build();

// NUEVO: aplicar migraciones al arrancar (crea/actualiza las tablas)
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();

app.UseCors("PermitirFrontend");

// ⬇️ TUS ENDPOINTS NO CAMBIAN NI UNA LÍNEA ⬇️
app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");
app.MapGet("/empresas", (IEmpresaRepositorio repo) => repo.ObtenerTodas());
// … AQUÍ SIGUEN TUS ENDPOINTS POST, GET /empresas/{nit} y DELETE de la 6.4, SIN CAMBIOS (no los borres) …

app.Run();
```

> 🧠 **Este es el momento que preparamos en 6.4.** Para pasar de memoria a base de datos cambiaste la **línea de registro** (`AddSingleton…Memoria` → `AddScoped…Db`) y agregaste la conexión. Los **endpoints no se tocaron**. Eso es el valor de las interfaces y la inyección de dependencias.
>
> ¿Por qué `AddScoped` y no `AddSingleton`? Porque el repositorio de base de datos usa el `DbContext`, que debe crearse **uno por cada petición** (no compartirse). `AddScoped` hace justo eso. El framework se encarga del resto.

### Paso 6: Crear la primera migración y arrancar

Genera la primera migración (EF Core mira tu modelo y escribe cómo crear la tabla):

```bash
dotnet ef migrations add Inicial
```

Esto crea una carpeta `Migrations/`. Ahora arranca la API: al iniciar, el `Database.Migrate()` aplicará la migración y **creará la tabla** en PostgreSQL.

```bash
dotnet run
```

Verás que arranca sin errores. Tu API ya está conectada a PostgreSQL.

> 🧠 No te preocupes si el comando `migrations add` aún te resulta misterioso: en la **próxima lección** abrirás esa migración, entenderás exactamente qué es y para qué sirve, y la usarás para hacer crecer la base de datos.

### Paso 7: Guardar el avance

```bash
cd ../..
git checkout -b feat/persistencia-postgresql
git add .
git commit -m "guardar empresas en PostgreSQL con EF Core (cambio de repositorio vía DI)"
git push -u origin feat/persistencia-postgresql    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] La API arranca sin errores con `dotnet run`.
- [ ] Existe la carpeta `Migrations/` con la migración `Inicial`.
- [ ] La tabla existe: entra con `docker exec -it empresas-db psql -U appuser -d empresasdb` y ejecuta `\dt` → debe aparecer `Empresas`.
- [ ] El único cambio para usar la base de datos fue el **registro** (más la conexión y la nueva clase); los endpoints quedaron intactos.

---

## 🧠 Lo que aprendiste

- **EF Core** traduce entre objetos C# y tablas SQL; el **`DbContext`** es el puente.
- Una **migración** versiona la estructura de la base de datos y la crea por ti.
- Gracias a la interfaz + DI, cambiar de memoria a base de datos fue cambiar **el registro**, no los endpoints.
- La **connection string** vive en `appsettings.Development.json`, ignorado por Git.

---

## 🆘 Si algo salió mal

**"dotnet ef" no se reconoce.**
Falta la herramienta: `dotnet tool install --global dotnet-ef`. Abre una terminal nueva después de instalarla.

**Al arrancar: "Npgsql ... could not connect" / "Connection refused".**
PostgreSQL no está corriendo. Verifica con `docker ps`; si no aparece `empresas-db`, arráncalo (`docker start empresas-db`) o vuelve a crearlo (6.2).

**"password authentication failed".**
La contraseña de `appsettings.Development.json` no coincide con la del `docker run` (Paso 2 de 6.2). Deben ser idénticas (`Clave_Local_2024`).

**`dotnet ef migrations add` falla pidiendo el paquete Design.**
Instala `Microsoft.EntityFrameworkCore.Design` (Paso 1).

---

**➡️ Siguiente:** [Migraciones: versionar y evolucionar la base de datos](06-migraciones.md)
