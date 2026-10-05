using Xunit;

public class SuspensionTests
{
    [Fact]
    public void Suspender_deja_la_empresa_suspendida()
    {
        var empresa = new Empresa();
        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });  // dado: registrada

        empresa.Suspender("falta de pago");                                        // cuando

        Assert.True(empresa.Suspendida);                                           // entonces
    }

    [Fact]
    public void Suspender_emite_el_hecho()
    {
        var empresa = new Empresa();
        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });

        empresa.Suspender("falta de pago");

        Assert.Contains(empresa.SinConfirmar, h => h is EmpresaSuspendida);
    }

    [Fact]
    public void Suspender_dos_veces_emite_un_solo_hecho()
    {
        var empresa = new Empresa();
        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico") });

        empresa.Suspender("falta de pago");
        empresa.Suspender("falta de pago");

        Assert.Single(empresa.SinConfirmar, h => h is EmpresaSuspendida);
    }

    [Fact]
    public void Rehidratar_no_deja_hechos_sin_confirmar()
    {
        var empresa = new Empresa();

        empresa.Load(new object[] { new EmpresaRegistrada("Andes", "Básico"),
                                    new EmpresaSuspendida("falta de pago") });

        Assert.Empty(empresa.SinConfirmar);   // rehidratar no es decidir: nada nuevo que guardar
    }
}
