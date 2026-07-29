# Verde, y roto

Tu motor funciona. ¿Seguro? Lo has visto con los ojos en la consola, sección tras sección.

## 🎯 El Objetivo

Escribir tu primer **test automatizado** del agregado —que lo compruebe sin que tengas que mirar la consola— y salir sabiendo distinguir un test que de verdad te protege de uno que solo pasa aunque el motor esté roto.

## 💥 El dolor: un test feliz sobre un motor roto

En la sección anterior viste algo inquietante: cuando comentaste un `case` en `Aplicar`, el estado quedó **mal** y **nada explotó**. En un sistema de verdad, ¿quién te avisa de algo así? Un test debería. Vamos a escribir el primero —de la forma más natural— y a ver si te protege.

Primero, un sitio donde vivan los tests. **Desde tu carpeta de trabajo** (la del `.git`, donde vive `Empresas.Historia/` — no dentro de esa carpeta), crea un proyecto de pruebas y **enlázalo** a tu proyecto:

```bash
dotnet new xunit -o Empresas.Tests
dotnet add Empresas.Tests/Empresas.Tests.csproj reference Empresas.Historia/Empresas.Historia.csproj
```

A diferencia de tu proyecto —donde corres `dotnet run` dentro de su carpeta—, los tests se corren **desde la carpeta del proyecto de pruebas**: `cd Empresas.Tests` y ahí `dotnet test`.

> 🆕 **xUnit — el arnés de pruebas de .NET.** Un test es un método marcado con `[Fact]`; dentro, preparas una situación, ejecutas algo, y **afirmas** un resultado con `Assert`. Si la afirmación se cumple, el test pasa (**verde**); si no, falla (**rojo**). Los corres todos con `dotnet test`, que te dice cuáles pasaron y cuáles no — sin mirar ninguna consola. (El proyecto nuevo trae un `UnitTest1.cs` de ejemplo; bórralo. Y para que el test vea tus clases, deben ser `public`.)

Ahora el test "natural". Quieres comprobar que suspender una empresa la deja suspendida. Lo escribes tal como lo dirías en voz alta: parto de una empresa registrada, la suspendo, y miro si quedó suspendida.

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

> **Fíjate: tras `Load`, la lista de hechos sin confirmar queda vacía.** `Load` rehidrata — solo **aplica**, no acumula (como en la sección anterior). Para *este* test daría igual arrancar con `Registrar("Andes", "Básico")`: el estado saldría igual. Usamos `Load` pensando en el test que sigue, que medirá `SinConfirmar` — ahí un `Registrar` de siembra dejaría un `EmpresaRegistrada` metido, y `Load` no.

`dotnet test`: **verde**. Bien. Ahora vamos a romperlo a propósito.

> 🔨 **Rómpelo tú.** En `Suspender`, cambia `Emitir(new EmpresaSuspendida(motivo))` por `Aplicar(new EmpresaSuspendida(motivo))`. Es el **gemelo** del huérfano de la sección pasada: antes el estado ignoraba el hecho; ahora el hecho **nunca se emite**. `Aplicar` cambia el estado pero no acumula nada, así que no habrá qué guardar. Corre `dotnet test`.

Sigue **verde**.

La empresa quedó suspendida en memoria, pero **no emitió el hecho**: cuando un handler haga `Append`, no habrá nada que persistir. El motor está roto —pierde la suspensión— y tu test está feliz.

### El porqué

Mira **qué** afirmó tu test: `empresa.Suspendida`. Ese booleano lo pone `Aplicar`, y `Aplicar` corre igual con `Emitir` que con el sabotaje — porque cambiar el estado y **recordar el hecho** son dos cosas distintas, y tu test solo miró la primera. Afirmaste un **intermedio**: el estado es un paso del replay, no el resultado que se guarda.

## 🔧 Afirma los hechos, no el estado

¿Qué habría cazado el sabotaje? Un test que no mire el estado, sino **lo que la empresa emitió** para guardar: ¿quedó un `EmpresaSuspendida` entre los hechos sin confirmar?

