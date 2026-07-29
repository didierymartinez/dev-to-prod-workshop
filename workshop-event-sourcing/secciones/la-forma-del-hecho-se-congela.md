# La forma del hecho se congela

En [El nombre es un contrato](./el-nombre-es-un-contrato.md) congelaste el **nombre** del hecho. Pero la sección pasada le cambiaste la **forma** —`EmpresaRegistrada` ahora lleva `Nit`—, y las empresas viejas se registraron sin él.

## 🎯 El Objetivo

Leer sin romperse un hecho **viejo** cuya forma ya no coincide con la de hoy — y ver por qué la solución nunca es un `UPDATE` a los hechos ya escritos.

## 💥 El dolor: el hecho viejo llega mutilado, en silencio

Tu diario tiene empresas registradas **antes** de que `EmpresaRegistrada` llevara `Nit`. Su `datos` en disco es la forma de entonces:

```json
{"Nombre":"Acme","Plan":"Premium"}
```

Rehidrata una de esas empresas. Tu `GetEvents` deserializa ese JSON contra la forma de **hoy** —`EmpresaRegistrada(Nit, Nombre, Plan)`— y **no falla**. Deja `Nit` en **null**. ¿Por qué no falla, si al constructor le falta un argumento?

> [!NOTE]
> 🆕 **Cómo construye un `record` System.Text.Json.** Al deserializar, STJ llama al **constructor** del `record` y empareja cada propiedad del JSON con el parámetro del **mismo nombre**. A los parámetros que **no encuentra** les pasa el valor por defecto (`null` para un `string`) — sin lanzar. Por eso un JSON viejo al que le falta `Nit` no revienta: produce un `EmpresaRegistrada` con `Nit = null`, en silencio.

Como tu código de hoy **siempre** escribe `Nit`, para reproducir el hecho viejo lo siembras a mano —un `INSERT` con la forma de entonces— y lo relees:

```sql
INSERT INTO eventos(stream, version, tipo, datos)
VALUES ('emp-legado', 1, 'empresa-registrada', '{"Nombre":"Acme","Plan":"Premium"}'::jsonb);
```

```
GetEvents("emp-legado") → EmpresaRegistrada { Nit = null, Nombre = "Acme", Plan = "Premium" }
```

Nadie avisó. El hecho en disco no cambió, pero la pregunta que ahora le haces —"¿cuál es tu NIT?"— no la puede responder: nunca capturó eso. Y `null` no se queda quieto: en cuanto alguien lee `empresa.Nit.Length`, o lo mete en el `localizador` de [Dos streams, la misma clave](./dos-streams-misma-clave.md), revienta con un `NullReferenceException` a kilómetros del origen — o peor, pasa como un NIT vacío y **miente**. La forma de un hecho quedó **congelada** el día que lo escribiste; tu código siguió y las dos formas ya no encajan.

## 🔧 Reconciliar al leer, no reescribir en disco

El reflejo es un `UPDATE eventos SET datos = ...` para "arreglar" las filas viejas. Es exactamente el pecado de [El diario de una empresa](./el-diario-de-una-empresa.md): reescribir el pasado. Un hecho es inmutable; se quedó sin `Nit` porque **ese día no existía**, y eso es la verdad histórica.

Lo que sí puedes es **reconciliar la forma al leer**: en tu `GetEvents`, cuando el hecho sea un `empresa-registrada`, en vez del deserialize genérico pasas su JSON por una función que reconoce la forma vieja y la lleva a la de hoy. La historia en disco no se toca; lo que viaja hacia el dominio siempre tiene la forma actual.

> 🆕 **Un *upcaster*: viejo JSON → evento actual.** Una función que se aplica **al leer**, dentro de tu `GetEvents`, **en lugar del** deserialize normal para ese tipo. Reconoce la forma vieja (aquí: falta `Nit`) y produce el evento con la forma de hoy. El disco queda intacto; el dominio nunca ve la forma vieja.

> 🆕 **Mirar un JSON sin fijar su forma.** `JsonDocument.Parse(json).RootElement` te da la raíz cruda sin comprometerte a una clase; `.TryGetProperty("Nit", out _)` dice si ese campo existe; `.GetProperty("Nombre").GetString()` lee un campo suelto. Es lo que te deja preguntar "¿esta forma trae `Nit`?" antes de decidir cómo materializarla.

