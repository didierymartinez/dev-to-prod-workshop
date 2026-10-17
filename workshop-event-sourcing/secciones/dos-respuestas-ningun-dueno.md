# Dos respuestas, ningún dueño

Suspender una empresa ya no termina en Empresas. Facturación cobra la multa y, desde hoy, otro sistema le corta los accesos.

## 🎯 El Objetivo

Saber en todo momento si cada sistema al que le pediste algo ya cumplió, y dar la suspensión por hecha solo cuando cumplieron todos.

## 💥 El dolor: "¿ya quedó suspendida?" — nadie sabe

El negocio pide algo nuevo: una empresa suspendida no puede entrar a la plataforma. Los accesos los maneja otro contexto, **Accesos**, con su propio equipo y su propio ritmo. Escucha el mismo anuncio que Facturación, `EmpresaSuspendidaV2`, y corta los accesos de esa empresa.

Ahora alguien de soporte pregunta: *"¿emp-8 ya quedó suspendida de verdad? ¿Ya no puede entrar?"*. Empresas responde `Suspendida = true` desde el primer instante, porque así lo dice su diario. Pero eso solo cuenta que Empresas **pidió** la suspensión. No dice si Facturación cobró ni si Accesos cortó. Si Accesos falló, Empresas sigue diciendo "suspendida" y la empresa sigue entrando. Nadie se entera, porque nadie le **contesta** a Empresas.

Suspender ya es un proceso entre tres sistemas, y ese proceso no tiene **dueño**: nadie lleva la cuenta de quién cumplió.

¿No basta mirar los dead-letters? Si Accesos falla, su mensaje queda apartado, pero eso no le contesta a soporte. El dead-letter vive en la infraestructura de Accesos, que en producción es otra base y otro equipo. No habla por empresa ni en el lenguaje del negocio: es un mensaje con una excepción. Y no distingue "todavía no contesta" de "falló": un socio lento no deja ninguno.

Es exactamente la conversación de los proyectos de la organización: una obligación se causa (se registra una cuenta por pagar), se avisa a Impuestos y a Contabilidad, y luego nadie sabe en qué va cada uno.

## 🔧 Que respondan, y que alguien lleve la cuenta

Una suspensión, ahora, es un acto que **espera respuestas**. Cada socio responde cuando termina, con un contrato público. Empresas anota cada respuesta como un hecho en el diario de la empresa, y de esos hechos deriva en qué va cada socio.

### Antes de empezar · el estado de emp-8

Al final de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), emp-8 quedó activa y en Premium, con su fila en el localizador: es la empresa de esta sección. De tu `Program.cs`, quita la siembra y los pasos de esa sección, y deja el host, `store` y `bus`. Volver a sembrar emp-8 lanza `ExistingStreamIdCollisionException`.

### Paso 1 · El segundo socio

> 🛠️ **Inténtalo tú.** Crea el proyecto `Accesos` (`classlib`, referencia **solo** `Contratos`, como `Facturacion`). Escribe `AccesosHandler`, un handler `static` de `EmpresaSuspendidaV2` que "corta los accesos". Para el taller basta una espera de 800 ms, porque cortar accesos en un sistema externo toma su tiempo: `await Task.Delay(800)`. Desde `Empresas.Historia`, referencia `Accesos` (es la composición raíz) y regístralo en Wolverine igual que a Facturación: `opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly)`.

Los 800 ms también separan las dos respuestas en el tiempo; en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) los quitas a propósito. Accesos no necesita dedup: cortar los accesos dos veces deja lo mismo que cortarlos una, como los efectos naturales de [Llegó dos veces](./llego-dos-veces.md).

