"use client";

import { useEffect, useRef, useState } from "react";

/** Hauteur du panneau du bas sur mobile, pour que la carte se recadre au-dessus. */
export function useSheetHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(window.innerWidth < 768 ? el.offsetHeight : 0);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, height };
}
