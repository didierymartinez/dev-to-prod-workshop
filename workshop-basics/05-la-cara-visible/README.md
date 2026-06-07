# Fase 5 — La cara visible

> **Meta de la fase:** Construir una página web que muestre las empresas de tu API. Hasta ahora los datos solo se veían en JSON (en el navegador o Postman); ahora cualquier persona, sin saber de tecnología, podrá ver y registrar empresas en una pantalla clara.

Aplicarás HTML, CSS y JavaScript — lo justo para mostrar resultados — y de paso te toparás con **CORS**, un obstáculo clásico que todo desarrollador web enfrenta.

---

## ¿Qué vamos a construir?

Un panel sencillo: una página que pide las empresas a tu API (con `fetch`, como Postman pero desde el navegador) y las dibuja como tarjetas, con un formulario para registrar nuevas.

```
┌──────────────────────────────────────────┐
│  🏢 Panel de Empresas Clientes            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Construc.│ │Interpre.│ │Consorcio│  ←── tarjetas dibujadas
│  │Empresar.│ │Profesion│ │Básico   │      desde los datos de tu API
│  │● Activa │ │● Activa │ │○ Inactiva│     │
│  └─────────┘ └─────────┘ └─────────┘      │
└──────────────────────────────────────────┘
```

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Una página que muestra los datos](01-pagina-que-muestra-datos.md) | HTML + CSS + `fetch` a tu API | 40 min |
| 2 | [El obstáculo de CORS](02-el-obstaculo-cors.md) | Entender y resolver CORS | 30 min |
| 3 | [Un formulario para registrar](03-formulario-para-registrar.md) | Crear empresas desde la web | 35 min |

> Necesitarás tu API de la Fase 4 corriendo (`dotnet run` en `src/GestionEmpresas.Api`) y la extensión **Live Server** de VS Code (Fase 0).

---

**➡️ Empieza en:** [Una página que muestra los datos](01-pagina-que-muestra-datos.md)
