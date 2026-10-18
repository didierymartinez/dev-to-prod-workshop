# El árbol de empresas

El localizador sostuvo una regla que cruza empresas: un NIT, una empresa. El negocio trae otra regla entre empresas, y esta no cabe en un índice único.

## 🎯 El Objetivo

Que ninguna empresa termine colgando de sí misma a través de otras, aunque lleguen dos cambios a la vez. Y que esa revisión siempre termine.

## 💥 El dolor: dos cambios válidos cierran un ciclo

Llegan los grupos empresariales: una empresa puede ser **filial** de otra, su **matriz**. La regla es que no haya ciclos: si `emp-a` es filial de `emp-b`, `emp-b` no puede ser filial de `emp-a`, ni directamente ni a través de otras. Con lo que tienes, la matriz es un dato más de la empresa, un hecho en el stream de la filial. Agrégalo a tu `Empresa`:

```csharp
public record MatrizAsignada(string MatrizId);   // va al stream de la filial

// en Empresa:
public string? Matriz { get; private set; }
//   en Aplicar → case MatrizAsignada m: Matriz = m.MatrizId; break;
public void AsignarMatriz(string matrizId) => Emitir(new MatrizAsignada(matrizId));
```

El agregado solo ve su propio stream, así que la regla vive afuera, en una clase junto a `Empresa`, y abre los streams de otras empresas. Sube de matriz en matriz desde la nueva matriz: si en el camino pasa por la filial, asignarla cerraría un ciclo.

```csharp
public static class Jerarquia
{
    // ¿subiendo de matriz en matriz desde `desde`, pasas por `buscada`?
    public static bool SubeHasta(IEventStore store, string desde, string buscada)
    {
        string? actual = desde;
        while (actual is not null)
        {
            if (actual == buscada) return true;
            actual = store.AbrirStream<Empresa>(actual).Get().Matriz;
        }
        return false;
    }
}
```

`emp-a` bajo `emp-b` cerraría un ciclo si `SubeHasta(store, "emp-b", "emp-a")` da `true`. Pruébalo con dos peticiones que validan **antes** de que cualquiera guarde, intercaladas a mano como en [Concurrencia optimista](./concurrencia-optimista.md). Usa el doble de [El puerto propio](./el-puerto-propio.md): rechaza una versión ocupada igual que Postgres.

```csharp
// Empresas.Tests/ArbolDeEmpresas.cs
public class ArbolDeEmpresas
{
    static void Asignar(IEventStore store, string filial, string matriz)
    {
        var s = store.AbrirStream<Empresa>(filial); var e = s.Get();
        e.AsignarMatriz(matriz); s.Append(e);
    }

    [Fact]
    public void Dos_cambios_a_la_vez_cierran_un_ciclo()
    {
        var store = new InMemoryEventStore();   // streams vacíos: la regla solo mira la matriz
        Assert.False(Jerarquia.SubeHasta(store, "emp-b", "emp-a"));   // petición 1: emp-a bajo emp-b
        Assert.False(Jerarquia.SubeHasta(store, "emp-a", "emp-b"));   // petición 2: emp-b bajo emp-a
        Asignar(store, "emp-a", "emp-b");                            // entra: versión 1 de emp-a
        Asignar(store, "emp-b", "emp-a");                            // entra: versión 1 de emp-b

        Assert.False(Jerarquia.SubeHasta(store, "emp-a", "emp-c"));   // la siguiente: emp-c bajo emp-a
    }
}
```

Corre `dotnet test`. No termina: la última línea sube de `emp-a` a `emp-b`, de `emp-b` a `emp-a`, y así para siempre. Córtalo con Ctrl+C. El `while` que existía para impedir un ciclo se cuelga en cuanto los datos tienen uno; en producción, cuelga la petición.

Ninguna escritura chocó. Cada una fue la versión 1 de **su** stream, legal por sí sola. "Sin ciclos" no es una regla de un stream: es del árbol entero, como "un NIT, una empresa" era del conjunto de empresas. Y un índice único no la expresa: aquí no hay una clave repetida que rechazar, hay un camino que se cierra.

## 🔧 Paso 1 · El árbol en un solo stream

> 🆕 **Una frontera para la regla.** La versión de un stream protege lo que vive en ese stream. Si una regla mira varias empresas, pon todo lo que la regla mira en **un** stream: el del grupo. Dos cambios al árbol cargan la misma versión del grupo, y el segundo choca al guardar.

