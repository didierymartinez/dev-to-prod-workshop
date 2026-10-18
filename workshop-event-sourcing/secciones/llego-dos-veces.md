# Llegó dos veces

El outbox de la sección pasada entrega **al menos una vez**.

## 🎯 El Objetivo

Que el consumidor no haga **daño** cuando el mismo mensaje le llega dos veces.

## 💥 El dolor: el mismo anuncio, cobrado dos veces

En [El outbox](./el-outbox.md), facturación solo "avisaba". Ahora dale un efecto con **lado**: al recibir `EmpresaSuspendidaV1`, **cobra una multa** por la suspensión.

Si Wolverine entrega el mensaje pero el proceso cae antes de marcarlo como hecho, al reintentar **entrega el mismo mensaje otra vez**. El handler corre dos veces, y facturación cobra **dos** multas por una sola suspensión.

```
mismo mensaje entregado 2 veces → multas cobradas = 2
```

Con tu `bandeja_salida` en un solo proceso no había red que fallara entre "entregué" y "marqué". En el momento del crash, entre "hago el trabajo" y "marco hecho", solo hay tres salidas: reintentar (*at-least-once*, arriesga duplicar), no reintentar (*at-most-once*, arriesga perder), o hacer ambos pasos atómicos (*exactly-once*, que pide una transacción distribuida entre el bus y tu efecto, cara y frágil). La industria elige *at-least-once* y le pasa la responsabilidad al **consumidor**: que aguante el duplicado.

## 🔧 Idempotencia en el consumidor

> 🆕 **Idempotente = repetirlo no cambia el resultado.** La pregunta-guía para cualquier efecto: *¿si lo hago dos veces, queda distinto que si lo hago una?* Dos caminos:
> - **Natural:** el efecto **sobrescribe**. "Poner `Suspendida = true`" dos veces deja el mismo estado: no hace falta nada. Un efecto que **acumula** (incrementar un contador, anexar una fila, cobrar) **no** es natural.
> - **Dedup:** el efecto acumula o tiene lado. Guardas una **llave** de lo que ya hiciste; si llega otra vez, no haces nada. Cuál llave depende de qué se repite. Empiezas por el mismo mensaje, entregado otra vez.

> 🆕 **El id del mensaje: el `Envelope` de Wolverine.** Cada mensaje viaja en un *envelope*, el sobre del **transporte** (distinto del `EventoAlmacenado`, el sobre de un **hecho**). Pide el `Envelope` como parámetro del handler y usa `envelope.Id` (un `Guid`). Cuando Wolverine **reentrega**, el `Id` es **el mismo**. Para la reentrega, la llave es ese id, no el NIT: el NIT solo se parece, y dos mensajes con el mismo NIT pueden ser dos suspensiones legítimas.

El dedup es el `ON CONFLICT DO NOTHING` que le pusiste a `pagos` en [La vista por consulta](./la-vista-por-consulta.md), ahora con `envelope.Id` como llave en vez del `seq`.

Tu consumidor vive en `Facturacion`. `Envelope` viene de Wolverine y `NpgsqlConnection` de Npgsql, así que ese proyecto necesita los dos paquetes:

```bash
dotnet add Facturacion package Npgsql
dotnet add Facturacion package WolverineFx
```

`Facturacion` tampoco ve la `cadena` de `Empresas.Historia`. Declara la suya en una clase `static` `Conexion`, con una propiedad `Cadena` que lea la misma variable `CADENA_POSTGRES` y lance con el mismo `?? throw` si falta. Abre la conexión con `Conexion.Cadena`: cada contexto lleva su configuración.

