# El TestStore: probar el dominio sin Postgres

El vaivén de [la unidad de trabajo](el-almacen-de-la-plantilla.md) —crear, rehidratar, acumular, volcar— merece pruebas **rápidas**, sin levantar Postgres, como las que recuperaste en [El almacén abstracto](el-almacen-abstracto.md) con tu `TestStore`. La plantilla trae el suyo — y una base de escenarios que afirma, además de los hechos, **cuáles cruzan la frontera**.

## 🎯 El Objetivo

Recuperar los tests rápidos sin Postgres con el `TestStore` real —que aplica los hechos **por reflexión**— y escribir escenarios Given-When-Then que afirmen los hechos emitidos, incluidos los **públicos** y **privados**.

## 💥 El dolor: un doble que no quiera conocer cada agregado

Tu `TestStore` de [El almacén abstracto](el-almacen-abstracto.md) tenía que **rehidratar** un agregado en memoria: recorrer sus eventos y aplicarlos. Pero, ¿cómo aplica los eventos sin **hardcodear** el `switch` de cada agregado? Si el `TestStore` conociera a `Empresa` por dentro, habría que tocarlo por cada agregado nuevo del sistema. El doble tiene que aplicar el hecho al agregado **sea cual sea** — sin saber de antemano qué tipos existen.

## 🔧 El doble por reflexión

### Paso 1 · Aplicar el `Apply` correcto por reflexión

> 🛠️ **Inténtalo tú.** Escribe el corazón del `TestStore`: dado un agregado y un hecho, encuentra en el agregado el método `Apply` cuyo **único parámetro** sea del tipo del hecho, e **invócalo**. Cachea el hallazgo en un `ConcurrentDictionary` por `(agregado, evento)` con `GetOrAdd`, para no buscar cada vez.

> [!NOTE]
> 🆕 **Aplicar por reflexión.** Es la misma reflexión que ya usaste en [El almacén abstracto](el-almacen-abstracto.md): en vez de un `switch` por agregado, el `TestStore` **busca** el método `Apply(TEvento)` que coincide con el tipo del hecho (`GetMethods` + el `Apply` de un solo parámetro de ese tipo) y lo invoca (`MethodInfo.Invoke`, pasándole el hecho). Lo nuevo es el **caché**: guarda el método hallado en un `ConcurrentDictionary` (concurrente porque los tests pueden correr en paralelo) por `(agregado, evento)`, con `GetOrAdd` que **busca una vez y reutiliza** (la lambda va `static` solo para no capturar variables locales, un detalle de rendimiento). Resultado: un doble que rehidrata **cualquier** agregado sin conocerlo — no lo tocas al agregar un agregado nuevo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Collections.Concurrent;
using System.Reflection;

private static readonly ConcurrentDictionary<(Type, Type), MethodInfo?> ApplyMethodCache = new();

private static void ApplyEvent(AggregateRoot aggregateRoot, object @event)
{
    var key = (aggregateRoot.GetType(), @event.GetType());
    var applyMethod = ApplyMethodCache.GetOrAdd(key, static tipos =>
    {
        var (aggregateType, eventType) = tipos;
        return aggregateType.GetMethods().FirstOrDefault(m =>
            m.Name == "Apply" &&
            m.GetParameters().Length == 1 &&
            m.GetParameters()[0].ParameterType == eventType);
    });

    applyMethod?.Invoke(aggregateRoot, [@event]);   // rehidrata sin conocer el tipo
}
```
</details>

### Paso 2 · Given-When-Then que afirma la frontera

El `TestStore` es el motor; encima va una base de escenarios, `CommandHandlerTestBase`, que es la versión de librería de tu `HandlerTest<TCommand>` de [Blindar el motor: Given-When-Then](given-when-then.md) — con verbos nuevos. **No la construyes**: viene en el paquete `Testing.Utilities`; tú escribes la **subclase** con tu escenario. Fíjate que ya **no** declara `CrearHandler`: la base **descubre** el handler de tu comando por convención (como Wolverine), y por eso tampoco necesita el genérico `<TCommand>` — cada `[Fact]` pasa su comando concreto a `When`.

> 🛠️ **Inténtalo tú.** Escribe un escenario: **Given** unos hechos previos, **When** el comando, **Then** los hechos emitidos, afirma cuáles se **publican** hacia afuera (`ThenIsPublishedPublicly`), y de paso comprueba el **estado** del agregado tras el comando (`And<TAgg,TResult>`).

> [!NOTE]
> 🆕 **`Given` / `When` / `Then` / `And`.** `Given` siembra los hechos previos (los aplica por reflexión al agregado). `When` corre el handler contra el `TestStore` (es tu verbo de siempre; async porque el handler lo es). `Then` afirma los **hechos emitidos** (comparados por valor, no filas). `And<TAgg,TResult>(sel, esperado)` afirma una propiedad del agregado que la base **ya tiene rehidratado** tras el `When`, sin que lo cargues de nuevo en cada test.

> [!NOTE]
> 🆕 **`ThenIsPublished…` afirma la intención.** ¿Cómo sabe un doble en memoria qué se "publica", si en [Público vs privado](publico-privado.md) viste que el ruteo real lo decide el arranque de Wolverine? No lo adivina: mira los **marcadores** del agregado. `ThenIsPublishedPublicly` compara los esperados contra `agregado.GetPublicEvents()` (los `IPublicEvent` emitidos); `…Privately`, contra `GetPrivateEvents()`. El marcador **es** la intención de cruzar la frontera, así que afirmarlo en el test es afirmar esa intención — no la entrega por el bus. Tu base casera no lo distinguía porque los marcadores aún no existían.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class SuspenderEmpresaTests : CommandHandlerTestBase
{
    [Fact]
    public async Task Suspender_una_empresa_activa_emite_y_publica_el_hecho()
    {
        Given("emp-7", new EmpresaRegistrada("Acme SA"));         // hechos previos
        await When(new SuspenderEmpresa("emp-7", "impago"));      // corre el handler sobre el TestStore
        Then("emp-7", new EmpresaSuspendida("impago"));           // hecho emitido
        ThenIsPublishedPublicly(new EmpresaSuspendida("impago")); // …y cruza la frontera
        And<Empresa, bool>(e => e.Suspendida, true);              // el estado quedó bien
    }
}
```
</details>

