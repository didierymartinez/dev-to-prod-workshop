# 🧑‍🏫 Guía del facilitador — Taller de Event Sourcing (presencial)

Esta guía es para ti, que diriges el taller en vivo. Los asistentes **no leen las secciones**: tú les dices qué hacer, muestras en tu pantalla lo que hace falta ver y compruebas que todos llegaron al mismo punto antes de seguir. Cada sección de `secciones/` queda como referencia, y su `<details>` (*"👉 Una forma de hacerlo"*) es la solución para quien se trabe.

> 🧩 ¿Alguien llega con una duda concreta? [`DUDAS.md`](DUDAS.md) dice qué sección la responde. ¿Quieres el panorama sin código antes de dictar? [`NARRATIVA.md`](NARRATIVA.md) cuenta el taller de corrido.

---

## Cómo dirigir cada sección

Cada entrada de esta guía sigue el mismo ciclo. Repítelo igual en todas: al grupo le da ritmo y sabe qué viene.

1. **Abre** con la frase de *Abre así*. Es una pregunta o un problema del negocio, no la respuesta.
2. **Haz sentir el dolor** en tu pantalla, o pide que lo corran ellos. Que vean el error, el dato perdido o la salida rara. Sin dolor no hay cura: no te saltes este paso aunque vayas tarde.
3. **Dicta los pasos** uno por uno. Di dónde va cada pieza (proyecto y archivo) y cómo se llama. Si la pieza es nueva, explícala en una línea antes de pedirla. Deja que escriban; no dictes la solución completa.
4. **Punto de control ✅.** No avances hasta que todos vean lo mismo. Pide una señal visible (mano arriba, tarjeta verde en el portátil). Si alguien no llega en un par de minutos, que abra en la sección el `<details>` del Paso que indica la entrada, copie y siga. Ese número es el de la sección, no el de la guía: la guía parte los pasos largos en varios cortos.
5. **🔨 Rómpelo**, si hay tiempo. Es lo primero que recortas si vas tarde, salvo los que dicen **«no lo saltes»**: de esos parte una sección posterior.
6. **Cierra** con la idea que se llevan y el commit. El mensaje del commit es la **reflexión del asistente con sus palabras**; la entrada te da la pregunta. Luego `git push`.
7. **Puente:** la frase que abre la siguiente sección.

**Si alguien se atrasa.** Cada sección termina con el código en verde, así que ponerse al día es copiar los `<details>` de la sección que le falta y correr el punto de control. Hazlo en el descanso, no en medio del grupo. Si se atrasan varios, recorta el 🔨 y los pasos marcados como repaso.

**Si alguien va adelantado.** Que haga el 🔨 de la sección, o que lea la sección completa: tiene más detalle que lo que dictas.

**Qué no hacer.** No leas la sección en voz alta. No muestres el `<details>` antes de que lo intenten. No expliques la herramienta (Marten, Wolverine) antes de que la hayan construido a mano: el taller está hecho para que la **reconozcan**.

---

## Preparación

### Antes del primer día (cada asistente)

- **.NET 10 SDK** (`dotnet --version` empieza con `10.`) y un editor de C# que sepa renombrar una clase (se usa en la sección 14).
- **Git** con `user.name` y `user.email` configurados, y una cuenta de GitHub donde puedan hacer push.
- **Docker Desktop** corriendo. Pídeles que bajen las imágenes antes, para no saturar la red del aula: `docker pull postgres:16` y `docker pull rabbitmq:4-management`.
- **Node LTS** (`node -v`), para el tablero de CosmosLens.
- Saber C# básico: clases, listas, `if`, `foreach`.

### Antes del primer día (tú)

- **Invita a cada asistente al repo privado `cosmos-trace`** con su cuenta de GitHub. Lo clonan en la sección 36; la invitación tiene que estar aceptada antes de ese día. Pide las cuentas de GitHub con tiempo.
- Ten en tu máquina el taller completo hecho una vez: lo vas a necesitar para mostrar el dolor en pantalla y para rescatar a quien se trabe. Al hacerlo, deja un tag al final de las secciones que borran o comentan mucho código (31, 32, 36, 38, 39 y 64): quien se pierda ahí sale más rápido comparando con tu tag que con los `<details>`.
- En las secciones 38 y 39, los ids y las versiones de las salidas suponen correr cada experimento una vez y en orden. Quien repite o se salta uno ve otros números: avísalo antes de empezar.
- Versiones del taller: **Marten 9.50.3**, **WolverineFx 6.51.0**, **.NET 10**. Los paquetes se agregan en clase con `dotnet add package` y necesitan NuGet. Si el aula tiene mala red, pide el día anterior un `dotnet restore` de una solución con `Npgsql`, `Marten`, `WolverineFx`, `WolverineFx.Marten`, `WolverineFx.RuntimeCompilation`, `WolverineFx.RabbitMQ`, `WolverineFx.Postgresql`, `Microsoft.Extensions.Configuration.KeyPerFile`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `Microsoft.AspNetCore.Mvc.Testing` y xUnit.
- Ten listo un script que vacíe la base de quien se pierda. Las secciones van sumando tablas propias (`eventos`, `empresas_estado`, `checkpoint`, `proyeccion_fallos`, `planes`, `localizador`, `pagos`, `bandeja_salida`) y, desde la sección 31, las de Marten y Wolverine.
- En la segunda mitad cada asistente tiene varias terminales abiertas a la vez (servicio, segunda copia, worker, Notificaciones, Pantalla, `curl -N`, `psql`). Pídeles que se acostumbren a nombrar las pestañas.

### Antes de cada tramo

| Antes de | Qué preparar |
|---|---|
| 1 · El diario de una empresa | Nada más que lo del primer día. Hasta la sección 14 no hay contenedores, bases ni variables. |
| 12 · Verde y roto | NuGet accesible: `dotnet new xunit` y `dotnet test` bajan paquetes. La plantilla de .NET 10 trae xUnit 2.9.3, que es la que supone el taller: que nadie cambie a `xunit.v3` (los fixtures de las secciones 26 y 40 dejan de compilar). |
| 15 · Todo o nada | Postgres en Docker: `docker run -d --name empresas-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`. El puerto 5432 libre (un Postgres instalado en la máquina lo ocupa). La variable `CADENA_POSTGRES` fijada en **cada terminal** que corra el código: su valor es `Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres`. Que corran `dotnet run` y `dotnet test` desde esa terminal, no desde el IDE. |
| 16 · La vista de lectura | Un `DECISIONES.md` en el repo de cada uno: desde aquí anotan las decisiones de criterio. |
| 21 · ¿Merecía event sourcing? | Dos terminales con `psql` abiertas: `docker exec -it empresas-db psql -U postgres`. |
| 26 · La forma del hecho se congela | La base de pruebas: `docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas_tests"`. |
| 33 · Llegó dos veces | El SQL de las tablas de Facturación listo en una diapositiva: `procesados` (33), `multas` y `mensualidades` (34), `plan_de_empresa` (35), y el `ALTER TABLE multas ADD COLUMN suspension_id TEXT UNIQUE` (39). |
| 36 · Dos respuestas, ningún dueño | Invitaciones a `cosmos-trace` aceptadas. Clonan con `git clone --branch taller-es-v1 https://github.com/didierymartinez/cosmos-trace`, **fuera** del repo del taller. Node LTS instalado, el puerto 5301 libre y dos terminales más (la API y el tablero). Con red lenta, deja hecho antes el `npm install` en `cosmos-trace/web`. |
| 45 · La configuración viene de afuera | La carpeta `~/secretos-empresas`, fuera del repo. Desde aquí el servicio ya no lee `CADENA_POSTGRES`; la terminal de `dotnet test` sí la sigue necesitando. |
| 49 · Seguir una acción | Arrancar el servicio con `ASPNETCORE_ENVIRONMENT=Development dotnet run 2>&1 \| tee servicio.log` (en PowerShell, `\| Tee-Object servicio.log`). |
| 50 · Dos hosts, una configuración | El puerto 5001 libre para la segunda copia del servicio. |
| 52 · El broker de verdad | RabbitMQ en Docker: `docker run -d --name empresas-rabbit -p 5672:5672 rabbitmq:4-management`, con el puerto 5672 libre. |
| 53 · Lo que el broker no promete | bash para `topologia.sh` (en Windows, Git Bash o WSL). |
| 55 · El contexto que falta | Se crea la base `empresas` y se recrea `empresas_tests`. Hay que apuntar a `Database=empresas` la variable, los user-secrets y `~/secretos-empresas/ConnectionStrings__Postgres`. Si CosmosLens está arriba, reinícialo con la cadena nueva. |
| 57 · El tenant viene firmado | NuGet para `Microsoft.AspNetCore.Authentication.JwtBearer`; los tokens se crean en clase con `dotnet user-jwts`, que viene con el SDK. El servicio tiene que arrancar en `Development` (`ASPNETCORE_ENVIRONMENT=Development dotnet run`, desde `Empresas.Historia`); si no, sale `The signature key was not found`. Crea antes tus propios tokens de acme y globex para la demo. |
| 58 · El trabajo que nadie pidió | Avisa al grupo: desde aquí el cron cobra cada 10 segundos y llena el log en todas las secciones siguientes. La 58 y la 59 corren con dos copias del servicio (5000 y 5001) y el worker a la vez. |
| 59 · El cobro de cada tenant | La sección recrea `plan_de_empresa` y `mensualidades` y altera `multas` en las dos bases. Luego la réplica queda vacía hasta el próximo anuncio. |
| 63 · El comentario que sobrevive | NuGet para `Microsoft.AspNetCore.Mvc.Testing --version 10.0.13`. La terminal de `dotnet test` con `CADENA_POSTGRES` hasta el final del taller. |
| 67 · La plantilla dentro del handler | El cron de la 59 cobrando: el Paso 3 consiste en ver que deja de cobrar y que vuelve con el filtro del middleware. |
| 70 · La versión que vio el usuario | El token de acme también en la terminal de `dotnet test`: `export ACME=$(cat ~/acme.jwt)` (PowerShell: `$env:ACME = Get-Content ~/acme.jwt`). Sin él, los tests HTTP reciben `401`. Como en la 38 y la 39, los ETag y las versiones de las salidas suponen correr cada experimento una vez y en orden. |

---

## Agenda

El taller completo son **70 secciones y unas 58 horas de trabajo en vivo** (dictar, escribir, comprobar y el 🔨). Repartido en jornadas de unas 5 horas de trabajo, más descansos, da **12 jornadas**. Los minutos de cada sección son una estimación: el primer día de cada grupo va más lento, y las secciones de infraestructura (Postgres, broker, tokens) pueden irse por encima si la red del aula falla.

| Jornada | Secciones | Tiempo |
|---|---|---|
| 1 | 1–8: 1 El diario de una empresa · 2 Los primeros hechos · 3 Refactorizando el motor · 4 El flujo de vida (EventStream) · 5 Decidir el futuro (emitir eventos) · 6 El Command Handler · 7 El despachador: dado un comando, encuentra su handler · 8 El almacén: un cajón por empresa | 5 h 00 |
| 2 | 9–14: 9 Cuando dos escriben a la vez (concurrencia optimista) · 10 Un acto de negocio, dos hechos · 11 El agregado recuerda lo que decide · 12 Verde, y roto · 13 El diario en disco (y lo que se queda afuera) · 14 El nombre del hecho es un contrato | 4 h 05 |
| 3 | 15–21: 15 Todo o nada: el diario en una base de datos real · 16 La pregunta que el diario no sabe responder · 17 Rejugar el diario: reconstruir la vista · 18 La vista se mantiene sola · 19 El rezago: ¿cuánto atrás va la vista? · 20 El proyector tropieza · 21 ¿Merecía event sourcing? | 4 h 45 |
| 4 | 22–28: 22 El puerto propio · 23 Dos streams, la misma clave · 24 El árbol de empresas · 25 La rama entera · 26 La forma del hecho se congela · 27 La vista por consulta · 28 El hecho y su anuncio | 5 h 10 |
| 5 | 29–33: 29 El evento público · 30 El mensaje y la cola · 31 El swap por reconocimiento · 32 El outbox · 33 Llegó dos veces | 4 h 40 |
| 6 | 34–37: 34 El contrato lleva lo justo · 35 La réplica suscrita · 36 Dos respuestas, ningún dueño · 37 Dos respuestas a la vez | 4 h 30 |
| 7 | 38–41: 38 Deshacer en tres sistemas · 39 El proceso tiene dueño · 40 El daemon y la consistencia eventual · 41 La vista en la misma transacción | 4 h 55 |
| 8 | 42–47: 42 Reconstruir con el daemon · 43 El tablero cruza streams · 44 El host y la inyección · 45 La configuración viene de afuera · 46 Lo que acabas de pedir · 47 La respuesta dice cuánto sabe | 5 h 05 |
| 9 | 48–53: 48 El borde es un contrato · 49 Seguir una acción · 50 Dos hosts, una configuración · 51 El arnés usa la misma configuración · 52 El broker de verdad · 53 Lo que el broker no promete | 5 h 05 |
| 10 | 54–58: 54 En vivo y serverless · 55 El contexto que falta · 56 Probar que aísla · 57 El tenant viene firmado · 58 El trabajo que nadie pidió | 4 h 40 |
| 11 | 59–64: 59 El cobro de cada tenant · 60 Observar el motor nuevo · 61 Que el servicio avise · 62 El stream que no para de crecer · 63 El comentario que sobrevive · 64 La plantilla | 5 h 15 |
| 12 | 65–70: 65 La plantilla se prueba · 66 El README que compila · 67 La plantilla dentro del handler · 68 Lo que la unidad de trabajo ya tiene · 69 El capstone: FetchForWriting · 70 La versión que vio el usuario | 5 h 10 |

Si tienes menos jornadas, recorta primero los 🔨 (salvo los que dicen «no lo saltes») y los pasos de repaso; no recortes el paso que hace sentir el dolor.

---

## 1 · El diario de una empresa  ·  ⏱ ~20 min  ·  [el-diario-de-una-empresa.md](secciones/el-diario-de-una-empresa.md)

**Para qué:** entender la diferencia entre guardar la foto (el estado de hoy) y guardar el diario (todo lo que pasó), y dejar listo el repo donde cada uno llevará su avance.

**Abre así (lo dices en voz alta):** "La ficha de Constructora Andes dice: plan Premium, estado Suspendida. Mi jefe pregunta: ¿cómo llegó a estar suspendida? ¿Quién me lo responde con esta fila?"

**Haz sentir el dolor:** muestra la fila (Id 7, Constructora Andes, Premium, Suspendida) y los dos `UPDATE` que la dejaron así: `SET Plan='Premium'` y `SET Estado='Suspendida'`. Haz las tres preguntas del jefe: ¿desde cuándo es Premium?, ¿por qué está suspendida?, ¿cuántas veces la reactivamos? La base responde lo mismo a las tres: "ni idea". Cada `UPDATE` borró lo que había antes.

**Dicta los pasos:**
1. Escribe en el tablero el diario de la empresa: registrada con plan Básico → cambió a plan Premium → suspendida por falta de pago.
2. Pídeles el estado de hoy leyendo el diario de corrido. Deben llegar a "Premium, suspendida". Y además saben desde cuándo, por qué y cuántas veces.
3. Nombra las piezas: guardar los hechos como fuente de la verdad se llama **Event Sourcing**; cada renglón del diario es un **evento**.
4. Explica las cajas 🌱: son adelantos cortos, con su nombre técnico. No hay que dominarlas al verlas.
5. Que creen en GitHub un repo vacío (sin README). En su carpeta de trabajo: `git init`, `git commit --allow-empty -m "ES · El diario de una empresa" -m "<su respuesta>"`, `git remote add origin <su URL>`, `git branch -M main` (si su git creó la rama como `master`, sin esto el push falla con `src refspec main does not match any`), `git push -u origin main`.
6. Explica la regla de la bitácora: cada sección cierra con un commit, y el 2.º `-m` lleva la reflexión escrita por ellos, nunca la pregunta pegada.

**✅ Punto de control:** todos ven su primer commit en GitHub. Y cada uno dice en voz alta una pregunta del negocio que la foto no responde y el diario sí.

**Si se traban:**
- El `push` falla porque el repo de GitHub nació con README → que lo creen vacío, sin README, como en el taller Básico.
- El mensaje del commit es la pregunta copiada → reemplacen el placeholder por su respuesta, con sus palabras.

**Cierra con:** "El estado de hoy se reconstruye leyendo el diario, y el pasado ya no se pierde." Deja sembrada una pregunta: ¿toda tabla merece un diario? Más adelante la responderán por escrito, y «no» también es una respuesta válida. Commit con la reflexión (ya va en el paso 5): ¿qué destruye un `UPDATE` que el diario conserva?, y una pregunta que la foto no responde.

**Puente:** "Un diario en prosa no compila. ¿Cómo escribimos un hecho en C# para que nadie, ni nosotros dentro de un mes, lo pueda editar?"

---

## 2 · Los primeros hechos  ·  ⏱ ~40 min  ·  [los-primeros-hechos.md](secciones/los-primeros-hechos.md)

**Para qué:** escribir los hechos de Constructora Andes en C# y calcular su estado de hoy leyéndolos, sin guardarlo en ningún lado.

**Abre así (lo dices en voz alta):** "Quiero el plan actual y cuántas veces la reactivamos. Si guardo `Plan = "Premium"` en una variable, vuelvo a tener la foto. ¿Cómo lo calculo desde el diario?"

**Haz sentir el dolor:** pregunta: si un hecho fuera una clase con `set`, ¿qué impide que alguien cambie "registrada con plan Básico" por "Premium" dentro de un mes? Nada. Eso es falsificar la historia. Necesitamos algo que el compilador no deje modificar.

**Dicta los pasos:**
1. En la carpeta del `.git`: `dotnet new console -n Empresas.Historia`, `cd Empresas.Historia`, `dotnet new gitignore`. Que vacíen el `Program.cs`.
2. Da las dos reglas del `Program.cs`: el código suelto (`var`, `Console.WriteLine`) va arriba y las clases y `record` van al final. Cuando vean 🔁, reemplazan la versión anterior; no la duplican.
3. Un `record` es inmutable y se compara por su contenido. Dicta los cuatro, al final: `EmpresaRegistrada(string Nombre, string Plan)`, `PlanCambiado(string NuevoPlan)`, `EmpresaSuspendida(string Motivo)`, `EmpresaReactivada()`.
4. Arriba, `var historia = new List<object> { … }` con cinco hechos en orden: registrada "Básico", `PlanCambiado("Premium")`, suspendida "falta de pago", reactivada, suspendida "incumplimiento de contrato". Haz el 🔮: si algo pasa y nadie lo anota, ¿qué sabe el sistema? Nada. Esa secuencia es un **Stream**: la única fuente de la verdad.
5. 🆕 `hecho is EmpresaRegistrada r` comprueba el tipo y, si coincide, entrega el hecho ya convertido en `r`. Pídeles cuatro variables (`nombre`, `plan`, `suspendida`, `reactivaciones`) y un `foreach` que actualice la que toque según el tipo de cada hecho. Al final imprimen la línea del ✅.
6. Nombra: recorrer los hechos para reconstruir el estado es **Replay**. Cada vuelta, `(estado, hecho) → nuevo estado`, es **evolve**.
7. 🆕 `{ get; private set; }`: se lee desde afuera, se escribe solo dentro de la clase. Pídeles la clase `Empresa` con las cuatro propiedades así y un constructor que reciba `IEnumerable<object> historia` y corra el mismo `foreach`. Arriba: `var empresa = new Empresa(historia);`.
8. Nombra: la clase dueña de la coherencia, y único punto para cambiarla, es el **Aggregate Root**.

**✅ Punto de control:** `dotnet run` imprime `Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces`, primero con variables sueltas y luego con `Empresa`. Agregan `new PlanCambiado("Enterprise")` al final de la historia: sale Enterprise sin tocar el replay. Prueban `empresa.Plan = "Enterprise"`: no compila. Si alguien no llega: solución en los `<details>` de «Revivir el pasado» y «De variables sueltas a una clase».

**Si se traban:**
- Errores raros de compilación → hay clases entre el código suelto. El código suelto va arriba y las clases al final.
- `dotnet run` no encuentra el proyecto → se corre dentro de `Empresas.Historia/`; los `git` se corren desde la carpeta del `.git`.

**Cierra con:** "No guardamos el estado: lo reconstruimos rejugando hechos inmutables." Que creen `DECISIONES.md` junto a su código con la primera línea: «Los hechos son `record` inmutables: nadie —ni yo— puede editar el pasado; el estado se reconstruye rejugándolos.» Commit con la reflexión: ¿qué dice el compilador ante `evento.Plan = "x"`, y por qué un hecho no debe poder cambiar?

**Puente:** "El constructor tiene cuatro `if`. Cada hecho nuevo será otro, y una `Factura` copiaría el bucle entero. Vamos a arreglarlo."

---

## 3 · Refactorizando el motor  ·  ⏱ ~45 min  ·  [refactorizando-el-motor.md](secciones/refactorizando-el-motor.md)

**Para qué:** convertir el `foreach` con `if` en un motor de replay reutilizable: una clase base `AggregateRoot` con `Load`, y un `Aplicar` con `switch` por tipo en cada entidad.

**Abre así (lo dices en voz alta):** "Mañana llega una `Factura` que también se reconstruye de sus hechos. ¿Copiamos este bucle? ¿Y cuando haya 15 hechos, ponemos 15 `if`?"

**Haz sentir el dolor:** muestra el constructor de `Empresa` con los cuatro `if (hecho is …)`. Señala dos cosas: el constructor recorre y aplica a la vez, y el bucle tendría que copiarse en cada entidad nueva.

**Dicta los pasos:**
1. Refactor 1: saquen los cuatro `if` a `private void Aplicar(object hecho)`. El constructor queda solo con el `foreach` que llama a `Aplicar`. Corren: la misma salida. Nombra: separación de responsabilidades.
2. 🆕 `abstract class` es una clase base incompleta que solo se hereda. `protected abstract` declara un método obligatorio sin cuerpo, y la hija lo implementa con `override`. 🆕 `=>` es el cuerpo corto de una sola línea.
3. Refactor 2: pídeles `public abstract class AggregateRoot` con `public void Load(IEnumerable<object> historia)` (el `foreach`) y `protected abstract void Aplicar(object hecho);`. `Empresa : AggregateRoot`: su `private void Aplicar` pasa a `protected override void Aplicar`, y el constructor queda `=> Load(historia)`.
4. Pregunta: ¿por qué clase abstracta y no interfaz? La base lleva código compartido (`Load`) y va a guardar estado. Una interfaz no guarda estado de instancia y obligaría a repetir el motor en cada clase.
5. 🆕 `case EmpresaRegistrada r:` entra si el hecho es de ese tipo y lo entrega como `r`. Refactor 3: conviertan los `if` de `Aplicar` en un `switch (hecho)`, con `break;` en cada rama.

**✅ Punto de control:** `dotnet run` imprime lo mismo que antes: `Constructora Andes: plan Premium, suspendida, reactivada 1 vez/veces`. Prueban `new AggregateRoot()`: no compila. Si alguien no llega: solución en el `<details>` de cada Refactor (1, 2 y 3).

**🔨 Rómpelo (si hay tiempo):**
- Agreguen `public record NombreCorregido(string Nuevo);` y, al final de la historia, `new NombreCorregido("Constructora Andes S.A.")`, sin `case`.
- Guarden copia (`cp Program.cs Program.bak`). Muestra en pantalla la nota «Otra forma de enrutar por tipo» y que reemplacen su `AggregateRoot` y su `Empresa` por las de la nota (las del `dynamic`). Compila sin quejas.
- `dotnet run` lanza `RuntimeBinderException: The best overloaded method match for 'Empresa.Aplicar(EmpresaRegistrada)' has some invalid arguments`. Mientras ese hecho esté en la historia, ninguna carga funciona.
- Restauren (`cp Program.bak Program.cs` y borren el `.bak`): el `switch` carga e imprime `Constructora Andes`, sin el hecho nuevo.
- Añadan `case NombreCorregido n: Nombre = n.Nuevo; break;` y sale `Constructora Andes S.A.`.

**Si se traban:**
- No compila después de los refactores → quedaron versiones viejas pegadas. Debe haber una sola `Empresa` (la del `switch`) y una sola `AggregateRoot`.
- En Windows sin `cp` → en PowerShell `cp` funciona igual.

**Cierra con:** "El motor de replay es igual para toda entidad y vive una sola vez en `AggregateRoot`; lo propio de cada una va en su `switch`." En `DECISIONES.md`: «Enruto con un `switch`: un hecho sin su `case` no rompe la carga de la empresa. Con `dynamic`, toda carga lanzaba.» Commit con la reflexión: ¿por qué `Load` vive en la base y `Aplicar` en cada entidad?, ¿qué ganó el `switch` y qué se habría perdido con `dynamic`?

**Puente:** "El `switch` saltó `NombreCorregido` sin avisar; eso volverá. Y la historia sigue siendo una `List<object>` suelta que cualquiera puede reordenar o llenar de basura."

---

## 4 · El flujo de vida (EventStream)  ·  ⏱ ~30 min  ·  [el-flujo-de-vida.md](secciones/el-flujo-de-vida.md)

**Para qué:** dejar de pasar listas crudas. Un `EventStream<T>` es dueño de la historia y solo deja anotar (`Append`) y leer la entidad ya reconstruida (`Get`).

**Abre así (lo dices en voz alta):** "Hoy cualquiera puede hacer `historia.Add("hola")` antes de pasársela a la empresa. Y quien consulta tiene que saber cómo se rehidrata. ¿Quién debería ser dueño de la historia?"

**Haz sentir el dolor:** en el código suelto, escribe `historia.Add("hola");` antes de `new Empresa(historia)`. Compila y corre: nadie protege la lista. Y quien quiere la empresa debe saber armarla con `new Empresa(historia)`.

**Dicta los pasos:**
1. Aclara el nombre: la historia de una sola empresa es un **Event Stream**. No es el `System.IO.Stream` de C#, que mueve bytes. La clase que van a escribir es un andamio: más adelante una librería hará este trabajo.
2. Pídeles `EventStreamDeEmpresa` con su propia `List<object>` privada, que nace vacía. `Append(object hecho)` la agrega a la lista. `Get()` crea una `Empresa` vacía y llama a `Load`.
3. 🔁 En `Empresa`: quiten el constructor que recibía la historia y añadan `public Empresa() { }`.
4. Señala el dolor: con una `Factura` copiarían esta clase cambiando solo el tipo. **Muestra tú el genérico**, porque la sintaxis es nueva: "De Empresa" se vuelve `<Empresa>`. Escribe `public class EventStream<T> where T : AggregateRoot, new()` y explica el `where`: `T` debe ser un `AggregateRoot` (para llamar `.Load`) y tener constructor sin parámetros (para `new T()`).
5. Que reemplacen `EventStreamDeEmpresa` por `EventStream<T>` y borren la vieja.
6. 🔁 Arriba: `var stream = new EventStream<Empresa>();`, un `Append` de `EmpresaRegistrada("Constructora Andes", "Básico")`, otro de `PlanCambiado("Premium")`, `var empresa = stream.Get();` y que impriman `$"{empresa.Nombre}: plan {empresa.Plan}"`.
7. Nombra: un envoltorio que esconde la lista de eventos y te entrega el objeto se llama **Repositorio**. Es el mismo objeto con otro nombre.

**✅ Punto de control:**
- `dotnet run` imprime `Constructora Andes: plan Premium`. Ya no queda `EventStreamDeEmpresa` ni `new List<object>{ … }`.
- Prueban `new EventStream<string>()`: no compila.
- Cambian `public Empresa() { }` por `private Empresa() { }`: `new EventStream<Empresa>()` deja de compilar con `CS0310`, porque el `new()` del `where` pide un constructor público sin parámetros. Si alguien lo borra en vez de volverlo privado, compila: C# le da uno vacío a la clase que no declara ninguno.
- Si alguien no llega: solución en el `<details>` de «Refactor 1» y el bloque genérico bajo «El dolor».

**Si se traban:**
- `Empresa` no tiene un constructor que reciba un argumento → queda un `new Empresa(historia)` en el código suelto; reemplácenlo por el stream.
- `new T()` o `.Load` no compilan → falta `new()` o `AggregateRoot` en el `where`.

**Cierra con:** "El `EventStream<T>` es dueño de la historia: se anota con `Append` y se lee con `Get`, sin listas sueltas." Pregunta abierta: hoy, ¿quién decide qué hechos se anotan? Nosotros, a mano, y nadie valida nada. Commit con la reflexión: ¿por qué `new EventStream<string>()` no compila?, y hoy, ¿quién decide qué hechos se anotan?

**Puente:** "Hoy fabricamos cada hecho con `new` y el stream anota lo que le demos. ¿Quién impide suspender dos veces, o cambiar el plan de una empresa suspendida? En la siguiente, decide la empresa."

---

## 5 · Decidir el futuro (emitir eventos)  ·  ⏱ ~45 min  ·  [decidir-el-futuro.md](secciones/decidir-el-futuro.md)

**Para qué:** que la `Empresa` decida y devuelva sus propios hechos, protegiendo sus reglas, y armar el ciclo cargar → actuar → guardar.

**Abre así (lo dices en voz alta):** "¿Quién decide si una empresa puede cambiar de plan: un `new PlanCambiado` suelto en el `Program.cs`, o la empresa?"

**Haz sentir el dolor:** después del paso 3, corre la orden de suspender dos veces sobre el mismo stream. Cada orden hace `stream.Get()` y luego `stream.Append(ordenN.Suspender("falta de pago"))`. Sin guarda, el diario queda con dos suspensiones. Y nada impide cambiar el plan de una empresa suspendida.

**Dicta los pasos:**
1. Explica la regla: la empresa decide y **devuelve** el hecho. No guarda la lista (eso es del stream) y no toca sus propiedades.
2. Pídeles en `Empresa`: `CambiarPlan(string nuevoPlan)` → `PlanCambiado`, `Suspender(string motivo)` → `EmpresaSuspendida`, `Reactivar()` → `EmpresaReactivada`. Ninguno asigna una propiedad.
3. 🔁 Arriba, reemplazando la demo anterior: stream con `EmpresaRegistrada` en "Básico"; `stream.Get()` (cargar), `empresa.CambiarPlan("Enterprise")` (actuar), `stream.Append(hecho)` (guardar). Recargan con `stream.Get()` e imprimen. Señala: el objeto cargado no cambió; el cambio vive en el diario.
4. Nombra: decidir (estado + intención → hechos) es **decide**; junto con `evolve` forman el **patrón Decider**. Muestra la tabla Comando / Evento / Query.
5. Corre el dolor y haz el 🔮: ¿la guarda va en `CambiarPlan` o en `Aplicar`? Va en `CambiarPlan`. Si `Aplicar` rechazara hechos, una historia ya guardada no se podría rejugar.
6. 🆕 Constructor primario: `public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);`. Va al final, con las demás clases. 🆕 `EmpresaSuspendida?` indica que el valor puede ser `null`.
7. 🔁 `CambiarPlan` lanza `ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.")` si `Suspendida`. `Suspender` pasa a devolver `EmpresaSuspendida?`, y devuelve `null` si ya está `Suspendida`.
8. 🔁 En el demo, la línea de `orden2` pasa a `var suspension = orden2.Suspender("falta de pago");` y `if (suspension is not null) stream.Append(suspension);`. Otro nombre, porque `hecho` ya existe en el ciclo.
9. Muestra la trampa sobre **otra** empresa activa (la del demo ya quedó suspendida): `var otra = new EventStream<Empresa>();` con su `EmpresaRegistrada`, una sola instancia `var e = otra.Get();` y dos `otra.Append(e.Suspender("x"))`. La guarda no dispara, porque `decide` no modificó `e`. La idempotencia sale de recargar antes de cada orden.
10. Escribe en el tablero: **validación** (orden inválida → excepción: grita) y **idempotencia** (orden redundante → no emite: calla). Muestra el bloque Given → When → Then con `.Should()` solo para leer; todavía no hay proyecto de pruebas.

**✅ Punto de control:** `dotnet run` imprime `[después] plan Enterprise`. Con la guarda, la segunda orden (recargada) devuelve `null` y queda un solo `EmpresaSuspendida`. Para ver la validación, agreguen al final `stream.Get().CambiarPlan("Premium");`: lanza `ReglaDeNegocioException` con "No se puede cambiar el plan de una empresa suspendida." Luego quiten esa línea. Si alguien no llega: solución en los dos `<details>` de la sección.

**Si se traban:**
- `var stream` repetido → están acumulando la demo de la sección anterior en el código suelto; reemplácenla.
- `var hecho` repetido (`CS0128`) → la comprobación de `orden2` declara `hecho` otra vez; usen otro nombre (`suspension`), como la sección.
- Aviso de `null` al pasar `Suspender(...)` a `Append` → comprueben `is not null` antes de archivar.
- "La guarda no funciona" → usan la misma instancia; recarguen con `stream.Get()` antes de cada orden.

**Cierra con:** "El agregado decide y emite; el stream guarda; el estado cambia al aplicar en el replay. Lo inválido se rechaza y lo redundante se ignora." Commit con la reflexión: ¿qué pasa al llamar `CambiarPlan` sobre una suspendida, y por qué `CambiarPlan` no toca `Plan`?

**Puente:** "El ciclo cargar → actuar → guardar quedó suelto en el `Program.cs`. Le damos una pieza con un solo trabajo."

---

## 6 · El Command Handler  ·  ⏱ ~25 min  ·  [el-command-handler.md](secciones/el-command-handler.md)

**Para qué:** sacar el ciclo cargar → actuar → guardar del `Program.cs` a una clase handler por comando.

**Abre así (lo dices en voz alta):** "La empresa decide. ¿Quién la carga, le presenta la orden y guarda el hecho? Un secretario. Se llama Command Handler: el que atiende una orden."

**Haz sentir el dolor:** muestra el código suelto actual: `Get`, `CambiarPlan`, `Append` y el `if` del `null`, todo en el arranque del programa. Cada operación nueva repite ese trío ahí.

**Dicta los pasos:**
1. 🔁 Muestra el uso que quieren lograr, reemplazando el demo anterior: un stream nuevo (`var stream = new EventStream<Empresa>();` y `stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));`), `var handlers = new EmpresaCommandHandlers(stream);`, `handlers.CambiarPlan("Premium");`, `handlers.Suspender("falta de pago");` y luego imprimir `stream.Get().Suspendida ? "suspendida" : "activa"`.
2. Pídeles `EmpresaCommandHandlers(EventStream<Empresa> stream)` (constructor primario) con `CambiarPlan(string nuevoPlan)` y `Suspender(string motivo)`. Cada método hace `Get`, pide la decisión y hace `Append`. En `Suspender`, si el hecho es `null`, no guardan nada.
3. Señala: ese `if (hecho is not null)` obedece una regla que puso la `Empresa`. El handler no decide.
4. 🔁 Rompan el súper-secretario: bórrenlo y creen `CambiarPlanHandler` y `SuspenderHandler`. Cada uno recibe el stream por constructor y tiene un `Handle(...)` con sus parámetros sueltos.
5. Úsenlo a mano: `new CambiarPlanHandler(stream).Handle("Premium");` y `new SuspenderHandler(stream).Handle("falta de pago");`. Pregunta: ¿quién eligió qué clase crear? Nosotros.

**✅ Punto de control:** `dotnet run` imprime `suspendida`, primero con `EmpresaCommandHandlers` y luego con los dos handlers. Ya no existe `EmpresaCommandHandlers`. Si alguien no llega: solución en los dos `<details>` de la sección.

**Si se traban:**
- Llega un `null` a `Append` → falta el `if (hecho is not null)` en el handler de suspender.
- `ReglaDeNegocioException` al cambiar el plan → están suspendiendo antes de cambiar el plan; el ejemplo cambia el plan primero.

**Cierra con:** "El agregado tiene la lógica pura. El handler, una capa delgada por comando, hace la logística." Commit con la reflexión: ¿por qué el handler obedece el `null` en vez de decidir él?, ¿qué gana un handler por comando frente al súper-secretario?

**Puente:** "Hoy elegimos a mano qué handler crear. Pero el comando va a llegar de afuera: una petición HTTP, una cola. Necesitamos un punto que lo lleve solo a su handler."

---

## 7 · El despachador: dado un comando, encuentra su handler  ·  ⏱ ~50 min  ·  [el-despachador.md](secciones/el-despachador.md)

**Para qué:** construir un `Despachador` que reciba cualquier comando y encuentre su handler por el tipo del comando, sin `switch` y sin nombrar clases.

**Abre así (lo dices en voz alta):** "El comando llega de afuera. Hoy quien lo lleva a su handler soy yo, con un `switch` que crece con cada comando nuevo."

**Haz sentir el dolor:** muestra el `switch (algo)` con `case "cambiar plan"` y `case "suspender"`, cada uno creando su handler. Cada comando nuevo es otra rama, y quien despacha queda atado a todos los handlers.

**Dicta los pasos:**
1. Pieza 1: `"falta de pago"` y `"Premium"` son del mismo tipo (`string`), así que no se puede rutear por tipo. Pídeles un `record` por comando: `CambiarPlanDeEmpresa(string NuevoPlan)` y `SuspenderEmpresa(string Motivo)`. 🔁 Cada `Handle` recibe su comando y lee `cmd.NuevoPlan` o `cmd.Motivo`. Todavía sin id: hay una sola empresa.
2. Pieza 2: el despachador debe llamar a todos los handlers igual. Pídeles `public interface ICommandHandler<TCommand> { void Handle(TCommand comando); }` y que cada handler la implemente. Pregunta: ¿por qué interfaz y no clase abstracta? Los handlers no comparten código; solo un contrato.
3. La tabla a mano: `var handlers = new Dictionary<Type, Action<object>>();` y un `Add` por handler. La llave es `typeof(SuComando)`; el valor, una lambda que castea el `object` y llama a `Handle`. Despachan con `object comando = new SuspenderEmpresa("falta de pago");` y `handlers[comando.GetType()](comando);`.
4. Provoca el desalineo: **reemplacen** la entrada de `SuspenderEmpresa` por una con llave `typeof(SuspenderEmpresa)` y cast `(CambiarPlanDeEmpresa)` (si la agregan junto a la buena, `Add` falla antes por llave repetida). Compila. Al despachar: `InvalidCastException` en ejecución.
5. Pídeles la clase `Despachador`. `Registrar<T>(ICommandHandler<T> handler)` guarda bajo `typeof(T)` la lambda `comando => handler.Handle((T)comando)`. `Enviar(object comando)` busca por `comando.GetType()`. Señala: la llave, el cast y el handler son el mismo `T`, y ya no se pueden desalinear.
6. 🔁 Úsenlo (reemplazando la tabla a mano, salvo el `var stream`): `despachador.Registrar(new CambiarPlanHandler(stream));`, `despachador.Registrar(new SuspenderHandler(stream));`, `despachador.Enviar(comando);` y `Console.WriteLine(stream.Get().Suspendida ? "suspendida" : "activa");`. Señala que no escribieron `<SuspenderEmpresa>`: C# lo deduce del handler.
7. Nombra: construyeron un **mediador** (`Registrar` llena la tabla, `Enviar` rutea). Es un andamio: lo usarán un tramo y luego lo jubilarán.

**✅ Punto de control:** `dotnet run` imprime `suspendida`: `despachador.Enviar(comando)` llegó a `SuspenderHandler` sin `switch` y sin nombrar la clase. Si alguien no llega: solución en los `<details>` de «Pieza 1», «Pieza 2», «La tabla, a mano primero» y «Extrae el patrón».

**Si se traban:**
- `InvalidCastException` al despachar → la llave y el cast de una entrada no coinciden; pasen a `Registrar<T>`.
- `KeyNotFoundException` en `Enviar` → ese comando no tiene su `Registrar`.
- `object comando` repetido → reemplacen la tabla a mano por el `Despachador`; no acumulen las dos demos.

**Cierra con:** "Para rutear cualquier comando nacieron dos piezas cuando hicieron falta: un `record` por comando (un tipo para rutear) y `ICommandHandler<T>` (un molde común)." Commit con la reflexión: ¿qué los obligó a crear el `record` por comando y el contrato?, ¿qué se rompería si los comandos fueran `string`?

**Puente:** "Cada handler está atado a un stream fijo, o sea a una sola empresa. ¿Qué pasa cuando nace la segunda?"

---

## 8 · El almacén: un cajón por empresa  ·  ⏱ ~45 min  ·  [el-almacen-por-id.md](secciones/el-almacen-por-id.md)

**Para qué:** un `EventStore` que guarda la historia de cada empresa en su propio cajón, por id, y handlers registrados una sola vez que sirven a todas.

**Abre así (lo dices en voz alta):** "Llega la segunda empresa con su `stream2`. ¿Registramos otra vez `new SuspenderHandler(stream2)`?"

**Haz sentir el dolor:** muestra `despachador.Registrar(new SuspenderHandler(stream1));` y debajo `despachador.Registrar(new SuspenderHandler(stream2));`. Es la misma llave, `typeof(SuspenderEmpresa)`: el segundo pisa al primero sin dar error. No caben dos empresas en un despachador. La causa es que el handler está atado a un stream.

**Dicta los pasos:**
1. Pídeles la clase `EventStore` con un `Dictionary<string, List<object>>` (la llave es el id). Dos métodos con el id como parámetro: `GetEvents(string aggregateId)` devuelve el cajón, o una lista vacía; `AppendEvent(string aggregateId, object hecho)` crea el cajón si no existe y agrega el hecho.
2. Advierte: el handler no llama a `GetEvents` ni a `AppendEvent`. Esos métodos los usa el `EventStream`.
3. 🔁 `EventStream<T>` deja de guardar su lista. Recibe `(EventStore store, string aggregateId)` por constructor. `Get()` pide `store.GetEvents(id)` y rehidrata. `Append(hecho)` llama a `store.AppendEvent(id, hecho)`.
4. Muestra el uso: `store.AbrirStream<Empresa>("emp-7")`, un `Append` de `EmpresaRegistrada` y luego `store.AbrirStream<Empresa>("emp-7").Get().Nombre`. 🆕 `new(this, aggregateId)` crea el objeto sin repetir el tipo; el `where` de la clase va también en el método. Pídeles `AbrirStream<T>(string aggregateId)` en `EventStore`, que crea el stream pasándole `this`.
5. 🔁 Los comandos ganan el id: `CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan)` y `SuspenderEmpresa(string EmpresaId, string Motivo)`. 🔁 Los handlers reciben el `EventStore` y abren con `store.AbrirStream<Empresa>(cmd.EmpresaId)`.
6. 🔁 Arriba: un `EventStore`, un `Despachador`, `Registrar` de los dos handlers con el `store` (una vez). Luego `Enviar(new SuspenderEmpresa("emp-7", "falta de pago"))`, `Enviar(new CambiarPlanDeEmpresa("emp-9", "Premium"))`, `var andes = store.AbrirStream<Empresa>("emp-7").Get();` y que impriman `$"emp-7: suspendida={andes.Suspendida}"`.
7. Que sigan el id con la vista: `AbrirStream(id)` → `AppendEvent(id, …)` → `_cajones[id]`. Es el mismo string en todo el camino.

**✅ Punto de control:** el ejemplo de `AbrirStream` imprime `Constructora Andes`, y el final imprime `emp-7: suspendida=True`. Los handlers se registran una sola vez, con el `store`. Si alguien no llega: solución en los `<details>` de «El almacén», «Paso 1», «Paso 2» y «El handler ya no recibe un stream suelto».

**Si se traban:**
- `KeyNotFoundException` en `GetEvents` → `_cajones[id]` lanza si la llave no existe; comprueben antes con `ContainsKey`.
- Un hecho "desaparece" → en `AppendEvent` agregan a una lista suelta; el cajón se crea dentro del diccionario antes de agregar.
- `new EventStream<Empresa>()` ya no compila → el stream ahora se pide con `AbrirStream`; reemplacen el código suelto viejo.

**Cierra con:** "El almacén guarda un cajón de hechos por id; el stream que entrega lee y escribe el de una empresa; el handler, registrado una vez, la busca por el `EmpresaId` del comando." Commit con la reflexión: ¿por qué atar los handlers a un stream no escalaba a dos empresas?, ¿cómo viaja el mismo id desde `AbrirStream` hasta la llave del cajón?

**Puente:** "Ahora muchas peticiones usan el mismo almacén. ¿Qué pasa si dos tocan la misma empresa a la vez?"

---

## 9 · Cuando dos escriben a la vez (concurrencia optimista)  ·  ⏱ ~40 min  ·  [concurrencia-optimista.md](secciones/concurrencia-optimista.md)

**Para qué:** numerar cada hecho con su versión y rechazar la escritura que llega tarde: concurrencia optimista.

**Abre así (lo dices en voz alta):** "Dos peticiones cargan Constructora Andes al mismo tiempo. Una la suspende. La otra le cambia el plan mirando una empresa que ya no está activa. ¿Quién se entera?"

**Haz sentir el dolor:** corre `var a = store.AbrirStream<Empresa>("emp-7");` y `var b = …` igual, luego `a.Get(); b.Get();`. Después `a.Append(new EmpresaSuspendida("falta de pago"));` y `b.Append(new PlanCambiado("Enterprise"));`. Las dos entran sin error. B decidió sobre un estado viejo: es una **actualización perdida**, y nadie se enteró.

**Dicta los pasos:**
1. Explica la versión: la posición de cada hecho en la historia de su empresa (1.º, 2.º…). Dicta el sobre: `public record EventoAlmacenado(int Version, object EventData);`. No lleva el id, porque el cajón ya es de una empresa.
2. Da la regla: cada hecho dice qué posición cree ocupar. Si esa posición ya está tomada, alguien escribió primero y se rechaza.
3. 🔁 `EventStore` guarda `List<EventoAlmacenado>`. En `AppendEvent(id, EventoAlmacenado sobre)`, si `sobre.Version <= cajon.Count`, lanza `ConcurrencyException`, una excepción propia como `ReglaDeNegocioException`. `GetEvents` devuelve los sobres.
4. 🆕 `sobres.Select(s => s.EventData)` devuelve solo el hecho de cada sobre. 🔁 En `EventStream<T>`: un campo `_version`. `Get` guarda `_version = sobres.Count` y pasa a `Load` los hechos sin sobre. `Append` hace `_version++` y envía `new EventoAlmacenado(_version, hecho)`.
5. 🔁 Repite el escenario sobre un almacén limpio: reemplacen el código suelto por `var store = new EventStore();` y siembren `emp-7` con `store.AbrirStream<Empresa>("emp-7").Append(new EmpresaRegistrada("Constructora Andes", "Básico"));`. `a` y `b` cargan en la versión 1; `a` escribe la 2; `b` también trae la 2.
6. Nombra: **concurrencia optimista**. No bloquea a nadie; verifica la versión al guardar. Si hay choque, se recarga, se vuelve a decidir y se reintenta.

**✅ Punto de control:** `b.Append` lanza `ConcurrencyException` con "La versión 2 ya está ocupada (el cajón va en 2)…". Con un solo escritor, los hechos entran en las versiones 1, 2, 3. Si alguien no llega: solución en el `<details>` de «Numerar cada hecho: el sobre».

**Si se traban:**
- La empresa sale vacía después de `Get` → están pasando los sobres a `Load`; pasen `sobres.Select(s => s.EventData)`.
- También lanza `a.Append` → falta `_version = sobres.Count` en `Get`, y el stream cree que el cajón está vacío.

**Cierra con:** "La versión es el detector de choques: no bloquea, verifica al guardar." Commit con la reflexión: con dos streams de la misma empresa, ¿qué excepción salta y por qué?, ¿qué habría pasado sin la versión?

**Puente:** "El motor decide, valida y versiona. Pero todas sus acciones producen un solo hecho. ¿Hay alguna que produzca dos?"

---

## 10 · Un acto de negocio, dos hechos  ·  ⏱ ~20 min  ·  [un-acto-dos-hechos.md](secciones/un-acto-dos-hechos.md)

**Para qué:** montar una acción que produce dos hechos (pagar y reactivar) y chocar con el límite del modelo en que `decide` devuelve el hecho.

**Abre así (lo dices en voz alta):** "Una empresa suspendida por falta de pago paga su deuda. El negocio pide, en un solo acto, registrar el pago y reactivarla. La regla: no se reactiva una empresa que todavía debe."

**Haz sentir el dolor:** lo ven al correr el paso 4. El acto revienta con `ReglaDeNegocioException: No puedes reactivar con deuda pendiente.`, aunque el pago se registró en la línea anterior.

**Dicta los pasos:**
1. Pídeles `record PagoRegistrado(int Monto)` y, en `Empresa`, la propiedad `DeudaPendiente`. 🔁 El `case EmpresaSuspendida` pone además `DeudaPendiente = true`, y un `case PagoRegistrado` la pone en `false`. Aclara la simplificación: aquí toda suspensión es por mora.
2. `RegistrarPago(int monto)` devuelve `PagoRegistrado`. `Reactivar` lanza `ReglaDeNegocioException` si `DeudaPendiente`. El comando: `PagarDeuda(string EmpresaId, int Monto)`.
3. Muestra el `PagarDeudaHandler`, que viene escrito, y que lo copien al final: `Get`, luego `Append(e.RegistrarPago(cmd.Monto))` y `Append(e.Reactivar())`.
4. 🔁 Reemplacen el código suelto (el choque de la sección anterior lanza y corta el programa): `var store = new EventStore();`, siembren `emp-7` registrada y suspendida con dos `Append` sobre `store.AbrirStream<Empresa>("emp-7")`, y corran `new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));`.
5. Haz el 🔮 antes de explicar: ¿qué mira `Reactivar` para decidir, y qué no ha visto? Mira `e`, y `e` no vio el pago. Los `decide` devuelven el hecho pero no se lo aplican al agregado: `e.DeudaPendiente` sigue en `true`.

**✅ Punto de control:** todos ven `ReglaDeNegocioException: No puedes reactivar con deuda pendiente.` y saben explicar por qué. No es un error de su código: es el límite del modelo. Si alguien no llega: solución en el `<details>` del «Inténtalo tú».

**Si se traban:**
- No lanza → el `case EmpresaSuspendida` no pone `DeudaPendiente = true`.
- El handler no compila → falta el `EmpresaId` en `PagarDeuda`, o `RegistrarPago` no devuelve el hecho.

**Cierra con:** "Con dos hechos, el segundo `decide` decide a ciegas: el problema está en quién aplica el hecho." Commit con la reflexión: ¿qué mira `Reactivar` para decidir, y por qué eso no incluye el pago recién hecho?

**Puente:** "La cura cambia quién aplica el hecho: que la empresa se lo aplique en el momento de decidir."

---

## 11 · El agregado recuerda lo que decide  ·  ⏱ ~55 min  ·  [el-agregado-recuerda.md](secciones/el-agregado-recuerda.md)

**Para qué:** que el agregado se aplique cada hecho al decidir y los acumule, y que un solo `Append` guarde todo. Así pagar-y-reactivar funciona.

**Abre así (lo dices en voz alta):** "¿Y si la empresa se aplicara el hecho en el momento de decidirlo? El siguiente `decide` vería el cambio."

**Haz sentir el dolor:** recuerda la excepción de la sección anterior y muestra el código que quieren poder escribir: `var e = stream.Get(); e.RegistrarPago(500); e.Reactivar(); stream.Append(e);`. Hoy no compila: `Append` recibe un hecho, no la empresa.

**Dicta los pasos:** (avisa: es un cambio de modelo. Primero la base, que compila sola; lo demás va junto.)
1. 🆕 `IReadOnlyList<T>`: una lista que se lee desde afuera pero no se modifica. En `AggregateRoot`: lista privada `_sinConfirmar`, expuesta como `IReadOnlyList<object> SinConfirmar`. `protected void Emitir(object hecho)` llama a `Aplicar` y agrega el hecho a la lista. `MarcarConfirmados()` vacía la lista. `Load` no cambia.
2. 🔁 En `Empresa`: cada `decide` pasa a `void` y llama a `Emitir(new …)`, sin perder sus validaciones. `Suspender` empieza con `if (Suspendida) return;`. Nuevo verbo `Registrar(nombre, plan)`, que emite `EmpresaRegistrada`.
3. 🔁 `EventStream<T>.Append(T agg)`: recorre `agg.SinConfirmar`, guarda cada hecho con su versión y al final llama a `agg.MarcarConfirmados()`.
4. 🔁 Los tres handlers (`CambiarPlanHandler`, `SuspenderHandler`, `PagarDeudaHandler`): `var e = stream.Get(); e.X(...); stream.Append(e);`. El de suspender pierde su `if (hecho is not null)`. El `Despachador` no cambia.
5. 🔁 Siembren con el modelo nuevo, reemplazando el arnés anterior: `var store = new EventStore();`, `var s = store.AbrirStream<Empresa>("emp-7");`, `var e = s.Get();` (vacía), `e.Registrar("Constructora Andes", "Básico")`, `e.Suspender("falta de pago")` y `s.Append(e)`. Luego `new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));`, recargan e imprimen la línea del ✅.
6. Pregunta: ¿por qué `Load` aplica pero no acumula? El replay reconstruye; solo las decisiones nuevas se acumulan.

**✅ Punto de control:** sale `Tras recargar → Suspendida=False, DeudaPendiente=False`. Suspender dos veces deja un solo `EmpresaSuspendida`. Si alguien no llega: solución en el `<details>` del «Inténtalo tú», con las cuatro piezas.

**🔨 Rómpelo (si hay tiempo):**
- (a) Pongan `Emitir` en vez de `Aplicar` dentro de `Load` y corran pagar-y-reactivar. No lanza nada, y la empresa recargada sale igual. Que impriman `store.GetEvents("emp-7").Count`: sale 6 en vez de 4. El `Append` volvió a escribir detrás, con versiones nuevas, el registro y la suspensión recién cargados. Es peor que una excepción: el diario se duplica sin aviso. Restauren `Aplicar`.
- (b) Comenten `case EmpresaReactivada:` y corran pagar-y-reactivar. Nada explota, pero al recargar sale `Suspendida=True`, aunque el hecho está en el diario. Es un **huérfano**: no revienta, miente. Restauren la línea.

**Si se traban:**
- No compila `Append(new EmpresaRegistrada…)` o `Append(hecho)` → `Append` ahora recibe el agregado. Siembren con `e.Registrar(...)` + `s.Append(e)` y borren las demos viejas.
- `CambiarPlan` ya no lanza con la empresa suspendida → se perdió el `if (Suspendida) throw …` al pasar a `Emitir`.

**Cierra con:** "Reconstruir (replay, solo aplica) y decidir (aplica y recuerda) son dos caminos distintos." En `DECISIONES.md`: «`Aplicar` solo asigna estado: no valida ni lanza, no mira el reloj ni genera ids — el replay lo re-ejecuta N veces y debe dar siempre lo mismo. Las reglas y los datos nuevos viven en los verbos (`CambiarPlan`, `Reactivar`), que corren UNA vez.» Commit con la reflexión: ¿qué gana el agregado al aplicarse el hecho al decidir?, ¿por qué el replay no debe acumular?

**Puente:** "El huérfano mintió sin que nada explotara, y todo lo comprobamos mirando la consola. ¿Cómo sabemos, sin mirar, que el motor hace lo que creemos?"

---

## 12 · Verde, y roto  ·  ⏱ ~45 min  ·  [verde-y-roto.md](secciones/verde-y-roto.md)

**Para qué:** escribir el primer test automatizado del agregado y distinguir un test que protege de uno que pasa con el motor roto.

**Abre así (lo dices en voz alta):** "Cuando comentamos un `case`, el estado quedó mal y nada explotó. Escribamos un test que nos avise. ¿Nos va a avisar?"

**Haz sentir el dolor:** en el paso 3, el `UnitTest1.cs` de la plantilla no afirma nada y pasa: `Correctas! - Con error:     0, Superado:     1, Omitido:     0, Total:     1` (en inglés: `Passed! - Failed: 0, Passed: 1, Skipped: 0, Total: 1`). En el paso 5, un sabotaje rompe el motor y el test sigue en verde.

**Dicta los pasos:**
1. Desde la carpeta del `.git`, no dentro de `Empresas.Historia/`: `dotnet new xunit -o Empresas.Tests` y `dotnet add Empresas.Tests/Empresas.Tests.csproj reference Empresas.Historia/Empresas.Historia.csproj`. Para correr los tests: `cd Empresas.Tests` y `dotnet test`.
2. 🆕 xUnit: un test es un método `[Fact]` que prepara, ejecuta y afirma con `Assert`. Si la afirmación se cumple, verde; si no, rojo. Las clases que se prueban deben ser `public`.
3. Que abran `UnitTest1.cs`, corran `dotnet test` (verde sin afirmar nada) y lo borren.
4. Dicta el test natural, en un archivo nuevo `Empresas.Tests/SuspensionTests.cs` que empieza con `using Xunit;`: clase `SuspensionTests`, `[Fact] Suspender_deja_la_empresa_suspendida`. `new Empresa()`, `Load` con `EmpresaRegistrada("Andes", "Básico")`, `Suspender("falta de pago")` y `Assert.True(empresa.Suspendida)`. Verde. Señala: siembran con `Load` porque deja `SinConfirmar` vacío.
5. Sabotaje: en `Suspender`, cambien `Emitir(...)` por `Aplicar(...)`. `dotnet test`: sigue verde. El test miró el estado, y `Aplicar` lo cambia igual; no miró el hecho que se guarda.
6. Con el sabotaje puesto, pídeles `Suspender_emite_el_hecho`: la misma preparación y `Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida)`. Rojo. Restauren `Emitir`: verde.
7. Nombra la forma: **dado–cuando–entonces**, afirmando los hechos emitidos.

**✅ Punto de control:** con el sabotaje, el test de estado sale verde y el de hechos rojo. Con `Emitir` restaurado, todos verdes. Si alguien no llega: solución en el `<details>` «La cura».

**🔨 Rómpelo (si hay tiempo):** comenten otra vez `case EmpresaReactivada:`: los dos tests siguen verdes. Agreguen `Suspender_tras_reactivar_emite_el_hecho`. Dado: registrada, suspendida, `PagoRegistrado(500)`, reactivada. Cuando: suspender. Entonces: hay un `EmpresaSuspendida` sin confirmar. Sale rojo; restauren y sale verde. Extra: borren `if (Suspendida) return;` de `Suspender`. Todo sigue verde, porque ningún test suspende dos veces. Ese test queda como su siguiente reto.

**Si se traban:**
- `dotnet test` no encuentra `Empresa` o `EmpresaRegistrada` → falta la referencia (`dotnet add … reference …`), o esas clases no son `public`.
- Crearon `Empresas.Tests` dentro de `Empresas.Historia/` → bórrenlo y créenlo desde la carpeta del `.git`.

**Cierra con:** "El resultado de una decisión son los hechos que emite: afirmen los hechos, no el estado." En `DECISIONES.md`: «Mis tests afirman los **hechos emitidos** (`SinConfirmar`), no el estado en memoria: el estado es un intermedio del replay y puede pasar verde con el motor roto.» Commit con la reflexión: ¿por qué el test de `empresa.Suspendida` pasó verde sin que se emitiera el hecho?, ¿qué miraba y qué debía mirar?

**Puente:** "Estos tests arman la historia en memoria y la olvidan al terminar. Nada prueba que el diario sobreviva a apagar y volver a prender."

---

## 13 · El diario en disco (y lo que se queda afuera)  ·  ⏱ ~50 min  ·  [el-diario-en-disco.md](secciones/el-diario-en-disco.md)

**Para qué:** guardar el diario en archivos para que sobreviva al reinicio, y descubrir que en disco hay que guardar también el tipo de cada hecho.

**Abre así (lo dices en voz alta):** "Registramos Constructora Andes, le cambiamos el plan y la suspendemos. Cerramos el programa y lo volvemos a abrir. ¿Qué queda?"

**Haz sentir el dolor:** corre un programa que solo lee: `new EventStore()`, `store.AbrirStream<Empresa>("emp-7").Get()` e imprimir `$"{empresa.Nombre}: {empresa.Plan}"`. Sale `: `, vacío. El `Dictionary` vivía en RAM y murió con el proceso anterior.

**Dicta los pasos:**
1. Aclara: un archivo de texto no es lo que usarían en producción. Lo usamos porque es lo más simple que sobrevive al reinicio, y deja ver la mecánica sin una base de datos que la esconda.
2. 🆕 Archivos: `Path.Combine`, `Directory.CreateDirectory`, `File.Exists`, `File.ReadAllLines`, `File.AppendAllText` y `Environment.NewLine`. 🆕 `System.Text.Json`: `JsonSerializer.Serialize` y `JsonSerializer.Deserialize<T>(…)!`. Que pongan `using System.Text.Json;` en la **primera línea** del `Program.cs`, antes del código suelto: junto a la clase no compila.
3. Pídeles cambiar solo el interior de `EventStore`. El constructor recibe la carpeta y la crea, así que `new EventStore("datos")`. `AppendEvent` conserva la verificación de versión (lee lo que ya hay) y agrega el sobre serializado como una línea a `<id>.log`. `GetEvents` deserializa cada línea a `EventoAlmacenado`, o devuelve una lista vacía.
4. 🔁 Que reemplacen el código suelto y siembren con el modelo acumulador: `var store = new EventStore("datos");`, `var s = store.AbrirStream<Empresa>("emp-7");`, `var e = s.Get();`, `Registrar`, `CambiarPlan("Enterprise")` antes de `Suspender`, y `s.Append(e)`. Abren `datos/emp-7.log`: los tres hechos están. Luego `Get` e imprimir: sale `: , activa`. No explota: devuelve una empresa falsa.
5. Haz el 🔮: ¿qué sabía cada hecho en RAM que estas líneas ya no dicen? Su clase. 🆕 Deserializar hacia `object` devuelve un `JsonElement`. Que impriman `sobre.EventData.GetType().Name`: sale `JsonElement`, y ningún `case` del `switch` lo reconoce.
6. 🆕 `GetType().Name`, `.GetRawText()` y `JsonSerializer.Deserialize(texto, unType)`. Pídeles `record EnDisco(int Version, string Tipo, object Datos)` para escribir y para leer, y un mapa `Dictionary<string, Type>` de nombre a clase, llenado a mano con los tres eventos que usa esta empresa: `EmpresaRegistrada`, `PlanCambiado` y `EmpresaSuspendida` (si meten los cinco, el paso 9 no falla). Al escribir: `Tipo` = `sobre.EventData.GetType().Name`. Al leer: `GetRawText()` de `Datos` y deserializar a la clase del mapa.
7. **Que borren `datos/`** antes de correr con el formato nuevo (la sección lo pide antes del arnés): las líneas viejas no tienen `Tipo`, y leerlas lanza `NullReferenceException`.
8. 🔁 La siembra del paso 4 pasa a ser el arnés "sembrar si está vacío": si `Get().Nombre == ""`, siembran; siempre rehidratan e imprimen. Corren dos veces sin borrar `datos`.
9. Provoca el olvido del mapa, como en la 🌱: `new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));`. Ni `PagoRegistrado` ni `EmpresaReactivada` están en el mapa. El pago se escribe; al escribir la reactivación, `AppendEvent` relee el diario y sale `KeyNotFoundException: The given key 'PagoRegistrado' was not present in the dictionary.` Desde aquí `emp-7` ya no se puede leer: que quiten esa línea y borren `datos/`, porque mientras quede la línea del pago, toda corrida revienta al leer `emp-7`.

**✅ Punto de control:** la segunda corrida no siembra y aun así imprime `Constructora Andes: plan Enterprise, suspendida`. Cada línea de `datos/emp-7.log` tiene su `Tipo`. En el archivo, `Básico` aparece como `B\u00E1sico`: la sección lo muestra así y lo explica (`System.Text.Json` escapa lo que no es ASCII; al leer vuelve a `Básico`). Si alguien no llega: solución en los dos `<details>` de la sección.

**Si se traban:**
- `NullReferenceException` al leer después de pasar al formato con `Tipo` → quedaron líneas viejas en `datos/`; bórrenlo y vuelvan a sembrar.
- No encuentran `datos/` → se crea donde corren `dotnet run`, dentro de `Empresas.Historia/`.

**Cierra con:** "Persistir el diario no es solo guardar los datos: es guardar de qué hecho son." En `DECISIONES.md`, tal cual y sin comentarla: «Rotulé cada hecho en disco con `GetType().Name`: el nombre de MI clase de C# quedó escrito dentro de la historia persistida.» Commit con la reflexión: ¿qué cambió entre RAM y disco que obligó a guardar el tipo?

**Puente:** "Ese `Tipo` es el nombre de la clase. ¿Qué pasa con la historia guardada el día que alguien renombra la clase?"

---

## 14 · El nombre del hecho es un contrato  ·  ⏱ ~35 min  ·  [el-nombre-es-un-contrato.md](secciones/el-nombre-es-un-contrato.md)

**Para qué:** dar a cada evento un nombre estable en disco, aparte del nombre de su clase, para que renombrar una clase no deje ilegible la historia.

**Abre así (lo dices en voz alta):** "Renombrar una clase es un clic en el IDE. Con el diario en disco, ese clic puede borrarnos el pasado."

**Haz sentir el dolor:** es el 🔨 de la sección. Pega en tu código suelto, arriba del arnés, el experimento: `lineaDeAyer` con `"Tipo":"PlanCambiado"` y `mapaDeHoy`, que solo conoce `"PlanActualizado"`. Luego `JsonSerializer.Deserialize<EnDisco>(lineaDeAyer)!` y `mapaDeHoy[d.Tipo]`. Sale `KeyNotFoundException: The given key 'PlanCambiado' was not present in the dictionary.` Nadie olvidó nada: un renombre de rutina dejó ilegible el pasado, y el compilador no avisó.

**Dicta los pasos:**
1. Explica: el nombre escrito en disco es una promesa que el código futuro debe cumplir. `GetType().Name` la ata a algo que cambiamos cuando queremos.
2. La cura: un nombre estable que eligen ellos y no cambia nunca, separado de la clase. En disco queda `"Tipo":"plan-cambiado"`.
3. Haz el 🔮: al escribir tienen el tipo del hecho, y el mapa va de nombre a clase. ¿Cómo sacan el nombre? Recorriendo el mapa. 🆕 `foreach (var par in mapa)` da cada entrada con `.Key` y `.Value`.
4. Pídeles: renombrar el mapa a `_porNombre` con llaves estables (`"empresa-registrada"`, `"plan-cambiado"`, `"empresa-suspendida"`, `"empresa-reactivada"`, `"pago-registrado"`). Un `NombreDe(Type)` que recorra el mapa y devuelva la llave. En `AppendEvent`, rotular con `NombreDe(sobre.EventData.GetType())`. `GetEvents` no cambia.
5. **Que borren `datos/`** y vuelvan a escribir una empresa (la sección lo pide): las líneas viejas tienen nombres de clase, y leerlas lanza `KeyNotFoundException`.
6. Que renombren `PlanCambiado` con el IDE (actualiza el `case` y los `new`) y cambien solo el `typeof` de esa línea del mapa.
7. Pregunta: ¿y si dejo en el mapa las dos llaves, la vieja y la nueva? Para leer funciona. Pero cada renombre agrega otra llave para siempre, y el nombre en disco sigue cambiando.

**✅ Punto de control:** con la cura, `datos/emp-7.log` muestra `"Tipo":"empresa-registrada"` y `"Tipo":"plan-cambiado"`. Después de renombrar la clase, la empresa guardada antes rehidrata igual. Si alguien no llega: solución en el `<details>` del «Inténtalo tú».

**🔨 Rómpelo (si hay tiempo):** ya lo usaste para abrir: es el experimento de `lineaDeAyer`.

**Si se traban:**
- `KeyNotFoundException` con un nombre de clase (por ejemplo `'EmpresaRegistrada'`) → son líneas escritas antes del cambio; borren `datos/`.
- `InvalidOperationException: Evento sin nombre estable: …` → ese evento no está en `_porNombre`; agréguenlo.

**Cierra con:** "El nombre con que un hecho vive en disco es un contrato permanente, separado del nombre de la clase." Menciona los tres pendientes que deja la 🌱: el almacén conoce cada evento por su nombre; el nombre estable no protege la forma del evento; y pagar-y-reactivar escribe dos líneas seguidas. Commit con la reflexión: ¿por qué el nombre en disco no puede ser el nombre de la clase?, ¿qué se rompe y cuándo?

**Puente:** "Pagar-y-reactivar escribe dos líneas, una tras otra. ¿Qué pasa si el proceso muere entre la primera y la segunda? La empresa pagó y sigue suspendida."

---

## 15 · Todo o nada: el diario en una base de datos real  ·  ⏱ ~75 min  ·  [todo-o-nada.md](secciones/todo-o-nada.md)

**Para qué:** que pagar-y-reactivar entre entero o no entre, mudando el diario de archivos a una tabla de Postgres escrita a mano con SQL.

**Abre así (lo dices en voz alta):** "Si el proceso muere justo entre el pago y la reactivación, ¿en qué estado queda la empresa? Vamos a matarlo y mirar."

**Haz sentir el dolor:** en pantalla, dentro del bucle de `Append`, justo después de `_store.AppendEvent(...)`, agrega `if (hecho is PagoRegistrado) throw new Exception("💥 corte de luz");`. Corre pagar-y-reactivar sobre una morosa y abre el `.log`: la última línea es `{"Version":3,"Tipo":"pago-registrado","Datos":{"Monto":500}}` y no hay `empresa-reactivada`. Al rehidratar: `Suspendida=True, DeudaPendiente=False`. Pregunta si lo arreglan escribir las dos líneas juntas, un temporal con `rename` o un archivo de pendientes. No: ninguno es una transacción.

**Dicta los pasos:**
1. Levanta Postgres: `docker run -d --name empresas-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`. Comprueba con `docker exec empresas-db pg_isready -U postgres` → `accepting connections`.
2. Agrega el driver, dentro de `Empresas.Historia/`: `dotnet add package Npgsql --version 10.0.3`. Y `using Npgsql;` en la primera línea del `Program.cs`, junto al `using System.Text.Json;`.
3. 🆕 Di en una línea qué es una transacción: `conn.BeginTransaction()` agrupa los `INSERT`; entran todos con `tx.Commit()`, o ninguno. Y que `SqlState == "23505"` significa "clave duplicada".
4. En `EventStore`, el constructor recibe la `cadena` y crea la tabla `eventos(stream, version, tipo, datos JSONB, PRIMARY KEY (stream, version))`. Muestra el `CREATE TABLE` y explica que esa llave es su concurrencia optimista, ahora en la base.
5. `GetEvents(id)`: `SELECT version, tipo, datos ... ORDER BY version`, deserializando con el mapa `_porNombre`.
6. `Guardar(id, sobres)`: todos los `INSERT` en una sola transacción; atrapa `PostgresException` con `23505` y lanza `ConcurrencyException`.
7. `EventStream.Append`: arma los sobres numerando desde `_version` y llama a `Guardar`. `Get()`, la `Empresa` y los handlers no cambian.
8. 🔁 Reemplacen el código suelto: `var store = new EventStore("Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres");` y la siembra de `emp-7` (`Registrar` + `Suspender`, un solo `Append`). La base nace vacía. Corren una vez y **comentan la siembra** (si corre otra vez, agrega un segundo `EmpresaRegistrada`).
9. Prueba 1, el rollback: un `throw new Exception("💥");` justo antes de `tx.Commit()` en `Guardar`, y debajo de la siembra comentada el acto pagar-y-reactivar sobre `emp-7`. Corren y miran la tabla (comando del ✅): 2 filas. Quiten el `throw` y corran otra vez: 4 filas.
10. Prueba 2: dos escritores cargan `emp-7`; A hace `CambiarPlan("Premium")` y `Append`, B `CambiarPlan("Enterprise")` y `Append` → `ConcurrencyException`. Prueba 3: dos streams de `emp-9`, que no existe; ambos `Registrar` y `Append` → el segundo lanza. Cada prueba corre sola, una vez: comenten la anterior antes de la siguiente, porque una excepción corta el programa.
11. Haz el 🔨 de la contraseña (abajo), con la cadena aún escrita en el código.
12. 🆕 Una variable de entorno es un valor con nombre que la terminal le pasa al programa. 🆕 `a ?? throw …` lanza si `a` es `null`. Pide que `cadena` lea `CADENA_POSTGRES` con `?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.")` y que pasen `cadena` a `new EventStore(...)`.
13. Fijarla: `export CADENA_POSTGRES="Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=postgres"` en bash, o `$env:CADENA_POSTGRES = "..."` en PowerShell.

**✅ Punto de control:** con el `throw` antes del `Commit`, `docker exec empresas-db psql -U postgres -c "SELECT version, tipo FROM eventos WHERE stream='emp-7' ORDER BY version"` muestra solo 2 filas; sin el `throw`, 4. El segundo escritor de `emp-7` y el segundo nacimiento de `emp-9` lanzan `ConcurrencyException`, y `emp-9` queda con una fila. Sin la variable, `dotnet run` se detiene con `InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.`; con ella, corre igual. Si alguien no llega: solución en el `<details>` de "Mudar el diario a Postgres" y en el de "La cadena llega de afuera".

**🔨 Rómpelo (hazlo, es el paso 11):** con la cadena aún en el código, `git add .`, `git commit -m "ES · Todo o nada: Postgres a mano, con la cadena en el código"` (sin `push`) y `git log -p -S "Password="` (se sale con `q`): aparece la línea con la contraseña. Tras la cura, `git grep "Password="` no da nada, pero `git log -p -S "Password="` la sigue mostrando. Remata: un secreto que tocó git no se borra, se rota.

**Si se traban:**
- Fijaron la variable y el programa no la ve → lo corren desde el IDE; que usen `dotnet run` en la terminal donde la fijaron.
- `No password has been provided but the backend requires one` → faltan las comillas en el `export`: bash cortó la cadena en el primer `;`.
- `git log -p -S "Password="` no muestra nada → hicieron la cura antes del commit del 🔨; la contraseña nunca entró a git, y eso está bien.

**Cierra con:** "Un acto de varios hechos necesita una transacción, que un archivo no tiene; y el `PRIMARY KEY(stream, version)` hace ahora tu concurrencia optimista." Commit con la reflexión: *¿qué te da la base que un archivo no puede, y por qué importaba para un acto de dos hechos?*

**Puente:** "El negocio pide 'todas las empresas suspendidas ahora mismo'. Tenemos SQL. ¿Basta un `SELECT`?"

---

## 16 · La pregunta que el diario no sabe responder  ·  ⏱ ~40 min  ·  [la-vista-de-lectura.md](secciones/la-vista-de-lectura.md)

**Para qué:** listar las empresas suspendidas hoy con un `SELECT` simple, gracias a una tabla aparte (un read model) que se actualiza al escribir.

**Abre así (lo dices en voz alta):** "Operaciones quiere el listado de suspendidas. Tienen Postgres delante. ¿Qué `SELECT` escribirían?"

**Haz sentir el dolor:**
- Que vacíen el diario, para ver la salida de la sección: `docker exec empresas-db psql -U postgres -c "TRUNCATE eventos"` (si no, sale también `emp-7`, que se suspendió en Todo o nada).
- Que siembren con el helper `sembrar(id, hacer)` de la sección (muéstralo en pantalla): emp-1 activa; emp-2 y emp-4 suspendidas; emp-3 suspendida y, en otro acto, `RegistrarPago(500)` + `Reactivar()`. Corren una vez y comentan las llamadas a `sembrar`: cada corrida las vuelve a anexar al diario.
- 🔮 Antes de correr: "¿aparece emp-3?". Corre en `psql` `SELECT DISTINCT stream FROM eventos WHERE tipo = 'empresa-suspendida';` → `emp-2, emp-3, emp-4`. Está mal: emp-3 volvió.
- Después el escaneo (`TodosLosStreams()` + rehidratar cada una): da bien (`emp-2`, `emp-4`), pero rejuega el diario de cada empresa por una sola pregunta.

**Dicta los pasos:**
1. En `EventStore`, `TodosLosStreams()`: `SELECT DISTINCT stream FROM eventos ORDER BY stream`. Lo usan para el escaneo del dolor.
2. 🆕 Upsert: `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` mete la fila si no existe y la cambia si existe, sin preguntar antes.
3. Crea la clase `Suspendidas(cadena)`; su constructor crea `empresas_estado(id TEXT PRIMARY KEY, suspendida BOOL NOT NULL)`.
4. `Actualizar(id, empresa)`: el upsert con `e.Suspendida`. `Listar()`: `SELECT id FROM empresas_estado WHERE suspendida ORDER BY id`.
5. Pásala por constructor a `SuspenderHandler` y `PagarDeudaHandler`; en cada uno, después de `stream.Append(e)`, `vista.Actualizar(cmd.EmpresaId, e)`. Se arma a mano en `Program.cs`, con la misma `cadena` del store.
6. Corre `vista.Listar()`: sale vacío. Pregunta por qué antes de explicarlo: la siembra escribió al diario sin llamar `Actualizar`.
7. Agrega `vista.Actualizar(id, e);` al helper `sembrar` y, con las llamadas anteriores aún comentadas, siembra `emp-5` suspendida → `emp-5`. Luego que borren las dos tablas (`docker exec empresas-db psql -U postgres -c "DROP TABLE eventos, empresas_estado"`; los constructores las vuelven a crear), descomenten la siembra, corran una vez con el helper que proyecta y la vuelvan a comentar.

**✅ Punto de control:** `vista.Listar()` da las suspendidas correctas (emp-3 no aparece) sin rehidratar nada. Suspenden una empresa y aparece; registran su pago y desaparece. Si alguien no llega: solución en el `<details>` de "Guardar, aparte, una vista para leer".

**Si se traban:**
- `Listar()` sale vacío → es lo esperado con la siembra vieja: no llamaba `Actualizar`. Resiembren con el helper que proyecta.
- No compila `new SuspenderHandler(store)` → ahora pide también la vista: `new SuspenderHandler(store, vista)`.

**Cierra con:** "El diario sirve para escribir; para leer el estado de hoy, una tabla derivada que se puede borrar y reconstruir." Antes del commit, que anoten en `DECISIONES.md`: "Actualizo la vista DENTRO del handler, justo tras el `Append` — y acepto que son dos escrituras separadas." Commit con la reflexión: *¿por qué "está suspendida" no sale de un `SELECT` sobre `eventos`, y sí de una tabla aparte?*

**Puente:** "Operaciones pide un dato más en esa vista: el plan. Y las empresas que ya existen no van a volver a pasar por un handler."

---

## 17 · Rejugar el diario: reconstruir la vista  ·  ⏱ ~30 min  ·  [reconstruir-la-vista.md](secciones/reconstruir-la-vista.md)

**Para qué:** llenar la vista con lo que ya pasó cuando cambia de forma, borrándola y volviéndola a derivar del diario.

**Abre así (lo dices en voz alta):** "Queremos el plan junto a cada suspendida. Añadimos la columna. ¿Qué plan creen que va a salir para emp-2 y emp-4?"

**Haz sentir el dolor:** antes, que comenten las llamadas a `sembrar`: si la siembra corre otra vez, `Actualizar` escribe el plan y el dolor no se ve. Corre en `psql` `ALTER TABLE empresas_estado ADD COLUMN plan TEXT NOT NULL DEFAULT '';`, haz que `Actualizar` escriba el plan y consulta: `emp-2 → plan=''`, `emp-4 → plan=''`. 🔮 Pista: ¿cuándo corre `Actualizar`? Luego pregunta: "¿y si volvemos a ejecutar los comandos?". La respuesta: anexaría otra suspensión y otro pago al diario. El pasado no se re-ejecuta; pero está guardado.

**Dicta los pasos:**
1. 🆕 SQL: `DELETE FROM empresas_estado` vacía la tabla sin borrarla; el `DEFAULT ''` del `ALTER` es lo que queda en las filas viejas.
2. En `Actualizar`, agrega `plan` al upsert, en el `INSERT` y en el `DO UPDATE SET` (`e.Plan`).
3. `Suspendidas` recibe ahora el `EventStore` por constructor: `new Suspendidas(cadena, store)`.
4. `Reconstruir()`: `DELETE FROM empresas_estado` y, por cada id de `TodosLosStreams()`, `Actualizar(id, _store.AbrirStream<Empresa>(id).Get())`.
5. `ListarConPlan()`: `SELECT id, plan FROM empresas_estado WHERE suspendida ORDER BY id`, para comprobar.
6. Arriba: `vista.Reconstruir();` y que impriman cada fila de `ListarConPlan()` como `{id} → plan='{plan}'`.

**✅ Punto de control:** tras `vista.Reconstruir()`: `emp-2 → plan='Premium'`, `emp-4 → plan='Enterprise'`, `emp-5 → plan='Básico'`, y emp-3 no aparece. Dos corridas seguidas dan lo mismo. Si alguien no llega: solución en el `<details>` de "Vaciar la vista y rejugar el diario".

**Si se traban:**
- No compila donde crean la vista → ahora pide el store: `new Suspendidas(cadena, store)`.
- Postgres dice que la columna `plan` no existe → no corrieron el `ALTER TABLE`; el `CREATE TABLE IF NOT EXISTS` no cambia una tabla que ya existe.

**Cierra con:** "Los hechos no se re-ejecutan; las conclusiones se re-derivan. Lo único que no pueden perder es el diario." En `DECISIONES.md`: "Reconstruir = borrar todo y re-derivar del diario, no parchar las filas incompletas", con el costo al lado (la vista vacía mientras rejuega). Commit con la reflexión: *¿por qué la vista se puede rehacer sin miedo y los comandos del pasado no se pueden volver a ejecutar?*

**Puente:** "Reconstruir lo corren a mano, y cada handler sigue teniendo que acordarse de `Actualizar`. ¿Y si el proceso muere entre el `Append` y el `Actualizar`?"

---

## 18 · La vista se mantiene sola  ·  ⏱ ~40 min  ·  [la-vista-se-mantiene-sola.md](secciones/la-vista-se-mantiene-sola.md)

**Para qué:** que un proyector derive la vista del diario desde un checkpoint, y que los handlers dejen de tocarla.

**Abre así (lo dices en voz alta):** "Hoy cada handler escribe dos veces: el hecho y la vista. ¿Qué pasa si muere entre las dos?"

**Haz sentir el dolor:** muestra, sin correrlo, el `SuspenderHandler` con la caída entre `s.Append(e)` y `vista.Actualizar("emp-1", e)`. emp-1 queda suspendida en el diario y ausente de la vista, sin ninguna excepción. La vista depende de que cada escritor se acuerde.

**Dicta los pasos:**
1. Explica por qué `version` no sirve de cursor: reinicia en 1 en cada empresa. 🆕 `BIGSERIAL`: un contador que Postgres asigna en cada `INSERT`, cruzando todas las empresas.
2. En `psql`: `ALTER TABLE eventos ADD COLUMN seq BIGSERIAL;`. La llave `(stream, version)` se queda.
3. 🆕 Checkpoint: el `seq` hasta el que llegó el proyector, guardado en una tabla. En `psql`: `CREATE TABLE checkpoint(nombre TEXT PRIMARY KEY, ultimo_seq BIGINT NOT NULL);` y `INSERT INTO checkpoint VALUES ('empresas_estado', 0) ON CONFLICT DO NOTHING;`.
4. `CorrerProyector()`, una función en el código suelto de `Program.cs` (usa `store` y `vista`), igual que sus ayudantes `LeerCursor`, `HechosDesde` y `GuardarCursor`: `LeerCursor()`; `HechosDesde(desde)` con `SELECT seq, stream FROM eventos WHERE seq > desde ORDER BY seq`; por cada uno, rehidrata la empresa y llama `vista.Actualizar(stream, empresa)`; al final `GuardarCursor(ultimo)`. Devuelve cuántos aplicó.
5. Quita `vista.Actualizar` de `SuspenderHandler` y `PagarDeudaHandler`: vuelven a una sola escritura.
6. Escenario limpio, en `psql`: `TRUNCATE eventos, empresas_estado;` y `UPDATE checkpoint SET ultimo_seq = 0;`.
7. 🔁 Reemplacen la siembra anterior por solo estos `Append`, sin tocar la vista (si usan el helper `sembrar`, quítenle el `vista.Actualizar`): emp-1 (`Registrar("Andes","Básico")`, `CambiarPlan("Premium")`, `Suspender("falta")`) y emp-2 (`Registrar("Beta","Enterprise")`). Debajo, dos llamadas seguidas a `CorrerProyector()` que impriman lo que devuelven. Tras la primera corrida, comenten la siembra.

**✅ Punto de control:** antes de proyectar, la vista está vacía. `CorrerProyector()` devuelve `4` la primera vez y `0` la segunda; emp-1 sale suspendida con plan Premium, emp-2 activa con su plan. Con `ultimo_seq` en 0, la vista se reconstruye entera. Si alguien no llega: solución en los `<details>` del Paso 1 y del Paso 2.

**Si se traban:**
- `plan` en blanco → escriben la vista mirando el tipo del hecho; que rehidraten la empresa y la pasen a `Actualizar`.
- Reaplica todo cada vez → no guardan el checkpoint al final; revisen el `UPDATE checkpoint`.
- La vista se salta hechos → ordenaron por `version` o por `stream`; es `ORDER BY seq`.

**Cierra con:** "El proyector se cura solo tras una caída, es idempotente, y reconstruir es bajar el checkpoint a 0." En `DECISIONES.md`: «La vista se **deriva del diario** por un proyector con checkpoint, no la actualiza cada handler. El proyector **rehidrata** cada empresa y copia su estado completo, así mantiene todas las columnas (incluida `plan`) sin mirar el tipo del hecho.» Commit con la reflexión: *¿qué ganaste al mover "poner la vista al día" a un solo proyector, y por qué rehidratar le gana a un `if` por tipo de hecho?*

**Puente:** "El proyector corre aparte de quien escribe. Entre que un hecho entra y el proyector lo aplica, la vista va atrás. ¿Cuánto?"

---

## 19 · El rezago: ¿cuánto atrás va la vista?  ·  ⏱ ~20 min  ·  [el-rezago.md](secciones/el-rezago.md)

**Para qué:** medir cuántos hechos le faltan a la vista, y fijar la regla: los comandos deciden con el diario, nunca con la vista.

**Abre así (lo dices en voz alta):** "Acabo de suspender a emp-4. ¿La vista ya lo sabe?"

**Haz sentir el dolor:** en pantalla, sobre emp-4: `Registrar("Delta", "Básico")`, `Suspender("falta de pago")`, `Append`, sin correr el proyector. `vista.Listar().Contains("emp-4")` → `false`. No es un bug: el proyector no ha corrido. Pregunta: ¿de qué tamaño es esa ventana?

**Dicta los pasos:**
1. `Rezago()`: `FrenteDelDiario()` (`SELECT COALESCE(MAX(seq), 0) FROM eventos`) menos `LeerCursor()`.
2. Pruébenlo: `Append` de 3 hechos sin proyectar → `Rezago()` da `3`; corran el proyector → `0`. Diles que es el primer panel de su monitor.
3. Hagan el 🔨 de emp-5 todos juntos (abajo): es lo central de la sección.

**✅ Punto de control:** `Rezago()` sube con cada `Append` y cae a `0` al proyectar. Con emp-5 suspendida y sin proyectar, `!vista.Listar().Contains("emp-5")` da `true` y `store.AbrirStream<Empresa>("emp-5").Get().Suspendida` da `true`. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (no lo saltes):** registra emp-5 activa, suspéndela, no proyectes. Leyendo la vista, la regla la reactivaría (`pareceReactivable` da `true`): invariante violada sin un error. Rehidratando el diario, la bloquea (`estaSuspendida` da `true`). La vista responde preguntas; las decisiones van al diario.

**Si se traban:**
- `Rezago()` da negativo → restan al revés, o leen el checkpoint de otra vista; es `frente − leido`.
- Da 0 con hechos sin proyectar → el `MAX(seq)` no apunta a la tabla `eventos`.

**Cierra con:** "El rezago no se arregla: se mide y se respeta. Quien mira lo tolera; quien decide va al diario." En `DECISIONES.md`: «Mido el rezago (frente del diario − checkpoint). Los comandos deciden rehidratando el diario, **nunca** leyendo una proyección: la vista puede ir atrás.» Commit con la reflexión: *¿cuándo es gratis el rezago y cuándo es peligroso? Un ejemplo de cada uno con la `Empresa`.*

**Puente:** "Ese panel asume que el proyector avanza. ¿Y si un hecho lo hace tropezar a mitad del lote?"

---

## 20 · El proyector tropieza  ·  ⏱ ~45 min  ·  [el-proyector-tropieza.md](secciones/el-proyector-tropieza.md)

**Para qué:** que un hecho que el proyector no puede aplicar no congele toda la vista (se aparta, queda visible, y sigue); y ver que, si el que lanza es `Aplicar`, apartar no basta.

**Abre así (lo dices en voz alta):** "Nuestro store no deja escribir un tipo que no conoce. Pero una migración o un segundo servicio sí pueden meterlo. ¿Qué hace el proyector?"

**Haz sentir el dolor:** para que la salida se parezca a la de la sección: registra emp-1 y proyecta; inyecta en `psql` `INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-bomba', 1, 'tipo-desconocido', '{}');`; registra emp-2; corre el proyector ingenuo. Sale `💥 KeyNotFoundException: 'tipo-desconocido'`, el checkpoint se queda antes de la bomba, el rezago da `2` y crece, y la vista solo tiene emp-1.

**Dicta los pasos:**
1. 🆕 Tabla de apartados (el "dead-letter" del proyector): una lista consultable de lo que no pudo aplicar. En `psql`, `CREATE TABLE proyeccion_fallos(seq BIGINT PRIMARY KEY, stream TEXT, error TEXT, cuando TIMESTAMPTZ DEFAULT now())`.
2. En `CorrerProyector()`, envuelve el `Get()` + `vista.Actualizar(...)` en `try/catch`; en el `catch`, `Apartar(seq, stream, ex.Message)` con `ON CONFLICT (seq) DO NOTHING`.
3. Que `ultimo = seq` corra siempre, en éxito y en fallo.
4. Segunda bomba (es el 🔨 de la sección, hazla con todos): en `Empresa`, que el `case EmpresaReactivada` lance `InvalidOperationException("Reactivada sin estar suspendida.")` si no estaba suspendida. Registren emp-6 (`Registrar("Zeta", "Básico")`), proyecten, e inyecten `INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-6', 2, 'empresa-reactivada', '{}');`. El proyector la aparta, pero `store.AbrirStream<Empresa>("emp-6").Get()` lanza `💥 InvalidOperationException: Reactivada sin estar suspendida.`
5. La cura: un `Aplicar` total. En ese `case`, `if (!Suspendida) break;`. Recuérdales que ya estaba en su `DECISIONES.md` desde "El agregado recuerda".
6. Comprueben: `Get()` carga emp-6, `Suspender("falta de pago")` + `Append` entra, y el proyector la muestra suspendida.

**✅ Punto de control:** con el `try/catch`, emp-2 se proyecta, el rezago vuelve a `0` y `SELECT * FROM proyeccion_fallos` muestra una fila de `emp-bomba`. Con el `Aplicar` total, emp-6 carga sin tocar el diario. Si alguien no llega: solución en los `<details>` de "Apartar el hecho y seguir" y "Cuando el que falla es tu `Aplicar`".

**🔨 Rómpelo:** la segunda bomba (paso 4) es el 🔨 de esta sección. No la saltes: la cura del paso 5 parte de ella.

**Si se traban:**
- El proyector sigue clavado → el `catch` no avanza el checkpoint; `ultimo = seq` y `GuardarCursor` corren también en el fallo.
- El `INSERT` de la segunda bomba choca por clave duplicada → emp-6 ya tiene versión 2; usen `SELECT MAX(version) FROM eventos WHERE stream = 'emp-6'` más uno.
- Al reconstruir (checkpoint a 0) el proyector muere en la bomba → falta el `ON CONFLICT (seq) DO NOTHING` en `Apartar`.

**Cierra con:** "Un hecho raro degrada una empresa, no toda la vista. Si el hecho es válido y lanza tu `Aplicar`, la cura es un `Aplicar` total." En `DECISIONES.md`, dos líneas: «El proyector aparta el hecho que no puede aplicar y sigue; queda visible en `proyeccion_fallos`. Distinguir transitorio de permanente es criterio; el reproceso en sí lo dejo para cuando lo necesite.» y «Mi `Aplicar` es total: con un hecho que conoce, nunca lanza. Si no encuentra lo que busca, no hace nada. Apartar en `proyeccion_fallos` es para lo que el código no conoce.» Commit con la reflexión: *¿por qué el proyector avanza el checkpoint aunque aparte un hecho? ¿Qué pasaría con el rezago si no?*

**Puente:** "Con este martillo dan ganas de event-sourcear todo. ¿Todo lo merece?"

---

## 21 · ¿Merecía event sourcing?  ·  ⏱ ~35 min  ·  [merecia-event-sourcing.md](secciones/merecia-event-sourcing.md)

**Para qué:** decidir con dos preguntas cuándo no usar event sourcing, y hacer el catálogo de planes como una tabla plana que no pierde un cambio cuando dos lo editan a la vez.

**Abre así (lo dices en voz alta):** "El negocio quiere un catálogo de planes con su precio. ¿Le montamos diario, proyección, checkpoint y panel de fallos?"

**Haz sentir el dolor:** escribe en el tablero lo que costaría: `PlanRegistrado`, `PrecioCambiado`, otra vista, otro `CorrerProyector()`, su `checkpoint`, su `proyeccion_fallos`, su `Reconstruir()`. Pregunta: ¿alguien va a preguntar cómo llegó Premium a $150.000? ¿Hay alguna regla que un `UPDATE` al precio pueda violar?

**Dicta los pasos:**
1. En `psql` (`docker exec -it empresas-db psql -U postgres`): `CREATE TABLE planes(codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL);`, inserten Básico (0), Premium (120000) y Enterprise (450000), suban Premium a 150000 con un `UPDATE` y listen con `SELECT ... ORDER BY precio`.
2. Escribe las dos preguntas en el tablero y llenen la tabla para `Empresa` y catálogo: ¿importa la historia? ¿hay una invariante que un `UPDATE` pueda romper? Aclara: una `PRIMARY KEY` o un `precio >= 0` los sostiene la base; la invariante que pide diario es la que ningún `CHECK` atrapa.
3. `ALTER TABLE planes ADD COLUMN version INT NOT NULL DEFAULT 1;` y el primer 🔨 (abajo).
4. La cura: cada `UPDATE` exige la versión que leyó, `... WHERE codigo = 'premium' AND version = 3`. Desde C#, `ExecuteNonQuery() == 0` → `ConcurrencyException`.
5. Segundo 🔨 ("Una sola verdad"): agreguen `public record PrecioCambiado(string Codigo, int NuevoPrecio);`, su línea `["precio-cambiado"]` en el mapa, y graben `store.Guardar("plan-premium", new[] { new EventoAlmacenado(1, new PrecioCambiado("premium", 180000)) });`. El diario dice 180000, la tabla 160000, y el proyector mete `plan-premium` en `empresas_estado`.
6. La cura: borren el `record` y su línea del mapa, y corran `DELETE FROM eventos WHERE stream = 'plan-premium';` y `DELETE FROM empresas_estado WHERE id = 'plan-premium';`.

**✅ Punto de control:** con `AND version = 3`, A responde `UPDATE 1` y B `UPDATE 0`. Tras la limpieza, Premium tiene un solo precio: el de la tabla. Si alguien no llega: solución en el `<details>` de "Hazlo plano" y del Paso 1.

**🔨 Rómpelo (hazlo, la cura parte de aquí):** dos `psql`, A y B. Ambos leen `150000 | 1`. A: `UPDATE planes SET precio = 160000, version = version + 1 WHERE codigo = 'premium';`; después B, lo mismo con `140000`. Ambos `UPDATE 1`. Lean otra vez: `140000 | 3`. El cambio de A se perdió sin aviso: la versión era de adorno.

**Si se traban:**
- B no ve ningún error → Postgres no lanza; la señal del conflicto es `UPDATE 0`.
- A también da `UPDATE 0` → su versión actual no es la 3; que lean `SELECT precio, version` y usen esa.

**Cierra con:** "Si nadie pregunta por la historia y no hay invariante que un `UPDATE` rompa, la tabla plana es lo correcto. Plano no es sin cuidado: la versión va en el `WHERE`, y se borra lo que contradice la decisión." En `DECISIONES.md`, tres líneas: «El catálogo `planes` es una tabla plana: nadie pregunta por su historia y no tiene una invariante que un `UPDATE` rompa.» «Cada `UPDATE` de `planes` exige la versión que leyó (`WHERE version = @v`): 0 filas es un conflicto.» «En el código no queda nada que haga parecer event-sourced al catálogo: ni hechos del catálogo ni su nombre en el mapa del diario.» Commit con la reflexión: *un tercer ejemplo del dominio, decidido con las dos preguntas: ¿diario o tabla plana?*

**Puente:** "Cada vez que prueban una regla, arrancan una base de datos. Ese peso es lo próximo."

---

## 22 · El puerto propio  ·  ⏱ ~35 min  ·  [el-puerto-propio.md](secciones/el-puerto-propio.md)

**Para qué:** sacar una interfaz `IEventStore` con dos implementaciones (Postgres y memoria) para probar handlers sin contenedor, y ver que el doble tiene que fallar donde falla Postgres.

**Abre así (lo dices en voz alta):** "Para probar que un handler suspende, hoy necesitan el contenedor arriba. ¿Por qué una regla de negocio depende de dónde se guardan los hechos?"

**Haz sentir el dolor:** muestra que `EventStream` y los handlers nombran el `EventStore` de Postgres. Un test de handler (cargar, suspender, guardar) no corre sin la base, y el proyecto del dominio arrastra `Npgsql`.

**Dicta los pasos:**
1. 🆕 Puerto: una interfaz que el dominio posee; dice lo que necesita, no cómo se hace.
2. Declaren `IEventStore` con `List<EventoAlmacenado> GetEvents(string id)` y `void Guardar(string id, IReadOnlyList<EventoAlmacenado> sobres)`.
3. Renombren el store a `PostgresEventStore : IEventStore`, con el IDE para que cambien también sus usos. El cuerpo no cambia.
4. 🆕 Método de extensión: `this IEventStore store` como primer parámetro; se llama como si fuera de la interfaz. Muevan `AbrirStream<T>` a `EventStoreExtensions`.
5. `EventStream<T>`, los handlers y el proyector reciben `IEventStore`, no el tipo concreto.
6. `InMemoryEventStore : IEventStore` con un `Dictionary<string, List<EventoAlmacenado>>`. Insiste: si llega una `Version` que ese id ya tiene, lanza `ConcurrencyException`.
7. En `Empresas.Tests/`, escriban sus tests de handlers contra el doble (`new InMemoryEventStore()`), incluido uno de dos escrituras concurrentes (dos `Get()` de la misma versión, dos `Append`).

**✅ Punto de control:** los tests de handlers corren contra `InMemoryEventStore`, sin contenedor; en el de dos escrituras, el segundo `Append` lanza `ConcurrencyException`. Si alguien no llega: solución en los `<details>` del Paso 1 y del Paso 2.

**🔨 Rómpelo:** quiten el `if (_d[id].Any(x => x.Version == s.Version))` **y** el `throw` que lo sigue (si quitan solo el `if`, el doble lanza siempre), y corran el test de dos escrituras: los dos `Append` pasan, verde. En Postgres ese caso choca. El doble ingenuo da falso verde.

**Si se traban:**
- El dominio sigue viendo `Npgsql` → algún handler o el `EventStream` todavía nombra `PostgresEventStore`; cámbienlo a `IEventStore`.
- El doble no compila `ConcurrencyException` → reúsenla de "Concurrencia optimista", no la redefinan.

**Cierra con:** "El puerto da tests rápidos y libertad de motor, y cobra dos cosas: el doble debe tener las mismas garantías, y lo que la interfaz no expone nadie lo puede usar." Commit con la reflexión: *¿el doble y `PostgresEventStore` dan el mismo resultado ante dos escrituras concurrentes? ¿Por qué eso importa más que la velocidad?*

**Puente:** "El negocio quiere identificar cada empresa por su NIT, y que no haya dos con el mismo. La versión de un stream no alcanza para eso."

---

## 23 · Dos streams, la misma clave  ·  ⏱ ~45 min  ·  [dos-streams-misma-clave.md](secciones/dos-streams-misma-clave.md)

**Para qué:** que no existan dos empresas con el mismo NIT, aun con dos registros a la vez, reservando el NIT en una tabla única dentro de la misma transacción que los primeros hechos.

**Abre así (lo dices en voz alta):** "¿Por qué no usamos el NIT como id del stream? La Prueba 3 de Todo o nada ya protegía el nacimiento." Deja que respondan; cierra con: el NIT se puede corregir, y el id tiene que ser estable para siempre.

**Haz sentir el dolor:** escribe en el tablero el pseudocódigo `if (store.HayEmpresaConNit(nit)) throw new ReglaDeNegocioException("NIT ya registrado");` y dibuja dos registros a la vez: ambos leen "no existe", ambos crean con ids distintos → `streams con NIT 900123 → 2`. Pregunta por qué la concurrencia optimista no salva: cada una es la versión 1 de su propio stream. La regla es del conjunto de empresas.

**Dicta los pasos:**
1. 🆕 Localizador: una tabla clave de negocio → stream, escrita en la misma transacción que los eventos del registro. En `psql`: `CREATE TABLE localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL);`
2. Cambien `EmpresaRegistrada(Nombre, Plan)` a `EmpresaRegistrada(Nit, Nombre, Plan)` y `Registrar(nombre, plan)` a `Registrar(nit, nombre, plan)`; ajusten los tests y cada `Registrar` que marque el compilador. Diles que guarden la incomodidad: cambiaron la forma de un hecho.
3. Agreguen a `IEventStore`: `void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos)`.
4. En `PostgresEventStore.GuardarNuevo`: en una transacción, el `INSERT` en `localizador` y los eventos numerados desde 1 (con `NombreDe`); `23505` → `NitYaExisteException` (que la creen).
5. En `InMemoryEventStore`: la misma garantía con un `Dictionary<string,string>` NIT→id.
6. El registro, en el código suelto: `var nit = "900123";`, `var e = new Empresa();`, `e.Registrar(nit, "Constructora Andes", "Premium");`, luego `store.GuardarNuevo("emp-7", nit, e.SinConfirmar)` y `e.MarcarConfirmados()` dentro de un `try`; si atrapa `NitYaExisteException`, no crea un hecho nuevo.

**✅ Punto de control:** dos registros del mismo NIT → uno entra (su hecho en versión 1); el otro lanza `NitYaExisteException` y no deja ni localizador ni eventos. El doble da el mismo resultado. Si alguien no llega: solución en el `<details>` de "Reservar el NIT, atómicamente, en el store".

**🔨 Rómpelo:** el doble clic: registren dos veces el mismo NIT y confirmen que el diario tiene `EmpresaRegistrada` una sola vez.

**Si se traban:**
- `GuardarNuevo` no compila con `e.SinConfirmar` → la firma pide `IReadOnlyList<object>`, no `EventoAlmacenado`.
- Quedó el localizador sin eventos, o al revés → los dos `INSERT` no van en el mismo `tx` con un solo `Commit`.
- El doble no rechaza el NIT repetido → falta el diccionario NIT→id; sin él, verde falso.

**Cierra con:** "Una regla de conjunto la sostiene el store, con un índice único en la misma transacción. El id es interno y estable; el NIT va aparte, en un índice que sí se corrige." Commit con la reflexión: *¿por qué la versión por stream no impedía dos empresas con el mismo NIT? ¿Qué ganarías y qué perderías usando el NIT como id?*

**Puente:** "Llegan los grupos empresariales: una empresa puede ser filial de otra, y ninguna puede terminar colgando de sí misma. Eso no es una clave repetida."

---

## 24 · El árbol de empresas  ·  ⏱ ~45 min  ·  [el-arbol-de-empresas.md](secciones/el-arbol-de-empresas.md)

**Para qué:** que dos cambios a la vez no cierren un ciclo de matrices, poniendo todo el árbol en un solo stream (el del grupo), y que el recorrido siempre termine.

**Abre así (lo dices en voz alta):** "Si emp-a es filial de emp-b, emp-b no puede ser filial de emp-a. Cada empresa guarda su matriz en su stream. ¿Qué pasa si las dos asignaciones llegan a la vez?"

**Haz sentir el dolor:** muestra en pantalla el código del dolor de la sección y que lo copien: en `Empresa`, el `MatrizAsignada(string MatrizId)`, `Matriz` y `AsignarMatriz`; junto a `Empresa`, la clase `Jerarquia.SubeHasta`; y el test `Dos_cambios_a_la_vez_cierran_un_ciclo` en `Empresas.Tests/ArbolDeEmpresas.cs`. Avisa antes de correr: `dotnet test` no va a terminar; córtenlo con Ctrl+C. Ninguna escritura chocó: cada una fue la versión 1 de su stream.

**Dicta los pasos:**
1. 🆕 Una frontera para la regla: si una regla mira varias empresas, todo lo que mira va en un stream, el del grupo; dos cambios cargan la misma versión y el segundo choca.
2. Cambien el hecho a `MatrizAsignada(string Filial, string Matriz)`.
3. `GrupoEmpresarial : AggregateRoot` con `Dictionary<string, string> _matrizDe` (filial → matriz). `Aplicar` solo anota la pareja. Su propio `SubeHasta` privado lee `_matrizDe.GetValueOrDefault(id)`. `AsignarMatriz(filial, matriz)` lanza `ReglaDeNegocioException` si cerraría un ciclo; si no, emite.
4. Borren lo del dolor: `Matriz`, su `case` y `AsignarMatriz` en `Empresa`, la clase `Jerarquia`, el test y su `Asignar`.
5. Muestra en pantalla el test `Dos_cambios_a_la_vez_chocan_en_el_grupo` de la sección; que lo copien en `ArbolDeEmpresas.cs` y lo hagan pasar. 🆕 `Assert.Throws<T>(() => …)` pasa si lo de adentro lanza una `T`.
6. 🆕 `HashSet<string>`: `Add` devuelve `false` si ya estaba. En `SubeHasta`, anoten cada empresa visitada; si se repite, `InvalidOperationException` con "ciclo" en el mensaje. Test (en pantalla, al mismo archivo): `Una_historia_con_ciclo_falla_al_recorrerla`.

**✅ Punto de control:** en `grupo-andes`, la segunda asignación lanza `ConcurrencyException` y al reintentar `ReglaDeNegocioException`; la historia con ciclo falla con `InvalidOperationException` en vez de colgarse; `dotnet test` pasa entero. Si alguien no llega: solución en los `<details>` del Paso 1 y del Paso 2.

**🔨 Rómpelo:** en `Dos_cambios_a_la_vez_chocan_en_el_grupo`, abran la petición 2 sobre `"grupo-sur"`: cae con `Assert.Throws() Failure: No exception was thrown`. Cada grupo, solo, está sano; el árbol no. Que devuelvan `"grupo-andes"`.

**Si se traban:**
- `dotnet test` no termina → quedó el test del dolor, o `SubeHasta` no anota en `vistos`. Ctrl+C.
- El segundo `Append` del grupo no lanza `ConcurrencyException` → no cargaron el grupo las dos veces antes de guardar, o el doble perdió el chequeo de versión.
- `error CS0103` (`Jerarquia`) o `CS1061` (`AsignarMatriz` en `Empresa`) → quedó código del dolor; bórrenlo.

**Cierra con:** "La versión de un stream protege lo que vive en ese stream. Elegir la frontera es elegir qué reglas puedes garantizar, y su precio es que todo cambio al árbol pasa por un solo stream." En `DECISIONES.md`: «La jerarquía de un grupo vive en un solo stream (`grupo-…`): "sin ciclos" mira el árbol entero, y solo la versión de ese stream hace chocar dos cambios a la vez. Todo recorrido del árbol anota lo visitado.» Commit con la reflexión: *¿por qué la versión de cada empresa no impidió el ciclo? ¿Qué pierdes con todo el árbol en un stream?*

**Puente:** "Ahora el negocio pide inactivar una matriz con todas sus filiales de un golpe. ¿Qué pasa si el árbol cambia mientras recorren la rama?"

---

## 25 · La rama entera  ·  ⏱ ~35 min  ·  [la-rama-entera.md](secciones/la-rama-entera.md)

**Para qué:** inactivar una matriz con todas sus filiales sin que una filial que entra a la vez quede activa, decidiendo la inactivación dentro del grupo.

**Abre así (lo dices en voz alta):** "El grupo nos da la lista de la rama y cada empresa guarda su inactivación. ¿Qué protege esa lista mientras escribimos?"

**Haz sentir el dolor:** muestra en pantalla el código del dolor de la sección y que lo copien: `Rama(raiz)` pública en el grupo, `EmpresaInactivada` con `Inactiva` e `Inactivar()` en `Empresa`, y el test `Inactivar_desde_una_foto_inactiva_toda_la_rama` en `Empresas.Tests/LaRamaEntera.cs`. `dotnet test`: rojo. emp-a y emp-b quedan inactivas, emp-d queda activa bajo emp-b, sin un error. La lista fue una foto.

**Dicta los pasos:**
1. `RamaInactivada(string Raiz, IReadOnlyList<string> Empresas)`, que va al stream del grupo, e `InactivarRama(raiz)`, que la emite con `Rama(raiz)`. Explica por qué el hecho lleva la lista: a quién alcanza es parte de la decisión.
2. Vuelvan `Rama` privada: fuera del grupo, la lista es otra foto.
3. Borren `EmpresaInactivada`, su `case`, `Inactiva`, `Inactivar` y el test del dolor.
4. Muestra en pantalla el test `La_filial_que_entra_a_la_vez_cae_en_la_rama` de la sección; que lo copien en `LaRamaEntera.cs` y lo hagan pasar.
5. Un `HashSet<string> _inactivas` en el grupo; en `Aplicar`, un `case RamaInactivada` que agrega cada empresa; al inicio de `AsignarMatriz`, `ReglaDeNegocioException` si la matriz está ahí. Test (en pantalla, al mismo archivo): `Bajo_una_matriz_inactiva_no_entra_una_filial`.

**✅ Punto de control:** la inactivación que guarda tarde lanza `ConcurrencyException`, y al reintentar su rama incluye a emp-d; bajo una matriz inactiva no entra ninguna filial; `dotnet test` pasa entero. Si alguien no llega: solución en los `<details>` del Paso 1 y del Paso 2.

**🔨 Rómpelo:** borren el `if (_inactivas.Contains(matriz))`: `Bajo_una_matriz_inactiva_no_entra_una_filial` cae con `Assert.Throws() Failure: No exception was thrown`. Que deshagan el cambio.

**Si se traban:**
- La rama del reintento no incluye a emp-d → reintentaron con el `g1` viejo; abran el stream otra vez y hagan `Get()`.
- `s1.Append(g1)` no lanza `ConcurrencyException` → los dos `Get()` van antes del primer `Append`.
- `error CS0122` (`Rama` es inaccesible) → quedó el test del dolor; bórrenlo.

**Cierra con:** "Un acto sobre toda una rama tiene la frontera de la regla que protege: se decide dentro del grupo, no sobre una foto, y cada filial nueva valida su matriz." En `DECISIONES.md`: «Un acto sobre una rama se decide dentro del grupo y se guarda como un hecho del grupo, con la lista que decidió. Bajo una matriz inactiva no entra una filial.» Commit con la reflexión: *¿por qué inactivar cada empresa en su stream dejó pasar a emp-d? ¿Qué pierde `Empresa` ahora que no sabe que está inactiva?*

**Puente:** "`EmpresaInactivada` se borró gratis porque vivía en memoria. `EmpresaRegistrada` vive en Postgres, y le cambiamos la forma: las empresas viejas no tienen `Nit`."

---

## 26 · La forma del hecho se congela  ·  ⏱ ~65 min  ·  [la-forma-del-hecho-se-congela.md](secciones/la-forma-del-hecho-se-congela.md)

**Para qué:** leer hechos viejos con una forma distinta a la de hoy sin tocar el disco (un upcaster), fijarlo en un test contra una base de pruebas propia, y dejar la validación en el verbo.

**Abre así (lo dices en voz alta):** "Las empresas registradas antes del NIT no tienen `Nit`. ¿Qué pasa al rehidratarlas? ¿Revienta?"

**Haz sentir el dolor:** en `psql`, `INSERT INTO eventos(stream, version, tipo, datos) VALUES ('emp-legado', 1, 'empresa-registrada', '{"Nombre":"Acme","Plan":"Premium"}'::jsonb);` y relee: `GetEvents("emp-legado") → EmpresaRegistrada { Nit = null, Nombre = "Acme", Plan = "Premium" }`. No falla. 🆕 Explica: System.Text.Json llama al constructor del `record` y pasa el valor por defecto a lo que no encuentra. Ese `null` revienta lejos, o pasa como un NIT vacío.

**Dicta los pasos:**
1. 🆕 Upcaster: convierte, al leer, el JSON viejo en el evento de hoy; el disco no se toca. 🆕 `JsonDocument.Parse(json).RootElement` y `TryGetProperty("Nit", out _)`.
2. En `PostgresEventStore.GetEvents`, si `tipo == "empresa-registrada"`, llamen `Upcast(json)`; los demás tipos, igual. Sin `Nit`, márquenlo `"SIN-NIT-LEGADO"`: no se inventa.
3. Muestra en pantalla el test `Un_registro_sin_Nit_se_lee_marcado` y que lo copien en `Empresas.Tests/LaFormaDelHecho.cs` (lee `CADENA_POSTGRES`, hace el `INSERT`, afirma `"SIN-NIT-LEGADO"`). Que corran `dotnet test` dos veces, en la terminal donde fijaron la variable.
4. Base de pruebas: `docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas_tests"`.
5. 🆕 Fixture compartido de xUnit: una clase que prepara lo que varios tests usan; xUnit crea una y se la pasa a cada clase de tests por constructor. Lo conectan `[CollectionDefinition("postgres")]`, `[Collection("postgres")]` y ese constructor. 🆕 `IAsyncLifetime`: xUnit llama a `InitializeAsync()` antes de cada test.
6. Creen `Empresas.Tests/PostgresFixture.cs` (con `using Npgsql;`). `Cadena`: la de `CADENA_POSTGRES` con la base cambiada, `new NpgsqlConnectionStringBuilder(cadena) { Database = "empresas_tests" }.ConnectionString`. El constructor crea `eventos` (`new PostgresEventStore(Cadena)`) y `localizador` (`CREATE TABLE IF NOT EXISTS`).
7. En la misma clase, `Ejecutar(sql)` y `Limpiar()` con `TRUNCATE eventos, localizador`. Al final del archivo, `[CollectionDefinition("postgres")] public class ColeccionPostgres : ICollectionFixture<PostgresFixture> { }`.
8. El test queda con `[Collection("postgres")]`, constructor `(PostgresFixture db)`, `IAsyncLifetime` y `db.Limpiar()` en `InitializeAsync`; el `INSERT` pasa a `db.Ejecutar(...)`.
9. Segundo 🔨 (abajo): el `record Nit` dentro del hecho, y su test.
10. La cura: el hecho vuelve a `EmpresaRegistrada(string Nit, string Nombre, string Plan)` (y el `Upcast` y el primer test, a su forma de texto). `Registrar` emite `new Nit(nit).Valor`. El segundo test siembra `"Nit":""` y compara `registrada.Nit` con `""`.
11. Agreguen `Registrar_con_Nit_vacio_lanza` con sus tests de reglas, fuera de la colección: `Assert.Throws<ArgumentException>(() => new Empresa().Registrar("", "Acme", "Premium"))`.

**✅ Punto de control:** sin fixture, la segunda corrida cae con `Npgsql.PostgresException : 23505: duplicate key value violates unique constraint "eventos_pkey"` (desde la primera si sembraron `emp-legado` en el dolor). Con fixture, `dotnet test` dos veces seguidas, verde. Al final pasan los tres tests. Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo:**
- (1) Quiten el upcaster: el test cae, `Nit` vuelve a `null`.
- (2) Este va sí o sí, la cura depende de él. Muestra en pantalla el `record Nit` que valida en su constructor y `EmpresaRegistrada(Nit Nit, string Nombre, string Plan)`; que arreglen lo que deja de compilar. Agreguen a `LaFormaDelHecho` el test `Un_registro_con_Nit_vacio_se_rehidrata` (siembra `{"Nit":{"Valor":""},…}`): cae con `System.ArgumentException : El NIT no puede ir vacío.` Rehidratar no valida; la regla vive en el verbo.

**Si se traban:**
- `The following constructor parameters did not have matching fixture data: PostgresFixture db` → falta `[Collection("postgres")]` en la clase de tests.
- `3D000: database "empresas_tests" does not exist` → corran el `CREATE DATABASE` del paso 4.
- `error CS0738: … 'ValueTask'` → usan xUnit v3: `Task` pasa a `ValueTask` y `Task.CompletedTask` a `ValueTask.CompletedTask`.

**Cierra con:** "La forma del hecho se congela al escribirlo: se reconcilia al leer, un dato esencial perdido se marca, y el hecho lleva primitivos." En `DECISIONES.md`: «Mis tests contra Postgres usan su propia base (`empresas_tests`), vaciada antes de cada test. Los hechos llevan primitivos: la regla vive en el verbo, no en el hecho.» Commit con la reflexión: *un cambio de forma que resolverías con un default en el upcaster y otro que no. ¿Qué los distingue?*

**Puente:** "Conciliación pregunta cuánto ha pagado cada empresa. La vista `Suspendidas` no sabe nada de pagos."

---

## 27 · La vista por consulta  ·  ⏱ ~35 min  ·  [la-vista-por-consulta.md](secciones/la-vista-por-consulta.md)

**Para qué:** responder "¿cuánto ha pagado cada empresa?" con una segunda vista, `pagos`, que guarda una fila por cada hecho de pago y lleva su propio checkpoint.

**Abre así (lo dices en voz alta):** "¿De dónde sacamos el total pagado: de la vista de estado, o del agregado?"

**Haz sentir el dolor:** el diario todavía no tiene pagos. Primero siembran, una sola vez, dos pagos en emp-1: `var s1 = store.AbrirStream<Empresa>("emp-1");`, `var e1 = s1.Get();`, `e1.RegistrarPago(500)`, `e1.RegistrarPago(300)` y `s1.Append(e1)`. Luego rehidrata emp-1: `e.DeudaPendiente → false`, un bool. El agregado guardó solo "¿debe o no debe?". Si alguien propone agregar `TotalPagado` al agregado: habría que rehidratar diez mil empresas y engordar el modelo de escritura por un reporte. Los montos están en el diario, en cada `PagoRegistrado(Monto)`.

**Dicta los pasos:**
1. 🆕 Varios read models sobre el mismo diario, cada uno con su fila en `checkpoint` por `nombre`. Agregar una vista no toca las otras.
2. En `psql`: `CREATE TABLE pagos(seq BIGINT PRIMARY KEY, empresa TEXT NOT NULL, monto INT NOT NULL);` y `INSERT INTO checkpoint VALUES ('pagos', 0) ON CONFLICT DO NOTHING;`
3. Generalicen `LeerCursor` y `GuardarCursor` para que reciban el `nombre` del checkpoint, y `HechosDesde` para que traiga también `tipo` y `datos`. Ajusten el `CorrerProyector()` de `Suspendidas` a las firmas nuevas (`LeerCursor("empresas_estado")`, la tupla de cuatro).
4. `CorrerProyectorPagos()`: trae todos los hechos; solo si `tipo == "pago-registrado"`, deserializa `PagoRegistrado` e inserta `(seq, stream, Monto)` con `ON CONFLICT (seq) DO NOTHING`. `ultimo = seq` va fuera del `if`. Cuenta solo inserciones reales (`ExecuteNonQuery() == 1`).
5. El reporte: `SELECT empresa, SUM(monto) AS total, COUNT(*) AS pagos FROM pagos GROUP BY empresa ORDER BY empresa;`

**✅ Punto de control:** con los dos pagos sembrados, `CorrerProyectorPagos()` aplica `2` y el reporte da `emp-1 | 800 | 2`. Si sale `1600 | 4`, corrieron el sembrado dos veces. Corrido otra vez, aplica `0`. El `ultimo_seq` de `'pagos'` es igual al `MAX(seq)` de `eventos`. `TRUNCATE pagos` + checkpoint `'pagos'` a 0 reinserta los mismos totales. Si alguien no llega: solución en el `<details>` de "Un read model con la forma de la pregunta".

**🔨 Rómpelo:** antes de dar por buena la vista, que prueben las dos salidas fáciles: `SELECT * FROM empresas_estado` no tiene monto, y el agregado solo da `DeudaPendiente`. Solo `pagos` responde `emp-1 = $800 (2 pagos)`.

**Si se traban:**
- `pagos` duplica filas al reprocesar → falta el `ON CONFLICT (seq) DO NOTHING`, o el `seq` no es la PK.
- El cursor se queda atascado → `ultimo = seq` quedó dentro del `if`.
- `SUM` da de menos → filtraron por `tipo` en el `WHERE` del `SELECT`; traigan todo y filtren en el `foreach`.

**Cierra con:** "Hay un read model por pregunta, todos del mismo diario: por estado (rehidrata el agregado) o por hecho (una fila por evento). La pregunta decide cuál." Commit con la reflexión: *una tercera pregunta del dominio: ¿por estado o por hecho, y por qué?*

**Puente:** "Todo esto vive en la misma base y el mismo proceso. Pronto un hecho tiene que avisarle a algo de afuera, que no lee nuestras tablas."

---

## 28 · El hecho y su anuncio  ·  ⏱ ~50 min  ·  [el-hecho-y-su-anuncio.md](secciones/el-hecho-y-su-anuncio.md)

**Para qué:** que el aviso a facturación nunca mienta, guardando la intención de anunciar en la misma transacción del hecho (una bandeja de salida) y entregándola en un paso aparte.

**Abre así (lo dices en voz alta):** lee la letra pequeña de Todo o nada: "el todo-o-nada cubre solo lo que viaja DENTRO de la transacción". Y sigue: "Facturación vive afuera, en otro proceso. Hoy duele."

**Haz sentir el dolor:** que creen al final de `Program.cs` `public static class MundoExterno { public static List<string> Recibidos = new(); }`, la lista estática que finge a facturación. En pantalla, en el handler: `MundoExterno.Recibidos.Add($"suspendida:{cmd.EmpresaId}")` y luego `stream.Append(e)`, con un `throw` antes del `Commit`. Resultado: `mundo externo → suspendida:emp-1`, `diario → sin la suspensión`. Un fantasma. Pregunta: ¿y si invertimos el orden? (se pierde el anuncio). ¿Y un 2PC? (facturación no se va a enrolar en tu transacción).

**Dicta los pasos:**
1. 🆕 Bandeja de salida (outbox): una tabla que se escribe en la misma transacción que los hechos; un paso aparte la entrega. En `psql`: `CREATE TABLE bandeja_salida(id BIGSERIAL PRIMARY KEY, mensaje TEXT NOT NULL, entregado BOOL NOT NULL DEFAULT false);`
2. En `IEventStore`, `Guardar` gana `IReadOnlyList<string> anuncios`. `PostgresEventStore` inserta cada anuncio en `bandeja_salida` dentro del mismo `tx`; `InMemoryEventStore` los ignora.
3. En `EventStream`: `Append(agg)` delega a `Append(agg, Array.Empty<string>())`, y se agrega el overload `Append(agg, anuncios)`.
4. `SuspenderHandler`: `stream.Append(e, new[] { $"suspendida:{cmd.EmpresaId}" })`. Los demás handlers y `GuardarNuevo` no cambian.
5. `EntregarPendientes()`, solo en `PostgresEventStore`: lee todas las filas `NOT entregado` a una lista, cierra el lector, y luego por cada una `MundoExterno.Recibidos.Add(mensaje)` y `UPDATE ... SET entregado = true`. Devuelve cuántas entregó. Avisa: si cae en medio, puede entregar dos veces; eso se cierra más adelante.
6. En `PostgresFixture`, `CREATE TABLE IF NOT EXISTS bandeja_salida` en el constructor, y súmenla al `TRUNCATE` de `Limpiar()`. En la clase de tests nueva, `MundoExterno.Recibidos.Clear()` en `InitializeAsync`.
7. Muestra en pantalla la clase de tests `ElHechoYSuAnuncio` de la sección, con `Una_caida_despues_de_guardar_no_pierde_el_anuncio`, y que la copien en `Empresas.Tests/ElHechoYSuAnuncio.cs`, primero con `stream.Append(e)`.

**✅ Punto de control:** con `Append(e)`, el test cae con `Assert.Equal() Failure`, `Expected: 1`, `Actual: 0`. Con `stream.Append(e, new[] { "suspendida:emp-1" })`, verde. Un acto que confirma deja una fila `NOT entregado`; `EntregarPendientes()` devuelve 1, y la segunda vez 0. Si alguien no llega: solución en los `<details>` del Paso 2 y del Paso 3.

**🔨 Rómpelo:** el fantasma, con y sin bandeja: con la versión ingenua y un `throw` antes del `Commit`, `MundoExterno` tiene el anuncio y el diario no. Con la bandeja, el mismo `throw` deja vacíos `MundoExterno` y `bandeja_salida`, y el hecho tampoco entra. Que quiten el `throw` al terminar.

**Si se traban:**
- Sigue habiendo fantasma → tocan `MundoExterno` en el handler, o insertan en la bandeja con otra conexión; va en el mismo `tx` de `Guardar`.
- `NpgsqlOperationInProgressException` en `EntregarPendientes` → el `UPDATE` corre con el lector abierto; lean todo a una lista primero.
- `42P01: relation "bandeja_salida" does not exist` en los tests → falta su `CREATE TABLE IF NOT EXISTS` en `PostgresFixture`.

**Cierra con:** "Dos escrituras a dos sistemas no se hacen atómicas. El outbox las reduce a una escritura atómica (el hecho y la intención) más una entrega que se reintenta." Commit con la reflexión: *¿por qué una escritura atómica más una entrega reintentable no miente, y dos escrituras a dos sistemas sí? ¿Qué caída rompe la segunda?*

**Puente:** "Ese `suspendida:emp-1` ya es un contrato con facturación, pero improvisado. ¿Qué ponemos de verdad en el mensaje? ¿Nuestro evento interno tal cual?"

---

## 29 · El evento público  ·  ⏱ ~40 min  ·  [el-evento-publico.md](secciones/el-evento-publico.md)

**Para qué:** anunciar la suspensión con un contrato propio, `EmpresaSuspendidaV1` con el NIT, en un proyecto `Contratos` que no ve el dominio. Así un cambio interno no rompe a Facturación.

**Abre así (lo dices en voz alta):** "La bandeja ya guarda el anuncio en la misma transacción del hecho. ¿Qué metemos en ese mensaje? Lo obvio es el evento tal cual. Veamos qué le pasa a quien lo lee."

**Haz sentir el dolor:** en pantalla, con `Facturacion` referenciando `Empresas.Historia`, deserializa `EmpresaSuspendida` y usa `e.Motivo`: compila. Renombra `Motivo` a `Razon` en el evento interno y corre `dotnet build Facturacion`: deja de compilar. Di: "Rompimos a un consumidor que no controlamos, por un cambio que era asunto nuestro."

**Dicta los pasos:**
1. Dibuja el grafo en la pizarra: `Empresas.Historia → Contratos`, `Empresas.Historia → Facturacion` (composición raíz), `Facturacion → Contratos`, `Contratos → (nada)`.
2. Dicta `dotnet new classlib -o Contratos` (y `-o Facturacion` si no existe). **Primero** `dotnet remove Facturacion reference Empresas.Historia/Empresas.Historia.csproj`. Después, los tres `dotnet add … reference` del grafo.
3. **Paso 1:** 🆕 di "el evento público es un contrato versionado, en un proyecto que no ve tu dominio; si cambia de verdad, sale un `V2` al lado del `V1`". En `Contratos`: `public record EmpresaSuspendidaV1(string Nit, string Motivo);`. Lleva el NIT, nunca `emp-7`.
4. **Paso 2:** en `IEventStore`, declara `string NitDe(string streamId)`. En `PostgresEventStore`: `SELECT nit FROM localizador WHERE stream = @id`. En `InMemoryEventStore`: lee al revés el diccionario NIT→id. En el handler que suspende: `store.NitDe(cmd.EmpresaId)`, arma `new Contratos.EmpresaSuspendidaV1(nit, cmd.Motivo)` y deja su JSON en la bandeja.
5. **Paso 3:** muestra el ejemplo `Consumidor.Recibir(JsonSerializer.Serialize(new EmpresaSuspendidaV1("900123456", "Falta de pago")))` y pide que compile en `Facturacion/Consumidor.cs`, una clase `static Consumidor`. Después, `EntregarPendientes` recibe `Action<string> publicar`, y el `Program.cs` de `Empresas.Historia` lo cablea: `store.EntregarPendientes(mensaje => Consumidor.Recibir(mensaje))`.

**✅ Punto de control:** el consumidor devuelve `Facturación: suspender NIT 900123456 (Falta de pago)`. Con `Motivo` renombrado en el evento interno, `dotnet build Facturacion` y `dotnet build Empresas.Historia` quedan en verde. Si alguien no llega: solución en el `<details>` del Paso 3.

**🔨 Rómpelo (si hay tiempo):** usa `EmpresaSuspendida` desde `Facturacion` → `error CS0246`. Pega el `Reactivacion.cs` con `EmpresaReactivadaV1` → `CS0246`: un contrato prometido que nadie declaró (bórralo). Cambia a `Anuncio(string Tipo, object Datos)` y renombra `Motivo =` por `Razon =`: los dos builds en verde, y `KeyNotFoundException` al leer. Vuelve a `EmpresaSuspendidaV1`.

**Si se traban:**
- `error MSB4006` (dependencia circular) → quitar antes `Facturacion → Empresas.Historia`, con la ruta al `.csproj`.
- `CS1061` sobre `NitDe` → declararlo en la interfaz; si pasa a `CS0535`, implementarlo también en `InMemoryEventStore`.
- El test de §28 no compila → pasarle `m => MundoExterno.Recibidos.Add(m)` a `EntregarPendientes`.

**Cierra con:** "El interno es nuestra verdad; el público, una promesa. `Contratos` vuelve el límite un hecho de compilación, mientras cada anuncio sea un tipo declarado ahí." Commit con la reflexión: ¿por qué buscar el NIT del id es trabajo real, y qué se filtraría publicando `emp-7`?

**Puente:** "Ya sabemos qué anunciar. Cuando Facturación viva en otra máquina, el mensaje tendrá que viajar por una cola. ¿Qué trae una cola que un método no trae?"

---

## 30 · El mensaje y la cola  ·  ⏱ ~35 min  ·  [el-mensaje-y-la-cola.md](secciones/el-mensaje-y-la-cola.md)

**Para qué:** reclamar filas de la bandeja con `FOR UPDATE SKIP LOCKED`, para que dos consumidores no repitan mensajes. Y ver que el resto de garantías de una cola es un broker entero.

**Abre así (lo dices en voz alta):** "Facturación vive en otra máquina: no la podemos llamar como un método. Para no quedarnos cortos, ponemos dos relays a leer la bandeja. ¿Qué pasa?"

**Haz sentir el dolor:** en la pizarra, los dos hacen `SELECT ... WHERE NOT entregado` antes de que ninguno marque: `consumidor A → {1, 2, 3}`, `consumidor B → {1, 2, 3}`. Cada mensaje sale dos veces.

**Dicta los pasos:**
1. 🆕 Di: "una cola es un transporte con garantías. La primera, el claim, se la pedimos a Postgres: `FOR UPDATE SKIP LOCKED` bloquea las filas que tomas y salta las que otro tomó. El bloqueo dura lo que dura la transacción."
2. En `PostgresEventStore`, escriben `public long ReclamarYEntregar(Action<string> publicar)` (`public`, para llamarlo desde `Program.cs`): abre una transacción, `SELECT id, mensaje FROM bandeja_salida WHERE NOT entregado ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`, publica, `UPDATE ... SET entregado = true`, `Commit`. Devuelve el id, o `-1` si no hay nada.
3. Conserva `EntregarPendientes(publicar)` como un bucle que llama a `ReclamarYEntregar` hasta `-1` y cuenta las filas.
4. Deja 4 filas pendientes. En `psql`: `INSERT INTO bandeja_salida(mensaje) VALUES ('m1'), ('m2'), ('m3'), ('m4');`.
5. En `Program.cs`, en lugar de los pasos de §29 (deja la cadena y el `store`), arranca dos consumidores con `Task.Run`, cada uno en bucle de `store.ReclamarYEntregar(...)` hasta `-1`, que imprimen su nombre junto al mensaje (`Recibir("A", m)`).

**✅ Punto de control:** con 4 filas, entre A y B salen las 4 y ninguna dos veces (por ejemplo A `{2,4}` y B `{1,3}`). Si alguien no llega: solución en el `<details>` del reto.

**🔨 Rómpelo (si hay tiempo):** proyecta el test `El_claim_toma_la_mas_vieja` (colección `"postgres"`), que llama al `ReclamarYEntregar` público: verde. Quita `ORDER BY id`: rojo, con `Expected: ["m1"]` y `Actual: ["m2"]`. Muéstralo en `docker exec -it empresas-db psql -U postgres -d empresas_tests` con `SELECT ctid, mensaje`: tras el `UPDATE`, m1 pasa de `(0,1)` a `(0,4)`. Devuelve el `ORDER BY`. Repasa en voz alta lo que falta: ack (at-least-once), reintento con backoff, dead-letter, orden, sobrevivir reinicios.

**Si se traban:**
- Los dos toman la misma fila → falta `SKIP LOCKED`, o el `SELECT` no va dentro de la transacción.
- Un consumidor se queda esperando → usó `FOR UPDATE` sin `SKIP LOCKED`.
- El test de §28 no compila → conservar `EntregarPendientes(publicar)` como bucle.

**Cierra con:** "Igual que 'todo o nada' era una transacción, 'que el mensaje viaje sin perderse' es una cola durable, y no nos toca reimplementarla." Commit con la reflexión: ¿qué garantías da una cola que tu `SELECT` no da, qué caída rompe dos de ellas, y por qué "exactamente una vez" no es real?

**Puente:** "Llevamos a mano el diario, el proyector, el outbox y el arranque de una cola. Hay dos librerías que ya traen todo eso, sobre la misma Postgres."

---

## 31 · El swap por reconocimiento  ·  ⏱ ~80 min  ·  [el-swap-por-reconocimiento.md](secciones/el-swap-por-reconocimiento.md)

**Para qué:** cambiar el diario a mano por Marten, sobre la misma Postgres, y comprobar que hace lo nuestro: hechos, concurrencia, rehidratación, NIT único y nombres estables.

**Abre así (lo dices en voz alta):** "Construimos el diario a mano para entenderlo. Hoy lo cambiamos por una librería, por alivio, y vamos a comprobar pieza por pieza que hace lo mismo."

**Haz sentir el dolor:** proyecta la tabla "Lo que construiste a mano / Lo que ya es de la librería / Cuándo lo adoptas". Señala las dos filas de hoy que no se adoptan solas: `StartStream` no mira el NIT, y Marten nombra cada hecho por su clase.

**Dicta los pasos:**
1. **Paso 1:** 🆕 di "Marten es tu diario hecho librería: `StartStream`, `Append`, `AggregateStreamAsync`, con la concurrencia integrada. En Marten 9 todo es `await`, y eso no es consistencia eventual". Dicta `dotnet add Empresas.Historia package Marten` y muestra el `DocumentStore.For` con `opts.Connection(cadena)` y `StreamIdentity.AsString` (`using Marten;` y `using JasperFx.Events;`). El `store` viejo pasa a llamarse `viejo`.
2. **Paso 2:** en `Empresa`, un `Apply(TEvento)` por hecho, setters privados y una propiedad `Id` (string). Quita `: AggregateRoot` y comenta los verbos.
3. **Paso 3, la limpieza:** `DROP TABLE eventos;` en `psql`, y borra `GetEvents` y `Guardar`. Comenta lo que deja de compilar: `EventStream`, `AbrirStream`, los handlers de instancia, `CorrerProyector`, el `Despachador` y lo que usa `viejo` en `Program.cs`. Dales 5 minutos: aquí se traba la sala.
4. **Paso 3, escribir y rehidratar:** con `store.LightweightSession()` y un `SaveChangesAsync` por bloque. `StartStream<Empresa>("emp-7", new EmpresaRegistrada("900123", "Andes", "Basico"), new EmpresaSuspendida("mora"))`, luego `Append` de `EmpresaReactivada`, y `AggregateStreamAsync` que imprime `Suspendida`, `Reactivaciones` y `Plan`.
5. **Paso 3, el choque:** dos sesiones leen con `FetchStreamStateAsync` y appendean con `Version + 1`.
6. **Paso 4:** 🆕 di "Marten también guarda documentos; `Insert` lanza si el `Id` existe, `Store` sobrescribe sin avisar". En `Empresas.Historia`, la clase `Localizador { Id, Stream }` (`Id` guarda el NIT). En `Program.cs`, `void Sembrar(IDocumentSession session, string id, string nit, string nombre, string plan)` con `Insert` + `StartStream`, sin `SaveChangesAsync`. `DROP TABLE localizador;`. Prueban emp-17 y emp-18 con el NIT `901700000`, y después comentan los dos bloques.
7. **Paso 5:** 🆕 di "Marten guarda un alias por hecho". Clase `static Hechos` con `Registrar(StoreOptions opts)`: un `AddEventType<…>()` por cada uno de los cinco hechos, llamado desde el `DocumentStore.For`. En `Empresas.Tests/NombresDeLosHechos.cs` (con `using Marten;`), el test `Cada_hecho_conserva_su_alias`, sin base. Comenta los tests viejos que no compilan.

**✅ Punto de control:** la rehidratación imprime `Suspendida=False Reactivaciones=1 Plan=Basico`; el segundo escritor lanza `EventStreamUnexpectedMaxEventIdException`; emp-18 lanza `JasperFx.DocumentAlreadyExistsException` y `mt_streams` solo tiene `emp-17`; `dotnet test` en verde. Si alguien no llega: solución en el `<details>` de los Pasos 3, 4 y 5.

**🔨 Rómpelo (si hay tiempo):** comenta los bloques que nacen emp-7 y le agregan la reactivación, envuelve cada `SaveChangesAsync` en `try/catch` y quita el `+ 1`: fallan los dos escritores. Dos registros del mismo NIT a la vez, `Task.WhenAll(Intentar("emp-18"), Intentar("emp-19"))`: entra exactamente uno. Dale a emp-7 un `Append` directo de `PagoRegistrado(50_000)`, `EmpresaReactivada()` y `PlanCambiado("Premium")`, y renombra `PlanCambiado` a `PlanModificado` → `UnknownEventTypeException`; con `MapEventType<PlanModificado>("plan_cambiado")`, emp-7 vuelve a cargar con `Plan=Premium`.

**Si se traban:**
- `NotSupportedException: only asynchronous data access is supported` → quedó un `.ToList()` síncrono; todo va con `await ...Async()`.
- `ExistingStreamIdCollisionException` → ese stream ya existe: comentar cada bloque que nace un stream después de su primera corrida.
- El test lanza `KeyNotFoundException` → falta la línea de ese hecho en `Hechos.Registrar`.

**Cierra con:** "El swap no es rendirse, es reconocer: Marten hace lo nuestro, y nos quedamos con el criterio." Antes, en `DECISIONES.md`, marca reemplazada la línea de `GetType().Name` y anota `Hechos.Registrar` e `Insert`. Commit con la reflexión: empareja cada pieza tuya con la de Marten; ¿qué criterio conservas que no tendrías si hubieras empezado con Marten?

**Puente:** "Marten se llevó el diario, pero la bandeja de salida sigue siendo nuestra. Marten tiene un hermano con outbox: Wolverine."

---

## 32 · El outbox  ·  ⏱ ~70 min  ·  [el-outbox.md](secciones/el-outbox.md)

**Para qué:** que el hecho y su anuncio entren en la misma transacción, con entrega durable y reintento, adoptando Wolverine como despachador y como outbox.

**Abre así (lo dices en voz alta):** "Nuestra bandeja era un outbox correcto, pero sin reintento, sin dead-letter y sin sobrevivir reinicios. Hoy la cambiamos por uno terminado."

**Haz sentir el dolor:** sin código. Recuerda la lista de §30 (ack, backoff, dead-letter, reinicios) y pregunta cuánto tomaría escribir y probar cada pieza.

**Dicta los pasos:**
1. 🆕 Di: "Wolverine es tu despachador y tu outbox. `bus.InvokeAsync(cmd)` es tu `Enviar`. Encuentra el `Handle` por el tipo del parámetro, le pasa la `IDocumentSession`, y publicar es **devolver** el mensaje." Meta en pantalla: `await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));`.
2. `dotnet add Empresas.Historia package WolverineFx.Marten` y `dotnet add Empresas.Historia package WolverineFx.RuntimeCompilation`. Proyecta el host mínimo (se muestra): `AddMarten(...).UseLightweightSessions().IntegrateWithWolverine()`, y `AddWolverine` con `AutoApplyTransactions()`, `UseDurableLocalQueues()` e `IncludeAssembly(typeof(FacturacionHandler).Assembly)`.
3. `SuspenderHandler` `static`: `async Task<Contratos.EmpresaSuspendidaV1> Handle(SuspenderEmpresa cmd, IDocumentSession session)`. Rehidrata con `?? throw` (no con `!`), appendea el hecho y devuelve el público con `empresa.Nit`. Borra los handlers de instancia, el `Despachador` e `ICommandHandler<T>`.
4. Muda `MundoExterno` a `Facturacion` y crea `FacturacionHandler.Handle(EmpresaSuspendidaV1 msg)`, que agrega `suspendida NIT {msg.Nit}`.
5. Limpieza: `DROP TABLE bandeja_salida;` en `psql`. Borra `EntregarPendientes`, `ReclamarYEntregar` (con su test `ElMensajeYLaCola`, si lo escribieron en el 🔨 de §30), `viejo`, `EventStream`, `AbrirStream` y el bloque de §31, con su `DocumentStore.For`: desde aquí el store es el del host. `Sembrar` se queda; `CorrerProyector` sigue comentado.
6. **El anuncio, en un test:** en `Empresas.Tests/SuspenderHandlerTests.cs`, su propio `DocumentStore.For` contra `empresas_tests`, con `StreamIdentity.AsString` y `Hechos.Registrar`. Siembra con `StartStream` y `SaveChangesAsync` un `$"emp-test-{Guid.NewGuid()}"` con NIT `900555`, llama a `SuspenderHandler.Handle` con esa sesión y afirma NIT y motivo.
7. **El nombre del mensaje:** 🆕 di "el nombre del mensaje también es un contrato". `dotnet add Contratos package WolverineFx` y `[MessageIdentity("empresas.empresa-suspendida.v1")]`. Regla desde hoy: cada contrato nuevo lleva el suyo.

**✅ Punto de control:** tras el `InvokeAsync` y un `Task.Delay(500)`, sale `suspendida NIT 900123`. El test pasa, y cae si el `return` lleva `cmd.EmpresaId` (`Actual: "emp-test-…"`). `SELECT message_type, status FROM wolverine_incoming_envelopes;` muestra `empresas.empresa-suspendida.v1 | Handled`. Si alguien no llega: los `<details>` del reto, del test y del nombre.

**🔨 Rómpelo (si hay tiempo):** publica con `bus.PublishAsync` y lanza después: ni hecho ni anuncio. Pon un `await session.SaveChangesAsync()` a mano y lanza antes del `PublishAsync`: emp-7 gana un hecho y el anuncio no sale. La cura es quitar ese `SaveChangesAsync`. Sin `AutoApplyTransactions()`: llega el anuncio y no el hecho. Sin `IntegrateWithWolverine()`: `InvalidServiceLocationException`.

**Si se traban:**
- `... no IAssemblyGenerator (Roslyn) is registered` → falta el paquete `WolverineFx.RuntimeCompilation`.
- El mensaje no llega → no lo devolvió, o falta el `IncludeAssembly` (un `InvokeAsync` directo lanza `IndeterminateRoutesException`).
- El test dice `Falta la variable de entorno CADENA_POSTGRES.` → fijarla en la terminal de `dotnet test`.

**Cierra con:** "Publicar es devolver: el mensaje entra en la transacción del hecho, con un nombre fijo, y un `SaveChangesAsync` a mano dentro del handler rompe esa atomicidad." Antes, la línea en `DECISIONES.md`. Commit con la reflexión: ¿qué le faltaba a tu bandeja, y cómo reconoces tu `Despachador` en Wolverine?

**Puente:** "El outbox entrega al menos una vez. Si el proceso cae después de entregar y antes de marcar, Facturación recibe el mismo anuncio dos veces."

---

## 33 · Llegó dos veces  ·  ⏱ ~55 min  ·  [llego-dos-veces.md](secciones/llego-dos-veces.md)

**Para qué:** que Facturación no cobre doble cuando le llega el mismo mensaje, o el mismo acto en otro mensaje.

**Abre así (lo dices en voz alta):** "Desde hoy Facturación cobra una multa por cada suspensión. El outbox entrega al menos una vez. ¿Cuántas multas cobra por una suspensión?"

**Haz sentir el dolor:** explica la caída entre "hago el trabajo" y "marco hecho": `mismo mensaje entregado 2 veces → multas cobradas = 2`. Nombra las tres salidas: at-least-once, at-most-once y exactly-once. La industria elige la primera, y el duplicado lo aguanta el consumidor.

**Dicta los pasos:**
1. 🆕 Di: "idempotente es que repetirlo no cambie el resultado. Si el efecto sobrescribe, no hagas nada; si acumula, deduplica por una llave." 🆕 "El `Envelope` es el sobre del transporte; en una reentrega, su `Id` es el mismo."
2. `dotnet add Facturacion package Npgsql` y `dotnet add Facturacion package WolverineFx`. Clase `static Conexion` con `Cadena`, que lee `CADENA_POSTGRES` con el mismo `?? throw`.
3. En `psql`: `CREATE TABLE procesados(mensaje_id UUID PRIMARY KEY);`.
4. `FacturacionHandler.Handle(EmpresaSuspendidaV1 msg, Envelope envelope)`: `INSERT INTO procesados(mensaje_id) VALUES(@id) ON CONFLICT (mensaje_id) DO NOTHING`, y cobra solo si afectó 1 fila. Cobrar es `MundoExterno.Recibidos.Add($"multa NIT {nit}")`.
5. En `Program.cs`, comenta el `InvokeAsync` de §32 y simula la reentrega: `MundoExterno.Recibidos.Clear()`, un `new Envelope { Id = Guid.NewGuid() }`, dos llamadas al handler con ese mismo sobre y `new Contratos.EmpresaSuspendidaV1("900123", "mora")` (nombre completo), y la línea `multas: {MundoExterno.Recibidos.Count}`.
6. **El mismo pago, en otro sobre:** 🆕 di "`HashSet<T>` es un conjunto: `Add` agrega si no estaba, y `Contains` dice si está". `PagoRegistrado(int Monto, string? Referencia = null)`. En `Empresa`, un `HashSet<string>` privado que llena `Apply(PagoRegistrado)`, y un `YaRegistro(referencia)`.
7. Comando `RegistrarPago(EmpresaId, Referencia, Monto)` y su `RegistrarPagoHandler` `static`: rehidrata con la sesión, no hace nada si ya registró esa referencia, y si no, hace `Append` del `PagoRegistrado` con la referencia.

**✅ Punto de control:** sale `multas: 1` (sin el dedup, 2). Dos `InvokeAsync(new RegistrarPago("emp-7", "BANCO-0001", 50_000))` dejan un solo `pago_registrado` más: `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-7' AND type = 'pago_registrado';`. Si alguien no llega: solución en los dos `<details>`.

**🔨 Rómpelo (si hay tiempo):** quita la condición del cobro → dos multas. Publica dos veces el mismo anuncio con `bus.PublishAsync` → `multas: 2`, con el dedup puesto: son dos sobres (queda abierto hasta §39). Comenta la guarda de pagos y avisa dos veces con `BANCO-0002` → dos `pago_registrado`. Cobro externo que pierde la respuesta → `multas: 2`; la cura es preguntar `MundoExterno.YaCobro(envelope.Id)` antes de cobrar. Al terminar, deja todo como estaba.

**Si se traban:**
- `Envelope` o `NpgsqlConnection` no compilan en `Facturacion` → faltan los dos `dotnet add Facturacion package ...`.
- Sigue cobrando doble → cobrar solo con 1 fila afectada, y reusar el mismo `envelope.Id`.
- El segundo aviso del banco también registra → `Apply(PagoRegistrado)` no agrega la referencia, o el handler no pasa `cmd.Referencia`.

**Cierra con:** "Deduplica por la llave de lo que se repite: el sobre para la reentrega, la referencia del origen para el acto repetido, nunca un dato que solo se parece." Antes, la línea en `DECISIONES.md`. Commit con la reflexión: un efecto tuyo que sobrescribe y otro que acumula; para el segundo, ¿qué se repite y qué llave lo identifica?

**Puente:** "Ya no cobramos doble, pero cobramos lo mismo a todas. La multa debería depender del plan, que es de Empresas. ¿Va en el anuncio, o se pregunta?"

---

## 34 · El contrato lleva lo justo  ·  ⏱ ~75 min  ·  [el-contrato-lleva-lo-justo.md](secciones/el-contrato-lleva-lo-justo.md)

**Para qué:** que Facturación cobre con el plan correcto. El plan del momento viaja en el anuncio; el plan de hoy se le pregunta a Empresas cuando hace falta.

**Abre así (lo dices en voz alta):** "La multa vale 50.000, 100.000 o 200.000 según el plan, y el plan lo decide Empresas. Si lo metemos en el anuncio y Facturación lo guarda, ¿qué cobra el mes que viene?"

**Haz sentir el dolor:** proyecta la línea de tiempo: suspendes emp-8 (Básico) → paga y se reactiva → cambia a Premium → la mensualidad lee la copia: Básico. Di: "Lo vamos a provocar en el Paso 3."

**Dicta los pasos:**
1. **Antes:** tras `host.StartAsync()`, `var store = host.Services.GetRequiredService<IDocumentStore>();`. En una `store.LightweightSession()` con su `SaveChangesAsync`, `Sembrar(s, "emp-8", "900800800", "Cooperativa Llanos", "Basico")`. Suma `using Contratos;`. Corre una vez y borra la siembra; el `store` se queda.
2. **Paso 1:** `EmpresaSuspendidaV2(Nit, Motivo, Plan)` al lado del V1, con `[MessageIdentity("empresas.empresa-suspendida.v2")]`. En `psql`, la tabla `multas(nit, plan_al_suspender, monto)`.
3. `FacturacionHandler` pasa al V2, con su `Tarifa` (Basico 50.000, Premium 100.000, Enterprise 200.000). El dedup y el `INSERT` en `multas` van en una sola transacción. En `Program.cs`, la simulación de §33 se cambia por la llamada directa `FacturacionHandler.Handle(new EmpresaSuspendidaV2("900800800", "mora", "Basico"), new Envelope { Id = Guid.NewGuid() })`.
4. **Paso 2:** quita la llamada y vacía: `DELETE FROM multas; DELETE FROM procesados;`. `SuspenderHandler` devuelve `EmpresaSuspendidaV2?` con el plan, y `null` si ya estaba suspendida. Ajusta el test de §32: `Assert.NotNull` y plan `Basico`.
5. **Paso 3 (el reflejo, a propósito):** `CobrarMensualidad(Nit)` en `Facturacion` y su `MensualidadHandler`: lee `SELECT plan_al_suspender FROM multas` (🆕 `ExecuteScalar`: un solo valor) y deja `Mensualidad {nit}: {plan}` en `MundoExterno.Recibidos`. Cobra por el bus. Luego un `Append` directo a emp-8 de `PagoRegistrado(50_000)`, `EmpresaReactivada()` y `PlanCambiado("Premium")`, y cobra otra vez.
6. **Paso 4:** quita del `Program.cs` las suspensiones del Paso 2 y el `Append` del Paso 3. 🆕 di "con `InvokeAsync<TRespuesta>`, lo que el handler devuelve vuelve a quien preguntó y no se publica". `ConsultarPlanV1(Nit)` y `PlanActualV1(Nit, Plan)` en `Contratos`. `Localizador.StreamDe(IQuerySession, nit)` con `LoadAsync` y `?? throw`. `ConsultarPlanHandler` pide `IQuerySession`.
7. **Paso 5:** `ProcesoMensual.Correr(IMessageBus bus, string nit)` en `Facturacion`, el borde: pregunta y envía `CobrarMensualidad(nit, plan.Plan)`; el handler deja de leer `multas`. Que intenten antes `AggregateStreamAsync<Empresa>` ahí: no compila.
8. **Paso 6:** en `psql`, la tabla `mensualidades(nit, periodo)` con `PRIMARY KEY (nit, periodo)`. `Correr(bus, nit, periodo)` reserva con `INSERT … ON CONFLICT DO NOTHING` dentro de una transacción, y confirma después de enviar.
9. **Llevar, preguntar o replicar:** proyecta la tabla de tres filas: el dato como era viaja en el anuncio; el de hoy, de vez en cuando, se le pregunta al dueño; el de hoy, todo el tiempo, se replica. 🆕 Di qué es el claim-check: si el dato del momento es grande, el mensaje lleva un tiquete y el contenido se guarda aparte.

**✅ Punto de control:** en el Paso 2, dos suspensiones de emp-8 dejan una sola fila en `multas`: `900800800 | Basico | 50000`. En el Paso 3 sale `Mensualidad 900800800: Basico` (el dolor). En el Paso 5, `Mensualidad 900800800: Premium`, y `multas` sigue en `Basico`. En el Paso 6, dos `Correr(bus, "900800800", "2026-10")` dan una sola mensualidad. Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo (si hay tiempo):** comenta el handler de `ConsultarPlanV1` y cobra `"2026-11"` → `IndeterminateRoutesException`, y la reserva se deshace. Quita el `?? throw` de `StreamDe` y pregunta por `"000000000"`: responde un plan inventado. Un `Handle` del V1 con plan fijo `"Basico"` deja `900800800 | Basico | 50000` para una empresa Premium; bórralo.

**Si se traban:**
- `plan.Plan` lanza `NullReferenceException` → usar `InvokeAsync<PlanActualV1>`, y que el handler devuelva ese tipo.
- `KeyNotFoundException` en `Tarifa[msg.Plan]` → el plan viene escrito distinto (`"Básico"` con tilde).
- Al volver a correr, cobra de más → borrar la siembra y la llamada directa del Paso 1; desde el Paso 6, usar un mes nuevo.

**Cierra con:** "El dato como era viaja en el anuncio, con su fecha en el nombre. El de hoy se le pregunta al dueño desde el borde, o se replica. Nunca la copia huérfana ni la constante." Commit con la reflexión: un dato que lleves en el anuncio y otro que preguntes; ¿qué pasa si guardas el segundo como el primero?

**Puente:** "Preguntar ata cada cobro a que Empresas conteste. Una réplica suscrita quita esa atadura, pero también se puede quedar atrás sin un error."

---

## 35 · La réplica suscrita  ·  ⏱ ~55 min  ·  [la-replica-suscrita.md](secciones/la-replica-suscrita.md)

**Para qué:** que Facturación cobre con su propia copia de los planes, que esa copia se entere de cada cambio, y que nunca cobre con un plan que no tiene.

**Abre así (lo dices en voz alta):** "Si Empresas se cae, hoy el mes no se cobra. Con una copia propia, Facturación cobra igual. Pero esa copia puede fallar de cuatro formas, y ninguna lanza un error."

**Haz sentir el dolor:** enumera las cuatro en la pizarra: la tabla nace hoy y emp-8 cambió antes; una empresa que no se anunció no tiene fila (`null`); se anuncia el registro pero no los cambios; un anuncio viejo pisa al nuevo. Diles que las provocan en el 🔨.

**Dicta los pasos:**
1. **Antes:** quita las corridas del proceso mensual. Deja host, `store`, `bus` y `Sembrar`.
2. **Paso 1:** 🆕 di "con `public long Version { get; private set; }`, Marten llena la versión del stream al rehidratar". Dale esa `Version` a `Empresa`. En `Contratos`, `PlanDeEmpresaV1(Nit, Plan, long Version)` con `[MessageIdentity("empresas.plan-de-empresa.v1")]`.
3. Comando `RegistrarEmpresa(EmpresaId, Nit, Nombre, Plan)` y su `RegistrarEmpresaHandler`: hace lo de `Sembrar` y devuelve el anuncio con versión 1.
4. `CambiarPlanHandler`, para `CambiarPlanDeEmpresa`: `ReglaDeNegocioException` si está suspendida, `Append` con `empresa.Version + 1`, y devuelve el anuncio con esa versión. Test en una clase nueva, `PlanDeEmpresaTests`, armada como `SuspenderHandlerTests`, con id y NIT nuevos por `Guid`.
5. **Paso 2:** 🆕 `ON CONFLICT … DO UPDATE … WHERE plan_de_empresa.version < EXCLUDED.version`. En `psql`, la tabla `plan_de_empresa(nit PRIMARY KEY, plan, version BIGINT)`; no la llamen `planes`. En `Facturacion`, clase `Planes` con `Guardar(nit, plan, version)`, y `PlanesHandler`: la clase que recibe mensajes termina en `Handler`.
6. Prueba en `Program.cs`: por el bus, `RegistrarEmpresa("emp-25", "902500000", "Vidrios del Cauca", "Basico")` y `CambiarPlanDeEmpresa("emp-25", "Premium")`; un `Task.Delay(500)`; y el alta tarde, a mano: `PlanesHandler.Handle(new PlanDeEmpresaV1("902500000", "Basico", 1))`. Corre una vez y quita esas líneas.
7. **Paso 3:** `Planes.De(IMessageBus bus, string nit)`: con fila, devuelve el plan; sin fila, pregunta con `InvokeAsync<PlanActualV1>`, guarda y devuelve. `PlanActualV1` gana `long Version` (sigue siendo V1), y `ConsultarPlanHandler` le pasa `empresa.Version`. `ProcesoMensual.Correr` usa `Planes.De`.

**✅ Punto de control:** el test pasa, y cae si el cambio anuncia la versión leída. Tras registrar emp-25, cambiarla a Premium y reentregar el alta tarde: `902500000 | Premium | 2`. `ProcesoMensual.Correr(bus, "900800800", "2026-12")` da `Mensualidad 900800800: Premium` y deja la fila `900800800 | Premium | 5` (la versión de `mt_streams`). Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo (si hay tiempo):** siembra emp-26 con `Sembrar`, que no anuncia, y comenta `ConsultarPlanHandler`. emp-25 cobra Premium sin preguntar; emp-26 falla con `IndeterminateRoutesException`. Con `return plan!;` sale `Mensualidad 902600000: `, sin plan. Un `Append` directo de `PlanCambiado("Enterprise")` a emp-25 deja la réplica en `Premium | 2`. Sin el `WHERE`, el anuncio viejo de `"999"` pisa al nuevo.

**Si se traban:**
- `Version` siempre vale 0 → la propiedad debe llamarse `Version` y ser `long` (o `int`).
- `No routes can be determined … (Contratos.PlanDeEmpresaV1)` → la clase del handler debe terminar en `Handler`.
- `ProcesoMensual.Correr` no cobra nada → ese mes ya está reservado: usar un mes nuevo.

**Cierra con:** "El dueño anuncia cada cambio con una versión que solo crece. La réplica guarda solo lo más nuevo, y sin fila pregunta o falla." Antes, la línea en `DECISIONES.md`. Commit con la reflexión: ¿qué dato replicarías, qué anuncio lo mantiene, qué versión lo ordena y qué hace tu copia sin fila?

**Puente:** "Hasta aquí cada anuncio es de ida. Ahora suspender implica que Facturación cobre y que otro sistema corte los accesos, y Empresas necesita saber si los dos cumplieron."

---

## 36 · Dos respuestas, ningún dueño  ·  ⏱ ~90 min  ·  [dos-respuestas-ningun-dueno.md](secciones/dos-respuestas-ningun-dueno.md)

**Para qué:** saber en todo momento si Facturación y Accesos cumplieron, dar la suspensión por efectiva solo cuando cumplieron los dos, y verlo en CosmosLens.

**Abre así (lo dices en voz alta):** "Soporte pregunta: ¿emp-8 ya quedó suspendida de verdad, ya no puede entrar? `Suspendida = true` solo dice que Empresas lo pidió. Nadie le contesta a Empresas."

**Haz sentir el dolor:** presenta el contexto nuevo, Accesos, que escucha el mismo `EmpresaSuspendidaV2`. Si Accesos falla, la empresa sigue entrando y nadie se entera. Los dead letters viven en la base de otro equipo y hablan de mensajes, no de empresas.

**Dicta los pasos:**
1. **Paso 1:** `dotnet new classlib -o Accesos`, `dotnet add Accesos reference Contratos`, `dotnet add Empresas.Historia reference Accesos`. En `Accesos/AccesosHandler.cs`, `AccesosHandler.Handle(EmpresaSuspendidaV2 msg)` con `await Task.Delay(800)`.
2. Regístralo con `IncludeAssembly(typeof(AccesosHandler).Assembly)` y muestra `opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;`: cada contexto falla por su cuenta.
3. **Paso 2:** en `Contratos`, `MultaCobradaV1(Nit, DateOnly CobradaEl)` con `[MessageIdentity("facturacion.multa-cobrada.v1")]` y `AccesosRevocadosV1(Nit)` con `[MessageIdentity("accesos.accesos-revocados.v1")]`. Accesos devuelve la suya.
4. 🆕 `DateOnly` y `TryParseExact(texto, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha)`. En Facturación: `MundoExterno.FechaDelCobro = "17/10/2026"` y `LeerFecha(texto)`, que da `null` si no puede. Al empezar el `Handle`, `?? throw new FechaNoParseableException(texto)`, una clase con un constructor que recibe el texto. Devuelve `MultaCobradaV1` siempre, también en una reentrega. Proyecta `LeerFechaTests` y que lo agreguen a `Empresas.Tests`: con la cultura invariante, `"01/02/2026"` da el 1 de febrero, y `"ayer"` da `null`.
5. **Paso 3:** 🆕 di "el estado de cada integración (`SinSolicitar`, `EnCurso`, `Aplicado`) sale de hechos", y 🆕 `enum`. Hechos `CobroDeMultaConfirmado(DateOnly CobradaEl)`, `RevocacionDeAccesosConfirmada()` y `SuspensionEfectiva()`, con su línea en `Hechos.Registrar` y su `Assert` de alias.
6. En `Empresa`: `Facturacion`, `Accesos`, `Efectiva` y `MultaCobradaEl` (`DateOnly?`). `Apply(EmpresaSuspendida)` deja los dos socios `EnCurso` y la fecha en `null`; `Apply(EmpresaReactivada)` los devuelve a `SinSolicitar`; `Apply(CobroDeMultaConfirmado)` guarda la fecha. Muestra el bloque que imprime emp-8, con `{e.MultaCobradaEl:yyyy-MM-dd}`.
7. **Paso 4:** reactiva emp-8 con un `Append` de `PagoRegistrado(100_000)` y `EmpresaReactivada()`. 🆕 `[]` y `[a, b]`. En `Empresa`, `ConfirmarCobroDeMulta(DateOnly)` y `ConfirmarRevocacionDeAccesos()` devuelven `object[]`: `[]` si ese socio no estaba `EnCurso`, y suman `SuspensionEfectiva` si el otro ya está `Aplicado`.
8. `RespuestasHandler`, con un `Handle` por respuesta: `Localizador.StreamDe`, rehidrata y `Append`.
9. **Paso 5:** CosmosLens. Clonan **fuera** del repo del taller: `git clone --branch taller-es-v1 https://github.com/didierymartinez/cosmos-trace`, y comprueban que existe `cosmos-trace/src/CosmosTrace.Api/Procesos.cs`.
10. Proyecta la forma de `cosmos-trace/src/CosmosTrace.Api/procesos.json`, y que llenen sus cuatro huecos con los alias de `SELECT DISTINCT type FROM mt_events`.
11. API, con `CADENA_POSTGRES` fijada en esa terminal: `dotnet run --no-launch-profile -- --urls http://localhost:5301 --ConnectionStrings:Observed "$CADENA_POSTGRES" --Observed:Schema public` (en PowerShell, `"$env:CADENA_POSTGRES"`). Tablero, en otra terminal: `npm install` y `npm run dev` en `cosmos-trace/web` (pide Node LTS).

**✅ Punto de control:** Paso 2: el log muestra `No routes can be determined … (Contratos.MultaCobradaV1)` y `(Contratos.AccesosRevocadosV1)`. Paso 3: `emp-8: Facturacion=EnCurso Accesos=EnCurso Efectiva=False MultaCobradaEl=`. Paso 4: `emp-8: Facturacion=Aplicado Accesos=Aplicado Efectiva=True MultaCobradaEl=2026-10-17`, y otro `MultaCobradaV1` a mano no agrega hechos. Paso 5: la última suspensión de emp-8 sale `Completo` en **Procesos**. Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo (si hay tiempo):** Accesos lanza (emp-20): `Facturacion=Aplicado Accesos=EnCurso Efectiva=False`, `Vencido` en CosmosLens y el dead-letter en **Correlación**. Sin `Separated` (emp-21): Facturación también queda `EnCurso`, aunque `multas` tiene la fila. Lectura ingenua de la fecha con cultura invariante: `"01/02/2026"` da `2026-01-02`, y `"ayer"`, la fecha de hoy; con `LeerFecha`, sale `FechaNoParseableException` en dead letters. Con la lectura ingenua, `LeerFechaTests` cae. Al terminar: devuelven `Separated`, quitan el `throw` y la línea de la cultura, y dejan `FechaDelCobro` en `"17/10/2026"`.

**Si se traban:**
- `git clone` dice `Repository not found` → falta aceptar la invitación a `cosmos-trace`.
- El tablero dice `Value cannot be null. (Parameter 'Host')` → la terminal de la API no tiene `CADENA_POSTGRES`.
- Suspender emp-8 no hace nada → ya estaba suspendida: reactivarla con el `Append` del Paso 4.
- `Efectiva` nunca llega a `True` → cada `Confirmar…` debe mirar el estado del **otro** socio.

**Cierra con:** "Un acto que depende de otros termina cuando ellos contestan. Cada respuesta se anota como un hecho propio, y la empresa decide cuándo cumplieron todos. Lo que llega de afuera se lee una vez, en el borde." Commit con la reflexión: ¿qué acto tuyo depende de que otro conteste, con qué estados y qué regla? ¿Por qué `Suspendida = true` no bastaba?

**Puente:** "Aquí las respuestas llegaron una detrás de otra, y nada lo garantiza. Si llegan juntas, cada handler lee la empresa antes de que el otro guarde."

---

## 37 · Dos respuestas a la vez  ·  ⏱ ~50 min  ·  [dos-respuestas-a-la-vez.md](secciones/dos-respuestas-a-la-vez.md)

**Para qué:** que dos respuestas que llegan al mismo tiempo no se pisen, con la versión esperada y su reintento, y con el orden por llave.

**Abre así (lo dices en voz alta):** "Los dos socios van a contestar, y la suspensión no va a quedar efectiva, sin que salga un solo error. Vamos a abrir esa ventana a propósito."

**Haz sentir el dolor:** deshaz el 🔨 anterior y siembra `Sembrar(s, "emp-9", "900900900", "Ferretería Norte", "Basico")`. Quita la pausa de 800 ms de Accesos. En `RespuestasHandler`, pon `Task.Delay(300)` (multa) y `Task.Delay(600)` (accesos) entre leer y guardar, y una traza `leyó` del otro socio. Suspende emp-9: `emp-9: Facturacion=Aplicado Accesos=Aplicado Efectiva=False`. El diario termina en `revocacion_de_accesos_confirmada` y no hay dead letters nuevos.

**Dicta los pasos:**
1. **Antes:** proyecta la tabla de mecanismos: versión esperada, índice único, orden por llave, y el lock con tiempo de vida, que no protege. Hoy van el primero y el tercero.
2. **Paso 1:** borra la siembra y deja el bloque que reactiva emp-9 (`Append` de `PagoRegistrado(50_000)` y `EmpresaReactivada()`). Suma `v{empresa.Version}` a las trazas. Método común `Anotar(session, id, empresa, hechos)`: sin hechos no escribe; con hechos, `Append(id, empresa.Version + hechos.Length, hechos)`. Corre: el segundo choca con `EventStreamUnexpectedMaxEventIdException` y cae en dead letters.
3. **Paso 1 (la política, se muestra):** `opts.OnException<JasperFx.ConcurrencyException>().RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());`, con `using Wolverine.ErrorHandling;` y `using JasperFx.Core;`. Insiste: va sobre la clase base y con el nombre completo, porque el nombre corto es su propio `ConcurrencyException`.
4. **Paso 2:** 🆕 di "partir por llave: los mensajes de un mismo NIT pasan en fila". Quitan la versión esperada y la política, y agregan `MessagePartitioning.ByMessage<…>(m => m.Nit)`, los dos `PublishMessage<…>().ToLocalQueue("respuestas")` y `LocalQueue("respuestas").PartitionProcessingByGroupId(PartitionSlots.Three)`.
5. **Después:** vuelven a poner la versión esperada y la política, junto al orden por llave.

**✅ Punto de control:** Paso 1: un `fail:` en el log, `Accesos     leyó v12: Facturacion=Aplicado` (el reintento) y `Efectiva=True`, con el diario en `suspension_efectiva` y sin dead letters nuevos. Paso 2: la segunda respuesta ya lee con la primera anotada, sin choque. Las versiones cambian si corrieron más veces. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (si hay tiempo):** lock que vence (`Candado.Tomar(TimeSpan.FromMilliseconds(200))`, se muestra): las dos trazas leen la misma versión, y la versión esperada atrapa el choque igual. Sin `OnException`: la respuesta de Accesos cae en dead letters, y CosmosLens la pinta `Vencido`. Sin nada: vuelve el dolor, sin error. Al terminar, quitan pausas, trazas y lock, y dejan la versión esperada y la política.

**Si se traban:**
- Queda efectiva sin proteger nada → la ventana no se abrió: quitar los 800 ms de Accesos, y poner la pausa después de rehidratar y antes del `Append`.
- Chocan los dos `Append`, incluso el primero → pasaron la versión leída; es `empresa.Version + hechos.Length`.
- `OnException`, `.Milliseconds()` o `PartitionSlots` no compilan → faltan `using Wolverine.ErrorHandling;`, `using JasperFx.Core;` o `using Wolverine.Configuration;`.

**Cierra con:** "La versión esperada va siempre, como red. El orden por llave se suma cuando el choque es frecuente. Un lock que vence no protege." Commit con la reflexión: ¿qué stream tuyo recibe escrituras de dos lados, y qué lo protege hoy?

**Puente:** "Hasta aquí los socios siempre cumplen. ¿Y si Facturación rechaza la multa cuando Accesos ya cortó los accesos?"

---

## 38 · Deshacer en tres sistemas  ·  ⏱ ~90 min  ·  [deshacer-en-tres-sistemas.md](secciones/deshacer-en-tres-sistemas.md)

**Para qué:** echar atrás una suspensión que otros ya ejecutaron, con un hecho nuevo en cada sistema; no confundir una falla pasajera con un no; y ponerle plazo al socio que no contesta.

**Abre así (lo dices en voz alta):** "Facturación dice que no: la empresa tiene acuerdo de pago. Pero Accesos ya cortó. No hay una transacción entre los tres que revertir, y el hecho no se borra. ¿Cómo se deshace?"

**Haz sentir el dolor:** en voz alta: borrar no se puede, revertir tampoco, y la base de Accesos no es nuestra. Y un dolor más callado: un socio que nunca contesta deja `EnCurso` para siempre.

**Dicta los pasos:**
1. **Antes:** versión esperada y `OnException` puestas, Accesos sin pausa. Siembra una vez, con `Sembrar`, emp-11 (`901100000`, "Panadería Sur") y emp-35 (`903500000`, "Ferretería Norte"). Avisa: las versiones de las salidas suponen correr cada experimento una vez, en orden, con solo la suspensión del experimento en curso en el `Program.cs`.
2. **Paso 1:** `MultaRechazadaV1(Nit, Razon)` con `[MessageIdentity("facturacion.multa-rechazada.v1")]`. En Facturación, `ConAcuerdoDePago` (un `HashSet<string>` estático), y el `Handle` devuelve `object`: el rechazo si el NIT está, `MultaCobradaV1` si no.
3. En `Empresa`: `EstadoIntegracion` gana `Rechazado`. Hechos `CobroDeMultaRechazado(Razon)` y `SuspensionRevertida(Razon)` (deja `Suspendida = false` y `Revertida = true`), y el método `RechazarCobroDeMulta(razon)`. Su handler va en `RespuestasHandler`, con `Anotar`. Cada estado nuevo se limpia en `Apply(EmpresaSuspendida)`.
4. En `Program.cs`, antes de suspender emp-11: `FacturacionHandler.ConAcuerdoDePago.Add("901100000");`.
5. **Paso 2:** contador `Timeouts` en Facturación, que lanza `TimeoutException("la pasarela de pagos no contestó")`. Primero el 🔨 del `try/catch` que convierte la falla en un no: emp-35 se revierte por `la pasarela de pagos no contestó`.
6. Luego quitan el `catch` y agregan `opts.OnException<TimeoutException>().RetryWithCooldown(...)`. Si hay tiempo, aquí va el 🔨 «un no sin razón»; al terminarlo, Facturación vuelve a contestar `MultaCobradaV1` en los dos casos. Después quitan el contador y su línea. Regla: "ya estaba hecho" es un sí.
7. **Paso 3:** comando `RestituirAccesosV1(Nit)` y respuesta `AccesosRestituidosV1(Nit)`, con su `[MessageIdentity]`. Accesos atiende el comando y contesta. Estados `Restituyendo` y `Restituido`; hechos `RestitucionDeAccesosSolicitada()` y `RestitucionDeAccesosConfirmada()`.
8. `RechazarCobroDeMulta` suma la solicitud si Accesos ya está `Aplicado`, y el handler devuelve `RestituirAccesosV1` si `hechos.OfType<RestitucionDeAccesosSolicitada>().Any()`. `ConfirmarRestitucionDeAccesos()` y el handler de `AccesosRestituidosV1`. Pausa de 800 ms en el rechazo (`async Task<object>`).
9. Después, el huérfano: la pausa pasa a Accesos, y `ConfirmarRevocacionDeAccesos` pide la restitución si ya está `Revertida`.
10. **Paso 4:** 🆕 di "un mensaje programado: `.DelayedFor(TimeSpan)` lo guarda como `Scheduled` en la misma transacción del hecho". Quitan las líneas que meten los NIT en `ConAcuerdoDePago`, y Accesos calla devolviendo `null`. `RevisarSuspension(EmpresaId)`, con `[MessageIdentity("RevisarSuspension")]` porque espera en la base, y el hecho `SuspensionVencida(Faltan)`. En el test de alias, `Assert.Equal("RevisarSuspension", typeof(RevisarSuspension).ToMessageTypeName());` (`using Wolverine.Util;`).
11. `SuspenderHandler` devuelve la tupla `(EmpresaSuspendidaV2?, DeliveryMessage<RevisarSuspension>?)`; el test usa `var (anuncio, _) = ...`. `RevisarPlazo()`, `PlazoHandler`, que imprime `plazo vencido para …`, y `opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();`. Esperan 7 segundos. En `procesos.json`, `PlazoSegundos` pasa a 5.

**✅ Punto de control:** Paso 1: `emp-11: Suspendida=False Facturacion=Rechazado Accesos=Aplicado Revertida=True`. Paso 2, con `Timeouts = 1`: `emp-35: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True`. Paso 3: `emp-11: Facturacion=Rechazado Accesos=Restituido Revertida=True`, en los dos órdenes. Paso 4: `plazo vencido para emp-11: VENCIDA` y `Vencida=True`. Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo (si hay tiempo):** un no sin razón, en el Paso 2 (el timeout después de `tx.Commit()`, y la respuesta según el dedup): Empresas revierte una suspensión cobrada. Un comando con dos oyentes (`PortalNuevoHandler`, que lanza): `PreviewSubscriptions` muestra dos destinos y el estado dice `Restituido`. El plazo que pierde su nombre: sin el atributo, renombrar `RevisarSuspension` con un plazo pendiente da `No known handler for RevisarSuspension#…`, sin error; con `[MessageIdentity("RevisarSuspension")]` en la clase renombrada, vence. La compensación también falla: `Accesos=Restituyendo`, y el comando en dead letters.

**Si se traban:**
- Suspender no hace nada → la empresa ya estaba suspendida: reactivarla con el `Append` directo.
- Con `Timeouts = 1` cae directo en dead letters → falta `OnException<TimeoutException>()`.
- En el Paso 3 sale `Accesos=Aplicado` → la pausa va en el rechazo, el handler devuelve `RestituirAccesosV1`, y Accesos tiene el handler del comando.
- El plazo no llega → el segundo elemento de la tupla debe ser el `DelayedFor(...)`; esperar un poco más.

**Cierra con:** "Entre sistemas no se revierte: se compensa, y cada compensación es un comando a un destinatario. Un no lo da solo una regla del socio, lo pasajero se reintenta, y al silencio se le pone un plazo con nombre fijo." Antes, las dos reglas en `DECISIONES.md`. Commit con la reflexión: ¿qué acto ejecutado por otro sistema tendrías que poder deshacer, y qué lo compensa en cada lado?

**Puente:** "Miren la `Empresa`: estados de socios, restitución, plazo, reversión. Nada de eso es la empresa: es el proceso de suspenderla."

---

## 39 · El proceso tiene dueño  ·  ⏱ ~100 min  ·  [el-proceso-tiene-dueno.md](secciones/el-proceso-tiene-dueno.md)

**Para qué:** darle al proceso de suspender su propio stream y su propio id, y que ese id viaje en cada pedido y en cada respuesta. Así una respuesta tardía cae en la suspensión correcta.

**Abre así (lo dices en voz alta):** "Una respuesta tardía de la primera suspensión puede confirmar la segunda. Accesos nunca cortó nada para ella, y el sistema dice que sí. Las respuestas traen el NIT, y el NIT encuentra la empresa, no la suspensión."

**Haz sentir el dolor:** proyecta la escena de tres pasos y su salida: `emp-12: Suspendida=True Facturacion=Aplicado Accesos=Aplicado Efectiva=True`. La provocan al final del Paso 3, ya con la cura puesta.

**Dicta los pasos:**
1. **Antes:** quita la línea de `ConAcuerdoDePago` y arranca con solo `await Task.Delay(5000);`. Si §38 dejó un plazo esperando, vence ahora: `plazo vencido para emp-11: ya resuelta`. Siembra emp-12 (`901200000`, "Taller Oriente"). Antes de cada suspensión, el `Append` que la reactiva: `PagoRegistrado(50_000)` y `EmpresaReactivada()`.
2. **Paso 1:** 🆕 di "process manager: el proceso tiene su stream y su id; ese id viaja de ida y vuelta, y eso es la correlación". Clase `SuspensionDeEmpresa` (`Id`, `EmpresaId`, `Nit`, `Version`); muda a ella los estados de socios, `MultaCobradaEl`, `Efectiva`, `Revertida`, `Vencida`, sus `Apply` y los métodos que deciden. `RevisarPlazo` pierde el `!Suspendida`.
3. Hechos `SuspensionSolicitada(EmpresaId, Nit, Plan)` y `ProcesoRevertido(Razon)`, que `RechazarCobroDeMulta` emite en vez de `SuspensionRevertida`; los dos con su línea en `Hechos.Registrar`. La empresa se queda con `Suspendida` y `ProcesoAbierto`, y `EmpresaSuspendida` pasa a `(Motivo, SuspensionId)`. `ProcesoAbierto` vuelve a `null` con la reactivación y con `SuspensionRevertida`.
4. En `SuspenderHandler`, el id es `$"susp-{cmd.EmpresaId}-{empresa.Version + 1}"`, con `StartStream<SuspensionDeEmpresa>` en la misma sesión. El plazo pasa a `RevisarSuspension(SuspensionId)`, con `[MessageIdentity("RevisarSuspension")]`. Borran `RespuestasHandler` y `PlazoHandler`.
5. **Paso 2:** en `Contratos`, los pedidos `CobrarMultaV1(SuspensionId, Nit, Plan)`, `RevocarAccesosV1(SuspensionId, Nit)` y `RestituirAccesosV2`, y las respuestas V2 (`MultaCobradaV2`, `MultaRechazadaV2`, `AccesosRevocadosV2`, `AccesosRestituidosV2`) con `SuspensionId`, todas con `[MessageIdentity]`.
6. Facturación y Accesos dejan de escuchar `EmpresaSuspendidaV2` y atienden los pedidos; Accesos contesta sin pausa. `SuspenderHandler` devuelve `OutgoingMessages` (`Add(...)` y `Delay(mensaje, 5.Seconds())`). El test busca el anuncio con `OfType<EmpresaSuspendidaV2>().FirstOrDefault()`.
7. **El mismo pedido, en otro sobre:** `ALTER TABLE multas ADD COLUMN suspension_id TEXT UNIQUE;`, y el `INSERT` termina en `ON CONFLICT (suspension_id) DO NOTHING`. Quitan el dedup por `procesados` y el `Envelope`.
8. **Paso 3:** `ProcesoDeSuspensionHandler`, con un `Handle` por respuesta y otro por `RevisarSuspension`, todos por un `Decidir(session, suspensionId, Func<SuspensionDeEmpresa, object[]>)`. Si revierte, anota `SuspensionRevertida` en el stream de la empresa; si pidió restituir, devuelve `RestituirAccesosV2`. En `procesos.json`, `Inicia` pasa a `suspension_solicitada`.
9. Luego, la escena: Accesos en silencio (su handler devuelve `null`, con retorno `AccesosRevocadosV2?`), reactivar, suspender, y a mano `AccesosRevocadosV2("susp-emp-12-8", "901200000")`.
10. **Paso 4:** proyecta `SuspensionSaga` (se reconoce, no se construye), el ⚠️ de `IRevisioned` y la tabla de coreografía y orquestación.

**✅ Punto de control:** Paso 1: `mt_streams` muestra `emp-12 | empresa` y `susp-emp-12-2 | suspension_de_empresa`. Paso 2: `susp-emp-12-5: suspension_solicitada`, con los `No routes can be determined` esperados. Dedup: `SELECT count(*) FROM multas WHERE suspension_id = 'susp-emp-12-5';` da 1. Paso 3: `susp-emp-12-8` con `Efectiva=True` y, tras la reentrega, `susp-emp-12-11: Accesos=EnCurso Efectiva=False`. Los ids suponen correr cada experimento una vez, en orden. Si alguien no llega: solución en el `<details>` de cada paso.

**🔨 Rómpelo (si hay tiempo; «el dueño que muere» no lo saltes: §49, §64 y §65 parten de `ProcesoCerrado` y de la regla `ProcesoAbierto is not null`):** cien `PublishAsync` con `Task.WhenAll`: salen los 100, pero el `MessageContext` no se comparte entre tareas; varios mensajes salen por `OutgoingMessages`. Sin correlación (buscar por `ProcesoAbierto`): `susp-emp-12-11` queda `Efectiva=True` en falso. El dueño que muere (emp-36, `903600000`, "Imprenta Central"): el acto largo con `throw` deja `susp-emp-36-2` sin plazo; con su handler y `Environment.Exit(1)`, el cobro y el plazo sobreviven. Reto: el hecho `ProcesoCerrado(SuspensionId)`, que `Decidir` anota en la empresa si los hechos traen `SuspensionVencida`, y `SuspenderHandler` mira `ProcesoAbierto is not null` → `emp-36: Suspendida=True ProcesoAbierto=`.

**Si se traban:**
- Las respuestas no llegan y no hay dead letters → la clase debe terminar en `Handler`.
- `EventStreamUnexpectedMaxEventIdException … expected -1 but was -1` al suspender → se repitió el id del proceso: usar `empresa.Version + 1`.
- Una suspensión cobra dos multas → quedó el handler de Facturación para `EmpresaSuspendidaV2`: borrarlo.
- `column "suspension_id" of relation "multas" does not exist` → falta el `ALTER TABLE`.

**Cierra con:** "Un proceso que espera varias respuestas es alguien: tiene stream e id, y ese id viaja de ida y vuelta y es la llave de lo que pide." Antes, la línea en `DECISIONES.md`, con su número de meses. Commit con la reflexión: ¿qué proceso tuyo espera respuestas de varios lados, quién es su dueño y qué correlación viaja en sus mensajes?

**Puente:** "Los datos de una suspensión quedaron en dos streams. Y nuestras vistas siguen apagadas desde el swap: en Marten las corre el daemon."

---

## 40 · El daemon y la consistencia eventual  ·  ⏱ ~60 min  ·  [el-daemon-y-la-consistencia-eventual.md](secciones/el-daemon-y-la-consistencia-eventual.md)

**Para qué:** mover la vista de suspendidas al daemon de Marten, como proyección `Async` con su propio read model; medir el rezago; y fijar la vista en un test con el daemon vivo.

**Abre así (lo dices en voz alta):** "Nuestro proyector en bucle ya existe en Marten: es el daemon. Pero nuestra `Empresa`, con setters privados, no le sirve como vista. ¿Por qué?"

**Haz sentir el dolor:** explica que el daemon guarda la vista como un documento y la relee, y que un deserializador no toca setters privados. Lo ven en el 🔨 "la vista en blanco".

**Dicta los pasos:**
1. **Antes:** deshaz la escena de §39 (Accesos devuelve `AccesosRevocadosV2`; `ProcesoDeSuspensionHandler` busca por `SuspensionId`) y siembra `Sembrar(s, "emp-14", "901400000", "Papelería Occidente", "Basico")`.
2. 🆕 Di cuatro cosas: la proyección tiene `Apply(evento, vista)`; `Async` frente a `Inline` es elegir la consistencia eventual; el rezago es el high-water (`FetchEventStoreStatistics().EventSequenceNumber`) menos el `.Sequence` del shard `VistaSuspendida:All`; y `await host.WaitForNonStaleProjectionDataAsync(TimeSpan.FromSeconds(5))` (`using Marten.Events;`) espera a que todas las proyecciones lleguen al high-water de ese momento, o lanza `TimeoutException`.
3. Read model `VistaSuspendida { Id, Suspendida, Plan }` con setters públicos, y `public partial class SuspendidasProjection : SingleStreamProjection<VistaSuspendida, string>` con `Apply` de `EmpresaRegistrada`, `PlanCambiado`, `EmpresaSuspendida`, `EmpresaReactivada` y `SuspensionRevertida`. El `partial` es obligatorio.
4. En el `AddMarten` del host: `opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async)` y `.AddAsyncDaemon(DaemonMode.Solo)`, sin quitar Wolverine. Suspende emp-14 por el bus, mide el rezago al instante y tras esperar, y consulta con `Query<VistaSuspendida>()`.
5. Retira lo viejo: `Suspendidas`, `CorrerProyector`, y las tablas `empresas_estado` y `checkpoint`.
6. **El test:** 🆕 un fixture que arranca un host, `ResetAllMartenDataAsync` y una colección aparte. En `Empresas.Tests/HostConDaemon.cs`, `HostConDaemon : IAsyncLifetime` contra `empresas_tests`, con las propiedades `Host`, `Store` y `Bus`. El builder va con el nombre completo, `Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder()`, porque `Host` a secas es la propiedad. Lleva lo de tu `AddMarten`, más `AutoApplyTransactions()` e `IncludeAssembly(typeof(SuspenderHandler).Assembly)`.
7. Colección: `[CollectionDefinition("daemon", DisableParallelization = true)] public class ColeccionDaemon : ICollectionFixture<HostConDaemon> { }`. Proyecta los dos tests de `VistaSuspendidaTests`, con `[Collection("daemon")]`.

**✅ Punto de control:** el rezago sale mayor que 0 al instante y 0 cuando el daemon alcanza; emp-14 aparece en `VistaSuspendida`. `dotnet test` varias veces seguidas: todo en verde. Si alguien no llega: solución en los dos `<details>`.

**🔨 Rómpelo (si hay tiempo):** read-your-write con `WaitForNonStaleProjectionDataAsync`: `al instante: rezago 2 emp-14 Suspendida=False` y `tras esperar: rezago 0, 2 o 3 emp-14 Suspendida=True`; esa espera nunca decide una escritura. Vista en blanco con `opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Async)`; al terminar, `DELETE FROM mt_event_progression WHERE name = 'Empresa:All';`. `ResetAllData()` en el test → `TimeoutException … haven't been completely started`, y `ProgressionProgressOutOfOrderException` en el log detallado. Sin la espera → `Assert.True() Failure`.

**Si se traban:**
- `SingleStreamProjection` no compila → `using Marten.Events.Aggregation;`, y la clase `partial`.
- La vista no se llena, o la espera da `TimeoutException` → registrar `Async`, poner `AddAsyncDaemon(DaemonMode.Solo)` también en el fixture, y el host vivo.
- `CS0738 … ValueTask` → el proyecto usa xUnit v3: `InitializeAsync` y `DisposeAsync` devuelven `ValueTask`.
- `… did not have matching fixture data: HostConDaemon daemon` → falta `[Collection("daemon")]`.

**Cierra con:** "El proyector es el daemon, y el checkpoint es `mt_event_progression`. La consistencia eventual se elige, se mide, y se espera solo donde vale." Antes, en `DECISIONES.md`, marca reemplazadas las líneas del proyector y del rezago. Commit con la reflexión: empareja `FrenteDelDiario() − LeerCursor()` con Marten; ¿por qué `Async` y no `Inline` para esta vista?

**Puente:** "`VistaSuspendida` va atrás, y para soporte está bien. Pero quien le contesta el plan a Facturación necesita una vista que no vaya atrás."

---

## 41 · La vista en la misma transacción  ·  ⏱ ~45 min  ·  [la-vista-en-la-misma-transaccion.md](secciones/la-vista-en-la-misma-transaccion.md)

**Para qué:** que la pregunta por el plan la conteste una vista `Inline`, escrita en la misma transacción del hecho, y que cada registro diga en el código por qué es `Inline` o `Async`.

**Abre así (lo dices en voz alta):** "`ConsultarPlanHandler` rejuega la historia entera de la empresa para contestar un plan. ¿Y si contesta desde `VistaSuspendida`, que ya tiene el plan? Probemos justo después de un cambio."

**Haz sentir el dolor:** muestra `SELECT count(*) FROM mt_events WHERE stream_id = 'emp-14';`: decenas de hechos para un plan. Luego registra `RegistrarEmpresa("emp-61", "906100000", "Ferretería Llano", "Basico")`, espera la vista, cambia a Premium y lee al instante: `VistaSuspendida dice: Basico`. Quita el registro y la espera tras la primera corrida.

**Dicta los pasos:**
1. 🆕 Di: "una proyección `Inline` la escribe Marten dentro de tu `SaveChangesAsync`: no va atrás, no usa el daemon y no deja fila en `mt_event_progression`". 🆕 "Un `Append` directo no le pasa la versión; la línea `Metadata` copia `mt_version` a tu `Version`."
2. **Paso 1:** read model `EmpresaDetalle { Id, Plan, long Version }`, y `EmpresaDetalleProjection` `partial` con `Apply` de `EmpresaRegistrada` y de `PlanCambiado`.
3. En el `AddMarten`: `opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);` y `opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));`.
4. `ConsultarPlanHandler` carga `EmpresaDetalle` con `LoadAsync` y `Localizador.StreamDe`, y contesta con su plan y su versión.
5. En `Program.cs`, en lugar del cambio y la lectura del dolor: `CambiarPlanDeEmpresa("emp-61", "Enterprise")` por el bus, `InvokeAsync<PlanActualV1>(new ConsultarPlanV1("906100000"))`, e imprime `Plan de 906100000: {plan.Plan} (versión {plan.Version})`.
6. **El ciclo de vida, escrito:** al lado de cada registro, un comentario con el porqué y lo que se rompe si alguien lo cambia (`Async`: solo la mira soporte; `Inline`: Facturación cobra con su respuesta).

**✅ Punto de control:** `Plan de 906100000: Enterprise (versión 3)` al instante (su versión sale de `SELECT version FROM mt_streams WHERE id = 'emp-61';`), y `SELECT name FROM mt_event_progression;` no tiene fila de `EmpresaDetalle`. Sin la línea `Metadata` y con un `Append` directo, sale `(versión 0)`. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (no lo saltes: §42 usa el `Nit` de `EmpresaDetalle` y emp-64, y §56 corre `ReservaDelNitTests`):** la vista no es un candado. Suman `Nit` a `EmpresaDetalle`, ponen las dos líneas en el `AddMarten` del fixture, y proyectas `ReservaDelNitTests`. `dotnet test --filter ReservaDelNitTests` → `Assert.Single() Failure: The collection contained 2 matching items`. Con `UniqueIndex(d => d.Nit)` en el fixture: verde; con la vista `Async`: rojo. Al final quitan el índice, y `Registrar` usa `RegistrarEmpresaHandler.Handle(...)`. Rómpelo 2: comentan `AddAsyncDaemon` y registran emp-64 → `EmpresaDetalle: Basico   VistaSuspendida: (no existe)`, y solo un `Warning: The async daemon is disabled`. Devuelven el daemon y quitan el registro de emp-64.

**Si se traban:**
- `AnyAsync` no existe → falta `using Marten;` en el test.
- El test con el índice sigue en rojo → la línea va en el `AddMarten` del fixture, y la vista debe ser `Inline`.
- No compila al devolver el daemon → quedó un `;` al final de `.IntegrateWithWolverine()`.

**Cierra con:** "`Inline` si alguien la lee justo después de escribir; `Async` si es para mostrar. Ninguna decide una escritura, y el candado es un índice del store." Antes, la línea en `DECISIONES.md`. Commit con la reflexión: ¿qué vista tuya se lee justo después de escribir y cuál solo se muestra? ¿Qué pasa si alguien les cambia el ciclo de vida?

**Puente:** "emp-61 no tiene NIT en `EmpresaDetalle`, y una empresa de antes, `901100000`, ni siquiera tiene documento. Hay que rearmar las vistas desde el diario."

---

## 42 · Reconstruir con el daemon  ·  ⏱ ~45 min  ·  [reconstruir-con-el-daemon.md](secciones/reconstruir-con-el-daemon.md)

**Para qué:** rearmar cualquier vista desde el diario con una orden de la librería, pausando el daemon del servicio, y ensayar esa orden en un test.

**Abre así (lo dices en voz alta):** "Le agregamos un campo a una vista. ¿Lo tienen las filas viejas? Y si borramos la vista, ¿se rearma sola?"

**Haz sentir el dolor:** con el programa detenido, `DELETE FROM mt_doc_empresadetalle;`, y luego `ConsultarPlanV1("906100000")` → `No existe la empresa`. Quita esa pregunta. Después suman `Motivo` y `Suspensiones` a `VistaSuspendida` (el `Apply` de `EmpresaSuspendida` guarda el motivo y suma `Suspensiones++`), suspenden emp-64 con `"cheque devuelto"` y listan: `emp-14: motivo=` y `emp-64: motivo=cheque devuelto`. El daemon sigue desde su cursor. Quita la suspensión; deja la espera y el listado.

**Dicta los pasos:**
1. 🆕 Di: "`BuildProjectionDaemonAsync()` arma un daemon aparte. Su `RebuildProjectionAsync("VistaSuspendida", CancellationToken.None)` borra documentos y progreso, y rejuega el diario. El nombre es el del read model." 🆕 "`IProjectionCoordinator` pausa y reanuda el daemon del servicio."
2. **Paso 1:** clase `static Vistas` con `Rearmar(IHost host, string vista)`: saca `IDocumentStore` e `IProjectionCoordinator` de `host.Services`, llama `PauseAsync()`, hace `using var daemon = await store.BuildProjectionDaemonAsync();`, rearma, y llama `ResumeAsync()` en un `finally`.
3. En `Program.cs`, antes del listado: un `Stopwatch`, `Vistas.Rearmar(host, "EmpresaDetalle")`, `Vistas.Rearmar(host, "VistaSuspendida")`, y la pregunta del plan de `901100000`.
4. Después quitan las dos llamadas y la medición: rearmar se corre cuando hace falta, no en cada arranque.
5. **Paso 2:** proyecta `RearmarTests` (colección `"daemon"`) y que lo agreguen a `Empresas.Tests`.

**✅ Punto de control:** `Rearmadas en 640 ms` (el número es el de cada uno), `Plan de 901100000: Basico` y `emp-14: motivo=mora`. emp-61 ya tiene NIT: `SELECT data->>'Nit' FROM mt_doc_empresadetalle WHERE id = 'emp-61';`. `dotnet test` en verde; sin el `Rearmar`, cae en el `Assert.Equal` del motivo; sin el `ResumeAsync`, cae con `TimeoutException`. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (si hay tiempo; «el reloj en la vista» no lo saltes: §43 parte de `IEvent<T>` y §47 de `SuspendidaDesde`):** el borrado a medias: imprimen `suspensiones=` en el listado, y luego borran solo el progreso (`DELETE FROM mt_event_progression WHERE name = 'VistaSuspendida:All';`). Las cuentas salen al doble, y rearmar las devuelve. El reloj en la vista: con `DateTimeOffset.UtcNow`, todas salen con la hora del rearmado. 🆕 Con `Apply(IEvent<EmpresaSuspendida> e, …)` y `e.Timestamp`, cada una conserva la suya.

**Si se traban:**
- `No registered projection matches the name …` → usar el nombre del read model, no el de la proyección.
- `No service for type 'JasperFx.Events.Daemon.IProjectionCoordinator'` → falta `AddAsyncDaemon` en el host o en el fixture.
- `ProgressionProgressOutOfOrderException` → rearmaron sin pausar, o hay otra copia del programa corriendo.

**Cierra con:** "Rearmar es una orden, no un DELETE: pausa, rejuega y reanuda. Y solo funciona si la proyección depende solo de sus hechos, sin reloj ni llamadas afuera." Antes, el procedimiento en `DECISIONES.md`, con sus milisegundos. Commit con la reflexión: ¿qué vista tuya suma en vez de asignar, qué le pasaría si se rejugara encima, y qué ve un usuario mientras la rearmas?

**Puente:** "Las dos vistas se alimentan del stream de una empresa. Un tablero de suspensiones con el nombre de cada empresa junta dos tipos de stream, y una proyección por stream no alcanza."

---

## 43 · El tablero cruza streams  ·  ⏱ ~60 min  ·  [el-tablero-cruza-streams.md](secciones/el-tablero-cruza-streams.md)

**Para qué:** un tablero con una fila por empresa (nombre, plan de hoy, en qué va su suspensión) que el daemon mantiene solo, aunque los datos vivan en dos streams.

**Abre así (lo dices en voz alta):** "Soporte ya no pregunta por una empresa: quiere verlas todas en una pantalla. El nombre y el plan están en el stream de la empresa; el estado de la suspensión, en el stream del proceso. ¿Cómo juntamos dos streams en una fila?"

**Haz sentir el dolor:** proyecta el intento natural, sin que lo escriban: sumarle `Estado` a `VistaSuspendida` y un `Apply(SuspensionSolicitada …)`. La consulta `SELECT id, data->>'Suspendida', data->>'Estado' FROM mt_doc_vistasuspendida WHERE id LIKE '%emp-13%';` da `emp-13 | true |` y `susp-emp-13-2 | false | esperando`. Explica: una `SingleStreamProjection` arma un documento por stream, y el estado cayó en el documento del proceso. Juntarlo al consultar obliga a cruzar dos vistas enteras cada vez; copiar el plan en el proceso es la copia que envejece (§34).

**Dicta los pasos:**
1. En `Program.cs`, quita los pasos de §42 y deja el host, `store` y `bus`. Tras `await host.StartAsync()`, siembra `Sembrar(s, "emp-13", "901300000", "Librería Centro", "Basico")`.
2. 🆕 Di qué es: una `MultiStreamProjection<TDoc, TId>` arma un documento con hechos de cualquier stream; su regla de identidad dice a qué documento va cada hecho.
3. En `Empresas.Historia`, read model `Tablero` con setters públicos: `Id`, `Nombre`, `Plan`, `Suspension`, `Facturacion` y `Accesos` (empiezan en `"-"`), `Estado` (empieza en `"activa"`).
4. `public partial class TableroProjection : MultiStreamProjection<Tablero, string>`. En el constructor, `Identity<IEvent>(…)`: si el `StreamKey` empieza con `susp-`, la empresa es lo que va entre `susp-` y el último guion (`texto[desde..hasta]` y `LastIndexOf('-')`); si no, el `StreamKey`.
5. Un `Apply` por hecho. De la empresa: `EmpresaRegistrada`, `PlanCambiado`, `EmpresaReactivada`. Del proceso: `SuspensionSolicitada`; las cinco respuestas (`CobroDeMultaConfirmado`, `CobroDeMultaRechazado`, `RevocacionDeAccesosConfirmada`, `RestitucionDeAccesosSolicitada`, `RestitucionDeAccesosConfirmada`); y los tres del cierre (`SuspensionEfectiva`, `ProcesoRevertido`, `SuspensionVencida`).
6. Los del proceso reciben `IEvent<T>`. El de `SuspensionSolicitada` guarda su `StreamKey` en `Suspension`. Los demás no hacen nada si su `StreamKey` no es `t.Suspension`: esa es la guarda (la correlación de §39, en el lado de lectura).
7. Regístrala `ProjectionLifecycle.Async` junto a las otras dos, con su porqué al lado. Corre el bloque del Paso 1: suspender emp-13, `Task.Delay(3000)` y consultar `Tablero`.
8. Paso 2: quita la siembra y la suspensión. Agrega a emp-13 `PagoRegistrado(50_000)`, `EmpresaReactivada()` y `PlanCambiado("Premium")`, y suspéndela otra vez. Consulta el tablero y, en `psql`, el plan de cada `suspension_solicitada`.
9. Muestra la consulta que cruza `mt_doc_vistasuspendida` con `mt_doc_tablero` y pide la línea en `DECISIONES.md`: `VistaSuspendida` se queda, porque responde «¿está suspendida?» también para las empresas de antes del proceso.

**✅ Punto de control:** `emp-13: Librería Centro plan=Basico suspension=susp-emp-13-2 fact=Aplicado acc=Aplicado estado=efectiva`, y aparece el shard `Tablero:All` en `mt_event_progression`. Tras el Paso 2: `plan=Premium suspension=susp-emp-13-6`, y en `psql` `susp-emp-13-2 | Basico` y `susp-emp-13-6 | Premium`. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (si hay tiempo):** (a) Regla `Identity<IEvent>(e => e.StreamKey!)` y `await Vistas.Rearmar(host, "Tablero");`: salen filas huérfanas `susp-emp-13-2` y `susp-emp-13-6`, y emp-13 dice `estado=activa`. (b) Accesos en silencio (su handler de `RevocarAccesosV1` devuelve `null`) y el bloque de las dos suspensiones con el `AccesosRevocadosV2("susp-emp-13-9", …)` tardío: con la guarda sale `acc=EnCurso estado=vencida`; sin ella, `acc=Aplicado`, que es falso. Al final, devuelve la regla, la guarda y la respuesta de Accesos, y quita `Rearmar`.

**Si se traban:**
- `MultiStreamProjection` o `IEvent` no compilan → `using Marten.Events.Projections;` y `using JasperFx.Events;`.
- `Suspension` vacío y la fila se queda en `esperando` → el `Apply` de `SuspensionSolicitada` debe recibir `IEvent<SuspensionSolicitada>` y guardar su `StreamKey`.
- El tablero no cambia tras cambiar la regla o la guarda → el daemon no rejuega lo ya proyectado: `await Vistas.Rearmar(host, "Tablero");`.

**Cierra con:** la regla de identidad es el diseño de la vista y tiene que ser barata (la llave viaja en el id); la guarda decide si el hecho es de la suspensión vigente; el plan de hoy sale de su dueño. Commit con la reflexión: "¿qué pantalla de tu sistema junta dos agregados, y cuál sería su regla de identidad?"

**Puente:** "Los comandos todavía entran por una línea de `Program.cs`. Un servicio de verdad los recibe por HTTP: ese host web lo montamos ahora, y ahí `VistaSuspendida` gana quien la lea."

---

## 44 · El host y la inyección  ·  ⏱ ~60 min  ·  [el-host-y-la-inyeccion.md](secciones/el-host-y-la-inyeccion.md)

**Para qué:** convertir `Empresas.Historia` en una API web que recibe comandos por HTTP y entrega las piezas por inyección de dependencias, con una sesión fresca por operación.

**Abre así (lo dices en voz alta):** "Operaciones no ejecuta nuestro `Program.cs`: manda un `POST`. ¿Quién recibe esa petición y arma por dentro endpoint → bus → handler → sesión?"

**Haz sentir el dolor:** proyecta las dos líneas de script que usamos hasta hoy: `host.Services.GetRequiredService<IMessageBus>()` y `bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"))`. Sirven para probar, no para un servicio. Recuerda que el cableado de handlers ya lo pagó Wolverine en §32: falta cómo entra el comando.

**Dicta los pasos:**
1. 🆕 Di qué es: `WebApplication.CreateBuilder(args)` arma un host web; `app.MapPost("/ruta/{id}", …)` publica un endpoint; `{id}` se enlaza a `string id` y los demás parámetros los da el contenedor; `app.Run()` deja vivo el servidor, con el daemon y Wolverine dentro.
2. En `Empresas.Historia.csproj`, cambia `Sdk="Microsoft.NET.Sdk"` por `Sdk="Microsoft.NET.Sdk.Web"`. Es el mismo proyecto.
3. En `Program.cs`, usa `WebApplication.CreateBuilder(args)` y pásale `AddMarten` y `AddWolverine` sin perder nada. Proyecta la lista: `Hechos.Registrar`, las tres proyecciones con su porqué, la `Metadata` de `EmpresaDetalle`, los dos `IncludeAssembly`, `MultipleHandlerBehavior.Separated`, las dos `OnException` y `ScheduledJobPollingTime`. Conserva `CADENA_POSTGRES` y `Sembrar`; saca los pasos de §43.
4. `app.MapPost("/empresas/{id}/suspender", …)` con `IMessageBus bus`, que haga `bus.InvokeAsync(new SuspenderEmpresa(id, "mora"))` y `Results.Ok()`. El `SuspenderHandler` no se toca.
5. Entre `builder.Build()` y `app.Run()`, siembra `Sembrar(s, "emp-10", "901000000", "Transportes Sabana", "Premium")` con `app.Services.GetRequiredService<IDocumentStore>()`. Bórrala tras el primer arranque.
6. Llama `curl -X POST http://localhost:5000/empresas/emp-10/suspender` y revisa `mt_events`.
7. 🆕 Di qué es: una `IDocumentSession` es una unidad de trabajo; va una por petición y una por mensaje, nunca compartida. Pide `app.MapGet("/empresas/suspendidas", …)` con una `IQuerySession` que devuelva los `Id` de `VistaSuspendida` con `Suspendida`.

**✅ Punto de control:** `SELECT stream_id, version, type FROM mt_events WHERE stream_id = 'emp-10' ORDER BY version;` da `emp-10 | 1 | empresa_registrada` y `emp-10 | 2 | empresa_suspendida`. `curl http://localhost:5000/empresas/suspendidas` → `["emp-10", …]` (si no sale, repetir en un segundo: la vista es `Async`). Si alguien no llega: solución en el `<details>` de cada reto.

**🔨 Rómpelo (no lo saltes: §45 parte del entorno del host y de `PermitirReset`):** primero, el `new` ausente: un `ILogger` como parámetro del handler llega sin registrar nada; lo quitan, porque su test todavía no se lo pasa. (a) Guarda en un campo `static` la primera sesión del `SuspenderHandler`; siembra `emp-15` (`901500000`, "Panadería Oriente") y `emp-16` (`901600000`, "Lavandería Sur") y suspéndelas: las dos dan 200, emp-16 se queda en `empresa_registrada`, y tres mensajes caen en `wolverine_dead_letters` con `System.InvalidOperationException`. (b) Sesión propia con `SaveChangesAsync` y un `throw` después; con `emp-39` (`903900000`, "Papelería Andina") da 500 y los hechos quedan sin sus pedidos. (c) El `/dev/reset` sin guarda, en una base desechable `empresas_reset`: el log dice `Hosting environment: Production`. 🆕 Di qué es el entorno del host: sale de `ASPNETCORE_ENVIRONMENT`, vale `Production` si falta, y se pregunta con `IsDevelopment()`. La cura: `IsDevelopment()` más `PermitirReset`. Al final, quita el `static` y la falla, y devuelve la sesión por parámetro.

**Si se traban:**
- `WebApplication` no compila → el `.csproj` debe usar `Microsoft.NET.Sdk.Web`.
- El `POST` da 200 y el diario no cambia → esa empresa ya tiene un proceso abierto; usa una activa como `emp-10`.
- El log dice `Hosting environment: Development` sin pedirlo → hay un `Properties/launchSettings.json` que creó el editor.

**Cierra con:** el contenedor da cada pieza con su alcance: una sesión por operación, nunca compartida ni abierta por el handler, y `app.Run()` mantiene vivos el daemon y Wolverine. Commit con la reflexión: "¿qué parte del infierno de los `new` pagó Wolverine y cuál cierra el host web? ¿Qué pasa si guardas la sesión para reusarla?"

**Puente:** "El host sabe en qué entorno corre, pero el plazo sigue siendo un `5.Seconds()` fijo y la cadena una variable leída a mano. Lo sacamos del código."

---

## 45 · La configuración viene de afuera  ·  ⏱ ~55 min  ·  [la-configuracion-viene-de-afuera.md](secciones/la-configuracion-viene-de-afuera.md)

**Para qué:** que el plazo y la cadena de conexión lleguen desde afuera del código (archivo, variable, user-secrets, `/run/secrets`), y que el servicio no arranque si falta uno.

**Abre así (lo dices en voz alta):** "En producción Accesos tarda más que en tu máquina. ¿Cómo le damos 10 segundos de plazo allá y 5 aquí, con el mismo binario?"

**Haz sentir el dolor:** pide que el `Handle` de `RevocarAccesosV1` haga `await Task.Delay(6000)`. Que siembren emp-70 a emp-75 como sembraron emp-10, con `for (var i = 70; i <= 75; i++) Sembrar(s, $"emp-{i}", $"90{i}00000", $"Empresa {i}", "Basico");`, y la borren tras arrancar. Suspendan emp-70, esperen unos 8 segundos y consulten `susp-emp-70-2`: sale `3 | suspension_vencida` antes de `4 | revocacion_de_accesos_confirmada` y `5 | suspension_efectiva`. Es una alarma falsa, y el plazo es el `5.Seconds()` del código.

**Dicta los pasos:**
1. 🆕 Di qué es: la configuración junta el archivo, las variables y los argumentos, y gana la última leída. `Suspension:PlazoEnSegundos` en el archivo es `Suspension__PlazoEnSegundos` en una variable.
2. Crea `Empresas.Historia/appsettings.json` con `{ "Suspension": { "PlazoEnSegundos": 10 } }`, y la clase `PlazosDeSuspension` con `int PlazoEnSegundos { get; set; }`.
3. Tras `CreateBuilder`, `builder.Services.AddOptions<PlazosDeSuspension>().BindConfiguration("Suspension")`.
4. Que `SuspenderHandler` reciba `IOptions<PlazosDeSuspension> plazos` y que el `Delay` use `TimeSpan.FromSeconds(plazos.Value.PlazoEnSegundos)`. En el test, `Options.Create(new PlazosDeSuspension { PlazoEnSegundos = 5 })`.
5. Suspende emp-71. Luego `Suspension__PlazoEnSegundos=3 dotnet run` y emp-72: vuelve `suspension_vencida`. En CosmosLens, `PlazoSegundos` en 10 en `procesos.json`.
6. Paso 2: en `appsettings.json`, solo la forma, `"ConnectionStrings": { "Postgres": "" }`. 🆕 Di qué son user-secrets y `AddKeyPerFile`: un directorio donde cada archivo es una clave.
7. Tras `CreateBuilder`: `AddKeyPerFile(builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true)`, y `GetConnectionString("Postgres")` con su `?? throw` en lugar de `CADENA_POSTGRES`.
8. Proyecta y que corran: `dotnet user-secrets init`, `dotnet user-secrets set "ConnectionStrings:Postgres" "$CADENA_POSTGRES"`, `mkdir -p ~/secretos-empresas`, `echo "$CADENA_POSTGRES" > ~/secretos-empresas/ConnectionStrings__Postgres` y `unset CADENA_POSTGRES`.

**✅ Punto de control:** `susp-emp-71-2` llega a `suspension_efectiva` sin `suspension_vencida`. `ASPNETCORE_ENVIRONMENT=Development dotnet run` dice `Hosting environment: Development`, y `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run` dice `Production`; los dos arrancan sin `CADENA_POSTGRES`. Si alguien no llega: solución en el `<details>` de cada Paso.

**🔨 Rómpelo (no lo saltes: deja piezas que usan las secciones siguientes):**
- (a) La sección mal escrita, `"Suspencion"`: arranca, y emp-73 vence porque el plazo es 0. Agrega `[Range(1, 300)]`, `.ValidateDataAnnotations()` y `.ValidateOnStart()`: no arranca, con `… 'PlazoEnSegundos' with the error: 'The field PlazoEnSegundos must be between 1 and 300.'`. Corrige la sección y devuélvele a Accesos su respuesta inmediata.
- (b) El vacío: `dotnet run` sin directorio da `Value cannot be null. (Parameter 'Host')`; cambia el `?? throw` por `string.IsNullOrWhiteSpace`.
- (c) El socio: emp-74 queda `vencida`, con la dead letter `facturacion.cobrar-multa.v1 | Falta la variable de entorno CADENA_POSTGRES.`. Que `Conexion.Cadena` reciba `IConfiguration config`, y pásalo por los handlers de Facturación y por `Planes.Guardar`, `Planes.De` y `ProcesoMensual.Correr`. emp-75 queda `efectiva`.

**Si se traban:**
- El plazo sigue en 5 o en 0 → `appsettings.json` va junto al `Program.cs` de `Empresas.Historia`, y no debe quedar una `Suspension__PlazoEnSegundos` en la terminal.
- En `Development` no encuentra la cadena → `dotnet user-secrets list` dentro de `Empresas.Historia`; la clave lleva `:`, no `__`.
- En `Production` no la encuentra → el archivo es `ConnectionStrings__Postgres` (dos guiones bajos) y `DirectorioDeSecretos` va con la ruta completa.

**Cierra con:** lo que cambia de un lugar a otro entra por la configuración; en el repo va solo la forma; lo obligatorio se valida al arrancar, y vacío cuenta como nada. Que dejen la regla en `DECISIONES.md`. Recuérdales: `dotnet test` todavía pide `CADENA_POSTGRES` en su terminal. Commit con la reflexión: "¿qué pasaba con el plazo con la sección mal escrita, y por qué tu `?? throw` no paró la clave vacía?"

**Puente:** "El servicio ya arranca con lo que necesita. Pero el POST responde 200 y no dice nada más, y una pantalla que lee enseguida no distingue «todavía no» de «no existe»."

---

## 46 · Lo que acabas de pedir  ·  ⏱ ~45 min  ·  [lo-que-acabas-de-pedir.md](secciones/lo-que-acabas-de-pedir.md)

**Para qué:** que el POST diga dónde seguir el pedido (202 y `Location`), que la ficha distinga «todavía no» de «no existe», y que un pago repetido con su `Idempotency-Key` no se registre dos veces.

**Abre así (lo dices en voz alta):** "La pantalla de soporte da de alta una empresa y abre su ficha enseguida. Recibe 404. ¿La empresa no existe, o todavía no está?"

**Haz sentir el dolor:** que agreguen `MapPost("/empresas", (RegistrarEmpresa cmd, IMessageBus bus) …)` y `MapGet("/empresas/{id}", …)`, que lee `LoadAsync<Tablero>(id)` y responde `NotFound` u `Ok`. Un `record` como parámetro se lee del cuerpo JSON. Corre en una sola línea el alta de emp-76 y su GET: `curl -i -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d '{"empresaId":"emp-76","nit":"907600000","nombre":"Empresa 76","plan":"Basico"}'; curl -i http://localhost:5000/empresas/emp-76`. Sale `HTTP/1.1 200 OK` y `HTTP/1.1 404 Not Found`. `emp-999` da el mismo 404. Un segundo después, emp-76 da 200: el tablero es `Async`.

**Dicta los pasos:**
1. 🆕 Di qué es: `Results.Accepted(ruta)` responde `202 Accepted` y pone `Location`. No es un 201: con una vista `Async`, el resultado todavía no está.
2. En el alta, `Results.Accepted($"/empresas/{cmd.EmpresaId}")`; en suspender, `Results.Accepted($"/empresas/{id}")`. Prueba con emp-77.
3. 🆕 Di qué es: `session.Events.FetchStreamStateAsync(id)` dice si el stream existe sin cargar sus hechos; si no existe, devuelve `null`.
4. En el GET: si el tablero la tiene, 200. Si no, pregunta al diario: si existe, `Results.Accepted(value: new { Id = id, Estado = "en proceso" })`; si no, 404. Prueba con emp-78.
5. Paso 3: agrega `MapPost("/empresas/{id}/pagos", (string id, int monto, IMessageBus bus) …)` con `Guid.NewGuid()` como referencia. Manda dos veces el mismo pago a emp-77: el SQL muestra dos referencias distintas.
6. 🆕 Di qué es: `Idempotency-Key` es un header que el cliente inventa una vez por pago. Léelo con `[FromHeader(Name = "Idempotency-Key")] string? llave` (`using Microsoft.AspNetCore.Mvc;`). La llave es la referencia; sin llave, `Results.BadRequest("Falta el header Idempotency-Key.")`.
7. Dos a la vez: proyecta y corre el bucle de cincuenta pares a emp-78 con `Idempotency-Key: par-$k`, y la consulta `HAVING count(*) > 1`. Suele salir algo como `par-8 | 2`. Arreglo: en el `Append` del `RegistrarPagoHandler`, la versión esperada `empresa.Version + 1`. Repite con `otra-$k`.

**✅ Punto de control:** el alta de emp-77 da `HTTP/1.1 202 Accepted` con `Location: /empresas/emp-77`. El GET de emp-78 recién dada de alta da 202 `{"id":"emp-78","estado":"en proceso"}`, y emp-999 da 404. Dos pagos con `Idempotency-Key: pago-78-1` dejan un solo `pago_registrado`; sin llave, 400. Con `otra-$k`, ninguna llave sale dos veces. Si alguien no llega: solución en el `<details>` del Paso correspondiente.

**🔨 Rómpelo (si hay tiempo):** envuelve `FetchStreamStateAsync` en dos reintentos, de 150 y 350 ms. `curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:5000/empresas/emp-999` pasa de `404 0.003` a `404 0.51`. Lo que no está en el diario no llega esperando; tras un 202, la espera la hace el cliente. Quita los reintentos.

**Si se traban:**
- El alta da `415 Unsupported Media Type` → falta `-H "Content-Type: application/json"`.
- El alta da 500 → esa empresa o su NIT ya existen; usar otra.
- La ficha da 202 y nunca 200 → el daemon no proyecta el tablero; buscar `Started projection agent Tablero:All` en el log.

**Cierra con:** un pedido se contesta con lo que de verdad pasó; la existencia la dice el diario, que nunca va atrás; el reintento lleva la llave del cliente. Que dejen la regla en `DECISIONES.md`. Commit con la reflexión: "¿por qué el diario dice «existe» y el tablero todavía no? ¿Por qué la llave del pago la inventa el cliente?"

**Puente:** "Cuando la ficha sí tiene la empresa, la entrega con 200 aunque vaya atrás: justo después de suspender, todavía dice `activa`."

---

## 47 · La respuesta dice cuánto sabe  ·  ⏱ ~40 min  ·  [la-respuesta-dice-cuanto-sabe.md](secciones/la-respuesta-dice-cuanto-sabe.md)

**Para qué:** que cada lectura de una vista diga cuántos hechos le faltan (`X-Rezago`), y que el listado entregue páginas de tamaño fijo.

**Abre así (lo dices en voz alta):** "Suspendo una empresa y pido su ficha enseguida: dice `activa`, con 200. ¿Ese 200 es verdad?"

**Haz sentir el dolor:** alta de emp-80; esperen a que su ficha dé 200. Luego, en una línea: `curl -i -X POST http://localhost:5000/empresas/emp-80/suspender; curl -i http://localhost:5000/empresas/emp-80`. Sale `HTTP/1.1 202 Accepted` y `HTTP/1.1 200 OK {… ,"suspension":null, … ,"estado":"activa"}`. Un segundo después dice `efectiva`, y nada avisó.

**Dicta los pasos:**
1. 🆕 Di qué es: un parámetro `HttpResponse respuesta` y `respuesta.Headers["X-Rezago"] = "2";` agregan un header propio. Va en un header porque la ficha tiene tres salidas con cuerpos distintos. El rezago es el high-water menos el progreso del shard (§40).
2. Antes de `app.Run()`, el método `static async Task<long> Rezago(IDocumentStore store, string shard)`. Usa `FetchEventStoreStatistics()` (su `EventSequenceNumber`) y `AllProjectionProgress()`, buscado por `ShardName`.
3. En la ficha, `X-Rezago` de `Tablero:All`, arriba, para todas sus salidas. En el listado, el de `VistaSuspendida:All`. Los dos piden `IDocumentStore` y `HttpResponse`. Prueba con emp-81.
4. Proyecta el bucle bash de la «pantalla» con emp-82: `rezago 2`, `rezago 5`, `rezago 0`. El rezago puede subir antes de bajar.
5. Paso 2: siembra las 20 000 `VistaSuspendida` falsas antes de `app.Run()`, arranca una vez y quita el bloque. `curl -s -o /dev/null -w "%{size_download} bytes\n" http://localhost:5000/empresas/suspendidas` da `269026 bytes`.
6. 🆕 Di qué es: `ToPagedListAsync(pagina, tamaño)` (`using Marten.Pagination;`) trae solo esa página, con `PageNumber` y `HasNextPage`, y necesita un `OrderBy`.
7. En el listado: `int? pagina` (1 si no viene), `OrderBy(v => v.Id)`, página de 50 que fija el servidor, y devolver `{ Empresas, Pagina, HayMas }`.
8. Proyecta los dos `EXPLAIN`: `ORDER BY id` da `Index Only Scan`; `ORDER BY data->>'SuspendidaDesde'` da `Sort … Seq Scan`.
9. Saca las falsas: `await Vistas.Rearmar(app, "VistaSuspendida");` antes de `app.Run()`, un arranque, y quitar la línea.

**✅ Punto de control:** emp-81 da `200 X-Rezago: 2` con `"estado":"activa"`, y un segundo después `X-Rezago: 0` con `"efectiva"`. El listado pesa unos 600 bytes y responde `{"empresas":[… 50],"pagina":1,"hayMas":true}`. `SELECT count(*) FROM mt_doc_vistasuspendida WHERE id LIKE 'falsa-%';` da 0. Si alguien no llega: solución en el `<details>` de cada Paso.

**🔨 Rómpelo (si hay tiempo; usa el `Suspensiones` de §42):** un `GET /empresas/{id}/suspensiones` con `?? 0`: emp-999 da 0, y emp-83 recién suspendida también da 0 (un segundo después, 1). Pide que responda como la ficha: el `X-Rezago` de `VistaSuspendida:All` y, sin documento, el diario decide entre 202 y 404. Compruébalo con emp-84.

**Si se traban:**
- `X-Rezago` sale siempre igual al high-water → el nombre del shard no coincide; revisar con `SELECT name FROM mt_event_progression;`.
- El listado repite empresas entre páginas → falta el `OrderBy`.
- Siguen las `falsa-` → la línea de `Rearmar` va antes de `app.Run()`, con el nombre `VistaSuspendida`.

**Cierra con:** una respuesta de una vista dice cuánto sabe; un documento que no está no es un cero; un listado tiene tope. Que dejen la regla en `DECISIONES.md`. Commit con la reflexión: "¿por qué una lista vacía con rezago 0 y otra con rezago 3 no dicen lo mismo? ¿Por qué el tamaño de página no lo elige el cliente?"

**Puente:** "Cuando algo sale mal, el servicio todavía responde 500. Un NIT repetido le llega a la pantalla como una falla del servidor, con el stack de nuestro código."

---

## 48 · El borde es un contrato  ·  ⏱ ~45 min  ·  [el-borde-es-un-contrato.md](secciones/el-borde-es-un-contrato.md)

**Para qué:** errores con forma (ProblemDetails, 409 o 500, sin filtrar detalles internos), y una historia por HTTP que no cambia cuando renombras un hecho.

**Abre así (lo dices en voz alta):** "Un NIT repetido es un error del pedido, no del servidor. Si respondemos 500, la pantalla reintenta algo que nunca va a servir."

**Haz sentir el dolor:** con `ASPNETCORE_ENVIRONMENT=Development dotnet run`, alta de emp-90 (NIT `909000000`) y de emp-91 con el mismo NIT. Sale `HTTP/1.1 202 Accepted` y luego `HTTP/1.1 500 Internal Server Error`, con `JasperFx.DocumentAlreadyExistsException: Document already exists Localizador: 909000000` y el stack. Corre el bucle de la pantalla: `intento 1: 500`, `intento 2: 500`, `intento 3: 500`. En `Production` (`DirectorioDeSecretos=$HOME/secretos-empresas dotnet run`), es un 500 sin cuerpo.

**Dicta los pasos:**
1. 🆕 Di qué es: 409 dice «choca con lo que ya hay» y 500 dice «falló el servidor». `AddProblemDetails()` da el cuerpo estándar (`type`, `title`, `status`, `traceId`). `UseExceptionHandler(new ExceptionHandlerOptions { StatusCodeSelector = ex => … })` atrapa la excepción y elige el código.
2. `builder.Services.AddProblemDetails();` junto a los servicios, y `app.UseExceptionHandler(…)` después de `builder.Build()`.
3. 409 para `JasperFx.DocumentAlreadyExistsException` (el NIT) y `Marten.Exceptions.ExistingStreamIdCollisionException` (el id); 500 para lo demás.
4. El otro conflicto: comenta la política de `ConcurrencyException`. Alta de emp-92 (NIT `909200000`) y los treinta pares con llaves `c-$k`: `30 200` y `30 500`. Suma `|| ex is JasperFx.ConcurrencyException` al 409 y repite con `d-$k`: ya no hay 500. Devuelve la política.
5. Paso 2: el endpoint crudo `GET /empresas/{id}/historia`, con `FetchStreamAsync` y `{ e.Version, Tipo = e.EventType.Name, e.Data }`. Pago de emp-90 con `Idempotency-Key: pago-90-1`; el `grep -o '"tipo":"PagoRegistrado"' | wc -l` cuenta 1.
6. Renombra con el IDE `PagoRegistrado` a `PagoRecibido`, y en `Hechos.Registrar` pon `opts.Events.MapEventType<PagoRecibido>("pago_registrado");`. `dotnet test` pasa, la historia dice `"tipo":"PagoRecibido"` y el `grep` cuenta 0.
7. Reto: `record HechoDeLaHistoria(long Version, string Tipo, DateTimeOffset Cuando, string? Plan, string? Motivo, int? Monto)`. `Tipo` sale de `e.EventTypeName` (el alias) y `Cuando` de `e.Timestamp`. Usa un `e.Data switch { … _ => … }`. Sin hechos, 404. No lleva NIT ni referencia.
8. Deshaz el renombre. El `grep` de la pantalla pasa a `"tipo":"pago_registrado"` y cuenta 1.

**✅ Punto de control:** emp-91 con el NIT de emp-90 da `409 {"type":"…","title":"Conflict","status":409,"traceId":"00-…-00"}` en los dos entornos, y la pantalla muestra `intento 1: 409` y para. La historia de emp-90 sale con `"tipo":"empresa_registrada"` y `"tipo":"pago_registrado"` con `"monto":50000`; la de emp-999 da 404. Si alguien no llega: solución en el `<details>` del Paso 1 y del Paso 2.

**🔨 Rómpelo (no lo saltes: la frase del NIT se usa en §55):** con `CustomizeProblemDetails`, pon `c.Exception?.Message` en `Detail`. En `Production`, el 409 entrega `Document already exists Localizador: 909000000` y el mensaje largo de Marten. Cura: para `DocumentAlreadyExistsException`, la frase `"Ya existe una empresa con ese NIT."`; el mensaje de la excepción, solo si `builder.Environment.IsDevelopment()`.

**Si se traban:**
- El alta repetida sigue en 500 → `UseExceptionHandler` va después de `builder.Build()`; la línea `fail: Microsoft.AspNetCore.Diagnostics.ExceptionHandlerMiddleware[1]` dice qué excepción llegó.
- `UseExceptionHandler` lanza al arrancar → falta `builder.Services.AddProblemDetails();`.
- La historia no compila tras deshacer el renombre → el `switch` todavía dice `PagoRecibido`.

**Cierra con:** lo que cruza el borde HTTP es un contrato: el error tiene forma, el detalle se queda en el log, y la historia sale por un tipo propio con el alias del hecho. Que dejen la regla en `DECISIONES.md`. Commit con la reflexión: "¿qué hace distinto la pantalla con un 409 y con un 500? ¿Por qué la historia cruda se rompió con un renombre que el diario aguantó?"

**Puente:** "El 409 trae un `traceId`. Búscalo en el log: no está. Seguir un pedido por nuestros handlers y por los socios es lo siguiente."

---

## 49 · Seguir una acción  ·  ⏱ ~50 min  ·  [seguir-una-accion.md](secciones/seguir-una-accion.md)

**Para qué:** que cada pedido lleve un id de correlación que aparece en la respuesta, en cada hecho (`mt_events.correlation_id`) y en cada línea del log, y que cada descarte deje su línea sin copiar el contenido del pedido.

**Abre así (lo dices en voz alta):** "Soporte escribe: «Registré un pago de 80.000 para emp-94, la pantalla dijo que bien, y no aparece». ¿Con qué lo buscas?"

**Haz sentir el dolor:** arranca con `ASPNETCORE_ENVIRONMENT=Development dotnet run 2>&1 | tee servicio.log`. Alta de emp-94 a emp-99 con el bucle. Un pago de 50000 con `Idempotency-Key: pago-94-1` da 200, y uno de 80000 con la misma llave también da 200. La historia muestra un solo `pago_registrado`, de 50000. En el log hay dos `Request finished … 200` iguales; nada dice que el segundo se descartó, y la respuesta no da ningún id.

**Dicta los pasos:**
1. 🆕 Di qué es: el handler recibe `ILogger logger` como parámetro. `ILogger<…Handler>` no sirve con una clase `static` (`error CS0718`). El texto es una plantilla con campos (`{Referencia}`), no un `$"…"`.
2. Una línea en cada `return` que descarta. En `RegistrarPagoHandler`, `LogWarning("Pago {Referencia} de {EmpresaId} ya registrado: se descarta", …)`. En `SuspenderHandler`, `LogInformation("{EmpresaId} ya tiene un proceso abierto: no se abre otro", …)`. En el `Decidir` de `ProcesoDeSuspensionHandler`, `LogInformation("{SuspensionId}: el mensaje no cambia el proceso, se descarta", …)`; sus cinco `Handle` piden el logger y se lo pasan. En el test, `NullLogger.Instance`.
3. Prueba con `Logging__LogLevel__Default=Warning`: queda el `warn` y desaparecen los `info`.
4. 🆕 Di qué es: el `CorrelationId` del sobre lo pone Wolverine y lo copia a todo lo que causa el pedido. Marten lo guarda con `opts.Events.MetadataConfig.CorrelationIdEnabled = true;`.
5. 🆕 Di qué es: `app.Use(async (contexto, siguiente) => …)` corre antes de cada endpoint. Junto al `UseExceptionHandler`: si llega `X-Correlation-Id`, ponlo en `bus.CorrelationId` (el `IMessageContext` de `contexto.RequestServices`). Con `contexto.Response.OnStarting(…)`, devuélvelo en la respuesta; así también va en un 409.
6. Prueba emp-95 con `X-Correlation-Id: soporte-95` y emp-96 sin header, y consulta `mt_events` por `correlation_id`.
7. Paso 3: en `appsettings.json`, `"Logging": { "Console": { "FormatterName": "simple", "FormatterOptions": { "IncludeScopes": true } } }`. Muestra que la línea del plazo, que corre en la cola, no trae ningún id.
8. 🆕 Di qué es: un middleware de Wolverine. Clase `CorrelacionEnElLog` con `static Before(ILogger logger, Envelope envelope)` que devuelve `logger.BeginScope("CorrelationId:{CorrelationId}", envelope.CorrelationId)`. Se registra con `opts.Policies.AddMiddleware(typeof(CorrelacionEnElLog));`. Prueba emp-98 con `soporte-98`.

**✅ Punto de control:** el pago repetido deja `warn: RegistrarPago[0]` con `Pago pago-94-1 de emp-94 ya registrado: se descarta`. emp-95 responde `202` con `X-Correlation-Id: soporte-95`, y la consulta trae `emp-95 | empresa_suspendida`, `susp-emp-95-2 | suspension_solicitada` y las respuestas de los socios. `grep -B1 -A1 "CorrelationId:soporte-98" servicio.log` trae `info: RevisarSuspension[0]` con `=> CorrelationId:soporte-98`. Si alguien no llega: solución en el `<details>` de cada Paso.

**🔨 Rómpelo (si hay tiempo):** pon `logger.LogDebug("Pago recibido: {Pago}", cmd);` al principio de `RegistrarPagoHandler`. Arranca con `Logging__LogLevel__RegistrarPago=Debug` y paga emp-96 con `soporte-96`: el log muestra `Pago recibido: RegistrarPago { EmpresaId = emp-96, Referencia = pago-96-1, Monto = 50000 }`. El monto ya está en el diario: `SELECT type, data->>'Monto' FROM mt_events WHERE correlation_id = 'soporte-96';`. Quita la línea.

**Si se traban:**
- `correlation_id` vacío → falta `CorrelationIdEnabled = true`, o el hecho es de antes de ponerlo.
- El 409 no trae `X-Correlation-Id` → el header va dentro de `OnStarting`, no antes de `siguiente()`.
- Las líneas no traen `=> CorrelationId` → falta `IncludeScopes`, `"FormatterName": "simple"` o el `AddMiddleware`.

**Cierra con:** una acción se sigue con su correlación: entra o nace en el borde, viaja en cada mensaje, y queda en cada hecho y en cada línea del log; el log lleva ids, no el pago. Que dejen la regla en `DECISIONES.md`. Commit con la reflexión: "¿qué encontraste por la correlación en `mt_events`, y qué solo en el log? ¿Por qué el plazo que encuentra el proceso resuelto no es un `Warning`?"

**Puente:** "Hasta aquí, un solo programa escribe en el diario. Ahora nace otro: un worker que cambia planes de noche, con su propia copia de la configuración."

---

## 50 · Dos hosts, una configuración  ·  ⏱ ~60 min  ·  [dos-hosts-una-configuracion.md](secciones/dos-hosts-una-configuracion.md)

**Para qué:** que todo programa que escribe en el diario arranque con una sola función de configuración, `AgregarEmpresas`, y que cada host diga solo su papel: si corre el daemon y si puede cambiar las tablas.

**Abre así (lo dices en voz alta):** "Comercial deja cada noche un archivo con cambios de plan. Un compañero escribió un worker copiando de nuestro servicio lo que necesitaba. ¿Qué puede salir mal con una copia?"

**Haz sentir el dolor:**
- Con el servicio en `Development`, alta de emp-100 a emp-105. Luego `dotnet new console -o Empresas.Worker` y `dotnet add Empresas.Worker reference Empresas.Historia`, y que peguen la copia del `Program.cs` que trae la sección.
- `cambios.csv` en la raíz con `emp-100;Premium`. Desde `Empresas.Worker`: `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv`. Imprime `emp-100: plan Premium`, pero `mt_doc_empresadetalle` y `plan_de_empresa` siguen en `Basico`.
- Suspende emp-101: da 500, con `42703: column "correlation_id" does not exist`. El log del worker dice `alter table public.mt_events drop column correlation_id;`. Al reiniciar el servicio la columna vuelve, pero vacía: `soporte-95` da 0.

**Dicta los pasos:**
1. 🆕 Di qué es: `IHostApplicationBuilder` es la interfaz común del builder web y del de consola, y un método de extensión sobre ella sirve a los dos.
2. En `Empresas.Historia`, clase `static Configuracion` con `public static void AgregarEmpresas(this IHostApplicationBuilder builder)`.
3. Muda ahí el `AddKeyPerFile`, la cadena con su `throw`, `PlazosDeSuspension`, y tus `AddMarten` y `AddWolverine` enteros. En `Program.cs` se quedan `AddProblemDetails`, `UseExceptionHandler` y el `app.Use`.
4. Agrega `opts.Discovery.IncludeAssembly(typeof(Configuracion).Assembly);`. Llama `builder.AgregarEmpresas();` en los dos `Program.cs` y borra la copia del worker.
5. Worker con `emp-100;Enterprise`: falla con `OptionsValidationException … PlazoEnSegundos must be between 1 and 300`. Dale su propio `appsettings.json` con la sección `Suspension` y corre otra vez.
6. Corre `grep -rn "AddMarten" --include=*.cs .`: quedan `Configuracion.cs` y `HostConDaemon`.
7. Paso 2: segunda copia, desde `Empresas.Historia`, con `ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5001`. Proyecta el reparto de emp-106 a emp-115 entre las dos copias: sale `ProgressionProgressOutOfOrderException`.
8. 🆕 Di qué es `DaemonMode`: `Solo`, `HotCold` (una copia gana un candado) y `Disabled`. Agrega el parámetro `DaemonMode daemon` y pásalo a `AddAsyncDaemon(daemon)`: el servicio va con `HotCold` y el worker con `Disabled` (`using JasperFx.Events.Daemon;` en los dos `Program.cs`).
9. Paso 3: simula el worker de ayer con `CorrelationIdEnabled = daemon != DaemonMode.Disabled;` y `emp-103;Premium`: vuelve el `drop column`, y suspender emp-105 da 500. Reinicia el servicio para recuperar la columna.
10. 🆕 Di qué es `AutoCreateSchemaObjects`. Agrega el parámetro `AutoCreate esquema` y pásalo a `opts.AutoCreateSchemaObjects`: el servicio va con `CreateOrUpdate` y el worker con `None` (`using JasperFx;`). Corre otra vez el worker de ayer con `emp-103;Premium`. Al final, vuelve a `CorrelationIdEnabled = true;`.

**✅ Punto de control:** el worker con `emp-100;Enterprise` imprime `emp-100: plan Enterprise`, sin `schema update`, y `EmpresaDetalle` y `plan_de_empresa` dicen Enterprise. Con dos copias `HotCold` (emp-116 a emp-125) no sale ningún `OutOfOrder` y solo una dice `Started projection agent`; al detenerla, lo dice la otra. El worker de ayer con `None` cae con `42883: function public.mt_quick_append_events(…) does not exist`, y `\d mt_events` conserva `correlation_id`. Deja corriendo solo la copia del 5000. Si alguien no llega: solución en el `<details>` de cada Paso.

**Si se traban:**
- `AgregarEmpresas` no existe en el worker → falta la referencia a `Empresas.Historia`, o `Configuracion` no es `static`.
- El worker no lee su `appsettings.json` → correrlo desde la carpeta `Empresas.Worker`.
- En Windows, `MSB3027` al compilar el worker → detener el servicio, compilar y arrancarlo otra vez.

**Cierra con:** todos los hosts que escriben el mismo diario arrancan con la misma función, y cada uno solo dice su papel. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué el tablero vio el cambio del worker y `EmpresaDetalle` no? ¿Por qué compartir la función no bastó con el worker de ayer?"

**Puente:** "El `grep` encontró otro `AddMarten`: el de `HostConDaemon`. Lo que prueban nuestros tests no es lo que corre."

---

## 51 · El arnés usa la misma configuración  ·  ⏱ ~30 min  ·  [el-arnes-usa-la-misma-configuracion.md](secciones/el-arnes-usa-la-misma-configuracion.md)

**Para qué:** que el host de los tests arranque con `AgregarEmpresas`, para que un verde hable del servicio, y fijar con un test por el bus que diez avisos del mismo pago dejan uno solo.

**Abre así (lo dices en voz alta):** "Un banco reenvía su aviso de pago cuando no le respondemos a tiempo. El servicio lo aguanta. Fijémoslo en un test, como llega en producción: por el bus, diez a la vez, contra Postgres."

**Haz sentir el dolor:** proyecta el test y que lo copien en `Empresas.Tests/CarreraDelPagoTests.cs`, en la colección `"daemon"`: siembra emp-146 y lanza diez `InvokeAsync(new RegistrarPago("emp-146", "pago-146-1", 50_000))` a la vez. `dotnet test --filter CarreraDelPagoTests` da rojo: `JasperFx.Events.EventStreamUnexpectedMaxEventIdException`. El diario sí tiene un solo pago: fallan los avisos que chocaron sin reintentar, porque `HostConDaemon` no tiene la política. Luego `dotnet test --filter Suspender_por_el_bus_llega_a_la_vista`: `susp-emp-14-2` tiene `suspension_solicitada` y `suspension_vencida`, porque el plazo es 0.

**Dicta los pasos:**
1. 🆕 Di qué es: `builder.Configuration["clave"] = valor` pone una clave por encima de lo ya leído, y una fuente agregada después le puede ganar (los secretos). Por eso `DirectorioDeSecretos` va a `"sin-secretos"`.
2. En el `InitializeAsync` de `HostConDaemon`, después de calcular `deTests` y crear el builder con `Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder()`, cambia tu `AddMarten` y tu `AddWolverine` por tres claves de configuración y la llamada a tu función. Las claves: `DirectorioDeSecretos = "sin-secretos"`, `ConnectionStrings:Postgres = deTests` y `Suspension:PlazoEnSegundos = "10"`.
3. Pregunta al grupo el papel del host de pruebas. Es el único proceso de su base y el dueño de sus tablas: `builder.AgregarEmpresas(DaemonMode.Solo, AutoCreate.CreateOrUpdate)`. Agrega `using JasperFx;` y quita los `using` que ya no se usan.
4. `dotnet test` da verde. En `empresas_tests`, las dead letters traen `facturacion.cobrar-multa.v1 | 42P01: relation "multas" does not exist`.
5. Copia las tablas de Facturación: `docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas_tests"`. Luego `DELETE FROM wolverine_dead_letters;` y `dotnet test` otra vez.

**✅ Punto de control:** `dotnet test` en verde, con `CarreraDelPagoTests`; la suspensión del test ya no tiene `suspension_vencida`; Facturación no deja dead letters. Si alguien no llega: solución en el `<details>`.

**🔨 Rómpelo (si hay tiempo):** comenta en `AgregarEmpresas` las dos líneas de `OnException<JasperFx.ConcurrencyException>()`. Cae `CarreraDelPagoTests` con el mismo `EventStreamUnexpectedMaxEventIdException`, y ahora ese rojo vale para los tres hosts. Descoméntalas.

**Si se traban:**
- `OptionsValidationException … PlazoEnSegundos` → falta `Suspension:PlazoEnSegundos` en el fixture.
- `RevisarSuspension … No existe la suspensión` en las dead letters → es el plazo de un test que venció después del reset de otro; no viene de Facturación.
- El servicio perdió sus empresas después de `dotnet test` → el fixture leyó la cadena del servicio; revisar la línea de `DirectorioDeSecretos`.

**Cierra con:** el host de tests es un host más y arranca con la misma función; su verde y su rojo hablan de lo que corre. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué tu copia daba un rojo que el servicio no tenía? ¿Qué otra línea de la función tumbaría `CarreraDelPagoTests`?"

**Puente:** "Cada host trata sus mensajes en colas locales, dentro de su proceso. Cuando otro equipo quiera escucharnos desde el suyo, el anuncio tiene que cruzar procesos."

---

## 52 · El broker de verdad  ·  ⏱ ~60 min  ·  [el-broker-de-verdad.md](secciones/el-broker-de-verdad.md)

**Para qué:** que `PlanDeEmpresaV1` llegue por RabbitMQ a otro proceso, Notificaciones, por el exchange del contexto (`empresas`), lo publique el servicio o el worker; y que un host sin credenciales del broker diga cuál le falta.

**Abre así (lo dices en voz alta):** "Notificaciones es otro equipo, en otro proceso, sin nuestros handlers ni nuestra base. Nuestras colas locales viven dentro de nuestro proceso. ¿Cómo le llega el aviso de un cambio de plan?"

**Haz sentir el dolor:** primero monta el broker y Notificaciones (pasos 1 a 4). El dolor sale en el paso 5. El worker publica `emp-150;Premium`, Notificaciones no imprime nada y ningún log falla. `docker exec empresas-rabbit rabbitmqctl list_bindings source_name destination_name` lo explica: `Empresas.Worker → facturacion.planes`, y la cola de Notificaciones solo está atada a `Empresas.Historia`.

**Dicta los pasos:**
1. `docker run -d --name empresas-rabbit -p 5672:5672 rabbitmq:4-management` (usuario y clave `guest`, solo en tu máquina). 🆕 Di qué es: exchange, cola, binding, y las piezas de Wolverine (`UseRabbitMq`, `AutoProvision`, `PublishMessage<T>().ToRabbitExchange`, `BindExchange().ToQueue()`, `ListenToRabbitQueue`). Con una regla de `PublishMessage`, el mensaje deja de ir a los handlers locales.
2. `dotnet add Empresas.Historia package WolverineFx.RabbitMQ`. En `appsettings.json`, `"Broker": { "Host": "", "Usuario": "", "Clave": "" }`. Los valores (`localhost`, `guest`, `guest`), desde `Empresas.Historia`: `dotnet user-secrets set "Broker:Host" "localhost"` (y así `Broker:Usuario` y `Broker:Clave`), y los archivos `~/secretos-empresas/Broker__Host`, `Broker__Usuario` y `Broker__Clave` con `echo`.
3. En `AgregarEmpresas`, al final de tu `AddWolverine` (con `using Wolverine.RabbitMQ;`): `var exchange = builder.Environment.ApplicationName;`, `UseRabbitMq(f => …)` con `HostName`, `UserName` y `Password` leídos de `Broker:…`, más `.AutoProvision()`, y `opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitExchange(exchange);`.
4. Proyecto `Notificaciones`: `dotnet new console -o Notificaciones`, referencia a `Contratos`, y los paquetes `WolverineFx.RabbitMQ` y `WolverineFx.RuntimeCompilation`. Proyecta su `Program.cs` y que lo peguen, con `BindExchange("Empresas.Historia").ToQueue("notificaciones.planes")`.
5. Alta de emp-150 (NIT `915000000`): Notificaciones imprime `Correo a 915000000: tu plan ahora es Basico`, pero `plan_de_empresa` no trae nada. Facturación necesita su cola: `.AutoProvision().BindExchange(exchange).ToQueue("facturacion.planes")` y `opts.ListenToRabbitQueue("facturacion.planes");`. Reinicia y corre el worker con `emp-150;Premium`.
6. Paso 1: el exchange es del contexto. `const string exchange = "empresas";`, y en Notificaciones `.BindExchange("empresas")`. Alta de emp-151 (NIT `915100000`) y worker con `emp-151;Premium`. Borra los exchanges viejos con `docker exec empresas-rabbit rabbitmqadmin delete exchange --name Empresas.Historia` (y lo mismo con `Empresas.Worker`).
7. Paso 2: quita el archivo `Broker__Clave` y corre el worker. Sale `BrokerInitializationException: Unable to initialize the Broker rabbitmq in time … (Parameter 'password')`. Con el archivo vacío: `None of the specified endpoints were reachable`.
8. 🆕 Di qué es: `[Required(ErrorMessage = …)]` marca una propiedad obligatoria, y `GetSection("Broker").Get<T>()` llena una clase en esa línea. Crea `CredencialesDelBroker` con `Host`, `Usuario` y `Clave` obligatorias. Regístrala con `BindConfiguration("Broker")`, `ValidateDataAnnotations()` y `ValidateOnStart()`, y llénala con `Get<CredencialesDelBroker>() ?? new CredencialesDelBroker()` para el `UseRabbitMq`. Devuelve la clave al archivo y corre otra vez el worker.
9. `dotnet test` cae con `Falta Broker:Host.`. En `HostConDaemon`, pon las tres claves del broker y, después de `AgregarEmpresas`, `builder.Services.DisableAllExternalWolverineTransports();`.

**✅ Punto de control:** Notificaciones imprime los dos correos de emp-151, el del alta y el del cambio, y `plan_de_empresa` dice Premium para `915100000`. Sin la clave, o con ella vacía, el worker dice `… 'Clave' with the error: 'Falta Broker:Clave.'`. `dotnet test` vuelve a verde. Si alguien no llega: solución en el `<details>` de cada Paso.

**Si se traban:**
- Notificaciones no arranca con `no IAssemblyGenerator (Roslyn) is registered` → le falta `WolverineFx.RuntimeCompilation`.
- `ACCESS_REFUSED` o `None of the specified endpoints were reachable` → el contenedor no está arriba (`docker ps`), o usuario y clave no son `guest`.
- El worker no encuentra el broker → corre en `Production`; revisar los tres archivos `Broker__…` del directorio de secretos.

**Cierra con:** un anuncio que cruza procesos sale al exchange del contexto, igual en todos sus hosts, y cada interesado lo lee de su cola; las credenciales son una clase que se valida al arrancar. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué Facturación recibió el cambio del worker y Notificaciones no? ¿Qué decía el error sin la clave, y qué dice ahora?"

**Puente:** "Notificaciones confía en su cola porque `AutoProvision` la crea al arrancar. Con un nombre mal escrito, arranca en verde y no recibe nada."

---

## 53 · Lo que el broker no promete  ·  ⏱ ~60 min  ·  [lo-que-el-broker-no-promete.md](secciones/lo-que-el-broker-no-promete.md)

**Para qué:** que la topología la cree la infraestructura y la app no arranque si falta su cola; que Notificaciones no pierda avisos si se cae (inbox durable); que el servicio no pierda anuncios con el broker caído (outbox durable); y que cada aviso tenga un solo camino.

**Abre así (lo dices en voz alta):** "El broker guarda lo que tiene en sus colas. ¿Y si una cola está mal escrita, si el consumidor se cae a la mitad, o si el broker está caído cuando publicamos?"

**Haz sentir el dolor:** en Notificaciones, cambia solo `ListenToRabbitQueue("notificaciones.planes")` por `"notificaciones.plane"` y deja su `BindExchange`. Arranca sin quejarse. El worker con `emp-151;Enterprise` no produce ningún correo y ningún error. `docker exec empresas-rabbit rabbitmqctl list_queues name messages` muestra `notificaciones.planes 1` y `notificaciones.plane 0`.

**Dicta los pasos:**
1. 🆕 Di qué es: en un despliegue, la topología la crea la infraestructura; sin `AutoProvision`, la app no crea nada y no arranca si falta su cola. Que copien `topologia.sh` a la raíz y lo corran con `bash topologia.sh` (en Windows, Git Bash o WSL).
2. Borra la cola vacía: `docker exec empresas-rabbit rabbitmqadmin delete queue --name notificaciones.plane`.
3. En `AgregarEmpresas`: `var rabbit = opts.UseRabbitMq(…)`, `rabbit.BindExchange(exchange).ToQueue("facturacion.planes")`, y `AutoProvision()` solo si `builder.Environment.IsDevelopment()`.
4. A Notificaciones quítale `AutoProvision()` y su `BindExchange`, y arráncala con el nombre mal escrito. Luego corrige el nombre.
5. Segundo dolor: `.BufferedInMemory()`, y el handler con `Task.Delay(1000)` y un `Environment.FailFast` en el quinto correo si `CAER=si`. Arranca con `CAER=si dotnet run --project Notificaciones`, pon veinte cambios en `cambios.csv` con `for i in $(seq 1 10); do echo "emp-151;Basico"; echo "emp-151;Premium"; done > cambios.csv` y corre el worker. Muere con `Process terminated. Notificaciones se cayó`, la cola queda en 0, y al rearrancar no sale ningún correo más.
6. 🆕 Di qué es: `UseDurableInbox()` guarda cada aviso en Postgres antes de confirmarlo al broker. En Notificaciones: paquetes `WolverineFx.Postgresql` y `Microsoft.Extensions.Configuration.KeyPerFile`, la cadena leída como en el servicio, `PersistMessagesWithPostgresql(cadena, "notificaciones")`, `Durability.Mode = DurabilityMode.Solo` y `UseDurableInbox()`. Arranca con `CAER=si DirectorioDeSecretos=$HOME/secretos-empresas dotnet run --project Notificaciones` y repite los veinte cambios.
7. Tercer dolor: `docker stop empresas-rabbit` y alta de emp-152 (NIT `915200000`). Da 202, y el log dice `Discarding message Envelope … (Contratos.PlanDeEmpresaV1) … after 3 attempts`. Con `docker start empresas-rabbit`, espera `RabbitMQ connection is recovered successfully`: `plan_de_empresa` no tiene nada para `915200000` y `wolverine_outgoing_envelopes` da 0.
8. 🆕 Di qué es: `UseDurableOutbox()` guarda el mensaje con el hecho y lo envía cuando el broker está. Agrégalo al final de la regla de `PlanDeEmpresaV1`, reinicia, detén el broker y da de alta emp-153 (NIT `915300000`).

**✅ Punto de control:** la cola mal escrita no deja arrancar a Notificaciones (`NOT_FOUND - no queue 'notificaciones.plane' in vhost '/'`); con el nombre bien, imprime `Correo a 915100000: tu plan ahora es Enterprise`. Con el inbox, tras la caída, `notificaciones.wolverine_incoming_envelopes` tiene los veinte en `Incoming`; al rearrancar sin `CAER` sale `Recovered … incoming envelopes from storage` y veinte correos, alguno repetido, y eso es lo esperado. Con el outbox y el broker detenido, `wolverine_outgoing_envelopes` da 1; al volver el broker, `Correo a 915300000: tu plan ahora es Basico` y la tabla vuelve a 0. Si alguien no llega: solución en el `<details>` de cada Paso.

**🔨 Rómpelo (si hay tiempo):** junto a la regla del exchange, agrega `opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitQueue("notificaciones.planes");`. El worker con `emp-151;Enterprise` produce el mismo correo dos veces. Quita esa regla: cada mensaje tiene una sola ruta, y la atadura la vuelve a declarar `topologia.sh`.

**Si se traban:**
- `inequivalent arg 'x-dead-letter-exchange'` → una cola existe sin ese argumento; borrarla con `rabbitmqadmin delete queue` y correr otra vez `topologia.sh`.
- Tras la caída no sale nada, ni con el inbox → el modo de Notificaciones no es `Solo`.
- Con `UseDurableOutbox`, el plan de emp-153 no llega → esperar en el log `RabbitMQ connection is recovered successfully`.

**Cierra con:** el broker guarda sus colas y nada más. La topología la crea la infraestructura, quien envía guarda antes de enviar, quien recibe guarda antes de confirmar, y cada mensaje va por un solo camino a un consumidor que tolera la repetición. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué la cola durable no salvó los correos? ¿Dónde estaba el plan de emp-153 con el broker caído, y por qué el de emp-152 no estaba en ninguna parte?"

**Puente:** "La pantalla de soporte todavía tiene que volver a pedir para enterarse. Ahora hacemos que se entere sola, y miramos qué pasa sin un host siempre vivo."

---

## 54 · En vivo y serverless  ·  ⏱ ~60 min  ·  [en-vivo-y-serverless.md](secciones/en-vivo-y-serverless.md)

**Para qué:** que una pantalla se entere sola (SSE) y solo de lo confirmado, con un contrato tipado en `Contratos`; y reconocer qué cambia en serverless, sin daemon ni outbox de fondo.

**Abre así (lo dices en voz alta):** "Una petición HTTP pregunta una vez y se va. ¿Y si la pantalla quiere enterarse sola en cuanto algo pasa? ¿Y si no hay un host que viva para siempre?"

**Haz sentir el dolor:** después del primer SSE (pasos 1 a 4), pon `FacturacionHandler.ConAcuerdoDePago.Add("904000000");` entre `builder.Build()` y `app.Run()`; esa línea se queda. Reinicia y da de alta emp-40 a emp-45. Con el `curl -N` abierto, suspende emp-40: llega `event: suspension` con `data: 904000000`. Unos segundos después, la ficha dice `"facturacion":"Rechazado","accesos":"Restituido","estado":"revertida"`. La pantalla avisó lo que se pidió, no lo que pasó.

**Dicta los pasos:**
1. 🆕 Di qué son: SSE es un servidor que empuja eventos por una conexión abierta (`text/event-stream`), y en .NET 10 es `TypedResults.ServerSentEvents` sobre un `IAsyncEnumerable`. Un `Channel<string>` es una cola en memoria: el productor escribe y el iterador lee con `ReadAllAsync`.
2. En `Empresas.Historia`, `public static class EnVivo` con un `Channel<string> Canal`. El productor es `EnVivoHandler.Handle(EmpresaSuspendidaV2 anuncio)`, que hace `EnVivo.Canal.Writer.TryWrite(anuncio.Nit)`. No va en `SuspenderHandler`, que corre antes del commit, ni en un `Apply`.
3. Consumidor: `GET /suspensiones/en-vivo` con `TypedResults.ServerSentEvents(Leer(ct), eventType: "suspension")`, y un `Leer` con `[EnumeratorCancellation]`.
4. `curl -N http://localhost:5000/suspensiones/en-vivo` y suspende emp-90: llega `data: 909000000`. (Aquí va el dolor de emp-40.)
5. Lo confirmado: en `Contratos`, `[MessageIdentity("empresas.suspension-efectiva.v1")] public record SuspensionEfectivaV1(string SuspensionId, string Nit);`. `ProcesoDeSuspensionHandler` lo devuelve cuando decide `SuspensionEfectiva`, con retorno `Task<OutgoingMessages>` en `Decidir` y en los cinco `Handle`; el `ILogger` y el descarte se conservan. `EnVivoHandler` escucha `SuspensionEfectivaV1`. Prueba emp-41 y emp-40.
6. Pantalla: `dotnet new console -o Pantalla` y `dotnet add Pantalla reference Contratos`. 🆕 Di qué es `SseParser.Create(stream).EnumerateAsync()`. Que peguen su `Program.cs`. Cierra el `curl -N`, porque el canal le da cada aviso a un solo lector. Corre `dotnet run --project Pantalla` y suspende emp-42.
7. Contrato tipado: la pantalla depende de un nombre de evento y de una forma de `data` que nadie le garantiza. Que vivan en `Contratos`: `public const string Tipo = "suspension-efectiva";` en el record, un `Channel<SuspensionEfectivaV1>`, `eventType: SuspensionEfectivaV1.Tipo`, y `Leer` que devuelve `IAsyncEnumerable<SuspensionEfectivaV1>`. En la pantalla, `JsonSerializer.Deserialize<SuspensionEfectivaV1>(item.Data, JsonSerializerOptions.Web)`. Prueba emp-44. Luego renombra `Nit` a `NitEmpresa`: la pantalla da `error CS1061`. Devuelve el nombre.
8. Serverless se explica, no se monta. Sin proceso de larga vida, las proyecciones van `Inline` y se publica con `SendInline`, que pierde la atomicidad del outbox. `ServerlessWithOutbox` necesita que alguien corra `RunDurabilityPassAsync`, y el plazo programado no vence solo.

**✅ Punto de control:** emp-41 da `data: 904100000`, y emp-40 no muestra nada y queda `revertida`. La pantalla imprime `NIT 904200000: suspendida`. Con el contrato tipado, imprime `NIT 904400000: suspendida`, y por la conexión viaja `event: suspension-efectiva` con `data: {"suspensionId":"susp-emp-44-2","nit":"904400000"}`. Si alguien no llega: solución en el `<details>` de cada reto.

**🔨 Rómpelo (si hay tiempo):** (a) El nombre que nadie fija, antes del contrato tipado: cambia el literal del endpoint a `"suspension-efectiva"`. Todo compila, emp-43 queda `efectiva` y la pantalla no muestra nada. (b) El empuje en la proyección: deja vacío el `Handle(SuspensionEfectivaV1)`, pon `EnVivo.Canal.Writer.TryWrite(e.StreamKey!);` en el `Apply(IEvent<SuspensionEfectiva> …)` del tablero y `await Vistas.Rearmar(app, "Tablero");`. Sin que nadie suspenda, llega un aviso por cada `suspension_efectiva` del diario. Deshazlo. (c) Sin daemon, ¿quién rearma? Pon las tres proyecciones `Inline` y `DaemonMode.Disabled`: `Rearmar` lanza `No service for type 'JasperFx.Events.Daemon.IProjectionCoordinator' has been registered`. Arréglalo pidiendo el coordinador con `GetService`, y pausa o reanuda solo si no es `null`. Al terminar, vuelve a `HotCold` con las dos `Async`, rearma las dos, y anota en `DECISIONES.md` quién rearma cada vista `Inline`.

**Si se traban:**
- El SSE no emite nada → mirar la ficha: con `esperando` o `revertida` no hay aviso. Si dice `efectiva`, falta devolver `SuspensionEfectivaV1` o escucharlo. Si llegan solo algunos, hay otro lector abierto.
- `ProcesoDeSuspensionHandler` no compila → el retorno es `Task<OutgoingMessages>` en `Decidir` y en los cinco `Handle`, con `using Wolverine;`.
- `SseParser` no compila → `using System.Net.ServerSentEvents;`; `JsonSerializer` pide `using System.Text.Json;`.

**Cierra con:** SSE avisa lo confirmado con un contrato tipado y desde el handler de ese contrato, nunca desde un `Apply`. Serverless cambia el daemon por proyecciones `Inline`, que alguien tiene que prever cómo rearmar, y el outbox por `SendInline`, que pierde la atomicidad. Commit con la reflexión: "¿por qué la pantalla escucha `SuspensionEfectivaV1` y no `EmpresaSuspendidaV2`? En serverless, ¿qué se pierde con `SendInline`, y quién rearma una vista `Inline`?"

**Puente:** "Todo lo que hicimos asume una sola organización. La plataforma la usan varias a la vez, y cada petición tiene que decir de cuál es."

---

## 55 · El contexto que falta  ·  ⏱ ~50 min  ·  [el-contexto-que-falta.md](secciones/el-contexto-que-falta.md)

**Para qué:** que el servicio atienda a dos organizaciones (tenants) en la misma base, cada una con sus empresas, y que una petición sin tenant falle en vez de caer en un valor por defecto.

**Abre así (lo dices en voz alta):** "Llega globex, otro despacho contable. Vidriería Andina, NIT 916000000, es cliente de acme y también de globex. ¿Qué pasa cuando los dos la registran?"

**Haz sentir el dolor:** registra emp-160 (NIT `916000000`, Basico): 202. Registra emp-161 con el mismo NIT, en Premium: 409 y `Ya existe una empresa con ese NIT.`. `curl http://localhost:5000/empresas/emp-160` le muestra a globex la ficha de acme. Aclara los niveles: una `Empresa` es un stream; un tenant es la organización que usa la plataforma. El 409 viene de la llave del localizador, y un filtro en las consultas no arregla una llave.

**Dicta los pasos:**
1. 🆕 Di qué es: la tenancy conjoined. `opts.Events.TenancyStyle = TenancyStyle.Conjoined;` (de `JasperFx.MultiTenancy`) y `opts.Policies.AllDocumentsAreMultiTenanted();` ponen el tenant en la llave, que pasa a ser `(tenant_id, id)`.
2. Base nueva, porque Marten no cambia la llave de tablas existentes. Proyecta los cuatro `docker exec`: crear `empresas`, recrear `empresas_tests` y copiar a las dos las tablas de Facturación con `pg_dump`. Apunta `CADENA_POSTGRES`, los user-secrets (`--project Empresas.Historia`) y `~/secretos-empresas/ConnectionStrings__Postgres` a `Database=empresas`. Si usan CosmosLens, con la cadena nueva.
3. Agrega las dos líneas después de `StreamIdentity` en `AgregarEmpresas`, y registra emp-160: `SELECT tenant_id, id FROM mt_streams;` da `*DEFAULT* | emp-160`.
4. 🆕 Di qué es: el bus lleva un `TenantId`, que Wolverine copia al sobre y usa para abrir la sesión del handler. En el `app.Use` de la correlación, lee `X-Tenant-Id` y ponlo en `bus.TenantId`. Repite los dos registros con `-H "X-Tenant-Id: acme"` y `-H "X-Tenant-Id: globex"`: los dos dan 202.
5. El GET de emp-161 como globex da 404. 🆕 Di qué es: tu propia `IQuerySession`. Después de `AgregarEmpresas`, `builder.Services.AddScoped<IQuerySession>(…)` con `QuerySession(…TenantId!)` del `IMessageContext`.
6. El default silencioso: consulta `mt_streams WHERE id LIKE 'emp-16%'`. Hay una fila `*DEFAULT* | emp-160` que nadie ve. Registra emp-162 sin header: 202, y cae en `*DEFAULT*`.
7. 🆕 Di qué es: fail-fast. `opts.Advanced.DefaultTenantUsageEnabled = false;` junto a la tenancy. emp-163 sin header da 500 con `Default tenant *DEFAULT* usage is disabled…`, y en `mt_streams` no hay nada. Desde aquí, las siembras usan `store.LightweightSession("acme")`.
8. El worker lanza lo mismo. 🆕 Di qué es `bus.InvokeForTenantAsync(tenant, comando)`. El tenant entra como `args[1]`: `DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv acme`, con `emp-160;Premium`.
9. Suspende emp-160 como acme y muestra `SELECT tenant_id, type FROM mt_events WHERE stream_id = 'susp-emp-160-3' ORDER BY version;`: todo en `acme`. Diez segundos después corre el plazo, sin dead letters.

**✅ Punto de control:** `GET /empresas/emp-161` con `X-Tenant-Id: globex` da 200 (Vidriería Andina, Premium), y emp-160 como globex da 404. Un registro sin header da 500 y no deja nada. El worker imprime `emp-160: plan Premium`, y `curl -H "X-Tenant-Id: acme" http://localhost:5000/empresas/emp-160` dice `Premium`. Si alguien no llega: solución en el `<details>` de cada Paso.

**🔨 Rómpelo (si hay tiempo):** (a) En `MapPost("/empresas", …)`, usa `bus.InvokeForTenantAsync("globex", cmd)` y registra emp-164 (NIT `916400000`) con `X-Tenant-Id: acme`: da 202 y su `tenant_id` es `globex`. Gana el tenant del sobre. Devuelve el `InvokeAsync`. (b) Comenta `AllDocumentsAreMultiTenanted()`: no arranca, con `Tenancy storage style mismatch between the events (Conjoined) and the aggregate type VistaSuspendida (Single)`. Descoméntala.

**Si se traban:**
- `MartenSchemaException: DDL Execution … Failed!` con `42710` → el servicio sigue en la base vieja; revisar `dotnet user-secrets list --project Empresas.Historia`.
- Todo da 500 `Default tenant *DEFAULT* usage is disabled`, también con el header → el `app.Use` no pone `bus.TenantId`, o la `IQuerySession` no lo lee del bus.
- Con el header, globex sigue sin ver su empresa → la `IQuerySession` va antes de `AgregarEmpresas` y gana la de Marten.

**Cierra con:** un tenant que falta y se rellena por defecto deja datos en la organización equivocada sin error. La cura es la tenancy conjoined más fail-fast, con el tenant puesto una vez en el borde y llevado por el sobre. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué un tenant que se rellena por defecto es más peligroso que uno que lanza? ¿Por qué el handler del plazo toma el tenant del sobre?"

**Puente:** "`HostConDaemon` ya arranca con tenancy y fail-fast sin que lo tocáramos. ¿Siguen verdes los tests? ¿Alguno prueba que acme no ve lo de globex?"

---

## 56 · Probar que aísla  ·  ⏱ ~35 min  ·  [probar-que-aisla.md](secciones/probar-que-aisla.md)

**Para qué:** que los tests corran con un tenant, como el servicio, y que uno se ponga en rojo si un cambio deja que un tenant vea lo de otro.

**Abre así (lo dices en voz alta):** "El servicio ya separa a acme de globex. ¿Cómo sabremos que un cambio de mañana no rompe esa separación?"

**Haz sentir el dolor:** `dotnet test` con `CADENA_POSTGRES` fijada. Caen cinco tests de la colección `"daemon"` (`CarreraDelPagoTests`, `RearmarTests`, `ReservaDelNitTests` y dos de `VistaSuspendidaTests`) con `Marten.Exceptions.DefaultTenantUsageDisabledException : Default tenant *DEFAULT* usage is disabled. …`. Advierte: prender el tenant por defecto solo en el fixture nos devuelve a la copia de §51.

**Dicta los pasos:**
1. En los cuatro archivos de la colección `"daemon"`: `daemon.Store.LightweightSession("acme")`, `daemon.Bus.InvokeForTenantAsync("acme", …)`, y `"acme"` en cada `QuerySession()`. `dotnet test`: todo en verde.
2. Avisa: en esta sección solo se corre `dotnet test`. No arranquen el servicio hasta devolver `AgregarEmpresas` como estaba.
3. La fuga: en `AgregarEmpresas`, cambia `AllDocumentsAreMultiTenanted()` por tres líneas, `opts.Schema.For<VistaSuspendida>().MultiTenanted();` y las de `EmpresaDetalle` y `Tablero`. `dotnet test` sigue en verde, pero `\d mt_doc_localizador` en `empresas_tests` muestra `PRIMARY KEY, btree (id)`. El localizador perdió el tenant.
4. Test `DosTenantsTests` en la colección `"daemon"`, con el mismo `InitializeAsync` y `DisposeAsync`. Registra por el bus emp-165 en acme y emp-166 en globex, las dos con NIT `916500000`.
5. Con `QuerySession("globex")`, afirma dos cosas: `LoadAsync<Localizador>("916500000")` lleva a `emp-166`, y `Events.FetchStreamStateAsync("emp-165")` es `null`.
6. Córrelo con la fuga puesta: cae. Devuelve `AllDocumentsAreMultiTenanted()`.

**✅ Punto de control:** con la fuga, `DosTenantsTests` cae con `JasperFx.DocumentAlreadyExistsException : Document already exists Localizador: 916500000`. Sin la fuga pasa todo, `DosTenantsTests` incluido, y `\d mt_doc_localizador` muestra `PRIMARY KEY, btree (tenant_id, id)`. Si alguien no llega: solución en el `<details>` del Paso 2.

**🔨 Rómpelo (si hay tiempo):** agrega `opts.Schema.For<EmpresaDetalle>().UniqueIndex(d => d.Nit);` al `AddMarten` de `AgregarEmpresas` y corre `dotnet test --filter DosTenantsTests`: cae con `Document already exists EmpresaDetalle: emp-166` y `23505 … "mt_doc_empresadetalle_uidx_nit"`. 🆕 Di qué es el índice por tenant: `UniqueIndex(UniqueIndexType.Computed, "uq_empresadetalle_nit", TenancyScope.PerTenant, d => d.Nit)` (`using Marten.Schema;` y `using Marten.Schema.Indexing.Unique;`). Pasan todos. Quita la línea al terminar.

**Si se traban:**
- Un test sigue con `DefaultTenantUsageDisabledException` → quedó una sesión o un `InvokeAsync` sin tenant (el que más se olvida es el `Registrar` de `ReservaDelNitTests`); buscarlos con `grep -n "Session()\|Bus.InvokeAsync" Empresas.Tests/*.cs`.
- `DosTenantsTests` pasa con la fuga → el fixture no arranca con `AgregarEmpresas`.
- El servicio no arranca con `could not create unique index` → arrancó con el índice de todos; quitarlo.

**Cierra con:** la separación entre tenants solo se prueba con dos tenants que comparten un dato, corriendo con la configuración del servicio; toda reserva de un dato es por tenant. Que dejen la decisión en `DECISIONES.md`. Commit con la reflexión: "¿por qué tus tests pasaron con el localizador sin tenant? ¿Qué otro dato reservarías por tenant, y cómo lo probarías?"

**Puente:** "El tenant llega en `X-Tenant-Id`, y ese header lo escribe quien llama. Nada impide que quien llama por acme ponga `globex`."

---

## 57 · El tenant viene firmado  ·  ⏱ ~75 min  ·  [el-tenant-viene-firmado.md](secciones/el-tenant-viene-firmado.md)

**Para qué:** que el tenant y el usuario salgan de un token que el servicio verifica, que toda ruta exija ese token, y que cada pantalla en vivo vea solo lo de su organización.

**Abre así (lo dices en voz alta):** "Hoy el tenant lo elige quien llama: le basta escribir un header. ¿Qué impide que alguien de acme escriba `globex`?"

**Haz sentir el dolor:** corre en pantalla `curl -H "X-Tenant-Id: globex" http://localhost:5000/empresas/emp-161`. Sale `{"id":"emp-161","nombre":"Vidriería Andina","plan":"Premium",…}`: lees la ficha de globex sin decir quién eres.

**Dicta los pasos:**
1. 🆕 Di qué es un JWT: un token firmado que va en `Authorization: Bearer …`. Lleva *claims* (`sub` es el id del usuario, y `tenant` el que le agregas). Si alguien cambia un claim, la firma ya no coincide.
2. Desde la raíz, que corran `dotnet add Empresas.Historia package Microsoft.AspNetCore.Authentication.JwtBearer` y `echo "{}" > Empresas.Historia/appsettings.Development.json`.
3. Que creen el token de acme: `dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0001 --claim tenant=acme --claim email=ana@acme.co --output token > ~/acme.jwt`. El de globex es igual, con `--name u-0002 --claim tenant=globex --claim email=gus@globex.co`, en `~/globex.jwt`. Proyecta los comandos. En cada terminal donde los usen: `ACME=$(cat ~/acme.jwt); GLOBEX=$(cat ~/globex.jwt)`.
4. En `Program.cs`: `builder.Services.AddAuthentication().AddJwtBearer()` antes de `builder.Build()`, y `app.UseAuthentication()` antes de su `app.Use`. Dentro del `app.Use`, el tenant sale de `contexto.User.FindFirst("tenant")?.Value`, no del header.
5. Muéstrales el token falsificado, con los claims de globex y la firma de acme: `FALSO=$(echo $ACME | cut -d. -f1).$(echo $GLOBEX | cut -d. -f2).$(echo $ACME | cut -d. -f3)`. Con él, emp-161 da `500`, y el log dice `IDX10517: Signature validation failed`.
6. Segundo dolor. Sin token, abre `curl -N http://localhost:5000/suspensiones/en-vivo` y suspende emp-161 con `$GLOBEX`: el anónimo ve `event: suspension-efectiva`.
7. 🆕 Di qué es una política por defecto: la regla de toda ruta que no diga otra. Que la registren antes de `builder.Build()` con `builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().RequireClaim("tenant").RequireClaim("sub").Build())` (`using Microsoft.AspNetCore.Authorization;`), y que pongan `app.UseAuthorization()` después de su `app.Use`. Con el token de acme verán `403`.
8. Explica que `AddJwtBearer` renombra `sub`, y que lo arreglen con `AddJwtBearer(o => o.MapInboundClaims = false)`. Que creen un token sin tenant: `SIN=$(dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0009 --output token)`.
9. La `Pantalla` necesita el token: en su `Program.cs`, después de crear el `HttpClient`, `http.DefaultRequestHeaders.Authorization = new("Bearer", args[0]);`. Se corre con `dotnet run --project Pantalla -- $ACME`.
10. Tercer dolor. Con la pantalla de acme abierta, globex registra y suspende emp-171 (NIT 917100000), y la pantalla de acme imprime `NIT 917100000: suspendida`.
11. 🆕 Di qué es un canal por tenant: un `ConcurrentDictionary` con `GetOrAdd(tenant, …)`. En `EnVivo`, que hagan `De(string? tenant)`, que lanza si `tenant.IsDefaultTenant()`. `EnVivoHandler` recibe el `IMessageContext` y escribe en `EnVivo.De(mensaje.TenantId)`. El endpoint recibe el `ClaimsPrincipal` y lee el canal del claim `tenant`.
12. Que abran una segunda pantalla con `$GLOBEX`, y que registren y suspendan emp-173 con acme (917300000) y emp-174 con globex (917400000).
13. En `AgregarEmpresas`, que agreguen `opts.EnableRelayOfUserName = true;` en `AddWolverine` y `opts.Events.MetadataConfig.UserNameEnabled = true;` en `AddMarten`. En su `app.Use`, `bus.UserName` toma el claim `sub`. Que reinicien, y registren y suspendan emp-175 con `$ACME` y `-H "X-Correlation-Id: soporte-175"`.
14. Ana cambia de email: crean otro token de acme con `--name u-0001` y `--claim email=ana.perez@acme.co`, y registran emp-177 (NIT 917700000).

**✅ Punto de control:** con `$ACME` y `-H "X-Tenant-Id: globex"`, emp-161 da `404`, y con `$GLOBEX` da la ficha. Sin token, toda ruta da `401`, también la pantalla. Con el token `SIN` (sin tenant) da `403`. `SELECT stream_id, tenant_id, user_name, type FROM mt_events WHERE correlation_id = 'soporte-175' ORDER BY seq_id;` muestra `acme | u-0001` en emp-175 y en `susp-emp-175-2`. `WHERE user_name = 'u-0001'` trae emp-175 y emp-177. Si alguien no llega: solución en el `<details>` del Paso 1 o del Paso 3.

**🔨 Rómpelo (si hay tiempo):** el endpoint recibe un `string grupo` de la query string y lee `EnVivo.De(grupo)`. Que cierren las dos pantallas y abran `curl -N -H "Authorization: Bearer $ACME" "http://localhost:5000/suspensiones/en-vivo?grupo=globex"`. Globex registra y suspende emp-176 (917600000), y el token de acme oye a globex. Que le devuelvan el claim.

**Si se traban:**
- `Could not determine the project's URL` → falta `--audience empresas`. `Could not find file … appsettings.Development.json` → crea el archivo con `{}`.
- Todo da `401` con token y el log dice `The signature key was not found` → arranca con `ASPNETCORE_ENVIRONMENT=Development dotnet run`, desde `Empresas.Historia`.
- Con token, todo da `403` → falta `MapInboundClaims = false`.
- `user_name` sale vacío en los hechos del proceso → falta `EnableRelayOfUserName = true`.

**Cierra con:** el tenant decide qué datos ve una petición, así que sale de un claim firmado. Toda ruta exige token, y abrir una se hace a propósito. La historia guarda el `sub`, que no cambia. Commit con la reflexión: "¿por qué el tenant no puede salir de un header, aunque solo lo mande tu pantalla? ¿Qué ruta dejarías abierta, y cómo evitas abrir otra sin querer?"

**Puente:** cada pedido trae su tenant firmado, pero ningún pedido trae el cobro del mes: hoy nadie llama a `ProcesoMensual`.

---

## 58 · El trabajo que nadie pidió  ·  ⏱ ~60 min  ·  [el-trabajo-que-nadie-pidio.md](secciones/el-trabajo-que-nadie-pidio.md)

**Para qué:** que el cobro del mes corra solo y una sola vez en todo el clúster, que un mes que falla no detenga los siguientes, y que la próxima vuelta se vea en la base.

**Abre así (lo dices en voz alta):** "Un compañero hizo recurrente el cobro: cobra el mes y, al terminar, programa la vuelta siguiente. ¿Qué pasa el día que un mes falla?"

**Haz sentir el dolor:**
- 🆕 Di qué es un servicio de fondo: un `BackgroundService` corre su `ExecuteAsync` al arrancar el host, y `CreateScope()` da un bus fuera de una petición.
- Proyecta el código del compañero y que lo peguen tal cual: `Facturacion/CobroDelMes.cs` (`CobrarElMes`, `CobroDelMesHandler`, `PrimeraVuelta`), el método `Nits` dentro de `Planes`, en `Facturacion/Planes.cs`, y `builder.Services.AddHostedService<PrimeraVuelta>();` al final de `AgregarEmpresas`. Al arrancar, el log dice `Mes 2026-10-18 05:14:48: cobrado` cada 10 segundos, con otras horas.
- Que renombren la tabla con `docker exec empresas-db psql -U postgres -d empresas -c "ALTER TABLE mensualidades RENAME TO mensualidades_caida;"`, esperen 15 segundos y le devuelvan el nombre (`… RENAME TO mensualidades;`). El log dice `42P01: relation "mensualidades" does not exist` y `(CobrarElMes) … was moved to the error queue`.
- No sale ningún mes más, y `wolverine_incoming_envelopes` no tiene ningún `CobrarElMes` en `Scheduled`.
- Que reinicien el servicio, arranquen la copia del 5001 (`ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5001`, desde `Empresas.Historia`) y corran el worker con `emp-177;Premium` y `acme`. El `count(*)` de `CobrarElMes` en `Scheduled` da `3`: hay tres cadenas, y cada empresa paga tres mensualidades cada 10 segundos.

**Dicta los pasos:**
1. El disparo, aparte del trabajo. En `Facturacion/CobroDelMes.cs`, que declaren `DisparoMensual(DateTimeOffset Mes)` y su handler. Devuelve un `OutgoingMessages` con el `CobrarElMes` de ese mes y el `DisparoMensual` siguiente `.DelayedFor(10.Seconds())`.
2. `CobroDelMesHandler` ya no devuelve nada, y `PrimeraVuelta` publica un `DisparoMensual`.
3. Detienen las dos copias, arrancan solo la del 5000 y renombran la tabla otra vez: el mes que falló va a dead letters y el siguiente sale `cobrado`. Si arrancan el 5001, el `count(*)` de `DisparoMensual` da 2: cada arranque suma un disparo.
4. 🆕 Di qué es un mensaje recurrente: `opts.Schedules.ScheduleRecurring("cobro-mensual", "*/10 * * * * *", ocurrencia => new CobrarElMes(ocurrencia))`, en `AddWolverine`. El cron tiene seis campos y el primero son los segundos. Lo corre un agente en una sola copia, que lo anota en `wolverine_recurring_messages`.
5. Avisa dos límites: no acepta menos de 5 segundos entre ocurrencias, y la primera llega unos 20 segundos después de arrancar.
6. Que registren el cron, que borren `DisparoMensual`, su handler, `PrimeraVuelta` y su `AddHostedService`, y que detengan y arranquen las dos copias.

**✅ Punto de control:** con las dos copias y después de correr el worker, `SELECT count(*) FROM wolverine_incoming_envelopes WHERE status = 'Scheduled' AND message_type = 'CobrarElMes';` da `1`, y `SELECT schedule_name, next_occurrence FROM wolverine_recurring_messages;` da `cobro-mensual` con la próxima vuelta. Sale un `cobrado` cada 10 segundos, en segundos redondos (`…:10`, `…:20`), en el log de una sola copia. Si detienen esa copia, sigue la otra. Avísales que antes verán `No known handler for DisparoMensual`: es normal. Si alguien no llega: solución en el `<details>` del Paso 2.

**🔨 Rómpelo (si hay tiempo):** detienen las dos copias, esperan 30 segundos y las arrancan otra vez. Medio minuto después corren `SELECT DISTINCT periodo FROM mensualidades ORDER BY periodo DESC LIMIT 5;`, y faltan meses: el cron no rellena lo que se perdió. Pregúntales qué harían si el negocio no puede perder un mes: cobrar todo mes pendiente, o vigilar los huecos.

**Si se traban:**
- Con el cron no sale ningún `cobrado` → espera unos 20 segundos tras arrancar.
- `ArgumentException: '*/2 * * * * *' fires more often than every 5 seconds` → el cron pide 5 segundos o más entre ocurrencias.
- Todo cobro lanza `42P01 … mensualidades` → falta `ALTER TABLE mensualidades_caida RENAME TO mensualidades;`.
- El worker lanza `ReglaDeNegocioException` → esa empresa está suspendida; emp-177 no.

**Cierra con:** un trabajo que se reprograma al terminar muere en su primer fallo. El disparo va aparte del trabajo, y un cron con un agente único en el clúster no se duplica con copias ni con reinicios. Ese cron tampoco rellena lo perdido. Commit con la reflexión: "¿por qué el mes que falló se llevó a los siguientes en la cadena del compañero, y no en la tuya? ¿Qué trabajo tuyo corre solo, y qué pasa si falla una vez?"

**Puente:** el cobro corre sin pedido, y por eso sin tenant: el sobre del cron no dice de qué organización es, y acme y globex pueden tener el mismo NIT.

---

## 59 · El cobro de cada tenant  ·  ⏱ ~55 min  ·  [el-cobro-de-cada-tenant.md](secciones/el-cobro-de-cada-tenant.md)

**Para qué:** que el cobro de cada mes corra una vez por organización, con sus empresas y sus planes, y que las tablas SQL de Facturación separen a las organizaciones como Marten.

**Abre así (lo dices en voz alta):** "Ferretería del Valle es cliente de acme con Basico y de globex con Premium, con el mismo NIT. Empresas guarda dos empresas. ¿Cuántas filas guarda Facturación?"

**Haz sentir el dolor:** con las dos copias corriendo, que registren emp-180 (NIT 918000000) con `$ACME` (Basico) y con `$GLOBEX` (Premium), y que la suspendan con los dos tokens. `SELECT * FROM plan_de_empresa WHERE nit = '918000000';` da una sola fila, `918000000 | Basico | 1`. `multas` tiene una sola multa, `susp-emp-180-2`. Ningún error lo dice, y el Premium de globex nunca se cobra.

**Dicta los pasos:**
1. Que detengan las dos copias y corran el `for base in empresas empresas_tests; do docker exec … done` de la sección: recrea `plan_de_empresa` con `PRIMARY KEY (tenant, nit)` y le pone a `multas` la columna `tenant` con `UNIQUE (tenant, suspension_id)`. Proyéctalo. En PowerShell es `foreach ($base in "empresas", "empresas_tests") { … }`.
2. En `Facturacion/Organizacion.cs`, una clase `static` `Organizacion` con `De(IMessageBus bus)`: devuelve `bus.TenantId`, o lanza `Un trabajo sin tenant no es de nadie.` si `IsDefaultTenant()`.
3. `PlanesHandler` recibe el bus y le pasa el tenant a `Guardar`. `Guardar` lo pone en la fila y en `ON CONFLICT (tenant, nit)`. `Planes.De` lo usa en su `WHERE` y al llamar a `Guardar`. El `Handle` de `CobrarMultaV1` lo pone en la multa y en `ON CONFLICT (tenant, suspension_id)`.
4. Que arranquen las dos copias, y que registren emp-182 (918200000) con Basico en acme y con Premium en globex, y la suspendan en las dos.
5. Muestra que el cobro dejó de cobrar: `SELECT exception_message FROM wolverine_dead_letters WHERE message_type = 'CobrarElMes' ORDER BY sent_at DESC LIMIT 1;` da `Un trabajo sin tenant no es de nadie.`
6. 🆕 Di qué hace `WithTenantId`: `new CobrarElMes(d.Mes).WithTenantId("acme")` le pone el tenant al sobre. Que agreguen `Planes.Tenants(config)` con `SELECT DISTINCT tenant`, y que vuelva `DisparoMensual`: el cron lo manda (en el `ScheduleRecurring` de `AgregarEmpresas`, `ocurrencia => new DisparoMensual(ocurrencia)`), y su handler devuelve un `CobrarElMes` por tenant.
7. Los logs de `CobroDelMesHandler` y de `MensualidadHandler` dicen el `bus.TenantId` (`"Mensualidad {Nit} de {Tenant}: {Plan}"`). `MensualidadHandler` recibe el bus y un `ILogger`.
8. Muestra el log: globex dice `cobrado` y no tiene ninguna `Mensualidad`, porque chocó con la reserva de acme. Que detengan las copias y recreen `mensualidades` con `PRIMARY KEY (tenant, nit, periodo)`, en las dos bases, con el `for` del Paso 3 de la sección.
9. `Nits(config, tenant)` filtra con `WHERE tenant = @tenant`, y la reserva de `Correr` lleva el tenant en la fila y en el `ON CONFLICT`. Que arranquen las dos copias.

**✅ Punto de control:** tras el paso 4, `plan_de_empresa` tiene `acme | 918200000 | Basico` y `globex | 918200000 | Premium`, y `multas` tiene `susp-emp-182-2` por 50000 en acme y por 100000 en globex. Al final, el log dice cada mes `Mensualidad 918200000 de acme: Basico` y `Mensualidad 918200000 de globex: Premium`. Si alguien no llega: solución en el `<details>` del Paso 1, 2 o 3.

**🔨 Rómpelo (si hay tiempo):** que dejen `Organizacion.De` sin `throw` (`=> bus.TenantId!;`) y quiten el `.WithTenantId(tenant)` del disparo. Al reiniciar, el log dice dos veces `Mes … de *DEFAULT*: cobrado` y no sale ninguna `Mensualidad`: nadie pagó, y no hubo error. Que devuelvan las dos cosas.

**Si se traban:**
- `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification` → la llave de la tabla y el `ON CONFLICT` no nombran las mismas columnas.
- `23502: null value in column "tenant"` → una escritura todavía no pone el tenant.
- El log no dice ningún `cobrado` → la réplica quedó vacía al recrearla. Registren empresas, o cambien planes con el worker.

**Cierra con:** un trabajo que nadie pidió no trae tenant. Su disparo recorre las organizaciones y manda uno por cada una con `WithTenantId`. Lo que toca datos de una organización toma el tenant del sobre, o lanza. Y toda llave que nace de un dato de otro contexto lleva el tenant. Commit con la reflexión: "si el `SuspensionId` fuera un `Guid`, ¿quitarías el tenant de la llave de `multas`? ¿Quién decide cómo se arma ese id?"

**Puente:** para saber si el cobro tenía próxima vuelta, o qué mes falló, leyeron tablas de Wolverine. Todo el estado del servicio vive en tablas como esas, y se puede leer desde afuera.

---

## 60 · Observar el motor nuevo  ·  ⏱ ~45 min  ·  [observar-el-motor-nuevo.md](secciones/observar-el-motor-nuevo.md)

**Para qué:** responder preguntas de operación leyendo las tablas de Marten y Wolverine en solo lectura, sin tocar la app, y comprobar en la base que existe lo que declararon en la configuración.

**Abre así (lo dices en voz alta):** "Operaciones pregunta por qué la vista va atrasada. No pueden meterle un `Console.WriteLine` a Marten. ¿En qué tabla vive el rezago?"

**Haz sentir el dolor:** deja la pregunta abierta un minuto. Casi nadie sabrá en qué tabla está. Después abre en pantalla una sesión de `psql` contra la base del servicio (`docker exec -it empresas-db psql -U postgres -d empresas`) y empieza con `SET default_transaction_read_only = on;`.

**Dicta los pasos:**
1. 🆕 Di qué es observar sin agente (*agentless*): el estado del motor vive en `mt_streams`, `mt_events`, `mt_event_progression`, `wolverine_dead_letters` y `wolverine_recurring_messages`, y se lee solo con consultas. ⚠️ Di por qué solo lectura: un `UPDATE` a `mt_event_progression` mueve el checkpoint del daemon, y un `INSERT` en `mt_events` mete un hecho que nadie decidió.
2. Dicta las cinco preguntas una a una, y deja que escriban cada consulta: (1) qué streams crecen (`mt_streams` por `version`); (2) cuánto rezago hay (`max(seq_id)` de `mt_events` menos el `last_seq_id` de `VistaSuspendida:All`); (3) qué se escribe (hechos por `type`); (4) qué falló (`wolverine_dead_letters`); (5) si hay próxima vuelta (`next_occurrence` de `cobro-mensual`).
3. 🆕 Di qué hace `Duplicate`: copia `Estado` a una columna `estado` con su índice. Di también qué son `pg_indexes` y `EXPLAIN`, y que `SET enable_seqscan = off;` hace que Postgres use un índice si tiene uno que sirva. Que agreguen en `Program.cs` `app.MapGet("/tablero", (string estado, IQuerySession s) => …)` filtrando por `t.Estado == estado`.
4. Que midan antes. Con `EXPLAIN (COSTS OFF)` sobre `d.data ->> 'Estado' = 'efectiva'`, sale `Filter: ((data ->> 'Estado'::text) = 'efectiva'::text)`. Luego declaran `opts.Schema.For<Tablero>().Duplicate(t => t.Estado);` en `AgregarEmpresas`, reinician, llaman el endpoint una vez y miden después.

**✅ Punto de control:** `curl -H "Authorization: Bearer $ACME" "http://localhost:5000/tablero?estado=efectiva"` da `[{"id":"emp-160",…,"estado":"efectiva"}, …]`. `pg_indexes` muestra `mt_doc_tablero_idx_estado`. El `EXPLAIN` por `d.estado` da `Index Scan using mt_doc_tablero_idx_estado` con `Index Cond: ((estado)::text = 'efectiva'::text)`. Si alguien no llega: solución en el `<details>` del Paso 1 (SQL) y del Paso 2.

**🔨 Rómpelo (si hay tiempo):** que pasen la línea `Duplicate` a un `Indices.Registrar(StoreOptions opts)` que nadie llama, y que reinicien. El endpoint responde igual, pero `pg_indexes` ya no tiene el índice, y el `EXPLAIN` por la columna da `ERROR:  column d.estado does not exist`. Marten quitó la columna y el índice. Que lo llamen desde `AddMarten`, o devuelvan la línea, y comprueben que el índice volvió.

**Si se traban:**
- La consulta (2) no devuelve filas → el `name` es `VistaSuspendida:All`. Lístalos con `SELECT name FROM mt_event_progression`.
- `EXPLAIN` dice `Seq Scan` aunque el índice existe → falta `SET enable_seqscan = off;` en esa sesión.
- El índice no aparece, o sale `column d.estado does not exist` fuera del 🔨 → llama el endpoint una vez: Marten cambia el esquema la primera vez que el servicio usa el `Tablero`.
- `/tablero` responde `401`, o `500` con `Required parameter "string estado" was not provided from query string` → falta el token, o `?estado=…`.

**Cierra con:** el estado del motor vive en tablas que se leen en solo lectura, sin instrumentar la app. Son las consultas que corre CosmosLens: su panel de rezago es la (2), sus dead letters la (4) y su lista de streams la (1). Lo declarado se comprueba con `pg_indexes` y `EXPLAIN`. Commit con la reflexión: "tres preguntas de operación, con su tabla y su columna. ¿Por qué la solo lectura es parte de observar? ¿Qué te dice `pg_indexes` que tu configuración no te dice?"

**Puente:** la consulta (2) responde solo cuando alguien la corre. La siguiente sección la pone dentro del servicio, para que avise solo.

---

## 61 · Que el servicio avise  ·  ⏱ ~35 min  ·  [que-el-servicio-avise.md](secciones/que-el-servicio-avise.md)

**Para qué:** que el servicio mismo avise en `/healthz` cuando el rezago del daemon pasa de un límite que ellos declaran.

**Abre así (lo dices en voz alta):** "Si el daemon se detiene de madrugada, el servicio sigue respondiendo 200 a cada comando. ¿Quién se entera, y cuándo?"

**Haz sentir el dolor:** recuerda que la consulta (2) y CosmosLens responden solo cuando alguien mira. El dolor se ve en vivo en el Paso 2, con el daemon apagado: ahí es donde el aviso demuestra que sirve.

**Dicta los pasos:**
1. 🆕 Di qué es un health check: una comprobación que el servicio corre cada vez que alguien pide su estado. `AddHealthChecks()` las registra, `.AddCheck("nombre", check)` agrega una, y `app.MapHealthChecks("/healthz")` publica la ruta. Un check implementa `IHealthCheck` y devuelve `Healthy`, `Degraded` o `Unhealthy`. Con `Healthy` y `Degraded` la ruta da 200, y con `Unhealthy` da 503.
2. Que escriban `Empresas.Historia/RezagoDelDaemon.cs`: un `IHealthCheck` con constructor primario `(string cadena, long umbral)`. Corre la consulta (2) con Npgsql async (`OpenAsync`, `ExecuteScalarAsync`), con `coalesce` por si la proyección no tiene fila, y devuelve `Degraded` si el rezago pasa del umbral.
3. En `Program.cs`, después de `AgregarEmpresas`: la cadena sale de `builder.Configuration.GetConnectionString("Postgres")`, el check se registra con `AddHealthChecks().AddCheck("rezago", new RezagoDelDaemon(cadena, umbral: 10))`, y la ruta se publica con `app.MapHealthChecks("/healthz").AllowAnonymous()`. Va abierta porque el monitor de la plataforma no tiene token.
4. Pregunta al grupo: ¿por qué `Degraded` y no `Unhealthy`? Porque las decisiones leen el diario, no la vista. Con un 503, el balanceador sacaría del tráfico un servicio que sí puede trabajar.
5. **Paso 2:** que dejen corriendo el monitor: `while true; do curl -s http://localhost:5000/healthz; echo; sleep 5; done`.
6. Llaman `AgregarEmpresas` con `DaemonMode.Disabled` y siembran en acme emp-30 (903000000, Basico), emp-31 (903100000, Premium) y emp-32 (903200000, Basico). Suspenden las tres. La (2) da un rezago de `18`, el monitor pasa a `Degraded`, y el log dice `… 'VistaSuspendida va 18 hechos atrás (umbral: 10)'`. Quitan la siembra.
7. Vuelven a `DaemonMode.HotCold` y el monitor vuelve a `Healthy`.

**✅ Punto de control:** con el daemon al día, `curl http://localhost:5000/healthz`, sin token, responde `Healthy`; con el daemon apagado y la vista 18 hechos atrás, el monitor escribe `Degraded`. Si alguien no llega: solución en el `<details>` del Paso 1.

**🔨 Rómpelo (si hay tiempo):** en el Paso 2, antes de volver a `HotCold`: sin el check. Comentan `.AddCheck(...)`, cierran `AddHealthChecks()` con `;` y reinician con el daemon apagado. `/healthz` dice `Healthy`, aunque la vista va 18 hechos atrás. Lo descomentan, reinician y vuelve `Degraded`.

**Si se traban:**
- `IHealthCheck` no compila → `using Microsoft.Extensions.Diagnostics.HealthChecks;`.
- `/healthz` dice `Degraded` con el daemon al día → el `name` no está en `mt_event_progression`. Lístalos con `SELECT name FROM mt_event_progression`.
- `/healthz` responde `404` o `401` → falta `MapHealthChecks("/healthz")`, o su `.AllowAnonymous()`.
- La siembra hace que el cobro lance `KeyNotFoundException` → el plan no está escrito como en la tarifa de Facturación (`Basico`, sin tilde).

**Cierra con:** un health check pone la consulta del rezago dentro del servicio. Responde `Degraded` sobre el umbral declarado sin que nadie mire, y el servicio sigue en el tráfico. Commit con la reflexión: "¿qué te avisa `/healthz` que tus consultas no? ¿Por qué `Degraded` y no `Unhealthy`? ¿Por qué responde sin token?"

**Puente:** el rezago mide lo que le falta a la vista. La consulta (1) mide el largo de cada stream, pero no lo que ese largo le cuesta a cada comando.

---

## 62 · El stream que no para de crecer  ·  ⏱ ~60 min  ·  [el-stream-que-no-para-de-crecer.md](secciones/el-stream-que-no-para-de-crecer.md)

**Para qué:** que cargar una empresa con veinte mil hechos cueste lo mismo que cargar una con tres. Marten guarda la empresa ya calculada con cada hecho, y los handlers la leen de ahí.

**Abre así (lo dices en voz alta):** "Una distribuidora recibe decenas de avisos del banco al día. En unos años junta veinte mil pagos. Cada comando sobre ella rehidrata desde el primero. ¿Cuánto cuesta eso?"

**Haz sentir el dolor:** que peguen en `Program.cs`, entre `Build()` y `Run()`, la siembra de emp-60 (NIT 906000000, con 20.000 `PagoRegistrado` de `BANCO-00001` a `BANCO-20000`) y la función `Medir`, que carga con `AggregateStreamAsync` y un `Stopwatch`. La llaman dos veces con emp-177 y una con emp-60. Sale algo como `emp-177: … cargada en 1 ms` y `emp-60: versión 20001, Distribuidora Andina, cargada en 144 ms`. Sus números serán otros, pero emp-60 tarda unas cien veces más. Después de la primera corrida quitan la siembra y dejan `Medir`.

**Dicta los pasos:**
1. 🆕 Di qué es un snapshot `Inline`: `opts.Projections.Snapshot<Empresa>(SnapshotLifecycle.Inline)` guarda la `Empresa` en `mt_doc_empresa`, en la transacción de cada hecho. `session.Events.FetchLatest<Empresa>(id)` lo lee sin rejugar nada. 🆕 Di qué hace `[JsonInclude]`: deja que el deserializador llene un setter privado o un campo privado, pero no un campo `readonly`.
2. En `Empresa` (`using System.Text.Json.Serialization;`), que pongan `[JsonInclude]` en cada propiedad de setter privado menos `Version`, y en el `HashSet` de referencias, al que le quitan el `readonly`.
3. En el `AddMarten` de `AgregarEmpresas`, el snapshot y `opts.Schema.For<Empresa>().Metadata(m => m.Revision.MapTo(e => e.Version))`. `SnapshotLifecycle` vive en `JasperFx.Events.Projections`.
4. ⚠️ Los streams que ya existían no tienen documento. Antes de `Medir` corren una vez `RebuildProjectionAsync("Empresa", CancellationToken.None)`, con `BuildProjectionDaemonAsync()`. En `Medir` cargan con `FetchLatest`. Después comentan la reconstrucción.
5. En `SuspenderHandler`, `RegistrarPagoHandler` y `CambiarPlanHandler` cambia solo la carga: ahora es `FetchLatest`.
6. Que quiten de `Program.cs` `Medir`, sus llamadas y la reconstrucción comentada: corren en cada arranque, también en el host de los tests. Sin código, cierra con la pregunta de fondo. `SELECT length(data::text) FROM mt_doc_empresa WHERE id = 'emp-60';` da unos 300.000 bytes. Cuando un stream pasa el umbral (`SELECT id, version FROM mt_streams WHERE version > 1000;`), toca elegir. Acortar es hacer tramos por mes con un hecho de cierre. Partir es darle su propio stream a lo que se valida solo, como cada suspensión.

**✅ Punto de control:** `Medir` da `emp-60: versión 20001, Distribuidora Andina, cargada en 4 ms` (o pocos ms), y `SELECT mt_version FROM mt_doc_empresa WHERE id = 'emp-60';` da `20001`. El aviso `BANCO-90001` mandado dos veces (`curl -X POST "http://localhost:5000/empresas/emp-60/pagos?monto=10000" -H "Idempotency-Key: BANCO-90001" -H "Authorization: Bearer $ACME"`) deja un `count(*)` de 1. Suspender emp-60 crea `susp-emp-60-20003`. `dotnet test` sigue verde. Si alguien no llega: solución en el `<details>` del Paso 1 y del Paso 2.

**🔨 Rómpelo (si hay tiempo):**
- Si `Medir` vuelve a `AggregateStreamAsync`, pasa otra vez de 100 ms: lo que lee el snapshot es `FetchLatest`.
- Con `SnapshotLifecycle.Async` y `LoadAsync` en `RegistrarPagoHandler`, el aviso `BANCO-90002` mandado dos veces seguidas da `200` y `409` (o `200`). El segundo leyó una empresa vieja, y la versión esperada lo atrapó.
- Si el `Id` no tiene `[JsonInclude]`, `BANCO-90003` da `500` con `ArgumentNullException: Value cannot be null. (Parameter 'key')`.
- Si el `HashSet` vuelve a ser `readonly`, `BANCO-90004` entra dos veces, y `jsonb_array_length(data -> '_referenciasDePago')` da `1`.
- Después de cada rotura, restauran y corren la reconstrucción una vez. Hazlo antes del paso 6, que quita `Medir` y la reconstrucción.

**Si se traban:**
- `ArgumentNullException: … (Parameter 'key')` al guardar → falta `[JsonInclude]` en el `Id`.
- `NullReferenceException` en `Medir`, o `No existe la empresa` → ese stream no tiene documento: corran la reconstrucción.
- La versión sale `0`, aparece un `susp-…-1`, o un pago responde `409` → falta la línea de `Metadata`.
- `FetchLatest` no compila → vive en `IDocumentSession`, no en `IQuerySession`.
- `ExistingStreamIdCollisionException` al arrancar → falta quitar la siembra de emp-60.

**Cierra con:** rehidratar cuesta lo que mide el stream. Un snapshot `Inline` leído con `FetchLatest` mantiene la empresa al día, siempre que el documento se relea entero. Si el stream pasa el umbral, se acorta o se parte. Commit con la reflexión: "si `FetchLatest` y `AggregateStreamAsync` dan la misma empresa, ¿por qué tus handlers usan la primera? ¿Por qué `Inline` y no `Async` para decidir? ¿Cuándo basta el snapshot, y cuándo acortas o partes?"

**Puente:** dejaron una línea que carga peso sin que se note: el `readonly` que le quitaron al `HashSet`. Ponerlo compila, el editor lo sugiere, y deja entrar un pago doble.

---

## 63 · El comentario que sobrevive  ·  ⏱ ~55 min  ·  [el-comentario-que-sobrevive.md](secciones/el-comentario-que-sobrevive.md)

**Para qué:** proteger las líneas cuya ausencia falla en silencio con dos cosas: un comentario que dice qué se rompe sin ellas, y un test que se pone rojo si alguien las quita.

**Abre así (lo dices en voz alta):** "Meses después, alguien hace limpieza. Ve `UseDurableLocalQueues()`, con un comentario que dice que sobrevive reinicios, y la quita porque casi nunca reinician. Todo compila y los tests pasan. ¿Qué lo habría frenado?"

**Haz sentir el dolor:** muestra la línea con su comentario de hoy: `opts.Policies.UseDurableLocalQueues();   // el consumidor local también entrega DURABLE (sobrevive reinicios)`. Cuenta qué pasa sin ella. Un reinicio en el instante justo pierde los pedidos y respuestas que estaban en la cola local, en memoria, y no deja excepción, ni log, ni dead letter. La suspensión se queda con Facturación en `EnCurso`.

**Dicta los pasos:**
1. 📌 La regla es comentar el síntoma, no la mecánica. Que reescriban el comentario de esa línea: qué se pierde sin ella, y que no hay error (`// NO quitar: …`).
2. Dales 5 minutos para buscar otras líneas silenciosas en su código, con su síntoma. Luego repasa en pantalla la lista del `<details>` del Paso 2: `Separated`, el nombre completo de `JasperFx.ConcurrencyException`, `MapInboundClaims = false`, el `HashSet` sin `readonly`…
3. 🆕 Di qué hace `WebApplicationFactory<Program>`: arranca su `Program.cs` entero, con un servidor en memoria. `Services` es su contenedor, y `CreateClient()` le habla por HTTP. Desde `Empresas.Tests`: `dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 10.0.13`.
4. Que escriban `HostDePrueba : WebApplicationFactory<Program>`. El constructor lee `CADENA_POSTGRES`, le cambia la base a `empresas_tests` con `NpgsqlConnectionStringBuilder` y fija con `Environment.SetEnvironmentVariable` las variables `ConnectionStrings__Postgres` y `DirectorioDeSecretos` (`sin-secretos`). Su `ConfigureWebHost` llama `DisableAllExternalWolverineTransports()`. Declaran la colección `"host"`.
5. Proyecta la tabla «Lo que le preguntas al host»: esa API no se adivina. En una clase `LineasQueCarganPeso` de la colección `"host"`, un `[Fact]` por fila con `Assert.True(condición, "síntoma")`. El de HTTP es `async Task`.
6. Cierra el arco con el aporte. Que formulen el título de un issue para Wolverine, sin abrirlo. La petición justa puede ser "al menos advierte cuando la cola local no es durable", y no "cambia el default".

**✅ Punto de control:** `dotnet test` desde `Empresas.Tests`, con `CADENA_POSTGRES` fijada, pasa en verde: los tests de antes y los siete nuevos. Si alguien no llega: solución en el `<details>` del Paso 3.

**🔨 Rómpelo (si hay tiempo):** que comenten `opts.Policies.UseDurableLocalQueues();`. Cae solo `Las_colas_locales_son_durables`, con el mensaje `Sin UseDurableLocalQueues, un reinicio pierde pedidos y respuestas en silencio, y la suspensión se queda EnCurso.` Luego que cambien `OnException<JasperFx.ConcurrencyException>()` por el nombre corto. Compila, y caen `El_choque_de_concurrencia_se_reintenta` y `CarreraDelPagoTests`. Que deshagan las dos cosas.

**Si se traban:**
- `InvalidOperationException: Falta la variable de entorno CADENA_POSTGRES.` → fíjala en la terminal donde corres `dotnet test`.
- `3D000: database "empresas_tests" does not exist` → crea la base como en La forma del hecho se congela.
- `ExistingStreamIdCollisionException` → quedó una siembra en `Program.cs`, y el host del test la corre en cada arranque.
- `Unable to initialize the Broker rabbitmq in time` → falta `DisableAllExternalWolverineTransports()` en `ConfigureWebHost`.

**Cierra con:** una línea que carga peso lleva un comentario que nombra el síntoma, y un test que le pregunta al host si la tiene, con ese síntoma como mensaje. Si existe por un default de la librería que falla callado, el síntoma se devuelve como issue: usar, mantener, aportar. Commit con la reflexión: "elige una línea que falle en silencio y escribe su comentario de síntoma, su `Assert` y el título del issue. ¿Qué tienen en común?"

**Puente:** casi todo el motor nuevo está en su sitio. Ahora toca reunirlo en una forma reusable, la de `Cosmos.BuildingBlocks`.

---

## 64 · La plantilla  ·  ⏱ ~65 min  ·  [la-plantilla.md](secciones/la-plantilla.md)

**Para qué:** reunir lo construido en una plantilla, `AggregateRoot` más `MartenUnitOfWork`, para que un agregado nuevo solo declare sus hechos y sus reglas.

**Abre así (lo dices en voz alta):** "Cada handler repite lo mismo: rehidratar, saber si el stream nace o crece, y guardar. El día que llegue `Pago` o `Contrato`, ¿lo copian otra vez?"

**Haz sentir el dolor:** muestra su `SuspenderHandler`: hace `Append` en la empresa y `StartStream` en el proceso, a mano, en la misma sesión. Señala que cada agregado decide a su manera: `SuspensionDeEmpresa` devuelve sus hechos, y la `Empresa` perdió sus verbos en el swap.

**Dicta los pasos:**
1. 🆕 Di qué es la plantilla. `AggregateRoot` guarda `SinConfirmar` y ofrece `Emitir` y `MarcarConfirmados`. `MartenUnitOfWork` distingue nacer (`Registrar` → `StartStream`) de crecer (`Cargar` → `Append`), y confirma todo en un `SaveChanges`. Que reescriban su `AggregateRoot` en su sitio, sin declarar otro: `SinConfirmar`, `Emitir`, `MarcarConfirmados` y un `Id` con `[JsonInclude]` y `protected set`. Ya no lleva `Aplicar` ni `Load`.
2. `Empresa` hereda la base, y le quitan su propio `Id`. Sus verbos son `Registrar` (static), `Suspender(motivo, suspensionId)`, `CambiarPlan`, `RegistrarPago(monto, referencia)` y `Reactivar`, y cada uno hace `Apply(h); Emitir(h);`. ⚠️ `Emitir` solo acumula: sin el `Apply`, el verbo siguiente decide a ciegas. Las reglas se quedan: `YaRegistro(referencia)`, y `ReglaDeNegocioException` al cambiar el plan de una empresa suspendida o al reactivar con deuda.
3. `MartenUnitOfWork(IDocumentSession)` con `Registrar`, `Cargar<T>` (que lee con `FetchLatest`) y `CommitAsync`.
4. En `Program.cs`, antes de `app.Run()`, nace emp-1 (NIT `900`). ⚠️ La unidad de trabajo no reserva el NIT: `s.Insert(new Localizador { Id = e.Nit, Stream = e.Id })` va en la misma sesión, antes del `CommitAsync`. Luego emp-1 crece: la cargan, la suspenden con `Suspender("mora", "susp-emp-1-2")` y confirman. Después quitan los dos bloques.
5. (🔨, no lo saltes) Un hecho, dos reactivaciones. Que siembren emp-3 (900300000) con `Sembrar`. En una sola unidad de trabajo llaman `Suspender("mora", "susp-emp-3-2")`, `RegistrarPago(50_000, "BANCO-0001")` y `Reactivar()`. El diario tiene `1` reactivación, y el documento `2`, con `SinConfirmar` lleno.
6. 🆕 Di qué es `UseIdentityMapForAggregates`: Marten 9 lo trae en `true`, y entonces el snapshot sigue desde el objeto que los verbos ya cambiaron. Que pongan `opts.Events.UseIdentityMapForAggregates = false;` en el `AddMarten` de `AgregarEmpresas`, con su comentario de síntoma, y que sumen su `[Fact]` a `LineasQueCarganPeso` (`Assert.False(marten.Events.UseIdentityMapForAggregates, …)`).
7. Quitan los bloques de emp-3 y repiten el acto con emp-4 (900400000, `susp-emp-4-2`), sembrada igual. Luego quitan esos bloques, reconstruyen `Empresa` una vez con `RebuildProjectionAsync("Empresa", …)` y quitan la reconstrucción.
8. El segundo agregado. `SuspensionDeEmpresa` hereda `AggregateRoot` y nace con `static Solicitar`. Sus métodos hacen `Apply(h); Emitir(h);` y ya no devuelven hechos.
9. emp-2 (900200000) nace con la plantilla y su `Localizador`, como emp-1. En otra unidad de trabajo se suspende, y su proceso nace en la misma: `uow.Registrar(SuspensionDeEmpresa.Solicitar("susp-emp-2-2", "emp-2", e.Nit, e.Plan))`.
10. Quitan esos dos bloques, cargan el proceso con `Cargar<SuspensionDeEmpresa>`, llaman `ConfirmarCobroDeMulta(new DateOnly(2026, 10, 17))` y confirman. En `ProcesoDeSuspensionHandler`, `Decidir` recibe un `Action<SuspensionDeEmpresa>` y toma los hechos de `proceso.SinConfirmar`; su `Append` con versión esperada no cambia. Al final quitan todos los bloques de `Program.cs` y dejan el `store`.

**✅ Punto de control:** `SELECT data FROM mt_doc_localizador WHERE id = '900'` da `{"Id": "900", "Stream": "emp-1"}`. `SELECT id, data -> 'Reactivaciones', data -> 'SinConfirmar' FROM mt_doc_empresa WHERE id IN ('emp-3', 'emp-4');` da `1 | []` en las dos. El proceso de emp-2 queda en `Facturacion=Aplicado`, y `dotnet test` pasa en verde. Si alguien no llega: solución en el `<details>` de las piezas base y del 🔨.

**🔨 Rómpelo (no lo saltes: §68 parte de `UseIdentityMapForAggregates = false`):** «un hecho, dos reactivaciones» va como pasos 5 a 7. El segundo agregado, pasos 8 a 10, ya es parte del camino.

**Si se traban:**
- `CS0101`, ya existe `AggregateRoot` → reescriban su base en su sitio.
- `The stream key cannot be null or empty` (con aviso `CS0108`) → dejaron un `Id` propio en el agregado: quítenlo.
- `JasperFx.DocumentAlreadyExistsException` en `CommitAsync` → ese NIT ya tiene `Localizador`: usen otro.
- Los tests caen al arrancar, con `ExistingStreamIdCollisionException` o con una `NullReferenceException` → quedó en `Program.cs` un bloque de emp-1 a emp-4.

**Cierra con:** el motor que hicieron a mano cabe en dos piezas base, y eso es `Cosmos.BuildingBlocks` en miniatura. Un agregado nuevo solo declara sus hechos y sus reglas, y el snapshot no reusa el agregado que los verbos ya cambiaron. Commit con la reflexión: "¿qué plomería dejó de repetir cada agregado? Nombra una pieza de tu motor a mano que ahora vive en la plantilla. ¿Por qué emp-3 contaba dos reactivaciones con el identity map en `true`?"

**Puente:** sus tests de reglas siguen comentados desde el swap. Toca probarlos en memoria, con un doble que se parezca de verdad a Marten.

---

## 65 · La plantilla se prueba  ·  ⏱ ~50 min  ·  [la-plantilla-se-prueba.md](secciones/la-plantilla-se-prueba.md)

**Para qué:** probar las reglas de la empresa en memoria, con un doble que rehidrata como Marten, y fijar ese doble contra Postgres con un test de contrato.

**Abre así (lo dices en voz alta):** "Para saber si un pago repetido entra no hace falta una base. Basta un doble en memoria. Pero el verde de ese doble vale lo que se parezca a Marten. ¿Cómo lo comprueban?"

**Haz sentir el dolor:** muestra los tests de reglas comentados desde el swap: rehidrataban con `Load`, que ya no existe. Hoy la plantilla solo se probó a ojo, con un bloque en `Program.cs` y una consulta en `psql`. Esos tests comentados se pueden borrar.

**Dicta los pasos:**
1. 🆕 Di qué `Apply` ve Marten 9: solo los públicos, también los heredados. Uno privado se salta sin aviso, y si todos lo son, sale `InvalidProjectionException`. 🆕 Di qué es la reflexión en este caso: `typeof(T).GetMethod("Apply", [tipo])` busca el método, `Invoke` lo llama, y `GetProperty("Id")!.SetValue` pone el `Id` aunque el `set` sea `protected`.
2. En `Empresas.Tests`, una clase `static` `EnMemoria` con `Rehidratar<T>(string id, params object[] hechos) where T : AggregateRoot, new()`. Crea el agregado, le pone el `Id` y le aplica cada hecho con su `Apply` público. Si un hecho no tiene `Apply`, lo salta.
3. Una clase `ReglasDeEmpresa`, fuera de la colección `"host"`, con el test del pago repetido `BANCO-0044` que termina en `Assert.Empty(e.SinConfirmar)`.
4. 🆕 Di qué hace `Assert.Equivalent`: compara las propiedades públicas una a una. Que escriban `ContratoDelDoble` en la colección `"host"`. El dado lleva un hecho por cada `Apply` de `Empresa`, y se guarda con `StartStream` en un id nuevo (`$"emp-{Guid.NewGuid():N}"`). Rehidratan con `AggregateStreamAsync` y con el doble, les dan el mismo cuando (el pago repetido) y los comparan.
5. La primera corrida cae con `Mismatched value on member 'Version'`, `Expected: 8`, `Actual:   0`. Que lo arreglen en el doble, no en el test: `typeof(T).GetProperty("Version")?.SetValue(a, hechos.Length);`.
6. Lo que solo el `Apply` cambia. En `Empresa.Registrar` ponen `new Empresa { Id = id, Nombre = nombre }` y quitan `Nombre = e.Nombre` del `Apply`. Todo sigue verde, también el contrato. 🆕 Di qué da `GetProperties()`: todas las propiedades públicas. Que escriban `Foto(AggregateRoot a)` sin `Version` ni `SinConfirmar`, y el test `Registrar_deja_lo_mismo_que_sus_hechos`. Ese test cae con `Assert.Equal() Failure: Strings differ`, porque una foto tiene `Nombre= ` y la otra `Nombre=Andes`. Después deshacen el cambio.

**✅ Punto de control:** `dotnet test --filter ReglasDeEmpresa` pasa sin `CADENA_POSTGRES`. Con la línea de `Version`, `ContratoDelDoble` pasa contra Postgres. La foto cae con el nombre fuera del `Apply`, y pasa al deshacerlo. Si alguien no llega: solución en el `<details>` del Paso 1, 2 o 3.

**🔨 Rómpelo (si hay tiempo):** en la sección va antes del Paso 3, pero puedes hacerlo al final.
- Con `Apply(PagoRegistrado)` privado, `ContratoDelDoble` pasa y `ReglasDeEmpresa` cae con `Assert.Empty() Failure: Collection was not empty`. `CarreraDelPagoTests` también cae: ese rojo es el de producción.
- Luego el doble busca también los privados, con `BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance` (`using System.Reflection;`). La regla pasa en falso, y el contrato cae con `Collection value not found in member 'SinConfirmar'`.
- Que deshagan los dos cambios.

**Si se traban:**
- `InvalidProjectionException: No source-generated dispatcher found…`, o un hecho que no cambia nada al rehidratar → hay `Apply` privados o `internal`: háganlos públicos.
- `CS0310` en `new T()` → el agregado necesita un constructor público sin parámetros.
- `ContratoDelDoble` cae con un `Mismatched value on member …` → se arregla en el doble, no en el test.

**Cierra con:** la plantilla se prueba como una librería. Un doble rehidrata con los `Apply` públicos, un contrato lo fija contra Postgres, y una foto comprueba que solo los `Apply` cambian el estado. Commit con la reflexión: "¿por qué tu doble no busca los `Apply` privados, si Marten 8 sí los veía? ¿Qué atrapa la foto que el contrato no ve?"

**Puente:** quien adopte la plantilla no va a leer primero sus tests: va a leer su README, y la plantilla todavía no tiene uno.

---

## 66 · El README que compila  ·  ⏱ ~25 min  ·  [el-readme-que-compila.md](secciones/el-readme-que-compila.md)

**Para qué:** darle a la plantilla un README que no envejezca: sin código ni versiones, que diga cuándo no usarla y que señale un ejemplo de uso que es un test.

**Abre así (lo dices en voz alta):** "Quien agregue `Pago` el mes que viene no construyó la plantilla, y va a empezar por el README. Si el ejemplo vive en el README, ¿quién se entera el día que deja de compilar?"

**Haz sentir el dolor:** lee los casos de la organización. Los README de la librería dicen Marten 8.23 y Wolverine 5.18, y su código va en 9.18 y 6.21. Sus ejemplos no compilan contra la API que documentan. El README de otra librería viaja dentro de su paquete NuGet y describe tipos que ya no existen. Ninguno de esos errores rompe un build.

**Dicta los pasos:**
1. Proyecta el `README.md` del reto y que lo copien en la raíz del repositorio, sin bloques de código ni números de versión. Dice qué es la plantilla y apunta el ejemplo a `Empresas.Tests/ComoUsarLaPlantilla.cs`. Cubre también los `Apply` públicos, el `Localizador` al nacer y dónde están las versiones (el `.csproj`).
2. La línea «Cuándo no usarla» la escriben ellos. Son las dos preguntas de ¿Merecía event sourcing?, con el catálogo `planes` de ejemplo. Agregan que ese servicio no llama a `Hechos.Registrar` ni a `AddAsyncDaemon`.
3. El test `ComoUsarLaPlantilla` va en la colección `"host"`, en tres sesiones. En la primera nace la empresa con su `Localizador`, y confirman. En la segunda la cargan, llaman dos veces `RegistrarPago` con `BANCO-0044` y confirman. La tercera es una sesión `q` para `Assert.Equal(id, await Localizador.StreamDe(q, nit))` y `Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count)`. El id y el NIT son nuevos en cada corrida (`$"nit-{id}"`).

**✅ Punto de control:** `dotnet test` pasa en verde dos veces seguidas. Si alguien no llega: solución en el `<details>` del Paso 2.

**🔨 Rómpelo (si hay tiempo):** que cambien el nombre de `Cargar` a `Obtener` en `MartenUnitOfWork`. `dotnet build` en `Empresas.Historia` compila, pero `dotnet test` no: `ComoUsarLaPlantilla.cs(26,31): error CS1061: "MartenUnitOfWork" no contiene una definición para "Cargar" …` (en inglés, `'MartenUnitOfWork' does not contain a definition for 'Cargar'`). Que lo deshagan.

**Si se traban:**
- La segunda corrida cae con `JasperFx.DocumentAlreadyExistsException` → el NIT es fijo. Ármalo con el id: `$"nit-{id}"`.
- `InvalidOperationException: El NIT … no está en el localizador` → falta el `Insert` del `Localizador` en la sesión del nacer.

**Cierra con:** el README no lleva lo que envejece. Dice qué es la plantilla, qué cuidar y cuándo no usarla, y señala un ejemplo que es un test: documentación que se ejecuta. Commit con la reflexión: "¿por qué tu README no trae ejemplo ni versión de Marten? Al cambiar el nombre de `Cargar`, ¿qué te avisó, y qué te habría avisado con el ejemplo escrito en el README?"

**Puente:** la plantilla guarda bien donde ellos confirman. Dentro de un handler confirma Wolverine, al final del mensaje. Toca llevarla adentro sin partir esa transacción.

---

## 67 · La plantilla dentro del handler  ·  ⏱ ~60 min  ·  [la-plantilla-dentro-del-handler.md](secciones/la-plantilla-dentro-del-handler.md)

**Para qué:** usar la plantilla dentro de los handlers de Wolverine: el handler solo decide, y sus hechos y sus mensajes entran en una sola transacción, la que Wolverine confirma al final.

**Abre así (lo dices en voz alta):** "La plantilla confirma con `CommitAsync`. Dentro de un handler ya confirma Wolverine, al final del mensaje. Si el handler llama a `CommitAsync`, ¿cuántas transacciones hay?"

**Haz sentir el dolor:**
- Que pasen su `SuspenderHandler` a la plantilla, como en `ComoUsarLaPlantilla`: `new MartenUnitOfWork(session)`, `uow.Cargar<Empresa>(cmd.EmpresaId)` sin `?? throw`, `empresa.Suspender(cmd.Motivo, suspensionId)`, `uow.Registrar(SuspensionDeEmpresa.Solicitar(…))` y `await uow.CommitAsync();`. Justo después del `CommitAsync` ponen `throw new InvalidOperationException("falla después de confirmar");`.
- Que siembren con `Sembrar` emp-46 (`904600000`, "Ferretería Andina") y emp-47 (`904700000`, "Vivero del Sur") entre `builder.Build()` y `app.Run()`, arranquen y quiten la siembra.
- Que corran `curl -X POST -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-46/suspender`: `500`. En `psql`, `SELECT stream_id, version, type FROM mt_events WHERE stream_id IN ('emp-46', 'susp-emp-46-2') ORDER BY seq_id;` trae `empresa_registrada`, `suspension_solicitada` y `empresa_suspendida`, y `SELECT count(*) FROM multas WHERE nit = '904600000';` da `0`.
- Explica: los hechos quedaron y los pedidos no. `CommitAsync` es un `SaveChangesAsync` a mano, y lo que el handler devuelve entra al outbox después, en otra transacción. Quitar el `CommitAsync` tampoco sirve: la unidad solo pasa los hechos a la sesión dentro de él, y saldrían los pedidos sin los hechos.

**Dicta los pasos:**
1. 🆕 Di qué es un middleware de Wolverine: una clase con un método `After`, registrada con `opts.Policies.AddMiddleware<T>()`. Wolverine lo llama después de cada handler y antes del `SaveChangesAsync` de `AutoApplyTransactions`. Si el handler y el middleware piden una `MartenUnitOfWork`, Wolverine crea una por mensaje, con la sesión del mensaje (la del outbox, con el tenant del sobre), y les pasa la misma. No se registra en el contenedor.
2. Proyecta el código generado resumido de la sección: sesión, `new MartenUnitOfWork`, `Handle`, `EnqueueCascadingAsync`, `After`, `SaveChangesAsync`.
3. En `MartenUnitOfWork`, que saquen de `CommitAsync` un método público `Volcar()`: los `StartStream` y los `Append`, sin `SaveChangesAsync` y sin marcar. `CommitAsync` queda en `Volcar()`, el `SaveChangesAsync` y `MarcarConfirmados`: es para fuera de un handler.
4. Que creen en `Empresas.Historia` la clase `UnidadDeTrabajoMiddleware` con `public void After(MartenUnitOfWork uow) => uow.Volcar();` y lo registren en el `AddWolverine` de `AgregarEmpresas`, junto a `AutoApplyTransactions()`, con su comentario `// NO quitar: …`.
5. `SuspenderHandler` pide `MartenUnitOfWork uow` en vez de la sesión: sin el `new` y sin el `CommitAsync`. La falla queda donde estaba el `CommitAsync`. `SuspenderHandlerTests` deja de compilar: le pasan `new MartenUnitOfWork(session)`. Prueban con emp-47, con la falla y sin ella.
6. Test `LaPlantillaEnElHandler`, en `Empresas.Tests`, en la colección `"host"`. El dado es una empresa nueva de acme registrada con la plantilla y `CommitAsync` (el test no es un handler). El comando va por el bus, no por `Handle`: ⚠️ `IMessageBus` es scoped, así que `using var scope = app.Services.CreateScope();`. Luego `bus.InvokeForTenantAsync("acme", new SuspenderEmpresa(id, "mora"))` y `Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count)`.
7. Suman al README la línea **Dentro de un handler:** pide la `MartenUnitOfWork`, no llames a `CommitAsync`, y el ejemplo es `Empresas.Tests/LaPlantillaEnElHandler.cs`.
8. Tercer dolor: todo está verde, pero el log muestra una excepción cada 10 segundos y el cron no cobra. `SELECT count(*) FROM wolverine_dead_letters WHERE message_type = 'DisparoMensual';` suma uno por vuelta, con `Default tenant *DEFAULT* usage is disabled`.
9. Explica la causa: el middleware corre en todos los handlers, y para crear la unidad de trabajo Wolverine abre una sesión con el tenant del sobre. El disparo no trae tenant. Que filtren: `AddMiddleware<UnidadDeTrabajoMiddleware>(chain => …)` con `chain.Handlers`, `h.Method.GetParameters()` y `p.ParameterType == typeof(MartenUnitOfWork)`. Que filtren por el parámetro, no por el mensaje: así entra en el próximo handler que pida la unidad de trabajo, y no en el próximo trabajo sin tenant.

**✅ Punto de control:** con la falla, `curl … /empresas/emp-47/suspender` da `500` y emp-47 solo tiene `empresa_registrada`. Sin la falla, da `202`: `empresa_suspendida` en emp-47, `suspension_solicitada` en `susp-emp-47-2` y, en un momento, una fila en `multas` para `904700000`. Con el filtro y el servicio reiniciado, el log vuelve a decir `Mes … de acme: cobrado` y `Mes … de globex: cobrado`, y `SELECT tenant, max(periodo) FROM mensualidades GROUP BY tenant;` avanza cada 10 segundos. `dotnet test` en verde. Los disparos fallidos se quedan en dead letters: son meses sin cobrar. Si alguien no llega: solución en el `<details>` del Paso 1, 2 o 3.

**🔨 Rómpelo (no lo saltes: §69 Paso 3 repite el paso de `RegistrarPagoHandler` a la plantilla):**
- Quitan el `AddMiddleware`. Compila, y `dotnet test` cae en el test nuevo con `Expected: 2` / `Actual: 1`, y también en `VistaSuspendidaTests`. Lo devuelven con su filtro, después de `AutoApplyTransactions()`: verde. Sin el filtro también hay verde: al filtro lo cuida su comentario.
- `RegistrarPagoHandler` sobre la plantilla: `uow.Cargar`, su guarda con su `LogWarning` y `empresa.RegistrarPago(cmd.Monto, cmd.Referencia)` en vez del `Append`. `dotnet test --filter CarreraDelPagoTests`, solo, cae con `Assert.Single() Failure: The collection contained 2 matching items`: el `Append` de `Volcar` no lleva versión esperada. Lo deshacen. La sección 69 lo retoma.

**Si se traban:**
- `EmptyEventStreamException: A new event stream ('susp-…') cannot be started without any events` → quedó un `CommitAsync` en el handler.
- El handler responde y el diario no cambia → el handler crea su propia `new MartenUnitOfWork(session)`. Que la pida como parámetro.
- `Cannot resolve scoped service 'Wolverine.IMessageBus' from root provider` → pidan el bus a `app.Services.CreateScope()`.
- Los tests caen al arrancar con `ExistingStreamIdCollisionException` → quedó la siembra de emp-46 y emp-47 en `Program.cs`.

**Cierra con:** dentro de un handler, el handler solo decide. Wolverine le da la unidad de trabajo del mensaje, el middleware la vuelca solo donde se pide y `AutoApplyTransactions` confirma hechos y mensajes juntos. Commit con la reflexión: "si la sesión del handler ya está en el outbox, ¿por qué un `CommitAsync` dentro del handler parte la transacción en dos? ¿Qué cambió de lugar para que el handler no llame a nada? ¿Por qué el cron dejó de cobrar, si su handler no usa la plantilla?"

**Puente:** ahora el mensaje entero es una sola unidad de trabajo. Si dos pasos del mismo mensaje cargan la misma empresa, cada uno recibe su copia, y ninguna ve lo que decidió la otra.

---

## 68 · Lo que la unidad de trabajo ya tiene  ·  ⏱ ~40 min  ·  [lo-que-la-unidad-de-trabajo-ya-tiene.md](secciones/lo-que-la-unidad-de-trabajo-ya-tiene.md)

**Para qué:** que `Cargar` devuelva lo que la unidad de trabajo ya cargó o registró en el mensaje, y que falle con el id cuando el stream no existe, en vez de devolver `null`.

**Abre así (lo dices en voz alta):** "El banco manda un extracto: todos los avisos de pago del día en un solo mensaje. Un día repite una línea. Ya tienen la guarda del pago repetido: ¿lo frena?"

**Haz sentir el dolor:**
- Proyecta el `record RegistrarExtracto(RegistrarPago[] Avisos)` y su `RegistrarExtractoHandler`, y que los peguen en `Empresas.Historia`. El handler recibe `MartenUnitOfWork uow` y un `ILogger`, y por cada aviso carga la empresa, revisa `YaRegistro` y llama a `RegistrarPago`.
- En `LaPlantillaEnElHandler`, que lleven la siembra a un método `NuevaEmpresa()` que devuelva el id, y que agreguen `Un_aviso_repetido_en_el_extracto_entra_una_vez`. El test manda `new RegistrarExtracto([aviso, aviso])`, con `new RegistrarPago(id, "BANCO-0044", 50_000)`, y cae con `Expected: 1` / `Actual:   2`. Cada `Cargar` fue a Postgres y trajo su propia copia, sin el pago de la otra.
- En `SuspenderHandlerTests`, que armen el dado en la unidad de trabajo que le pasan al handler, sin `StartStream` ni `SaveChangesAsync`: `uow.Registrar(Empresa.Registrar(id, "900555", "Prueba", "Basico"));`. Cae con `System.NullReferenceException` en `SuspenderHandler`. Con `uow.Volcar();` antes del `Handle`, el error es el mismo: `FetchLatest` no ve un `StartStream` que la sesión no confirmó. Que quiten el `Volcar`.

**Dicta los pasos:**
1. Al empezar `Cargar`: si la unidad ya rastrea un agregado con ese id, registrado o cargado, que lo devuelva sin agregarlo otra vez a una lista. Para devolverlo como `T`, usan `is T`, como el `is ProcesoRevertido revertido` de su `Decidir`. Los dos tests pasan sin cambiarlos. Avísales que la empresa que sale de memoria tiene `Version` 0.
2. Segundo dolor: un test que manda por el bus `new RegistrarExtracto([new RegistrarPago("emp-nadie", "BANCO-0044", 50_000)])` cae con `NullReferenceException` en `RegistrarExtractoHandler`, y no dice qué faltaba. Corre `dotnet build Empresas.Historia --no-incremental 2>&1 | grep CS8603` (en PowerShell, `| Select-String CS8603`): sale `warning CS8603: Posible tipo de valor devuelto de referencia nulo`. La firma de `Cargar` promete un `T` y miente.
3. 🆕 Di qué es `Assert.ThrowsAsync`: el `Assert.Throws` de algo que se espera con `await`. Que declaren `AgregadoNoEncontradoException(string id)`, suelta, junto a sus otras excepciones, con un mensaje que diga el id. Un tipo propio deja que quien llama decida, por ejemplo un endpoint que responde 404. En `Cargar`: `FetchLatest<T>(id) ?? throw new AgregadoNoEncontradoException(id)`. El test: `await Assert.ThrowsAsync<AgregadoNoEncontradoException>(() => bus.InvokeForTenantAsync("acme", nadie));`.

**✅ Punto de control:** `dotnet test` en verde, con los dos tests nuevos de `LaPlantillaEnElHandler`, y el `grep CS8603` ya no encuentra nada. Si alguien no llega: solución en el `<details>` del Paso 1 o 2.

**🔨 Rómpelo (si hay tiempo):**
- El `!` que calla: dejan la primera línea, cargan sin la puerta y devuelven `a!`. El `grep CS8603` queda vacío, y el test de la puerta cae con `Assert.Throws() Failure: Exception type was not an exact match` y `Actual: typeof(System.NullReferenceException)`. El `!` solo calla al compilador, y el README de la librería de la organización lo enseña en su ejemplo.
- La puerta sin memoria: con la puerta, quitan solo la primera línea. El extracto vuelve a pagar dos veces, y `SuspenderHandlerTests` cae con `AgregadoNoEncontradoException : No existe el stream emp-test-…`, aunque esa empresa existe en la unidad. Que devuelvan la línea.

**Si se traban:**
- El extracto sigue con dos pagos → la primera línea no encuentra la empresa. Comparen por `a.Id == id`, en las dos listas.
- `SuspenderHandlerTests` cae con `AgregadoNoEncontradoException` → falta la primera línea de `Cargar`.
- `CS0246` con `AgregadoNoEncontradoException` en el test → la declararon dentro de otra clase. Va suelta.
- El `grep CS8603` no muestra nada con el `Cargar` de antes → falta `--no-incremental`.

**Cierra con:** la unidad de trabajo de un mensaje se ve a sí misma. `Cargar` devuelve lo que ya tiene antes de ir a Postgres, como un *identity map* de sus agregados. Si el stream no existe, falla en la puerta con su id, en vez de dejar un `null` que un `!` solo esconde. Commit con la reflexión: "¿por qué la guarda de Llegó dos veces frena un aviso repetido en dos mensajes, y no en un mismo extracto? ¿Qué diferencia hay entre callar el aviso con `!` y lanzar `AgregadoNoEncontradoException` en `Cargar`?"

**Puente:** el `Append` de `Volcar` no lleva versión esperada, y por eso `RegistrarPagoHandler` sigue con su sesión. Entre su `Cargar` y el commit de Wolverine, otro mensaje pudo escribir en el mismo stream.

---

## 69 · El capstone: FetchForWriting  ·  ⏱ ~50 min  ·  [el-capstone-fetchforwriting.md](secciones/el-capstone-fetchforwriting.md)

**Para qué:** que la plantilla vuelva a escribir con la versión esperada, ahora con `FetchForWriting` de Marten, y que un test de dos escritores lo fije en la suite.

**Abre así (lo dices en voz alta):** "Dos personas cargan la misma empresa en Básico. Una la pasa a Premium, la otra a Enterprise, y las dos guardan. Con la plantilla de hoy, ¿cuál de las dos falla?"

**Haz sentir el dolor:** en `Program.cs`, entre `builder.Build()` y `app.Run()`, que registren emp-48 con la plantilla (`904800000`, "Molinos del Valle", "Básico", con su `Localizador`), sin suspenderla. Luego abren dos sesiones de acme, cada una con su `MartenUnitOfWork`. Las dos cargan emp-48, A hace `CambiarPlan("Premium")`, B hace `CambiarPlan("Enterprise")`, y las dos confirman. Ninguna falla. `SELECT version, type FROM mt_events WHERE stream_id = 'emp-48' ORDER BY version;` da `1 | empresa_registrada`, `2 | plan_cambiado` y `3 | plan_cambiado`. Las dos decidieron sobre Básico, y B nunca vio el cambio de A. El `Append` sin versión esperada de la plantilla dejó volver la deuda de Concurrencia optimista. No usen emp-1: está suspendida, y `CambiarPlan` la rechaza.

**Dicta los pasos:**
1. 🆕 Di qué es `FetchForWriting`. `session.Events.FetchForWriting<Empresa>(id)` devuelve un stream que recuerda su versión inicial. Su `.Aggregate` es el estado, o `null` si el stream no existe. `.AppendOne` y `.AppendMany` agregan hechos, y al `SaveChangesAsync` Marten rechaza si el stream avanzó (`EventStreamUnexpectedMaxEventIdException`). En `Volcar` no pueden pasar la versión a mano: `AggregateRoot` no tiene `Version`, y la que importa es la que se leyó al cargar.
2. Que quiten de `Program.cs` el bloque que registra emp-48 (ya existe) y dejen los dos actos. En `MartenUnitOfWork`, `Cargar<T>` usa `FetchForWriting<T>` en vez de `FetchLatest`. `IEventStream<T>` es genérico, así que guardan el stream dentro de una `Action`: `() => stream.AppendMany(agg.SinConfirmar.ToArray())`.
3. Una lista `_cargados`, de pares `(agg, append)`, reemplaza a `_modificados`. La primera línea busca en `_nuevos` y en los agregados de `_cargados`, la puerta mira `stream.Aggregate` y `Volcar` llama a cada `Action`. Nacer (`StartStream`) no cambia. Al correr, `await ub.CommitAsync();` lanza `EventStreamUnexpectedMaxEventIdException`.
4. 🆕 Di qué es `Assert.ThrowsAnyAsync<T>`: pasa también si se lanza una clase hija de `T`. Esperan la base, `JasperFx.ConcurrencyException`, con el nombre completo, porque el corto es su propia `ConcurrencyException`.
5. Que creen `ConcurrenciaTests` en `Empresas.Tests`, en la colección `"host"`, con `HostDePrueba` y el `IDocumentStore` de `app.Services`, y que quiten de `Program.cs` el escenario. Una empresa nueva por corrida (`$"emp-{Guid.NewGuid():N}"`), dos sesiones con su unidad de trabajo. A confirma y `await Assert.ThrowsAnyAsync<JasperFx.ConcurrencyException>(() => ub.CommitAsync());`. Luego B recarga en una unidad nueva, ve `Premium`, decide otra vez y confirma.
6. `RegistrarPagoHandler` sobre la plantilla: el cambio que deshicieron en la 67. Pide la `MartenUnitOfWork`, conserva su guarda con su `LogWarning` y llama al verbo, sin su `Append`. Dentro de un handler no escriben el "recarga y reintenta": lo hace su política `OnException<JasperFx.ConcurrencyException>`, que vuelve a correr el handler.

**✅ Punto de control:** `dotnet test`, desde `Empresas.Tests`, pasa en verde, y `dotnet test --filter CarreraDelPagoTests` también, con el `RegistrarPagoHandler` sobre la plantilla. Si alguien no llega: solución en el `<details>` del Paso 1 o 2.

**🔨 Rómpelo (si hay tiempo):** `Cargar(id)` vuelve a `FetchLatest` y al `Append` sin versión (`_s.Events.Append(id, agg.SinConfirmar.ToArray())`), y se quedan la primera línea y la puerta. `dotnet test` cae en `ConcurrenciaTests.Dos_escritores_sobre_la_misma_version_la_segunda_choca` con `Assert.ThrowsAny() Failure: No exception was thrown`, y `CarreraDelPagoTests` vuelve a dejar dos pagos. Todo compila y los handlers responden igual: solo los tests lo notan. Que restauren `Cargar(id)`.

**Si se traban:**
- `No se puede cambiar el plan de una empresa suspendida` → cargaron emp-1. Usen emp-48.
- `UnidadDeTrabajoMiddleware` no compila (`CS1061`, no hay `Volcar`) → reescribieron la unidad sin `Volcar`. `CommitAsync` es `Volcar` más el `SaveChangesAsync`.

**Cierra con:** el `Append` sin versión de la plantilla reabrió la deuda de concurrencia. `FetchForWriting` la cierra en todo el ciclo cargar-decidir-guardar, y un test de dos sesiones se pone rojo si alguien lo quita. Commit con la reflexión: "¿por qué el `Append` sin versión reabrió la deuda de Concurrencia optimista, y cómo la cierra `FetchForWriting`? ¿Por qué preferirlo a pasar la versión al `Append` a mano?"

**Puente:** su test cubre la ventana entre cargar y confirmar. La de una pantalla es más larga: el usuario ve la empresa y guarda minutos después, y `FetchForWriting` valida la carga del guardado, no lo que vio el usuario.

---

## 70 · La versión que vio el usuario  ·  ⏱ ~85 min  ·  [la-version-que-vio-el-usuario.md](secciones/la-version-que-vio-el-usuario.md)

**Para qué:** que un cambio de plan desde una pantalla choque si la empresa cambió desde que el usuario la vio, que Facturación se entere de cada cambio que entra, y cerrar el taller con el criterio que llevan a la librería real. Deja unos 10 minutos para el cierre.

**Abre así (lo dices en voz alta):** "Ana abre la ficha a las 10:00 y ve Básico. Beto la pasa a Premium a las 10:03. Ana guarda Enterprise a las 10:05. Ya tienen `FetchForWriting`: ¿choca el guardado de Ana?"

**Haz sentir el dolor:**
- Que registren emp-49 con `curl -i -X POST http://localhost:5000/empresas -H "Authorization: Bearer $ACME" -H 'Content-Type: application/json' -d '{"empresaId":"emp-49","nit":"904900000","nombre":"Textiles del Norte","plan":"Basico"}'`: `HTTP/1.1 202 Accepted`. Todos lo corren una sola vez: las versiones de los pasos siguientes cuentan con eso.
- En `Program.cs`, entre `builder.Build()` y `app.Run()`, que escriban la función `GuardarPlan(string plan)`, con su sesión de acme, su unidad de trabajo, `Cargar`, `CambiarPlan` y `CommitAsync`. La llaman con `"Premium"` (Beto) y con `"Enterprise"` (Ana).
- `SELECT version, data->>'NuevoPlan' FROM mt_events WHERE stream_id = 'emp-49' ORDER BY version;` da `2 | Premium` y `3 | Enterprise`, y `SELECT * FROM plan_de_empresa WHERE nit = '904900000';` sigue en `acme | 904900000 | Basico | 1`.
- Hay dos dolores. `FetchForWriting` validó la carga de las 10:05, no lo que Ana vio a las 10:00. Y ningún cambio pasó por `CambiarPlanHandler`, el que anuncia `PlanDeEmpresaV1`, así que Facturación cobraría Básico. Que quiten el escenario de `Program.cs`.

**Dicta los pasos:**
1. 🆕 Di qué son `ETag` e `If-Match`. El GET devuelve la versión en `ETag`, entre comillas (`"2"`), y el cliente la manda de vuelta en `If-Match` al guardar. Si ya no coincide, 412 Precondition Failed. Sin `If-Match`, 428 Precondition Required.
2. En `Program.cs`, que agreguen `MapGet("/empresas/{id}/plan")` (`/empresas/{id}` ya es la ficha, que lee el tablero). Rehidrata con `AggregateStreamAsync<Empresa>` desde una `IQuerySession`, porque la versión que importa es la del stream, no la de una vista. Si no existe, 404. Si existe, pone su `Version` en `res.Headers.ETag` y devuelve id, nombre y plan.
3. 🆕 Di qué hace `FetchForWriting<T>(id, versionEsperada)`. Si el stream ya no está en esa versión, lanza `JasperFx.ConcurrencyException`. Un stream que no existe está en la versión 0, y con 0 su `.Aggregate` llega en `null`. Si otro escribe entre la carga y el guardado, sale `EventStreamUnexpectedMaxEventIdException`, y `JasperFx.ConcurrencyException` atrapa los dos.
4. En `MartenUnitOfWork`, que agreguen un segundo `Cargar<T>(string id, long versionVista)`, con su puerta y sin la primera línea: lo que vio el usuario se valida siempre contra Postgres.
5. 🆕 Di qué piezas de HTTP usan: un parámetro `HttpRequest req` y su `req.Headers.IfMatch`, `MapPut`, `Results.NoContent()` y `Results.StatusCode(...)` con `StatusCodes.Status412PreconditionFailed` y `Status428PreconditionRequired`. Que escriban `MapPut("/empresas/{id}/plan")`, con un `record CambioDePlan(string Plan)` junto a sus comandos. El PUT lee `If-Match` sin las comillas (si no viene, 428), carga con la versión vista, cambia el plan, confirma y responde 204. En `catch (JasperFx.ConcurrencyException)` responde 412.
6. El 404 de `AgregadoNoEncontradoException` va en su `StatusCodeSelector`, no en un `catch` del PUT. La sesión que escribe: registran su `IDocumentSession` scoped con `LightweightSession` y el `TenantId` del `IMessageContext`, como su `IQuerySession`. ⚠️ No lo manden por el bus: la política de reintento lo volvería a correr con la misma versión vista, y chocaría cada vez.
7. Muestra que el PUT tampoco anuncia: `plan_de_empresa` sigue en `Basico | 1`, y Empresas va en Premium, versión 4. Que el PUT pida `IMessageBus bus` y, antes del `CommitAsync`, publique `new PlanDeEmpresaV1(e.Nit, e.Plan, e.Version + 1)`.
8. Con un `throw new InvalidOperationException("antes del commit");` después del `PublishAsync`, el PUT con `If-Match: "4"` y Enterprise responde 500. El diario sigue en 4, pero `plan_de_empresa` dice `Enterprise | 5`. Que borren la fila con `DELETE FROM plan_de_empresa WHERE nit = '904900000';`.
9. 🆕 Di qué hace `OutboxedSessionFactory.OpenSession(bus)` (de `Wolverine.Marten.Publishing`): abre la sesión con el tenant del bus y la enrola en el outbox, como la sesión de cada handler. Que registren su `IDocumentSession` con `s.GetRequiredService<OutboxedSessionFactory>().OpenSession(s.GetRequiredService<IMessageContext>())`. Repiten el mismo PUT, con el `throw` y sin él.
10. 🆕 Di cómo se hace un PUT desde el test. `app.CreateClient()` da un `HttpClient` contra el host en memoria, y le ponen el token con `http.DefaultRequestHeaders.Authorization = new("Bearer", …)`, leído de la variable `ACME`. `Headers.ETag` es un `EntityTagHeaderValue`, y el PUT se arma con `HttpRequestMessage`, `JsonContent.Create`, `Headers.IfMatch.Add` y `SendAsync`.
11. En `ConcurrenciaTests` van tres tests: el 204 y luego el 412 con el mismo ETag, el 404 con `If-Match: "0"` a `emp-nadie`, y el 409 de dos altas con el mismo NIT. Id y NIT nuevos en cada corrida, y métodos `Cliente()`, `Alta` y `CambiarPlan` para lo que se repite.

**✅ Punto de control:** `curl -i -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-49/plan` da `ETag: "3"` y `{"id":"emp-49","nombre":"Textiles del Norte","plan":"Enterprise"}`. El PUT con `If-Match: "3"` y Premium da `204 No Content`, y repetido con `"3"` da `412 Precondition Failed`. Sin `If-Match` da 428, y con `If-Match: "0"` a `emp-nadie`, 404. Con el outbox, el PUT con `"4"` y el `throw` da 500 y `plan_de_empresa` queda sin filas. Sin el `throw` da 204 y `acme | 904900000 | Enterprise | 5`. `dotnet test` en verde, con los cuatro tests de `ConcurrenciaTests`. Si alguien no llega: solución en el `<details>` del Paso 1, 2, 3 o 4.

**🔨 Rómpelo (si hay tiempo):**
- La versión en un `if`: el PUT carga con `Cargar(id)` y compara `e.Version != versionVista` para responder 412. `dotnet test` sigue en verde. Luego quitan `FetchForWriting` de `Cargar(id)`. El test del 412 sigue en verde (manda sus dos PUT en fila), y cae el de dos escritores. El `if` no protege la ventana entre comparar y escribir. Que restauren `Cargar(id)` y el PUT.
- El anuncio después del commit: pasan el `PublishAsync` debajo del `CommitAsync` y cambian emp-49 a `Basico` con `If-Match: "5"`. Da 204, pero `plan_de_empresa` sigue en `Enterprise | 5`. Lo devuelven antes, con `// antes del CommitAsync: después, el anuncio no sale y nada falla`. Con `Premium` e `If-Match: "6"`, la fila queda en `Premium | 7`.

**Si se traban:**
- El PUT con la versión vieja da 409, no 412 → atraparon `EventStreamUnexpectedMaxEventIdException`. Atrapen la base, `JasperFx.ConcurrencyException`.
- El PUT a una empresa que no existe da 412 → es lo esperado con cualquier versión menos `"0"`. Si con `"0"` da 500, falta `AgregadoNoEncontradoException` en el `StatusCodeSelector`.
- El PUT da 500 con `Default tenant *DEFAULT* usage is disabled` → registren su `IDocumentSession` después de `AgregarEmpresas`.
- Los tests HTTP reciben 401 → falta `export ACME=$(cat ~/acme.jwt)` en la terminal de `dotnet test` (en PowerShell, `$env:ACME = Get-Content ~/acme.jwt`).

**Cierra con:** la versión que vio el usuario viaja en el `ETag` y el `If-Match` hasta `FetchForWriting`. Su choque vuelve al usuario como un 412, sin reintento, y el cambio se anuncia en la transacción de su hecho. Commit con la reflexión (la última): "¿por qué un choque con la versión que vio el usuario responde 412 y no se reintenta? ¿Por qué no basta el `if` que compara versiones? ¿Por qué el anuncio del PUT va en la sesión del outbox, antes del commit?"

**Puente (cierre del taller, lo dices en voz alta):** empezaron con un `UPDATE` que destruía el pasado y un diario de hechos en una lista en memoria. Terminan con Marten y Wolverine corriendo un servicio observado, con outbox durable, procesos con dueño, concurrencia optimista de la pantalla a la escritura y cada organización aislada por un tenant firmado. No adoptaron ninguna pieza a ciegas: la construyeron a mano y la reconocieron cuando llegó. Se llevan el porqué de cada pieza y cuándo no usarla, escrito en su `DECISIONES.md` y en sus commits. Adónde siguen: a `Cosmos.BuildingBlocks`, con el criterio de los 🔨 de las secciones 69 y 70. Su camino de escritura debe usar `FetchForWriting` con la versión del usuario, y cada anuncio debe salir en la transacción de su hecho, con un test o un comentario que nombre el síntoma. Usar la librería, mantenerla con criterio y aportar de vuelta.
