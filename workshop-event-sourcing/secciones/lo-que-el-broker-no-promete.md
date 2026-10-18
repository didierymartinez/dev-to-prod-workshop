# Lo que el broker no promete

Notificaciones ya escucha a todo Empresas, y su equipo confía en su cola: `AutoProvision` la crea al arrancar, y el broker la guarda aunque se reinicie.

## 🎯 El Objetivo

Que Notificaciones no arranque si su cola no existe, y que no pierda avisos si se cae a mitad de los correos. Que tu servicio no pierda un anuncio si el broker está caído, y que cada aviso llegue por un solo camino.

## 💥 El dolor: la cola mal escrita

En un despliegue, alguien escribe mal el nombre de la cola que escucha Notificaciones. Simúlalo: cambia solo su `ListenToRabbitQueue("notificaciones.planes")` por `ListenToRabbitQueue("notificaciones.plane")`, sin la `s`, y deja su `BindExchange` como está. Arráncalo: arranca sin quejarse. Corre tu worker con `emp-151;Enterprise`: Notificaciones no imprime nada, y su log no tiene un solo error. Mira las colas:

```bash
docker exec empresas-rabbit rabbitmqctl list_queues name messages
# … entre otras, estas dos:
# notificaciones.planes   1      ← el aviso, esperando a quien lo lea
# notificaciones.plane    0      ← la que creó AutoProvision, vacía
```

`AutoProvision` creó la cola que le pidieron, y nada la ata a ningún exchange. El servicio de notificaciones de la organización tiene `AutoProvision` en producción: un nombre mal escrito en un despliegue crea una cola vacía, y el servicio arranca en verde y no recibe nada.

## 🔧 Paso 1 · La topología la crea la infraestructura

> 🆕 **Quién crea la topología.** En un despliegue, el exchange, las colas y sus ataduras los crea la infraestructura antes de que arranque la app: un script del pipeline, con el exchange de Empresas y la cola que pidió cada interesado. Sin `AutoProvision`, la app no crea nada, y si la cola que escucha no existe, el host no arranca. En tu máquina, tu servicio en `Development` sigue creando lo suyo con `AutoProvision`, por comodidad: un nombre mal escrito en tu servicio arranca igual en tu máquina, y lo atrapa el despliegue. Un exchange `fanout`, como los crea Wolverine, copia cada mensaje a todas sus colas, sin mirar una clave de ruteo. Wolverine crea sus colas con el argumento `x-dead-letter-exchange`: los mensajes que no pudo tratar van a `wolverine-dead-letter-queue`, un exchange y una cola con ese nombre. Tu servicio en `Development` declara sus colas con ese argumento, y si una existe sin él, no arranca.

Este es tu script de infraestructura. Guárdalo como `topologia.sh` en la raíz de tu solución, y córrelo con `bash topologia.sh`: declarar lo que ya existe no lo cambia. En Windows, córrelo desde Git Bash o WSL.

```bash
# topologia.sh: la topología de Empresas, como la crea la infraestructura antes de desplegar
docker exec empresas-rabbit rabbitmqadmin declare exchange --name empresas --type fanout --durable true
docker exec empresas-rabbit rabbitmqadmin declare exchange --name wolverine-dead-letter-queue --type fanout --durable true
docker exec empresas-rabbit rabbitmqadmin declare queue --name wolverine-dead-letter-queue --durable true
docker exec empresas-rabbit rabbitmqadmin declare binding --source wolverine-dead-letter-queue --destination-type queue --destination wolverine-dead-letter-queue --routing-key ""
for cola in facturacion.planes notificaciones.planes; do
  docker exec empresas-rabbit rabbitmqadmin declare queue --name $cola --durable true --arguments '{"x-dead-letter-exchange":"wolverine-dead-letter-queue"}'
  docker exec empresas-rabbit rabbitmqadmin declare binding --source empresas --destination-type queue --destination $cola --routing-key ""
done
```

