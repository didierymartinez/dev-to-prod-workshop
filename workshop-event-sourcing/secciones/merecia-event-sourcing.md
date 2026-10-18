# ¿Merecía event sourcing?

Tienes el motor, la persistencia, el read-side que se mantiene solo y aísla fallos. Con un martillo así de bueno, todo empieza a parecer un clavo.

## 🎯 El Objetivo

El criterio para decidir cuándo **no** usar event sourcing — y crear el catálogo de planes como lo que de verdad es: una tabla plana, que no pierda un cambio cuando dos personas la editan a la vez.

## 💥 El dolor: pagar toda la ceremonia por nada

El negocio necesita un **catálogo de planes**: los planes a los que una empresa puede suscribirse, con su precio (Básico, Premium, Enterprise). Con lo que sabes, el reflejo es event-sourcearlo. Empiezas a montarlo:

- eventos `PlanRegistrado`, `PrecioCambiado`…
- para responder "¿qué planes hay y a qué precio?", otra vista como `Suspendidas`,
- con su `CorrerProyector()`, su `checkpoint`, su `proyeccion_fallos`, su `Reconstruir()`…

Todo el aparato que endureciste para las empresas, otra vez, para un catálogo. Y nadie va a preguntar **cómo** llegó el precio de Premium a $150.000: solo importa cuánto cuesta **hoy**. Tampoco hay una regla que un `UPDATE` al precio pueda violar, como la que hace que tu `CambiarPlan` lance `ReglaDeNegocioException` cuando la empresa está suspendida: un plan es nombre y precio. Pagas toda la ceremonia y no cobras nada.

## 🔧 Hazlo plano

> 🛠️ **Inténtalo tú.** En `psql`, sobre la misma base donde vive tu diario, crea el catálogo como una tabla plana `planes(codigo TEXT PRIMARY KEY, nombre TEXT, precio INT)`. Insértale Básico, Premium y Enterprise; sube el precio de Premium con un `UPDATE`; y lista los planes ordenados por precio con un `SELECT`. Sin eventos, sin proyección, sin checkpoint.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE planes(codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL);

INSERT INTO planes VALUES ('basico','Básico',0), ('premium','Premium',120000), ('enterprise','Enterprise',450000);

UPDATE planes SET precio = 150000 WHERE codigo = 'premium';   -- cambiar el precio: un UPDATE, no un evento

