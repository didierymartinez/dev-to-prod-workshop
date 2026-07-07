# Lección 2.4 — Trabajar con datos: las empresas

> ⏱️ 40 minutos · 🎯 **Al terminar:** sabrás representar una empresa en código, guardar varias en una lista y recorrerlas para mostrarlas. Son los ladrillos de cualquier programa.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte** — ninguna línea aparece sin explicarse. Luego **predices** qué hará antes de correrlo. Y al final de cada paso hay un **"Ahora tú"**: un cambio pequeño para que apliques lo que acabas de ver. No tienes que inventar nada de cero; sí tienes que entender lo que escribes. El commit del final lo comprueba.

---

## 🤔 El problema

Nuestro programa imprime texto fijo. Pero el sistema debe manejar **datos**: varias empresas, cada una con su NIT, razón social, plan y estado. Necesitamos una forma de representar "una empresa" en código y de guardar "muchas empresas" juntas.

---

## 🛠️ Manos a la obra

Partimos del `Program.cs` de la lección 2.2.

### Paso 1 · Guardar empresas en una lista

**Te muestro.** Reemplaza el contenido de `Program.cs` por esto. Léelo sin miedo: debajo te explico cada pieza.

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

**Te explico**, de abajo hacia arriba (empezando por el modelo):

> 🆕 **El modelo `record`.** `record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);` declara la **forma** de una empresa: qué datos tiene. `string` = texto; `bool` = solo `true` (verdadero) o `false` (falso). Esta línea no crea ninguna empresa todavía; solo dice "así es una `Empresa`".

> 🆕 **Crear con `new`.** `new Empresa("900123456-1", "...", "...", true)` **fabrica** una empresa concreta, dándole sus cuatro datos **en el mismo orden** del `record`. Cada `new Empresa(...)` es una empresa distinta.

> 🆕 **La lista `List` y `var`.** `new List<Empresa> { ... }` crea una **lista**: muchas empresas juntas. El `<Empresa>` dice qué contiene. Y `var empresas = ...` crea una **variable** (una caja con nombre) llamada `empresas`; `var` significa "C#, deduce tú el tipo" — ve que a la derecha hay una lista de empresas y lo entiende solo.

> 🆕 **Imprimir un valor con `$`.** `$"Empresas registradas: {empresas.Count}"`: el `$` **antes** de la comilla activa el reemplazo de lo que va entre `{}` (se llama **interpolación**). `empresas.Count` es cuántos elementos tiene la lista. Sin el `$`, se imprimiría literalmente `{empresas.Count}`.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué número va a imprimir?* Escríbelo. Ahora corre `dotnet run`. Debe decir `Empresas registradas: 3`.

> ✋ **Ahora tú.** Agrega una **cuarta** empresa a la lista (inventa sus datos) y vuelve a correr. *¿El número cambió solo, sin que tú tocaras la línea del `Console.WriteLine`?*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

Agrega una línea más dentro de las llaves de la lista:
```csharp
    new Empresa("901555777-8", "Mi Empresa Nueva S.A.S.", "Profesional", true),
```
Al correr, ahora dice `Empresas registradas: 4`. El `Console.WriteLine` no cambió: `empresas.Count` se ajusta solo porque la lista tiene un elemento más.
</details>

### Paso 2 · Mostrar cada empresa

**Te muestro.** Agrega esto **antes** de la línea del `record` (después del `Console.WriteLine` del Paso 1):

```csharp
Console.WriteLine();
foreach (var empresa in empresas)
{
    var estado = empresa.Activa ? "activa" : "inactiva";
    Console.WriteLine($"- {empresa.RazonSocial} (NIT {empresa.Nit}) — {empresa.Plan}, {estado}");
}
```

**Te explico:**

> 🆕 **Recorrer con `foreach`.** `foreach (var empresa in empresas) { ... }` se lee: *"para cada `empresa` dentro de `empresas`, haz lo de las llaves"*. Repite el bloque una vez por cada elemento de la lista.

> 🆕 **Acceder a un dato con el punto.** `empresa.RazonSocial` toma el dato `RazonSocial` de esa empresa. El punto (`.`) es "pídele a este objeto tal cosa".

> 🆕 **Decidir en corto (ternario).** `empresa.Activa ? "activa" : "inactiva"` es un **operador ternario**: *si* `Activa` es verdadero, vale `"activa"`; *si no*, `"inactiva"`. Elige entre dos valores según una condición.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿cuántas líneas con guion vas a ver, y cuál dirá "inactiva"?* Corre `dotnet run` y confírmalo.

