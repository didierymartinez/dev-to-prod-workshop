// Los bloques del planteamiento: el problema que se revela por golpes.
import React from "react";
import type { Bloque, Caja, FilaDeClase } from "../contenido/tipos";
import { color, fuente, sinLigaduras, tam, tono } from "../estilo/tema";
import { useAparece, useProgreso } from "./aparecer";
import { Codigo, ConIcono, VistaDeTerminal } from "./piezas";
import { Rico } from "./Rico";

type Props<K extends Bloque["k"]> = {
  b: Extract<Bloque, { k: K }>;
  golpe: number;
  acento: string;
  centrado?: boolean;
  /** Ancho disponible para el bloque (código y terminal ajustan su letra a él). */
  ancho: number;
};

const CodigoEnPlanteamiento: React.FC<Props<"codigo">> = ({
  b,
  golpe,
  ancho,
}) => {
  const st = useAparece(golpe);
  return (
    <div style={st}>
      <Codigo
        lineas={b.lineas}
        lenguaje={b.lenguaje}
        ancho={ancho}
        base={34}
        interlineado={1.45}
      />
    </div>
  );
};

const TerminalEnPlanteamiento: React.FC<Props<"terminal">> = ({
  b,
  golpe,
  ancho,
}) => {
  const st = useAparece(golpe);
  return (
    <div style={st}>
      <VistaDeTerminal t={b} ancho={ancho} base={34} />
    </div>
  );
};

const Texto: React.FC<Props<"texto">> = ({ b, golpe, acento, centrado }) => {
  const st = useAparece(golpe);
  const estilos = {
    enorme: {
      fontSize: 88,
      fontWeight: 800,
      lineHeight: 1.12,
      color: color.texto,
    },
    grande: {
      fontSize: 58,
      fontWeight: 600,
      lineHeight: 1.25,
      color: color.texto,
    },
    normal: {
      fontSize: 48,
      fontWeight: 500,
      lineHeight: 1.35,
      color: color.texto,
    },
    tenue: {
      fontSize: 38,
      fontWeight: 500,
      lineHeight: 1.35,
      color: color.tenue,
    },
  }[b.tam ?? "normal"];
  return (
    <div style={{ ...st, ...estilos, textAlign: centrado ? "center" : "left" }}>
      <Rico texto={b.texto} acento={acento} />
    </div>
  );
};

const Respuesta: React.FC<Props<"respuesta">> = ({
  b,
  golpe,
  acento,
  centrado,
}) => {
  const st = useAparece(golpe, 0);
  const p = useProgreso(golpe);
  return (
    <div
      style={{
        ...st,
        scale: `${0.94 + 0.06 * p}`,
        fontSize: 68,
        fontWeight: 800,
        lineHeight: 1.15,
        color: acento,
        textAlign: centrado ? "center" : "left",
      }}
    >
      <Rico texto={b.texto} acento={acento} />
    </div>
  );
};

const marca = (tipo: string | undefined, i: number, acento: string) => {
  const base: React.CSSProperties = {
    flex: "none",
    width: 56,
    height: 56,
    borderRadius: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 32,
    marginTop: 2,
  };
  if (tipo === "numero")
    return (
      <div style={{ ...base, background: acento, color: color.fondo }}>
        {i + 1}
      </div>
    );
  if (tipo === "pregunta")
    return (
      <div
        style={{
          ...base,
          background: "rgba(255,209,102,0.14)",
          color: tono.piensa,
          fontSize: 34,
        }}
      >
        ?
      </div>
    );
  return (
    <div style={{ ...base, background: "transparent" }}>
      <div
        style={{ width: 16, height: 16, borderRadius: 8, background: acento }}
      />
    </div>
  );
};

const Item: React.FC<{
  texto: string;
  golpe: number;
  i: number;
  tipo?: string;
  acento: string;
}> = ({ texto, golpe, i, tipo, acento }) => {
  const st = useAparece(golpe);
  return (
    <div style={{ ...st, display: "flex", gap: 26, alignItems: "flex-start" }}>
      {marca(tipo, i, acento)}
      <div
        style={{
          fontSize: 46,
          lineHeight: 1.3,
          fontWeight: 500,
          color: color.texto,
          paddingTop: 2,
        }}
      >
        <Rico texto={texto} acento={acento} />
      </div>
    </div>
  );
};

const Lista: React.FC<Props<"lista">> = ({ b, golpe, acento }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
    {b.items.map((t, i) => (
      <Item
        key={i}
        texto={t}
        i={i}
        tipo={b.marca}
        acento={acento}
        golpe={b.porItem ? golpe + i : golpe}
      />
    ))}
  </div>
);