> 🛠️ **Inténtalo tú.** En `PostgresEventStore.GetEvents`, ramifica por `tipo`: si es `"empresa-registrada"`, en vez del `JsonSerializer.Deserialize(...)` genérico llama a un `Upcast(json)`; los demás tipos siguen igual. El `Upcast` inspecciona el JSON con `JsonDocument`: si `raiz.TryGetProperty("Nit", out _)` dice que **no** está, es la forma vieja — construyes el `EmpresaRegistrada` leyendo los campos que sí trae (`raiz.GetProperty("Nombre").GetString()`) y poniendo el `Nit` a mano. Cuidado con qué pones en ese `Nit`: el NIT es un dato esencial que ese hecho **nunca capturó** — no lo puedes inventar. Lo honesto es marcarlo (`"SIN-NIT-LEGADO"`) para que salte a la vista y el negocio lo corrija, no rellenarlo con algo que parezca real.

<details>
<summary>👉 Una forma de hacerlo (en el camino de lectura de Postgres)</summary>

```csharp
// en PostgresEventStore.GetEvents, dentro del while(r.Read()):
var tipo = r.GetString(1);
var json = r.GetString(2);
object hecho = tipo == "empresa-registrada"
    ? Upcast(json)                                        // reconcilia la forma vieja
    : JsonSerializer.Deserialize(json, _porNombre[tipo])!;  // los demás tipos, igual que siempre
sobres.Add(new EventoAlmacenado(r.GetInt32(0), hecho));
```

```csharp
static EmpresaRegistrada Upcast(string json)
{
    using var doc = JsonDocument.Parse(json);
    var raiz = doc.RootElement;
    if (raiz.TryGetProperty("Nit", out _))                   // ya es la forma de hoy
        return JsonSerializer.Deserialize<EmpresaRegistrada>(json)!;

    return new EmpresaRegistrada(                             // forma vieja → forma de hoy
        Nit: "SIN-NIT-LEGADO",                               // no se inventa: se marca para corregir
        Nombre: raiz.GetProperty("Nombre").GetString()!,
        Plan:   raiz.GetProperty("Plan").GetString()!);
}
```

El `tipo` del evento (`empresa-registrada`) **no cambió** —eso es lo que [El nombre es un contrato](./el-nombre-es-un-contrato.md) te dio—; lo que evolucionó fue la **forma de los datos**, y el upcaster la reconcilia.

**¿Y el doble en memoria de [El puerto propio](./el-puerto-propio.md)?** Ahí no hay upcaster que poner: el `InMemoryEventStore` guarda objetos vivos (`EmpresaRegistrada` ya construidos), nunca JSON viejo. La deriva de forma es un problema de **serialización**, y solo aparece donde algo se serializó y se vuelve a leer — o sea, contra Postgres. Así que este upcaster se prueba contra el store que serializa (o contra un JSON viejo escrito a mano en un test), no contra el doble. Es lo que ya sabías del puerto: el doble acelera lo que puede, pero lo que depende de la serialización se prueba donde de verdad se serializa.

</details>

**El otro lado de la frontera.** No todo campo nuevo es un drama. Imagina que en vez del NIT, `EmpresaRegistrada` hubiera ganado un `Notas` **opcional**. Un hecho viejo sin `Notas` sí se reconcilia con un default honesto —`Notas: ""`—, porque "sin notas" *es* verdad. La diferencia no es el mecanismo (el mismo `TryGetProperty`), es la **honestidad del default**: `""` para unas notas ausentes es cierto; `""` para un NIT ausente es mentira.

## 🔨 Rómpelo: quita el upcaster

Fija el dolor en un test (tu red desde [Verde, y roto](./verde-y-roto.md)): siembra el hecho viejo con el `INSERT` de arriba, rehidrata `emp-legado` con `GetEvents`, y afirma que `Nit == "SIN-NIT-LEGADO"`. Con el upcaster, pasa. Ahora quítalo (deserializa directo): el test cae —`Nit` vuelve a `null`—. Ese test dice, en verde o rojo, si la forma vieja aún se lee bien; sin él, el día que cambies la forma otra vez, el hecho viejo se muere en silencio.

