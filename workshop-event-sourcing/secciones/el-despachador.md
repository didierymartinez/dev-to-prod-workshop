# El despachador: dado un comando, encuentra su handler

En [El Command Handler](el-command-handler.md) quedó **una clase por comando** —`CambiarPlanHandler`, `SuspenderHandler`—, cada una con su `Handle`. Pero para ejecutar uno **eliges la clase y la llamas a mano**: `new SuspenderHandler(stream).Handle("falta de pago")`. Eres **tú** quien sabe, para cada comando, qué clase instanciar. Vamos a quitarte ese trabajo — y, al hacerlo, van a **nacer** las piezas que faltaban.

## 🎯 El Objetivo

Construir **un solo punto** que reciba un comando **cualquiera** y encuentre y ejecute su handler **por el tipo del comando** —sin un `switch`, sin nombrar clases—. Y descubrir, en el camino, las **dos piezas** que ese punto exige.

## 💥 El dolor: el que despacha eres tú

Piensa en lo que viene: el comando **llega de afuera** (el cuerpo de una petición HTTP, un mensaje de una cola) y alguien tiene que mandarlo a su handler. Hoy ese alguien eres tú, con un `switch` que crece con cada comando:

```csharp
// 💥 crece con CADA comando nuevo — y reacopla a quien despacha con todos los handlers
switch (algo)
{
    case "cambiar plan": new CambiarPlanHandler(stream).Handle(...); break;
    case "suspender":    new SuspenderHandler(stream).Handle(...);   break;
    // … una rama más, para siempre
}
```

Lo que quieres es: *"toma este comando, **el que sea**, encuentra su handler y llámalo"*. Al intentar escribir ese único método chocas con **dos** paredes — y cada una te pide una pieza.

## 🔧 Pieza 1 — cada comando, su propio tipo (el Comando)

Para encontrar el handler *"del comando que llega"*, lo natural es rutear por **el tipo** del comando. Pero tus handlers reciben un `string` (`Handle(string motivo)`): el tipo de `"falta de pago"` y el de `"Premium"` es **el mismo** (`string`) — no hay forma de distinguir una intención de otra por su tipo. Necesitas que **cada comando sea su propio tipo**.

Eso es un **Comando**: un `record` por intención, que de paso empaqueta sus datos.

