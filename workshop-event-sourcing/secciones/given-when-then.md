# Blindar el motor: Given-When-Then

Tienes el motor de event sourcing completo, y hasta ahora lo probaste corriendo el `Main` y mirando la consola con los ojos. Pero vas a refactorizarlo en serio —arrancar tu almacén casero y meter Marten en su lugar—, y "mirar a ojo" no te avisará si en el camino rompes una regla. Antes de tocar el motor te construyes una **red de seguridad**: tests que fijan el comportamiento de hoy y que, cuando cambies el motor, **volverás a correr para probar que nada cambió**.

## 🎯 El Objetivo

Una base de test **Given / When / Then** que fije el comportamiento del motor — escrita de modo que los **mismos escenarios sobrevivan al swap** (corran igual contra Marten, sin tocarlos).

## 💥 El dolor: probar a ojo no escala

Cada cambio que haces lo verificas así: `dotnet run`, y lees la consola.

```csharp
// en Program.cs: siembras, ejecutas, y LEES para ver si salió bien
var store = new EventStore();
store.AbrirStream<Empresa>("emp-7").Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"));
Console.WriteLine(store.AbrirStream<Empresa>("emp-7").Get().Suspendida);   // ¿true? … míralo tú
```

Cada cambio: recompilar, correr, volver a leer. Y si el refactor a Marten hace que `Suspender` deje de emitir el hecho, **la consola no grita** — imprime algo un poco distinto que quizá no notes. Vas a mover el motor entero; necesitas algo que te avise **solo**.

## 🔧 Tu motor es su propio doble

Para probarlo no necesitas ni base de datos ni mocks: tu `EventStore` vive en **RAM**, creas uno nuevo por test y es un doble perfecto. Un test es **sembrar → ejecutar → inspeccionar los hechos nuevos**.

> [!NOTE]
> 🆕 **xUnit.** Corre métodos marcados con `[Fact]`; `Assert.…` comprueba una condición y, si falla, el test se pone rojo. Se instala aparte y **referencia** tu proyecto: `dotnet new xunit -o GestionEmpresas.Tests` + `dotnet add GestionEmpresas.Tests reference GestionEmpresas.csproj`.

### Paso 1 · El primer test, a pelo

> 🛠️ **Inténtalo tú.** Un `[Fact]` que: crea un `EventStore`, **siembra** un `EmpresaRegistrada` para `"emp-7"` (guarda cuántos hechos había), **ejecuta** `new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"))`, y afirma que el hecho **nuevo** es un `EmpresaSuspendida` con ese motivo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Xunit;

public class SuspenderEmpresaTests
{
    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        var store = new EventStore();
        store.AbrirStream<Empresa>("emp-7").Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
        var previos = store.GetEvents("emp-7").Count;

        new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"));

        var nuevos = store.GetEvents("emp-7").Skip(previos).Select(s => s.EventData).ToList();
        var hecho = Assert.IsType<EmpresaSuspendida>(Assert.Single(nuevos));
        Assert.Equal("falta de pago", hecho.Motivo);
    }
}
```
</details>

Funciona (`dotnet test` → verde), pero míralo: crear el store, sembrar, guardar el conteo, ejecutar, `Skip`, `Select`, comparar. Seis líneas de andamiaje para una idea de una. Y **todos** los tests de event sourcing tienen la misma forma: unos hechos previos, un comando, y los hechos que esperas. Destilemos esa forma.

### Paso 2 · Destila la gramática (y hazla swappeable)

> [!NOTE]
> 🆕 **AwesomeAssertions (`BeEquivalentTo`).** Tus eventos son `record`, así que se comparan **por valor**; `BeEquivalentTo` compara dos listas de hechos por valor y da un mensaje de fallo legible. `dotnet add package AwesomeAssertions`.

> 🛠️ **Inténtalo tú.** Crea `HandlerTest<TCommand>` con: `Given(params object[])` (siembra), `When(TCommand)` (ejecuta el handler, que cada test concreto provee), `Then(params object[])` (compara los hechos **nuevos** con `BeEquivalentTo`). Luego reescribe el test de arriba heredando de ella.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using AwesomeAssertions;

public abstract class HandlerTest<TCommand>
{
    // ── El MOTOR vive aquí: la ÚNICA pieza que el swap cambiará. ──
    protected readonly EventStore Store = new();
    protected string AggregateId = "emp-7";
    private int _previos;

    protected abstract ICommandHandler<TCommand> Handler { get; }

    protected void Given(params object[] eventos)
    {
        var stream = Store.AbrirStream<Empresa>(AggregateId);
        foreach (var hecho in eventos) stream.Append(hecho);
        _previos = Store.GetEvents(AggregateId).Count;
    }

    protected void When(TCommand comando) => Handler.Handle(comando);

    protected void Then(params object[] esperados) =>
        Store.GetEvents(AggregateId).Skip(_previos).Select(s => s.EventData)
             .Should().BeEquivalentTo(esperados);
}
```

