# Dos respuestas, ningún dueño

Suspender una empresa ya no termina en Empresas. Facturación cobra la multa y, desde hoy, otro sistema le corta los accesos.

## 🎯 El Objetivo

Saber en todo momento si cada sistema al que le pediste algo ya cumplió, y dar la suspensión por hecha solo cuando cumplieron todos.

## 💥 El dolor: "¿ya quedó suspendida?" — nadie sabe

El negocio pide algo nuevo: una empresa suspendida no puede entrar a la plataforma. Los accesos los maneja otro contexto, **Accesos**, con su propio equipo. Escucha el mismo anuncio que Facturación, `EmpresaSuspendidaV2`, y corta los accesos de esa empresa.

Soporte pregunta: *"¿emp-8 ya quedó suspendida de verdad? ¿Ya no puede entrar?"*. Empresas responde `Suspendida = true` desde el primer instante, pero eso solo dice que Empresas **pidió** la suspensión, no si Facturación cobró ni si Accesos cortó. Si Accesos falló, la empresa sigue entrando y nadie se entera, porque nadie le **contesta** a Empresas. Suspender es ya un proceso entre tres sistemas, sin **dueño**: nadie lleva la cuenta de quién cumplió. En la organización pasa con la cuenta por pagar: se avisa a Impuestos y a Contabilidad, y luego nadie sabe en qué va cada uno.

Los dead letters no le contestan a soporte. Viven en la infraestructura de Accesos, otra base y otro equipo en producción, y hablan de un mensaje con una excepción, no de una empresa. Y un socio que solo tarda no deja ningún dead letter.

## 🔧 Que respondan, y que alguien lleve la cuenta

Una suspensión, ahora, es un acto que **espera respuestas**. Cada socio responde cuando termina, con un contrato público. Empresas anota cada respuesta como un hecho en el diario de la empresa, y de esos hechos deriva en qué va cada socio.

### Antes de empezar · el estado de emp-8

Al final de [La réplica suscrita](./la-replica-suscrita.md), emp-8 sigue activa y en Premium, con su `Localizador`: es la empresa de esta sección. De tu `Program.cs`, quita la siembra y los pasos de esa sección, y deja el host, `store` y `bus`. Volver a sembrar emp-8 lanza `ExistingStreamIdCollisionException`.

### Paso 1 · El segundo socio

> 🛠️ **Inténtalo tú.** Crea el proyecto `Accesos` (`classlib`, referencia **solo** `Contratos`, como `Facturacion`). Escribe `AccesosHandler`, un handler `static` de `EmpresaSuspendidaV2` que "corta los accesos": en el taller, una espera de 800 ms, lo que tarda un sistema externo (`await Task.Delay(800)`). Desde `Empresas.Historia`, referencia `Accesos` (es la composición raíz) y regístralo en Wolverine igual que a Facturación: `opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly)`.

La espera también separa las dos respuestas en el tiempo. Accesos no necesita dedup: cortar los accesos dos veces deja lo mismo que cortarlos una, como los efectos naturales de [Llegó dos veces](./llego-dos-veces.md).

> ⚠️ **Dos contextos, dos colas.** Con dos handlers del mismo mensaje en una aplicación, Wolverine los junta por defecto en **una sola cadena**: corren uno tras otro, y si uno falla, lo que el otro devolvió no sale. Facturación y Accesos son contextos distintos y deben fallar cada uno por su cuenta. En producción lo da que son servicios distintos; en tu proceso único, se lo pides a Wolverine con esta línea:
>
> ```csharp
> opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;   // cada handler de un mismo mensaje, en su propia cola
> ```
>
> En el 🔨 vas a ver qué pasa sin ella.

<details>
<summary>👉 Una forma de hacerlo</summary>

```bash
dotnet new classlib -o Accesos
dotnet add Accesos reference Contratos
dotnet add Empresas.Historia reference Accesos      # la composición raíz conoce a todos
```

```csharp
// Accesos/AccesosHandler.cs
using Contratos;

public static class AccesosHandler
{
    public static async Task Handle(EmpresaSuspendidaV2 msg)
    {
        await Task.Delay(800);   // cortar accesos en un sistema externo toma su tiempo
    }
}
```

```csharp
// Empresas.Historia/Program.cs, dentro de AddWolverine
opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);
opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);
opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;   // cada handler de un mismo mensaje, en su propia cola
```

</details>

