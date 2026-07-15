# Conoce a Marten: una base de datos de documentos

Tienes el motor blindado con tests verdes. Pero fíjate **dónde viven esos hechos**: en tu `EventStore`, un `Dictionary` en **RAM**. Cuando el proceso termina, **todo se borra** — para un test es justo lo que quieres, pero para una app real es letal: el diario de "Constructora Andes" no puede desaparecer al reiniciar el servidor. Los hechos necesitan una **base de datos**. Vas a adoptar **Marten**.

## 🎯 El Objetivo

Entender por qué un evento **es un documento** (no una fila), y guardar y leer un objeto de C# con Marten — verlo convertido en **JSONB** dentro de Postgres. Y descubrir el giro: tu event store viajará sobre **este mismo motor**.

## 💥 El dolor: persistir a mano no escala

El instinto sería una tabla SQL con columnas fijas. Pero mira tus hechos:

```csharp
public record EmpresaRegistrada(string Nombre, string Plan);   // dos campos
public record PlanCambiado(string NuevoPlan);                  // uno
public record EmpresaSuspendida(string Motivo);               // otro distinto
public record EmpresaReactivada();                            // ninguno
```

Cada uno tiene una **forma distinta**. Una tabla rígida te obligaría a una tabla por tipo, o a una gigante con casi todo en `null`. Y hay una razón más honda: una **fila** se `ACTUALIZA` —la reescribes, muta—; un **hecho** se escribe **una vez** y jamás se toca. `PlanCambiado("Premium")` ocurrió el martes; si mañana el plan cambia otra vez, no reescribes ese hecho: **añades otro**.

| Una **fila** de SQL | Un **hecho** (evento) |
|---|---|
| Se `ACTUALIZA`: la reescribes | Se escribe una vez, nunca cambia |
| Columnas fijas para toda la tabla | Cada tipo lleva sus propios campos |
| Guarda el estado *actual* | Guarda algo que *pasó* |
| Una casilla que muta | Un registro archivado |

Un dato que se escribe una vez, no cambia nunca y se basta a sí mismo tiene un nombre: es un **documento** (como un recibo o un asiento contable). Lo archivas **serializándolo** a texto plano —`new EmpresaRegistrada("Constructora Andes", "Básico")` se vuelve `{"Nombre":"Constructora Andes","Plan":"Básico"}`—, con sus campos dentro, sin depender de columnas de ninguna tabla. **PostgreSQL** guarda exactamente esto en una columna **`JSONB`**: consultable e indexable, con transacciones ACID (todo-o-nada: nunca queda a medias).

Podrías escribir todo ese puente a mano. Pero el camino de **vuelta** ya avisa del costo: lees el JSON como texto y tienes que devolverlo a su tipo de C#. El JSON no dice cuál es —por eso guardarías aparte una columna `type`—, así que reconstruir el `object` correcto pediría un `switch` como este (no lo escribas —es justo lo que Marten te ahorrará—):

```csharp
object hecho = fila.Type switch
{
    "EmpresaRegistrada" => JsonSerializer.Deserialize<EmpresaRegistrada>(fila.Data)!,
    "PlanCambiado"      => JsonSerializer.Deserialize<PlanCambiado>(fila.Data)!,
    "EmpresaSuspendida" => JsonSerializer.Deserialize<EmpresaSuspendida>(fila.Data)!,
    "EmpresaReactivada" => JsonSerializer.Deserialize<EmpresaReactivada>(fila.Data)!,
    _ => throw new Exception($"tipo de evento desconocido: {fila.Type}")
};
```

Y ese `switch` es apenas el principio: crece con cada evento nuevo, y si olvidas una rama nadie te avisa —revienta en plena ejecución, con datos reales dentro—. Encima, para un almacén de eventos de verdad tendrías que escribir, tú, una por una: **abrir y administrar la conexión** con Npgsql (el driver de Postgres para .NET); **crear y migrar el esquema** (las tablas y sus cambios cuando evolucionan); **poner índices** para leer un stream sin recorrer la tabla entera; **traducir tu control de versión a SQL** (la [Concurrencia optimista](concurrencia-optimista.md) que ya construiste sería un `INSERT` condicionado a `WHERE version = N`); y **versionar la serialización** cuando un evento cambie de forma. Todo eso se acumula: estarías reconstruyendo, con bugs, un motor de persistencia de eventos que **ya existe y está curtido en producción**. Ahí es donde hacerlo a mano deja de valer la pena. Adoptas **Marten**.

