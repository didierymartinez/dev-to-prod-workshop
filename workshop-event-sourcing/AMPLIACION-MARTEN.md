# 🔬 Ampliación de Marten — plan (workshop ④ vs. Cosmos.ControlPlane)

> Documento de trabajo. Nace de cruzar el uso real de Marten/BuildingBlocks en el repo **Cosmos.ControlPlane** (buque insignia) contra la cobertura actual del workshop. Objetivo del usuario (reunión, jul 2026): **manejar Marten a profundidad** ("dominio Marten general") y **alinear versión a 9.12.0**. Inventario producido por workflow `w9z2p2x8z` (7 agentes, matriz de 28 conceptos).

## El reencuadre (lo que cambia la estrategia)

ControlPlane son **6 hosts**: 5 Azure Functions isolated-worker de **escritura** (uno por BC: Billing, UserManagement, TenantProvisioning, TenantManagement, Onboarding) + 1 web ASP.NET Core de **lectura** (Query). Sobre `Cosmos.BuildingBlocks` 2.3.0 (Critter Stack) + **Marten 9.12.0** + Azure Service Bus.

**Hallazgo clave:** la reacción a eventos **entre módulos NO usa subscripciones catch-up de Marten**, sino **topics/subscriptions de Azure Service Bus consumidos por Azure Functions `[ServiceBusTrigger]`** (34 archivos `AcciónWhenEvento`). La **única** subscripción catch-up de Marten en todo el repo es el **async daemon** del read-side (proyecciones). → El workshop enseña a fondo `SubscriptionBase` de Marten (que el flagship usa **1 vez**) y apenas toca el mecanismo real de producción (ASB + Functions, que usa **34 veces**).

**Segundo hallazgo:** el read-side es un **segundo consumidor del MISMO event store** — usa Marten **crudo** (no BuildingBlocks), con **varios stores nombrados** (`AddMartenStore<T>`), cada uno con su daemon, y **debe replicar la config de eventos del write-side** (`StreamIdentity`/`EventNamingStyle`/serializer/`MetadataConfig`) o los eventos **no deserializan**. Esto no está en el workshop y es arquitectónicamente central.

**Tensión con "dominio general":** ControlPlane **deliberadamente NO usa** `MultiStreamProjection`, `FetchForWriting`, ni catch-up de Marten cross-módulo. Enseñar "todo Marten" como si fuera obligatorio diluye el norte v7 ("criterio para mantener"). **Reconciliación propuesta:** enseñar la superficie general **enmarcada como** *"la herramienta ofrece X; el flagship eligió Y — y este es el porqué"*. Sirve a ambos: profundidad general + criterio.

## Realidad de versiones

- Marten línea 9.x; **última estable 9.18.0** (22/7/2026). **9.12.0 existe** (ControlPlane, 29/6/2026). Workshop en **9.2.1**.
- Drift **dentro de la misma major** → bajo riesgo conceptual (todo lo del generador JasperFx.Events, `partial`, Create/Apply, FetchForWriting, daemon = API estable en 9.x).
- Alinear = subir a **9.12.0 + paquetes Cosmos 2.3.0** y **re-correr los spikes** (la verificación real la da el compilador, no el changelog). Sub-decisión: 9.12 (espejo de ControlPlane) vs 9.18 (latest) → recomendado 9.12.

## Plan priorizado

