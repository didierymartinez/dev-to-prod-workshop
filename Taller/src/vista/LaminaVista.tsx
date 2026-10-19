import React from "react";
import { AbsoluteFill } from "remotion";
import type { Lamina, Logro, Seccion, Tip } from "../contenido/tipos";
import {
  acento as acentos,
  color,
  etiqueta,
  fuente,
  lienzo,
  sinLigaduras,
  tono,
} from "../estilo/tema";
import type { LaminaUbicada } from "../tiempos";
import { Ajustar } from "./Ajustar";
import { InicioDeGolpes, useAparece } from "./aparecer";
import { VistaDeBloque } from "./bloques";
import {
  ConIcono,
  Codigo,
  Nota,
  Rotulo,
  Tarjeta,
  VistaDeTerminal,
} from "./piezas";
import { Rico } from "./Rico";

const LADO = 110; // margen a los costados
const ANCHO = lienzo.ancho - LADO * 2;

const Fondo: React.FC<{ acento: string }> = ({ acento }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${color.fondo} 0%, ${color.fondoAbajo} 100%)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        width: 1100,
        height: 1100,
        right: -380,
        top: -520,
        borderRadius: 550,
        background: `radial-gradient(circle, ${acento}22 0%, ${acento}00 65%)`,
      }}
    />
  </AbsoluteFill>
);

const Pie: React.FC<{
  seccion: Seccion;
  indice: number;
  total: number;
  acento: string;
}> = ({ seccion, indice, total, acento }) => (
  <div
    style={{
      position: "absolute",
      left: LADO,
      right: LADO,
      bottom: 40,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 26,
        color: color.muyTenue,
      }}
    >
      <span>
        {seccion.numero} · {seccion.titulo}
      </span>
      <span>
        {indice + 1} / {total}
      </span>
    </div>
    <div
      style={{
        height: 4,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          width: `${((indice + 1) / total) * 100}%`,
          height: 4,
          background: acento,
          borderRadius: 2,
          opacity: 0.7,
        }}
      />
    </div>
  </div>
);

/** El área de contenido: todo lo legible vive aquí, lejos de los bordes y del pie. */
const Area: React.FC<{
  children: React.ReactNode;
  gap?: number;
  ajustada?: boolean;
}> = ({ children, gap = 40, ajustada }) => (
  // `ajustada`: las pantallas de trabajo usan casi todo el alto; el pie ocupa los últimos ~90 px.
  <AbsoluteFill
    style={{
      padding: ajustada ? `64px ${LADO}px 104px` : `84px ${LADO}px 140px`,
      display: "flex",
      flexDirection: "column",
      gap,
    }}
  >
    {children}
  </AbsoluteFill>
);

const Encabezado: React.FC<{
  etiqueta: string;
  titulo?: string;
  acento: string;
  compacto?: boolean;
}> = ({ etiqueta: texto, titulo, acento, compacto }) => {
  const st = useAparece(0, 16);
  return (
    <div
      style={{
        ...st,
        display: "flex",
        flexDirection: "column",
        gap: compacto ? 4 : 8,
      }}
    >
      <div
        style={{ fontSize: compacto ? 30 : 32, fontWeight: 700, color: acento }}
      >
        <ConIcono texto={texto} />
      </div>
      {titulo ? (
        <div
          style={{
            fontSize: compacto ? 56 : 64,
            fontWeight: 800,
            color: color.texto,
            lineHeight: 1.1,
          }}
        >
          <Rico texto={titulo} acento={acento} />
        </div>
      ) : null}
    </div>
  );
};

// ── Portada ───────────────────────────────────────────────────────────────

