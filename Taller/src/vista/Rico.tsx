import React from "react";
import { color, fuente, sinLigaduras } from "../estilo/tema";

// Texto con `código` en línea y **negrita**, como en taller.md.
const PARTES = /(`[^`]+`|\*\*[^*]+\*\*)/g;

export const Rico: React.FC<{ texto: string; acento?: string }> = ({ texto, acento }) => {
  const trozos = texto.split(PARTES).filter((t) => t !== "");
  return (
    <>
      {trozos.map((t, i) => {
        if (t.startsWith("`") && t.endsWith("`")) {
          return (
            <code
              key={i}
              style={{
                fontFamily: fuente.mono,
                ...sinLigaduras,
                fontSize: "0.86em",
                background: color.codigoEnLinea,
                borderRadius: 10,
                padding: "0.04em 0.28em",
                whiteSpace: "pre",
              }}
            >
              {t.slice(1, -1)}
            </code>
          );
        }
        if (t.startsWith("**") && t.endsWith("**")) {
          return (
            <strong key={i} style={{ fontWeight: 800, color: acento ?? color.texto }}>
              {t.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={i}>{t}</React.Fragment>;
      })}
    </>
  );
};
