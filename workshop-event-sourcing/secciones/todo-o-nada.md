# Todo o nada: el diario en una base de datos real

Mata el proceso justo a la mitad de pagar-y-reactivar. La empresa **pagó** — y sigue **suspendida**. Un estado que el negocio jamás debió poder ver.

## 🎯 El Objetivo

Que una acción de **varios hechos** sea **todo o nada**: si algo revienta a la mitad, no queda media acción grabada en el diario.

## 💥 El dolor: media acción congelada

El acto pagar-y-reactivar produce **dos** hechos, y ahora que el diario vive en disco tu `Append` los escribe uno por uno — dos `File.AppendAllText` seguidos. ¿Y si el proceso muere **entre** ellos? Fuérzalo (un `throw` que simula corte de luz / `kill -9` **después** del primer hecho):

```csharp
// dentro del Append, en el bucle que escribe cada hecho — solo para ver el dolor:
foreach (var hecho in agg.SinConfirmar)
{
    _store.AppendEvent(_aggregateId, new EventoAlmacenado(++_version, hecho));
    if (hecho is PagoRegistrado) throw new Exception("💥 corte de luz");   // muere tras el pago
}
```

Corre el acto sobre una empresa morosa y reinicia. El `.log` quedó a medias (muestro sus últimas líneas):

```json
…
{"Version":2,"Tipo":"empresa-suspendida","Datos":{"Motivo":"falta de pago"}}
{"Version":3,"Tipo":"pago-registrado","Datos":{"Monto":500}}
```

El `pago-registrado` está; la `empresa-reactivada` no. Al rehidratar: `Suspendida=True, DeudaPendiente=False` — el cliente **pagó** y el sistema lo dejó **afuera**. Y no es un caso raro de laboratorio: cualquier despliegue, corte de luz o `kill` a mitad de camino lo produce.

## La cura ingenua que **no** alcanza

Intentas hacerlo atómico a mano sobre el archivo:

- **Escribir las dos líneas de una sola vez** (un `File.AppendAllText` con todo el texto): mejor —la ventana se achica— pero el sistema operativo aún puede escribir a medias ante un corte real, y no hay forma de garantizar "las dos o ninguna".
- **Escribir a un temporal y renombrar** (`rename` es atómico): te da atomicidad de **un** archivo, pero no aislamiento (un lector puede ver el estado a medias), ni forma de deshacer si el segundo hecho falla, ni control si **dos** procesos tocan la misma empresa.
- **Un archivo de "pendientes"** que confirmas al final: acabas de empezar a reinventar —y mal— un **log de transacciones**.

Cada intento choca contra lo mismo: "las dos o ninguna", de verdad, es una **transacción**, y un archivo de texto no las tiene.

> 💡 Seguro lo pensaste hace varias secciones: *"a estas alturas nadie guarda esto en un archivo de texto"*. Tenías razón — y era a propósito. El archivo fue la lente más simple para ver desnudos los problemas de fondo (el tipo es un contrato, la acción de varios hechos) sin una base de datos tapando la mecánica. Este —la atomicidad— es el que el archivo **no puede**. Es hora de una base de datos real.

## 🔧 Mudar el diario a Postgres (a mano)

No cambias tu motor: la `Empresa`, los handlers, incluso el `EventStream.Get()` siguen igual. Cambia el **almacén** por dentro (de un archivo a una base con transacciones) y el **`Append`** (que ahora guarda todos los hechos del acto de un tirón). Y lo haces **a mano**, con SQL crudo, para ver exactamente qué te da la base — aún **no** una librería de event sourcing: solo una base de datos que sabe hacer "todo o nada".

### Paso 1 · Levanta Postgres

Ya usaste Docker en el taller de DevOps; aquí es un comando:

```bash
docker run -d --name empresas-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

Baja Postgres 16 y lo deja escuchando en el puerto 5432. Compruébalo:

```bash
docker exec empresas-db pg_isready -U postgres      # → /var/run/postgresql:5432 - accepting connections
```

(El comando es igual en Windows, macOS y Linux. `postgres/postgres` son credenciales **solo de desarrollo**.)

### Paso 2 · El driver para hablar con Postgres desde C#

```bash
dotnet add package Npgsql --version 10.0.3
```

### Paso 3 · El diario, ahora una tabla

Una tabla **append-only**: una fila por hecho. Fíjate que la fila **es el sobre** que llevabas en memoria — `version` y los `datos` (en una columna **`JSONB`**, JSON que Postgres entiende y consulta) son las dos partes del `EventoAlmacenado`. Por eso el formato de línea del archivo (`EnDisco`) desaparece: las columnas lo reemplazan.

```sql
CREATE TABLE IF NOT EXISTS eventos (
    stream  TEXT  NOT NULL,
    version INT   NOT NULL,
    tipo    TEXT  NOT NULL,
    datos   JSONB NOT NULL,
    PRIMARY KEY (stream, version)
);
```

Ese `PRIMARY KEY (stream, version)` es la clave: **la concurrencia optimista que armaste a mano, ahora impuesta por la base**. Tu `EventStream` sigue recordando en qué versión cargó (`_version`) y numera cada hecho desde ahí, igual que antes. Al insertar, si esa versión **ya está tomada** —alguien escribió mientras trabajabas—, Postgres rechaza la fila con un error de clave duplicada; lo atrapas y lanzas tu `ConcurrencyException` de siempre. El detector de conflictos no desaparece: se muda del `if` que escribiste a mano al `PRIMARY KEY`.

> [!NOTE]
> 🆕 **Idioma de C#: Npgsql y la transacción.**
> - `new NpgsqlConnection(cadena)` + `.Open()` abre la conexión; la `cadena` dice dónde está la base.
> - `conn.BeginTransaction()` abre una **transacción**: todo lo que hagas dentro entra **junto** al hacer `tx.Commit()`, o **nada** si no llegas a confirmar (rollback). Ese "todo o nada" es lo que el archivo no tenía.
> - Un `NpgsqlCommand` lleva el SQL con parámetros (`@s`, `@v`…); `AddWithValue("s", …)` los rellena (el nombre va **sin** `@`), y `@d::jsonb` le dice a Postgres "este texto es JSON".
> - Postgres lanza `PostgresException`; su `SqlState == "23505"` significa "clave duplicada".

> 🛠️ **Inténtalo tú.** El `EventStream` cambia solo en `Append` (el `Get()` queda igual); el `EventStore` se reescribe por dentro; la `Empresa`, los handlers y el sobre `EventoAlmacenado` **no se tocan** (el sobre ahora es la fila). (1) En el constructor del store, crea la tabla si no existe. (2) `GetEvents(id)`: un `SELECT version, tipo, datos ... ORDER BY version`, devolviendo la lista de **sobres** (`EventoAlmacenado`), deserializando cada `datos` a su clase con el mapa de nombres estables. (3) `Guardar(id, sobres)`: inserta **todos** los sobres del acto **dentro de una sola transacción**; si el `INSERT` choca con el `PRIMARY KEY` (`SqlState 23505`), lanza `ConcurrencyException`. (4) `EventStream.Append`: arma los sobres numerando desde `_version` (como venías haciendo) y llama a `Guardar`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Text.Json;
using Npgsql;

public class EventStore
{
    // el mapa de nombres estables: igual que antes (nombre en disco → clase)
    private static readonly Dictionary<string, Type> _porNombre = new()
    {
        ["empresa-registrada"] = typeof(EmpresaRegistrada),
        ["plan-cambiado"]      = typeof(PlanCambiado),
        ["empresa-suspendida"] = typeof(EmpresaSuspendida),
        ["pago-registrado"]    = typeof(PagoRegistrado),
        ["empresa-reactivada"] = typeof(EmpresaReactivada),
    };
    private static string NombreDe(Type tipo)
    {
        foreach (var par in _porNombre)
            if (par.Value == tipo) return par.Key;
        throw new InvalidOperationException($"Evento sin nombre estable: {tipo.Name}");
    }

    private readonly string _cadena;

    public EventStore(string cadena)
    {
        _cadena = cadena;
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"CREATE TABLE IF NOT EXISTS eventos (
            stream TEXT NOT NULL, version INT NOT NULL, tipo TEXT NOT NULL, datos JSONB NOT NULL,
            PRIMARY KEY (stream, version));";
        cmd.ExecuteNonQuery();
    }

    public List<EventoAlmacenado> GetEvents(string id)
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT version, tipo, datos FROM eventos WHERE stream = @s ORDER BY version";
        cmd.Parameters.AddWithValue("s", id);
        var sobres = new List<EventoAlmacenado>();
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            var hecho = JsonSerializer.Deserialize(r.GetString(2), _porNombre[r.GetString(1)])!;
            sobres.Add(new EventoAlmacenado(r.GetInt32(0), hecho));
        }
        return sobres;
    }

    // Todos los sobres del acto, en UNA transacción: todo o nada.
    public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var tx = c.BeginTransaction();
        try
        {
            foreach (var sobre in sobres)
            {
                using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES(@s, @v, @t, @d::jsonb)";
                cmd.Parameters.AddWithValue("s", id);
                cmd.Parameters.AddWithValue("v", sobre.Version);
                cmd.Parameters.AddWithValue("t", NombreDe(sobre.EventData.GetType()));
                cmd.Parameters.AddWithValue("d", JsonSerializer.Serialize(sobre.EventData, sobre.EventData.GetType()));
                cmd.ExecuteNonQuery();
            }
            tx.Commit();   // aquí, y solo aquí, entran los hechos — todos juntos
        }
        catch (PostgresException e) when (e.SqlState == "23505")   // versión ya ocupada
        {
            throw new ConcurrencyException($"Alguien escribió primero en '{id}' — recarga y reintenta.");
        }
    }

    public EventStream<T> AbrirStream<T>(string id) where T : AggregateRoot, new() => new(this, id);
}
```

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly EventStore _store;
    private readonly string _aggregateId;
    private int _version;
    public EventStream(EventStore store, string id) { _store = store; _aggregateId = id; }

    public T Get()   // igual que antes: rehidrata y recuerda en qué versión cargó
    {
        var entidad = new T();
        var sobres = _store.GetEvents(_aggregateId);
        entidad.Load(sobres.Select(s => s.EventData));
        _version = sobres.Count;
        return entidad;
    }

    public void Append(T agg)
    {
        var sobres = new List<EventoAlmacenado>();
        foreach (var hecho in agg.SinConfirmar)
            sobres.Add(new EventoAlmacenado(++_version, hecho));   // numera desde la versión cargada
        _store.Guardar(_aggregateId, sobres);                      // una transacción
        agg.MarcarConfirmados();
    }
}
```
</details>

## Ponlo a prueba

La base nace **vacía** (los datos del archivo no se migran), así que primero siembra la morosa. La conexión se arma con una cadena (dev); `postgres` es la base por defecto del contenedor:

```csharp
var store = new EventStore("Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres");

