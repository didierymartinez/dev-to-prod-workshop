# Lección 5.2 — El obstáculo de CORS

> ⏱️ 30 minutos · 🎯 **Al terminar:** entenderás qué es CORS y por qué el navegador bloqueó tu página, y lo resolverás autorizando a tu frontend desde la API. Verás, por fin, las tarjetas de empresas cargando.

---

## 🤔 El problema

En la lección anterior tu página intentó pedir datos a la API y el navegador lo bloqueó con un error de **CORS**. No es un bug tuyo: es una **medida de seguridad** del navegador. Hay que entenderla, porque la vas a encontrar en casi todos tus proyectos web.

---

## 💡 Conceptos

### Qué es un "origen"

Un **origen** es la combinación de protocolo + dirección + puerto. Para el navegador:

- Tu página la sirve Live Server en `http://localhost:5500`
- Tu API corre en `http://localhost:5000`

Aunque ambos digan "localhost", **el puerto es distinto (5500 ≠ 5000)**, así que para el navegador son **dos orígenes diferentes**.

### Qué es CORS y por qué bloquea

**CORS** (Cross-Origin Resource Sharing, "compartir recursos entre orígenes") es una regla de seguridad del navegador:

> Por defecto, una página de un origen **no puede** leer la respuesta de un servidor de **otro** origen… a menos que ese servidor diga explícitamente *"confío en ese origen, déjalo pasar"*.

¿Por qué existe? Para protegerte: evita que una página maliciosa que abriste lea, a tus espaldas, datos de otro sitio donde tienes sesión abierta (tu banco, tu correo). Es una protección **del lado del navegador**.

```
   Página (origen :5500)                    API (origen :5000)
        │                                         │
        │ ── fetch /empresas ──────────────────→  │
        │                                         │  responde con datos
        │ ←── respuesta + ¿permiso CORS? ───────  │
        │                                         │
   El navegador revisa: ¿la API autorizó al origen :5500?
        │
        ├── Si NO →  🚫 bloquea (lo que te pasó)
        └── Si SÍ →  ✅ entrega los datos a la página
```

### La solución: que la API autorice al origen del frontend

El arreglo se hace **en la API** (el servidor): le decimos *"confío en el origen de mi frontend (`localhost:5500`), déjalo leer mis respuestas"*. En .NET esto se configura con una **política de CORS**.

---

## 🛠️ Manos a la obra

### Paso 1: Autorizar el frontend en la API

Abre `src/GestionEmpresas.Api/Program.cs`. Agrega la configuración de CORS. Quedará así (las partes nuevas están señaladas):

```csharp
using GestionEmpresas.Api.Repositorio;

var builder = WebApplication.CreateBuilder(args);

// NUEVO: definir una política que autoriza al origen del frontend
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontend", policy =>
        policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("PermitirFrontend");   // NUEVO: activar la política (antes de los endpoints)

var repo = new EmpresaRepositorio();

app.MapGet("/", () => "API de Gestión de Empresas funcionando 🚀");
app.MapGet("/empresas", () => repo.ObtenerTodas());

// … el resto de tus endpoints (POST, GET/{nit}, DELETE) sigue igual …

app.Run();
```

Desglose:
- `AddCors(...)` define una política llamada `"PermitirFrontend"`.
- `WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")` autoriza exactamente los orígenes donde Live Server sirve tu página (incluimos las dos formas porque el navegador puede usar cualquiera).
- `AllowAnyHeader().AllowAnyMethod()` permite los encabezados y métodos (GET, POST, etc.) que tu página necesite.
- `app.UseCors("PermitirFrontend")` **activa** la política. Debe ir antes de los endpoints.

> 🧠 Fíjate **dónde** se arregla: en la **API**, no en la página. Es el servidor quien decide en quién confía. Autorizamos un origen específico (no "cualquiera"), que es la práctica sana.

### Paso 2: Reiniciar la API y recargar la página

1. En la terminal de la API: `Ctrl + C` y luego `dotnet run` (para que tome el cambio).
2. Recarga la página del navegador (la de Live Server).

> 🔮 **Predice, luego recarga.** No tocaste la página ni el `fetch` — solo autorizaste el origen en la API. *¿Crees que ahora las tarjetas cargarán, o seguirá el error de CORS?* Recarga y compáralo.

**Ahora sí: las tarjetas de empresas aparecen.** 🎉 La página dejó de mostrar el error y dibuja las tres empresas, con su plan y su estado (la inactiva se ve atenuada). Fíjate: **el arreglo fue en la API, no en la página** — eso confirma que el problema nunca estuvo en tu `fetch`.

### Paso 3: Confirmar en las herramientas del navegador

Abre F12 → **Console**: ya no hay error rojo de CORS. En **Network**, la petición a `/empresas` aparece con estado **200** y, si la inspeccionas, verás que el navegador recibió y usó la respuesta.

### Paso 4: Guardar el avance

```bash
cd ..      # raíz gestion-empresas/ (ajusta según dónde estés)
git checkout -b fix/habilitar-cors
git add src/GestionEmpresas.Api/Program.cs
git commit -m "habilitar CORS para que el frontend pueda consumir la API"
git push -u origin fix/habilitar-cors    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] La página muestra las tarjetas de empresas (ya no el mensaje de error).
- [ ] En F12 → Console no hay error de CORS.

**Que entendiste:**
- [ ] Puedes explicar, con tus palabras, qué es un "origen" y por qué el navegador bloqueaba.
- [ ] Entiendes que CORS se autoriza **en la API** (no en la página), y por qué conviene orígenes concretos, no "cualquiera".
- [ ] Tu predicción (¿cargará tras el cambio?) coincidió.

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Un **origen** = protocolo + dirección + puerto; `:5500` y `:5000` son orígenes distintos.
- **CORS** es una protección del navegador: bloquea leer respuestas de otro origen salvo que el servidor lo autorice.
- Se resuelve **en la API**, con una política que autoriza el origen del frontend.

> 💡 **Para más adelante:** en la Fase 11 pondremos un "gateway" delante de todo, que hará que el frontend y la API queden en el **mismo origen** — y entonces CORS dejará de ser necesario. Verás el mismo problema resuelto desde la infraestructura. Por ahora, autorizarlo en la API es lo correcto.

---

## 🆘 Si algo salió mal

**Sigue el error de CORS tras el cambio.**
¿Reiniciaste la API? El cambio en `Program.cs` solo aplica tras `Ctrl+C` + `dotnet run`. Además, revisa que el puerto de Live Server sea realmente `5500` (míralo en la barra del navegador) y que coincida con `WithOrigins`.

**Ahora la página carga pero el puerto de Live Server es otro (ej. 5501).**
Live Server cambia de puerto si 5500 está ocupado. Agrega ese puerto a `WithOrigins` o ciérralo y vuelve a abrir para que use 5500.

**¿Puedo usar `AllowAnyOrigin()` para no preocuparme?**
Existe, pero autoriza a *cualquier* sitio: cómodo para practicar, riesgoso en producción. Es mejor acostumbrarse a autorizar orígenes concretos.

---

**➡️ Siguiente:** [Un formulario para registrar](03-formulario-para-registrar.md)
