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
      tipo: "solucion",
      de: "reto",
      titulo: "La base de la plantilla",
      piezas: [
        {
          etiqueta: "Tu `AggregateRoot`, reescrito en su sitio",
          lenguaje: "csharp",
          lineas: [
            "// AggregateRoot base: la plomería que todo agregado hereda (una vez). using System.Text.Json.Serialization;",
            "public abstract class AggregateRoot",
            "{",
            "    private readonly List<object> _sinConfirmar = new();",
            "    [JsonInclude] public string Id { get; protected set; }   // el snapshot lo relee: sin esto, la empresa vuelve sin Id",
            "    public IReadOnlyList<object> SinConfirmar => _sinConfirmar;",
            "    protected void Emitir(object hecho) => _sinConfirmar.Add(hecho);   // el verbo ya aplicó; esto solo acumula",
            "    public void MarcarConfirmados() => _sinConfirmar.Clear();",
            "}",
          ],
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
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa recupera sus verbos (1 de 2)",
      piezas: [
        {
          etiqueta: "`Empresa` hereda la base: `Registrar` y `Suspender`",
          lenguaje: "csharp",
          lineas: [
            "// Empresa sobre la plantilla: sus Apply + sus verbos. Cero plomería de persistencia.",
            "public class Empresa : AggregateRoot      // el Id, con su [JsonInclude], ya viene de la base: quítalo de aquí",
            "{",
            "    // … tus propiedades con su [JsonInclude], el HashSet sin readonly y tus Apply, como los tienes: Marten usa esos Apply al rehidratar …",
            "",
            "    public static Empresa Registrar(string id, string nit, string nombre, string plan)",
            "    {",
            "        var e = new Empresa { Id = id };",
            "        var h = new EmpresaRegistrada(nit, nombre, plan);",
            "        e.Apply(h); e.Emitir(h);          // aplica a sí mismo + acumula",
            "        return e;",
            "    }",
            "    public void Suspender(string motivo, string suspensionId)",
            "    {",
            "        if (ProcesoAbierto is not null) return;   // la regla de El proceso tiene dueño: un proceso a la vez",
            "        var h = new EmpresaSuspendida(motivo, suspensionId);   // el stream del proceso lo abre el SuspenderHandler",
            "        Apply(h); Emitir(h);",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa recupera sus verbos (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue dentro de `Empresa`: `CambiarPlan`, `RegistrarPago` y `Reactivar`",
          lenguaje: "csharp",
          lineas: [
            "    public void CambiarPlan(string plan)",
            "    {",
            "        if (Suspendida) throw new ReglaDeNegocioException(\"No se puede cambiar el plan de una empresa suspendida.\");   // la regla de Decidir el futuro",
            "        var h = new PlanCambiado(plan);",
            "        Apply(h); Emitir(h);",
            "    }",
            "    public void RegistrarPago(int monto, string referencia)",
            "    {",
            "        if (YaRegistro(referencia)) return;   // el mismo pago, en otro aviso: no registra nada",
            "        var h = new PagoRegistrado(monto, referencia);",
            "        Apply(h); Emitir(h);",
            "    }",
            "    public void Reactivar()",
            "    {",
            "        if (DeudaPendiente) throw new ReglaDeNegocioException(\"No puedes reactivar con deuda pendiente.\");",
            "        var h = new EmpresaReactivada();",
            "        Apply(h); Emitir(h);",
            "    }",
            "}",
          ],
        },
      ],
      nota: "Cada verbo hace `Apply(h); Emitir(h);`: aplica a sí mismo y acumula. Cero plomería de persistencia.",
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
      tipo: "solucion",
      de: "reto",
      titulo: "La unidad de trabajo",
      piezas: [
        {
          etiqueta: "`MartenUnitOfWork`: nacer, crecer y confirmar",
          lenguaje: "csharp",
          lineas: [
            "// unidad de trabajo sobre Marten: nacer (StartStream) vs crecer (Append), todo en una transacción",
            "public class MartenUnitOfWork",
            "{",
            "    private readonly IDocumentSession _s;",
            "    private readonly List<AggregateRoot> _nuevos = new();",
            "    private readonly List<AggregateRoot> _modificados = new();",
            "    public MartenUnitOfWork(IDocumentSession s) => _s = s;",
            "",
            "    public void Registrar(AggregateRoot a) => _nuevos.Add(a);          // un stream que nace",
            "    public async Task<T> Cargar<T>(string id) where T : AggregateRoot  // uno existente, que va a crecer",
            "    {",
            "        var a = await _s.Events.FetchLatest<T>(id);                    // del snapshot, como tus handlers",
            "        if (a != null) _modificados.Add(a);",
            "        return a;",
            "    }",
            "    public async Task CommitAsync()",
            "    {",
            "        foreach (var a in _nuevos)      _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());",
            "        foreach (var a in _modificados) if (a.SinConfirmar.Count > 0) _s.Events.Append(a.Id, a.SinConfirmar.ToArray());",
            "        await _s.SaveChangesAsync();                                   // una transacción para todos",
            "        foreach (var a in _nuevos.Concat(_modificados)) a.MarcarConfirmados();",
            "    }",
            "}",
          ],
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
      tipo: "solucion",
      de: "reto",
      titulo: "Nacer",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/Program.cs`, antes de `app.Run()`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run()",
            "var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya",
            "",
            "// nacer: el stream y su NIT, en la misma sesión",
            "await using (var s = store.LightweightSession(\"acme\"))",
            "{",
            "    var uow = new MartenUnitOfWork(s);",
            "    var e = Empresa.Registrar(\"emp-1\", \"900\", \"Andes\", \"Básico\");",
            "    s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });   // reserva el NIT; entra en el SaveChanges del CommitAsync",
            "    uow.Registrar(e);",
            "    await uow.CommitAsync();",
            "}",
          ],
        },
      ],
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
      tipo: "solucion",
      de: "reto",
      titulo: "Crecer",
      piezas: [
        {
          etiqueta: "Debajo del bloque que la registra",
          lenguaje: "csharp",
          lineas: [
            "// crecer",
            "await using (var s = store.LightweightSession(\"acme\"))",
            "{",
            "    var uow = new MartenUnitOfWork(s);",
            "    var e = await uow.Cargar<Empresa>(\"emp-1\");",
            "    e.Suspender(\"mora\", \"susp-emp-1-2\");   // el id con la forma que arma tu SuspenderHandler",
            "    await uow.CommitAsync();   // emp-1 queda con 2 hechos; Suspendida = true al rehidratar",
            "}",
          ],
        },
      ],
      nota: "Después de la primera corrida, quita el nacer y el crecer, y deja el `store`: volver a registrar `emp-1` lanza `ExistingStreamIdCollisionException`.",
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
      tipo: "solucion",
      de: "rompelo",
      titulo: "Que el snapshot no reúse tu agregado",
      piezas: [
        {
          etiqueta: "`Empresas.Historia/Configuracion.cs`, en el `AddMarten` de tu `AgregarEmpresas`",
          lenguaje: "csharp",
          lineas: [
            "// Empresas.Historia/Configuracion.cs, en el AddMarten de tu AgregarEmpresas",
            "// NO quitar: en true, el snapshot vuelve a aplicar cada hecho que un verbo ya aplicó,",
            "// y el documento cuenta de más (dos reactivaciones por una), sin un error.",
            "opts.Events.UseIdentityMapForAggregates = false;",
          ],
        },
        {
          etiqueta: "En `LineasQueCarganPeso`, un `[Fact]` más",
          lenguaje: "csharp",
          lineas: [
            "// en LineasQueCarganPeso",
            "[Fact]",
            "public void El_snapshot_no_reusa_el_agregado_de_los_verbos() =>",
            "    Assert.False(marten.Events.UseIdentityMapForAggregates,",
            "        \"Con UseIdentityMapForAggregates, el snapshot aplica dos veces cada hecho de un verbo, y el documento cuenta de más.\");",
          ],
        },
      ],
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
