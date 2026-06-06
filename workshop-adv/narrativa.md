# Narrativa del Workshop: Cosmos Infrastructure (Visión del Autor)

Este workshop es un viaje desde la necesidad básica de red hasta una infraestructura de producción "Zero Trust". Aquí explicamos por qué cada pieza es vital para Cosmos.

---

## Fase 1: El Espacio Privado y el Cómputo Inicial

### Lab 1: La Red y el Agrupador
- **Resource Group**: Es el agrupador de recursos en Azure. Nos permite gestionar permisos, costos y, sobre todo, asegurar una destrucción limpia de recursos cuando el taller termina.
- **VNet**: Creamos una red virtual para definir rangos IP propios. Es nuestro espacio privado en la nube.
- **Subredes**: Dentro de la VNet, creamos subredes (una por cada Bounded Context). Esto permite gestionar políticas de red para que los servicios se comuniquen solo con quien deben (ej: servicios con base de datos, pero no con internet).

### Lab 2: Cómputo Básico (VM + Docker)
- **VM Linux**: Creamos una máquina virtual Linux para ejecutar nuestras aplicaciones.
- **Docker**: Instalamos Docker para correr aplicaciones en contenedores, evitando ensuciar el sistema operativo con dependencias manuales. Empezamos con un contenedor simple para entender la base.

---

## Fase 2: Orquestación y Automatización Segura

### Lab 3: Orquestación Local (Docker Swarm)
- **Docker Swarm**: Como el código de Cosmos vive en varios repositorios (OXP, Contabilidad, Radicación), necesitamos un orquestador que gestione múltiples servicios.
- **Redes Overlay**: Usamos redes virtuales internas de Docker:
  - `oxp-public`: Para los servicios que se exponen a internet.
  - `oxp-internal`: Para los servicios que solo se hablan entre sí en privado.

### Lab 4: Identidad y el Ciclo de Vida de la App (ACR + Runner + KV)
Aquí es donde conectamos todo el flujo de desarrollo:
- **Azure Container Registry (ACR)**: Cada microservicio debe tener su propia imagen. No queremos imágenes públicas en Docker Hub por seguridad, así que las guardamos en nuestro ACR privado.
- **Managed Identity**: Para que la VM pueda descargar imágenes del ACR, no usamos contraseñas. Le damos a la VM una "Identidad Gestionada" en Azure y le asignamos el permiso de `AcrPull`.
- **GitHub Runner**: No queremos que los servidores de GitHub entren a nuestra red privada. Por eso, usamos un "Runner" dentro de nuestra propia VM. Ella misma compila el código, genera la imagen y la sube al ACR.
- **Azure Key Vault**: Para registrar el Runner en GitHub necesito un token (PAT). Para no ponerlo en el código de Terraform, lo guardamos en el Key Vault. La VM tiene permiso para leerlo usando su identidad.
- **Cloud-init**: Es el script de "Día 0" que automatiza todo al crear la VM:
  1. Instala Docker y Azure CLI.
  2. Hace login en Azure con la Managed Identity.
  3. Obtiene el token del Key Vault.
  4. Registra el Runner en GitHub para que quede listo para trabajar.

---

## Fase 3: Estado, Front y Perímetro

### Lab 5: Persistencia (PostgreSQL)
- **PostgreSQL Flexible Server**: Los datos no pueden vivir dentro del contenedor porque este es efímero. Usamos un servicio PaaS para que la base de datos sea independiente y persistente.
- **Conexión Segura**: La cadena de conexión se guarda como un secreto en el Key Vault, y el Runner la inyecta en el despliegue.

### Lab 6: Frontend Inmutable (Storage Account + env.js)
- **Storage Account**: Para el frontend usamos un servicio de archivos estáticos. Es más barato y escalable que un servidor.
- **env.js**: Para que el frontend sepa a qué API llamar sin tener que recompilar el código, usamos un archivo `env.js` que se genera dinámicamente en el despliegue con los secretos del Key Vault.

### Lab 7: El Escudo Perimetral (Front Door + YARP)
- **Azure Front Door**: Es nuestro servicio de entrada global. Recibe el tráfico del usuario final.
- **YARP (Yet Another Reverse Proxy)**: Es un proxy que corre en la VM. Recibe el tráfico del Front Door y lo manda al servicio correcto de Docker Swarm.
- **Seguridad**: Sellamos el acceso a la VM para que *solo* acepte tráfico que venga del Front Door.

---

## Fase 4: Arquitectura de Planos y Hardening

### Lab 8: Separación de Planos (Control Plane vs Application Plane)
- **Control Plane**: Gestiona los tenants y la configuración de la plataforma mediante Functions y Service Bus.
- **Application Plane**: Es donde corre el día a día de las aplicaciones de los clientes (lo que construimos en los labs anteriores).
- **Escalabilidad**: Esta separación asegura que un problema en un cliente no afecte la gestión global de la plataforma.

### Lab 9: Hardening Final (Private Link)
- **Private Link**: Finalmente, para que todo sea 100% privado, eliminamos las IPs públicas de servicios como el Key Vault y la Base de Datos. Todo el tráfico viaja ahora por "túneles" privados dentro de la red de Microsoft.
