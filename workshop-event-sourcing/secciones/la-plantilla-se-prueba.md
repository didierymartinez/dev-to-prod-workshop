# La plantilla se prueba

Tu plantilla ya guarda la empresa y su proceso con la misma pieza. Hasta ahora la probaste a ojo: un bloque en tu `Program.cs`, una corrida y una consulta en `psql`.

## 🎯 El Objetivo

Probar la plantilla como una librería. Las reglas de la empresa se prueban en memoria, con un doble que rehidrata como Marten, y un test compara ese doble con Marten.

## 💥 El dolor: las reglas no tienen un test

Desde [El swap por reconocimiento](./el-swap-por-reconocimiento.md), tus tests de reglas están comentados: rehidrataban con tu `Load`, y ahora rehidrata Marten. Para saber si un pago repetido entra no hace falta una base: basta un doble que rehidrate la empresa en memoria como Marten, y llamar al verbo. Pero, como el doble ingenuo de [El puerto propio](./el-puerto-propio.md), su verde vale lo que se parezca al real. Los tests que comentaste en el swap puedes borrarlos: los reemplazan los de aquí.

## 🔧 El doble fiel

> 🆕 **Qué `Apply` ve Marten 9.** Al compilar, Marten busca los `Apply` **públicos** de tu agregado, también los que hereda de una clase base, y genera aparte un `switch` por tipo de hecho, como tu `Aplicar` de [Refactorizando el motor](./refactorizando-el-motor.md). Un `Apply` privado no lo ve. Si todos lo son, la primera rehidratación lanza `InvalidProjectionException`. Si es uno solo, Marten lo salta sin avisar, y ese hecho no cambia nada al rehidratar. Marten 8 buscaba los `Apply` al correr, y sí veía los privados: hay README de la organización que todavía los enseñan.

> 🆕 **Reflexión: buscar un método por su nombre, y llamarlo.** `typeof(T).GetMethod("Apply", [tipo])` busca en la clase `T` un método **público** llamado `Apply` que reciba ese tipo, también entre los heredados. Si no lo hay, devuelve `null`. `metodo.Invoke(objeto, [argumento])` lo llama sobre ese objeto. Y `typeof(AggregateRoot).GetProperty("Id")!.SetValue(objeto, valor)` le asigna esa propiedad, que vive en la base, aunque su `set` sea `protected`. La usa el doble para ver lo mismo que Marten en cualquier agregado, sin un `switch` escrito para cada uno: Marten lo resuelve al compilar, y tu doble al correr.

### Paso 1 · Las reglas, en memoria

