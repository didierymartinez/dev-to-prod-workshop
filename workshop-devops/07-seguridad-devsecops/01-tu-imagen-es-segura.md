# Lección 7.1 — ¿Tu imagen es segura?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es **DevSecOps**, cuál es la **superficie de vulnerabilidades** de tu aplicación, y los tipos de revisión de seguridad que automatizarás en esta fase. Lección de **conceptos**.

---

## 🤔 El problema

Tu pipeline construye una imagen y la despliega a producción sin que nadie se haga una pregunta incómoda: **¿esa imagen es segura?**

Tu imagen no es solo tu código. Adentro hay todo un sistema operativo, un runtime de .NET, librerías del sistema y tus dependencias de NuGet. Cualquiera de esas piezas puede tener una **vulnerabilidad conocida** —un fallo público con número y todo— que un atacante sabe explotar. Si la imagen base que usaste hace tres meses tiene hoy un fallo crítico, lo estás desplegando a producción **sin enterarte**.

La forma tradicional —"que el equipo de seguridad revise antes de salir a producción"— llega tarde, es manual y no escala. Necesitas que la seguridad se revise **sola, temprano y en cada cambio**.

---

## 💡 Conceptos

### Qué es DevSecOps

**DevSecOps** es meter la seguridad **dentro** del flujo de desarrollo y operación, en vez de tratarla como un control aparte al final. La idea central se llama **"shift left"** (correr hacia la izquierda): mover las revisiones de seguridad lo más **temprano** posible en el pipeline, donde arreglar un problema es barato.

```
   Tradicional:  desarrollar → construir → desplegar → ... → 🔒 seguridad revisa (tarde, manual)
   DevSecOps:    desarrollar → 🔒 → construir → 🔒 → desplegar   (automático, en cada cambio)
```

### La superficie de vulnerabilidades de tu imagen

Cuando preguntamos "¿es segura?", hay **cuatro** lugares donde puede haber un problema:

| Capa | Qué es | Ejemplo de riesgo |
|---|---|---|
| **Imagen base** | el SO + runtime (`mcr.microsoft.com/dotnet/aspnet:8.0`) | una librería del sistema con un CVE crítico |
| **Paquetes del SO** | lo que instalaste (`curl`, etc.) | una versión vieja con un fallo conocido |
| **Tus dependencias** | los paquetes de NuGet | una librería con una vulnerabilidad publicada |
| **Tu código** | lo que escribiste tú | una inyección SQL, un secreto quemado |

### Los tipos de revisión que vas a automatizar

- **Escaneo de imagen / dependencias (SCA):** comparar lo que hay en tu imagen y tus paquetes contra bases de datos públicas de vulnerabilidades (**CVE**). Lo harás con **Trivy** (lección 7.2) y con **Dependabot** (7.3).
- **Análisis estático del código (SAST):** revisar tu código fuente buscando patrones inseguros, sin ejecutarlo. Lo harás con **CodeQL** (7.3).
- **Secret scanning:** detectar secretos (tokens, llaves) commiteados por error. Lo activarás en GitHub (7.3).
- **Identidades y mínimo privilegio:** dejar de usar contraseñas donde se puede usar una **identidad**, y dar a cada quien **solo** los permisos que necesita (7.4).

### CVE y severidad

Una vulnerabilidad conocida tiene un identificador público (**CVE**, *Common Vulnerabilities and Exposures*) y una **severidad**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. No todo se arregla igual de urgente: una regla sensata es **frenar el pipeline ante `HIGH` y `CRITICAL`** (las que tienen arreglo disponible) y vigilar las demás.

> 🧠 No se trata de tener "cero vulnerabilidades para siempre" —eso es imposible—, sino de **enterarte** apenas aparecen y tener un proceso para responder. Automatizar es lo que hace eso sostenible.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué significa **"shift left"** y por qué conviene revisar la seguridad temprano?
- [ ] Nombra las **cuatro capas** donde tu imagen puede tener una vulnerabilidad.
- [ ] ¿Qué diferencia hay entre **SCA** (escaneo de dependencias/imagen) y **SAST** (análisis estático del código)?
- [ ] ¿Por qué tiene sentido **frenar** el pipeline ante un `CRITICAL` pero no necesariamente ante un `LOW`?

---

## 🧠 Lo que aprendiste

- **DevSecOps** integra la seguridad en el pipeline ("shift left"): automática, temprana, en cada cambio.
- Tu imagen tiene cuatro capas de riesgo: **base**, **paquetes del SO**, **dependencias** y **tu código**.
- Tipos de revisión: **SCA** (Trivy, Dependabot), **SAST** (CodeQL), **secret scanning**, e **identidades/mínimo privilegio**.
- Las vulnerabilidades tienen **CVE** y **severidad**; una regla sensata es frenar ante `HIGH`/`CRITICAL`.

---

**➡️ Siguiente:** [Escanear imágenes con Trivy](02-escanear-imagenes-con-trivy.md)
