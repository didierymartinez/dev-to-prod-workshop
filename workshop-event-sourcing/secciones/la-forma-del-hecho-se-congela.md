# La forma del hecho se congela

En [El nombre es un contrato](./el-nombre-es-un-contrato.md) congelaste el **nombre** del hecho. Pero en [Dos streams, la misma clave](./dos-streams-misma-clave.md) le cambiaste la **forma** —`EmpresaRegistrada` ahora lleva `Nit`—, y las empresas viejas se registraron sin él.

## 🎯 El Objetivo

Leer sin romperse un hecho **viejo** cuya forma ya no coincide con la de hoy, sin un `UPDATE` a los hechos ya escritos. Y fijarlo en un test contra Postgres que da el mismo resultado cada vez que lo corres.

## 💥 El dolor: el hecho viejo llega mutilado, en silencio

Tu diario tiene empresas registradas **antes** de que `EmpresaRegistrada` llevara `Nit`. Su `datos` en disco es la forma de entonces:

```json
{"Nombre":"Acme","Plan":"Premium"}
```

Rehidrata una de esas empresas. Tu `GetEvents` deserializa ese JSON contra la forma de **hoy** —`EmpresaRegistrada(Nit, Nombre, Plan)`— y **no falla**. Deja `Nit` en **null**. ¿Por qué no falla, si al constructor le falta un argumento?

> [!NOTE]
> 🆕 **Cómo construye un `record` System.Text.Json.** Al deserializar, STJ llama al **constructor** del `record` y empareja cada propiedad del JSON con el parámetro del **mismo nombre**. A los parámetros que **no encuentra** les pasa el valor por defecto (`null` para un `string`), sin lanzar.

Como tu código de hoy **siempre** escribe `Nit`, para reproducir el hecho viejo lo siembras a mano —un `INSERT` con la forma de entonces— y lo relees:

```sql
INSERT INTO eventos(stream, version, tipo, datos)
VALUES ('emp-legado', 1, 'empresa-registrada', '{"Nombre":"Acme","Plan":"Premium"}'::jsonb);
```

```
GetEvents("emp-legado") → EmpresaRegistrada { Nit = null, Nombre = "Acme", Plan = "Premium" }
```

Nadie avisó. El hecho en disco no cambió, pero no puede responder "¿cuál es tu NIT?": nunca capturó eso. Y ese `null` viaja: en cuanto alguien lee `empresa.Nit.Length`, o lo mete en el `localizador` de [Dos streams, la misma clave](./dos-streams-misma-clave.md), revienta con un `NullReferenceException` lejos del origen, o pasa como un NIT vacío y **miente**. La forma de un hecho quedó **congelada** el día que lo escribiste, y tu código siguió.

## 🔧 Reconciliar al leer, no reescribir en disco

El reflejo es un `UPDATE eventos SET datos = ...` para "arreglar" las filas viejas. Es el pecado de [El diario de una empresa](./el-diario-de-una-empresa.md): reescribir el pasado. El hecho se quedó sin `Nit` porque **ese día no existía**, y esa es la verdad histórica. Lo que sí puedes es **reconciliar la forma al leer**.

> 🆕 **Un *upcaster*: viejo JSON → evento actual.** Una función que se aplica **al leer**, dentro de tu `GetEvents`, **en lugar del** deserialize normal para ese tipo. Reconoce la forma vieja (aquí: falta `Nit`) y produce el evento con la forma de hoy. El disco queda intacto; el dominio nunca ve la forma vieja.

> 🆕 **Mirar un JSON sin fijar su forma.** `JsonDocument.Parse(json).RootElement` te da la raíz cruda sin comprometerte a una clase; `.TryGetProperty("Nit", out _)` dice si ese campo existe; `.GetProperty("Nombre").GetString()` lee un campo suelto.

> 🛠️ **Inténtalo tú.** En `PostgresEventStore.GetEvents`, ramifica por `tipo`: si es `"empresa-registrada"`, llama a un `Upcast(json)` en vez del `JsonSerializer.Deserialize(...)` genérico; los demás tipos siguen igual. Si el JSON no trae `Nit` (míralo con `JsonDocument`), es la forma vieja: construye el `EmpresaRegistrada` con los campos que sí trae. Cuidado con el `Nit`: es un dato esencial que ese hecho **nunca capturó**, y no lo puedes inventar. Márcalo (`"SIN-NIT-LEGADO"`) para que salte a la vista y el negocio lo corrija.

<details>
<summary>👉 Una forma de hacerlo (en el camino de lectura de Postgres)</summary>

