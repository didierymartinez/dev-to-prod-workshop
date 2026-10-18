// Fuente: workshop-event-sourcing/taller.md, entrada "47 · La respuesta dice cuánto sabe".
import type { Seccion } from "./tipos";

export const seccion47: Seccion = {
  numero: 47,
  titulo: "La respuesta dice cuánto sabe",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que cada lectura de una vista diga **cuántos hechos le faltan** (`X-Rezago`), y que el listado entregue **páginas de tamaño fijo**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Suspendo una empresa y pido su ficha enseguida: dice `activa`, con 200.",
        },
        { k: "texto", tam: "enorme", texto: "¿Ese 200 es verdad?" },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un 200 que va atrás",
      tarea:
        "Suspende una empresa y pide su ficha en el mismo instante, para ver qué dice.",
      pasos: [
        "Da de alta emp-80 con tu `POST /empresas` (NIT `908000000`) y pide su ficha hasta que dé 200.",
        "Suspéndela y pide su ficha en la misma línea, con el comando de abajo.",
        "Un segundo después, pide la ficha otra vez.",
      ],
      logro: {
        terminal: {
          salida: [
            "HTTP/1.1 202 Accepted",
            'HTTP/1.1 200 OK {… ,"suspension":null, … ,"estado":"activa"}',
          ],
          tono: "error",
        },
        items: ["Un segundo después dice `efectiva`, y nada avisó."],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "curl -i -X POST http://localhost:5000/empresas/emp-80/suspender; \\",
          "  curl -i http://localhost:5000/empresas/emp-80",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Cuántos hechos le faltan",
      tarea:
        "Escribe un método que diga cuántos hechos le faltan al shard de una vista.",
      pasos: [
        "En `Program.cs`, antes de `app.Run()`, el método `Rezago` de abajo.",
        "Es el high-water del diario (`EventSequenceNumber`) menos el progreso del shard, buscado por `ShardName`.",
      ],
      logro: { items: ["Compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "static async Task<long> Rezago(IDocumentStore store, string shard)",
          "{",
          "    var stats = await store.Advanced.FetchEventStoreStatistics();",
          "    var progreso = await store.Advanced.AllProjectionProgress();",
          "    return stats.EventSequenceNumber",
          "        - (progreso.FirstOrDefault(x => x.ShardName == shard)?.Sequence ?? 0);",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El rezago, en un header",
      tarea:
        "Que la ficha y el listado digan, en `X-Rezago`, cuántos hechos le faltan a su vista.",
      pasos: [
        "Los dos endpoints piden además `IDocumentStore store` y `HttpResponse respuesta`.",
        "En la ficha, arriba, `X-Rezago` con `Rezago(store, \"Tablero:All\")`, para todas sus salidas.",
        "En el listado, con el de `VistaSuspendida:All`. Prueba con emp-81: suspéndela y pide su ficha enseguida.",
      ],
      logro: {
        items: [
          'emp-81, recién suspendida: `200 X-Rezago: 2` con `"estado":"activa"`.',
          'Un segundo después: `X-Rezago: 0` con `"efectiva"`.',
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: 'respuesta.Headers["X-Rezago"] = "2";',
          explicacion:
            "agrega un header propio. Va en un header porque la ficha tiene tres salidas con cuerpos distintos.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La pantalla vuelve a pedir",
      tarea:
        "Simula la pantalla de soporte: pide la ficha hasta que el rezago llegue a 0, pocas veces.",
      pasos: [
        "Da de alta emp-82 (NIT `908200000`) y espera a que su ficha dé 200.",
        "Corre el comando de abajo: suspende emp-82 y, en la misma línea, pide su ficha hasta cinco veces.",
      ],
      logro: {
        terminal: {
          salida: ["rezago 2", "rezago 5", "rezago 0"],
          tono: "ok",
        },
        items: [
          "El rezago puede subir antes de bajar: las respuestas de los socios también son hechos.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "curl -s -o /dev/null -X POST http://localhost:5000/empresas/emp-82/suspender; \\",
          "for i in 1 2 3 4 5; do",
          "  r=$(curl -si http://localhost:5000/empresas/emp-82 | tr -d '\\r' | awk -F': ' '/^X-Rezago/{print $2}')",
          '  echo "rezago $r"; [ "$r" = 0 ] && break; sleep 0.5',
          "done",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El cero que significa «todavía no»",
      tarea:
        "Agrega un endpoint con la cuenta de suspensiones de una empresa, con un cero cuando la vista no tiene el documento.",
      pasos: [
        "Junto a tus endpoints, el de abajo.",
        "Pide la cuenta de emp-999. Da de alta emp-83, y cuando su ficha dé 200, suspéndela y pide su cuenta en la misma línea.",
        "Que responda como la ficha: el `X-Rezago` de `VistaSuspendida:All` y, sin documento, el diario decide entre 202 y 404. Compruébalo con emp-84.",
      ],
      logro: {
        items: [
          "Antes: emp-999 da 0, y emp-83 recién suspendida también da 0 (un segundo después, 1).",
          "Después: emp-999 da 404, y emp-84 enseguida da 0 con `X-Rezago` mayor que 0.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapGet("/empresas/{id}/suspensiones", async (string id, IQuerySession session) =>',
          "    (await session.LoadAsync<VistaSuspendida>(id))?.Suspensiones ?? 0);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Veinte mil suspendidas",
      tarea:
        "Siembra veinte mil filas falsas en la vista y mide cuánto pesa el listado.",
      pasos: [
        "Antes de `app.Run()`, el bloque de abajo: documentos falsos, escritos directo en la vista. Arranca una vez y quítalo.",
        "Con el servicio arriba, mide el listado con el `curl` de «Lo logras cuando».",
      ],
      logro: {
        terminal: {
          comando:
            'curl -s -o /dev/null -w "%{size_download} bytes\\n" http://localhost:5000/empresas/suspendidas',
          salida: ["269026 bytes"],
          tono: "error",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = app.Services.GetRequiredService<IDocumentStore>().LightweightSession())",
          "{",
          "    for (var i = 0; i < 20000; i++)",
          '        s.Store(new VistaSuspendida { Id = $"falsa-{i}", Suspendida = true });',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Una página de 50",
      tarea:
        "Que el listado traiga una página de tamaño fijo y diga si hay más.",
      pasos: [
        "En el listado, un parámetro `int? pagina`, con 1 si no viene.",
        "`OrderBy(v => v.Id)` y una página de 50, que fija el servidor.",
        "Devuelve `new { Empresas = p, Pagina = p.PageNumber, HayMas = p.HasNextPage }`, y mide otra vez.",
      ],
      logro: {
        terminal: {
          salida: ['{"empresas":[… 50],"pagina":1,"hayMas":true}'],
          tono: "ok",
        },
        items: ["Pesa unos 600 bytes, aunque la vista tenga veinte mil."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "ToPagedListAsync",
          explicacion:
            "`(pagina, tamaño)`, con `using Marten.Pagination;`: trae solo esa página, con `PageNumber` y `HasNextPage`. Necesita un `OrderBy`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El orden, sobre el índice",
      tarea:
        "Compara en `psql` el orden por `Id` con el orden por otro campo, con las falsas todavía ahí.",
      pasos: [
        "`EXPLAIN SELECT id FROM mt_doc_vistasuspendida ORDER BY id LIMIT 50;`",
        "`EXPLAIN SELECT id FROM mt_doc_vistasuspendida ORDER BY data->>'SuspendidaDesde' LIMIT 50;`",
      ],
      logro: {
        items: [
          "`ORDER BY id` da `Index Only Scan`.",
          "`ORDER BY data->>'SuspendidaDesde'` da `Sort … Seq Scan`: ordena la tabla entera.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Saca las falsas",
      tarea:
        "Rearma la vista desde el diario: en el diario no hay ninguna `falsa-`.",
      pasos: [
        'Antes de `app.Run()`: `await Vistas.Rearmar(app, "VistaSuspendida");`',
        "Arranca una vez y quita la línea.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT count(*) FROM mt_doc_vistasuspendida WHERE id LIKE 'falsa-%';",
          salida: ["0"],
          tono: "ok",
        },
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Una respuesta de una vista **dice cuánto sabe**. Un documento que no está no es un cero. Un listado tiene tope.",
      puntos: [
        {
          termino: "X-Rezago",
          definicion:
            "Cuántos hechos del diario le faltan a la vista. Con 0, está al día.",
        },
        {
          termino: "Sin documento",
          definicion: "No es un cero: el diario dice «en proceso» o «no existe».",
        },
        {
          termino: "Página con tope",
          definicion:
            "Tamaño fijo del servidor, con un orden sobre un campo con índice.",
        },
      ],
      commit: {
        mensaje: "ES · La respuesta dice cuánto sabe",
        preguntas: [
          "¿Por qué una lista vacía con rezago 0 y otra con rezago 3 no dicen lo mismo?",
          "¿Por qué el tamaño de página no lo elige el cliente?",
        ],
      },
      siguiente: {
        seccion: "48 · El borde es un contrato",
        texto:
          "Cuando algo sale mal, el servicio responde 500. Un NIT repetido llega a la pantalla como falla del servidor, con el stack de nuestro código.",
      },
    },
  ],
};
