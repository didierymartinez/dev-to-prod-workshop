# El mensaje y la cola

Ese `Action<string> publicar` de la sección pasada es una **llamada a un método**: funciona porque el consumidor vive en tu mismo proceso. Con facturación no funciona.

## 🎯 El Objetivo

Ver qué garantías da una **cola** —un transporte entre procesos— que una llamada a un método no da. Y por qué armar esas garantías a mano termina siendo reescribir un sistema de mensajería completo.

## 💥 El dolor: dos consumidores, el mismo mensaje, dos veces

Un método que llama a otro no cruza la frontera de un proceso: facturación corre en **otra** máquina y no está en tu memoria para que la llames. El mensaje tiene que **viajar**, y lo único que puede es la tabla `bandeja_salida`: quien quiera el anuncio la **sondea**.

En [El evento público](./el-evento-publico.md) tu `EntregarPendientes` era **un** relay, en tu proceso. Ahora súbelo a dos —dos instancias para no quedarte corto, o facturación misma sondeando la tabla—: **dos lectores compitiendo por las mismas filas**. Sin nada que los coordine, ambos hacen el mismo `SELECT ... WHERE NOT entregado` **antes** de que ninguno marque:

```
consumidor A → {1, 2, 3}
consumidor B → {1, 2, 3}     (nadie marcó todavía)
→ los tres mensajes se entregan DOS veces
```

El atajo de tenerlo en tu mismo proceso escondía el problema: con un solo lector, nadie competía. En cuanto el mensaje **viaja** a otro proceso, aparecen todas las preguntas que una cola de verdad ya respondió.

## 🔧 Una pieza real: reclamar la fila

La primera: que dos consumidores no agarren la misma fila. Postgres tiene justo eso — `FOR UPDATE SKIP LOCKED`: cada consumidor **bloquea** las filas que toma y **salta** las que otro ya bloqueó.

> 🆕 **Una cola es un transporte con garantías, no una tabla que sondeas.** Lo que hiciste —sondear `bandeja_salida`— es una cola de juguete; una de verdad es un **canal** entre procesos que promete lo que un método no: entrega **reclamada** (un mensaje, un consumidor), reintento, orden, sobrevivir reinicios. La primera de esas garantías, el *claim*, sí se la puedes pedir a Postgres: `SELECT ... FOR UPDATE SKIP LOCKED` **bloquea** las filas que un consumidor toma y **salta** las que otro ya bloqueó. Ese bloqueo dura lo que dure la transacción (por eso el `SELECT` va dentro de una); `FOR UPDATE` a secas *esperaría* a que el otro libere — `SKIP LOCKED` en cambio *salta* y sigue.