```csharp
// en PostgresEventStore.GetEvents, dentro del while(r.Read()):
var tipo = r.GetString(1);
var json = r.GetString(2);
object hecho = tipo == "empresa-registrada"
    ? Upcast(json)                                        // reconcilia la forma vieja
    : JsonSerializer.Deserialize(json, _porNombre[tipo])!;  // los demás tipos, igual que siempre
sobres.Add(new EventoAlmacenado(r.GetInt32(0), hecho));
```

```csharp
static EmpresaRegistrada Upcast(string json)
{
    using var doc = JsonDocument.Parse(json);
    var raiz = doc.RootElement;
    if (raiz.TryGetProperty("Nit", out _))                   // ya es la forma de hoy
        return JsonSerializer.Deserialize<EmpresaRegistrada>(json)!;

    return new EmpresaRegistrada(                             // forma vieja → forma de hoy
        Nit: "SIN-NIT-LEGADO",                               // no se inventa: se marca para corregir
        Nombre: raiz.GetProperty("Nombre").GetString()!,
        Plan:   raiz.GetProperty("Plan").GetString()!);
}
```

</details>

**El otro lado de la frontera.** Si en vez del NIT `EmpresaRegistrada` hubiera ganado un `Notas` **opcional**, un hecho viejo sin `Notas` sí se reconcilia con un default: `Notas: ""`, porque "sin notas" *es* verdad. El mecanismo es el mismo `TryGetProperty`; lo que cambia es la **honestidad del default**: `""` para unas notas ausentes es cierto, y para un NIT ausente es mentira.

## 🔧 El upcaster, en un test contra Postgres

Fija el upcaster en un test, tu red desde [Verde, y roto](./verde-y-roto.md). Va contra Postgres: el doble de [El puerto propio](./el-puerto-propio.md) guarda objetos vivos, nunca JSON viejo, y la deriva de forma solo aparece donde el hecho se serializa y se vuelve a leer. Escríbelo con lo que ya conoces: la cadena de `CADENA_POSTGRES` con el `?? throw` de [Todo o nada](./todo-o-nada.md), el `INSERT` corrido con Npgsql como en tu store, y un cast para tomar el primer hecho como `EmpresaRegistrada`.

```csharp
// Empresas.Tests/LaFormaDelHecho.cs
using Npgsql;

public class LaFormaDelHecho
{
    [Fact]
    public void Un_registro_sin_Nit_se_lee_marcado()
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        using (var c = new NpgsqlConnection(cadena))
        {
            c.Open();
            using var cmd = c.CreateCommand();
            cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES " +
                "('emp-legado', 1, 'empresa-registrada', '{\"Nombre\":\"Acme\",\"Plan\":\"Premium\"}'::jsonb)";
            cmd.ExecuteNonQuery();
        }

        var hechos = new PostgresEventStore(cadena).GetEvents("emp-legado");

        var registrada = (EmpresaRegistrada)hechos[0].EventData;
        Assert.Equal("SIN-NIT-LEGADO", registrada.Nit);
    }
}
```

Corre `dotnet test` dos veces, en la terminal donde fijaste `CADENA_POSTGRES`. A más tardar la segunda vez sale rojo:

```
Npgsql.PostgresException : 23505: duplicate key value violates unique constraint "eventos_pkey"
```

El upcaster no tiene la culpa. La corrida anterior dejó `emp-legado` en `eventos`, y el `INSERT` choca con la `PRIMARY KEY(stream, version)` de [Todo o nada](./todo-o-nada.md); si sembraste `emp-legado` en el dolor, choca desde la primera vez. El resultado depende de lo que había en la base, y esa base es la de tu programa: el test le metió una empresa de prueba a tu diario.

## 🔧 Una base de pruebas, en un estado conocido

Un test contra Postgres necesita una base solo para tests, vacía antes de cada test. Vaciar es destructivo: solo vale en la base de pruebas, porque en la de tu programa borrar hechos es perder el pasado.

> 🆕 **Un fixture compartido de xUnit.** Un *fixture* es una clase que prepara lo que varios tests usan. xUnit crea **una** instancia y se la pasa a cada clase de tests por su constructor. Tres piezas lo conectan:
> - `[CollectionDefinition("postgres")]`, sobre una clase vacía que implementa `ICollectionFixture<PostgresFixture>`, declara la colección `"postgres"` y su fixture.
> - `[Collection("postgres")]` mete una clase de tests en esa colección.
> - El constructor de la clase de tests recibe el `PostgresFixture`.
>
> xUnit corre en paralelo las clases de colecciones distintas, y en fila los tests de una misma colección. Por eso toda clase de tests que use esta base va en `"postgres"`: así ningún test vacía la base en medio de otro.

