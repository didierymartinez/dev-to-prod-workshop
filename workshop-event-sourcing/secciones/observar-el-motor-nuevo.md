# Observar el motor nuevo

Tienes el motor nuevo corriendo entero: Marten guarda y proyecta, Wolverine entrega, el daemon va al día. Vuelve una necesidad que ya conoces del motor a mano: **ver el sistema respirar**.

## 🎯 El Objetivo

Observar el motor leyendo su esquema **en solo lectura, sin instrumentar la app**: qué streams crecen, cuánto rezago tiene el daemon, qué falló. Y comprobar en la base que existe lo que declaraste en la configuración.

## 💥 El dolor: el motor es una caja negra

Adoptaste una librería: ya no ves su cocina. Un día operaciones pregunta "¿por qué la vista va atrasada?", o un anuncio no llegó, y no tienes cómo responder: no puedes meterle `Console.WriteLine` a Marten, ni sabes en qué tabla vive el rezago. Y lo que declaraste en la configuración puede no existir en la base, sin un solo error.

## 🔧 Leer el esquema, sin tocar la app

> 🆕 **Observabilidad agentless: leer el esquema de la librería, read-only.** Un motor event-sourced sobre Postgres guarda su estado en tablas que cualquier cliente SQL lee. Marten expone `mt_streams` (un renglón por stream, con su `tenant_id` y su `version` = cuántos hechos tiene), `mt_events` (el diario, con `seq_id` global y `type`), y `mt_event_progression` (`name`, `last_seq_id` = hasta dónde llegó cada proyección). Wolverine expone `wolverine_dead_letters` (los mensajes que fallaron y quedaron apartados) y `wolverine_recurring_messages` (la próxima ocurrencia de cada cron, en `next_occurrence`). Conectarte a esa base **solo a consultar**, sin instrumentar la app, es *agentless*: observas el motor desde afuera.

> ⚠️ **Solo lectura no es solo higiene.** Una conexión de monitoreo que **escribe** en esas tablas deja de observar y empieza a alterar: un `UPDATE` a `mt_event_progression` mueve el **checkpoint del daemon** (le haces re-procesar o saltar hechos), y un `INSERT` en `mt_events` inyecta un **hecho fantasma**. Por eso la conexión del observador va con permisos de solo lectura.

### Paso 1 · Cinco preguntas al esquema

> 🛠️ **Inténtalo tú.** Con tu servicio corriendo (varios streams, alguno más largo), abre una sesión SQL de solo lectura contra su Postgres (en `psql`, empieza con `SET default_transaction_read_only = on;`: desde ahí, esa sesión no puede escribir) y responde **cinco** preguntas: (1) **¿qué streams crecen?** `mt_streams` por `version`. (2) **¿cuánto rezago?** el `last_seq_id` de tu proyección en `mt_event_progression`, contra el `max(seq_id)` de `mt_events`. (3) **¿qué se escribe?** hechos por `type`. (4) **¿qué falló?** los apartados en `wolverine_dead_letters`. (5) **¿hay próxima vuelta?** la `next_occurrence` de tu cron: si quedó en el pasado, nadie cobra el mes siguiente.

<details>
<summary>👉 Una forma de hacerlo (SQL de solo lectura)</summary>

```sql
-- 1) streams por longitud: los que más crecen (candidatos a "crece sin techo")
SELECT tenant_id, id, version FROM mt_streams ORDER BY version DESC LIMIT 10;
--   arriba, los susp-…: el proceso de cada suspensión junta sus respuestas; tus empresas tienen todavía menos hechos

-- 2) rezago del daemon: el frente del diario menos el progreso de tu proyección
SELECT (SELECT max(seq_id) FROM mt_events) AS frente,
       last_seq_id AS proyeccion,
       (SELECT max(seq_id) FROM mt_events) - last_seq_id AS rezago
FROM mt_event_progression WHERE name = 'VistaSuspendida:All';
--   frente | proyeccion | rezago   (rezago 0 si el daemon alcanzó, > 0 si va atrás)

-- 3) flujo de hechos por tipo (el alias que fija tu Hechos.Registrar: empresa_suspendida, empresa_registrada)
SELECT type, count(*) FROM mt_events GROUP BY type ORDER BY count(*) DESC;
--   tombstone no es tuyo: Marten lo escribe cuando una escritura de hechos falla después de reservar su número, para no dejar huecos en seq_id

-- 4) qué falló: mensajes apartados por Wolverine, como los CobrarElMes de los meses que fallaron
SELECT id, message_type, exception_message FROM wolverine_dead_letters ORDER BY sent_at DESC;

-- 5) ¿hay próxima vuelta? con tu servicio arriba, la de cobro-mensual va unos segundos adelante
SELECT schedule_name, next_occurrence FROM wolverine_recurring_messages;
```

