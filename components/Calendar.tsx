"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "./icons";
import { addDays, addMonths, formatDay, formatMonth, monthGrid } from "@/lib/time";

type DayInfo = { enabled: boolean; className?: string; badge?: React.ReactNode; label?: string };

type Props = {
  month: string;
  onMonthChange: (m: string) => void;
  minMonth?: string;
  maxMonth?: string;
  selected: string | null;
  onSelect: (key: string) => void;
  today: string;
  dayInfo: (key: string) => DayInfo;
};

const DOW = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export default function Calendar({ month, onMonthChange, minMonth, maxMonth, selected, onSelect, today, dayInfo }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const cells = monthGrid(month);
  const canPrev = !minMonth || month > minMonth;
  const canNext = !maxMonth || month < maxMonth;

  // After keyboard navigation crosses into another month, restore focus on the new grid
  useEffect(() => {
    if (!focusNext.current) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-key="${focusNext.current}"]`);
    focusNext.current = null;
    el?.focus();
  });

  const tabStop =
    (selected && selected.startsWith(month) && selected) ||
    cells.find((c) => c && dayInfo(c).enabled) ||
    null;

  function onKey(e: React.KeyboardEvent, key: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    let next = addDays(key, step);
    // Skip past days that cannot be picked, but don't wander forever
    for (let i = 0; i < 62 && !dayInfo(next).enabled; i++) next = addDays(next, Math.sign(step));
    if (!dayInfo(next).enabled) return;
    const m = next.slice(0, 7);
    if ((minMonth && m < minMonth) || (maxMonth && m > maxMonth)) return;
    onSelect(next);
    focusNext.current = next;
    if (m !== month) onMonthChange(m);
    else gridRef.current?.querySelector<HTMLButtonElement>(`[data-key="${next}"]`)?.focus();
  }

  return (
    <div>
      <div className="cal-head">
        <strong aria-live="polite">{formatMonth(month)}</strong>
        <div className="cal-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onMonthChange(addMonths(month, -1))}
            disabled={!canPrev}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onMonthChange(addMonths(month, 1))}
            disabled={!canNext}
            aria-label="Next month"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="cal-grid" ref={gridRef} role="grid" key={month} style={{ animation: "fade .25s" }}>
        {DOW.map((d) => (
          <div key={d} className="cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`pad-${i}`} className="cal-day outside" aria-hidden />;
          const info = dayInfo(key);
          const cls = [
            "cal-day",
            info.enabled && "available",
            key === selected && "selected",
            key === today && "today",
            info.className,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              data-key={key}
              className={cls}
              disabled={!info.enabled}
              tabIndex={key === tabStop ? 0 : -1}
              aria-pressed={key === selected}
              aria-label={`${formatDay(key)}${info.label ? `, ${info.label}` : ""}`}
              onClick={() => onSelect(key)}
              onKeyDown={(e) => onKey(e, key)}
            >
              {Number(key.slice(8))}
              {info.badge}
            </button>
          );
        })}
      </div>
    </div>
  );
}
