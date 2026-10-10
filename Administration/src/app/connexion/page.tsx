import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion — Administration SURPLACE" };

export default async function LoginPage() {
  // Déjà connecté en administrateur : directement au tableau de bord.
  if (await getAdmin()) redirect("/");

  return (
    <main className="flex min-h-full flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-contrast px-2 py-0.5 text-[11px] font-bold text-on-contrast">Admin</span>
        </div>
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg shadow-sm ring-1 ring-line" />
      </div>
      <div className="flex flex-1 items-center py-10">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight">Espace d&apos;administration</h1>
          <p className="mt-2 text-muted">Réservé à l&apos;équipe SURPLACE.</p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
