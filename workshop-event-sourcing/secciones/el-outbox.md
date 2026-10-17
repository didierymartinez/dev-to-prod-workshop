# El outbox

En [El swap por reconocimiento](./el-swap-por-reconocimiento.md), Marten se llevó tu diario. Pero tu `bandeja_salida` —el outbox que armaste a mano— sigue siendo tuya. Marten tiene un hermano para eso.

## 🎯 El Objetivo

Pagar la deuda del dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md): que el hecho y su anuncio entren en la **misma transacción**, con entrega durable y reintento. Lo da el **outbox de Wolverine**, sin tu bucle de `SELECT ... SKIP LOCKED`.

## 💥 El dolor: tu outbox a mano es correcto, pero incompleto

Recapitula lo que construiste: una tabla `bandeja_salida` escrita en la transacción del hecho (para que no haya fantasma), y `EntregarPendientes` que reclama filas con `FOR UPDATE SKIP LOCKED` y las entrega. Es un outbox de verdad — pero [El mensaje y la cola](./el-mensaje-y-la-cola.md) te mostró el muro: le faltan el reintento con backoff, el dead-letter del mensaje envenenado, el orden, sobrevivir reinicios. Cada uno es otra pieza que tendrías que escribir, correcta y probada.

**Wolverine** —la librería hermana de Marten para mensajería— trae ese outbox hecho: guarda el mensaje saliente en la **misma transacción** que los hechos de Marten, lo entrega **después** del commit, y reintenta y aparta lo envenenado por su cuenta.

## 🔧 Adoptar el outbox de Wolverine

La integración teje Wolverine con la sesión de Marten. Y de paso reconoces otra pieza tuya: Wolverine es también tu **despachador**.

> 🆕 **Wolverine es tu despachador *y* tu outbox.** En [El despachador](./el-despachador.md) quedó anotado: *"El día que una herramienta ofrezca hacerlos por ti —armar la tabla sola y encontrar el `Handle` por convención— sabrás exactamente qué hace por dentro"*. Es Wolverine: `bus.InvokeAsync(cmd)` es tu `Enviar`; descubre el `Handle` por el **tipo del parámetro** (tu `Dictionary<Type, handler>`, automático); e **inyecta** la `IDocumentSession` como parámetro del método (tu `Registrar(new Handler(store))`, ahora sin el `new`). Por eso los handlers son clases `static` con un método `Handle`. Y publicar un mensaje es **devolverlo**: Wolverine trata el valor de retorno de un handler como un mensaje a publicar (*cascading*), lo guarda en su outbox en la transacción del hecho, y lo despacha tras el commit.

> ⚠️ **Tres cosas de arranque.** (1) Wolverine llega en dos paquetes para `Empresas.Historia`: **`WolverineFx.Marten`**, la integración con Marten (trae `IntegrateWithWolverine`), y **`WolverineFx.RuntimeCompilation`**, porque Wolverine 6 no trae el compilador en el core (se auto-registra; sin él arranca con `InvalidOperationException: ... no IAssemblyGenerator (Roslyn) is registered`). (2) Wolverine corre en un **host** (su runtime procesa mensajes en background). Ese host, con inyección de dependencias de verdad, es [El host y la inyección](./el-host-y-la-inyeccion.md); aquí lo montas mínimo en el `Program.cs` de `Empresas.Historia`, y se muestra —no se reta— porque es idioma nuevo. (3) Wolverine solo busca handlers en el ensamblado que arranca el host, aquí `Empresas.Historia`. Los de `Facturacion` no los ve si no se lo dices con `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)`. Sin esa línea, un mensaje publicado no llega a nadie, y un `InvokeAsync` de ese mensaje lanza `IndeterminateRoutesException`.

