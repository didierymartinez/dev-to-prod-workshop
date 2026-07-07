# Lección 2.8 — Consultas y métodos sobre los datos

> ⏱️ 45 minutos · 🎯 **Al terminar:** sabrás organizar tu código en **métodos** reutilizables y responder preguntas sobre los datos (buscar una empresa, contar, filtrar). Son exactamente las operaciones que tu API hará en la Fase 4.

> 🧭 **Cómo se aprende aquí.** Primero **te muestro** el código y **te explico cada parte**; luego **predices**; y al final un **"Ahora tú"** de variación pequeña. No inventas nada de cero.

---

## 🤔 El problema

En la 2.7 escribiste el mismo `foreach` con contador **dos veces** (activas, inactivas), y tu `Program.cs` ya es un chorizo de bucles. Además necesitas **responder preguntas**: *¿existe la empresa con tal NIT? ¿cuántas activas?* Conviene (1) empaquetar la lógica repetida en piezas con nombre —**métodos**— y (2) responder preguntas de forma más directa.

Partimos del código de la lección 2.7.

---

## 💡 Qué es un método (y qué NO es)

Un **método** es un bloque de código con un **nombre**, que puedes **invocar** (mandar a ejecutar) cuando quieras.

- Puede **recibir** datos de entrada, llamados **parámetros** — o **no recibir ninguno**.
- Puede **devolver** un resultado — o no devolver nada.

> ⚠️ Un método **no necesita una lista** para existir. La lista, cuando aparezca, será solo *una de las entradas que decidimos pasarle*. Lo verás en el Paso 1: el primer método no recibe nada.

---

## 🛠️ Manos a la obra

### Paso 1 · Tu primer método: uno que no recibe nada

**Te muestro.** Vamos a empaquetar la impresión de un título en un método. Reemplaza el inicio de tu `Program.cs` de modo que quede así (la invocación **arriba**, el método **al final**, junto al `record`):

```csharp
MostrarTitulo();

// ... (tu lista de empresas y lo demás) ...

// Al final del archivo, junto al record:
void MostrarTitulo()
{
    Console.WriteLine("=== Gestión de Empresas ===");
}
```

**Te explico:**

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

> ⚠️ **El orden importa (o no compila).** C# exige: primero las **instrucciones sueltas** (invocaciones como `MostrarTitulo();`, arriba) y **después** las **declaraciones** de métodos y el `record` (abajo). Si defines el método arriba del todo, verás un error.

> 🔮 **Predice, luego corre.** *¿Este método necesitó una lista? ¿cuántas veces se imprime el título?* Corre `dotnet run`: verás el título **una vez**, sin pasarle ninguna lista. Esa es la prueba de que **un método no necesita una lista**.

> ✋ **Ahora tú.** Cambia el texto que imprime `MostrarTitulo` (por ejemplo, agrega una segunda línea con `Console.WriteLine`). Corre y míralo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
void MostrarTitulo()
{
    Console.WriteLine("=== Gestión de Empresas ===");
    Console.WriteLine("Clientes de la plataforma");
}
```
</details>

### Paso 2 · Un método con una entrada (aquí sí, la lista)

**Te muestro.** Ahora movemos la lógica de "mostrar todas" a un método al que le **pasamos** la lista. Agrega, al final (con los otros métodos):

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

Y arriba, reemplaza el `foreach` que tenías suelto por una simple invocación: `MostrarTodas(empresas);`.

**Te explico:**

> 🆕 **Parámetros: las entradas de un método.** `(List<Empresa> lista)` declara **una entrada** llamada `lista`. No es una lista que exista todavía: es un **hueco con nombre**. Cuando invocas `MostrarTodas(empresas)`, tu lista `empresas` entra por ese hueco y adentro se llama `lista`. Un método puede tener **cero** entradas (Paso 1), una, o varias.

> 🔮 **Predice, luego corre.** *¿La salida cambia respecto a la 2.6, o se ve igual?* Corre y confírmalo: se ve igual, pero ahora la lógica vive en un método reutilizable.

> ✋ **Ahora tú.** Invoca `MostrarTodas(empresas)` **dos veces** seguidas. ¿Qué esperas ver? Compruébalo, y luego deja una sola invocación.

### Paso 3 · Contar en corto (una condición como dato)

**Te muestro.** En la 2.7 contabas con un `foreach` y un contador. Hay una forma de **una línea**. Agrega este método:

```csharp
void MostrarResumen(List<Empresa> lista)
{
    var activas = lista.Count(e => e.Activa);
    Console.WriteLine($"\nActivas: {activas} de {lista.Count}");
}
```

E invócalo con `MostrarResumen(empresas);`.

**Te explico:**

> 🆕 **La condición corta `e => e.Activa` (lambda).** `e => e.Activa` se lee: *"para cada empresa `e`, ¿su campo `Activa` es verdadero?"*. Es una **condición escrita en corto** que le pasas a un método como si fuera un dato. `Count(e => e.Activa)` recorre la lista y **cuenta** las que la cumplen — reemplaza el bucle contador de la 2.7. La flecha `=>` significa aquí "para cada `e`, mira esto".

> 🔮 **Predice, luego corre.** *¿Qué número dirá "Activas"?* Corre: `Activas: 2 de 3`.

> ✋ **Ahora tú.** Agrega, en el mismo método, una línea que cuente y muestre las **inactivas** en corto. *(Ya sabes negar con `!` desde la 2.7; y ya viste `Count(condición)`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var inactivas = lista.Count(e => !e.Activa);
Console.WriteLine($"Inactivas: {inactivas} de {lista.Count}");
```
</details>

