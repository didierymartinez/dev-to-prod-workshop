# Conoce a Marten: una base de datos de documentos

En la sección anterior viste que escribir a mano el puente entre tus hechos y Postgres —serializar, guardar el `type`, deserializar con un `switch`, administrar la conexión— deja de valer la pena. Adoptas **Marten**. Pero antes de apuntarlo a tus eventos, conócelo por lo que **es de nacimiento**: no un motor de event sourcing, sino una **base de datos de documentos**.

## 🎯 El Objetivo

Guardar y leer un objeto de C# como documento con Marten, verlo convertido en **JSONB** dentro de Postgres, y descubrir el giro: tu event store viajará sobre **este mismo motor**.

## Marten, antes que nada, guarda documentos

Marten nació para que un desarrollador .NET usara PostgreSQL como una **base de datos NoSQL de documentos** (la idea de MongoDB o RavenDB, pero sobre Postgres). Su trabajo de base: tomar un objeto de C#, **serializarlo a JSON** y guardarlo en una columna `JSONB` — exactamente lo que hiciste a mano en la sección anterior, pero automático. Vas a verlo en dos minutos.

### Paso 1 · Instala Marten y crea el `DocumentStore`

```bash
dotnet add package Marten --version 9.2.1
```

En tu `Program.cs`:

```csharp
using Marten;

var store = DocumentStore.For("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
```

> [!NOTE]
> 🆕 **`DocumentStore`.** Es la fábrica central de Marten: la configuras una vez (aquí, solo con la cadena de conexión) y de ella salen las **sesiones** con las que guardas y lees. Fíjate en el nombre —**almacén de documentos**—; en un momento verás por qué se llama así.

### Paso 2 · Guarda un objeto como documento

Cualquier objeto sirve; usa una nota simple para el experimento:

```csharp
public class Nota
{
    public Guid Id { get; set; }        // Marten usa esta propiedad como identidad
    public string Texto { get; set; } = "";
}
```

```csharp
await using var session = store.LightweightSession();
var nota = new Nota { Texto = "mi primer documento" };
session.Store(nota);
await session.SaveChangesAsync();
Console.WriteLine(nota.Id);             // Marten le asignó un Guid al guardarla
```

> [!NOTE]
> 🆕 **`session.Store(objeto)` + `SaveChangesAsync()`.** `Store` marca el objeto para guardar; `SaveChangesAsync` lo persiste (una unidad de trabajo: puedes `Store` varios y confirmarlos juntos). No creaste ninguna tabla ni escribiste SQL: Marten se encarga.

> [!NOTE]
> 🆕 **Idioma de C#: `async`/`await`.** Es la primera vez que aparece un `await` en el taller, y tiene un motivo.
>
> Hasta ahora tu `EventStore` vivía en la RAM del propio programa: le pedías algo y respondía al instante. No había nada que esperar. Postgres es otra cosa: es **otro programa** (puede estar hasta en otra máquina). Guardar significa mandarle la petición **por la red** y esperar la respuesta. Esa espera es lenta al lado de la RAM.
>
> `await` dice: "arranca esta operación que tarda y **no congeles el programa** mientras llega la respuesta". Sin `await`, el hilo (la línea que ejecuta tu código) se quedaría **parado** ahí, mirando la red sin hacer nada. Ojo: `await` **no** acelera la operación. La espera a Postgres dura lo mismo. Lo que evita es que el programa quede paralizado mientras espera.
>
> Hoy tu app es un solo `Main` de consola, así que este `await` todavía no cambia nada que notes. La ganancia llega cuando sea un servidor que atiende muchas peticiones a la vez: mientras una espera a Postgres, el hilo queda libre para atender otra, en vez de gastarse parado.
>
> Y para leer el código: `SaveChangesAsync` no te devuelve el resultado ya hecho, sino un **`Task`** —"un resultado que llegará después"—, y `await` espera ese `Task` sin congelar nada. Un método que use `await` dentro debe declararse **`async`**; por eso el nombre termina en `Async`: avisa que habla con algo de afuera y toca esperar.

### Paso 3 · Míralo: es JSONB

Marten creó una tabla sola y guardó tu objeto como JSON. Míralo en psql:

```bash
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore \
  -c "SELECT data FROM mt_doc_nota;"
```

```json
{"Id": "…", "Texto": "mi primer documento"}
```

