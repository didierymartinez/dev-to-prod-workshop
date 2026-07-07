# Taller: Event Sourcing con la Critter Stack (Marten + Wolverine)

Aprende a modelar tu sistema con **eventos** —hechos que se anotan y nunca se borran— en lugar de filas que se sobrescriben, y vuélvete experto en la **Critter Stack** (Marten + Wolverine), el dúo de C# para event sourcing y mensajería más productivo de .NET.

El hilo es **la misma `Empresa`** del taller básico: allí era una fila que se actualizaba (CRUD); aquí la reimaginas guardando su **historia** completa, y construyes —pieza por pieza, con tus manos— el motor que la sostiene.

> No necesitas haber hecho el básico, pero sí **saber programar en C#**. Lo que el event sourcing exige del lenguaje se va descubriendo **cuando un problema lo pide**, no en una clase de teoría aparte.

---

## Cómo se aprende aquí: por descubrimiento

Esto **no es un libro** que explica y te pide copiar. Es una guía que te lleva paso a paso a **deducir** cada idea construyéndola:

```
🟢 escribes la solución ingenua que ya sabes
💥 topas con su límite (crece feo · se repite · no se puede probar · borra el pasado)
🔧 la evolucionas — y ese refactor revela el siguiente dolor, y el siguiente…
🏷️ recién entonces le ponemos el nombre que la industria le da
```

El **código es el protagonista**: aprendes mirándolo cambiar entre un bloque y el siguiente. Cuando más adelante adoptemos Marten y Wolverine, los **reconocerás** — porque ya habrás construido a mano lo que hacen, y sabrás por qué hacían falta.

## ¿Qué vas a lograr?

- Entender **por qué** y **cuándo** usar event sourcing (y cuándo **no**).
- Construir un **motor de eventos a mano** y luego ver que las librerías hacen exactamente eso, sobre PostgreSQL.
- Separar lectura y escritura con **CQRS** y **proyecciones**; desacoplar con un **mediador**; entregar mensajes sin perder ninguno (**outbox**).
- Dominar la **Critter Stack** combinada: el *Aggregate Handler Workflow*, testing **sin mocks**, evolución de eventos, multi-tenancy.
- Quedar capaz de **abrir la base sobre la que se construyen los proyectos del equipo** —su fundación de Marten + Wolverine— y entender cada pieza, mantenerla y estar al día con la documentación.

## Cómo está organizado

Es una **secuencia de secciones cortas** (`secciones/`) que se leen en orden: cada una arranca con una pregunta concreta del negocio, evoluciona el código hasta un patrón, y siembra la siguiente. El método está en [`METODO.md`](METODO.md); el **arco completo** —lo ya construido y lo planeado (v7, alineado a `Cosmos.BuildingBlocks`)— y el **mapa por sección** (qué construyes, qué aprendes, a qué pieza real converge) están en [`MAPA.md`](MAPA.md) — útil también para **autocalificarte** mientras avanzas.

> 📖 **¿Prefieres verlo primero como una sola historia?** [`NARRATIVA.md`](NARRATIVA.md) cuenta el taller completo **de corrido** —de la empresa con amnesia al motor entero que resulta ser la plantilla del equipo—, hilando cada descubrimiento como relato y **sin código**. Buen panorama antes de construir, o repaso después. (Para retos y código, sigue siendo el `MAPA.md` y las secciones.)

El camino, a grandes rasgos: **el diario vs la foto** → construir el motor a mano (hechos, replay, agregado, almacén, decisiones, comandos) → **persistir de verdad** (PostgreSQL) → **adoptar Marten + Wolverine** entendiendo qué reemplazan de lo tuyo → CQRS y proyecciones, mensajería fiable, el Aggregate Handler Workflow, versionado, testing → y un **capstone** que reconstruye un dominio de la `Empresa` de punta a punta.

## Prerequisitos

- **Saber programar en C#** (variables, clases, control de flujo). El taller básico u otro equivalente basta.
- **.NET 10 SDK** (usamos C# 14). Nada más por ahora: las herramientas que necesiten instalación (Docker para PostgreSQL, un broker de mensajes) se traen **cuando un problema las pide**, no antes.
- **Git + una cuenta de GitHub** — llevarás tu progreso como una **bitácora** de commits (ver abajo).

> 💰 **Costos:** el taller corre **local** (PostgreSQL y el broker se levantan en Docker, sin costo) hasta donde llega; lo que costaría dinero en la nube se trata aparte.

> 📓 **Tu bitácora en Git/GitHub.** Cada sección cierra con un bloque **📓 Registra tu avance**: un `commit` (+ `push`) que deja tu paso en el repo. La sección te plantea una **pregunta o un reto** (💭, p. ej. *"¿qué pasa si intentas `evento.Plan = 'x'`?"*) y **tú escribes la respuesta, con tus palabras, en el mensaje del commit** — no se copia un comando hecho: reemplazas un placeholder con lo que entendiste. Así tu GitHub queda como el diario de lo que aprendiste, muy en el espíritu del taller. El primer commit (crear el repo) está en [El diario de una empresa](secciones/el-diario-de-una-empresa.md).

---

**➡️ Empieza en:** [`secciones/el-diario-de-una-empresa.md`](secciones/el-diario-de-una-empresa.md)
