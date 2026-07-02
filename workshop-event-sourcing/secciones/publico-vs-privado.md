# Dos tipos de hecho: público vs privado

Tu motor guarda hechos y los rehidrata. Pero en un sistema real no todos los hechos son iguales: cuando una empresa **se suspende**, a otros servicios (facturación, reportes) les interesa enterarse — ese hecho **cruza la frontera**. En cambio "cambió de plan" quizá solo importa adentro. Empieza el mundo **Event-Driven**: distinguir qué hechos **salen** y cuáles **se quedan en casa**.

## 🎯 El Objetivo

Marcar qué hechos son **públicos** (cruzan a otros servicios) y cuáles **privados** (internos), y poder **separarlos** para enviarlos por caminos distintos.

## El dolor: ¿cómo marco un hecho como "externo"?

El primer instinto es una **bandera**: un `bool EsExterno` en cada evento.

```csharp
public record EmpresaSuspendida(string Motivo, bool EsExterno = true);
public record PlanCambiado(string Plan, bool EsExterno = false);
```

Y para separarlos, recorres la lista mirando la bandera:

```csharp
var publicos = _uncommittedEvents.Where(e => ((dynamic)e).EsExterno);
```

Funciona… hasta que **mañana agregas un hecho nuevo**. Llega `EmpresaReactivada`, que otros servicios SÍ querrían oír, y la escribes sin pensar en la bandera:

```csharp
public record EmpresaReactivada();   // ⟵ ¡sin el bool EsExterno!
```

Compila sin chistar. Pero al **correr**, el filtro `((dynamic)e).EsExterno` **revienta** sobre ese evento: no tiene el campo. Y si le pones el campo pero olvidas `= true`, se queda en `false` y la reactivación **nunca cruza la frontera**, sin avisar. En ambos casos **nada te obligó** a marcar el evento. Además, `(dynamic)` te hace **perder el chequeo de tipos**. Una convención de nombres (`...Integracion`) tampoco sirve: nadie verifica que la respetaste. Una lista central de "tipos públicos" en otro archivo se desincroniza. Necesitas algo que el **compilador** entienda y que viva **con el tipo**, no a su lado.

La herramienta de C#: una **interfaz marcadora** — una interfaz **vacía** que solo sirve para *etiquetar* un tipo. Un evento "es público" simplemente **implementándola**: queda escrito en su firma, no en un campo que se olvida.

## 🔧 Refactor: interfaces marcadoras + filtrar

> 🛠️ **Inténtalo tú.** (1) Crea tres interfaces marcadoras **vacías**: `IEvent`, `IPublicEvent : IEvent`, `IPrivateEvent : IEvent`. (2) Marca como **públicos** los hechos que otros servicios querrían oír —p. ej. `EmpresaSuspendida` y `EmpresaReactivada`— implementando `IPublicEvent`. (3) En `AggregateRoot`, añade `GetPublicEvents()` y `GetPrivateEvents()` que **filtren** la lista de no-confirmados por su tipo.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IEvent;                          // marcador raíz: interfaz VACÍA (en C# moderno se cierra con ; en vez de { })
public interface IPublicEvent  : IEvent;          // cruza la frontera (EDA)
public interface IPrivateEvent : IEvent;          // interno al servicio
```

Marca los que salen (los demás quedan **sin marcar**):

```csharp
public record EmpresaSuspendida(string Motivo) : IPublicEvent;
public record EmpresaReactivada()              : IPublicEvent;
// EmpresaRegistrada y PlanCambiado NO implementan nada: solo viven en el stream
```

Y en `AggregateRoot`, filtra con LINQ `OfType<T>()` (devuelve **solo** los elementos del tipo pedido, ignorando el resto):

```csharp
public IPublicEvent[]  GetPublicEvents()  => _uncommittedEvents.OfType<IPublicEvent>().ToArray();
public IPrivateEvent[] GetPrivateEvents() => _uncommittedEvents.OfType<IPrivateEvent>().ToArray();
```
</details>

> [!NOTE]
> **Por qué la mayoría de eventos no marca nada.** Fíjate: `EmpresaRegistrada` y `PlanCambiado` no implementan `IPublicEvent` ni `IPrivateEvent` — son hechos de dominio que **solo viven en el stream**. Ser público o privado es una **decisión adicional y deliberada**, no algo que todo evento es. Por eso `OfType<T>()` los ignora, y por eso el acumulador es `List<object>` (de [El agregado que acumula](el-agregado-acumula.md)) y no `List<IEvent>`: admite hechos que no marcan **nada**.

> [!NOTE]
> **¿Y para qué `IEvent` si hoy no filtro por ella?** Hoy `GetPublicEvents`/`GetPrivateEvents` filtran por `IPublicEvent`/`IPrivateEvent`, no por la raíz `IEvent`. Existe como **raíz común** de las otras dos, y porque la plantilla (`Cosmos.EventDriven.Abstractions`) la trae así. **No la necesitas para nada que construyas a mano en el taller**: es convergencia a la forma de la plantilla, no un dolor de hoy. No la borres por no usarla aún.

> [!NOTE]
> 🌱 **Semilla — el contrato público es tu API hacia afuera.** Un `IPublicEvent` es parte de lo que **otros servicios** consumen: cambiarlo puede romperles. Por eso (a) se versiona con cuidado ([Versionado y upcasting](versionado-upcasting.md), upcasting) y (b) **no lleva** id/tenant/timestamp en el cuerpo — esos son **metadatos del transporte**, que viajan aparte (el "sobre", [Senders y el sobre](senders-y-sobre.md)). El evento privado, en cambio, es libre de cambiar: nadie afuera depende de él.

---

## 🔍 Comprueba

Pon esto en tu `Program.cs` y corre `dotnet run`:

```csharp
var emp = Empresa.Registrar("emp-7", "Constructora Andes", "Básico");
emp.Suspender("falta de pago");

