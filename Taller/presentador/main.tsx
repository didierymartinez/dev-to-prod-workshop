// Modo presentación: las mismas láminas del video, pero avanzas tú.
// → / espacio / AvPág / clic: siguiente golpe (con su animación).  ← / RePág: anterior.
// Un número (p. ej. 4 y 2): salta al inicio de esa sección.  F: pantalla completa.  H: ayuda.
import { Player, type PlayerRef } from "@remotion/player";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { secciones } from "../src/contenido";
import { lienzo } from "../src/estilo/tema";
import { Presentacion } from "../src/Presentacion";
import { duracionTotal, paradas as calcularParadas } from "../src/tiempos";

const posicionInicial = (total: number) => {
  const n = Number(window.location.hash.replace("#", ""));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, total) - 1 : 0;
};

const Ayuda: React.FC<{ alCerrar: () => void }> = ({ alCerrar }) => (
  <div
    onClick={alCerrar}
    style={{
      position: "fixed",
      right: 24,
      bottom: 24,
      background: "rgba(14,19,32,0.92)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: "16px 20px",
      color: "#E6E9EF",
      font: "15px/1.6 -apple-system, 'Segoe UI', sans-serif",
      cursor: "pointer",
    }}
  >
    <b>Modo presentación</b>
    <br />→ espacio AvPág clic: siguiente · ← RePág: anterior
    <br />
    número (p. ej. 4 y 2): ir a la sección · F: pantalla completa · H: ocultar
    esta ayuda
  </div>
);

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  const numeros = useMemo(() => secciones.map((s) => s.numero), []);
  const paradas = useMemo(() => calcularParadas(secciones), []);
  const total = useMemo(() => duracionTotal(secciones), []);
  const [indice, setIndice] = useState(() => posicionInicial(paradas.length));
  const actual = useRef(indice);
  const detenerEn = useRef<number | null>(null);
  const [ayuda, setAyuda] = useState(true);
  // Los dígitos que vas tecleando para saltar a una sección (se aplican a los 0,7 s).
  const numero = useRef("");
  const [tecleado, setTecleado] = useState("");
  const temporizador = useRef<number | undefined>(undefined);

  const ir = useCallback(
    (n: number, animar: boolean) => {
      const reproductor = ref.current;
      if (!reproductor) return;
      const k = Math.max(0, Math.min(paradas.length - 1, n));
      const p = paradas[k];
      actual.current = k;
      setIndice(k);
      window.history.replaceState(null, "", `#${k + 1}`);
      if (animar) {
        detenerEn.current = p.fin;
        reproductor.seekTo(p.inicio);
        reproductor.play();
      } else {
        detenerEn.current = null;
        reproductor.pause();
        reproductor.seekTo(p.fin);
      }
    },
    [paradas],
  );

  // Detiene la animación al terminar la entrada del golpe.
  useEffect(() => {
    const reproductor = ref.current;
    if (!reproductor) return;
    const alAvanzar = (e: { detail: { frame: number } }) => {
      const f = detenerEn.current;
      if (f !== null && e.detail.frame >= f) {
        detenerEn.current = null;
        reproductor.pause();
        reproductor.seekTo(f);
      }
    };
    reproductor.addEventListener("frameupdate", alAvanzar);
    ir(actual.current, false);
    return () => reproductor.removeEventListener("frameupdate", alAvanzar);
  }, [ir]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const k = actual.current;
      if (
        ["ArrowRight", " ", "PageDown", "Enter", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        ir(k + 1, true);
      } else if (
        ["ArrowLeft", "PageUp", "Backspace", "ArrowUp"].includes(e.key)
      ) {
        e.preventDefault();
        ir(k - 1, false);
      } else if (e.key === "Home") {
        ir(0, false);
      } else if (e.key === "End") {
        ir(paradas.length - 1, false);
      } else if (/^[0-9]$/.test(e.key)) {
        numero.current = (numero.current + e.key).slice(-2);
        setTecleado(numero.current);
        window.clearTimeout(temporizador.current);
        temporizador.current = window.setTimeout(() => {
          const destino = paradas.findIndex(
            (p) => p.seccion === Number(numero.current) && p.primeraDeSeccion,
          );
          numero.current = "";
          setTecleado("");
          if (destino >= 0) ir(destino, true);
        }, 700);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      } else if (e.key === "h" || e.key === "H" || e.key === "?") {
        setAyuda((a) => !a);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [ir, paradas]);

  const p = paradas[indice];
  return (
    <div
      onClick={() => ir(actual.current + 1, true)}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        cursor: "pointer",
      }}
      title={`Sección ${p?.seccion} · lámina ${(p?.lamina ?? 0) + 1}`}
    >
      <Player
        ref={ref}
        component={Presentacion}
        inputProps={{ secciones: numeros }}
        durationInFrames={total}
        fps={lienzo.fps}
        compositionWidth={lienzo.ancho}
        compositionHeight={lienzo.alto}
        style={{ width: "100vw", height: "100vh" }}
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
      />
      {tecleado ? (
        <div
          style={{
            position: "fixed",
            left: 24,
            bottom: 24,
            background: "rgba(14,19,32,0.92)",
            color: "#4ECDC4",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: "10px 18px",
            font: "700 22px -apple-system, 'Segoe UI', sans-serif",
          }}
        >
          Ir a la sección {tecleado}…
        </div>
      ) : null}
      {ayuda ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Ayuda alCerrar={() => setAyuda(false)} />
        </div>
      ) : null}
    </div>
  );
};

createRoot(document.getElementById("raiz")!).render(<App />);
