# 🔬 Revisión pedagógica — ¿el taller se puede hacer solo, y enseña?

> Revisión completa de las 39 secciones (oct 2026). Método: cuatro lecturas "alumno solo, sin facilitador, C# básico" por tramos (§1-9, §10-20, §21-30, §31-39) + una revisión del arco completo. Los errores marcados **✔ verificado** se comprobaron contra el texto.
> Motivo: el taller se ha dictado a dos personas y en ambos casos hizo falta sentarse a leerlo con ellas ("pilotear"), y no hay forma de saber si aprenden o copian.

---

## 1. Veredicto

**Las ideas enseñan; el taller como artefacto no se sostiene solo.** El hilo dolor → cura es bueno, sobre todo en §1-19 (§12 *Verde, y roto* y §24 *La forma del hecho se congela* son modelo). Lo que obliga a pilotear no es la pedagogía de las ideas, sino cinco causas concretas y arreglables:

| # | Causa raíz | Dónde pega más |
|---|---|---|
| 1 | **El estado del código y de la base no se puede reconstruir.** No hay checkpoints; nunca se dice "tu `Program.cs` queda así"; la base y `datos/` arrastran basura entre secciones. | §4-8, §13-18, §22, §27, §29, §33 |
| 2 | **Salidas esperadas que no coinciden con la realidad.** El alumno no puede distinguir "me equivoqué" de "el texto está mal". | §4, §11, §15, §16, §20, §39 |
| 3 | **Guía después de la solución, y retos que no se pueden adivinar.** Lambdas, Npgsql, config de Marten/Wolverine/ASP.NET se piden como reto y solo se explican en el `<details>` o después. | §5, §7, §17-18, §29-35 |
| 4 | **El código del alumno se parte en el swap (§29).** El agregado deja de decidir 9 secciones, varias lecciones se pierden en silencio, y vuelven con otro diseño en §38. | §29 → §39 |
| 5 | **La verificación es autodeclarada.** ✅ = "corre y mira" / "sabes nombrar"; 📓 = "explícalo con tus palabras". Copiar el `<details>` cumple ambos. Nadie (ni el autor) puede distinguir entender de copiar. | Todo el taller |

**Tamaño:** ~62.000 palabras; estimado ~25 h para alguien solo (≈7 sesiones de 3-4 h). De §10 en adelante, casi cada sección tiene **un solo reto grande** entre 1.300 y 2.400 palabras de lectura: si no sale, la única salida es copiar.

---

## 2. Cómo comprobar que aprenden (el problema que más pesa)

Hoy el taller mide *si el código corre*, no *si la persona entendió*. Propuesta, de más barato a más caro:

### 2.1 Predecir antes de correr (barato, alto impacto)
Convertir cada 🔨 y cada ✅ al formato **🔮 predice → ▶️ corre → 🧠 explica la diferencia**. Una predicción escrita *antes* de ver la salida no se puede copiar del `<details>`. Ejemplos que salieron de la revisión:
- §2: *"Antes de correrlo, predice qué imprime si mueves `EmpresaReactivada` al final de `historia`."*
- §5: *"Sin correrlo, ¿cuántos `EmpresaSuspendida` quedan si llamas `Suspender` dos veces sobre la misma instancia?"*
- §11: *"¿Qué pasa si `Append` no llama `MarcarConfirmados()` y haces dos `Append` seguidos? Predice cuántas filas quedan."*
- §15: *"Mueve el `throw` a después del `Commit`. ¿Cuántas filas quedan y qué ve el que llamó?"*
- §18: *"El proceso muere justo antes de `GuardarCursor`. ¿Qué pasa en la próxima corrida? ¿Hay daño?"*
- §32: *"Haz `Inline` la misma proyección: ¿por qué el rezago medido pasa a ser siempre 0?"*

### 2.2 Una pregunta de transferencia por sección (barato)
El 📓 actual se responde parafraseando la sección. Cambiarlo por una **variante que la sección no resuelve**: otro agregado (`Contrato`, `Factura`), otro requisito, otro fallo. Ej. §14: *"Ya hay `plan-cambiado` en disco y el negocio quiere llamarlo `plan-actualizado`. ¿Qué haces?"* — solo quien entendió que el nombre estable no se toca lo responde bien.

### 2.3 Tests de aceptación por hito (medio, el que da evidencia real)
Un proyecto `Empresas.Checks` (xUnit) que el alumno copia a su solución en cada hito: si `dotnet test` pasa, su código cumple. Efecto secundario sano: **obliga a estabilizar nombres y firmas** (`Guardar`, `AbrirStream`, `Emitir`…), que hoy cambian sin aviso.

