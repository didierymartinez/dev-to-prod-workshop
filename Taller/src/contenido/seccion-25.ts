// Fuente: workshop-event-sourcing/taller.md, entrada "25 · La rama entera".
import type { Seccion } from "./tipos";

export const seccion25: Seccion = {
  numero: 25,
  titulo: "La rama entera",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Inactivar una matriz con todas sus filiales sin que una filial que entra a la vez quede activa, **decidiendo la inactivación dentro del grupo**.",
    },
    {
      tipo: "planteamiento",
      titulo: "Inactivar una rama",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Inactivar una **rama** es inactivar una matriz y todo lo que cuelga de ella.",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "El grupo nos da la lista de la rama.",
            "Cada empresa guarda su inactivación en **su** stream.",
          ],
        },
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Qué protege esa lista mientras escribimos?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La rama, empresa por empresa",
      tarea:
        "Copia el código del dolor: el grupo da la lista de la rama, y cada empresa guarda su inactivación. Luego córrelo.",
      pasos: [
        "En tu `GrupoEmpresarial` y en tu `Empresa`, el código de la lámina «La lista y la inactivación».",
        "En `Empresas.Tests/LaRamaEntera.cs`, el test de la lámina «Mientras recorres la rama».",
        "Corre `dotnet test`.",
      ],
      logro: {
        items: [
          "Rojo: el test de la rama falla, sin ningún error en el camino.",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La lista y la inactivación",
      piezas: [
        {
          etiqueta:
            "En `GrupoEmpresarial`: la raíz, más cada filial que sube hasta ella.",
          lenguaje: "csharp",
          lineas: [
            "public List<string> Rama(string raiz)",
            "{",
            "    var rama = new List<string> { raiz };",
            "    foreach (var filial in _matrizDe.Keys)",
            "        if (filial != raiz && SubeHasta(filial, raiz)) rama.Add(filial);",
            "    return rama;",
            "}",
          ],
        },
        {
          etiqueta:
            "El hecho, que va al stream de cada empresa, y en tu `Empresa`:",
          lenguaje: "csharp",
          lineas: [
            "public record EmpresaInactivada();",
            "",
            "public bool Inactiva { get; private set; }",
            "//   en Aplicar → case EmpresaInactivada: Inactiva = true; break;",
            "public void Inactivar() => Emitir(new EmpresaInactivada());",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "Mientras recorres la rama",
      piezas: [
        {
          etiqueta:
            "En `Empresas.Tests/LaRamaEntera.cs`, dentro de `public class LaRamaEntera { … }`. Otra petición pone `emp-d` bajo `emp-b`:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Inactivar_desde_una_foto_inactiva_toda_la_rama()",
            "{",
            "    var store = new InMemoryEventStore();",
            '    var s = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g = s.Get();',
            '    g.AsignarMatriz("emp-b", "emp-a"); s.Append(g);',
            '    var rama = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get().Rama("emp-a");   // emp-a, emp-b',
            '    var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // otra petición',
            '    g2.AsignarMatriz("emp-d", "emp-b"); s2.Append(g2);',
            "    foreach (var id in rama)",
            "    {",
            "        var se = store.AbrirStream<Empresa>(id); var e = se.Get();",
            "        e.Inactivar(); se.Append(e);",
            "    }",
            '    Assert.True(store.AbrirStream<Empresa>("emp-d").Get().Inactiva);',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La lista fue una foto",
      bloques: [
        {
          k: "tabla",
          columnas: ["Empresa", "Matriz", "Estado"],
          filas: [
            ["emp-a", "—", "inactiva"],
            ["emp-b", "emp-a", "inactiva"],
            ["emp-d", "emp-b", "activa"],
          ],
        },
        {
          k: "texto",
          tam: "tenue",
          junto: true,
          texto: "`emp-d` quedó activa bajo `emp-b`, sin un solo error.",
        },
        {
          k: "respuesta",
          texto:
            "La lista de la rama fue una **foto**: el grupo de ese momento.",
        },
        {
          k: "texto",
          texto:
            "Escribió en cada empresa, no en el grupo: ahí cada versión era legal.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Inactivar es un hecho del grupo",
      tarea:
        "Decide y guarda la inactivación dentro del grupo, para que lo que cambie el árbol a la vez la haga chocar.",
      pasos: [
        "En `GrupoEmpresarial`: el hecho `RamaInactivada(string Raiz, IReadOnlyList<string> Empresas)`, que va al stream del grupo, e `InactivarRama(raiz)`, que lo emite con `Rama(raiz)`.",
        "Vuelve `Rama` privada. Borra `EmpresaInactivada`, su `case`, `Inactiva`, `Inactivar` y el test del dolor.",
        "Copia el test de la lámina siguiente en `LaRamaEntera.cs` y córrelo hasta que pase.",
      ],
      logro: {
        items: [
          "La inactivación que guarda tarde lanza `ConcurrencyException`.",
          "Al reintentar, su rama incluye a `emp-d`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "El hecho lleva la lista: **a quién alcanza** es parte de la decisión.",
        },
        {
          k: "nota",
          texto: "Fuera del grupo, la lista de la rama es otra foto.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El test de la carrera",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/LaRamaEntera.cs`, dentro de la clase:",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void La_filial_que_entra_a_la_vez_cae_en_la_rama()",
            "{",
            "    var store = new InMemoryEventStore();",
            '    var s = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g = s.Get();',
            '    g.AsignarMatriz("emp-b", "emp-a"); s.Append(g);',
            '    var s1 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g1 = s1.Get();   // petición 1',
            '    var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // petición 2',
            '    g1.InactivarRama("emp-a");',
            '    g2.AsignarMatriz("emp-d", "emp-b"); s2.Append(g2);           // entra primero',
            "    Assert.Throws<ConcurrencyException>(() => s1.Append(g1));    // decidió sobre un grupo viejo",
            '    var g3 = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get();   // la petición 1 reintenta',
            '    g3.InactivarRama("emp-a");',
            "    Assert.Contains(g3.SinConfirmar,",
            '        h => h is RamaInactivada r && r.Empresas.Contains("emp-d"));',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Inactivar es un hecho del grupo",
      piezas: [
        {
          etiqueta: "El hecho nuevo",
          lenguaje: "csharp",
          lineas: [
            "public record RamaInactivada(string Raiz, IReadOnlyList<string> Empresas);   // va al stream del grupo",
          ],
        },
        {
          etiqueta: "En `GrupoEmpresarial`: el verbo, y `Rama` ahora privada",
          lenguaje: "csharp",
          lineas: [
            "public void InactivarRama(string raiz) => Emitir(new RamaInactivada(raiz, Rama(raiz)));",
            "",
            "private List<string> Rama(string raiz) { /* el mismo cuerpo de antes */ }",
          ],
        },
      ],
      nota: "El reintento carga el grupo que ya tiene a `emp-d`, así que su rama la incluye.",
    },
    {
      tipo: "reto",
      titulo: "Bajo una matriz inactiva no entra nadie",
      tarea:
        "Que el grupo rechace una filial nueva bajo una matriz inactiva.",
      pasos: [
        "En `GrupoEmpresarial`, un `HashSet<string> _inactivas`, y en `Aplicar` un `case RamaInactivada` que le agrega cada empresa.",
        "Al inicio de `AsignarMatriz`, `ReglaDeNegocioException` si la matriz está en `_inactivas`.",
        "El test de abajo, en `LaRamaEntera.cs`.",
      ],
      logro: {
        items: [
          "Bajo una matriz inactiva no entra ninguna filial.",
          "`dotnet test` pasa entero.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "[Fact]",
          "public void Bajo_una_matriz_inactiva_no_entra_una_filial()",
          "{",
          "    var g = new GrupoEmpresarial();",
          '    g.AsignarMatriz("emp-b", "emp-a");',
          '    g.InactivarRama("emp-a");',
          '    Assert.Throws<ReglaDeNegocioException>(() => g.AsignarMatriz("emp-d", "emp-b"));',
          "}",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Bajo una matriz inactiva no entra nadie",
      piezas: [
        {
          etiqueta: "En `GrupoEmpresarial`, el conjunto de inactivas",
          lenguaje: "csharp",
          lineas: ["private readonly HashSet<string> _inactivas = new();"],
        },
        {
          etiqueta: "En su `Aplicar`, un `case` más",
          lenguaje: "csharp",
          lineas: [
            "case RamaInactivada r: foreach (var e in r.Empresas) _inactivas.Add(e); break;",
          ],
        },
        {
          etiqueta: "Al inicio de `AsignarMatriz`",
          lenguaje: "csharp",
          lineas: [
            "if (_inactivas.Contains(matriz))",
            '    throw new ReglaDeNegocioException($"{matriz} está inactiva: no recibe filiales.");',
          ],
        },
      ],
      nota: "Ahora una filial nueva o trasladada valida el estado de su matriz, y el reintento de la carrera también se rechaza.",
    },
    {
      tipo: "rompelo",
      titulo: "Quita la guarda de la matriz",
      tarea:
        "Borra la guarda que rechaza una matriz inactiva y mira qué test lo nota.",
      pasos: [
        "En `AsignarMatriz`, borra el `if (_inactivas.Contains(matriz))` con su `throw`.",
        "Corre `dotnet test`.",
        "Deshaz el cambio.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.Throws() Failure: No exception was thrown"],
        },
        items: [
          "Cae el test de la matriz inactiva: `emp-d` entra activa bajo `emp-b`, que está inactiva.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un acto sobre toda una rama tiene la frontera de la regla que protege: se decide **dentro del grupo**, no sobre una foto, y cada filial nueva valida su matriz.",
      puntos: [
        {
          termino: "La lista es una foto",
          definicion:
            "Leída afuera, nada la protege mientras escribes en otros streams.",
        },
        {
          termino: "El hecho guarda lo decidido",
          definicion:
            "`RamaInactivada` lleva la lista que alcanzó. `Aplicar` solo la anota.",
        },
      ],
      decision:
        "Un acto sobre una rama se decide dentro del grupo y se guarda como un hecho del grupo, con la lista que decidió. Bajo una matriz inactiva no entra una filial.",
      commit: {
        mensaje: "ES · La rama entera",
        preguntas: [
          "¿Por qué inactivar cada empresa en su stream dejó pasar a `emp-d`? ¿Qué pierde `Empresa` ahora que no sabe que está inactiva?",
        ],
      },
      siguiente: {
        seccion: "26 · La forma del hecho se congela",
        texto:
          "Las empresas viejas, en Postgres, no tienen `Nit`.",
      },
    },
  ],
};
