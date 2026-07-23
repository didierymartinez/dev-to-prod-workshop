# El daemon de proyecciones: async y consistencia eventual

Tu proyección corre **inline**: en la **misma transacción** que cada evento. Marten tiene otro modo, **async**, con un **daemon** que hace ese trabajo aparte.

## 🎯 El Objetivo

Correr la proyección en modo **async**: la escritura no espera por ella; un **worker en segundo plano** (el daemon) alimenta el read model justo después. A cambio, una consulta justo después de escribir puede no ver el cambio todavía (lo llamaremos **consistencia eventual**).

## 💥 El dolor: inline acopla la escritura a la proyección

Con `Inline`, cada `SaveChangesAsync` de un evento **corre las proyecciones ahí mismo**. Su costo se suma a cada escritura. Y una reconstrucción —rejugar millones de eventos en una proyección nueva— no cabe dentro de una transacción de escritura. Necesitas desacoplar *cuándo se escribe el evento* de *cuándo se actualiza el read model*.

## 🔧 Async + el daemon

### Paso 1 · De `Inline` a `Async` (y el daemon necesita un host)

Cambias el ciclo de vida de la proyección a `Async`. Pero una proyección async no se actualiza sola: la corre un **daemon**, un worker en segundo plano. Y un worker necesita **dónde vivir** — un *host*. Por eso, en vez de crear el store a mano con `DocumentStore.For`, registras Marten en el host con **`AddMarten`** y le enciendes el daemon.

> [!NOTE]
> 🆕 **El esqueleto de un host (idioma nuevo, te lo muestro).** Un host se arma siempre igual: `Host.CreateApplicationBuilder(args)` → registras servicios en `builder.Services` → `builder.Build()` → `await app.StartAsync()` (queda corriendo, y con él el daemon). Es la primera vez que lo ves; cópialo tal cual. Lo tuyo en el reto es solo el cableado de Marten.

> 🛠️ **Inténtalo tú.** Sobre ese esqueleto: `AddMarten` con tu misma config pero con la proyección en `ProjectionLifecycle.Async`, y encadena `.AddAsyncDaemon(DaemonMode.Solo)`.

> [!NOTE]
> 🆕 **`AddMarten` mete Marten en el contenedor.** Registra Marten en `builder.Services` (el *contenedor*), en vez de tu `DocumentStore.For` a mano — la **inyección de dependencias**, que verás a fondo en la próxima sección. El daemon lo **necesita**: es un servicio en segundo plano que vive dentro del host. Y cuando quieras el store de vuelta, se lo **pides** al contenedor con `GetRequiredService<IDocumentStore>()` (lo usarás en el checkpoint). Este host es mínimo, solo para el daemon; crecerá cuando conviertas la app en un servicio.

> [!NOTE]
> 🆕 **`AddAsyncDaemon(DaemonMode.Solo)` — y `HotCold` en producción.** Enciende el **daemon**: un worker que, en segundo plano, lee el stream de eventos y alimenta las proyecciones `Async`. `Solo` asume **un solo proceso** corriendo el daemon — perfecto en tu máquina. Pero en producción el servicio suele correr en **varias instancias** a la vez, y no quieres N daemons rejugando los mismos eventos y pisándose. Para eso está **`DaemonMode.HotCold`**: todas las instancias compiten por un **advisory lock** de Postgres y solo **una** (la "hot") corre el daemon; si esa cae, otra toma el relevo. Es el cambio de **un enum** —`Solo`→`HotCold`— y es justo lo que hace **ControlPlane** (`AddAsyncDaemon(DaemonMode.HotCold)` en cada store de lectura, para escalar el servicio sin duplicar el daemon). Marten ofrece los dos modos; el criterio es tuyo: `Solo` mientras haya un proceso, `HotCold` en cuanto escales horizontalmente.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Marten;
using JasperFx.Events;
using JasperFx.Events.Projections;
using JasperFx.Events.Daemon;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddMarten(opts =>
{
    opts.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Events.EventNamingStyle = EventNamingStyle.SmarterTypeName;
    opts.Projections.Add<ResumenEmpresaProjection>(ProjectionLifecycle.Async);   // ← Async, ya no Inline
})
.AddAsyncDaemon(DaemonMode.Solo);   // enciende el worker en segundo plano

