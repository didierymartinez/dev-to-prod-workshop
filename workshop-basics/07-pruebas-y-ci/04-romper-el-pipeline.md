# Lección 7.4 — Romper el pipeline a propósito

> ⏱️ 25 minutos · 🎯 **Al terminar:** habrás visto al "guardián" en acción: introducirás un error a propósito, verás cómo el CI lo detecta y marca el Pull Request en rojo, y luego lo corregirás. Esta es la prueba de que tu red de seguridad funciona.

---

## 🤔 El problema

Configuraste pruebas y CI. Pero, ¿de verdad te protegen? La única forma de confiar en una red de seguridad es **probarla**. Vamos a romper algo deliberadamente y comprobar que el sistema lo atrapa antes de que llegue a `main`.

---

## 💡 Conceptos

### El CI como guardián

Cuando abres un Pull Request, el CI ejecuta las pruebas. Si **todas pasan**, el check sale verde y el cambio es seguro de fusionar. Si **alguna falla**, el check sale rojo — y, con la protección de rama (lección 7.3), GitHub **impide** fusionar. Así, un error no puede colarse a la rama principal sin que alguien lo note.

> 🧠 La idea clave: **el código roto se detiene en la puerta**, no en producción. Cuanto antes se atrapa un error, más barato es arreglarlo.

---

## 🛠️ Manos a la obra

### Paso 1: Crear una rama e introducir un error

Vamos a "dañar" el repositorio a propósito — pero sin ningún riesgo, gracias a las **ramas**. Crea una:

```bash
git checkout -b experimento/romper-eliminar
```

> 🧠 **Recordatorio — ¿qué es una rama?** Una rama es una **línea de trabajo paralela y aislada** dentro de tu repositorio. Lo que hagas en ella **no toca tu rama principal (`main`)** hasta que decidas fusionarlo con un Pull Request. Por eso es el lugar ideal para experimentar — incluso para romper algo a propósito, como ahora: si todo sale mal, `main` queda intacta y basta con descartar la rama. Piénsalo como un "borrador aparte" de tu proyecto. (La aprendiste a fondo en la [Lección 1.4](../01-codigo-e-historia/04-ramas-y-pull-requests.md); aquí la aprovechas.)

Abre `src/GestionEmpresas.Api/Repositorio/EmpresaRepositorio.cs` y estropea el método `Eliminar` de `EmpresaRepositorioMemoria` para que **no elimine nada** y siempre diga que sí:

```csharp
public bool Eliminar(string nit)
{
    // BUG a propósito: decimos que eliminamos, pero no quitamos nada
    return true;
}
```

> Imagina que este fuera un error real que cometiste sin darte cuenta (pasa más seguido de lo que crees). Veamos si el sistema lo atrapa.

### Paso 2: Comprobar localmente (opcional pero buena costumbre)

Antes de subir, podrías correr las pruebas en tu máquina:

> 🔮 **Predice, luego corre.** Estropeaste `Eliminar`. *¿Cuál de tus pruebas crees que fallará por esto?* Escribe su nombre y luego corre `dotnet test`.

```bash
dotnet test
```

Verás fallar `Eliminar_ConNitExistente_QuitaLaEmpresa`: esperaba que la empresa desapareciera, pero sigue ahí. **La prueba detectó el bug.** Si te saltas este paso, el CI lo atrapará igual — esa es la gracia.

### Paso 3: Subir y abrir el Pull Request

```bash
git add .
git commit -m "experimento: cambio en el método eliminar"
git push -u origin experimento/romper-eliminar
```

Abre el Pull Request en GitHub.

### Paso 4: Ver al guardián actuar

En el Pull Request, espera a que corra el CI. Esta vez el check sale en **rojo**: *"Some checks were not successful"*.

- Haz clic en **"Details"** del check: te lleva a la pestaña Actions, donde el paso "Ejecutar pruebas" muestra exactamente qué prueba falló y por qué — igual que en tu máquina.
- Si activaste la protección de rama, el botón de fusionar estará **bloqueado**: GitHub no te deja meter esto a `main`.

**El error quedó atrapado en la puerta.** Nunca llegó a la rama principal ni, más adelante, al servidor.

### Paso 5: Corregir y ver el verde

Devuelve el método `Eliminar` a su versión correcta:

```csharp
public bool Eliminar(string nit)
{
    var empresa = ObtenerPorNit(nit);
    if (empresa is null) return false;
    _empresas.Remove(empresa);
    return true;
}
```

Sube la corrección a la misma rama:

```bash
git add .
git commit -m "corregir el método eliminar"
git push
```

El CI vuelve a correr **solo** sobre el Pull Request. Ahora pasa: el check se pone **verde** y ya puedes fusionar. Hazlo, y vuelve a `main` y sincroniza.

> 🧠 Acabas de vivir el ciclo completo de la red de seguridad: un error entró, el CI lo detectó, lo corregiste, y solo entonces el cambio fue aceptado. Eso es trabajar con confianza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Introdujiste un bug y viste el check del CI en **rojo** en el Pull Request.
- [ ] Pudiste ver, en "Details", qué prueba falló y por qué.
- [ ] Corregiste el bug y viste el check pasar a **verde**.

**Que entendiste:**
- [ ] Predijiste qué prueba fallaría, y acertaste.
- [ ] Puedes explicar por qué "el código roto se detiene en la puerta" y no en producción.
- [ ] (Si activaste protección de rama) confirmaste que no se podía fusionar con el CI en rojo.

> 🚦 **Cómo te fue:** 🟢 viví el ciclo completo y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- El CI actúa como **guardián**: detiene el código roto antes de que llegue a `main`.
- Un check **rojo** te dice qué prueba falló; un check **verde** habilita la fusión.
- Detectar errores temprano (en el PR) es mucho más barato que descubrirlos en producción.

---

## 🏁 Cierre de la Fase 7

Tu proyecto ahora tiene una **red de seguridad automática**: cada cambio se compila y se prueba solo, y lo que está roto no pasa. Esta es la primera mitad de la automatización (**CI**).

Hasta aquí todo vive y se prueba en tu máquina. Es hora de empezar el camino hacia **producción**: primero, empacar la aplicación para que corra igual en cualquier lugar.

---

**➡️ Siguiente fase:** [Fase 8 — Empaquetar con Docker](../08-empaquetar-docker/README.md)