> ⚠️ **Dos contextos, dos colas.** Con dos handlers del mismo mensaje en una misma aplicación, Wolverine los junta por defecto en **una sola cadena**: corren uno tras otro, como si fueran un solo handler. Si uno falla, falla todo, y lo que el otro devolvió no sale. Facturación y Accesos son contextos distintos: cada uno debe recibir su copia y fallar por su cuenta. En producción eso lo da que cada uno es otro servicio. En tu proceso único, se lo pides a Wolverine con esta línea:
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
> Responder es lo mismo que publicar: el handler **devuelve** el mensaje, como el `SuspenderHandler` de [El outbox](./el-outbox.md). Para eso: **(1)** Declara en `Contratos` las dos respuestas: `MultaCobradaV1(Nit)` y `AccesosRevocadosV1(Nit)`, planas y con la identidad de negocio, como los anuncios. Cada contexto declara ahí sus contratos públicos (en producción, cada uno publicaría su paquete). **(2)** Haz que `AccesosHandler` devuelva `AccesosRevocadosV1` al terminar. **(3)** Haz que `FacturacionHandler` devuelva `MultaCobradaV1` **siempre**, también cuando el dedup dice que es una reentrega.

Esto no es el request/reply de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md): aquí nadie espera. Facturación publica su respuesta, y Wolverine la entrega a quien tenga un handler de ese tipo.

Contestar también en la reentrega es a propósito: nada garantiza que la primera respuesta saliera. El dedup y la multa se confirman en la transacción de Facturación, y la respuesta sale después, por Wolverine. Si el proceso cae entre las dos cosas, la reentrega encuentra el id procesado, y una Facturación que callara no contestaría nunca. Es el dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), ahora en el consumidor. La respuesta repetida la filtra quien la recibe, en el Paso 4.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: las respuestas, contrato público como los anuncios
public record MultaCobradaV1(string Nit);
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
// Facturacion/FacturacionHandler.cs: el mismo handler de El contrato lleva lo justo, ahora contesta
public static MultaCobradaV1 Handle(EmpresaSuspendidaV2 msg, Envelope envelope)
{
    // … conexión, transacción, dedup e INSERT en multas, como antes …
    tx.Commit();
    return new MultaCobradaV1(msg.Nit);   // contesta siempre, también en una reentrega
}
```

</details>

> 🔍 **¿Lo lograste?** Las dos respuestas salen, pero **nadie las recibe**: todavía no hay handler de `MultaCobradaV1` ni de `AccesosRevocadosV1`. El diario de emp-8 termina en `empresa_suspendida`. Míralo en Postgres:
>
> ```sql
> SELECT type FROM mt_events WHERE stream_id = 'emp-8' ORDER BY seq_id;
> -- …
> -- plan_cambiado
> -- empresa_suspendida
> ```
>
> Marten guarda cada hecho como una fila de `mt_events`, y en `type` anota el nombre de su clase en minúsculas y con guion bajo: `EmpresaSuspendida` queda `empresa_suspendida`.

### Paso 3 · Empresas lleva la cuenta

> 🆕 **El estado de cada integración, derivado de hechos.** Por cada socio al que le pides algo, la empresa sabe en qué va: **SinSolicitar** (no se le ha pedido nada), **EnCurso** (se le pidió y no ha contestado) o **Aplicado** (contestó que cumplió). No es un campo que alguien actualiza a mano. Sale del diario: `EmpresaSuspendida` deja a los dos socios `EnCurso`, y cada respuesta que Empresas anota como hecho propio pasa a ese socio a `Aplicado`. Es el mismo `Apply` de siempre.
>
> Empresas no guarda en su diario el `MultaCobradaV1` que recibe: lo traduce a un hecho suyo, `CobroDeMultaConfirmado`. El contrato es una promesa de Facturación, que puede pasar a `V2`, y tu diario no debe atarse a la forma de un contrato ajeno. Es [El evento público](./el-evento-publico.md) al revés.

> 🆕 **Idioma de C#: `enum`.** `enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }` declara un tipo que solo admite esos tres valores. Frente a un `string`, el compilador rechaza un valor mal escrito: `EstadoIntegracion.Aplicada` no compila, y `"Aplicada"` sí. Su valor por defecto es el primero de la lista: una propiedad que nadie asignó vale `SinSolicitar`.

> 🛠️ **Inténtalo tú.** Haz que esto muestre en qué va cada socio de emp-8:
>
> ```csharp
> await using (var s = store.LightweightSession())
> {
>     var e = await s.Events.AggregateStreamAsync<Empresa>("emp-8");
>     Console.WriteLine($"emp-8: Facturacion={e!.Facturacion} Accesos={e.Accesos} Efectiva={e.Efectiva}");
> }
> // emp-8: Facturacion=EnCurso Accesos=EnCurso Efectiva=False
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Declara tres hechos internos, `CobroDeMultaConfirmado()`, `RevocacionDeAccesosConfirmada()` y `SuspensionEfectiva()`, y el `enum EstadoIntegracion`. **(2)** Dale a tu `Empresa` una propiedad `EstadoIntegracion` por socio (`Facturacion`, `Accesos`) y un `bool Efectiva`. **(3)** Dale un `Apply` a cada hecho nuevo. Haz que el de `EmpresaSuspendida` deje a los dos socios `EnCurso`, y que el de `EmpresaReactivada` los devuelva a `SinSolicitar`: reactivar cierra la suspensión.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia: lo que Empresas anota cuando un socio responde
public record CobroDeMultaConfirmado();
public record RevocacionDeAccesosConfirmada();
public record SuspensionEfectiva();

