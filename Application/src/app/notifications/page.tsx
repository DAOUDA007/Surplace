import Link from "next/link";
import { NotificationsList } from "@/components/NotificationsList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSession, homeFor } from "@/lib/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — SURPLACE" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const back = homeFor(session.user.role);
  return (
    <main className="mx-auto min-h-full max-w-2xl px-5 py-6">
      <div className="flex items-center justify-between">
        <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          ← Retour à la carte
        </Link>
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg shadow-sm ring-1 ring-line" />
      </div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Notifications</h1>
      <NotificationsList />
    </main>
  );
}
