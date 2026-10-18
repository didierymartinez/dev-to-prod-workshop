// Fuente: workshop-event-sourcing/taller.md, entrada "43 · El tablero cruza streams".
import type { Seccion } from "./tipos";

export const seccion43: Seccion = {
  numero: 43,
  titulo: "El tablero cruza streams",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Un tablero con **una fila por empresa** (nombre, plan de hoy, en qué va su suspensión) que el daemon mantiene solo, aunque los datos vivan en dos streams.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Soporte ya no pregunta por una empresa: quiere verlas **todas** en una pantalla.",
        },
        {
          k: "texto",
          texto:
            "El nombre y el plan están en el stream de **la empresa**. El estado de la suspensión, en el stream **del proceso**.",
        },
        {
          k: "respuesta",
          texto: "¿Cómo juntamos dos streams en una fila?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "El intento natural: un Estado en VistaSuspendida",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'public void Apply(SuspensionSolicitada e, VistaSuspendida v) => v.Estado = "esperando";',
          ],
        },
        {
          k: "tabla",
          columnas: ["id", "Suspendida", "Estado"],
          filas: [
            ["emp-13", "true", ""],
            ["susp-emp-13-2", "false", "esperando"],
          ],
        },
        {
          k: "texto",
          junto: true,
          tam: "tenue",
          texto: "`SELECT id, data->>'Suspendida', data->>'Estado' FROM mt_doc_vistasuspendida WHERE id LIKE '%emp-13%';`",
        },
        {
          k: "respuesta",
          texto:
            "El estado cayó en el documento del proceso.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Los otros reflejos",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "**Juntarlo al consultar**: cruzar dos vistas enteras, cada vez que alguien abre la pantalla.",
            "**Copiar el plan en el proceso**: la copia que envejece, el plan del momento y no el de hoy.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una empresa limpia",
      tarea: "Siembra una empresa nueva para el tablero: emp-13.",
      pasos: [
        "En `Program.cs`, quita los pasos de la sección anterior. Deja host, `store` y `bus`.",
        "Después de `await host.StartAsync()`, la siembra de abajo.",
      ],
      logro: { items: ["emp-13 existe. Los dos socios contestan, y Facturación cobra sin cambios."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "await using (var s = store.LightweightSession())",
          "{",
          '    Sembrar(s, "emp-13", "901300000", "Librería Centro", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La regla de identidad",
      tarea:
        "Crea el tablero y su proyección multi-stream, con la regla que dice a qué fila va cada hecho.",
      pasos: [
        'En `Empresas.Historia`, el read model `Tablero`, con setters públicos: `Id`, `Nombre`, `Plan`, `Suspension`, `Facturacion` y `Accesos` (empiezan en `"-"`), y `Estado` (empieza en `"activa"`).',
        "`public partial class TableroProjection : MultiStreamProjection<Tablero, string>`.",
        "En su constructor, la regla: si el `StreamKey` empieza con `susp-`, la empresa es lo que va entre `susp-` y el último guion; si no, el `StreamKey`.",
      ],
      logro: { items: ["Compila (`using Marten.Events.Projections;` y `using JasperFx.Events;`)."] },
      tips: [
        {
          k: "nuevo",
          idioma: "MultiStreamProjection<TDoc, TId>",
          explicacion:
            "arma un documento con hechos de cualquier stream; su regla de identidad dice a qué documento va cada uno.",
        },
        {
          k: "nuevo",
          idioma: "texto[desde..hasta]",
          explicacion: "toma desde `desde` hasta antes de `hasta`. `LastIndexOf('-')` da el último guion.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un Apply por hecho",
      tarea:
        "Escribe los `Apply` que mueven el tablero, con una guarda para que solo cuente la suspensión vigente.",
      pasos: [
        "De la empresa: `EmpresaRegistrada`, `PlanCambiado`, `EmpresaReactivada`. Del proceso: `SuspensionSolicitada`, las cinco respuestas (`CobroDeMultaConfirmado`, `CobroDeMultaRechazado`, `RevocacionDeAccesosConfirmada`, `RestitucionDeAccesosSolicitada`, `RestitucionDeAccesosConfirmada`) y los tres del cierre (`SuspensionEfectiva`, `ProcesoRevertido`, `SuspensionVencida`).",
        "Los del proceso reciben `IEvent<T>`. El de `SuspensionSolicitada` guarda su `StreamKey` en `Suspension`.",
        "Los demás no hacen nada si su `StreamKey` no es `t.Suspension`: esa es la **guarda**.",
      ],
      logro: { items: ["Compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public void Apply(IEvent<CobroDeMultaConfirmado> e, Tablero t)",
          '    { if (e.StreamKey == t.Suspension) t.Facturacion = "Aplicado"; }',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El tablero, al día",
      tarea:
        "Registra el tablero en el daemon, suspende emp-13 y consulta el tablero.",
      pasos: [
        "En tu `AddMarten`: `opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);`, con su porqué al lado.",
        "En `Program.cs`, el bloque de abajo.",
        "En `psql`: `SELECT name FROM mt_event_progression;`",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "ok",
          salida: [
            "emp-13: Librería Centro plan=Basico suspension=susp-emp-13-2 fact=Aplicado acc=Aplicado estado=efectiva",
          ],
        },
        items: ["Aparece el shard `Tablero:All`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new SuspenderEmpresa("emp-13", "mora"));',
          "await Task.Delay(3000);",
          "await using (var s = store.LightweightSession())",
          "    foreach (var t in await s.Query<Tablero>().ToListAsync())",
          '        Console.WriteLine($"{t.Id}: {t.Nombre} plan={t.Plan} suspension={t.Suspension} " +',
          '            $"fact={t.Facturacion} acc={t.Accesos} estado={t.Estado}");',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El plan de hoy",
      tarea:
        "Cambia emp-13 a Premium, suspéndela otra vez, y compara el plan del tablero con el que guardó cada proceso.",
      pasos: [
        "Quita la siembra y la suspensión. Antes de la consulta, un `Append` a emp-13 de `PagoRegistrado(50_000)`, `EmpresaReactivada()` y `PlanCambiado(\"Premium\")`, y suspéndela otra vez.",
        "Consulta el tablero.",
        "En `psql`, la consulta de abajo.",
      ],
      logro: {
        items: [
          "Tablero: `plan=Premium suspension=susp-emp-13-6`.",
          "En `psql`: `susp-emp-13-2 | Basico` y `susp-emp-13-6 | Premium`.",
        ],
      },
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "SELECT stream_id, data->>'Plan' FROM mt_events",
          "WHERE type = 'suspension_solicitada' AND stream_id LIKE 'susp-emp-13-%' ORDER BY seq_id;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Dos preguntas, dos vistas",
      tarea:
        "Busca las empresas suspendidas que el tablero no ve, y decide si `VistaSuspendida` se queda.",
      pasos: [
        "En `psql`, la consulta de abajo.",
        "En tu `DECISIONES.md`: `VistaSuspendida` se queda, porque responde «¿está suspendida?» también para las empresas de antes del proceso.",
      ],
      logro: {
        items: [
          "Cada fila es una empresa suspendida de antes del proceso, que el tablero ve `activa`.",
        ],
      },
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "SELECT v.id FROM mt_doc_vistasuspendida v JOIN mt_doc_tablero t ON t.id = v.id",
          "WHERE v.data->>'Suspendida' = 'true' AND t.data->>'Estado' = 'activa';",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La regla es el diseño",
      tarea:
        "Haz que cada hecho vaya al documento de su propio stream, sin mapear los procesos a su empresa.",
      pasos: [
        "En el constructor: `Identity<IEvent>(e => e.StreamKey!);`",
        'En `Program.cs`, deja solo la espera y la consulta, y antes de ellas: `await Vistas.Rearmar(host, "Tablero");`. Déjala mientras dure el Rómpelo.',
        "Arranca. Luego vuelve a poner tu regla.",
      ],
      logro: {
        items: [
          "Salen filas huérfanas: `susp-emp-13-2` y `susp-emp-13-6`, sin nombre.",
          "Y emp-13 dice `estado=activa`.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Dos suspensiones y una respuesta tardía",
      piezas: [
        {
          etiqueta: "En `Program.cs`, entre el rearmado y la espera:",
          lenguaje: "csharp",
          lineas: [
            "for (var i = 0; i < 2; i++)   // susp-emp-13-9 y susp-emp-13-12",
            "{",
            "    await using (var s = store.LightweightSession())",
            "    {",
            '        s.Events.Append("emp-13", new PagoRegistrado(50_000), new EmpresaReactivada());',
            "        await s.SaveChangesAsync();",
            "    }",
            '    await bus.InvokeAsync(new SuspenderEmpresa("emp-13", "mora"));',
            "}",
            'await bus.InvokeAsync(new AccesosRevocadosV2("susp-emp-13-9", "901300000"));   // llega tarde',
            "await Task.Delay(7000);   // que venza el plazo de la -12",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La guarda",
      tarea:
        "Con Accesos en silencio, deja llegar una respuesta tardía de una suspensión anterior, con y sin la guarda.",
      pasos: [
        "Accesos en silencio: su handler de `RevocarAccesosV1` devuelve `null`. Agrega el bloque de la lámina anterior y arranca.",
        "Quita ese bloque. Quita la guarda de los `Apply` del proceso, y arranca otra vez.",
        "Al terminar: devuelve la guarda y la respuesta de Accesos, y quita el `Rearmar`.",
      ],
      logro: {
        items: [
          "Con la guarda: `suspension=susp-emp-13-12 fact=Aplicado acc=EnCurso estado=vencida`.",
          "Sin ella: `acc=Aplicado`, y Accesos **nunca** confirmó la `-12`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La regla de identidad **es el diseño** de la vista, y tiene que ser barata: la llave viaja en el id. La guarda decide si el hecho es de la suspensión vigente.",
      puntos: [
        {
          termino: "Proyección multi-stream",
          definicion: "Un documento armado con hechos de varios streams.",
        },
        {
          termino: "La guarda",
          definicion: "La correlación, en el lado de lectura: `e.StreamKey == t.Suspension`.",
        },
        {
          termino: "El plan de hoy",
          definicion: "Sale de su dueño, el stream de la empresa. El del proceso es el del momento.",
        },
      ],
      decision:
        "`VistaSuspendida` se queda: responde «¿está suspendida?» también para las empresas de antes del proceso.",
      commit: {
        mensaje: "ES · El tablero cruza streams",
        preguntas: [
          "¿Qué pantalla de tu sistema junta dos agregados, y cuál sería su regla de identidad?",
        ],
      },
      siguiente: {
        seccion: "44 · El host y la inyección",
        texto:
          "Los comandos todavía entran por una línea de `Program.cs`. Un servicio de verdad los recibe por HTTP.",
      },
    },
  ],
};