public enum EstadoIntegracion { SinSolicitar, EnCurso, Aplicado }
```

```csharp
// en tu Empresa (lo de siempre se queda; esto se añade o cambia)
public EstadoIntegracion Facturacion { get; private set; }
public EstadoIntegracion Accesos { get; private set; }
public bool Efectiva { get; private set; }

public void Apply(EmpresaSuspendida e)
{
    Suspendida = true; DeudaPendiente = true;
    Facturacion = EstadoIntegracion.EnCurso; Accesos = EstadoIntegracion.EnCurso; Efectiva = false;
}
public void Apply(EmpresaReactivada e)
{
    Suspendida = false; Reactivaciones++;
    Facturacion = EstadoIntegracion.SinSolicitar; Accesos = EstadoIntegracion.SinSolicitar; Efectiva = false;
}
public void Apply(CobroDeMultaConfirmado e)        { Facturacion = EstadoIntegracion.Aplicado; }
public void Apply(RevocacionDeAccesosConfirmada e) { Accesos = EstadoIntegracion.Aplicado; }
public void Apply(SuspensionEfectiva e)            { Efectiva = true; }
```

</details>

> 🔍 **¿Lo lograste?** Sale `Facturacion=EnCurso Accesos=EnCurso Efectiva=False`. Los dos socios esperan por el `EmpresaSuspendida` del Paso 2, y sus respuestas se perdieron porque nadie las escuchaba.

### Paso 4 · La empresa decide

La regla de negocio vive en la empresa, como en [Decidir el futuro](./decidir-el-futuro.md): la suspensión es **efectiva** cuando los dos socios cumplieron. Y quien decide es quien recibe la **última** respuesta.

`SuspensionEfectiva` es un hecho, y no una propiedad calculada, porque "quedó efectiva" es algo que pasó: tiene fecha, y otros reaccionan a él. CosmosLens, en el Paso 5, da con él el proceso por terminado, y el plazo de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md) lo consulta. Una propiedad calculada (`Facturacion == Aplicado && Accesos == Aplicado`) daría el estado bien, pero no dejaría en el diario ni el hecho ni su fecha.

> 🆕 **Idioma de C#: `[]` y `[a, b]`.** Decidir ahora da cero, uno o dos hechos, así que el método devuelve un `object[]`, que ya conoces. `[]` es un arreglo vacío, y `[a, b]` uno con dos elementos: es lo mismo que `new object[] { a, b }`, más corto. `session.Events.Append(id, arreglo)` acepta el arreglo, y con uno vacío no escribe nada. Así una respuesta repetida no deja rastro.

Antes del reto, reactiva emp-8: sigue suspendida desde el Paso 2, y tu `SuspenderHandler` no vuelve a suspender una empresa suspendida. Con un `Append` directo, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), registra el pago y la reactivación. Tu `Apply(EmpresaReactivada)` nuevo deja a los dos socios en `SinSolicitar`.

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
> // emp-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True
> // diario: … → empresa_suspendida → cobro_de_multa_confirmado → revocacion_de_accesos_confirmada → suspension_efectiva
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** Crea en tu `Empresa` dos métodos, uno por respuesta, que devuelvan `object[]`. `ConfirmarCobroDeMulta()` devuelve `CobroDeMultaConfirmado` y, si Accesos ya está `Aplicado`, también `SuspensionEfectiva`. `ConfirmarRevocacionDeAccesos()` hace lo mismo al revés. Si ese socio no estaba `EnCurso`, que devuelvan `[]`: es una reentrega, o una respuesta que nadie pidió. **(2)** Escribe un handler `static` por respuesta: busca el stream con `Localizador.StreamDe(msg.Nit)`, rehidrata la empresa y haz `Append` de lo que devuelva.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en tu Empresa: decidir, dada una respuesta, qué hechos ocurren
public object[] ConfirmarCobroDeMulta()
{
    if (Facturacion != EstadoIntegracion.EnCurso) return [];   // reentrega, o nadie lo pidió
    return Accesos == EstadoIntegracion.Aplicado
        ? [new CobroDeMultaConfirmado(), new SuspensionEfectiva()]
        : [new CobroDeMultaConfirmado()];
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
        var id = Localizador.StreamDe(msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
        session.Events.Append(id, empresa!.ConfirmarCobroDeMulta());
    }

    public static async Task Handle(AccesosRevocadosV1 msg, IDocumentSession session)
    {
        var id = Localizador.StreamDe(msg.Nit);
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(id);
        session.Events.Append(id, empresa!.ConfirmarRevocacionDeAccesos());
    }
}
```

