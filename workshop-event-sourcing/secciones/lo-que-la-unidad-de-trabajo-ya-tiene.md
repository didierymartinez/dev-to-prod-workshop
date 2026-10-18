# Lo que la unidad de trabajo ya tiene

Tus handlers deciden con la plantilla, y Wolverine confirma al final del mensaje. Hasta ese final, lo que un handler carga o registra vive solo en su unidad de trabajo.

## 🎯 El Objetivo

Que la unidad de trabajo te devuelva lo que ella misma ya cargó o registró en el mensaje, aunque todavía no esté en Postgres. Y que cargar un stream que no existe falle ahí mismo, con su id, en vez de devolver `null`.

## 💥 El dolor: el extracto que paga dos veces

Al final del día, el banco manda un extracto: todos los avisos de pago del día, en un solo mensaje. Su handler usa la plantilla, como tu `SuspenderHandler`, así que su escritura tampoco lleva versión esperada. Para cada aviso hace lo mismo que tu `RegistrarPagoHandler` con un aviso suelto: carga la empresa, revisa la referencia y registra el pago.

```csharp
// Empresas.Historia: el extracto del día, junto a tus comandos y handlers
public record RegistrarExtracto(RegistrarPago[] Avisos);   // los avisos del día, de todas las empresas

public static class RegistrarExtractoHandler
{
    public static async Task Handle(RegistrarExtracto cmd, MartenUnitOfWork uow, ILogger logger)
    {
        foreach (var aviso in cmd.Avisos)   // cada aviso, como uno suelto
        {
            var empresa = await uow.Cargar<Empresa>(aviso.EmpresaId);
            if (empresa.YaRegistro(aviso.Referencia))
            {
                logger.LogWarning("Pago {Referencia} de {EmpresaId} ya registrado: se descarta", aviso.Referencia, aviso.EmpresaId);
                continue;
            }
            empresa.RegistrarPago(aviso.Monto, aviso.Referencia);
        }
    }
}
```

Un día, el banco repite una línea. En `LaPlantillaEnElHandler`, lleva la siembra de tu primer test a un método `NuevaEmpresa()` que devuelva el id, y agrega este test:

```csharp
[Fact]
public async Task Un_aviso_repetido_en_el_extracto_entra_una_vez()
{
    var id = await NuevaEmpresa();
    using var scope = app.Services.CreateScope();
    var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();
    var aviso = new RegistrarPago(id, "BANCO-0044", 50_000);
    await bus.InvokeForTenantAsync("acme", new RegistrarExtracto([aviso, aviso]));   // la misma línea, dos veces

    await using var q = app.Services.GetRequiredService<IDocumentStore>().LightweightSession("acme");
    Assert.Equal(1, (await q.Events.FetchStreamAsync(id)).Count(e => e.EventTypeName == "pago_registrado"));
}
```

```
Assert.Equal() Failure: Values differ
Expected: 1
Actual:   2
```

La guarda de [Llegó dos veces](./llego-dos-veces.md) no frenó el segundo aviso. Cada `Cargar` fue a Postgres y trajo su propia copia de la empresa, sin el pago de la otra. Cada copia decidió sola, y `Volcar` hizo `Append` de las dos.

Lo que el mensaje registra tampoco está en Postgres. En tu `SuspenderHandlerTests`, arma el dado en la unidad de trabajo que le pasas al handler, sin el `StartStream` ni el `SaveChangesAsync`, como un handler que registra una empresa y la suspende en el mismo mensaje:

```csharp
var uow = new MartenUnitOfWork(session);
uow.Registrar(Empresa.Registrar(id, "900555", "Prueba", "Basico"));   // dado: la empresa nace en esta unidad
var salida = await SuspenderHandler.Handle(new SuspenderEmpresa(id, "mora"), uow, plazos, NullLogger.Instance);
```

Cae con `System.NullReferenceException`, en tu `SuspenderHandler`. `Cargar` no encontró la empresa en Postgres y devolvió `null`. Pon `uow.Volcar();` antes del `Handle`: el error es el mismo, porque `FetchLatest` tampoco ve un `StartStream` que la sesión no ha confirmado. Quita el `Volcar`. La librería de la organización tiene este error, y cada equipo lo descubre por su cuenta: crear y releer en la misma unidad de trabajo devuelve `null`.

## 🔧 `Cargar` mira primero lo que ya tiene

### Paso 1 · Lo que la unidad ya rastrea

