# Dos respuestas a la vez

En la sección pasada las respuestas llegaban una detrás de otra. Ahora vas a hacer que lleguen juntas.

## 🎯 El Objetivo

Que dos respuestas que llegan al mismo tiempo no se pisen: que la suspensión quede efectiva siempre que los dos socios contestaron.

## 💥 El dolor: los dos contestaron, y no quedó efectiva

Cada respuesta tiene su propia cola, y Wolverine procesa las dos en paralelo. Si llegan casi juntas, cada handler rehidrata la empresa **antes** de que el otro guarde. Los dos ven al otro socio `EnCurso`, los dos deciden "todavía falta el otro", y ninguno emite `SuspensionEfectiva`. En tu máquina esa ventana casi nunca se abre; en producción la abre la carga. Para vivirlo, la vas a abrir tú, sobre una empresa nueva.

### Antes de empezar · una empresa limpia

Si dejaste puesto el 🔨 de [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md), deshazlo: vuelve a poner `MultipleHandlerBehavior.Separated`, quita el `throw` de `AccesosHandler`, deja tu `LeerFecha` con `TryParseExact` y `FechaDelCobro` en `"17/10/2026"`, y quita de tu `Program.cs` la línea de la cultura.

Tu emp-8 ya está suspendida. De tu `Program.cs`, quita la siembra y los pasos de la sección pasada, y deja el host, `store` y `bus`. Siembra una empresa nueva después de `await host.StartAsync()`, con tu `Sembrar`, porque tus handlers leen su localizador.

```csharp
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-9", "900900900", "Ferretería Norte", "Basico");
    await s.SaveChangesAsync();
}
```

### Abre la ventana

Quítale a Accesos su pausa de 800 ms, para que conteste enseguida. En `RespuestasHandler`, pon una pausa **entre leer y guardar**, distinta en cada handler: `await Task.Delay(300)` en el de la multa y `await Task.Delay(600)` en el de los accesos. Los dos handlers ya fallan en la puerta si la empresa no existe, con el `?? throw` que usas desde [El outbox](./el-outbox.md).

```csharp
var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
    ?? throw new InvalidOperationException($"No existe la empresa {id}");
```

Para ver qué leyó cada uno, imprime el estado del otro socio justo después de rehidratar:

```csharp
Console.WriteLine($"Facturación leyó: Accesos={empresa.Accesos}");         // en el handler de la multa
Console.WriteLine($"Accesos     leyó: Facturacion={empresa.Facturacion}");  // en el de los accesos
```

Después de la siembra, suspende emp-9 y mira en qué quedó:

```csharp
await bus.InvokeAsync(new SuspenderEmpresa("emp-9", "mora"));
await Task.Delay(2000);
await using (var s = store.LightweightSession())
{
    var e = await s.Events.AggregateStreamAsync<Empresa>("emp-9");
    Console.WriteLine($"emp-9: Facturacion={e!.Facturacion} Accesos={e.Accesos} Efectiva={e.Efectiva}");
}
// Accesos     leyó: Facturacion=EnCurso
// Facturación leyó: Accesos=EnCurso
// emp-9: Facturacion=Aplicado Accesos=Aplicado Efectiva=False
```

Las dos líneas `leyó` pueden salir en el otro orden. Míralo en Postgres:

```sql
SELECT version, type FROM mt_events WHERE stream_id = 'emp-9' ORDER BY version;
-- 1 | empresa_registrada
-- 2 | empresa_suspendida
-- 3 | cobro_de_multa_confirmado
-- 4 | revocacion_de_accesos_confirmada

SELECT count(*) FROM wolverine_dead_letters;
-- las mismas filas que antes de suspender: ninguna nueva
```

Los dos socios cumplieron, las dos respuestas quedaron anotadas, y la suspensión nunca será efectiva. No hubo un solo error: cada handler decidió bien, pero sobre una empresa vieja. Marten aceptó el segundo `Append` sin mirar nada, porque por defecto agrega sin comprobar la versión.

En la organización, la obligación por pagar se protege con reintentos y con `EventAppendMode.Rich`, marcado como solución temporal. `EventAppendMode` elige cómo agrega Marten: `Rich`, `Quick` o `QuickWithServerTimestamps`, el de por defecto. `Rich` no cierra esta carrera: con él, el segundo `Append` también entra sin error. El orquestador de terceros, que coordina el registro de un tercero entre varios sistemas, tiene la misma carrera sin protección, y pierde uno de los avisos.

