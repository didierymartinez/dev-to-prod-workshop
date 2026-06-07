# Lección 2.4 — Consultas y métodos sobre los datos

> ⏱️ 35 minutos · 🎯 **Al terminar:** sabrás organizar tu código en **métodos** reutilizables y responder preguntas sobre los datos (buscar una empresa, contar las activas). Son exactamente las operaciones que tu API hará en la Fase 4.

---

## 🤔 El problema

Tu programa ya muestra todas las empresas. Pero en la práctica necesitas **responder preguntas** sobre ellas: *¿existe la empresa con tal NIT? ¿cuántas están activas?* Y conviene no amontonar toda la lógica suelta, sino organizarla en piezas con nombre que puedas reutilizar. Esas piezas se llaman **métodos**, y son la base de cómo se organiza cualquier programa serio — incluida tu futura API.

---

## 💡 Conceptos

### Un método: una operación con nombre

Un **método** (o función) es un bloque de código con un **nombre**, que puede recibir datos de entrada (**parámetros**) y devolver un resultado. Te permite:
- **Reutilizar**: escribes la lógica una vez y la "invocas" cuando quieras.
- **Ordenar**: cada método hace una cosa clara.

> Analogía: un método es como una receta con nombre ("preparar café"). La defines una vez y la usas cuando la necesitas, sin reescribir los pasos.

### Consultas cortas sobre listas

C# ofrece formas breves de trabajar con listas, sin escribir bucles a mano:
- `lista.FirstOrDefault(condición)` → devuelve el **primer** elemento que cumple la condición (o nada, si ninguno).
- `lista.Count(condición)` → **cuenta** cuántos cumplen la condición.

Las usarás todo el tiempo.

---

## 🛠️ Manos a la obra

Partimos del código de la lección 2.3 (la lista de empresas en memoria).

### Paso 1: Organizar la impresión en un método

Reemplaza el contenido de `Program.cs` por esto. Fíjate cómo la lógica de "mostrar" ahora vive en un método `MostrarTodas`:

```csharp
var empresas = new List<Empresa>
{
    new Empresa("900123456-1", "Constructora del Norte S.A.S.", "Empresarial", true),
    new Empresa("830456789-2", "Interprensa Ltda.",             "Profesional", true),
    new Empresa("901222333-4", "Consorcio Alquiler S.A.",        "Básico",      false),
};

// Invocamos los métodos (definidos más abajo)
MostrarTodas(empresas);
MostrarResumen(empresas);

// ─── Métodos ────────────────────────────────────────────────────────────
// (C# los reconoce aunque se definan debajo de donde se usan)

void MostrarTodas(List<Empresa> lista)
{
    Console.WriteLine($"Empresas registradas: {lista.Count}");
    foreach (var e in lista)
    {
        var estado = e.Activa ? "activa" : "inactiva";
        Console.WriteLine($"- {e.RazonSocial} (NIT {e.Nit}) — {e.Plan}, {estado}");
    }
}

void MostrarResumen(List<Empresa> lista)
{
    var activas = lista.Count(e => e.Activa);   // forma corta de contar (reemplaza el bucle de 2.3)
    Console.WriteLine($"\nActivas: {activas} de {lista.Count}");
}

record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

Desglose:
- `void MostrarTodas(List<Empresa> lista)` → un método llamado `MostrarTodas` que recibe una lista de empresas (`void` significa que no devuelve nada, solo imprime).
- `MostrarTodas(empresas);` → así se **invoca** el método, pasándole la lista.
- `lista.Count(e => e.Activa)` → cuenta las activas en una línea. El `e => e.Activa` se lee "para cada empresa `e`, ¿es activa?". Reemplaza el bucle manual que escribiste en 2.3 — más corto y claro.

Ejecuta para confirmar que sigue funcionando igual:
```bash
dotnet run
```

### Paso 2: Buscar una empresa por su NIT (un método que devuelve un resultado)

Agrega un método que **devuelve** una empresa (o nada). Añádelo entre los otros métodos:

```csharp
Empresa? BuscarPorNit(List<Empresa> lista, string nit) =>
    lista.FirstOrDefault(e => e.Nit == nit);
