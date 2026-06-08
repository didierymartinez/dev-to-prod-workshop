# Fase 7 — Seguridad (DevSecOps)

> **Meta de la fase:** Meter la **seguridad dentro del pipeline**, no como un trámite al final. Escanearás tu imagen en busca de vulnerabilidades (y frenarás el despliegue si son graves), vigilarás tus dependencias y tu código automáticamente, y reemplazarás credenciales por **identidades** con el principio de **mínimo privilegio**.

---

## La fragilidad que resolvemos

Tu pipeline ya construye, prueba entornos y promueve a producción con control. Pero nadie revisa lo más básico de la seguridad: **¿la imagen que despliegas tiene vulnerabilidades conocidas?** ¿Tus dependencias están al día? ¿Tu propio código tiene patrones inseguros? Y para entrar a los servidores y leer secretos sigues **repartiendo llaves y contraseñas** donde podrías usar **identidades**. La seguridad que llega "al final, de otro equipo" llega tarde y cara. La vamos a automatizar y a correr **en cada cambio**.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [¿Tu imagen es segura?](01-tu-imagen-es-segura.md) | Entender DevSecOps y la superficie de vulnerabilidades | 20 min |
| 2 | [Escanear imágenes con Trivy](02-escanear-imagenes-con-trivy.md) | Frenar el despliegue si la imagen tiene CVEs graves | 40 min |
| 3 | [Escanear dependencias y código](03-escanear-dependencias-y-codigo.md) | Dependabot + análisis estático + secret scanning | 35 min |
| 4 | [Identidades y mínimo privilegio](04-identidades-y-minimo-privilegio.md) | Managed Identity en vez de contraseñas; least privilege | 45 min |

> Necesitas el pipeline de la Fase 6 (`deploy.yml` + `deploy-stack.yml`), el Key Vault de la Fase 4 y tu Terraform con workspaces.

---

**➡️ Empieza en:** [¿Tu imagen es segura?](01-tu-imagen-es-segura.md)
