import { redirect } from "next/navigation";
import { PassengerApp } from "@/components/PassengerApp";
import { getSession, homeFor } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commander — SURPLACE" };

/** Ouverte à tous : un visiteur peut commander sans compte (il donne son nom et son numéro au moment de commander). */
export default async function PassengerPage() {
  const user = (await getSession())?.user ?? null;
  if (user && user.role !== "passenger") redirect(homeFor(user.role));
  return <PassengerApp user={user} />;
}
