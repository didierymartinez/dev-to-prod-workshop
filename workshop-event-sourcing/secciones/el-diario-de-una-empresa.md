# El diario de una empresa

Bienvenido. En este taller no vamos a construir una base de datos tradicional. Vamos a construir un **diario**.

## 🎯 El Objetivo

Imagina que quieres conocer de verdad a una empresa cliente —"Constructora Andes"— y tienes dos opciones:

1. Mirar su **foto de hoy**: una ficha que dice *plan Premium, estado Suspendida*.
2. Leer su **diario**: todo lo que le ha pasado desde que se registró hasta hoy.

Tu jefe entra y pregunta: *"¿cómo llegó esta empresa a estar suspendida?"*. La foto se encoge de hombros. Para responder, necesitas el diario.

En el software solemos guardar la **foto** (el estado actual, en una fila). En este taller aprenderemos a guardar el **diario**.

---

## 1. El problema de la foto

En el taller básico, "Constructora Andes" era una fila que **se sobrescribía**:

| Id | Nombre | Plan | Estado |
|----|--------|------|--------|
| 7  | Constructora Andes | Premium | Suspendida |

Cuando subió de plan, hiciste `UPDATE … SET Plan='Premium'`. Cuando dejó de pagar, otro `UPDATE … SET Estado='Suspendida'`. Cada `UPDATE` hizo su trabajo… y de paso **borró lo que había antes**. Un `UPDATE` es un borrón y cuenta nueva — literal.

Hoy tu jefe pregunta tres cosas y tu base de datos responde a las tres lo mismo: **"ni idea"**.
- ¿Desde cuándo es Premium?
- ¿Por qué está suspendida?
- ¿Cuántas veces la hemos reactivado?

Tu empresa tiene **amnesia**. Guardaste el presente y, al hacerlo, perdiste el pasado.

## 2. La solución: el diario

En lugar de sobrescribir el estado, vamos a **anotar cada cosa que pasa**, como en un diario:

- *Empresa registrada — plan Básico.*
- *Cambió a plan Premium.*
- *Suspendida — motivo: falta de pago.*

Mira lo que cambió: **no perdiste nada**. ¿El estado de hoy? Lo lees de corrido y llegas solo a "Premium, suspendida". Pero además conservas el **pasado**: desde cuándo, por qué, cuántas veces.

La foto siempre la puedes **reconstruir** leyendo el diario. El diario, en cambio, una vez lo tiras no vuelve. Por eso conviene guardar el diario, no la foto.

### El Descubrimiento

A esta forma de diseñar sistemas —donde la **fuente de la verdad** no es la foto del presente, sino la secuencia de todos los **hechos** del pasado— la industria la llama **Event Sourcing**. Y cada renglón del diario tiene un nombre: un **evento**.

Eso es todo el secreto. El resto del taller es construirlo bien… y lo vas a construir tú, no a leerlo.

> 🌱 **Semillas.** De aquí en adelante verás cajas como esta, marcadas con 🌱. Son adelantos cortos de ideas que **acabas de rozar**, con su nombre técnico correcto, plantadas **antes** de su explicación a fondo. No tienes que dominarlas al verlas: solo *anclar la idea y el nombre*. Cuando reaparezcan a fondo (🌳), ya tendrás de dónde colgarlas. Es lo contrario de amontonar toda la teoría difícil al final.

---

## ✅ Compruébalo

Sin código todavía — solo asegúrate de que la intuición quedó:

- [ ] ¿Qué información, exactamente, **destruye** un `UPDATE` que el diario conservaría?
- [ ] Con el diario de hechos, ¿cómo sabrías el estado de la empresa **el mes pasado**?
- [ ] Di una pregunta del negocio que la foto **no** puede responder y el diario **sí**.

---

## 📓 Registra tu avance (empieza tu bitácora)

Vas a llevar tu progreso en **Git/GitHub**: cada sección cierra con un commit, y el **mensaje es tu repaso** — el 2.º `-m` trae una pregunta (o un reto); **respóndela con tus palabras**. Así tu repo queda como bitácora de lo aprendido. Arranca tu repo:

```bash
git init
git commit --allow-empty -m "ES · El diario de una empresa" \
  -m "Con mis palabras: ¿qué información destruye un UPDATE que el diario sí conserva? Da una pregunta del negocio que la foto no responde."
# crea el repo vacío en GitHub y enlázalo (cambia la URL por la tuya):
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

---

## 🧠 En una frase

Guardar el **diario** de hechos (eventos), en vez de la **foto** del estado, conserva toda la historia: el estado de hoy se **reconstruye**, pero el pasado ya no se pierde. Eso es **Event Sourcing**.

---

[➡️ Siguiente sección: Los primeros hechos](./los-primeros-hechos.md)
