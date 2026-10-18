// Fuente: workshop-event-sourcing/taller.md, entrada "70 · La versión que vio el usuario".
// Es la última sección: no tiene "siguiente". Su puente es el cierre del taller (la última lámina).
import type { Seccion } from "./tipos";

export const seccion70: Seccion = {
  numero: 70,
  titulo: "La versión que vio el usuario",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que un cambio de plan desde una pantalla **choque** si la empresa cambió desde que el usuario la vio, que Facturación se entere de cada cambio que entra, y cerrar el taller con el criterio que llevas a la librería real.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "**10:00** · Ana abre la ficha y ve Básico.",
            "**10:03** · Beto la pasa a Premium.",
            "**10:05** · Ana guarda Enterprise.",
          ],
        },
        {
          k: "respuesta",
          texto: "Ya tienes `FetchForWriting`: ¿choca el guardado de Ana?",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Textiles del Norte",
      tarea:
        "Con el servicio corriendo, registra emp-49 por `POST /empresas`. **Una sola vez**: las versiones de los pasos siguientes cuentan con eso.",
      pasos: ["Corre este `curl`, una vez."],
      logro: {
        terminal: {
          comando:
            'curl -i -X POST http://localhost:5000/empresas -H "Authorization: Bearer $ACME" -H \'Content-Type: application/json\' -d \'{"empresaId":"emp-49","nit":"904900000","nombre":"Textiles del Norte","plan":"Basico"}\'',
          salida: ["HTTP/1.1 202 Accepted"],
          tono: "ok",
        },
        items: ["emp-49 nace en la versión 1, en plan Basico."],
      },
    },
    {
      tipo: "reto",
      titulo: "Beto y Ana guardan",
      tarea:
        "En tu `Program.cs`, dos pantallas guardan el plan de emp-49, cada una con su sesión y su unidad de trabajo.",
      pasos: [
        "Entre `builder.Build()` y `app.Run()`, la función `GuardarPlan(string plan)` de abajo.",
        "Llámala con `\"Premium\"` (Beto) y luego con `\"Enterprise\"` (Ana). Corre una vez.",
        "Mira el diario y la copia de Facturación.",
      ],
      logro: {
        items: [
          "`SELECT version, data->>'NuevoPlan' FROM mt_events` `WHERE stream_id = 'emp-49' ORDER BY version;` da `2 | Premium` y `3 | Enterprise`.",
          "`SELECT * FROM plan_de_empresa WHERE nit = '904900000';` sigue en `acme | 904900000 | Basico | 1`.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "async Task GuardarPlan(string plan)",
          "{",
          '    await using var s = store.LightweightSession("acme");',
          "    var uow = new MartenUnitOfWork(s);",
          '    (await uow.Cargar<Empresa>("emp-49")).CambiarPlan(plan);',
          "    await uow.CommitAsync();",
          "}",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Dos dolores",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "`FetchForWriting` validó la carga de las 10:05, no lo que Ana vio a las 10:00.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Y ningún cambio pasó por `CambiarPlanHandler`, el que anuncia `PlanDeEmpresaV1`.",
        },
        { k: "respuesta", texto: "Facturación cobraría Básico." },
      ],
    },
    {
      tipo: "reto",
      titulo: "El GET devuelve la versión",
      tarea:
        "Agrega un GET que devuelva el plan de la empresa con su versión en la cabecera `ETag`.",
      pasos: [
        "Quita de `Program.cs` el escenario de Beto y Ana.",
        "`MapGet(\"/empresas/{id}/plan\")` (`/empresas/{id}` ya es la ficha). Rehidrata con `AggregateStreamAsync<Empresa>` desde una `IQuerySession`. Si no existe, 404.",
        "Si existe, pon su `Version` en `res.Headers.ETag` y devuelve id, nombre y plan.",
      ],
      logro: {
        terminal: {
          comando:
            'curl -i -H "Authorization: Bearer $ACME" http://localhost:5000/empresas/emp-49/plan',
          salida: [
            'ETag: "3"',
            '{"id":"emp-49","nombre":"Textiles del Norte","plan":"Enterprise"}',
          ],
          tono: "ok",
        },
        items: [
          "Lee el diario, no una vista: la versión que importa es la del stream.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "ETag e If-Match",
          explicacion:
            'el GET devuelve la versión en `ETag`, entre comillas (`"2"`), y el cliente la manda de vuelta en `If-Match`. Si ya no coincide, 412 Precondition Failed. Sin `If-Match`, 428 Precondition Required.',
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cargar con la versión vista",
      tarea:
        "Agrega a `MartenUnitOfWork` una carga que valide la versión que vio el usuario.",
      pasos: [
        "Un segundo `Cargar<T>(string id, long versionVista)`, que le pasa esa versión a `FetchForWriting`.",
        "Con su puerta, y **sin** la primera línea: lo que vio el usuario se valida siempre contra Postgres.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "FetchForWriting<T>(id, versionEsperada)",
          explicacion:
            "si el stream ya no está en esa versión, lanza `JasperFx.ConcurrencyException`. Un stream que no existe está en la versión 0, y con 0 su `.Aggregate` llega en `null`.",
        },
        {
          k: "nota",
          texto:
            "Si otro escribe entre la carga y el guardado, sale `EventStreamUnexpectedMaxEventIdException`. `JasperFx.ConcurrencyException` atrapa los dos.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El PUT trae la versión",
      tarea:
        "Agrega un PUT que cambie el plan con la versión que vio el usuario, y responda 204, 412 o 428.",
      pasos: [
        "Junto a tus comandos, `record CambioDePlan(string Plan)`: el cuerpo del PUT.",
        "`MapPut(\"/empresas/{id}/plan\")`: lee `If-Match` sin las comillas (si no viene, 428), carga con la versión vista, cambia el plan, confirma y responde 204.",
        "En `catch (JasperFx.ConcurrencyException)`, responde 412.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
      tips: [
        {
          k: "lista",
          titulo: "🆕 Las piezas de HTTP",
          items: [
            "un parámetro `HttpRequest req`, y su `req.Headers.IfMatch`",
            "`MapPut`, como `MapPost` y `MapGet`",
            "`Results.NoContent()`: 204",
            "`Results.StatusCode(...)` con `StatusCodes.Status412PreconditionFailed` o `Status428PreconditionRequired`",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La sesión que escribe",
      tarea:
        "Dale al PUT una sesión que escribe en el tenant de la petición, y su 404 desde el borde.",
      pasos: [
        "El 404 de `AgregadoNoEncontradoException` va en tu `StatusCodeSelector`, no en un `catch` del PUT.",
        "Registra tu `IDocumentSession` scoped con `LightweightSession` y el `TenantId` del `IMessageContext`, como tu `IQuerySession`.",
        "Prueba el PUT con este `curl` y Premium, y otra vez con el mismo `If-Match: \"3\"`.",
      ],
      logro: {
        terminal: {
          comando:
            'curl -i -X PUT http://localhost:5000/empresas/emp-49/plan -H "Authorization: Bearer $ACME" -H \'If-Match: "3"\' -H \'Content-Type: application/json\' -d \'{"plan":"Premium"}\'',
          salida: ["HTTP/1.1 204 No Content"],
          tono: "ok",
        },
        items: [
          "Repetido con `\"3\"`: `412 Precondition Failed`.",
          "Sin `If-Match`: 428. Con `If-Match: \"0\"` a `emp-nadie`: 404.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "⚠️ No lo mandes por el bus: la política de reintento lo volvería a correr con la misma versión vista, y chocaría cada vez.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El PUT anuncia",
      tarea:
        "El PUT tampoco pasa por `CambiarPlanHandler`: `plan_de_empresa` sigue en `Basico | 1`, y Empresas va en Premium, versión 4. Haz que el PUT anuncie.",
      pasos: [
        "El PUT pide `IMessageBus bus`.",
        "Antes del `CommitAsync`, publica `new PlanDeEmpresaV1(e.Nit, e.Plan, e.Version + 1)`.",
      ],
      logro: { items: ["`Empresas.Historia` compila."] },
      tips: [
        {
          k: "piensa",
          texto:
            "`e.Version + 1` es la versión que tendrá el stream con el cambio nuevo.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Si el commit no llega",
      tarea:
        "Haz que el PUT falle entre el anuncio y el commit, y mira qué le llega a Facturación.",
      pasos: [
        "Justo después del `PublishAsync`: `throw new InvalidOperationException(\"antes del commit\");`",
        "Manda el PUT con `If-Match: \"4\"` y Enterprise.",
        "Borra la fila: `DELETE FROM plan_de_empresa WHERE nit = '904900000';`",
      ],
      logro: {
        items: [
          "Responde 500, y el diario sigue en la versión 4.",
          "Pero `plan_de_empresa` dice `Enterprise | 5`: Facturación recibió un plan que Empresas nunca guardó.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El anuncio, en el outbox",
      tarea:
        "Haz que la sesión del PUT esté en el outbox: lo que publica sale solo si su commit pasa.",
      pasos: [
        "Registra tu `IDocumentSession` con `s.GetRequiredService<OutboxedSessionFactory>().OpenSession(s.GetRequiredService<IMessageContext>())`.",
        "Repite el mismo PUT, con `If-Match: \"4\"` y Enterprise, con el `throw`.",
        "Quita el `throw` y repítelo.",
      ],
      logro: {
        items: [
          "Con el `throw`: 500, y `plan_de_empresa` queda sin filas.",
          "Sin el `throw`: 204, y `acme | 904900000 | Enterprise | 5`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "OutboxedSessionFactory.OpenSession(bus)",
          explicacion:
            "abre la sesión con el tenant del bus y la enrola en el outbox, como la sesión de cada handler. Vive en `Wolverine.Marten.Publishing`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Los tests de la pantalla",
      tarea:
        "En `ConcurrenciaTests`, fija con tests lo que acabas de ver con `curl`.",
      pasos: [
        "El 204 y luego el 412 con el mismo ETag. El 404 con `If-Match: \"0\"` a `emp-nadie`. El 409 de dos altas con el mismo NIT.",
        "Id y NIT nuevos en cada corrida, y métodos `Cliente()`, `Alta` y `CambiarPlan` para lo que se repite.",
        "Fija `export ACME=$(cat ~/acme.jwt)` en la terminal y corre `dotnet test`.",
      ],
      logro: {
        items: [
          "`dotnet test` en verde, con los **cuatro** tests de `ConcurrenciaTests`.",
        ],
      },
      tips: [
        {
          k: "lista",
          titulo: "🆕 Un PUT desde el test",
          items: [
            "`app.CreateClient()`: un `HttpClient` contra el host en memoria",
            '`http.DefaultRequestHeaders.Authorization = new("Bearer", …)`, con el token de `ACME`',
            "`Headers.ETag` es un `EntityTagHeaderValue`",
            "el PUT: `HttpRequestMessage`, `JsonContent.Create`, `Headers.IfMatch.Add` y `SendAsync`",
          ],
        },
        {
          k: "nota",
          texto: "En PowerShell: `$env:ACME = Get-Content ~/acme.jwt`.",
        },
      ],
    },
    {
      tipo: "rompelo",
      titulo: "La versión en un if",
      tarea:
        "Cambia la versión esperada por un `if` que compara versiones, y mira qué test lo nota.",
      pasos: [
        "El PUT carga con `Cargar(id)` y compara `e.Version != versionVista` para responder 412. Corre `dotnet test`.",
        "Quita `FetchForWriting` de `Cargar(id)`: vuelve a `FetchLatest` y al `Append` sin versión. Corre `dotnet test`.",
        "Restaura `Cargar(id)` y el PUT.",
      ],
      logro: {
        items: [
          "Con el `if`, todo en verde.",
          "Sin `FetchForWriting`, el test del 412 sigue en verde (manda sus dos PUT en fila), y cae el de dos escritores.",
          "El `if` no protege la ventana entre comparar y escribir.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El anuncio después del commit",
      tarea:
        "Pasa el anuncio debajo del commit, y mira si Facturación se entera.",
      pasos: [
        "En el PUT, pasa el `PublishAsync` debajo del `CommitAsync`. Cambia emp-49 a `Basico` con `If-Match: \"5\"`.",
        "Devuélvelo antes, con `// antes del CommitAsync: después, el anuncio no sale y nada falla`.",
        "Cambia emp-49 a `Premium` con `If-Match: \"6\"`.",
      ],
      logro: {
        items: [
          "Debajo del commit: 204, pero `plan_de_empresa` sigue en `Enterprise | 5`.",
          "De vuelta antes: la fila queda en `Premium | 7`.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La versión que vio el usuario viaja en el `ETag` y el `If-Match` hasta `FetchForWriting`. Su choque vuelve como un 412, sin reintento.",
      puntos: [
        {
          termino: "ETag e If-Match",
          definicion:
            "La versión sale en el GET y vuelve en el PUT: 412 si ya no coincide, 428 si no viene.",
        },
        {
          termino: "412, sin reintento",
          definicion:
            "El usuario relee y decide otra vez.",
        },
        {
          termino: "El anuncio, en el outbox",
          definicion:
            "Antes del `CommitAsync`, en la sesión del outbox: el hecho y su anuncio, en una transacción.",
        },
      ],
      commit: {
        mensaje: "ES · La versión que vio el usuario",
        preguntas: [
          "La última: ¿por qué un choque con la versión que vio el usuario responde 412 y no se reintenta?",
          "¿Por qué no basta el `if` que compara versiones? ¿Por qué el anuncio del PUT va en la sesión del outbox, antes del commit?",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Empezaste con un `UPDATE` que destruía el pasado. Terminas con Marten y Wolverine corriendo un servicio observado.",
      puntos: [
        {
          termino: "Lo que construiste",
          definicion:
            "Outbox durable, procesos con dueño, concurrencia optimista de la pantalla a la escritura y un tenant firmado por organización.",
        },
        {
          termino: "Nada a ciegas",
          definicion:
            "Cada pieza la hiciste a mano y la reconociste al llegar. Su porqué está en tu `DECISIONES.md`.",
        },
        {
          termino: "Adónde sigues",
          definicion:
            "A `Cosmos.BuildingBlocks`, con el criterio de los 🔨 de 69 y 70.",
        },
      ],
      guardar:
        "En la librería real: la escritura usa `FetchForWriting` con la versión del usuario, y cada anuncio sale en la transacción de su hecho, con un test o un comentario que nombre el síntoma. **Usar** la librería, **mantenerla** con criterio y **aportar** de vuelta.",
    },
  ],
};
