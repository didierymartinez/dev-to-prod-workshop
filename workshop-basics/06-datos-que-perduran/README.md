# Fase 6 — Los datos que perduran

> **Meta de la fase:** Hacer que las empresas se guarden de verdad, en una **base de datos**, de modo que no desaparezcan al reiniciar la aplicación. En el camino aprenderás dos técnicas profesionales —**interfaces** e **inyección de dependencias**— justo cuando resuelven un problema real.

Esta es la fase más densa del taller, porque junta varias ideas grandes. Por eso va en pasos pequeños. Tómate tu tiempo.

---

## El problema que resolvemos

Haz una prueba ahora mismo: con tu API corriendo, registra una empresa nueva (por el frontend o Postman). Detén la API (`Ctrl+C`) y vuelve a arrancarla. Consulta las empresas… **la nueva desapareció**. Volvieron solo las tres del código.

¿Por qué? Porque los datos viven **en la memoria** del programa, y la memoria se borra cuando el programa se apaga. Necesitamos guardarlos en un lugar que **sobreviva**.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [¿Por qué los datos no pueden vivir en el programa?](01-por-que-una-base-de-datos.md) | Entender efímero vs persistente | 20 min |
| 2 | [Levantar PostgreSQL con Docker](02-postgres-con-docker.md) | Una base de datos corriendo en tu máquina | 35 min |
| 3 | [Conectarte y mirar la base de datos](03-conectarte-y-mirar.md) | Leer datos directamente con SQL | 30 min |
| 4 | [Interfaces e inyección de dependencias](04-interfaces-e-inyeccion.md) | Preparar el cambio sin romper nada | 40 min |
| 5 | [Conectar la API a PostgreSQL](05-conectar-la-api.md) | Guardar de verdad con EF Core | 40 min |
| 6 | [Migraciones: versionar y evolucionar la BD](06-migraciones.md) | Cambiar el esquema sin perder datos | 35 min |
| 7 | [Comprobar la persistencia](07-comprobar-persistencia.md) | Verificar que los datos sobreviven | 20 min |

> A partir de aquí usarás **Docker**. La lección 6.2 te guía para instalarlo.

---

**➡️ Empieza en:** [¿Por qué los datos no pueden vivir en el programa?](01-por-que-una-base-de-datos.md)
