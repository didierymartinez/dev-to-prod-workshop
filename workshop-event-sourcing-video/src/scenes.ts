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
import { CODE_LEAP_DURATION } from "./components/CodeLeap";

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
    case "ifs-to-switch":
    case "wrapper-to-generic":
    case "insert-to-decide":
      return CODE_LEAP_DURATION;
  }
};

// Mecanismos que ya MUESTRAN el código sincronizado adentro → no repetir una escena de código aparte.
const MECHANISMS_WITH_CODE = new Set<Section["mechanism"]>([
  "replay-evolve",
  "engine-switch",
  "repository",
  "decide",
]);

export function buildScenes(section: Section): SceneDesc[] {
  const scenes: SceneDesc[] = [];
  scenes.push({ kind: "title", durationInFrames: 95 });

  // Puente: enlaza con la sección anterior (de dónde venimos → por qué seguimos).
  if (section.bridge) {
    scenes.push({ kind: "bridge", durationInFrames: textDuration(section.bridge) });
  }

  scenes.push({ kind: "objetivo", durationInFrames: textDuration(section.objetivo) });

  // El descubrimiento grande (salto conceptual) y el mecanismo animado. El ORDEN sigue el
  // hilo conductor de la sección: por defecto el descubrimiento (el salto) va ANTES del
  // mecanismo (que muestra el resultado); pero cuando el salto es CONSECUENCIA del mecanismo
  // (§2: primero el replay suelto funciona, después se agrupa en la clase) va DESPUÉS.
  const discScene: SceneDesc | null = section.discovery
    ? { kind: "discovery", durationInFrames: discoveryDuration(section.discovery) }
    : null;
  const mechScene: SceneDesc | null = section.mechanism
    ? { kind: "mechanism", durationInFrames: mechanismDuration(section.mechanism) }
    : section.pain
      ? { kind: "pain", durationInFrames: 160 }
      : null;

  for (const sc of section.discoveryAfterMechanism ? [mechScene, discScene] : [discScene, mechScene]) {
    if (sc) scenes.push(sc);
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
