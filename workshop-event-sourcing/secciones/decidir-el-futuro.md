# Decidir el futuro (emitir eventos)

Ya tienes un `EventStream` con el que **lees** (`Get`) y **escribes** (`Append`) la historia de una empresa. Pero hasta ahora fabricábamos los hechos **a mano desde afuera** (`new PlanCambiado(...)` sueltos en el `Program.cs`, y los metíamos con `Append`). Eso está mal: ¿quién dice que "Constructora Andes" *puede* cambiar de plan? Esa decisión le toca a la **propia empresa**.

## 🎯 El Objetivo

Que la `Empresa` **emita sus propios hechos** —protegiendo sus reglas— en vez de que se los insertemos por la fuerza con `Append`.

## La empresa decide; no le insertan hechos

Aquí hay un detalle sutil del event sourcing: la `Empresa` es la **dueña de las reglas** de su historia, pero **no guarda la lista de eventos** (eso es del stream). No le "metemos" un hecho a la fuerza; le **pedimos** que haga algo, y ella, a cambio, **devuelve** el hecho que ocurrió. El stream se encarga de guardarlo.

Empecemos por el camino feliz (los `record` de eventos ya existen desde [Los primeros hechos](los-primeros-hechos.md)).

> 🛠️ **Inténtalo tú.** Añade a tu `Empresa` tres métodos que **devuelvan** el hecho correspondiente: `CambiarPlan(string nuevoPlan)` → un `PlanCambiado`; `Suspender(string motivo)` → un `EmpresaSuspendida`; `Reactivar()` → un `EmpresaReactivada`. **Clave:** que **no toquen ninguna propiedad** — solo **devuelven** el hecho.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa : AggregateRoot
{
    // … propiedades y el switch Aplicar de «Refactorizando el motor», sin cambios …

    public PlanCambiado      CambiarPlan(string nuevoPlan) => new(nuevoPlan);
    public EmpresaSuspendida Suspender(string motivo)      => new(motivo);
    public EmpresaReactivada Reactivar()                   => new();
}
```
</details>

Fíjate en algo importante: `CambiarPlan` **no** toca la propiedad `Plan`. Solo **devuelve** el hecho `PlanCambiado`. El estado cambia únicamente cuando ese hecho se **aplica** (el `switch Aplicar` que ya tienes) al reproducir la historia. Decidir y aplicar son dos cosas separadas — recuérdalo, es la columna vertebral del patrón.

## El ciclo de vida: cargar → actuar → guardar

El `EventStream` de [El flujo de vida](el-flujo-de-vida.md) ya sabe leer (`Get`) y escribir (`Append`). Lo que faltaba era **quién produce** el hecho que se va a guardar. Hasta ahora lo fabricábamos a mano; desde esta sección, lo produce la **empresa**. El ciclo completo, sobre el stream de una empresa, queda así:

```csharp
// una empresa vive sobre SU stream (uno solo por ahora; el almacén para MUCHAS llega después)
var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));   // su historia previa

var empresa = stream.Get();                       // 1. CARGAR (rehidratar)
Console.WriteLine($"[antes] plan {empresa.Plan}");

var hecho = empresa.CambiarPlan("Enterprise");    // 2. ACTUAR (la empresa decide y emite el hecho)
stream.Append(hecho);                             // 3. GUARDAR (el stream lo archiva)

