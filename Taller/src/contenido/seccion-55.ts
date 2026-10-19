// Fuente: workshop-event-sourcing/taller.md, entrada "55 · El contexto que falta".
import type { Seccion } from "./tipos";

export const seccion55: Seccion = {
  numero: 55,
  titulo: "El contexto que falta",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el servicio atienda a **dos organizaciones** (tenants) en la misma base, cada una con sus empresas, y que una petición sin tenant **falle** en vez de caer en un valor por defecto.",
    },
    {
      tipo: "planteamiento",
      titulo: "Dos organizaciones, un solo diario",
      bloques: [
        {
          k: "texto",
          texto:
            "Llega **globex**, otro despacho contable. Vidriería Andina, NIT 916000000, es cliente de acme y también de globex.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Qué pasa cuando los dos la registran?",
        },
        {
          k: "tabla",
          columnas: ["Registro", "Plan", "Respuesta"],
          filas: [
            ["emp-160 · NIT 916000000", "Basico", "202"],
            ["emp-161 · NIT 916000000", "Premium", "409"],
          ],
        },
        {
          k: "texto",
          texto:
            "`Ya existe una empresa con ese NIT.` Y `GET /empresas/emp-160` le muestra a globex la ficha de acme.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Dos niveles",
      bloques: [
        {
          k: "lista",
          marca: "punto",
          porItem: true,
          items: [
            "Una `Empresa` es un **stream**.",
            "Un **tenant** es la organización que usa la plataforma: acme, globex.",
          ],
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "El 409 viene de la **llave** del localizador, el NIT, que es una para todas las organizaciones.",
        },
        {
          k: "respuesta",
          texto: "Un filtro en las consultas no arregla una llave.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Una base nueva",
      tarea:
        "Crea una base nueva para el servicio y recrea la de los tests: Marten no cambia la llave de las tablas que ya existen.",
      pasos: [
        "Corre los cuatro `docker exec` de la lámina siguiente: crean `empresas`, recrean `empresas_tests` y les copian las tablas de Facturación.",
        "Desde la raíz, apunta a `Database=empresas` la variable `CADENA_POSTGRES`, los user-secrets y `~/secretos-empresas/ConnectionStrings__Postgres`, con los tres comandos de la lámina siguiente.",
        "Si usas CosmosLens, arráncalo con la cadena nueva.",
      ],
      logro: {
        items: [
          "`dotnet user-secrets list --project Empresas.Historia` muestra `Database=empresas`.",
        ],
      },
      tips: [
        {
          k: "nota",
          texto:
            "Tus empresas de antes se quedan en la base vieja: llevarlas a un tenant es una migración aparte.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La base nueva y la cadena que apunta a ella",
      piezas: [
        {
          etiqueta: "Las dos bases, con las tablas de Facturación:",
          lenguaje: "bash",
          lineas: [
            'docker exec empresas-db psql -U postgres -c "CREATE DATABASE empresas;"',
            'docker exec empresas-db psql -U postgres -c "DROP DATABASE empresas_tests WITH (FORCE);" \\',
            '  -c "CREATE DATABASE empresas_tests;"',
            'docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados \\',
            '  -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas"',
            'docker exec empresas-db sh -c "pg_dump -U postgres -s -t multas -t procesados \\',
            '  -t plan_de_empresa -t mensualidades postgres | psql -U postgres -d empresas_tests"',
          ],
        },
        {
          etiqueta:
            "Desde la raíz de tu solución (en PowerShell, `$env:CADENA_POSTGRES = \"…\"` y `Set-Content`):",
          lenguaje: "bash",
          lineas: [
            'export CADENA_POSTGRES="Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=empresas"',
            'dotnet user-secrets set "ConnectionStrings:Postgres" "$CADENA_POSTGRES" \\',
            '  --project Empresas.Historia',
            'echo "$CADENA_POSTGRES" > ~/secretos-empresas/ConnectionStrings__Postgres',
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El tenant en la llave",
      tarea:
        "Que cada hecho y cada documento lleven su tenant en la llave, para que acme y globex puedan tener el mismo NIT.",
      pasos: [
        "En el `AddMarten` de `AgregarEmpresas`, después de la línea de `StreamIdentity`, las dos líneas de abajo.",
        "Arranca el servicio y registra emp-160 (NIT `916000000`, Basico).",
        "Con `docker exec -it empresas-db psql -U postgres -d empresas`, corre `SELECT tenant_id, id FROM mt_streams;`",
      ],
      logro: {
        terminal: {
          comando: "SELECT tenant_id, id FROM mt_streams;",
          salida: ["*DEFAULT* | emp-160"],
          tono: "ok",
        },
        items: ["Responde 202, y el hecho queda en `*DEFAULT*`: nadie le dijo el tenant."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "tenancy conjoined",
          explicacion:
            "todos los tenants en las mismas tablas, con el tenant en la llave: `(tenant_id, id)`. `TenancyStyle` vive en `JasperFx.MultiTenancy`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Events.TenancyStyle = TenancyStyle.Conjoined;",
          "opts.Policies.AllDocumentsAreMultiTenanted();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La petición dice su tenant",
      tarea:
        "Que el servicio lea de qué organización es cada petición, del header `X-Tenant-Id`, y la ponga en el bus.",
      pasos: [
        "En tu `app.Use` de la correlación, lee `X-Tenant-Id` y ponlo en `bus.TenantId`, como abajo.",
        'Repite los dos registros, uno con `-H "X-Tenant-Id: acme"` (emp-160) y otro con `-H "X-Tenant-Id: globex"` (emp-161).',
      ],
      logro: {
        items: ["Los dos registros dan **202**."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "bus.TenantId",
          explicacion:
            "Wolverine lo copia al sobre de todo lo que la petición invoca, y abre la sesión de cada handler con ese tenant.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var tenant = contexto.Request.Headers["X-Tenant-Id"].ToString();',
          "if (!string.IsNullOrWhiteSpace(tenant)) bus.TenantId = tenant;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Las consultas, con su tenant",
      tarea:
        'El GET de emp-161 con `-H "X-Tenant-Id: globex"` da 404: la `IQuerySession` de Marten se abre sin tenant. Registra la tuya, abierta con el tenant del bus.',
      pasos: [
        "En `Program.cs`, **después** de `builder.AgregarEmpresas(...)`, el `AddScoped` de abajo.",
        'Pide emp-161 y emp-160 con `-H "X-Tenant-Id: globex"`.',
      ],
      logro: {
        items: [
          "emp-161 como globex: **200**, Vidriería Andina, Premium.",
          "emp-160 como globex: **404**.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "AddScoped<IQuerySession>(s => …)",
          explicacion:
            "registra tu propia sesión, una por petición. Si va después de `AgregarEmpresas`, gana la tuya.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddScoped<IQuerySession>(s =>",
          "    s.GetRequiredService<IDocumentStore>()",
          "     .QuerySession(s.GetRequiredService<IMessageContext>().TenantId!));",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "El default silencioso",
      bloques: [
        {
          k: "terminal",
          comando:
            "SELECT tenant_id, id FROM mt_streams WHERE id LIKE 'emp-16%' ORDER BY created;",
          salida: ["*DEFAULT* | emp-160", "acme      | emp-160", "globex    | emp-161"],
        },
        {
          k: "texto",
          texto:
            "La fila de `*DEFAULT*` respondió 202, y **ninguna organización la ve**.",
        },
        {
          k: "texto",
          texto: "Registra emp-162 sin `X-Tenant-Id`: 202, y cae en `*DEFAULT*`.",
        },
        {
          k: "respuesta",
          texto: "Nadie lo nota hasta que un dato «desaparece».",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Sin tenant, falla",
      tarea:
        "Apaga el tenant por defecto, para que una petición sin tenant lance en vez de caer en `*DEFAULT*`.",
      pasos: [
        "En `AgregarEmpresas`, junto a las dos líneas de la tenancy: `opts.Advanced.DefaultTenantUsageEnabled = false;`",
        "Reinicia y registra emp-163 **sin** `X-Tenant-Id`.",
      ],
      logro: {
        terminal: {
          tono: "error",
          salida: ["500   Default tenant *DEFAULT* usage is disabled…"],
        },
        items: ["En `mt_streams` no hay nada de emp-163."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "fail-fast",
          explicacion:
            "abrir una sesión sin tenant lanza `DefaultTenantUsageDisabledException`.",
        },
        {
          k: "nota",
          texto:
            'Desde aquí, una siembra abre `store.LightweightSession("acme")`.',
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El worker dice su tenant",
      tarea:
        "El worker no corre en una petición y lanza lo mismo. Que reciba el tenant como segundo argumento e invoque con él.",
      pasos: [
        "En `Empresas.Worker/Program.cs`, `var tenant = args[1];` y cada comando con `bus.InvokeForTenantAsync(tenant, …)`.",
        "Deja en `cambios.csv` la línea `emp-160;Premium`.",
        "Córrelo con el comando de abajo.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run -- … acme",
          salida: ["emp-160: plan Premium"],
          tono: "ok",
        },
        items: ["La ficha de emp-160 como acme dice `Premium`."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "InvokeForTenantAsync(tenant, comando)",
          explicacion:
            "invoca con ese tenant en el sobre, sin petición de por medio.",
        },
      ],
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "DirectorioDeSecretos=$HOME/secretos-empresas dotnet run -- ../cambios.csv acme",
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "El worker dice su tenant",
      piezas: [
        {
          etiqueta: "`Empresas.Worker/Program.cs`",
          lenguaje: "csharp",
          lineas: [
            "var tenant = args[1];   // la organización del archivo",
            "foreach (var linea in await File.ReadAllLinesAsync(args[0]))",
            "{",
            "    var campos = linea.Split(';');",
            "    await bus.InvokeForTenantAsync(tenant, new CambiarPlanDeEmpresa(campos[0], campos[1]));",
            '    Console.WriteLine($"{campos[0]}: plan {campos[1]}");',
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El tenant viaja en el sobre",
      tarea:
        "Suspende una empresa de acme y comprueba que todo el proceso, con las respuestas y el plazo, queda en acme.",
      pasos: [
        'Suspende emp-160 con `-H "X-Tenant-Id: acme"`.',
        "En `psql`: `SELECT tenant_id, type FROM mt_events WHERE stream_id = 'susp-emp-160-3' ORDER BY version;`",
        "Espera diez segundos: corre el plazo.",
      ],
      logro: {
        terminal: {
          salida: [
            "acme | suspension_solicitada",
            "acme | cobro_de_multa_confirmado",
            "acme | revocacion_de_accesos_confirmada",
            "acme | suspension_efectiva",
          ],
          tono: "ok",
        },
        items: ["El plazo corre sin dead letters."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La petición dice acme, el sobre globex",
      tarea:
        "Invoca el registro con otro tenant que el de la petición, y mira dónde escribe.",
      pasos: [
        'En `MapPost("/empresas", …)`, cambia `bus.InvokeAsync(cmd)` por `bus.InvokeForTenantAsync("globex", cmd)`.',
        'Registra emp-164 (NIT `916400000`) con `-H "X-Tenant-Id: acme"`.',
        "Mira `SELECT tenant_id FROM mt_streams WHERE id = 'emp-164';` y devuelve el `InvokeAsync`.",
      ],
      logro: {
        items: [
          "Responde 202, y su `tenant_id` es `globex`: **gana el tenant del sobre**.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "Una vista sin tenant",
      tarea: "Quita el tenant de los documentos y arranca.",
      pasos: [
        "Comenta `opts.Policies.AllDocumentsAreMultiTenanted();` y arranca.",
        "Descoméntala.",
      ],
      logro: {
        terminal: {
          comando: "dotnet run",
          tono: "error",
          salida: [
            "Tenancy storage style mismatch between the events (Conjoined)",
            "and the aggregate type VistaSuspendida (Single)",
          ],
        },
        items: ["El servicio **no arranca**."],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Un tenant que se rellena por defecto deja datos en la organización equivocada **sin error**. La cura: tenancy conjoined y **fail-fast**.",
      puntos: [
        {
          termino: "Tenant",
          definicion:
            "La organización que usa la plataforma. Una `Empresa` es un stream dentro de él.",
        },
        {
          termino: "Tenancy conjoined",
          definicion: "Todos los tenants en las mismas tablas, con el tenant en la llave.",
        },
        {
          termino: "Fail-fast",
          definicion: "Sin tenant, lanza en la puerta en vez de caer en `*DEFAULT*`.",
        },
      ],
      decision:
        "Tenancy conjoined, y sin tenant Marten lanza. El borde pone el tenant en el bus; handlers y consultas lo toman de ahí.",
      commit: {
        mensaje: "ES · El contexto que falta",
        preguntas: [
          "¿Por qué un tenant que se rellena por defecto es más peligroso que uno que lanza?",
          "¿Por qué el handler del plazo toma el tenant del sobre?",
        ],
      },
      siguiente: {
        seccion: "56 · Probar que aísla",
        texto:
          "¿Siguen verdes los tests? ¿Alguno prueba que acme no ve lo de globex?",
      },
    },
  ],
};
