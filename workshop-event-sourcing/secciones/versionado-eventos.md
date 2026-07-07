# Versionado y upcasting: el esquema evoluciona, la historia no

Desde [El diario de una empresa](el-diario-de-una-empresa.md) la promesa fue: el diario **no se reescribe** — un `UPDATE` destruye el pasado. Pero el negocio **evoluciona**: un día `EmpresaRegistrada` necesita un campo que no existía cuando lo diseñaste, y tienes miles de eventos viejos sin él. ¿Los reescribes para meterles el campo? Eso es justo la amnesia que Event Sourcing evita — prohibido. La salida es traducir los eventos viejos a la forma nueva **al leerlos**, dejando la historia intacta: **upcasting**.

## 🎯 El Objetivo

Cuando un evento cambia de forma, leer los viejos **como si fueran de la forma nueva** — sin tocar un solo byte de la historia.

## 💥 El dolor: el evento cambió de forma

El negocio ahora quiere registrar el **país** de cada empresa. Tu `EmpresaRegistrada` no lo tenía. Dos salidas malas:

1. **`UPDATE` a los eventos viejos** para meterles `Pais` → **reescribes la historia**: el pecado capital de ES, la amnesia de la que huiste en la §1.
2. **Solo agregar `Pais` al `record`** → los eventos viejos, al deserializarse, traen `Pais` vacío/`null`. Incoherente: esas empresas **sí** se registraron, solo que antes de que rastrearas el país.

Necesitas **traducir** lo viejo a lo nuevo al leer, sin tocar lo guardado.

## 🔧 El upcaster: traducir al leer

### Paso 1 · Agregar un campo (con su valor legado)

Conservas la forma vieja como un `record` aparte, y registras un **upcaster** que Marten aplica al leer.

> 🛠️ **Inténtalo tú.** Declara `EmpresaRegistradaV1` (la forma vieja) y `EmpresaRegistrada` (la actual, con `Pais`). Registra `opts.Events.Upcast<vieja, nueva>(...)` que rellene `Pais` con el valor legado.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten.Services.Json.Transformations;

public record EmpresaRegistradaV1(string Nombre, string Plan);            // la forma VIEJA (guardada tal cual)
public record EmpresaRegistrada(string Nombre, string Plan, string Pais); // la forma ACTUAL

// en la config del store, junto a StreamIdentity / EventNamingStyle:
opts.Events.Upcast<EmpresaRegistradaV1, EmpresaRegistrada>(
    vieja => new EmpresaRegistrada(vieja.Nombre, vieja.Plan, Pais: "Colombia"));
```
</details>

> [!NOTE]
> 🆕 **`Upcast<TVieja, TNueva>(func)`.** Marten, al leer un evento viejo, lo deserializa a `TVieja` y aplica tu función para producir `TNueva`. **Casa por el nombre del evento guardado**: con `EventNamingStyle.SmarterTypeName`, `EmpresaRegistradaV1` se guardó como `empresa_registrada_v1` — Marten **no** le quita el `V1`, y ese sufijo es tu **marca de versión** (distinto de `empresa_registrada`, el actual). El `"Colombia"` es el **valor legado**: sabes que todas las empresas viejas eran colombianas; el JSON no lo sabía, tú sí.

> 🔍 **¿Lo lograste?** Mira `mt_events` en psql: las filas viejas siguen **idénticas** (`type = 'empresa_registrada_v1'`, sin `Pais`). Pero al rehidratar con `AggregateStreamAsync` (o `FetchStreamAsync`), tu `Empresa` recibe un `EmpresaRegistrada` **con `Pais = "Colombia"`**. La historia intacta; la traducción, solo al leer.

### Paso 2 · Renombrar sin conservar la clase vieja

La misma función tipada también **renombra** campos (`new EmpresaRegistrada(Nombre: vieja.RazonSocialAntigua, …)`). Pero si ya **borraste** la clase vieja del código, usas un upcaster de **JSON crudo**, que trabaja directo sobre lo guardado:

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// alias para desambiguar: hay dos clases JsonTransformations (una general, otra para System.Text.Json)
using StjTransforms = Marten.Services.Json.Transformations.SystemTextJson.JsonTransformations;

opts.Events.Upcast<EmpresaRegistrada>(
    "empresa_registrada_v1",   // el nombre viejo, a mano (ya no hay clase de la que derivarlo)
    StjTransforms.Upcast<EmpresaRegistrada>(json =>
        new EmpresaRegistrada(
            json.RootElement.GetProperty("Nombre").GetString()!,
            json.RootElement.GetProperty("Plan").GetString()!,
            Pais: "Colombia")));
```
</details>

> [!NOTE]
> 🆕 **Upcaster de JSON crudo.** Lees el `JsonDocument` guardado y construyes la forma nueva a mano. No necesitas conservar el `record` viejo — lo puedes **borrar del código**, y aún así lees su historia. Es la prueba más pura del mensaje: *traduces al leer, nunca reescribes*. *(El alias del `using` evita un choque de nombres entre dos `JsonTransformations`.)*

---

### El Descubrimiento

El diario es **inmutable** (la §1), y ahora eso **paga**: cuando el esquema evoluciona, no reescribes ni migras destruyendo el pasado — registras un **upcaster** que traduce las formas viejas a la actual **al leer**. Los bytes en `mt_events` nunca cambian; tu código de dominio solo conoce la forma nueva. El `V1` en el nombre del evento es la marca de versión por la que Marten casa. Así un sistema event-sourced **evoluciona sin perder su historia** — lo que un `UPDATE` jamás permitiría.

> [!NOTE]
> 🌱 **Semilla — versionar por número.** Además del casado por nombre (`...V1`), Marten tiene una familia `Upcast<TVieja, TNueva>(uint schemaVersion, func)` que ata el upcaster a un **número de versión** del evento. Para empezar, el nombre es más transparente; el número escala mejor cuando un evento pasa por muchas versiones.

---

## ✅ Compruébalo

- [ ] Declaraste `EmpresaRegistradaV1` (vieja) y `EmpresaRegistrada` (actual, con `Pais`), y registraste `opts.Events.Upcast<V1, actual>(...)` con el valor legado.
- [ ] Explicas por qué **no** puedes ni `UPDATE`-ar los eventos viejos (reescribe la historia) ni solo agregar el campo (queda vacío en los viejos).
- [ ] En `mt_events`, las filas viejas siguen **intactas** (`empresa_registrada_v1`), pero al leer recibes la forma nueva con `Pais`.
- [ ] Explicas cómo casa Marten (por el **nombre** del evento; `SmarterTypeName` conserva el `V1`).
- [ ] Sabes cuándo usar el upcaster de **JSON crudo** (cuando borraste la clase vieja).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué el upcasting NO viola la inmutabilidad del diario? ¿Qué se guarda en `mt_events` y qué recibe tu agregado, y en qué momento ocurre la traducción?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Versionado y upcasting de eventos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Cuando un evento cambia de forma, registras un **upcaster** (`opts.Events.Upcast<TVieja, TNueva>`) que Marten aplica **solo al leer** para traducir los eventos viejos a la forma actual — la historia en `mt_events` queda **intacta** y tu dominio solo ve la forma nueva; así ES evoluciona su esquema sin reescribir el pasado (lo que un `UPDATE` destruiría).

---

[⬅️ Volver: FetchForWriting: recuperar la concurrencia con criterio](./fetch-for-writing.md)

[➡️ Siguiente: Auditoría: metadata y correlación](./auditoria.md)
