# El README que compila

Tu plantilla ya se prueba como una librería: el doble, contra Marten, y cada verbo, contra sus hechos. Quien agregue `Pago` el mes que viene no la construyó, y va a empezar por leer su README.

## 🎯 El Objetivo

Darle a la plantilla un README que no envejezca: sin bloques de código ni versiones de paquetes, que diga cuándo no usarla y que señale un ejemplo de uso que es un test.

## 💥 El dolor: el README envejece en silencio

Tu plantilla no tiene README, ni un ejemplo de uso. El nacer y el crecer de [La plantilla](./la-plantilla.md) los quitaste de tu `Program.cs`, porque cada arranque los volvía a correr. Si escribes el ejemplo en el README, con su bloque de código y la versión de Marten, ese texto envejece sin que nadie se entere. En la organización pasa así:

- Los README de la librería dicen Marten 8.23 y Wolverine 5.18, y su código va en 9.18 y 6.21.
- Sus ejemplos no compilan contra la API que documentan, y son lo primero que leen los doce equipos que la usan.
- El README de otra librería viaja dentro de su paquete NuGet, y describe tipos y secciones de configuración que ya no existen.
- Un servicio decidió guardar documentos y no hechos, y su guía todavía pide, en la lista de pasos de cada cambio, un `Apply` para el hecho nuevo. Quien la siga, una persona o un asistente de código, crea agregados donde el equipo decidió no tenerlos.

Ninguno de esos errores rompe un build: el texto de un README no compila.

## 🔧 El ejemplo vive en un test

El README dice qué es la plantilla, qué cuidar y cuándo no usarla, y señala el ejemplo. El ejemplo vive en un test, que compila y corre en cada `dotnet test`.

### Paso 1 · Lo que dice el README

> 🛠️ **Inténtalo tú.** Quiero este `README.md` en la raíz de tu repositorio, sin un bloque de código ni un número de versión:
>
> ```markdown
> # La plantilla
>
> Un agregado hereda `AggregateRoot` y declara sus hechos, sus `Apply` y sus verbos. `MartenUnitOfWork` lo guarda: abre los streams que nacen, hace crecer los que existen y confirma todo en una transacción.
>
> - **Cómo se usa:** `Empresas.Tests/ComoUsarLaPlantilla.cs`. Es un test: si una firma cambia, no compila; si una regla cambia, cae.
> - **Los `Apply`, públicos:** Marten no ve los privados. `ContratoDelDoble` compara el doble con Marten; un agregado nuevo suma ahí su dado.
> - **Al nacer una empresa:** el `Insert` de su `Localizador`, en la misma sesión, antes de confirmar.
> - **Versiones:** las de `Empresas.Historia/Empresas.Historia.csproj`. Este README no las repite.
> - **Cuándo no usarla:** …
> ```
>
> Escribe tú la última línea. Es la decisión de [¿Merecía event sourcing?](./merecia-event-sourcing.md), escrita donde la va a leer quien adopte la plantilla: sus dos preguntas, con tu catálogo `planes` de ejemplo. Di también lo que no hace un servicio sin diario: no registra hechos con `Hechos.Registrar`, ni corre el daemon con `AddAsyncDaemon`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```markdown
- **Cuándo no usarla:** si nadie va a preguntar por la historia del dato y no tiene una regla que un `UPDATE` pueda romper, no es un agregado: es una tabla o un documento, como el catálogo `planes`. Ese servicio no llama a `Hechos.Registrar` ni a `AddAsyncDaemon`.
```

</details>

### Paso 2 · El ejemplo es un test

> 🛠️ **Inténtalo tú.** Quiero que tu test `ComoUsarLaPlantilla` termine así, con lo que el README promete:
>
> ```csharp
> Assert.Equal(id, await Localizador.StreamDe(q, nit));          // el NIT encuentra su stream
> Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);  // el registro y un solo pago
> ```
>
> Para eso: **(1)** Crea `ComoUsarLaPlantilla` en la colección `"host"`, como tu `ContratoDelDoble` de [La plantilla se prueba](./la-plantilla-se-prueba.md), y pídele el `IDocumentStore` a `app.Services`. **(2)** En una sesión de acme, registra con la plantilla una empresa con su `Localizador` y confirma, como el nacer de [La plantilla](./la-plantilla.md). **(3)** En otra sesión, cárgala, llama dos veces a `RegistrarPago` con la misma referencia y confirma. **(4)** Abre una tercera sesión, `q`, para las dos líneas de arriba. Usa un id y un NIT nuevos en cada corrida: con un NIT fijo, la segunda corrida choca con el `Localizador` de la primera.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Tests/ComoUsarLaPlantilla.cs: el ejemplo del README, compilado y corrido
using Marten;
using Microsoft.Extensions.DependencyInjection;

