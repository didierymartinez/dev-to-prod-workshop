# 18 · Levanta la última magia: reflexión vs codegen

Wolverine "encuentra" tus handlers y corre un middleware **por convención**. Marten "reconstruye" tu `Empresa` **por convención**, llamando tus `Apply`. Suena a magia — y en este taller, **si parece magia, falta una sección**. Abramos la caja: ¿cómo lo hacen, y por qué no es lento?

## 🎯 El Objetivo

Entender que las herramientas **no usan reflexión en cada llamada**: **generan código** en el arranque. Y saber dónde *verlo*, para que nada sea una caja negra.

## Lo que hiciste a mano: reflexión

Tu mini-contenedor de §09 resolvía dependencias con **reflexión**: `Type`, `Activator.CreateInstance`, `MethodInfo.Invoke`. Funciona, pero tiene dos costos:

- **Velocidad:** inspeccionar tipos y llamar por `MethodInfo` en **cada** petición es más lento que una llamada normal de C#.
- **Errores tardíos:** si falta un handler, no lo sabes al compilar — **revienta en ejecución** cuando llega el comando.

La reflexión es flexible, pero pagas por llamada y pierdes la red del compilador.

## Lo que hace Wolverine: genera código

Wolverine no inspecciona tipos en cada comando. En el **arranque**, mira tus handlers y **escribe una clase C#** —código real— que llama tu `Handle`, corre tu middleware (`After`/`Finally`) y **comitea la sesión** (la política `AutoApplyTransactions` de §17), **directo**, sin reflexión. Esa clase se compila una vez (`UseRuntimeCompilation`, que ya pusiste en §17) y se reutiliza. Resultado: la velocidad de una llamada normal, decidida al arrancar, no en caliente.

Y puedes **leerla**. Wolverine deja ver (y hasta exportar a disco) el código que generó para cada mensaje: verás, en C# legible, "crea el handler, resuelve el `IEventStore`, llama `Handle(cmd, store, ct)`, corre `After()`, comitea, corre `Finally()`". No es un truco: es exactamente lo que tú habrías escrito a mano para `CambiarPlanDeEmpresa`, generado por ti.

> [!NOTE]
> **Marten hace lo mismo.** Para rehidratar tu `Empresa`, Marten genera código que llama tus `Apply(EmpresaRegistrada)`, `Apply(PlanCambiado)`… en orden — no busca los métodos por reflexión en cada lectura. Y el SQL que viste en §16 (`mt_events`) también lo gestiona/pre-genera. Por eso la Critter Stack es rápida **y** inspeccionable a la vez.

## ¿Por qué generar código y no usar reflexión?

| | Reflexión (tu §09) | Codegen (Wolverine/Marten) |
|---|---|---|
| **Cuándo decide** | en cada llamada | una vez, al arrancar |
| **Velocidad** | más lenta (por llamada) | como una llamada normal |
| **Errores** | en ejecución | el código generado compila → fallas tempranas |
| **¿Caja negra?** | no (lo escribiste) | **no**: puedes leer el código generado |

La regla: **generar código** te da el rendimiento de lo escrito a mano sin escribirlo a mano, y mantiene todo **auditable**.

> [!NOTE]
> 🌱 **Semilla — y aun así, la reflexión tiene su lugar.** En **tests** no importa el costo de arranque y sí la flexibilidad: por eso el `TestStore` del equipo (que verás en §29) rehidrata buscando tus `Apply` **por reflexión** — simple, sin generar nada. Cada herramienta donde encaja: codegen en producción (rendimiento), reflexión en pruebas (simplicidad).

---

## ✅ Compruébalo

Sin código nuevo — asegúrate de que el mecanismo quedó:

- [ ] Explica por qué la reflexión por llamada (tu §09) es más lenta y falla más tarde que el código generado.
- [ ] Di qué hace Wolverine en el **arranque** en vez de reflexionar en cada comando.
- [ ] Sabes que puedes **ver** el código que Wolverine genera para un mensaje (no es caja negra).
- [ ] Explica por qué en **tests** la reflexión (el `TestStore`) sí es una buena elección.

---

## 🧠 En una frase

Wolverine y Marten no usan **reflexión por llamada** (lenta, falla tarde): en el arranque **generan código C# legible** que llama tus `Handle`/`Apply` directo (`UseRuntimeCompilation`) — el rendimiento de lo escrito a mano, auditable y sin caja negra; la reflexión queda para los tests.

---

[⬅️ Volver: El gran reveal (2) — Wolverine](./17-revelar-wolverine.md)

[➡️ Siguiente: Las dos vertientes de persistencia](./19-dos-vertientes.md)
