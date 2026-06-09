# Lección 6.2 — Crear staging con Terraform

> ⏱️ 40 minutos · 🎯 **Al terminar:** tendrás **dos entornos aislados** (staging y producción) creados a partir del **mismo** código de Terraform, cada uno con su propio estado, usando **workspaces**.

---

## 🤔 El problema

En la Fase 4 creaste `dev.tfvars` y `prod.tfvars` para variar valores por entorno. Pero hay una trampa: si haces `terraform apply -var-file=staging.tfvars` y luego `-var-file=prod.tfvars`, Terraform **no crea dos entornos**. Modifica **los mismos recursos**, porque comparten el **mismo estado** y los **mismos nombres** (`rg-gestion-empresas`, `vm-app`…). Tendrías staging *o* prod, nunca los dos a la vez.

Para tener staging **y** producción al mismo tiempo, cada uno necesita su **propio estado**. Y eso es justo lo que resuelven los **workspaces** de Terraform.

---

## 💡 Conceptos

### Workspaces: varios estados, un mismo código

Recuerda de la Fase 1 que el **estado** (`terraform.tfstate`) es el "mapa" de lo que Terraform ha creado. Un **workspace** es un **estado separado** dentro del mismo código. Cambias de workspace y Terraform pasa a gestionar **otro conjunto** de recursos, sin tocar el anterior.

```
   mismo código (main.tf)
        │
        ├── workspace "staging"  → su propio estado → recursos de staging
        └── workspace "prod"     → su propio estado → recursos de producción
```

### Nombres sin choques

Si los dos entornos usaran el nombre `rg-gestion-empresas`, chocarían en Azure. La solución: meter el **nombre del workspace** en el nombre del **grupo de recursos**. Como **todo** lo demás (VNet, VM, IP…) vive *dentro* de ese grupo, con cambiar el nombre del grupo basta: cada entorno queda en su propio `rg-gestion-empresas-staging` o `rg-gestion-empresas-prod`, completamente aislado.

---

## 🛠️ Manos a la obra

> 🧹 **Antes de empezar:** si todavía tienes la infraestructura de fases anteriores levantada en el workspace por defecto, **destrúyela** (`cd infra && terraform destroy`). A partir de aquí trabajaremos siempre en workspaces **con nombre** (`staging`, `prod`), nunca en el `default`.

### Paso 1: Que el nombre del grupo de recursos incluya el workspace

En `infra/main.tf`, cambia **solo** el `name` del grupo de recursos:

```hcl
resource "azurerm_resource_group" "principal" {
  name     = "rg-gestion-empresas-${terraform.workspace}"   # ← antes: "rg-gestion-empresas"
  location = var.location
}
```

`terraform.workspace` es una variable que Terraform rellena solo con el nombre del workspace activo. No tienes que tocar nada más: el resto de recursos ya usan `resource_group_name = azurerm_resource_group.principal.name`, así que **heredan** el grupo correcto en cada entorno.

> 🧠 ¿Y el Key Vault de la Fase 4, cuyo nombre es único en **todo** Azure? No hace falta tocarlo: como cada workspace tiene su **propio estado**, su `random_string` genera un sufijo distinto en cada entorno, así que sale un nombre único por workspace de forma automática.

### Paso 2: Un archivo de valores para staging

En la Fase 4 hiciste `prod.tfvars` (`Standard_B2s`). Crea ahora `infra/staging.tfvars`, más pequeño para gastar menos:

```hcl
location = "eastus"
vm_size  = "Standard_B1s"     # staging puede ser modesto
```

(Y deja `prod.tfvars` con `Standard_B2s`, como en la Fase 4.)

> 🧠 ¿Y `dev.tfvars`? Recuerda la lección 6.1: **`dev` ahora es tu máquina local**, no un entorno de nube. Así que `dev.tfvars` ya no representa un entorno desplegable; de aquí en adelante trabajamos con `staging` y `prod`.

### Paso 3: Crear y aplicar el workspace de staging

```bash
cd infra
terraform workspace new staging        # crea el workspace y se cambia a él
terraform workspace show               # confirma: "staging"
terraform apply -var-file=staging.tfvars
```

