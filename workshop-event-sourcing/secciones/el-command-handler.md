# El Command Handler

En la sección anterior, el ciclo **cargar → actuar → guardar** quedó suelto en el `Program.cs`: tomar el stream, hacer `Get()`, llamar a `CambiarPlan`, hacer `Append`. Funciona, pero ese flujo de trabajo no debería vivir desperdigado en el arranque del programa.

## 🎯 El Objetivo

Encapsular ese "cargar → actuar → guardar" en una pieza con un solo trabajo, para que el resto del programa solo diga *"ejecuta esta intención"* y no sepa de streams; y que cada hecho archivado quede **numerado** (su versión).

## La empresa decide; alguien más hace la logística

La `Empresa` (el agregado) se concentra en **vivir y hacer cumplir sus reglas**: decide y emite hechos. Pero, ¿acaso la empresa va a rehidratarse y guardar los hechos cada vez? No. Para eso tiene un **secretario** que: (1) carga su historia desde el stream, (2) la rehidrata, (3) le presenta la intención, y (4) **guarda** el hecho que la empresa emita. Ese secretario es el **Command Handler**.

## La intención, como objeto: un Comando

Hasta ahora la "intención" era llamar a un método (`empresa.CambiarPlan("Enterprise")`). Para que esa petición pueda **viajar** (desde una API, una cola, otro servicio), la empaquetamos como un dato: un **Comando**.

```csharp
public record CambiarPlanDeEmpresa(string NuevoPlan);
public record SuspenderEmpresa(string Motivo);
```

> [!NOTE]
> **¿Por qué un `record` para el comando?** Igual que un evento, un comando es un **dato que viaja** y nadie debería alterar en tránsito. El `record` lo hace **inmutable**: una vez que alguien expresa "cambia el plan a Enterprise", ese paquete llega intacto a su handler. Es un simple vehículo de datos (un DTO).

> [!NOTE]
> 💡 **Todavía sin id.** Por ahora manejamos **una** empresa, sobre su stream — el comando no necesita decir *cuál*. Cuando lleguen **muchas** ([El almacén en memoria](el-almacen-en-memoria.md)), el comando ganará un `EmpresaId` y el handler la buscará por él.

## El handler: cargar → actuar → guardar, en un solo sitio

Empecemos por lo **concreto**: una clase que haga ese trabajo para la `Empresa`.

> 🛠️ **Inténtalo tú.** Crea una clase `EmpresaCommandHandlers` que reciba el `EventStream<Empresa>` por **constructor** (constructor primario). Dale **un método por comando** —`CambiarPlan(...)` y `Suspender(...)`— que: **cargue** (`Get`), pida a la empresa que **decida**, y **guarde** (`Append`) el hecho. **Ojo:** `Suspender` puede devolver `null` (idempotencia, [Decidir el futuro](decidir-el-futuro.md)) → en ese caso **no** guardes nada.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EmpresaCommandHandlers(EventStream<Empresa> stream)
{
    public void CambiarPlan(CambiarPlanDeEmpresa cmd)
    {
        var empresa = stream.Get();                        // 1. cargar (rehidratar)
        stream.Append(empresa.CambiarPlan(cmd.NuevoPlan));  // 2+3. actuar y guardar
    }

    public void Suspender(SuspenderEmpresa cmd)
    {
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(cmd.Motivo);
        if (hecho is not null)        // ← Suspender devuelve null si ya estaba suspendida (idempotencia)
            stream.Append(hecho);     //    en ese caso NO guardamos nada
    }
}
```
</details>

Fíjate en el `if (hecho is not null)`: como en [Decidir el futuro](decidir-el-futuro.md) hicimos que `Suspender` devuelva `null` cuando la operación es redundante (idempotencia), el handler **debe** respetarlo y no archivar un hecho inexistente. La regla la decide el agregado; el handler solo la **obedece**.

Ahora el `Program.cs` ya no orquesta nada: crea el handler y le pasa la intención.

```csharp
var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));

var handlers = new EmpresaCommandHandlers(stream);
handlers.Suspender(new SuspenderEmpresa("falta de pago"));

Console.WriteLine(stream.Get().Suspendida ? "suspendida" : "activa");   // suspendida
```

## 🔧 Un handler por comando (no un súper-secretario)

Funciona, pero esconde un acoplamiento: si mañana una API web quiere suspender una empresa, tendría que **saberse de memoria** que el método se llama `Suspender` y vive en `EmpresaCommandHandlers`. Quien envía la intención no debería conocer los nombres internos del secretario.

La salida es la **misma jugada que con `EventStream<T>`** ([El flujo de vida](el-flujo-de-vida.md)): ya tienes lo **concreto**, ahora extrae lo **abstracto**. Un **contrato genérico** con un único método inequívoco —`Handle`— y, por **responsabilidad única**, una clase handler **por cada comando** (especialistas, no un súper-secretario). La interfaz te la muestro (la sintaxis genérica ya la conoces). **🔁 Reemplaza `EmpresaCommandHandlers` por esto** —y **bórrala**—:

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

Ahora quien envía un comando solo busca *"alguien que cumpla `ICommandHandler<SuspenderEmpresa>`"* y llama a `Handle` — sin saber nombres internos:

```csharp
ICommandHandler<SuspenderEmpresa> handler = new SuspenderHandler(stream);
handler.Handle(new SuspenderEmpresa("falta de pago"));
```

> [!NOTE]
> 🌱 **Semilla — este handler es plomería que se repite.** Mira los dos `Handle`: ambos hacen *Get → llamar al método → Append*, cambiando solo el comando y el método. Ese patrón tan repetitivo es justo lo que **Wolverine descubrirá y generará por ti** más adelante: tú escribirás solo la decisión, y el framework pondrá el cargar/guardar. Lo construyes a mano ahora para que, cuando lo veas automatizado, sepas exactamente qué hace.

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

Pero todo esto maneja **una sola** empresa, sobre un stream suelto. ¿Y cuando tengas **mil**? Necesitas un sitio central que guarde la historia de **cada** empresa y te dé la correcta por su **id** — y que, ahora que habrá varios escritores, **detecte los choques** usando esos números de versión. Eso es el **Event Store**, la próxima sección.

---

## ✅ Compruébalo

- [ ] Moviste el ciclo "cargar → actuar → guardar" del `Program.cs` a un handler **por comando** que implementa `ICommandHandler<TCommand>`.
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

El **Command Handler** es una capa delgada que orquesta **cargar → actuar → guardar** para un comando (un `record`), dejando la lógica en el agregado; y al archivar, el `EventStream` envuelve cada hecho en un **sobre `EventoAlmacenado`** con su **posición** (su versión) — el número que pronto servirá para detectar escrituras que chocan.

---

[⬅️ Volver: Decidir el futuro (emitir eventos)](./decidir-el-futuro.md)

[➡️ Siguiente: El almacén en memoria (Event Store)](./el-almacen-en-memoria.md)
