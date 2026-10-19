// Fuente: workshop-event-sourcing/taller.md, entrada "28 · El hecho y su anuncio".
import type { Seccion } from "./tipos";

export const seccion28: Seccion = {
  numero: 28,
  titulo: "El hecho y su anuncio",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el aviso a facturación nunca mienta, guardando la intención de anunciar **en la misma transacción del hecho** (una bandeja de salida) y entregándola en un paso aparte.",
    },
    {
      tipo: "planteamiento",
      titulo: "La letra pequeña de Todo o nada",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "«El todo-o-nada cubre solo lo que viaja **dentro** de la transacción».",
        },
        {
          k: "texto",
          texto:
            "Cuando una empresa se suspende, facturación tiene que enterarse. Facturación vive afuera, en otro proceso.",
        },
        { k: "respuesta", texto: "Hoy duele." },
      ],
    },
    {
      tipo: "reto",
      titulo: "Facturación, fingida",
      tarea:
        "Crea una lista estática que finge a facturación: lo que el otro lado ya recibió.",
      pasos: ["**Al final** del `Program.cs`, la clase de abajo."],
      logro: { items: ["Compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class MundoExterno { public static List<string> Recibidos = new(); }",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Anunciar, y luego guardar",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "// en el handler, tras suspender:",
            'MundoExterno.Recibidos.Add($"suspendida:{cmd.EmpresaId}");   // 1) anuncia afuera',
            "stream.Append(e);                                            // 2) guarda el hecho",
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto: "Y un `throw` antes del `Commit` de `Append`.",
        },
        {
          k: "terminal",
          salida: [
            "mundo externo → suspendida:emp-1",
            "diario        → sin la suspensión",
          ],
          tono: "error",
        },
        {
          k: "respuesta",
          texto: "Un **fantasma**: anunciaste algo que no ocurrió.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "¿Y si…?",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "¿Y si invertimos el orden: guardar, y luego anunciar?",
        },
        {
          k: "respuesta",
          texto: "La caída mata el anuncio: facturación nunca se entera.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Y una transacción distribuida (2PC)?",
        },
        {
          k: "respuesta",
          texto: "Facturación no se va a enrolar en tu transacción.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La bandeja de salida",
      tarea:
        "Crea la bandeja y haz que `Guardar` escriba los anuncios en la misma transacción que los hechos.",
      pasos: [
        "En `psql`, crea la tabla con la sentencia de abajo.",
        "En `IEventStore`, `Guardar` gana un parámetro `IReadOnlyList<string> anuncios`.",
        "`PostgresEventStore` inserta cada anuncio en `bandeja_salida` dentro del mismo `tx`. `InMemoryEventStore` los ignora.",
      ],
      logro: { items: ["Compila, con la nueva firma en los dos stores."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Bandeja de salida (outbox)",
          explicacion:
            "una tabla que se escribe en la misma transacción que los hechos. Un paso aparte la entrega.",
        },
      ],
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "CREATE TABLE bandeja_salida(id BIGSERIAL PRIMARY KEY, mensaje TEXT NOT NULL,",
          "                            entregado BOOL NOT NULL DEFAULT false);",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La bandeja de salida (1 de 2)",
      piezas: [
        {
          etiqueta: "`IEventStore`, con la firma nueva de `Guardar`",
          lenguaje: "csharp",
          lineas: [
            "public interface IEventStore",
            "{",
            "    List<EventoAlmacenado> GetEvents(string id);",
            "    void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios);",
            "    void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos);   // de «Dos streams, la misma clave», sin cambios",
            "}",
          ],
        },
        {
          etiqueta: "`InMemoryEventStore`: implementa la nueva firma, pero ignora los anuncios (no tiene bandeja)",
          lenguaje: "csharp",
          lineas: [
            "public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios)",
            "{ /* el cuerpo de siempre; los anuncios no aplican al doble */ }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La bandeja de salida (2 de 2)",
      piezas: [
        {
          etiqueta: "`PostgresEventStore`: los hechos Y los anuncios, en la MISMA transacción",
          lenguaje: "csharp",
          lineas: [
            "public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres, IReadOnlyList<string> anuncios)",
            "{",
            "    using var c = new NpgsqlConnection(_cadena); c.Open();",
            "    using var tx = c.BeginTransaction();",
            "    try",
            "    {",
            "        foreach (var sobre in sobres) { /* el INSERT en eventos de siempre, con cmd.Transaction = tx */ }",
            "        foreach (var msg in anuncios)",
            "        {",
            "            using var b = c.CreateCommand();",
            "            b.Transaction = tx;",
            '            b.CommandText = "INSERT INTO bandeja_salida(mensaje) VALUES(@m)";',
            '            b.Parameters.AddWithValue("m", msg);',
            "            b.ExecuteNonQuery();",
            "        }",
            "        tx.Commit();   // hechos y anuncios entran juntos, o ninguno",
            "    }",
            '    catch (PostgresException e) when (e.SqlState == "23505")',
            "    {",
            '        throw new ConcurrencyException($"Alguien escribió primero en \'{id}\' — recarga y reintenta.");',
            "    }",
            "}",
          ],
        },
      ],
      nota: "Todo o nada, ahora de las dos cosas: si el hecho se revierte, el anuncio se revierte con él.",
    },
    {
      tipo: "reto",
      titulo: "El anuncio viaja con el hecho",
      tarea:
        "Que el handler que suspende guarde el hecho y su anuncio en una sola llamada.",
      pasos: [
        "En `EventStream`: `Append(agg)` delega a `Append(agg, Array.Empty<string>())`, y agrega el overload `Append(agg, anuncios)`.",
        "En `SuspenderHandler`, la línea de abajo.",
        "Los demás handlers y `GuardarNuevo` no cambian.",
      ],
      logro: {
        items: [
          "Suspender una empresa deja una fila `NOT entregado` en `bandeja_salida`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'stream.Append(e, new[] { $"suspendida:{cmd.EmpresaId}" });   // el hecho Y el anuncio',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El anuncio viaja con el hecho",
      piezas: [
        {
          etiqueta: "`EventStream` conserva el viejo `Append` y añade el overload",
          lenguaje: "csharp",
          lineas: [
            "public void Append(T agg) => Append(agg, Array.Empty<string>());",
            "public void Append(T agg, IReadOnlyList<string> anuncios)",
            "{",
            "    var sobres = new List<EventoAlmacenado>();",
            "    foreach (var hecho in agg.SinConfirmar) sobres.Add(new EventoAlmacenado(++_version, hecho));",
            "    _store.Guardar(_aggregateId, sobres, anuncios);",
            "    agg.MarcarConfirmados();",
            "}",
          ],
        },
        {
          etiqueta: "El handler ya no toca el mundo externo: deja el anuncio en la bandeja",
          lenguaje: "csharp",
          lineas: [
            "public void Handle(SuspenderEmpresa cmd)",
            "{",
            "    var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);",
            "    var e = stream.Get();",
            "    e.Suspender(cmd.Motivo);",
            '    stream.Append(e, new[] { $"suspendida:{cmd.EmpresaId}" });',
            "}",
          ],
        },
      ],
      nota: "Los otros handlers siguen llamando `Append(agg)`, y el registro sigue con `GuardarNuevo`: ninguno cambia.",
    },
    {
      tipo: "reto",
      titulo: "La entrega, aparte",
      tarea:
        "Escribe `EntregarPendientes()`, solo en `PostgresEventStore`: entrega lo que hay en la bandeja y devuelve cuántas entregó.",
      pasos: [
        "Lee **todas** las filas `NOT entregado` a una lista, y cierra el lector.",
        "Luego, por cada una: `MundoExterno.Recibidos.Add(mensaje)` y `UPDATE ... SET entregado = true`.",
        "Devuelve cuántas entregó.",
      ],
      logro: {
        items: [
          "Tras un acto que confirma, `EntregarPendientes()` devuelve `1`.",
          "La segunda vez, devuelve `0`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Si cae en medio, puede entregar dos veces. Eso se cierra más adelante.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La entrega, aparte",
      piezas: [
        {
          etiqueta: "Solo en `PostgresEventStore`",
          lenguaje: "csharp",
          lineas: [
            "public int EntregarPendientes()",
            "{",
            "    using var c = new NpgsqlConnection(_cadena); c.Open();",
            "",
            "    var pendientes = new List<(long id, string mensaje)>();      // 1) lee TODO y cierra el lector",
            "    using (var q = c.CreateCommand())",
            "    {",
            '        q.CommandText = "SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado ORDER BY id";',
            "        using var r = q.ExecuteReader();",
            "        while (r.Read()) pendientes.Add((r.GetInt64(0), r.GetString(1)));",
            "    }",
            "",
            "    foreach (var (id, mensaje) in pendientes)                    // 2) efecto externo, luego marca",
            "    {",
            "        MundoExterno.Recibidos.Add(mensaje);",
            "        using var u = c.CreateCommand();",
            '        u.CommandText = "UPDATE bandeja_salida SET entregado = true WHERE id = @id";',
            '        u.Parameters.AddWithValue("id", id);',
            "        u.ExecuteNonQuery();",
            "    }",
            "    return pendientes.Count;",
            "}",
          ],
        },
      ],
      nota: "Efecto externo y **luego** marcar: si caes en medio, entrega dos veces. Es a propósito; ese cabo se cierra más adelante.",
    },
    {
      tipo: "reto",
      titulo: "Guardar, y caer antes de anunciar",
      tarea:
        "Fija en un test que una caída después de guardar no pierde el anuncio.",
      pasos: [
        "En `PostgresFixture`: `CREATE TABLE IF NOT EXISTS bandeja_salida` en el constructor, y súmala al `TRUNCATE` de `Limpiar()`.",
        "Crea `Empresas.Tests/ElHechoYSuAnuncio.cs` con el código de las dos láminas siguientes, **con** `stream.Append(e)`, y corre `dotnet test`.",
        'Cambia esa línea por `stream.Append(e, new[] { "suspendida:emp-1" })` y corre otra vez.',
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.Equal() Failure", "Expected: 1", "Actual:   0"],
        },
        items: ["Con el anuncio en el `Append`: verde."],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La clase de tests",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/ElHechoYSuAnuncio.cs`. `MundoExterno` es estática: se vacía antes de cada test.",
          lenguaje: "csharp",
          lineas: [
            '[Collection("postgres")]',
            "public class ElHechoYSuAnuncio(PostgresFixture db) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync()",
            "    {",
            "        db.Limpiar();",
            "        MundoExterno.Recibidos.Clear();",
            "        return Task.CompletedTask;",
            "    }",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "",
            "    // aquí va el test de la lámina siguiente",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El proceso cae después de guardar",
      piezas: [
        {
          etiqueta: "Dentro de `ElHechoYSuAnuncio`:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Una_caida_despues_de_guardar_no_pierde_el_anuncio()",
            "{",
            "    var store = new PostgresEventStore(db.Cadena);",
            "    var nueva = new Empresa();",
            '    nueva.Registrar("900123456", "Acme", "Premium");',
            '    store.GuardarNuevo("emp-1", "900123456", nueva.SinConfirmar);',
            '    var stream = store.AbrirStream<Empresa>("emp-1"); var e = stream.Get();',
            '    e.Suspender("falta de pago");',
            "    stream.Append(e);                     // 1) guarda el hecho",
            "    // 💥 el proceso cae aquí: la línea que anunciaba nunca corre",
            '    Assert.Contains(store.GetEvents("emp-1"), s => s.EventData is EmpresaSuspendida);',
            "    Assert.Equal(1, store.EntregarPendientes());",
            '    Assert.Equal(new[] { "suspendida:emp-1" }, MundoExterno.Recibidos);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "El fantasma, con y sin bandeja",
      tarea:
        "Mete una caída antes del `Commit`, primero con la versión ingenua y después con la bandeja.",
      pasos: [
        "Versión ingenua (`MundoExterno.Recibidos.Add` en el handler, luego `Append(e)`), con un `throw` antes del `Commit`. Corre.",
        "Con la bandeja, el mismo `throw`. Corre.",
        "Quita el `throw`.",
      ],
      logro: {
        items: [
          "Ingenua: `MundoExterno` tiene el anuncio, y el diario no tiene el hecho.",
          "Con bandeja: `MundoExterno` y `bandeja_salida` vacíos, y el hecho tampoco entra.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Dos escrituras a dos sistemas no se hacen atómicas. El outbox las reduce a **una escritura atómica** (el hecho y la intención) más una entrega que se reintenta.",
      puntos: [
        {
          termino: "Outbox",
          definicion:
            "La bandeja de salida: la intención de anunciar, en la transacción del hecho.",
        },
        {
          termino: "Fantasma",
          definicion: "Un anuncio de algo que el diario dice que no pasó.",
        },
      ],
      commit: {
        mensaje: "ES · El hecho y su anuncio",
        preguntas: [
          "¿Por qué una escritura atómica más una entrega reintentable no miente, y dos escrituras a dos sistemas sí? ¿Qué caída rompe la segunda?",
        ],
      },
      siguiente: {
        seccion: "29 · El evento público",
        texto:
          "`suspendida:emp-1` ya es un contrato con facturación, pero improvisado. ¿Qué ponemos de verdad en el mensaje?",
      },
    },
  ],
};
