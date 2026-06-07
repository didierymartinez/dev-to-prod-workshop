# Lección 6.7 — Comprobar la persistencia

> ⏱️ 20 minutos · 🎯 **Al terminar:** confirmarás con tus propios ojos que los datos ahora sobreviven a los reinicios, y descubrirás un detalle importante sobre dónde viven realmente.

---

## 🤔 El problema

Cambiamos a base de datos para que los datos no se pierdan. Pero "creer" no basta: hay que **comprobarlo**. Vamos a repetir el experimento que falló al inicio de la fase y ver la diferencia.

---

## 🛠️ Manos a la obra

### Paso 1: Registrar empresas nuevas

Con la API corriendo (`dotnet run`) y PostgreSQL arriba (`docker ps`), registra dos o tres empresas — por el frontend (Fase 5) o con Postman:

```json
{ "razonSocial": "Inversiones Caribe S.A.S.", "nit": "900888777-3", "plan": "Profesional" }
```

Confirma con `GET /empresas` que aparecen.

### Paso 2: La prueba clave — reiniciar la API

1. Detén la API: `Ctrl + C`.
2. Vuélvela a arrancar: `dotnet run`.
3. Consulta `GET /empresas` otra vez.

**Las empresas que registraste siguen ahí.** 🎉 Al inicio de la fase, este mismo experimento las borraba. Ahora persisten, porque viven en PostgreSQL, no en la memoria de la API.

### Paso 3: Verlas directamente en la base de datos

Míralas con SQL, como un desarrollador comprobando producción:

```bash
docker exec -it empresas-db psql -U appuser -d empresasdb -c 'SELECT "Nit", "RazonSocial", "Plan" FROM "Empresas";'
```

Verás la tabla con tus empresas. Esa es la verdad: están guardadas en disco, dentro de PostgreSQL.

### Paso 4: Un descubrimiento importante (rompe algo a propósito)

> 💥 Detén y **borra** el contenedor de la base de datos:
> ```bash
> docker rm -f empresas-db
> ```
> Vuelve a crearlo con el mismo comando de la lección 6.2 y arranca la API. Consulta `GET /empresas`. ¿Están tus empresas nuevas?

**No están.** Volvieron solo las que la migración crea, o ninguna. ¿Por qué, si la base de datos "persiste"?

Porque los datos vivían **dentro del contenedor**, y al borrarlo se borró su contenido. La persistencia sobrevive a reiniciar la **API**, pero no a borrar el **contenedor de la base de datos**.

> 🧠 Esto enseña dos cosas: (1) la base de datos es un servicio que se administra con cuidado, no algo desechable; (2) hay una forma de que los datos sobrevivan incluso al borrar el contenedor: los **volúmenes** de Docker. Los aprenderás en la **Fase 8**, y más adelante (Fase 11) pondremos la base de datos en su propia máquina, separada y protegida.

---

## ✅ Compruébalo

- [ ] Registraste empresas, reiniciaste la API y **siguen ahí** (a diferencia del inicio de la fase).
- [ ] Las viste directamente en la tabla con `psql` y `SELECT`.
- [ ] Entiendes por qué al **borrar el contenedor** sí se pierden (y que los volúmenes lo resuelven, en la Fase 8).

---

## 🧠 Lo que aprendiste

- Los datos ahora **persisten** a reinicios de la API porque viven en PostgreSQL.
- Puedes verificarlos directamente con `psql` y `SELECT`.
- Borrar el **contenedor** de la base de datos sí borra los datos: por eso existen los **volúmenes** (Fase 8) y la separación en su propia máquina (Fase 11).

---

## 🏁 Cierre de la Fase 6

Tu aplicación está **completa a nivel local**: una API con datos persistentes, una página web que los muestra y registra, y una base de datos real. Ya recorriste el corazón del desarrollo de una aplicación.

Lo que sigue es llevar esto **al mundo real**: que otros lo prueben sin depender de tu máquina, que los despliegues no se rompan, y que todo se actualice solo. Pero antes de salir a producción, conviene asegurar que los cambios no rompan lo que ya funciona — con **pruebas automáticas**.

---

**➡️ Siguiente fase:** [Fase 7 — Pruebas y la primera automatización (CI)](../07-pruebas-y-ci/README.md)
