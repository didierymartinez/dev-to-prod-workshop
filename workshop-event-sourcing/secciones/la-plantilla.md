# La plantilla

Construiste, pieza por pieza, todo lo que hace falta: un agregado que emite y se aplica hechos, un almacén que persiste sin confirmar, la rehidratación, la unidad de trabajo. Hoy lo **reúnes** en una forma reusable — la de `Cosmos.BuildingBlocks`.

## 🎯 El Objetivo

Recoger lo construido en una **plantilla** —`AggregateRoot` + unidad de trabajo sobre Marten + un doble de test— de modo que un agregado nuevo no repita la plomería, y **operarla** con la `Empresa`.

## 💥 El dolor: cada agregado repite la misma plomería

Ya tienes dos agregados, `Empresa` y `SuspensionDeEmpresa` (de [El proceso tiene dueño](./el-proceso-tiene-dueno.md)), y un handler que guarda los dos en una transacción a mano: tu `SuspenderHandler` hace `Append` en la empresa y `StartStream` en el proceso, en la misma sesión. Cada handler repite la misma plomería: rehidratar, saber si el stream **nace** (`StartStream`) o **crece** (`Append`), y guardar. Y cada agregado decide a su manera: `SuspensionDeEmpresa` devuelve los hechos para que su handler los anote, y la `Empresa` perdió sus verbos en el swap. El día que llegue `Pago` o `Contrato`, esa plomería se copia otra vez, y cada copia puede quedar distinta. Un motor maduro la captura **una vez**, en piezas base que cualquier agregado hereda.

## 🔧 Las piezas base

Dos piezas cargan casi todo. Un `AggregateRoot` que cualquier agregado hereda —lleva la lista de hechos sin confirmar y el `Emitir`/`MarcarConfirmados`—. Y una **unidad de trabajo** sobre la sesión de Marten que sabe la diferencia entre nacer y crecer, y persiste los sin-confirmar de todos los agregados que tocaste, en una transacción. Es la transacción de tu `SuspenderHandler`, hecha pieza.

> 🆕 **La plantilla: `AggregateRoot` + `MartenUnitOfWork` + el doble.** El `AggregateRoot` base guarda `SinConfirmar` y ofrece `Emitir` (acumular) y `MarcarConfirmados`; cada agregado concreto solo añade sus `Apply(TEvento)` y sus verbos de decisión. La `MartenUnitOfWork` distingue **nacer** (`Registrar` → `StartStream`) de **crecer** (`Cargar` → `Append`) y en `CommitAsync` vuelca los `SinConfirmar` de todos y hace un solo `SaveChanges`. El doble en memoria —el puerto de [El puerto propio](./el-puerto-propio.md), maduro— implementa la misma unidad de trabajo sin Postgres, para los tests de reglas rápidos.

> ⚠️ **Aquí `Emitir` solo acumula.** En [El agregado recuerda](./el-agregado-recuerda.md) también aplicaba, porque la base tenía tu `Aplicar(object)` con su `switch`. Ahora los `Apply(TEvento)` son por convención de Marten, y la base no los conoce: por eso cada verbo hace `Apply(h); Emitir(h);`. Si olvidas el `Apply`, el hecho se guarda pero el agregado no lo ve, y el siguiente verbo decide a ciegas, como en [Un acto, dos hechos](./un-acto-dos-hechos.md).

