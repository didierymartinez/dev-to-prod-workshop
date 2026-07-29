# La vista por consulta

Tienes una vista que responde "¿quién está suspendida?". Conciliación llega con una pregunta que esa vista no vio venir.

## 🎯 El Objetivo

Responder "¿cuánto ha pagado cada empresa?" — una pregunta que ni tu vista de estado ni el agregado saben responder — con un read model **diseñado por esa consulta**.

## 💥 El dolor: la respuesta vive en los hechos, no en el estado

Conciliación pide un reporte: **cuánto ha pagado cada empresa, y cuántos pagos**. Tu instinto es la vista `Suspendidas`. Pero esa tabla es `empresas_estado(id, suspendida, plan)`: no tiene ni idea de pagos.

Bien, entonces rehidrata cada empresa, como hacías en [La vista de lectura](./la-vista-de-lectura.md) antes de tener una vista. Rehidratas `emp-1` y miras qué te da el agregado:

```csharp
var e = store.AbrirStream<Empresa>("emp-1").Get();
// e.DeudaPendiente  → false     ¿cuánto pagó en total? ¿cuántas veces? el agregado NO lo sabe
```

`DeudaPendiente` es un **bool**. El agregado plegó toda la historia de pagos a "¿debe o no debe?" — que es lo único que sus reglas necesitan.

Aquí el instinto salta: *"pues le agrego un `TotalPagado` y un `NumeroPagos` al agregado, los sumo en `Aplicar`, y rehidratando ya respondo"*. Puedes — pero mira el costo. Para el reporte de **todas**, rehidratarías las diez mil empresas que existen, una por una (el escaneo carísimo de [La vista de lectura](./la-vista-de-lectura.md)); engordarías tu modelo de **escritura** con datos que solo un reporte necesita; y aun así no podrías listar, agrupar ni filtrar pago por pago. La respuesta no va en el estado: los montos están en el diario (cada `PagoRegistrado(Monto)` los guarda), pero el **estado actual** los tiró. La pregunta no es por un estado — es por la **historia** de un tipo de hecho.

## 🔧 Un read model con la forma de la pregunta

La pregunta pide una fila por pago (para poder sumarlos, contarlos, agruparlos). Así que construyes **otra** vista, con esa forma: `pagos(seq, empresa, monto)` — una fila por cada `PagoRegistrado` del diario. Y la derivas del diario **igual que `Suspendidas`**: un proyector que recorre los hechos nuevos desde un checkpoint. Solo que este, en vez de rehidratar el agregado y copiar su estado, lee el **hecho individual** y escribe una fila.

> 🆕 **Varios read models sobre el mismo diario, cada uno con su checkpoint.** El diario es una sola fuente de verdad; las vistas son muchas, una por pregunta. Cada proyector lleva su **propia** fila de `checkpoint` (por `nombre`), así corre a su ritmo, independiente de los demás. Aquí por fin pagas el `nombre TEXT PRIMARY KEY` que le pusiste al `checkpoint` en [La vista se mantiene sola](./la-vista-se-mantiene-sola.md): entonces tenía una sola fila; ahora tiene dos. Añadir una pregunta no toca las vistas que ya existen.