> 🛠️ **Inténtalo tú.** Quiero este test, sin Postgres:
>
> ```csharp
> var e = EnMemoria.Rehidratar<Empresa>("emp-1",
>     new EmpresaRegistrada("900", "Andes", "Básico"),
>     new PagoRegistrado(50_000, "BANCO-0044"));   // dado: ese pago ya entró
> e.RegistrarPago(50_000, "BANCO-0044");           // cuando: el banco lo avisa otra vez
> Assert.Empty(e.SinConfirmar);                    // entonces: no registra nada
> ```
>
> Para eso: **(1)** En `Empresas.Tests`, crea una clase `static` `EnMemoria` con `Rehidratar<T>(string id, params object[] hechos)`. Que cree el agregado con `new T()` —pide `where T : AggregateRoot, new()`, como tu `EventStream<T>` de [El flujo de vida](./el-flujo-de-vida.md)—, le ponga el `Id` y le aplique cada hecho con su `Apply` público. Si un hecho no tiene `Apply`, sáltalo: Marten tampoco lo aplica. **(2)** Pon el test en una clase `ReglasDeEmpresa`. No va en la colección `"host"`: no toca la base.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/EnMemoria.cs: el doble, que rehidrata con lo que Marten ve
public static class EnMemoria
{
    public static T Rehidratar<T>(string id, params object[] hechos) where T : AggregateRoot, new()
    {
        var a = new T();
        typeof(AggregateRoot).GetProperty("Id")!.SetValue(a, id);          // el Id lo pone el stream
        foreach (var h in hechos)
            typeof(T).GetMethod("Apply", [h.GetType()])?.Invoke(a, [h]);  // solo un Apply público, como Marten; si no hay, lo salta
        return a;
    }
}
```

```csharp
// Empresas.Tests/ReglasDeEmpresa.cs: las reglas de la empresa, sin Postgres
public class ReglasDeEmpresa
{
    [Fact]
    public void Un_pago_repetido_no_se_registra_dos_veces()
    {
        var e = EnMemoria.Rehidratar<Empresa>("emp-1",
            new EmpresaRegistrada("900", "Andes", "Básico"),
            new PagoRegistrado(50_000, "BANCO-0044"));
        e.RegistrarPago(50_000, "BANCO-0044");
        Assert.Empty(e.SinConfirmar);
    }
}
```

</details>

> 🔍 **¿Lo lograste?** `dotnet test --filter ReglasDeEmpresa` pasa en verde, aunque no hayas fijado `CADENA_POSTGRES`: no toca la base.

### Paso 2 · El contrato: el mismo dado, en el doble y en Marten

Que el doble se parece a Marten no se afirma: se prueba. Un **test de contrato** les da a los dos el mismo dado y el mismo cuando, y compara lo que queda.

> 🆕 **`Assert.Equivalent(esperado, real)`.** Compara una por una las propiedades públicas de dos objetos, y entra en sus listas. Si una difiere, cae y la nombra: `Mismatched value on member 'Plan'`. Los campos privados no los mira.

> 🛠️ **Inténtalo tú.** Quiero esto, con el store de tu `HostDePrueba`, que es el Marten configurado como tu servicio:
>
> ```csharp
> var deMarten = await s.Events.AggregateStreamAsync<Empresa>(id);   // el dado, guardado en Postgres y rehidratado por Marten
> var delDoble = EnMemoria.Rehidratar<Empresa>(id, dado);             // el mismo dado, en memoria
> // … el mismo cuando, a los dos …
> Assert.Equivalent(deMarten, delDoble);
> ```
>
> Para eso: **(1)** Crea `ContratoDelDoble` en la colección `"host"`, como tu `LineasQueCarganPeso` de [El comentario que sobrevive](./el-comentario-que-sobrevive.md), y pídele el `IDocumentStore` a `app.Services`. **(2)** Arma un dado con un hecho por cada `Apply` de tu `Empresa`, y guárdalo con `StartStream` en un id nuevo de cada corrida. **(3)** Rehidrata con Marten y con tu doble. `AggregateStreamAsync` devuelve `null` si no encuentra el stream, y el compilador te lo avisa: un `Assert.NotNull` lo descarta. **(4)** Dales a los dos el mismo cuando, el pago repetido del Paso 1, y compáralos. El cuando hace falta: las referencias de pago viven en un campo privado, que `Assert.Equivalent` no mira. Lo que cada uno emite al recibir el pago otra vez queda en `SinConfirmar`, que es pública. **(5)** Corre `dotnet test`. Si cae, el mensaje nombra la propiedad en la que tu doble no se parece a Marten: arréglalo en el doble, no en el test.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/ContratoDelDoble.cs: el mismo dado y el mismo cuando, en el doble y en Marten
using Marten;
using Microsoft.Extensions.DependencyInjection;

[Collection("host")]
public class ContratoDelDoble(HostDePrueba app)
{
    [Fact]
    public async Task El_doble_rehidrata_igual_que_Marten()
    {
        var id = $"emp-{Guid.NewGuid():N}";   // un stream nuevo en cada corrida
        object[] dado =
        [
            new EmpresaRegistrada("900", "Andes", "Básico"),
            new PlanCambiado("Premium"),
            new EmpresaSuspendida("mora", "susp-1"),
            new SuspensionRevertida("rechazo"),
            new EmpresaSuspendida("mora", "susp-2"),
            new ProcesoCerrado("susp-2"),
            new PagoRegistrado(50_000, "BANCO-0044"),
            new EmpresaReactivada(),
        ];   // un hecho por cada Apply de tu Empresa
        await using var s = app.Services.GetRequiredService<IDocumentStore>().LightweightSession("acme");
        s.Events.StartStream<Empresa>(id, dado);
        await s.SaveChangesAsync();

        var deMarten = await s.Events.AggregateStreamAsync<Empresa>(id);
        var delDoble = EnMemoria.Rehidratar<Empresa>(id, dado);
        Assert.NotNull(deMarten);
        deMarten.RegistrarPago(50_000, "BANCO-0044");   // cuando: el mismo pago, a los dos
        delDoble.RegistrarPago(50_000, "BANCO-0044");

        Assert.Equivalent(deMarten, delDoble);   // entonces: el mismo estado, y lo mismo emitido
    }
}
```

La primera corrida cae:

```
Assert.Equivalent() Failure: Mismatched value on member 'Version'
Expected: 8
Actual:   0
```

