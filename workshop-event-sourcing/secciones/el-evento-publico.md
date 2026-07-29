# El evento público

En la sección pasada quedó una pregunta sin responder: ese `mensaje` de la bandeja, ¿qué pones exactamente ahí?

## 🎯 El Objetivo

Anunciar un hecho al mundo de afuera con un **contrato propio** —plano y estable— que no ate a ese mundo a la forma privada de tu dominio, ni a tus identificadores internos.

## 💥 El dolor: publicar tu evento interno acopla a quien te escucha

El reflejo es meter en el `mensaje` tu evento tal cual: serializas `EmpresaSuspendida` y listo. Vívelo. Para que facturación lo deserialice contra **tu** tipo, su proyecto tiene que **referenciar tu dominio**:

```csharp
// en Facturacion, con una referencia a Dominio:
var e = JsonSerializer.Deserialize<Dominio.EmpresaSuspendida>(mensaje);   // usa TU tipo interno
Console.WriteLine($"Facturación procesa: {e.Motivo}");                    // y usa su campo Motivo
```

Compila y funciona. Ahora tú, por razones **internas**, evolucionas ese evento —le renombras `Motivo` a `Razon`, o lo partes con un upcaster como en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)—. Vuelve a compilar la solución: **`Facturacion` deja de compilar**, porque su `e.Motivo` ya no existe en tu tipo. Le rompiste el código a un consumidor que ni controlas, por un cambio que era **asunto tuyo**. El evento interno es una pieza privada que cambia a tu ritmo; en el momento en que lo publicas, cada cambio tuyo es un cambio de contrato para otros.

## 🔧 Un evento público, en su propio proyecto

Separa las dos cosas que estabas mezclando en un solo tipo. El **evento interno** (`EmpresaSuspendida`) es tu verdad, tuya para evolucionar. El **evento público** es una **promesa** a quien te escucha: un tipo aparte, plano —solo primitivos, sin tipos de tu dominio adentro— y con nombre **versionado**. Y al publicar, **traduces** del interno al público.

> 🆕 **El evento público es un contrato versionado, en un proyecto que no ve tu dominio.** Vive en un proyecto `Contratos` **sin referencia a tu código**, para que el compilador **impida** filtrar un tipo interno. Cuando el contrato tenga que cambiar de verdad, publicas un `...V2` **al lado** del `V1` —sin editar el `V1`—, y los consumidores viejos siguen leyendo el `V1` hasta que migren.

El grafo de proyectos —y quién referencia a quién— es lo que hace cumplir el límite:

```
Dominio      → Contratos      (el dominio PUBLICA el contrato: lo referencia para traducir)
Facturacion  → Contratos      (el consumidor solo conoce el contrato)
Contratos    → (nada)         (no ve tu dominio: no puede filtrar lo privado)
```

```bash
# tu proyecto de siempre es Dominio; en el dolor le pusiste a Facturacion una referencia a Dominio
dotnet new classlib -o Contratos
dotnet new classlib -o Facturacion               # el consumidor (si no lo creaste en el dolor)
dotnet add Dominio     reference Contratos        # el dominio traduce a este contrato
dotnet add Facturacion reference Contratos        # el consumidor solo conoce el contrato
dotnet remove Facturacion reference Dominio       # quita la del dolor: el consumidor NO ve tu dominio
```

### Paso 1 · El contrato en su proyecto

> 🛠️ En `Contratos` (sin referencia a tu dominio), declara el evento público. Que lleve la **identidad de negocio** —el **NIT**—, no tu id interno de stream: facturación conoce empresas por su NIT, y tu `emp-7` es un detalle tuyo (de [Dos streams, la misma clave](./dos-streams-misma-clave.md)) que no tiene por qué filtrarse.

```csharp
namespace Contratos;
public record EmpresaSuspendidaV1(string Nit, string Motivo);
```

### Paso 2 · Traduce al publicar

Aquí se paga el peaje, y hace trabajo real: tu evento interno `EmpresaSuspendida(Motivo)` **no tiene** el NIT —internamente el stream id identifica—, así que traducir al público te obliga a **buscar el NIT** del id. Es el `localizador` de [Dos streams, la misma clave](./dos-streams-misma-clave.md), leído en la otra dirección: dado un stream, su NIT. En §23 esa tabla mapeaba NIT→stream para reservar la unicidad; la misma tabla responde también stream→NIT.

> 🛠️ Dale al store un `NitDe(string streamId)` (un `SELECT nit FROM localizador WHERE stream = @id`). En el handler que suspende, arma el público con el NIT buscado y el motivo del comando, y deja **su JSON** en la bandeja.

```csharp
// en el handler (Dominio → referencia Contratos):
e.Suspender(cmd.Motivo);
var nit = store.NitDe(cmd.EmpresaId);                               // id interno → NIT de negocio
var publico = new Contratos.EmpresaSuspendidaV1(nit, cmd.Motivo);   // el contrato lleva el NIT, nunca emp-7
stream.Append(e, new[] { JsonSerializer.Serialize(publico) });
```

### Paso 3 · El consumidor solo ve el contrato

