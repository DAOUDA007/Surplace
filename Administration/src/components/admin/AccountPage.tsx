"use client";

import { PinForm, ProfileInfoForm } from "@/components/ProfileForm";
import type { User } from "@/lib/types";
import { PageHeader } from "./ui";

export function AccountPage({ user }: { user: User }) {
  return (
    <>
      <PageHeader
        title="Mon compte"
        subtitle={user.isPrincipal ? "Administrateur principal" : "Administrateur"}
      />
      {user.phone === "0700000000" && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Vous utilisez le compte administrateur de démonstration (07 00 00 00 00, PIN 1234). Changez le numéro et le
          code PIN avant toute mise en service.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileInfoForm user={user} />
        <PinForm />
      </div>
    </>
  );
}
