# El proyector tropieza

El panel de rezago da por hecho que el proyector **avanza**. ¿Y si un hecho lo hace tropezar?

## 🎯 El Objetivo

Que **un** hecho que el proyector no sabe aplicar no congele **toda** la vista: apartarlo, dejar rastro, y seguir — con una lista de los apartados que le diga a tu monitor qué se atascó y dónde.

## 💥 El dolor: un hecho que no se puede digerir congela todo lo que viene detrás

Tu proyector confía en que cada hecho se puede rehidratar y aplicar. En tu sistema —un proceso, un solo mapa nombre→clase— eso casi siempre se cumple: el store **rechaza al escribir** un tipo que no conoce (`NombreDe` lanza), así que un tipo desconocido no entra por la puerta normal. Pero el diario no siempre será perfecto: una migración a medias, un arreglo manual de datos, o —más adelante, cuando el que escribe y el que proyecta sean **dos procesos distintos**— un servicio que grabó un evento nuevo antes de que actualizaras el proyector.

Para ver qué hace tu proyector ante un hecho que no puede digerir, **inyecta uno a mano** en medio del diario:

```sql
-- un hecho de un tipo que tu proyector no conoce, metido saltándose el store (como haría una migración o un 2º servicio)
INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-bomba', 1, 'tipo-desconocido', '{}');
```

Con `emp-1` (ok), `emp-bomba` (el hecho que el proyector no conoce) y `emp-2` (ok) en el diario, corres el proyector **ingenuo** (el de la sección pasada, sin protección):

```
💥 KeyNotFoundException: 'tipo-desconocido'
checkpoint = 1    (clavado antes de la bomba)
rezago     = 2    y CRECE con cada hecho nuevo
vista      = solo emp-1    — emp-2 NUNCA se proyecta
```

Un solo hecho indigerible y **la vista entera se congela**: el proyector avanza en orden por `seq`, truena al rehidratar `emp-bomba`, el checkpoint no pasa de ahí, y todo lo que viene detrás (emp-2, y cada hecho futuro) queda sin proyectar. El panel de rezago que hiciste te grita —el número sube y no baja—, pero el proyector no sabe **seguir**.

> Ojo a la granularidad: el proyector **rehidrata el stream entero** por cada hecho. Un hecho que no puede rehidratar deja fuera a **esa empresa completa** (aquí `emp-bomba` es un stream de un solo hecho, así que es una empresa; si tuviera varios, cada uno tropezaría igual).

## 🔧 Apartar el hecho y seguir

La cura no es evitar el tropiezo (no puedes prever todo hecho raro): es que **un tropiezo no pare la fila**. Envuelves el proceso de cada hecho en un `try/catch`; si falla, **lo apartas** —guardas su `seq`, su stream y el error en una tabla de fallos— y **avanzas el checkpoint igual**, para que el siguiente hecho sí se procese.

> 🆕 **Tabla de apartados (el "dead-letter" del proyector).** Una tabla `proyeccion_fallos(seq, stream, error, cuando)` donde el proyector deja los hechos que no pudo aplicar. No es un log que se pierde: es una lista consultable —el panel de **fallos** de tu monitor— que te dice qué se atascó, para decidir qué hacer con ello.

