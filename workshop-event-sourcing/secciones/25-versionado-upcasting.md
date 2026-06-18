# 25 · Versionado y upcasting de eventos

Tus hechos son **inmutables y permanentes**: el de hace un año sigue ahí, tal como se escribió. Pero tu código **evoluciona**. Dentro de seis meses querrás que `PlanCambiado` lleve también **quién** lo cambió, o renombrar un campo. ¿Qué pasa con los **miles de eventos viejos** ya guardados con la forma antigua? No puedes editarlos (son piedra). Tienes que **leerlos** igual.

## 🎯 El Objetivo

Evolucionar la forma de un evento **sin** romper la lectura de los hechos viejos ya persistidos: versionado tolerante y **upcasting**.

## El dolor: cambiaste el evento, pero el pasado no

```csharp
// hace un año guardaste miles de estos:
public record PlanCambiado(string NuevoPlan);

// hoy quieres saber QUIÉN lo cambió:
public record PlanCambiado(string NuevoPlan, string CambiadoPor);   // 💥 los viejos no tienen CambiadoPor
```

Los eventos viejos en la BD **no tienen** `CambiadoPor`. Al deserializarlos al nuevo `record`, falta el campo. El diario es para siempre, así que **toda** versión vieja debe seguir leyéndose.

## Estrategia 1: cambios aditivos (lector tolerante)

Si solo **agregas** un campo opcional (con valor por defecto), los eventos viejos siguen deserializando — el campo nuevo queda en su default. Es la forma más barata de evolucionar:

```csharp
public record PlanCambiado(string NuevoPlan, string CambiadoPor = "desconocido");
//  evento viejo {"NuevoPlan":"Premium"}  →  CambiadoPor = "desconocido"  (no rompe)
```

> Regla: prefiere cambios **aditivos y opcionales**. Nunca **quites** ni **renombres** un campo a la ligera, ni cambies su tipo: eso sí rompe a los viejos.

## Estrategia 2: cambios que rompen → upcasting

Cuando el cambio no es aditivo (renombrar, dividir un evento en dos, cambiar un tipo), necesitas **traducir** el evento viejo al nuevo **al leer**. Eso es **upcasting**: una función `viejo → nuevo` que corre cuando Marten lee un evento de una versión antigua.

```csharp
// v1 (lo persistido) y v2 (lo que tu código usa hoy)
public record PlanCambiadoV1(string Plan);
public record PlanCambiado(string NuevoPlan, string CambiadoPor);

// el upcaster: traduce v1 → v2 al leer (rellena lo que falta)
static PlanCambiado Upcast(PlanCambiadoV1 viejo) => new(viejo.Plan, CambiadoPor: "desconocido");
```

Registras ese upcaster en Marten (es **su** mecanismo; lo configuras tú) y, de ahí en adelante, tu código **solo conoce `PlanCambiado`**: los eventos v1 del diario se traducen al vuelo al cargarlos. El pasado queda intacto en la BD; la traducción vive en la lectura.

> [!NOTE]
> ⚖️ **Qué trae la plantilla.** La capa del equipo **no incluye upcasters**: el upcasting es un mecanismo de **Marten** (lo registras desde su doc). Lo único que la plantilla fija de base es `EventNamingStyle.SmarterTypeName` (cómo se guarda el **nombre del tipo** de cada evento — clave para que Marten sepa qué versión está leyendo) y `StreamIdentity.AsString`. Cuando te toque versionar un evento, ahí es donde consultas la doc de Marten y enchufas el upcaster.

> [!NOTE]
> 🌱 **Semilla — los eventos públicos pesan más al versionar.** Un evento **privado** (§20) lo cambias con un upcaster y listo. Pero un `IPublicEvent` es un **contrato** que otros servicios consumen: cambiarlo puede romperles a **ellos**. Por eso los públicos se versionan con extra cuidado (a menudo publicando una v2 nueva y manteniendo la v1 un tiempo), no solo con un upcaster interno.

---

## ✅ Compruébalo

- [ ] Explicas por qué un evento, una vez guardado, **no se edita** y por qué eso obliga a poder leer versiones viejas.
- [ ] Distingues cambio **aditivo** (campo opcional con default → no rompe) de cambio que **rompe** (renombrar/quitar/cambiar tipo).
- [ ] Sabes qué es **upcasting**: una traducción `evento_viejo → evento_nuevo` al **leer**, que deja tu código hablando solo de la versión actual.
- [ ] Sabes que el upcasting es mecanismo de **Marten** (la plantilla solo fija `EventNamingStyle.SmarterTypeName`/`StreamIdentity.AsString`).
- [ ] Explicas por qué versionar un evento **público** pesa más que uno privado.

---

## 🧠 En una frase

Los eventos son piedra pero tu código cambia: los cambios **aditivos y opcionales** los toleran los viejos sin más, y los que **rompen** se resuelven con **upcasting** —una traducción `viejo → nuevo` al leer, mecanismo de Marten— dejando el pasado intacto en la BD y tu código hablando solo de la versión actual; los eventos **públicos** se versionan con extra cuidado por ser contratos.

---

[⬅️ Volver: El lado de lectura (CQRS y proyecciones)](./24-cqrs-proyecciones.md)

[➡️ Siguiente: ¿De quién son estos eventos? (multi-tenancy)](./26-multitenancy-aislamiento.md)