### 2.4 Checkpoints de código (medio, imprescindible para hacerlo solo)
Una carpeta o rama `checkpoints/` con la solución completa al cierre de cada hito (§2.4 de abajo). Sirve para tres cosas: rescatar a quien se desvió, comparar (`diff`) su código con el de referencia, y arrancar un hito sin haber hecho el anterior.

### 2.5 Autoevaluación por hito + un capstone que evalúa (más caro)
- Al cierre de cada hito: **3 preguntas** (predicción, transferencia, "¿por qué no X?") con respuestas en un archivo aparte.
- **"Rúbrica de sabotaje"**: el facilitador (o un script) borra una línea que carga peso; el alumno predice qué test se pone rojo, o por qué ninguno lo hace. Es la mejor prueba de entendimiento que tiene el método, y ya está latente en los 🔨.
- **Capstone de verdad** (ver §5): un agregado nuevo construido **sin `<details>`**, solo con criterios de aceptación.

### 2.6 Para la próxima vez que lo dictes
Pilotear **observando sin ayudar** durante los primeros minutos de cada atasco y anotar: sección, minuto, si abrió el `<details>`, y la pregunta que hizo. La escala ✅/🟡/🔴 de `MAPA.md` ya existe; conviértela en un formulario por sección. Con dos o tres personas así, tienes un mapa de fricción con datos, no impresiones.

---

## 3. Secuencia

### 3.1 Lo que funciona
§1-19 es una cadena honesta: cada dolor sale del final de la anterior. Los mejores momentos: el huérfano que "no revienta, miente" (§11), el test verde sobre motor roto (§12), el rename que rompe la historia (§14), el rezago que rompe una invariante (§19).

### 3.2 Problemas de arco (prioridad alta)
1. **El swap (§29) parte el código del alumno.** `Empresa` deja de heredar `AggregateRoot`; de §30 a §37 los handlers hacen `session.Events.Append` directo, **saltándose las reglas** de §5/§10; en §38 `AggregateRoot` reaparece como si fuera nuevo y con otra semántica (`Emitir` ya no aplica, contra el núcleo de §11). **Propuesta:** en §29 conservar el agregado y presentar ahí `MartenUnitOfWork` como sustituto directo de `EventStream`; que los handlers carguen el agregado y le pidan la decisión. §38 pasa a ser "extraer a librería", no "reconstruir".
2. **El dolor del capstone lo fabrica el propio taller.** §29 dice que la concurrencia queda "integrada, hoy"; §38 usa un `Append` sin versión; §39 cobra esa regresión como "deuda de §9". **Propuesta:** que el 🔨 de §29 muestre que `AggregateStreamAsync` + `Append` pierde el `_version` de tu `EventStream`, y curarlo ahí con `FetchForWriting` (o sembrarlo con honestidad).
3. **Lecciones que se pierden en silencio en el swap:** el nombre estable (§14) no se lleva a Marten; el upcaster (§24), la unicidad del NIT (§23), la bandeja (§26) y la vista `pagos` (§25) desaparecen. Borrar la tabla `eventos` borra la historia, contra "nunca reescribir el pasado". **Propuesta:** en §29, una tabla **se borra / se conserva / se rompe hasta §N** con una fila por pieza.
4. **Host y DI se usan (§30, §32) antes de enseñarse (§33).** **Propuesta:** mover §33 justo detrás de §29.
5. **Dos de los tres "hilos" de `SECUENCIA.md` no existen en las secciones:** "desde §12 cada choque se fija en un test" (solo §12 tiene tests; no hay arnés contra Postgres) y CosmosLens en §19/20/32/35 (solo aparece en §36, sin URL ni comando). `DECISIONES.md` deja de aparecer tras §21. O se construyen (fixture de tests contra el Postgres de §15) o se quitan de `SECUENCIA.md`.

### 3.3 Costuras débiles (dolor que el alumno no siente)
- §6: "una clase por comando" se justifica con el despachador que aún no existe (y §7 admite que un handler puede cumplir varias interfaces).
- §7: se motiva con "el comando llega por HTTP", 26 secciones después.
- §9: el dolor hace `Append` a mano saltándose el agregado, y lo llama "actualización perdida" cuando nada se pierde. El dolor real es `CambiarPlan` sobre estado viejo pasando la guarda.
- §22: "la suite arranca Postgres y tarda minutos" — esa suite no existe.
- §34 y §38: el tablero de Operaciones y el segundo agregado son hipotéticos.
- §3/§4: `AggregateRoot` y el genérico se justifican con una `Factura` que nunca se construye. **Arreglo barato:** que la `Factura` exista como reto mínimo.

