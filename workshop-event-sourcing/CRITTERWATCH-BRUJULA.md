# 🧭 Brújula — el norte, dónde estamos y hacia dónde vamos

> **Para revisar el rumbo, este es el documento.** No hay una **espina pre-escrita** (una lista de secciones fijada
> por adelantado fue justo lo que volvió la 2ª mitad vieja un "tour", y se borró). Pero eso **no** es ir a ciegas: hay
> un **norte**, un registro de **dónde estamos**, y un **rumbo** (C1) que puedes leer aquí — entendido como
> *posibilidades para saber hacia dónde*, no como un plan a ejecutar. El rumbo se **redibuja** al vivir cada sección.

## El norte (el destino, no una lista de features)

Construir un **monitor propio** —tu propio [Critter Watch](https://critterwatch.jasperfx.net/)— que muestre cómo
**respira** un sistema event-sourced: si los read models van al día o se atrasan, cómo fluyen los hechos, qué falló y
dónde. Es motivación, igual que §1-9 tenía "¿qué le pasó a esta empresa?" — **no** una lista de piezas a implementar en
orden. Cada pieza aparece cuando un **dolor** la reclama, jamás antes.

## Dónde estamos (lo construido, vivido y verificado)

**Fase 1 · El modelo de escritura (en RAM)** — cómo funciona el dominio, antes de pensar dónde se guarda:
- **El motor a mano** (el "patrón oro"): del diario de una empresa a la concurrencia optimista. Event sourcing a pulso.
- **Un acto, dos hechos** (el dolor): una acción que produce dos hechos rompe el modelo "decide devuelve el hecho".
- **El agregado recuerda** (la cura): el agregado se **aplica** cada hecho al decidir y los **acumula**; un solo `Append` los guarda.

**Fase 2 · La persistencia** — que el diario sobreviva de verdad:
- **El diario en disco:** persistir a un archivo; al serializar se pierde el **tipo** del hecho → se guarda el tipo. *(El archivo es lente deliberada, no producción.)*
- **El nombre es un contrato:** el nombre del evento en disco no puede ser el de la clase (renombrar rompe la historia) → nombre estable.
- **Todo o nada:** una caída a mitad de acción deja media acción → el diario se muda a **Postgres a mano** (transacción = atomicidad; `PRIMARY KEY` = concurrencia). *Marten aún NO se nombra.*

**Fase 3 · El lado de lectura** — responder preguntas del negocio:
- **La vista de lectura (read model):** ◀ **estás aquí.** El `SELECT` sobre los eventos miente (dicen lo que pasó, no el estado actual) → una **vista aparte** para consultar. Primera separación lectura/escritura — y el germen de tu Critter Watch.

## Hacia dónde apunta el rumbo (C1) — posibilidades, no espina

El próximo dolor **siempre** nace de vivir el final de la sección anterior (corriendo código y chocando). Lo de abajo
es el rumbo **plausible** que salió de vivir §10-15 y de analizarlo — sirve para que sepas **hacia dónde**, no para
construirlo tal cual. **Si al vivir una sección el dolor real apunta a otro lado, manda el dolor, no este mapa.**

1. **Reconstruir una vista desde la historia** (rebuild/replay): el día que pidan *otra* vista, nace vacía; los hechos para llenarla ya están en el diario → rejugarlos. La proyección es **derivada y desechable**.
2. **Desacoplar el proyector de la escritura:** mantener la vista dentro de cada handler es frágil (el dual-write que ya asomó en §15) → un proceso aparte que sigue el diario por su cuenta.
3. **El rezago:** ese proceso puede quedar **atrás** de las escrituras. "¿Cuánto va atrás la vista?" ← **aquí nace de verdad tu Critter Watch** (el primer panel: el rezago).
4. **Observar más:** qué falló y dónde, el flujo de hechos… (más paneles del monitor), y segmentar por cliente.
5. **Converger a la librería (Marten) POR RECONOCIMIENTO:** cuando estés reconstruyendo a mano proyección + daemon + checkpoints + índices + transacción, reconoces que la librería **ya hace todo eso** —y es la versión atómica y correcta de lo que sufriste—. Se adopta por **alivio**, sobre la **misma** Postgres. *(El caso emblemático del criterio: adoptar —o no— `FetchForWriting`.)*

## El método (por qué es rumbo y no plan)

- **Nunca más de UNA sección por delante.** El tema de la siguiente solo nace del final concreto de la anterior, corrida de verdad.
- **No se nombra la librería (Marten/Wolverine) ni "Critter Watch"** hasta que la cura ingenua choque contra un muro real y la reclame (la convergencia del punto 5).
- **El dolor nace de correr código y chocar** —como en §1-9—, nunca de "quiero la feature X".
- **El dominio se mueve** cuando se pueda (la Empresa gana un verbo/regla): dominio congelado = predictor #1 del "tour".
- **Test antifraude por sección:** *"¿este dolor se podía predecir desde la tabla de contenidos del canon borrado?"* Si sí → está colado, se reescribe.
- **PARAR** al final de cada sección.

> **Cómo revisar el rumbo:** abre este archivo. "Dónde estamos" es el registro real; "Hacia dónde apunta" es la
> dirección (se actualiza al cerrar cada sección). El detalle por sección con código vive en [`MAPA.md`](MAPA.md).