### Paso 2 · Que cada socio conteste

La respuesta de Facturación lleva también **cuándo** cobró. Esa fecha la pone su sistema de cobro, otro sistema, que la entrega como texto día/mes/año: `"17/10/2026"`. En el contrato viaja como fecha, como pide [El evento público](./el-evento-publico.md), y el texto se lee una sola vez, en el borde de Facturación.

> 🆕 **Idioma de C#: `DateOnly` y leer una fecha con su formato.** `DateOnly` es una fecha sin hora; en el JSON viaja siempre como `"2026-10-17"`. `DateOnly.TryParseExact(texto, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha)` lee un texto exigiendo ese formato y una cultura igual en toda máquina (`using System.Globalization;`), y devuelve `false` si el texto no tiene esa forma. Con `DateOnly.Parse(texto)` a secas, la lectura depende de la cultura de la máquina: `"01/02/2026"` es el 1 de febrero en Colombia y el 2 de enero en un servidor configurado en inglés.

> 🛠️ **Inténtalo tú.** Haz que suspender emp-8 haga salir las dos respuestas:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora"));
> await Task.Delay(2000);
> // en el log de Wolverine:
> // No routes can be determined for Envelope #… (Contratos.MultaCobradaV1)
> // No routes can be determined for Envelope #… (Contratos.AccesosRevocadosV1)
> ```
>
> Responder es publicar: el handler **devuelve** el mensaje, como el `SuspenderHandler` de [El outbox](./el-outbox.md). Para eso: **(1)** Declara en `Contratos` `MultaCobradaV1(Nit, CobradaEl)`, con `CobradaEl` de tipo `DateOnly`, y `AccesosRevocadosV1(Nit)`: planas, con la identidad de negocio y su `[MessageIdentity]`, como los anuncios. **(2)** Haz que `AccesosHandler` devuelva `AccesosRevocadosV1` al terminar. **(3)** Simula el sistema de cobro: dale a `MundoExterno` un `public static string FechaDelCobro = "17/10/2026";`. En `FacturacionHandler`, escribe `public static DateOnly? LeerFecha(string texto)`, que devuelva la fecha, o `null` si `TryParseExact` no la puede leer. **(4)** Al empezar el `Handle`, lee `MundoExterno.FechaDelCobro` con `LeerFecha` y, si sale `null`, lanza con `?? throw` una `FechaNoParseableException` con el texto que llegó: sin una fecha legible, Facturación no cobra. Declárala como tu `ReglaDeNegocioException` de [Decidir el futuro](./decidir-el-futuro.md), una clase con un constructor que recibe el texto. **(5)** Haz que `FacturacionHandler` devuelva `MultaCobradaV1` con esa fecha **siempre**, también en una reentrega. **(6)** Fija el borde en un test de `Empresas.Tests`, `LeerFechaTests`: `LeerFecha` es una función pura, sin reloj ni base. Con la cultura invariante, la de un servidor configurado en inglés, `"01/02/2026"` da el 1 de febrero, y `"ayer"` da `null`.

Aquí nadie espera la respuesta, a diferencia del request/reply de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md): Wolverine la entrega a quien tenga un handler de ese tipo. Contestar también en la reentrega es a propósito: la respuesta sale después de confirmar el dedup y la multa, y si el proceso cae entre las dos cosas, una Facturación que callara en la reentrega no contestaría nunca. Es el dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), ahora en el consumidor; la respuesta repetida la filtra quien la recibe, en el Paso 4.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: las respuestas, contrato público como los anuncios
[MessageIdentity("facturacion.multa-cobrada.v1")]
public record MultaCobradaV1(string Nit, DateOnly CobradaEl);   // la fecha viaja como fecha, no como texto
[MessageIdentity("accesos.accesos-revocados.v1")]
public record AccesosRevocadosV1(string Nit);
```

```csharp
// Accesos/AccesosHandler.cs
using Contratos;

public static class AccesosHandler
{
    public static async Task<AccesosRevocadosV1> Handle(EmpresaSuspendidaV2 msg)
    {
        await Task.Delay(800);
        return new AccesosRevocadosV1(msg.Nit);   // responde: los accesos quedaron cortados
    }
}
```

