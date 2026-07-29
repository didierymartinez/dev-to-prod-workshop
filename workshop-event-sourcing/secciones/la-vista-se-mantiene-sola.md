# La vista se mantiene sola

Reconstruir a mano sirve para arreglar un desastre, no para el día a día. Y mantener la vista al día tiene un cabo suelto que ya asomó.

## 🎯 El Objetivo

Poner la vista al día **derivándola del diario** —con un proceso que recuerda hasta dónde leyó— de modo que el handler ya **no tenga que tocarla**. (Correrlo solo, en bucle, viene después; aquí lo corres tú.)

## 💥 El dolor: el diario avanza, la vista se queda atrás

Desde [La vista de lectura](la-vista-de-lectura.md), tu handler hace **dos** escrituras: `Append` (el hecho, al diario) y `Actualizar` (la vista). Son dos, y nada las une. Mira qué pasa si el proceso muere entre una y otra:

```csharp
// así es tu SuspenderHandler hoy: dos escrituras seguidas, con una caída injertada en medio
var s = store.AbrirStream<Empresa>("emp-1");
var e = s.Get();
e.Suspender("falta de pago");
s.Append(e);                       // 1) el hecho entra al diario
// 💥 el proceso muere aquí — nunca llegó a vista.Actualizar("emp-1", e)
```

*(Míralo para ver el hueco; no hace falta correrlo — el escenario que sí vas a ejecutar se siembra en el Paso 2.)* Consultas la vista: **emp-1 no está.** Su suspensión sí está en el diario (la fuente de la verdad), pero la vista no se enteró — y ninguna excepción saltó. El problema de fondo: **la vista depende de que cada escritor se acuerde de actualizarla**, y ese acuerdo se rompe con una caída, un `return` temprano, o un handler nuevo que se olvida.

¿Y si la vista no dependiera del escritor, sino que **se derivara del diario** por su cuenta?

## 🔧 Paso 1 · Un cursor para el diario

Para derivar la vista del diario, un proceso tendría que leerlo **poco a poco**: la primera vez desde el principio, y luego solo lo nuevo. Eso pide recordar **hasta dónde leyó** — un cursor. Y un cursor necesita ser **un solo número que avance sobre todo el diario**. Tu llave `(stream, version)` no sirve de cursor: `version` reinicia en `1` con cada empresa, así que "voy en la versión 3" no dice nada global. Necesitas un contador único para el diario entero.

> 🆕 **`BIGSERIAL`: un contador que Postgres lleva por ti.** Una columna `BIGSERIAL` se autoincrementa en cada `INSERT`: la primera fila recibe 1, la siguiente 2, y así, **cruzando todas las empresas**. Te da ese número global y creciente sin que tú lo administres — justo lo que un cursor necesita.

