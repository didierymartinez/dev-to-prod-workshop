# Lección 1.6 — Destruir y recrear

> ⏱️ 25 minutos · 🎯 **Al terminar:** verás la mayor ventaja de la Infraestructura como Código: destruir toda tu infraestructura y recrearla **idéntica** con un comando. Y aprenderás a apagar todo para no gastar.

---

## 🤔 El problema

En el básico, si borrabas la VM por error, recrearla significaba recordar y repetir todos los comandos `az`. Y al terminar una sesión, apagar todo era manual. Con IaC, destruir y recrear es **un comando**, y el resultado es **siempre el mismo**. Vamos a comprobarlo — y de paso, esta es la forma de no gastar de más.

---

## 💡 Conceptos

### `terraform destroy`: borrar lo que administras

`terraform destroy` elimina **todos** los recursos que Terraform creó (los que están en su estado). No borra nada ajeno: solo lo que tú declaraste. Es la contraparte de `apply`.

### La reproducibilidad: la gran ventaja

Como tu infraestructura es **código versionado**, puedes destruirla con tranquilidad: cuando la necesites de nuevo, `terraform apply` la recrea exactamente igual, desde cero, en minutos. Esto es impensable con infraestructura hecha a mano.

```
   terraform destroy   →  (todo borrado, deja de gastar)
   terraform apply     →  (todo recreado, idéntico, en minutos)
```

---

## 🛠️ Manos a la obra

### Paso 1: Destruir toda la infraestructura

Desde `infra/`:

```bash
terraform destroy
```
Terraform te muestra todo lo que va a borrar y pide confirmación. Escribe `yes`. En un par de minutos, **todo** (VM, red, IP, firewall, grupo de recursos) desaparece.

### Paso 2: Comprobar que se borró

```bash
az group show --name rg-gestion-empresas --output table
```
Debe responder que el grupo **no existe** (lo borraste). Ya no estás gastando nada.

### Paso 3: Recrear todo, idéntico

```bash
terraform apply
```
Escribe `yes`. Terraform vuelve a crear toda la infraestructura desde tu código — la misma de antes, con la misma estructura. En minutos tienes tu servidor de vuelta, y el output `ip_publica` con su (nueva) dirección.

> 🧠 **Esto es el corazón de IaC.** Tu infraestructura ya no es algo frágil que armaste una vez y temes tocar: es código que puedes destruir y recrear cuantas veces quieras, siempre con el mismo resultado. Reproducible de verdad.

### Paso 4: El hábito de ahorrar

Cada vez que termines una sesión de trabajo, destruye lo que no necesites encendido:

```bash
terraform destroy   # al terminar el día → no gastas de noche
terraform apply     # al retomar → todo de vuelta en minutos
```

Como todo es código, no pierdes nada al destruir: lo recreas idéntico cuando vuelvas.

### Paso 5: Versionar el avance final

Tu infraestructura completa vive ahora en `infra/`. Asegúrate de tenerla en Git:

```bash
cd ..
git add infra/
git commit -m "completar infraestructura como codigo de la VM y su red"
git push
```

> 🧠 Cualquier compañero puede ahora clonar el repositorio, ejecutar `terraform apply` y obtener **exactamente** tu misma infraestructura. Eso es lo que antes era imposible con comandos a mano.

---

## ✅ Compruébalo

- [ ] `terraform destroy` borró toda la infraestructura.
- [ ] `az group show` confirmó que el grupo ya no existe.
- [ ] `terraform apply` la recreó idéntica, con su IP pública.
- [ ] El contenido de `infra/` está en Git (cualquiera puede recrear tu infraestructura).

---

## 🧠 Lo que aprendiste

- `terraform destroy` borra todo lo que Terraform administra; `apply` lo recrea idéntico.
- La **reproducibilidad** es la gran ventaja de IaC: destruir y recrear sin miedo, siempre igual.
- Destruir al terminar la sesión es la forma de **no gastar** (y recrear toma minutos).
- Con el código en Git, cualquiera reproduce tu infraestructura exacta.

---

## 🆘 Si algo salió mal

**`destroy` falla o deja recursos.**
Reintenta `terraform destroy`. Si un recurso quedó "colgado", bórralo desde el portal o con `az group delete --name rg-gestion-empresas --yes`, y luego `terraform apply` para volver a un estado limpio.

**Tras recrear, la IP pública cambió.**
Es normal: al recrear la IP, Azure asigna una nueva. Por eso usamos el output `ip_publica` y `terraform output -raw ip_publica` en vez de memorizarla.

---

## 🏁 Cierre de la Fase 1

Tu infraestructura dejó de ser un conjunto de comandos sueltos y pasó a ser **código versionado, reproducible y revisable**. Puedes crearla, cambiarla y destruirla con confianza, y cualquiera puede reproducirla.

Pero por ahora es **una sola máquina**, lista y todavía vacía (declaraste la infraestructura, aún no desplegaste la app encima). Cuando lo hagas, correría en un único host — sin réplicas y sin recuperación automática. Es hora del siguiente salto: montar un **clúster** que reparta la app en varios nodos, escale y se recupere solo.

---

**➡️ Siguiente fase:** [Fase 2 — Orquestación con Docker Swarm](../02-orquestacion-swarm/README.md)
