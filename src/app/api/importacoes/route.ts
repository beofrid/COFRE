import { authenticated, isAuthorizedOrigin } from "@/lib/auth";
import { readUploaded } from "@/lib/upload";
import { saveReport, sheetsConfigured } from "@/lib/sheets";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!await authenticated()) return Response.json({ error: "Acesso negado." }, { status: 401 });
  if (!isAuthorizedOrigin(req)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  if (!sheetsConfigured()) return Response.json({ error: "Configure COFRE_SCRIPT_URL e COFRE_API_KEY." }, { status: 503 });
  try {
    const { report, filename } = await readUploaded(req);
    const saved = await saveReport(report, filename);
    return Response.json({ ok: true, importacao: saved });
  } catch (err) { return Response.json({ error: err instanceof Error ? err.message : "Erro ao importar." }, { status: 400 }); }
}
