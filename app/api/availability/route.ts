import { activeBookingsBetween, getSettings } from "@/lib/db";
import { json, serverError } from "@/lib/http";
import { buildSlots, publicWindow } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const type = new URL(req.url).searchParams.get("type") === "text" ? "text" : "call";
    const settings = await getSettings();
    const { timezone } = settings;
    if (!settings.types[type].enabled) {
      return json({ enabled: false, slotMinutes: settings.slotMinutes, timezone, slots: [] });
    }
    const w = publicWindow(settings);
    const bookings = await activeBookingsBetween(w.from, w.to);
    const slots = buildSlots(settings, bookings, { publicView: true })
      .filter((s) => s.status === "open")
      .map((s) => s.start);
    return json({ enabled: true, slotMinutes: settings.slotMinutes, timezone, slots });
  } catch (err) {
    return serverError(err);
  }
}
