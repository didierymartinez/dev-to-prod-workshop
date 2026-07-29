# El outbox

En [El swap por reconocimiento](./el-swap-por-reconocimiento.md), Marten se llevó tu diario. Pero tu `bandeja_salida` —el outbox que armaste a mano— sigue siendo tuya. Marten tiene un hermano para eso.

## 🎯 El Objetivo

Pagar la deuda del dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md): que el hecho y su anuncio entren en la **misma transacción**, con entrega durable y reintento. Lo da el **outbox de Wolverine**, sin tu bucle de `SELECT ... SKIP LOCKED`.

## 💥 El dolor: tu outbox a mano es correcto, pero incompleto

Recapitula lo que construiste: una tabla `bandeja_salida` escrita en la transacción del hecho (para que no haya fantasma), y `EntregarPendientes` que reclama filas con `FOR UPDATE SKIP LOCKED` y las entrega. Es un outbox de verdad — pero [El mensaje y la cola](./el-mensaje-y-la-cola.md) te mostró el muro: le faltan el reintento con backoff, el dead-letter del mensaje envenenado, el orden, sobrevivir reinicios. Cada uno es otra pieza que tendrías que escribir, correcta y probada.

**Wolverine** —la librería hermana de Marten para mensajería— trae ese outbox hecho: guarda el mensaje saliente en la **misma transacción** que los hechos de Marten, lo entrega **después** del commit, y reintenta y aparta lo envenenado por su cuenta.

## 🔧 Adoptar el outbox de Wolverine

La integración teje Wolverine con la sesión de Marten. Y de paso reconoces otra pieza tuya: Wolverine es también tu **despachador**.

> 🆕 **Wolverine es tu despachador *y* tu outbox.** En [El despachador](./el-despachador.md) sembraste esto: *"el día que una herramienta arme la tabla sola y encuentre el `Handle` por convención, sabrás qué hace por dentro"*. Es Wolverine: `bus.InvokeAsync(cmd)` es tu `Enviar`; descubre el `Handle` por el **tipo del parámetro** (tu `Dictionary<Type, handler>`, automático); e **inyecta** la `IDocumentSession` como parámetro del método (tu `Registrar(new Handler(store))`, ahora sin el `new`). Por eso los handlers son clases `static` con un método `Handle`. Y publicar un mensaje es **devolverlo**: Wolverine trata el valor de retorno de un handler como un mensaje a publicar (*cascading*), lo guarda en su outbox en la transacción del hecho, y lo despacha tras el commit.

> ⚠️ **Dos cosas de arranque.** (1) Wolverine 6 no trae el compilador en el core: añade **`WolverineFx.RuntimeCompilation`** (se auto-registra) o arranca con `InvalidOperationException: ... no IAssemblyGenerator (Roslyn) is registered`. (2) Wolverine corre en un **host** (su runtime procesa mensajes en background). Ese host, con inyección de dependencias de verdad, es [El host y la inyección](./el-host-y-la-inyeccion.md); aquí lo montas mínimo, y se muestra —no se reta— porque es idioma nuevo.

> 🛠️ **Inténtalo tú.** Logra que esto funcione:
>
> ```csharp
> await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
> // el hecho quedó en el diario Y facturación recibió el anuncio — atómico, sin bandeja_salida
> ```
>
> Para eso: **(1)** enrola el outbox en la config (abajo). **(2)** Escribe el handler `static` de suspender: appendea `EmpresaSuspendida` a la sesión y **devuelve** el evento público `EmpresaSuspendidaV1` (de [El evento público](./el-evento-publico.md)). **(3)** Crea un handler consumidor `static` de `EmpresaSuspendidaV1` (facturación) que deje una marca observable. **(4)** Borra `bandeja_salida` y `EntregarPendientes`: Wolverine los tiene.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// config: el outbox de Wolverine sobre Marten, en un host mínimo (el real, con DI, es §33)
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
});
// + paquete WolverineFx.RuntimeCompilation (se auto-registra)

using var host = builder.Build();
await host.StartAsync();
var bus = host.Services.GetRequiredService<IMessageBus>();        // el "Enviar" de tu despachador
```

```csharp
// el handler: static, Handle por convención; la sesión llega inyectada como parámetro
public static class SuspenderHandler
{
    public static EmpresaSuspendidaV1 Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));   // el hecho
        var nit = NitDe(cmd.EmpresaId);                                            // el NIT: NitDe de §27 (localizador)
        return new EmpresaSuspendidaV1(nit, cmd.Motivo);   // cascading: al outbox, en la transacción del hecho
    }
}