[Collection("host")]
public class ComoUsarLaPlantilla(HostDePrueba app)
{
    [Fact]
    public async Task Registrar_cargar_decidir_y_confirmar()
    {
        var store = app.Services.GetRequiredService<IDocumentStore>();
        var id = $"emp-{Guid.NewGuid():N}";
        var nit = $"nit-{id}";   // un NIT nuevo en cada corrida, como el id

        await using (var s = store.LightweightSession("acme"))   // nacer: el stream y su NIT, en la misma sesión
        {
            var uow = new MartenUnitOfWork(s);
            var e = Empresa.Registrar(id, nit, "Andes", "Básico");
            s.Insert(new Localizador { Id = e.Nit, Stream = e.Id });
            uow.Registrar(e);
            await uow.CommitAsync();
        }
        await using (var s = store.LightweightSession("acme"))   // crecer: cargar, decidir, confirmar
        {
            var uow = new MartenUnitOfWork(s);
            var e = await uow.Cargar<Empresa>(id);
            e.RegistrarPago(50_000, "BANCO-0044");
            e.RegistrarPago(50_000, "BANCO-0044");   // el mismo aviso otra vez: la regla lo frena
            await uow.CommitAsync();
        }

        await using var q = store.LightweightSession("acme");
        Assert.Equal(id, await Localizador.StreamDe(q, nit));          // el NIT encuentra su stream
        Assert.Equal(2, (await q.Events.FetchStreamAsync(id)).Count);  // el registro y un solo pago
    }
}
```

</details>

> 🔍 **¿Lo lograste?** `dotnet test` pasa en verde dos veces seguidas: cada corrida registra una empresa y un NIT nuevos.

## 🔨 Rómpelo: el README que miente

En tu `MartenUnitOfWork`, cambia el nombre de `Cargar` a `Obtener`. Tu servicio compila (`dotnet build` en `Empresas.Historia`): nada en él llama a `Cargar`. Corre `dotnet test`: no compila.

```
ComoUsarLaPlantilla.cs(26,31): error CS1061: "MartenUnitOfWork" no contiene una definición para "Cargar" …
```

(Si tu sistema está en inglés: `'MartenUnitOfWork' does not contain a definition for 'Cargar'`.) Cae solo el ejemplo del README: es el único test que usa la plantilla como la va a usar quien la adopte. Con el ejemplo escrito en el README, nada te habría avisado. Deshazlo.

## El Descubrimiento

El README de la plantilla no lleva lo que envejece: ni código, ni versiones. Dice qué es la plantilla, qué cuidar y cuándo no usarla, y señala un test. Ese test es el ejemplo: el build lo compila y `dotnet test` lo corre, así que deja de compilar si cambia una firma y cae si cambia una regla. Se llama **documentación ejecutable**. Es lo que se le pide a la librería de la organización: sus ejemplos, fuera del README, en un proyecto que compila en cada build.

> 🌱 La plantilla guarda bien donde tú confirmas: en tu `Program.cs` y en tus tests. Tus handlers todavía no la usan, y dentro de un handler confirma Wolverine, al final del mensaje, junto con lo que el handler devuelve. Llevarla adentro sin partir esa transacción es [La plantilla dentro del handler](./la-plantilla-dentro-del-handler.md).

## ✅ Compruébalo

- [ ] Tu README no tiene bloques de código ni versiones: dice qué es la plantilla, qué cuidar, dónde están las versiones y cuándo no usarla.
- [ ] `ComoUsarLaPlantilla` registra, carga, decide y confirma con la plantilla, y pasa en verde dos veces seguidas.
- [ ] Con `Cargar` renombrado, tu servicio compila y tus tests no: `CS1061` en `ComoUsarLaPlantilla`.

## 🆘 Si algo salió mal

- **La segunda corrida de `ComoUsarLaPlantilla` cae con `JasperFx.DocumentAlreadyExistsException`:** el NIT es fijo, y su `Localizador` quedó de la primera corrida. Arma el NIT con el id nuevo: `$"nit-{id}"`.
- **`ComoUsarLaPlantilla` cae con `InvalidOperationException: El NIT … no está en el localizador`:** falta el `Insert` del `Localizador` en la sesión del nacer. Sin él, el stream nace y nadie lo encuentra por su NIT.

## 📓 Registra tu avance

Primero, en tu `DECISIONES.md`, deja la decisión de hoy:

```markdown
- El README que compila: el ejemplo de la plantilla es un test, no prosa. El README lo señala, no lleva código ni versiones, y dice cuándo no usarla.
```

> 💭 **Reto:** quien adopte la plantilla busca primero un ejemplo y la versión de Marten. ¿Por qué tu README no trae ninguno de los dos? Y: cuando cambiaste el nombre de `Cargar`, ¿qué te avisó, y qué te habría avisado con el ejemplo escrito en el README?

```bash
git add .
git commit -m "ES · El README que compila (sin código ni versiones; el ejemplo es un test)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

El README de la plantilla no lleva lo que envejece: dice qué es, qué cuidar y cuándo no usarla, y señala un ejemplo que es un test, que deja de compilar el día que la plantilla cambia.

---

[⬅️ Volver: La plantilla se prueba](./la-plantilla-se-prueba.md)

[➡️ Siguiente: La plantilla dentro del handler](./la-plantilla-dentro-del-handler.md)