```csharp
// Facturacion/FacturacionHandler.cs: el mismo handler de El contrato lleva lo justo, ahora lee la fecha y contesta
using System.Globalization;   // CultureInfo, DateTimeStyles (junto a los using que ya tiene)

public static class MundoExterno
{
    public static List<string> Recibidos = new();
    public static string FechaDelCobro = "17/10/2026";   // el sistema de cobro (falso) escribe la fecha como texto: día/mes/año
}

public class FechaNoParseableException(string texto)
    : Exception($"El sistema de cobro mandó una fecha que no se puede leer: «{texto}»");

public static class FacturacionHandler
{
    // … la Tarifa, como antes …

    // el borde: lee el texto con su formato y una cultura fija; null si no lo puede leer
    public static DateOnly? LeerFecha(string texto) =>
        DateOnly.TryParseExact(texto, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha)
            ? fecha
            : null;

    public static MultaCobradaV1 Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
    {
        var cobradaEl = LeerFecha(MundoExterno.FechaDelCobro)
            ?? throw new FechaNoParseableException(MundoExterno.FechaDelCobro);   // sin una fecha legible, no cobra
        // … conexión, transacción, dedup e INSERT en multas, como antes …
        tx.Commit();
        return new MultaCobradaV1(msg.Nit, cobradaEl);   // contesta siempre, también en una reentrega
    }
}
```

```csharp
// Empresas.Tests/LeerFechaTests.cs
using System.Globalization;

public class LeerFechaTests
{
    [Fact]
    public void Lee_dia_mes_anio_en_cualquier_maquina_y_avisa_si_no_puede()
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;   // como un servidor configurado en inglés

        Assert.Equal(new DateOnly(2026, 2, 1), FacturacionHandler.LeerFecha("01/02/2026"));   // 1 de febrero, no 2 de enero
        Assert.Null(FacturacionHandler.LeerFecha("ayer"));                                      // la señal, no la fecha de hoy
    }
}
```

</details>

> 🔍 **¿Lo lograste?** Las dos respuestas salen, pero **nadie las recibe**: todavía no hay handler de `MultaCobradaV1` ni de `AccesosRevocadosV1`. El diario de emp-8 termina en `empresa_suspendida`:
>
> ```sql
> SELECT type FROM mt_events WHERE stream_id = 'emp-8' ORDER BY seq_id;
> -- …
> -- plan_cambiado
> -- empresa_suspendida
> ```
>
> En `type` va el alias de cada hecho, el que fija tu `Hechos.Registrar` desde [El swap](./el-swap-por-reconocimiento.md).

### Paso 3 · Empresas lleva la cuenta

> 🆕 **El estado de cada integración, derivado de hechos.** Por cada socio al que le pides algo, la empresa sabe en qué va: **SinSolicitar** (no se le ha pedido nada), **EnCurso** (se le pidió y no ha contestado) o **Aplicado** (contestó que cumplió). Nadie lo actualiza a mano: `EmpresaSuspendida` deja a los dos socios `EnCurso`, y cada respuesta que Empresas anota como hecho propio pasa a ese socio a `Aplicado`, con el `Apply` de siempre.
>
> Empresas no guarda en su diario el `MultaCobradaV1` que recibe: lo traduce a un hecho suyo, `CobroDeMultaConfirmado`, porque el contrato es de Facturación y puede pasar a `V2`. Es [El evento público](./el-evento-publico.md) al revés. La fecha pasa al hecho como `DateOnly`: llegó ya leída.

> 🆕 **Idioma de C#: `enum`.** `enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }` declara un tipo que solo admite esos tres valores: `EstadoIntegracion.Aplicada` no compila, y el `string` `"Aplicada"` sí. Una propiedad que nadie asignó vale el primero, `SinSolicitar`.