> 🛠️ **Inténtalo tú.** Añade a `eventos` una columna `seq BIGSERIAL`, para que cada hecho reciba un número global creciente al insertarse. La llave `(stream, version)` se queda (sigue protegiendo el orden por empresa y la concurrencia); `seq` es **además**, para poder recorrer el diario entero y marcar hasta dónde vas.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
ALTER TABLE eventos ADD COLUMN seq BIGSERIAL;
```

Postgres le asigna un número a cada fila que ya existía y a cada una nueva; de ahí en adelante, cada `INSERT` recibe el siguiente. Ahora "hasta el `seq` N" es un cursor con sentido — un solo número para todo el diario. (El orden entre empresas no importa para la corrección: cada empresa se rehidrata completa desde sus propios hechos.)

</details>

## 🔧 Paso 2 · El proyector que recuerda hasta dónde leyó

Ahora el proceso que deriva la vista. La idea: leer del diario los hechos **que aún no ha visto** (los de `seq` mayor al cursor), poner al día cada empresa que tocaron, y **avanzar el cursor**. Ese cursor guardado es el **checkpoint**.

> 🆕 **Checkpoint: un marcador de posición guardado.** Es un solo dato —el `seq` hasta el que el proyector ya llegó—. Al arrancar lee desde ahí; al terminar lo avanza. Si el proceso muere, al reabrir retoma donde iba: nunca reprocesa de más, nunca se salta lo nuevo.

Para poner al día una empresa, ya tienes todo: **rehidrátala del diario** (`AbrirStream<Empresa>(id).Get()`, tu motor de siempre) y pásasela a `Actualizar(id, empresa)` —el mismo que escribiste en [La vista de lectura](la-vista-de-lectura.md), que lee `Suspendida` y `Plan` del agregado—. Así la fila queda completa, con **todas** sus columnas, sea cual sea el hecho que llegó.

> 🛠️ **Inténtalo tú.** Consigue que este ciclo funcione:
>
> ```csharp
> // primero, siembra un escenario limpio para que los números cuadren:
> // vacía las tres tablas (eventos, empresas_estado, checkpoint) y appendea 4 hechos, SIN tocar la vista —
> //   emp-1: Registrar("Andes","Básico"), CambiarPlan("Premium"), Suspender("falta")   → 3 hechos
> //   emp-2: Registrar("Beta","Enterprise")                                             → 1 hecho
> int aplicados = CorrerProyector();   // lee desde el checkpoint, pone al día la vista, avanza el checkpoint
> // esperado: aplicados == 4 la 1ª vez y 0 la 2ª — la vista queda al día sin que ningún handler la tocara
> ```
>
> Necesitas: (1) una tabla `checkpoint(nombre TEXT PRIMARY KEY, ultimo_seq BIGINT)` con una fila para tu vista en `0`; (2) un `CorrerProyector()` que lea el `ultimo_seq`, traiga de `eventos` el `seq` y el `stream` de los hechos con `seq > ultimo_seq` **ordenados por `seq`**, y por cada uno **rehidrate esa empresa y llame `Actualizar(id, empresa)`**; al final guarde el `seq` más alto que aplicó y **devuelva cuántos aplicó** (para comprobarlo). **Y quita el `Actualizar` de los handlers que la tocaban** (`SuspenderHandler`, `PagarDeudaHandler`): la vista ya no es su trabajo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```sql
CREATE TABLE checkpoint(nombre TEXT PRIMARY KEY, ultimo_seq BIGINT NOT NULL);
INSERT INTO checkpoint VALUES ('empresas_estado', 0) ON CONFLICT DO NOTHING;
```

```csharp
int CorrerProyector()
{
    long desde = LeerCursor();                       // SELECT ultimo_seq FROM checkpoint WHERE nombre='empresas_estado'
    var nuevos = HechosDesde(desde);                 // SELECT seq, stream FROM eventos WHERE seq > desde ORDER BY seq
    long ultimo = desde;
    int aplicados = 0;
    foreach (var (seq, stream) in nuevos)
    {
        var empresa = store.AbrirStream<Empresa>(stream).Get();   // rehidrata del diario
        vista.Actualizar(stream, empresa);                        // la fila completa: suspendida Y plan
        ultimo = seq;
        aplicados++;
    }
    GuardarCursor(ultimo);                            // UPDATE checkpoint SET ultimo_seq=@ultimo WHERE nombre='empresas_estado'
    return aplicados;
}
```

Donde `HechosDesde` devuelve la lista de `(long seq, string stream)`, y `LeerCursor`/`GuardarCursor` son el `SELECT`/`UPDATE` de una línea sobre `checkpoint` que están en los comentarios. Los handlers vuelven a una **sola** escritura: `Append`. La vista es problema del proyector.

</details>

Fíjate en algo: el proyector **no mira el tipo del hecho**. Rehidrata la empresa y copia su estado entero — así una suspensión, una reactivación o un cambio de plan quedan reflejados igual, sin un `if` por tipo. Por eso la columna `plan` que añadiste la sección pasada **se mantiene sola** ahora.

### El Descubrimiento

El dolor era "cada handler tiene que acordarse de actualizar la vista". No lo eliminaste — lo **moviste a un solo sitio**: en vez de N handlers frágiles que hacen doble escritura, un proyector central que deriva la vista del diario desde un checkpoint. Y ganó tres cosas que el dual-write no tenía: se **cura solo** tras una caída (vuelve a correr y alcanza), es **idempotente** (correrlo de más no hace daño), y **reconstruir es gratis** (poner el checkpoint en 0 y correrlo *es* el `Reconstruir()` de la sección pasada). Lo único que aún haces a mano es **dispararlo**; que corra solo, en bucle, es lo siguiente.

> 🌱 Ese proyector es ya un **paso aparte** del que escribe — y el día que corra en bucle por su cuenta, puede quedar **atrás** del diario. Entre que un hecho entra al diario y el proyector lo aplica, la vista está desactualizada. ¿Cuánto? Aún no lo sabes. Y el día que una regla decida leyendo esa vista atrasada, el rezago deja de ser inofensivo. Ahí nace tu monitor.

## ✅ Compruébalo

- [ ] Tras sembrar los 4 hechos (que solo hacen `Append`) y antes de correr el proyector, la vista está **vacía**: los handlers ya no la tocan.
- [ ] `CorrerProyector()` la primera vez devuelve **4** y la vista queda completa: `emp-1` suspendida **con su plan Premium** (no en blanco), `emp-2` activa con su plan. La sacó del **diario**, no del handler.
- [ ] Correrlo otra vez devuelve **0**: el checkpoint está al día. Es **idempotente**.
- [ ] Cambia el plan de una empresa (`CambiarPlanDeEmpresa`) y corre el proyector: la columna `plan` de la vista se actualiza sola — sin un `if` por tipo de hecho.
- [ ] Pon el `ultimo_seq` del checkpoint en `0` y corre: la vista se **reconstruye entera** desde el diario. Bajar el checkpoint a 0 **es** reconstruir.

## 🆘 Si algo salió mal

- **La columna `plan` queda en blanco al proyectar:** estás escribiendo la vista mirando el *tipo* del hecho (un `if suspendida→true`) en vez de **rehidratar** la empresa y pasarla a `Actualizar(id, empresa)`. Rehidrata y copia el estado completo.
- **El proyector reaplica todo cada vez:** no guardas el checkpoint al final, o lo lees pero nunca lo subes. Revisa el `UPDATE checkpoint`.
- **La vista se salta hechos:** ordenaste por `version` o por `stream`, no por `seq`. El cursor recorre el orden **global** (`ORDER BY seq`).

## 📓 Registra tu avance

Deja en tu `DECISIONES.md`:

> La vista se **deriva del diario** por un proyector con checkpoint, no la actualiza cada handler. El proyector **rehidrata** cada empresa y copia su estado completo, así mantiene todas las columnas (incluida `plan`) sin mirar el tipo del hecho.

> 💭 **Reto:** el handler ya no toca la vista. ¿Qué ganaste al mover "poner la vista al día" a un solo proyector que sigue el diario? ¿Y por qué rehidratar el agregado le gana a un `if` por tipo de hecho?

```bash
git add .
git commit -m "ES · La vista se mantiene sola (proyector + checkpoint)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La vista dejó de depender de que cada escritor la actualice: un **proyector** la deriva del diario desde un **checkpoint** (hasta dónde leyó), rehidratando cada empresa y copiando su estado completo — así se cura tras una caída, es idempotente, y reconstruir es solo poner el checkpoint en cero.

---

[⬅️ Volver: Rejugar el diario: reconstruir la vista](./reconstruir-la-vista.md)

[➡️ Siguiente: El rezago: ¿cuánto atrás va la vista?](./el-rezago.md)
