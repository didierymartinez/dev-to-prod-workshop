# Lección 7.2 — Escanear imágenes con Trivy

> ⏱️ 40 minutos · 🎯 **Al terminar:** tu pipeline escaneará la imagen antes de publicarla y **frenará el despliegue** si encuentra vulnerabilidades `HIGH` o `CRITICAL` con arreglo disponible. Una imagen insegura ya no llegará a producción.

---

## 🤔 El problema

Acabas de construir y publicar una imagen. ¿Tiene vulnerabilidades conocidas? Hoy no lo sabes — y se desplegó igual. Quieres que el pipeline **revise la imagen solo** y, si encuentra algo grave, **se detenga** antes de publicarla y desplegarla. Que ningún `CRITICAL` pase sin que alguien lo decida.

---

## 💡 Conceptos

### Trivy

**Trivy** es un escáner de seguridad de código abierto. Toma una imagen, mira **todas** sus capas (el SO, los paquetes del sistema, tus dependencias de NuGet) y las compara contra bases de datos públicas de vulnerabilidades. Te devuelve la lista de **CVE** encontrados, con su severidad y —clave— si tienen **arreglo** disponible.

### El escaneo como compuerta (construir → escanear → publicar)

Hasta ahora tu pipeline **construía y publicaba** la imagen de un tirón. Vamos a meter el escaneo **en medio**:

```
   construir (sin publicar) → escanear con Trivy → ¿grave? ─ sí → ✋ falla, NO publica
                                                   └─ no → publica y despliega
```

Así, **nada inseguro llega al registro**. La clave es el **código de salida**: si Trivy encuentra algo que supere tu umbral, termina con error, y el job falla — que es justo lo que queremos.

- `severity: 'HIGH,CRITICAL'` — qué severidades nos importan.
- `exit-code: '1'` — falla el job si encuentra alguna de esas.
- `ignore-unfixed: true` — no frenes por vulnerabilidades que **aún no tienen parche** (no podrías arreglarlas; las vigilas, pero no bloquean).

---

## 🛠️ Manos a la obra

### Paso 1: Reestructurar el job de construcción

En `.github/workflows/deploy.yml`, reemplaza el job `construir-publicar` por esta versión que **construye, escanea y solo entonces publica**:

```yaml
  construir-escanear-publicar:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: "Iniciar sesión en GHCR"
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: "Construir la imagen (sin publicar todavía)"
        uses: docker/build-push-action@v5
        with:
          context: .
          load: true                 # ← carga la imagen en el runner, NO la publica
          tags: |
            ${{ env.IMAGEN }}:latest
            ${{ env.IMAGEN }}:${{ github.sha }}

      - name: "Escanear la imagen con Trivy"
        uses: aquasecurity/trivy-action@v0.28.0
        with:
          image-ref: ${{ env.IMAGEN }}:${{ github.sha }}
          severity: 'HIGH,CRITICAL'
          exit-code: '1'             # ← falla el job si encuentra algo grave
          ignore-unfixed: true       # ← ignora lo que no tiene arreglo aún

      - name: "Publicar la imagen (solo si pasó el escaneo)"
        run: |
          docker push ${{ env.IMAGEN }}:${{ github.sha }}
          docker push ${{ env.IMAGEN }}:latest
```

> 🧠 El truco es `load: true` en vez de `push: true`: la imagen queda **en el runner**, no en GHCR. Trivy la escanea ahí. Solo el último paso la **publica** — y ese paso no se ejecuta si Trivy falló, porque el job se detiene en el primer error.

### Paso 2: Ajustar el resto del pipeline

Los jobs de despliegue de la Fase 6 dependían de `construir-publicar`. Renómbralo en sus `needs:`:

```yaml
  desplegar-staging:
    needs: construir-escanear-publicar     # ← antes: construir-publicar
    # ... el resto igual ...
```

(`desplegar-produccion` sigue dependiendo de `desplegar-staging`, sin cambios.)

### Paso 3: Disparar y leer el resultado

```bash
git add .github/workflows/deploy.yml
git commit -m "seguridad: escanear la imagen con Trivy antes de publicar"
git push
```

