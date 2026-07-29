# El comentario que sobrevive

Casi todo el motor nuevo está en su sitio. Pero quedó una línea que **parece** borrable y no lo es.

## 🎯 El Objetivo

Proteger una línea que **carga peso** —si la quitas, algo se cae, pero nada falla al compilar ni en los tests— con un comentario que dice **qué se rompe** sin ella; y devolver ese aprendizaje a la librería.

## 💥 El dolor: el comentario que describe la mecánica no frena a nadie

En [El outbox](./el-outbox.md) pusiste esta línea en la config de Wolverine, y hasta la comentaste:

```csharp
opts.Policies.UseDurableLocalQueues();   // el consumidor local también entrega DURABLE (sobrevive reinicios)
```

Ese comentario parece útil, pero dice la **mecánica** —qué hace la línea—, que es casi lo que el nombre del método ya grita. Meses después, alguien hace limpieza. Lee "entrega durable, sobrevive reinicios" y piensa: *"casi nunca reiniciamos, y esto hace un `INSERT` por mensaje —más lento—; lo quito"*. El commit queda verde: todo compila, los tests pasan. El comentario que tenías **no lo detuvo**, porque le explicaba lo que la línea hace, no lo que pasa **sin** ella.

Hasta que un despliegue reinicia el servicio en el instante justo: unos anuncios que estaban en la cola local **en memoria** se pierden — sin excepción, sin log, sin dead-letter. Facturación no se enteró de unas suspensiones, y nadie sabe por qué. La línea era una red de seguridad; su ausencia no rompe nada **visible**, y eso la hace peligrosísima.

## 🔧 Comenta el síntoma, no la mecánica

Lo que protege una línea así no es describir qué hace (el nombre ya lo dice), sino nombrar el **síntoma** de su ausencia — el bug concreto que vuelve y **cómo se ve** —, para que el que limpia lea "si quito esto, pasa X malo, y así se manifiesta" y se detenga.

> 📌 **El principio: comenta el síntoma, no la mecánica.** Un comentario útil en una línea que carga peso no repite lo que el código dice; dice **qué se rompe si desaparece** y **cómo se manifiesta** (el síntoma observable), idealmente con el enlace al incidente o issue que lo documentó.

> 🛠️ **Inténtalo tú.** Reemplaza tu comentario de mecánica por uno de síntoma: no "entrega durable", sino qué pasa **sin** la línea (qué se pierde) y cómo se nota (que no hay error). Que el próximo que limpie lea el riesgo antes de tocarla.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// NO quitar: sin esto la entrega local es en memoria y NO sobrevive a un reinicio →
// se pierden anuncios en silencio (sin excepción ni dead-letter). Muro de "El mensaje y la cola".
// (incidente #___  ← el número real cuando exista; en el taller no hay, queda como recordatorio del enlace)
opts.Policies.UseDurableLocalQueues();
```

Compara: el de §30 (`// entrega DURABLE (sobrevive reinicios)`) describe la **mecánica** que el nombre ya insinúa — no le da al que limpia una razón para no borrarla. Este nombra el **síntoma** que el nombre esconde ("se pierden anuncios en silencio") — y esa razón sí lo detiene. La misma idea aplica a otras líneas silenciosas-si-se-quitan que fuiste dejando: el `if` de versión del doble fiel en [El puerto propio](./el-puerto-propio.md) (sin él, verde falso), la idempotencia del consumidor en [Llegó dos veces](./llego-dos-veces.md) (sin ella, el mismo mensaje se aplica dos veces en silencio), el `DefaultTenantUsageEnabled = false` de [El contexto que falta](./el-contexto-que-falta.md) (sin él, datos en el cliente equivocado).

</details>

## El aporte de vuelta a la librería

