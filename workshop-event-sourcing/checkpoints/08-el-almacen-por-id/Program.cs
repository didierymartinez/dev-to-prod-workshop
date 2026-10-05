var store = new EventStore();

// la historia previa de cada empresa (todavía no hay un comando para registrar)
store.AbrirStream<Empresa>("emp-7").Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
store.AbrirStream<Empresa>("emp-9").Append(new EmpresaRegistrada("Ferretería Sur", "Básico"));

var despachador = new Despachador();
despachador.Registrar(new SuspenderHandler(store));      // ← el ALMACÉN, no un stream; UNA vez
despachador.Registrar(new CambiarPlanHandler(store));

despachador.Enviar(new SuspenderEmpresa("emp-7", "falta de pago"));    // empresa 7
despachador.Enviar(new CambiarPlanDeEmpresa("emp-9", "Premium"));      // empresa 9 — mismo handler

var andes = store.AbrirStream<Empresa>("emp-7").Get();
var sur   = store.AbrirStream<Empresa>("emp-9").Get();
Console.WriteLine($"emp-7 {andes.Nombre}: suspendida={andes.Suspendida}");
Console.WriteLine($"emp-9 {sur.Nombre}: plan {sur.Plan}");

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

public class EventStore
{
    private readonly Dictionary<string, List<object>> _cajones = new();

    public List<object> GetEvents(string aggregateId)
        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();

    public void AppendEvent(string aggregateId, object hecho)
    {
        if (!_cajones.ContainsKey(aggregateId))   // 1ª vez: crea el cajón EN el diccionario
            _cajones[aggregateId] = new();
        _cajones[aggregateId].Add(hecho);
    }

    // AbrirStream vive en EventStore, así que this = el propio almacén
    public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
        => new(this, aggregateId);
}

public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly EventStore _store;
    private readonly string _aggregateId;

    public EventStream(EventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()                       // LEER: trae los hechos del cajón y rehidrata
    {
        var entidad = new T();
        entidad.Load(_store.GetEvents(_aggregateId));
        return entidad;
    }

    public void Append(object hecho)     // ESCRIBIR: al cajón de esta empresa
        => _store.AppendEvent(_aggregateId, hecho);
}

public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);

public interface ICommandHandler<TCommand>
{
    void Handle(TCommand comando);
}

public class CambiarPlanHandler(EventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        stream.Append(stream.Get().CambiarPlan(cmd.NuevoPlan));
    }
}

public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);   // buscar por id
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(cmd.Motivo);
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