> 🛠️ **Inténtalo tú.** Logra que esto funcione:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
> // el hecho quedó en el diario Y facturación recibió el anuncio — atómico, sin bandeja_salida
> ```
>
> Para eso: **(1)** enrola el outbox en la config (abajo). **(2)** En `Empresas.Historia`, escribe el handler `static` de suspender: appendea `EmpresaSuspendida` a la sesión y **devuelve** el evento público, con su nombre completo `Contratos.EmpresaSuspendidaV1`, como en [El evento público](./el-evento-publico.md). Este `SuspenderHandler` `static` **reemplaza** al de instancia, que recibía el store por constructor. Borra los tres handlers de instancia que comentaste en [El swap](./el-swap-por-reconocimiento.md): aquí solo suspender pasa por el bus. Borra el `Despachador`: Wolverine es tu despachador. Borra también `ICommandHandler<T>`: una clase `static` no implementa interfaces. El NIT sale de `NitDe`, que colgaba de tu `IEventStore`. El handler de Wolverine ya no recibe el store: recibe la `IDocumentSession`. Mueve `NitDe` a una clase `static` `Localizador` de `Empresas.Historia` y llámalo `Localizador.NitDe(...)`. Una clase `static` no ve las variables de tu `Program.cs`: dale un campo `public static string cadena` y asígnale tu `cadena` al arrancar. **(3)** En el proyecto `Facturacion` (que solo ve `Contratos`), crea `FacturacionHandler`, un handler consumidor `static` de `EmpresaSuspendidaV1` que deje una marca observable. Para eso, muda `MundoExterno` a `Facturacion`: nació en `Empresas.Historia` (§26), que `Facturacion` no ve. **(4)** Borra `bandeja_salida` (`DROP TABLE bandeja_salida;` en `psql`), `EntregarPendientes` y el `ReclamarYEntregar` de [El mensaje y la cola](./el-mensaje-y-la-cola.md): Wolverine los tiene. **(5)** En tu `Program.cs`, borra el bloque de [El swap](./el-swap-por-reconocimiento.md): el `DocumentStore.For`, el `StartStream` de `emp-7` y el choque de dos escritores. Ese bloque probaba Marten sin host, con choques a propósito. Desde aquí, el store es el del host. Borra también lo demás que comentaste allá: tu `viejo` y lo que lo usaba, `EventStream` y `AbrirStream`. `CorrerProyector` sigue comentado hasta [El daemon](./el-daemon-y-la-consistencia-eventual.md).

<details>
<summary>👉 Una forma de hacerlo</summary>

```bash
dotnet add Empresas.Historia package WolverineFx.Marten
dotnet add Empresas.Historia package WolverineFx.RuntimeCompilation
```

```csharp
// Empresas.Historia/Program.cs (la composición raíz): el outbox de Wolverine sobre Marten, en un host mínimo (el real, con DI, es §39)
using Microsoft.Extensions.DependencyInjection;   // GetRequiredService
using Microsoft.Extensions.Hosting;               // Host
using Wolverine;                                  // AddWolverine, IMessageBus
using Wolverine.Marten;                           // IntegrateWithWolverine
// (+ los using de Marten de §29)

Localizador.cadena = cadena;   // Localizador es static: no ve las variables de Program.cs
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
})
.UseLightweightSessions()
.IntegrateWithWolverine();                                        // enrola Marten en el outbox
builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();       // el SaveChanges (hecho + salientes) ocurre solo
    opts.Policies.UseDurableLocalQueues();       // el consumidor local también entrega DURABLE (sobrevive reinicios)
    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);   // los handlers de Facturacion: Wolverine solo busca en el ensamblado que arranca el host
});

using var host = builder.Build();
await host.StartAsync();
var bus = host.Services.GetRequiredService<IMessageBus>();        // el "Enviar" de tu despachador
```

```csharp
// Empresas.Historia: el handler es static, Handle por convención; la sesión llega inyectada como parámetro (using Marten; para IDocumentSession)
public static class SuspenderHandler
{
    public static Contratos.EmpresaSuspendidaV1 Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));   // el hecho
        var nit = Localizador.NitDe(cmd.EmpresaId);                                // el NIT: NitDe de §27, ahora en Localizador
        return new Contratos.EmpresaSuspendidaV1(nit, cmd.Motivo);   // cascading: al outbox, en la transacción del hecho
    }
}

// Facturacion/FacturacionHandler.cs: vive en Facturacion, que solo ve Contratos (using Contratos;)
public static class MundoExterno { public static List<string> Recibidos = new(); }   // mudado aquí desde Empresas.Historia, sin cambios

