var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));

new CambiarPlanHandler(stream).Handle("Premium");
new SuspenderHandler(stream).Handle("falta de pago");

Console.WriteLine(stream.Get().Suspendida ? "suspendida" : "activa");   // suspendida

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

public class CambiarPlanHandler(EventStream<Empresa> stream)
{
    public void Handle(string nuevoPlan) =>
        stream.Append(stream.Get().CambiarPlan(nuevoPlan));
}

public class SuspenderHandler(EventStream<Empresa> stream)
{
    public void Handle(string motivo)
    {
        var hecho = stream.Get().Suspender(motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
