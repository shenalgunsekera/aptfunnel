import { isAdmin } from "@/lib/auth";
import { listBookings } from "@/lib/db";
import { json, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  try {
    return json({ bookings: await listBookings() });
  } catch (err) {
    return serverError(err);
  }
}
