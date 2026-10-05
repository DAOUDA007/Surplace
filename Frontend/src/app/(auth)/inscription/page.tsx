import { AuthShell, RegisterForm } from "@/components/AuthForms";

export const metadata = { title: "Inscription — SURPLACE" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <AuthShell title="Créer un compte" subtitle="Quelques secondes suffisent pour commencer.">
      <RegisterForm initialRole={role === "driver" ? "driver" : "passenger"} />
    </AuthShell>
  );
}
