# 10 · Persistencia real (Docker y PostgreSQL)

Llevamos varias secciones con una bomba de tiempo escondida: el `InMemoryEventStore` vive en **RAM**. Apaga el programa —o reinicia el servidor— y el diario de **todas** las empresas se va a la basura. Lo ignoramos a propósito, para construir el motor sin distraernos. Pero una `Empresa` cuya historia desaparece al reiniciar no le sirve a nadie. Toca persistir de verdad.

## 🎯 El Objetivo

Que la historia de las empresas **sobreviva a un reinicio**: guardarla fuera del proceso, en una base de datos real.

## Un evento no cabe en una tabla rígida

El instinto de un dev de C# sería crear una tabla SQL clásica: columnas fijas (`Id`, `Nombre`, `Plan`, `Fecha`…). Pero mira nuestros hechos:

```csharp
public record EmpresaRegistrada(string Nombre, string Plan);   // dos campos
public record PlanCambiado(string NuevoPlan);                  // uno
public record EmpresaSuspendida(string Motivo);               // otro distinto
public record EmpresaReactivada();                            // ¡ninguno!
```

Cada evento tiene una **forma distinta**. Para meterlos en una tabla rígida tendrías dos malas salidas: una tabla por tipo de evento (decenas de tablas), o una tabla gigante llena de columnas en `null` (`Motivo = null` cuando es un `PlanCambiado`). Una pesadilla.

Pero fíjate en lo que **sí** tienen en común: cada hecho es un puñado pequeño de datos que, una vez escrito, **no cambia**. Eso es, literalmente, un **documento**. Así que no guardamos columnas: guardamos cada evento como un **documento JSON**.

```json
{ "Nombre": "Constructora Andes", "Plan": "Básico" }
```

## La herramienta: PostgreSQL + `JSONB`

No hace falta una base de datos documental aparte (tipo MongoDB). **PostgreSQL** —el motor relacional de siempre— trae un superpoder llamado **`JSONB`** (JSON binario): guarda y **consulta dentro** de documentos JSON con índices, a velocidad de NoSQL, pero **sin perder** la seguridad transaccional (ACID) que protege tus datos. Postgres + `JSONB` es la herramienta suprema para event sourcing en .NET.

> [!NOTE]
> 🌱 **Semilla — dos superpoderes de Postgres que cobraremos después.**
> 1. **ACID** (transacciones "todo o nada") es lo que más adelante permitirá guardar el evento **y** el mensaje a publicar en **una sola transacción** —el *outbox transaccional*—, para que nunca quede uno sin el otro.
> 2. **`JSONB` es indexable y consultable**: puedes buscar *dentro* del JSON. Eso es lo que hará posible construir **proyecciones / read models** (CQRS) sobre los mismos eventos. El evento crudo y la vista de lectura conviven en el mismo Postgres.

## Docker: levantar Postgres en segundos

Aquí —y no antes— aparece **Docker**. En vez de instalar un Postgres pesado en tu máquina, Docker lo enciende en un **contenedor** prefabricado: una caja aislada, lista en segundos, que borras sin dejar rastro. Es justo lo que quieres para desarrollar.