const Portada: React.FC<{ seccion: Seccion; paraQue: string }> = ({
  seccion,
  paraQue,
}) => {
  const a = acentos.portada;
  const st0 = useAparece(0, 40);
  const st1 = useAparece(0, 24, 8);
  return (
    <AbsoluteFill
      style={{
        padding: `110px ${LADO + 40}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 56,
      }}
    >
      <div
        style={{ ...st0, fontSize: 34, color: color.tenue, fontWeight: 600 }}
      >
        Taller de Event Sourcing · Sección {seccion.numero}
      </div>
      <div style={{ ...st0, display: "flex", alignItems: "center", gap: 56 }}>
        <div
          style={{
            flex: "none",
            width: 190,
            height: 190,
            borderRadius: 95,
            border: `6px solid ${a}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 108,
            fontWeight: 800,
            color: a,
          }}
        >
          {seccion.numero}
        </div>
        <div
          style={{
            // los títulos largos bajan de tamaño para no pasar de dos líneas
            fontSize:
              seccion.titulo.length > 44
                ? 80
                : seccion.titulo.length > 28
                  ? 96
                  : 120,
            fontWeight: 800,
            color: color.texto,
            lineHeight: 1.06,
          }}
        >
          {seccion.titulo}
        </div>
      </div>
      <div
        style={{
          ...st1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 1500,
        }}
      >
        <div style={{ fontSize: 34, color: a, fontWeight: 700 }}>
          <ConIcono texto="🎯 Para qué" />
        </div>
        <div style={{ fontSize: 54, color: color.texto, lineHeight: 1.3 }}>
          <Rico texto={paraQue} acento={a} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Planteamiento ─────────────────────────────────────────────────────────

const Planteamiento: React.FC<{
  l: Extract<Lamina, { tipo: "planteamiento" }>;
  golpes: number[];
}> = ({ l, golpes }) => {
  const a = acentos.planteamiento;
  // ancho para código y terminal: a dos columnas, el de su columna
  const ancho = (i: number) =>
    !l.dosColumnas
      ? ANCHO
      : l.bloques[i].lado === "der"
        ? Math.round((ANCHO - 90) / 1.85)
        : Math.round(((ANCHO - 90) * 0.85) / 1.85);
  const bloque = (i: number) => (
    <VistaDeBloque
      key={i}
      b={l.bloques[i]}
      golpe={golpes[i]}
      acento={a}
      ancho={ancho(i)}
    />
  );
  const indices = l.bloques.map((_, i) => i);
  return (
    <Area>
      <Encabezado
        etiqueta={etiqueta.planteamiento}
        titulo={l.titulo}
        acento={a}
      />
      <Ajustar gap={34} nombre={l.titulo ?? "El problema"} centrar>
        {l.dosColumnas ? (
          <div style={{ display: "flex", gap: 90, alignItems: "center" }}>
            <div
              style={{
                flex: 0.85,
                display: "flex",
                flexDirection: "column",
                gap: 34,
              }}
            >
              {indices.filter((i) => l.bloques[i].lado !== "der").map(bloque)}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 34,
              }}
            >
              {indices.filter((i) => l.bloques[i].lado === "der").map(bloque)}
            </div>
          </div>
        ) : (
          indices.map(bloque)
        )}
      </Ajustar>
    </Area>
  );
};

// ── Reto: la pantalla de trabajo ──────────────────────────────────────────
// Queda a la vista mientras el grupo trabaja. Tres zonas, siempre en el mismo lugar:
//   arriba     HAZ ESTO (los pasos)            ·  TIPS (y LO LOGRAS, si hay ejemplo)
//   en medio   el EJEMPLO de código, a todo lo ancho (si lo hay)
//   abajo      LO LOGRAS CUANDO: la terminal y las comprobaciones, lado a lado

