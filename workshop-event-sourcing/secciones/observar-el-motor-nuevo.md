# Observar el motor nuevo

Tienes el motor nuevo corriendo entero: Marten guardando y proyectando, Wolverine entregando, el daemon al día. Con todo eso vivo, vuelve una necesidad que ya conoces del motor a mano: **ver el sistema respirar** — ahora sobre una librería cuya cocina no ves.

## 🎯 El Objetivo

Observar el motor —qué streams crecen, cuánto rezago tiene el daemon **ahora**, cómo fluyen los hechos, qué falló— leyendo su esquema **en solo lectura, sin instrumentar la app**. Y reconocer que esas mismas consultas son las que el monitor del taller vuelve tableros.

## 💥 El dolor: el motor es una caja negra

Adoptaste una librería: ya no ves su cocina. Un día operaciones pregunta "¿por qué la vista va atrasada?", o notas que la base crece raro, o un anuncio no llegó. Y no tienes cómo responder: no puedes meterle `Console.WriteLine` a Marten, ni pausar el daemon para mirar, ni sabes en qué tabla vive el rezago. El motor que te dio alivio también se volvió **opaco**: hace su trabajo, pero no te deja verlo.

## 🔧 Leer el esquema, sin tocar la app

La buena noticia: un motor event-sourced sobre Postgres **guarda su estado en tablas**, y esas tablas se pueden **leer**. Te conectas a la misma Postgres con cualquier cliente SQL (`psql`, un cliente gráfico) y preguntas — **solo lectura**, sin instrumentar la app ni pedirle permiso.

> 🆕 **Observabilidad agentless: leer el esquema de la librería, read-only.** Marten expone `mt_streams` (un renglón por stream, con su `version` = cuántos hechos tiene), `mt_events` (el diario, con `seq_id` global y `type`), y `mt_event_progression` (`name`, `last_seq_id` = hasta dónde llegó cada proyección). Wolverine expone `wolverine_dead_letters` (los mensajes que fallaron y quedaron apartados). Conectarte a esa base **solo a consultar** —sin escribir, sin instrumentar la app— es *agentless*: observas el motor desde afuera.

> ⚠️ **Solo lectura no es solo higiene.** Si tu conexión de monitoreo **escribe** en esas tablas, dejas de observar y empiezas a alterar: un `UPDATE` a `mt_event_progression` mueve el **checkpoint del daemon** (le haces re-procesar o saltar hechos); un `INSERT` en `mt_events` inyecta un **hecho fantasma**. Observar el sistema no puede **cambiar** el sistema — por eso la conexión del observador va con permisos de solo lectura.

> 🛠️ **Inténtalo tú.** Con tu servicio corriendo (varios streams, alguno más largo), abre una sesión SQL de solo lectura contra su Postgres y responde **cuatro** preguntas: (1) **¿qué streams crecen?** `mt_streams` por `version`. (2) **¿cuánto rezago?** el `last_seq_id` de tu proyección en `mt_event_progression`, contra el `max(seq_id)` de `mt_events`. (3) **¿qué se escribe?** hechos por `type`. (4) **¿qué falló?** los apartados en `wolverine_dead_letters`.

<details>
<summary>👉 Una forma de hacerlo (SQL de solo lectura)</summary>

```sql
-- 1) streams por longitud: los que más crecen (candidatos a "crece sin techo")
SELECT id, version FROM mt_streams ORDER BY version DESC LIMIT 10;
--   emp-1 | 7      ← este crece mucho más que los demás

-- 2) rezago del daemon: el frente del diario menos el progreso de tu proyección
SELECT (SELECT max(seq_id) FROM mt_events) AS frente,
       last_seq_id AS proyeccion,
       (SELECT max(seq_id) FROM mt_events) - last_seq_id AS rezago
FROM mt_event_progression WHERE name = 'VistaSuspendida:All';
--   frente | proyeccion | rezago   (rezago 0 si el daemon alcanzó, > 0 si va atrás)

-- 3) flujo de hechos por tipo (Marten usa snake_case: empresa_suspendida, empresa_registrada)
SELECT type, count(*) FROM mt_events GROUP BY type ORDER BY count(*) DESC;

-- 4) qué falló: mensajes apartados por Wolverine
SELECT id, message_type, exception_message FROM wolverine_dead_letters ORDER BY sent_at DESC;
```

Ninguna consulta escribe; ninguna toca tu código. La (2) es el **mismo** rezago que mediste con la API de Marten en [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) —el `max(seq_id)` de `mt_events` es aquel `EventSequenceNumber` leído directo—, y la (4) es el `dead-letter` que armaste a mano en [El proyector tropieza](./el-proyector-tropieza.md), ahora una tabla de Wolverine. *(Ojo: el `name` de la proyección en `mt_event_progression` lleva el tenant si activaste multi-tenancy —§35—; si la (2) da `NULL`, lístalos con `SELECT name FROM mt_event_progression`.)*

</details>

## El monitor que te dimos