> 🛠️ **Inténtalo tú.** Haz que esto muestre en qué va cada socio de emp-8:
>
> ```csharp
> await using (var s = store.LightweightSession())
> {
>     var e = await s.Events.AggregateStreamAsync<Empresa>("emp-8");
>     Console.WriteLine($"emp-8: Facturacion={e!.Facturacion} Accesos={e.Accesos} Efectiva={e.Efectiva} MultaCobradaEl={e.MultaCobradaEl:yyyy-MM-dd}");
> }
> // emp-8: Facturacion=EnCurso Accesos=EnCurso Efectiva=False MultaCobradaEl=
> ```
>
> `:yyyy-MM-dd` le da formato a la fecha, y una fecha `null` no imprime nada. En `Empresas.Historia`: **(1)** Declara tres hechos internos, `CobroDeMultaConfirmado(CobradaEl)` con la fecha como `DateOnly`, `RevocacionDeAccesosConfirmada()` y `SuspensionEfectiva()`, y el `enum EstadoIntegracion`. Dale a cada hecho su línea en `Hechos.Registrar` y su `Assert` en el test de alias. **(2)** Dale a tu `Empresa` una propiedad `EstadoIntegracion` por socio (`Facturacion`, `Accesos`), un `bool Efectiva` y un `DateOnly? MultaCobradaEl`, `null` mientras Facturación no conteste. **(3)** Dale un `Apply` a cada hecho nuevo. El de `EmpresaSuspendida` deja a los dos socios `EnCurso` y la fecha en `null`; el de `EmpresaReactivada` devuelve los socios a `SinSolicitar`, porque reactivar cierra la suspensión; el de `CobroDeMultaConfirmado` guarda la fecha.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: lo que Empresas anota cuando un socio responde
public record CobroDeMultaConfirmado(DateOnly CobradaEl);
public record RevocacionDeAccesosConfirmada();
public record SuspensionEfectiva();

public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }
```

```csharp
// en tu Hechos.Registrar (y un Assert por hecho en el test de alias), una línea por hecho nuevo
opts.Events.AddEventType<CobroDeMultaConfirmado>();
opts.Events.AddEventType<RevocacionDeAccesosConfirmada>();
opts.Events.AddEventType<SuspensionEfectiva>();
```

```csharp
// en tu Empresa (lo de siempre se queda; esto se añade o cambia)
public EstadoIntegracion Facturacion { get; private set; }
public EstadoIntegracion Accesos { get; private set; }
public bool Efectiva { get; private set; }
public DateOnly? MultaCobradaEl { get; private set; }   // null mientras Facturación no conteste

public void Apply(EmpresaSuspendida e)
{
    Suspendida = true; DeudaPendiente = true;
    Facturacion = EstadoIntegracion.EnCurso; Accesos = EstadoIntegracion.EnCurso; Efectiva = false; MultaCobradaEl = null;
}
public void Apply(EmpresaReactivada e)
{
    Suspendida = false; Reactivaciones++;
    Facturacion = EstadoIntegracion.SinSolicitar; Accesos = EstadoIntegracion.SinSolicitar; Efectiva = false;
}
public void Apply(CobroDeMultaConfirmado e)        { Facturacion = EstadoIntegracion.Aplicado; MultaCobradaEl = e.CobradaEl; }
public void Apply(RevocacionDeAccesosConfirmada e) { Accesos = EstadoIntegracion.Aplicado; }
public void Apply(SuspensionEfectiva e)            { Efectiva = true; }
```

</details>

> 🔍 **¿Lo lograste?** Sale `Facturacion=EnCurso Accesos=EnCurso Efectiva=False MultaCobradaEl=`: los dos socios esperan por el `EmpresaSuspendida` del Paso 2, y sus respuestas se perdieron porque nadie las escuchaba.

### Paso 4 · La empresa decide

La regla vive en la empresa, como en [Decidir el futuro](./decidir-el-futuro.md): la suspensión es **efectiva** cuando los dos socios cumplieron, y decide quien recibe la **última** respuesta. `SuspensionEfectiva` es un hecho porque "quedó efectiva" es algo que pasó, con fecha, y otros reaccionan a él, como CosmosLens en el Paso 5. Una propiedad calculada (`Facturacion == Aplicado && Accesos == Aplicado`) daría el estado, pero no dejaría el hecho en el diario.

> 🆕 **Idioma de C#: `[]` y `[a, b]`.** Decidir ahora da cero, uno o dos hechos, así que el método devuelve un `object[]`. `[]` es un arreglo vacío, y `[a, b]` uno con dos elementos, lo mismo que `new object[] { a, b }`. `session.Events.Append(id, arreglo)` acepta el arreglo, y con uno vacío no escribe nada.

Antes del reto, reactiva emp-8: sigue suspendida desde el Paso 2, y tu `SuspenderHandler` no suspende una empresa suspendida. Registra el pago y la reactivación con un `Append` directo, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md).

```csharp
await using (var s = store.LightweightSession())
{
    s.Events.Append("emp-8", new PagoRegistrado(100_000), new EmpresaReactivada());
    await s.SaveChangesAsync();
}
```

> 🛠️ **Inténtalo tú.** Que esto pase:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-8", "mora"));
> await Task.Delay(2000);
> // emp-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True MultaCobradaEl=2026-10-17
> // diario: … → empresa_suspendida → cobro_de_multa_confirmado → revocacion_de_accesos_confirmada → suspension_efectiva
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea en tu `Empresa` dos métodos, uno por respuesta, que devuelvan `object[]`. `ConfirmarCobroDeMulta(DateOnly cobradaEl)` devuelve `CobroDeMultaConfirmado` con la fecha y, si Accesos ya está `Aplicado`, también `SuspensionEfectiva`. `ConfirmarRevocacionDeAccesos()` hace lo mismo al revés. Si ese socio no estaba `EnCurso`, que devuelvan `[]`: es una reentrega, o una respuesta que nadie pidió. **(2)** Escribe un handler `static` por respuesta: busca el stream con `await Localizador.StreamDe(session, msg.Nit)`, rehidrata la empresa y haz `Append` de lo que devuelva. El de la multa le pasa `msg.CobradaEl`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en tu Empresa: decidir, dada una respuesta, qué hechos ocurren
public object[] ConfirmarCobroDeMulta(DateOnly cobradaEl)
{
    if (Facturacion != EstadoIntegracion.EnCurso) return [];   // reentrega, o nadie lo pidió
    return Accesos == EstadoIntegracion.Aplicado
        ? [new CobroDeMultaConfirmado(cobradaEl), new SuspensionEfectiva()]
        : [new CobroDeMultaConfirmado(cobradaEl)];
}

public object[] ConfirmarRevocacionDeAccesos()
{
    if (Accesos != EstadoIntegracion.EnCurso) return [];
    return Facturacion == EstadoIntegracion.Aplicado
        ? [new RevocacionDeAccesosConfirmada(), new SuspensionEfectiva()]
        : [new RevocacionDeAccesosConfirmada()];
}
```

