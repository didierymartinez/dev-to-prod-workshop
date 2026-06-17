# 07 · El Command Handler

En la sección anterior, el ciclo **cargar → actuar → guardar** quedó suelto en el `Program.cs`: abrir el stream, hacer `Get()`, llamar a `CambiarPlan`, hacer `Append`. Funciona, pero ese flujo de trabajo no debería vivir desperdigado en el arranque del programa.

## 🎯 El Objetivo

Encapsular ese "cargar → actuar → guardar" en una pieza con un solo trabajo, para que el resto del programa solo diga *"ejecuta esta intención"* y no sepa de streams ni de almacenes.

## La empresa decide; alguien más hace la logística

La `Empresa` (el agregado) se concentra en **vivir y hacer cumplir sus reglas**: decide y emite hechos. Pero, ¿acaso la empresa carga su propio almacén bajo el brazo y va a guardar los hechos cada vez? No. Para eso tiene un **secretario** que: (1) le pide al almacén su historia, (2) la rehidrata, (3) le presenta la intención, y (4) **guarda** el hecho que la empresa emita. Ese secretario es el **Command Handler**.

## La intención, como objeto: un Comando

Hasta ahora la "intención" era llamar a un método (`empresa.CambiarPlan("Enterprise")`). Para que esa petición pueda **viajar** (desde una API, una cola, otro servicio), la empaquetamos como un dato: un **Comando**.

```csharp
public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);
```

> [!NOTE]
> **¿Por qué un `record` para el comando?** Igual que un evento, un comando es un **dato que viaja** y nadie debería alterar en tránsito. El `record` lo hace **inmutable**: una vez que alguien expresa "cambia el plan de emp-7 a Enterprise", ese paquete llega intacto a su handler. Es un simple vehículo de datos (un DTO).

## El handler: cargar → actuar → guardar, en un solo sitio

> 🛠️ **Inténtalo tú.** Crea una clase `EmpresaCommandHandlers` que reciba el almacén por **constructor primario** —`EmpresaCommandHandlers(InMemoryEventStore store)`; ese `store` queda disponible en todos sus métodos (el mismo constructor primario que viste en §05)—. Dale un método por comando que: **abra** el stream de `cmd.EmpresaId`, lo **cargue** (`Get`), pida a la empresa que decida (`empresa.CambiarPlan(...)` / `Suspender(...)`), y **guarde** el hecho (`Append`). **Ojo:** `Suspender` puede devolver `null` (idempotencia, §06) → en ese caso **no** guardes nada.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EmpresaCommandHandlers(InMemoryEventStore store)   // recibe el almacén de la §05
{
    public void CambiarPlan(CambiarPlanDeEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);   // 1. cargar
        var empresa = stream.Get();
        var hecho   = empresa.CambiarPlan(cmd.NuevoPlan);               // 2. actuar (la empresa decide)
        stream.Append(hecho);                                          // 3. guardar
    }

    public void Suspender(SuspenderEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(cmd.Motivo);
        if (hecho is not null)        // ← recuerda: Suspender devuelve null si ya estaba suspendida (idempotencia)
            stream.Append(hecho);     //    en ese caso NO guardamos nada
    }
}
```
</details>

Fíjate en el `if (hecho is not null)`: como en la §06 hicimos que `Suspender` devuelva `null` cuando la operación es redundante (idempotencia), el handler **debe** respetarlo y no archivar un hecho inexistente. La regla la decide el agregado; el handler solo la **obedece**.

```csharp
var secretario = new EmpresaCommandHandlers(store);
secretario.Suspender(new SuspenderEmpresa("emp-7", "falta de pago"));

var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine(empresa.Suspendida ? "suspendida" : "activa");   // suspendida
```

> [!NOTE]
> **Recibir, no crear.** El handler **recibe** el almacén por el constructor en vez de hacer `new InMemoryEventStore()` adentro: eso ya lo separa de **fabricar** su infraestructura. Por ahora recibe el tipo **concreto** (solo hay uno). Cuando abstraigamos el almacén —al adoptar Marten—, el handler recibirá una abstracción y entonces sí dejará de saber **si** los hechos van a RAM o a PostgreSQL. Esa pieza llega cuando haya algo que variar; por ahora, lo que ya ganamos es no crear la dependencia a mano. (Las reglas de negocio, en la `Empresa`, ya quedan separadas de la infraestructura.)

## 🔧 Un handler por comando (no un "súper-secretario")

Lo de arriba funciona, pero esconde un acoplamiento: si mañana una API web quiere cambiar un plan, tendría que **saberse de memoria** que el método se llama `CambiarPlan` y vive en `EmpresaCommandHandlers`. Quien envía la intención no debería conocer los nombres internos del secretario.

La solución: un **contrato genérico** con un único método inequívoco, `Handle`. Y, siguiendo el principio de **responsabilidad única**, una clase handler **por cada comando** (especialistas, no un súper-secretario gigante). Esta vez te lo muestro (la interfaz genérica es idioma nuevo). **🔁 Reemplaza `EmpresaCommandHandlers` por esto** —y **borra** el súper-secretario—:

```csharp
public interface ICommandHandler<TCommand>
{
    void Handle(TCommand comando);
}

