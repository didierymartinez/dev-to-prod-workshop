# Lección 6.6 — Migraciones: versionar y evolucionar la base de datos

> ⏱️ 35 minutos · 🎯 **Al terminar:** entenderás qué es realmente una migración y por qué es uno de los conceptos más importantes al trabajar con bases de datos. Lo demostrarás **evolucionando** tu base de datos — agregando un campo nuevo — **sin perder los datos que ya tiene**.

---

## 🤔 El problema

En la lección anterior generaste una migración casi a ciegas, solo para crear la tabla. Pero las migraciones son mucho más que un comando suelto.

Piensa en lo que pasa en la vida real: hoy guardas de cada empresa su NIT, razón social y plan. En un mes, el área comercial pide algo nuevo: *"necesitamos también el correo de contacto de cada empresa"*. Eso significa **agregar una columna** a la tabla `Empresas`… que ya tiene datos guardados (quizás en producción, con cientos de empresas reales).

¿Cómo agregas esa columna **sin borrar** lo que ya está? ¿Y cómo te aseguras de que tus compañeros de equipo tengan exactamente la misma estructura de base de datos que tú? La respuesta a ambas es: **migraciones**.

---

## 💡 Conceptos

### Qué es una migración

Una **migración** es un archivo que EF Core genera para describir un **cambio en la estructura (el "esquema") de la base de datos**: crear una tabla, agregar una columna, cambiar un tipo de dato. Contiene instrucciones para **aplicar** el cambio (y también para revertirlo).

### Las migraciones son "control de versiones" para tu base de datos

Ya conoces Git: guarda la historia de tu **código** en commits, y puedes avanzar o retroceder. Las migraciones hacen lo mismo, pero con la **forma de tu base de datos**:

| Git (para el código) | Migraciones (para la base de datos) |
|---|---|
| Cada **commit** = un cambio en el código | Cada **migración** = un cambio en el esquema |
| La historia vive en el repositorio | La historia vive en la carpeta `Migrations/` |
| Cualquiera recrea el código clonando | Cualquiera recrea la BD aplicando las migraciones en orden |

Por eso la carpeta `Migrations/` **sí se versiona en Git** (a diferencia de `bin/` y `obj/`): es parte de la historia del proyecto.

### Por qué importan tanto

- **Reproducible:** cualquiera puede crear la base de datos desde cero aplicando las migraciones en orden. No hay que pasarse scripts SQL por correo.
- **Evolución sin pérdida:** agregar o cambiar columnas **conservando** los datos existentes.
- **Trabajo en equipo:** cada cambio de esquema queda registrado; nadie tiene que adivinar cómo está estructurada la base.
- **Producción:** así se actualizan las bases de datos reales sin destruirlas ni perder información.

### El ciclo de una migración (tres pasos)

```
1. Cambias el modelo (en C#)           →  agregas una propiedad a Empresa
2. Generas la migración                →  dotnet ef migrations add <Nombre>
3. La aplicas a la base de datos       →  dotnet ef database update (o Migrate() al arrancar)
```

---

## 🛠️ Manos a la obra

### Paso 1: Mirar la migración que ya tienes

Abre en VS Code la carpeta `src/GestionEmpresas.Api/Migrations/`. Verás un archivo cuyo nombre termina en `_Inicial.cs`. Ábrelo y fíjate en su estructura (sin preocuparte por cada detalle):

- Un método **`Up()`** con algo como `migrationBuilder.CreateTable(name: "Empresas", ...)`. Eso es lo que **creó** tu tabla.
- Un método **`Down()`** con `migrationBuilder.DropTable(...)`. Eso es cómo se **revertiría**.

> 🧠 Tú no escribiste ese SQL: EF Core lo **generó** comparando tu modelo `Empresa` con una base vacía. `Up` = aplicar el cambio; `Down` = deshacerlo. Cada migración sabe ir hacia adelante y hacia atrás.

### Paso 2: El negocio pide un cambio — guardar el correo de contacto

Vamos a evolucionar el modelo. Abre `src/GestionEmpresas.Api/Models/Empresa.cs` y agrega una propiedad `Email`:

```csharp
public class Empresa
{
    public string Nit { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Plan { get; set; } = "Básico";
    public bool Activa { get; set; } = true;
    public string? Email { get; set; }        // ← NUEVO: correo de contacto (opcional)
}
```

> 🧠 Fíjate en el `?` de `string? Email`: significa que es **opcional** (puede no tener valor). Es importante: las empresas que **ya existen** en la base no tienen email. Al agregar la columna, en ellas quedará vacía (`null`) — y como es opcional, no hay problema. Si la hiciéramos obligatoria, la migración fallaría al no saber qué poner en las filas existentes.
>
> 💡 `Email` nos sirve aquí para **practicar la migración**: por ahora se guarda en la base pero no se muestra ni se captura en la web. Mostrarlo en el panel (Fase 5) y en el formulario es un buen ejercicio para cuando termines.

