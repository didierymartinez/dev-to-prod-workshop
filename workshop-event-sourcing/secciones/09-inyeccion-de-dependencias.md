# 09 · De `new` al contenedor (Inyección de Dependencias)

El motor está listo para el mundo asíncrono. Pero mira el `Program.cs`: para que todo funcione, **tú** armas las piezas a mano.

## 🎯 El Objetivo

Dejar de ensamblar el sistema con `new` por todos lados, y que algo lo arme por nosotros — para que añadir una base de datos real (que viene) no convierta el arranque en una pesadilla.

## El problema: el infierno de los `new`

```csharp
var almacen = new InMemoryEventStore();
var handler = new SuspenderHandler(almacen);
```

Hoy son dos líneas. ¿Pero qué pasa cuando el `EventStore` necesite una **conexión a PostgreSQL** y un **serializador de JSON** para funcionar?

```csharp
var conexion = new PostgresConnection("Host=localhost;…");
var json     = new SerializadorJson();
var almacen  = new PostgresEventStore(conexion, json);
var handler  = new SuspenderHandler(almacen);
// … y esto, por cada uno de los 50 handlers que tengas
```

El arranque se vuelve una pesadilla de cableado: estás **armando los escritorios** en vez de atender clientes. Tiene que haber alguien que arme las piezas por ti.

## La solución: un contenedor que arma las piezas

La industria lo resuelve con **inyección de dependencias (DI)**. Imagina un **recepcionista** muy eficiente:

1. **El registro** (`IServiceCollection`): al arrancar, le enseñas cómo se fabrica cada cosa. *"Cuando alguien necesite el almacén, fabrícale un `InMemoryEventStore`."*
2. **El suministro** (`IServiceProvider`): cuando alguien necesita un `SuspenderHandler`, el recepcionista **lee su constructor**, ve que pide un `InMemoryEventStore`, lo fabrica, se lo **inyecta**, y te entrega el handler listo.

El handler ya no toma el control de crear su almacén; simplemente **exige** un `InMemoryEventStore` en su constructor y confía en que se lo darán. Eso —que el control de crear las dependencias pase de tu clase a alguien externo— se llama **Inversión de Control (IoC)**.

## En .NET: `ServiceCollection`

El contenedor de .NET no viene en un `dotnet new console`: es un paquete. **Instálalo** (desde la carpeta del proyecto):

```bash
dotnet add package Microsoft.Extensions.DependencyInjection
```

Ahora sí, en tu `Program.cs`:

```csharp
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();

services.AddSingleton<InMemoryEventStore>();   // UNO solo para toda la app
services.AddTransient<SuspenderHandler>();     // uno NUEVO cada vez que lo pidan

var proveedor = services.BuildServiceProvider();

// pedimos el handler: el recepcionista lee su constructor, fabrica el InMemoryEventStore y se lo inyecta
var handler = proveedor.GetRequiredService<SuspenderHandler>();
await handler.HandleAsync(new SuspenderEmpresa("emp-7", "falta de pago"));
```

Sin un solo `new` nuestro: el contenedor armó el grafo.

> [!NOTE]
> **Los tiempos de vida** importan: `AddSingleton` (una instancia para toda la app), `AddScoped` (una por petición/mensaje), `AddTransient` (una nueva cada vez). Trampa clásica (*captive dependency*): meter un `Scoped` dentro de un `Singleton` lo "congela" con la primera instancia — un bug silencioso. Lo retomaremos cuando importe.

## 🧬 Desarmemos la "magia": un mini-contenedor en ~20 líneas

Dijimos "el recepcionista lo fabrica por arte de magia". No hay magia: un contenedor es **un diccionario + reflexión del constructor + recursión**. Construyamos uno de juguete para probarlo:

```csharp
public class MiniContenedor
{
    // el "libro": interfaz → clase concreta que la cumple
    private readonly Dictionary<Type, Type> _registro = new();

    public void Registrar<TServicio, TImpl>() => _registro[typeof(TServicio)] = typeof(TImpl);

    public object Resolver(Type tipo)
    {
        // 1. si pidieron una interfaz, busca su implementación en el libro
        var concreto = _registro.TryGetValue(tipo, out var impl) ? impl : tipo;

        // 2. lee el constructor y resuelve CADA dependencia recursivamente (reflexión)
        var ctor = concreto.GetConstructors().First();
        var argumentos = ctor.GetParameters()
                             .Select(p => Resolver(p.ParameterType))   // ← recursión
                             .ToArray();

        // 3. crea la instancia con sus dependencias ya armadas
        return Activator.CreateInstance(concreto, argumentos)!;
    }

    public T Resolver<T>() => (T)Resolver(typeof(T));
}
```

```csharp
var c = new MiniContenedor();
// como aún no hay interfaces, no registramos nada: el contenedor crea las clases concretas directamente
var handler = c.Resolver<SuspenderHandler>();   // lee su ctor, fabrica el InMemoryEventStore, lo inyecta
```

