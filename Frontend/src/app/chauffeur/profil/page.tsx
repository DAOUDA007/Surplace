import { ProfilePage } from "@/components/ProfilePage";
import { requirePageUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon profil — SURPLACE" };

export default async function DriverProfilePage() {
  const { user, driver } = await requirePageUser("driver");
  return <ProfilePage user={user} driver={driver} backHref="/chauffeur" />;
}