Fíjate en lo que acabas de hacer: escribiste las consultas que revelan cómo respira el motor. Eso es exactamente lo que en [El rezago](./el-rezago.md) y [El proyector tropieza](./el-proyector-tropieza.md) llamamos "la primera pieza de tu monitor" —el cálculo del rezago, el panel de fallos—: lo construiste **a mano** para **entenderlo**. **CosmosLens** —el monitor companion del taller, en el repo `cosmos-trace`— trae ese mismo cálculo ya hecho, como tableros vivos: lo descargas y lo corres apuntándolo a la Postgres de tu servicio, agentless y solo-lectura, y ves la línea de tiempo de un stream, el rezago al segundo, los streams que crecen, los dead-letters — sin escribir una consulta. Tú aprendiste el cálculo; la app te da la superficie. Y es el mismo observador que en las secciones tempranas leía **una tabla `eventos` como la tuya**; ahora lee `mt_events`/`mt_streams`/`mt_event_progression` de Marten y las de Wolverine — madurado con tu motor.

## El Descubrimiento

Un motor event-sourced sobre Postgres es **observable desde afuera**: no es una caja negra, porque su estado —streams, hechos, progreso del daemon, mensajes fallidos— vive en **tablas** que lees **solo-lectura**, sin instrumentar la app. Eso es lo *agentless*, y el "solo lectura" no es higiene: es lo que separa observar de alterar. Aquí se cierra el hilo del monitor que venías tejiendo desde [El rezago](./el-rezago.md): las consultas que escribiste a mano para entender el rezago y los fallos son la **misma lógica** que CosmosLens trae como tableros. Es la pieza que faltaba —en los proyectos reales nadie medía el rezago del daemon—, y ahora la tienes doble: sabes las consultas (porque las corriste) **y** tienes la app que las vuelve superficie. Saber qué preguntarle a un motor que adoptaste es tan oficio como saberlo construir.

> 🌱 Hace secciones fuiste dejando líneas que parecían innecesarias pero evitaban un bug sutil —algunas sin comentar, otras comentadas con su **mecánica** en vez de con el **síntoma** que las hace intocables—. El día que alguien las "limpie" por prolijas, el bug vuelve. Cómo un comentario que nombra el síntoma las protege —más el aporte de vuelta a la librería— es el próximo paso antes de recoger todo en una plantilla: [El comentario que sobrevive](./el-comentario-que-sobrevive.md).

## ✅ Compruébalo

- [ ] Respondes "¿qué stream crece más?" con un `SELECT` de solo lectura sobre `mt_streams` (por `version`), sin tocar tu app.
- [ ] Mides el rezago del daemon (`max(seq_id)` de `mt_events` menos `last_seq_id` de tu proyección) — el mismo número que la API de Marten te dio en §32.
- [ ] Sabes en qué tablas viven el flujo de hechos (`mt_events`) y los mensajes fallidos (`wolverine_dead_letters`), y por qué la conexión del observador va en solo lectura.
- [ ] Reconoces que esas consultas son la lógica que CosmosLens (el monitor que damos) trae como tableros — tú aprendiste el cálculo, la app da la superficie.

## 🆘 Si algo salió mal

- **No encuentras las tablas:** están en el `DatabaseSchemaName` que configuraste (si no pusiste ninguno, en `public`); busca `<schema>.mt_streams`. Y las `wolverine_*` viven en **ese mismo** schema cuando integras Wolverine con Marten.
- **La consulta de rezago da `NULL`:** el `name` de tu proyección no coincide (con multi-tenancy lleva el tenant); lístalos con `SELECT name FROM mt_event_progression`.
- **`wolverine_dead_letters` vacía:** solo se llena cuando Wolverine apartó un mensaje (y con la durabilidad activada); sin fallos, está vacía — buena señal.
- **Tu monitoreo escribió en la base observada:** restringe esa conexión a solo lectura (un rol de Postgres con `SELECT` únicamente); observar no debe mutar.

## 📓 Registra tu avance

> 💭 **Reto:** nombra tres preguntas de operación que ahora respondes leyendo el esquema de Marten/Wolverine agentless, con su tabla y columna. ¿Por qué "solo lectura" no es solo higiene sino parte de qué significa *observar*?

```bash
git add .
git commit -m "ES · Observar el motor nuevo (agentless sobre el esquema de Marten/Wolverine)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un motor event-sourced sobre Postgres no es una caja negra: su estado vive en tablas (`mt_streams`, `mt_events`, `mt_event_progression`, `wolverine_dead_letters`) que lees **solo-lectura** sin instrumentar la app —observabilidad *agentless*, donde el solo-lectura separa observar de alterar—; las consultas que escribes son la lógica que el monitor CosmosLens que te dimos vuelve tableros, cerrando la pieza que faltaba: medir cómo respira el sistema.

---

[⬅️ Volver: El contexto que falta](./el-contexto-que-falta.md)

[➡️ Siguiente: El comentario que sobrevive](./el-comentario-que-sobrevive.md)
