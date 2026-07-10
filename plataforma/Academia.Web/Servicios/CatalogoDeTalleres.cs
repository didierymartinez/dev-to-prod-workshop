using Academia.Contenido;

namespace Academia.Web.Servicios;

/// <summary>Los talleres parseados al arrancar, desde la carpeta raíz del repo (config "Academia:RutaTalleres").</summary>
public sealed class CatalogoDeTalleres
{
    private readonly Dictionary<string, Taller> _talleres;

    public CatalogoDeTalleres(IConfiguration config, ILogger<CatalogoDeTalleres> log)
    {
        // bin/Debug/net10.0 → Academia.Web → plataforma → raíz del repo (donde viven los workshop-*)
        var raiz = config["Academia:RutaTalleres"]
            ?? Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));

        _talleres = Directory.EnumerateDirectories(raiz, "workshop-*")
            .Where(d => Directory.Exists(Path.Combine(d, "secciones")))
            .Select(d =>
            {
                try { return TallerParser.Parsear(d); }
                catch (Exception ex)
                {
                    log.LogWarning(ex, "No se pudo parsear el taller en {Ruta}", d);
                    return null;
                }
            })
            .Where(t => t is not null && t.Secciones.Count > 0)   // carpetas huérfanas sin contenido no son talleres
            .ToDictionary(t => t!.Slug, t => t!);

        log.LogInformation("Catálogo: {N} taller(es): {Slugs}",
            _talleres.Count, string.Join(", ", _talleres.Keys));
    }

    public IReadOnlyCollection<Taller> Todos => _talleres.Values;
    public Taller? PorSlug(string slug) => _talleres.GetValueOrDefault(slug);
}
