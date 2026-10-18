// Fuente: workshop-event-sourcing/taller.md, entrada "60 · Observar el motor nuevo".
import type { Seccion } from "./tipos";

export const seccion60: Seccion = {
  numero: 60,
  titulo: "Observar el motor nuevo",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Responder preguntas de operación leyendo las tablas de Marten y Wolverine **en solo lectura**, sin tocar la app, y comprobar en la base que existe lo que declaraste en la configuración.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Operaciones pregunta por qué la vista **va atrasada**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "No puedes meterle un `Console.WriteLine` a Marten.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿En qué tabla vive el rezago?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una sesión que solo lee",
      tarea:
        "Abre una sesión SQL contra la base del servicio que no pueda escribir nada.",
      pasos: [
        "Abre `psql` contra la base del servicio, con el comando de abajo.",
        "Lo primero en la sesión: `SET default_transaction_read_only = on;`",
      ],
      logro: { items: ["Desde ahí, esa sesión **no puede escribir**."] },
      tips: [
        {
          k: "nuevo",
          idioma: "agentless",
          explicacion:
            "el estado del motor vive en `mt_streams`, `mt_events`, `mt_event_progression`, `wolverine_dead_letters` y `wolverine_recurring_messages`, y se lee solo con consultas.",
        },
        {
          k: "nota",
          texto:
            "⚠️ Un `UPDATE` a `mt_event_progression` mueve el checkpoint del daemon, y un `INSERT` en `mt_events` mete un hecho que nadie decidió.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: ["docker exec -it empresas-db psql -U postgres -d empresas"],
      },
    },
    {
      tipo: "reto",
      titulo: "Cinco preguntas al esquema",
      tarea:
        "Responde cinco preguntas de operación, cada una con una consulta que escribes tú.",
      pasos: [
        "Una pregunta a la vez: escribe su consulta y córrela.",
        "Para la (2), el `name` de la proyección es `VistaSuspendida:All`.",
      ],
      logro: {
        items: [
          "La (2) da el rezago: 0 si el daemon va al día.",
          "La (5) da la próxima vuelta de `cobro-mensual`.",
        ],
      },
      tips: [
        {
          k: "lista",
          titulo: "Las cinco preguntas",
          items: [
            "¿Qué streams crecen? `mt_streams` por `version`.",
            "¿Cuánto rezago hay? `max(seq_id)` de `mt_events` menos el `last_seq_id` de `VistaSuspendida:All`.",
            "¿Qué se escribe? Hechos por `type`.",
            "¿Qué falló? `wolverine_dead_letters`.",
            "¿Hay próxima vuelta? `next_occurrence` de `cobro-mensual`.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La lista por estado",
      tarea:
        "Operaciones quiere las suspensiones de su tenant por estado. Publica un endpoint que filtre el `Tablero` por `Estado`.",
      pasos: [
        "En `Program.cs`, junto a tus endpoints, el `MapGet` de abajo. `estado` llega de la query string.",
        'Pídelo: `curl -H "Authorization: Bearer $ACME" "http://localhost:5000/tablero?estado=efectiva"`',
      ],
      logro: {
        terminal: {
          salida: ['[{"id":"emp-160",…,"estado":"efectiva"}, …]'],
          tono: "ok",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'app.MapGet("/tablero", (string estado, IQuerySession s) =>',
          "    s.Query<Tablero>().Where(t => t.Estado == estado).ToListAsync());",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Mide antes",
      tarea:
        "Mira el plan de la consulta que Marten manda hoy: busca el estado dentro del JSON de cada fila.",
      pasos: [
        "En tu sesión de solo lectura: `SET enable_seqscan = off;` (Postgres usa un índice si tiene uno que sirva).",
        "Corre el `EXPLAIN` de abajo.",
      ],
      logro: {
        terminal: {
          salida: ["Filter: ((data ->> 'Estado'::text) = 'efectiva'::text)"],
          tono: "error",
        },
        items: ["El estado se revisa fila por fila."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "EXPLAIN · pg_indexes",
          explicacion:
            "`EXPLAIN` muestra el plan sin correr la consulta: `Index Scan` va por un índice, `Filter` revisa fila por fila. `pg_indexes` lista los índices que existen de verdad.",
        },
      ],
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d",
          "WHERE d.tenant_id = 'acme' AND d.data ->> 'Estado' = 'efectiva';",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Declara el índice y mide después",
      tarea:
        "Pídele a Marten una columna `estado` con su índice, y comprueba en la base que existe y que la consulta lo usa.",
      pasos: [
        "En el `AddMarten` de `AgregarEmpresas`: `opts.Schema.For<Tablero>().Duplicate(t => t.Estado);` Copia `Estado` a una columna `estado` con su índice.",
        "Reinicia y llama el endpoint **una vez**: Marten cambia el esquema la primera vez que se usa el `Tablero`.",
        "Corre `SELECT indexname FROM pg_indexes WHERE tablename = 'mt_doc_tablero';` y el `EXPLAIN` de abajo.",
      ],
      logro: {
        terminal: {
          salida: [
            "Index Scan using mt_doc_tablero_idx_estado",
            "  Index Cond: ((estado)::text = 'efectiva'::text)",
          ],
          tono: "ok",
        },
        items: ["`pg_indexes` muestra `mt_doc_tablero_idx_estado`."],
      },
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d",
          "WHERE d.tenant_id = 'acme' AND d.estado = 'efectiva';",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El índice que nadie creó",
      tarea:
        "Pasa la línea `Duplicate` a un método que nadie llama, y mira qué dice la base.",
      pasos: [
        "En `Empresas.Historia/Indices.cs` (`using Marten;`), la clase de abajo; quita la línea `Duplicate` del `AddMarten`. Reinicia.",
        "Llama el endpoint, y mira `pg_indexes` y el `EXPLAIN` por la columna.",
        "Llama `Indices.Registrar(opts)` desde `AddMarten` (o devuelve la línea), y comprueba que el índice volvió.",
      ],
      logro: {
        terminal: {
          salida: ["ERROR:  column d.estado does not exist"],
          tono: "error",
        },
        items: [
          "El endpoint responde igual, pero `pg_indexes` ya no tiene el índice: Marten quitó la columna y el índice.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class Indices",
          "{",
          "    public static void Registrar(StoreOptions opts) =>",
          "        opts.Schema.For<Tablero>().Duplicate(t => t.Estado);",
          "}",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El estado del motor vive en tablas que se leen **en solo lectura**, sin instrumentar la app. Lo declarado se comprueba con `pg_indexes` y `EXPLAIN`.",
      puntos: [
        {
          termino: "Agentless",
          definicion: "Observar el motor desde afuera, solo con consultas.",
        },
        {
          termino: "CosmosLens",
          definicion:
            "Corre estas consultas: su panel de rezago es la (2), sus dead letters la (4) y su lista de streams la (1).",
        },
        {
          termino: "pg_indexes · EXPLAIN",
          definicion:
            "Qué índices existen de verdad, y si una consulta puede usarlos.",
        },
      ],
      commit: {
        mensaje: "ES · Observar el motor nuevo",
        preguntas: [
          "Tres preguntas de operación, con su tabla y su columna.",
          "¿Por qué la solo lectura es parte de observar? ¿Qué te dice `pg_indexes` que tu configuración no te dice?",
        ],
      },
      siguiente: {
        seccion: "61 · Que el servicio avise",
        texto:
          "La consulta (2) responde solo cuando alguien la corre. La siguiente sección la pone dentro del servicio, para que avise solo.",
      },
    },
  ],
};
