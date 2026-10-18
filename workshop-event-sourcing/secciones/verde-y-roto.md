# Verde, y roto

Tu motor funciona. ¿Seguro? Lo has visto con los ojos en la consola, sección tras sección.

## 🎯 El Objetivo

Escribir tu primer **test automatizado** del agregado, y distinguir un test que te protege de uno que pasa aunque el motor esté roto.

## 💥 El dolor: un test feliz sobre un motor roto

Cuando comentaste un `case` en `Aplicar`, el estado quedó **mal** y **nada explotó**. Un test debería avisarte. Escribe el primero, de la forma más natural, y mira si te protege.

Primero, un sitio donde vivan los tests. **Desde tu carpeta de trabajo** (la del `.git`, donde vive `Empresas.Historia/` — no dentro de esa carpeta), crea un proyecto de pruebas y **enlázalo** a tu proyecto:

```bash
dotnet new xunit -o Empresas.Tests
dotnet add Empresas.Tests/Empresas.Tests.csproj reference Empresas.Historia/Empresas.Historia.csproj
```

Los tests se corren **desde la carpeta del proyecto de pruebas**: `cd Empresas.Tests` y ahí `dotnet test`.

> 🆕 **xUnit — el arnés de pruebas de .NET.** Un test es un método marcado con `[Fact]`: preparas una situación, ejecutas algo y **afirmas** un resultado con `Assert`. Si la afirmación se cumple, el test pasa (**verde**); si no, falla (**rojo**). `dotnet test` los corre todos y te dice cuáles pasaron, sin mirar ninguna consola. (Para que el test vea tus clases, deben ser `public`.)

El proyecto nuevo trae un `UnitTest1.cs` de ejemplo, que vas a borrar. Antes, ábrelo: es un `[Fact]` llamado `Test1`, con el cuerpo vacío. Córrelo con `dotnet test`:

```
Correctas! - Con error:     0, Superado:     1, Omitido:     0, Total:     1
```

(Si tu sistema está en inglés: `Passed! - Failed: 0, Passed: 1, Skipped: 0, Total: 1`.) Sale **verde** sin afirmar nada: quien corra `dotnet test` sobre este proyecto cree que algo está probado. Ahora sí, bórralo.

Ahora el test "natural": suspender una empresa la deja suspendida. Lo escribes como lo dirías en voz alta: parto de una empresa registrada, la suspendo y miro si quedó suspendida.

```csharp
using Xunit;

public class SuspensionTests
{
    [Fact]
    public void Suspender_deja_la_empresa_suspendida()
    {
        var empresa = new Empresa();
        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });  // dado: registrada

        empresa.Suspender("falta de pago");                                        // cuando

        Assert.True(empresa.Suspendida);                                           // entonces
    }
}
```

> **Fíjate: tras `Load`, la lista de hechos sin confirmar queda vacía**, porque `Load` solo aplica. Aquí daría igual arrancar con `Registrar("Andes", "Básico")`, pero el test que sigue medirá `SinConfirmar`, y un `Registrar` de siembra dejaría ahí un `EmpresaRegistrada`.

`dotnet test`: **verde**. Ahora rómpelo a propósito.

> 🔨 **Rómpelo tú.** En `Suspender`, cambia `Emitir(new EmpresaSuspendida(motivo))` por `Aplicar(new EmpresaSuspendida(motivo))`. Es el **gemelo** del huérfano de la sección pasada: antes el estado ignoraba el hecho; ahora el hecho **nunca se emite**, porque `Aplicar` cambia el estado sin acumular nada. Corre `dotnet test`.

Sigue **verde**. La empresa quedó suspendida en memoria, pero cuando un handler haga `Append`, no habrá nada que persistir: el motor pierde la suspensión y tu test está feliz. Tu test afirmó `empresa.Suspendida`, y ese booleano lo pone `Aplicar`, que corre igual con `Emitir` que con el sabotaje. Cambiar el estado y **recordar el hecho** son dos cosas distintas, y tu test solo miró la primera: afirmó un **intermedio** del replay, no lo que se guarda.

## 🔧 Afirma los hechos, no el estado

> 🛠️ **Inténtalo tú.** Escribe un segundo test con la misma preparación (`Load` de una empresa registrada), que la suspenda igual, y que al final afirme **lo que la empresa emitió**: que **entre sus hechos sin confirmar hay un `EmpresaSuspendida`**. Tienes `empresa.SinConfirmar` (la lista que llenaste en la sección anterior); la forma de afirmar "hay uno que cumple" es `Assert.Contains(coleccion, x => x is EmpresaSuspendida)`. Córrelo con el sabotaje **todavía puesto**.

