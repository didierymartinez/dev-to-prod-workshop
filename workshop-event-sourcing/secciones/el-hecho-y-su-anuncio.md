# El hecho y su anuncio

En [Todo o nada](./todo-o-nada.md) guardaste una letra pequeña: *"el todo-o-nada cubre lo que viaja DENTRO de la transacción. El día que un acto, además de grabarse, tenga que avisarle a algo que vive FUERA de la base, esa letra pequeña va a doler."* Hoy duele.

## 🎯 El Objetivo

Que tu **anuncio** al mundo de afuera nunca **mienta**: si el hecho no ocurrió, nada se anuncia; si ocurrió, el anuncio llega — aunque tarde.

## 💥 El dolor: dos escrituras a dos sistemas no son una sola

Cuando una empresa se suspende, otro contexto —facturación— tiene que enterarse. Ese contexto vive **afuera**: otro proceso, que no comparte tu base. Para el taller lo fingimos con una lista estática:

```csharp
public static class MundoExterno { public static List<string> Recibidos = new(); }   // "lo que el otro lado ya recibió"
```

El reflejo: en el handler, tras suspender, avisas.

```csharp
MundoExterno.Recibidos.Add($"suspendida:{cmd.EmpresaId}");   // 1) anuncia afuera
stream.Append(e);                                            // 2) guarda el hecho
```

Ahora mete una caída **entre** las dos —un corte de luz, un `kill`, justo antes del `Commit` de `Append`—:

```
mundo externo → suspendida:emp-1        (el anuncio salió)
diario         → sin la suspensión       (el guardado se revirtió)
```

Facturación cree que `emp-1` está suspendida. Tu diario —la fuente de la verdad— dice que **eso no pasó**. Un **fantasma**: anunciaste algo que no ocurrió. Y si inviertes el orden (guardar y luego anunciar), la caída mata el anuncio: un hecho real del que facturación **nunca se entera**.

¿Y una **transacción distribuida** (2PC), que abarque los dos sistemas? Necesita que **ambos** lados la hablen y un coordinador que los bloquee mientras deciden. Facturación es otro equipo y otro proceso: no se va a enrolar en tu transacción. El `Commit` de [Todo o nada](./todo-o-nada.md) tampoco alcanza: abarca lo que está **dentro** de Postgres, y la lista de facturación no está dentro. Son **dos escrituras a dos sistemas**, y ninguna transacción las abraza a las dos.

## 🔧 Reducir dos escrituras a una sola atómica

Si no puedes hacer atómicas las dos escrituras, ten **una sola**. En la misma transacción del hecho, escribe una fila que diga **"debo anunciar esto"** — la *intención*, que sí vive en tu base. Y entrega después, en un paso aparte. Si el hecho se revierte, la intención se revierte con él (no hay fantasma); si el hecho entra, la intención queda grabada y la entrega, aunque tarde, ocurrirá.

La entrega sigue siendo una segunda escritura fuera de la transacción: no la arreglas, la **aplazas**. Como la intención sobrevive, la entrega se puede **reintentar** hasta lograrlo.

> 🆕 **La bandeja de salida (*outbox*).** Una tabla `bandeja_salida(id, mensaje, entregado)` que se escribe **en la misma transacción** que los hechos. Un paso separado la recorre, hace el efecto externo (avisar a facturación) y marca la fila como entregada.

### Paso 1 · La tabla

```sql
CREATE TABLE bandeja_salida(id BIGSERIAL PRIMARY KEY, mensaje TEXT NOT NULL, entregado BOOL NOT NULL DEFAULT false);
```

### Paso 2 · El anuncio viaja con el hecho

Quieres llegar a esto — el anuncio va **con** el hecho, en una sola llamada:

```csharp
// en el handler, tras suspender:
stream.Append(e, new[] { $"suspendida:{cmd.EmpresaId}" });   // el hecho Y el anuncio, en la misma transacción
```

> 🛠️ **Inténtalo tú.** `Guardar` vive en `IEventStore`, con dos implementaciones ([El puerto propio](./el-puerto-propio.md)). Añade el parámetro `anuncios` a `Guardar` en la **interfaz**; el `PostgresEventStore` inserta cada anuncio en `bandeja_salida` **dentro de su transacción de siempre**; el `InMemoryEventStore` los **ignora** (no tiene bandeja: es para tests de reglas). En `EventStream`, conserva el `Append(agg)` de siempre (delega con una lista vacía, para los actos que no anuncian) y añade el overload `Append(agg, anuncios)`. El handler que suspende usa el overload.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public interface IEventStore
{
    List<EventoAlmacenado> GetEvents(string id);
    void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios);
    void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos);   // de «Dos streams, la misma clave», sin cambios
}

