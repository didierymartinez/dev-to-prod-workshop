# Consumir Cosmos.BuildingBlocks

Hasta aquí **reconstruiste** la plantilla para entenderla por dentro. Ahora la **instalas** como paquetes NuGet y construyes tu dominio encima.

## 🎯 El Objetivo

Consumir `Cosmos.BuildingBlocks` como paquetes NuGet: referenciar la vertiente que cada proyecto necesita, cablear el arranque con sus extensiones, y notar dos detalles de su estilo (que explicaremos): el arranque en español y una sintaxis nueva de C# 14.

## 💥 El dolor: copiar la plantilla es mantener un fork

Si pegas el `AggregateRoot`, el `MartenEventStore` y el `TestStore` en tu proyecto, quedas atado a **esa** copia: copiarla es mantener un fork. Cada mejora de la librería te obliga a re-pegar y reconciliar a mano, y cada equipo tendría su versión divergente. Lo que quieres es **depender** de la librería como un paquete versionado, y que tu dominio solo escriba lo suyo: los agregados y handlers del negocio.

## 🔧 Instalar y cablear

### Paso 1 · Referencia la vertiente que cada proyecto necesita

> 🛠️ **Inténtalo tú.** Reparte las referencias por proyecto: tu **dominio** solo debe ver los contratos; el **host** ve la implementación Critter Stack, el transporte y el resolver de multi-tenancy; los **tests** ven las utilidades de prueba.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```xml
<!-- Tu proyecto de DOMINIO (agregados, handlers, eventos): solo contratos -->
<PackageReference Include="Cosmos.EventSourcing.Abstractions" Version="0.1.8" />
<PackageReference Include="Cosmos.EventDriven.Abstractions" Version="0.1.8" />

<!-- Tu HOST (el servicio que arranca): la implementación + el transporte -->
<PackageReference Include="Cosmos.EventSourcing.CritterStack" Version="0.1.8" />
<PackageReference Include="Cosmos.EventDriven.CritterStack.RabbitMQ" Version="0.1.8" />
<PackageReference Include="Cosmos.MultiTenancy.CritterStack" Version="0.1.8" />

<!-- Tu proyecto de TESTS: el TestStore y la base de escenarios -->
<PackageReference Include="Cosmos.EventSourcing.Testing.Utilities" Version="0.1.8" />
```
</details>

> [!NOTE]
> 🆕 **Las dos vertientes, como paquetes.** El reparto es el de [Las dos vertientes](las-dos-vertientes.md): tu dominio referencia solo `…Abstractions` (contratos puros, **sin** Marten), así se compila y se prueba sin arrastrar infraestructura; el host referencia `…CritterStack` (los adaptadores) y el paquete del transporte (RabbitMQ o Azure Service Bus). La flecha de dependencia se mantiene: el dominio nunca ve Marten.

### Paso 2 · Cablea el arranque con las extensiones

> 🛠️ **Reconócelo.** Los nombres de estas extensiones los inventa la librería (no los adivinas), así que aquí **te los muestro**; tu trabajo es **emparejar** cada llamada con lo que ya cableaste a mano: `UsarWolverineParaComandos` ↔ `UseWolverine` + `Discovery`, `AgregarConfiguracionMartenComandos` ↔ `AddMarten` + `IntegrateWithWolverine`, `HabilitarRabbitMq` ↔ `UseRabbitMqUsingNamedConnection` + `AutoProvision`, `HabilitarOutboxParaEventosPublicos` ↔ el bucle de rutas `PublishMessage<T>().ToRabbitExchange(...)` de [Público vs privado](publico-privado.md).

> [!NOTE]
> 🆕 **El idioma dual.** Fíjate: tu **dominio** está en inglés (`AggregateRoot`, `IEventStore`, tus eventos y handlers), pero las extensiones de **arranque** están en español (`UsarWolverineParaComandos`, `AgregarConfiguracionMartenComandos`, `HabilitarRabbitMq`, `HabilitarOutboxParaEventosPublicos`, `AgregarTenantResolverHibrido`). Es una convención deliberada del equipo: el código técnico/portable en inglés, la **configuración de plataforma** en el idioma del equipo, para que el arranque se lea como instrucciones.

