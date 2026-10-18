# Probar que aísla

Tu servicio separa a acme de globex. Tu `HostConDaemon` arranca con `AgregarEmpresas`, así que ya corre con la tenancy y el fail-fast.

## 🎯 El Objetivo

Que tus tests corran con un tenant, como tu servicio. Y que uno de ellos se ponga en rojo si un cambio deja que un tenant vea lo de otro.

## 💥 El dolor: el fail-fast llega a tus tests

Corre `dotnet test` con `CADENA_POSTGRES` fijada:

```
Con error CarreraDelPagoTests.Diez_avisos_del_mismo_pago_a_la_vez_dejan_un_pago
Con error RearmarTests.Rearmar_rehace_la_vista_y_el_daemon_sigue
Con error ReservaDelNitTests.Dos_registros_del_mismo_NIT_a_la_vez_dejan_una_empresa
Con error VistaSuspendidaTests.Repetir_y_reordenar_hechos_no_duplica_la_vista
Con error VistaSuspendidaTests.Suspender_por_el_bus_llega_a_la_vista
   Marten.Exceptions.DefaultTenantUsageDisabledException : Default tenant *DEFAULT* usage is disabled. …
```

Cada test de la colección `"daemon"` abre sesiones e invoca al bus sin tenant, como tu worker. Prender el tenant por defecto solo en el fixture también los pone verdes, y te devuelve a la copia de [El arnés usa la misma configuración](./el-arnes-usa-la-misma-configuracion.md): tus tests correrían una configuración que tu servicio no tiene. Siguen verdes `NombresDeLosHechos` y `LeerFechaTests`, que no tocan la base, y `SuspenderHandlerTests` y `PlanDeEmpresaTests`, que arman su propio `DocumentStore.For` sin tenancy: prueban el handler, no tu configuración.

## 🔧 Paso 1 · Cada test, con su tenant

> 🛠️ **Inténtalo tú.** Quiero que tus tests siembren y lean en acme:
>
> ```csharp
> await using (var s = daemon.Store.LightweightSession("acme"))   // la sesión, con su tenant
> await daemon.Bus.InvokeForTenantAsync("acme", new SuspenderEmpresa("emp-14", "mora"));   // el pedido, con su tenant
> ```
>
> Haz que funcione en los cuatro archivos de la colección `"daemon"`; cada `QuerySession()` también lleva `"acme"`. Corre `dotnet test`.

> 🔍 **¿Lo lograste?** Todos pasan. `ResetAllMartenDataAsync`, `Vistas.Rearmar` y la espera del daemon no abren la sesión de un tenant: trabajan sobre la base entera, con todos sus tenants.

## 💥 Verde, con una fuga

En esta sección corre solo `dotnet test`: no arranques tu servicio hasta devolver `AgregarEmpresas` como estaba, porque su base ya tiene el NIT 916000000 en tres tenants. Sin `AllDocumentsAreMultiTenanted()`, tu servicio no arranca, y el error nombra tus tres vistas:

```
Tenancy storage style mismatch between the events (Conjoined) and the aggregate type VistaSuspendida (Single)
Tenancy storage style mismatch between the events (Conjoined) and the aggregate type EmpresaDetalle (Single)
Tenancy storage style mismatch between the events (Conjoined) and the aggregate type Tablero (Single) …
```

Alguien quiere que un catálogo, como los planes, sea el mismo para todas las organizaciones. Quita la política general y marca solo lo que el error nombra. Hazlo en tu `AgregarEmpresas`:

```csharp
opts.Schema.For<VistaSuspendida>().MultiTenanted();   // en lugar de AllDocumentsAreMultiTenanted(): solo lo que el error nombra
opts.Schema.For<EmpresaDetalle>().MultiTenanted();
opts.Schema.For<Tablero>().MultiTenanted();
```

Corre `dotnet test`: todos, verdes. Ahora mira el localizador en `empresas_tests`, con `docker exec -it empresas-db psql -U postgres -d empresas_tests` y `\d mt_doc_localizador`:

```
Indexes:
    "pkey_mt_doc_localizador_id" PRIMARY KEY, btree (id)
```

