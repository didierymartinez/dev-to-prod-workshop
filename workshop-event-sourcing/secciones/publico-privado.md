# Público vs privado: qué hecho cruza la frontera

En [El handler por convención](handler-por-convencion.md) devolver un evento hizo que Wolverine lo **publicara** a otros handlers. Pero surge la pregunta: ¿a quién? Hoy todos tus hechos son iguales. Unos son **asunto interno** de tu servicio (solo tus read models los miran). Otros deben **cruzar** a otros servicios: cuando suspendes una empresa, **facturación** —otro servicio— tiene que enterarse para dejar de cobrar. Necesitas **distinguirlos**. Y hacerlo sin una bandera dentro del evento ni un `if` en el código que publica.

## 🎯 El Objetivo

Marcar cada evento como **público** (cruza a otros servicios) o **privado** (se queda dentro) con dos interfaces vacías, y decidir cuáles salen a otros servicios en **un solo lugar al arrancar la app**, no en el código que publica el hecho.

## 💥 El dolor: publicar sin frontera acopla todo con todo

Un evento que expones se vuelve un **contrato**: otro servicio empieza a depender de su forma, y ya no puedes cambiarlo sin romperlo. Si publicas **todos** tus hechos hacia afuera, cada detalle interno de tu dominio se convierte en una promesa pública. Y al revés: si un hecho que facturación necesita se queda encerrado en tu proceso, facturación nunca se entera. Quieres decidir, hecho por hecho, **cuáles cruzan la frontera** — y que esa decisión no ensucie ni el evento ni el handler.

## 🔧 Los marcadores y el ruteo por arranque

### Paso 1 · Dos interfaces vacías

> 🛠️ **Inténtalo tú.** Quieres poder **etiquetar** un evento con su intención y que el resto del sistema la lea. Haz que este código compile:
>
> ```csharp
> public record EmpresaSuspendida(string Motivo) : IPublicEvent;        // facturación lo necesita
> public record EmpresaMarcadaParaRevision(string Nota) : IPrivateEvent; // solo tu read model interno
> ```
>
> Crea `IEvent` (base), y `IPublicEvent`/`IPrivateEvent` que hereden de ella — **sin un solo miembro**.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IEvent;                       // raíz común de todo hecho
public interface IPublicEvent : IEvent;        // cruza a otros servicios
public interface IPrivateEvent : IEvent;       // se queda dentro de este servicio
```
</details>

> [!NOTE]
> 🆕 **Interfaz marcadora (vacía).** Una interfaz sin métodos no pide nada; solo **etiqueta** al tipo que la implementa. `EmpresaSuspendida : IPublicEvent` no gana comportamiento — gana una **intención** que el código puede consultar (`typeof(EmpresaSuspendida).IsAssignableTo(typeof(IPublicEvent))`). Marcar sin obligar: la interfaz vacía solo cuelga una etiqueta que el código puede consultar.

> [!NOTE]
> 🆕 **Público = contrato; privado por defecto.** La regla de criterio: un evento es **privado** salvo que otro servicio tenga una necesidad real de verlo. Promoverlo a **público** es firmar un contrato que mantendrás **para siempre** (otros dependen de su forma). Por eso no marcas todo público "por si acaso": expones lo mínimo. `EmpresaSuspendida` cruza porque facturación debe reaccionar; `EmpresaMarcadaParaRevision` se queda porque es un detalle interno tuyo.

### Paso 2 · El ruteo vive en el arranque, no en el código que publica

Aquí está el giro: el código que **publica** un hecho es **el mismo** para uno público y uno privado; quien decide el destino es la **config de arranque**.

> 🛠️ **Inténtalo tú.** En el arranque, **recorre el ensamblado y quédate con los tipos que implementan `IPublicEvent`** (los demás no reciben ruta). Cómo se le declara a cada uno la ruta al bus externo es config de Wolverine —inguessable, y el transporte real llega en [Transportes](transportes.md)—: te la muestro abajo, antes de la solución.

> [!NOTE]
> 🆕 **Escanear el ensamblado + declarar ruta.** Recorrer los tipos de un ensamblado con `GetTypes()` y filtrar por marcador con `IsAssignableTo` es hacer **a mano** el mismo escaneo que Wolverine hace para descubrir handlers. A cada tipo público le declaras una ruta con `opts.PublishMessage(tipo).ToRabbitExchange(nombre)` (el transporte real —RabbitMQ— llega en [Transportes](transportes.md); por ahora, la forma). El ensamblado de tus eventos lo obtienes como antes: `typeof(EmpresaSuspendida).Assembly`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// en UseWolverine(...), al arrancar: rutea CADA IPublicEvent al bus externo, por reflexión
var contratos = typeof(EmpresaSuspendida).Assembly;   // el ensamblado donde viven tus eventos
var publicos = contratos.GetTypes()
    .Where(t => t.IsAssignableTo(typeof(IPublicEvent)));

foreach (var tipo in publicos)
    opts.PublishMessage(tipo)
        .ToRabbitExchange(nombreDelServicio);   // el transporte real llega en Transportes
```
</details>