> 🛠️ **Inténtalo tú.** Crea la tabla `proyeccion_fallos(seq BIGINT PRIMARY KEY, stream TEXT, error TEXT, cuando TIMESTAMPTZ DEFAULT now())`. Endurece tu `CorrerProyector()`: por cada hecho, rodea el `store.AbrirStream<Empresa>(stream).Get()` + `vista.Actualizar(...)` con un `try/catch`. Si lanza, inserta `(seq, stream, error)` en `proyeccion_fallos` con **`ON CONFLICT (seq) DO NOTHING`** (para que reprocesar la misma bomba no reviente por clave repetida) y **sigue** — avanza el checkpoint de todos modos.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
int CorrerProyector()
{
    long desde = LeerCursor();
    long ultimo = desde; int aplicados = 0;
    foreach (var (seq, stream) in HechosDesde(desde))
    {
        try
        {
            var empresa = store.AbrirStream<Empresa>(stream).Get();   // truena si el stream trae un tipo desconocido
            vista.Actualizar(stream, empresa);
            aplicados++;
        }
        catch (Exception ex)
        {
            Apartar(seq, stream, ex.Message);   // INSERT INTO proyeccion_fallos ... ON CONFLICT (seq) DO NOTHING
        }
        ultimo = seq;                           // avanza SIEMPRE: el hecho indigerible no detiene la fila
    }
    GuardarCursor(ultimo);
    return aplicados;
}
```

`Apartar(seq, stream, error)` es un `INSERT` de una línea en `proyeccion_fallos` con `ON CONFLICT (seq) DO NOTHING`. Ahora `emp-bomba` queda en `proyeccion_fallos`, el checkpoint llega hasta el final, `emp-2` **sí** se proyecta y el rezago vuelve a `0`. La fila de `emp-bomba` en la vista **no queda a medias**: como el fallo ocurre al rehidratar, antes de tocar `Actualizar`, esa empresa se queda con su último estado bueno (o ausente si nunca se proyectó) — apartada y visible en `proyeccion_fallos`, no corrupta en la vista.

</details>

## 🔧 Reintentar o desahuciar

Apartar no es el final: es una **decisión pendiente**. Hay dos clases de fallo, y se tratan distinto:

- **Transitorio** (la base estaba ocupada un instante, un timeout): reprocesarlo más tarde probablemente funcione.
- **Permanente** (un tipo de hecho que tu código no conoce, un dato imposible): reprocesar mil veces dará mil fallos. Necesita que **alguien cambie el código** para enseñarle el tipo nuevo.

Nota honesta sobre tu proyector: como avanzaste el checkpoint al apartar, el hecho quedó **por detrás** del cursor — `CorrerProyector()` no volverá a tocarlo. Reprocesar los apartados (releer `proyeccion_fallos` y reintentar esos `seq`) es **trabajo aparte que no construimos aquí**; por ahora quedan apartados y **visibles**, que es justo lo que un panel de fallos necesita: no perder el rastro.

> 📓 En tu `DECISIONES.md`: «El proyector aparta el hecho que no puede aplicar y sigue; queda visible en `proyeccion_fallos`. Distinguir transitorio de permanente es criterio; el reproceso en sí lo dejo para cuando lo necesite.»

### El Descubrimiento

Un proyector de verdad no asume que todo hecho se aplica sin problema: **aísla el fallo de un hecho del resto de la fila**. Lo aparta, deja rastro, y sigue — así un evento raro degrada *una* empresa, no *toda* la vista de lectura. Y ese rastro (los apartados) más el rezago del panel anterior son las dos señales que te dicen si el proyector está sano: ¿va al día, y qué no pudo digerir?

> 🌱 Ya tienes una vista de lectura robusta: se mantiene sola, mides su rezago, y aísla los fallos. Con el martillo tan afilado, te va a dar por event-sourcear **todo** lo que se te cruce. Pero, ¿todo merece un diario, una proyección, un checkpoint y un panel de fallos? Hay cosas que no. Ese criterio es el próximo dolor.

## ✅ Compruébalo

- [ ] Inyecta el hecho de tipo desconocido con el `INSERT` de arriba, en medio de dos empresas sanas. El proyector **ingenuo** (sin `try/catch`) truena: el checkpoint se queda antes de la bomba y el rezago crece; las empresas que vienen detrás no se proyectan.
- [ ] Con el `try/catch` + `proyeccion_fallos`: las empresas sanas se proyectan, el rezago vuelve a `0`, y el hecho de `emp-bomba` aparece **una** vez en `proyeccion_fallos` (un stream de un solo hecho → una fila).
- [ ] `SELECT * FROM proyeccion_fallos` es tu panel de fallos: te dice `seq`, `stream` y `error` de lo que se atascó.

## 🆘 Si algo salió mal

- **El proyector sigue clavado:** el `catch` no avanza el checkpoint. El `ultimo = seq` (y el `GuardarCursor`) debe correr **tanto** en éxito como en fallo — si no, vuelves a tropezar con el mismo hecho.
- **Al reconstruir (checkpoint a 0), el proyector muere en la bomba en vez de apartarla:** te falta el `ON CONFLICT (seq) DO NOTHING`. Sin él, el segundo intento de apartar el mismo `seq` viola el `PRIMARY KEY`, y como ese `INSERT` corre dentro del `catch`, la excepción **mata al proyector**.

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué el proyector avanza el checkpoint incluso cuando aparta un hecho? ¿Qué pasaría con el rezago si no lo hiciera?

```bash
git add .
git commit -m "ES · El proyector tropieza: apartar el hecho y seguir" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un proyector robusto **aísla el fallo de un hecho del resto**: lo aparta en una lista consultable (el panel de fallos), avanza el checkpoint y sigue — así un hecho indigerible degrada una empresa, no toda la vista, y queda visible para decidir luego si reintentar o arreglar el código.

---

[⬅️ Volver: El rezago](./el-rezago.md)

[➡️ Siguiente: ¿Merecía event sourcing?](./merecia-event-sourcing.md)
