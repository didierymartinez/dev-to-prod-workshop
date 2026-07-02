# Given-When-Then: probar decisiones

Ya tienes un `TestStore` en memoria ([El TestStore](teststore.md)). Falta una forma **limpia** de escribir los tests. En Event Sourcing un test no mira filas de una tabla — mira los **hechos** que un comando produjo. La gramática que encaja perfecto: **Given** (hechos previos) → **When** (un comando) → **Then** (los hechos emitidos). Es lo que el equipo usa, con xUnit y AwesomeAssertions.

## 🎯 El Objetivo

Una clase base de test con **`Given`/`When`/`Then`** (y un `And` para el estado) que pruebe tus handlers **sin base de datos**, sobre el `TestStore`.

## El dolor: Arrange-Act-Assert crudo es verboso

Escribir cada test "a pelo" se repite y se ve feo. Creas el store, siembras eventos, montas el handler, lo ejecutas, sacas los eventos y los comparas. Cada vez. Y oculta lo esencial. La forma natural en ES es nombrar tres verbos:

- **Given** los hechos que ya pasaron (la historia previa).
- **When** ejecuto un comando.
- **Then** verifico los hechos **nuevos** que se emitieron (y, si quiero, el estado con **And**).

## 🔧 Una base de test

> 🛠️ **Inténtalo tú.** Una `CommandHandlerTestBase` con: `Given(params object[])` (siembra historia en el `TestStore`), `Then(params object[])` (afirma los hechos nuevos con `BeEquivalentTo`), y `And(proyección, esperado)` (afirma el **estado** del agregado rehidratado). Y una `CommandHandlerAsyncTest<TCommand>` con `WhenAsync(comando)` (ejecuta el handler y guarda).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using AwesomeAssertions;

public abstract class CommandHandlerTestBase
{
    protected string AggregateId = "emp-7";
        protected readonly TestStore EventStore = new();

    protected void Given(params object[] eventos) => EventStore.AppendPreviousEvents(AggregateId, eventos);

    protected void Then(params object[] esperados) =>
        EventStore.GetNewEvents(AggregateId).Should().BeEquivalentTo(esperados);

    protected void And<T, TR>(Func<T, TR> proyeccion, TR esperado) where T : AggregateRoot, new() =>
        proyeccion(EventStore.GetAggregateRoot<T>(AggregateId)).Should().Be(esperado);
}

public abstract class CommandHandlerAsyncTest<TCommand> : CommandHandlerTestBase
{
        protected abstract ICommandHandler<TCommand> Handler { get; }
    protected async Task WhenAsync(TCommand cmd) { await Handler.HandleAsync(cmd); EventStore.SaveChanges(); }
}
```
</details>

> [!NOTE]
> **Dos detalles para que compile.** (1) `new CambiarPlanHandler(EventStore)` funciona porque desde [Revelar Marten](revelar-marten.md)/[Revelar Wolverine](revelar-wolverine.md) tu handler recibe **`IEventStore`** (no `InMemoryEventStore`), y el `TestStore` *es* un `IEventStore` — por eso le puedes pasar el doble de test. (2) `[Fact]` es el atributo de **xUnit** que marca un método como un test que el runner ejecuta.

Y un test concreto se lee como la especificación del comportamiento:

```csharp
public class CambiarPlanTests : CommandHandlerAsyncTest<CambiarPlanDeEmpresa>
{
    protected override ICommandHandler<CambiarPlanDeEmpresa> Handler => new CambiarPlanHandler(EventStore);

