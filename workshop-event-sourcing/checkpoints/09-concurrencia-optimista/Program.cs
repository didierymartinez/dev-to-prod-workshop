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

store.AbrirStream<Empresa>("emp-8").Append(new EmpresaRegistrada("Textiles Norte", "Básico"));

var a = store.AbrirStream<Empresa>("emp-8");
var b = store.AbrirStream<Empresa>("emp-8");
var ea = a.Get();   // A carga la empresa: activa
var eb = b.Get();   // B la carga al mismo tiempo: también la ve activa

var ha = ea.Suspender("falta de pago");          // A decide suspenderla…
if (ha is not null) a.Append(ha);                // …y la guarda
try
{
    b.Append(eb.CambiarPlan("Enterprise"));      // trae la versión 2 → 💥 ya ocupada
}
catch (ConcurrencyException ex)
{
    Console.WriteLine($"B chocó: {ex.Message}");
}

var final = store.AbrirStream<Empresa>("emp-8").Get();
Console.WriteLine($"emp-8: plan {final.Plan}, suspendida={final.Suspendida}");

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
