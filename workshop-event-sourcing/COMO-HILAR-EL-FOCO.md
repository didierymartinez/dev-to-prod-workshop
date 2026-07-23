# 🧵 Cómo hilamos el foco — diagnóstico de las 39 secciones + estrategia

> Resultado del barrido de foco sobre **todo** el taller (workflow `wqs2azjx2`, 8 agentes × 5 ejes: empuje/hilo · descubrimiento-vivido · test-del-obvio · criterio · dominio-se-mueve). Amplía y confirma [`REVISION-ENFOQUE.md`](REVISION-ENFOQUE.md) (que solo cubría §9-14). **Objetivo: entender cómo re-hilar el foco — NO reescribir secciones.**

## La forma del foco: **meseta que se inclina, no caída**

- **§1-9 = patrón oro:** los 5 ejes altos a la vez (descubrimiento vivido + "obvio" del alumno + dominio que se mueve en §5 + criterio + empuje). Cadena causal auto-generada dolor→cura→dolor. Es la vara contra la que se mide el resto.
- **§10+ NO rompe el HILO** — el empuje y las semillas se mantienen fuertes casi en todo el arco. **Lo que se inclina es la EMOCIÓN:** descubrimiento pasa de *vivido* a *mixto/inversa*, el "obvio" migra de la boca del alumno a la del autor, y el **dominio se congela** (solo se mueve una vez más, en `el-agregado`).
- **Lo decisivo:** el eje que sostiene la 2ª mitad **deja de ser el DOLOR y pasa a ser el CRITERIO de mantenedor** — pero ese relevo ocurre "por accidente", en semillas de pie de página, **nunca declarado como el nuevo motor**. Por eso se siente tour aunque el criterio esté ahí.
- **Forma fina = bookends:** dentro de cada bloque los extremos son fuertes (manda el criterio o un ancla externa) y el **vientre tambalea** (se reconstruye fielmente la implementación de BuildingBlocks con el "obvio" narrado).
- **Dos pruebas de que el hilado LARGO sí funciona a propósito:** el arco `FetchForWriting` (deuda plantada en §9 → aparcada en el swap → pagada en §18/capstone reconstruyendo la necesidad) y el arco `async` (promesa en conoce-a-marten → cobro en api-inyeccion). **Esos dos son el molde a replicar.**

## El reencuadre (lo que de verdad falla)

**El problema NO es continuidad de hilo** (el empuje entre secciones casi nunca falla). Lo que se degrada es la **EMOCIÓN** (descubrimiento → reconocimiento → adopción) y el **DOMINIO** (congelado). Y el motor **cambia de eje sin avisar** (dolor → criterio).

## Patrones transversales

1. **El motor cambia de eje sin avisar:** bloque A = DOLOR vivido; de B en adelante el motor real es el CRITERIO de mantenedor, pero **nunca se declara** → sensación de tour.
2. **"Dominio solo-infra" = el predictor #1 de la sensación de tour.** Donde la Empresa no gana comportamiento, se lee como catálogo aunque el hilo no se rompa.
3. **El "obvio" migra a la boca del autor** (las NOTE/🆕 aseveran el porqué en vez de dejar que el alumno lo prediga). Correlaciona **1:1** con el veredicto "tambalea".
4. **Ausencia de 🛠️ Inténtalo-tú = tambalea.** Las dos secciones sin ningún Inténtalo (`conoce-a-marten`, `outbox-inbox`) son las que más se sienten tour.
5. **Construcción en reversa desde la respuesta:** el tell más duro no es copiar config — es construir una pieza que **no se puede ejercitar aún** (`el-tenant-viaja`) o recitar arqueología de la plantilla.
6. **Bloques D y H = adyacencia de temario, no cadena de dolor.** Se salvan por anclas EXTERNAS (cierre de §9, siembra de EDA, capstone), no por motor interno.
7. **El criterio fuerte llega como HISTORIA narrada por el autor** (EventoRoutingValidator, WithTenantId): oro y on-norte, pero el alumno lo **lee**, no lo **decide**.

## Secciones críticas

