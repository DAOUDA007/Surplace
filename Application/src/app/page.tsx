import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { CountUp } from "@/components/CountUp";
import { Logo } from "@/components/Logo";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CITY_NAME, POPULAR_PLACES } from "@/lib/places";
import { DEFAULT_SETTINGS, estimateTrip, formatFcfa, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { backendGet, getSession, homeFor } from "@/lib/server";
import { CONTACT } from "@/lib/site";
import type { AppSettings, PublicReviews, SubscriptionPlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Indiquez votre trajet", text: "Choisissez votre point de départ et votre destination sur la carte." },
  { title: "Voyez le prix avant", text: "Le tarif est calculé à l'avance. Pas de marchandage." },
  { title: "Un chauffeur arrive", text: "Suivez votre moto en temps réel jusqu'à votre position." },
  { title: "Payez en espèces", text: "Réglez le montant affiché directement au chauffeur." },
];

const PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[];

/** Les étapes sont répétées 3 fois pour que le défilement en boucle ne laisse jamais de vide. */
const MARQUEE_STEPS = [...STEPS, ...STEPS, ...STEPS];

// Exemple de course affiché dans le bandeau, calculé avec le tarif réglé dans l'administration.
const EXAMPLE_FROM = POPULAR_PLACES.find((p) => p.label === "Gare routière")!;
const EXAMPLE_TO = POPULAR_PLACES.find((p) => p.label === "Université Peleforo Gon Coulibaly")!;

async function loadReviews(): Promise<PublicReviews | null> {
  try {
    return await backendGet<PublicReviews>("/public/reviews");
  } catch {
    return null;
  }
}

/** Tarifs et prix des abonnements en vigueur (valeurs par défaut si le serveur ne répond pas). */
async function loadSettings(): Promise<AppSettings> {
  try {
    return (await backendGet<{ settings: AppSettings }>("/public/config"))?.settings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function StarRow({ value, size = "text-base" }: { value: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "text-amber-400" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function Home() {
  const [session, reviews, settings] = await Promise.all([getSession(), loadReviews(), loadSettings()]);
  const user = session?.user ?? null;
  const pricing = settings.pricing;
  const plans = settings.plans;
  const EXAMPLE = estimateTrip(EXAMPLE_FROM, EXAMPLE_TO, pricing);
  // Commander ne demande pas de compte : un visiteur va directement à l'écran de commande.
  const appHref = user ? homeFor(user.role) : "/passager";
  // Boutons des formules : le lien d'encaissement réglé dans l'administration, sinon l'inscription chauffeur
  // (ou l'espace chauffeur, où la demande d'abonnement se fait en un clic).
  const driverHref = user?.role === "driver" ? "/chauffeur?abonnement=1" : user ? appHref : "/inscription?role=driver";
  const paymentLinks = settings.paymentLinks;
  const anyPaymentLink = PLAN_IDS.some((id) => paymentLinks[id]);

  return (
    <main className="min-h-full">
      {/* --- Bandeau --- */}
      <section className="relative overflow-hidden bg-night text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-5 py-5">
          <Logo light />
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <a href="#avis" className="hidden rounded-full px-3 py-2 hover:bg-white/10 md:block">
              Avis
            </a>
            <a href="#contact" className="hidden rounded-full px-3 py-2 hover:bg-white/10 md:block">
              Contact
            </a>
            <ThemeToggle className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-white/10" />
            {user ? (
              <Link href={appHref} className="rounded-full bg-white px-4 py-2 text-night">
                Mon espace
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="rounded-full px-3 py-2 hover:bg-white/10">
                  Connexion
                </Link>
                <Link href="/inscription" className="rounded-full bg-brand px-4 py-2 hover:bg-brand-dark">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Halo orange qui respire derrière le bandeau. */}
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-brand/25 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-10 md:grid-cols-2 md:items-center md:pt-16">
          <div>
            <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-orange-200">
              <span className="live-dot text-emerald-400" />
              Disponible à {CITY_NAME}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              <span className="animate-fade-up block" style={{ "--d": 1 } as React.CSSProperties}>
                Votre taxi-moto,
              </span>
              <span className="animate-fade-up block" style={{ "--d": 2 } as React.CSSProperties}>
                <span className="text-brand">sur place</span> en quelques minutes.
              </span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-md text-lg text-stone-300" style={{ "--d": 3 } as React.CSSProperties}>
              Commandez une moto en deux clics, connaissez le prix à l&apos;avance et suivez votre chauffeur en
              direct dans tout {CITY_NAME}.
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap gap-3" style={{ "--d": 4 } as React.CSSProperties}>
              <Link
                href={appHref}
                className="rounded-2xl bg-brand px-6 py-4 text-lg font-bold shadow-lg shadow-orange-900/30 transition hover:-translate-y-0.5 hover:bg-brand-dark active:scale-[0.97]"
              >
                Commander une moto
              </Link>
              {!user && (
                <Link
                  href="/inscription?role=driver"
                  className="rounded-2xl bg-white/10 px-6 py-4 text-lg font-bold transition hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.97]"
                >
                  Devenir chauffeur
                </Link>
              )}
            </div>
            {reviews?.average != null && (
              <a
                href="#avis"
                className="animate-fade-up mt-6 inline-flex items-center gap-2 text-sm text-stone-300 hover:text-white"
                style={{ "--d": 5 } as React.CSSProperties}
              >
                <StarRow value={reviews.average} />
                <span>
                  <strong className="text-white">{reviews.average.toLocaleString("fr-FR")}/5</strong> ·{" "}
                  {reviews.count} avis
                </span>
              </a>
            )}
          </div>

          <div className="animate-fade-up relative mx-auto w-full max-w-sm" style={{ "--d": 3 } as React.CSSProperties}>
            <div className="animate-float rounded-[2rem] bg-surface p-5 text-ink shadow-2xl">
              <p className="text-sm font-semibold text-muted">Exemple de course</p>
              <div className="mt-3 space-y-2 text-sm font-medium">
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                  {EXAMPLE_FROM.label}
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
                  {EXAMPLE_TO.label}
                </p>
              </div>
              {/* Trajet : la moto (point orange) part du départ et rejoint la destination, en boucle. */}
              <div className="relative mx-1 mt-5 h-1 rounded-full bg-line" aria-hidden>
                <span className="absolute -top-[3px] left-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-green-600" />
                <span className="absolute -top-[3px] right-0 h-2.5 w-2.5 translate-x-1/2 rounded-sm bg-red-600" />
                <span
                  className="absolute -top-[5px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-brand shadow"
                  style={{ animation: "travel 4.5s ease-in-out infinite" }}
                />
              </div>
              <div className="mt-5 rounded-2xl bg-brand-soft p-4">
                <p className="text-xs text-muted">
                  {EXAMPLE.distanceKm.toLocaleString("fr-FR")} km · ~{EXAMPLE.durationMin} min
                </p>
                <p className="text-2xl font-extrabold">{formatFcfa(EXAMPLE.price)}</p>
              </div>
              <p className="mt-3 text-center text-xs text-muted">Paiement en espèces au chauffeur</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Comment ça marche --- */}
      <section className="py-16">
        <h2 data-reveal className="mx-auto max-w-6xl px-5 text-3xl font-extrabold tracking-tight">
          Comment ça marche
        </h2>
        {/* Défilement continu (pause au survol) ; voir .marquee dans globals.css. */}
        <div className="marquee mt-8 py-2">
          <div className="marquee-track">
            {MARQUEE_STEPS.map((s, i) => (
              <div key={i} aria-hidden={i >= STEPS.length} className="w-72 shrink-0 pr-4">
                <div className="h-full rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line transition hover:ring-brand">
                  <span className="text-sm font-bold text-brand">0{(i % STEPS.length) + 1}</span>
                  <h3 className="mt-3 font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Tarifs et chauffeurs --- */}
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2">
        <div data-reveal className="rounded-3xl bg-brand p-8 text-white">
          <h2 className="text-2xl font-extrabold">Un prix simple</h2>
          <p className="mt-4 text-5xl font-extrabold">
            <CountUp value={pricing.perKm} /> F<span className="text-2xl font-bold text-orange-100"> / km</span>
          </p>
          <ul className="mt-4 space-y-1 text-orange-50">
            <li>Course minimum : {formatFcfa(pricing.minimumFare)}</li>
            <li>Prix affiché avant de commander, sans surprise</li>
            <li>Paiement en espèces au chauffeur</li>
          </ul>
        </div>
        <div
          id="abonnements"
          data-reveal
          className="scroll-mt-6 rounded-3xl bg-surface p-8 shadow-sm ring-1 ring-line"
          style={{ "--d": 1 } as React.CSSProperties}
        >
          <h2 className="text-2xl font-extrabold">Vous avez une moto ?</h2>
          <p className="mt-3 text-muted">
            Rejoignez SURPLACE à {CITY_NAME}, recevez des courses près de vous et gardez{" "}
            <strong className="text-ink">100 % du prix de chaque course</strong>. Aucune commission : un simple
            abonnement.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {PLAN_IDS.map((id) => {
              const yearly = id === "yearly";
              const link = paymentLinks[id];
              const freeMonths =
                yearly && plans.monthly > 0 && plans.monthly * 12 > plans.yearly
                  ? Math.round((plans.monthly * 12 - plans.yearly) / plans.monthly)
                  : 0;
              return (
                <a
                  key={id}
                  href={link || driverHref}
                  target={link ? "_blank" : undefined}
                  rel={link ? "noreferrer" : undefined}
                  className={`lift group relative flex flex-col rounded-2xl p-4 active:scale-[0.98] ${
                    yearly ? "bg-brand-soft ring-2 ring-brand" : "bg-subtle ring-1 ring-transparent hover:ring-line"
                  }`}
                >
                  {freeMonths > 0 && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                      {freeMonths} mois offerts
                    </span>
                  )}
                  <span className="text-sm text-muted">{SUBSCRIPTION_PLANS[id].label}</span>
                  <span className="text-xl font-extrabold">{formatFcfa(plans[id])}</span>
                  <span className="text-xs text-muted">{yearly ? "par an" : "par mois"}</span>
                  <span
                    className={`mt-3 rounded-xl px-3 py-2 text-center text-sm font-bold transition ${
                      yearly ? "bg-brand text-white group-hover:bg-brand-dark" : "bg-contrast text-on-contrast group-hover:opacity-90"
                    }`}
                  >
                    {link ? "Payer" : "Choisir"}
                  </span>
                </a>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">
            {anyPaymentLink
              ? "Après le paiement, inscrivez-vous comme chauffeur avec le même numéro (ou demandez la formule dans votre espace chauffeur) : l'équipe active votre abonnement dès qu'elle a reçu le paiement."
              : "Inscrivez-vous, puis choisissez votre formule dans votre espace chauffeur. Votre abonnement est activé dès que l'équipe a reçu votre paiement."}
          </p>
          {!user && (
            <Link
              href="/inscription?role=driver"
              className="mt-5 inline-flex rounded-2xl bg-contrast px-5 py-3 font-bold text-on-contrast transition hover:opacity-90 active:scale-[0.97]"
            >
              Devenir chauffeur
            </Link>
          )}
        </div>
      </section>

      {/* --- Avis et notes --- */}
      <section id="avis" className="scroll-mt-6 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 data-reveal className="text-3xl font-extrabold tracking-tight">
            Ils roulent avec SURPLACE
          </h2>
          <p data-reveal className="mt-2 text-muted">
            Les notes et commentaires laissés par nos passagers après leurs courses.
          </p>

          {!reviews || reviews.count === 0 ? (
            <div data-reveal className="mt-8 rounded-3xl bg-subtle p-8 text-center">
              <p className="font-bold">Pas encore d&apos;avis</p>
              <p className="text-sm text-muted">
                Après chaque course, les passagers peuvent noter leur chauffeur. Les avis apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
              <div data-reveal className="rounded-3xl bg-subtle p-6">
                <p className="text-5xl font-extrabold">
                  {reviews.average!.toLocaleString("fr-FR")}
                  <span className="text-xl font-bold text-muted"> / 5</span>
                </p>
                <StarRow value={reviews.average!} size="text-2xl" />
                <p className="mt-1 text-sm text-muted">
                  {reviews.count} note{reviews.count > 1 ? "s" : ""}
                </p>
                <div className="mt-5 space-y-2">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const share = reviews.count ? (reviews.distribution[n] / reviews.count) * 100 : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-muted">{n}★</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                          <span
                            data-reveal
                            className="block h-full origin-left rounded-full bg-amber-400"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="w-8 text-right text-muted">{reviews.distribution[n]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {reviews.reviews.length === 0 ? (
                <p className="self-center text-muted">Aucun commentaire écrit pour le moment.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.reviews.map((r, i) => (
                    <figure
                      key={r.id}
                      data-reveal
                      className="lift flex flex-col rounded-3xl bg-canvas p-5 ring-1 ring-line"
                      style={{ "--d": i % 4 } as React.CSSProperties}
                    >
                      <StarRow value={r.rating} />
                      <blockquote className="mt-3 flex-1 text-[15px]">« {r.comment} »</blockquote>
                      <figcaption className="mt-4 flex items-center gap-3 text-sm">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-brand">
                          {r.author.charAt(0)}
                        </span>
                        <span>
                          <span className="block font-semibold">{r.author}</span>
                          <span className="text-xs text-muted">
                            {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- Contact --- */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16">
        <h2 data-reveal className="text-3xl font-extrabold tracking-tight">
          Nous contacter
        </h2>
        <p data-reveal className="mt-2 text-muted">Une question, une réclamation ou envie de devenir chauffeur ? Écrivez-nous.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            {[
              { label: "Téléphone", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` },
              { label: "WhatsApp", value: CONTACT.phone, href: `https://wa.me/${CONTACT.whatsapp}` },
              { label: "E-mail", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
              { label: "Adresse", value: CONTACT.address },
              { label: "Horaires", value: CONTACT.hours },
            ].map((c, i) => {
              const content = (
                <span className="min-w-0 border-l-2 border-brand pl-4">
                  <span className="block text-xs text-muted">{c.label}</span>
                  <span className="block truncate font-semibold">{c.value}</span>
                </span>
              );
              const cls = "flex items-center rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line";
              const style = { "--d": i } as React.CSSProperties;
              return c.href ? (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  data-reveal
                  style={style}
                  className={`${cls} lift hover:ring-brand`}
                >
                  {content}
                </a>
              ) : (
                <div key={c.label} data-reveal style={style} className={cls}>
                  {content}
                </div>
              );
            })}
          </div>
          <ContactForm />
        </div>
      </section>

      <ScrollReveal />
      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        <p>
          © {new Date().getFullYear()} SURPLACE · {CITY_NAME}, Côte d&apos;Ivoire
        </p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/conditions" className="hover:text-ink">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="hover:text-ink">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
    </main>
  );
}
