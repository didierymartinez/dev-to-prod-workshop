# Refactorizando el motor

En la sección anterior, la clase `Empresa` se reconstruía con un `foreach` lleno de `if` dentro del constructor. Funciona — pero ya lo sentimos venir: **ese `if` va a crecer feo**. Vamos a evolucionarlo en tres pasos, y cada paso **lo vas a hacer tú** (te reto, lo intentas, y luego te muestro una forma de hacerlo).

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

El constructor hace **dos** cosas a la vez: recorre la historia **y** decide qué hace cada hecho. Son responsabilidades distintas.

> 🛠️ **Inténtalo tú.** En tu `Empresa`, **saca** la lógica de los cuatro `if` a un método aparte —llámalo `Aplicar(object hecho)`— y deja el constructor con **solo** el `foreach` llamando a `Aplicar`. Corre `dotnet run`: debe imprimir lo mismo. Cuando lo tengas (o si te trabas), abre la solución:

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

Mismo comportamiento, pero ahora "recorrer la historia" y "aplicar un hecho" son piezas separadas. Esto que hiciste tiene nombre: **separación de responsabilidades**.
</details>

## 🔧 Refactor 2: el motor es idéntico para todos → una clase base

Mira el `foreach` que recorre la historia: *"toma la lista de hechos y aplícalos uno por uno"*. Ese bucle es **idéntico** para cualquier cosa con historia. El día que tengas una `Factura` event-sourced, copiarías exactamente ese `foreach`… y un mes después tendrías dos copias que ya no coinciden. La mecánica común (recorrer) debería vivir **una sola vez**.

