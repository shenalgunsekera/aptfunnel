import { isAdmin } from "@/lib/auth";
import { deleteBooking, setBookingStatus } from "@/lib/db";
import { json, serverError } from "@/lib/http";
import type { BookingStatus } from "@/lib/types";

const STATUSES: BookingStatus[] = ["confirmed", "completed", "no_show", "cancelled"];
const UUID = /^[0-9a-f-]{36}$/i;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  const body = await req.json().catch(() => null);
  if (!STATUSES.includes(body?.status)) return json({ error: "Invalid status" }, 400);
  try {
    const booking = await setBookingStatus(id, body.status);
    return booking ? json({ booking }) : json({ error: "Not found" }, 404);
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return json({ error: "Someone else booked this slot after it was cancelled." }, 409);
    }
    return serverError(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  try {
    return (await deleteBooking(id)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
  } catch (err) {
    return serverError(err);
  }
}
