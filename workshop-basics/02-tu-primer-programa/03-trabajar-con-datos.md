# Lección 2.3 — Trabajar con datos: las empresas

> ⏱️ 40 minutos · 🎯 **Al terminar:** sabrás representar una empresa en código, guardar varias en una lista y recorrerlas para mostrarlas. Son los ladrillos de cualquier programa.

> 🧭 **Cómo se aprende aquí.** No copias y pegas. Cada paso te muestra el resultado que quiero, tú lo intentas, y **luego** revelo una forma de hacerlo. Antes de ejecutar, **predices** qué va a pasar. La meta no es que "funcione": es que entiendas por qué funciona — y el commit del final lo comprueba.

---

## 🤔 El problema

Nuestro programa imprime texto fijo. Pero el sistema debe manejar **datos**: varias empresas, cada una con su NIT, razón social, plan y estado. Necesitamos una forma de representar "una empresa" en código y de guardar "muchas empresas" juntas.

---

## 💡 Un modelo: la forma de un dato

En el mundo real, una empresa cliente tiene datos: NIT, razón social, plan, si está activa. En código, definimos un **modelo** que describe esa forma. En C#, una manera simple es un **`record`**.

Eso es todo el concepto que necesitas por ahora. El resto (listas, recorrerlas, contar) lo vas a **descubrir construyéndolo**, paso a paso.

---

## 🛠️ Manos a la obra

Partimos del `Program.cs` de la lección 2.2.

### Paso 1 · Una empresa y una lista de empresas

Quiero guardar tres empresas y que el programa me diga cuántas hay:

```csharp
// Al correr debe imprimir:
// Empresas registradas: 3
```

