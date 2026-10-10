import type { MetadataRoute } from "next";

/** Rend l'application installable sur le téléphone (icône sur l'écran d'accueil, plein écran). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SURPLACE — Taxi-moto à Korhogo",
    short_name: "SURPLACE",
    description: "Commandez un taxi-moto en quelques secondes à Korhogo. Prix fixé à l'avance, paiement en espèces.",
    start_url: "/passager",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#ff6b00",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Commander une moto", url: "/passager" },
      { name: "Espace chauffeur", url: "/chauffeur" },
    ],
  };
}
