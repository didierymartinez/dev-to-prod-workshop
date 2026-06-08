# Lección 4.1 — Config vs secreto: por qué el entorno no basta

> ⏱️ 20 minutos · 🎯 **Al terminar:** distinguirás configuración de secreto, entenderás por qué una variable de entorno **no** es suficiente para un secreto, y conocerás los niveles para gestionarlos. Lección de **conceptos**.

---

## 🤔 El problema

Mira lo que vienes haciendo: `export DB_PASSWORD="Clave_Servidor_2024"`. Esa contraseña está:

- en el **historial** de tu terminal (`history` la muestra),
- visible en el **stack** y en `docker service inspect` (las variables de entorno se ven en claro),
- copiada en tu cabeza y en notas.

Si filtras tu historial, o alguien entra al servidor, tiene la contraseña de la base de datos. Y para **rotarla** (cambiarla), tendrías que tocar varios lugares. Un secreto no se maneja así.

---

## 💡 Conceptos

### Configuración no es lo mismo que secreto

| | **Configuración** | **Secreto** |
|---|---|---|
| Qué es | Valores que cambian entre entornos | Credenciales sensibles |
| Ejemplos | puerto, región, tamaño de VM, nombre de la BD | contraseñas, tokens, llaves de API |
| ¿Sensible? | No | **Sí** |
| Si se filtra | molesto | **peligroso** |

Ambos deben salir del **código** — pero el secreto necesita más cuidado que una simple variable.

### El principio 12-factor: la config va en el entorno

Una buena práctica (del manifiesto **12-factor app**) dice: *la configuración vive en el entorno, no en el código*. Por eso usas variables de entorno y no valores "quemados". Eso resuelve la **configuración**. Pero para los **secretos**, una variable de entorno se queda corta: es visible para cualquiera que inspeccione el proceso o el servicio.

### Los niveles de gestión de secretos

Del peor al mejor:

```
1. Quemado en el código        ❌ jamás (queda en Git para siempre)
2. Variable de entorno         ⚠️ visible en inspect/historial (lo que haces hoy)
3. Archivo .env                ⚠️ mejor, pero queda en disco en claro
4. Secreto del orquestador     ✅ docker secret: montado como archivo en memoria, no en el entorno
5. Cofre gestionado            ✅✅ Key Vault: cifrado, con rotación, auditoría y acceso por identidad
```

En esta fase subes dos escalones: del nivel 2-3 (lo que haces hoy) al **nivel 4** (`docker secret`, próxima lección) y al **nivel 5** (Azure Key Vault).

### Por qué un cofre gestionado es el ideal

Un **cofre** como Azure Key Vault no solo guarda el secreto cifrado: registra **quién** lo leyó y **cuándo** (auditoría), permite **rotarlo** sin tocar las apps, y da acceso por **identidad** (no por contraseña). Es lo que usan los equipos serios — y lo que verás integrado a fondo en el taller avanzado.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Cuál es la diferencia entre configuración y secreto? Da un ejemplo de cada uno.
- [ ] ¿Por qué una variable de entorno no basta para un secreto?
- [ ] Ordena de peor a mejor: archivo `.env`, quemado en el código, cofre gestionado, `docker secret`.

---

## 🧠 Lo que aprendiste

- **Configuración** = valores por entorno (no sensibles); **secreto** = credenciales (sensibles).
- **12-factor**: la config va en el entorno; pero los secretos necesitan más que una variable (que es visible).
- Niveles: código ❌ → env ⚠️ → `.env` ⚠️ → **docker secret** ✅ → **cofre gestionado** ✅✅.
- Un cofre (Key Vault) añade cifrado, rotación, auditoría y acceso por identidad.

---

**➡️ Siguiente:** [Secretos del clúster (docker secret)](02-docker-secret.md)