> 🛠️ **Inténtalo tú.** En `Program.cs`: (1) crea una **lista** de empresas con las tres de abajo, (2) imprime cuántas hay, y (3) al final del archivo declara el **modelo** `Empresa`. *(Pistas: la lista se crea con `new List<Empresa> { ... }`; la cantidad es `empresas.Count`; el modelo es una sola línea: `record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
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
</details>

> 🆕 **Las piezas nuevas.**
> - `record Empresa(string Nit, ...)` declara la **forma** de una empresa: un `Nit` (texto), una `RazonSocial` (texto), un `Plan` (texto) y `Activa` (verdadero/falso). `string` = texto; `bool` = solo `true` o `false`.
> - `new` **fabrica** algo con esa forma. `new Empresa("900123456-1", ...)` crea una empresa dándole sus datos en el orden del `record`. `new List<Empresa> { ... }` crea una **lista** (muchas empresas juntas); el `<Empresa>` dice qué contiene.
> - `var empresas = ...` crea una **variable** (una caja con nombre) llamada `empresas`. `var` significa "deduce tú el tipo": C# ve que a la derecha hay una lista de empresas y lo entiende solo. Lo verás en casi toda variable.
> - `$"...{empresas.Count}..."`: el `$` **antes** de la comilla activa la **interpolación** — sin él, `{empresas.Count}` se imprimiría tal cual. Con él, lo que va entre `{}` se reemplaza por su valor. `empresas.Count` es cuántos elementos tiene la lista.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué número va a imprimir?* Escríbelo. Ahora corre `dotnet run`. Debe decir `Empresas registradas: 3`.

### Paso 2 · Mostrar cada empresa

Ahora quiero ver cada empresa en su línea, con su estado en palabras:

```
- Constructora del Norte S.A.S. (NIT 900123456-1) — Empresarial, activa
- ...
```

> 🛠️ **Inténtalo tú.** Antes de la línea del `record`, recorre la lista y muestra cada empresa. *(Pistas: `foreach (var empresa in empresas) { ... }` repite el bloque por cada una; para el estado en palabras usa `empresa.Activa ? "activa" : "inactiva"`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
Console.WriteLine();
foreach (var empresa in empresas)
{
    var estado = empresa.Activa ? "activa" : "inactiva";
    Console.WriteLine($"- {empresa.RazonSocial} (NIT {empresa.Nit}) — {empresa.Plan}, {estado}");
}
```
</details>

> 🆕 **Recorrer y decidir en corto.**
> - `foreach (var empresa in empresas)` se lee: *"para cada `empresa` dentro de `empresas`, haz lo de las llaves"*.
> - `empresa.RazonSocial` accede a un dato de esa empresa (con el punto).
> - `empresa.Activa ? "activa" : "inactiva"` es un **operador ternario**: *si* `Activa` es verdadero, usa `"activa"`; *si no*, `"inactiva"`. Una decisión corta que devuelve uno de dos valores.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿cuántas líneas con guion vas a ver, y cuál dirá "inactiva"?* Corre `dotnet run` y confírmalo.

### Paso 3 · Contar cuántas están activas

Quiero un total al final: `Activas: 2 de 3`.

> 🛠️ **Inténtalo tú.** Antes del `record`, cuenta las empresas activas recorriéndolas y sumando, e imprime el total. *(Pistas: parte de un contador `var activas = 0;`, dentro del `foreach` usa `if (empresa.Activa) { activas = activas + 1; }`, y al final imprime con `\n` para una línea en blanco antes.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

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
</details>

> 🆕 **Decidir con `if`.**
> - `if (empresa.Activa) { ... }` ejecuta lo de adentro **solo si** la condición es verdadera. Es un **condicional**.
> - `activas = activas + 1;` **reasigna** la variable: toma el valor actual de `activas`, le suma 1, y guarda el resultado otra vez en `activas`. El `=` no es "son iguales"; es "guarda a la izquierda lo de la derecha".
> - `\n` dentro del texto produce un salto de línea.

> 🔮 **Predice, luego corre.** ¿Qué dirá la última línea? Corre y compruébalo: `Activas: 2 de 3`.

> 🔨 **Rómpelo (y entiende el `if`).** Cambia una empresa activa a `false` en la lista (por ejemplo la primera). **Antes de correr, predice:** ¿qué número dirá ahora "Activas"? Corre y compruébalo. Devuélvelo a `true`. *(Guarda tu respuesta: la usarás en el commit.)*

### 🎯 El reto de la lección: contar las inactivas

Ya cuentas las **activas**. Ahora quiero, además, cuántas están **inactivas**: `Inactivas: 1 de 3`.

> 🛠️ **Inténtalo tú.** Agrega el conteo de inactivas. **Ojo:** no puedes copiar el bloque de activas tal cual — la condición tiene que ser la contraria. *(Pista: el `!` significa "no": `if (!empresa.Activa)` entra cuando la empresa **no** está activa.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var inactivas = 0;
foreach (var empresa in empresas)
{
    if (!empresa.Activa)
    {
        inactivas = inactivas + 1;
    }
}
Console.WriteLine($"Inactivas: {inactivas} de {empresas.Count}");
```

Verás el `!` de nuevo en la próxima lección, en `!string.IsNullOrWhiteSpace(...)`. Es el mismo "no".
</details>

### Paso final · Guardar el avance (el commit donde demuestras que entendiste)

Crea la rama y prepara los cambios:

```bash
cd ../..
git checkout -b feat/modelo-empresas
git add .
```

> 📓 **En el mensaje del commit, responde con TUS palabras** (no copies el texto de la lección). Reemplaza los `...`:
> ```bash
> git commit -m "modelar empresas en una lista y mostrarlas
>
> - Un 'record Empresa' sirve para ...
> - El foreach hace ...
> - Cuando cambié una empresa a inactiva, el conteo de activas pasó de ... a ...,
>   porque ...
> - El '!' en if (!empresa.Activa) sirve para ..."
> ```
> ```bash
> git push -u origin feat/modelo-empresas
> ```

Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

> 💡 **Por qué el commit se ve así.** Que el programa *corra* solo prueba que compila — copiar y pegar también corre. Escribir con tus palabras *por qué* funciona es lo que demuestra que de verdad lo entendiste. Si al escribirlo te trabas, esa es la pieza para repasar.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa imprime las 3 empresas, cada una con su NIT, plan y estado en palabras.
- [ ] Imprime `Activas: 2 de 3` e `Inactivas: 1 de 3`.

**Que entendiste:**
- [ ] Puedes explicar qué es un `record`, qué guarda una `List<Empresa>` y qué hace `foreach`.
- [ ] Predijiste el conteo antes de romper la lista, y coincidió con lo que salió (o entendiste por qué no).
- [ ] Puedes explicar por qué `if (empresa.Activa)` y `if (!empresa.Activa)` cuentan cosas distintas.

> 🚦 **Cómo te fue** (sé honesto contigo): 🟢 lo construí solo · 🟡 me costó / abrí la solución antes · 🔴 no me alcanzó. Si marcaste 🟡 o 🔴, vuelve a ese paso y usa el 🔮 y el 🔨. Trabarte aquí es normal — no significa que "no tienes bases".

---

## 🧠 Lo que aprendiste

- Un **modelo** (`record Empresa`) describe la forma de un dato.
- Una **`List<Empresa>`** guarda muchas empresas juntas; `.Count` dice cuántas hay.
- **`foreach`** recorre una lista; **`if`** toma decisiones; el **ternario** `? :` elige entre dos valores.
- El **`!`** niega una condición: `!empresa.Activa` = "la empresa NO está activa".
- La **interpolación** `$"...{valor}..."` inserta valores dentro de un texto.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Es la señal de parar, no de seguir. Vuelve al paso: primero **predice** (🔮) qué hará el código *antes* de correrlo; luego **rómpelo** (🔨) — cambia una pieza y mira qué se daña. Entiendes algo de verdad cuando puedes predecir qué pasa si lo cambias.

**Error: "Empresa no existe" o similar.**
Asegúrate de que la línea `record Empresa(...)` esté en el archivo (puede ir al final). Sin el modelo, el programa no sabe qué es una `Empresa`.

**Las tildes o la "ñ" se ven raras en la terminal.**
Es un tema de codificación de la consola, no de tu programa. No afecta el aprendizaje; lo ignoramos por ahora.

**Cambié algo y ahora no compila.**
Lee el error (archivo + línea). Lo más común: una coma de más o de menos en la lista, o una comilla sin cerrar.

---

**➡️ Siguiente:** [Consultas y métodos sobre los datos](04-consultas-y-metodos.md)
