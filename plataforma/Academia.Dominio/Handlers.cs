using Cosmos.EventSourcing.Abstractions.Commands;

namespace Academia.Dominio;

// Handlers por convención de Wolverine: una clase con Handle, dependencias por
// parámetro. NO llaman SaveChangesAsync — el UnitOfWorkMiddleware de la
// plantilla vuelca los UncommittedEvents y AutoApplyTransactions confirma.

public class InscribirAlumnoHandler
{
    public async Task Handle(InscribirAlumno cmd, IEventStore store, CancellationToken ct)
    {
        var id = Inscripcion.IdDe(cmd.AlumnoId, cmd.TallerSlug);
        if (await store.ExistsAsync<Inscripcion>(id, ct)) return;   // idempotente: ya inscrito

        store.StartStream(Inscripcion.Crear(cmd.AlumnoId, cmd.TallerSlug, cmd.RepoUrl));
    }
}

public class RegistrarCommitDeSeccionHandler
{
    public async Task Handle(RegistrarCommitDeSeccion cmd, IEventStore store, CancellationToken ct)
    {
        var inscripcion = await store.GetAggregateRootAsync<Inscripcion>(
                Inscripcion.IdDe(cmd.AlumnoId, cmd.TallerSlug), ct)
            ?? throw new InvalidOperationException(
                $"No existe inscripción de {cmd.AlumnoId} a {cmd.TallerSlug}.");

        inscripcion.CompletarSeccion(cmd.SeccionSlug, cmd.CommitSha, cmd.Reflexion, cmd.FechaCommit);
    }
}

public class RegistrarEvaluacionDeReflexionHandler
{
    public async Task Handle(RegistrarEvaluacionDeReflexion cmd, IEventStore store, CancellationToken ct)
    {
        var inscripcion = await store.GetAggregateRootAsync<Inscripcion>(
                Inscripcion.IdDe(cmd.AlumnoId, cmd.TallerSlug), ct)
            ?? throw new InvalidOperationException(
                $"No existe inscripción de {cmd.AlumnoId} a {cmd.TallerSlug}.");

        inscripcion.RegistrarEvaluacion(cmd.SeccionSlug, cmd.CommitSha, cmd.Veredicto, cmd.Feedback);
    }
}
