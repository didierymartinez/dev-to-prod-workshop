# Lección 1.1 — El problema de hacerlo a mano

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es la Infraestructura como Código, en qué se diferencia de los comandos sueltos que usaste en el básico, y por qué los equipos profesionales no crean servidores a mano. Lección de **conceptos**.

---

## 🤔 El problema

En el básico, para tener tu servidor, escribiste algo así en la terminal:

```bash
az group create --name rg-gestion-empresas --location eastus
az vm create --resource-group rg-gestion-empresas --name vm-app ...
az vm open-port --resource-group rg-gestion-empresas --name vm-app --port 5000
```

Funcionó. Pero hazte estas preguntas, que son las que te haría un equipo serio:

- Dentro de seis meses, ¿podrías recrear **exactamente** esa infraestructura? ¿Recuerdas todos los comandos, en orden, con los mismos valores?
- ¿Dónde está **documentado** qué servidores existen y cómo están configurados? (En tu memoria y en el historial de la terminal… que se borra.)
- Si un compañero entra al portal de Azure y **cambia algo a mano**, ¿cómo te enteras?
- Si necesitas un entorno **idéntico** para pruebas, ¿copias y pegas los comandos y rezas?

Crear infraestructura a mano no es reproducible, no queda documentado y se desincroniza fácilmente. Hay una forma mejor.

---

## 💡 Conceptos

### Infraestructura como Código (IaC)

**Infraestructura como Código** significa describir tu infraestructura —servidores, redes, puertos— en **archivos de texto**, que guardas en Git junto a tu código. Una herramienta lee esos archivos y se encarga de crear, cambiar o destruir los recursos para que coincidan con lo que escribiste.

Tu servidor deja de ser "algo que armaste una vez" y pasa a ser **un archivo versionado** que cualquiera puede leer, revisar y volver a aplicar.

### Declarativo, no imperativo

Esta es la diferencia clave con los comandos `az` del básico:

| | Imperativo (los comandos `az`) | Declarativo (Terraform) |
|---|---|---|
| Tú dices… | los **pasos**: "crea esto, luego abre aquello" | el **resultado deseado**: "quiero una VM así, con este puerto" |
| Quién calcula el cómo | tú, comando por comando | la herramienta |
| Si lo ejecutas dos veces | puede fallar o duplicar | no pasa nada: ya está en el estado deseado |

Con Terraform describes **el estado final que quieres**, y él calcula qué crear, cambiar o borrar para llegar ahí.

### Por qué los equipos lo usan

- **Reproducible:** el mismo archivo crea la misma infraestructura, siempre, en minutos.
- **Versionado:** vive en Git. Ves su historia, lo revisas en Pull Requests, vuelves atrás si algo sale mal — igual que el código.
- **Sin sorpresas (sin *drift*):** si alguien cambió algo a mano, la herramienta lo detecta y te lo muestra.
- **Múltiples entornos:** el mismo código, con distintos parámetros, crea un staging idéntico al de producción (lo harás en la Fase 6).
- **Documentación viva:** el archivo **es** la descripción exacta de tu infraestructura.

### Terraform

**Terraform** (de HashiCorp) es la herramienta de IaC más usada. Funciona con muchas nubes (Azure, AWS, Google…) con el mismo lenguaje, por eso es un estándar de la industria. Lo usaremos para recrear —ahora como código— la infraestructura que en el básico armaste a mano.

> 🧠 **Analogía:** crear infra a mano es como armar un mueble de memoria cada vez, esperando que quede igual. IaC es tener **los planos exactos**: cualquiera los sigue y obtiene el mismo resultado, siempre.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué es la Infraestructura como Código?
- [ ] ¿Cuál es la diferencia entre "imperativo" (los comandos `az`) y "declarativo" (Terraform)?
- [ ] Nombra dos problemas de crear infraestructura a mano que IaC resuelve.

---

## 🧠 Lo que aprendiste

- **IaC** describe la infraestructura en archivos versionados que una herramienta aplica.
- Terraform es **declarativo**: describes el resultado deseado, no los pasos.
- Beneficios: reproducible, versionado, sin *drift*, múltiples entornos, documentación viva.
- **Terraform** es el estándar multi-nube; lo usaremos para recrear tu infraestructura como código.

---

**➡️ Siguiente:** [Tu primer Terraform](02-tu-primer-terraform.md)