- **[alta] `outbox-inbox` (§26):** cero 🛠️; todo flags mostrados + infra ya montada. El mejor dolor del bloque (dual-write) sin choque vivido.
- **[alta] `conoce-a-marten` (§11):** primera herramienta, única de su bloque sin Inténtalo; el `switch(type)` se asevera ("no lo escribas"). Fija el tono de reconocimiento para toda la 2ª mitad.
- **[alta] `el-tenant-viaja` (§32):** el alumno construye algo que el propio ✅ admite que **no se puede ejercitar aún** — existe porque BuildingBlocks lo tiene.
- **[media]** `el-almacen-de-la-plantilla` (reconstrucción fiel, obvio aseverado), `daemon-proyecciones` (flip de enum + narración sin Inténtalo), `auditoria` (feature que se enciende), `las-dos-vertientes` (dolor reciclado), `el-teststore` (mitad tour).
- **[baja]** `empaquetar-y-publicar`, `consumir-cosmos-buildingblocks`: tours **irreducibles y honestos** (nombres que inventa la librería, MSBuild) — comprimir y cerrar en decisión, no fingir descubrimiento.

## Cómo hilamos el foco (8 movimientos — quirúrgicos, NO reescritura)

1. **Un norte que empuje la 2ª mitad → Critter Watch como artefacto DEL ALUMNO** (mayor impacto). Un tablero propio que crece a lo largo de §10+ (vigila rezago del daemon, tenant, outbox). Cada sección de infra deja de ser "aquí un feature" y pasa a ser "la pieza que **mi** Critter Watch necesita" → convierte adopción/reconocimiento en **ADQUISICIÓN**. Hilo ligero: abre §10 y se retoma en 3-4 secciones clave (daemon, transportes, ui-en-vivo). Ver [`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md).
2. **Promover la lente de criterio de pie-de-página a ESPINA.** Cada §10+ declara UNA decisión que el alumno **registra** (micro-ADR de una línea), incluso las de flip-a-flag (Solo vs HotCold; durable vs inline; SendInline). **Reubicación al encabezado, no reescritura.** Hace explícito el relevo dolor→criterio.
3. **Instituir el test del "obvio" como regla de frontera.** Toda NOTE/🆕 que asevera un porqué se **precede** de un 🔮 predice de una línea que el alumno responde antes. Cambia el **orden**, no el contenido. Ataca `conoce-a-marten`, `auditoria`, `el-almacen`, `api-inyeccion`.
4. **Mantener el dominio moviéndose:** un **verbo nuevo de Empresa por bloque** que USE la infra recién construida (el fix más profundo — el dominio congelado es el predictor #1). Escalonado y **natural, no decorativo** (una regla que necesita la proyección para enforcarse; un comando que produce varios eventos que motiva la acumulación).
5. **Replicar el patrón `FetchForWriting`** para 2-3 deudas más (plantar → aparcar explícito → pagar reconstruyendo la necesidad). Candidatas: idempotencia, el tenant caja-negra. Convierte capacidades sueltas de §18-32 en arcos con motor.
6. **Recaps de hilo en fronteras de bloque** (sobre todo D y H, que son adyacencia de temario): 3-4 líneas al abrir que reafirman el dolor corriente y la decisión que se lleva.
7. **Tours irreducibles:** no fingir descubrimiento — **comprimir** la exposición y **cerrar en decisión o mapeo** (ya lo hacen bien "empareja cada extensión con lo que cableaste", SemVer).
8. **Meter al menos un 🛠️ donde hay cero** (`conoce-a-marten`, `outbox-inbox`): escribir el `switch(type)` a mano UNA vez para sentirlo crecer; levantar el dual-write ingenuo y verlo caer entre paso 1 y 2.

## Riesgos

- **Confundir re-hilar con reescribir.** Los movimientos son de **orden y encuadre**, no de cuerpo (declarar norte, reubicar la caja de criterio al encabezado, anteponer 🔮, añadir un solo 🛠️).
- **Sobre-corregir el dominio:** forzar comportamiento nuevo en secciones legítimamente de infra mete dominio decorativo. El "verbo por bloque" debe nacer de una necesidad real.
- **Criterio-como-colección-de-anécdotas:** cada historia de mantenedor necesita una decisión que el alumno **tome**, o enseña a admirar criterio ajeno, no a ejercer el propio.
- **Critter Watch inflándose** a proyecto paralelo: debe ser un artefacto **ligero** que gana una pieza cada pocas secciones, no una app que compita con el hilo.
- **Plantar deudas que no se pagan** empeora el foco: solo tender deuda nueva si el pago está claramente ubicado.
- **Tours irreducibles:** si el alumno no PODRÍA adivinarlo, no finjas que lo descubre; recórtalo y cierra en decisión.

## Estado / decisión

Diagnóstico + estrategia listos. **Nada reescrito aún** (como pidió el autor). Los 8 movimientos son en su mayoría independientes y quirúrgicos; los de mayor palanca y menor costo: **#1 (norte Critter Watch), #2 (criterio a espina), #3 (test del obvio)**. Pendiente: decidir con el autor por cuál empezar y a qué profundidad.
