# Llegó dos veces

El outbox de la sección pasada entrega **al menos una vez**. Esa palabra —"al menos"— acaba de abrir un problema que tu lista en memoria de un solo proceso nunca te dejó ver.

## 🎯 El Objetivo

Que el consumidor no haga **daño** cuando el mismo mensaje le llega dos veces — porque con un transporte real, eso pasa tarde o temprano.

## 💥 El dolor: el mismo anuncio, cobrado dos veces

En [El outbox](./el-outbox.md), facturación solo "avisaba". Ahora dale un efecto con **lado**: al recibir `EmpresaSuspendidaV1`, **cobra una multa** por la suspensión. Un handler simple: llega el mensaje, cobra.

La verdad del transporte es *at-least-once*. Si Wolverine confirma la entrega pero el proceso cae antes de marcarla como hecha, al reintentar **entrega el mismo mensaje otra vez**. El handler corre dos veces. Facturación cobra **dos** multas por una sola suspensión.

```
mismo mensaje entregado 2 veces → multas cobradas = 2
```

Con tu `bandeja_salida` en un solo proceso nunca lo viste: no había red que fallara entre "entregué" y "marqué". Con un transporte real el reintento es inevitable, y "exactamente una vez" **no** es una garantía que compres barata: en el momento del crash, entre "hago el trabajo" y "marco hecho", solo hay tres salidas —reintentar (*at-least-once*, arriesga duplicar), no reintentar (*at-most-once*, arriesga perder), o hacer ambos pasos atómicos (*exactly-once*, que pide una transacción distribuida entre el bus y tu efecto: cara y frágil)—. La industria elige *at-least-once* y mueve la responsabilidad al **consumidor**: que aguante el duplicado.

## 🔧 Idempotencia en el consumidor

> 🆕 **Idempotente = repetirlo no cambia el resultado.** La pregunta-guía para cualquier efecto: *¿si lo hago dos veces, queda distinto que si lo hago una?* Dos caminos:
> - **Natural:** el efecto **sobrescribe**. "Poner `Suspendida = true`" dos veces deja el mismo estado — no hace falta nada. (Ojo: un efecto que **acumula** —incrementar un contador, anexar una fila, cobrar— **no** es natural aunque cambie estado.)
> - **Dedup por id:** el efecto acumula o tiene lado. Registras el **id del mensaje**; si ya lo viste, no haces nada.

> 🆕 **El id del mensaje: el `Envelope` de Wolverine.** Cada mensaje viaja en un *envelope* (el sobre del **transporte** — distinto del `EventoAlmacenado`, que era el sobre de un **hecho**). Pide el `Envelope` como parámetro del handler y usa `envelope.Id` (un `Guid`). La clave: cuando Wolverine **reentrega**, el `Id` es **el mismo** — por eso `procesados` reconoce el duplicado. Dos suspensiones **distintas** de la misma empresa son mensajes con ids **distintos**; por eso deduplicas por el id del mensaje, no por el NIT.

El dedup es el mismo patrón que ya usaste: el `ON CONFLICT DO NOTHING` que le pusiste a `pagos` en [La vista por consulta](./la-vista-por-consulta.md) para que reprocesar no duplicara — ahora con `envelope.Id` como llave en vez del `seq`.

> 🛠️ **Inténtalo tú.** Clasifica el efecto: cobrar una multa **acumula**, así que dedup. Una tabla `procesados(mensaje_id PRIMARY KEY)`. En el consumidor, recibe el `Envelope`, y `INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT DO NOTHING` con `envelope.Id`; **solo si insertaste** (una fila afectada) cobras. Para simular la reentrega, llama al handler dos veces con el **mismo** `envelope.Id` (un broker real lo hace por ti) y confirma que cobra **una** sola vez.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE procesados(mensaje_id UUID PRIMARY KEY);
```

```csharp
using Wolverine;   // Envelope