> [!NOTE]
> **Prerequisito: Docker.** Este taller (a diferencia del de DevOps) no te hizo instalar Docker antes, así que asegúralo ahora: necesitas **Docker Desktop** (Windows/Mac) o el **Docker Engine** (Linux) **instalado y abierto**. Si no lo tienes, instálalo desde [docker.com](https://www.docker.com/products/docker-desktop/) y ábrelo antes de seguir. Compruébalo con `docker --version`.

En la **raíz de tu proyecto** (junto al `.csproj`), crea un archivo `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine          # versión 17, imagen mínima
    container_name: gestion_eventstore
    environment:
      POSTGRES_USER: gestion
      POSTGRES_PASSWORD: dev_local_pwd  # ⚠️ solo desarrollo local; en serio, esto va en un secreto
      POSTGRES_DB: gestion_eventstore
    ports:
      - "5432:5432"                     # la puerta 5432 del contenedor, en tu localhost
    volumes:
      - eventstore_data:/var/lib/postgresql/data   # los datos sobreviven aunque el contenedor se apague

volumes:
  eventstore_data:
```

Abre una terminal **en esa carpeta** y enciende la base:

```bash
docker compose up -d
```

El `-d` (*detached*) la deja corriendo en segundo plano. Comprueba que está viva:

```bash
docker ps
```

Deberías ver una línea con `gestion_eventstore` y estado `Up`. Si quieres asomarte adentro (no hay tablas todavía):

```bash
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore -c "\dt"
# Did not find any relations.   ← la bóveda está encendida, pero vacía
```

> [!NOTE]
> 💡 Si `docker ps` no muestra nada o da error, Docker Desktop no está arrancado: ábrelo y reintenta. Y `docker compose` (con espacio) es la versión moderna; el viejo `docker-compose` (con guion) también sirve pero está en retirada.

## La dirección de la bóveda: el *connection string*

Tu app en C# necesitará la dirección y la llave para abrir esta base. Es la **cadena de conexión**:

```
Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd
```

> [!NOTE]
> 🌱 **Semilla — una base, muchas empresas-cliente aisladas.** En producción, cada empresa-cliente de la plataforma es un **tenant** cuyos datos no deben mezclarse con los de otra — pero todas pueden vivir en la **misma** base. Postgres y la herramienta que adoptaremos soportan esa separación (*multi-tenancy*) sin duplicar infraestructura. Lo veremos a fondo; por ahora, una sola base local nos basta.

---

### El Descubrimiento

Tienes una bóveda incombustible (Postgres) encendida. Pero mira tu app: **sigue** usando el `InMemoryEventStore`. Para hablar con Postgres tendrías que escribir, a mano, toda esta fontanería:

- Abrir y administrar la conexión de red (con una librería como Npgsql).
- Crear la tabla: `CREATE TABLE eventos (aggregate_id text, version int, timestamp timestamptz, data jsonb, ...)`.
- Serializar cada `EventoAlmacenado` a JSON al guardar… y **aquí está el muro**: tu `EventData` es de tipo `object`. Al **leer** de vuelta, ¿cómo sabe el programa si ese JSON era un `EmpresaRegistrada` o un `PlanCambiado`? Tendrías que guardar además el **nombre del tipo** en una columna, y al cargar hacer un `switch` sobre ese texto para deserializar al record correcto. Tú a mano, evento por evento.
- Y encima: la validación de versión (concurrencia) en SQL, las consultas, los índices…

Eso son **semanas** de plumbing frágil, lleno de errores de principiante — y es un problema que **ya está resuelto** por librerías curtidas en producción. Construimos el motor a mano para *entenderlo*; no para reimplementar una base de datos de eventos entera.

> [!NOTE]
> 🌱 **Semilla — ese "muro" tiene nombre.** El problema de guardar un `object` y recuperarlo como su tipo exacto es la **serialización polimórfica** de eventos. La herramienta que adoptaremos lo resuelve por ti (guarda el tipo, lo reconoce al leer) — y también el versionado de esos eventos cuando, dentro de un año, le quieras añadir un campo (*upcasting*, que sembramos en §02).

Es hora de dejar de construir y empezar a **adoptar**. En la próxima sección decidimos —con criterio, no por moda— incorporar una herramienta que hace exactamente lo que tú ya entiendes, y la conocemos.

---

## ✅ Compruébalo

- [ ] `docker compose up -d` levanta el contenedor; `docker ps` lo muestra como `Up`.
- [ ] `docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore -c "\dt"` conecta y responde que **no hay tablas** (la base existe, está vacía).
- [ ] Explica, con un ejemplo, por qué los **eventos** (cada uno con su forma) encajan mejor como **documentos `JSONB`** que como filas de una tabla rígida.
- [ ] Explica cuál es el **muro** que hace que escribir el store de Postgres a mano no valga la pena: la deserialización de `object` de vuelta a su tipo de evento.

---

## 🧠 En una frase

Los eventos no caben en tablas rígidas pero **son documentos**; **PostgreSQL + `JSONB`** los guarda con seguridad ACID e índices; **Docker** enciende ese Postgres en segundos; y escribir a mano el puente C#↔Postgres —sobre todo recuperar un `object` como su tipo exacto— es el muro que hace que **adoptar una herramienta** valga la pena.

---

[⬅️ Volver: De `new` al contenedor (Inyección de Dependencias)](./09-inyeccion-de-dependencias.md)

[➡️ Siguiente: El momento de adoptar una herramienta](./11-por-que-adoptar-herramientas.md)
