# 🎞️ Evolución del código — Event Sourcing (Remotion)

Video de **solo código** que muestra cómo el código del taller **se transforma** paso a paso, con un **diff animado**: las líneas que se van **colapsan** (rojo `−`), las nuevas **crecen** (verde `+`) y las que quedan permanecen en su sitio.

Cubre **todo el taller** — **85 pasos de las 36 secciones** (~6.7 min): `record` de eventos → Stream → `foreach`+`if` → **`switch`** → `AggregateRoot` base → `EventStream<T>` → `decide`/validación → Command Handler → despachador → almacén+concurrencia → async → DI → `Raise`/uncommitted → `Apply(T)` público → `Version` → `IEventStore` → **Marten** → **Wolverine** → codegen → público/privado → outbox → RabbitMQ/ASB → CQRS → upcasting → multi-tenancy → TestStore → Given-When-Then → extension members → NuGet → **reveal a `Cosmos.BuildingBlocks`**.

## Correr

```bash
cd workshop-event-sourcing-code
npm install
npm run dev          # Remotion Studio
npm run render:evo   # exporta out/evolucion.mp4
```

## Cómo está hecho

- `src/steps.ts` — las versiones del código (cada paso, una versión completa). **Editas aquí para cambiar/añadir pasos.**
- `src/CodeEvolution.tsx` — el animador: calcula el diff (LCS por líneas) entre pasos y anima colapso/crecimiento + resaltado.
- `src/highlight.ts` — resaltador de C#. `src/theme.ts` / `src/fonts.ts` — paleta y fuentes (Inter + JetBrains Mono).

Una sola composición: `evolucion-del-codigo`. 1920×1080@30.
