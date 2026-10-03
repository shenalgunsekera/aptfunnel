import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "tpa_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function password() {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string) {
  return createHmac("sha256", `tpa:${password()}`).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string) {
  const pw = password();
  return pw.length > 0 && safeEqual(sign(input), sign(pw));
}

export function makeToken() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return { value: `${exp}.${sign(exp)}`, maxAge: MAX_AGE };
}

/** Valid only while it has not expired and ADMIN_PASSWORD has not changed. */
export function verifyToken(token: string | undefined) {
  if (!token || !password()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export async function isAdmin() {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}
