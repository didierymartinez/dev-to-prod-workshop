# Actualizar el taller de plataforma a la Cosmos real

> **Qué es esto.** Lo que enseña `workshop-adv` (10 labs de Terraform) frente a lo que muestran **los repositorios reales** de Cosmos-SincoERP, leídos el 5 oct 2026: `.github` (workflows reusables y ADR-0003), `ObligacionesPorPagar.{Gateway, Entradas, Reconocimiento, Radicacion, Integraciones, Front}` y `blog-ingenieria`.
> Es la fuente del contenido del juego [`visual/mision-cosmos.html`](visual/mision-cosmos.html).
> **Corrige** la versión anterior de este documento y la visual `universo-cosmos.html`, que se basaban en notas de auditoría y daban por hecho un Gateway YARP en el producto, sesiones de Service Bus por tenant y dos Service Bus. Los repos dicen otra cosa (ver abajo).

---

## 1. La plataforma según los repos

| Pieza | Lo que hay | Evidencia |
|---|---|---|
| **Infraestructura como código** | Terraform en repos `*.Infraestructura` (uno por BC, no accesibles); workflows reusables `_reusable-terraform-{plan,apply}.yml` con estado remoto `sttfstate<bc>eus2001` y login **OIDC** | `.github/.github/workflows/README.md` |
| **Entornos** | Dev y prod en **VMs distintas**; prod en **suscripción propia**; un Key Vault por entorno (`kv-oxp-{dev,prod}-eus2-001`) | `adr/0003`, `main-deploy-{dev,prod}.yml` |
| **Cómputo** | **Docker Swarm, una VM por bounded context y entorno** (OXP, Impuestos, Contabilidad, Asistente, `vm-appl`…). Hoy **un nodo y 1 réplica** por servicio, `start-first` con rollback. La doc planea 3 nodos en prod | `*/deploy/stack.prod.yml`, `topologia-equipos-despliegue.md` |
| **Redes del Swarm** | Overlays `oxp-public` y `oxp-internal`, creadas por cloud-init; `payment-polling` solo en la interna | `Radicacion/deploy/stack.prod.yml` |
| **CI/CD** | Workflows reusables `Cosmos-SincoERP/.github@v1`. Tests en `ubuntu-latest`; build, push y deploy en runner **self-hosted** dentro de la VM, por runner group de cada BC | `.github/workflows/README.md` |
| **Registro** | Un **ACR por BC** (`croxpdeveus2001`); tags `pr-N-<sha>` y `main-<sha>`; **prod promueve la imagen de dev** (no recompila) | `main-deploy-prod.yml`, `adr/0003` |
| **Promoción a prod** | `workflow_dispatch` sobre `main`, solo el team `prod-infra-approvers`; Environments `dev`/`prod` | `main-deploy-prod.yml` |
| **Identidad de la VM** | **Managed Identity** con AcrPull y Key Vault Secrets User (`az login --identity`) | `_reusable-deploy-swarm.yml` |
| **Secretos** | El deploy lee el Key Vault y crea **Swarm secrets versionados por hash** (`<prefix>_<nombre>_v<sha8>`), montados en `/run/secrets` y leídos con `AddKeyPerFile` | `_reusable-deploy-swarm.yml`, `Radicacion Program.cs` |
| **Datos** | Una base Postgres **por servicio** (`pg-cs-<servicio>db`). Que sea PostgreSQL Flexible lo dice la doc; el código solo tiene cadenas de conexión | `topologia...md` |
| **Event store** | Marten 9.8–9.23, **TenancyStyle.Conjoined** (`tenant_id` en las mismas tablas), esquema por servicio; outbox durable de Wolverine en Postgres | `Entradas ServicesCollectionExtensions.cs` |
| **Mensajería dentro del producto** | **RabbitMQ con Wolverine**: exchange por servicio, colas como `Radicacion-From-EntradasExchange` | `Entradas`, `Radicacion Program.cs` |
| **Mensajería entre productos** | **Un solo Azure Service Bus**: topic **por evento**, suscripciones `oxp-from-{contabilidad,impuestos,estructura-organizacional}`; **sin sesiones**; se entra por **SAS** (plan: Managed Identity, ADR-004); el tenant viaja en `DeliveryOptions.TenantId` | `MensajeriaWolverineExtensions.cs` |
| **Frontend** | React 19 + Vite + Module Federation; **Storage static website compartido** `stfrontappl{dev,prod}eus2001` bajo `/oxp/releases/<sha>/`; `env.js` (`window.__APP_CONFIG__`) generado desde Key Vault | `Front env.ts`, `deploy-new.yml` |
| **Identidad de usuarios** | **WorkOS AuthKit**; organización de WorkOS = tenant (`ExternalId = TenantId`, la crea UserManagement del Control Plane); JWT con `tenant_id` y `user_email` | `Front/docs/contratos/identidad-tenant.md` |
| **Perímetro** | **Front Door** (`app.sincoerp.ai`, `dev.sincoerp.ai`; rutas `/api/oxp`, `/api/impu`…) → **YARP del Application Plane** en `vm-appl` (valida JWT de WorkOS y `X-Azure-FDID`, borra y reinyecta `X-Tenant-Id`/`X-User-Id`) → **nginx del producto** por HTTP `:80` (reparte por prefijo, no valida JWT) → APIs en `:8080` | `Gateway/nginx/conf.d/default.conf`, `identidad-tenant.md` |
| **Tenant en los servicios** | Headers de confianza (`TrustedHeadersTenantContext`); en mensajes, `IMessageContext.TenantId` | `TenantContextMcp.cs` |
| **Observabilidad** | OpenTelemetry hacia `otel-agent:4317`; Serilog; Kibana/Elastic vía Teleport; `/healthz` con chequeo de Postgres. Sin App Insights | `HostExtensiones.cs` |
| **Control Plane** | Repos `Cosmos.ControlPlane`, `*.TenantProvisioning` por BC, `Cosmos.TenantSettings`… (no accesibles). Servicios según el blog: Onboarding, Tenant Manager, Tenant Provisioning, Identity, Admin users, Metrics, Facturación | `.github/docs/repos-manifest.yml`, blog |
| **Red privada** | **No hay** private endpoints, peering ni DNS privado | `adr/0003` (A1) |

