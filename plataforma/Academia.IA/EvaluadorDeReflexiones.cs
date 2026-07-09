using System.Text.Json;
using Academia.Contenido;
using Anthropic;
using Anthropic.Models.Messages;

namespace Academia.IA;

public sealed record EvaluacionDeReflexion(string Veredicto, string Feedback);

/// <summary>
/// Valida el aprendizaje: califica la reflexión 💭 que el alumno escribió en su
/// commit contra la sección — ¿entendió el porqué, o solo copió? (El contrato
/// "verde ≠ entendí" del taller, automatizado.)
/// </summary>
public sealed class EvaluadorDeReflexiones(AnthropicClient cliente)
{
    public async Task<EvaluacionDeReflexion> EvaluarAsync(
        Seccion seccion, string reflexion, CancellationToken ct = default)
    {
        var respuesta = await cliente.Messages.Create(new MessageCreateParams
        {
            Model = Model.ClaudeOpus4_8,
            MaxTokens = 2048,
            System = new List<TextBlockParam>
            {
                new()
                {
                    Text = PromptDeSistema(seccion),
                    CacheControl = new CacheControlEphemeral(),   // la sección se reusa entre evaluaciones
                },
            },
            OutputConfig = new OutputConfig
            {
                Format = new JsonOutputFormat { Schema = EsquemaVeredicto() },
            },
            Messages = [new() { Role = Role.User, Content = $"Reflexión del alumno:\n\n{reflexion}" }],
        }, cancellationToken: ct);

        var json = respuesta.Content
            .Select(b => b.Value).OfType<TextBlock>()
            .Select(t => t.Text).FirstOrDefault()
            ?? throw new InvalidOperationException("La evaluación no devolvió texto.");

        var dto = JsonSerializer.Deserialize<VeredictoDto>(json)
            ?? throw new InvalidOperationException("La evaluación no se pudo deserializar.");
        return new EvaluacionDeReflexion(dto.veredicto, dto.feedback);
    }

    private static string PromptDeSistema(Seccion seccion) => $"""
        Eres el evaluador pedagógico de un taller de Event Sourcing en español.
        El taller enseña por descubrimiento y su contrato es "verde ≠ entendí":
        completar el código no basta; el alumno debe poder explicar EL PORQUÉ.

        Vas a calificar la reflexión que el alumno escribió en su commit al cerrar
        la sección. La pregunta que se le hizo fue:

        {seccion.PreguntaReflexion ?? "(la pregunta de reflexión de la sección)"}

        La sección completa (tu referencia para juzgar):

        <seccion>
        {seccion.CuerpoMarkdown}
        </seccion>

        Califica SOLO la comprensión del porqué (no la ortografía ni la extensión):
        - "entendio": explica el porqué con sus palabras; conecta el problema con la pieza.
        - "parcial": repite el qué pero el porqué está incompleto o impreciso.
        - "no_entendio": vacío, copiado del texto, o revela un malentendido.

        El feedback va dirigido AL ALUMNO, en español, 2-3 frases: reconoce lo que
        captó y, si falta algo, señala QUÉ releer o QUÉ pregunta hacerse (sin dar
        la respuesta completa — el taller es de descubrimiento).
        """;

    private static Dictionary<string, JsonElement> EsquemaVeredicto() => new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            veredicto = new { type = "string", @enum = new[] { "entendio", "parcial", "no_entendio" } },
            feedback = new { type = "string" },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "veredicto", "feedback" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private sealed record VeredictoDto(string veredicto, string feedback);
}
