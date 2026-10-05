# Actualizar el taller de plataforma a la Cosmos real

> **Qué es esto.** El contraste entre lo que enseña `workshop-adv` (10 labs de Terraform) y lo que **hoy** es la plataforma, con la fuente de cada afirmación. Sirve para reescribir el taller y para alimentar la visual [`visual/universo-cosmos.html`](visual/universo-cosmos.html), que ya dibuja la versión real.
>
> **Fuentes.** (1) Blog de ingeniería, post *La forma de la plataforma* (feb 2026) y ADR-0001. (2) `workshop-event-sourcing/AUDITORIA-APPLICATION-PLANE.md` y `ACCIONABLES-APPLICATION-PLANE.md`, que leyeron el código real de 16 repos. (3) `workshop-event-sourcing/AMPLIACION-MARTEN.md`, inventario de `Cosmos.ControlPlane`.
> **Hueco de evidencia:** no hay un repo de **infraestructura** (Terraform de red, Front Door, Private Link, Postgres) accesible desde esta sesión. Todo lo de red y PaaS queda **por confirmar** hasta leer ese repo.

---

## 1. Lo que cambió (o nunca estuvo)

| Tema | Lo que dice el taller | Lo que es hoy | Fuente | Dónde pega |
|---|---|---|---|---|
| Servicios del Control Plane | 3 Functions: onboarding, billing, user-mgmt | **5 Function Apps** de escritura (Onboarding, TenantManagement, TenantProvisioning, UserManagement, Billing) + **1 host de lectura** (Query, proyecciones Marten). El diseño suma Identity y Metrics. | blog · AMPLIACION | Lab 9 |
| Ciclo de vida del tenant | No aparece | Registrado → Activado → Suspendido → Inactivo → Destruido, administrado por Tenant Manager; cada cambio dispara acciones en el Application Plane | blog | Lab 9 (nuevo) |
| Tenant Provisioning | "La Function de onboarding crea la DB" | Provisioning es **el puente**: pide a cada producto que active al tenant (puede ser una fila o infraestructura propia) | blog | Lab 9 |
| Aislamiento de datos | Una DB por tenant (implícito) | Los repos usan **tenancy conjoined** (mismas tablas, `tenant_id`). El ADR-0001 sigue **propuesto**, sin decisión | auditoría · ADR-0001 | Labs 6 y 9 |
| Identidad de los usuarios | Token JWT, sin proveedor | **WorkOS**: el Gateway valida su JWT; el tenant sale del **claim**, nunca de un header del cliente | auditoría | Lab 8 (nuevo paso) |
| Gateway | YARP que enruta | YARP de ~170 líneas: valida JWT de WorkOS **y** el id de Front Door, **borra el header de tenant entrante y lo reinyecta desde el claim** (anti-spoofing, con test) | auditoría | Lab 8 |
| Front Door ↔ Gateway | NSG con `AzureFrontDoor.Backend` | Además, el Gateway valida el **id de Front Door** en el header. Riesgo abierto: si el secreto falta, la validación se apaga sin ruido (fail-open) | auditoría | Lab 8 |
| Mensajería entre planos | Un Service Bus por plano, genérico | Azure Service Bus con topics/subscriptions; **34 handlers** en el Control Plane son Functions con `ServiceBusTrigger`; **sesiones por tenant** (`GroupId = TenantId`) para el orden | AMPLIACION | Lab 9 |
| Mensajería dentro del Application Plane | Solo Service Bus | **RabbitMQ con Wolverine** entre bounded contexts (Entradas → Radicación, Notificaciones), además de Service Bus | auditoría | Lab 9 o uno nuevo |
| Autenticación a Service Bus | Texto: Managed Identity y `disableLocalAuth`; código: `ServiceBusConnection` (cadena de conexión) | El propio lab se contradice. **Por confirmar** qué usan las Function Apps reales | Lab 9 | Lab 9 |
| Secretos en runtime | Key Vault + env.js | Los servicios del Swarm leen **Swarm secrets** (`AddKeyPerFile`). Riesgo abierto: credenciales de producción versionadas en `appsettings` de dos repos | auditoría | Labs 4 y 6 |
| Notificaciones en vivo | No aparece | Servicio con **SignalR + backplane Redis**, consume de RabbitMQ y de Service Bus. Riesgo abierto: el hub no exige autenticación | auditoría | nuevo |
| Productos del Application Plane | "OXP, Contabilidad, Radicación" | **Obligaciones por Pagar** (Front, Gateway, Entradas, Reconocimiento, Radicación, Integraciones), Contabilidad, Impuestos, Terceros, Direcciones, Datos de referencia, Asistente… | auditoría | Labs 3 y 9 |
| Versión de .NET | .NET 8 (Functions isolated) | **.NET 10** en todos los repos auditados | auditoría | Lab 9 |
| Observabilidad | Application Insights del Control Plane | El diseño pide Metrics por tenant; la auditoría encontró que **nadie mide el rezago** de las proyecciones (aporte L6 → CosmosLens) | blog · auditoría | Lab 9 o 10 |