// el consumidor (facturación): otro handler static; deja marca observable como en §26
public static class FacturacionHandler
{
    public static void Handle(EmpresaSuspendidaV1 msg) => MundoExterno.Recibidos.Add($"suspendida NIT {msg.Nit}");
}
```

```csharp
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));
// el handler corre, Wolverine commitea hecho+mensaje juntos, y entrega el mensaje después (async)
```

Tres cosas para no tropezar:
- **De dónde sale el NIT:** el handler lo busca con `NitDe(cmd.EmpresaId)` —el `localizador` al revés de [El evento público](./el-evento-publico.md)—, no lo lleva el comando. Como en el swap tu store desapareció, `NitDe` y su tabla `localizador` ya no cuelgan de él: viven en un pequeño helper aparte (por eso se invoca sin `store.`). La traducción interno→público de §27 sigue igual; Wolverine solo cambia quién invoca al handler.
- **Simplifiqué el cuerpo:** aquí appendeo el hecho directo para enfocar el outbox. Cargar el agregado y pedirle la decisión (validando, como en [Decidir el futuro](./decidir-el-futuro.md)) es `FetchForWriting`, que llega en [El capstone](./el-capstone-fetchforwriting.md).
- **El consumidor corre en-proceso:** §30 paga la deuda de **atomicidad** (§26). Que el mensaje **viaje** a una facturación en otra máquina (el muro de [El mensaje y la cola](./el-mensaje-y-la-cola.md)) es **configurar** un transporte externo —routing de Wolverine a un broker—, config más que dolor nuevo; el mundo serverless de [En vivo y serverless](./en-vivo-y-serverless.md) lo usa como criterio (Azure Service Bus). Aquí el consumidor es local.

Wolverine persiste el mensaje en sus tablas (auto-schema, como Marten): `wolverine_incoming_envelopes` para el consumidor **local** (con `UseDurableLocalQueues`), o `wolverine_outgoing_envelopes` cuando el mensaje va a un transporte **externo** (un broker; config de routing de Wolverine). Dentro de la transacción de Marten, y lo despacha con reintento y dead-letter tras el commit. Sin `UseDurableLocalQueues`, la entrega local es en memoria: rápida, pero no sobrevive un reinicio — y ahí "sobrevivir reinicios" del muro de §28 no se pagaría.

</details>

## 🔨 Rómpelo: atómico, y qué pasa sin la integración

**Atómico:** haz que el handler lance una excepción **después** de appendear y cascadear, antes del commit. Ni el hecho entra al diario ni el anuncio sale — sin que cablearas la atomicidad: el outbox y los hechos comparten la unidad de trabajo de Marten. Quita la excepción y el acto entra entero, y `MundoExterno.Recibidos` recibe el anuncio.

**Sin la integración:** quita `IntegrateWithWolverine()` (o `AutoApplyTransactions()`). Ahora la sesión de Marten y el outbox **no** comparten transacción: vuelves justo al dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md) —el fantasma que tanto te costó matar—. Esas dos líneas de config son las que lo evitan; por eso no son decoración.

## El Descubrimiento

Tu `bandeja_salida` en la transacción del hecho (§26) + el claim con `SKIP LOCKED` (§28) eran, juntos, un outbox — correcto en su núcleo, incompleto en el muro. **Wolverine** es ese outbox terminado: el mensaje comparte la transacción del hecho (atómico, sin fantasma), y la entrega es durable, con reintento y dead-letter. Y al adoptarlo reconociste una segunda pieza: Wolverine **es tu despachador** de [El despachador](./el-despachador.md) —rutea por el tipo del parámetro, invoca el `Handle`, inyecta lo que el método pide—, hecho librería. Publicar es *devolver* un mensaje; la atomicidad la da que Wolverine y Marten comparten la unidad de trabajo. El mismo sabor del swap de Marten: construiste la idea a mano para entenderla, y adoptas la versión probada.

> 🌱 El outbox entrega **al menos una vez** (*at-least-once*): si la entrega se confirma pero el proceso cae antes de marcarla, Wolverine reintenta — y el mismo `EmpresaSuspendidaV1` puede llegarle a facturación **dos veces**. Con tu lista en memoria de un solo proceso nunca lo viste; con un transporte real es inevitable. Que el consumidor no haga daño al recibir el mismo mensaje dos veces —idempotencia— es el próximo dolor: [Llegó dos veces](./llego-dos-veces.md).

## ✅ Compruébalo

- [ ] Un handler `static` que appendea un hecho y **devuelve** el evento público entrega ambos atómicamente: el hecho al diario y el mensaje al consumidor (`MundoExterno.Recibidos` lo recibe), sin tu `bandeja_salida`.
- [ ] Reconoces a Wolverine como tu despachador de §7: `bus.InvokeAsync` = `Enviar`, descubre el `Handle` por el tipo, inyecta la `IDocumentSession`.
- [ ] Si el handler falla antes del commit, ni el hecho ni el anuncio persisten; y si quitas `IntegrateWithWolverine()`, vuelve el fantasma de §26. Sabes qué tablas de Wolverine (`wolverine_incoming_envelopes` local / `wolverine_outgoing_envelopes` externo) guardan el mensaje durable.
- [ ] Está `WolverineFx.RuntimeCompilation` referenciado (o `UseRuntimeCompilation()`); sin él, Wolverine no arranca.

## 🆘 Si algo salió mal

- **`no IAssemblyGenerator (Roslyn) is registered`:** falta el paquete `WolverineFx.RuntimeCompilation` (o `opts.UseRuntimeCompilation()`). Es obligatorio en Wolverine 6.
- **`bus` no existe / no arranca nada:** falta montar el host (`builder.Build()` + `await host.StartAsync()`) y obtener `IMessageBus` de sus servicios. El host mínimo está en el `<details>`.
- **El mensaje no llega al consumidor:** ¿**devolviste** el evento público desde el handler (cascading), o solo lo construiste sin retornarlo? Lo que se **devuelve** se publica.
- **El hecho se guarda pero el mensaje no (o al revés):** falta `IntegrateWithWolverine()` o `AutoApplyTransactions()` — sin ellos vuelves al dual-write (lo ves en el 🔨).
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
