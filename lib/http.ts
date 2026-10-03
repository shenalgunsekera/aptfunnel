import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function serverError(err: unknown) {
  console.error(err);
  const msg =
    err instanceof Error && err.message.startsWith("DATABASE_URL")
      ? err.message
      : "Something went wrong. Please try again.";
  return json({ error: msg }, 500);
}
