# Lección 8.2 — Hacia dónde seguir

> ⏱️ 25 minutos · 🎯 **Al terminar:** conocerás los caminos naturales para seguir creciendo (Kubernetes, SRE, platform engineering, GitOps), verás cómo este taller te prepara para el avanzado, y dejarás **todo limpio** en Azure para no gastar.

---

## 🧭 Hacia dónde seguir

Este taller te dio la **mecánica** de operar software. Estos son los caminos para profundizar — y en todos parte de algo que ya tocaste:

- **Kubernetes (K8s).** El orquestador estándar de la industria. Todo lo que aprendiste en Swarm —servicios, réplicas, self-healing, rolling updates, secretos, redes— existe en Kubernetes, con más poder y más complejidad. Swarm te dio los **conceptos**; K8s es el siguiente escalón cuando necesitas ese poder.
- **SRE (Site Reliability Engineering).** La disciplina de la confiabilidad: definir objetivos medibles (**SLO/SLI**), presupuestos de error, *postmortems* sin culpa. Es el "para qué" de la observabilidad que montaste en la Fase 5.
- **Platform Engineering.** Construir **plataformas internas** (*golden paths*) para que los desarrolladores se autoatiendan: que pedir un entorno o desplegar sea un botón, no un favor. Es la evolución natural de los workflows reutilizables de la Fase 6.
- **GitOps.** Que el **estado deseado** del sistema viva en Git y un agente (ArgoCD, Flux) lo **reconcilie** solo. Es el paso de "el pipeline empuja (*push*) el despliegue" a "el clúster jala (*pull*) lo que dice Git".
- **IaC avanzado.** Estado **remoto** compartido por el equipo, **módulos** reutilizables, y **políticas** que validan la infraestructura antes de aplicarla (OPA/Sentinel). Es Terraform llevado al trabajo en equipo.

> 🧠 Ninguno te será ajeno: este taller te dio el **mapa mental** (orquestación, IaC, observabilidad, CD, seguridad). Elige el que más te interese y profundiza — ya sabes dónde encaja.

---

## 🌉 El puente al taller avanzado

Si sigues por la ruta de arquitectura, el **taller avanzado** aplica todo lo que aprendiste a un sistema real (el dominio Cosmos): multi-plano, gateway con YARP, mensajería con Service Bus, redes privadas con Private Link, un *Control Plane*. La diferencia clave: **ya no tendrás que aprender la mecánica**. Sabes Terraform, orquestación, Key Vault, managed identity, CD y observabilidad; en el avanzado solo aprenderás lo **específico de esa arquitectura**.

Para ver el currículo completo y elegir tu ruta, vuelve al [índice de la academia](../../README.md).

---

## 🧹 Limpieza final (¡importante para no gastar!)

Tienes **dos entornos** en Azure (staging y prod). Destrúyelos los dos. Como cada uno vive en su propio workspace y grupo de recursos, Terraform los borra completos:

```bash
cd infra

terraform workspace select staging
terraform destroy -var-file=staging.tfvars

terraform workspace select prod
terraform destroy -var-file=prod.tfvars
```

Verifica que no queda nada cobrando:

```bash
az group list -o table        # no deben aparecer rg-gestion-empresas-staging ni -prod
```

> 🧠 Si destruiste antes con `terraform destroy` pero quieres asegurarte, `az group list` es la fuente de verdad: si los grupos no están, no hay nada gastando. Los **workspaces** se conservan (vacíos), listos para recrear con `terraform apply` cuando vuelvas.

> 💡 Tu **código** sigue a salvo en GitHub (lo subiste en cada lección): Terraform, `stack.yml`, los workflows, la configuración de observabilidad. Borrar la infraestructura no borra tu trabajo — la recreas en minutos.

---

## ✅ Compruébalo

- [ ] `terraform destroy` corrió en **ambos** workspaces (staging y prod).
- [ ] `az group list` ya **no** muestra los grupos de recursos del taller.
- [ ] Entiendes que tu código (en GitHub) sobrevive a la limpieza y puedes recrear todo con `terraform apply`.

---

## 🧠 Lo que aprendiste

- Los caminos de crecimiento parten de lo que ya tocaste: **Kubernetes** (orquestación), **SRE** (confiabilidad), **platform engineering** (autoservicio), **GitOps** (reconciliación desde Git), **IaC avanzado**.
- El **taller avanzado** aplica esta mecánica a una arquitectura concreta; tú llegas sabiendo ya el "cómo".
- La **limpieza** con `terraform destroy` en cada workspace evita gastos; tu código en GitHub no se pierde.

---

## 🏆 Felicitaciones

Pasaste de *desplegar* una aplicación a *operarla* como un equipo profesional: infraestructura como código, orquestación, despliegues sin caídas, secretos gestionados, observabilidad, entornos con promoción y seguridad en el pipeline. Y lo hiciste **entendiendo cada pieza**, no copiando comandos.

Esa es la diferencia entre "sé usar una herramienta" y "sé operar un sistema". **Sigue construyendo.**

---

**🔚 Fin del taller DevOps.** Repasa el [índice del taller](../README.md) o vuelve a la [academia](../../README.md) para elegir tu siguiente paso.
