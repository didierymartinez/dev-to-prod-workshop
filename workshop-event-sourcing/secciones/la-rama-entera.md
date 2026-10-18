# La rama entera

El grupo ya no deja cerrar un ciclo. Ahora el negocio pide un acto que toca a toda una rama del árbol.

## 🎯 El Objetivo

Inactivar una matriz con todas sus filiales sin que ninguna filial quede activa, aunque otra petición cambie el árbol al mismo tiempo.

## 💥 El dolor: la filial que entró en la ventana

Inactivar una **rama** es inactivar una matriz y todo lo que cuelga de ella: nada activo bajo una matriz inactiva. El reflejo: el grupo te dice quiénes son, y cada empresa guarda su inactivación en su propio stream:

```csharp
// en GrupoEmpresarial: la raíz, más cada filial que sube hasta ella
public List<string> Rama(string raiz)
{
    var rama = new List<string> { raiz };
    foreach (var filial in _matrizDe.Keys)
        if (filial != raiz && SubeHasta(filial, raiz)) rama.Add(filial);
    return rama;
}

public record EmpresaInactivada();   // va al stream de cada empresa
// en Empresa:
public bool Inactiva { get; private set; }
//   en Aplicar → case EmpresaInactivada: Inactiva = true; break;
public void Inactivar() => Emitir(new EmpresaInactivada());
```

Mientras recorres la rama, otra petición pone `emp-d` bajo `emp-b`. Lo intercalas a mano, como en [El árbol de empresas](./el-arbol-de-empresas.md):

```csharp
// Empresas.Tests/LaRamaEntera.cs
public class LaRamaEntera
{
    [Fact]
    public void Inactivar_desde_una_foto_inactiva_toda_la_rama()
    {
        var store = new InMemoryEventStore();
        var s = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g = s.Get();
        g.AsignarMatriz("emp-b", "emp-a"); s.Append(g);

        var rama = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get().Rama("emp-a");   // emp-a, emp-b

        var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // otra petición
        g2.AsignarMatriz("emp-d", "emp-b"); s2.Append(g2);

        foreach (var id in rama)
        {
            var se = store.AbrirStream<Empresa>(id); var e = se.Get();
            e.Inactivar(); se.Append(e);
        }

        Assert.True(store.AbrirStream<Empresa>("emp-d").Get().Inactiva);
    }
}
```

`dotnet test`: rojo. `emp-a` y `emp-b` quedaron inactivas, y `emp-d` quedó activa bajo `emp-b`, sin un solo error. La lista de la rama fue una **foto**: el grupo de ese momento. Nada protegió esa foto, porque la inactivación nunca escribió en el grupo: escribió en el stream de cada empresa, y ahí cada versión era legal. Es la ventana de leer-antes-de-escribir de [Dos streams, la misma clave](./dos-streams-misma-clave.md). Y leíste el grupo del diario, no de una vista, como pide [El rezago](./el-rezago.md): la versión protege el stream donde escribes, no el que lees.

## 🔧 Paso 1 · Inactivar es un hecho del grupo

Esa regla mira el árbol entero, igual que "sin ciclos". Su frontera es la misma: el stream del grupo. La inactivación se decide ahí y se guarda ahí.

> 🛠️ **Inténtalo tú.** Quieres que este test pase:
>
> ```csharp
> [Fact]
> public void La_filial_que_entra_a_la_vez_cae_en_la_rama()
> {
>     var store = new InMemoryEventStore();
>     var s = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g = s.Get();
>     g.AsignarMatriz("emp-b", "emp-a"); s.Append(g);
>
>     var s1 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g1 = s1.Get();   // petición 1
>     var s2 = store.AbrirStream<GrupoEmpresarial>("grupo-andes"); var g2 = s2.Get();   // petición 2
>     g1.InactivarRama("emp-a");
>     g2.AsignarMatriz("emp-d", "emp-b"); s2.Append(g2);           // entra primero
>     Assert.Throws<ConcurrencyException>(() => s1.Append(g1));    // decidió sobre un grupo viejo
>
>     var g3 = store.AbrirStream<GrupoEmpresarial>("grupo-andes").Get();   // la petición 1 reintenta
>     g3.InactivarRama("emp-a");
>     Assert.Contains(g3.SinConfirmar,
>         h => h is RamaInactivada r && r.Empresas.Contains("emp-d"));   // r: el hecho, ya como RamaInactivada
> }
> ```
>
> Crea `InactivarRama(raiz)`: arma la rama con `Rama(raiz)` y emite `RamaInactivada(string Raiz, IReadOnlyList<string> Empresas)`, con la raíz que se pidió y la lista que alcanzó. El hecho lleva la lista porque elegir a quién alcanza la inactivación es parte de la decisión, y `Aplicar` solo anota lo decidido. Vuelve `Rama` privada: fuera del grupo, una lista de la rama es otra foto. Al final, borra `EmpresaInactivada` con su `case`, `Inactiva` e `Inactivar`, y el test del dolor: la inactivación ya tiene un solo dueño.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
public record RamaInactivada(string Raiz, IReadOnlyList<string> Empresas);   // va al stream del grupo

// en GrupoEmpresarial:
public void InactivarRama(string raiz) => Emitir(new RamaInactivada(raiz, Rama(raiz)));

