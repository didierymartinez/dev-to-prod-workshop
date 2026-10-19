// Fuente: workshop-event-sourcing/taller.md, entrada "29 · El evento público".
import type { Seccion } from "./tipos";

export const seccion29: Seccion = {
  numero: 29,
  titulo: "El evento público",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Anunciar la suspensión con un **contrato propio**, `EmpresaSuspendidaV1` con el NIT, en un proyecto `Contratos` que no ve el dominio. Así un cambio interno no rompe a Facturación.",
    },
    {
      tipo: "planteamiento",
      titulo: "¿Qué va en el mensaje?",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La bandeja ya guarda el anuncio en la misma transacción del hecho.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Qué metemos en ese mensaje?",
        },
        {
          k: "respuesta",
          texto:
            "Lo obvio es el evento tal cual. Veamos qué le pasa a quien lo lee.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Facturación lee tu evento interno",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            "// en Facturacion, con una referencia a Empresas.Historia:",
            "var e = JsonSerializer.Deserialize<EmpresaSuspendida>(mensaje);",
            'Console.WriteLine($"Facturación procesa: {e.Motivo}");',
          ],
        },
        { k: "texto", tam: "tenue", junto: true, texto: "Compila." },
        {
          k: "texto",
          texto:
            "Renombra `Motivo` a `Razon` en el evento interno, y corre `dotnet build Facturacion`.",
        },
        { k: "respuesta", texto: "Deja de compilar." },
        {
          k: "texto",
          texto:
            "Rompimos a un consumidor que no controlamos, por un cambio que era **asunto nuestro**.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Quién ve a quién",
      dosColumnas: true,
      bloques: [
        {
          k: "diario",
          lado: "izq",
          porItem: true,
          items: [
            "`Empresas.Historia → Contratos`",
            "`Empresas.Historia → Facturacion` (composición raíz)",
            "`Facturacion → Contratos`",
            "`Contratos → (nada)`",
          ],
        },
        {
          k: "texto",
          lado: "der",
          tam: "grande",
          texto:
            "El dominio **traduce** a `Contratos`. Facturación **solo** conoce el contrato.",
        },
        {
          k: "respuesta",
          lado: "der",
          texto: "`Contratos` no ve tu dominio: no puede filtrar nada privado.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Las referencias del grafo",
      tarea:
        "Crea el proyecto `Contratos` y arma las referencias para que Facturación solo conozca el contrato.",
      pasos: [
        "Crea `Contratos` (y `Facturacion`, si no existe).",
        "**Primero** quita la referencia del dolor, `Facturacion → Empresas.Historia`, con la ruta al `.csproj`.",
        "Después, las tres referencias del grafo. Los comandos, abajo.",
      ],
      logro: {
        items: [
          "`Contratos` no referencia nada; `Facturacion` referencia **solo** `Contratos`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "dotnet new classlib -o Contratos",
          "dotnet remove Facturacion reference Empresas.Historia/Empresas.Historia.csproj",
          "dotnet add Empresas.Historia reference Contratos",
          "dotnet add Facturacion reference Contratos",
          "dotnet add Empresas.Historia reference Facturacion",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El contrato",
      tarea:
        "Declara en `Contratos` el evento público de la suspensión.",
      pasos: [
        "En `Contratos`, el `record` de abajo.",
        "Lleva el **NIT**, la identidad que conoce Facturación. Nunca tu `emp-7`.",
      ],
      logro: { items: ["`dotnet build Contratos` en verde."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Evento público",
          explicacion:
            "un contrato versionado, en un proyecto que no ve tu dominio. Si cambia de verdad, sale un `V2` **al lado** del `V1`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "namespace Contratos;",
          "public record EmpresaSuspendidaV1(string Nit, string Motivo);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Del id al NIT",
      tarea:
        "Al publicar, traduce del evento interno al público: busca el NIT del id y deja en la bandeja el JSON del contrato.",
      pasos: [
        "En `IEventStore`, declara `string NitDe(string streamId)`.",
        "`PostgresEventStore`: `SELECT nit FROM localizador WHERE stream = @id`. `InMemoryEventStore`: lee al revés su diccionario NIT→id.",
        "En el handler que suspende, el código de abajo.",
      ],
      logro: {
        items: [
          "La bandeja recibe el JSON de `EmpresaSuspendidaV1`, con el NIT y no con `emp-7`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "e.Suspender(cmd.Motivo);",
          "var nit = store.NitDe(cmd.EmpresaId);   // id interno → NIT",
          "var publico = new Contratos.EmpresaSuspendidaV1(nit, cmd.Motivo);",
          "stream.Append(e, new[] { JsonSerializer.Serialize(publico) });",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El consumidor solo ve el contrato",
      tarea:
        "Haz que la línea de abajo compile en `Facturacion` y dé la salida de la derecha. Luego cablea la entrega hasta él.",
      pasos: [
        "En `Facturacion/Consumidor.cs`, una `static class Consumidor` con `Recibir(string mensaje)`.",
        "`EntregarPendientes` recibe un `Action<string> publicar` y lo llama por cada mensaje.",
        "En el `Program.cs` de `Empresas.Historia`: `store.EntregarPendientes(mensaje => Consumidor.Recibir(mensaje))`.",
      ],
      logro: {
        terminal: {
          salida: ["Facturación: suspender NIT 900123456 (Falta de pago)"],
          tono: "ok",
        },
        items: [
          "Con `Motivo` renombrado en el evento interno, `dotnet build Facturacion` y `dotnet build Empresas.Historia` en verde.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'Consumidor.Recibir(JsonSerializer.Serialize(new EmpresaSuspendidaV1("900123456", "Falta de pago")))',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El consumidor solo ve el contrato",
      piezas: [
        {
          etiqueta: "`Facturacion/Consumidor.cs`: deserializa el CONTRATO; nunca vio tu `EmpresaSuspendida`",
          lenguaje: "csharp",
          lineas: [
            "using Contratos;",
            "using System.Text.Json;",
            "public static class Consumidor",
            "{",
            "    public static string Recibir(string mensaje)",
            "    {",
            "        var e = JsonSerializer.Deserialize<EmpresaSuspendidaV1>(mensaje)!;",
            '        return $"Facturación: suspender NIT {e.Nit} ({e.Motivo})";',
            "    }",
            "}",
          ],
        },
        {
          etiqueta: "En `PostgresEventStore`: `EntregarPendientes` ya no conoce al consumidor, recibe un callback",
          lenguaje: "csharp",
          lineas: [
            "public int EntregarPendientes(Action<string> publicar) { /* …lee pendientes; por cada uno: publicar(mensaje); marca entregado… */ }",
          ],
        },
        {
          etiqueta: "En el `Program.cs` de `Empresas.Historia`, la composición raíz",
          lenguaje: "csharp",
          lineas: ["store.EntregarPendientes(mensaje => Consumidor.Recibir(mensaje));"],
        },
      ],
      nota: "Ese `Action<string> publicar` es una **costura**: el día que facturación viva en otra máquina, ahí sale el mensaje a viajar.",
    },
    {
      tipo: "rompelo",
      titulo: "El límite es de compilación",
      tarea:
        "Intenta saltarte el contrato desde `Facturacion`, de dos formas.",
      pasos: [
        "En `Facturacion`, usa `EmpresaSuspendida`, el evento interno.",
        "Pega en `Facturacion` el `Reactivacion.cs` de la lámina siguiente y corre `dotnet build Facturacion`.",
        "Borra `Reactivacion.cs`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet build Facturacion",
          tono: "error",
          salida: ["error CS0246"],
        },
        items: [
          "Las dos veces. `EmpresaReactivadaV1` es un contrato prometido que nadie declaró en `Contratos`.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un contrato que solo existe en un ejemplo",
      piezas: [
        {
          etiqueta:
            "`Facturacion/Reactivacion.cs`, copiado de la documentación de tu equipo:",
          lenguaje: "csharp",
          lineas: [
            "using Contratos;",
            "using System.Text.Json;",
            "public static class Reactivacion",
            "{",
            "    public static string Recibir(string mensaje)",
            "    {",
            "        var e = JsonSerializer.Deserialize<EmpresaReactivadaV1>(mensaje)!;",
            '        return $"Facturación: reactivar NIT {e.Nit}";',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un contrato que acepta cualquier cosa",
      tarea:
        "Cambia el contrato por uno genérico y repite el renombre del dolor.",
      pasos: [
        "Cambia a `Anuncio(string Tipo, object Datos)`, con el código de la lámina siguiente.",
        "En el handler, renombra `Motivo =` por `Razon =`. Compila los dos proyectos, suspende y entrega.",
        "Vuelve a `EmpresaSuspendidaV1`.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: [
            "KeyNotFoundException: The given key was not present in the dictionary.",
          ],
        },
        items: [
          "Los dos builds en verde: revienta al leer, no al compilar.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "rompelo",
      titulo: "Un solo tipo para todos los anuncios",
      piezas: [
        {
          etiqueta: "En `Contratos`:",
          lenguaje: "csharp",
          lineas: ["public record Anuncio(string Tipo, object Datos);"],
        },
        {
          etiqueta: "En el handler que suspende, lo que publicas:",
          lenguaje: "csharp",
          lineas: [
            'new Contratos.Anuncio("empresa-suspendida", new { Nit = nit, Motivo = cmd.Motivo })',
          ],
        },
        {
          etiqueta: "En `Consumidor.Recibir`, los datos llegan como JSON crudo:",
          lenguaje: "csharp",
          lineas: [
            "var a = JsonSerializer.Deserialize<Anuncio>(mensaje)!;",
            "var datos = (JsonElement)a.Datos;",
            'return $"Facturación: suspender NIT {datos.GetProperty("Nit").GetString()} " +',
            '       $"({datos.GetProperty("Motivo").GetString()})";',
          ],
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "El interno es nuestra verdad; el público, **una promesa**. `Contratos` vuelve el límite un hecho de compilación, mientras cada anuncio sea un tipo declarado ahí.",
      puntos: [
        {
          termino: "Evento público",
          definicion:
            "Un contrato versionado (`V1`, luego `V2` al lado), en un proyecto que no ve tu dominio.",
        },
        {
          termino: "Traducir al publicar",
          definicion:
            "Del id interno a la identidad de negocio: el NIT, nunca `emp-7`.",
        },
      ],
      commit: {
        mensaje: "ES · El evento público",
        preguntas: [
          "¿Por qué buscar el NIT del id es trabajo real, y qué se filtraría publicando `emp-7`?",
        ],
      },
      siguiente: {
        seccion: "30 · El mensaje y la cola",
        texto:
          "Cuando Facturación viva en otra máquina, el mensaje tendrá que viajar por una cola. ¿Qué trae una cola que un método no trae?",
      },
    },
  ],
};