```csharp
// Empresas.Historia: escucha las respuestas y las anota en el diario de la empresa (using Contratos; using Marten;)
public static class RespuestasHandler
{
    public static async Task Handle(MultaCobradaV1 msg, IDocumentSession session)
    {
        var id = await Localizador.StreamDe(session, msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
            ?? throw new InvalidOperationException($"No existe la empresa {id}");
        session.Events.Append(id, empresa.ConfirmarCobroDeMulta(msg.CobradaEl));
    }

    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)
    {
        var id = await Localizador.StreamDe(session, msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id)
            ?? throw new InvalidOperationException($"No existe la empresa {id}");
        session.Events.Append(id, empresa.ConfirmarRevocacionDeAccesos());
    }
}
```

</details>

> 🔍 **¿Lo lograste?** Manda a mano otra respuesta de Facturación por el bus (tu `Program.cs` ya tiene `using Contratos;`):
>
> ```csharp
> await bus.InvokeAsync(new MultaCobradaV1("900800800", new DateOnly(2026, 10, 17)));
> ```
>
> El diario sigue terminando en `suspension_efectiva`: Facturación ya está `Aplicado`, y `ConfirmarCobroDeMulta` devuelve `[]`.

### Paso 5 · Verlo sin preguntar

Ahora la respuesta a soporte existe: `Efectiva`. Para ver cien suspensiones abiertas sin mirar un stream a la vez está **CosmosLens**, el observador que damos con el taller: lee tu Postgres sin tocarlo. Su panel **Procesos** muestra cada suspensión con un chip por socio, y **Correlación** busca una llave (un NIT, un stream) en tus hechos y en los mensajes de Wolverine. No adivina tu negocio: le **declaras** qué hecho inicia el proceso, cuál lo termina, qué hecho dice que cada socio cumplió y cuánto esperar antes de darlo por vencido.

CosmosLens vive en el repo privado `cosmos-trace` (su API es `CosmosTrace.Api`): pide al facilitador que te invite con tu cuenta de GitHub y acepta la invitación. Clónalo **fuera** del repo del taller, en la carpeta de al lado, para que el `git add .` de tu avance no meta un repo dentro de otro. El tablero es una app web y pide Node LTS (`node -v`).

```bash
# desde la carpeta que contiene tu repo del taller, no desde adentro
git clone --branch taller-es-v1 https://github.com/didierymartinez/cosmos-trace
```

`--branch taller-es-v1` trae la versión de CosmosLens de este taller; el aviso *detached HEAD* es normal. Comprueba que existe `cosmos-trace/src/CosmosTrace.Api/Procesos.cs`. Si no está, o si el tablero no tiene los paneles Procesos y Correlación, tu clon es viejo: bórralo y vuelve a clonar con `--branch taller-es-v1`.

