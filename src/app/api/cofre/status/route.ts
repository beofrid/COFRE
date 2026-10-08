import { authenticated } from "@/lib/auth";
import { testConnection } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  if (!await authenticated()) return Response.json({ erro: "Acesso negado" }, { status: 401 });
  try {
    return Response.json(await testConnection());
  } catch (err) {
    return Response.json({ erro: err instanceof Error ? err.message : "COFRE_API indisponível" }, { status: 502 });
  }
}
