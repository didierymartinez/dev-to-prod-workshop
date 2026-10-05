var registrada = new EmpresaRegistrada("Constructora Andes", "Básico");
var planCambiado = new PlanCambiado("Premium");
var suspendida1 = new EmpresaSuspendida("falta de pago");
var reactivada = new EmpresaReactivada();
var suspendida2 = new EmpresaSuspendida("incumplimiento de contrato");

var historia = new List<object> { registrada, planCambiado, suspendida1, reactivada, suspendida2 };

var empresa = new Empresa(historia);
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}, reactivada {empresa.Reactivaciones} vez/veces");

public record EmpresaRegistrada(string Nombre, string Plan);
public record PlanCambiado(string NuevoPlan);
public record EmpresaSuspendida(string Motivo);
public record EmpresaReactivada();

public abstract class AggregateRoot
{
    // El motor genérico: recorrer la historia y aplicar hecho por hecho.
    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);
    }

    // Cada entidad sabrá aplicar SUS propios hechos. La base no lo sabe: por eso, abstracto.
    protected abstract void Aplicar(object hecho);
}

public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa(IEnumerable<object> historia) => Load(historia);

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;
            case PlanCambiado p:      Plan = p.NuevoPlan;                break;
            case EmpresaSuspendida:   Suspendida = true;                break;
            case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;
        }
    }
}
