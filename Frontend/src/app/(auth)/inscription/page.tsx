import { AuthShell, RegisterForm } from "@/components/AuthForms";
import { getSession } from "@/lib/server";

export const metadata = { title: "Inscription — SURPLACE" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const [{ role }, session] = await Promise.all([searchParams, getSession()]);
  // Passager invité : on reprend son nom et son numéro, et ses courses sont conservées.
  const guest = session?.user.isGuest ? session.user : null;
  return (
    <AuthShell
      title="Créer un compte"
      subtitle={
        guest
          ? "Choisissez un code PIN : vous retrouverez vos courses sur tous vos appareils."
          : "Quelques secondes suffisent pour commencer."
      }
    >
      <RegisterForm
        initialRole={!guest && role === "driver" ? "driver" : "passenger"}
        defaults={guest ? { name: guest.name, phone: guest.phone } : undefined}
        guest={!!guest}
      />
    </AuthShell>
  );
}
