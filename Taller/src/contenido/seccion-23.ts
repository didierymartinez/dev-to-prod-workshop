// Fuente: workshop-event-sourcing/taller.md, entrada "23 · Dos streams, la misma clave".
import type { Seccion } from "./tipos";

export const seccion23: Seccion = {
  numero: 23,
  titulo: "Dos streams, la misma clave",
  laminas: [
    {
      tipo: "portada",
      paraQue:
        "Que no existan dos empresas con el mismo NIT, aun con dos registros a la vez, **reservando el NIT** en una tabla única dentro de la misma transacción que los primeros hechos.",
    },
    {
      tipo: "planteamiento",
      bloques: [
        {
          k: "texto",
          tam: "enorme",
          texto: "¿Por qué no usamos el NIT como id del stream?",
        },
        {
          k: "texto",
          tam: "grande",
          texto:
            "La Prueba 3 de «Todo o nada» ya protegía el nacimiento: dos registros del mismo id chocaban.",
        },
        {
          k: "respuesta",
          texto:
            "El NIT se puede corregir. El id tiene que ser estable para siempre.",
        },
      ],
    },
    {
      tipo: "planteamiento",
      titulo: "Preguntar antes de crear",
      bloques: [
        {
          k: "codigo",
          lenguaje: "csharp",
          lineas: [
            'if (store.HayEmpresaConNit(nit)) throw new ReglaDeNegocioException("NIT ya registrado");',
          ],
        },
        {
          k: "texto",
          texto:
            "Dos registros a la vez: ambos leen «no existe» y crean, con ids distintos.",
        },
        {
          k: "terminal",
          tono: "error",
          salida: ["streams con NIT 900123 → 2"],
        },
        {
          k: "texto",
          texto: "¿Por qué no nos salva la concurrencia optimista?",
        },
        {
          k: "respuesta",
          texto:
            "Cada una es la versión 1 de su stream. La regla es del **conjunto**.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "El NIT en el hecho",
      tarea:
        "Crea la tabla que reservará cada NIT y agrega el NIT al hecho de registro.",
      pasos: [
        "En `psql`: `CREATE TABLE localizador(nit TEXT PRIMARY KEY, stream TEXT NOT NULL);`",
        "Cambia `EmpresaRegistrada(Nombre, Plan)` a `EmpresaRegistrada(Nit, Nombre, Plan)`, y `Registrar(nombre, plan)` a `Registrar(nit, nombre, plan)`.",
        "Ajusta tus tests y cada `Registrar` que marque el compilador: el NIT va primero.",
      ],
      logro: { items: ["Compila, y tus tests pasan."] },
      tips: [
        {
          k: "nuevo",
          idioma: "Localizador",
          explicacion:
            "una tabla clave de negocio → stream, escrita en la misma transacción que los eventos del registro.",
        },
        {
          k: "piensa",
          texto:
            "Guarda la incomodidad: acabas de cambiar la **forma** de un hecho.",
        },
      ],
    },
    {
      tipo: "reto",
      titulo: "Reservar el NIT en el store",
      tarea:
        "Dale al puerto un método para crear una empresa nueva reservando su NIT: entran el NIT y los hechos juntos, o nada.",
      pasos: [
        "En `IEventStore`: `void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos)`.",
        'En `PostgresEventStore.GuardarNuevo`, en una transacción: el `INSERT` en `localizador` y los hechos numerados desde 1 (con `NombreDe`). Si sale `"23505"`, lanza `NitYaExisteException`; créala.',
        "En `InMemoryEventStore`, la misma garantía con un `Dictionary<string,string>` NIT → id.",
      ],
      logro: { items: ["Compila con las dos implementaciones."] },
      tips: [
        {
          k: "nota",
          texto:
            "Recibe los hechos crudos, los de `SinConfirmar`: un stream nuevo se numera `1..N`.",
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Reservar el NIT en el store (1 de 2)",
      piezas: [
        {
          etiqueta: "En `PostgresEventStore`: `GuardarNuevo` abre la transacción y reserva el NIT",
          lenguaje: "csharp",
          lineas: [
            "// en PostgresEventStore : IEventStore  (misma mecánica de INSERT que tu Guardar de Todo o nada)",
            "public void GuardarNuevo(string id, string nit, IReadOnlyList<object> hechos)",
            "{",
            "    using var c = new NpgsqlConnection(_cadena); c.Open();",
            "    using var tx = c.BeginTransaction();",
            "    try",
            "    {",
            "        using (var l = c.CreateCommand())                        // 1) reserva el NIT",
            "        {",
            "            l.Transaction = tx;",
            '            l.CommandText = "INSERT INTO localizador(nit, stream) VALUES(@n, @s)";',
            '            l.Parameters.AddWithValue("n", nit);',
            '            l.Parameters.AddWithValue("s", id);',
            "            l.ExecuteNonQuery();",
            "        }",
          ],
        },
      ],
    },
    {
      tipo: "solucion",
      de: "reto",
      titulo: "Reservar el NIT en el store (2 de 2)",
      piezas: [
        {
          etiqueta: "Sigue `GuardarNuevo`, en la misma transacción: los hechos y el `Commit`",
          lenguaje: "csharp",
          lineas: [
            "        int version = 0;",
            "        foreach (var hecho in hechos)                            // 2) los hechos, versiones 1..N, misma tx",
            "        {",
            "            using var cmd = c.CreateCommand();",
            "            cmd.Transaction = tx;",
            '            cmd.CommandText = "INSERT INTO eventos(stream, version, tipo, datos) VALUES(@s, @v, @t, @d::jsonb)";',
            '            cmd.Parameters.AddWithValue("s", id);',
            '            cmd.Parameters.AddWithValue("v", ++version);',
            '            cmd.Parameters.AddWithValue("t", NombreDe(hecho.GetType()));',
            '            cmd.Parameters.AddWithValue("d", JsonSerializer.Serialize(hecho, hecho.GetType()));',
            "            cmd.ExecuteNonQuery();",
            "        }",
            "        tx.Commit();",
            "    }",
            '    catch (PostgresException e) when (e.SqlState == "23505")     // el NIT ya estaba',
            "    {",
            '        throw new NitYaExisteException($"NIT {nit} ya registrado");   // tx se revierte: ni localizador ni eventos',
            "    }",
            "}",
          ],
        },
      ],
      nota: "El SQL crudo se queda **dentro del store**; el dominio sigue hablando solo con `IEventStore`.",
    },
    {
      tipo: "reto",
      titulo: "Registra por ahí",
      tarea:
        "Registra la empresa con `GuardarNuevo` en vez de `Append`, y prueba dos registros del mismo NIT.",
      pasos: [
        "En el código suelto del `Program.cs`, el registro de abajo.",
        "Corre dos veces: la segunda trae el mismo NIT.",
        "Haz lo mismo en un test contra `InMemoryEventStore`.",
      ],
      logro: {
        items: [
          "Uno entra: su hecho, en versión 1.",
          "El otro lanza `NitYaExisteException` y no deja ni localizador ni eventos.",
          "El doble da el mismo resultado.",
        ],
      },
      ejemplo: {
        lenguaje: "csharp",
        lineas: [
          'var nit = "900123";',
          "var e = new Empresa();",
          'e.Registrar(nit, "Constructora Andes", "Premium");',
          "try",
          "{",
          '    store.GuardarNuevo("emp-7", nit, e.SinConfirmar);',
          "    e.MarcarConfirmados();",
          "}",
          "catch (NitYaExisteException) { /* no creamos un hecho nuevo */ }",
        ],
      },
    },
    {
      tipo: "rompelo",
      titulo: "El doble clic",
      tarea:
        "El usuario hace doble clic en «Registrar». Comprueba que el diario no se duplica.",
      pasos: [
        "Registra dos veces seguidas el mismo NIT.",
        "Cuéntalos en `psql`: `SELECT count(*) FROM eventos WHERE tipo = 'empresa-registrada' AND datos->>'Nit' = '900123';`",
      ],
      logro: {
        items: [
          "El diario tiene `EmpresaRegistrada` **una sola vez**.",
        ],
      },
    },
    {
      tipo: "aprendizaje",
      idea: "Una regla de conjunto la sostiene el store, con un **índice único en la misma transacción**. El id es interno y estable; el NIT va aparte, en un índice que sí se corrige.",
      puntos: [
        {
          termino: "Regla de conjunto",
          definicion:
            "Vive entre streams: la versión de un stream no la protege.",
        },
        {
          termino: "Localizador",
          definicion:
            "NIT → stream, con el NIT de `PRIMARY KEY`, en la transacción del registro.",
        },
      ],
      commit: {
        mensaje: "ES · Dos streams, la misma clave",
        preguntas: [
          "¿Por qué la versión por stream no impedía dos empresas con el mismo NIT? ¿Qué ganarías y qué perderías usando el NIT como id?",
        ],
      },
      siguiente: {
        seccion: "24 · El árbol de empresas",
        texto:
          "Una empresa puede ser filial de otra, y ninguna puede terminar colgando de sí misma. Eso no es una clave repetida.",
      },
    },
  ],
};
