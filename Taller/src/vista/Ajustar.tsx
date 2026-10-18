// Red de seguridad para las pantallas de trabajo: si el contenido no cabe en el alto que
// le toca, se reduce un poco (con `zoom`, que reacomoda el texto) hasta un mínimo.
// Si ni así cabe, avisa en la consola: esa pantalla hay que partirla en dos.
//
// Remotion monta cada lámina un poco antes de mostrarla, todavía oculta (premount), y ahí
// el alto disponible es 0. Por eso se mide con un ResizeObserver: cada vez que la caja
// toma su tamaño real, se vuelve a medir. El render espera a la primera medida válida
// (delayRender), para que ninguna foto ni video salga a medio ajustar.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";

export const Ajustar: React.FC<{
  children: React.ReactNode;
  gap: number;
  minimo?: number;
  nombre: string;
  /** Centra el contenido en el alto disponible (el problema se ve centrado). */
  centrar?: boolean;
}> = ({ children, gap, minimo = 0.88, nombre, centrar }) => {
  const caja = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [medido, setMedido] = useState(false);
  const [espera] = useState(() =>
    delayRender(`Ajustar «${nombre}» al alto de la lámina`),
  );

  useLayoutEffect(() => {
    const c = caja.current;
    const d = dentro.current;
    if (!c || !d) return;
    let vigente = true;
    const medir = () => {
      if (!vigente) return;
      const disponible = c.clientHeight;
      if (disponible === 0) return; // oculta (premount): se mide cuando aparezca
      const antes = d.style.zoom;
      d.style.zoom = "1"; // se mide sin reducir
      // offsetHeight: el alto del diseño, sin el desplazamiento de la animación de entrada
      const necesita = d.offsetHeight;
      const z =
        necesita > disponible ? Math.max(minimo, disponible / necesita) : 1;
      // con el zoom puesto el texto se reacomoda: se mide lo que de verdad ocupa
      d.style.zoom = String(z);
      const ocupa = d.offsetHeight * z;
      d.style.zoom = antes;
      if (ocupa > disponible + 2) {
        console.error(
          `[taller] «${nombre}» no cabe ni al ${Math.round(minimo * 100)} %: pártela en dos pantallas.`,
        );
      }
      setZoom(z);
      setMedido(true);
    };
    const observador = new ResizeObserver(medir);
    observador.observe(c);
    void document.fonts.ready.then(medir);
    return () => {
      vigente = false;
      observador.disconnect();
    };
  }, [minimo, nombre]);

  // El render sigue recién cuando el zoom de una medida válida ya está en el DOM.
  useEffect(() => {
    if (medido) continueRender(espera);
  }, [medido, espera]);

  return (
    <div
      ref={caja}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: centrar ? "center" : "flex-start",
      }}
    >
      <div
        ref={dentro}
        style={{ zoom, display: "flex", flexDirection: "column", gap }}
      >
        {children}
      </div>
    </div>
  );
};
