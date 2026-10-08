import { deleteSession, isAuthorizedOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!isAuthorizedOrigin(req)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  await deleteSession();
  return Response.json({ ok: true });
}
