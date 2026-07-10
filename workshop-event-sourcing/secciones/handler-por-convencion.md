# El handler por convención

Wolverine ya descubre tus handlers. Pero el tuyo aún implementa `ICommandHandler<TCommand>`, la interfaz que creaste en [El despachador](el-despachador.md) para tu propio `Despachador`. Wolverine no la necesita.

## 🎯 El Objetivo

Que tu handler sea **una clase con un método `Handle`**, sin interfaz — Wolverine lo descubre y le inyecta sus dependencias por parámetro. Y ver cómo, al **devolver** un evento desde el handler, Wolverine lo entrega solo a otros handlers (a eso se le llama *cascading*).

## 🔧 El handler, desnudo

### Paso 1 · Borra la interfaz

Hasta ahora `IEventStore` entraba por el **constructor** del handler. Con Wolverine puedes pedirla como **un parámetro más** del método `Handle`: él la inyecta al invocar (igual que inyectaba en el endpoint de [API + DI](api-inyeccion.md)).

> 🛠️ **Inténtalo tú.** **🔁** Quita `: ICommandHandler<SuspenderEmpresa>` del handler. Déjalo como una clase con un método `Handle` que reciba el comando **y sus dependencias por parámetro**. Wolverine lo descubre por su nombre + el método.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// antes: public class SuspenderHandler(IEventStore store) : ICommandHandler<SuspenderEmpresa>
// ahora: una clase con un método Handle — sin interfaz, sin constructor
public class SuspenderHandler
{
    public async Task Handle(SuspenderEmpresa cmd, IEventStore store)   // deps por parámetro
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId);
        var hecho = empresa?.Suspender(cmd.Motivo);
        if (hecho is not null) store.AppendEvent(cmd.EmpresaId, hecho);
        // sin SaveChangesAsync: AutoApplyTransactions confirma la sesión
    }
}
```
</details>

> [!NOTE]
> 🆕 **Discovery por convención + inyección por parámetro.** Wolverine halla el handler por su forma (una clase con un método `Handle` o `HandleAsync`), sin ninguna interfaz. El **primer parámetro es el mensaje**; los demás (`IEventStore`) los **inyecta del contenedor** en un scope por invocación. Por eso `ICommandHandler<T>` es ahora **opcional**: la creaste para que tu `Despachador` casero tratara los handlers igual; Wolverine lo hace por convención, así que puedes **borrarla**.

### Paso 2 · Cascading: devolver un evento lo publica

Podrías inyectar `NotificarSuspension` en el handler y llamarlo a mano — pero entonces el que suspende tendría que **conocer** a cada reactor, y sumar uno nuevo obliga a tocarlo. **Devolver** el evento invierte eso: el emisor no sabe quién reacciona; Wolverine reparte.

> 🛠️ **Inténtalo tú.** Quieres que `InvokeAsync(new SuspenderEmpresa("emp-7","impago"))` imprima `[aviso] suspendida: impago` desde un handler que **nadie cableó**. Haz que `Handle` **devuelva** el hecho, y crea otro handler que reciba `EmpresaSuspendida` y reaccione. Wolverine conecta los dos.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class SuspenderHandler
{
    public async Task<EmpresaSuspendida?> Handle(SuspenderEmpresa cmd, IEventStore store)
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId);
        var hecho = empresa?.Suspender(cmd.Motivo);
        if (hecho is not null) store.AppendEvent(cmd.EmpresaId, hecho);
        return hecho;   // Wolverine PUBLICA este evento (si no es null)
    }
}

// otro handler, en cualquier parte del ensamblado, reacciona:
public class NotificarSuspension
{
    public void Handle(EmpresaSuspendida e) => Console.WriteLine($"[aviso] suspendida: {e.Motivo}");
}
```
</details>

> [!NOTE]
> 🆕 **Cascading messages.** Si un `Handle` **devuelve** un mensaje, Wolverine lo **publica** — lo entrega a cualquier handler que lo maneje. Si devuelve `null`, no publica nada. Aquí el mismo hecho se **persiste** (`AppendEvent`) **y se publica** (el `return`): el evento es, a la vez, el registro y el mensaje. La entrega es **asíncrona** (por una cola, no dentro del `InvokeAsync`) — en un test hay que **esperar** el efecto: usa las *tracked sessions* de Wolverine (`InvokeMessageAndWaitAsync`, que esperan a que se drenen los mensajes en vuelo), o en un spike rápido un `await Task.Delay(...)`.

> 🔍 **¿Lo lograste?** `InvokeAsync(new SuspenderEmpresa("emp-7","impago"))` → corre `SuspenderHandler` (persiste el hecho), y un instante después `NotificarSuspension` imprime el aviso, sin que nadie los conectara a mano. Wolverine ruteó el evento devuelto a su handler.

---

### El Descubrimiento

El handler quedó **desnudo**: una clase con un método `Handle`, hallada por convención, con sus dependencias inyectadas por parámetro. El contrato `ICommandHandler<T>` —que tu `Despachador` casero **exigía** para tratar a todos igual— es ahora **opcional**: Wolverine es el mediador. Y al **devolver** un evento, el hecho no solo se guarda: **se publica** a otros handlers (*cascading*). Ahí los hechos empiezan a **fluir** entre piezas de tu sistema — el comienzo de lo **event-driven**.

> [!NOTE]
> 🌱 **Semilla — no todos los hechos cruzan la frontera.** Si los eventos empiezan a viajar, surge una pregunta: ¿cuáles son **internos** (se quedan en tu servicio) y cuáles **públicos** (cruzan a otros servicios)? Distinguirlos sin una bandera ni un namespace es lo primero de **EDA**, y de ahí siguen el **sobre** del mensaje y el **outbox** (que ya sembró `IntegrateWithWolverine`). Lo verás en [Público vs privado](publico-privado.md).

---

## ✅ Compruébalo

- [ ] Tu handler es una clase con `Handle`/`HandleAsync`, **sin** `ICommandHandler<T>`; Wolverine lo descubre.
- [ ] Las dependencias (`IEventStore`) llegan **por parámetro** del método, no por constructor.
- [ ] Explicas por qué `ICommandHandler<T>` es ahora **opcional** (para qué la creaste en El despachador y por qué Wolverine la reemplaza).
- [ ] Un `Handle` que **devuelve** un evento hace que Wolverine lo **publique** (cascading); devolver `null` no publica.
- [ ] Reconoces que la entrega del evento publicado es **asíncrona** (por cola).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué `ICommandHandler<T>` dejó de ser necesaria? ¿Qué pasa cuando un handler devuelve un evento, y por qué eso es el inicio de EDA?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El handler por convención" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Con Wolverine el handler es **una clase con un método `Handle`** (deps por parámetro), descubierto por convención — la interfaz `ICommandHandler<T>` que tu `Despachador` exigía se vuelve **opcional**; y **devolver** un evento hace que Wolverine lo **publique** a otros handlers (*cascading*), donde los hechos empiezan a fluir: el comienzo de EDA.

---

[⬅️ Volver: Revelar Wolverine: el mediador](./revelar-wolverine.md)

[➡️ Siguiente: Público vs privado](./publico-privado.md)
