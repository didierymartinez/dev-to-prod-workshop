# 📦 Checkpoints — el código completo al cierre de cada sección

Si tu código se desvió y ya no compila, o quieres empezar una sección sin haber hecho la anterior, aquí está **el estado completo del proyecto al terminar cada sección**: el `Program.cs` acumulado (y, desde [Verde, y roto](../secciones/verde-y-roto.md), el proyecto de tests).

Cómo usarlos:
- **Comparar:** abre el `Program.cs` del checkpoint junto al tuyo y busca la diferencia.
- **Rescatarte:** copia el `Program.cs` del checkpoint sobre el tuyo y sigue con la sección siguiente.
- **Correrlo:** cada carpeta es un proyecto que compila solo: `cd checkpoints/05-decidir-el-futuro && dotnet run`.
- **Verificarlo:** `bash checkpoints/verificar.sh` compila y corre todos, y corre los tests.

Cada checkpoint se compiló y se corrió con .NET 10; la salida coincide con la que muestra la sección.

| Sección | Checkpoint |
|---|---|
| Los primeros hechos | [`02-los-primeros-hechos`](02-los-primeros-hechos/Program.cs) |
| Refactorizando el motor | [`03-refactorizando-el-motor`](03-refactorizando-el-motor/Program.cs) |
| El flujo de vida | [`04-el-flujo-de-vida`](04-el-flujo-de-vida/Program.cs) |
| Decidir el futuro | [`05-decidir-el-futuro`](05-decidir-el-futuro/Program.cs) |
| El Command Handler | [`06-el-command-handler`](06-el-command-handler/Program.cs) |
| El despachador | [`07-el-despachador`](07-el-despachador/Program.cs) |
| El almacén por id | [`08-el-almacen-por-id`](08-el-almacen-por-id/Program.cs) |
| Concurrencia optimista | [`09-concurrencia-optimista`](09-concurrencia-optimista/Program.cs) |
| Un acto, dos hechos | [`10-un-acto-dos-hechos`](10-un-acto-dos-hechos/Program.cs) (termina con la `ReglaDeNegocioException` esperada) |
| El agregado recuerda | [`11-el-agregado-recuerda`](11-el-agregado-recuerda/Program.cs) |
| Verde, y roto | [`12-verde-y-roto`](12-verde-y-roto/) — programa + proyecto de tests (`cd Empresas.Tests && dotnet test`) |
