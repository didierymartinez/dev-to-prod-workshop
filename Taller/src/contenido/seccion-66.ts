// Fuente: workshop-event-sourcing/taller.md, entrada "66 · El README que compila".
import type { Seccion } from "./tipos";

export const seccion66: Seccion = {
  numero: 66,
  titulo: "El README que compila",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Darle a la plantilla un README que no envejezca: sin código ni versiones, que diga **cuándo no usarla** y que señale un ejemplo de uso que es un **test**.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Quien agregue `Pago` el mes que viene no construyó la plantilla. Va a empezar por el README.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Si el ejemplo vive en el README, ¿quién se entera el día que deja de compilar?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Los README de la organización",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Los README de la librería dicen Marten 8.23 y Wolverine 5.18. Su código va en 9.18 y 6.21.",
            "Sus ejemplos no compilan contra la API que documentan.",
            "El README de otra librería viaja dentro de su paquete NuGet, y describe tipos que ya no existen.",
          ],
        },
        {
          k: "respuesta",
          texto: "Ninguno de esos errores rompe un build.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El README de la plantilla",
      piezas: [
        {
          etiqueta:
            "Cópialo en un `README.md`, en la raíz de tu repositorio. La última línea la escribes tú:",
          lenguaje: "csharp",
          lineas: [
            "# La plantilla",
            " ",
            "Un agregado hereda `AggregateRoot` y declara sus hechos, sus `Apply` y sus verbos. `MartenUnitOfWork`",
            "lo guarda: abre los streams que nacen, hace crecer los que existen y confirma todo en una transacción.",
            " ",
            "- **Cómo se usa:** `Empresas.Tests/ComoUsarLaPlantilla.cs`. Es un test: si una firma cambia, no",
            "  compila; si una regla cambia, cae.",
            "- **Los `Apply`, públicos:** Marten no ve los privados. `ContratoDelDoble` compara el doble con",
            "  Marten; un agregado nuevo suma ahí su dado.",
            "- **Al nacer una empresa:** el `Insert` de su `Localizador`, en la misma sesión, antes de confirmar.",
            "- **Versiones:** las de `Empresas.Historia/Empresas.Historia.csproj`. Este README no las repite.",
            "- **Cuándo no usarla:** …",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cuándo no usarla",
      tarea:
        "Escribe la última línea del README: cuándo un dato no merece la plantilla.",
      pasos: [
        "Responde las dos preguntas de ¿Merecía event sourcing?, con el catálogo `planes` de ejemplo.",
        "Agrega que ese servicio no llama a `Hechos.Registrar` ni a `AddAsyncDaemon`.",
      ],
      logro: {
        items: [
          "Tu README dice qué es la plantilla, qué cuidar, dónde están las versiones y cuándo no usarla.",
          "No tiene bloques de código ni números de versión.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El ejemplo es un test",
      tarea:
        "Escribe el ejemplo que señala el README como un test que nace, crece y comprueba lo que el README promete.",
      pasos: [
        "`ComoUsarLaPlantilla` en la colección `\"host\"`. En una sesión de acme, la empresa nace con la plantilla y su `Localizador`, y confirmas.",
        "En otra sesión, la cargas, llamas dos veces `RegistrarPago` con `BANCO-0044` y confirmas.",
        "En una tercera sesión, `q`, las dos comprobaciones de abajo.",
      ],
      logro: {
        items: ["`dotnet test` pasa en verde **dos veces seguidas**."],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Id y NIT nuevos en cada corrida: `$\"nit-{id}\"`. Con un NIT fijo, la segunda corrida choca.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "Assert.Equal(id, await Localizador.StreamDe(q, nit));          // el NIT encuentra su stream",
          "Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);  // el registro y un solo pago",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El README que miente",
      tarea:
        "Cambia una firma de la plantilla y mira quién te avisa.",
      pasos: [
        "En tu `MartenUnitOfWork`, cambia el nombre de `Cargar` a `Obtener`.",
        "Corre `dotnet build` en `Empresas.Historia`, y luego `dotnet test`.",
        "Deshaz el cambio.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test",
          tono: "error",
          salida: [
            'ComoUsarLaPlantilla.cs(26,31): error CS1061: "MartenUnitOfWork" no contiene una definición para "Cargar" …',
          ],
        },
        items: [
          "`Empresas.Historia` compila: nada en él llama a `Cargar`.",
          "En inglés: 'MartenUnitOfWork' does not contain a definition for 'Cargar'.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El README no lleva lo que envejece. Dice qué es la plantilla, qué cuidar y cuándo no usarla, y señala un ejemplo que es un test.",
      puntos: [
        {
          termino: "Documentación ejecutable",
          definicion:
            "El ejemplo vive en un test: deja de compilar si cambia una firma, y cae si cambia una regla.",
        },
        {
          termino: "Cuándo no usarla",
          definicion:
            "La decisión de ¿Merecía event sourcing?, escrita donde la lee quien adopta la plantilla.",
        },
      ],
      commit: {
        mensaje: "ES · El README que compila",
        preguntas: [
          "¿Por qué tu README no trae ejemplo ni versión de Marten?",
          "Al cambiar el nombre de `Cargar`, ¿qué te avisó, y qué te habría avisado con el ejemplo escrito en el README?",
        ],
      },
      siguiente: {
        seccion: "67 · La plantilla dentro del handler",
        texto:
          "La plantilla guarda bien donde tú confirmas. Dentro de un handler confirma Wolverine, al final del mensaje.",
      },
    },
  ],
};
