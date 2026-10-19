// Fuente: workshop-event-sourcing/taller.md, entrada "21 · ¿Merecía event sourcing?".
import type { Seccion } from "./tipos";

export const seccion21: Seccion = {
  numero: 21,
  titulo: "¿Merecía event sourcing?",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Decidir con **dos preguntas** cuándo no usar event sourcing, y hacer el catálogo de planes como una **tabla plana** que no pierde un cambio cuando dos lo editan a la vez.",
    },
    {
      tipo: "planteamiento",
      titulo: "Un catálogo de planes, con su precio",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "¿Le montamos diario, proyección, checkpoint y panel de fallos?",
        },
        {
          k: "lista",
          marca: "punto",
          items: [
            "`PlanRegistrado`, `PrecioCambiado`",
            "otra vista, otro `CorrerProyector()`",
            "su `checkpoint`, su `proyeccion_fallos`, su `Reconstruir()`",
          ],
        },
        {
          k: "lista",
          marca: "pregunta",
          porItem: true,
          items: [
            "¿Alguien va a preguntar cómo llegó Premium a $150.000?",
            "¿Hay alguna regla que un `UPDATE` al precio pueda violar?",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Hazlo plano",
      tarea:
        "Crea el catálogo de planes como una tabla plana en la misma base del diario. Sin eventos, sin proyección, sin checkpoint.",
      pasos: [
        "Abre `psql`: `docker exec -it empresas-db psql -U postgres`.",
        "Crea la tabla `planes` e inserta Básico (0), Premium (120000) y Enterprise (450000).",
        "Sube Premium a 150000 con un `UPDATE` y lista los planes ordenados por precio.",
      ],
      logro: {
        items: [
          "«¿Qué planes hay y a qué precio?» es un solo `SELECT`; cambiar un precio, un `UPDATE`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "CREATE TABLE planes(codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL);",
          "INSERT INTO planes VALUES ('basico','Básico',0), ('premium','Premium',120000),",
          "                          ('enterprise','Enterprise',450000);",
          "UPDATE planes SET precio = 150000 WHERE codigo = 'premium';",
          "SELECT codigo, nombre, precio FROM planes ORDER BY precio;",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Las dos preguntas",
      bloques: [
        {
          k: "lista",
          marca: "numero",
          items: [
            "¿Importa la **historia**, o basta el estado de hoy?",
            "¿Hay una **invariante** que un `UPDATE` pueda romper?",
          ],
        },
        {
          k: "tabla",
          columnas: ["", "¿Historia?", "¿Invariante?", "→"],
          filas: [
            ["Empresa", "sí", "sí", "event sourcing"],
            ["Catálogo de planes", "no", "no", "tabla plana"],
          ],
        },
        {
          k: "texto",
          texto:
            "Una `PRIMARY KEY` o un `precio >= 0` los sostiene la base. La invariante que pide diario es **la que ningún** `CHECK` **atrapa**.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La versión de adorno",
      tarea:
        "Hazlo: la cura parte de aquí. Dos personas editan el precio de Premium a la vez, con una columna `version` que nadie mira.",
      pasos: [
        "En `psql`: `ALTER TABLE planes ADD COLUMN version INT NOT NULL DEFAULT 1;`",
        "Abre **dos** `psql`, A y B, cada uno en su terminal. Los dos leen: `SELECT precio, version FROM planes WHERE codigo = 'premium';`",
        "Primero A y después B, el `UPDATE` de abajo: A con `160000`, B con `140000`. Lee otra vez.",
      ],
      logro: {
        items: [
          "Los dos leen `150000 | 1`, y los dos responden `UPDATE 1`.",
          "Al final: `140000 | 3`. El cambio de A **se perdió sin aviso**.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "UPDATE planes SET precio = 160000, version = version + 1 WHERE codigo = 'premium';",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La versión, en el WHERE",
      tarea:
        "Que cada `UPDATE` exija la versión que leyó: si ya no es la actual, no cambia nada.",
      pasos: [
        "Repite la carrera desde la versión de ahora, la `3`: agrega `AND version = 3` al `WHERE` de cada `UPDATE`.",
        "Primero A, después B.",
      ],
      logro: {
        terminal: {
          tono: "ok",
          salida: ["en A: UPDATE 1", "en B: UPDATE 0"],
        },
        items: ["`UPDATE 0` es el conflicto: Postgres no lanza."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Desde C#, `ExecuteNonQuery()` devuelve ese conteo: `== 0` → `ConcurrencyException`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La versión, en el WHERE",
      piezas: [
        {
          etiqueta: "En `psql`, A y B: cada `UPDATE` exige la versión que leyó",
          lenguaje: "sql",
          lineas: [
            "UPDATE planes SET precio = 160000, version = version + 1 WHERE codigo = 'premium' AND version = 3;   -- en A: UPDATE 1",
            "UPDATE planes SET precio = 140000, version = version + 1 WHERE codigo = 'premium' AND version = 3;   -- en B: UPDATE 0",
          ],
        },
        {
          etiqueta: "Desde C#, `ExecuteNonQuery()` devuelve ese mismo conteo, y `@v` es la versión leída",
          lenguaje: "csharp",
          lineas: [
            'cmd.CommandText = "UPDATE planes SET precio = @p, version = version + 1 WHERE codigo = @c AND version = @v";',
            "// … los tres parámetros, con AddWithValue como siempre",
            "if (cmd.ExecuteNonQuery() == 0)",
            "    throw new ConcurrencyException($\"El plan '{codigo}' cambió desde que lo leíste: recarga y reintenta.\");",
          ],
        },
      ],
      nota: "`UPDATE 0` es el conflicto: ninguna fila tenía la versión que B leyó.",
    },
    {
      tipo: "rompelo",
      titulo: "Una sola verdad",
      tarea:
        "Hazlo: la cura parte de aquí. Deja en el código un hecho del catálogo, como si hubiera quedado de cuando empezaste a montarlo con eventos, y úsalo.",
      pasos: [
        "Al final del `Program.cs`: `public record PrecioCambiado(string Codigo, int NuevoPrecio);`. En el mapa de tu `EventStore`: `[\"precio-cambiado\"] = typeof(PrecioCambiado)`.",
        "Arriba, graba el hecho con la línea de abajo, y corre el proyector.",
      ],
      logro: {
        items: [
          "El diario dice `180000`; la tabla, `160000`.",
          "Y `plan-premium` aparece en `empresas_estado`, como una empresa más.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'store.Guardar("plan-premium", new[] { new EventoAlmacenado(1, new PrecioCambiado("premium", 180000)) });',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Borra lo que contradice",
      tarea:
        "Quita del código y de la base todo lo que hace parecer event-sourced al catálogo.",
      pasos: [
        "Borra el `record PrecioCambiado`, su línea del mapa y la línea que lo graba.",
        "En `psql`: `DELETE FROM eventos WHERE stream = 'plan-premium';` y `DELETE FROM empresas_estado WHERE id = 'plan-premium';`",
      ],
      logro: {
        items: ["Premium tiene un solo precio: el de la tabla."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Si nadie pregunta por la historia y no hay invariante que un `UPDATE` rompa, la tabla plana es lo correcto. **Plano no es sin cuidado.**",
      puntos: [
        {
          termino: "Las dos preguntas",
          definicion:
            "¿Importa la historia? ¿Hay una invariante que un `UPDATE` pueda romper? Si las dos son «no», tabla plana.",
        },
        {
          termino: "Una sola verdad",
          definicion:
            "También en tu `DECISIONES.md`: «En el código no queda nada que haga parecer event-sourced al catálogo: ni hechos del catálogo ni su nombre en el mapa del diario.»",
        },
      ],
      decision:
        "El catálogo `planes` es una tabla plana: nadie pregunta por su historia y no tiene una invariante que un `UPDATE` rompa. Cada `UPDATE` exige la versión que leyó (`WHERE version = @v`): 0 filas es un conflicto.",
      commit: {
        mensaje: "ES · ¿Merecía event sourcing?",
        preguntas: [
          "Un tercer ejemplo del dominio, decidido con las dos preguntas: ¿diario o tabla plana?",
        ],
      },
      siguiente: {
        seccion: "22 · El puerto propio",
        texto:
          "Cada vez que pruebas una regla, arrancas una base de datos.",
      },
    },
  ],
};
