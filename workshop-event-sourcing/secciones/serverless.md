# Serverless: cuando el proceso se apaga entre invocaciones

Todo lo del bloque EDA asumió un servicio **siempre encendido**: un host con su [daemon](daemon-proyecciones.md) drenando el [outbox](outbox-inbox.md), su Hub abierto, su nodo en un clúster. Pero parte de la plataforma corre en **Azure Functions**: procesos que **se apagan** entre invocaciones y arrancan de cero en la siguiente. Ahí, tres supuestos del "siempre encendido" se rompen — y la plantilla tiene una variante `Serverless` de la config que los resuelve uno por uno. Verla es entender **por qué** cada pieza estaba como estaba.

## 🎯 El Objetivo

Adaptar la config de Wolverine para Azure Functions (`dotnet-isolated`) con tres cambios de criterio: **discovery manual**, **durabilidad `Solo`**, y **publicar inline** en vez de por outbox durable.

## 💥 El dolor: sin proceso vivo, el outbox no tiene quién lo drene

Un **outbox durable** guarda el saliente en Postgres y confía en que un **worker** siga corriendo para drenarlo al bus. En un Function que **se apaga** apenas termina la invocación, ese worker no existe: el saliente quedaría en la tabla **sin que nadie lo mande**. Y al arrancar, el auto-discovery de Wolverine intenta escanear todos los ensamblados —pero en `dotnet-isolated` no todos están cargados—, y **crashea**. Los supuestos de "siempre encendido" no aplican; hay que decírselo a Wolverine explícitamente.

## 🔧 La config serverless, cambio por cambio

### Paso 1 · Discovery manual: no escanees lo que no está

> 🛠️ **Inténtalo tú.** En vez de `UseWolverine` (que auto-descubre extensiones), usa `AddWolverine` con **discovery manual** y dile a mano dónde buscar handlers.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
serviceCollection.AddWolverineRuntimeCompilation();

serviceCollection.AddWolverine(ExtensionDiscovery.ManualOnly, options =>
{
    options.Discovery.IncludeAssembly(dominioAssembly);   // solo este ensamblado
    // …resto de la config…
});
```
</details>

> [!NOTE]
> 🆕 **`ExtensionDiscovery.ManualOnly`.** Por defecto Wolverine busca extensiones marcadas con `[WolverineModule]` por **todos** los ensamblados. En `dotnet-isolated` no todos están disponibles (se daña al tocar `Microsoft.Azure.WebJobs`), y el escaneo **rompe el arranque**. `ManualOnly` apaga ese descubrimiento automático: tú declaras el ensamblado de dominio con `Discovery.IncludeAssembly`, y nada más se escanea. (Ojo: `ManualOnly` es de `ExtensionDiscovery`, un parámetro de `AddWolverine` — no es un modo de durabilidad.)

### Paso 2 · Durabilidad `Solo`: un nodo que no hace clúster

> 🛠️ **Inténtalo tú.** **🔁** Pon el modo de durabilidad en `Solo`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
options.Durability.Mode = DurabilityMode.Solo;
```
</details>

> [!NOTE]
> 🆕 **`DurabilityMode.Solo`.** El modo por defecto (`Balanced`) hace que los nodos se **repartan** trabajo de durabilidad y elijan líder — útil entre varias instancias de un servicio siempre encendido. Un Function efímero no participa de ese baile: arranca, atiende, se apaga. `Solo` le dice "eres tú solo, no coordines con nadie", evitando que intente recuperar envelopes de endpoints que este nodo ni registra.

### Paso 3 · Publicar inline, no por outbox

> 🛠️ **Inténtalo tú.** **🔁** Al declarar la ruta de publicación, cambia `UseDurableOutbox()` por `SendInline()`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// dockerizado (siempre encendido): el daemon drena el outbox
opts.PublishMessage<EmpresaSuspendida>().ToAzureServiceBusTopic(topic).UseDurableOutbox();

