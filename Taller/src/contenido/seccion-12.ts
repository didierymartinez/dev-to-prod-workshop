// Fuente: workshop-event-sourcing/taller.md, entrada "12 · Verde, y roto".
import type { Seccion } from "./tipos";

export const seccion12: Seccion = {
  numero: 12,
  titulo: "Verde, y roto",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Escribir el primer **test automatizado** del agregado y distinguir un test que **protege** de uno que pasa con el motor roto.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Cuando comentamos un `case`, el estado quedó mal y nada explotó.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "Escribamos un test que nos avise.",
        },
        { k: "texto", tam: "enorme", texto: "¿Nos va a avisar?" },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un proyecto de pruebas",
      tarea:
        "Crea un proyecto de tests enlazado a tu proyecto, y mira qué dice el test que trae la plantilla.",
      pasos: [
        "Desde la carpeta del `.git`, **no** dentro de `Empresas.Historia/`: los dos comandos del ejemplo.",
        "`cd Empresas.Tests`, abre `UnitTest1.cs` y corre `dotnet test`.",
        "Borra `UnitTest1.cs`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "ok",
          salida: [
            "Correctas! - Con error:     0, Superado:     1, Omitido:     0, Total:     1",
          ],
        },
        items: [
          "Verde, **sin afirmar nada**. En inglés: `Passed!`",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "[Fact]",
          explicacion:
            "un test de xUnit: prepara, ejecuta y afirma con `Assert`. Si se cumple, verde; si no, rojo. Las clases que pruebas deben ser `public`.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "dotnet new xunit -o Empresas.Tests",
          "dotnet add Empresas.Tests/Empresas.Tests.csproj reference Empresas.Historia/Empresas.Historia.csproj",
        ],
      },
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El test natural",
      piezas: [
        {
          etiqueta:
            "En un archivo nuevo, `Empresas.Tests/SuspensionTests.cs`: parto de una empresa registrada, la suspendo y miro si quedó suspendida.",
          lenguaje: "csharp",
          lineas: [
            "using Xunit;",
            "",
            "public class SuspensionTests",
            "{",
            "    [Fact]",
            "    public void Suspender_deja_la_empresa_suspendida()",
            "    {",
            "        var empresa = new Empresa();",
            '        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });  // dado',
            '        empresa.Suspender("falta de pago");                                        // cuando',
            "        Assert.True(empresa.Suspendida);                                           // entonces",
            "    }",
            "}",
          ],
        },
      ],
      luego:
        "Siembras con `Load` porque deja `SinConfirmar` vacío. Corre `dotnet test`: verde.",
    },
    {
      tipo: "reto",
      titulo: "El sabotaje",
      tarea: "Rompe el motor a propósito y mira si el test se entera.",
      pasos: [
        "En `Suspender` de `Empresa`, cambia `Emitir(...)` por `Aplicar(...)`.",
        "Desde `Empresas.Tests`, corre `dotnet test`.",
      ],
      logro: { items: ["Sigue **verde**."] },
    },
    {
      tipo: "planteamiento",
      titulo: "Verde, y roto",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "La suspensión ya no se emite: un `Append` no tendría nada que guardar. Y el test, verde.",
        },
        {
          k: "respuesta",
          texto: "El test miró el estado, y `Aplicar` lo cambia igual.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "No miró el **hecho** que se guarda.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Afirma el hecho",
      tarea:
        "Con el sabotaje todavía puesto, un segundo test que afirme lo que la empresa **emitió**.",
      pasos: [
        "En `SuspensionTests`: `[Fact] Suspender_emite_el_hecho`, con la misma preparación y la misma acción.",
        "Afirma con la línea del ejemplo y corre `dotnet test`: rojo.",
        "Restaura `Emitir` en `Suspender` y corre otra vez.",
      ],
      logro: {
        items: [
          "Con el sabotaje: el test de estado, verde; el de hechos, **rojo**.",
          "Con `Emitir` restaurado, todos verdes.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Afirma el hecho",
      piezas: [
        {
          etiqueta: "En `SuspensionTests`, el segundo test",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Suspender_emite_el_hecho()",
            "{",
            "    var empresa = new Empresa();",
            '    empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });',
            "",
            '    empresa.Suspender("falta de pago");',
            "",
            "    Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);",
            "}",
          ],
        },
      ],
      nota: "Con el sabotaje puesto, este test se pone **rojo**: `SinConfirmar` está vacío. Con `Emitir` restaurado, **verde**.",
    },
    {
      tipo: "rompelo",
      titulo: "El huérfano, con un test",
      tarea:
        "Comenta otra vez `case EmpresaReactivada:` en `Aplicar`: los dos tests siguen verdes. Agrega uno que tenga la reactivación en el dado.",
      pasos: [
        "Comenta `case EmpresaReactivada:` y corre `dotnet test`: verde.",
        "`Suspender_tras_reactivar_emite_el_hecho`. **Dado**: registrada, suspendida, `PagoRegistrado(500)`, reactivada. **Cuando**: suspender. **Entonces**: hay un `EmpresaSuspendida` sin confirmar.",
        "Corre: rojo. Restaura la línea: verde.",
      ],
      logro: {
        items: ["Solo el test con la reactivación en el dado se pone rojo."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Extra: borra `if (Suspendida) return;` de `Suspender`. Todo sigue verde: ningún test suspende dos veces. Ese test es tu siguiente reto.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "rompelo",
      titulo: "El huérfano, con un test",
      piezas: [
        {
          etiqueta: "En `SuspensionTests`: la reactivación, en el dado",
          lenguaje: "csharp",
          lineas: [
            "[Fact]",
            "public void Suspender_tras_reactivar_emite_el_hecho()",
            "{",
            "    var empresa = new Empresa();",
            "    empresa.Load(new object[]",
            "    {",
            '        new EmpresaRegistrada("Andes", "Básico"),',
            '        new EmpresaSuspendida("falta de pago"),',
            "        new PagoRegistrado(500),",
            "        new EmpresaReactivada(),                   // dado: ya volvió a estar activa",
            "    });",
            "",
            '    empresa.Suspender("incumplimiento de contrato");',
            "",
            "    Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);",
            "}",
          ],
        },
      ],
      nota: "Cada hecho merece al menos un test que lo tenga en el **dado**, con una decisión que dependa de él.",
    },
    {
      tipo: "aprendizaje",
      idea: "El resultado de una decisión son los hechos que emite: **afirma los hechos, no el estado**.",
      puntos: [
        {
          termino: "Dado–cuando–entonces",
          definicion:
            "Preparas una historia, ejecutas una acción y afirmas los hechos emitidos.",
        },
        {
          termino: "Verde, y roto",
          definicion:
            "Un test que mira el estado puede pasar con el motor roto.",
        },
      ],
      decision:
        "Mis tests afirman los **hechos emitidos** (`SinConfirmar`), no el estado en memoria: el estado es un intermedio de la rehidratación y puede pasar verde con el motor roto.",
      commit: {
        mensaje: "ES · Verde, y roto",
        preguntas: [
          "¿Por qué el test de `Suspendida` pasó verde sin el hecho? ¿Qué miraba y qué debía mirar?",
        ],
      },
      siguiente: {
        seccion: "13 · El diario en disco (y lo que se queda afuera)",
        texto:
          "Nada prueba que el diario sobreviva a un reinicio.",
      },
    },
  ],
};
