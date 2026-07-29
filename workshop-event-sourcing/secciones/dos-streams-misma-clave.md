# Dos streams, la misma clave

Acabas de darle a tu almacén un puerto propio. Ahora el negocio te trae un cabo que [Todo o nada](./todo-o-nada.md) dejó abierto: identifica a cada empresa por su **NIT**, y garantizar que no haya dos con el mismo NIT resulta ser un problema que la concurrencia optimista no resuelve — y que cerrarás dándole una capacidad más a ese store.

## 🎯 El Objetivo

Garantizar que **no existan dos empresas con el mismo NIT**, aun con dos registros simultáneos — una invariante que vive **entre** streams, no dentro de uno.

## 💥 El dolor: leer-antes-de-escribir es una apuesta, no una garantía

Primero, la pregunta obvia: **¿por qué no usar el NIT como id del stream?** Lo viste funcionar en la [Prueba 3 de Todo o nada](./todo-o-nada.md): dos nacimientos del mismo id chocan contra el `PRIMARY KEY(stream, version)`, y solo uno entra. Si el id fuera el NIT, estarías listo.

Pero el id de un stream es la **identidad interna y permanente** de la empresa: todos sus hechos lo referencian para siempre, así que tiene que ser **estable** —no puede cambiar nunca—. El NIT no cumple: puede escribirse mal y **corregirse**, o puede que registres la empresa **antes** de confirmarlo. Atar la identidad a un dato que un día cambia es quedar atrapado. Así que el id se queda como un id interno estable (`emp-7`), y el NIT es **dato de negocio**, aparte.

Y ahí aparece el hueco. Al registrar, el reflejo para no duplicar es preguntar antes:

```csharp
if (store.HayEmpresaConNit(nit)) throw new ReglaDeNegocioException("NIT ya registrado");   // pseudocódigo: la trampa
// no existe → la creo con su id interno
```

Funciona en tu máquina. Pero llegan **dos** registros con el mismo NIT a la vez: ambos preguntan "¿existe?", ambos leen "no", y ambos crean — con **ids distintos**. Dos streams, el mismo NIT, ninguna excepción.

```
streams con NIT 900123 → 2
```

Y la concurrencia optimista de [Concurrencia optimista](./concurrencia-optimista.md) **no te salva**: esa protege un **stream** (rechaza dos escrituras en la misma versión del *mismo* id). Pero estas son dos empresas con ids **distintos**: cada una es la versión 1 de su propio stream, las dos legales. La invariante rota no es de un stream — es del **conjunto**: "un NIT, una empresa". Leer-antes-de-escribir es una apuesta con una ventana: entre tu `if` y tu creación, otro se cuela.

## 🔧 Reservar el NIT, atómicamente, en el store

Una invariante de conjunto solo la sostiene quien puede decidir de forma **atómica** — Postgres, con una restricción de unicidad. No sobre `eventos` (ahí el NIT vive enterrado en el JSONB, y una restricción ahí aplicaría a cada hecho con ese campo, no al conjunto de empresas), sino sobre un índice aparte: una tabla **NIT → stream**, con el NIT de `PRIMARY KEY`, escrita **en la misma transacción** que los primeros hechos de la empresa.

> 🆕 **El localizador (clave de negocio → stream).** Una tabla `localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL)`. El store la escribe **en la misma transacción** que los eventos del registro: si el NIT ya está, la `PRIMARY KEY` rechaza el `INSERT` (`23505`) y **toda** la transacción se revierte — ni localizador ni eventos. La unicidad la hace cumplir la base, no un `if`. Y fíjate: el localizador es un índice **mutable** —si mañana el NIT se corrige, actualizas su fila—, mientras que el id del stream, al ser la identidad, jamás se reescribe. Por eso la unicidad del NIT va sobre un índice aparte y no sobre el id.

¿Dónde vive ese `INSERT`? En [El puerto propio](./el-puerto-propio.md) sacaste `Npgsql` del dominio: los handlers solo hablan con `IEventStore`. Así que la reserva del NIT **no** puede ser SQL crudo en un handler — es una capacidad del **store**. El puerto gana un método para el único caso que la necesita: **crear** un stream nuevo reservando su clave de negocio.

