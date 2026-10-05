import { AuthShell, LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Connexion — SURPLACE" };

export default function LoginPage() {
  return (
    <AuthShell title="Bon retour 👋" subtitle="Connectez-vous avec votre numéro et votre code PIN.">
      <LoginForm />
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-xs text-muted">
          <p className="font-semibold">Comptes de démonstration (PIN 1234)</p>
          <p>Passager : 07 00 00 00 01 · Chauffeur : 07 00 00 00 02</p>
        </div>
      )}
    </AuthShell>
  );
}