El proceso se declara en `cosmos-trace/src/CosmosTrace.Api/procesos.json`, con esta forma:

```json
{
  "Procesos": [
    {
      "Nombre": "suspension",
      "Titulo": "Suspensión de empresa",
      "Inicia": "<el hecho que la inicia>",
      "Termina": [ "<el hecho que la da por efectiva>" ],
      "Integraciones": [
        { "Nombre": "Facturación", "Aplicado": [ "<el hecho de la multa confirmada>" ], "PlazoSegundos": 30 },
        { "Nombre": "Accesos", "Aplicado": [ "<el hecho de los accesos revocados>" ], "PlazoSegundos": 30 }
      ]
    }
  ]
}
```

La API arranca apuntando a tu Postgres, en el puerto donde el tablero la busca (`http://localhost:5301`), y el tablero, en otra terminal. Fija `CADENA_POSTGRES` también en la terminal de la API, con la cadena de tu servicio. Solo cambia, por sistema, cómo se lee la variable. En bash (macOS/Linux):

```bash
cd cosmos-trace/src/CosmosTrace.Api
dotnet run --no-launch-profile -- --urls http://localhost:5301 --ConnectionStrings:Observed "$CADENA_POSTGRES" --Observed:Schema public
```

En PowerShell (Windows):

```powershell
cd cosmos-trace/src/CosmosTrace.Api
dotnet run --no-launch-profile -- --urls http://localhost:5301 --ConnectionStrings:Observed "$env:CADENA_POSTGRES" --Observed:Schema public
```

```bash
cd cosmos-trace/web
npm install
npm run dev      # imprime la dirección del tablero
```

> 🛠️ **Inténtalo tú.** Llena los cuatro huecos del `procesos.json` con los nombres que Marten guarda en `mt_events.type`. Confírmalos con `SELECT DISTINCT type FROM mt_events`; un `tombstone` no es tuyo, es un relleno de Marten tras una escritura fallida. Arranca la API y el tablero, y abre **Procesos**.

<details>
<summary>👉 Una forma de hacerlo</summary>

```json
{
  "Procesos": [
    {
      "Nombre": "suspension",
      "Titulo": "Suspensión de empresa",
      "Inicia": "empresa_suspendida",
      "Termina": [ "suspension_efectiva" ],
      "Integraciones": [
        { "Nombre": "Facturación", "Aplicado": [ "cobro_de_multa_confirmado" ], "PlazoSegundos": 30 },
        { "Nombre": "Accesos", "Aplicado": [ "revocacion_de_accesos_confirmada" ], "PlazoSegundos": 30 }
      ]
    }
  ]
}
```

</details>

> 🔍 **¿Lo lograste?** En **Procesos**, la suspensión más reciente de emp-8 aparece con `Facturación: Aplicado`, `Accesos: Aplicado` y el estado `Completo`. Las anteriores a las respuestas (las de emp-7 y las dos primeras de emp-8) aparecen como `Vencido`, y tu `Empresa` las lee igual: emp-7 rehidrata con los dos socios `EnCurso`. Cambiar un `Apply` reinterpreta el pasado; en producción se decide desde cuándo aplica la regla.

## 🔨 Rómpelo: un socio que no contesta, y una fecha que no se lee

**Accesos falla.** Haz que `AccesosHandler` lance una excepción antes de responder (`throw new InvalidOperationException("el directorio de accesos no responde")`). Siembra una empresa nueva con `Sembrar(s, "emp-20", "902000000", "Talleres del Llano", "Basico")` y suspéndela. Empresas dice la verdad completa: `Facturacion=Aplicado`, `Accesos=EnCurso`, `Efectiva=False`. En CosmosLens, pasado el plazo, Accesos se pone `Vencido` y el proceso cuenta como **colgado**. En **Correlación**, busca el NIT: el `EmpresaSuspendidaV2` de Accesos aparece como dead-letter (`muerto`), con su excepción y con el nombre que le fijaste, `empresas.empresa-suspendida.v2`. Destrabarlo es trabajo de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md).