// serverless (efímero): publica AHORA, dentro de la invocación
opts.PublishMessage<EmpresaSuspendida>().ToAzureServiceBusTopic(topic).SendInline();
```
</details>

> [!NOTE]
> 🆕 **`SendInline` vs. outbox durable.** `SendInline()` manda el mensaje al bus **durante** la invocación, de forma síncrona, sin pasar por la tabla de salientes. Pierde la garantía "sobrevive a la muerte del proceso" del outbox durable — pero un Function que **se va a apagar** no puede hospedar al worker que drena esa tabla, así que la garantía sería falsa de todos modos. `SendInline` es la elección **honesta** para un proceso efímero: publica antes de morir, o falla la invocación (y el llamador reintenta).

> 🔍 **¿Lo lograste?** Compara las dos rutas. En la **dockerizada**, justo tras `SaveChanges` el mensaje está en `wolverine_outgoing_envelopes` y **aún no** en el broker (el daemon lo drenará). En la **serverless** con `SendInline`, cuando la invocación **retorna** el mensaje ya está en el broker y **no hay** fila de outbox: salió inline, sin daemon de por medio.

---

### El Descubrimiento

Viste los tres supuestos del "siempre encendido" romperse en serverless, y la respuesta de criterio a cada uno. **Discovery manual** (`ManualOnly`) porque no puedes escanear ensamblados que no están cargados. **Durabilidad `Solo`** porque un nodo efímero no hace clúster. **`SendInline`** porque sin proceso vivo no hay quién drene el outbox, así que publicas dentro de la invocación o fallas. La misma librería, la misma app —dos configuraciones— según si el proceso vive o muere entre peticiones. Saber **por qué** cada flag cambia es, otra vez, el criterio del mantenedor.

> [!NOTE]
> 🌱 **Semilla — ¿qué es un cliente, en realidad?** Todo el bloque EDA arrastró un `TenantId` en el [sobre](el-sobre.md) y un `tenantResolver` como caja negra. Nunca dijimos qué es un **tenant** ni de dónde sale. Esa es la última pieza para operar la plataforma de verdad: una sola instancia sirviendo a **muchos clientes** con sus datos aislados. Es el **Bloque H**, y empieza en [De un cliente a muchos](de-un-cliente-a-muchos.md).

---

## ✅ Compruébalo

- [ ] Usas `AddWolverine(ExtensionDiscovery.ManualOnly, …)` + `Discovery.IncludeAssembly`, y explicas por qué no `UseWolverine`.
- [ ] Pones `Durability.Mode = DurabilityMode.Solo` y explicas por qué un Function no hace clúster.
- [ ] Cambias `UseDurableOutbox()` por `SendInline()` y explicas el trade-off (pierdes "sobrevive a la caída", pero no había quién drenara).
- [ ] Distingues la config **dockerizada** (daemon + outbox durable) de la **serverless** (`Solo` + inline).
- [ ] Reconoces que `ManualOnly` es de `ExtensionDiscovery`, no un modo de durabilidad.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué supuesto de "siempre encendido" rompe cada uno de los tres cambios? ¿Por qué `SendInline` es más honesto que un outbox durable en un Function que se apaga?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Serverless: cuando el proceso se apaga entre invocaciones" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

En Azure Functions (`dotnet-isolated`, efímero) la config de Wolverine cambia por criterio: **discovery `ManualOnly`** (no escanear ensamblados ausentes), **`DurabilityMode.Solo`** (un nodo que no hace clúster) y **`SendInline`** en vez de outbox durable (publica dentro de la invocación, porque no hay worker que drene) — la misma librería, dos configuraciones según si el proceso vive o muere entre peticiones.

---

[⬅️ Volver: UI en vivo](./ui-en-vivo.md)

[➡️ Siguiente: De un cliente a muchos](./de-un-cliente-a-muchos.md)
