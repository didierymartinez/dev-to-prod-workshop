namespace Academia.Contenido;

/// <summary>Un taller de la familia (workshop-*): sus secciones, ya ordenadas por la cadena ➡️.</summary>
public sealed record Taller
{
    public required string Slug { get; init; }             // ej. "workshop-event-sourcing"
    public required string Nombre { get; init; }            // del README (H1) o el slug
    public required string RutaSecciones { get; init; }     // carpeta física de secciones/
    public required IReadOnlyList<Seccion> Secciones { get; init; }

    /// <summary>Busca la sección cuyo título de commit coincide con la primera línea de un commit.</summary>
    public Seccion? PorTituloCommit(string tituloCommit) =>
        Secciones.FirstOrDefault(s =>
            s.TituloCommit is not null &&
            string.Equals(s.TituloCommit.Trim(), tituloCommit.Trim(), StringComparison.Ordinal));
}

/// <summary>Una sección parseada del formato fijo del taller (🎯 💥 🛠️ ✅ 📓 🧠, nav ⬅️➡️).</summary>
public sealed record Seccion
{
    public required string Slug { get; init; }               // nombre de archivo sin .md
    public required string Titulo { get; init; }              // H1
    public string Objetivo { get; init; } = "";               // bajo ## 🎯
    public string? Dolor { get; init; }                       // bajo ## 💥
    public IReadOnlyList<string> Checklist { get; init; } = []; // ítems "- [ ]" del ## ✅
    public string? PreguntaReflexion { get; init; }           // el bloque 💭 del 📓
    public string? TituloCommit { get; init; }                // el -m exacto del 📓 (ej. "ES · Blindar el motor…")
    public string? EnUnaFrase { get; init; }                  // bajo ## 🧠
    public string? SlugAnterior { get; init; }                // del link ⬅️
    public string? SlugSiguiente { get; init; }               // del link ➡️
    public int Orden { get; init; }                           // posición en la cadena (-1 = fuera de cadena)
    public required string CuerpoMarkdown { get; init; }      // la sección completa
    public required string CuerpoSinSoluciones { get; init; } // <details> ocultados (para el asistente IA)
}
