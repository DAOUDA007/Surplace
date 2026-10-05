import { RidesPage } from "@/components/admin/RidesPage";

export const metadata = { title: "Courses — Admin SURPLACE" };

export default async function AdminRides({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const filter = statut === "active" || statut === "completed" || statut === "cancelled" ? statut : "all";
  return <RidesPage initialFilter={filter} />;
}