> 🔍 **¿Lo lograste?** `dotnet test` corre el escenario en **milisegundos**, sin Docker ni Postgres: `Given` siembra `EmpresaRegistrada`, `When` suspende, y `Then` + `ThenIsPublishedPublicly` verifican el `EmpresaSuspendida` emitido y marcado como público. Compáralo con los tests de integración de [Tests de integración](tests-de-integracion.md): mismos escenarios, sin la lentitud de la red.

---

### El Descubrimiento

Recuperaste los tests rápidos, en su forma de plantilla. El `TestStore` aplica los hechos **por reflexión** —busca el `Apply(TEvento)` que calza y lo invoca, cacheado— así un solo doble rehidrata **cualquier** agregado sin un `switch` por tipo. Y `CommandHandlerTestBase` (del paquete, tu `HandlerTest` de siempre) suma `ThenIsPublished…`, que afirma **qué cruza la frontera** mirando los marcadores del agregado, ahora que existen. El dominio se prueba entero —decidir, acumular, marcar público— en milisegundos y sin Postgres, porque vive tras la costura `IEventStore`.

> [!NOTE]
> 🌱 **Semilla — dejar de copiar y empezar a consumir.** Hasta aquí **reconstruiste** la plantilla para entenderla. En un proyecto real no la copias: la **instalas** como paquetes NuGet y construyes tu dominio encima. Cómo se consume —los paquetes, la solución, el idioma dual del código— lo ves en [Consumir Cosmos.BuildingBlocks](consumir-cosmos-buildingblocks.md).

---

## ✅ Compruébalo

- [ ] El `TestStore` aplica los hechos **por reflexión** (busca `Apply` por nombre + tipo de parámetro), cacheado.
- [ ] Explicas por qué reflexión y no un `switch`: un doble que sirve a cualquier agregado sin tocarlo.
- [ ] Escribiste una **subclase** de `CommandHandlerTestBase` con `Given` / `When` / `Then` / `And`.
- [ ] Usaste `ThenIsPublishedPublicly` (o `…Privately`) y explicas que afirma la **intención** (los marcadores), no la entrega por el bus.
- [ ] El test corre sin Postgres, en milisegundos, y prueba el mismo escenario que el de integración.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el `TestStore` aplica por reflexión en vez de conocer cada agregado? ¿Qué afirma `ThenIsPublished…` —y contra qué lo compara— que tu base casera no podía?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El TestStore: probar el dominio sin Postgres" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El `TestStore` aplica los hechos **por reflexión** (encuentra el `Apply(TEvento)` que calza, cacheado) para servir a **cualquier** agregado sin un `switch`, y `CommandHandlerTestBase` —tu `HandlerTest` Given-When-Then, del paquete— suma `ThenIsPublished…`, que afirma qué cruza la frontera mirando los marcadores del agregado: el dominio entero, probado en milisegundos sin Postgres.

---

[⬅️ Volver: El almacén de la plantilla](./el-almacen-de-la-plantilla.md)

[➡️ Siguiente: Consumir Cosmos.BuildingBlocks](./consumir-cosmos-buildingblocks.md)
