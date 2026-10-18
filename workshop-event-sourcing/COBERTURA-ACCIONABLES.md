# 🧭 Cobertura de los accionables en el taller

## Estado final (18-oct-2026)

El plan de este documento está hecho. Esta sección dice cómo quedó; todo lo que viene después es el plan tal como se
escribió.

> ⚠️ **La numeración §N del resto del documento es la del plan**, la cadena de 45 posiciones de cuando se escribió, no la de
> hoy. Para traducirla: §1–§23 no cambian; §24→26, §25→27, §26→28, §27→29, §28→30, §29→31, §30→32, §31→33, §32→34,
> §33→36, §34→37, §35→38, §36→39, §37→40, §38→43, §39→44, §40→54, §41→55, §42→60, §43→63, §44→64 y §45→69. Las
> referencias `archivo:línea` también son de entonces. La numeración vigente está en [`SECUENCIA.md`](SECUENCIA.md).

### La cadena final: 70 posiciones

El plan tenía 59. Hay 11 más porque diez propuestas se partieron, por el tope de ~250 líneas por sección (contando código)
que fijó el usuario: una sección que pasaba de ese largo se partió en dos o tres posiciones, cada una con su propio dolor y
su cura, en vez de crecer. Ninguna sección existente cambió de orden relativo.

| Propuesta | Quedó en |
|---|---|
| N1 · El árbol de empresas | 24 [El árbol de empresas](secciones/el-arbol-de-empresas.md) · 25 [La rama entera](secciones/la-rama-entera.md) |
| N6 · Lo que acabas de pedir | 46 [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) · 47 [La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md) |
| N9 · Dos hosts, una configuración | 50 [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) · 51 [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) |
| N10 · El broker de verdad | 52 [El broker de verdad](secciones/el-broker-de-verdad.md) · 53 [Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md) |
| X41 · El contexto que falta | 55 [El contexto que falta](secciones/el-contexto-que-falta.md), reescrita: ya no es un spike aparte, la tenancy se cablea al servicio · 56 [Probar que aísla](secciones/probar-que-aisla.md) |
| N12 · El trabajo que nadie pidió | 58 [El trabajo que nadie pidió](secciones/el-trabajo-que-nadie-pidio.md) · 59 [El cobro de cada tenant](secciones/el-cobro-de-cada-tenant.md) |
| X42 · Observar el motor nuevo | 60 [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) · 61 [Que el servicio avise](secciones/que-el-servicio-avise.md) |
| X44 · La plantilla | 64 [La plantilla](secciones/la-plantilla.md) · 65 [La plantilla se prueba](secciones/la-plantilla-se-prueba.md) · 66 [El README que compila](secciones/el-readme-que-compila.md) |
| N14 · La plantilla dentro del handler | 67 [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) · 68 [Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) |
| X45 · El capstone | 69 [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) · 70 [La versión que vio el usuario](secciones/la-version-que-vio-el-usuario.md) |

### Las cifras finales

| | completa | parcial | ninguna | total |
|---|---|---|---|---|
| Seguridad (S1–S3) | 3 | 0 | 0 | 3 |
| Librería (L1–L7) | 6 | 1 | 0 | 7 |
| Transversales (T1–T6) | 6 | 0 | 0 | 6 |
| Por repositorio (147) | 129 | 18 | 0 | 147 |
| **Total** | **144** (88 %) | **19** (12 %) | **0** | **163** |

Al planear eran 10 completos, 136 parciales y 17 sin cobertura. Hoy cada uno de los 163 ids tiene al menos una sección donde
el alumno vive el patrón, comprobada con `grep` sobre `secciones/`: la matriz del final lo dice en la columna **Dónde se vive
hoy**.

### Los 19 parciales, y por qué

| Id | Lo que sí se vive | Lo que falta, y por qué |
|---|---|---|
| Cosmos.EstructuraOrganizacional#8 | En [La rama entera](secciones/la-rama-entera.md), la inactivación se decide contra el diario del grupo, y cada filial nueva valida a su matriz. | El "tope explícito" de la cascada se descartó: con la cura, un solo hecho en el stream del grupo, no queda una transacción larga que acotar. |
| L5 · Cosmos.ControlPlane#6 · Cosmos.Impuestos#8 · Cosmos.Asistente#3 · Cosmos.Contabilidad#4 · ObligacionesPorPagar.Radicacion#7 · Cosmos.Terceros#3 · Cosmos.EstructuraOrganizacional#4 | El rearmado ensayado, en [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md): una orden de la librería (`RebuildProjectionAsync`), un test que la ensaya y el procedimiento en `DECISIONES.md`. ControlPlane#6 tiene cerrada además su parte de "un solo dueño del DDL", y Terceros#3 su `HotCold`, en [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md). | La versión de la proyección (`ProjectionVersion`) para rearmar lado a lado: ningún dolor vivible con el juguete. El spike mostró que `Version = 2` crea otra tabla y otro shard, el daemon la arma desde cero, y el rezago sigue mirando el shard viejo. EstructuraOrganizacional#4 se sumó a este grupo al revisar con `grep`: también pide esa versión. |
| ObligacionesPorPagar.Radicacion#8 | Cada host declara su papel, en [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md). | `DurabilityMode.MediatorOnly`: el juguete no tiene un host que solo consulte. El spike está hecho: en ese modo, un handler que devuelve un mensaje lanza. |
| ObligacionesPorPagar.Reconocimiento#6 | Un solo dueño del esquema, en [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md). | Ningún host del juguete apunta a otro esquema. |
| ObligacionesPorPagar.Notificaciones#4 | Una sola ruta por mensaje, en [Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md). | El handler idempotente del consumidor se explica (la llave sería el NIT con la versión), no se construye. |
| Cosmos.Contabilidad#1 | El reset solo en Development, con un valor que lo prende, en [El host y la inyección](secciones/el-host-y-la-inyeccion.md); con la política por defecto de [El tenant viene firmado](secciones/el-tenant-viene-firmado.md), además pide token. | El "tenant desechable" se quitó: era una idea que ninguna sección construía. |
| Cosmos.BuildingBlocks#6 | El riesgo, explicado en [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md). | `Task.WhenAll` sobre el bus no se vive: en el spike, veinte publicaciones a la vez dentro de un handler salieron bien las veinte; solo falla con `Task.Run`. |
| ObligacionesPorPagar.Integraciones#1 | Lo pendiente queda `EnCurso`, como criterio, en [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md). | La respuesta vacía del socio no se vive. |
| ObligacionesPorPagar.Integraciones#9 | El log lleva ids y no el payload, en [Seguir una acción](secciones/seguir-una-accion.md). | La bandera explícita de diagnóstico no se construye. |
| Cosmos.DatosReferencia#4 | El commit lo da Wolverine, en [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md), y la atomicidad del hecho con su documento se comprueba a mano. | Ningún test fija esa atomicidad. |
| Cosmos.Direcciones#2 | La réplica falla en vez de responder vacío, en [La réplica suscrita](secciones/la-replica-suscrita.md). | El health check de readiness de la réplica no se construyó. |
| ObligacionesPorPagar.Entradas#3 | El disparo aparte del trabajo y el cron con un agente único, en [El trabajo que nadie pidió](secciones/el-trabajo-que-nadie-pidio.md); la próxima vuelta se lee en el esquema, en [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md). | El observador de "no hay próxima vuelta" vive como consulta, no como health check. |

### Cerrados de otra forma que la propuesta

- **L3 y Cosmos.BuildingBlocks#7**: con `Apply` públicos y un test de contrato doble-contra-Postgres, en [La plantilla se prueba](secciones/la-plantilla-se-prueba.md), no buscando los `Apply` con `NonPublic`. Marten 9 solo llama los públicos, y un doble que ve los privados da verdes falsos.
- **ObligacionesPorPagar.Radicacion#4**: en Marten 9.50.3 hay un solo tipo de choque; el patrón sigue siendo la política sobre la base `JasperFx.ConcurrencyException`, con su nombre completo ([Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md), [El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md)).
- **ObligacionesPorPagar.Integraciones#6**: se cerró en [El broker de verdad](secciones/el-broker-de-verdad.md), con un record `CredencialesDelBroker` validado al arrancar.
- **Cosmos.Impuestos#4** (la propuesta X38): `VistaSuspendida` no se retira, gana lector (`GET /empresas/suspendidas`). Asignar el `Id` en un `Apply` no rompe nada en 9.50.3, porque Marten impone la identidad: solo miente.
- **Cosmos.Asistente#10**: el flag global que una copia de la configuración no tiene se vive con `CorrelationIdEnabled` (un worker sin él borra la columna `correlation_id` de `mt_events`), no con el flag de las fechas, en [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md).

### Lo que el trabajo encontró, y el taller ahora enseña

No estaba en la auditoría:

- `UseIdentityMapForAggregates`, que Marten 9.50.3 trae encendido: con un snapshot `Inline` y `FetchLatest` o `FetchForWriting`, un verbo que hace `Apply(h); Emitir(h)` aplica el hecho dos veces ([La plantilla](secciones/la-plantilla.md)).
- `[JsonInclude]` en un campo `readonly` se guarda, pero no se relee ([El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md)).
- Un host sin `CorrelationIdEnabled` borra la columna `correlation_id` de `mt_events` ([Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md)).
- Una ruta a RabbitMQ envía en el momento, sin bandeja: sin `UseDurableOutbox()`, el anuncio se pierde con el broker caído ([Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md)).
- Un tenant ausente llega como `*DEFAULT*`, no como null ([El contexto que falta](secciones/el-contexto-que-falta.md)); y un `UniqueIndex` es de todos los tenants salvo `TenancyScope.PerTenant` ([Probar que aísla](secciones/probar-que-aisla.md)).
- La `ConcurrencyException` propia del alumno, de [Concurrencia optimista](secciones/concurrencia-optimista.md), tapa la de JasperFx cuando se escribe el nombre corto ([Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md)).
- Wolverine escribe el record entero en el log cuando falla una invocación ([Seguir una acción](secciones/seguir-una-accion.md)).