Marten pone en `Version` la versión del stream al rehidratar, como viste en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md), y tu doble no: el contrato encontró una diferencia que no buscabas. Agrégale a `Rehidratar` la línea que falta, antes del `return`, y corre otra vez: verde.

```csharp
typeof(T).GetProperty("Version")?.SetValue(a, hechos.Length);   // la versión del stream, como Marten; si no la tiene, nada
```

</details>

## 🔨 Rómpelo: el doble que ve de más

Haz privado el `Apply(PagoRegistrado)` de tu `Empresa`. A primera vista tiene sentido: nadie de afuera debería aplicar un pago sin pasar por `RegistrarPago`. Corre `dotnet test`:

- `ContratoDelDoble` pasa: tu doble y Marten saltan los dos el `Apply` privado.
- `ReglasDeEmpresa` cae con `Assert.Empty() Failure: Collection was not empty`. Al rehidratar, ningún `Apply` guardó la referencia, y el segundo aviso vuelve a registrar el pago.

Como el contrato pasa, ese rojo es el de producción: tu `RegistrarPagoHandler` de [Llegó dos veces](./llego-dos-veces.md) carga con Marten, y el mismo aviso del banco, repetido, deja dos `pago_registrado`. Tu `CarreraDelPagoTests` ya lo ve: cae con `EventStreamUnexpectedMaxEventIdException`, porque ningún reintento encuentra la referencia.

Sin deshacer eso, haz que el doble vea también los privados, como Marten 8. En su `GetMethod`, pasa `BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance` antes del arreglo de tipos, con `using System.Reflection;` arriba de `EnMemoria.cs`. Corre otra vez:

- `ReglasDeEmpresa` pasa: el doble ve el `Apply` privado, y la regla parece sana, aunque `CarreraDelPagoTests` sigue en rojo.
- `ContratoDelDoble` cae:

```
Assert.Equivalent() Failure: Collection value not found in member 'SinConfirmar'
Expected: PagoRegistrado { Monto = 50000, Referencia = BANCO-0044 }
In:       []
```

Marten volvió a registrar el pago, y tu doble no. Ese verde de la regla mentía: el doble ve lo que Marten no ve. Qué `Apply` cuenta lo decide el motor, no el doble ni un README, y cambia con su versión: el test de contrato es el que te avisa.

Deshaz los dos cambios: el `Apply` vuelve a público, y el doble a `GetMethod("Apply", [h.GetType()])`. Con Marten 9, los `Apply` van públicos. Que cualquiera pueda llamarlos no abre el diario: un `Apply` solo cambia la copia en memoria, y al diario no entra nada sin `Emitir`, que es `protected`.

## 🔧 Lo que solo el `Apply` cambia

Desde [La plantilla](./la-plantilla.md), `Emitir` solo acumula, y un verbo puede asignar estado por su cuenta, fuera del `Apply`. Pruébalo. En `Empresa.Registrar`, pon el nombre al crear —`new Empresa { Id = id, Nombre = nombre }`— y quita `Nombre = e.Nombre` de tu `Apply(EmpresaRegistrada)`. Parece lo mismo: el nombre ya viaja en el hecho. Corre `dotnet test`: todo en verde, también `ContratoDelDoble`. Marten y el doble rehidratan igual, los dos sin nombre.

La empresa recién registrada tiene nombre; la que cargue mañana cualquier handler, no, porque Marten solo corre los `Apply`. El contrato no lo ve: compara dos rehidrataciones, no el agregado que deja un verbo con el que sale de rehidratar sus hechos. Deja el cambio puesto: el paso siguiente lo atrapa.

### Paso 3 · El verbo y sus hechos, la misma foto

> 🆕 **`GetProperties()`: todas las propiedades públicas.** `objeto.GetType().GetProperties()` da cada propiedad pública del objeto, y `p.GetValue(objeto)` lee su valor. Con `string.Join` armas un texto con todas: una foto del estado, que `Assert.Equal` compara letra por letra.

