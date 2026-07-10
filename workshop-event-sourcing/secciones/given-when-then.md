# Blindar el motor: Given-When-Then

Tienes el motor de event sourcing completo, y vas a refactorizarlo en serio: cambiar tu almacén casero por una **base de datos real**. Antes de tocarlo, hay que **blindarlo** — que un cambio no lo rompa sin que te enteres.

## 🎯 El Objetivo

Una **red de seguridad** de pruebas para tu motor: cada escenario afirma que **dados** unos hechos previos, **cuando** llega un comando, **entonces** se emiten estos hechos. Afirma **qué pasó** (los eventos), no **cómo se guarda** — así los mismos escenarios sobreviven a cambiar el motor por debajo, sin reescribirlos.

## 💥 El dolor: probar a ojo no avisa

Llevas varias secciones verificando igual: `dotnet run`, leer la consola, y decidir **tú** si lo que salió es lo correcto. Funciona para una regla, pero es manual y —peor— es **silencioso**: si al refactorizar el motor `Suspender` deja de emitir su hecho, la consola no grita; imprime algo un poco distinto que quizá no notes. Y vas a mover el motor **entero**. Necesitas algo que te avise **solo** cuando algo se rompa.

## 🔧 El motor se prueba a sí mismo, en RAM

Tu `EventStore` ya vive en memoria: creas uno nuevo por test y no montas nada más. Un test es **sembrar → ejecutar → inspeccionar los hechos nuevos**.

**Crea el proyecto de tests como hermano del tuyo — no dentro.** Un proyecto .NET compila todos los `.cs` bajo su carpeta; si el de tests queda anidado en `Empresas.Historia/`, tu proyecto se lo traga y no compila. Créalo desde tu **carpeta de trabajo** (la del `.git`):

```bash
# parado en tu carpeta de trabajo (la del .git) — NO dentro de Empresas.Historia/
dotnet new xunit -o Empresas.Historia.Tests
dotnet add Empresas.Historia.Tests reference Empresas.Historia/Empresas.Historia.csproj
```

Debe quedar así, los dos como **hermanos**:

```
tu-carpeta/                    (aquí está el .git)
├── Empresas.Historia/         ← tu proyecto
└── Empresas.Historia.Tests/   ← los tests
```

Los tests los corres con `dotnet test Empresas.Historia.Tests`.

> [!NOTE]
> 🆕 **Un test corre solo.** Corre `dotnet test Empresas.Historia.Tests`: el `[Fact]` de ejemplo que trae el template **pasa** — y **nadie lo llamó**. A diferencia de tu `Main`, xUnit encuentra los métodos `[Fact]` y los ejecuta él mismo (*test discovery*). Borra el ejemplo (`UnitTest1.cs`); el tuyo va ahí.

### Paso 1 · El primer test, a pelo

En `Empresas.Historia.Tests/`, crea `SuspenderEmpresaTests.cs`: una clase pública con un método `[Fact]`. Hace lo de siempre —sembrar → ejecutar → inspeccionar— pero **afirmando** con `Assert`, no imprimiendo.

> [!NOTE]
> 🆕 **Tres piezas de xUnit para afirmar el hecho nuevo.** `.Skip(previos)` salta los hechos que ya había y deja solo los emitidos. `Assert.Single(lista)` afirma que hay **uno solo** y te lo devuelve. `Assert.IsType<T>(x)` afirma el tipo y te devuelve `x` ya convertido, para leer sus datos.

> 🛠️ **Inténtalo tú.** Un `[Fact]` que: crea un `EventStore`, **siembra** un `EmpresaRegistrada` para `"emp-7"` (guarda cuántos hechos había), **ejecuta** el `SuspenderHandler` con `SuspenderEmpresa("emp-7", "falta de pago")`, y afirma que el hecho **nuevo** es un `EmpresaSuspendida` con ese motivo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// Empresas.Historia.Tests/SuspenderEmpresaTests.cs
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

> 🔨 **Rómpelo.** `dotnet test Empresas.Historia.Tests` → **`Passed: 1`**. Ahora cambia el motivo esperado a `"otro"`, corre, y míralo **rojo**; devuélvelo y vuelve al verde. Eso confirma que el test **vigila** — algo que "mirar a ojo" no hacía.

Funciona. Pero mira el cuerpo: seis líneas de andamiaje —crear el store, sembrar, contar, ejecutar, `Skip`/`Select`, comparar— envuelven **una** idea. Y **todos** los tests de event sourcing tienen la **misma forma**: unos hechos previos, un comando, los hechos que esperas. Vas a subir ese andamiaje a una **base** — pero **una pieza por paso**, viendo tu test encoger.

### Paso 2 · Sube el sembrado → nace `Given`

La primera pieza que se repetirá en todo test: **sembrar los hechos previos**. Súbela a una clase base. La base y tus tests son **clases separadas, en archivos separados**, las dos dentro del proyecto de tests; tu `Program.cs` de producción **no se toca**.