private List<string> Rama(string raiz) { /* el mismo cuerpo de antes */ }
```

El reintento carga el grupo que ya tiene a `emp-d`, así que su rama la incluye.

</details>

## 🔧 Paso 2 · Bajo una matriz inactiva no entra nadie

El choque solo obliga a reintentar. Si la inactivación gana la carrera, la asignación de `emp-d` choca, reintenta sobre el grupo nuevo, y entra igual: nada mira si su matriz está inactiva.

> 🛠️ **Inténtalo tú.** Quieres que este test pase:
>
> ```csharp
> [Fact]
> public void Bajo_una_matriz_inactiva_no_entra_una_filial()
> {
>     var g = new GrupoEmpresarial();
>     g.AsignarMatriz("emp-b", "emp-a");
>     g.InactivarRama("emp-a");
>     Assert.Throws<ReglaDeNegocioException>(() => g.AsignarMatriz("emp-d", "emp-b"));
> }
> ```
>
> Dale al grupo un `HashSet<string>` de empresas inactivas, y en `Aplicar` agrega cada empresa de `RamaInactivada`. Al inicio de `AsignarMatriz`, rechaza una matriz que esté ahí.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// en GrupoEmpresarial:
private readonly HashSet<string> _inactivas = new();

//   en Aplicar → case RamaInactivada r: foreach (var e in r.Empresas) _inactivas.Add(e); break;

// al inicio de AsignarMatriz:
if (_inactivas.Contains(matriz))
    throw new ReglaDeNegocioException($"{matriz} está inactiva: no recibe filiales.");
```

Ahora una filial nueva o trasladada valida el estado de su matriz, y el reintento de la carrera también se rechaza.

</details>

## 🔨 Rómpelo: quita la guarda de la matriz

Borra el `if (_inactivas.Contains(matriz))`. `Bajo_una_matriz_inactiva_no_entra_una_filial` cae con `Assert.Throws() Failure: No exception was thrown`: `emp-d` entra activa bajo `emp-b`, que está inactiva. La inactivación decidió bien, pero lo que llega después no la respetó. Deshaz el cambio.

## El Descubrimiento

Un acto que toca a muchas empresas tiene la misma frontera que la regla que protege. Si lo decides sobre una foto y lo escribes en el stream de cada empresa, nada choca, y lo que entró en la ventana se queda afuera. Decidido dentro del grupo, el acto entra con la versión del grupo: lo que cambió el árbol a la vez lo hace chocar, y el reintento decide sobre el árbol de ahora. El hecho guarda la lista que se decidió. Y lo que llega después respeta lo decidido, porque cada filial valida su matriz. En EstructuraOrganizacional, la cascada lee el subárbol de la vista y abre un agregado por cada unidad, en una sola transacción larga: la foto y las escrituras sueltas que este diseño evita.

> 🌱 Borraste `EmpresaInactivada` sin costo: sus hechos vivían en memoria y morían con cada test. Los de `EmpresaRegistrada` viven en tu diario de Postgres, y en [Dos streams, la misma clave](./dos-streams-misma-clave.md) cambiaron de forma: las empresas registradas antes no tienen `Nit`. Releerlas es el próximo dolor ([La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)).

## ✅ Compruébalo

- [ ] Viste que, inactivando empresa por empresa desde la lista de la rama, `emp-d`, que entró en la ventana, quedó activa sin ningún error.
- [ ] Con `RamaInactivada` en el grupo, la inactivación que guarda tarde lanza `ConcurrencyException`, y al reintentar su rama incluye a `emp-d`.
- [ ] Bajo una matriz inactiva no entra ninguna filial, y sin la guarda el test cae.
- [ ] `Empresa` ya no sabe de inactivaciones, y `dotnet test` pasa entero.

## 🆘 Si algo salió mal

- **La rama del reintento no incluye a `emp-d`:** reintentaste con el `g1` viejo. Abre el stream otra vez y carga el grupo con `Get()`.
- **`s1.Append(g1)` no lanza `ConcurrencyException`:** las dos peticiones no cargaron el grupo antes de guardar. Haz los dos `Get()` antes del primer `Append`.
- **`error CS0122` (`Rama` es inaccesible):** quedó el test del dolor, que la llamaba desde afuera. Bórralo.

## 📓 Registra tu avance

Deja en tu `DECISIONES.md` la decisión de hoy:

> Un acto sobre una rama se decide dentro del grupo y se guarda como un hecho del grupo, con la lista que decidió. Bajo una matriz inactiva no entra una filial.

> 💭 **Reto:** ¿por qué inactivar cada empresa en su propio stream dejó pasar a `emp-d`? ¿Y qué pierde `Empresa` ahora que no sabe que está inactiva: puede `CambiarPlan` negarse?

```bash
git add .
git commit -m "ES · La rama entera (la cascada, dentro del grupo)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Un acto sobre toda una rama se decide dentro del stream del grupo, no sobre una foto: su versión hace chocar lo que cambió el árbol a la vez, el hecho guarda la lista que se decidió, y cada filial nueva valida su matriz.

---

[⬅️ Volver: El árbol de empresas](./el-arbol-de-empresas.md)

[➡️ Siguiente: La forma del hecho se congela](./la-forma-del-hecho-se-congela.md)
