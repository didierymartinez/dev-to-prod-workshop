// Cómo se arma cada video a partir de los datos de una sección.
// La MISMA función la usan el Root (para calcular la duración total) y SectionVideo (para renderizar),
// así nunca se desincronizan.

import { Section } from "./data/sections";
import { REPLAY_DURATION } from "./components/ReplayFlow";
import { DIARIO_VS_FOTO_DURATION } from "./components/DiarioVsFoto";
import { ENGINE_SWITCH_DURATION } from "./components/EngineSwitch";
import { REPOSITORY_DURATION } from "./components/RepositoryFlow";
import { DECIDE_DURATION } from "./components/DecideFlow";
import { LOOSE_TO_CLASS_DURATION } from "./components/LooseToClass";

export type SceneKind =
  | "title"
  | "bridge"
  | "objetivo"
  | "discovery"
  | "pain"
  | "mechanism"
  | "code"
  | "oneliner";

export type SceneDesc = { kind: SceneKind; durationInFrames: number };

// Tiempo de lectura: la duración crece con el largo del texto (que no se quite antes de leerlo).
const clampN = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(hi, v));
const textDuration = (text: string, perWord = 7.5, base = 60): number =>
  clampN(150, Math.round(base + text.trim().split(/\s+/).length * perWord), 400);

const mechanismDuration = (m: NonNullable<Section["mechanism"]>): number => {
  switch (m) {
    case "diario-vs-foto":
      return DIARIO_VS_FOTO_DURATION;
    case "replay-evolve":
      return REPLAY_DURATION;
    case "engine-switch":
      return ENGINE_SWITCH_DURATION;
    case "repository":
      return REPOSITORY_DURATION;
    case "decide":
      return DECIDE_DURATION;
  }
};

const discoveryDuration = (d: NonNullable<Section["discovery"]>): number => {
  switch (d) {
    case "loose-to-class":
      return LOOSE_TO_CLASS_DURATION;
  }
};

// Mecanismos que ya MUESTRAN el código sincronizado adentro → no repetir una escena de código aparte.
const MECHANISMS_WITH_CODE = new Set<Section["mechanism"]>(["replay-evolve"]);

export function buildScenes(section: Section): SceneDesc[] {
  const scenes: SceneDesc[] = [];
  scenes.push({ kind: "title", durationInFrames: 95 });

  // Puente: enlaza con la sección anterior (de dónde venimos → por qué seguimos).
  if (section.bridge) {
    scenes.push({ kind: "bridge", durationInFrames: textDuration(section.bridge) });
  }

  scenes.push({ kind: "objetivo", durationInFrames: textDuration(section.objetivo) });

  // El descubrimiento grande (p. ej. variables sueltas → clase Empresa): se marca aparte.
  if (section.discovery) {
    scenes.push({ kind: "discovery", durationInFrames: discoveryDuration(section.discovery) });
  }

  // El corazón: el MECANISMO animado (la evolución/flujo del concepto).
  if (section.mechanism) {
    scenes.push({ kind: "mechanism", durationInFrames: mechanismDuration(section.mechanism) });
  } else if (section.pain) {
    scenes.push({ kind: "pain", durationInFrames: 160 });
  }

  // Código como beat aparte SOLO si el mecanismo no lo muestra ya sincronizado.
  if (section.code && !MECHANISMS_WITH_CODE.has(section.mechanism)) {
    scenes.push({
      kind: "code",
      durationInFrames: 165 + section.code.lines.length * 7,
    });
  }

  scenes.push({
    kind: "oneliner",
    durationInFrames: textDuration(section.oneLiner) + section.concepts.length * 6,
  });
  return scenes;
}

export const totalFrames = (section: Section): number =>
  buildScenes(section).reduce((acc, s) => acc + s.durationInFrames, 0);