</details>

> 🔍 **¿Lo lograste?** Manda a mano otra respuesta de Facturación por el bus, con el `using Contratos;` que tu `Program.cs` ya tiene desde [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md):
>
> ```csharp
> await bus.InvokeAsync(new MultaCobradaV1("900800800"));
> ```
>
> El diario sigue terminando en `suspension_efectiva`: Facturación ya está `Aplicado`, y `ConfirmarCobroDeMulta` devuelve `[]`.

### Paso 5 · Verlo sin preguntar

Ahora la respuesta a soporte existe: `Efectiva`. Pero mirar un stream a la vez no alcanza cuando hay cien suspensiones abiertas. Para eso está **CosmosLens**, el observador que damos con el taller. Lee tu Postgres sin tocarlo. Aquí usas dos de sus paneles: **Procesos** muestra cada suspensión con un chip por socio, y **Correlación** busca una llave (un NIT, un stream) en tus hechos y en los mensajes de Wolverine. CosmosLens no adivina tu negocio: le **declaras** el proceso, es decir, qué hecho lo inicia, cuál lo termina, qué hecho dice que cada socio cumplió y cuánto esperar antes de darlo por vencido.

CosmosLens vive en el repo `cosmos-trace`, y su API se llama `CosmosTrace.Api`. El repo es privado: pide al facilitador que te invite con tu cuenta de GitHub y acepta la invitación antes de clonar. Clónalo **fuera** del repo del taller, en la carpeta de al lado: si lo clonas adentro, el `git add .` de tu avance mete un repo dentro de otro. El tablero es una app web y pide Node LTS (compruébalo con `node -v`).

```bash
# desde la carpeta que contiene tu repo del taller, no desde adentro
git clone --branch taller-es-v1 https://github.com/didierymartinez/cosmos-trace
```

`--branch taller-es-v1` trae la versión de CosmosLens que usa este taller. Git avisa *detached HEAD*: es normal al clonar una versión fija. Comprueba que existe `cosmos-trace/src/CosmosTrace.Api/Procesos.cs`, el archivo que lee tus procesos. Si no está, tu clon es viejo: bórralo y vuelve a clonar con `--branch taller-es-v1`.

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

La API se arranca apuntando a tu Postgres, y el tablero, en otra terminal. El tablero busca la API en `http://localhost:5301`, así que la API arranca en ese puerto. Los argumentos con `--` funcionan igual en PowerShell, macOS y Linux.

```bash
cd cosmos-trace/src/CosmosTrace.Api
dotnet run --no-launch-profile -- --urls http://localhost:5301 --ConnectionStrings:Observed "<tu cadena de Postgres>" --Observed:Schema public
```

```bash
cd cosmos-trace/web
npm install
npm run dev      # imprime la dirección del tablero
```

