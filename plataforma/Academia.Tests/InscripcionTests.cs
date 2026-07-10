using Academia.Dominio;
using Cosmos.EventSourcing.Testing.Utilities;

namespace Academia.Tests;

/// <summary>
/// El dominio probado con las utilidades de la propia plantilla (TestStore por
/// reflexión + Given/Then): rápido, sin Postgres. El SaveChanges que en
/// producción dispara el UnitOfWorkMiddleware aquí se simula llamándolo a mano.
/// </summary>
public class InscripcionTests : CommandHandlerTestBase
{
    private static readonly DateTimeOffset Fecha = new(2026, 7, 8, 10, 0, 0, TimeSpan.Zero);

    private string Id => Inscripcion.IdDe("didier", "workshop-event-sourcing");

    [Fact]
    public async Task Inscribir_a_un_alumno_emite_AlumnoInscrito()
    {
        await new InscribirAlumnoHandler().Handle(
            new InscribirAlumno("didier", "workshop-event-sourcing", "https://github.com/d/repo"),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id, new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"));
    }

    [Fact]
    public async Task Inscribir_dos_veces_es_idempotente()
    {
        Given(Id, new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"));

        await new InscribirAlumnoHandler().Handle(
            new InscribirAlumno("didier", "workshop-event-sourcing", "https://github.com/d/repo"),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id);   // sin hechos nuevos
    }

    [Fact]
    public async Task Un_commit_de_seccion_completa_la_seccion()
    {
        Given(Id, new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"));

        await new RegistrarCommitDeSeccionHandler().Handle(
            new RegistrarCommitDeSeccion("didier", "workshop-event-sourcing",
                "given-when-then", "abc123", "Los tests afirman hechos, no filas.", Fecha),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id, new SeccionCompletada("given-when-then", "abc123", "Los tests afirman hechos, no filas.", Fecha));
        And<Inscripcion, bool>(Id, i => i.Completo("given-when-then"), true);
    }

    [Fact]
    public async Task El_mismo_commit_dos_veces_no_reemite()
    {
        Given(Id,
            new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"),
            new SeccionCompletada("given-when-then", "abc123", "reflexión", Fecha));

        await new RegistrarCommitDeSeccionHandler().Handle(
            new RegistrarCommitDeSeccion("didier", "workshop-event-sourcing",
                "given-when-then", "abc123", "reflexión", Fecha),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id);   // idempotente
    }

    [Fact]
    public async Task La_evaluacion_de_la_IA_queda_registrada()
    {
        Given(Id,
            new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"),
            new SeccionCompletada("given-when-then", "abc123", "reflexión", Fecha));

        await new RegistrarEvaluacionDeReflexionHandler().Handle(
            new RegistrarEvaluacionDeReflexion("didier", "workshop-event-sourcing",
                "given-when-then", "abc123", "entendio", "Captó que el test afirma eventos."),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id, new ReflexionEvaluada("given-when-then", "abc123", "entendio", "Captó que el test afirma eventos."));
        And<Inscripcion, string>(Id, i => i.Evaluaciones["given-when-then"].Veredicto, "entendio");
    }

    [Fact]
    public async Task No_se_evalua_una_seccion_no_completada()
    {
        Given(Id, new AlumnoInscrito("didier", "workshop-event-sourcing", "https://github.com/d/repo"));

        await new RegistrarEvaluacionDeReflexionHandler().Handle(
            new RegistrarEvaluacionDeReflexion("didier", "workshop-event-sourcing",
                "given-when-then", "abc123", "entendio", "…"),
            EventStore, CancellationToken.None);
        await EventStore.SaveChangesAsync(CancellationToken.None);

        Then(Id);   // nada que evaluar
    }
}
