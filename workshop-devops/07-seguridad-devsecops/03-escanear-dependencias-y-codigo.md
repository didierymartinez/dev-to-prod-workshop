# Lección 7.3 — Escanear dependencias y código

> ⏱️ 35 minutos · 🎯 **Al terminar:** GitHub vigilará por ti tus **dependencias** (Dependabot abrirá PRs cuando salga un arreglo de seguridad), tu **código** (análisis estático con CodeQL) y los **secretos** que se cuelen en un commit.

---

## 🤔 El problema

Trivy revisa la imagen **cuando construyes**. Pero quedan dos huecos:

- **Dependencias en el tiempo:** una librería que hoy es segura puede tener un CVE **mañana**. Nadie va a estar revisando NuGet a mano. Quieres que algo te **avise** y te proponga el arreglo, sin esperar al próximo build.
- **Tu propio código:** Trivy no analiza lo que **tú** escribiste. Un patrón inseguro (una inyección SQL, un secreto quemado) no es un CVE de una librería: es un fallo tuyo, y necesita otra herramienta.

GitHub trae las tres piezas que faltan, y se activan casi sin código.

---

## 💡 Conceptos

- **Dependabot:** vigila tus dependencias declaradas (NuGet, y también las versiones de tus GitHub Actions) y, cuando hay una actualización —sobre todo de **seguridad**—, abre un **Pull Request** con el cambio. Tú solo revisas y fusionas. Se configura con un archivo `.github/dependabot.yml`.
- **Análisis estático (CodeQL):** "lee" tu código fuente como lo haría un atacante buscando patrones peligrosos, **sin ejecutarlo**, y abre alertas. GitHub lo trae integrado para C#.
- **Secret scanning:** GitHub revisa tus commits buscando secretos (tokens, llaves) y puede **bloquear el push** si detecta uno (*push protection*).

Las tres alimentan la pestaña **Security** de tu repositorio, tu panel único de seguridad.

---

## 🛠️ Manos a la obra

### Paso 1: Dependabot para dependencias y actions

Crea `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Tus paquetes de NuGet
  - package-ecosystem: "nuget"
    directory: "/src/GestionEmpresas.Api"   # carpeta donde está el .csproj
    schedule:
      interval: "weekly"

  # Las versiones de tus GitHub Actions (las fijaste con @v4, @v0.28.0...)
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Súbelo:

```bash
git add .github/dependabot.yml
git commit -m "seguridad: vigilar dependencias con Dependabot"
git push
```

En cuanto llegue a `main`, Dependabot empieza a revisar. Cuando encuentre algo, verás PRs nuevos y alertas en **Security → Dependabot**.

### Paso 2: Análisis estático con CodeQL

La forma más simple es la **configuración por defecto** (sin escribir YAML):

1. En tu repo: **Settings → Code security and analysis**.
2. En **Code scanning**, pulsa **Set up → Default**.
3. GitHub detecta que es C#, crea el análisis y lo corre en cada `push` y PR a `main`.

Las alertas aparecen en **Security → Code scanning**. Cada una explica el patrón inseguro y cómo arreglarlo.

> 💡 Si prefieres tenerlo **como código** (un `.github/workflows/codeql.yml` propio), GitHub ofrece la opción **Advanced**, que genera ese workflow para que lo versiones y lo ajustes. La configuración por defecto es suficiente para el taller.

### Paso 3: Secret scanning y push protection

En la misma página **Settings → Code security and analysis**, activa:

- **Secret scanning:** GitHub avisa si encuentra un secreto en tu historial.
- **Push protection:** va más allá y **rechaza el push** si detectas un secreto al subir — te frena *antes* de que el secreto quede en el repo.

> 🧠 Esto es la red de seguridad para el error humano más común: pegar una llave o un token en el código "solo para probar" y olvidarlo. Con push protection, Git no te deja.

### Paso 4: Revisar tu panel de seguridad

Ve a la pestaña **Security** del repositorio. Ahí confluye todo: alertas de **Dependabot**, de **Code scanning** (CodeQL) y de **Secret scanning**. Es el lugar donde, de un vistazo, sabes cómo está la salud de seguridad de tu proyecto.

---

## ✅ Compruébalo

- [ ] Existe `.github/dependabot.yml` con los ecosistemas `nuget` y `github-actions`.
- [ ] Activaste el **Code scanning** (CodeQL) por configuración por defecto.
- [ ] Activaste **Secret scanning** y **Push protection**.
- [ ] La pestaña **Security** muestra las secciones de Dependabot y Code scanning.

---

## 🧠 Lo que aprendiste

- **Dependabot** vigila tus dependencias (NuGet, actions) y abre PRs con los arreglos de seguridad.
- **CodeQL** (análisis estático / SAST) revisa **tu** código en busca de patrones inseguros.
- **Secret scanning** + **push protection** evitan que un secreto llegue —o se quede— en el repo.
- Todo confluye en la pestaña **Security**, tu panel único.

---

## 🆘 Si algo salió mal

**Dependabot no abre ningún PR.**
Es normal al principio: solo actúa cuando hay actualizaciones pendientes. Verifica en **Insights → Dependency graph → Dependabot** que esté activo, y que la `directory` apunte a la carpeta con tu `.csproj`.

**CodeQL falla al "construir" el proyecto.**
El análisis de C# compila tu código. Con la configuración por defecto suele resolverse solo; si tu solución tiene varios proyectos, puede pedir un build personalizado (opción Advanced).

**No veo la opción de secret scanning.**
En repos **públicos** es gratis. En repos **privados** requiere GitHub Advanced Security (según tu plan). Para el taller, un repo público te da todo.

---

**➡️ Siguiente:** [Identidades y mínimo privilegio](04-identidades-y-minimo-privilegio.md)
