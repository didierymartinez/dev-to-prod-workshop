# La pregunta que el diario no sabe responder

Ya tienes tus hechos en una base que sabe consultar. El negocio pide algo simple — "dame las empresas morosas" — y descubres que tu base, con todo su SQL, no puede.

## 🎯 El Objetivo

Responder "¿cuáles empresas tienen deuda pendiente **ahora**?" sin rejugar el diario entero en cada consulta.

## 💥 El dolor: el `SELECT` que miente, y el que cuesta

El equipo de cobranza quiere el listado de morosas. Para probarlo, siembra unas empresas con historias distintas — una activa, dos morosas, y una que se suspendió **pero pagó**:

```csharp
void sembrar(string id, Action<Empresa> hacer)
{
    var s = store.AbrirStream<Empresa>(id); var e = s.Get(); hacer(e); s.Append(e);
}
sembrar("emp-1", e => e.Registrar("Andes", "Básico"));
sembrar("emp-2", e => { e.Registrar("Beta", "Básico"); e.Suspender("falta de pago"); });
sembrar("emp-3", e => { e.Registrar("Gamma", "Básico"); e.Suspender("falta de pago"); });
sembrar("emp-3", e => { e.RegistrarPago(500); e.Reactivar(); });   // se suspendió, pero pagó
sembrar("emp-4", e => { e.Registrar("Delta", "Básico"); e.Suspender("falta de pago"); });
```

Las morosas de verdad son **emp-2** y **emp-4**. Ahora, el listado. Tienes Postgres delante; tu instinto es un `SELECT` — las morosas se suspendieron por falta de pago, así que:

```sql
SELECT DISTINCT stream FROM eventos WHERE tipo = 'empresa-suspendida';
```

Lo corres sobre unas cuantas empresas y sale **mal**: incluye a `emp-3`, que se suspendió… pero **pagó y se reactivó**. La consulta encontró el hecho `empresa-suspendida` en su diario, pero ese hecho dice lo que **pasó una vez**, no lo que es **verdad hoy**. "Tener deuda" no es un evento: es el resultado de **plegar** toda la historia de la empresa (se suspende → debe; paga → no debe). En el diario no hay una columna "deuda"; hay hechos.

Bien, entonces hazlo bien: recorre **todas** las empresas y rehidrata cada una para ver su estado actual. Para eso, dale al `EventStore` un método que liste los ids (un `SELECT DISTINCT stream`):

```csharp
public List<string> TodosLosStreams()
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT DISTINCT stream FROM eventos";
    var ids = new List<string>();
    using var r = cmd.ExecuteReader();
    while (r.Read()) ids.Add(r.GetString(0));
    return ids;
}
```

Y recórrelas, rehidratando cada una:

```csharp
var conDeuda = new List<string>();
foreach (var id in store.TodosLosStreams())
    if (store.AbrirStream<Empresa>(id).Get().DeudaPendiente)  // rehidrata (replay) y mira
        conDeuda.Add(id);
```

Ahora sí da bien (`emp-2`, `emp-4`). Pero mira lo que hiciste: para una sola pregunta, **rejugaste el diario completo de cada empresa que existe**. Con cuatro empresas de juguete no se nota; con diez mil y años de historia, cada "¿quiénes deben?" relee todo. Tienes un motor de consultas de primera al lado y, para la pregunta que importa, no te sirve — porque el estado actual vive **plegado** en los hechos, no en una columna que Postgres pueda filtrar.

## 🔧 Guardar, aparte, una vista para leer

El diario es perfecto para **escribir** (hechos que solo se agregan, la verdad completa) y pésimo para **preguntar** por el estado actual. Así que ten **dos formas** de los mismos datos: el diario tal cual, y **una tabla aparte con el estado que quieres consultar**, que mantienes al día a medida que ocurren los hechos.