Console.WriteLine($"sin confirmar: {emp.UncommittedEvents.Count}");
Console.WriteLine($"públicos: {emp.GetPublicEvents().Length} ({string.Join(",", emp.GetPublicEvents().Select(e => e.GetType().Name))})");
Console.WriteLine($"privados: {emp.GetPrivateEvents().Length}");
```

> **¿Lo lograste?** Deberías ver:
> ```
> sin confirmar: 2
> públicos: 1 (EmpresaSuspendida)
> privados: 0
> ```
> Dos hechos sin confirmar (`EmpresaRegistrada` + `EmpresaSuspendida`), pero **solo uno es público**: el filtro `OfType<IPublicEvent>()` separó el que cruza la frontera del que solo vive en el diario.

> [!NOTE]
> **Que `privados: 0` no te confunda — y qué cambia cada camino.** Hoy ningún hecho implementa `IPrivateEvent`, así que ese lado da **0**: no es un bug, es que aún no hemos necesitado marcar uno como "interno explícito". Lo importante es que ya tienes **dos pilas separadas**, y cada una irá por un **camino distinto** que sentirás más adelante en [Transportes](senders-y-sobre.md): los **públicos** salen al mundo **Event-Driven** (a otros servicios, por un broker —*un servicio de mensajería intermedio, tipo cola*—), mientras que los **privados** se quedan en el **bus interno** del propio servicio. Por ahora solo los separamos; en Transportes les damos su destino.

---

## ✅ Compruébalo

- [ ] Creaste `IEvent`, `IPublicEvent : IEvent`, `IPrivateEvent : IEvent` (interfaces vacías).
- [ ] Marcaste `EmpresaSuspendida`/`EmpresaReactivada` como `IPublicEvent`; `EmpresaRegistrada`/`PlanCambiado` no marcan nada.
- [ ] `AggregateRoot` tiene `GetPublicEvents()`/`GetPrivateEvents()` con `OfType<T>()`.
- [ ] `GetPublicEvents()` sobre una empresa suspendida devuelve `[EmpresaSuspendida]`.
- [ ] Explica por qué una **interfaz marcadora** es mejor que un `bool` o una convención de nombres.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué distingue un `IPublicEvent` de un `IPrivateEvent`, y qué decide REALMENTE su destino?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Público vs privado" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

No todo hecho cruza la frontera: con **interfaces marcadoras vacías** (`IPublicEvent`/`IPrivateEvent`) etiquetas los que sí —el compilador lo entiende y vive con el tipo— y el agregado los **separa** con `OfType<T>()` (`GetPublicEvents`/`GetPrivateEvents`); la mayoría de eventos no marca nada y solo vive en el stream.

---

[⬅️ Volver: Las dos vertientes de persistencia](./dos-vertientes.md)

[➡️ Siguiente: Quién se lleva los hechos que salen](./senders-y-sobre.md)
