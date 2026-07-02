# Probar el motor sin UI ni base de datos

Ya tienes un motor que decide ([Decidir el futuro](decidir-el-futuro.md)), rutea comandos ([El despachador](el-despachador.md)) y guarda con concurrencia ([Concurrencia optimista](concurrencia-optimista.md)). Pero solo lo has visto correr con `Console.WriteLine` en el `Program.cs` — y esa prueba se tira a la basura en cuanto cierras el archivo.

## 🎯 El Objetivo

Escribir un **test** que demuestre que un comando emite el hecho correcto —y que puedes **volver a correr** cada vez que tocas el código— sin levantar una interfaz ni una base de datos.

## 💥 El dolor: ¿cómo sabes que `Suspender` hace lo correcto?

`SuspenderEmpresa` debería emitir un `EmpresaSuspendida`. Y suspender **dos veces** no debería emitir un segundo hecho (la idempotencia de [Decidir el futuro](decidir-el-futuro.md)). Hoy solo puedes comprobarlo a ojo: corres el `Program.cs`, imprimes, y lees la consola. Eso no se guarda, no avisa cuando lo rompes en tres semanas, y no cubre los casos que no imprimiste.

Lo bueno: tu `EventStore` **ya vive en memoria** — es su propio doble de test. No hace falta ni base de datos ni mocks. La forma natural de probar un motor de eventos:

- **Given** los hechos que ya pasaron (la historia que siembras).
- **When** llega un comando.
- **Then** miras los hechos **nuevos** que se emitieron.

## 🔧 El primer test

Quieres poder escribir un test que se lea así, y correrlo en verde:

```csharp
[Fact]
public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
{
    var store = new EventStore();

    // Given: la empresa ya existe
    var stream = store.AbrirStream<Empresa>("emp-7");
    stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
    var yaEstaban = store.GetEvents("emp-7").Count;

    // When: llega el comando
    new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"));

    // Then: se emitió un hecho nuevo, y es la suspensión
    var nuevos = store.GetEvents("emp-7").Skip(yaEstaban).Select(s => s.EventData).ToList();
    var hecho  = Assert.Single(nuevos);
    Assert.Equal(new EmpresaSuspendida("falta de pago"), hecho);
}
```

> 🛠️ **Inténtalo tú.** Haz que ese test pase. (1) Crea un proyecto de test al lado del tuyo: `dotnet new xunit -o Gestion.Tests` y `dotnet add Gestion.Tests reference` a tu proyecto. (2) Escribe el `[Fact]` de arriba. (3) `dotnet test`. *(Pista: el "hecho nuevo" es el que aparece en el cajón **después** de lo que sembraste — por eso guardas `yaEstaban` antes del `When` y haces `Skip` después.)*

> [!NOTE]
> 🆕 **Idioma de C#: xUnit.** `[Fact]` marca un método como un test que el runner ejecuta con `dotnet test`. `Assert.Single(lista)` afirma que la lista tiene **un** elemento y te lo devuelve. `Assert.Equal(esperado, real)` compara por **valor**: como tus hechos son `record`, dos `EmpresaSuspendida("falta de pago")` son iguales aunque sean instancias distintas — no comparas referencias.

> [!NOTE]
> Aquí sí miramos el `store` por dentro con `GetEvents`, aunque en [El almacén: un cajón por empresa](el-almacen-por-id.md) dijimos que un **handler** no lo hace. Un test es distinto: su trabajo **es** inspeccionar. El handler sigue hablando solo con el stream.

<details>
<summary>👉 Muéstrame el archivo completo</summary>

```csharp
using Xunit;

public class SuspenderTests
{
    [Fact]
    public void Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        var store = new EventStore();

        // Given
        var stream = store.AbrirStream<Empresa>("emp-7");
        stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
        var yaEstaban = store.GetEvents("emp-7").Count;

        // When
        new SuspenderHandler(store).Handle(new SuspenderEmpresa("emp-7", "falta de pago"));

        // Then
        var nuevos = store.GetEvents("emp-7").Skip(yaEstaban).Select(s => s.EventData).ToList();
        var hecho  = Assert.Single(nuevos);
        Assert.Equal(new EmpresaSuspendida("falta de pago"), hecho);
    }
}
```
</details>

## 🔍 ¿Lo lograste?

`dotnet test` debe imprimir **`Superado: 1`**. Sembraste un hecho como pasado, ejecutaste el comando, y confirmaste que el motor emitió exactamente `EmpresaSuspendida("falta de pago")` — sin UI, sin base de datos, sin mocks.

Ahora prueba el otro lado de la regla. Añade un segundo test: **Given** una empresa ya suspendida (dos hechos: registrada + suspendida), **When** `SuspenderEmpresa`, **Then** `Skip(yaEstaban)` no trae **ningún** hecho nuevo (`Assert.Empty`). Ahí ves la idempotencia protegida por un test.

---

## Lo que probaste

Tu `EventStore` en memoria es un **doble de test** sin esfuerzo: siembras la historia (**Given**), ejecutas un comando (**When**), y observas los hechos que se emitieron (**Then**). En Event Sourcing no pruebas filas de una tabla ni el estado final: pruebas **los hechos que un comando produjo** — porque el estado siempre se puede reconstruir de ellos.

Pero fíjate cuánto ruido rodea a la idea: guardar `yaEstaban`, `Skip`, `Select(s => s.EventData)`, el `new EventStore()` en cada test. La intención —*dado esto, cuando aquello, entonces esto*— queda enterrada. Eso se limpia en la próxima sección.

---

## ✅ Compruébalo

- [ ] Tienes un proyecto `Gestion.Tests` (xUnit) que referencia tu proyecto y corre con `dotnet test`.
- [ ] Un `[Fact]` prueba que suspender una empresa activa emite `EmpresaSuspendida`, comparando el hecho por valor.
- [ ] Un segundo `[Fact]` prueba la idempotencia: suspender una empresa ya suspendida no emite hechos nuevos (`Assert.Empty`).
- [ ] Explicas por qué el test mira **los hechos nuevos**, no el estado final ni una tabla.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué tu `EventStore` en memoria sirve como doble de test sin un solo mock? ¿Por qué en Event Sourcing pruebas los hechos emitidos y no el estado?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Probar el motor" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Como tu `EventStore` vive en memoria, es su propio doble de test: siembras la historia (**Given**), ejecutas un comando (**When**) y afirmas los **hechos nuevos** que emitió (**Then**) —comparados por valor porque son `record`— sin UI, sin base de datos y sin mocks.

---

[⬅️ Volver: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)

[➡️ Siguiente: Given-When-Then (una gramática para probar)](./given-when-then.md)
