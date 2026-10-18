# El mensaje y la cola

Ese `Action<string> publicar` de la sección pasada es una **llamada a un método**: funciona porque el consumidor vive en tu mismo proceso. Con facturación no funciona.

## 🎯 El Objetivo

Ver qué garantías da una **cola** —un transporte entre procesos— que una llamada a un método no da. Y por qué armar esas garantías a mano termina siendo reescribir un sistema de mensajería completo.

## 💥 El dolor: dos consumidores, el mismo mensaje, dos veces

Un método que llama a otro no cruza la frontera de un proceso: facturación corre en **otra** máquina y no está en tu memoria para que la llames. El mensaje tiene que **viajar**, y hoy solo sale de la tabla `bandeja_salida`: tu relay la **sondea** y se lo entrega a facturación.

En [El evento público](./el-evento-publico.md) tu `EntregarPendientes` era **un** relay, en tu proceso. Ahora súbelo a dos —dos instancias para no quedarte corto—: **dos lectores compitiendo por las mismas filas**. Sin nada que los coordine, ambos hacen el mismo `SELECT ... WHERE NOT entregado` **antes** de que ninguno marque:

```
consumidor A → {1, 2, 3}
consumidor B → {1, 2, 3}     (nadie marcó todavía)
→ los tres mensajes se entregan DOS veces
```

Con un solo lector en tu proceso, nadie competía. En cuanto el mensaje **viaja** a otro proceso, aparecen todas las preguntas que una cola de verdad ya respondió.

## 🔧 Una pieza real: reclamar la fila

> 🆕 **Una cola es un transporte con garantías, no una tabla que sondeas.** Sondear `bandeja_salida` es una cola de juguete; una de verdad es un **canal** entre procesos que promete lo que un método no: entrega **reclamada** (un mensaje, un consumidor), reintento, orden, sobrevivir reinicios. La primera, el *claim*, sí se la puedes pedir a Postgres: `SELECT ... FOR UPDATE SKIP LOCKED` **bloquea** las filas que un consumidor toma y **salta** las que otro ya bloqueó. Ese bloqueo dura lo que dure la transacción (por eso el `SELECT` va dentro de una); `FOR UPDATE` a secas *esperaría* a que el otro libere.

> 🛠️ **Inténtalo tú.** Reescribe la entrega de tu `PostgresEventStore` para que **reclame de a una**:
>
> **(1)** Un método `public long ReclamarYEntregar(Action<string> publicar)`: en vez de leer todo, toma **una** fila con `FOR UPDATE SKIP LOCKED LIMIT 1`, la publica y la marca, todo en una transacción. Devuelve el id de la fila, o `-1` si no quedaba ninguna. Es `public` porque lo llama tu `Program.cs`. **(2)** `EntregarPendientes(publicar)` queda como un bucle que llama a `ReclamarYEntregar` hasta el `-1` y cuenta las filas: tu test de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) la sigue usando. **(3)** Para tener qué repartir, deja cuatro filas pendientes desde `psql`: `INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3'), ('m4');`. **(4)** En tu `Program.cs`, deja la cadena y el `store`, y en lugar de los pasos de [El evento público](./el-evento-publico.md) arranca **dos** consumidores a la vez (dos `Task`, o dos veces el programa) contra la misma tabla. Confirma que entre los dos reclaman **todas** las filas **sin repetir ninguna**. Para ver el reparto, que cada consumidor escriba su nombre junto al mensaje que recibe.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// PostgresEventStore: un consumidor reclama UNA fila, la publica y la marca, dentro de su transacción
public long ReclamarYEntregar(Action<string> publicar)   // public: lo llama tu Program.cs
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var tx = c.BeginTransaction();
    long id; string mensaje;
    using (var q = c.CreateCommand())                 // el lector se cierra antes del UPDATE (el detalle de Npgsql de §28)
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