Las correcciones a [`ACCIONABLES-APPLICATION-PLANE.md`](ACCIONABLES-APPLICATION-PLANE.md) que salieron de los spikes ya están
anotadas en su encabezado: los `Apply` privados (L3 y BuildingBlocks#7), el tipo de excepción en `Rich` (Radicacion#4), el
hueco de secuencia que no dejan los choques, y que un `finally` no salva la cadena del trabajo recurrente (Entradas#3).

### Qué cambió en el resto de este documento

Nada del plan se reescribió. La [matriz completa](#la-matriz-completa) ganó dos columnas, **Final** y **Dónde se vive hoy**, y
[La cadena resultante](#la-cadena-resultante) ganó la **Posición final** de cada posición del plan.

---

> **Qué es.** Este documento responde una pregunta: ¿dónde aprende el alumno el patrón correcto de cada accionable de
> [`ACCIONABLES-APPLICATION-PLANE.md`](ACCIONABLES-APPLICATION-PLANE.md)? El taller no arregla los repositorios. Enseña la forma
> correcta, desde la comprensión, para que nadie vuelva a crear el antipatrón. Cada patrón entra en la cadena donde nace su
> dolor: el alumno lo rompe en su propio código y después lo cura. No hay un módulo aparte de seguridad, de HTTP ni de
> integraciones. La cadena sigue siendo una sola ([`SECUENCIA.md`](SECUENCIA.md)).
>
> **Cómo leerlo.** Las cifras dicen cuánto cubría el taller al planear (las finales están en [Estado final](#estado-final-18-oct-2026)). El catálogo junta los 163 accionables en 49 patrones. Las
> propuestas, en el orden de la cadena, dicen qué se agrega a cada sección que ya existe (código **X**) y qué secciones nuevas
> nacen (código **N**). La matriz del final tiene una fila por accionable: busca ahí cualquier id.

**Convenciones**

- **§N** es el número de sección **del plan**: la cadena de 45 posiciones que existía cuando se escribió este documento, no la de hoy. La numeración final, de 70 posiciones, está en [`SECUENCIA.md`](SECUENCIA.md), y la tabla [La cadena resultante](#la-cadena-resultante) da la posición final de cada posición del plan.
- **X15** extiende §15. **N1…N14** son secciones nuevas, cada una con su posición en la cadena.
- Los repos son **evidencia**, no el dominio del taller. Todo 🔨 vive en la Empresa y sus módulos (Empresas.Historia, Contratos, Facturacion, Accesos).
- Un accionable operativo (por ejemplo, rotar una credencial concreta) cuenta como cerrado si el taller enseña el patrón que lo evita.
- **Molde** es lo que un repo ya hace bien ([`INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md`](INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md)): la cura copia esa forma.
- Ningún valor de credencial aparece aquí ni debe aparecer en el taller.

**Qué significa cada cobertura**

| Cobertura | Significa |
|---|---|
| **completa** | Una sección hace que el alumno sienta la falla (o su riesgo, con evidencia que corre) y construya o reconozca el patrón correcto. |
| **parcial** | Se menciona, se toca de pasada, se enseña una pieza que no evita este antipatrón, o solo aparece en un 🆘 o una nota. |
| **ninguna** | No está. |

---

## Las cifras

### Al planear (la cadena de 45)

| | completa | parcial | ninguna | total |
|---|---|---|---|---|
| Seguridad (S1–S3) | 0 | 2 | 1 | 3 |
| Librería (L1–L7) | 0 | 7 | 0 | 7 |
| Transversales (T1–T6) | 0 | 5 | 1 | 6 |
| Por repositorio (147) | 10 | 122 | 15 | 147 |
| **Total** | **10** (6 %) | **136** (83 %) | **17** (10 %) | **163** |

Al planear, lo completo estaba concentrado en la escritura (versión esperada, outbox, idempotencia del agregado, unicidad en la
transacción). L1, L6 y Cosmos.Asistente#9 no contaban como completos: el taller enseñaba la pieza central, pero no la que
pide el accionable (el test de dos sesiones, exponer el rezago, no esperar al leer el diario). Lo que faltaba
estaba en tres zonas: el **borde del servicio** (configuración, HTTP, errores, tenant firmado), la **vida de las vistas en
Marten** (rebuild, versión, Inline, snapshot) y el **arnés de tests** después de §12, que casi no existía. Además, el propio
taller repetía varios antipatrones; están listados en [Lo que el propio taller tiene que dejar de enseñar](#lo-que-el-propio-taller-tiene-que-dejar-de-enseñar).

### Con las propuestas

| | cantidad |
|---|---|
| Ids que hoy no están completos | 153 |
| … que quedan con una propuesta que los cierra | 153 (todos) |
| … que se cierran solo extendiendo secciones existentes | 65 |
| … que necesitan al menos una sección nueva | 88 |
| Extensiones a secciones existentes | 26 (~1.402 líneas · ~11 h de alumno) |
| Secciones nuevas | 14 (~2.255 líneas · ~13 h de alumno) |
| Total añadido | ~3.657 líneas (+42 % sobre las 8.657 de hoy) · ~25 h de alumno |
| Propuestas que piden un spike antes de escribir | 15 |
| La cadena pasa de | 45 a 59 posiciones |

Los tiempos son estimaciones del trabajo del alumno (leer, intentar el 🛠️, romper con el 🔨 y comprobar). Las líneas son del
archivo de la sección, contando código.

---

## El catálogo de patrones

Cada fila es un patrón correcto que el taller tiene que enseñar. Los ids en **negrita** tienen ese patrón como principal; los
demás lo usan de apoyo. **Estado**: *cubierto* = ya se enseña completo; *extender* = se cierra agregando a secciones que existen;
*nuevo* = necesita una sección nueva para su dolor.

| P | Patrón correcto | Ids | Estado | Dónde |
|---|---|---|---|---|
| P01 | Rehidratar no falla ni decide: el Apply es total, no valida, y el hecho lleva primitivos | **Cosmos.Impuestos#6**, **Cosmos.EstructuraOrganizacional#6**, **Cosmos.Direcciones#4** | extender | §3 (con eco en §11 y §12), §20, §24 |
| P02 | Todo estado nace de un hecho, y solo el Apply lo cambia | **Cosmos.ControlPlane#5**, **Cosmos.Contabilidad#9** | extender | §11–§12 (ya), §44 |
| P03 | El verbo guarda la transición, y lo repetido es un no-op | **Cosmos.ControlPlane#2**, **Cosmos.Direcciones#10** | cubierto | §5, §12, §33 |
| P04 | Una garantía vive en un test que se pone rojo; un verde sin afirmación es decorativo | Cosmos.BuildingBlocks#10, ObligacionesPorPagar.Radicacion#5, Cosmos.Terceros#2, **Cosmos.DatosReferencia#6**, **Cosmos.DatosReferencia#9**, **Cosmos.Direcciones#8** | extender | §12, §30, N2, N9, §45 |
| P05 | La versión esperada vive dentro de la escritura, con reintento ante el choque | **L1**, **Cosmos.BuildingBlocks#2**, **Cosmos.Terceros.Orquestador#1**, **Cosmos.Asistente#2**, **Cosmos.Contabilidad#3**, **ObligacionesPorPagar.Radicacion#4**, **ObligacionesPorPagar.Radicacion#5**, Cosmos.Direcciones#8 | extender | §9, §15, §29, §34 y §45 (ya); extender §34 y §45 |
| P06 | Los secretos no viven en el código ni en el repo; lo que tocó git se rota | **S1**, **ObligacionesPorPagar.Entradas#1**, **ObligacionesPorPagar.Reconocimiento#1** | nuevo | §15 (en C# plano) y N5 (con la configuración del host) |
| P07 | Lo plano también tiene concurrencia: versión real en tablas y documentos | **Cosmos.DatosReferencia#3** | extender | §21, §36 (y el 409 en N7) |
| P08 | No se registra maquinaria que no se usa; el código cuenta la misma decisión que el registro | T4, Cosmos.Terceros.Orquestador#8, Cosmos.Terceros#4, Cosmos.DatosReferencia#5, **Cosmos.DatosReferencia#8**, **ObligacionesPorPagar.Reconocimiento#10** | extender | §21, §30, N3, §44 |
| P09 | La unicidad la garantiza el store, en la misma transacción del hecho | **T3**, **Cosmos.Terceros#1**, **Cosmos.EstructuraOrganizacional#2**, **ObligacionesPorPagar.Integraciones#3** | extender | §23 (ya), §29, N3, §41, N7 |
| P10 | Una regla que cruza muchos streams necesita una frontera que la contenga | Cosmos.Contabilidad#7, **Cosmos.EstructuraOrganizacional#5**, **Cosmos.EstructuraOrganizacional#8** | nuevo | N1 (y eco en N13) |
| P11 | El arnés de integración parte de un estado conocido, también con el daemon vivo | **Cosmos.ControlPlane#7**, **Cosmos.Terceros#10**, **Cosmos.DatosReferencia#7** | extender | §24, §29, §37 |
| P12 | El hecho y su anuncio caen juntos (outbox), en los dos órdenes | **Cosmos.BuildingBlocks#8**, **Cosmos.ControlPlane#1**, **Cosmos.ControlPlane#3**, **Cosmos.Terceros.Orquestador#4**, **Cosmos.Impuestos#3**, **Cosmos.Contabilidad#10**, **Cosmos.EstructuraOrganizacional#3** | extender | §26 y §30 (ya); extender §26, §30, §40 |
| P13 | Lo que sale hacia afuera es un tipo que compila: contratos, también hacia la UI y por HTTP | **Cosmos.Terceros.Orquestador#6**, **Cosmos.Terceros#4**, Cosmos.Terceros#6, **Cosmos.EstructuraOrganizacional#7**, **ObligacionesPorPagar.Notificaciones#5** | extender | §27, §40, N7 |
| P14 | Un lote lleva ORDER BY y un cursor que avanza | **ObligacionesPorPagar.Radicacion#9** | extender | §28 |
| P15 | El nombre del hecho y del mensaje es un contrato estable, aparte de la clase; la forma vieja se reconcilia con la herramienta | **L4**, **Cosmos.BuildingBlocks#3**, **Cosmos.ControlPlane#4**, **Cosmos.Asistente#6**, **Cosmos.Contabilidad#5**, ObligacionesPorPagar.Radicacion#3, **Cosmos.Terceros#6**, **ObligacionesPorPagar.Reconocimiento#8** | extender | §29 (diario), §30 (bus), §35 (🔨 del bus) |
| P16 | La documentación dice la verdad del código: decisiones que se reemplazan, ejemplos que compilan | **L7**, Cosmos.BuildingBlocks#9, **Cosmos.DatosReferencia#5**, **ObligacionesPorPagar.Entradas#6**, **ObligacionesPorPagar.Integraciones#10** | extender | §29, §37, §43, §44, §45 |
| P17 | Un commit por mensaje: dentro del handler nadie confirma a mano | **T1**, **Cosmos.BuildingBlocks#10**, **Cosmos.Terceros.Orquestador#3**, Cosmos.Impuestos#3, Cosmos.Contabilidad#10, **ObligacionesPorPagar.Radicacion#6**, **Cosmos.DatosReferencia#4**, **ObligacionesPorPagar.Entradas#5**, **ObligacionesPorPagar.Reconocimiento#2**, **ObligacionesPorPagar.Reconocimiento#3** | extender | §30, §39, N14 |
| P18 | La llave de idempotencia identifica el efecto, no solo el sobre | **T2**, **ObligacionesPorPagar.Radicacion#1**, **ObligacionesPorPagar.Entradas#2**, **ObligacionesPorPagar.Notificaciones#4**, **ObligacionesPorPagar.Integraciones#2** | extender | §31, §32, §36 |
| P19 | El traductor de frontera no inventa: datos tipados, campos requeridos, ausencia explícita | Cosmos.Impuestos#2, **ObligacionesPorPagar.Entradas#9**, **ObligacionesPorPagar.Integraciones#4**, **ObligacionesPorPagar.Integraciones#5** | extender | §27 (frase), §32, §33 |
| P20 | Una réplica suscrita: el dueño publica cada cambio y la copia arranca, converge y declara su ausencia | **Cosmos.Impuestos#2**, **Cosmos.DatosReferencia#1**, **Cosmos.DatosReferencia#2**, Cosmos.DatosReferencia#6, **Cosmos.Direcciones#2**, **Cosmos.Direcciones#6** | nuevo | N2 (readiness en §42) |
| P21 | La respuesta del socio tiene forma, y un fallo técnico no es un no | **Cosmos.Direcciones#3**, **ObligacionesPorPagar.Reconocimiento#4**, **ObligacionesPorPagar.Integraciones#1**, **ObligacionesPorPagar.Integraciones#7** | extender | §35 |
| P22 | Una orden va punto a punto; un hecho se publica | **ObligacionesPorPagar.Entradas#10**, **ObligacionesPorPagar.Notificaciones#6** | extender | §35 |
| P23 | Un proceso largo persiste por tramos, y su plazo lo cierra y libera la regla | **Cosmos.Asistente#5** | extender | §36 |
| P24 | Un contexto de mensaje se usa desde un solo hilo | **Cosmos.BuildingBlocks#6** | extender | §36 |
| P25 | Se correlaciona por el id del proceso; si no se puede, índice medido y retención | **Cosmos.Terceros.Orquestador#5** | extender | §36, §42 |
| P26 | El rezago se mide, se espera donde vale, se expone y se alerta | **L6**, **Cosmos.BuildingBlocks#4**, ApplicationPlane#5, Cosmos.Impuestos#5, **Cosmos.Impuestos#10**, Cosmos.Direcciones#2 | extender | §19, §37 y §42 (ya); extender §37, §42, N6 |
| P27 | Las decisiones (también existencia y autorización) leen el diario; la vista solo responde | T2, **Cosmos.Asistente#4**, **Cosmos.Asistente#9** | extender | §19 y §29 (ya), N6 |
| P28 | El ciclo de vida de una vista es una decisión escrita (Inline o Async, con o sin daemon) | T4, ObligacionesPorPagar.Radicacion#2, Cosmos.Terceros#1, **Cosmos.Terceros#5**, **Cosmos.EstructuraOrganizacional#10**, **Cosmos.Direcciones#7** | nuevo | N3 (y §43) |
| P29 | Toda vista tiene un camino de vuelta ensayado: rebuild de la librería, versión y runbook | **L5**, **T4**, **Cosmos.ControlPlane#6**, **Cosmos.Impuestos#8**, **Cosmos.Asistente#3**, **Cosmos.Contabilidad#4**, **ObligacionesPorPagar.Radicacion#7**, **Cosmos.Terceros#3**, **Cosmos.EstructuraOrganizacional#4** | nuevo | N4 (arrastre en §38 y §40) |
| P30 | Una proyección es función pura de los hechos: sin reloj y sin efectos externos | **Cosmos.Asistente#1**, **ObligacionesPorPagar.Integraciones#8** | nuevo | N4, §40 |
| P31 | La identidad del documento sale del stream o de la regla, y la regla no va a la base por cada hecho | **Cosmos.Impuestos#9**, **ObligacionesPorPagar.Radicacion#10** | extender | §38 |
| P32 | Una vista existe porque alguien la consulta | **Cosmos.Impuestos#4** | extender | §38 |
| P33 | Lo destructivo solo existe en desarrollo; el diario no se borra | **S2**, **Cosmos.Impuestos#1**, **Cosmos.Contabilidad#1** | extender | §39 (línea en §41) |
| P34 | La configuración obligatoria se valida al arrancar, en tipos propios | S1, S3, **ApplicationPlane#1**, **Cosmos.Terceros.Orquestador#8**, **ObligacionesPorPagar.Integraciones#6** | nuevo | N5 |
| P35 | Leer lo que acabas de pedir: 202 + Location, 'en proceso', rezago visible, listados con tope | **Cosmos.ControlPlane#8**, **ApplicationPlane#5**, **Cosmos.Impuestos#5**, Cosmos.Asistente#4, **Cosmos.Terceros#7**, **ObligacionesPorPagar.Reconocimiento#7** | nuevo | N6 |
| P36 | El error tiene forma: 409 para el conflicto, ProblemDetails sin filtrar detalles | T3, Cosmos.Terceros#1, Cosmos.EstructuraOrganizacional#2, Cosmos.DatosReferencia#3, **ObligacionesPorPagar.Entradas#8** | nuevo | N7 |
| P37 | Una acción se sigue de punta a punta: correlación técnica y log estructurado sin payload | **ApplicationPlane#4**, **Cosmos.Terceros.Orquestador#7**, **ObligacionesPorPagar.Integraciones#9** | nuevo | N8, §42 |
| P38 | Un contexto, varios procesos, una configuración; cada host declara su rol | Cosmos.ControlPlane#6, **Cosmos.Asistente#10**, **ObligacionesPorPagar.Radicacion#2**, **ObligacionesPorPagar.Radicacion#3**, **ObligacionesPorPagar.Radicacion#8**, **Cosmos.Terceros#2**, **ObligacionesPorPagar.Entradas#7**, **ObligacionesPorPagar.Reconocimiento#6**, ObligacionesPorPagar.Notificaciones#7 | nuevo | N9 |
| P39 | El arnés de tests se construye con la misma configuración que producción | **T6**, **Cosmos.Asistente#8**, **Cosmos.Contabilidad#6**, **Cosmos.EstructuraOrganizacional#9**, **Cosmos.Direcciones#9** | nuevo | N9, §41 |
| P40 | El broker de verdad: topología por contexto, inbox durable, una ruta, provisión por infraestructura | **ObligacionesPorPagar.Reconocimiento#9**, **ObligacionesPorPagar.Notificaciones#3**, ObligacionesPorPagar.Notificaciones#4, **ObligacionesPorPagar.Notificaciones#7** | nuevo | N10 |
| P41 | La UI se entera de lo confirmado, no de lo solicitado | **Cosmos.Terceros.Orquestador#2** | extender | §40 |
| P42 | El tenant viaja con cada operación: sesión, sobre, trabajo de fondo y llaves | **Cosmos.BuildingBlocks#5**, Cosmos.EstructuraOrganizacional#2, **Cosmos.Direcciones#1**, **ObligacionesPorPagar.Entradas#4** | extender | §41, N12 |
| P43 | El tenant y el actor salen de un claim firmado; el borde es fail-closed | **S3**, **ApplicationPlane#2**, **ApplicationPlane#3**, **Cosmos.Contabilidad#2**, **Cosmos.Terceros#9**, **ObligacionesPorPagar.Notificaciones#1**, **ObligacionesPorPagar.Notificaciones#2** | nuevo | N11 |
| P44 | Un disparador recurrente no depende del éxito del trabajo que dispara | **ObligacionesPorPagar.Entradas#3** | nuevo | N12 (observador en §42) |
| P45 | Lo declarado del esquema se verifica contra la base | Cosmos.Terceros.Orquestador#5, **ObligacionesPorPagar.Reconocimiento#5**, ObligacionesPorPagar.Reconocimiento#6 | extender | §42 |
| P46 | Los streams tienen techo: medir, snapshot Inline por el camino correcto, acortar o partir | **T5**, **Cosmos.Impuestos#7**, **Cosmos.Asistente#7**, **Cosmos.Contabilidad#7**, **Cosmos.Terceros#8** | nuevo | N13 |
| P47 | El doble rehidrata con la misma convención que el real, y lo prueba un test de contrato | **L3**, **Cosmos.BuildingBlocks#7** | extender | §44 |
| P48 | La unidad de trabajo ve lo que ella misma registró, y falla en la puerta si no existe | **L2**, **Cosmos.BuildingBlocks#1**, **Cosmos.BuildingBlocks#9**, **Cosmos.Contabilidad#8** | nuevo | N14 (se conserva en §45) |
| P49 | La versión que vio el usuario viaja hasta la escritura | **Cosmos.EstructuraOrganizacional#1**, **Cosmos.Direcciones#5** | extender | §45 |

---

## Las propuestas, en el orden de la cadena

Cada propuesta dice el dolor que el alumno vive, la cura que construye o reconoce, el 🔨 que lo rompe a propósito, y qué ids
cierra. Donde un repo ya resolvió el problema, la cura copia su forma (**molde**). Las secciones nuevas siguen el formato fijo
de [`DEFINICIONES.md`](DEFINICIONES.md) y se cierran con el arnés `revisar-seccion`, como todas.

### X3 · El `dynamic` que revienta al leer

*extender · §3 Refactorizando el motor (con eco en §11 y §12)*

- **Dolor.** La NOTE del `((dynamic)this).Aplicar((dynamic)hecho)` (refactorizando-el-motor.md:170) dice que no se usará, pero nadie la corre. El alumno no siente cómo falla.
- **Cura.** La NOTE se vuelve un 🔨 corto. En §11 se cierra el par: lo estricto rompe todas las lecturas y lo laxo (el `switch` que ignora) miente en silencio. El criterio es ignorar lo desconocido y cazarlo con un test. En §12, un test dado/cuando/entonces por cada hecho caza al huérfano.
- **🔨 Rómpelo.** Con el enrutado `dynamic` de la NOTE, agrega a la historia un hecho sin `Aplicar` y carga la empresa. Agregarlo a la lista no se queja. Toda carga de esa empresa lanza `RuntimeBinderException`.
- **Cierra.** Cosmos.Impuestos#6
- **Patrones.** P01
- **Costo.** ~31 líneas · ~15 min del alumno.

### X12 · El proyecto de tests vacío

*extender · §12 Verde, y roto*

- **Dolor.** El `UnitTest1.cs` que trae `dotnet new xunit` (verde-y-roto.md:22) tiene un `[Fact]` vacío. Pasa en verde sin afirmar nada. Un proyecto de tests que solo tiene eso da la misma señal verde en el pipeline.
- **Cura.** Antes de borrar `UnitTest1.cs`, córrelo y mira el verde. Una línea en el ✅ Compruébalo: un verde sin afirmación es decorativo, también a nivel de proyecto; un proyecto de tests existe porque afirma algo.
- **Cierra.** Cosmos.DatosReferencia#9
- **Patrones.** P04
- **Costo.** ~6 líneas · ~5 min del alumno.

### X15 · La cadena que se subió con el primer push

*extender · §15 Todo o nada*

- **Dolor.** Aquí nace la primera cadena de conexión con contraseña (todo-o-nada.md:213), y el `git push` del cierre la sube al remoto. Después se repite en la-vista-de-lectura.md:161, en el `public const string Cadena` de llego-dos-veces.md:38 y :51, y en el-host-y-la-inyeccion.md:59.
- **Cura.** En C# plano: la cadena sale del código a una variable de entorno, y el programa lanza al arrancar si falta. Queda dicho el criterio: un secreto que tocó git se rota, borrarlo no basta. La versión completa (configuración del host, user-secrets, secretos del orquestador) llega en N5.
- **🔨 Rómpelo.** `git log -p -S "Password="` sobre tu propio historial encuentra la cadena, aunque ya la hayas borrado del archivo.
- **Arrastre.** Quitar el literal y el `const Cadena` de §16, §31 y §39.
- **Cierra.** S1, ObligacionesPorPagar.Entradas#1, ObligacionesPorPagar.Reconocimiento#1
- **Patrones.** P06
- **Costo.** ~30 líneas · ~15 min del alumno.

### X20 · Un Apply que no es total

*extender · §20 El proyector tropieza*

- **Dolor.** Hoy el tropiezo es un tipo desconocido. Falta el caso de un hecho conocido y válido cuyo `Apply` lanza.
- **Cura.** Apartar el hecho no cura nada, porque el hecho es válido. La cura es un `Apply` total: si no encuentra lo que busca, no hace nada.
- **🔨 Rómpelo.** Segunda bomba, en tu `Empresa`: el `case EmpresaReactivada` lanza si la empresa no estaba suspendida (en la evidencia, un `FindIndex` que usa el -1). Inyecta a mano, como la bomba de el-proyector-tropieza.md:17, un `empresa_reactivada` sobre una empresa activa. El proyector la aparta, pero rehidratar ese stream sigue lanzando: la vista nunca se pone al día con esa empresa y todo comando sobre ella falla.
- **Cierra.** Cosmos.Direcciones#4
- **Patrones.** P01
- **Costo.** ~25 líneas · ~15 min del alumno.

### X21 · Plano no es sin concurrencia, y el andamiaje que miente

*extender · §21 ¿Merecía event sourcing?*

- **Dolor.** El catálogo `Plan` nace plano, con un `UPDATE` directo. Dos ediciones simultáneas del mismo plan se pisan, aunque la fila tenga una columna `version`. Y queda la tentación de dejar montado un stream del catálogo por si acaso.
- **Cura.** La primera cura es `UPDATE … WHERE version = @v`: 0 filas afectadas es un conflicto. La segunda es borrar lo que contradice la decisión. Las dos decisiones van a DECISIONES.md.
- **🔨 Rómpelo.** 🔨 1: dos `UPDATE` concurrentes con una versión de adorno; gana el último, sin señal. 🔨 2: deja montado un stream del catálogo junto a la tabla, agrega un `PrecioCambiado` y la tabla plana no se entera: hay dos verdades.
- **Molde.** Reconocimiento (ADR-002) y DatosReferencia: decidir no usar event sourcing y dejarlo escrito.
- **Cierra.** Cosmos.DatosReferencia#3, ObligacionesPorPagar.Reconocimiento#10
- **Patrones.** P07, P08
- **Costo.** ~45 líneas · ~25 min del alumno.

### N1 · El árbol de empresas

*sección nueva · entre §23 Dos streams, la misma clave y §24 La forma del hecho se congela*

- **Dolor.** Llegan los grupos empresariales: una empresa puede ser filial de otra. Dos reparentados simultáneos (A bajo B, B bajo A) son válidos cada uno en su stream y con su versión, y juntos cierran un ciclo. El recorrido de ancestros con un `while` no termina y la petición se cuelga. Y la inactivación en cascada, decidida leyendo el subárbol en la vista, deja activa una filial creada en esa ventana.
- **Cura.** Sin ciclos es una regla de conjunto, como la unicidad de §23: la versión de cada stream no la protege. La cura es una frontera que la contenga: la jerarquía vive en un solo stream (`GrupoEmpresarial`) con versión esperada, o los reparentados de un árbol se serializan. El recorrido es defensivo (conjunto de visitados, corte al repetir). La cascada se decide contra el diario del grupo, con un tope explícito que falla ruidosamente, y crear o trasladar una filial valida el estado del padre.
- **🔨 Rómpelo.** Dos reparentados en paralelo sin frontera cierran el ciclo; con el stream del grupo, el segundo choca por versión.
- **Molde.** EstructuraOrganizacional: el proceso de fusión o división en su propio stream, con commit atómico multi-stream.
- **Nota.** Consumidores después: N13 (el stream del grupo crece) y §36 (otra frontera elegida por la regla). Re-hilar el gancho de §24, que hoy abre con el Nit de la sección anterior.
- **Cierra.** Cosmos.EstructuraOrganizacional#5, Cosmos.EstructuraOrganizacional#8
- **Patrones.** P10
- **Costo.** ~160 líneas · ~60 min del alumno.

### X24 · Nace el arnés contra Postgres, y el objeto de valor que valida

*extender · §24 La forma del hecho se congela*

- **Dolor.** El 🔨 de la-forma-del-hecho-se-congela.md:85 siembra `emp-legado` con un id fijo: correrlo dos veces choca con la `PRIMARY KEY(stream, version)` de §15. Y un hecho que lleve un objeto de valor con validación en su constructor revienta al leer un JSON viejo.
- **Cura.** Nace el arnés de integración: un fixture compartido que en `IAsyncLifetime` deja la base en un estado conocido (`TRUNCATE` a mano). Y el hecho lleva primitivos; el objeto de valor se construye en el `Apply`, donde nada valida al rehidratar.
- **🔨 Rómpelo.** 🔨 2: mete en `EmpresaRegistrada` un objeto de valor `Nit` que valida en su constructor, y rehidrata un JSON viejo con el NIT vacío: el replay lanza.
- **Nota.** §22 ya habla de la suite contra Postgres antes de que exista el fixture. Ajustar esa frase de §22, o adelantar el fixture a §22.
- **Cierra.** Cosmos.Terceros#10, Cosmos.EstructuraOrganizacional#6
- **Patrones.** P11, P01
- **Costo.** ~45 líneas · ~25 min del alumno.

### X26 · El orden invertido, vivido

*extender · §26 El hecho y su anuncio*

- **Dolor.** Guardar y luego anunciar solo se narra (el-hecho-y-su-anuncio.md:31). Es el arreglo tentador del fantasma.
- **Cura.** La bandeja cura los dos órdenes, porque la intención de anunciar entra en la misma transacción del hecho.
- **🔨 Rómpelo.** Tercer caso en el 🔨 de :165: guarda el hecho, anuncia, y cae entre los dos. El hecho queda en el diario, `MundoExterno` vacío, y ninguna fila recuerda el anuncio.
- **Cierra.** Cosmos.EstructuraOrganizacional#3, Cosmos.Impuestos#3, Cosmos.Contabilidad#10
- **Patrones.** P12
- **Costo.** ~20 líneas · ~10 min del alumno.

### X27 · Dos formas de anular el límite de compilación

*extender · §27 El evento público*

- **Dolor.** El límite de compilación se vive con un contrato bien hecho. Falta ver cómo se anula.
- **Cura.** Un record por tipo, versionado, en `Contratos`. Y un matiz de frase en el-evento-publico.md:23: "solo primitivos" pasa a "primitivos con significado" (una fecha es una fecha, no un string).
- **🔨 Rómpelo.** 🔨 1: el consumidor sigue un ejemplo con un contrato prometido que nunca se declaró, y no compila. 🔨 2: un contrato `(string Tipo, object Datos)`; renombrar un tipo compila en verde y el consumidor falla al leer.
- **Cierra.** Cosmos.Terceros#4, ObligacionesPorPagar.Notificaciones#5, ObligacionesPorPagar.Integraciones#5
- **Patrones.** P13, P19
- **Costo.** ~35 líneas · ~20 min del alumno.

### X28 · Sin ORDER BY, el lote es arbitrario

*extender · §28 El mensaje y la cola*

- **Dolor.** El claim siempre lleva `ORDER BY`, pero nunca se dice qué pasa sin él.
- **Cura.** `ORDER BY id`. Y en un sondeo que no consume filas, un cursor (`WHERE col > último`) o una marca de último sondeo.
- **🔨 Rómpelo.** Con varias filas pendientes, un `UPDATE` sobre la primera (un reintento) mueve su tupla, y un `LIMIT 1` sin orden ya no devuelve la más vieja.
- **Cierra.** ObligacionesPorPagar.Radicacion#9
- **Patrones.** P14
- **Costo.** ~20 líneas · ~10 min del alumno.

### X29 · Lo que el swap no reconoce: la unicidad, el nombre y la forma

*extender · §29 El swap por reconocimiento*

- **Dolor.** La unicidad del NIT queda a mano y fuera de la transacción (el-swap-por-reconocimiento.md:25). El mapa de nombres estables de §14 y el upcaster de §24 se borran con `GetEvents` (:93), y Marten vuelve a nombrar los hechos por su clase.
- **Cura.** (1) El localizador pasa a ser un documento de Marten (`Localizador { Id = nit }`) insertado con `session.Insert` en la misma sesión que `StartStream`: el duplicado lanza en `SaveChanges`. (2) Dos filas más en la tabla del swap: el mapa de nombres → `opts.Events.MapEventType<T>("…")`, y el upcaster a mano → el upcaster de Marten. Un test fija la lista hecho↔alias, y una línea explica `EventNamingStyle`. (3) En DECISIONES.md se marcan como reemplazadas las líneas de lo que Marten absorbe. (4) El fixture de §24 se reconoce en el reset del store de Marten.
- **🔨 Rómpelo.** 🔨 1: dos registros simultáneos del mismo NIT. 🔨 2: renombra `PlanCambiado` y rehidrata emp-7, con y sin el alias.
- **Verificar antes (spike).** Excepción del `Insert` duplicado; si 9.50.3 lanza o salta en silencio con un alias desconocido; API del upcaster en 9.50.3.
- **Arrastre.** Las siembras con `INSERT INTO localizador` en psql (§32–§39) y `Localizador.NitDe/StreamDe` pasan al documento. Las salidas SQL que muestran `type` (dos-respuestas-a-la-vez.md:62-66, el-host-y-la-inyeccion.md:113-117) pasan a los alias.
- **Cierra.** T3, Cosmos.Terceros#1, L4, Cosmos.BuildingBlocks#3, Cosmos.ControlPlane#4, Cosmos.Asistente#6, Cosmos.Contabilidad#5, ObligacionesPorPagar.Radicacion#3, Cosmos.Terceros#6, ObligacionesPorPagar.Reconocimiento#8, ObligacionesPorPagar.Entradas#6, Cosmos.Terceros#10
- **Patrones.** P09, P15, P16, P11
- **Costo.** ~90 líneas · ~45 min del alumno.

### X30 · El commit que llegó antes

*extender · §30 El outbox*

- **Dolor.** El 🔨 de el-outbox.md:108-110 muestra el fantasma, no el hecho perdido. Nadie vive un `SaveChangesAsync` manual dentro del handler, que es como lo hacen varios repos.
- **Cura.** Quitar el `SaveChanges` y devolver el mensaje: confirma `AutoApplyTransactions`. Además: `[MessageIdentity("…")]` en los contratos de `Contratos`; un test que afirma el mensaje que devuelve el handler y sus campos; y una línea de criterio: la mensajería se monta con el primer mensaje que cruza, y solo entra al outbox lo que sale por cascading o por el bus del handler antes del commit.
- **🔨 Rómpelo.** En el handler, `await session.SaveChangesAsync()`, luego `bus.PublishAsync(...)`, con un throw entre los dos. El hecho queda en `mt_events`, `MundoExterno.Recibidos` vacío y `wolverine_incoming_envelopes` sin fila; con un mensaje local pasa lo mismo. Variante: el catch escribe un segundo registro del mismo intento.
- **Cierra.** Cosmos.Impuestos#3, Cosmos.Contabilidad#10, ObligacionesPorPagar.Entradas#5, ObligacionesPorPagar.Reconocimiento#2, ObligacionesPorPagar.Reconocimiento#3, L4, Cosmos.ControlPlane#4, ObligacionesPorPagar.Reconocimiento#8, Cosmos.DatosReferencia#6, Cosmos.Terceros#4, Cosmos.EstructuraOrganizacional#3
- **Patrones.** P12, P17, P15, P04, P08
- **Costo.** ~60 líneas · ~30 min del alumno.

### X31 · Qué llave identifica el hecho

*extender · §31 Llegó dos veces*

- **Dolor.** La regla de llego-dos-veces.md:100 ("dedup por el id del mensaje, no por un dato del negocio") cubre la reentrega del mismo sobre, pero empuja a descartar la llave que identifica el efecto.
- **Cura.** Una sola idea con tres caras. El sobre identifica la reentrega; la referencia del origen identifica el acto repetido; un dato que solo se parece (NIT, monto) no identifica nada. La referencia se guarda por el `Apply` del agregado (`PagoRegistrado` gana `Referencia`; los hechos viejos la leen null, un default honesto). Ante un efecto externo, se pregunta por la referencia estable antes de reintentar. Se reescriben :100 y :116 con ese matiz.
- **🔨 Rómpelo.** 🔨 1, el anuncio republicado: dos `PublishAsync` del mismo anuncio tienen dos `envelope.Id` y cobran doble pese al dedup (queda abierto; la cura llega en §36). 🔨 2, el mismo pago en dos sobres: el banco (simulado con `MundoExterno`) avisa dos veces el mismo pago, con la misma referencia, en mensajes distintos. El dedup por sobre no los junta y `RegistrarPago(referencia, monto)` registra dos pagos; con la referencia guardada por el `Apply`, el segundo es un no-op. 🔨 3, el efecto externo que no deduplica: `MundoExterno` cobra y pierde la respuesta, y el reintento cobra otra vez.
- **Cierra.** T2, ObligacionesPorPagar.Radicacion#1, ObligacionesPorPagar.Integraciones#2
- **Patrones.** P18
- **Costo.** ~60 líneas · ~30 min del alumno.

### X32 · El mes cobrado dos veces, y la constante que parece un dato

*extender · §32 El contrato lleva lo justo*

- **Dolor.** el-contrato-lleva-lo-justo.md:133 ya nombra que mensajes distintos del mismo acto escapan al dedup, pero no se vive. Y nadie vive un contrato al que le falta un dato que el consumidor rellena con una constante.
- **Cura.** Reservar `(nit, periodo)` con `PRIMARY KEY`/`ON CONFLICT` antes de enviar, como el localizador de §23. Y el dato que el receptor necesita viaja como campo requerido, homologado de forma explícita en el borde.
- **🔨 Rómpelo.** 🔨 1: el `ProcesoMensual` corre dos veces el mismo mes; los sobres son nuevos y el dedup de §31 no los junta. 🔨 2: si el anuncio no trae el plan, Facturación cobra con un plan fijo; el resultado es plausible y falso.
- **Cierra.** ObligacionesPorPagar.Entradas#2, ObligacionesPorPagar.Integraciones#4
- **Patrones.** P18, P19
- **Costo.** ~45 líneas · ~20 min del alumno.

### N2 · La réplica suscrita

*sección nueva · entre §32 El contrato lleva lo justo y §33 Dos respuestas, ningún dueño*

- **Dolor.** La tercera fila de la tabla de §32 (replicar) solo se nombra (el-contrato-lleva-lo-justo.md:316). Construida, duele de cuatro formas. Una empresa que nunca cambió de plan no tiene fila, y la mensualidad que lee la réplica cobra sin plan mientras `ProcesoMensual` cobra Básico. Lo sembrado antes de suscribirse, o sin publicar, nunca llega. Si el dueño solo anuncia la creación, la copia queda vieja. Y tras reiniciar, la réplica arranca vacía.
- **Cura.** El dueño publica cada cambio por el outbox, también la siembra. La réplica tiene un arranque reintentable: una consulta inicial al dueño, la de §32. La ausencia es explícita: sin fila se pregunta o se falla, nunca se responde vacío. Hay un solo resolvedor del plan. El contrato gana una `Version` monotónica y la réplica hace upsert-si-más-nuevo. Un test afirma la convergencia (versión creciente, estado vigente).
- **🔨 Rómpelo.** Siembra una empresa sin publicar y cobra la mensualidad desde la réplica; luego publica solo la creación y cambia el plan.
- **Molde.** DatosReferencia: un evento por catálogo, `Version` monotónica y upsert-si-más-nuevo.
- **Cierra.** Cosmos.DatosReferencia#1, Cosmos.DatosReferencia#2, Cosmos.Direcciones#6, Cosmos.Impuestos#2, Cosmos.DatosReferencia#6, Cosmos.Direcciones#2
- **Patrones.** P20, P19, P04
- **Costo.** ~170 líneas · ~60 min del alumno.

### X33 · La fecha que llega ilegible

*extender · §33 Dos respuestas, ningún dueño*

- **Dolor.** El criterio del default honesto (§24) y del marcador `SIN-NIT-LEGADO` vale al leer lo propio. Falta en la entrada de datos ajenos.
- **Cura.** En el Paso 3 (dos-respuestas-ningun-dueno.md:142), `MultaCobradaV1` gana la fecha del cobro. La fecha viaja tipada (`DateOnly`/`DateTimeOffset`), se parsea con cultura explícita en el borde, y si no se puede leer el traductor emite una señal explícita (`FechaNoParseable`) en vez de un default que parece real.
- **🔨 Rómpelo.** El socio formatea la fecha con otra cultura, o llega ilegible. El traductor la parsea mal o la reemplaza por la fecha de hoy, y queda congelada en un hecho propio.
- **Molde.** Entradas: el traductor ACL como función pura, con id y reloj por parámetro.
- **Cierra.** ObligacionesPorPagar.Entradas#9, ObligacionesPorPagar.Integraciones#5
- **Patrones.** P19
- **Costo.** ~35 líneas · ~15 min del alumno.

### X34 · El lock que no protege, y la política sobre la base

*extender · §34 Dos respuestas a la vez*

- **Dolor.** La tabla de dos-respuestas-a-la-vez.md:78-86 lista tres mecanismos; falta el que la organización intentó. El ajuste de Marten al que alude :74 no se nombra. Y la política `OnException<EventStreamUnexpectedMaxEventIdException>` apunta a una subclase.
- **Cura.** Cuarta fila de la tabla: lock externo con TTL, no protege. Se nombra `EventAppendMode` (Rich/Quick). La política de reintento se declara desde aquí sobre la base `JasperFx.ConcurrencyException`.
- **🔨 Rómpelo.** 🔨 1: un lock en memoria que expira antes de la pausa de `RespuestasHandler`; las dos respuestas entran, y la versión esperada sí atrapa el choque. 🔨 2 (si el spike lo confirma): cambiar el modo de append cambia el tipo que lanza el choque, y la política por subclase lo deja caer a dead letters.
- **Verificar antes (spike).** Qué tipo lanza el choque en cada `EventAppendMode` en 9.50.3 (existen dos `EventStreamUnexpectedMaxEventIdException`).
- **Arrastre.** Alinear el-host-y-la-inyeccion.md:82 y el-capstone-fetchforwriting.md:98.
- **Cierra.** Cosmos.Asistente#2, ObligacionesPorPagar.Radicacion#4, ObligacionesPorPagar.Radicacion#5, L1
- **Patrones.** P05
- **Costo.** ~40 líneas · ~20 min del alumno.

### X35 · Lo que no es un no

*extender · §35 Deshacer en tres sistemas*

- **Dolor.** El no de hoy es siempre un contrato limpio, con su razón. Falta ver lo que parece un no y no lo es, y lo que pasa con una orden publicada como anuncio o con un mensaje programado que cambia de nombre.
- **Cura.** Paso 1: lo transitorio se relanza (reintento con `OnException`, dead letter si se agota) y solo una regla rechaza; la respuesta tiene forma (Aceptado / YaEstaba / Rechazado + motivo), y un mapeo exhaustivo cubre cada forma que puede devolver `MundoExterno` (vacía, parcial, pendiente), cada una con su test; lo pendiente queda EnCurso. Paso 2: la restitución es un comando a un destinatario. Paso 3: `[MessageIdentity]` en el mensaje programado.
- **🔨 Rómpelo.** 🔨 1, un timeout no es un no: un `try/catch` en Facturación devuelve `MultaRechazadaV1` ante cualquier excepción, y un timeout simulado revierte una suspensión legítima. 🔨 2, un no sin razón: el socio contesta `bool`, y Empresas compensa lo que ya estaba cobrado. 🔨 3: `RestituirAccesosV1` publicado como anuncio con dos oyentes. 🔨 4: renombrar `RevisarSuspension` con un plazo en `Scheduled`; al reiniciar, el mensaje queda sin tipo.
- **Molde.** Integraciones: el rechazo del ERP como resultado de dominio; las excepciones, solo para fallos técnicos.
- **Nota.** §35 pasa de unas 390 a unas 480 líneas. Si se prefiere, el Paso 3 (el socio que nunca contesta) se parte en su propia sección.
- **Cierra.** ObligacionesPorPagar.Reconocimiento#4, Cosmos.Direcciones#3, ObligacionesPorPagar.Integraciones#7, ObligacionesPorPagar.Integraciones#1, ObligacionesPorPagar.Entradas#10, ObligacionesPorPagar.Notificaciones#6, L4, Cosmos.ControlPlane#4, ObligacionesPorPagar.Reconocimiento#8
- **Patrones.** P21, P22, P15
- **Costo.** ~90 líneas · ~45 min del alumno.

### X36 · El mismo pedido con otro sobre, y el dueño que muere

*extender · §36 El proceso tiene dueño*

- **Dolor.** Aquí nace la identidad de negocio del cobro (el `SuspensionId`), pero el dedup de Facturación sigue por sobre (el-proceso-tiene-dueno.md:196). Y el proceso solo se libera al reactivar o revertir.
- **Cura.** `multas` con PK `suspension_id`, enviada también como llave de idempotencia al efecto externo: cierra el 🔨 abierto en §31. Un hecho por paso, y al vencer el plazo de §35 un hecho que cierra el proceso y libera `ProcesoAbierto`. Varios salientes van por el `OutgoingMessages` que el alumno ya construyó en el Paso 2, o por `await` secuencial, nunca por `Task.WhenAll` sobre el bus: el contexto del mensaje no es seguro entre hilos. Notas de criterio: la correlación es el id del proceso, y si una respuesta trae otro id se indexa (se mide en §42) y los procesos terminados tienen retención escrita; la saga reconoce `IRevisioned` y se enlaza con la concurrencia plana de §21.
- **🔨 Rómpelo.** 🔨 1: dos sobres del mismo pedido cobran doble con el dedup por sobre. 🔨 2: un acto guarda la apertura y acumula los pasos para un commit final; muere a la mitad y la empresa queda bloqueada para siempre. 🔨 3: en un handler de prueba, publica cien anuncios con `Task.WhenAll` de `bus.PublishAsync` en vez de `OutgoingMessages`, y cuenta las filas que deja en `wolverine_incoming_envelopes` contra las cien que esperabas.
- **Molde.** Asistente: la regla de un solo turno en proceso vive en el agregado, no en la infraestructura.
- **Verificar antes (spike).** Si en WolverineFx 6.51.0 los `PublishAsync` concurrentes sobre el mismo contexto pierden, duplican o lanzan de forma reproducible. Si no se reproduce, el 🔨 3 se queda en contar los sobres y leer el contrato de `IMessageContext`, y Cosmos.BuildingBlocks#6 se marca como riesgo explicado, no vivido.
- **Cierra.** T2, ObligacionesPorPagar.Notificaciones#4, Cosmos.Asistente#5, Cosmos.BuildingBlocks#6, Cosmos.Terceros.Orquestador#5, Cosmos.DatosReferencia#3
- **Patrones.** P18, P23, P24, P25, P07
- **Costo.** ~80 líneas · ~40 min del alumno.

### X37 · Esperar la vista, y probarla con el daemon vivo

*extender · §37 El daemon y la consistencia eventual*

- **Dolor.** El 🔨 del leer-lo-escrito espera con `Task.Delay(3000)` (el-daemon-y-la-consistencia-eventual.md:123). Las vistas se prueban desde `Program.cs`. Y DECISIONES.md sigue diciendo que el proyector y el checkpoint son tuyos.
- **Cura.** La espera pasa a `WaitForNonStaleProjectionDataAsync`, con su criterio: vale en tests y en una UX que lee lo propio, nunca para decidir. El arnés de §24 gana el daemon: un reset que coordina con él (`ResetAllMartenDataAsync`), el dispose de los hosts, un test sembrar → esperar → afirmar la vista, y otro que repite y reordena hechos y fija que la vista no duplica. Al retirar `CorrerProyector`, se marcan como reemplazadas las líneas de §18 y §19.
- **Verificar antes (spike).** Reset con el daemon vivo; el hueco de secuencia del 🆘 de :158 al esperar.
- **Cierra.** Cosmos.BuildingBlocks#4, Cosmos.ControlPlane#7, Cosmos.DatosReferencia#7, ObligacionesPorPagar.Entradas#6, Cosmos.Terceros#10
- **Patrones.** P26, P11, P16
- **Costo.** ~65 líneas · ~30 min del alumno.

### N3 · La vista en la misma transacción

*sección nueva · entre §37 El daemon y §38 El tablero cruza streams*

- **Dolor.** La consulta del plan de hoy (`ConsultarPlanV1`, el-contrato-lleva-lo-justo.md:249) rehidrata el agregado: la lectura depende de sus `Apply`, y cambiar uno cambia la respuesta. Moverla a la vista async de §37 rompe el leer-lo-escrito. Y la elección Async/Inline (el-daemon-y-la-consistencia-eventual.md:41) se declara, pero nunca se construye una Inline.
- **Cura.** Una vista `EmpresaDetalle` Inline, que Marten escribe en la misma transacción del hecho. El ciclo de vida queda escrito: Inline si algo decide o lee enseguida con ella, Async si es para mostrar. Va una línea en DECISIONES.md y un comentario de síntoma junto al registro. El alumno elige una de las dos reservas del NIT (el documento de §29 o el índice único sobre la vista) y lo anota.
- **🔨 Rómpelo.** 🔨 1, la vista no es un candado: con la vista Inline a mano, la unicidad se hace con `AnyAsync(Nit)` antes de `StartStream`, y dos registros simultáneos pasan los dos; un `UniqueIndex` sobre el documento Inline hace caer el segundo. 🔨 2: una vista Async registrada en un host sin `AddAsyncDaemon` queda vacía, sin error. Y el inverso: no se registra un daemon donde no hay ninguna Async.
- **Molde.** Radicación (ADR-007: el ciclo de vida de cada proyección, escrito); Impuestos (Inline + índice único).
- **Verificar antes (spike).** `UniqueIndex` sobre un documento Inline en 9.50.3 y la excepción que lanza.
- **Cierra.** Cosmos.Terceros#1, Cosmos.EstructuraOrganizacional#2, Cosmos.Terceros#5, Cosmos.EstructuraOrganizacional#10, Cosmos.Direcciones#7, T4
- **Patrones.** P28, P09, P08
- **Costo.** ~160 líneas · ~60 min del alumno.

### N4 · Reconstruir con el daemon

*sección nueva · entre N3 y §38 El tablero cruza streams*

- **Dolor.** El dolor de §17, ahora en Marten. Sumar un campo a `VistaSuspendida`, o corregir su `Apply`, deja los documentos viejos con la forma vieja, porque el daemon sigue desde su cursor. La vista Inline de N3 tampoco se rearma sola. Y el atajo del taller (DELETE en psql sobre `mt_doc_*` y `mt_event_progression`, en el-daemon-y-la-consistencia-eventual.md:138 y el-tablero-cruza-streams.md:173-174) contradice la regla de solo lectura de §42.
- **Cura.** Un comando administrativo que construye el daemon a demanda (`store.BuildProjectionDaemonAsync()` → `RebuildProjectionAsync<T>()`), para Async e Inline. Subir la versión de la proyección para rearmar lado a lado. Un runbook en DECISIONES.md: cuándo, cuánto tarda, qué ve el usuario mientras tanto. `HotCold` como criterio para más de un nodo. Es tu `Reconstruir()` de §17, hecho librería.
- **🔨 Rómpelo.** 🔨 1, la acumuladora: una vista que suma (total pagado por plan); bajar solo el progreso sin vaciar documentos duplica los totales. 🔨 2, el reloj en la vista: suspensiones por minuto agrupadas por `DateTime.UtcNow`; al rearmar, todo queda imputado al minuto del rearme. Con `e.Timestamp`, el rearme da lo mismo.
- **Molde.** Terceros (`Apply` puros: sin IO, sin excepciones, sin `DateTime.UtcNow`); ControlPlane (daemon HotCold fuera de serverless).
- **Verificar antes (spike).** Qué cambia la versión de una proyección en 9.50.3 (shard, tabla); el rebuild de una Inline; si la duplicación aparece con SingleStream o hay que mostrarla con MultiStream.
- **Arrastre.** Reemplaza los DELETE de §37:138 y §38:173-174.
- **Cierra.** L5, T4, Cosmos.ControlPlane#6, Cosmos.Impuestos#8, Cosmos.Asistente#3, Cosmos.Contabilidad#4, ObligacionesPorPagar.Radicacion#7, Cosmos.Terceros#3, Cosmos.EstructuraOrganizacional#4, Cosmos.Asistente#1
- **Patrones.** P29, P30
- **Costo.** ~170 líneas · ~70 min del alumno.

### X38 · La vista que nadie consulta, y la regla que no es barata

*extender · §38 El tablero cruza streams*

- **Dolor.** Tras §38 nadie consulta `VistaSuspendida`, y el host la sigue registrando (el-host-y-la-inyeccion.md:67). La regla de identidad del tablero es barata, pero el alumno no ve la que no lo es. Y en §37 nunca asignó `Id`, porque lo pone el slice.
- **Cura.** En la parte "¿Siempre multi-stream?": preguntar quién consulta cada vista, ver en `mt_event_progression` que su shard procesa cada append, y retirarla (registro, modelo, documentos y progreso) o darle consumidor, con su línea en DECISIONES.md. Variante del agrupador: si el id del proceso no llevara la empresa, rehidratar el stream por cada hecho cuesta O(historia); la cura es la llave en el hecho o un localizador. El rearmado de :170 pasa al comando de N4.
- **🔨 Rómpelo.** 🔨 1, dentro del 🔨 de la regla: asignar `v.Id` desde un dato del hecho en vez de la regla de identidad. Una vista por stream lo perdona; una multi-stream no. 🔨 2, la regla cara: haz que la regla busque la empresa cargando el stream entero del proceso (`FetchStreamAsync`) por cada hecho del lote, y cuenta con un log cuántos hechos lee por lote sobre emp-9 y emp-11. Con la llave en el hecho, lee cero.
- **Molde.** Radicación: el agrupador escanea primero el lote y solo cae a la base para lotes anteriores.
- **Cierra.** Cosmos.Impuestos#4, Cosmos.Impuestos#9, ObligacionesPorPagar.Radicacion#10, L5
- **Patrones.** P32, P31, P29
- **Costo.** ~55 líneas · ~25 min del alumno.

### X39 · El reset que viaja a producción, y la sesión propia

*extender · §39 El host y la inyección*

- **Dolor.** La siembra en `Program.cs` se borra tras el primer arranque (el-host-y-la-inyeccion.md:38): aquí nace la tentación de volverla un endpoint de limpieza. Y el 🔨 de la sesión cubre el campo `static`, no la forma que usa la organización: abrir una sesión propia dentro del handler.
- **Cura.** El reset se registra solo si `app.Environment.IsDevelopment()`, con un flag apagado por defecto. Se separa el rearmado de vistas (re-derivable, el comando de N4) del borrado del diario (irreversible). Para retirar un stream, `ArchiveStream`; para empezar limpio, una base desechable. La regla de la sesión queda como "la sesión del mensaje", no solo "no uses static".
- **🔨 Rómpelo.** 🔨 1: `app.MapPost("/dev/reset", …)` con `Advanced.Clean.DeleteAllEventDataAsync()` sin guarda; un `curl` deja `mt_events` vacío y el tablero apuntando a hechos que no existen. 🔨 2: `store.LightweightSession()` dentro del handler; sin `SaveChanges`, el mismo fantasma; con `SaveChanges` propio, el estado va en otra transacción y un fallo posterior lo deja sin sus mensajes.
- **Arrastre.** el-host-y-la-inyeccion.md:82 pasa la política a la base `JasperFx.ConcurrencyException` (X34).
- **Cierra.** S2, Cosmos.Impuestos#1, Cosmos.Contabilidad#1, Cosmos.Terceros.Orquestador#3, ObligacionesPorPagar.Radicacion#4
- **Patrones.** P33, P17
- **Costo.** ~50 líneas · ~25 min del alumno.

### N5 · La configuración viene de afuera

*sección nueva · entre §39 El host y la inyección y §40 En vivo y serverless*

- **Dolor.** El 🆘 de el-host-y-la-inyeccion.md:160 ya lo muestra: si falta `Localizador.cadena`, el servicio arranca sano y falla con 500 en el primer POST, lejos de la causa. La cadena del host sigue en el código y en el historial. Y las credenciales de un socio (la pasarela de `MundoExterno`) llegan como tres strings intercambiables.
- **Cura.** La configuración sale de `builder.Configuration`: user-secrets en desarrollo y tests, variables de entorno, y `AddKeyPerFile` sobre un directorio que simula `/run/secrets` en despliegue. En el repo queda un placeholder. Lo obligatorio se enlaza a tipos propios (`CredencialesPasarela`, `PlazosDeSuspension`) con `ValidateOnStart`: en Production su ausencia tumba el proceso, y el modo nunca se infiere de un valor vacío. Los plazos de §35 y §36 salen del código a la configuración. Criterio: lo que tocó git se rota.
- **🔨 Rómpelo.** 🔨 1: quita el valor; hoy el servicio arranca y falla lejos, con la cura no arranca. 🔨 2: dos credenciales invertidas compilan; con un tipo propio, no.
- **Molde.** Entradas (secretos por Swarm secrets con `AddKeyPerFile`); ApplicationPlane (`Jwt:Authority` falla al arrancar).
- **Cierra.** S1, ObligacionesPorPagar.Entradas#1, ObligacionesPorPagar.Reconocimiento#1, ApplicationPlane#1, S3, ObligacionesPorPagar.Integraciones#6, Cosmos.Terceros.Orquestador#8
- **Patrones.** P06, P34
- **Costo.** ~150 líneas · ~50 min del alumno.

### N6 · Lo que acabas de pedir

*sección nueva · después de N5*

- **Dolor.** El host solo expone un `MapPost` que responde `Results.Ok()` (el-host-y-la-inyeccion.md:94-98). Al sumar el GET del tablero, la UI que pide una suspensión y lee enseguida recibe 404 o una lista sin la empresa: aún no proyectado, no existe y terminó se ven igual. Un chequeo de existencia contra el tablero responde 404 a una empresa recién sembrada. Y el POST espera el handler entero con `InvokeAsync`; si fuera lento, el reintento del cliente lo corre dos veces.
- **Cura.** El POST encola durable (`SendAsync`) y responde 202 + `Location` con el `SuspensionId` como id de seguimiento. El GET mira el diario (`FetchStreamStateAsync`) para responder "en proceso" en vez de 404. La existencia y las decisiones se verifican contra el diario; la vista queda para el listado. La respuesta lleva la secuencia escrita y un header de rezago (high-water − progreso, como §37), y distingue pendiente de cero. El reintento del cliente lleva una llave de idempotencia (un header `Idempotency-Key`), como la referencia de §31, y el segundo POST con la misma llave devuelve el mismo id de seguimiento. El listado lleva un tope duro (`Take`) y un índice sobre su orden.
- **🔨 Rómpelo.** 🔨 1: POST de suspender y GET inmediato del tablero: hoy 404; con la cura, 202 y "en proceso". 🔨 2: envuelve la lectura del diario en un reintento con espera (0, 150 y 350 ms) y pide una empresa que no existe. El 404 tarda medio segundo más y nunca cambia: el diario no va atrás, así que esperar solo vale para la vista.
- **Molde.** Orquestador: 202-Accepted + push, en vez de fingir sincronía.
- **Cierra.** Cosmos.ControlPlane#8, ObligacionesPorPagar.Reconocimiento#7, Cosmos.Asistente#4, ApplicationPlane#5, Cosmos.Impuestos#5, Cosmos.Terceros#7, L6, Cosmos.Asistente#9
- **Patrones.** P35, P27, P26
- **Costo.** ~160 líneas · ~55 min del alumno.

### N7 · El borde es un contrato

*sección nueva · después de N6*

- **Dolor.** Un `GET /empresas/{id}/historia` que sirve `mt_events` crudo (el `Data` y el nombre de clase) se rompe con el primer renombre de un campo. Registrar una empresa con un NIT repetido responde 500, y el manejador ingenuo (`Results.Problem(detail: ex.Message)`) le cuenta al cliente detalles internos de Npgsql.
- **Cura.** La historia sale por un DTO por tipo de hecho, con el alias estable de §29: es la lección de §27 llevada a HTTP. Los conflictos de negocio se responden 409: el duplicado del localizador o del índice, y el choque de concurrencia agotado, recorriendo las excepciones anidadas de JasperFx. `AddProblemDetails` + `UseExceptionHandler` dan un mensaje genérico con `traceId`; el detalle va al log y solo se muestra en Development. Un test de aceptación exige 409 y no 500.
- **🔨 Rómpelo.** 🔨 1: renombra un campo de `EmpresaRegistrada` y mira el cliente de la historia romperse. 🔨 2: con `curl`, registra dos veces el mismo NIT y lee lo que recibe el cliente.
- **Molde.** Asistente (409 recorriendo excepciones anidadas); Impuestos (test de aceptación que exige 409); Contabilidad (`ExistingStreamIdCollisionException` → 409).
- **Cierra.** Cosmos.EstructuraOrganizacional#7, Cosmos.Terceros#6, ObligacionesPorPagar.Entradas#8, T3, Cosmos.Terceros#1, Cosmos.EstructuraOrganizacional#2, Cosmos.DatosReferencia#3
- **Patrones.** P13, P36
- **Costo.** ~140 líneas · ~45 min del alumno.

### N8 · Seguir una acción

*sección nueva · después de N7*

- **Dolor.** El usuario reporta que suspendió y no pasó nada, con el `traceId` de N7, y no hay cómo seguir su petición por el handler, Facturación y Accesos. Los handlers escriben con `Console.WriteLine` y descartan en silencio (`if (hechos.Length == 0) return null;`, el-proceso-tiene-dueno.md:267). Y quien loguea el comando completo deja NIT y montos en la consola.
- **Cura.** El borde acepta o genera un `X-Correlation-Id`. Wolverine lo lleva en el sobre y Marten lo graba en la metadata del hecho (`MetadataConfig.CorrelationIdEnabled`). Los handlers usan un logger con propiedades nombradas (`{SuspensionId}`) y un Warning en cada return que descarta. El log lleva ids y correlación, no el payload: el hecho ya está en `mt_events`.
- **🔨 Rómpelo.** Loguea el comando completo a Debug y mira el NIT y el monto en la consola; luego encuentra el mismo hecho en `mt_events` por su correlación.
- **Molde.** Entradas: aserciones sobre el log estructurado, tratado como contrato.
- **Verificar antes (spike).** Cómo inyecta Wolverine 6.51.0 un logger en un handler `static` (C# no admite `ILogger<ClaseStatic>`); que la correlación llegue a `mt_events`.
- **Cierra.** ApplicationPlane#4, Cosmos.Terceros.Orquestador#7, ObligacionesPorPagar.Integraciones#9
- **Patrones.** P37
- **Costo.** ~120 líneas · ~40 min del alumno.

### N9 · Dos hosts, una configuración

*sección nueva · después de N8*

- **Dolor.** Nace un segundo proceso: un worker que también registra empresas, con su propia copia de `AddMarten`. Lo que escribe no pasa por la vista Inline de N3, y un NIT duplicado entra. Un flag global escondido en un `IConfigureMarten` local cambia la columna de otro documento. Se arregla la copia que no corre. El host de consultas apunta a otro esquema y responde 200 con `[]`, entra al clúster durable, y dos instancias migran el esquema a la vez.
- **Cura.** Una función de configuración compartida que usan el host web, el worker y el host de tests: lo global va en la base, y cada pieza local toca solo lo suyo. Cada host declara su rol: `DaemonMode.Disabled` en las réplicas, `DurabilityMode.MediatorOnly` en el de consultas, un solo dueño del esquema y `AutoCreate.None` en el resto. El arnés de tests es el tercer consumidor de esa función, y su primer test de aceptación fija la carrera de §34 por el bus: N comandos en paralelo dan 1 OK y N−1 conflictos. `MapEventType` vive en la configuración compartida; dos agregados con un hecho de igual nombre corto muestran por qué.
- **🔨 Rómpelo.** 🔨 1: el worker sin la Inline deja entrar el NIT duplicado. 🔨 2: el flag global, visto en `\d mt_doc_…` (`timestamptz` pasa a `timestamp`); y el mismo cambio hecho en la copia de configuración que no corre deja `\d` igual. 🔨 3: quita la línea crítica de un host y mira caer el test de aceptación.
- **Molde.** BuildingBlocks (una sola función base de configuración); Terceros y Contabilidad (registro único de proyecciones para hosts y tests; migración bajo `pg_advisory_lock`); ControlPlane (config-test que construye el store real).
- **Verificar antes (spike).** La colisión de nombre corto en 9.50.3 (error al arrancar o tipo equivocado); `MediatorOnly` en 6.51.0.
- **Nota.** Es la sección más densa. Si pasa de unas 200 líneas, se parte en "Dos hosts, una configuración" (función compartida y roles) y "El arnés usa la misma configuración".
- **Cierra.** ObligacionesPorPagar.Radicacion#2, ObligacionesPorPagar.Radicacion#3, ObligacionesPorPagar.Radicacion#5, ObligacionesPorPagar.Radicacion#8, Cosmos.Terceros#2, Cosmos.Asistente#10, Cosmos.ControlPlane#6, ObligacionesPorPagar.Entradas#7, ObligacionesPorPagar.Reconocimiento#6, ObligacionesPorPagar.Notificaciones#7, T6, Cosmos.Asistente#8, Cosmos.Contabilidad#6, Cosmos.EstructuraOrganizacional#9, Cosmos.Direcciones#9, Cosmos.Direcciones#8
- **Patrones.** P38, P39, P04, P45
- **Costo.** ~190 líneas · ~75 min del alumno.

### N10 · El broker de verdad

*sección nueva · después de N9*

- **Dolor.** Con RabbitMQ en Docker y dos instancias del host (`--urls`), una publica a un exchange nombrado por su proceso y nadie lo escucha: el mensaje se pierde sin error. Un nombre de cola mal escrito con autoprovisión crea una cola vacía, y el host arranca verde. Matar el proceso con mensajes ya recibidos los pierde, aunque la cola del broker sea durable. Y un productor con dos rutas activas entrega dos veces.
- **Cura.** La topología se nombra por el contexto y es igual en todos sus hosts. El listener usa inbox durable, que persiste antes de procesar. Cada mensaje tiene una sola decisión de ruteo. La autoprovisión queda para Development; en producción la topología la crea la infraestructura y la app verifica al arrancar. La credencial del broker llega por la configuración de N5.
- **🔨 Rómpelo.** Los cuatro dolores de arriba, uno por paso, contra el broker del contenedor.
- **Molde.** Notificaciones (exchange dedicado; gateway que no conoce ningún contexto); Entradas (outbox, inbox y colas locales de punta a punta).
- **Verificar antes (spike).** Configuración de RabbitMQ, `UseDurableInbox` y `AutoProvision` en Wolverine 6.51.0.
- **Nota.** Cambia un criterio de SECUENCIA.md: la honestidad de sentibilidad dice que el broker real no se siente; aquí sí se siente.
- **Cierra.** ObligacionesPorPagar.Reconocimiento#9, ObligacionesPorPagar.Notificaciones#3, ObligacionesPorPagar.Notificaciones#4, ObligacionesPorPagar.Notificaciones#7
- **Patrones.** P40
- **Costo.** ~170 líneas · ~60 min del alumno.

### X40 · La UI se entera de lo confirmado, y lo que el serverless no rearma

*extender · §40 En vivo y serverless*

- **Dolor.** El SSE empuja con `EmpresaSuspendidaV2`, el anuncio de la solicitud (en-vivo-y-serverless.md:17 y :33), y empuja un string con un literal (`eventType: "suspension"`, :38). La advertencia de :17 (no empujar desde un `Apply`) no se vive. Y el serverless no dice quién rearma las Inline ni muestra la cara del fantasma.
- **Cura.** El SSE escucha un contrato público que el `ProcesoDeSuspensionHandler` emite al quedar `SuspensionEfectiva`, y emite un record de `Contratos` con el tipo como constante. El efecto sale de la proyección y va al handler del anuncio, que el outbox entrega una vez. En serverless, con todo Inline, el comando de N4 corre como trabajo administrativo. Tras el spike, la cara del fantasma (un paquete que envía en `PublishAsync`, antes del commit) se conecta con §26 y con el consumidor idempotente obligatorio de §31.
- **🔨 Rómpelo.** 🔨 1: con Accesos en silencio, hoy la UI ya mostró suspendida. 🔨 2: renombrar el literal compila y la UI deja de entender. 🔨 3, el rebuild que llama afuera: el empuje dentro del `Apply` de una proyección, rearmada con el comando de N4, repite cada suspensión histórica.
- **Molde.** Asistente: publicar después del commit; el SSE nunca anuncia lo que no se guardó.
- **Verificar antes (spike).** Cuándo envía `SendInline` en 6.51.0 dentro de un handler con Marten integrado (la evidencia de BuildingBlocks contradice en-vivo-y-serverless.md:59).
- **Nota.** §40 ya tiene dos 💥. Si pasa de unas 170 líneas, se parte en "En vivo" y "Sin host que viva".
- **Cierra.** Cosmos.Terceros.Orquestador#2, Cosmos.Terceros.Orquestador#6, ObligacionesPorPagar.Integraciones#8, Cosmos.BuildingBlocks#8, T4, ObligacionesPorPagar.Radicacion#7
- **Patrones.** P41, P13, P30, P12, P29
- **Costo.** ~70 líneas · ~35 min del alumno.

### X41 · La tenancy se cablea, cruza el bus y se prueba con dos clientes

*extender · §41 El contexto que falta*

- **Dolor.** Hoy es un spike aparte ("no lo cablees a tu app todavía", el-contexto-que-falta.md:40). Nada prueba que el servicio aísla ni que el tenant cruza el bus. Y un arnés de un solo tenant deja pasar fugas en verde.
- **Cura.** La tenancy se cablea al servicio desde la función compartida de N9, en una base nueva. El borde resuelve el tenant (por ahora desde un header; N11 lo cura). El endpoint invoca con `bus.InvokeForTenantAsync(tenant, cmd)` y el handler recibe la sesión del tenant del sobre. El arnés siembra acme y globex. La reserva del NIT es por tenant. Una línea: el tenant desechable es la versión multi-cliente de la base desechable de §39.
- **🔨 Rómpelo.** 🔨 1: invocar con `InvokeAsync` sin tenant hace lanzar el fail-fast en el handler; un resolver que lee el `HttpContext` una sola vez escribe en el tenant de la petición, no en el del mensaje. 🔨 2: una fábrica de test con su propio `DocumentStore.For` sin tenancy deja verde una fuga; un test con un solo tenant pasa con el aislamiento apagado, y solo el de dos tenants discrimina. 🔨 3: un índice global choca entre tenants, y sin índice el duplicado entra dentro de uno.
- **Molde.** Impuestos (índice único `PerTenant`); BuildingBlocks (fail-fast sin tenant por defecto).
- **Verificar antes (spike).** `InvokeForTenantAsync` con conjoined + `IntegrateWithWolverine`; documentos multi-tenant; que la fuga del arnés se pueda provocar con el juguete.
- **Nota.** Es la extensión más grande. Si pasa de unas 220 líneas, se parte en "El contexto que falta" (cablear y cruzar el bus) y "Probar que aísla" (arnés de dos tenants y reserva por tenant).
- **Cierra.** T6, Cosmos.Asistente#8, Cosmos.Contabilidad#6, Cosmos.EstructuraOrganizacional#9, Cosmos.Direcciones#9, Cosmos.EstructuraOrganizacional#2, Cosmos.BuildingBlocks#5, Cosmos.Contabilidad#1
- **Patrones.** P39, P42, P09, P33
- **Costo.** ~120 líneas · ~50 min del alumno.

### N11 · El tenant viene firmado

*sección nueva · entre §41 El contexto que falta y §42 Observar el motor nuevo*

- **Dolor.** El header `X-Tenant-Id` de §41 lo elige el cliente: con un token de acme y `-H "X-Tenant-Id: globex"`, la petición lee y escribe en globex. El canal en vivo de §40 no pide autenticación y empuja a todos: con dos tenants, el cliente de acme ve las suspensiones de globex. Si el grupo lo pide el cliente (`?grupo=globex`), el cliente elige qué escuchar; y un anuncio sin destino cae a todos los conectados. Un endpoint anónimo nuevo, envuelto en `if (autenticado)`, escribe sin tenant. Y la historia atribuye cada acto a un email que puede cambiar.
- **Cura.** `AddAuthentication().AddJwtBearer` con tokens locales (`dotnet user-jwts create --claim tenant=acme`). El middleware toma el tenant solo del claim y quita el header entrante antes de inyectar el del claim. El borde es fail-closed: todo exige tenant y usuario, salvo una lista explícita de rutas exentas (`/healthz`). El SSE pide autorización, deriva el grupo del claim, y su destino es tipado (usuario, grupo o broadcast): si falta, lanza. El actor se graba con el `sub` estable; el email viaja aparte, para mostrar. Criterio de red: los servicios no se alcanzan saltándose el gateway.
- **🔨 Rómpelo.** Los dolores de arriba, uno por paso, con `curl` y dos tokens locales.
- **Molde.** ApplicationPlane: el anti-spoofing que remueve el header antes de inyectar el del claim, con su test; la lista declarativa única `propagatedClaims`.
- **Verificar antes (spike).** Grabar el actor en la metadata de Marten 9.50.3 (`UserNameEnabled`/`LastModifiedBy`).
- **Nota.** Deja de valer la frase de el-contexto-que-falta.md:74 ("no la vives entera").
- **Cierra.** S3, Cosmos.Contabilidad#2, Cosmos.Terceros#9, ApplicationPlane#3, ApplicationPlane#2, ObligacionesPorPagar.Notificaciones#1, ObligacionesPorPagar.Notificaciones#2
- **Patrones.** P43
- **Costo.** ~175 líneas · ~60 min del alumno.

### N12 · El trabajo que nadie pidió

*sección nueva · después de N11*

- **Dolor.** El `ProcesoMensual` de §32 se vuelve recurrente: su handler se reprograma al final con `DelayedFor`. Lanza una vez, cae a dead letters, y nadie cobra el mes siguiente: la consulta de `Scheduled` queda vacía, sin error. Con tenancy, ese trabajo no nace de una petición y no hay claim: abre una sesión sin tenant. Y la réplica de N2 se llavea solo por NIT: como la reserva del NIT es por tenant (§41), la misma llave existe en acme y en globex, y el plan de una empresa pisa el de la otra.
- **Cura.** Un disparador programa la siguiente vuelta y envía el trabajo como un mensaje aparte, para que el fallo del trabajo no corte la cadena. Hay una ignición al arrancar y un observador de "no hay próxima vuelta programada". El trabajo recorre los tenants conocidos y envía uno por tenant (el tenant viaja en el sobre, también en los mensajes programados). Toda llave del consumidor incluye el tenant: `(tenant, nit)`.
- **🔨 Rómpelo.** Los tres dolores de arriba: la cadena que se corta, la sesión sin tenant y la llave sin tenant.
- **Molde.** Orquestador: el timeout como mensaje diferido durable, que viaja con tenant y `user_id`.
- **Cierra.** ObligacionesPorPagar.Entradas#3, ObligacionesPorPagar.Entradas#4, Cosmos.Direcciones#1
- **Patrones.** P44, P42
- **Costo.** ~150 líneas · ~50 min del alumno.

### X42 · De mirar a que te avise

*extender · §42 Observar el motor nuevo*

- **Dolor.** El alumno mide mirando, y nada le avisa. Las consultas no comparan lo declarado con lo que existe. Y la correlación de N8 no se sigue desde el esquema.
- **Cura.** Pregunta (5), "¿existe lo que declaré, y lo usa la consulta?": declarar un índice (`Duplicate`) para una búsqueda que no es por id, comprobarlo en `pg_indexes`, y medir con `EXPLAIN` antes y después. La consulta del rezago pasa a un `IHealthCheck` que se degrada sobre un umbral declarado, más un readiness que exige la réplica de N2 poblada; se menciona su exportación como métrica. Diagnosticar desde afuera no reemplaza alertar desde adentro. Y una acción se sigue por `correlation_id` en `mt_events`, de un contexto a otro. La consulta (1) de longitudes enlaza con N13, y la de `Scheduled` es el observador de N12.
- **🔨 Rómpelo.** 🔨 1: declara el índice fuera de la configuración que corre (o con el tipo de columna equivocado). `pg_indexes` no lo tiene, y `EXPLAIN` muestra `Seq Scan`. 🔨 2: arranca el host con el daemon apagado (`DaemonMode.Disabled`) y suspende varias empresas. Sin el check, `/healthz` responde Healthy mientras el rezago sube; con el check, pasa a Degraded sobre el umbral. 🔨 3: reinicia el servicio con la tabla de la réplica de N2 vacía; el readiness responde Unhealthy hasta que la réplica se puebla.
- **Cierra.** ObligacionesPorPagar.Reconocimiento#5, Cosmos.Terceros.Orquestador#5, Cosmos.Impuestos#10, Cosmos.Direcciones#2, ApplicationPlane#4, ObligacionesPorPagar.Entradas#3, T5, L6
- **Patrones.** P45, P25, P26, P20, P37, P44, P46
- **Costo.** ~85 líneas · ~40 min del alumno.

### N13 · El stream que no para de crecer

*sección nueva · entre §42 Observar el motor nuevo y §43 El comentario que sobrevive*

- **Dolor.** La consulta (1) de §42 marca a emp-9 y emp-11 como candidatos a crecer sin techo. Engordar un stream con miles de hechos y medir `AggregateStreamAsync` muestra el costo: cada comando y cada lectura por id rejuegan desde el primer hecho.
- **Cura.** Un umbral de alerta. Para la escritura, `Snapshot<Empresa>(SnapshotLifecycle.Inline)` leído por el camino que lo usa (`FetchForWriting`/`FetchLatest`). Para la lectura por id, la vista de detalle de N3. Y la otra salida: acortar el stream (cierre de período, archivado, un stream por instancia como en §36) o partir el agregado si la regla no necesita a todos los hijos a la vez. El árbol de N1 es el contraste: ahí la regla sí los necesita.
- **🔨 Rómpelo.** 🔨 1: registrar el snapshot y seguir leyendo con `AggregateStreamAsync`; el tiempo no cambia. 🔨 2: un snapshot Async leído con `LoadAsync` para decidir; decide sobre algo atrasado (el dolor de §19, en la escritura). 🔨 3: el snapshot vuelve en blanco por los setters privados de §37 hasta que la serialización los incluye (`[JsonInclude]`), con el criterio del acople.
- **Verificar antes (spike).** `[JsonInclude]` con los setters privados de `Empresa`; `FetchLatest` con snapshot Inline en 9.50.3.
- **Nota.** §45 lo hereda: `FetchForWriting` usa el snapshot Inline.
- **Cierra.** T5, Cosmos.Impuestos#7, Cosmos.Asistente#7, Cosmos.Terceros#8, Cosmos.Contabilidad#7
- **Patrones.** P46, P10
- **Costo.** ~170 líneas · ~60 min del alumno.

### X43 · Más líneas silenciosas, y el test que las protege

*extender · §43 El comentario que sobrevive*

- **Dolor.** La lista de el-comentario-que-sobrevive.md:40-48 no incluye la versión esperada, el modo de append, el ciclo de vida de una vista ni el inbox durable. Y :72 admite que algunas no caben en un test.
- **Cura.** Sumar esas líneas, cada una con su comentario de síntoma. Enlazar el test de aceptación de N9: el rojo protege lo que el comentario solo explica. Y la semilla hacia §44: la documentación que se usa como evidencia se compila.
- **Cierra.** ObligacionesPorPagar.Radicacion#5, Cosmos.Terceros#2, Cosmos.Terceros#5, Cosmos.EstructuraOrganizacional#10, ObligacionesPorPagar.Notificaciones#3, L7
- **Patrones.** P05, P38, P28, P40, P16
- **Costo.** ~20 líneas · ~10 min del alumno.

### X44 · El doble fiel, lo que solo el Apply cambia, y el README que compila

*extender · §44 La plantilla*

- **Dolor.** El doble de la unidad de trabajo se despacha en una frase (la-plantilla.md:116), y :180 afirma que Marten necesita `Apply` públicos. Con `Emitir` que ya no aplica, un verbo puede asignar estado fuera de su `Apply`. La plantilla no dice cuándo no usarla. Y no tiene README.
- **Cura.** El doble descubre los `Apply` por reflexión con `Public` y `NonPublic`, recorriendo la jerarquía, y un test de contrato corre el mismo dado/cuando/entonces contra el doble y contra Marten (arnés de §24 y §37). Una comprobación fija que el agregado rehidratado es igual al de memoria. Un perfil solo-documentos, y la decisión de §21 escrita en la guía de la plantilla: cuándo no usarla. Un README cuyo ejemplo es un test compilado, con la versión tomada del csproj.
- **🔨 Rómpelo.** 🔨 1: buscar los `Apply` solo con `BindingFlags.Public` y un `Apply` privado deja el estado por defecto, con el test en verde. 🔨 2: en `Registrar`, asignar `Nombre` fuera de `Apply(EmpresaRegistrada)`; en memoria se ve bien y al rehidratar sale vacío. 🔨 3: seguir la plantilla para el catálogo `Plan` mete event store y daemon sobre un diario vacío. 🔨 4: cambiar una firma deja el README mintiendo, y su test cae.
- **Molde.** Terceros (dominio event-sourced sin una sola referencia a Marten); DatosReferencia (decidir no usar event sourcing frente a una plantilla que lo empuja).
- **Verificar antes (spike).** La afirmación de la-plantilla.md:180 contra 9.50.3.
- **Cierra.** L3, Cosmos.BuildingBlocks#7, Cosmos.Contabilidad#9, Cosmos.DatosReferencia#5, Cosmos.DatosReferencia#8, Cosmos.Terceros.Orquestador#8, L7, ObligacionesPorPagar.Integraciones#10, Cosmos.BuildingBlocks#9
- **Patrones.** P47, P02, P08, P16
- **Costo.** ~110 líneas · ~50 min del alumno.

### N14 · La plantilla dentro del handler

*sección nueva · entre §44 La plantilla y §45 El capstone*

- **Dolor.** La plantilla se opera desde `Program.cs` (la-plantilla.md:94 y :158). Dentro de un handler de Wolverine que devuelve el anuncio, su `CommitAsync` hace su propio `SaveChanges`: son dos transacciones. Y en el mismo handler, `Registrar("emp-3")` seguido de `Cargar("emp-3")` devuelve null, que revienta lejos, en `Suspender`.
- **Cura.** Dentro del handler, la unidad de trabajo solo vuelca a la sesión que Wolverine enlistó, y confirma `AutoApplyTransactions`: el arreglo es quitar código. La unidad de trabajo pasa a middleware o política de Wolverine, y el handler solo decide. `Cargar` resuelve primero lo que la unidad de trabajo ya rastrea, y lanza `AgregadoNoEncontrado(id)` si el stream no existe (o devuelve `T?` y obliga a decidir). Un test en el host real (arnés de N9): un handler que no llama a nada deja sus hechos en `mt_events`, e invertir el orden del middleware lo pone rojo.
- **🔨 Rómpelo.** 🔨 1: lanzar justo después del `CommitAsync`; el hecho queda y el anuncio no sale. 🔨 2: dos `CommitAsync` (empresa y proceso) con un throw en medio dejan la empresa suspendida sin su proceso. 🔨 3: registrar y cargar en la misma unidad de trabajo da null y una NRE lejos de la causa.
- **Verificar antes (spike).** Que `AggregateStreamAsync` no ve un `StartStream` pendiente en la misma sesión (9.50.3); el orden del middleware frente a `AutoApplyTransactions`.
- **Cierra.** T1, ObligacionesPorPagar.Radicacion#6, Cosmos.DatosReferencia#4, ObligacionesPorPagar.Entradas#5, ObligacionesPorPagar.Reconocimiento#2, L2, Cosmos.BuildingBlocks#1, Cosmos.BuildingBlocks#9, Cosmos.Contabilidad#8, Cosmos.BuildingBlocks#10
- **Patrones.** P17, P48, P04
- **Costo.** ~170 líneas · ~60 min del alumno.

### X45 · El test que queda, y la versión que vio el usuario

*extender · §45 El capstone: FetchForWriting*

- **Dolor.** El test del conflicto (Paso 2) es un bloque de `Program.cs` que se corre a ojo y se borra. Y la versión esperada solo protege dentro de una petición: un GET, una edición y un PUT en peticiones distintas pierden la primera edición.
- **Cura.** El Paso 2 pasa a un `[Fact]` del arnés de N9 (`Assert.ThrowsAsync<…>`). Paso 3, la versión que vio el usuario: el GET devuelve la versión (ETag), el PUT la manda en `If-Match`, y se impone con `FetchForWriting(id, expectedVersion)`. El retrofit conserva la cura de N14 para un stream que nace en la misma unidad de trabajo, y hace caer el README-test de §44, que se actualiza.
- **🔨 Rómpelo.** 🔨 1: quitar `FetchForWriting` de `Cargar` pone el test en rojo. 🔨 2: comparar la versión en un `if` en memoria pasa en verde y, en paralelo, pierde la actualización.
- **Arrastre.** el-capstone-fetchforwriting.md:98 pasa la política a la base `JasperFx.ConcurrencyException` (X34).
- **Cierra.** Cosmos.Direcciones#8, Cosmos.EstructuraOrganizacional#1, Cosmos.Direcciones#5, L2, Cosmos.BuildingBlocks#1, ObligacionesPorPagar.Integraciones#10, ObligacionesPorPagar.Radicacion#4, L1
- **Patrones.** P04, P49, P48, P16, P05
- **Costo.** ~70 líneas · ~35 min del alumno.

---

## La cadena resultante

Las secciones nuevas se insertan donde nace su dolor; ninguna sección existente cambia de orden relativo. La columna **Cambio**
dice qué propuesta toca esa posición. Esta tabla es el plan, de 59 posiciones; la columna **Posición final** dice dónde quedó
cada una en la cadena de 70 (un rango, si la posición se partió en dos o tres secciones).

| Nuevo # (plan) | Sección | Hoy (§ del plan) | Cambio | Posición final |
|---|---|---|---|---|
| 1 | El diario de una empresa | §1 | — | 1 |
| 2 | Los primeros hechos | §2 | — | 2 |
| 3 | Refactorizando el motor | §3 | X3 | 3 |
| 4 | El flujo de vida | §4 | — | 4 |
| 5 | Decidir el futuro | §5 | — | 5 |
| 6 | El Command Handler | §6 | — | 6 |
| 7 | El despachador | §7 | — | 7 |
| 8 | El almacén por id | §8 | — | 8 |
| 9 | Concurrencia optimista | §9 | — | 9 |
| 10 | Un acto, dos hechos | §10 | — | 10 |
| 11 | El agregado recuerda | §11 | — | 11 |
| 12 | Verde, y roto | §12 | X12 | 12 |
| 13 | El diario en disco | §13 | — | 13 |
| 14 | El nombre es un contrato | §14 | — | 14 |
| 15 | Todo o nada | §15 | X15 | 15 |
| 16 | La vista de lectura | §16 | — | 16 |
| 17 | Reconstruir la vista | §17 | — | 17 |
| 18 | La vista se mantiene sola | §18 | — | 18 |
| 19 | El rezago | §19 | — | 19 |
| 20 | El proyector tropieza | §20 | X20 | 20 |
| 21 | ¿Merecía event sourcing? | §21 | X21 | 21 |
| 22 | El puerto propio | §22 | — | 22 |
| 23 | Dos streams, la misma clave | §23 | — | 23 |
| 24 | **El árbol de empresas** | nueva | N1 | 24–25 |
| 25 | La forma del hecho se congela | §24 | X24 | 26 |
| 26 | La vista por consulta | §25 | — | 27 |
| 27 | El hecho y su anuncio | §26 | X26 | 28 |
| 28 | El evento público | §27 | X27 | 29 |
| 29 | El mensaje y la cola | §28 | X28 | 30 |
| 30 | El swap por reconocimiento | §29 | X29 | 31 |
| 31 | El outbox | §30 | X30 | 32 |
| 32 | Llegó dos veces | §31 | X31 | 33 |
| 33 | El contrato lleva lo justo | §32 | X32 | 34 |
| 34 | **La réplica suscrita** | nueva | N2 | 35 |
| 35 | Dos respuestas, ningún dueño | §33 | X33 | 36 |
| 36 | Dos respuestas a la vez | §34 | X34 | 37 |
| 37 | Deshacer en tres sistemas | §35 | X35 | 38 |
| 38 | El proceso tiene dueño | §36 | X36 | 39 |
| 39 | El daemon y la consistencia eventual | §37 | X37 | 40 |
| 40 | **La vista en la misma transacción** | nueva | N3 | 41 |
| 41 | **Reconstruir con el daemon** | nueva | N4 | 42 |
| 42 | El tablero cruza streams | §38 | X38 | 43 |
| 43 | El host y la inyección | §39 | X39 | 44 |
| 44 | **La configuración viene de afuera** | nueva | N5 | 45 |
| 45 | **Lo que acabas de pedir** | nueva | N6 | 46–47 |
| 46 | **El borde es un contrato** | nueva | N7 | 48 |
| 47 | **Seguir una acción** | nueva | N8 | 49 |
| 48 | **Dos hosts, una configuración** | nueva | N9 | 50–51 |
| 49 | **El broker de verdad** | nueva | N10 | 52–53 |
| 50 | En vivo y serverless | §40 | X40 | 54 |
| 51 | El contexto que falta | §41 | X41 | 55–56 |
| 52 | **El tenant viene firmado** | nueva | N11 | 57 |
| 53 | **El trabajo que nadie pidió** | nueva | N12 | 58–59 |
| 54 | Observar el motor nuevo | §42 | X42 | 60–61 |
| 55 | **El stream que no para de crecer** | nueva | N13 | 62 |
| 56 | El comentario que sobrevive | §43 | X43 | 63 |
| 57 | La plantilla | §44 | X44 | 64–66 |
| 58 | **La plantilla dentro del handler** | nueva | N14 | 67–68 |
| 59 | El capstone: FetchForWriting | §45 | X45 | 69–70 |

Al aplicar la cadena hay que re-hilar los ⬅️/➡️ y los ganchos de entrada de la sección que sigue a cada inserción, y
actualizar `SECUENCIA.md` y `DUDAS.md`.

---

## Lo que el propio taller tiene que dejar de enseñar

Varios antipatrones de la auditoría están hoy **en el código del taller**. Un alumno que copia el taller los copia. Cada uno se
corrige dentro de la propuesta indicada.

| Lo que el taller hace hoy | Dónde | Lo corrige |
|---|---|---|
| La contraseña literal en la cadena de conexión, y un `const Cadena` en el código | todo-o-nada.md:213; la-vista-de-lectura.md:161; llego-dos-veces.md:38 y :51; el-host-y-la-inyeccion.md:59 | X15, N5 |
| Borrar con DELETE en psql sobre `mt_doc_*` y `mt_event_progression` para rearmar | el-daemon-y-la-consistencia-eventual.md:138; el-tablero-cruza-streams.md:173-174 | N4 |
| Sembrar el localizador con un `INSERT` en psql, fuera de la transacción del hecho | el-swap-por-reconocimiento.md:25; dos-respuestas-a-la-vez.md:32; el-host-y-la-inyeccion.md:51 | X29 |
| Dejar que Marten nombre los hechos por su clase, sin fijar el alias | dos-respuestas-ningun-dueno.md:136; observar-el-motor-nuevo.md:38 | X29 |
| Esperar la vista con `Task.Delay(3000)` | el-daemon-y-la-consistencia-eventual.md:123 | X37 |
| La política de reintento sobre una subclase de la excepción de concurrencia | dos-respuestas-a-la-vez.md:115; el-host-y-la-inyeccion.md:82; el-capstone-fetchforwriting.md:98 | X34, X39, X45 |
| Un `CommitAsync` que confirma por su cuenta | la-plantilla.md:58; el-capstone-fetchforwriting.md:65 | N14 |
| `Cargar` que devuelve null en silencio, y el `!` en los handlers | la-plantilla.md:50-52; dos-respuestas-a-la-vez.md:40-41 y :135; dos-respuestas-ningun-dueno.md:255; el-proceso-tiene-dueno.md:137 y :266 | N14 |
| `Console.WriteLine` en los handlers y returns que descartan sin dejar rastro | dos-respuestas-a-la-vez.md:40-41; deshacer-en-tres-sistemas.md:303; el-proceso-tiene-dueno.md:267 | N8 |
| `VistaSuspendida` registrada sin nadie que la consulte después de §38 | el-host-y-la-inyeccion.md:36 y :67 | X38 |
| El endpoint que espera el handler entero y responde `Results.Ok()` | el-host-y-la-inyeccion.md:94-98 | N6 |
| Plazos de negocio fijos en el código | deshacer-en-tres-sistemas.md:294; el-proceso-tiene-dueno.md:225 | N5 |
| El SSE que empuja la solicitud, no lo confirmado, con un string literal | en-vivo-y-serverless.md:17, :33 y :38 | X40 |
| El único snapshot del taller es Async y vuelve en blanco | el-daemon-y-la-consistencia-eventual.md:132-138 | N13 |

**Frases que cambian de criterio**

- **llego-dos-veces.md:100 y :116**: "dedup por el id del mensaje, no por un dato del negocio" pasa a "dedup por la llave que identifica el hecho: el sobre para la reentrega, la referencia del origen para el acto repetido, nunca un dato que solo se parece". *(X31)*
- **el-evento-publico.md:23**: "solo primitivos" pasa a "primitivos con significado". *(X27)*
- **el-swap-por-reconocimiento.md:25**: "Ese camino queda como criterio: el taller no lo construye" deja de valer: el taller lo construye. *(X29, N3)*
- **la-plantilla.md:180**: la afirmación sobre `Apply` públicos se revisa contra 9.50.3. *(X44)*
- **el-contexto-que-falta.md:40 y :74**: deja de ser un spike aparte, y el borde con JWT sí se vive. *(X41, N11)*
- **en-vivo-y-serverless.md:59**: cuándo envía `SendInline` se fija con un spike, porque la evidencia de BuildingBlocks lo contradice. *(X40)*
- **el-puerto-propio.md (el dolor de §22)**: habla de una suite contra Postgres antes de que exista el fixture. *(X24)*
- **la-forma-del-hecho-se-congela.md:3**: el gancho de entrada se re-hila, porque N1 queda en medio. *(N1)*
- **SECUENCIA.md, "Honestidad de sentibilidad"**: el broker real y el JWT pasan de criterio explicado a dolor vivido. *(N10, N11)*

---

## Antes de escribir: lo que hay que verificar

Estas afirmaciones técnicas se prueban con un spike contra **Marten 9.50.3** y **WolverineFx 6.51.0** antes de escribir la
sección. Si el spike contradice el plan, manda el spike y se re-hila la propuesta.

| Propuesta | Qué verificar |
|---|---|
| X29 | Excepción del `Insert` duplicado; si 9.50.3 lanza o salta en silencio con un alias desconocido; API del upcaster en 9.50.3. |
| X34 | Qué tipo lanza el choque en cada `EventAppendMode` en 9.50.3 (existen dos `EventStreamUnexpectedMaxEventIdException`). |
| X36 | Si en WolverineFx 6.51.0 los `PublishAsync` concurrentes (`Task.WhenAll`) sobre el mismo contexto del handler pierden, duplican o lanzan de forma reproducible. |
| X37 | Reset con el daemon vivo; el hueco de secuencia del 🆘 de :158 al esperar. |
| N3 | `UniqueIndex` sobre un documento Inline en 9.50.3 y la excepción que lanza. |
| N4 | Qué cambia la versión de una proyección en 9.50.3 (shard, tabla); el rebuild de una Inline; si la duplicación aparece con SingleStream o hay que mostrarla con MultiStream. |
| N8 | Cómo inyecta Wolverine 6.51.0 un logger en un handler `static` (C# no admite `ILogger<ClaseStatic>`); que la correlación llegue a `mt_events`. |
| N9 | La colisión de nombre corto en 9.50.3 (error al arrancar o tipo equivocado); `MediatorOnly` en 6.51.0. |
| N10 | Configuración de RabbitMQ, `UseDurableInbox` y `AutoProvision` en Wolverine 6.51.0. |
| X40 | Cuándo envía `SendInline` en 6.51.0 dentro de un handler con Marten integrado (la evidencia de BuildingBlocks contradice en-vivo-y-serverless.md:59). |
| X41 | `InvokeForTenantAsync` con conjoined + `IntegrateWithWolverine`; documentos multi-tenant; que la fuga del arnés se pueda provocar con el juguete. |
| N11 | Grabar el actor en la metadata de Marten 9.50.3 (`UserNameEnabled`/`LastModifiedBy`). |
| N13 | `[JsonInclude]` con los setters privados de `Empresa`; `FetchLatest` con snapshot Inline en 9.50.3. |
| X44 | La afirmación de la-plantilla.md:180 contra 9.50.3. |
| N14 | Que `AggregateStreamAsync` no ve un `StartStream` pendiente en la misma sesión (9.50.3); el orden del middleware frente a `AutoApplyTransactions`. |

### Lo que ya dijeron los spikes

| Spike | Resultado (Marten 9.50.3 · WolverineFx 6.51.0) | Cambia el plan |
|---|---|---|
| X29 | El localizador como documento con `session.Insert` en la misma sesión que `StartStream` hace el alta atómica y deja un solo ganador (50 de 50 rondas concurrentes); el duplicado lanza `JasperFx.DocumentAlreadyExistsException`. `Store` en vez de `Insert` sobrescribe en silencio. Renombrar **o mover de namespace** la clase de un hecho rompe la lectura con `UnknownEventTypeException` si los hechos no se registran con `AddEventType` (y `MapEventType` cuando cambia el nombre). El upcaster que funciona es `Upcast<V1,V2>("alias_viejo", f)` junto con `MapEventTypeWithSchemaVersion<V2>(2)`; sin esto último pierde el dato en silencio. `AllKnownEventTypes()` fija los alias en un test sin base de datos. `[MessageIdentity]` existe y cambia el `message_type`. | X29 añade el registro explícito de los hechos (no solo el alias al renombrar). |
| X34 | Hay **un solo** `EventStreamUnexpectedMaxEventIdException` (de `JasperFx.Events`, hereda de `JasperFx.ConcurrencyException`) y el modo de append no cambia el tipo. La política sobre la base atrapa el choque en los tres modos y cubre las sagas; ninguna atrapa la carrera de dos que crean el mismo stream nuevo. | Se descarta el 🔨 2 de X34; la política sobre la base se mantiene como patrón. |
| X44 | Marten 9 (9.2.1–9.50.3) solo llama `Apply` **públicos**: uno privado se salta en silencio (el mismo pago dos veces deja dos `pago_registrado`); todos privados → `InvalidProjectionException`. Marten 8.23 sí veía los privados. El doble que ve privados da verdes falsos; el fiel busca solo públicos. Un test de contrato doble-contra-Postgres lo vigila, pero no caza un verbo que asigna estado fuera del `Apply`: eso pide su propia comprobación. | L3 y BuildingBlocks#7 se cierran con `Apply` públicos + contrato, no con `NonPublic`. |
| X38 | Asignar el `Id` en el `Apply` de una proyección no rompe nada en 9.50.3: Marten impone el id de la regla (SingleStream y MultiStream). La línea no hace nada y miente. `VistaSuspendida` no sobra: el tablero no ve las suspensiones previas al proceso con dueño. | X38 cierra con "la vista gana lector", no con "se retira". |
| X37 | `WaitForNonStaleProjectionDataAsync` existe (`using Marten.Events;`, sobre `IHost` o `IDocumentStore`) y espera a todas las proyecciones; sin daemon lanza `TimeoutException`. Los choques de concurrencia **no** dejan hueco de secuencia (se rellena con `tombstone`); un hueco real lo deja un `seq` sin confirmar o una transacción abierta. `ResetAllMartenDataAsync` coordina con el daemon vivo (16 tests × 5 corridas en verde). El Wait no da consistencia para decidir. | Se corrige el 🆘 de §37 sobre el hueco. |

---

## Si se quieren menos secciones nuevas

La propuesta completa abre 14 secciones porque cada una tiene su propio dolor y meterlas en una sección existente rompe la
regla B5 (una idea por sección). Estas son las fusiones posibles y lo que cuestan.

| Fusión | Ahorra | Lo que se pierde |
|---|---|---|
| N8 se reparte: la correlación como `traceId` en N7, y su seguimiento en §42 | ~40 min | N7 pasa a cuatro conceptos. |
| N12 se reparte: el disparador recurrente (ObligacionesPorPagar.Entradas#3) tras el Paso 3 de §35; el trabajo por tenant (ObligacionesPorPagar.Entradas#4) y la llave con tenant (Cosmos.Direcciones#1) en §41 | ~50 min | §35 y §41 quedan por encima de un largo sano. |
| N10 queda como criterio dentro de N9, sin contenedor de broker | ~60 min | ObligacionesPorPagar.Reconocimiento#9 y ObligacionesPorPagar.Notificaciones#3, #4 y #7 vuelven a *parcial*: se explican, no se viven. |
| N3 y N4 se juntan en una sola sección sobre las vistas en Marten | ~30 min | La sección pasa de cinco conceptos. |
| N1 pasa a segundo caso de §23 | ~30 min | §23 suma una segunda regla de conjunto con su propio dominio (matriz y filial). |

Con las cinco fusiones la cadena queda en 54 posiciones y se ahorran unas 3,5 h de alumno. La recomendación es la versión
completa: las fusiones ahorran poco tiempo y cuestan la regla B5 o el dolor vivido.

---

## La matriz completa

Una fila por accionable. **Patrón**: el principal, y entre paréntesis los de apoyo. **Al planear** y **Secciones al
planear**: la cobertura y las secciones (con su § del plan) que el mapeo verificado relacionaba con el accionable cuando se
escribió el plan (donde se toca, se repite el antipatrón o le corresponde). **Propuesta**: lo que lo cierra; si ya estaba
completo, dónde (con números de línea de entonces). **Final** y **Dónde se vive hoy**: la cobertura al cerrar el trabajo y
las secciones donde el alumno vive el patrón, comprobadas con `grep` sobre `secciones/` (18-oct-2026). En un id parcial, la
sección es donde se vive la parte que sí entró; la razón de lo que falta está en [Estado final](#estado-final-18-oct-2026).

| # | Id | Patrón | Al planear | Secciones al planear (§ del plan) | Propuesta que lo cierra | Final | Dónde se vive hoy |
|---|---|---|---|---|---|---|---|
| 1 | S1 | P06 (+P34) | ninguna | §15, §16, §31, §39 | X15 · N5 | completa | [Todo o nada](secciones/todo-o-nada.md) · [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) |
| 2 | S2 | P33 | parcial | §17, §38, §39, §42 | X39 | completa | [El host y la inyección](secciones/el-host-y-la-inyeccion.md) |
| 3 | S3 | P43 (+P34) | parcial | §39, §41 | N5 · N11 | completa | [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) · [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 4 | L1 | P05 | parcial | §9, §15, §29, §34, §45 | X34 · X45 | completa | [Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md) · [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) |
| 5 | L2 | P48 | parcial | §39, §44, §45 | N14 · X45 | completa | [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) · [Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) |
| 6 | L3 | P47 | parcial | §22, §23, §44 | X44 | completa | [La plantilla se prueba](secciones/la-plantilla-se-prueba.md) |
| 7 | L4 | P15 | parcial | §14, §29, §30, §33, §35 | X29 · X30 · X35 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) · [El outbox](secciones/el-outbox.md) · [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 8 | L5 | P29 | parcial | §17, §25, §37, §38 | N4 · X38 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) · [El tablero cruza streams](secciones/el-tablero-cruza-streams.md) |
| 9 | L6 | P26 | parcial | §19, §37, §38, §42 | X42 · N6 | completa | [La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md) · [Que el servicio avise](secciones/que-el-servicio-avise.md) |
| 10 | L7 | P16 | parcial | §36, §43, §44 | X43 · X44 | completa | [El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md) · [El README que compila](secciones/el-readme-que-compila.md) |
| 11 | T1 | P17 | parcial | §26, §30, §39, §44 | N14 | completa | [El outbox](secciones/el-outbox.md) · [El host y la inyección](secciones/el-host-y-la-inyeccion.md) · [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 12 | T2 | P18 (+P27) | parcial | §19, §31, §32, §36 | X31 · X36 | completa | [Llegó dos veces](secciones/llego-dos-veces.md) · [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md) |
| 13 | T3 | P09 (+P36) | parcial | §23, §29, §34, §39, §41 | X29 · N7 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) · [El borde es un contrato](secciones/el-borde-es-un-contrato.md) |
| 14 | T4 | P29 (+P08, P28) | ninguna | §37, §38, §40 | N3 · N4 · X40 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) · [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 15 | T5 | P46 | parcial | §29, §36, §37, §42 | X42 · N13 | completa | [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) · [El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md) |
| 16 | T6 | P39 | parcial | §22, §37, §41 | N9 · X41 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [Probar que aísla](secciones/probar-que-aisla.md) |
| 17 | Cosmos.BuildingBlocks#1 | P48 | parcial | §39, §44, §45 | N14 · X45 | completa | [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) · [Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) |
| 18 | Cosmos.BuildingBlocks#2 | P05 | completa | §9, §29, §34, §45 | ya cubierto: el-capstone-fetchforwriting.md:53-57 y :84-96 | completa | [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) |
| 19 | Cosmos.BuildingBlocks#3 | P15 | parcial | §14, §24, §29, §36 | X29 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) |
| 20 | Cosmos.BuildingBlocks#4 | P26 | parcial | §19, §37 | X37 | completa | [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) |
| 21 | Cosmos.BuildingBlocks#5 | P42 | ninguna | §41 | X41 | completa | [El contexto que falta](secciones/el-contexto-que-falta.md) |
| 22 | Cosmos.BuildingBlocks#6 | P24 | parcial | §30, §36, §39 | X36 | parcial | [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md) |
| 23 | Cosmos.BuildingBlocks#7 | P47 | parcial | §22, §44 | X44 | completa | [La plantilla se prueba](secciones/la-plantilla-se-prueba.md) |
| 24 | Cosmos.BuildingBlocks#8 | P12 | parcial | §26, §31, §40 | X40 | completa | [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 25 | Cosmos.BuildingBlocks#9 | P48 (+P16) | parcial | §5, §32, §39, §44 | X44 · N14 | completa | [El README que compila](secciones/el-readme-que-compila.md) · [Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) |
| 26 | Cosmos.BuildingBlocks#10 | P17 (+P04) | parcial | §5, §30, §37, §44 | N14 | completa | [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 27 | Cosmos.ControlPlane#1 | P12 | completa | §26, §27, §30 | ya cubierto: el-hecho-y-su-anuncio.md:37-41 y :165; el-outbox.md:108 | completa | [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md) · [El outbox](secciones/el-outbox.md) |
| 28 | Cosmos.ControlPlane#2 | P03 | completa | §31, §33, §35 | ya cubierto: dos-respuestas-ningun-dueno.md:223 y :269-275 | completa | [Dos respuestas, ningún dueño](secciones/dos-respuestas-ningun-dueno.md) |
| 29 | Cosmos.ControlPlane#3 | P12 | completa | §26, §30 | ya cubierto: el-outbox.md:108-112 | completa | [El outbox](secciones/el-outbox.md) |
| 30 | Cosmos.ControlPlane#4 | P15 | parcial | §14, §27, §29, §30, §35 | X29 · X30 · X35 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) · [El outbox](secciones/el-outbox.md) |
| 31 | Cosmos.ControlPlane#5 | P02 | completa | §11, §12, §24, §44 | ya cubierto: verde-y-roto.md:48-80; la-forma-del-hecho-se-congela.md:17-33 | completa | [Verde, y roto](secciones/verde-y-roto.md) · [La forma del hecho se congela](secciones/la-forma-del-hecho-se-congela.md) · [La plantilla se prueba](secciones/la-plantilla-se-prueba.md) |
| 32 | Cosmos.ControlPlane#6 | P29 (+P38) | parcial | §17, §30, §38, §39 | N4 · N9 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) · [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 33 | Cosmos.ControlPlane#7 | P11 | parcial | §12, §17, §25, §37 | X37 | completa | [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) |
| 34 | Cosmos.ControlPlane#8 | P35 | parcial | §19, §37, §38, §39 | N6 | completa | [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) |
| 35 | ApplicationPlane#1 | P34 | parcial | §39, §41 | N5 | completa | [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) |
| 36 | ApplicationPlane#2 | P43 | parcial | §23, §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 37 | ApplicationPlane#3 | P43 | parcial | §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 38 | ApplicationPlane#4 | P37 | parcial | §33, §36, §39, §42 | N8 · X42 | completa | [Seguir una acción](secciones/seguir-una-accion.md) |
| 39 | ApplicationPlane#5 | P35 (+P26) | parcial | §19, §37, §39 | N6 | completa | [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) · [La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md) |
| 40 | Cosmos.Terceros.Orquestador#1 | P05 | completa | §9, §34, §36 | ya cubierto: dos-respuestas-a-la-vez.md:11-72 y :88-117 | completa | [Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md) |
| 41 | Cosmos.Terceros.Orquestador#2 | P41 | parcial | §33, §35, §36, §40 | X40 | completa | [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 42 | Cosmos.Terceros.Orquestador#3 | P17 | parcial | §26, §30, §39 | X39 | completa | [El host y la inyección](secciones/el-host-y-la-inyeccion.md) |
| 43 | Cosmos.Terceros.Orquestador#4 | P12 | completa | §30, §35, §36 | ya cubierto: el-outbox.md:108; deshacer-en-tres-sistemas.md:242; el-proceso-tiene-dueno.md:211-227 | completa | [El outbox](secciones/el-outbox.md) · [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) · [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md) |
| 44 | Cosmos.Terceros.Orquestador#5 | P25 (+P45) | parcial | §31, §36, §42 | X36 · X42 | completa | [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md) · [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) |
| 45 | Cosmos.Terceros.Orquestador#6 | P13 | parcial | §27, §40 | X40 | completa | [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 46 | Cosmos.Terceros.Orquestador#7 | P37 | parcial | §39, §42 | N8 | completa | [Seguir una acción](secciones/seguir-una-accion.md) |
| 47 | Cosmos.Terceros.Orquestador#8 | P34 (+P08) | parcial | §21, §35, §36, §39 | N5 · X44 | completa | [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) · [El README que compila](secciones/el-readme-que-compila.md) |
| 48 | Cosmos.Impuestos#1 | P33 | parcial | §1, §24, §37, §38, §39, §42 | X39 | completa | [El host y la inyección](secciones/el-host-y-la-inyeccion.md) |
| 49 | Cosmos.Impuestos#2 | P20 (+P19) | parcial | §24, §32, §38 | N2 | completa | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 50 | Cosmos.Impuestos#3 | P12 (+P17) | parcial | §26, §30, §40 | X26 · X30 | completa | [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md) · [El outbox](secciones/el-outbox.md) |
| 51 | Cosmos.Impuestos#4 | P32 | parcial | §21, §25, §37, §38, §39 | X38 | completa | [El tablero cruza streams](secciones/el-tablero-cruza-streams.md) |
| 52 | Cosmos.Impuestos#5 | P35 (+P26) | parcial | §19, §24, §37, §39 | N6 | completa | [La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md) |
| 53 | Cosmos.Impuestos#6 | P01 | parcial | §3, §11, §12, §29 | X3 | completa | [Refactorizando el motor](secciones/refactorizando-el-motor.md) · [El agregado recuerda](secciones/el-agregado-recuerda.md) |
| 54 | Cosmos.Impuestos#7 | P46 | parcial | §17, §29, §37, §42 | N13 | completa | [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) · [El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md) |
| 55 | Cosmos.Impuestos#8 | P29 | parcial | §17, §18, §37, §38 | N4 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) |
| 56 | Cosmos.Impuestos#9 | P31 | parcial | §23, §38 | X38 | completa | [El tablero cruza streams](secciones/el-tablero-cruza-streams.md) |
| 57 | Cosmos.Impuestos#10 | P26 | parcial | §19, §37, §42 | X42 | completa | [Que el servicio avise](secciones/que-el-servicio-avise.md) |
| 58 | Cosmos.Asistente#1 | P30 | parcial | §11, §17, §25, §38 | N4 | completa | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) |
| 59 | Cosmos.Asistente#2 | P05 | parcial | §5, §9, §34, §45 | X34 | completa | [Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md) · [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) |
| 60 | Cosmos.Asistente#3 | P29 | parcial | §17, §25, §31, §37 | N4 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) |
| 61 | Cosmos.Asistente#4 | P27 (+P35) | parcial | §19, §29, §37, §39, §41 | N6 | completa | [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) |
| 62 | Cosmos.Asistente#5 | P23 | parcial | §15, §35, §36 | X36 | completa | [El proceso tiene dueño](secciones/el-proceso-tiene-dueno.md) |
| 63 | Cosmos.Asistente#6 | P15 | parcial | §13, §14, §29 | X29 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) |
| 64 | Cosmos.Asistente#7 | P46 | parcial | §19, §37, §42, §45 | N13 | completa | [El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md) |
| 65 | Cosmos.Asistente#8 | P39 | parcial | §22, §41 | N9 · X41 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [Probar que aísla](secciones/probar-que-aisla.md) |
| 66 | Cosmos.Asistente#9 | P27 | parcial | §19, §29, §37 | N6 | completa | [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) |
| 67 | Cosmos.Asistente#10 | P38 | ninguna | — | N9 | completa | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 68 | Cosmos.Contabilidad#1 | P33 | parcial | §1, §24, §37, §38, §39, §41, §42 | X39 · X41 | parcial | [El host y la inyección](secciones/el-host-y-la-inyeccion.md) |
| 69 | Cosmos.Contabilidad#2 | P43 | parcial | §39, §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 70 | Cosmos.Contabilidad#3 | P05 | completa | §9, §15, §34, §44, §45 | ya cubierto: el-capstone-fetchforwriting.md:11-26 y :95-98 | completa | [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) |
| 71 | Cosmos.Contabilidad#4 | P29 | parcial | §17, §18, §37, §38 | N4 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) |
| 72 | Cosmos.Contabilidad#5 | P15 | parcial | §14, §24, §29 | X29 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) |
| 73 | Cosmos.Contabilidad#6 | P39 | parcial | §22, §41 | N9 · X41 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [Probar que aísla](secciones/probar-que-aisla.md) |
| 74 | Cosmos.Contabilidad#7 | P46 (+P10) | parcial | §21, §23, §36, §42 | N13 | completa | [El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md) |
| 75 | Cosmos.Contabilidad#8 | P48 | parcial | §5, §32, §39, §44, §45 | N14 | completa | [Lo que la unidad de trabajo ya tiene](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md) |
| 76 | Cosmos.Contabilidad#9 | P02 | parcial | §11, §12, §44 | X44 | completa | [La plantilla se prueba](secciones/la-plantilla-se-prueba.md) |
| 77 | Cosmos.Contabilidad#10 | P12 (+P17) | parcial | §26, §30 | X26 · X30 | completa | [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md) · [El outbox](secciones/el-outbox.md) |
| 78 | ObligacionesPorPagar.Radicacion#1 | P18 | parcial | §5, §19, §23, §31 | X31 | completa | [Llegó dos veces](secciones/llego-dos-veces.md) |
| 79 | ObligacionesPorPagar.Radicacion#2 | P38 (+P28) | parcial | §16, §18, §29, §37, §40 | N9 | completa | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 80 | ObligacionesPorPagar.Radicacion#3 | P38 (+P15) | parcial | §14, §22, §29 | X29 · N9 | completa | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 81 | ObligacionesPorPagar.Radicacion#4 | P05 | parcial | §34, §36, §39, §45 | X34 · X39 · X45 | completa | [Dos respuestas a la vez](secciones/dos-respuestas-a-la-vez.md) · [El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md) |
| 82 | ObligacionesPorPagar.Radicacion#5 | P05 (+P04) | parcial | §34, §43, §45 | X34 · N9 · X43 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) |
| 83 | ObligacionesPorPagar.Radicacion#6 | P17 | parcial | §15, §30, §39, §44 | N14 | completa | [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 84 | ObligacionesPorPagar.Radicacion#7 | P29 | parcial | §17, §37, §40 | N4 · X40 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) · [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 85 | ObligacionesPorPagar.Radicacion#8 | P38 | parcial | §37, §39, §40 | N9 | parcial | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 86 | ObligacionesPorPagar.Radicacion#9 | P14 | parcial | §18, §25, §28 | X28 | completa | [El mensaje y la cola](secciones/el-mensaje-y-la-cola.md) |
| 87 | ObligacionesPorPagar.Radicacion#10 | P31 | parcial | §37, §38 | X38 | completa | [El tablero cruza streams](secciones/el-tablero-cruza-streams.md) |
| 88 | Cosmos.Terceros#1 | P09 (+P28, P36) | parcial | §23, §29, §37 | X29 · N3 · N7 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) · [El borde es un contrato](secciones/el-borde-es-un-contrato.md) |
| 89 | Cosmos.Terceros#2 | P38 (+P04) | parcial | §34, §39, §43 | N9 · X43 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md) |
| 90 | Cosmos.Terceros#3 | P29 | parcial | §17, §18, §37 | N4 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) · [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 91 | Cosmos.Terceros#4 | P13 (+P08) | parcial | §21, §27, §30 | X27 · X30 | completa | [El evento público](secciones/el-evento-publico.md) |
| 92 | Cosmos.Terceros#5 | P28 | parcial | §37, §40, §43 | N3 · X43 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) |
| 93 | Cosmos.Terceros#6 | P15 (+P13) | parcial | §14, §29, §33 | X29 · N7 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) · [El borde es un contrato](secciones/el-borde-es-un-contrato.md) |
| 94 | Cosmos.Terceros#7 | P35 | ninguna | — | N6 | completa | [La respuesta dice cuánto sabe](secciones/la-respuesta-dice-cuanto-sabe.md) |
| 95 | Cosmos.Terceros#8 | P46 | parcial | §16, §29, §37, §42 | N13 | completa | [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) · [El stream que no para de crecer](secciones/el-stream-que-no-para-de-crecer.md) |
| 96 | Cosmos.Terceros#9 | P43 | parcial | §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 97 | Cosmos.Terceros#10 | P11 | ninguna | — | X24 · X29 · X37 | completa | [La forma del hecho se congela](secciones/la-forma-del-hecho-se-congela.md) · [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) |
| 98 | Cosmos.EstructuraOrganizacional#1 | P49 | parcial | §15, §23, §34, §45 | X45 | completa | [La versión que vio el usuario](secciones/la-version-que-vio-el-usuario.md) |
| 99 | Cosmos.EstructuraOrganizacional#2 | P09 (+P42, P36) | parcial | §23, §29, §37, §41 | N3 · N7 · X41 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) · [El borde es un contrato](secciones/el-borde-es-un-contrato.md) · [Probar que aísla](secciones/probar-que-aisla.md) |
| 100 | Cosmos.EstructuraOrganizacional#3 | P12 | parcial | §26, §30, §40 | X26 · X30 | completa | [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md) · [El outbox](secciones/el-outbox.md) |
| 101 | Cosmos.EstructuraOrganizacional#4 | P29 | parcial | §17, §33, §37 | N4 | parcial | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) |
| 102 | Cosmos.EstructuraOrganizacional#5 | P10 | ninguna | — | N1 | completa | [El árbol de empresas](secciones/el-arbol-de-empresas.md) |
| 103 | Cosmos.EstructuraOrganizacional#6 | P01 | parcial | §2, §5, §11, §24 | X24 | completa | [La forma del hecho se congela](secciones/la-forma-del-hecho-se-congela.md) |
| 104 | Cosmos.EstructuraOrganizacional#7 | P13 | parcial | §14, §27 | N7 | completa | [El borde es un contrato](secciones/el-borde-es-un-contrato.md) |
| 105 | Cosmos.EstructuraOrganizacional#8 | P10 | parcial | §19, §23, §44 | N1 | parcial | [La rama entera](secciones/la-rama-entera.md) |
| 106 | Cosmos.EstructuraOrganizacional#9 | P39 | parcial | §22, §24, §39, §41 | N9 · X41 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [Probar que aísla](secciones/probar-que-aisla.md) |
| 107 | Cosmos.EstructuraOrganizacional#10 | P28 | parcial | §37, §43 | N3 · X43 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) |
| 108 | Cosmos.DatosReferencia#1 | P20 | parcial | §30, §32 | N2 | completa | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 109 | Cosmos.DatosReferencia#2 | P20 | parcial | §32 | N2 | completa | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 110 | Cosmos.DatosReferencia#3 | P07 (+P36) | parcial | §21, §36 | X21 · X36 · N7 | completa | [¿Merecía event sourcing?](secciones/merecia-event-sourcing.md) |
| 111 | Cosmos.DatosReferencia#4 | P17 | parcial | §30, §44 | N14 | parcial | [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 112 | Cosmos.DatosReferencia#5 | P16 (+P08) | parcial | §21, §43, §44 | X44 | completa | [El README que compila](secciones/el-readme-que-compila.md) |
| 113 | Cosmos.DatosReferencia#6 | P04 (+P20) | parcial | §12, §27, §30 | X30 · N2 | completa | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 114 | Cosmos.DatosReferencia#7 | P11 | ninguna | — | X37 | completa | [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) |
| 115 | Cosmos.DatosReferencia#8 | P08 | parcial | §21, §37, §44 | X44 | completa | [El README que compila](secciones/el-readme-que-compila.md) |
| 116 | Cosmos.DatosReferencia#9 | P04 | parcial | §12 | X12 | completa | [Verde, y roto](secciones/verde-y-roto.md) |
| 117 | Cosmos.Direcciones#1 | P42 | parcial | §41 | N12 | completa | [El cobro de cada tenant](secciones/el-cobro-de-cada-tenant.md) |
| 118 | Cosmos.Direcciones#2 | P20 (+P26) | ninguna | — | N2 · X42 | parcial | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 119 | Cosmos.Direcciones#3 | P21 | parcial | §20, §33, §35 | X35 | completa | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 120 | Cosmos.Direcciones#4 | P01 | parcial | §5, §11, §20 | X20 | completa | [El proyector tropieza](secciones/el-proyector-tropieza.md) |
| 121 | Cosmos.Direcciones#5 | P49 | parcial | §22, §39, §45 | X45 | completa | [La versión que vio el usuario](secciones/la-version-que-vio-el-usuario.md) |
| 122 | Cosmos.Direcciones#6 | P20 | parcial | §32 | N2 | completa | [La réplica suscrita](secciones/la-replica-suscrita.md) |
| 123 | Cosmos.Direcciones#7 | P28 | parcial | §16, §19, §32, §37 | N3 | completa | [La vista en la misma transacción](secciones/la-vista-en-la-misma-transaccion.md) |
| 124 | Cosmos.Direcciones#8 | P04 (+P05) | parcial | §22, §29, §34, §45 | N9 · X45 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) · [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) |
| 125 | Cosmos.Direcciones#9 | P39 | parcial | §22, §24, §39, §41 | N9 · X41 | completa | [El arnés usa la misma configuración](secciones/el-arnes-usa-la-misma-configuracion.md) |
| 126 | Cosmos.Direcciones#10 | P03 | completa | §5, §12 | ya cubierto: decidir-el-futuro.md:114-131 y :157-162 | completa | [Decidir el futuro](secciones/decidir-el-futuro.md) · [Verde, y roto](secciones/verde-y-roto.md) |
| 127 | ObligacionesPorPagar.Entradas#1 | P06 | ninguna | §15, §31, §39 | X15 · N5 | completa | [Todo o nada](secciones/todo-o-nada.md) · [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) |
| 128 | ObligacionesPorPagar.Entradas#2 | P18 | parcial | §23, §31, §32 | X32 | completa | [El contrato lleva lo justo](secciones/el-contrato-lleva-lo-justo.md) |
| 129 | ObligacionesPorPagar.Entradas#3 | P44 | parcial | §32, §35, §40, §42 | N12 · X42 | parcial | [El trabajo que nadie pidió](secciones/el-trabajo-que-nadie-pidio.md) · [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) |
| 130 | ObligacionesPorPagar.Entradas#4 | P42 | parcial | §41 | N12 | completa | [El cobro de cada tenant](secciones/el-cobro-de-cada-tenant.md) |
| 131 | ObligacionesPorPagar.Entradas#5 | P17 | parcial | §26, §30, §39, §44 | X30 · N14 | completa | [El outbox](secciones/el-outbox.md) · [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 132 | ObligacionesPorPagar.Entradas#6 | P16 | parcial | §2, §18, §19, §29, §37 | X29 · X37 | completa | [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) · [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) |
| 133 | ObligacionesPorPagar.Entradas#7 | P38 | parcial | §29, §30, §37, §39 | N9 | completa | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 134 | ObligacionesPorPagar.Entradas#8 | P36 | ninguna | §39 | N7 | completa | [El borde es un contrato](secciones/el-borde-es-un-contrato.md) |
| 135 | ObligacionesPorPagar.Entradas#9 | P19 | parcial | §24, §27, §33 | X33 | completa | [Dos respuestas, ningún dueño](secciones/dos-respuestas-ningun-dueno.md) |
| 136 | ObligacionesPorPagar.Entradas#10 | P22 | parcial | §5, §35, §36 | X35 | completa | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 137 | ObligacionesPorPagar.Reconocimiento#1 | P06 | ninguna | §15, §31, §39 | X15 · N5 | completa | [Todo o nada](secciones/todo-o-nada.md) · [La configuración viene de afuera](secciones/la-configuracion-viene-de-afuera.md) |
| 138 | ObligacionesPorPagar.Reconocimiento#2 | P17 | parcial | §26, §30, §39, §44 | X30 · N14 | completa | [El outbox](secciones/el-outbox.md) · [La plantilla dentro del handler](secciones/la-plantilla-dentro-del-handler.md) |
| 139 | ObligacionesPorPagar.Reconocimiento#3 | P17 | parcial | §11, §15, §30 | X30 | completa | [El outbox](secciones/el-outbox.md) |
| 140 | ObligacionesPorPagar.Reconocimiento#4 | P21 | parcial | §6, §20, §28, §33, §34, §35 | X35 | completa | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 141 | ObligacionesPorPagar.Reconocimiento#5 | P45 | parcial | §37, §39, §42 | X42 | completa | [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) |
| 142 | ObligacionesPorPagar.Reconocimiento#6 | P38 (+P45) | parcial | §33, §37, §39, §42 | N9 | parcial | [Dos hosts, una configuración](secciones/dos-hosts-una-configuracion.md) |
| 143 | ObligacionesPorPagar.Reconocimiento#7 | P35 | parcial | §23, §32, §36, §38, §39 | N6 | completa | [Lo que acabas de pedir](secciones/lo-que-acabas-de-pedir.md) |
| 144 | ObligacionesPorPagar.Reconocimiento#8 | P15 | parcial | §14, §27, §29, §30, §33 | X29 · X30 · X35 | completa | [El outbox](secciones/el-outbox.md) |
| 145 | ObligacionesPorPagar.Reconocimiento#9 | P40 | ninguna | §30, §39 | N10 | completa | [El broker de verdad](secciones/el-broker-de-verdad.md) |
| 146 | ObligacionesPorPagar.Reconocimiento#10 | P08 | parcial | §21 | X21 | completa | [¿Merecía event sourcing?](secciones/merecia-event-sourcing.md) |
| 147 | ObligacionesPorPagar.Notificaciones#1 | P43 | parcial | §40, §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 148 | ObligacionesPorPagar.Notificaciones#2 | P43 | parcial | §40, §41 | N11 | completa | [El tenant viene firmado](secciones/el-tenant-viene-firmado.md) |
| 149 | ObligacionesPorPagar.Notificaciones#3 | P40 | parcial | §30, §43 | N10 · X43 | completa | [Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md) |
| 150 | ObligacionesPorPagar.Notificaciones#4 | P18 (+P40) | parcial | §31, §32, §36 | X36 · N10 | parcial | [Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md) |
| 151 | ObligacionesPorPagar.Notificaciones#5 | P13 | parcial | §27 | X27 | completa | [El evento público](secciones/el-evento-publico.md) |
| 152 | ObligacionesPorPagar.Notificaciones#6 | P22 | parcial | §5, §35, §36 | X35 | completa | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 153 | ObligacionesPorPagar.Notificaciones#7 | P40 (+P38) | ninguna | §30, §39, §42 | N9 · N10 | completa | [Lo que el broker no promete](secciones/lo-que-el-broker-no-promete.md) |
| 154 | ObligacionesPorPagar.Integraciones#1 | P21 | parcial | §33, §35 | X35 | parcial | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 155 | ObligacionesPorPagar.Integraciones#2 | P18 | parcial | §26, §31, §35, §36 | X31 | completa | [Llegó dos veces](secciones/llego-dos-veces.md) |
| 156 | ObligacionesPorPagar.Integraciones#3 | P09 | completa | §19, §23, §29 | ya cubierto: dos-streams-misma-clave.md:15-34; el-rezago.md:56-62 | completa | [Dos streams, la misma clave](secciones/dos-streams-misma-clave.md) |
| 157 | ObligacionesPorPagar.Integraciones#4 | P19 | parcial | §24, §32 | X32 | completa | [El contrato lleva lo justo](secciones/el-contrato-lleva-lo-justo.md) |
| 158 | ObligacionesPorPagar.Integraciones#5 | P19 | parcial | §2, §24, §27, §33 | X27 · X33 | completa | [El evento público](secciones/el-evento-publico.md) · [Dos respuestas, ningún dueño](secciones/dos-respuestas-ningun-dueno.md) |
| 159 | ObligacionesPorPagar.Integraciones#6 | P34 | ninguna | §33, §39, §41 | N5 | completa | [El broker de verdad](secciones/el-broker-de-verdad.md) |
| 160 | ObligacionesPorPagar.Integraciones#7 | P21 | parcial | §6, §33, §35 | X35 | completa | [Deshacer en tres sistemas](secciones/deshacer-en-tres-sistemas.md) |
| 161 | ObligacionesPorPagar.Integraciones#8 | P30 | parcial | §17, §37, §40 | X40 | completa | [Reconstruir con el daemon](secciones/reconstruir-con-el-daemon.md) · [En vivo y serverless](secciones/en-vivo-y-serverless.md) |
| 162 | ObligacionesPorPagar.Integraciones#9 | P37 | ninguna | §39, §42 | N8 | parcial | [Seguir una acción](secciones/seguir-una-accion.md) |
| 163 | ObligacionesPorPagar.Integraciones#10 | P16 | ninguna | §43, §44 | X44 · X45 | completa | [El README que compila](secciones/el-readme-que-compila.md) |

---

Fuentes: [`ACCIONABLES-APPLICATION-PLANE.md`](ACCIONABLES-APPLICATION-PLANE.md) (el backlog), el mapeo verificado de cobertura
(evidencia `archivo:línea` contra `secciones/`), [`INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md`](INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md)
(los moldes) y [`AUDITORIA-APPLICATION-PLANE.md`](AUDITORIA-APPLICATION-PLANE.md) (el análisis).