> 🛠️ Haz que **esto** compile y dé esa salida, en `Facturacion`, que referencia **solo** `Contratos`:
>
> ```csharp
> Consumidor.Recibir(JsonSerializer.Serialize(new EmpresaSuspendidaV1("900123456", "Falta de pago")));
> // → "Facturación: suspender NIT 900123456 (Falta de pago)"
> ```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Facturacion/Consumidor.cs — deserializa el CONTRATO; nunca vio tu EmpresaSuspendida
using Contratos;
using System.Text.Json;
public static class Consumidor
{
    public static string Recibir(string mensaje)
    {
        var e = JsonSerializer.Deserialize<EmpresaSuspendidaV1>(mensaje)!;
        return $"Facturación: suspender NIT {e.Nit} ({e.Motivo})";
    }
}
```

¿Cómo llega el mensaje hasta `Facturacion`? En [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), `EntregarPendientes()` volcaba a `MundoExterno`. Ahora no hardcodea el destino: recibe **a quién publicar**, y quien arma la aplicación (la composición raíz, que sí conoce todos los proyectos) cablea ese destino al consumidor.

```csharp
// EntregarPendientes ya no conoce al consumidor: recibe un callback
public int EntregarPendientes(Action<string> publicar) { /* …lee pendientes; por cada uno: publicar(mensaje); marca entregado… */ }

// en la composición raíz (el proyecto que referencia Dominio Y Facturacion):
store.EntregarPendientes(mensaje => Consumidor.Recibir(mensaje));
```

Ese `Action<string> publicar` es una **costura**: hoy llama a un método in-process; el día que facturación viva en otra máquina, ahí es donde el mensaje sale a viajar.

</details>

## 🔨 Rómpelo: el límite es de compilación, no de disciplina

- En `Facturacion`, escribe `using Dominio;` y usa `EmpresaSuspendida`. **No compila:** `error CS0246: el tipo 'Dominio' no se encontró` — no hay referencia, y no la agregas. (Es justo lo que hiciste vivir en el dolor, ahora prohibido.)
- En `Contratos`, intenta `public record Malo(Dominio.EmpresaSuspendida Interno)`. **Tampoco compila**, por lo mismo: el proyecto de contratos, al no ver tu dominio, no puede filtrar nada privado.

En el mundo de un solo proyecto nada te lo impedía y el acople se colaba en silencio. Ahora el compilador lo **prohíbe**.

## El Descubrimiento

Un evento interno y un evento público son dos cosas distintas que es tentador fundir: el interno es tu verdad, tuya para evolucionar; el público es una **promesa** a quien te escucha, que se rompe si cambia sin avisar. Separarlos en un proyecto que **no puede ver** tu dominio convierte el límite de disciplina en un hecho de compilación, y **versionar** el contrato (`V1`, luego `V2` al lado) te deja evolucionar sin romper a los consumidores viejos. La traducción interno→público no es ceremonia vacía: hace trabajo real —aquí, cambiar tu id interno por la identidad de negocio (el NIT)—, y ese peaje es lo que compra la libertad de mover una cosa sin arrastrar la otra.

> 🌱 Ya tienes **qué** anunciar (un contrato plano con la identidad de negocio) y **cuándo** grabarlo (en la transacción del hecho). Falta el **viaje**: ese `Action<string> publicar` hoy llama a un método en tu mismo proceso. El día que facturación sea otro proceso en otra máquina, el mensaje tiene que **cruzar** por algo que los conecte. Y ese "algo" —una cola de mensajes— trae garantías que un método que llama a otro no tiene. Armarlas a mano te estrella contra un muro: [El mensaje y la cola](./el-mensaje-y-la-cola.md).

## ✅ Compruébalo

- [ ] El proyecto `Contratos` **no** referencia tu dominio; `Dominio` referencia `Contratos` (para traducir); `Facturacion` referencia **solo** `Contratos`.
- [ ] El handler deja en la bandeja el **JSON del evento público** con el **NIT** (no tu `emp-7`); el consumidor lo deserializa como `EmpresaSuspendidaV1` sin conocer `EmpresaSuspendida`.
- [ ] Intentar usar `EmpresaSuspendida` desde `Facturacion` (o embeberlo en `Contratos`) **no compila** — y sabes por qué.
- [ ] Evolucionas el evento interno (renombras `Motivo`): la solución sigue compilando, porque `Facturacion` está al otro lado de la traducción — a diferencia del dolor, donde sí se rompía.

## 🆘 Si algo salió mal

- **`Facturacion` compila usando `EmpresaSuspendida`:** le quedó la referencia a `Dominio` del dolor. Quítala: el consumidor solo conoce `Contratos`.
- **No tienes el NIT en el handler:** el agregado no lo expone; sácalo con `store.NitDe(cmd.EmpresaId)` (lee el `localizador` de §23 por su columna `stream`). Si `NitDe` no encuentra fila, es una empresa registrada **antes** del localizador: márcala `SIN-NIT-LEGADO` —el mismo criterio del dato faltante en [La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)— hasta que el negocio la complete.
- **`Dominio` no compila al usar `Contratos.EmpresaSuspendidaV1`:** falta la referencia `Dominio → Contratos`. Esa dirección es sana: el dominio *publica* el contrato.
- **Quieres cambiar `EmpresaSuspendidaV1`:** no lo edites y rompas a los consumidores — crea `EmpresaSuspendidaV2` al lado, y deja el `V1` mientras alguien lo escuche.

## 📓 Registra tu avance

> 💭 **Reto:** el evento público lleva el NIT y el interno no. Explica por qué la traducción (buscar el NIT del id) es trabajo real y no ceremonia — y qué se filtraría si publicaras tu `emp-7` directo.

```bash
git add .
git commit -m "ES · El evento público (contrato aparte, límite de compilación)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El evento interno es tu verdad privada y el público es una promesa a quien te escucha; separarlos en un proyecto `Contratos` que no puede ver tu dominio vuelve el límite un hecho de compilación, y versionarlo (`V1`, luego `V2`) te deja evolucionar sin romper consumidores — al precio de traducir interno→público, que hace trabajo real: cambiar tu id interno por la identidad de negocio.

---

[⬅️ Volver: El hecho y su anuncio](./el-hecho-y-su-anuncio.md)

[➡️ Siguiente: El mensaje y la cola](./el-mensaje-y-la-cola.md)