### Paso 3: Generar la segunda migración

Pídele a EF Core que detecte el cambio y genere la migración correspondiente. Desde `src/GestionEmpresas.Api`:

```bash
dotnet ef migrations add AgregarEmailEmpresa
```

Abre el archivo nuevo que aparece en `Migrations/` (termina en `_AgregarEmailEmpresa.cs`). Mira su método `Up()`:

```csharp
migrationBuilder.AddColumn<string>(name: "Email", table: "Empresas", nullable: true);
```

> 🧠 **Esto es lo poderoso:** la migración **no recrea la tabla** ni toca los datos. Solo describe la *diferencia*: "agrega una columna Email". EF Core la dedujo comparando tu modelo nuevo con el estado de la migración anterior. Cada migración es un paso incremental.

### Paso 4: Aplicar la migración

```bash
dotnet ef database update
```

Esto ejecuta el `Up()` de las migraciones pendientes sobre tu base de datos real, agregando la columna. (Si en vez de esto arrancas la API, el `Database.Migrate()` del arranque hace lo mismo.)

### Paso 5: Comprobar que los datos NO se perdieron

Este es el momento clave. Mira la tabla directamente con psql:

```bash
docker exec -it empresas-db psql -U appuser -d empresasdb -c '\d "Empresas"'
```
Verás que ahora la tabla tiene la columna **`Email`**. Y ahora mira los datos:

```bash
docker exec -it empresas-db psql -U appuser -d empresasdb -c 'SELECT "Nit", "RazonSocial", "Email" FROM "Empresas";'
```

**Las empresas que ya tenías siguen ahí**, intactas; solo que su `Email` aparece vacío (`null`). Cambiaste la estructura de una tabla con datos **sin perder ni un registro**. Eso, multiplicado por una base de datos de producción con miles de registros, es exactamente por qué las migraciones son tan importantes.

### Paso 6: Versionar las migraciones en Git

Las migraciones son parte de la historia del proyecto: deben ir a GitHub junto al código.

```bash
cd ../..
git checkout -b feat/migracion-email
git add .
git commit -m "agregar campo Email a Empresa mediante migración"
git push -u origin feat/migracion-email    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

> ⚠️ Confirma con `git status` que la carpeta `Migrations/` **sí** se incluye (a diferencia de `bin/`/`obj/`, que el `.gitignore` excluye). Tu equipo necesita esas migraciones para tener la misma base de datos que tú.

---

## ✅ Compruébalo

- [ ] En `Migrations/` hay **dos** migraciones: `Inicial` y `AgregarEmailEmpresa`.
- [ ] La tabla `Empresas` ahora tiene la columna `Email` (`\d "Empresas"` en psql).
- [ ] Las empresas que ya existían **siguen ahí** (no se perdieron), con `Email` vacío.
- [ ] Puedes explicar, con la analogía de Git, por qué una migración es el "control de versiones" del esquema.
- [ ] Sabes el ciclo: cambiar el modelo → `migrations add` → `database update`.

> 💡 **Reto opcional:** mira el archivo de migración `_AgregarEmailEmpresa.cs` y ubica su método `Down()`. ¿Qué hace? (Pista: lo contrario de `Up`.) Eso es lo que permitiría *revertir* el cambio si hiciera falta.

---

## 🧠 Lo que aprendiste

- Una **migración** describe un cambio en el **esquema**; tiene `Up` (aplicar) y `Down` (revertir).
- Las migraciones son el **control de versiones de la base de datos** (como Git para el código) y **se versionan en Git** (carpeta `Migrations/`).
- El ciclo: **cambiar el modelo → `migrations add` → `database update`**.
- Permiten **evolucionar** la base de datos **sin perder los datos existentes** — fundamental en equipo y en producción.

---

## 🆘 Si algo salió mal

**"No changes were detected" al generar la migración.**
No guardaste el cambio en `Empresa.cs` o no agregaste la propiedad `Email`. Guárdalo y reintenta.

**"dotnet ef" no se reconoce.**
Falta la herramienta: `dotnet tool install --global dotnet-ef` (lección 6.5). Abre una terminal nueva.

**Al aplicar dice que la columna ya existe.**
Probablemente ya arrancaste la API y su `Database.Migrate()` aplicó la migración. No es un error: verifica con `\d "Empresas"` que la columna está, y continúa.

**¿De verdad subo la carpeta Migrations a Git?**
Sí. Las migraciones son parte del proyecto y tu equipo las necesita. Solo `bin/` y `obj/` se ignoran.

---

**➡️ Siguiente:** [Comprobar la persistencia](07-comprobar-persistencia.md)
