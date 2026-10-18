# Refactorizando el motor

Tu `Empresa` se reconstruye con un `foreach` lleno de `if` dentro del constructor. Funciona, pero **ese `if` va a crecer feo**. Lo vas a evolucionar en tres pasos, y cada paso lo haces tú.

## 🎯 El Objetivo

Que el "motor" que lee la historia y reconstruye el estado sea **limpio** (no un `if` interminable) y **reutilizable** (que sirva para la `Empresa` hoy y para una `Factura` mañana, sin copiar y pegar).

Partimos de donde quedamos en [Los primeros hechos](los-primeros-hechos.md):

```csharp
public class Empresa
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
        {
            if (hecho is EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
            if (hecho is PlanCambiado p)      { Plan = p.NuevoPlan; }
            if (hecho is EmpresaSuspendida)   { Suspendida = true; }
            if (hecho is EmpresaReactivada)   { Suspendida = false; Reactivaciones++; }
        }
    }
}
```

## 🔧 Refactor 1: separar "recorrer" de "aplicar"

El constructor hace **dos** cosas: recorre la historia **y** decide qué hace cada hecho.

> 🛠️ **Inténtalo tú.** En tu `Empresa`, **saca** la lógica de los cuatro `if` a un método aparte —llámalo `Aplicar(object hecho)`— y deja el constructor con **solo** el `foreach` llamando a `Aplicar`. Corre `dotnet run`: debe imprimir lo mismo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);          // recorrer: lo único que hace el constructor
    }

    private void Aplicar(object hecho)   // aplicar: la lógica de cada hecho, aparte
    {
        if (hecho is EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
        if (hecho is PlanCambiado p)      { Plan = p.NuevoPlan; }
        if (hecho is EmpresaSuspendida)   { Suspendida = true; }
        if (hecho is EmpresaReactivada)   { Suspendida = false; Reactivaciones++; }
    }
}
```

Mismo comportamiento, con "recorrer la historia" y "aplicar un hecho" en piezas separadas. Tiene nombre: **separación de responsabilidades**.
</details>

## 🔧 Refactor 2: el motor es idéntico para todos → una clase base

El `foreach` que recorre la historia es **idéntico** para cualquier cosa con historia. El día que tengas una `Factura` event-sourced, lo copiarías, y un mes después tendrías dos copias que ya no coinciden. Recorrer debe vivir **una sola vez**.

> 🛠️ **Inténtalo tú.** Crea una clase base **`AggregateRoot`** con un método público `Load(IEnumerable<object>)` que haga el `foreach`; deja el "qué hace cada hecho" para las hijas. Haz que `Empresa` **herede** de ella y conserve solo su `Aplicar`. *(Pista: la base **no sabe** aplicar un hecho concreto; en C# un método obligatorio que la base deja sin cuerpo es `protected abstract`.)*

> [!NOTE]
> 🆕 **Idioma de C#: herencia con `abstract` / `protected` / `override`.** `abstract class AggregateRoot` es una **clase base incompleta**: no se crea con `new`, solo se hereda. `protected abstract void Aplicar(object hecho);` declara un método **obligatorio sin cuerpo**: la base exige que exista, pero no sabe implementarlo. `protected` lo deja visible **solo en la base y sus hijas**. Cada hija da el cuerpo con `protected override void Aplicar(...)` (`override` = "reemplazo el método de la base"). `Empresa : AggregateRoot` significa "`Empresa` **hereda de** `AggregateRoot`": recibe el `Load` y solo aporta su `Aplicar`.

> [!NOTE]
> 🆕 **Idioma de C#: cuerpo de expresión (`=>`).** `public Empresa(...) => Load(historia);` es la forma corta de un método o constructor de **una sola línea**: equivale a `public Empresa(...) { Load(historia); }`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

La clase base, con el motor escrito una sola vez:

```csharp
public abstract class AggregateRoot
{
    // El motor genérico: recorrer la historia y aplicar hecho por hecho.
    // Se escribe UNA vez aquí; toda entidad que herede lo reutiliza.
    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);
    }

    // Cada entidad sabrá aplicar SUS propios hechos. La base no lo sabe: por eso, abstracto.
    protected abstract void Aplicar(object hecho);
}
```

Y `Empresa` se queda solo con su `Aplicar`:

```csharp
public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa(IEnumerable<object> historia) => Load(historia);

    protected override void Aplicar(object hecho)
    {
        if (hecho is EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
        if (hecho is PlanCambiado p)      { Plan = p.NuevoPlan; }
        if (hecho is EmpresaSuspendida)   { Suspendida = true; }
        if (hecho is EmpresaReactivada)   { Suspendida = false; Reactivaciones++; }
    }
}
```
</details>

> [!NOTE]
> **¿Por qué una clase abstracta y no una interfaz?** Una **clase abstracta** lleva **código real compartido** (el bucle `Load`, escrito una vez) y puede guardar **estado**. Una **interfaz** es la **lista de lo que una clase promete tener**: aunque el C# moderno le permite métodos *por defecto*, **no guarda estado de instancia**. El motor es el mismo para todos y va a guardar estado, así que va en una clase abstracta: lo escribes **una vez** y cada hija lo hereda. Con una interfaz acabarías **repitiendo** el motor en cada clase.

## 🔧 Refactor 3: del `if` encadenado al `switch`

Queda la pila de `if (hecho is …)` en `Aplicar`: repite `is` en cada línea, y con 15 hechos son 15 `if` sueltos donde es fácil olvidar uno. C# tiene algo hecho para "según el **tipo** del hecho, haz una cosa u otra": el **`switch` por tipo** (**pattern matching**).

> 🛠️ **Inténtalo tú.** Convierte los cuatro `if (hecho is …)` de `Aplicar` en un **`switch`** por tipo. *(Pista: cada rama termina en `break;`.)*

> [!NOTE]
> 🆕 **Idioma de C#: pattern matching de tipo (`case Tipo x:`).** Un `switch` clásico compara valores (`case 1:`). Este ramifica según el **tipo** del objeto: `case EmpresaRegistrada r:` significa "si `hecho` **es** un `EmpresaRegistrada`, entra aquí y dámelo convertido en la variable `r`". Es el mismo `hecho is EmpresaRegistrada r` de tus `if`. Si no necesitas la variable, omites el nombre: `case EmpresaSuspendida:`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
protected override void Aplicar(object hecho)
{
    switch (hecho)
    {
        case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;
        case PlanCambiado p:      Plan = p.NuevoPlan;                break;
        case EmpresaSuspendida:   Suspendida = true;                break;
        case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;
    }
}
```

