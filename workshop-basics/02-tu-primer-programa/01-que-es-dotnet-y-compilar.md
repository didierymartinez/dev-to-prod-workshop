# Lección 2.1 — ¿Qué es .NET y qué es compilar?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es .NET, la diferencia entre el código que escribes y lo que la máquina ejecuta, y por qué eso importa. Lección de **conceptos**, sin escribir programas todavía.

---

## 🤔 El problema

Vas a escribir tu primer programa en la próxima lección. Antes de teclear comandos como `dotnet run` sin saber qué hacen, vale la pena entender qué es la plataforma que usarás y qué ocurre cuando "ejecutas" un programa. Cinco minutos de concepto evitan mucha confusión después.

---

## 💡 Conceptos

### El computador no entiende C# directamente

Tú escribes código en un lenguaje pensado para **humanos** (C#), con palabras como `if`, `for`, nombres descriptivos. Pero el procesador del computador solo entiende **instrucciones binarias** (ceros y unos). Hace falta un traductor en el medio. Ese paso de traducción se llama **compilar**.

```
Tú escribes        →   Compilar    →   El computador
código C#               (traducir)      lo ejecuta
(para humanos)                          (instrucciones que entiende)
```

- **Compilar** = traducir tu código a algo que la máquina puede ejecutar, revisando de paso que no tengas errores de escritura.
- **Ejecutar** = correr ese resultado para que el programa haga su trabajo.

> 🧠 Esta distinción es clave para entender fases posteriores. Por ejemplo, en el servidor (Fase 9) **compilaremos** una vez y luego solo **ejecutaremos** el resultado, muchas veces.

### ¿Qué es .NET?

**.NET** es una plataforma de Microsoft para crear y ejecutar programas escritos en C# (y otros lenguajes). Te da dos cosas:

- Las **herramientas** para compilar y ejecutar tu código (el comando `dotnet`).
- Una enorme **biblioteca** de funciones ya hechas (leer archivos, manejar texto, conectarse a internet…) para que no reinventes la rueda.

### SDK vs Runtime (importante al instalar)

Verás estos dos términos:

| | Qué incluye | Para qué |
|---|---|---|
| **SDK** (Software Development Kit) | Todo: compilador + herramientas + biblioteca | **Crear** programas (lo que tú necesitas) |
| **Runtime** | Solo lo necesario para ejecutar | **Correr** un programa ya hecho |

Como vas a *crear* programas, necesitas el **SDK**. En la próxima lección lo instalamos y verificamos. (Más adelante, en el servidor, usaremos solo el Runtime — porque allí solo se ejecuta.)

### ¿Qué es una "aplicación de consola"?

Es el tipo de programa más simple: corre en la terminal, sin ventanas ni botones. Lee texto y escribe texto. Es perfecto para empezar, porque nos deja concentrarnos en la lógica sin distraernos con interfaces. Más adelante (Fase 4) convertiremos la lógica en algo que otros programas puedan usar, y (Fase 5) le pondremos una página web.

---

## ✅ Compruébalo

Responde con tus propias palabras:

- [ ] ¿Qué diferencia hay entre *compilar* y *ejecutar*?
- [ ] ¿Por qué necesitas el **SDK** de .NET y no solo el Runtime?
- [ ] ¿Qué es una aplicación de consola?

---

## 🧠 Lo que aprendiste

- El computador no entiende C# directamente: hay que **compilar** (traducir) y luego **ejecutar**.
- **.NET** es la plataforma que da las herramientas y la biblioteca para programar en C#.
- Necesitas el **SDK** (para crear), no solo el Runtime (para ejecutar).

---

**➡️ Siguiente:** [Tu primera aplicación de consola](02-tu-primera-app-de-consola.md)
