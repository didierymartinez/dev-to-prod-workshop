# Lección 6.3 — Conectarte y mirar la base de datos

> ⏱️ 30 minutos · 🎯 **Al terminar:** sabrás conectarte a la base de datos como lo hace un desarrollador en el mundo real, ejecutar algo de SQL y entender qué es una *connection string*.

---

## 🤔 El problema

Tu API aún no usa la base de datos, pero conviene saber **entrar y mirar** lo que hay dentro. Cuando algo falle en producción ("faltan datos", "no guarda"), lo primero que hace un desarrollador es conectarse a la base de datos y verificar con sus propios ojos. Aprendamos a hacerlo desde ya.

---

## 💡 Conceptos

### Un cliente de base de datos

Para hablar con PostgreSQL se usa un **cliente**. El más básico viene incluido en la propia imagen de Postgres y se llama **`psql`**: una consola donde escribes comandos SQL y ves resultados.

### SQL: el idioma de las bases de datos

**SQL** (Structured Query Language) es el lenguaje universal para pedir y manipular datos. No lo vas a dominar aquí, pero verás que es legible:

```sql
SELECT * FROM "Empresas";        -- "dame todas las filas de la tabla Empresas"
```

### La connection string: cómo se conecta la API

Para que tu API encuentre la base de datos, necesita una **cadena de conexión** (*connection string*): un texto con todos los datos para conectarse.

```
Host=localhost;Port=5432;Database=empresasdb;Username=appuser;Password=Clave_Local_2024
```

| Parte | Qué dice |
|---|---|
| `Host=localhost` | dónde está la base de datos (tu máquina) |
| `Port=5432` | el puerto (el que abriste con `-p 5432:5432`) |
| `Database=empresasdb` | cuál base de datos usar |
| `Username=appuser` | con qué usuario entrar |
| `Password=...` | la contraseña |

> ⚠️ La connection string contiene la **contraseña**. Por eso **jamás** va escrita en el código fuente ni se sube a Git. La pondremos en un archivo de configuración local que ya está en `.gitignore` (lo harás en la lección 6.5).

---

## 🛠️ Manos a la obra

### Paso 1: Entrar a la base de datos con psql

Con el contenedor `empresas-db` corriendo (lección 6.2), conéctate a la consola de PostgreSQL **dentro** del contenedor:

```bash
docker exec -it empresas-db psql -U appuser -d empresasdb
```

Desglose:
- `docker exec -it empresas-db` → "ejecuta algo, de forma interactiva, dentro del contenedor `empresas-db`".
- `psql -U appuser -d empresasdb` → abre el cliente `psql` con el usuario `appuser` en la base `empresasdb`.

Tu prompt cambiará a `empresasdb=#`. Estás **dentro** de la base de datos.

### Paso 2: Mirar alrededor

Prueba estos comandos (los que empiezan con `\` son atajos de psql; los demás son SQL):

```sql
\l                     -- listar todas las bases de datos
\dt                    -- listar las tablas de esta base (ahora: "no relations" — está vacía)
\du                    -- listar los usuarios
SELECT version();      -- ver la versión de PostgreSQL
```

Es normal que `\dt` diga que no hay tablas: tu API todavía no ha creado ninguna. Eso lo hará automáticamente en la lección 6.5.

### Paso 3: Salir

```sql
\q
```
Vuelves a tu terminal normal. El contenedor sigue corriendo.

> 🧠 Acabas de hacer lo que hace un desarrollador para diagnosticar: entrar a la base, mirar qué tablas y datos hay, y salir. `docker exec -it ... psql` y `\dt` son tu linterna para ver dentro de la base de datos.

---

## ✅ Compruébalo

- [ ] Lograste entrar al prompt `empresasdb=#` con `docker exec ... psql`.
- [ ] `\dt` te dijo que aún no hay tablas (correcto).
- [ ] `SELECT version();` mostró PostgreSQL 16.
- [ ] Puedes explicar qué es una *connection string* y por qué no va en el código.

---

## 🧠 Lo que aprendiste

- **`psql`** es el cliente de consola de PostgreSQL; entras con `docker exec -it empresas-db psql -U appuser -d empresasdb`.
- **SQL** es el idioma para consultar datos; `\dt` lista tablas, `\q` sale.
- La **connection string** reúne host, puerto, base, usuario y contraseña — y **nunca** va en el código.

---

## 🆘 Si algo salió mal

**"database empresas-db is not running" / no conecta.**
Verifica con `docker ps` que `empresas-db` está *Up*. Si no, arráncalo con `docker start empresas-db`.

**Escribí un comando y quedó "colgado" esperando.**
Si abriste una comilla o falta el `;` al final de un SQL, psql espera más. Escribe `;` y Enter, o pulsa `Ctrl+C` para cancelar la línea.

**No recuerdo cómo salir.**
Escribe `\q` y Enter.

---

**➡️ Siguiente:** [Interfaces e inyección de dependencias](04-interfaces-e-inyeccion.md)
