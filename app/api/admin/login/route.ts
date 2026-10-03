import { COOKIE, checkPassword, makeToken } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return json({ error: "ADMIN_PASSWORD is not set on the server." }, 500);
  }
  const body = await req.json().catch(() => null);
  if (!checkPassword(String(body?.password ?? ""))) {
    // Slow down guessing
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Wrong password" }, 401);
  }
  const token = makeToken();
  const res = json({ ok: true });
  res.cookies.set(COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: token.maxAge,
  });
  return res;
}
