# Lección 2.4 — Leer un archivo y buscar

> ⏱️ 35 minutos · 🎯 **Al terminar:** tu programa leerá las empresas desde un archivo externo (no escritas en el código), permitirá buscar una por su NIT y no se caerá si el archivo está dañado.

---

## 🤔 El problema

Hasta ahora las empresas están **escritas dentro del código**. Eso es malo: para cambiar los datos hay que tocar y recompilar el programa. En el mundo real, los datos viven **afuera** (en un archivo o una base de datos) y el programa los **lee**. Demos el primer paso: leer las empresas desde un archivo.

---

## 💡 Conceptos

### Datos separados del código

Un buen programa separa la **lógica** (qué hace) de los **datos** (con qué trabaja). Vamos a poner las empresas en un archivo de texto con formato **JSON**.

### ¿Qué es JSON?

**JSON** es un formato de texto para representar datos, entendido por casi todos los lenguajes. Una empresa en JSON se ve así:

```json
{ "Nit": "900123456-1", "RazonSocial": "Constructora del Norte S.A.S.", "Plan": "Empresarial", "Activa": true }
```

Es legible para humanos y para programas. Lo verás por todas partes en el resto del taller (las APIs hablan JSON).

### Leer un archivo puede fallar

¿Qué pasa si el archivo no existe, o alguien lo editó mal y quedó con un formato roto? Un programa profesional **no se cae**: detecta el problema y avisa con un mensaje claro. Para eso se usa `try / catch` ("intenta esto; si falla, haz esto otro").

---

## 🛠️ Manos a la obra

### Paso 1: Crear el archivo de datos

En `src/GestionEmpresas.Consola/`, crea un archivo llamado `empresas.json` con este contenido:

```json
[
  { "Nit": "900123456-1", "RazonSocial": "Constructora del Norte S.A.S.", "Plan": "Empresarial", "Activa": true },
  { "Nit": "830456789-2", "RazonSocial": "Interprensa Ltda.",             "Plan": "Profesional", "Activa": true },
  { "Nit": "901222333-4", "RazonSocial": "Consorcio Alquiler S.A.",        "Plan": "Básico",      "Activa": false }
]
```

Los corchetes `[ ]` indican una **lista**; cada `{ }` es una empresa.

### Paso 2: Hacer que el archivo se copie al compilar

.NET necesita saber que ese archivo debe estar disponible al ejecutar. Abre `GestionEmpresas.Consola.csproj` y, dentro de `<Project>`, agrega:

```xml
  <ItemGroup>
    <None Update="empresas.json" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
```

> 🧠 Esto le dice a .NET: *"cuando compiles, lleva `empresas.json` junto al programa"*. Sin esto, el programa no encontraría el archivo al ejecutarse.

### Paso 3: Leer el archivo en el programa

Reemplaza el contenido de `Program.cs` por:

```csharp
using System.Text.Json;

var archivo = "empresas.json";

// Leer y convertir el JSON en una lista de empresas
List<Empresa> empresas;
try
{
    var contenido = File.ReadAllText(archivo);
    empresas = JsonSerializer.Deserialize<List<Empresa>>(contenido) ?? new List<Empresa>();
}
catch (FileNotFoundException)
{
    Console.WriteLine($"No se encontró el archivo {archivo}.");
    return;
}
catch (JsonException)
{
    Console.WriteLine($"El archivo {archivo} tiene un formato inválido. Revísalo.");
    return;
}

Console.WriteLine($"Empresas registradas: {empresas.Count}\n");
foreach (var empresa in empresas)
{
    var estado = empresa.Activa ? "activa" : "inactiva";
    Console.WriteLine($"- {empresa.RazonSocial} (NIT {empresa.Nit}) — {empresa.Plan}, {estado}");
}

record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

Desglose de lo nuevo:
- `using System.Text.Json;` (arriba del todo) habilita las herramientas para leer JSON.
- `File.ReadAllText(archivo)` lee todo el texto del archivo.
- `JsonSerializer.Deserialize<List<Empresa>>(...)` convierte ese texto JSON en una lista de empresas de verdad.
- `?? new List<Empresa>()` significa: "si la conversión da vacío, usa una lista vacía" (evita errores).
- `try { ... } catch (...) { ... }` intenta leer; si el archivo no existe o está mal, muestra un mensaje y termina con `return` en lugar de reventar.

Ejecuta:
```bash
dotnet run
```
Verás las empresas, pero ahora **leídas del archivo**. Cambia un dato en `empresas.json` (por ejemplo, un nombre), guarda, ejecuta otra vez: cambió sin tocar el código. Esa es la idea.

### Paso 4: Buscar una empresa por su NIT

Agrega, antes del `record`:

```csharp
Console.Write("\nBuscar empresa por NIT (Enter para salir): ");
var nitBuscado = Console.ReadLine();

