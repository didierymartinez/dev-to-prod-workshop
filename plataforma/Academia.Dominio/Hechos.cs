using Cosmos.EventDriven.Abstractions;

namespace Academia.Dominio;

// Todos privados a propósito: público = contrato para siempre; se promueve
// cuando otro servicio tenga una necesidad real (la lección del propio taller).

/// <summary>Un alumno se inscribió a un taller, con el repo donde registrará su avance.</summary>
public record AlumnoInscrito(string AlumnoId, string TallerSlug, string RepoUrl) : IPrivateEvent;

/// <summary>Llegó el commit "ES · Sección" al repo del alumno: la sección se dio por completada.</summary>
public record SeccionCompletada(
    string SeccionSlug,
    string CommitSha,
    string Reflexion,
    DateTimeOffset FechaCommit) : IPrivateEvent;

/// <summary>La IA evaluó la reflexión del alumno: ¿entendió el porqué, o solo copió?</summary>
public record ReflexionEvaluada(
    string SeccionSlug,
    string CommitSha,
    string Veredicto,   // "entendio" | "parcial" | "no_entendio"
    string Feedback) : IPrivateEvent;
