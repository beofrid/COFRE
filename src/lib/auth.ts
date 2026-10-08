import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "orcamento_sessao";
const TTL = 60 * 60 * 24 * 7;
const hasAuth = () => Boolean(process.env.APP_PASSWORD && (process.env.SESSION_SECRET?.length ?? 0) >= 32);
export function devNoLogin() { return process.env.NODE_ENV === "development" && !process.env.APP_PASSWORD; }
const signature = (exp: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(exp).digest("hex");
export async function authenticated() {
  if (devNoLogin()) return true;
  if (!hasAuth()) return false;
  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!cookie) return false;
  const [exp, mac] = cookie.split(".");
  if (!/^\d+$/.test(exp ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "") || Number(exp) <= Date.now()) return false;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(signature(exp)));
}
export function correctPassword(input: string) {
  const secret = process.env.APP_PASSWORD;
  if (!hasAuth() || !secret) return false;
  const a = createHmac("sha256", process.env.SESSION_SECRET!).update(input).digest();
  const b = createHmac("sha256", process.env.SESSION_SECRET!).update(secret).digest();
  return timingSafeEqual(a, b);
}
export async function createSession() {
  const exp = String(Date.now() + TTL * 1000);
  (await cookies()).set(COOKIE, `${exp}.${signature(exp)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: TTL, path: "/" });
}
export async function deleteSession() { (await cookies()).delete(COOKIE); }
export function isAuthorizedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return new URL(origin).host === request.headers.get("host");
}