var verificacion = stream.Get();                  // recargamos del mismo stream
Console.WriteLine($"[después] plan {verificacion.Plan}");
// [después] plan Enterprise
```

`dotnet run`: el plan cambió porque el hecho quedó **archivado** y, al recargar, el replay lo aplica. La empresa en memoria del paso 1 no cambió sola — el cambio vive en el **diario**, no en el objeto.

> [!NOTE]
> 🌱 **Semilla — acabas de escribir la función `decide`.** En [Los primeros hechos](los-primeros-hechos.md) viste `evolve` (estado + hecho → nuevo estado). `CambiarPlan` / `Suspender` hacen la **otra mitad**: **`decide`** (estado + intención → hechos). Juntas forman el **patrón Decider**, el modelo del event sourcing: `decide` *decide qué pasó*, `evolve` *aplica lo que pasó*. Ambas son **puras** → se prueban sin base de datos. Las librerías que adoptaremos se montan justo sobre este par.

> [!NOTE]
> 🌱 **Semilla — tres tipos de mensaje, no los confundas.** Desde ahora manejas tres cosas fáciles de mezclar:
>
> | Tipo | Qué es | ¿Cuántos lo reciben? | ¿Se puede rechazar? | Tiempo verbal |
> |------|--------|---------|---------------------|---------------|
> | **Comando** | una *intención* ("haz esto") | **1** (un handler) | **Sí** (puede fallar una regla) | imperativo: `CambiarPlan` |
> | **Evento** | un *hecho* que ya ocurrió | **0..N** interesados | **No** (ya pasó) | pasado: `PlanCambiado` |
> | **Query** | una *pregunta* (pedir datos) | 1, devuelve un resultado | n/a (no muta) | `ObtenerEmpresa` |
>
> Por ahora la "intención" la representa el **método** del agregado (`CambiarPlan`). En la próxima sección le daremos forma de objeto: un **Comando**. Las **queries** llegan con CQRS.

## 🔧 ¿Y si la misma orden llega dos veces?

El camino feliz **siempre** emite. Pero en la vida real una orden puede repetirse (la red falló, el usuario hizo doble clic). Mira el dolor:

```csharp
// 💥 la misma orden de suspender llega dos veces
stream.Append(empresa.Suspender("falta de pago"));
stream.Append(empresa.Suspender("falta de pago"));
// El diario ahora dice que la empresa se suspendió DOS veces.
// Y peor: si una regla dijera "no se puede cambiar el plan de una empresa suspendida",
// nada lo impide, porque CambiarPlan emite sin mirar el estado.
```

El agregado es el **guardián de las reglas**, así que la defensa nace **dentro** de la `Empresa`, mirando su estado **antes** de emitir.

> 🛠️ **Inténtalo tú.** **🔁 Modifica** los dos métodos que ya escribiste (no crees otra clase): que `CambiarPlan` **lance** una excepción `ReglaDeNegocioException` si la empresa está `Suspendida` (la operación es **inválida**), y que `Suspender` **devuelva `null`** si ya está `Suspendida` (es **redundante**, no un error → su tipo de retorno pasa a `EmpresaSuspendida?`). *(`Reactivar()` queda igual.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

Primero, la excepción (al final, con las demás clases):

```csharp
public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);
```

Y en tu `Empresa`, **reemplaza** esos dos métodos:

```csharp
public PlanCambiado CambiarPlan(string nuevoPlan)
{
    // (a) VALIDACIÓN — la operación es inválida → se RECHAZA (es un error)
    if (Suspendida)
        throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");

    return new PlanCambiado(nuevoPlan);
}

public EmpresaSuspendida? Suspender(string motivo)
{
    // (b) IDEMPOTENCIA — operación válida pero redundante → NO-OP (no es un error)
    if (Suspendida)
        return null;   // ya está suspendida: no emitimos un hecho duplicado

    return new EmpresaSuspendida(motivo);
}
```
</details>

> [!IMPORTANT]
> 🏷️ **Dos motivos distintos para NO emitir un hecho — no los confundas:**
> - **Validación (rechazar):** la operación es **inválida** (cambiar el plan de una empresa suspendida). Es un **error**: lanzas una excepción para que el llamador se entere. Nunca te "tragues" una regla violada.
> - **Idempotencia (no-op):** la operación es **válida pero redundante** (suspender algo ya suspendido; la orden llegó dos veces). **No es un error**: simplemente no emites un hecho duplicado y sigues.
>
> Las dos viven en el agregado, pero una **grita** y la otra **calla**. (Más adelante, en mensajería, verás la *segunda* línea de defensa de la idempotencia: deduplicar por id de mensaje.)

> [!NOTE]
> 🌱 **Semilla — devolver el hecho en vez de publicarlo.** Fíjate: `Suspender` **devuelve** el hecho; no lo guarda ni lo publica por su cuenta. Es deliberado: mantiene el método **puro** (no esconde envíos ni inyecta el almacén) y deja a la vista *qué* produce con solo leerlo. Las librerías que adoptaremos elevan esto a patrón (te dejan **devolver** los hechos y ellas los guardan/publican). Lo verás a fondo en el Aggregate Handler.

## 🧪 Pruébalo desde ya (solo léelo por ahora)

`Suspender` y `CambiarPlan` son **funciones puras**: reciben un estado (la historia previa) y devuelven un hecho (o lo rechazan). Eso significa que se pueden probar **sin base de datos ni mocks**. Aquí **no** vamos a montar el proyecto de pruebas todavía (lo haremos en su propia sección, con la librería de aserciones — el `.Should()` que verás es de esa librería, no de C# de fábrica); **lee** este bloque solo para ver la **forma** —*Given* (historia previa) → *When* (actuar) → *Then* (verificar el hecho)—, no para ejecutarlo aún:

```csharp
// montamos una empresa desde su historia previa (Given) — sin base de datos, en memoria
static Empresa Construir(params object[] historia)
{
    var empresa = new Empresa();
    empresa.Load(historia);   // Load es el motor de replay de «Refactorizando el motor»
    return empresa;
}

