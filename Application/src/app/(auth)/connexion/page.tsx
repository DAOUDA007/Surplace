import { AuthShell, LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Connexion — SURPLACE" };

export default function LoginPage() {
  return (
    <AuthShell title="Bon retour 👋" subtitle="Connectez-vous avec votre numéro et votre code PIN.">
      <LoginForm />
    </AuthShell>
  );
}