public static class FacturacionHandler
{
    public static void Handle(EmpresaSuspendidaV1 msg) => MundoExterno.Recibidos.Add($"suspendida NIT {msg.Nit}");   // marca observable, como en §26
}
```

```csharp
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
// el handler corre, Wolverine commitea hecho+mensaje juntos, y entrega el mensaje después (async)
await Task.Delay(500);   // el anuncio llega por la cola local, después del commit
Console.WriteLine(string.Join("\n", MundoExterno.Recibidos));   // → suspendida NIT <el que tu localizador guarda para emp-7>
```

Tres cosas para no tropezar:
- **De dónde sale el NIT:** el handler lo busca con `Localizador.NitDe(cmd.EmpresaId)` —el `localizador` leído de stream a NIT, como en [El evento público](./el-evento-publico.md)—, no lo lleva el comando. `Localizador` es un pequeño helper de `Empresas.Historia`; por eso se invoca sin `store.`. La traducción interno→público de §27 sigue igual; Wolverine solo cambia quién invoca al handler.
- **Simplifiqué el cuerpo:** aquí appendeo el hecho directo para enfocar el outbox. Cargar el agregado y pedirle la decisión (validando, como en [Decidir el futuro](./decidir-el-futuro.md)) es `FetchForWriting`, que llega en [El capstone](./el-capstone-fetchforwriting.md).
- **El consumidor corre en-proceso:** §30 paga la deuda de **atomicidad** (§26). Que el mensaje **viaje** a una facturación en otra máquina (el muro de [El mensaje y la cola](./el-mensaje-y-la-cola.md)) es **configurar** un transporte externo —routing de Wolverine a un broker—, config más que dolor nuevo; el mundo serverless de [En vivo y serverless](./en-vivo-y-serverless.md) lo usa como criterio (Azure Service Bus). Aquí el consumidor es local.

Wolverine persiste el mensaje en sus tablas (auto-schema, como Marten): `wolverine_incoming_envelopes` para el consumidor **local** (con `UseDurableLocalQueues`), o `wolverine_outgoing_envelopes` cuando el mensaje va a un transporte **externo** (un broker; config de routing de Wolverine). Dentro de la transacción de Marten, y lo despacha con reintento y dead-letter tras el commit. Sin `UseDurableLocalQueues`, la entrega local es en memoria: rápida, pero no sobrevive un reinicio — y ahí "sobrevivir reinicios" del muro de §28 no se pagaría.

</details>

## 🔨 Rómpelo: atómico, y qué pasa sin la config

**Atómico:** con cascading no puedes lanzar después de publicar, porque publicar es el `return`. Para verlo, publica a mano. Cambia el `Handle` a `async Task` y pídele también un `IMessageBus bus` (`using Wolverine;`): Wolverine lo inyecta igual que la sesión. Después del `Append`, haz `await bus.PublishAsync(new Contratos.EmpresaSuspendidaV1(nit, cmd.Motivo))`, y justo después lanza una excepción. El `InvokeAsync` la propaga. El hecho no entra al diario, `MundoExterno.Recibidos` queda vacío y `wolverine_incoming_envelopes` no guarda ninguna fila nueva. No cableaste esa atomicidad: el outbox y los hechos comparten la unidad de trabajo de Marten. Quita la excepción y el acto entra entero: el hecho al diario y el anuncio a `MundoExterno.Recibidos`. Al terminar, deja el handler como estaba, con el `return`.

**Sin el commit automático:** quita `AutoApplyTransactions()`. Nadie llama a `SaveChanges`: el anuncio llega a `MundoExterno.Recibidos`, pero el hecho **no** entra al diario de `emp-7`. Es el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), el que tanto te costó matar.

**Sin la integración:** vuelve a poner `AutoApplyTransactions()` y quita `IntegrateWithWolverine()`. Sin ella, Wolverine no sabe armar la `IDocumentSession` que pide tu handler, y se niega a generarlo. El `InvokeAsync` lanza `InvalidServiceLocationException` (*"Found service locations while generating code for Message Handler for SuspenderEmpresa"*), y no hay ni hecho ni anuncio. Esas dos líneas de config son las que atan el hecho a su anuncio; por eso no son decoración.

## El Descubrimiento

Tu `bandeja_salida` en la transacción del hecho (§26) + el claim con `SKIP LOCKED` (§28) eran, juntos, un outbox — correcto en su núcleo, incompleto en el muro. **Wolverine** es ese outbox terminado: el mensaje comparte la transacción del hecho (atómico, sin fantasma), y la entrega es durable, con reintento y dead-letter. Y al adoptarlo reconociste una segunda pieza: Wolverine **es tu despachador** de [El despachador](./el-despachador.md) —rutea por el tipo del parámetro, invoca el `Handle`, inyecta lo que el método pide—, hecho librería. Publicar es *devolver* un mensaje; la atomicidad la da que Wolverine y Marten comparten la unidad de trabajo. El mismo sabor del swap de Marten: construiste la idea a mano para entenderla, y adoptas la versión probada.

> 🌱 El outbox entrega **al menos una vez** (*at-least-once*): si la entrega se confirma pero el proceso cae antes de marcarla, Wolverine reintenta — y el mismo `EmpresaSuspendidaV1` puede llegarle a facturación **dos veces**. Con tu lista en memoria de un solo proceso nunca lo viste; con un transporte real es inevitable. Que el consumidor no haga daño al recibir el mismo mensaje dos veces —idempotencia— es el próximo dolor: [Llegó dos veces](./llego-dos-veces.md).

## ✅ Compruébalo

- [ ] Un handler `static` que appendea un hecho y **devuelve** el evento público entrega ambos atómicamente: el hecho al diario y el mensaje al consumidor (`MundoExterno.Recibidos` lo recibe), sin tu `bandeja_salida`.
- [ ] Reconoces a Wolverine como tu despachador de §7: `bus.InvokeAsync` = `Enviar`, descubre el `Handle` por el tipo, inyecta la `IDocumentSession`.
- [ ] Si el handler lanza después de publicar con `bus.PublishAsync`, ni el hecho ni el anuncio persisten.
- [ ] Sin `AutoApplyTransactions()` vuelve el fantasma de §26: el anuncio sale y el hecho no se guarda. Sin `IntegrateWithWolverine()`, Wolverine no genera el handler (`InvalidServiceLocationException`): no hay ni hecho ni anuncio.
- [ ] Sabes qué tablas de Wolverine (`wolverine_incoming_envelopes` local / `wolverine_outgoing_envelopes` externo) guardan el mensaje durable.
- [ ] Está referenciado el paquete `WolverineFx.RuntimeCompilation`; sin él, Wolverine no arranca.
- [ ] La config de Wolverine (en el `Program.cs` de `Empresas.Historia`) lleva `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)`, y sabes qué pasa sin ella.

## 🆘 Si algo salió mal

- **`no IAssemblyGenerator (Roslyn) is registered`:** falta el paquete `WolverineFx.RuntimeCompilation`. Es obligatorio en Wolverine 6. Al referenciarlo se registra solo. `opts.UseRuntimeCompilation()` es la forma explícita de registrarlo, y viene en ese mismo paquete: sin él, esa línea no compila (`CS1061`).
- **`bus` no existe / no arranca nada:** falta montar el host (`builder.Build()` + `await host.StartAsync()`) y obtener `IMessageBus` de sus servicios. El host mínimo está en el `<details>`.
- **El mensaje no llega al consumidor:** ¿**devolviste** el evento público desde el handler (cascading), o solo lo construiste sin retornarlo? Lo que se **devuelve** se publica. ¿O falta `opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly)` en el `AddWolverine`? Sin ella Wolverine no ve los handlers de `Facturacion`: lo publicado no llega a nadie, y un `InvokeAsync` directo lanza `IndeterminateRoutesException`.
- **El anuncio llega pero el hecho no está en el diario:** falta `opts.Policies.AutoApplyTransactions()`. Nadie llama a `SaveChanges`, y vuelve el fantasma de §26 (lo ves en el 🔨).
- **`InvalidServiceLocationException: Found service locations while generating code for Message Handler for SuspenderEmpresa`:** falta `.IntegrateWithWolverine()` tras el `AddMarten(...)`. Sin ella, Wolverine no sabe armar la `IDocumentSession` del handler, y no hay ni hecho ni anuncio.
- **El consumidor recibe el mensaje dos veces:** no es un bug — es *at-least-once*; se maneja en [Llegó dos veces](./llego-dos-veces.md).

## 📓 Registra tu avance

> 💭 **Reto:** tu `bandeja_salida` + `EntregarPendientes` + el claim de §28 hacían casi lo que hace el outbox de Wolverine. ¿Qué de ese "casi" te faltaba, y cómo reconoces en Wolverine también a tu `Despachador` de §7?

```bash
git add .
git commit -m "ES · El outbox (Wolverine: despachador + outbox durable)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Tu outbox a mano era correcto pero incompleto; **Wolverine** lo termina —el mensaje comparte la transacción de Marten (atómico, sin fantasma), entrega durable con reintento— y de paso es tu **despachador** de §7 hecho librería (rutea por tipo, invoca el `Handle`, inyecta la sesión); publicar es *devolver* un mensaje, al precio de que la entrega es *at-least-once*.

---

[⬅️ Volver: El swap por reconocimiento](./el-swap-por-reconocimiento.md)

[➡️ Siguiente: Llegó dos veces](./llego-dos-veces.md)
