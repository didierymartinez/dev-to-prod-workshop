// Resaltador ligero, sin dependencias: basta para que el código se lea con color en pantalla.
// No es un parser real.
import { sintaxis } from "../estilo/tema";

export type Lenguaje = "csharp" | "bash" | "sql";
export type Trozo = { texto: string; color: string };

const CLAVES_CS = new Set([
  "public", "private", "protected", "internal", "abstract", "sealed", "class", "record",
  "struct", "interface", "namespace", "using", "void", "return", "new", "static", "readonly",
  "foreach", "for", "while", "in", "if", "else", "switch", "case", "break", "default", "is",
  "as", "override", "virtual", "get", "set", "this", "base", "null", "true", "false", "throw",
  "var", "string", "bool", "int", "long", "object", "async", "await",
]);
const CLAVES_SQL = new Set(["UPDATE", "SET", "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "DELETE"]);

const RE = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\w\s])/g;

// bash: el comando en turquesa, las opciones (-m, --allow-empty) en naranja,
// lo que va entre comillas en amarillo y los <huecos> en violeta.
const BASH = /("(?:[^"\\]|\\.)*")|(<[^>]+>)|(\s+)|(#.*$)|([^\s"<]+)/g;
const resaltarBash = (linea: string): Trozo[] => {
  const trozos: Trozo[] = [];
  let primera = true;
  let m: RegExpExecArray | null;
  BASH.lastIndex = 0;
  while ((m = BASH.exec(linea)) !== null) {
    const [texto, cadena, hueco, espacio, coment] = m;
    if (cadena !== undefined) trozos.push({ texto, color: sintaxis.cadena });
    else if (hueco !== undefined) trozos.push({ texto, color: sintaxis.numero });
    else if (espacio !== undefined) trozos.push({ texto, color: sintaxis.ident });
    else if (coment !== undefined) trozos.push({ texto, color: sintaxis.comentario });
    else {
      trozos.push({
        texto,
        color: primera ? sintaxis.tipo : texto.startsWith("-") ? sintaxis.clave : sintaxis.ident,
      });
      primera = false;
    }
  }
  return trozos;
};

export const resaltar = (linea: string, lenguaje: Lenguaje): Trozo[] => {
  if (lenguaje === "bash") return resaltarBash(linea);
  const trozos: Trozo[] = [];
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(linea)) !== null) {
    const [texto, coment, cadena, numero, palabra, espacio] = m;
    if (coment !== undefined) {
      trozos.push({ texto, color: sintaxis.comentario });
    } else if (cadena !== undefined) {
      trozos.push({ texto, color: sintaxis.cadena });
    } else if (numero !== undefined) {
      trozos.push({ texto, color: sintaxis.numero });
    } else if (palabra !== undefined) {
      const c =
        lenguaje === "sql"
          ? CLAVES_SQL.has(palabra)
            ? sintaxis.clave
            : sintaxis.ident
          : CLAVES_CS.has(palabra)
            ? sintaxis.clave
            : /^[A-Z]/.test(palabra)
              ? sintaxis.tipo
              : sintaxis.ident;
      trozos.push({ texto, color: c });
    } else if (espacio !== undefined) {
      trozos.push({ texto, color: sintaxis.ident });
    } else {
      trozos.push({ texto, color: sintaxis.signo });
    }
  }
  return trozos;
};
