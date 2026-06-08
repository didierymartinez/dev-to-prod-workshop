# Lección 4.4 — Configuración por entorno

> ⏱️ 25 minutos · 🎯 **Al terminar:** sabrás separar la **configuración** (lo no secreto que cambia entre entornos) de modo que la misma infraestructura sirva para `dev` y para `prod` con distintos valores — sentando la base para los entornos de la Fase 6.

---

## 🤔 El problema

Ya resolviste los **secretos** (en el cofre y en `docker secret`). Pero queda la otra mitad: la **configuración no secreta** que cambia entre entornos. Tu desarrollo y tu producción no deberían ser idénticos: en `dev` quieres máquinas pequeñas y baratas; en `prod`, más grandes y con más réplicas. Hoy esos valores están fijos en un solo lado. ¿Cómo tener **un mismo código de infraestructura** con **distintos valores** según el entorno?

---

## 💡 Conceptos

### Config por entorno, sin duplicar

El principio (otra vez 12-factor): **un mismo artefacto, configurado por el entorno**. No quieres copiar y pegar todo el `main.tf` para `prod` y mantener dos copias divergiendo. Quieres **el mismo código** con un **archivo de valores por entorno**.

Terraform lo resuelve con **archivos de variables** (`*.tfvars`): defines las variables una vez (lo hiciste en la Fase 1) y tienes un archivo de valores por entorno. Eliges cuál usar al aplicar.

### Config ≠ secreto (insistimos)

- **Config** (tamaño de VM, región, número de réplicas): va en archivos `*.tfvars`, **versionados en Git** (no es sensible; es parte de la documentación del entorno).
- **Secreto** (contraseñas, tokens): va en **Key Vault / docker secret**, **nunca** en `*.tfvars`.

---

## 🛠️ Manos a la obra

### Paso 1: Un archivo de valores por entorno

En `infra/`, crea dos archivos con los valores que cambian (reutilizando las variables `location` y `vm_size` de la Fase 1):

`infra/dev.tfvars`:
```hcl
location = "eastus"
vm_size  = "Standard_B1s"     # pequeña y económica para desarrollo
```

`infra/prod.tfvars`:
```hcl
location = "eastus"
vm_size  = "Standard_B2s"     # más capacidad para producción
```

### Paso 2: Aplicar el entorno que quieras

Eliges el entorno con `-var-file`:

```bash
cd infra
terraform plan  -var-file=dev.tfvars      # ver el entorno de desarrollo
# o
terraform apply -var-file=prod.tfvars     # crear/actualizar con valores de producción
```

El mismo `main.tf`, dos entornos, sin duplicar nada. Si mañana `prod` necesita una VM aún mayor, lo cambias **en un solo archivo**.

> 🧠 Esto es la **semilla** de tener entornos separados (`dev`, `staging`, `prod`). En la Fase 6 lo llevaremos al pipeline: crear un `staging` idéntico a `prod` y promover de uno a otro con control.

### Paso 3: Versionar la configuración (no los secretos)

Los `*.tfvars` de entorno **sí** van a Git: son la descripción de cada entorno. (Los secretos no — esos viven en Key Vault.)

```bash
cd ..
git add infra/dev.tfvars infra/prod.tfvars
git commit -m "separar configuracion por entorno (dev/prod) con tfvars"
git push
```

> ⚠️ Recuerda: en la Fase 1 ignoramos `terraform.tfvars` por si contenía datos propios. Estos `dev.tfvars`/`prod.tfvars` solo tienen **config no sensible**, por eso sí se versionan. Nunca pongas una contraseña en un `.tfvars`.

---

## 🧹 Apagar o destruir para no gastar

```bash
cd infra && terraform destroy -var-file=dev.tfvars
```
(o `az vm deallocate` los nodos). Como siempre, recréalo en minutos cuando vuelvas.

---

## ✅ Compruébalo

- [ ] Tienes `infra/dev.tfvars` y `infra/prod.tfvars` con valores distintos.
- [ ] `terraform plan -var-file=dev.tfvars` y `-var-file=prod.tfvars` muestran configuraciones distintas (p. ej. el tamaño de VM).
- [ ] Entiendes qué va en `*.tfvars` (config) y qué va en Key Vault/`docker secret` (secretos).

---

## 🧠 Lo que aprendiste

- La **configuración por entorno** se separa con archivos `*.tfvars`: un mismo código, valores distintos por entorno.
- Los `*.tfvars` de entorno **se versionan** (no son secretos); los **secretos** nunca van ahí.
- Es la base para los entornos `dev`/`staging`/`prod` de la Fase 6.

---

## 🏁 Cierre de la Fase 4

Tus secretos viven donde deben (cofre + `docker secret`, fuera de los archivos y del entorno), y tu configuración está lista para variar por entorno. Tu plataforma es cada vez más profesional.

Pero hay algo que aún no tienes: **saber qué pasa adentro**. Si la app se pone lenta, si una réplica falla seguido, si la memoria se dispara… hoy solo te enterarías mirando `docker logs` a mano. En la próxima fase le pondrás **ojos** a tu sistema: logs centralizados, métricas y alertas.

---

## 🆘 Si algo salió mal

**`terraform` ignora mis valores del `.tfvars`.**
Solo el archivo llamado exactamente `terraform.tfvars` (o `*.auto.tfvars`) se carga solo; para `dev.tfvars`/`prod.tfvars` debes pasarlos con `-var-file=...` en cada comando.

**No sé qué variables puedo poner en los `.tfvars`.**
Las que declaraste en `variables.tf` (Fase 1): `location`, `vm_size`, `ssh_public_key_path`. Para variar más cosas por entorno (p. ej. número de workers), declara nuevas variables y úsalas en `main.tf`.

---

**➡️ Siguiente fase:** [Fase 5 — Observabilidad](../05-observabilidad/README.md)