const Pasos: React.FC<{ pasos: string[]; acento: string }> = ({
  pasos,
  acento,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {pasos.map((p, i) => (
      <div
        key={i}
        style={{ display: "flex", gap: 18, alignItems: "flex-start" }}
      >
        <div
          style={{
            flex: "none",
            width: 42,
            height: 42,
            borderRadius: 21,
            background: acento,
            color: color.fondo,
            fontWeight: 800,
            fontSize: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {i + 1}
        </div>
        <div style={{ fontSize: 31, lineHeight: 1.34, color: color.texto }}>
          <Rico texto={p} acento={acento} />
        </div>
      </div>
    ))}
  </div>
);

const Comprobaciones: React.FC<{ items: string[]; acento: string }> = ({
  items,
  acento,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {items.map((t, i) => (
      <div
        key={i}
        style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
      >
        <span
          style={{
            fontSize: 30,
            color: tono.ok,
            fontWeight: 800,
            lineHeight: 1.32,
          }}
        >
          ✓
        </span>
        <div style={{ fontSize: 30, color: color.texto, lineHeight: 1.32 }}>
          <Rico texto={t} acento={acento} />
        </div>
      </div>
    ))}
  </div>
);

const Archivo: React.FC<{ archivo: NonNullable<Logro["archivo"]> }> = ({
  archivo,
}) => (
  <div>
    <div
      style={{
        display: "inline-block",
        padding: "8px 22px",
        background: "#141B2B",
        borderRadius: "12px 12px 0 0",
        fontFamily: fuente.mono,
        fontSize: 26,
        color: color.texto,
      }}
    >
      {archivo.nombre}
    </div>
    <div
      style={{
        background: color.codigo,
        borderRadius: "0 16px 16px 16px",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {archivo.zonas.map((z, i) => (
        <div
          key={z.etiqueta}
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            borderLeft: `5px solid ${i === 0 ? acentos.reto : tono.nuevo}`,
            background:
              i === 0 ? "rgba(78,205,196,0.08)" : "rgba(199,146,234,0.08)",
            fontSize: 28,
            color: color.texto,
          }}
        >
          <span
            style={{
              fontWeight: 800,
              color: i === 0 ? acentos.reto : tono.nuevo,
            }}
          >
            {z.etiqueta}:{" "}
          </span>
          <Rico texto={z.detalle} />
        </div>
      ))}
    </div>
  </div>
);

const VistaDeTip: React.FC<{ tip: Tip; acento: string }> = ({
  tip,
  acento,
}) => {
  const letra = 26;
  switch (tip.k) {
    case "nuevo":
      return (
        <div
          style={{
            fontSize: letra,
            lineHeight: 1.34,
            color: color.texto,
            borderLeft: `5px solid ${tono.nuevo}`,
            paddingLeft: 18,
          }}
        >
          <span style={{ color: tono.nuevo, fontWeight: 700 }}>🆕 </span>
          <span
            style={{
              fontFamily: fuente.mono,
              ...sinLigaduras,
              color: tono.nuevo,
              fontWeight: 700,
              whiteSpace: "pre-wrap",
            }}
          >
            {tip.idioma}
          </span>
          <span style={{ color: color.tenue }}> — </span>
          <Rico texto={tip.explicacion} />
        </div>
      );
    case "nota":
      return (
        <Nota icono="💡" texto={tip.texto} acento={acento} letra={letra} />
      );
    case "piensa":
      return (
        <Nota icono="🤔" texto={tip.texto} acento={tono.piensa} letra={letra} />
      );
    case "lista":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 25, color: color.tenue, fontWeight: 700 }}>
            {tip.titulo}
          </div>
          {tip.items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                fontSize: letra,
                lineHeight: 1.3,
                color: color.texto,
              }}
            >
              <span style={{ color: tono.ok, fontWeight: 800, width: 24 }}>
                {i + 1}
              </span>
              <span>
                <Rico texto={it} />
              </span>
            </div>
          ))}
        </div>
      );
  }
};

