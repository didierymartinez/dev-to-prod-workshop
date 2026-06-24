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
          {section.pain.title}
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
          {section.pain.text}
        </p>
      </FadeUp>
    </AbsoluteFill>
  </Scene>
);

// El mecanismo animado: el centro de la sección. Muestra la evolución/flujo del concepto.
const LABELS: Record<NonNullable<Section["mechanism"]>, string> = {
  "diario-vs-foto": "📔 El mecanismo — el diario vs la foto",
  "replay-evolve": "⚙️ El mecanismo — el Replay (evolve)",
  "engine-switch": "⚙️ El mecanismo — el switch que enruta por tipo",
  "repository": "📦 El mecanismo — Append / Get (el Repositorio)",
  "decide": "🧭 El mecanismo — decidir (emite · rechaza · no-op)",
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