## El Descubrimiento

La forma de un hecho es un contrato con tu **yo del pasado**: quedó congelada el día que lo escribiste. Evolucionarla no es reescribir el disco (eso es perder el pasado) — es reconciliar **al leer**, con un upcaster. Y hay una frontera de honestidad: un upcaster **reforma la forma**, no la **inventa**. Un campo nuevo con un default sensato (opcional, aditivo) es barato: el upcaster lo rellena. Pero un dato esencial que el hecho viejo nunca capturó —el NIT— no lo recupera ningún código. Y ojo: ni siquiera vale escribir `SIN-NIT-LEGADO` en disco con un `UPDATE`, porque también falsifica la historia ("este hecho no registró NIT ese día") y contamina el `localizador` y las consultas; si mañana consigues el NIT real, lo honesto es un **hecho correctivo nuevo**, no sobrescribir. Por eso la regla de mantenedor es preferir cambios **aditivos y opcionales**: un renombre o un campo esencial nuevo es una migración de verdad, no un parche.

> 🌱 El upcaster reconcilia la **forma** de un hecho para el dominio. Pero fíjate en algo: hasta ahora todas tus preguntas de lectura las respondía la misma vista `Suspendidas`. Pronto llega una pregunta que esa vista no sabe responder —y no porque le falte un campo, sino porque está diseñada para **otra** pregunta—. Cuando eso pase, verás que la forma de un read model la dicta la consulta, no el hecho ([La vista por consulta](./la-vista-por-consulta.md)).

## ✅ Compruébalo

- [ ] Deserializar directo el JSON viejo (sin `Nit`) deja `Nit = null` y **no** lanza — y sabes por qué (STJ construye el `record` por su constructor y pone el default a lo que falta).
- [ ] Con el upcaster en `GetEvents`, rehidratar `emp-legado` da `Nit = "SIN-NIT-LEGADO"`, no `null`.
- [ ] El JSON en disco de esa empresa vieja **no cambió** (no hubo `UPDATE` a `eventos`).
- [ ] Un hecho con la forma nueva pasa por el upcaster sin alterarse.
- [ ] Sabes decir por qué el `Nit` legado se marca (en vez de inventarse o de escribir el marcador en disco) — y a quién le toca corregirlo.

## 🆘 Si algo salió mal

- **`Nit` sigue llegando null:** el `GetEvents` no ramifica por `tipo`, o la rama "sin Nit" del `Upcast` no se dispara — revisa el `TryGetProperty("Nit", …)`.
- **Reescribiste las filas viejas con un `UPDATE`:** deshazlo. Eso es reescribir el pasado ([El diario de una empresa](./el-diario-de-una-empresa.md)); la reconciliación va al **leer**, no en disco.
- **Rellenaste el `Nit` legado con algo que parece real:** un NIT inventado contamina el `localizador` y las consultas. Márcalo como legado y visible.
- **Intentaste probar el upcaster contra el doble en memoria y no había forma vieja:** correcto — el doble guarda objetos vivos, no JSON; prueba contra Postgres o contra un JSON viejo escrito a mano.

## 📓 Registra tu avance

> 💭 **Reto:** un upcaster puede reconciliar la *forma* pero no *inventar* información que el hecho viejo nunca capturó. Da un cambio de forma que sí resolverías con un default en el upcaster, y otro que **no** —que exige una migración o un proceso de negocio—. ¿Qué los distingue?

```bash
git add .
git commit -m "ES · La forma del hecho se congela (upcaster al leer)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El nombre del hecho es estable pero su forma se congela al escribirlo; se evoluciona reconciliando **al leer** (un upcaster dentro de `GetEvents`), nunca reescribiendo el disco — y un upcaster reforma la forma pero no la inventa, así que un dato esencial perdido es una migración, no un default.

---

[⬅️ Volver: Dos streams, la misma clave](./dos-streams-misma-clave.md)

[➡️ Siguiente: La vista por consulta](./la-vista-por-consulta.md)
