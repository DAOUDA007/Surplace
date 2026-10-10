import { notFound } from "next/navigation";
import { DriverApp } from "@/components/DriverApp";
import { requirePageUser } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chauffeur — SURPLACE" };

export default async function DriverPage() {
  const { user, driver } = await requirePageUser("driver");
  if (!driver) notFound();
  return <DriverApp user={user} initialProfile={driver} />;
}
