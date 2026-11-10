"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nombre qui défile de 0 jusqu'à sa valeur la première fois qu'il apparaît, puis d'une valeur à la
 * suivante quand elle change. `format` met en forme chaque étape (FCFA, séparateur de milliers…).
 */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("fr-FR"),
  duration = 900,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    let frame = 0;
    const start = from.current;
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(start + (value - start) * eased);
        if (p < 1) frame = requestAnimationFrame(step);
        else from.current = value;
      };
      frame = requestAnimationFrame(step);
    };
    // Première apparition : on attend que le nombre soit visible.
    const el = ref.current;
    if (start === 0 && el && "IntersectionObserver" in window) {
      setShown(0);
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        run();
      });
      observer.observe(el);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
      };
    }
    run();
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(shown)}
    </span>
  );
}
