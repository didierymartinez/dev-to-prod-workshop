# Lección 7.1 — ¿Por qué pruebas automáticas?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás qué es una prueba automática y por qué te deja cambiar el código con confianza. Lección de **conceptos**.

---

## 🤔 El problema

Tu aplicación crece. Cada vez que agregas algo o corriges un error, podrías —sin darte cuenta— romper algo que **ya funcionaba**. ¿Cómo te aseguras de que no pasó?

La forma manual: abrir Postman o el frontend y probar todo otra vez, a mano, cada vez. Es lento, aburrido, y tarde o temprano se te olvida revisar algún caso. En un proyecto real, con decenas de funciones, es imposible.

La forma profesional: que **el computador** verifique tu código por ti, en segundos, siempre revisando lo mismo sin olvidar nada. Eso es una **prueba automática**.

---

## 💡 Conceptos

### Qué es una prueba automática

Una **prueba** (o *test*) es un pequeño programa que **comprueba** que otra parte de tu código hace lo que debe. Le das una situación conocida, ejecutas tu código y verificas que el resultado sea el esperado.

Ejemplo en palabras, para tu sistema de empresas:

> *"Si le pido al repositorio la empresa con NIT `000` (que no existe), entonces debe devolver **nada**."*

Si tu código cumple esa afirmación, la prueba pasa (✅ **verde**). Si no, falla (❌ **rojo**) y te dice exactamente qué esperaba y qué obtuvo.

### La estructura de toda prueba: Preparar → Actuar → Verificar

Casi toda prueba sigue tres pasos:

| Paso | Qué haces | En el ejemplo |
|---|---|---|
| **Preparar** | Montas la situación | Creas un repositorio de empresas |
| **Actuar** | Ejecutas lo que quieres probar | Pides la empresa con NIT `000` |
| **Verificar** | Confirmas el resultado esperado | Compruebas que devolvió "nada" |

### Por qué valen tanto

- **Red de seguridad:** te avisan si rompiste algo que funcionaba, **al instante**.
- **Confianza para cambiar:** puedes mejorar el código sin miedo, porque las pruebas te cubren.
- **Documentan el comportamiento:** una prueba dice, en código, qué se espera que haga el sistema.
- **Base de la automatización:** en la próxima lección verás que las pruebas cobran su máximo valor cuando se ejecutan **solas** en cada cambio (eso es el CI).

### Qué vamos a probar (y por qué así)

Probaremos la **lógica del repositorio** de empresas — obtener, buscar, crear, eliminar — usando la versión **en memoria**. ¿Por qué la de memoria y no la de base de datos? Porque las pruebas deben ser **rápidas y aisladas**: no queremos que dependan de tener PostgreSQL encendido. Como ambas versiones cumplen el mismo contrato (`IEmpresaRepositorio`, de la Fase 6), probar la lógica con la de memoria es rápido y suficiente para aprender.

> 🧠 Existe un nivel más, las **pruebas de integración**, que arrancan toda la API y prueban los endpoints HTTP de punta a punta. Son muy útiles, pero más avanzadas; las conocerás cuando profundices. Para entender el concepto y montar tu primer pipeline, empezamos por lo esencial.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué es una prueba automática y qué ventaja tiene sobre probar a mano?
- [ ] ¿Cuáles son los tres pasos de casi toda prueba?
- [ ] ¿Por qué probaremos la versión en memoria del repositorio?

---

## 🧠 Lo que aprendiste

- Una **prueba automática** es código que verifica que tu código hace lo correcto; pasa (verde) o falla (rojo).
- Sigue tres pasos: **Preparar → Actuar → Verificar**.
- Te da una **red de seguridad** y confianza para cambiar el código.
- Su máximo valor llega cuando se ejecutan solas en cada cambio (**CI**, próxima lección).

---

**➡️ Siguiente:** [Tu primera prueba](02-tu-primera-prueba.md)
