import { correctPassword, createSession, isAuthorizedOrigin } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAuthorizedOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.senha !== "string" || !correctPassword(payload.senha)) {
    return Response.json({ error: "Senha incorreta ou proteção não configurada." }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
