# La pregunta que el diario no sabe responder

Ya tienes tus hechos en una base que sabe consultar. El negocio pide algo simple — "dame las empresas suspendidas" — y descubres que tu base, con todo su SQL, no puede.

## 🎯 El Objetivo

Responder "¿cuáles empresas están suspendidas **ahora**?" sin rejugar el diario entero en cada consulta.

## 💥 El dolor: el `SELECT` que miente, y el que cuesta

Operaciones quiere el listado de empresas suspendidas. Para probarlo, siembra unas cuantas con historias distintas — una activa, dos suspendidas, y una que se suspendió **pero volvió**:

```csharp
void sembrar(string id, Action<Empresa> hacer)
{
    var s = store.AbrirStream<Empresa>(id); var e = s.Get(); hacer(e); s.Append(e);
}
sembrar("emp-1", e => e.Registrar("Andes", "Básico"));
sembrar("emp-2", e => { e.Registrar("Beta", "Premium"); e.Suspender("falta de pago"); });
sembrar("emp-3", e => { e.Registrar("Gamma", "Básico"); e.Suspender("falta de pago"); });
sembrar("emp-3", e => { e.RegistrarPago(500); e.Reactivar(); });   // pagó y volvió a estar activa
sembrar("emp-4", e => { e.Registrar("Delta", "Enterprise"); e.Suspender("falta de pago"); });
```

Las suspendidas de verdad son **emp-2** y **emp-4**. Ahora, el listado. Tienes Postgres delante; tu instinto es un `SELECT` — las suspendidas tendrán su hecho `empresa-suspendida`, así que:

```sql
SELECT DISTINCT stream FROM eventos WHERE tipo = 'empresa-suspendida';
```

> 🔮 Antes de correrlo: tú mismo sembraste emp-3 con suspensión Y reactivación. ¿Qué ids crees que devuelve este SELECT? ¿Aparece emp-3?

```
emp-2, emp-3, emp-4
```

Sale **mal**: incluye a `emp-3`, que se suspendió… y después **se reactivó**. La consulta encontró el hecho `empresa-suspendida` en su diario, pero ese hecho dice lo que **pasó una vez**, no lo que es **verdad hoy**. "Estar suspendida" no es un evento: es el resultado de **plegar** toda la historia de la empresa (se suspende → sí; se reactiva → no). En el diario no hay una columna "suspendida"; hay hechos.

Bien, entonces hazlo bien: recorre **todas** las empresas y rehidrata cada una para ver su estado actual. Para eso, dale al `EventStore` un método que liste los ids (un `SELECT DISTINCT stream`):

```csharp
public List<string> TodosLosStreams()
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT DISTINCT stream FROM eventos ORDER BY stream";
    var ids = new List<string>();
    using var r = cmd.ExecuteReader();
    while (r.Read()) ids.Add(r.GetString(0));
    return ids;
}
```

Y recórrelas, rehidratando cada una:

```csharp
var suspendidas = new List<string>();
foreach (var id in store.TodosLosStreams())
    if (store.AbrirStream<Empresa>(id).Get().Suspendida)   // rehidrata (replay) y mira
        suspendidas.Add(id);
```

Ahora sí da bien (`emp-2`, `emp-4`). Pero mira lo que hiciste: para una sola pregunta, **rejugaste el diario completo de cada empresa que existe**. Con cuatro empresas de juguete no se nota; con diez mil y años de historia, cada "¿quiénes están suspendidas?" relee todo. Tienes un motor de consultas de primera al lado y, para la pregunta que importa, no te sirve — porque el estado actual vive **plegado** en los hechos, no en una columna que Postgres pueda filtrar.

## 🔧 Guardar, aparte, una vista para leer

El diario es perfecto para **escribir** (hechos que solo se agregan, la verdad completa) y pésimo para **preguntar** por el estado actual. Así que ten **dos formas** de los mismos datos: el diario tal cual, y **una tabla aparte con el estado que quieres consultar**, que mantienes al día a medida que ocurren los hechos.

