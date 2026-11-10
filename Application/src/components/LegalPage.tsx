import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TERMS_VERSION } from "@/lib/site";

/** Mise en page commune aux conditions d'utilisation et à la politique de confidentialité. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const updated = new Date(`${TERMS_VERSION}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <main className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-line" />
        </div>
      </header>
      <article className="animate-fade-up mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Version du {updated}</p>
        <p className="mt-6 text-lg text-muted">{intro}</p>
        <nav className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/conditions" className="rounded-full bg-subtle px-4 py-2 transition hover:bg-line">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="rounded-full bg-subtle px-4 py-2 transition hover:bg-line">
            Politique de confidentialité
          </Link>
        </nav>
        <div className="mt-10 space-y-10">{children}</div>
        <p className="mt-12 border-t border-line pt-6 text-sm">
          <Link href="/" className="font-semibold text-brand">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </article>
    </main>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`article-${n}`} className="scroll-mt-24">
      <h2 className="text-xl font-extrabold">
        <span className="text-brand">{n}.</span> {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-brand">
          {item}
        </li>
      ))}
    </ul>
  );
}
