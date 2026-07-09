using System.Text.RegularExpressions;

namespace Academia.Contenido;

/// <summary>
/// Parsea un taller desde su carpeta de secciones (el formato fijo de DEFINICIONES.md).
/// No duplica contenido: el markdown de cada sección ES la fuente; aquí solo se extraen
/// las piezas que la plataforma necesita (título, commit esperado, reflexión, checklist, cadena).
/// </summary>
public static partial class TallerParser
{
    public static Taller Parsear(string rutaTaller)
    {
        var rutaSecciones = Path.Combine(rutaTaller, "secciones");
        if (!Directory.Exists(rutaSecciones))
            throw new DirectoryNotFoundException($"No hay carpeta de secciones en {rutaTaller}");

        var slug = Path.GetFileName(rutaTaller.TrimEnd(Path.DirectorySeparatorChar));
        var secciones = Directory.EnumerateFiles(rutaSecciones, "*.md")
            .Select(ParsearSeccion)
            .ToList();

        return new Taller
        {
            Slug = slug,
            Nombre = LeerNombre(rutaTaller) ?? slug,
            RutaSecciones = rutaSecciones,
            Secciones = Ordenar(secciones),
        };
    }

    public static Seccion ParsearSeccion(string rutaArchivo)
    {
        var md = File.ReadAllText(rutaArchivo);
        var slug = Path.GetFileNameWithoutExtension(rutaArchivo);

        return new Seccion
        {
            Slug = slug,
            Titulo = PrimerMatch(RegexH1(), md) ?? slug,
            Objetivo = SeccionH2(md, "🎯") ?? "",
            Dolor = SeccionH2(md, "💥"),
            Checklist = RegexChecklist().Matches(SeccionH2(md, "✅") ?? "")
                .Select(m => m.Groups[1].Value.Trim()).ToList(),
            PreguntaReflexion = PrimerMatch(RegexReflexion(), md),
            TituloCommit = PrimerMatch(RegexCommit(), md),
            EnUnaFrase = SeccionH2(md, "🧠")?.Trim(),
            SlugAnterior = PrimerMatch(RegexNavAnterior(), md),
            SlugSiguiente = PrimerMatch(RegexNavSiguiente(), md),
            Orden = -1, // se asigna al ordenar la cadena
            CuerpoMarkdown = md,
            CuerpoSinSoluciones = RegexDetails().Replace(md,
                "> 🔒 *(La solución de este reto está oculta: inténtalo tú. El asistente te guía, no te la revela.)*"),
        };
    }

    /// <summary>Ordena siguiendo la cadena ➡️ desde la sección que nadie apunta; el resto queda al final (Orden = -1).</summary>
    private static List<Seccion> Ordenar(List<Seccion> secciones)
    {
        var porSlug = secciones.ToDictionary(s => s.Slug);
        var apuntadas = secciones.Where(s => s.SlugSiguiente is not null)
            .Select(s => s.SlugSiguiente!).ToHashSet();
        var inicio = secciones.FirstOrDefault(s => s.SlugSiguiente is not null && !apuntadas.Contains(s.Slug));

        var cadena = new List<Seccion>();
        var visitados = new HashSet<string>();
        for (var actual = inicio; actual is not null && visitados.Add(actual.Slug);)
        {
            cadena.Add(actual with { Orden = cadena.Count });
            actual = actual.SlugSiguiente is not null && porSlug.TryGetValue(actual.SlugSiguiente, out var sig)
                ? sig : null;
        }

        var fueraDeCadena = secciones.Where(s => !visitados.Contains(s.Slug));
        return [.. cadena, .. fueraDeCadena];
    }

    private static string? LeerNombre(string rutaTaller)
    {
        var readme = Path.Combine(rutaTaller, "README.md");
        if (!File.Exists(readme)) return null;
        return PrimerMatch(RegexH1(), File.ReadAllText(readme));
    }

    private static string? SeccionH2(string md, string emoji)
    {
        // Contenido entre "## <emoji> …" y el siguiente "## " (o "---" de cierre / fin).
        var match = Regex.Match(md, $@"^##\s+{Regex.Escape(emoji)}[^\n]*\n(.*?)(?=^##\s|^---\s*$|\z)",
            RegexOptions.Multiline | RegexOptions.Singleline);
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    private static string? PrimerMatch(Regex regex, string md)
    {
        var m = regex.Match(md);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    [GeneratedRegex(@"^#\s+(.+)$", RegexOptions.Multiline)]
    private static partial Regex RegexH1();

    [GeneratedRegex(@"^- \[ \]\s+(.+)$", RegexOptions.Multiline)]
    private static partial Regex RegexChecklist();

    // La pregunta 💭 del 📓 (una o más líneas de blockquote tras "> 💭")
    [GeneratedRegex(@"^>\s*💭\s*(.+?)(?=\n[^>]|\n\n)", RegexOptions.Multiline | RegexOptions.Singleline)]
    private static partial Regex RegexReflexion();

    // El primer -m del bloque de commit del 📓: git commit -m "ES · Título"
    [GeneratedRegex(@"git commit -m ""([^""]+)""")]
    private static partial Regex RegexCommit();

    [GeneratedRegex(@"\[⬅️[^\]]*\]\(\./([a-z0-9\-]+)\.md\)")]
    private static partial Regex RegexNavAnterior();

    [GeneratedRegex(@"\[➡️[^\]]*\]\(\./([a-z0-9\-]+)\.md\)")]
    private static partial Regex RegexNavSiguiente();

    [GeneratedRegex(@"<details>.*?</details>", RegexOptions.Singleline)]
    private static partial Regex RegexDetails();
}
