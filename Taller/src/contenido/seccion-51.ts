// Fuente: workshop-event-sourcing/taller.md, entrada "51 · El arnés usa la misma configuración".
import type { Seccion } from "./tipos";

const choque = "Rojo, con `EventStreamUnexpectedMaxEventIdException`.";

export const seccion51: Seccion = {
  numero: 51,
  titulo: "El arnés usa la misma configuración",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que el host de los tests arranque con `AgregarEmpresas`, para que **un verde hable del servicio**, y fijar con un test por el bus que diez avisos del mismo pago dejan uno solo.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "grande",
          texto:
            "Un banco reenvía su aviso de pago cuando no le respondemos a tiempo. El servicio lo aguanta.",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "Fijémoslo en un test, como llega en producción: **por el bus, diez a la vez, contra Postgres**.",
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La carrera del pago (1 de 2)",
      piezas: [
        {
          etiqueta: "En `Empresas.Tests/CarreraDelPagoTests.cs`, en tu colección `\"daemon\"`:",
          lenguaje: "csharp",
          lineas: [
            "using Marten;",
            "",
            '[Collection("daemon")]',
            "public class CarreraDelPagoTests(HostConDaemon daemon) : IAsyncLifetime",
            "{",
            "    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();",
            "    public Task DisposeAsync() => Task.CompletedTask;",
            "",
            "    [Fact]",
            "    public async Task Diez_avisos_del_mismo_pago_a_la_vez_dejan_un_pago()",
            "    {",
          ],
        },
      ],
    },
    {
      tipo: "codigo",
      de: "reto",
      titulo: "La carrera del pago (2 de 2)",
      piezas: [
        {
          etiqueta: "A continuación, el cuerpo del test:",
          lenguaje: "csharp",
          lineas: [
            "        await using (var s = daemon.Store.LightweightSession())",
            "        {",
            '            s.Events.StartStream<Empresa>("emp-146",',
            '                new EmpresaRegistrada("914600000", "Vidriería Norte", "Basico"));',
            "            await s.SaveChangesAsync();",
            "        }",
            "        var avisos = Enumerable.Range(0, 10)",
            '            .Select(_ => daemon.Bus.InvokeAsync(new RegistrarPago("emp-146", "pago-146-1", 50000)));',
            "        await Task.WhenAll(avisos);",
            "        await using var q = daemon.Store.QuerySession();",
            '        var hechos = await q.Events.FetchStreamAsync("emp-146");',
            "        Assert.Single(hechos, h => h.Data is PagoRegistrado);",
            "    }",
            "}",
          ],
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El test que prueba otra cosa",
      tarea:
        "Corre el test de la carrera y el de la suspensión por el bus, y mira qué dicen de tu servicio.",
      pasos: [
        "Con `CADENA_POSTGRES` fijada: `dotnet test --filter CarreraDelPagoTests`.",
        "En `empresas_tests`, cuenta los `pago_registrado` de emp-146.",
        "Corre `dotnet test --filter Suspender_por_el_bus_llega_a_la_vista` y mira el proceso `susp-emp-14-2`.",
      ],
      logro: {
        items: [
          choque,
          "El diario tiene un solo pago: fallan los avisos que chocaron sin reintentar. `HostConDaemon` no tiene la política.",
          "`susp-emp-14-2` tiene `suspension_solicitada` y `suspension_vencida`: el plazo es 0.",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "El arnés llama a tu función",
      tarea:
        "Que `HostConDaemon` arranque con `AgregarEmpresas`, como el servicio y el worker.",
      pasos: [
        "En su `InitializeAsync`, después de calcular `deTests` y crear el builder, cambia tu `AddMarten` y tu `AddWolverine` por las líneas de abajo.",
        "Su papel: es el único proceso de su base y el dueño de sus tablas. Agrega `using JasperFx;`, quita los `using` que sobran y corre `dotnet test`.",
      ],
      logro: {
        items: [
          "Verde, con `CarreraDelPagoTests`.",
          "La suspensión del test ya no tiene `suspension_vencida`.",
        ],
      },
      tips: [
        {
          k: "nuevo",
          idioma: 'builder.Configuration["clave"] = valor',
          explicacion:
            "pone la clave por encima de lo ya leído. Una fuente agregada después le gana: por eso los secretos van a `\"sin-secretos\"`.",
        },
      ],
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'builder.Configuration["DirectorioDeSecretos"] = "sin-secretos";',
          'builder.Configuration["ConnectionStrings:Postgres"] = deTests;',
          'builder.Configuration["Suspension:PlazoEnSegundos"] = "10";',
          "builder.AgregarEmpresas(DaemonMode.Solo, AutoCreate.CreateOrUpdate);",
        ],
      },
    },
    {
      tipo: "reto",
      titulo: "Las tablas de Facturación",
      tarea:
        "Facturación ya corre en tus tests. Dale en la base de pruebas las tablas que creaste a mano.",
      pasos: [
        "En `empresas_tests`, mira las dead letters: `relation \"multas\" does not exist`.",
        "Copia la forma de las tablas, sin filas, con el comando de abajo.",
        "`DELETE FROM wolverine_dead_letters;` y corre `dotnet test` otra vez.",
      ],
      logro: {
        items: ["`dotnet test` en verde, y Facturación no deja dead letters."],
      },
      ejemplo: {
        lenguaje: "bash",
        lineas: [
          'docker exec empresas-db sh -c "pg_dump -U postgres -s \\',
          "  -t multas -t procesados -t plan_de_empresa -t mensualidades postgres \\",
          '  | psql -U postgres -d empresas_tests"',
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "La limpieza que el test ve",
      tarea:
        "Alguien limpia `AgregarEmpresas` y quita la política del choque, porque cree que sobra.",
      pasos: [
        "En `AgregarEmpresas`, comenta las dos líneas de `OnException<JasperFx.ConcurrencyException>()`.",
        "Corre `dotnet test`.",
        "Descoméntalas.",
      ],
      logro: {
        items: [
          choque,
          "Cae `CarreraDelPagoTests`. Ahora ese rojo vale para los tres hosts: los tres llaman a la misma función.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "El host de tests **es un host más** y arranca con la misma función: su verde y su rojo hablan de lo que corre.",
      puntos: [
        {
          termino: "Una copia en los tests",
          definicion: "Prueba otra cosa: ni su rojo ni su verde hablan del servicio.",
        },
        {
          termino: "La clave puesta a mano",
          definicion: "`builder.Configuration[\"clave\"]`: la base y el plazo de pruebas.",
        },
        {
          termino: "DaemonMode.Solo",
          definicion: "El único proceso de su base, y dueño de sus tablas.",
        },
      ],
      commit: {
        mensaje: "ES · El arnés usa la misma configuración",
        preguntas: [
          "¿Por qué tu copia daba un rojo que el servicio no tenía?",
          "¿Qué otra línea de la función tumbaría `CarreraDelPagoTests`?",
        ],
      },
      siguiente: {
        seccion: "52 · El broker de verdad",
        texto:
          "Cada host trata sus mensajes en colas locales, dentro de su proceso. Cuando otro equipo quiera escucharnos, el anuncio tiene que cruzar procesos.",
      },
    },
  ],
};
