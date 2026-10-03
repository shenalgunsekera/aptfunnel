import type { Settings, TimeRange } from "./types";

const weekday: TimeRange[] = [{ start: "10:00", end: "18:00" }];

export const DEFAULT_SETTINGS: Settings = {
  timezone: "America/New_York",
  slotMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 2,
  maxDaysAhead: 21,
  weekly: { "0": [], "1": weekday, "2": weekday, "3": weekday, "4": weekday, "5": weekday, "6": [] },
  overrides: {},
  blocked: [],
  types: { call: { enabled: true }, text: { enabled: true } },
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidZone(tz: unknown): tz is string {
  if (typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function cleanRanges(v: unknown): TimeRange[] {
  if (!Array.isArray(v)) return [];
  const out: TimeRange[] = [];
  for (const r of v) {
    if (!r || typeof r.start !== "string" || typeof r.end !== "string") continue;
    if (!HHMM.test(r.start) || !HHMM.test(r.end) || r.start >= r.end) continue;
    out.push({ start: r.start, end: r.end });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 12);
}

/** Merge untrusted input over defaults and drop anything malformed. */
export function normalizeSettings(input: unknown): Settings {
  const s = (input && typeof input === "object" ? input : {}) as Partial<Settings>;
  const d = DEFAULT_SETTINGS;

  const weekly: Settings["weekly"] = {};
  for (let i = 0; i < 7; i++) {
    const key = String(i);
    weekly[key] = s.weekly && key in s.weekly ? cleanRanges(s.weekly[key]) : d.weekly[key];
  }

  const overrides: Settings["overrides"] = {};
  if (s.overrides && typeof s.overrides === "object") {
    for (const [date, ranges] of Object.entries(s.overrides)) {
      if (DATE.test(date)) overrides[date] = cleanRanges(ranges);
    }
  }

  const blocked = Array.isArray(s.blocked)
    ? [...new Set(s.blocked.filter((x) => typeof x === "string" && !isNaN(Date.parse(x))).map((x) => new Date(x).toISOString()))]
    : [];

  return {
    timezone: isValidZone(s.timezone) ? s.timezone : d.timezone,
    slotMinutes: clampInt(s.slotMinutes, 10, 240, d.slotMinutes),
    bufferMinutes: clampInt(s.bufferMinutes, 0, 120, d.bufferMinutes),
    minNoticeHours: clampInt(s.minNoticeHours, 0, 24 * 14, d.minNoticeHours),
    maxDaysAhead: clampInt(s.maxDaysAhead, 1, 120, d.maxDaysAhead),
    weekly,
    overrides,
    blocked,
    types: {
      call: { enabled: s.types?.call?.enabled ?? true },
      text: { enabled: s.types?.text?.enabled ?? true },
    },
  };
}

/** Drop overrides and blocked slots that are already in the past. */
export function pruneSettings(s: Settings, now = Date.now()): Settings {
  const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);
  return {
    ...s,
    overrides: Object.fromEntries(Object.entries(s.overrides).filter(([d]) => d >= yesterday)),
    blocked: s.blocked.filter((b) => Date.parse(b) > now - 86_400_000),
  };
}