> 🛠️ **Inténtalo tú.** Llena los cuatro huecos del `procesos.json` con los nombres que Marten guarda en `mt_events.type` (confírmalos con `SELECT DISTINCT type FROM mt_events`). Arranca la API y el tablero, y abre **Procesos**.

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

> 🔍 **¿Lo lograste?** En **Procesos**, la suspensión más reciente de emp-8 aparece con `Facturación: Aplicado`, `Accesos: Aplicado` y el estado `Completo`. Las suspensiones viejas, anteriores a las respuestas (las de emp-7 y las dos anteriores de emp-8), aparecen como `Vencido`. Tu `Empresa` las lee igual: rehidrata emp-7 y la verás con los dos socios `EnCurso`, esperando respuestas que nunca vendrán. Cambiar un `Apply` reinterpreta el pasado; en producción se decide desde cuándo aplica la regla.

## 🔨 Rómpelo: un socio que no contesta

**Accesos falla.** Haz que `AccesosHandler` lance una excepción antes de responder (`throw new InvalidOperationException("el directorio de accesos no responde")`). Siembra una empresa nueva (`emp-20`, NIT `902000000`), con su fila en el localizador como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), y suspéndela. Empresas dice `Suspendida = true`, pero ahora también dice la verdad completa: `Facturacion=Aplicado`, `Accesos=EnCurso`, `Efectiva=False`. En CosmosLens, pasado el plazo, Accesos se pone `Vencido` en la suspensión de la empresa nueva, y el proceso cuenta como **colgado**. En el panel **Correlación**, busca el NIT: el `EmpresaSuspendidaV2` de Accesos aparece como dead-letter (CosmosLens lo marca `muerto`), con su excepción. Destrabarlo, igual que atender a un socio que rechaza o una respuesta que llega tarde, es trabajo de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md).

**Sin las dos colas.** Quita `MultipleHandlerBehavior.Separated` y repite con otra empresa nueva (`emp-21`, NIT `902100000`), con su fila en el localizador. Ahora Facturación también queda `EnCurso`, aunque `multas` tiene la fila: la multa se cobró, pero su respuesta no salió. Facturación y Accesos corrían en la misma cadena, en el orden en que los registraste con `IncludeAssembly`. Facturación corrió primero y cobró, y la falla de Accesos se llevó su respuesta. Con el orden al revés, ni siquiera cobra. Es un estado peor que el anterior, porque miente: el cobro existe y Empresas cree que no.

Al terminar, vuelve a poner `opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;` y quita el `throw` de `AccesosHandler`. Las secciones que siguen cuentan con las dos colas y con Accesos contestando.

## El Descubrimiento

Un acto que depende de otros sistemas no termina cuando lo pides: termina cuando los otros contestan. Para saber en qué va, cada socio responde con un contrato público. Quien pidió anota cada respuesta como un hecho propio, y de esos hechos deriva el **estado de cada integración**: sin solicitar, en curso o aplicado. La regla "está hecho cuando todos cumplieron" es una decisión del agregado, idempotente ante respuestas repetidas. Y como el estado sale de hechos, cualquier observador lo puede leer sin preguntarle a nadie. En los proyectos de la organización, este estado por integración es justo la pieza que falta en la obligación por pagar: el equipo ya tiene el molde (el estado del cálculo tributario: sin solicitar, en curso, aplicado o rechazado), y lo dejó para después.

> 🌱 Aquí las respuestas llegan una detrás de otra, y cada handler ve la anterior. Nada lo garantiza: cada respuesta tiene su propia cola y se procesa en paralelo. Si las dos llegan casi juntas, cada handler rehidrata la empresa **antes** de que el otro guarde, ninguno ve la confirmación del otro, y la suspensión no queda efectiva aunque los dos contestaron. En tu máquina, sin carga, la ventana es tan chica que casi nunca se abre; en producción se abre sola. Por eso la vas a abrir a propósito en [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md). Y tu `Empresa` ahora conoce a sus socios y guarda estado que no es suyo, algo que cobra [El proceso tiene dueño](./el-proceso-tiene-dueno.md).

## ✅ Compruébalo