### P1 — alto valor (empezar aquí)
1. ✅ **`proyecciones.md`** — añadir **`ShouldDelete`** (borrar la vista al llegar el hecho terminal; el flagship lo usa para listar solo onboardings en curso) + verificar la variante **`TId=string`** (1:1 con ControlPlane). *Barato, con reto antes de revelar.*
2. ✅ **`daemon-proyecciones.md`** — **`DaemonMode.Solo` (dev) → `HotCold` (prod)**: advisory lock, un daemon activo aunque el servicio escale. Cambio de un enum con motivación real. + nota: por qué **single-stream basta** para el fan-in y no hace falta `MultiStreamProjection` (el flagship no lo usa).
3. ⏳ **(SIGUE) Nueva sección (Bloque D) · "Varios almacenes de lectura"** — la brecha de más valor y **la más difícil** (candidata #1 a repetir la fractura §11 si se hace mal). Dolor tocable: *un solo store no puede leer dos schemas de eventos distintos*; el read-side es un **segundo consumidor** que **debe replicar la config del write-side** o los eventos no deserializan (+ gotcha columnas `42703`). Revelar `AddMartenStore<T>` + marker interfaces + schema de lectura separado. **Rotular config como "idioma nuevo → se muestra".**
4. ✅ **`las-dos-vertientes` + `el-sobre`** — cerrar el momento-criterio de **FetchForWriting** con la respuesta REAL del flagship: **no lo adopta porque serializa las escrituras concurrentes en el bus** (`GroupId=TenantId` → `SessionId` de ASB, ADR-0026). Convierte el capstone en decisión con evidencia.
5. ✅ **`suscripciones.md`** — **nota-brújula**: subscripción catch-up de Marten (dentro del proceso, solo el daemon) vs subscripción de ASB (cross-servicio, 34×). Corrige el modelo mental sin reescribir.

### P2 — medio (tras P1)
6. **`serverless.md`** — patrón `FunctionEndpoint` real: subscription-por-consumidor, **settlement manual** (Complete / DeadLetter / LockLost), idempotencia con **`ExistsAsync`** + política de error por trigger (HTTP lanza / bus retorna silencioso), y Wolverine como mediador+sender (no transporte de entrada).
7. **`el-almacen-abstracto` / `el-almacen-de-la-plantilla`** — alinear la superficie de `IEventStore` con nombres reales (`StartStream`, `GetAggregateRootAsync<T>`, `ExistsAsync<T>`) + gotchas "StartStream **congela** los eventos" y "fija el stream-id antes del Add".
8. **Nueva sección · enrutamiento avanzado en el bus** — correlation filter de igualdad (1 topic, N subscriptions por `applicationBundleId`), clave de enrutamiento en application property (nunca en el body), `GroupId` vs `Headers` ortogonales, discriminante `Subject` en fan-in por sesión. **Vigilar frontera con taller ⑤ Microservicios.**
9. **`publico-privado`** — frontera de serialización: el contrato público es un **record aplanado y portable** (published language), no el evento interno rico; enlaza con `empaquetar-y-publicar` (NuGet). + eventos sin marker (ES puro) + trade-off evento-mínimo-vs-reconstruible.
10. **Evaluar / diferir a ⑤** — **saga como coreografía**: el agregado como process manager fan-out/fan-in single-stream + request-reply async. Decisión de alcance: ¿④ o Microservicios?

### P3 — bajo (pulido / alineación)
11. **Pase de versión** — subir el código verde a **9.12.0 + Cosmos 2.3.0**, re-correr spikes, `/revisar-seccion` sobre cada sección tocada. O dejar el drift como nota explícita.
12. **Notas de bajo costo** — telemetría Marten (`AddSource("Marten")` → enlace a taller ⑥ Observabilidad); gotcha AsyncLocal vs child-scopes de Wolverine (`el-tenant-viaja-con-el-mensaje`); distinción id-de-ruta vs tenant (`de-un-cliente-a-muchos`).

### Sin brecha (dejar como está)
`partial`/Create/Apply (proyecciones.md ya lo cubre a fondo con el gotcha de Marten 9) · `QuerySession`/`Query<T>` LINQ · Conjoined multi-tenancy · el DSL Given/When/Then + TestStore por reflexión (match directo, una de las mejores anclas del taller).

## Riesgos (del inventario)
- **Scope-creep de EDA/infra:** FunctionEndpoint, correlation filters, request-reply, sesiones ASB son **topología difícil de "construir a mano"** → caen en la patología copia-config (§11/§13 del REVISION-ENFOQUE). Mitigar: rotular "se muestra" + anclar en dolor tocable.
- **Frontera de currículo:** saga/process manager/request-reply/correlation filters pertenecen tanto a ⑤ Microservicios y al de EDA como a ④. Meterlos todos en ④ lo infla y pisa talleres siguientes. Decisión por sección.
- **Sobre-enseñar lo que el flagship evita** (MultiStream, FetchForWriting, catch-up cross-módulo) diluye el norte. Mitigar con el framing "menú + elección del flagship + porqué".
- **Version drift no verificado** hasta re-correr spikes contra 9.12.
- **MAPA/NARRATIVA desincronizados** (ya diagnosticado) — ampliar sin re-sincronizar agrava la deriva.
- **La brecha #3 (stores nombrados) es la de más valor Y la más árida** — merece el mayor cuidado narrativo, no solo el mayor tamaño.

## Decisiones abiertas (del usuario)
- **A. General vs criterio:** ¿confirmar el framing "menú + elección del flagship + porqué" para reconciliar "dominio general" con el norte v7? (recomendado)
- **B. Frontera de currículo:** ¿qué temas infra-pesados (saga/coreografía, correlation filters, request-reply, settlement ASB) se quedan en ④ vs se difieren a ⑤/EDA?
- **C. Punto de arranque:** recomendado empezar por los P1 baratos (1,2,4,5) + diseñar con cuidado la sección nueva de stores (3) antes de escribirla.