const Reto: React.FC<{
  l: Extract<Lamina, { tipo: "reto" | "rompelo" }>;
  reto?: { numero: number; total: number };
}> = ({ l, reto }) => {
  const a = acentos[l.tipo];
  const izq = useAparece(0, 24, 3);
  const der = useAparece(0, 24, 6);
  const abajo = useAparece(0, 24, 9);
  const rotulo =
    l.tipo === "rompelo"
      ? etiqueta.rompelo
      : `${etiqueta.reto}${reto && reto.total > 1 ? ` ${reto.numero} de ${reto.total}` : ""}`;

  const { terminal, items, archivo } = l.logro;
  const hayLogro = Boolean(terminal || items?.length || archivo);
  // Con ejemplo, el ancho de abajo es para el código y LO LOGRAS sube a la columna derecha.
  const logroArriba = Boolean(l.ejemplo) && hayLogro;
  const hayDerecha = logroArriba || Boolean(l.tips?.length);

  // En la columna derecha, LO LOGRAS va apilado; abajo va en una franja: rótulo al costado,
  // terminal y comprobaciones lado a lado.
  const logroEnColumna = (
    <Tarjeta estilo={{ borderColor: `${tono.ok}55`, gap: 16 }}>
      <Rotulo texto="✅ LO LOGRAS CUANDO" acento={tono.ok} />
      {archivo ? <Archivo archivo={archivo} /> : null}
      {terminal ? (
        <VistaDeTerminal t={terminal} ancho={600} base={28} envolver compacta />
      ) : null}
      {items?.length ? <Comprobaciones items={items} acento={a} /> : null}
    </Tarjeta>
  );
  const anchoTerminal = ANCHO - 60 - 200 - 30 - (items?.length ? 650 : 0);
  const logroEnFranja = (
    <Tarjeta
      estilo={{
        borderColor: `${tono.ok}55`,
        flexDirection: "row",
        alignItems: "center",
        gap: 28,
        padding: "18px 28px",
      }}
    >
      <div style={{ flex: "none", width: 200 }}>
        <Rotulo texto="✅ LO LOGRAS CUANDO" acento={tono.ok} />
      </div>
      {archivo ? <Archivo archivo={archivo} /> : null}
      {terminal ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <VistaDeTerminal
            t={terminal}
            ancho={anchoTerminal}
            base={items?.length ? 28 : 32}
            envolver={Boolean(items?.length)}
            compacta
          />
        </div>
      ) : null}
      {items?.length ? (
        <div
          style={
            terminal ? { flex: "none", width: 620 } : { flex: 1, minWidth: 0 }
          }
        >
          <Comprobaciones items={items} acento={a} />
        </div>
      ) : null}
    </Tarjeta>
  );

  const tarea = useAparece(0, 20, 2);
  return (
    <Area gap={18} ajustada>
      <Encabezado etiqueta={rotulo} titulo={l.titulo} acento={a} compacto />
      <Ajustar gap={18} nombre={l.titulo}>
        <div
          style={{
            ...tarea,
            fontSize: 32,
            lineHeight: 1.32,
            color: color.texto,
            borderLeft: `6px solid ${a}`,
            paddingLeft: 24,
          }}
        >
          <span style={{ color: a, fontWeight: 800 }}>
            <ConIcono texto="🎯 Tu tarea:" />{" "}
          </span>
          <Rico texto={l.tarea} acento={a} />
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          <Tarjeta estilo={{ ...izq, flex: hayDerecha ? 1.55 : 1 }}>
            <Rotulo texto="HAZ ESTO" acento={a} />
            <Pasos pasos={l.pasos} acento={a} />
          </Tarjeta>
          {hayDerecha ? (
            <div
              style={{
                ...der,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {logroArriba ? logroEnColumna : null}
              {l.tips?.length ? (
                <Tarjeta estilo={{ gap: 16, flex: 1 }}>
                  <Rotulo texto="💡 TIPS" acento={tono.piensa} />
                  {l.tips.map((t, i) => (
                    <VistaDeTip key={i} tip={t} acento={a} />
                  ))}
                </Tarjeta>
              ) : null}
            </div>
          ) : null}
        </div>
        {l.ejemplo ? (
          <div style={abajo}>
            <Codigo
              lineas={l.ejemplo.lineas}
              lenguaje={l.ejemplo.lenguaje}
              ancho={ANCHO}
              base={32}
              interlineado={1.45}
            />
          </div>
        ) : null}
        {!logroArriba && hayLogro ? (
          <div style={abajo}>{logroEnFranja}</div>
        ) : null}
      </Ajustar>
    </Area>
  );
};

// ── Código para copiar ────────────────────────────────────────────────────

const PantallaDeCodigo: React.FC<{
  l: Extract<Lamina, { tipo: "codigo" | "solucion" }>;
  reto?: { numero: number; total: number };
}> = ({ l, reto }) => {
  const solucion = l.tipo === "solucion";
  // la solución va en verde y dice de qué reto es; el código para copiar, del color de su reto
  const a = solucion ? acentos.solucion : acentos[l.de];
  const de =
    l.de === "rompelo"
      ? "del 🔨"
      : reto && reto.total > 1
        ? `· Reto ${reto.numero} de ${reto.total}`
        : "";
  const rotulo = solucion
    ? `${etiqueta.solucion} ${de}`.trim()
    : etiqueta[l.de];
  const st = useAparece(0, 24, 4);
  return (
    <Area gap={solucion ? 18 : 28} ajustada={solucion}>
      <Encabezado
        etiqueta={rotulo}
        titulo={l.titulo}
        acento={a}
        compacto={solucion}
      />
      <div style={{ ...st, flex: 1, minHeight: 0, display: "flex" }}>
        <Ajustar
          gap={solucion ? 16 : 24}
          nombre={l.titulo}
          minimo={solucion ? 0.8 : 0.88}
        >
          {l.piezas.map((x) => (
            <div
              key={x.etiqueta}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div
                style={{
                  fontSize: solucion ? 28 : 30,
                  color: color.texto,
                  lineHeight: 1.3,
                }}
              >
                <Rico texto={x.etiqueta} acento={a} />
              </div>
              <Codigo
                lineas={x.lineas}
                lenguaje={x.lenguaje}
                ancho={ANCHO}
                base={solucion ? 26 : 30}
                interlineado={solucion ? 1.35 : 1.45}
              />
            </div>
          ))}
          {l.tipo === "codigo" && l.luego ? (
            <div style={{ fontSize: 32, color: a, fontWeight: 700 }}>
              → <Rico texto={l.luego} acento={a} />
            </div>
          ) : null}
          {l.tipo === "solucion" && l.nota ? (
            <div style={{ fontSize: 30, color: color.texto, lineHeight: 1.32 }}>
              <Rico texto={l.nota} acento={a} />
            </div>
          ) : null}
        </Ajustar>
      </div>
    </Area>
  );
};

// ── Aprendizaje ───────────────────────────────────────────────────────────

const Aprendizaje: React.FC<{
  l: Extract<Lamina, { tipo: "aprendizaje" }>;
}> = ({ l }) => {
  const a = acentos.aprendizaje;
  const st0 = useAparece(0, 24, 3);
  const st1 = useAparece(1);
  const rotuloTenue: React.CSSProperties = {
    fontSize: 28,
    color: color.tenue,
    fontWeight: 600,
  };
  return (
    <Area gap={34}>
      <Encabezado etiqueta={etiqueta.aprendizaje} acento={a} />
      <Ajustar gap={0} nombre="Lo que te llevas">
        <div style={{ display: "flex", gap: 50 }}>
          <div
            style={{
              ...st0,
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              gap: 34,
            }}
          >
            <div
              style={{
                fontSize: 50,
                fontWeight: 700,
                lineHeight: 1.25,
                color: color.texto,
              }}
            >
              <Rico texto={l.idea} acento={a} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {l.puntos.map((p) => (
                <div
                  key={p.termino}
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <div
                    style={{ fontSize: 38, fontWeight: 800, color: tono.nuevo }}
                  >
                    {p.termino}
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      color: color.texto,
                      lineHeight: 1.3,
                    }}
                  >
                    <Rico texto={p.definicion} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              ...st1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <Tarjeta estilo={{ borderColor: `${a}55` }}>
              <Rotulo texto="📓 CIERRA LA SECCIÓN" acento={a} />
              {l.decision ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div style={rotuloTenue}>En tu DECISIONES.md:</div>
                  <div
                    style={{
                      fontSize: 32,
                      color: color.texto,
                      fontStyle: "italic",
                      lineHeight: 1.32,
                      borderLeft: `5px solid ${a}`,
                      paddingLeft: 20,
                    }}
                  >
                    «<Rico texto={l.decision} />»
                  </div>
                </div>
              ) : null}
              {l.commit ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div style={rotuloTenue}>Commit y push:</div>
                  <div
                    style={{
                      alignSelf: "flex-start",
                      fontFamily: fuente.mono,
                      fontSize: 32,
                      color: tono.piensa,
                      background: color.codigo,
                      borderRadius: 12,
                      padding: "10px 20px",
                    }}
                  >
                    {l.commit.mensaje}
                  </div>
                  <div style={{ ...rotuloTenue, marginTop: 6 }}>
                    <ConIcono texto="💭 Tu reflexión, en el segundo -m:" />
                  </div>
                  {l.commit.preguntas.map((q) => (
                    <div
                      key={q}
                      style={{
                        fontSize: 33,
                        color: color.texto,
                        lineHeight: 1.3,
                      }}
                    >
                      <Rico texto={q} acento={a} />
                    </div>
                  ))}
                </div>
              ) : null}
              {l.guardar ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div style={rotuloTenue}>Una pregunta para guardar:</div>
                  <div
                    style={{
                      fontSize: 34,
                      color: color.texto,
                      lineHeight: 1.32,
                    }}
                  >
                    <Rico texto={l.guardar} acento={a} />
                  </div>
                </div>
              ) : null}
            </Tarjeta>
            {l.siguiente ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "0 6px",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: acentos.portada,
                  }}
                >
                  <ConIcono
                    texto={`🌱 Lo que viene · ${l.siguiente.seccion}`}
                  />
                </div>
                <div
                  style={{ fontSize: 30, color: color.tenue, lineHeight: 1.3 }}
                >
                  <Rico texto={l.siguiente.texto} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Ajustar>
    </Area>
  );
};

