import Dashboard from "@/components/Dashboard";
import { report } from "@/lib/budget";

export default function Home() {
  return <Dashboard report={report} />;
}
