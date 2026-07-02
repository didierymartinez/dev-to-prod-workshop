# Levanta la última magia: reflexión vs codegen

Wolverine "encuentra" tus handlers y corre un middleware **por convención**. Marten "reconstruye" tu `Empresa` **por convención**, llamando tus `Apply`. Suena a magia. Abramos la caja: ¿cómo lo hacen, y por qué no es lento?

## 🎯 El Objetivo

Entender que las herramientas **no usan reflexión en cada llamada**: **generan código** en el arranque. Y saber dónde *verlo*, para que nada sea una caja negra.

## Lo que hiciste a mano: reflexión

Tu mini-contenedor de [Inyección de Dependencias](inyeccion-de-dependencias.md) resolvía dependencias con **reflexión**: `Type`, `GetConstructors`, `Activator.CreateInstance`. Funciona, pero tiene dos costos:

- **Velocidad:** inspeccionar tipos y llamar por `MethodInfo` en **cada** petición es más lento que una llamada normal de C#.
- **Errores tardíos:** si falta un handler, no lo sabes al compilar — **revienta en ejecución** cuando llega el comando.

La reflexión es flexible, pero pagas por llamada y pierdes la red del compilador.

## Lo que hace Wolverine: genera código

Wolverine no inspecciona tipos en cada comando. En el **arranque**, mira tus handlers y **escribe una clase C#** —código real— que llama tu `Handle`, corre tu middleware (`After`/`Finally`) y **comitea la sesión** (la política `AutoApplyTransactions` de [Revelar Wolverine](revelar-wolverine.md)), **directo**, sin reflexión. Esa clase se compila una vez (`UseRuntimeCompilation`, que ya pusiste en [Revelar Wolverine](revelar-wolverine.md)) y se reutiliza. Resultado: la velocidad de una llamada normal, decidida al arrancar, no en caliente.

Y puedes **leerla**. Wolverine deja ver (y hasta exportar a disco) el código que generó para cada mensaje: verás, en C# legible, "crea el handler, resuelve el `IEventStore`, llama `Handle(cmd, store, ct)`, corre `After()`, comitea, corre `Finally()`". No es un truco: es exactamente lo que tú habrías escrito a mano para `CambiarPlanDeEmpresa`.

> [!NOTE]
> **Marten hace lo mismo.** Para rehidratar tu `Empresa`, Marten genera código que llama tus `Apply(EmpresaRegistrada)`, `Apply(PlanCambiado)`… en orden — no busca los métodos por reflexión en cada lectura. Y el SQL contra `mt_events` que viste en [Revelar Marten](revelar-marten.md) también lo pre-genera. Por eso la Critter Stack es rápida **y** inspeccionable a la vez.

## ¿Por qué generar código y no usar reflexión?

| | Reflexión (tu [Inyección de Dependencias](inyeccion-de-dependencias.md)) | Codegen (Wolverine/Marten) |
|---|---|---|
| **Cuándo decide** | en cada llamada | una vez, al arrancar |
| **Velocidad** | más lenta (por llamada) | como una llamada normal |
| **Errores** | en ejecución | el código generado compila → fallas tempranas |
| **¿Caja negra?** | no (lo escribiste) | **no**: puedes leer el código generado |

La regla: **generar código** te da el rendimiento de lo escrito a mano sin escribirlo a mano, y mantiene todo **auditable**.

> [!NOTE]
> 🌱 **Semilla — y aun así, la reflexión tiene su lugar.** En **tests** no importa el costo de arranque y sí la flexibilidad: por eso el `TestStore` del equipo (que verás en [El TestStore](teststore.md)) rehidrata buscando tus `Apply` **por reflexión** — simple, sin generar nada. Cada herramienta donde encaja: codegen en producción (rendimiento), reflexión en pruebas (simplicidad).

## 🔍 Ábrela tú: el código generado (y el SQL)

No te quedes en *"puedes verlo"* — ábrelo. Wolverine trae comandos de línea (vía JasperFx) para volcar el código que genera, pero **primero hay que enchufarlos**: el `Program` debe pasarle los argumentos a JasperFx en vez de solo `app.Run()`.

```csharp
using JasperFx;   // arriba del Program

var app = builder.Build();
// el entry point: si llegan args (p. ej. "codegen"), corre el comando de JasperFx; si no, levanta la app
return await app.RunJasperFxCommands(args);   // ← reemplaza el app.Run() del final
```

Con eso enchufado, ya puedes volcar el código generado:

```bash
dotnet run -- codegen preview   # imprime en consola el código generado de tus handlers
dotnet run -- codegen write     # o lo escribe a disco, en Internal/Generated/
```

Abre `Internal/Generated/` y busca la clase del mensaje `CambiarPlanDeEmpresa`: leerás, en C# normal, *crea el handler → resuelve el `IEventStore` → `Handle(cmd, store, ct)` → `After()` → comitea → `Finally()`* — lo mismo que habrías escrito a mano. *(Sin ese `RunJasperFxCommands(args)`, `dotnet run -- codegen` ignora el comando y solo arranca la app: el código igual se genera en memoria al levantar, pero no lo vuelcas a disco.)*

Y el **SQL** de Marten lo ves encendiendo su logger al configurarlo:

```csharp
options.Logger(new Marten.Services.ConsoleMartenLogger());   // imprime cada INSERT/SELECT contra mt_events
```

---

## ✅ Compruébalo

Sin código nuevo — asegúrate de que el mecanismo quedó:

- [ ] Explica por qué la reflexión por llamada (tu [Inyección de Dependencias](inyeccion-de-dependencias.md)) es más lenta y falla más tarde que el código generado.
- [ ] Di qué hace Wolverine en el **arranque** en vez de reflexionar en cada comando.
- [ ] Corriste `dotnet run -- codegen preview`/`write` y **abriste** el código generado de un comando (no es caja negra).
- [ ] Explica por qué en **tests** la reflexión (el `TestStore`) sí es una buena elección.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué Wolverine/Marten generan código en vez de reflexionar en cada llamada? ¿Dónde SÍ encaja la reflexión?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git commit --allow-empty -m "ES · Reflexión vs codegen" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Wolverine y Marten no usan **reflexión por llamada** (lenta, falla tarde): en el arranque **generan código C# legible** que llama tus `Handle`/`Apply` directo (`UseRuntimeCompilation`) — el rendimiento de lo escrito a mano, auditable y sin caja negra; la reflexión queda para los tests.

---

[⬅️ Volver: El gran reveal (2) — Wolverine](./revelar-wolverine.md)

[➡️ Siguiente: Las dos vertientes de persistencia](./dos-vertientes.md)