if (!string.IsNullOrWhiteSpace(nitBuscado))
{
    var encontrada = empresas.FirstOrDefault(e => e.Nit == nitBuscado);
    if (encontrada != null)
        Console.WriteLine($"→ {encontrada.RazonSocial}, plan {encontrada.Plan}");
    else
        Console.WriteLine($"→ No hay ninguna empresa con NIT {nitBuscado}.");
}
```

Desglose:
- `Console.ReadLine()` lee lo que el usuario escriba en la terminal.
- `string.IsNullOrWhiteSpace(...)` verifica si no escribió nada (para salir).
- `empresas.FirstOrDefault(e => e.Nit == nitBuscado)` busca la **primera** empresa cuyo Nit coincida; si no hay, devuelve "nada" (`null`).
- El `if (encontrada != null)` decide qué mensaje mostrar.

Ejecuta, y cuando te pregunte, escribe `900123456-1`. Debe encontrar a Constructora del Norte.

> 💥 **Rompe algo a propósito:** abre `empresas.json` y borra una coma o un corchete para dañar el formato. Ejecuta. En lugar de reventar, tu programa muestra "formato inválido". Repáralo. Acabas de ver para qué sirve el `try/catch`.

### Paso 5: Guardar el avance

```bash
cd ../..
git checkout -b feat/leer-archivo-y-buscar
git add .
git commit -m "leer empresas desde archivo JSON y permitir búsqueda por NIT"
git push -u origin feat/leer-archivo-y-buscar    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] El programa lee las empresas desde `empresas.json` (cambiar el archivo cambia la salida, sin recompilar el código fuente a mano).
- [ ] La búsqueda por NIT encuentra una empresa existente y avisa cuando no existe.
- [ ] Si dañas el JSON, el programa muestra un mensaje claro en vez de caerse.

---

## 🧠 Lo que aprendiste

- Los **datos** deben vivir separados del **código** (aquí, en un archivo JSON).
- **JSON** es el formato de datos universal que usarás en todo el taller.
- `File.ReadAllText` lee archivos; `JsonSerializer.Deserialize` convierte JSON en objetos.
- `try / catch` evita que el programa se caiga ante errores previsibles.
- `FirstOrDefault` busca un elemento en una lista según una condición.

---

## 🆘 Si algo salió mal

**"No se encontró el archivo empresas.json" aunque existe.**
Falta el paso 2 (copiar el archivo al compilar). Revisa el `.csproj` y vuelve a `dotnet run`.

**El programa no espera mi búsqueda / se salta el `ReadLine`.**
Asegúrate de ejecutar con `dotnet run` desde la terminal (no desde un botón del editor que no tenga consola interactiva).

**Cambié el JSON y no se reflejó.**
Guarda el archivo y vuelve a `dotnet run` (recompila y recopia el archivo).

---

**➡️ Siguiente fase:** [Fase 3 — Cómo se comunican los programas](../03-como-se-comunican-http/README.md)
