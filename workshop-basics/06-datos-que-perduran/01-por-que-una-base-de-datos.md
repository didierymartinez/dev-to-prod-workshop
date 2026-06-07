# Lección 6.1 — ¿Por qué los datos no pueden vivir en el programa?

> ⏱️ 20 minutos · 🎯 **Al terminar:** entenderás por qué un programa no es lugar para guardar datos importantes, y qué es una base de datos. Lección de **conceptos**.

---

## 🤔 El problema

Ya lo viste: registras una empresa, reinicias la API, y desapareció. No es un error tuyo — es la naturaleza de la memoria de un programa. Antes de resolverlo, entendamos por qué pasa.

---

## 💡 Conceptos

### Un programa es efímero

Cuando tu API corre, guarda las empresas en la **memoria RAM** del computador (en esa `List<Empresa>` del repositorio). La RAM es rapidísima, pero tiene una característica clave: **se borra cuando el programa se apaga**. Es una pizarra que se limpia sola al terminar.

```
Mientras la API corre:        Cuando la apagas:
┌──────────────────┐          ┌──────────────────┐
│  API (en memoria)│          │   (nada)         │
│  • Empresa A     │   ──→    │                  │   ← se borró todo
│  • Empresa B     │          │                  │
└──────────────────┘          └──────────────────┘
```

Por eso decimos que el programa es **efímero**: vive, trabaja y, al terminar, olvida todo.

### Los datos importantes deben ser persistentes

Los datos de tu negocio (empresas, contratos, facturas) no pueden depender de que un programa siga encendido. Deben **persistir**: sobrevivir a reinicios, fallos y actualizaciones. Para eso existe un lugar separado y especializado: la **base de datos**.

```
┌──────────────┐   guarda/pide   ┌──────────────────┐
│  API         │ ──────────────→ │  Base de datos   │
│ (efímera,    │                 │ (persistente,    │
│  puede morir)│ ←────────────── │  guarda en disco)│
└──────────────┘                 └──────────────────┘
   se reinicia                      los datos siguen ahí
```

### Qué es una base de datos (relacional)

Una **base de datos** es un programa especializado en **guardar datos de forma duradera y consultarlos rápido**. La más común es la **relacional**, que organiza los datos en **tablas** (como hojas de cálculo): filas y columnas.

Una tabla `Empresas` se vería así:

| Nit | RazonSocial | Plan | Activa |
|---|---|---|---|
| 900123456-1 | Constructora del Norte S.A.S. | Empresarial | true |
| 830456789-2 | Interprensa Ltda. | Profesional | true |

Usaremos **PostgreSQL**, una de las bases de datos más usadas y respetadas del mundo (gratuita y de código abierto). Guarda los datos **en disco**, así que sobreviven a cualquier reinicio.

> 🧠 Más adelante hablaremos con la base de datos usando **SQL**, el lenguaje universal para consultar datos. Por ahora solo necesitas la idea: un lugar aparte, especializado y duradero, donde viven los datos.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Por qué se borran los datos al reiniciar la API?
- [ ] ¿Qué significa que los datos sean "persistentes"?
- [ ] ¿Cómo organiza los datos una base de datos relacional?

---

## 🧠 Lo que aprendiste

- Un programa guarda datos en la **memoria RAM**, que es **efímera**: se borra al apagarse.
- Los datos importantes deben ser **persistentes**: vivir en un lugar separado y duradero.
- Una **base de datos relacional** (como **PostgreSQL**) guarda datos en **tablas** y en disco, sobreviviendo a los reinicios.

---

**➡️ Siguiente:** [Levantar PostgreSQL con Docker](02-postgres-con-docker.md)
