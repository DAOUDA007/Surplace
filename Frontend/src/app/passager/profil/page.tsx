import { ProfilePage } from "@/components/ProfilePage";
import { requirePageUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon profil — SURPLACE" };

export default async function PassengerProfile() {
  const { user } = await requirePageUser("passenger");
  return <ProfilePage user={user} backHref="/passager" />;
}