> 🛠️ **Inténtalo tú, en tres pasos.**
> 1. **Añade el NIT al hecho.** Cambia `EmpresaRegistrada(Nombre, Plan)` → `EmpresaRegistrada(Nit, Nombre, Plan)` y `Registrar(nombre, plan)` → `Registrar(nit, nombre, plan)`. *(Sí: estás cambiando la forma de un hecho — guarda esa incomodidad, es el próximo dolor.)*
> 2. **Dale al puerto un método de creación.** Agrega a `IEventStore` un `void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos)`. Recibe los **hechos crudos** (los mismos de `SinConfirmar`), porque un stream nuevo se numera trivial: versiones `1..N`. En `PostgresEventStore`, dentro de **una** transacción: `INSERT` en `localizador(nit, id)` + los eventos numerados desde 1 (con tu `NombreDe` de siempre); atrapa `PostgresException` con `SqlState == "23505"` y lánzalo como un `NitYaExisteException`. En `InMemoryEventStore` (tu doble), replica **la misma garantía** con un diccionario NIT→id — o el verde mentirá, como viste en el puerto.
> 3. **Registra por ahí.** Crea la empresa, emite su `Registrar(nit, …)`, y persiste con `store.GuardarNuevo(id, nit, e.SinConfirmar)` (en vez de `Append`). Si captura `NitYaExisteException`, no crea un hecho nuevo — de eso trata el 🔨.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL);
```

```csharp
// en PostgresEventStore : IEventStore  (misma mecánica de INSERT que tu Guardar de Todo o nada)
public void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos)
{
    using var c = new NpgsqlConnection(_cadena); c.Open();
    using var tx = c.BeginTransaction();
    try
    {
        using (var l = c.CreateCommand())                        // 1) reserva el NIT
        {
            l.Transaction = tx;
            l.CommandText = "INSERT INTO localizador(nit, stream) VALUES(@n, @s)";
            l.Parameters.AddWithValue("n", nit);
            l.Parameters.AddWithValue("s", id);
            l.ExecuteNonQuery();
        }
        int version = 0;
        foreach (var hecho in hechos)                            // 2) los hechos, versiones 1..N, misma tx
        {
            using var cmd = c.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES(@s, @v, @t, @d::jsonb)";
            cmd.Parameters.AddWithValue("s", id);
            cmd.Parameters.AddWithValue("v", ++version);
            cmd.Parameters.AddWithValue("t", NombreDe(hecho.GetType()));
            cmd.Parameters.AddWithValue("d", JsonSerializer.Serialize(hecho, hecho.GetType()));
            cmd.ExecuteNonQuery();
        }
        tx.Commit();
    }
    catch (PostgresException e) when (e.SqlState == "23505")     // el NIT ya estaba
    {
        throw new NitYaExisteException($"NIT {nit} ya registrado");   // tx se revierte: ni localizador ni eventos
    }
}
```

Y el registro que lo usa —el id interno lo eliges al crear (aquí un literal; en producción, un `Guid` fresco)—:

```csharp
var e = new Empresa();
e.Registrar(nit, "Constructora Andes", "Premium");   // emite EmpresaRegistrada(nit, …)
try
{
    store.GuardarNuevo("emp-7", nit, e.SinConfirmar);
    e.MarcarConfirmados();
}
catch (NitYaExisteException)
{
    // el NIT ya estaba: no creamos un hecho nuevo
}
```

El SQL crudo se queda **dentro del store** (infra); el dominio sigue hablando solo con `IEventStore`. Si dos registros del mismo NIT corren a la vez, el `PRIMARY KEY` deja pasar **uno**; el otro lanza `23505`, se revierte entero, y lo conviertes en `NitYaExisteException`. El `InMemoryEventStore` sostiene la misma garantía con un `Dictionary<string,string>` NIT→id que rechaza el duplicado antes de guardar.

</details>

## 🔨 El segundo clic del usuario

La misma pieza cubre otro caso: el usuario hace doble clic en "Registrar", o el navegador reintenta el `POST`. El segundo `GuardarNuevo` con el mismo NIT lanza `NitYaExisteException`; lo capturas y **no creas un hecho nuevo**. Pruébalo: registra dos veces el mismo NIT y confirma que el diario tiene el `EmpresaRegistrada` **una** sola vez. (Si además quisieras *devolverle* al usuario la empresa que ya existe, te faltaría un paso: buscar su stream por el NIT —leer el `localizador` a la inversa—; es una capacidad natural del store que aún no necesitas, así que no la construyes hoy.)

## El Descubrimiento

Leer-antes-de-escribir no es una garantía: es una apuesta con una ventana que un día se abre. Una invariante de **conjunto** —"un NIT, una empresa"— solo la sostiene quien decide de forma atómica: el store, con un índice único escrito en la misma transacción que los hechos. Fíjate en la elección de fondo: **elegir el id es elegir dónde vive la identidad**. Si atas el id a una clave de negocio (el NIT), heredas gratis la unicidad pero quedas atrapado cuando esa clave cambia; si el id es interno y estable, la unicidad del NIT la pones aparte, en un índice mutable que sí puedes corregir. Y la idempotencia del doble clic **la decides tú al escribir** (que el segundo intento no cree un hecho); no es un filtro que le pidas a la base.

> 🌱 El paso 1 te hizo cambiar la **forma** de `EmpresaRegistrada`: ahora lleva `Nit`. Pero tus empresas viejas se registraron **sin** él: sus hechos, ya escritos en el diario, no tienen ese campo. El día que los releas, ¿qué llega en `Nit`? Cambiar la forma de un hecho que ya está en disco es el próximo dolor ([La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)).

## ✅ Compruébalo

- [ ] Sin el localizador: dos registros del mismo NIT (ids distintos) dejan **dos** streams — la concurrencia optimista no lo impide.
- [ ] Con `GuardarNuevo`: dos registros del mismo NIT → **uno** entra; el otro lanza `NitYaExisteException` y su transacción se revierte (ni localizador ni eventos). El que entró quedó con su hecho en versión 1.
- [ ] El `InMemoryEventStore` da el **mismo** resultado que Postgres ante el NIT repetido (doble fiel).
- [ ] Doble clic: registrar dos veces el mismo NIT deja **un** solo `EmpresaRegistrada` en el diario.

## 🆘 Si algo salió mal

- **`GuardarNuevo` no compila al pasarle `e.SinConfirmar`:** `SinConfirmar` es `IReadOnlyList<object>` (hechos crudos); la firma de `GuardarNuevo` debe pedir `IReadOnlyList<object>`, no `EventoAlmacenado`. El store numera las versiones desde 1 por dentro.
- **Quedó el localizador pero no los eventos (o al revés):** no están en la misma transacción. Ambos `INSERT` van bajo el mismo `tx`, con un solo `Commit`.
- **El `23505` no se atrapa:** viene como `PostgresException` con `SqlState == "23505"`; misma familia del choque de versión de [Concurrencia optimista](./concurrencia-optimista.md), ahora sobre la PK del `localizador`.
- **El doble en memoria no rechaza el NIT repetido:** te faltó replicar la reserva (un diccionario NIT→id que rechace duplicados). Un doble que no sostiene la garantía de producción da verde falso ([El puerto propio](./el-puerto-propio.md)).

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué la concurrencia optimista (versión por stream) no podía impedir dos empresas con el mismo NIT? Y: ¿qué habrías ganado y qué perdido si usaras el NIT como id del stream?

```bash
git add .
git commit -m "ES · Dos streams, la misma clave (localizador atómico del NIT)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

"Un NIT, una empresa" es una invariante de conjunto: no la sostiene leer-antes-de-escribir (una apuesta con ventana) ni la concurrencia optimista (que protege un stream), sino el store, con un índice único (`localizador`) escrito en la misma transacción que los primeros hechos — porque el id es interno y estable, y el NIT va aparte, en un índice que sí se puede corregir.

---

[⬅️ Volver: El puerto propio](./el-puerto-propio.md)

[➡️ Siguiente: La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)
