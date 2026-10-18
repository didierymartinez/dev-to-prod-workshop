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

El `pago-registrado` está; la `empresa-reactivada` no. Al rehidratar: `Suspendida=True, DeudaPendiente=False` — el cliente **pagó** y el sistema lo dejó **afuera**. Cualquier despliegue, corte de luz o `kill` a mitad de camino lo produce.

## La cura ingenua que **no** alcanza

Intentas hacerlo atómico a mano sobre el archivo:

- **Escribir las dos líneas de una sola vez**: la ventana se achica, pero ante un corte real el sistema operativo aún puede escribir a medias.
- **Escribir a un temporal y renombrar** (`rename` es atómico): atomicidad de **un** archivo, pero un lector puede ver el estado a medias, no hay forma de deshacer si el segundo hecho falla, y nada controla a **dos** procesos sobre la misma empresa.
- **Un archivo de "pendientes"** que confirmas al final: es empezar a reinventar, mal, un **log de transacciones**.

Cada intento choca contra lo mismo: "las dos o ninguna", de verdad, es una **transacción**, y un archivo de texto no las tiene.

> 💡 El archivo fue a propósito: la lente más simple para ver los problemas de fondo (el tipo es un contrato, la acción de varios hechos) sin una base de datos tapando la mecánica. La atomicidad es lo que el archivo **no puede** dar. Es hora de una base de datos real.

## 🔧 Mudar el diario a Postgres (a mano)

Lo haces **a mano**, con SQL crudo, para ver qué te da la base: aún **no** una librería de event sourcing, solo una base de datos que sabe hacer "todo o nada".

### Paso 1 · Levanta Postgres

Un solo comando:

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

Una tabla **append-only**: una fila por hecho. La fila **es el sobre** que llevabas en memoria: `version` y `datos` (en una columna **`JSONB`**, JSON que Postgres entiende y consulta) son las dos partes del `EventoAlmacenado`. El formato de línea del archivo (`EnDisco`) desaparece: las columnas lo reemplazan.

```sql
CREATE TABLE IF NOT EXISTS eventos (
    stream  TEXT  NOT NULL,
    version INT   NOT NULL,
    tipo    TEXT  NOT NULL,
    datos   JSONB NOT NULL,
    PRIMARY KEY (stream, version)
);
```

Ese `PRIMARY KEY (stream, version)` es **la concurrencia optimista que armaste a mano, ahora impuesta por la base**. Tu `EventStream` sigue numerando cada hecho desde la versión que cargó (`_version`). Si al insertar esa versión **ya está tomada** (alguien escribió mientras trabajabas), Postgres rechaza la fila con un error de clave duplicada; lo atrapas y lanzas tu `ConcurrencyException` de siempre.

> [!NOTE]
> 🆕 **Idioma de C#: Npgsql y la transacción.**
> - `new NpgsqlConnection(cadena)` + `.Open()` abre la conexión; la `cadena` dice dónde está la base.
> - `conn.BeginTransaction()` abre una **transacción**: todo lo que hagas dentro entra **junto** al hacer `tx.Commit()`, o **nada** si no llegas a confirmar (rollback).
> - Un `NpgsqlCommand` lleva el SQL con parámetros (`@s`, `@v`…); `AddWithValue("s", …)` los rellena (el nombre va **sin** `@`), y `@d::jsonb` le dice a Postgres "este texto es JSON".
> - Postgres lanza `PostgresException`; su `SqlState == "23505"` significa "clave duplicada".

> 🛠️ **Inténtalo tú.** El `EventStream` cambia solo en `Append` (el `Get()` queda igual); el `EventStore` se reescribe por dentro; la `Empresa`, los handlers y el sobre `EventoAlmacenado` **no se tocan** (el sobre ahora es la fila). (1) En el constructor del store, crea la tabla si no existe. (2) `GetEvents(id)`: un `SELECT version, tipo, datos ... ORDER BY version`, devolviendo la lista de **sobres** (`EventoAlmacenado`), deserializando cada `datos` a su clase con el mapa de nombres estables. (3) `Guardar(id, sobres)`: inserta **todos** los sobres del acto **dentro de una sola transacción**; si el `INSERT` choca con el `PRIMARY KEY` (`SqlState 23505`), lanza `ConcurrencyException`. (4) `EventStream.Append`: arma los sobres numerando desde `_version` (como venías haciendo) y llama a `Guardar`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// using Npgsql;  → en la primera línea del Program.cs, junto al using System.Text.Json; (no aquí)

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

Corre una vez y 🔁 comenta la siembra: `emp-7` ya quedó sembrada, y si la siembra corre otra vez agrega un segundo `EmpresaRegistrada`.

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

