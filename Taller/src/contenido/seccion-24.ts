// Fuente: workshop-event-sourcing/taller.md, entrada "24 · El árbol de empresas".
import type { Seccion } from "./tipos";

export const seccion24: Seccion = {
  numero: 24,
  titulo: "El árbol de empresas",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que dos cambios a la vez no cierren un ciclo de matrices, poniendo todo el árbol en **un solo stream** (el del grupo), y que el recorrido siempre termine.",
    },
    {
      tipo: "planteamiento",
      titulo: "Matrices y filiales",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Si `emp-a` es filial de `emp-b`, `emp-b` no puede ser filial de `emp-a`.",
        },
        {
          k: "texto",
          texto:
            "Hoy cada empresa guarda su matriz en **su** stream, con el hecho `MatrizAsignada`.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Qué pasa si las dos asignaciones llegan a la vez?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La matriz, en cada filial",
      tarea:
        "Copia el código del dolor: la matriz como un dato de cada empresa y una regla que sube de matriz en matriz. Luego córrelo.",
      pasos: [
        "Al final del `Program.cs`, el hecho de abajo. En tu `Empresa`, la propiedad `Matriz`, su `case` en `Aplicar` y el verbo `AsignarMatriz`.",
        "Junto a `Empresa`, la clase `Jerarquia` de la lámina «La regla, afuera», y en `Empresas.Tests/ArbolDeEmpresas.cs` el test de la lámina «Dos asignaciones a la vez».",
        "Corre `dotnet test`. **No va a terminar**: córtalo con Ctrl+C.",
      ],
      logro: {
        items: [
          "`dotnet test` se queda corriendo y lo cortas con Ctrl+C.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public record MatrizAsignada(string MatrizId);   // va al stream de la filial",
          "",
          "// en Empresa:",
          "public string? Matriz { get; private set; }",
          "//   en Aplicar → case MatrizAsignada m: Matriz = m.MatrizId; break;",
          "public void AsignarMatriz(string matrizId) => Emitir(new MatrizAsignada(matrizId));",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La regla, afuera",
      piezas: [
        {
          etiqueta:
            "Junto a `Empresa`. Sube de matriz en matriz: ¿subiendo desde `desde`, pasas por `buscada`?",
          lenguaje: "csharp",
          lineas: [
            "public static class Jerarquia",
            "{",
            "    public static bool SubeHasta(IEventStore store, string desde, string buscada)",
            "    {",
            "        string? actual = desde;",
            "        while (actual is not null)",
            "        {",
            "            if (actual == buscada) return true;",
            "            actual = store.AbrirStream<Empresa>(actual).Get().Matriz;",
            "        }",
            "        return false;",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Dos asignaciones a la vez",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/ArbolDeEmpresas.cs`, dentro de `public class ArbolDeEmpresas { … }`. Las dos peticiones validan **antes** de guardar:",
          lenguaje: "csharp",
          lineas: [
            "static void Asignar(IEventStore store, string filial, string matriz)",
            "{",
            "    var s = store.AbrirStream<Empresa>(filial); var e = s.Get();",
            "    e.AsignarMatriz(matriz); s.Append(e);",
            "}",
            "[Fact]",
            "public void Dos_cambios_a_la_vez_cierran_un_ciclo()",
            "{",
            "    var store = new InMemoryEventStore();",
            '    Assert.False(Jerarquia.SubeHasta(store, "emp-b", "emp-a"));   // petición 1: emp-a bajo emp-b',
            '    Assert.False(Jerarquia.SubeHasta(store, "emp-a", "emp-b"));   // petición 2: emp-b bajo emp-a',
            '    Asignar(store, "emp-a", "emp-b");                            // versión 1 de emp-a',
            '    Asignar(store, "emp-b", "emp-a");                            // versión 1 de emp-b',
            '    Assert.False(Jerarquia.SubeHasta(store, "emp-a", "emp-c"));   // la siguiente',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Un ciclo, y nadie chocó",
      bloques: [
        {
          k: "diario",
          porItem: true,
          items: [
            "`emp-a` bajo `emp-b` · versión 1 de `emp-a`",
            "`emp-b` bajo `emp-a` · versión 1 de `emp-b`",
          ],
        },
        {
          k: "texto",
          texto:
            "`SubeHasta` va de `emp-a` a `emp-b`, de `emp-b` a `emp-a`… y no termina nunca.",
        },
        {
          k: "respuesta",
          texto:
            "Ninguna escritura chocó: cada una fue la versión 1 de **su** stream.",
        },
        {
          k: "texto",
          texto:
            "«Sin ciclos» no es una regla de un stream: mira el árbol entero.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El árbol, en el grupo",
      tarea:
        "Lleva todo el árbol a un solo stream, el del grupo, con un agregado que conoce todas las parejas filial → matriz.",
      pasos: [
        "Cambia el hecho a `MatrizAsignada(string Filial, string Matriz)`: en el stream del grupo, dice de quién es la matriz.",
        "Crea `GrupoEmpresarial : AggregateRoot` con `Dictionary<string, string> _matrizDe` (filial → matriz). Su `Aplicar` solo anota la pareja.",
        "Dale su propio `SubeHasta` privado, que lea `_matrizDe.GetValueOrDefault(id)`. `AsignarMatriz(filial, matriz)` lanza `ReglaDeNegocioException` si cerraría un ciclo; si no, emite.",
      ],
      logro: {
        items: [
          "`GrupoEmpresarial` compila. Su `SubeHasta` lee solo el diccionario, sin abrir streams.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Una frontera para la regla",
          explicacion:
            "si una regla mira varias empresas, todo lo que mira va en **un** stream. Dos cambios cargan la misma versión, y el segundo choca al guardar.",
        },
        {
          k: "nuevo",
          idioma: "GetValueOrDefault(id)",
          explicacion: "da la matriz de `id`, o `null` si no tiene.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El árbol, en el grupo (1 de 2)",
      piezas: [
        {
          etiqueta: "El hecho, ahora con las dos empresas",
          lenguaje: "csharp",
          lineas: [
            "public record MatrizAsignada(string Filial, string Matriz);   // va al stream del grupo",
          ],
        },
        {
          etiqueta: "Junto a `Empresa`: el agregado del grupo",
          lenguaje: "csharp",
          lineas: [
            "public class GrupoEmpresarial : AggregateRoot",
            "{",
            "    private readonly Dictionary<string, string> _matrizDe = new();   // filial → matriz",
            "",
            "    protected override void Aplicar(object hecho)",
            "    {",
            "        switch (hecho)",
            "        {",
            "            case MatrizAsignada m: _matrizDe[m.Filial] = m.Matriz; break;",
            "        }",
            "    }",
            "",
            "    public void AsignarMatriz(string filial, string matriz)",
            "    {",
            "        if (SubeHasta(matriz, filial))",
            '            throw new ReglaDeNegocioException($"{filial} bajo {matriz} cerraría un ciclo.");',
            "        Emitir(new MatrizAsignada(filial, matriz));",
            "    }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El árbol, en el grupo (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue, dentro de `GrupoEmpresarial`: su propio `SubeHasta`",
          lenguaje: "csharp",
          lineas: [
            "    // sube por el diccionario, no por los streams",
            "    private bool SubeHasta(string desde, string buscada)",
            "    {",
            "        string? actual = desde;",
            "        while (actual is not null)",
            "        {",
            "            if (actual == buscada) return true;",
            "            actual = _matrizDe.GetValueOrDefault(actual);",
            "        }",
            "        return false;",
            "    }",
            "}",
          ],
        },
      ],
      nota: "El recorrido lee solo lo que cargó el grupo: todo lo que la regla mira queda bajo la versión que choca.",
    },
    {
      tipo: "reto",
      titulo: "Dos cambios chocan en el grupo",
      tarea:
        "Borra la jerarquía de cada empresa y comprueba que dos asignaciones a la vez ahora chocan en `grupo-andes`.",
      pasos: [
        "Borra lo del dolor: `Matriz`, su `case` y `AsignarMatriz` en `Empresa`, la clase `Jerarquia`, y el test del dolor con su `Asignar`.",
        "En `ArbolDeEmpresas.cs`, copia el test de la lámina siguiente.",
        "Corre `dotnet test` hasta que pase.",
      ],
      logro: {
        items: [
          "En `grupo-andes`, la segunda asignación lanza `ConcurrencyException`.",
          "Al reintentar sobre el grupo nuevo, lanza `ReglaDeNegocioException`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "Assert.Throws<T>(() => …)",
          explicacion: "pasa si lo de adentro lanza una `T`, y te la devuelve.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El test del choque",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/ArbolDeEmpresas.cs`, dentro de la clase:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Dos_cambios_a_la_vez_chocan_en_el_grupo()",
            "{",
            "    var store = new InMemoryEventStore();",
            '    var s1 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g1 = s1.Get();   // petición 1',
            '    var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // petición 2',
            '    g1.AsignarMatriz("emp-a", "emp-b");',
            '    g2.AsignarMatriz("emp-b", "emp-a");                            // su grupo aún no tiene ciclo',
            "    s1.Append(g1);",
            "    Assert.Throws<ConcurrencyException>(() => s2.Append(g2));     // la misma versión del grupo",
            "",
            '    var g3 = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get();   // la petición 2 reintenta',
            '    Assert.Throws<ReglaDeNegocioException>(() => g3.AsignarMatriz("emp-b", "emp-a"));',
            "}",
          ],
        },
      ],
      luego: "Corre `dotnet test`: tiene que pasar.",
    },
    {
      tipo: "reto",
      titulo: "Un recorrido que siempre termina",
      tarea:
        "Si un ciclo ya entró al diario, `SubeHasta` tiene que fallar con un mensaje en vez de colgarse.",
      pasos: [
        "En el `SubeHasta` del grupo, anota en un `HashSet<string> vistos` cada empresa que visitas.",
        "Si `vistos.Add(actual)` da `false`, ya diste la vuelta: lanza `InvalidOperationException` con «ciclo» en el mensaje.",
        "Copia el test de la lámina siguiente en `ArbolDeEmpresas.cs` y corre `dotnet test`.",
      ],
      logro: {
        items: [
          "La historia con ciclo falla con `InvalidOperationException`, en vez de colgarse.",
          "`dotnet test` pasa entero.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "HashSet<string>",
          explicacion:
            "un conjunto sin repetidos. `Add` devuelve `false` si ya estaba.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El test del ciclo",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/ArbolDeEmpresas.cs`, dentro de la clase. Hoy se cuelga, como el del dolor:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Una_historia_con_ciclo_falla_al_recorrerla()",
            "{",
            "    var g = new GrupoEmpresarial();",
            "    g.Load(new object[] {",
            '        new MatrizAsignada("emp-a", "emp-b"),',
            '        new MatrizAsignada("emp-b", "emp-a") });',
            "",
            '    var ex = Assert.Throws<InvalidOperationException>(() => g.AsignarMatriz("emp-c", "emp-a"));',
            '    Assert.Contains("ciclo", ex.Message);',
            "}",
          ],
        },
      ],
      luego: "Corre `dotnet test`: tiene que pasar, sin colgarse.",
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un recorrido que siempre termina",
      piezas: [
        {
          etiqueta: "En `GrupoEmpresarial`, el `SubeHasta` que anota lo visitado",
          lenguaje: "csharp",
          lineas: [
            "private bool SubeHasta(string desde, string buscada)",
            "{",
            "    var vistos = new HashSet<string>();",
            "    string? actual = desde;",
            "    while (actual is not null)",
            "    {",
            "        if (actual == buscada) return true;",
            "        if (!vistos.Add(actual))   // ya pasaste por aquí: es un ciclo",
            '            throw new InvalidOperationException($"La jerarquía ya tiene un ciclo en {actual}.");',
            "        actual = _matrizDe.GetValueOrDefault(actual);",
            "    }",
            "    return false;",
            "}",
          ],
        },
      ],
      nota: "La excepción no arregla el ciclo: lo hace visible. Una petición que falla con un mensaje se investiga.",
    },
    {
      tipo: "rompelo",
      titulo: "Una frontera que no alcanza",
      tarea:
        "Pon la petición 2 en otro grupo y mira si el choque sigue protegiendo el árbol.",
      pasos: [
        'En `Dos_cambios_a_la_vez_chocan_en_el_grupo`, abre la petición 2 sobre `"grupo-sur"` en vez de `"grupo-andes"`.',
        "Corre `dotnet test`.",
        'Devuelve `"grupo-andes"`.',
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.Throws() Failure: No exception was thrown"],
        },
        items: [
          "Los dos `Append` entran, cada uno en su stream. Cada grupo, solo, está sano; el árbol no.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La versión de un stream protege lo que vive en ese stream. Elegir la frontera es elegir qué reglas puedes garantizar, y su precio es que todo cambio al árbol pasa por **un solo stream**.",
      puntos: [
        {
          termino: "Frontera de consistencia",
          definicion:
            "El stream que reúne todo lo que una regla mira. Aquí, `GrupoEmpresarial`.",
        },
        {
          termino: "Anotar lo visitado",
          definicion:
            "Lo que recorre datos se defiende de ellos: falla con un mensaje en vez de colgarse.",
        },
      ],
      decision:
        "La jerarquía de un grupo vive en un solo stream (`grupo-…`): «sin ciclos» mira el árbol entero, y solo la versión de ese stream hace chocar dos cambios a la vez. Todo recorrido del árbol anota lo visitado.",
      commit: {
        mensaje: "ES · El árbol de empresas",
        preguntas: [
          "¿Por qué la versión de cada empresa no impidió el ciclo? ¿Qué pierdes con todo el árbol en un stream?",
        ],
      },
      siguiente: {
        seccion: "25 · La rama entera",
        texto:
          "Inactivar una matriz con toda su rama de un golpe. ¿Y si el árbol cambia mientras la recorres?",
      },
    },
  ],
};
