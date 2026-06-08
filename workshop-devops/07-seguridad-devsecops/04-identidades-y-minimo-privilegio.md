# Lección 7.4 — Identidades y mínimo privilegio

> ⏱️ 45 minutos · 🎯 **Al terminar:** tu aplicación leerá su secreto **directamente del Key Vault** identificándose con una **managed identity** —sin ninguna contraseña de por medio— y entenderás el principio de **mínimo privilegio** que recorre todo lo que construiste.

---

## 🤔 El problema

Mira cuántas credenciales repartes: una **llave SSH** en GitHub para entrar a los servidores, una **contraseña de BD** que alimentas al `docker secret` desde el Key Vault a mano (Fase 4). Cada credencial es algo que **rotar**, que **proteger** y que se puede **filtrar**.

¿Y si la aplicación no necesitara *ninguna* contraseña para leer su secreto? ¿Si pudiera presentarse ante el Key Vault diciendo **"soy esta máquina, dame mi secreto"** y el cofre la reconociera por **lo que es**, no por una llave que alguien podría robar? Eso es una **identidad gestionada**, y es el último escalón de la escalera de secretos que empezaste en la Fase 4.

---

## 💡 Conceptos

### Managed Identity: identidad en vez de contraseña

Una **managed identity** (identidad gestionada) es una identidad que Azure le da a un recurso —tu VM— y administra por ti. No tiene contraseña: Azure se encarga de las credenciales por debajo y las rota solo. Tú solo haces dos cosas:

1. Le das a la VM una identidad.
2. Le das a **esa identidad** permiso de leer secretos en el Key Vault.

A partir de ahí, la app que corre en la VM lee del cofre **sin ninguna contraseña**. Recuerda la escalera de la Fase 4:

```
   código ❌ → env ⚠️ → .env ⚠️ → docker secret ✅ → cofre + identidad ✅✅✅  ← estás aquí
```

### Mínimo privilegio (least privilege)

El principio: **cada quien tiene solo los permisos que necesita, ni uno más.** Si la app solo necesita *leer* el secreto, su identidad debe poder hacer `Get` — **no** `Delete`, **no** `Set`. Así, si esa identidad se viera comprometida, el daño posible es mínimo.

Esto aplica a todo lo que construiste: la identidad de la VM (solo leer secretos), el `GITHUB_TOKEN` del pipeline (`contents: read`, `packages: write` y nada más), las reglas del NSG (solo los puertos necesarios), las políticas del Key Vault. Menos privilegio = menos superficie de ataque.

---

## 🛠️ Manos a la obra

### Paso 1: Darle una identidad a la VM (Terraform)

En `infra/main.tf`, dentro del recurso `azurerm_linux_virtual_machine "app"`, agrega un bloque `identity`:

```hcl
resource "azurerm_linux_virtual_machine" "app" {
  name = "vm-app"
  # ... lo que ya tenías ...

  identity {
    type = "SystemAssigned"     # ← Azure le crea y gestiona una identidad propia
  }
}
```

### Paso 2: Darle permiso a esa identidad en el Key Vault

En el `azurerm_key_vault "kv"` de la Fase 4, agrega una **segunda** `access_policy`, ahora para la identidad de la VM — y **solo** con permiso de lectura (mínimo privilegio):

```hcl
  # Permiso para la IDENTIDAD de la VM: solo leer secretos
  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = azurerm_linux_virtual_machine.app.identity[0].principal_id
    secret_permissions = ["Get", "List"]    # ← NO "Set" ni "Delete"
  }
```

Y expón la URL del cofre como salida, para configurársela a la app:

```hcl
output "kv_uri" {
  value = azurerm_key_vault.kv.vault_uri
}
```

Aplica en el workspace que estés usando:

```bash
cd infra
terraform apply -var-file=staging.tfvars     # (o prod.tfvars)
terraform output -raw kv_uri                  # anota la URL del cofre
```

### Paso 3: Que la app lea del cofre con su identidad

Agrega los paquetes de Azure a la API:

```bash
dotnet add package Azure.Identity
dotnet add package Azure.Security.KeyVault.Secrets
```

En `src/GestionEmpresas.Api/Program.cs`, amplía la lógica que resuelve la contraseña para que, **si hay un Key Vault configurado**, la lea de ahí con la identidad de la máquina:

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

// Resuelve la contraseña de la BD, del más seguro al de respaldo:
string? ResolverPassword()
{
    var kvUri = builder.Configuration["KeyVaultUri"];     // configurado por entorno
    if (!string.IsNullOrEmpty(kvUri))
    {
        // La app se identifica con la IDENTIDAD de la VM — sin contraseña.
        var cofre = new SecretClient(new Uri(kvUri), new DefaultAzureCredential());
        return cofre.GetSecret("db-password").Value.Value;
    }
    if (File.Exists("/run/secrets/db_password"))           // si no, el docker secret (Fase 4)
        return File.ReadAllText("/run/secrets/db_password").Trim();
    return null;                                            // en local, la config de siempre
}