    [Fact]
    public async Task Cambiar_el_plan_de_una_empresa_activa_emite_PlanCambiado()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));   // historia previa
        await WhenAsync(new CambiarPlanDeEmpresa(AggregateId, "Premium"));  // el comando
        Then(new PlanCambiado("Premium"));                              // el hecho emitido
        And<Empresa, string>(e => e.Plan, "Premium");                   // …y el estado resultante
    }
}
```

> [!NOTE]
> **Pruebas EVENTOS, no filas.** Fíjate que `Then` compara la **lista de hechos producidos** —no el contenido de una tabla—. Eso es lo natural en ES: un comando se juzga por **lo que pasó** (`PlanCambiado`), no por cómo quedó una fila. `And` cubre el otro ángulo: el **estado** derivado, para casos donde quieres afirmar el resultado acumulado. `BeEquivalentTo` (de AwesomeAssertions) compara los `record` **por valor**, sin que escribas comparaciones a mano.

> [!NOTE]
> ⚖️ **Es `CommandHandlerTestBase` + `CommandHandlerTest`/`CommandHandlerAsyncTest` de la plantilla, 1:1.** Y trae un verbo más: `ThenIsPublishedPublicly(...)`/`ThenIsPublishedPrivately(...)`, que afirma los **eventos publicados** usando los `TestPublicEventSender`/`TestPrivateEventSender` (el doble en memoria de [Senders y el sobre](senders-y-sobre.md)). Así pruebas, sin broker, que un comando además **publicó** lo que debía. Por eso conservamos `ICommandHandler<T>` en [Revelar Wolverine](revelar-wolverine.md): la base inyecta el `TestStore` al handler y lo ejecuta genéricamente.

> [!NOTE]
> 🌱 **Semilla — esto es posible porque el dominio es puro.** Pudimos probar todo —`decide`, `Apply`, el handler— **sin base de datos ni mocks** porque el agregado es una función pura ([Los primeros hechos](los-primeros-hechos.md)/[Decidir el futuro](decidir-el-futuro.md)) y el handler habla con `IEventStore` (intercambiable por el `TestStore`). Es el pago de las "dos vertientes" ([Las dos vertientes](dos-vertientes.md)): la capa del equipo cuesta más código, pero esto es lo que compra.

---

## 🔍 Comprueba

Crea un proyecto de test (`dotnet new xunit` + `dotnet add package AwesomeAssertions`), pega la base y el test, y corre:

```bash
dotnet test
```

> **¿Lo lograste?** Deberías ver **1 test en verde** (`Superado: 1`). Sembraste un `EmpresaRegistrada`, ejecutaste `CambiarPlanDeEmpresa`, y el test confirmó que se emitió `PlanCambiado("Premium")` y que el plan quedó en "Premium" — **sin Postgres, sin Marten, sin mocks**.

---

## ✅ Compruébalo

- [ ] Una `CommandHandlerTestBase` con `Given`/`Then`/`And` sobre el `TestStore` ([El TestStore](teststore.md)).
- [ ] `CommandHandlerAsyncTest<TCommand>` con `WhenAsync` que ejecuta el handler (vía `ICommandHandler<T>`) y guarda.
- [ ] Un test `[Fact]` que sigue Given→When→Then y pasa en verde.
- [ ] Explicas por qué en ES `Then` compara **hechos producidos**, no filas, y para qué sirve `And` (estado).
- [ ] Sabes que la plantilla añade `ThenIsPublishedPublicly/Privately` (con los `Test…EventSender` de [Senders y el sobre](senders-y-sobre.md)) para afirmar lo **publicado**.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** escribe un test Given→When→Then de un comando y ponlo en verde. ¿Por qué Then compara HECHOS y no filas?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Given-When-Then" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

En Event Sourcing un test es **Given** (hechos previos) → **When** (un comando) → **Then** (los hechos emitidos), no filas de una tabla; una `CommandHandlerTestBase` sobre el `TestStore` ([El TestStore](teststore.md)) lo hace legible con AwesomeAssertions (`BeEquivalentTo`), prueba el dominio **sin BD ni mocks** (porque es puro), y la plantilla añade `ThenIsPublished…` para afirmar lo publicado.

---

[⬅️ Volver: Probar sin base de datos (el TestStore)](./teststore.md)

[➡️ Siguiente: El idioma de la plantilla (extension members de C#14)](./extension-members.md)