Una tabla `empresas_estado(id, suspendida)`. Cada vez que un acto guarda hechos, **actualizas** en esa tabla el estado de esa empresa. Entonces la consulta del negocio vuelve a ser un `SELECT` simple — y correcto:

```sql
SELECT id FROM empresas_estado WHERE suspendida;
```

Ya no rejuegas nada: lees una fila por empresa, con su estado actual listo.

> [!NOTE]
> 🆕 **SQL: `INSERT ... ON CONFLICT ... DO UPDATE` (upsert).** Actualizar la vista es "si la empresa ya está en la tabla, cámbiala; si no, métela". Postgres lo hace en una sentencia: `INSERT INTO empresas_estado(...) VALUES(...) ON CONFLICT(id) DO UPDATE SET ...`. Así no tienes que preguntar antes si la fila existe.

> 🛠️ **Inténtalo tú.** (1) Crea la tabla `empresas_estado(id TEXT PRIMARY KEY, suspendida BOOL NOT NULL)`. (2) Escribe una **proyección** `Suspendidas` con dos métodos: `Actualizar(id, empresa)` que hace el upsert del estado actual de esa empresa, y `Listar()` que devuelve los `id` con `suspendida`. (3) Créala una vez (`new Suspendidas(cadena)`, la **misma** base del `EventStore`) y pásala por el constructor a los handlers que cambian lo que la vista refleja —`SuspenderHandler` (suspende) y `PagarDeudaHandler` (reactiva)—; como aún no tienes inyección de dependencias, la pasas a mano. En cada uno, **después** de `stream.Append(e)`, llama `vista.Actualizar(cmd.EmpresaId, e)`. (4) La consulta de operaciones usa `vista.Listar()`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Npgsql;

// La proyección: mantiene una vista de ESTADO ACTUAL, derivada de los hechos.
public class Suspendidas
{
    private readonly string _cadena;

    public Suspendidas(string cadena)
    {
        _cadena = cadena;
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"CREATE TABLE IF NOT EXISTS empresas_estado (
            id TEXT PRIMARY KEY, suspendida BOOL NOT NULL);";
        cmd.ExecuteNonQuery();
    }

    // se llama tras guardar un acto: refleja el estado actual del agregado en la vista
    public void Actualizar(string id, Empresa e)
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"INSERT INTO empresas_estado(id, suspendida)
                            VALUES(@id, @s)
                            ON CONFLICT(id) DO UPDATE SET suspendida = @s";
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("s", e.Suspendida);
        cmd.ExecuteNonQuery();
    }

    public List<string> Listar()   // las suspendidas, sin rejugar nada
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id FROM empresas_estado WHERE suspendida ORDER BY id";
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
public class SuspenderHandler(EventStore store, Suspendidas vista) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.Suspender(cmd.Motivo);
        stream.Append(e);                     // 1) el hecho, al diario
        vista.Actualizar(cmd.EmpresaId, e);   // 2) el estado, a la vista de lectura
    }
}