El localizador perdió su tenant: el NIT es otra vez una sola llave para todos los tenants. Globex no podría registrar el NIT de acme, y al buscarlo llegaría al stream de acme. Tus tests no lo vieron, porque todos siembran en un solo tenant. Ocho servicios de la organización prueban así.

## 🔧 Paso 2 · Un test con dos tenants

> 🛠️ **Inténtalo tú.** Quiero este test, en tu colección `"daemon"`:
>
> ```csharp
> [Fact]
> public async Task Globex_registra_el_NIT_de_acme_y_solo_ve_su_empresa()
> {
>     await daemon.Bus.InvokeForTenantAsync("acme", new RegistrarEmpresa("emp-165", "916500000", "Vidriería Andina", "Basico"));
>     await daemon.Bus.InvokeForTenantAsync("globex", new RegistrarEmpresa("emp-166", "916500000", "Vidriería Andina", "Premium"));   // el mismo NIT, otro tenant
>     // … y globex lee
> }
> ```
>
> Escríbelo: (1) En una clase `DosTenantsTests`, con el mismo `[Collection("daemon")]`, `InitializeAsync` y `DisposeAsync` que tus otros tests. Registra por el bus, para que pase por tu `RegistrarEmpresaHandler` y su localizador. (2) Abre una `QuerySession("globex")`, y afirma dos cosas: que `LoadAsync<Localizador>("916500000")` lleva a `emp-166`, y que `Events.FetchStreamStateAsync("emp-165")` da `null`, porque el stream de acme no existe para globex. (3) Córrelo con la fuga todavía puesta: debe caer.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/DosTenantsTests.cs: dos organizaciones, el mismo NIT
using Marten;

