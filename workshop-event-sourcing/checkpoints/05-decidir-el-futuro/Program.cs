// una empresa vive sobre SU stream (uno solo por ahora; el almacén para MUCHAS llega después)
var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));   // su historia previa

var empresa = stream.Get();                       // 1. CARGAR (rehidratar)
Console.WriteLine($"[antes] plan {empresa.Plan}");

var hecho = empresa.CambiarPlan("Enterprise");    // 2. ACTUAR (la empresa decide y emite el hecho)
stream.Append(hecho);                             // 3. GUARDAR (el stream lo archiva)

var verificacion = stream.Get();                  // recargamos del mismo stream
Console.WriteLine($"[después] plan {verificacion.Plan}");

// la misma orden de suspender llega dos veces; cada orden CARGA, actúa y GUARDA
var orden1 = stream.Get();
var h1 = orden1.Suspender("falta de pago");
if (h1 is not null) stream.Append(h1);

var orden2 = stream.Get();                        // RECARGA: Suspendida = true
var h2 = orden2.Suspender("falta de pago");       // null: ya estaba suspendida
if (h2 is not null) stream.Append(h2);

Console.WriteLine($"[final] suspendida: {stream.Get().Suspendida}");   // comprobación extra del checkpoint

public record EmpresaRegistrada(string Nombre, string Plan);
public record PlanCambiado(string NuevoPlan);
public record EmpresaSuspendida(string Motivo);
public record EmpresaReactivada();

public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);

public abstract class AggregateRoot
{
    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);
    }

    protected abstract void Aplicar(object hecho);
}

public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa() { }   // sin parámetros: el envoltorio la crea vacía y la rehidrata

    public PlanCambiado CambiarPlan(string nuevoPlan)
    {
        // (a) VALIDACIÓN — la operación es inválida → se RECHAZA (es un error)
        if (Suspendida)
            throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");

        return new PlanCambiado(nuevoPlan);
    }

    public EmpresaSuspendida? Suspender(string motivo)
    {
        // (b) IDEMPOTENCIA — operación válida pero redundante → NO-OP (no es un error)
        if (Suspendida)
            return null;   // ya está suspendida: no emitimos un hecho duplicado

        return new EmpresaSuspendida(motivo);
    }

    public EmpresaReactivada Reactivar() => new();

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

public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly List<object> _historia = new();   // el stream es DUEÑO de su historia

    public void Append(object hecho) => _historia.Add(hecho);   // ESCRIBIR: anota un hecho

    public T Get()                                              // LEER: crea y rehidrata
    {
        var entidad = new T();
        entidad.Load(_historia);   // reproduce la historia
        return entidad;
    }
}
