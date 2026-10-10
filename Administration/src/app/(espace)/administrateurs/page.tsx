import { AdminsPage } from "@/components/admin/AdminsPage";
import { requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrateurs — Admin SURPLACE" };

export default async function AdminAdmins() {
  const user = await requireAdmin();
  return <AdminsPage user={user} />;
}
