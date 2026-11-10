"use client";
// ⚠️ Fichier copié depuis Commun/components/ScrollReveal.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import { useEffect } from "react";

/**
 * Fait apparaître en douceur les éléments marqués `data-reveal` quand ils entrent à l'écran.
 * À placer une fois dans la page. Sans JavaScript (ou animations réduites), tout reste visible :
 * les éléments ne sont masqués qu'une fois la classe `reveal-ready` posée sur <html>.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    const items = document.querySelectorAll("[data-reveal]");
    // Ce qui est déjà à l'écran au chargement apparaît sans attendre le défilement.
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      else observer.observe(el);
    });
    root.classList.add("reveal-ready");
    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
