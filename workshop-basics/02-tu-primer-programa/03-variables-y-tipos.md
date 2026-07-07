# Lección 2.3 — Variables y tipos: guardar datos

> ⏱️ 35 minutos · 🎯 **Al terminar:** sabrás guardar datos en **variables**, distinguir los **tipos** básicos (texto, número, sí/no) y combinarlos en un mensaje. Es el escalón que necesitas antes de manejar empresas.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte** — ninguna línea aparece sin explicarse. Luego **predices** qué hará antes de correrlo. Y al final de cada paso hay un **"Ahora tú"**: un cambio pequeño para practicar lo recién visto. No tienes que inventar nada de cero.

---

## 🤔 El problema

Hasta ahora tu programa imprime **texto fijo**: siempre lo mismo. Un programa útil necesita **recordar datos** — un nombre, una cantidad, un sí/no — para trabajar con ellos. El lugar donde un programa guarda un dato con un nombre se llama una **variable**. Empecemos por ahí.

Partimos del proyecto de consola de la lección 2.2. Abre `src/GestionEmpresas.Consola/Program.cs`.

---

## 🛠️ Manos a la obra

### Paso 1 · Una variable: una caja con nombre

**Te muestro.** Reemplaza el contenido de `Program.cs` por esto:

```csharp
var nombre = "Constructora del Norte";
Console.WriteLine(nombre);
```

**Te explico:**

> 🆕 **Qué es una variable.** Una **variable** es una **caja con nombre** que guarda un valor. `var nombre = "Constructora del Norte";` crea una caja llamada `nombre` y mete adentro ese texto.
> - `=` **no** significa "es igual a": significa **"guarda en la caja de la izquierda lo de la derecha"**.
> - `var` le dice a C#: "mira lo de la derecha y deduce tú qué tipo de dato es" (aquí, texto).
> - El **`;`** al final **cierra la instrucción**. Cada instrucción en C# termina en `;`, como el punto final de una frase. Si lo olvidas, no compila.

> 🆕 **Usar la variable.** `Console.WriteLine(nombre)` imprime **lo que hay dentro** de la caja `nombre` — no la palabra "nombre". Fíjate: no lleva comillas. Con comillas (`"nombre"`) imprimiría el texto literal; sin comillas, imprime el **valor guardado**.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué crees que va a imprimir — la palabra `nombre` o el texto `Constructora del Norte`?* Corre `dotnet run` y compáralo.

> ✋ **Ahora tú.** Crea otra variable llamada `ciudad` con el nombre de tu ciudad, e imprímela debajo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var nombre = "Constructora del Norte";
Console.WriteLine(nombre);

var ciudad = "Bogotá";
Console.WriteLine(ciudad);
```
</details>

### Paso 2 · Los tipos: texto, número, sí/no

Cada dato tiene un **tipo**. Los tres que más usarás:

**Te muestro:**

```csharp
string razonSocial = "Constructora del Norte";   // texto
int empleados = 45;                               // número entero
bool activa = true;                               // sí/no (verdadero/falso)

Console.WriteLine(razonSocial);
Console.WriteLine(empleados);
Console.WriteLine(activa);
```

**Te explico:**

> 🆕 **Los tres tipos básicos.**
> - `string` = **texto**. Va entre comillas: `"Constructora del Norte"`.
> - `int` = **número entero** (sin decimales). Sin comillas: `45`.
> - `bool` = solo **`true`** (verdadero) o **`false`** (falso). Para responder sí/no: ¿está activa?
>
> Aquí escribimos el tipo **al principio** (`string razonSocial = ...`) en vez de `var`. Las dos formas valen: `var` deja que C# deduzca el tipo; escribirlo tú lo hace explícito. Hacen lo mismo.

> 🆕 **Comentarios `//`.** Todo lo que va después de `//` en una línea es un **comentario**: notas para ti, que C# ignora. No afectan al programa.

> 🔮 **Predice, luego corre.** Antes de ejecutar: *¿qué tres líneas vas a ver?* (Ojo: ¿cómo se imprimirá `true`?) Corre y compruébalo.

> ✋ **Ahora tú.** Agrega una variable `int anioFundacion` con un año, y una `bool tienePlanPremium` con `true` o `false`. Imprímelas.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
int anioFundacion = 1998;
bool tienePlanPremium = false;

