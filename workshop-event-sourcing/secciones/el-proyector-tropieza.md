# El proyector tropieza

El panel de rezago da por hecho que el proyector **avanza**. ¿Y si un hecho lo hace tropezar?

## 🎯 El Objetivo

Que **un** hecho que el proyector no sabe aplicar no congele **toda** la vista: apartarlo, dejar rastro en una lista que tu monitor pueda consultar, y seguir. Y saber cuándo apartar no basta: cuando el que falla es tu `Aplicar`.

## 💥 El dolor: un hecho que no se puede digerir congela todo lo que viene detrás

Tu proyector confía en que cada hecho se puede rehidratar y aplicar. En tu sistema eso casi siempre se cumple: el store **rechaza al escribir** un tipo que no conoce (`NombreDe` lanza). Pero el diario no siempre será perfecto: una migración a medias, un arreglo manual de datos, o un segundo servicio que grabó un evento nuevo antes de que actualizaras el proyector.

**Inyecta a mano**, en medio del diario, un hecho que tu proyector no pueda digerir:

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

Un solo hecho indigerible y **la vista entera se congela**: el proyector avanza en orden por `seq`, truena al rehidratar `emp-bomba`, y todo lo que viene detrás (emp-2, y cada hecho futuro) queda sin proyectar. Tu panel de rezago lo grita, pero el proyector no sabe **seguir**.

> Ojo a la granularidad: el proyector **rehidrata el stream entero** por cada hecho, así que un hecho que no puede rehidratar deja fuera a **esa empresa completa** (si el stream tuviera varios hechos, cada uno tropezaría igual).

## 🔧 Apartar el hecho y seguir

La cura no es evitar el tropiezo (no puedes prever todo hecho raro): es que **un tropiezo no pare la fila**. Si un hecho falla, **lo apartas** y **avanzas el checkpoint igual**, para que el siguiente sí se procese.

> 🆕 **Tabla de apartados (el "dead-letter" del proyector).** Una tabla `proyeccion_fallos(seq, stream, error, cuando)` donde el proyector deja los hechos que no pudo aplicar. No es un log que se pierde: es una lista consultable, el panel de **fallos** de tu monitor, para decidir qué hacer con lo que se atascó.

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

`Apartar(seq, stream, error)` es un `INSERT` de una línea en `proyeccion_fallos` con `ON CONFLICT (seq) DO NOTHING`. Ahora `emp-bomba` queda en `proyeccion_fallos`, el checkpoint llega hasta el final, `emp-2` **sí** se proyecta y el rezago vuelve a `0`. La fila de `emp-bomba` en la vista **no queda a medias**: el fallo ocurre al rehidratar, antes de `Actualizar`, así que esa empresa se queda con su último estado bueno (o ausente si nunca se proyectó).

</details>

## 🔧 Reintentar o desahuciar

Apartar no es el final: es una **decisión pendiente**. Un fallo **transitorio** (la base estaba ocupada un instante, un timeout) probablemente funcione si lo reprocesas más tarde. Uno **permanente** (un tipo de hecho que tu código no conoce, un dato imposible) dará mil fallos en mil intentos: necesita que **alguien cambie el código**.

Como avanzaste el checkpoint al apartar, el hecho quedó **por detrás** del cursor: `CorrerProyector()` no volverá a tocarlo. Reprocesar los apartados (releer `proyeccion_fallos` y reintentar esos `seq`) es trabajo aparte que no construyes aquí; por ahora quedan **visibles**, que es lo que un panel de fallos necesita.

> 📓 En tu `DECISIONES.md`: «El proyector aparta el hecho que no puede aplicar y sigue; queda visible en `proyeccion_fallos`. Distinguir transitorio de permanente es criterio; el reproceso en sí lo dejo para cuando lo necesite.»

## 🔧 Cuando el que falla es tu `Aplicar`

La primera bomba era un tipo que tu código no conoce. La segunda es un hecho que tu código **sí** conoce, válido, cuyo `Aplicar` lanza.

> 🔨 **Rómpelo tú (la segunda bomba).** Haz que el `case EmpresaReactivada` de tu `Empresa` lance si la empresa no estaba suspendida:
>
> ```csharp
> case EmpresaReactivada:
>     if (!Suspendida) throw new InvalidOperationException("Reactivada sin estar suspendida.");
>     Suspendida = false; Reactivaciones++;
>     break;
> ```
>
> En el código real el `throw` suele venir escondido: un `FindIndex` que no encuentra devuelve `-1`, y `lista[-1]` lanza igual. Registra `emp-6` activa (`Registrar("Zeta", "Básico")` y `Append`) y corre el proyector: `emp-6` entra a la vista. Ahora inyecta a mano, como la primera bomba, una reactivación sobre esa empresa activa:
>
> ```sql
> INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-6', 2, 'empresa-reactivada', '{}');
> ```
>
> Corre el proyector. La aparta: hay una fila nueva en `proyeccion_fallos` con `emp-6` y `Reactivada sin estar suspendida.`, y el rezago vuelve a `0`. Ahora carga la empresa, que es lo primero que hace cualquier comando sobre ella:
>
> ```csharp
> var e6 = store.AbrirStream<Empresa>("emp-6").Get();
> ```
>
> ```
> 💥 InvalidOperationException: Reactivada sin estar suspendida.
> ```