// ── Lámina ────────────────────────────────────────────────────────────────

export const LaminaVista: React.FC<{ u: LaminaUbicada }> = ({ u }) => {
  const l = u.lamina;
  const a = l.tipo === "codigo" ? acentos[l.de] : acentos[l.tipo];
  return (
    <InicioDeGolpes.Provider value={u.plan.inicios}>
      <AbsoluteFill style={{ fontFamily: fuente.sans, color: color.texto }}>
        <Fondo acento={a} />
        {l.tipo === "portada" ? (
          <Portada seccion={u.seccion} paraQue={l.paraQue} />
        ) : null}
        {l.tipo === "planteamiento" ? (
          <Planteamiento l={l} golpes={u.plan.golpeDeBloque} />
        ) : null}
        {l.tipo === "reto" || l.tipo === "rompelo" ? (
          <Reto l={l} reto={u.reto} />
        ) : null}
        {l.tipo === "codigo" || l.tipo === "solucion" ? (
          <PantallaDeCodigo l={l} reto={u.reto} />
        ) : null}
        {l.tipo === "aprendizaje" ? <Aprendizaje l={l} /> : null}
        <Pie
          seccion={u.seccion}
          indice={u.indiceEnSeccion}
          total={u.totalEnSeccion}
          acento={a}
        />
      </AbsoluteFill>
    </InicioDeGolpes.Provider>
  );
};