La (2) es el rezago que tu `Rezago` de [La respuesta dice cuánto sabe](./la-respuesta-dice-cuanto-sabe.md) calcula con la API de Marten: el `max(seq_id)` de `mt_events` es su `EventSequenceNumber`, leído directo. El `name` en `mt_event_progression` es el del read model, `VistaSuspendida:All`, no el de la clase `SuspendidasProjection`; si la (2) no devuelve filas, lístalos con `SELECT name FROM mt_event_progression`.

</details>

### Paso 2 · ¿Existe lo que declaraste?

Operaciones quiere la lista de suspensiones por estado: cuáles siguen `esperando` a un socio y cuáles quedaron `efectiva`. Tu `Tablero` de [El tablero cruza streams](./el-tablero-cruza-streams.md) ya guarda el `Estado` de cada una, pero esa búsqueda no va por el id del documento: Postgres recorre las filas de tu tenant y mira dentro del JSON de cada una. Con un millón de filas, se nota.

> 🆕 **Un índice para una búsqueda que no es por id: `Duplicate`.** `opts.Schema.For<Tablero>().Duplicate(t => t.Estado)` le pide a Marten copiar `Estado` a una columna propia de `mt_doc_tablero`, llamada `estado`, con un índice: `mt_doc_tablero_idx_estado`. Desde ahí, Marten traduce tu `Where(t => t.Estado == …)` a esa columna (`d.estado = …`) y no al JSON (`d.data ->> 'Estado' = …`), junto al `d.tenant_id = …` de tu sesión. Marten aplica el cambio de esquema, y llena la columna de los documentos que ya existían, la primera vez que el servicio usa el `Tablero` después de arrancar.

> 🆕 **Dos preguntas de solo lectura: `pg_indexes` y `EXPLAIN`.** `pg_indexes` lista los índices que existen de verdad en la base. `EXPLAIN` muestra el plan que Postgres seguiría para una consulta, sin correrla: `Seq Scan` es recorrer la tabla entera, e `Index Scan using <índice>` es ir por un índice. Debajo, `Index Cond` dice lo que el índice encuentra, y `Filter`, lo que Postgres revisa fila por fila. Con pocas filas, Postgres prefiere recorrer la tabla aunque tenga un índice. `SET enable_seqscan = off;` le pide usar un índice si tiene uno que sirva, solo en tu sesión: así `EXPLAIN` responde si la consulta puede usar un índice. `EXPLAIN (COSTS OFF)` muestra el plan sin los números de costo.

> 🛠️ **Inténtalo tú.** Quiero esta respuesta, y que la consulta que la produce pueda ir por un índice:
>
> ```
> curl -H "Authorization: Bearer $ACME" "http://localhost:5000/tablero?estado=efectiva"
> [{"id":"emp-160","nombre":"Vidriería Andina","plan":"Premium","suspension":"susp-emp-160-3","facturacion":"Aplicado","accesos":"Aplicado","estado":"efectiva"}, …]
> ```
>
> Tu lista trae las empresas de acme con la suspensión efectiva. Para eso: **(1)** Agrega a tu `Program.cs` un `app.MapGet("/tablero", ...)`, como tu `MapPost` de [El host y la inyección](./el-host-y-la-inyeccion.md). Su lambda recibe `string estado` y una `IQuerySession`, y devuelve los tableros con ese estado. `estado` llega de la query string, como el `monto` de tus pagos. Tu `IQuerySession` llega abierta con el tenant del token. **(2)** Mide antes: en tu sesión de solo lectura, corre el `EXPLAIN` de la consulta del JSON, la que Marten manda hoy. **(3)** Declara el `Duplicate` en el `AddMarten` de tu `AgregarEmpresas`. **(4)** Reinicia, llama el endpoint una vez y mide después: el índice en `pg_indexes`, y el `EXPLAIN` de la consulta por la columna.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, en el AddMarten de tu AgregarEmpresas
opts.Schema.For<Tablero>().Duplicate(t => t.Estado);   // la búsqueda por estado, con su índice
```

```csharp
// Empresas.Historia/Program.cs, junto a tus endpoints
app.MapGet("/tablero", (string estado, IQuerySession s) =>
    s.Query<Tablero>().Where(t => t.Estado == estado).ToListAsync());   // ¿qué suspensiones de mi tenant están en este estado?
