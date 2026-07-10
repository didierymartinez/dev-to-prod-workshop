# Empaquetar y publicar: el oficio del mantenedor

Consumiste versiones (`0.1.8`) de [Cosmos.BuildingBlocks](consumir-cosmos-buildingblocks.md). Ahora ponte del otro lado: eres **mantenedor** y tienes que **publicar** una versión nueva sin romper a quien consume.

## 🎯 El Objetivo

Publicar una versión nueva sin romper a quien consume: una sola versión para todo el repo, y clasificar bien el cambio (mayor / menor / parche).

## 💥 El dolor: dos formas de romper al que consume

Publicar mal rompe a otros, no a ti:

- **La trampa de MSBuild.** Si la versión que inyectas al empacar se hornea como `AssemblyVersion` de las referencias **internas** entre tus paquetes, cada paquete queda pidiendo una versión exacta de sus hermanos que **quizás no existe** en NuGet → el consumidor recibe `FileNotFoundException` en runtime (el bug `dotnet/sdk#12322`).
- **La trampa del criterio.** Si subes una versión **menor** cuando en realidad rompiste una API pública, el consumidor actualiza confiado y su código deja de compilar. La versión **miente** sobre el riesgo del cambio.

## 🔧 Publicar bien

### Paso 1 · `Directory.Build.props`: desacoplar la `AssemblyVersion`

Primero, cómo se empaca: el release corre `dotnet pack -p:Version=1.2.3`, que produce los `.nupkg`. `-p:Version` es una propiedad de MSBuild que, por defecto, alimenta **tanto** la versión del paquete **como** la `AssemblyVersion` de cada dll — y ahí está la trampa. Lo que sigue es **andamiaje de MSBuild** (inguessable): te lo muestro.

> [!NOTE]
> 🆕 **`Directory.Build.props` + `AssemblyVersion` en el piso.** `Directory.Build.props` es un archivo que MSBuild aplica a **todos** los proyectos bajo su carpeta, sin repetir config en cada `.csproj`. Aquí hace una cosa clave: fija `AssemblyVersion = 0.0.0.0`. Sin ese piso, la `X` de `dotnet pack -p:Version=X` se hornearía como la `AssemblyVersion` de las referencias internas, apuntando a versiones inexistentes. Con el piso `0.0.0.0`, la referencia horneada es la **mínima** —la satisface cualquier versión desplegada— y el contrato SemVer real lo lleva la **versión del paquete** en NuGet. La otra propiedad, `FileVersion`, sí refleja el número real (para diagnóstico); su regex recorta el sufijo *prerelease* (como `1.2.3-beta`), que `FileVersion` no admite.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```xml
<Project>
  <PropertyGroup>
    <!-- Piso fijo: la referencia interna horneada es siempre la mínima,
         satisfacible por cualquier versión publicada (evita dotnet/sdk#12322). -->
    <AssemblyVersion>0.0.0.0</AssemblyVersion>

    <!-- FileVersion sí refleja la versión real (para diagnóstico), sin el sufijo prerelease. -->
    <FileVersion Condition="'$(Version)' != ''">$([System.Text.RegularExpressions.Regex]::Replace($(Version), '[-+].*$', ''))</FileVersion>
  </PropertyGroup>
</Project>
```
</details>

### Paso 2 · Lockstep: una versión para todo el repo

> [!NOTE]
> 🆕 **Versionado lockstep.** Todos los paquetes del repo se publican con la **misma** versión, a la vez. ¿Por qué? Porque dependen entre sí; si cada uno llevara su número, un consumidor tendría que resolver una **matriz** de compatibilidades ("¿la `CritterStack` 0.4 va con la `Abstractions` 0.7?"). Lockstep elimina esa matriz: una sola versión describe todo el conjunto. Por eso los `.csproj` **no** llevan `<Version>` fijo — la versión única se inyecta en el release (`-p:Version=X`) para todos.

### Paso 3 · Clasificar el cambio (el criterio)

> 🛠️ **Inténtalo tú.** Antes de publicar, clasifica el cambio desde el último release según **Versionado Semántico** (SemVer: `MAYOR.MENOR.PARCHE`, cada número con un significado fijo en la industria). Decide entre **mayor**, **menor** y **parche** — y **no** asumas "menor" por defecto.

