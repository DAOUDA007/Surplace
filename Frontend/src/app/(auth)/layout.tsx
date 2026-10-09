import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSession, homeFor } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = (await getSession())?.user ?? null;
  // Un passager invité peut se connecter à un compte existant ou créer le sien.
  if (user && !user.isGuest) redirect(homeFor(user.role));

  return (
    <main className="flex min-h-full flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg shadow-sm ring-1 ring-line" />
      </div>
      <div className="flex flex-1 items-center py-10">{children}</div>
    </main>
  );
}