> [!NOTE]
> 🆕 **El marcador es intención; el arranque la materializa.** El código que publica no sabe a dónde va el hecho: solo lo publica al bus. La config de arranque, por reflexión sobre `IPublicEvent`, es la que **le pone ruta externa**. Cambiar qué cruza la frontera es cambiar un marcador — no tocar el código que publica ni el handler.

> [!WARNING]
> **"Privado = local" NO es automático.** Wolverine, si **no** encuentra ruta declarada para un evento, lo despacha a una **cola local en memoria** por defecto. Un `IPrivateEvent` se queda dentro **solo porque no le declaraste ruta externa** — no porque el marcador lo fuerce. El marcador es una **convención de intención**; la localidad sale de la config. Esta sutileza es justo lo que un mantenedor de la plantilla debe entender: nada obliga a un privado a quedarse local, y si le declaras una ruta externa, sale del proceso igual que uno público.

> 🔍 **¿Lo lograste?** Sin levantar aún ningún bus, compruébalo por reflexión: `typeof(EmpresaSuspendida).IsAssignableTo(typeof(IPublicEvent))` → `true`, y `typeof(EmpresaMarcadaParaRevision).IsAssignableTo(typeof(IPublicEvent))` → `false`. Eso es **exactamente** lo que el arranque consulta para decidir qué evento recibe ruta externa. La frontera ya está declarada; falta el transporte que la cruce.

---

### El Descubrimiento

Partiste tus hechos en dos con **interfaces vacías**: `IPublicEvent` (cruza a otros servicios) e `IPrivateEvent` (se queda dentro). La decisión de **qué cruza** no vive en el evento ni en el handler: vive en la **config de arranque**, que por reflexión sobre el marcador le declara ruta externa a los públicos. El marcador es **intención**; la localidad de un privado sale de **no** darle ruta, no de una barrera automática. Ese es el criterio: exponer lo mínimo, porque público = contrato para siempre.

> [!NOTE]
> 🌱 **Semilla — qué viaja con el hecho.** Si un hecho cruza a otro servicio, ¿qué lo acompaña? El evento solo no basta: el receptor necesita saber **de qué cliente** es y **quién** lo provocó. Eso viaja en un **sobre** alrededor del mensaje — el mismo concepto de sobre que usaste en [Concurrencia optimista](concurrencia-optimista.md) para la versión, ahora para la mensajería. Lo construyes en [El sobre](el-sobre.md).

---

## ✅ Compruébalo

- [ ] Creaste `IEvent`, `IPublicEvent : IEvent`, `IPrivateEvent : IEvent` — **sin miembros**.
- [ ] Marcaste al menos un evento como público (`EmpresaSuspendida`) y uno como privado.
- [ ] Explicas por qué público = **contrato** y por qué privado es el **default** (expones lo mínimo).
- [ ] Explicas que el ruteo se decide en el **arranque** (reflexión sobre el marcador), no en el código que publica.
- [ ] Reconoces que "privado = local" **no** es automático: sale de no declararle ruta externa.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué marcar un evento como público es una decisión más pesada que marcarlo privado? ¿Dónde se decide realmente que un hecho cruce la frontera, y por qué eso deja el código que publica y el handler intactos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Público vs privado: qué hecho cruza la frontera" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Dos **interfaces vacías** —`IPublicEvent` (cruza a otros servicios) e `IPrivateEvent` (se queda dentro)— etiquetan la **intención** de cada hecho; el ruteo lo decide la **config de arranque** por reflexión sobre el marcador (no el código que publica), y un privado se queda local **solo** porque no le declaras ruta externa: público = contrato para siempre, así que expones lo mínimo.

---

[⬅️ Volver: El handler por convención](./handler-por-convencion.md)

[➡️ Siguiente: El sobre](./el-sobre.md)
