# Lección 7.2 — Tu primera prueba

> ⏱️ 40 minutos · 🎯 **Al terminar:** habrás creado un proyecto de pruebas, escrito varias pruebas para tu repositorio de empresas y las habrás ejecutado, viéndolas pasar en verde.

---

## 🤔 El problema

Entendiste *por qué* probar. Ahora vas a escribir pruebas de verdad para tu sistema y ejecutarlas con un comando. Necesitas un lugar donde vivan las pruebas (un proyecto aparte) y una herramienta que las corra.

---

## 💡 Conceptos

### Un proyecto separado para las pruebas

Las pruebas viven en su **propio proyecto**, aparte de la aplicación. Así no se mezclan con el código que se despliega. Usaremos **xUnit**, la herramienta de pruebas más común en .NET.

### Cómo se ve una prueba en código

Una prueba es un método marcado con `[Fact]` (un "hecho" que debe cumplirse). Dentro usa **`Assert`** para verificar resultados:

- `Assert.NotNull(x)` → x no debe ser nulo.
- `Assert.Null(x)` → x debe ser nulo.
- `Assert.Equal(esperado, real)` → ambos deben ser iguales.
- `Assert.True(condición)` → la condición debe ser verdadera.

Si un `Assert` no se cumple, la prueba falla y te dice qué esperaba.

---

## 🛠️ Manos a la obra

### Paso 1: Crear el proyecto de pruebas

Desde la raíz de `gestion-empresas`:

```bash
dotnet new xunit -n GestionEmpresas.Tests -o tests/GestionEmpresas.Tests
dotnet sln add tests/GestionEmpresas.Tests/GestionEmpresas.Tests.csproj
```

Para que las pruebas puedan usar tus clases (`Empresa`, `EmpresaRepositorioMemoria`), el proyecto de pruebas necesita una **referencia** al de la API:

```bash
cd tests/GestionEmpresas.Tests
dotnet add reference ../../src/GestionEmpresas.Api/GestionEmpresas.Api.csproj
cd ../..
```

### Paso 2: Escribir las pruebas

El proyecto trae un archivo de ejemplo `UnitTest1.cs`. Bórralo y crea en su lugar `tests/GestionEmpresas.Tests/EmpresaRepositorioTests.cs`:

```csharp
using GestionEmpresas.Api.Models;
using GestionEmpresas.Api.Repositorio;

namespace GestionEmpresas.Tests;

public class EmpresaRepositorioTests
{
    [Fact]
    public void ObtenerTodas_DevuelveEmpresas()
    {
        // Preparar
        var repo = new EmpresaRepositorioMemoria();
        // Actuar
        var empresas = repo.ObtenerTodas();
        // Verificar
        Assert.NotEmpty(empresas);
    }

    [Fact]
    public void ObtenerPorNit_ConNitExistente_DevuelveLaEmpresa()
    {
        var repo = new EmpresaRepositorioMemoria();

        var empresa = repo.ObtenerPorNit("900123456-1");

        Assert.NotNull(empresa);
        Assert.Equal("Constructora del Norte S.A.S.", empresa!.RazonSocial);
    }

    [Fact]
    public void ObtenerPorNit_ConNitInexistente_DevuelveNull()
    {
        var repo = new EmpresaRepositorioMemoria();

        var empresa = repo.ObtenerPorNit("000");

        Assert.Null(empresa);
    }

    [Fact]
    public void Crear_AumentaLaCantidadDeEmpresas()
    {
        var repo = new EmpresaRepositorioMemoria();
        var cantidadAntes = repo.ObtenerTodas().Count();

        repo.Crear(new CrearEmpresaRequest("Nueva Empresa S.A.S.", "999000111-2", "Básico"));

        var cantidadDespues = repo.ObtenerTodas().Count();
        Assert.Equal(cantidadAntes + 1, cantidadDespues);
    }

    [Fact]
    public void Eliminar_ConNitExistente_QuitaLaEmpresa()
    {
        var repo = new EmpresaRepositorioMemoria();

        var resultado = repo.Eliminar("900123456-1");

        Assert.True(resultado);
        Assert.Null(repo.ObtenerPorNit("900123456-1"));
    }
}
```

Fíjate cómo cada prueba sigue **Preparar → Actuar → Verificar** (lo comenté en la primera; las demás tienen la misma forma). Cada `[Fact]` describe en su nombre qué comprueba.

### Paso 3: Ejecutar las pruebas

Desde la raíz del proyecto:

```bash
dotnet test
```

`dotnet test` compila y ejecuta todas las pruebas. Al final verás un resumen como:

```
Passed!  - Failed: 0, Passed: 5, Skipped: 0, Total: 5
```

**Cinco pruebas en verde.** Acabas de hacer que el computador verifique tu código por ti.

### Paso 4: Ver una prueba fallar (para reconocer el rojo)

Para saber cómo se ve un fallo, cámbialo a propósito un momento: en la prueba `ObtenerPorNit_ConNitInexistente_DevuelveNull`, cambia `Assert.Null` por `Assert.NotNull`. Ejecuta `dotnet test`:

```
Failed!  - Failed: 1, Passed: 4
  ...EmpresaRepositorioTests.ObtenerPorNit_ConNitInexistente_DevuelveNull
  Assert.NotNull() Failure
```

Te dice **qué** prueba falló y **por qué**. Devuelve el `Assert.Null` (déjalo como estaba) y vuelve a `dotnet test`: todo verde de nuevo.

> 🧠 Aprender a leer el rojo es tan importante como ver el verde: el mensaje de fallo te dice exactamente dónde mirar.

### Paso 5: Guardar el avance

```bash
git checkout -b feat/pruebas-repositorio
git add .
git commit -m "agregar proyecto de pruebas y tests del repositorio de empresas"
git push -u origin feat/pruebas-repositorio    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] `dotnet test` ejecuta y muestra `Passed: 5` (todas en verde).
- [ ] Reconoces cómo se ve una prueba fallida (la provocaste y la corregiste).
- [ ] Puedes señalar las partes Preparar / Actuar / Verificar en una de tus pruebas.

---

## 🧠 Lo que aprendiste

- Las pruebas viven en su **propio proyecto** (xUnit), con una **referencia** al proyecto de la API.
- Una prueba es un método `[Fact]` que usa `Assert` para verificar resultados.
- `dotnet test` ejecuta todas las pruebas y resume cuántas pasan/fallan.
- Un fallo te dice **qué** prueba y **por qué** — tu guía para corregir.

---

## 🆘 Si algo salió mal

**"El tipo o nombre EmpresaRepositorioMemoria no existe".**
Falta la referencia al proyecto de la API (Paso 1) o el `using GestionEmpresas.Api.Repositorio;`. Verifica ambos.

**`dotnet test` no encuentra pruebas.**
Asegúrate de borrar `UnitTest1.cs` (o dejarlo válido) y que tus métodos tengan el atributo `[Fact]`.

**Error al compilar el proyecto de pruebas.**
Corre `dotnet build` para ver el detalle. Suele ser un `using` faltante o un nombre mal escrito.

---

**➡️ Siguiente:** [Integración Continua con GitHub Actions](03-integracion-continua.md)