> 🛠️ **Inténtalo tú.** (1) Crea un `record` por comando: `CambiarPlanDeEmpresa(string NuevoPlan)` y `SuspenderEmpresa(string Motivo)`. (2) **🔁** Cambia cada handler para que su `Handle` reciba **su comando** (en vez del `string`) y lea los datos de ahí (`cmd.NuevoPlan`, `cmd.Motivo`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public record CambiarPlanDeEmpresa(string NuevoPlan);
public record SuspenderEmpresa(string Motivo);

public class CambiarPlanHandler(EventStream<Empresa> stream)
{
    public void Handle(CambiarPlanDeEmpresa cmd) =>
        stream.Append(stream.Get().CambiarPlan(cmd.NuevoPlan));
}

public class SuspenderHandler(EventStream<Empresa> stream)
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var hecho = stream.Get().Suspender(cmd.Motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
```
</details>

> [!NOTE]
> **¿Por qué un `record`?** Además de darle a cada intención un **tipo** propio (lo que el ruteo necesita), una vez expresada no debería **alterarse en tránsito**: el `record` la hace **inmutable** y comparable por su contenido (un DTO limpio). Y de regalo: como ahora es **un dato con tipo**, puede **viajar** (llegar de una API o una cola), **loguearse**, **encolarse** o **reintentarse** — algo que un `string` suelto no permitía.

> [!NOTE]
> 💡 **Todavía sin id.** Manejamos **una** empresa, sobre su stream — el comando no necesita decir *cuál*. Cuando lleguen **muchas** ([El almacén por id](el-almacen-por-id.md)), el comando ganará un `EmpresaId`.

## 🔧 Pieza 2 — un contrato común (`ICommandHandler<T>`)

Ya puedes rutear por tipo. Pero el despachador tendrá que **guardar** todos los handlers en una sola tabla y **llamarlos igual**, sin conocer cada clase. Hoy `CambiarPlanHandler` y `SuspenderHandler` no comparten **nada** —son tipos sueltos—; no hay forma de tratarlos uniformemente. Necesitan un **molde común**: una interfaz que diga *"sé manejar un comando de tipo `T`"*.

> 🛠️ **Inténtalo tú.** Declara `ICommandHandler<TCommand>` con un único `Handle(TCommand)`, y haz que cada handler lo **implemente** (`: ICommandHandler<CambiarPlanDeEmpresa>`, …). Los cuerpos no cambian. *(El `<T>` es la misma sintaxis de `EventStream<T>`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface ICommandHandler<TCommand>
{
    void Handle(TCommand comando);
}

public class CambiarPlanHandler(EventStream<Empresa> stream) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd) =>
        stream.Append(stream.Get().CambiarPlan(cmd.NuevoPlan));
}

public class SuspenderHandler(EventStream<Empresa> stream) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var hecho = stream.Get().Suspender(cmd.Motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
```
</details>

> [!NOTE]
> **¿Y por qué una interfaz, no una clase abstracta como `AggregateRoot`?** En [Refactorizando el motor](refactorizando-el-motor.md) elegiste una **clase abstracta** porque había **código y estado compartidos** que heredar (el bucle `Load`, el `Id`). Aquí es al revés: los handlers **no comparten implementación** —el `Handle` de uno no tiene nada que ver con el del otro—, así que no hay nada que heredar. Solo necesitas un **contrato**: *"sé manejar `TCommand`"*. Eso es una **interfaz** (y un handler puede cumplir varias; una clase base le gastaría su única herencia).

## 🔧 La tabla, a mano primero

Con las dos piezas en mano, el despachador es una **tabla** que mapea **el tipo del comando** a una función que lo maneja: registras cada handler una vez, y despachar es **buscar por el tipo** del comando que llega. Antes de envolverla en una clase, **constrúyela a mano** — para *ver* qué guarda.

> 🛠️ **Inténtalo tú.** Crea un `Dictionary<Type, Action<object>>`. Por cada handler **agrega una entrada**: la llave es `typeof(SuComando)` y el valor una lambda que recibe el comando como `object`, lo **castea** a su tipo concreto y llama `Handle`. Luego despacha buscando por `comando.GetType()`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var cambiarPlan = new CambiarPlanHandler(stream);
var suspender   = new SuspenderHandler(stream);

var handlers = new Dictionary<Type, Action<object>>();

handlers.Add(typeof(CambiarPlanDeEmpresa),
    (object comando) => cambiarPlan.Handle((CambiarPlanDeEmpresa)comando));   // castea y llama

handlers.Add(typeof(SuspenderEmpresa),
    (object comando) => suspender.Handle((SuspenderEmpresa)comando));

object comando = new SuspenderEmpresa("falta de pago");   // llega como object
handlers[comando.GetType()](comando);                     // → SuspenderHandler.Handle
```
</details>

Lee cada entrada: la lambda recibe `comando` como `object` (la tabla guarda funciones **uniformes** `Action<object>`), lo **castea** al comando concreto y se lo pasa al handler que ya instanciaste. Despachar es `handlers[comando.GetType()](comando)`: busca la función por el tipo y la ejecuta. Funciona — y poblarla a mano una vez es el mejor modo de *ver* qué guardará el despachador.

### 💥 El dolor: repites el tipo, y puedes desalinearlo

Mira el patrón de cada `Add`: `typeof(X)` … `(X)comando`. El mismo tipo `X`, repetido por entrada. Y **nada obliga a que coincidan** la llave, el cast y el handler — esto **compila** y revienta al despachar:

```csharp
// 💥 la llave dice un tipo, el cast dice otro
handlers.Add(typeof(SuspenderEmpresa),
    (object comando) => cambiarPlan.Handle((CambiarPlanDeEmpresa)comando));
// al llegar un SuspenderEmpresa intentaría (CambiarPlanDeEmpresa)comando → InvalidCastException EN EJECUCIÓN
```

## 🔧 Extrae el patrón: nace `Registrar<T>` (y el `Despachador`)

Esas dos líneas por handler son **el mismo patrón** con `X` cambiando → pide un **método genérico** que reciba `X` como parámetro de tipo `T` y arme la entrada por ti. Y de paso **cura el dolor**: si la llave es `typeof(T)`, el cast es `(T)` y el handler es `ICommandHandler<T>`, los tres son **el mismo `T`**, y el compilador te impide desalinearlos.

> 🛠️ **Inténtalo tú.** Envuelve el diccionario en una clase `Despachador`. (1) `Registrar<T>(ICommandHandler<T> handler)` guarda, bajo `typeof(T)`, la lambda `comando => handler.Handle((T)comando)`. (2) `Enviar(object comando)` busca por `comando.GetType()` y lo ejecuta. *(Es exactamente lo que hacías a mano — con `T` en vez de repetir el tipo.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Despachador
{
    private readonly Dictionary<Type, Action<object>> _handlers = new();

    // al registrar conocemos T: guardamos una lambda que castea el object a T y llama Handle
    public void Registrar<T>(ICommandHandler<T> handler)
        => _handlers[typeof(T)] = (object comando) => handler.Handle((T)comando);

    // al enviar solo tenemos un object: buscamos su handler por el tipo del comando y lo llamamos
    public void Enviar(object comando)
        => _handlers[comando.GetType()](comando);
}
```
</details>

Compara, línea a línea, lo que escribías a mano con lo que `Registrar<T>` hace por dentro — **son lo mismo**, con un solo `T` en lugar del tipo repetido:

```csharp
// a mano: TÚ repetías el tipo (y podías desalinear llave / cast / handler)
handlers.Add(typeof(SuspenderEmpresa),
    comando => suspender.Handle((SuspenderEmpresa)comando));

// Registrar<SuspenderEmpresa>(suspender) arma esa MISMA entrada, con un único T:
_handlers[typeof(T)] = comando => handler.Handle((T)comando);
// la llave typeof(T), el cast (T) y el handler ICommandHandler<T>: los tres, el mismo T
```

> [!NOTE]
> 💡 **El truco de la lambda — y por qué `Registrar` es más seguro, no solo más corto.** El genérico `T` solo existe al **registrar** (ahí C# sabe que es `SuspenderEmpresa`). La lambda `comando => handler.Handle((T)comando)` **captura** ese `T` y queda como un `Action<object>` uniforme, así la tabla es homogénea aunque cada handler reciba un comando distinto. Y como la llave, el cast y el handler son **el mismo `T`**, ya **no puedes** desalinearlos como en el `Add` a mano: el compilador lo garantiza. Sin `dynamic`, sin reflexión — solo un diccionario y un delegado.

Úsalo: registras cada handler una vez, y despachas comandos que llegan **como `object`**, sin saber qué clase los maneja:

```csharp
var despachador = new Despachador();
despachador.Registrar(new CambiarPlanHandler(stream));
despachador.Registrar(new SuspenderHandler(stream));

object comando = new SuspenderEmpresa("falta de pago");   // llega como object
despachador.Enviar(comando);                              // encuentra SuspenderHandler por el tipo y lo llama
```

> [!NOTE]
> 💡 **Inferencia: el `<T>` que no escribes.** En `Registrar(new SuspenderHandler(stream))` no pusiste `Registrar<SuspenderEmpresa>`: C# **deduce** el `T` del tipo del handler (`SuspenderHandler : ICommandHandler<SuspenderEmpresa>`). El genérico está ahí trabajando aunque no lo veas — y si algún día la inferencia no alcanza, lo pones explícito (`Registrar<SuspenderEmpresa>(...)`).

## 🏷️ Por qué hacían falta las dos piezas

Mira el despachador y verás a las dos piezas **ganando su sueldo** — y por qué no se inventaron antes:

- **El `record` (tipo por comando):** la llave de la tabla es `comando.GetType()`. Si los comandos fueran `string`, su tipo sería siempre `System.String` → todos colisionarían en una entrada y el despachador no podría distinguir uno de otro. Cada comando necesita su **tipo** para ser ruteado.
- **La interfaz `ICommandHandler<T>`:** el cuerpo de `Registrar<T>` es `handler.Handle((T)comando)`. Esa línea **solo se puede escribir** porque `handler` es un `ICommandHandler<T>`. Sin el contrato, `handler` sería `object` y no habría `Handle` que llamar de forma tipada (caerías en reflexión o `dynamic`, la magia que el taller evita).

Ninguna de las dos apareció "porque sí" en [El Command Handler](el-command-handler.md): **nacieron aquí, cuando el despachador las exigió**. Ese es el punto — un concepto se introduce cuando hay un trabajo que sin él no se puede hacer.

> [!NOTE]
> 🌳 **Cosecha — esto es lo que Wolverine hará por ti.** Acabas de construir las dos mitades de un **mediador** de comandos: `Registrar` (llenar la tabla *tipo → handler*) y `Enviar` (rutear por tipo). Cuando reveles Wolverine ([El gran reveal (2)](revelar-wolverine.md)): `Discovery.IncludeAssembly` hace tu `Registrar` —escanea el ensamblado y arma la tabla sola— y `bus.InvokeAsync(comando)` hace tu `Enviar`. Por eso, cuando Wolverine **descubre por convención**, tu `ICommandHandler<T>` se vuelve **opcional**: el framework encuentra el `Handle` solo. Pero tú, sin esa magia, **necesitabas** el contrato para escribir el despachador — y eso es lo que te deja entender qué hace el framework por dentro.

> [!NOTE]
> 💡 **El `Despachador` es un andamio para *entender*, no la meta.** Lo construiste para **sentir** por qué hacían falta el tipo-comando y el contrato. Lo **seguirás usando** un tramo —de hecho, en la próxima sección lo usas tal cual, con handlers que ahora reciben el almacén—; pero cuando el motor se vuelva **async** (unas secciones adelante) este `Despachador` sencillo **dejará de encajar** (su `Handle` síncrono no casa con un `HandleAsync`). Ahí lo jubilamos: el despachador *de verdad* lo pone **Wolverine**.
>
> Dos cosas para anotar de su **cableado** (`Registrar(new SuspenderHandler(stream))`): (1) ata cada handler a **un** stream fijo — solo sirve con **una** empresa; cuando llegue el almacén-por-id ([El almacén por id](el-almacen-por-id.md)), el handler abrirá el stream **por id dentro de `Handle`**, no lo recibirá ya fijado. (2) Ese `new …` a mano —el del `Registrar` y el de cada handler— es el **germen del "infierno de los `new`"** que despacharás con **inyección de dependencias** unas secciones más adelante.

---

### El Descubrimiento

Quisiste **un punto único** que rutee cualquier comando a su handler, y eso hizo nacer dos piezas en su **momento de necesidad**: un **`record` por comando** (para rutear por tipo) y un **contrato `ICommandHandler<T>`** (para tratar a todos los handlers igual). El **`Despachador`** —una tabla `tipo → handler`— las usa para despachar sin `switch` ni clases concretas.

Pero todo esto sigue sobre **una sola** empresa, en un stream suelto. ¿Y cuando tengas **mil**? Necesitas un sitio central que guarde la historia de **cada** una y te dé la correcta por su **id** — y que, con varios escritores, **detecte los choques** con esos números de versión. Eso es el **Event Store**, la próxima sección.

---

## ✅ Compruébalo

- [ ] Cada comando es un **`record`** propio, y los handlers reciben su comando (`Handle(CambiarPlanDeEmpresa)`), no un `string`.
- [ ] Tus handlers implementan **`ICommandHandler<T>`**, y tu `Despachador` enruta un `object comando` a su handler por `comando.GetType()`, **sin** `switch` y sin nombrar clases.
- [ ] Explicas por qué el despachador **necesita** las dos piezas: el `record` (para rutear por tipo — con `string` colisionarían) y la interfaz (para llamar `Handle` de forma tipada sin reflexión/`dynamic`).
- [ ] Reconoces el mapeo: `Registrar` ≈ el *discovery* de Wolverine, `Enviar` ≈ `bus.InvokeAsync`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Antes tenías handlers por comando y los llamabas a mano. ¿Qué te **obligó** a crear el `record` por comando y el contrato `ICommandHandler<T>`? ¿Qué se rompería si los comandos fueran `string`?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El despachador" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Para tener **un punto que rutee cualquier comando a su handler** nacen, en su momento de necesidad, el **`record` por comando** (identidad de tipo para rutear) y el contrato **`ICommandHandler<T>`** (molde común para tratarlos igual); el **`Despachador`** (`Dictionary<Type, Action<object>>`) los usa — y es justo lo que Wolverine industrializará con *discovery* + `InvokeAsync`.

---

[⬅️ Volver: El Command Handler](./el-command-handler.md)

[➡️ Siguiente: El almacén: un cajón por empresa](./el-almacen-por-id.md)