Hay un segundo movimiento, y cierra un arco que **vienes viviendo**: **usar** la librería (el swap de Marten/Wolverine) → **mantenerla** (observarla, §36) → **aportar**. Que *tú* tengas que poner un comentario "NO quitar" sobre `UseDurableLocalQueues()` es una señal: su ausencia falla **en silencio**, y un usuario razonable esperaría que la entrega local fuera durable por defecto, o que **al menos avisara**. Eso se **devuelve** a la librería: un issue en el repo de Wolverine que nombra el síntoma que viviste, con tu caso concreto.

Ojo con el criterio: no todo default que no te gusta merece un issue. El no-durable **podría** ser a propósito (durable es más lento, un `INSERT` por mensaje). Lo que lo hace reportable no es que te incomode, sino que **falla en silencio**: ahí el issue justo quizá no sea "hazlo durable por defecto", sino "al menos advierte cuando la cola local no es durable". Es lo que hacen bien los proyectos reales de tu organización cuando un default les mordió: dejan el síntoma escrito pegado al código —un `TODO[dueño]` (una nota dirigida al equipo que mantiene la librería) con el enlace al issue— **y** abren el hilo hacia afuera. El comentario que sobrevive en tu código y el issue que abres en la librería son la misma pieza vista desde dentro y desde fuera: nombrar el síntoma para que no vuelva a morder — ni a ti, ni al siguiente.

## ✅ Compruébalo

- [ ] Identificas al menos dos líneas cuya ausencia falla **en silencio** (no rompe compilación ni tests), y sabes el síntoma de cada una.
- [ ] Tu comentario nombra **qué se rompe y cómo se ve**, no lo que el código ya dice por su nombre (el contraste con el `// entrega DURABLE` de §30).
- [ ] Sabes por qué un comentario del síntoma protege la línea de una "limpieza" mejor que uno de la mecánica.
- [ ] Sabes formular el aporte de vuelta: el título del issue y el síntoma concreto — y por qué "al menos advierte" puede ser mejor petición que "cambia el default".

## 🆘 Si algo salió mal

- **Tu comentario repite el nombre del método:** no protege nada. Reescríbelo en términos del **síntoma** de su ausencia (qué se pierde/corrompe, cómo se nota).
- **No encuentras líneas "silenciosas":** busca las que pusiste tras un `🔨 Rómpelo` que fallaba en silencio (el doble que miente §22, la idempotencia §31, el fail-fast §35) — **o** las que ni siquiera pudiste meter en un test, como `UseDurableLocalQueues` (esas son las más peligrosas: ni el `🔨` las delata).
- **Dejaste `#___` literal:** es aspiracional — el enlace al incidente/issue va cuando exista; en el taller no hay, así que es un recordatorio, no un dato.
- **Crees que basta con el comentario:** protege tu código; el issue upstream protege a todos los que usan la librería con ese default. Son las dos mitades. (Aquí solo **formulas** el issue; abrirlo de verdad es opcional — se hace en la pestaña *Issues* del repo en GitHub.)

## 📓 Registra tu avance

> 💭 **Reto:** elige una línea de tu código cuya ausencia falle en silencio. Escribe (a) el comentario del síntoma que la protege y (b) el título del issue que abrirías en Marten o Wolverine si su default fue el que te obligó a ponerla. ¿Qué tienen en común?

```bash
git add .
git commit -m "ES · El comentario que sobrevive (nombrar el síntoma + aportar upstream)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Una línea que carga peso y cuya ausencia falla en silencio necesita un comentario que nombre el **síntoma** (qué se rompe y cómo se ve), no la mecánica que el nombre ya grita —así sobrevive a una "limpieza", como el `// entrega DURABLE` de §30 que no habría frenado a nadie—; y cuando esa línea existe porque un **default** de la librería falla callado, el mismo síntoma se devuelve como un issue upstream: usar, mantener, aportar.

---

[⬅️ Volver: Observar el motor nuevo](./observar-el-motor-nuevo.md)

[➡️ Siguiente: La plantilla](./la-plantilla.md)
