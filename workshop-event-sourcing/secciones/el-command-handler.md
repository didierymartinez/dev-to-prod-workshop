# El Command Handler

En la sección anterior, el ciclo **cargar → actuar → guardar** quedó suelto en el `Program.cs`: tomar el stream, hacer `Get()`, llamar a `CambiarPlan`, hacer `Append`. Funciona, pero ese flujo de trabajo no debería vivir desperdigado en el arranque del programa.

## 🎯 El Objetivo

Encapsular ese "cargar → actuar → guardar" en una pieza con un solo trabajo, para que el resto del programa solo diga *"ejecuta esta intención"* y no sepa de streams; y que cada hecho archivado quede **numerado** (su versión).

## La empresa decide; alguien más hace la logística

La `Empresa` (el agregado) se concentra en **vivir y hacer cumplir sus reglas**: decide y emite hechos. Pero, ¿acaso la empresa va a rehidratarse y guardar los hechos cada vez? No. Para eso tiene un **secretario** que: (1) carga su historia desde el stream, (2) la rehidrata, (3) le presenta la intención, y (4) **guarda** el hecho que la empresa emita. Ese secretario es el **Command Handler**.

## El handler: primer intento (con los parámetros sueltos)

Empecemos por lo **concreto y directo**: una clase que orqueste **cargar → decidir → guardar** para la `Empresa`, recibiendo los parámetros **sueltos**.

> 🛠️ **Inténtalo tú.** Crea `EmpresaCommandHandlers` que reciba el `EventStream<Empresa>` por **constructor**. Dale **un método por operación, con sus parámetros sueltos** —`CambiarPlan(string nuevoPlan)` y `Suspender(string motivo)`—: cada uno **carga** (`Get`), pide a la empresa que **decida**, y **guarda** (`Append`) el hecho. **Ojo:** `Suspender` puede devolver `null` (idempotencia, [Decidir el futuro](decidir-el-futuro.md)) → en ese caso **no** guardes nada.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EmpresaCommandHandlers(EventStream<Empresa> stream)
{
    public void CambiarPlan(string nuevoPlan)
    {
        var empresa = stream.Get();                       // 1. cargar (rehidratar)
        stream.Append(empresa.CambiarPlan(nuevoPlan));     // 2+3. actuar y guardar
    }

    public void Suspender(string motivo)
    {
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(motivo);
        if (hecho is not null) stream.Append(hecho);       // null = ya suspendida → no guardamos
    }
}
```
</details>

> [!NOTE]
> 🆕 **Idioma de C#: el constructor primario.** `public class EmpresaCommandHandlers(EventStream<Empresa> stream)` declara el parámetro `stream` **en la cabecera de la clase** (un *constructor primario*, C# 12+): queda disponible en todos los métodos sin que escribas un campo ni un constructor aparte. Es azúcar para el clásico `private readonly EventStream<Empresa> _stream; public EmpresaCommandHandlers(EventStream<Empresa> stream) { _stream = stream; }`. Es la misma idea posicional del `record`, ahora en una `class` — y la verás en todos los handlers de aquí en adelante.

El `if (hecho is not null)` respeta la idempotencia que decidió el agregado ([Decidir el futuro](decidir-el-futuro.md)): la regla la pone la `Empresa`; el handler solo la **obedece**.

El `Program.cs` ya no orquesta el ciclo: crea el handler y le pide la operación, **directo, con sus valores**:

```csharp
var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));

var handlers = new EmpresaCommandHandlers(stream);
handlers.CambiarPlan("Premium");
handlers.Suspender("falta de pago");

Console.WriteLine(stream.Get().Suspendida ? "suspendida" : "activa");   // suspendida
```

Funciona — pero **todo en una sola clase** no escala.

## 🔧 Una clase por comando (rompe el súper-secretario)

Esa clase es un **súper-secretario**: hoy 2 operaciones, mañana 20, todas amontonadas y tocadas por todos. Por **responsabilidad única**, cada operación merece su **propia clase** —un especialista, no un secretario que hace de todo—.

> 🛠️ **Inténtalo tú.** **🔁 Rompe `EmpresaCommandHandlers`** —y **bórrala**— en **una clase por comando**: `CambiarPlanHandler` y `SuspenderHandler`. Cada una recibe el `EventStream<Empresa>` por constructor y tiene un método `Handle(...)` —con sus **parámetros sueltos**, como antes— que hace **cargar → decidir → guardar** (respetando el `null` de `Suspender`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class CambiarPlanHandler(EventStream<Empresa> stream)
{
    public void Handle(string nuevoPlan) =>
        stream.Append(stream.Get().CambiarPlan(nuevoPlan));
}

public class SuspenderHandler(EventStream<Empresa> stream)
{
    public void Handle(string motivo)
    {
        var hecho = stream.Get().Suspender(motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
```
</details>

Para ejecutar uno, **eliges la clase y la llamas a mano**:

```csharp
var handler = new SuspenderHandler(stream);
handler.Handle("falta de pago");
```

Funciona. Pero fíjate: **tú** decides, para cada comando, **qué clase instanciar**. Cuando quieras un **único punto** que reciba un comando *cualquiera* y lo rutee a su handler —sin que quien lo envía conozca la clase—, eso pedirá un par de piezas más: un **tipo por comando** y un **contrato común**. No las inventamos aquí porque **todavía no hacen falta** — nacerán justo cuando las necesites, al construir el **despachador** ([El despachador](el-despachador.md)).