```

```sql
-- antes: el índice de la llave solo separa al tenant; el estado se busca en el JSON de cada fila
SET enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d WHERE d.tenant_id = 'acme' AND d.data ->> 'Estado' = 'efectiva';
--  Index Scan using pkey_mt_doc_tablero_tenant_id_id on mt_doc_tablero d
--    Index Cond: ((tenant_id)::text = 'acme'::text)
--    Filter: ((data ->> 'Estado'::text) = 'efectiva'::text)

-- después (en la misma sesión): el índice existe…
SELECT indexname FROM pg_indexes WHERE tablename = 'mt_doc_tablero';
--  pkey_mt_doc_tablero_tenant_id_id
--  mt_doc_tablero_idx_estado

-- …y la consulta por la columna lo puede usar
EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d WHERE d.tenant_id = 'acme' AND d.estado = 'efectiva';
--  Index Scan using mt_doc_tablero_idx_estado on mt_doc_tablero d
--    Index Cond: ((estado)::text = 'efectiva'::text)
--    Filter: ((tenant_id)::text = 'acme'::text)
```

Tu `Where` no cambió entre el antes y el después. Cambió la configuración, y con ella la SQL que Marten manda.

</details>

## 🔨 Rómpelo: el índice que nadie creó

Un servicio de la organización declaró dos índices en un método de configuración que su host nunca llama: compila, los tests pasan, y toda consulta por esos campos recorre la tabla entera. Repítelo: saca la línea `Duplicate` de tu `AddMarten` y ponla en un método que nadie llama.

```csharp
// Empresas.Historia/Indices.cs
using Marten;
public static class Indices
{
    public static void Registrar(StoreOptions opts) => opts.Schema.For<Tablero>().Duplicate(t => t.Estado);
}
```

Reinicia y llama el endpoint: responde la misma lista. Ahora mira la base, en tu sesión de solo lectura:

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'mt_doc_tablero';
--  pkey_mt_doc_tablero_tenant_id_id      ← el índice de estado ya no está

EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d WHERE d.tenant_id = 'acme' AND d.estado = 'efectiva';
--  ERROR:  column d.estado does not exist

EXPLAIN (COSTS OFF) SELECT d.data FROM mt_doc_tablero AS d WHERE d.tenant_id = 'acme' AND d.data ->> 'Estado' = 'efectiva';
--  Index Scan using pkey_mt_doc_tablero_tenant_id_id on mt_doc_tablero d   ← la consulta que Marten manda ahora
--    Filter: ((data ->> 'Estado'::text) = 'efectiva'::text)                ← el estado, otra vez en el JSON
```

Marten ajusta el esquema a la configuración que corre, como cuando tu worker borró `correlation_id` en [Dos hosts, una configuración](./dos-hosts-una-configuracion.md). La línea ya no corre: Marten quitó la columna y el índice que él mismo había creado. Tu código dice que el índice existe; la base, que es la que responde las consultas, dice que no. Llama `Indices.Registrar(opts)` desde tu `AddMarten` (o devuelve la línea a su sitio y borra `Indices.cs`), reinicia, llama el endpoint y comprueba que el índice volvió.

## El monitor que ya corres

En [El rezago](./el-rezago.md) y [El proyector tropieza](./el-proyector-tropieza.md) construiste **a mano** los dos primeros paneles de tu monitor, el rezago y los fallos, para **entenderlos**. El **CosmosLens** que corres desde [Dos respuestas, ningún dueño](./dos-respuestas-ningun-dueno.md) hace las consultas que acabas de escribir, agentless y en solo lectura: su panel de rezago es tu (2), su lista de dead letters la (4), y su lista de streams, con la versión de cada uno, la (1). Tú aprendiste el cálculo; la app te da la superficie.