> 🛠️ **Inténtalo tú.** Quiero que la cola mal escrita no deje arrancar a Notificaciones:
>
> ```
> fail: … NOT_FOUND - no queue 'notificaciones.plane' in vhost '/'
> ```
>
> Haz que funcione: (1) Borra la cola vacía, que `AutoProvision` dejó en el broker: `docker exec empresas-rabbit rabbitmqadmin delete queue --name notificaciones.plane`. (2) En `AgregarEmpresas`, pide `AutoProvision()` solo si `builder.Environment.IsDevelopment()`. Para eso, guarda en una variable lo que devuelve `UseRabbitMq`, y llama sobre ella `BindExchange` y, si toca, `AutoProvision`. (3) A Notificaciones quítale `AutoProvision()` y su `BindExchange`: su cola y su atadura las crea tu script. Arráncala con el nombre todavía mal escrito.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, en tu AddWolverine
var rabbit = opts.UseRabbitMq(f => { f.HostName = broker.Host; f.UserName = broker.Usuario; f.Password = broker.Clave; });
rabbit.BindExchange(exchange).ToQueue("facturacion.planes");          // Facturación vive adentro, y escucha su cola
if (builder.Environment.IsDevelopment()) rabbit.AutoProvision();      // en tu máquina la crea el servicio; en un despliegue, la infraestructura

// Notificaciones/Program.cs
opts.UseRabbitMq();                                                   // la topología la crea la infraestructura
opts.ListenToRabbitQueue("notificaciones.plane");                     // todavía mal escrita
```

</details>

> 🔍 **¿Lo lograste?** Notificaciones termina al arrancar, y su log dice qué cola falta. Corrige el nombre y arráncala: imprime enseguida `Correo a 915100000: tu plan ahora es Enterprise`, el aviso que esperaba en su cola. Tu worker corre en `Production`, sin `AutoProvision`: escucha `facturacion.planes` porque ya existe.

## 💥 El dolor: se cayó con los avisos en la mano

Mandar un correo tarda. Por defecto, Wolverine trata los avisos de una cola de Rabbit uno a la vez, y le avisa al broker que terminó cada uno, el *ack*, para que lo borre de la cola: si un correo tarda un segundo, veinte tardan veinte segundos. Para que vaya más rápido, el equipo de Notificaciones le pide que los trate varios a la vez, y simula la demora y una caída:

```csharp
// Notificaciones/Program.cs
opts.ListenToRabbitQueue("notificaciones.planes").BufferedInMemory();   // varios correos a la vez

public static class PlanDeEmpresaHandler
{
    static int enviados;