> 🛠️ **Inténtalo tú.** Haz que este reporte funcione:
>
> ```sql
> SELECT empresa, SUM(monto) AS total, COUNT(*) AS pagos FROM pagos GROUP BY empresa;
> -- emp-1 | 800 | 2
> ```
>
> Para eso: (1) crea `pagos(seq BIGINT PRIMARY KEY, empresa TEXT NOT NULL, monto INT NOT NULL)` — el `seq` del hecho de llave primaria; (2) dale su fila de checkpoint (`INSERT INTO checkpoint VALUES ('pagos', 0)`); (3) **generaliza** tus `LeerCursor`/`GuardarCursor`/`HechosDesde` de [La vista se mantiene sola](./la-vista-se-mantiene-sola.md) para que reciban el `nombre` del checkpoint y traigan también `tipo` y `datos` (los usan los dos proyectores); (4) escribe `CorrerProyectorPagos()` que, por cada hecho `pago-registrado`, deserialice el `PagoRegistrado` e inserte `(seq, stream, Monto)` con `ON CONFLICT (seq) DO NOTHING`, avanzando el cursor sobre **todos** los hechos vistos, no solo los pagos.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE pagos(seq BIGINT PRIMARY KEY, empresa TEXT NOT NULL, monto INT NOT NULL);
INSERT INTO checkpoint VALUES ('pagos', 0) ON CONFLICT DO NOTHING;
```

```csharp
int CorrerProyectorPagos()
{
    long desde = LeerCursor("pagos");                       // el mismo helper de §18, ahora con nombre
    var nuevos = HechosDesde(desde);                        // SELECT seq, stream, tipo, datos FROM eventos WHERE seq>desde ORDER BY seq
    long ultimo = desde;
    int aplicados = 0;
    foreach (var (seq, stream, tipo, datos) in nuevos)
    {
        if (tipo == "pago-registrado")                      // solo este hecho alimenta esta vista
        {
            var pago = JsonSerializer.Deserialize<PagoRegistrado>(datos)!;
            if (InsertarPago(seq, stream, pago.Monto) == 1) // INSERT ... ON CONFLICT (seq) DO NOTHING → devuelve filas insertadas
                aplicados++;                                // cuenta inserciones REALES, no hechos vistos
        }
        ultimo = seq;                                       // el cursor avanza sobre TODO el diario, igual que el de Suspendidas
    }
    GuardarCursor("pagos", ultimo);
    return aplicados;
}
```

El reporte de conciliación:

```sql
SELECT empresa, SUM(monto) AS total, COUNT(*) AS pagos FROM pagos GROUP BY empresa ORDER BY empresa;
```

Tres cosas que cierran huecos:

- **La diferencia con el proyector de `Suspendidas`:** aquél **rehidrata** el agregado y copia su estado (una fila por empresa, siempre la de hoy); este lee el **hecho** y agrega una fila (una por pago, que nunca cambia). Misma maquinaria —`seq`, checkpoint, `ORDER BY seq`—, dos formas distintas porque son dos preguntas distintas.
- **Deserializar `datos` directo:** en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md) aprendiste a reconciliar la forma al leer. `PagoRegistrado` no ha evolucionado de forma, así que aquí basta deserializar directo; si evolucionara, este proyector —como cualquier lectura— pasaría por su upcaster.
- **Por qué el `DO NOTHING` además del checkpoint:** el checkpoint ya evita reprocesar en la marcha normal. El `seq` PK con `DO NOTHING` cubre los otros dos casos: reconstruir bajando el cursor a 0, y una caída entre insertar y guardar el cursor. Por eso `aplicados` cuenta **inserciones reales** (`ExecuteNonQuery == 1`): en una reconstrucción sin vaciar la tabla, todo choca contra el `DO NOTHING` y el conteo es 0, como esperas.

</details>

## 🔨 Rómpelo: intenta responder con lo que ya tienes

Antes de dar por buena la vista nueva, prueba las dos salidas fáciles y míralas fallar:

- `SELECT * FROM empresas_estado` → no hay ninguna columna de monto. La vista de estado **no puede** responder.
- Rehidrata `emp-1` y busca el total pagado → el agregado solo te da `DeudaPendiente` (bool). El estado **no conserva** los montos.

Solo la vista `pagos`, que proyecta el **hecho** `PagoRegistrado`, responde `emp-1 = $800 (2 pagos)`. La respuesta estaba en el diario todo el tiempo; te faltaba una vista con la forma de la pregunta.

## El Descubrimiento

No hay **un** read model canónico: hay tantos como preguntas, y todos se derivan del **mismo** diario. La forma de cada vista la dicta su consulta, no el hecho ni el agregado. Y hay dos estilos de proyección, que ya usaste los dos: **por estado** (rehidratas el agregado y copias su foto de hoy — `Suspendidas`) y **por hecho** (una fila por evento, que no cambia — `pagos`). La pregunta-guía para elegir: *¿quiero el estado de hoy de una entidad (→ por estado), o la historia/agregación de un tipo de hecho (→ por hecho)?* La fuente es una y es la verdad; las vistas son muchas, desechables y reconstruibles —cada una con su checkpoint— y agregar una no toca las demás. Esto es, por fin, el lado de **lectura** separado de verdad del de escritura: no una vista, sino un catálogo de vistas sobre un solo diario.

> 🌱 Fíjate dónde vive todo esto: el diario, los dos proyectores, las dos vistas, los checkpoints — **todo en la misma base, en tu mismo proceso**. Un hecho entra y, tarde o temprano, tus proyectores lo ven porque leen la misma tabla. Pero pronto un hecho va a tener que servirle a algo que vive **afuera** —otro contexto, otro proceso, que no comparte tu base—. Ahí "que lo lea de mi tabla" deja de ser una opción, y anunciar un hecho hacia afuera abre un problema que no has tenido: ¿y si el anuncio sale pero el hecho no se guardó? Ese es el próximo dolor: [El hecho y su anuncio](./el-hecho-y-su-anuncio.md).

## ✅ Compruébalo

- [ ] `CorrerProyectorPagos()` la primera vez inserta tantas filas como hechos `pago-registrado` hay; corrido de nuevo, aplica **0** (checkpoint al día).
- [ ] Tras correr, el `ultimo_seq` de la fila `'pagos'` es igual al `MAX(seq)` de `eventos` — el cursor avanzó sobre los hechos que **no** son pagos, no se quedó atascado en el último pago.
- [ ] El reporte `GROUP BY empresa` da el total y el conteo correctos por empresa, y su checkpoint (`'pagos'`) es **independiente** del de `Suspendidas`.
- [ ] Ni `empresas_estado` ni rehidratar el agregado pueden dar el total pagado — explicas por qué (el estado plegó los montos a un bool).
- [ ] Para reconstruir: `TRUNCATE pagos`, checkpoint `'pagos'` a `0`, y correr — reinserta todo con los mismos totales. (Sin vaciar la tabla, correr desde 0 aplica **0**: el `DO NOTHING` protege las filas.)

## 🆘 Si algo salió mal

- **La vista `pagos` duplica filas al reprocesar:** te falta el `ON CONFLICT (seq) DO NOTHING`, o no usaste el `seq` del hecho como PK. El `seq` es único por hecho: es tu idempotencia.
- **El cursor se queda atascado:** si haces `ultimo = seq` **dentro** del `if`, el cursor se detiene en el `seq` del último pago y re-escanea todos los hechos posteriores en cada corrida. `ultimo = seq` va **fuera** del `if`, para avanzar sobre todos los hechos vistos.
- **`SUM` da de menos:** el proyector filtró por `tipo` en el `WHERE` del `SELECT` y perdió el avance del cursor; trae todos los hechos y filtra en el `foreach`, como el de `Suspendidas`.

## 📓 Registra tu avance

> 💭 **Reto:** tu vista `Suspendidas` proyecta *por estado* (rehidrata) y `pagos` proyecta *por hecho* (una fila por evento). Da una tercera pregunta del dominio y decide, con la pregunta-guía, cuál de los dos estilos le corresponde — y por qué.

```bash
git add .
git commit -m "ES · La vista por consulta (un read model por pregunta)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

No hay un read model único: hay uno por pregunta, todos derivados del mismo diario y cada uno con su checkpoint — unos proyectan *por estado* (rehidratando el agregado) y otros *por hecho* (una fila por evento), y la pregunta —estado de hoy vs. historia de un tipo de hecho— decide cuál.

---

[⬅️ Volver: La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)

[➡️ Siguiente: El hecho y su anuncio](./el-hecho-y-su-anuncio.md)
