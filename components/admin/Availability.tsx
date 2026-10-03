"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatIcon, PhoneIcon } from "../icons";
import { RangesEditor, Switch, WEEKDAYS, WEEK_ORDER, slotsInRanges } from "./shared";
import { allTimezones, browserTimezone, tzLabel } from "@/lib/time";
import type { Settings } from "@/lib/types";

type Draft = Pick<
  Settings,
  "timezone" | "slotMinutes" | "bufferMinutes" | "minNoticeHours" | "maxDaysAhead" | "weekly" | "types"
>;

const pick = (s: Settings): Draft => ({
  timezone: s.timezone,
  slotMinutes: s.slotMinutes,
  bufferMinutes: s.bufferMinutes,
  minNoticeHours: s.minNoticeHours,
  maxDaysAhead: s.maxDaysAhead,
  weekly: s.weekly,
  types: s.types,
});

const LENGTHS = [15, 20, 30, 45, 60, 90];
const BUFFERS = [0, 5, 10, 15, 30];
const NOTICE = [0, 1, 2, 3, 4, 6, 12, 24, 48, 72];
const WINDOWS = [7, 14, 21, 30, 45, 60, 90];

type Props = {
  settings: Settings;
  save: (s: Settings, message?: string) => Promise<boolean>;
  onDirty: (d: boolean) => void;
};

