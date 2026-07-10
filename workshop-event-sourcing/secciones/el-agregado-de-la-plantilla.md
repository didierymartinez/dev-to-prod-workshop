# El agregado de la plantilla: recuerda sus propios hechos

En [Las dos vertientes](las-dos-vertientes.md) viste que el `AggregateRoot` real es más completo que el tuyo. Tu `Empresa` tiene que adaptarse a esa forma — y al hacerlo, cambia cómo decide.

## 🎯 El Objetivo

Adaptar tu `Empresa` al `AggregateRoot` real: que **acumule** sus eventos no confirmados al decidir, y que sepa separar los **públicos** de los **privados**.

## 💥 El dolor: ¿quién junta los hechos que el agregado emite?

Hoy tu `Empresa.Suspender(...)` **devuelve** el hecho y el handler lo pasa al store, uno por uno. Funciona para un hecho. Pero si un comando produce **varios** hechos, o si necesitas **publicar** los públicos por el bus ([Público vs privado](publico-privado.md)) además de guardarlos, el handler termina cargando esa logística. El agregado —que es quien **sabe** qué hechos ocurrieron— debería **recordarlos** él mismo, ya aplicados a su estado, listos para que el almacén los guarde y el bus los publique.

> [!NOTE]
> **Modelo simplificado.** Para enfocarnos en la mecánica del `AggregateRoot`, aquí la `Empresa` se queda con `RazonSocial` y `Suspendida` (con `EmpresaRegistrada(razonSocial)`). Ambos hechos —`EmpresaRegistrada` y `EmpresaSuspendida`— implementan `IPublicEvent` (de [Público vs privado](publico-privado.md)). Tu `Empresa` de secciones anteriores puede tener más campos (`Plan`, etc.); adáptala igual — lo que cambia es **cómo** emite y guarda los hechos, no cuáles.

## 🔧 El `AggregateRoot` real

### Paso 1 · La forma completa

Recuerda dónde quedó tu base: en [el swap](el-swap.md) borraste el `Load`/`Aplicar` de `AggregateRoot` y tu `Empresa` dejó de heredar de ella (Marten hacía el fold). Aquí la base **renace** con una forma nueva, y `Empresa` vuelve a heredar de ella.

> 🛠️ **Inténtalo tú.** Amplía tu `AggregateRoot` con: el `Id`, la `Version` (el número de eventos ya guardados del stream — la base de la concurrencia de [§9](concurrencia-optimista.md)), una lista de **eventos no confirmados** marcada para que **ningún serializador la escriba** (es transitoria), y métodos para leerla, limpiarla y separarla en públicos y privados.

> [!NOTE]
> 🆕 **El agregado recuerda sus hechos.** `_uncommittedEvents` es la lista de hechos que el agregado emitió y **aún no** se han guardado. `UncommittedEvents` la expone en solo-lectura; `ClearUncommittedEvents` la vacía tras guardar. Va marcada `[JsonIgnore]` porque es **transitoria** (en memoria, pendiente de volcar): no es parte del estado persistido del agregado, así que ningún serializador debe escribirla.

> [!NOTE]
> 🆕 **Separar públicos de privados en el agregado.** `GetPublicEvents()`/`GetPrivateEvents()` filtran esa lista por los marcadores de [Público vs privado](publico-privado.md) (`OfType<IPublicEvent>()`). Así el agregado mismo dice cuáles de sus hechos cruzan la frontera y cuáles se quedan dentro — la base para que el almacén guarde todo y el bus publique solo los públicos.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Text.Json.Serialization;

public abstract class AggregateRoot
{
    protected readonly List<object> _uncommittedEvents = new();
    public string Id { get; protected set; } = string.Empty;
    public int Version { get; protected set; }

    [JsonIgnore] public IReadOnlyList<object> UncommittedEvents => _uncommittedEvents.AsReadOnly();

    public void ClearUncommittedEvents() => _uncommittedEvents.Clear();

