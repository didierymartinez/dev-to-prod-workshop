// Fuente: workshop-event-sourcing/taller.md, entrada "11 · El agregado recuerda lo que decide".
import type { Seccion } from "./tipos";

export const seccion11: Seccion = {
  numero: 11,
  titulo: "El agregado recuerda lo que decide",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el agregado **se aplique** cada hecho al decidir y los **acumule**, y que un solo `Append` guarde todo. Así pagar-y-reactivar funciona.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "tenue",
          texto:
            "`Reactivar` lanzó «No puedes reactivar con deuda pendiente.», aunque el pago ya estaba.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "¿Y si la empresa se aplicara el hecho en el momento de decidirlo?",
        },
        { k: "respuesta", texto: "El siguiente `decide` vería el cambio." },
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var e = stream.Get();",
            "e.RegistrarPago(500);",
            "e.Reactivar();",
            "stream.Append(e);",
          ],
        },
        {
          k: "texto",
          junto: true,
          texto:
            "Es lo que quieres poder escribir. Hoy no compila: `Append` recibe un hecho, no la empresa.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La base recuerda",
      tarea:
        "Es un cambio de modelo. Primero la base, que compila sola: el agregado se aplica cada hecho al decidir y lo guarda en una lista sin confirmar.",
      pasos: [
        "En `AggregateRoot`: una lista privada `_sinConfirmar`, expuesta como `IReadOnlyList<object> SinConfirmar`.",
        "`protected void Emitir(object hecho)`: llama a `Aplicar` y agrega el hecho a la lista.",
        "`MarcarConfirmados()` vacía la lista. `Load` no cambia.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "IReadOnlyList<T>",
          explicacion: "una lista que se lee desde afuera pero no se modifica.",
        },
        { k: "piensa", texto: "¿Por qué `Load` aplica pero no acumula?" },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La base recuerda",
      piezas: [
        {
          etiqueta: "Tu `AggregateRoot`, con la lista sin confirmar",
          lenguaje: "csharp",
          lineas: [
            "public abstract class AggregateRoot",
            "{",
            "    private readonly List<object> _sinConfirmar = new();",
            "    public IReadOnlyList<object> SinConfirmar => _sinConfirmar;",
            "    public void MarcarConfirmados() => _sinConfirmar.Clear();",
            "",
            "    public void Load(IEnumerable<object> historia)",
            "    {",
            "        foreach (var hecho in historia) Aplicar(hecho);   // replay: solo aplica",
            "    }",
            "",
            "    protected void Emitir(object hecho)   // decidir: aplica Y recuerda",
            "    {",
            "        Aplicar(hecho);",
            "        _sinConfirmar.Add(hecho);",
            "    }",
            "",
            "    protected abstract void Aplicar(object hecho);",
            "}",
          ],
        },
      ],
      nota: "El replay **reconstruye**; solo las decisiones nuevas se **acumulan**. `Aplicar` a secas para leer, `Emitir` para decidir.",
    },
    {
      tipo: "reto",
      titulo: "La empresa emite",
      tarea:
        "Los verbos de la empresa dejan de devolver el hecho y lo emiten. Este reto y el siguiente van juntos: compila al terminar los dos.",
      pasos: [
        "En `Empresa`, cada `decide` pasa a `void` y llama a `Emitir(new …)`, sin perder sus validaciones.",
        "`Suspender` empieza con `if (Suspendida) return;`.",
        "Un verbo nuevo, `Registrar`, que emite `EmpresaRegistrada`, como en el ejemplo.",
      ],
      logro: {
        items: ["`CambiarPlan` y `Reactivar` siguen lanzando sus excepciones."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public void Registrar(string nombre, string plan) => Emitir(new EmpresaRegistrada(nombre, plan));",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa emite (1 de 2)",
      piezas: [
        {
          etiqueta: "Tu `Empresa`: las propiedades y el `Aplicar`",
          lenguaje: "csharp",
          lineas: [
            "public class Empresa : AggregateRoot",
            "{",
            '    public string Nombre { get; private set; } = "";',
            '    public string Plan   { get; private set; } = "";',
            "    public bool   Suspendida { get; private set; }",
            "    public bool   DeudaPendiente { get; private set; }",
            "    public int    Reactivaciones { get; private set; }",
            "",
            "    protected override void Aplicar(object hecho)",
            "    {",
            "        switch (hecho)",
            "        {",
            "            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;",
            "            case PlanCambiado p:      Plan = p.NuevoPlan; break;",
            "            case EmpresaSuspendida:   Suspendida = true; DeudaPendiente = true; break;",
            "            case PagoRegistrado:      DeudaPendiente = false; break;",
            "            case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;",
            "        }",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "La empresa emite (2 de 2)",
      piezas: [
        {
          etiqueta: "Y, en la misma clase, los verbos: cada uno **emite**",
          lenguaje: "csharp",
          lineas: [
            "    // Crear también es un verbo ahora: antes insertabas EmpresaRegistrada a mano;",
            "    // con Append(agg), la creación emite como los demás.",
            "    public void Registrar(string nombre, string plan) => Emitir(new EmpresaRegistrada(nombre, plan));",
            "",
            "    public void CambiarPlan(string nuevoPlan)",
            "    {",
            "        if (Suspendida)   // la validación de antes, intacta",
            '            throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");',
            "        Emitir(new PlanCambiado(nuevoPlan));",
            "    }",
            "",
            "    public void Suspender(string motivo)",
            "    {",
            "        if (Suspendida) return;                 // idempotencia: no emite, no acumula",
            "        Emitir(new EmpresaSuspendida(motivo));",
            "    }",
            "",
            "    public void RegistrarPago(int monto) => Emitir(new PagoRegistrado(monto));",
            "",
            "    public void Reactivar()",
            "    {",
            "        if (DeudaPendiente)",
            '            throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");',
            "        Emitir(new EmpresaReactivada());",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Guarda el agregado",
      tarea:
        "`Append` recibe la empresa y guarda todos sus hechos sin confirmar. Los handlers cargan, actúan y guardan la empresa.",
      pasos: [
        "`EventStream<T>.Append(T agg)`: recorre `agg.SinConfirmar`, guarda cada hecho con su versión y al final llama a `agg.MarcarConfirmados()`.",
        "Los tres handlers (`CambiarPlanHandler`, `SuspenderHandler`, `PagarDeudaHandler`): `var e = stream.Get(); e.X(...); stream.Append(e);`",
        "El de suspender pierde su `if (hecho is not null)`. El `Despachador` no cambia.",
      ],
      logro: { items: ["Solo falla el código suelto de arriba."] },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Guarda el agregado (1 de 3)",
      piezas: [
        {
          etiqueta: "En tu `EventStream<T>`, el `Append` nuevo",
          lenguaje: "csharp",
          lineas: [
            "public class EventStream<T> where T : AggregateRoot, new()",
            "{",
            "    // _store, _aggregateId, _version, Get(): sin cambios.",
            "",
            "    public void Append(T agg)",
            "    {",
            "        foreach (var hecho in agg.SinConfirmar)",
            "        {",
            "            _version++;",
            "            _store.AppendEvent(_aggregateId, new EventoAlmacenado(_version, hecho));",
            "        }",
            "        agg.MarcarConfirmados();",
            "    }",
            "}",
          ],
        },
      ],
      nota: "`Append` termina con `MarcarConfirmados()`: si no vaciara la lista, el siguiente `Append` reescribiría los hechos ya guardados.",
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Guarda el agregado (2 de 3)",
      piezas: [
        {
          etiqueta: "Los handlers: cargar → actuar → guardar el agregado",
          lenguaje: "csharp",
          lineas: [
            "// Los handlers: cargar → actuar → guardar el agregado. Siguen implementando",
            "// ICommandHandler<T> (el Despachador no cambia); solo cambia el cuerpo.",
            "public class CambiarPlanHandler(EventStore store) : ICommandHandler<CambiarPlanDeEmpresa>",
            "{",
            "    public void Handle(CambiarPlanDeEmpresa cmd)",
            "    {",
            "        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);",
            "        var e = stream.Get();",
            "        e.CambiarPlan(cmd.NuevoPlan);",
            "        stream.Append(e);",
            "    }",
            "}",
            "",
            "public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>",
            "{",
            "    public void Handle(SuspenderEmpresa cmd)",
            "    {",
            "        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);",
            "        var e = stream.Get();",
            "        e.Suspender(cmd.Motivo);       // ya no compara contra null: el no-op vive dentro",
            "        stream.Append(e);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Guarda el agregado (3 de 3)",
      piezas: [
        {
          etiqueta: "Y el de pagar: los dos hechos, en un solo `Append`",
          lenguaje: "csharp",
          lineas: [
            "public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>",
            "{",
            "    public void Handle(PagarDeuda cmd)",
            "    {",
            "        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);",
            "        var e = stream.Get();",
            "        e.RegistrarPago(cmd.Monto);",
            "        e.Reactivar();",
            "        stream.Append(e);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Siembra con el modelo nuevo",
      tarea:
        "Arriba, siembra la empresa morosa con sus verbos y un solo `Append`, y corre pagar-y-reactivar.",
      pasos: [
        "**Arriba**, cambia el código suelto por el ejemplo.",
        "`s.Get()` sobre un cajón vacío te da una empresa vacía: ahí `Registrar` y `Suspender` emiten.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Tras recargar → Suspendida=False, DeudaPendiente=False"],
          tono: "ok",
        },
        items: ["Suspender dos veces deja un solo `EmpresaSuspendida`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = new EventStore();",
          'var s = store.AbrirStream<Empresa>("emp-7");',
          "var e = s.Get();",
          'e.Registrar("Constructora Andes", "Básico");',
          'e.Suspender("falta de pago");',
          "s.Append(e);",
          'new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));',
          'var empresa = store.AbrirStream<Empresa>("emp-7").Get();',
          'Console.WriteLine($"Tras recargar → Suspendida={empresa.Suspendida}, DeudaPendiente={empresa.DeudaPendiente}");',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Un Load que emite",
      tarea:
        "Pon `Emitir` en vez de `Aplicar` dentro de `Load`, corre pagar-y-reactivar y cuenta los hechos del cajón.",
      pasos: [
        "En el `Load` de `AggregateRoot`, cambia `Aplicar(hecho)` por `Emitir(hecho)`.",
        'Al final del código de arriba: `Console.WriteLine(store.GetEvents("emp-7").Count);` y corre.',
        "Restaura `Aplicar` en `Load`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["Tras recargar → Suspendida=False, DeudaPendiente=False", "6"],
        },
        items: [
          "No lanza nada, y la empresa sale igual. Pero hay **6** hechos, no 4: el `Append` volvió a escribir el registro y la suspensión recién cargados.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Es peor que una excepción: el diario se duplica sin aviso.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "El hecho huérfano",
      tarea:
        "Quita la rama de un hecho en `Aplicar` y mira qué dice la empresa al recargar.",
      pasos: [
        "En el `switch` de `Aplicar`, comenta la línea `case EmpresaReactivada:`.",
        "Corre pagar-y-reactivar.",
        "Restaura la línea.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: ["Tras recargar → Suspendida=True, DeudaPendiente=False"],
        },
        items: [
          "Nada explota, y `EmpresaReactivada` **está** en el diario.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Un hecho sin su rama es un **huérfano**: no revienta, miente.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Reconstruir (rehidratar: solo aplica) y decidir (aplica y recuerda) son dos caminos distintos.",
      puntos: [
        {
          termino: "Emitir",
          definicion:
            "Aplica el hecho y lo recuerda en `SinConfirmar`, hasta que `Append` lo guarda.",
        },
        {
          termino: "Load no acumula",
          definicion:
            "La rehidratación reconstruye; solo las decisiones nuevas se acumulan.",
        },
        {
          termino: "Huérfano",
          definicion: "Un hecho sin su rama en `Aplicar`: no revienta, miente.",
        },
      ],
      decision:
        "`Aplicar` solo asigna estado: no valida ni lanza, no mira el reloj ni genera ids, porque la rehidratación lo re-ejecuta N veces. Las reglas y los datos nuevos viven en los verbos, que corren UNA vez.",
      commit: {
        mensaje: "ES · El agregado recuerda lo que decide",
        preguntas: [
          "¿Qué gana el agregado al aplicarse el hecho, y por qué rehidratar no acumula?",
        ],
      },
      siguiente: {
        seccion: "12 · Verde, y roto",
        texto:
          "¿Cómo sabemos, sin mirar, que el motor funciona?",
      },
    },
  ],
};