Siguen **solo 2 filas** (registrada, suspendida): como nunca llegaste al `Commit`, Postgres descartó el pago, y la empresa quedó **igual que antes del acto**. **Quita el `throw`** y corre de nuevo: ahora el acto entra **entero** (4 filas; `DeudaPendiente=False`, `Suspendida=False`).

La letra pequeña: el todo-o-nada cubre solo lo que viaja DENTRO de la transacción. El día que un acto, además de grabarse, tenga que avisarle a algo que vive FUERA de la base, va a doler.

**Prueba 2 — la concurrencia, gratis.** Cada prueba corre sola: la excepción de una corta el programa antes de la siguiente. 🔁 Comenta el acto de la Prueba 1 y pega este, donde dos escritores cargan la misma empresa e intentan guardar:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");  var ea = a.Get();   // ambos cargan
var b = store.AbrirStream<Empresa>("emp-7");  var eb = b.Get();   // en la misma versión
ea.CambiarPlan("Premium"); a.Append(ea);      // A entra
eb.CambiarPlan("Enterprise"); b.Append(eb);   // B trae una versión ya ocupada → 💥 ConcurrencyException
```

`b.Append` lanza `ConcurrencyException`: B cargó en la misma versión que A, A escribió primero, y el `PRIMARY KEY` rechazó la fila de B. No tuviste que escribir la verificación: la base la hace.

**Prueba 3 — nacer dos veces.** La Prueba 2 protegió una empresa que **ya existía**. ¿Y una que aún no? 🔁 Comenta la Prueba 2. Ahora dos escritores abren un stream **virgen** y ambos lo registran (córrelo una sola vez y luego coméntalo: repetido, `emp-9` ya existe y el primer `Registrar` entra como versión 2):

```csharp
var v1 = store.AbrirStream<Empresa>("emp-9");  var e1 = v1.Get();   // no existe → versión 0
var v2 = store.AbrirStream<Empresa>("emp-9");  var e2 = v2.Get();   // versión 0 también
e1.Registrar("Andes-1", "Básico"); v1.Append(e1);   // el primer nacimiento entra en versión 1
e2.Registrar("Andes-2", "Básico"); v2.Append(e2);   // el segundo trae la versión 1 ya ocupada → 💥 ConcurrencyException
```

El segundo nacimiento choca igual: ambos cargaron un stream vacío (versión 0) y ambos intentaron escribir la **versión 1**. `emp-9` queda con **una sola fila**: el `PRIMARY KEY` protege también el **nacimiento** del stream. Pero solo dentro de un mismo **id**. Dos empresas **distintas** con el mismo NIT bajo ids distintos (`emp-9` y `emp-42`) no chocan. Ese dolor queda abierto.

## 🔨 Rómpelo: la contraseña que git no olvida

Tu `Program.cs` tiene la contraseña de Postgres escrita en el código. Haz commit así, sin `push` todavía:

```bash
git add .
git commit -m "ES · Todo o nada: Postgres a mano, con la cadena en el código"
```

Ahora busca la contraseña en tu historial:

```bash
git log -p -S "Password="
```

`-S` busca los commits que agregan o quitan ese texto, y `-p` muestra el cambio de cada uno (sal con `q`). Aparece tu commit, con la línea entera:

```
+var store = new EventStore("Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres");
```

Quien clone tu repo puede leer esa línea, y el `git push` del cierre la subiría al remoto. (Los comandos de `git` son iguales en bash y en PowerShell.)

## 🔧 La cadena llega de afuera

La cadena llega en una **variable de entorno**: un valor con nombre que la terminal le pasa a cada programa que arrancas desde ella. En todo el taller se llama `CADENA_POSTGRES`.

> [!NOTE]
> 🆕 **Idioma de C#: leer una variable de entorno, y `?? throw`.**
> - `Environment.GetEnvironmentVariable("CADENA_POSTGRES")` devuelve el valor de la variable, o `null` si no está fijada.
> - `a ?? b` vale `a`; si `a` es `null`, vale `b`.
> - `?? throw new InvalidOperationException("…")` lanza cuando lo de su izquierda es `null`: el programa se detiene en su primera línea, no a la mitad de un acto.

> 🛠️ **Inténtalo tú.** Quieres esto al correr:
>
> ```
> dotnet run    # sin la variable → InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.
> dotnet run    # con la variable → corre contra la misma base que con la cadena escrita
> ```
>
> Haz que funcione. En `Program.cs`, cambia el literal por una variable `cadena` que lea `CADENA_POSTGRES`. Si llega `null`, lanza una `InvalidOperationException` cuyo mensaje nombre la variable. Pásale `cadena` a `new EventStore(...)`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
    ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
var store = new EventStore(cadena);
```
</details>

