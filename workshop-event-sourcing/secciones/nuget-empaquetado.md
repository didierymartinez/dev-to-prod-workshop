# Empaquetar y publicar como NuGet

Lo que construiste —las abstracciones (`IEventStore`, `AggregateRoot`, los eventos), las utilidades de test (`TestStore`, la base Given-When-Then), las extensiones— no vive en **una** app: es una **librería** que todos los servicios del equipo consumen. Para distribuirla, se empaqueta como **NuGet**. Y empaquetar **varios** paquetes que dependen entre sí tiene una trampa de versiones que vale la pena entender — porque tú la vas a mantener.

## 🎯 El Objetivo

Entender cómo el equipo empaqueta y publica sus librerías: versionado **LOCKSTEP**, el `Directory.Build.props` compartido, y el workflow de publicación.

## El dolor: versionar varios paquetes interdependientes

`Abstractions`, `CritterStack`, `Testing.Utilities`… son paquetes separados que **dependen entre sí**. Si cada uno lleva su propia versión, mantener la matriz de compatibilidad (¿`CritterStack` 2.3 con `Abstractions` 1.9?) se vuelve una pesadilla. La salida del equipo: **LOCKSTEP** — **todos** los paquetes salen con **una misma versión** por release, y un solo tag `v*`. Las dependencias internas se resuelven solas porque comparten versión.

## El `Directory.Build.props` compartido

Una sutileza real (y un bug clásico de .NET): si horneas la versión del paquete en el `AssemblyVersion`, una referencia compilada puede apuntar a una versión de ensamblado que **no existe** en runtime → `FileNotFoundException` ([dotnet/sdk#12322](https://github.com/dotnet/sdk/issues/12322)). La solución del equipo: **desacoplar** `AssemblyVersion` (fijo) de `PackageVersion` (el que sube el release). Vive una vez, en la raíz:

```xml
<!-- Directory.Build.props (raíz): política de versionado para TODOS los proyectos -->
<Project>
  <PropertyGroup>
    <AssemblyVersion>0.0.0.0</AssemblyVersion>
    <FileVersion Condition="'$(Version)' != ''">$([System.Text.RegularExpressions.Regex]::Replace($(Version),'[-+].*$',''))</FileVersion>
  </PropertyGroup>
</Project>
```

Fíjate qué **NO** está aquí: ni `Version` ni `PackageId` horneados. El `PackageId` = el **nombre del proyecto**, y la `Version` la **inyecta el workflow** al empaquetar (`dotnet pack -p:Version=X`). El `.csproj` de cada paquete solo declara sus metadatos (Title, Authors, Description, README, Icon) y sus dependencias — con un detalle clave:

```xml
<PackageReference Include="Marten" Version="..." PrivateAssets="all" />
<!-- PrivateAssets=all: tu paquete USA Marten, pero NO se lo impone como dependencia al consumidor -->
```

La `Linq.Extensions` delega en Marten, pero quien instala tu paquete **no** hereda Marten (lo viste en [Extension members](extension-members.md)). Una **dependencia transitiva** es la que te llega indirecta: algo de lo que dependes a su vez depende de ella. Sin ese atributo, Marten le llegaría así al consumidor. Con `PrivateAssets="all"` cortas esa cadena: usas Marten puertas adentro sin filtrarlo.

## El workflow de publicación

La publicación es **manual** (por `workflow_dispatch`), con versionado LOCKSTEP. La delega a un workflow **reusable de la organización**: un workflow que vive en otro repositorio y que el tuyo invoca con `uses:`, sin copiar los pasos.

```yaml
# release-nuget.yml — disparo manual
on:
  workflow_dispatch:
    inputs:
      bump_type: { type: choice, options: [patch, minor, major], default: minor }
      version:   { description: "X.Y.Z (obligatoria en el primer release)" }
jobs:
  release:
    uses: Cosmos-SincoERP/.github/.github/workflows/_reusable-nuget-publish-batch.yml@v1
    secrets: inherit   # la NUGET_API_KEY viaja por secrets:inherit
```

Y hay un manifiesto, `paquetes-nuget.yml`, que es la **única fuente de verdad** de qué se publica. Lista `package_id` + `project_path` por paquete; los proyectos de test **no** se listan. Vive en la **raíz de `.github/`**, no dentro de `.github/workflows/`, porque es un manifiesto y no un workflow.

> [!NOTE]
> 🌱 **Semilla — esto es el puente al taller de DevOps.** Empaquetar y publicar es **CI/CD**: workflows de GitHub Actions, secretos, versionado, releases. El taller de DevOps lo cubre a fondo (pipelines reutilizables, `secrets: inherit`, entornos con aprobación). Aquí solo necesitas saber **cómo está empaquetada la plantilla** que mantienes: LOCKSTEP + `Directory.Build.props` + `release-nuget.yml`.

---

## ✅ Compruébalo

- [ ] Explicas el versionado **LOCKSTEP** (todos los paquetes una versión por release, un tag) y por qué evita la matriz de compatibilidad.
- [ ] Sabes por qué se **desacopla** `AssemblyVersion` (fijo `0.0.0.0`) de `PackageVersion` (referencias horneadas → fallo en runtime, dotnet/sdk#12322).
- [ ] Sabes que `PackageId` = nombre del proyecto y la `Version` la inyecta el workflow (`-p:Version=X`), no el `.csproj`.
- [ ] Explicas `PrivateAssets="all"`: usas una dependencia sin imponérsela al consumidor (sin filtrarla como **dependencia transitiva**).
- [ ] Sabes que la publicación es manual (`workflow_dispatch`), delegada a un reusable de la organización, con `paquetes-nuget.yml` como fuente de verdad.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué `AssemblyVersion` va fija en `0.0.0.0` y la versión real en `FileVersion`? ¿Qué es LOCKSTEP?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git commit --allow-empty -m "ES · Empaquetar como NuGet" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

La plantilla se distribuye como **varios paquetes NuGet** con versionado **LOCKSTEP** (una versión por release, un tag), un `Directory.Build.props` compartido que **desacopla** `AssemblyVersion` de `PackageVersion` (para evitar referencias horneadas a versiones inexistentes), `PackageId`=nombre-del-proyecto con la versión inyectada por el workflow, y `PrivateAssets="all"` para no filtrar dependencias — todo publicado por un `release-nuget.yml` manual que delega en un reusable de la organización.

---

[⬅️ Volver: El idioma de la plantilla (extension members)](./extension-members.md)

[➡️ Siguiente: Capstone — un bounded context de punta a punta](./capstone.md)