Apartar dejó rastro, pero no curó nada: el hecho sigue en el diario, que no se edita, y cada vez que algo rehidrata `emp-6` vuelve a tropezar. Todo comando sobre ella falla en `Get()`, y la vista se queda con la fila de antes de la bomba. Y el hecho es válido: pudo llegar de una migración, de un arreglo de datos, o de una versión vieja de tu `Reactivar` que no validaba. Las reglas de hoy viven en los verbos; el diario guarda hechos escritos con las reglas de ayer.

La cura ya está en tu `DECISIONES.md`, desde [El agregado recuerda](el-agregado-recuerda.md): `Aplicar` no valida ni lanza. Un `Aplicar` **total** termina sin lanzar con todo hecho que conoce: si no encuentra lo que busca, no hace nada.

> 🛠️ **Inténtalo tú.** Quieres que esto funcione otra vez, sin tocar el diario:
>
> ```csharp
> var s6 = store.AbrirStream<Empresa>("emp-6");
> var e6 = s6.Get();                // ya no lanza
> e6.Suspender("falta de pago");
> s6.Append(e6);
> CorrerProyector();                // la vista muestra emp-6 suspendida
> ```
>
> Cambia solo el `case EmpresaReactivada`: si la empresa no estaba suspendida, no hay suspensión que cerrar, y el hecho no cambia nada.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
case EmpresaReactivada:
    if (!Suspendida) break;          // no hay suspensión que cerrar: el hecho no cambia nada
    Suspendida = false; Reactivaciones++;
    break;
```

`Get()` vuelve a cargar `emp-6`, y la fila de `proyeccion_fallos` queda como rastro de lo que pasó. Con un `FindIndex`, la cura tiene la misma forma: si da `-1`, no hagas nada.

</details>

> 📓 En tu `DECISIONES.md`: «Mi `Aplicar` es total: con un hecho que conoce, nunca lanza. Si no encuentra lo que busca, no hace nada. Apartar en `proyeccion_fallos` es para lo que el código no conoce.»

### El Descubrimiento

Un proyector de verdad **aísla el fallo de un hecho del resto de la fila**: lo aparta, deja rastro y sigue, así un evento raro degrada *una* empresa, no *toda* la vista de lectura. Los apartados y el rezago son las dos señales de un proyector sano: ¿va al día, y qué no pudo digerir? Apartar tiene un límite: si el hecho es válido y lo que lanza es tu `Aplicar`, la cura está en el agregado, un `Aplicar` total.

> 🌱 Tu vista de lectura se mantiene sola, mides su rezago y aísla los fallos. Con el martillo tan afilado, te va a dar por event-sourcear **todo** lo que se te cruce. Pero no todo merece un diario, una proyección, un checkpoint y un panel de fallos. Ese criterio es el próximo dolor.

## ✅ Compruébalo

- [ ] Inyecta el hecho de tipo desconocido con el `INSERT` de arriba, en medio de dos empresas sanas. El proyector **ingenuo** (sin `try/catch`) truena: el checkpoint se queda antes de la bomba y el rezago crece; las empresas que vienen detrás no se proyectan.
- [ ] Con el `try/catch` + `proyeccion_fallos`: las empresas sanas se proyectan, el rezago vuelve a `0`, y `SELECT * FROM proyeccion_fallos` muestra **una** fila de `emp-bomba` (un stream de un solo hecho), con su `seq`, `stream` y `error`.
- [ ] Con la segunda bomba (el `case EmpresaReactivada` que lanza y el `empresa-reactivada` inyectado sobre `emp-6` activa): el proyector la aparta, pero `store.AbrirStream<Empresa>("emp-6").Get()` sigue lanzando `InvalidOperationException`.
- [ ] Con el `Aplicar` total, sin tocar el diario: `Get()` carga `emp-6`, un `Suspender` entra al diario y el proyector la muestra suspendida en la vista.

## 🆘 Si algo salió mal

- **El proyector sigue clavado:** el `catch` no avanza el checkpoint. El `ultimo = seq` (y el `GuardarCursor`) debe correr **tanto** en éxito como en fallo.
- **El `INSERT` de la segunda bomba falla por clave duplicada:** `emp-6` ya tiene un hecho en la versión `2`. Usa la siguiente libre: `SELECT MAX(version) FROM eventos WHERE stream = 'emp-6'`, más uno.
- **Al reconstruir (checkpoint a 0), el proyector muere en la bomba en vez de apartarla:** te falta el `ON CONFLICT (seq) DO NOTHING`. El segundo intento de apartar el mismo `seq` viola el `PRIMARY KEY`, y como ese `INSERT` corre dentro del `catch`, la excepción **mata al proyector**.

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué el proyector avanza el checkpoint incluso cuando aparta un hecho? ¿Qué pasaría con el rezago si no lo hiciera?

```bash
git add .
git commit -m "ES · El proyector tropieza: apartar el hecho y seguir" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un proyector robusto **aísla el fallo de un hecho del resto**: lo aparta en una lista consultable, avanza el checkpoint y sigue, así un hecho indigerible degrada una empresa, no toda la vista. Si el hecho es válido y lo que lanza es tu `Aplicar`, apartar no cura: la cura es un `Aplicar` total, que nunca lanza con un hecho que conoce.

---

[⬅️ Volver: El rezago](./el-rezago.md)

[➡️ Siguiente: ¿Merecía event sourcing?](./merecia-event-sourcing.md)