var password = ResolverPassword();
var connectionString = password is not null
    ? $"Host=db;Port=5432;Database=empresasdb;Username=appuser;Password={password}"
    : builder.Configuration.GetConnectionString("BaseDatos");

builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connectionString));
```

`DefaultAzureCredential` es lista: **en la VM** usa la managed identity automáticamente; **en tu máquina**, usa tu sesión de `az login`. El mismo código funciona en ambos lados, sin contraseñas en ninguno.

> 🧠 La app corre en un contenedor, pero el contenedor alcanza el **endpoint de metadatos** de la VM, así que se autentica como la **identidad de la VM**. No hay secreto que montar para este camino: la identidad *es* la credencial.

### Paso 4: Configurarle la URL del cofre a la app

La URL del Key Vault es **configuración, no secreto** (no abre nada por sí sola). Pásala en el `environment` del servicio `api` en tu `stack.yml`:

```yaml
  api:
    image: ghcr.io/TU_USUARIO/gestion-empresas-api:${IMAGE_TAG:-latest}
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - KeyVaultUri=https://kv-gestion-xxxx.vault.azure.net/   # ← del "terraform output kv_uri"
```

Republica la imagen (con los paquetes nuevos) y redespliega el stack. La app ahora toma su contraseña del cofre, identificándose por sí misma.

### Paso 5: Pasar la lista de mínimo privilegio

Recorre lo que ya tienes y recorta lo que sobre:

- [ ] La identidad de la VM en el Key Vault: solo `Get`, `List` (no `Set`/`Delete`). ✅ lo hiciste en el Paso 2.
- [ ] El `GITHUB_TOKEN` del pipeline: `permissions:` con solo `contents: read` y `packages: write`.
- [ ] El NSG (Fase 1-2): solo los puertos necesarios abiertos (22, 5000, y los de Swarm). Nada de "todo abierto".
- [ ] Los secretos por entorno de GitHub (Fase 6): cada entorno con los suyos, no compartidos.

### Paso 6: Guardar el avance

```bash
cd ..
git add infra/main.tf src/GestionEmpresas.Api/ stack.yml
git commit -m "seguridad: managed identity para leer el Key Vault, con minimo privilegio"
git push
```

---

## ✅ Compruébalo

- [ ] La VM tiene una `identity { type = "SystemAssigned" }`.
- [ ] El Key Vault tiene una `access_policy` para la identidad de la VM con **solo** `Get`/`List`.
- [ ] La app resuelve la contraseña desde el cofre con `DefaultAzureCredential` (sin contraseña en el código ni el entorno).
- [ ] Repasaste la lista de mínimo privilegio y no hay permisos de más.

---

## 🧠 Lo que aprendiste

- Una **managed identity** le da a la VM una identidad sin contraseña; el Key Vault le da permiso a **esa identidad**, y la app lee el secreto **identificándose por lo que es**.
- `DefaultAzureCredential` usa la identidad de la VM en la nube y tu `az login` en local — mismo código.
- Es el **último escalón** de la escalera de secretos: del `docker secret` al cofre leído por identidad.
- **Mínimo privilegio**: cada identidad, token y regla tiene solo lo que necesita. Menos permisos = menos riesgo.

---

## 🏁 Cierre de la Fase 7

La seguridad dejó de ser un trámite final y pasó a vivir **dentro** de tu pipeline y tu infraestructura:

- La **imagen** se escanea antes de publicarse (Trivy frena lo grave).
- Las **dependencias**, el **código** y los **secretos** se vigilan solos (Dependabot, CodeQL, secret scanning).
- Las **credenciales** dan paso a **identidades**, y todo corre con **mínimo privilegio**.

Con esto cierras el recorrido técnico del taller. En la última fase darás un paso atrás para ver **el panorama completo** de lo que construiste, y hacia dónde seguir creciendo: Kubernetes, SRE, *platform engineering*, GitOps — y el puente al taller avanzado.

---

## 🧹 Apagar o destruir para no gastar

```bash
cd infra
terraform workspace select staging && terraform destroy -var-file=staging.tfvars
terraform workspace select prod    && terraform destroy -var-file=prod.tfvars
```

---

## 🆘 Si algo salió mal

**`DefaultAzureCredential` falla con "no credential available" o "managed identity not found".**
En la VM, confirma que el `apply` creó la `identity` (Paso 1) y que la `access_policy` de la VM existe (Paso 2). En tu máquina local, asegúrate de haber hecho `az login`.

**La app da "Forbidden" al leer el secreto.**
La identidad de la VM tiene permiso solo si la `access_policy` apunta a su `principal_id`. Si tu suscripción usa **RBAC** en el Key Vault (en vez de access policies), asigna el rol *Key Vault Secrets User* a la identidad de la VM.

**No tengo el `KeyVaultUri` correcto.**
Sale de `terraform output -raw kv_uri` en el workspace correcto. Recuerda que cada entorno tiene **su** cofre (Fase 6).

---

**➡️ Siguiente fase:** [Fase 8 — Cierre](../08-cierre/README.md)
