# El rezago: ¿cuánto atrás va la vista?

El proyector ya no vive dentro del handler: lo **disparas tú**, aparte de la escritura. Eso lo hace robusto — pero abre una grieta.

## 🎯 El Objetivo

Medir **cuánto atrás va la vista** respecto del diario —tu primer instrumento para ver el sistema respirar— y entender por qué, con ese rezago, **no puedes decidir leyendo la vista**.

## 💥 El dolor: acabo de escribirlo y la vista no lo sabe

Un comando suspende una empresa (que registras activa para la prueba), y consultas la vista **de inmediato**, sin correr el proyector:

```csharp
var stream = store.AbrirStream<Empresa>("emp-4");
var emp = stream.Get();
emp.Registrar("Delta", "Básico");   // emp-4 nace activa
emp.Suspender("falta de pago");     // y un comando la suspende
stream.Append(emp);                 // ambos hechos van al diario — el proyector NO ha corrido

bool laVistaLaSuspende = vista.Listar().Contains("emp-4");   // false — Listar() son las suspendidas según la vista
```

`false`. Acabas de suspender a emp-4, está en el diario, y la vista no la tiene entre las suspendidas. No es un bug: el proyector **todavía no ha corrido**. Escribir y leer dejaron de ser lo mismo — hay una ventana entre ambos. La pregunta incómoda: **¿de qué tamaño es esa ventana?** Ahora mismo no lo sabes, y "no lo sé" es un mal sitio para un sistema que crece.

## 🔧 Paso 1 · Medir el rezago

Tienes las dos puntas: el **frente del diario** (el `seq` más alto que existe) y **hasta dónde leyó el proyector** (el checkpoint). La distancia entre ambos es el rezago, en hechos.

> 🛠️ **Inténtalo tú.** Escribe un `Rezago()` que devuelva cuántos hechos le faltan a la vista, y pruébalo: haz `Append` de unos hechos **sin** correr el proyector y míralo subir; corre el proyector y míralo caer a `0`.
>
> ```csharp
> // con 3 hechos en el diario aún sin proyectar:
> Rezago();   // → 3  (el diario va 3 hechos adelante del checkpoint)
> ```
>
> Es una resta: el **frente del diario** (`MAX(seq)` de `eventos`) menos **hasta dónde leyó el proyector** (el `ultimo_seq` del `checkpoint`, que ya lees con `LeerCursor()`). Cero significa que la vista está al día.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
long Rezago()
{
    long frente = FrenteDelDiario();   // SELECT COALESCE(MAX(seq), 0) FROM eventos
    long leido  = LeerCursor();        // el de la sección pasada: SELECT ultimo_seq FROM checkpoint WHERE nombre='empresas_estado'
    return frente - leido;
}
```

`FrenteDelDiario()` es un `SELECT` de una línea, con el mismo patrón Npgsql que ya usas; `LeerCursor()` lo tienes de la sección anterior. Haz `Append` de tres hechos sin correr el proyector: `Rezago()` da `3`. Corre el proyector: da `0`. Acabas de construir el **primer panel de tu monitor** — el pulso que dice si la vista respira al día o se está quedando atrás.

</details>

## 🔧 Paso 2 · Por qué no se decide leyendo la vista

El rezago es inofensivo si a la vista solo la **mira un humano** en pantalla: se pone al día en la próxima corrida del proyector y nadie se rompe. Se vuelve peligroso el día que **una regla decide** leyéndola. Provócalo:

> 🔨 **Rómpelo tú.** Registra `emp-5` activa, suspéndela (un `Append`) y **no corras el proyector**. Ahora compara las dos formas en que una regla podría decidir si aún puede reactivarse:
> - **leyendo la vista:** `bool pareceReactivable = !vista.Listar().Contains("emp-5");` → **true** (la vista atrasada no la tiene entre las suspendidas) → la regla reactivaría una empresa recién suspendida. Invariante violada, sin un solo error.
> - **rehidratando el diario:** `bool estaSuspendida = store.AbrirStream<Empresa>("emp-5").Get().Suspendida;` → **true** → la regla bloquea. Correcto.

El diario **sí** tiene la suspensión de emp-5. La diferencia está en **a quién le preguntas**: la vista es una conclusión que puede ir atrasada; el diario es la verdad. Por eso tus comandos deciden **rehidratando el agregado desde el diario** (como vienes haciendo desde [El Command Handler](el-command-handler.md)) — nunca leyendo una proyección. La vista es para **responder preguntas**, no para **tomar decisiones**.

### El Descubrimiento

Separar lectura de escritura tiene un precio con nombre: el **rezago**. No es un defecto que se arregla — es inherente, y lo que se hace con él es **medirlo** (tu primer panel) y **respetarlo**: quien mira, tolera el rezago; quien decide, va al diario. Ese instrumento que acabas de escribir —frente menos checkpoint— es la primera pieza de un monitor que, sección a sección, te dejará ver el sistema respirar.

> 🌱 Un panel que mide el rezago asume que el proyector **avanza**. ¿Y si un hecho lo hace **tropezar** —un evento que su código no sabe aplicar, y revienta a mitad del lote? El proyector se queda clavado, el rezago crece y crece… y hay que decidir si reintentar o apartar ese hecho. Ese es el próximo dolor.

## ✅ Compruébalo

- [ ] `Rezago()` da la distancia en hechos: sube al appendear, baja a `0` al proyectar.
- [ ] Tras `Append` sin proyectar, la vista **no** refleja el hecho recién escrito (read-your-write roto, a propósito).
- [ ] Con emp-5 suspendida sin proyectar: `!vista.Listar().Contains("emp-5")` da **true** (la regla la reactivaría — mal), y `store.AbrirStream<Empresa>("emp-5").Get().Suspendida` da **true** (la regla que rehidrata el diario la bloquea — bien).

## 🆘 Si algo salió mal

- **`Rezago()` da negativo:** estás restando al revés, o leíste el checkpoint de otra vista. Es `frente − leido`.
- **Da 0 aunque hay hechos sin proyectar:** ¿tu `MAX(seq)` apunta a la tabla `eventos` y no a la vista? Confirma que los `Append` insertan en `eventos`.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md`:

> Mido el rezago (frente del diario − checkpoint). Los comandos deciden rehidratando el diario, **nunca** leyendo una proyección: la vista puede ir atrás.

> 💭 **Reto:** ¿en qué casos el rezago es gratis y en cuáles es peligroso? Da un ejemplo de cada uno con la `Empresa`.

```bash
git add .
git commit -m "ES · El rezago: medir cuánto atrás va la vista" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Separar lectura de escritura trae **rezago**: la vista va atrás del diario. Se mide (frente − checkpoint) — el primer panel de tu monitor — y se respeta: quien mira tolera el rezago, quien decide va al diario, nunca a la vista.

---

[⬅️ Volver: La vista se mantiene sola](./la-vista-se-mantiene-sola.md)

[➡️ Siguiente: El proyector tropieza](./el-proyector-tropieza.md)
