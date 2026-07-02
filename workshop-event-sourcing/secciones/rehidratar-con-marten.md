# Rehidratar con Marten

En [Conocer Marten](conocer-marten.md) **escribiste** eventos y los viste en `mt_events`. Pero un event store no sirve de nada si no sabes **leerlos de vuelta** como estado. Eso —tu `Get()` casero— Marten también lo hace, por convención.

## 🎯 El Objetivo

Reconstruir una empresa desde su stream con Marten (sin escribir el `foreach` de replay), y de paso ganar **viaje en el tiempo**: verla como era en cualquier versión pasada.

## 🔧 `AggregateStreamAsync` + la convención `Create`/`Apply`

Tu motor casero rehidrataba con `Load` + un `switch Aplicar`. Marten hace lo mismo por **convención**: le das un tipo con un método estático `Create` (para el primer hecho) y métodos `Apply` (para los siguientes), y él **pliega** el stream en una instancia.

Quieres poder escribir esto en tu sandbox y ver la empresa reconstruida:

```csharp
var empresa = await session.Events.AggregateStreamAsync<EmpresaVista>("emp-7");
Console.WriteLine($"{empresa!.Nombre}: {empresa.Plan}, suspendida={empresa.Suspendida}");
// → Constructora Andes: Premium, suspendida=True

// …y cómo era en la versión 1, cuando apenas se registró:
var v1 = await session.Events.AggregateStreamAsync<EmpresaVista>("emp-7", version: 1);
Console.WriteLine($"{v1!.Plan}, suspendida={v1.Suspendida}");
// → Básico, suspendida=False
```

> 🛠️ **Inténtalo tú.** En tu sandbox, define una vista inmutable `EmpresaVista` que Marten sepa plegar: un `static Create(EmpresaRegistrada)` que devuelve la instancia inicial, y un `Apply(...)` por cada hecho que la haga evolucionar (devolviendo una copia con `with`). Luego reconstruye el stream `emp-7` con `AggregateStreamAsync`, y pídelo también en la `version: 1` para ver el pasado.

> [!NOTE]
> 🆕 **La convención de agregación de Marten.** `AggregateStreamAsync<T>(id)` lee los hechos del stream y los **pliega** en un `T`: llama a `T.Create(primerHecho)` y luego a `Apply(hecho)` por cada uno. Con un tipo **inmutable** (`record`), cada `Apply` devuelve una copia nueva (`this with { … }`) — igual que tu `evolve`. Marten espera una propiedad **`Id`** que casa con el id del stream. Pasarle `version:` o `timestamp:` te da **viaje en el tiempo** gratis: el estado tal como era en ese punto. *(Si tu propiedad de id se llamara distinto, se lo dices con `.Identity(x => x.Otra)`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// una VISTA de la empresa que Marten sabe reconstruir por convención (sandbox: aparte de tu Empresa)
public record EmpresaVista
{
    public string Id { get; init; } = "";       // Marten lo llena con el id del stream
    public string Nombre { get; init; } = "";
    public string Plan { get; init; } = "";
    public bool Suspendida { get; init; }

    public static EmpresaVista Create(EmpresaRegistrada e) => new() { Nombre = e.Nombre, Plan = e.Plan };
    public EmpresaVista Apply(PlanCambiado e)     => this with { Plan = e.NuevoPlan };
    public EmpresaVista Apply(EmpresaSuspendida e) => this with { Suspendida = true };
}
```

```csharp
// en el Program.cs del sandbox, tras guardar los hechos:
var empresa = await session.Events.AggregateStreamAsync<EmpresaVista>("emp-7");
Console.WriteLine($"{empresa!.Nombre}: {empresa.Plan}, suspendida={empresa.Suspendida}");

var v1 = await session.Events.AggregateStreamAsync<EmpresaVista>("emp-7", version: 1);
Console.WriteLine($"{v1!.Plan}, suspendida={v1.Suspendida}");
```
</details>

## 🔍 ¿Lo lograste?

La primera línea imprime `Constructora Andes: Premium, suspendida=True` — Marten plegó los tres hechos (`Create` con el registro, `Apply` del plan, `Apply` de la suspensión) sin que escribieras un solo `foreach`. La segunda imprime `Básico, suspendida=False`: la misma empresa **como era en la versión 1**, antes de cambiar de plan y suspenderse. Ese viaje en el tiempo es gratis porque la historia completa sigue ahí.

---

### El Descubrimiento

`AggregateStreamAsync<T>` es tu `Get()` casero, hecho por Marten: pliega un stream en un agregado por convención (`Create`/`Apply`), sin `switch` ni `foreach` a la vista. Y como no destruye la historia —solo la reproduce—, pedir una versión o fecha pasada te da el estado de ese momento sin trabajo extra. Escribir y leer eventos con Marten: cubierto. Falta el paso grande — dejar de usarlo en un sandbox y **reemplazar tu almacén casero** en la app real.

> [!NOTE]
> 🌱 **Semilla — esto es agregación *en vivo*.** `AggregateStreamAsync` reconstruye el estado **al momento**, leyendo el stream cada vez — perfecto para streams cortos. Cuando una vista se consulte mucho, Marten puede **persistirla** como documento y mantenerla al día: eso son las **proyecciones** ([La primera proyección](la-primera-proyeccion.md)). Por ahora, en vivo basta.

---

## ✅ Compruébalo

- [ ] Una `EmpresaVista` inmutable con `static Create(EmpresaRegistrada)` y un `Apply(...)` por hecho (devolviendo `this with`).
- [ ] `AggregateStreamAsync<EmpresaVista>("emp-7")` reconstruye el estado actual (Premium, suspendida) sin `foreach`.
- [ ] `AggregateStreamAsync<EmpresaVista>("emp-7", version: 1)` devuelve el estado pasado (Básico, activa).
- [ ] Explicas por qué el viaje en el tiempo es "gratis" en un event store.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué hace `AggregateStreamAsync` que tu `Get()` casero hacía a mano? ¿Por qué puedes pedir el estado de una versión pasada sin haberlo guardado?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Rehidratar con Marten" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`AggregateStreamAsync<T>` es tu `Get()` hecho por Marten: pliega un stream en un agregado por convención (`Create`/`Apply` sobre un `record` inmutable), sin `foreach` ni `switch` — y pedirle una `version`/`timestamp` pasada te da **viaje en el tiempo** gratis, porque la historia nunca se destruyó.

---

[⬅️ Volver: Conocer Marten (el sandbox)](./conocer-marten.md)

[➡️ Siguiente: El swap — Marten reemplaza tu almacén](./el-swap.md)
