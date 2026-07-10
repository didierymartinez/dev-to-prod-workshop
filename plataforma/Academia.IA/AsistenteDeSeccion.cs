using Academia.Contenido;
using Anthropic;
using Anthropic.Models.Messages;
using System.Runtime.CompilerServices;

namespace Academia.IA;

public sealed record TurnoDeChat(bool EsAlumno, string Texto);

/// <summary>
/// El asistente contextual de una sección: guía sin spoilear. Recibe el cuerpo
/// SIN las soluciones (los details van ocultos) y tiene la orden de no resolver
/// los retos — el método del taller es que el alumno lo intente.
/// </summary>
public sealed class AsistenteDeSeccion(AnthropicClient cliente)
{
    public async IAsyncEnumerable<string> ResponderAsync(
        Seccion seccion,
        IReadOnlyList<TurnoDeChat> conversacion,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var mensajes = conversacion
            .Select(t => new MessageParam
            {
                Role = t.EsAlumno ? Role.User : Role.Assistant,
                Content = t.Texto,
            })
            .ToList();

        var stream = cliente.Messages.CreateStreaming(new MessageCreateParams
        {
            Model = Model.ClaudeOpus4_8,
            MaxTokens = 4096,
            System = new List<TextBlockParam>
            {
                new()
                {
                    Text = PromptDeSistema(seccion),
                    CacheControl = new CacheControlEphemeral(),   // misma sección → prefijo cacheado entre turnos
                },
            },
            Messages = mensajes,
        }, cancellationToken: ct);

        await foreach (var evento in stream)
        {
            if (evento.TryPickContentBlockDelta(out var delta) &&
                delta.Delta.TryPickText(out var texto))
            {
                yield return texto.Text;
            }
        }
    }

    private static string PromptDeSistema(Seccion seccion) => $"""
        Eres el asistente de un taller de Event Sourcing en español que enseña por
        DESCUBRIMIENTO: el alumno construye cada pieza a mano para entender el porqué.
        Acompañas al alumno en la sección «{seccion.Titulo}».

        REGLAS (inquebrantables):
        1. GUÍAS, NO RESUELVES. Nunca escribas la solución de un reto 🛠️ ni un
           bloque de código que lo complete. Da pistas: la pregunta que desatasca,
           el concepto que falta, dónde releer. Si insisten, explica que el valor
           del taller está en intentarlo y ofrece una pista más concreta.
        2. Errores del alumno: ayúdalo a LEER el error (qué dice, dónde mirar),
           no le des el código corregido.
        3. Conceptos: explícalos con ganas — el porqué de las piezas sí se conversa
           completo. Solo el código de los retos está vedado.
        4. Responde en español llano, directo, sin jerga innecesaria (el estilo del
           taller). Respuestas cortas: el alumno quiere volver a codear.

        La sección (las soluciones van ocultas también para ti):

        <seccion>
        {seccion.CuerpoSinSoluciones}
        </seccion>
        """;
}
