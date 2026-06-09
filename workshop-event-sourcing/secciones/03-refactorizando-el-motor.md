# 03 · Refactorizando el motor

En la sección anterior, la clase `Empresa` se reconstruía con un `foreach` lleno de `if` dentro del constructor. Funciona — pero ya lo sentimos venir: **ese `if` va a crecer feo**. Vamos a evolucionarlo en tres pasos, y cada paso lo va a pedir el código, no nosotros.

## 🎯 El Objetivo

Que el "motor" que lee la historia y reconstruye el estado sea **limpio** (no un `if` interminable) y **reutilizable** (que sirva para la `Empresa` hoy y para una `Factura` mañana, sin copiar y pegar).

Partimos de donde quedamos:

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

El constructor hace **dos** cosas a la vez: recorre la historia **y** decide qué hace cada hecho. Son responsabilidades distintas. Saquemos "qué hace cada hecho" a su propio método —lo llamaremos **`Aplicar`**— y dejemos el constructor solo recorriendo:

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

Mismo comportamiento, pero ahora el "recorrer la historia" y el "aplicar un hecho" son piezas separadas. Esto que acabas de hacer tiene nombre: **separación de responsabilidades**.

## 🔧 Refactor 2: el motor es idéntico para todos → una clase base

Mira el `foreach` que recorre la historia: *"toma la lista de hechos y aplícalos uno por uno"*. Ese bucle es **idéntico** para cualquier cosa con historia. El día que tengas una `Factura` event-sourced, copiarías exactamente ese `foreach`… y un mes después tendrías dos copias que ya no coinciden.

La mecánica común (recorrer) la subimos a una **clase base** que todos compartan; lo único propio de cada entidad (qué hace cada hecho) lo deja a sus hijas.

> [!NOTE]
> **¿Y por qué una clase abstracta, no una interfaz?**
> Las dos sirven para estandarizar ("toda entidad sabe cargar su historia"). La diferencia que importa **aquí**: una **clase abstracta** lleva **código real compartido** (el bucle `Load`, escrito una vez) y puede guardar **estado** (pronto le pondremos un `Id`); además es "incompleta" — no se crea sola con `new`. Una **interfaz** es ante todo un **contrato**: aunque el C# moderno le permite traer métodos *por defecto*, **no guarda estado de instancia**, y una clase puede implementar muchas. Como nuestro motor es **el mismo para todos** y pronto tendrá estado, encaja una clase abstracta: lo escribes **una vez** y cada hija lo hereda. (Con una interfaz, en la práctica, acabarías **repitiendo** el motor en cada clase.)

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

Y `Empresa` se queda solo con lo suyo:

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

> [!NOTE]
> 🌱 **Semilla — este motor que escribes a mano, luego lo automatiza el framework.** El ciclo "cargar la historia → aplicar hecho por hecho" es tan universal que **las librerías que adoptaremos lo hacen por ti** (lo llaman el *Aggregate Handler Workflow*). Lo construyes a mano ahora para que ese atajo, más adelante, **no sea magia**: sabrás exactamente qué hace por debajo, porque lo escribiste.

## 🔧 Refactor 3: del `if` encadenado al `switch`

Queda un olor en `Aplicar`: esa pila de `if (hecho is …)`. Repite `is` en cada línea, y si mañana hay 15 hechos, son 15 `if` sueltos donde es fácil olvidar uno. C# tiene algo hecho a la medida de "según el **tipo** del hecho, haz una cosa u otra": un **`switch` por patrones de tipo** (lo que se llama **pattern matching**).

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

> [!NOTE]
> Quizá veas por ahí una versión que elimina hasta el `switch` usando `((dynamic)this).Aplicar(...)` para enrutar por tipo en tiempo de ejecución. Es ingenioso, pero `dynamic` apaga las comprobaciones del compilador (un error de tipo explota en ejecución, no al compilar) y es más lento. Preferimos el `switch` por patrones: **tipado, revisado por el compilador y sin sorpresas**.

---

### El Descubrimiento

En tres saltos —separar, subir a una base, y rutear por tipo— pasaste de un `if` que crecía feo a un **motor de replay reutilizable**: una clase base **`AggregateRoot`** con el bucle `Load`, y un `Aplicar` por entidad resuelto con **pattern matching**. No es un `if` mejorado: es la forma en que se escribe esto en serio.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime **lo mismo** que en la sección anterior (`plan Premium`, `reactivada 1 vez/veces`): refactorizaste sin cambiar el comportamiento.
- [ ] Agrega un hecho nuevo, p. ej. `public record NombreCorregido(string Nuevo);`, y manéjalo con **un solo `case`** en el `switch` (`case NombreCorregido n: Nombre = n.Nuevo; break;`).
- [ ] Intenta `new AggregateRoot()` y observa que **no compila**: una clase abstracta no se instancia sola (por eso sirve para compartir el motor, no para usarse directa).
- [ ] Explica, con la consecuencia concreta, por qué el motor va en una **clase abstracta** y no en una interfaz.

---

## 🧠 En una frase

El motor de replay (recorrer la historia y aplicar cada hecho) es **igual para toda entidad**, así que vive una sola vez en una **clase base abstracta `AggregateRoot`**; lo propio de cada una —cómo aplica sus hechos— se resuelve con un **`switch` por tipo** (pattern matching), no con un `if` que crece.

---

[⬅️ Volver: Los primeros hechos](./02-los-primeros-hechos.md)

[➡️ Siguiente: El flujo de vida (EventStream)](./04-el-flujo-de-vida.md)