Una tabla `empresas_estado(id, deuda_pendiente, suspendida)`. Cada vez que un acto guarda hechos, **actualizas** en esa tabla el estado de esa empresa. Entonces la consulta del negocio vuelve a ser un `SELECT` simple — y correcto:

```sql
SELECT id FROM empresas_estado WHERE deuda_pendiente;
```

Ya no rejuegas nada: lees una fila por empresa, con su estado actual listo.

> [!NOTE]
> 🆕 **SQL: `INSERT ... ON CONFLICT ... DO UPDATE` (upsert).** Actualizar la vista es "si la empresa ya está en la tabla, cámbiala; si no, métela". Postgres lo hace en una sentencia: `INSERT INTO empresas_estado(...) VALUES(...) ON CONFLICT(id) DO UPDATE SET ...`. Así no tienes que preguntar antes si la fila existe.

> 🛠️ **Inténtalo tú.** (1) Crea la tabla `empresas_estado(id TEXT PRIMARY KEY, deuda_pendiente BOOL, suspendida BOOL)`. (2) Escribe una **proyección** `Morosas` con dos métodos: `Actualizar(id, empresa)` que hace el upsert del estado actual de esa empresa, y `Listar()` que devuelve los `id` con `deuda_pendiente`. (3) Créala una vez (`new Morosas(cadena)`, la **misma** base del `EventStore`) y pásala por el constructor a los handlers que cambian lo que la vista refleja —`SuspenderHandler` (crea morosas) y `PagarDeudaHandler` (las salda)—; como aún no tienes inyección de dependencias, la pasas a mano. En cada uno, **después** de `stream.Append(e)`, llama `morosas.Actualizar(cmd.EmpresaId, e)`. (4) La cobranza consulta con `morosas.Listar()`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Npgsql;

// La proyección: mantiene una vista de ESTADO ACTUAL, derivada de los hechos.
public class Morosas
{
    private readonly string _cadena;
    public Morosas(string cadena)
    {
        _cadena = cadena;
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"CREATE TABLE IF NOT EXISTS empresas_estado (
            id TEXT PRIMARY KEY, deuda_pendiente BOOL NOT NULL, suspendida BOOL NOT NULL);";
        cmd.ExecuteNonQuery();
    }

    // se llama tras guardar un acto: refleja el estado actual del agregado en la vista
    public void Actualizar(string id, Empresa e)
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"INSERT INTO empresas_estado(id, deuda_pendiente, suspendida)
                            VALUES(@id, @d, @s)
                            ON CONFLICT(id) DO UPDATE SET deuda_pendiente = @d, suspendida = @s";
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("d", e.DeudaPendiente);
        cmd.Parameters.AddWithValue("s", e.Suspendida);
        cmd.ExecuteNonQuery();
    }

    public List<string> Listar()   // las morosas, sin rejugar nada
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id FROM empresas_estado WHERE deuda_pendiente ORDER BY id";
        var ids = new List<string>();
        using var r = cmd.ExecuteReader();
        while (r.Read()) ids.Add(r.GetString(0));
        return ids;
    }
}
```

```csharp
// Los handlers que cambian lo que la vista refleja reciben también la proyección y,
// tras guardar, la actualizan. Siguen siendo ICommandHandler<T>: el Despachador no cambia.
public class SuspenderHandler(EventStore store, Morosas morosas) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.Suspender(cmd.Motivo);
        stream.Append(e);                       // 1) el hecho, al diario
        morosas.Actualizar(cmd.EmpresaId, e);   // 2) el estado, a la vista de lectura
    }
}