> 🛠️ **Inténtalo tú.** Escribe un segundo test con la misma preparación (`Load` de una empresa registrada), que la suspenda igual, y que al final afirme que **entre sus hechos sin confirmar hay un `EmpresaSuspendida`**. Tienes `empresa.SinConfirmar` (la lista que llenaste en la sección anterior); la forma de afirmar "hay uno que cumple" es `Assert.Contains(coleccion, x => x is EmpresaSuspendida)`. Córrelo con el sabotaje **todavía puesto**.

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

Con el sabotaje puesto, este test se pone **rojo**: `SinConfirmar` está vacío, la empresa nunca emitió el hecho. Devuelve `Aplicar` a `Emitir` y córrelo otra vez: **verde**. Ese es el test que sí te protege.

</details>

Fíjate en la **forma** de ese test, porque la vas a repetir siempre: preparas una historia (**dado**: la empresa registrada), ejecutas una acción (**cuando**: suspender), y afirmas el hecho que salió (**entonces**: un `EmpresaSuspendida` sin confirmar). *Dado–cuando–entonces.*

### El Descubrimiento

Construiste dos tests para la misma acción. El que afirma el estado pasó verde con el motor roto; el que afirma el **hecho emitido** lo cazó. La razón es la que vienes viendo desde que el agregado empezó a acumular: en event sourcing, lo que una decisión **produce** son sus eventos —es su salida real, lo que se guarda y lo que todo lo demás leerá—; el estado del objeto es solo un paso intermedio del replay. Por eso el test honesto afirma los hechos. Ese patrón *dado–cuando–entonces sobre los eventos emitidos* es como se prueban los sistemas event-sourced.

> 🌱 Fíjate en cómo preparaste cada test: `Load(new object[]{ … })`, una historia armada a mano, en memoria, que nace y muere con el test. Probaste que el agregado **decide** bien — pero nada de esto tocó un almacén ni un disco. **Nada de lo que escribiste prueba que el diario sobreviva a apagar y volver a prender.** Ese es el próximo dolor.

## ✅ Compruébalo

- [ ] `dotnet test` corre los dos tests y los ves reportados, sin mirar ninguna consola del programa.
- [ ] Con el sabotaje (`Aplicar` en vez de `Emitir`): el test de estado pasa **verde**, el de hechos se pone **rojo**.
- [ ] Con `Emitir` restaurado: los dos pasan.
- [ ] Borra el `if (Suspendida) return;` de `Suspender` y corre `dotnet test`: los dos siguen **verdes**, porque ninguno suspende dos veces. Esa es la lección — ese comportamiento no está cubierto, el verde es decorativo. (Escribir el test que lo cace —suspender dos veces, afirmar que hay un solo `EmpresaSuspendida`— es tu siguiente reto.)

## 🆘 Si algo salió mal

- **`dotnet test` no encuentra `Empresa` / `EmpresaRegistrada`:** falta la referencia. Corre el `dotnet add ... reference ...` de arriba apuntando al `.csproj` de tu proyecto, y asegúrate de que esas clases sean `public`.
- **El test de estado también se pone rojo con el sabotaje:** revisa que estás afirmando `empresa.Suspendida` (el estado), no algo recargado. Si `Aplicar` no cambió el estado, revisa que su `case EmpresaSuspendida` siga poniendo `Suspendida = true`.
- **`Assert.Contains` no compila:** te falta `using Xunit;` arriba del archivo, o el lambda va como `x => x is EmpresaSuspendida`.
- **`Aplicar` no es accesible desde `Suspender`:** debería serlo — es un método `protected` de la base y `Empresa` hereda de ella. Si lo sacaste de `AggregateRoot`, vuelve a dejarlo ahí.

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

En event sourcing, el resultado de una decisión **son los hechos** que emite: un test que afirma el estado interno afirma un intermedio que puede mentir, y uno que afirma los hechos emitidos es el que de verdad te protege.

---

[⬅️ Volver: El agregado recuerda](./el-agregado-recuerda.md)

[➡️ Siguiente: El diario en disco (y lo que se queda afuera)](./el-diario-en-disco.md)
