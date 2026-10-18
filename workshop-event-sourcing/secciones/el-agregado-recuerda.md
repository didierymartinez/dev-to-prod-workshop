# El agregado recuerda lo que decide

El acto de pagar-y-reactivar chocó con un muro: el segundo `decide` decidió **a ciegas**, mirando un agregado que no vio el primer hecho. La cura es una sola, y cambia quién aplica el hecho.

## 🎯 El Objetivo

Que una acción pueda producir **varios hechos** —donde el segundo ve lo que hizo el primero— y que se guarden con **una sola** llamada.

## 🔧 Invertir quién aplica el hecho

Tus `decide` **devuelven** el hecho y no tocan el agregado; el estado solo cambia al recargar. La cura es invertir eso: que el agregado **se aplique el hecho a sí mismo** al decidir (así el siguiente `decide` ve el cambio) y lo **guarde** en una lista de hechos *sin confirmar*. Al final, una sola llamada persiste todos los de la lista.

Con eso, el mismo acto se lee así, y funciona:

```csharp
var e = stream.Get();
e.RegistrarPago(500);      // se aplica PagoRegistrado → e.DeudaPendiente pasa a false
e.Reactivar();             // ahora e SÍ ve que no hay deuda → emite EmpresaReactivada
stream.Append(e);          // guarda los dos hechos acumulados, en una sola llamada
```

> [!NOTE]
> 🆕 **`IReadOnlyList<T>`.** Una lista que desde afuera se **lee pero no se modifica**. El stream necesita **leer** los hechos sin confirmar para guardarlos, pero solo el agregado debe **agregarlos** (vía `Emitir`). Por dentro guardas un `List<object>` y lo expones como `IReadOnlyList<object>`: todo `List<T>` ya es un `IReadOnlyList<T>`.

> 🛠️ **Inténtalo tú.** Es un cambio de modelo: primero la maquinaria en `AggregateRoot` (que compila sola), y luego el volteo de la `Empresa`, el `EventStream` y los handlers, que van juntos.
> 1. **`AggregateRoot`:** añade una lista privada `_sinConfirmar` (exponla como `IReadOnlyList<object> SinConfirmar`), un `Emitir(hecho)` protegido que **aplica** el hecho (el mismo `Aplicar` del replay) **y** lo agrega a la lista, y un `MarcarConfirmados()` que la vacía. **`Load` no cambia**: el replay solo **aplica** (no acumula).
> 2. **`Empresa`:** cada `decide` deja de **devolver** el hecho y pasa a **`Emitir`** (queda `void`) — **conservando sus validaciones**: `CambiarPlan` sigue lanzando si está suspendida, solo cambia el `return` por `Emitir`. `Suspender` ya no puede devolver `null` para el no-op: ahora es `if (Suspendida) return;` **antes** de `Emitir`. `Reactivar` y `RegistrarPago` ya los tienes; igual, `return new(...)` → `Emitir(new ...)`. Y como `Append` ya no acepta un hecho suelto, la **creación** también necesita su verbo: añade `Registrar(nombre, plan)` que emita `EmpresaRegistrada`.
> 3. **`EventStream<T>`:** `Append` deja de recibir un hecho y recibe **el agregado**; recorre sus `SinConfirmar`, los guarda en orden (cada uno con su versión, como antes) y llama `MarcarConfirmados()`.
> 4. **Los tres handlers (`CambiarPlanHandler`, `SuspenderHandler`, `PagarDeudaHandler`):** ya no pueden hacer `Append(hecho)`. Ahora cargan, actúan sobre el agregado y lo guardan (`var e = stream.Get(); e.X(...); stream.Append(e);`). El de suspender pierde su `if (hecho is not null)` (el no-op vive dentro de `Suspender`). Siguen siendo `ICommandHandler<T>`: el `Despachador` no cambia, solo cambia el **cuerpo** de cada `Handle`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public abstract class AggregateRoot
{
    private readonly List<object> _sinConfirmar = new();
    public IReadOnlyList<object> SinConfirmar => _sinConfirmar;
    public void MarcarConfirmados() => _sinConfirmar.Clear();

    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia) Aplicar(hecho);   // replay: solo aplica
    }

    protected void Emitir(object hecho)   // decidir: aplica Y recuerda
    {
        Aplicar(hecho);
        _sinConfirmar.Add(hecho);
    }

    protected abstract void Aplicar(object hecho);
}
```

```csharp
public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida { get; private set; }
    public bool   DeudaPendiente { get; private set; }
    public int    Reactivaciones { get; private set; }

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;
            case PlanCambiado p:      Plan = p.NuevoPlan; break;
            case EmpresaSuspendida:   Suspendida = true; DeudaPendiente = true; break;
            case PagoRegistrado:      DeudaPendiente = false; break;
            case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;
        }
    }

    // Crear también es un verbo ahora: antes insertabas EmpresaRegistrada a mano;
    // con Append(agg), la creación emite como los demás.
    public void Registrar(string nombre, string plan) => Emitir(new EmpresaRegistrada(nombre, plan));

    public void CambiarPlan(string nuevoPlan)
    {
        if (Suspendida)   // la validación de antes, intacta
            throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");
        Emitir(new PlanCambiado(nuevoPlan));
    }

    public void Suspender(string motivo)
    {
        if (Suspendida) return;                 // idempotencia: no emite, no acumula
        Emitir(new EmpresaSuspendida(motivo));
    }

    public void RegistrarPago(int monto) => Emitir(new PagoRegistrado(monto));

    public void Reactivar()
    {
        if (DeudaPendiente)
            throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");
        Emitir(new EmpresaReactivada());
    }
}
```

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    // _store, _aggregateId, _version, Get(): sin cambios.

    public void Append(T agg)
    {
        foreach (var hecho in agg.SinConfirmar)
        {
            _version++;
            _store.AppendEvent(_aggregateId, new EventoAlmacenado(_version, hecho));
        }
        agg.MarcarConfirmados();
    }
}
```

