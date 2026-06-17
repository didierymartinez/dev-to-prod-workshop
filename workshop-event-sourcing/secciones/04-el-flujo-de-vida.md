# 04 · El flujo de vida (EventStream)

Ya tienes un motor de replay elegante (`AggregateRoot`). Pero para "despertar" a la empresa, todavía le pasas a mano una lista cruda:

```csharp
var historia = new List<object> { new EmpresaRegistrada(...) /* … */ };
var empresa = new Empresa(historia);
```

## 🎯 El Objetivo

Dejar de manosear listas crudas. Queremos un envoltorio que **encapsule** la rehidratación —instanciar la empresa y reproducir su historia— para no repetir `new Empresa(historia)` por todo el programa, y que el consumidor solo diga *"dame la empresa"*.

## El problema de la lista cruda

Pasar una `List<object>` de un lado a otro tiene dos fallas:

1. **Acoplamiento.** Quien quiera consultar la empresa tiene que saber *cómo* se rehidrata (`new Empresa(historia)`). Eso no debería ser problema de quien la consume — solo quiere "dame la empresa".
2. **Historia suelta y expuesta.** Una `List<object>` pelada viaja de mano en mano: cualquiera puede reordenarla o meterle basura (`historia.Add("hola")`) antes de que llegue a su destino.

La cura para ambas: un objeto que **tome la historia una sola vez**, la guarde escondida, y exponga solo `.Get()`.

## Un nombre que ya conoces: el *Event Stream*

Antes de escribir ese objeto, ponle nombre a lo que va a envolver. En la §02 viste que **la secuencia ordenada de hechos de una empresa es un Stream** —su historia completa, la única fuente de la verdad—. Pues bien: esa historia, la de **una sola** empresa, es un **Event Stream**. No es nada nuevo; es el mismo Stream de la §02, dicho con su nombre completo.

> [!NOTE]
> **No lo confundas con el `Stream` de C#.** El `System.IO.Stream` que quizá ya usaste lee bytes de un archivo o de la red. Nuestro **Event Stream** no tiene nada que ver: es la **historia de hechos de una empresa**, un concepto de Event Sourcing, no una tubería de bytes.

El concepto, entonces, es la **historia**. Lo que nos falta es el **código para trabajar con ella**: un objeto que tome ese stream, lo guarde escondido y nos entregue la empresa ya rehidratada. A ese envoltorio lo vamos a llamar `EventStream<T>` —porque representa el flujo de hechos de una entidad—. Ten clara la distinción desde ya: el **Event Stream** es la historia (el dato); la clase `EventStream<T>` es nuestro **objeto para leerla** (el código). Y es un andamio: lo construimos a mano para *entender* el ciclo cargar→rehidratar, y más adelante una librería de verdad hará ese trabajo por nosotros —tanto, que esta clase **desaparecerá**: le pediremos la empresa directamente al almacén, sin envoltorio de por medio—.

## 🔧 Refactor 1: el envoltorio para `Empresa`

Empecemos por lo obvio: una clase que envuelva la historia de una `Empresa`.

