# Given-When-Then: probar decisiones como especificación

En [Probar el motor](probar-el-motor.md) tu test pasó — pero costó cuatro líneas de plomería expresar una regla de una línea.

## 🎯 El Objetivo

Una clase base que deje escribir cada test como una **especificación**: `Given` los hechos previos → `When` el comando → `Then` los hechos esperados, sin el `yaEstaban`/`Skip`/`Select` a mano.

## 💥 El dolor: la regla queda enterrada bajo la plomería

Mira el test de la sección anterior. Solo dos líneas son la regla que pruebas; el resto es andamiaje:

```csharp
var store  = new EventStore();                                        // plomería
var stream = store.AbrirStream<Empresa>("emp-7");                     // plomería
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico")); // ← la regla: dado un registro
var yaEstaban = store.GetEvents("emp-7").Count;                       // plomería

new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"));  // ← al suspender

var nuevos = store.GetEvents("emp-7").Skip(yaEstaban).Select(s => s.EventData);      // plomería
Assert.Equal(new EmpresaSuspendida("falta de pago"), Assert.Single(nuevos));         // ← se emite la suspensión
```

Montar el store, sembrar, marcar el corte, recortar los nuevos: se repite **idéntico** en cada test. Y en Event Sourcing todos los tests tienen la misma forma —*dados unos hechos, al llegar un comando, se emiten otros hechos*—, así que vale la pena decir esa forma **una vez**.

## 🔧 Una base de test

Quieres que cada test se lea así — la regla, sin andamiaje:

```csharp
public class SuspenderTests : HandlerTest<SuspenderEmpresa>
{
    protected override ICommandHandler<SuspenderEmpresa> Handler => new SuspenderHandler(Store);

    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));   // el pasado
        When(new SuspenderEmpresa(EmpresaId, "falta de pago"));         // el comando
        Then(new EmpresaSuspendida("falta de pago"));                   // el hecho esperado
    }
}
```

> 🛠️ **Inténtalo tú.** Escribe una base `HandlerTest<TCommand>` sobre un `EventStore` compartido. Expón el handler bajo prueba con una propiedad abstracta `Handler` (un `ICommandHandler<TCommand>`, el contrato de [El despachador](el-despachador.md)) que cada test implementa. `Given(params object[])` siembra la historia y **recuerda cuántos hechos había**; `When(comando)` lo pasa a `Handler.Handle`; `Then(params object[])` afirma que los hechos **nuevos** (los de después del `Given`) son exactamente esos. Luego reescribe tu test de la sección anterior heredando de ella.

> [!NOTE]
> 🆕 **Idioma de C#: `params` y `Assert.Equal` sobre listas.** `params object[] esperados` deja llamar `Then(a, b)` o `Then()` sin construir un arreglo a mano. `Assert.Equal(esperados, nuevos)` cuando ambos son colecciones **compara elemento por elemento, por valor** (tus hechos son `record`): un `Then()` vacío afirma que **no** se emitió nada.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Xunit;

public abstract class HandlerTest<TCommand>
{
    protected readonly EventStore Store = new();
    protected readonly string EmpresaId = "emp-7";
    private int _yaEstaban;

    // cada test dice qué handler prueba
    protected abstract ICommandHandler<TCommand> Handler { get; }

    // Given: siembra la historia previa y recuerda dónde termina
    protected void Given(params object[] pasado)
    {
        var stream = Store.AbrirStream<Empresa>(EmpresaId);
        foreach (var hecho in pasado) stream.Append(hecho);
        _yaEstaban = Store.GetEvents(EmpresaId).Count;
    }

    // When: ejecuta el comando con el handler bajo prueba
    protected void When(TCommand comando) => Handler.Handle(comando);

    // Then: los hechos que aparecieron DESPUÉS del Given son exactamente estos
    protected void Then(params object[] esperados)
    {
        var nuevos = Store.GetEvents(EmpresaId).Skip(_yaEstaban).Select(s => s.EventData);
        Assert.Equal(esperados, nuevos);
    }
}
```
</details>

## 🔍 ¿Lo lograste?

`dotnet test` sigue en **verde**, pero cada test cabe en tres líneas que se leen como la regla de negocio. Ahora prueba la idempotencia con la misma gramática — fíjate lo directo que queda el "no pasó nada" (un `Then()` vacío):

```csharp
[Fact]
public void Suspender_una_empresa_ya_suspendida_no_emite_nada()
{
    Given(new EmpresaRegistrada("Constructora Andes", "Básico"),
          new EmpresaSuspendida("falta de pago"));
    When(new SuspenderEmpresa(EmpresaId, "otra vez"));
    Then();   // ningún hecho nuevo
}
```

---

## Lo que construiste

Una **especificación ejecutable**: `Given` los hechos previos, `When` el comando, `Then` los hechos emitidos. En Event Sourcing un test se juzga por **lo que pasó** (los hechos), no por cómo quedó una fila — y `Then()` vacío dice "no pasó nada" sin rodeos. La plomería vive una vez en la base; cada test dice solo su regla.

> [!NOTE]
> 🌱 **Semilla — esta base es la del equipo, y va a sobrevivir al motor.** Es, casi letra por letra, el `CommandHandlerTestBase` de la plantilla del equipo. Y cuando cambies el `EventStore` casero por una base de datos real, **esta misma gramática seguirá verde** con otro almacén debajo — solo cambia cómo se siembra y cómo se leen los hechos ([Tests de integración](tests-de-integracion.md)). Ese es el pago de tener el dominio desacoplado del almacenamiento.

---

## ✅ Compruébalo

- [ ] Una base `HandlerTest<TCommand>` con `Given` (siembra + recuerda el corte), `When` (ejecuta vía `Handler`) y `Then` (afirma los hechos nuevos por valor).
- [ ] Tu test de suspender hereda de ella y cabe en tres líneas legibles.
- [ ] Un test de idempotencia usa `Then()` vacío para afirmar que no se emitió nada.
- [ ] Explicas por qué en Event Sourcing el `Then` compara **hechos emitidos**, no el estado ni una fila.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué plomería desapareció de cada test al mover `Given`/`When`/`Then` a la base? ¿Por qué `Then()` vacío es una afirmación útil?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Given-When-Then" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Como todos los tests de un motor de eventos tienen la misma forma —*dados unos hechos, al llegar un comando, se emiten otros*—, una base `HandlerTest<TCommand>` con `Given`/`When`/`Then` la dice una vez: cada test queda como una **especificación** que compara los hechos emitidos por valor, y `Then()` vacío afirma la idempotencia.

---

[⬅️ Volver: Probar el motor sin UI ni base de datos](./probar-el-motor.md)

[➡️ Siguiente: De `new` al contenedor (Inyección de Dependencias)](./inyeccion-de-dependencias.md)