var app = builder.Build();
await app.StartAsync();             // el daemon queda corriendo
```
</details>

### Paso 2 · Consistencia eventual: la escritura ya no espera

Con `Async`, guardar un evento **no** corre la proyección. El `SaveChangesAsync` vuelve enseguida; el daemon **alcanza** el read model un instante después. Eso significa que una consulta **justo después** de escribir podría **no ver el cambio todavía** — el read model va un pelín atrás. Eso es **consistencia eventual**, y es el precio de no bloquear la escritura.

> 🔍 **¿Lo lograste?** Con el host corriendo (`await app.StartAsync()`), saca el store del host (`var store = app.Services.GetRequiredService<IDocumentStore>()`): abre una sesión, siembra `emp-7` (`EmpresaRegistrada` + `EmpresaSuspendida`) y `SaveChangesAsync` — vuelve al instante, y una consulta **inmediata** aún **no** ve el `ResumenEmpresa`. Espera a que el daemon alcance (`await app.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5))` —bloquea hasta que las proyecciones estén al día o expire el timeout; solo para pruebas, con `using Marten.Events;`—), consulta `LoadAsync<ResumenEmpresa>("emp-7")` y **ahora sí**: `Suspendida = true`. La proyección se llenó **fuera** de tu transacción de escritura.

### Paso 3 · Checkpoints: retomar y reconstruir

¿Cómo sabe el daemon por dónde va? Guarda, por proyección, **hasta qué evento** ha procesado — un *checkpoint*— y el número del último evento del sistema, el *high water mark*. Todo eso vive en una tabla de progreso que Marten administra. Con eso, el daemon **retoma** donde quedó tras un reinicio. Y puedes **reconstruir** una proyección: borra su read model, pon su checkpoint en cero, y el daemon la **rellena de nuevo** rejugando el historial, sin tocar tus eventos ni bloquear las escrituras.

---

### El Descubrimiento

Pasaste la proyección de **inline** (misma transacción, consistencia inmediata, pero acopla la escritura) a **async** con un **daemon** (la escritura no espera, a cambio de **consistencia eventual**). El daemon lleva **checkpoints** que le dejan retomar y **reconstruir** proyecciones — algo que a mano serían días de afinación. Inline o async es una **decisión con criterio**: consistencia-ya para lecturas críticas, async para no penalizar la escritura.

> [!NOTE]
> 🌱 **Semilla — esto es lo que vigila Critter Watch.** Un monitor de sistemas Critter Stack observa exactamente al daemon: cuánto **rezago** hay entre el *high water mark* y cada checkpoint, si una proyección se atascó, cuánto tarda en alcanzar. Ese es el corazón del **Critter Watch** que quieres construir — ahora sabes qué mide y por qué importa.

> [!NOTE]
> 🌱 **Semilla — el capstone.** Ya cubriste el lado de lectura (proyecciones, inline y async). Queda la deuda que arrastras desde el swap: la **concurrencia optimista** que Marten dejó fuera. La recuperas con **`FetchForWriting`** — el cambio que empezaste el taller para poder hacer **con criterio**.

---

## ✅ Compruébalo

- [ ] Cambiaste la proyección a `ProjectionLifecycle.Async` y registraste `AddMarten(...).AddAsyncDaemon(DaemonMode.Solo)` en un host.
- [ ] Explicas por qué el daemon necesita un **host** (es un worker en segundo plano) y qué hace `AddMarten` frente a tu `DocumentStore.For`.
- [ ] Tras `SaveChangesAsync`, la proyección se llena **fuera** de la transacción; una consulta inmediata podría no verla aún (**consistencia eventual**).
- [ ] Explicas qué son el **checkpoint** y el **high water mark**, y cómo permiten **reconstruir** una proyección.
- [ ] Explicas la decisión **inline vs async** con criterio (consistencia inmediata vs. no penalizar la escritura).
- [ ] Explicas `DaemonMode.Solo` (un proceso, dev) vs `HotCold` (advisory lock, una sola instancia activa al escalar) — y que es el cambio de un enum.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué ganas y qué cedes al pasar la proyección de `Inline` a `Async`? ¿Qué vigilarías del daemon para saber si tu read model está sano?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El daemon de proyecciones: async y consistencia eventual" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Pasas la proyección a `ProjectionLifecycle.Async` y la corre un **daemon** (`AddAsyncDaemon`, dentro de un host con `AddMarten`): la escritura no espera —a cambio de **consistencia eventual**— y el daemon lleva **checkpoints** que le dejan retomar y **reconstruir** proyecciones; vigilar ese rezago es, justamente, lo que hace un monitor tipo Critter Watch.

---

[⬅️ Volver: La primera proyección](./proyecciones.md)

[➡️ Siguiente: API + Inyección de dependencias](./api-inyeccion.md)
