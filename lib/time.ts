/** Client-side date helpers built on Intl, so no date library ships to the browser. */

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

/** "YYYY-MM-DD" of an instant in a timezone */
export function dateKey(iso: string | number | Date, tz: string) {
  let f = keyFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    keyFormatters.set(tz, f);
  }
  return f.format(new Date(iso));
}

export function todayKey(tz: string) {
  return dateKey(Date.now(), tz);
}

export function formatTime(iso: string, tz: string, hour12: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: hour12 ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12,
  }).format(new Date(iso));
}

/** Noon UTC on that calendar date, safe for formatting the date itself */
function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(keyToDate(key));
}

export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    keyToDate(`${month}-01`),
  );
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addDays(key: string, n: number) {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday-first grid cells for a month; null = padding cell */
export function monthGrid(month: string): (string | null)[] {
  const first = keyToDate(`${month}-01`);
  const lead = (first.getUTCDay() + 6) % 7;
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function tzPart(tz: string, style: "shortOffset" | "longGeneric" | "short") {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
}

/** e.g. "Eastern Time (EDT)" or "Asia/Colombo (GMT+5:30)" */
export function tzLabel(tz: string) {
  try {
    const generic = tzPart(tz, "longGeneric");
    const short = tzPart(tz, "short");
    // Named zones like Eastern Time read better than "America/New York"
    if (generic && !generic.startsWith("GMT") && short && !short.startsWith("GMT")) {
      return `${generic} (${short})`;
    }
    return `${tz.replace(/_/g, " ")} (${tzPart(tz, "shortOffset") ?? ""})`;
  } catch {
    return tz;
  }
}

export function allTimezones(current: string): string[] {
  let list: string[] = [];
  try {
    list = (Intl as any).supportedValuesOf("timeZone");
  } catch {
    list = [];
  }
  if (!list.includes("UTC")) list = ["UTC", ...list];
  if (current && !list.includes(current)) list = [current, ...list];
  return list;
}

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function prefers12h() {
  try {
    const hc = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
    return hc === "h12" || hc === "h11";
  } catch {
    return false;
  }
}
