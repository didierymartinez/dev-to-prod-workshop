# Rejugar el diario: reconstruir la vista

En la sección anterior arreglaste la vista ciega **volviendo a sembrar** las empresas. Funcionó porque son cuatro y de juguete. Hoy vas a ver por qué eso no es una salida — y cuál sí.

## 🎯 El Objetivo

Poder **rellenar la vista con lo que ya pasó** —cuando le cambies la forma o se desincronice— sin volver a ejecutar nada del pasado.

## 💥 El dolor: la vista cambia de forma y el pasado no vuelve

Operaciones pide un dato más: junto a cada empresa suspendida, **su plan** (para saber a quién llamar primero). El plan lo tienes en la `Empresa`; solo hay que llevarlo a la vista.

Le añades la columna y haces que la proyección la guarde:

```sql
ALTER TABLE empresas_estado ADD COLUMN plan TEXT NOT NULL DEFAULT '';
```

Consultas las suspendidas con su plan:

> 🔮 La columna existe y `Actualizar` ya la escribe. Antes de consultar: ¿qué plan esperas ver en emp-2 y emp-4? Pista: ¿CUÁNDO corre `Actualizar`?

```
emp-2 → plan=''
emp-4 → plan=''
```

Vacío. La columna existe, tu código ya la escribe… pero **estas empresas no van a volver a pasar por un handler**: la vista solo se actualiza **cuando algo pasa**, y a una empresa suspendida puede no pasarle nada en meses. Su plan quedaría en blanco todo ese tiempo.

Y el truco de la sección anterior —volver a sembrar— aquí ya no sirve, por una razón de fondo: **los comandos del pasado ya se ejecutaron**. Volver a ejecutarlos no "actualiza" nada; **anexaría los hechos otra vez** al diario (otra suspensión, otro pago) y corrompería la historia. El pasado no se re-ejecuta.

Pero el pasado **está**. Todo lo que necesitas para llenar esa columna —el plan de cada empresa— ya está guardado en el diario. Lo que te falta es una forma de **volver a derivar la vista** a partir de él.

## 🔧 Vaciar la vista y rejugar el diario

Si la vista es solo una conclusión sacada de los hechos, puedes **tirarla y volver a sacarla**: borras sus filas, recorres las empresas del diario, rehidratas cada una y la reflejas en la vista con el mismo `Actualizar` que ya usas. No hay pieza nueva de dominio: es lo que ya sabes hacer, ahora aplicado a **todas** las empresas de una pasada.

```csharp
vista.Reconstruir();     // borra la vista y la vuelve a derivar del diario
```

Para eso, la proyección necesita poder **pedirle el diario al almacén** — hasta ahora solo recibía datos, ahora tiene que ir a buscarlos.

> [!NOTE]
> 🆕 **SQL: vaciar una tabla y añadirle una columna.**
> - `DELETE FROM empresas_estado` borra todas las filas (la tabla sigue existiendo, con su forma).
> - `ALTER TABLE t ADD COLUMN plan TEXT NOT NULL DEFAULT ''` le añade una columna a una tabla que ya tiene datos; el `DEFAULT` es lo que queda en las filas viejas — y por eso salen en blanco.

