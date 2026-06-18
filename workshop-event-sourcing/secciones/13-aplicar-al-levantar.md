# 13 · Aplicar al levantar

§12 dejó un borde áspero (lo marcamos como semilla): cuando la empresa **decide** algo, su propio estado en memoria **no lo refleja**. Vamos a cerrarlo — y, de paso, a darle a `Aplicar` la forma exacta con la que el motor de producción reconstruye un agregado.

## 🎯 El Objetivo

Que cuando la `Empresa` levante un hecho, su estado **cambie al instante** (no solo al recargar), y que cada hecho se aplique con un método **`Apply` por tipo** — la forma que las herramientas esperan para rehidratar (un método `Apply` por cada tipo de hecho).

## El dolor: la empresa que decide pero no se entera

Míralo en acción con tu código de §12:

```csharp
var emp = await stream.GetAsync();   // plan Básico
emp.CambiarPlan("Premium");
Console.WriteLine(emp.Plan);         // 👉 imprime "Básico" 😕
```

`CambiarPlan` **encoló** el hecho (`Raise`), pero **no lo aplicó**: la `emp` en memoria sigue diciendo "Básico". Solo al **recargar** (rehidratar desde el diario) verías "Premium". Dos problemas:

1. **Es contraintuitivo.** Un objeto que "decide algo sobre sí mismo" debería reflejarlo.
2. **Rompe una segunda decisión.** Si en un mismo comando suspendieras y luego intentaras cambiar el plan, la validación `if (Suspendida)` miraría el estado **viejo** (no suspendido) y dejaría pasar algo que debió rechazar.

Ya tienes la pieza que aplica un hecho al estado: el `Aplicar` del replay. La idea es simple: que `Raise`, además de encolar, **lo aplique**.

## 🔧 Refactor 1: `Raise` también aplica

