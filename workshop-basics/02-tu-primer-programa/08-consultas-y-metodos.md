# Lección 2.8 — Consultas y métodos sobre los datos

> ⏱️ 45 minutos · 🎯 **Al terminar:** sabrás organizar tu código en **métodos** reutilizables y responder preguntas sobre los datos (buscar una empresa, contar las activas). Son exactamente las operaciones que tu API hará en la Fase 4.

> 🧭 **Cómo se aprende aquí.** En esta lección **no copias y pegas**. Cada pieza empieza con un reto: te muestro el resultado que quiero, tú lo intentas, y **luego** revelo una forma de hacerlo. Antes de ejecutar, **predices** qué va a pasar. Si copiar y pegar te funcionó pero no entendiste, esto es lo contrario a propósito: aquí el objetivo es entender, y el commit al final lo comprueba.

---

## 🤔 El problema

Tu programa ya muestra todas las empresas. Pero en la práctica necesitas **responder preguntas** sobre ellas: *¿existe la empresa con tal NIT? ¿cuántas están activas?* Y conviene no amontonar toda la lógica suelta, sino organizarla en piezas con nombre que puedas reutilizar. Esas piezas se llaman **métodos**.

---

## 💡 Qué es un método (y qué NO es)

Un **método** es un bloque de código con un **nombre**, que puedes **invocar** (mandar a ejecutar) cuando quieras.

- Puede **recibir** datos de entrada, llamados **parámetros** — o **no recibir ninguno**.
- Puede **devolver** un resultado — o no devolver nada.

> ⚠️ Un método **no necesita una lista** para existir. La lista, cuando aparezca, será solo *una de las entradas que decidimos pasarle*. Lo verás en vivo en el Paso 1: el primer método que escribas no recibe nada.

> Analogía: un método es como una receta con nombre ("preparar café"). La defines una vez y la usas cuando la necesitas. Unas recetas piden ingredientes (parámetros); otras no.

---

## 🛠️ Manos a la obra

Partimos del código de la lección 2.7 (la lista de empresas en memoria).

### Paso 1 · Tu primer método: uno que no recibe nada

Quiero poder escribir esto al inicio del programa y que imprima un título:

```csharp
MostrarTitulo();
// Debe imprimir:
// === Gestión de Empresas ===
```