// PostgresEventStore: los hechos Y los anuncios, en la MISMA transacción (todo o nada, ahora de las dos cosas)
public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios)
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var tx = c.BeginTransaction();
    try
    {
        foreach (var sobre in sobres) { /* el INSERT en eventos de siempre, con cmd.Transaction = tx */ }
        foreach (var msg in anuncios)
        {
            using var b = c.CreateCommand();
            b.Transaction = tx;
            b.CommandText = "INSERT INTO bandeja_salida(mensaje) VALUES(@m)";
            b.Parameters.AddWithValue("m", msg);
            b.ExecuteNonQuery();
        }
        tx.Commit();   // hechos y anuncios entran juntos, o ninguno
    }
    catch (PostgresException e) when (e.SqlState == "23505")
    {
        throw new ConcurrencyException($"Alguien escribió primero en '{id}' — recarga y reintenta.");
    }
}

// InMemoryEventStore: implementa la nueva firma, pero ignora los anuncios (no tiene bandeja)
public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios)
{ /* el cuerpo de siempre; los anuncios no aplican al doble */ }

// EventStream conserva el viejo Append y añade el overload
public void Append(T agg) => Append(agg, Array.Empty<string>());
public void Append(T agg, IReadOnlyList<string> anuncios)
{
    var sobres = new List<EventoAlmacenado>();
    foreach (var hecho in agg.SinConfirmar) sobres.Add(new EventoAlmacenado(++_version, hecho));
    _store.Guardar(_aggregateId, sobres, anuncios);
    agg.MarcarConfirmados();
}
```

```csharp
// El handler ya no toca el mundo externo: deja el anuncio en la bandeja, dentro de la transacción del hecho
public void Handle(SuspenderEmpresa cmd)
{
    var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
    var e = stream.Get();
    e.Suspender(cmd.Motivo);
    stream.Append(e, new[] { $"suspendida:{cmd.EmpresaId}" });
}
```

Los otros handlers (`CambiarPlanHandler`, `PagarDeudaHandler`) siguen llamando `Append(agg)`, y el registro sigue con `GuardarNuevo`: ninguno cambia.

</details>

### Paso 3 · La entrega, aparte

`EntregarPendientes()` vive **solo** en el `PostgresEventStore` (el doble no la necesita), y devuelve cuántas entregó.

> 🛠️ **Inténtalo tú.** `SELECT` de las filas con `NOT entregado`, y por cada una: `MundoExterno.Recibidos.Add(mensaje)` y `UPDATE ... entregado = true`. Un detalle de Npgsql: no puedes correr un `UPDATE` con el lector (`reader`) aún abierto sobre la misma conexión — así que **lee todo primero** a una lista, cierra el lector, y **luego** marca.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public int EntregarPendientes()
{
    using var c = new NpgsqlConnection(_cadena); c.Open();

    var pendientes = new List<(long id, string mensaje)>();      // 1) lee TODO y cierra el lector
    using (var q = c.CreateCommand())
    {
        q.CommandText = "SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado ORDER BY id";
        using var r = q.ExecuteReader();
        while (r.Read()) pendientes.Add((r.GetInt64(0), r.GetString(1)));
    }

    foreach (var (id, mensaje) in pendientes)                    // 2) efecto externo, luego marca
    {
        MundoExterno.Recibidos.Add(mensaje);
        using var u = c.CreateCommand();
        u.CommandText = "UPDATE bandeja_salida SET entregado = true WHERE id = @id";
        u.Parameters.AddWithValue("id", id);
        u.ExecuteNonQuery();
    }
    return pendientes.Count;
}
```

El orden —efecto externo y **luego** marcar— puede entregar dos veces si caes en medio (entregaste, no marcaste, reintentas). Es a propósito: ese cabo *at-least-once* lo cerramos más adelante.

</details>

## 🔨 Rómpelo: el fantasma y el anuncio perdido, con y sin bandeja

Fíjalo en tests, con el arnés de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md). En `PostgresFixture`, crea `bandeja_salida` en el constructor (el `CREATE TABLE` del Paso 1, con `IF NOT EXISTS`) y súmala al `TRUNCATE` de `Limpiar()`. En el `InitializeAsync` de tu clase de tests nueva, vacía también `MundoExterno.Recibidos`, porque es una lista estática.

**Anunciar y luego guardar.** Con la versión ingenua (anunciar directo + `Append`), inyecta un `throw` antes del `Commit` y corre: `MundoExterno` tiene `suspendida:emp-1` y la suspensión no está en el diario — el fantasma, en rojo. **Con la bandeja**, el mismo `throw`: `MundoExterno` vacío, `bandeja_salida` vacía, la suspensión tampoco entró — el test pasa.

**Guardar y luego anunciar.** Es el arreglo tentador del fantasma: si el hecho entra primero, no hay nada que desmentir. Una caída entre las dos líneas equivale a que la segunda nunca corra, así que en el test no la llamas. Escribe este test con la versión ingenua: el handler guarda con `Append(e)` y anunciaría después.