// sembrar una empresa morosa (registrada + suspendida), en un solo acto
var s = store.AbrirStream<Empresa>("emp-7");
var e = s.Get();
e.Registrar("Constructora Andes", "Básico");
e.Suspender("falta de pago");
s.Append(e);
```

**Prueba 1 — el rollback (todo o nada).** Añade **temporalmente** un `throw` justo antes del `tx.Commit()` en `Guardar` (`throw new Exception("💥");`) y corre el acto pagar-y-reactivar:

```csharp
var stream = store.AbrirStream<Empresa>("emp-7");
var emp = stream.Get();
emp.RegistrarPago(500);
emp.Reactivar();
stream.Append(emp);          // el 💥 salta dentro de Guardar, antes del Commit
```

Mira la tabla:

```bash
docker exec empresas-db psql -U postgres -c "SELECT version, tipo FROM eventos WHERE stream='emp-7' ORDER BY version"
```

Siguen **solo 2 filas** (registrada, suspendida): como nunca llegaste al `Commit`, Postgres descartó el pago. La empresa quedó **igual que antes del acto** — morosa y suspendida, sin media acción. **Quita el `throw`** y corre de nuevo: ahora el acto entra **entero** (4 filas; `DeudaPendiente=False`, `Suspendida=False`). Eso es lo que el archivo no podía darte.

**Prueba 2 — la concurrencia, gratis.** Como ya viste con dos escritores a la vez, ambos cargan la misma empresa e intentan guardar:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");  var ea = a.Get();   // ambos cargan
var b = store.AbrirStream<Empresa>("emp-7");  var eb = b.Get();   // en la misma versión
ea.CambiarPlan("Premium"); a.Append(ea);      // A entra
eb.CambiarPlan("Enterprise"); b.Append(eb);   // B trae una versión ya ocupada → 💥 ConcurrencyException
```