> [!NOTE]
> 🌱 **Semilla — este handler es plomería que se repite.** Mira los dos `Handle`: ambos hacen *Get → decidir → Append*, cambiando solo el comando y el método. Primero, en [El despachador](el-despachador.md), construirás **a mano** lo que rutea cada comando a su handler; más adelante verás que **Wolverine descubre y genera todo eso por ti** —tú escribirás solo la decisión, el framework pondrá el cargar/guardar y encontrará el handler por su tipo, ese `switch` que no tuviste que escribir—. Lo construyes a mano ahora para que, cuando lo veas automatizado, sepas exactamente qué hace.

## 🔧 La versión del evento: el stream numera lo que archiva

Hoy tu stream guarda los hechos en una lista pelada. Pero cada hecho, una vez archivado, ocupa una **posición fija** en la historia: el 1.º, el 2.º, el 3.º… Esa posición es su **versión**. Conviene grabarla (y la fecha) junto al hecho, en un **sobre**:

```csharp
// el sobre: envuelve el hecho con su POSICIÓN en el stream y cuándo se anotó
public record EventoAlmacenado(int Version, DateTime Timestamp, object EventData);
```

> 🛠️ **Inténtalo tú.** **🔁 Modifica** tu `EventStream<T>`: que guarde `EventoAlmacenado` (no `object` pelado), lleve un `_version` que **sube con cada `Append`**, y al leer **desenvuelva** el sobre (al agregado le interesa el hecho, no el sobre).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly List<EventoAlmacenado> _historia = new();
    private int _version;

    public void Append(object hecho)                       // ESCRIBIR: el hecho toma la siguiente posición
        => _historia.Add(new EventoAlmacenado(++_version, DateTime.UtcNow, hecho));

    public T Get()                                         // LEER: desenvuelve los sobres y rehidrata
    {
        var entidad = new T();
        entidad.Load(_historia.Select(s => s.EventData));   // solo el hecho, no el sobre
        return entidad;
    }
}
```
</details>

> 💡 El sobre **no** lleva quién es la empresa: el stream **ya es** de una empresa. Solo añade lo que el hecho por sí mismo no sabe: su **posición** y su fecha.

> [!NOTE]
> Por ahora `_version` **arranca en 0** en cada instancia del stream —siempre haces `Append` desde cero, así que numera bien (1, 2, 3…)—. Cuando el almacén te entregue historias **ya existentes** (próxima sección), el `Get()` aprenderá a **leer la última posición** del cajón para seguir contando desde ahí. Aún no hace falta.

> [!NOTE]
> 🌱 **Semilla — ¿para qué numerar?** Hoy el número parece decorativo. Pero será la **llave** para detectar conflictos: cuando aparezcan **varias** empresas y **varios escritores** sobre el mismo stream ([El almacén en memoria](el-almacen-en-memoria.md)), comparar *"¿la versión que esperabas sigue libre?"* es lo que evita que dos escrituras simultáneas se pisen. Eso es la **concurrencia optimista**, y la verás allí.

> [!NOTE]
> 🌱 **Semilla — los errores no se manejan con `try/catch` por todos lados.** Cuando un `Handle` falle (una regla no se cumple, la red cae), el instinto es llenar el método de `try/catch`. Eso ensucia y oculta la lógica. Más adelante verás dos caminos mejores: tratar el resultado como *"éxito o fallo"* que fluye por el sistema (**railway**), y apoyarte en las **políticas de reintento/error del framework**. Por ahora: que tu handler **exprese la regla**, no que se ahogue en manejo de errores.

---

### El Descubrimiento

Quedó repartido con claridad: el **Aggregate Root** (`Empresa`) tiene la **lógica pura** (decide/evolve, sin I/O, protege reglas), y el **Command Handler** hace el **trabajo de logística** (rehidratar desde el stream, pedir la decisión, guardar el hecho). Y cada hecho archivado queda **numerado** en su sobre.

> [!NOTE]
> 🌱 **Semilla — esta repartición es un regalo para los tests.** Como el agregado es puro y el handler es una capa delgada, puedes probar **toda tu lógica de negocio sin mocks ni base de datos**: das hechos pasados (*Given*), ejecutas un comando (*When*) y verificas el hecho emitido (*Then*). Es justo el estilo que la plantilla del equipo trae listo para usar.

Pero fíjate **cómo** ejecutas un comando: eliges la **clase del handler a mano** (`new SuspenderHandler(stream)`). Para que algo reciba un comando *cualquiera* y encuentre su handler solo —sin que tú nombres la clase—, falta una pieza (y, con ella, un par más que la hacen posible). Esa pieza es el **despachador**, la próxima sección.

---

## ✅ Compruébalo

- [ ] Moviste el ciclo "cargar → actuar → guardar" del `Program.cs` a una clase handler **por comando** (`CambiarPlanHandler`, `SuspenderHandler`), cada una con su `Handle` recibiendo los **parámetros sueltos**.
- [ ] El handler de suspender respeta la idempotencia: si `Suspender` devuelve `null`, **no** hace `Append`.
- [ ] Tu `EventStream` guarda `EventoAlmacenado` (con `Version` y fecha) y **desenvuelve** el sobre al leer.
- [ ] Explicas por qué el sobre **no** lleva el id de la empresa (el stream ya es de una empresa) y para qué servirá el número de versión (detectar choques).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el handler obedece el `null` de `Suspender` en vez de decidir él la idempotencia? ¿Para qué numeras cada hecho en el sobre?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El Command Handler" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El **Command Handler** es una capa delgada (una clase **por comando**) que orquesta **cargar → actuar → guardar**, dejando la lógica en el agregado; y al archivar, el `EventStream` envuelve cada hecho en un **sobre `EventoAlmacenado`** con su **posición** (su versión) — el número que pronto servirá para detectar escrituras que chocan.

---

[⬅️ Volver: Decidir el futuro (emitir eventos)](./decidir-el-futuro.md)

[➡️ Siguiente: El despachador (dado un comando, encuentra su handler)](./el-despachador.md)
