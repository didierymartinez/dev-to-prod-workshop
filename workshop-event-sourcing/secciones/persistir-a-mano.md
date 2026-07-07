# Persistir a mano tiene un límite

Tienes el motor blindado con tests verdes. Pero fíjate **dónde viven esos hechos**: en tu `EventStore`, un `Dictionary` en **RAM**. Tu test siembra, ejecuta y verifica — y luego el proceso termina y **todo se borra**. Para un test es justo lo que quieres (empezar de cero cada vez); para una app real es letal: el diario de "Constructora Andes" no puede desaparecer al reiniciar el servidor. Los hechos necesitan una **base de datos**. Guardar uno a mano resulta fácil. Leerlo de vuelta a su tipo no lo es: ahí verás dónde hacerlo a mano deja de valer la pena.

## 🎯 El Objetivo

Levantar un PostgreSQL real, **guardar un hecho a mano** y verlo sobrevivir a un reinicio. Y ver el **límite**: recuperar ese hecho *a su tipo* desde C#.

## Un evento no cabe en una tabla rígida

El instinto sería una tabla SQL con columnas fijas. Pero mira tus hechos:

```csharp
public record EmpresaRegistrada(string Nombre, string Plan);   // dos campos
public record PlanCambiado(string NuevoPlan);                  // uno
public record EmpresaSuspendida(string Motivo);               // otro distinto
public record EmpresaReactivada();                            // ninguno
```

Cada uno tiene una **forma distinta**. Una tabla rígida te obligaría a una tabla por tipo, o a una tabla gigante con casi todo en `null`. Hay una razón más honda por la que no encajan.

### Una fila cambia; un hecho no

Piensa qué haces con una fila normal. La empresa cambia de plan, y haces `UPDATE`: la misma fila, con otro valor. La fila **muta**. Es una casilla que reescribes.

Un hecho no funciona así. `PlanCambiado("Premium")` ocurrió el martes. Nunca vas a editarlo. Si mañana el plan cambia otra vez, no reescribes ese hecho: **añades otro**. Un hecho se escribe **una vez** y jamás se toca.

| Una **fila** de SQL | Un **hecho** (evento) |
|---|---|
| Se `ACTUALIZA`: la reescribes | Se escribe una vez, nunca cambia |
| Columnas fijas para toda la tabla | Cada tipo lleva sus propios campos |
| Guarda el estado *actual* | Guarda algo que *pasó* |
| Una casilla que muta | Un registro archivado |

Un dato que se escribe una vez, no cambia nunca y se basta a sí mismo tiene un nombre: es un **documento**. Como un recibo o un asiento contable. Lo archivas tal cual y ahí queda.

### El documento, de verdad

Tu hecho vive en C# como un objeto tipado:

```csharp
new EmpresaRegistrada("Constructora Andes", "Básico")
```

Para archivarlo, lo **serializas** (lo conviertes a texto plano):

```json
{"Nombre":"Constructora Andes","Plan":"Básico"}
```

Ese texto es el documento: lleva sus campos dentro, sin depender de columnas de ninguna tabla. Un hecho distinto (`PlanCambiado`, `EmpresaSuspendida`) produce otro documento, con otros campos, y conviven sin problema. Lo único que el texto **no** dice es de *qué* tipo de hecho se trata: por eso, al archivarlo, guardarás aparte una etiqueta `type` (lo harás enseguida). **PostgreSQL** guarda exactamente esto en una columna **`JSONB`**: consultable e indexable, sin renunciar a transacciones ACID.

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

### Paso 2 · Guarda un hecho a mano

Entra a la base y crea una tabla mínima — la clave es la columna `data` de tipo **`jsonb`** y una columna **`type`** (guárdala: el JSON solo no dice *qué* evento es):

```bash
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore
```

```sql
CREATE TABLE eventos (
    aggregate_id text  NOT NULL,
    version      int   NOT NULL,
    type         text  NOT NULL,   -- QUÉ evento es
    data         jsonb NOT NULL    -- el hecho, como documento
);

INSERT INTO eventos (aggregate_id, version, type, data) VALUES
  ('emp-7', 1, 'EmpresaRegistrada', '{"Nombre":"Constructora Andes","Plan":"Básico"}');
-- INSERT 0 1

SELECT type, data->>'Nombre' AS nombre FROM eventos WHERE aggregate_id = 'emp-7';
--        type        |       nombre
-- -------------------+--------------------
--  EmpresaRegistrada | Constructora Andes
```

Guardaste un hecho como documento y lo consultaste **por dentro** del JSON (`data->>'Nombre'`), sin columnas fijas.

### Paso 3 · Apaga y enciende

```sql
\q
```
```bash
docker compose restart
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore \
  -c "SELECT type FROM eventos WHERE aggregate_id='emp-7';"
```

