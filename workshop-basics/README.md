# Taller: El Ciclo de Vida del Software Moderno

Una guía práctica, paso a paso, para pasar de *"copio archivos al servidor y rezo"* a construir, probar y desplegar una aplicación profesional como se hace hoy en la industria.

---

**No damos por sabido nada de desarrollo.** Cada herramienta y cada concepto — qué es .NET, qué es Git, qué es HTTP, qué es Docker — se explica antes de usarse. Si entiendes qué es un archivo, una carpeta y cómo abrir una terminal, puedes hacer este taller.

---

## ¿Qué vas a construir?

Vas a construir, de principio a fin, un **sistema de gestión de empresas clientes**: el tipo de aplicación que existe en cualquier empresa de software para administrar a las organizaciones que contratan sus servicios. Empezarás con un programa de consola de pocas líneas y terminarás con una aplicación web completa, con base de datos, desplegada en servidores reales y que se actualiza sola cuando subes código.

No es un proyecto de juguete: cada pieza que agregues resuelve un problema real, en el mismo orden en que aparecen en el trabajo de verdad.

---

## ¿Por qué este taller existe? El problema

Hoy, mucha gente trabaja así:

```
1. Escribo código en mi máquina
2. Funciona "en mi máquina"
3. Copio los archivos al servidor (a mano)
4. Espero que funcione igual
5. Si falla, vuelvo al paso 3
```

Este flujo no tiene memoria (¿qué cambió y cuándo?), no es reproducible (*"en mi máquina sí servía"*) y depende de que alguien lo haga a mano cada vez. Al terminar este taller, tu flujo será:

```
1. Escribo código y lo subo a GitHub
2. Las pruebas se ejecutan solas y avisan si algo se rompió
3. La aplicación se actualiza sola en el servidor
```

---

## Cómo está organizado

El taller está dividido en **fases**. Cada fase es una carpeta con **lecciones cortas** (20 a 40 minutos cada una). Haz una lección, compruébala, y sigue con la siguiente. No saltes: cada lección se apoya en la anterior.

Cada lección tiene siempre la misma estructura:

| Sección | Para qué |
|---|---|
| 🤔 **El problema** | Por qué vale la pena aprender esto (qué duele sin ello) |
| 💡 **Conceptos** | Las ideas nuevas, explicadas con palabras simples |
| 🛠️ **Manos a la obra** | Los pasos, cada uno diciendo *qué* haces y *por qué* |
| ✅ **Compruébalo** | Cómo saber, por ti mismo, que lo lograste |
| 🧠 **Lo que aprendiste** | Resumen de lo esencial |
| 🆘 **Si algo salió mal** | Los errores más comunes y cómo resolverlos |

> El objetivo nunca es "copia y pega". Aunque a veces escribirás código que se explica solo, siempre sabrás **qué hace** y **cómo comprobar** que funciona.

---

## El mapa: las fases

| Fase | Carpeta | Lo que logras | Concepto central |
|---|---|---|---|
| **0** | `00-preparacion/` | Dejar el entorno listo y verificado | Tus herramientas de trabajo |
| **1** | `01-codigo-e-historia/` | Versionar tu trabajo con memoria | Git y GitHub |
| **2** | `02-tu-primer-programa/` | Escribir y compilar un programa | .NET y lógica básica |
| **3** | `03-como-se-comunican-http/` | Entender cómo hablan los programas | HTTP, cliente-servidor |
| **4** | `04-construir-tu-api/` | Crear tu propio servicio de datos | API REST |
| **5** | `05-la-cara-visible/` | Mostrar los datos en una página | HTML + consumo de API |
| **6** | `06-datos-que-perduran/` | Guardar datos que no se pierden | Base de datos |
| **7** | `07-pruebas-y-ci/` | Que las pruebas corran solas | Pruebas + Integración Continua |
| **8** | `08-empaquetar-docker/` | Empacar la app para que corra igual en todos lados | Docker |
| **9** | `09-el-servidor-real/` | Poner la app en un servidor de verdad | Nube, SSH, despliegue |
| **10** | `10-despliegue-automatico/` | Que el despliegue ocurra solo | Despliegue Continuo (CD) |
| **11** | `11-arquitectura-real/` | Separar y proteger las piezas | Redes privadas y gateway |

> 🧭 **Sobre el orden:** primero harás las cosas **a mano** para entender qué pasa por dentro (Fase 9). Solo después las automatizarás (Fases 7 y 10). Se aprende mejor sintiendo el trabajo manual antes de automatizarlo.

---

## Antes de empezar

No instales nada todavía. La **Fase 0** te guía para instalar y verificar cada herramienta, según tu sistema operativo (Windows, macOS o Linux).

**➡️ Empieza en:** [`00-preparacion/`](00-preparacion/README.md)