> 🛠️ **Inténtalo tú.** Cobrar una multa **acumula**, así que dedup. Crea una tabla `procesados(mensaje_id PRIMARY KEY)`. En el consumidor, recibe el `Envelope` y haz `INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT DO NOTHING` con `envelope.Id`; cobra **solo si insertaste** (una fila afectada). Para simular la reentrega, desde el `Program.cs` de `Empresas.Historia` llama al handler dos veces con el **mismo** `envelope.Id` y confirma que cobra **una** sola vez. Ese `Program.cs` no tiene `using Contratos;`: escribe el mensaje con su nombre completo, `Contratos.EmpresaSuspendidaV1`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE procesados(mensaje_id UUID PRIMARY KEY);
```

```csharp
// Facturacion/Conexion.cs: la configuración de Facturacion, no la de Empresas.Historia
public static class Conexion
{
    public static string Cadena => Environment.GetEnvironmentVariable("CADENA_POSTGRES")
        ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
}
```

```csharp
// Facturacion/FacturacionHandler.cs
using Contratos;   // EmpresaSuspendidaV1
using Npgsql;
using Wolverine;   // Envelope

public static class MundoExterno { public static List<string> Recibidos = new(); }   // de §32, sigue aquí

public static class FacturacionHandler
{
    public static void Handle(EmpresaSuspendidaV1 msg, Envelope envelope)
    {
        // registra el id del mensaje; si ya estaba, no hago nada (dedup)
        using var c = new NpgsqlConnection(Conexion.Cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING";
        cmd.Parameters.AddWithValue("id", envelope.Id);
        if (cmd.ExecuteNonQuery() == 1)          // 1 = era nuevo; 0 = reentrega, ya lo procesé
            CobrarMulta(msg.Nit);                // el efecto que acumula, una sola vez
    }

    static void CobrarMulta(string nit) => MundoExterno.Recibidos.Add($"multa NIT {nit}");   // el efecto que acumula
}
```

Para simular la reentrega sin un broker, crea tú el sobre y llama al handler dos veces con él (`Envelope` lo resuelve el `using Wolverine;` de tu `Program.cs`). Antes, comenta el `InvokeAsync` de suspender de [El outbox](./el-outbox.md): también cobra, y su multa se mezclaría con las de esta prueba.

```csharp
// Empresas.Historia/Program.cs
MundoExterno.Recibidos.Clear();
var sobre = new Envelope { Id = Guid.NewGuid() };
FacturacionHandler.Handle(new Contratos.EmpresaSuspendidaV1("900123", "mora"), sobre);
FacturacionHandler.Handle(new Contratos.EmpresaSuspendidaV1("900123", "mora"), sobre);   // mismo id: no cobra otra vez
Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");   // → multas: 1  (sin el dedup: 2)
```

**Un matiz de criterio:** si el cobro es una escritura tuya, el `INSERT` en `procesados` y el cobro van en la **misma** transacción de tu base. Si el efecto es externo (una API de pagos), la idempotencia final la pone **ese** sistema: le pasas una llave estable, el `envelope.Id`, y si no deduplica solo, antes de reintentar le preguntas por ella. Lo vives en el 🔨.

</details>

### El mismo pago, en otro sobre

Un acto también se repite en mensajes distintos. El banco te avisa que emp-7 pagó, con la referencia `BANCO-0001`. No ve tu confirmación a tiempo y vuelve a avisar: el mismo pago, la misma referencia, otro mensaje con otro `envelope.Id`. Un dedup por sobre deja pasar los dos. Lo que identifica este acto es la referencia del banco, y la tiene que recordar quien decide si el pago ya entró: la empresa, con sus hechos.

> 🆕 **Idioma de C#: `HashSet<T>`.** Un conjunto. `Add` agrega un elemento si no estaba, y `Contains` dice si está.

> 🛠️ **Inténtalo tú.** Haz que el segundo aviso no registre nada:
>
> ```csharp
> await bus.InvokeAsync(new RegistrarPago("emp-7", "BANCO-0001", 50_000));
> await bus.InvokeAsync(new RegistrarPago("emp-7", "BANCO-0001", 50_000));   // el banco avisa otra vez el mismo pago
> // SELECT count(*) FROM mt_events WHERE stream_id = 'emp-7' AND type = 'pago_registrado';
> // → uno más que antes, no dos
> ```
>
> Para eso, en `Empresas.Historia`: **(1)** `PagoRegistrado` gana la referencia del pago, como parámetro opcional: `PagoRegistrado(int Monto, string? Referencia = null)`. Con `= null`, tus `new PagoRegistrado(50_000)` siguen compilando, y Marten lee los hechos viejos con `null`. Es un default honesto, como las `Notas: ""` de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md): esos pagos de verdad no registraron referencia. **(2)** En tu `Empresa`, dale un `HashSet<string>` privado de referencias. Que el `Apply(PagoRegistrado)` agregue la referencia, si el hecho trae una, y que un método `YaRegistro(referencia)` le pregunte al conjunto. **(3)** Declara el comando `RegistrarPago(EmpresaId, Referencia, Monto)` y su handler `static`. El handler rehidrata la empresa con la sesión, como `SuspenderHandler`. Si la empresa ya registró esa referencia, no hace nada; si no, hace `Append` de un `PagoRegistrado` con la referencia.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// Empresas.Historia: el hecho gana la referencia, y el aviso del banco es un comando
public record PagoRegistrado(int Monto, string? Referencia = null);       // los hechos viejos no la traen: se leen con null
public record RegistrarPago(string EmpresaId, string Referencia, int Monto);
```

```csharp
// en tu Empresa (lo de siempre se queda; esto se añade o cambia)
private readonly HashSet<string> _referenciasDePago = new();
public bool YaRegistro(string referencia) => _referenciasDePago.Contains(referencia);

public void Apply(PagoRegistrado e)
{
    DeudaPendiente = false;
    if (e.Referencia is not null) _referenciasDePago.Add(e.Referencia);   // la llave del acto, guardada por el Apply
}
```

```csharp
// Empresas.Historia: el aviso del banco (using Marten;)
public static class RegistrarPagoHandler
{
    public static async Task Handle(RegistrarPago cmd, IDocumentSession session)
    {
        var empresa = await session.Events.AggregateStreamAsync<Empresa>(cmd.EmpresaId)
            ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}");
        if (empresa.YaRegistro(cmd.Referencia)) return;   // el mismo pago, en otro sobre: no hace nada
        session.Events.Append(cmd.EmpresaId, new PagoRegistrado(cmd.Monto, cmd.Referencia));
    }
}
```

</details>

La guarda va en el handler porque, desde [El swap](./el-swap-por-reconocimiento.md), tu `Empresa` solo tiene estado y `Apply`. La llave vive en el diario, dentro del `PagoRegistrado`: el `Apply` la recupera al rehidratar, así que sobrevive a un reinicio y llega a cualquier proceso que cargue la empresa. Corre los dos avisos otra vez, con la misma referencia: no entra ningún pago nuevo.

Antes de deduplicar, pregúntate **qué se repite**:

| Lo que se repite | La llave que lo identifica |
|---|---|
| El mismo mensaje, entregado otra vez | El sobre: `envelope.Id` |
| El mismo acto, en otro mensaje | La referencia que le dio el origen: `BANCO-0001` |
| Algo que solo se parece (el NIT, el monto) | Ninguna: dos pagos de 50.000 de la misma empresa pueden ser dos pagos |

## 🔨 Rómpelo: el ingenuo cobra doble, y lo que el sobre no ve

**El ingenuo cobra doble.** Quita la condición del cobro, para que cobre sin mirar el `INSERT`, y entrega el mismo mensaje dos veces (mismo `envelope.Id`): dos multas. Vuelve a ponerla: la segunda entrega inserta cero filas, no cobra, y queda **una** multa.

**El anuncio publicado otra vez.** Publica dos veces el mismo anuncio, como un productor que reintenta su envío o un sondeo que vuelve a pasar por el mismo dato:

```csharp
MundoExterno.Recibidos.Clear();
await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1("900123", "mora"));
await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1("900123", "mora"));   // el mismo anuncio, publicado otra vez
await Task.Delay(500);
Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");   // → multas: 2, con el dedup puesto
```

Son dos mensajes, cada uno con su `envelope.Id`, y el dedup deja pasar los dos. Y el anuncio no lleva nada que identifique la suspensión: dos suspensiones distintas de emp-7 se verían igual. Esta queda abierta: la llave de este acto, el id de la suspensión, nace en [El proceso tiene dueño](./el-proceso-tiene-dueno.md).

**El mismo pago, sin su referencia.** Comenta la guarda de `RegistrarPagoHandler` y repite los dos avisos con otra referencia, `BANCO-0002`. Entran dos `pago_registrado`: el banco cobró una vez, y tu diario dice dos. Una vista de pagos como la de [La vista por consulta](./la-vista-por-consulta.md) sumaría 100.000. Vuelve a poner la guarda.

**El cobro externo que pierde la respuesta.** Ahora la multa es un cobro en una API de pagos, y la red pierde su respuesta. Cambia tu `MundoExterno` por uno que recuerda lo que cobró y puede perder la respuesta:

```csharp
// Facturacion: el sistema de pagos (falso). Cobra, y a veces la respuesta no llega
public static class MundoExterno
{
    public static List<string> Recibidos = new();
    public static bool PerderRespuesta;                    // la red falla después de cobrar
    static readonly HashSet<Guid> _cobrados = new();       // lo que recuerda el sistema de pagos
    public static bool YaCobro(Guid referencia) => _cobrados.Contains(referencia);
    public static void Cobrar(Guid referencia, string nit)
    {
        _cobrados.Add(referencia);
        Recibidos.Add($"multa NIT {nit}");
        if (PerderRespuesta) { PerderRespuesta = false; throw new TimeoutException("el cobro salió, pero la respuesta no llegó"); }
    }
}
```

En `FacturacionHandler`, mete el `INSERT` en `procesados` y el cobro en una transacción, como pide el matiz, y cobra con `MundoExterno.Cobrar`:

```csharp
using var tx = c.BeginTransaction();
cmd.Transaction = tx;
if (cmd.ExecuteNonQuery() == 1) MundoExterno.Cobrar(envelope.Id, msg.Nit);
tx.Commit();
```

Desde tu `Program.cs`, prende la falla, llama al handler, y llámalo otra vez con el mismo sobre, como haría el reintento:

```csharp
MundoExterno.Recibidos.Clear();
var aviso = new Contratos.EmpresaSuspendidaV1("900123", "mora");
var sobreExterno = new Envelope { Id = Guid.NewGuid() };
MundoExterno.PerderRespuesta = true;
try { FacturacionHandler.Handle(aviso, sobreExterno); }
catch (TimeoutException ex) { Console.WriteLine(ex.Message); }   // Wolverine reintentaría
FacturacionHandler.Handle(aviso, sobreExterno);                  // el reintento, con el mismo sobre
Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");    // → multas: 2
```

Salen dos multas. El `TimeoutException` deshizo tu transacción, así que el reintento no encontró el id en `procesados` y cobró otra vez. Ningún orden de tu lado lo arregla. Si confirmas el dedup antes de cobrar, y la llamada falla antes de llegar, el reintento ya no cobra: pierdes el cobro. La llave tiene que llegar al otro sistema. Antes de cobrar, pregúntale por ella: `if (!MundoExterno.YaCobro(envelope.Id)) MundoExterno.Cobrar(envelope.Id, msg.Nit);`. Repite: una multa. Si el sistema externo deduplica solo por la llave que le pasas, basta con pasársela. Al terminar, deja `MundoExterno` y `FacturacionHandler` como estaban.

## El Descubrimiento

Un transporte real entrega *at-least-once*, y aguantar el duplicado le toca al **consumidor**. Ser idempotente es criterio, no receta. Primero te preguntas si repetir el efecto cambia el resultado: si sobrescribe un estado, no haces nada; si acumula o tiene lado (cobrar, enviar, llamar), deduplicas. Después te preguntas qué se repite. El sobre identifica la reentrega, la referencia del origen identifica el acto repetido, y un dato que solo se parece no identifica nada. Ante un efecto externo, la llave tiene que llegar al otro sistema.

> 🌱 Facturación ya no cobra doble, pero cobra lo mismo a todas las empresas. La multa debería depender del **plan**, que es de Empresas: ¿va en el anuncio, o Facturación lo pregunta? La respuesta depende de para qué lo quiera: [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md).

## ✅ Compruébalo

- [ ] El mismo mensaje entregado dos veces (mismo `envelope.Id`) cobra doble sin el dedup, y **una** vez con `ON CONFLICT DO NOTHING` + "solo si inserté".
- [ ] Sabes clasificar un efecto con la pregunta "¿repetirlo cambia el resultado?", y ves que "incrementar un contador" cambia estado pero **no** es idempotente.
- [ ] Dos avisos del mismo pago, con la misma referencia y en dos mensajes, registran **un** `pago_registrado`; sin la guarda, dos. La referencia la guarda el `Apply`, y los pagos viejos la leen como `null`.
- [ ] Viste el mismo anuncio, publicado dos veces, cobrar dos multas con el dedup puesto, y sabes por qué el sobre no lo detecta.
- [ ] Viste el cobro externo que pierde la respuesta cobrar dos veces, y una sola cuando le preguntas al sistema de pagos por la llave antes de cobrar.

## 🆘 Si algo salió mal

- **`Envelope` o `NpgsqlConnection` no compilan en `Facturacion`:** faltan los paquetes en ese proyecto. Corre los dos `dotnet add Facturacion package ...` de arriba.
- **Sigue cobrando doble:** el cobro va solo cuando el `INSERT` afectó 1 fila. Si ya lo condicionas, revisa que la prueba reuse el **mismo** `envelope.Id`: con ids distintos, son dos mensajes.
- **El segundo aviso del banco también registra el pago:** la guarda pregunta por lo que guardó el `Apply`. Revisa que el `Apply(PagoRegistrado)` agregue la referencia al conjunto, y que el handler le pase `cmd.Referencia` al hecho.
- **El cobro externo sale una sola vez aunque no le preguntes nada:** confirmaste el `INSERT` en `procesados` antes de cobrar. Mete los dos en la transacción, como dice el 🔨, para ver el doble cobro.

## 📓 Registra tu avance

Primero, deja en tu `DECISIONES.md` la decisión de hoy:

> Deduplico por la llave de lo que se repite: el sobre para la reentrega, la referencia del origen (guardada por el `Apply`) para el acto repetido. Nunca por un dato que solo se parece. Con un efecto externo, le paso la llave y le pregunto por ella antes de reintentar.

> 💭 **Reto:** da dos efectos de tu dominio — uno naturalmente idempotente (sobrescribe) y otro que acumula o tiene lado (necesita dedup). Para el segundo, di qué se puede repetir (el mismo mensaje, o el mismo acto en otro mensaje), qué llave lo identifica, y por qué no sirve un dato que solo se parece.

```bash
git add .
git commit -m "ES · Llegó dos veces (idempotencia en el consumidor)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un transporte real entrega *at-least-once*, así que el consumidor debe ser **idempotente**: nada si el efecto sobrescribe un estado, o dedup por la **llave que identifica lo repetido** si acumula o tiene lado: el `envelope.Id` para la reentrega, la referencia del origen, guardada por el `Apply`, para el acto repetido, y nunca un dato que solo se parece.

---

[⬅️ Volver: El outbox](./el-outbox.md)

[➡️ Siguiente: El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md)