## 🔧 Marten, antes que nada, guarda documentos

Marten nació para que un desarrollador .NET usara PostgreSQL como una **base de datos NoSQL de documentos** (la idea de MongoDB o RavenDB, pero sobre Postgres). Su trabajo de base: tomar un objeto de C#, **serializarlo a JSON** y guardarlo en una columna `JSONB` — exactamente el puente que acabas de ver a mano, pero automático. Vas a verlo en dos minutos.

> [!NOTE]
> **Prerequisito: Docker.** Necesitas Docker Desktop (Windows/Mac) o el Docker Engine (Linux), instalado y abierto. Compruébalo con `docker --version`.

### Paso 1 · Levanta Postgres

En la raíz de tu proyecto, crea `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: gestion_eventstore
    environment:
      POSTGRES_USER: gestion
      POSTGRES_PASSWORD: dev_local_pwd   # ⚠️ solo desarrollo local
      POSTGRES_DB: gestion_eventstore
    ports:
      - "5432:5432"
    volumes:
      - eventstore_data:/var/lib/postgresql/data   # los datos sobreviven al contenedor

volumes:
  eventstore_data:
```

```bash
docker compose up -d
docker ps                 # gestion_eventstore, estado Up
```

### Paso 2 · Instala Marten y crea el `DocumentStore`

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

### Paso 3 · Guarda un objeto como documento

Usa una `Nota` simple para el experimento —no tu `Empresa`, que se guardará como **eventos**, no como documento (lo verás en el giro)—; cualquier objeto sirve:

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
> 🆕 **`session.Store(objeto)` + `SaveChangesAsync()`.** `Store` marca el objeto para guardar; `SaveChangesAsync` lo persiste (una unidad de trabajo: puedes `Store` varios y confirmarlos juntos). No creaste ninguna tabla ni escribiste SQL: Marten se encarga. (La `LightweightSession` es la sesión de trabajo **ligera** de Marten para leer y escribir; hay otras variantes que verás más adelante.)

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

### Paso 4 · Míralo: es JSONB (y sobrevive al reinicio)

Corre el programa con `dotnet run`: imprime el `Guid` que Marten le asignó a la nota. Ya la guardó en Postgres —Marten creó la tabla solo—, así que ve a mirarla en psql:

```bash
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore \
  -c "SELECT data FROM mt_doc_nota;"
```

```json
{"Id": "…", "Texto": "mi primer documento"}
```

> 🔍 **¿Lo lograste?** Ahí está tu objeto de C#, convertido en un documento **JSON dentro de una columna `JSONB`** — sin una línea de SQL, y Marten hasta creó la tabla (`mt_doc_nota`, "mt" de Marten) por ti. Y como Postgres guarda sus datos en el **volumen de Docker**, esto **sobrevive a un reinicio**: prueba `docker compose restart` y vuelve a hacer el `SELECT` — el documento sigue ahí. Es justo lo que tu `EventStore` en RAM no podía dar. **Esto** es lo que hace un almacén de documentos, y por eso la fábrica se llama `DocumentStore`.

### Paso 5 · Léelo de vuelta

```csharp
await using var query = store.QuerySession();
var recuperada = await query.LoadAsync<Nota>(nota.Id);
Console.WriteLine(recuperada!.Texto);   // "mi primer documento"
```

> [!NOTE]
> 🆕 **`QuerySession` + `LoadAsync<Nota>(id)`.** Para **solo leer** abres una `QuerySession` (sesión de solo lectura); la `LightweightSession` del Paso 3 es la que además **escribe**. `LoadAsync` lee la fila y **deserializa el JSON de vuelta a tu tipo** `Nota`. Ese `switch (type)` que tendrías que escribir a mano para reconstruir el `object` correcto —el del dolor de arriba— Marten lo hace por ti, porque él guardó el tipo y sabe volver a él.

---

## El giro: un evento es solo otro documento

Ya viste lo que Marten hace de nacimiento: objeto de C# → JSON → `JSONB`, y de vuelta. Ahora el giro que lo conecta todo.

