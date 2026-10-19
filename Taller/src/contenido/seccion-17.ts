// Fuente: workshop-event-sourcing/taller.md, entrada "17 · Reconstruir la vista rehidratando el diario".
import type { Seccion } from "./tipos";

export const seccion17: Seccion = {
  numero: 17,
  titulo: "Reconstruir la vista rehidratando el diario",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Llenar la vista con lo que ya pasó cuando cambia de forma: **borrarla** y volverla a derivar del diario, rehidratando cada empresa.",
    },
    {
      tipo: "planteamiento",
      titulo: "Un dato más: el plan",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Queremos el plan junto a cada suspendida. Añadimos la columna, y `Actualizar` la escribe.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Qué plan sale para `emp-2` y `emp-4`?",
        },
        {
          k: "terminal",
          tono: "error",
          salida: ["emp-2 → plan=''", "emp-4 → plan=''", "emp-5 → plan=''"],
        },
        {
          k: "respuesta",
          texto: "Vacío. ¿Cuándo corre `Actualizar`?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Y si volvemos a ejecutar los comandos?",
        },
        {
          k: "respuesta",
          texto:
            "Anexaría otra suspensión y otro pago al diario.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "El pasado no se re-ejecuta. Pero **está guardado**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El plan en la vista",
      tarea:
        "Agrega la columna `plan` a la tabla `empresas_estado` y haz que `Actualizar` la escriba.",
      pasos: [
        "Comenta las llamadas a `sembrar`: si la siembra corre otra vez, `Actualizar` escribe el plan y no ves el problema.",
        "Agrega la columna con el comando de abajo.",
        "En el upsert de `Actualizar`, agrega `plan` en el `INSERT` y en el `DO UPDATE SET`, con `e.Plan`.",
      ],
      logro: {
        items: [
          "Las suspendidas que ya estaban quedan con `plan=''`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "DEFAULT ''",
          explicacion:
            "es lo que el `ALTER` deja en las filas que ya existían.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "docker exec empresas-db psql -U postgres -c \\",
          "  \"ALTER TABLE empresas_estado ADD COLUMN plan TEXT NOT NULL DEFAULT '';\"",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Borrar y volver a derivar",
      tarea:
        "Dale a la vista un `Reconstruir()` que la vacía y la vuelve a llenar rehidratando cada empresa del diario.",
      pasos: [
        "`Suspendidas` recibe ahora también el `EventStore` por constructor: `new Suspendidas(cadena, store)`.",
        "`Reconstruir()`: `DELETE FROM empresas_estado` y, por cada id de `_store.TodosLosStreams()`, `Actualizar(id, _store.AbrirStream<Empresa>(id).Get())`.",
        "`ListarConPlan()`: `SELECT id, plan FROM empresas_estado WHERE suspendida ORDER BY id`. Devuelve `List<(string Id, string Plan)>`.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "DELETE FROM empresas_estado",
          explicacion: "vacía la tabla sin borrarla.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Borrar y volver a derivar (1 de 3)",
      piezas: [
        {
          etiqueta: "Tu `Suspendidas`: recibe el `EventStore`, y un `Exec` para no repetir la conexión",
          lenguaje: "csharp",
          lineas: [
            "public class Suspendidas",
            "{",
            "    private readonly string _cadena;",
            "    private readonly EventStore _store;        // 🔁 nuevo: para poder rehidratar el diario",
            "",
            "    public Suspendidas(string cadena, EventStore store)",
            "    {",
            "        _cadena = cadena; _store = store;",
            '        Exec(@"CREATE TABLE IF NOT EXISTS empresas_estado (',
            "                   id TEXT PRIMARY KEY, suspendida BOOL NOT NULL,",
            "                   plan TEXT NOT NULL DEFAULT '');\");",
            "    }",
            "",
            "    private void Exec(string sql, params (string, object)[] ps)",
            "    {",
            "        using var c = new NpgsqlConnection(_cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            "        cmd.CommandText = sql;",
            "        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);",
            "        cmd.ExecuteNonQuery();",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Borrar y volver a derivar (2 de 3)",
      piezas: [
        {
          etiqueta: "En la misma clase: `Actualizar` escribe también el plan, y `Reconstruir` vuelve a derivar la vista",
          lenguaje: "csharp",
          lineas: [
            "    // 🔁 igual que antes, pero ahora también refleja el plan",
            "    public void Actualizar(string id, Empresa e)",
            '        => Exec(@"INSERT INTO empresas_estado(id, suspendida, plan)',
            "                  VALUES(@id, @s, @p)",
            '                  ON CONFLICT(id) DO UPDATE SET suspendida = @s, plan = @p",',
            '                ("id", id), ("s", e.Suspendida), ("p", e.Plan));',
            "",
            "    // lo nuevo: tirar la vista y volver a derivarla del diario",
            "    public void Reconstruir()",
            "    {",
            '        Exec("DELETE FROM empresas_estado");',
            "        foreach (var id in _store.TodosLosStreams())",
            "            Actualizar(id, _store.AbrirStream<Empresa>(id).Get());   // rehidrata y refleja",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Borrar y volver a derivar (3 de 3)",
      piezas: [
        {
          etiqueta: "Y `ListarConPlan`, para comprobarlo",
          lenguaje: "csharp",
          lineas: [
            "    public List<(string Id, string Plan)> ListarConPlan()",
            "    {",
            "        using var c = new NpgsqlConnection(_cadena); c.Open();",
            "        using var cmd = c.CreateCommand();",
            '        cmd.CommandText = "SELECT id, plan FROM empresas_estado WHERE suspendida ORDER BY id";',
            "        var filas = new List<(string, string)>();",
            "        using var r = cmd.ExecuteReader();",
            "        while (r.Read()) filas.Add((r.GetString(0), r.GetString(1)));",
            "        return filas;",
            "    }",
            "",
            "    // Listar() sigue como estaba.",
            "}",
          ],
        },
        {
          etiqueta: "Arriba en el `Program.cs`, donde creas la vista",
          lenguaje: "csharp",
          lineas: [
            "// donde la creabas, ahora recibe el store:",
            "var vista = new Suspendidas(cadena, store);",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Reconstruye, y otra vez",
      tarea:
        "Reconstruye la vista y comprueba que cada suspendida trae su plan, sin ejecutar ningún comando de negocio.",
      pasos: [
        "Arriba en el `Program.cs`: `vista.Reconstruir();`",
        "Imprime cada fila de `ListarConPlan()` como `{id} → plan='{plan}'`.",
        "Corre dos veces seguidas.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: [
            "emp-2 → plan='Premium'",
            "emp-4 → plan='Enterprise'",
            "emp-5 → plan='Básico'",
          ],
        },
        items: [
          "`emp-3` no aparece.",
          "Las dos corridas dan lo mismo.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "¿Por qué dos corridas dan lo mismo? Cada una empieza borrando.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Los hechos no se re-ejecutan; las conclusiones **se re-derivan**. Lo único que no puedes perder es el diario.",
      puntos: [
        {
          termino: "Reconstruir",
          definicion:
            "Borrar la vista y volver a derivarla rehidratando el diario, no parchar las filas incompletas.",
        },
      ],
      decision:
        "Reconstruir = borrar todo y re-derivar del diario, no parchar las filas incompletas. Costo: la vista, vacía mientras se rehidrata.",
      commit: {
        mensaje: "ES · Reconstruir la vista rehidratando el diario",
        preguntas: [
          "¿Por qué la vista se puede rehacer sin miedo y los comandos del pasado no se pueden volver a ejecutar?",
        ],
      },
      siguiente: {
        seccion: "18 · La vista se mantiene sola",
        texto:
          "Cada handler debe acordarse de `Actualizar`. ¿Y si el proceso muere antes?",
      },
    },
  ],
};