Console.WriteLine(anioFundacion);
Console.WriteLine(tienePlanPremium);
```
</details>

### Paso 3 · Combinar datos en un mensaje

Imprimir cada dato en su línea es pobre. Quiero **armar una frase** con varias variables:

**Te muestro:**

```csharp
string razonSocial = "Constructora del Norte";
int empleados = 45;

Console.WriteLine($"{razonSocial} tiene {empleados} empleados.");
```

**Te explico:**

> 🆕 **Interpolación: meter variables en un texto.** El `$` **antes** de la comilla activa un modo especial: lo que pongas entre `{}` se **reemplaza por el valor** de esa variable.
> - `$"{razonSocial} tiene {empleados} empleados."` produce `Constructora del Norte tiene 45 empleados.`
> - **Sin** el `$`, se imprimiría literalmente `{razonSocial} tiene {empleados} empleados.` (con las llaves y todo).

> 🔮 **Predice, luego corre.** ¿Qué frase exacta va a imprimir? Escríbela y corre `dotnet run`.

> 🔨 **Rómpelo (y entiende el `$`).** Borra el `$` del inicio de la comilla. **Antes de correr, predice:** ¿qué cambia en lo que imprime? Corre, míralo, y vuelve a poner el `$`. *(Guarda tu respuesta para el commit.)*

> ✋ **Ahora tú.** Arma un mensaje que use **tres** variables tuyas en una sola frase (por ejemplo: `"{razonSocial}, fundada en {anioFundacion}, plan premium: {tienePlanPremium}"`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
Console.WriteLine($"{razonSocial}, fundada en {anioFundacion}. Premium: {tienePlanPremium}");
```
</details>

### Paso final · Guardar el avance (commit de comprensión)

```bash
cd ../..
git checkout -b feat/variables-y-tipos
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "usar variables y tipos básicos
>
> - Una variable es ...
> - La diferencia entre string, int y bool es ...
> - El '$' antes de la comilla sirve para ...; cuando lo quité, pasó ..."
> ```
> ```bash
> git push -u origin feat/variables-y-tipos
> ```

Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa imprime el valor guardado en una variable (no el nombre de la variable).
- [ ] Imprimes un `string`, un `int` y un `bool`.
- [ ] Un mensaje con `$"...{variable}..."` muestra los valores, no las llaves.

**Que entendiste:**
- [ ] Puedes explicar qué es una variable y por qué `=` no significa "es igual a".
- [ ] Puedes decir cuándo usar `string`, `int` o `bool`.
- [ ] Sabes qué hace el `$` — porque lo quitaste y viste la diferencia.

> 🚦 **Cómo te fue** (sé honesto contigo): 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó. Si marcaste 🟡 o 🔴, relee el "Te explico" del paso antes de seguir. Trabarte aquí es normal — no significa que "no tienes bases".

---

## 🧠 Lo que aprendiste

- Una **variable** es una caja con nombre; `=` **guarda** un valor en ella, y cada instrucción termina en `;`.
- Los tipos básicos: **`string`** (texto), **`int`** (número entero), **`bool`** (`true`/`false`).
- Puedes escribir el tipo (`string x = ...`) o dejar que C# lo deduzca (`var x = ...`).
- La **interpolación** `$"...{variable}..."` combina variables dentro de un texto.
- Los **comentarios** `//` son notas que C# ignora.

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico" del paso, línea por línea. Luego **predice** (🔮) qué imprimirá antes de correr, y **rómpelo** (🔨) quitando el `$`. Entiendes algo cuando puedes predecir qué pasa si lo cambias.

**Error: "; expected" o similar.**
Te faltó el `;` al final de una instrucción. Cada línea de instrucción termina en punto y coma.

**Imprime `{razonSocial}` con las llaves, en vez del valor.**
Te faltó el `$` justo antes de la comilla de apertura: `$"..."`.

**Error al mezclar tipos** (por ejemplo, poner comillas a un número o `true` con comillas).
`int` va sin comillas (`45`), `string` con comillas (`"texto"`), `bool` es `true`/`false` sin comillas.

---

**➡️ Siguiente:** [Trabajar con datos: las empresas](04-trabajar-con-datos.md)
