# El contexto que falta

Todo lo que construiste asume una empresa, un cliente. Pero la plataforma la usan **muchas organizaciones** a la vez, y cada petición tiene que saber de cuál es.

## 🎯 El Objetivo

Que el **tenant** —la organización dueña de la petición— viaje con cada operación, y que el sistema **falle fuerte** si falta, en vez de rellenarlo con un valor por defecto.

## 💥 El dolor: el default silencioso manda el hecho al cliente equivocado

Aclaremos los niveles primero. Una **`Empresa`** es un stream —lo que llevas 34 secciones construyendo—. Un **tenant** es la **organización que usa la plataforma** (un despacho contable, una filial): un cliente de Cosmos, no una `Empresa`. Cada tenant administra **sus** streams —sus empresas, sus pagos—, y los de un tenant no deben verse desde otro. Marten aísla eso con **tenancy**.

```csharp
await using var s = store.LightweightSession("acme");   // sesión del tenant "acme" (una organización)
s.Events.StartStream<Empresa>("emp-1", new EmpresaRegistrada("900", "Constructora Andes", "Básico"));
```

`acme` ve `emp-1`; el tenant `globex`, abriendo su propia sesión, **no** —aislado—. ¿Y por qué no basta con los ids de stream que ya usas? Porque el id aísla **un** stream, pero una consulta o una proyección barren **muchos** — y una que olvide filtrar por organización cruzaría clientes sin querer. La tenancy sube ese aislamiento **al motor**: no depende de que cada consulta recuerde el filtro. Que es, otra vez, el patrón de siempre: *acordarse no basta* (el hecho huérfano de [El agregado recuerda](./el-agregado-recuerda.md) que mentía sin explotar, el dual-write de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md)).

Y ahí está el filo. Mira qué pasa cuando un acto **olvida** el tenant (una sesión sin especificarlo):

```csharp
await using var s = store.LightweightSession();   // ← sin tenant
s.Events.StartStream<Empresa>("emp-2", new EmpresaRegistrada("901", "…", "Básico"));
```

```
emp-2 en acme     → (nada)
emp-2 en DEFAULT  → escrita ahí
```

Marten no falló: usó un tenant **por defecto** (`*DEFAULT*`) y escribió `emp-2` ahí. Para `acme`, `emp-2` **no existe**. Un hecho cayó en otro contexto, invisible, sin una sola excepción. Un contexto que falta y que el sistema **rellena solo** no se nota hasta que alguien pregunta por un dato que "desapareció".

## 🔧 Que el tenant viaje, y fallar si falta

Dos piezas. Primero, el tenant **viaja**: llega en la petición y se resuelve en la sesión (`LightweightSession(tenant)`). Segundo —lo que mata el dolor—: **prohíbe el tenant por defecto**, para que olvidarlo **falle fuerte** en la puerta.

> 🆕 **Tenancy conjoined + fail-fast.** `opts.Events.TenancyStyle = TenancyStyle.Conjoined` (de `JasperFx.MultiTenancy`) guarda todos los tenants en las **mismas** tablas, con una columna `tenant_id` que los aísla; una sesión por tenant solo ve lo suyo. (La alternativa sería una base o esquema **por** tenant: más aislamiento físico, más operación; conjoined es barato y suficiente cuando confías en el motor para el filtro.) Y `opts.Advanced.DefaultTenantUsageEnabled = false` **apaga el tenant por defecto**: abrir una sesión sin tenant lanza `DefaultTenantUsageDisabledException` en vez de caer en `*DEFAULT*`.

> ⚠️ **Esto es un spike aparte — no lo cablees a tu app todavía.** Si activas `DefaultTenantUsageEnabled = false` sobre tu store real, **toda** sesión sin tenant (tus tests, el daemon, la API de [El host y la inyección](./el-host-y-la-inyeccion.md)) empezará a lanzar. Adóptalo cuando el servicio de verdad sea multi-tenant, resolviendo el tenant en cada borde.

> 🛠️ **Inténtalo tú.** (1) Configura `TenancyStyle.Conjoined` (de `JasperFx.MultiTenancy`) y `DefaultTenantUsageEnabled = false`. (2) Escribe `emp-1` en el tenant `acme` y confirma que una sesión de `globex` **no** la ve (rehidratar → null). (3) Intenta abrir una sesión **sin** tenant y confirma que **lanza** —el default silencioso ya no existe—. (4) Nota de dónde saldría el tenant en un servicio real: un *claim* del JWT de la petición.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
using JasperFx.MultiTenancy;   // TenancyStyle

var store = DocumentStore.For(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Events.TenancyStyle = TenancyStyle.Conjoined;        // aísla por tenant_id, misma base
    opts.Advanced.DefaultTenantUsageEnabled = false;          // sin tenant por defecto: fail-fast
});

// con tenant: escribe y aísla
await using (var s = store.LightweightSession("acme"))
{
    s.Events.StartStream<Empresa>("emp-1", new EmpresaRegistrada("900", "Constructora Andes", "Básico"));
    await s.SaveChangesAsync();
}
// acme ve emp-1; globex (su propia sesión) rehidrata null — aislados en la misma base.