```

Desglose:
- `Empresa?` → el método **devuelve** una empresa, y el `?` indica que podría no encontrar ninguna (devolver "nada", `null`).
- `lista.FirstOrDefault(e => e.Nit == nit)` → busca la primera empresa cuyo NIT coincida.

Ahora úsalo, con interacción del usuario. Agrega esto **después** de `MostrarResumen(empresas);`:

```csharp
Console.Write("\nBuscar empresa por NIT (Enter para salir): ");
var nit = Console.ReadLine();

if (!string.IsNullOrWhiteSpace(nit))
{
    var encontrada = BuscarPorNit(empresas, nit);
    Console.WriteLine(encontrada is not null
        ? $"→ {encontrada.RazonSocial}, plan {encontrada.Plan}"
        : $"→ No existe una empresa con NIT {nit}.");
}
```

- `Console.ReadLine()` lee lo que el usuario escriba.
- Llamamos a `BuscarPorNit(...)` y, según haya encontrado o no, mostramos un mensaje distinto.

Ejecuta y prueba: escribe `900123456-1` (debe encontrarla) y luego un NIT inventado (debe avisar que no existe).

### Paso 3: La conexión con lo que viene

Mira los métodos que escribiste: `MostrarTodas` (obtener/listar) y `BuscarPorNit` (buscar uno). 

> 🧠 **Esto no es un ejercicio aislado.** En la Fase 4, tu API tendrá un objeto llamado "repositorio" con métodos casi idénticos: `ObtenerTodas()` y `ObtenerPorNit(nit)`. Lo que practicas aquí en la consola es exactamente la lógica que tu servicio web ofrecerá a otros programas. Estás construyendo la intuición que necesitarás.

### Paso 4: Guardar el avance

```bash
cd ../..
git checkout -b feat/consultas-y-metodos
git add .
git commit -m "organizar la lógica en métodos y agregar búsqueda por NIT"
git push -u origin feat/consultas-y-metodos    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] El programa muestra las empresas y el resumen de activas usando **métodos**.
- [ ] La búsqueda por NIT encuentra una empresa existente y avisa cuando no existe.
- [ ] Puedes explicar qué es un método, qué son sus parámetros y qué significa que devuelva un resultado.

> 💡 **Reto opcional:** crea un método `MostrarPorPlan(empresas, "Empresarial")` que muestre solo las empresas de un plan dado. Pista: usa `lista.Where(e => e.Plan == plan)` para filtrar.

---

## 🧠 Lo que aprendiste

- Un **método** es una operación con nombre, con **parámetros** (entradas) y, a veces, un valor de **retorno**.
- `FirstOrDefault(condición)` busca el primer elemento que cumple; `Count(condición)` cuenta los que cumplen.
- Organizar la lógica en métodos es la base de cómo se estructura una aplicación — incluida tu API (su repositorio tendrá métodos como estos).

---

## 🆘 Si algo salió mal

**Error: "el nombre BuscarPorNit no existe".**
Asegúrate de que el método esté escrito dentro del archivo (puede ir junto a los otros métodos, antes del `record`).

**El programa no espera mi búsqueda.**
Ejecuta con `dotnet run` desde la terminal (necesita una consola interactiva para `Console.ReadLine`).

**No entiendo el `e => e.Activa`.**
Léelo como "para cada empresa `e`, su propiedad `Activa`". Es una forma corta de expresar una condición sobre cada elemento. Lo verás mucho; con la práctica se vuelve natural.

---

**➡️ Siguiente fase:** [Fase 3 — Cómo se comunican los programas](../03-como-se-comunican-http/README.md)
