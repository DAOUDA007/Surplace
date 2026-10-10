import { AccountPage } from "@/components/admin/AccountPage";
import { requireAdmin } from "@/lib/server";

export const metadata = { title: "Mon compte — Admin SURPLACE" };

export default async function AdminAccount() {
  const user = await requireAdmin();
  return <AccountPage user={user} />;
}