```csharp
using Xunit;

public class SuspenderEmpresaTests : HandlerTest<SuspenderEmpresa>
{
    protected override ICommandHandler<SuspenderEmpresa> Handler => new SuspenderHandler(Store);

    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));   // hechos previos
        When(new SuspenderEmpresa(AggregateId, "falta de pago"));       // el comando
        Then(new EmpresaSuspendida("falta de pago"));                   // el hecho emitido
    }
}
```
</details>

> [!IMPORTANT]
> **Por qué la base está partida así — y por qué importa para el swap.** El **motor** (`Store`) y **cómo** `Given`/`Then` hablan con él viven en la **base**. Los `[Fact]` de abajo —los **escenarios**— no mencionan el `EventStore` ni el `Skip`: solo dicen *dado esto, cuando aquello, entonces esto*. Por eso, el día del swap tocarás **solo la base** (cómo `Given`/`Then` hablan con Marten) y **los escenarios no cambian** —los mismos hechos previos, el mismo comando, los mismos hechos esperados—. Que sigan verdes probará que Marten hace lo que hacía tu motor casero.

> [!NOTE]
> **Desde aquí, cada reto cierra con su test.** No es una sección que se visita y se olvida: de ahora en adelante, cada pieza que construyas o cambies se da por terminada solo cuando su escenario Given-When-Then está en verde. Los tests son el hilo que atraviesa el resto del taller.

> 🔍 **¿Lo lograste?** `dotnet test` → **`Passed: 1`**, y el test se lee como la especificación del comportamiento. Comprueba que vigila: cambia el motivo esperado a `"otro"`, corre, y míralo ponerse **rojo**; devuélvelo a `"falta de pago"` y vuelve al verde.

---

### El Descubrimiento

Destilaste la forma que **todo** test de event sourcing comparte: **Given** (hechos previos) → **When** (un comando) → **Then** (los hechos emitidos), partiendo la base entre el **motor** (intercambiable) y los **escenarios** (el invariante). Ese es el pago de blindar el motor *antes* de tocarlo.

Tu motor está protegido. Ahora sí puedes refactorizarlo sin volar a ciegas — y lo primero que le falta para ser real es no perder la historia al apagarse. Esa es la próxima grieta.

> [!NOTE]
> 🌱 **Semilla — estos escenarios validarán el swap.** Cuando cambies el motor a Marten ([persistir a mano](persistir-a-mano.md) y el swap), la base apuntará a Postgres y estos mismos `[Fact]` correrán como tests de **integración** contra Marten real: si siguen verdes, el swap no cambió el comportamiento. Y más adelante, el **`TestStore`** del equipo ([El almacén abstracto](el-almacen-abstracto.md)) te dejará correrlos rápido, sin base de datos. Es la misma base `HandlerTest`, evolucionando.

---

## ✅ Compruébalo

- [ ] Escribiste el primer test a pelo y `dotnet test` lo pone en **verde** (`Passed: 1`).
- [ ] Lo rompiste a propósito (cambiando el valor esperado) y lo viste **rojo**, luego lo arreglaste.
- [ ] Destilaste la base `HandlerTest<TCommand>` con `Given`/`When`/`Then`; el test heredado se lee en tres líneas.
- [ ] Explicas por qué el **motor** vive en la base y los **escenarios** en los `[Fact]` — y qué gana eso cuando llegue el swap.
- [ ] Explicas por qué en ES el test afirma **hechos emitidos**, no filas de una tabla.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el motor vive en la base y los escenarios en los `[Fact]`? ¿Cómo hace eso que los mismos tests validen el swap a Marten sin reescribirlos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Blindar el motor: Given-When-Then" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Blindas el motor con la gramática **Given** (hechos previos) → **When** (un comando) → **Then** (hechos emitidos). La base guarda el **motor** (intercambiable) y los `[Fact]` los **escenarios** (el invariante): al swapear a Marten, los mismos escenarios lo validan. Desde aquí, cada reto cierra con su test.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

[➡️ Siguiente: Persistir a mano tiene un límite](./persistir-a-mano.md)