> 🛠️ **Inténtalo tú.** Quieres que este test pase. `Assert.Throws<T>(() => …)` corre lo de adentro, pasa si lanza una excepción de tipo `T` y te la devuelve:
>
> ```csharp
> [Fact]
> public void Dos_cambios_a_la_vez_chocan_en_el_grupo()
> {
>     var store = new InMemoryEventStore();
>     var s1 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g1 = s1.Get();   // petición 1
>     var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // petición 2
>     g1.AsignarMatriz("emp-a", "emp-b");
>     g2.AsignarMatriz("emp-b", "emp-a");                            // su grupo aún no tiene ciclo
>     s1.Append(g1);
>     Assert.Throws<ConcurrencyException>(() => s2.Append(g2));     // la misma versión del grupo
>
>     var g3 = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get();   // la petición 2 reintenta
>     Assert.Throws<ReglaDeNegocioException>(() => g3.AsignarMatriz("emp-b", "emp-a"));
> }
> ```
>
> 1. Cambia `MatrizAsignada` para que nombre a las dos, `MatrizAsignada(string Filial, string Matriz)`: en el stream del grupo, el hecho tiene que decir de quién es la matriz.
> 2. Crea `GrupoEmpresarial : AggregateRoot`, con un `Dictionary<string, string> _matrizDe` de filial → matriz. `Aplicar` solo anota la pareja. Dale al grupo su propio `SubeHasta`, que lea el diccionario en vez de abrir streams: `_matrizDe.GetValueOrDefault(id)` da la matriz, o `null` si no tiene. En `AsignarMatriz(filial, matriz)`, si la asignación cerraría un ciclo, lanza `ReglaDeNegocioException`; si no, emite.
> 3. Borra la jerarquía de `Empresa` (`Matriz`, su `case` y `AsignarMatriz`), la clase `Jerarquia` y el test del dolor con su `Asignar`. Dos sitios que guardan la matriz son dos verdades, como el catálogo de [¿Merecía event sourcing?](./merecia-event-sourcing.md).

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public record MatrizAsignada(string Filial, string Matriz);   // va al stream del grupo

public class GrupoEmpresarial : AggregateRoot
{
    private readonly Dictionary<string, string> _matrizDe = new();   // filial → matriz

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case MatrizAsignada m: _matrizDe[m.Filial] = m.Matriz; break;
        }
    }

    public void AsignarMatriz(string filial, string matriz)
    {
        if (SubeHasta(matriz, filial))
            throw new ReglaDeNegocioException($"{filial} bajo {matriz} cerraría un ciclo.");
        Emitir(new MatrizAsignada(filial, matriz));
    }

    // sube por el diccionario, no por los streams
    private bool SubeHasta(string desde, string buscada)
    {
        string? actual = desde;
        while (actual is not null)
        {
            if (actual == buscada) return true;
            actual = _matrizDe.GetValueOrDefault(actual);
        }
        return false;
    }
}
```

El recorrido lee solo lo que cargó el grupo: todo lo que la regla mira queda bajo la versión que choca.

</details>

Por ahora el grupo vive en el doble en memoria. Si lo llevas a Postgres, sus hechos necesitan su nombre estable en el mapa, y tu proyector tendrá que saltarse los streams `grupo-…`, como viste con `plan-premium` en [¿Merecía event sourcing?](./merecia-event-sourcing.md).

## 🔧 Paso 2 · Un recorrido que siempre termina

El grupo ya no deja nacer un ciclo. Pero un hecho que entró no se borra: si un error de código, o una migración de datos de antes de esta regla, deja entrar un ciclo, el diario lo trae en cada carga. Y `Aplicar` no valida, así que el grupo lo carga sin quejarse.

> 🆕 **`HashSet<string>`.** Un conjunto sin repetidos. `vistos.Add(id)` agrega y devuelve `true`; si `id` ya estaba, no agrega y devuelve `false`.

> 🛠️ **Inténtalo tú.** Quieres que este test pase. Hoy se cuelga, como el del dolor:
>
> ```csharp
> [Fact]
> public void Una_historia_con_ciclo_falla_al_recorrerla()
> {
>     var g = new GrupoEmpresarial();
>     g.Load(new object[] { new MatrizAsignada("emp-a", "emp-b"), new MatrizAsignada("emp-b", "emp-a") });
>
>     var ex = Assert.Throws<InvalidOperationException>(() => g.AsignarMatriz("emp-c", "emp-a"));
>     Assert.Contains("ciclo", ex.Message);
> }
> ```
>
> `Assert.Contains` con dos textos pasa si el segundo contiene al primero. En `SubeHasta`, anota en un `HashSet` cada empresa que visitas. Si una se repite, ya diste la vuelta: lanza `InvalidOperationException` en vez de seguir. No es una `ReglaDeNegocioException`, porque nadie pidió algo prohibido: el dato está roto y alguien tiene que mirarlo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
private bool SubeHasta(string desde, string buscada)
{
    var vistos = new HashSet<string>();
    string? actual = desde;
    while (actual is not null)
    {
        if (actual == buscada) return true;
        if (!vistos.Add(actual))   // ya pasaste por aquí: es un ciclo
            throw new InvalidOperationException($"La jerarquía ya tiene un ciclo en {actual}.");
        actual = _matrizDe.GetValueOrDefault(actual);
    }
    return false;
}
```