> 🛠️ **Inténtalo tú.** (1) Reescribe tu `AggregateRoot` como base de la plantilla: `SinConfirmar`, `Emitir`, `MarcarConfirmados` y una propiedad `Id`. Quítale `Aplicar` y `Load`: ahora rehidrata Marten. (2) Haz que `Empresa` lo herede; su `Id` pasa a la base. Sus verbos (`Registrar`, `Suspender`, `CambiarPlan`) aplican el hecho a sí mismos (`Apply(h)`) **y** lo emiten (`Emitir(h)`); un solo juego de `Apply(TEvento)` —el mismo que Marten usa al rehidratar—. `Suspender` recibe el motivo y el id del proceso, porque `EmpresaSuspendida` lleva los dos desde [El proceso tiene dueño](./el-proceso-tiene-dueno.md). Abrir el stream del proceso sigue siendo trabajo del `SuspenderHandler`. (3) Escribe `MartenUnitOfWork` con `Registrar`/`Cargar`/`CommitAsync`. (4) Opérala en tu `Program.cs`, antes de `app.Run()`, como la siembra de [El host y la inyección](./el-host-y-la-inyeccion.md): registra una empresa nueva y confirma; cárgala, suspéndela y confirma; rehidrata y verifica los dos hechos.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// AggregateRoot base: la plomería que todo agregado hereda (una vez)
public abstract class AggregateRoot
{
    private readonly List<object> _sinConfirmar = new();
    public string Id { get; protected set; }
    public IReadOnlyList<object> SinConfirmar => _sinConfirmar;
    protected void Emitir(object hecho) => _sinConfirmar.Add(hecho);   // el verbo ya aplicó; esto solo acumula
    public void MarcarConfirmados() => _sinConfirmar.Clear();
}
```

```csharp
// unidad de trabajo sobre Marten: nacer (StartStream) vs crecer (Append), todo en una transacción
public class MartenUnitOfWork
{
    private readonly IDocumentSession _s;
    private readonly List<AggregateRoot> _nuevos = new();
    private readonly List<AggregateRoot> _modificados = new();
    public MartenUnitOfWork(IDocumentSession s) => _s = s;

    public void Registrar(AggregateRoot a) => _nuevos.Add(a);          // un stream que nace
    public async Task<T> Cargar<T>(string id) where T : AggregateRoot  // uno existente, que va a crecer
    {
        var a = await _s.Events.AggregateStreamAsync<T>(id);
        if (a != null) _modificados.Add(a);
        return a;
    }
    public async Task CommitAsync()
    {
        foreach (var a in _nuevos)      _s.Events.StartStream(a.Id, a.SinConfirmar.ToArray());
        foreach (var a in _modificados) if (a.SinConfirmar.Count > 0) _s.Events.Append(a.Id, a.SinConfirmar.ToArray());
        await _s.SaveChangesAsync();                                   // una transacción para todos
        foreach (var a in _nuevos.Concat(_modificados)) a.MarcarConfirmados();
    }
}
```

```csharp
// Empresa sobre la plantilla: sus Apply + sus verbos. Cero plomería de persistencia.
public class Empresa : AggregateRoot      // el Id ya viene de la base: quítalo de aquí
{
    // … tus propiedades y tus Apply, como los tienes: son los MISMOS que Marten usa al rehidratar …

    public static Empresa Registrar(string id, string nit, string nombre, string plan)
    {
        var e = new Empresa { Id = id };
        var h = new EmpresaRegistrada(nit, nombre, plan);
        e.Apply(h); e.Emitir(h);          // aplica a sí mismo + acumula
        return e;
    }
    public void Suspender(string motivo, string suspensionId)
    {
        if (Suspendida) return;
        var h = new EmpresaSuspendida(motivo, suspensionId);   // el stream del proceso lo abre el SuspenderHandler
        Apply(h); Emitir(h);
    }
    public void CambiarPlan(string plan)
    {
        var h = new PlanCambiado(plan);
        Apply(h); Emitir(h);
    }
}
```

Y operarla:

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run()
var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya

// nacer
await using (var s = store.LightweightSession())
{
    var uow = new MartenUnitOfWork(s);
    uow.Registrar(Empresa.Registrar("emp-1", "900", "Andes", "Básico"));
    await uow.CommitAsync();
}
// crecer
await using (var s = store.LightweightSession())
{
    var uow = new MartenUnitOfWork(s);
    var e = await uow.Cargar<Empresa>("emp-1");
    e.Suspender("mora", "susp-emp-1-2");   // el id con la forma que arma tu SuspenderHandler
    await uow.CommitAsync();   // emp-1 queda con 2 hechos; Suspendida = true al rehidratar
}
```

Después de la primera corrida, quita el nacer y el crecer, y deja el `store`: volver a registrar `emp-1` lanza `ExistingStreamIdCollisionException`.

