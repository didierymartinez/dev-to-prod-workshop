// Fuente: workshop-event-sourcing/taller.md, entrada "61 · Que el servicio avise".
import type { Seccion } from "./tipos";

export const seccion61: Seccion = {
  numero: 61,
  titulo: "Que el servicio avise",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el servicio mismo **avise** en `/healthz` cuando el rezago del daemon pasa de un límite que tú declaras.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Si el daemon se detiene de madrugada, el servicio sigue respondiendo **200** a cada comando.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Quién se entera, y cuándo?",
        },
        {
          k: "respuesta",
          texto:
            "Tu consulta (2) y CosmosLens responden solo cuando alguien mira.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El rezago, dentro del servicio",
      tarea:
        "Escribe un health check que corra tu consulta (2) del rezago y responda `Degraded` si pasa del umbral.",
      pasos: [
        "En `Empresas.Historia/RezagoDelDaemon.cs`, un `IHealthCheck` con constructor primario `(string cadena, long umbral)`.",
        "Corre la consulta (2) con Npgsql async (`OpenAsync`, `ExecuteScalarAsync`), con `coalesce` por si la proyección no tiene fila.",
        "Devuelve `HealthCheckResult.Degraded(…)` si el rezago pasa del umbral, y `Healthy(…)` si no.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "health check",
          explicacion:
            "una comprobación que el servicio corre cada vez que alguien pide su estado. Devuelve `Healthy`, `Degraded` o `Unhealthy`: con los dos primeros la ruta da 200, con `Unhealthy` da 503.",
        },
        {
          k: "nota",
          texto:
            "Su método: `CheckHealthAsync(HealthCheckContext context, CancellationToken ct)`, con `using Microsoft.Extensions.Diagnostics.HealthChecks;`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Regístralo y publícalo",
      tarea:
        "Registra el check con un umbral de 10 y publica `/healthz` abierta, porque el monitor de la plataforma no tiene token.",
      pasos: [
        "En `Program.cs`, **después** de `AgregarEmpresas`, las tres primeras líneas de abajo.",
        "Junto a tus endpoints, la última.",
        "Sin token: `curl http://localhost:5000/healthz`",
      ],
      logro: {
        terminal: {
          salida: ["Healthy"],
          tono: "ok",
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var cadena = builder.Configuration.GetConnectionString("Postgres")!;',
          "builder.Services.AddHealthChecks()",
          '    .AddCheck("rezago", new RezagoDelDaemon(cadena, umbral: 10));',
          "",
          'app.MapHealthChecks("/healthz").AllowAnonymous();',
        ],
      },
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Por qué `Degraded` y no `Unhealthy`?",
        },
        {
          k: "respuesta",
          texto: "Porque las decisiones leen el diario, no la vista.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Con un 503, el balanceador sacaría del tráfico un servicio que **sí puede trabajar**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El monitor",
      tarea:
        "Deja corriendo un monitor que le pregunte a `/healthz` cada 5 segundos, como el de la plataforma.",
      pasos: ["En otra terminal, la vuelta de abajo. Déjala corriendo."],
      logro: {
        terminal: { salida: ["Healthy", "Healthy"], tono: "ok" },
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "while true; do curl -s http://localhost:5000/healthz; echo; sleep 5; done",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Apaga el daemon",
      tarea:
        "Apaga el daemon y atrasa la vista: el monitor tiene que pasar a `Degraded`.",
      pasos: [
        "Llama `AgregarEmpresas` con `DaemonMode.Disabled`.",
        "Entre `builder.Build()` y `app.Run()`, la siembra de abajo. Arranca y suspende emp-30, emp-31 y emp-32 con `$ACME`.",
        "Quita la siembra: las tres ya existen.",
      ],
      logro: {
        terminal: { salida: ["Healthy", "Degraded"], tono: "error" },
        items: [
          "La (2) da un rezago de `18`, y el log dice `VistaSuspendida va 18 hechos atrás (umbral: 10)`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var store = app.Services.GetRequiredService<IDocumentStore>();",
          'await using (var s = store.LightweightSession("acme"))',
          "{",
          '    Sembrar(s, "emp-30", "903000000", "Ferretería Centro", "Basico");',
          '    Sembrar(s, "emp-31", "903100000", "Droguería Norte", "Premium");',
          '    Sembrar(s, "emp-32", "903200000", "Papelería Sur", "Basico");',
          "    await s.SaveChangesAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Sin el check",
      tarea:
        "Con el daemon todavía apagado, quita el check y mira qué dice `/healthz`.",
      pasos: [
        "Comenta `.AddCheck(...)` y cierra `AddHealthChecks()` con `;`.",
        "Reinicia, con el daemon apagado.",
        "Descoméntalo y reinicia.",
      ],
      logro: {
        items: [
          "Sin el check, `/healthz` dice `Healthy`, aunque la vista va 18 hechos atrás.",
          "Con el check, vuelve `Degraded`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El daemon vuelve",
      tarea: "Prende otra vez el daemon y mira el monitor.",
      pasos: ["Vuelve a `DaemonMode.HotCold` y reinicia."],
      logro: {
        terminal: { salida: ["Degraded", "Healthy"], tono: "ok" },
        items: ["El daemon alcanzó al diario."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un health check pone la consulta del rezago **dentro del servicio**. Responde `Degraded` sobre el umbral declarado sin que nadie mire, y el servicio sigue en el tráfico.",
      puntos: [
        {
          termino: "Health check",
          definicion:
            "Una comprobación que el servicio corre cada vez que alguien pide su estado.",
        },
        {
          termino: "Degraded, no Unhealthy",
          definicion:
            "Con rezago se puede decidir: 200, y el servicio sigue en el tráfico.",
        },
        {
          termino: "Umbral",
          definicion: "Cuántos hechos de atraso aceptas antes de avisar.",
        },
      ],
      commit: {
        mensaje: "ES · Que el servicio avise",
        preguntas: [
          "¿Qué te avisa `/healthz` que tus consultas no?",
          "¿Por qué `Degraded` y no `Unhealthy`? ¿Por qué responde sin token?",
        ],
      },
      siguiente: {
        seccion: "62 · El stream que no para de crecer",
        texto:
          "El rezago mide lo que le falta a la vista. La consulta (1) mide el largo de cada stream, pero no lo que ese largo le cuesta a cada comando.",
      },
    },
  ],
};
