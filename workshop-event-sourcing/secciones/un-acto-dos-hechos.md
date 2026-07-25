# Un acto de negocio, dos hechos

Tu motor de escritura ya decide, valida y versiona. Pero todas tus acciones produjeron **un solo** hecho — y nunca fue decisión de diseño: solo no habías topado con una que produjera **dos**.

## 🎯 El Objetivo

Montar una acción de negocio que produce **dos** hechos y ver, corriéndola, por qué el modelo en que `decide` **devuelve** el hecho no la puede expresar. Aquí llegamos hasta el muro; arreglarlo es lo que sigue.

## 💥 El dolor: pagar y reactivar, en un solo acto

Una empresa morosa está **suspendida por falta de pago**. Cuando paga su deuda, el negocio pide dos cosas en el mismo acto: **registrar el pago** y **reactivarla**. Con una regla: no puedes reactivar una empresa que aún debe.

Para montarlo necesitas un hecho y un poco de estado nuevos, en el estilo que ya conoces: el método `decide` **devuelve** el hecho.

> 🛠️ **Inténtalo tú.**
> 1. Un hecho nuevo `PagoRegistrado(int Monto)` (`int` por simplicidad; el tipo del monto no es el tema de hoy).
> 2. En la `Empresa`: una propiedad `DeudaPendiente`. En `Aplicar`, **🔁 reemplaza** el `case EmpresaSuspendida` para que **además** ponga `DeudaPendiente = true`, y añade un `case PagoRegistrado` que la ponga en `false`. *(Simplificamos: aquí toda suspensión es por mora, así que la tratamos como deuda; en un dominio real el motivo diría si la hay o no.)*
> 3. Un verbo `RegistrarPago(int monto)` que **devuelve** `PagoRegistrado` (como los demás `decide`). Y a `Reactivar` dale la regla: si `DeudaPendiente`, lanza `ReglaDeNegocioException` (la misma de antes); si no, devuelve `EmpresaReactivada`.
> 4. Un comando `PagarDeuda(string EmpresaId, int Monto)` (con `EmpresaId`, como los otros comandos).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public record PagoRegistrado(int Monto);

// En Empresa (los decide siguen DEVOLVIENDO el hecho):
public bool DeudaPendiente { get; private set; }

// dentro del switch de Aplicar:
case EmpresaSuspendida: Suspendida = true; DeudaPendiente = true; break;
case PagoRegistrado:    DeudaPendiente = false; break;

public PagoRegistrado RegistrarPago(int monto) => new(monto);

public EmpresaReactivada Reactivar()
{
    if (DeudaPendiente)
        throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");
    return new();
}

// El comando (con EmpresaId, como los otros):
public record PagarDeuda(string EmpresaId, int Monto);
```
</details>

Ahora el acto en sí. Es un handler como los que ya escribiste: carga la empresa, decide los dos hechos y los guarda.

```csharp
public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        stream.Append(e.RegistrarPago(cmd.Monto));   // 1) registrar el pago
        stream.Append(e.Reactivar());                 // 2) reactivar
    }
}
```

Monta una empresa morosa —registrada y luego suspendida por mora— y dispara el handler:

```csharp
var store = new EventStore();
var s = store.AbrirStream<Empresa>("emp-7");
s.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
s.Append(new EmpresaSuspendida("falta de pago"));    // suspendida por mora → queda con deuda

new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));
```

```
💥 ReglaDeNegocioException: No puedes reactivar con deuda pendiente.
```

La empresa **acaba de pagar** y aun así `Reactivar` la rechaza por deuda. ¿Por qué? `Reactivar()` mira `e` para decidir, y `e` **no vio el pago**. Tus `decide` **devuelven** el hecho pero no se lo aplican al agregado — el estado de `e` solo cambia cuando **recargas** (el replay). Con un hecho por acción nunca se notó; aquí el segundo `decide` decide **a ciegas**: `e.DeudaPendiente` sigue en `true` aunque la línea anterior registró el pago.

---

### El Descubrimiento

El modelo de "decidir devuelve el hecho" —cada `decide` devuelve su hecho y alguien lo guarda— alcanzaba mientras cada acción produjera **un** hecho. La primera acción de **dos**, donde el segundo depende del primero, lo rompe: el segundo `decide` no ve lo que hizo el primero, porque ambos deciden sobre el mismo `e` sin que nada se le aplique. No es un bug de tu código: es el **límite del modelo**. Arreglarlo pide cambiar **quién aplica el hecho** — y eso es lo siguiente.

---

## ✅ Compruébalo

- [ ] Montaste `PagoRegistrado`, `DeudaPendiente`, `RegistrarPago` y la regla en `Reactivar`.
- [ ] Con una empresa suspendida por falta de pago, el `PagarDeudaHandler` lanza `ReglaDeNegocioException` — aunque el pago se decidió justo antes.
- [ ] Explica, con tus palabras, por qué `Reactivar()` no "ve" el pago que la línea anterior acaba de registrar.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** el pago se registró y `Reactivar` igual falló por "deuda pendiente". ¿Qué mira `Reactivar` para decidir, y por qué eso no incluye el pago que acabas de hacer?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Un acto de negocio, dos hechos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una acción que produce **dos** hechos rompe el modelo de "decidir devuelve el hecho": el segundo `decide` decide **a ciegas**, porque el agregado no se aplicó el primer hecho — el límite está en **quién aplica el hecho**.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

[➡️ Siguiente: El agregado recuerda lo que decide](./el-agregado-recuerda.md)
