# Academia Cosmos — la plataforma del taller

Versión "aplicación real" del taller: el alumno cursa **en su máquina** (su editor, su terminal, su repo), y la plataforma acompaña con tres piezas:

1. **Contenido** — lee las secciones del taller directamente de las carpetas `workshop-*` del repo y las sirve como páginas navegables.
2. **Progreso** — cada sección del taller pide un commit con título estandarizado (`ES · <sección>`) y una reflexión en el cuerpo. El alumno hace `git push`; la plataforma lee los commits de su repo en GitHub y los convierte en **eventos** de avance. El push ES el latido.
3. **Validación con IA** — la reflexión de cada commit se evalúa contra el contrato del taller ("verde ≠ entendí"): un modelo lee la sección + la reflexión y emite veredicto (`entendio` / `parcial` / `no_entendio`) con feedback. Además hay un **asistente por sección** que guía sin revelar las soluciones de los retos.

## Dogfood: construida con Cosmos.BuildingBlocks

La plataforma es a la vez el **capstone en vivo** del taller: usa la librería real que el taller enseña a mantener.

| Pieza | Cómo |
|---|---|
| El avance de un alumno | Agregado `Inscripcion` (AggregateRoot) con hechos `AlumnoInscrito`, `SeccionCompletada`, `ReflexionEvaluada` |
| Persistencia | Marten (event store en Postgres) vía `AgregarMartenEventStore()` |
| Comandos | Handlers por convención Wolverine (`UsarWolverineParaComandos`) — sin `SaveChanges` en el handler: el middleware lo hace |
| Tests | `CommandHandlerTestBase` + `TestStore` de la propia librería — 12 tests en verde |

## Proyectos

```
Academia.Contenido   parser de talleres (secciones, cadena ➡️, título de commit, cuerpo sin soluciones)
Academia.Dominio     agregado Inscripcion + comandos + handlers Wolverine
Academia.IA          EvaluadorDeReflexiones (structured outputs) + AsistenteDeSeccion (streaming)
Academia.Tests       dominio (dogfood del TestStore) + parser contra el taller REAL
Academia.Web         Blazor Server: catálogo, lectura de secciones + chat, dashboard de progreso
```

Requiere el repo `Cosmos.BuildingBlocks` clonado como **hermano** de `cosmos-dev-to-prod-workshop` (referencias de proyecto `../../../Cosmos.BuildingBlocks/`).

## Cómo correrla

```bash
# 1. Base de datos (puerto 5433 para no chocar con el Postgres del taller)
cd plataforma
docker compose up -d

# 2. Claves (la IA es opcional para navegar; obligatoria para evaluar/asistir)
export ANTHROPIC_API_KEY=sk-ant-...
export GITHUB_TOKEN=ghp_...        # opcional: sube el rate limit de la API de GitHub

# 3. La app
dotnet run --project Academia.Web
```

Abre la URL que imprime la consola. Flujo: **Home** → inscribirte (identificador + taller + URL de tu repo) → **Progreso** → botón "Sincronizar con mi repo" cada vez que hagas push.

## Los tests

```bash
# xunit v3 + Microsoft Testing Platform en .NET 10: se corre con run, no con test
dotnet run --project Academia.Tests
```

## Qué NO hace (v1, a propósito)

- **No ejecuta el código del alumno.** Solo lee commits y texto: el "verde" lo comprueba el alumno en su máquina, como manda el taller.
- **No hay webhook**: la sincronización es manual (botón). Un `BackgroundService` periódico o un webhook de GitHub son la evolución natural.
- **Un solo tenant** (`TenantFijo`): el multi-tenant llega cuando haya academia multi-equipo — la librería ya lo soporta.
- **No hay listado multi-alumno**: pide el agregado por id (`alumno:taller`). El dashboard global es el caso de uso perfecto para las proyecciones del Bloque D del taller.