> 🛠️ **Inténtalo tú.** Quieres que el test abra diciendo *dados estos hechos previos*: `Given(new EmpresaRegistrada(...))`. Sube el sembrado a una base `HandlerTest` (ponla en el proyecto de tests — mismo archivo del test u otro, da igual). La base guarda el `EventStore` y el id del agregado (`AggregateId`, `"emp-7"` por ahora); su método `Given` recibe **uno o varios** hechos previos sueltos (sin que armes una lista), **abre el stream de `AggregateId`, se los agrega** y **recuerda cuántos había** (para después aislar los nuevos). Haz que tu test **herede** de la base y cambia el sembrado por `Given(...)`.

> [!NOTE]
> 🆕 **`params object[]` — recibir varios sueltos.** Eso de "uno o varios sin armar una lista" es la firma `Given(params object[] eventos)`: C# empaqueta en el array `eventos` lo que le pases (`Given(a)`, `Given(a, b)`). La **herencia** ya la conoces (`Empresa : AggregateRoot` en [Refactorizando el motor](refactorizando-el-motor.md)): la base es una **clase compartida** que cada test hereda —lo común arriba, cada test lo suyo—.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// Empresas.Historia.Tests/HandlerTest.cs — la BASE (nace con el motor + Given)
public class HandlerTest
{
    protected readonly EventStore Store = new();   // el MOTOR — lo único que cambiará al reemplazar el almacén
    protected string AggregateId = "emp-7";
    protected int _previos;

    protected void Given(params object[] eventos)
    {
        var stream = Store.AbrirStream<Empresa>(AggregateId);   // Empresa: tu único agregado por ahora
        foreach (var hecho in eventos) stream.Append(hecho);
        _previos = Store.GetEvents(AggregateId).Count;   // recuerda dónde termina "lo previo"
    }
}
```

```csharp
// Empresas.Historia.Tests/SuspenderEmpresaTests.cs — ahora HEREDA; el resto sigue a pelo POR AHORA
using Xunit;

public class SuspenderEmpresaTests : HandlerTest
{
    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));   // ← el sembrado, ya en la base

        new SuspenderHandler(Store).Handle(new SuspenderEmpresa(AggregateId, "falta de pago"));

        var nuevos = Store.GetEvents(AggregateId).Skip(_previos).Select(s => s.EventData).ToList();
        var hecho = Assert.IsType<EmpresaSuspendida>(Assert.Single(nuevos));
        Assert.Equal("falta de pago", hecho.Motivo);
    }
}
```
</details>

> 🔍 `dotnet test` → sigue **verde**. Solo mudaste el sembrado a la base; el comportamiento no cambió.

### Paso 3 · Sube la ejecución → nace `When`

La segunda pieza repetida: **ejecutar el handler**. Solo cambia **cuál** handler. Súbelo a `When`, y deja que cada test diga cuál es el suyo.

> 🛠️ **Inténtalo tú.** **🔁** Ahora la línea de en medio: `When(new SuspenderEmpresa(...))`. Quieres que `When` ejecute el handler **sin que la base sepa cuál es** — cada test provee **el suyo**. Así que la base declara un `Handler` que **cada test rellena** (y, hasta que lo rellenen, la base queda **incompleta**: no se crea sola), y necesita saber **de qué comando** habla. Añade `When` y ese `Handler` a la base; en el test, provee tu handler (`new SuspenderHandler(Store)`) y cambia la ejecución por `When(...)`. Haz las **dos** ediciones (base y test) antes de correr: una sin la otra no compila.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// la BASE gana su tipo <TCommand> y se hace abstract (por su primer miembro abstracto: Handler):
public abstract class HandlerTest<TCommand>   // 🔁 antes: class HandlerTest (sin tipo ni abstract)
{
    // … Store, AggregateId, _previos, Given: sin cambios …
    protected abstract ICommandHandler<TCommand> Handler { get; }
    protected void When(TCommand comando) => Handler.Handle(comando);
}
```

```csharp
// el test provee SU handler y usa When:
public class SuspenderEmpresaTests : HandlerTest<SuspenderEmpresa>   // 🔁 antes: HandlerTest
{
    protected override ICommandHandler<SuspenderEmpresa> Handler => new SuspenderHandler(Store);

    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));
        When(new SuspenderEmpresa(AggregateId, "falta de pago"));   // ← la ejecución, ya en la base

        var nuevos = Store.GetEvents(AggregateId).Skip(_previos).Select(s => s.EventData).ToList();
        var hecho = Assert.IsType<EmpresaSuspendida>(Assert.Single(nuevos));
        Assert.Equal("falta de pago", hecho.Motivo);
    }
}
```
</details>

