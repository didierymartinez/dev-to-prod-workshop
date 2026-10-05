# Cuando dos escriben a la vez (concurrencia optimista)

Ya tienes un **almacén** que guarda y lee la empresa de cada id. Hasta ahora tu código corría de arriba a abajo con un solo `dotnet run` — pero una app real atiende **muchas peticiones a la vez**, y ahí acecha un peligro que aún no has visto.

## 🎯 El Objetivo

Que dos escrituras simultáneas sobre la misma empresa **no se pisen sin que nadie se entere**: detectar el choque y rechazarlo.

## 💥 El dolor: decidir sobre un estado que ya cambió

Dos peticiones abren su propio stream de la misma empresa **al mismo tiempo**. Cada una la rehidrata (las dos la ven **igual**), le pide una decisión y la guarda. Agrega esto al final de tu código suelto (usa una empresa nueva, `emp-8`, porque `emp-7` ya quedó suspendida):

```csharp
store.AbrirStream<Empresa>("emp-8").Append(new EmpresaRegistrada("Textiles Norte", "Básico"));

var a = store.AbrirStream<Empresa>("emp-8");
var b = store.AbrirStream<Empresa>("emp-8");
var ea = a.Get();   // A carga la empresa: activa
var eb = b.Get();   // B la carga al mismo tiempo: también la ve activa

var ha = ea.Suspender("falta de pago");          // A decide suspenderla…
if (ha is not null) a.Append(ha);                // …y la guarda
b.Append(eb.CambiarPlan("Enterprise"));          // B decide sobre SU copia, que dice "activa": la regla deja pasar

var final = store.AbrirStream<Empresa>("emp-8").Get();
Console.WriteLine($"emp-8: plan {final.Plan}, suspendida={final.Suspendida}");
// emp-8: plan Enterprise, suspendida=True
```

Las dos entran tan tranquilas, y el diario quedó así: registrada → **suspendida** → **plan cambiado**. Justo lo que tu regla de [Decidir el futuro](decidir-el-futuro.md) prohíbe ("no se puede cambiar el plan de una empresa suspendida"). La regla **sí** se revisó, pero sobre la copia de B, que ya no era cierta. En bases de datos esto se llama *actualización perdida* (*lost update*).

## 🔧 Numerar cada hecho: el sobre

Para atrapar el choque necesitas saber **en qué posición** entra cada hecho. Una vez archivado, cada hecho ocupa un lugar fijo en la historia de su empresa: el 1.º, el 2.º… Esa posición es su **versión**. La grabamos envolviendo el hecho en un **sobre**:

```csharp
// el sobre: envuelve el hecho con su POSICIÓN en el stream
public record EventoAlmacenado(int Version, object EventData);
```

> 💡 El sobre **no** lleva quién es la empresa: el cajón **ya es** de una empresa (su id es el rótulo). Solo añade lo que el hecho por sí mismo no sabe: su **posición**. Al leer, se desenvuelve — al agregado le interesa el hecho, no el sobre.

Con la versión a bordo, la regla es simple: **cada hecho declara la posición que cree ocupar; si esa posición ya está tomada, alguien escribió primero → se rechaza.**

### Paso 1 · El almacén guarda sobres y rechaza la posición ocupada

> 🛠️ **Inténtalo tú.** **🔁** El `EventStore` ahora guarda `List<EventoAlmacenado>` (sobres), y `GetEvents` devuelve los sobres. En `AppendEvent(id, EventoAlmacenado sobre)`, **antes de aceptar**, comprueba: si esa posición **ya está tomada** (`sobre.Version <= cajon.Count`), **crea y lanza** una `ConcurrencyException` (una excepción tuya, igual que `ReglaDeNegocioException`). El proyecto no compila hasta que termines el Paso 2: el `EventStream` todavía pasa hechos sueltos.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class ConcurrencyException(string mensaje) : Exception(mensaje);

// 🔁 EventStore: ahora guarda sobres y valida la versión antes de aceptar
public class EventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    public List<EventoAlmacenado> GetEvents(string aggregateId)
        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();

    public void AppendEvent(string aggregateId, EventoAlmacenado sobre)
    {
        if (!_cajones.ContainsKey(aggregateId))
            _cajones[aggregateId] = new();
        var cajon = _cajones[aggregateId];

        if (sobre.Version <= cajon.Count)   // esa posición ya está ocupada → alguien escribió primero
            throw new ConcurrencyException(
                $"La versión {sobre.Version} ya está ocupada (el cajón va en {cajon.Count}). " +
                "Alguien escribió mientras trabajabas — recarga la empresa y reintenta.");

        cajon.Add(sobre);
    }
}
```
</details>

### Paso 2 · El stream numera al escribir y desenvuelve al leer

> [!NOTE]
> 🆕 **Idioma de C#: `.Select(...)`.** `sobres.Select(s => s.EventData)` recorre la lista de sobres y produce solo su contenido (el hecho): *proyecta* cada elemento a otra cosa (LINQ). Con eso le pasas al `Load` los hechos pelados, no los sobres.

> 🛠️ **Inténtalo tú.** **🔁** El `EventStream` ahora **numera**: en `Get` recuerda cuántos hechos había (la versión), y en `Append` envuelve el hecho en un sobre con la **siguiente** versión. Al rehidratar, **desenvuelve**: al `Load` le pasas solo los hechos (usa `sobres.Select(s => s.EventData)`). Actualiza la versión recordada **solo si el almacén aceptó** el sobre: si lanzó, la versión debe quedar como estaba.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🔁 EventStream: numera cada hecho con el sobre; desenvuelve al leer
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly EventStore _store;
    private readonly string _aggregateId;
    private int _version;                 // cuántos hechos había cuando cargué

    public EventStream(EventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()
    {
        var entidad = new T();
        var sobres  = _store.GetEvents(_aggregateId);
        entidad.Load(sobres.Select(s => s.EventData));   // desenvuelve: solo el hecho
        _version = sobres.Count;                          // recuerda la posición en que cargué
        return entidad;
    }

    public void Append(object hecho)
    {
        var siguiente = _version + 1;                     // este hecho ocupa la siguiente posición
        _store.AppendEvent(_aggregateId, new EventoAlmacenado(siguiente, hecho));
        _version = siguiente;                             // solo si el almacén lo aceptó (si lanzó, no llegamos aquí)
    }
}
```
</details>