public class PagarDeudaHandler(EventStore store, Suspendidas vista) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.RegistrarPago(cmd.Monto);
        e.Reactivar();
        stream.Append(e);
        vista.Actualizar(cmd.EmpresaId, e);
    }
}
```

Y se arman una vez, pasando la misma proyección a cada uno (la inyección de dependencias que evita este cableado a mano llega más adelante):

```csharp
var cadena = "Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres";
var store  = new EventStore(cadena);
var vista  = new Suspendidas(cadena);                    // misma base que el diario
var suspender = new SuspenderHandler(store, vista);
var pagar     = new PagarDeudaHandler(store, vista);
```
</details>

## La vista arranca ciega

Corre los tres caminos sobre las empresas que sembraste, y mira el tercero:

```
SQL sobre los hechos  → emp-2, emp-3, emp-4   (MAL: emp-3 se reactivó)
Escaneo + replay      → emp-2, emp-4          (bien, pero rejuega todo)
vista.Listar()        →                       ← ¡vacío!
```

La vista no miente: **está ciega**. Esas empresas se sembraron **antes** de que la vista existiera, y la siembra escribió los hechos al diario **sin llamar `Actualizar`**. La vista solo sabe de lo que pasó **desde que ella existe y a través de quien la actualiza**.

Compruébalo: siembra otra empresa suspendida, esta vez **proyectando** (una línea más, la misma que hacen los handlers):

```csharp
void sembrar(string id, Action<Empresa> hacer)
{
    var s = store.AbrirStream<Empresa>(id); var e = s.Get(); hacer(e); s.Append(e);
    vista.Actualizar(id, e);            // ← lo que le faltaba
}
sembrar("emp-5", e => { e.Registrar("Epsilon", "Básico"); e.Suspender("falta de pago"); });
```

```
vista.Listar()        → emp-5          (bien, y es un SELECT de una tabla)
```

Ahora sí responde — y responde **rápido**, sin rejugar nada. Para que incluya también a `emp-2` y `emp-4` tendrías que **rejugar su historia** hacia la vista; por ahora, borra las dos tablas y vuelve a sembrar todo con la versión que proyecta.

## Dos formas de los mismos datos

Lo que construiste tiene nombre: un **read model** (o **proyección**). El **diario de eventos** es tu fuente de verdad —solo se agrega, guarda todo lo que pasó— y sirve para **escribir**. El **read model** es una vista **derivada** de esos hechos, con la forma exacta que una pregunta necesita, y sirve para **leer**. No compiten: la vista se puede **tirar y reconstruir** desde el diario cuando quieras, porque el diario tiene la verdad y la vista es solo una conveniencia para consultar.

> 🌱 Fíjate en tres cosas incómodas. **Una:** ya la sufriste — cada quien que escribe tiene que **acordarse** de llamar `Actualizar`; la siembra se olvidó y la vista quedó ciega a esas empresas, sin un solo aviso. **Dos:** el `Append` al diario y el `Actualizar` a la vista son **dos escrituras separadas** (transacciones distintas); si el proceso muere entre ellas, el diario queda adelantado y la vista atrás — y esta vez "acordarse" no basta. **Tres:** para que la vista incluya a las empresas de antes hay que **rejugar su historia** hacia ella; y lo mismo pasará el día que el negocio le pida un dato más. Reconstruir una vista rejugando la historia —y mantenerla al día sin este acople frágil— es el próximo dolor.

---

### El Descubrimiento

El diario de eventos guarda **lo que pasó** (hechos, solo-agregar) y es la fuente de verdad, pero no responde "¿cuál es el estado **ahora**?" sin plegar toda la historia — por eso el `SELECT` directo miente y el escaneo rejuega todo. La cura fue tener **dos formas** de los mismos datos: el diario para escribir, y un **read model** —una tabla derivada, con la forma de la pregunta— para leer, que mantienes al día conforme ocurren los hechos. Es la primera vez que separas el lado de **escritura** del de **lectura**: dejaste de exprimir una sola estructura para las dos cosas.

---

## ✅ Compruébalo

- [ ] El `SELECT` ingenuo sobre `eventos` incluye una empresa que ya se reactivó; explica por qué (los hechos dicen lo que pasó, no el estado actual).
- [ ] Con la vista recién creada, `Listar()` sale **vacío** aunque el diario tenga suspendidas — y explicas por qué.
- [ ] Siembras proyectando (o rehaces la siembra) y `Listar()` devuelve las suspendidas correctas, sin rehidratar ningún stream.
- [ ] Suspendes una empresa y `Listar()` la incluye; registras su pago (que la reactiva) y `Listar()` deja de incluirla — la vista sigue al día.
- [ ] Explica por qué el read model se puede **borrar y reconstruir** desde el diario sin perder nada.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

Primero, deja en tu `DECISIONES.md` la micro-decisión de hoy — y al lado, el riesgo que aceptaste con ese "tras":

> Actualizo la vista DENTRO del handler, justo tras el `Append` — y acepto que son dos escrituras separadas.

> 💭 **Reto:** ¿por qué "está suspendida" no se puede sacar con un `SELECT` sobre la tabla de eventos, y sí de una tabla aparte que mantienes al escribir?

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

[➡️ Siguiente: Rejugar el diario: reconstruir la vista](./reconstruir-la-vista.md)
