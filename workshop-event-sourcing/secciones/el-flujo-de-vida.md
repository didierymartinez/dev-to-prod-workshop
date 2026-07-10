# El flujo de vida (EventStream)

Ya tienes un motor de replay elegante (`AggregateRoot`). Pero para "despertar" a la empresa, todavía le pasas a mano una lista cruda:

```csharp
var historia = new List<object> { new EmpresaRegistrada(...) /* … */ };
var empresa = new Empresa(historia);
```

## 🎯 El Objetivo

Dejar de manosear listas crudas. Queremos un envoltorio que **encapsule** la historia de una empresa —que **sea su dueño**— y exponga las dos operaciones del diario: **leerlo** (rehidratar la empresa) y **anotar** un hecho nuevo. Que el consumidor solo diga *"dame la empresa"* o *"anota esto"*, sin tocar nunca una lista suelta.

## El problema de la lista cruda

Pasar una `List<object>` de un lado a otro tiene dos fallas:

1. **Acoplamiento.** Quien quiera consultar la empresa tiene que saber *cómo* se rehidrata (`new Empresa(historia)`). Eso no debería ser problema de quien la consume — solo quiere "dame la empresa".
2. **Historia suelta y expuesta.** Una `List<object>` pelada viaja de mano en mano: cualquiera puede reordenarla o meterle basura (`historia.Add("hola")`) antes de que llegue a su destino.

La cura para ambas: un objeto que **sea dueño de la historia** —la guarde escondida— y exponga solo dos puertas: **`.Get()`** para leerla (rehidratar) y **`.Append()`** para anotar un hecho nuevo. La lista cruda deja de andar suelta.

## Un nombre que ya conoces: el *Event Stream*

Antes de escribir ese objeto, ponle nombre a lo que va a envolver. En [Los primeros hechos](los-primeros-hechos.md) viste que **la secuencia ordenada de hechos de una empresa es un Stream** —su historia completa, la única fuente de la verdad—. Pues bien: esa historia, la de **una sola** empresa, es un **Event Stream**. No es nada nuevo; es el mismo Stream de [Los primeros hechos](los-primeros-hechos.md), dicho con su nombre completo.

> [!NOTE]
> **No lo confundas con el `Stream` de C#.** El `System.IO.Stream` que quizá ya usaste lee bytes de un archivo o de la red. Nuestro **Event Stream** no tiene nada que ver: es la **historia de hechos de una empresa**, un concepto de Event Sourcing, no una tubería de bytes.

El concepto, entonces, es la **historia**. Lo que nos falta es el **código para trabajar con ella**: un objeto que sea dueño de ese stream, lo guarde escondido, y nos deje leerlo y escribirlo. A ese envoltorio lo vamos a llamar `EventStream<T>` —porque representa el flujo de hechos de una entidad—. Ten clara la distinción desde ya: el **Event Stream** es la historia (el dato); la clase `EventStream<T>` es nuestro **objeto para leerla y escribirla** (el código). Y es un andamio: lo construimos a mano para *entender* el ciclo anotar→cargar→rehidratar. Más adelante una librería de verdad hará ese trabajo por nosotros, y esta clase **desaparecerá**.

## 🔧 Refactor 1: el envoltorio para `Empresa`

Empecemos por lo obvio. La meta es usarla así —anotar hechos y pedir la empresa ya rehidratada, sin tocar una lista suelta:

```csharp
var stream = new EventStreamDeEmpresa();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
var empresa = stream.Get();   // Empresa ya rehidratada
```