var activa     = Construir(new EmpresaRegistrada("Constructora Andes", "Básico"));
var suspendida = Construir(new EmpresaRegistrada("Constructora Andes", "Básico"),
                           new EmpresaSuspendida("falta de pago"));

// suspender una empresa activa emite el hecho
activa.Suspender("falta de pago").Should().BeOfType<EmpresaSuspendida>();   // ✅

// suspender una YA suspendida no emite nada (idempotencia → no-op)
suspendida.Suspender("otro motivo").Should().BeNull();                      // ✅

// cambiar el plan de una suspendida es RECHAZADO (validación → error)
var act = () => suspendida.CambiarPlan("Enterprise");
act.Should().Throw<ReglaDeNegocioException>();                              // ✅
```

> 🌱 Este patrón **Given → When → Then** (historia previa → actuar → verificar el hecho) será tu forma de probar todo el taller. No esperes a una "fase de testing": cada vez que escribas un `decide` o un `evolve`, **escribe su prueba al lado**.

---

### El Descubrimiento

El flujo del dominio queda claro: **cargar** (rehidratar el pasado) → **actuar** (pedirle al agregado que decida y **emita** un hecho) → **guardar** (archivar ese hecho en el stream). La empresa no guarda su lista ni cambia su estado al decidir: solo **emite** lo que pasó, y protege sus reglas **antes** de emitir — distinguiendo lo **inválido** (se rechaza) de lo **redundante** (se ignora). Eso que escribiste es el `decide`, gemelo del `evolve`.

Pero ese ciclo **cargar → actuar → guardar** está suelto en el `Program.cs`. En la próxima sección lo encapsulamos en una pieza con un solo trabajo: el **Command Handler**.

> [!NOTE]
> 🌱 **Semilla — el agregado terminará GUARDÁNDOSE sus propios hechos.** Hoy `CambiarPlan` **devuelve** el hecho y el handler lo archiva (`stream.Append(hecho)`). Funciona y deja todo a la vista. Pero las herramientas de producción usan otro modelo: el agregado **se aplica el hecho a sí mismo y lo recuerda** en una lista de *cambios sin confirmar*, y al final **un solo paso** los persiste todos juntos (en una transacción). Cuando afinemos el motor a su forma de producción **invertiremos** esto —de "devolver y que otro guarde" a "el agregado acumula y un middleware persiste"— en [El agregado que acumula](el-agregado-acumula.md). Por ahora, devolver el hecho es el peldaño correcto.

---

## ✅ Compruébalo

- [ ] `dotnet run` muestra el plan cambiado tras `CambiarPlan` + `Append` + recargar (sobre un solo `EventStream`).
- [ ] `Suspender` sobre una empresa **ya suspendida** devuelve `null` (idempotencia), **sin** lanzar.
- [ ] `CambiarPlan` sobre una empresa suspendida **lanza** `ReglaDeNegocioException` (validación).
- [ ] Explica por qué `CambiarPlan` **no** modifica la propiedad `Plan` directamente (decidir ≠ aplicar).

---

## 📓 Registra tu avance

```bash
git add . && git commit -m "ES · Decidir el futuro" \
  -m "Reto: llama CambiarPlan sobre una empresa suspendida. ¿Qué pasa? ¿Por qué CambiarPlan NO toca la propiedad Plan (decidir != aplicar)?"
git push
```

---

## 🧠 En una frase

El agregado **decide** (estado + intención → hecho) protegiendo sus reglas, y solo **emite** el hecho; el `EventStream` lo **guarda** (`Append`); el estado cambia al **aplicarlo** en el replay. Rechazar lo inválido es **validación**; ignorar lo redundante es **idempotencia**.

---

[⬅️ Volver: El flujo de vida (EventStream)](./el-flujo-de-vida.md)

[➡️ Siguiente: El Command Handler](./el-command-handler.md)