> [!NOTE]
> 🆕 **Extension members (C# 14).** Esas extensiones no son métodos estáticos sueltos: la librería las agrupa con la sintaxis nueva `extension(IServiceCollection services) { public void Agregar…() }` — un bloque que declara, de una, todos los métodos que "cuelgan" de un tipo. Tú solo las **llamas** como si fueran métodos del objeto (`services.AgregarTenantResolverHibrido()`); quien las **escribe** (la librería) usa esa forma para agruparlas legiblemente.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
builder.Host.UsarWolverineParaComandos(typeof(Empresa).Assembly, opts =>
{
    // connectionString e isDevelopment vienen de tu config; "gestion" es el schema de Postgres
    opts.AgregarConfiguracionMartenComandos(connectionString, "gestion", isDevelopment);
    opts.HabilitarRabbitMq("rabbit");   // "rabbit" = la entrada de ConnectionStrings en appsettings
    // nombre del servicio (su exchange) + el ensamblado donde viven tus eventos públicos:
    opts.HabilitarOutboxParaEventosPublicos("gestion-empresas", typeof(EmpresaSuspendida).Assembly);
});

builder.Services.AgregarTenantResolverHibrido();   // el ProxyTenantResolver de multi-tenancy
```
</details>

### Paso 3 · Tu dominio, encima

> 🔍 **¿Lo lograste?** Tu proyecto de dominio referencia solo `…Abstractions`; tu `Empresa : AggregateRoot` compila contra el paquete (no contra una copia). `dotnet restore` baja los paquetes, `dotnet build` compila, y `dotnet test` corre tus escenarios con el `TestStore` del paquete de utilidades. Escribiste **solo** tu negocio; la plomería vino instalada.

---

### El Descubrimiento

Dejaste de copiar para **consumir**. Referencias las vertientes por proyecto —`…Abstractions` en el dominio (sin Marten), `…CritterStack` + transporte en el host, `…Testing.Utilities` en los tests—, cableas el arranque con las extensiones en español (`Usar…`, `Agregar…`, `Habilitar…`), y tu dominio se apoya en los contratos sin arrastrar infraestructura. La librería es una dependencia versionada, no un fork; tú escribes el negocio. Reconoces cada extensión porque construiste lo que hay debajo.

> [!NOTE]
> 🌱 **Semilla — ¿y quién publica esos paquetes?** Consumes versiones (`0.1.8`). Alguien las **empaqueta y publica** — y ahí hay decisiones de criterio: ¿todos los paquetes suben juntos o por separado?, ¿cómo se clasifica un cambio (mayor, menor, parche)?, ¿por qué la `AssemblyVersion` es rara? Eso lo ves —como mantenedor— en [Empaquetar y publicar](empaquetar-y-publicar.md).

---

## ✅ Compruébalo

- [ ] Tu dominio referencia solo `…Abstractions` (sin Marten); el host, `…CritterStack` + transporte; los tests, `…Testing.Utilities`.
- [ ] Explicas por qué el reparto mantiene la flecha de dependencia de las dos vertientes.
- [ ] Cableas el arranque con las extensiones (`UsarWolverineParaComandos`, `AgregarConfiguracionMartenComandos`, `AgregarTenantResolverHibrido`…).
- [ ] Reconoces el **idioma dual** (dominio en inglés, arranque en español) y por qué.
- [ ] Sabes que las extensiones se **escriben** con `extension(Tipo){ }` (C# 14) y se **llaman** como métodos normales.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué consumir la librería como paquetes es mejor que copiarla? ¿Por qué el dominio solo referencia `Abstractions`? ¿Qué te dice el idioma dual sobre la intención del equipo?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Consumir Cosmos.BuildingBlocks" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Consumes `Cosmos.BuildingBlocks` como **paquetes NuGet** por vertiente (`…Abstractions` en el dominio sin Marten, `…CritterStack` + transporte en el host, `…Testing.Utilities` en tests), cableas el arranque con sus extensiones en español (`Usar…`/`Agregar…`/`Habilitar…`, escritas como *extension members* de C# 14) y escribes **solo** tu negocio encima.

---

[⬅️ Volver: El TestStore](./el-teststore.md)

[➡️ Siguiente: Empaquetar y publicar](./empaquetar-y-publicar.md)