    public IPublicEvent[] GetPublicEvents()  => _uncommittedEvents.OfType<IPublicEvent>().ToArray();
    public IPrivateEvent[] GetPrivateEvents() => _uncommittedEvents.OfType<IPrivateEvent>().ToArray();
}
```
</details>

### Paso 2 · `Empresa` acumula al decidir

Ahora `Empresa` no **devuelve** el hecho: lo **emite y lo aplica** de una, quedando el hecho en `_uncommittedEvents` y el estado ya actualizado.

> 🛠️ **Inténtalo tú.** **🔁** Cambia `Empresa` (que vuelve a heredar de `AggregateRoot`): un `Create` estático y un `Suspender` que, en vez de devolver el hecho, lo **levanten y apliquen** con un helper `RaiseAndApply` (que añade a `_uncommittedEvents` **y** lo aplica al estado). Como al **decidir** estás fuera de Marten, `RaiseAndApply` rutea el hecho a su `Apply` con un `switch` por tipo (`ApplyInternal`). Los `Apply(TEvento)` siguen mutando el estado.

> [!NOTE]
> 🆕 **`RaiseAndApply` — emitir y aplicar en un gesto.** Junta dos cosas: **añade** el hecho a `_uncommittedEvents` (para guardarlo luego) y lo **aplica** ya al estado (`ApplyInternal` rutea por tipo al `Apply` correcto). ¿Por qué vuelve el `switch` que Marten te había quitado? Porque Marten rutea tus `Apply` solo al **rehidratar**; aquí, al **decidir**, el agregado se aplica el hecho a sí mismo y tiene que rutearlo a mano. Por eso, tras `Suspender`, `Suspendida` ya es `true` **antes** de guardar. Es el mismo par *decidir/aplicar* de [Decidir el futuro](decidir-el-futuro.md), ahora con el agregado guardando el rastro. `RaiseAndApply` vive en **cada agregado** (usa el `_uncommittedEvents` de la base); la base se queda mínima.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class Empresa : AggregateRoot
{
    public string RazonSocial { get; private set; } = string.Empty;
    public bool Suspendida { get; private set; }

    public Empresa() { }

    public static Empresa Create(string id, string razonSocial)
    {
        var empresa = new Empresa();
        empresa.RaiseAndApply(new EmpresaRegistrada(razonSocial));
        empresa.Id = id;
        return empresa;
    }

    public void Suspender(string motivo)
    {
        if (Suspendida) return;                       // idempotencia (de decidir-el-futuro)
        RaiseAndApply(new EmpresaSuspendida(motivo));
    }

    private void RaiseAndApply(object evento)
    {
        _uncommittedEvents.Add(evento);               // recordar el hecho
        ApplyInternal(evento);                        // y aplicarlo ya al estado
    }

    private void ApplyInternal(object evento)
    {
        switch (evento)
        {
            case EmpresaRegistrada e: Apply(e); break;
            case EmpresaSuspendida e: Apply(e); break;
        }
    }

    public void Apply(EmpresaRegistrada e) => RazonSocial = e.RazonSocial;
    public void Apply(EmpresaSuspendida e) => Suspendida = true;
}
```
</details>

### Paso 3 · Compruébalo

> 🔍 **¿Lo lograste?** Crea y suspende sin tocar ninguna base:
>
> ```csharp
> var empresa = Empresa.Create("emp-7", "Acme SA");
> empresa.Suspender("impago");
>
> empresa.Suspendida.Should().BeTrue();                         // el estado ya se aplicó
> empresa.UncommittedEvents.Should().HaveCount(2);              // recordó los dos hechos
> empresa.GetPublicEvents().Should().HaveCount(2);              // ambos son IPublicEvent
> ```
>
> El agregado lleva su propio rastro de hechos, ya aplicados, separables en públicos y privados — sin que nadie más los junte.

---

### El Descubrimiento

Tu `Empresa` dejó de **devolver** hechos para **acumularlos**. El `AggregateRoot` real guarda sus `_uncommittedEvents` (transitorios, `[JsonIgnore]`), los aplica al vuelo con `RaiseAndApply`, y sabe separarlos en **públicos** y **privados** por sus marcadores. El agregado se volvió el dueño de "qué pasó y aún no se guarda", ya con el estado consistente. Falta quién **vuelque** esa lista a Marten y publique los públicos — y ese es el trabajo del almacén y su unidad de trabajo.

> [!NOTE]
> 🌱 **Semilla — ¿quién guarda lo acumulado?** Si el agregado ahora **recuerda** sus hechos en vez de entregarlos, alguien tiene que recorrer `UncommittedEvents` y volcarlos a Marten al confirmar — y hacerlo tanto para un agregado **nuevo** (`StartStream`) como para uno **modificado** (`Append`). Ese es el `MartenEventStore` con su **unidad de trabajo**, en [El almacén de la plantilla](el-almacen-de-la-plantilla.md).

---

## ✅ Compruébalo

- [ ] Tu `AggregateRoot` tiene `_uncommittedEvents`, `UncommittedEvents` (`[JsonIgnore]`), `ClearUncommittedEvents`, `GetPublicEvents`/`GetPrivateEvents`.
- [ ] `Empresa.Create`/`Suspender` usan `RaiseAndApply` en vez de devolver el hecho.
- [ ] `RaiseAndApply` **añade** a `_uncommittedEvents` **y** aplica el hecho al estado.
- [ ] Explicas por qué `UncommittedEvents` va `[JsonIgnore]` (transitoria, no es estado persistido).
- [ ] `GetPublicEvents`/`GetPrivateEvents` separan por los marcadores de Público vs privado.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué conviene que el agregado **recuerde** sus hechos en vez de devolverlos? ¿Qué gana aplicándolos al vuelo (`RaiseAndApply`)? ¿Para qué separa públicos de privados?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El agregado de la plantilla: recuerda sus propios hechos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El `AggregateRoot` real **acumula** sus `_uncommittedEvents` (transitorios, `[JsonIgnore]`), los aplica al vuelo con `RaiseAndApply` y sabe separarlos en **públicos** y **privados** por sus marcadores. Tu `Empresa` deja de devolver hechos: los recuerda con el estado ya consistente, listos para que el almacén los vuelque a Marten.

---

[⬅️ Volver: Las dos vertientes](./las-dos-vertientes.md)

[➡️ Siguiente: El almacén de la plantilla](./el-almacen-de-la-plantilla.md)