Un agregado nuevo (`Pago`, `Contrato`) hereda `AggregateRoot` y solo escribe sus `Apply` y sus verbos — la unidad de trabajo ya sabe persistirlo. Y para los tests de reglas rápidos, un `MartenUnitOfWork` en memoria (un `Dictionary` por stream, como el `InMemoryEventStore` de [El puerto propio](./el-puerto-propio.md)) corre sin Postgres, sosteniendo las mismas garantías.

</details>

## 🔨 Rómpelo: un segundo agregado, sin plomería

Migra `SuspensionDeEmpresa` a la plantilla, y opera la empresa y su proceso con la **misma** unidad de trabajo:

```csharp
// emp-2 nace con la plantilla (una sola vez)
await using (var s = store.LightweightSession())
{
    var uow = new MartenUnitOfWork(s);
    uow.Registrar(Empresa.Registrar("emp-2", "900200000", "Llanos", "Básico"));
    await uow.CommitAsync();
}
// en UNA unidad de trabajo: la empresa se suspende y su proceso nace
await using (var s = store.LightweightSession())
{
    var uow = new MartenUnitOfWork(s);
    var e = await uow.Cargar<Empresa>("emp-2");
    e.Suspender("mora", "susp-emp-2-2");
    uow.Registrar(SuspensionDeEmpresa.Solicitar("susp-emp-2-2", "emp-2", e.Nit, e.Plan));
    await uow.CommitAsync();   // los dos streams, en una transacción
}
// emp-2:        Suspendida=True ProcesoAbierto=susp-emp-2-2
// susp-emp-2-2: Facturacion=EnCurso Accesos=EnCurso
```

Para eso, `SuspensionDeEmpresa` hereda `AggregateRoot` (su `Id` pasa a la base) y nace con un verbo `static`, `Solicitar`, como `Empresa.Registrar`. Sus métodos que deciden dejan de devolver hechos: por cada hecho, hacen `Apply(h); Emitir(h);`. Por ejemplo:

```csharp
public void ConfirmarCobroDeMulta()
{
    if (Facturacion != EstadoIntegracion.EnCurso) return;
    var h = new CobroDeMultaConfirmado(); Apply(h); Emitir(h);
    if (Accesos == EstadoIntegracion.Aplicado) { var ef = new SuspensionEfectiva(); Apply(ef); Emitir(ef); }
}
```

Y el proceso decide con la misma pieza: cárgalo con `Cargar<SuspensionDeEmpresa>`, llama `ConfirmarCobroDeMulta()` y confirma. Al rehidratar, `Facturacion=Aplicado`. No escribiste ni un `StartStream`, ni un `Append`, ni un `MarcarConfirmados` nuevos: la plantilla los puso. Eso es lo que captura una plantilla: la plomería una vez, el dominio muchas.

Tu `ProcesoDeSuspensionHandler` deja de compilar: su `Decidir` esperaba que el método devolviera los hechos. Haz que la lambda solo decida (`Action<SuspensionDeEmpresa>`) y toma los hechos de `proceso.SinConfirmar`. Su `Append` con la versión esperada se queda como está: la unidad de trabajo todavía no la tiene.

## El Descubrimiento

Todo el motor que construiste a mano —emitir, acumular, nacer vs crecer, rehidratar, la transacción— se recoge en dos piezas base: un `AggregateRoot` que cualquier agregado hereda, y una unidad de trabajo que traduce "los hechos sin confirmar de lo que toqué" a `StartStream`/`Append` en una transacción de Marten. Un agregado nuevo ya no repite plomería: solo declara sus hechos y sus reglas. Y el doble de test que sale del puerto de [El puerto propio](./el-puerto-propio.md) mantiene los tests rápidos sin Postgres. Esto **es** `Cosmos.BuildingBlocks` en miniatura —el destino al que el taller apuntaba—: no una librería que te enseñan a usar a ciegas, sino una que reconoces pieza por pieza porque construiste cada una.