### 3.4 Fusionar, partir, mover
- **Fusionar:** §10+§11 · §13+§14 · §17 dentro de §18 · §36 dentro de §32 · §37 como cierre de §39 · §6 con §7.
- **Partir:** §2 (≈11 conceptos) · §5 (emitir / reglas+idempotencia) · §7 (o añadir antes una 🆕 de lambdas y delegados) · §15 (levantar Postgres / transacción + pruebas) · §27 (crear proyecto `Dominio` / contrato) · §29 (instalar Marten en paralelo / retirar lo hecho a mano con inventario) · §34 (SSE / serverless como lectura).

### 3.5 Núcleo + ramas opcionales
**Núcleo (~20 unidades, hacible solo):** §1 · 2 · 3 · 4 · 5 · 6+7 · 8 · 9 · 10+11 · 12 · 13+14 · 15 · 16 · 17+18 · 19 · 26 · 29 · 33 (movida) · 30 · 32 · 39 (capstone nuevo).

**Ramas opcionales:**
- B · Criterio de diseño: §21 → 22 → 23 → 24 → 27
- C · Read-side avanzado: §20, 25
- D · Mensajería a fondo: §28, 31
- E · Servicio: §34, 35
- F · Mantenedor: §36, 37, 38

### 3.6 Hitos (una sesión cada uno: checkpoint de código + autoevaluación)
| Hito | Tras | Qué tiene el alumno | ≈ |
|---|---|---|---|
| 1 | §5 | Agregado en memoria que decide | 3 h |
| 2 | §12 | Motor de escritura + primer test | 4 h |
| 3 | §15 | Diario en Postgres, transaccional | 3 h |
| 4 | §19/20 | Read-side con proyector y rezago | 3,5 h |
| 5 | §28 | EDA a mano hasta el muro | 4 h |
| 6 | §32 | Marten + Wolverine + daemon | 4 h |
| 7 | §39 | Servicio + plantilla + capstone | 3,5 h |

---

## 4. Erratas concretas (bloquean a quien va solo)

**✔ verificado** = comprobado contra el texto en esta revisión.

| § | Error | Arreglo |
|---|---|---|
| 1 | `git push -u origin main` falla si la rama es `master` o no hay `user.name`. | `git branch -M main` + configurar identidad. |
| 2 | "Pruébalo" con `evento.Plan = "Premium"` deja el proyecto sin compilar y no se dice que hay que borrarlo. | "Verás CS8852; bórralo." |
| 4 | ✔ verificado: el ✅ promete error al quitar `public Empresa() { }`, pero es el único constructor y C# genera uno por defecto: **sigue compilando**. | Dejar un constructor con parámetro, o quitar el ✅. |
| 5 | `var hecho` se redeclara (CS0128); "vuelve a correr el demo" mete `null` al diario antes del aviso; la 🆕 del constructor primario está dentro del `<details>`. | Foto de `Program.cs`; mover el `if (hecho is not null)` y la 🆕 antes. |
| 7 | Lambdas, `Action<object>`, `typeof`/`GetType` se piden en el reto y se explican después de la solución (l.176). | 🆕 antes del reto. |
| 8 | Al cambiar el constructor de `EventStream`, todo el código suelto de §4-7 deja de compilar sin aviso; el demo suspende `emp-7` sin registrarla. | Bloque "tu `Program.cs` completo ahora". |
| 11 | ✔ verificado: el 🔨 promete `ConcurrencyException`, pero `_version = n` hace que los duplicados entren en n+1…2n, posiciones libres: **la historia se duplica en silencio**. | Corregir el resultado esperado (y es mejor lección: "duplica sin error"). |
| 13-14 | Los `.log` viejos rompen la lectura con el formato nuevo (`Tipo = null` / `KeyNotFoundException`). | Paso explícito "borra `datos/`". |
| 15 | Siembra incondicional: la segunda corrida revienta; la Prueba 2 termina el programa y la 3 nunca corre. | Siembra idempotente o `TRUNCATE` al inicio; `try/catch` por prueba. |
| 16 | La salida esperada omite `emp-7`, que viene de §15; "borra las dos tablas" sin comando. | Script de estado limpio por sección. |
| 17-18 | `Exec(params (string, object)[])` y las tuplas aparecen sorpresa; `LeerCursor`/`HechosDesde`/`GuardarCursor` solo como comentarios; "vacía las tres tablas" borra el checkpoint. | Dar los helpers completos o una 🆕 "lectura con Npgsql". |
| 20 | `checkpoint = 1` en la salida contradice el código de §18 (el cursor solo se guarda al final). | Recalcular con el código real. |
| 22, 27 | ✔ verificado: el proyecto `Dominio` nunca se crea (el alumno tiene `Empresas.Historia`). | Paso "crea/renombra `Dominio`" con comandos. |
| 26 | El doble ignora los anuncios, contra la regla de §22 ("el doble debe fallar donde producción falla"). | Que los acumule, o justificar la excepción. |
| 29-33 | ✔ verificado: en todo el taller hay **un solo** `dotnet add package` (Npgsql). Marten, WolverineFx, WolverineFx.Marten, Hosting y el SDK web nunca se instalan con un comando. | Comandos con versión en §29, §30, §33. |
| 30 | El 🔨 "lanza después de cascadear, antes del commit" no se puede hacer (cascadear = devolver); la entrega async hace que `MundoExterno.Recibidos` pueda estar vacío. | 🔨 reproducible + espera observable. |
| 31 | `CobrarMulta` y `cadena` aparecen sin definirse; no se muestra cómo simular la reentrega. | 3 líneas: `var env = new Envelope{…}; Handle(m, env); Handle(m, env);` |
| 34 | ✔ verificado: `static readonly Channel<string> _canal = …` **no compila** como sentencia suelta en `Program.cs`. | `public static class Canales { … }` y nombrar el productor. |
| 36 | CosmosLens: "lo descargas y lo corres" sin URL ni comando; `wolverine_dead_letters` siempre vacía. | Enlace + 🔨 que provoque un dead-letter. |
| 38 | ✔ verificado: "escribe `AggregateRoot` base" como si fuera nuevo, con otra semántica de `Emitir`. | Ver §3.2-1. |
| 39 | "hechos → 3" debería ser 4 con el estado de §38; "closure" sin definir; "test" sin `Assert.Throws`. | Corregir conteo; 🆕 de closure. |

