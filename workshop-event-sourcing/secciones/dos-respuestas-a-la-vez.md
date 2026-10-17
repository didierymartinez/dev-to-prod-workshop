# Dos respuestas a la vez

En la sección pasada las respuestas llegaban una detrás de otra. Ahora vas a hacer que lleguen juntas.

## 🎯 El Objetivo

Que dos respuestas que llegan al mismo tiempo no se pisen: que la suspensión quede efectiva siempre que los dos socios contestaron.

## 💥 El dolor: los dos contestaron, y no quedó efectiva

Cada respuesta tiene su propia cola, y Wolverine procesa las dos en paralelo. Si llegan casi juntas, cada handler rehidrata la empresa **antes** de que el otro guarde. Los dos ven al otro socio `EnCurso`, los dos deciden "todavía falta el otro", y ninguno emite `SuspensionEfectiva`.

En tu máquina esa ventana casi nunca se abre. En producción la abre la carga. Para vivirlo, la vas a abrir tú, sobre una empresa nueva.

### Antes de empezar · una empresa limpia

Si dejaste puesto el 🔨 de [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md), deshazlo: vuelve a poner `MultipleHandlerBehavior.Separated` y quita el `throw` de `AccesosHandler`.

Tu emp-8 arrastra la historia de las secciones anteriores (ya está suspendida). De tu `Program.cs`, quita la siembra y los pasos de la sección pasada, y deja el host, `store` y `bus`. Siembra una empresa nueva después de `await host.StartAsync()`:

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-9", new EmpresaRegistrada("900900900", "Ferretería Norte", "Basico"));
    await s.SaveChangesAsync();
}
```

`StartStream` no escribe la fila del localizador, y tus handlers la leen. Agrégala en `psql` antes de correr:

```sql
INSERT INTO localizador(nit, stream) VALUES ('900900900', 'emp-9');
```

### Abre la ventana

Llegas de [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md) con Accesos tardando 800 ms en contestar. Quítale la pausa, para que conteste enseguida. En `RespuestasHandler`, pon una pausa **entre leer y guardar**, distinta en cada handler: `await Task.Delay(300)` en el de la multa y `await Task.Delay(600)` en el de los accesos. Para ver qué leyó cada uno, imprime el estado del otro socio justo después de rehidratar:

```csharp
Console.WriteLine($"Facturación leyó: Accesos={empresa!.Accesos}");         // en el handler de la multa
Console.WriteLine($"Accesos     leyó: Facturacion={empresa!.Facturacion}");  // en el de los accesos
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

En los proyectos de la organización, la obligación por pagar se protege con un ajuste de Marten que vuelve a comprobar la versión y con reintentos, marcado como solución temporal. Y el orquestador de terceros tiene la misma carrera sin protección. Es el módulo que coordina el registro de un tercero entre varios sistemas: si dos de ellos responden a la vez, uno de los avisos se pierde.

## 🔧 Tres mecanismos, tres alcances

> 🆕 **Contra dos escritores hay tres mecanismos, y ninguno reemplaza a los otros.**
>
> | Mecanismo | Qué protege | Lo conoces de |
> |---|---|---|
> | **Versión esperada** | Un stream que ya existe: el segundo que escribe sobre una versión vieja choca, y reintenta | [Concurrencia optimista](./concurrencia-optimista.md) |
> | **Índice único** | Una creación: dos registros con la misma llave de negocio | [Dos streams, la misma clave](./dos-streams-misma-clave.md) |
> | **Orden por llave** | Evita el choque: todos los mensajes de una misma llave pasan en fila, uno tras otro | nuevo |
>
> Aquí aplican el primero y el tercero.

### Paso 1 · La versión esperada, y reintentar

Tu `Empresa` puede saber en qué versión la leíste: dale una propiedad `public long Version { get; private set; }`. Marten la reconoce por su nombre y la llena al rehidratar con la versión del stream. Con ella, el `Append` detecta si alguien escribió después de tu lectura. Recuerda de [El swap](./el-swap-por-reconocimiento.md) que el número que recibe `Append` es la versión que tendrá el stream **después** de agregar: la leída más los hechos que agregas.

