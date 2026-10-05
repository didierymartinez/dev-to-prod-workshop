var stream = new EventStream<Empresa>();
stream.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));

var despachador = new Despachador();
despachador.Registrar(new CambiarPlanHandler(stream));
despachador.Registrar(new SuspenderHandler(stream));

object comando = new SuspenderEmpresa("falta de pago");   // llega como object
despachador.Enviar(comando);                              // encuentra SuspenderHandler por el tipo y lo llama

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

public record CambiarPlanDeEmpresa(string NuevoPlan);
public record SuspenderEmpresa(string Motivo);

public interface ICommandHandler<TCommand>
{
    void Handle(TCommand comando);
}

public class CambiarPlanHandler(EventStream<Empresa> stream) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd) =>
        stream.Append(stream.Get().CambiarPlan(cmd.NuevoPlan));
}

public class SuspenderHandler(EventStream<Empresa> stream) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var hecho = stream.Get().Suspender(cmd.Motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}

public class Despachador
{
    private readonly Dictionary<Type, Action<object>> _handlers = new();

    // al registrar conocemos T: guardamos una lambda que castea el object a T y llama Handle
    public void Registrar<T>(ICommandHandler<T> handler)
        => _handlers[typeof(T)] = (object comando) => handler.Handle((T)comando);

    // al enviar solo tenemos un object: buscamos su handler por el tipo del comando y lo llamamos
    public void Enviar(object comando)
        => _handlers[comando.GetType()](comando);
}