const Tabla: React.FC<Props<"tabla">> = ({ b, golpe }) => {
  const st = useAparece(golpe);
  const celda: React.CSSProperties = {
    padding: "18px 36px",
    borderRight: `1px solid ${color.borde}`,
  };
  return (
    <div
      style={{
        ...st,
        alignSelf: "flex-start",
        background: color.panel,
        border: `1px solid ${color.borde}`,
        borderRadius: 20,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: `repeat(${b.columnas.length}, auto)`,
      }}
    >
      {b.columnas.map((c) => (
        <div
          key={c}
          style={{
            ...celda,
            fontSize: 30,
            color: color.tenue,
            fontWeight: 600,
            background: "#141B2B",
          }}
        >
          <Rico texto={c} />
        </div>
      ))}
      {b.filas.flat().map((v, i) => (
        <div
          key={i}
          style={{
            ...celda,
            fontSize: 48,
            fontWeight: 600,
            color: color.texto,
          }}
        >
          <Rico texto={v} />
        </div>
      ))}
    </div>
  );
};

const Entrada: React.FC<{
  texto: string;
  golpe: number;
  ultima: boolean;
  acento: string;
}> = ({ texto, golpe, ultima, acento }) => {
  const st = useAparece(golpe, 20);
  const p = useProgreso(golpe);
  return (
    <div style={{ display: "flex", gap: 36, alignItems: "stretch" }}>
      <div
        style={{
          width: 36,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: acento,
            scale: `${p}`,
            marginTop: 14,
          }}
        />
        {!ultima ? (
          <div
            style={{ flex: 1, width: 4, background: color.borde, marginTop: 8 }}
          />
        ) : null}
      </div>
      <div
        style={{
          ...st,
          fontSize: 50,
          fontWeight: 600,
          color: color.texto,
          padding: "4px 0 40px",
          lineHeight: 1.25,
        }}
      >
        <Rico texto={texto} acento={acento} />
      </div>
    </div>
  );
};

const Diario: React.FC<Props<"diario">> = ({ b, golpe }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <div
      style={{
        fontSize: 30,
        fontWeight: 700,
        color: color.tenue,
        marginBottom: 26,
      }}
    >
      <ConIcono texto="📔 El diario" />
    </div>
    {b.items.map((t, i) => (
      <Entrada
        key={i}
        texto={t}
        golpe={b.porItem ? golpe + i : golpe}
        ultima={i === b.items.length - 1}
        acento={tono.ok}
      />
    ))}
  </div>
);

const tonoDeFila = (f: FilaDeClase) =>
  f.tono === "dolor"
    ? tono.error
    : f.tono === "bien"
      ? tono.ok
      : f.tono === "tenue"
        ? color.tenue
        : color.texto;

const CajaDeClase: React.FC<{ caja: Caja }> = ({ caja }) => (
  <div
    style={{
      background: color.panel,
      border: `1px solid ${color.borde}`,
      borderRadius: 24,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "18px 34px",
        background: "#141B2B",
        fontFamily: fuente.mono,
        ...sinLigaduras,
        fontSize: 42,
      }}
    >
      {caja.arriba ? (
        <span style={{ color: color.tenue, fontSize: 30 }}>{caja.arriba} </span>
      ) : null}
      <span style={{ fontWeight: 700, color: "#4ECDC4" }}>{caja.nombre}</span>
    </div>
    <div
      style={{
        padding: "18px 34px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {caja.filas.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 30,
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: fuente.mono,
              ...sinLigaduras,
              fontSize: 38,
              color: tonoDeFila(f),
              whiteSpace: "pre",
            }}
          >
            {f.texto}
          </span>
          {f.nota ? (
            <span
              style={{ fontSize: 28, color: color.tenue, fontStyle: "italic" }}
            >
              {f.nota}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  </div>
);

const Clases: React.FC<Props<"clases">> = ({ b, golpe }) => {
  const st = useAparece(golpe);
  return (
    <div
      style={{
        ...st,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 16,
      }}
    >
      {b.cajas.map((c, i) => (
        <React.Fragment key={c.nombre}>
          {i > 0 ? (
            <div
              style={{
                alignSelf: "center",
                fontSize: tam.etiqueta,
                color: color.tenue,
              }}
            >
              ↑ {b.flecha}
            </div>
          ) : null}
          <CajaDeClase caja={c} />
        </React.Fragment>
      ))}
    </div>
  );
};

export const VistaDeBloque: React.FC<{
  b: Bloque;
  golpe: number;
  acento: string;
  centrado?: boolean;
  ancho: number;
}> = (p) => {
  switch (p.b.k) {
    case "codigo":
      return <CodigoEnPlanteamiento {...p} b={p.b} />;
    case "terminal":
      return <TerminalEnPlanteamiento {...p} b={p.b} />;
    case "texto":
      return <Texto {...p} b={p.b} />;
    case "respuesta":
      return <Respuesta {...p} b={p.b} />;
    case "lista":
      return <Lista {...p} b={p.b} />;
    case "tabla":
      return <Tabla {...p} b={p.b} />;
    case "diario":
      return <Diario {...p} b={p.b} />;
    case "clases":
      return <Clases {...p} b={p.b} />;
  }
};