> 🛠️ **Inténtalo tú.** Quiero esos dos tests en verde, sin cambiarlos. Para eso, al empezar `Cargar`: si la unidad ya rastrea un agregado con ese id, registrado o cargado, devuélvelo, y no lo agregues otra vez a una lista. Para devolverlo como `T`, usa `is T`, como el `is ProcesoRevertido revertido` de tu `Decidir`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// al empezar Cargar, en MartenUnitOfWork: lo registrado o cargado en esta unidad, primero
if (_nuevos.Concat(_modificados).FirstOrDefault(a => a.Id == id) is T ya) return ya;
```

El segundo aviso recibe la misma empresa que el primero, ya con su pago: la guarda lo frena. La empresa que sale de memoria tiene `Version` 0, porque esa la pone Marten al rehidratar.

</details>

### Paso 2 · La puerta

Ahora un aviso para una empresa que no existe. Agrega a `LaPlantillaEnElHandler` un test que mande por el bus este extracto: `var nadie = new RegistrarExtracto([new RegistrarPago("emp-nadie", "BANCO-0044", 50_000)]);`. Cae con `System.NullReferenceException : Object reference not set to an instance of an object.`, en tu `RegistrarExtractoHandler`. El mensaje no dice qué faltaba. Tus handlers nuevos ya no tienen el `?? throw` de antes, porque la firma de `Cargar` promete un `T`. Pero miente, y el compilador lo sabe:

```bash
dotnet build Empresas.Historia --no-incremental 2>&1 | grep CS8603      # en PowerShell: | Select-String CS8603
# …/MartenUnitOfWork.cs(17,16): warning CS8603: Posible tipo de valor devuelto de referencia nulo. […]
```

> 🛠️ **Inténtalo tú.** Quiero que ese test pase así:
>
> ```csharp
> await Assert.ThrowsAsync<AgregadoNoEncontradoException>(() => bus.InvokeForTenantAsync("acme", nadie));
> ```
>
> `Assert.ThrowsAsync` es el `Assert.Throws` de algo que se espera con `await`. **(1)** Declara `AgregadoNoEncontradoException(string id)`, suelta, junto a tus otras excepciones, con un mensaje que diga el id. Un tipo propio deja que quien llama decida sin leer el mensaje: un endpoint puede responder 404 en vez de 500, y este test la distingue de cualquier otra falla. **(2)** En `Cargar`, si el stream no existe, lánzala en vez de devolver `null`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia, suelta, junto a tus otras excepciones
public class AgregadoNoEncontradoException(string id) : Exception($"No existe el stream {id}");
```

```csharp
// en MartenUnitOfWork: lo que ya rastrea, primero; si el stream no existe, falla aquí
public async Task<T> Cargar<T>(string id) where T : AggregateRoot
{
    if (_nuevos.Concat(_modificados).FirstOrDefault(a => a.Id == id) is T ya) return ya;
    var a = await _s.Events.FetchLatest<T>(id) ?? throw new AgregadoNoEncontradoException(id);
    _modificados.Add(a);
    return a;
}
```

```csharp
// en LaPlantillaEnElHandler
[Fact]
public async Task Cargar_un_stream_que_no_existe_falla_con_su_nombre()
{
    using var scope = app.Services.CreateScope();
    var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();
    var nadie = new RegistrarExtracto([new RegistrarPago("emp-nadie", "BANCO-0044", 50_000)]);   // un aviso de una empresa que no existe
    await Assert.ThrowsAsync<AgregadoNoEncontradoException>(() => bus.InvokeForTenantAsync("acme", nadie));
}
```

Tu política de reintento no la toca: solo reintenta el choque de concurrencia y el timeout.

</details>

> 🔍 **¿Lo lograste?** `dotnet test` pasa en verde, y el `grep CS8603` ya no encuentra nada.

## 🔨 Rómpelo: el `!` que calla, y la puerta sin memoria

**El `!` que calla.** En `Cargar`, deja la primera línea y vuelve a cargar sin la puerta. Para callar el aviso, devuelve `a!`:

```csharp
var a = await _s.Events.FetchLatest<T>(id);            // sin la puerta
if (a is not null) _modificados.Add(a);
return a!;                                             // calla el aviso
```

El `grep CS8603` queda vacío, y el test de la puerta cae:

```
Assert.Throws() Failure: Exception type was not an exact match
Expected: typeof(AgregadoNoEncontradoException)
Actual:   typeof(System.NullReferenceException)
```

El `!` no cambió lo que pasa: solo calló al compilador. El README de la librería de la organización enseña ese `!` en su ejemplo, y otro proyecto lo pone en un ayudante que carga y devuelve `agregado!`. Su `NullReferenceException` también revienta en el handler, lejos de la causa.