    public static async Task Handle(PlanDeEmpresaV1 aviso)
    {
        await Task.Delay(1000);                                // mandar un correo tarda
        if (Environment.GetEnvironmentVariable("CAER") == "si" && Interlocked.Increment(ref enviados) == 5)
            Environment.FailFast("Notificaciones se cayó");   // la caída, a mitad de los correos
        Console.WriteLine($"Correo a {aviso.Nit}: tu plan ahora es {aviso.Plan}");
    }
}
```

`Environment.FailFast` termina el proceso en el acto, como un corte de luz. `Interlocked.Increment` suma uno sin que dos correos a la vez se pisen la cuenta. Arranca Notificaciones con `CAER=si dotnet run --project Notificaciones` (en PowerShell, fija antes `$env:CAER="si"`, y al terminar quítala con `Remove-Item Env:CAER`). Pon en `cambios.csv` veinte cambios de emp-151, alternando planes, y corre tu worker:

```bash
for i in $(seq 1 10); do echo "emp-151;Basico"; echo "emp-151;Premium"; done > cambios.csv
```

En PowerShell: `1..10 | ForEach-Object { "emp-151;Basico"; "emp-151;Premium" } | Set-Content cambios.csv`.

Salen unos cuantos correos, y Notificaciones muere con `Process terminated. Notificaciones se cayó`. `list_queues` dice que `notificaciones.planes` tiene 0 mensajes. Arranca Notificaciones otra vez, sin `CAER`: no sale ningún correo más. Los que faltaban se perdieron.

`BufferedInMemory` le da el *ack* al broker cuando recibe cada aviso, y lo guarda en memoria hasta tratarlo. El broker los borró de la cola, y la memoria murió con el proceso. Es marcar antes de tratar, como en [El mensaje y la cola](./el-mensaje-y-la-cola.md): si el consumidor cae al procesar, el mensaje se pierde. Una cola durable guarda sus mensajes si el broker se reinicia; no guarda los que ya entregó. El documento de decisiones del servicio de notificaciones de la organización promete que no se pierde nada por tener la cola durable.

## 🔧 Paso 2 · Guardado antes de tratarlo

Volver al modo por defecto no pierde nada, pero trata los avisos uno a la vez.

> 🆕 **El inbox durable.** `UseDurableInbox()` guarda cada aviso en una tabla de Postgres antes de darle el *ack* al broker, y lo trata desde ahí, también varios a la vez. Si el proceso muere, al volver retoma los que no terminó. Es la bandeja de entrada que tus colas locales tienen con `UseDurableLocalQueues`, ahora para una cola de Rabbit: tu servicio la guarda a través de Marten, y Notificaciones, que no tiene Marten, la guarda por su cuenta. Para eso, Notificaciones necesita una base. `opts.PersistMessagesWithPostgresql(cadena, "notificaciones")`, del paquete `WolverineFx.Postgresql`, crea sus tablas en el esquema `notificaciones`. `opts.Durability.Mode = DurabilityMode.Solo` le dice a Wolverine que es el único proceso de Notificaciones, y al arrancar retoma todo lo que quedó en su bandeja de entrada. No es el `DaemonMode` de tus vistas: es el de la bandeja de Wolverine. Con varias copias va `Balanced`, el valor por defecto: otra copia retoma la bandeja cuando da por muerta a la otra, en un minuto o dos.

> 🛠️ **Inténtalo tú.** Quiero que la misma caída no pierda ningún aviso:
>
> ```
> CAER=si: unos cuantos correos, y Process terminated
> sin CAER: Recovered … incoming envelopes from storage, y veinte correos
> ```
>
> Haz que funcione: (1) Agrega a Notificaciones los paquetes `WolverineFx.Postgresql` y `Microsoft.Extensions.Configuration.KeyPerFile`. (2) Que lea su cadena como tu servicio: `AddKeyPerFile` sobre tu directorio de secretos, y `GetConnectionString("Postgres")`, con su `throw` si falta; vienen de `using Microsoft.Extensions.Configuration;`. En tu máquina usa el mismo Postgres que tu servicio, con su propio esquema. (3) Con `using Wolverine.Postgresql;`, persiste sus mensajes, ponla en modo `Solo`, y cambia `BufferedInMemory()` por `UseDurableInbox()`. Arráncala con `CAER=si DirectorioDeSecretos=$HOME/secretos-empresas dotnet run --project Notificaciones`, y repite los veinte cambios.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Notificaciones/Program.cs (con using Microsoft.Extensions.Configuration; y using Wolverine.Postgresql;)
var builder = Host.CreateApplicationBuilder();
builder.Configuration.AddKeyPerFile(builder.Configuration["DirectorioDeSecretos"] ?? "/run/secrets", optional: true);
var cadena = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(cadena)) throw new InvalidOperationException("Falta ConnectionStrings:Postgres.");
builder.Services.AddWolverine(opts =>
{
    opts.PersistMessagesWithPostgresql(cadena, "notificaciones");   // su bandeja, en su propio esquema
    opts.Durability.Mode = DurabilityMode.Solo;                     // un solo proceso: al arrancar, retoma lo que quedó
    opts.UseRabbitMq();
    opts.ListenToRabbitQueue("notificaciones.planes").UseDurableInbox();   // varios a la vez, y guardados antes de tratarlos
});
```

</details>

> 🔍 **¿Lo lograste?** Tras la caída, `SELECT status, count(*) FROM notificaciones.wolverine_incoming_envelopes GROUP BY status;` muestra los veinte avisos guardados, en `Incoming`. Al arrancarla sin `CAER`, con `DirectorioDeSecretos`, el log dice `Recovered … incoming envelopes from storage`, y salen veinte correos. También los que ya habían salido antes de la caída: el inbox marca cada aviso como tratado un instante después de tratarlo, y la caída llegó antes de marcarlos. No se pierde ninguno, y alguno se repite: tras la caída vuelve el mismo sobre, con su id. La llave para no repetir el correo es la del hecho que anuncia, el `Nit` con la `Version` del anuncio, como la referencia del banco en [Llegó dos veces](./llego-dos-veces.md). En esta sección tu handler no la usa: cada repetición es un correo más. Facturación, en tu servicio, escucha con el modo por defecto: uno a la vez, y no pierde nada.

## 💥 El dolor: el broker caído

Notificaciones ya no pierde lo que recibe. Falta probar a Empresas, que publica, con el broker caído. Con tu servicio y Notificaciones arriba, detén el broker con `docker stop empresas-rabbit`. Da de alta emp-152 por el endpoint, con NIT `915200000`: responde `202`, y `SELECT type FROM mt_events WHERE stream_id = 'emp-152';` trae su `empresa_registrada`. Unos segundos después, el log de tu servicio dice:

```
info: Wolverine.Transports.Sending.InlineSendingAgent[0]
      Discarding message Envelope #… (Contratos.PlanDeEmpresaV1) from Empresas.Historia to rabbitmq://exchange/empresas … after 3 attempts
```

Arranca el broker con `docker start empresas-rabbit`, y espera en tu log la línea `RabbitMQ connection is recovered successfully`. `SELECT plan FROM plan_de_empresa WHERE nit = '915200000';` no trae nada, y Notificaciones no imprime ningún correo. `SELECT count(*) FROM wolverine_outgoing_envelopes;` da 0: no queda nada que reintentar.

Tu regla de `PlanDeEmpresaV1` envía al broker justo después del commit, sin guardar el mensaje: así envía una ruta a RabbitMQ si no le pides otra cosa. El log lo dice con el nombre del agente, `InlineSendingAgent`: envía en el momento. Si el broker no está, lo intenta tres veces y lo descarta. `UseDurableLocalQueues` solo cubre tus colas locales. El hecho quedó en el diario sin su anuncio: es el anuncio perdido de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md).

## 🔧 Paso 3 · Guardado antes de enviarlo

> 🆕 **`UseDurableOutbox()`.** Al final de una regla de `PublishMessage`, guarda cada mensaje de esa ruta en `wolverine_outgoing_envelopes`, en la misma transacción que el hecho, y Wolverine lo envía desde esa tabla. Si el broker no está, la fila espera, y sale cuando el broker vuelve. Es el outbox de [El outbox](./el-outbox.md), ahora hasta el broker. La regla vive en `AgregarEmpresas`: cubre lo que publican tu servicio y tu worker.