SELECT codigo, nombre, precio FROM planes ORDER BY precio;    -- la pregunta del negocio: un SELECT
```

Tres líneas responden lo que habrían respondido el diario, la proyección, el checkpoint y el rebuild, sin nada de eso que mantener.

</details>

## El desempate: dos preguntas

Antes de event-sourcear cualquier cosa, hazle estas dos preguntas. Si **ambas** son "no", un `UPDATE` sobre una tabla plana es la respuesta correcta:

1. **¿Alguien necesita saber *cómo* llegó a su estado actual** —su historia—, o basta con el estado de hoy?
2. **¿Hay una invariante** que un `UPDATE` a ciegas podría violar? "Invariante" es el nombre técnico de las reglas de negocio que defiendes dentro del agregado desde [Decidir el futuro](decidir-el-futuro.md): una verdad que el sistema no puede dejar que se rompa.

| | ¿Historia importa? | ¿Invariante que proteger? | → |
|---|---|---|---|
| **`Empresa`** | sí (suspensiones, pagos, cuándo y por qué) | sí (no reactivar con deuda, etc.) | **event sourcing** |
| **Catálogo de planes** | no (solo el precio de hoy) | no (nombre + precio, sin reglas) | **tabla plana** |

> Ojo con la pregunta 2: si tu única regla la sostiene la base, no necesitas diario. La unicidad del `codigo` (la `PRIMARY KEY`) o un `precio >= 0` son **restricciones que la base hace cumplir sola**: Postgres rechaza el `UPDATE` que las viola. La invariante que pide event sourcing es la que **ningún `CHECK` atrapa**, porque depende de la historia o de varios estados a la vez, como "no reactivar con deuda".

## 🔧 Lo que el diario hacía por ti

Aplanar te quita la ceremonia, y también dos cosas que el diario hacía solo: el `PRIMARY KEY (stream, version)` de `eventos` rechazaba al segundo escritor, y el diario era la única verdad sobre cada empresa. En una tabla plana, las dos quedan a tu cargo.

### Paso 1 · La versión que nadie mira

Dos personas de operaciones editan el precio de Premium a la vez. El reflejo es copiar la idea del diario: una columna `version` que sube con cada cambio.

```sql
ALTER TABLE planes ADD COLUMN version INT NOT NULL DEFAULT 1;
```

> 🔨 **Rómpelo tú.** Abre **dos** `psql` sobre tu base, cada uno en su terminal (`docker exec -it empresas-db psql -U postgres`): A y B son las dos personas. Cada una lee el plan antes de editarlo:
>
> ```sql
> SELECT precio, version FROM planes WHERE codigo = 'premium';   -- en A y en B: 150000 | 1
> ```
>
> A lo sube a 160000. Después, B lo baja a 140000. Cada una decide con lo que leyó:
>
> ```sql
> UPDATE planes SET precio = 160000, version = version + 1 WHERE codigo = 'premium';   -- en A: UPDATE 1
> UPDATE planes SET precio = 140000, version = version + 1 WHERE codigo = 'premium';   -- en B: UPDATE 1
> ```
>
> Lee otra vez: `140000 | 3`. El cambio de A se perdió sin señal: B decidió sobre un precio que ya no existía. La versión subió dos veces y ningún `UPDATE` la miró. Es de adorno.

La cura es la de [Cuando dos escriben a la vez](concurrencia-optimista.md): quien escribe dice qué versión leyó, y la escritura se rechaza si esa ya no es la actual. En una tabla plana, eso va en el `WHERE`.

> 🛠️ **Inténtalo tú.** Repite la carrera desde la versión que hay ahora, la `3`. Quieres esta salida:
>
> ```
> en A: UPDATE 1     ← A leyó la versión 3, y sigue siendo la 3
> en B: UPDATE 0     ← B leyó la 3, pero ya es la 4: conflicto
> ```
>
> Haz que cada `UPDATE` exija, además del código del plan, la versión que esa persona leyó.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
UPDATE planes SET precio = 160000, version = version + 1 WHERE codigo = 'premium' AND version = 3;   -- en A: UPDATE 1
UPDATE planes SET precio = 140000, version = version + 1 WHERE codigo = 'premium' AND version = 3;   -- en B: UPDATE 0
```

`UPDATE 0` es el conflicto: ninguna fila tenía la versión que B leyó. Postgres no lanza un error; la señal es el conteo. B recarga (`160000 | 4`) y decide otra vez. Desde C#, `ExecuteNonQuery()` devuelve ese mismo conteo, y `@v` es la versión leída:

```csharp
cmd.CommandText = "UPDATE planes SET precio = @p, version = version + 1 WHERE codigo = @c AND version = @v";
// … los tres parámetros, con AddWithValue como siempre
if (cmd.ExecuteNonQuery() == 0)
    throw new ConcurrencyException($"El plan '{codigo}' cambió desde que lo leíste: recarga y reintenta.");
```

</details>

### Paso 2 · Una sola verdad

> 🔨 **Rómpelo tú.** Supón que quedó algo por si acaso de cuando empezaste a montar el catálogo con eventos: agrega un `public record PrecioCambiado(string Codigo, int NuevoPrecio);` y su línea `["precio-cambiado"] = typeof(PrecioCambiado)` al mapa de tu `EventStore`. Alguien que llega nuevo los ve y cambia el precio como sugiere el código, con un hecho:
>
> ```csharp
> store.Guardar("plan-premium", new[] { new EventoAlmacenado(1, new PrecioCambiado("premium", 180000)) });
> ```
>
> Nada falla. Ahora pregúntale a la tabla:
>
> ```sql
> SELECT precio FROM planes WHERE codigo = 'premium';   -- 160000
> ```
>
> Hay dos verdades sobre el mismo precio: el diario dice 180000 y la tabla, 160000. Y si corres tu proyector, `plan-premium` aparece en `empresas_estado` como una empresa más, activa y sin plan: el proyector trata todo stream del diario como una empresa.

