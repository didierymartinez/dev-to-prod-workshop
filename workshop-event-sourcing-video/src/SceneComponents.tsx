// Las escenas que componen cada video. Todas reciben { section, durationInFrames }.
import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "./theme";
import { Section } from "./data/sections";
import { Scene, FadeUp, Label } from "./components/anim";
import { CodeBlock } from "./components/CodeBlock";
import { DiarioVsFoto } from "./components/DiarioVsFoto";
import { ReplayFlow } from "./components/ReplayFlow";
import { EngineSwitch } from "./components/EngineSwitch";
import { RepositoryFlow } from "./components/RepositoryFlow";
import { DecideFlow } from "./components/DecideFlow";
import { LooseToClass } from "./components/LooseToClass";
import { CodeLeap } from "./components/CodeLeap";
import { BeatSequence } from "./components/BeatSequence";

type SceneProps = { section: Section; durationInFrames: number };

const center: React.CSSProperties = {
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "120px 130px 150px",
  flexDirection: "column",
};

export const TitleScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={center}>
      <FadeUp delay={0}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: 40,
            color: section.accent,
            letterSpacing: 2,
          }}
        >
          {String(section.number).padStart(2, "0")} · EVENT SOURCING
        </div>
      </FadeUp>
      <FadeUp delay={6}>
        <div style={{ fontSize: 150, lineHeight: 1.1, margin: "8px 0 4px" }}>
          {section.emoji}
        </div>
      </FadeUp>
      <FadeUp delay={11}>
        <h1
          style={{
            fontFamily: theme.fontSans,
            fontSize: 108,
            fontWeight: 800,
            color: theme.text,
            margin: "6px 0 18px",
            maxWidth: 1500,
            lineHeight: 1.04,
          }}
        >
          {section.title}
        </h1>
      </FadeUp>
      <FadeUp delay={17}>
        <div style={{ fontFamily: theme.fontSans, fontSize: 46, color: theme.textDim }}>
          {section.subtitle}
        </div>
      </FadeUp>
    </AbsoluteFill>
  </Scene>
);

export const ObjectiveScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={center}>
      <FadeUp delay={0}>
        <Label color={section.accent}>🎯 El objetivo</Label>
      </FadeUp>
      <FadeUp delay={9} style={{ marginTop: 54 }}>
        <p
          style={{
            fontFamily: theme.fontSans,
            fontSize: 62,
            lineHeight: 1.35,
            color: theme.text,
            maxWidth: 1540,
            fontWeight: 500,
            margin: 0,
          }}
        >
          {section.objetivo}
        </p>
      </FadeUp>
    </AbsoluteFill>
  </Scene>
);

export const PainScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={center}>
      <FadeUp delay={0}>
        <Label color={theme.pain}>💥 El dolor</Label>
      </FadeUp>
      <FadeUp delay={9} style={{ marginTop: 44 }}>
        <h2
          style={{
            fontFamily: theme.fontSans,
            fontSize: 72,
            fontWeight: 800,
            color: theme.pain,
            margin: "0 0 26px",
            maxWidth: 1500,
            lineHeight: 1.1,
          }}
        >
          {section.pain?.title}
        </h2>
      </FadeUp>
      <FadeUp delay={16}>
        <p
          style={{
            fontFamily: theme.fontSans,
            fontSize: 48,
            lineHeight: 1.4,
            color: theme.textDim,
            maxWidth: 1380,
            margin: 0,
          }}
        >
          {section.pain?.text}
        </p>
      </FadeUp>
    </AbsoluteFill>
  </Scene>
);

// Puente: enlaza con la sección anterior (hilo narrativo, no temas sueltos).
export const BridgeScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={center}>
      <FadeUp delay={0}>
        <Label color={theme.textDim}>↪ el hilo — de dónde venimos</Label>
      </FadeUp>
      <FadeUp delay={10} style={{ marginTop: 50 }}>
        <p
          style={{
            fontFamily: theme.fontSans,
            fontSize: 58,
            lineHeight: 1.42,
            color: theme.text,
            maxWidth: 1540,
            fontWeight: 500,
            margin: 0,
          }}
        >
          {section.bridge}
        </p>
      </FadeUp>
    </AbsoluteFill>
  </Scene>
);

