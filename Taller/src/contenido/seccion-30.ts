// Fuente: workshop-event-sourcing/taller.md, entrada "30 · El mensaje y la cola".
import type { Seccion } from "./tipos";

export const seccion30: Seccion = {
  numero: 30,
  titulo: "El mensaje y la cola",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Reclamar filas de la bandeja con `FOR UPDATE SKIP LOCKED`, para que dos consumidores no repitan mensajes. Y ver que el resto de garantías de una cola es **un broker entero**.",
    },
    {
      tipo: "planteamiento",
      titulo: "Dos relays, la misma bandeja",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Facturación vive en otra máquina: no la podemos llamar como un método.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Para no quedarnos cortos, ponemos **dos** relays a leer la bandeja. ¿Qué pasa?",
        },
        {
          k: "terminal",
          salida: [
            "consumidor A → {1, 2, 3}",
            "consumidor B → {1, 2, 3}     (nadie marcó todavía)",
          ],
          tono: "error",
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "Los dos hacen el `SELECT ... WHERE NOT entregado` antes de que ninguno marque.",
        },
        { k: "respuesta", texto: "Cada mensaje sale **dos veces**." },
      ],
    },
    {
      tipo: "reto",
      titulo: "Reclamar de a una",
      tarea:
        "Que la entrega de `PostgresEventStore` reclame **una** fila a la vez, para que dos consumidores nunca tomen la misma.",
      pasos: [
        "En `PostgresEventStore`, `public long ReclamarYEntregar(Action<string> publicar)`: abre una transacción y toma una fila con el `SELECT` de abajo.",
        "Publica, `UPDATE ... SET entregado = true` y `Commit`. Devuelve el id, o `-1` si no hay nada.",
        "Conserva `EntregarPendientes(publicar)` como un bucle que llama a `ReclamarYEntregar` hasta `-1` y cuenta las filas.",
      ],
      logro: {
        items: [
          "Compila, y tus tests anteriores siguen en verde.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "FOR UPDATE SKIP LOCKED",
          explicacion:
            "bloquea las filas que tomas y salta las que otro tomó. El bloqueo dura lo que dura la transacción.",
        },
        {
          k: "nota",
          texto:
            "Una cola es un transporte con garantías. La primera, el **claim**, se la pedimos a Postgres.",
        },
      ],
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado",
          "ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Reclamar de a una (1 de 2)",
      piezas: [
        {
          etiqueta: "`PostgresEventStore`: un consumidor reclama UNA fila, la publica y la marca, dentro de su transacción",
          lenguaje: "csharp",
          lineas: [
            "public long ReclamarYEntregar(Action<string> publicar)   // public: lo llama tu Program.cs",
            "{",
            "    using var c = new NpgsqlConnection(_cadena); c.Open();",
            "    using var tx = c.BeginTransaction();",
            "    long id; string mensaje;",
            "    using (var q = c.CreateCommand())                 // el lector se cierra antes del UPDATE (el detalle de Npgsql de §28)",
            "    {",
            "        q.Transaction = tx;",
            '        q.CommandText = "SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1";',
            "        using var r = q.ExecuteReader();",
            "        if (!r.Read()) return -1;                      // nada que reclamar",
            "        id = r.GetInt64(0); mensaje = r.GetString(1);",
            "    }",
            "    publicar(mensaje);                                 // efecto externo",
            "    using (var u = c.CreateCommand())",
            "    {",
            "        u.Transaction = tx;",
            '        u.CommandText = "UPDATE bandeja_salida SET entregado = true WHERE id = @id";',
            '        u.Parameters.AddWithValue("id", id);',
            "        u.ExecuteNonQuery();",
            "    }",
            "    tx.Commit();                                       // aquí se libera el lock",
            "    return id;",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Reclamar de a una (2 de 2)",
      piezas: [
        {
          etiqueta: "La entrega de siempre, ahora un bucle sobre el claim",
          lenguaje: "csharp",
          lineas: [
            "public int EntregarPendientes(Action<string> publicar)",
            "{",
            "    var entregadas = 0;",
            "    while (ReclamarYEntregar(publicar) != -1) entregadas++;",
            "    return entregadas;",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos consumidores a la vez",
      tarea:
        "Arranca dos consumidores contra la misma bandeja y comprueba que se reparten los mensajes sin repetir ninguno.",
      pasos: [
        "En `psql`, deja 4 filas pendientes: `INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3'), ('m4');`",
        "En `Program.cs`, deja la cadena y el `store`; quita lo demás y pon los dos consumidores de abajo.",
        "Corre `dotnet run`.",
      ],
      logro: {
        items: [
          "Entre A y B salen las 4, y ninguna dos veces: por ejemplo, A `{m2, m4}` y B `{m1, m3}`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'void Recibir(string quien, string m) => Console.WriteLine($"{quien}: {m}");',
          'var A = Task.Run(() => { while (store.ReclamarYEntregar(m => Recibir("A", m)) != -1) { } });',
          'var B = Task.Run(() => { while (store.ReclamarYEntregar(m => Recibir("B", m)) != -1) { } });',
          "Task.WaitAll(A, B);",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El claim sin ORDER BY",
      tarea:
        "Fija en un test que el claim toma la fila más vieja, y quita el `ORDER BY` para ver qué pasa.",
      pasos: [
        "Copia el test de la lámina siguiente en `Empresas.Tests/ElMensajeYLaCola.cs` y corre `dotnet test`: verde.",
        "Quita el `ORDER BY id` del claim y corre otra vez.",
        "Devuelve el `ORDER BY id`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ['Expected: ["m1"]', 'Actual:   ["m2"]'],
        },
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "El claim toma la más vieja",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/ElMensajeYLaCola.cs`, en la colección `\"postgres\"`:",
          lenguaje: "csharp",
          lineas: [
            '[Collection("postgres")]',
            "public class ElMensajeYLaCola(PostgresFixture db) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync() { db.Limpiar(); return Task.CompletedTask; }",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "    [Fact]",
            "    public void El_claim_toma_la_mas_vieja()",
            "    {",
            "        db.Ejecutar(\"INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3')\");",
            "        db.Ejecutar(\"UPDATE bandeja_salida SET entregado = false WHERE mensaje = 'm1'\");",
            "        var recibidos = new List<string>();",
            "        new PostgresEventStore(db.Cadena).ReclamarYEntregar(m => recibidos.Add(m));",
            '        Assert.Equal(new[] { "m1" }, recibidos);',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "¿Por qué tomó m2?",
      bloques: [
        {
          k: "texto",
          tam: "tenue",
          texto:
            "En `docker exec -it empresas-db psql -U postgres -d empresas_tests`. `ctid` es la posición física de cada fila:",
        },
        {
          k: "codigo",
          lenguaje: "sql",
          lineas: [
            "TRUNCATE bandeja_salida;",
            "INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3');",
            "SELECT ctid, mensaje FROM bandeja_salida;   -- (0,1) m1 · (0,2) m2 · (0,3) m3",
            "UPDATE bandeja_salida SET entregado = false WHERE mensaje = 'm1';",
            "SELECT ctid, mensaje FROM bandeja_salida;   -- (0,2) m2 · (0,3) m3 · (0,4) m1",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Tras el `UPDATE`, `m1` pasa de `(0,1)` a `(0,4)`.",
        },
        { k: "respuesta", texto: "El orden lo pide la consulta." },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "El claim es una piedra, no el muro",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Lo que una cola da y tu `SELECT` no:",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "**Ack**: lo mejor es at-least-once, y vivir con duplicados.",
            "**Reintento** con backoff.",
            "**Dead-letter** para el mensaje que nunca procesa.",
            "**Orden**, y **sobrevivir reinicios**.",
          ],
        },
        {
          k: "respuesta",
          texto: "Todas juntas, correctas y probadas, son un broker.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Igual que «todo o nada» era una transacción, «que el mensaje viaje sin perderse» es una **cola durable**, y no nos toca reimplementarla.",
      puntos: [
        {
          termino: "Claim",
          definicion:
            "`FOR UPDATE SKIP LOCKED`: un mensaje, un consumidor. Con `ORDER BY`, el más viejo.",
        },
        {
          termino: "At-least-once",
          definicion:
            "Lo mejor que da una entrega real: puede llegar dos veces, nunca cero.",
        },
      ],
      commit: {
        mensaje: "ES · El mensaje y la cola",
        preguntas: [
          "¿Qué garantías da una cola que tu `SELECT` no da, qué caída rompe dos de ellas, y por qué «exactamente una vez» no es real?",
        ],
      },
      siguiente: {
        seccion: "31 · El swap por reconocimiento",
        texto:
          "Llevamos a mano el diario, el proyector, el outbox y el arranque de una cola. Hay dos librerías que ya traen todo eso, sobre la misma Postgres.",
      },
    },
  ],
};
