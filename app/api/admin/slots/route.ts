import { DateTime } from "luxon";
import { isAdmin } from "@/lib/auth";
import { activeBookingsBetween, getSettings } from "@/lib/db";
import { json, serverError } from "@/lib/http";
import { buildSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

/** Full slot grid (open / booked / blocked / past) for one month, in the admin timezone. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  try {
    const month = new URL(req.url).searchParams.get("month") ?? "";
    const settings = await getSettings();
    const start = /^\d{4}-\d{2}$/.test(month)
      ? DateTime.fromISO(`${month}-01`, { zone: settings.timezone })
      : DateTime.now().setZone(settings.timezone).startOf("month");
    const end = start.plus({ months: 1 });
    const bookings = await activeBookingsBetween(start.toUTC().toISO()!, end.toUTC().toISO()!);
    const slots = buildSlots(settings, bookings, { fromDate: start.toISODate()!, toDate: end.toISODate()! });
    return json({ slots });
  } catch (err) {
    return serverError(err);
  }
}