[Collection("daemon")]
public class DosTenantsTests(HostConDaemon daemon) : IAsyncLifetime
{
    public Task InitializeAsync() => daemon.Host.ResetAllMartenDataAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Globex_registra_el_NIT_de_acme_y_solo_ve_su_empresa()
    {
        await daemon.Bus.InvokeForTenantAsync("acme", new RegistrarEmpresa("emp-165", "916500000", "Vidriería Andina", "Basico"));
        await daemon.Bus.InvokeForTenantAsync("globex", new RegistrarEmpresa("emp-166", "916500000", "Vidriería Andina", "Premium"));   // el mismo NIT, otro tenant

        await using var q = daemon.Store.QuerySession("globex");
        Assert.Equal("emp-166", (await q.LoadAsync<Localizador>("916500000"))?.Stream);   // el NIT lleva a la empresa de globex
        Assert.Null(await q.Events.FetchStreamStateAsync("emp-165"));                     // los hechos de acme no existen para globex
    }
}
```

</details>

> 🔍 **¿Lo lograste?** Con la fuga, el test cae en el registro de globex: `JasperFx.DocumentAlreadyExistsException : Document already exists Localizador: 916500000`.

Devuelve `AllDocumentsAreMultiTenanted()` en lugar de las tres líneas: todos pasan, también el nuevo, y `\d mt_doc_localizador` vuelve a mostrar `PRIMARY KEY, btree (tenant_id, id)`. La segunda afirmación vigila los hechos, que esta fuga no toca. El test cae porque tu fixture arranca con la misma función que tu servicio. Con un `AddMarten` propio en el fixture, la fuga del servicio pasaría en verde aun con este test.

## 🔨 Rómpelo: el índice que no sabe de tenants

En [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md) probaste reservar el NIT con un índice único sobre `EmpresaDetalle`: como la vista es `Inline`, el índice entra en la transacción del registro. Agrégalo a tu `AddMarten` de `AgregarEmpresas`, `opts.Schema.For<EmpresaDetalle>().UniqueIndex(d => d.Nit);`, y corre `dotnet test --filter DosTenantsTests`:

```
JasperFx.DocumentAlreadyExistsException : Document already exists EmpresaDetalle: emp-166
---- Npgsql.PostgresException : 23505: duplicate key value violates unique constraint "mt_doc_empresadetalle_uidx_nit"
```

El documento es de globex, y el índice es de todos: `\d mt_doc_empresadetalle` lo muestra sobre `(data ->> 'Nit')`, sin `tenant_id`. El mensaje nombra el documento, `emp-166`; el NIT y el índice aparecen en la línea de abajo.

> 🆕 **Un índice único por tenant.** `opts.Schema.For<EmpresaDetalle>().UniqueIndex(UniqueIndexType.Computed, "uq_empresadetalle_nit", TenancyScope.PerTenant, d => d.Nit);` crea el índice sobre el NIT y el `tenant_id`. `Computed` lo calcula sobre el JSON del documento, como el de antes, y esta forma pide un nombre. `UniqueIndexType` vive en `Marten.Schema`; `TenancyScope`, en `Marten.Schema.Indexing.Unique`.

Cambia tu línea por esa: todos pasan, y `\d mt_doc_empresadetalle` muestra `uq_empresadetalle_nit` sobre `(data ->> 'Nit'), tenant_id`. EstructuraOrganizacional reserva así sus códigos de unidad. Quita la línea al terminar: tu NIT se reserva en el localizador.

## El Descubrimiento

Un test de un solo tenant no prueba la separación: pasa igual con ella puesta o quitada. La prueba es un test con **dos** tenants que comparten un dato, como el NIT, y donde uno no debe ver al otro. Y solo vale si el arnés arranca con la misma configuración que el servicio. Lo que reserva un dato, el localizador o un índice único, tiene que ser por tenant: un índice declarado sin decirlo es de todos.

> 🌱 El tenant llega en un header, `X-Tenant-Id`, y el header lo escribe quien llama. Nada impide que quien llama por acme ponga `globex`: [El tenant viene firmado](./el-tenant-viene-firmado.md).

## ✅ Compruébalo

- [ ] Con el fail-fast en tu función, los cinco tests de la colección `"daemon"` cayeron sin que tocaras el fixture; con su tenant, pasan.
- [ ] Marcando solo las tres vistas, tus tests pasaron con el localizador sin tenant.
- [ ] `DosTenantsTests` cae con esa fuga, y pasa con `AllDocumentsAreMultiTenanted()`.
- [ ] Un índice único declarado sin `TenancyScope.PerTenant` hizo caer `DosTenantsTests`; con `PerTenant`, pasó.

## 🆘 Si algo salió mal

- **Un test sigue cayendo con `DefaultTenantUsageDisabledException`:** quedó una sesión o un `InvokeAsync` sin tenant; el más fácil de olvidar está en el `Registrar` de `ReservaDelNitTests`. Búscalos con `grep -n "Session()\|Bus.InvokeAsync" Empresas.Tests/*.cs`.
- **`MartenSchemaException` con `42710` en todos los tests:** tu base de pruebas es la vieja. Créala otra vez, con las tablas de Facturación, como en [El contexto que falta](./el-contexto-que-falta.md).
- **`DosTenantsTests` pasa con la fuga:** tu fixture no arranca con `AgregarEmpresas`, o la fuga está en otro lado. Busca `AllDocumentsAreMultiTenanted` con `grep`.
- **`UniqueIndexType` o `TenancyScope` no compilan:** faltan `using Marten.Schema;` y `using Marten.Schema.Indexing.Unique;`.
- **Tu servicio no arranca con `could not create unique index`:** arrancó con el índice de todos, y tu base tiene el NIT 916000000 en tres tenants. Quítalo.

## 📓 Registra tu avance

Deja la decisión en tu `DECISIONES.md`:

> Mi colección `"daemon"` tiene un test con dos tenants que comparten un NIT, y corre con la configuración del servicio: si un cambio deja a un tenant ver lo de otro, cae. Toda reserva de un dato es por tenant: el localizador lo es por `AllDocumentsAreMultiTenanted()`, y un índice único lleva `TenancyScope.PerTenant`.

> 💭 **Reto:** ¿por qué tus tests pasaron con el localizador sin tenant? ¿Qué otro dato de tu dominio reservarías por tenant, y cómo lo probarías?

```bash
git add .
git commit -m "ES · Probar que aísla (el test de dos tenants)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

La separación entre tenants solo se prueba con un test de dos tenants que comparten un dato, corriendo con la configuración del servicio; y toda reserva, del localizador o de un índice único, se declara por tenant.

---

[⬅️ Volver: El contexto que falta](./el-contexto-que-falta.md)

[➡️ Siguiente: El tenant viene firmado](./el-tenant-viene-firmado.md)