public class PagarDeudaHandler(EventStore store, Morosas morosas) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.RegistrarPago(cmd.Monto);
        e.Reactivar();
        stream.Append(e);
        morosas.Actualizar(cmd.EmpresaId, e);
    }
}
```

Y se arman una vez, pasando la misma proyección a cada uno (la inyección de dependencias que evita este cableado a mano llega más adelante):

```csharp
var cadena  = "Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres";
var store   = new EventStore(cadena);
var morosas = new Morosas(cadena);                       // misma base que el diario
var suspender = new SuspenderHandler(store, morosas);
var pagar     = new PagarDeudaHandler(store, morosas);
```
</details>

## Dos formas de los mismos datos

Corre los tres caminos sobre las mismas empresas:

```
SQL sobre los hechos  → emp-2, emp-3, emp-4   (MAL: emp-3 ya pagó)
Escaneo + replay      → emp-2, emp-4          (bien, pero rejuega todo)
morosas.Listar()      → emp-2, emp-4          (bien, y es un SELECT de una tabla)
```

Lo que construiste tiene nombre: un **read model** (o **proyección**). El **diario de eventos** es tu fuente de verdad —solo se agrega, guarda todo lo que pasó— y sirve para **escribir**. El **read model** es una vista **derivada** de esos hechos, con la forma exacta que una pregunta necesita, y sirve para **leer**. No compiten: la vista se puede **tirar y reconstruir** desde el diario cuando quieras, porque el diario tiene la verdad y la vista es solo una conveniencia para consultar.

> 🌱 Fíjate en tres cosas incómodas. **Una:** cada handler que cambia el estado tiene que **acordarse** de llamar `Actualizar` — si uno lo olvida, la vista miente sin avisar. **Dos:** el `Append` al diario y el `Actualizar` a la vista son **dos escrituras separadas** (transacciones distintas); si el proceso muere entre ellas, el diario queda adelantado y la vista atrás — y esta vez "acordarse" no basta. **Tres:** el día que el negocio pida **otra** vista —"cuántas empresas por plan"— esa tabla nace **vacía**; los hechos para llenarla ya están en el diario, pero "de ahora en adelante" pierde el pasado. Reconstruir una vista rejugando la historia —y mantenerla al día sin este acople frágil— es el próximo dolor.

---

### El Descubrimiento

El diario de eventos guarda **lo que pasó** (hechos, solo-agregar) y es la fuente de verdad, pero no responde "¿cuál es el estado **ahora**?" sin plegar toda la historia — por eso el `SELECT` directo miente y el escaneo rejuega todo. La cura fue tener **dos formas** de los mismos datos: el diario para escribir, y un **read model** —una tabla derivada, con la forma de la pregunta— para leer, que mantienes al día conforme ocurren los hechos. Es la primera vez que separas el lado de **escritura** del de **lectura**: dejaste de exprimir una sola estructura para las dos cosas.

---

## ✅ Compruébalo

- [ ] El `SELECT` ingenuo sobre `eventos` incluye una empresa que ya pagó; explica por qué (los hechos dicen lo que pasó, no el estado actual).
- [ ] `morosas.Listar()` devuelve las morosas correctas sin rehidratar ningún stream.
- [ ] Suspendes una empresa y `Listar()` la incluye; registras su pago y `Listar()` deja de incluirla — la vista sigue al día.
- [ ] Explica por qué el read model se puede **borrar y reconstruir** desde el diario sin perder nada.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿por qué "tiene deuda pendiente" no se puede sacar con un `SELECT` sobre la tabla de eventos, y sí de una tabla aparte que mantienes al escribir?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · La vista de lectura (read model)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El diario de eventos es la verdad para **escribir** pero no responde el estado actual sin plegar toda la historia; por eso se mantiene aparte un **read model** —una tabla derivada con la forma de la pregunta, actualizada al escribir— que se puede borrar y reconstruir desde el diario, y que separa por primera vez el lado de **lectura** del de **escritura**.

---

[⬅️ Volver: Todo o nada: el diario en una base de datos real](./todo-o-nada.md)

➡️ *Siguiente: el día que pidan otra vista, nace vacía y hay que reconstruirla rejugando toda la historia — ese dolor se vive a continuación, sin plano por delante ([método](../CRITTERWATCH-BRUJULA.md)).*
