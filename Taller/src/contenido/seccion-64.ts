// Fuente: workshop-event-sourcing/taller.md, entrada "64 · La plantilla".
import type { Seccion } from "./tipos";

export const seccion64: Seccion = {
  numero: 64,
  titulo: "La plantilla",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Reunir lo construido en una **plantilla**, `AggregateRoot` más `MartenUnitOfWork`, para que un agregado nuevo solo declare sus hechos y sus reglas.",
    },
    {
      tipo: "planteamiento",
      dosColumnas: true,
      bloques: [
        {
          k: "clases",
          lado: "izq",
          cajas: [
            {
              nombre: "SuspenderHandler",
              filas: [
                { texto: "rehidrata la empresa", tono: "tenue" },
                { texto: "Append en la empresa", tono: "dolor" },
                { texto: "StartStream en el proceso", tono: "dolor" },
                { texto: "a mano, en la misma sesión", tono: "dolor" },
              ],
            },
          ],
        },
        {
          k: "texto",
          lado: "der",
          tam: "grande",
          texto:
            "Cada handler repite lo mismo: rehidratar, saber si el stream **nace** o **crece**, y guardar.",
        },
        {
          k: "lista",
          lado: "der",
          marca: "punto",
          porItem: true,
          items: [
            "`SuspensionDeEmpresa` devuelve sus hechos.",
            "La `Empresa` perdió sus verbos en el swap.",
          ],
        },
        {
          k: "respuesta",
          lado: "der",
          texto: "El día que llegue `Pago` o `Contrato`, ¿lo copias otra vez?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La base de la plantilla",
      tarea:
        "Reescribe tu `AggregateRoot` como la base de la plantilla: acumula los hechos sin confirmar. Ya no rehidrata: eso lo hace Marten.",
      pasos: [
        "Reescribe tu `AggregateRoot` **en su sitio**, sin declarar otro.",
        "Le quedan `SinConfirmar`, `Emitir`, `MarcarConfirmados` y un `Id` con `[JsonInclude]` y `protected set`.",
        "Quítale `Aplicar` y `Load`.",
      ],
      logro: {
        items: [
          "Tu `AggregateRoot` no tiene `Aplicar` ni `Load`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "la plantilla",
          explicacion:
            "`AggregateRoot` guarda `SinConfirmar` y ofrece `Emitir` y `MarcarConfirmados`. `MartenUnitOfWork` distingue nacer (`Registrar` → `StartStream`) de crecer (`Cargar` → `Append`), y confirma todo en un `SaveChanges`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La empresa recupera sus verbos",
      tarea:
        "Haz que `Empresa` herede la base y decida con sus verbos. ⚠️ `Emitir` solo acumula: sin el `Apply`, el verbo siguiente decide a ciegas.",
      pasos: [
        "`Empresa` hereda `AggregateRoot`. Quítale su `Id`: viene de la base.",
        "Verbos: `Registrar` (static), `Suspender(motivo, suspensionId)`, `CambiarPlan`, `RegistrarPago(monto, referencia)` y `Reactivar`, cada uno con `Apply(h); Emitir(h);`.",
        "Las reglas se quedan: `YaRegistro`, y `ReglaDeNegocioException` en `CambiarPlan` si está suspendida y en `Reactivar` con deuda.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
    },
    {
      tipo: "reto",
      titulo: "La unidad de trabajo",
      tarea:
        "Escribe la unidad de trabajo: sabe qué agregados nacen y cuáles crecen, y los guarda todos en una transacción.",
      pasos: [
        "Una clase `MartenUnitOfWork`, que recibe una `IDocumentSession` en el constructor.",
        "`Registrar(agregado)` para lo que nace, y `Cargar<T>(id)`, que lee con `FetchLatest`, para lo que crece.",
        "`CommitAsync()`: un `StartStream` por cada nuevo, un `Append` por cada cargado con hechos, un `SaveChangesAsync` y `MarcarConfirmados` en todos.",
      ],
      logro: { items: ["`Empresas.Historia` compila con tu `MartenUnitOfWork`."] },
      tips: [
        {
          k: "nota",
          texto:
            "No elige tenant: trabaja con la sesión que le das.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Nacer",
      tarea:
        "Opera la plantilla en tu `Program.cs`, antes de `app.Run()`: emp-1 nace, con su NIT reservado en la misma transacción.",
      pasos: [
        "Abre una sesión con `store.LightweightSession(\"acme\")` y crea en ella una `MartenUnitOfWork`.",
        "Registra emp-1, con NIT `900`, y su `Localizador`, como en el código de abajo, y confirma.",
        "⚠️ La unidad de trabajo no reserva el NIT: el `Insert` del `Localizador` va en la misma sesión, antes del `CommitAsync`.",
      ],
      logro: {
        terminal: {
          comando: "SELECT data FROM mt_doc_localizador WHERE id = '900';",
          salida: ['{"Id": "900", "Stream": "emp-1"}'],
          tono: "ok",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var uow = new MartenUnitOfWork(s);",
          'var e = Empresa.Registrar("emp-1", "900", "Andes", "Básico");',
          "s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });",
          "uow.Registrar(e);",
          "await uow.CommitAsync();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Crecer",
      tarea:
        "Con la plantilla, emp-1 crece: la cargas, la suspendes y confirmas, sin escribir un `Append`.",
      pasos: [
        "Después del bloque que la registra, en otra sesión de acme con su `MartenUnitOfWork`: `uow.Cargar<Empresa>(\"emp-1\")`.",
        "Suspéndela con `Suspender(\"mora\", \"susp-emp-1-2\")` y confirma con `CommitAsync`.",
        "Corre una vez y quita los dos bloques. Deja el `store`.",
      ],
      logro: {
        items: [
          "emp-1 tiene dos hechos: `empresa_registrada` y `empresa_suspendida`.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "¿Qué pasa si corres otra vez el bloque que registra emp-1?",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un hecho, dos reactivaciones",
      tarea:
        "No lo saltes: la sección 68 parte de lo que dejas aquí. En una sola unidad de trabajo, emp-3 se suspende, paga y se reactiva.",
      pasos: [
        "Antes de `app.Run()`, siembra emp-3 (`900300000`) con `Sembrar` y guarda.",
        "En otra sesión, una sola unidad de trabajo: carga emp-3, llama `Suspender(\"mora\", \"susp-emp-3-2\")`, `RegistrarPago(50_000, \"BANCO-0001\")` y `Reactivar()`, y confirma.",
        "Corre una vez. Cuenta las reactivaciones en `mt_events` y en `mt_doc_empresa`.",
      ],
      logro: {
        items: [
          "El diario tiene **1** reactivación.",
          "El documento tiene **2**, y `SinConfirmar` lleno.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Que el snapshot no reúse tu agregado",
      tarea:
        "Apaga el identity map de Marten, para que el snapshot aplique los hechos nuevos a su propia copia, no al agregado que tus verbos ya cambiaron.",
      pasos: [
        "En el `AddMarten` de tu `AgregarEmpresas`, la línea de abajo, con su comentario de síntoma.",
        "Suma su `[Fact]` a `LineasQueCarganPeso`: `Assert.False(marten.Events.UseIdentityMapForAggregates, …)`, con el síntoma como mensaje.",
        "Comenta la línea, corre `dotnet test` y descoméntala.",
      ],
      logro: { items: ["Sin la línea, cae su `[Fact]`, con tu síntoma."] },
      tips: [
        {
          k: "nuevo",
          idioma: "UseIdentityMapForAggregates",
          explicacion:
            "Marten 9 lo trae en `true`: el snapshot sigue desde el objeto que te devolvió, el que tus verbos ya cambiaron.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "// NO quitar: <qué se rompe sin ella, y cómo se nota>",
          "opts.Events.UseIdentityMapForAggregates = false;",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Rehaz los documentos",
      tarea:
        "Repite el acto con otra empresa para verla bien, y rehaz los documentos que quedaron mal desde el diario.",
      pasos: [
        "Quita los bloques de emp-3. Repite el acto con emp-4 (`900400000`, `susp-emp-4-2`), sembrada igual. Corre una vez.",
        "Quita los bloques de emp-4. Antes de `app.Run()`, reconstruye `Empresa` una vez con `RebuildProjectionAsync(\"Empresa\", …)`.",
        "Corre una vez y quita la reconstrucción.",
      ],
      logro: {
        terminal: {
          comando:
            "SELECT id, data -> 'Reactivaciones', data -> 'SinConfirmar' FROM mt_doc_empresa WHERE id IN ('emp-3', 'emp-4');",
          salida: [" emp-3 | 1 | []", " emp-4 | 1 | []"],
          tono: "ok",
        },
        items: ["Las dos, con una reactivación y sin pendientes."],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "Antes de reconstruir, emp-4 sale bien y emp-3 sigue con dos. ¿Por qué?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El segundo agregado",
      tarea:
        "Pasa `SuspensionDeEmpresa` a la plantilla: hereda la base y sus métodos dejan de devolver hechos.",
      pasos: [
        "`SuspensionDeEmpresa` hereda `AggregateRoot`. Su `Id` pasa a la base.",
        "Nace con un verbo `static Solicitar`, como `Empresa.Registrar`.",
        "Sus métodos hacen `Apply(h); Emitir(h);` por cada hecho, y ya no devuelven hechos.",
      ],
      logro: { items: ["`SuspensionDeEmpresa` compila sobre la plantilla."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public void ConfirmarCobroDeMulta(DateOnly cobradaEl)",
          "{",
          "    if (Facturacion != EstadoIntegracion.EnCurso) return;",
          "    var h = new CobroDeMultaConfirmado(cobradaEl); Apply(h); Emitir(h);",
          "    if (Accesos == EstadoIntegracion.Aplicado) { var ef = new SuspensionEfectiva(); Apply(ef); Emitir(ef); }",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La empresa y su proceso, juntos",
      tarea:
        "Con la plantilla, emp-2 nace, y luego se suspende y abre su proceso en una sola unidad de trabajo.",
      pasos: [
        "Antes de `app.Run()`, emp-2 (`900200000`) nace con la plantilla y su `Localizador`, como emp-1.",
        "En otra sesión, una unidad de trabajo: carga emp-2, la suspende con `\"susp-emp-2-2\"` y registra su proceso, como en el código de abajo.",
        "Corre una vez.",
      ],
      logro: {
        items: [
          "emp-2: `Suspendida=True`, `ProcesoAbierto=susp-emp-2-2`.",
          "susp-emp-2-2: `Facturacion=EnCurso`, `Accesos=EnCurso`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var e = await uow.Cargar<Empresa>("emp-2");',
          'e.Suspender("mora", "susp-emp-2-2");',
          'uow.Registrar(SuspensionDeEmpresa.Solicitar("susp-emp-2-2", "emp-2", e.Nit, e.Plan));',
          "await uow.CommitAsync();   // los dos streams, en una transacción",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El proceso decide con la plantilla",
      tarea:
        "Haz que el proceso de emp-2 avance con la misma unidad de trabajo, y que su handler tome los hechos de `SinConfirmar`.",
      pasos: [
        "Quita los dos bloques de emp-2. Carga el proceso con `Cargar<SuspensionDeEmpresa>(\"susp-emp-2-2\")`, llama `ConfirmarCobroDeMulta(new DateOnly(2026, 10, 17))` y confirma.",
        "En `ProcesoDeSuspensionHandler`, `Decidir` recibe un `Action<SuspensionDeEmpresa>` y toma los hechos de `proceso.SinConfirmar`. Su `Append` con versión esperada no cambia.",
        "Corre una vez. Quita todos los bloques de `Program.cs` y deja el `store`.",
      ],
      logro: {
        items: [
          "El proceso de emp-2 queda en `Facturacion=Aplicado`.",
          "`dotnet test` en verde.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El motor que hiciste a mano cabe en dos piezas base: `Cosmos.BuildingBlocks` en miniatura. Un agregado nuevo solo declara sus hechos y sus reglas.",
      puntos: [
        {
          termino: "AggregateRoot",
          definicion:
            "La base que todo agregado hereda: acumula `SinConfirmar` con `Emitir`.",
        },
        {
          termino: "MartenUnitOfWork",
          definicion:
            "Nacer (`StartStream`) o crecer (`Append`), en un solo `SaveChanges`.",
        },
        {
          termino: "UseIdentityMapForAggregates = false",
          definicion:
            "El snapshot no reúsa el agregado que los verbos ya cambiaron.",
        },
      ],
      commit: {
        mensaje: "ES · La plantilla",
        preguntas: [
          "¿Qué plomería dejó de repetir cada agregado? Nombra una pieza de tu motor a mano que ahora vive en la plantilla.",
          "¿Por qué emp-3 contaba dos reactivaciones con el identity map en `true`?",
        ],
      },
      siguiente: {
        seccion: "65 · La plantilla se prueba",
        texto:
          "Tus tests de reglas siguen comentados desde el swap. Toca probarlos en memoria, con un doble que se parezca de verdad a Marten.",
      },
    },
  ],
};
