# El idioma de la plantilla: extension members de C#14

A lo largo del taller escribiste la configuración con la **API directa** de Marten y Wolverine (`builder.UseWolverine(...)`, `AddMarten(...).IntegrateWithWolverine()`, los `services.Add…`). La plantilla del equipo **envuelve** todo eso en sus propias extensiones —`AgregarConfiguracionMartenComandos`, `UsarWolverineParaComandos`, `HabilitarRabbitMq`, `AgregarTenantResolverConHeadersConfiables`…— y las escribe con una sintaxis que **aún no has visto**: `extension(IServiceCollection service) { … }`, `extension(WolverineOptions options) { … }`. No son métodos de extensión clásicos (`this IServiceCollection`). Es un **idioma nuevo de C# 14** —los *extension members*— y la plantilla lo usa en **todos** sus `*Extensions.cs`. Cuando abras la plantilla a mantenerla, te toparás con él en cada archivo; vas a reconocerlo aprendiéndolo aquí, construyéndolo.

## 🎯 El Objetivo

Entender (y saber escribir) el bloque **`extension(...)`** de C# 14 — la forma en que está escrita toda la capa de extensiones del equipo.

## El dolor: el `this` repetido

Un método de extensión clásico repite, en **cada** método, el `this`, el tipo del receptor y sus restricciones:

```csharp
public static class QueryableExtensions
{
    public static Task<List<T>> ToListAsync<T>(this IQueryable<T> fuente, CancellationToken ct) where T : notnull => …;
    public static Task<bool>    AnyAsync<T>(this IQueryable<T> fuente, CancellationToken ct) where T : notnull => …;
    //                                      ↑ this IQueryable<T> … where T : notnull   — repetido en cada uno
}
```

Si tienes cinco helpers sobre `IQueryable<T>`, repites `this IQueryable<T> … where T : notnull` cinco veces. C# 14 lo agrupa.

## 🔧 El bloque `extension(...)`

> 🛠️ **Inténtalo tú.** Escribe un par de helpers async sobre `IQueryable<T>` (p. ej. `ToListAsync`, `AnyAsync`) **primero** como métodos de extensión clásicos (con `this`), y luego **refactóralos** a un bloque **`extension<T>(IQueryable<T> fuente) where T : notnull { … }`** de C# 14, donde los miembros comparten el receptor. *(En **.NET 10** C# 14 ya es el default, así que **no tocas el `.csproj`**; solo si tu target fuera .NET 8/9 añadirías `<LangVersion>14</LangVersion>`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public static class QueryableExtensions
{
    // C# 14: el receptor y sus restricciones se declaran UNA vez para todo el bloque
    extension<T>(IQueryable<T> fuente) where T : notnull
    {
        public Task<IReadOnlyList<T>> ToListAsync(CancellationToken ct)
            => Marten.QueryableExtensions.ToListAsync(fuente, ct);

        public Task<bool> AnyAsync(CancellationToken ct)
            => Marten.QueryableExtensions.AnyAsync((IMartenQueryable<T>)fuente, ct);
    }
}
```

Dentro del bloque, cada miembro usa `fuente` directamente — sin `this`, sin repetir `IQueryable<T>` ni `where T : notnull`. Se llaman igual que cualquier extensión: `await consulta.ToListAsync(ct)`.
</details>

> [!NOTE]
> **Por qué te importa: es el estilo de TODA la capa del equipo.** Cada `*Extensions.cs` de la plantilla —`AgregarConfiguracionMartenComandos`, `UsarWolverineParaComandos`, `HabilitarRabbitMq`, `AgregarTenantResolverConHeadersConfiables`…, los que **envuelven** la configuración que tú escribiste con la API directa— está escrito así: un `extension(IServiceCollection service) { … }` o `extension(WolverineOptions options) { … }` que agrupa los helpers. Reconocer este idioma es la diferencia entre "leer" la plantilla y "perderte" en ella.

> [!NOTE]
> ⚖️ **Es `QueryableExtensions` / `TaskAggregateRootExtensions` de la plantilla, 1:1.** El primero reexpone `ToListAsync`/`AnyAsync`/`FirstOrDefaultAsync` delegando a `Marten.QueryableExtensions`; el segundo trae `Tap`/`Map` sobre `Task<T>` (azúcar para encadenar transformaciones sobre tareas async). Detalle de empaquetado: la dependencia a Marten va con **`PrivateAssets=all`** — el consumidor de tu paquete obtiene los helpers **sin** recibir Marten como dependencia transitiva. (Lo veremos en [Empaquetar como NuGet](nuget-empaquetado.md).)

> [!NOTE]
> ⚖️ **Divergencia de la doc del creador.** Marten/Wolverine documentan sus extensiones con la firma **clásica** (`this`). El equipo eligió el bloque `extension(...)` de C# 14 — compila igual en .NET 10, pero diverge de los ejemplos de la doc oficial. Tenlo presente al traducir doc → plantilla.

---

## 🔍 Comprueba

```csharp
var nums = new[] { 1, 2, 3 }.AsQueryable();
Console.WriteLine($"¿hay alguno > 5? {nums.HayMayorQue(5)}");

public static class QueryableExtensions
{
    extension<T>(IQueryable<T> fuente) where T : notnull
    {
        public bool HayMayorQue(int x) => fuente.Cast<int>().Any(n => n > x);
    }
}
```

> **¿Lo lograste?** Con `<LangVersion>14</LangVersion>`, compila y `dotnet run` imprime `¿hay alguno > 5? False`. Llamaste `nums.HayMayorQue(5)` como cualquier extensión, pero el método vive en un bloque `extension(...)` que comparte el receptor.

---

## ✅ Compruébalo

- [ ] Escribiste un helper sobre `IQueryable<T>` como método clásico (`this`) y lo refactorizaste al bloque **`extension<T>(IQueryable<T>) where T : notnull { … }`** de C# 14.
- [ ] Entiendes que el bloque declara el receptor + restricciones **una vez** para todos sus miembros.
- [ ] Reconoces que **todos** los `*Extensions.cs` del equipo (DI, Wolverine, RabbitMQ, tenancy) usan este idioma.
- [ ] Sabes que `PrivateAssets=all` evita filtrar Marten al consumidor del paquete ([Empaquetar como NuGet](nuget-empaquetado.md)).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué le aporta el bloque `extension(...)` de C#14 a la API de la plantilla?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Extension members" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Toda la capa de extensiones del equipo usa el idioma de **C# 14** *extension members* —`extension<T>(IQueryable<T>) where T : notnull { … }`, que declara el receptor y las restricciones **una vez** para varios miembros en vez de repetir `this`—; reconocerlo es lo que te deja leer y mantener la plantilla (y lo ves en `QueryableExtensions`, `TaskAggregateRootExtensions` y cada `*Extensions.cs`).

---

[⬅️ Volver: Given-When-Then](./given-when-then.md)

[➡️ Siguiente: Empaquetar y publicar como NuGet](./nuget-empaquetado.md)
