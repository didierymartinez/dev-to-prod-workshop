// Fuente: workshop-event-sourcing/taller.md, entrada "22 · El puerto propio".
import type { Seccion } from "./tipos";

export const seccion22: Seccion = {
  numero: 22,
  titulo: "El puerto propio",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Sacar una interfaz `IEventStore` con dos implementaciones, **Postgres y memoria**, para probar handlers sin contenedor. Y ver que el doble tiene que fallar donde falla Postgres.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Para probar que un handler suspende, hoy necesitas el contenedor arriba.",
        },
        {
          k: "texto",
          tam: "enorme",
          texto:
            "¿Por qué una regla de negocio depende de dónde se guardan los hechos?",
        },
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "`EventStream` y los handlers nombran el `EventStore` de Postgres.",
            "Un test de handler (cargar, suspender, guardar) no corre sin la base.",
            "El proyecto del dominio arrastra `Npgsql`.",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El puerto",
      tarea:
        "Declara la interfaz mínima que el dominio usa del almacén, y haz que tu almacén de Postgres la cumpla.",
      pasos: [
        "Al final del `Program.cs`, la interfaz `IEventStore` de abajo.",
        "Renombra tu `EventStore` a `PostgresEventStore` con el IDE, para que cambien también sus usos. Agrégale `: IEventStore`. Su cuerpo no cambia.",
      ],
      logro: { items: ["Compila, y `dotnet run` corre igual."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Puerto",
          explicacion:
            "una interfaz que el dominio posee: dice lo que necesita, no cómo se hace.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public interface IEventStore",
          "{",
          "    List<EventoAlmacenado> GetEvents(string id);",
          "    void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres);",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Todos dependen del puerto",
      tarea:
        "Que el dominio deje de nombrar el almacén concreto: todos reciben un `IEventStore`.",
      pasos: [
        "Saca `AbrirStream<T>` de `PostgresEventStore` a una clase `EventStoreExtensions`, como método de extensión sobre `IEventStore`.",
        "`EventStream<T>`, los handlers y el proyector reciben `IEventStore`, no el tipo concreto.",
      ],
      logro: {
        items: [
          "Solo el código que arma todo en `Program.cs` nombra `PostgresEventStore`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "this IEventStore store",
          explicacion:
            "como primer parámetro, hace un método de extensión: se llama como si fuera de la interfaz.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "public static class EventStoreExtensions",
          "{",
          "    public static EventStream<T> AbrirStream<T>(this IEventStore store, string id)",
          "        where T : AggregateRoot, new() => new(store, id);",
          "}",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un doble en memoria",
      tarea:
        "Escribe un almacén en memoria con las mismas garantías que Postgres, y prueba tus handlers contra él, sin contenedor.",
      pasos: [
        "`InMemoryEventStore : IEventStore`, con un `Dictionary<string, List<EventoAlmacenado>>` por dentro.",
        "En `Guardar`: si llega una `Version` que ese id ya tiene, lanza tu `ConcurrencyException`.",
        "En `Empresas.Tests/`, tus tests de handlers contra `new InMemoryEventStore()`. Uno de dos escrituras concurrentes: dos `Get()` de la misma versión y dos `Append`.",
      ],
      logro: {
        items: [
          "Los tests de handlers corren **sin contenedor**.",
          "En el de dos escrituras, el segundo `Append` lanza `ConcurrencyException`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "`ConcurrencyException` es la que ya tienes: reúsala, no la redefinas.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "Un doble que miente",
      tarea:
        "Quita del doble el chequeo de versión y corre el test de dos escrituras.",
      pasos: [
        "En `InMemoryEventStore.Guardar`, quita el `if (_d[id].Any(x => x.Version == s.Version))` **y** el `throw` que lo sigue. Si quitas solo el `if`, el doble lanza siempre.",
        "Corre el test de dos escrituras.",
      ],
      logro: {
        items: [
          "Los dos `Append` pasan: **verde**.",
          "En Postgres, ese mismo caso choca. El doble ingenuo da **falso verde**.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El puerto da tests rápidos y libertad de motor, y **cobra dos cosas**: el doble debe tener las mismas garantías, y lo que la interfaz no expone nadie lo puede usar.",
      puntos: [
        {
          termino: "Puerto",
          definicion:
            "Una interfaz que el dominio posee: dice lo que necesita, no cómo.",
        },
        {
          termino: "Doble fiel",
          definicion:
            "Falla donde falla producción. Si no, el verde miente.",
        },
      ],
      commit: {
        mensaje: "ES · El puerto propio",
        preguntas: [
          "¿El doble y `PostgresEventStore` dan el mismo resultado ante dos escrituras concurrentes? ¿Por qué eso importa más que la velocidad?",
        ],
      },
      siguiente: {
        seccion: "23 · Dos streams, la misma clave",
        texto:
          "El negocio quiere identificar cada empresa por su NIT, sin dos iguales. La versión de un stream no alcanza para eso.",
      },
    },
  ],
};
