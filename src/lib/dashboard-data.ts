import "server-only";
import { exampleReport } from "@/lib/example-report";
import { compareReports } from "@/lib/compare";
import { getReportsFor, listImports, sheetsConfigured, type ImportSummary } from "@/lib/sheets";

export async function dashboardData() {
  if (!sheetsConfigured()) {
    return { report: exampleReport, imports: [] as ImportSummary[], comparison: null, demo: true, connected: false };
  }
  const imports = await listImports();
  if (!imports.length) return { report: exampleReport, imports, comparison: null, demo: true, connected: true };
  const current = imports.slice(0, 2);
  const data = await getReportsFor(current);
  return {
    report: data.get(current[0].importId)!, imports,
    comparison: current.length === 2 ? compareReports(data.get(current[1].importId)!, data.get(current[0].importId)!) : null,
    demo: false, connected: true,
  };
}
