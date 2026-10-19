// Fuente: workshop-event-sourcing/taller.md, entrada "18 · La vista se mantiene sola".
import type { Seccion } from "./tipos";

export const seccion18: Seccion = {
  numero: 18,
  titulo: "La vista se mantiene sola",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que un **proyector** derive la vista del diario desde un **checkpoint**, y que los handlers dejen de tocarla.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Cada handler escribe dos veces: el hecho y la vista. ¿Y si muere entre las dos?",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'var s = store.AbrirStream<Empresa>("emp-1");',
            "var e = s.Get();",
            'e.Suspender("falta de pago");',
            "s.Append(e);                       // 1) el hecho entra al diario",
            '// 💥 el proceso muere aquí: nunca llega a vista.Actualizar("emp-1", e)',
          ],
        },
        {
          k: "respuesta",
          texto:
            "`emp-1` queda suspendida en el diario y ausente de la vista. Sin excepción.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "La vista depende de que **cada escritor se acuerde**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un cursor para el diario",
      tarea:
        "Dale al diario un número que avance sobre todas las empresas, y una tabla donde guardar hasta dónde se leyó.",
      pasos: [
        "Abre `psql` con `docker exec -it empresas-db psql -U postgres`.",
        "Agrega a `eventos` la columna `seq`, con el primer comando de abajo. La llave `(stream, version)` se queda.",
        "Crea la tabla `checkpoint` y su fila en 0, con los otros dos.",
      ],
      logro: {
        items: [
          "Cada fila de `eventos` tiene su `seq`, y `checkpoint` tiene la fila `empresas_estado` en `0`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "BIGSERIAL",
          explicacion:
            "un contador que Postgres asigna en cada `INSERT`, cruzando todas las empresas. `version` no sirve de cursor: reinicia en 1 en cada empresa.",
        },
        {
          k: "nuevo",
          idioma: "Checkpoint",
          explicacion:
            "el `seq` hasta el que llegó el proyector, guardado en una tabla.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "ALTER TABLE eventos ADD COLUMN seq BIGSERIAL;",
          "CREATE TABLE checkpoint(nombre TEXT PRIMARY KEY, ultimo_seq BIGINT NOT NULL);",
          "INSERT INTO checkpoint VALUES ('empresas_estado', 0) ON CONFLICT DO NOTHING;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El proyector",
      tarea:
        "Escribe un proyector que lea del diario los hechos nuevos, ponga al día la vista y avance el checkpoint.",
      pasos: [
        "En el código suelto del `Program.cs`, tres ayudantes: `LeerCursor()` y `GuardarCursor(ultimo)` leen y escriben `ultimo_seq`; `HechosDesde(desde)` hace `SELECT seq, stream FROM eventos WHERE seq > desde ORDER BY seq`.",
        "`int CorrerProyector()`: `LeerCursor()`, y por cada hecho de `HechosDesde`, rehidrata la empresa y llama `vista.Actualizar(stream, empresa)`. Al final, `GuardarCursor(ultimo)`. Devuelve cuántos aplicó.",
        "Quita `vista.Actualizar` de `SuspenderHandler` y `PagarDeudaHandler`: vuelven a una sola escritura.",
      ],
      logro: { items: ["Compila, y los handlers ya no nombran la vista."] },
      tips: [
        {
          k: "piensa",
          texto:
            "El proyector no mira el tipo del hecho: rehidrata la empresa y copia su estado entero, `plan` incluido.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El proyector",
      piezas: [
        {
          etiqueta: "En el código suelto del `Program.cs`: `CorrerProyector`",
          lenguaje: "csharp",
          lineas: [
            "int CorrerProyector()",
            "{",
            "    long desde = LeerCursor();                       // SELECT ultimo_seq FROM checkpoint WHERE nombre='empresas_estado'",
            "    var nuevos = HechosDesde(desde);                 // SELECT seq, stream FROM eventos WHERE seq > desde ORDER BY seq",
            "    long ultimo = desde;",
            "    int aplicados = 0;",
            "    foreach (var (seq, stream) in nuevos)",
            "    {",
            "        var empresa = store.AbrirStream<Empresa>(stream).Get();   // rehidrata del diario",
            "        vista.Actualizar(stream, empresa);                        // la fila completa: suspendida Y plan",
            "        ultimo = seq;",
            "        aplicados++;",
            "    }",
            "    GuardarCursor(ultimo);                            // UPDATE checkpoint SET ultimo_seq=@ultimo WHERE nombre='empresas_estado'",
            "    return aplicados;",
            "}",
          ],
        },
      ],
      nota: "Los handlers vuelven a una **sola** escritura: `Append`. La vista es problema del proyector.",
    },
    {
      tipo: "reto",
      titulo: "Proyecta dos veces",
      tarea:
        "Parte de un escenario limpio, escribe cuatro hechos sin tocar la vista y deja que el proyector la ponga al día.",
      pasos: [
        "En `psql`: `TRUNCATE eventos, empresas_estado;` y `UPDATE checkpoint SET ultimo_seq = 0;`",
        "🔁 Reemplaza la siembra por la de abajo. Si usas el helper `sembrar`, quítale el `vista.Actualizar`.",
        "Corre una vez y comenta la siembra.",
      ],
      logro: {
        terminal: { comando: "dotnet run", tono: "ok", salida: ["4", "0"] },
        items: [
          "`emp-1` sale suspendida con plan Premium; `emp-2`, activa con su plan.",
          "Con `ultimo_seq` en 0, la vista se reconstruye entera.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'sembrar("emp-1", e => { e.Registrar("Andes", "Básico"); e.CambiarPlan("Premium"); e.Suspender("falta"); });',
          'sembrar("emp-2", e => e.Registrar("Beta", "Enterprise"));',
          "",
          "Console.WriteLine(CorrerProyector());",
          "Console.WriteLine(CorrerProyector());",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El proyector se cura solo tras una caída, es **idempotente**, y reconstruir es bajar el checkpoint a 0.",
      puntos: [
        {
          termino: "Proyector",
          definicion:
            "Deriva la vista del diario por su cuenta. Los handlers ya no la tocan.",
        },
        {
          termino: "Checkpoint",
          definicion:
            "Hasta dónde leyó. Si el proceso muere, retoma desde ahí. Correrlo otra vez aplica 0: es idempotente.",
        },
      ],
      decision:
        "La vista se **deriva del diario** por un proyector con checkpoint, no la actualiza cada handler. El proyector **rehidrata** cada empresa y copia su estado completo.",
      commit: {
        mensaje: "ES · La vista se mantiene sola",
        preguntas: [
          "¿Qué ganaste al pasar la vista a un solo proyector, y por qué rehidratar le gana a un `if` por tipo de hecho?",
        ],
      },
      siguiente: {
        seccion: "19 · El rezago: ¿cuánto atrás va la vista?",
        texto:
          "Mientras el proyector no aplica lo nuevo, la vista va atrás. ¿Cuánto?",
      },
    },
  ],
};