## Ahora el choque se nota

Corre de nuevo el escenario de dos escritores. `emp-8` tiene **1** hecho (su registro), así que A y B cargan en la versión 1. A escribe la versión 2 y entra. B **también** trae la versión 2: ya está ocupada, y `b.Append` lanza. Para ver el mensaje en vez de que el programa se caiga, **🔁 cambia** la línea de B por:

```csharp
try
{
    b.Append(eb.CambiarPlan("Enterprise"));      // trae la versión 2 → 💥 ya ocupada
}
catch (ConcurrencyException ex)
{
    Console.WriteLine($"B chocó: {ex.Message}");
}
```

```
B chocó: <el mensaje de tu ConcurrencyException>
emp-8: plan Básico, suspendida=True
```

B **no** guarda su decisión vieja en silencio: falla, y quien lo llamó puede recargar (ver que ya está suspendida), redecidir y reintentar. El diario quedó coherente.

> [!NOTE]
> Esto que construiste tiene nombre: **control de concurrencia optimista**. **¿Por qué "optimista"?** Asumes que los choques son **raros**, así que **no bloqueas** a nadie mientras trabaja (eso sería *pesimista*, y cuesta caro). Dejas que todos avancen y solo **al guardar** verificas la versión; si chocó, **fallas y reintentas** (recargar → redecidir → reintentar).
>
> 🌱 En producción no lo escribes a mano: las librerías que adoptaremos hacen exactamente esta verificación de "versión esperada" por ti al guardar un stream.

---

### El Descubrimiento

Envolviste cada hecho en un **sobre `EventoAlmacenado`** con su **versión** (su posición en la historia), y el almacén **rechaza** un `Append` cuya posición ya está ocupada. Así, dos escrituras simultáneas sobre la misma empresa ya no se pisan en silencio: la segunda choca con una `ConcurrencyException`. La versión no es un adorno: es el **detector de conflictos**.

Tienes el motor de event sourcing completo — pero lo has probado leyendo la consola con los ojos, y el choque lo provocaste tú, a mano, con dos streams en secuencia: nadie ha demostrado que con N escrituras de verdad en paralelo solo una gana. Esa duda queda abierta. Y todo vive en RAM: al reiniciar, se pierde. Eso lo resolverás pronto. Primero, algo más cercano al dominio: ¿tu motor sabe expresar **cualquier** acción del negocio? Hay una que todavía no.

---

> 📦 **¿Tu código no compila o no da lo mismo?** El `Program.cs` completo al cierre de esta sección está en [`checkpoints/09-concurrencia-optimista/Program.cs`](../checkpoints/09-concurrencia-optimista/Program.cs). Compáralo con el tuyo o cópialo para seguir.

## ✅ Compruébalo

- [ ] Con **una** empresa y **un** escritor, `Append` sigue funcionando: los hechos entran en versiones 1, 2, 3…
- [ ] Provoca el choque con **dos streams** sobre `emp-8` (ambos `Get`, ambos `Append`): el segundo lanza `ConcurrencyException`.
- [ ] **Predice antes de correr:** dentro del `catch`, B hace lo que dice el mensaje: `var eb2 = b.Get();` y vuelve a intentar `b.Append(eb2.CambiarPlan("Enterprise"));`. ¿Qué pasa ahora, y **quién** lo frena esta vez? Escribe tu predicción, córrelo y compara.
- [ ] **Predice antes de correr:** en vez de recargar, B reintenta `b.Append(...)` con el **mismo** stream, sin `Get`. ¿Entra o choca? Si tu `Append` incrementara `_version` **antes** de llamar al almacén, ¿qué cambiaría?
- [ ] Explica, con tus palabras, por qué se llama concurrencia **optimista** (no bloquea; verifica al guardar).
- [ ] El sobre lleva la **versión**, pero **no** el id de la empresa. Explica por qué (pista: el cajón ya es de una empresa).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** abre dos streams de la misma empresa, `Get` en ambos, `Append` en ambos. ¿Qué excepción salta y por qué? ¿Qué habría pasado **sin** la versión?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Concurrencia optimista" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Cada hecho se archiva en un **sobre `EventoAlmacenado`** con su **versión** (su posición); al guardar, el almacén **verifica** que esa posición esté libre y lanza `ConcurrencyException` si alguien escribió primero — eso es **concurrencia optimista**: no bloquear, sino detectar el choque al final y reintentar.

---

[⬅️ Volver: El almacén: un cajón por empresa](./el-almacen-por-id.md)

[➡️ Siguiente: Un acto de negocio, dos hechos](./un-acto-dos-hechos.md)

