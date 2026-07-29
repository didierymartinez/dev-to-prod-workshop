# El puerto propio

Acabas de aprender a elegir cuándo **no** llevar diario. Ahora sale a cobrar un peso que arrastras desde que el diario se mudó a Postgres.

## 🎯 El Objetivo

Extraer un **puerto** —la interfaz mínima que tu dominio usa del almacén— con dos implementaciones: la de Postgres para producción y una en **memoria** para probar rápido. Y ver, de paso, qué te **cobra** la abstracción.

## 💥 El dolor: para probar una regla, arrancas una base de datos

Tu `EventStream` y tus handlers hablan con el `EventStore` concreto de Postgres. Así que cualquier prueba que rehidrate o guarde —un handler, un flujo de dos comandos— necesita un Postgres vivo. La suite tarda minutos, se pone *flaky* cuando el contenedor tarda, y el proyecto donde vive la `Empresa` arrastra una dependencia de `Npgsql` que no debería importarle: al dominio no le interesa **dónde** se guardan los hechos, solo que se guarden.

## 🔧 Paso 1 · Extrae la interfaz que de verdad usas

Mira qué le pide tu `EventStream` al almacén: **leer** los hechos de un id (`GetEvents`) y **guardar** los sobres (`Guardar`). Nada más. Eso es el puerto.

> 🆕 **Un puerto es una interfaz que el dominio posee.** Declaras lo que el dominio **necesita** (leer y guardar hechos), sin decir **cómo**. Quien lo cumpla —Postgres, memoria, lo que sea— es intercambiable. El dominio depende del puerto, no de Postgres.

> 🆕 **Un método de extensión** (`this IEventStore store` como primer parámetro) se **llama** como si fuera un método de la interfaz, aunque vive **fuera** de ella. Por eso puedes sacar `AbrirStream<T>` del store concreto a un método suelto: las dos implementaciones de `IEventStore` lo heredan sin repetirlo.

> 🛠️ **Inténtalo tú.** Declara `IEventStore` con los dos métodos que tu almacén usa por dentro: `List<EventoAlmacenado> GetEvents(string id)` y `void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)`. Haz que tu almacén de Postgres la implemente —solo añade `: IEventStore`, su cuerpo no cambia— y renómbralo a `PostgresEventStore` (ahora que va a tener un hermano). El `AbrirStream<T>` que tus handlers y tu proyector ya llaman pásalo a un **método de extensión sobre `IEventStore`** (así lo tienen las dos implementaciones, gratis). Y haz que `EventStream<T>`, los handlers y el proyector reciban un `IEventStore`, no el tipo concreto.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public interface IEventStore
{
    List<EventoAlmacenado> GetEvents(string id);
    void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres);
}

// AbrirStream ya no vive dentro del store concreto: es una extensión sobre el puerto,
// así toda implementación de IEventStore la hereda sin repetirla.
public static class EventStoreExtensions
{
    public static EventStream<T> AbrirStream<T>(this IEventStore store, string id)
        where T : AggregateRoot, new() => new(store, id);
}

public class PostgresEventStore : IEventStore { /* el cuerpo que ya tenías, intacto */ }

// EventStream, handlers y proyector dependen del puerto: en EventStream solo cambia el tipo
// del campo/constructor de EventStore a IEventStore — el _version y el resto quedan igual.
```

Tu `Empresa` nunca tocó `Npgsql`; lo que cambia ahora es que `EventStream`, los handlers y el proyector dejan de nombrar el **almacén concreto** y solo conocen `IEventStore`. Eso desacopla tu dominio de Postgres: podrías moverlo a su propio proyecto sin arrastrar `Npgsql`, y cambiar de motor es cambiar **una** clase.

</details>

## 🔧 Paso 2 · Un doble en memoria para los tests

Ya tuviste un almacén en memoria: el `Dictionary` del motor a mano, antes de Postgres. Su firma era otra (`AppendEvent` de a un sobre), así que no lo copias: **reescribes esa idea** con la firma del puerto (`Guardar` de una lista).

> 🛠️ **Inténtalo tú.** Escribe `InMemoryEventStore : IEventStore` con un `Dictionary<string, List<EventoAlmacenado>>` por dentro. **Clave:** haz que **rechace una versión ya ocupada** igual que Postgres — si llega un sobre con una `Version` que ese id ya tiene, lanza el `ConcurrencyException` de [Concurrencia optimista](./concurrencia-optimista.md). Luego mueve tus tests de reglas y de handlers a usarlo (en vez de Postgres) y mídelos: pasan **sin contenedor**, al instante.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public class InMemoryEventStore : IEventStore
{
    readonly Dictionary<string, List<EventoAlmacenado>> _d = new();
    public List<EventoAlmacenado> GetEvents(string id) => _d.TryGetValue(id, out var l) ? new(l) : new();
    public void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)
    {
        if (!_d.ContainsKey(id)) _d[id] = new();
        foreach (var s in sobres)
        {
            if (_d[id].Any(x => x.Version == s.Version))          // ← la MISMA garantía que el PRIMARY KEY de Postgres
                throw new ConcurrencyException($"versión {s.Version} ya ocupada en '{id}'");
            _d[id].Add(s);
        }
    }
}
```

