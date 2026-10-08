import Dashboard from "@/components/Dashboard";
import { authenticated } from "@/lib/auth";
import { dashboardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!await authenticated()) redirect("/entrar");
  const props = await dashboardData();
  return <Dashboard {...props} />;
}
