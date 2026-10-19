// Fuente: workshop-event-sourcing/taller.md, entrada "15 · Todo o nada: el diario en una base de datos real".
import type { Seccion } from "./tipos";

const cadena =
  "Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres";
const mirarTabla =
  "docker exec empresas-db psql -U postgres -c \"SELECT version, tipo FROM eventos WHERE stream='emp-7' ORDER BY version\"";

export const seccion15: Seccion = {
  numero: 15,
  titulo: "Todo o nada: el diario en una base de datos real",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que pagar-y-reactivar **entre entero o no entre**, mudando el diario de archivos a una tabla de Postgres escrita a mano con SQL.",
    },
    {
      tipo: "planteamiento",
      titulo: "Un corte de luz a la mitad",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Si el proceso muere entre el pago y la reactivación, ¿cómo queda la empresa?",
        },
        {
          k: "texto",
          tam: "tenue",
          texto:
            "En el bucle de `Append`, justo después de escribir cada hecho:",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          junto: true,
          lineas: [
            "_store.AppendEvent(_aggregateId, new EventoAlmacenado(++_version, hecho));",
            'if (hecho is PagoRegistrado) throw new Exception("💥 corte de luz");',
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Lo que quedó en el diario",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Pagar-y-reactivar sobre una morosa. El final del `.log`:",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          junto: true,
          lineas: [
            '{"Version":3,"Tipo":"pago-registrado","Datos":{"Monto":500}}',
          ],
        },
        {
          k: "texto",
          texto:
            "No hay `empresa-reactivada`. Al rehidratar: `Suspendida=True, DeudaPendiente=False`.",
        },
        { k: "respuesta", texto: "Pagó, y sigue suspendida." },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "¿Lo arreglamos sobre el archivo?",
      bloques: [
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "¿Escribir las dos líneas juntas?",
            "¿Escribir a un temporal y hacer `rename`?",
            "¿Un archivo de pendientes que se confirma al final?",
          ],
        },
        {
          k: "respuesta",
          texto: "No. Ninguno es una **transacción**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "«Las dos o ninguna», de verdad, es una transacción. Un archivo de texto no las tiene.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Levanta Postgres",
      tarea:
        "Arranca un Postgres en un contenedor y agrega a tu proyecto el driver para hablarle desde C#.",
      pasos: [
        "En una terminal, corre los dos `docker` de abajo: el primero levanta Postgres, el segundo comprueba que responde.",
        "Dentro de `Empresas.Historia/`, agrega el driver con el `dotnet add package` de abajo.",
        "En la primera línea del `Program.cs`, junto al `using System.Text.Json;`, agrega `using Npgsql;`.",
      ],
      logro: {
        terminal: {
          comando: "docker exec empresas-db pg_isready -U postgres",
          tono: "ok",
          salida: ["/var/run/postgresql:5432 - accepting connections"],
        },
      },
      tips: [
        {
          k: "nota",
          texto: "`postgres/postgres` son credenciales **solo de desarrollo**.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "docker run -d --name empresas-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16",
          "docker exec empresas-db pg_isready -U postgres",
          "dotnet add package Npgsql --version 10.0.3",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El diario, una tabla",
      tarea:
        "Reescribe por dentro tu `EventStore` para que lea los hechos de una tabla `eventos` en Postgres.",
      pasos: [
        "El constructor de `EventStore` recibe `string cadena`, la guarda y crea la tabla con el SQL de abajo.",
        "`GetEvents(id)`: `SELECT version, tipo, datos FROM eventos` `WHERE stream = @s ORDER BY version`. Deserializa cada `datos` con `_porNombre`.",
      ],
      logro: {
        items: [
          "`GetEvents` devuelve la misma lista de `EventoAlmacenado`. La `Empresa` y los handlers no cambian.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "`PRIMARY KEY (stream, version)` es tu concurrencia optimista, ahora en la base.",
        },
        {
          k: "nuevo",
          idioma: 'AddWithValue("s", id)',
          explicacion:
            "en `cmd.Parameters`, rellena el `@s` del SQL. El nombre va **sin** `@`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'cmd.CommandText = @"CREATE TABLE IF NOT EXISTS eventos (',
          "    stream TEXT NOT NULL, version INT NOT NULL, tipo TEXT NOT NULL, datos JSONB NOT NULL,",
          '    PRIMARY KEY (stream, version));";',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El diario, una tabla (1 de 3)",
      piezas: [
        {
          etiqueta: "Tu `EventStore`, arriba: el mapa de nombres estables, igual que antes",
          lenguaje: "csharp",
          lineas: [
            "public class EventStore",
            "{",
            "    // el mapa de nombres estables: igual que antes (nombre en disco → clase)",
            "    private static readonly Dictionary<string, Type> _porNombre = new()",
            "    {",
            '        ["empresa-registrada"] = typeof(EmpresaRegistrada),',
            '        ["plan-cambiado"]      = typeof(PlanCambiado),',
            '        ["empresa-suspendida"] = typeof(EmpresaSuspendida),',
            '        ["pago-registrado"]    = typeof(PagoRegistrado),',
            '        ["empresa-reactivada"] = typeof(EmpresaReactivada),',
            "    };",
            "    private static string NombreDe(Type tipo)",
            "    {",
            "        foreach (var par in _porNombre)",
            "            if (par.Value == tipo) return par.Key;",
            '        throw new InvalidOperationException($"Evento sin nombre estable: {tipo.Name}");',
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El diario, una tabla (2 de 3)",
      piezas: [
        {
          etiqueta: "Debajo, en el mismo `EventStore`: la cadena, y el constructor que crea la tabla",
          lenguaje: "csharp",
          lineas: [
            "    private readonly string _cadena;",
            "",
            "    public EventStore(string cadena)",
            "    {",
            "        _cadena = cadena;",
            "        using var c = new NpgsqlConnection(_cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            '        cmd.CommandText = @"CREATE TABLE IF NOT EXISTS eventos (',
            "            stream TEXT NOT NULL, version INT NOT NULL, tipo TEXT NOT NULL, datos JSONB NOT NULL,",
            '            PRIMARY KEY (stream, version));";',
            "        cmd.ExecuteNonQuery();",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El diario, una tabla (3 de 3)",
      piezas: [
        {
          etiqueta: "Y debajo: `GetEvents` lee de la tabla",
          lenguaje: "csharp",
          lineas: [
            "    public List<EventoAlmacenado> GetEvents(string id)",
            "    {",
            "        using var c = new NpgsqlConnection(_cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            '        cmd.CommandText = "SELECT version, tipo, datos FROM eventos WHERE stream = @s ORDER BY version";',
            '        cmd.Parameters.AddWithValue("s", id);',
            "        var sobres = new List<EventoAlmacenado>();",
            "        using var r = cmd.ExecuteReader();",
            "        while (r.Read())",
            "        {",
            "            var hecho = JsonSerializer.Deserialize(r.GetString(2), _porNombre[r.GetString(1)])!;",
            "            sobres.Add(new EventoAlmacenado(r.GetInt32(0), hecho));",
            "        }",
            "        return sobres;",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Todo el acto, una transacción",
      tarea:
        "Guarda todos los hechos de un acto juntos: entran todos o ninguno.",
      pasos: [
        "En `EventStore`, `Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)`: abre una transacción, un `INSERT` por sobre (con `NombreDe` en `tipo`) y `tx.Commit()` al final.",
        'Si Postgres lanza `PostgresException` con `SqlState == "23505"`, lanza tu `ConcurrencyException`.',
        "En `EventStream.Append`: arma los sobres numerando desde `_version` y llama a `Guardar`. `Get()` no cambia.",
      ],
      logro: {
        items: ["Compila, y la `Empresa` y los handlers siguen igual."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "conn.BeginTransaction()",
          explicacion:
            "agrupa los `INSERT`: entran todos con `tx.Commit()`, o ninguno.",
        },
        {
          k: "nuevo",
          idioma: '"23505"',
          explicacion:
            "el código de Postgres para «clave duplicada»: esa versión ya está ocupada.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES(@s, @v, @t, @d::jsonb)";',
          "// @d::jsonb le dice a Postgres: este texto es JSON",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Todo el acto, una transacción (1 de 2)",
      piezas: [
        {
          etiqueta: "En tu `EventStore`, entre `GetEvents` y `AbrirStream` (que no cambia): `Guardar`",
          lenguaje: "csharp",
          lineas: [
            "    // Todos los sobres del acto, en UNA transacción: todo o nada.",
            "    public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)",
            "    {",
            "        using var c = new NpgsqlConnection(_cadena); c.Open();",
            "        using var tx = c.BeginTransaction();",
            "        try",
            "        {",
            "            foreach (var sobre in sobres)",
            "            {",
            "                using var cmd = c.CreateCommand();",
            "                cmd.Transaction = tx;",
            '                cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES(@s, @v, @t, @d::jsonb)";',
            '                cmd.Parameters.AddWithValue("s", id);',
            '                cmd.Parameters.AddWithValue("v", sobre.Version);',
            '                cmd.Parameters.AddWithValue("t", NombreDe(sobre.EventData.GetType()));',
            '                cmd.Parameters.AddWithValue("d", JsonSerializer.Serialize(sobre.EventData, sobre.EventData.GetType()));',
            "                cmd.ExecuteNonQuery();",
            "            }",
            "            tx.Commit();   // aquí, y solo aquí, entran los hechos — todos juntos",
            "        }",
            '        catch (PostgresException e) when (e.SqlState == "23505")   // versión ya ocupada',
            "        {",
            "            throw new ConcurrencyException($\"Alguien escribió primero en '{id}' — recarga y reintenta.\");",
            "        }",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Todo el acto, una transacción (2 de 2)",
      piezas: [
        {
          etiqueta: "Tu `EventStream`: solo cambia `Append`",
          lenguaje: "csharp",
          lineas: [
            "public class EventStream<T> where T : AggregateRoot, new()",
            "{",
            "    private readonly EventStore _store;",
            "    private readonly string _aggregateId;",
            "    private int _version;",
            "    public EventStream(EventStore store, string id) { _store = store; _aggregateId = id; }",
            "",
            "    public T Get()   // igual que antes: rehidrata y recuerda en qué versión cargó",
            "    {",
            "        var entidad = new T();",
            "        var sobres = _store.GetEvents(_aggregateId);",
            "        entidad.Load(sobres.Select(s => s.EventData));",
            "        _version = sobres.Count;",
            "        return entidad;",
            "    }",
            "",
            "    public void Append(T agg)",
            "    {",
            "        var sobres = new List<EventoAlmacenado>();",
            "        foreach (var hecho in agg.SinConfirmar)",
            "            sobres.Add(new EventoAlmacenado(++_version, hecho));   // numera desde la versión cargada",
            "        _store.Guardar(_aggregateId, sobres);                      // una transacción",
            "        agg.MarcarConfirmados();",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Siembra la morosa",
      tarea:
        "La base nace vacía: siembra `emp-7`, registrada y suspendida, en un solo acto.",
      pasos: [
        "🔁 Reemplaza el código suelto de arriba del `Program.cs` por el de abajo.",
        "Corre `dotnet run` **una vez**.",
        "**Comenta la siembra**: si corre otra vez, agrega un segundo `EmpresaRegistrada`.",
      ],
      logro: {
        terminal: { comando: mirarTabla, salida: [] },
        items: ["`emp-7` tiene 2 filas: registrada y suspendida."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          `var store = new EventStore("${cadena}");`,
          "",
          'var s = store.AbrirStream<Empresa>("emp-7");',
          "var e = s.Get();",
          'e.Registrar("Constructora Andes", "Básico");',
          'e.Suspender("falta de pago");',
          "s.Append(e);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Prueba 1: todo o nada",
      tarea:
        "Revienta el acto pagar-y-reactivar antes del `Commit` y comprueba que no queda media acción en la tabla.",
      pasos: [
        'En `Guardar`, justo antes de `tx.Commit()`: `throw new Exception("💥");`',
        "Debajo de la siembra comentada, el acto de abajo. Corre y mira la tabla. Quita el `throw` y repite.",
      ],
      logro: {
        terminal: { comando: mirarTabla, salida: [] },
        items: [
          "Con el `throw`: **solo 2 filas**.",
          "Sin el `throw`: **4 filas**.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var stream = store.AbrirStream<Empresa>("emp-7"); var emp = stream.Get();',
          "emp.RegistrarPago(500); emp.Reactivar(); stream.Append(emp);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Prueba 2: dos escritores",
      tarea:
        "Dos escritores cargan `emp-7` en la misma versión y los dos guardan: la base deja entrar solo al primero.",
      pasos: [
        "Comenta el acto de la Prueba 1: cada prueba corre sola, porque una excepción corta el programa.",
        "Pega el código de abajo y corre una vez.",
      ],
      logro: {
        items: [
          "`b.Append` lanza `ConcurrencyException`. No escribiste la verificación: la hace el `PRIMARY KEY`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var a = store.AbrirStream<Empresa>("emp-7");  var ea = a.Get();',
          'var b = store.AbrirStream<Empresa>("emp-7");  var eb = b.Get();',
          'ea.CambiarPlan("Premium");    a.Append(ea);',
          'eb.CambiarPlan("Enterprise"); b.Append(eb);',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Prueba 3: nacer dos veces",
      tarea:
        "Dos escritores registran `emp-9`, que todavía no existe: el segundo nacimiento también choca.",
      pasos: [
        "Comenta la Prueba 2 y pega el código de abajo.",
        "Corre **una vez** y coméntalo: repetido, `emp-9` ya existe y el primer `Registrar` entra como versión 2.",
      ],
      logro: {
        items: [
          "`v2.Append` lanza `ConcurrencyException`.",
          "`emp-9` queda con **una sola fila**.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var v1 = store.AbrirStream<Empresa>("emp-9");  var e1 = v1.Get();',
          'var v2 = store.AbrirStream<Empresa>("emp-9");  var e2 = v2.Get();',
          'e1.Registrar("Andes-1", "Básico"); v1.Append(e1);',
          'e2.Registrar("Andes-2", "Básico"); v2.Append(e2);',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La contraseña que git no olvida",
      tarea:
        "Haz este 🔨 **antes** de sacar la cadena del código: verás que la contraseña queda en tu historial de git.",
      pasos: [
        'Con la cadena aún escrita en el `Program.cs`: `git add .` y `git commit -m "ES · Todo o nada: Postgres a mano, con la cadena en el código"`. **Sin** `push`.',
        'Busca la contraseña en el historial: `git log -p -S "Password="`. `-S` busca los commits que agregan o quitan ese texto, `-p` muestra el cambio. Sales con `q`.',
      ],
      logro: {
        items: [
          'Aparece tu commit con la línea `+var store = new EventStore("Host=…;Password=postgres;…");`',
          "Quien clone tu repo puede leer esa línea.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La cadena llega de afuera",
      tarea:
        "Saca la cadena del código: el programa la lee de la variable de entorno `CADENA_POSTGRES`, y se detiene al arrancar si no está.",
      pasos: [
        "En el `Program.cs`, cambia el texto de la cadena por la variable `cadena` de abajo.",
        "Pásale `cadena` a `new EventStore(...)`.",
        "Corre `dotnet run`, todavía sin fijar la variable.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "Unhandled exception. System.InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.",
          ],
        },
      },
      tips: [
        {
          k: "nuevo",
          idioma: "a ?? throw …",
          explicacion: "lanza si `a` es `null`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")',
          '    ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Fija la variable",
      tarea:
        "Dale a la terminal la cadena de conexión y corre otra vez: el programa usa la misma base.",
      pasos: [
        "Fija `CADENA_POSTGRES` con la línea de abajo, la de bash o la de PowerShell. **Con las comillas**: sin ellas, bash corta la cadena en el primer `;`.",
        "En esa misma terminal, corre `dotnet run`. Desde el IDE no ve la variable.",
      ],
      logro: {
        items: [
          "Corre igual: la misma base, las mismas filas en `eventos`.",
          "La variable vive solo en esa terminal. En una nueva, la fijas otra vez.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          `export CADENA_POSTGRES="${cadena}"`,
          "",
          "# en PowerShell:",
          `$env:CADENA_POSTGRES = "${cadena}"`,
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Sigue en el historial",
      tarea:
        "Ya sacaste la contraseña del código. Comprueba que git todavía la guarda.",
      pasos: [
        'Busca en tus archivos: `git grep "Password="`.',
        'Busca en el historial: `git log -p -S "Password="`.',
      ],
      logro: {
        items: [
          "`git grep` no encuentra nada.",
          "`git log -p -S` sigue mostrando la contraseña, en el commit del 🔨.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "Un secreto que tocó git **no se borra: se rota**. Se le cambia la contraseña a la base, y la del historial ya no abre nada.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Un acto de varios hechos necesita una **transacción**, que un archivo no tiene. Y el `PRIMARY KEY(stream, version)` hace ahora tu concurrencia optimista.",
      puntos: [
        {
          termino: "Transacción",
          definicion:
            "Agrupa los `INSERT` de un acto: entran todos con el `Commit`, o ninguno.",
        },
        {
          termino: "PRIMARY KEY (stream, version)",
          definicion:
            "La base rechaza una versión ya ocupada, también en el nacimiento del stream.",
        },
        {
          termino: "Variable de entorno",
          definicion:
            "La cadena llega de afuera. Un secreto que tocó git se rota.",
        },
      ],
      commit: {
        mensaje: "ES · Todo o nada: el diario en una base de datos real",
        preguntas: [
          "¿Qué te da la base que un archivo no puede, y por qué importaba para un acto de dos hechos?",
        ],
      },
      siguiente: {
        seccion: "16 · La pregunta que el diario no sabe responder",
        texto:
          "El negocio pide «todas las empresas suspendidas ahora mismo». Tenemos SQL. ¿Basta un `SELECT`?",
      },
    },
  ],
};
