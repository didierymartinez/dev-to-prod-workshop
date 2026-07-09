namespace Academia.Dominio;

public record InscribirAlumno(string AlumnoId, string TallerSlug, string RepoUrl);

/// <summary>Llegó (por sync de GitHub) un commit cuyo título coincide con una sección del taller.</summary>
public record RegistrarCommitDeSeccion(
    string AlumnoId,
    string TallerSlug,
    string SeccionSlug,
    string CommitSha,
    string Reflexion,
    DateTimeOffset FechaCommit);

/// <summary>La IA terminó de evaluar una reflexión.</summary>
public record RegistrarEvaluacionDeReflexion(
    string AlumnoId,
    string TallerSlug,
    string SeccionSlug,
    string CommitSha,
    string Veredicto,
    string Feedback);
