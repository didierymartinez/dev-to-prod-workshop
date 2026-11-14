# 🏛️ Referencia de Arquitectura Cosmos

Este taller no solo enseña herramientas, enseña la **toma de decisiones** que dio vida a Cosmos. Cada recurso que despliegas responde a un **ADR (Architectural Decision Record)** documentado en nuestro repositorio oficial de arquitectura.

Utiliza este documento como puente entre tu código Terraform y la visión de diseño.

> Ese repositorio de arquitectura no forma parte de este repo: los ADR, las vistas y el glosario se citan aquí por su número o su nombre, sin enlace.

---

## 🗺️ Mapa de Decisiones por Laboratorio

| Laboratorio | Plano de Arquitectura | Decisión Arquitectónica (ADR) | Propósito |
| :--- | :--- | :--- | :--- |
| **Lab 1: Foundation** | Infraestructura Base | ADR-001 | Aislamiento por Bounded Context. |
| **Lab 2 & 3: Cómputo** | Application Plane | ADR-003 | Contenedores y orquestación ligera. |
| **Lab 4: Identidad** | Control Plane (Gobernanza) | ADR-004 | Estrategia de Zero Secrets e Identidad. |
| **Lab 5: Persistence** | Application Plane (Data) | ADR-007 | Desacoplamiento de estado. |
| **Lab 7: Edge Gateway** | Perímetro (Ingreso) | ADR-003 | Ruteo inteligente con YARP y Front Door. |
| **Lab 8: Control Plane** | Control Plane (Gestión) | ADR-009 | Separación de Lifecycle y Runtime. |
| **Lab 9: Hardening** | Resiliencia | ADR-007 | Implementación de Zero Trust con Private Link. |

---

## 🖼️ Vistas Arquitectónicas
Si quieres ver el "Big Picture" de lo que estamos construyendo, consulta las vistas detalladas:

*   🌐 **Topología de Red:** Cómo se conectan las VNets y cuándo usamos Peering.
*   🚦 **Flujo de Tráfico:** El viaje de un request desde internet hasta el microservicio.
*   📨 **Mensajería Asíncrona:** Cómo los eventos desacoplan nuestro negocio.
*   🔑 **Identidad y RBAC:** La estrategia de "Zero Trust" y Managed Identities.

---

## 📖 Glosario y Contexto
Para entender los términos de negocio (Tenants, Bounded Contexts, etc.), consulta el **Glosario Oficial**.

---

> **Nota:** Este taller se enfoca en el estado **Actual** y **Dev Objetivo**. Para conocer los retos de la fase de **Prod Propuesto**, lee las consecuencias y decisiones pendientes en el repo de arquitectura.
