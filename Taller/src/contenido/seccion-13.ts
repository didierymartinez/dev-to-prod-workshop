// Fuente: workshop-event-sourcing/taller.md, entrada "13 · El diario en disco (y lo que se queda afuera)".
import type { Seccion } from "./tipos";

export const seccion13: Seccion = {
  numero: 13,
  titulo: "El diario en disco (y lo que se queda afuera)",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Guardar el diario en archivos para que **sobreviva al reinicio**, y descubrir que en disco hay que guardar también **el tipo** de cada hecho.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Registramos Constructora Andes, le cambiamos el plan y la suspendemos. Cerramos el programa y lo volvemos a abrir.",
        },
        { k: "texto", tam: "enorme", texto: "¿Qué queda?" },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Un programa que solo lee",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "var store = new EventStore();",
            'var empresa = store.AbrirStream<Empresa>("emp-7").Get();',
            'Console.WriteLine($"{empresa.Nombre}: {empresa.Plan}");',
          ],
        },
        {
          k: "terminal",
          junto: true,
          comando: "dotnet run",
          salida: [": "],
          tono: "error",
        },
        {
          k: "respuesta",
          texto:
            "Vacío. El `Dictionary` vivía en RAM y murió con el proceso anterior.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cada sobre, una línea",
      tarea:
        "El diario pasa de RAM a un archivo por empresa: no es lo de producción, pero es lo más simple que sobrevive al reinicio. Cambia solo el interior de `EventStore`; empieza por escribir.",
      pasos: [
        "En la **primera línea** del `Program.cs`, antes del código suelto: `using System.Text.Json;` (junto a la clase no compila).",
        "El constructor de `EventStore` recibe la carpeta y la crea. Tus `new EventStore()` pasan a `new EventStore(\"datos\")`.",
        "`AppendEvent` conserva la verificación de versión (lee lo que ya hay) y agrega el sobre serializado como una línea a `<id>.log`.",
      ],
      logro: { items: ["`AppendEvent` ya no usa el `Dictionary`."] },
      tips: [
        {
          k: "lista",
          titulo: "Para escribir",
          items: [
            "`Path.Combine(carpeta, id + \".log\")`: la ruta",
            "`Directory.CreateDirectory(carpeta)`",
            "`File.AppendAllText(ruta, texto)`: agrega al final",
            "`Environment.NewLine`: el salto de línea",
          ],
        },
        {
          k: "nuevo",
          idioma: "JsonSerializer.Serialize(sobre)",
          explicacion: "convierte el objeto en texto JSON.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Cada sobre, una línea",
      piezas: [
        {
          etiqueta: "**Primera línea** del `Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "using System.Text.Json;",
          ],
        },
        {
          etiqueta: "Dentro de `EventStore`: la carpeta, la ruta y la escritura",
          lenguaje: "csharp",
          lineas: [
            "    private readonly string _carpeta;",
            "",
            "    public EventStore(string carpeta)",
            "    {",
            "        _carpeta = carpeta;",
            "        Directory.CreateDirectory(_carpeta);",
            "    }",
            "",
            '    private string RutaDe(string id) => Path.Combine(_carpeta, id + ".log");',
            "",
            "    public void AppendEvent(string id, EventoAlmacenado sobre)",
            "    {",
            "        if (sobre.Version <= GetEvents(id).Count)   // misma verificación de versión de antes",
            '            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada.");',
            "",
            "        File.AppendAllText(RutaDe(id), JsonSerializer.Serialize(sobre) + Environment.NewLine);",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Lee las líneas de vuelta",
      tarea:
        "`GetEvents` lee el archivo del id y convierte cada línea de vuelta en un `EventoAlmacenado`.",
      pasos: [
        "Si el archivo no existe, `GetEvents` devuelve una lista vacía.",
        "Si existe, deserializa cada línea a `EventoAlmacenado`.",
        "Borra el `Dictionary` de `EventStore`: ya no se usa.",
      ],
      logro: { items: ["Compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "File.Exists · File.ReadAllLines",
          explicacion: "si el archivo está, y sus líneas como `string[]`.",
        },
        {
          k: "nuevo",
          idioma: "JsonSerializer.Deserialize<T>(linea)!",
          explicacion:
            "de texto JSON a objeto. El `!` dice «aquí no será null».",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Lee las líneas de vuelta",
      piezas: [
        {
          etiqueta: "Dentro de `EventStore`: la lectura",
          lenguaje: "csharp",
          lineas: [
            "    public List<EventoAlmacenado> GetEvents(string id)",
            "    {",
            "        if (!File.Exists(RutaDe(id))) return new();",
            "        return File.ReadAllLines(RutaDe(id))",
            "                   .Select(linea => JsonSerializer.Deserialize<EventoAlmacenado>(linea)!)",
            "                   .ToList();",
            "    }",
            "",
            "    // AbrirStream no cambia.",
            "    public EventStream<T> AbrirStream<T>(string id) where T : AggregateRoot, new() => new(this, id);",
          ],
        },
      ],
      nota: "Las dos puertas de afuera (`GetEvents` / `AppendEvent`) siguen igual: cambia de dónde salen y a dónde van los hechos.",
    },
    {
      tipo: "reto",
      titulo: "Siembra en disco",
      tarea:
        "Arriba, siembra la empresa con sus verbos, mira el archivo y pide la empresa de vuelta.",
      pasos: [
        "**Arriba**, cambia el código suelto por el ejemplo. `CambiarPlan` va antes de `Suspender`.",
        "Corre y abre `datos/emp-7.log`, dentro de `Empresas.Historia/`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: [": , activa"],
          tono: "error",
        },
        items: [
          "Los tres hechos están en el archivo.",
          "No explota: devuelve una empresa falsa.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var store = new EventStore("datos");',
          'var s = store.AbrirStream<Empresa>("emp-7");',
          "var e = s.Get();",
          'e.Registrar("Constructora Andes", "Básico");',
          'e.CambiarPlan("Enterprise");',
          'e.Suspender("falta de pago");',
          "s.Append(e);",
          'var empresa = store.AbrirStream<Empresa>("emp-7").Get();',
          'Console.WriteLine($"{empresa.Nombre}: {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}");',
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "¿Qué se quedó afuera?",
      bloques: [
        {
          k: "terminal",
          salida: [
            '{"Version":1,"EventData":{"Nombre":"Constructora Andes","Plan":"B\\u00E1sico"}}',
            '{"Version":2,"EventData":{"NuevoPlan":"Enterprise"}}',
            '{"Version":3,"EventData":{"Motivo":"falta de pago"}}',
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto:
            "`datos/emp-7.log`. `B\\u00E1sico` es `Básico`: `System.Text.Json` escapa lo que no es ASCII, y al leer vuelve a `Básico`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Los datos están completos. ¿Qué sabía cada hecho en RAM que estas líneas ya no dicen?",
        },
        { k: "respuesta", texto: "Su clase." },
      ],
    },
    {
      tipo: "reto",
      titulo: "¿Qué tipo vuelve?",
      tarea:
        "Deserializar hacia `object` devuelve un `JsonElement`, no tu clase. Compruébalo con los sobres de `emp-7`.",
      pasos: [
        "**Al final** del código de arriba, la línea del ejemplo.",
        "Corre `dotnet run`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["JsonElement", "JsonElement", "JsonElement"],
          tono: "error",
        },
        items: ["Ningún `case` del `switch` reconoce un `JsonElement`."],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'foreach (var sobre in store.GetEvents("emp-7")) Console.WriteLine(sobre.EventData.GetType().Name);',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Rotula cada hecho",
      tarea:
        "Junto a los datos, guarda el nombre de la clase de cada hecho, y úsalo al leer para volver a esa clase.",
      pasos: [
        "**Al final**: `public record EnDisco(int Version, string Tipo, object Datos);`, para escribir y para leer.",
        "En `EventStore`, un mapa `Dictionary<string, Type>` de nombre a clase, a mano, solo con `EmpresaRegistrada`, `PlanCambiado` y `EmpresaSuspendida`.",
        "Al escribir: `Tipo` = `sobre.EventData.GetType().Name`. Al leer: `GetRawText()` de `Datos`, y deserializar a la clase del mapa.",
      ],
      logro: {
        items: ["Compila. Quita el `foreach` que imprime los tipos."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: ".GetRawText()",
          explicacion: "el texto JSON crudo de un `JsonElement`.",
        },
        {
          k: "nuevo",
          idioma: "Deserialize(texto, unType)",
          explicacion:
            "deserializa a un tipo que eliges en ejecución, y devuelve `object`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Rotula cada hecho (1 de 3)",
      piezas: [
        {
          etiqueta: "**Al final** del `Program.cs`: la línea en disco, y el mapa dentro de `EventStore`",
          lenguaje: "csharp",
          lineas: [
            "// (el using System.Text.Json; ya está en la primera línea del Program.cs)",
            "",
            "// Una línea del archivo: datos + el tipo que los rotula. Datos entra como object",
            "// (al leer volverá como JsonElement, igual que el EventData de tu sobre).",
            "public record EnDisco(int Version, string Tipo, object Datos);",
            "",
            "public class EventStore",
            "{",
            "    private readonly string _carpeta;",
            "",
            "    // El desarrollador lista a mano cada tipo de evento que existe:",
            "    private static readonly Dictionary<string, Type> _tipos = new()",
            "    {",
            '        ["EmpresaRegistrada"] = typeof(EmpresaRegistrada),',
            '        ["PlanCambiado"]      = typeof(PlanCambiado),',
            '        ["EmpresaSuspendida"] = typeof(EmpresaSuspendida),',
            "        // (los eventos que usa esta empresa; si aparece uno más, hay que añadirlo)",
            "    };",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Rotula cada hecho (2 de 3)",
      piezas: [
        {
          etiqueta: "Sigue `EventStore`: al leer, el `Tipo` elige la clase",
          lenguaje: "csharp",
          lineas: [
            "    public EventStore(string carpeta)",
            "    {",
            "        _carpeta = carpeta;",
            "        Directory.CreateDirectory(_carpeta);",
            "    }",
            "",
            '    private string RutaDe(string id) => Path.Combine(_carpeta, id + ".log");',
            "",
            "    public List<EventoAlmacenado> GetEvents(string id)",
            "    {",
            "        if (!File.Exists(RutaDe(id))) return new();",
            "        var sobres = new List<EventoAlmacenado>();",
            "        foreach (var linea in File.ReadAllLines(RutaDe(id)))",
            "        {",
            "            var d = JsonSerializer.Deserialize<EnDisco>(linea)!;",
            "            var crudo = (JsonElement)d.Datos;                          // Datos es object → JsonElement",
            "            var hecho = JsonSerializer.Deserialize(crudo.GetRawText(), _tipos[d.Tipo])!;",
            "            sobres.Add(new EventoAlmacenado(d.Version, hecho));",
            "        }",
            "        return sobres;",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Rotula cada hecho (3 de 3)",
      piezas: [
        {
          etiqueta: "Y al escribir, el nombre de la clase va junto a los datos",
          lenguaje: "csharp",
          lineas: [
            "    public void AppendEvent(string id, EventoAlmacenado sobre)",
            "    {",
            "        if (sobre.Version <= GetEvents(id).Count)",
            '            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada.");',
            "",
            "        var enDisco = new EnDisco(sobre.Version, sobre.EventData.GetType().Name, sobre.EventData);",
            "        File.AppendAllText(RutaDe(id), JsonSerializer.Serialize(enDisco) + Environment.NewLine);",
            "    }",
            "",
            "    public EventStream<T> AbrirStream<T>(string id) where T : AggregateRoot, new() => new(this, id);",
            "}",
          ],
        },
      ],
      nota: "En disco, cada línea queda así: `{\"Version\":2,\"Tipo\":\"PlanCambiado\",\"Datos\":{\"NuevoPlan\":\"Enterprise\"}}`",
    },
    {
      tipo: "reto",
      titulo: "Sobrevive al reinicio",
      tarea:
        "Escribe en una corrida y lee en otra: siembra solo si el diario está vacío, y rehidrata siempre.",
      pasos: [
        "Borra la carpeta `datos/`: sus líneas no tienen `Tipo`, y leerlas lanza `NullReferenceException`.",
        "**Arriba**, cambia la siembra por el arnés «sembrar si está vacío» de la lámina siguiente.",
        "Corre dos veces, **sin** borrar `datos/`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          salida: ["Constructora Andes: plan Enterprise, suspendida"],
          tono: "ok",
        },
        items: [
          "La segunda corrida no siembra, y aun así imprime eso.",
          "Cada línea de `datos/emp-7.log` tiene su `Tipo`.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Sembrar si está vacío",
      piezas: [
        {
          etiqueta:
            "**Arriba**, en lugar de la siembra anterior. Si la empresa no tiene nombre, el diario está vacío y se siembra:",
          lenguaje: "csharp",
          lineas: [
            'var store = new EventStore("datos");',
            'if (store.AbrirStream<Empresa>("emp-7").Get().Nombre == "")',
            "{",
            '    var s = store.AbrirStream<Empresa>("emp-7");',
            "    var e = s.Get();",
            '    e.Registrar("Constructora Andes", "Básico");',
            '    e.CambiarPlan("Enterprise");',
            '    e.Suspender("falta de pago");',
            "    s.Append(e);",
            "}",
            'var empresa = store.AbrirStream<Empresa>("emp-7").Get();',
            'Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}");',
          ],
        },
      ],
      luego: "Corre dos veces sin borrar `datos/`: la segunda no siembra.",
    },
    {
      tipo: "reto",
      titulo: "El mapa olvidado",
      tarea:
        "El mapa de nombre a clase se llena a mano. Haz que `emp-7` pague y se reactive: ni `PagoRegistrado` ni `EmpresaReactivada` están en el mapa.",
      pasos: [
        '**Al final** del código de arriba: `new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));` y corre.',
        "Después quita esa línea y borra `datos/`: mientras quede la línea del pago, toda corrida revienta al leer `emp-7`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "KeyNotFoundException: The given key 'PagoRegistrado' was not present in the dictionary.",
          ],
        },
        items: [
          "El pago se escribe. Al escribir la reactivación, `AppendEvent` relee el diario y revienta.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Persistir el diario no es solo guardar los datos: es guardar **de qué hecho** son.",
      puntos: [
        {
          termino: "JsonElement",
          definicion:
            "Lo que da deserializar hacia `object`: datos sin clase de C#.",
        },
        {
          termino: "Tipo",
          definicion:
            "El nombre de la clase, guardado junto a los datos de cada hecho.",
        },
        {
          termino: "El mapa, a mano",
          definicion:
            "Si olvidas un evento, la historia deja de leerse.",
        },
      ],
      decision:
        "Rotulé cada hecho en disco con `GetType().Name`: el nombre de MI clase de C# quedó escrito dentro de la historia persistida.",
      commit: {
        mensaje: "ES · El diario en disco",
        preguntas: [
          "¿Qué cambió entre RAM y disco que obligó a guardar el tipo?",
        ],
      },
      siguiente: {
        seccion: "14 · El nombre del hecho es un contrato",
        texto:
          "Ese `Tipo` es el nombre de la clase. ¿Qué pasa con la historia guardada si alguien la renombra?",
      },
    },
  ],
};
