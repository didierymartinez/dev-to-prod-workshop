# Las dos vertientes: dominio puro, infraestructura enchufable

Ya viste **todas** las piezas nativas: event sourcing a mano, Marten, proyecciones, el daemon, Wolverine, EDA, multi-tenancy. Ahora abres la librería real, `Cosmos.BuildingBlocks`, y encuentras algo que **reconoces**: no usa Marten y Wolverine crudos por todas partes. Los envuelve detrás de **abstracciones propias** —`AggregateRoot`, `IEventStore`, `IProjectionStore`, `ITenantResolver`— exactamente como la costura `IEventStore` que tú construiste en [El almacén abstracto](el-almacen-abstracto.md).

## 🎯 El Objetivo

Entender la estructura de la plantilla como **dos vertientes** —contratos puros (`Abstractions`) e implementación con Critter Stack (`CritterStack`)— y reconocer que es el patrón de costura que ya construiste, a escala.

## 💥 El dolor: un dominio casado con Marten no se puede probar ni mover

Si tus agregados, handlers y eventos llaman a `IDocumentSession` directo, tu **dominio** —la lógica de negocio— queda **casado** con Marten. No puedes probarlo sin Postgres (lo sufriste en [Tests de integración](tests-de-integracion.md)), ni cambiar de motor, ni razonar sobre él sin arrastrar toda la infraestructura. Es el mismo dolor que te empujó a extraer `IEventStore`: separar *qué hace el dominio* de *con qué se persiste*.

## 🔧 Las dos vertientes

### Paso 1 · Mapea lo que construiste a la librería real

> 🛠️ **Inténtalo tú.** Antes de mirar la solución, empareja cada pieza tuya con su contraparte en la plantilla. ¿Cuál es tu `IEventStore`? ¿Tu `MartenEventStore`? ¿Tu `TestStore`? ¿Tu `Empresa : AggregateRoot`?

> [!NOTE]
> 🆕 **Dos vertientes = dos paquetes.** La librería parte cada área en dos ensamblados: `Cosmos.EventSourcing.**Abstractions**` (contratos **puros**: `AggregateRoot`, `IEventStore`, los marcadores de evento — **sin** dependencia de Marten) y `Cosmos.EventSourcing.**CritterStack**` (las **implementaciones** con Marten/Wolverine: `MartenEventStore`, los routers). Lo mismo en tenancy: `Cosmos.MultiTenancy` (el `ITenantResolver` puro) vs `Cosmos.MultiTenancy.CritterStack` (el `ProxyTenantResolver`).

<details>
<summary>👉 Muéstrame el mapeo</summary>

| Lo que construiste | En `Cosmos.BuildingBlocks` | Vertiente |
| --- | --- | --- |
| `IEventStore` (la costura) | `IEventStore` | **Abstractions** |
| `AggregateRoot` (con `Id`) | `AggregateRoot` (con `_uncommittedEvents`, `Version`) | **Abstractions** |
| Marcadores de evento | `IEvent` / `IPublicEvent` / `IPrivateEvent` | **Abstractions** |
| `MartenEventStore` | `MartenEventStore` | **CritterStack** |
| `TestStore` | `TestStore` | **Testing.Utilities** |
| Tu `Despachador` | Wolverine (`IMessageBus.InvokeAsync`) | **CritterStack** |
</details>

### Paso 2 · La flecha de dependencia apunta a los contratos

Tu **dominio** (agregados, handlers) depende solo de la vertiente **Abstractions**. La vertiente **CritterStack** depende de Abstractions e implementa sus interfaces con Marten/Wolverine. El dominio **nunca** ve a Marten.

> [!NOTE]
> 🆕 **Puertos y adaptadores.** Es el patrón que ya vivías sin nombrarlo: `IEventStore` es un **puerto** (un contrato que el dominio pide), `MartenEventStore` y `TestStore` son **adaptadores** (dos formas de cumplirlo). Cambiar de adaptador —producción a test, o Marten a otro motor— no toca el dominio. Por eso tus tests Given-When-Then sobrevivieron al swap: apuntaban al puerto, no al adaptador.

### Paso 3 · Por qué la plantilla NO usa `FetchForWriting`

Aquí está la decisión que da nombre al taller. Su `MartenEventStore` lee con `AggregateStreamAsync` y añade con `Append`, no con `FetchForWriting`. Es una decisión **confinada a la vertiente CritterStack**: cambiarla no toca el dominio ni los contratos. Justo la clase de cambio que, en [FetchForWriting](fetch-for-writing.md), aprendiste a hacer **con criterio**.

