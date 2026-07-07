# Lección 2.4 — Una lista: muchos valores juntos

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás guardar **muchos valores del mismo tipo** en una **lista** y recorrerlos uno por uno. Es el paso natural después de las variables.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte**. Luego **predices** qué hará antes de correrlo. Y al final de cada paso hay un **"Ahora tú"**: un cambio pequeño para practicar. No inventas nada de cero.

---

## 🤔 El problema

En la lección 2.3 guardaste **un** nombre en una variable. Pero la plataforma tiene **muchas** empresas. ¿Vas a crear `nombre1`, `nombre2`, `nombre3`… una variable por cada una? Con tres se puede; con cincuenta es imposible.

Necesitas una sola caja que guarde **muchos valores del mismo tipo**. Eso es una **lista**.

Partimos del proyecto de consola. Abre `src/GestionEmpresas.Consola/Program.cs`.

---

## 🛠️ Manos a la obra

### Paso 1 · Una lista guarda muchos valores

**Te muestro.** Reemplaza el contenido de `Program.cs` por esto:

```csharp
var nombres = new List<string>
{
    "Constructora del Norte",
    "Interprensa",
    "Consorcio Alquiler",
};

Console.WriteLine($"Tengo {nombres.Count} nombres guardados.");
```

**Te explico:**

> 🆕 **Qué es una lista.** `List<string>` es una **lista de textos**: una caja que guarda **muchos** valores, todos del mismo tipo. El `<string>` dice *qué tipo* contiene — aquí, textos. (Si fueran números sería `List<int>`.)
> - `new List<string> { "...", "...", }` crea la lista con esos valores dentro. Van separados por comas, entre llaves `{ }`.
> - `var nombres = ...` guarda esa lista en una variable llamada `nombres`.

> 🆕 **Cuántos hay: `.Count`.** `nombres.Count` es el **número de valores** en la lista. El punto (`.`) es "pídele a la lista tal cosa"; aquí, su cantidad.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué número va a decir?* Corre `dotnet run` y compáralo. Debe decir `Tengo 3 nombres guardados.`

> ✋ **Ahora tú.** Agrega un cuarto nombre a la lista y vuelve a correr. *¿El número cambió solo, sin que tocaras la línea del `Console.WriteLine`?*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

Agrega una línea más dentro de las llaves:
```csharp
    "Mi Empresa Nueva",
```
Ahora dice `Tengo 4 nombres guardados`: `nombres.Count` se ajusta solo.
</details>

### Paso 2 · Recorrer la lista con `foreach`

Tener los nombres guardados no sirve si no puedo **hacer algo con cada uno**. Quiero imprimirlos, uno por línea.

**Te muestro.** Debajo del `Console.WriteLine` anterior, agrega:

```csharp
foreach (var nombre in nombres)
{
    Console.WriteLine($"- {nombre}");
}
```

**Te explico:**

> 🆕 **Recorrer con `foreach`.** `foreach (var nombre in nombres) { ... }` se lee: *"para cada `nombre` dentro de `nombres`, haz lo de las llaves"*. Repite el bloque **una vez por cada valor** de la lista. En cada vuelta, `nombre` vale un elemento distinto.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿cuántas líneas con guion vas a ver?* Corre y compruébalo.

> ✋ **Ahora tú.** Cambia el texto para que cada línea diga `Empresa: {nombre}` en vez de `- {nombre}`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
foreach (var nombre in nombres)
{
    Console.WriteLine($"Empresa: {nombre}");
}
```
</details>

### Paso 3 · Un valor por su posición

A veces no quieres todos, sino **uno**: el primero, el segundo. En una lista, cada valor tiene una **posición**, y se empieza a contar desde **cero**.

**Te muestro.** Agrega:

```csharp
Console.WriteLine($"El primero es: {nombres[0]}");
```

**Te explico:**

> 🆕 **Posición con `[ ]`.** `nombres[0]` es el **primer** valor de la lista; `nombres[1]` el segundo, y así. Ojo: se cuenta **desde 0**, no desde 1. Por eso el primero es `[0]`.

> 🔮 **Predice, luego corre.** ¿Qué nombre imprimirá `nombres[0]`? Corre y míralo.

> 🔨 **Rómpelo (y entiende las posiciones).** Cambia `nombres[0]` por `nombres[10]` (una posición que no existe). **Antes de correr, predice:** ¿qué crees que pasará? Corre y lee el error (`Index was out of range`). Devuélvelo a `[0]`. *(Guarda tu respuesta para el commit.)*

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/una-lista
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "usar una lista de valores y recorrerla
>
> - Una lista sirve para ..., y se diferencia de una variable normal en que ...
> - El foreach hace ...
> - Cuando pedí nombres[10], pasó ..., porque las posiciones empiezan en ..."
> ```
> ```bash
> git push -u origin feat/una-lista
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa dice cuántos nombres hay y los imprime uno por línea.
- [ ] Imprime el primero con `nombres[0]`.

**Que entendiste:**
- [ ] Puedes explicar por qué una lista es mejor que muchas variables `nombre1`, `nombre2`…
- [ ] Puedes explicar qué hace `foreach`.
- [ ] Sabes por qué el primer elemento es `[0]` y qué pasó al pedir `[10]`.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó. Los 🟡/🔴 son para repasar.

---

## 🧠 Lo que aprendiste

- Una **`List<string>`** guarda muchos valores del mismo tipo; `.Count` dice cuántos hay.
- **`foreach`** recorre la lista y hace algo con cada valor.
- Cada valor tiene una **posición** que empieza en **0**: `nombres[0]` es el primero.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico" de cada paso. Luego **predice** (🔮) qué imprimirá antes de correr, y **rómpelo** (🔨) pidiendo una posición que no existe. Entiendes algo cuando puedes predecir qué pasa si lo cambias.

**Error `Index was out of range`.**
Pediste una posición que la lista no tiene (por ejemplo `[10]` en una lista de 4). Las posiciones van de `0` a `Count - 1`.

**Error: "; expected" o una coma.**
Revisa que cada valor de la lista termine en coma y cada instrucción en `;`.

---

**➡️ Siguiente:** [Un modelo: agrupar los datos de una empresa](05-un-modelo.md)