```csharp
// Los handlers: cargar → actuar → guardar el agregado. Siguen implementando
// ICommandHandler<T> (el Despachador no cambia); solo cambia el cuerpo.
public class CambiarPlanHandler(EventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.CambiarPlan(cmd.NuevoPlan);
        stream.Append(e);
    }
}

public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.Suspender(cmd.Motivo);       // ya no compara contra null: el no-op vive dentro
        stream.Append(e);
    }
}

public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.RegistrarPago(cmd.Monto);
        e.Reactivar();
        stream.Append(e);
    }
}
```
</details>

> **¿Por qué `Load` aplica pero no acumula?** El replay **reconstruye**; solo las decisiones nuevas se **acumulan**. Por eso hay dos caminos: `Aplicar` a secas para leer, `Emitir` (aplicar + recordar) para decidir.
>
> 🔨 **Rómpelo tú.** Haz que `Load` use `Emitir` en vez de `Aplicar` y corre el arnés de pagar-y-reactivar. No lanza nada, y la empresa recargada sale igual. Pero cuenta los hechos del cajón (`store.GetEvents("emp-7").Count`): hay 6, no 4. El `Append` volvió a guardar, con versiones nuevas, el registro y la suspensión que `Load` acababa de cargar, y la historia quedó duplicada sin aviso. Devuélvelo a `Aplicar`. Por la misma razón `Append` termina con `MarcarConfirmados()`: si no quitara de la lista los hechos ya guardados, el siguiente `Append` los reescribiría.

> 🔨 **Rómpelo tú (el hecho huérfano).** Comenta la línea `case EmpresaReactivada:` en tu `Aplicar` y corre el arnés de pagar-y-reactivar. **Nada explota.** Pero recarga la empresa: `Suspendida` sigue en `true`, aunque el hecho `EmpresaReactivada` **está** en el diario. Un hecho sin su rama en `Aplicar` es un **huérfano**: no revienta, **miente**, y en silencio. Restaura la línea.
>
> Es la otra cara del `dynamic` de [Refactorizando el motor](refactorizando-el-motor.md), donde el mismo olvido hacía lanzar **toda** carga de la empresa. Lanzar tampoco sirve: el hecho ya está en el diario y no se borra, así que esa empresa no se podría volver a cargar. El criterio: el `Aplicar` ignora lo que no conoce, y al huérfano lo caza un test, no tu lectura de la consola.