Cuando termine, guarda su IP:

```bash
terraform output -raw ip_publica       # ← IP del manager de STAGING (anótala)
```

### Paso 4: Crear y aplicar el workspace de producción

```bash
terraform workspace new prod           # otro estado, otro entorno
terraform workspace show               # "prod"
terraform apply -var-file=prod.tfvars
terraform output -raw ip_publica       # ← IP del manager de PRODUCCIÓN (anótala)
```

> 💰 Acabas de pedir un **segundo clúster**. Si solo quieres practicar el pipeline contra staging por ahora, puedes **destruir** prod (`terraform workspace select prod && terraform destroy -var-file=prod.tfvars`) y recrearlo cuando vayas a aprobar el despliegue real (próxima lección). El estado del workspace se conserva aunque destruyas los recursos. **Eso sí:** al recrearlo tendrás que **rehacer el setup de Swarm y el secreto** (ver la nota del Paso 5) antes de poder aprobar el deploy en 6.3. Si solo quieres ver el flujo, deja la aprobación pendiente sin recrear prod.

### Paso 5: Moverte entre entornos

```bash
terraform workspace list               # te muestra todos (* = el activo)
terraform workspace select staging     # cambiar a staging
terraform workspace select prod        # cambiar a prod
```

Cada `select` apunta Terraform al estado de ese entorno. **Siempre** confirma dónde estás con `terraform workspace show` antes de un `apply` o un `destroy` — es el equivalente a mirar bien antes de cruzar.

> 🧠 **Importante — qué prepara cada quién:** el pipeline de la próxima lección despliega la **app**, pero **tú** preparas cada clúster **una sola vez** antes del primer despliegue. En el manager de cada entorno (para el taller, al menos en **staging**) repite el setup de las fases 2-5:
> 1. Instala Docker e inicia el clúster: `docker swarm init` + unir el worker (Fase 2.2).
> 2. Crea el secreto de la BD: `printf "Clave_Servidor_2024" | docker secret create db_password -` (Fase 4.2).
> 3. *(Opcional para esta fase)* despliega el stack de observabilidad (Fase 5).
>
> Es decir: el `docker stack deploy` de la app lo hará el pipeline; el clúster, el secreto y la observabilidad son setup **tuyo**, una vez por clúster.

### Paso 6: Guardar el avance

```bash
cd ..
git add infra/main.tf infra/staging.tfvars
git commit -m "entornos staging y prod con workspaces de terraform"
git push
```

---

## ✅ Compruébalo

- [ ] `terraform workspace list` muestra `staging` y `prod`.
- [ ] El grupo de recursos de cada entorno se llama `rg-gestion-empresas-staging` y `rg-gestion-empresas-prod` (míralo en el portal de Azure o con `az group list -o table`).
- [ ] `terraform output -raw ip_publica` da una IP **distinta** en cada workspace.
- [ ] Entiendes por qué cada workspace tiene su **propio estado** y no se pisan.

---

## 🧠 Lo que aprendiste

- Un **workspace** de Terraform es un **estado separado** sobre el **mismo código**: te da entornos aislados sin duplicar archivos.
- Metiendo `${terraform.workspace}` en el nombre del grupo de recursos, cada entorno vive aislado en su propio grupo.
- `terraform workspace new / select / list / show` crean y navegan entre entornos.
- Confirma siempre el workspace activo (`show`) antes de `apply`/`destroy`.

---

## 🆘 Si algo salió mal

**`A resource with the name ... already exists`.**
Dos workspaces intentan crear el mismo nombre en Azure. Asegúrate de que el grupo de recursos usa `${terraform.workspace}` (Paso 1) y de que destruiste la infra vieja del workspace `default`.

**Hice `apply` y modificó el entorno equivocado.**
Estabas en el workspace que no era. `terraform workspace show` te dice cuál está activo; usa `select` para cambiar antes de aplicar.

**`terraform output` no devuelve nada.**
El `output` pertenece al estado del workspace activo. Si acabas de `select` a un workspace que aún no aplicaste, no hay outputs todavía.

---

**➡️ Siguiente:** [Promoción con aprobación](03-promocion-con-aprobacion.md)
