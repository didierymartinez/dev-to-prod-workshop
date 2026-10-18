// Fuente: workshop-event-sourcing/taller.md, entrada "14 · El nombre del hecho es un contrato".
import type { Seccion } from "./tipos";

export const seccion14: Seccion = {
  numero: 14,
  titulo: "El nombre del hecho es un contrato",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Dar a cada evento un **nombre estable** en disco, aparte del nombre de su clase, para que renombrar una clase no deje ilegible la historia.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "Renombrar una clase es un clic en el IDE.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Con el diario en disco, ese clic puede **borrarnos el pasado**.",
        },
        {
          k: "texto",
          tam: "tenue",
          texto: "Hoy cada línea del `.log` lleva `GetType().Name`:",
        },
        {
          k: "codigo",
          lenguaje: "csharp",
          junto: true,
          lineas: [
            '{"Version":2,"Tipo":"PlanCambiado","Datos":{"NuevoPlan":"Enterprise"}}',
          ],
        },
        {
          k: "texto",
          texto:
            "Renombras `PlanCambiado` a `PlanActualizado` y actualizas el mapa. ¿Y lo que ya está en disco?",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "La línea de ayer, el mapa de hoy",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'var lineaDeAyer = "{\\"Version\\":1,\\"Tipo\\":\\"PlanCambiado\\",\\"Datos\\":{\\"NuevoPlan\\":\\"Enterprise\\"}}";',
            'var mapaDeHoy = new Dictionary<string, Type> { ["PlanActualizado"] = typeof(PlanCambiado) };',
            "var d = JsonSerializer.Deserialize<EnDisco>(lineaDeAyer)!;",
            "var clase = mapaDeHoy[d.Tipo];",
          ],
        },
        {
          k: "terminal",
          comando: "dotnet run",
          tono: "error",
          salida: [
            "💥 KeyNotFoundException: The given key 'PlanCambiado' was not present in the dictionary.",
          ],
        },
        {
          k: "respuesta",
          texto:
            "Nadie olvidó nada, y el compilador no avisó.",
        },
        {
          k: "texto",
          texto:
            "El nombre en disco es una **promesa** que el código futuro debe cumplir. `GetType().Name` la ata a algo que cambiamos cuando queremos.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un nombre estable por hecho",
      tarea:
        "Rotula cada hecho en disco con un nombre que tú eliges y no cambia nunca, separado del nombre de su clase.",
      pasos: [
        'En tu `EventStore`, renombra el mapa a `_porNombre` y cambia sus llaves por nombres estables: `"empresa-registrada"`, `"plan-cambiado"`, `"empresa-suspendida"`, `"empresa-reactivada"`, `"pago-registrado"`.',
        "Agrega un método `NombreDe(Type tipo)` que recorra `_porNombre` y devuelva la llave de ese tipo.",
        "En `AppendEvent`, rotula con `NombreDe(sobre.EventData.GetType())` en vez de `GetType().Name`. `GetEvents` no cambia.",
      ],
      logro: {
        items: [
          'En disco, cada línea dirá `"Tipo":"plan-cambiado"`, no el nombre de la clase.',
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "Al escribir tienes el **tipo** del hecho, y el mapa va de nombre a clase. ¿Cómo sacas el nombre?",
        },
        {
          k: "nuevo",
          idioma: "foreach (var par in mapa)",
          explicacion:
            "recorre el diccionario entrada por entrada; cada `par` tiene `.Key` y `.Value`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Escribe de nuevo, y renombra",
      tarea:
        "Empieza el diario de cero con los nombres estables y comprueba que renombrar una clase ya no rompe la historia.",
      pasos: [
        "Borra la carpeta `datos/`: sus líneas viejas lanzan `KeyNotFoundException`. Corre `dotnet run` para volver a escribir la empresa.",
        "Renombra `PlanCambiado` con el IDE (cambia el `case` y los `new`). En `_porNombre`, cambia solo su `typeof`. Corre otra vez.",
      ],
      logro: {
        terminal: {
          comando: "cat datos/emp-7.log",
          tono: "ok",
          salida: [
            '{"Version":1,"Tipo":"empresa-registrada","Datos":{"Nombre":"Constructora Andes","Plan":"B\\u00E1sico"}}',
            '{"Version":2,"Tipo":"plan-cambiado","Datos":{"NuevoPlan":"Enterprise"}}',
          ],
        },
        items: [
          "Después de renombrar la clase, la empresa guardada antes **rehidrata igual**.",
        ],
      },
      tips: [
        {
          k: "piensa",
          texto:
            "¿Y si dejas las dos llaves, la vieja y la nueva? Para leer funciona, pero cada renombre suma otra llave para siempre.",
        },
      ],
    },
    {
      tipo: "aprendizaje",
      idea: "El nombre con que un hecho vive en disco es un **contrato permanente**, separado del nombre de la clase.",
      puntos: [
        {
          termino: "Nombre estable",
          definicion:
            "El que eliges para el disco y no cambias nunca. La clase la renombras libre: solo cambia su `typeof` en el mapa.",
        },
        {
          termino: "Tres pendientes",
          definicion:
            "El almacén conoce cada evento por su nombre. El nombre estable no protege la **forma** del evento. Y pagar-y-reactivar escribe dos líneas seguidas.",
        },
      ],
      commit: {
        mensaje: "ES · El nombre del hecho es un contrato",
        preguntas: [
          "¿Por qué el nombre en disco no puede ser el nombre de la clase? ¿Qué se rompe, y cuándo?",
        ],
      },
      siguiente: {
        seccion: "15 · Todo o nada: el diario en una base de datos real",
        texto:
          "Pagar-y-reactivar escribe dos líneas. Si el proceso muere entre la primera y la segunda, la empresa pagó y sigue suspendida.",
      },
    },
  ],
};
