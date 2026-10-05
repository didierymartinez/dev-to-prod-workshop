var store = new EventStore();
var s = store.AbrirStream<Empresa>("emp-7");
s.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
s.Append(new EmpresaSuspendida("falta de pago"));    // suspendida por mora → queda con deuda

new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));   // 💥 ReglaDeNegocioException (esperada)

public record EmpresaRegistrada(string Nombre, string Plan);
public record PlanCambiado(string NuevoPlan);
public record EmpresaSuspendida(string Motivo);
public record EmpresaReactivada();
public record PagoRegistrado(int Monto);

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
    public bool   DeudaPendiente { get; private set; }

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

    public PagoRegistrado RegistrarPago(int monto) => new(monto);

    public EmpresaReactivada Reactivar()
    {
        if (DeudaPendiente)
            throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");
        return new();
    }

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;
            case PlanCambiado p:      Plan = p.NuevoPlan;                break;
            case EmpresaSuspendida:   Suspendida = true; DeudaPendiente = true; break;
            case PagoRegistrado:      DeudaPendiente = false;           break;
            case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;
        }
    }
}

// el sobre: envuelve el hecho con su POSICIÓN en el stream
public record EventoAlmacenado(int Version, object EventData);

public class ConcurrencyException(string mensaje) : Exception(mensaje);

public class EventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    public List<EventoAlmacenado> GetEvents(string aggregateId)
        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();

    public void AppendEvent(string aggregateId, EventoAlmacenado sobre)
    {
        if (!_cajones.ContainsKey(aggregateId))
            _cajones[aggregateId] = new();
        var cajon = _cajones[aggregateId];

        if (sobre.Version <= cajon.Count)   // esa posición ya está ocupada → alguien escribió primero
            throw new ConcurrencyException(
                $"La versión {sobre.Version} ya está ocupada (el cajón va en {cajon.Count}). " +
                "Alguien escribió mientras trabajabas — recarga la empresa y reintenta.");

        cajon.Add(sobre);
    }

    public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
        => new(this, aggregateId);
}

public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly EventStore _store;
    private readonly string _aggregateId;
    private int _version;                 // cuántos hechos había cuando cargué

    public EventStream(EventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()
    {
        var entidad = new T();
        var sobres  = _store.GetEvents(_aggregateId);
        entidad.Load(sobres.Select(s => s.EventData));   // desenvuelve: solo el hecho
        _version = sobres.Count;                          // recuerda la posición en que cargué
        return entidad;
    }

    public void Append(object hecho)
    {
        var siguiente = _version + 1;                     // este hecho ocupa la siguiente posición
        _store.AppendEvent(_aggregateId, new EventoAlmacenado(siguiente, hecho));
        _version = siguiente;                             // solo si el almacén lo aceptó
    }
}

public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);
public record PagarDeuda(string EmpresaId, int Monto);

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

public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        stream.Append(e.RegistrarPago(cmd.Monto));   // 1) registrar el pago
        stream.Append(e.Reactivar());                 // 2) reactivar
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
