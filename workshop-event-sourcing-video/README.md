# 🎬 Videos del taller de Event Sourcing (Remotion)

App de [Remotion](https://www.remotion.dev/) que genera un **video explicativo por cada sección** del taller [`workshop-event-sourcing`](../workshop-event-sourcing/). El foco es **animar el mecanismo del concepto** (su evolución/flujo), no mostrar código estático. Cada video sigue el arco: **portada → 🎯 objetivo → ⚙️ el mecanismo (animado, el centro) → 🔧 el código (beat corto) → 🧠 en una frase**, con la voz y la paleta del taller.

Cada sección anima su mecanismo:

- **§1 el diario vs la foto** — el `UPDATE` que tacha/borra el pasado vs el diario que anexa.
- **§2 el Replay (evolve)** — el stream recorriéndose; cada hecho viaja a `Aplicar`; la `Empresa` muta sus campos dentro de su frontera.
- **§3 el `switch` por tipo** — cada hecho enciende su `case`; el motor `Load` reutilizable en la base.
- **§4 Append / Get** — `Append` mete el hecho en la lista escondida; `Get`→`Load` saca una `Empresa` rehidratada.
- **§5 decidir** — tres caminos: emite ✔ · rechaza (validación) · no-op (idempotencia); decide ≠ apply.

> **Prueba actual:** las **5 primeras** secciones (de `el-diario-de-una-empresa` a `decidir-el-futuro`). El contenido sale fiel de los `.md` del taller.

## Requisitos

- Node 16+ (probado con Node 22). Remotion trae su propio ffmpeg para renderizar — no hace falta instalarlo.

## Cómo correrlo

```bash
cd workshop-event-sourcing-video
npm install          # primera vez (descarga Remotion + un Chromium para render)
npm run dev          # abre Remotion Studio en http://localhost:3000
```

En el Studio (panel izquierdo) verás una composición por sección:

- `s1-el-diario-de-una-empresa`
- `s2-los-primeros-hechos`
- `s3-refactorizando-el-motor`
- `s4-el-flujo-de-vida`
- `s5-decidir-el-futuro`
- `todas-las-secciones` — las cinco seguidas

Le das play para previsualizar. Para exportar a mp4:

```bash
npm run render s2-los-primeros-hechos out/s2.mp4   # una sección
npm run render:todas                               # las cinco en un solo archivo
```

## Cómo está hecho

```
src/
  index.ts            registerRoot
  Root.tsx            una <Composition> por sección (+ la combinada)
  SectionVideo.tsx    ensambla un video: fondo + escenas (Series) + footer
  AllSections.tsx     las 5 secciones seguidas
  scenes.ts           qué escenas tiene cada video y cuánto dura cada una
  SceneComponents.tsx las escenas (portada, objetivo, mecanismo, código, frase)
  theme.ts            paleta, tipografía, colores de sintaxis
  fonts.ts            carga de fuentes (Inter + JetBrainsMono) vía @remotion/google-fonts
  highlight.ts        resaltador de C# (ligero, sin dependencias)
  data/sections.ts    el CONTENIDO de cada sección (texto + código real + mechanism)
  components/
    Background.tsx     fondo con resplandor del color de acento
    Footer.tsx         barra de progreso + pie
    CodeBlock.tsx      ventana de editor; tamaño medido con fitText (@remotion/layout-utils)
    anim.tsx           Scene (fade in/out), FadeUp, Label
    mechanics.tsx      primitivas compartidas de los mecanismos (Slot, Arrow, EventCard…)
    DiarioVsFoto.tsx   §1 · UPDATE borra vs diario anexa
    ReplayFlow.tsx     §2 · el Replay (evolve)
    EngineSwitch.tsx   §3 · el switch que enruta por tipo
    RepositoryFlow.tsx §4 · Append / Get
    DecideFlow.tsx     §5 · decidir (emite / rechaza / no-op)
```

## Buenas prácticas (skill `remotion-best-practices`)

- Animación con `interpolate()` + `Easing.bezier` (no `spring`); propiedades CSS individuales `translate`/`scale` (no strings `transform`) → editables en Studio.
- Fuentes cargadas con `@remotion/google-fonts` (bloquean el render hasta estar listas → render reproducible).
- Tamaño del código medido con `fitText` de `@remotion/layout-utils` (no heurística).
- Layout en `flex` con slots reservados, un mensaje grande por cuadro (video-first).

## Añadir más secciones

Todo es **data-driven**: agrega un objeto a `sections` en [`src/data/sections.ts`](src/data/sections.ts) (con su `objetivo`, `code`, `oneLiner` y opcionalmente `mechanism`) y aparecerá una composición nueva sola — la duración se calcula automáticamente.

Para una sección con mecanismo animado nuevo: crea su componente en `components/` (reusa las primitivas de `mechanics.tsx`), exporta su `*_DURATION`, y enrútalo en `scenes.ts` (`mechanismDuration`) y en `SceneComponents.tsx` (`renderMechanism` + `LABELS`).
