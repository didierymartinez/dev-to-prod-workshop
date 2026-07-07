# Lección 2.7 — Decidir y contar

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás tomar decisiones con `if` y **contar** cuántas empresas cumplen una condición (cuántas activas, cuántas inactivas).

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** y **te explico**; luego **predices**; y al final un **"Ahora tú"**. Seguimos con el código de la 2.6 (la lista de empresas).

---

## 🤔 El problema

Tu programa ya **muestra** todas las empresas. Pero el negocio **pregunta**: *¿cuántas están activas?* Para responder necesitas dos cosas nuevas: **decidir** (mirar cada empresa y ver si cumple una condición) y **contar** (llevar la cuenta).

Partimos del `Program.cs` de la lección 2.6.

---

## 🛠️ Manos a la obra

### Paso 1 · Decidir con `if`

Lo más simple primero: **mirar cada empresa y hacer algo solo si cumple una condición**.

**Te muestro.** Agrega esto justo **encima** de la línea `record Empresa...`:

```csharp
Console.WriteLine();
foreach (var empresa in empresas)
{
    if (empresa.Activa)
    {
        Console.WriteLine($"{empresa.RazonSocial} está activa");
    }
}
```

**Te explico:**

> 🆕 **Decidir con `if`.** `if (empresa.Activa) { ... }` ejecuta lo de adentro **solo si** la condición es verdadera. Como `empresa.Activa` ya es `true`/`false`, sirve directo de condición. Las empresas inactivas **se saltan** esa línea. Es un **condicional**.

> 🔮 **Predice, luego corre.** *¿Cuántos nombres se van a imprimir — todos, o solo algunos?* Corre `dotnet run` y compruébalo.

> 🔨 **Rómpelo (y entiende el `if`).** Cambia una empresa activa a `false` en la lista. **Predice:** ¿su nombre seguirá apareciendo? Corre, míralo, y devuélvelo a `true`. *(Guarda tu respuesta para el commit.)*

> ✋ **Ahora tú.** Cambia el mensaje para que, además del nombre, muestre el plan de cada empresa activa.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
Console.WriteLine($"{empresa.RazonSocial} (plan {empresa.Plan}) está activa");
```
</details>

### Paso 2 · Llevar la cuenta (un contador)

Ver los nombres está bien, pero el negocio quiere un **número**: cuántas activas en total. Para eso llevas un **contador**.

**Te muestro.** Reemplaza el `foreach` del Paso 1 por este (ahora, en vez de imprimir cada una, sumamos):

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

> 🆕 **Contar reasignando.** `var activas = 0;` crea un contador en cero. Dentro del `if`, `activas = activas + 1;` **reasigna**: toma el valor actual de `activas`, le suma 1, y lo guarda otra vez en `activas`. Aquí el `=` no significa "son iguales"; significa "guarda a la izquierda lo de la derecha". Es la primera vez que cambias una variable **después** de crearla.

> 🆕 **Línea en blanco con `\n`.** El `\n` dentro de un texto produce un salto de línea; aquí deja una línea en blanco antes de "Activas".

> 🔮 **Predice, luego corre.** *¿Qué número dirá?* Corre `dotnet run`: `Activas: 2 de 3` (o los números que tengas).

### Paso 3 · Contar las inactivas (negar una condición)

Para contar lo contrario —las **inactivas**— necesitas una pieza nueva:

> 🆕 **Negar con `!`.** El signo `!` significa **"no"**: voltea verdadero↔falso. Si `empresa.Activa` es verdadero, `!empresa.Activa` es falso. Así, `if (!empresa.Activa)` entra cuando la empresa **NO** está activa. *(Este `!` reaparece en la próxima lección; entenderlo aquí te ahorra el dolor de cabeza allá.)*

> 🔮 **Predice.** Si de 3 empresas hay 2 activas, *¿cuántas inactivas contará?*

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

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/decidir-y-contar
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "decidir con if y contar activas e inactivas
>
> - El if hace ...
> - 'activas = activas + 1' hace ..., y el '=' significa ...
> - Cuando cambié una empresa a inactiva, el conteo de activas pasó de ... a ..., porque ...
> - El '!' en if (!empresa.Activa) sirve para ..."
> ```
> ```bash
> git push -u origin feat/decidir-y-contar
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa imprime `Activas: 2 de 3` e `Inactivas: 1 de 3` (ajustado a tus datos).

**Que entendiste:**
- [ ] Puedes explicar qué hace `if` y por qué `=` no significa "son iguales".
- [ ] Predijiste el conteo antes de romper la lista, y coincidió (o entendiste por qué no).
- [ ] Puedes explicar por qué `if (empresa.Activa)` y `if (!empresa.Activa)` cuentan cosas distintas.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- **`if`** ejecuta algo solo si una condición es verdadera.
- Un **contador** (`var x = 0;` y `x = x + 1;`) lleva la cuenta; el `=` **guarda**, no compara.
- El **`!`** niega una condición: `!empresa.Activa` = "la empresa NO está activa".

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico". **Predice** (🔮) el conteo antes de correr y **rómpelo** (🔨) cambiando una empresa. Entiendes cuando puedes predecir qué pasa si lo cambias.

**El conteo no cambia al modificar la lista.**
Asegúrate de editar la lista `empresas` (no otra variable) y de haber guardado el archivo antes de `dotnet run`.

---

**➡️ Siguiente:** [Consultas y métodos sobre los datos](08-consultas-y-metodos.md)
