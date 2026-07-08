# Lección 7.3 — Integración Continua con GitHub Actions

> ⏱️ 35 minutos · 🎯 **Al terminar:** tus pruebas se ejecutarán **solas** en GitHub cada vez que subas código. Tendrás tu primer **pipeline de integración continua (CI)**.

---

## 🤔 El problema

Las pruebas solo te protegen si **alguien las corre**. Si dependes de acordarte de escribir `dotnet test` antes de cada `push`, algún día se te olvidará. Y si trabajas en equipo, un compañero podría subir código sin probar y romper `main`.

La solución: que **GitHub** ejecute las pruebas automáticamente, en cada cambio, sin depender de la memoria de nadie.

---

## 💡 Conceptos

### Integración Continua (CI)

**Integración Continua** significa: cada vez que se integra un cambio (un `push`, un Pull Request), un servidor **compila y prueba** el proyecto automáticamente, y avisa si algo falla. Así, los problemas se detectan **en minutos**, no en producción.

### GitHub Actions y los workflows

**GitHub Actions** es la herramienta de CI que viene incluida con GitHub. Le das instrucciones en un archivo llamado **workflow** (un `.yml` dentro de la carpeta `.github/workflows/`). Ese archivo describe:

- **Cuándo** ejecutarse (`on`): por ejemplo, en cada push o Pull Request.
- **Qué pasos** seguir (`steps`): descargar el código, instalar .NET, compilar, probar.

GitHub provee los servidores que ejecutan todo. Tú solo describes los pasos.

---

## 🛠️ Manos a la obra

### Paso 1: Crear el archivo del workflow

Los workflows van en una carpeta especial. Crea `.github/workflows/ci.yml` en la raíz de `gestion-empresas` (ojo: la carpeta empieza con punto):

```yaml
name: "CI — Pruebas"

# Cuándo se ejecuta: en cada Pull Request hacia main y en cada push a main
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  pruebas:
    runs-on: ubuntu-latest        # el tipo de servidor donde corre
    steps:
      - name: "Descargar el código"
        uses: actions/checkout@v4

      - name: "Instalar .NET 8"
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: "Restaurar dependencias"
        run: dotnet restore

      - name: "Compilar"
        run: dotnet build --no-restore --configuration Release

      - name: "Ejecutar pruebas"
        run: dotnet test --no-build --configuration Release
```

Desglose de lo importante:
- `on:` define los disparadores: aquí, los Pull Requests hacia `main` y los push a `main`.
- `runs-on: ubuntu-latest` → GitHub usa un servidor Linux temporal para correr el trabajo.
- `steps:` son los pasos en orden. Cada uno usa una acción ya hecha (`uses:`) o ejecuta un comando (`run:`).
- Los comandos `dotnet restore/build/test` son **los mismos** que corres en tu máquina — ahora los corre GitHub.

### Paso 2: Subirlo y verlo correr

Guarda el avance. El `push` de este archivo es lo que **activa** el CI por primera vez:

```bash
git checkout -b ci/agregar-pipeline
git add .github/
git commit -m "agregar pipeline de CI que compila y prueba en cada cambio"
git push -u origin ci/agregar-pipeline    # sube la rama a GitHub
```

Abre un **Pull Request** en GitHub. Verás aparecer, dentro del PR, una sección de **checks** con tu workflow "CI — Pruebas" ejecutándose. Espera uno o dos minutos.

### Paso 3: Leer el resultado

- Ve a la pestaña **Actions** de tu repositorio: verás la ejecución del workflow, con cada paso (descargar, instalar, compilar, probar) y un ✅ al lado.
- En el **Pull Request**, el check aparecerá en verde: *"All checks have passed"*.

¡Acabas de montar tu primer pipeline! Ahora, **cada cambio** que propongas será compilado y probado automáticamente por GitHub.

> 🔮 **Predice, luego mira.** Tus pruebas pasan en tu máquina. *¿El check del CI en el Pull Request saldrá verde o rojo?* Espera a que el workflow corra en la pestaña del PR y compáralo.

Fusiona el Pull Request.

### Paso 4 (recomendado): Exigir que el CI pase antes de fusionar

Por defecto, GitHub *muestra* el resultado pero no impide fusionar. Para que el código que falla **no pueda** llegar a `main`, activa una protección de rama:

1. En tu repo → **Settings** → **Branches** → **Add branch ruleset** (o "Add rule").
2. Aplica a la rama `main`.
3. Marca **"Require status checks to pass before merging"** y selecciona tu check de CI.
4. Guarda.

Ahora `main` está protegida: ningún Pull Request con el CI en rojo podrá fusionarse. Lo comprobarás en la próxima lección.

---

## ✅ Compruébalo

**Que corre:**
- [ ] Existe el archivo `.github/workflows/ci.yml` en tu repositorio.
- [ ] En la pestaña **Actions** de GitHub ves la ejecución del workflow con sus pasos en verde.
- [ ] En el Pull Request apareció el check del CI y pasó.
- [ ] (Opcional) Activaste la protección de rama para exigir el CI.

**Que entendiste:**
- [ ] Tu predicción (verde/rojo) coincidió, y sabes por qué.
- [ ] Puedes explicar qué corre el CI y por qué son los **mismos** comandos `dotnet` de tu máquina.

> 🚦 **Cómo te fue:** 🟢 lo hice y lo entendí · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- **CI (Integración Continua):** GitHub compila y prueba tu proyecto automáticamente en cada cambio.
- Se configura con un **workflow** (`.github/workflows/ci.yml`): `on` (cuándo) + `steps` (qué hacer).
- Los pasos corren los **mismos** comandos `dotnet` que usas en tu máquina, pero en un servidor de GitHub.
- La **protección de rama** puede exigir que el CI pase antes de permitir fusionar.

---

## 🆘 Si algo salió mal

**No aparece ningún check en el PR / no corre nada.**
Verifica la ruta exacta: `.github/workflows/ci.yml` (con el punto inicial y dentro de `workflows`). Un error de ubicación hace que GitHub no lo detecte.

**El workflow falla en "Ejecutar pruebas".**
Probablemente una prueba realmente falla. Abre el paso en la pestaña Actions: muestra el mismo mensaje que verías con `dotnet test` en tu máquina. Corrígelo localmente y vuelve a subir.

**El YAML da error de formato.**
YAML es sensible a la **indentación** (espacios, no tabuladores). Respeta los dos espacios de sangría del ejemplo.

---

**➡️ Siguiente:** [Romper el pipeline a propósito](04-romper-el-pipeline.md)