`b.Append` lanza `ConcurrencyException`: B cargó en la misma versión que A, A escribió primero, y el `PRIMARY KEY` rechazó la fila de B. No tuviste que escribir la verificación: la base la hace.

> 🌱 Abre la tabla y mírala: tus hechos están ahí, en una base que **sabe consultar**. El negocio pide "dame **todas** las empresas con deuda pendiente ahora mismo". Tu instinto: `SELECT ... WHERE deuda`. Pero `datos` es JSONB opaco y "tiene deuda" no es una columna: es algo que sale de **rejugar** los hechos de cada empresa. Tienes un motor de consultas al lado y no puedes preguntarle lo que el negocio quiere. Ese es el próximo dolor.

---

### El Descubrimiento

La acción de varios hechos escondía un segundo problema que el archivo no dejaba resolver: no era **atómica**. Un corte a la mitad grababa media acción —el cliente pagaba y quedaba suspendido— y ningún truco sobre archivos (rename, buffer, pendientes) da "las dos o ninguna" de verdad; eso es una **transacción**. Mudar el diario a Postgres **a mano** —una tabla append-only, `JSONB`, un `BEGIN/COMMIT` por acto— lo resuelve, y de paso el `PRIMARY KEY(stream, version)` **hereda** la concurrencia optimista que armaste a mano: el `_version` que capturas al cargar sigue mandando, solo que ahora quien rechaza la versión repetida es la base. No adoptaste ninguna librería de event sourcing: reconociste que "todo o nada" y "un solo escritor gana" pertenecen a una base de datos, no a tu código.

---

## ✅ Compruébalo

- [ ] `docker exec empresas-db pg_isready -U postgres` responde *accepting connections*.
- [ ] Con el `throw` antes del `Commit`, corres el acto y la consulta `SELECT ... FROM eventos` muestra **solo** los eventos previos — cero media acción. Sin el `throw`, entran los dos hechos del acto.
- [ ] Reproduces la **Prueba 2**: el segundo escritor lanza `ConcurrencyException` por el `PRIMARY KEY`.
- [ ] Explica, con tus palabras, por qué un `File.AppendAllText` (o dos) no puede darte "todo o nada" y una transacción sí.
- [ ] Explica de dónde salió tu `_version`, y qué hace ahora el `PRIMARY KEY(stream, version)` con él.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿qué es exactamente lo que un archivo de texto no puede darte y una base de datos sí, y por qué eso importaba justo para una acción de dos hechos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Todo o nada: el diario en una base de datos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Una acción de varios hechos tiene que ser **todo o nada** —a prueba de caídas y de escritores concurrentes—, y eso es una **transacción**, que un archivo no tiene: por eso el diario se muda a Postgres **a mano** (tabla append-only + `JSONB` + `BEGIN/COMMIT`), donde el `PRIMARY KEY(stream, version)` hereda la concurrencia optimista que armaste a mano, sin adoptar todavía ninguna librería.

---

[⬅️ Volver: El nombre del hecho es un contrato](./el-nombre-es-un-contrato.md)

[➡️ Siguiente: La pregunta que el diario no sabe responder](./la-vista-de-lectura.md)
