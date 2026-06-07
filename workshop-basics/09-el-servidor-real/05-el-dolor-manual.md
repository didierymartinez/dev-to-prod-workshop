# Lección 9.5 — El dolor del despliegue manual

> ⏱️ 25 minutos · 🎯 **Al terminar:** harás un cambio real y lo desplegarás a mano otra vez — sintiendo en carne propia lo repetitivo y frágil que es. Esa molestia es la que justifica todo lo que viene en la Fase 10. Y apagarás el servidor para no gastar.

---

## 🤔 El problema

Tu app está en el servidor. Pero el software **cambia constantemente**: el negocio pide algo nuevo, corriges un error, mejoras una función. Cada cambio hay que llevarlo al servidor. ¿Qué tan cómodo es hacerlo a mano? Vamos a comprobarlo.

---

## 🛠️ Manos a la obra

### Paso 1: Un cambio real — el área comercial pide un resumen

Te piden un endpoint que diga, de un vistazo, cuántas empresas hay y cuántas están activas. En tu máquina, abre `src/GestionEmpresas.Api/Program.cs` y agrega, antes de `app.Run();`:

```csharp
// GET /empresas/resumen → totales para el área comercial
app.MapGet("/empresas/resumen", (IEmpresaRepositorio repo) =>
{
    var empresas = repo.ObtenerTodas().ToList();
    return Results.Ok(new
    {
        total = empresas.Count,
        activas = empresas.Count(e => e.Activa),
    });
});
```

Pruébalo en tu máquina primero (`docker compose up --build` y visita `http://localhost:5000/empresas/resumen`). Funciona localmente.

### Paso 2: Guardarlo en GitHub (commit + push)

Como siempre, versiona y sube el cambio:

```bash
git checkout -b feat/endpoint-resumen
git add .
git commit -m "agregar endpoint de resumen de empresas"
git push -u origin feat/endpoint-resumen    # sube la rama a GitHub
```
Abre el **Pull Request** y fusiónalo; vuelve a `main` y sincroniza.

### Paso 3: Ahora llévalo al servidor… a mano

El cambio está en GitHub y en tu máquina, pero **el servidor todavía corre la versión vieja**. Para actualizarlo, repites el despliegue manual:

```bash
# 1. Volver a copiar el código al servidor (desde la raíz del proyecto, en tu máquina)
scp -r docker-compose.yml Dockerfile src azureuser@$IP:~/gestion-empresas/

# 2. Entrar al servidor y reconstruir
ssh azureuser@$IP
cd ~/gestion-empresas
docker compose up -d --build
```

Verifica el nuevo endpoint: `http://<IP>:5000/empresas/resumen`. Ahí está, en producción.

### Paso 4: Mira todo lo que tuviste que hacer

Cuenta los pasos para **un solo** cambio pequeño:

1. Editar el código.
2. Probarlo localmente.
3. `commit` + `push` a GitHub.
4. `scp` para copiar al servidor.
5. `ssh` para entrar al servidor.
6. `docker compose up -d --build` para reconstruir.

> 💥 **Aquí está el dolor.** Seis pasos, en orden, sin equivocarte, **cada vez** que cambias algo. Imagina hacerlo cinco veces al día, o a las 11 de la noche con sueño, o que un compañero olvide el paso 4 y el servidor quede desactualizado sin que nadie lo note. Es lento, repetitivo y propenso a errores.
>
> Y todavía falta: ¿quién garantiza que el cambio no rompió nada antes de subirlo? (Las pruebas de la Fase 7… que ahora mismo nadie está corriendo en este flujo manual.)

**Esa molestia es exactamente lo que la Fase 10 va a eliminar:** que, con solo hacer `push` a GitHub, las pruebas corran solas y el servidor se actualice solo. Pero tenías que **sentir** el trabajo manual para valorar por qué se automatiza.

### Paso 5: Revisar logs cuando haga falta

Si algo falla en el servidor, los logs son tu primera parada (igual que en local):

```bash
docker compose logs -f api      # logs de la API en vivo (Ctrl+C para salir)
```

### Paso 6: Apagar el servidor para no gastar

Cuando termines la sesión, **apaga** la VM para no pagar por horas que no usas. Sal del servidor (`exit`) y, en tu máquina:

```bash
# Apagar (deja de cobrar el cómputo; conserva el disco y los datos)
az vm deallocate --resource-group rg-gestion-empresas --name vm-app
```

Para retomar en la próxima sesión:

```bash
az vm start --resource-group rg-gestion-empresas --name vm-app
# La IP pública puede cambiar al reiniciar; vuelve a consultarla:
IP=$(az vm show -g rg-gestion-empresas -n vm-app -d --query publicIps -o tsv)
```

> ⚠️ **No borres** el grupo de recursos todavía: seguiremos usando esta VM en las Fases 10 y 11. Solo la apagamos.

---

## ✅ Compruébalo

- [ ] Agregaste el endpoint `/empresas/resumen`, lo probaste local y lo subiste a GitHub.
- [ ] Lo desplegaste al servidor a mano (scp + ssh + rebuild) y responde en `http://<IP>:5000/empresas/resumen`.
- [ ] Puedes enumerar los pasos del despliegue manual y explicar por qué es frágil.
- [ ] Apagaste la VM con `az vm deallocate`.

---

## 🧠 Lo que aprendiste

- Cada cambio de código exige repetir el despliegue: `scp` → `ssh` → `docker compose up --build`.
- El despliegue manual es **lento, repetitivo y propenso a errores** — y no garantiza que se corran las pruebas.
- Esa fricción es la razón de ser del **despliegue automático (CD)**, que construirás en la Fase 10.
- `az vm deallocate` apaga la VM para no gastar; `az vm start` la reenciende.

---

## 🏁 Cierre de la Fase 9

Tu aplicación ya vive en un servidor real, en internet. Pero llevarla ahí —y mantenerla actualizada— es un trabajo manual que no escala. Ya sentiste el dolor; ahora viene la cura.

---

**➡️ Siguiente fase:** [Fase 10 — Despliegue automático (CD)](../10-despliegue-automatico/README.md)
