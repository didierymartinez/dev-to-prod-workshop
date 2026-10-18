// Fuente: workshop-event-sourcing/taller.md, entrada "33 · Llegó dos veces".
import type { Seccion } from "./tipos";

export const seccion33: Seccion = {
  numero: 33,
  titulo: "Llegó dos veces",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que Facturación **no cobre doble** cuando le llega el mismo mensaje, o el mismo acto en otro mensaje.",
    },
    {
      tipo: "planteamiento",
      titulo: "Una multa por suspensión",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Desde hoy, Facturación cobra una multa por cada suspensión.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "El outbox entrega **al menos una vez**.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Cuántas multas cobra por una suspensión?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Entre «hago el trabajo» y «marco hecho»",
      bloques: [
        {
          k: "terminal",
          salida: ["mismo mensaje entregado 2 veces → multas cobradas = 2"],
          tono: "error",
        },
        {
          k: "tabla",
          columnas: ["Si el proceso cae…", "Arriesga"],
          filas: [
            ["at-least-once: reintenta", "duplicar"],
            ["at-most-once: no reintenta", "perder"],
            ["exactly-once: los dos, atómicos", "una transacción distribuida"],
          ],
        },
        {
          k: "respuesta",
          texto:
            "La industria elige la primera: el duplicado lo aguanta **el consumidor**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Facturación, con su base",
      tarea:
        "Prepara `Facturacion` para guardar qué mensajes ya procesó.",
      pasos: [
        "`dotnet add Facturacion package Npgsql` y `dotnet add Facturacion package WolverineFx`.",
        "En `Facturacion`, la clase `Conexion` de abajo: lee `CADENA_POSTGRES` con el mismo `?? throw`.",
        "En `psql`: `CREATE TABLE procesados(mensaje_id UUID PRIMARY KEY);`",
      ],
      logro: { items: ["`dotnet build Facturacion` en verde."] },
      tips: [
        {
          k: "nota",
          texto:
            "`Facturacion` no ve la `cadena` de `Empresas.Historia`: cada contexto lleva su configuración.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class Conexion",
          "{",
          '    public static string Cadena => Environment.GetEnvironmentVariable("CADENA_POSTGRES")',
          '        ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");',
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Cobra una sola vez",
      tarea:
        "Cobrar acumula, así que deduplica: anota el id del mensaje, y cobra solo si es nuevo.",
      pasos: [
        "`FacturacionHandler.Handle(EmpresaSuspendidaV1 msg, Envelope envelope)`.",
        "Corre `INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING` con `envelope.Id`.",
        'Cobra solo si afectó 1 fila. Cobrar es `MundoExterno.Recibidos.Add($"multa NIT {msg.Nit}")`.',
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Idempotente",
          explicacion:
            "repetirlo no cambia el resultado. Si el efecto sobrescribe, no hagas nada; si acumula, deduplica por una llave.",
        },
        {
          k: "nuevo",
          idioma: "Envelope",
          explicacion:
            "el sobre del transporte. En una reentrega, su `Id` es el mismo.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La reentrega, simulada",
      tarea:
        "Entrega el mismo mensaje dos veces, en el mismo sobre, y cuenta las multas.",
      pasos: [
        "En el `Program.cs` de `Empresas.Historia`, comenta el `InvokeAsync` que suspende `emp-7`: también cobra.",
        "Debajo, el código de abajo. El mensaje va con su nombre completo, `Contratos.EmpresaSuspendidaV1`.",
        "Corre `dotnet run`.",
      ],
      logro: {
        terminal: { comando: "dotnet run", salida: ["multas: 1"], tono: "ok" },
        items: ["Sin el dedup, `multas: 2`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "MundoExterno.Recibidos.Clear();",
          "var sobre = new Envelope { Id = Guid.NewGuid() };",
          'FacturacionHandler.Handle(new Contratos.EmpresaSuspendidaV1("900123", "mora"), sobre);',
          'FacturacionHandler.Handle(new Contratos.EmpresaSuspendidaV1("900123", "mora"), sobre);',
          'Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");',
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "El mismo pago, en otro sobre",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "El banco avisa que `emp-7` pagó, con la referencia `BANCO-0001`. No ve tu confirmación a tiempo, y avisa otra vez.",
        },
        {
          k: "respuesta",
          texto:
            "El mismo pago, en otro mensaje, con otro `envelope.Id`. El dedup por sobre deja pasar los dos.",
        },
        {
          k: "texto",
          texto:
            "Lo que identifica este acto es la referencia del banco. La recuerda quien decide si el pago ya entró: **la empresa**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La empresa recuerda la referencia",
      tarea:
        "Que el hecho del pago guarde su referencia, y que la empresa sepa si ya la registró.",
      pasos: [
        "El hecho pasa a `PagoRegistrado(int Monto, string? Referencia = null)`: los pagos viejos se leen con `null`.",
        "En `Empresa`, un `HashSet<string>` privado que llena `Apply(PagoRegistrado)`, si el hecho trae referencia.",
        "Y un `YaRegistro(referencia)` que le pregunta al conjunto.",
      ],
      logro: {
        items: ["Compila, y tus `new PagoRegistrado(50_000)` siguen compilando."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "HashSet<T>",
          explicacion:
            "un conjunto: `Add` agrega si no estaba, y `Contains` dice si está.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El aviso del banco",
      tarea:
        "Un comando para el aviso del banco, que no registra dos veces la misma referencia.",
      pasos: [
        "El comando `RegistrarPago(EmpresaId, Referencia, Monto)` y su `RegistrarPagoHandler` `static`.",
        "Rehidrata con la sesión. Si ya registró esa referencia, no hace nada; si no, `Append` del `PagoRegistrado` con la referencia.",
        "En `Program.cs`, los dos avisos de abajo. Luego cuenta en `psql`: `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-7' AND type = 'pago_registrado';`",
      ],
      logro: {
        items: ["Los dos avisos dejan **un solo** `pago_registrado` más."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await bus.InvokeAsync(new RegistrarPago("emp-7", "BANCO-0001", 50_000));',
          'await bus.InvokeAsync(new RegistrarPago("emp-7", "BANCO-0001", 50_000));   // el banco avisa otra vez',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Lo que el sobre no ve",
      tarea:
        "Quita cada guarda, de a una, y mira qué se cobra o se registra dos veces.",
      pasos: [
        "Quita la condición del cobro y repite la reentrega: dos multas. Vuelve a ponerla.",
        "Publica dos veces el mismo anuncio, con el código de abajo.",
        "Comenta la guarda de `RegistrarPagoHandler` y avisa dos veces con `BANCO-0002`. Vuelve a ponerla.",
      ],
      logro: {
        items: [
          "Dos publicaciones: `multas: 2`, con el dedup puesto. Son dos sobres; esto queda abierto hasta la sección 39.",
          "Sin la guarda de pagos: dos `pago_registrado`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "MundoExterno.Recibidos.Clear();",
          'await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1("900123", "mora"));',
          'await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1("900123", "mora"));',
          "await Task.Delay(500);",
          'Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El cobro externo pierde la respuesta",
      tarea:
        "La multa es un cobro en una API de pagos, y la red pierde su respuesta. Mira qué hace el reintento.",
      pasos: [
        "En `Facturacion`, cambia `MundoExterno` por el de la lámina siguiente.",
        "Mete el cobro en una transacción y corre la prueba, con el código de la otra lámina.",
        "La cura: antes de cobrar, pregunta `MundoExterno.YaCobro(envelope.Id)`. Al terminar, deja todo como estaba.",
      ],
      logro: {
        terminal: { comando: "dotnet run", salida: ["multas: 2"], tono: "error" },
        items: ["Con la pregunta antes de cobrar: una multa."],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un sistema de pagos que pierde la respuesta",
      piezas: [
        {
          etiqueta: "En `Facturacion`, en lugar de tu `MundoExterno`:",
          lenguaje: "csharp",
          lineas: [
            "public static class MundoExterno",
            "{",
            "    public static List<string> Recibidos = new();",
            "    public static bool PerderRespuesta;                // la red falla después de cobrar",
            "    static readonly HashSet<Guid> _cobrados = new();   // lo que recuerda el sistema de pagos",
            "    public static bool YaCobro(Guid referencia) => _cobrados.Contains(referencia);",
            "    public static void Cobrar(Guid referencia, string nit)",
            "    {",
            "        _cobrados.Add(referencia);",
            '        Recibidos.Add($"multa NIT {nit}");',
            "        if (PerderRespuesta)",
            '            { PerderRespuesta = false; throw new TimeoutException("la respuesta no llegó"); }',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "El cobro, y su reintento",
      piezas: [
        {
          etiqueta: "En `FacturacionHandler`, el `INSERT` y el cobro, en una transacción:",
          lenguaje: "csharp",
          lineas: [
            "using var tx = c.BeginTransaction();",
            "cmd.Transaction = tx;",
            "if (cmd.ExecuteNonQuery() == 1) MundoExterno.Cobrar(envelope.Id, msg.Nit);",
            "tx.Commit();",
          ],
        },
        {
          etiqueta:
            "En el `Program.cs` de `Empresas.Historia`. El segundo `Handle` es el reintento, con el mismo sobre:",
          lenguaje: "csharp",
          lineas: [
            "MundoExterno.Recibidos.Clear();",
            'var aviso = new Contratos.EmpresaSuspendidaV1("900123", "mora");',
            "var sobreExterno = new Envelope { Id = Guid.NewGuid() };",
            "MundoExterno.PerderRespuesta = true;",
            "try { FacturacionHandler.Handle(aviso, sobreExterno); }",
            "catch (TimeoutException ex) { Console.WriteLine(ex.Message); }   // Wolverine reintentaría",
            "FacturacionHandler.Handle(aviso, sobreExterno);",
            'Console.WriteLine($"multas: {MundoExterno.Recibidos.Count}");',
          ],
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "Deduplica por **la llave de lo que se repite**: el sobre para la reentrega, la referencia del origen para el acto repetido, nunca un dato que solo se parece.",
      puntos: [
        {
          termino: "Idempotente",
          definicion:
            "Repetirlo no cambia el resultado. Sobrescribir lo es; acumular, no.",
        },
        {
          termino: "Envelope",
          definicion: "El sobre del transporte: su `Id` se repite en la reentrega.",
        },
      ],
      decision:
        "Deduplico por la llave de lo que se repite: el sobre para la reentrega, la referencia del origen para el acto repetido. Nunca por un dato que solo se parece. Con un efecto externo, le paso la llave y le pregunto por ella antes de reintentar.",
      commit: {
        mensaje: "ES · Llegó dos veces",
        preguntas: [
          "Un efecto tuyo que sobrescribe y otro que acumula. Para el segundo, ¿qué se repite y qué llave lo identifica?",
        ],
      },
      siguiente: {
        seccion: "34 · El contrato lleva lo justo",
        texto:
          "¿El plan va en el anuncio, o se pregunta?",
      },
    },
  ],
};