> 🔍 **¿Lo lograste?** Ahí está tu objeto de C#, convertido en un documento **JSON dentro de una columna `JSONB`** — lo mismo que insertaste a mano en la sección anterior, ahora sin una línea de SQL. Marten hasta creó la tabla (`mt_doc_nota`, "mt" de Marten) por ti. **Esto** es lo que hace un almacén de documentos, y por eso la fábrica se llama `DocumentStore`.

### Paso 4 · Léelo de vuelta

```csharp
await using var query = store.QuerySession();
var recuperada = await query.LoadAsync<Nota>(nota.Id);
Console.WriteLine(recuperada!.Texto);   // "mi primer documento"
```

> [!NOTE]
> 🆕 **`LoadAsync<Nota>(id)`.** Marten lee la fila y **deserializa el JSON de vuelta a tu tipo** `Nota`. ¿Recuerdas ese `switch (type)` a mano para reconstruir el `object` correcto? Marten lo hace por ti, porque él guardó el tipo y sabe volver a él.

---

## El giro: un evento es solo otro documento

Ya viste lo que Marten hace de nacimiento: objeto de C# → JSON → `JSONB`, y de vuelta. Ahora el giro que lo conecta todo.

Cuando a Marten le añadieron **Event Sourcing**, no hubo que construir otra base de datos. Sus autores notaron algo que **tú ya descubriste**: un evento es solo un objeto que se serializa a JSON — es decir, **otro documento**. Así que la misma maquinaria de guardar documentos `JSONB` sirvió para guardar los eventos de un stream. Tu event store, por dentro, **es un almacén de documentos**.

Por eso la fábrica es `DocumentStore` incluso cuando la usas para eventos. Y por eso el swap que harás en la próxima sección será **pequeño**: no vas a enseñarle a Marten a persistir hechos — ya sabe, porque un hecho es un documento. Solo vas a apuntarlo a tus eventos.

> [!NOTE]
> La `Nota` cumplió su papel: fue el experimento para ver a Marten guardar un documento. Bórrala. Tu `Empresa` **no** se guarda así (se guarda como **eventos**), pero recuerda esta cara de documentos: volverás a ella cuando construyas **read models**.

---

### El Descubrimiento

Marten es, antes que un motor de event sourcing, una **base de datos de documentos**: convierte tus objetos de C# en JSON dentro de columnas `JSONB` y los reconstruye de vuelta a su tipo — justo lo que a mano no valía la pena escribir. Su fábrica se llama `DocumentStore` justamente por eso. Y como **un evento es solo otro documento**, el event sourcing viaja sobre esa misma maquinaria: no es una base distinta, es documentos con un orden. Con eso claro, el swap deja de ser un salto al vacío.

> [!NOTE]
> 🌱 **Semilla — esta cara volverá.** La API de documentos que acabas de usar (`Store`/`LoadAsync`) es la que guardará los **read models** de tus proyecciones: una proyección es un documento que resume un stream. Lo construirás en [La primera proyección](proyecciones.md).

---

## ✅ Compruébalo

- [ ] `dotnet add package Marten --version 9.2.1` y creaste el `DocumentStore` con la cadena de conexión.
- [ ] Guardaste una `Nota` con `session.Store(...)` + `SaveChangesAsync()`; Marten le asignó un `Id`.
- [ ] `SELECT data FROM mt_doc_nota` muestra tu objeto como **JSON en una columna `JSONB`**.
- [ ] `LoadAsync<Nota>(id)` te la devuelve **como `Nota`**, no como texto.
- [ ] Explicas el giro: por qué un event store **es** un document store por dentro, y por qué la fábrica se llama `DocumentStore`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué hace Marten "de nacimiento" y por qué su fábrica se llama `DocumentStore`? ¿Por qué guardar eventos no le exigió una base de datos nueva?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Conoce a Marten: una base de datos de documentos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Marten nació como **base de datos de documentos**: serializa tus objetos de C# a JSON en columnas `JSONB` y los reconstruye a su tipo (por eso su fábrica es `DocumentStore`); y como **un evento es solo otro documento**, el event sourcing viaja sobre esa misma maquinaria — no una base nueva.

---

[⬅️ Volver: Persistir a mano tiene un límite](./persistir-a-mano.md)

[➡️ Siguiente: El swap: tu motor sobre Marten](./el-swap.md)