**Sin las dos colas.** Quita `MultipleHandlerBehavior.Separated` y repite con `Sembrar(s, "emp-21", "902100000", "Cerámicas Altiplano", "Basico")`. Ahora Facturación también queda `EnCurso`, aunque `multas` tiene la fila. Facturación y Accesos corrían en la misma cadena, en el orden de sus `IncludeAssembly`: Facturación cobró, y la falla de Accesos se llevó su respuesta. Con el orden al revés, ni siquiera cobra. Es peor que el anterior, porque miente: el cobro existe y Empresas cree que no.

Al terminar, vuelve a poner `opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;` y quita el `throw` de `AccesosHandler`: las secciones que siguen cuentan con las dos colas y con Accesos contestando.

**La fecha leída a ciegas.** Cambia el cuerpo de `LeerFecha` por la lectura ingenua: `DateOnly.TryParse(texto, out var f) ? f : DateOnly.FromDateTime(DateTime.Today)`. Lee con la cultura de la máquina y, si no puede, pone la fecha de hoy. Para ver lo que pasa en un servidor configurado de otra forma, pon al inicio de tu `Program.cs` `CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;` (`using System.Globalization;`): la cultura invariante lee mes/día/año.

- Haz que el sistema de cobro mande `MundoExterno.FechaDelCobro = "01/02/2026";`, siembra `Sembrar(s, "emp-22", "902200000", "Lácteos del Sur", "Basico")` y suspéndela. Espera las respuestas y mírala con el código del Paso 3, cambiando el id. Sale `MultaCobradaEl=2026-01-02`, y el cobro fue el 1 de febrero.
- Ahora manda `"ayer"`, con `Sembrar(s, "emp-23", "902300000", "Molinos del Norte", "Basico")`. Sale `MultaCobradaEl` con la fecha de hoy: una fecha que parece real.

Las dos quedan congeladas en `cobro_de_multa_confirmado` (`SELECT stream_id, data FROM mt_events WHERE type = 'cobro_de_multa_confirmado';`), y ningún `Apply` las corrige. Vuelve a tu `LeerFecha` y repite `"ayer"` con `Sembrar(s, "emp-24", "902400000", "Textiles Oriente", "Basico")`: Facturación lanza `FechaNoParseableException` antes de cobrar. Su anuncio queda en dead letters con el texto que llegó (`SELECT message_type, exception_message FROM wolverine_dead_letters;`), `multas` no tiene fila de `902400000`, y Empresas dice `Facturacion=EnCurso`. Es el criterio de `SIN-NIT-LEGADO` de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md), ahora en lo que entra de afuera: lo ilegible se señala, no se rellena.

Con la lectura ingenua, tu `LeerFechaTests` cae en la primera línea; con tu `LeerFecha`, pasa. Al terminar, quita la línea de la cultura de tu `Program.cs` y deja `FechaDelCobro` en `"17/10/2026"`.

## El Descubrimiento

Un acto que depende de otros sistemas termina cuando ellos contestan. Cada socio responde con un contrato público; quien pidió anota cada respuesta como un hecho propio y de ahí deriva el **estado de cada integración**. La regla "hecho cuando todos cumplieron" la decide el agregado, y una respuesta repetida no la mueve. Lo que llega de afuera se lee una vez, en el borde, y lo ilegible se señala, porque una fecha inventada quedaría congelada en un hecho. En la organización, este estado es la pieza que le falta a la obligación por pagar, y el molde ya existe en el estado del cálculo tributario.

> 🌱 Aquí las respuestas llegan una detrás de otra, y nada lo garantiza: cada una tiene su propia cola y se procesa en paralelo. Si llegan casi juntas, cada handler rehidrata la empresa **antes** de que el otro guarde, y la suspensión no queda efectiva aunque los dos contestaron. Abres esa ventana a propósito en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). Y tu `Empresa` ahora guarda el estado de sus socios, que no es suyo, algo que cobra [El proceso tiene dueño](./el-proceso-tiene-dueno.md).

## ✅ Compruébalo