> 🛠️ **Inténtalo tú.** (1) Añade la columna `plan` a `empresas_estado` con el `ALTER TABLE`, y que `Actualizar` la escriba también (el agregado ya tiene `Plan`). (2) La proyección recibe ahora el `EventStore` por constructor —lo necesita para leer el diario—; pásaselo donde la creas. (3) Escribe `Reconstruir()`: borra las filas de la vista y, por cada id que devuelve `TodosLosStreams()`, rehidrata la empresa (`AbrirStream<Empresa>(id).Get()`) y llama `Actualizar`. (4) Para poder comprobarlo, un `ListarConPlan()` que devuelva las suspendidas con su plan.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Suspendidas
{
    private readonly string _cadena;
    private readonly EventStore _store;        // 🔁 nuevo: para poder rejugar el diario

    public Suspendidas(string cadena, EventStore store)
    {
        _cadena = cadena; _store = store;
        Exec(@"CREATE TABLE IF NOT EXISTS empresas_estado (
                   id TEXT PRIMARY KEY, suspendida BOOL NOT NULL,
                   plan TEXT NOT NULL DEFAULT '');");
    }

    private void Exec(string sql, params (string, object)[] ps)
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        cmd.ExecuteNonQuery();
    }

    // 🔁 igual que antes, pero ahora también refleja el plan
    public void Actualizar(string id, Empresa e)
        => Exec(@"INSERT INTO empresas_estado(id, suspendida, plan)
                  VALUES(@id, @s, @p)
                  ON CONFLICT(id) DO UPDATE SET suspendida = @s, plan = @p",
                ("id", id), ("s", e.Suspendida), ("p", e.Plan));

    // lo nuevo: tirar la vista y volver a derivarla del diario
    public void Reconstruir()
    {
        Exec("DELETE FROM empresas_estado");
        foreach (var id in _store.TodosLosStreams())
            Actualizar(id, _store.AbrirStream<Empresa>(id).Get());   // rehidrata y refleja
    }

    public List<(string Id, string Plan)> ListarConPlan()
    {
        using var c = new NpgsqlConnection(_cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id, plan FROM empresas_estado WHERE suspendida ORDER BY id";
        var filas = new List<(string, string)>();
        using var r = cmd.ExecuteReader();
        while (r.Read()) filas.Add((r.GetString(0), r.GetString(1)));
        return filas;
    }

    // Listar() sigue como estaba.
}
```

```csharp
// donde la creabas, ahora recibe el store:
var vista = new Suspendidas(cadena, store);
```
</details>

## La vista se vuelve a derivar

Corre `Reconstruir()` y vuelve a consultar:

```
emp-2 → plan='Premium'
emp-4 → plan='Enterprise'
```

La columna se llenó **sin que pasara nada nuevo** en el negocio: los planes salieron del diario, donde llevaban guardados desde el día en que cada empresa se registró. Y fíjate que `emp-3` **no** aparece: reconstruir no copia hechos sueltos, **vuelve a plegar** la historia de cada empresa — y la de `emp-3` termina en "reactivada", así que hoy no está suspendida.

Córrelo dos veces seguidas: el resultado es idéntico. No hay nada que "se acumule mal", porque cada pasada **empieza borrando** y deriva todo otra vez desde la única fuente que importa.

> 🌱 Dos incomodidades que quedan. **Una:** `Reconstruir()` lo corres **a mano**, y rehidrata **todas** las empresas — con cuatro no se siente, con diez mil y años de historia cada cambio de forma se vuelve un proceso largo. **Dos:** para el día a día seguimos igual de frágiles: cada handler tiene que acordarse de llamar `Actualizar`, y si el proceso muere entre el `Append` y el `Actualizar`, el diario avanza y la vista se queda atrás **sin que nadie se entere**. Lo que falta es que la vista **se mantenga sola**, leyendo el diario por su cuenta — y para eso tendrá que saber **hasta dónde ya leyó**. Ese es el próximo dolor.

---

### El Descubrimiento

Hay una asimetría que vale la pena grabarse: **los hechos no se pueden re-ejecutar, pero las conclusiones sí se pueden re-derivar**. Volver a lanzar los comandos del pasado corrompería el diario (anexaría los hechos otra vez); en cambio la vista se puede **borrar y rehacer** cuantas veces quieras, porque no es un dato original: es una lectura de los hechos. Por eso cambiarle la forma a una vista —una columna nueva, otro agrupamiento, una vista entera nueva— dejó de dar miedo: lo que el negocio pida, se deriva otra vez del diario. Lo único que no puedes perder es el diario.

---

## ✅ Compruébalo

- [ ] Tras el `ALTER TABLE`, consultas las suspendidas y su `plan` sale **en blanco**; explicas por qué (la vista se actualiza cuando algo pasa, y a esas empresas no les ha pasado nada).
- [ ] Corres `Reconstruir()` y el `plan` de cada suspendida aparece, sin que hayas ejecutado ningún comando de negocio.
- [ ] `Reconstruir()` dos veces seguidas da el mismo resultado. Explica por qué (pista: cada pasada empieza borrando).
- [ ] Una empresa que se suspendió y luego se reactivó **no** aparece tras el rebuild. Explica qué hace `Reconstruir()` con su historia.
- [ ] Explica por qué volver a ejecutar los comandos del pasado **no** es una alternativa a reconstruir.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

Primero, deja en tu `DECISIONES.md` la decisión de hoy — y al lado, el costo que aceptaste: mientras rejuega, la vista está vacía, y el proceso crece con la historia:

> Reconstruir = borrar TODO y re-derivar del diario, no parchar las filas incompletas.

> 💭 **Reto:** ¿por qué la vista se puede borrar y rehacer sin miedo, mientras que los comandos del pasado no se pueden volver a ejecutar? ¿Qué dice eso sobre cuál de los dos es la verdad?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Rejugar el diario: reconstruir la vista" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Los hechos no se re-ejecutan, pero las conclusiones **sí se re-derivan**: la vista se borra y se vuelve a sacar del diario (`Reconstruir()`), así que cambiarle la forma —o rellenarla cuando se quedó atrás— deja de ser un problema; lo único que no puedes perder es el diario.

---

[⬅️ Volver: La pregunta que el diario no sabe responder](./la-vista-de-lectura.md)

➡️ *Siguiente: reconstruir a mano no sirve para el día a día, y mantener la vista a pulso es frágil — falta que se mantenga sola sabiendo hasta dónde leyó. Ese dolor se vive a continuación, sin plano por delante ([método](../CRITTERWATCH-BRUJULA.md)).*