// SIN tenant: ya no cae en DEFAULT en silencio, lanza en la puerta (al ABRIR la sesión)
await using (var s = store.LightweightSession())   // 💥 DefaultTenantUsageDisabledException (aquí, al abrir)
{
    s.Events.StartStream<Empresa>("emp-2", new EmpresaRegistrada("901", "…", "Básico"));
    await s.SaveChangesAsync();
}
```

En un servicio real, el tenant no lo pasas a mano: llega en un *claim* (un dato firmado dentro del **JWT**, el token de identidad que trae la petición) como `tenant: acme`; un *middleware* (código que corre antes del endpoint) lo lee y abre la sesión con `LightweightSession(tenantDelJwt)`. Resolverlo desde el JWT es plomería de la nube —no la vives entera con el juguete—, pero la garantía que importa la tienes: si el tenant no llega, **nada se escribe**. *(Ojo: este "claim" es el del token de identidad, no el "reclamar una fila" de la cola en [El mensaje y la cola](./el-mensaje-y-la-cola.md) — misma palabra, otro sentido.)*

</details>

## 🔨 Rómpelo: con y sin fail-fast

Quita `DefaultTenantUsageEnabled = false` (vuelve al default de Marten) y escribe sin tenant: **no falla**, y el hecho aparece en `*DEFAULT*` — invisible para `acme`. Vuelve a ponerlo en `false`: el mismo código **lanza** al abrir la sesión. La diferencia no es cosmética: sin fail-fast el error se manifiesta días después, como datos que "faltan" en un cliente; con fail-fast, en la petición que olvidó el tenant, al instante.

## El Descubrimiento

Un **contexto que falta** —el tenant— es un bug traicionero: si el sistema lo **rellena con un default**, no hay error, solo datos que terminan callados en el cliente equivocado, imposibles de rastrear. La cura no es "acordarse siempre" (eso ya viste que se rompe): es **fail-fast** — hacer que la ausencia del tenant sea un error fuerte en la puerta (`DefaultTenantUsageEnabled = false`), no un default silencioso. El tenant es **dato que viaja** (del JWT a la sesión), y la tenancy conjoined aísla a los clientes en la misma base subiendo el filtro al motor — pero solo si nunca dejas que caiga en el default. Preferir un error ruidoso temprano sobre corrupción silenciosa tardía es criterio de sistemas multi-cliente, y el Application Plane lo vive con JWT en cada borde.

> 🌱 Ya tienes el motor nuevo corriendo entero: Marten guardando y proyectando, Wolverine entregando, el daemon al día. Con todo eso vivo, ¿cómo puedes ver el sistema respirar ahora sobre una librería cuya cocina no ves? Conectarte a la base a consultar sus tablas de solo lectura, sin instrumentar, es el próximo paso: [Observar el motor nuevo](./observar-el-motor-nuevo.md).

## ✅ Compruébalo

- [ ] Distingues **tenant** (la organización que usa la plataforma) de **`Empresa`** (un stream dentro del tenant).
- [ ] Con `TenancyStyle.Conjoined`, un hecho escrito en `acme` lo ve `acme` y **no** `globex` — aislados en la misma base.
- [ ] Con `DefaultTenantUsageEnabled = false`, abrir una sesión **sin** tenant lanza `DefaultTenantUsageDisabledException` en vez de caer en `*DEFAULT*`.
- [ ] Sabes decir por qué un default silencioso es **peor** que un error, y por qué la tenancy sube el aislamiento al motor en vez de dejarlo en cada filtro que recuerdes.

## 🆘 Si algo salió mal

- **Escribir sin tenant no lanza:** te falta `opts.Advanced.DefaultTenantUsageEnabled = false`. Sin eso, Marten usa `*DEFAULT*` en silencio.
- **`TenancyStyle` no compila:** vive en `JasperFx.MultiTenancy`.
- **Se te caen los tests/el daemon al activar el fail-fast:** es lo esperado si lo pones en el store real — todas las sesiones sin tenant lanzan. Es un spike aparte hasta que el servicio sea multi-tenant de verdad.
- **Migrar datos existentes:** los hechos ya escritos sin tenant quedaron en `*DEFAULT*`; activar tenancy no los reparte solo — es una migración aparte.

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué un contexto que falta y se rellena con un default es más peligroso que uno que lanza un error? Da un ejemplo de tu dominio donde un default silencioso corrompería datos entre organizaciones, y di dónde pondrías el fail-fast.

```bash
git add .
git commit -m "ES · El contexto que falta (multi-tenancy + fail-fast)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un contexto que falta —el tenant, la organización dueña de la petición— es peligroso cuando el sistema lo rellena con un default, porque manda el hecho al cliente equivocado sin error; la cura es **fail-fast** (`DefaultTenantUsageEnabled = false`, que lanza si falta) sobre una tenancy **conjoined** que aísla en la misma base subiendo el filtro al motor, con el tenant viajando desde el JWT.

---

[⬅️ Volver: En vivo y serverless](./en-vivo-y-serverless.md)

[➡️ Siguiente: Observar el motor nuevo](./observar-el-motor-nuevo.md)