public class CambiarPlanHandler(InMemoryEventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = stream.Get();
        stream.Append(empresa.CambiarPlan(cmd.NuevoPlan));
    }
}

public class SuspenderHandler(InMemoryEventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(cmd.Motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
```

Ahora quien envía un comando solo busca "alguien que cumpla `ICommandHandler<SuspenderEmpresa>`" y llama a `Handle`. No necesita saber nombres internos:

```csharp
ICommandHandler<SuspenderEmpresa> handler = new SuspenderHandler(store);
handler.Handle(new SuspenderEmpresa("emp-7", "falta de pago"));
```

> [!NOTE]
> 🌱 **Semilla — este handler es plomería que se repite.** Mira los dos `Handle`: ambos hacen *abrir stream → Get → llamar al método → Append*, cambiando solo el comando y el método. Ese patrón tan repetitivo es justo lo que **Wolverine descubrirá y generará por ti** más adelante: tú escribirás solo la decisión, y el framework pondrá el cargar/guardar. Lo construyes a mano ahora para que, cuando lo veas automatizado, sepas exactamente qué hace.

> [!NOTE]
> 🌱 **Semilla — los errores no se manejan con `try/catch` por todos lados.** Cuando un `Handle` falle (una regla no se cumple, la red cae), el instinto es llenar el método de `try/catch`. Eso ensucia y oculta la lógica. Más adelante verás dos caminos mejores: tratar el resultado como *"éxito o fallo"* que fluye por el sistema (**railway**), y apoyarte en las **políticas de reintento/error del framework** (que dan reintentos y observabilidad gratis). Por ahora: que tu handler **exprese la regla**, no que se ahogue en manejo de errores.

---

### El Descubrimiento

Quedó repartido con claridad: el **Aggregate Root** (`Empresa`) tiene la **lógica pura** (decide/evolve, sin I/O, protege reglas), y el **Command Handler** hace el **trabajo de logística** (conseguir el `EventStream`, rehidratar, pedir la decisión, guardar el hecho). Acabas de construir, de punta a punta y a mano, el flujo completo de Event Sourcing en memoria.

> [!NOTE]
> 🌱 **Semilla — esta repartición es un regalo para los tests.** Como el agregado es puro y el handler es una capa delgada, puedes probar **toda tu lógica de negocio sin mocks ni base de datos**: das hechos pasados (*Given*), ejecutas un comando (*When*) y verificas el hecho emitido (*Then*). Es justo el estilo que la plantilla del equipo trae listo para usar.

Pero queda una fragilidad de fondo: ese `InMemoryEventStore` vive en RAM — **si el servidor se reinicia, se pierde todo**. Para guardar de verdad necesitamos una base de datos, y hablar con ella es **I/O que tarda**. En la próxima sección enfrentamos ese mundo: la espera, y por qué cambia la forma de nuestro código.

---

## ✅ Compruébalo

- [ ] Moviste el ciclo "cargar → actuar → guardar" del `Program.cs` a un handler; el arranque solo crea el comando y llama a `Handle`.
- [ ] Tienes un handler **por comando** que implementa `ICommandHandler<TCommand>`.
- [ ] El handler de suspender respeta la idempotencia: si `Suspender` devuelve `null`, **no** hace `Append`.
- [ ] Explica por qué el handler **recibe** el almacén por constructor en vez de crearlo adentro (separa la lógica de la creación de su infraestructura).

---

## 🧠 En una frase

El **Command Handler** es una capa delgada que orquesta **cargar → actuar → guardar** para un comando, dejando la lógica de negocio en el agregado; un **comando** es la intención empaquetada como `record`, y `ICommandHandler<T>` es el contrato que desacopla a quien la envía de quién la ejecuta.

---

[⬅️ Volver: Decidir el futuro (emitir eventos)](./06-decidir-el-futuro.md)

[➡️ Siguiente: El tiempo de espera (async/await)](./08-el-tiempo-de-espera.md)