> 🛠️ **Inténtalo tú.** Quiero que, con el broker detenido, el anuncio espere en vez de perderse:
>
> ```
> broker detenido, alta de emp-153:   202, y una fila en wolverine_outgoing_envelopes
> broker de vuelta:                   Correo a 915300000: tu plan ahora es Basico
> ```
>
> Haz que funcione: en `AgregarEmpresas`, agrega `.UseDurableOutbox()` al final de la regla de `PlanDeEmpresaV1`. Reinicia tu servicio, detén el broker y da de alta emp-153 por el endpoint, con NIT `915300000`. Cuenta las filas de `wolverine_outgoing_envelopes`, y arranca el broker.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Configuracion.cs, en tu AddWolverine
opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitExchange(exchange).UseDurableOutbox();   // guardado con el hecho; sale cuando el broker está
```

</details>

> 🔍 **¿Lo lograste?** Con el broker detenido, `SELECT count(*) FROM wolverine_outgoing_envelopes;` da 1, y tu log no descarta nada. Arranca el broker: tras `RabbitMQ connection is recovered successfully`, Notificaciones imprime `Correo a 915300000: tu plan ahora es Basico`, `plan_de_empresa` dice `Basico` para `915300000`, y la tabla vuelve a 0. El plan de emp-152 no vuelve: se descartó antes de `UseDurableOutbox`.

## 🔨 Rómpelo: dos caminos, dos correos

El equipo de Notificaciones teme que un día se pierda la atadura de su cola, y te pide que le mandes el aviso también directo a su cola. En `AgregarEmpresas`, junto a la regla del exchange, agrega `opts.PublishMessage<PlanDeEmpresaV1>().ToRabbitQueue("notificaciones.planes");`. Corre el worker con `emp-151;Enterprise`: Notificaciones imprime el mismo correo dos veces. El aviso salió por dos caminos, el exchange atado a su cola y la cola directa: son dos sobres del mismo hecho, y la llave del hecho los reconocería. El servicio de notificaciones de la organización deja que un productor publique por dos brokers a la vez, y el usuario recibe cada notificación dos veces. Quita esa regla: cada mensaje tiene una sola decisión de ruteo, el exchange de su contexto, y quien lo quiera ata su cola. La atadura la vuelve a declarar `topologia.sh` en cada despliegue: ese miedo se atiende ahí, no con un segundo camino.

## El Descubrimiento

El broker guarda los mensajes en sus colas, y lo demás no lo promete. No sabe qué colas deberían existir: la topología la crea la **infraestructura**, y una app sin `AutoProvision` no arranca si le falta la suya; `AutoProvision` queda como comodidad de tu máquina. No sabe si quien recibió un mensaje lo terminó: con el **inbox durable**, la app lo guarda antes de confirmarlo, y una caída no se lo lleva, aunque puede repetirlo. No guarda lo que nunca le llegó: si no le pides otra cosa, una ruta a RabbitMQ envía sin bandeja, y con el broker caído Wolverine descarta el anuncio. Con el **outbox durable**, la app lo guarda en la transacción del hecho y lo envía cuando el broker vuelve. Y entrega por cada camino que le des: un mensaje tiene **una sola ruta**, y el consumidor tiene que tolerar la repetición.

> 🌱 Tus anuncios ya cruzan procesos sin perderse: tu servicio los guarda antes de enviarlos, y Notificaciones antes de tratarlos. La pantalla de soporte todavía tiene que volver a pedir para enterarse de un cambio. En [En vivo y serverless](./en-vivo-y-serverless.md), la pantalla se **entera sola**, y el servicio corre **serverless**, sin un host siempre vivo para el daemon y el outbox.

## ✅ Compruébalo

- [ ] Con `AutoProvision` y el nombre mal escrito, Notificaciones arrancó en verde y su aviso esperó en otra cola.
- [ ] Sin `AutoProvision`, la cola mal escrita no la deja arrancar; con el nombre bien, recibió lo que esperaba.
- [ ] Con `BufferedInMemory`, la caída se llevó avisos que el broker ya había entregado; con el inbox durable, al volver salieron todos, y algunos repetidos.
- [ ] Con el broker detenido, el alta de emp-152 respondió `202` y su plan no le llegó a nadie; con `UseDurableOutbox`, el de emp-153 esperó en `wolverine_outgoing_envelopes` y salió al volver el broker.
- [ ] Con dos reglas para el mismo mensaje, cada cambio dio dos correos.

## 🆘 Si algo salió mal

- **El servicio no arranca: `inequivalent arg 'x-dead-letter-exchange'`:** una de tus colas existe sin ese argumento. Bórrala con `rabbitmqadmin delete queue` y corre otra vez `topologia.sh`.
- **Notificaciones arranca en verde con el nombre mal escrito:** la cola vacía sigue en el broker. Bórrala, como en el reto.
- **Notificaciones lanza `Falta ConnectionStrings:Postgres.`:** arrancó sin `DirectorioDeSecretos`.
- **Tras la caída no sale nada, ni con el inbox:** su modo no es `Solo`, y espera a dar por muerta a la copia que cayó.
- **`relation "notificaciones.wolverine_incoming_envelopes" does not exist`:** Notificaciones todavía no arrancó con `PersistMessagesWithPostgresql`; sus tablas se crean al arrancar.
- **Con `UseDurableOutbox`, el plan de emp-153 no llega:** el broker volvió y tu servicio todavía no se reconecta. Espera la línea `RabbitMQ connection is recovered successfully`.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> La topología de RabbitMQ la crea la infraestructura (`topologia.sh`); `AutoProvision` solo en Development, y una app no arranca si le falta su cola. Quien escucha del broker y no puede perder avisos usa el inbox durable: guarda antes de confirmar, y puede repetir, así que su consumidor tiene que tolerarlo, por la llave del hecho. Lo que sale al broker va con el outbox durable (`UseDurableOutbox`): se guarda con el hecho, y espera si el broker está caído. Cada mensaje tiene una sola ruta: el exchange de su contexto.

> 💭 **Reto:** ¿por qué la cola durable no salvó los correos? ¿Dónde estaba el plan de emp-153 mientras el broker estuvo caído, y por qué el de emp-152 no estaba en ninguna parte? ¿Qué tienen en común el correo que se repitió tras la caída y el de los dos caminos?

```bash
git add .
git commit -m "ES · Lo que el broker no promete" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El broker guarda tus mensajes y nada más: la topología la crea la infraestructura y la app verifica su cola al arrancar, quien envía guarda antes de enviar con un outbox durable, quien recibe guarda antes de confirmar con un inbox durable, y cada mensaje sale por un solo camino a un consumidor que tolera la repetición.

---

[⬅️ Volver: El broker de verdad](./el-broker-de-verdad.md)

[➡️ Siguiente: En vivo y serverless](./en-vivo-y-serverless.md)
