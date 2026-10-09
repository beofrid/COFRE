import { authenticated, isAuthorizedOrigin } from "@/lib/auth";
import { readUploaded } from "@/lib/upload";
import { getReportsFor, listImports, sheetsConfigured } from "@/lib/sheets";
import { compareReports } from "@/lib/compare";
import { snapshotHash } from "@/lib/parse-xls";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!await authenticated()) return Response.json({ error: "Acesso negado." }, { status: 401 });
  if (!isAuthorizedOrigin(req)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const { report } = await readUploaded(req);
    const imports = sheetsConfigured() ? await listImports() : [];
    const last = imports[0];
    const prev = last ? (await getReportsFor([last])).get(last.importId) : null;
    const comp = prev && prev.exercicio === report.exercicio ? compareReports(prev, report) : null;
    const duplicated = imports.some(x => x.hash === snapshotHash(report));
    const sameReference = imports.some(x => x.referencia === report.referencia && x.exercicio === report.exercicio);
    const reason = duplicated ? "Arquivo já importado." : sameReference ? "Já existe importação com a mesma data/hora de referência." : !sheetsConfigured() ? "Google Sheets não configurado." : null;
    return Response.json({ referencia: report.referencia, exercicio: report.exercicio, registros: report.registros.length,
      saldoCentavos: report.registros.reduce((s, r) => s + r.disponivel, 0),
      comparativo: comp ? { alteradas: comp.alteradas, novas: comp.novas, ausentes: comp.ausentes, diferenca: comp.totalAtual - comp.totalAnterior } : null,
      podeSalvar: !reason, motivo: reason });
  } catch (err) { return Response.json({ error: err instanceof Error ? err.message : "Erro ao validar." }, { status: 400 }); }
}
