// Fuente: workshop-event-sourcing/taller.md, entrada "65 · La plantilla se prueba".
import type { Seccion } from "./tipos";

export const seccion65: Seccion = {
  numero: 65,
  titulo: "La plantilla se prueba",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Probar las reglas de la empresa **en memoria**, con un doble que rehidrata como Marten, y fijar ese doble contra Postgres con un **test de contrato**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Tus tests de reglas siguen comentados desde el swap: rehidrataban con `Load`, que ya no existe.",
        },
        {
          k: "texto",
          texto:
            "La plantilla solo se probó a ojo: un bloque en `Program.cs` y una consulta en `psql`.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Para saber si un pago repetido entra no hace falta una base. Basta un doble en memoria.",
        },
        {
          k: "respuesta",
          texto:
            "Pero el verde del doble vale lo que se parezca a Marten. ¿Cómo lo compruebas?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El doble en memoria",
      tarea:
        "Escribe un doble que rehidrate cualquier agregado en memoria, con los mismos `Apply` que ve Marten.",
      pasos: [
        "Borra los tests de reglas que comentaste en el swap: los reemplazan los de hoy.",
        "En `Empresas.Tests`, una clase `static` `EnMemoria` con `Rehidratar<T>(string id, params object[] hechos) where T : AggregateRoot, new()`.",
        "Crea el agregado, le pone el `Id` y le aplica cada hecho con su `Apply` público. Si un hecho no tiene `Apply`, lo salta.",
      ],
      logro: { items: ["`Empresas.Tests` compila con tu `EnMemoria`."] },
      tips: [
        {
          k: "nota",
          texto:
            "🆕 Marten 9 solo ve los `Apply` **públicos**, también los heredados. Uno privado se salta sin aviso; si todos lo son, sale `InvalidProjectionException`.",
        },
        {
          k: "nuevo",
          idioma: "reflexión",
          explicacion:
            '`GetMethod("Apply", [tipo])` busca el método y `Invoke` lo llama. `GetProperty("Id")!.SetValue` pone el `Id`, aunque su `set` sea `protected`.',
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La regla, sin base",
      tarea:
        "Prueba en memoria que un pago repetido no se registra dos veces.",
      pasos: [
        "En `Empresas.Tests`, una clase `ReglasDeEmpresa`, **fuera** de la colección `\"host\"`: no toca la base.",
        "Un `[Fact]` con el test de abajo.",
        "Corre `dotnet test --filter ReglasDeEmpresa`.",
      ],
      logro: {
        items: [
          "Pasa en verde **sin** `CADENA_POSTGRES`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var e = EnMemoria.Rehidratar<Empresa>("emp-1",',
          '    new EmpresaRegistrada("900", "Andes", "Básico"),',
          '    new PagoRegistrado(50000, "BANCO-0044"));   // dado: ese pago ya entró',
          'e.RegistrarPago(50000, "BANCO-0044");           // cuando: el banco lo avisa otra vez',
          "Assert.Empty(e.SinConfirmar);                   // entonces: no registra nada",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El contrato del doble",
      tarea:
        "Prueba que tu doble rehidrata igual que Marten: el mismo dado y el mismo cuando a los dos, y compara lo que queda.",
      pasos: [
        "`ContratoDelDoble` en la colección `\"host\"`, con el `IDocumentStore` de `app.Services`.",
        "El dado: un hecho por cada `Apply` de `Empresa`. Guárdalo con `StartStream` en un id nuevo, `$\"emp-{Guid.NewGuid():N}\"`.",
        "Rehidrata con `AggregateStreamAsync` y con el doble, dales a los dos el pago repetido y compáralos.",
      ],
      logro: { items: ["`ContratoDelDoble` corre contra Postgres."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Assert.Equivalent",
          explicacion:
            "compara las propiedades públicas, una a una. Los campos privados no los mira.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "var deMarten = await s.Events.AggregateStreamAsync<Empresa>(id);",
          "var delDoble = EnMemoria.Rehidratar<Empresa>(id, dado);",
          "// … el mismo cuando, a los dos …",
          "Assert.Equivalent(deMarten, delDoble);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Lo que el contrato encontró",
      tarea:
        "La primera corrida del contrato cae. Arréglalo **en el doble**, no en el test.",
      pasos: [
        "Corre `dotnet test` y lee qué propiedad no coincide.",
        "En `Rehidratar`, antes del `return`: `typeof(T).GetProperty(\"Version\")?.SetValue(a, hechos.Length);`",
        "Corre `dotnet test` otra vez.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            "Assert.Equivalent() Failure: Mismatched value on member 'Version'",
            "Expected: 8",
            "Actual:   0",
          ],
        },
        items: ["Con la línea de `Version`, `ContratoDelDoble` pasa."],
      },
    },
    {
      tipo: "reto",
      titulo: "Un nombre fuera del Apply",
      tarea:
        "Haz que un verbo asigne estado por su cuenta, fuera del `Apply`, y mira si algún test lo nota.",
      pasos: [
        "En `Empresa.Registrar`, crea la empresa con `new Empresa { Id = id, Nombre = nombre }`.",
        "Quita `Nombre = e.Nombre` de tu `Apply(EmpresaRegistrada)`.",
        "Corre `dotnet test`. Deja el cambio puesto.",
      ],
      logro: { items: ["Todo sigue en verde, también el contrato."] },
      tips: [
        {
          k: "piensa",
          texto:
            "Marten y el doble rehidratan igual: los dos sin nombre. ¿Qué compara el contrato, y qué no?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La foto",
      tarea:
        "Prueba que lo que deja un verbo es lo mismo que dejan sus hechos al rehidratar.",
      pasos: [
        "En `ReglasDeEmpresa`, `Foto(AggregateRoot a)`: un texto con `Propiedad=valor` por cada propiedad pública, sin `Version` ni `SinConfirmar`.",
        "El test `Registrar_deja_lo_mismo_que_sus_hechos`, con el código de abajo. Corre `dotnet test`.",
        "Deshaz el cambio del nombre y corre otra vez: pasa.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.Equal() Failure: Strings differ"],
        },
        items: ["Una foto tiene `Nombre= ` y la otra `Nombre=Andes`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "GetProperties()",
          explicacion:
            "todas las propiedades públicas; `p.GetValue(objeto)` lee cada valor.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var nueva = Empresa.Registrar("emp-1", "900", "Andes", "Básico");',
          'var rehidratada = EnMemoria.Rehidratar<Empresa>("emp-1", nueva.SinConfirmar.ToArray());',
          "Assert.Equal(Foto(rehidratada), Foto(nueva));",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Un Apply privado",
      tarea:
        "Haz privado el `Apply(PagoRegistrado)` de tu `Empresa` y mira qué test lo nota.",
      pasos: [
        "En `Empresa`, cambia `public` por `private` en `Apply(PagoRegistrado)`.",
        "Corre `dotnet test`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: ["Assert.Empty() Failure: Collection was not empty"],
        },
        items: [
          "`ContratoDelDoble` pasa, y `ReglasDeEmpresa` cae.",
          "`CarreraDelPagoTests` también cae: ese rojo es el de producción.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El doble que ve de más",
      tarea:
        "Con el `Apply` todavía privado, haz que el doble vea también los privados, y mira qué pasa con cada test.",
      pasos: [
        "En `EnMemoria.cs`, agrega `using System.Reflection;` arriba.",
        "En su `GetMethod`, pasa `BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance` antes del arreglo de tipos. Corre `dotnet test`.",
        "Deshaz los dos cambios: el `Apply` vuelve a público, y el doble a solo los públicos.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            "Assert.Equivalent() Failure: Collection value not found in member 'SinConfirmar'",
          ],
        },
        items: [
          "La regla pasa en falso, y el contrato cae.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La plantilla se prueba como una librería: un doble que rehidrata con los `Apply` públicos, un contrato que lo fija contra Postgres y una foto.",
      puntos: [
        {
          termino: "Doble fiel",
          definicion:
            "Rehidrata en memoria con lo mismo que ve Marten: los `Apply` públicos, el `Id` y la `Version`.",
        },
        {
          termino: "Test de contrato",
          definicion:
            "El mismo dado y el mismo cuando, en el doble y en Marten. Si el doble deja de parecerse, cae.",
        },
        {
          termino: "La foto",
          definicion:
            "Comprueba que solo los `Apply` cambian el estado.",
        },
      ],
      commit: {
        mensaje: "ES · La plantilla se prueba",
        preguntas: [
          "¿Por qué tu doble no busca los `Apply` privados, si Marten 8 sí los veía?",
          "¿Qué atrapa la foto que el contrato no ve?",
        ],
      },
      siguiente: {
        seccion: "66 · El README que compila",
        texto:
          "Quien adopte la plantilla no va a leer primero sus tests: va a leer su README, y la plantilla todavía no tiene uno.",
      },
    },
  ],
};