> 🛠️ **Inténtalo tú.** Crea una clase `EventStreamDeEmpresa` con su **propia** `List<object>` escondida (nace **vacía**). Dale dos métodos: `Append(object hecho)` que **anote** un hecho nuevo en esa lista, y `Get()` que cree una `Empresa` **vacía** y la rehidrate llamando a `Load(...)` (el motor que escribiste en [Refactorizando el motor](refactorizando-el-motor.md)). *(Para eso `Empresa` necesita un constructor **sin parámetros** —el envoltorio la crea vacía y luego la rehidrata—; añádeselo y quita el que recibía la historia.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🟢 primer intento: un envoltorio solo para Empresa, dueño de su historia
public class EventStreamDeEmpresa
{
    private readonly List<object> _historia = new();   // suya, escondida, nace vacía

    public void Append(object hecho) => _historia.Add(hecho);   // ANOTAR un hecho nuevo

    public Empresa Get()                                        // LEER: rehidratar
    {
        var empresa = new Empresa();
        empresa.Load(_historia);   // reproduce los hechos anotados
        return empresa;
    }
}
```

Y en tu `Empresa` de [Refactorizando el motor](refactorizando-el-motor.md), **cambia el constructor** (quita el que recibía la historia, añade uno sin parámetros):

```csharp
// 🔁 Reemplaza la Empresa de «Refactorizando el motor»: su constructor ya no recibe la historia
public class Empresa : AggregateRoot
{
    // … propiedades y el switch Aplicar de «Refactorizando el motor», sin cambios …
    public Empresa() { }   // sin parámetros: el envoltorio la crea vacía y la rehidrata
}
```
</details>

### 💥 El dolor: tendrías un envoltorio por cada agregado

El día que tengas una `Factura` event-sourced, copiarías `EventStreamDeEmpresa` entero cambiando `Empresa` por `Factura`. La mecánica —ser dueño de la lista, anotar hechos, crear el agregado vacío y rehidratarlo— es **idéntica** para todos. Lo único que cambia es **el tipo**. C# permite parametrizar justo eso: un **genérico** (con una restricción especial — esta vez te lo muestro yo, porque la sintaxis es nueva).

> 💡 **El nombre ya te lo decía.** `EventStreamDeEmpresa` se lee *"un Event Stream **de** Empresa"*. Generalizar es convertir ese **"De ⟨algo⟩"** en un **hueco entre paréntesis angulares `<>`**: el **`De`** se vuelve los **`<>`**, y el tipo (`Empresa`) entra ahí como si lo **pasaras de parámetro**. Así:
> ```
> EventStream De Empresa   →   EventStream<Empresa>
>            └──┬──┘                       └───┬───┘
>            se vuelve <>            el "parámetro": el tipo que envuelve
> ```
> Y si en la **definición** de la clase dejas ese hueco **sin fijar** —lo llamas `T`— la clase queda **genérica**: `EventStream<T>` sirve para cualquier agregado, y tú eliges el tipo al **usarla** (`EventStream<Empresa>`, `EventStream<Factura>`, `EventStream<Pedido>`…).

**🔁 Reemplaza `EventStreamDeEmpresa` por esta versión genérica** (y **borra** `EventStreamDeEmpresa`: el genérico la deja obsoleta):

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly List<object> _historia = new();   // el stream es DUEÑO de su historia

    public void Append(object hecho) => _historia.Add(hecho);   // ESCRIBIR: anota un hecho

    public T Get()                                              // LEER: crea y rehidrata
    {
        var entidad = new T();
        entidad.Load(_historia);   // reproduce la historia
        return entidad;
    }
}
```

> [!NOTE]
> **¿Y ese `where T : AggregateRoot, new()`?** Es la **restricción especial** que prometimos. Le exige dos cosas al tipo `T` — que sea un `AggregateRoot` (para poder llamarle `.Load(...)`) y que tenga un **constructor sin parámetros** (eso significa `new()`, para crear uno vacío con `new T()`). Sin esas dos garantías, el compilador no te dejaría usar `.Load` ni `new T()` dentro de la clase.

Y arriba, **reemplaza** tu `var historia = …; var empresa = new Empresa(historia);` por el stream: créalo, **anota** los hechos con `Append`, y luego pídele la empresa con `Get`:

```csharp
var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));   // anota
stream.Append(new PlanCambiado("Premium"));                            // anota

var empresa = stream.Get();   // lee: crea y rehidrata
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}");
```

> 🔍 **¿Lo lograste?** Corre `dotnet run`. Deberías ver:
> ```
> Constructora Andes: plan Premium
> ```
> (Esta historia es corta —solo registro y cambio de plan—, por eso no aparece "suspendida".) Y revisa que ya **no** quede ni `EventStreamDeEmpresa` ni la `new List<object>{ … }` armada a mano: ahora los hechos entran **uno a uno por `Append`**.

Quien consume ya **no sabe ni le importa** cómo se guarda ni cómo se rehidrata: `Append` para anotar, `.Get()` para recibir la `Empresa` lista — la lista cruda nunca sale a la luz. Ese patrón —un envoltorio que esconde la **lista de eventos** y te entrega el objeto— se llama **Repositorio**. `EventStream<T>` y "Repositorio" son el **mismo objeto** con dos nombres: *event stream* por la historia que envuelve, *repositorio* por cómo la esconde y te entrega la empresa. No es una pieza nueva ni cambia tu código: es solo el nombre que le dan los libros de diseño.

> [!NOTE]
> 🌱 **Semilla — los genéricos no son solo "ahorrar código".** Sin `<T>` tendrías que devolver `object` y andar casteando por todos lados (con riesgo de reventar en ejecución). Con `EventStream<Empresa>`, el compilador **sabe** que `Get()` devuelve una `Empresa`: autocompletado, seguridad de tipos, cero sorpresas. Esta misma firma —genérico con restricción a `AggregateRoot`— es **exactamente** la que usan las librerías que adoptaremos para cargar agregados. La estás construyendo a mano.

### Por ahora, los hechos los pones tú (a mano)

Detente en cómo usaste `Append`. Así como `Get` te **guía** a reconstruir la empresa (le pides la entidad y él reproduce la historia), `Append` es la **otra mitad** del ciclo: escribir. Pero fíjate **quién decide qué se anota**: **tú**. Fabricaste cada hecho a mano (`new EmpresaRegistrada(...)`, `new PlanCambiado("Premium")`) y se lo entregaste al stream. Y el stream **anota lo que le des, sin preguntar** — no valida reglas ni decide nada: solo guarda lo que le pasas.

O sea, ahora mismo estás **insertando los hechos arbitrariamente, desde afuera**. Hazte la pregunta incómoda: ¿quién garantiza que esa empresa *puede* cambiar de plan, o que no la estás suspendiendo dos veces? Hoy, **nadie**. Está bien para *este* paso —queríamos aislar el ciclo **escribir → leer**—, pero **decidir** qué hechos ocurren (con sus reglas) es responsabilidad de la **propia empresa**. Esa responsabilidad se la daremos en la próxima sección; por ahora, tú pones los hechos.

---

### El Descubrimiento

Envolviste la historia de una empresa en un **`EventStream<T>`** genérico —un **Repositorio** dueño de su lista— que **anota** hechos (`Append`) y **rehidrata** el agregado (`Get`), de modo que quien consume nunca toca la lista cruda: solo escribe y lee a través del stream.

Pero hoy los hechos que anotas los **fabricas a mano**, sin que nadie vigile las reglas. En la próxima sección, la **empresa toma el control**: ella decide qué hechos ocurren y los **emite** —protegiendo lo que es válido—, en vez de que se los insertemos por la fuerza.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime `Constructora Andes: plan Premium`, con los hechos **anotados por `Append`** y la empresa obtenida vía `.Get()` (sin `new Empresa(historia)` ni `new List<object>{ … }` sueltos por ahí).
- [ ] El consumidor escribe y lee sin tocar la lista cruda: solo `Append(...)` y `.Get()`.
- [ ] Intenta `new EventStream<string>()` y observa que **no compila**: `string` no es un `AggregateRoot`, y la restricción `where` lo impide.
- [ ] Quítale a `Empresa` el constructor `public Empresa() { }` y mira el error: sin constructor sin parámetros, `new T()` deja de compilar — eso es lo que exige el `new()` del `where`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** intenta `new EventStream<string>()`. ¿Por qué no compila? Y hoy, ¿quién decide qué hechos se anotan?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El flujo de vida" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

La historia de una empresa se envuelve en un **`EventStream<T>`** genérico (un **Repositorio**) que es **dueño** de la lista de hechos: anotas con `Append` y lees con `.Get()` (que crea y rehidrata), sin que la lista cruda ande suelta.

---

[⬅️ Volver: Refactorizando el motor](./refactorizando-el-motor.md)

[➡️ Siguiente: Decidir el futuro (emitir eventos)](./decidir-el-futuro.md)
