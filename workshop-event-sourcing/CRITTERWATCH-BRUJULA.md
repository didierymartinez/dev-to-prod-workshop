# 🧭 El norte y el método — la continuación de §1-9

> **No hay mapa.** Antes esta brújula traía una tabla de 7 estaciones. La archivamos
> ([`_archivo/brujula-estaciones-contaminadas.md`](_archivo/brujula-estaciones-contaminadas.md)):
> estaba construida **en reversa** desde la respuesta ya conocida (Marten + el producto Critter Watch), y por eso
> convertía la 2ª mitad en un "tour". Un mapa completo, por "vivido" que se declare, es una caminata hacia atrás desde
> el destino. Aquí queda solo lo legítimo: el **norte** (la motivación) y el **método** (cómo no recaer en el tour).

## El norte (telos, no lista de features)

Construir un **monitor propio** que muestre cómo **respira** un sistema event-sourced: si los read models van al día,
cómo fluyen los hechos, qué falló y dónde. Referencia de *lo posible* (no la respuesta): **[Critter Watch](https://critterwatch.jasperfx.net/)**.
El norte es motivación —igual que §1-9 tenía "¿qué le pasó a esta empresa?"—, **no** una lista de piezas a implementar
en orden. Cada pieza aparece cuando un **dolor del alumno** la reclama, jamás antes.

## Por qué §1-9 es oro y por qué me cuesta continuarlo

§1-9 se escribió mientras el autor **no sabía el final**: cada dolor nacía del final real del anterior. Hoy conozco el
destino (Cosmos.BuildingBlocks), así que **cualquier arco completo que trace colapsa a las piezas de la librería** —por
eso el arco "ODD", el "tour" y demás terminan siendo la misma lista con otra etiqueta. La única defensa es procedimental.

## El método (la camisa de fuerza contra el tour)

- **Nunca más de UNA sección por delante.** El tema de la siguiente **solo** puede nacer del final concreto de la
  anterior, corrida de verdad. Cero tablas, cero espina.
- **No nombro la librería (Marten/Wolverine) ni Critter Watch** hasta que la **cura ingenua** del alumno choque contra
  un muro real y la reclame.
- **El dolor nace de correr código y chocar con un muro** —como en §1-9—, nunca de "quiero ver la feature X".
- **El dominio se mueve:** cuando se pueda, la Empresa gana un verbo/regla nuevo cuya **consecuencia** genera el dolor
  (dominio congelado = predictor #1 del "tour").
- **Test antifraude por sección:** *"¿este dolor se podía predecir desde la tabla de contenidos del canon borrado?"*
  Si sí → está colado, se reescribe.
- **PARAR** al final de cada sección. El próximo dolor nace de este final, no de un plan.

## Dónde arrancamos

Del **dolor residual que §9 ya dejó escrito**: *"todo vive en RAM: al reiniciar, se pierde"* y *"lo has probado
corriendo el `Main` y leyendo la consola con los ojos"*. Vivimos la siguiente sección desde ahí — cura ingenua,
correrla, chocar. Sin mapa.
