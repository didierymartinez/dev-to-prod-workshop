// Fuente: workshop-event-sourcing/taller.md, entrada "26 · La forma del hecho se congela".
import type { Seccion } from "./tipos";

export const seccion26: Seccion = {
  numero: 26,
  titulo: "La forma del hecho se congela",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Leer hechos viejos con una forma distinta a la de hoy **sin tocar el disco** (un upcaster), fijarlo en un test contra una base de pruebas propia, y dejar la validación en el verbo.",
    },
    {
      tipo: "planteamiento",
      titulo: "Una empresa de antes del NIT",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Las empresas registradas antes del NIT no tienen `Nit`. ¿Qué pasa al rehidratarlas? ¿Revienta?",
        },
        {
          k: "codigo",
          lenguaje: "sql",
          lineas: [
            "INSERT INTO eventos(stream, version, tipo, datos)",
            'VALUES (\'emp-legado\', 1, \'empresa-registrada\', \'{"Nombre":"Acme","Plan":"Premium"}\'::jsonb);',
          ],
        },
        {
          k: "terminal",
          salida: [
            'GetEvents("emp-legado") → EmpresaRegistrada { Nit = null, Nombre = "Acme", Plan = "Premium" }',
          ],
        },
        {
          k: "respuesta",
          texto: "No falla. Deja `Nit` en `null`, en silencio.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "¿Por qué no falla?",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "System.Text.Json llama al **constructor** del `record` y le pasa cada campo del JSON por su nombre.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "A lo que no encuentra le pasa el valor por defecto: `null` para un `string`.",
        },
        {
          k: "respuesta",
          texto: "Ese `null` revienta lejos, o pasa como un NIT vacío.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El upcaster",
      tarea:
        "Al leer, convierte el JSON viejo en el `EmpresaRegistrada` de hoy. El disco no se toca.",
      pasos: [
        'En `PostgresEventStore.GetEvents`, si `tipo == "empresa-registrada"`, llama a un `Upcast(json)`. Los demás tipos, igual que siempre.',
        "En `Upcast`, si el JSON trae `Nit`, deserializa normal. Si no, arma el hecho con los campos que sí trae.",
        'Sin `Nit`, márcalo `"SIN-NIT-LEGADO"`: un dato que nunca se capturó **no se inventa**.',
      ],
      logro: {
        items: [
          '`emp-legado` se lee con `Nit = "SIN-NIT-LEGADO"`.',
          "El JSON en disco no cambió: no hubo `UPDATE` a `eventos`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Upcaster",
          explicacion:
            "convierte, **al leer**, el JSON viejo en el evento de hoy. El disco no se toca.",
        },
        {
          k: "nuevo",
          idioma: "JsonDocument.Parse(json).RootElement",
          explicacion:
            'la raíz del JSON, sin fijar su clase. `TryGetProperty("Nit", out _)` dice si el campo existe.',
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El upcaster",
      piezas: [
        {
          etiqueta: "En `PostgresEventStore.GetEvents`, dentro del `while (r.Read())`",
          lenguaje: "csharp",
          lineas: [
            "var tipo = r.GetString(1);",
            "var json = r.GetString(2);",
            'object hecho = tipo == "empresa-registrada"',
            "    ? Upcast(json)                                        // reconcilia la forma vieja",
            "    : JsonSerializer.Deserialize(json, _porNombre[tipo])!;  // los demás tipos, igual que siempre",
            "sobres.Add(new EventoAlmacenado(r.GetInt32(0), hecho));",
          ],
        },
        {
          etiqueta: "En `PostgresEventStore`: el `Upcast`",
          lenguaje: "csharp",
          lineas: [
            "static EmpresaRegistrada Upcast(string json)",
            "{",
            "    using var doc = JsonDocument.Parse(json);",
            "    var raiz = doc.RootElement;",
            '    if (raiz.TryGetProperty("Nit", out _))                   // ya es la forma de hoy',
            "        return JsonSerializer.Deserialize<EmpresaRegistrada>(json)!;",
            "",
            "    return new EmpresaRegistrada(                             // forma vieja → forma de hoy",
            '        Nit: "SIN-NIT-LEGADO",                               // no se inventa: se marca para corregir',
            '        Nombre: raiz.GetProperty("Nombre").GetString()!,',
            '        Plan:   raiz.GetProperty("Plan").GetString()!);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El upcaster, en un test",
      tarea:
        "Fija el upcaster en un test contra Postgres, y córrelo dos veces.",
      pasos: [
        "Crea `Empresas.Tests/LaFormaDelHecho.cs` con el test de la lámina siguiente.",
        "En la terminal donde fijaste `CADENA_POSTGRES`, corre `dotnet test`.",
        "Córrelo **otra vez**.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            "Npgsql.PostgresException : 23505: duplicate key value",
            'violates unique constraint "eventos_pkey"',
          ],
        },
        items: [
          "Sale en la segunda corrida, o desde la primera si ya sembraste `emp-legado` a mano.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Un registro sin Nit",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/LaFormaDelHecho.cs`, con `using Npgsql;` arriba, dentro de `public class LaFormaDelHecho { … }`:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Un_registro_sin_Nit_se_lee_marcado()",
            "{",
            '    var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")',
            '        ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");',
            "    using (var c = new NpgsqlConnection(cadena))",
            "    {",
            "        c.Open();",
            "        using var cmd = c.CreateCommand();",
            '        cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES " +',
            '            "(\'emp-legado\', 1, \'empresa-registrada\', \'{\\"Nombre\\":\\"Acme\\",\\"Plan\\":\\"Premium\\"}\'::jsonb)";',
            "        cmd.ExecuteNonQuery();",
            "    }",
            '    var hechos = new PostgresEventStore(cadena).GetEvents("emp-legado");',
            "    var registrada = (EmpresaRegistrada)hechos[0].EventData;",
            '    Assert.Equal("SIN-NIT-LEGADO", registrada.Nit);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "El test ensucia tu diario",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La corrida anterior dejó `emp-legado` en `eventos`, y el `INSERT` choca con la llave primaria.",
        },
        {
          k: "respuesta",
          texto:
            "El resultado depende de lo que había en la base. Y esa base es la de tu programa.",
        },
        {
          k: "texto",
          texto:
            "Un test contra Postgres necesita **su propia base**, vacía antes de cada test.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una base de pruebas",
      tarea:
        "Crea una base solo para tests y una clase que la prepara para todas tus clases de tests.",
      pasos: [
        "Una sola vez, crea la base `empresas_tests` con el comando de abajo.",
        "Crea `Empresas.Tests/PostgresFixture.cs` (con `using Npgsql;`): la clase `PostgresFixture` con una propiedad `Cadena`, la de `CADENA_POSTGRES` con la base cambiada a `empresas_tests`.",
        "En su constructor, crea `eventos` (`new PostgresEventStore(Cadena)`) y `localizador` (`CREATE TABLE IF NOT EXISTS`).",
      ],
      logro: {
        items: ["`PostgresFixture` compila y la base `empresas_tests` existe."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Fixture compartido de xUnit",
          explicacion:
            "una clase que prepara lo que varios tests usan. xUnit crea **una** y se la pasa a cada clase de tests por su constructor.",
        },
        {
          k: "nuevo",
          idioma:
            'new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }',
          explicacion:
            "toma tu cadena y le cambia solo la base. Su `.ConnectionString` es la cadena nueva.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas_tests"',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Una base de pruebas",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/PostgresFixture.cs`: la clase, con su `Cadena` y su constructor",
          lenguaje: "csharp",
          lineas: [
            "using Npgsql;",
            "",
            '// Una sola instancia para toda la colección "postgres": conoce la base de pruebas y crea sus tablas.',
            "public class PostgresFixture",
            "{",
            "    public string Cadena { get; }",
            "",
            "    public PostgresFixture()",
            "    {",
            '        var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")',
            '            ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");',
            '        Cadena = new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString;',
            "",
            "        new PostgresEventStore(Cadena);   // su constructor crea `eventos` si falta",
            '        Ejecutar("CREATE TABLE IF NOT EXISTS localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL)");',
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Vaciar y declarar la colección",
      tarea:
        'Dale al fixture cómo correr SQL y cómo vaciar la base, y declara la colección `"postgres"` que lo comparte.',
      pasos: [
        "En `PostgresFixture`, un método `Ejecutar(sql)` que abre la conexión y corre el comando.",
        "Un `Limpiar()` que corre `TRUNCATE eventos, localizador`.",
        "Al final del archivo, la colección de abajo.",
      ],
      logro: { items: ["`PostgresFixture.cs` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: '[CollectionDefinition("postgres")]',
          explicacion:
            'declara la colección `"postgres"` y su fixture. xUnit crea **un** `PostgresFixture` para toda ella.',
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[CollectionDefinition("postgres")]',
          "public class ColeccionPostgres : ICollectionFixture<PostgresFixture> { }",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Vaciar y declarar la colección",
      piezas: [
        {
          etiqueta: "Sigue, dentro de `PostgresFixture`: correr SQL y vaciar la base",
          lenguaje: "csharp",
          lineas: [
            "    public void Ejecutar(string sql)",
            "    {",
            "        using var c = new NpgsqlConnection(Cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            "        cmd.CommandText = sql;",
            "        cmd.ExecuteNonQuery();",
            "    }",
            "",
            '    public void Limpiar() => Ejecutar("TRUNCATE eventos, localizador");   // la base, en un estado conocido',
            "}",
          ],
        },
        {
          etiqueta: "**Al final** del archivo: la colección",
          lenguaje: "csharp",
          lineas: [
            '[CollectionDefinition("postgres")]',
            "public class ColeccionPostgres : ICollectionFixture<PostgresFixture> { }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El test, en la colección",
      tarea:
        'Mete tu test en la colección `"postgres"` y vacía la base de pruebas antes de cada test.',
      pasos: [
        "Tu clase `LaFormaDelHecho` empieza como abajo.",
        "Su `INSERT` pasa a `db.Ejecutar(...)`, y el store usa `db.Cadena`.",
        "Corre `dotnet test` dos veces seguidas.",
      ],
      logro: {
        items: ["Con el fixture, `dotnet test` dos veces seguidas: verde."],
      },
      tips: [
        {
          k: "nota",
          texto:
            '`[Collection("postgres")]`: su constructor recibe el fixture. Con `IAsyncLifetime`, xUnit llama a `InitializeAsync()` antes de cada test.',
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          '[Collection("postgres")]',
          "public class LaFormaDelHecho(PostgresFixture db) : IAsyncLifetime",
          "{",
          "    public Task InitializeAsync() { db.Limpiar(); return Task.CompletedTask; }",
          "    public Task DisposeAsync() => Task.CompletedTask;",
          "    // … tu test",
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El test, en la colección",
      piezas: [
        {
          etiqueta: "`Empresas.Tests/LaFormaDelHecho.cs`, entero",
          lenguaje: "csharp",
          lineas: [
            '[Collection("postgres")]',
            "public class LaFormaDelHecho(PostgresFixture db) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync() { db.Limpiar(); return Task.CompletedTask; }   // antes de CADA test",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "",
            "    [Fact]",
            "    public void Un_registro_sin_Nit_se_lee_marcado()",
            "    {",
            '        db.Ejecutar("INSERT INTO eventos(stream, version, tipo, datos) VALUES " +',
            '            "(\'emp-legado\', 1, \'empresa-registrada\', \'{\\"Nombre\\":\\"Acme\\",\\"Plan\\":\\"Premium\\"}\'::jsonb)");',
            "",
            '        var hechos = new PostgresEventStore(db.Cadena).GetEvents("emp-legado");',
            "",
            "        var registrada = (EmpresaRegistrada)hechos[0].EventData;",
            '        Assert.Equal("SIN-NIT-LEGADO", registrada.Nit);',
            "    }",
            "}",
          ],
        },
      ],
      nota: "El `using Npgsql;` del test ya no hace falta: la conexión vive en el fixture.",
    },
    {
      tipo: "rompelo",
      titulo: "Quita el upcaster",
      tarea:
        "Deserializa directo, sin el upcaster, y mira qué pasa con tu test.",
      pasos: [
        "En `GetEvents`, cambia la llamada a `Upcast(json)` por el `JsonSerializer.Deserialize` de los demás tipos.",
        "Corre `dotnet test`.",
        "Devuelve el upcaster.",
      ],
      logro: {
        items: ["El test cae: `Nit` vuelve a `null`."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Un hecho que valida al leerse",
      tarea:
        "**No lo saltes**: la cura depende de él. Mete en el hecho un `Nit` que se valida solo, y relee una empresa vieja con el NIT vacío.",
      pasos: [
        "Copia el `record Nit` y el hecho nuevo de la lámina «El NIT con su regla». Arregla lo que deja de compilar.",
        "Agrega a `LaFormaDelHecho` el test de la lámina «Un NIT vacío, de antes».",
        "Corre `dotnet test`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["System.ArgumentException : El NIT no puede ir vacío."],
        },
        items: [
          "Rehidratar no valida: la regla de hoy rechazó el hecho de ayer.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El compilador te lleva a cada sitio: `Registrar`, el `Upcast` y los tests pasan por `new Nit(...)` y `.Valor`.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "El NIT con su regla",
      piezas: [
        {
          etiqueta:
            "Junto a tus hechos. El `Nit` valida en su constructor, y el hecho lo lleva adentro:",
          lenguaje: "csharp",
          lineas: [
            "public record Nit",
            "{",
            "    public string Valor { get; }",
            "    public Nit(string valor)",
            "    {",
            '        if (string.IsNullOrWhiteSpace(valor)) throw new ArgumentException("El NIT no puede ir vacío.");',
            "        Valor = valor;",
            "    }",
            "}",
            "",
            "public record EmpresaRegistrada(Nit Nit, string Nombre, string Plan);",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un NIT vacío, de antes",
      piezas: [
        {
          etiqueta: "En `LaFormaDelHecho`, junto al primer test:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Un_registro_con_Nit_vacio_se_rehidrata()",
            "{",
            '    db.Ejecutar("INSERT INTO eventos(stream, version, tipo, datos) VALUES " +',
            "        \"('emp-legado', 1, 'empresa-registrada', \" +",
            '        "\'{\\"Nit\\":{\\"Valor\\":\\"\\"},\\"Nombre\\":\\"Acme\\",\\"Plan\\":\\"Premium\\"}\'::jsonb)");',
            '    var hechos = new PostgresEventStore(db.Cadena).GetEvents("emp-legado");',
            "    var registrada = (EmpresaRegistrada)hechos[0].EventData;",
            '    Assert.Equal("", registrada.Nit.Valor);',
            "}",
          ],
        },
      ],
      luego: "Corre `dotnet test`: el error está en la lámina anterior.",
    },
    {
      tipo: "reto",
      titulo: "La regla vive en el verbo",
      tarea:
        "El hecho vuelve a llevar primitivos, y el `Nit` valida al **decidir**, en `Registrar`.",
      pasos: [
        "El hecho vuelve a `EmpresaRegistrada(string Nit, string Nombre, string Plan)`, y el `Upcast` y el primer test a su forma de texto. `Registrar` emite `new Nit(nit).Valor`.",
        'El segundo test siembra `"Nit":""` y compara `registrada.Nit` con `""`.',
        "Con tus tests de reglas, fuera de la colección, agrega el test de abajo.",
      ],
      logro: {
        items: [
          "Pasan los tres tests.",
          "Un NIT vacío nuevo no entra; uno viejo se sigue leyendo.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "[Fact]",
          "public void Registrar_con_Nit_vacio_lanza() =>",
          '    Assert.Throws<ArgumentException>(() => new Empresa().Registrar("", "Acme", "Premium"));',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La regla vive en el verbo",
      piezas: [
        {
          etiqueta: "El hecho, otra vez con primitivos",
          lenguaje: "csharp",
          lineas: [
            "public record EmpresaRegistrada(string Nit, string Nombre, string Plan);   // primitivos: se lee siempre",
          ],
        },
        {
          etiqueta: "En `Empresa`: el `Nit` valida al decidir",
          lenguaje: "csharp",
          lineas: [
            "public void Registrar(string nit, string nombre, string plan) =>",
            "    Emitir(new EmpresaRegistrada(new Nit(nit).Valor, nombre, plan));      // la regla, al decidir",
          ],
        },
      ],
      nota: "Un NIT vacío nuevo ya no entra: `Registrar` lanza antes de emitir. Un hecho viejo con el NIT vacío se sigue leyendo.",
    },
    {
      tipo: "aprendizaje",
      idea: "La forma del hecho se **congela** al escribirlo: se reconcilia al leer, un dato esencial perdido se marca, y el hecho lleva primitivos.",
      puntos: [
        {
          termino: "Upcaster",
          definicion:
            "Al leer, la forma vieja pasa a la de hoy. El disco no se toca.",
        },
        {
          termino: "Fixture compartido",
          definicion: "Una base de pruebas propia, vaciada antes de cada test.",
        },
        {
          termino: "Objeto de valor",
          definicion:
            "Un tipo que valida su dato. Va en el verbo, no en el hecho: rehidratar no valida.",
        },
      ],
      decision:
        "Mis tests contra Postgres usan su propia base (`empresas_tests`), vaciada antes de cada test. Los hechos llevan primitivos: la regla vive en el verbo, no en el hecho.",
      commit: {
        mensaje: "ES · La forma del hecho se congela",
        preguntas: [
          "Un cambio de forma que resolverías con un default en el upcaster y otro que no. ¿Qué los distingue?",
        ],
      },
      siguiente: {
        seccion: "27 · La vista por consulta",
        texto:
          "Conciliación pregunta cuánto ha pagado cada empresa, y `Suspendidas` no sabe de pagos.",
      },
    },
  ],
};
