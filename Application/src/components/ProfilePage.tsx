import Link from "next/link";
import { PinForm, ProfileInfoForm } from "@/components/ProfileForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { DriverProfile, User } from "@/lib/types";

/** Page « Mon profil » des passagers et des chauffeurs. */
export function ProfilePage({
  user,
  driver,
  backHref,
}: {
  user: User;
  driver?: DriverProfile | null;
  backHref: string;
}) {
  return (
    <main className="mx-auto min-h-full max-w-2xl px-5 py-6">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          ← Retour à la carte
        </Link>
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg shadow-sm ring-1 ring-line" />
      </div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Mon profil</h1>
      <p className="mt-1 text-muted">
        {driver ? "Vos informations de chauffeur et de connexion." : "Vos informations et votre connexion."}
      </p>
      <div className="mt-6 space-y-6">
        <ProfileInfoForm user={user} driver={driver} />
        <PinForm />
      </div>
    </main>
  );
}