Corre sin fijar la variable. El programa se detiene antes de tocar la base:

```
Unhandled exception. System.InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.
```

Ahora fíjala en tu terminal y corre otra vez. En bash (macOS/Linux):

```bash
export CADENA_POSTGRES="Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres"
dotnet run
```

En PowerShell (Windows):

```powershell
$env:CADENA_POSTGRES = "Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres"
dotnet run
```

El programa corre igual: la misma base, las mismas filas en `eventos`. Pon las comillas: sin ellas, bash corta la cadena en el primer `;` y Npgsql lanza `No password has been provided but the backend requires one`. La variable vive solo en esa terminal; en una nueva, la fijas otra vez.

### La contraseña sigue en el historial

`git grep` busca en tus archivos, y `git log` en el historial:

```bash
git grep "Password="          # → nada
git log -p -S "Password="     # → el commit del 🔨, con la contraseña entera
```

Borrarla del archivo no la sacó de git: el commit de antes la guarda, y un `push` sube todo el historial. Por eso, en un repo real, un secreto que tocó git se **rota**: se le cambia la contraseña a la base, y la que quedó en el historial ya no abre nada. Aquí es la clave de un Postgres local de pruebas, así que sigue y haz tu `push`; el hábito es el mismo.

> 🌱 Tus hechos están en una base que **sabe consultar**. El negocio pide "dame **todas** las empresas suspendidas ahora mismo", y tu instinto es `SELECT ... WHERE suspendida`. Pero `datos` es JSONB opaco y "está suspendida" no es una columna: sale de **rejugar** los hechos de cada empresa. Ese es el próximo dolor.

---

### El Descubrimiento

La acción de varios hechos no era **atómica**: un corte a la mitad grababa media acción, y ningún truco sobre archivos da "las dos o ninguna" de verdad; eso es una **transacción**. Mudar el diario a Postgres **a mano** (una tabla append-only, `JSONB`, un `BEGIN/COMMIT` por acto) lo resuelve, y el `PRIMARY KEY(stream, version)` **hereda** tu concurrencia optimista: el `_version` que capturas al cargar sigue mandando, pero quien rechaza la versión repetida es la base. No adoptaste ninguna librería de event sourcing: reconociste que "todo o nada" y "un solo escritor gana" pertenecen a una base de datos, no a tu código. Y la cadena salió del código a `CADENA_POSTGRES`: un secreto que tocó git no se borra, se rota.

---

## ✅ Compruébalo

- [ ] `docker exec empresas-db pg_isready -U postgres` responde *accepting connections*.
- [ ] Con el `throw` antes del `Commit`, corres el acto y la consulta `SELECT ... FROM eventos` muestra **solo** los eventos previos — cero media acción. Sin el `throw`, entran los dos hechos del acto.
- [ ] Reproduces la **Prueba 2**: el segundo escritor lanza `ConcurrencyException` por el `PRIMARY KEY`.
- [ ] Reproduces la **Prueba 3**: dos nacimientos del mismo id virgen chocan; el stream queda con **una** fila.
- [ ] Explica de dónde salió tu `_version`, y qué hace ahora el `PRIMARY KEY(stream, version)` con él.
- [ ] Sin `CADENA_POSTGRES`, `dotnet run` se detiene al arrancar con `InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.` Con la variable fijada, corre contra la misma base.
- [ ] `git grep "Password="` ya no encuentra nada en tus archivos, pero `git log -p -S "Password="` todavía muestra la contraseña en el commit del 🔨. Explica por qué eso obliga a rotarla, y por qué no basta con borrarla del archivo.

---

## 🆘 Si algo salió mal

- **Fijaste la variable y el programa no la ve:** lo corres desde el IDE, que no ve las variables de tu terminal. Córrelo con `dotnet run` desde la terminal donde la fijaste.
- **`git log -p -S "Password="` no muestra nada:** hiciste la cura antes del commit del 🔨, y la contraseña nunca entró a git. En un repo real, eso es lo que quieres.

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

Una acción de varios hechos tiene que ser **todo o nada**, y eso es una **transacción**, que un archivo no tiene: por eso el diario se muda a Postgres **a mano**, donde el `PRIMARY KEY(stream, version)` hereda tu concurrencia optimista. La cadena de conexión llega de una variable de entorno, porque un secreto que tocó git no se borra: se rota.

---

[⬅️ Volver: El nombre del hecho es un contrato](./el-nombre-es-un-contrato.md)

[➡️ Siguiente: La pregunta que el diario no sabe responder](./la-vista-de-lectura.md)
