import type { MetadataRoute } from "next";

/** L'espace d'administration peut aussi être installé sur le téléphone de l'équipe (alertes d'urgence). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SURPLACE — Administration",
    short_name: "SURPLACE Admin",
    start_url: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