> 💡 El `MiniContenedor` es un **juguete para entender** que un contenedor no es magia — no lo necesitas en tu app (ahí usas el `ServiceCollection` de arriba). Constrúyelo, pruébalo para verlo funcionar, y luego puedes **borrarlo** o dejarlo en un archivo aparte.

> [!NOTE]
> **¿Qué es la "reflexión"?** Es la capacidad de C# de **inspeccionarse a sí mismo en ejecución**: `concreto.GetConstructors()` pregunta "¿qué constructores tiene esta clase?", `GetParameters()` "¿qué pide cada uno?", y `Activator.CreateInstance` crea el objeto. El mini-contenedor lee el constructor del `SuspenderHandler`, ve que pide un `InMemoryEventStore`, lo resuelve (recursión: si ese a su vez pidiera cosas, las arma), y lo construye. **Eso es todo lo esencial de un contenedor.** El de .NET le añade tiempos de vida, validación y rendimiento — pero el corazón es esto. La próxima vez que `AddSingleton<…>()` parezca magia, recuerda: **acabas de escribirla**.

---

### El Descubrimiento

La inyección de dependencias no es una comodidad: es el **puente entre tu dominio y la infraestructura**. Tu `SuspenderHandler` **recibe** su almacén en vez de crearlo. Hoy lo recibe **concreto** (`InMemoryEventStore`); el día que dependa de una **abstracción**, dejará de saber si la persistencia es RAM, Postgres o un archivo. En la DI conviven **cuatro** ideas distintas, no una:

- **DIP** (principio): depender de **abstracciones**, no de concretos. Aún **no** lo aplicamos —hay una sola implementación—; lo harás al enchufar Marten, y ahí sentirás su valor.
- **IoC** (patrón): que algo externo controle la creación.
- **DI** (técnica): pasar la dependencia por el constructor. **Funciona sin framework** — los `new` manuales del principio *ya eran* DI ("pure DI").
- **Contenedor** (`ServiceCollection`): la herramienta que automatiza el ensamblaje (diccionario + reflexión + recursión, como tu mini-contenedor).

> [!NOTE]
> 🌱 **Semilla — inyección por método (lo que verás en el Critter Stack).** Toda la vida inyectamos por **constructor**. Pero Wolverine, por cómo genera su código, **prefiere pedir las dependencias como parámetros del propio método** `Handle`:
> ```csharp
> public static Task Handle(SuspenderEmpresa cmd, IDocumentSession session) { … }
> ```
> Menos ceremonia (sin constructor ni campos), y el framework inyecta exactamente lo que cada método necesita. Cuando veas dependencias en la **firma del método**, no es raro: es a propósito.

> [!NOTE]
> 🌱 **Semilla — el contenedor en runtime también se puede evitar.** El contenedor de .NET resuelve por reflexión **en cada petición**. Wolverine va más allá: **genera código C# inspeccionable** que hace la inyección de forma explícita (más rápido y sin sorpresas). Lo verás cuando levantemos esa última magia.

La DI es vital aprenderla **ahora** porque, en la próxima fase, descubrirás que **Marten** no es más que una caja de instrucciones para este recepcionista: cuando escribas `services.AddMarten(...)`, Marten le enseñará al contenedor cómo conectarse a la base de datos y proveer un Event Store de producción — borrando de un plumazo el `InMemoryEventStore` y todo lo que construimos a mano para simular el almacenamiento.

Y ahí, con **una segunda implementación**, por fin tendrá sentido **extraer `IEventStore`**: tus handlers pasarán a depender de esa abstracción y **no cambiarán** al reemplazar el almacén. Esa —y no antes— es la utilidad de abstraer.

Es hora de conectar Postgres de verdad.

---

## ✅ Compruébalo

- [ ] Reemplazaste los `new` manuales del `Program.cs` por `services.Add…` + `GetRequiredService<…>`.
- [ ] Construiste el `MiniContenedor` y resolviste un `SuspenderHandler` con su `InMemoryEventStore` inyectado, sin `new` tuyo.
- [ ] Sabes distinguir **DIP / IoC / DI / contenedor** y qué hace cada tiempo de vida (Singleton/Scoped/Transient).
- [ ] Explica, con tus palabras, por qué un contenedor "no es magia de C#" (diccionario + reflexión + recursión).

---

## 🧠 En una frase

Un **contenedor de DI** arma el grafo de objetos por ti —lees su corazón en 20 líneas: registro + reflexión del constructor + recursión— para que tus clases **reciban** sus dependencias ya armadas (hoy el `InMemoryEventStore` concreto; mañana, una abstracción) sin tener que crearlas a mano.

---

[⬅️ Volver: El tiempo de espera (async/await)](./08-el-tiempo-de-espera.md)

[➡️ Siguiente: Persistencia real (Docker y PostgreSQL)](./10-docker-postgres.md)