## 🔧 Tres mecanismos, tres alcances

> 🆕 **Contra dos escritores hay tres mecanismos, y ninguno reemplaza a los otros. Un cuarto parece protección y no lo es.**
>
> | Mecanismo | Qué protege | Lo conoces de |
> |---|---|---|
> | **Versión esperada** | Un stream que ya existe: el segundo que escribe sobre una versión vieja choca, y reintenta | [Concurrencia optimista](./concurrencia-optimista.md) |
> | **Índice único** | Una creación: dos registros con la misma llave de negocio | [Dos streams, la misma clave](./dos-streams-misma-clave.md) |
> | **Orden por llave** | Evita el choque: todos los mensajes de una misma llave pasan en fila, uno tras otro | nuevo |
> | **Lock externo con tiempo de vida (TTL)**: un candado fuera de la base que se suelta solo al vencer | No protege: si vence antes de que el handler guarde, otro handler entra y lee la empresa vieja. La versión esperada sí atrapa ese choque | nuevo |
>
> Aquí aplican el primero y el tercero. El cuarto lo pruebas en el 🔨.

### Paso 1 · La versión esperada, y reintentar

Tu `Empresa` ya tiene su `Version` desde [La réplica suscrita](./la-replica-suscrita.md): Marten la llena al rehidratar con la versión del stream. Con ella, el `Append` detecta si alguien escribió después de tu lectura. El número que recibe `Append`, como en [El swap](./el-swap-por-reconocimiento.md), es la versión que tendrá el stream **después** de agregar: la leída más los hechos que agregas.

Desde aquí, cada corrida vuelve a suspender emp-9. Borra la siembra, porque emp-9 ya existe, y como sigue suspendida, reactívala antes de suspender. Deja este bloque en tu `Program.cs`: cada corrida de aquí en adelante empieza por él.

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-9", new PagoRegistrado(50_000), new EmpresaReactivada());
    await s.SaveChangesAsync();
}
```

> 🛠️ **Inténtalo tú.** Con las pausas puestas, haz que la suspensión quede efectiva:
>
> ```
> Accesos     leyó v11: Facturacion=EnCurso
> Facturación leyó v11: Accesos=EnCurso
> Accesos     leyó v12: Facturacion=Aplicado      ← el reintento, sobre la empresa nueva
> emp-9: Facturacion=Aplicado Accesos=Aplicado Efectiva=True
> ```
>
> Para eso: **(1)** Suma tu `Version` a las dos trazas: `leyó v{empresa.Version}`. **(2)** En los dos handlers de `RespuestasHandler`, appendea con la versión esperada, calculada con la versión leída y los hechos que agregas. Si `Confirmar…` no devuelve hechos (una reentrega), no appendees. Los dos handlers anotan igual, así que te sirve un método común, por ejemplo `Anotar(session, id, empresa, hechos)`. **(3)** Corre: el segundo `Append` choca con `EventStreamUnexpectedMaxEventIdException` y el mensaje cae en dead letters. **(4)** Dile a Wolverine que ese choque se reintenta: al reintentar, el handler vuelve a leer la empresa, ahora con la confirmación del otro, y decide bien. Con una versión esperada fija en el comando, cada reintento chocaría igual. Es configuración, así que se muestra:
>
> ```csharp
> // using Wolverine.ErrorHandling;  (OnException)   using JasperFx.Core;  (.Milliseconds())
> opts.OnException<JasperFx.ConcurrencyException>()   // la clase base del choque
>     .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());   // el que choca vuelve a leer y decide de nuevo
> ```
>
> La política va sobre la clase base, no sobre el tipo que viste en el log: `EventStreamUnexpectedMaxEventIdException` hereda de `JasperFx.ConcurrencyException`, y `OnException` atrapa también a las clases que heredan del tipo que le das. Así sigue en pie si el choque llega con otro nombre, desde otra versión de Marten o desde una saga de Wolverine. En Marten 9.50.3, los tres modos de `EventAppendMode` lanzan el mismo tipo.
>
> Escribe el nombre completo, `JasperFx.ConcurrencyException`. Con el nombre corto, C# elige el `ConcurrencyException` que escribiste en [Concurrencia optimista](./concurrencia-optimista.md), aunque agregues `using JasperFx;`, y la política nunca atrapa el choque de Marten.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: las respuestas, ahora con la versión esperada
public static class RespuestasHandler
{
    public static async Task Handle(MultaCobradaV1 msg, IDocumentSession session)
    {
        var id = await Localizador.StreamDe(session, msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
            ?? throw new InvalidOperationException($"No existe la empresa {id}");
        Console.WriteLine($"Facturación leyó v{empresa.Version}: Accesos={empresa.Accesos}");
        await Task.Delay(300);   // la ventana, solo para el experimento
        Anotar(session, id, empresa, empresa.ConfirmarCobroDeMulta(msg.CobradaEl));
    }

    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)
    {
        var id = await Localizador.StreamDe(session, msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
            ?? throw new InvalidOperationException($"No existe la empresa {id}");
        Console.WriteLine($"Accesos     leyó v{empresa.Version}: Facturacion={empresa.Facturacion}");
        await Task.Delay(600);   // la ventana, solo para el experimento
        Anotar(session, id, empresa, empresa.ConfirmarRevocacionDeAccesos());
    }

    // los dos handlers anotan igual: con la versión esperada
    static void Anotar(IDocumentSession session, string id, Empresa empresa, object[] hechos)
    {
        if (hechos.Length == 0) return;                                        // reentrega: nada que anotar
        session.Events.Append(id, empresa.Version + hechos.Length, hechos);    // la versión que tendrá tras el append
    }
}
```

