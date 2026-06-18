# La versión es del agregado

En [El almacén en memoria](el-almacen-en-memoria.md) le pusiste a cada hecho un número de **versión** y el almacén rechaza una escritura si la versión no es la que toca: esa es la **concurrencia optimista**. Pero hay una pregunta incómoda: si cargas `emp-7` y te pregunto *"¿en qué versión estás?"*, tu `Empresa` **no sabe responder**. El número vive desperdigado —en el sobre `EventoAlmacenado` y en un `_version` privado, escondido dentro del `EventStream`—. Vamos a darle su hogar natural: el propio agregado.

## 🎯 El Objetivo

Que `empresa.Version` te diga **en qué versión cargó** el agregado — el dato contra el que se valida la concurrencia, y que **sobrevivirá** cuando en [El almacén directo](el-almacen-directo.md) cambiemos el almacén.

## El dolor: el número está atrapado en el `EventStream`

Hoy la "versión cargada" vive en `EventStream._version` (privado). Dos problemas:

1. **El agregado no la conoce.** La `Empresa` *es* la que está en la versión 3; debería saberlo, no tener que preguntárselo a otra clase.
2. **Va a desaparecer.** En [El almacén directo](el-almacen-directo.md) reemplazaremos el `EventStream`-ventana por un almacén directo, y ese `_version` se irá con él. La versión necesita un hogar que **no** dependa del `EventStream`.

El hogar correcto es el agregado: cuando lo rehidratas, queda marcado *"estás en la versión N"*.

## 🔧 Refactor: `Version` en `AggregateRoot`

> 🛠️ **Inténtalo tú.** En la base `AggregateRoot`, añade una propiedad `Version` (`int`) de **solo lectura desde fuera**, y haz que **`Load`** la suba **uno por cada hecho aplicado** (así, al terminar de rehidratar, `Version` = la versión del último hecho del stream). Importante: **`Raise` NO toca `Version`** — un hecho recién decidido aún **no está persistido**. Y, ya que el agregado conoce su versión, haz que `EventStream.GetAsync` la **lea de ahí** en vez de recalcularla.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

En `AggregateRoot` (🔁 solo cambian `Version` y `Load`; lo demás queda igual):

```csharp
public int Version { get; protected set; }       // el agregado conoce su versión

public void Load(IEnumerable<object> historia)
{
    foreach (var hecho in historia)
    {
        Aplicar(hecho);
        Version++;                                // cada hecho persistido sube la versión cargada
    }
}
```

`Raise` se queda **sin tocar** —solo encola y aplica, no sube `Version`—:

```csharp
protected void Raise(object hecho)
{
    _uncommittedEvents.Add(hecho);
    Aplicar(hecho);
}
```

Y en `EventStream.GetAsync`, el agregado ya es la fuente de la versión:

```csharp
public async Task<T> GetAsync()
{
    var entidad = new T { Id = _aggregateId };
    var sobres = (await _store.GetEventsAsync(_aggregateId)).ToList();
    entidad.Load(sobres.Select(s => s.EventData));
    _version = entidad.Version;          // 🔁 reemplaza SOLO esta línea (antes: sobres[^1].Version)
    return entidad;
}
```
</details>

> [!NOTE]
> **Por qué `Raise` no sube la versión, y por qué `protected set`.** `Version` es la versión **persistida** —la que cargaste—, no "cuántos hechos toqué en memoria". Por eso `Load` (que reproduce hechos **ya guardados**) la sube —el `Version++` vive solo dentro del `foreach` de `Load`—, pero `Raise` (un hecho **aún sin confirmar**) no: si cargaste en la versión 3 y decides algo, **sigues en la 3** hasta que se guarde. Esa "versión con la que cargué" es justo lo que la concurrencia optimista compara al escribir: *"¿el stream sigue en 3, o alguien más ya escribió?"*. Y el `set` es **`protected`** para que nadie falsee la versión desde fuera: solo el propio agregado la maneja.

> [!NOTE]
> 🌱 **Semilla — esto era para que sobreviva a [El almacén directo](el-almacen-directo.md).** En la próxima sección el `EventStream`-ventana **desaparece**: un almacén directo tomará el agregado, leerá sus `UncommittedEvents` para guardarlos y su `Version` para el chequeo de concurrencia — directamente del agregado, sin intermediario. Mover la versión aquí fue el paso que lo hace posible.

> [!NOTE]
> 🌱 **Semilla — Marten poblará este mismo `Version`.** Cuando reveles Marten ([Revelar Marten](revelar-marten.md)), al rehidratar él te rellena `Version` (con esta misma forma `{ get; protected set; }`). Un matiz para [Las dos vertientes](dos-vertientes.md): tu `InMemoryEventStore` **sí** hace cumplir la concurrencia optimista (el `ConcurrencyException` de [El almacén en memoria](el-almacen-en-memoria.md)); la capa del equipo tiene `Version` pero —lo verás en "las dos vertientes"— no la usa para frenar escrituras concurrentes. Aquí la dejamos lista igual.

---

## 🔍 Comprueba

Pon esto en tu `Program.cs` y corre `dotnet run`:

```csharp
var store = new InMemoryEventStore();
var s = store.AbrirStream<Empresa>("emp-7");
await s.AppendAsync(new EmpresaRegistrada("Constructora Andes", "Básico"));
await s.AppendAsync(new PlanCambiado("Premium"));
await s.AppendAsync(new EmpresaSuspendida("falta de pago"));

var empresa = await store.AbrirStream<Empresa>("emp-7").GetAsync();
Console.WriteLine($"cargada en versión {empresa.Version}");

empresa.Reactivar();   // decide (Raise): aplica, pero NO está guardado
Console.WriteLine($"tras decidir: versión {empresa.Version}, {empresa.UncommittedEvents.Count} sin confirmar");
```

> **¿Lo lograste?** Deberías ver:
> ```
> cargada en versión 3
> tras decidir: versión 3, 1 sin confirmar
> ```
> `Version` quedó en **3** (la versión persistida con la que cargaste), aunque ya decidiste un hecho nuevo: ese hecho está **sin confirmar**, no sube la versión hasta guardarse.

---

## ✅ Compruébalo

- [ ] `AggregateRoot` tiene `Version { get; protected set; }`; `Load` la sube por cada hecho; `Raise` **no** la toca.
- [ ] Tras cargar una empresa con 3 hechos, `empresa.Version` es **3**.
- [ ] Tras un `Reactivar()` sin guardar (o un `CambiarPlan()` sobre una empresa **no suspendida**), `Version` **no cambia** (el hecho está sin confirmar).
- [ ] Explica por qué `Version` es la "versión con la que cargué" y por qué eso es justo lo que compara la **concurrencia optimista**.

---

## 🧠 En una frase

La **versión** deja de estar atrapada en el `EventStream` y pasa a vivir en el agregado (`AggregateRoot.Version`, que sube **un hecho persistido a la vez** en el `Load`, no con `Raise`): el agregado sabe **en qué versión cargó**, que es exactamente lo que la **concurrencia optimista** compara al escribir — y el hogar donde Marten la pondrá.

---

[⬅️ Volver: Aplicar al levantar](./aplicar-al-levantar.md)

[➡️ Siguiente: El almacén directo (StartStream y Unit of Work)](./el-almacen-directo.md)
