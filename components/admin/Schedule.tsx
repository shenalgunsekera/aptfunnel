"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "../Calendar";
import { PlatformIcon } from "../icons";
import { RangesEditor, WEEKDAYS, api, fmtInZone } from "./shared";
import { dateKey, formatDay } from "@/lib/time";
import type { Booking, Settings, Slot, TimeRange } from "@/lib/types";

type Props = {
  settings: Settings;
  bookings: Booking[];
  save: (s: Settings, message?: string) => Promise<boolean>;
};

const weekdayOf = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();

export default function Schedule({ settings, bookings, save }: Props) {
  const tz = settings.timezone;
  const today = dateKey(Date.now(), tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [editing, setEditing] = useState<TimeRange[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api<{ slots: Slot[] }>(`/api/admin/slots?month=${month}`)
      .then((d) => alive && setSlots(d.slots))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [month, settings, bookings]);

  useEffect(() => setEditing(null), [day]);

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const k = dateKey(s.start, tz);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots, tz]);

  const bookingById = useMemo(() => new Map(bookings.map((b) => [b.id, b])), [bookings]);

  const daySlots = byDay.get(day) ?? [];
  const isOverride = day in settings.overrides;
  const hours = isOverride ? settings.overrides[day] : settings.weekly[String(weekdayOf(day))] ?? [];
  const isPastDay = day < today;

  // Bookings that don't sit on the current grid (e.g. slot length changed later)
  const offGrid = bookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      dateKey(b.startsAt, tz) === day &&
      !daySlots.some((s) => s.start === b.startsAt),
  );

  const rows = [
    ...daySlots.map((s) => ({ ...s, booking: s.bookingId ? bookingById.get(s.bookingId) : undefined })),
    ...offGrid.map((b) => ({ start: b.startsAt, end: b.endsAt, status: "booked" as const, booking: b })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const openCount = daySlots.filter((s) => s.status === "open").length;
  const blockedCount = daySlots.filter((s) => s.status === "blocked").length;
  const t = (iso: string) => fmtInZone(iso, tz, { hour: "2-digit", minute: "2-digit" });
  const fmtRanges = (r: TimeRange[]) => r.map((x) => `${x.start}–${x.end}`).join(", ");

  async function run(next: Settings, msg: string) {
    setBusy(true);
    await save(next, msg);
    setBusy(false);
  }

  function toggleBlock(start: string) {
    const blocked = settings.blocked.includes(start)
      ? settings.blocked.filter((b) => b !== start)
      : [...settings.blocked, start];
    run({ ...settings, blocked }, settings.blocked.includes(start) ? "Slot reopened" : "Slot blocked");
  }

  function blockAll(block: boolean) {
    const starts = daySlots.filter((s) => s.status === (block ? "open" : "blocked")).map((s) => s.start);
    const blocked = block
      ? [...new Set([...settings.blocked, ...starts])]
      : settings.blocked.filter((b) => !starts.includes(b));
    run({ ...settings, blocked }, block ? `Blocked ${starts.length} slots` : `Reopened ${starts.length} slots`);
  }

  function setOverride(ranges: TimeRange[] | null) {
    const overrides = { ...settings.overrides };
    if (ranges === null) delete overrides[day];
    else overrides[day] = ranges;
    run(
      { ...settings, overrides },
      ranges === null ? "Back to weekly hours" : ranges.length ? "Custom hours saved" : "Day closed",
    );
    setEditing(null);
  }

  const specialDates = Object.entries(settings.overrides)
    .filter(([d]) => d >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="sched step">
      <div style={{ display: "grid", gap: 20 }}>
        <div className="panel">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            selected={day}
            onSelect={setDay}
            today={today}
            dayInfo={(k) => {
              const list = byDay.get(k);
              const booked = list?.filter((s) => s.status === "booked").length ?? 0;
              return {
                enabled: true,
                className: list?.length ? undefined : "closed",
                badge: booked ? <span className="cal-badge">{booked}</span> : null,
                label: booked ? `${booked} booked` : list?.length ? "open" : "closed",
              };
            }}
          />
          <div className="legend">
            <span>
              <i style={{ background: "var(--panel-2)" }} />
              Has hours
            </span>
            <span>
              <i />
              Closed
            </span>
            <span>
              <i style={{ background: "var(--accent)", borderColor: "var(--accent)" }} />
              Booked count
            </span>
          </div>
        </div>

        {specialDates.length > 0 && (
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>Special dates</h3>
            {specialDates.map(([d, r]) => (
              <div key={d} className="slot-line" style={{ gridTemplateColumns: "1fr auto" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMonth(d.slice(0, 7));
                    setDay(d);
                  }}
                  style={{ border: 0, background: "none", padding: 0, textAlign: "left" }}
                >
                  <strong>{formatDay(d, { weekday: "short", day: "numeric", month: "short" })}</strong>{" "}
                  <span className="muted">{r.length ? fmtRanges(r) : "Closed"}</span>
                </button>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => {
                    const overrides = { ...settings.overrides };
                    delete overrides[d];
                    run({ ...settings, overrides }, "Back to weekly hours");
                  }}
                >
                  Reset
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel" key={day}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3>{formatDay(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {isOverride ? (
                <>
                  <span className="tag blocked" style={{ marginRight: 8 }}>
                    Special
                  </span>
                  {hours.length ? fmtRanges(hours) : "Closed all day"}
                </>
              ) : hours.length ? (
                `Weekly ${WEEKDAYS[weekdayOf(day)]} hours: ${fmtRanges(hours)}`
              ) : (
                `Closed on ${WEEKDAYS[weekdayOf(day)]}s`
              )}
            </div>
          </div>
          {!!daySlots.length && (
            <div className="muted mono" style={{ fontSize: 13 }}>
              {daySlots.filter((s) => s.status === "booked").length} booked · {openCount} open
              {blockedCount ? ` · ${blockedCount} blocked` : ""}
            </div>
          )}
        </div>

        {!isPastDay && (
          <div className="day-actions">
            {!editing && (
              <button className="btn btn-sm" disabled={busy} onClick={() => setEditing(hours.length ? hours : [{ start: "10:00", end: "18:00" }])}>
                {hours.length ? "Change hours for this day" : "Open this day"}
              </button>
            )}
            {!editing && hours.length > 0 && (
              <button className="btn btn-sm" disabled={busy} onClick={() => setOverride([])}>
                Close this day
              </button>
            )}
            {!editing && isOverride && (
              <button className="btn btn-sm" disabled={busy} onClick={() => setOverride(null)}>
                Reset to weekly hours
              </button>
            )}
            {!editing && openCount > 1 && (
              <button className="btn btn-sm" disabled={busy} onClick={() => blockAll(true)}>
                Block all open
              </button>
            )}
            {!editing && blockedCount > 1 && (
              <button className="btn btn-sm" disabled={busy} onClick={() => blockAll(false)}>
                Reopen all blocked
              </button>
            )}
          </div>
        )}

        {editing && (
          <div className="step" style={{ border: "1px solid var(--line-2)", padding: 16, margin: "14px 0" }}>
            <div className="label" style={{ marginBottom: 10 }}>
              Hours for this date only ({tz.replace(/_/g, " ")})
            </div>
            <RangesEditor ranges={editing} onChange={setEditing} />
            <div className="actions">
              <button
                className="btn btn-primary btn-sm"
                disabled={busy || editing.some((r) => r.start >= r.end)}
                onClick={() => setOverride(editing)}
              >
                Save for this date
              </button>
              <button className="btn btn-sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          {slots === null ? (
            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton" style={{ height: 40 }} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="empty" style={{ marginTop: 10 }}>
              No slots on this day.
            </div>
          ) : (
            rows.map((s) => {
              const b = s.booking;
              return (
                <div key={s.start} className={`slot-line${s.status === "past" ? " past" : ""}`}>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {t(s.start)} – {t(s.end)}
                  </span>
                  <span>
                    <span className={`tag ${s.status}`}>{s.status}</span>
                  </span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b && (
                      <>
                        <strong>{b.name}</strong>{" "}
                        <span className="muted">
                          · {b.type === "call" ? "Call" : "Text"} ·{" "}
                          <span style={{ color: `var(--${b.platform})`, verticalAlign: "-2px" }}>
                            <PlatformIcon platform={b.platform} size={13} />
                          </span>{" "}
                          @{b.handle}
                        </span>
                      </>
                    )}
                  </span>
                  <span>
                    {(s.status === "open" || s.status === "blocked") && (
                      <button className="btn btn-sm" disabled={busy} onClick={() => toggleBlock(s.start)}>
                        {s.status === "open" ? "Block" : "Reopen"}
                      </button>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