```csharp
// Empresas.Historia/Program.cs, dentro de AddWolverine (arriba: using Wolverine.ErrorHandling;  using JasperFx.Core;)
opts.OnException<JasperFx.ConcurrencyException>()   // con el nombre completo: el corto es tu ConcurrencyException
    .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());
```

</details>

> 🔍 **¿Lo lograste?** En el log, el intento que choca sale como `fail:`; lo que cuenta es que el reintento entra. El diario termina en `suspension_efectiva`, y `wolverine_dead_letters` no tiene filas nuevas:
>
> ```sql
> SELECT version, type FROM mt_events WHERE stream_id = 'emp-9' ORDER BY version;
> -- …
> -- 11 | empresa_suspendida
> -- 12 | cobro_de_multa_confirmado
> -- 13 | revocacion_de_accesos_confirmada
> -- 14 | suspension_efectiva
> ```
>
> Si corriste más veces, tus versiones son otras: lo que cuenta es que los dos leen la misma, y el reintento, la siguiente.

### Paso 2 · El orden por llave

La versión esperada **detecta** el choque y lo repara reintentando. La otra salida es **evitarlo**: que las respuestas de una misma empresa nunca se procesen a la vez, y las de empresas distintas sí. Con decenas de mensajes por la misma llave, los reintentos se apilan, y cada choque tira una lectura y una decisión.

> 🆕 **Partir por llave.** Wolverine puede asignarle a cada mensaje un grupo (su `GroupId`), calculado desde el mensaje, y procesar en serie los de un mismo grupo. Aquí el grupo es el NIT. Las dos respuestas van a una misma cola local, repartida en carriles: cada NIT cae siempre en el mismo carril, y un carril procesa un mensaje a la vez. Se muestra porque es configuración.

> 🛠️ **Inténtalo tú.** Quita la versión esperada (vuelve al `Append` sin versión) y la política de reintento, deja las pausas, y haz que la suspensión quede efectiva **sin** choque ni reintento:
>
> ```
> Facturación leyó v17: Accesos=EnCurso
> Accesos     leyó v18: Facturacion=Aplicado      ← esperó su turno
> emp-9: Facturacion=Aplicado Accesos=Aplicado Efectiva=True
> ```
>
> Para eso, agrega a la configuración de Wolverine:
>
> ```csharp
> // using Wolverine.Configuration;  (PartitionSlots)
> // using Contratos;  (las respuestas: tu Program.cs ya lo tiene)
> opts.MessagePartitioning
>     .ByMessage<MultaCobradaV1>(m => m.Nit)          // el grupo de cada respuesta es su NIT
>     .ByMessage<AccesosRevocadosV1>(m => m.Nit);
> opts.PublishMessage<MultaCobradaV1>().ToLocalQueue("respuestas");
> opts.PublishMessage<AccesosRevocadosV1>().ToLocalQueue("respuestas");
> opts.LocalQueue("respuestas").PartitionProcessingByGroupId(PartitionSlots.Three);   // tres carriles; un NIT, siempre el mismo carril
> ```

