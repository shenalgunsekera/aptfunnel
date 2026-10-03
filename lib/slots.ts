import { DateTime } from "luxon";
import type { Booking, Settings, Slot } from "./types";

type Options = {
  now?: number;
  /** Inclusive start / exclusive end, as dates "YYYY-MM-DD" in the admin timezone */
  fromDate?: string;
  toDate?: string;
  /** Respect min notice and booking window (public view). Admin view ignores them. */
  publicView?: boolean;
};

/** Hours that apply on a given day: a date override wins over the weekly schedule. */
export function hoursFor(settings: Settings, day: DateTime) {
  const key = day.toISODate()!;
  if (key in settings.overrides) return settings.overrides[key];
  return settings.weekly[String(day.weekday % 7)] ?? [];
}

function at(day: DateTime, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h === 24 ? day.plus({ days: 1 }).startOf("day") : day.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/** Builds the slot grid and marks each slot open, booked, blocked or past. */
export function buildSlots(settings: Settings, bookings: Booking[], opts: Options = {}): Slot[] {
  const now = opts.now ?? Date.now();
  const tz = settings.timezone;
  const today = DateTime.fromMillis(now, { zone: tz }).startOf("day");

  const first = opts.fromDate ? DateTime.fromISO(opts.fromDate, { zone: tz }) : today;
  const last = opts.toDate
    ? DateTime.fromISO(opts.toDate, { zone: tz })
    : today.plus({ days: settings.maxDaysAhead + 1 });

  const earliest = now + settings.minNoticeHours * 3_600_000;
  const latest = today.plus({ days: settings.maxDaysAhead + 1 }).toMillis();
  const blocked = new Set(settings.blocked.map((b) => Date.parse(b)));
  const active = bookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ id: b.id, s: Date.parse(b.startsAt), e: Date.parse(b.endsAt) }));

  const slotMs = settings.slotMinutes * 60_000;
  const stepMs = slotMs + settings.bufferMinutes * 60_000;
  const out: Slot[] = [];
  const seen = new Set<number>();

  for (let day = first; day < last; day = day.plus({ days: 1 })) {
    for (const range of hoursFor(settings, day)) {
      const end = at(day, range.end).toMillis();
      for (let t = at(day, range.start).toMillis(); t + slotMs <= end; t += stepMs) {
        if (seen.has(t)) continue; // overlapping ranges
        seen.add(t);
        if (opts.publicView && (t < earliest || t >= latest)) continue;

        const hit = active.find((b) => b.s < t + slotMs && b.e > t);
        let status: Slot["status"] = "open";
        if (hit) status = "booked";
        else if (blocked.has(t)) status = "blocked";
        else if (t < now) status = "past";

        out.push({
          start: new Date(t).toISOString(),
          end: new Date(t + slotMs).toISOString(),
          status,
          ...(hit ? { bookingId: hit.id } : {}),
        });
      }
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** The window of time a public availability query has to look at. */
export function publicWindow(settings: Settings, now = Date.now()) {
  const today = DateTime.fromMillis(now, { zone: settings.timezone }).startOf("day");
  return { from: today.toUTC().toISO()!, to: today.plus({ days: settings.maxDaysAhead + 2 }).toUTC().toISO()! };
}