En **Actions**, abre el job y mira el paso de Trivy. Verás una tabla como:

```
gestion-empresas-api:abc123 (debian 12.x)
Total: 2 (HIGH: 2, CRITICAL: 0)
┌───────────────┬────────────────┬──────────┬───────────────┬──────────────┐
│    Library    │ Vulnerability  │ Severity │ Installed Ver │  Fixed Ver   │
├───────────────┼────────────────┼──────────┼───────────────┼──────────────┤
│ libxml2       │ CVE-2024-XXXXX │ HIGH     │ 2.9.x         │ 2.9.y        │
└───────────────┴────────────────┴──────────┴───────────────┴──────────────┘
```

Si hay `HIGH`/`CRITICAL` con arreglo, **el job falla** y el despliegue no ocurre. Si todo está limpio, sigue al despliegue como siempre.

> 💡 **Para ver la compuerta actuar** (opcional): si tu imagen sale limpia, baja un momento el umbral a `severity: 'LOW,MEDIUM,HIGH,CRITICAL'` y quita `ignore-unfixed: true`; casi seguro aparecerá algún hallazgo y verás el job **fallar en rojo**. Luego revierte los dos cambios. Así compruebas que la red de seguridad no es solo teórica.

### Paso 4: Responder a un hallazgo

Cuando Trivy te frene, tienes opciones (de mejor a peor):

1. **Actualizar la imagen base:** vuelve a publicar tu imagen sobre una base más nueva. A menudo basta con que tu pipeline reconstruya: las imágenes oficiales de .NET se reparan seguido. Asegúrate de no fijar una base vieja.
2. **Actualizar el paquete/dependencia** con el arreglo (lo automatizarás con Dependabot en la próxima lección).
3. **Aceptar el riesgo conscientemente** (solo si no hay arreglo y entiendes el impacto): ahí entra `ignore-unfixed` o, para un CVE puntual, un archivo `.trivyignore`. **Nunca** silencies a ciegas.

> 💡 **Pro-tip (opcional):** puedes subir los resultados a la pestaña **Security → Code scanning** de GitHub generando un informe en formato **SARIF** (`format: sarif` + `github/codeql-action/upload-sarif`). Así el historial de vulnerabilidades queda visible y con seguimiento, no solo en el log del job.

---

## ✅ Compruébalo

- [ ] El job construye con `load: true` y **escanea antes** de publicar.
- [ ] El paso de Trivy aparece en Actions con su tabla de hallazgos.
- [ ] Si hubiera un `HIGH`/`CRITICAL` con arreglo, el job **falla** y no se publica ni despliega.
- [ ] La imagen solo se publica (`docker push`) **después** de pasar el escaneo.

---

## 🧠 Lo que aprendiste

- **Trivy** escanea todas las capas de una imagen contra bases de datos de **CVE**.
- El patrón **construir (load) → escanear → publicar** evita que una imagen insegura llegue al registro.
- `exit-code: '1'` convierte el escaneo en una **compuerta**: si hay algo grave, el pipeline se detiene.
- `ignore-unfixed: true` evita frenar por vulnerabilidades sin arreglo disponible.

---

## 🆘 Si algo salió mal

**El job pasa aunque "sé" que hay vulnerabilidades.**
Revisa `severity` (solo frena con las que listaste) y que `exit-code: '1'` esté presente. Con `ignore-unfixed: true`, las que no tienen parche no cuentan — quítalo temporalmente para verlas todas.

**El paso de Trivy tarda mucho o falla descargando la base de datos.**
Trivy baja la base de datos de vulnerabilidades en cada corrida. Si ves errores de límite de descarga (*rate limit*), reintenta; en uso intensivo se configura una caché o un registro propio de la base.

**`docker push` falla con "denied".**
Mismo caso del básico: la imagen debe poder publicarse (login a GHCR con `GITHUB_TOKEN` y `packages: write`). Si es la primera vez, recuerda la visibilidad del paquete.

---

**➡️ Siguiente:** [Escanear dependencias y código](03-escanear-dependencias-y-codigo.md)