> 🛠️ **Inténtalo tú.** Reescribe la entrega de tu `EntregarPendientes` (en `PostgresEventStore`) para que **reclame de a una**: en vez de leer todo, toma **una** fila con `FOR UPDATE SKIP LOCKED LIMIT 1`, la procesa y la marca, todo en una transacción. Arranca **dos** de esos consumidores a la vez (dos `Task`, o dos veces el programa) contra la misma tabla, y confirma que entre los dos reclaman **todas** las filas **sin repetir ninguna**.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// un consumidor: reclama UNA fila, la procesa y la marca, dentro de su transacción
long ReclamarYEntregar(Action<string> publicar)
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var tx = c.BeginTransaction();
    long id; string mensaje;
    using (var q = c.CreateCommand())                 // el lector se cierra antes del UPDATE (el detalle de Npgsql de §26)
    {
        q.Transaction = tx;
        q.CommandText = "SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1";
        using var r = q.ExecuteReader();
        if (!r.Read()) return -1;                      // nada que reclamar
        id = r.GetInt64(0); mensaje = r.GetString(1);
    }
    publicar(mensaje);                                 // efecto externo
    using (var u = c.CreateCommand())
    {
        u.Transaction = tx;
        u.CommandText = "UPDATE bandeja_salida SET entregado = true WHERE id = @id";
        u.Parameters.AddWithValue("id", id);
        u.ExecuteNonQuery();
    }
    tx.Commit();                                       // aquí se libera el lock
    return id;
}
```

```csharp
// dos consumidores compitiendo: cada uno vacía la cola reclamando de a una
var A = Task.Run(() => { while (ReclamarYEntregar(m => Recibir("A", m)) != -1) { } });
var B = Task.Run(() => { while (ReclamarYEntregar(m => Recibir("B", m)) != -1) { } });
Task.WaitAll(A, B);
// con 4 filas → uno reclama {2,4} y el otro {1,3} (o el reparto que toque): las 4, ninguna dos veces
```

Es el `EntregarPendientes` de [El evento público](./el-evento-publico.md), ahora reclamando de a una con lock en vez de leer todo de golpe.

</details>

## 🔨 Rómpelo: el claim es una piedra, no el muro

Pusiste **una** garantía. Mira las que faltan, y que cada una es otra pieza igual de delicada:

- **Ack, no "marca y reza".** ¿Marcas `entregado` **antes** o **después** de que facturación confirme? Antes: si el consumidor cae al procesar, el mensaje se **pierde**. Después: si caes entre procesar y marcar, se **reentrega**. No hay "exactamente una vez" gratis — lo mejor que consigues es *at-least-once*, y vivir con duplicados.
- **Reintento con backoff.** Un fallo transitorio (facturación caída un minuto) no debe descartar el mensaje ni martillarlo mil veces por segundo.
- **Dead-letter.** Un mensaje envenenado que nunca procesa no puede bloquear la cola — apártalo (lo viviste con el proyector en [El proyector tropieza](./el-proyector-tropieza.md), ahora para el transporte).
- **Orden, fan-out, backpressure, sobrevivir reinicios.** Entregar en orden; que varios interesados reciban el mismo anuncio; no ahogar a un consumidor lento; retomar tras un reinicio sin perder ni repetir.

Cada una tiene su `SELECT ... SKIP LOCKED` equivalente, y todas juntas, correctas y probadas, son un **broker de mensajes**. Puedes construirlo — pero es un proyecto, no una tarde, y es fácil equivocarse en silencio.

¿Y por qué no tomar un broker que ya existe (RabbitMQ y compañía) ahora mismo? Podrías —están hechos justo para esto—; armar el claim a mano no fue para reemplazarlos, sino para **sentir** qué te dan. Y hay algo mejor todavía: ni siquiera hace falta un broker aparte, porque la Postgres que ya tienes puede ser la cola.

## El Descubrimiento

Es el momento de [Todo o nada](./todo-o-nada.md) otra vez, ahora para el transporte. Allí "las dos o ninguna" resultó ser una **transacción**, algo que le pertenece a una base de datos y no a tu código. Aquí "que el mensaje viaje entre procesos, reclamado, sin perderse, con reintento y dead-letter" es una **cola durable** — algo que le pertenece a un transporte, no a tu bucle de `SELECT`. Reclamar la fila con `SKIP LOCKED` es una piedra de verdad; el muro entero es un broker. La salida madura no es armarlo: es reconocer que ya existe hecho y correcto.

> 🌱 Mira todo lo que llevas reconstruido a mano: proyector, checkpoint, las claves primarias que protegen orden y unicidad, la transacción del outbox, y ahora el arranque de una cola. Cada pieza fue el trabajo de una base de datos o un transporte, no tuyo. Existe una pareja de librerías —una para el diario y sus proyecciones, otra para los mensajes y transportes— que ya trae todo eso, atómico y correcto, **sobre la misma Postgres que ya usas** (incluida una cola en la propia base, sin broker aparte). No las adoptas por moda: las adoptas por **alivio**, cuando reconoces que reescribiste —peor— lo que ellas ya resolvieron. Ese reconocimiento es lo que sigue: [El swap por reconocimiento](./el-swap-por-reconocimiento.md).

## ✅ Compruébalo

- [ ] Con dos consumidores sin claim, el mismo mensaje se entrega dos veces (ambos lo leen antes de marcar).
- [ ] Con `FOR UPDATE SKIP LOCKED`, dos consumidores reclaman filas **distintas** — ninguno agarra la que el otro bloqueó.
- [ ] Sabes nombrar al menos cuatro garantías más que una cola da y tu bucle de `SELECT` no (ack/at-least-once, reintento, dead-letter, orden…).
- [ ] Sabes decir por qué "una cola durable" es a un transporte lo que "una transacción" fue a la base: algo que no te toca reimplementar.

## 🆘 Si algo salió mal

- **Los dos consumidores siguen agarrando la misma fila:** te falta `FOR UPDATE SKIP LOCKED`, o el `SELECT` no está dentro de una transacción (el lock vive mientras la transacción esté abierta).
- **Un consumidor se queda esperando en vez de saltar:** usaste `FOR UPDATE` sin `SKIP LOCKED` — eso **bloquea** hasta que el otro libere, en vez de saltar la fila. Necesitas `SKIP LOCKED`.
- **Perdiste un mensaje al caer:** marcaste `entregado` antes de que el consumidor confirmara. Ese es justo el problema *at-least-once* que ninguna solución a mano resuelve del todo — motivo del swap.

## 📓 Registra tu avance

> 💭 **Reto:** enumera las garantías que una cola durable da y que tu `SELECT`-a-mano no. Para dos de ellas, describe el caso de caída concreto que rompe la versión casera. ¿Por qué "exactamente una vez" no es una opción real?

```bash
git add .
git commit -m "ES · El mensaje y la cola (el muro del transporte)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una llamada a un método no cruza procesos, así que el anuncio viaja por una **cola**: un transporte con garantías —claim, at-least-once, reintento, dead-letter, orden— de las que solo puedes armar a mano la primera (`FOR UPDATE SKIP LOCKED`) antes de darte cuenta de que el resto es reescribir un broker; igual que "todo o nada" era una transacción, "que el mensaje viaje sin perderse" es una cola durable, y no te toca reimplementarla.

---

[⬅️ Volver: El evento público](./el-evento-publico.md)

[➡️ Siguiente: El swap por reconocimiento](./el-swap-por-reconocimiento.md)
