import { TrackView } from "@/components/TrackView";

export const metadata = {
  title: "Suivi de course — SURPLACE",
  // Lien privé : il ne doit pas apparaître dans les moteurs de recherche.
  robots: { index: false, follow: false },
};

/** Page ouverte par un proche grâce au lien « Partager ma course » (aucun compte nécessaire). */
export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackView token={token} />;
}