> [!NOTE]
> 🆕 **La respuesta real del flagship: serializar, no competir.** Si la plantilla no verifica versión al escribir, ¿cómo evita la **actualización perdida** de [Concurrencia optimista](concurrencia-optimista.md)? No la resuelve **dentro** del modelo (optimista + reintento con `FetchForWriting`), sino **afuera**: **serializa las escrituras al mismo stream**. En **ControlPlane**, los mensajes se publican con `GroupId = TenantId` → una **sesión** de Azure Service Bus, que hace que los del mismo tenant se procesen **uno a uno, en orden** (el `GroupId` que viste en [el sobre](el-sobre.md), ahora como palanca de concurrencia). Si nunca hay dos escritores del mismo stream a la vez, **no hay carrera que `FetchForWriting` deba atrapar** (ADR-0026). Dos estrategias legítimas para el mismo dolor: `FetchForWriting` **detecta** el choque y reintenta (optimista); serializar en el bus **evita** que ocurra (por sesión). Cuál elegir es, exactamente, el criterio que el **capstone** te pide decidir.

> 🔍 **¿Lo lograste?** Abre la solución real: verás `…Abstractions` sin referencia a Marten (revisa su `.csproj`) y `…CritterStack` con la referencia a Marten y las clases que implementan las interfaces. Y en `MartenEventStore` verás `AggregateStreamAsync` + `Append`, no `FetchForWriting`. Reconoces cada pieza porque la construiste.

---

### El Descubrimiento

La librería está partida en **dos vertientes**: `Abstractions` (contratos puros que el dominio consume) y `CritterStack` (adaptadores Marten/Wolverine que los implementan). Es el patrón **puertos y adaptadores** —el mismo `IEventStore`-con-dos-motores que tú construiste, a escala de librería—. Por eso el dominio se prueba sin Postgres y la infraestructura es enchufable. Y por eso una decisión como *usar o no `FetchForWriting`* vive **solo** en la vertiente CritterStack, sin tocar el dominio: es un cambio de adaptador. Ganar el criterio para hacer ese cambio es el norte del taller.

> [!NOTE]
> 🌱 **Semilla — el agregado real.** La vertiente `Abstractions` tiene un `AggregateRoot` más completo que el tuyo: guarda sus **eventos no confirmados** y sabe separar los públicos de los privados. Tu `Empresa` tendrá que adaptarse a esa forma. Lo haces en [El agregado de la plantilla](el-agregado-de-la-plantilla.md).

---

## ✅ Compruébalo

- [ ] Explicas las **dos vertientes**: `Abstractions` (contratos puros) vs `CritterStack` (adaptadores Marten/Wolverine).
- [ ] La flecha de dependencia va del dominio y de CritterStack **hacia** Abstractions; el dominio no ve Marten.
- [ ] Mapeas tus piezas (`IEventStore`, `MartenEventStore`, `TestStore`) a las de la librería.
- [ ] Reconoces el patrón **puertos y adaptadores** y por qué tus tests sobrevivieron al swap.
- [ ] Explicas por qué *no usar `FetchForWriting`* es una decisión de la vertiente CritterStack, no del dominio.
- [ ] Explicas la **alternativa real** del flagship: serializar las escrituras en el bus (`GroupId=TenantId` → sesión ASB) **evita** el choque, en vez de **detectarlo** con concurrencia optimista.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué la librería separa `Abstractions` de `CritterStack`? ¿Qué gana el dominio al depender solo de contratos? ¿Por qué la decisión de `FetchForWriting` no afecta al dominio?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Las dos vertientes: dominio puro, infraestructura enchufable" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

`Cosmos.BuildingBlocks` parte cada área en dos vertientes —`Abstractions` (contratos puros: `AggregateRoot`, `IEventStore`, los marcadores) y `CritterStack` (adaptadores Marten/Wolverine)— el patrón **puertos y adaptadores** que ya construiste con tu `IEventStore`; por eso el dominio se prueba sin Postgres y una decisión como *usar `FetchForWriting`* vive solo en el adaptador, sin tocar el dominio.

---

[⬅️ Volver: El tenant viaja con el mensaje](./el-tenant-viaja-con-el-mensaje.md)

[➡️ Siguiente: El agregado de la plantilla](./el-agregado-de-la-plantilla.md)
