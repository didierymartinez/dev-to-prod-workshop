// Fuente: workshop-event-sourcing/taller.md, entrada "27 · La vista por consulta".
import type { Seccion } from "./tipos";

export const seccion27: Seccion = {
  numero: 27,
  titulo: "La vista por consulta",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Responder «¿cuánto ha pagado cada empresa?» con una **segunda vista**, `pagos`, que guarda una fila por cada hecho de pago y lleva su propio checkpoint.",
    },
    {
      tipo: "planteamiento",
      titulo: "Conciliación pregunta",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "¿Cuánto ha pagado cada empresa, y en cuántos pagos?",
        },
        {
          k: "texto",
          tam: "enorme",
          texto:
            "¿De dónde sacamos el total pagado: de la vista de estado, o del agregado?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Dos pagos en emp-1",
      tarea:
        "El diario todavía no tiene pagos. Siembra dos en `emp-1`, una sola vez, y mira qué te da el agregado.",
      pasos: [
        "En tu `Program.cs`, siembra los dos pagos con el código de abajo y córrelo **una sola vez**.",
        'Luego borra ese bloque y rehidrata `emp-1`: `store.AbrirStream<Empresa>("emp-1").Get()`.',
        "Imprime su `DeudaPendiente`.",
      ],
      logro: {
        items: ["`e.DeudaPendiente → false`: un bool."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var s1 = store.AbrirStream<Empresa>("emp-1");',
          "var e1 = s1.Get();",
          "e1.RegistrarPago(500);",
          "e1.RegistrarPago(300);",
          "s1.Append(e1);",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "El estado tiró los montos",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "El agregado guardó solo «¿debe o no debe?». La vista `Suspendidas` no sabe nada de pagos.",
        },
        {
          k: "texto",
          texto: "¿Y si le agrego un `TotalPagado` al agregado?",
        },
        {
          k: "respuesta",
          texto:
            "Habría que rehidratar diez mil empresas, y engordar el modelo de escritura por un reporte.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Los montos están en el diario, en cada `PagoRegistrado(Monto)`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una vista para los pagos",
      tarea:
        "Crea la tabla `pagos`, con una fila por cada hecho de pago, y su propia fila en `checkpoint`.",
      pasos: [
        "En `psql`, corre las dos sentencias de abajo.",
        "Mira `checkpoint`: ahora tiene dos filas, una por vista.",
      ],
      logro: {
        items: [
          "`pagos` existe, vacía, y `checkpoint` tiene la fila `'pagos'` en 0.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Varios read models",
          explicacion:
            "sobre el mismo diario, cada uno con su fila en `checkpoint` por `nombre`. Agregar una vista no toca las otras.",
        },
      ],
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "CREATE TABLE pagos(seq BIGINT PRIMARY KEY, empresa TEXT NOT NULL, monto INT NOT NULL);",
          "INSERT INTO checkpoint VALUES ('pagos', 0) ON CONFLICT DO NOTHING;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Helpers con nombre",
      tarea:
        "Prepara los helpers del proyector para que los usen las dos vistas.",
      pasos: [
        "`LeerCursor` y `GuardarCursor` reciben el `nombre` del checkpoint.",
        "`HechosDesde` trae también `tipo` y `datos`: `(seq, stream, tipo, datos)`.",
        'Ajusta el `CorrerProyector()` de `Suspendidas` a las firmas nuevas: `LeerCursor("empresas_estado")` y la tupla de cuatro.',
      ],
      logro: {
        items: [
          "Compila, y el proyector de `Suspendidas` corre como antes.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El proyector de pagos",
      tarea:
        "Escribe `CorrerProyectorPagos()`: inserta una fila en `pagos` por cada hecho de pago nuevo del diario.",
      pasos: [
        'Trae **todos** los hechos desde `LeerCursor("pagos")`. Solo si `tipo == "pago-registrado"`, deserializa el `PagoRegistrado` e inserta `(seq, stream, Monto)` con `ON CONFLICT (seq) DO NOTHING`.',
        "`ultimo = seq` va **fuera** del `if`: el cursor avanza sobre todo el diario.",
        "Cuenta solo las inserciones reales (`ExecuteNonQuery() == 1`) y devuélvelas.",
      ],
      logro: {
        items: [
          "Con los dos pagos sembrados, aplica `2`. Corrido otra vez, aplica `0`.",
          "El `ultimo_seq` de `'pagos'` es igual al `MAX(seq)` de `eventos`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El reporte",
      tarea: "Responde la pregunta de Conciliación desde la vista `pagos`.",
      pasos: [
        "En `psql`, corre el reporte de abajo.",
        "Reconstruye la vista: `TRUNCATE pagos`, pon el checkpoint `'pagos'` en 0 y corre otra vez `CorrerProyectorPagos()`.",
      ],
      logro: {
        terminal: { salida: ["emp-1 | 800 | 2"], tono: "ok" },
        items: [
          "Si sale `1600 | 4`, sembraste los pagos dos veces.",
          "Tras reconstruir, salen los mismos totales.",
        ],
      },
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "SELECT empresa, SUM(monto) AS total, COUNT(*) AS pagos",
          "FROM pagos GROUP BY empresa ORDER BY empresa;",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Las dos salidas fáciles",
      tarea:
        "Antes de dar por buena la vista, intenta responder con lo que ya tenías.",
      pasos: [
        "En `psql`: `SELECT * FROM empresas_estado`.",
        "Rehidrata `emp-1` y busca el total pagado.",
      ],
      logro: {
        items: [
          "`empresas_estado` no tiene monto.",
          "El agregado solo da `DeudaPendiente`.",
          "Solo `pagos` responde `emp-1 = $800 (2 pagos)`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Hay **un read model por pregunta**, todos del mismo diario: por estado (rehidrata el agregado) o por hecho (una fila por evento). La pregunta decide cuál.",
      puntos: [
        {
          termino: "Por estado",
          definicion:
            "Rehidrata el agregado y copia su foto de hoy. `Suspendidas`.",
        },
        {
          termino: "Por hecho",
          definicion: "Una fila por evento, que no cambia. `pagos`.",
        },
        {
          termino: "Un checkpoint por vista",
          definicion:
            "Cada proyector corre a su ritmo. Agregar una vista no toca las otras.",
        },
      ],
      commit: {
        mensaje: "ES · La vista por consulta",
        preguntas: [
          "Una tercera pregunta del dominio: ¿por estado o por hecho, y por qué?",
        ],
      },
      siguiente: {
        seccion: "28 · El hecho y su anuncio",
        texto:
          "Todo esto vive en la misma base y el mismo proceso. Pronto un hecho tiene que avisarle a algo de afuera, que no lee nuestras tablas.",
      },
    },
  ],
};
