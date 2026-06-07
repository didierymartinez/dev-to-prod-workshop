# Lección 2.3 — Trabajar con datos: las empresas

> ⏱️ 35 minutos · 🎯 **Al terminar:** sabrás representar una empresa en código, guardar varias en una lista y recorrerlas para mostrarlas. Son los ladrillos de cualquier programa.

---

## 🤔 El problema

Nuestro programa imprime texto fijo. Pero el sistema debe manejar **datos**: varias empresas, cada una con su NIT, razón social, plan y estado. Necesitamos una forma de representar "una empresa" en código y de guardar "muchas empresas" juntas.

---

## 💡 Conceptos

### Un modelo: la forma de un dato

En el mundo real, una empresa cliente tiene datos: NIT, razón social, plan, si está activa. En código, definimos un **modelo** que describe esa forma. En C#, una manera simple es un **`record`**:

```csharp
record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

Esto dice: *"una `Empresa` tiene un Nit (texto), una RazonSocial (texto), un Plan (texto) y un campo Activa (verdadero/falso)"*.

- `string` = texto.
- `bool` = un valor que solo puede ser verdadero (`true`) o falso (`false`).

### Una lista: muchos datos juntos

Una **lista** (`List`) guarda varios elementos del mismo tipo. Una `List<Empresa>` es "una lista de empresas". El `<Empresa>` indica qué tipo de cosas contiene.

### Recorrer una lista: `foreach`

Para hacer algo con cada elemento de una lista, usamos un ciclo **`foreach`**: *"para cada empresa en la lista, haz esto"*.

---

## 🛠️ Manos a la obra

### Paso 1: Crear unas empresas y guardarlas en una lista

Abre `src/GestionEmpresas.Consola/Program.cs` y reemplaza su contenido:

```csharp
// Definimos algunas empresas clientes de ejemplo
var empresas = new List<Empresa>
{
    new Empresa("900123456-1", "Constructora del Norte S.A.S.", "Empresarial", true),
    new Empresa("830456789-2", "Interprensa Ltda.",             "Profesional", true),
    new Empresa("901222333-4", "Consorcio Alquiler S.A.",        "Básico",      false),
};

Console.WriteLine($"Empresas registradas: {empresas.Count}");

// El modelo va al final del archivo
record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

Desglose:
- `new List<Empresa> { ... }` crea una lista con tres empresas dentro.
- `new Empresa(...)` crea una empresa con sus datos, en el orden del modelo.
- `empresas.Count` es la **cantidad** de elementos en la lista.
- El `$"...{empresas.Count}..."` es texto con un valor insertado: lo que va entre `{}` se reemplaza por su valor. (Se llama *interpolación*.)

Ejecuta:
```bash
dotnet run
```
Debe imprimir: `Empresas registradas: 3`.

### Paso 2: Mostrar cada empresa (recorrer con `foreach`)

Agrega, **antes** de la línea del `record`:

```csharp
Console.WriteLine();
foreach (var empresa in empresas)
{
    var estado = empresa.Activa ? "activa" : "inactiva";
    Console.WriteLine($"- {empresa.RazonSocial} (NIT {empresa.Nit}) — plan {empresa.Plan}, {estado}");
}
```

Desglose:
- `foreach (var empresa in empresas)` → "para cada `empresa` dentro de `empresas`, haz lo de las llaves".
- `empresa.RazonSocial` → accede a un dato de esa empresa (con el punto).
- `empresa.Activa ? "activa" : "inactiva"` → si `Activa` es verdadero, usa `"activa"`; si no, `"inactiva"`. (Se llama *operador ternario*: una decisión corta.)

Ejecuta de nuevo. Verás las tres empresas, cada una en su línea, con su estado en palabras.

### Paso 3: Un cálculo útil — cuántas están activas

Antes del `record`, agrega:

```csharp
var activas = 0;
foreach (var empresa in empresas)
{
    if (empresa.Activa)
    {
        activas = activas + 1;
    }
}
Console.WriteLine($"\nActivas: {activas} de {empresas.Count}");
```

Desglose:
- `var activas = 0;` crea una variable que empieza en cero y irá contando.
- `if (empresa.Activa) { ... }` → "si la empresa está activa, haz lo de adentro". Esto es un **condicional**.
- `activas = activas + 1;` suma uno al contador.
- `\n` dentro del texto produce un salto de línea.

Ejecuta. Al final verás: `Activas: 2 de 3`.

### Paso 4: Guardar el avance

Crea una rama, commitea y abre un PR (ya es rutina). Desde la terminal:
```bash
cd ../..
git checkout -b feat/modelo-empresas
git add .
git commit -m "modelar empresas en una lista y mostrarlas con su estado"
git push -u origin feat/modelo-empresas    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

- [ ] El programa imprime las 3 empresas, cada una con su NIT, plan y estado en palabras.
- [ ] Imprime correctamente "Activas: 2 de 3".
- [ ] Puedes explicar qué hacen `foreach`, `if` y el modelo `record Empresa`.

> 💡 **Reto opcional:** agrega una cuarta empresa a la lista y vuelve a ejecutar. ¿El conteo se ajusta solo? (Debería.)

---

## 🧠 Lo que aprendiste

- Un **modelo** (`record Empresa`) describe la forma de un dato.
- Una **`List<Empresa>`** guarda muchas empresas juntas; `.Count` dice cuántas hay.
- **`foreach`** recorre una lista; **`if`** toma decisiones.
- La **interpolación** `$"...{valor}..."` inserta valores dentro de un texto.

---

## 🆘 Si algo salió mal

**Error: "Empresa no existe" o similar.**
Asegúrate de que la línea `record Empresa(...)` esté en el archivo (puede ir al final). Sin el modelo, el programa no sabe qué es una `Empresa`.

**Las tildes o la "ñ" se ven raras en la terminal.**
Es un tema de codificación de la consola, no de tu programa. No afecta el aprendizaje; lo ignoramos por ahora.

**Cambié algo y ahora no compila.**
Lee el error (archivo + línea). Lo más común: una coma de más o de menos en la lista, o una comilla sin cerrar.

---

**➡️ Siguiente:** [Consultas y métodos sobre los datos](04-consultas-y-metodos.md)
