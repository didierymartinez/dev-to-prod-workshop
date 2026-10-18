# La plantilla

Construiste, pieza por pieza, un agregado que emite y se aplica hechos, un almacén, la rehidratación y la unidad de trabajo. Hoy lo **reúnes** en una forma reusable, la de `Cosmos.BuildingBlocks`.

## 🎯 El Objetivo

Recoger lo construido en una **plantilla** (`AggregateRoot` + unidad de trabajo sobre Marten) para que un agregado nuevo no repita la plomería, y **operarla** con la `Empresa` y con su proceso de suspensión.

## 💥 El dolor: cada agregado repite la misma plomería

Ya tienes dos agregados, `Empresa` y `SuspensionDeEmpresa` (de [El proceso tiene dueño](./el-proceso-tiene-dueno.md)), y un handler que guarda los dos en una transacción a mano: tu `SuspenderHandler` hace `Append` en la empresa y `StartStream` en el proceso, en la misma sesión. Cada handler repite la misma plomería: rehidratar, saber si el stream **nace** (`StartStream`) o **crece** (`Append`), y guardar. Y cada agregado decide a su manera: `SuspensionDeEmpresa` devuelve los hechos para que su handler los anote, y la `Empresa` perdió sus verbos en el swap. El día que llegue `Pago` o `Contrato`, esa plomería se copia otra vez, y cada copia puede quedar distinta.

## 🔧 Las piezas base

> 🆕 **La plantilla: `AggregateRoot` + `MartenUnitOfWork`.** El `AggregateRoot` base guarda `SinConfirmar` y ofrece `Emitir` (acumular) y `MarcarConfirmados`; cada agregado concreto solo añade sus `Apply(TEvento)` y sus verbos de decisión. La `MartenUnitOfWork` distingue **nacer** (`Registrar` → `StartStream`) de **crecer** (`Cargar` → `Append`) y en `CommitAsync` vuelca los `SinConfirmar` de todos y hace un solo `SaveChanges`: es la transacción de tu `SuspenderHandler`, hecha pieza. No elige tenant: trabaja con la sesión que le das.

> ⚠️ **Aquí `Emitir` solo acumula.** En [El agregado recuerda](./el-agregado-recuerda.md) también aplicaba, porque la base tenía tu `Aplicar(object)` con su `switch`. Ahora los `Apply(TEvento)` son por convención de Marten, y la base no los conoce: por eso cada verbo hace `Apply(h); Emitir(h);`. Si olvidas el `Apply`, el hecho se guarda pero el agregado no lo ve, y el siguiente verbo decide a ciegas, como en [Un acto, dos hechos](./un-acto-dos-hechos.md).

> ⚠️ **La unidad de trabajo no reserva el NIT.** `Registrar` solo abre el stream. El NIT lo reserva el `Insert` del `Localizador` de [El swap por reconocimiento](./el-swap-por-reconocimiento.md): sin él, `Localizador.StreamDe` no encuentra la empresa, y otro registro con el mismo NIT entra sin choque. Haz el `Insert` en la sesión de la unidad de trabajo, antes del `CommitAsync`, y entra en su mismo `SaveChanges`. No lo metas dentro de la unidad de trabajo: ella sirve a cualquier agregado, y el NIT es de la empresa.