La cura es borrar lo que contradice la decisión. Quita el `record PrecioCambiado` y su línea del mapa, y deshaz lo que el 🔨 grabó en tu base de práctica:

```sql
DELETE FROM eventos WHERE stream = 'plan-premium';
DELETE FROM empresas_estado WHERE id = 'plan-premium';
```

En un sistema de verdad, ese hecho ya no saldría del diario. Por eso el andamiaje se quita el mismo día que decides, antes de que alguien lo use.

## El Descubrimiento

El desempate no es rendimiento ni moda: es **reconstrucción temporal + invariante**. Event sourcing se gana su ceremonia cuando el *cómo llegaste* vale tanto como el *dónde estás*, o cuando hay una regla que un `UPDATE` podría romper en silencio. Si no hay ni lo uno ni lo otro, un `UPDATE` es correcto, y **escribir por qué** un dato NO lleva diario es tanto oficio como saber cuándo sí. Y aplanar no es descuidar: lo que el diario hacía solo ahora lo haces tú.

> 🏷️ **Aplanar es una puerta de un solo sentido.** Si mañana el negocio SÍ pide la historia del precio, la pregunta 1 pasó a "sí": ahí migras el catálogo a event sourcing, y los cambios anteriores a la migración no los tendrás. Lo que no haces es pagar la ceremonia **hoy** por un "quizás".

> 🌱 El catálogo `planes` es la lista a la que el plan de una empresa (hoy texto libre, `"Enterprise"`) podría referirse el día que el negocio lo pida. Y algo que vienes arrastrando desde que el diario se mudó a Postgres: cada vez que pruebas una regla, arrancas una base de datos. Ese peso es el próximo dolor.

## ✅ Compruébalo

- [ ] El catálogo `planes` responde "qué planes hay y a qué precio" con un solo `SELECT`, y cambiar un precio es un `UPDATE`, sin eventos ni proyección.
- [ ] Sabes responder, para la `Empresa` y para el catálogo, las **dos preguntas** del desempate, y por qué una lleva diario y el otro no.
- [ ] Con la versión de adorno, los dos `UPDATE` responden `UPDATE 1` y el cambio de A se pierde sin señal. Con `AND version = …` en el `WHERE`, el segundo responde `UPDATE 0`: es el conflicto, y quien escribió segundo recarga.
- [ ] Con un `PrecioCambiado` en el diario, la tabla no se entera: Premium tiene dos precios. Tras borrar el `record`, su línea del mapa y lo que grabó el 🔨, solo queda la tabla.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md` las decisiones de hoy:

> El catálogo `planes` es una tabla plana: nadie pregunta por su historia y no tiene una invariante que un `UPDATE` rompa.
>
> Cada `UPDATE` de `planes` exige la versión que leyó (`WHERE version = @v`): 0 filas es un conflicto.
>
> En el código no queda nada que haga parecer event-sourced al catálogo: ni hechos del catálogo ni su nombre en el mapa del diario.

> 💭 **Reto:** da un tercer ejemplo del dominio (no la `Empresa` ni el catálogo) y decídelo con las dos preguntas: ¿diario o tabla plana? Justifícalo.

```bash
git add .
git commit -m "ES · ¿Merecía event sourcing? (el catálogo de planes, plano)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

No todo merece un diario: si nadie va a preguntar por la historia y no hay invariante que un `UPDATE` viole —como en un catálogo de planes—, una tabla plana es la respuesta correcta, y decir *por qué* por escrito es parte del oficio. Plano no es sin cuidado: la versión que leíste va en el `WHERE`, y del código se borra lo que contradice la decisión.

---

[⬅️ Volver: El proyector tropieza](./el-proyector-tropieza.md)

[➡️ Siguiente: El puerto propio](./el-puerto-propio.md)
