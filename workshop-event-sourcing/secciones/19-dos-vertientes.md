# 19 · Las dos vertientes de persistencia

Construiste una **capa propia** sobre Marten: `IEventStore`, `MartenEventStore`, la Unit of Work, el middleware. Funciona y es la forma del equipo. Pero Marten y Wolverine **recomiendan otro camino**, más automático, para cargar y guardar un agregado. Son **dos vertientes** para el mismo trabajo — y como tú vas a **mantener** la capa del equipo, necesitas dominar las dos: en qué se diferencian, por qué el equipo eligió la suya, qué cuesta, y cuándo reconsiderarlo.

## 🎯 El Objetivo

Entender las **dos formas** de cargar/guardar un agregado con la Critter Stack, por qué el equipo eligió su capa, qué paga por ello, y cómo decidir su mantenimiento.

## Vertiente 1 — La nativa (lo que recomienda el creador)

Marten trae `FetchForWriting<T>(id)`: en **una** llamada **carga** el agregado y deja la sesión **lista para anexar**, con **concurrencia optimista incluida** (si dos procesos editan la misma empresa a la vez, el segundo **falla** en vez de pisar al primero — lo hiciste a mano con `ar.Version` en §15). Y Wolverine la envuelve en su *Aggregate Handler Workflow* (el atributo `[Aggregate]`), que carga, te pasa el agregado y persiste por ti. El handler queda mínimo:

```csharp
// el camino NATIVO (no es lo que usa el equipo; es el de la doc de Marten/Wolverine)
public async Task Handle(CambiarPlanDeEmpresa cmd, IDocumentSession session, CancellationToken ct)
{
    var stream = await session.Events.FetchForWriting<Empresa>(cmd.EmpresaId, ct);  // carga + listo para anexar
    if (stream.Aggregate.Suspendida)                // valida con el estado actual
        throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");
    stream.AppendOne(new PlanCambiado(cmd.NuevoPlan));
    await session.SaveChangesAsync(ct);             // concurrencia optimista: gratis aquí
}
```

Fíjate: **devuelve/anexa los hechos** y Marten controla la versión. Se parece a tu **§06** (decidir y devolver el hecho), no a tu §12 (acumular). Menos código, concurrencia gratis.

## Vertiente 2 — La capa del equipo (lo que construiste)

Tu camino: `IEventStore` + `MartenEventStore` (con `AggregateStreamAsync` para cargar y `Events.Append` para escribir) + `MartenUnitOfWork` + `UnitOfWorkMiddleware`. El agregado **acumula** (`Raise`) y el almacén **drena**. **Más código propio**, pero a cambio de control. Verificado: la capa del equipo **no** usa `FetchForWriting` en ningún lado.

## ¿Por qué el equipo eligió su capa? (con evidencia)

| Razón | Qué te da | Evidencia |
|---|---|---|
| **Testear sin base de datos** | un `TestStore` en memoria que implementa `IEventStore` → pruebas deterministas sin Postgres | el paquete de testing del equipo (§29–§30) |
| **Eventos públicos vs privados** | el `AggregateRoot` expone `GetPublicEvents`/`GetPrivateEvents` para rutear a EDA (RabbitMQ/ASB); el nativo no separa eso | §20–§23 |
| **Portabilidad y control** | el dominio depende de **tu** `IEventStore`, no de Marten directo; controlas el Unit of Work y la multi-tenancy | §15, §26–§28 |

`FetchForWriting` te ata a una sesión de Marten **real**: no podrías sustituirla por un almacén en memoria para tests, ni intercalar tu separación público/privado.

## ¿Qué cuesta? (honesto)

- **Más código que mantener correcto.** La capa es tuya: cada bug es tuyo.
- **La concurrencia optimista es TU responsabilidad.** El nativo `FetchForWriting` la da gratis; tú la hiciste a mano (§15, con `ar.Version`). Y ojo: la capa del equipo, tal como está, **no la hace cumplir** en escritura — si la necesitas, la pones tú.
- **Posible costo de rendimiento.** Cargas con `AggregateStreamAsync` (replay vivo del stream) en cada operación; sin *snapshots* (fotos del estado para no reproducir todo), un stream muy largo se reproduce entero cada vez.
- **Divergencia del camino recomendado.** Seguir la doc del creador cuesta más: cuando Marten/Wolverine publican una mejora pensada para `FetchForWriting`/`[Aggregate]`, hay que **traducirla** a tu capa.

## Cómo mantenerla (tu trabajo de aquí en adelante)

Cuando salga una mejora de Marten/Wolverine, decide con criterio:

- **Pliega la mejora a la capa** si sigues necesitando lo que la capa te da (tests sin BD, público/privado, control del UoW/tenancy). La mayoría de mejoras se pueden envolver en `MartenEventStore` sin tocar el dominio.
- **Considera migrar a lo nativo** solo si el nativo gana mucho (p. ej. concurrencia + mucho menos código) **y** en ese contexto no necesitas el `TestStore` ni la separación público/privado.
- **Sigue la doc del creador.** Como divergen, traduce mentalmente: "esto que el creador hace con `FetchForWriting`, en nuestra capa se hace con `AggregateStreamAsync`+`Append`". Esa traducción es la habilidad que mantiene la plantilla viva.

> [!NOTE]
> 🌱 **Semilla — esto es el núcleo de tu rol.** Dominar las **dos** vertientes, saber **por qué** existe cada una y poder **traducir** entre ellas es exactamente lo que te capacita para sostener y evolucionar la plantilla del equipo. No hay una "correcta": hay trade-offs, y tú ahora los conoces de primera mano porque construiste una y entiendes la otra.

---

## ✅ Compruébalo

- [ ] Explica las **dos** vertientes: `FetchForWriting`/`[Aggregate]` (nativo) vs `IEventStore`+`AggregateStreamAsync`+UoW (la capa del equipo).
- [ ] Da **tres** razones por las que el equipo eligió su capa (tests sin BD, público/privado, portabilidad/control).
- [ ] Nombra **tres** costos de esa elección (más código, concurrencia tuya, posible replay caro, divergencia de la doc).
- [ ] Di un caso en el que **mantendrías** la capa y uno en el que **migrarías** a lo nativo.

---

## 🧠 En una frase

Hay **dos vertientes**: la **nativa** (`FetchForWriting`/`[Aggregate]`: menos código y concurrencia gratis) y la **capa del equipo** (`IEventStore`+`AggregateStreamAsync`+UoW: más código, pero testeable sin BD, con separación público/privado y control del UoW/tenancy) — y tu trabajo es **dominar ambas y traducir entre ellas** para mantener la plantilla al día sin perder lo que su capa le da.

---

[⬅️ Volver: Levanta la última magia (reflexión vs codegen)](./18-reflexion-vs-codegen.md)

[➡️ Siguiente: Dos tipos de hecho (público vs privado)](./20-publico-vs-privado.md)
