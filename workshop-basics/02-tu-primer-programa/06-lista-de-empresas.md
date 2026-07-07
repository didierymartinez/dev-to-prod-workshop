# Lección 2.6 — Una lista de empresas

> ⏱️ 30 minutos · 🎯 **Al terminar:** juntarás lo aprendido — una **lista** (2.4) de tu **modelo** (2.5) — en una `List<Empresa>`, y la recorrerás para mostrar cada empresa con su estado.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** y **te explico**; luego **predices**; y al final un **"Ahora tú"**. Esta lección **combina** dos cosas que ya viste: la lista de la 2.4 y el modelo de la 2.5.

---

## 🤔 El problema

En la 2.5 creaste empresas sueltas: `norte`, `interprensa`… cada una en su variable. Pero para tratarlas **a todas** —contarlas, mostrarlas, buscarlas— tenerlas separadas es incómodo: repetirías el mismo código para cada variable.

Ya sabes guardar muchos valores del mismo tipo en una **lista** (2.4). Y una empresa es un valor de tipo `Empresa` (2.5). Entonces: **una lista de empresas**.

---

## 🛠️ Manos a la obra

### Paso 1 · Guardar varias empresas en una lista

**Te muestro.** Reemplaza el contenido de `Program.cs` por esto:

```csharp
var empresas = new List<Empresa>
{
    new Empresa("900123456-1", "Constructora del Norte S.A.S.", "Empresarial", true),
    new Empresa("830456789-2", "Interprensa Ltda.",             "Profesional", true),
    new Empresa("901222333-4", "Consorcio Alquiler S.A.",        "Básico",      false),
};

Console.WriteLine($"Empresas registradas: {empresas.Count}");

record Empresa(string Nit, string RazonSocial, string Plan, bool Activa);
```

**Te explico:**

> 🆕 **`List<Empresa>`: una lista de tu propio tipo.** En la 2.4 tuviste `List<string>` (lista de textos). Aquí es `List<Empresa>`: una lista de **empresas**. Lo que va entre `< >` es el tipo que contiene — antes texto, ahora tu modelo `Empresa`.
> - Cada elemento se crea con `new Empresa(...)`, igual que en la 2.5 — solo que ahora van varios, separados por comas, dentro de la lista.
> - `empresas.Count` sigue siendo cuántos elementos hay, igual que con la lista de nombres.

> 🔮 **Predice, luego corre.** *¿Qué número dirá?* Corre `dotnet run`: `Empresas registradas: 3`.

> ✋ **Ahora tú.** Agrega una cuarta empresa a la lista y confirma que `Count` sube solo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
    new Empresa("901555777-8", "Mi Empresa Nueva S.A.S.", "Profesional", true),
```
Ahora dice `Empresas registradas: 4`.
</details>

### Paso 2 · Recorrer las empresas y mostrarlas

Ya recorriste una lista de nombres con `foreach` (2.4). Ahora recorres empresas, y de cada una lees sus campos con el punto (2.5).

**Te muestro.** Agrega esto justo **encima** de la línea `record Empresa...` (al final de lo que ya tienes arriba):

```csharp
Console.WriteLine();
foreach (var empresa in empresas)
{
    var estado = empresa.Activa ? "activa" : "inactiva";
    Console.WriteLine($"- {empresa.RazonSocial} (NIT {empresa.Nit}) — {empresa.Plan}, {estado}");
}
```

**Te explico:**

> 🆕 **Combinar lo que ya sabes.** `foreach (var empresa in empresas)` recorre la lista (2.4); en cada vuelta `empresa` es una `Empresa`, y `empresa.RazonSocial` / `empresa.Nit` / `empresa.Plan` leen sus campos (2.5). Nada nuevo salvo juntarlos.

> 🆕 **`Console.WriteLine()` vacío.** Sin nada entre paréntesis, imprime una **línea en blanco**. Aquí la usamos para separar el conteo de arriba de la lista de abajo.

> 🆕 **Decidir en corto (ternario).** `empresa.Activa ? "activa" : "inactiva"` es un **operador ternario**: *si* `Activa` es verdadero, vale `"activa"`; *si no*, `"inactiva"`. Elige entre dos valores según una condición. Lo guardamos en `estado` para usarlo en el mensaje.

> 🔮 **Predice, luego corre.** *¿Cuántas líneas con guion vas a ver, y cuál dirá "inactiva"?* Corre y compruébalo.

> ✋ **Ahora tú.** Cambia el ternario para que muestre `"al día"` en vez de `"activa"` y `"suspendida"` en vez de `"inactiva"`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var estado = empresa.Activa ? "al día" : "suspendida";
```
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/lista-de-empresas
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "guardar empresas en una lista y mostrarlas
>
> - Un List<Empresa> combina ... (de la 2.4) con ... (de la 2.5)
> - El foreach sobre empresas hace ...
> - El ternario empresa.Activa ? ... : ... sirve para ..."
> ```
> ```bash
> git push -u origin feat/lista-de-empresas
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa imprime cuántas empresas hay y luego cada una en su línea, con su estado en palabras.

**Que entendiste:**
- [ ] Puedes explicar por qué `List<Empresa>` es "la lista de la 2.4" pero con tu modelo de la 2.5.
- [ ] Puedes explicar qué hace el ternario `? :`.
- [ ] Tu predicción de las líneas coincidió con lo que salió.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una **`List<Empresa>`** guarda muchas empresas juntas; combina la lista (2.4) con el modelo (2.5).
- **`foreach`** recorre la lista y de cada empresa lees sus campos con el punto.
- El **ternario** `? :` elige entre dos valores según una condición.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico" y nota que casi todo ya lo viste en 2.4 y 2.5. **Predice** (🔮) las líneas antes de correr. Entiendes cuando puedes predecir el resultado.

**Error: "Empresa no existe".**
Asegúrate de que la línea `record Empresa(...)` esté en el archivo (puede ir al final).

**Cambié algo y ahora no compila.**
Lee el error (archivo + línea). Lo más común: una coma de más o de menos en la lista, o una comilla sin cerrar.

---

**➡️ Siguiente:** [Decidir y contar](07-decidir-y-contar.md)