export default function Availability({ settings, save, onDirty }: Props) {
  const [draft, setDraft] = useState<Draft>(() => pick(settings));
  const [saving, setSaving] = useState(false);
  const [browserTz, setBrowserTz] = useState<string | null>(null);

  const resync = useRef(false);

  useEffect(() => setBrowserTz(browserTimezone()), []);

  // After a save, adopt what the server stored (it may tidy up ranges)
  useEffect(() => {
    if (resync.current) {
      resync.current = false;
      setDraft(pick(settings));
    }
  }, [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(settings));
  const invalid = Object.values(draft.weekly).some((r) => r.some((x) => x.start >= x.end));

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const weeklySlots = useMemo(
    () =>
      Object.values(draft.weekly).reduce(
        (n, r) => n + slotsInRanges(r, draft.slotMinutes, draft.bufferMinutes),
        0,
      ),
    [draft.weekly, draft.slotMinutes, draft.bufferMinutes],
  );

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function setDay(day: number, ranges: Draft["weekly"][string]) {
    setDraft((d) => ({ ...d, weekly: { ...d.weekly, [String(day)]: ranges } }));
  }

  function copyToWeekdays(from: number) {
    const src = draft.weekly[String(from)];
    setDraft((d) => {
      const weekly = { ...d.weekly };
      for (const i of [1, 2, 3, 4, 5]) weekly[String(i)] = src.map((r) => ({ ...r }));
      return { ...d, weekly };
    });
  }

  async function submit() {
    setSaving(true);
    resync.current = true;
    if (!(await save({ ...settings, ...draft }, "Availability saved"))) resync.current = false;
    setSaving(false);
  }

  return (
    <div className="settings step">
      <section className="set-block">
        <div className="set-head">
          <h3>Booking pages</h3>
          <p>Turn a page off to stop new bookings of that type. Existing bookings stay.</p>
        </div>
        <div className="set-body">
          <div className="type-cards">
            {(
              [
                ["call", "Voice calls", PhoneIcon],
                ["text", "Text chats", ChatIcon],
              ] as const
            ).map(([k, label, Icon]) => (
              <div className="type-card" key={k}>
                <strong>
                  <Icon /> {label}
                </strong>
                <Switch
                  label={`${label} accepting bookings`}
                  checked={draft.types[k].enabled}
                  onChange={(v) => set("types", { ...draft.types, [k]: { enabled: v } })}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="set-block">
        <div className="set-head">
          <h3>Meeting rules</h3>
          <p>Both meeting types share one calendar, so you can never be double-booked.</p>
        </div>
        <div className="set-body">
          <div className="field">
            <span className="label">Your timezone</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                className="select"
                style={{ maxWidth: 360 }}
                value={draft.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              >
                {allTimezones(draft.timezone).map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              {browserTz && browserTz !== draft.timezone && (
                <button className="btn" onClick={() => set("timezone", browserTz)}>
                  Use {tzLabel(browserTz)}
                </button>
              )}
            </div>
            <span className="hint">Your hours below are in this timezone. Players see times in their own timezone.</span>
          </div>

          <div className="set-grid">
            <div className="field">
              <span className="label">Meeting length</span>
              <div className="chips">
                {LENGTHS.map((m) => (
                  <button key={m} className="chip" aria-pressed={draft.slotMinutes === m} onClick={() => set("slotMinutes", m)}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Break between meetings</span>
              <div className="chips">
                {BUFFERS.map((m) => (
                  <button key={m} className="chip" aria-pressed={draft.bufferMinutes === m} onClick={() => set("bufferMinutes", m)}>
                    {m ? `${m} min` : "None"}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">Minimum notice</span>
              <select
                className="select"
                value={draft.minNoticeHours}
                onChange={(e) => set("minNoticeHours", Number(e.target.value))}
              >
                {[...new Set([...NOTICE, draft.minNoticeHours])].sort((a, b) => a - b).map((h) => (
                  <option key={h} value={h}>
                    {h === 0 ? "None, allow last-minute bookings" : h < 24 ? `${h} hour${h > 1 ? "s" : ""} ahead` : `${h / 24} day${h > 24 ? "s" : ""} ahead`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Booking window</span>
              <select
                className="select"
                value={draft.maxDaysAhead}
                onChange={(e) => set("maxDaysAhead", Number(e.target.value))}
              >
                {[...new Set([...WINDOWS, draft.maxDaysAhead])].sort((a, b) => a - b).map((d) => (
                  <option key={d} value={d}>
                    Up to {d} days ahead
                  </option>
                ))}
              </select>
            </label>
          </div>
          {draft.slotMinutes !== settings.slotMinutes && (
            <div className="alert info" style={{ margin: 0 }}>
              Changing meeting length only affects new bookings. Existing ones keep their times.
            </div>
          )}
        </div>
      </section>

      <section className="set-block">
        <div className="set-head">
          <h3>Weekly hours</h3>
          <p>
            Your regular availability. That gives{" "}
            <strong style={{ color: "var(--text)" }} className="mono">
              {weeklySlots}
            </strong>{" "}
            bookable slots a week. Close days or set special hours for a single date in the Schedule tab.
          </p>
        </div>
        <div className="set-body" style={{ gap: 0 }}>
          {WEEK_ORDER.map((d) => {
            const ranges = draft.weekly[String(d)] ?? [];
            const on = ranges.length > 0;
            const n = slotsInRanges(ranges, draft.slotMinutes, draft.bufferMinutes);
            return (
              <div className="week-row" key={d}>
                <div className="week-day">
                  <Switch
                    label={`${WEEKDAYS[d]} available`}
                    checked={on}
                    onChange={(v) => setDay(d, v ? [{ start: "10:00", end: "18:00" }] : [])}
                  />
                  {WEEKDAYS[d].slice(0, 3)}
                </div>
                {on ? <RangesEditor ranges={ranges} onChange={(r) => setDay(d, r)} /> : <div className="unavailable">Unavailable</div>}
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: 38 }}>
                  {on && (
                    <>
                      <span className="muted mono" style={{ fontSize: 12 }}>
                        {n} slots
                      </span>
                      <button className="btn btn-sm" title="Copy these hours to Monday–Friday" onClick={() => copyToWeekdays(d)}>
                        Copy to Mon–Fri
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {dirty && (
        <div className="save-bar" role="region" aria-label="Unsaved changes">
          <div className="save-bar-inner">
            <span>{invalid ? "Fix the highlighted hours to save" : "You have unsaved changes"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setDraft(pick(settings))} disabled={saving}>
                Discard
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving || invalid}>
                {saving ? <span className="spinner" /> : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