> [!NOTE]
> 🆕 **El `Handler` a-rellenar: `abstract` + genérico.** "El handler que cada test rellena" es una **propiedad `abstract`**: `protected abstract ICommandHandler<TCommand> Handler { get; }` —tu contrato de [El despachador](el-despachador.md), otra vez—, y el test la cumple con `override`. Como la base tiene un miembro `abstract`, la **clase** se marca `abstract` (incompleta, no se crea sola). Y para que `Handler`/`When` sepan el tipo del comando, la base se parametriza: `HandlerTest<TCommand>`. Ni el `abstract` ni el `<TCommand>` hacían falta hasta ahora — nacen con `When`/`Handler`.

> 🔍 `dotnet test` → **verde**. Ya solo queda cruda la última pieza: la comparación.

### Paso 4 · Sube la comparación → nace `Then` (y el test queda en tres líneas)

La última pieza: **comparar los hechos nuevos con los que esperas**. Como usa `_previos` (de la base), vive en la base también.

> [!NOTE]
> 🆕 **AwesomeAssertions (`BeEquivalentTo`).** Podrías comparar con `Assert.Equal`, pero al fallar su mensaje sobre listas es difícil de leer. `BeEquivalentTo` compara **campo por campo** (tus eventos son `record`, iguales por valor) y te dice **cuál** dato difiere. Instálalo en el proyecto de tests: `dotnet add Empresas.Historia.Tests package AwesomeAssertions`.

> 🛠️ **Inténtalo tú.** **🔁** La última línea: `Then(new EmpresaSuspendida(...))`. Añade a la base `Then(...)` que tome los hechos **nuevos** (los que hay después de `_previos`) y los compare **por valor** con los que esperas. En el test, cambia toda la cola de `Assert` por `Then(...)`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// + en la BASE (usa _previos, por eso vive aquí):
using AwesomeAssertions;   // este using va ARRIBA del archivo, junto a los demás

protected void Then(params object[] esperados) =>
    Store.GetEvents(AggregateId).Skip(_previos).Select(s => s.EventData)
         .Should().BeEquivalentTo(esperados);
```

```csharp
// el test, ya en su forma final — tres líneas que se leen como especificación:
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

> [!NOTE]
> **La base guarda el motor; los escenarios, el invariante.** El `Store` —el motor— vive en la base. Los `[Fact]` de abajo no lo mencionan: solo dicen *dado esto, cuando aquello, entonces esto*. Por eso, el día que cambies el motor tocarás **solo la base**; los escenarios no cambian, y que sigan verdes probará que el motor nuevo hace lo mismo.

> 🔍 **¿Lo lograste?** `dotnet test` → **`Passed: 1`**, y el `[Fact]` se lee como la especificación del comportamiento. La base nació **método por método** —Given, When, Then—, cada uno cuando su repetición lo pidió.

---

### El Descubrimiento

Destilaste la forma que **todo** test de event sourcing comparte: **Given** (hechos previos) → **When** (un comando) → **Then** (los hechos emitidos). Y no la recibiste hecha: la sacaste **de tu propio test**, un método a la vez. Ese es el pago de blindar el motor *antes* de tocarlo.

Tu motor está protegido. Ahora sí puedes refactorizarlo sin volar a ciegas — y lo primero que le falta para ser real es no perder la historia al apagarse. Esa es la próxima grieta.

> [!NOTE]
> 🌱 **Semilla — estos escenarios validarán el swap.** Cuando cambies el motor a Marten ([persistir a mano](persistir-a-mano.md) y el swap), la base apuntará a Postgres y estos mismos `[Fact]` correrán como tests de **integración** (tocan una base de datos real, no solo RAM): si siguen verdes, el swap no cambió el comportamiento. Y más adelante, el **`TestStore`** del equipo ([El almacén abstracto](el-almacen-abstracto.md)) te dejará correrlos rápido, sin base de datos. Es la misma base `HandlerTest`, evolucionando.

---

## ✅ Compruébalo

- [ ] Creaste el proyecto de tests **hermano** (no anidado) y entiendes que `dotnet test` **descubre** y corre los `[Fact]` solo — nadie los llama, a diferencia del `Main`.
- [ ] Escribiste el primer test a pelo y `dotnet test` lo pone en **verde** (`Passed: 1`); lo rompiste a propósito y lo viste **rojo**, luego lo arreglaste.
- [ ] Subiste el andamiaje a `HandlerTest<TCommand>` **un método por paso** (Given, When, Then), verde en cada uno; el test heredado queda en tres líneas.
- [ ] Explicas por qué el **motor** (`Store`) vive en la base y los **escenarios** en los `[Fact]` — y qué gana eso cuando llegue el swap.
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

Blindas el motor con la gramática **Given** (hechos previos) → **When** (un comando) → **Then** (hechos emitidos), que destilas de tu propio test **un método por paso**. La base guarda el **motor** (intercambiable) y los `[Fact]` los **escenarios** (el invariante): al swapear a Marten, los mismos escenarios lo validan. Desde aquí, cada reto cierra con su test.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

[➡️ Siguiente: Persistir a mano tiene un límite](./persistir-a-mano.md)