> 🛠️ **Inténtalo tú.** Quiero esto en tu `ReglasDeEmpresa`:
>
> ```csharp
> var nueva = Empresa.Registrar("emp-1", "900", "Andes", "Básico");                        // lo que deja el verbo
> var rehidratada = EnMemoria.Rehidratar<Empresa>("emp-1", nueva.SinConfirmar.ToArray());  // lo que dejan sus hechos
> Assert.Equal(Foto(rehidratada), Foto(nueva));
> ```
>
> Escribe `Foto(AggregateRoot a)`: un texto con `Propiedad=valor` por cada propiedad pública, menos dos. `Version` la pone el stream al rehidratar, no el verbo. `SinConfirmar` lleva los hechos que el verbo acaba de emitir, y la rehidratada no tiene pendientes. Por esas dos, aquí no sirve `Assert.Equivalent`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en ReglasDeEmpresa: lo que deja el verbo es lo que dejan sus hechos
[Fact]
public void Registrar_deja_lo_mismo_que_sus_hechos()
{
    var nueva = Empresa.Registrar("emp-1", "900", "Andes", "Básico");
    var rehidratada = EnMemoria.Rehidratar<Empresa>("emp-1", nueva.SinConfirmar.ToArray());
    Assert.Equal(Foto(rehidratada), Foto(nueva));
}

// cada propiedad pública con su valor, menos la versión (la pone el stream) y los pendientes (son del verbo)
static string Foto(AggregateRoot a) => string.Join(" ", a.GetType().GetProperties()
    .Where(p => p.Name != "Version" && p.Name != "SinConfirmar")
    .Select(p => $"{p.Name}={p.GetValue(a)}"));
```

</details>

Con el cambio puesto, corre `dotnet test`. Cae la foto, y solo ella:

```
Assert.Equal() Failure: Strings differ
                          ↓ (pos 15)
Expected: "Nit=900 Nombre= Plan=Básico Suspendida=Fa"···
Actual:   "Nit=900 Nombre=Andes Plan=Básico Suspendi"···
                          ↑ (pos 15)
```

Deshaz el cambio: el nombre vuelve al `Apply`, y la foto pasa a verde. La foto atrapa también un dato que el hecho no lleva, porque ningún `Apply` lo puede reconstruir: todo el estado nace de un hecho, y solo su `Apply` lo cambia (el `Id` lo pone el stream). Para un verbo que hace crecer el stream, como `Suspender`, compara el verbo sobre el dado con la rehidratación del dado más sus `SinConfirmar`.

## El Descubrimiento

Tu doble rehidrata con lo que Marten ve, y un test de contrato lo fija contra Postgres: si el doble deja de ver lo que ve el motor, el contrato cae, aunque las reglas sigan en verde. La foto fija lo que el contrato no ve: que solo los `Apply` cambian el estado. Así se prueba una librería como `Cosmos.BuildingBlocks`: su doble, contra el motor real.

> 🌱 Tus tests prueban la plantilla, pero quien la adopte no los va a leer primero: va a leer su README, y tu plantilla todavía no tiene uno. Un README cuyo ejemplo no envejece es [El README que compila](./el-readme-que-compila.md).

## ✅ Compruébalo

- [ ] Tu `EnMemoria` rehidrata con los `Apply` públicos, el `Id` y la `Version`, como Marten 9, y `ContratoDelDoble` pasa contra Postgres.
- [ ] Con un `Apply` privado, la regla cae y el contrato pasa, porque Marten lo salta; con el doble que ve los privados, la regla pasa en falso y el contrato cae.
- [ ] `Registrar_deja_lo_mismo_que_sus_hechos` cae si un verbo asigna estado fuera de su `Apply`, y el contrato no lo ve.

## 🆘 Si algo salió mal

- **La primera rehidratación lanza `InvalidProjectionException: No source-generated dispatcher found…`, o un hecho del diario no cambia nada al rehidratar:** Marten 9 no ve los `Apply` privados (ni `internal`). Si todos lo son, lanza; si es uno, lo salta. Hazlos públicos.
- **El `new T()` del doble no compila (`CS0310`):** tu agregado no tiene un constructor público sin parámetros. Dáselo. Sin él, Marten crea el objeto sin correr ningún constructor, y los campos con `= new()` quedan en `null`.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- La plantilla se prueba: los `Apply` van públicos, porque Marten 9 no ve los privados; `ContratoDelDoble` lo vigila. El estado solo lo cambian los `Apply`.
```

> 💭 **Reto:** ¿por qué tu doble no busca los `Apply` privados, si Marten 8 sí los veía? Y: ¿qué atrapa la foto que el contrato no ve?

```bash
git add .
git commit -m "ES · La plantilla se prueba (doble fiel + contrato + foto)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La plantilla se prueba como una librería: un doble que rehidrata con los `Apply` públicos, fijado contra Postgres por un test de contrato, y una foto que fija que solo los `Apply` cambian el estado.

---

[⬅️ Volver: La plantilla](./la-plantilla.md)

[➡️ Siguiente: El README que compila](./el-readme-que-compila.md)
