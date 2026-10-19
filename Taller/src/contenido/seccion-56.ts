// Fuente: workshop-event-sourcing/taller.md, entrada "56 · Probar que aísla".
import type { Seccion } from "./tipos";

export const seccion56: Seccion = {
  numero: 56,
  titulo: "Probar que aísla",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que los tests corran **con un tenant**, como el servicio, y que uno se ponga en rojo si un cambio deja que un tenant vea lo de otro.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "El servicio ya separa a acme de globex. ¿Cómo sabremos que un cambio de mañana **no rompe** esa separación?",
        },
        {
          k: "terminal",
          comando: "dotnet test      # con CADENA_POSTGRES fijada",
          tono: "error",
          salida: [
            "Con error CarreraDelPagoTests…",
            "Con error RearmarTests…",
            "Con error ReservaDelNitTests…",
            "Con error VistaSuspendidaTests… (dos)",
            "   DefaultTenantUsageDisabledException : Default tenant *DEFAULT* usage is disabled.",
          ],
        },
        {
          k: "respuesta",
          texto:
            "Prender el tenant por defecto solo en el fixture nos devuelve a la copia.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Cada test, con su tenant",
      tarea:
        "Que los tests de la colección `\"daemon\"` siembren, invoquen y lean en acme.",
      pasos: [
        "En los cuatro archivos de la colección `\"daemon\"`, cada sesión e invocación con `\"acme\"`, como abajo.",
        "Cada `QuerySession()` también lleva `\"acme\"`.",
        "Corre `dotnet test`.",
      ],
      logro: { items: ["`dotnet test`: **todo en verde**."] },
      tips: [
        {
          k: "nota",
          texto:
            "El que más se olvida es el `Registrar` de `ReservaDelNitTests`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await using (var s = daemon.Store.LightweightSession("acme"))',
          'await daemon.Bus.InvokeForTenantAsync("acme", new SuspenderEmpresa("emp-14", "mora"));',
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Verde, con una fuga",
      tarea:
        "Quita la política general y marca multi-tenant solo las tres vistas. Mira si los tests lo notan.",
      pasos: [
        "En esta sección corre **solo** `dotnet test`: no arranques el servicio hasta devolver `AgregarEmpresas` como estaba.",
        "En `AgregarEmpresas`, cambia `AllDocumentsAreMultiTenanted()` por las tres líneas de abajo, y corre `dotnet test`.",
        "Con `docker exec -it empresas-db psql -U postgres -d empresas_tests`, corre `\\d mt_doc_localizador`.",
      ],
      logro: {
        terminal: {
          comando: "\\d mt_doc_localizador",
          salida: ['"pkey_mt_doc_localizador_id" PRIMARY KEY, btree (id)'],
          tono: "error",
        },
        items: [
          "`dotnet test` sigue en verde, pero el localizador **perdió el tenant**.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Schema.For<VistaSuspendida>().MultiTenanted();",
          "opts.Schema.For<EmpresaDetalle>().MultiTenanted();",
          "opts.Schema.For<Tablero>().MultiTenanted();",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Un test con dos tenants",
      tarea:
        "Escribe un test en que acme y globex registran el mismo NIT, y globex solo ve lo suyo.",
      pasos: [
        "En `Empresas.Tests/DosTenantsTests.cs`, la clase `DosTenantsTests`, con `[Collection(\"daemon\")]` y el mismo `InitializeAsync` y `DisposeAsync` de tus otros tests.",
        "Registra **por el bus** emp-165 en acme y emp-166 en globex, las dos con NIT `916500000`, como abajo.",
        "Con `daemon.Store.QuerySession(\"globex\")`, afirma: `LoadAsync<Localizador>(\"916500000\")` lleva a `emp-166`, y `Events.FetchStreamStateAsync(\"emp-165\")` es `null`.",
      ],
      logro: { items: ["El test compila."] },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'await daemon.Bus.InvokeForTenantAsync("acme",',
          '    new RegistrarEmpresa("emp-165", "916500000", "Vidriería Andina", "Basico"));',
          'await daemon.Bus.InvokeForTenantAsync("globex",',
          '    new RegistrarEmpresa("emp-166", "916500000", "Vidriería Andina", "Premium"));',
        ],
      },
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Un test con dos tenants",
      piezas: [
        {
          etiqueta: "`Empresas.Tests/DosTenantsTests.cs`: dos organizaciones, el mismo NIT",
          lenguaje: "csharp",
          lineas: [
            "using Marten;",
            "",
            '[Collection("daemon")]',
            "public class DosTenantsTests(HostConDaemon daemon) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "",
            "    [Fact]",
            "    public async Task Globex_registra_el_NIT_de_acme_y_solo_ve_su_empresa()",
            "    {",
            '        await daemon.Bus.InvokeForTenantAsync("acme", new RegistrarEmpresa("emp-165", "916500000", "Vidriería Andina", "Basico"));',
            '        await daemon.Bus.InvokeForTenantAsync("globex", new RegistrarEmpresa("emp-166", "916500000", "Vidriería Andina", "Premium"));   // el mismo NIT, otro tenant',
            "",
            '        await using var q = daemon.Store.QuerySession("globex");',
            '        Assert.Equal("emp-166", (await q.LoadAsync<Localizador>("916500000"))?.Stream);   // el NIT lleva a la empresa de globex',
            '        Assert.Null(await q.Events.FetchStreamStateAsync("emp-165"));                     // los hechos de acme no existen para globex',
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Con la fuga, y sin ella",
      tarea:
        "Corre el test con la fuga puesta: tiene que caer. Luego quita la fuga.",
      pasos: [
        "Con las tres líneas de `MultiTenanted()`, corre `dotnet test --filter DosTenantsTests`.",
        "Devuelve `AllDocumentsAreMultiTenanted()` en lugar de las tres líneas, y corre `dotnet test`.",
        "Mira otra vez `\\d mt_doc_localizador`.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test --filter DosTenantsTests",
          tono: "error",
          salida: [
            "JasperFx.DocumentAlreadyExistsException :",
            "Document already exists Localizador: 916500000",
          ],
        },
        items: [
          "Sin la fuga pasa todo, `DosTenantsTests` incluido.",
          "`\\d mt_doc_localizador` muestra `PRIMARY KEY, btree (tenant_id, id)`.",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El índice que no sabe de tenants",
      tarea:
        "Reserva el NIT con un índice único sobre `EmpresaDetalle` y corre el test de dos tenants.",
      pasos: [
        "En el `AddMarten` de `AgregarEmpresas`: `opts.Schema.For<EmpresaDetalle>().UniqueIndex(d => d.Nit);` y corre `dotnet test --filter DosTenantsTests`.",
        "Cámbialo por el índice **por tenant** de abajo (`using Marten.Schema;` y `using Marten.Schema.Indexing.Unique;`). Pasan todos.",
        "Quita la línea al terminar.",
      ],
      logro: {
        terminal: {
          comando: "dotnet test --filter DosTenantsTests",
          tono: "error",
          salida: [
            "Document already exists EmpresaDetalle: emp-166",
            '23505 … "mt_doc_empresadetalle_uidx_nit"',
          ],
        },
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          "opts.Schema.For<EmpresaDetalle>().UniqueIndex(",
          '    UniqueIndexType.Computed, "uq_empresadetalle_nit", TenancyScope.PerTenant, d => d.Nit);',
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "La separación entre tenants solo se prueba con **dos tenants que comparten un dato**, corriendo con la configuración del servicio. Toda reserva de un dato es **por tenant**.",
      puntos: [
        {
          termino: "Test de aislamiento",
          definicion:
            "Dos tenants con el mismo NIT: cada uno ve solo lo suyo.",
        },
        {
          termino: "TenancyScope.PerTenant",
          definicion: "Un índice único que reserva el dato dentro de cada tenant.",
        },
      ],
      decision:
        "Un test con dos tenants que comparten un NIT corre con la configuración del servicio. Toda reserva de un dato es por tenant.",
      commit: {
        mensaje: "ES · Probar que aísla",
        preguntas: [
          "¿Por qué tus tests pasaron con el localizador sin tenant?",
          "¿Qué otro dato reservarías por tenant, y cómo lo probarías?",
        ],
      },
      siguiente: {
        seccion: "57 · El tenant viene firmado",
        texto:
          "El tenant llega en `X-Tenant-Id`, y ese header lo escribe quien llama. Nada impide que quien llama por acme ponga `globex`.",
      },
    },
  ],
};