> 🛠️ **Inténtalo tú.** Crea una clase base **`AggregateRoot`** con un método público `Load(IEnumerable<object>)` que haga el `foreach`; deja el "qué hace cada hecho" para las hijas. Haz que `Empresa` **herede** de ella y conserve solo su `Aplicar`. *(Pista: la base **no sabe** aplicar un hecho concreto —eso es de cada hija—; en C# ese método "obligatorio pero sin cuerpo aquí" es `protected abstract`.)*

> [!NOTE]
> 🆕 **Idioma de C#: herencia con `abstract` / `protected` / `override`.** `abstract class AggregateRoot` es una **clase base incompleta** —no se crea con `new`, solo se hereda—. `protected abstract void Aplicar(object hecho);` declara un método **obligatorio pero sin cuerpo** (`abstract`): la base exige que exista, pero no sabe implementarlo. `protected` lo hace visible **solo dentro de la base y sus hijas** (ni público ni privado). Cada hija da el cuerpo con `protected override void Aplicar(...)` (`override` = "estoy reemplazando el método de la base"). `Empresa : AggregateRoot` significa "`Empresa` **hereda de** `AggregateRoot`": recibe gratis el `Load` y solo aporta su `Aplicar`.

> [!NOTE]
> 🆕 **Idioma de C#: cuerpo de expresión (`=>`).** `public Empresa(...) => Load(historia);` es la forma corta de un método/constructor de **una sola línea**: `=> expresión;` equivale a `{ expresión; }`. Es solo azúcar sintáctica; el clásico sería `public Empresa(...) { Load(historia); }`.

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

Y `Empresa` se queda solo con lo suyo (hereda el `Load`, ya no repite el bucle):

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

Ahora, crear una `Factura` event-sourced es heredar de `AggregateRoot` y escribir solo **su** `Aplicar`. El motor `Load` ya no se copia: se reutiliza.
</details>

> [!NOTE]
> **¿Y por qué una clase abstracta, no una interfaz?**
> Las dos sirven para estandarizar ("toda entidad sabe cargar su historia"). La diferencia que importa **aquí**: una **clase abstracta** lleva **código real compartido** (el bucle `Load`, escrito una vez) y puede guardar **estado**; además es "incompleta" — no se crea sola con `new`. Una **interfaz** —la **lista de lo que una clase promete tener**, sin código propio— es ante todo un **contrato**: aunque el C# moderno le permite traer métodos *por defecto*, **no guarda estado de instancia**, y una clase puede implementar muchas. Como nuestro motor es **el mismo para todos** y pronto tendrá estado, encaja una clase abstracta: lo escribes **una vez** y cada hija lo hereda. (Con una interfaz, en la práctica, acabarías **repitiendo** el motor en cada clase.)

> [!NOTE]
> 🌱 **Semilla — este ciclo lo escribes a mano a propósito.** "Cargar la historia → aplicar hecho por hecho" es tan universal que tarde o temprano algo lo hará por ti. Lo construyes ahora para que ese atajo, cuando un muro real lo reclame, no sea magia: sabrás qué hace por debajo, porque lo escribiste.

## 🔧 Refactor 3: del `if` encadenado al `switch`

Queda un olor en `Aplicar`: esa pila de `if (hecho is …)`. Repite `is` en cada línea, y si mañana hay 15 hechos, son 15 `if` sueltos donde es fácil olvidar uno. C# tiene algo hecho a la medida de "según el **tipo** del hecho, haz una cosa u otra": un **`switch` por patrones de tipo** (lo que se llama **pattern matching**).

> 🛠️ **Inténtalo tú.** Convierte los cuatro `if (hecho is …)` de `Aplicar` en un **`switch`** por tipo. *(Pista: `case EmpresaRegistrada r:` te entrega el hecho ya convertido en `r`, y cada rama termina en `break;`.)*

> [!NOTE]
> 🆕 **Idioma de C#: pattern matching de tipo (`case Tipo x:`).** Un `switch` clásico compara valores (`case 1:`, `case "hola":`). Aquí el `switch` ramifica según el **tipo** del objeto: `case EmpresaRegistrada r:` significa "si `hecho` **es** un `EmpresaRegistrada`, entra aquí y dámelo ya convertido en la variable `r`". Es el mismo `hecho is EmpresaRegistrada r` que ya usabas en los `if`, ahora como rama del `switch`. Si no necesitas la variable (porque el hecho no trae datos), omites el nombre: `case EmpresaSuspendida:`.

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

Cada `case` es "si el hecho es de **este tipo**, recíbelo ya convertido (`r`, `p`) y haz esto". Misma lógica que los `if`, pero agrupada, sin repetir `is`, y mucho más fácil de leer y crecer: un hecho nuevo = un `case` más.
</details>

> [!NOTE]
> **Otra forma de enrutar por tipo (que NO usaremos, pero vale la pena ver entera).** En vez del `switch`, el enrutado podría vivir en la clase base, y cada hija tener un método `Aplicar` **por tipo**. El cambio completo sería así:
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
>     public void Aplicar(EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
>     public void Aplicar(PlanCambiado p)      { Plan = p.NuevoPlan; }
>     public void Aplicar(EmpresaSuspendida s) { Suspendida = true; }
>     public void Aplicar(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }
> }
> ```
> Funciona, y se parece a lo que un framework hace por dentro (un `Aplicar` por tipo, enrutado solo). **Pero** `(dynamic)` enruta en ejecución y **el compilador deja de verificarte los tipos**: si te falta un `Aplicar`, el error sale al correr el programa, no al compilar (y es más lento). Por eso **nos quedamos con el `switch`** de arriba: la misma idea, pero tipada.
>
> 🌱 Guarda eso sí la **forma** —un `Aplicar` por tipo—: la volverás a encontrar más adelante, con un enrutador seguro en vez de `dynamic`. Cuando la veas, recuerda que aquí ya decidiste por qué el enrutado en ejecución no te sirve.

---

## 🔍 Comprueba

Refactorizaste el motor en tres pasos. Como refactorizar cambia la **forma**, no el **comportamiento**, la salida debe seguir igual. **Corre:**

```bash
dotnet run
```

> **¿Lo lograste?** Deberías ver lo **mismo** que al final de [Los primeros hechos](los-primeros-hechos.md):
> ```
> Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces
> ```
> Si no coincide, un refactor alteró el comportamiento (no debería). Y revisa que en tu código quede **una sola** clase `Empresa` (la del `switch`) y **una** `AggregateRoot`: si dejaste pegada alguna versión anterior de los refactores, no compilará.

---

### El Descubrimiento

En tres saltos —separar, subir a una base, y rutear por tipo— pasaste de un `if` que crecía feo a un **motor de replay reutilizable**: una clase base **`AggregateRoot`** con el bucle `Load`, y un `Aplicar` por entidad resuelto con **pattern matching**. No es un `if` mejorado: es la forma en que se escribe esto en serio. Y lo **escribiste tú** — por eso, cuando una librería te lo dé hecho, sabrás exactamente qué hace. Pero mira cómo lo usas: la historia sigue siendo una `List<object>` pelada que armas a mano y le pasas al constructor. Cualquiera puede reordenarla o meterle basura antes de que llegue. Ese cabo suelto es el siguiente.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime **lo mismo** que en la sección anterior (`plan Premium`, `reactivada 1 vez/veces`): refactorizaste sin cambiar el comportamiento.
- [ ] Agrega un hecho nuevo, p. ej. `public record NombreCorregido(string Nuevo);`, y manéjalo con **un solo `case`** en el `switch` (`case NombreCorregido n: Nombre = n.Nuevo; break;`).
- [ ] Intenta `new AggregateRoot()` y observa que **no compila**: una clase abstracta no se instancia sola (por eso sirve para compartir el motor, no para usarse directa).
- [ ] Explica, con la consecuencia concreta, por qué el motor va en una **clase abstracta** y no en una interfaz.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el motor (`Load`) vive en la base `AggregateRoot` y el `Aplicar` en cada entidad? ¿Qué ganó el `switch` frente al `if`? …y ¿qué habrías perdido si hubieras elegido el enrutado con `dynamic`? Esa última déjala también en tu `DECISIONES.md`: elegiste enrutado tipado — el compilador avisa si falta un `Aplicar`.

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
