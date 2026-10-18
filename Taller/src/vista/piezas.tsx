// Piezas comunes: código, terminal, tarjetas. Las usan el planteamiento, el reto y el aprendizaje.
import React from "react";
import type { Terminal } from "../contenido/tipos";
import { color, fuente, sinLigaduras, tono } from "../estilo/tema";
import { resaltar, type Lenguaje } from "./resaltado";
import { Rico } from "./Rico";

/** Letra monoespaciada que cabe en `ancho`: si la línea más larga no entra, se achica. */
export const letraQueCabe = (lineas: string[], ancho: number, base: number, minimo = 26) => {
  const mas = Math.max(1, ...lineas.map((l) => l.length));
  return Math.max(minimo, Math.min(base, Math.floor(ancho / (mas * 0.61))));
};

export const Codigo: React.FC<{
  lineas: string[];
  lenguaje: Lenguaje;
  ancho: number;
  base?: number;
  interlineado?: number;
}> = ({ lineas, lenguaje, ancho, base = 40, interlineado = 1.55 }) => {
  const prefijo = lenguaje === "bash" ? "$ " : "";
  const letra = letraQueCabe(lineas.map((l) => prefijo + l), ancho - 80, base);
  return (
    <div
      style={{
        background: color.codigo,
        border: `1px solid ${color.borde}`,
        borderRadius: 20,
        padding: "26px 40px",
        fontFamily: fuente.mono,
        ...sinLigaduras,
        fontSize: letra,
        lineHeight: interlineado,
        whiteSpace: "pre",
      }}
    >
      {lineas.map((l, i) => (
        <div key={i}>
          {prefijo ? <span style={{ color: color.muyTenue }}>{prefijo}</span> : null}
          {resaltar(l, lenguaje).map((t, j) => (
            <span key={j} style={{ color: t.color }}>
              {t.texto}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

/** Una terminal con lo que deben ver. Si `envolver`, las líneas largas bajan de renglón. */
export const VistaDeTerminal: React.FC<{
  t: Terminal;
  ancho: number;
  base?: number;
  envolver?: boolean;
  /** Sin la barra de ventana: para cuando el alto escasea. */
  compacta?: boolean;
}> = ({ t, ancho, base = 38, envolver, compacta }) => {
  const c = t.tono === "error" ? tono.error : t.tono === "ok" ? tono.ok : color.tenue;
  const todas = [...(t.comando ? [`$ ${t.comando}`] : []), ...t.salida];
  const letra = envolver ? base : letraQueCabe(todas, ancho - 80, base);
  return (
    <div style={{ background: "#0A0F1A", border: `1px solid ${color.borde}`, borderRadius: 20, overflow: "hidden" }}>
      {compacta ? null : (
        <div style={{ display: "flex", gap: 10, padding: "14px 22px", background: "#121A2A" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((x) => (
            <div key={x} style={{ width: 15, height: 15, borderRadius: 8, background: x, opacity: 0.85 }} />
          ))}
        </div>
      )}
      <div
        style={{
          padding: compacta ? "18px 28px" : "20px 34px 26px",
          fontFamily: fuente.mono,
          ...sinLigaduras,
          fontSize: letra,
          lineHeight: 1.5,
          whiteSpace: envolver ? "pre-wrap" : "pre",
        }}
      >
        {t.comando ? (
          <div>
            <span style={{ color: color.muyTenue }}>$ </span>
            <span style={{ color: color.texto }}>{t.comando}</span>
          </div>
        ) : null}
        {t.salida.map((l, i) => (
          <div key={i} style={{ color: c, fontWeight: 700 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Una nota con icono a la izquierda (💡, 🤔, 💭…). */
export const Nota: React.FC<{ icono: string; texto: string; acento: string; letra?: number }> = ({
  icono,
  texto,
  acento,
  letra = 34,
}) => (
  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
    <span style={{ fontSize: letra, lineHeight: 1.3 }}>{icono}</span>
    <div style={{ fontSize: letra, color: color.texto, lineHeight: 1.32 }}>
      <Rico texto={texto} acento={acento} />
    </div>
  </div>
);

/** Un rótulo de zona dentro de una pantalla ("Haz esto", "Lo logras cuando"…). */
export const Rotulo: React.FC<{ texto: string; acento: string }> = ({ texto, acento }) => (
  <div style={{ fontSize: 30, fontWeight: 800, color: acento, letterSpacing: 0.5 }}>{texto}</div>
);

export const Tarjeta: React.FC<{ children: React.ReactNode; estilo?: React.CSSProperties }> = ({ children, estilo }) => (
  <div
    style={{
      background: color.panel,
      border: `1px solid ${color.borde}`,
      borderRadius: 22,
      padding: "22px 30px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      ...estilo,
    }}
  >
    {children}
  </div>
);