Desde aquí, cada corrida vuelve a suspender emp-9. Borra la siembra: emp-9 ya existe. Y como sigue suspendida, tu `SuspenderHandler` no la vuelve a suspender. Reactívala antes de suspender, con un `Append` directo, como en [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md). Deja este bloque en tu `Program.cs`: cada corrida de aquí en adelante empieza por él.

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
> Para eso: **(1)** Dale `Version` a tu `Empresa`, y súmala a las dos trazas: `leyó v{empresa.Version}`. **(2)** En los dos handlers de `RespuestasHandler`, appendea con la versión esperada: calcúlala con la versión leída y los hechos que agregas. Si `Confirmar…` no devuelve hechos (una reentrega), no appendees: no hay nada que anotar. Los dos handlers anotan igual, así que te sirve un método común para los dos, por ejemplo `Anotar(session, id, empresa, hechos)`. **(3)** Corre: el segundo `Append` choca con `EventStreamUnexpectedMaxEventIdException` y el mensaje cae en dead letters. **(4)** Dile a Wolverine que ese choque se reintenta: al reintentar, el handler vuelve a leer la empresa, ahora con la confirmación del otro, y decide bien. Es configuración, así que se muestra:
>
> ```csharp
> // using Wolverine.ErrorHandling;  using JasperFx.Core;  (para .Milliseconds())
> opts.OnException<EventStreamUnexpectedMaxEventIdException>()
>     .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());   // el que choca vuelve a leer y decide de nuevo
> ```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en tu Empresa: Marten pone aquí la versión del stream al rehidratar
public long Version { get; private set; }
```

```csharp
// Empresas.Historia: las respuestas, ahora con la versión esperada
public static class RespuestasHandler
{
    public static async Task Handle(MultaCobradaV1 msg, IDocumentSession session)
    {
        var id = Localizador.StreamDe(msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
        Console.WriteLine($"Facturación leyó v{empresa!.Version}: Accesos={empresa.Accesos}");
        await Task.Delay(300);   // la ventana, solo para el experimento
        Anotar(session, id, empresa, empresa.ConfirmarCobroDeMulta());
    }

    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)
    {
        var id = Localizador.StreamDe(msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
        Console.WriteLine($"Accesos     leyó v{empresa!.Version}: Facturacion={empresa.Facturacion}");
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
// Empresas.Historia/Program.cs, dentro de AddWolverine
opts.OnException<EventStreamUnexpectedMaxEventIdException>()
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
> Si corriste más veces, tus versiones son otras: lo que cuenta es que los dos leen la misma, y el reintento, la siguiente. Sin la política de reintento, el mismo choque deja a Accesos `EnCurso` y su respuesta en dead letters: el error se ve, pero el proceso queda colgado.

### Paso 2 · El orden por llave

La versión esperada **detecta** el choque y lo repara reintentando. La otra salida es **evitar** que haya choque: que las respuestas de una misma empresa no se procesen nunca a la vez. Las respuestas de empresas distintas sí pueden ir en paralelo; las de una misma empresa, en fila.

Con dos respuestas no sientes el costo de un reintento. Con decenas de mensajes por la misma llave, los reintentos se apilan, y cada choque tira una lectura y una decisión. El orden evita ese trabajo perdido.

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

Los dos. La versión esperada es la **red de seguridad**: protege el stream sin importar por dónde llegue el escritor, porque la comprueba la base. El orden por llave **evita** choques y reintentos cuando muchos mensajes a la misma llave son lo normal, pero solo ordena lo que pasa por su cola. Una respuesta nueva que nadie sumó a la cola `respuestas` se procesa en paralelo con las otras, y la versión esperada la atrapa igual.

Vuelve a poner la versión esperada y la política `OnException`, junto al orden por llave: así llegas al 🔨. Al terminar la sección te quedas con la versión esperada y la política, que son la red. El orden por llave es opcional.

El orden de esta sección es local, dentro de tu proceso. Con varios procesos y un broker, el orden por llave lo da el broker: en Azure Service Bus se llaman **sesiones**, y el `GroupId` de Wolverine es el `SessionId` de la sesión. La librería de la organización ya expone `GroupId` en sus opciones de publicación, y una decisión de arquitectura lo reserva para este caso. Ningún módulo de la obligación por pagar lo usa todavía.

Tu `SuspenderHandler` tiene la misma ventana: lee la empresa y appendea sin versión. Ya sabes cerrarla.

## 🔨 Rómpelo

Partes con los dos mecanismos puestos y con las pausas de `RespuestasHandler`. Accesos contesta enseguida, y cada corrida empieza reactivando emp-9.

**Sin reintento.** Quita el orden por llave y la política `OnException`; deja la versión esperada. El choque ya no es silencioso: la respuesta de Accesos cae en dead letters, y `wolverine_dead_letters` gana una fila. En CosmosLens, Accesos queda `EnCurso` y luego `Vencido`, y en **Correlación** aparece el mensaje muerto con `EventStreamUnexpectedMaxEventIdException`. Detectar sin reparar deja el proceso colgado, a la vista.

**Sin nada.** Quita también la versión esperada: vuelves al dolor, sin un solo error. De los dos fallos, este es el peor, porque nadie se entera.

Cuando termines, quita las pausas y las trazas de `RespuestasHandler`: eran el andamio del experimento. Vuelve a poner la versión esperada y la política `OnException`, que son la red, y sigue con ellas. El orden por llave es opcional.

## El Descubrimiento

Dos mensajes que tocan el mismo stream a la vez deciden sobre el mismo estado viejo, y el resultado es una decisión perdida que no deja rastro. Hay tres mecanismos con alcances distintos. La **versión esperada** detecta el choque en la base y, con un reintento, el perdedor vuelve a leer y decide bien. El **índice único** protege las creaciones. El **orden por llave** evita el choque, poniendo en fila los mensajes de una misma llave, en un proceso o, con un broker, con sesiones. No se elige uno: la versión esperada va siempre, como red; el orden por llave se suma cuando el choque es frecuente. Y el peor fallo es el silencioso.

> 🌱 Hasta aquí, los dos socios siempre cumplen. Pero Facturación a veces no puede cobrar: la empresa tiene un acuerdo de pago, o está en cobro jurídico, y **rechaza** la multa. Para entonces Accesos ya cortó los accesos. ¿Cómo se deshace una suspensión que dos sistemas ya ejecutaron? Lo ves en [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md).

## ✅ Compruébalo

- [ ] Con la ventana abierta y sin protección, los dos socios quedan `Aplicado`, `Efectiva=False` y no hay ningún error. Sabes explicar por qué.
- [ ] Con la versión esperada (`empresa.Version + hechos.Length`) y la política de reintento, la suspensión queda efectiva y no hay dead letters nuevos.
- [ ] Sin la política, el choque deja la respuesta en dead letters y el proceso colgado.
- [ ] Con el orden por llave y sin versión esperada, la suspensión queda efectiva sin choque.
- [ ] Tu código termina con la versión esperada y la política `OnException`, sin pausas ni trazas.
- [ ] Sabes decir qué protege cada uno de los tres mecanismos, y por qué la versión esperada va aunque tengas orden por llave.
- [ ] Sabes qué es una sesión de Azure Service Bus y qué tiene que ver con el `GroupId`.

## 🆘 Si algo salió mal

- **La siembra lanza `ExistingStreamIdCollisionException`:** emp-9 ya existe. Borra la siembra y deja la reactivación del Paso 1.
- **Los dos socios quedan `EnCurso` y hay dos dead letters nuevos con `Parameter 'nit' must have…`:** a emp-9 le falta su fila en el localizador. Agrégala como en *Antes de empezar*.
- **Solo sale `Facturación leyó`, y Accesos queda `EnCurso` con un dead letter nuevo (`el directorio de accesos no responde`):** tu `AccesosHandler` todavía lanza la excepción del 🔨 de [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md). Quítala, para que devuelva `AccesosRevocadosV1`.
- **La suspensión queda efectiva aunque no protegiste nada:** la ventana no se abrió. Revisa que Accesos ya no tenga su pausa de 800 ms y que la pausa de `RespuestasHandler` esté **después** de rehidratar y **antes** del `Append`.
- **Los dos `Append` con versión chocan, incluso el primero:** le pasaste la versión leída. Es la versión que tendrá el stream tras agregar: `empresa.Version + hechos.Length`.
- **`Version` siempre vale 0:** la propiedad debe llamarse `Version` y ser `long` (o `int`).
- **`OnException` o `.Milliseconds()` no compilan:** faltan `using Wolverine.ErrorHandling;` y `using JasperFx.Core;`.
- **`PartitionSlots` no compila:** falta `using Wolverine.Configuration;`.
- **`MultaCobradaV1` no compila en tu `Program.cs` (`CS0246`):** falta `using Contratos;`, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md).
- **El reintento se agota y el mensaje cae en dead letters igual:** son tres reintentos. Si el choque se repite tanto, hay algo más escribiendo ese stream sin parar: búscalo con CosmosLens en el timeline del stream.

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