> 🛠️ **Inténtalo tú.** Crea un método llamado `MostrarTitulo` que imprima `=== Gestión de Empresas ===`. **No recibe ningún dato** (paréntesis vacíos) y **no devuelve** nada. Luego invócalo en la primera línea del programa. *(Pista: un método que no devuelve nada empieza con la palabra `void`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

Arriba del todo, la invocación:
```csharp
MostrarTitulo();
```

Y el método (puede ir al final, junto al `record`):
```csharp
void MostrarTitulo()
{
    Console.WriteLine("=== Gestión de Empresas ===");
}
```
</details>

> 🆕 **Anatomía de un método.**
> ```
> void  MostrarTitulo ()      { ... }
>  │         │        │          │
>  │         │        │          └─ el cuerpo: lo que hace
>  │         │        └──────────── paréntesis VACÍOS = no recibe nada
>  │         └───────────────────── el nombre con el que lo invocas
>  └─────────────────────────────── "void" = no devuelve ningún resultado
> ```
> Para **invocarlo** escribes su nombre con paréntesis: `MostrarTitulo();`.

> ⚠️ **El orden importa (o no compila).** En este tipo de proyecto C# exige un orden: primero van las **instrucciones sueltas** (las invocaciones como `MostrarTitulo();`, arriba) y **después** las **declaraciones** de métodos y el `record` (abajo). Si pones la definición del método arriba del todo, verás un error. Por eso "la invocación arriba, el método al final".

> 🔮 **Predice, luego corre.** Antes de ejecutar, responde en voz alta: *¿este método necesitó una lista? ¿cuántas veces se imprime el título?* Ahora corre `dotnet run` y comprueba.
>
> Deberías ver el título **una vez**, sin haberle pasado ninguna lista. Eso es la prueba de que **un método no necesita una lista**: este no recibió nada.

### Paso 2 · Un método con una entrada (aquí sí, la lista)

Ahora sí, un método que recibe datos. Quiero mover la lógica de "mostrar todas" a un método `MostrarTodas` al que le **paso** la lista:

```csharp
MostrarTodas(empresas);
// Empresas registradas: 3
// - Constructora del Norte S.A.S. (NIT 900123456-1) — Empresarial, activa
// - ...
```

> 🛠️ **Inténtalo tú.** Crea `void MostrarTodas(List<Empresa> lista)` que reciba una lista de empresas, imprima cuántas hay (`lista.Count`) y luego recorra con `foreach` mostrando cada una con su estado en palabras (como en 2.6). Después invócalo con `MostrarTodas(empresas);`. *(Pista: `lista.Count` es la cantidad; el estado sale de `e.Activa ? "activa" : "inactiva"`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
void MostrarTodas(List<Empresa> lista)
{
    Console.WriteLine($"Empresas registradas: {lista.Count}");
    foreach (var e in lista)
    {
        var estado = e.Activa ? "activa" : "inactiva";
        Console.WriteLine($"- {e.RazonSocial} (NIT {e.Nit}) — {e.Plan}, {estado}");
    }
}
```
</details>

> 🆕 **Parámetros: las entradas de un método.**
> `(List<Empresa> lista)` declara **una entrada** llamada `lista`. No es una lista que exista todavía: es un **hueco con nombre**. Cuando invocas `MostrarTodas(empresas)`, tu lista `empresas` entra por ese hueco y adentro se llama `lista`. Un método puede tener **cero** entradas (Paso 1), una, o varias.

> 🔮 **Predice, luego corre.** Invoca `MostrarTodas(empresas);` justo después del título. Antes de ejecutar: *¿cuántas líneas con guion vas a ver?* Corre `dotnet run` y confírmalo.

### Paso 3 · Contar en corto (una condición como dato)

Ahora un método para el resumen de activas. Quiero que imprima `Activas: 2 de 3`:

> 🛠️ **Inténtalo tú.** Crea `void MostrarResumen(List<Empresa> lista)` que imprima cuántas están activas sobre el total. *(Pista: en vez del bucle contador de 2.7, hay una forma de una línea. `lista.Count(...)` cuenta los elementos que cumplen una condición; la condición se escribe `e => e.Activa`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
void MostrarResumen(List<Empresa> lista)
{
    var activas = lista.Count(e => e.Activa);
    Console.WriteLine($"\nActivas: {activas} de {lista.Count}");
}
```
</details>

> 🆕 **La condición corta `e => e.Activa` (lambda).**
> `e => e.Activa` se lee: *"para cada empresa `e`, ¿su campo `Activa` es verdadero?"*. Es una **condición escrita en corto** que le pasas a un método como si fuera un dato. `Count(e => e.Activa)` recorre la lista y **cuenta** las que la cumplen — reemplaza el bucle manual de 2.7. La flecha `=>` aquí significa "para cada `e`, mira esto".

> 🔮 **Predice, luego corre.** Invoca `MostrarResumen(empresas);`. Antes de ejecutar: *¿qué número va a decir "Activas"?* Escríbelo, corre `dotnet run`, y confírmalo. Debe decir `Activas: 2 de 3`.

### Paso 4 · Un método que DEVUELVE un resultado (buscar por NIT)

Los dos anteriores imprimían. Ahora quiero uno que **me entregue** la empresa encontrada para usarla:

```csharp
var e = BuscarPorNit(empresas, "900123456-1");
// e queda siendo la empresa "Constructora del Norte S.A.S."
```

> 🛠️ **Inténtalo tú.** Crea un método `BuscarPorNit` que reciba la lista y un `nit` (texto), y **devuelva** la empresa cuyo NIT coincida, o nada si no existe. *(Pista: el tipo que devuelve es `Empresa?` — con `?` — y por dentro usa `lista.FirstOrDefault(e => e.Nit == nit)`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
Empresa? BuscarPorNit(List<Empresa> lista, string nit) =>
    lista.FirstOrDefault(e => e.Nit == nit);
```
</details>

> 🆕 **Devolver algo — y el `?` de "quizá nada".**
> - `Empresa?` significa: este método **devuelve** una `Empresa`, y el `?` avisa que **podría no encontrar ninguna** y devolver *nada* (`null`). *(Ojo: es el mismo símbolo `?` que viste en el ternario del 2.3, pero aquí significa otra cosa — pegado a un tipo, quiere decir "quizá nada".)*
> - `FirstOrDefault(condición)` devuelve el **primer** elemento que cumple la condición, o *nada* si ninguno cumple.
> - `e.Nit == nit`: el `==` (doble igual) **compara** si dos valores son iguales. No lo confundas con el `=` (uno solo), que **guarda** un valor en una variable.
> - `=> ...` en vez de `{ ... }` es un método de una sola línea: devuelve lo que está a la derecha de la flecha.

### Paso 5 · Usar la búsqueda, con lo que escriba el usuario

Quiero preguntarle un NIT al usuario y, **solo si escribió algo**, buscarlo. Aquí entran tres piezas nuevas — léelas antes de intentar:

> 🆕 **Leer lo que teclea el usuario.**
> - `Console.Write("...")` imprime el texto **sin** saltar de línea (deja el cursor al lado, para que el usuario escriba ahí mismo). Es el hermano de `Console.WriteLine`, que **sí** salta de línea al final.
> - `Console.ReadLine()` **espera** a que el usuario escriba algo y presione Enter, y te **devuelve** ese texto. Lo guardamos: `var nit = Console.ReadLine();`.

> 🆕 **La guarda `if (!string.IsNullOrWhiteSpace(nit))` — léela por partes.** *(Esta es la que suele confundir. Despacio:)*
> - `string.IsNullOrWhiteSpace(nit)` es **verdadero** cuando `nit` está **vacío o en blanco** (el usuario no escribió nada, o solo espacios).
> - El `!` significa **"no"**: voltea verdadero↔falso.
> - Entonces `!string.IsNullOrWhiteSpace(nit)` es verdadero cuando `nit` **sí tiene contenido de verdad**.
> - En palabras, el `if` dice: *"si el usuario escribió algo, entonces busca"*. Sin esa guarda, buscaríamos incluso cuando no escribió nada.

> 🆕 **`encontrada is not null`** se lee: *"¿`encontrada` tiene algo (no es nada)?"*. Recuerda que `BuscarPorNit` podía devolver *nada* (`null`); esto pregunta si de verdad encontró una empresa.

> 🛠️ **Inténtalo tú.** Después de `MostrarResumen(empresas);`, pide un NIT con `Console.ReadLine()`, y **si el usuario escribió algo**, búscalo con `BuscarPorNit` y muestra la razón social y el plan si existe, o un aviso si no. *(Pistas: la guarda y el `is not null` están en las cajas de arriba; el mensaje distinto según encuentre o no se arma con un ternario `? :` como el del 2.3.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

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
</details>

> 🔮 **Predice, luego corre.** Ejecuta con `dotnet run`, escribe `900123456-1` → debe encontrarla. Corre otra vez y escribe un NIT inventado → debe avisar que no existe.

> 🔨 **Rómpelo (y entiende el `!`).** Borra el `!` de la guarda, deja `if (string.IsNullOrWhiteSpace(nit))`. **Antes de correr, predice:** ¿qué pasará ahora si presionas Enter *sin escribir nada*? Corre y compruébalo. Luego devuelve el `!` a su sitio. *(Guarda tu respuesta: la usarás en el commit.)*

### 🎯 El reto de la lección: filtrar por plan

Quiero un método `MostrarPorPlan(empresas, "Empresarial")` que imprima **solo** las empresas de ese plan:

```
- Constructora del Norte S.A.S. (NIT 900123456-1) — Empresarial, activa
```

> 🛠️ **Inténtalo tú.** Escribe `void MostrarPorPlan(List<Empresa> lista, string plan)` que recorra solo las empresas de ese `plan` y las muestre. *(Pista: `lista.Where(e => e.Plan == plan)` te da solo las que coinciden; luego recórrelas con `foreach`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
void MostrarPorPlan(List<Empresa> lista, string plan)
{
    foreach (var e in lista.Where(e => e.Plan == plan))
    {
        var estado = e.Activa ? "activa" : "inactiva";
        Console.WriteLine($"- {e.RazonSocial} (NIT {e.Nit}) — {e.Plan}, {estado}");
    }
}
```

`Where(condición)` se queda solo con los elementos que la cumplen (a diferencia de `Count`, que los *cuenta*).
</details>

> 🎯 **Ahora adáptalo (esto no se copia).** Modifica tu `MostrarPorPlan` para que muestre **solo las INACTIVAS** de ese plan. Pegar la solución de arriba te dará todas las de ese plan, así que tienes que **cambiar la condición** tú. Necesitas pedir **dos cosas a la vez**: que sea del plan **y** que no esté activa.
>
> *(Pista — solo las herramientas, no la respuesta: el `&&` une dos condiciones y significa "y" (ambas deben cumplirse). Y ya sabes escribir "no está activa" desde el reto de inactivas del 2.3. Ármalo tú.)*

<details>
<summary>👉 ¿Te trabaste? Muéstrame una forma</summary>

```csharp
foreach (var e in lista.Where(e => e.Plan == plan && !e.Activa))
```

`&&` exige que **las dos** condiciones sean verdaderas: del plan pedido **y** no activa.
</details>

### Paso final · Guardar el avance — el commit donde demuestras que entendiste

Crea la rama, commitea y abre el PR (ya es rutina):

```bash
cd ../..
git checkout -b feat/consultas-y-metodos
git add .
```

> 📓 **En el mensaje del commit, responde con TUS palabras** (no copies el texto de la lección). Reemplaza los `...`:
> ```bash
> git commit -m "métodos y búsqueda por NIT
>
> - Un método SIN parámetros (MostrarTitulo) vs uno CON parámetro (MostrarTodas):
>   la diferencia es ...
> - El '!' en !string.IsNullOrWhiteSpace(nit) sirve para ...
>   Cuando le quité el '!' y presioné Enter sin escribir, pasó ...
> - Mi predicción del resumen de activas fue ... y (acerté / me equivoqué porque ...)"
> ```
> ```bash
> git push -u origin feat/consultas-y-metodos
> ```

Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

> 💡 **Por qué el commit se ve así.** Que el programa *corra* solo prueba que compila — copiar y pegar también corre. Escribir con tus palabras *por qué* funciona es lo que demuestra (a ti y a quien te acompaña) que de verdad lo entendiste. Si al escribirlo te trabas, esa es la pieza para repasar.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa imprime el título, las empresas y el resumen de activas usando **métodos**.
- [ ] La búsqueda por NIT encuentra una empresa existente y avisa cuando no existe.
- [ ] `MostrarPorPlan` muestra solo las empresas del plan pedido.

**Que entendiste** (esto es lo que importa):
- [ ] Sin mirar la lección, puedes escribir la firma de un método que **no recibe nada** y la de uno que **recibe una lista** — y explicar la diferencia.
- [ ] Puedes explicar qué hace el `!` en `!string.IsNullOrWhiteSpace(nit)` y qué pasó cuando lo quitaste.
- [ ] Tus predicciones (🔮) coincidieron con lo que salió — o entendiste por qué no.

> 🚦 **Cómo te fue con esta lección** (sé honesto contigo):
> - 🟢 la construí solo con las pistas · 🟡 me costó / abrí la solución antes de tiempo · 🔴 no me alcanzó
>
> Si marcaste 🟡 o 🔴 en algún paso, no sigas de largo: vuelve a ese paso, usa el 🔮 y el 🔨. Trabarte aquí es normal y esperado — no significa que "no tienes bases".

---

## 🧠 Lo que aprendiste

- Un **método** es una operación con nombre. Puede recibir **parámetros** (entradas) **o ninguno**, y **devolver** un resultado o nada. Una lista, cuando la recibe, es solo una de sus entradas.
- `FirstOrDefault(condición)` busca el primero que cumple; `Count(condición)` cuenta los que cumplen; `Where(condición)` se queda con todos los que cumplen.
- El `!` **niega** una condición: `!string.IsNullOrWhiteSpace(nit)` = "el usuario sí escribió algo".
- Organizar la lógica en métodos es la base de cómo se estructura una aplicación — incluida tu API (su repositorio tendrá métodos como estos: `ObtenerTodas()`, `ObtenerPorNit(nit)`).

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Es la señal de que este es tu momento de parar, no de seguir. Vuelve al paso: primero **predice** (🔮) qué hará el código *antes* de correrlo, y luego **rómpelo** (🔨) — cambia una pieza y mira qué se daña. Entiendes algo de verdad cuando puedes predecir qué pasa si lo cambias.

**No entiendo el `!string.IsNullOrWhiteSpace(nit)`.**
Léelo de adentro hacia afuera: `IsNullOrWhiteSpace(nit)` es verdadero cuando `nit` está vacío. El `!` lo voltea. Así que la guarda entra cuando `nit` **no** está vacío, o sea cuando el usuario escribió algo. Haz el 🔨 del Paso 5 y lo ves en vivo.

**Error: "Top-level statements must precede..." o el método "no existe" apenas lo defino arriba.**
Es la regla de orden del Paso 1: las **invocaciones** (líneas sueltas como `MostrarTodas(empresas);`) van **arriba**; las **definiciones** de métodos y el `record Empresa` van **al final** del archivo. Si mezclaste el orden, muévelas.

**No entiendo el `e => e.Activa`.**
Léelo como "para cada empresa `e`, su propiedad `Activa`". Es una forma corta de expresar una condición sobre cada elemento. Lo verás mucho; con la práctica se vuelve natural.

**Error: "el nombre BuscarPorNit no existe".**
Asegúrate de que el método esté escrito dentro del archivo (puede ir junto a los otros métodos, antes del `record`).

**El programa no espera mi búsqueda.**
Ejecuta con `dotnet run` desde la terminal (necesita una consola interactiva para `Console.ReadLine`).

---

**➡️ Siguiente fase:** [Fase 3 — Cómo se comunican los programas](../03-como-se-comunican-http/README.md)