> 🔍 **¿Lo lograste?** Tras el reinicio, la fila **sigue ahí**. Persististe de verdad: el volumen de Docker guardó el dato aunque Postgres se apagó y encendió. Esto es lo que tu `EventStore` en RAM no podía dar.

## El camino de vuelta, y su límite

Guardar fue fácil. Ahora el camino de vuelta en C#: lees la fila y tienes `data` como texto JSON… pero tu `EventStore` trabaja con `object` (`EventoAlmacenado.EventData`). ¿En qué tipo lo deserializas? El JSON no lo dice — por eso guardaste `type`. Para reconstruir el `object` correcto tendrías que escribir, a mano, algo así (donde `fila` es cada fila que lees de la tabla `eventos`):

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

Ese `switch` es apenas el principio. Crece con cada tipo de evento que agregues, y si olvidas una rama nadie te avisa: revienta en plena ejecución, con la app corriendo y datos reales dentro. Y para tener un almacén de eventos de verdad en Postgres, encima tendrías que escribir, tú, una por una:

- **Abrir y administrar la conexión** con Npgsql: abrirla, cerrarla, reintentar cuando falla.
- **Crear y migrar el esquema**: la tabla `eventos` a mano, y una migración cada vez que cambie.
- **Poner índices** para que leer un stream por `aggregate_id` no recorra la tabla entera.
- **Traducir a SQL tu control de versión**: la [Concurrencia optimista](concurrencia-optimista.md) que ya construiste rechazaba una posición ocupada en RAM; en Postgres es una transacción que verifica la versión, escrita y probada a mano.
- **Versionar la serialización**: el día que un evento cambie de forma, los documentos viejos ya no calzan en el nuevo `record`, y esa traducción la resuelves tú.

Todo eso se acumula. **Aquí es donde hacerlo a mano deja de valer la pena.** No es que sea imposible —cada pieza se puede escribir—, sino que para seguir estarías reconstruyendo, con bugs, todo un motor de persistencia de eventos que ya existe y está curtido en producción.

---

### El Descubrimiento

Persististe un hecho como documento `JSONB` y lo viste sobrevivir a un reinicio — algo que la RAM no daba. Pero el camino de vuelta te mostró el límite. Recuperar tu `object` a su tipo exacto obliga a guardar el `type` y a hacer un `switch` que crece con cada evento. Encima van la conexión, las migraciones, los índices y tu control de versión traducido a SQL. Hecho a mano, todo eso deja de valer la pena — y es un problema **ya resuelto** por librerías curtidas en producción.

Construimos el motor a mano para *entenderlo*; no para reimplementar una base de datos de eventos entera. En las próximas secciones conoces a **Marten** —la herramienta que hace exactamente esto— y llevas tu motor sobre ella, con criterio y en tu proyecto real.

> [!NOTE]
> 🌱 **Semilla — esto tiene nombre.** Guardar un `object` y recuperarlo como su tipo exacto es la **serialización polimórfica** de eventos. Marten la resuelve por ti: guarda el tipo, lo reconoce al leer, y hasta versiona esos eventos cuando cambian de forma (*upcasting*, sembrado en [Los primeros hechos](los-primeros-hechos.md)).

> [!NOTE]
> 🌱 **Semilla — dos superpoderes de Postgres que cobraremos después.** (1) **ACID**: guardar el evento **y** el mensaje a publicar en una sola transacción (el *outbox*, en EDA). (2) **`JSONB` consultable** (lo viste con `data->>'Nombre'`): construir **proyecciones / read models** (CQRS) sobre los mismos eventos ([La primera proyección](proyecciones.md)).

---

## ✅ Compruébalo

- [ ] `docker compose up -d` levanta el contenedor; `docker ps` lo muestra `Up`.
- [ ] Creaste la tabla `eventos` con columna `data jsonb` + `type`, e insertaste un hecho.
- [ ] `SELECT data->>'Nombre'` consulta **dentro** del JSON.
- [ ] Tras `docker compose restart`, la fila **sigue ahí**.
- [ ] Explicas por qué construir el almacén de eventos a mano **deja de valer la pena**: el `switch` que crece, más la conexión, los índices y el control de versión en SQL.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 Guardaste el hecho con una columna `type` aparte. ¿Por qué hace falta? ¿Cuál es el `switch` que hace inviable escribir el store de Postgres a mano?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Persistir a mano tiene un límite" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Los eventos no caben en tablas rígidas, pero **son documentos**: PostgreSQL los guarda en `JSONB`, los consulta por dentro y los conserva tras un reinicio. Recuperar un `object` a su tipo exacto es otra historia: obliga a guardar el `type` y a hacer un `switch`, más conexión, índices y control de versión en SQL. Hecho a mano deja de valer la pena — por eso adoptas Marten.

---

[⬅️ Volver: Blindar el motor: Given-When-Then](./given-when-then.md)

[➡️ Siguiente: Conoce a Marten: una base de datos de documentos](./conoce-a-marten.md)
