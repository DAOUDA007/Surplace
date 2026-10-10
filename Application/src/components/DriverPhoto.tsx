"use client";

import { useState } from "react";

/** Photo du chauffeur (envoyée avec ses documents), sinon l'initiale de son nom. */
export function DriverPhoto({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!src || failed) {
    return (
      <span style={style} className="grid shrink-0 place-items-center rounded-full bg-contrast text-lg font-bold text-on-contrast">
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Photo de ${name}`} style={style} onError={() => setFailed(true)} className="shrink-0 rounded-full object-cover ring-2 ring-brand" />
  );
}