</details>

La excepción no arregla el ciclo: lo hace visible. Una petición que falla con un mensaje se investiga; una que se cuelga solo se reinicia.

## 🔨 Rómpelo: una frontera que no alcanza

En `Dos_cambios_a_la_vez_chocan_en_el_grupo`, abre la petición 2 sobre otro grupo: `store.AbrirStream<GrupoEmpresarial>("grupo-sur")`. El test cae con `Assert.Throws() Failure: No exception was thrown`: los dos `Append` entran, cada uno en su stream. `grupo-andes` tiene `emp-a` bajo `emp-b`, y `grupo-sur` tiene `emp-b` bajo `emp-a`. Cada grupo, solo, está sano. Una frontera protege la regla solo si contiene todo lo que la regla mira: el árbol entero vive en **un** grupo. Que cada empresa esté en un solo grupo es otra regla de conjunto, como la del NIT, y la sostiene lo mismo: un localizador empresa → grupo. Devuelve `"grupo-andes"`.

## El Descubrimiento

La versión de un stream protege lo que vive en ese stream, y nada más. "Sin ciclos" mira muchas empresas a la vez: es una regla de conjunto, como la del NIT. Un ciclo no tiene una clave repetida que un índice rechace. Lo que sí hace chocar dos escrituras es la versión de un stream, así que la regla necesita un stream que reúna todo lo que mira: el del grupo. Eso se llama **frontera de consistencia**, y en event sourcing la frontera es el agregado: `GrupoEmpresarial` existe para contener esta regla. Elegir la frontera es elegir qué reglas puedes garantizar, y su precio es que todo cambio al árbol pasa por un solo stream. En tu organización, el repo EstructuraOrganizacional le da a cada fusión de unidades su propio stream, por la misma razón. Y lo que recorre datos se defiende de ellos: anota lo visitado, para fallar con un mensaje en vez de colgarse.

> 🌱 El grupo ya sabe quién cuelga de quién. El negocio pide ahora inactivar una matriz con todas sus filiales, de un golpe. Si lees la rama del grupo y escribes la inactivación en cada empresa, el árbol puede cambiar entre la lectura y la escritura ([La rama entera](./la-rama-entera.md)).

## ✅ Compruébalo

- [ ] Viste que, con la matriz en el stream de cada filial, dos asignaciones que validan a la vez entran las dos y cierran un ciclo, y que el `while` se cuelga después.
- [ ] Con una historia que trae un ciclo, `SubeHasta` falla con `InvalidOperationException` en vez de colgarse.
- [ ] Con el árbol en `grupo-andes`, la segunda asignación lanza `ConcurrencyException`, y al reintentar, `ReglaDeNegocioException`.
- [ ] Dos asignaciones que no se tocan (`emp-x` bajo `emp-y`, `emp-a` bajo `emp-b`) en el mismo grupo también chocan: es el precio de la frontera.
- [ ] `Empresa` ya no sabe de matrices: la jerarquía vive solo en el grupo, y `dotnet test` pasa entero.

## 🆘 Si algo salió mal

- **`dotnet test` no termina:** algún recorrido da vueltas a un ciclo. Quedó el test del dolor, o `SubeHasta` no anota cada empresa en `vistos` y lanza al repetir. Corta la corrida con Ctrl+C.
- **El segundo `Append` del grupo no lanza `ConcurrencyException`:** las dos peticiones no cargaron el mismo grupo antes de guardar, o tu doble perdió el chequeo de versión de [El puerto propio](./el-puerto-propio.md).
- **`error CS0103` (no existe `Jerarquia`), `CS1061` (`Empresa` no tiene `AsignarMatriz`) o `MatrizAsignada` sin `MatrizId`:** quedó código del dolor. Borra la clase `Jerarquia`, lo que `Empresa` tenía de la matriz y el test del dolor con su `Asignar`.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md` la decisión de hoy:

> La jerarquía de un grupo vive en un solo stream (`grupo-…`): "sin ciclos" mira el árbol entero, y solo la versión de ese stream hace chocar dos cambios a la vez. Todo recorrido del árbol anota lo visitado.

> 💭 **Reto:** ¿por qué la versión de cada empresa no impidió el ciclo? ¿Y qué pierdes al poner todo el árbol en un solo stream?

```bash
git add .
git commit -m "ES · El árbol de empresas (la jerarquía en un solo stream)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

"Sin ciclos" mira muchas empresas a la vez: no la protege la versión de cada una, sino una frontera que la contenga, el stream del grupo, cuya versión hace chocar los cambios simultáneos. Y lo que recorre ese árbol anota lo visitado, para fallar con un mensaje en vez de colgarse.

---

[⬅️ Volver: Dos streams, la misma clave](./dos-streams-misma-clave.md)

[➡️ Siguiente: La rama entera](./la-rama-entera.md)