```csharp
[Collection("postgres")]
public class ElHechoYSuAnuncio(PostgresFixture db) : IAsyncLifetime
{
    public Task InitializeAsync()
    {
        db.Limpiar();
        MundoExterno.Recibidos.Clear();   // sin esto, trae lo que agregó el test anterior
        return Task.CompletedTask;
    }
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public void Una_caida_despues_de_guardar_no_pierde_el_anuncio()
    {
        var store = new PostgresEventStore(db.Cadena);
        var nueva = new Empresa();
        nueva.Registrar("900123456", "Acme", "Premium");
        store.GuardarNuevo("emp-1", "900123456", nueva.SinConfirmar);

        var stream = store.AbrirStream<Empresa>("emp-1");
        var e = stream.Get();
        e.Suspender("falta de pago");
        stream.Append(e);                                   // 1) guarda el hecho
        // 💥 el proceso cae aquí: la línea que anunciaba nunca corre

        Assert.Contains(store.GetEvents("emp-1"), s => s.EventData is EmpresaSuspendida);   // el hecho entró
        Assert.Equal(1, store.EntregarPendientes());                                          // al volver, la entrega lo encuentra
        Assert.Equal(new[] { "suspendida:emp-1" }, MundoExterno.Recibidos);                   // y facturación se entera
    }
}
```

Rojo: `Assert.Equal() Failure`, `Expected: 1`, `Actual: 0`. El hecho está en el diario, `MundoExterno` está vacío, y ninguna fila de `bandeja_salida` recuerda el anuncio: no queda nada que reintentar. Ahora cambia `stream.Append(e)` por `stream.Append(e, new[] { "suspendida:emp-1" })`, con la misma caída: verde. La intención entró en la transacción del hecho, y la entrega la encuentra al volver. La bandeja cura los dos órdenes.

## El Descubrimiento

Dos escrituras a **dos** sistemas no se pueden hacer atómicas, y un corte entre ellas deja un fantasma o un hecho perdido. El truco es **no tener dos escrituras**: el hecho y la *intención* de anunciarlo van en **una** transacción de tu base, y la entrega es un paso separado que puede fallar y reintentarse sin mentir. Eso es el patrón **outbox**. Lo armaste a mano; falta ver qué le falta.

> 🌱 Dos cabos quedan sueltos. **Uno:** ese `"suspendida:emp-1"` ya es un contrato hacia afuera, pero improvisado; y si metes tu evento interno tal cual, atas a facturación a la forma privada de tu dominio. Hace falta un anuncio con **contrato propio** → [El evento público](./el-evento-publico.md). **Dos:** la entrega la disparas a mano y va a una lista en tu proceso. El día que facturación sea otro proceso en otra máquina, el mensaje tiene que **viajar**, con una entrega que reintente sola y no duplique → [El mensaje y la cola](./el-mensaje-y-la-cola.md). Lo primero es el próximo dolor.

## ✅ Compruébalo

- [ ] Versión ingenua + caída antes del `Commit`: `MundoExterno` tiene el anuncio y la suspensión no está en el diario — el fantasma. Con la bandeja, la misma caída deja `MundoExterno` y `bandeja_salida` vacíos, y el hecho tampoco entró.
- [ ] Guardar y luego anunciar, con una caída entre los dos: el test cae porque `EntregarPendientes()` devuelve **0**. Con la bandeja, la misma caída deja la intención, y el test pasa.
- [ ] Acto que sí commitea: queda una fila `NOT entregado`; `EntregarPendientes()` devuelve 1 y el anuncio llega a `MundoExterno`; correrlo otra vez devuelve **0**.
- [ ] Sabes decir por qué ni el `Commit` de Todo o nada ni un 2PC cubren el anuncio (la lista de facturación no está —ni se va a enrolar— en la transacción de Postgres).

## 🆘 Si algo salió mal

- **Sigue habiendo fantasma:** el anuncio se hace fuera de la transacción del hecho (tocas `MundoExterno` en el handler, o insertas la bandeja en otra conexión). Debe ir en el **mismo** `tx` que los `INSERT` de `eventos`, dentro de `PostgresEventStore.Guardar`.
- **`NpgsqlOperationInProgressException` en `EntregarPendientes`:** el `UPDATE` corre con el lector aún abierto. Lee todo a una lista, cierra el lector, y **luego** marca.
- **`EntregarPendientes()` reenvía lo ya entregado:** no marcas `entregado = true`, o no filtras por `NOT entregado`.
- **`42P01: relation "bandeja_salida" does not exist` en los tests:** la base de pruebas no tiene la tabla. Agrega su `CREATE TABLE IF NOT EXISTS` al constructor de `PostgresFixture`.

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué "una escritura atómica + una entrega reintentable" hace que tu anuncio nunca mienta, y "dos escrituras a dos sistemas" no puede? ¿Qué caso de caída rompe la segunda y no la primera?

```bash
git add .
git commit -m "ES · El hecho y su anuncio (outbox a mano)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un hecho y su anuncio al exterior son dos escrituras a dos sistemas, y no se pueden hacer atómicas (ni con 2PC, que el otro lado no habla). El patrón **outbox** lo reduce a **una** escritura atómica —el hecho y la intención de anunciarlo— más una entrega aparte que puede reintentarse. Cura los dos órdenes: no anuncia lo que no pasó, ni pierde el anuncio de lo que sí pasó.

---

[⬅️ Volver: La vista por consulta](./la-vista-por-consulta.md)

[➡️ Siguiente: El evento público](./el-evento-publico.md)