Cuando a Marten le añadieron **Event Sourcing**, no hubo que construir otra base de datos. Sus autores notaron algo que **tú ya descubriste**: un evento es solo un objeto que se serializa a JSON — es decir, **otro documento**. Así que la misma maquinaria de guardar documentos `JSONB` sirvió para guardar los eventos de un stream. Tu event store, por dentro, **es un almacén de documentos**.

Por eso la fábrica es `DocumentStore` incluso cuando la usas para eventos. Y por eso el swap que harás en la próxima sección será **pequeño**: no vas a enseñarle a Marten a persistir hechos — ya sabe, porque un hecho es un documento. Solo vas a apuntarlo a tus eventos.

> [!NOTE]
> La `Nota` cumplió su papel: fue el experimento para ver a Marten guardar un documento. Bórrala. Tu `Empresa` **no** se guarda así (se guarda como **eventos**), pero recuerda esta cara de documentos: volverás a ella cuando construyas **read models**.

---

### El Descubrimiento

Persistir tus hechos a mano dejaba de valer la pena —el `switch (type)` que crece, más la conexión, las migraciones, los índices y el control de versión traducido a SQL—, así que adoptaste **Marten**: antes que un motor de event sourcing, una **base de datos de documentos** que convierte tus objetos de C# en JSON dentro de columnas `JSONB` y los reconstruye de vuelta a su tipo. Su fábrica se llama `DocumentStore` justamente por eso. Y como **un evento es solo otro documento**, el event sourcing viaja sobre esa misma maquinaria: no es una base distinta, es documentos con un orden. Con eso claro, el swap deja de ser un salto al vacío.

> [!NOTE]
> 🌱 **Semilla — esta cara volverá.** La API de documentos que acabas de usar (`Store`/`LoadAsync`) es la que guardará los **read models** de tus proyecciones: una proyección es un documento que resume un stream. Lo construirás en [La primera proyección](proyecciones.md).

> [!NOTE]
> 🌱 **Semilla — dos superpoderes de Postgres que cobraremos después.** (1) **ACID**: guardar el evento **y** el mensaje a publicar en una sola transacción (el *outbox*, en [Outbox e Inbox](outbox-inbox.md)). (2) **`JSONB` consultable**: se consulta **por dentro** del documento (`data->>'campo'`), lo que hace posible construir proyecciones / read models sobre los mismos eventos ([La primera proyección](proyecciones.md)).

---

## ✅ Compruébalo

- [ ] Explicas por qué un evento **es un documento** y no una fila: se escribe una vez, cada tipo lleva sus propios campos → encaja en `JSONB`, no en columnas rígidas.
- [ ] Explicas por qué escribir el almacén de eventos **a mano** deja de valer la pena: el `switch (type)` que crece, más la conexión, las migraciones, los índices y el control de versión en SQL.
- [ ] `docker compose up -d` levanta Postgres (`docker ps` lo muestra `Up`); instalaste Marten 9.2.1 y creaste el `DocumentStore` con la cadena de conexión.
- [ ] Guardaste una `Nota` con `session.Store(...)` + `SaveChangesAsync()`; `SELECT data FROM mt_doc_nota` la muestra como **JSON en una columna `JSONB`**, y sobrevive a `docker compose restart`.
- [ ] `LoadAsync<Nota>(id)` te la devuelve **como `Nota`** (Marten hace el `switch` que tú tendrías que escribir a mano).
- [ ] Explicas el giro: por qué un event store **es** un document store por dentro, y por qué la fábrica se llama `DocumentStore`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué escribir la persistencia de eventos a mano deja de valer la pena? ¿Qué hace Marten "de nacimiento" y por qué su fábrica se llama `DocumentStore`? ¿Por qué guardar eventos no le exigió una base de datos nueva?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Conoce a Marten: una base de datos de documentos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Los eventos no caben en tablas rígidas: **son documentos**, y escribir su persistencia a mano (el `switch (type)` que crece, más conexión, índices y control de versión en SQL) deja de valer la pena. Marten nació como **base de datos de documentos** —serializa tus objetos de C# a JSON en columnas `JSONB` y los reconstruye a su tipo (por eso su fábrica es `DocumentStore`)—; y como **un evento es solo otro documento**, el event sourcing viaja sobre esa misma maquinaria, no una base nueva.

---

[⬅️ Volver: Blindar el motor: Given-When-Then](./given-when-then.md)

[➡️ Siguiente: El swap: tu motor sobre Marten](./el-swap.md)