`grep -r "Npgsql" Dominio/` sale vacío, y la suite de reglas corre sin Docker.

</details>

## 🔨 El cobro: un doble que miente

Fíjate en esa línea marcada. Es tentador ahorrártela —un doble más simple, sin chequear versiones, guarda y ya—. Pruébalo: quítala y corre un test de **dos escrituras concurrentes** sobre la misma empresa (dos `Get()` de la misma versión, dos `Append`).

- Con la línea (doble **fiel**): el segundo `Append` lanza `ConcurrencyException` — igual que Postgres con su `PRIMARY KEY`.
- Sin la línea (doble **ingenuo**): los dos pasan. **Verde.** Pero en producción, sobre Postgres, ese mismo caso choca. Tu test dijo que estaba bien; mentía.

Un doble que no replica las garantías de producción no acelera: **te da falso verde**, justo el problema de [Verde, y roto](./verde-y-roto.md). El doble tiene que fallar donde producción falla.

## El Descubrimiento

Una abstracción no es gratis. Te devuelve dos cosas: tests rápidos y libertad para cambiar de motor. Y te **cobra** dos: el doble tiene que sostener las **mismas garantías** que producción, o el verde miente; y lo que la interfaz **no expone**, ningún consumidor puede usarlo — el puerto es el **techo de capacidad**. La pregunta de mantenedor no es "¿tengo un puerto?", sino "¿qué le dejé pasar, y quién lo va a notar?".

> 🌱 **Semilla — el techo de capacidad, sentido.** Intenta pedirle a tu `IEventStore` que guarde *esperando que el stream vaya en la versión 4*: **no hay método para eso** — la concurrencia vive escondida dentro del `Append`, no la puedes pedir explícitamente. Lo que el puerto no expone, nadie lo usa. Y ese `PostgresEventStore` que aislaste reimplementa a mano lo que una librería madura ya trae hecho —y probado— sobre la misma Postgres; cuando la reconozcas, cambiar de motor será cambiar **una** implementación de `IEventStore`. Falta el dolor que te haga quererlo.

## ✅ Compruébalo

- [ ] `IEventStore` tiene los dos métodos, `AbrirStream<T>` es una extensión sobre la interfaz, y `PostgresEventStore` + `InMemoryEventStore` la implementan; `EventStream`, los handlers y el proyector dependen de la interfaz.
- [ ] `EventStream`, los handlers y el proyector solo nombran `IEventStore` (no `PostgresEventStore` ni `Npgsql`); los tests de reglas corren sin contenedor. Cambiar de motor sería cambiar **una** clase.
- [ ] El doble en memoria **fiel** lanza `ConcurrencyException` en dos escrituras concurrentes sobre el mismo stream; el ingenuo (sin el chequeo de versión) las deja pasar — verde falso.

## 🆘 Si algo salió mal

- **El dominio sigue viendo `Npgsql`:** algún handler o el `EventStream` aún referencia `PostgresEventStore` concreto. Cámbialo a `IEventStore`.
- **El doble no compila `ConcurrencyException`:** es la excepción que creaste en [Concurrencia optimista](./concurrencia-optimista.md); reúsala, no la redefinas.

## 📓 Registra tu avance

> 💭 **Reto:** tu doble en memoria y tu `PostgresEventStore`, ¿dan exactamente el mismo resultado ante dos escrituras concurrentes? ¿Por qué eso importa más que la velocidad?

```bash
git add .
git commit -m "ES · El puerto propio (IEventStore + doble en memoria)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un puerto (`IEventStore`) te da tests rápidos y libertad de motor, y te cobra dos cosas: el doble debe sostener las mismas garantías que producción (o el verde miente), y lo que el puerto no expone, nadie puede usarlo — la interfaz es el techo de capacidad.

---

[⬅️ Volver: ¿Merecía event sourcing?](./merecia-event-sourcing.md)

[➡️ Siguiente: Dos streams, la misma clave](./dos-streams-misma-clave.md)
