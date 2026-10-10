import { HistoryPage } from "@/components/RideHistory";
import { backendGet, requirePageUser } from "@/lib/server";
import type { Ride } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes courses — SURPLACE" };

export default async function PassengerHistory() {
  await requirePageUser("passenger");
  const data = await backendGet<{ rides: Ride[] }>("/rides");
  return <HistoryPage title="Mes courses" backHref="/passager" rides={data?.rides ?? []} showDriver />;
}
