# 🏛️ Referencia de Arquitectura Cosmos

Este taller no solo enseña herramientas, enseña la **toma de decisiones** que dio vida a Cosmos. Cada recurso que despliegas responde a un **ADR (Architectural Decision Record)** documentado en nuestro repositorio oficial de arquitectura.

Utiliza este documento como puente entre tu código Terraform y la visión de diseño.

---

## 🗺️ Mapa de Decisiones por Laboratorio

| Laboratorio | Plano de Arquitectura | Decisión Arquitectónica (ADR) | Propósito |
| :--- | :--- | :--- | :--- |
| **Lab 1: Foundation** | Infraestructura Base | [ADR-001](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/001-adr-bounded-contexts-aislados.md) | Aislamiento por Bounded Context. |
| **Lab 2 & 3: Cómputo** | Application Plane | [ADR-003](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/003-adr-yarp-como-application-gateway.md) | Contenedores y orquestación ligera. |
| **Lab 4: Identidad** | Control Plane (Gobernanza) | [ADR-004](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/004-adr-managed-identity-secrets.md) | Estrategia de Zero Secrets e Identidad. |
| **Lab 5: Persistence** | Application Plane (Data) | [ADR-007](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/007-adr-zero-public-ip.md) | Desacoplamiento de estado. |
| **Lab 7: Edge Gateway** | Perímetro (Ingreso) | [ADR-003](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/003-adr-yarp-como-application-gateway.md) | Ruteo inteligente con YARP y Front Door. |
| **Lab 8: Control Plane** | Control Plane (Gestión) | [ADR-009](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/009-adr-separacion-application-plane-y-control-plane.md) | Separación de Lifecycle y Runtime. |
| **Lab 9: Hardening** | Resiliencia | [ADR-007](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/ADRs/007-adr-zero-public-ip.md) | Implementación de Zero Trust con Private Link. |

---

## 🖼️ Vistas Arquitectónicas
Si quieres ver el "Big Picture" de lo que estamos construyendo, consulta las vistas detalladas:

*   🌐 **[Topología de Red](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/architecture-views/01-network-topology.md):** Cómo se conectan las VNets y cuándo usamos Peering.
*   🚦 **[Flujo de Tráfico](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/architecture-views/02-traffic-flow.md):** El viaje de un request desde internet hasta el microservicio.
*   📨 **[Mensajería Asíncrona](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/architecture-views/03-messaging-flow.md):** Cómo los eventos desacoplan nuestro negocio.
*   🔑 **[Identidad y RBAC](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/architecture-views/04-identity-and-rbac.md):** La estrategia de "Zero Trust" y Managed Identities.

---

## 📖 Glosario y Contexto
Para entender los términos de negocio (Tenants, Bounded Contexts, etc.), consulta el **[Glosario Oficial](file:///Users/didierymartinez/Documents/Sincosoft/Cosmos/cosmos/architecture/business-context/glossary.md)**.

---

> **Nota:** Este taller se enfoca en el estado **Actual** y **Dev Objetivo**. Para conocer los retos de la fase de **Prod Propuesto**, lee las consecuencias y decisiones pendientes en el repo de arquitectura.
