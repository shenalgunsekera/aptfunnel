import { activeBookingsBetween, createBooking, getSettings, hasUpcomingBooking } from "@/lib/db";
import { json, serverError } from "@/lib/http";
import { notifyNewBooking } from "@/lib/notify";
import { buildSlots, publicWindow } from "@/lib/slots";
import { validateBooking } from "@/lib/validate";

export const dynamic = "force-dynamic";

const TAKEN = { error: "That time was just taken. Please pick another one.", code: "SLOT_TAKEN" };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    // Honeypot: real people never see or fill this field
    if (body?.website) return json({ error: "Invalid request" }, 400);

    const { data, errors } = validateBooking(body);
    if (!data) return json({ error: "Please check the highlighted fields", fields: errors }, 400);

    const settings = await getSettings();
    if (!settings.types[data.type].enabled) {
      return json({ error: "Bookings for this meeting type are closed right now." }, 403);
    }

    // The requested time must be a slot we actually offer and that is still open
    const w = publicWindow(settings);
    const slot = buildSlots(settings, await activeBookingsBetween(w.from, w.to), { publicView: true }).find(
      (s) => s.start === data.start,
    );
    if (!slot || slot.status !== "open") return json(TAKEN, 409);

    if (await hasUpcomingBooking(data.email, data.type)) {
      return json(
        { error: "This email already has an upcoming meeting booked. Contact us if you need to move it." },
        409,
      );
    }

    const booking = await createBooking({
      type: data.type,
      name: data.name,
      clubgg: data.clubgg,
      email: data.email,
      platform: data.platform,
      handle: data.handle,
      note: data.note || null,
      startsAt: slot.start,
      endsAt: slot.end,
    });
    if (!booking) return json(TAKEN, 409);

    await notifyNewBooking(booking, settings.timezone);
    return json({ ok: true, booking: { id: booking.id, startsAt: booking.startsAt, endsAt: booking.endsAt } }, 201);
  } catch (err) {
    return serverError(err);
  }
}
