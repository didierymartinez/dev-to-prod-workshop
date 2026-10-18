// Fuente: workshop-event-sourcing/taller.md, entrada "20 · El proyector tropieza".
import type { Seccion } from "./tipos";

export const seccion20: Seccion = {
  numero: 20,
  titulo: "El proyector tropieza",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que un hecho que el proyector no puede aplicar **no congele toda la vista**: se aparta, queda visible, y sigue. Y ver que, si el que lanza es `Aplicar`, apartar no basta.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Nuestro store no deja escribir un tipo que no conoce.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Pero una migración o un segundo servicio **sí** pueden meterlo.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Qué hace el proyector?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Mete una bomba en el diario",
      tarea:
        "Inyecta en el diario un hecho de un tipo que tu código no conoce, entre dos empresas buenas, y corre tu proyector de siempre.",
      pasos: [
        "Registra `emp-1` y corre `CorrerProyector()`.",
        "En `psql`, el `INSERT` de abajo: un hecho que se salta el store, como haría una migración.",
        "Registra `emp-2` y corre `CorrerProyector()` otra vez.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["💥 KeyNotFoundException: 'tipo-desconocido'"],
        },
        items: [
          "El checkpoint se queda antes de la bomba. El rezago da `2`, y crece.",
          "La vista solo tiene `emp-1`: un hecho congela **toda** la vista.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-bomba', 1, 'tipo-desconocido', '{}');",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Apartar el hecho y seguir",
      tarea:
        "Que el proyector aparte el hecho que no puede aplicar, deje rastro en una tabla y siga con el siguiente.",
      pasos: [
        "En `psql`, crea la tabla de apartados con el `CREATE TABLE` de abajo.",
        "En `CorrerProyector()`, envuelve el `Get()` y el `vista.Actualizar(...)` en `try/catch`. En el `catch`: `Apartar(seq, stream, ex.Message)`, un `INSERT` en `proyeccion_fallos` con `ON CONFLICT (seq) DO NOTHING`.",
        "`ultimo = seq` corre **siempre**, en éxito y en fallo. Corre el proyector.",
      ],
      logro: {
        items: [
          "`emp-2` se proyecta y el rezago vuelve a `0`.",
          "`SELECT * FROM proyeccion_fallos` muestra una fila de `emp-bomba`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Tabla de apartados",
          explicacion:
            "el «dead-letter» del proyector: una lista consultable de lo que no pudo aplicar.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "CREATE TABLE proyeccion_fallos(seq BIGINT PRIMARY KEY, stream TEXT,",
          "  error TEXT, cuando TIMESTAMPTZ DEFAULT now());",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La segunda bomba",
      tarea:
        "**No lo saltes**: la cura de después parte de aquí. Ahora el hecho es uno que tu código sí conoce, pero tu `Aplicar` lanza.",
      pasos: [
        "En tu `Empresa`, cambia el `case EmpresaReactivada` por el de abajo: lanza si no estaba suspendida.",
        'Registra `emp-6` activa (`Registrar("Zeta", "Básico")` y `Append`) y corre el proyector.',
      ],
      logro: { items: ["`emp-6` entra a la vista, activa."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "case EmpresaReactivada:",
          '    if (!Suspendida) throw new InvalidOperationException("Reactivada sin estar suspendida.");',
          "    Suspendida = false; Reactivaciones++;",
          "    break;",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Reactivada sin estar suspendida",
      tarea:
        "Inyecta una reactivación sobre `emp-6`, que está activa, y mira qué pasa al proyectar y al cargarla.",
      pasos: [
        "En `psql`, el `INSERT` de abajo, y corre el proyector.",
        'Carga la empresa: `store.AbrirStream<Empresa>("emp-6").Get()`.',
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: [
            "💥 InvalidOperationException: Reactivada sin estar suspendida.",
          ],
        },
        items: [
          "El proyector la aparta: hay una fila de `emp-6` en `proyeccion_fallos`.",
          "Pero `Get()` lanza: todo comando sobre `emp-6` falla.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "El hecho sigue en el diario, que no se edita. ¿Qué cura queda?",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-6', 2, 'empresa-reactivada', '{}');",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un Aplicar total",
      tarea:
        "Que tu `Aplicar` nunca lance con un hecho que conoce: si no encuentra lo que busca, no hace nada.",
      pasos: [
        "En el `case EmpresaReactivada`, cambia el `throw` por `if (!Suspendida) break;`",
        "Comprueba con el código de abajo, sin tocar el diario.",
      ],
      logro: {
        items: [
          "`Get()` carga `emp-6`, la suspensión entra, y el proyector la muestra suspendida.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Ya estaba en tu `DECISIONES.md` desde «El agregado recuerda»: `Aplicar` no valida ni lanza.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var s6 = store.AbrirStream<Empresa>("emp-6");',
          "var e6 = s6.Get();                // ya no lanza",
          'e6.Suspender("falta de pago");',
          "s6.Append(e6);",
          "CorrerProyector();                // la vista muestra emp-6 suspendida",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un hecho raro degrada **una empresa**, no toda la vista. Si el hecho es válido y lanza tu `Aplicar`, la cura es un `Aplicar` total.",
      puntos: [
        {
          termino: "Apartar",
          definicion:
            "El proyector deja el hecho en `proyeccion_fallos` y avanza el checkpoint.",
        },
        {
          termino: "Aplicar total",
          definicion:
            "También en tu `DECISIONES.md`: «Mi `Aplicar` es total: con un hecho que conoce, nunca lanza. Si no encuentra lo que busca, no hace nada. Apartar en `proyeccion_fallos` es para lo que el código no conoce.»",
        },
      ],
      decision:
        "El proyector aparta el hecho que no puede aplicar y sigue; queda visible en `proyeccion_fallos`. Distinguir transitorio de permanente es criterio; el reproceso en sí lo dejo para cuando lo necesite.",
      commit: {
        mensaje: "ES · El proyector tropieza",
        preguntas: [
          "¿Por qué el proyector avanza el checkpoint aunque aparte un hecho? ¿Qué pasaría con el rezago si no?",
        ],
      },
      siguiente: {
        seccion: "21 · ¿Merecía event sourcing?",
        texto: "Con este martillo dan ganas de event-sourcear todo. ¿Todo lo merece?",
      },
    },
  ],
};