Misma lógica que los `if`, sin repetir `is`: un hecho nuevo es un `case` más.
</details>

> [!NOTE]
> **Otra forma de enrutar por tipo.** En vez del `switch`, el enrutado vive en la clase base, y cada hija tiene un método `Aplicar` **por tipo**. El cambio completo:
> ```csharp
> // la base: el Load enruta por el tipo REAL del hecho, en ejecución
> public abstract class AggregateRoot
> {
>     public void Load(IEnumerable<object> historia)
>     {
>         foreach (var hecho in historia)
>             ((dynamic)this).Aplicar((dynamic)hecho);   // ← aquí: llama al Aplicar que encaje
>     }
>     // ya NO se declara 'protected abstract void Aplicar(object)'
> }
>
> // la Empresa: un método público por cada tipo (sin switch, sin override)
> public class Empresa : AggregateRoot
> {
>     public string Nombre { get; private set; } = "";
>     public string Plan   { get; private set; } = "";
>     public bool   Suspendida    { get; private set; }
>     public int    Reactivaciones { get; private set; }
>
>     public Empresa(IEnumerable<object> historia) => Load(historia);
>
>     public void Aplicar(EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
>     public void Aplicar(PlanCambiado p)      { Plan = p.NuevoPlan; }
>     public void Aplicar(EmpresaSuspendida s) { Suspendida = true; }
>     public void Aplicar(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }
> }
> ```
> Funciona, y se parece a lo que un framework hace por dentro. **Pero** `(dynamic)` elige en ejecución qué `Aplicar` llamar, y **el compilador deja de verificarlo** (además es más lento).