## El Descubrimiento

Un motor event-sourced sobre Postgres es **observable desde afuera**: su estado (streams, hechos, progreso del daemon, mensajes fallidos, la próxima vuelta de cada cron) vive en **tablas** que lees en solo lectura, sin instrumentar la app. Eso es lo *agentless*, y la solo lectura es lo que separa observar de alterar. Las consultas que escribiste para entender el rezago y los fallos son la **misma lógica** que CosmosLens trae como tableros. También sus paneles **Procesos** y **Correlación**: Procesos agrupa por stream los hechos de `mt_events` contra lo que declaraste en `procesos.json`, y Correlación busca una llave en `mt_events` y en las tablas de Wolverine. En los proyectos reales nadie medía el rezago del daemon; ahora sabes las consultas **y** tienes la app que las vuelve superficie.

Lo que declaras en la configuración puede no existir en la base. La misma mirada de afuera lo comprueba: `pg_indexes` dice qué índices existen, y `EXPLAIN`, si una consulta puede usarlos.

> 🌱 Tu consulta (2) responde solo cuando alguien la corre. La próxima sección la pone dentro del servicio, para que avise solo cuando el rezago pasa de un límite: [Que el servicio avise](./que-el-servicio-avise.md).

## ✅ Compruébalo

- [ ] Con `SELECT` de solo lectura, sin tocar tu app, respondes qué stream crece más (`mt_streams` por `version`), cuánto rezago tiene el daemon (`max(seq_id)` de `mt_events` menos `last_seq_id` de tu proyección), qué mensajes fallaron (`wolverine_dead_letters`) y si tu cobro tiene próxima vuelta (`wolverine_recurring_messages`).
- [ ] Con el `Duplicate` de `Estado` en tu `AgregarEmpresas`, `pg_indexes` muestra `mt_doc_tablero_idx_estado`, y en `EXPLAIN` el estado pasa del `Filter` (el JSON) al `Index Cond` (la columna).
- [ ] Con el `Duplicate` en un método que nadie llama, todo compila y el endpoint responde igual, pero la base no tiene el índice.

## 🆘 Si algo salió mal

- **No encuentras las tablas:** están en el `DatabaseSchemaName` que configuraste (si no pusiste ninguno, en `public`); busca `<schema>.mt_streams`. Las `wolverine_*` viven en ese mismo schema cuando integras Wolverine con Marten.
- **`wolverine_dead_letters` vacía:** solo se llena cuando Wolverine aparta un mensaje; sin fallos, está vacía.
- **`pg_indexes` no muestra el índice, o `EXPLAIN` lanza `column d.estado does not exist` fuera del 🔨:** Marten cambia el esquema la primera vez que el servicio usa el `Tablero` después de arrancar; llama el endpoint una vez y vuelve a mirar. Si sigue sin estar, la línea `Duplicate` no corre: búscala en el `AddMarten` de tu `AgregarEmpresas`.
- **`EXPLAIN` dice `Seq Scan` aunque el índice existe:** te faltó `SET enable_seqscan = off;` en esa sesión.
- **`/tablero` responde 401, o 500 con `Required parameter "string estado" was not provided from query string`:** te faltó el token, o `?estado=…` en la URL.

## 📓 Registra tu avance

> 💭 **Reto:** nombra tres preguntas de operación que respondes leyendo el esquema de Marten y Wolverine, con su tabla y columna. ¿Por qué "solo lectura" es parte de lo que significa *observar*? ¿Y qué te dice `pg_indexes` que tu configuración no te dice?

```bash
git add .
git commit -m "ES · Observar el motor nuevo (agentless sobre el esquema + índice comprobado)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un motor event-sourced sobre Postgres no es una caja negra: su estado vive en tablas que lees en **solo lectura**, sin instrumentar la app, y esas consultas son la lógica de CosmosLens. Lo declarado se comprueba contra la base, con `pg_indexes` y `EXPLAIN`.

---

[⬅️ Volver: El cobro de cada tenant](./el-cobro-de-cada-tenant.md)

[➡️ Siguiente: Que el servicio avise](./que-el-servicio-avise.md)