// El descubrimiento grande de la sección (salto conceptual marcado).
const renderDiscovery = (section: Section) => {
  const a = section.accent;
  switch (section.discovery) {
    case "loose-to-class":
      return <LooseToClass accent={a} />;
    case "ifs-to-switch":
      return (
        <CodeLeap
          accent={a}
          before={[
            "if (hecho is EmpresaRegistrada r) { … }",
            "if (hecho is PlanCambiado p)      { … }",
            "if (hecho is EmpresaSuspendida)   { … }",
            "// otro hecho → otro if … crece",
          ]}
          after={["switch (hecho)", "{", "    case EmpresaRegistrada r: …", "    case PlanCambiado p:      …", "}"]}
          title="del if que crece al switch tipado"
          sub="un case por tipo (pattern matching) — y el motor sube a la base abstracta AggregateRoot"
        />
      );
    case "wrapper-to-generic":
      return (
        <CodeLeap
          accent={a}
          beforeLabel="específico — uno por tipo"
          afterLabel="genérico — uno para todos"
          before={[
            "class EventStreamDeEmpresa",
            "{",
            "    Empresa Get()",
            "    { var e = new Empresa();",
            "      e.Load(_historia); return e; }",
            "}",
          ]}
          after={[
            "class EventStream<T>",
            "    where T : AggregateRoot, new()",
            "{",
            "    T Get()",
            "    { var e = new T();",
            "      e.Load(_historia); return e; }",
            "}",
          ]}
          title="de «De Empresa» a «<T>»: un Repositorio genérico"
          sub="el tipo se vuelve un parámetro: new Empresa() → new T(); uno solo para Empresa, Factura, Pedido…"
        />
      );
    case "insert-to-decide":
      return (
        <CodeLeap
          accent={a}
          before={["// metíamos hechos a la fuerza:", 'stream.Append(new PlanCambiado("X"));', "// ¿quién valida que se PUEDE? nadie"]}
          after={["// la empresa decide y emite:", 'var h = empresa.CambiarPlan("X");', "// mira su estado, protege sus reglas"]}
          title="de insertar hechos a que la empresa decida"
          sub="el agregado es dueño de sus reglas: emite el hecho (o lo rechaza)"
        />
      );
    default:
      return null;
  }
};

export const DiscoveryScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 70 }}>
      <FadeUp delay={0}>
        <Label color={section.accent}>💡 El descubrimiento</Label>
      </FadeUp>
    </AbsoluteFill>
    {renderDiscovery(section)}
  </Scene>
);

// El mecanismo animado: el centro de la sección. Muestra la evolución/flujo del concepto.
const LABELS: Record<NonNullable<Section["mechanism"]>, string> = {
  "diario-vs-foto": "📔 El mecanismo — el diario vs la foto",
  "replay-evolve": "⚙️ El mecanismo — el Replay (evolve)",
  "engine-switch": "⚙️ El mecanismo — el switch que enruta por tipo",
  "repository": "📦 El mecanismo — Append / Get (el Repositorio)",
  "decide": "🧭 El mecanismo — decidir · cargar→actuar→guardar",
  "beats": "⚙️ El mecanismo — paso a paso",
};

const renderMechanism = (section: Section) => {
  switch (section.mechanism) {
    case "diario-vs-foto":
      return <DiarioVsFoto accent={section.accent} />;
    case "replay-evolve":
      return <ReplayFlow accent={section.accent} />;
    case "engine-switch":
      return <EngineSwitch accent={section.accent} />;
    case "repository":
      return <RepositoryFlow accent={section.accent} />;
    case "decide":
      return <DecideFlow accent={section.accent} />;
    case "beats":
      return <BeatSequence accent={section.accent} beats={section.beats ?? []} />;
    default:
      return null;
  }
};

export const MechanismScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 70 }}>
      <FadeUp delay={0}>
        <Label color={section.accent}>
          {section.mechanism ? LABELS[section.mechanism] : "⚙️ El mecanismo"}
        </Label>
      </FadeUp>
    </AbsoluteFill>
    {renderMechanism(section)}
  </Scene>
);

export const CodeScene: React.FC<SceneProps> = ({ section, durationInFrames }) => {
  const code = section.code!;
  return (
    <Scene durationInFrames={durationInFrames}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "90px 110px 150px",
          flexDirection: "column",
        }}
      >
        <FadeUp delay={0} style={{ marginBottom: 30 }}>
          <Label color={section.accent}>🔧 El código</Label>
        </FadeUp>
        <CodeBlock lines={code.lines} filename={code.filename} accent={section.accent} />
        <FadeUp delay={code.lines.length * 6 + 22} style={{ marginTop: 30 }}>
          <p
            style={{
              fontFamily: theme.fontSans,
              fontSize: 38,
              lineHeight: 1.35,
              color: theme.textDim,
              maxWidth: 1480,
              textAlign: "center",
              margin: 0,
            }}
          >
            {code.caption}
          </p>
        </FadeUp>
      </AbsoluteFill>
    </Scene>
  );
};

export const OneLinerScene: React.FC<SceneProps> = ({ section, durationInFrames }) => (
  <Scene durationInFrames={durationInFrames}>
    <AbsoluteFill style={center}>
      <FadeUp delay={0}>
        <Label color={section.accent}>🧠 En una frase</Label>
      </FadeUp>
      <FadeUp delay={9} style={{ marginTop: 50 }}>
        <p
          style={{
            fontFamily: theme.fontSans,
            fontSize: 58,
            lineHeight: 1.4,
            color: theme.text,
            maxWidth: 1560,
            fontWeight: 600,
            margin: 0,
          }}
        >
          “{section.oneLiner}”
        </p>
      </FadeUp>
      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 1500,
          marginTop: 56,
        }}
      >
        {section.concepts.map((c, i) => (
          <FadeUp key={c} delay={22 + i * 5}>
            <span
              style={{
                display: "inline-block",
                padding: "12px 26px",
                borderRadius: 999,
                background: `${section.accent}1A`,
                border: `1px solid ${section.accent}66`,
                color: section.accent,
                fontFamily: theme.fontSans,
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {c}
            </span>
          </FadeUp>
        ))}
      </div>
    </AbsoluteFill>
  </Scene>
);