> ✋ **Ahora tú.** Cambia el ternario para que muestre `"al día"` en vez de `"activa"` y `"suspendida"` en vez de `"inactiva"`. Corre y míralo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var estado = empresa.Activa ? "al día" : "suspendida";
```
Solo cambian los dos textos del ternario; lo demás queda igual.
</details>

### Paso 3 · Contar cuántas están activas

**Te muestro.** Agrega esto antes del `record`:

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

**Te explico:**

> 🆕 **Decidir con `if`.** `if (empresa.Activa) { ... }` ejecuta lo de adentro **solo si** la condición es verdadera. Es un **condicional**.

> 🆕 **Contar reasignando.** `var activas = 0;` crea un contador en cero. `activas = activas + 1;` **reasigna**: toma el valor actual de `activas`, le suma 1, y guarda el resultado otra vez en `activas`. Aquí el `=` no significa "son iguales"; significa "guarda a la izquierda lo de la derecha". El `\n` en el texto produce una línea en blanco.

> 🔮 **Predice, luego corre.** ¿Qué dirá la última línea? Corre y compruébalo: `Activas: 2 de 3` (o `de 4` si dejaste la cuarta empresa).

> 🔨 **Rómpelo (y entiende el `if`).** Cambia una empresa activa a `false` en la lista. **Antes de correr, predice:** ¿qué número dirá "Activas" ahora? Corre, compruébalo, y devuélvelo a `true`. *(Guarda tu respuesta para el commit.)*

Ahora, una pieza nueva que vas a necesitar en el "Ahora tú":

> 🆕 **Negar con `!`.** El signo `!` significa **"no"**: voltea verdadero↔falso. Si `empresa.Activa` es verdadero, `!empresa.Activa` es falso. Así, `if (!empresa.Activa)` entra cuando la empresa **NO** está activa. *(Este `!` reaparece en la próxima lección; entenderlo aquí te ahorra el dolor de cabeza allá.)*

> ✋ **Ahora tú.** Agrega el conteo de las **inactivas**, para imprimir también `Inactivas: 1 de 3`. Es como el bloque de activas, pero con la condición contraria usando el `!` que acabas de ver.

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
> - Cuando cambié una empresa a inactiva, el conteo de activas pasó de ... a ..., porque ...
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
- [ ] El programa imprime las empresas, cada una con su NIT, plan y estado en palabras.
- [ ] Imprime `Activas: 2 de 3` e `Inactivas: 1 de 3` (ajustado si agregaste empresas).

**Que entendiste:**
- [ ] Puedes explicar qué es un `record`, qué guarda una `List<Empresa>` y qué hace `foreach`.
- [ ] Predijiste el conteo antes de romper la lista, y coincidió con lo que salió (o entendiste por qué no).
- [ ] Puedes explicar por qué `if (empresa.Activa)` y `if (!empresa.Activa)` cuentan cosas distintas.

> 🚦 **Cómo te fue** (sé honesto contigo): 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó. Si marcaste 🟡 o 🔴, vuelve a leer el "Te explico" del paso antes de seguir. Trabarte aquí es normal — no significa que "no tienes bases".

---

## 🧠 Lo que aprendiste

- Un **modelo** (`record Empresa`) describe la forma de un dato; `new Empresa(...)` fabrica uno.
- Una **`List<Empresa>`** guarda muchas empresas juntas; `.Count` dice cuántas hay.
- **`foreach`** recorre una lista; **`if`** toma decisiones; el **ternario** `? :` elige entre dos valores.
- El **`!`** niega una condición: `!empresa.Activa` = "la empresa NO está activa".
- La **interpolación** `$"...{valor}..."` inserta valores dentro de un texto.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Es la señal de parar, no de seguir. Relee el "Te explico" del paso, línea por línea. Luego **predice** (🔮) qué hará el código antes de correrlo y **rómpelo** (🔨) cambiando una pieza. Entiendes algo de verdad cuando puedes predecir qué pasa si lo cambias.

**Error: "Empresa no existe" o similar.**
Asegúrate de que la línea `record Empresa(...)` esté en el archivo (puede ir al final). Sin el modelo, el programa no sabe qué es una `Empresa`.

**Las tildes o la "ñ" se ven raras en la terminal.**
Es un tema de codificación de la consola, no de tu programa. No afecta el aprendizaje; lo ignoramos por ahora.

**Cambié algo y ahora no compila.**
Lee el error (archivo + línea). Lo más común: una coma de más o de menos en la lista, o una comilla sin cerrar.

---

**➡️ Siguiente:** [Consultas y métodos sobre los datos](05-consultas-y-metodos.md)
