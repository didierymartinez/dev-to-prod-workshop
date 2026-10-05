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

public class Empresa
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    // La empresa se reconstruye a sí misma leyendo su historia
    public Empresa(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
        {
            if (hecho is EmpresaRegistrada r) { Nombre = r.Nombre; Plan = r.Plan; }
            if (hecho is PlanCambiado p)      { Plan = p.NuevoPlan; }
            if (hecho is EmpresaSuspendida)   { Suspendida = true; }
            if (hecho is EmpresaReactivada)   { Suspendida = false; Reactivaciones++; }
        }
    }
}