- [ ] `Accesos` es un proyecto que solo referencia `Contratos`, registrado en Wolverine con `IncludeAssembly`.
- [ ] Facturación y Accesos contestan con `MultaCobradaV1` y `AccesosRevocadosV1`, devolviéndolas desde su handler. Facturación contesta también en la reentrega, y sabes por qué.
- [ ] Tras suspender, emp-8 queda `Facturacion=Aplicado Accesos=Aplicado Efectiva=True`, y su diario termina en `suspension_efectiva`.
- [ ] Sabes por qué `SuspensionEfectiva` es un hecho y no una propiedad calculada.
- [ ] Una respuesta repetida no agrega hechos.
- [ ] CosmosLens muestra la suspensión en **Procesos** con un chip por socio.
- [ ] Con Accesos fallando, ves `Accesos=EnCurso` en la empresa, `Vencido` en CosmosLens y el dead-letter en **Correlación**.
- [ ] Sabes explicar por qué, sin `MultipleHandlerBehavior.Separated`, la falla de Accesos se lleva la respuesta de Facturación.

## 🆘 Si algo salió mal

- **`No routes can be determined` en el log al suspender, desde el Paso 4:** te falta el handler de esa respuesta en `RespuestasHandler`.
- **Accesos no recibe nada:** falta `opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly)`.
- **Suspender emp-8 no hace nada (ni hecho nuevo ni respuestas):** emp-8 ya estaba suspendida, y tu `SuspenderHandler` no la vuelve a suspender. Reactívala con el `Append` del Paso 4.
- **`Efectiva` nunca llega a `True` aunque los dos contestaron:** revisa que cada `Confirmar…` mire el estado **del otro** socio. Si pasa solo de vez en cuando, es la carrera de la 🌱.
- **`git clone` dice `Repository not found` o pide usuario y contraseña:** aún no tienes acceso a `cosmos-trace`. Acepta la invitación que te llegó por correo o en GitHub, o pídela al facilitador.
- **CosmosLens no tiene los paneles Procesos ni Correlación:** tu clon es viejo. Bórralo y vuelve a clonar con `--branch taller-es-v1`.
- **CosmosLens no muestra procesos:** el archivo debe llamarse `procesos.json` y estar en `src/CosmosTrace.Api/`. Y los nombres de `Inicia` y `Aplicado` deben ser los de `mt_events.type`, no los de tus clases.
- **El tablero dice `No conecta a la API`:** la API no corre en `http://localhost:5301`, que es donde el tablero la busca. Arráncala con `--urls http://localhost:5301`.
- **El tablero dice `La API responde, pero: sin conexión a Postgres`:** lo que falla es tu cadena de Postgres, no el puerto. `password authentication failed` señala la contraseña, y `does not exist`, el nombre de la base. Pasa en `--ConnectionStrings:Observed` la misma `cadena` de tu `Program.cs`.
- **El tablero dice `Conecta, pero no hay nada que observar` (junto a Filtrar sale `—` y no `Marten`):** el esquema de Marten es `public` si no le pusiste otro (`opts.DatabaseSchemaName`). Pásalo en `--Observed:Schema`. Si el esquema está bien, tu cadena apunta a otra base: el aviso dice a cuál (`host:puerto/base`). Pasa la misma `cadena` de tu `Program.cs`.

## 📓 Registra tu avance

> 💭 **Reto:** en tu sistema, ¿qué acto depende de que otro sistema conteste? Escribe los estados de cada integración y la regla que dice cuándo el acto está hecho, y explica por qué `Suspendida = true` no bastaba para contestarle a soporte.

```bash
git add .
git commit -m "ES · Dos respuestas, ningún dueño (estado por integración)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un acto que depende de otros sistemas termina cuando ellos contestan: cada socio responde con un contrato público, quien pidió anota cada respuesta como un hecho propio y de ahí deriva el estado de cada integración (sin solicitar, en curso, aplicado), y la regla "hecho cuando todos cumplieron" la decide el agregado.

---

[⬅️ Volver: El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md)

[➡️ Siguiente: Dos respuestas a la vez](./dos-respuestas-a-la-vez.md)
