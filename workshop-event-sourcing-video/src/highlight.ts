// Resaltador de C# ligero (sin dependencias): tokeniza una línea y la clasifica.
// No pretende ser un parser real — basta para que el código se lea con color en pantalla.

export type TokenKind =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "ident"
  | "punct"
  | "ws";

export type Token = { text: string; kind: TokenKind };

const KEYWORDS = new Set([
  "public", "private", "protected", "internal", "abstract", "sealed",
  "class", "record", "struct", "interface", "enum", "namespace", "using",
  "void", "return", "new", "static", "readonly", "const", "params",
  "foreach", "for", "while", "in", "if", "else", "switch", "case", "break",
  "default", "is", "as", "override", "virtual", "where", "get", "set",
  "this", "base", "null", "true", "false", "throw", "try", "catch", "finally",
  "async", "await", "var", "string", "bool", "int", "long", "double", "object",
  "decimal", "float",
]);

// comentario · string · número · identificador · espacios · otro (puntuación)
const RE =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\w\s])/g;

export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(line)) !== null) {
    if (m[1] !== undefined) tokens.push({ text: m[1], kind: "comment" });
    else if (m[2] !== undefined) tokens.push({ text: m[2], kind: "string" });
    else if (m[3] !== undefined) tokens.push({ text: m[3], kind: "number" });
    else if (m[4] !== undefined) {
      const w = m[4];
      const kind: TokenKind = KEYWORDS.has(w)
        ? "keyword"
        : /^[A-Z]/.test(w)
          ? "type"
          : "ident";
      tokens.push({ text: w, kind });
    } else if (m[5] !== undefined) tokens.push({ text: m[5], kind: "ws" });
    else if (m[6] !== undefined) tokens.push({ text: m[6], kind: "punct" });
  }
  return tokens;
}
