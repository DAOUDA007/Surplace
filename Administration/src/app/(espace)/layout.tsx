import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — SURPLACE" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={user}>{children}</AdminShell>;
}