> 🔍 **¿Lo lograste?** La segunda respuesta lee la empresa ya en `v18`, con la primera anotada: no hubo choque que reparar. Cuál de las dos va primero puede variar.

## ¿Cuál de los dos?

Los dos. La versión esperada es la **red de seguridad**: la comprueba la base, venga de donde venga el escritor. El orden por llave **evita** choques y reintentos cuando muchos mensajes a la misma llave son lo normal, pero solo ordena lo que pasa por su cola: una respuesta nueva que nadie sumó a la cola `respuestas` corre en paralelo con las otras, y la atrapa la versión esperada.

Vuelve a poner la versión esperada y la política `OnException`, junto al orden por llave: así llegas al 🔨.

Este orden es local, dentro de tu proceso. Con varios procesos y un broker, el orden por llave lo da el broker: en Azure Service Bus se llaman **sesiones**, y el `GroupId` de Wolverine es el `SessionId` de la sesión. La librería de la organización ya expone `GroupId` en sus opciones de publicación, pero ningún módulo de la obligación por pagar lo usa todavía.

Tu `SuspenderHandler` tiene la misma ventana: lee la empresa y appendea sin versión. Ya sabes cerrarla.

## 🔨 Rómpelo

Partes con los dos mecanismos puestos y con las pausas de `RespuestasHandler`. Accesos contesta enseguida, y cada corrida empieza reactivando emp-9.

**Un lock que vence.** Quita el orden por llave y pon en su lugar un lock con tiempo de vida. Es lo que hace el asistente de la organización con cada turno de la conversación: un lock en Redis que vence a los 5 segundos, aunque algunos turnos tardan más. Este lo imita en memoria y es andamio del experimento, así que se muestra.

> 🆕 **Idioma de C#: `SemaphoreSlim`.** Reparte pases: `new(1, 1)` tiene uno solo, así que deja pasar a uno a la vez. `WaitAsync()` espera a que el pase esté libre y lo toma; `Release()` lo devuelve. `Task.Delay(vida).ContinueWith(...)` deja programado el `Release()` para cuando pase la vida, y el `_ =` descarta esa tarea, porque nadie la espera.

```csharp
// Empresas.Historia: solo para el 🔨. Imita un lock externo que se suelta solo al vencer.
public static class Candado
{
    static readonly SemaphoreSlim _uno = new(1, 1);   // un solo pase: un handler a la vez

    public static async Task Tomar(TimeSpan vida)
    {
        await _uno.WaitAsync();                                   // espera a que esté libre, y lo toma
        _ = Task.Delay(vida).ContinueWith(_ => _uno.Release());   // al pasar la vida, lo suelta solo
    }
}
```

En los dos handlers, toma el lock en la primera línea, con una vida más corta que las pausas: `await Candado.Tomar(TimeSpan.FromMilliseconds(200));`. Corre: las dos trazas `leyó` muestran la misma versión, porque el lock venció durante la pausa del primero y dejó entrar al segundo. La versión esperada atrapa el choque igual: un `fail:` en el log, el reintento lee la versión siguiente, y la suspensión queda efectiva. Al terminar, quita el lock.

**Sin reintento.** Quita también la política `OnException`; deja la versión esperada. La respuesta de Accesos cae en dead letters, y `wolverine_dead_letters` gana una fila. En CosmosLens, Accesos queda `EnCurso` y luego `Vencido`, y en **Correlación** aparece el mensaje muerto con `EventStreamUnexpectedMaxEventIdException`. Detectar sin reparar deja el proceso colgado, a la vista.

**Sin nada.** Quita también la versión esperada: vuelves al dolor, sin un solo error. Es el peor de los fallos, porque nadie se entera.

Cuando termines, quita las pausas y las trazas de `RespuestasHandler`. Vuelve a poner la versión esperada y la política `OnException`, que son la red, y sigue con ellas; el orden por llave es opcional.

## El Descubrimiento

