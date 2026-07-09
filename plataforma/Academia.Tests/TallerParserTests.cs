using Academia.Contenido;

namespace Academia.Tests;

public class TallerParserTests
{
    private const string SeccionFixture = """
        # Blindar el motor: Given-When-Then

        Tienes el motor completo y vas a refactorizarlo.

        ## 🎯 El Objetivo

        Una **red de seguridad** de pruebas para tu motor.

        ## 💥 El dolor: probar a ojo no avisa

        Es manual y silencioso.

        ## 🔧 El trabajo

        > 🛠️ **Inténtalo tú.** Haz el reto.

        <details>
        <summary>👉 Muéstrame una forma de hacerlo</summary>

        ```csharp
        var secreto = "la solución";
        ```
        </details>

        ---

        ## ✅ Compruébalo

        - [ ] Hiciste el primer test.
        - [ ] Lo rompiste a propósito.

        ---

        ## 📓 Registra tu avance

        > 💭 ¿Por qué el motor vive en la base?

        ```bash
        git add .
        git commit -m "ES · Blindar el motor: Given-When-Then" -m "<aquí TU respuesta>"
        git push
        ```

        ---

        ## 🧠 En una frase

        Blindas el motor con Given-When-Then.

        ---

        [⬅️ Volver: Concurrencia optimista](./concurrencia-optimista.md)

        [➡️ Siguiente: Persistir a mano](./persistir-a-mano.md)
        """;

    private static Seccion ParsearFixture()
    {
        var ruta = Path.Combine(Path.GetTempPath(), $"academia-test-{Guid.NewGuid():N}", "given-when-then.md");
        Directory.CreateDirectory(Path.GetDirectoryName(ruta)!);
        File.WriteAllText(ruta, SeccionFixture);
        try { return TallerParser.ParsearSeccion(ruta); }
        finally { Directory.Delete(Path.GetDirectoryName(ruta)!, recursive: true); }
    }

    [Fact]
    public void Extrae_titulo_objetivo_y_dolor()
    {
        var s = ParsearFixture();
        Assert.Equal("Blindar el motor: Given-When-Then", s.Titulo);
        Assert.Contains("red de seguridad", s.Objetivo);
        Assert.Contains("silencioso", s.Dolor);
    }

    [Fact]
    public void Extrae_el_titulo_de_commit_exacto_del_bloque_registra()
    {
        var s = ParsearFixture();
        Assert.Equal("ES · Blindar el motor: Given-When-Then", s.TituloCommit);
    }

    [Fact]
    public void Extrae_la_pregunta_de_reflexion_y_la_checklist()
    {
        var s = ParsearFixture();
        Assert.Contains("¿Por qué el motor vive en la base?", s.PreguntaReflexion);
        Assert.Equal(2, s.Checklist.Count);
    }

    [Fact]
    public void Extrae_la_navegacion()
    {
        var s = ParsearFixture();
        Assert.Equal("concurrencia-optimista", s.SlugAnterior);
        Assert.Equal("persistir-a-mano", s.SlugSiguiente);
    }

    [Fact]
    public void El_cuerpo_sin_soluciones_oculta_los_details()
    {
        var s = ParsearFixture();
        Assert.Contains("la solución", s.CuerpoMarkdown);
        Assert.DoesNotContain("la solución", s.CuerpoSinSoluciones);
        Assert.Contains("inténtalo tú", s.CuerpoSinSoluciones, StringComparison.OrdinalIgnoreCase);
    }

    // ── Contra el taller REAL (se salta si la carpeta no está al lado) ──

    private static string? RutaTallerReal()
    {
        var ruta = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory, "..", "..", "..", "..", "..", "workshop-event-sourcing"));
        return Directory.Exists(Path.Combine(ruta, "secciones")) ? ruta : null;
    }

    [Fact]
    public void Parsea_el_taller_real_con_su_cadena_ordenada()
    {
        var ruta = RutaTallerReal();
        Assert.SkipWhen(ruta is null, "workshop-event-sourcing no está junto a la plataforma");

        var taller = TallerParser.Parsear(ruta!);

        Assert.True(taller.Secciones.Count > 30, $"esperaba >30 secciones, hay {taller.Secciones.Count}");
        Assert.Equal("el-diario-de-una-empresa", taller.Secciones[0].Slug);   // el inicio de la cadena
        Assert.True(taller.Secciones.Count(s => s.Orden >= 0) > 30, "la cadena ➡️ debe cubrir el taller");

        var gwt = taller.Secciones.Single(s => s.Slug == "given-when-then");
        Assert.Equal("ES · Blindar el motor: Given-When-Then", gwt.TituloCommit);
        Assert.Same(gwt, taller.PorTituloCommit("ES · Blindar el motor: Given-When-Then"));
    }
}
