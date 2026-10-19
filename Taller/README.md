# Taller · la presentación

Las láminas que proyectas al dirigir el taller de Event Sourcing. Salen de la guía del facilitador, [`workshop-event-sourcing/taller.md`](../workshop-event-sourcing/taller.md), no de las secciones: lo que la guía te pide decir o dictar es aquí lo que el grupo ve en pantalla.

Están las **70 secciones** del taller, unas 820 láminas.

## Presentar en vivo

```bash
npm install
npm run presentar
```

Abre `http://localhost:5640` y pulsa **F** para pantalla completa.

| Tecla | Hace |
|---|---|
| → · espacio · AvPág · clic | Siguiente golpe, con su animación |
| ← · RePág | Golpe anterior |
| 1 a 9 | Inicio de esa sección |
| Inicio · Fin | Primera y última lámina |
| F | Pantalla completa |
| H | Muestra u oculta la ayuda |

Un **golpe** es lo que aparece con cada pulsación. En el problema, la pregunta y luego cada parte del dolor; una pantalla de reto aparece entera, para dejarla a la vista mientras trabajan. La presentación se detiene al terminar cada golpe y espera la siguiente pulsación. Un control remoto de presentaciones funciona igual, porque manda AvPág y RePág. La dirección guarda la posición (`#12`): si recargas la página, sigues donde ibas.

## Cada sección, en pocas láminas

La presentación es para que el grupo se guíe mientras trabaja, no la guía pasada a láminas. Lo que es solo para ti (qué decir, «Si se traban», los tiempos) se queda en `taller.md`.

| Lámina | Qué muestra | Sale de la guía |
|---|---|---|
| Portada | número, título y para qué | el título y el **Para qué** |
| 💥 El problema | la pregunta y el dolor, revelados de a uno | **Abre así** y **Haz sentir el dolor** |
| 🛠️ Reto | **una pantalla por reto**, a la vista mientras trabajan: *Tu tarea* (qué hay que lograr, en una o dos frases), *Haz esto* (los pasos que la detallan), *Lo logras cuando* (la salida que deben ver y las comprobaciones) y *Tips* (lo nuevo de C#, una pista, un ejemplo de código) | **Dicta los pasos**, las piezas 🆕 y el **Punto de control** |
| 🛠️ Código | el código que deben copiar, a todo lo ancho, cuando un reto o un 🔨 lo necesita | lo que la guía te pide mostrar en pantalla |
| 👉 Una forma de hacerlo | después de cada reto: cómo queda el resultado, por piezas y con dónde va cada una. Pasas a ella cuando el grupo ya lo intentó | el `<details>` «Muéstrame una forma de hacerlo» de la sección |
| 🔨 Rómpelo | igual que un reto | **Rómpelo** |
| 🧠 Lo que te llevas | la idea, los nombres que aprendieron, la línea de `DECISIONES.md`, el commit con la pregunta de su reflexión y lo que viene | **Cierra con**, los «Nombra:» y el **Puente** |

Una pantalla de reto tiene que caber entera: hasta 3 pasos cortos, hasta 2 tips y un solo bloque de código. Si se pasa por poco (también el problema, el código y lo que te llevas), se reduce sola hasta el 88 %; si ni así cabe, `npm run fotos` avisa con `[taller] … no cabe`, y son dos retos.

**Cada instrucción se entiende sola**, porque el grupo no lee la sección: dice qué se hace, dónde va (qué archivo, arriba o al final) y para qué. Nada de «restaura el `.bak`» sin haber dicho qué es ese archivo, ni «el que te muestro» sin mostrarlo.

Terminología: *replay* se dice **rehidratar**, nunca «rejugar».

## Revisar y renderizar

```bash
npm run dev                   # Remotion Studio en http://localhost:3456
npm run fotos                 # una foto de cada lámina, en out/fotos/ (npm run fotos -- 12 15: solo esas)
npm run render:seccion-01     # la sección 1 como video, en out/
npm run render:taller         # todas las secciones en un solo video
```

El video corre solo: cada golpe se queda en pantalla el tiempo de leerlo.

## Agregar una sección

1. Crea `src/contenido/seccion-NN.ts` a partir de la entrada de esa sección en `taller.md`, con la misma forma que `seccion-03.ts`: portada, problema, una pantalla por reto y lo que te llevas. Los tipos están en `src/contenido/tipos.ts`.
2. Súmala a la lista de `src/contenido/index.ts`.
3. Corre `npm run fotos -- NN` y `python3 scripts/hoja.py NN`, y revisa en `out/hoja-seccion-NN.png` que nada toque el pie. Si algo no cabe, pártelo en dos láminas; no achiques la letra.

En los textos, `así` se ve como código y **así** se ve en negrita.

## Cómo está hecho

- `src/contenido/`: el contenido, como datos. Una sección es una lista de láminas: portada, problema (con bloques: texto, respuesta, lista, tabla, diario, cajas de clase), reto (pasos, logro, tips, ejemplo) y lo que te llevas.
- `src/tiempos.ts`: calcula los golpes de cada lámina, cuánto dura en el video y dónde se detiene la presentación.
- `src/vista/`: cómo se ve cada bloque y cada lámina, en 1920×1080 y con letra para proyector.
- `presentador/`: la página del modo presentación. Usa `@remotion/player` y la sirve esbuild (`presentador/servir.mjs`).