Dos mensajes que tocan el mismo stream a la vez deciden sobre el mismo estado viejo, y una decisión se pierde sin dejar rastro. La **versión esperada** detecta el choque en la base, y con un reintento declarado sobre `JasperFx.ConcurrencyException` el perdedor vuelve a leer y decide bien. El **índice único** protege las creaciones. El **orden por llave** evita el choque poniendo en fila los mensajes de una llave; con un broker, con sesiones. Un **lock con tiempo de vida** no protege, porque puede vencer antes de que el handler guarde. La versión esperada va siempre, como red, y el orden por llave se suma cuando el choque es frecuente.

> 🌱 Hasta aquí, los dos socios siempre cumplen. Pero Facturación a veces no puede cobrar: la empresa tiene un acuerdo de pago, o está en cobro jurídico, y **rechaza** la multa. Para entonces Accesos ya cortó los accesos. ¿Cómo se deshace una suspensión que dos sistemas ya ejecutaron? Lo ves en [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md).

## ✅ Compruébalo

- [ ] Con la ventana abierta y sin protección, los dos socios quedan `Aplicado`, `Efectiva=False` y no hay ningún error. Sabes explicar por qué.
- [ ] Con la versión esperada (`empresa.Version + hechos.Length`) y la política de reintento, la suspensión queda efectiva y no hay dead letters nuevos. Sin la política, el choque deja la respuesta en dead letters y el proceso colgado.
- [ ] Con el orden por llave y sin versión esperada, la suspensión queda efectiva sin choque.
- [ ] Con un lock que vence antes de la pausa, las dos respuestas leen la misma versión, y la versión esperada atrapa el choque igual.
- [ ] Tu código termina con la versión esperada y la política `OnException<JasperFx.ConcurrencyException>`, sin pausas, trazas ni lock. Sabes por qué la política va sobre la clase base y con el nombre completo, y por qué reintentar solo sirve si el handler vuelve a leer.
- [ ] Sabes decir qué protege cada mecanismo, por qué la versión esperada va aunque tengas orden por llave, y qué tiene que ver una sesión de Azure Service Bus con el `GroupId`.

## 🆘 Si algo salió mal

- **La siembra lanza `ExistingStreamIdCollisionException`:** emp-9 ya existe. Borra la siembra y deja la reactivación del Paso 1.
- **Los dos socios quedan `EnCurso` y hay dos dead letters nuevos con `El NIT 900900900 no está en el localizador`:** sembraste emp-9 con un `StartStream` suelto, sin `Sembrar`. Dale su documento una vez: en una sesión, `s.Insert(new Localizador { Id = "900900900", Stream = "emp-9" })` y `SaveChangesAsync`.
- **La suspensión queda efectiva aunque no protegiste nada:** la ventana no se abrió. Revisa que Accesos ya no tenga su pausa de 800 ms y que la pausa de `RespuestasHandler` esté **después** de rehidratar y **antes** del `Append`.
- **Los dos `Append` con versión chocan, incluso el primero:** le pasaste la versión leída. Es la que tendrá el stream tras agregar: `empresa.Version + hechos.Length`.
- **`Version` siempre vale 0:** la propiedad debe llamarse `Version` y ser `long` (o `int`).
- **`OnException`, `.Milliseconds()`, `PartitionSlots` o `MultaCobradaV1` no compilan:** faltan, según el caso, `using Wolverine.ErrorHandling;`, `using JasperFx.Core;`, `using Wolverine.Configuration;` o `using Contratos;`.
- **Con el lock, las dos trazas leen versiones distintas y no hay choque:** la vida del lock es más larga que lo que tarda el primer handler. Usa 200 ms, menos que la pausa más corta.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué stream recibe escrituras de dos lados a la vez? Di cuál de los tres mecanismos lo protege hoy, y qué pasaría si dos escrituras llegaran juntas mañana.

```bash
git add .
git commit -m "ES · Dos respuestas a la vez (versión esperada + orden por llave)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Dos respuestas que tocan el mismo stream a la vez deciden sobre un estado viejo y pierden una decisión sin error; la versión esperada detecta el choque y un reintento lo repara, el orden por llave lo evita poniendo en fila los mensajes de una misma llave (sesiones, con un broker), y la versión esperada va siempre, como red.

---

[⬅️ Volver: Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md)

[➡️ Siguiente: Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md)