// la entrega de siempre, ahora un bucle sobre el claim
public int EntregarPendientes(Action<string> publicar)
{
    var entregadas = 0;
    while (ReclamarYEntregar(publicar) != -1) entregadas++;
    return entregadas;
}
```

```csharp
// Program.cs: dos consumidores compitiendo; cada uno vacía la cola reclamando de a una
void Recibir(string quien, string m) => Console.WriteLine($"{quien}: {m}");   // dice qué consumidor recibió cada mensaje
var A = Task.Run(() => { while (store.ReclamarYEntregar(m => Recibir("A", m)) != -1) { } });
var B = Task.Run(() => { while (store.ReclamarYEntregar(m => Recibir("B", m)) != -1) { } });
Task.WaitAll(A, B);
// con las 4 filas → A: m1 · B: m2 · A: m3 · B: m4 (o el reparto que toque): las 4, ninguna dos veces
```

</details>

## 🔨 Rómpelo: el claim sin `ORDER BY`

Tu claim lleva `ORDER BY id`. Sin él, Postgres suele devolver las filas en el orden en que entraron, pero no lo garantiza. Fíjalo en un test, con el arnés de [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md), cuyo fixture ya crea y vacía `bandeja_salida`. El test llama a tu `ReclamarYEntregar` como tu `Program.cs`.

```csharp
[Collection("postgres")]
public class ElMensajeYLaCola(PostgresFixture db) : IAsyncLifetime
{
    public Task InitializeAsync() { db.Limpiar(); return Task.CompletedTask; }
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public void El_claim_toma_la_mas_vieja()
    {
        db.Ejecutar("INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3')");
        db.Ejecutar("UPDATE bandeja_salida SET entregado = false WHERE mensaje = 'm1'");   // un reintento vuelve a marcar la primera

        var recibidos = new List<string>();
        new PostgresEventStore(db.Cadena).ReclamarYEntregar(m => recibidos.Add(m));

        Assert.Equal(new[] { "m1" }, recibidos);
    }
}
```

Verde. Ahora quita el `ORDER BY id` del claim y corre otra vez: rojo, con `Expected: ["m1"]` y `Actual: ["m2"]`. El `UPDATE` no le cambió ningún dato a `m1`, pero la movió de lugar. En Postgres, un `UPDATE` escribe una versión nueva de la fila en otro sitio de la tabla. Míralo en `psql` sobre la base de pruebas (`docker exec -it empresas-db psql -U postgres -d empresas_tests`). La columna `ctid` es la posición física de cada fila: página y lugar.

```sql
TRUNCATE bandeja_salida;
INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3');
SELECT ctid, mensaje FROM bandeja_salida;   -- (0,1) m1 · (0,2) m2 · (0,3) m3
UPDATE bandeja_salida SET entregado = false WHERE mensaje = 'm1';
SELECT ctid, mensaje FROM bandeja_salida;   -- (0,2) m2 · (0,3) m3 · (0,4) m1
```

Sin `ORDER BY`, Postgres devuelve las filas en el orden en que las encuentra al recorrer la tabla, y cada `UPDATE` cambia ese orden: una fila que se reintenta una y otra vez queda siempre al final. Devuelve el `ORDER BY id`: el orden lo pide la consulta.

El claim consume la fila que toma: la marca `entregado`. Un sondeo que solo lee no consume nada: si revisa cada minuto 50 empresas suspendidas con `LIMIT 50`, sin orden puede leer siempre las mismas 50 y no llegar nunca a las demás. Ahí, además del `ORDER BY`, hace falta un cursor: guardar el último id leído y pedir `WHERE id > @ultimo ORDER BY id LIMIT 50`. Es el checkpoint de [La vista se mantiene sola](./la-vista-se-mantiene-sola.md): `seq > ultimo_seq`, `ORDER BY seq`.

## 🔨 Rómpelo: el claim es una piedra, no el muro

Pusiste **una** garantía. Mira las que faltan, y que cada una es otra pieza igual de delicada:

- **Ack, no "marca y reza".** ¿Marcas `entregado` **antes** o **después** de que facturación confirme? Antes: si el consumidor cae al procesar, el mensaje se **pierde**. Después: si caes entre procesar y marcar, se **reentrega**. No hay "exactamente una vez" gratis — lo mejor que consigues es *at-least-once*, y vivir con duplicados.
- **Reintento con backoff.** Un fallo transitorio (facturación caída un minuto) no debe descartar el mensaje ni martillarlo mil veces por segundo.
- **Dead-letter.** Un mensaje envenenado que nunca procesa no puede bloquear la cola — apártalo (lo viviste con el proyector en [El proyector tropieza](./el-proyector-tropieza.md), ahora para el transporte).
- **Orden, fan-out, backpressure, sobrevivir reinicios.** Entregar en orden; que varios interesados reciban el mismo anuncio; no ahogar a un consumidor lento; retomar tras un reinicio sin perder ni repetir.

Cada una tiene su `SELECT ... SKIP LOCKED` equivalente, y todas juntas, correctas y probadas, son un **broker de mensajes**. Puedes construirlo, pero es un proyecto, no una tarde, y es fácil equivocarse en silencio.

¿Por qué no tomar ya un broker que existe (RabbitMQ y compañía)? Podrías tomarlo: armar el claim a mano fue para **sentir** qué te dan, no para reemplazarlos.

## El Descubrimiento

Es el momento de [Todo o nada](./todo-o-nada.md) otra vez, ahora para el transporte. Allí "las dos o ninguna" resultó ser una **transacción**, algo que le pertenece a una base de datos y no a tu código. Aquí "que el mensaje viaje entre procesos, reclamado, sin perderse, con reintento y dead-letter" es una **cola durable**, algo que le pertenece a un transporte. Reclamar la fila con `SKIP LOCKED` es una piedra de verdad; el muro entero es un broker, y la salida madura es reconocer que ya existe hecho y correcto.

> 🌱 Llevas reconstruido a mano el proyector, el checkpoint, las claves primarias que protegen orden y unicidad, la transacción del outbox, y ahora el arranque de una cola. Existe una pareja de librerías —una para el diario y sus proyecciones, otra para los mensajes y transportes— que ya trae todo eso, atómico y correcto, **sobre la misma Postgres que ya usas** (incluida una cola en la propia base, sin broker aparte). Las adoptas por **alivio**, cuando reconoces que reescribiste —peor— lo que ellas ya resolvieron: [El swap por reconocimiento](./el-swap-por-reconocimiento.md).

## ✅ Compruébalo

- [ ] Sin claim, dos consumidores entregan el mismo mensaje dos veces; con `FOR UPDATE SKIP LOCKED`, reclaman filas **distintas**.
- [ ] Sin `ORDER BY id`, `El_claim_toma_la_mas_vieja` cae: tras el `UPDATE` sobre `m1`, el claim toma `m2`. Con `ORDER BY id`, toma `m1`.
- [ ] Sabes decir por qué un sondeo que no consume filas necesita, además del `ORDER BY`, un cursor que avanza.
- [ ] Sabes nombrar al menos cuatro garantías más que una cola da y tu bucle de `SELECT` no (ack/at-least-once, reintento, dead-letter, orden…).
- [ ] Sabes decir por qué "una cola durable" es a un transporte lo que "una transacción" fue a la base: algo que no te toca reimplementar.

## 🆘 Si algo salió mal

- **Los dos consumidores siguen agarrando la misma fila:** te falta `FOR UPDATE SKIP LOCKED`, o el `SELECT` no está dentro de una transacción (el lock vive mientras la transacción esté abierta).
- **Un consumidor se queda esperando en vez de saltar:** usaste `FOR UPDATE` sin `SKIP LOCKED`, que **bloquea** hasta que el otro libere.
- **Tu test de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) ya no compila:** reemplazaste `EntregarPendientes` por `ReclamarYEntregar`. Conserva `EntregarPendientes(publicar)` como un bucle que llama a `ReclamarYEntregar` hasta que devuelva `-1`, y que cuente las filas entregadas.

## 📓 Registra tu avance

> 💭 **Reto:** enumera las garantías que una cola durable da y que tu `SELECT`-a-mano no. Para dos de ellas, describe el caso de caída concreto que rompe la versión casera. ¿Por qué "exactamente una vez" no es una opción real?

```bash
git add .
git commit -m "ES · El mensaje y la cola (el muro del transporte)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una llamada a un método no cruza procesos, así que el anuncio viaja por una **cola**: un transporte con garantías (claim, at-least-once, reintento, dead-letter, orden). A mano solo armas la primera (`FOR UPDATE SKIP LOCKED`); el resto es reescribir un broker. Igual que "todo o nada" era una transacción, "que el mensaje viaje sin perderse" es una cola durable, y no te toca reimplementarla. Y un lote lleva `ORDER BY`: sin él, cada `UPDATE` cambia el orden de la tabla y el claim deja de tomar la fila más vieja.

---

[⬅️ Volver: El evento público](./el-evento-publico.md)

[➡️ Siguiente: El swap por reconocimiento](./el-swap-por-reconocimiento.md)