> 🛠️ **Inténtalo tú.** (1) Reescribe tu `AggregateRoot` como base de la plantilla: `SinConfirmar`, `Emitir`, `MarcarConfirmados` y una propiedad `Id`. Quítale `Aplicar` y `Load`: ahora rehidrata Marten. (2) Haz que `Empresa` lo herede; su `Id` pasa a la base, con su `[JsonInclude]`, porque el snapshot de [El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md) la relee entera. Sus verbos (`Registrar`, `Suspender`, `CambiarPlan`, `RegistrarPago`, `Reactivar`) hacen `Apply(h); Emitir(h);`, con los mismos `Apply(TEvento)` que Marten usa al rehidratar. `Suspender` recibe el motivo y el id del proceso, porque `EmpresaSuspendida` lleva los dos desde [El proceso tiene dueño](./el-proceso-tiene-dueno.md). Abrir el stream del proceso sigue siendo trabajo del `SuspenderHandler`. `RegistrarPago` recibe el monto y la referencia del pago, y no hace nada si `YaRegistro(referencia)`: es la guarda de [Llegó dos veces](./llego-dos-veces.md). No es el comando `RegistrarPago` de esa sección, el aviso del banco que viaja por el bus: el verbo es la empresa, que decide si ese pago entra. `CambiarPlan` conserva su regla de [Decidir el futuro](./decidir-el-futuro.md): con la empresa suspendida, lanza `ReglaDeNegocioException`. `Reactivar` conserva la suya de [Un acto, dos hechos](./un-acto-dos-hechos.md): con deuda pendiente, lanza `ReglaDeNegocioException`. (3) Escribe `MartenUnitOfWork` con `Registrar`/`Cargar`/`CommitAsync`. `Cargar` lee del snapshot con `FetchLatest`, como tus handlers. (4) Opérala en tu `Program.cs`, antes de `app.Run()`, como la siembra de [El host y la inyección](./el-host-y-la-inyeccion.md): registra una empresa nueva con su `Localizador` y confirma; cárgala, suspéndela y confirma; rehidrata y verifica los dos hechos.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// AggregateRoot base: la plomería que todo agregado hereda (una vez). using System.Text.Json.Serialization;
public abstract class AggregateRoot
{
    private readonly List<object> _sinConfirmar = new();
    [JsonInclude] public string Id { get; protected set; }   // el snapshot lo relee: sin esto, la empresa vuelve sin Id
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
        var a = await _s.Events.FetchLatest<T>(id);                    // del snapshot, como tus handlers
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
public class Empresa : AggregateRoot      // el Id, con su [JsonInclude], ya viene de la base: quítalo de aquí
{
    // … tus propiedades con su [JsonInclude], el HashSet sin readonly y tus Apply, como los tienes: Marten usa esos Apply al rehidratar …

