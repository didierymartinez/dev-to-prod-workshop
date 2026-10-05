var store = new EventStore();

var s = store.AbrirStream<Empresa>("emp-7");
var e = s.Get();                 // empresa vacía (el diario aún no tiene eventos)
e.Registrar("Constructora Andes", "Básico");
e.Suspender("falta de pago");
s.Append(e);                     // v1 registrada, v2 suspendida — en un solo Append

new PagarDeudaHandler(store).Handle(new PagarDeuda("emp-7", 500));   // el acto: v3 pago, v4 reactivada

var empresa = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"Tras recargar → Suspendida={empresa.Suspendida}, DeudaPendiente={empresa.DeudaPendiente}");

public record EmpresaRegistrada(string Nombre, string Plan);
public record PlanCambiado(string NuevoPlan);
public record EmpresaSuspendida(string Motivo);
public record EmpresaReactivada();
public record PagoRegistrado(int Monto);

public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);

public abstract class AggregateRoot
{
    private readonly List<object> _sinConfirmar = new();
    public IReadOnlyList<object> SinConfirmar => _sinConfirmar;
    public void MarcarConfirmados() => _sinConfirmar.Clear();

    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia) Aplicar(hecho);   // replay: solo aplica
    }

    protected void Emitir(object hecho)   // decidir: aplica Y recuerda
    {
        Aplicar(hecho);
        _sinConfirmar.Add(hecho);
    }

    protected abstract void Aplicar(object hecho);
}

public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida { get; private set; }
    public bool   DeudaPendiente { get; private set; }
    public int    Reactivaciones { get; private set; }

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;
            case PlanCambiado p:      Plan = p.NuevoPlan; break;
            case EmpresaSuspendida:   Suspendida = true; DeudaPendiente = true; break;
            case PagoRegistrado:      DeudaPendiente = false; break;
            case EmpresaReactivada:   Suspendida = false; Reactivaciones++; break;
        }
    }

    // Crear también es un verbo ahora: antes insertabas EmpresaRegistrada a mano;
    // con Append(agg), la creación emite como los demás.
    public void Registrar(string nombre, string plan) => Emitir(new EmpresaRegistrada(nombre, plan));

    public void CambiarPlan(string nuevoPlan)
    {
        if (Suspendida)   // la validación de antes, intacta
            throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");
        Emitir(new PlanCambiado(nuevoPlan));
    }

    public void Suspender(string motivo)
    {
        if (Suspendida) return;                 // idempotencia: no emite, no acumula
        Emitir(new EmpresaSuspendida(motivo));
    }

    public void RegistrarPago(int monto) => Emitir(new PagoRegistrado(monto));

    public void Reactivar()
    {
        if (DeudaPendiente)
            throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");
        Emitir(new EmpresaReactivada());
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

    public void Append(T agg)
    {
        foreach (var hecho in agg.SinConfirmar)
        {
            var siguiente = _version + 1;
            _store.AppendEvent(_aggregateId, new EventoAlmacenado(siguiente, hecho));
            _version = siguiente;                         // solo si el almacén lo aceptó
        }
        agg.MarcarConfirmados();
    }
}

public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);
public record PagarDeuda(string EmpresaId, int Monto);

public interface ICommandHandler<TCommand>
{
    void Handle(TCommand comando);
}

// Los handlers: cargar → actuar → guardar el agregado.
public class CambiarPlanHandler(EventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public void Handle(CambiarPlanDeEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.CambiarPlan(cmd.NuevoPlan);
        stream.Append(e);
    }
}

public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.Suspender(cmd.Motivo);       // ya no compara contra null: el no-op vive dentro
        stream.Append(e);
    }
}

public class PagarDeudaHandler(EventStore store) : ICommandHandler<PagarDeuda>
{
    public void Handle(PagarDeuda cmd)
    {
        var stream = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var e = stream.Get();
        e.RegistrarPago(cmd.Monto);
        e.Reactivar();
        stream.Append(e);
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
