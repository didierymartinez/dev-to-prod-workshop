# Lección 4.5 — Probar toda la API con Postman

> ⏱️ 25 minutos · 🎯 **Al terminar:** tendrás una colección de Postman que prueba tu API completa, y una forma alternativa de probarla desde VS Code. Probar es parte del trabajo, no un extra.

---

## 🤔 El problema

Has probado endpoints sueltos. Pero una API tiene varios casos y se prueba muchas veces (cada vez que la cambias). Hacerlo a mano, recordando cada URL y cada body, es lento y propenso a olvidos. Conviene **guardar** las pruebas para repetirlas en segundos.

---

## 💡 Conceptos

### Una colección es tu set de pruebas guardado

En Postman, una **colección** agrupa peticiones guardadas. Creas la petición una vez (URL, método, body) y la reutilizas siempre. Es tu "tablero de control" de la API.

### Alternativa: archivo `.http` en VS Code

Si prefieres no salir del editor, la extensión **REST Client** de VS Code (instálala desde la pestaña de extensiones si no la tienes) permite escribir las peticiones en un archivo de texto `.http` y ejecutarlas con un clic. Tiene la ventaja de que **vive junto al código**, en el repositorio.

---

## 🛠️ Manos a la obra

Asegúrate de tener el servidor corriendo (`dotnet run` en `src/GestionEmpresas.Api`).

### Paso 1: Crear la colección en Postman

1. En Postman, crea una colección llamada **"API Empresas"** (New → Collection).
2. Agrega estas cinco peticiones (New Request dentro de la colección), guardando cada una:

| Nombre | Método | URL | Body (raw/JSON) |
|---|---|---|---|
| Listar | GET | `http://localhost:5000/empresas` | — |
| Ver una | GET | `http://localhost:5000/empresas/900123456-1` | — |
| Crear | POST | `http://localhost:5000/empresas` | `{ "razonSocial": "Comercial Pacífico S.A.", "nit": "900555111-2", "plan": "Profesional" }` |
| Crear inválida | POST | `http://localhost:5000/empresas` | `{ "razonSocial": "", "nit": "123", "plan": "Básico" }` |
| Eliminar | DELETE | `http://localhost:5000/empresas/830456789-2` | — |

### Paso 2: Ejecutar el recorrido completo

> 🔮 **Predice, luego lánzalas.** Antes de enviar cada una, **di en voz alta qué código esperas**. Ya construiste estos endpoints, así que deberías poder anticiparlos todos. Si alguno te sorprende, ahí hay algo que revisar en tu código.

Lanza las peticiones en orden y confirma el **Status** de cada una:

- [ ] Listar → **200** (ves las empresas)
- [ ] Ver una → **200**
- [ ] Crear → **201** (y aparece en un nuevo "Listar")
- [ ] Crear inválida → **400** (con el mensaje)
- [ ] Eliminar → **204**

> 🧠 Acabas de hacer una **prueba manual** completa de tu API. En la Fase 7 automatizaremos esto: una máquina ejecutará estas comprobaciones sola en cada cambio. Pero entender qué se prueba (y por qué) es el paso previo indispensable.

### Paso 3 (alternativa): el archivo `.http` en VS Code

Si quieres tener las pruebas junto al código, crea en la raíz del proyecto un archivo `peticiones.http`:

```http
### Listar todas
GET http://localhost:5000/empresas

### Ver una
GET http://localhost:5000/empresas/900123456-1

### Crear
POST http://localhost:5000/empresas
Content-Type: application/json

{ "razonSocial": "Comercial Pacífico S.A.", "nit": "900555111-2", "plan": "Profesional" }

### Eliminar
DELETE http://localhost:5000/empresas/830456789-2
```

Con la extensión **REST Client**, sobre cada petición aparece un enlace **"Send Request"**. Haz clic y ves la respuesta al lado. Como es un archivo, puedes versionarlo:

```bash
cd ../..
git checkout -b docs/peticiones-http
git add .
git commit -m "agregar archivo de peticiones HTTP para probar la API"
git push -u origin docs/peticiones-http    # sube la rama a GitHub
```
Abre el **Pull Request** en GitHub y fusiónalo; luego vuelve a `main` y sincroniza.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Tienes una colección en Postman con las 5 peticiones guardadas.
- [ ] Ejecutaste el recorrido y cada petición devolvió el código esperado (200, 201, 400, 204).
- [ ] (Opcional) Tienes un `peticiones.http` versionado en el repo.

**Que entendiste:**
- [ ] Predijiste el código de cada petición **antes** de enviarla, y todos coincidieron (si alguno no, encontraste un bug — ¡eso es probar!).

> 🚦 **Cómo te fue:** 🟢 predije todo y lo entendí · 🟡 me costó anticipar alguno · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una **colección** de Postman guarda tus pruebas para repetirlas en segundos.
- Un archivo `.http` con REST Client mantiene las pruebas **junto al código**, versionadas.
- Probar sistemáticamente cada caso (éxito y error) es parte del trabajo, no un lujo.

---

## 🆘 Si algo salió mal

**Todas las peticiones fallan con "could not connect".**
El servidor no está corriendo. Arráncalo (`dotnet run`) y confirma que dice `Now listening on: http://localhost:5000` (lo fijaste en la lección 4.1).

**El puerto cambió respecto a antes.**
.NET puede asignar puertos distintos. Ajusta las URLs de la colección al puerto actual, o fija el puerto (lo veremos al contenerizar, en la Fase 8).

---

**➡️ Siguiente fase:** [Fase 5 — La cara visible](../05-la-cara-visible/README.md)