- [ ] `Accesos` es un proyecto que solo referencia `Contratos`, registrado en Wolverine con `IncludeAssembly`.
- [ ] Facturación y Accesos contestan con `MultaCobradaV1` y `AccesosRevocadosV1`, con su `[MessageIdentity]`, devolviéndolas desde su handler. Facturación contesta también en la reentrega, y sabes por qué.
- [ ] Tras suspender, emp-8 queda `Facturacion=Aplicado Accesos=Aplicado Efectiva=True` y su diario termina en `suspension_efectiva`. Una respuesta repetida no agrega hechos.
- [ ] Sabes por qué `SuspensionEfectiva` es un hecho y no una propiedad calculada.
- [ ] CosmosLens muestra la suspensión en **Procesos** con un chip por socio. Con Accesos fallando, ves `Accesos=EnCurso` en la empresa, `Vencido` en CosmosLens y el dead-letter en **Correlación**.
- [ ] Sabes explicar por qué, sin `MultipleHandlerBehavior.Separated`, la falla de Accesos se lleva la respuesta de Facturación.
- [ ] emp-8 muestra `MultaCobradaEl=2026-10-17`: la fecha viaja como `DateOnly`, leída con `TryParseExact`. `LeerFechaTests` pasa en verde y cae con la lectura ingenua.
- [ ] Con la lectura ingenua viste una fecha mal leída (`2026-01-02`) y una inventada (la de hoy) congeladas en `cobro_de_multa_confirmado`. Con tu `LeerFecha`, una fecha ilegible deja `FechaNoParseableException` en dead letters, ninguna multa y `Facturacion=EnCurso`.

## 🆘 Si algo salió mal

- **`No routes can be determined` en el log al suspender, desde el Paso 4:** te falta el handler de esa respuesta en `RespuestasHandler`.
- **Suspender emp-8 no hace nada (ni hecho nuevo ni respuestas):** emp-8 ya estaba suspendida. Reactívala con el `Append` del Paso 4.
- **Facturación no contesta, y su log dice `FechaNoParseableException`:** `MundoExterno.FechaDelCobro` no tiene la forma `dd/MM/yyyy`. Déjalo en `"17/10/2026"`.
- **`MultaCobradaEl` sale vacío con Facturación en `Aplicado`:** el `Apply(CobroDeMultaConfirmado)` no guarda la fecha, o el handler de la respuesta no le pasa `msg.CobradaEl` a `ConfirmarCobroDeMulta`.
- **`Efectiva` nunca llega a `True` aunque los dos contestaron:** revisa que cada `Confirmar…` mire el estado **del otro** socio. Si pasa solo de vez en cuando, es la carrera de la 🌱.
- **`git clone` dice `Repository not found` o pide usuario y contraseña:** aún no tienes acceso a `cosmos-trace`. Acepta la invitación que te llegó por correo o en GitHub, o pídela al facilitador.
- **CosmosLens no muestra procesos:** el archivo debe llamarse `procesos.json` y estar en `src/CosmosTrace.Api/`, y los nombres de `Inicia` y `Aplicado` deben ser los de `mt_events.type`, no los de tus clases.
- **El tablero dice `No conecta a la API`:** la API no corre en `http://localhost:5301`. Arráncala con `--urls http://localhost:5301`.
- **El tablero dice `La API responde, pero: Value cannot be null. (Parameter 'Host')`:** la terminal de la API no tiene `CADENA_POSTGRES`. Fija la variable ahí y vuelve a arrancar la API.
- **El tablero dice `La API responde, pero: sin conexión a Postgres`:** falla tu cadena: `password authentication failed` señala la contraseña, y `does not exist`, el nombre de la base. `CADENA_POSTGRES` debe valer lo mismo en las dos terminales.
- **El tablero dice `Conecta, pero no hay nada que observar` (junto a Filtrar sale `—` y no `Marten`):** pasa en `--Observed:Schema` el esquema de Marten (`public` si no le pusiste otro con `opts.DatabaseSchemaName`). Si es el correcto, tu cadena apunta a otra base: el aviso dice a cuál (`host:puerto/base`).

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué acto depende de que otro sistema conteste? Escribe los estados de cada integración y la regla que dice cuándo el acto está hecho, y explica por qué `Suspendida = true` no bastaba para contestarle a soporte.

```bash
git add .
git commit -m "ES · Dos respuestas, ningún dueño (estado por integración)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un acto que depende de otros sistemas termina cuando ellos contestan: cada socio responde con un contrato público, quien pidió anota cada respuesta como un hecho propio y de ahí deriva el estado de cada integración, y el agregado decide cuándo cumplieron todos; lo que llega de afuera como texto se lee una vez, en el borde, con formato y cultura fijos, y lo ilegible se señala en vez de rellenarse.

---

[⬅️ Volver: La réplica suscrita](./la-replica-suscrita.md)

[➡️ Siguiente: Dos respuestas a la vez](./dos-respuestas-a-la-vez.md)