### Paso 4 · Un método que DEVUELVE un resultado (buscar por NIT)

Los anteriores **imprimían**. Ahora uno que **te entrega** la empresa encontrada para usarla.

**Te muestro.** Agrega:

```csharp
Empresa? BuscarPorNit(List<Empresa> lista, string nit) =>
    lista.FirstOrDefault(e => e.Nit == nit);
```

**Te explico:**

> 🆕 **Devolver algo — y el `?` de "quizá nada".**
> - `Empresa?` significa: el método **devuelve** una `Empresa`, y el `?` avisa que **podría no encontrar ninguna** y devolver *nada* (`null`). *(Ojo: es el mismo símbolo `?` del ternario de la 2.6, pero pegado a un tipo significa otra cosa: "quizá nada".)*
> - `FirstOrDefault(condición)` devuelve el **primer** elemento que cumple, o *nada* si ninguno.
> - `e.Nit == nit`: el `==` (doble igual) **compara** si dos valores son iguales. No lo confundas con el `=` (uno solo), que **guarda** un valor en una variable.
> - `=> ...` en vez de `{ ... }` es un método de una sola línea: devuelve lo que está a la derecha de la flecha.

> 🔮 **Predice.** Si buscas el NIT `"900123456-1"`, ¿qué empresa debería devolver? ¿Y si buscas `"000"`? (Todavía no lo usamos; eso es el Paso 5.)

### Paso 5 · Usar la búsqueda, con lo que escriba el usuario

**Te muestro.** Queremos preguntarle un NIT al usuario y, **solo si escribió algo**, buscarlo. Agrega, después de `MostrarResumen(empresas);`:

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

**Te explico** (tres piezas nuevas, despacio):

> 🆕 **Leer lo que teclea el usuario.**
> - `Console.Write("...")` imprime el texto **sin** saltar de línea (deja el cursor al lado). Es el hermano de `Console.WriteLine`, que **sí** salta de línea.
> - `Console.ReadLine()` **espera** a que el usuario escriba y presione Enter, y **devuelve** ese texto. Lo guardamos en `nit`.

> 🆕 **La guarda `!string.IsNullOrWhiteSpace(nit)` — léela por partes.**
> - `string.IsNullOrWhiteSpace(nit)` es **verdadero** cuando `nit` está **vacío o en blanco**.
> - El `!` significa **"no"**: voltea verdadero↔falso (el mismo `!` de la 2.7).
> - Entonces `!string.IsNullOrWhiteSpace(nit)` es verdadero cuando `nit` **sí tiene contenido**.
> - En palabras: *"si el usuario escribió algo, busca"*.

> 🆕 **`encontrada is not null`** se lee: *"¿`encontrada` tiene algo (no es nada)?"*. Como `BuscarPorNit` podía devolver *nada*, esto pregunta si de verdad encontró una empresa. El mensaje distinto se arma con un ternario `? :` (como el de la 2.6).

> 🔮 **Predice, luego corre.** Escribe `900123456-1` → debe encontrarla. Corre otra vez y escribe un NIT inventado → debe avisar que no existe.

> 🔨 **Rómpelo (y entiende el `!`).** Borra el `!` de la guarda (deja `if (string.IsNullOrWhiteSpace(nit))`). **Predice:** ¿qué pasa si presionas Enter *sin escribir nada*? Corre, compruébalo, y devuelve el `!`. *(Guarda tu respuesta para el commit.)*

### Paso 6 · Filtrar (quedarte solo con algunas)

**Te muestro.** Ya sabes **contar** los que cumplen (`Count`). Para **quedarte** con los que cumplen y recorrerlos, se usa `Where`. Agrega:

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

E invócalo, por ejemplo: `MostrarPorPlan(empresas, "Empresarial");`.

