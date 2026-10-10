// ⚠️ Fichier copié depuis Commun/components/Logo.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg text-white shadow-sm">
        🏍️
      </span>
      <span className={`text-xl ${light ? "text-white" : "text-ink"}`}>
        SUR<span className="text-brand">PLACE</span>
      </span>
    </Link>
  );
}