public static class FacturacionHandler
{
    public static void Handle(EmpresaSuspendidaV1 msg, Envelope envelope)
    {
        // registra el id del mensaje; si ya estaba, no hago nada (dedup)
        using var c = new NpgsqlConnection(cadena); c.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING";
        cmd.Parameters.AddWithValue("id", envelope.Id);
        if (cmd.ExecuteNonQuery() == 1)          // 1 = era nuevo; 0 = reentrega, ya lo procesé
            CobrarMulta(msg.Nit);                // el efecto que acumula, una sola vez
    }
}
```

Si el efecto fuera natural —marcar la empresa suspendida en una vista— no necesitarías nada de esto: aplicarlo dos veces deja el mismo estado. El dedup es solo para los efectos que **duelen** al repetirse.

**Un matiz de criterio:** Wolverine puede descartar algunas reentregas por su cuenta, pero el dedup de **tu** efecto debe ir atado a **tu** efecto — idealmente el `INSERT` en `procesados` y el cobro en la **misma** transacción de tu base (si el cobro es una escritura tuya). Si el efecto es de verdad externo (una API de pagos), la idempotencia final la pone **ese** sistema con su propia llave; tú le pasas una estable (el `envelope.Id`).

</details>

## 🔨 Rómpelo: el ingenuo cobra doble

Entrega el mismo mensaje dos veces (mismo `envelope.Id`) contra el consumidor ingenuo (sin dedup): dos multas. Ponle el dedup: la segunda entrega inserta cero filas (ya estaba), no cobra, y queda **una** multa. Es la misma diferencia del `ON CONFLICT` que le pusiste a `pagos` — ahora la llave no es el `seq` del hecho, es el id del mensaje del transporte.

## El Descubrimiento

Un transporte real entrega *at-least-once*: "exactamente una vez" pediría una transacción distribuida entre el bus y tu efecto —cara y frágil—, así que la industria acepta el duplicado y lo vuelve responsabilidad del **consumidor**. Ser idempotente no es una receta única, es criterio: te preguntas *¿repetir este efecto cambia el resultado?* — si sobrescribe un estado, no haces nada; si acumula o tiene lado (cobrar, enviar, llamar), deduplicas por el **id del mensaje**, que Wolverine mantiene estable entre reentregas. Es la misma idempotencia que le diste al proyector con `ON CONFLICT`, ahora contra el bus en vez del diario. Y el criterio de mantenedor: dedup por el id del **mensaje**, no por un dato del negocio, o borrarías eventos legítimos que casualmente se parecen.

> 🌱 Llevas dos secciones adoptando la mensajería de Wolverine. Falta cerrar el otro hermano: aquel proyector que corría tu vista en bucle, con su checkpoint, ahora es el **daemon** de Marten — y con él, la consistencia eventual que mediste a mano en [El rezago](./el-rezago.md) deja de ser un accidente y pasa a ser algo que **declaras** y configuras. Ese es el próximo paso: [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md).

## ✅ Compruébalo

- [ ] El consumidor ingenuo, ante el mismo mensaje entregado dos veces (mismo `envelope.Id`), cobra doble.
- [ ] Con dedup por `envelope.Id` (`ON CONFLICT DO NOTHING` + "solo si inserté"), el mismo mensaje dos veces cobra **una** vez.
- [ ] Sabes clasificar un efecto con la pregunta "¿repetirlo cambia el resultado?" — y ves que "incrementar un contador" cambia estado pero **no** es idempotente.
- [ ] Sabes decir por qué "exactamente una vez" pediría una transacción distribuida (cara), y por qué el id del mensaje es estable entre reentregas.

## 🆘 Si algo salió mal

- **Sigue cobrando doble:** haces el efecto **antes** de chequear el `ON CONFLICT`, o no condicionas el cobro a "inserté una fila". El cobro va solo cuando el `INSERT` afectó 1 fila.
- **La segunda entrega también cobra:** estás simulando con **ids distintos**. Una reentrega real trae el **mismo** `envelope.Id`; para la prueba, reusa el mismo id.
- **Deduplicas por el NIT y pierdes cobros legítimos:** dos suspensiones **distintas** de la misma empresa son mensajes con ids **distintos**; dedup por `envelope.Id`, no por el NIT.
- **`procesados` crece sin techo:** cierto — en producción se poda (por antigüedad); queda fuera del alcance aquí, pero es una tabla más que un observador vigilaría.

## 📓 Registra tu avance

> 💭 **Reto:** da dos efectos de tu dominio — uno naturalmente idempotente (sobrescribe) y otro que acumula o tiene lado (necesita dedup) — y explica por qué el segundo se deduplica por el **id del mensaje** y no por un dato del negocio.

```bash
git add .
git commit -m "ES · Llegó dos veces (idempotencia en el consumidor)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un transporte real entrega *at-least-once* —"exactamente una vez" pediría una transacción distribuida, cara—, así que el consumidor debe ser **idempotente**: nada si el efecto sobrescribe un estado, o dedup por el **id del mensaje** (`envelope.Id`, estable entre reentregas; `ON CONFLICT`, como el proyector) si acumula o tiene lado.

---

[⬅️ Volver: El outbox](./el-outbox.md)

[➡️ Siguiente: El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md)