> 🛠️ **Inténtalo tú.** Crea una clase `EventStreamDeEmpresa` que reciba la `List<object>` en su constructor y la guarde escondida; y un método `Get()` que cree una `Empresa` **vacía** y la rehidrate llamando a `Load(...)` (el motor que escribiste en §03). *(Para eso `Empresa` necesita un constructor **sin parámetros** —el envoltorio la crea vacía y luego la rehidrata—; añádeselo y quita el que recibía la historia.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🟢 primer intento: un envoltorio solo para Empresa
public class EventStreamDeEmpresa
{
    private readonly List<object> _historia;
    public EventStreamDeEmpresa(List<object> historia) => _historia = historia;

    public Empresa Get()
    {
        var empresa = new Empresa();
        empresa.Load(_historia);   // rehidrata reproduciendo los hechos
        return empresa;
    }
}
```

Y en tu `Empresa` de §03, **cambia el constructor** (quita el que recibía la historia, añade uno sin parámetros):

```csharp
// 🔁 Reemplaza la Empresa de la §03: su constructor ya no recibe la historia
public class Empresa : AggregateRoot
{
    // … propiedades y el switch Aplicar de la §03, sin cambios …
    public Empresa() { }   // sin parámetros: el envoltorio la crea vacía y la rehidrata
}
```
</details>

### 💥 El dolor: tendrías un envoltorio por cada agregado

El día que tengas una `Factura` event-sourced, copiarías `EventStreamDeEmpresa` entero cambiando `Empresa` por `Factura`. La mecánica —crear el agregado vacío, rehidratarlo con sus hechos— es **idéntica** para todos. Lo único que cambia es **el tipo**. C# permite parametrizar justo eso: un **genérico** (con una restricción especial — esta vez te lo muestro yo, porque la sintaxis es nueva).

**🔁 Reemplaza `EventStreamDeEmpresa` por esta versión genérica** (y **borra** `EventStreamDeEmpresa`: el genérico la deja obsoleta):

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly List<object> _historia;
    public EventStream(List<object> historia) => _historia = historia;

    public T Get()
    {
        var entidad = new T();
        entidad.Load(_historia);   // reproduce la historia
        return entidad;
    }
}
```

> [!NOTE]
> **¿Qué es ese `<T>` y el `where`?**
> El `<T>` (de *Type*) es un **hueco para un tipo** que rellenas al usar la clase: `EventStream<Empresa>` significa "un stream de empresas". Así **una sola clase** sirve para cualquier agregado.
> La parte `where T : AggregateRoot, new()` son **restricciones**: le exigen a `T` dos cosas — que sea un `AggregateRoot` (para poder llamarle `.Load(...)`) y que tenga un **constructor sin parámetros** (eso significa `new()`), para poder crear uno vacío con `new T()`.

Y arriba, **reemplaza** tu `var empresa = new Empresa(historia);` por el stream:

```csharp
var historia = new List<object>
{
    new EmpresaRegistrada("Constructora Andes", "Básico"),
    new PlanCambiado("Premium"),
};

var empresa = new EventStream<Empresa>(historia).Get();   // instancia y rehidrata
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}");
```

> 🔍 **¿Lo lograste?** Corre `dotnet run`. Deberías ver:
> ```
> Constructora Andes: plan Premium
> ```
> (Esta historia es corta —solo registro y cambio de plan—, por eso no aparece "suspendida".) Y revisa que ya **no** quede ni `EventStreamDeEmpresa` ni `new Empresa(historia)` sueltos.

Quien consume ya **no sabe ni le importa** cómo se rehidrata: pide `.Get()` y recibe una `Empresa` lista. Ese patrón —un envoltorio que esconde la **lista de eventos** y te entrega el objeto— se llama **Repositorio**. O sea: `EventStream<T>` y "Repositorio" son el **mismo objeto** visto desde dos ángulos — *event stream* por la historia que envuelve, *repositorio* por la forma de esconderla y entregarte la empresa.

> [!NOTE]
> 🌱 **Semilla — los genéricos no son solo "ahorrar código".** Sin `<T>` tendrías que devolver `object` y andar casteando por todos lados (con riesgo de reventar en ejecución). Con `EventStream<Empresa>`, el compilador **sabe** que `Get()` devuelve una `Empresa`: autocompletado, seguridad de tipos, cero sorpresas. Esta misma firma —genérico con restricción a `AggregateRoot`— es **exactamente** la que usan las librerías que adoptaremos para cargar agregados. La estás construyendo a mano.

> [!NOTE]
> **El límite de esta lista.** El stream rehidrata la historia que le des, pero esa `List<object>` anda suelta: hoy somos nosotros quienes la armamos a mano. Y si tienes **1.000** empresas, tendrías 1.000 listas sueltas. ¿Cómo se **archivan y organizan** miles de historias sin variables globales por todas partes? Para eso, en la próxima sección, llega un **almacén central** — y con él aparecerá, por primera vez y porque por fin hace falta, la **identidad** de cada empresa.

---

### El Descubrimiento

Envolviste la historia de una empresa en un **`EventStream<T>`** genérico: un **Repositorio** que crea el agregado y lo rehidrata, de modo que quien consume solo pide `.Get()` y recibe una `Empresa` lista, sin saber cómo se reconstruye.

Pero queda un cuello de botella: si llegan **1.000 empresas**, tendrías 1.000 listas sueltas flotando en el programa. ¿Cómo se **archivan y organizan** miles de historias sin variables globales por todas partes? Para eso necesitamos un **Event Store**.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime `Constructora Andes: plan Premium`, obtenido vía `.Get()` (sin `new Empresa(historia)` suelto por ahí).
- [ ] El consumidor obtiene la `Empresa` sin saber cómo se rehidrata: solo llama a `.Get()`.
- [ ] Intenta `new EventStream<string>(…)` y observa que **no compila**: `string` no es un `AggregateRoot`, y la restricción `where` lo impide.
- [ ] Quítale a `Empresa` el constructor `public Empresa() { }` y mira el error: sin constructor sin parámetros, `new T()` deja de compilar — eso es lo que exige el `new()` del `where`.

---

## 🧠 En una frase

La historia de una empresa se envuelve en un **`EventStream<T>`** genérico (un **Repositorio**) que instancia y rehidrata por ti; el consumidor solo pide `.Get()` y recibe la `Empresa` lista, sin saber cómo se reconstruye.

---

[⬅️ Volver: Refactorizando el motor](./03-refactorizando-el-motor.md)

[➡️ Siguiente: El almacén en memoria (Event Store)](./05-el-almacen-en-memoria.md)
