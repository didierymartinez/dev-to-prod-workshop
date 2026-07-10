using System.Text.Json;

namespace Academia.Web.Servicios;

public sealed record CommitDeGitHub(string Sha, string Titulo, string Cuerpo, DateTimeOffset Fecha);

/// <summary>
/// Lee los commits del repo del alumno (API pública de GitHub). Solo lectura:
/// la plataforma nunca ejecuta código del alumno — lee títulos y reflexiones.
/// GITHUB_TOKEN (opcional) sube el rate limit.
/// </summary>
public sealed class GitHubCliente(HttpClient http)
{
    public async Task<IReadOnlyList<CommitDeGitHub>> ObtenerCommitsAsync(
        string repoUrl, CancellationToken ct = default)
    {
        var (owner, repo) = ParsearRepo(repoUrl);
        using var respuesta = await http.GetAsync(
            $"repos/{owner}/{repo}/commits?per_page=100", ct);
        respuesta.EnsureSuccessStatusCode();

        using var json = await JsonDocument.ParseAsync(
            await respuesta.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

        var commits = new List<CommitDeGitHub>();
        foreach (var item in json.RootElement.EnumerateArray())
        {
            var mensaje = item.GetProperty("commit").GetProperty("message").GetString() ?? "";
            var partes = mensaje.Split("\n\n", 2);
            commits.Add(new CommitDeGitHub(
                Sha: item.GetProperty("sha").GetString() ?? "",
                Titulo: partes[0].Trim(),
                Cuerpo: partes.Length > 1 ? partes[1].Trim() : "",
                Fecha: item.GetProperty("commit").GetProperty("author").GetProperty("date").GetDateTimeOffset()));
        }

        commits.Reverse();   // del más viejo al más nuevo: el orden en que el alumno avanzó
        return commits;
    }

    public static (string Owner, string Repo) ParsearRepo(string repoUrl)
    {
        var partes = new Uri(repoUrl.TrimEnd('/')).AbsolutePath
            .Trim('/').Replace(".git", "").Split('/');
        if (partes.Length < 2)
            throw new ArgumentException($"URL de repo no reconocida: {repoUrl}");
        return (partes[0], partes[1]);
    }
}