> 🆕 **`IAsyncLifetime`: preparar antes de cada test.** xUnit crea una instancia de la clase de tests para cada `[Fact]`. Si la clase implementa `IAsyncLifetime`, xUnit llama a su `InitializeAsync()` antes del test y a su `DisposeAsync()` después. Las dos devuelven un `Task` que xUnit espera; si no tienes nada que esperar, devuelves `Task.CompletedTask`, una tarea ya terminada.

> 🆕 **Otra base en el mismo Postgres, y `TRUNCATE`.** `new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString` toma tu cadena y le cambia solo el nombre de la base. Y `TRUNCATE eventos, localizador` vacía esas dos tablas en una sola sentencia.

> 🛠️ **Inténtalo tú.** Quieres que tu test quede así, y que pase todas las veces que lo corras:
>
> ```csharp
> [Collection("postgres")]
> public class LaFormaDelHecho(PostgresFixture db) : IAsyncLifetime
> {
>     public Task InitializeAsync() { db.Limpiar(); return Task.CompletedTask; }   // antes de CADA test
>     public Task DisposeAsync() => Task.CompletedTask;
>
>     [Fact]
>     public void Un_registro_sin_Nit_se_lee_marcado()
>     {
>         db.Ejecutar("INSERT INTO eventos(stream, version, tipo, datos) VALUES " +
>             "('emp-legado', 1, 'empresa-registrada', '{\"Nombre\":\"Acme\",\"Plan\":\"Premium\"}'::jsonb)");
>
>         var hechos = new PostgresEventStore(db.Cadena).GetEvents("emp-legado");
>
>         var registrada = (EmpresaRegistrada)hechos[0].EventData;
>         Assert.Equal("SIN-NIT-LEGADO", registrada.Nit);
>     }
> }
> ```
>
> Primero crea la base de pruebas, una sola vez:
>
> ```bash
> docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas_tests"
> ```
>
> Luego crea `PostgresFixture` en `Empresas.Tests`. En su constructor, lee `CADENA_POSTGRES` como en tu test, cámbiale la base a `empresas_tests` y guarda el resultado en una propiedad `Cadena`. Crea ahí las tablas de tu store en esa base: `new PostgresEventStore(Cadena)` crea `eventos`, y un `CREATE TABLE IF NOT EXISTS` crea `localizador`. Pasa a un método `Ejecutar(sql)` la conexión y el comando que corrían el `INSERT`. Añade un `Limpiar()` que corra el `TRUNCATE`. Al final, declara la colección `"postgres"`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// Empresas.Tests/PostgresFixture.cs
using Npgsql;

// Una sola instancia para toda la colección "postgres": conoce la base de pruebas y crea sus tablas.
public class PostgresFixture
{
    public string Cadena { get; }

    public PostgresFixture()
    {
        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");
        Cadena = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;

        new PostgresEventStore(Cadena);   // su constructor crea `eventos` si falta
        Ejecutar("CREATE TABLE IF NOT EXISTS localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL)");
    }