> La idempotencia cambió de mecanismo: ahora que `Emitir` **muta** el agregado, la guarda `if (Suspendida) return;` corta el no-op sin recargar. Entre comandos distintos la garantiza recargar (`Get()` en cada handler).

## Un acto, dos hechos, juntos

Corre el `PagarDeudaHandler` sobre una empresa morosa recién sembrada. **Sembrar también usa el modelo nuevo**: sobre una empresa vacía, `Registrar` y `Suspender` emiten, y un solo `Append` los guarda.

```csharp
var s = store.AbrirStream<Empresa>("emp-7");
var e = s.Get();                 // empresa vacía (el diario aún no tiene eventos)
e.Registrar("Constructora Andes", "Básico");
e.Suspender("falta de pago");
s.Append(e);                     // v1 registrada, v2 suspendida — en un solo Append

new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));   // el acto: v3 pago, v4 reactivada

var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"Tras recargar → Suspendida={empresa.Suspendida}, DeudaPendiente={empresa.DeudaPendiente}");
```

```
Tras recargar → Suspendida=False, DeudaPendiente=False
```

`Reactivar` decidió bien porque esta vez **vio el pago** que se acababa de aplicar. Y el acto entró como una **unidad**: un solo `Append` con los dos hechos, en versiones consecutivas.

> 🌱 Tu modelo de escritura quedó **completo**: decide, valida, se aplica, acumula, versiona. Pero todo lo comprobaste **con los ojos**, y el huérfano te mostró que el estado puede **mentir sin que nada explote**. ¿Cómo sabrías, *sin mirar*, que tu motor hace lo que crees? Ese es el próximo dolor.

---

### El Descubrimiento

El agregado dejó de ser una función que **devuelve** hechos y pasó a **recordar lo que decidió** hasta que lo guardas: los pasos de una acción se **encadenan** y un solo `Append` los persiste. Es la forma que usan las herramientas de producción, y llegaste a ella porque la necesitaste.

---

## ✅ Compruébalo

- [ ] El `PagarDeudaHandler` corre sin excepción, y al recargar la empresa queda `Suspendida=False`, `DeudaPendiente=False`: el pago y la reactivación entraron por un solo `Append`.
- [ ] Suspender dos veces la misma empresa deja **un** solo `EmpresaSuspendida` en el diario (la idempotencia sigue viva, ahora dentro de `Suspender`).
- [ ] Explica, con tus palabras, por qué `Load` usa `Aplicar` y no `Emitir` — y qué pasaría si usara `Emitir`.
- [ ] Con `case EmpresaReactivada:` comentado, la carga no lanza y la empresa sale suspendida. Explica por qué eso miente, y por qué lanzar al cargar (como el `dynamic`) tampoco sirve.

---

## 📓 Registra tu avance

Primero, deja en tu `DECISIONES.md` la decisión de hoy:

> `Aplicar` solo asigna estado: no valida ni lanza, no mira el reloj ni genera ids — el replay lo re-ejecuta N veces y debe dar siempre lo mismo. Las reglas y los datos nuevos viven en los verbos (`CambiarPlan`, `Reactivar`), que corren UNA vez.

Y piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿qué gana el agregado al aplicarse el hecho en el momento de decidir, en vez de solo devolverlo? ¿Y por qué el replay no debe acumular lo que aplica?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El agregado recuerda lo que decide" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El agregado se **aplica** cada hecho al decidir —para que el siguiente `decide` lo vea— y los **acumula**; un solo `Append` guarda todo lo acumulado. Reconstruir (replay, solo aplica) y decidir (aplica y recuerda) pasan a ser dos caminos distintos.

---

[⬅️ Volver: Un acto de negocio, dos hechos](./un-acto-dos-hechos.md)

[➡️ Siguiente: Verde, y roto](./verde-y-roto.md)
