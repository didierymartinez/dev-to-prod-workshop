# Cuando dos escriben a la vez (concurrencia optimista)

Ya tienes un **almacén** que guarda muchas empresas por su id, y un stream que lee y escribe la de cada una. Hasta ahora tu código corría de arriba a abajo con un solo `dotnet run`; pero una app real atiende **muchas peticiones a la vez** (dos usuarios, dos pestañas), y dos pueden abrir la **misma** empresa en el **mismo instante**. Ahí aparece un peligro silencioso.

## 🎯 El Objetivo

Que dos escrituras simultáneas sobre la misma empresa **no se pisen sin que nadie se entere**: detectar el choque y rechazarlo.

## 💥 El dolor: la actualización perdida

Dos peticiones abren su propio stream de "Constructora Andes" **al mismo tiempo**, cada una la rehidrata (la ven **igual**), decide algo y lo escribe:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");
var b = store.AbrirStream<Empresa>("emp-7");
a.Get();   // A carga la empresa
b.Get();   // B la carga al mismo tiempo — ve lo mismo que A

a.Append(new EmpresaSuspendida("falta de pago"));   // A la suspende
b.Append(new PlanCambiado("Enterprise"));            // B le cambia el plan
```

Ambas entran tan tranquilas. Pero **B decidió "Enterprise" mirando una empresa que A acababa de suspender** — trabajó sobre un estado que ya no era cierto, y nadie se dio cuenta. Eso es una **actualización perdida** (*lost update*): el diario quedó incoherente y en silencio.

## 🔧 Numerar cada hecho: el sobre

Para atrapar el choque necesitas saber **en qué posición** entra cada hecho. Una vez archivado, cada hecho ocupa un lugar fijo en la historia de su empresa: el 1.º, el 2.º… Esa posición es su **versión**. La grabamos (con la fecha) envolviendo el hecho en un **sobre**:

```csharp
// el sobre: envuelve el hecho con su POSICIÓN en el stream y cuándo se anotó
public record EventoAlmacenado(int Version, DateTime Timestamp, object EventData);
```

> 💡 El sobre **no** lleva quién es la empresa: el cajón **ya es** de una empresa (su id es el rótulo). Solo añade lo que el hecho por sí mismo no sabe: su **posición** y su fecha. Al leer, se desenvuelve — al agregado le interesa el hecho, no el sobre.

Con la versión a bordo, la regla es simple: **cada hecho declara la posición que cree ocupar; si esa posición ya está tomada, alguien escribió primero → se rechaza.**

> 🛠️ **Inténtalo tú.** (1) **🔁** El `EventStore` ahora guarda `List<EventoAlmacenado>` (sobres). En `AppendEvent(id, EventoAlmacenado sobre)`, **antes de aceptar**, comprueba: si esa posición **ya está tomada** (`sobre.Version <= cajon.Count`), lanza una `ConcurrencyException`. Y `GetEvents` devuelve los sobres. (2) **🔁** El `EventStream` ahora **numera**: en `Get` recuerda cuántos hechos había (la versión), y en `Append` envuelve el hecho en un sobre con la **siguiente** versión. Al rehidratar, **desenvuelve** (solo el hecho).

> [!NOTE]
> 🆕 **Idioma de C#: `.Select(...)`.** Para rehidratar necesitas los hechos *sin* el sobre. `sobres.Select(s => s.EventData)` recorre la lista de sobres y produce solo su contenido (el hecho) — es *proyectar* cada elemento a otra cosa (LINQ). Lo usarás para pasarle al `Load` los hechos pelados, no los sobres.

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
        _version++;                                       // este hecho ocupa la siguiente posición
        _store.AppendEvent(_aggregateId, new EventoAlmacenado(_version, DateTime.UtcNow, hecho));
    }
}
```
</details>

## Ahora el choque se nota

Repite el escenario de dos escritores. Supón que "Constructora Andes" (`emp-7`) ya tiene **1** hecho (su registro), así que ambos cargan en la versión 1:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");
var b = store.AbrirStream<Empresa>("emp-7");
a.Get();   // _version = 1
b.Get();   // _version = 1  (ve lo mismo)

a.Append(new EmpresaSuspendida("falta de pago"));   // escribe la versión 2 → entra (cajón va en 2)
b.Append(new PlanCambiado("Enterprise"));            // también trae la versión 2 → 💥 ya ocupada
```

`b.Append` lanza `ConcurrencyException`: *"La versión 2 ya está ocupada"*. B **no** pisa a A en silencio: falla, y quien lo llamó puede recargar (ver que ya está suspendida), redecidir y reintentar.

> [!NOTE]
> Esto que construiste tiene nombre: **control de concurrencia optimista**. **¿Por qué "optimista"?** Asumes que los choques son **raros**, así que **no bloqueas** a nadie mientras trabaja (eso sería *pesimista*, y cuesta caro). Dejas que todos avancen y solo **al guardar** verificas la versión; si chocó, **fallas y reintentas** (recargar → redecidir → reintentar).
>
> 🌱 En producción no lo escribes a mano: las librerías que adoptaremos hacen exactamente esta verificación de "versión esperada" por ti al guardar un stream.

---

### El Descubrimiento

Envolviste cada hecho en un **sobre `EventoAlmacenado`** con su **versión** (su posición en la historia), y el almacén **rechaza** un `Append` cuya posición ya está ocupada. Así, dos escrituras simultáneas sobre la misma empresa ya no se pisan en silencio: la segunda choca con una `ConcurrencyException`. El número que parecía decorativo resultó ser el **detector de conflictos**.

Queda una fragilidad: este almacén vive en RAM —**si el servidor se reinicia, se pierde todo**— y hablar con una base de datos real es **I/O que tarda**. En la próxima sección enfrentamos ese mundo: la espera, y por qué cambia la forma de nuestro código.

---

## ✅ Compruébalo

- [ ] Con **una** empresa y **un** escritor, `Append` sigue funcionando: los hechos entran en versiones 1, 2, 3…
- [ ] Provoca el choque con **dos streams** sobre `emp-7` (ambos `Get`, ambos `Append`): el segundo lanza `ConcurrencyException`.
- [ ] Explica, con tus palabras, por qué se llama concurrencia **optimista** (no bloquea; verifica al guardar).
- [ ] El sobre lleva la **versión** y la fecha, pero **no** el id de la empresa. Explica por qué (pista: el cajón ya es de una empresa).

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

