# ¿Merecía event sourcing?

Tienes el motor, la persistencia, el read-side que se mantiene solo y aísla fallos. Con un martillo así de bueno, todo empieza a parecer un clavo.

## 🎯 El Objetivo

El criterio para decidir cuándo **no** usar event sourcing — y crear el catálogo de planes como lo que de verdad es: una tabla plana.

## 💥 El dolor: pagar toda la ceremonia por nada

El negocio necesita un **catálogo de planes**: los planes a los que una empresa puede suscribirse, con su precio (Básico, Premium, Enterprise). Con lo que sabes, el reflejo es event-sourcearlo. Empiezas a montarlo:

- eventos `PlanRegistrado`, `PrecioCambiado`…
- para responder "¿qué planes hay y a qué precio?", otra vista como `Suspendidas`,
- con su `CorrerProyector()`, su `checkpoint`, su `proyeccion_fallos`, su `Reconstruir()`…

Todo el aparato que endureciste para las empresas, otra vez — para un catálogo. Y a mitad de camino, dos preguntas incómodas. ¿Alguien va a preguntar **cómo** llegó el precio de Premium a $150.000 —su historia, mes a mes—? No: solo importa cuánto cuesta **hoy**. ¿Hay alguna **invariante** —una regla que proteger, como la que hace que tu `CambiarPlan` lance `ReglaDeNegocioException` cuando la empresa está suspendida— que un `UPDATE` al precio podría violar? No: un plan es nombre y precio, sin reglas de esas.

("Invariante" es solo el nombre técnico de esas reglas de negocio que ya defiendes dentro del agregado desde [Decidir el futuro](decidir-el-futuro.md): una verdad que el sistema no puede dejar que se rompa.) Estás montando diario, proyector, checkpoint y panel de fallos para un dato que **nunca tuvo historia ni invariante**. Pagas toda la ceremonia y no cobras nada.

## 🔧 Hazlo plano

Un catálogo es una tabla. Agregar un plan es un `INSERT`; cambiar su precio, un `UPDATE`. Y la pregunta del negocio —qué planes hay y a qué precio— es un `SELECT`.

> 🛠️ **Inténtalo tú.** En `psql`, sobre la misma base donde vive tu diario, crea el catálogo como una tabla plana `planes(codigo TEXT PRIMARY KEY, nombre TEXT, precio INT)`. Insértale Básico, Premium y Enterprise; sube el precio de Premium con un `UPDATE`; y lista los planes ordenados por precio con un `SELECT`. Sin eventos, sin proyección, sin checkpoint.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE planes(codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL);

INSERT INTO planes VALUES ('basico','Básico',0), ('premium','Premium',120000), ('enterprise','Enterprise',450000);

UPDATE planes SET precio = 150000 WHERE codigo = 'premium';   -- cambiar el precio: un UPDATE, no un evento

SELECT codigo, nombre, precio FROM planes ORDER BY precio;    -- la pregunta del negocio: un SELECT
```

Tres líneas responden lo que el diario + proyección + checkpoint + rebuild habrían respondido — sin nada de eso que mantener.

</details>

## El desempate: dos preguntas

Antes de event-sourcear cualquier cosa, hazle estas dos preguntas. Si **ambas** son "no", un `UPDATE` sobre una tabla plana es la respuesta correcta:

1. **¿Alguien necesita saber *cómo* llegó a su estado actual** —su historia—, o basta con el estado de hoy?
2. **¿Hay una invariante** que un `UPDATE` a ciegas podría violar?

| | ¿Historia importa? | ¿Invariante que proteger? | → |
|---|---|---|---|
| **`Empresa`** | sí (suspensiones, pagos, cuándo y por qué) | sí (no reactivar con deuda, etc.) | **event sourcing** |
| **Catálogo de planes** | no (solo el precio de hoy) | no (nombre + precio, sin reglas) | **tabla plana** |

> Ojo con la pregunta 2: la unicidad del `codigo` (la `PRIMARY KEY`) o un `precio >= 0` son **restricciones que la base hace cumplir sola** — un `UPDATE` a ciegas no las viola, porque Postgres lo rechaza. La invariante que pide event sourcing es la que **ningún `CHECK` atrapa**, porque depende de la historia o de varios estados a la vez —como "no reactivar con deuda"—. Si tu única regla la sostiene la base, no necesitas diario.

## El Descubrimiento

El desempate no es rendimiento ni moda: es **reconstrucción temporal + invariante**. Event sourcing se gana su ceremonia cuando el *cómo llegaste* vale tanto como el *dónde estás*, o cuando hay una regla que un `UPDATE` podría romper en silencio. Si no hay ni lo uno ni lo otro, un `UPDATE` es correcto — y **escribir por qué** un dato NO lleva diario es tanto oficio como saber cuándo sí. La madurez no es event-sourcearlo todo; es elegir.

> 🏷️ **Aplanar es una puerta de un solo sentido.** Si mañana el negocio SÍ pide la historia del precio —auditar cómo cambió mes a mes—, la pregunta 1 pasó a "sí": ahí migras el catálogo a event sourcing. Lo que no haces es pagar la ceremonia **hoy** por un "quizás". El costo de haber aplanado: los cambios anteriores a esa decisión no los tendrás; de la migración en adelante, sí. Aplanar cuando la respuesta es "no" es correcto — solo se sabe que fue prematuro si la respuesta cambia, y para entonces migrar es barato.

> 🌱 Ese catálogo plano de `planes` es la lista canónica a la que el plan de una empresa (hoy texto libre, `"Enterprise"`) podría referirse el día que el negocio lo pida; por ahora queda como tu ejemplo vivo de "esto **no** lleva diario". Y algo que vienes arrastrando desde que el diario se mudó a Postgres: cada vez que pruebas una regla, arrancas una base de datos. Ese peso es el próximo dolor.

## ✅ Compruébalo

- [ ] El catálogo `planes` responde "qué planes hay y a qué precio" con un solo `SELECT`, y cambiar un precio es un `UPDATE` — sin eventos ni proyección.
- [ ] Sabes responder, para la `Empresa` y para el catálogo, las **dos preguntas** del desempate — y por qué una lleva diario y el otro no.
- [ ] En tu `DECISIONES.md` quedó escrito por qué el catálogo **no** es event-sourced (el desempate es parte del diseño, no una omisión).

## 📓 Registra tu avance

> 💭 **Reto:** da un tercer ejemplo del dominio (no la `Empresa` ni el catálogo) y decídelo con las dos preguntas: ¿diario o tabla plana? Justifícalo.

```bash
git add .
git commit -m "ES · ¿Merecía event sourcing? (el catálogo de planes, plano)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

No todo merece un diario: si nadie va a preguntar por la historia y no hay invariante que un `UPDATE` viole —como en un catálogo de planes—, una tabla plana es la respuesta correcta, y decir *por qué* por escrito es parte del oficio.

---

[⬅️ Volver: El proyector tropieza](./el-proyector-tropieza.md)

[➡️ Siguiente: El puerto propio](./el-puerto-propio.md)
