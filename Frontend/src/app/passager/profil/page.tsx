import { redirect } from "next/navigation";
import { ProfilePage } from "@/components/ProfilePage";
import { requirePageUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon profil — SURPLACE" };

export default async function PassengerProfile() {
  const { user } = await requirePageUser("passenger");
  // Un invité n'a pas de code PIN : il crée d'abord son compte.
  if (user.isGuest) redirect("/inscription");
  return <ProfilePage user={user} backHref="/passager" />;
}