**Patrón detrás de casi todas:** el texto se escribió y revisó sección a sección, pero **nadie corrió el taller entero de punta a punta** con el código acumulado. Un solo recorrido del `verificador-e2e` (o tuyo), generando los checkpoints de §2.4 en el camino, caza la mayoría.

---

## 5. El capstone

Hoy §39 es un retrofit guiado de ~10 líneas con solución desplegable: no integra outbox, daemon, idempotencia, host ni tenancy, y no cumple lo que promete el README ("reconstruye un dominio de punta a punta").

**Propuesta:** un agregado nuevo, `Contrato` (`Firmar`, `Renovar`, `Cancelar`; regla "no renovar cancelado"), **sin `<details>`**, solo con criterios de aceptación verificables:
1. Hereda la plantilla; tests de reglas con el doble.
2. `POST /contratos/{id}/renovar` → handler con UoW + `FetchForWriting`; test de conflicto con `Assert.Throws`.
3. Cascadea `ContratoRenovadoV1`; consumidor idempotente.
4. `VistaContratos` por el daemon; rezago medido por SQL.
5. Tenant obligatorio.
6. Un comentario de síntoma en una línea silenciosa.

Entrega: el repo + un 📓 que justifique cada decisión + la rúbrica de sabotaje. **Esto sí es la evaluación final** que hoy falta.

---

## 6. Documentos de cabecera

- `MAPA.md` está obsoleto: dice que solo existen §1-9 y que "la segunda mitad se borró". Regenerarlo desde `SECUENCIA.md`.
- `README.md` promete *Aggregate Handler Workflow*, "testing sin mocks" y un "mediador" que no se enseñan, y describe un capstone que no es el real.
- `taller.md` y `NARRATIVA.md` hablan de un "servicio multi-tenant" que §35 deja como "spike aparte, no lo cablees".
- Los README de `workshop-event-sourcing-code` y `-video` describen un arco viejo (36 secciones, TestStore, RabbitMQ, NuGet).
- Hay 25 documentos de trabajo en la raíz (PLAN, PLAN-DE-OBRA, REPLANTEO v7, COMO-HILAR v8…). Para quien llega, la fuente de verdad no es obvia: mover los superados a `_archivo/`.

---

## 7. Plan de trabajo sugerido (por impacto / esfuerzo)

1. **Correr el taller de punta a punta y publicar checkpoints** por hito (corrige las erratas de §4 en el camino). → resuelve la causa 1 y 2.
2. **Arreglar el swap (§29)**: conservar el agregado, tabla se-borra/se-conserva, paquetes con versión, mover §33 detrás. → causa 4.
3. **Pasar todos los ✅/🔨 a predice → corre → explica** y reemplazar el 📓 por una pregunta de transferencia. → causa 5 (barato).
4. **🆕 antes del reto** donde hoy está después (§5, §7, §17-18, §39) y, desde §29, cambiar los "retos" de configuración por **"te lo muestro → tú haces una variante"**. → causa 3.
5. **Tests de aceptación por hito** + 3 preguntas de autoevaluación por hito. → causa 5 (evidencia real).
6. **Capstone `Contrato`** sin solución. → evaluación final.
7. Fusiones/particiones de §3.4 y núcleo + ramas de §3.5.
8. Regenerar `MAPA.md`, alinear `README.md`, archivar documentos superados.
