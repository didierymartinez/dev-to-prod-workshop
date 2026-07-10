using Academia.Dominio;
using Academia.IA;
using Cosmos.EventSourcing.Abstractions.Commands;

namespace Academia.Web.Servicios;

public sealed record ResumenDeSincronizacion(int SeccionesNuevas, int ReflexionesEvaluadas);

/// <summary>
/// El latido de la plataforma: lee los push del repo del alumno, convierte los
/// commits "ES · Sección" en hechos del dominio, y pasa las reflexiones nuevas
/// por el evaluador IA. Todo idempotente: re-sincronizar no duplica nada.
/// </summary>
public sealed class SincronizadorDeAvance(
    CatalogoDeTalleres catalogo,
    GitHubCliente gitHub,
    ICommandRouter comandos,
    IEventStore store,
    EvaluadorDeReflexiones evaluador,
    ILogger<SincronizadorDeAvance> log)
{
    public async Task<ResumenDeSincronizacion> SincronizarAsync(
        string alumnoId, string tallerSlug, CancellationToken ct = default)
    {
        var taller = catalogo.PorSlug(tallerSlug)
            ?? throw new InvalidOperationException($"Taller desconocido: {tallerSlug}");
        var id = Inscripcion.IdDe(alumnoId, tallerSlug);
        var inscripcion = await store.GetAggregateRootAsync<Inscripcion>(id, ct)
            ?? throw new InvalidOperationException($"No existe la inscripción {id}.");

        // 1. Los commits del alumno → comandos (el handler es idempotente)
        var completadasAntes = inscripcion.SeccionesCompletadas.ToHashSet();
        var nuevas = 0;
        foreach (var commit in await gitHub.ObtenerCommitsAsync(inscripcion.RepoUrl, ct))
        {
            var seccion = taller.PorTituloCommit(commit.Titulo);
            if (seccion is null || inscripcion.YaProceso(commit.Sha) || inscripcion.Completo(seccion.Slug))
                continue;

            await comandos.InvokeAsync(new RegistrarCommitDeSeccion(
                alumnoId, tallerSlug, seccion.Slug, commit.Sha, commit.Cuerpo, commit.Fecha), ct);
            nuevas++;
        }

        // 2. Reflexiones completadas y aún sin veredicto → evaluador IA
        var alDia = await store.GetAggregateRootAsync<Inscripcion>(id, ct) ?? inscripcion;
        var evaluadas = 0;
        foreach (var slug in alDia.SeccionesCompletadas.Where(s => !alDia.Evaluaciones.ContainsKey(s)))
        {
            var seccion = taller.Secciones.FirstOrDefault(s => s.Slug == slug);
            var detalle = alDia.Detalle(slug);
            if (seccion is null || detalle is null) continue;
            if (string.IsNullOrWhiteSpace(detalle.Reflexion)) continue;   // commit sin reflexión: no hay qué evaluar

            try
            {
                var evaluacion = await evaluador.EvaluarAsync(seccion, detalle.Reflexion, ct);
                await comandos.InvokeAsync(new RegistrarEvaluacionDeReflexion(
                    alumnoId, tallerSlug, slug, detalle.CommitSha,
                    evaluacion.Veredicto, evaluacion.Feedback), ct);
                evaluadas++;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "No se pudo evaluar la reflexión de {Seccion}; se reintenta en el próximo sync", slug);
            }
        }

        log.LogInformation("Sync {Id}: {Nuevas} sección(es) nueva(s), {Evaluadas} reflexión(es) evaluada(s)",
            id, nuevas, evaluadas);
        return new ResumenDeSincronizacion(nuevas, evaluadas);
    }
}