    public static Empresa Registrar(string id, string nit, string nombre, string plan)
    {
        var e = new Empresa { Id = id };
        var h = new EmpresaRegistrada(nit, nombre, plan);
        e.Apply(h); e.Emitir(h);          // aplica a sí mismo + acumula
        return e;
    }
    public void Suspender(string motivo, string suspensionId)
    {
        if (ProcesoAbierto is not null) return;   // la regla de El proceso tiene dueño: un proceso a la vez
        var h = new EmpresaSuspendida(motivo, suspensionId);   // el stream del proceso lo abre el SuspenderHandler
        Apply(h); Emitir(h);
    }
    public void CambiarPlan(string plan)
    {
        if (Suspendida) throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");   // la regla de Decidir el futuro
        var h = new PlanCambiado(plan);
        Apply(h); Emitir(h);
    }
    public void RegistrarPago(int monto, string referencia)
    {
        if (YaRegistro(referencia)) return;   // el mismo pago, en otro aviso: no registra nada
        var h = new PagoRegistrado(monto, referencia);
        Apply(h); Emitir(h);
    }
    public void Reactivar()
    {
        if (DeudaPendiente) throw new ReglaDeNegocioException("No puedes reactivar con deuda pendiente.");
        var h = new EmpresaReactivada();
        Apply(h); Emitir(h);
    }
}
```

Y operarla:

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run()
var store = app.Services.GetRequiredService<IDocumentStore>();   // si no lo tienes ya

// nacer: el stream y su NIT, en la misma sesión
await using (var s = store.LightweightSession("acme"))
{
    var uow = new MartenUnitOfWork(s);
    var e = Empresa.Registrar("emp-1", "900", "Andes", "Básico");
    s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });   // reserva el NIT; entra en el SaveChanges del CommitAsync
    uow.Registrar(e);
    await uow.CommitAsync();
}
// crecer
await using (var s = store.LightweightSession("acme"))
{
    var uow = new MartenUnitOfWork(s);
    var e = await uow.Cargar<Empresa>("emp-1");
    e.Suspender("mora", "susp-emp-1-2");   // el id con la forma que arma tu SuspenderHandler
    await uow.CommitAsync();   // emp-1 queda con 2 hechos; Suspendida = true al rehidratar
}
```

Después de la primera corrida, quita el nacer y el crecer, y deja el `store`: volver a registrar `emp-1` lanza `ExistingStreamIdCollisionException`. El NIT quedó reservado: `docker exec empresas-db psql -U postgres -d empresas -c "SELECT data FROM mt_doc_localizador WHERE id = '900'"` muestra `{"Id": "900", "Stream": "emp-1"}`.

</details>

## 🔨 Rómpelo: un hecho, dos reactivaciones · no lo saltes

[Lo que la unidad de trabajo ya tiene](./lo-que-la-unidad-de-trabajo-ya-tiene.md) parte de lo que dejas aquí: `UseIdentityMapForAggregates = false`, con su `[Fact]`.

Tus verbos aplican cada hecho, y el snapshot `Inline` también. Júntalos en un solo acto, en tu `Program.cs`, antes de `app.Run()`: `emp-3` se suspende, paga y se reactiva.

```csharp
await using (var s = store.LightweightSession("acme"))
{
    Sembrar(s, "emp-3", "900300000", "Sabana", "Basico");   // nace, una sola vez
    await s.SaveChangesAsync();
}
await using (var s = store.LightweightSession("acme"))
{
    var uow = new MartenUnitOfWork(s);
    var e = await uow.Cargar<Empresa>("emp-3");
    e.Suspender("mora", "susp-emp-3-2");
    e.RegistrarPago(50_000, "BANCO-0001");
    e.Reactivar();   // ya pagó: la regla la deja pasar
    await uow.CommitAsync();
}
```

```sql
SELECT count(*) FROM mt_events WHERE stream_id = 'emp-3' AND type = 'empresa_reactivada';   -- 1
SELECT data -> 'Reactivaciones', data -> 'SinConfirmar' FROM mt_doc_empresa WHERE id = 'emp-3';
--  2 | [{"Motivo": "mora", "SuspensionId": "susp-emp-3-2"}, {"Monto": 50000, "Referencia": "BANCO-0001"}, {}]
```

El diario tiene una reactivación; el documento, dos. `FetchLatest` deja en la sesión la empresa que te devuelve. Al confirmar, el snapshot le aplica los hechos nuevos a esa misma empresa, y tus verbos ya los habían aplicado: cada hecho quedó dos veces. Y la guarda como la dejaron tus verbos, con `SinConfirmar` lleno: el documento escribe toda propiedad pública, y al releer, `SinConfirmar` no vuelve, porque no tiene `set`. Desde mañana, todo handler que cargue `emp-3` decide con dos reactivaciones, sin un error.

> 🆕 **`UseIdentityMapForAggregates`: Marten reusa el agregado que te dio.** Marten 9 lo trae en `true`: `FetchLatest` guarda en la sesión el agregado que devuelve, y el snapshot sigue desde ese objeto: Marten supone que nadie lo cambia. Tus verbos lo cambian. Con `opts.Events.UseIdentityMapForAggregates = false;` en el `AddMarten` de tu `AgregarEmpresas`, el snapshot ya no sigue desde tu objeto: le aplica los hechos nuevos a su propia copia del documento. Quitar el `Apply` de los verbos no es la cura: el verbo siguiente decidiría a ciegas, como avisa el ⚠️ de las piezas base. Un segundo `RegistrarPago` con `BANCO-0001`, en el mismo acto, volvería a entrar.

> 🛠️ **Inténtalo tú.** Quiero esto:
>
> ```sql
> SELECT id, data -> 'Reactivaciones', data -> 'SinConfirmar' FROM mt_doc_empresa WHERE id IN ('emp-3', 'emp-4');
> --  emp-3 | 1 | []
> --  emp-4 | 1 | []
> ```
>
> Para eso: **(1)** Pon esa línea en el `AddMarten` de tu `AgregarEmpresas`. Carga peso, como las de [El comentario que sobrevive](./el-comentario-que-sobrevive.md): escríbele el síntoma y súmale su `[Fact]` a `LineasQueCarganPeso`. Comenta la línea, corre `dotnet test` y mira caer ese `[Fact]`; descoméntala. **(2)** Quita los dos bloques de `emp-3`, y repite el acto con `emp-4` (su NIT `900400000`, su suspensión `susp-emp-4-2`). Corre una vez: `emp-4` sale bien, y `emp-3` sigue con dos. **(3)** Rehaz los documentos desde el diario, también el de `emp-1`, que guardó sus `SinConfirmar`: quita los bloques de `emp-4` y corre una vez, antes de `app.Run()`, tu `RebuildProjectionAsync("Empresa", …)` de [El stream que no para de crecer](./el-stream-que-no-para-de-crecer.md). Después, quítalo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, en el AddMarten de tu AgregarEmpresas
// NO quitar: en true, el snapshot vuelve a aplicar cada hecho que un verbo ya aplicó,
// y el documento cuenta de más (dos reactivaciones por una), sin un error.
opts.Events.UseIdentityMapForAggregates = false;
```

```csharp
// en LineasQueCarganPeso
[Fact]
public void El_snapshot_no_reusa_el_agregado_de_los_verbos() =>
    Assert.False(marten.Events.UseIdentityMapForAggregates,
        "Con UseIdentityMapForAggregates, el snapshot aplica dos veces cada hecho de un verbo, y el documento cuenta de más.");
```

</details>

## 🔧 Un segundo agregado, sin plomería

Migra `SuspensionDeEmpresa` a la plantilla, y opera la empresa y su proceso con la **misma** unidad de trabajo:

```csharp
// emp-2 nace con la plantilla (una sola vez), con su NIT
await using (var s = store.LightweightSession("acme"))
{
    var uow = new MartenUnitOfWork(s);
    var e = Empresa.Registrar("emp-2", "900200000", "Llanos", "Básico");
    s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });
    uow.Registrar(e);
    await uow.CommitAsync();
}
// en UNA unidad de trabajo: la empresa se suspende y su proceso nace
await using (var s = store.LightweightSession("acme"))
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
public void ConfirmarCobroDeMulta(DateOnly cobradaEl)
{
    if (Facturacion != EstadoIntegracion.EnCurso) return;
    var h = new CobroDeMultaConfirmado(cobradaEl); Apply(h); Emitir(h);
    if (Accesos == EstadoIntegracion.Aplicado) { var ef = new SuspensionEfectiva(); Apply(ef); Emitir(ef); }
}
```

Y el proceso decide con la misma pieza. Antes, quita los dos bloques de `emp-2`: ya corrieron, y volver a correrlos choca con `ExistingStreamIdCollisionException`. Luego cárgalo con `Cargar<SuspensionDeEmpresa>`, llama `ConfirmarCobroDeMulta` con la fecha del cobro (`new DateOnly(2026, 10, 17)`) y confirma. Al rehidratar, `Facturacion=Aplicado`. No escribiste ni un `StartStream`, ni un `Append`, ni un `MarcarConfirmados` nuevos: la plantilla los puso.

Tu `ProcesoDeSuspensionHandler` deja de compilar: su `Decidir` esperaba que el método devolviera los hechos. Haz que la lambda solo decida (`Action<SuspensionDeEmpresa>`) y toma los hechos de `proceso.SinConfirmar`. Su `ILogger`, su línea del descarte y su `Append` con la versión esperada se quedan como están: la unidad de trabajo todavía no tiene versión esperada.

Quita de tu `Program.cs` los bloques de `emp-2` y de su proceso, y deja el `store`: el host de tus tests corre ese código en cada arranque.

> 🔍 **¿Lo lograste?** `dotnet test` pasa en verde.

## El Descubrimiento

El motor que construiste a mano —emitir, acumular, nacer vs crecer, rehidratar, la transacción— cabe en dos piezas base: un `AggregateRoot` que cualquier agregado hereda, y una unidad de trabajo que traduce "los hechos sin confirmar de lo que toqué" a `StartStream`/`Append` en una transacción de Marten. La unidad carga del snapshot, y Marten no reusa el agregado que tus verbos cambian. Esto **es** `Cosmos.BuildingBlocks` en miniatura: una librería que reconoces pieza por pieza porque construiste cada una.

> 🌱 Tus tests de reglas siguen comentados desde [El swap por reconocimiento](./el-swap-por-reconocimiento.md). Probarlos en memoria, con un doble que se parezca de verdad a Marten, es [La plantilla se prueba](./la-plantilla-se-prueba.md).

## ✅ Compruébalo

- [ ] `Empresa` hereda `AggregateRoot` (`SinConfirmar`, `Emitir`, `MarcarConfirmados`, `Id` con su `[JsonInclude]`) y solo aporta sus `Apply` y sus verbos.
- [ ] Con `UseIdentityMapForAggregates` en `true`, un acto con `Reactivar` deja una reactivación en el diario y dos en el documento; con `false`, una. Su `[Fact]` cae si alguien quita la línea.
- [ ] `MartenUnitOfWork` distingue `Registrar` (→`StartStream`) de `Cargar` (→`Append`) en un solo `SaveChanges`: el ciclo nacer→crecer deja dos hechos en `emp-1`, y `mt_doc_localizador` tiene el NIT `900` apuntando a `emp-1`.
- [ ] `SuspensionDeEmpresa` también hereda la plantilla: la empresa y su proceso entran en un solo `CommitAsync`, sin plomería nueva, y tu `ProcesoDeSuspensionHandler` sigue compilando.

## 🆘 Si algo salió mal

- **`CS0101`: ya existe una definición de `AggregateRoot`:** es tu base de [El agregado recuerda](./el-agregado-recuerda.md). Reescríbela en su sitio; no declares otra.
- **`CommitAsync` lanza `The stream key cannot be null or empty`:** dejaste un `Id` propio en el agregado (el compilador lo avisa con `CS0108`). Tapa el de la base, y la unidad de trabajo lee el de la base, que quedó vacío. Quítalo del agregado.
- **`CommitAsync` no persiste nada, o guarda como nuevo un agregado que ya existía:** la unidad de trabajo solo vuelca lo que rastrea: `Registrar` para lo que nace (→`StartStream`), `Cargar` para lo que crece (→`Append`). Un agregado creado con `new` y no registrado no se guarda.
- **`CommitAsync` lanza `JasperFx.DocumentAlreadyExistsException`:** ese NIT ya tiene `Localizador`, de otra empresa. Es la reserva funcionando: no entra nada, ni el stream. Usa otro NIT.
- **Tus tests caen al arrancar el host, con `ExistingStreamIdCollisionException` o con una `NullReferenceException` que sale de tu `Program.cs`:** quedó ahí un bloque de `emp-1` a `emp-4`, y el host del test lo corre en cada arranque. Quítalo.
- **`ArgumentNullException: Value cannot be null. (Parameter 'key')` al confirmar:** el `Id` de la base perdió su `[JsonInclude]`, y el snapshot relee la empresa sin él.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- La plantilla: un agregado hereda `AggregateRoot` y solo declara sus hechos, sus `Apply` y sus verbos, y `MartenUnitOfWork` guarda sus hechos en una transacción. Al nacer una empresa, su `Localizador` va en la misma sesión. `UseIdentityMapForAggregates = false`: los verbos cambian el agregado que devuelve `Cargar`.
```

> 💭 **Reto:** ¿qué plomería exacta dejó de repetir cada agregado gracias a `AggregateRoot` + `MartenUnitOfWork`? Nombra una pieza de tu motor a mano que ahora vive en la plantilla, y di en qué sección la construiste. Y: con `UseIdentityMapForAggregates` en `true`, ¿por qué el documento de `emp-3` contaba dos reactivaciones si el diario tenía una?

```bash
git add .
git commit -m "ES · La plantilla (AggregateRoot + MartenUnitOfWork + un segundo agregado sin plomería)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La plantilla recoge el motor en un `AggregateRoot` que todo agregado hereda y una `MartenUnitOfWork` que guarda sus hechos sin confirmar en una transacción: `Cosmos.BuildingBlocks` en miniatura. Un agregado nuevo solo declara hechos y reglas, y el snapshot no reusa el agregado que sus verbos ya cambiaron.

---

[⬅️ Volver: El comentario que sobrevive](./el-comentario-que-sobrevive.md)

[➡️ Siguiente: La plantilla se prueba](./la-plantilla-se-prueba.md)