    public void Ejecutar(string sql)
    {
        using var c = new NpgsqlConnection(Cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    public void Limpiar() => Ejecutar("TRUNCATE eventos, localizador");   // la base, en un estado conocido
}

[CollectionDefinition("postgres")]
public class ColeccionPostgres : ICollectionFixture<PostgresFixture> { }
```

El `using Npgsql;` del test ya no hace falta: la conexión vive en el fixture.

</details>

> 🔍 **¿Lo lograste?** Corre `dotnet test` dos veces seguidas: verde las dos.

## 🔨 Rómpelo: quita el upcaster

Quita el upcaster (deserializa directo): el test cae, porque `Nit` vuelve a `null`. Sin ese test, el día que cambies la forma otra vez, el hecho viejo se muere en silencio.

## 🔨 Rómpelo 2: un hecho que valida al leerse

Un NIT vacío no debería entrar nunca. El reflejo es darle al NIT un tipo propio que lo impida, y meter ese tipo en el hecho.

> 🆕 **Objeto de valor.** Un tipo pequeño que envuelve un dato y lo valida en su constructor. Si el valor no cumple la regla, el constructor lanza, así que nunca existe un `Nit` inválido.

```csharp
public record Nit
{
    public string Valor { get; }
    public Nit(string valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) throw new ArgumentException("El NIT no puede ir vacío.");
        Valor = valor;
    }
}

public record EmpresaRegistrada(Nit Nit, string Nombre, string Plan);   // el hecho lleva el objeto de valor
```

Ajusta lo que deja de compilar; el compilador te lleva a cada sitio. `Registrar` emite `new EmpresaRegistrada(new Nit(nit), nombre, plan)`, el `Upcast` marca con `new Nit("SIN-NIT-LEGADO")`, y los tests que crean o leen un `EmpresaRegistrada` pasan por el `Nit` (tu primer test compara `registrada.Nit.Valor`). En disco, el hecho cambia de forma: se guarda como `{"Nit":{"Valor":"900123456"},…}`.

Imagina que el hecho hubiera llevado el `Nit` así desde el principio, y que la validación llegó después. Una empresa registrada antes de la regla, con el NIT vacío, quedó así en tu diario. Agrega este test a `LaFormaDelHecho`:

```csharp
[Fact]
public void Un_registro_con_Nit_vacio_se_rehidrata()
{
    db.Ejecutar("INSERT INTO eventos(stream, version, tipo, datos) VALUES " +
        "('emp-legado', 1, 'empresa-registrada', '{\"Nit\":{\"Valor\":\"\"},\"Nombre\":\"Acme\",\"Plan\":\"Premium\"}'::jsonb)");

    var hechos = new PostgresEventStore(db.Cadena).GetEvents("emp-legado");

    var registrada = (EmpresaRegistrada)hechos[0].EventData;
    Assert.Equal("", registrada.Nit.Valor);
}
```

Corre `dotnet test`. Este test sale rojo con `System.ArgumentException : El NIT no puede ir vacío.` Lanza `GetEvents`: para leer el hecho, System.Text.Json llama al constructor del `Nit`, y la regla de hoy rechaza el hecho de ayer. Esa empresa ya no carga: todo comando sobre ella falla, y el proyector de [El proyector tropieza](./el-proyector-tropieza.md) la aparta. Hay un segundo golpe: los hechos que ya escribiste guardan el NIT como texto (`"Nit":"900123456"`), y con el objeto de valor adentro tampoco se leen: `JsonException: The JSON value could not be converted to Nit`.

### La cura: el hecho lleva primitivos, y la regla vive en el verbo

Validar es decidir, y se decide una vez: al emitir el hecho. Rehidratar es recordar lo que ya pasó, y lo que ya pasó no se vuelve a validar.

> 🛠️ **Inténtalo tú.** Quieres que este test de reglas pase, junto con los dos de `LaFormaDelHecho`. Usa `Assert.Throws<ArgumentException>(…)`, como en [El árbol de empresas](./el-arbol-de-empresas.md). Como no toca Postgres, ponlo con tus tests de reglas, fuera de la colección:
>
> ```csharp
> [Fact]
> public void Registrar_con_Nit_vacio_lanza() =>
>     Assert.Throws<ArgumentException>(() => new Empresa().Registrar("", "Acme", "Premium"));
> ```
>
> Devuelve el hecho a `EmpresaRegistrada(string Nit, string Nombre, string Plan)`, y el `Upcast` y tu primer test a su forma de texto. Conserva el `Nit`, ahora para decidir: en `Registrar`, crea el `Nit` (ahí valida) y emite su `Valor`. En el segundo test, siembra el NIT vacío con la forma que escribe tu código de hoy, `"Nit":""`, y compara `registrada.Nit` con `""`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public record EmpresaRegistrada(string Nit, string Nombre, string Plan);   // primitivos: se lee siempre

// en Empresa:
public void Registrar(string nit, string nombre, string plan) =>
    Emitir(new EmpresaRegistrada(new Nit(nit).Valor, nombre, plan));      // la regla, al decidir
```

En el segundo test solo cambian dos cosas: el JSON sembrado lleva `{\"Nit\":\"\",\"Nombre\":\"Acme\",\"Plan\":\"Premium\"}`, y la afirmación es `Assert.Equal("", registrada.Nit)`.

Un NIT vacío nuevo ya no entra: `Registrar` lanza antes de emitir. Un hecho viejo con el NIT vacío se sigue leyendo, porque es la verdad de ese día.

</details>

## El Descubrimiento

La forma de un hecho es un contrato con tu **yo del pasado**: quedó congelada el día que lo escribiste. Evolucionarla no es reescribir el disco: es reconciliar **al leer**, con un upcaster. Un upcaster **reforma** la forma, no la **inventa**: un dato esencial que el hecho viejo nunca capturó no lo recupera ningún código. Tampoco vale escribir el marcador en disco con un `UPDATE`: también falsifica la historia, y si llega el NIT real, lo honesto es un **hecho correctivo nuevo**. Por eso la regla de mantenedor es preferir cambios **aditivos y opcionales**: un renombre o un campo esencial nuevo es una migración de verdad, no un parche. El hecho lleva **primitivos**, porque rehidratar no valida: la regla vive en el verbo. Y para fijarlo nació tu **arnés de integración**: un fixture con su propia base de pruebas, vaciada antes de cada test.

> 🌱 Hasta ahora todas tus preguntas de lectura las respondía la misma vista `Suspendidas`. Pronto llega una pregunta que esa vista no sabe responder, porque está diseñada para **otra** pregunta. Ahí verás que la forma de un read model la dicta la consulta, no el hecho ([La vista por consulta](./la-vista-por-consulta.md)).

## ✅ Compruébalo

- [ ] Deserializar directo el JSON viejo (sin `Nit`) deja `Nit = null` y **no** lanza, y sabes por qué. Con el upcaster en `GetEvents`, `emp-legado` da `Nit = "SIN-NIT-LEGADO"`.
- [ ] El JSON en disco de esa empresa vieja **no cambió** (no hubo `UPDATE` a `eventos`), y un hecho con la forma nueva pasa por el upcaster sin alterarse.
- [ ] Sabes decir por qué el `Nit` legado se marca (en vez de inventarse o de escribir el marcador en disco), y a quién le toca corregirlo.
- [ ] Sin el fixture, la segunda corrida de `dotnet test` cae con `23505`. Con el fixture, `dotnet test` pasa dos veces seguidas, y los dos tests de `LaFormaDelHecho` siembran `emp-legado` sin chocar.
- [ ] Los tests escriben en `empresas_tests`: `docker exec empresas-db psql -U postgres -d empresas_tests -c "SELECT stream FROM eventos"` muestra lo que sembró el último test, porque la limpieza corre **antes** de cada test.
- [ ] Con el `Nit` como objeto de valor dentro del hecho, `Un_registro_con_Nit_vacio_se_rehidrata` cae con `ArgumentException`. Con el hecho en primitivos y la regla en `Registrar`, pasan los tres tests.

## 🆘 Si algo salió mal

- **`Nit` sigue llegando null:** el `GetEvents` no ramifica por `tipo`, o la rama "sin Nit" del `Upcast` no se dispara. Revisa el `TryGetProperty("Nit", …)`.
- **`23505: duplicate key value violates unique constraint "eventos_pkey"` en un test:** la base no se vació antes del test. Revisa que la clase implemente `IAsyncLifetime` y que su `InitializeAsync` llame a `db.Limpiar()`.
- **`The following constructor parameters did not have matching fixture data: PostgresFixture db`:** la clase de tests no está en la colección. Ponle `[Collection("postgres")]`, con el mismo nombre que el `[CollectionDefinition("postgres")]` de `ColeccionPostgres`.
- **`3D000: database "empresas_tests" does not exist`:** falta crear la base de pruebas. Corre una vez el `CREATE DATABASE` del paso.
- **`InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.` al correr los tests:** fíjala en la terminal donde corres `dotnet test`, como en [Todo o nada](./todo-o-nada.md).
- **`error CS0738: … no tiene el tipo de valor devuelto coincidente de 'ValueTask'`:** tu proyecto de tests usa xUnit v3 (el paquete `xunit.v3`), donde `InitializeAsync` y `DisposeAsync` devuelven `ValueTask`. Cambia `Task` por `ValueTask`, y `Task.CompletedTask` por `ValueTask.CompletedTask`.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md` la decisión de hoy:

> Mis tests contra Postgres usan su propia base (`empresas_tests`), vaciada antes de cada test. Los hechos llevan primitivos: la regla vive en el verbo, no en el hecho.

> 💭 **Reto:** da un cambio de forma que sí resolverías con un default en el upcaster, y otro que **no** —que exige una migración o un proceso de negocio—. ¿Qué los distingue?

```bash
git add .
git commit -m "ES · La forma del hecho se congela (upcaster al leer)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La forma del hecho se congela al escribirlo: se evoluciona reconciliando **al leer** (un upcaster en `GetEvents`), nunca reescribiendo el disco, y un dato esencial perdido es una migración, no un default. El hecho lleva primitivos, porque rehidratar no valida. Y un test contra Postgres parte de un estado conocido: su propia base, vaciada antes de cada test.

---

[⬅️ Volver: La rama entera](./la-rama-entera.md)

[➡️ Siguiente: La vista por consulta](./la-vista-por-consulta.md)
