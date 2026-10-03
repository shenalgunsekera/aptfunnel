"use client";

import { useEffect, useState } from "react";
import type { TimeRange } from "@/lib/types";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Display order: Monday first */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const TIME_OPTIONS = Array.from({ length: 97 }, (_, i) => {
  const m = i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function slotsInRanges(ranges: TimeRange[], slot: number, buffer: number) {
  let n = 0;
  for (const r of ranges) {
    const len = toMinutes(r.end) - toMinutes(r.start);
    if (len >= slot) n += Math.floor((len - slot) / (slot + buffer)) + 1;
  }
  return n;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

/** Editable list of time ranges. Suggests a sensible next range when adding. */
export function RangesEditor({ ranges, onChange }: { ranges: TimeRange[]; onChange: (r: TimeRange[]) => void }) {
  function update(i: number, patch: Partial<TimeRange>) {
    onChange(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function add() {
    const last = ranges[ranges.length - 1];
    if (!last) return onChange([{ start: "10:00", end: "18:00" }]);
    const start = Math.min(toMinutes(last.end) + 60, 23 * 60);
    const end = Math.min(start + 120, 24 * 60);
    const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    onChange([...ranges, { start: f(start), end: f(end) }]);
  }

  return (
    <div className="ranges">
      {ranges.map((r, i) => {
        const bad = r.start >= r.end;
        return (
          <div className="range" key={i}>
            <select
              className="select mono"
              aria-label="From"
              value={r.start}
              onChange={(e) => update(i, { start: e.target.value })}
            >
              {TIME_OPTIONS.slice(0, -1).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="muted">–</span>
            <select
              className="select mono"
              aria-label="To"
              value={r.end}
              onChange={(e) => update(i, { end: e.target.value })}
              style={bad ? { borderColor: "var(--danger)" } : undefined}
            >
              {TIME_OPTIONS.slice(1).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove time range"
              onClick={() => onChange(ranges.filter((_, j) => j !== i))}
            >
              ×
            </button>
            {bad && <span className="error-text">End must be after start</span>}
          </div>
        );
      })}
      <div>
        <button type="button" className="btn btn-sm" onClick={add}>
          + Add hours
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; error?: boolean; id: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  return {
    toast,
    show: (msg: string, error = false) => setToast({ msg, error, id: Date.now() }),
  };
}

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.reload();
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** "YYYY-MM-DD" → date string for display in a given zone-independent way */
export function fmtInZone(iso: string, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(new Date(iso));
}

export function relative(iso: string, now = Date.now()) {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}
