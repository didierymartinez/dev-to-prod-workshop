# Lección 2.5 — Un modelo: agrupar los datos de una empresa

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás crear un **modelo** que junta los varios datos de una empresa (NIT, razón social, plan, estado) en un solo objeto, y leer esos datos. Es el paso previo a manejar muchas empresas de verdad.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** y **te explico**; luego **predices**; y al final un **"Ahora tú"** de práctica. No inventas nada de cero.

---

## 🤔 El problema

En la lección 2.4 guardaste una lista de **nombres**. Pero una empresa es **más que un nombre**: tiene NIT, razón social, plan y si está activa — cuatro datos que van **juntos**.

¿Podrías tener una `List<string>` para los nombres, otra para los NIT, otra para los planes… todas alineadas por posición? Sí, pero es frágil: si borras un elemento de una y olvidas las demás, todo queda **desalineado** y mezclas datos de empresas distintas.

Mejor: **agrupar los cuatro datos de una empresa en un solo objeto**. Ese "molde" con la forma de una empresa se llama un **modelo**.

---

## 🛠️ Manos a la obra

### Paso 1 · Definir el modelo y crear una empresa

**Te muestro.** Reemplaza el contenido de `Program.cs` por esto:

```csharp
var norte = new Empresa("900123456-1", "Constructora del Norte S.A.S.", "Empresarial", true);

Console.WriteLine("Empresa creada.");

// El modelo va al final del archivo
record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

**Te explico:**

> 🆕 **El modelo `record`.** `record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);` declara la **forma** de una empresa: qué datos tiene y de qué tipo (`string` = texto, `bool` = verdadero/falso). Esta línea **no crea** ninguna empresa; solo dice "así es una `Empresa`". Es un molde.

> 🆕 **Crear una empresa con `new`.** `new Empresa("900123456-1", "...", "...", true)` **fabrica** una empresa concreta, dándole sus cuatro datos **en el mismo orden** del molde: primero el `Nit`, luego la `RazonSocial`, el `Plan` y por último `Activa`. La guardamos en la variable `norte`.

> 🔮 **Predice, luego corre.** Corre `dotnet run`. Debe decir `Empresa creada.` (todavía no mostramos sus datos: eso es el Paso 2).

> ✋ **Ahora tú.** Crea una **segunda** empresa en otra variable (por ejemplo `interprensa`), con datos inventados. *(Usa el mismo molde: `new Empresa(nit, razonSocial, plan, activa)`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var interprensa = new Empresa("830456789-2", "Interprensa Ltda.", "Profesional", true);
```
</details>

### Paso 2 · Leer los datos de la empresa

Una empresa creada no sirve si no puedo **usar sus datos**. Quiero imprimir una línea con ellos.

**Te muestro.** Agrega esto justo **encima** de la línea `record Empresa...`:

```csharp
Console.WriteLine(norte.RazonSocial);
Console.WriteLine($"{norte.RazonSocial} (NIT {norte.Nit}) — plan {norte.Plan}");
```

**Te explico:**

> 🆕 **Acceder a un dato con el punto.** `norte.RazonSocial` toma el dato `RazonSocial` **de esa** empresa. El punto (`.`) es "pídele a este objeto tal cosa". Así puedes leer cualquiera de sus cuatro campos: `norte.Nit`, `norte.Plan`, `norte.Activa`.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué dos líneas vas a ver?* Corre y compruébalo.

> 🔨 **Rómpelo (y descubre algo del `record`).** Intenta cambiar un dato: agrega la línea `norte.Plan = "Básico";`. **Antes de correr, predice:** ¿compilará? Corre `dotnet run` y lee el error. Un `record` protege sus datos: no se cambian después de crearlo. Borra esa línea. *(Guarda tu respuesta para el commit.)*

> ✋ **Ahora tú.** Imprime, en una sola línea, el `Nit` de `norte` y si está activa (`norte.Activa`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
Console.WriteLine($"NIT: {norte.Nit}, activa: {norte.Activa}");
```
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/un-modelo
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "modelar una empresa con un record
>
> - Un modelo (record) sirve para ...
> - La diferencia entre declarar el record y crear una empresa con new es ...
> - Cuando intenté cambiar norte.Plan, pasó ..., porque un record ..."
> ```
> ```bash
> git push -u origin feat/un-modelo
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa crea una empresa y muestra sus datos en una línea.

**Que entendiste:**
- [ ] Puedes explicar por qué agrupar los datos en un modelo es mejor que varias listas paralelas.
- [ ] Puedes explicar la diferencia entre **declarar** el `record` y **crear** una empresa con `new`.
- [ ] Sabes qué pasó al intentar cambiar `norte.Plan` y por qué.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Un **modelo** (`record Empresa`) describe la **forma** de un dato: junta varios campos que van juntos.
- `new Empresa(...)` **fabrica** una empresa concreta, pasándole sus datos en el orden del molde.
- Se leen sus campos con el punto: `norte.RazonSocial`, `norte.Nit`…
- Un `record` **protege** sus datos: no se cambian después de crearlo.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico". Luego **predice** (🔮) las líneas antes de correr, y haz el **🔨** (intenta cambiar un campo). Entiendes algo cuando puedes predecir qué pasa si lo cambias.

**Error: "Empresa no existe".**
Asegúrate de que la línea `record Empresa(...)` esté en el archivo (puede ir al final).

**Error al crear la empresa: los datos no cuadran.**
Revisa el **orden**: `new Empresa(nit, razonSocial, plan, activa)`. El texto va entre comillas; `Activa` es `true` o `false` sin comillas.

---

**➡️ Siguiente:** [Una lista de empresas](06-lista-de-empresas.md)