> 🛠️ **Inténtalo tú.** En la base `AggregateRoot`, **🔁 reemplaza** tu `Raise` para que, además de encolar el hecho, lo **aplique** llamando a `Aplicar(hecho)`. *(Nada más cambia en la base; `Load` sigue igual.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
protected void Raise(object hecho)
{
    _uncommittedEvents.Add(hecho);   // lo recuerda (como en §12)
    Aplicar(hecho);                  // …y ahora también lo aplica al estado
}
```
</details>

Eso es todo. Ahora `emp.CambiarPlan("Premium")` deja `emp.Plan == "Premium"` al instante, y una segunda decisión ve el estado **fresco**.

> [!NOTE]
> **Rehidratar NO debe encolar.** Fíjate en la asimetría: `Load` llama a `Aplicar` **directo** (reconstruye el pasado, sin volver a "levantar" nada), mientras que `Raise` llama a `Aplicar` **y además encola** (es un hecho **nuevo**, que sí hay que persistir). Reproducir la historia no genera hechos nuevos; decidir, sí. Por eso `Load` usa `Aplicar` y los comandos usan `Raise`.

## 🔧 Refactor 2: un `Apply` por tipo

En §03 viste —y dejamos guardada— "otra forma" de aplicar: en vez de un `switch` con la mutación **incrustada** en cada `case`, un método **`Apply` por tipo de hecho**. La descartamos entonces porque la versión con `(dynamic)` perdía el chequeo de tipos. Ahora la adoptamos **bien** (con un `switch` tipado que enruta, sin `dynamic`) — porque es la forma con la que la herramienta que adoptaremos **rehidrata por convención**: busca métodos `Apply(TipoDeEvento)` en tu agregado. Si dejas la mutación incrustada en el `switch`, la herramienta no la ve.

> 🛠️ **Inténtalo tú.** En `Empresa`, **🔁 reemplaza** tu `switch Aplicar`: que cada `case` quede con **una sola línea** que **enrute** al método correcto —`case PlanCambiado e: Apply(e); break;`— y **mueve** la mutación de estado a un método `Apply` por cada tipo de hecho, que sea **público** (la herramienta los llamará desde afuera al rehidratar — lo explica la nota de abajo). Cuida dos cosas: el `case EmpresaSuspendida` ahora necesita ligar la variable (`case EmpresaSuspendida e:`) para poder pasar `e`; y si alguna mutación (`Nombre = …`, `Plan = …`) se te queda **dentro** del `switch`, **bórrala** —ahora vive en su `Apply`—, porque duplicada **compilaría en silencio**. *(Las propiedades y los métodos `CambiarPlan`/`Suspender`/`Reactivar` no cambian.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// el dispatcher: el switch ya solo ENRUTA al Apply tipado (sigue siendo el override de la base)
protected override void Aplicar(object hecho)
{
    switch (hecho)
    {
        case EmpresaRegistrada e: Apply(e); break;
        case PlanCambiado e:      Apply(e); break;
        case EmpresaSuspendida e: Apply(e); break;
        case EmpresaReactivada e: Apply(e); break;
    }
}

// un Apply por tipo: aquí vive la mutación de estado (público: la herramienta lo llamará por convención)
public void Apply(EmpresaRegistrada e) { Nombre = e.Nombre; Plan = e.Plan; }
public void Apply(PlanCambiado e)      => Plan = e.NuevoPlan;
public void Apply(EmpresaSuspendida e) => Suspendida = true;
public void Apply(EmpresaReactivada e) { Suspendida = false; Reactivaciones++; }
```
</details>

Misma lógica de §03, pero la mutación de cada hecho ya no vive incrustada en el `switch`: vive en su propio `Apply(TipoConcreto)`, **público y con nombre**. El `switch` quedó como un simple **enrutador** (o *dispatcher*: mira el tipo del hecho y lo manda al `Apply` que le toca) — el "router seguro, no `dynamic`" que prometimos en §03.

> [!NOTE]
> 🌱 **Semilla — estos `Apply(T)` son el gancho de la herramienta.** Marten rehidrata un agregado **llamando tus `Apply(TipoDeEvento)` uno por uno** sobre el stream (es su convención; el `TestStore` del equipo hace lo mismo, buscando el `Apply` que casa por reflexión). Por eso los hicimos **públicos** y por tipo: cuando reveles Marten (§16), tu `Apply(PlanCambiado)` ya es justo lo que la librería invoca — sin tocarlo. Incluso tu `Load`/dispatcher desaparecerán: la herramienta los pone por ti.

> [!NOTE]
> 🌱 **Semilla — dónde nace el `Id` (solo un adelanto; no cambies nada).** Tu `Apply(EmpresaRegistrada)` está **completo y correcto así, sin tocar el `Id`**: en nuestro diseño el id es la **llave del stream** y se estampa al cargar (`new T { Id = … }`, §05); el evento **no lo lleva**. La herramienta que adoptaremos (§16) toma el otro camino —su evento de creación **carga el id** y lo estampa dentro de su `Apply`—. Las dos son válidas; cuál encaja mejor con Marten lo veremos al revelarlo.

---

## 🔍 Comprueba

```bash
dotnet run
```

```csharp
var store = new InMemoryEventStore();
await store.AbrirStream<Empresa>("emp-7").AppendAsync(new EmpresaRegistrada("Constructora Andes", "Básico"));

var emp = await store.AbrirStream<Empresa>("emp-7").GetAsync();
Console.WriteLine($"antes:   {emp.Plan}");
emp.CambiarPlan("Premium");
Console.WriteLine($"después: {emp.Plan}");   // sin recargar
```

> **¿Lo lograste?** Deberías ver:
> ```
> antes:   Básico
> después: Premium
> ```
> El estado cambió **sin recargar**: `Raise` aplicó el hecho. (En §12, "después" seguía siendo "Básico".)

---

## ✅ Compruébalo

- [ ] `Raise` ahora encola **y** aplica (`Aplicar(hecho)`); `Load` sigue aplicando **sin** encolar.
- [ ] Tras `empresa.CambiarPlan("Premium")`, `empresa.Plan` es `"Premium"` **sin recargar**.
- [ ] Pruébalo: sobre la **misma** instancia, `emp.Suspender("x")` y luego `emp.CambiarPlan("Y")` → **lanza** `ReglaDeNegocioException` (la 2ª decisión ve el estado fresco; en §12 habría pasado en silencio).
- [ ] La mutación de cada hecho vive en un `Apply(TipoConcreto)` **público**; el `switch` solo enruta.
- [ ] Explica por qué los `Apply` son por tipo y públicos (la herramienta los llama por convención al rehidratar).

---

## 🧠 En una frase

`Raise` pasa a **encolar y aplicar** (el estado refleja la decisión al instante, y una segunda decisión ve el estado fresco), y la mutación de cada hecho se muda a un `Apply(TipoConcreto)` **público** que el `switch` solo enruta — la forma exacta con la que la herramienta rehidrata por convención.

---

[⬅️ Volver: El agregado que acumula](./12-el-agregado-acumula.md)

[➡️ Siguiente: La versión es del agregado](./14-la-version-del-agregado.md)