<details>
<summary>👉 La regla</summary>

| Tipo | Cuándo | Ejemplo |
| --- | --- | --- |
| **mayor** | Rompe una API o contrato público | cambiar la firma de `IPublicEventSender`, quitar/renombrar un tipo o método público |
| **menor** | Funcionalidad nueva **retrocompatible** | un método de extensión nuevo, una sobrecarga nueva, un paquete nuevo |
| **parche** | Solo arreglos retrocompatibles | un bug corregido sin cambiar API, un bump de dependencia no rompedor |

**Regla de oro:** mira los cambios desde el último tag, clasifícalos, **propón y confirma** — nunca asumas "menor" porque sea el valor por defecto.
</details>

> [!NOTE]
> 🆕 **La versión es una promesa, no un contador.** El número le dice al consumidor **cuánto riesgo** corre al actualizar: parche = tranquilo, menor = hay cosas nuevas pero lo tuyo sigue, mayor = revisa, algo cambió. Clasificar mal es mentir sobre ese riesgo. Es una decisión de **criterio**: el mismo cambio de código puede ser menor o mayor según **a qué se comprometió** el contrato público.

> 🔍 **¿Lo lograste?** Empaca con `dotnet pack -p:Version=<tu versión>`: los `.nupkg` salen con esa versión de paquete, `AssemblyVersion` `0.0.0.0` y `FileVersion` con el número real. Un consumidor los restaura y **corre sin `FileNotFoundException`**, porque las referencias internas piden el piso mínimo, no una versión exacta inexistente.

---

### El Descubrimiento

Viste el oficio de publicar. `Directory.Build.props` fija la `AssemblyVersion` en `0.0.0.0` para esquivar `dotnet/sdk#12322` (referencias internas a versiones inexistentes → `FileNotFoundException`); la versión real es la del **paquete**, inyectada al empacar. El versionado es **lockstep** (una versión para todo el repo, sin matriz de compatibilidades). Y clasificar el cambio —mayor/menor/parche, sin asumir "menor"— es una decisión de criterio, porque la versión es una **promesa** de riesgo al consumidor. Empaquetar bien es tan de mantenedor como el código.

> [!NOTE]
> 🌱 **Semilla — la prueba del criterio.** Ya entiendes la librería de punta a punta: el dominio, los adaptadores, la tenancy, el empaquetado. Queda **usar** ese criterio en un cambio real: evaluar y aplicar `FetchForWriting` sobre el `MartenEventStore` de la plantilla — el cambio que empezaste el taller para poder hacer con confianza. Es el [Capstone](capstone.md).

---

## ✅ Compruébalo

- [ ] `Directory.Build.props` fija `AssemblyVersion = 0.0.0.0` y explicas qué bug evita (`dotnet/sdk#12322`).
- [ ] Los `.csproj` **no** llevan `<Version>`; la versión se inyecta al empacar (`-p:Version=X`).
- [ ] Explicas el versionado **lockstep** y por qué evita una matriz de compatibilidades.
- [ ] Clasificas un cambio en mayor / menor / parche con la regla, sin asumir "menor".
- [ ] Explicas por qué la versión es una **promesa de riesgo** al consumidor.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué la `AssemblyVersion` se fija en `0.0.0.0`? ¿Qué gana el lockstep? ¿Por qué clasificar el cambio es una decisión de criterio y no un contador automático?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Empaquetar y publicar: el oficio del mantenedor" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Publicar bien la librería es **lockstep** (una versión para todo el repo, inyectada al empacar), con la `AssemblyVersion` fijada en `0.0.0.0` para esquivar `dotnet/sdk#12322`, y **clasificar el cambio** (mayor/menor/parche) como decisión de criterio — porque la versión es una promesa de riesgo al que consume.

---

[⬅️ Volver: Consumir Cosmos.BuildingBlocks](./consumir-cosmos-buildingblocks.md)

[➡️ Siguiente: Capstone — la decisión con criterio](./capstone.md)
