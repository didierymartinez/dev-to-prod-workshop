using Cosmos.EventSourcing.Abstractions;

namespace Academia.Dominio;

/// <summary>
/// Un alumno cursando un taller: el agregado que acumula su avance como hechos.
/// Sigue el patrón de la plantilla: decide → RaiseAndApply (recuerda el hecho y
/// aplica el estado al vuelo); los Apply(TEvento) públicos son el fold que usan
/// Marten (por convención) y el TestStore (por reflexión).
/// </summary>
public class Inscripcion : AggregateRoot
{
    public string AlumnoId { get; private set; } = string.Empty;
    public string TallerSlug { get; private set; } = string.Empty;
    public string RepoUrl { get; private set; } = string.Empty;

    private readonly HashSet<string> _commitsProcesados = [];
    private readonly Dictionary<string, SeccionCompletada> _completadas = [];    // slug → hecho
    private readonly Dictionary<string, ReflexionEvaluada> _evaluaciones = [];   // slug → última evaluación

    public IReadOnlyCollection<string> SeccionesCompletadas => _completadas.Keys;
    public IReadOnlyDictionary<string, ReflexionEvaluada> Evaluaciones => _evaluaciones;
    public bool YaProceso(string commitSha) => _commitsProcesados.Contains(commitSha);
    public bool Completo(string seccionSlug) => _completadas.ContainsKey(seccionSlug);
    public SeccionCompletada? Detalle(string seccionSlug) => _completadas.GetValueOrDefault(seccionSlug);

    /// <summary>Id determinista: la inscripción de un alumno a un taller es única.</summary>
    public static string IdDe(string alumnoId, string tallerSlug) => $"{alumnoId}:{tallerSlug}";

    public static Inscripcion Crear(string alumnoId, string tallerSlug, string repoUrl)
    {
        var inscripcion = new Inscripcion { Id = IdDe(alumnoId, tallerSlug) };
        inscripcion.RaiseAndApply(new AlumnoInscrito(alumnoId, tallerSlug, repoUrl));
        return inscripcion;
    }

    /// <summary>Registra el commit de una sección. Idempotente: un sha ya visto o una sección ya completada no re-emiten.</summary>
    public void CompletarSeccion(string seccionSlug, string commitSha, string reflexion, DateTimeOffset fechaCommit)
    {
        if (YaProceso(commitSha) || Completo(seccionSlug)) return;
        RaiseAndApply(new SeccionCompletada(seccionSlug, commitSha, reflexion, fechaCommit));
    }

    /// <summary>Registra el veredicto de la IA sobre la reflexión de una sección completada.</summary>
    public void RegistrarEvaluacion(string seccionSlug, string commitSha, string veredicto, string feedback)
    {
        if (!Completo(seccionSlug)) return;                                  // no se evalúa lo que no se entregó
        if (_evaluaciones.TryGetValue(seccionSlug, out var previa)
            && previa.CommitSha == commitSha) return;                        // idempotente por (sección, commit)
        RaiseAndApply(new ReflexionEvaluada(seccionSlug, commitSha, veredicto, feedback));
    }

    private void RaiseAndApply(object evento)
    {
        _uncommittedEvents.Add(evento);
        ApplyInterno(evento);
    }

    private void ApplyInterno(object evento)
    {
        switch (evento)
        {
            case AlumnoInscrito e: Apply(e); break;
            case SeccionCompletada e: Apply(e); break;
            case ReflexionEvaluada e: Apply(e); break;
        }
    }

    public void Apply(AlumnoInscrito e)
    {
        Id = IdDe(e.AlumnoId, e.TallerSlug);
        AlumnoId = e.AlumnoId;
        TallerSlug = e.TallerSlug;
        RepoUrl = e.RepoUrl;
    }

    public void Apply(SeccionCompletada e)
    {
        _commitsProcesados.Add(e.CommitSha);
        _completadas[e.SeccionSlug] = e;
    }

    public void Apply(ReflexionEvaluada e) => _evaluaciones[e.SeccionSlug] = e;
}