> 🔨 **Rómpelo tú.** Al final de tu `Program.cs` agrega un hecho nuevo, `public record NombreCorregido(string Nuevo);`, y mételo al final de la historia: `new NombreCorregido("Constructora Andes S.A.")`, sin escribirle su rama. Guarda una copia del archivo (`cp Program.cs Program.bak`; igual en PowerShell) y reemplaza tu `AggregateRoot` y tu `Empresa` por las de arriba, que no tienen un `Aplicar(NombreCorregido)`. Compila sin una queja. Corre `dotnet run`:
>
> ```
> Unhandled exception. Microsoft.CSharp.RuntimeBinder.RuntimeBinderException: The best overloaded method match for 'Empresa.Aplicar(EmpresaRegistrada)' has some invalid arguments
> ```
>
> El `dynamic` no encontró un `Aplicar(NombreCorregido)`. Agregar el hecho a la historia no se quejó; cargar la empresa, sí. Y mientras ese hecho esté en la historia, **toda** carga de esta empresa lanza. Recupera tu copia (`cp Program.bak Program.cs`, y borra `Program.bak`) y corre otra vez: tu `switch` carga la misma historia sin lanzar.

Por eso **nos quedamos con el `switch`**: un hecho sin su `case` no rompe la carga de la empresa.

> 🌱 Tu `switch` todavía imprime `Constructora Andes`: saltó el `NombreCorregido` sin avisar, y el compilador no te dice que le falta un `case`. Ese silencio lo vas a sentir en [El agregado recuerda](el-agregado-recuerda.md). La **forma** de un `Aplicar` por tipo volverá más adelante, con un enrutador seguro en vez de `dynamic`.

---

## 🔍 Comprueba

Refactorizar cambia la **forma**, no el **comportamiento**. **Corre:**

```bash
dotnet run
```

> **¿Lo lograste?** Deberías ver lo **mismo** que al final de [Los primeros hechos](los-primeros-hechos.md):
> ```
> Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces
> ```
> Si no compila, revisa que quede **una sola** clase `Empresa` (la del `switch`) y **una** `AggregateRoot`, sin versiones anteriores de los refactores pegadas.

---

### El Descubrimiento

Pasaste de un `if` que crecía feo a un **motor de replay reutilizable**: una clase base **`AggregateRoot`** con el bucle `Load`, y un `Aplicar` por entidad resuelto con **pattern matching**. Lo **escribiste tú**: cuando una librería te lo dé hecho, sabrás qué hace por debajo. Pero la historia sigue siendo una `List<object>` pelada que armas a mano y le pasas al constructor: cualquiera puede reordenarla o meterle basura antes de que llegue. Ese cabo suelto es el siguiente.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime **lo mismo** que en la sección anterior: refactorizaste sin cambiar el comportamiento.
- [ ] Con el enrutado `dynamic` del 🔨, el `NombreCorregido` sin su `Aplicar` hace lanzar `RuntimeBinderException` al cargar la empresa. Con tu `switch`, la misma historia carga.
- [ ] Dale a `NombreCorregido` su rama con **un solo `case`** en el `switch` (`case NombreCorregido n: Nombre = n.Nuevo; break;`): ahora imprime `Constructora Andes S.A.`.
- [ ] Intenta `new AggregateRoot()`: **no compila**, porque una clase abstracta solo se hereda.
- [ ] Explica, con la consecuencia concreta, por qué el motor va en una **clase abstracta** y no en una interfaz.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el motor (`Load`) vive en la base `AggregateRoot` y el `Aplicar` en cada entidad? ¿Qué ganó el `switch` frente al `if`? …y ¿qué habrías perdido si hubieras elegido el enrutado con `dynamic`? Esa última déjala también en tu `DECISIONES.md`: «Enruto con un `switch`: un hecho sin su `case` no rompe la carga de la empresa. Con `dynamic`, toda carga lanzaba.»

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Refactorizando el motor" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El motor de replay (recorrer la historia y aplicar cada hecho) es **igual para toda entidad**, así que vive una sola vez en una **clase base abstracta `AggregateRoot`**; lo propio de cada una —cómo aplica sus hechos— se resuelve con un **`switch` por tipo** (pattern matching), no con un `if` que crece.

---

[⬅️ Volver: Los primeros hechos](./los-primeros-hechos.md)

[➡️ Siguiente: El flujo de vida (EventStream)](./el-flujo-de-vida.md)
