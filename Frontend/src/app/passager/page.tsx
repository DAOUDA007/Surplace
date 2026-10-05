import { PassengerApp } from "@/components/PassengerApp";
import { requirePageUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commander — SURPLACE" };

export default async function PassengerPage() {
  const { user } = await requirePageUser("passenger");
  return <PassengerApp user={user} />;
}
