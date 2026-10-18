// Fuente: workshop-event-sourcing/taller.md, entrada "57 · El tenant viene firmado".
import type { Seccion } from "./tipos";

export const seccion57: Seccion = {
  numero: 57,
  titulo: "El tenant viene firmado",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el tenant y el usuario salgan de un **token que el servicio verifica**, que toda ruta exija ese token, y que cada pantalla en vivo vea solo lo de su organización.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Hoy el tenant lo elige quien llama: le basta escribir un header.",
        },
        {
          k: "texto",
          tam: "grande",
          texto: "¿Qué impide que alguien de acme escriba `globex`?",
        },
        {
          k: "terminal",
          comando:
            'curl -H "X-Tenant-Id: globex" http://localhost:5000/empresas/emp-161',
          salida: [
            '{"id":"emp-161","nombre":"Vidriería Andina","plan":"Premium",…}',
          ],
          tono: "error",
        },
        {
          k: "respuesta",
          texto: "Lees la ficha de globex **sin decir quién eres**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un token por organización",
      tarea:
        "Agrega el paquete que valida los tokens y crea un token de desarrollo para acme y otro para globex.",
      pasos: [
        "Desde la raíz, corre los comandos de la lámina siguiente: el paquete, el archivo `appsettings.Development.json` vacío y los dos tokens.",
        "En cada terminal donde los uses: `ACME=$(cat ~/acme.jwt); GLOBEX=$(cat ~/globex.jwt)`",
      ],
      logro: {
        items: ["`~/acme.jwt` y `~/globex.jwt` tienen cada uno un token."],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "JWT",
          explicacion:
            "un token firmado que va en `Authorization: Bearer …`. Lleva claims: `sub` es el id del usuario, y `tenant` el que le agregas. Si alguien cambia un claim, la firma ya no coincide.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "El paquete y los dos tokens",
      piezas: [
        {
          etiqueta: "Desde la raíz de tu solución:",
          lenguaje: "bash",
          lineas: [
            "dotnet add Empresas.Historia package Microsoft.AspNetCore.Authentication.JwtBearer",
            'echo "{}" > Empresas.Historia/appsettings.Development.json',
          ],
        },
        {
          etiqueta: "El token de acme y el de globex:",
          lenguaje: "bash",
          lineas: [
            "dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0001 \\",
            "  --claim tenant=acme --claim email=ana@acme.co --output token > ~/acme.jwt",
            "dotnet user-jwts create --project Empresas.Historia --audience empresas --name u-0002 \\",
            "  --claim tenant=globex --claim email=gus@globex.co --output token > ~/globex.jwt",
          ],
        },
      ],
      luego:
        "Luego, en cada terminal donde los uses: `ACME=$(cat ~/acme.jwt); GLOBEX=$(cat ~/globex.jwt)`",
    },
    {
      tipo: "reto",
      titulo: "El tenant sale del token",
      tarea:
        "Que el servicio valide el token de cada petición y tome el tenant del claim `tenant`, no del header.",
      pasos: [
        "En `Program.cs`, antes de `builder.Build()`: `builder.Services.AddAuthentication().AddJwtBearer();`",
        "`app.UseAuthentication();` **antes** de tu `app.Use`.",
        "Dentro del `app.Use`, el tenant sale del claim, como abajo. El header ya no cuenta.",
      ],
      logro: {
        items: [
          'Con `$ACME` y `-H "X-Tenant-Id: globex"`, emp-161 da **404**.',
          "Con `$GLOBEX`, emp-161 da su ficha.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var tenant = contexto.User.FindFirst("tenant")?.Value;',
          "if (tenant is not null) bus.TenantId = tenant;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un token falsificado",
      tarea:
        "Arma un token con los claims de globex y la firma de acme, y pide la ficha de globex con él.",
      pasos: [
        "Arma el token falso con el comando de abajo.",
        'Pide emp-161 con `-H "Authorization: Bearer $FALSO"`.',
      ],
      logro: {
        items: [
          "Responde **500**, sin la ficha.",
          "El log dice `IDX10517: Signature validation failed`.",
        ],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "FALSO=$(echo $ACME | cut -d. -f1).$(echo $GLOBEX | cut -d. -f2).$(echo $ACME | cut -d. -f3)",
        ],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "Un anónimo en la pantalla",
      bloques: [
        {
          k: "texto",
          texto:
            "Sin token, abre `curl -N http://localhost:5000/suspensiones/en-vivo`. Suspende emp-161 con `$GLOBEX`.",
        },
        {
          k: "terminal",
          salida: [
            "event: suspension-efectiva",
            'data: {"suspensionId":"susp-emp-161-2","nit":"916000000"}',
          ],
          tono: "error",
        },
        {
          k: "respuesta",
          texto: "Un anónimo ve las suspensiones de globex.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "La regla va al revés: **todo exige token**, y lo abierto se declara.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Toda ruta exige token",
      tarea:
        "Registra una política por defecto: toda ruta pide un token válido con los claims `tenant` y `sub`.",
      pasos: [
        "Antes de `builder.Build()`, la política de abajo (`using Microsoft.AspNetCore.Authorization;`).",
        "`app.UseAuthorization();` **después** de tu `app.Use`.",
        "Prueba sin token y con `$ACME`.",
      ],
      logro: {
        items: [
          "Sin token, emp-161 y la pantalla dan **401**.",
          "Con `$ACME`, **403**: falta un paso.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: "política por defecto",
          explicacion: "la regla de toda ruta que no diga otra.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(",
          "    new AuthorizationPolicyBuilder()",
          '        .RequireAuthenticatedUser().RequireClaim("tenant").RequireClaim("sub")',
          "        .Build());",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Los claims, con su nombre",
      tarea:
        "`AddJwtBearer` renombra `sub` a un nombre largo, y la política no lo encuentra. Déjalo con su nombre, y prueba un token sin tenant.",
      pasos: [
        "Cambia el registro por `AddJwtBearer(o => o.MapInboundClaims = false)`.",
        "Crea un token sin tenant con el comando de abajo.",
        "Prueba emp-160 con `$ACME` y con `$SIN`.",
      ],
      logro: {
        items: ["Con `$ACME`, **200**.", "Con `$SIN`, **403**."],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          "SIN=$(dotnet user-jwts create --project Empresas.Historia \\",
          "  --audience empresas --name u-0009 --output token)",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "La pantalla manda su token",
      tarea:
        "La `Pantalla` recibe 401. Que mande el token que le pasas al arrancarla.",
      pasos: [
        "En `Pantalla/Program.cs`, después de crear el `HttpClient`: `http.DefaultRequestHeaders.Authorization = new(\"Bearer\", args[0]);`",
        "Córrela con `dotnet run --project Pantalla -- $ACME`.",
      ],
      logro: {
        items: ["La pantalla queda abierta, sin 401."],
      },
    },
    {
      tipo: "planteamiento",
      titulo: "La pantalla de acme oye a globex",
      bloques: [
        {
          k: "texto",
          texto:
            "Con la pantalla de acme abierta, globex registra y suspende emp-171 (NIT 917100000), con `$GLOBEX`.",
        },
        {
          k: "terminal",
          comando: "dotnet run --project Pantalla -- $ACME",
          salida: ["NIT 917100000: suspendida"],
          tono: "error",
        },
        {
          k: "respuesta",
          texto:
            "Hay **un solo canal** para todas las organizaciones.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Un canal por tenant",
      tarea:
        "Que cada organización tenga su canal, y que un aviso sin tenant no vaya a nadie.",
      pasos: [
        "En `EnVivo`, cambia el canal por el método `De(string? tenant)` de abajo, que lanza si `tenant.IsDefaultTenant()`.",
        "`EnVivoHandler` recibe también el `IMessageContext mensaje`, y escribe en `EnVivo.De(mensaje.TenantId)`.",
        "El endpoint recibe el `ClaimsPrincipal usuario`, y `Leer` lee `EnVivo.De` con el claim `tenant`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "ConcurrentDictionary · GetOrAdd(tenant, …)",
          explicacion:
            "un diccionario que usan varios hilos a la vez: devuelve el canal del tenant, y lo crea la primera vez.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "static readonly ConcurrentDictionary<string, Channel<SuspensionEfectivaV1>> _porTenant = new();",
          "public static Channel<SuspensionEfectivaV1> De(string? tenant) =>",
          "    tenant.IsDefaultTenant()",
          '        ? throw new InvalidOperationException("Un aviso sin tenant no va a nadie.")',
          "        : _porTenant.GetOrAdd(tenant!, _ => Channel.CreateUnbounded<SuspensionEfectivaV1>());",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Dos pantallas",
      tarea: "Abre una pantalla por organización y comprueba que cada una ve solo lo suyo.",
      pasos: [
        "Abre una segunda pantalla con `$GLOBEX`.",
        "Con `$ACME`, registra y suspende emp-173 (NIT 917300000).",
        "Con `$GLOBEX`, registra y suspende emp-174 (NIT 917400000).",
      ],
      logro: {
        items: [
          "La pantalla de acme muestra solo `NIT 917300000`.",
          "La pantalla de globex muestra solo `NIT 917400000`.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Quién lo hizo",
      tarea:
        "Que cada hecho guarde el usuario que lo pidió, el `sub` del token, también en los hechos del proceso.",
      pasos: [
        "En `AgregarEmpresas`: `opts.EnableRelayOfUserName = true;` en `AddWolverine`, y `opts.Events.MetadataConfig.UserNameEnabled = true;` en `AddMarten`.",
        "En tu `app.Use`, `bus.UserName` toma el claim `sub`.",
      ],
      logro: { items: ["`dotnet build` compila."] },
      tips: [
        {
          k: "nuevo",
          idioma: "bus.UserName",
          explicacion:
            "viaja en el sobre, como el `TenantId`, y Marten lo guarda en `mt_events.user_name`.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "La historia dice quién",
      tarea:
        "Registra y suspende una empresa con el token de acme, y mira quién quedó en cada hecho.",
      pasos: [
        'Reinicia, y registra y suspende emp-175 con `$ACME` y `-H "X-Correlation-Id: soporte-175"`.',
        "En `psql`, la consulta de abajo.",
      ],
      logro: {
        items: [
          "Los hechos de `emp-175` dicen `acme | u-0001`.",
          "Los de `susp-emp-175-2`, el proceso, también.",
        ],
      },
      ejemplo: {
        lenguaje: "sql",
        lineas: [
          "SELECT stream_id, tenant_id, user_name, type FROM mt_events",
          "WHERE correlation_id = 'soporte-175' ORDER BY seq_id;",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Ana cambia de email",
      tarea:
        "Crea otro token de acme para el mismo usuario con el email nuevo, y comprueba que la historia sigue a su nombre.",
      pasos: [
        "Crea un token como el de acme, con el mismo `--name u-0001` y `--claim tenant=acme`, pero con `--claim email=ana.perez@acme.co`.",
        "Con él, registra emp-177 (NIT 917700000).",
        "Corre `SELECT stream_id, type FROM mt_events WHERE user_name = 'u-0001';`",
      ],
      logro: {
        items: ["Trae emp-175 y emp-177: la historia guarda el `sub`, que no cambia."],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El grupo que pide la pantalla",
      tarea:
        "Deja que quien llama diga de qué organización quiere oír, en la query string.",
      pasos: [
        "El endpoint recibe también `string grupo` y lee `EnVivo.De(grupo)`. Cierra las dos pantallas.",
        'Abre `curl -N -H "Authorization: Bearer $ACME" "http://localhost:5000/suspensiones/en-vivo?grupo=globex"`.',
        "Con `$GLOBEX`, registra y suspende emp-176 (NIT 917600000). Luego devuélvele el claim.",
      ],
      logro: {
        items: [
          "El token de acme **oye a globex**: la política exige un token, y el token no decide nada.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El tenant decide qué datos ve una petición, así que sale de un **claim firmado**. Toda ruta exige token, y abrir una se hace a propósito.",
      puntos: [
        {
          termino: "JWT",
          definicion: "Un token firmado con claims: cambiar uno rompe la firma.",
        },
        {
          termino: "Política por defecto",
          definicion: "Toda ruta exige token con `tenant` y `sub`; lo abierto se declara.",
        },
        {
          termino: "sub",
          definicion: "El id del usuario, que no cambia. La historia guarda el `sub`; el email es para mostrar.",
        },
      ],
      decision:
        "El tenant y el usuario salen del token firmado, nunca de un header. Toda ruta exige token.",
      commit: {
        mensaje: "ES · El tenant viene firmado",
        preguntas: [
          "¿Por qué el tenant no puede salir de un header, aunque solo lo mande tu pantalla?",
          "¿Qué ruta dejarías abierta, y cómo evitas abrir otra sin querer?",
        ],
      },
      siguiente: {
        seccion: "58 · El trabajo que nadie pidió",
        texto:
          "Ningún pedido trae el cobro del mes: hoy nadie llama a `ProcesoMensual`.",
      },
    },
  ],
};