## 2. Problemas del taller que no dependen de la plataforma

- **La numeración no cuadra:** `00_Workshop_Overview.md` lista 9 labs (Persistencia = Lab 5, Control Plane = Lab 8); los archivos son 10 (Persistencia = 06, Control Plane = 09). `00_Architecture_Reference.md` usa una tercera numeración.
- **Los enlaces a los ADR apuntan a rutas locales** (`file:///Users/didierymartinez/...`): no abren para nadie más. Hay que enlazar el repo de arquitectura o el blog.
- **`mi-cosmos/` versiona `terraform.tfstate` y su backup.** Revisado: solo tiene la llave SSH pública y nombres de recursos, ningún secreto. Aun así, el state no va en el repo: moverlo y agregarlo al `.gitignore`.

## 3. Arco propuesto (a validar)

Se conserva el hilo de "construir la infraestructura lab a lab", pero el destino es la plataforma real y la pregunta de cada lab es una de la visual:

| # | Lab | Pregunta que responde |
|---|---|---|
| 1-3 | Red, cómputo y Swarm (se conservan, actualizando nombres de productos) | ¿Dónde corren los servicios del Application Plane? |
| 4-6 | Registro, pipeline, Postgres y secretos (añadir Swarm secrets) | ¿Dónde viven los secretos y los datos? |
| 7 | Frontend | (se conserva) |
| 8 | Perímetro: Front Door + **Gateway real** (FDID, JWT de WorkOS, anti-spoofing) | ¿Cómo sabe un producto a qué tenant pertenece una petición? ¿Qué pasa si alguien se salta el portal? |
| 9 | **El Control Plane real**: los 5 servicios, el ciclo de vida del tenant y Provisioning como puente | ¿Qué pasa cuando nace un tenant? ¿Qué estados vive? |
| 10 | **La mensajería**: Service Bus con sesiones por tenant, RabbitMQ dentro del plano, idempotencia | ¿Por qué no hay HTTP entre planos? ¿Qué pasa si un mensaje llega dos veces? |
| 11 | Hardening (Private Link) + **los riesgos abiertos de la auditoría** como ejercicios de criterio | ¿Qué está mal hoy y cómo se arregla? |

## 4. Lo que hace falta para escribirlo bien

1. **Acceso al repo de infraestructura** (Terraform real): red, Front Door, Postgres, Private Link, Function Apps y su autenticación a Service Bus.
2. **Acceso a `Cosmos.ControlPlane`**, para ver cómo Provisioning habla con cada producto y cómo reacciona un producto a "suspendido".
3. Confirmar con el equipo el estado del **ADR-0001** (aislamiento de datos) y de **Identity/Metrics** en el Control Plane.