> 🌱 La plantilla persiste bien mientras nadie más escribe. Pero quedó una deuda desde [Concurrencia optimista](./concurrencia-optimista.md) (§9), que en [Todo o nada](./todo-o-nada.md) se volvió el `PRIMARY KEY(stream, version)`: al cargar-decidir-guardar, entre tu `Cargar` y tu `CommitAsync` **otro pudo escribir en el mismo stream**, y tu decisión se tomó sobre un estado viejo. La versión esperada —la concurrencia optimista— no está en la `MartenUnitOfWork` todavía. Cerrar esa deuda con la herramienta real de Marten (`FetchForWriting`) es el capstone: [El capstone: FetchForWriting](./el-capstone-fetchforwriting.md).

## ✅ Compruébalo

- [ ] `AggregateRoot` base tiene `SinConfirmar`, `Emitir`, `MarcarConfirmados`, `Id`; `Empresa` lo hereda y solo aporta sus `Apply` y sus verbos.
- [ ] `MartenUnitOfWork` distingue `Registrar` (→`StartStream`) de `Cargar` (→`Append`) y hace un solo `SaveChanges` en `CommitAsync`.
- [ ] Operas el ciclo nacer→crecer con la `Empresa` y al rehidratar ves los dos hechos.
- [ ] `SuspensionDeEmpresa` también hereda la plantilla: la empresa y su proceso entran en un solo `CommitAsync`, sin plomería nueva, y tu `ProcesoDeSuspensionHandler` sigue compilando.
- [ ] Sabes qué pieza es el doble de test (el `InMemoryEventStore`/UoW de §22) y por qué mantiene los tests de reglas rápidos.

## 🆘 Si algo salió mal

- **`CS0101`: ya existe una definición de `AggregateRoot`:** es tu base de [El agregado recuerda](./el-agregado-recuerda.md). Reescríbela en su sitio; no declares otra.
- **`CommitAsync` lanza `The stream key cannot be null or empty`:** dejaste un `Id` propio en el agregado (el compilador lo avisa con `CS0108`). Tapa el de la base, y la unidad de trabajo lee el de la base, que quedó vacío. Quítalo del agregado.
- **`CommitAsync` no persiste nada:** ¿registraste el agregado (`Registrar`) o lo cargaste (`Cargar`)? La UoW solo vuelca lo que rastrea; un agregado creado con `new` y no registrado no se guarda.
- **Un agregado modificado se guarda como nuevo (o falla el `StartStream`):** `Cargar` va a `_modificados` (→`Append`); solo los creados van a `_nuevos` (→`StartStream`). No mezcles.
- **Marten no rehidrata tu agregado:** necesita un ctor sin parámetros y los `Apply(TEvento)` públicos; el `Id` lo pone el stream.
- **Duplicas la lógica de aplicar:** un solo juego de `Apply(TEvento)` — el decide lo llama y Marten lo llama al rehidratar. No mantengas un `switch` aparte.
- **`CommitAsync` lanza "configured to identify streams with Guids":** el `store` debe conservar `opts.Events.StreamIdentity = StreamIdentity.AsString` de la config de [El swap por reconocimiento](./el-swap-por-reconocimiento.md); los ids de stream aquí son strings (`"emp-1"`).

## 📓 Registra tu avance

> 💭 **Reto:** ¿qué plomería exacta dejó de repetir cada agregado gracias a `AggregateRoot` + `MartenUnitOfWork`? Y: nombra una pieza de tu motor a mano que ahora vive en la plantilla y di en qué sección la construiste.

```bash
git add .
git commit -m "ES · La plantilla (AggregateRoot + MartenUnitOfWork + doble)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La plantilla recoge el motor en dos piezas base —un `AggregateRoot` que todo agregado hereda y una `MartenUnitOfWork` que traduce los hechos sin confirmar a `StartStream`/`Append` en una transacción— más el doble de test del puerto, de modo que un agregado nuevo solo declara hechos y reglas: es `Cosmos.BuildingBlocks` en miniatura, reconocida pieza por pieza porque la construiste.

---

[⬅️ Volver: El comentario que sobrevive](./el-comentario-que-sobrevive.md)

[➡️ Siguiente: El capstone: FetchForWriting](./el-capstone-fetchforwriting.md)
