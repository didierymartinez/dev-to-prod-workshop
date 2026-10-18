// Fuente: workshop-event-sourcing/taller.md, entrada "35 · La réplica suscrita".
import type { Seccion } from "./tipos";

export const seccion35: Seccion = {
  numero: 35,
  titulo: "La réplica suscrita",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que Facturación cobre con **su propia copia** de los planes, que esa copia se entere de cada cambio, y que nunca cobre con un plan que no tiene.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto: "Si Empresas se cae, hoy el mes **no se cobra**.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Con una copia propia, Facturación cobra igual.",
        },
        {
          k: "respuesta",
          texto: "Pero esa copia puede fallar de cuatro formas, y ninguna lanza un error.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Cuatro formas de fallar, sin error",
      bloques: [
        {
          k: "lista",
          marca: "numero",
          porItem: true,
          items: [
            "La tabla nace hoy, y emp-8 cambió de plan **antes**.",
            "Una empresa que no se anunció no tiene fila: `null`.",
            "Se anuncia el registro, pero **no los cambios**.",
            "Un anuncio viejo **pisa** al nuevo.",
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          texto: "Las vas a provocar en el Rómpelo.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La versión en el anuncio",
      tarea:
        "Dale a tu `Empresa` la versión de su stream, y haz que registrar una empresa anuncie su plan con esa versión.",
      pasos: [
        "En tu `Program.cs`, quita las corridas del proceso mensual: deja host, `store`, `bus` y `Sembrar`. A tu `Empresa`, `public long Version { get; private set; }`.",
        'En `Contratos`: `PlanDeEmpresaV1(Nit, Plan, long Version)`, con `[MessageIdentity("empresas.plan-de-empresa.v1")]`.',
        "En `Empresas.Historia`, el comando `RegistrarEmpresa(EmpresaId, Nit, Nombre, Plan)` y su `RegistrarEmpresaHandler`: hace lo de tu `Sembrar` y devuelve el anuncio con versión 1.",
      ],
      logro: { items: ["Compila, y el anuncio sale con versión 1: el stream nace con un hecho."] },
      tips: [
        {
          k: "nuevo",
          idioma: "public long Version { get; private set; }",
          explicacion:
            "Marten la llena al rehidratar con la versión del stream. Solo crece.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cambiar el plan también anuncia",
      tarea:
        "Haz que cambiar el plan anuncie el plan vigente con una versión mayor que la del registro.",
      pasos: [
        "`CambiarPlanHandler`, para `CambiarPlanDeEmpresa`: `ReglaDeNegocioException` si está suspendida; `Append` con `empresa.Version + 1`; devuelve el anuncio con esa versión.",
        "En `Empresas.Tests`, una clase nueva, `PlanDeEmpresaTests`, armada como `SuspenderHandlerTests`, con id y NIT nuevos por `Guid`, y el test de abajo.",
        "Cambia el `return` para que anuncie `empresa.Version`, la leída: el test **cae**. Vuelve a la versión nueva.",
      ],
      logro: { items: ["El test pasa, y cae si el cambio anuncia la versión leída."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var alta = RegistrarEmpresaHandler.Handle(new RegistrarEmpresa(id, nit, "Prueba", "Basico"), session);',
          "await session.SaveChangesAsync();",
          'var cambio = await CambiarPlanHandler.Handle(new CambiarPlanDeEmpresa(id, "Premium"), session);',
          'Assert.Equal("Premium", cambio.Plan);',
          "Assert.True(cambio.Version > alta.Version);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La réplica guarda lo más nuevo",
      tarea:
        "Haz que Facturación guarde en una tabla suya el último plan de cada empresa, sin que un anuncio viejo pise uno nuevo.",
      pasos: [
        "En `psql`, la tabla `plan_de_empresa(nit PRIMARY KEY, plan, version BIGINT)`. No la llames `planes`: ese nombre ya es tu catálogo.",
        "En `Facturacion`, la clase `Planes` con `Guardar(nit, plan, version)`: un `INSERT … ON CONFLICT (nit) DO UPDATE SET plan = EXCLUDED.plan, version = EXCLUDED.version WHERE plan_de_empresa.version < EXCLUDED.version`.",
        "`PlanesHandler`, el handler de `PlanDeEmpresaV1`, que llama a `Guardar`.",
      ],
      logro: { items: ["Compila. La prueba va en la pantalla siguiente."] },
      tips: [
        {
          k: "nuevo",
          idioma: "EXCLUDED · WHERE",
          explicacion:
            "`EXCLUDED` es la fila que intentó entrar. El `WHERE` final deja actualizar solo si es más nueva.",
        },
        {
          k: "nota",
          texto: "La clase que recibe mensajes termina en `Handler`: `Planes` no recibe nada.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El alta llega tarde",
      tarea:
        "Registra y cambia de plan una empresa nueva por el bus, y entrega a mano su alta otra vez, tarde.",
      pasos: [
        "En tu `Program.cs`, el bloque de abajo.",
        "Córrelo **una vez** y quita esas líneas: registrar emp-25 otra vez lanza `ExistingStreamIdCollisionException`.",
      ],
      logro: {
        items: ["`SELECT * FROM plan_de_empresa` → `902500000 | Premium | 2`"],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new RegistrarEmpresa("emp-25", "902500000", "Vidrios del Cauca", "Basico"));',
          'await bus.InvokeAsync(new CambiarPlanDeEmpresa("emp-25", "Premium"));',
          "await Task.Delay(500);   // los anuncios llegan por la cola",
          'PlanesHandler.Handle(new PlanDeEmpresaV1("902500000", "Basico", 1));   // el alta, tarde',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Sin fila, se pregunta",
      tarea:
        "Que Facturación saque el plan de hoy de su réplica y, si no tiene fila, se lo pregunte a Empresas y lo guarde.",
      pasos: [
        "`Planes.De(IMessageBus bus, string nit)`: con fila, devuelve el plan; sin fila, pregunta con `InvokeAsync<PlanActualV1>`, guarda la respuesta y la devuelve.",
        "`PlanActualV1` gana `long Version` (sigue siendo `V1`), y tu `ConsultarPlanHandler` le pasa `empresa.Version`.",
        'Tu `ProcesoMensual.Correr` usa `Planes.De`. En `Program.cs`: `await ProcesoMensual.Correr(bus, "900800800", "2026-12");`',
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Mensualidad 900800800: Premium"],
          tono: "ok",
        },
        items: [
          "`plan_de_empresa` gana `900800800 | Premium | 5`: la versión de `mt_streams`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La empresa que nadie anunció",
      tarea:
        "Con Empresas sin contestar, cobra a una empresa con fila en la réplica y a otra sin fila. Luego haz que la réplica confíe en su tabla.",
      pasos: [
        'Siembra emp-26 con `Sembrar` (no anuncia): `"emp-26", "902600000", "Cerámicas del Huila", "Basico"`. Comenta tu `ConsultarPlanHandler`.',
        'Cobra `"2026-12"` a `"902500000"` y luego a `"902600000"`.',
        "Devuelve el handler, quita la siembra, cambia `if (plan is not null) return plan;` por `return plan!;` y cobra otra vez a emp-26. Al terminar, devuelve el `if`.",
      ],
      logro: {
        items: [
          "emp-25 cobra `Premium` sin preguntarle a nadie.",
          "emp-26 falla con `IndeterminateRoutesException`.",
          "Con `return plan!;` sale `Mensualidad 902600000: `, **sin plan**.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El cambio que nadie oyó",
      tarea:
        "Cambia un plan sin pasar por el handler, y deja que un anuncio viejo llegue después del nuevo.",
      pasos: [
        'Un `Append` directo de `PlanCambiado("Enterprise")` a emp-25, y cobra `"2027-01"`. Luego quita el `Append`.',
        'Quita el `WHERE` de `Guardar` y entrega a mano `PlanDeEmpresaV1("999", "Premium", 2)` y después `("999", "Basico", 1)`.',
        "Vuelve a poner el `WHERE` y borra esa fila: `DELETE FROM plan_de_empresa WHERE nit = '999';`.",
      ],
      logro: {
        items: [
          "Empresas dice Enterprise; la réplica sigue en `Premium | 2`, y cobra Premium.",
          "Sin el `WHERE`: `999 | Basico | 1`. El viejo pisó al nuevo.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El dueño anuncia **cada cambio** con una versión que solo crece. La réplica guarda solo lo más nuevo, y sin fila **pregunta o falla**.",
      puntos: [
        {
          termino: "Réplica suscrita",
          definicion: "Una copia que el dueño mantiene al día con sus anuncios. Va atrás mientras el anuncio viaja.",
        },
        {
          termino: "Versión del stream",
          definicion: "Cuántos hechos tiene: solo crece, y ordena los anuncios de una empresa.",
        },
        {
          termino: "Sin fila",
          definicion: "Se pregunta al dueño o se falla. Nunca se cobra con un vacío.",
        },
      ],
      decision:
        "El dueño anuncia cada cambio, también el registro, con una versión que solo crece; la réplica guarda lo más nuevo, y sin fila pregunta o falla. Solo `Planes.De` saca el plan de hoy.",
      commit: {
        mensaje: "ES · La réplica suscrita",
        preguntas: [
          "¿Qué dato replicarías, qué anuncio lo mantiene, qué versión lo ordena y qué hace tu copia sin fila?",
        ],
      },
      siguiente: {
        seccion: "36 · Dos respuestas, ningún dueño",
        texto:
          "Suspender ahora pide que Facturación cobre y que Accesos corte. ¿Cumplieron los dos?",
      },
    },
  ],
};