<details>
<summary>La cura</summary>

```csharp
[Fact]
public void Suspender_emite_el_hecho()
{
    var empresa = new Empresa();
    empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });

    empresa.Suspender("falta de pago");

    Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);
}
```

Con el sabotaje puesto, este test se pone **rojo**: `SinConfirmar` está vacío. Devuelve `Aplicar` a `Emitir` y córrelo otra vez: **verde**.

</details>

La **forma** de ese test la vas a repetir siempre: preparas una historia (**dado**: la empresa registrada), ejecutas una acción (**cuando**: suspender), y afirmas el hecho que salió (**entonces**: un `EmpresaSuspendida` sin confirmar). *Dado–cuando–entonces.*

> 🔨 **Rómpelo tú (el huérfano, ahora con un test).** Comenta otra vez `case EmpresaReactivada:` en tu `Aplicar`, como en la sección pasada, y corre `dotnet test`: los dos tests siguen **verdes**, porque en ninguno aparece una reactivación. Agrega uno que la tenga en el **dado**:
>
> ```csharp
> [Fact]
> public void Suspender_tras_reactivar_emite_el_hecho()
> {
>     var empresa = new Empresa();
>     empresa.Load(new object[]
>     {
>         new EmpresaRegistrada("Andes", "Básico"),
>         new EmpresaSuspendida("falta de pago"),
>         new PagoRegistrado(500),
>         new EmpresaReactivada(),                   // dado: ya volvió a estar activa
>     });
>
>     empresa.Suspender("incumplimiento de contrato");
>
>     Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);
> }
> ```
>
> Con el huérfano, la empresa cree que sigue suspendida, `Suspender` no emite nada y este test se pone **rojo**. Restaura la línea: **verde**. Por eso cada hecho merece al menos un test que lo tenga en el *dado*, con una decisión que dependa de él.

### El Descubrimiento

El test que afirma el estado pasó verde con el motor roto; el que afirma el **hecho emitido** lo cazó. En event sourcing, lo que una decisión **produce** son sus eventos: lo que se guarda y lo que todo lo demás leerá. Ese patrón, *dado–cuando–entonces sobre los eventos emitidos*, es como se prueban los sistemas event-sourced.

> 🌱 Cada test arma su historia a mano, en memoria, y muere con el test. Probaste que el agregado **decide** bien, pero nada de esto tocó un almacén ni un disco: **nada de lo que escribiste prueba que el diario sobreviva a apagar y volver a prender.** Ese es el próximo dolor.

## ✅ Compruébalo

- [ ] El `UnitTest1.cs` de la plantilla pasó **verde** sin un solo `Assert`. Un verde sin afirmación es decorativo, también para un proyecto de tests entero: el proyecto existe porque afirma algo.
- [ ] Con el sabotaje (`Aplicar` en vez de `Emitir`): el test de estado pasa **verde** y los de hechos se ponen **rojos**. Con `Emitir` restaurado, todos pasan.
- [ ] Con `case EmpresaReactivada:` comentado, solo el test que tiene la reactivación en el *dado* se pone **rojo**.
- [ ] Borra el `if (Suspendida) return;` de `Suspender` y corre `dotnet test`: todos siguen **verdes**, porque ninguno suspende dos veces. Ese comportamiento no está cubierto: el verde es decorativo. (Escribir el test que lo cace —suspender dos veces, afirmar que hay un solo `EmpresaSuspendida`— es tu siguiente reto.)

## 🆘 Si algo salió mal

- **`dotnet test` no encuentra `Empresa` / `EmpresaRegistrada`:** falta la referencia. Corre el `dotnet add ... reference ...` de arriba apuntando al `.csproj` de tu proyecto, y asegúrate de que esas clases sean `public`.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md` la decisión de hoy:

> Mis tests afirman los **hechos emitidos** (`SinConfirmar`), no el estado en memoria: el estado es un intermedio del replay y puede pasar verde con el motor roto.

Y piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿por qué el test que afirma `empresa.Suspendida` pasó verde aunque la empresa no emitió ningún hecho? ¿Qué estaba mirando, y qué debería haber mirado?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Verde, y roto" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

En event sourcing, el resultado de una decisión **son los hechos** que emite: un test que afirma el estado interno afirma un intermedio que puede mentir; el que te protege afirma los hechos emitidos.

---

[⬅️ Volver: El agregado recuerda](./el-agregado-recuerda.md)

[➡️ Siguiente: El diario en disco (y lo que se queda afuera)](./el-diario-en-disco.md)