**La puerta sin memoria.** Vuelve a poner la puerta y quita solo la primera línea. El extracto vuelve a pagar dos veces, y `SuspenderHandlerTests` cae ahora con un nombre: `AgregadoNoEncontradoException : No existe el stream emp-test-…`. Pero esa empresa sí existe, en esta unidad de trabajo. La puerta necesita la memoria de la unidad. Devuelve la línea.

## El Descubrimiento

Una unidad de trabajo que dura el mensaje entero se tiene que ver a sí misma: `Cargar` devuelve lo que ya rastrea antes de ir a Postgres. Es un *identity map*, como el de la sesión de [El host y la inyección](./el-host-y-la-inyeccion.md), ahora para tus agregados. Marten trae uno, el que apagaste en [La plantilla](./la-plantilla.md) con `UseIdentityMapForAggregates`: con él, el snapshot aplica los hechos sobre el objeto que tus verbos ya cambiaron. Encendido tampoco cura el extracto: `Cargar` anotaría dos veces la misma empresa, y `Volcar` haría dos `Append`. El tuyo solo le devuelve a `Cargar` lo que la unidad ya tiene. Y cuando el stream no existe, `Cargar` falla en la puerta, con el id, en vez de dejar un `null` que revienta lejos. Un `?? throw` en cada handler, o un `!` que calla al compilador, dejan la decisión en cada llamada; aquí la toma `Cargar`, una vez. Los handlers que no usan la plantilla, como tu `ProcesoDeSuspensionHandler` y tu `RegistrarPagoHandler`, conservan su `?? throw`.

> 🌱 Tus handlers deciden con la plantilla, pero el `Append` de `Volcar` no lleva versión esperada, y por eso tu `RegistrarPagoHandler` sigue con su sesión. Entre tu `Cargar` y el commit de Wolverine, otro mensaje pudo escribir en el mismo stream, y tu decisión se tomó sobre un estado viejo. Es la deuda de [Concurrencia optimista](./concurrencia-optimista.md). Cerrarla con la herramienta real de Marten es [El capstone: FetchForWriting](./el-capstone-fetchforwriting.md).

## ✅ Compruébalo

- [ ] Un extracto con la misma línea dos veces registra un solo pago: el segundo aviso recibe la misma empresa que el primero.
- [ ] Registrar y cargar en la misma unidad de trabajo devuelve el mismo agregado. Sabes por qué volcar antes no basta.
- [ ] Cargar un stream que no existe lanza `AgregadoNoEncontradoException` con su id, y un test en el host lo fija.
- [ ] Con `a!`, el `CS8603` desaparece y el test de la puerta cae igual: el `!` calla al compilador y no cura nada.
- [ ] Ningún handler que usa la plantilla necesita su propio `?? throw`.

## 🆘 Si algo salió mal

- **El extracto sigue registrando dos pagos:** la primera línea de `Cargar` no encuentra la empresa. Compara por `a.Id == id`, en las dos listas.
- **`SuspenderHandlerTests` cae con `AgregadoNoEncontradoException`:** falta la primera línea de `Cargar`, la que busca entre lo registrado y lo cargado.
- **`CS0246`: no se encontró `AgregadoNoEncontradoException` en el test:** la declaraste dentro de otra clase. Va suelta, como tus otras excepciones.
- **El `grep CS8603` no muestra nada con el `Cargar` de antes:** compiló sin cambios y no volvió a avisar. Usa `--no-incremental`.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- Lo que la unidad de trabajo ya tiene: `Cargar` devuelve lo que la unidad ya registró o cargó, y lanza `AgregadoNoEncontradoException` si el stream no existe. Nunca devuelve `null`, y los handlers que la usan no llevan `?? throw` ni `!`.
```

> 💭 **Reto:** ¿por qué la guarda de [Llegó dos veces](./llego-dos-veces.md) frena un aviso repetido en dos mensajes, y no en un mismo extracto? Y: ¿qué diferencia hay entre callar el aviso con `!` y lanzar `AgregadoNoEncontradoException` en `Cargar`?

```bash
git add .
git commit -m "ES · Lo que la unidad de trabajo ya tiene (Cargar ve lo que ya tiene y falla en la puerta)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La unidad de trabajo de un mensaje se ve a sí misma: `Cargar` devuelve lo que ya cargó o registró antes de ir a Postgres, que no ve lo pendiente, y si el stream no existe falla en la puerta con `AgregadoNoEncontradoException`, en vez de devolver un `null` que un `!` solo esconde.

---

[⬅️ Volver: La plantilla dentro del handler](./la-plantilla-dentro-del-handler.md)

[➡️ Siguiente: El capstone: FetchForWriting](./el-capstone-fetchforwriting.md)
