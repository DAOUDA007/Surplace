import { Logo } from "@/components/Logo";
import { PinResetForm } from "@/components/PinResetForm";

export const metadata = { title: "Code PIN oublié — Administration SURPLACE" };

export default function ForgotPinPage() {
  return (
    <main className="flex min-h-full flex-col px-5 py-6">
      <div className="flex items-center gap-2">
        <Logo />
        <span className="rounded-full bg-contrast px-2 py-0.5 text-[11px] font-bold text-on-contrast">Admin</span>
      </div>
      <div className="flex flex-1 items-center py-10">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight">Code PIN oublié</h1>
          <p className="mt-2 text-muted">Recevez un code par SMS sur votre numéro d&apos;administrateur.</p>
          <div className="mt-8">
            <PinResetForm />
          </div>
        </div>
      </div>
    </main>
  );
}
