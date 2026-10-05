import { AccountPage } from "@/components/admin/AccountPage";
import { requirePageUser } from "@/lib/server";

export const metadata = { title: "Mon compte — Admin SURPLACE" };

export default async function AdminAccount() {
  const { user } = await requirePageUser("admin");
  return <AccountPage user={user} />;
}