**Te explico:**

> 🆕 **`Where`: filtrar.** `lista.Where(e => e.Plan == plan)` se queda **solo** con los elementos que cumplen la condición (a diferencia de `Count`, que los *cuenta*). Devuelve una secuencia que puedes recorrer con `foreach`.

> 🔮 **Predice, luego corre.** Con `"Empresarial"`, *¿cuántas empresas se imprimirán?* Corre y compruébalo.

> 🎯 **Ahora adáptalo (esto no se copia).** Haz que `MostrarPorPlan` muestre **solo las INACTIVAS** de ese plan. Pegar la solución de arriba te dará todas las del plan; tienes que **cambiar la condición** tú: pide **dos cosas a la vez** — que sea del plan **y** que no esté activa.
>
> *(Pista — solo la herramienta: el `&&` une dos condiciones y significa "y" (ambas deben cumplirse). El "no está activa" ya lo escribiste en la 2.7 con `!`. Ármalo tú.)*

<details>
<summary>👉 ¿Te trabaste? Muéstrame una forma</summary>

```csharp
foreach (var e in lista.Where(e => e.Plan == plan && !e.Activa))
```

`&&` exige que **las dos** condiciones sean verdaderas: del plan pedido **y** no activa.
</details>

### Paso final · Guardar el avance (el commit donde demuestras que entendiste)

```bash
cd ../..
git checkout -b feat/consultas-y-metodos
git add .
```

> 📓 **En el commit, responde con TUS palabras** (reemplaza los `...`):
> ```bash
> git commit -m "métodos y consultas sobre las empresas
>
> - Un método SIN parámetros vs uno CON parámetro: la diferencia es ...
> - Count, FirstOrDefault y Where sirven, cada uno, para ...
> - El '!' en !string.IsNullOrWhiteSpace(nit) sirve para ...; al quitarlo pasó ..."
> ```
> ```bash
> git push -u origin feat/consultas-y-metodos
> ```

Abre el **Pull Request**, fusiónalo, vuelve a `main` y sincroniza.

> 💡 **Por qué el commit se ve así.** Que el programa *corra* solo prueba que compila — copiar y pegar también corre. Escribir con tus palabras *por qué* funciona es lo que demuestra que de verdad lo entendiste.

---

## ✅ Compruébalo

**Que corre:**
- [ ] El programa muestra el título, las empresas y el resumen (activas e inactivas) usando **métodos**.
- [ ] La búsqueda por NIT encuentra una empresa existente y avisa cuando no existe.
- [ ] `MostrarPorPlan` muestra solo las empresas del plan pedido.

**Que entendiste:**
- [ ] Puedes explicar la diferencia entre un método que **no recibe nada** y uno que **recibe una lista**.
- [ ] Puedes decir en qué se diferencian `Count`, `FirstOrDefault` y `Where`.
- [ ] Puedes explicar el `!` de `!string.IsNullOrWhiteSpace(nit)` y qué pasó al quitarlo.

> 🚦 **Cómo te fue:** 🟢 lo entendí y pude hacer los "Ahora tú" solo · 🟡 me costó / miré la solución · 🔴 no me alcanzó. Los 🟡/🔴 son para repasar.

---

## 🧠 Lo que aprendiste

- Un **método** es una operación con nombre; puede recibir **parámetros** o ninguno, y **devolver** algo o nada.
- `Count(condición)` cuenta los que cumplen; `FirstOrDefault(condición)` devuelve el primero que cumple (o nada); `Where(condición)` se queda con todos los que cumplen.
- El `!` **niega** una condición; `&&` exige **dos** condiciones a la vez.
- Organizar la lógica en métodos es la base de cómo se estructura una aplicación — incluida tu API (su repositorio tendrá métodos como `ObtenerTodas()`, `ObtenerPorNit(nit)`).

---

## 🆘 Si algo salió mal

**"Copié y pegó y me funciona, pero no entiendo por qué."**
Relee el "Te explico". **Predice** (🔮) antes de correr y **rómpelo** (🔨) quitando el `!`. Entiendes cuando puedes predecir qué pasa si lo cambias.

**Error: "Top-level statements must precede..." o el método "no existe".**
Regla de orden del Paso 1: las **invocaciones** van **arriba**; las **definiciones** de métodos y el `record Empresa` van **al final**. Si mezclaste el orden, muévelas.

**El programa no espera mi búsqueda.**
Ejecuta con `dotnet run` desde la terminal (necesita una consola interactiva para `Console.ReadLine`).

---

**➡️ Siguiente fase:** [Fase 3 — Cómo se comunican los programas](../03-como-se-comunican-http/README.md)
