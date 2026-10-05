import { DriversPage } from "@/components/admin/DriversPage";

export const metadata = { title: "Chauffeurs — Admin SURPLACE" };

const FILTERS = ["pending", "approved", "online", "unsubscribed", "suspended"] as const;

export default async function AdminDrivers({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const filter = FILTERS.find((f) => f === statut) ?? "all";
  return <DriversPage initialFilter={filter} />;
}
