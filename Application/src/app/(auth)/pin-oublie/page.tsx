import { AuthShell } from "@/components/AuthForms";
import { PinResetForm } from "@/components/PinResetForm";

export const metadata = { title: "Code PIN oublié — SURPLACE" };

export default function ForgotPinPage() {
  return (
    <AuthShell title="Code PIN oublié" subtitle="Recevez un code par SMS, puis choisissez un nouveau code PIN.">
      <PinResetForm />
    </AuthShell>
  );
}
