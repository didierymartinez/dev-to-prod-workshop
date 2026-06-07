# Fase 4 — Construir tu propia API

> **Meta de la fase:** Convertir tu programa en una **API REST**: un servicio que habla HTTP y al que otros programas pueden pedirle y enviarle empresas. Aplicarás todo lo que entendiste en la Fase 3, pero ahora **del lado del servidor**.

Al terminar tendrás una API funcionando en tu máquina con los cuatro endpoints clásicos (listar, ver uno, crear, eliminar), probada con Postman.

---

## ¿Qué vamos a construir?

```
GET    /empresas         → lista todas las empresas
GET    /empresas/{nit}   → una empresa específica
POST   /empresas         → registra una empresa nueva
DELETE /empresas/{nit}   → elimina una empresa
```

Son exactamente los métodos y códigos que practicaste consumiendo en la Fase 3 — ahora los implementas tú.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Tu primer servidor web](01-tu-primer-servidor-web.md) | Una app que responde HTTP | 30 min |
| 2 | [Listar empresas (GET)](02-listar-empresas.md) | El primer endpoint con datos | 40 min |
| 3 | [Crear empresas (POST)](03-crear-empresas.md) | Recibir y validar datos | 35 min |
| 4 | [Buscar y eliminar](04-buscar-y-eliminar.md) | Completar los endpoints | 30 min |
| 5 | [Probar toda la API con Postman](05-probar-con-postman.md) | Verificar cada caso | 25 min |

---

**➡️ Empieza en:** [Tu primer servidor web](01-tu-primer-servidor-web.md)
