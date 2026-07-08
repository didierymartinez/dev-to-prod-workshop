# Lección 8.1 — Imágenes y contenedores a fondo

> ⏱️ 25 minutos · 🎯 **Al terminar:** entenderás de verdad qué es una imagen, qué es un contenedor y por qué Docker acaba con el *"en mi máquina funciona"*. Lección de **conceptos**.

---

## 🤔 El problema

Recuerda la Fase 5: tu aplicación funcionaba en tu máquina. Pero para que funcione en un servidor, este necesita la versión correcta de .NET, las dependencias correctas, la configuración correcta… y si algo difiere, se rompe. Es la causa #1 de despliegues fallidos.

Docker resuelve esto empaquetando tu app **junto con todo lo que necesita** en una unidad que corre igual en cualquier parte. Ya lo viste de lejos con PostgreSQL; ahora lo entenderás a fondo para aplicarlo a tu propia app.

---

## 💡 Conceptos

### Imagen y contenedor (repaso con más profundidad)

- Una **imagen** es una "caja sellada": tu aplicación + su runtime (.NET) + sus dependencias + su configuración de arranque. Es una plantilla inmutable.
- Un **contenedor** es una imagen **en ejecución**. De una imagen puedes lanzar muchos contenedores idénticos.

```
   Dockerfile  ──(docker build)──►  Imagen  ──(docker run)──►  Contenedor(es)
   (la receta)                      (la caja)                  (la caja corriendo)
```

### Por qué esto mata el "en mi máquina funciona"

Como la imagen incluye **todo** lo necesario, no depende de lo que esté instalado en el servidor. El servidor solo necesita Docker. La misma imagen corre igual en tu portátil, en el de un compañero y en la nube.

```
        Tu portátil          Servidor del cliente         La nube
            │                        │                       │
        [Docker]                 [Docker]                 [Docker]
            │                        │                       │
   ┌────────▼────────┐     ┌─────────▼───────┐     ┌─────────▼───────┐
   │  misma imagen   │     │  misma imagen   │     │  misma imagen   │
   │  → mismo resultado    │  → mismo resultado    │  → mismo resultado
   └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Las imágenes se construyen en capas

Una imagen se arma por **capas**: cada instrucción de la receta (el Dockerfile) añade una capa. Docker **reutiliza** las capas que no cambiaron (caché), por eso reconstruir es rápido si solo cambió tu código. No necesitas dominar esto ahora, pero explica por qué a veces `docker build` tarda y otras es instantáneo.

### Un contenedor es ligero y efímero

A diferencia de una máquina virtual completa, un contenedor es **ligero** (arranca en segundos) y **efímero**: cuando se borra, desaparece su contenido. Por eso, los **datos** que deben sobrevivir no se guardan dentro del contenedor, sino en **volúmenes** (lo verás en la lección 8.3) o en un servicio aparte. Es el mismo principio de la Fase 6: separar lo efímero (la app) de lo persistente (los datos).

### Registros: dónde viven las imágenes

Una imagen se puede **publicar** en un **registro** (un almacén de imágenes en internet) para que otros —o un servidor— la **descarguen**. Los más conocidos son Docker Hub y **GitHub Container Registry (GHCR)**. Lo usarás en la Fase 10 para que tu servidor descargue tu imagen automáticamente. Por ahora, solo retén la idea: *imagen → registro → cualquiera la baja y la ejecuta*.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Cuál es la diferencia entre una **imagen** y un **contenedor**?
- [ ] ¿Por qué una imagen corre igual en cualquier máquina con Docker?
- [ ] ¿Dónde deben vivir los datos que no quieres perder, y por qué no dentro del contenedor?

> 🚦 **Cómo te fue:** 🟢 lo entendí y puedo explicarlo · 🟡 me costó · 🔴 no me alcanzó.

---

## 🧠 Lo que aprendiste

- Una **imagen** empaqueta tu app + runtime + dependencias; un **contenedor** es esa imagen ejecutándose.
- Como la imagen lleva todo, corre **idéntica** en cualquier lugar con Docker: fin del *"en mi máquina funciona"*.
- Los contenedores son ligeros y **efímeros**; los datos persistentes van en **volúmenes** o servicios aparte.
- Las imágenes se publican en **registros** para distribuirlas (lo usarás en la Fase 10).

---

**➡️ Siguiente:** [Tu primer Dockerfile](02-tu-primer-dockerfile.md)