## 2. El taller viejo frente a los repos

| Lo que asume el taller | Lo que muestran los repos | Labs |
|---|---|---|
| Una VM con Docker Swarm | **Una VM-Swarm por BC y entorno**, un nodo, réplicas 1 | 2-3 |
| YARP en la VM del producto | YARP en la VM del **Application Plane**; en el producto hay **nginx** | 8 |
| NSG que solo deja pasar a Front Door | NSG por **IP de origen** (`vm-appl`, Asistente); el de Impuestos está abierto a internet | 1, 8 |
| Managed Identity de la VM para ACR | ✅ Se cumple | 4 |
| Runner self-hosted con PAT en Key Vault | Runner self-hosted ✅; el PAT es un **secret de GitHub** que se pasa a Terraform | 4-5 |
| PostgreSQL Flexible | Solo lo afirma la doc; por confirmar en el Terraform | 6 |
| Frontend en Storage + `env.js` | ✅ Se cumple, en un Storage **compartido** del plano con releases por sha | 7 |
| Dos Service Bus (uno por plano) | **Uno solo**, por SAS, topic por evento | 9 |
| Functions de onboarding, billing y user-mgmt | Repos del Control Plane no accesibles; el blog define 7 servicios | 9 |
| Private Link | **No existe** (ADR-0003) | 10 |
| .NET 8 | **.NET 10** | 9 |

Además, en el taller: tres numeraciones distintas de los labs, enlaces a los ADR que apuntan a `file:///Users/...` y el `terraform.tfstate` versionado en `mi-cosmos/` (sin secretos, pero no va en el repo).

## 3. El arco nuevo (es el del juego)

| Sector | Qué se construye | Fuente |
|---|---|---|
| 1 · La base | Terraform por BC, estado remoto, OIDC, prod en otra suscripción | `.github`, adr/0003 |
| 2 · El astillero | VM-Swarm por BC y entorno, stack, overlays, rollback | `stack.prod.yml` |
| 3 · La bodega y la grúa | Workflows reusables, runner self-hosted, ACR por BC, promoción de la misma imagen | `.github`, `main-deploy-prod.yml` |
| 4 · La bóveda | Key Vault → Swarm secrets versionados → `AddKeyPerFile` | `_reusable-deploy-swarm.yml` |
| 5 · El Archivo | Postgres por servicio, Marten Conjoined, outbox | Entradas, Radicación |
| 6 · Los planetas | Los BCs de OXP con APIs de comandos y consultas, y servidores MCP | `stack.prod.yml` |
| 7 · La órbita local | RabbitMQ dentro del producto, idempotencia | Entradas, Radicación |
| 8 · El hiperespacio | Service Bus entre productos, topic por evento, SAS → MI | `MensajeriaWolverineExtensions.cs` |
| 9 · El faro | Front con Module Federation, Storage compartido, `env.js` | Front |
| 10 · El pasaporte | WorkOS: organización = tenant, claims | `identidad-tenant.md` |
| 11 · El portal | Front Door, dominios, rutas, `X-Azure-FDID` | Front `env.ts` |
| 12 · Las aduanas | YARP del plano + nginx del producto, anti-spoofing de tenant | `default.conf`, `identidad-tenant.md` |
| 13 · La Estación de Control | Control Plane: Onboarding, Tenant Manager, Provisioning, UserManagement | blog, `repos-manifest.yml` |
| 14 · El observatorio | OpenTelemetry, Serilog, Kibana, `/healthz`; falta el rezago (CosmosLens) | `HostExtensiones.cs` |
| 15 · El escudo | Lo que falta: rotar secretos, TLS entre aduanas, MI para Service Bus, private endpoints, cerrar NSG | adr/0003, auditoría |

## 4. Lo que falta para escribir los labs con código real

Los repos que no estuvieron accesibles y que harían falta: `ApplicationPlane` y `ApplicationPlane.Infraestructura` (YARP y red del plano), `ObligacionesPorPagar.Infraestructura` (VM, NSG, Postgres, cloud-init), `Cosmos.ControlPlane` y los `*.TenantProvisioning`, y `architecture` (ADR-001/002/004).
Sin ellos, quedan **por confirmar**: reglas de NSG y Front Door, el cloud-init de las VMs, si Postgres es Flexible, dónde corren RabbitMQ y `otel-agent`, el código del YARP y el del Control Plane.
